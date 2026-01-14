import { z } from "zod/v3";

// Shared backend repository schema
export const backendRepoSchema = z.object({
  owner: z.string().min(1).describe("Repository owner"),
  repo: z.string().min(1).describe("Repository name"),
  pull_number: z.number().int().positive().describe("Pull request number"),
});

// Input schema
export const backendInputSchema = z.object({
  backend: backendRepoSchema,
});

// Shared backend change item schema
// Note: OpenAI Responses API requires all properties to be in 'required' array
// So we use nullable() instead of optional() for optional fields
export const backendChangeItemSchema = z.object({
  id: z
    .string()
    .describe(
      "Unique identifier for this backend change (use index as string, e.g., '0', '1', '2')"
    ),
  file: z.string().describe("File path where the change occurred"),
  diffHunks: z.array(
    z.object({
      startLine: z.number().describe("Starting line number in the diff"),
      endLine: z.number().describe("Ending line number in the diff"),
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

// Output schema
export const backendChangesSchema = z.object({
  backendChanges: z.array(backendChangeItemSchema),
});

export type BackendInput = z.infer<typeof backendInputSchema>;
export type BackendChangesOutput = z.infer<typeof backendChangesSchema>;
