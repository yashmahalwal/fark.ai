import { z } from "zod/v3";
import pLimit from "p-limit";
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

export async function runFarkAnalysis(
  input: OrchestrateInput
): Promise<OrchestrateOutput> {
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
    logLevel
  );

  // Step 2: Find frontend impacts for each frontend repository (processing by batches in parallel)
  const totalChangeCount = backendChangesResult.batches.reduce(
    (sum, batch) => sum + batch.changes.length,
    0
  );
  logger.info(
    {
      frontendCount: validatedInput.frontends.length,
      changeCount: totalChangeCount,
      batchCount: backendChangesResult.batches.length,
    },
    `Starting Step 2: Finding frontend impacts across ${validatedInput.frontends.length} frontend repository/repositories using ${backendChangesResult.batches.length} batches`
  );
  const allFrontendImpacts: z.infer<
    typeof backendChangeWithImpactsSchema
  >["frontendImpacts"] = [];

  // Create all tasks (frontend × batch combinations)
  const tasks: Array<{
    frontend: (typeof validatedInput.frontends)[number];
    batch: (typeof backendChangesResult.batches)[number];
  }> = [];

  for (const frontend of validatedInput.frontends) {
    for (const batch of backendChangesResult.batches) {
      if (batch.changes.length > 0) {
        tasks.push({ frontend, batch });
      } else {
        logger.warn(
          {
            batchId: batch.batchId,
            owner: frontend.repository.owner,
            repo: frontend.repository.repo,
          },
          `Batch ${batch.batchId} has no changes, skipping for ${frontend.repository.owner}/${frontend.repository.repo}`
        );
      }
    }
  }

  // Parallelize with concurrency limit to avoid memory issues
  // Limit concurrent operations: reasonable default is 5-10 depending on system resources
  // Each operation can use up to 500k tokens, so too many concurrent = memory pressure
  // Use input value, env var, or default to 5
  const concurrencyLimit =
    validatedInput.frontendFinderConcurrencyLimit ??
    (process.env.FRONTEND_FINDER_CONCURRENCY_LIMIT
      ? parseInt(process.env.FRONTEND_FINDER_CONCURRENCY_LIMIT, 10)
      : 5);
  const limit = pLimit(concurrencyLimit);

  logger.info(
    {
      totalTasks: tasks.length,
      concurrencyLimit,
    },
    `Processing ${tasks.length} frontend impact analysis tasks with concurrency limit of ${concurrencyLimit}`
  );

  // Execute all tasks in parallel with concurrency control
  const results = await Promise.allSettled(
    tasks.map(({ frontend, batch }) =>
      limit(async () => {
        logger.debug(
          {
            owner: frontend.repository.owner,
            repo: frontend.repository.repo,
            branch: frontend.repository.branch,
            batchId: batch.batchId,
            batchDescription: batch.description,
            changeCount: batch.changes.length,
          },
          `Processing batch ${batch.batchId} for frontend ${frontend.repository.owner}/${frontend.repository.repo}: ${batch.description}`
        );

        const frontendImpactsResult = await findFrontendImpacts(
          {
            repository: frontend.repository,
            codebasePath: frontend.codebasePath,
            backendBatch: batch,
            options: frontend.options,
          },
          validatedInput.openaiApiKey,
          logLevel
        );

        return {
          frontend,
          batch,
          impacts: frontendImpactsResult.frontendImpacts,
        };
      })
    )
  );

  // Collect successful results and log errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { frontend, batch } = tasks[i];

    if (result.status === "fulfilled") {
      allFrontendImpacts.push(...result.value.impacts);
      logger.debug(
        {
          owner: frontend.repository.owner,
          repo: frontend.repository.repo,
          batchId: batch.batchId,
          impactCount: result.value.impacts.length,
        },
        `Successfully processed batch ${batch.batchId} for ${frontend.repository.owner}/${frontend.repository.repo}`
      );
    } else {
      logger.error(
        {
          owner: frontend.repository.owner,
          repo: frontend.repository.repo,
          batchId: batch.batchId,
          batchDescription: batch.description,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        },
        `Failed to analyze batch ${batch.batchId} for frontend ${frontend.repository.owner}/${frontend.repository.repo} - continuing with other tasks`
      );
    }
  }

  // Step 3: Group frontend impacts by batch ID, then by change ID
  // Map structure: batchId -> changeId -> impacts[]
  const impactsByBatchAndChange = new Map<
    string,
    Map<string, z.infer<typeof backendChangeWithImpactsSchema>["frontendImpacts"]>
  >();

  for (const impact of allFrontendImpacts) {
    let batchMap = impactsByBatchAndChange.get(impact.backendBatchId);
    if (!batchMap) {
      batchMap = new Map();
      impactsByBatchAndChange.set(impact.backendBatchId, batchMap);
    }
    const existing = batchMap.get(impact.backendChangeId) || [];
    existing.push(impact);
    batchMap.set(impact.backendChangeId, existing);
  }

  // Step 4: Combine backend changes with their frontend impacts, grouped by batch
  const batchesWithImpacts = backendChangesResult.batches.map((batch) => {
    const batchMap = impactsByBatchAndChange.get(batch.batchId) || new Map();
    const changesWithImpacts = batch.changes.map((backendChange) => {
      const frontendImpacts = batchMap.get(backendChange.id) || [];
      return {
        ...backendChange,
        frontendImpacts,
      };
    });
    return {
      ...batch,
      changes: changesWithImpacts,
    };
  });

  // Flatten for comment generator (which expects changes array)
  const changesWithImpacts = batchesWithImpacts.flatMap(
    (batch) => batch.changes
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

  const prCommentsResult = await generatePRComments(
    {
      changes: changesWithImpacts,
      backend_owner: validatedInput.backend.repository.owner,
      backend_repo: validatedInput.backend.repository.repo,
      pull_number: validatedInput.backend.repository.pull_number,
      options: validatedInput.commentGeneratorOptions,
    },
    validatedInput.openaiApiKey,
    logLevel
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
      githubMcp: validatedInput.backend.githubMcp,
      options: validatedInput.prCommentPosterOptions,
    },
    validatedInput.openaiApiKey,
    logLevel
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
