/**
 * Redux store slice for configuration management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Configuration } from '../../core/domain/entities/configuration';

interface ConfigurationState {
  current: Configuration | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
}

const initialState: ConfigurationState = {
  current: null,
  loading: false,
  error: null,
  isDirty: false,
};

const configurationSlice = createSlice({
  name: 'configuration',
  initialState,
  reducers: {
    setCurrent: (state, action: PayloadAction<Configuration>) => {
      state.current = action.payload;
      state.error = null;
      state.isDirty = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    markDirty: (state) => {
      state.isDirty = true;
    },
    markClean: (state) => {
      state.isDirty = false;
    },
    updateServer: (state, action: PayloadAction<{ serverId: string; update: any }>) => {
      if (state.current) {
        const server = state.current.servers.find(s => s.id === action.payload.serverId);
        if (server) {
          Object.assign(server, action.payload.update);
          state.isDirty = true;
        }
      }
    },
    addServer: (state, action: PayloadAction<any>) => {
      if (state.current) {
        state.current.servers.push(action.payload);
        state.isDirty = true;
      }
    },
    removeServer: (state, action: PayloadAction<string>) => {
      if (state.current) {
        state.current.servers = state.current.servers.filter(s => s.id !== action.payload);
        state.isDirty = true;
      }
    },
  },
});

export const configurationActions = configurationSlice.actions;
export const configurationReducer = configurationSlice.reducer;