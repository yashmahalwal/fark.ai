import { type LogLevel } from "../utils/create-logger";
import { type CommentGeneratorInput, type PRCommentsOutput } from "../schemas/comment-generator-schema";
/**
 * Agent 3: PR Comment Generator
 * Generates inline PR comments for backend changes with frontend impact information
 */
export declare function generatePRComments(input: CommentGeneratorInput, openaiApiKey: string, logLevel?: LogLevel): Promise<PRCommentsOutput>;
//# sourceMappingURL=comment-generator.d.ts.map