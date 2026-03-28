"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
/**
 * Creates a pino logger with pretty printing and a prefix
 * @param logLevel - The log level (default: "info")
 * @param prefix - The prefix to add to all log messages (e.g., "BE Analyzer", "Frontend Finder")
 * @returns A pino logger instance
 */
function createLogger(logLevel = "info", prefix) {
    return (0, pino_1.default)({
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
//# sourceMappingURL=create-logger.js.map