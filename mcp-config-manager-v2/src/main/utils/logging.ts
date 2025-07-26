/**
 * Logging configuration for Electron main process
 */

import fs from 'fs';
import path from 'path';
import { getLogsPath, isDev } from './environment';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

class ElectronLogger implements Logger {
  private logFilePath: string;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor() {
    this.logLevel = isDev ? 'debug' : 'info';
    this.logFilePath = path.join(getLogsPath(), 'main.log');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Rotate logs if file is too large (10MB)
    this.rotateLogsIfNeeded();
  }

  private formatMessage(level: string, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => {
      if (arg instanceof Error) {
        // Special handling for Error objects
        return JSON.stringify({
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
        }, null, 2);
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          // Handle circular references or other stringify errors
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }

  private writeToFile(level: string, message: string, args: unknown[]): void {
    const formattedMessage = this.formatMessage(level, message, args);
    
    try {
      fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
    } catch (error) {
      // If we can't write to the log file, at least output to console
      console.error('Failed to write to log file:', error);
      console.log(formattedMessage);
    }
  }

  private writeToConsole(level: string, message: string, args: unknown[]): void {
    const formattedMessage = this.formatMessage(level, message, args);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private log(level: string, message: string, args: unknown[]): void {
    if (!this.shouldLog(level)) return;
    
    // Always write to console in development
    if (isDev) {
      this.writeToConsole(level, message, args);
    }
    
    // Always write to file
    this.writeToFile(level, message, args);
  }

  private rotateLogsIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (stats.size > maxSize) {
          const backupPath = this.logFilePath + '.old';
          fs.renameSync(this.logFilePath, backupPath);
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, args);
  }
}

let logger: Logger;

export const setupLogging = (): Logger => {
  console.log('setupLogging called, creating logger...');
  if (!logger) {
    try {
      logger = new ElectronLogger();
      console.log('ElectronLogger created successfully');
      
      // Log startup information
      logger.info('Logging initialized', {
        environment: process.env.NODE_ENV,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
      });
    } catch (error) {
      console.error('Failed to create ElectronLogger:', error);
      throw error;
    }
  }
  
  return logger;
};

export const getLogger = (): Logger => {
  if (!logger) {
    throw new Error('Logger not initialized. Call setupLogging() first.');
  }
  return logger;
};