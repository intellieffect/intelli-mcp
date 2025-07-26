/**
 * MCP Server domain entity with strict type safety
 */

import type {
  UUID,
  ISODateString,
  ServerName,
  Command,
  ServerDescription,
  EnvironmentKey,
  EnvironmentValue,
  Port,
} from '@shared/types/branded';

// Server status as discriminated union
export type ServerStatus =
  | {
      readonly kind: 'idle';
      readonly since: ISODateString;
    }
  | {
      readonly kind: 'running';
      readonly since: ISODateString;
      readonly pid?: number;
      readonly port?: Port;
    }
  | {
      readonly kind: 'stopped';
      readonly since: ISODateString;
      readonly reason?: string;
    }
  | {
      readonly kind: 'error';
      readonly since: ISODateString;
      readonly error: ServerError;
      readonly retryCount: number;
    }
  | {
      readonly kind: 'updating';
      readonly since: ISODateString;
      readonly progress: number; // 0-100
    };

// Server error information
export interface ServerError {
  readonly code: string;
  readonly message: string;
  readonly stack?: string;
  readonly timestamp: ISODateString;
}

// Server configuration
export interface ServerConfiguration {
  readonly command: Command;
  readonly args: readonly string[];
  readonly environment: ReadonlyMap<EnvironmentKey, EnvironmentValue>;
  readonly workingDirectory?: string;
  readonly timeout?: number; // milliseconds
  readonly retryLimit?: number;
  readonly autoRestart?: boolean;
}

// Server health check configuration
export interface ServerHealthCheck {
  readonly enabled: boolean;
  readonly interval: number; // milliseconds
  readonly timeout: number; // milliseconds
  readonly retries: number;
  readonly endpoint?: string;
}

// Server metrics
export interface ServerMetrics {
  readonly uptime: number; // milliseconds
  readonly restartCount: number;
  readonly lastRestart?: ISODateString;
  readonly memoryUsage?: number; // bytes
  readonly cpuUsage?: number; // percentage
  readonly responseTime?: number; // milliseconds
}

// Server capabilities (what the server can do)
export interface ServerCapabilities {
  readonly tools: readonly string[];
  readonly resources: readonly string[];
  readonly prompts: readonly string[];
  readonly protocols: readonly string[];
  readonly version: string;
}

