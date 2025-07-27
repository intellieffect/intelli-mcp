# Multi-File Support Design

## Overview
Enable MCP Config Manager to manage multiple JSON configuration files with persistent storage and intuitive UI.

## Architecture

### Data Models

```typescript
// File management types
interface ManagedFile {
  id: string;              // UUID for file identification
  path: string;            // Absolute file path
  name: string;            // Display name (filename)
  type: 'claude' | 'mcp' | 'json';  // File type for icon/color
  isDefault?: boolean;     // Is this the default Claude config
  lastAccessed?: Date;     // For sorting/recent files
  lastModified?: Date;     // File modification time
}

interface AppState {
  managedFiles: ManagedFile[];     // All managed files
  activeFileId: string | null;     // Currently selected file
  fileContents: Map<string, any>;  // In-memory cache of file contents
}

interface AppSettings {
  managedFilePaths: string[];      // Persisted file paths
  lastActiveFileId?: string;       // Last selected file
  windowBounds?: Electron.Rectangle; // Window position/size
}
```

### Component Architecture

```
App
├── FileManager (New Container)
│   ├── FileSelector
│   │   ├── FileTab (for each file)
│   │   └── AddFileButton
│   └── FileActions
│       ├── RemoveFileButton
│       └── RefreshButton
├── MinimalLayout
└── JsonConfigEditor
    ├── LoadingState
    ├── ErrorState
    └── InteractiveJsonEditor
```

### Storage Architecture

1. **Electron Store** (app settings)
   - Managed file paths
   - Last active file
   - Window preferences

2. **File System** (actual JSON files)
   - Read on demand
   - Write with validation
   - File watcher for external changes

### IPC Communication

```typescript
// New IPC channels
interface IPCChannels {
  // File management
  'files:add': (paths: string[]) => ManagedFile[];
  'files:remove': (fileId: string) => void;
  'files:list': () => ManagedFile[];
  'files:setActive': (fileId: string) => void;
  
  // File operations
  'file:read': (fileId: string) => any;
  'file:write': (fileId: string, content: any) => void;
  'file:watch': (fileId: string) => void;
  'file:unwatch': (fileId: string) => void;
  
  // Settings
  'settings:get': () => AppSettings;
  'settings:save': (settings: Partial<AppSettings>) => void;
}
```

## UI Design

### File Selector Design

```
┌─────────────────────────────────────────────────┐
│ MCP Config Manager v2                           │
│ Simple JSON editor for configuration files      │
├─────────────────────────────────────────────────┤
│ [Claude Desktop] [server.mcp] [custom.json] [+] │
├─────────────────────────────────────────────────┤
│                                                 │
│  {JSON Editor Content}                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### File Tab Component

```tsx
<Chip
  label={file.name}
  color={file.type === 'claude' ? 'primary' : 'default'}
  onClick={() => setActiveFile(file.id)}
  onDelete={file.isDefault ? undefined : () => removeFile(file.id)}
  icon={<FileIcon type={file.type} />}
  variant={isActive ? 'filled' : 'outlined'}
/>
```

### Add File Dialog

```tsx
<Dialog>
  <DialogTitle>Add Configuration File</DialogTitle>
  <DialogContent>
    <Button onClick={browseFile}>Browse...</Button>
    <TextField 
      value={filePath}
      placeholder="/path/to/config.json"
    />
    <FormHelperText>
      Supported: .json, .mcp.json files
    </FormHelperText>
  </DialogContent>
</Dialog>
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Install electron-store for persistence
2. Create file management service
3. Update IPC handlers for multi-file support
4. Add file validation and security checks

### Phase 2: UI Components
1. Create FileSelector component with tabs
2. Add file management dialogs
3. Update JsonConfigEditor for file switching
4. Add loading and error states

### Phase 3: Enhanced Features
1. File watching for external changes
2. Recent files dropdown
3. Drag & drop file addition
4. Quick file switching (Cmd+1, Cmd+2, etc.)

## Security Considerations

1. **Path Validation**
   - Only allow JSON files
   - Validate file paths are within safe directories
   - Prevent directory traversal attacks

2. **File Access**
   - Read-only by default
   - Explicit save confirmation
   - Backup before overwriting

3. **Content Validation**
   - JSON syntax validation
   - Schema validation for known file types
   - Size limits (e.g., 10MB max)

## User Experience

### File Addition Flow
1. Click "+" button
2. Select file via dialog or drag & drop
3. File validates and adds to tabs
4. Auto-switches to new file

### File Switching
- Click tabs to switch
- Keyboard shortcuts (Cmd+1, Cmd+2)
- Recent files dropdown
- Unsaved changes warning

### Error Handling
- Clear error messages
- Recovery suggestions
- Fallback to default file
- Non-blocking errors when possible

## Technical Implementation

### File Service (Main Process)

```typescript
class FileManagementService {
  private store: Store<AppSettings>;
  private fileWatchers: Map<string, FSWatcher>;
  
  async addFiles(paths: string[]): Promise<ManagedFile[]>;
  async removeFile(fileId: string): Promise<void>;
  async readFile(fileId: string): Promise<any>;
  async writeFile(fileId: string, content: any): Promise<void>;
  watchFile(fileId: string): void;
  unwatchFile(fileId: string): void;
}
```

### React State Management

```typescript
// Use Context API for file management
interface FileContextValue {
  files: ManagedFile[];
  activeFileId: string | null;
  activeContent: any;
  isLoading: boolean;
  error: Error | null;
  
  addFiles: (paths: string[]) => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
  setActiveFile: (fileId: string) => Promise<void>;
  saveActiveFile: (content: any) => Promise<void>;
}
```

## Migration Strategy

1. On first launch with new version:
   - Detect existing claude_desktop_config.json
   - Auto-add as default managed file
   - Preserve all existing functionality

2. Settings migration:
   - Create new settings file
   - Migrate any existing preferences
   - Set sensible defaults

## Testing Strategy

1. **Unit Tests**
   - File service methods
   - Path validation
   - IPC handlers

2. **Integration Tests**
   - Multi-file switching
   - File watching
   - Persistence

3. **E2E Tests**
   - Complete user flows
   - Error scenarios
   - Performance with many files