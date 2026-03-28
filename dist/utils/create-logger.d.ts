import pino from "pino";
export type LogLevel = pino.Level;
/**
 * Creates a pino logger with pretty printing and a prefix
 * @param logLevel - The log level (default: "info")
 * @param prefix - The prefix to add to all log messages (e.g., "BE Analyzer", "Frontend Finder")
 * @returns A pino logger instance
 */
export declare function createLogger(logLevel: pino.Level | undefined, prefix: string): pino.Logger;
//# sourceMappingURL=create-logger.d.ts.map