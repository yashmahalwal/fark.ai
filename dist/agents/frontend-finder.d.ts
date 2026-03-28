import { type LogLevel } from "../utils/create-logger";
import { type FrontendFinderInput, type FrontendImpactsOutput } from "../schemas/frontend-finder-schema";
/**
 * Agent 2: Frontend Impact Finder
 * Determines where backend API changes impact frontend code using filesystem tools
 */
export declare function findFrontendImpacts(input: FrontendFinderInput, openaiApiKey: string, logLevel?: LogLevel): Promise<FrontendImpactsOutput>;
//# sourceMappingURL=frontend-finder.d.ts.map