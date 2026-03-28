"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prCommentsSchema = exports.commentGeneratorInputSchema = void 0;
const v3_1 = require("zod/v3");
const orchestrate_schema_1 = require("./orchestrate-schema");
const common_schema_1 = require("./common-schema");
// Input schema - accepts combined changes structure
exports.commentGeneratorInputSchema = v3_1.z.object({
    changes: v3_1.z.array(orchestrate_schema_1.backendChangeWithImpactsSchema),
    backend_owner: v3_1.z.string().describe("Backend repository owner"),
    backend_repo: v3_1.z.string().describe("Backend repository name"),
    pull_number: v3_1.z.number().describe("Pull request number"),
    options: common_schema_1.agentOptionsSchema.optional(),
});
// Output schema - comment data for octokit
// All fields are required - use default values (0 for numbers, empty string for enums) when not applicable
exports.prCommentsSchema = v3_1.z.object({
    summary: v3_1.z
        .string()
        .describe("Summary of breaking changes detected (for review body)"),
    comments: v3_1.z.array(v3_1.z.object({
        path: v3_1.z.string().describe("File path in the backend PR (repo-relative)"),
        startLine: v3_1.z
            .number()
            .int()
            .positive()
            .describe("Start line number in the diff blob for the comment. For single-line comments, set both startLine and endLine to the same line number."),
        endLine: v3_1.z
            .number()
            .int()
            .positive()
            .describe("End line number in the diff blob for multi-line comments. For single-line comments, set both startLine and endLine to the same line number."),
        startSide: v3_1.z
            .enum(["LEFT", "RIGHT"])
            .describe("Start side for startLine (LEFT=old file/removed lines, RIGHT=new file/added lines)"),
        endSide: v3_1.z
            .enum(["LEFT", "RIGHT"])
            .describe("End side for endLine (LEFT=old file/removed lines, RIGHT=new file/added lines)"),
        body: v3_1.z
            .string()
            .describe("Comment text explaining the breaking change, impacted frontend files, and suggested fix"),
    })),
});
//# sourceMappingURL=comment-generator-schema.js.map