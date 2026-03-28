"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const github_mcp_defaults_1 = require("./constants/github-mcp-defaults");
const orchestrate_1 = require("./workflow/orchestrate");
const orchestrate_schema_1 = require("./schemas/orchestrate-schema");
function mergeAgentOptions(base, override) {
    if (!base)
        return override;
    if (!override)
        return base;
    return {
        maxSteps: override.maxSteps ?? base.maxSteps,
        maxOutputTokens: override.maxOutputTokens ?? base.maxOutputTokens,
        maxTotalTokens: override.maxTotalTokens ?? base.maxTotalTokens,
    };
}
async function run() {
    try {
        // Get required inputs
        const backendGithubToken = core.getInput("backend_github_token", {
            required: true,
        });
        const openaiApiKey = core.getInput("openai_api_key", { required: true });
        const githubMcpServerUrl = core.getInput("github_mcp_server_url").trim() ||
            github_mcp_defaults_1.DEFAULT_GITHUB_MCP_SERVER_URL;
        // Get backend configuration
        const backendOwner = core.getInput("backend_owner", { required: true });
        const backendRepo = core.getInput("backend_repo", { required: true });
        const backendPrNumberInput = core.getInput("backend_pr_number");
        const backendCodebasePath = core.getInput("backend_codebase_path") ||
            process.env.GITHUB_WORKSPACE ||
            ".";
        // Get PR number from input or context
        const context = github.context;
        let backendPrNumber;
        if (backendPrNumberInput) {
            backendPrNumber = parseInt(backendPrNumberInput, 10);
            if (isNaN(backendPrNumber)) {
                throw new Error(`Invalid backend_pr_number: ${backendPrNumberInput}. Must be a number.`);
            }
        }
        else if (context.payload.pull_request?.number) {
            backendPrNumber = context.payload.pull_request.number;
            core.info(`Using PR number from context: ${backendPrNumber}`);
        }
        else {
            throw new Error("backend_pr_number is required when not running in a pull_request event context");
        }
        // Parse frontends (YAML arrays are JSON-compatible, so we can use JSON.parse)
        // GitHub Actions will pass the YAML array as a JSON-compatible string
        const frontendsInput = core.getInput("frontends", { required: true });
        let frontends;
        try {
            frontends = JSON.parse(frontendsInput);
        }
        catch (error) {
            throw new Error(`Failed to parse frontends. Must be valid JSON array. Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Validate and parse frontends array
        const frontendsArray = Array.isArray(frontends) ? frontends : [frontends];
        const validatedFrontends = frontendsArray.map((frontend, index) => {
            try {
                // Validate each frontend config
                const validated = orchestrate_schema_1.frontendConfigSchema.parse(frontend);
                // Resolve codebasePath relative to workspace if not absolute
                const codebasePath = validated.codebasePath.startsWith("/")
                    ? validated.codebasePath
                    : `${process.env.GITHUB_WORKSPACE || "."}/${validated.codebasePath}`;
                return {
                    ...validated,
                    codebasePath,
                };
            }
            catch (error) {
                throw new Error(`Invalid frontend configuration at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Get log level
        const logLevel = core.getInput("log_level") || "info";
        // Build agent options from inputs (optional)
        const buildAgentOptions = (prefix) => {
            const maxSteps = core.getInput(`${prefix}_max_steps`);
            const maxOutputTokens = core.getInput(`${prefix}_max_output_tokens`);
            const maxTotalTokens = core.getInput(`${prefix}_max_total_tokens`);
            if (maxSteps || maxOutputTokens || maxTotalTokens) {
                return {
                    maxSteps: maxSteps ? parseInt(maxSteps, 10) : undefined,
                    maxOutputTokens: maxOutputTokens
                        ? parseInt(maxOutputTokens, 10)
                        : undefined,
                    maxTotalTokens: maxTotalTokens
                        ? parseInt(maxTotalTokens, 10)
                        : undefined,
                };
            }
            return undefined;
        };
        const backendOptions = buildAgentOptions("be_analyzer");
        const frontendFinderOptions = buildAgentOptions("frontend_finder");
        const commentGeneratorOptions = buildAgentOptions("comment_generator");
        const prCommentPosterOptions = buildAgentOptions("pr_comment_poster");
        // Resolve backend codebase path relative to workspace if not absolute
        const resolvedBackendCodebasePath = backendCodebasePath.startsWith("/")
            ? backendCodebasePath
            : `${process.env.GITHUB_WORKSPACE || "."}/${backendCodebasePath}`;
        // Get concurrency limit for frontend finder tasks (optional, defaults to 5 in schema)
        const concurrencyLimitInput = core.getInput("frontend_finder_concurrency_limit");
        const frontendFinderConcurrencyLimit = concurrencyLimitInput
            ? parseInt(concurrencyLimitInput, 10)
            : undefined;
        // Build orchestrate input
        const input = {
            backend: {
                repository: {
                    owner: backendOwner,
                    repo: backendRepo,
                    pull_number: backendPrNumber,
                },
                codebasePath: resolvedBackendCodebasePath,
                githubMcp: {
                    token: backendGithubToken,
                    mcpServerUrl: githubMcpServerUrl,
                },
                options: backendOptions,
            },
            frontends: validatedFrontends.map((frontend) => ({
                repository: frontend.repository,
                codebasePath: frontend.codebasePath,
                options: mergeAgentOptions(frontendFinderOptions, frontend.options),
            })),
            openaiApiKey,
            logLevel: logLevel,
            frontendFinderConcurrencyLimit,
            commentGeneratorOptions,
            prCommentPosterOptions,
        };
        core.info(`Running fark-ai analysis...`);
        core.info(`Backend: ${backendOwner}/${backendRepo} (PR #${backendPrNumber})`);
        core.info(`Frontends: ${validatedFrontends.length} repository/repositories`);
        // Run the analysis
        const result = await (0, orchestrate_1.runFarkAnalysis)(input);
        // Set outputs
        const changesCount = result.changes.length;
        const impactsCount = result.changes.reduce((sum, change) => sum + change.frontendImpacts.length, 0);
        const commentsCount = result.prComments.comments.length;
        core.setOutput("changes_count", changesCount.toString());
        core.setOutput("impacts_count", impactsCount.toString());
        core.setOutput("comments_count", commentsCount.toString());
        core.info(`Analysis complete!`);
        core.info(`- Backend changes: ${changesCount}`);
        core.info(`- Frontend impacts: ${impactsCount}`);
        core.info(`- PR comments: ${commentsCount}`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed("Unknown error occurred");
        }
        throw error;
    }
}
run();
//# sourceMappingURL=index.js.map