/**
 * MSW request handlers for mocking API responses
 */

import { http, HttpResponse } from 'msw';
import type { MCPServer, CreateServerInput, UpdateServerInput } from '@core/domain/entities/server';
import type { MCPConfiguration } from '@core/domain/entities/configuration';

// Mock data
const mockServers: MCPServer[] = [
  {
    id: 'server-1' as any,
    name: 'Test Server 1',
    description: 'First test server',
    configuration: {
      command: 'node',
      args: ['server1.js'],
      workingDirectory: '/tmp',
      environment: new Map([['NODE_ENV', 'test']]),
      autoStart: true,
      restartOnCrash: true,
      maxRestarts: 3,
      timeout: 30000,
    },
    status: {
      kind: 'running',
      since: '2024-01-01T00:00:00.000Z' as any,
      pid: 1234,
    },
    tags: ['test', 'development'],
    metrics: {
      uptime: 3600000,
      restartCount: 0,
      memoryUsage: 128 * 1024 * 1024,
      cpuUsage: 15.5,
      lastError: null,
    },
    createdAt: '2024-01-01T00:00:00.000Z' as any,
    updatedAt: '2024-01-01T00:00:00.000Z' as any,
  },
  {
    id: 'server-2' as any,
    name: 'Test Server 2',
    description: 'Second test server',
    configuration: {
      command: 'python',
      args: ['server2.py'],
      workingDirectory: '/tmp',
      environment: new Map([['PYTHON_ENV', 'test']]),
      autoStart: false,
      restartOnCrash: true,
      maxRestarts: 5,
      timeout: 45000,
    },
    status: {
      kind: 'stopped',
      since: '2024-01-01T01:00:00.000Z' as any,
      reason: 'Manual stop',
    },
    tags: ['test', 'python'],
    metrics: {
      uptime: 0,
      restartCount: 2,
      memoryUsage: 0,
      cpuUsage: 0,
      lastError: null,
    },
    createdAt: '2024-01-01T00:00:00.000Z' as any,
    updatedAt: '2024-01-01T01:00:00.000Z' as any,
  },
];

const mockConfigurations: MCPConfiguration[] = [
  {
    id: 'config-1' as any,
    name: 'Test Configuration',
    description: 'Test configuration for development',
    servers: ['server-1' as any, 'server-2' as any],
    validation: {
      isValid: true,
      errors: new Map(),
      warnings: new Map(),
      lastValidated: '2024-01-01T00:00:00.000Z' as any,
    },
    statistics: {
      serverCount: 2,
      runningServers: 1,
      totalUptime: 3600000,
      lastDeployment: '2024-01-01T00:00:00.000Z' as any,
    },
    createdAt: '2024-01-01T00:00:00.000Z' as any,
    updatedAt: '2024-01-01T00:00:00.000Z' as any,
  },
];

