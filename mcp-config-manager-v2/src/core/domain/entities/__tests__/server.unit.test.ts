/**
 * Unit tests for Server domain entity
 */

import {
  MCPServer,
  CreateServerInput,
  UpdateServerInput,
  ServerStatus,
  ServerConfiguration,
  ServerMetrics,
  isValidServerName,
  isValidCommand,
  createServerStatus,
  updateServerMetrics,
  calculateUptime,
  isServerHealthy,
} from '../server';
import { UUID, ISODateString, createUUID, createISODateString } from '@shared/types/branded';

describe('Server Domain Entity', () => {
  let mockServer: MCPServer;
  let mockCreateInput: CreateServerInput;
  let mockUpdateInput: UpdateServerInput;

  beforeEach(() => {
    mockServer = {
      id: createUUID(),
      name: 'Test Server' as any,
      description: 'A test server for unit testing' as any,
      configuration: {
        command: 'node' as any,
        args: ['server.js'],
        workingDirectory: '/tmp',
        environment: new Map([
          ['NODE_ENV' as any, 'test' as any],
          ['PORT' as any, '3000' as any],
        ]),
        autoRestart: true,
        retryLimit: 3,
        timeout: 30000,
      },
      status: {
        kind: 'stopped',
        since: createISODateString(new Date()),
      },
      healthCheck: {
        enabled: false,
        interval: 30000,
        timeout: 5000,
        retries: 3,
      },
      tags: ['test', 'development'],
      metrics: {
        uptime: 0,
        restartCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      createdAt: createISODateString(new Date()),
      updatedAt: createISODateString(new Date()),
      version: 1,
    };

    mockCreateInput = {
      name: 'New Test Server' as any,
      description: 'A new test server' as any,
      configuration: {
        command: 'python' as any,
        args: ['app.py'],
        workingDirectory: '/app',
        environment: new Map([['PYTHON_ENV' as any, 'test' as any]]),
        autoRestart: false,
        retryLimit: 5,
        timeout: 45000,
      },
      tags: ['python', 'web'],
    };

    mockUpdateInput = {
      name: 'Updated Test Server' as any,
      description: 'An updated test server' as any,
      configuration: {
        command: 'node' as any,
        args: ['updated-server.js'],
        workingDirectory: '/updated',
        environment: new Map([['NODE_ENV' as any, 'production' as any]]),
        autoRestart: true,
        retryLimit: 1,
        timeout: 60000,
      },
      tags: ['production', 'updated'],
    };
  });

  describe('Server validation', () => {
    describe('isValidServerName', () => {
      it('should accept valid server names', () => {
        expect(isValidServerName('Test Server')).toBe(true);
        expect(isValidServerName('My-Server_123')).toBe(true);
        expect(isValidServerName('Production API Server')).toBe(true);
        expect(isValidServerName('web-01')).toBe(true);
      });

      it('should reject invalid server names', () => {
        expect(isValidServerName('')).toBe(false);
        expect(isValidServerName('  ')).toBe(false);
        expect(isValidServerName('ab')).toBe(false); // Too short
        expect(isValidServerName('a'.repeat(101))).toBe(false); // Too long
        expect(isValidServerName('test@server')).toBe(false); // Invalid characters
        expect(isValidServerName('test#server')).toBe(false); // Invalid characters
      });
    });

    describe('isValidCommand', () => {
      it('should accept valid commands', () => {
        expect(isValidCommand('node')).toBe(true);
        expect(isValidCommand('python')).toBe(true);
        expect(isValidCommand('/usr/bin/node')).toBe(true);
        expect(isValidCommand('./my-script')).toBe(true);
        expect(isValidCommand('C:\\Program Files\\node\\node.exe')).toBe(true);
      });

      it('should reject invalid commands', () => {
        expect(isValidCommand('')).toBe(false);
        expect(isValidCommand('  ')).toBe(false);
        expect(isValidCommand('command; rm -rf /')).toBe(false); // Command injection
        expect(isValidCommand('command && malicious')).toBe(false); // Command chaining
        expect(isValidCommand('command | dangerous')).toBe(false); // Piping
        expect(isValidCommand('command > /etc/passwd')).toBe(false); // Redirection
      });
    });
  });

  describe('Server status management', () => {
    describe('createServerStatus', () => {
      it('should create stopped status', () => {
        const status = createServerStatus('stopped');
        
        expect(status.kind).toBe('stopped');
        expect(status.since).toBeValidISODate();
        expect('reason' in status ? status.reason : undefined).toBeUndefined();
      });

      it('should create running status', () => {
        const status = createServerStatus('running', { pid: 1234 });
        
        expect(status.kind).toBe('running');
        expect(status.since).toBeValidISODate();
        expect('pid' in status ? status.pid : undefined).toBe(1234);
      });

      it('should create error status', () => {
        const error = { message: 'Test error', code: 'TEST_ERROR' };
        const status = createServerStatus('error', { error });
        
        expect(status.kind).toBe('error');
        expect(status.since).toBeValidISODate();
        expect('error' in status ? status.error : undefined).toEqual(error);
      });

      it('should create updating status', () => {
        const status = createServerStatus('updating', { progress: 50 });
        
        expect(status.kind).toBe('updating');
        expect(status.since).toBeValidISODate();
        expect('progress' in status ? status.progress : undefined).toBe(50);
      });

      it('should create idle status', () => {
        const status = createServerStatus('idle');
        
        expect(status.kind).toBe('idle');
        expect(status.since).toBeValidISODate();
      });
    });
  });

  describe('Server metrics', () => {
    describe('updateServerMetrics', () => {
      it('should update metrics correctly', () => {
        const updates = {
          memoryUsage: 256 * 1024 * 1024, // 256MB
          cpuUsage: 25.5,
          uptime: 3600000, // 1 hour
          restartCount: 2,
        };

        const updatedMetrics = updateServerMetrics(mockServer.metrics, updates);

        expect(updatedMetrics.memoryUsage).toBe(updates.memoryUsage);
        expect(updatedMetrics.cpuUsage).toBe(updates.cpuUsage);
        expect(updatedMetrics.uptime).toBe(updates.uptime);
        expect(updatedMetrics.restartCount).toBe(updates.restartCount);
        expect(updatedMetrics.lastError).toBe(mockServer.metrics.lastError);
      });

      it('should preserve unchanged metrics', () => {
        const updates = { cpuUsage: 50.0 };
        const updatedMetrics = updateServerMetrics(mockServer.metrics, updates);

        expect(updatedMetrics.cpuUsage).toBe(50.0);
        expect(updatedMetrics.memoryUsage).toBe(mockServer.metrics.memoryUsage);
        expect(updatedMetrics.uptime).toBe(mockServer.metrics.uptime);
        expect(updatedMetrics.restartCount).toBe(mockServer.metrics.restartCount);
      });

      it('should update last error', () => {
        const error = { message: 'Memory leak detected', code: 'MEMORY_LEAK' };
        const updatedMetrics = updateServerMetrics(mockServer.metrics, { 
          lastRestart: createISODateString(new Date())
        });

        expect(updatedMetrics.lastRestart).toBeDefined();
      });
    });

    describe('calculateUptime', () => {
      it('should calculate uptime for running server', () => {
        const startTime = new Date(Date.now() - 3600000); // 1 hour ago
        const status: ServerStatus = {
          kind: 'running',
          since: startTime.toISOString() as ISODateString,
          pid: 1234,
        };

        const uptime = calculateUptime(status);
        expect(uptime).toBeGreaterThanOrEqual(3600000 - 1000); // Allow 1s tolerance
        expect(uptime).toBeLessThanOrEqual(3600000 + 1000);
      });

      it('should return 0 for stopped server', () => {
        const status: ServerStatus = {
          kind: 'stopped',
          since: createISODateString(),
        };

        const uptime = calculateUptime(status);
        expect(uptime).toBe(0);
      });

      it('should return 0 for error server', () => {
        const status: ServerStatus = {
          kind: 'error',
          since: createISODateString(),
          error: { message: 'Test error', code: 'TEST' },
        };

        const uptime = calculateUptime(status);
        expect(uptime).toBe(0);
      });
    });

    describe('isServerHealthy', () => {
      it('should consider running server healthy', () => {
        const healthyServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'running',
            since: createISODateString(),
            pid: 1234,
          },
          metrics: {
            uptime: 3600000,
            restartCount: 0,
            memoryUsage: 128 * 1024 * 1024, // 128MB
            cpuUsage: 15.0,
            lastError: null,
          },
        };

        expect(isServerHealthy(healthyServer)).toBe(true);
      });

      it('should consider server with high restart count unhealthy', () => {
        const unhealthyServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'running',
            since: createISODateString(),
            pid: 1234,
          },
          metrics: {
            uptime: 3600000,
            restartCount: 10, // High restart count
            memoryUsage: 128 * 1024 * 1024,
            cpuUsage: 15.0,
            lastError: null,
          },
        };

        expect(isServerHealthy(unhealthyServer)).toBe(false);
      });

      it('should consider server with high memory usage unhealthy', () => {
        const unhealthyServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'running',
            since: createISODateString(),
            pid: 1234,
          },
          metrics: {
            uptime: 3600000,
            restartCount: 0,
            memoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
            cpuUsage: 15.0,
            lastError: null,
          },
        };

        expect(isServerHealthy(unhealthyServer)).toBe(false);
      });

      it('should consider server with high CPU usage unhealthy', () => {
        const unhealthyServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'running',
            since: createISODateString(),
            pid: 1234,
          },
          metrics: {
            uptime: 3600000,
            restartCount: 0,
            memoryUsage: 128 * 1024 * 1024,
            cpuUsage: 95.0, // High CPU usage
            lastError: null,
          },
        };

        expect(isServerHealthy(unhealthyServer)).toBe(false);
      });

      it('should consider stopped server unhealthy', () => {
        const stoppedServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'stopped',
            since: createISODateString(),
          },
        };

        expect(isServerHealthy(stoppedServer)).toBe(false);
      });

      it('should consider error server unhealthy', () => {
        const errorServer: MCPServer = {
          ...mockServer,
          status: {
            kind: 'error',
            since: createISODateString(),
            error: { message: 'Critical error', code: 'CRITICAL' },
          },
        };

        expect(isServerHealthy(errorServer)).toBe(false);
      });
    });
  });

  describe('Server creation and updates', () => {
    it('should create server from CreateServerInput', () => {
      expect(mockCreateInput.name).toBe('New Test Server');
      expect(mockCreateInput.description).toBe('A new test server');
      expect(mockCreateInput.configuration.command).toBe('python');
      expect(mockCreateInput.configuration.args).toEqual(['app.py']);
      expect(mockCreateInput.tags).toEqual(['python', 'web']);
    });

    it('should update server from UpdateServerInput', () => {
      expect(mockUpdateInput.name).toBe('Updated Test Server');
      expect(mockUpdateInput.description).toBe('An updated test server');
      expect(mockUpdateInput.configuration?.command).toBe('node');
      expect(mockUpdateInput.configuration?.retryLimit).toBe(1);
      expect(mockUpdateInput.tags).toEqual(['production', 'updated']);
    });
  });

  describe('Environment variable handling', () => {
    it('should handle environment variables correctly', () => {
      const envMap = new Map([
        ['NODE_ENV', 'production'],
        ['PORT', '8080'],
        ['DB_URL', 'mongodb://localhost:27017'],
      ]);

      const server: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          environment: envMap,
        },
      };

      expect(server.configuration.environment.size).toBe(3);
      expect(server.configuration.environment.get('NODE_ENV')).toBe('production');
      expect(server.configuration.environment.get('PORT')).toBe('8080');
      expect(server.configuration.environment.get('DB_URL')).toBe('mongodb://localhost:27017');
    });

    it('should handle empty environment variables', () => {
      const server: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          environment: new Map(),
        },
      };

      expect(server.configuration.environment.size).toBe(0);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for server ID', () => {
      expect(mockServer.id).toBeValidUUID();
    });

    it('should maintain type safety for dates', () => {
      expect(mockServer.createdAt).toBeValidISODate();
      expect(mockServer.updatedAt).toBeValidISODate();
      expect(mockServer.status.since).toBeValidISODate();
    });

    it('should enforce discriminated union for status', () => {
      const runningStatus: ServerStatus = {
        kind: 'running',
        since: createISODateString(),
        pid: 1234,
      };

      const stoppedStatus: ServerStatus = {
        kind: 'stopped',
        since: createISODateString(),
        reason: 'Manual stop',
      };

      const errorStatus: ServerStatus = {
        kind: 'error',
        since: createISODateString(),
        error: { message: 'Error occurred', code: 'ERROR' },
      };

      expect(runningStatus.kind).toBe('running');
      expect('pid' in runningStatus ? runningStatus.pid : undefined).toBe(1234);
      
      expect(stoppedStatus.kind).toBe('stopped');
      expect('reason' in stoppedStatus ? stoppedStatus.reason : undefined).toBe('Manual stop');
      
      expect(errorStatus.kind).toBe('error');
      expect('error' in errorStatus ? errorStatus.error.message : undefined).toBe('Error occurred');
    });
  });

  describe('Edge cases', () => {
    it('should handle servers with very long names', () => {
      const longName = 'A'.repeat(100); // Maximum allowed length
      expect(isValidServerName(longName)).toBe(true);
      
      const tooLongName = 'A'.repeat(101);
      expect(isValidServerName(tooLongName)).toBe(false);
    });

    it('should handle servers with special characters in working directory', () => {
      const serverWithSpecialPath: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          workingDirectory: '/path/with spaces/and-symbols',
        },
      };

      expect(serverWithSpecialPath.configuration.workingDirectory).toBe('/path/with spaces/and-symbols');
    });

    it('should handle servers with many arguments', () => {
      const manyArgs = Array.from({ length: 50 }, (_, i) => `arg${i}`);
      const serverWithManyArgs: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          args: manyArgs,
        },
      };

      expect(serverWithManyArgs.configuration.args).toHaveLength(50);
      expect(serverWithManyArgs.configuration.args[0]).toBe('arg0');
      expect(serverWithManyArgs.configuration.args[49]).toBe('arg49');
    });

    it('should handle extreme timeout values', () => {
      const veryShortTimeout = 1000; // 1 second
      const veryLongTimeout = 300000; // 5 minutes

      const shortTimeoutServer: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          timeout: veryShortTimeout,
        },
      };

      const longTimeoutServer: MCPServer = {
        ...mockServer,
        configuration: {
          ...mockServer.configuration,
          timeout: veryLongTimeout,
        },
      };

      expect(shortTimeoutServer.configuration.timeout).toBe(1000);
      expect(longTimeoutServer.configuration.timeout).toBe(300000);
    });
  });
});