import { generateText, Output, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import pino from "pino";
import { getPRCommentPosterPrompt } from "../utils/get-pr-comment-poster-prompt";
import {
  prCommentPosterInputSchema,
  prCommentPosterOutputSchema,
  type PRCommentPosterInput,
  type PRCommentPosterOutput,
} from "../schemas/pr-comment-poster-schema";

// Re-export for backward compatibility
export type {
  PRCommentPosterInput,
  PRCommentPosterOutput,
} from "../schemas/pr-comment-poster-schema";

/**
 * Agent 4: PR Comment Poster
 * Posts comments to the backend PR using GitHub MCP tools
 * For now, creates a draft review with summary in the body
 */
export async function postPRComments(
  input: PRCommentPosterInput,
  tools: Record<string, any>,
  openaiApiKey: string,
  logger: pino.Logger = pino(),
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
): Promise<PRCommentPosterOutput> {
  // Validate inputs using Zod
  const validatedInput = prCommentPosterInputSchema.parse(input);

  if (
    !openaiApiKey ||
    typeof openaiApiKey !== "string" ||
    openaiApiKey.trim().length === 0
  ) {
    throw new Error(
      "OpenAI API key is required and must be a non-empty string"
    );
  }

  // Validate tools
  if (!tools || Object.keys(tools).length === 0) {
    throw new Error("Tools are required and must not be empty");
  }

  const { comments, backend_owner, backend_repo, pull_number } = validatedInput;

  logger.info(
    {
      pull_number,
      owner: backend_owner,
      repo: backend_repo,
      commentCount: comments.comments.length,
    },
    `PR Comment Poster: Creating draft review for PR #${pull_number} in ${backend_owner}/${backend_repo}`
  );

  const prompt = getPRCommentPosterPrompt(validatedInput);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: prCommentPosterOutputSchema,
  });

  // Wrap pull_request_review_write tool to intercept and remove 'event' parameter before execution
  // This ensures draft reviews are created by removing the 'event' parameter if present
  const wrappedTools: Record<string, any> = { ...tools };
  if (wrappedTools.pull_request_review_write) {
    const originalTool = wrappedTools.pull_request_review_write;

    // Check if tool has execute method
    if (!originalTool.execute || typeof originalTool.execute !== "function") {
      logger.error(
        {
          toolName: "pull_request_review_write",
          toolType: typeof originalTool,
          toolKeys: Object.keys(originalTool),
        },
        "PR Comment Poster: Tool does not have execute method, cannot wrap"
      );
    } else {
      const originalExecute = originalTool.execute.bind(originalTool);

      wrappedTools.pull_request_review_write = {
        ...originalTool,
        execute: async (args: any) => {
          logger.debug("PR Comment Poster: Wrapper intercepting pull_request_review_write");

          // Remove 'event' parameter ONLY for method="create" to ensure draft review creation
          // Allow 'event' parameter for method="submit_pending" to submit the review
          // Note: commitID is required and should be the PR head SHA (even for multi-commit PRs, use the HEAD commit)
          const method = args && typeof args === "object" ? args.method : undefined;
          if (method === "create" && args && typeof args === "object" && "event" in args) {
            const { event, ...restArgs } = args;
            if (event !== undefined) {
              logger.warn(
                {
                  removedEvent: event,
                },
                "PR Comment Poster: Removed 'event' parameter from create method to ensure draft review"
              );
            }
            const result = await originalExecute(restArgs);
            logger.debug(
              {
                result,
              },
              "PR Comment Poster: Wrapper executed create without event parameter"
            );
            return result;
          }
          const result = await originalExecute(args);
          return result;
        },
      };
    }
  }

  // Get limits from options with fallback defaults
  // Each comment addition is a step, so we need enough steps for: PR read, review check, create review, add comments (one per comment), submit review
  const MAX_STEPS = options?.maxSteps || 50; // Allow for many comments (e.g., 40 comments + 10 overhead steps)
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2);
  const MAX_OUTPUT_TOKENS = options?.maxOutputTokens || 5000; // Small output
  const MAX_TOTAL_TOKENS = options?.maxTotalTokens || 50000; // Lower limit for simple operation
  const FORCE_OUTPUT_AT_TOKENS = MAX_TOTAL_TOKENS * 0.85;

  // Track total token usage across all steps
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  logger.info(
    {
      maxSteps: MAX_STEPS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxTotalTokens: MAX_TOTAL_TOKENS,
    },
    "PR Comment Poster: Starting review creation with OpenAI"
  );

  const result = await generateText({
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools: wrappedTools,
    activeTools: [
      "pull_request_read",
      "pull_request_review_write",
      "add_comment_to_pending_review",
    ],
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    prompt,
    prepareStep: async ({ stepNumber, steps, messages }) => {
      // Track token usage across steps
      const stepUsage = steps.reduce(
        (acc, step) => {
          if (step.usage) {
            return {
              inputTokens: acc.inputTokens + (step.usage.inputTokens || 0),
              outputTokens: acc.outputTokens + (step.usage.outputTokens || 0),
            };
          }
          return acc;
        },
        { inputTokens: 0, outputTokens: 0 }
      );

      totalInputTokens = stepUsage.inputTokens;
      totalOutputTokens = stepUsage.outputTokens;
      const currentTotalTokens = totalInputTokens + totalOutputTokens;

      // Warn if approaching token limits
      if (currentTotalTokens > MAX_TOTAL_TOKENS * 0.8) {
        logger.warn(
          {
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            percentage: Math.round(
              (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
            ),
          },
          "PR Comment Poster: Approaching total token limit"
        );

        // Add warning message to instruct agent to submit review if not submitted yet
        const warningMessage = {
          role: "user" as const,
          content: `⚠️ WARNING: You are approaching the token limit (${Math.round((currentTotalTokens / MAX_TOTAL_TOKENS) * 100)}%). If the review has been created but not yet submitted, you MUST submit it in the next step using pull_request_review_write with method="submit_pending", event="COMMENT". Do NOT wait for more comments - submit now if not already submitted.`,
        };

        return {
          messages: [...messages, warningMessage],
        };
      }

      // Force output generation when approaching token limit (85%)
      if (currentTotalTokens >= FORCE_OUTPUT_AT_TOKENS) {
        logger.warn(
          {
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            percentage: Math.round(
              (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
            ),
          },
          "PR Comment Poster: Approaching token limit, forcing output generation"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        if (!hasOutput) {
          // Force text generation by preventing tool calls
          const reminderMessage = {
            role: "user" as const,
            content:
              "CRITICAL: You are approaching the token limit. If the review has been created but not yet submitted, you MUST submit it now using pull_request_review_write with method=\"submit_pending\", event=\"COMMENT\". After submitting (or if already submitted), immediately return your final output as JSON matching the schema. Do not call any more tools.",
          };

          return {
            toolChoice: "none", // Prevent tool calls, force text generation
            messages: [...messages, reminderMessage],
          };
        }
      }

      // Abort if token limit exceeded
      if (currentTotalTokens >= MAX_TOTAL_TOKENS) {
        logger.error(
          {
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
          "PR Comment Poster: Total token limit exceeded, aborting"
        );
        throw new Error(
          `Token limit exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS})`
        );
      }

      // When approaching step limit, force the model to generate output instead of calling tools
      if (stepNumber >= FORCE_OUTPUT_AT_STEP) {
        logger.warn(
          {
            stepNumber,
            maxSteps: MAX_STEPS,
            stepsCompleted: steps.length,
          },
          "PR Comment Poster: Approaching step limit, forcing output generation"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        if (!hasOutput) {
          // Force text generation by preventing tool calls
          const reminderMessage = {
            role: "user" as const,
            content:
              "CRITICAL: You are approaching the step limit. If the review has been created but not yet submitted, you MUST submit it now using pull_request_review_write with method=\"submit_pending\", event=\"COMMENT\". After submitting (or if already submitted), immediately return your final output as JSON matching the schema. Do not call any more tools.",
          };

          return {
            toolChoice: "none", // Prevent tool calls, force text generation
            messages: [...messages, reminderMessage],
          };
        }
      }

      // Default: continue with normal execution
      return {};
    },
    onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
      // Log tool calls (inputs)
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          logger.info(
            {
              tool: tc.toolName,
              toolCallId: tc.toolCallId,
              input: tc.input,
            },
            `PR Comment Poster: tool call - ${tc.toolName}`
          );
        });
      }

      // Log any text output from model
      if (text) {
        logger.debug(
          {
            textLength: text.length,
            finishReason: finishReason || undefined,
          },
          "PR Comment Poster: Model generated text output"
        );
      }

      // Log usage if available
      if (usage) {
        const stepTotal = (usage.inputTokens || 0) + (usage.outputTokens || 0);
        logger.debug(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            stepTotal,
          },
          "PR Comment Poster: Token usage"
        );
      }
    },
  });

  // With output spec, result.output will always be present or process exits with error
  if (!result.output) {
    logger.error(
      {
        totalSteps: result.steps?.length || 0,
        finishReason: result.finishReason || undefined,
      },
      "PR Comment Poster: Failed to generate structured output from the model"
    );
    throw new Error("Failed to generate structured output from the model");
  }

  // Calculate final token usage
  const finalUsage = result.steps?.reduce(
    (acc, step) => {
      if (step.usage) {
        acc.inputTokens += step.usage.inputTokens || 0;
        acc.outputTokens += step.usage.outputTokens || 0;
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0 }
  ) || { inputTokens: 0, outputTokens: 0 };
  const finalTotalTokens = finalUsage.inputTokens + finalUsage.outputTokens;

  // Log final output with full details
  logger.info(
    {
      success: result.output.success,
      reviewId: result.output.reviewId,
      message: result.output.message,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.inputTokens,
        outputTokens: finalUsage.outputTokens,
        totalTokens: finalTotalTokens,
      },
      // Log tool execution summary
      toolCallsCount: result.steps?.reduce(
        (sum, step) => sum + (step.toolCalls?.length || 0),
        0
      ) || 0,
      toolResultsCount: result.steps?.reduce(
        (sum, step) => sum + (step.toolResults?.length || 0),
        0
      ) || 0,
    },
    `PR Comment Poster: Review creation ${result.output.success ? "complete" : "failed"} - ${result.output.message}`
  );

  // Log detailed review information if successful
  if (result.output.success) {
    logger.info(
      {
        reviewId: result.output.reviewId,
        owner: backend_owner,
        repo: backend_repo,
        pullNumber: pull_number,
        commentCount: comments.comments.length,
      },
      `PR Comment Poster: Review #${result.output.reviewId} created successfully for PR #${pull_number}`
    );
  } else {
    logger.warn(
      {
        reviewId: result.output.reviewId,
        message: result.output.message,
        commentCount: comments.comments.length,
      },
      "PR Comment Poster: Review creation failed or incomplete"
    );
  }

  return result.output as PRCommentPosterOutput;
}
