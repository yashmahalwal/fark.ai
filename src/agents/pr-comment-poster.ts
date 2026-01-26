import { generateText, Output, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getPRCommentPosterPrompt } from "../utils/get-pr-comment-poster-prompt";
import { createLogger, type LogLevel } from "../utils/create-logger";
import {
  calculateLimits,
  enforceLimits,
  trackTokenUsage,
} from "../utils/limit-checks";
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
  logLevel: LogLevel = "info",
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
): Promise<PRCommentPosterOutput> {
  const logger = createLogger(logLevel, "PR Comment Poster");
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
    `Creating draft review for PR #${pull_number} in ${backend_owner}/${backend_repo}`
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
        "Tool does not have execute method, cannot wrap"
      );
    } else {
      const originalExecute = originalTool.execute.bind(originalTool);

      wrappedTools.pull_request_review_write = {
        ...originalTool,
        execute: async (args: any) => {
          logger.debug("Wrapper intercepting pull_request_review_write");

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
                "Removed 'event' parameter from create method to ensure draft review"
              );
            }
            const result = await originalExecute(restArgs);
            logger.debug(
              {
                result,
              },
              "Wrapper executed create without event parameter"
            );
            return result;
          }
          const result = await originalExecute(args);
          return result;
        },
      };
    }
  }

  // Calculate limits from options with defaults
  // Each comment addition is a step, so we need enough steps for: PR read, review check, create review, add comments (one per comment), submit review
  const limits = calculateLimits({
    maxSteps: options?.maxSteps || 60, // Allow for many comments (e.g., 30 comments + overhead steps)
    maxOutputTokens: options?.maxOutputTokens || 5000, // Small output
    maxTotalTokens: options?.maxTotalTokens || 300000, // Increased to handle up to 30 comments with full conversation history
  });

  logger.info(
    {
      maxSteps: limits.MAX_STEPS,
      maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
      maxTotalTokens: limits.MAX_TOTAL_TOKENS,
      model: "gpt-5",
    },
    "Starting review creation with OpenAI"
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
    stopWhen: stepCountIs(limits.MAX_STEPS),
    maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
    prompt,
    prepareStep: async ({ stepNumber, steps, messages }) => {
      return enforceLimits({
        stepNumber,
        steps,
        messages,
        config: {
          limits,
          onTokenWarning: (params) => {
            logger.warn(params, "Approaching total token limit");
          },
          tokenWarningMessage: (percentage) => ({
            role: "user",
            content: `⚠️ WARNING: You are approaching the token limit (${percentage}%). If the review has been created but not yet submitted, you MUST submit it in the next step using pull_request_review_write with method="submit_pending", event="COMMENT". Do NOT wait for more comments - submit now if not already submitted.`,
          }),
          onTokenForce: (params) => {
            logger.warn(params, "Approaching token limit, forcing output generation");
          },
          onStepForce: (params) => {
            logger.warn(params, "Approaching step limit, forcing output generation");
          },
          onTokenLimitExceeded: (params) => {
            logger.error(params, "Total token limit exceeded, aborting");
          },
          tokenForceMessage: () =>
            'CRITICAL: You are approaching the token limit. If the review has been created but not yet submitted, you MUST submit it now using pull_request_review_write with method="submit_pending", event="COMMENT". After submitting (or if already submitted), immediately return your final output as JSON matching the schema. Do not call any more tools.',
          stepForceMessage: () =>
            'CRITICAL: You are approaching the step limit. If the review has been created but not yet submitted, you MUST submit it now using pull_request_review_write with method="submit_pending", event="COMMENT". After submitting (or if already submitted), immediately return your final output as JSON matching the schema. Do not call any more tools.',
        },
      });
    },
    onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
      // Log tool calls
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          logger.debug(
            {
              tool: tc.toolName,
              input: tc.input,
            },
            `Tool call - ${tc.toolName}`
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
          "Model generated text output"
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
          "Token usage"
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
      "Failed to generate structured output from the model"
    );
    throw new Error("Failed to generate structured output from the model");
  }

  // Calculate final token usage
  const finalUsage = result.steps
    ? trackTokenUsage(result.steps)
    : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
  const finalTotalTokens = finalUsage.currentTotalTokens;

  // Log final output with full details
  logger.info(
    {
      success: result.output.success,
      reviewId: result.output.reviewId,
      message: result.output.message,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.totalInputTokens,
        outputTokens: finalUsage.totalOutputTokens,
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
    `Review creation ${result.output.success ? "complete" : "failed"} - ${result.output.message}`
  );

  // Log detailed review information if successful
  if (!result.output.success) {
    logger.warn(
      {
        reviewId: result.output.reviewId,
        message: result.output.message,
        commentCount: comments.comments.length,
      },
      "Review creation failed or incomplete"
    );
  }

  return result.output as PRCommentPosterOutput;
}
