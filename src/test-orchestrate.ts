import "dotenv/config";
import { analyzeBackendDiff } from "./agents/be-analyzer";
import { getBackendTools } from "./tools/github-tools";
import pino from "pino";

async function main() {
  // Load environment variables
  const backendGithubToken = process.env.BACKEND_GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const logLevel =
    (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info";
  const mcpServerUrl = process.env.MCP_SERVER_URL;

  // Validate required environment variables
  if (!backendGithubToken) {
    throw new Error("BACKEND_GITHUB_TOKEN is required");
  }
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  if (!mcpServerUrl) {
    throw new Error("MCP_SERVER_URL is required");
  }

  // Validate backend input from environment
  const backendOwner = process.env.BACKEND_OWNER;
  const backendRepo = process.env.BACKEND_REPO;
  const backendPrNumber = process.env.BACKEND_PR_NUMBER;

  if (!backendOwner) {
    throw new Error("BACKEND_OWNER is required");
  }
  if (!backendRepo) {
    throw new Error("BACKEND_REPO is required");
  }
  if (!backendPrNumber) {
    throw new Error("BACKEND_PR_NUMBER is required");
  }

  const pullNumber = parseInt(backendPrNumber, 10);
  if (isNaN(pullNumber) || pullNumber <= 0) {
    throw new Error("BACKEND_PR_NUMBER must be a positive integer");
  }

  // Create logger
  const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
  const useJson = process.env.LOG_FORMAT === "json" || isGitHubActions;

  const logger = pino({
    level: logLevel,
    ...(useJson
      ? {
          formatters: {
            level: (label) => {
              return { level: label };
            },
          },
        }
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        }),
  });

  const backend = {
    owner: backendOwner,
    repo: backendRepo,
    pull_number: pullNumber,
  };

  logger.info(
    {
      backend: `${backend.owner}/${backend.repo}`,
      pull_number: backend.pull_number,
      logLevel,
    },
    "Starting BE analyzer test"
  );

  try {
    // Initialize backend tools
    logger.debug("Initializing backend GitHub tools");
    const { tools: backendTools } = await getBackendTools(
      backendGithubToken,
      mcpServerUrl
    );
    logger.debug(
      `Backend tools initialized: ${Object.keys(backendTools).length} tools available`
    );

    // Read BE Analyzer configuration from environment variables
    // Only allow these read-only tools: get_file_contents, search_code, pull_request_read
    const beAnalyzerOptions = {
      ...(process.env.BE_ANALYZER_MAX_STEPS && {
        maxSteps: parseInt(process.env.BE_ANALYZER_MAX_STEPS, 10),
      }),
      ...(process.env.BE_ANALYZER_MAX_OUTPUT_TOKENS && {
        maxOutputTokens: parseInt(
          process.env.BE_ANALYZER_MAX_OUTPUT_TOKENS,
          10
        ),
      }),
      ...(process.env.BE_ANALYZER_MAX_TOTAL_TOKENS && {
        maxTotalTokens: parseInt(process.env.BE_ANALYZER_MAX_TOTAL_TOKENS, 10),
      }),
    };

    // Run BE Analyzer only
    logger.info("Running BE Diff Analyzer");
    const backendChangesResult = await analyzeBackendDiff(
      { backend },
      backendTools,
      openaiApiKey,
      logger,
      beAnalyzerOptions
    );

    logger.info(
      {
        count: backendChangesResult.backendChanges.length,
      },
      `BE Analyzer complete: ${backendChangesResult.backendChanges.length} breaking changes detected`
    );

    if (backendChangesResult.backendChanges.length > 0) {
      logger.info("Backend changes detected:");
      backendChangesResult.backendChanges.forEach((change, index) => {
        logger.info(
          {
            index: index + 1,
            impact: change.impact,
            description: change.description,
            file: change.file,
          },
          `Change ${index + 1}: ${change.impact}`
        );
      });
    } else {
      logger.info("No API breaking changes detected");
    }

    // Commented out - frontend analysis and PR comment generation
    // const frontendGithubToken = process.env.FRONTEND_GITHUB_TOKEN;
    // if (!frontendGithubToken) {
    //   throw new Error("FRONTEND_GITHUB_TOKEN is required");
    // }
    //
    // // Parse frontend repos - support multiple formats
    // let frontendRepos: Array<{ owner: string; repo: string; branch: string }> =
    //   [];
    //
    // if (process.env.FRONTEND_REPOS) {
    //   try {
    //     frontendRepos = JSON.parse(process.env.FRONTEND_REPOS);
    //   } catch (e) {
    //     logger.error(
    //       "Failed to parse FRONTEND_REPOS as JSON, falling back to single repo format"
    //     );
    //   }
    // }
    //
    // if (frontendRepos.length === 0) {
    //   const owner = process.env.FRONTEND_OWNER || "your-org";
    //   const repo = process.env.FRONTEND_REPO || "fark-frontend-demo";
    //   const branch = process.env.FRONTEND_BRANCH || "main";
    //
    //   if (owner !== "your-org" || repo !== "fark-frontend-demo") {
    //     frontendRepos = [{ owner, repo, branch }];
    //   }
    // }
    //
    // if (frontendRepos.length === 0) {
    //   frontendRepos = [
    //     {
    //       owner: "your-org",
    //       repo: "fark-frontend-demo",
    //       branch: "main",
    //     },
    //   ];
    // }
    //
    // const result = await runFarkAnalysis({
    //   backend,
    //   frontendRepos,
    //   beGithubToken: backendGithubToken,
    //   frontendGithubToken: frontendGithubToken,
    //   mcpServerUrl,
    //   openaiApiKey,
    //   logLevel,
    // });

    logger.info("✅ BE Analyzer test completed successfully!");
  } catch (error) {
    logger.error({ err: error }, "❌ BE Analyzer test failed");
    if (error instanceof Error) {
      logger.error(
        { message: error.message, stack: error.stack },
        "Error details"
      );
    }
    process.exit(1);
  }
}

main();
