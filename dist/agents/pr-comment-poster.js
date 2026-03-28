"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postPRComments = postPRComments;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const get_pr_comment_poster_prompt_1 = require("../utils/get-pr-comment-poster-prompt");
const create_logger_1 = require("../utils/create-logger");
const agent_token_defaults_1 = require("../constants/agent-token-defaults");
const limit_checks_1 = require("../utils/limit-checks");
const pr_comment_poster_schema_1 = require("../schemas/pr-comment-poster-schema");
const github_tools_1 = require("../tools/github-tools");
/**
 * Agent 4: PR Comment Poster
 * Posts comments to the backend PR using GitHub MCP tools
 * For now, creates a draft review with summary in the body
 */
async function postPRComments(input, openaiApiKey, logLevel = "info") {
    const logger = (0, create_logger_1.createLogger)(logLevel, "PR Comment Poster");
    // Validate inputs using Zod
    const validatedInput = pr_comment_poster_schema_1.prCommentPosterInputSchema.parse(input);
    if (!openaiApiKey ||
        typeof openaiApiKey !== "string" ||
        openaiApiKey.trim().length === 0) {
        throw new Error("OpenAI API key is required and must be a non-empty string");
    }
    const { comments, backend_owner, backend_repo, pull_number, githubMcp, options, } = validatedInput;
    // Create GitHub tools (for PR operations)
    const { tools: githubTools } = await (0, github_tools_1.getBackendTools)(githubMcp.token, githubMcp.mcpServerUrl);
    logger.info({
        pull_number,
        owner: backend_owner,
        repo: backend_repo,
        commentCount: comments.comments.length,
    }, `Creating draft review for PR #${pull_number} in ${backend_owner}/${backend_repo}`);
    const prompt = (0, get_pr_comment_poster_prompt_1.getPRCommentPosterPrompt)(validatedInput);
    const openaiClient = (0, openai_1.createOpenAI)({ apiKey: openaiApiKey });
    const outputSpec = ai_1.Output.object({
        schema: pr_comment_poster_schema_1.prCommentPosterOutputSchema,
    });
    // Wrap pull_request_review_write tool to intercept and remove 'event' parameter before execution
    // This ensures draft reviews are created by removing the 'event' parameter if present
    const wrappedTools = { ...githubTools };
    if (wrappedTools.pull_request_review_write) {
        const originalTool = wrappedTools.pull_request_review_write;
        // Check if tool has execute method
        if (!originalTool.execute || typeof originalTool.execute !== "function") {
            logger.error({
                toolName: "pull_request_review_write",
                toolType: typeof originalTool,
                toolKeys: Object.keys(originalTool),
            }, "Tool does not have execute method, cannot wrap");
        }
        else {
            const originalExecute = originalTool.execute.bind(originalTool);
            wrappedTools.pull_request_review_write = {
                ...originalTool,
                execute: async (args) => {
                    logger.debug("Wrapper intercepting pull_request_review_write");
                    // Remove 'event' parameter ONLY for method="create" to ensure draft review creation
                    // Allow 'event' parameter for method="submit_pending" to submit the review
                    // Note: commitID is required and should be the PR head SHA (even for multi-commit PRs, use the HEAD commit)
                    const method = args && typeof args === "object" ? args.method : undefined;
                    if (method === "create" &&
                        args &&
                        typeof args === "object" &&
                        "event" in args) {
                        const { event, ...restArgs } = args;
                        if (event !== undefined) {
                            logger.warn({
                                removedEvent: event,
                            }, "Removed 'event' parameter from create method to ensure draft review");
                        }
                        const result = await originalExecute(restArgs);
                        logger.debug({
                            result,
                        }, "Wrapper executed create without event parameter");
                        return result;
                    }
                    const result = await originalExecute(args);
                    return result;
                },
            };
        }
    }
    const limits = (0, limit_checks_1.calculateLimits)({
        maxSteps: options?.maxSteps ?? agent_token_defaults_1.PR_COMMENT_POSTER_DEFAULTS.maxSteps,
        maxOutputTokens: options?.maxOutputTokens ?? agent_token_defaults_1.PR_COMMENT_POSTER_DEFAULTS.maxOutputTokens,
        maxTotalTokens: options?.maxTotalTokens ?? agent_token_defaults_1.PR_COMMENT_POSTER_DEFAULTS.maxTotalTokens,
    });
    logger.info({
        maxSteps: limits.MAX_STEPS,
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
        maxTotalTokens: limits.MAX_TOTAL_TOKENS,
        model: "gpt-5.2",
    }, "Starting review creation with OpenAI");
    const result = await (0, ai_1.generateText)({
        model: openaiClient("gpt-5.2"),
        output: outputSpec,
        tools: wrappedTools,
        activeTools: [
            "pull_request_read",
            "pull_request_review_write",
            "add_comment_to_pending_review",
        ],
        stopWhen: (0, ai_1.stepCountIs)(limits.MAX_STEPS),
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
        prompt,
        prepareStep: async ({ stepNumber, steps, messages }) => {
            return (0, limit_checks_1.enforceLimits)({
                stepNumber,
                steps,
                messages,
                config: {
                    limits,
                    onTokenForce: (params) => {
                        logger.warn(params, "Past 85% token budget — wrap-up nudge (tools still allowed)");
                    },
                    onStepForce: (params) => {
                        logger.warn(params, "Approaching step limit, forcing output generation");
                    },
                    onTokenLimitExceeded: (params) => {
                        logger.error(params, "Total token limit exceeded, aborting");
                    },
                    tokenForceMessage: (percentage) => `You are at about ${percentage}% of the token budget. Finish any remaining inline comments, then submit the pending review with pull_request_review_write (method="submit_pending", event="COMMENT") if not already submitted — do not defer submit. After that, return your final JSON. You may still use tools until the hard budget cap.`,
                    stepForceMessage: () => 'CRITICAL: You are approaching the step limit. If the review has been created but not yet submitted, you MUST submit it now using pull_request_review_write with method="submit_pending", event="COMMENT". After submitting (or if already submitted), immediately return your final output as JSON matching the schema. Do not call any more tools.',
                },
            });
        },
        onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
            // Log tool calls
            if (toolCalls && toolCalls.length > 0) {
                toolCalls.forEach((tc) => {
                    logger.debug({
                        tool: tc.toolName,
                        input: tc.input,
                    }, `Tool call - ${tc.toolName}`);
                });
            }
            // Log any text output from model
            if (text) {
                logger.debug({
                    textLength: text.length,
                    finishReason: finishReason || undefined,
                }, "Model generated text output");
            }
            // Log usage if available
            if (usage) {
                const stepTotal = (usage.inputTokens || 0) + (usage.outputTokens || 0);
                logger.debug({
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    stepTotal,
                }, "Token usage");
            }
        },
    });
    // With output spec, result.output will always be present or process exits with error
    if (!result.output) {
        logger.error({
            totalSteps: result.steps?.length || 0,
            finishReason: result.finishReason || undefined,
        }, "Failed to generate structured output from the model");
        throw new Error("Failed to generate structured output from the model");
    }
    // Calculate final token usage
    const finalUsage = result.steps
        ? (0, limit_checks_1.trackTokenUsage)(result.steps)
        : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
    const finalTotalTokens = finalUsage.currentTotalTokens;
    // Log final output with full details
    logger.info({
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
        toolCallsCount: result.steps?.reduce((sum, step) => sum + (step.toolCalls?.length || 0), 0) || 0,
        toolResultsCount: result.steps?.reduce((sum, step) => sum + (step.toolResults?.length || 0), 0) || 0,
    }, `Review creation ${result.output.success ? "complete" : "failed"} - ${result.output.message}`);
    // Log detailed review information if successful
    if (!result.output.success) {
        logger.warn({
            reviewId: result.output.reviewId,
            message: result.output.message,
            commentCount: comments.comments.length,
        }, "Review creation failed or incomplete");
    }
    return result.output;
}
//# sourceMappingURL=pr-comment-poster.js.map