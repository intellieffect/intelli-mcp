/**
 * Simple IPC handlers for JSON config editor
 */

import { ipcMain } from 'electron';
import { getLogger, type Logger } from '../utils/logging';
import { validateFilePath } from '../utils/security';
import * as os from 'os';
import * as path from 'path';

let logger: Logger;

/**
 * Set up all IPC handlers
 */
export const setupIPC = (): void => {
  logger = getLogger();
  
  setupFileHandlers();
  setupConfigHandlers();
  
  logger.info('IPC handlers registered');
  logger.info('Claude Desktop config path:', getConfigPath());
};

/**
 * Get Claude Desktop config file path
 */
const getConfigPath = (): string => {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  } else {
    return path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json');
  }
};

/**
 * File-related IPC handlers
 */
const setupFileHandlers = (): void => {
  // Read file
  ipcMain.handle('file:read', async (event, filePath: string) => {
    try {
      logger.info('File read request for:', filePath);
      
      // Validate file path for security
      const isValidPath = validateFilePath(filePath);
      logger.info('Path validation result:', isValidPath);
      
      if (!isValidPath) {
        logger.error('Path validation failed for:', filePath);
        throw new Error('Invalid file path');
      }

      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      
      logger.info('File read successfully:', filePath);
      return { success: true, data: content };
    } catch (error) {
      logger.error('File read failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Write file
  ipcMain.handle('file:write', async (event, filePath: string, content: string) => {
    try {
      // Validate file path for security
      if (!validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      const fs = require('fs').promises;
      await fs.writeFile(filePath, content, 'utf-8');
      
      logger.info('File written successfully:', filePath);
      return { success: true };
    } catch (error) {
      logger.error('File write failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};

/**
 * Configuration-related IPC handlers
 */
const setupConfigHandlers = (): void => {
  // Get configuration file path
  ipcMain.handle('config:getPath', async () => {
    try {
      const path = getConfigPath();
      return { success: true, data: path };
    } catch (error) {
      logger.error('Get config path failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};