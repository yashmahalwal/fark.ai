import { z } from "zod/v3";
import { agentOptionsSchema, githubMcpSchema } from "./common-schema";

// Shared backend repository schema
export const backendRepoSchema = z.object({
  owner: z.string().min(1).describe("Repository owner"),
  repo: z.string().min(1).describe("Repository name"),
  pull_number: z.number().int().positive().describe("Pull request number"),
});

// Input schema
export const backendInputSchema = z.object({
  repository: backendRepoSchema,
  codebasePath: z
    .string()
    .min(1)
    .describe(
      "Local filesystem path to backend codebase (PR branch checked out)"
    ),
  githubMcp: githubMcpSchema,
  options: agentOptionsSchema.optional(),
});

// Shared backend change item schema
// Note: OpenAI Responses API requires all properties to be in 'required' array
// So we use nullable() instead of optional() for optional fields
export const backendChangeItemSchema = z.object({
  id: z
    .string()
    .describe(
      "Unique identifier for this backend change - must be globally unique across ALL batches (use sequential IDs like '0', '1', '2', '3'...)"
    ),
  file: z.string().describe("File path where the change occurred"),
  diffHunks: z.array(
    z.object({
      startLine: z.number().describe("Starting line number in the diff"),
      endLine: z.number().describe("Ending line number in the diff"),
      startSide: z
        .enum(["LEFT", "RIGHT"])
        .describe(
          "Side of diff for startLine: LEFT=old file (removed lines), RIGHT=new file (added lines)"
        ),
      endSide: z
        .enum(["LEFT", "RIGHT"])
        .describe(
          "Side of diff for endLine: LEFT=old file (removed lines), RIGHT=new file (added lines)"
        ),
      changes: z.array(z.string()).describe("Array of diff lines"),
    })
  ),
  impact: z
    .enum([
      "fieldRenamed",
      "fieldRemoved",
      "fieldAdded",
      "endpointChanged",
      "parameterAdded",
      "parameterRemoved",
      "typeChanged",
      "statusCodeChanged",
      "enumValueAdded",
      "enumValueRemoved",
      "nullableToRequired",
      "requiredToNullable",
      "arrayStructureChanged",
      "objectStructureChanged",
      "defaultValueChanged",
      "unionTypeExtended",
      "other",
    ])
    .describe("Type of API breaking change"),
  description: z.string().describe("Human-readable description of the change"),
});

// Batch schema - groups of similar changes for efficient frontend analysis
export const backendChangeBatchSchema = z.object({
  batchId: z
    .string()
    .describe(
      "Unique identifier for this batch (e.g., '0', '1', '2') - used for tracking"
    ),
  description: z
    .string()
    .describe(
      "Brief description of what this batch contains (e.g., 'GraphQL schema changes', 'REST endpoint changes')"
    ),
  changes: z
    .array(backendChangeItemSchema)
    .describe(
      "Array of backend changes belonging to this batch. Each change.id must be unique across all batches."
    ),
});

// Output schema
export const backendChangesSchema = z.object({
  batches: z
    .array(backendChangeBatchSchema)
    .describe(
      "Batches of similar changes for efficient frontend analysis. Group related changes together (e.g., all GraphQL changes, all REST changes). Aim for 5-10 batches maximum. All changes must be included in exactly one batch."
    ),
});

export type BackendInput = z.infer<typeof backendInputSchema>;
export type BackendChangesOutput = z.infer<typeof backendChangesSchema>;
