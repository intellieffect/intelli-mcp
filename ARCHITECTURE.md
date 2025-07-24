# MCP Config Manager - System Architecture

## Overview

The MCP Config Manager is a secure, cross-platform Electron application for managing Claude Desktop's MCP server configurations through an intuitive GUI.

## Core Architecture Principles

### 1. Security First
- **Principle of Least Privilege**: Minimal permissions for file operations
- **Sandboxed Execution**: Isolated processes for config manipulation
- **Input Validation**: All user inputs sanitized before processing
- **Secure IPC**: Encrypted communication between renderer and main process

### 2. Layered Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│                   (React + Shadcn UI)                   │
├─────────────────────────────────────────────────────────┤
│                  Application Logic Layer                 │
│              (Business Logic & Validation)              │
├─────────────────────────────────────────────────────────┤
│                      Service Layer                       │
│        (Config Service, Backup Service, etc.)           │
├─────────────────────────────────────────────────────────┤
│                   Data Access Layer                      │
│              (File System Abstraction)                  │
├─────────────────────────────────────────────────────────┤
│                    Security Layer                        │
│          (Permissions, Validation, Sandboxing)          │
└─────────────────────────────────────────────────────────┘
```

## System Components

### Main Process (Electron)
```typescript
interface MainProcessArchitecture {
  // Core Services
  configService: ConfigurationService;
  fileSystemService: FileSystemService;
  backupService: BackupService;
  validationService: ValidationService;
  
  // Security Components
  permissionManager: PermissionManager;
  sandboxManager: SandboxManager;
  
  // IPC Handlers
  ipcHandlers: Map<string, IPCHandler>;
}
```

### Renderer Process (React)
```typescript
interface RendererArchitecture {
  // UI Components
  components: {
    ServerList: React.FC;
    ServerEditor: React.FC;
    TemplateGallery: React.FC;
    BackupManager: React.FC;
  };
  
  // State Management
  store: ReduxStore | ZustandStore;
  
  // Services
  ipcBridge: IPCBridge;
  validationClient: ValidationClient;
}
```

## Data Flow Architecture

### Read Operation Flow
```
User Request → Renderer → IPC → Main Process
                                     ↓
                              Permission Check
                                     ↓
                              File System Read
                                     ↓
                                Validation
                                     ↓
                              Sanitization
                                     ↓
User Display ← Renderer ← IPC ← Response
```

### Write Operation Flow
```
User Input → Validation → Backup Current
                              ↓
                        Permission Check
                              ↓
                         Write Attempt
                              ↓
                    Verification & Rollback
                              ↓
                      Success/Error Response
```

## Security Architecture

### 1. Process Isolation
```typescript
// Main process security context
const securityContext = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false
};
```

### 2. Permission System
```typescript
interface PermissionSystem {
  // File access permissions
  filePermissions: {
    read: string[];  // Allowed read paths
    write: string[]; // Allowed write paths
    execute: never;  // No execution permissions
  };
  
  // Operation permissions
  operations: {
    backup: boolean;
    restore: boolean;
    modify: boolean;
    delete: boolean;
  };
}
```

### 3. Input Validation Schema
```typescript
const configSchema = {
  type: "object",
  properties: {
    mcpServers: {
      type: "object",
      patternProperties: {
        "^[a-zA-Z0-9_-]+$": {
          type: "object",
          required: ["command"],
          properties: {
            command: { type: "string" },
            args: { type: "array" },
            env: { type: "object" }
          }
        }
      }
    }
  }
};
```

## IPC Communication Design

### Secure IPC Channels
```typescript
// Channel definitions with type safety
enum IPCChannels {
  // Config operations
  CONFIG_READ = 'config:read',
  CONFIG_WRITE = 'config:write',
  CONFIG_VALIDATE = 'config:validate',
  
  // Backup operations
  BACKUP_CREATE = 'backup:create',
  BACKUP_RESTORE = 'backup:restore',
  BACKUP_LIST = 'backup:list',
  
  // Template operations
  TEMPLATE_LOAD = 'template:load',
  TEMPLATE_APPLY = 'template:apply'
}

// Type-safe IPC handler
interface IPCHandler<T, R> {
  channel: IPCChannels;
  validate: (data: T) => boolean;
  handle: (data: T) => Promise<R>;
  sanitize: (result: R) => R;
}
```

## File System Abstraction Layer

### Platform-Agnostic File Operations
```typescript
interface FileSystemAbstraction {
  // Platform-specific path resolution
  getConfigPath(): Promise<string>;
  
  // Safe file operations
  readConfig(): Promise<ConfigData>;
  writeConfig(data: ConfigData): Promise<void>;
  
