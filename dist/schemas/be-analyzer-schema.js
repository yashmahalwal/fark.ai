"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendChangesSchema = exports.backendChangeBatchSchema = exports.backendChangeItemSchema = exports.backendInputSchema = exports.backendRepoSchema = void 0;
const v3_1 = require("zod/v3");
const common_schema_1 = require("./common-schema");
// Shared backend repository schema
exports.backendRepoSchema = v3_1.z.object({
    owner: v3_1.z.string().min(1).describe("Repository owner"),
    repo: v3_1.z.string().min(1).describe("Repository name"),
    pull_number: v3_1.z.number().int().positive().describe("Pull request number"),
});
// Input schema
exports.backendInputSchema = v3_1.z.object({
    repository: exports.backendRepoSchema,
    codebasePath: v3_1.z
        .string()
        .min(1)
        .describe("Local filesystem path to backend codebase (PR branch checked out)"),
    githubMcp: common_schema_1.githubMcpSchema,
    options: common_schema_1.agentOptionsSchema.optional(),
});
// Shared backend change item schema
// Note: OpenAI Responses API requires all properties to be in 'required' array
// So we use nullable() instead of optional() for optional fields
exports.backendChangeItemSchema = v3_1.z.object({
    id: v3_1.z
        .string()
        .describe("Unique identifier for this backend change - must be globally unique across ALL batches (use sequential IDs like '0', '1', '2', '3'...)"),
    file: v3_1.z.string().describe("File path where the change occurred"),
    diffHunks: v3_1.z.array(v3_1.z.object({
        startLine: v3_1.z.number().describe("Starting line number in the diff"),
        endLine: v3_1.z.number().describe("Ending line number in the diff"),
        startSide: v3_1.z
            .enum(["LEFT", "RIGHT"])
            .describe("Side of diff for startLine: LEFT=old file (removed lines), RIGHT=new file (added lines)"),
        endSide: v3_1.z
            .enum(["LEFT", "RIGHT"])
            .describe("Side of diff for endLine: LEFT=old file (removed lines), RIGHT=new file (added lines)"),
        changes: v3_1.z.array(v3_1.z.string()).describe("Array of diff lines"),
    })),
    impact: v3_1.z
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
    description: v3_1.z.string().describe("Human-readable description of the change"),
});
// Batch schema - groups of similar changes for efficient frontend analysis
exports.backendChangeBatchSchema = v3_1.z.object({
    batchId: v3_1.z
        .string()
        .describe("Unique identifier for this batch (e.g., '0', '1', '2') - used for tracking"),
    description: v3_1.z
        .string()
        .describe("Brief description of what this batch contains (e.g., 'GraphQL schema changes', 'REST endpoint changes')"),
    changes: v3_1.z
        .array(exports.backendChangeItemSchema)
        .describe("Array of backend changes belonging to this batch. Each change.id must be unique across all batches."),
});
// Output schema
exports.backendChangesSchema = v3_1.z.object({
    batches: v3_1.z
        .array(exports.backendChangeBatchSchema)
        .describe("Batches of similar changes for efficient frontend analysis. Group related changes together (e.g., all GraphQL changes, all REST changes). Aim for 5-10 batches maximum. All changes must be included in exactly one batch."),
});
//# sourceMappingURL=be-analyzer-schema.js.map