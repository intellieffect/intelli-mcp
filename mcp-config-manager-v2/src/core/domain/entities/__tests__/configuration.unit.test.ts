/**
 * Unit tests for Configuration domain entity
 */

import {
  MCPConfiguration,
  CreateConfigurationInput,
  UpdateConfigurationInput,
  ConfigurationValidation,
  ConfigurationStatistics,
  ConfigurationBackup,
  ConfigurationTemplate,
  isValidConfigurationName,
  validateConfiguration,
  createConfigurationStatistics,
  isConfigurationHealthy,
} from '../configuration';
import { UUID, ISODateString, createUUID, createISODateString } from '@shared/types/branded';

describe('Configuration Domain Entity', () => {
  let mockConfiguration: MCPConfiguration;
  let mockCreateInput: CreateConfigurationInput;
  let mockUpdateInput: UpdateConfigurationInput;

  beforeEach(() => {
    mockConfiguration = {
      id: createUUID(),
      name: 'Test Configuration' as any,
      description: 'A test configuration for unit testing' as any,
      servers: [createUUID(), createUUID()],
      validation: {
        isValid: true,
        errors: new Map(),
        warnings: new Map(),
        lastValidated: createISODateString(new Date()),
      },
      statistics: {
        serverCount: 2,
        runningServers: 1,
        totalUptime: 3600000,
        lastDeployment: createISODateString(new Date()),
      },
      createdAt: createISODateString(new Date()),
      updatedAt: createISODateString(new Date()),
    };

    mockCreateInput = {
      name: 'New Test Configuration' as any,
      description: 'A new test configuration' as any,
      servers: [createUUID()],
    };

    mockUpdateInput = {
      name: 'Updated Test Configuration' as any,
      description: 'An updated test configuration' as any,
      servers: [createUUID(), createUUID(), createUUID()],
    };
  });

  describe('Configuration validation', () => {
    describe('isValidConfigurationName', () => {
      it('should accept valid configuration names', () => {
        expect(isValidConfigurationName('Test Configuration')).toBe(true);
        expect(isValidConfigurationName('Production Setup')).toBe(true);
        expect(isValidConfigurationName('Dev-Environment_123')).toBe(true);
        expect(isValidConfigurationName('My Config')).toBe(true);
      });

      it('should reject invalid configuration names', () => {
        expect(isValidConfigurationName('')).toBe(false);
        expect(isValidConfigurationName('  ')).toBe(false);
        expect(isValidConfigurationName('ab')).toBe(false); // Too short
        expect(isValidConfigurationName('a'.repeat(201))).toBe(false); // Too long
        expect(isValidConfigurationName('config@test')).toBe(false); // Invalid characters
        expect(isValidConfigurationName('config#test')).toBe(false); // Invalid characters
      });
    });

    describe('validateConfiguration', () => {
      it('should validate configuration with servers', () => {
        const validation = validateConfiguration(mockConfiguration);
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors.size).toBe(0);
        expect(validation.warnings.size).toBe(0);
        expect(validation.lastValidated).toBeValidISODate();
      });

      it('should invalidate configuration without servers', () => {
        const emptyConfig: MCPConfiguration = {
          ...mockConfiguration,
          servers: [],
        };

        const validation = validateConfiguration(emptyConfig);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.has('servers')).toBe(true);
        expect(validation.errors.get('servers')).toBe('Configuration must have at least one server');
      });

      it('should add warnings for large configurations', () => {
        const largeConfig: MCPConfiguration = {
          ...mockConfiguration,
          servers: Array.from({ length: 20 }, () => createUUID()),
        };

        const validation = validateConfiguration(largeConfig);
        
        expect(validation.isValid).toBe(true);
        expect(validation.warnings.has('servers')).toBe(true);
        expect(validation.warnings.get('servers')).toContain('large number of servers');
      });
    });
  });

  describe('Configuration statistics', () => {
    describe('createConfigurationStatistics', () => {
      it('should create statistics from server data', () => {
        const serverStatuses = [
          { id: createUUID(), status: 'running' as const, uptime: 3600000 },
          { id: createUUID(), status: 'stopped' as const, uptime: 0 },
          { id: createUUID(), status: 'running' as const, uptime: 1800000 },
        ];

        const statistics = createConfigurationStatistics(serverStatuses);

        expect(statistics.serverCount).toBe(3);
        expect(statistics.runningServers).toBe(2);
        expect(statistics.totalUptime).toBe(5400000); // 3600000 + 1800000
        expect(statistics.lastDeployment).toBeNull();
      });

      it('should handle empty server list', () => {
        const statistics = createConfigurationStatistics([]);

        expect(statistics.serverCount).toBe(0);
        expect(statistics.runningServers).toBe(0);
        expect(statistics.totalUptime).toBe(0);
        expect(statistics.lastDeployment).toBeNull();
      });

      it('should handle all stopped servers', () => {
        const serverStatuses = [
          { id: createUUID(), status: 'stopped' as const, uptime: 0 },
          { id: createUUID(), status: 'error' as const, uptime: 0 },
        ];

        const statistics = createConfigurationStatistics(serverStatuses);

        expect(statistics.serverCount).toBe(2);
        expect(statistics.runningServers).toBe(0);
        expect(statistics.totalUptime).toBe(0);
      });
    });

    describe('isConfigurationHealthy', () => {
      it('should consider configuration with running servers healthy', () => {
        const healthyConfig: MCPConfiguration = {
          ...mockConfiguration,
          validation: {
            isValid: true,
            errors: new Map(),
            warnings: new Map(),
            lastValidated: createISODateString(new Date()),
          },
          statistics: {
            serverCount: 3,
            runningServers: 3,
            totalUptime: 10800000,
            lastDeployment: createISODateString(new Date()),
          },
        };

        expect(isConfigurationHealthy(healthyConfig)).toBe(true);
      });

      it('should consider invalid configuration unhealthy', () => {
        const invalidConfig: MCPConfiguration = {
          ...mockConfiguration,
          validation: {
            isValid: false,
            errors: new Map([['servers', 'No servers configured']]),
            warnings: new Map(),
            lastValidated: createISODateString(new Date()),
          },
        };

        expect(isConfigurationHealthy(invalidConfig)).toBe(false);
      });

      it('should consider configuration with no running servers unhealthy', () => {
        const stoppedConfig: MCPConfiguration = {
          ...mockConfiguration,
          statistics: {
            serverCount: 2,
            runningServers: 0,
            totalUptime: 0,
            lastDeployment: createISODateString(new Date()),
          },
        };

        expect(isConfigurationHealthy(stoppedConfig)).toBe(false);
      });

      it('should consider configuration with low running server ratio unhealthy', () => {
        const poorRatioConfig: MCPConfiguration = {
          ...mockConfiguration,
          statistics: {
            serverCount: 10,
            runningServers: 2, // Only 20% running
            totalUptime: 7200000,
            lastDeployment: createISODateString(new Date()),
          },
        };

        expect(isConfigurationHealthy(poorRatioConfig)).toBe(false);
      });

      it('should consider configuration with acceptable running server ratio healthy', () => {
        const goodRatioConfig: MCPConfiguration = {
          ...mockConfiguration,
          statistics: {
            serverCount: 10,
            runningServers: 8, // 80% running
            totalUptime: 28800000,
            lastDeployment: createISODateString(new Date()),
          },
        };

        expect(isConfigurationHealthy(goodRatioConfig)).toBe(true);
      });
    });
  });

  describe('Configuration creation and updates', () => {
    it('should create configuration from CreateConfigurationInput', () => {
      expect(mockCreateInput.name).toBe('New Test Configuration');
      expect(mockCreateInput.description).toBe('A new test configuration');
      expect(mockCreateInput.servers).toHaveLength(1);
      expect(mockCreateInput.servers[0]).toBeValidUUID();
    });

    it('should update configuration from UpdateConfigurationInput', () => {
      expect(mockUpdateInput.name).toBe('Updated Test Configuration');
      expect(mockUpdateInput.description).toBe('An updated test configuration');
      expect(mockUpdateInput.servers).toHaveLength(3);
      mockUpdateInput.servers?.forEach(serverId => {
        expect(serverId).toBeValidUUID();
      });
    });
  });

  describe('Configuration backups', () => {
    it('should create configuration backup', () => {
      const backup: ConfigurationBackup = {
        id: createUUID(),
        configurationId: mockConfiguration.id,
        snapshot: mockConfiguration,
        reason: 'Manual backup',
        metadata: {
          createdBy: 'test-user',
          tags: ['manual', 'test'],
          description: 'Test backup',
        },
        createdAt: createISODateString(new Date()),
      };

      expect(backup.id).toBeValidUUID();
      expect(backup.configurationId).toBe(mockConfiguration.id);
      expect(backup.snapshot).toEqual(mockConfiguration);
      expect(backup.reason).toBe('Manual backup');
      expect(backup.metadata.createdBy).toBe('test-user');
      expect(backup.createdAt).toBeValidISODate();
    });

    it('should create automated backup', () => {
      const backup: ConfigurationBackup = {
        id: createUUID(),
        configurationId: mockConfiguration.id,
        snapshot: mockConfiguration,
        reason: 'Automated backup',
        metadata: {
          createdBy: 'system',
          tags: ['automated', 'scheduled'],
          description: 'Daily automated backup',
        },
        createdAt: createISODateString(new Date()),
      };

      expect(backup.reason).toBe('Automated backup');
      expect(backup.metadata.createdBy).toBe('system');
      expect(backup.metadata.tags).toContain('automated');
    });
  });

  describe('Configuration templates', () => {
    it('should create configuration template', () => {
      const template: ConfigurationTemplate = {
        id: createUUID(),
        name: 'Web Application Template' as any,
        description: 'Template for web applications' as any,
        category: 'web',
        template: {
          name: '{{name}}' as any,
          description: '{{description}}' as any,
          servers: [],
        },
        variables: new Map([
          ['name', { type: 'string', required: true, description: 'Configuration name' }],
          ['description', { type: 'string', required: false, description: 'Configuration description' }],
        ]),
        tags: ['web', 'template'],
        isPublic: true,
        createdAt: createISODateString(new Date()),
        updatedAt: createISODateString(new Date()),
      };

      expect(template.id).toBeValidUUID();
      expect(template.name).toBe('Web Application Template');
      expect(template.category).toBe('web');
      expect(template.variables.size).toBe(2);
      expect(template.variables.get('name')?.required).toBe(true);
      expect(template.variables.get('description')?.required).toBe(false);
      expect(template.isPublic).toBe(true);
    });

    it('should validate template variables', () => {
      const template: ConfigurationTemplate = {
        id: createUUID(),
        name: 'Test Template' as any,
        description: 'Test template' as any,
        category: 'test',
        template: {
          name: '{{invalidVar}}' as any,
          description: 'Test' as any,
          servers: [],
        },
        variables: new Map([
          ['validVar', { type: 'string', required: true, description: 'Valid variable' }],
        ]),
        tags: ['test'],
        isPublic: false,
        createdAt: createISODateString(new Date()),
        updatedAt: createISODateString(new Date()),
      };

      // Template references invalidVar but only defines validVar
      expect(template.template.name).toContain('invalidVar');
      expect(template.variables.has('invalidVar')).toBe(false);
      expect(template.variables.has('validVar')).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for configuration ID', () => {
      expect(mockConfiguration.id).toBeValidUUID();
    });

    it('should maintain type safety for dates', () => {
      expect(mockConfiguration.createdAt).toBeValidISODate();
      expect(mockConfiguration.updatedAt).toBeValidISODate();
      expect(mockConfiguration.validation.lastValidated).toBeValidISODate();
    });

    it('should maintain type safety for server IDs', () => {
      mockConfiguration.servers.forEach(serverId => {
        expect(serverId).toBeValidUUID();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle configurations with many servers', () => {
      const manyServers = Array.from({ length: 100 }, () => createUUID());
      const largeConfig: MCPConfiguration = {
        ...mockConfiguration,
        servers: manyServers,
        statistics: {
          serverCount: 100,
          runningServers: 50,
          totalUptime: 180000000, // 50 hours total
          lastDeployment: createISODateString(new Date()),
        },
      };

      expect(largeConfig.servers).toHaveLength(100);
      expect(largeConfig.statistics.serverCount).toBe(100);
      expect(largeConfig.statistics.runningServers).toBe(50);
    });

    it('should handle configurations with very long names', () => {
      const longName = 'A'.repeat(200); // Maximum allowed length
      expect(isValidConfigurationName(longName)).toBe(true);
      
      const tooLongName = 'A'.repeat(201);
      expect(isValidConfigurationName(tooLongName)).toBe(false);
    });

    it('should handle configurations with no description', () => {
      const configWithoutDescription: MCPConfiguration = {
        ...mockConfiguration,
        description: '' as any,
      };

      expect(configWithoutDescription.description).toBe('');
    });

    it('should handle validation errors and warnings properly', () => {
      const validation: ConfigurationValidation = {
        isValid: false,
        errors: new Map([
          ['servers', 'No servers configured'],
          ['name', 'Name is required'],
        ]),
        warnings: new Map([
          ['performance', 'High server count may impact performance'],
          ['security', 'Consider enabling security features'],
        ]),
        lastValidated: createISODateString(new Date()),
      };

      expect(validation.isValid).toBe(false);
      expect(validation.errors.size).toBe(2);
      expect(validation.warnings.size).toBe(2);
      expect(validation.errors.get('servers')).toBe('No servers configured');
      expect(validation.warnings.get('performance')).toContain('High server count');
    });
  });
});