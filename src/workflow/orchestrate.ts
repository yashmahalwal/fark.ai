import { z } from "zod/v3";
import {
  OrchestrateInput,
  orchestrateInputSchema,
  backendChangeWithImpactsSchema,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";
import { analyzeBackendDiff } from "../agents/be-analyzer";
import { findFrontendImpacts } from "../agents/frontend-finder";
import { generatePRComments } from "../agents/comment-generator";
import { postPRComments } from "../agents/pr-comment-poster";
import { createLogger, type LogLevel } from "../utils/create-logger";
import { getBackendTools } from "../tools/github-tools";

export async function runFarkAnalysis(input: OrchestrateInput): Promise<OrchestrateOutput> {
  let validatedInput: OrchestrateInput;
  try {
    validatedInput = orchestrateInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      const logger = createLogger("debug", "Orchestrate");
      logger.error(
        {
          validationErrors: error.issues,
          errorMessages,
        },
        "Input validation failed"
      );
    }
    throw error;
  }

  const logLevel = (validatedInput.logLevel || "info") as LogLevel;
  const logger = createLogger(logLevel, "Orchestrate");

  // Step 1: Analyze backend changes
  logger.info(
    {
      owner: validatedInput.backend.repository.owner,
      repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
    },
    `Starting Step 1: Analyzing backend changes for PR #${validatedInput.backend.repository.pull_number}`
  );
  const backendChangesResult = await analyzeBackendDiff(
    validatedInput.backend,
    validatedInput.openaiApiKey,
    logLevel,
  );

  // Step 2: Find frontend impacts for each frontend repository
  logger.info(
    {
      frontendCount: validatedInput.frontends.length,
      changeCount: backendChangesResult.backendChanges.length,
    },
    `Starting Step 2: Finding frontend impacts across ${validatedInput.frontends.length} frontend repository/repositories`
  );
  const allFrontendImpacts: z.infer<typeof backendChangeWithImpactsSchema>["frontendImpacts"] = [];

  for (const frontend of validatedInput.frontends) {
    try {
      logger.info(
        {
          owner: frontend.repository.owner,
          repo: frontend.repository.repo,
          branch: frontend.repository.branch,
        },
        `Analyzing frontend ${frontend.repository.owner}/${frontend.repository.repo}`
      );
      const frontendImpactsResult = await findFrontendImpacts(
        {
          repository: frontend.repository,
          codebasePath: frontend.codebasePath,
          backendChanges: backendChangesResult,
          options: frontend.options,
        },
        validatedInput.openaiApiKey,
        logLevel,
      );

      allFrontendImpacts.push(...frontendImpactsResult.frontendImpacts);
    } catch (error) {
      logger.error(
        {
          owner: frontend.repository.owner,
          repo: frontend.repository.repo,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to analyze frontend ${frontend.repository.owner}/${frontend.repository.repo}`
      );
      // Continue with other frontends even if one fails
    }
  }

  // Step 3: Group frontend impacts by backend change ID
  const impactsByBackendChangeId = new Map<
    string,
    z.infer<typeof backendChangeWithImpactsSchema>["frontendImpacts"]
  >();

  for (const impact of allFrontendImpacts) {
    const existing = impactsByBackendChangeId.get(impact.backendChangeId) || [];
    existing.push(impact);
    impactsByBackendChangeId.set(impact.backendChangeId, existing);
  }

  // Step 4: Combine backend changes with their frontend impacts
  const changesWithImpacts = backendChangesResult.backendChanges.map(
    (backendChange) => {
      const frontendImpacts =
        impactsByBackendChangeId.get(backendChange.id) || [];
      return {
        ...backendChange,
        frontendImpacts,
      };
    }
  );

  // Step 5: Generate PR comments
  logger.info(
    {
      owner: validatedInput.backend.repository.owner,
      repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
      changeCount: changesWithImpacts.length,
      totalImpacts: allFrontendImpacts.length,
    },
    `Starting Step 5: Generating PR comments for ${changesWithImpacts.length} backend changes with ${allFrontendImpacts.length} frontend impacts`
  );

  // Get GitHub tools for comment generator (optional but may be used)
  const { tools: githubTools } = await getBackendTools(
    validatedInput.backend.githubMcp.beGithubToken,
    validatedInput.backend.githubMcp.mcpServerUrl
  );

  const prCommentsResult = await generatePRComments(
    {
      changes: changesWithImpacts,
      backend_owner: validatedInput.backend.repository.owner,
      backend_repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
    },
    githubTools,
    validatedInput.openaiApiKey,
    logLevel,
    validatedInput.commentGeneratorOptions,
  );

  // Step 6: Post PR comments
  logger.info(
    {
      owner: validatedInput.backend.repository.owner,
      repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
      commentCount: prCommentsResult.comments.length,
    },
    `Starting Step 6: Posting ${prCommentsResult.comments.length} PR comments to PR #${validatedInput.backend.repository.pull_number}`
  );

  const prCommentPosterResult = await postPRComments(
    {
      comments: prCommentsResult,
      backend_owner: validatedInput.backend.repository.owner,
      backend_repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
    },
    githubTools,
    validatedInput.openaiApiKey,
    logLevel,
    validatedInput.prCommentPosterOptions,
  );

  logger.info(
    {
      success: prCommentPosterResult.success,
      reviewId: prCommentPosterResult.reviewId,
      message: prCommentPosterResult.message,
    },
    `PR comment posting ${prCommentPosterResult.success ? "completed successfully" : "failed"}`
  );

  // Return the combined result
  return {
    changes: changesWithImpacts,
    prComments: prCommentsResult,
  };
}