// API handlers
export const handlers = [
  // Server endpoints
  http.get('/api/servers', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filteredServers = [...mockServers];

    // Apply filters
    if (search) {
      filteredServers = filteredServers.filter(server =>
        server.name.toLowerCase().includes(search.toLowerCase()) ||
        server.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status && status !== 'all') {
      filteredServers = filteredServers.filter(server => server.status.kind === status);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedServers = filteredServers.slice(startIndex, endIndex);

    return HttpResponse.json({
      kind: 'success',
      value: {
        servers: paginatedServers,
        pagination: {
          page,
          limit,
          total: filteredServers.length,
          pages: Math.ceil(filteredServers.length / limit),
        },
        filters: { search, status },
        sort: { field: 'name', direction: 'asc' },
      },
    });
  }),

  http.get('/api/servers/:id', ({ params }) => {
    const { id } = params;
    const server = mockServers.find(s => s.id === id);

    if (!server) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      kind: 'success',
      value: server,
    });
  }),

  http.post('/api/servers', async ({ request }) => {
    const input = await request.json() as CreateServerInput;
    
    const newServer: MCPServer = {
      id: `server-${Date.now()}` as any,
      name: input.name,
      description: input.description,
      configuration: input.configuration,
      status: {
        kind: 'stopped',
        since: new Date().toISOString() as any,
      },
      tags: input.tags || [],
      metrics: {
        uptime: 0,
        restartCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        lastError: null,
      },
      createdAt: new Date().toISOString() as any,
      updatedAt: new Date().toISOString() as any,
    };

    mockServers.push(newServer);

    return HttpResponse.json({
      kind: 'success',
      value: newServer,
    }, { status: 201 });
  }),

  http.put('/api/servers/:id', async ({ params, request }) => {
    const { id } = params;
    const input = await request.json() as UpdateServerInput;
    const serverIndex = mockServers.findIndex(s => s.id === id);

    if (serverIndex === -1) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server not found' } },
        { status: 404 }
      );
    }

    const updatedServer: MCPServer = {
      ...mockServers[serverIndex],
      name: input.name,
      description: input.description,
      configuration: input.configuration,
      tags: input.tags || [],
      updatedAt: new Date().toISOString() as any,
    };

    mockServers[serverIndex] = updatedServer;

    return HttpResponse.json({
      kind: 'success',
      value: updatedServer,
    });
  }),

  http.delete('/api/servers/:id', ({ params }) => {
    const { id } = params;
    const serverIndex = mockServers.findIndex(s => s.id === id);

    if (serverIndex === -1) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server not found' } },
        { status: 404 }
      );
    }

    mockServers.splice(serverIndex, 1);

    return HttpResponse.json({
      kind: 'success',
      value: undefined,
    });
  }),

  http.post('/api/servers/:id/start', ({ params }) => {
    const { id } = params;
    const server = mockServers.find(s => s.id === id);

    if (!server) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server not found' } },
        { status: 404 }
      );
    }

    if (server.status.kind === 'running') {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server is already running' } },
        { status: 400 }
      );
    }

    server.status = {
      kind: 'running',
      since: new Date().toISOString() as any,
      pid: Math.floor(Math.random() * 10000) + 1000,
    };

    return HttpResponse.json({
      kind: 'success',
      value: undefined,
    });
  }),

  http.post('/api/servers/:id/stop', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as { reason?: string };
    const server = mockServers.find(s => s.id === id);

    if (!server) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server not found' } },
        { status: 404 }
      );
    }

    if (server.status.kind === 'stopped') {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Server is already stopped' } },
        { status: 400 }
      );
    }

    server.status = {
      kind: 'stopped',
      since: new Date().toISOString() as any,
      reason: body.reason || 'Manual stop',
    };

    return HttpResponse.json({
      kind: 'success',
      value: undefined,
    });
  }),

  // Configuration endpoints
  http.get('/api/configurations', () => {
    return HttpResponse.json({
      kind: 'success',
      value: mockConfigurations,
    });
  }),

  http.get('/api/configurations/:id', ({ params }) => {
    const { id } = params;
    const configuration = mockConfigurations.find(c => c.id === id);

    if (!configuration) {
      return HttpResponse.json(
        { kind: 'failure', error: { message: 'Configuration not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      kind: 'success',
      value: configuration,
    });
  }),

  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    });
  }),

  // Error simulation endpoints for testing error handling
  http.get('/api/test/error/500', () => {
    return HttpResponse.json(
      { kind: 'failure', error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }),

  http.get('/api/test/error/timeout', () => {
    // Simulate a timeout by delaying the response
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(HttpResponse.json({
          kind: 'failure',
          error: { message: 'Request timeout' },
        }, { status: 408 }));
      }, 30000); // 30 second delay
    });
  }),

  http.get('/api/test/error/network', () => {
    // Simulate a network error
    return HttpResponse.error();
  }),
];

// Helper functions for test setup
export const resetMockData = () => {
  // Reset to initial state
  mockServers.length = 0;
  mockServers.push(
    {
      id: 'server-1' as any,
      name: 'Test Server 1',
      description: 'First test server',
      configuration: {
        command: 'node',
        args: ['server1.js'],
        workingDirectory: '/tmp',
        environment: new Map([['NODE_ENV', 'test']]),
        autoStart: true,
        restartOnCrash: true,
        maxRestarts: 3,
        timeout: 30000,
      },
      status: {
        kind: 'running',
        since: '2024-01-01T00:00:00.000Z' as any,
        pid: 1234,
      },
      tags: ['test', 'development'],
      metrics: {
        uptime: 3600000,
        restartCount: 0,
        memoryUsage: 128 * 1024 * 1024,
        cpuUsage: 15.5,
        lastError: null,
      },
      createdAt: '2024-01-01T00:00:00.000Z' as any,
      updatedAt: '2024-01-01T00:00:00.000Z' as any,
    },
    {
      id: 'server-2' as any,
      name: 'Test Server 2',
      description: 'Second test server',
      configuration: {
        command: 'python',
        args: ['server2.py'],
        workingDirectory: '/tmp',
        environment: new Map([['PYTHON_ENV', 'test']]),
        autoStart: false,
        restartOnCrash: true,
        maxRestarts: 5,
        timeout: 45000,
      },
      status: {
        kind: 'stopped',
        since: '2024-01-01T01:00:00.000Z' as any,
        reason: 'Manual stop',
      },
      tags: ['test', 'python'],
      metrics: {
        uptime: 0,
        restartCount: 2,
        memoryUsage: 0,
        cpuUsage: 0,
        lastError: null,
      },
      createdAt: '2024-01-01T00:00:00.000Z' as any,
      updatedAt: '2024-01-01T01:00:00.000Z' as any,
    }
  );
};

export const addMockServer = (server: MCPServer) => {
  mockServers.push(server);
};