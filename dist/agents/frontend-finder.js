"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFrontendImpacts = findFrontendImpacts;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const v3_1 = require("zod/v3");
const get_frontend_finder_prompt_1 = require("../utils/get-frontend-finder-prompt");
const create_logger_1 = require("../utils/create-logger");
const frontend_finder_schema_1 = require("../schemas/frontend-finder-schema");
const filesystem_tools_1 = require("../tools/filesystem-tools");
const agent_token_defaults_1 = require("../constants/agent-token-defaults");
const limit_checks_1 = require("../utils/limit-checks");
/**
 * Agent 2: Frontend Impact Finder
 * Determines where backend API changes impact frontend code using filesystem tools
 */
async function findFrontendImpacts(input, openaiApiKey, logLevel = "info") {
    const repoLabel = input.repository != null
        ? `${input.repository.owner}/${input.repository.repo}`
        : "";
    const logger = (0, create_logger_1.createLogger)(logLevel, repoLabel ? `Frontend Finder [${repoLabel}]` : "Frontend Finder");
    // Validate inputs using Zod
    let validatedInput;
    try {
        validatedInput = frontend_finder_schema_1.frontendFinderInputSchema.parse(input);
    }
    catch (error) {
        if (error instanceof v3_1.z.ZodError) {
            const errorMessages = error.issues.map((issue) => {
                const path = issue.path.join(".");
                return `${path}: ${issue.message}`;
            });
            logger.error({
                validationErrors: error.issues,
                errorMessages,
                input,
            }, "Input validation failed");
        }
        throw error;
    }
    if (!openaiApiKey ||
        typeof openaiApiKey !== "string" ||
        openaiApiKey.trim().length === 0) {
        throw new Error("OpenAI API key is required and must be a non-empty string");
    }
    const { repository, codebasePath, backendBatch, options } = validatedInput;
    logger.info({
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        codebasePath,
        batchId: backendBatch.batchId,
        batchDescription: backendBatch.description,
        changeCount: backendBatch.changes.length,
    }, `Analyzing ${repository.owner}/${repository.repo} (branch: ${repository.branch}) for batch ${backendBatch.batchId}: ${backendBatch.description} (${backendBatch.changes.length} change${backendBatch.changes.length !== 1 ? "s" : ""})`);
    // Create filesystem tools for codebase
    const tools = await (0, filesystem_tools_1.getReadonlyFilesystemTools)(codebasePath);
    logger.debug({
        codebasePath,
        toolsCount: Object.keys(tools).length,
    }, "Added filesystem tools for codebase");
    const prompt = (0, get_frontend_finder_prompt_1.getFrontendFinderPrompt)(input);
    const openaiClient = (0, openai_1.createOpenAI)({ apiKey: openaiApiKey });
    const outputSpec = ai_1.Output.object({
        schema: frontend_finder_schema_1.frontendImpactsSchema,
    });
    // Calculate limits from options with defaults
    const limits = (0, limit_checks_1.calculateLimits)({
        maxSteps: options?.maxSteps ?? agent_token_defaults_1.FRONTEND_FINDER_DEFAULTS.maxSteps,
        maxOutputTokens: options?.maxOutputTokens ?? agent_token_defaults_1.FRONTEND_FINDER_DEFAULTS.maxOutputTokens,
        maxTotalTokens: options?.maxTotalTokens ?? agent_token_defaults_1.FRONTEND_FINDER_DEFAULTS.maxTotalTokens,
    });
    logger.info({
        maxSteps: limits.MAX_STEPS,
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
        maxTotalTokens: limits.MAX_TOTAL_TOKENS,
        model: "gpt-5.2",
    }, "Starting analysis with OpenAI");
    const result = await (0, ai_1.generateText)({
        model: openaiClient("gpt-5.2"),
        output: outputSpec,
        tools,
        activeTools: ["readFile", "bash"],
        stopWhen: (0, ai_1.stepCountIs)(limits.MAX_STEPS), // Stop when model generates text or after max steps
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS, // Limit output tokens
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
                    tokenForceMessage: (percentage) => `You are at about ${percentage}% of the token budget. Finish checking this batch and prepare your final JSON with all impacts found so far. You may still use tools until the hard budget cap.`,
                    stepForceMessage: () => "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema with ALL impacts found so far. Include all impacts you've discovered from your searches. Do not call any more tools.",
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
    const impactCount = result.output.frontendImpacts.length;
    logger.info({
        impactCount,
        totalSteps: result.steps?.length || 0,
        finishReason: result.finishReason || undefined,
        tokenUsage: {
            inputTokens: finalUsage.totalInputTokens,
            outputTokens: finalUsage.totalOutputTokens,
            totalTokens: finalTotalTokens,
        },
    }, `Analysis complete - found ${impactCount} impact${impactCount !== 1 ? "s" : ""}`);
    // Log each impact once with full details
    if (impactCount > 0) {
        result.output.frontendImpacts.forEach((impact, index) => {
            logger.debug({
                index: index + 1,
                backendBatchId: impact.backendBatchId,
                backendChangeId: impact.backendChangeId,
                frontendRepo: impact.frontendRepo,
                file: impact.file,
                apiElement: impact.apiElement,
                description: impact.description,
                severity: impact.severity,
            }, `Impact ${index + 1} - ${impact.severity} severity in ${impact.frontendRepo}`);
        });
    }
    return result.output;
}
//# sourceMappingURL=frontend-finder.js.map