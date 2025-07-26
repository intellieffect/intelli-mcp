# MCP Config Manager v2

Advanced configuration manager for Model Context Protocol (MCP) servers with type-safe architecture, comprehensive testing, and modern UI.

## 🚀 Features

### ⚡ Type-Safe Architecture
- **Strict TypeScript**: 95%+ type coverage with branded types and exhaustive checking
- **Domain-Driven Design**: Clean architecture with clear separation of concerns
- **Dependency Injection**: Modular design with IoC container
- **Result Type Pattern**: Error handling without exceptions

### 🎨 Modern UI/UX
- **Material-UI Components**: Consistent design system with theming
- **Full Accessibility**: WCAG 2.1 AA compliance with keyboard navigation
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark/Light Themes**: System preference detection with manual override

### 🔒 Security & Quality
- **Security by Default**: Input validation, CSP, and secure defaults
- **Comprehensive Testing**: Unit, integration, component, E2E, and accessibility tests
- **Quality Gates**: 85%+ code coverage, 95%+ type coverage, linting, and validation
- **Error Boundaries**: Graceful error handling with recovery mechanisms

### 🛠 Developer Experience
- **Hot Module Replacement**: Fast development iteration
- **Automated Testing**: Jest, React Testing Library, and Playwright
- **CI/CD Pipeline**: GitHub Actions with automated deployment
- **Docker Support**: Multi-stage builds with production optimization

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Installation

### Prerequisites

- **Node.js**: 18.0.0 or later
- **npm**: 9.0.0 or later
- **Git**: Latest version

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/claude-code/mcp-config-manager-v2.git
cd mcp-config-manager-v2

# Install dependencies
npm install

# Verify installation
npm run typecheck
npm run lint
npm test
```

## 🚀 Quick Start

### Development Mode

```bash
# Start development server
npm run dev

# Or start individual processes
npm run dev:main      # Electron main process
npm run dev:renderer  # React renderer process
```

The application will open automatically at `http://localhost:3000` (renderer) and launch the Electron window.

### Production Build

```bash
# Build for production
npm run build

# Start production application
npm start
```

### Using Docker

```bash
# Development
docker-compose --profile dev up

# Production
docker-compose --profile production up -d

# Full stack with monitoring
docker-compose --profile full --profile monitoring up -d
```

## 🛠 Development

### Project Structure

```
src/
├── core/                 # Domain logic and services
│   ├── application/      # Application services
│   ├── domain/          # Domain entities and repositories
│   └── infrastructure/  # Infrastructure implementations
├── main/                # Electron main process
│   ├── ipc/            # IPC handlers
│   └── utils/          # Utilities (logging, security)
├── shared/             # Shared types and utilities
│   ├── constants/      # Application constants
│   ├── types/         # Type definitions
│   └── utils/         # Utility functions
├── test/              # Test utilities and setup
│   ├── mocks/         # Mock data and services
│   └── utils/         # Test helpers
└── ui/                # React renderer process
    ├── components/    # React components
    ├── hooks/         # Custom React hooks
    ├── pages/         # Page components
    └── stores/        # Redux stores
```

### Key Technologies

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Electron 31+ | Cross-platform desktop application |
| **Frontend** | React 18 | Modern UI with hooks and concurrent features |
| **Language** | TypeScript 5.5+ | Type safety and developer experience |
| **State** | Redux Toolkit | Predictable state management |
| **UI Library** | Material-UI 5 | Consistent design system |
| **Testing** | Jest + RTL + Playwright | Comprehensive test coverage |
| **Build** | Webpack 5 | Module bundling and optimization |

### Development Scripts

```bash
# Development
npm run dev              # Start development environment
npm run dev:main         # Main process only
npm run dev:renderer     # Renderer process only

# Building
npm run build           # Production build
npm run build:main      # Main process build
npm run build:renderer  # Renderer process build
npm run clean          # Clean build artifacts

# Quality Assurance
npm run lint           # ESLint check
npm run lint:fix       # Fix ESLint issues
npm run typecheck      # TypeScript type checking
npm run validate       # Run all quality checks

# Testing (see Testing section for details)
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Packaging
npm run package       # Package for current platform
npm run package:all   # Package for all platforms
```

## 🧪 Testing

### Test Categories

1. **Unit Tests**: Domain entities and pure functions
2. **Integration Tests**: Service layer and Redux stores
3. **Component Tests**: React components with accessibility
4. **E2E Tests**: Full application workflows
5. **Accessibility Tests**: WCAG compliance validation

