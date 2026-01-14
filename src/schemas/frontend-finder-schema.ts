import { z } from "zod/v3";
import { backendChangesSchema } from "./be-analyzer-schema";

// Shared frontend repo schema
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
  frontendRepo: frontendRepoSchema,
  backendChanges: backendChangesSchema,
});

// Output schema - export item schema for reuse
export const frontendImpactItemSchema = z.object({
  backendChangeId: z
    .string()
    .describe(
      "ID of the backend change that caused this impact (references backendChange.id)"
    ),
  file: z.string().describe("File path in frontend repo where impact occurs"),
  codeHunk: z
    .object({
      startLine: z
        .number()
        .describe("Starting line number of the code section"),
      endLine: z.number().describe("Ending line number of the code section"),
      code: z
        .string()
        .describe(
          "The actual code snippet related to the impact (lines from startLine to endLine)"
        ),
    })
    .describe("Code section where the impact occurs"),
  apiElement: z
    .string()
    .describe(
      "The specific API element being used (e.g., 'User.email', '/api/users', 'OrderStatus.PENDING')"
    ),
  description: z
    .string()
    .describe(
      "Description of how this backend change impacts the frontend code at this location"
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
