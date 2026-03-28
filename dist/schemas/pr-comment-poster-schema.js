"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prCommentPosterOutputSchema = exports.prCommentPosterInputSchema = void 0;
const v3_1 = require("zod/v3");
const comment_generator_schema_1 = require("./comment-generator-schema");
const common_schema_1 = require("./common-schema");
// Input schema - accepts comment data from comment-generator
exports.prCommentPosterInputSchema = v3_1.z.object({
    comments: comment_generator_schema_1.prCommentsSchema.describe("Comment data from comment-generator"),
    backend_owner: v3_1.z.string().describe("Backend repository owner"),
    backend_repo: v3_1.z.string().describe("Backend repository name"),
    pull_number: v3_1.z.number().describe("Pull request number"),
    githubMcp: common_schema_1.githubMcpSchema,
    options: common_schema_1.agentOptionsSchema.optional(),
});
// Output schema - review ID and status
exports.prCommentPosterOutputSchema = v3_1.z.object({
    reviewId: v3_1.z
        .number()
        .describe("ID of the created review. Use 0 if review creation failed or reviewId is not available"),
    success: v3_1.z.boolean().describe("Whether the review was created successfully"),
    message: v3_1.z.string().describe("Status message"),
});
//# sourceMappingURL=pr-comment-poster-schema.js.map