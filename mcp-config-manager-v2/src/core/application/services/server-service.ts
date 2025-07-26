/**
 * Server application service with comprehensive business logic
 */

import type { Observable } from 'rxjs';
import type {
  MCPServer,
  CreateServerInput,
  UpdateServerInput,
  ServerFilters,
  ServerSortOptions,
  ServerPagination,
  ServerQueryResult,
  ServerEvent,
  ServerStatus,
  ServerMetrics,
  ServerCapabilities,
} from '@core/domain/entities/server';
import type { IServerRepository } from '@core/domain/repositories/server-repository';
import type { UUID, ISODateString } from '@shared/types/branded';
import type { Result } from '@shared/types/result';
import { ResultUtils } from '@shared/types/result';

// Service-specific error types
export interface ServerServiceError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
}

export type ServerServiceResult<T> = Result<T, ServerServiceError>;

// Server service interface
export interface IServerService {
  // Basic CRUD operations
  getServer(id: UUID): Promise<ServerServiceResult<MCPServer | null>>;
  getServers(
    filters?: ServerFilters,
    sort?: ServerSortOptions,
    pagination?: ServerPagination
  ): Promise<ServerServiceResult<ServerQueryResult>>;
  createServer(input: CreateServerInput): Promise<ServerServiceResult<MCPServer>>;
  updateServer(
    id: UUID,
    input: UpdateServerInput
  ): Promise<ServerServiceResult<MCPServer>>;
  deleteServer(id: UUID): Promise<ServerServiceResult<void>>;

  // Server lifecycle operations
  startServer(id: UUID): Promise<ServerServiceResult<void>>;
  stopServer(id: UUID, reason?: string): Promise<ServerServiceResult<void>>;
  restartServer(id: UUID): Promise<ServerServiceResult<void>>;
  getServerStatus(id: UUID): Promise<ServerServiceResult<ServerStatus>>;

  // Health monitoring
  checkServerHealth(id: UUID): Promise<ServerServiceResult<boolean>>;
  getServerMetrics(id: UUID): Promise<ServerServiceResult<ServerMetrics>>;
  getServerCapabilities(id: UUID): Promise<ServerServiceResult<ServerCapabilities | null>>;

  // Batch operations
  createServers(inputs: readonly CreateServerInput[]): Promise<ServerServiceResult<readonly MCPServer[]>>;
  updateServers(
    updates: readonly { id: UUID; input: UpdateServerInput }[]
  ): Promise<ServerServiceResult<readonly MCPServer[]>>;
  deleteServers(ids: readonly UUID[]): Promise<ServerServiceResult<void>>;

  // Search and filtering
  searchServers(
    query: string,
    pagination?: ServerPagination
  ): Promise<ServerServiceResult<ServerQueryResult>>;
  getServersByTag(tags: readonly string[]): Promise<ServerServiceResult<readonly MCPServer[]>>;
  getServersByStatus(status: ServerStatus['kind']): Promise<ServerServiceResult<readonly MCPServer[]>>;

  // Event handling
  getServerEvents(id: UUID): Promise<ServerServiceResult<readonly ServerEvent[]>>;
  watchServerEvents(id?: UUID): Observable<ServerEvent>;

  // Reactive data
  watchServer(id: UUID): Observable<MCPServer | null>;
  watchServers(filters?: ServerFilters): Observable<readonly MCPServer[]>;

  // Import/Export
  exportServers(
    filters?: ServerFilters,
    format?: 'json' | 'yaml' | 'csv'
  ): Promise<ServerServiceResult<string>>;
  importServers(
    data: string,
    format: 'json' | 'yaml' | 'csv',
    options?: { merge: boolean; validate: boolean }
  ): Promise<ServerServiceResult<readonly MCPServer[]>>;

  // Validation and testing
  validateServer(server: CreateServerInput): Promise<ServerServiceResult<readonly string[]>>;
  testServerConnection(id: UUID): Promise<ServerServiceResult<{
    readonly success: boolean;
    readonly responseTime: number;
    readonly error?: string;
  }>>;

  // Statistics and analytics
  getServerStatistics(): Promise<ServerServiceResult<{
    readonly total: number;
    readonly running: number;
    readonly stopped: number;
    readonly errors: number;
    readonly averageUptime: number;
  }>>;

  // Backup and restore
  backupServer(id: UUID): Promise<ServerServiceResult<string>>;
  restoreServer(id: UUID, backup: string): Promise<ServerServiceResult<MCPServer>>;
}

