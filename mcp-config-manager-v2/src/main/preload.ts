/**
 * Preload script for multi-file JSON config editor
 */

import { contextBridge, ipcRenderer } from 'electron';

// Complete API for file management and config editing
const electronAPI = {
  // Generic invoke method for IPC communication
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Legacy file operations (for backward compatibility)
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  
  // Configuration path
  getConfigPath: () => ipcRenderer.invoke('config:getPath'),
  
  // File management operations
  files: {
    add: (paths: string[]) => ipcRenderer.invoke('files:add', paths),
    remove: (fileId: string) => ipcRenderer.invoke('files:remove', fileId),
    list: () => ipcRenderer.invoke('files:list'),
    read: (fileId: string) => ipcRenderer.invoke('files:read', fileId),
    write: (fileId: string, content: any) => ipcRenderer.invoke('files:write', fileId, content),
    getActiveId: () => ipcRenderer.invoke('files:getActiveId'),
    setActiveId: (fileId: string) => ipcRenderer.invoke('files:setActiveId', fileId),
    showOpenDialog: () => ipcRenderer.invoke('files:showOpenDialog'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript types for the renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}