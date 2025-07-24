# MCP Config Manager - Component Design

## Component Architecture Overview

The application follows a atomic design pattern with clear separation of concerns between presentational and container components.

## Component Hierarchy

```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── MainContent
├── Pages
│   ├── Dashboard
│   ├── ServerManager
│   ├── TemplateGallery
│   └── BackupManager
└── Shared
    ├── ErrorBoundary
    ├── LoadingStates
    └── Notifications
```

## Core Components

### 1. ServerList Component
```typescript
interface ServerListProps {
  servers: MCPServer[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

// Features:
// - Drag & drop reordering
// - Search/filter functionality
// - Status indicators (active, error, disabled)
// - Bulk operations support
```

### 2. ServerEditor Component
```typescript
interface ServerEditorProps {
  server?: MCPServer;
  onSave: (server: MCPServer) => void;
  onCancel: () => void;
  templates: ServerTemplate[];
}

// Sub-components:
// - BasicInfoForm (name, description)
// - CommandConfig (command, args, env)
// - AdvancedSettings (timeout, retry, logging)
// - ValidationMessages
```

### 3. TemplateGallery Component
```typescript
interface TemplateGalleryProps {
  templates: ServerTemplate[];
  onApply: (template: ServerTemplate) => void;
  onRefresh: () => void;
  categories: string[];
}

// Features:
// - Category filtering
// - Search functionality
// - Preview modal
// - Popularity indicators
// - One-click apply
```

### 4. BackupManager Component
```typescript
interface BackupManagerProps {
  backups: Backup[];
  currentConfig: ConfigData;
  onRestore: (backupId: string) => void;
  onDelete: (backupId: string) => void;
  onExport: (backupId: string) => void;
}

// Features:
// - Backup timeline view
// - Diff viewer
// - Auto-backup settings
// - Import/export functionality
```

## Shared Components

### 1. ConfigValidator Component
```typescript
interface ConfigValidatorProps {
  value: string;
  schema: JSONSchema;
  onChange: (value: string, isValid: boolean) => void;
  realtime?: boolean;
}

// Features:
// - Real-time validation
// - Error highlighting
// - Syntax highlighting
// - Auto-formatting
```

### 2. DragDropList Component
```typescript
interface DragDropListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (fromIndex: number, toIndex: number) => void;
  keyExtractor: (item: T) => string;
}

// Features:
// - Smooth animations
// - Touch support
// - Accessibility (keyboard navigation)
// - Visual feedback
```

### 3. SecureInput Component
```typescript
interface SecureInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validator?: (value: string) => string | null;
  sensitive?: boolean;
}

// Features:
// - Input masking for sensitive data
// - Validation feedback
// - Copy protection
// - Secure paste handling
```

## UI Component Library (Shadcn)

### Theme Configuration
```typescript
const theme = {
  colors: {
    primary: "hsl(222.2 47.4% 11.2%)",
    secondary: "hsl(210 40% 96.1%)",
    danger: "hsl(0 84.2% 60.2%)",
    success: "hsl(142.1 76.2% 36.3%)",
    warning: "hsl(38 92% 50%)",
  },
  
  components: {
    button: {
      variants: ["default", "destructive", "outline", "ghost"],
      sizes: ["sm", "md", "lg"],
    },
    
    card: {
      variants: ["default", "bordered", "elevated"],
    },
    
    input: {
      variants: ["default", "filled", "error"],
    },
  },
};
```

### Component Styling System
```tsx
// Using Tailwind CSS with Shadcn UI
const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, className })
      )}
      ref={ref}
      {...props}
    />
  );
});
```

## State Management Integration

### Component State Patterns
```typescript
// Using React Query for server state
const useServers = () => {
  return useQuery({
    queryKey: ['servers'],
    queryFn: fetchServers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Using Zustand for client state
const useUIStore = create<UIState>((set) => ({
  selectedServer: null,
  isEditing: false,
  theme: 'system',
  
  setSelectedServer: (id) => set({ selectedServer: id }),
  setEditing: (value) => set({ isEditing: value }),
  setTheme: (theme) => set({ theme }),
}));
```

