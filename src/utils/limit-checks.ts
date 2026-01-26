import type { StepResult, ModelMessage, ToolSet } from "ai";

/**
 * Options for calculating limits - all fields are required
 */
export interface LimitOptions {
  maxSteps: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
}

/**
 * Calculated limits
 */
export interface CalculatedLimits {
  MAX_STEPS: number;
  FORCE_OUTPUT_AT_STEP: number;
  MAX_OUTPUT_TOKENS: number;
  MAX_TOTAL_TOKENS: number;
  FORCE_OUTPUT_AT_TOKENS: number;
}

/**
 * Token usage tracking result
 */
export interface TokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  currentTotalTokens: number;
}

/**
 * Configuration for limit check handler
 */
export interface LimitCheckHandlerConfig {
  limits: CalculatedLimits;
  /**
   * Optional: Callback when approaching token limit (80%)
   */
  onTokenWarning?: (params: {
    stepNumber: number;
    currentTotalTokens: number;
    maxTotalTokens: number;
    inputTokens: number;
    outputTokens: number;
    percentage: number;
  }) => void;
  /**
   * Optional: Custom warning message when approaching token limit (80%)
   */
  tokenWarningMessage?: (percentage: number) => ModelMessage | null;
  /**
   * Optional: Callback when forcing output due to token limit (85%)
   */
  onTokenForce?: (params: {
    stepNumber: number;
    currentTotalTokens: number;
    maxTotalTokens: number;
    inputTokens: number;
    outputTokens: number;
    percentage: number;
    toolCallsCount: number;
  }) => void;
  /**
   * Optional: Callback when forcing output due to step limit
   */
  onStepForce?: (params: {
    stepNumber: number;
    maxSteps: number;
    totalToolCalls: number;
    stepsCompleted: number;
  }) => void;
  /**
   * Optional: Callback when token limit is exceeded (100%)
   */
  onTokenLimitExceeded?: (params: {
    stepNumber: number;
    currentTotalTokens: number;
    maxTotalTokens: number;
    inputTokens: number;
    outputTokens: number;
  }) => void;
  /**
   * Optional: Custom force output message when approaching token limit (85%)
   */
  tokenForceMessage?: (percentage: number) => string;
  /**
   * Optional: Custom force output message when approaching step limit
   */
  stepForceMessage?: () => string;
}

/**
 * Calculates all limit values from required options
 */
export function calculateLimits(options: LimitOptions): CalculatedLimits {
  const MAX_STEPS = options.maxSteps;
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2);
  const MAX_OUTPUT_TOKENS = options.maxOutputTokens;
  const MAX_TOTAL_TOKENS = options.maxTotalTokens;
  const FORCE_OUTPUT_AT_TOKENS = MAX_TOTAL_TOKENS * 0.85;

  return {
    MAX_STEPS,
    FORCE_OUTPUT_AT_STEP,
    MAX_OUTPUT_TOKENS,
    MAX_TOTAL_TOKENS,
    FORCE_OUTPUT_AT_TOKENS,
  };
}

/**
 * Tracks token usage across all steps
 */
export function trackTokenUsage<TOOLS extends ToolSet>(
  steps: Array<StepResult<TOOLS>>
): TokenUsage {
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

  return {
    totalInputTokens: stepUsage.inputTokens,
    totalOutputTokens: stepUsage.outputTokens,
    currentTotalTokens: stepUsage.inputTokens + stepUsage.outputTokens,
  };
}

/**
 * Checks if any step has text output
 */
export function hasOutput<TOOLS extends ToolSet>(
  steps: Array<StepResult<TOOLS>>
): boolean {
  return steps.some((step) => step.text && step.text.trim().length > 0);
}

/**
 * Counts total tool calls across all steps
 */
export function countToolCalls<TOOLS extends ToolSet>(
  steps: Array<StepResult<TOOLS>>
): number {
  return steps.reduce(
    (count, step) => count + (step.toolCalls?.length || 0),
    0
  );
}

/**
 * Enforces limits and returns prepareStep result if action is needed
 */
