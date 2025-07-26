/**
 * Server repository interface with strict type safety
 * Defines the contract for server data persistence
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
} from '../entities/server';
import type { UUID } from '@shared/types/branded';
import type { Result } from '@shared/types/result';

// Repository error types
export interface ServerRepositoryError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// Repository operation result
export type ServerRepositoryResult<T> = Result<T, ServerRepositoryError>;

// Main server repository interface
export interface IServerRepository {
  /**
   * Find a server by ID
   */
  findById(id: UUID): Promise<ServerRepositoryResult<MCPServer | null>>;

  /**
   * Find servers with filters, sorting, and pagination
   */
  findMany(
    filters?: ServerFilters,
    sort?: ServerSortOptions,
    pagination?: ServerPagination
  ): Promise<ServerRepositoryResult<ServerQueryResult>>;

  /**
   * Create a new server
   */
  create(input: CreateServerInput): Promise<ServerRepositoryResult<MCPServer>>;

  /**
   * Update an existing server
   */
  update(
    id: UUID,
    input: UpdateServerInput,
    version: number
  ): Promise<ServerRepositoryResult<MCPServer>>;

  /**
   * Delete a server
   */
  delete(id: UUID): Promise<ServerRepositoryResult<void>>;

  /**
   * Check if a server exists
   */
  exists(id: UUID): Promise<ServerRepositoryResult<boolean>>;

  /**
   * Get total count of servers matching filters
   */
  count(filters?: ServerFilters): Promise<ServerRepositoryResult<number>>;

  /**
   * Get all servers (for small datasets)
   */
  findAll(): Promise<ServerRepositoryResult<readonly MCPServer[]>>;

  /**
   * Batch operations
   */
  createMany(inputs: readonly CreateServerInput[]): Promise<ServerRepositoryResult<readonly MCPServer[]>>;
  updateMany(
    updates: readonly { id: UUID; input: UpdateServerInput; version: number }[]
  ): Promise<ServerRepositoryResult<readonly MCPServer[]>>;
  deleteMany(ids: readonly UUID[]): Promise<ServerRepositoryResult<void>>;

  /**
   * Search servers by text
   */
  search(
    query: string,
    fields?: readonly ('name' | 'description' | 'tags')[],
    pagination?: ServerPagination
  ): Promise<ServerRepositoryResult<ServerQueryResult>>;

  /**
   * Event sourcing support
   */
  getEvents(serverId: UUID): Promise<ServerRepositoryResult<readonly ServerEvent[]>>;
  saveEvent(event: ServerEvent): Promise<ServerRepositoryResult<void>>;

  /**
   * Reactive data access
   */
  watchById(id: UUID): Observable<MCPServer | null>;
  watchMany(filters?: ServerFilters): Observable<readonly MCPServer[]>;
  watchCount(filters?: ServerFilters): Observable<number>;

  /**
   * Transaction support
   */
  transaction<T>(
    operation: (repo: IServerRepository) => Promise<ServerRepositoryResult<T>>
  ): Promise<ServerRepositoryResult<T>>;

  /**
   * Cache management
   */
  invalidateCache(id?: UUID): Promise<void>;
  preloadCache(ids: readonly UUID[]): Promise<void>;

  /**
   * Import/Export
   */
  export(
    filters?: ServerFilters,
    format?: 'json' | 'csv' | 'yaml'
  ): Promise<ServerRepositoryResult<string>>;
  import(
    data: string,
    format: 'json' | 'csv' | 'yaml',
    options?: { merge: boolean; validate: boolean }
  ): Promise<ServerRepositoryResult<readonly MCPServer[]>>;

  /**
   * Health checks
   */
  healthCheck(): Promise<ServerRepositoryResult<{
    readonly isHealthy: boolean;
    readonly latency: number;
    readonly details: Record<string, unknown>;
  }>>;
}

// Repository factory interface
export interface IServerRepositoryFactory {
  create(options?: ServerRepositoryOptions): Promise<IServerRepository>;
  createInMemory(): IServerRepository;
  createPersistent(connectionString: string): Promise<IServerRepository>;
}

