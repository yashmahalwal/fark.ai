import { z } from "zod/v3";
import { backendChangeWithImpactsSchema } from "./orchestrate-schema";

// Input schema - accepts combined changes structure
export const commentGeneratorInputSchema = z.object({
  changes: z.array(backendChangeWithImpactsSchema),
  backend_owner: z.string().describe("Backend repository owner"),
  backend_repo: z.string().describe("Backend repository name"),
  pull_number: z.number().describe("Pull request number"),
});

// Output schema
export const prCommentsSchema = z.object({
  comments: z.array(
    z.object({
      file: z.string().describe("File path in the backend PR"),
      line: z
        .number()
        .describe("Line number in the diff (from backendChanges.diffHunks)"),
      body: z
        .string()
        .describe(
          "Comment text explaining the breaking change, impacted frontend files, and suggested fix"
        ),
    })
  ),
  summary: z.string().describe("Summary of breaking changes detected"),
});

export type CommentGeneratorInput = z.infer<typeof commentGeneratorInputSchema>;
export type PRCommentsOutput = z.infer<typeof prCommentsSchema>;
