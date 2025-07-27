/**
 * IPC service for file management in renderer process
 */

// Types matching the main process
export interface ManagedFile {
  id: string;
  path: string;
  name: string;
  type: 'claude' | 'mcp' | 'json';
  isDefault?: boolean;
  lastAccessed?: Date;
  lastModified?: Date;
}

interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FileManagementIPCService {
  /**
   * Add files to management
   */
  async addFiles(paths: string[]): Promise<ManagedFile[]> {
    const response = await window.electronAPI.invoke('files:add', paths) as IPCResponse<ManagedFile[]>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to add files');
    }
    return response.data || [];
  }

  /**
   * Remove file from management
   */
  async removeFile(fileId: string): Promise<void> {
    const response = await window.electronAPI.invoke('files:remove', fileId) as IPCResponse;
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove file');
    }
  }

  /**
   * List all managed files
   */
  async listFiles(): Promise<ManagedFile[]> {
    const response = await window.electronAPI.invoke('files:list') as IPCResponse<ManagedFile[]>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to list files');
    }
    return response.data || [];
  }

  /**
   * Read file content by ID
   */
  async readFile(fileId: string): Promise<any> {
    const response = await window.electronAPI.invoke('files:read', fileId) as IPCResponse<any>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to read file');
    }
    return response.data;
  }

  /**
   * Write file content by ID
   */
  async writeFile(fileId: string, content: any): Promise<void> {
    const response = await window.electronAPI.invoke('files:write', fileId, content) as IPCResponse;
    if (!response.success) {
      throw new Error(response.error || 'Failed to write file');
    }
  }

  /**
   * Get active file ID
   */
  async getActiveFileId(): Promise<string | undefined> {
    const response = await window.electronAPI.invoke('files:getActiveId') as IPCResponse<string>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to get active file ID');
    }
    return response.data;
  }

  /**
   * Set active file ID
   */
  async setActiveFileId(fileId: string): Promise<void> {
    const response = await window.electronAPI.invoke('files:setActiveId', fileId) as IPCResponse;
    if (!response.success) {
      throw new Error(response.error || 'Failed to set active file ID');
    }
  }

  /**
   * Show file open dialog
   */
  async showOpenDialog(): Promise<string[]> {
    const response = await window.electronAPI.invoke('files:showOpenDialog') as IPCResponse<string[]>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to show open dialog');
    }
    return response.data || [];
  }
}

// Singleton instance
let fileManagementService: FileManagementIPCService | null = null;

export function getFileManagementService(): FileManagementIPCService {
  if (!fileManagementService) {
    fileManagementService = new FileManagementIPCService();
  }
  return fileManagementService;
}