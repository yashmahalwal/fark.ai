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
export declare function calculateLimits(options: LimitOptions): CalculatedLimits;
/**
 * Tracks token usage across all steps
 */
export declare function trackTokenUsage<TOOLS extends ToolSet>(steps: Array<StepResult<TOOLS>>): TokenUsage;
/**
 * Checks if any step has text output
 */
export declare function hasOutput<TOOLS extends ToolSet>(steps: Array<StepResult<TOOLS>>): boolean;
/**
 * Counts total tool calls across all steps
 */
export declare function countToolCalls<TOOLS extends ToolSet>(steps: Array<StepResult<TOOLS>>): number;
/**
 * Enforces limits and returns prepareStep result if action is needed
 */
export declare function enforceLimits<TOOLS extends ToolSet>(params: {
    stepNumber: number;
    steps: Array<StepResult<TOOLS>>;
    messages: ModelMessage[];
    config: LimitCheckHandlerConfig;
}): Promise<{
    toolChoice?: "none";
    messages?: ModelMessage[];
}>;
//# sourceMappingURL=limit-checks.d.ts.map