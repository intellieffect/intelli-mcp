/**
 * File management service for handling multiple JSON configuration files
 */

import Store from 'electron-store';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';
import { validateFilePath } from '../utils/security';

// Types
export interface ManagedFile {
  id: string;
  path: string;
  name: string;
  displayName?: string;           // Custom user-defined name
  type: 'claude' | 'mcp' | 'json';
  isDefault?: boolean;
  lastAccessed?: Date;
  lastModified?: Date;
  customMetadata?: {              // Future extensibility
    description?: string;
    tags?: string[];
    createdAt?: Date;
  };
}

interface AppSettings {
  managedFilePaths: string[];
  lastActiveFileId?: string;
  fileIdMap: Record<string, string>; // path -> id mapping
  fileCustomNames: Record<string, string>; // fileId -> custom name mapping
  fileMetadata: Record<string, any>; // fileId -> metadata mapping
}

export class FileManagementService {
  private store: Store<AppSettings>;
  private defaultClaudePath: string;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'mcp-config-manager',
      defaults: {
        managedFilePaths: [],
        fileIdMap: {},
        fileCustomNames: {},
        fileMetadata: {},
      },
    });

    // Default Claude Desktop config path
    this.defaultClaudePath = path.join(
      app.getPath('userData').replace('mcp-config-manager-v2', 'Claude'),
      'claude_desktop_config.json'
    );

    // Initialize with default file if it exists
    this.initializeDefaultFile();
  }

  private async initializeDefaultFile(): Promise<void> {
    try {
      const managedFilePaths = this.store.get('managedFilePaths', []);
      const hasDefault = managedFilePaths.includes(this.defaultClaudePath);
      
      if (!hasDefault && await this.fileExists(this.defaultClaudePath)) {
        await this.addFiles([this.defaultClaudePath]);
      }
    } catch (error) {
      console.error('Failed to initialize default file:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getFileType(filePath: string): 'claude' | 'mcp' | 'json' {
    const basename = path.basename(filePath);
    if (basename === 'claude_desktop_config.json') return 'claude';
    if (basename.endsWith('.mcp.json')) return 'mcp';
    return 'json';
  }

  async addFiles(paths: string[]): Promise<ManagedFile[]> {
    const managedFilePaths = this.store.get('managedFilePaths', []);
    const fileIdMap = this.store.get('fileIdMap', {});
    const addedFiles: ManagedFile[] = [];

    for (const filePath of paths) {
      // Validate path
      if (!validateFilePath(filePath)) {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      // Check if JSON file
      if (!filePath.endsWith('.json')) {
        throw new Error(`File must be JSON: ${filePath}`);
      }

      // Check if already managed
      if (managedFilePaths.includes(filePath)) {
        continue;
      }

      // Verify file exists
      if (!await this.fileExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Generate or retrieve ID
      const id = fileIdMap[filePath] || uuidv4();
      
      // Create managed file entry
      const managedFile: ManagedFile = {
        id,
        path: filePath,
        name: path.basename(filePath),
        type: this.getFileType(filePath),
        isDefault: filePath === this.defaultClaudePath,
        lastModified: stats.mtime,
        lastAccessed: new Date(),
      };

      // Update arrays
      managedFilePaths.push(filePath);
      fileIdMap[filePath] = id;
      
      addedFiles.push(managedFile);
    }

    // Save settings
    this.store.set('managedFilePaths', managedFilePaths);
    this.store.set('fileIdMap', fileIdMap);
    
    return addedFiles;
  }

  async removeFile(fileId: string): Promise<void> {
    const managedFilePaths = this.store.get('managedFilePaths', []);
    const fileIdMap = this.store.get('fileIdMap', {});
    const lastActiveFileId = this.store.get('lastActiveFileId');
    
    // Find file path by ID
    const filePath = Object.entries(fileIdMap)
      .find(([_, id]) => id === fileId)?.[0];
    
    if (!filePath) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Don't allow removing default file
    if (filePath === this.defaultClaudePath) {
      throw new Error('Cannot remove default Claude Desktop configuration');
    }

    // Remove from arrays
    const updatedPaths = managedFilePaths.filter((p: string) => p !== filePath);
    const updatedFileIdMap = { ...fileIdMap };
    delete updatedFileIdMap[filePath];
    
    // Clear last active if it was this file
    const updatedLastActiveFileId = lastActiveFileId === fileId ? undefined : lastActiveFileId;
    
    // Save settings
    this.store.set('managedFilePaths', updatedPaths);
    this.store.set('fileIdMap', updatedFileIdMap);
    if (updatedLastActiveFileId !== lastActiveFileId) {
      this.store.set('lastActiveFileId', updatedLastActiveFileId);
    }
  }

  async listFiles(): Promise<ManagedFile[]> {
    const managedFilePaths = this.store.get('managedFilePaths', []);
    const fileIdMap = this.store.get('fileIdMap', {});
    const fileCustomNames = this.store.get('fileCustomNames', {});
    const files: ManagedFile[] = [];

    for (const filePath of managedFilePaths) {
      try {
        const stats = await fs.stat(filePath);
        const id = fileIdMap[filePath];
        
        if (id) {
          files.push({
            id,
            path: filePath,
            name: path.basename(filePath),
            displayName: fileCustomNames[id],
            type: this.getFileType(filePath),
            isDefault: filePath === this.defaultClaudePath,
            lastModified: stats.mtime,
          });
        }
      } catch (error) {
        // File might have been deleted
        console.warn(`Failed to access file: ${filePath}`, error);
      }
    }

    return files;
  }

  async readFile(fileId: string): Promise<any> {
    const fileIdMap = this.store.get('fileIdMap', {});
    
    // Find file path by ID
    const filePath = Object.entries(fileIdMap)
      .find(([_, id]) => id === fileId)?.[0];
    
    if (!filePath) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Validate path
    if (!validateFilePath(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    // Read and parse JSON
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async writeFile(fileId: string, content: any): Promise<void> {
    const fileIdMap = this.store.get('fileIdMap', {});
    
    // Find file path by ID
    const filePath = Object.entries(fileIdMap)
      .find(([_, id]) => id === fileId)?.[0];
    
    if (!filePath) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Validate path
    if (!validateFilePath(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    // Write JSON with proper formatting
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  getLastActiveFileId(): string | undefined {
    return this.store.get('lastActiveFileId');
  }

  setLastActiveFileId(fileId: string): void {
    this.store.set('lastActiveFileId', fileId);
  }

  // Custom name management methods
  async setCustomName(fileId: string, customName: string): Promise<void> {
    const fileCustomNames = this.store.get('fileCustomNames', {});
    fileCustomNames[fileId] = customName;
    this.store.set('fileCustomNames', fileCustomNames);
  }

  async getCustomName(fileId: string): Promise<string | undefined> {
    const fileCustomNames = this.store.get('fileCustomNames', {});
    return fileCustomNames[fileId];
  }

  async clearCustomName(fileId: string): Promise<void> {
    const fileCustomNames = this.store.get('fileCustomNames', {});
    delete fileCustomNames[fileId];
    this.store.set('fileCustomNames', fileCustomNames);
  }

  getFileById(fileId: string): ManagedFile | undefined {
    const fileIdMap = this.store.get('fileIdMap', {});
    const fileCustomNames = this.store.get('fileCustomNames', {});
    const filePath = Object.entries(fileIdMap)
      .find(([_, id]) => id === fileId)?.[0];
    
    if (!filePath) return undefined;

    return {
      id: fileId,
      path: filePath,
      name: path.basename(filePath),
      displayName: fileCustomNames[fileId],
      type: this.getFileType(filePath),
      isDefault: filePath === this.defaultClaudePath,
    };
  }
}

// Singleton instance
let fileManagerInstance: FileManagementService | null = null;

export function getFileManager(): FileManagementService {
  if (!fileManagerInstance) {
    fileManagerInstance = new FileManagementService();
  }
  return fileManagerInstance;
}