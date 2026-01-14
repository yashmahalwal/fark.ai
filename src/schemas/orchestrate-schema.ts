import { z } from "zod/v3";
import pino from "pino";
import { backendRepoSchema } from "./be-analyzer-schema";
import { frontendRepoSchema } from "./frontend-finder-schema";
import { backendChangeItemSchema } from "./be-analyzer-schema";
import { frontendImpactItemSchema } from "./frontend-finder-schema";

// Input schema for orchestration - reuses schemas from agents
export const orchestrateInputSchema = z.object({
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
  logLevel: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"] as [
      pino.Level,
      ...pino.Level[],
    ])
    .optional()
    .default("info")
    .describe("Log level (defaults to 'info')"),
  // BE Analyzer options
  beAnalyzerOptions: z
    .object({
      maxSteps: z.number().int().positive().optional(),
      maxOutputTokens: z.number().int().positive().optional(),
      maxTotalTokens: z.number().int().positive().optional(),
    })
    .optional()
    .describe("BE Analyzer configuration options"),
  // Frontend Finder options
  frontendFinderOptions: z
    .object({
      maxSteps: z.number().int().positive().optional(),
      maxOutputTokens: z.number().int().positive().optional(),
      maxTotalTokens: z.number().int().positive().optional(),
    })
    .optional()
    .describe("Frontend Finder configuration options"),
});

export type OrchestrateInput = z.infer<typeof orchestrateInputSchema>;

// Output type - backend changes with colocated frontend impacts
export const backendChangeWithImpactsSchema = backendChangeItemSchema.extend({
  frontendImpacts: z.array(frontendImpactItemSchema),
});

export type OrchestrateOutput = {
  changes: z.infer<typeof backendChangeWithImpactsSchema>[];
  prComments: {
    comments: Array<{
      file: string;
      line: number;
      body: string;
    }>;
    summary: string;
  };
};
