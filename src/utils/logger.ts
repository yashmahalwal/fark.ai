export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private useJson: boolean;
  private isGitHubActions: boolean;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.useJson = process.env.LOG_FORMAT === "json";
    this.isGitHubActions = process.env.GITHUB_ACTIONS === "true";
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private formatMessage(
    level: string,
    message: string,
    ...args: unknown[]
  ): string {
    if (this.useJson) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
      };

      // Add any additional args as fields
      if (args.length > 0) {
        args.forEach((arg, index) => {
          entry[`arg${index}`] = arg;
        });
      }

      return JSON.stringify(entry);
    }

    // Plain text format
    const prefix = `[${level}]`;
    if (args.length === 0) {
      return `${prefix} ${message}`;
    }

    // If there's one arg and it's an object, format it nicely
    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      return `${prefix} ${message} ${JSON.stringify(args[0], null, 2)}`;
    }

    return `${prefix} ${message} ${args.map((arg) => String(arg)).join(" ")}`;
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    ...args: unknown[]
  ): void {
    if (this.level > level) {
      return;
    }

    const formatted = this.formatMessage(levelName, message, ...args);

    if (this.isGitHubActions) {
      // Use GitHub Actions annotation syntax
      // Supported annotations: ::error::, ::warning::, ::notice::
      // These show up prominently in GitHub Actions UI
      if (level === LogLevel.ERROR) {
        console.error(`::error::${message}`);
        // Additional details go to stderr
        if (args.length > 0) {
          console.error(formatted);
        }
      } else if (level === LogLevel.WARN) {
        console.warn(`::warning::${message}`);
        if (args.length > 0) {
          console.warn(formatted);
        }
      } else if (level === LogLevel.INFO) {
        // INFO uses ::notice:: annotation (GitHub Actions doesn't have ::info::)
        console.info(`::notice::${message}`);
        if (args.length > 0) {
          console.info(formatted);
        }
      } else {
        // DEBUG - GitHub Actions doesn't have debug annotation, use regular console.debug
        console.debug(formatted);
      }
    } else {
      // Standard console output
      if (level === LogLevel.ERROR) {
        console.error(formatted);
      } else if (level === LogLevel.WARN) {
        console.warn(formatted);
      } else if (level === LogLevel.INFO) {
        console.info(formatted);
      } else {
        console.debug(formatted);
      }
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, "DEBUG", message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, "INFO", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, "WARN", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, "ERROR", message, ...args);
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL && process.env.LOG_LEVEL in LogLevel
    ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel]
    : LogLevel.INFO
);