export async function enforceLimits<TOOLS extends ToolSet>(params: {
  stepNumber: number;
  steps: Array<StepResult<TOOLS>>;
  messages: ModelMessage[];
  config: LimitCheckHandlerConfig;
}): Promise<{ toolChoice?: "none"; messages?: ModelMessage[] }> {
  const { stepNumber, steps, messages, config } = params;
  const {
    limits,
    onTokenWarning,
    tokenWarningMessage,
    onTokenForce,
    onStepForce,
    onTokenLimitExceeded,
    tokenForceMessage,
    stepForceMessage,
  } = config;
  const usage = trackTokenUsage(steps);
  const { currentTotalTokens, totalInputTokens, totalOutputTokens } = usage;
  const {
    MAX_STEPS,
    FORCE_OUTPUT_AT_STEP,
    MAX_TOTAL_TOKENS,
    FORCE_OUTPUT_AT_TOKENS,
  } = limits;

  // Warn if approaching token limits (80% to 85% only - don't warn after we've passed 85%)
  if (
    currentTotalTokens > MAX_TOTAL_TOKENS * 0.8 &&
    currentTotalTokens < FORCE_OUTPUT_AT_TOKENS
  ) {
    const percentage = Math.round(
      (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
    );
    onTokenWarning?.({
      stepNumber,
      currentTotalTokens,
      maxTotalTokens: MAX_TOTAL_TOKENS,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      percentage,
    });

    // Add custom warning message if provided
    if (tokenWarningMessage) {
      const warningMsg = tokenWarningMessage(percentage);
      if (warningMsg) {
        return {
          messages: [...messages, warningMsg],
        };
      }
    }
  }

  // Force output generation when approaching token limit (85%)
  if (currentTotalTokens >= FORCE_OUTPUT_AT_TOKENS) {
    const toolCallsCount = countToolCalls(steps);
    const percentage = Math.round(
      (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
    );

    onTokenForce?.({
      stepNumber,
      currentTotalTokens,
      maxTotalTokens: MAX_TOTAL_TOKENS,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      percentage,
      toolCallsCount,
    });

    const hasOutputResult = hasOutput(steps);

    // Always force output at 85% if we don't have it yet
    if (!hasOutputResult) {
      const reminderMessage: ModelMessage = {
        role: "user",
        content:
          tokenForceMessage?.(percentage) ||
          `CRITICAL: You are approaching the token limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete results immediately.`,
      };

      return {
        toolChoice: "none",
        messages: [...messages, reminderMessage],
      };
    }
  }

  // If token limit exceeded, force output generation (don't throw - let model finish)
  // But throw if we exceed 150% to prevent runaway costs
  if (currentTotalTokens >= MAX_TOTAL_TOKENS) {
    const percentage = Math.round(
      (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
    );

    // Hard stop at 125% to prevent runaway costs
    if (percentage >= 125) {
      onTokenLimitExceeded?.({
        stepNumber,
        currentTotalTokens,
        maxTotalTokens: MAX_TOTAL_TOKENS,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      });
      throw new Error(
        `Token limit critically exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS}, ${percentage}%)`
      );
    }

    onTokenLimitExceeded?.({
      stepNumber,
      currentTotalTokens,
      maxTotalTokens: MAX_TOTAL_TOKENS,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });

    // Check if we already have output
    const hasOutputResult = hasOutput(steps);

    // Force output if we don't have it yet
    if (!hasOutputResult) {
      const reminderMessage: ModelMessage = {
        role: "user",
        content:
          tokenForceMessage?.(percentage) ||
          `CRITICAL: Token limit exceeded. You MUST immediately generate your final output as JSON matching the schema with all results found so far. Do not call any more tools.`,
      };

      return {
        toolChoice: "none",
        messages: [...messages, reminderMessage],
      };
    }
  }

  // When approaching step limit, force the model to generate output
  if (stepNumber >= FORCE_OUTPUT_AT_STEP) {
    const toolCallsCount = countToolCalls(steps);

    onStepForce?.({
      stepNumber,
      maxSteps: MAX_STEPS,
      totalToolCalls: toolCallsCount,
      stepsCompleted: steps.length,
    });

    const hasOutputResult = hasOutput(steps);

    // Always force output at step limit if we don't have it yet
    if (!hasOutputResult) {
      const reminderMessage: ModelMessage = {
        role: "user",
        content:
          stepForceMessage?.() ||
          `IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete results immediately.`,
      };

      return {
        toolChoice: "none",
        messages: [...messages, reminderMessage],
      };
    }
  }

  // Default: continue with normal execution
  return {};
}
