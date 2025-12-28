import {
  analyzeBackendDiff,
  backendChangesSchema,
  backendRepoSchema,
} from "../agents/be-analyzer";
import {
  findFrontendImpacts,
  frontendImpactItemSchema,
  frontendRepoSchema,
} from "../agents/frontend-finder";
import { generatePRComments } from "../agents/comment-generator";
import { getBackendTools, getFrontendTools } from "../tools/github-tools";
import { logger } from "../utils/logger";
import { z } from "zod/v3";

// Input schema for orchestration - reuses schemas from agents
const orchestrateInputSchema = z.object({
  backend: backendRepoSchema,
  frontendRepos: z.array(frontendRepoSchema),
  beGithubToken: z
    .string()
    .describe("GitHub token for backend repository access"),
  frontendGithubToken: z
    .string()
    .describe("GitHub token for frontend repository access"),
  mcpServerUrl: z.string().describe("GitHub MCP server URL"),
  openaiApiKey: z.string().describe("OpenAI API key"),
});

export type OrchestrateInput = z.infer<typeof orchestrateInputSchema>;

// Output type
export type OrchestrateOutput = {
  backendChanges: z.infer<typeof backendChangesSchema>;
  allFrontendImpacts: z.infer<typeof frontendImpactItemSchema>[];
  prComments: {
    comments: Array<{
      file: string;
      line: number;
      body: string;
    }>;
    summary: string;
  };
};

/**
 * Orchestrates the complete Fark.ai workflow:
 * 1. Analyzes backend PR for API breaking changes
 * 2. Finds frontend impacts for each frontend repo
 * 3. Generates PR comments with impacts and fixes
 */
export async function runFarkAnalysis(
  input: OrchestrateInput
): Promise<OrchestrateOutput> {
  logger.info("Starting Fark.ai analysis workflow");
  logger.debug("Input:", input);

  // Validate input
  const validatedInput = orchestrateInputSchema.parse(input);

  const {
    backend,
    frontendRepos,
    beGithubToken,
    frontendGithubToken,
    mcpServerUrl,
    openaiApiKey,
  } = validatedInput;

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
    openaiApiKey
  );
  logger.info(
    `Backend analysis complete: ${backendChangesResult.backendChanges.length} breaking changes detected`
  );
  logger.debug("Backend changes:", backendChangesResult);

  // Step 3: Early exit if no backend changes
  if (backendChangesResult.backendChanges.length === 0) {
    logger.info("No API breaking changes detected, exiting early");
    return {
      backendChanges: backendChangesResult,
      allFrontendImpacts: [],
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

  for (const frontendRepo of frontendRepos) {
    const repoId = `${frontendRepo.owner}/${frontendRepo.repo}`;
    logger.info(
      `Analyzing frontend repo: ${repoId} (branch: ${frontendRepo.branch})`
    );

    try {
      logger.debug(`Initializing frontend tools for ${repoId}`);
      const { tools: frontendTools } = await getFrontendTools(
        frontendGithubToken,
        mcpServerUrl
      );

      const frontendImpactsResult = await findFrontendImpacts(
        {
          frontendRepo,
          backendChanges: backendChangesResult,
        },
        frontendTools,
        openaiApiKey
      );

      logger.info(
        `Frontend analysis for ${repoId} complete: ${frontendImpactsResult.frontendImpacts.length} impacts found`
      );
      logger.debug(
        `Impacts for ${repoId}:`,
        frontendImpactsResult.frontendImpacts
      );

      // Add impacts from this repo to the combined array
      allFrontendImpacts.push(...frontendImpactsResult.frontendImpacts);
    } catch (error) {
      // Log error but continue with other repos
      logger.error(
        `Failed to analyze frontend repo ${repoId}:`,
        error instanceof Error ? error.message : error
      );
      // Continue to next repo
    }
  }

  logger.info(
    `Frontend analysis complete: ${allFrontendImpacts.length} total impacts across all repos`
  );

  // Step 5: Run Agent 3 - PR Comment Generator
  logger.info("Step 3: Generating PR comments");
  const prComments = await generatePRComments(
    {
      backendChanges: backendChangesResult.backendChanges,
      frontendImpacts: allFrontendImpacts,
      backend_owner: backend.owner,
      backend_repo: backend.repo,
      pull_number: backend.pull_number,
    },
    openaiApiKey
  );
  logger.info(
    `PR comment generation complete: ${prComments.comments.length} comments generated`
  );
  logger.debug("PR comments:", prComments);

  // Step 6: Return results
  logger.info("Fark.ai analysis workflow completed successfully");
  return {
    backendChanges: backendChangesResult,
    allFrontendImpacts,
    prComments,
  };
}
