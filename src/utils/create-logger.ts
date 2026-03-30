import pino from "pino";
import pretty from "pino-pretty";

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
  const stream = pretty({
    colorize: true,
    translateTime: "HH:MM:ss Z",
    ignore: "pid,hostname",
  });
  return pino({ level: logLevel, msgPrefix: `${prefix}: ` }, stream);
}
