/**
 * MCP Server domain entity
 */

import { UUID, ServerName, ISODateString } from '@shared/types/branded';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface MCPServerStats {
  startCount: number;
  totalRuntime: number;
  lastStarted: ISODateString | null;
  lastStopped: ISODateString | null;
  errorCount: number;
}

export interface MCPServerProps {
  id: UUID;
  name: ServerName;
  status: 'running' | 'stopped' | 'error';
  enabled: boolean;
  config: MCPServerConfig;
  stats: MCPServerStats;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export class MCPServer {
  public readonly id: UUID;
  public readonly name: ServerName;
  public status: 'running' | 'stopped' | 'error';
  public enabled: boolean;
  public readonly config: MCPServerConfig;
  public readonly stats: MCPServerStats;
  public readonly createdAt: ISODateString;
  public updatedAt: ISODateString;

  constructor(props: MCPServerProps) {
    this.id = props.id;
    this.name = props.name;
    this.status = props.status;
    this.enabled = props.enabled;
    this.config = props.config;
    this.stats = props.stats;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Start the server
   */
  start(): void {
    if (this.status === 'running') {
      throw new Error('Server is already running');
    }
    
    this.status = 'running';
    this.stats.startCount++;
    this.stats.lastStarted = new Date().toISOString() as ISODateString;
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.status === 'stopped') {
      throw new Error('Server is already stopped');
    }
    
    this.status = 'stopped';
    this.stats.lastStopped = new Date().toISOString() as ISODateString;
    
    // Update runtime if we have a start time
    if (this.stats.lastStarted) {
      const startTime = new Date(this.stats.lastStarted).getTime();
      const stopTime = new Date(this.stats.lastStopped).getTime();
      this.stats.totalRuntime += stopTime - startTime;
    }
    
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Mark the server as errored
   */
  markError(): void {
    this.status = 'error';
    this.stats.errorCount++;
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Enable the server
   */
  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Disable the server
   */
  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MCPServerConfig>): void {
    Object.assign(this.config, config);
    this.updatedAt = new Date().toISOString() as ISODateString;
  }

  /**
   * Convert to plain object
   */
  toJSON(): MCPServerProps {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      config: { ...this.config },
      stats: { ...this.stats },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}