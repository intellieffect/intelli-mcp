/**
 * Integration tests for Server Redux store
 */

import { configureStore } from '@reduxjs/toolkit';
import serverReducer, {
  fetchServers,
  fetchServer,
  createServer,
  updateServer,
  deleteServer,
  startServer,
  stopServer,
  selectServers,
  selectServerById,
  selectServerStatistics,
  selectServerLoading,
  selectServerErrors,
  updateServerStatus,
  updateServerMetrics,
} from '../server-store';
import { createMockServerService } from '@test/utils/test-utils';
import type { MCPServer, CreateServerInput, UpdateServerInput } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

// Mock data
const mockServer1: MCPServer = {
  id: 'server-1' as UUID,
  name: 'Test Server 1' as any,
  description: 'First test server' as any,
  configuration: {
    command: 'node' as any,
    args: ['server1.js'],
    workingDirectory: '/tmp',
    environment: new Map([['NODE_ENV' as any, 'test' as any]]),
    autoRestart: true,
    retryLimit: 3,
    timeout: 30000,
  },
  status: {
    kind: 'running',
    since: '2024-01-01T00:00:00.000Z' as any,
    pid: 1234,
  },
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    retries: 3,
  },
  tags: ['test', 'development'],
  metrics: {
    uptime: 3600000,
    restartCount: 0,
    memoryUsage: 128 * 1024 * 1024,
    cpuUsage: 15.5,
  },
  createdAt: '2024-01-01T00:00:00.000Z' as any,
  updatedAt: '2024-01-01T00:00:00.000Z' as any,
  version: 1,
};

const mockServer2: MCPServer = {
  id: 'server-2' as UUID,
  name: 'Test Server 2' as any,
  description: 'Second test server' as any,
  configuration: {
    command: 'python' as any,
    args: ['server2.py'],
    workingDirectory: '/tmp',
    environment: new Map([['PYTHON_ENV' as any, 'test' as any]]),
    autoRestart: true,
    retryLimit: 5,
    timeout: 45000,
  },
  status: {
    kind: 'stopped',
    since: '2024-01-01T01:00:00.000Z' as any,
    reason: 'Manual stop',
  },
  healthCheck: {
    enabled: false,
    interval: 60000,
    timeout: 10000,
    retries: 2,
  },
  tags: ['test', 'python'],
  metrics: {
    uptime: 0,
    restartCount: 2,
    memoryUsage: 0,
    cpuUsage: 0,
  },
  createdAt: '2024-01-01T00:00:00.000Z' as any,
  updatedAt: '2024-01-01T01:00:00.000Z' as any,
  version: 1,
};

