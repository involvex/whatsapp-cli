import { promises as fs } from "fs";
import path from "path";

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

export interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  filePath: string;
  timestamp: boolean;
  colors: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  level: "info",
  console: true,
  file: false, // Disabled by default until config is loaded
  filePath: "", // Will be set from config
  timestamp: true,
  colors: true,
};

class Logger {
  private config: LoggerConfig;
  private logBuffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.config.file && this.config.filePath) {
      try {
        const logDir = path.dirname(this.config.filePath);
        await fs.mkdir(logDir, { recursive: true });
      } catch (error) {
        console.error("Failed to create log directory:", error);
      }
    }

    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): string {
    const timestamp = this.config.timestamp
      ? `[${new Date().toISOString()}] `
      : "";
    const levelStr = `[${level.toUpperCase()}] `;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp}${levelStr}${message}${metaStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    if (this.config.console) {
      const coloredMessage = this.config.colors
        ? this.colorize(level, formattedMessage)
        : formattedMessage;
      console.log(coloredMessage);
    }

    if (this.config.file) {
      this.logBuffer.push(formattedMessage);
    }
  }

  private colorize(level: LogLevel, message: string): string {
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      none: "\x1b[0m", // Reset
    };
    const reset = "\x1b[0m";
    return `${colors[level]}${message}${reset}`;
  }

  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    if (this.config.file && this.config.filePath) {
      try {
        const dateStr = new Date().toISOString().split("T")[0];
        const logFilePath = `${this.config.filePath}-${dateStr}.log`;
        await fs.appendFile(logFilePath, logsToWrite.join("\n") + "\n");
      } catch (error) {
        console.error("Failed to write logs:", error);
      }
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  logAction(action: string, details?: Record<string, unknown>): void {
    this.info(`Action: ${action}`, details);
  }

  logMessageEvent(
    event: "sent" | "received" | "failed",
    chatId: string,
    details?: Record<string, unknown>,
  ): void {
    this.info(`Message ${event}`, { chatId, ...details });
  }

  logClientEvent(
    event: "qr" | "ready" | "authenticated" | "disconnected" | "auth_failure",
    details?: Record<string, unknown>,
  ): void {
    this.info(`Client event: ${event}`, details);
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export default getLogger;
