import { type LogLevel } from "../utils/create-logger";
import { type BackendInput, type BackendChangesOutput } from "../schemas/be-analyzer-schema";
/**
 * Agent 1: BE Diff Analyzer
 * Extracts API interface changes from PR diff using GitHub MCP tools (for PR) and filesystem tools (for code reading)
 */
export declare function analyzeBackendDiff(input: BackendInput, openaiApiKey: string, logLevel?: LogLevel): Promise<BackendChangesOutput>;
//# sourceMappingURL=be-analyzer.d.ts.map