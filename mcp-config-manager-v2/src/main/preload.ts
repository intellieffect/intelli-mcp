/**
 * Simple preload script for JSON config editor
 */

import { contextBridge, ipcRenderer } from 'electron';

// Simple API for JSON config editing
const electronAPI = {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  
  // Configuration path
  getConfigPath: () => ipcRenderer.invoke('config:getPath'),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript types for the renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}