import { createMCPClient } from "@ai-sdk/mcp";

/**
 * Creates GitHub MCP client and returns tools
 * @param token GitHub token for authentication
 * @param serverUrl GitHub MCP server URL
 * @returns Object containing AI SDK tools and the MCP client
 */
export async function getGitHubTools(token?: string, serverUrl?: string) {
  if (!token) {
    throw new Error("GitHub token is required");
  }

  if (!serverUrl) {
    throw new Error("GitHub MCP server URL is required");
  }

  const client = await createMCPClient({
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
 * Uses GITHUB_TOKEN for backend repo access
 */
export async function getBackendTools(token: string, serverUrl: string) {
  return getGitHubTools(token, serverUrl);
}

/**
 * Gets tools for frontend repository operations
 * Uses FE_FRONTEND_TOKEN for private frontend repo access
 */
export async function getFrontendTools(token: string, serverUrl: string) {
  return getGitHubTools(token, serverUrl);
}
