import pino from "pino";

// Re-export pino.Level for convenience
export type LogLevel = pino.Level;

/**
 * Creates a pino logger with pretty printing and a prefix
 * @param logLevel - The log level (default: "info")
 * @param prefix - The prefix to add to all log messages (e.g., "BE Analyzer", "Frontend Finder")
 * @returns A pino logger instance
 */
export function createLogger(
  logLevel: pino.Level = "info",
  prefix: string
): pino.Logger {
  return pino({
    level: logLevel,
    msgPrefix: `${prefix}: `,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });
}
