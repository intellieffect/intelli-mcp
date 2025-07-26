# API Reference

Complete API documentation for MCP Config Manager v2.

## 📋 Table of Contents

- [Core Types](#core-types)
- [Domain Entities](#domain-entities)
- [Service Interfaces](#service-interfaces)
- [React Components](#react-components)
- [IPC API](#ipc-api)
- [Utility Functions](#utility-functions)

## 🔢 Core Types

### Branded Types

```typescript
// Base branded type utility
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

// Core identifier types
type UUID = Brand<string, 'UUID'>;
type ServerName = Brand<string, 'ServerName'>;
type ConfigurationName = Brand<string, 'ConfigurationName'>;
type Command = Brand<string, 'Command'>;
type FilePath = Brand<string, 'FilePath'>;
type ISODateString = Brand<string, 'ISODateString'>;
type SemanticVersion = Brand<string, 'SemanticVersion'>;
type Checksum = Brand<string, 'Checksum'>;
type BackupId = Brand<string, 'BackupId'>;
type EnvironmentVariable = Brand<string, 'EnvironmentVariable'>;
type EnvironmentValue = Brand<string, 'EnvironmentValue'>;
```

### Result Type

```typescript
type Result<T, E = Error> = 
  | { kind: 'success'; value: T }
  | { kind: 'failure'; error: E };

// Utility functions
const success = <T>(value: T): Result<T> => ({ kind: 'success', value });
const failure = <E>(error: E): Result<never, E> => ({ kind: 'failure', error });

// Monadic operations
const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E>;

const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E>;
```

### Pagination and Query Types

```typescript
interface PaginationOptions {
  readonly page: number;
  readonly limit: number;
}

interface SortOptions<T = string> {
  readonly field: T;
  readonly direction: 'asc' | 'desc';
}

interface QueryResult<T> {
  readonly items: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
}
```

## 🏗 Domain Entities

### MCPServer

```typescript
interface MCPServer {
  readonly id: UUID;
  readonly name: ServerName;
  readonly description?: string;
  readonly configuration: ServerConfiguration;
  readonly status: ServerStatus;
  readonly healthCheck: HealthCheckConfig;
  readonly tags: readonly string[];
  readonly metrics: ServerMetrics;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly version: number; // for optimistic concurrency control
}
```

#### ServerConfiguration

```typescript
interface ServerConfiguration {
  readonly command: Command;
  readonly args: readonly string[];
  readonly workingDirectory?: string;
  readonly environment: ReadonlyMap<EnvironmentVariable, EnvironmentValue>;
  readonly autoRestart?: boolean;
  readonly retryLimit?: number;
  readonly timeout?: number; // milliseconds
}
```

#### ServerStatus

```typescript
type ServerStatus = 
  | {
      readonly kind: 'stopped';
      readonly since: ISODateString;
      readonly reason?: string;
    }
  | {
      readonly kind: 'starting';
      readonly since: ISODateString;
      readonly progress?: number; // 0-100
    }
  | {
      readonly kind: 'running';
      readonly since: ISODateString;
      readonly pid: number;
    }
  | {
      readonly kind: 'stopping';
      readonly since: ISODateString;
      readonly signal?: string;
    }
  | {
      readonly kind: 'error';
      readonly since: ISODateString;
      readonly error: ServerError;
      readonly retryCount: number;
    }
  | {
      readonly kind: 'idle';
      readonly since: ISODateString;
      readonly lastActivity?: ISODateString;
    };
```

#### ServerError

```typescript
interface ServerError {
  readonly code: string;
  readonly message: string;
  readonly timestamp: ISODateString;
  readonly details?: Record<string, unknown>;
  readonly stack?: string;
}
```

#### ServerMetrics

```typescript
interface ServerMetrics {
  readonly uptime: number; // milliseconds
  readonly restartCount: number;
  readonly memoryUsage?: number; // bytes
  readonly cpuUsage?: number; // percentage
  readonly networkConnections?: number;
  readonly requestCount?: number;
  readonly errorCount?: number;
  readonly lastHealthCheck?: ISODateString;
}
```

#### HealthCheckConfig

```typescript
interface HealthCheckConfig {
  readonly enabled: boolean;
  readonly interval: number; // milliseconds
  readonly timeout: number; // milliseconds
  readonly retries: number;
  readonly url?: string;
  readonly expectedStatus?: number;
  readonly command?: Command;
}
```

### MCPConfiguration

```typescript
interface MCPConfiguration {
  readonly id: UUID;
  readonly metadata: ConfigurationMetadata;
  readonly servers: ReadonlyMap<UUID, MCPServer>;
  readonly globalSettings: ConfigurationGlobalSettings;
  readonly validation: ConfigurationValidationResult;
  readonly statistics: ConfigurationStatistics;
  readonly filePath?: FilePath;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly version: number;
}
```

#### ConfigurationMetadata

```typescript
interface ConfigurationMetadata {
  readonly name: ConfigurationName;
  readonly description: string;
  readonly version: SemanticVersion;
  readonly author?: string;
  readonly tags: readonly string[];
  readonly checksum: Checksum;
}
```

#### ConfigurationGlobalSettings

```typescript
interface ConfigurationGlobalSettings {
  readonly autoStart: boolean;
  readonly autoBackup: boolean;
  readonly backupInterval: number; // milliseconds
  readonly maxBackups: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly logRetention: number; // days
  readonly healthCheckInterval: number; // milliseconds
  readonly networkTimeout: number; // milliseconds
  readonly securitySettings: ConfigurationSecuritySettings;
}
```

#### ConfigurationSecuritySettings

```typescript
interface ConfigurationSecuritySettings {
  readonly encryptSecrets: boolean;
  readonly requireAuthentication: boolean;
  readonly allowRemoteAccess: boolean;
  readonly trustedHosts: readonly string[];
  readonly certificatePath?: FilePath;
  readonly keyPath?: FilePath;
}
```

### Input Types

#### CreateServerInput

```typescript
interface CreateServerInput {
  readonly name: ServerName;
  readonly description?: string;
  readonly configuration: {
    readonly command: Command;
    readonly args?: readonly string[];
    readonly workingDirectory?: string;
    readonly environment?: ReadonlyMap<EnvironmentVariable, EnvironmentValue>;
    readonly autoRestart?: boolean;
    readonly retryLimit?: number;
    readonly timeout?: number;
  };
  readonly healthCheck?: Partial<HealthCheckConfig>;
  readonly tags?: readonly string[];
}
```

#### UpdateServerInput

```typescript
interface UpdateServerInput {
  readonly name?: ServerName;
  readonly description?: string;
  readonly configuration?: Partial<{
    readonly command: Command;
    readonly args: readonly string[];
    readonly workingDirectory: string;
    readonly environment: ReadonlyMap<EnvironmentVariable, EnvironmentValue>;
    readonly autoRestart: boolean;
    readonly retryLimit: number;
    readonly timeout: number;
  }>;
  readonly healthCheck?: Partial<HealthCheckConfig>;
  readonly tags?: readonly string[];
}
```

### Filter Types

#### ServerFilters

```typescript
interface ServerFilters {
  readonly name?: string;
  readonly status?: ServerStatus['kind'] | readonly ServerStatus['kind'][];
  readonly tags?: readonly string[];
  readonly command?: string;
  readonly createdAfter?: ISODateString;
  readonly createdBefore?: ISODateString;
  readonly hasErrors?: boolean;
  readonly isHealthy?: boolean;
}
```

## 🔧 Service Interfaces

### IServerService

```typescript
interface IServerService {
  /**
   * Retrieve servers with optional filtering, sorting, and pagination
   */
  getServers(
    filters?: ServerFilters,
    sort?: SortOptions<keyof MCPServer>,
    pagination?: PaginationOptions
  ): Promise<Result<ServerQueryResult>>;

  /**
   * Get a specific server by ID
   */
  getServer(id: UUID): Promise<Result<MCPServer | null>>;

  /**
   * Create a new server
   */
  createServer(input: CreateServerInput): Promise<Result<MCPServer>>;

  /**
   * Update an existing server
   */
  updateServer(id: UUID, input: UpdateServerInput): Promise<Result<MCPServer>>;

  /**
   * Delete a server
   */
  deleteServer(id: UUID): Promise<Result<void>>;

  /**
   * Start a server
   */
  startServer(id: UUID): Promise<Result<void>>;

  /**
   * Stop a server with optional reason
   */
  stopServer(id: UUID, reason?: string): Promise<Result<void>>;

  /**
   * Restart a server
   */
  restartServer(id: UUID): Promise<Result<void>>;

  /**
   * Get server logs
   */
  getServerLogs(id: UUID, options?: LogOptions): Promise<Result<readonly LogEntry[]>>;

  /**
   * Subscribe to server status updates
   */
  subscribeToStatusUpdates(id: UUID): Observable<ServerStatus>;

  /**
   * Subscribe to server metrics updates
   */
  subscribeToMetricsUpdates(id: UUID): Observable<ServerMetrics>;
}
```

#### ServerQueryResult

```typescript
interface ServerQueryResult {
  readonly servers: readonly MCPServer[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
  readonly filters: ServerFilters;
  readonly sort: SortOptions<keyof MCPServer>;
}
```

#### LogOptions

```typescript
interface LogOptions {
  readonly lines?: number;
  readonly since?: ISODateString;
  readonly until?: ISODateString;
  readonly level?: 'debug' | 'info' | 'warn' | 'error';
  readonly follow?: boolean;
}
```

#### LogEntry

```typescript
interface LogEntry {
  readonly timestamp: ISODateString;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly source?: string;
  readonly metadata?: Record<string, unknown>;
}
```

### IConfigurationService

```typescript
interface IConfigurationService {
  /**
   * Load configuration from file
   */
  loadConfiguration(filePath?: FilePath): Promise<Result<MCPConfiguration>>;

  /**
   * Save configuration to file
   */
  saveConfiguration(
    config: MCPConfiguration, 
    filePath?: FilePath
  ): Promise<Result<void>>;

  /**
   * Create a new configuration
   */
  createConfiguration(input: CreateConfigurationInput): Promise<Result<MCPConfiguration>>;

  /**
   * Update configuration
   */
  updateConfiguration(
    id: UUID, 
    input: UpdateConfigurationInput
  ): Promise<Result<MCPConfiguration>>;

  /**
   * Validate configuration
   */
  validateConfiguration(config: MCPConfiguration): Promise<Result<ConfigurationValidationResult>>;

  /**
   * Export configuration
   */
  exportConfiguration(
    config: MCPConfiguration,
    options: ConfigurationExportOptions
  ): Promise<Result<void>>;

  /**
   * Import configuration
   */
  importConfiguration(
    filePath: FilePath,
    options: ConfigurationImportOptions
  ): Promise<Result<MCPConfiguration>>;

  /**
   * Create backup
   */
  createBackup(config: MCPConfiguration): Promise<Result<ConfigurationBackup>>;

  /**
   * List available backups
   */
  listBackups(configId: UUID): Promise<Result<readonly ConfigurationBackup[]>>;

  /**
   * Restore from backup
   */
  restoreBackup(backupId: BackupId): Promise<Result<MCPConfiguration>>;
}
```

## ⚛️ React Components

### ServerCard

```typescript
interface ServerCardProps {
  /**
   * Server to display
   */
  server: MCPServer;

  /**
   * Server action handlers
   */
  onStart: (id: UUID) => void;
  onStop: (id: UUID) => void;
  onRestart: (id: UUID) => void;
  onEdit: (server: MCPServer) => void;
  onDelete: (id: UUID) => void;
  onToggleEnabled: (id: UUID, enabled: boolean) => void;

  /**
   * Loading states for different operations
   */
  loading?: Partial<Record<
    'starting' | 'stopping' | 'restarting' | 'editing' | 'deleting',
    boolean
  >>;

  /**
   * Error messages for different operations
   */
  errors?: Partial<Record<string, string>>;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Test identifier
   */
  'data-testid'?: string;
}

const ServerCard: React.FC<ServerCardProps>;
```

### ServerListView

```typescript
interface ServerListViewProps {
  /**
   * List of servers to display
   */
  servers: readonly MCPServer[];

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error message
   */
  error: string | null;

  /**
   * Total count for pagination
   */
  totalCount: number;

  /**
   * Current page
   */
  currentPage: number;

  /**
   * Page size
   */
  pageSize: number;

  /**
   * Current filters
   */
  filters: ServerFilters;

  /**
   * Current sort
   */
  sort: SortOptions<keyof MCPServer>;

  /**
   * Event handlers
   */
  onServerAction: (action: ServerAction) => void;
  onFiltersChange: (filters: ServerFilters) => void;
  onSortChange: (sort: SortOptions<keyof MCPServer>) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onCreateServer: () => void;

  /**
   * View configuration
   */
  viewMode?: 'grid' | 'list';
  showFilters?: boolean;
  showPagination?: boolean;
}

const ServerListView: React.FC<ServerListViewProps>;
```

### ServerEditDialog

```typescript
interface ServerEditDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;

  /**
   * Server to edit (undefined for create mode)
   */
  server?: MCPServer;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Error message
   */
  error?: string | null;

  /**
   * Event handlers
   */
  onClose: () => void;
  onSave: (input: CreateServerInput | UpdateServerInput) => void;
  onValidate?: (input: Partial<CreateServerInput>) => Promise<ValidationResult>;

  /**
   * Dialog configuration
   */
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

const ServerEditDialog: React.FC<ServerEditDialogProps>;
```

### Custom Hooks

#### useServerActions

```typescript
interface ServerActionHandlers {
  startServer: (id: UUID) => Promise<void>;
  stopServer: (id: UUID, reason?: string) => Promise<void>;
  restartServer: (id: UUID) => Promise<void>;
  editServer: (server: MCPServer) => void;
  deleteServer: (id: UUID) => Promise<void>;
  toggleEnabled: (id: UUID, enabled: boolean) => Promise<void>;
}

interface UseServerActionsOptions {
  onSuccess?: (action: string, serverId: UUID) => void;
  onError?: (action: string, serverId: UUID, error: string) => void;
}

const useServerActions = (options?: UseServerActionsOptions): ServerActionHandlers;
```

#### useServerStatus

```typescript
interface UseServerStatusResult {
  status: ServerStatus;
  isLoading: boolean;
  error: string | null;
  lastUpdated: ISODateString | null;
}

const useServerStatus = (serverId: UUID): UseServerStatusResult;
```

#### useServerMetrics

```typescript
interface UseServerMetricsResult {
  metrics: ServerMetrics;
  isLoading: boolean;
  error: string | null;
  lastUpdated: ISODateString | null;
}

const useServerMetrics = (serverId: UUID): UseServerMetricsResult;
```

## 🔌 IPC API

### File Operations

```typescript
// Main process handlers
ipcMain.handle('file:read', async (event, filePath: string): Promise<IPCResult<string>>);
ipcMain.handle('file:write', async (event, filePath: string, content: string): Promise<IPCResult<void>>);
ipcMain.handle('file:exists', async (event, filePath: string): Promise<IPCResult<boolean>>);
ipcMain.handle('file:showOpenDialog', async (event, options: OpenDialogOptions): Promise<IPCResult<OpenDialogReturnValue>>);
ipcMain.handle('file:showSaveDialog', async (event, options: SaveDialogOptions): Promise<IPCResult<SaveDialogReturnValue>>);

// Renderer process API
interface ElectronFileAPI {
  read(filePath: string): Promise<IPCResult<string>>;
  write(filePath: string, content: string): Promise<IPCResult<void>>;
  exists(filePath: string): Promise<IPCResult<boolean>>;
  showOpenDialog(options: OpenDialogOptions): Promise<IPCResult<OpenDialogReturnValue>>;
  showSaveDialog(options: SaveDialogOptions): Promise<IPCResult<SaveDialogReturnValue>>;
}
```

### Server Operations

```typescript
// Main process handlers
ipcMain.handle('server:start', async (event, serverId: UUID): Promise<IPCResult<void>>);
ipcMain.handle('server:stop', async (event, serverId: UUID, reason?: string): Promise<IPCResult<void>>);
ipcMain.handle('server:restart', async (event, serverId: UUID): Promise<IPCResult<void>>);
ipcMain.handle('server:getLogs', async (event, serverId: UUID, options?: LogOptions): Promise<IPCResult<LogEntry[]>>);

// Renderer process API
interface ElectronServerAPI {
  start(serverId: UUID): Promise<IPCResult<void>>;
  stop(serverId: UUID, reason?: string): Promise<IPCResult<void>>;
  restart(serverId: UUID): Promise<IPCResult<void>>;
  getLogs(serverId: UUID, options?: LogOptions): Promise<IPCResult<LogEntry[]>>;
}
```

### Configuration Operations

```typescript
// Main process handlers
ipcMain.handle('config:load', async (event, filePath?: string): Promise<IPCResult<MCPConfiguration>>);
ipcMain.handle('config:save', async (event, config: MCPConfiguration, filePath?: string): Promise<IPCResult<void>>);
ipcMain.handle('config:validate', async (event, config: MCPConfiguration): Promise<IPCResult<ConfigurationValidationResult>>);
ipcMain.handle('config:export', async (event, config: MCPConfiguration, options: ConfigurationExportOptions): Promise<IPCResult<void>>);
ipcMain.handle('config:import', async (event, filePath: string, options: ConfigurationImportOptions): Promise<IPCResult<MCPConfiguration>>);

// Renderer process API
interface ElectronConfigAPI {
  load(filePath?: string): Promise<IPCResult<MCPConfiguration>>;
  save(config: MCPConfiguration, filePath?: string): Promise<IPCResult<void>>;
  validate(config: MCPConfiguration): Promise<IPCResult<ConfigurationValidationResult>>;
  export(config: MCPConfiguration, options: ConfigurationExportOptions): Promise<IPCResult<void>>;
  import(filePath: string, options: ConfigurationImportOptions): Promise<IPCResult<MCPConfiguration>>;
}
```

### System Operations

```typescript
// Main process handlers
ipcMain.handle('system:getInfo', async (): Promise<IPCResult<SystemInfo>>);
ipcMain.handle('system:showMessageBox', async (event, options: MessageBoxOptions): Promise<IPCResult<MessageBoxReturnValue>>);
ipcMain.handle('system:showErrorBox', async (event, title: string, content: string): Promise<IPCResult<void>>);
ipcMain.handle('system:getVersion', async (): Promise<IPCResult<string>>);
ipcMain.handle('system:quit', async (): Promise<IPCResult<void>>);

// Renderer process API
interface ElectronSystemAPI {
  getInfo(): Promise<IPCResult<SystemInfo>>;
  showMessageBox(options: MessageBoxOptions): Promise<IPCResult<MessageBoxReturnValue>>;
  showErrorBox(title: string, content: string): Promise<IPCResult<void>>;
  getVersion(): Promise<IPCResult<string>>;
  quit(): Promise<IPCResult<void>>;
}
```

### IPC Types

```typescript
interface IPCResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
}
```

## 🛠 Utility Functions

### Type Guards

```typescript
const isUUID = (value: string): value is UUID;
const isServerName = (value: string): value is ServerName;
const isValidServerName = (name: string): name is ServerName;
const isISODateString = (value: string): value is ISODateString;
const isFilePath = (value: string): value is FilePath;
```

### Type Constructors

```typescript
const createUUID = (value?: string): UUID;
const createServerName = (value: string): ServerName;
const createFilePath = (value: string): FilePath;
const createISODateString = (date?: Date): ISODateString;
```

### Server Utilities

```typescript
const createServerStatus = (
  kind: ServerStatus['kind'],
  options?: Partial<ServerStatus>
): ServerStatus;

const getServerStatusDisplay = (status: ServerStatus): string;

const isServerRunning = (server: MCPServer): boolean;
const isServerHealthy = (server: MCPServer): boolean;
const getServerUptime = (server: MCPServer): number;

const validateServerConfiguration = (
  config: ServerConfiguration
): ValidationResult;
```

### Configuration Utilities

```typescript
const calculateConfigurationChecksum = (
  config: Omit<MCPConfiguration, 'metadata' | 'statistics' | 'validation'>
): Checksum;

const isConfigurationValid = (
  validation: ConfigurationValidationResult
): validation is Extract<ConfigurationValidationResult, { isValid: true }>;

const getConfigurationErrorCount = (
  validation: ConfigurationValidationResult
): number;

const isConfigurationOutdated = (
  config: MCPConfiguration,
  currentVersion: SemanticVersion
): boolean;
```

### Result Utilities

```typescript
const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E>;

const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E>;

const combineResults = <T extends readonly unknown[], E>(
  results: { [K in keyof T]: Result<T[K], E> }
): Result<T, E>;

const resultToPromise = <T, E>(result: Result<T, E>): Promise<T>;
```

### Validation Utilities

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: readonly ValidationError[];
  warnings: readonly ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

const validateRequired = <T>(value: T | null | undefined, field: string): ValidationError | null;
const validateMinLength = (value: string, minLength: number, field: string): ValidationError | null;
const validateMaxLength = (value: string, maxLength: number, field: string): ValidationError | null;
const validatePattern = (value: string, pattern: RegExp, field: string): ValidationError | null;
const validateEnum = <T>(value: T, allowedValues: readonly T[], field: string): ValidationError | null;
```

This API reference provides comprehensive documentation for all public interfaces, types, and functions in the MCP Config Manager v2 application.