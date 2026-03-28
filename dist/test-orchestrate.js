"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Test/Development Script for Local Development
 *
 * This script is a thin wrapper around orchestrate.ts that reads configuration
 * from environment variables for local testing and development.
 *
 * It calls runFarkAnalysis from orchestrate.ts, which contains the full
 * production workflow logic.
 */
require("dotenv/config");
const github_mcp_defaults_1 = require("./constants/github-mcp-defaults");
const orchestrate_1 = require("./workflow/orchestrate");
const frontend_finder_schema_1 = require("./schemas/frontend-finder-schema");
const v3_1 = require("zod/v3");
const log_zod_error_1 = require("./utils/log-zod-error");
const create_logger_1 = require("./utils/create-logger");
// Schema for frontend config from env (without openaiApiKey)
const frontendConfigFromEnvSchema = v3_1.z.object({
    repository: frontend_finder_schema_1.frontendRepoSchema,
    codebasePath: v3_1.z.string().min(1),
    options: v3_1.z
        .object({
        maxSteps: v3_1.z.number().int().positive().optional(),
        maxOutputTokens: v3_1.z.number().int().positive().optional(),
        maxTotalTokens: v3_1.z.number().int().positive().optional(),
    })
        .optional(),
});
const envSchema = v3_1.z.object({
    BACKEND_GITHUB_TOKEN: v3_1.z.string().min(1),
    GITHUB_MCP_SERVER_URL: v3_1.z.preprocess((val) => typeof val === "string" && val.trim() !== ""
        ? val.trim()
        : github_mcp_defaults_1.DEFAULT_GITHUB_MCP_SERVER_URL, v3_1.z.string().url()),
    BACKEND_OWNER: v3_1.z.string().min(1),
    BACKEND_REPO: v3_1.z.string().min(1),
    BACKEND_CODEBASE_PATH: v3_1.z.string().min(1),
    BACKEND_PR_NUMBER: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive()),
    OPENAI_API_KEY: v3_1.z.string().min(1), // Used for both backend analyzer and frontend finders
    FRONTENDS: v3_1.z.string().transform((val) => {
        try {
            const parsed = JSON.parse(val);
            return v3_1.z.array(frontendConfigFromEnvSchema).parse(parsed);
        }
        catch (error) {
            throw new Error(`Failed to parse FRONTENDS JSON: ${error instanceof Error ? error.message : String(error)}. Ensure FRONTENDS is valid single-line JSON.`);
        }
    }),
    LOG_LEVEL: v3_1.z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .optional(),
    // BE Analyzer limits
    BE_ANALYZER_MAX_STEPS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    BE_ANALYZER_MAX_OUTPUT_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    BE_ANALYZER_MAX_TOTAL_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    // Frontend Finder limits (applied to all frontends)
    FRONTEND_FINDER_MAX_STEPS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    FRONTEND_FINDER_MAX_OUTPUT_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    FRONTEND_FINDER_MAX_TOTAL_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    // Comment Generator limits
    COMMENT_GENERATOR_MAX_STEPS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    COMMENT_GENERATOR_MAX_OUTPUT_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    COMMENT_GENERATOR_MAX_TOTAL_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    // PR Comment Poster limits
    PR_COMMENT_POSTER_MAX_STEPS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    PR_COMMENT_POSTER_MAX_OUTPUT_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
    PR_COMMENT_POSTER_MAX_TOTAL_TOKENS: v3_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(v3_1.z.number().int().positive())
        .optional(),
});
async function main() {
    const logger = (0, create_logger_1.createLogger)("info", "Test Orchestrate");
    try {
        const env = envSchema.parse(process.env);
        // Build backend options from env
        const backendOptions = env.BE_ANALYZER_MAX_STEPS ||
            env.BE_ANALYZER_MAX_OUTPUT_TOKENS ||
            env.BE_ANALYZER_MAX_TOTAL_TOKENS
            ? {
                maxSteps: env.BE_ANALYZER_MAX_STEPS,
                maxOutputTokens: env.BE_ANALYZER_MAX_OUTPUT_TOKENS,
                maxTotalTokens: env.BE_ANALYZER_MAX_TOTAL_TOKENS,
            }
            : undefined;
        // Build frontend options from env (apply to all frontends)
        const frontendOptions = env.FRONTEND_FINDER_MAX_STEPS ||
            env.FRONTEND_FINDER_MAX_OUTPUT_TOKENS ||
            env.FRONTEND_FINDER_MAX_TOTAL_TOKENS
            ? {
                maxSteps: env.FRONTEND_FINDER_MAX_STEPS,
                maxOutputTokens: env.FRONTEND_FINDER_MAX_OUTPUT_TOKENS,
                maxTotalTokens: env.FRONTEND_FINDER_MAX_TOTAL_TOKENS,
            }
            : undefined;
        // Apply frontend options to all frontends if provided
        const frontendsWithOptions = frontendOptions
            ? env.FRONTENDS.map((frontend) => ({
                ...frontend,
                options: frontend.options || frontendOptions,
            }))
            : env.FRONTENDS;
        // Build comment generator options from env
        const commentGeneratorOptions = env.COMMENT_GENERATOR_MAX_STEPS ||
            env.COMMENT_GENERATOR_MAX_OUTPUT_TOKENS ||
            env.COMMENT_GENERATOR_MAX_TOTAL_TOKENS
            ? {
                maxSteps: env.COMMENT_GENERATOR_MAX_STEPS,
                maxOutputTokens: env.COMMENT_GENERATOR_MAX_OUTPUT_TOKENS,
                maxTotalTokens: env.COMMENT_GENERATOR_MAX_TOTAL_TOKENS,
            }
            : undefined;
        // Build PR comment poster options from env
        const prCommentPosterOptions = env.PR_COMMENT_POSTER_MAX_STEPS ||
            env.PR_COMMENT_POSTER_MAX_OUTPUT_TOKENS ||
            env.PR_COMMENT_POSTER_MAX_TOTAL_TOKENS
            ? {
                maxSteps: env.PR_COMMENT_POSTER_MAX_STEPS,
                maxOutputTokens: env.PR_COMMENT_POSTER_MAX_OUTPUT_TOKENS,
                maxTotalTokens: env.PR_COMMENT_POSTER_MAX_TOTAL_TOKENS,
            }
            : undefined;
        await (0, orchestrate_1.runFarkAnalysis)({
            backend: {
                repository: {
                    owner: env.BACKEND_OWNER,
                    repo: env.BACKEND_REPO,
                    pull_number: env.BACKEND_PR_NUMBER,
                },
                codebasePath: env.BACKEND_CODEBASE_PATH,
                githubMcp: {
                    token: env.BACKEND_GITHUB_TOKEN,
                    mcpServerUrl: env.GITHUB_MCP_SERVER_URL,
                },
                options: backendOptions,
            },
            frontends: frontendsWithOptions,
            openaiApiKey: env.OPENAI_API_KEY,
            logLevel: env.LOG_LEVEL || "info",
            commentGeneratorOptions,
            prCommentPosterOptions,
        });
    }
    catch (error) {
        if (error instanceof v3_1.z.ZodError) {
            (0, log_zod_error_1.logZodError)(error, logger);
        }
        else if (error instanceof Error) {
            logger.error({ message: error.message, stack: error.stack }, "Error details");
        }
        else {
            logger.error({ err: error }, "❌ Analysis failed");
        }
    }
}
main();
//# sourceMappingURL=test-orchestrate.js.map