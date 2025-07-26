/**
 * Preload script for Electron renderer process
 * Exposes secure APIs to the renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { Result } from '@shared/types/result';
import type { UUID } from '@shared/types/branded';

// Define the API that will be exposed to the renderer
const electronAPI = {
  // File operations
  showOpenDialog: () => ipcRenderer.invoke('dialog:showOpen'),
  showSaveDialog: () => ipcRenderer.invoke('dialog:showSave'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  
  // Server operations
  startServer: (serverId: UUID) => ipcRenderer.invoke('server:start', serverId),
  stopServer: (serverId: UUID, reason?: string) => ipcRenderer.invoke('server:stop', serverId, reason),
  restartServer: (serverId: UUID) => ipcRenderer.invoke('server:restart', serverId),
  getServerLogs: (serverId: UUID, lines?: number) => ipcRenderer.invoke('server:getLogs', serverId, lines),
  
  // Configuration operations
  loadConfig: (filePath?: string) => ipcRenderer.invoke('config:load', filePath),
  saveConfig: (config: unknown, filePath?: string) => ipcRenderer.invoke('config:save', config, filePath),
  exportConfig: (format: string) => ipcRenderer.invoke('config:export', format),
  importConfig: (filePath: string) => ipcRenderer.invoke('config:import', filePath),
  validateConfig: (config: unknown) => ipcRenderer.invoke('config:validate', config),
  addServer: (name: string, server: unknown) => ipcRenderer.invoke('config:addServer', name, server),
  updateServer: (name: string, server: unknown) => ipcRenderer.invoke('config:updateServer', name, server),
  removeServer: (name: string) => ipcRenderer.invoke('config:removeServer', name),
  getConfigPath: () => ipcRenderer.invoke('config:getPath'),
  
  // System operations
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  showMessageBox: (options: unknown) => ipcRenderer.invoke('system:showMessageBox', options),
  showErrorBox: (title: string, content: string) => ipcRenderer.invoke('system:showErrorBox', title, content),
  getAppVersion: () => ipcRenderer.invoke('system:getVersion'),
  quitApp: () => ipcRenderer.invoke('system:quit'),
  showItemInFolder: (path: string) => ipcRenderer.invoke('system:showItemInFolder', path),
  
  // Event listeners
  onUpdateAvailable: (callback: () => void) => {
    const subscription = (_event: unknown) => callback();
    ipcRenderer.on('update:available', subscription);
    return () => ipcRenderer.removeListener('update:available', subscription);
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    const subscription = (_event: unknown) => callback();
    ipcRenderer.on('update:downloaded', subscription);
    return () => ipcRenderer.removeListener('update:downloaded', subscription);
  },
  
  onServerEvent: (callback: (serverId: UUID, event: string, data: unknown) => void) => {
    const subscription = (_event: unknown, serverId: UUID, eventType: string, data: unknown) => 
      callback(serverId, eventType, data);
    ipcRenderer.on('server:event', subscription);
    return () => ipcRenderer.removeListener('server:event', subscription);
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