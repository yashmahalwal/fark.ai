import { analyzeBackendDiff } from "../agents/be-analyzer";
import { generatePRComments } from "../agents/comment-generator";
import { findFrontendImpacts } from "../agents/frontend-finder";
import { getBackendTools, getFrontendTools } from "../tools/github-tools";
import pino from "pino";
import { z } from "zod/v3";
import {
  orchestrateInputSchema,
  backendChangeWithImpactsSchema,
  type OrchestrateInput,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";
import { frontendImpactItemSchema } from "../schemas/frontend-finder-schema";

// Re-export for backward compatibility
export {
  backendChangeWithImpactsSchema,
  type OrchestrateInput,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";

/**
 * Orchestrates the complete Fark.ai workflow:
 * 1. Analyzes backend PR for API breaking changes
 * 2. Finds frontend impacts for each frontend repo
 * 3. Generates PR comments with impacts and fixes
 */
export async function runFarkAnalysis(
  input: OrchestrateInput
): Promise<OrchestrateOutput> {
  // Validate input
  const validatedInput = orchestrateInputSchema.parse(input);

  const {
    backend,
    frontendRepos,
    beGithubToken,
    frontendGithubToken,
    mcpServerUrl,
    openaiApiKey,
    logLevel,
    beAnalyzerOptions,
    frontendFinderOptions,
  } = validatedInput;

  const logger = pino({
    level: logLevel,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });

  logger.info(
    {
      backend: `${backend.owner}/${backend.repo}`,
      pull_number: backend.pull_number,
      frontendReposCount: frontendRepos.length,
      logLevel,
    },
    "Starting Fark.ai analysis workflow"
  );

  logger.info(
    `Analyzing backend PR #${backend.pull_number} in ${backend.owner}/${backend.repo}`
  );
  logger.debug(`Frontend repos to analyze: ${frontendRepos.length}`);

  // Step 1: Initialize backend tools
  logger.debug("Initializing backend GitHub tools");
  const { tools: backendTools } = await getBackendTools(
    beGithubToken,
    mcpServerUrl
  );
  logger.debug(
    `Backend tools initialized: ${Object.keys(backendTools).length} tools available`
  );

  // Step 2: Run Agent 1 - BE Diff Analyzer
  logger.info("Step 1: Analyzing backend diff for API breaking changes");
  const backendChangesResult = await analyzeBackendDiff(
    { backend },
    backendTools,
    openaiApiKey,
    logger,
    beAnalyzerOptions
  );
  logger.info(
    `Backend analysis complete: ${backendChangesResult.backendChanges.length} breaking changes detected`
  );

  // Step 3: Early exit if no backend changes
  if (backendChangesResult.backendChanges.length === 0) {
    logger.info("No API breaking changes detected, exiting early");
    return {
      changes: [],
      prComments: {
        comments: [],
        summary: "No API breaking changes detected in this PR.",
      },
    };
  }

  // Step 4: Run Agent 2 - Frontend Impact Finder for each frontend repo
  logger.info(
    `Step 2: Analyzing ${frontendRepos.length} frontend repository/repositories for impacts`
  );

  const allFrontendImpacts: z.infer<typeof frontendImpactItemSchema>[] = [];

  logger.debug(`Initializing frontend github tools `);
  const { tools: frontendTools } = await getFrontendTools(
    frontendGithubToken,
    mcpServerUrl
  );

  for (const frontendRepo of frontendRepos) {
    const repoId = `${frontendRepo.owner}/${frontendRepo.repo}`;

    try {
      logger.info(
        {
          owner: frontendRepo.owner,
          repo: frontendRepo.repo,
          branch: frontendRepo.branch,
        },
        `Analyzing frontend repo: ${frontendRepo.owner}/${frontendRepo.repo} (branch: ${frontendRepo.branch})`
      );

      const frontendImpactsResult = await findFrontendImpacts(
        {
          frontendRepo,
          backendChanges: backendChangesResult,
        },
        frontendTools,
        openaiApiKey,
        logger,
        frontendFinderOptions
      );

      logger.info(
        { repoId, impactCount: frontendImpactsResult.frontendImpacts.length },
        `Frontend analysis for ${repoId} complete: ${frontendImpactsResult.frontendImpacts.length} impacts found`
      );

      allFrontendImpacts.push(...frontendImpactsResult.frontendImpacts);
    } catch (error) {
      logger.error(
        {
          repoId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to analyze frontend repo ${repoId}:`
      );
    }
  }

  logger.info(
    { totalImpacts: allFrontendImpacts.length },
    `Frontend analysis complete: ${allFrontendImpacts.length} total impacts across all repos`
  );

  // Step 5: Group frontend impacts by backend change ID (optimized)
  // Create a Map for O(1) lookups instead of O(n) filter for each backend change
  const impactsByBackendChangeId = new Map<
    string,
    z.infer<typeof frontendImpactItemSchema>[]
  >();

  // Initialize map with empty arrays for all backend changes
  backendChangesResult.backendChanges.forEach((backendChange) => {
    impactsByBackendChangeId.set(backendChange.id, []);
  });

  // Group impacts by backend change ID in a single pass
  allFrontendImpacts.forEach((impact) => {
    const impacts = impactsByBackendChangeId.get(impact.backendChangeId);
    if (impacts) {
      impacts.push(impact);
    } else {
      logger.warn(
        {
          impact,
          backendChangeIds: backendChangesResult.backendChanges.map(
            (c) => c.id
          ),
        },
        `Frontend impact ${impact.apiElement} references unknown backend change ID: ${impact.backendChangeId}`
      );
    }
  });

  // Map backend changes with their grouped impacts
  const changesWithImpacts = backendChangesResult.backendChanges.map(
    (backendChange) => ({
      ...backendChange,
      frontendImpacts: impactsByBackendChangeId.get(backendChange.id) || [],
    })
  );

  // Step 6: Run Agent 3 - PR Comment Generator (posts comments directly)
  logger.info("Step 3: Generating and posting PR comments");
  const prComments = await generatePRComments(
    {
      changes: changesWithImpacts,
      backend_owner: backend.owner,
      backend_repo: backend.repo,
      pull_number: backend.pull_number,
    },
    backendTools,
    openaiApiKey,
    logger
  );

  logger.info("Fark.ai analysis workflow completed successfully");
  return {
    changes: changesWithImpacts,
    prComments,
  };
}
