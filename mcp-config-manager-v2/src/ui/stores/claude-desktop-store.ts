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

// State interface
export interface ClaudeDesktopState {
  config: ClaudeDesktopConfig | null;
  configPath: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

// Initial state
const initialState: ClaudeDesktopState = {
  config: null,
  configPath: null,
  loading: false,
  error: null,
  lastUpdated: null,
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

// Export reducer
export default claudeDesktopSlice.reducer;