### Running Tests

```bash
# Run all tests
npm test

# Specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:component      # Component tests only
npm run test:accessibility  # Accessibility tests only
npm run test:e2e           # End-to-end tests

# Coverage and reports
npm run test:coverage      # Generate coverage report
npm run type-coverage      # Check type coverage
./scripts/test-coverage.sh # Comprehensive test suite
```

### Coverage Requirements

- **Code Coverage**: ≥85% (lines, branches, functions, statements)
- **Type Coverage**: ≥95% (TypeScript type safety)
- **Accessibility**: 100% WCAG 2.1 AA compliance

### Writing Tests

```typescript
// Unit test example
describe('Server Entity', () => {
  it('should validate server name correctly', () => {
    expect(isValidServerName('valid-server')).toBe(true);
    expect(isValidServerName('')).toBe(false);
  });
});

// Component test with accessibility
describe('ServerCard Component', () => {
  it('should have no accessibility violations', async () => {
    const { container } = renderWithProviders(
      <ServerCard server={mockServer} {...handlers} />
    );
    await checkAccessibility(container);
  });
});
```

## 🚀 Deployment

### Development Deployment

```bash
# Using npm scripts
npm run dev

# Using Docker
docker-compose --profile dev up
```

### Production Deployment

```bash
# Using deployment script
./scripts/deploy.sh production

# Manual Docker deployment
docker-compose --profile production up -d

# With monitoring
docker-compose --profile production --profile monitoring up -d
```

### Environment Configuration

Create environment files for different deployments:

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug

# .env.production
NODE_ENV=production
LOG_LEVEL=warn
POSTGRES_PASSWORD=your-secure-password
REDIS_PASSWORD=your-redis-password
```

### CI/CD Pipeline

The project includes GitHub Actions workflows:

- **CI**: Runs on push/PR to main/develop branches
  - Linting and type checking
  - Unit, integration, and component tests
  - Security audit and CodeQL analysis
  - Cross-platform build verification

- **Release**: Runs on version tags
  - Full test suite execution
  - Multi-platform package creation
  - GitHub release with artifacts
  - npm package publishing
  - Documentation deployment

### Monitoring

When deployed with monitoring profile:

- **Application**: http://localhost:3000
- **Grafana Dashboard**: http://localhost:3002
- **Prometheus Metrics**: http://localhost:9090
- **Log Aggregation**: http://localhost:3100 (Loki)

## 🏗 Architecture

### Domain-Driven Design

The application follows DDD principles with clear boundaries:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Presentation  │  │   Application   │  │     Domain      │
│                 │  │                 │  │                 │
│ • React UI      │─▶│ • Services      │─▶│ • Entities      │
│ • Redux Stores  │  │ • Use Cases     │  │ • Repositories  │
│ • Components    │  │ • DTOs          │  │ • Value Objects │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Infrastructure  │
                    │                 │
                    │ • File System   │
                    │ • IPC           │
                    │ • External APIs │
                    └─────────────────┘
```

### Type Safety

The application uses branded types for enhanced type safety:

```typescript
// Branded types prevent accidental misuse
type UUID = string & { readonly brand: unique symbol };
type ServerName = string & { readonly brand: unique symbol };
type ISODateString = string & { readonly brand: unique symbol };

// Result type for error handling without exceptions
type Result<T, E = Error> = 
  | { kind: 'success'; value: T }
  | { kind: 'failure'; error: E };
```

### State Management

Redux Toolkit with strict typing:

```typescript
// Type-safe slice definition
const serverSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    updateServerStatus: (state, action: PayloadAction<{
      id: UUID;
      status: ServerStatus;
    }>) => {
      // Type-safe state updates with Immer
    }
  },
});
```

### Security Measures

- **Input Validation**: All user inputs validated with Zod schemas
- **Content Security Policy**: Strict CSP headers for XSS prevention
- **Path Traversal Protection**: File system access validation
- **Secure Defaults**: Principle of least privilege throughout
- **Error Handling**: No sensitive information in error messages

## 📚 API Reference

### Core Entities

