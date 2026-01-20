import { z } from "zod/v3";
import { backendChangeWithImpactsSchema } from "./orchestrate-schema";

// Input schema - accepts combined changes structure
export const commentGeneratorInputSchema = z.object({
  changes: z.array(backendChangeWithImpactsSchema),
  backend_owner: z.string().describe("Backend repository owner"),
  backend_repo: z.string().describe("Backend repository name"),
  pull_number: z.number().describe("Pull request number"),
});

// Output schema - comment data for octokit
// All fields are required - use default values (0 for numbers, empty string for enums) when not applicable
export const prCommentsSchema = z.object({
  summary: z
    .string()
    .describe("Summary of breaking changes detected (for review body)"),
  comments: z.array(
    z.object({
      path: z.string().describe("File path in the backend PR (repo-relative)"),
      startLine: z
        .number()
        .int()
        .positive()
        .describe(
          "Start line number in the diff blob for the comment. For single-line comments, set both startLine and endLine to the same line number."
        ),
      endLine: z
        .number()
        .int()
        .positive()
        .describe(
          "End line number in the diff blob for multi-line comments. For single-line comments, set both startLine and endLine to the same line number."
        ),
      startSide: z
        .enum(["LEFT", "RIGHT"])
        .describe(
          "Start side for startLine (LEFT=old file/removed lines, RIGHT=new file/added lines)"
        ),
      endSide: z
        .enum(["LEFT", "RIGHT"])
        .describe(
          "End side for endLine (LEFT=old file/removed lines, RIGHT=new file/added lines)"
        ),
      body: z
        .string()
        .describe(
          "Comment text explaining the breaking change, impacted frontend files, and suggested fix"
        ),
    })
  ),
});

export type CommentGeneratorInput = z.infer<typeof commentGeneratorInputSchema>;
export type PRCommentsOutput = z.infer<typeof prCommentsSchema>;