  // Backup operations
  createBackup(): Promise<BackupMetadata>;
  restoreBackup(id: string): Promise<void>;
  
  // Validation
  validatePath(path: string): boolean;
  checkPermissions(path: string): Promise<Permissions>;
}

// Platform implementations
class MacOSFileSystem implements FileSystemAbstraction {
  getConfigPath(): Promise<string> {
    return path.join(
      process.env.HOME,
      'Library/Application Support/Claude/claude_desktop_config.json'
    );
  }
}

class WindowsFileSystem implements FileSystemAbstraction {
  getConfigPath(): Promise<string> {
    return path.join(
      process.env.APPDATA,
      'Claude/claude_desktop_config.json'
    );
  }
}

class LinuxFileSystem implements FileSystemAbstraction {
  getConfigPath(): Promise<string> {
    return path.join(
      process.env.HOME,
      '.config/Claude/claude_desktop_config.json'
    );
  }
}
```

## State Management Architecture

### Application State Structure
```typescript
interface AppState {
  // Configuration state
  config: {
    current: ConfigData | null;
    modified: boolean;
    validationErrors: ValidationError[];
  };
  
  // Backup state
  backups: {
    list: BackupMetadata[];
    autoBackupEnabled: boolean;
    lastBackup: Date | null;
  };
  
  // UI state
  ui: {
    selectedServer: string | null;
    isLoading: boolean;
    error: AppError | null;
    theme: 'light' | 'dark' | 'system';
  };
  
  // Template state
  templates: {
    available: Template[];
    loading: boolean;
  };
}
```

## Error Handling & Recovery

### Error Hierarchy
```typescript
abstract class AppError extends Error {
  abstract readonly severity: 'low' | 'medium' | 'high' | 'critical';
  abstract readonly recoverable: boolean;
  abstract readonly userMessage: string;
}

class ConfigReadError extends AppError {
  severity = 'high' as const;
  recoverable = true;
  userMessage = 'Unable to read configuration file';
}

class ConfigWriteError extends AppError {
  severity = 'critical' as const;
  recoverable = true;
  userMessage = 'Failed to save configuration';
}

class ValidationError extends AppError {
  severity = 'medium' as const;
  recoverable = true;
  userMessage = 'Configuration validation failed';
}
```

### Recovery Strategies
```typescript
interface RecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError): Promise<void>;
}

class BackupRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: AppError): boolean {
    return error instanceof ConfigWriteError && error.recoverable;
  }
  
  async recover(error: AppError): Promise<void> {
    // Attempt to restore from last backup
    const lastBackup = await this.backupService.getLatest();
    if (lastBackup) {
      await this.backupService.restore(lastBackup.id);
    }
  }
}
```

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Load templates and backups on demand
2. **Debounced Validation**: Validate after user stops typing
3. **Incremental Updates**: Only update changed portions
4. **Caching**: Cache file reads with TTL
5. **Virtual Scrolling**: For large server lists

### Performance Targets
- Config read: < 50ms
- Config write: < 100ms
- Validation: < 20ms
- UI response: < 16ms (60 FPS)
- Startup time: < 2s

## Testing Architecture

### Test Pyramid
```
         E2E Tests
        /    |    \
   Integration Tests
   /    |    |    \
Unit Tests (80% coverage)
```

### Test Categories
1. **Unit Tests**: Individual components and functions
2. **Integration Tests**: IPC communication, file operations
3. **E2E Tests**: Complete user workflows
4. **Security Tests**: Permission boundaries, input validation
5. **Performance Tests**: Operation benchmarks

## Deployment Architecture

### Build Pipeline
```yaml
stages:
  - lint
  - test
  - security-scan
  - build
  - sign
  - package
  - distribute
```

### Platform-Specific Packaging
- **macOS**: DMG with notarization
- **Windows**: MSI with code signing
- **Linux**: AppImage, DEB, RPM

## Monitoring & Analytics

### Telemetry (Privacy-Focused)
- Error rates (anonymized)
- Feature usage (opt-in)
- Performance metrics
- Crash reports

### Health Checks
- Config file accessibility
- Backup system status
- Template server connectivity
- Update availability

## Future Extensibility

### Plugin Architecture
```typescript
interface MCPPlugin {
  id: string;
  name: string;
  version: string;
  
  // Lifecycle hooks
  onInstall(): Promise<void>;
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  
  // Extension points
  validateConfig?(config: ConfigData): ValidationResult;
  transformConfig?(config: ConfigData): ConfigData;
  provideTemplates?(): Template[];
}
```

### Extension Points
1. Custom validators
2. Config transformers
3. Template providers
4. UI themes
5. Export formats