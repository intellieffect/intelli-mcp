/**
 * IPC handlers for multi-file JSON config editor
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getLogger, type Logger } from '../utils/logging';
import { validateFilePath } from '../utils/security';
import { getFileManager, type ManagedFile } from '../services/file-manager.service';
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
  setupFileManagementHandlers();
  
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
 * File-related IPC handlers (legacy support)
 */
const setupFileHandlers = (): void => {
  // Read file (legacy)
  ipcMain.handle('file:read', async (event, filePath: string) => {
    try {
      logger.info('Legacy file read request for:', filePath);
      
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

  // Write file (legacy)
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

/**
 * File management IPC handlers
 */
const setupFileManagementHandlers = (): void => {
  const fileManager = getFileManager();

  // Add files to management
  ipcMain.handle('files:add', async (event, paths: string[]): Promise<{ success: boolean; data?: ManagedFile[]; error?: string }> => {
    try {
      logger.info('Adding files:', paths);
      const managedFiles = await fileManager.addFiles(paths);
      logger.info('Files added successfully:', managedFiles.length);
      return { success: true, data: managedFiles };
    } catch (error) {
      logger.error('Failed to add files:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Remove file from management
  ipcMain.handle('files:remove', async (event, fileId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.info('Removing file:', fileId);
      await fileManager.removeFile(fileId);
      logger.info('File removed successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // List all managed files
  ipcMain.handle('files:list', async (): Promise<{ success: boolean; data?: ManagedFile[]; error?: string }> => {
    try {
      const files = await fileManager.listFiles();
      logger.info('Listed files:', files.length);
      return { success: true, data: files };
    } catch (error) {
      logger.error('Failed to list files:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Read file by ID
  ipcMain.handle('files:read', async (event, fileId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      logger.info('Reading file by ID:', fileId);
      const content = await fileManager.readFile(fileId);
      logger.info('File read successfully by ID');
      return { success: true, data: content };
    } catch (error) {
      logger.error('Failed to read file by ID:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Write file by ID
  ipcMain.handle('files:write', async (event, fileId: string, content: any): Promise<{ success: boolean; error?: string }> => {
    try {
      logger.info('Writing file by ID:', fileId);
      await fileManager.writeFile(fileId, content);
      logger.info('File written successfully by ID');
      return { success: true };
    } catch (error) {
      logger.error('Failed to write file by ID:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get last active file ID
  ipcMain.handle('files:getActiveId', async (): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
      const activeId = fileManager.getLastActiveFileId();
      return { success: true, data: activeId };
    } catch (error) {
      logger.error('Failed to get active file ID:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Set active file ID
  ipcMain.handle('files:setActiveId', async (event, fileId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      fileManager.setLastActiveFileId(fileId);
      logger.info('Active file ID set:', fileId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to set active file ID:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Show open dialog for adding files
  ipcMain.handle('files:showOpenDialog', async (event): Promise<{ success: boolean; data?: string[]; error?: string }> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        throw new Error('No focused window');
      }

      const result = await dialog.showOpenDialog(focusedWindow, {
        title: 'Select JSON Configuration Files',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'MCP Config Files', extensions: ['mcp.json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (result.canceled) {
        return { success: true, data: [] };
      }

      return { success: true, data: result.filePaths };
    } catch (error) {
      logger.error('Failed to show open dialog:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Custom name management handlers
  ipcMain.handle('files:setCustomName', async (event, fileId: string, customName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await fileManager.setCustomName(fileId, customName);
      return { success: true };
    } catch (error) {
      logger.error('Failed to set custom name:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('files:getCustomName', async (event, fileId: string): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
      const customName = await fileManager.getCustomName(fileId);
      return { success: true, data: customName };
    } catch (error) {
      logger.error('Failed to get custom name:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('files:clearCustomName', async (event, fileId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await fileManager.clearCustomName(fileId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to clear custom name:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};