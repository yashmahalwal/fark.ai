import * as core from "@actions/core";
import * as github from "@actions/github";
import { runFarkAnalysis } from "./workflow/orchestrate";
import type { OrchestrateInput } from "./schemas/orchestrate-schema";
import { frontendConfigSchema } from "./schemas/orchestrate-schema";

async function run(): Promise<void> {
  try {
    // Get required inputs
    const backendGithubToken = core.getInput("backend_github_token", {
      required: true,
    });
    const openaiApiKey = core.getInput("openai_api_key", { required: true });
    const githubMcpServerUrl =
      core.getInput("github_mcp_server_url") ||
      "https://api.githubcopilot.com/mcp/";

    // Get backend configuration
    const backendOwner = core.getInput("backend_owner", { required: true });
    const backendRepo = core.getInput("backend_repo", { required: true });
    const backendPrNumberInput = core.getInput("backend_pr_number");
    const backendCodebasePath =
      core.getInput("backend_codebase_path") ||
      process.env.GITHUB_WORKSPACE ||
      ".";

    // Get PR number from input or context
    const context = github.context;
    let backendPrNumber: number;
    if (backendPrNumberInput) {
      backendPrNumber = parseInt(backendPrNumberInput, 10);
      if (isNaN(backendPrNumber)) {
        throw new Error(
          `Invalid backend_pr_number: ${backendPrNumberInput}. Must be a number.`
        );
      }
    } else if (context.payload.pull_request?.number) {
      backendPrNumber = context.payload.pull_request.number;
      core.info(
        `Using PR number from context: ${backendPrNumber}`
      );
    } else {
      throw new Error(
        "backend_pr_number is required when not running in a pull_request event context"
      );
    }

    // Parse frontends (YAML arrays are JSON-compatible, so we can use JSON.parse)
    // GitHub Actions will pass the YAML array as a JSON-compatible string
    const frontendsInput = core.getInput("frontends", { required: true });
    let frontends: unknown;
    try {
      frontends = JSON.parse(frontendsInput);
    } catch (error) {
      throw new Error(
        `Failed to parse frontends. Must be valid JSON array. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Validate and parse frontends array
    const frontendsArray = Array.isArray(frontends) ? frontends : [frontends];
    const validatedFrontends = frontendsArray.map((frontend, index) => {
      try {
        // Validate each frontend config
        const validated = frontendConfigSchema.parse(frontend);
        // Resolve codebasePath relative to workspace if not absolute
        const codebasePath = validated.codebasePath.startsWith("/")
          ? validated.codebasePath
          : `${process.env.GITHUB_WORKSPACE || "."}/${validated.codebasePath}`;
        return {
          ...validated,
          codebasePath,
        };
      } catch (error) {
        throw new Error(
          `Invalid frontend configuration at index ${index}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Get log level
    const logLevel = core.getInput("log_level") || "info";

    // Build agent options from inputs (optional)
    const buildAgentOptions = (
      prefix: string
    ): OrchestrateInput["backend"]["options"] | undefined => {
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
    const input: OrchestrateInput = {
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
        options: frontend.options,
      })),
      openaiApiKey,
      logLevel: logLevel as OrchestrateInput["logLevel"],
      frontendFinderConcurrencyLimit,
      commentGeneratorOptions,
      prCommentPosterOptions,
    };

    core.info(`Running fark-ai analysis...`);
    core.info(`Backend: ${backendOwner}/${backendRepo} (PR #${backendPrNumber})`);
    core.info(`Frontends: ${validatedFrontends.length} repository/repositories`);

    // Run the analysis
    const result = await runFarkAnalysis(input);

    // Set outputs
    const changesCount = result.changes.length;
    const impactsCount = result.changes.reduce(
      (sum, change) => sum + change.frontendImpacts.length,
      0
    );
    const commentsCount = result.prComments.comments.length;

    core.setOutput("changes_count", changesCount.toString());
    core.setOutput("impacts_count", impactsCount.toString());
    core.setOutput("comments_count", commentsCount.toString());

    core.info(`Analysis complete!`);
    core.info(`- Backend changes: ${changesCount}`);
    core.info(`- Frontend impacts: ${impactsCount}`);
    core.info(`- PR comments: ${commentsCount}`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error occurred");
    }
    throw error;
  }
}

run();
