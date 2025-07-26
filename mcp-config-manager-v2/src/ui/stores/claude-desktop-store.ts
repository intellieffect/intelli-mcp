/**
 * Claude Desktop configuration state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Claude Desktop configuration interface
export interface ClaudeDesktopConfig {
  claudeAutoStartServer?: boolean;
  mcpServers?: {
    [serverName: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

// Backup information interface
export interface BackupInfo {
  timestamp: string;
  path: string;
  size?: number;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

// Save progress interface
export interface SaveProgress {
  serverName: string;
  step: number;
  total: number;
  message: string;
}

// State interface
export interface ClaudeDesktopState {
  config: ClaudeDesktopConfig | null;
  configPath: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Editing state
  editingServer: string | null;
  tempChanges: Record<string, Partial<{
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>> | null;
  hasUnsavedChanges: boolean;
  
  // Saving state
  saving: boolean;
  saveProgress: SaveProgress | null;
  
  // Backup management
  lastBackup: BackupInfo | null;
  availableBackups: BackupInfo[];
  
  // Validation
  validationResults: Record<string, ValidationResult> | null;
}

// Initial state
const initialState: ClaudeDesktopState = {
  config: null,
  configPath: null,
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Editing state
  editingServer: null,
  tempChanges: {},
  hasUnsavedChanges: false,
  
  // Saving state
  saving: false,
  saveProgress: null,
  
  // Backup management
  lastBackup: null,
  availableBackups: [],
  
  // Validation
  validationResults: {},
};

// Create slice
const claudeDesktopSlice = createSlice({
  name: 'claudeDesktop',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<ClaudeDesktopConfig>) => {
      state.config = action.payload;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    
    setConfigPath: (state, action: PayloadAction<string>) => {
      state.configPath = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateServer: (state, action: PayloadAction<{
      serverName: string;
      config: {
        command: string;
        args?: string[];
        env?: Record<string, string>;
      };
    }>) => {
      if (!state.config) {
        state.config = { mcpServers: {} };
      }
      if (!state.config.mcpServers) {
        state.config.mcpServers = {};
      }
      
      const { serverName, config } = action.payload;
      state.config.mcpServers[serverName] = config;
      state.lastUpdated = new Date().toISOString();
    },
    
    removeServer: (state, action: PayloadAction<string>) => {
      if (state.config?.mcpServers) {
        delete state.config.mcpServers[action.payload];
        state.lastUpdated = new Date().toISOString();
      }
    },
    
    reset: () => initialState,
    
    // Editing state actions
    setEditingServer: (state, action: PayloadAction<string | null>) => {
      state.editingServer = action.payload;
    },
    
    setTempServerChanges: (state, action: PayloadAction<{
      serverName: string;
      changes: Partial<{
        command: string;
        args?: string[];
        env?: Record<string, string>;
      }>;
    }>) => {
      if (!state.tempChanges) {
        state.tempChanges = {};
      }
      state.tempChanges[action.payload.serverName] = {
        ...state.tempChanges[action.payload.serverName],
        ...action.payload.changes,
      };
      state.hasUnsavedChanges = true;
    },
    
    applyTempChanges: (state, action: PayloadAction<string>) => {
      const serverName = action.payload;
      if (state.tempChanges?.[serverName] && state.config?.mcpServers) {
        state.config.mcpServers[serverName] = {
          ...state.config.mcpServers[serverName],
          ...state.tempChanges[serverName],
        };
        delete state.tempChanges[serverName];
      }
      state.lastUpdated = new Date().toISOString();
    },
    
    discardTempChanges: (state, action: PayloadAction<string>) => {
      const serverName = action.payload;
      if (state.tempChanges?.[serverName]) {
        delete state.tempChanges[serverName];
      }
      // Check if there are any remaining temp changes
      state.hasUnsavedChanges = state.tempChanges ? Object.keys(state.tempChanges).length > 0 : false;
    },
    
    setHasUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.hasUnsavedChanges = action.payload;
    },
    
    // Saving state actions
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
      if (!action.payload) {
        state.saveProgress = null;
      }
    },
    
    setSaveProgress: (state, action: PayloadAction<SaveProgress>) => {
      state.saveProgress = action.payload;
    },
    
    clearSaveProgress: (state) => {
      state.saveProgress = null;
    },
    
    // Backup management actions
    setLastBackup: (state, action: PayloadAction<BackupInfo>) => {
      state.lastBackup = action.payload;
    },
    
    setAvailableBackups: (state, action: PayloadAction<BackupInfo[]>) => {
      state.availableBackups = action.payload;
    },
    
    addBackup: (state, action: PayloadAction<BackupInfo>) => {
      state.availableBackups.unshift(action.payload);
      // Keep only the last 10 backups in state
      if (state.availableBackups.length > 10) {
        state.availableBackups = state.availableBackups.slice(0, 10);
      }
    },
    
    // Validation actions
    setValidationResult: (state, action: PayloadAction<{
      serverName: string;
      result: ValidationResult;
    }>) => {
      if (!state.validationResults) {
        state.validationResults = {};
      }
      state.validationResults[action.payload.serverName] = action.payload.result;
    },
    
    clearValidationResults: (state) => {
      state.validationResults = null;
    },
    
    clearValidationResult: (state, action: PayloadAction<string>) => {
      if (state.validationResults && state.validationResults[action.payload]) {
        delete state.validationResults[action.payload];
      }
    },
  },
});

// Export actions
export const claudeDesktopActions = claudeDesktopSlice.actions;

// Export selectors
export const selectClaudeDesktopConfig = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.config;

export const selectClaudeDesktopServers = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.config?.mcpServers || {};

export const selectClaudeDesktopConfigPath = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.configPath;

export const selectClaudeDesktopLoading = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.loading;

export const selectClaudeDesktopError = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.error;

export const selectClaudeDesktopServerCount = (state: { claudeDesktop: ClaudeDesktopState }) => 
  Object.keys(state.claudeDesktop.config?.mcpServers || {}).length;

// New selectors for editing functionality
export const selectEditingServer = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.editingServer;

export const selectTempChanges = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop?.tempChanges || {};

export const selectHasUnsavedChanges = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.hasUnsavedChanges;

export const selectSaving = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.saving;

export const selectSaveProgress = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.saveProgress;

export const selectLastBackup = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.lastBackup;

export const selectAvailableBackups = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop.availableBackups;

export const selectValidationResults = (state: { claudeDesktop: ClaudeDesktopState }) => 
  state.claudeDesktop?.validationResults || {};

export const selectValidationResult = (serverName: string) => 
  (state: { claudeDesktop: ClaudeDesktopState }) => 
    state.claudeDesktop.validationResults?.[serverName];

// Export reducer
export default claudeDesktopSlice.reducer;