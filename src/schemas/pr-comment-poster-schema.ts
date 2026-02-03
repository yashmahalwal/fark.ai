import { z } from "zod/v3";
import { prCommentsSchema } from "./comment-generator-schema";
import { agentOptionsSchema, githubMcpSchema } from "./common-schema";

// Input schema - accepts comment data from comment-generator
export const prCommentPosterInputSchema = z.object({
  comments: prCommentsSchema.describe("Comment data from comment-generator"),
  backend_owner: z.string().describe("Backend repository owner"),
  backend_repo: z.string().describe("Backend repository name"),
  pull_number: z.number().describe("Pull request number"),
  githubMcp: githubMcpSchema,
  options: agentOptionsSchema.optional(),
});

// Output schema - review ID and status
export const prCommentPosterOutputSchema = z.object({
  reviewId: z
    .number()
    .describe(
      "ID of the created review. Use 0 if review creation failed or reviewId is not available"
    ),
  success: z.boolean().describe("Whether the review was created successfully"),
  message: z.string().describe("Status message"),
});

export type PRCommentPosterInput = z.infer<typeof prCommentPosterInputSchema>;
export type PRCommentPosterOutput = z.infer<typeof prCommentPosterOutputSchema>;