// Server service implementation
export class ServerService implements IServerService {
  constructor(
    private readonly serverRepository: IServerRepository,
    private readonly processManager: IServerProcessManager,
    private readonly healthChecker: IServerHealthChecker,
    private readonly validator: IServerValidator,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async getServer(id: UUID): Promise<ServerServiceResult<MCPServer | null>> {
    this.logger.debug('Getting server', { id });
    
    const result = await this.serverRepository.findById(id);
    
    return ResultUtils.mapError(result, (error) => ({
      code: 'SERVER_FETCH_ERROR',
      message: `Failed to fetch server ${id}`,
      details: { serverId: id },
      cause: error as Error,
    }));
  }

  async getServers(
    filters?: ServerFilters,
    sort?: ServerSortOptions,
    pagination?: ServerPagination
  ): Promise<ServerServiceResult<ServerQueryResult>> {
    this.logger.debug('Getting servers', { filters, sort, pagination });
    
    const result = await this.serverRepository.findMany(filters, sort, pagination);
    
    return ResultUtils.mapError(result, (error) => ({
      code: 'SERVERS_FETCH_ERROR',
      message: 'Failed to fetch servers',
      details: { filters, sort, pagination },
      cause: error as Error,
    }));
  }

  async createServer(input: CreateServerInput): Promise<ServerServiceResult<MCPServer>> {
    this.logger.info('Creating server', { name: input.name });
    
    // Validate input
    const validationResult = await this.validator.validateCreateInput(input);
    if (!validationResult.isValid) {
      return {
        kind: 'failure',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Server validation failed',
          details: { errors: validationResult.errors },
        },
      };
    }

    // Check for name conflicts
    const existingServers = await this.serverRepository.findMany({
      search: input.name,
    });
    
    if (existingServers.kind === 'failure') {
      return ResultUtils.mapError(existingServers, (error) => ({
        code: 'DUPLICATE_CHECK_ERROR',
        message: 'Failed to check for duplicate server names',
        cause: error as Error,
      }));
    }

    const duplicates = existingServers.value.servers.filter(
      server => server.name === input.name
    );
    
    if (duplicates.length > 0) {
      return {
        kind: 'failure',
        error: {
          code: 'DUPLICATE_SERVER_NAME',
          message: `Server with name '${input.name}' already exists`,
          details: { existingServerId: duplicates[0]!.id },
        },
      };
    }

    // Create server
    const createResult = await this.serverRepository.create(input);
    if (createResult.kind === 'failure') {
      return ResultUtils.mapError(createResult, (error) => ({
        code: 'SERVER_CREATION_ERROR',
        message: 'Failed to create server',
        details: { input },
        cause: error as Error,
      }));
    }

    const server = createResult.value;

    // Emit event
    const event: ServerEvent = {
      type: 'ServerCreated',
      serverId: server.id,
      data: input,
      timestamp: server.createdAt,
    };
    
    await this.eventBus.publish(event);
    this.logger.info('Server created successfully', { serverId: server.id });

    return { kind: 'success', value: server };
  }

