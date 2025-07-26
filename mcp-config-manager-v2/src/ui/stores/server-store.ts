/**
 * Redux Toolkit store for server state management with strict typing
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { 
  MCPServer,
  CreateServerInput,
  UpdateServerInput,
  ServerFilters,
  ServerSortOptions,
  ServerPagination,
  ServerQueryResult,
} from '@core/domain/entities/server';
import type { IServerService } from '@core/application/services/server-service';
import type { UUID } from '@shared/types/branded';

// State interface
export interface ServerState {
  readonly servers: ReadonlyMap<UUID, MCPServer>;
  readonly queryResults: {
    readonly servers: readonly UUID[];
    readonly pagination: ServerPagination;
    readonly filters: ServerFilters;
    readonly sort: ServerSortOptions;
  } | null;
  readonly loading: {
    readonly fetching: boolean;
    readonly creating: boolean;
    readonly updating: ReadonlySet<UUID>;
    readonly deleting: ReadonlySet<UUID>;
    readonly starting: ReadonlySet<UUID>;
    readonly stopping: ReadonlySet<UUID>;
  };
  readonly errors: {
    readonly fetch: string | null;
    readonly create: string | null;
    readonly update: ReadonlyMap<UUID, string>;
    readonly delete: ReadonlyMap<UUID, string>;
    readonly start: ReadonlyMap<UUID, string>;
    readonly stop: ReadonlyMap<UUID, string>;
  };
  readonly selectedServerId: UUID | null;
  readonly lastUpdated: string | null;
}

// Initial state
const initialState: ServerState = {
  servers: new Map(),
  queryResults: null,
  loading: {
    fetching: false,
    creating: false,
    updating: new Set(),
    deleting: new Set(),
    starting: new Set(),
    stopping: new Set(),
  },
  errors: {
    fetch: null,
    create: null,
    update: new Map(),
    delete: new Map(),
    start: new Map(),
    stop: new Map(),
  },
  selectedServerId: null,
  lastUpdated: null,
};

// Async thunks
export const fetchServers = createAsyncThunk<
  ServerQueryResult,
  {
    filters?: ServerFilters;
    sort?: ServerSortOptions;
    pagination?: ServerPagination;
  },
  { extra: { serverService: IServerService } }
>(
  'servers/fetchServers',
  async ({ filters, sort, pagination }, { extra: { serverService } }) => {
    const result = await serverService.getServers(filters, sort, pagination);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const fetchServer = createAsyncThunk<
  MCPServer,
  UUID,
  { extra: { serverService: IServerService } }
>(
  'servers/fetchServer',
  async (id, { extra: { serverService } }) => {
    const result = await serverService.getServer(id);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    if (!result.value) {
      throw new Error(`Server ${id} not found`);
    }
    
    return result.value;
  }
);

export const createServer = createAsyncThunk<
  MCPServer,
  CreateServerInput,
  { extra: { serverService: IServerService } }
>(
  'servers/createServer',
  async (input, { extra: { serverService } }) => {
    const result = await serverService.createServer(input);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const updateServer = createAsyncThunk<
  MCPServer,
  { id: UUID; input: UpdateServerInput },
  { extra: { serverService: IServerService } }
>(
  'servers/updateServer',
  async ({ id, input }, { extra: { serverService } }) => {
    const result = await serverService.updateServer(id, input);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const deleteServer = createAsyncThunk<
  UUID,
  UUID,
  { extra: { serverService: IServerService } }
>(
  'servers/deleteServer',
  async (id, { extra: { serverService } }) => {
    const result = await serverService.deleteServer(id);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return id;
  }
);

export const startServer = createAsyncThunk<
  UUID,
  UUID,
  { extra: { serverService: IServerService } }
>(
  'servers/startServer',
  async (id, { extra: { serverService } }) => {
    const result = await serverService.startServer(id);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return id;
  }
);

export const stopServer = createAsyncThunk<
  UUID,
  { id: UUID; reason?: string },
  { extra: { serverService: IServerService } }
>(
  'servers/stopServer',
  async ({ id, reason }, { extra: { serverService } }) => {
    const result = await serverService.stopServer(id, reason);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return id;
  }
);

// Server slice
const serverSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    selectServer: (state, action: PayloadAction<UUID | null>) => {
      state.selectedServerId = action.payload;
    },
    
    clearErrors: (state) => {
      state.errors = {
        fetch: null,
        create: null,
        update: new Map(),
        delete: new Map(),
        start: new Map(),
        stop: new Map(),
      };
    },
    
    clearError: (state, action: PayloadAction<{
      type: keyof ServerState['errors'];
      id?: UUID;
    }>) => {
      const { type, id } = action.payload;
      
      if (id && (type === 'update' || type === 'delete' || type === 'start' || type === 'stop')) {
        const errorMap = state.errors[type] as Map<UUID, string>;
        errorMap.delete(id);
      } else if (type === 'fetch' || type === 'create') {
        (state.errors as any)[type] = null;
      }
    },
    
    updateServerStatus: (state, action: PayloadAction<{
      id: UUID;
      status: MCPServer['status'];
    }>) => {
      const { id, status } = action.payload;
      const server = state.servers.get(id);
      
      if (server) {
        const updatedServer: MCPServer = {
          ...server,
          status,
          updatedAt: new Date().toISOString() as any,
        };
        state.servers.set(id, updatedServer);
        state.lastUpdated = new Date().toISOString();
      }
    },
    
    updateServerMetrics: (state, action: PayloadAction<{
      id: UUID;
      metrics: MCPServer['metrics'];
    }>) => {
      const { id, metrics } = action.payload;
      const server = state.servers.get(id);
      
      if (server) {
        const updatedServer: MCPServer = {
          ...server,
          metrics,
          updatedAt: new Date().toISOString() as any,
        };
        state.servers.set(id, updatedServer);
        state.lastUpdated = new Date().toISOString();
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch servers
    builder
      .addCase(fetchServers.pending, (state) => {
        state.loading.fetching = true;
        state.errors.fetch = null;
      })
      .addCase(fetchServers.fulfilled, (state, action) => {
        state.loading.fetching = false;
        
        const { servers, pagination, filters, sort } = action.payload;
        
        // Update servers map
        for (const server of servers) {
          state.servers.set(server.id, server);
        }
        
        // Update query results
        state.queryResults = {
          servers: servers.map(s => s.id),
          pagination,
          filters,
          sort,
        };
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchServers.rejected, (state, action) => {
        state.loading.fetching = false;
        state.errors.fetch = action.error.message || 'Failed to fetch servers';
      });

    // Fetch single server
    builder
      .addCase(fetchServer.fulfilled, (state, action) => {
        const server = action.payload;
        state.servers.set(server.id, server);
        state.lastUpdated = new Date().toISOString();
      });

    // Create server
    builder
      .addCase(createServer.pending, (state) => {
        state.loading.creating = true;
        state.errors.create = null;
      })
      .addCase(createServer.fulfilled, (state, action) => {
        state.loading.creating = false;
        
        const server = action.payload;
        state.servers.set(server.id, server);
        
        // Add to query results if they exist
        if (state.queryResults) {
          state.queryResults = {
            ...state.queryResults,
            servers: [...state.queryResults.servers, server.id],
          };
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createServer.rejected, (state, action) => {
        state.loading.creating = false;
        state.errors.create = action.error.message || 'Failed to create server';
      });

    // Update server
    builder
      .addCase(updateServer.pending, (state, action) => {
        const { id } = action.meta.arg;
        state.loading.updating.add(id);
        state.errors.update.delete(id);
      })
      .addCase(updateServer.fulfilled, (state, action) => {
        const server = action.payload;
        state.loading.updating.delete(server.id);
        state.servers.set(server.id, server);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateServer.rejected, (state, action) => {
        const { id } = action.meta.arg;
        state.loading.updating.delete(id);
        state.errors.update.set(id, action.error.message || 'Failed to update server');
      });

    // Delete server
    builder
      .addCase(deleteServer.pending, (state, action) => {
        const id = action.meta.arg;
        state.loading.deleting.add(id);
        state.errors.delete.delete(id);
      })
      .addCase(deleteServer.fulfilled, (state, action) => {
        const id = action.payload;
        state.loading.deleting.delete(id);
        state.servers.delete(id);
        
        // Remove from query results
        if (state.queryResults) {
          state.queryResults = {
            ...state.queryResults,
            servers: state.queryResults.servers.filter(serverId => serverId !== id),
          };
        }
        
        // Clear selection if deleted server was selected
        if (state.selectedServerId === id) {
          state.selectedServerId = null;
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteServer.rejected, (state, action) => {
        const id = action.meta.arg;
        state.loading.deleting.delete(id);
        state.errors.delete.set(id, action.error.message || 'Failed to delete server');
      });

    // Start server
    builder
      .addCase(startServer.pending, (state, action) => {
        const id = action.meta.arg;
        state.loading.starting.add(id);
        state.errors.start.delete(id);
      })
      .addCase(startServer.fulfilled, (state, action) => {
        const id = action.payload;
        state.loading.starting.delete(id);
        // Server status will be updated via real-time updates
      })
      .addCase(startServer.rejected, (state, action) => {
        const id = action.meta.arg;
        state.loading.starting.delete(id);
        state.errors.start.set(id, action.error.message || 'Failed to start server');
      });

    // Stop server
    builder
      .addCase(stopServer.pending, (state, action) => {
        const { id } = action.meta.arg;
        state.loading.stopping.add(id);
        state.errors.stop.delete(id);
      })
      .addCase(stopServer.fulfilled, (state, action) => {
        const id = action.payload;
        state.loading.stopping.delete(id);
        // Server status will be updated via real-time updates
      })
      .addCase(stopServer.rejected, (state, action) => {
        const { id } = action.meta.arg;
        state.loading.stopping.delete(id);
        state.errors.stop.set(id, action.error.message || 'Failed to stop server');
      });
  },
});

// Actions
export const {
  selectServer,
  clearErrors,
  clearError,
  updateServerStatus,
  updateServerMetrics,
} = serverSlice.actions;

// Selectors
export const selectServerState = (state: { servers: ServerState }) => state.servers;

export const selectServers = createSelector(
  [selectServerState],
  (state) => Array.from(state.servers.values())
);

export const selectServerById = (id: UUID) =>
  createSelector(
    [selectServerState],
    (state) => state.servers.get(id) || null
  );

export const selectSelectedServer = createSelector(
  [selectServerState],
  (state) => state.selectedServerId ? state.servers.get(state.selectedServerId) || null : null
);

export const selectQueryResults = createSelector(
  [selectServerState],
  (state) => {
    if (!state.queryResults) return null;
    
    return {
      ...state.queryResults,
      servers: state.queryResults.servers
        .map(id => state.servers.get(id))
        .filter(Boolean) as MCPServer[],
    };
  }
);

export const selectServersByStatus = (status: MCPServer['status']['kind']) =>
  createSelector(
    [selectServers],
    (servers) => servers.filter(server => server.status.kind === status)
  );

export const selectRunningServers = selectServersByStatus('running');
export const selectStoppedServers = selectServersByStatus('stopped');
export const selectErrorServers = selectServersByStatus('error');

export const selectServerStatistics = createSelector(
  [selectServers],
  (servers) => ({
    total: servers.length,
    running: servers.filter(s => s.status.kind === 'running').length,
    stopped: servers.filter(s => s.status.kind === 'stopped').length,
    errors: servers.filter(s => s.status.kind === 'error').length,
    idle: servers.filter(s => s.status.kind === 'idle').length,
  })
);

export const selectServerLoading = createSelector(
  [selectServerState],
  (state) => state.loading
);

export const selectServerErrors = createSelector(
  [selectServerState],
  (state) => state.errors
);

export const selectIsServerLoading = (id: UUID, operation: 'updating' | 'deleting' | 'starting' | 'stopping') =>
  createSelector(
    [selectServerLoading],
    (loading) => loading[operation].has(id)
  );

export const selectServerError = (id: UUID, operation: 'update' | 'delete' | 'start' | 'stop') =>
  createSelector(
    [selectServerErrors],
    (errors) => {
      const errorMap = errors[operation] as Map<UUID, string>;
      return errorMap.get(id) || null;
    }
  );

// Export the reducer
export default serverSlice.reducer;