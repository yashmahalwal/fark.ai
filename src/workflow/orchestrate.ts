import pino from "pino";
import { z } from "zod/v3";
import {
  OrchestrateInput,
  orchestrateInputSchema,
} from "../schemas/orchestrate-schema";
import { analyzeBackendDiff } from "../agents/be-analyzer";

export async function runFarkAnalysis(input: OrchestrateInput) {
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

  const backendChangesResult = await analyzeBackendDiff(
    validatedInput.backend,
    logger,
  );

  return backendChangesResult;
}