  async updateServer(
    id: UUID,
    input: UpdateServerInput
  ): Promise<ServerServiceResult<MCPServer>> {
    this.logger.info('Updating server', { id });
    
    // Get current server
    const currentResult = await this.serverRepository.findById(id);
    if (currentResult.kind === 'failure') {
      return ResultUtils.mapError(currentResult, (error) => ({
        code: 'SERVER_NOT_FOUND',
        message: `Server ${id} not found`,
        details: { serverId: id },
        cause: error as Error,
      }));
    }

    const currentServer = currentResult.value;
    if (!currentServer) {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_NOT_FOUND',
          message: `Server ${id} not found`,
          details: { serverId: id },
        },
      };
    }

    // Validate update input
    const validationResult = await this.validator.validateUpdateInput(input);
    if (!validationResult.isValid) {
      return {
        kind: 'failure',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Server update validation failed',
          details: { errors: validationResult.errors },
        },
      };
    }

    // Update server
    const updateResult = await this.serverRepository.update(
      id,
      input,
      currentServer.version
    );
    
    if (updateResult.kind === 'failure') {
      return ResultUtils.mapError(updateResult, (error) => ({
        code: 'SERVER_UPDATE_ERROR',
        message: 'Failed to update server',
        details: { serverId: id, input },
        cause: error as Error,
      }));
    }

    const updatedServer = updateResult.value;

    // Emit event
    const event: ServerEvent = {
      type: 'ServerUpdated',
      serverId: id,
      data: input,
      version: updatedServer.version,
      timestamp: updatedServer.updatedAt,
    };
    
    await this.eventBus.publish(event);
    this.logger.info('Server updated successfully', { serverId: id });

    return { kind: 'success', value: updatedServer };
  }

  async deleteServer(id: UUID): Promise<ServerServiceResult<void>> {
    this.logger.info('Deleting server', { id });
    
    // Check if server is running
    const server = await this.getServer(id);
    if (server.kind === 'success' && server.value) {
      if (server.value.status.kind === 'running') {
        // Stop server first
        const stopResult = await this.stopServer(id, 'Server being deleted');
        if (stopResult.kind === 'failure') {
          this.logger.warn('Failed to stop server before deletion', { id });
        }
      }
    }

    // Delete server
    const deleteResult = await this.serverRepository.delete(id);
    if (deleteResult.kind === 'failure') {
      return ResultUtils.mapError(deleteResult, (error) => ({
        code: 'SERVER_DELETION_ERROR',
        message: 'Failed to delete server',
        details: { serverId: id },
        cause: error as Error,
      }));
    }

    // Emit event
    const event: ServerEvent = {
      type: 'ServerDeleted',
      serverId: id,
      timestamp: new Date().toISOString() as ISODateString,
    };
    
    await this.eventBus.publish(event);
    this.logger.info('Server deleted successfully', { serverId: id });

    return { kind: 'success', value: undefined };
  }

  async startServer(id: UUID): Promise<ServerServiceResult<void>> {
    this.logger.info('Starting server', { id });
    
    const serverResult = await this.getServer(id);
    if (serverResult.kind === 'failure') {
      return serverResult;
    }

    const server = serverResult.value;
    if (!server) {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_NOT_FOUND',
          message: `Server ${id} not found`,
          details: { serverId: id },
        },
      };
    }

    if (server.status.kind === 'running') {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_ALREADY_RUNNING',
          message: `Server ${id} is already running`,
          details: { serverId: id, status: server.status },
        },
      };
    }

    // Start the server process
    const startResult = await this.processManager.start(server);
    if (startResult.kind === 'failure') {
      return ResultUtils.mapError(startResult, (error) => ({
        code: 'SERVER_START_ERROR',
        message: 'Failed to start server process',
        details: { serverId: id },
        cause: error as Error,
      }));
    }

    const { pid, port } = startResult.value;

    // Update server status
    const now = new Date().toISOString() as ISODateString;
    const updateResult = await this.updateServer(id, {
      // This would need to be handled by a status update mechanism
    });

    // Emit event
    const event: ServerEvent = {
      type: 'ServerStarted',
      serverId: id,
      pid,
      timestamp: now,
    };
    
    await this.eventBus.publish(event);
    this.logger.info('Server started successfully', { serverId: id, pid });

    return { kind: 'success', value: undefined };
  }

  async stopServer(id: UUID, reason?: string): Promise<ServerServiceResult<void>> {
    this.logger.info('Stopping server', { id, reason });
    
    const serverResult = await this.getServer(id);
    if (serverResult.kind === 'failure') {
      return serverResult;
    }

    const server = serverResult.value;
    if (!server) {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_NOT_FOUND',
          message: `Server ${id} not found`,
          details: { serverId: id },
        },
      };
    }

    if (server.status.kind !== 'running') {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_NOT_RUNNING',
          message: `Server ${id} is not running`,
          details: { serverId: id, status: server.status },
        },
      };
    }

    // Stop the server process
    const stopResult = await this.processManager.stop(id);
    if (stopResult.kind === 'failure') {
      return ResultUtils.mapError(stopResult, (error) => ({
        code: 'SERVER_STOP_ERROR',
        message: 'Failed to stop server process',
        details: { serverId: id },
        cause: error as Error,
      }));
    }

    // Emit event
    const event: ServerEvent = {
      type: 'ServerStopped',
      serverId: id,
      reason,
      timestamp: new Date().toISOString() as ISODateString,
    };
    
    await this.eventBus.publish(event);
    this.logger.info('Server stopped successfully', { serverId: id });

    return { kind: 'success', value: undefined };
  }

  async restartServer(id: UUID): Promise<ServerServiceResult<void>> {
    this.logger.info('Restarting server', { id });
    
    // First try to stop the server
    const stopResult = await this.stopServer(id, 'Server restart');
    if (stopResult.kind === 'failure') {
      // If stop fails, we still try to start (might be already stopped)
      this.logger.warn('Failed to stop server during restart', { id });
    }

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start the server
    return this.startServer(id);
  }

  // Additional implementation methods would follow the same pattern...
  
  async getServerStatus(id: UUID): Promise<ServerServiceResult<ServerStatus>> {
    const serverResult = await this.getServer(id);
    if (serverResult.kind === 'failure') {
      return ResultUtils.mapError(serverResult, (error) => ({
        code: 'SERVER_STATUS_ERROR',
        message: 'Failed to get server status',
        details: { serverId: id },
        cause: error.cause,
      }));
    }

    const server = serverResult.value;
    if (!server) {
      return {
        kind: 'failure',
        error: {
          code: 'SERVER_NOT_FOUND',
          message: `Server ${id} not found`,
          details: { serverId: id },
        },
      };
    }

    return { kind: 'success', value: server.status };
  }

  // Placeholder implementations for remaining methods
  async checkServerHealth(id: UUID): Promise<ServerServiceResult<boolean>> {
    // Implementation would use healthChecker
    throw new Error('Method not implemented');
  }

  async getServerMetrics(id: UUID): Promise<ServerServiceResult<ServerMetrics>> {
    throw new Error('Method not implemented');
  }

  async getServerCapabilities(id: UUID): Promise<ServerServiceResult<ServerCapabilities | null>> {
    throw new Error('Method not implemented');
  }

  async createServers(inputs: readonly CreateServerInput[]): Promise<ServerServiceResult<readonly MCPServer[]>> {
    throw new Error('Method not implemented');
  }

  async updateServers(updates: readonly { id: UUID; input: UpdateServerInput }[]): Promise<ServerServiceResult<readonly MCPServer[]>> {
    throw new Error('Method not implemented');
  }

  async deleteServers(ids: readonly UUID[]): Promise<ServerServiceResult<void>> {
    throw new Error('Method not implemented');
  }

  async searchServers(query: string, pagination?: ServerPagination): Promise<ServerServiceResult<ServerQueryResult>> {
    throw new Error('Method not implemented');
  }

  async getServersByTag(tags: readonly string[]): Promise<ServerServiceResult<readonly MCPServer[]>> {
    throw new Error('Method not implemented');
  }

  async getServersByStatus(status: ServerStatus['kind']): Promise<ServerServiceResult<readonly MCPServer[]>> {
    throw new Error('Method not implemented');
  }

  async getServerEvents(id: UUID): Promise<ServerServiceResult<readonly ServerEvent[]>> {
    throw new Error('Method not implemented');
  }

  watchServerEvents(id?: UUID): Observable<ServerEvent> {
    throw new Error('Method not implemented');
  }

  watchServer(id: UUID): Observable<MCPServer | null> {
    throw new Error('Method not implemented');
  }

  watchServers(filters?: ServerFilters): Observable<readonly MCPServer[]> {
    throw new Error('Method not implemented');
  }

  async exportServers(filters?: ServerFilters, format?: 'json' | 'yaml' | 'csv'): Promise<ServerServiceResult<string>> {
    throw new Error('Method not implemented');
  }

  async importServers(data: string, format: 'json' | 'yaml' | 'csv', options?: { merge: boolean; validate: boolean }): Promise<ServerServiceResult<readonly MCPServer[]>> {
    throw new Error('Method not implemented');
  }

  async validateServer(server: CreateServerInput): Promise<ServerServiceResult<readonly string[]>> {
    throw new Error('Method not implemented');
  }

  async testServerConnection(id: UUID): Promise<ServerServiceResult<{ readonly success: boolean; readonly responseTime: number; readonly error?: string }>> {
    throw new Error('Method not implemented');
  }

  async getServerStatistics(): Promise<ServerServiceResult<{ readonly total: number; readonly running: number; readonly stopped: number; readonly errors: number; readonly averageUptime: number }>> {
    throw new Error('Method not implemented');
  }

  async backupServer(id: UUID): Promise<ServerServiceResult<string>> {
    throw new Error('Method not implemented');
  }

  async restoreServer(id: UUID, backup: string): Promise<ServerServiceResult<MCPServer>> {
    throw new Error('Method not implemented');
  }
}

// Supporting interfaces that would be implemented elsewhere
interface IServerProcessManager {
  start(server: MCPServer): Promise<Result<{ pid: number; port?: number }, Error>>;
  stop(serverId: UUID): Promise<Result<void, Error>>;
  isRunning(serverId: UUID): Promise<boolean>;
  getProcess(serverId: UUID): Promise<Result<ProcessInfo | null, Error>>;
}

interface ProcessInfo {
  readonly pid: number;
  readonly startTime: ISODateString;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
}

interface IServerHealthChecker {
  check(serverId: UUID): Promise<Result<boolean, Error>>;
  getMetrics(serverId: UUID): Promise<Result<ServerMetrics, Error>>;
}

interface IServerValidator {
  validateCreateInput(input: CreateServerInput): Promise<{ isValid: boolean; errors: readonly string[] }>;
  validateUpdateInput(input: UpdateServerInput): Promise<{ isValid: boolean; errors: readonly string[] }>;
}

interface IEventBus {
  publish(event: ServerEvent): Promise<void>;
  subscribe<T extends ServerEvent>(
    eventType: T['type'],
    handler: (event: T) => void
  ): () => void;
}

interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}