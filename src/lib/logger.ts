export type LogContext = Record<string, unknown>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

/** Console-backed logger. Swap for a hosted sink (e.g. Sentry) behind the same interface. */
export const consoleLogger: Logger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, error, context) => console.error(message, error, context ?? {}),
};

export const logger: Logger = consoleLogger;