#### MCPServer

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
  readonly version: number;
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
  readonly timeout?: number;
}
```

### Service Layer

#### ServerService

```typescript
interface IServerService {
  getServers(
    filters?: ServerFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<ServerQueryResult>>;
  
  getServer(id: UUID): Promise<Result<MCPServer>>;
  createServer(input: CreateServerInput): Promise<Result<MCPServer>>;
  updateServer(id: UUID, input: UpdateServerInput): Promise<Result<MCPServer>>;
  deleteServer(id: UUID): Promise<Result<void>>;
  
  startServer(id: UUID): Promise<Result<void>>;
  stopServer(id: UUID, reason?: string): Promise<Result<void>>;
  restartServer(id: UUID): Promise<Result<void>>;
}
```

### React Components

#### ServerCard

```typescript
interface ServerCardProps {
  server: MCPServer;
  onStart: (id: UUID) => void;
  onStop: (id: UUID) => void;
  onRestart: (id: UUID) => void;
  onEdit: (server: MCPServer) => void;
  onDelete: (id: UUID) => void;
  onToggleEnabled: (id: UUID, enabled: boolean) => void;
  loading?: Partial<Record<'starting' | 'stopping' | 'restarting', boolean>>;
  errors?: Partial<Record<string, string>>;
  className?: string;
  'data-testid'?: string;
}
```

### IPC API

#### File Operations

```typescript
// Main process handlers
ipcMain.handle('file:read', async (event, filePath: string) => Result<string>);
ipcMain.handle('file:write', async (event, filePath: string, content: string) => Result<void>);
ipcMain.handle('file:exists', async (event, filePath: string) => Result<boolean>);

// Renderer process usage
const content = await window.electronAPI.file.read('/path/to/file');
```

#### Server Operations

```typescript
// Start/stop/restart servers
ipcMain.handle('server:start', async (event, serverId: UUID) => Result<void>);
ipcMain.handle('server:stop', async (event, serverId: UUID, reason?: string) => Result<void>);
ipcMain.handle('server:restart', async (event, serverId: UUID) => Result<void>);
```

## 🤝 Contributing

### Development Setup

1. **Fork and Clone**
   ```bash
   git fork https://github.com/claude-code/mcp-config-manager-v2
   git clone https://github.com/YOUR_USERNAME/mcp-config-manager-v2
   cd mcp-config-manager-v2
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Run Quality Checks**
   ```bash
   npm run validate  # Runs typecheck, lint, and tests
   ```

### Pull Request Process

1. **Quality Requirements**
   - All tests must pass (`npm test`)
   - Code coverage ≥85%
   - Type coverage ≥95%
   - No linting errors
   - Accessibility compliance

2. **Documentation**
   - Update README.md if needed
   - Add JSDoc comments for public APIs
   - Include test cases for new features

3. **Commit Standards**
   ```bash
   # Use conventional commits
   feat: add server health monitoring
   fix: resolve memory leak in server status updates
   docs: update API reference for ServerService
   test: add accessibility tests for ServerCard
   ```

### Code Style

The project uses strict ESLint and TypeScript configurations:

```typescript
// Prefer explicit types over any
const servers: MCPServer[] = [];

// Use branded types for type safety
const createServer = (name: ServerName): MCPServer => {
  // Implementation
};

// Handle errors with Result type
const result = await serverService.getServers();
if (result.kind === 'failure') {
  // Handle error
  return;
}
// Use result.value safely
```

### Testing Guidelines

- **Unit Tests**: Test pure functions and domain logic
- **Integration Tests**: Test service interactions
- **Component Tests**: Test React components with user interactions
- **E2E Tests**: Test complete user workflows
- **Accessibility Tests**: Ensure WCAG compliance

```typescript
// Test example with proper setup
describe('ServerService', () => {
  let service: IServerService;
  
  beforeEach(() => {
    service = container.get<IServerService>('ServerService');
  });
  
  it('should create server with valid input', async () => {
    const input: CreateServerInput = {
      name: 'Test Server' as ServerName,
      configuration: { /* valid config */ }
    };
    
    const result = await service.createServer(input);
    
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.value.name).toBe('Test Server');
    }
  });
});
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude Code**: AI-powered development assistance
- **Anthropic**: Advanced AI technology
- **Open Source Community**: Dependencies and inspiration
- **Material-UI**: Excellent React component library
- **Electron**: Cross-platform desktop application framework

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/claude-code/mcp-config-manager-v2/wiki)
- **Issues**: [GitHub Issues](https://github.com/claude-code/mcp-config-manager-v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/claude-code/mcp-config-manager-v2/discussions)
- **Email**: claude@anthropic.com

---

**Built with ❤️ by Claude Code**