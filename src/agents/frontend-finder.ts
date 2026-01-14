import { generateText, stepCountIs, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import pino from "pino";
import { getFrontendFinderPrompt } from "../utils/get-frontend-finder-prompt";
import {
  frontendFinderInputSchema,
  frontendImpactsSchema,
  type FrontendFinderInput,
  type FrontendImpactsOutput,
} from "../schemas/frontend-finder-schema";

// Re-export schemas for backward compatibility
export {
  frontendRepoSchema,
  frontendFinderInputSchema,
  frontendImpactItemSchema,
  frontendImpactsSchema,
  type FrontendFinderInput,
  type FrontendImpactsOutput,
} from "../schemas/frontend-finder-schema";

/**
 * Agent 2: Frontend Impact Finder
 * Determines where backend API changes impact frontend code using GitHub MCP tools
 */
export async function findFrontendImpacts(
  input: FrontendFinderInput,
  tools: Record<string, any>,
  openaiApiKey: string,
  logger: pino.Logger = pino(),
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
): Promise<FrontendImpactsOutput> {
  // Validate inputs using Zod
  let validatedInput: FrontendFinderInput;
  try {
    validatedInput = frontendFinderInputSchema.parse(input);
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
        "Frontend Finder: Input validation failed"
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

  const { frontendRepo, backendChanges } = validatedInput;

  logger.debug(
    {
      frontendRepo: `${frontendRepo.owner}/${frontendRepo.repo}`,
      branch: frontendRepo.branch,
      backendChangesCount: backendChanges.backendChanges.length,
    },
    "Frontend Finder: Starting analysis"
  );
  logger.info(
    {
      owner: frontendRepo.owner,
      repo: frontendRepo.repo,
      branch: frontendRepo.branch,
      changeCount: backendChanges.backendChanges.length,
    },
    `Frontend Finder: Analyzing ${frontendRepo.owner}/${frontendRepo.repo} (branch: ${frontendRepo.branch}) for ${backendChanges.backendChanges.length} backend changes`
  );

  const prompt = getFrontendFinderPrompt(input);

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: frontendImpactsSchema,
  });

  // Get limits from options with fallback defaults
  const MAX_STEPS = options?.maxSteps || 30;
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2); // Force output generation 2 steps before limit
  const MAX_OUTPUT_TOKENS = options?.maxOutputTokens || 50000;
  const MAX_TOTAL_TOKENS = options?.maxTotalTokens || 400000; // Increased default for frontend finder
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
    "Frontend Finder: Starting analysis with OpenAI"
  );

  const result = await generateText({
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools,
    activeTools: ["get_file_contents", "search_code"], // Limit to read-only tools using AI SDK's activeTools
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
          "Frontend Finder: Approaching total token limit"
        );
      }

      // Force output generation when approaching token limit (85%)
      // Only force if we've done substantial searching (at least 10 tool calls)
      if (currentTotalTokens >= FORCE_OUTPUT_AT_TOKENS) {
        const toolCallsCount = steps.reduce(
          (count, step) => count + (step.toolCalls?.length || 0),
          0
        );
        const hasDoneSubstantialSearching = toolCallsCount >= 10; // At least 10 tool calls means we've done substantial searching

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
            toolCallsCount,
            hasDoneSubstantialSearching,
          },
          "Frontend Finder: Approaching token limit, checking if we should force output"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        // Only force output if we've done substantial searching OR we already have output
        if (!hasOutput && hasDoneSubstantialSearching) {
          // Force text generation by preventing tool calls
          const reminderMessage = {
            role: "user" as const,
            content:
              "CRITICAL: You are approaching the token limit (85%). You MUST now generate your final output as JSON matching the schema with ALL impacts found so far. Include all impacts you've discovered from your searches. Do not call any more tools.",
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
          "Frontend Finder: Total token limit exceeded, aborting"
        );
        throw new Error(
          `Token limit exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS})`
        );
      }

      // When approaching step limit, force the model to generate output instead of calling tools
      // Only force if we've done substantial searching (at least 10 tool calls)
      if (stepNumber >= FORCE_OUTPUT_AT_STEP) {
        const toolCallsCount = steps.reduce(
          (count, step) => count + (step.toolCalls?.length || 0),
          0
        );
        const hasDoneSubstantialSearching = toolCallsCount >= 10; // At least 10 tool calls means we've done substantial searching

        logger.warn(
          {
            stepNumber,
            maxSteps: MAX_STEPS,
            totalToolCalls: toolCallsCount,
            stepsCompleted: steps.length,
            hasDoneSubstantialSearching,
          },
          "Frontend Finder: Approaching step limit, checking if we should force output"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        // Only force output if we've done substantial searching OR we already have output
        if (!hasOutput && hasDoneSubstantialSearching) {
          // Force text generation by preventing tool calls
          // Also add a reminder message to generate output
          const reminderMessage = {
            role: "user" as const,
            content:
              "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema with ALL impacts found so far. Include all impacts you've discovered from your searches. Do not call any more tools.",
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
      // Log tool calls
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          logger.debug(
            {
              tool: tc.toolName,
              input: tc.input,
            },
            `Frontend Finder: Tool call - ${tc.toolName}`
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
          "Frontend Finder: Model generated text output"
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
          "Frontend Finder: Token usage"
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
      "Frontend Finder: Failed to generate structured output from the model"
    );
    throw new Error("Failed to generate structured output from the model");
  }

  // Calculate final token usage
  const finalUsage = result.steps?.reduce(
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
  ) || { inputTokens: 0, outputTokens: 0 };
  const finalTotalTokens = finalUsage.inputTokens + finalUsage.outputTokens;

  const impactCount = result.output.frontendImpacts.length;
  logger.info(
    {
      impactCount,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.inputTokens,
        outputTokens: finalUsage.outputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `Frontend Finder: Analysis complete - found ${impactCount} impact${impactCount !== 1 ? "s" : ""}`
  );

  // Log each impact once
  if (impactCount > 0) {
    logger.info("Frontend Finder: Detected impacts details:");
    result.output.frontendImpacts.forEach(
      (
        impact: FrontendImpactsOutput["frontendImpacts"][number],
        index: number
      ) => {
        logger.info(
          {
            index: index + 1,
            backendChangeId: impact.backendChangeId,
            file: impact.file,
            codeHunk: impact.codeHunk,
            apiElement: impact.apiElement,
            description: impact.description,
            severity: impact.severity,
          },
          `Frontend Finder: Impact ${index + 1} - ${impact.severity}`
        );
      }
    );
  }

  return result.output;
}