describe('Server Store Integration Tests', () => {
  let store: ReturnType<typeof configureStore>;
  let mockServerService: ReturnType<typeof createMockServerService>;

  beforeEach(() => {
    mockServerService = createMockServerService();
    
    store = configureStore({
      reducer: {
        servers: serverReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: {
            extraArgument: { serverService: mockServerService },
          },
          serializableCheck: {
            ignoredPaths: ['servers.servers'],
          },
        }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server fetching', () => {
    it('should fetch servers successfully', async () => {
      // Arrange
      const mockQueryResult = {
        servers: [mockServer1, mockServer2],
        pagination: { page: 1, limit: 10, total: 2 },
        filters: {},
        sort: { field: 'name' as const, direction: 'asc' as const },
      };

      mockServerService.getServers.mockResolvedValue({
        kind: 'success',
        value: mockQueryResult,
      });

      // Act
      const action = fetchServers({});
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const loading = selectServerLoading(state);

      expect(servers).toHaveLength(2);
      expect(servers[0].id).toBe('server-1');
      expect(servers[1].id).toBe('server-2');
      expect(loading.fetching).toBe(false);
      expect(mockServerService.getServers).toHaveBeenCalledWith(
        {},
        { field: 'name', direction: 'asc' },
        { page: 1, limit: 10 }
      );
    });

    it('should handle fetch servers error', async () => {
      // Arrange
      mockServerService.getServers.mockResolvedValue({
        kind: 'failure',
        error: { message: 'Failed to fetch servers' },
      });

      // Act
      const action = fetchServers({});
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const loading = selectServerLoading(state);
      const errors = selectServerErrors(state);

      expect(servers).toHaveLength(0);
      expect(loading.fetching).toBe(false);
      expect(errors.fetch).toBe('Failed to fetch servers');
    });

    it('should fetch individual server successfully', async () => {
      // Arrange
      mockServerService.getServer.mockResolvedValue({
        kind: 'success',
        value: mockServer1,
      });

      // Act
      const action = fetchServer('server-1' as UUID);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const server = selectServerById('server-1' as UUID)(state);

      expect(server).toBeDefined();
      expect(server?.id).toBe('server-1');
      expect(server?.name).toBe('Test Server 1');
      expect(mockServerService.getServer).toHaveBeenCalledWith('server-1');
    });
  });

  describe('Server creation', () => {
    it('should create server successfully', async () => {
      // Arrange
      const createInput: CreateServerInput = {
        name: 'New Server' as any,
        description: 'A new server' as any,
        configuration: {
          command: 'node' as any,
          args: ['app.js'],
          workingDirectory: '/app',
          environment: new Map([['NODE_ENV' as any, 'production' as any]]),
        },
        tags: ['production'],
      };

      const createdServer: MCPServer = {
        id: 'new-server-id' as UUID,
        ...createInput,
        status: {
          kind: 'stopped',
          since: '2024-01-01T00:00:00.000Z' as any,
        },
        healthCheck: {
          enabled: false,
          interval: 30000,
          timeout: 5000,
          retries: 3,
        },
        metrics: {
          uptime: 0,
          restartCount: 0,
        },
        createdAt: '2024-01-01T00:00:00.000Z' as any,
        updatedAt: '2024-01-01T00:00:00.000Z' as any,
        version: 1,
      };

      mockServerService.createServer.mockResolvedValue({
        kind: 'success',
        value: createdServer,
      });

      // Act
      const action = createServer(createInput);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const loading = selectServerLoading(state);

      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('new-server-id');
      expect(servers[0].name).toBe('New Server');
      expect(loading.creating).toBe(false);
      expect(mockServerService.createServer).toHaveBeenCalledWith(createInput);
    });

    it('should handle create server error', async () => {
      // Arrange
      const createInput: CreateServerInput = {
        name: 'Invalid Server' as any,
        configuration: {
          command: '' as any, // Invalid command
          args: [],
          environment: new Map(),
        },
      };

      mockServerService.createServer.mockResolvedValue({
        kind: 'failure',
        error: { message: 'Invalid server configuration' },
      });

      // Act
      const action = createServer(createInput);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const loading = selectServerLoading(state);
      const errors = selectServerErrors(state);

      expect(servers).toHaveLength(0);
      expect(loading.creating).toBe(false);
      expect(errors.create).toBe('Invalid server configuration');
    });
  });

  describe('Server updates', () => {
    beforeEach(async () => {
      // Add servers to store first
      store.dispatch({
        type: 'servers/fetchServers/fulfilled',
        payload: {
          servers: [mockServer1, mockServer2],
          pagination: { page: 1, limit: 10, total: 2 },
          filters: {},
          sort: { field: 'name' as const, direction: 'asc' as const },
        },
      });
    });

    it('should update server successfully', async () => {
      // Arrange
      const updateInput: UpdateServerInput = {
        name: 'Updated Server 1' as any,
        description: 'Updated description' as any,
        configuration: {
          timeout: 60000,
        },
      };

      const updatedServer: MCPServer = {
        ...mockServer1,
        name: 'Updated Server 1' as any,
        description: 'Updated description' as any,
        configuration: {
          ...mockServer1.configuration,
          timeout: 60000,
        },
        updatedAt: '2024-01-01T02:00:00.000Z' as any,
      };

      mockServerService.updateServer.mockResolvedValue({
        kind: 'success',
        value: updatedServer,
      });

      // Act
      const action = updateServer({ id: 'server-1' as UUID, input: updateInput });
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const server = selectServerById('server-1' as UUID)(state);
      const loading = selectServerLoading(state);

      expect(server?.name).toBe('Updated Server 1');
      expect(server?.description).toBe('Updated description');
      expect(server?.configuration.timeout).toBe(60000);
      expect(loading.updating.has('server-1' as UUID)).toBe(false);
      expect(mockServerService.updateServer).toHaveBeenCalledWith('server-1', updateInput);
    });

    it('should handle update server error', async () => {
      // Arrange
      const updateInput: UpdateServerInput = {
        name: '' as any, // Invalid name
      };

      mockServerService.updateServer.mockResolvedValue({
        kind: 'failure',
        error: { message: 'Server name cannot be empty' },
      });

      // Act
      const action = updateServer({ id: 'server-1' as UUID, input: updateInput });
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const loading = selectServerLoading(state);
      const errors = selectServerErrors(state);

      expect(loading.updating.has('server-1' as UUID)).toBe(false);
      expect(errors.update.get('server-1' as UUID)).toBe('Server name cannot be empty');
    });
  });

  describe('Server deletion', () => {
    beforeEach(async () => {
      // Add servers to store first
      store.dispatch({
        type: 'servers/fetchServers/fulfilled',
        payload: {
          servers: [mockServer1, mockServer2],
          pagination: { page: 1, limit: 10, total: 2 },
          filters: {},
          sort: { field: 'name' as const, direction: 'asc' as const },
        },
      });
    });

    it('should delete server successfully', async () => {
      // Arrange
      mockServerService.deleteServer.mockResolvedValue({
        kind: 'success',
        value: undefined,
      });

      // Act
      const action = deleteServer('server-1' as UUID);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const deletedServer = selectServerById('server-1' as UUID)(state);
      const loading = selectServerLoading(state);

      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('server-2');
      expect(deletedServer).toBeNull();
      expect(loading.deleting.has('server-1' as UUID)).toBe(false);
      expect(mockServerService.deleteServer).toHaveBeenCalledWith('server-1');
    });

    it('should handle delete server error', async () => {
      // Arrange
      mockServerService.deleteServer.mockResolvedValue({
        kind: 'failure',
        error: { message: 'Server is currently running' },
      });

      // Act
      const action = deleteServer('server-1' as UUID);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const servers = selectServers(state);
      const loading = selectServerLoading(state);
      const errors = selectServerErrors(state);

      expect(servers).toHaveLength(2); // Server should still exist
      expect(loading.deleting.has('server-1' as UUID)).toBe(false);
      expect(errors.delete.get('server-1' as UUID)).toBe('Server is currently running');
    });
  });

  describe('Server operations', () => {
    beforeEach(async () => {
      // Add servers to store first
      store.dispatch({
        type: 'servers/fetchServers/fulfilled',
        payload: {
          servers: [mockServer1, mockServer2],
          pagination: { page: 1, limit: 10, total: 2 },
          filters: {},
          sort: { field: 'name' as const, direction: 'asc' as const },
        },
      });
    });

    it('should start server successfully', async () => {
      // Arrange
      mockServerService.startServer.mockResolvedValue({
        kind: 'success',
        value: undefined,
      });

      // Act
      const action = startServer('server-2' as UUID);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const loading = selectServerLoading(state);

      expect(loading.starting.has('server-2' as UUID)).toBe(false);
      expect(mockServerService.startServer).toHaveBeenCalledWith('server-2');
    });

    it('should stop server successfully', async () => {
      // Arrange
      mockServerService.stopServer.mockResolvedValue({
        kind: 'success',
        value: undefined,
      });

      // Act
      const action = stopServer({ id: 'server-1' as UUID, reason: 'Manual stop' });
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const loading = selectServerLoading(state);

      expect(loading.stopping.has('server-1' as UUID)).toBe(false);
      expect(mockServerService.stopServer).toHaveBeenCalledWith('server-1', 'Manual stop');
    });

    it('should handle start server error', async () => {
      // Arrange
      mockServerService.startServer.mockResolvedValue({
        kind: 'failure',
        error: { message: 'Server is already running' },
      });

      // Act
      const action = startServer('server-1' as UUID);
      await store.dispatch(action);

      // Assert
      const state = store.getState();
      const loading = selectServerLoading(state);
      const errors = selectServerErrors(state);

      expect(loading.starting.has('server-1' as UUID)).toBe(false);
      expect(errors.start.get('server-1' as UUID)).toBe('Server is already running');
    });
  });

  describe('Server status and metrics updates', () => {
    beforeEach(async () => {
      // Add servers to store first
      store.dispatch({
        type: 'servers/fetchServers/fulfilled',
        payload: {
          servers: [mockServer1, mockServer2],
          pagination: { page: 1, limit: 10, total: 2 },
          filters: {},
          sort: { field: 'name' as const, direction: 'asc' as const },
        },
      });
    });

    it('should update server status', () => {
      // Arrange
      const newStatus = {
        kind: 'running' as const,
        since: '2024-01-01T03:00:00.000Z' as any,
        pid: 5678,
      };

      // Act
      store.dispatch(updateServerStatus({
        id: 'server-2' as UUID,
        status: newStatus,
      }));

      // Assert
      const state = store.getState();
      const server = selectServerById('server-2' as UUID)(state);

      expect(server?.status.kind).toBe('running');
      expect(server?.status.since).toBe('2024-01-01T03:00:00.000Z');
      expect('pid' in server!.status ? server.status.pid : undefined).toBe(5678);
    });

    it('should update server metrics', () => {
      // Arrange
      const newMetrics = {
        uptime: 7200000, // 2 hours
        memoryUsage: 256 * 1024 * 1024, // 256MB
        cpuUsage: 25.0,
        restartCount: 1,
      };

      // Act
      store.dispatch(updateServerMetrics({
        id: 'server-1' as UUID,
        metrics: newMetrics,
      }));

      // Assert
      const state = store.getState();
      const server = selectServerById('server-1' as UUID)(state);

      expect(server?.metrics.uptime).toBe(7200000);
      expect(server?.metrics.memoryUsage).toBe(256 * 1024 * 1024);
      expect(server?.metrics.cpuUsage).toBe(25.0);
      expect(server?.metrics.restartCount).toBe(1);
    });
  });

  describe('Selectors', () => {
    beforeEach(async () => {
      // Add servers to store first
      store.dispatch({
        type: 'servers/fetchServers/fulfilled',
        payload: {
          servers: [mockServer1, mockServer2],
          pagination: { page: 1, limit: 10, total: 2 },
          filters: {},
          sort: { field: 'name' as const, direction: 'asc' as const },
        },
      });
    });

    it('should calculate server statistics correctly', () => {
      // Act
      const state = store.getState();
      const stats = selectServerStatistics(state);

      // Assert
      expect(stats.total).toBe(2);
      expect(stats.running).toBe(1);
      expect(stats.stopped).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.idle).toBe(0);
    });

    it('should select servers by ID correctly', () => {
      // Act
      const state = store.getState();
      const server1 = selectServerById('server-1' as UUID)(state);
      const server2 = selectServerById('server-2' as UUID)(state);
      const nonExistent = selectServerById('non-existent' as UUID)(state);

      // Assert
      expect(server1?.id).toBe('server-1');
      expect(server1?.name).toBe('Test Server 1');
      expect(server2?.id).toBe('server-2');
      expect(server2?.name).toBe('Test Server 2');
      expect(nonExistent).toBeNull();
    });

    it('should return correct loading states', () => {
      // Arrange - Manually set loading states
      store.dispatch({
        type: 'servers/startServer/pending',
        meta: { arg: 'server-1' as UUID },
      });

      // Act
      const state = store.getState();
      const loading = selectServerLoading(state);

      // Assert
      expect(loading.starting.has('server-1' as UUID)).toBe(true);
      expect(loading.stopping.has('server-1' as UUID)).toBe(false);
      expect(loading.fetching).toBe(false);
      expect(loading.creating).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should clear all errors', () => {
      // Arrange - Add some errors
      store.dispatch({
        type: 'servers/createServer/rejected',
        error: { message: 'Create failed' },
      });
      store.dispatch({
        type: 'servers/updateServer/rejected',
        meta: { arg: { id: 'server-1' as UUID } },
        error: { message: 'Update failed' },
      });

      // Act
      store.dispatch({ type: 'servers/clearErrors' });

      // Assert
      const state = store.getState();
      const errors = selectServerErrors(state);

      expect(errors.fetch).toBeNull();
      expect(errors.create).toBeNull();
      expect(errors.update.size).toBe(0);
      expect(errors.delete.size).toBe(0);
      expect(errors.start.size).toBe(0);
      expect(errors.stop.size).toBe(0);
    });

    it('should clear specific error types', () => {
      // Arrange - Add some errors
      store.dispatch({
        type: 'servers/createServer/rejected',
        error: { message: 'Create failed' },
      });
      store.dispatch({
        type: 'servers/updateServer/rejected',
        meta: { arg: { id: 'server-1' as UUID } },
        error: { message: 'Update failed' },
      });

      // Act
      store.dispatch({
        type: 'servers/clearError',
        payload: { type: 'create' },
      });

      // Assert
      const state = store.getState();
      const errors = selectServerErrors(state);

      expect(errors.create).toBeNull();
      expect(errors.update.get('server-1' as UUID)).toBe('Update failed');
    });
  });
});