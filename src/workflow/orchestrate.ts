import pino from "pino";
import { z } from "zod/v3";
import {
  OrchestrateInput,
  orchestrateInputSchema,
  backendChangeWithImpactsSchema,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";
import { analyzeBackendDiff } from "../agents/be-analyzer";
import { findFrontendImpacts } from "../agents/frontend-finder";

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
      const logger = pino({
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      });
      logger.error(
        {
          validationErrors: error.issues,
          errorMessages,
        },
        "Orchestrate: Input validation failed"
      );
    }
    throw error;
  }

  const logger = pino({
    level: validatedInput.logLevel || "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });

  // Step 1: Analyze backend changes
  const backendChangesResult = await analyzeBackendDiff(
    validatedInput.backend,
    validatedInput.openaiApiKey,
    logger,
  );

  // Step 2: Find frontend impacts for each frontend repository
  const allFrontendImpacts: z.infer<typeof backendChangeWithImpactsSchema>["frontendImpacts"] = [];

  for (const frontend of validatedInput.frontends) {
    try {
      const frontendImpactsResult = await findFrontendImpacts(
        {
          repository: frontend.repository,
          codebasePath: frontend.codebasePath,
          backendChanges: backendChangesResult,
          options: frontend.options,
        },
        validatedInput.openaiApiKey,
        logger,
      );

      allFrontendImpacts.push(...frontendImpactsResult.frontendImpacts);
    } catch (error) {
      logger.error(
        {
          owner: frontend.repository.owner,
          repo: frontend.repository.repo,
          error: error instanceof Error ? error.message : String(error),
        },
        `Orchestrate: Failed to analyze frontend ${frontend.repository.owner}/${frontend.repository.repo}`
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

  // Return the combined result
  // Note: prComments will be generated in a future step (comment-generator)
  return {
    changes: changesWithImpacts,
    prComments: {
      summary: "",
      comments: [],
    },
  };
}