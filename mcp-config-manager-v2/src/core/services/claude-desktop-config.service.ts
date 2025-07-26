/**
 * Service for managing Claude Desktop MCP configuration
 * This reads/writes the actual Claude Desktop config file
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Result, AppError } from '@shared/types/result';
import { UUID, ServerName } from '@shared/types/branded';
import { MCPServer, Configuration } from '../domain/entities';
import { generateUUID } from '@shared/utils';

export interface ClaudeDesktopMCPServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ClaudeDesktopConfig {
  globalShortcut?: string;
  mcpServers: Record<string, ClaudeDesktopMCPServer>;
}

export class ClaudeDesktopConfigService {
  private configPath: string;

  constructor() {
    // Determine config path based on platform
    this.configPath = this.getConfigPath();
  }

  private getConfigPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case 'darwin': // macOS
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      case 'win32': // Windows
        return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
      case 'linux':
        return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Read the Claude Desktop configuration file
   */
  async readConfig(): Promise<Result<ClaudeDesktopConfig>> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as ClaudeDesktopConfig;
      
      // Ensure mcpServers exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      
      return Result.ok(config);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty config
        return Result.ok({ mcpServers: {} });
      }
      
      return Result.err(
        new AppError(
          'CONFIG_READ_ERROR',
          `Failed to read Claude Desktop config: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Write the Claude Desktop configuration file
   */
  async writeConfig(config: ClaudeDesktopConfig): Promise<Result<void>> {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Write config with pretty formatting
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new AppError(
          'CONFIG_WRITE_ERROR',
          `Failed to write Claude Desktop config: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Get the raw Claude Desktop configuration (for UI display)
   */
  async getRawConfig(): Promise<Result<ClaudeDesktopConfig>> {
    return this.readConfig();
  }

  /**
   * Convert Claude Desktop config to our Configuration model
   */
  async loadConfiguration(): Promise<Result<Configuration>> {
    const configResult = await this.readConfig();
    if (configResult.isErr()) {
      return configResult;
    }

    const claudeConfig = configResult.value;
    const servers: MCPServer[] = [];

    for (const [name, serverConfig] of Object.entries(claudeConfig.mcpServers)) {
      const server = new MCPServer({
        id: generateUUID() as UUID,
        name: name as ServerName,
        status: 'stopped',
        enabled: true,
        config: {
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env || {},
        },
        stats: {
          startCount: 0,
          totalRuntime: 0,
          lastStarted: null,
          lastStopped: null,
          errorCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      servers.push(server);
    }

    const configuration = new Configuration({
      id: generateUUID() as UUID,
      name: 'Claude Desktop MCP Config' as ServerName,
      servers,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return Result.ok(configuration);
  }

  /**
   * Save our Configuration model to Claude Desktop config
   */
  async saveConfiguration(configuration: Configuration): Promise<Result<void>> {
    const configResult = await this.readConfig();
    if (configResult.isErr()) {
      return configResult;
    }

    const claudeConfig = configResult.value;
    
    // Clear existing MCP servers
    claudeConfig.mcpServers = {};
    
    // Add servers from configuration
    for (const server of configuration.servers) {
      claudeConfig.mcpServers[server.name] = {
        command: server.config.command,
        args: server.config.args,
        ...(Object.keys(server.config.env).length > 0 && { env: server.config.env }),
      };
    }

    return await this.writeConfig(claudeConfig);
  }

  /**
   * Add a new MCP server
   */
  async addServer(name: string, server: ClaudeDesktopMCPServer): Promise<Result<void>> {
    const configResult = await this.readConfig();
    if (configResult.isErr()) {
      return configResult;
    }

    const config = configResult.value;
    
    if (config.mcpServers[name]) {
      return Result.err(
        new AppError('SERVER_EXISTS', `Server '${name}' already exists`)
      );
    }

    config.mcpServers[name] = server;
    return await this.writeConfig(config);
  }

  /**
   * Update an existing MCP server
   */
  async updateServer(name: string, server: ClaudeDesktopMCPServer): Promise<Result<void>> {
    const configResult = await this.readConfig();
    if (configResult.isErr()) {
      return configResult;
    }

    const config = configResult.value;
    
    if (!config.mcpServers[name]) {
      return Result.err(
        new AppError('SERVER_NOT_FOUND', `Server '${name}' not found`)
      );
    }

    config.mcpServers[name] = server;
    return await this.writeConfig(config);
  }

  /**
   * Remove an MCP server
   */
  async removeServer(name: string): Promise<Result<void>> {
    const configResult = await this.readConfig();
    if (configResult.isErr()) {
      return configResult;
    }

    const config = configResult.value;
    
    if (!config.mcpServers[name]) {
      return Result.err(
        new AppError('SERVER_NOT_FOUND', `Server '${name}' not found`)
      );
    }

    delete config.mcpServers[name];
    return await this.writeConfig(config);
  }

  /**
   * Get the config file path (for display purposes)
   */
  getConfigFilePath(): string {
    return this.configPath;
  }

  /**
   * Create a backup of the current configuration
   */
  async createBackup(): Promise<Result<string>> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(path.dirname(this.configPath), 'backups');
      const backupPath = path.join(backupDir, `claude_desktop_config_${timestamp}.json`);
      
      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true });
      
      // Check if original config file exists
      try {
        await fs.access(this.configPath);
        // File exists, copy it
        await fs.copyFile(this.configPath, backupPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File doesn't exist, create empty config backup
          const emptyConfig = { mcpServers: {} };
          await fs.writeFile(backupPath, JSON.stringify(emptyConfig, null, 2), 'utf-8');
        } else {
          throw error;
        }
      }
      
      return Result.ok(backupPath);
    } catch (error) {
      return Result.err(
        new AppError(
          'BACKUP_CREATE_ERROR',
          `Failed to create backup: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Restore configuration from a backup file
   */
  async restoreFromBackup(backupPath: string): Promise<Result<void>> {
    try {
      // Validate backup file exists and is readable
      await fs.access(backupPath, fs.constants.R_OK);
      
      // Create a temporary backup of current config
      const tempBackupPath = `${this.configPath}.temp`;
      try {
        await fs.copyFile(this.configPath, tempBackupPath);
      } catch {
        // Current file doesn't exist, that's OK
      }
      
      try {
        // Restore from backup
        await fs.copyFile(backupPath, this.configPath);
        
        // Verify the restored config is valid JSON
        const restoredContent = await fs.readFile(this.configPath, 'utf-8');
        JSON.parse(restoredContent); // This will throw if invalid JSON
        
        // Clean up temp backup
        try {
          await fs.unlink(tempBackupPath);
        } catch {
          // Ignore cleanup errors
        }
        
        return Result.ok(undefined);
      } catch (error) {
        // Restore failed, try to recover from temp backup
        try {
          await fs.copyFile(tempBackupPath, this.configPath);
        } catch {
          // Recovery also failed, but we still need to report the original error
        }
        throw error;
      }
    } catch (error) {
      return Result.err(
        new AppError(
          'BACKUP_RESTORE_ERROR',
          `Failed to restore from backup: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Write configuration file atomically (prevents corruption)
   */
  async writeConfigAtomic(config: ClaudeDesktopConfig): Promise<Result<void>> {
    const tempPath = `${this.configPath}.tmp`;
    const lockPath = `${this.configPath}.lock`;
    
    try {
      // Create lock file to prevent concurrent writes
      try {
        await fs.writeFile(lockPath, process.pid.toString(), { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          return Result.err(
            new AppError('CONFIG_LOCKED', 'Configuration file is being modified by another process')
          );
        }
        throw error;
      }
      
      try {
        // Ensure directory exists
        const configDir = path.dirname(this.configPath);
        await fs.mkdir(configDir, { recursive: true });
        
        // Write to temporary file first
        const configData = JSON.stringify(config, null, 2);
        await fs.writeFile(tempPath, configData, 'utf-8');
        
        // Verify the written file is valid JSON
        const writtenContent = await fs.readFile(tempPath, 'utf-8');
        JSON.parse(writtenContent); // This will throw if invalid JSON
        
        // Atomic move (rename is atomic operation on most filesystems)
        await fs.rename(tempPath, this.configPath);
        
        return Result.ok(undefined);
      } finally {
        // Always clean up lock and temp files
        try {
          await fs.unlink(lockPath);
        } catch {
          // Ignore cleanup errors
        }
        
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return Result.err(
        new AppError(
          'CONFIG_WRITE_ERROR',
          `Failed to write configuration atomically: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Validate configuration structure and content
   */
  async validateConfig(config: ClaudeDesktopConfig): Promise<Result<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Basic structure validation
      if (!config || typeof config !== 'object') {
        errors.push('Configuration must be a valid object');
        return Result.ok({ isValid: false, errors, warnings });
      }
      
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        errors.push('mcpServers field is missing or invalid');
        return Result.ok({ isValid: false, errors, warnings });
      }
      
      // Validate each server configuration
      const serverNames = Object.keys(config.mcpServers);
      const duplicateNames = serverNames.filter((name, index) => 
        serverNames.indexOf(name) !== index
      );
      
      if (duplicateNames.length > 0) {
        errors.push(`Duplicate server names found: ${duplicateNames.join(', ')}`);
      }
      
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        // Server name validation
        if (!serverName || typeof serverName !== 'string') {
          errors.push('Server name must be a non-empty string');
          continue;
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(serverName)) {
          warnings.push(`Server name '${serverName}' contains special characters`);
        }
        
        // Command validation
        if (!serverConfig.command || typeof serverConfig.command !== 'string') {
          errors.push(`Server '${serverName}': command is required and must be a string`);
          continue;
        }
        
        // Args validation
        if (serverConfig.args && !Array.isArray(serverConfig.args)) {
          errors.push(`Server '${serverName}': args must be an array`);
        }
        
        if (serverConfig.args) {
          for (const arg of serverConfig.args) {
            if (typeof arg !== 'string') {
              errors.push(`Server '${serverName}': all arguments must be strings`);
              break;
            }
          }
        }
        
        // Environment variables validation
        if (serverConfig.env) {
          if (typeof serverConfig.env !== 'object' || Array.isArray(serverConfig.env)) {
            errors.push(`Server '${serverName}': env must be an object`);
          } else {
            for (const [key, value] of Object.entries(serverConfig.env)) {
              if (typeof key !== 'string' || typeof value !== 'string') {
                errors.push(`Server '${serverName}': environment variables must be strings`);
                break;
              }
            }
          }
        }
      }
      
      return Result.ok({
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    } catch (error) {
      return Result.err(
        new AppError(
          'CONFIG_VALIDATION_ERROR',
          `Failed to validate configuration: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Get list of available backup files
   */
  async getBackupList(): Promise<Result<Array<{
    path: string;
    timestamp: string;
    size: number;
  }>>> {
    try {
      const backupDir = path.join(path.dirname(this.configPath), 'backups');
      
      try {
        const files = await fs.readdir(backupDir);
        const backups = [];
        
        for (const file of files) {
          if (file.startsWith('claude_desktop_config_') && file.endsWith('.json')) {
            const filePath = path.join(backupDir, file);
            try {
              const stats = await fs.stat(filePath);
              
              // Extract timestamp from filename
              const timestampMatch = file.match(/claude_desktop_config_(.+)\.json$/);
              const timestamp = timestampMatch ? timestampMatch[1].replace(/-/g, ':') : '';
              
              backups.push({
                path: filePath,
                timestamp,
                size: stats.size,
              });
            } catch {
              // Skip files that can't be read
              continue;
            }
          }
        }
        
        // Sort by timestamp (newest first)
        backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        
        return Result.ok(backups);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Backup directory doesn't exist
          return Result.ok([]);
        }
        throw error;
      }
    } catch (error) {
      return Result.err(
        new AppError(
          'BACKUP_LIST_ERROR',
          `Failed to get backup list: ${(error as Error).message}`,
          error as Error
        )
      );
    }
  }

  /**
   * Override writeConfig to use atomic writing
   */
  async writeConfig(config: ClaudeDesktopConfig): Promise<Result<void>> {
    // First validate the configuration
    const validationResult = await this.validateConfig(config);
    if (validationResult.isErr()) {
      return validationResult;
    }
    
    const { isValid, errors } = validationResult.value;
    if (!isValid) {
      return Result.err(
        new AppError(
          'CONFIG_INVALID',
          `Configuration validation failed: ${errors.join(', ')}`
        )
      );
    }
    
    // Use atomic writing
    return this.writeConfigAtomic(config);
  }
}