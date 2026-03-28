"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubMcpSchema = exports.agentOptionsSchema = void 0;
const v3_1 = require("zod/v3");
exports.agentOptionsSchema = v3_1.z.object({
    maxSteps: v3_1.z.number().int().positive().optional(),
    maxOutputTokens: v3_1.z.number().int().positive().optional(),
    maxTotalTokens: v3_1.z.number().int().positive().optional(),
});
exports.githubMcpSchema = v3_1.z.object({
    token: v3_1.z
        .string()
        .min(1)
        .describe("GitHub token for backend repository access"),
    mcpServerUrl: v3_1.z.string().min(1).describe("GitHub MCP server URL"),
});
//# sourceMappingURL=common-schema.js.map