// Repository configuration options
export interface ServerRepositoryOptions {
  readonly cacheSize?: number;
  readonly cacheTtl?: number; // milliseconds
  readonly enableWatchers?: boolean;
  readonly enableEvents?: boolean;
  readonly enableTransactions?: boolean;
  readonly connectionTimeout?: number;
  readonly queryTimeout?: number;
  readonly retryCount?: number;
  readonly encryptionKey?: string;
}

// Repository statistics
export interface ServerRepositoryStatistics {
  readonly totalServers: number;
  readonly cacheHitRate: number;
  readonly averageQueryTime: number;
  readonly connectionCount: number;
  readonly lastBackup?: string;
  readonly diskUsage: number;
}

// Repository events for monitoring
export type ServerRepositoryEvent =
  | {
      readonly type: 'ServerCreated';
      readonly serverId: UUID;
      readonly timestamp: string;
    }
  | {
      readonly type: 'ServerUpdated';
      readonly serverId: UUID;
      readonly changes: readonly string[];
      readonly timestamp: string;
    }
  | {
      readonly type: 'ServerDeleted';
      readonly serverId: UUID;
      readonly timestamp: string;
    }
  | {
      readonly type: 'QueryExecuted';
      readonly query: string;
      readonly duration: number;
      readonly resultCount: number;
      readonly timestamp: string;
    }
  | {
      readonly type: 'CacheEvent';
      readonly action: 'hit' | 'miss' | 'invalidate';
      readonly key: string;
      readonly timestamp: string;
    };

// Advanced query builder interface
export interface IServerQueryBuilder {
  where(field: keyof MCPServer, operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin', value: unknown): IServerQueryBuilder;
  whereText(fields: readonly string[], query: string): IServerQueryBuilder;
  whereTags(tags: readonly string[], matchAll?: boolean): IServerQueryBuilder;
  whereStatus(status: readonly string[]): IServerQueryBuilder;
  whereCreatedBetween(start: string, end: string): IServerQueryBuilder;
  orderBy(field: keyof MCPServer, direction: 'asc' | 'desc'): IServerQueryBuilder;
  limit(count: number): IServerQueryBuilder;
  offset(count: number): IServerQueryBuilder;
  execute(): Promise<ServerRepositoryResult<ServerQueryResult>>;
  count(): Promise<ServerRepositoryResult<number>>;
  exists(): Promise<ServerRepositoryResult<boolean>>;
  stream(): Observable<MCPServer>;
}

// Repository decorators for cross-cutting concerns
export interface IServerRepositoryDecorator {
  decorate(repository: IServerRepository): IServerRepository;
}

// Common repository decorators
export interface IServerRepositoryCacheDecorator extends IServerRepositoryDecorator {
  readonly cacheSize: number;
  readonly cacheTtl: number;
  clearCache(): Promise<void>;
  getCacheStatistics(): {
    readonly hitRate: number;
    readonly size: number;
    readonly maxSize: number;
  };
}

export interface IServerRepositoryLoggingDecorator extends IServerRepositoryDecorator {
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  getLogStatistics(): {
    readonly totalQueries: number;
    readonly averageQueryTime: number;
    readonly errorRate: number;
  };
}

export interface IServerRepositoryMetricsDecorator extends IServerRepositoryDecorator {
  getMetrics(): ServerRepositoryStatistics;
  onEvent(callback: (event: ServerRepositoryEvent) => void): void;
}

// Repository migration interface
export interface IServerRepositoryMigration {
  readonly version: number;
  readonly description: string;
  up(repository: IServerRepository): Promise<void>;
  down(repository: IServerRepository): Promise<void>;
}

// Repository schema validation
export interface IServerRepositoryValidator {
  validateServer(server: unknown): ServerRepositoryResult<MCPServer>;
  validateCreateInput(input: unknown): ServerRepositoryResult<CreateServerInput>;
  validateUpdateInput(input: unknown): ServerRepositoryResult<UpdateServerInput>;
  validateFilters(filters: unknown): ServerRepositoryResult<ServerFilters>;
}