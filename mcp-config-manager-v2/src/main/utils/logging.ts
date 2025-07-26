/**
 * Simple logging for JSON config editor
 */

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

class SimpleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

let logger: Logger | null = null;

export const setupLogging = (): Logger => {
  if (!logger) {
    logger = new SimpleLogger();
  }
  return logger;
};

export const getLogger = (): Logger => {
  if (!logger) {
    logger = new SimpleLogger();
  }
  return logger;
};