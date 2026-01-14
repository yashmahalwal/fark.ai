import { generateText, stepCountIs, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import pino from "pino";
import { getBeAnalyzerPrompt } from "../utils/get-be-analyzer-prompt";
import {
  backendInputSchema,
  backendChangesSchema,
  type BackendInput,
  type BackendChangesOutput,
} from "../schemas/be-analyzer-schema";

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
 * Extracts API interface changes from PR diff using GitHub MCP tools and OpenAI reasoning
 */
export async function analyzeBackendDiff(
  input: BackendInput,
  tools: Record<string, any>,
  openaiApiKey: string,
  logger: pino.Logger = pino(),
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
): Promise<BackendChangesOutput> {
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
        },
        "BE Analyzer: Input validation failed"
      );
    }
    throw error;
  }

  // Validate other parameters
  if (!tools || Object.keys(tools).length === 0) {
    throw new Error("Tools are required and must not be empty");
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

  const { backend } = validatedInput;
  logger.info(
    {
      pull_number: backend.pull_number,
      owner: backend.owner,
      repo: backend.repo,
    },
    `BE Analyzer: Analyzing PR #${backend.pull_number} in ${backend.owner}/${backend.repo}`
  );

  const prompt = getBeAnalyzerPrompt(input);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: backendChangesSchema,
  });

  // Get limits from options with fallback defaults
  const MAX_STEPS = options?.maxSteps || 20;
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2); // Force output generation 2 steps before limit
  const MAX_OUTPUT_TOKENS = options?.maxOutputTokens || 50000;
  const MAX_TOTAL_TOKENS = options?.maxTotalTokens || 200000;
  const FORCE_OUTPUT_AT_TOKENS = MAX_TOTAL_TOKENS * 0.85; // Force output at 85% of token limit

  // Track total token usage across all steps
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  logger.info(
    {
      maxSteps: MAX_STEPS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxTotalTokens: MAX_TOTAL_TOKENS,
      toolsCount: Object.keys(tools).length,
    },
    "BE Analyzer: Starting analysis with OpenAI"
  );

  const result = await generateText({
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools,
    activeTools: ["get_file_contents", "search_code", "pull_request_read"], // Limit to read-only tools using AI SDK's activeTools
    stopWhen: stepCountIs(MAX_STEPS), // Stop when model generates text or after max steps
    maxOutputTokens: MAX_OUTPUT_TOKENS, // Limit output tokens
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
          "BE Analyzer: Approaching total token limit"
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
          "BE Analyzer: Approaching token limit, forcing output generation"
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
              "CRITICAL: You are approaching the token limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately with all breaking changes found so far.",
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
          "BE Analyzer: Total token limit exceeded, aborting"
        );
        throw new Error(
          `Token limit exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS})`
        );
      }

      // When approaching step limit, force the model to generate output instead of calling tools
      if (stepNumber >= FORCE_OUTPUT_AT_STEP) {
        const toolCallsCount = steps.reduce(
          (count, step) => count + (step.toolCalls?.length || 0),
          0
        );
        logger.warn(
          {
            stepNumber,
            maxSteps: MAX_STEPS,
            totalToolCalls: toolCallsCount,
            stepsCompleted: steps.length,
          },
          "BE Analyzer: Approaching step limit, forcing output generation"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        if (!hasOutput) {
          // Force text generation by preventing tool calls
          // Also add a reminder message to generate output
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
            `BE Analyzer: Tool call - ${tc.toolName}`
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
          "BE Analyzer: Model generated text output"
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
          "BE Analyzer: Token usage"
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
      "BE Analyzer: Failed to generate structured output from the model"
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
      changeCount,
      filesAffected,
      impactTypes,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.inputTokens,
        outputTokens: finalUsage.outputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `BE Analyzer: Analysis complete - found ${changeCount} breaking change${changeCount !== 1 ? "s" : ""} across ${filesAffected} file${filesAffected !== 1 ? "s" : ""}`
  );

  // Log each breaking change once
  if (changeCount > 0) {
    result.output.backendChanges.forEach((change) => {
      logger.info(
        {
          id: change.id,
          impact: change.impact,
          file: change.file,
          description: change.description,
        },
        `BE Analyzer: Change ${change.id} - ${change.impact}`
      );
    });
  }

  return result.output;
}
