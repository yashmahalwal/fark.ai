import { z } from "zod/v3";
import { backendChangesSchema } from "./be-analyzer-schema";
import { agentOptionsSchema } from "./common-schema";

// Shared frontend repo schema
// Note: branch is required (not optional) for AI SDK schema validation
// Defaults are handled in the orchestration layer before passing to the agent
export const frontendRepoSchema = z.object({
  owner: z.string().min(1).describe("Frontend repository owner"),
  repo: z.string().min(1).describe("Frontend repository name"),
  branch: z
    .string()
    .min(1)
    .default("main")
    .describe("Branch name (defaults to 'main')"),
});

// Input schema
export const frontendFinderInputSchema = z.object({
  repository: frontendRepoSchema,
  codebasePath: z
    .string()
    .min(1)
    .describe("Local filesystem path to frontend codebase (branch checked out)"),
  backendChanges: backendChangesSchema,
  options: agentOptionsSchema.optional(),
});

// Output schema - export item schema for reuse
export const frontendImpactItemSchema = z.object({
  backendChangeId: z
    .string()
    .describe(
      "ID of the backend change that caused this impact (references backendChange.id)"
    ),
  frontendRepo: z
    .string()
    .describe(
      "Frontend repository identifier in format 'owner/repo:branch' (e.g., 'yashmahalwal/fark-frontend-demo:main'). Branch defaults to 'main' if not specified."
    ),
  file: z.string().describe("File path in frontend repo where impact occurs"),
  apiElement: z
    .string()
    .describe(
      "The specific API element being used (e.g., 'User.email', '/api/users', 'OrderStatus.PENDING')"
    ),
  description: z
    .string()
    .describe(
      "High-level description of how this backend change impacts the frontend code - focus on what breaks and why, not technical details"
    ),
  severity: z
    .enum(["high", "medium", "low"])
    .describe(
      "Impact severity: high = breaking (crashes/failures), medium = may break, low = minor issue"
    ),
});

export const frontendImpactsSchema = z.object({
  frontendImpacts: z.array(frontendImpactItemSchema),
});

export type FrontendFinderInput = z.infer<typeof frontendFinderInputSchema>;
export type FrontendImpactsOutput = z.infer<typeof frontendImpactsSchema>;
