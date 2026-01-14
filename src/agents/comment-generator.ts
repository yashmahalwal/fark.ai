import { generateText, Output, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import pino from "pino";
import { getCommentGeneratorPrompt } from "../utils/get-comment-generator-prompt";
import {
  commentGeneratorInputSchema,
  prCommentsSchema,
  type CommentGeneratorInput,
  type PRCommentsOutput,
} from "../schemas/comment-generator-schema";

// Re-export for backward compatibility
export type {
  CommentGeneratorInput,
  PRCommentsOutput,
} from "../schemas/comment-generator-schema";

/**
 * Agent 3: PR Comment Generator
 * Generates inline PR comments for backend changes with frontend impact information
 * Posts comments directly to the PR using GitHub MCP tools
 */
export async function generatePRComments(
  input: CommentGeneratorInput,
  tools: Record<string, any>,
  openaiApiKey: string,
  logger: pino.Logger = pino(),
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
): Promise<PRCommentsOutput> {
  // Validate inputs using Zod
  const validatedInput = commentGeneratorInputSchema.parse(input);

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

  const { changes, backend_owner, backend_repo, pull_number } = validatedInput;

  const totalImpacts = changes.reduce(
    (sum, change) => sum + change.frontendImpacts.length,
    0
  );

  logger.info(
    { pull_number, owner: backend_owner, repo: backend_repo },
    `Comment Generator: Generating comments for PR #${pull_number} in ${backend_owner}/${backend_repo}`
  );
  logger.debug(
    {
      changeCount: changes.length,
      totalImpacts,
    },
    `Comment Generator: ${changes.length} backend changes with ${totalImpacts} total frontend impacts`
  );

  const prompt = getCommentGeneratorPrompt(validatedInput);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: prCommentsSchema,
  });

  // Get limits from options with fallback defaults
  const MAX_STEPS = options?.maxSteps || 15; // Comment generation is simpler, fewer steps needed
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2); // Force output generation 2 steps before limit
  const MAX_OUTPUT_TOKENS = options?.maxOutputTokens || 30000; // Lower than other agents since comments are shorter
  const MAX_TOTAL_TOKENS = options?.maxTotalTokens || 100000; // Lower limit for comment generation
  const FORCE_OUTPUT_AT_TOKENS = MAX_TOTAL_TOKENS * 0.85; // Force output at 85% of token limit

  // Track total token usage across all steps
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  logger.info(
    {
      maxSteps: MAX_STEPS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxTotalTokens: MAX_TOTAL_TOKENS,
    },
    "Comment Generator: Starting analysis with OpenAI"
  );

  const result = await generateText({
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools,
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
          "Comment Generator: Approaching total token limit"
        );
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
          "Comment Generator: Approaching token limit, forcing output generation"
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
              "CRITICAL: You are approaching the token limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately with all comments found so far.",
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
          "Comment Generator: Total token limit exceeded, aborting"
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
          "Comment Generator: Approaching step limit, forcing output generation"
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
              "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
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
    onStepFinish: ({ toolCalls, usage }) => {
      // Log tool calls with details
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          if (
            tc.toolName === "pull_request_review_write" ||
            tc.toolName === "add_comment_to_pending_review"
          ) {
            logger.info(
              {
                tool: tc.toolName,
                input: tc.input,
              },
              "Comment Generator: Posting comment to PR"
            );
          } else {
            logger.debug(
              {
                tool: tc.toolName,
              },
              "Comment Generator: Tool call"
            );
          }
        });
      }

      // Log token usage
      if (usage) {
        logger.debug(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            stepTotal: (usage.inputTokens || 0) + (usage.outputTokens || 0),
          },
          "Comment Generator: Token usage"
        );
      }
    },
  });

  if (!result.output) {
    logger.error(
      {
        totalSteps: result.steps?.length || 0,
        finishReason: result.finishReason || undefined,
      },
      "Comment Generator: Failed to generate structured output from the model"
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

  logger.info(
    {
      commentCount: result.output.comments.length,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.inputTokens,
        outputTokens: finalUsage.outputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `Comment Generator: Generation complete, created ${result.output.comments.length} comments`
  );

  // Log each comment once
  if (result.output.comments.length > 0) {
    logger.info("Comment Generator: Generated comments details:");
    result.output.comments.forEach((comment, index) => {
      logger.info(
        {
          index: index + 1,
          file: comment.file,
          line: comment.line,
          bodyLength: comment.body.length,
        },
        `Comment Generator: Comment ${index + 1} - ${comment.file}:${comment.line}`
      );
    });
  }

  return result.output as PRCommentsOutput;
}
