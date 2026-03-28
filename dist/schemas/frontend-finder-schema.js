"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frontendImpactsSchema = exports.frontendImpactItemSchema = exports.frontendFinderInputSchema = exports.frontendRepoSchema = void 0;
const v3_1 = require("zod/v3");
const be_analyzer_schema_1 = require("./be-analyzer-schema");
const common_schema_1 = require("./common-schema");
// Shared frontend repo schema
// Note: branch is required (not optional) for AI SDK schema validation
// Defaults are handled in the orchestration layer before passing to the agent
exports.frontendRepoSchema = v3_1.z.object({
    owner: v3_1.z.string().min(1).describe("Frontend repository owner"),
    repo: v3_1.z.string().min(1).describe("Frontend repository name"),
    branch: v3_1.z
        .string()
        .min(1)
        .default("main")
        .describe("Branch name (defaults to 'main')"),
});
// Input schema
exports.frontendFinderInputSchema = v3_1.z.object({
    repository: exports.frontendRepoSchema,
    codebasePath: v3_1.z
        .string()
        .min(1)
        .describe("Local filesystem path to frontend codebase (branch checked out)"),
    backendBatch: be_analyzer_schema_1.backendChangeBatchSchema,
    options: common_schema_1.agentOptionsSchema.optional(),
});
// Output schema - export item schema for reuse
exports.frontendImpactItemSchema = v3_1.z.object({
    backendBatchId: v3_1.z
        .string()
        .describe("ID of the backend batch that contains the change causing this impact (references backendBatch.batchId)"),
    backendChangeId: v3_1.z
        .string()
        .describe("ID of the backend change that caused this impact (references backendChange.id)"),
    frontendRepo: v3_1.z
        .string()
        .describe("Frontend repository identifier in format 'owner/repo:branch' (e.g., 'yashmahalwal/fark-frontend-demo:main'). Branch defaults to 'main' if not specified."),
    file: v3_1.z.string().describe("File path in frontend repo where impact occurs"),
    apiElement: v3_1.z
        .string()
        .describe("The specific API element being used (e.g., 'User.email', '/api/users', 'OrderStatus.PENDING')"),
    description: v3_1.z
        .string()
        .describe("High-level description of how this backend change impacts the frontend code - focus on what breaks and why, not technical details"),
    severity: v3_1.z
        .enum(["high", "medium", "low"])
        .describe("Impact severity: high = breaking (crashes/failures), medium = may break, low = minor issue"),
});
exports.frontendImpactsSchema = v3_1.z.object({
    frontendImpacts: v3_1.z.array(exports.frontendImpactItemSchema),
});
//# sourceMappingURL=frontend-finder-schema.js.map