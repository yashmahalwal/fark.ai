import { generateText, stepCountIs, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { getBeAnalyzerPrompt } from "../utils/get-be-analyzer-prompt";
import { createLogger, type LogLevel } from "../utils/create-logger";
import {
  backendInputSchema,
  backendChangesSchema,
  type BackendInput,
  type BackendChangesOutput,
} from "../schemas/be-analyzer-schema";
import { getReadonlyFilesystemTools } from "../tools/filesystem-tools";
import { getBackendTools } from "../tools/github-tools";
import {
  calculateLimits,
  enforceLimits,
  trackTokenUsage,
} from "../utils/limit-checks";

// Re-export schemas for backward compatibility
export {
  backendRepoSchema,
  backendInputSchema,
  backendChangeItemSchema,
  backendChangesSchema,
  type BackendInput,
  type BackendChangesOutput,
} from "../schemas/be-analyzer-schema";

/**
 * Agent 1: BE Diff Analyzer
 * Extracts API interface changes from PR diff using GitHub MCP tools (for PR) and filesystem tools (for code reading)
 */

export async function analyzeBackendDiff(
  input: BackendInput,
  openaiApiKey: string,
  logLevel: LogLevel = "info"
): Promise<BackendChangesOutput> {
  const logger = createLogger(logLevel, "BE Analyzer");
  // Validate inputs using Zod
  let validatedInput: BackendInput;
  try {
    validatedInput = backendInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      logger.error(
        {
          validationErrors: error.issues,
          errorMessages,
          input,
        },
        "Input validation failed"
      );
    }
    throw error;
  }

  if (
    !openaiApiKey ||
    typeof openaiApiKey !== "string" ||
    openaiApiKey.trim().length === 0
  ) {
    throw new Error(
      "OpenAI API key is required and must be a non-empty string"
    );
  }

  const { repository, codebasePath, githubMcp, options } = validatedInput;
  logger.info(
    {
      pull_number: repository.pull_number,
      owner: repository.owner,
      repo: repository.repo,
      codebasePath,
    },
    `Analyzing PR #${repository.pull_number} in ${repository.owner}/${repository.repo}`
  );

  // Create GitHub tools (for PR operations)
  const { tools: githubTools } = await getBackendTools(
    githubMcp.beGithubToken,
    githubMcp.mcpServerUrl
  );

  // Create filesystem tools (for code reading)
  const fsTools = await getReadonlyFilesystemTools(codebasePath);

  // Combine all tools
  const allTools = { ...githubTools, ...fsTools };
  logger.debug(
    {
      codebasePath,
      toolsCount: Object.keys(allTools).length,
    },
    "Added filesystem tools for codebase"
  );

  const prompt = getBeAnalyzerPrompt(input);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: backendChangesSchema,
  });

  // Calculate limits from options with defaults
  const limits = calculateLimits({
    maxSteps: options?.maxSteps || 20,
    maxOutputTokens: options?.maxOutputTokens || 50000,
    maxTotalTokens: options?.maxTotalTokens || 200000,
  });

  logger.info(
    {
      maxSteps: limits.MAX_STEPS,
      maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
      maxTotalTokens: limits.MAX_TOTAL_TOKENS,
      toolsCount: Object.keys(allTools).length,
      model: "gpt-5",
    },
    "Starting analysis with OpenAI"
  );

  // Active tools: GitHub tools for PR operations, filesystem tools for code reading
  const result = await generateText({
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools: allTools,
    activeTools: ["pull_request_read", "readFile", "bash"] as Array<
      keyof typeof allTools
    >,
    stopWhen: stepCountIs(limits.MAX_STEPS), // Stop when model generates text or after max steps
    maxOutputTokens: limits.MAX_OUTPUT_TOKENS, // Limit output tokens
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
            `CRITICAL: You are approaching the token limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately with all breaking changes found so far.`,
          stepForceMessage: () =>
            "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
        },
      });
    },
    onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
      // Log tool calls with action context (simplified - no full input object)
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          // Only log tool name and a brief summary, not the full input object
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

  const changeCount = result.output.backendChanges.length;
  const impactTypes = result.output.backendChanges.reduce(
    (
      acc: Record<string, number>,
      change: BackendChangesOutput["backendChanges"][number]
    ) => {
      acc[change.impact] = (acc[change.impact] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const filesAffected = new Set(
    result.output.backendChanges.map(
      (change: BackendChangesOutput["backendChanges"][number]) => change.file
    )
  ).size;

  // Calculate final token usage
  const finalUsage = result.steps
    ? trackTokenUsage(result.steps)
    : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
  const finalTotalTokens = finalUsage.currentTotalTokens;

  logger.info(
    {
      changeCount,
      filesAffected,
      impactTypes,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.totalInputTokens,
        outputTokens: finalUsage.totalOutputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `Analysis complete - found ${changeCount} breaking change${changeCount !== 1 ? "s" : ""} across ${filesAffected} file${filesAffected !== 1 ? "s" : ""}`
  );

  // Log each breaking change once with full details
  if (changeCount > 0) {
    result.output.backendChanges.forEach((change) => {
      logger.debug(
        {
          id: change.id,
          impact: change.impact,
          file: change.file,
          diffHunksCount: change.diffHunks.length,
          description: change.description,
          diffHunks: change.diffHunks.map((hunk) => ({
            startLine: hunk.startLine,
            endLine: hunk.endLine,
            startSide: hunk.startSide,
            endSide: hunk.endSide,
            changesCount: hunk.changes.length,
          })),
        },
        `Change ${change.id} - ${change.impact} in ${change.file}`
      );
    });
  }

  return result.output;
}
