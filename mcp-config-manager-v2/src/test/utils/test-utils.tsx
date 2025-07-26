/**
 * Test utilities for React components with Redux and Material-UI
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { RootState } from '@ui/stores';
import serverReducer from '@ui/stores/server-store';
import configurationReducer from '@ui/stores/configuration-store';
import uiReducer from '@ui/stores/ui-store';
import type { IServerService } from '@core/application/services/server-service';
import type { IConfigurationService } from '@core/application/services/configuration-service';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services for testing
export const createMockServerService = (): jest.Mocked<IServerService> => ({
  getServers: jest.fn(),
  getServer: jest.fn(),
  createServer: jest.fn(),
  updateServer: jest.fn(),
  deleteServer: jest.fn(),
  startServer: jest.fn(),
  stopServer: jest.fn(),
  validateConfiguration: jest.fn(),
  getHealthCheck: jest.fn(),
  getMetrics: jest.fn(),
  observeServerStatus: jest.fn(),
});

export const createMockConfigurationService = (): jest.Mocked<IConfigurationService> => ({
  getConfigurations: jest.fn(),
  getConfiguration: jest.fn(),
  createConfiguration: jest.fn(),
  updateConfiguration: jest.fn(),
  deleteConfiguration: jest.fn(),
  importConfiguration: jest.fn(),
  exportConfiguration: jest.fn(),
  getBackups: jest.fn(),
  createBackup: jest.fn(),
  restoreBackup: jest.fn(),
  getTemplates: jest.fn(),
});

// Default theme for testing
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Test store configuration
export const createTestStore = (
  preloadedState?: Partial<RootState>,
  services?: {
    serverService?: IServerService;
    configurationService?: IConfigurationService;
  }
): EnhancedStore => {
  const defaultServices = {
    serverService: createMockServerService(),
    configurationService: createMockConfigurationService(),
    ...services,
  };

  return configureStore({
    reducer: {
      servers: serverReducer,
      configurations: configurationReducer,
      ui: uiReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: defaultServices,
        },
        serializableCheck: {
          ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
          ignoredPaths: ['servers.servers', 'configurations.configurations'],
        },
      }),
    devTools: false,
  });
};

// Default test state
export const createDefaultTestState = (): Partial<RootState> => ({
  ui: {
    theme: 'light',
    layout: {
      sidebarWidth: 280,
      sidebarCollapsed: false,
      headerHeight: 64,
      footerVisible: true,
      density: 'comfortable',
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      numberFormat: 'en-US',
      animations: true,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
    },
    notifications: [],
    dialogs: [],
    loading: {
      global: false,
      operations: new Map(),
    },
    errors: {
      global: null,
      operations: new Map(),
    },
    connectivity: {
      online: true,
      lastOnline: new Date().toISOString(),
    },
    performance: {
      fps: 60,
      memoryUsage: 0,
      renderTime: 0,
    },
    accessibility: {
      screenReader: false,
      keyboardNavigation: false,
      focusVisible: true,
    },
  },
  servers: {
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
  },
  configurations: {
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
  },
});

// Custom render wrapper
interface AllTheProvidersProps {
  children: ReactNode;
  store?: EnhancedStore;
  theme?: any;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  store,
  theme = testTheme,
}) => {
  const testStore = store || createTestStore();

  return (
    <Provider store={testStore}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );
};

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: EnhancedStore;
  theme?: any;
  services?: {
    serverService?: IServerService;
    configurationService?: IConfigurationService;
  };
}

// Enhanced render function
export const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState,
    store,
    theme,
    services,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & {
  store: EnhancedStore;
  user: ReturnType<typeof userEvent.setup>;
} => {
  const testStore = store || createTestStore(preloadedState, services);
  const user = userEvent.setup();

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllTheProviders store={testStore} theme={theme}>
      {children}
    </AllTheProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store: testStore,
    user,
  };
};

// Accessibility testing utility
export const checkAccessibility = async (container: HTMLElement): Promise<void> => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Wait for loading states
export const waitForLoadingToFinish = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Mock timers utility
export const mockTimers = {
  setup: () => {
    jest.useFakeTimers();
  },
  cleanup: () => {
    jest.useRealTimers();
  },
  advanceBy: (ms: number) => {
    jest.advanceTimersByTime(ms);
  },
  advanceToNext: () => {
    jest.runOnlyPendingTimers();
  },
  advanceAll: () => {
    jest.runAllTimers();
  },
};

// Common test data factories
export const createTestServer = (overrides = {}) => ({
  id: 'test-server-1' as any,
  name: 'Test Server',
  description: 'A test server for unit testing',
  configuration: {
    command: 'node',
    args: ['test-server.js'],
    workingDirectory: '/tmp',
    environment: new Map([['NODE_ENV', 'test']]),
    autoStart: false,
    restartOnCrash: true,
    maxRestarts: 3,
    timeout: 30000,
  },
  status: {
    kind: 'stopped' as const,
    since: new Date().toISOString() as any,
  },
  tags: ['test', 'development'],
  metrics: {
    uptime: 0,
    restartCount: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    lastError: null,
  },
  createdAt: new Date().toISOString() as any,
  updatedAt: new Date().toISOString() as any,
  ...overrides,
});

export const createTestConfiguration = (overrides = {}) => ({
  id: 'test-config-1' as any,
  name: 'Test Configuration',
  description: 'A test configuration',
  servers: ['test-server-1' as any],
  validation: {
    isValid: true,
    errors: new Map(),
    warnings: new Map(),
    lastValidated: new Date().toISOString() as any,
  },
  statistics: {
    serverCount: 1,
    runningServers: 0,
    totalUptime: 0,
    lastDeployment: null,
  },
  createdAt: new Date().toISOString() as any,
  updatedAt: new Date().toISOString() as any,
  ...overrides,
});

// Custom matchers for better testing
export const customMatchers = {
  toBeValidUUID: (received: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidISODate: (received: string) => {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received.includes('T');
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date`
          : `expected ${received} to be a valid ISO date`,
      pass,
    };
  },
  
  toHaveValidReduxState: (store: EnhancedStore) => {
    const state = store.getState();
    const hasRequiredSlices = 'servers' in state && 'configurations' in state && 'ui' in state;
    
    return {
      message: () =>
        hasRequiredSlices
          ? 'expected store not to have valid Redux state structure'
          : 'expected store to have valid Redux state structure with servers, configurations, and ui slices',
      pass: hasRequiredSlices,
    };
  },
};

// Extend Jest with custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidISODate(): R;
      toHaveValidReduxState(): R;
    }
  }
}

// Apply custom matchers
expect.extend(customMatchers);

// Export everything for convenience
export * from '@testing-library/react';
export { userEvent };
export { renderWithProviders as render };