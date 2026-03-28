"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePRComments = generatePRComments;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const get_comment_generator_prompt_1 = require("../utils/get-comment-generator-prompt");
const create_logger_1 = require("../utils/create-logger");
const agent_token_defaults_1 = require("../constants/agent-token-defaults");
const limit_checks_1 = require("../utils/limit-checks");
const comment_generator_schema_1 = require("../schemas/comment-generator-schema");
/**
 * Agent 3: PR Comment Generator
 * Generates inline PR comments for backend changes with frontend impact information
 */
async function generatePRComments(input, openaiApiKey, logLevel = "info") {
    const logger = (0, create_logger_1.createLogger)(logLevel, "Comment Generator");
    const validatedInput = comment_generator_schema_1.commentGeneratorInputSchema.parse(input);
    if (!openaiApiKey ||
        typeof openaiApiKey !== "string" ||
        openaiApiKey.trim().length === 0) {
        throw new Error("OpenAI API key is required and must be a non-empty string");
    }
    const { changes, backend_owner, backend_repo, pull_number, options } = validatedInput;
    const totalImpacts = changes.reduce((sum, change) => sum + change.frontendImpacts.length, 0);
    logger.info({
        pull_number,
        owner: backend_owner,
        repo: backend_repo,
        changeCount: changes.length,
        totalImpacts,
    }, `Generating comments for PR #${pull_number} in ${backend_owner}/${backend_repo}`);
    const prompt = (0, get_comment_generator_prompt_1.getCommentGeneratorPrompt)(validatedInput);
    const openaiClient = (0, openai_1.createOpenAI)({ apiKey: openaiApiKey });
    const outputSpec = ai_1.Output.object({
        schema: comment_generator_schema_1.prCommentsSchema,
    });
    const limits = (0, limit_checks_1.calculateLimits)({
        maxSteps: options?.maxSteps ?? agent_token_defaults_1.COMMENT_GENERATOR_DEFAULTS.maxSteps,
        maxOutputTokens: options?.maxOutputTokens ?? agent_token_defaults_1.COMMENT_GENERATOR_DEFAULTS.maxOutputTokens,
        maxTotalTokens: options?.maxTotalTokens ?? agent_token_defaults_1.COMMENT_GENERATOR_DEFAULTS.maxTotalTokens,
    });
    logger.info({
        maxSteps: limits.MAX_STEPS,
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
        maxTotalTokens: limits.MAX_TOTAL_TOKENS,
        model: "gpt-4o",
    }, "Starting analysis with OpenAI");
    const result = await (0, ai_1.generateText)({
        model: openaiClient("gpt-4o"),
        output: outputSpec,
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
                    tokenForceMessage: (percentage) => `You are at about ${percentage}% of the token budget. Wrap up and prepare your final JSON (all comments for every diff hunk). You may still use tools until the hard budget cap.`,
                    stepForceMessage: () => "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
                },
            });
        },
        onStepFinish: ({ toolCalls, usage }) => {
            if (toolCalls && toolCalls.length > 0) {
                toolCalls.forEach((tc) => {
                    if (tc.toolName === "pull_request_review_write" ||
                        tc.toolName === "add_comment_to_pending_review") {
                        logger.info({
                            tool: tc.toolName,
                            input: tc.input,
                        }, "Posting comment to PR");
                    }
                    else {
                        logger.debug({
                            tool: tc.toolName,
                            input: tc.input,
                        }, `Tool call - ${tc.toolName}`);
                    }
                });
            }
            if (usage) {
                logger.debug({
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    stepTotal: (usage.inputTokens || 0) + (usage.outputTokens || 0),
                }, "Token usage");
            }
        },
    });
    if (!result.output) {
        logger.error({
            totalSteps: result.steps?.length || 0,
            finishReason: result.finishReason || undefined,
        }, "Failed to generate structured output from the model");
        throw new Error("Failed to generate structured output from the model");
    }
    const output = result.output;
    const finalUsage = result.steps
        ? (0, limit_checks_1.trackTokenUsage)(result.steps)
        : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
    const finalTotalTokens = finalUsage.currentTotalTokens;
    logger.info({
        commentCount: output.comments.length,
        totalSteps: result.steps?.length || 0,
        finishReason: result.finishReason || undefined,
        tokenUsage: {
            inputTokens: finalUsage.totalInputTokens,
            outputTokens: finalUsage.totalOutputTokens,
            totalTokens: finalTotalTokens,
        },
    }, `Generation complete, created ${output.comments.length} comments`);
    logger.info({
        summary: output.summary.substring(0, 200) +
            (output.summary.length > 200 ? "..." : ""),
        summaryLength: output.summary.length,
    }, "Generated summary");
    if (output.comments.length > 0) {
        output.comments.forEach((comment, index) => {
            logger.debug({
                index: index + 1,
                path: comment.path,
                startLine: comment.startLine,
                endLine: comment.endLine,
                startSide: comment.startSide,
                endSide: comment.endSide,
                bodyLength: comment.body.length,
                bodyPreview: comment.body.substring(0, 200) +
                    (comment.body.length > 200 ? "..." : ""),
            }, `Comment ${index + 1} - ${comment.path}:${comment.startLine}${comment.endLine !== comment.startLine ? `-${comment.endLine}` : ""}`);
            logger.debug({ body: comment.body }, "Full comment body");
        });
    }
    else {
        logger.warn("No comments generated - comments array is empty");
    }
    return output;
}
//# sourceMappingURL=comment-generator.js.map