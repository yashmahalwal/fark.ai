import { z } from "zod/v3";
import pino from "pino";
import { backendInputSchema } from "./be-analyzer-schema";
import { frontendFinderInputSchema } from "./frontend-finder-schema";
import { backendChangeItemSchema } from "./be-analyzer-schema";
import { frontendImpactItemSchema } from "./frontend-finder-schema";
import { prCommentsSchema } from "./comment-generator-schema";
import { agentOptionsSchema } from "./common-schema";

// Frontend configuration schema - reuses frontendFinderInputSchema, excluding backendChanges and openaiApiKey
export const frontendConfigSchema = frontendFinderInputSchema.pick({
  repository: true,
  codebasePath: true,
  options: true,
});

// Input schema for orchestration - reuses schemas from agents
export const orchestrateInputSchema = z.object({
  backend: backendInputSchema,
  frontends: z.array(frontendConfigSchema).min(1),
  openaiApiKey: z.string().min(1).describe("OpenAI API key for all agents"),
  logLevel: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"] as [
      pino.Level,
      ...pino.Level[],
    ])
    .optional()
    .default("info")
    .describe("Log level (defaults to 'info')"),
  commentGeneratorOptions: agentOptionsSchema.optional(),
  prCommentPosterOptions: agentOptionsSchema.optional(),
});

export type OrchestrateInput = z.infer<typeof orchestrateInputSchema>;

// Output type - backend changes with colocated frontend impacts
export const backendChangeWithImpactsSchema = backendChangeItemSchema.extend({
  frontendImpacts: z.array(frontendImpactItemSchema),
});

export type OrchestrateOutput = {
  changes: z.infer<typeof backendChangeWithImpactsSchema>[];
  prComments: z.infer<typeof prCommentsSchema>;
};