## Component Communication

### Event System
```typescript
// Custom event emitter for cross-component communication
class ComponentEventBus extends EventEmitter {
  emit(event: ComponentEvents, data?: any): boolean {
    return super.emit(event, data);
  }
  
  on(event: ComponentEvents, listener: Function): this {
    return super.on(event, listener);
  }
}

enum ComponentEvents {
  SERVER_UPDATED = 'server:updated',
  BACKUP_CREATED = 'backup:created',
  VALIDATION_ERROR = 'validation:error',
  CONFIG_SAVED = 'config:saved',
}
```

### Props Drilling Prevention
```typescript
// Using React Context for deep prop passing
const ConfigContext = React.createContext<ConfigContextType | null>(null);

const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
```

## Accessibility Design

### ARIA Implementation
```tsx
const ServerListItem: React.FC<ServerListItemProps> = ({ server, isSelected }) => {
  return (
    <li
      role="option"
      aria-selected={isSelected}
      aria-label={`Server: ${server.name}`}
      tabIndex={0}
      onKeyDown={handleKeyboardNavigation}
    >
      {/* Content */}
    </li>
  );
};
```

### Keyboard Navigation
```typescript
const keyboardShortcuts = {
  'cmd+s': 'Save configuration',
  'cmd+z': 'Undo last change',
  'cmd+shift+z': 'Redo last change',
  'cmd+b': 'Create backup',
  'cmd+k': 'Open command palette',
  'escape': 'Close modal/cancel operation',
};
```

## Performance Optimizations

### Component Memoization
```typescript
const ServerCard = React.memo<ServerCardProps>(({ server, onEdit, onDelete }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.server.id === nextProps.server.id &&
         prevProps.server.updatedAt === nextProps.server.updatedAt;
});
```

### Virtual Scrolling
```typescript
const VirtualServerList: React.FC<VirtualServerListProps> = ({ servers }) => {
  const rowVirtualizer = useVirtualizer({
    count: servers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Row height
    overscan: 5,
  });
  
  // Render only visible items
};
```

### Code Splitting
```typescript
// Lazy load heavy components
const TemplateGallery = React.lazy(() => 
  import('./components/TemplateGallery')
);

const BackupManager = React.lazy(() => 
  import('./components/BackupManager')
);
```

## Error Boundaries

### Component Error Handling
```typescript
class ComponentErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    errorReporter.log({ error, errorInfo, component: this.props.name });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} retry={this.retry} />;
    }
    
    return this.props.children;
  }
}
```

## Testing Strategy

### Component Testing
```typescript
// Unit tests with React Testing Library
describe('ServerEditor', () => {
  it('validates server configuration on save', async () => {
    const onSave = jest.fn();
    const { getByRole, getByLabelText } = render(
      <ServerEditor onSave={onSave} />
    );
    
    // Test implementation
  });
});

// Integration tests
describe('Server Management Flow', () => {
  it('creates, edits, and deletes a server', async () => {
    // Full workflow test
  });
});
```

## Component Documentation

### Storybook Integration
```typescript
export default {
  title: 'Components/ServerEditor',
  component: ServerEditor,
  parameters: {
    docs: {
      description: {
        component: 'Editor for MCP server configuration',
      },
    },
  },
} as Meta<typeof ServerEditor>;

export const Default: Story = {
  args: {
    server: mockServer,
    templates: mockTemplates,
  },
};
```

## Responsive Design

### Breakpoint System
```scss
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1440px
);

// Component responsive behavior
.server-list {
  display: grid;
  grid-template-columns: 1fr;
  
  @media (min-width: map-get($breakpoints, 'tablet')) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: map-get($breakpoints, 'desktop')) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Animation & Transitions

### Motion Design
```typescript
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
};
```