import { z } from "zod/v3";

export const agentOptionsSchema = z.object({
  maxSteps: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  maxTotalTokens: z.number().int().positive().optional(),
});

export type AgentOptions = z.infer<typeof agentOptionsSchema>;

export const githubMcpSchema = z.object({
  token: z
    .string()
    .min(1)
    .describe("GitHub token for backend repository access"),
  mcpServerUrl: z.string().min(1).describe("GitHub MCP server URL"),
});

export type GitHubMcp = z.infer<typeof githubMcpSchema>;
