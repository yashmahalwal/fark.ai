import { type LogLevel } from "../utils/create-logger";
import { type PRCommentPosterInput, type PRCommentPosterOutput } from "../schemas/pr-comment-poster-schema";
/**
 * Agent 4: PR Comment Poster
 * Posts comments to the backend PR using GitHub MCP tools
 * For now, creates a draft review with summary in the body
 */
export declare function postPRComments(input: PRCommentPosterInput, openaiApiKey: string, logLevel?: LogLevel): Promise<PRCommentPosterOutput>;
//# sourceMappingURL=pr-comment-poster.d.ts.map