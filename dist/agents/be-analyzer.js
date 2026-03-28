"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBackendDiff = analyzeBackendDiff;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const v3_1 = require("zod/v3");
const get_be_analyzer_prompt_1 = require("../utils/get-be-analyzer-prompt");
const create_logger_1 = require("../utils/create-logger");
const be_analyzer_schema_1 = require("../schemas/be-analyzer-schema");
const filesystem_tools_1 = require("../tools/filesystem-tools");
const github_tools_1 = require("../tools/github-tools");
const agent_token_defaults_1 = require("../constants/agent-token-defaults");
const limit_checks_1 = require("../utils/limit-checks");
/**
 * Agent 1: BE Diff Analyzer
 * Extracts API interface changes from PR diff using GitHub MCP tools (for PR) and filesystem tools (for code reading)
 */
async function analyzeBackendDiff(input, openaiApiKey, logLevel = "info") {
    const logger = (0, create_logger_1.createLogger)(logLevel, "BE Analyzer");
    // Validate inputs using Zod
    let validatedInput;
    try {
        validatedInput = be_analyzer_schema_1.backendInputSchema.parse(input);
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
    const { repository, codebasePath, githubMcp, options } = validatedInput;
    logger.info({
        pull_number: repository.pull_number,
        owner: repository.owner,
        repo: repository.repo,
        codebasePath,
    }, `Analyzing PR #${repository.pull_number} in ${repository.owner}/${repository.repo}`);
    // Create GitHub tools (for PR operations)
    const { tools: githubTools } = await (0, github_tools_1.getBackendTools)(githubMcp.token, githubMcp.mcpServerUrl);
    // Create filesystem tools (for code reading)
    const fsTools = await (0, filesystem_tools_1.getReadonlyFilesystemTools)(codebasePath);
    // Combine all tools
    const allTools = { ...githubTools, ...fsTools };
    logger.debug({
        codebasePath,
        toolsCount: Object.keys(allTools).length,
    }, "Added filesystem tools for codebase");
    const prompt = (0, get_be_analyzer_prompt_1.getBeAnalyzerPrompt)(input);
    const openaiClient = (0, openai_1.createOpenAI)({ apiKey: openaiApiKey });
    const outputSpec = ai_1.Output.object({
        schema: be_analyzer_schema_1.backendChangesSchema,
    });
    // Calculate limits from options with defaults
    const limits = (0, limit_checks_1.calculateLimits)({
        maxSteps: options?.maxSteps ?? agent_token_defaults_1.BE_ANALYZER_DEFAULTS.maxSteps,
        maxOutputTokens: options?.maxOutputTokens ?? agent_token_defaults_1.BE_ANALYZER_DEFAULTS.maxOutputTokens,
        maxTotalTokens: options?.maxTotalTokens ?? agent_token_defaults_1.BE_ANALYZER_DEFAULTS.maxTotalTokens,
    });
    logger.info({
        maxSteps: limits.MAX_STEPS,
        maxOutputTokens: limits.MAX_OUTPUT_TOKENS,
        maxTotalTokens: limits.MAX_TOTAL_TOKENS,
        toolsCount: Object.keys(allTools).length,
        model: "gpt-5.2",
    }, "Starting analysis with OpenAI");
    // Active tools: GitHub tools for PR operations, filesystem tools for code reading
    const result = await (0, ai_1.generateText)({
        model: openaiClient("gpt-5.2"),
        output: outputSpec,
        tools: allTools,
        activeTools: ["pull_request_read", "readFile", "bash"],
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
                    tokenForceMessage: (percentage) => `You are at about ${percentage}% of the token budget. Wrap up essential searches and consolidate results; prepare to return your final JSON with all breaking changes found so far. You may still use tools until the hard budget cap.`,
                    stepForceMessage: () => "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
                },
            });
        },
        onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
            // Log tool calls with action context (simplified - no full input object)
            if (toolCalls && toolCalls.length > 0) {
                toolCalls.forEach((tc) => {
                    // Only log tool name and a brief summary, not the full input object
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
    // Calculate statistics from batches
    const batchCount = result.output.batches.length;
    const changeCount = result.output.batches.reduce((sum, batch) => sum + batch.changes.length, 0);
    const impactTypes = {};
    const filesAffectedSet = new Set();
    // Process each batch
    for (const batch of result.output.batches) {
        for (const change of batch.changes) {
            impactTypes[change.impact] = (impactTypes[change.impact] || 0) + 1;
            filesAffectedSet.add(change.file);
        }
    }
    const filesAffected = filesAffectedSet.size;
    // Calculate final token usage
    const finalUsage = result.steps
        ? (0, limit_checks_1.trackTokenUsage)(result.steps)
        : { totalInputTokens: 0, totalOutputTokens: 0, currentTotalTokens: 0 };
    const finalTotalTokens = finalUsage.currentTotalTokens;
    logger.info({
        batchCount,
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
    }, `Analysis complete - found ${changeCount} breaking change${changeCount !== 1 ? "s" : ""} across ${filesAffected} file${filesAffected !== 1 ? "s" : ""} in ${batchCount} batch${batchCount !== 1 ? "es" : ""}`);
    // Log each batch with its changes
    if (batchCount > 0) {
        result.output.batches.forEach((batch) => {
            // Log batch info first
            logger.debug({
                batchId: batch.batchId,
                description: batch.description,
                changeCount: batch.changes.length,
            }, `Batch ${batch.batchId}: ${batch.description} (${batch.changes.length} change${batch.changes.length !== 1 ? "s" : ""})`);
            // Then log each change in this batch
            batch.changes.forEach((change) => {
                logger.debug({
                    batchId: batch.batchId,
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
                }, `Change ${change.id} - ${change.impact} in ${change.file} (batch ${batch.batchId})`);
            });
        });
    }
    return result.output;
}
//# sourceMappingURL=be-analyzer.js.map