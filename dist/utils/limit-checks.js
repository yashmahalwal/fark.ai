"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLimits = calculateLimits;
exports.trackTokenUsage = trackTokenUsage;
exports.hasOutput = hasOutput;
exports.countToolCalls = countToolCalls;
exports.enforceLimits = enforceLimits;
/**
 * Calculates all limit values from required options
 */
function calculateLimits(options) {
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
function trackTokenUsage(steps) {
    const stepUsage = steps.reduce((acc, step) => {
        if (step.usage) {
            return {
                inputTokens: acc.inputTokens + (step.usage.inputTokens || 0),
                outputTokens: acc.outputTokens + (step.usage.outputTokens || 0),
            };
        }
        return acc;
    }, { inputTokens: 0, outputTokens: 0 });
    return {
        totalInputTokens: stepUsage.inputTokens,
        totalOutputTokens: stepUsage.outputTokens,
        currentTotalTokens: stepUsage.inputTokens + stepUsage.outputTokens,
    };
}
/**
 * Checks if any step has text output
 */
function hasOutput(steps) {
    return steps.some((step) => step.text && step.text.trim().length > 0);
}
/**
 * Counts total tool calls across all steps
 */
function countToolCalls(steps) {
    return steps.reduce((count, step) => count + (step.toolCalls?.length || 0), 0);
}
/**
 * Enforces limits and returns prepareStep result if action is needed
 */
async function enforceLimits(params) {
    const { stepNumber, steps, messages, config } = params;
    const { limits, onTokenForce, onStepForce, onTokenLimitExceeded, tokenForceMessage, stepForceMessage, } = config;
    const usage = trackTokenUsage(steps);
    const { currentTotalTokens, totalInputTokens, totalOutputTokens } = usage;
    const { MAX_STEPS, FORCE_OUTPUT_AT_STEP, MAX_TOTAL_TOKENS, WRAPUP_WARN_AT_TOKENS, } = limits;
    // --- ≥100%: kill tools; repeat stop reminder each step until output; ≥125%: throw ---
    if (currentTotalTokens >= MAX_TOTAL_TOKENS) {
        const percentage = Math.round((currentTotalTokens / MAX_TOTAL_TOKENS) * 100);
        if (percentage >= 125) {
            onTokenLimitExceeded?.({
                stepNumber,
                currentTotalTokens,
                maxTotalTokens: MAX_TOTAL_TOKENS,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
            });
            throw new Error(`Token limit critically exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS}, ${percentage}%)`);
        }
        onTokenLimitExceeded?.({
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
        });
        const reminderMessage = {
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
        const percentage = Math.round((currentTotalTokens / MAX_TOTAL_TOKENS) * 100);
        onTokenForce?.({
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            percentage,
            toolCallsCount,
        });
        const wrapUpContent = tokenForceMessage?.(percentage) ||
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
            const reminderMessage = {
                role: "user",
                content: stepForceMessage?.() ||
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
//# sourceMappingURL=limit-checks.js.map