import { generateText, Output, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getCommentGeneratorPrompt } from "../utils/get-comment-generator-prompt";
import { createLogger, type LogLevel } from "../utils/create-logger";
import {
  calculateLimits,
  enforceLimits,
  trackTokenUsage,
} from "../utils/limit-checks";
import {
  commentGeneratorInputSchema,
  prCommentsSchema,
  type CommentGeneratorInput,
  type PRCommentsOutput,
} from "../schemas/comment-generator-schema";

/**
 * Agent 3: PR Comment Generator
 * Generates inline PR comments for backend changes with frontend impact information
 */
export async function generatePRComments(
  input: CommentGeneratorInput,
  openaiApiKey: string,
  logLevel: LogLevel = "info"
): Promise<PRCommentsOutput> {
  const logger = createLogger(logLevel, "Comment Generator");
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

  const { changes, backend_owner, backend_repo, pull_number, options } =
    validatedInput;

  const totalImpacts = changes.reduce(
    (sum, change) => sum + change.frontendImpacts.length,
    0
  );

  logger.info(
    {
      pull_number,
      owner: backend_owner,
      repo: backend_repo,
      changeCount: changes.length,
      totalImpacts,
    },
    `Generating comments for PR #${pull_number} in ${backend_owner}/${backend_repo}`
  );

  const prompt = getCommentGeneratorPrompt(validatedInput);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: prCommentsSchema,
  });

  // Calculate limits from options with defaults
  const limits = calculateLimits({
    maxSteps: options?.maxSteps || 15, // Comment generation is simpler, fewer steps needed
    maxOutputTokens: options?.maxOutputTokens || 30000, // Lower than other agents since comments are shorter
    maxTotalTokens: options?.maxTotalTokens || 100000, // Lower limit for comment generation
  });

  logger.info(
    {
      maxSteps: limits.MAX_STEPS,
      maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
      maxTotalTokens: limits.MAX_TOTAL_TOKENS,
      model: "gpt-4o",
    },
    "Starting analysis with OpenAI"
  );

  const result = await generateText({
    model: openaiClient("gpt-4o"),
    output: outputSpec,
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
          onTokenForce: (params) => {
            logger.warn(
              params,
              "Approaching token limit, forcing output generation"
            );
          },
          onStepForce: (params) => {
            logger.warn(
              params,
              "Approaching step limit, forcing output generation"
            );
          },
          onTokenLimitExceeded: (params) => {
            logger.error(params, "Total token limit exceeded, aborting");
          },
          tokenForceMessage: () =>
            "CRITICAL: You are approaching the token limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately with all comments found so far.",
          stepForceMessage: () =>
            "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
        },
      });
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
              "Posting comment to PR"
            );
          } else {
            logger.debug(
              {
                tool: tc.toolName,
                input: tc.input,
              },
              `Tool call - ${tc.toolName}`
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
          "Token usage"
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
      "Failed to generate structured output from the model"
    );
    throw new Error("Failed to generate structured output from the model");
  }

  // Calculate final token usage
  const finalUsage = result.steps
    ? trackTokenUsage(result.steps)
    : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
  const finalTotalTokens = finalUsage.currentTotalTokens;

  logger.info(
    {
      commentCount: result.output.comments.length,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.totalInputTokens,
        outputTokens: finalUsage.totalOutputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `Generation complete, created ${result.output.comments.length} comments`
  );

  // Log summary at info level (important output)
  logger.info(
    {
      summary:
        result.output.summary.substring(0, 200) +
        (result.output.summary.length > 200 ? "..." : ""),
      summaryLength: result.output.summary.length,
    },
    "Generated summary"
  );

  // Log each comment once with full details
  if (result.output.comments.length > 0) {
    result.output.comments.forEach((comment, index) => {
      logger.debug(
        {
          index: index + 1,
          path: comment.path,
          startLine: comment.startLine,
          endLine: comment.endLine,
          startSide: comment.startSide,
          endSide: comment.endSide,
          bodyLength: comment.body.length,
          bodyPreview:
            comment.body.substring(0, 200) +
            (comment.body.length > 200 ? "..." : ""),
        },
        `Comment ${index + 1} - ${comment.path}:${comment.startLine}${comment.endLine !== comment.startLine ? `-${comment.endLine}` : ""}`
      );
      logger.debug({ body: comment.body }, "Full comment body");
    });
  } else {
    logger.warn("No comments generated - comments array is empty");
  }

  return result.output as PRCommentsOutput;
}
