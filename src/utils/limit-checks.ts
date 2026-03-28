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
  /** 85% of max — inject wrap-up nudge; tools stay enabled */
  WRAPUP_WARN_AT_TOKENS: number;
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
   * Optional: Callback at 85% — wrap-up warning (tools still on)
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
   * Optional: Custom wrap-up message at ≥85% (before 100%); tools remain enabled
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
  const WRAPUP_WARN_AT_TOKENS = MAX_TOTAL_TOKENS * 0.85;

  return {
    MAX_STEPS,
    FORCE_OUTPUT_AT_STEP,
    MAX_OUTPUT_TOKENS,
    MAX_TOTAL_TOKENS,
    WRAPUP_WARN_AT_TOKENS,
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
    WRAPUP_WARN_AT_TOKENS,
  } = limits;

  // --- ≥100%: kill tools; repeat stop reminder each step until output; ≥125%: throw ---
  if (currentTotalTokens >= MAX_TOTAL_TOKENS) {
    const percentage = Math.round(
      (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
    );

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

    const reminderMessage: ModelMessage = {
      role: "user",
      content: `CRITICAL: Token budget exceeded (${percentage}% of limit). You MUST NOT call any more tools. Stop immediately and return your final output as JSON matching the schema with everything you have so far.`,
    };

    return {
      toolChoice: "none",
      messages: [...messages, reminderMessage],
    };
  }

  // --- ≥85% and <100%: ask to wrap up; tools stay on ---
  if (currentTotalTokens >= WRAPUP_WARN_AT_TOKENS) {
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

    const wrapUpContent =
      tokenForceMessage?.(percentage) ||
      `You are at about ${percentage}% of the token budget for this run. Wrap up essential work soon and be ready to return your final structured output. You may still use tools if needed, but prioritize finishing.`;

    return {
      messages: [...messages, { role: "user", content: wrapUpContent }],
    };
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
