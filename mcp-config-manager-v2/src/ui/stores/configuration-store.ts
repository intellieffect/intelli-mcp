/**
 * Configuration state management with strict typing
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type {
  MCPConfiguration,
  CreateConfigurationInput,
  UpdateConfigurationInput,
  ConfigurationFilters,
  ConfigurationBackup,
  ConfigurationTemplate,
} from '@core/domain/entities/configuration';
import type { IConfigurationService } from '@core/application/services/configuration-service';
import type { UUID, FilePath } from '@shared/types/branded';

// Configuration state interface
export interface ConfigurationState {
  readonly configurations: ReadonlyMap<UUID, MCPConfiguration>;
  readonly currentConfigurationId: UUID | null;
  readonly backups: ReadonlyMap<UUID, readonly ConfigurationBackup[]>;
  readonly templates: readonly ConfigurationTemplate[];
  readonly loading: {
    readonly fetching: boolean;
    readonly creating: boolean;
    readonly updating: boolean;
    readonly deleting: boolean;
    readonly importing: boolean;
    readonly exporting: boolean;
    readonly backup: boolean;
    readonly restore: boolean;
  };
  readonly errors: {
    readonly fetch: string | null;
    readonly create: string | null;
    readonly update: string | null;
    readonly delete: string | null;
    readonly import: string | null;
    readonly export: string | null;
    readonly backup: string | null;
    readonly restore: string | null;
  };
  readonly lastUpdated: string | null;
}

// Initial state
const initialState: ConfigurationState = {
  configurations: new Map(),
  currentConfigurationId: null,
  backups: new Map(),
  templates: [],
  loading: {
    fetching: false,
    creating: false,
    updating: false,
    deleting: false,
    importing: false,
    exporting: false,
    backup: false,
    restore: false,
  },
  errors: {
    fetch: null,
    create: null,
    update: null,
    delete: null,
    import: null,
    export: null,
    backup: null,
    restore: null,
  },
  lastUpdated: null,
};

// Service interface placeholder
interface IConfigurationService {
  getConfigurations(filters?: ConfigurationFilters): Promise<{ kind: 'success'; value: readonly MCPConfiguration[] } | { kind: 'failure'; error: { message: string } }>;
  getConfiguration(id: UUID): Promise<{ kind: 'success'; value: MCPConfiguration | null } | { kind: 'failure'; error: { message: string } }>;
  createConfiguration(input: CreateConfigurationInput): Promise<{ kind: 'success'; value: MCPConfiguration } | { kind: 'failure'; error: { message: string } }>;
  updateConfiguration(id: UUID, input: UpdateConfigurationInput): Promise<{ kind: 'success'; value: MCPConfiguration } | { kind: 'failure'; error: { message: string } }>;
  deleteConfiguration(id: UUID): Promise<{ kind: 'success'; value: void } | { kind: 'failure'; error: { message: string } }>;
  importConfiguration(filePath: FilePath): Promise<{ kind: 'success'; value: MCPConfiguration } | { kind: 'failure'; error: { message: string } }>;
  exportConfiguration(id: UUID, filePath: FilePath): Promise<{ kind: 'success'; value: void } | { kind: 'failure'; error: { message: string } }>;
  getBackups(configurationId: UUID): Promise<{ kind: 'success'; value: readonly ConfigurationBackup[] } | { kind: 'failure'; error: { message: string } }>;
  createBackup(configurationId: UUID): Promise<{ kind: 'success'; value: ConfigurationBackup } | { kind: 'failure'; error: { message: string } }>;
  restoreBackup(configurationId: UUID, backupId: UUID): Promise<{ kind: 'success'; value: MCPConfiguration } | { kind: 'failure'; error: { message: string } }>;
  getTemplates(): Promise<{ kind: 'success'; value: readonly ConfigurationTemplate[] } | { kind: 'failure'; error: { message: string } }>;
}

// Async thunks
export const fetchConfigurations = createAsyncThunk<
  readonly MCPConfiguration[],
  ConfigurationFilters | undefined,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/fetchConfigurations',
  async (filters, { extra: { configurationService } }) => {
    const result = await configurationService.getConfigurations(filters);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const fetchConfiguration = createAsyncThunk<
  MCPConfiguration,
  UUID,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/fetchConfiguration',
  async (id, { extra: { configurationService } }) => {
    const result = await configurationService.getConfiguration(id);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    if (!result.value) {
      throw new Error(`Configuration ${id} not found`);
    }
    
    return result.value;
  }
);

export const createConfiguration = createAsyncThunk<
  MCPConfiguration,
  CreateConfigurationInput,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/createConfiguration',
  async (input, { extra: { configurationService } }) => {
    const result = await configurationService.createConfiguration(input);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const updateConfiguration = createAsyncThunk<
  MCPConfiguration,
  { id: UUID; input: UpdateConfigurationInput },
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/updateConfiguration',
  async ({ id, input }, { extra: { configurationService } }) => {
    const result = await configurationService.updateConfiguration(id, input);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const deleteConfiguration = createAsyncThunk<
  UUID,
  UUID,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/deleteConfiguration',
  async (id, { extra: { configurationService } }) => {
    const result = await configurationService.deleteConfiguration(id);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return id;
  }
);

export const importConfiguration = createAsyncThunk<
  MCPConfiguration,
  FilePath,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/importConfiguration',
  async (filePath, { extra: { configurationService } }) => {
    const result = await configurationService.importConfiguration(filePath);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const exportConfiguration = createAsyncThunk<
  void,
  { id: UUID; filePath: FilePath },
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/exportConfiguration',
  async ({ id, filePath }, { extra: { configurationService } }) => {
    const result = await configurationService.exportConfiguration(id, filePath);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
  }
);

export const fetchBackups = createAsyncThunk<
  { configurationId: UUID; backups: readonly ConfigurationBackup[] },
  UUID,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/fetchBackups',
  async (configurationId, { extra: { configurationService } }) => {
    const result = await configurationService.getBackups(configurationId);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return { configurationId, backups: result.value };
  }
);

export const createBackup = createAsyncThunk<
  ConfigurationBackup,
  UUID,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/createBackup',
  async (configurationId, { extra: { configurationService } }) => {
    const result = await configurationService.createBackup(configurationId);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const restoreBackup = createAsyncThunk<
  MCPConfiguration,
  { configurationId: UUID; backupId: UUID },
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/restoreBackup',
  async ({ configurationId, backupId }, { extra: { configurationService } }) => {
    const result = await configurationService.restoreBackup(configurationId, backupId);
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

export const fetchTemplates = createAsyncThunk<
  readonly ConfigurationTemplate[],
  void,
  { extra: { configurationService: IConfigurationService } }
>(
  'configurations/fetchTemplates',
  async (_, { extra: { configurationService } }) => {
    const result = await configurationService.getTemplates();
    
    if (result.kind === 'failure') {
      throw new Error(result.error.message);
    }
    
    return result.value;
  }
);

// Configuration slice
const configurationSlice = createSlice({
  name: 'configurations',
  initialState,
  reducers: {
    setCurrentConfiguration: (state, action: PayloadAction<UUID | null>) => {
      state.currentConfigurationId = action.payload;
    },
    
    clearErrors: (state) => {
      state.errors = {
        fetch: null,
        create: null,
        update: null,
        delete: null,
        import: null,
        export: null,
        backup: null,
        restore: null,
      };
    },
    
    clearError: (state, action: PayloadAction<keyof ConfigurationState['errors']>) => {
      const errorType = action.payload;
      (state.errors as any)[errorType] = null;
    },
    
    updateConfigurationValidation: (state, action: PayloadAction<{
      id: UUID;
      validation: MCPConfiguration['validation'];
    }>) => {
      const { id, validation } = action.payload;
      const config = state.configurations.get(id);
      
      if (config) {
        const updatedConfig: MCPConfiguration = {
          ...config,
          validation,
          updatedAt: new Date().toISOString() as any,
        };
        state.configurations.set(id, updatedConfig);
        state.lastUpdated = new Date().toISOString();
      }
    },
    
    updateConfigurationStatistics: (state, action: PayloadAction<{
      id: UUID;
      statistics: MCPConfiguration['statistics'];
    }>) => {
      const { id, statistics } = action.payload;
      const config = state.configurations.get(id);
      
      if (config) {
        const updatedConfig: MCPConfiguration = {
          ...config,
          statistics,
          updatedAt: new Date().toISOString() as any,
        };
        state.configurations.set(id, updatedConfig);
        state.lastUpdated = new Date().toISOString();
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch configurations
    builder
      .addCase(fetchConfigurations.pending, (state) => {
        state.loading.fetching = true;
        state.errors.fetch = null;
      })
      .addCase(fetchConfigurations.fulfilled, (state, action) => {
        state.loading.fetching = false;
        
        // Update configurations map
        for (const config of action.payload) {
          state.configurations.set(config.id, config);
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchConfigurations.rejected, (state, action) => {
        state.loading.fetching = false;
        state.errors.fetch = action.error.message || 'Failed to fetch configurations';
      });

    // Fetch single configuration
    builder
      .addCase(fetchConfiguration.fulfilled, (state, action) => {
        const config = action.payload;
        state.configurations.set(config.id, config);
        state.lastUpdated = new Date().toISOString();
      });

    // Create configuration
    builder
      .addCase(createConfiguration.pending, (state) => {
        state.loading.creating = true;
        state.errors.create = null;
      })
      .addCase(createConfiguration.fulfilled, (state, action) => {
        state.loading.creating = false;
        
        const config = action.payload;
        state.configurations.set(config.id, config);
        state.currentConfigurationId = config.id;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createConfiguration.rejected, (state, action) => {
        state.loading.creating = false;
        state.errors.create = action.error.message || 'Failed to create configuration';
      });

    // Update configuration
    builder
      .addCase(updateConfiguration.pending, (state) => {
        state.loading.updating = true;
        state.errors.update = null;
      })
      .addCase(updateConfiguration.fulfilled, (state, action) => {
        state.loading.updating = false;
        
        const config = action.payload;
        state.configurations.set(config.id, config);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateConfiguration.rejected, (state, action) => {
        state.loading.updating = false;
        state.errors.update = action.error.message || 'Failed to update configuration';
      });

    // Delete configuration
    builder
      .addCase(deleteConfiguration.pending, (state) => {
        state.loading.deleting = true;
        state.errors.delete = null;
      })
      .addCase(deleteConfiguration.fulfilled, (state, action) => {
        state.loading.deleting = false;
        
        const id = action.payload;
        state.configurations.delete(id);
        state.backups.delete(id);
        
        if (state.currentConfigurationId === id) {
          state.currentConfigurationId = null;
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteConfiguration.rejected, (state, action) => {
        state.loading.deleting = false;
        state.errors.delete = action.error.message || 'Failed to delete configuration';
      });

    // Import configuration
    builder
      .addCase(importConfiguration.pending, (state) => {
        state.loading.importing = true;
        state.errors.import = null;
      })
      .addCase(importConfiguration.fulfilled, (state, action) => {
        state.loading.importing = false;
        
        const config = action.payload;
        state.configurations.set(config.id, config);
        state.currentConfigurationId = config.id;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(importConfiguration.rejected, (state, action) => {
        state.loading.importing = false;
        state.errors.import = action.error.message || 'Failed to import configuration';
      });

    // Export configuration
    builder
      .addCase(exportConfiguration.pending, (state) => {
        state.loading.exporting = true;
        state.errors.export = null;
      })
      .addCase(exportConfiguration.fulfilled, (state) => {
        state.loading.exporting = false;
      })
      .addCase(exportConfiguration.rejected, (state, action) => {
        state.loading.exporting = false;
        state.errors.export = action.error.message || 'Failed to export configuration';
      });

    // Fetch backups
    builder
      .addCase(fetchBackups.fulfilled, (state, action) => {
        const { configurationId, backups } = action.payload;
        state.backups.set(configurationId, backups);
      });

    // Create backup
    builder
      .addCase(createBackup.pending, (state) => {
        state.loading.backup = true;
        state.errors.backup = null;
      })
      .addCase(createBackup.fulfilled, (state, action) => {
        state.loading.backup = false;
        
        const backup = action.payload;
        const existingBackups = state.backups.get(backup.configurationId) || [];
        state.backups.set(backup.configurationId, [backup, ...existingBackups]);
      })
      .addCase(createBackup.rejected, (state, action) => {
        state.loading.backup = false;
        state.errors.backup = action.error.message || 'Failed to create backup';
      });

    // Restore backup
    builder
      .addCase(restoreBackup.pending, (state) => {
        state.loading.restore = true;
        state.errors.restore = null;
      })
      .addCase(restoreBackup.fulfilled, (state, action) => {
        state.loading.restore = false;
        
        const config = action.payload;
        state.configurations.set(config.id, config);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(restoreBackup.rejected, (state, action) => {
        state.loading.restore = false;
        state.errors.restore = action.error.message || 'Failed to restore backup';
      });

    // Fetch templates
    builder
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      });
  },
});

// Actions
export const {
  setCurrentConfiguration,
  clearErrors,
  clearError,
  updateConfigurationValidation,
  updateConfigurationStatistics,
} = configurationSlice.actions;

// Selectors
export const selectConfigurationState = (state: { configurations: ConfigurationState }) => 
  state.configurations;

export const selectConfigurations = createSelector(
  [selectConfigurationState],
  (state) => Array.from(state.configurations.values())
);

export const selectConfigurationById = (id: UUID) =>
  createSelector(
    [selectConfigurationState],
    (state) => state.configurations.get(id) || null
  );

export const selectCurrentConfiguration = createSelector(
  [selectConfigurationState],
  (state) => state.currentConfigurationId 
    ? state.configurations.get(state.currentConfigurationId) || null 
    : null
);

export const selectConfigurationBackups = (id: UUID) =>
  createSelector(
    [selectConfigurationState],
    (state) => state.backups.get(id) || []
  );

export const selectConfigurationTemplates = createSelector(
  [selectConfigurationState],
  (state) => state.templates
);

export const selectConfigurationLoading = createSelector(
  [selectConfigurationState],
  (state) => state.loading
);

export const selectConfigurationErrors = createSelector(
  [selectConfigurationState],
  (state) => state.errors
);

export const selectValidConfigurations = createSelector(
  [selectConfigurations],
  (configurations) => configurations.filter(config => config.validation.isValid)
);

export const selectConfigurationsWithErrors = createSelector(
  [selectConfigurations],
  (configurations) => configurations.filter(config => !config.validation.isValid)
);

// Export the reducer
export default configurationSlice.reducer;