// Complete MCP Server entity
export interface MCPServer {
  readonly id: UUID;
  readonly name: ServerName;
  readonly description: ServerDescription;
  readonly configuration: ServerConfiguration;
  readonly status: ServerStatus;
  readonly healthCheck: ServerHealthCheck;
  readonly metrics: ServerMetrics;
  readonly capabilities?: ServerCapabilities;
  readonly tags: readonly string[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly version: number; // for optimistic concurrency control
}

// Server creation input (what's needed to create a server)
export interface CreateServerInput {
  readonly name: ServerName;
  readonly description?: ServerDescription;
  readonly configuration: Omit<ServerConfiguration, 'timeout' | 'retryLimit' | 'autoRestart'> & {
    readonly timeout?: number;
    readonly retryLimit?: number;
    readonly autoRestart?: boolean;
  };
  readonly healthCheck?: Partial<ServerHealthCheck>;
  readonly tags?: readonly string[];
}

// Server update input (what can be updated)
export interface UpdateServerInput {
  readonly name?: ServerName;
  readonly description?: ServerDescription;
  readonly configuration?: Partial<ServerConfiguration>;
  readonly healthCheck?: Partial<ServerHealthCheck>;
  readonly tags?: readonly string[];
}

// Server query filters
export interface ServerFilters {
  readonly status?: ServerStatus['kind'];
  readonly tags?: readonly string[];
  readonly search?: string; // search in name/description
  readonly capabilities?: readonly string[];
  readonly createdAfter?: ISODateString;
  readonly createdBefore?: ISODateString;
}

// Server sort options
export type ServerSortField = 'name' | 'createdAt' | 'updatedAt' | 'status';
export type ServerSortOrder = 'asc' | 'desc';

export interface ServerSortOptions {
  readonly field: ServerSortField;
  readonly order: ServerSortOrder;
}

// Server pagination
export interface ServerPagination {
  readonly page: number;
  readonly limit: number;
  readonly total?: number;
}

// Server query result
export interface ServerQueryResult {
  readonly servers: readonly MCPServer[];
  readonly pagination: ServerPagination;
  readonly filters: ServerFilters;
  readonly sort: ServerSortOptions;
}

// Server events (for event sourcing)
export type ServerEvent =
  | {
      readonly type: 'ServerCreated';
      readonly serverId: UUID;
      readonly data: CreateServerInput;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ServerUpdated';
      readonly serverId: UUID;
      readonly data: UpdateServerInput;
      readonly version: number;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ServerDeleted';
      readonly serverId: UUID;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ServerStarted';
      readonly serverId: UUID;
      readonly pid: number;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ServerStopped';
      readonly serverId: UUID;
      readonly reason?: string;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ServerErrorOccurred';
      readonly serverId: UUID;
      readonly error: ServerError;
      readonly timestamp: ISODateString;
    };

// Type guards for server status
export const isServerRunning = (status: ServerStatus): status is Extract<ServerStatus, { kind: 'running' }> => {
  return status.kind === 'running';
};

export const isServerError = (status: ServerStatus): status is Extract<ServerStatus, { kind: 'error' }> => {
  return status.kind === 'error';
};

export const isServerIdle = (status: ServerStatus): status is Extract<ServerStatus, { kind: 'idle' }> => {
  return status.kind === 'idle';
};

// Utility functions
export const getServerStatusText = (status: ServerStatus): string => {
  switch (status.kind) {
    case 'idle':
      return 'Idle';
    case 'running':
      return `Running${status.pid ? ` (PID: ${status.pid})` : ''}`;
    case 'stopped':
      return `Stopped${status.reason ? ` (${status.reason})` : ''}`;
    case 'error':
      return `Error: ${status.error.message}`;
    case 'updating':
      return `Updating (${status.progress}%)`;
    default:
      return 'Unknown';
  }
};

export const isServerHealthy = (server: MCPServer): boolean => {
  // Server must be running or idle
  if (server.status.kind !== 'running' && server.status.kind !== 'idle') {
    return false;
  }

  // Check restart count threshold
  if (server.metrics.restartCount > 5) {
    return false;
  }

  // Check memory usage (threshold: 1GB)
  if (server.metrics.memoryUsage && server.metrics.memoryUsage > 1024 * 1024 * 1024) {
    return false;
  }

  // Check CPU usage (threshold: 90%)
  if (server.metrics.cpuUsage && server.metrics.cpuUsage > 90) {
    return false;
  }

  // Check health check if enabled
  if (server.healthCheck.enabled && server.metrics.responseTime === undefined) {
    return false;
  }

  return true;
};

// Server name validation
export const isValidServerName = (name: string): name is ServerName => {
  return (
    typeof name === 'string' &&
    name.trim().length >= 3 &&
    name.trim().length <= 100 &&
    /^[a-zA-Z0-9\s\-_]+$/.test(name.trim())
  );
};

// Command validation (security check)
export const isValidCommand = (command: string): command is Command => {
  if (typeof command !== 'string' || command.trim().length === 0) {
    return false;
  }

  const trimmed = command.trim();
  
  // Check for command injection patterns
  const dangerousPatterns = [
    ';',  // Command separator
    '&&', // Logical AND
    '||', // Logical OR
    '|',  // Pipe
    '>',  // Redirection
    '<',  // Input redirection
    '`',  // Command substitution
    '$(',  // Command substitution
  ];

  return !dangerousPatterns.some(pattern => trimmed.includes(pattern));
};

// Create server status helper
export const createServerStatus = (
  kind: ServerStatus['kind'], 
  options?: {
    pid?: number;
    reason?: string;
    error?: { message: string; code: string };
    progress?: number;
  }
): ServerStatus => {
  const since = new Date().toISOString() as ISODateString;

  switch (kind) {
    case 'idle':
      return { kind: 'idle', since };
    case 'running':
      return { 
        kind: 'running', 
        since, 
        ...(options?.pid && { pid: options.pid })
      };
    case 'stopped':
      return { 
        kind: 'stopped', 
        since, 
        ...(options?.reason && { reason: options.reason })
      };
    case 'error':
      return { 
        kind: 'error', 
        since, 
        error: {
          ...options!.error!,
          timestamp: since,
        },
        retryCount: 0,
      };
    case 'updating':
      return { 
        kind: 'updating', 
        since, 
        progress: options?.progress || 0,
      };
    default:
      throw new Error(`Invalid server status kind: ${kind}`);
  }
};

// Update server metrics
export const updateServerMetrics = (
  currentMetrics: ServerMetrics,
  updates: Partial<ServerMetrics>
): ServerMetrics => {
  return {
    ...currentMetrics,
    ...updates,
  };
};

// Calculate uptime for a server
export const calculateUptime = (status: ServerStatus): number => {
  if (status.kind !== 'running') {
    return 0;
  }

  const startTime = new Date(status.since).getTime();
  const currentTime = Date.now();
  return Math.max(0, currentTime - startTime);
};