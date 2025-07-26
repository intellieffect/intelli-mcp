/**
 * IPC (Inter-Process Communication) handlers for Electron
 */

import { ipcMain, dialog } from 'electron';
import { getLogger, type Logger } from '../utils/logging';
import { sanitizeInput, validateFilePath } from '../utils/security';
import type { Result } from '@shared/types/result';
import type { UUID } from '@shared/types/branded';
import { ClaudeDesktopConfigService } from '../../core/services/claude-desktop-config.service';

// Logger will be initialized when setupIPC is called
let logger: Logger;
let claudeConfigService: ClaudeDesktopConfigService;

/**
 * Set up all IPC handlers
 */
export const setupIPC = (): void => {
  // Initialize logger when setupIPC is called
  logger = getLogger();
  
  // Initialize Claude Desktop config service
  claudeConfigService = new ClaudeDesktopConfigService();
  
  setupFileHandlers();
  setupServerHandlers();
  setupConfigurationHandlers();
  setupSystemHandlers();
  
  logger.info('IPC handlers registered');
  logger.info('Claude Desktop config path:', claudeConfigService.getConfigFilePath());
};

/**
 * File-related IPC handlers
 */
const setupFileHandlers = (): void => {
  // Show open dialog
  ipcMain.handle('file:showOpenDialog', async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(options);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Show open dialog failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Show save dialog
  ipcMain.handle('file:showSaveDialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(options);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Show save dialog failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

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

  // Check if file exists
  ipcMain.handle('file:exists', async (event, filePath: string) => {
    try {
      if (!validateFilePath(filePath)) {
        return { success: true, data: false };
      }

      const fs = require('fs').promises;
      await fs.access(filePath);
      
      return { success: true, data: true };
    } catch (error) {
      return { success: true, data: false };
    }
  });
};

/**
 * Server-related IPC handlers
 */
const setupServerHandlers = (): void => {
  // Start server
  ipcMain.handle('server:start', async (event, serverId: UUID) => {
    try {
      logger.info('Starting server:', serverId);
      
      // TODO: Implement actual server starting logic
      // This would integrate with the ServerService
      
      return { success: true };
    } catch (error) {
      logger.error('Server start failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Stop server
  ipcMain.handle('server:stop', async (event, serverId: UUID, reason?: string) => {
    try {
      logger.info('Stopping server:', serverId, reason ? `(${reason})` : '');
      
      // TODO: Implement actual server stopping logic
      
      return { success: true };
    } catch (error) {
      logger.error('Server stop failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Restart server
  ipcMain.handle('server:restart', async (event, serverId: UUID) => {
    try {
      logger.info('Restarting server:', serverId);
      
      // TODO: Implement actual server restarting logic
      
      return { success: true };
    } catch (error) {
      logger.error('Server restart failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get server logs
  ipcMain.handle('server:getLogs', async (event, serverId: UUID, lines = 100) => {
    try {
      logger.debug('Getting server logs:', serverId, 'lines:', lines);
      
      // TODO: Implement actual log retrieval
      const mockLogs = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Server started' },
        { timestamp: new Date().toISOString(), level: 'debug', message: 'Processing request' },
      ];
      
      return { success: true, data: mockLogs };
    } catch (error) {
      logger.error('Get server logs failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};

/**
 * Configuration-related IPC handlers
 */
const setupConfigurationHandlers = (): void => {
  // Get configuration file path
  ipcMain.handle('config:getPath', async () => {
    try {
      const path = claudeConfigService.getConfigFilePath();
      return { success: true, data: path };
    } catch (error) {
      logger.error('Get config path failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Load configuration (raw Claude Desktop format)
  ipcMain.handle('config:load', async (event, filePath?: string) => {
    try {
      logger.info('Loading Claude Desktop MCP configuration');
      
      const result = await claudeConfigService.getRawConfig();
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true, data: result.value };
    } catch (error) {
      logger.error('Configuration load failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Load configuration (converted format)
  ipcMain.handle('config:loadConverted', async (event, filePath?: string) => {
    try {
      logger.info('Loading converted Claude Desktop MCP configuration');
      
      const result = await claudeConfigService.loadConfiguration();
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true, data: result.value };
    } catch (error) {
      logger.error('Configuration load failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Save configuration
  ipcMain.handle('config:save', async (event, config: unknown, filePath?: string) => {
    try {
      logger.info('Saving Claude Desktop MCP configuration');
      
      const { Configuration } = require('../../core/domain/entities');
      const configuration = new Configuration(config);
      
      const result = await claudeConfigService.saveConfiguration(configuration);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Configuration save failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Export configuration
  ipcMain.handle('config:export', async (event, config: unknown, format: string) => {
    try {
      logger.info('Exporting configuration:', format);
      
      // TODO: Implement actual configuration export
      
      return { success: true };
    } catch (error) {
      logger.error('Configuration export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Import configuration
  ipcMain.handle('config:import', async (event, filePath: string) => {
    try {
      if (!validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      logger.info('Importing configuration:', filePath);
      
      // TODO: Implement actual configuration import
      
      return { success: true, data: {} };
    } catch (error) {
      logger.error('Configuration import failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Validate configuration
  ipcMain.handle('config:validate', async (event, config: unknown) => {
    try {
      logger.debug('Validating configuration');
      
      const result = await claudeConfigService.validateConfig(config as any);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true, data: result.value };
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Create configuration backup
  ipcMain.handle('config:createBackup', async () => {
    try {
      logger.info('Creating configuration backup');
      
      const result = await claudeConfigService.createBackup();
      
      if (result.isErr()) {
        throw result.error;
      }
      
      logger.info('Backup created successfully:', result.value);
      return { success: true, data: result.value };
    } catch (error) {
      logger.error('Configuration backup failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Restore configuration from backup
  ipcMain.handle('config:restoreFromBackup', async (event, backupPath: string) => {
    try {
      // Validate backup file path for security
      if (!validateFilePath(backupPath)) {
        throw new Error('Invalid backup file path');
      }

      logger.info('Restoring configuration from backup:', backupPath);
      
      const result = await claudeConfigService.restoreFromBackup(backupPath);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      logger.info('Configuration restored successfully from backup');
      return { success: true };
    } catch (error) {
      logger.error('Configuration restore failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get list of available backups
  ipcMain.handle('config:getBackupList', async () => {
    try {
      logger.debug('Getting list of available backups');
      
      const result = await claudeConfigService.getBackupList();
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true, data: result.value };
    } catch (error) {
      logger.error('Get backup list failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Write configuration atomically (safer alternative to regular save)
  ipcMain.handle('config:writeAtomic', async (event, config: unknown) => {
    try {
      logger.info('Writing configuration atomically');
      
      const result = await claudeConfigService.writeConfigAtomic(config as any);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      logger.info('Configuration written atomically');
      return { success: true };
    } catch (error) {
      logger.error('Atomic configuration write failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Add MCP server
  ipcMain.handle('config:addServer', async (event, name: string, server: unknown) => {
    try {
      logger.info('Adding MCP server:', name);
      
      const result = await claudeConfigService.addServer(name, server as any);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Add server failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Update MCP server
  ipcMain.handle('config:updateServer', async (event, name: string, server: unknown) => {
    try {
      logger.info('Updating MCP server:', name);
      
      const result = await claudeConfigService.updateServer(name, server as any);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Update server failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Remove MCP server
  ipcMain.handle('config:removeServer', async (event, name: string) => {
    try {
      logger.info('Removing MCP server:', name);
      
      const result = await claudeConfigService.removeServer(name);
      
      if (result.isErr()) {
        throw result.error;
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Remove server failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
};

/**
 * System-related IPC handlers
 */
const setupSystemHandlers = (): void => {
  // Get system information
  ipcMain.handle('system:getInfo', async () => {
    try {
      const os = require('os');
      
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
      };
      
      return { success: true, data: systemInfo };
    } catch (error) {
      logger.error('Get system info failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Show message box
  ipcMain.handle('system:showMessageBox', async (event, options) => {
    try {
      // Sanitize message content
      const sanitizedOptions = {
        ...options,
        message: sanitizeInput(options.message || ''),
        detail: options.detail ? sanitizeInput(options.detail) : undefined,
      };

      const result = await dialog.showMessageBox(sanitizedOptions);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Show message box failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Show error box
  ipcMain.handle('system:showErrorBox', async (event, title: string, content: string) => {
    try {
      dialog.showErrorBox(sanitizeInput(title), sanitizeInput(content));
      return { success: true };
    } catch (error) {
      logger.error('Show error box failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get app version
  ipcMain.handle('system:getVersion', async () => {
    try {
      const { app } = require('electron');
      return { success: true, data: app.getVersion() };
    } catch (error) {
      logger.error('Get app version failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Quit application
  ipcMain.handle('system:quit', async () => {
    try {
      const { app } = require('electron');
      app.quit();
      return { success: true };
    } catch (error) {
      logger.error('Quit app failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Show item in folder
  ipcMain.handle('system:showItemInFolder', async (event, path: string) => {
    try {
      if (!validateFilePath(path)) {
        throw new Error('Invalid file path');
      }
      
      const { shell } = require('electron');
      shell.showItemInFolder(path);
      
      return { success: true };
    } catch (error) {
      logger.error('Show item in folder failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};