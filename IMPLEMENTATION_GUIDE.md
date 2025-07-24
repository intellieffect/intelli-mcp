# MCP Config Manager - Implementation Guide

## Project Setup

### 1. Initialize Electron-React Project
```bash
# Create project directory
mkdir mcp-config-manager && cd mcp-config-manager

# Initialize package.json
npm init -y

# Install core dependencies
npm install --save \
  electron \
  react \
  react-dom \
  @types/react \
  @types/react-dom \
  typescript

# Install dev dependencies
npm install --save-dev \
  @electron-forge/cli \
  @electron-forge/maker-deb \
  @electron-forge/maker-rpm \
  @electron-forge/maker-squirrel \
  @electron-forge/maker-zip \
  @electron-forge/plugin-webpack \
  @electron-forge/webpack-plugin-typescript \
  electron-devtools-installer

# Initialize Electron Forge
npx electron-forge import
```

### 2. Configure TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "out"]
}
```

### 3. Setup Shadcn UI
```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Shadcn UI dependencies
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label @radix-ui/react-select
npm install @radix-ui/react-tooltip @radix-ui/react-tabs

# Create components.json for Shadcn
```

## Directory Structure
```
mcp-config-manager/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Entry point
│   │   ├── ipc/            # IPC handlers
│   │   ├── services/       # Business logic
│   │   ├── security/       # Security utilities
│   │   └── utils/          # Helper functions
│   ├── renderer/            # React application
│   │   ├── App.tsx         # Root component
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── store/         # State management
│   │   └── utils/         # Frontend utilities
│   └── shared/             # Shared types/constants
│       ├── types.ts       # TypeScript interfaces
│       ├── constants.ts   # App constants
│       └── schemas.ts     # Validation schemas
├── forge.config.js         # Electron Forge config
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Core Implementation Steps

### Phase 1: Foundation (Week 1-2)

#### 1.1 Main Process Setup
```typescript
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { setupSecurityPolicy } from './security/policy';
import { registerIPCHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  setupSecurityPolicy(mainWindow);
  await mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();
});
```

#### 1.2 Security Implementation
```typescript
// src/main/security/policy.ts
export function setupSecurityPolicy(window: BrowserWindow) {
  // Content Security Policy
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "font-src 'self'"
        ].join('; ')
      }
    });
  });

  // Disable navigation to external URLs
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });
}
```

#### 1.3 File System Service
```typescript
// src/main/services/fileSystem.ts
import { promises as fs } from 'fs';
import path from 'path';
import { platform } from 'os';

export class FileSystemService {
  private configPath: string;

  constructor() {
    this.configPath = this.getConfigPath();
  }

  private getConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    
    switch (platform()) {
      case 'darwin':
        return path.join(homeDir, 'Library/Application Support/Claude/claude_desktop_config.json');
      case 'win32':
        return path.join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json');
      default:
        return path.join(homeDir, '.config/Claude/claude_desktop_config.json');
    }
  }

  async readConfig(): Promise<any> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { mcpServers: {} };
      }
      throw error;
    }
  }

  async writeConfig(config: any): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }
}
```

### Phase 2: Core Features (Week 3-4)

#### 2.1 IPC Communication
```typescript
// src/main/ipc/handlers.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { FileSystemService } from '../services/fileSystem';
import { ValidationService } from '../services/validation';
import { BackupService } from '../services/backup';

const fileSystem = new FileSystemService();
const validation = new ValidationService();
const backup = new BackupService();

export function registerIPCHandlers() {
  // Config operations
  ipcMain.handle('config:read', async () => {
    return await fileSystem.readConfig();
  });

  ipcMain.handle('config:write', async (event, config) => {
    // Validate before writing
    const validationResult = await validation.validateConfig(config);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Create backup before writing
    await backup.createBackup();
    
    // Write config
    await fileSystem.writeConfig(config);
    
    return { success: true };
  });

  // Backup operations
  ipcMain.handle('backup:list', async () => {
    return await backup.listBackups();
  });

  ipcMain.handle('backup:restore', async (event, backupId) => {
    return await backup.restoreBackup(backupId);
  });
}
```

#### 2.2 Validation Service
```typescript
// src/main/services/validation.ts
import Ajv from 'ajv';

export class ValidationService {
  private ajv: Ajv;
  
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    const schema = {
      type: 'object',
      properties: {
        mcpServers: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z0-9_-]+$': {
              type: 'object',
              required: ['command'],
              properties: {
                command: { type: 'string', minLength: 1 },
                args: { type: 'array', items: { type: 'string' } },
                env: { type: 'object' }
              }
            }
          }
        }
      }
    };

    const valid = this.ajv.validate(schema, config);
    
    return {
      valid: !!valid,
      errors: this.ajv.errors?.map(e => e.message || '') || []
    };
  }
}
```

