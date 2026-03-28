"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitHubTools = getGitHubTools;
exports.getBackendTools = getBackendTools;
const mcp_1 = require("@ai-sdk/mcp");
/**
 * Creates GitHub MCP client and returns tools
 * @param token GitHub token for authentication
 * @param serverUrl GitHub MCP server URL
 * @returns Object containing AI SDK tools and the MCP client
 */
async function getGitHubTools(token, serverUrl) {
    if (!token) {
        throw new Error("GitHub token is required");
    }
    if (!serverUrl) {
        throw new Error("GitHub MCP server URL is required");
    }
    const client = await (0, mcp_1.createMCPClient)({
        transport: {
            type: "http",
            url: serverUrl,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
    // Automatically discover and convert MCP tools to AI SDK tools
    const tools = await client.tools();
    return { tools, client };
}
/**
 * Gets tools for backend repository operations
 * Returns all tools from the MCP server
 * Tool limiting is done via AI SDK's activeTools in generateText
 */
async function getBackendTools(token, serverUrl) {
    return getGitHubTools(token, serverUrl);
}
//# sourceMappingURL=github-tools.js.map