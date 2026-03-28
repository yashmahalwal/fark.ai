"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendChangeWithImpactsSchema = exports.orchestrateInputSchema = exports.frontendConfigSchema = void 0;
const v3_1 = require("zod/v3");
const be_analyzer_schema_1 = require("./be-analyzer-schema");
const frontend_finder_schema_1 = require("./frontend-finder-schema");
const be_analyzer_schema_2 = require("./be-analyzer-schema");
const frontend_finder_schema_2 = require("./frontend-finder-schema");
const common_schema_1 = require("./common-schema");
// Frontend configuration schema - reuses frontendFinderInputSchema, excluding backendChanges and openaiApiKey
exports.frontendConfigSchema = frontend_finder_schema_1.frontendFinderInputSchema.pick({
    repository: true,
    codebasePath: true,
    options: true,
});
// Input schema for orchestration - reuses schemas from agents
exports.orchestrateInputSchema = v3_1.z.object({
    backend: be_analyzer_schema_1.backendInputSchema,
    frontends: v3_1.z.array(exports.frontendConfigSchema).min(1),
    openaiApiKey: v3_1.z.string().min(1).describe("OpenAI API key for all agents"),
    logLevel: v3_1.z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .optional()
        .default("info")
        .describe("Log level (defaults to 'info')"),
    frontendFinderConcurrencyLimit: v3_1.z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Concurrency limit for frontend finder operations (defaults to 5 when not provided)"),
    commentGeneratorOptions: common_schema_1.agentOptionsSchema.optional(),
    prCommentPosterOptions: common_schema_1.agentOptionsSchema.optional(),
});
// Output type - backend changes with colocated frontend impacts
exports.backendChangeWithImpactsSchema = be_analyzer_schema_2.backendChangeItemSchema.extend({
    frontendImpacts: v3_1.z.array(frontend_finder_schema_2.frontendImpactItemSchema),
});
//# sourceMappingURL=orchestrate-schema.js.map