### Phase 3: UI Implementation (Week 5-6)

#### 3.1 React Application Setup
```tsx
// src/renderer/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { MainLayout } from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MainLayout />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

#### 3.2 Server List Component
```tsx
// src/renderer/components/ServerList.tsx
import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ServerCard } from './ServerCard';
import { useMCPServers } from '../hooks/useMCPServers';

export function ServerList() {
  const { servers, reorderServers, deleteServer } = useMCPServers();

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      reorderServers(active.id, over.id);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={servers} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onDelete={() => deleteServer(server.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

### Phase 4: Testing & Polish (Week 7-8)

#### 4.1 Unit Testing Setup
```typescript
// src/main/services/__tests__/fileSystem.test.ts
import { FileSystemService } from '../fileSystem';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('FileSystemService', () => {
  let service: FileSystemService;

  beforeEach(() => {
    service = new FileSystemService();
    jest.clearAllMocks();
  });

  test('readConfig returns parsed JSON', async () => {
    const mockConfig = { mcpServers: { test: { command: 'test' } } };
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    const result = await service.readConfig();
    
    expect(result).toEqual(mockConfig);
  });

  test('readConfig returns default config on ENOENT', async () => {
    const error = new Error('File not found') as any;
    error.code = 'ENOENT';
    (fs.readFile as jest.Mock).mockRejectedValue(error);

    const result = await service.readConfig();
    
    expect(result).toEqual({ mcpServers: {} });
  });
});
```

#### 4.2 E2E Testing
```typescript
// e2e/app.test.ts
import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';

test('app launches and displays main window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  
  // Check window title
  const title = await window.title();
  expect(title).toBe('MCP Config Manager');
  
  // Check main elements are visible
  await expect(window.locator('text=MCP Servers')).toBeVisible();
  await expect(window.locator('button:has-text("Add Server")')).toBeVisible();
  
  await app.close();
});
```

## Security Hardening Checklist

- [ ] Enable context isolation in all renderer processes
- [ ] Implement CSP headers
- [ ] Validate all IPC inputs
- [ ] Sanitize file paths to prevent traversal
- [ ] Implement rate limiting for IPC calls
- [ ] Use electron-forge for code signing
- [ ] Enable auto-updater with signature verification
- [ ] Implement telemetry opt-in
- [ ] Add security headers for all web requests
- [ ] Regular dependency updates and audits

## Performance Optimization

1. **Lazy Loading**
   - Load templates on demand
   - Defer backup list loading
   - Code split by route

2. **Caching Strategy**
   - Cache config reads (5 min TTL)
   - Cache template metadata
   - Memoize expensive computations

3. **Rendering Optimization**
   - Virtual scrolling for large lists
   - Debounce validation (300ms)
   - Optimize re-renders with React.memo

## Deployment

### macOS
```bash
# Build and sign
npm run make -- --platform=darwin --arch=x64,arm64

# Notarize
xcrun notarytool submit dist/MCP-Config-Manager.dmg \
  --apple-id "your-apple-id" \
  --team-id "your-team-id" \
  --wait
```

### Windows
```bash
# Build and sign
npm run make -- --platform=win32 --arch=x64

# Sign with certificate
signtool sign /f certificate.pfx /p password dist/MCP-Config-Manager.exe
```

### Linux
```bash
# Build packages
npm run make -- --platform=linux --arch=x64

# Creates .deb, .rpm, and AppImage
```

## Monitoring & Analytics

```typescript
// src/renderer/utils/analytics.ts
export class Analytics {
  static track(event: string, properties?: Record<string, any>) {
    if (!userSettings.analyticsEnabled) return;
    
    // Send to analytics service
    fetch('https://analytics.your-domain.com/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        properties,
        timestamp: Date.now(),
        sessionId: getSessionId(),
      }),
    });
  }
}
```

## Future Enhancements

1. **Plugin System**
   - Dynamic plugin loading
   - Plugin marketplace
   - API for third-party extensions

2. **Cloud Sync**
   - Encrypted config backup
   - Multi-device sync
   - Collaboration features

3. **Advanced Features**
   - Config versioning
   - A/B testing for configs
   - Performance profiling
   - AI-powered suggestions