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
}