import { z } from "zod/v3";
export declare const agentOptionsSchema: z.ZodObject<{
    maxSteps: z.ZodOptional<z.ZodNumber>;
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    maxTotalTokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxSteps?: number | undefined;
    maxOutputTokens?: number | undefined;
    maxTotalTokens?: number | undefined;
}, {
    maxSteps?: number | undefined;
    maxOutputTokens?: number | undefined;
    maxTotalTokens?: number | undefined;
}>;
export type AgentOptions = z.infer<typeof agentOptionsSchema>;
export declare const githubMcpSchema: z.ZodObject<{
    token: z.ZodString;
    mcpServerUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    mcpServerUrl: string;
}, {
    token: string;
    mcpServerUrl: string;
}>;
export type GitHubMcp = z.infer<typeof githubMcpSchema>;
//# sourceMappingURL=common-schema.d.ts.map