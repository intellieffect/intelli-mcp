/**
 * Configuration domain entity with comprehensive type safety
 */

import type {
  UUID,
  ISODateString,
  ConfigurationName,
  FilePath,
  SemanticVersion,
  Checksum,
  BackupId,
} from '@shared/types/branded';
import type { MCPServer } from './server';

// Configuration metadata
export interface ConfigurationMetadata {
  readonly name: ConfigurationName;
  readonly description: string;
  readonly version: SemanticVersion;
  readonly author?: string;
  readonly tags: readonly string[];
  readonly checksum: Checksum;
}

// Configuration validation result
export type ConfigurationValidationResult =
  | {
      readonly isValid: true;
      readonly warnings: readonly string[];
    }
  | {
      readonly isValid: false;
      readonly errors: readonly ConfigurationValidationError[];
      readonly warnings: readonly string[];
    };

// Configuration validation error
export interface ConfigurationValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly suggestion?: string;
}

// Configuration backup information
export interface ConfigurationBackup {
  readonly id: BackupId;
  readonly configurationId: UUID;
  readonly name: string;
  readonly createdAt: ISODateString;
  readonly filePath: FilePath;
  readonly size: number; // bytes
  readonly checksum: Checksum;
  readonly metadata: ConfigurationMetadata;
  readonly isAutomatic: boolean;
}

// Configuration import/export options
export interface ConfigurationExportOptions {
  readonly format: 'json' | 'yaml' | 'toml';
  readonly includeMetadata: boolean;
  readonly includeBackups: boolean;
  readonly includeSecrets: boolean;
  readonly compression?: 'gzip' | 'zip';
}

export interface ConfigurationImportOptions {
  readonly validateSchema: boolean;
  readonly mergeStrategy: 'replace' | 'merge' | 'skip';
  readonly createBackup: boolean;
  readonly importSecrets: boolean;
}

// Configuration change tracking
export interface ConfigurationChange {
  readonly id: UUID;
  readonly configurationId: UUID;
  readonly changeType: 'create' | 'update' | 'delete';
  readonly path: string;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly reason?: string;
  readonly userId?: string;
  readonly timestamp: ISODateString;
}

// Configuration statistics
export interface ConfigurationStatistics {
  readonly totalServers: number;
  readonly activeServers: number;
  readonly errorServers: number;
  readonly totalBackups: number;
  readonly lastBackup?: ISODateString;
  readonly configurationSize: number; // bytes
  readonly averageServerUptime: number; // milliseconds
}

// Main configuration entity
export interface MCPConfiguration {
  readonly id: UUID;
  readonly metadata: ConfigurationMetadata;
  readonly servers: ReadonlyMap<UUID, MCPServer>;
  readonly globalSettings: ConfigurationGlobalSettings;
  readonly validation: ConfigurationValidationResult;
  readonly statistics: ConfigurationStatistics;
  readonly filePath?: FilePath;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly version: number; // for optimistic concurrency control
}

// Global configuration settings
export interface ConfigurationGlobalSettings {
  readonly autoStart: boolean;
  readonly autoBackup: boolean;
  readonly backupInterval: number; // milliseconds
  readonly maxBackups: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly logRetention: number; // days
  readonly healthCheckInterval: number; // milliseconds
  readonly networkTimeout: number; // milliseconds
  readonly securitySettings: ConfigurationSecuritySettings;
}

// Security settings
export interface ConfigurationSecuritySettings {
  readonly encryptSecrets: boolean;
  readonly requireAuthentication: boolean;
  readonly allowRemoteAccess: boolean;
  readonly trustedHosts: readonly string[];
  readonly certificatePath?: FilePath;
  readonly keyPath?: FilePath;
}

// Configuration templates for common setups
export interface ConfigurationTemplate {
  readonly id: UUID;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly configuration: Partial<MCPConfiguration>;
  readonly requiredCapabilities: readonly string[];
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly createdAt: ISODateString;
}

// Configuration creation input
export interface CreateConfigurationInput {
  readonly metadata: Omit<ConfigurationMetadata, 'checksum'>;
  readonly servers?: readonly MCPServer[];
  readonly globalSettings?: Partial<ConfigurationGlobalSettings>;
  readonly filePath?: FilePath;
}

// Configuration update input
export interface UpdateConfigurationInput {
  readonly metadata?: Partial<Omit<ConfigurationMetadata, 'checksum'>>;
  readonly globalSettings?: Partial<ConfigurationGlobalSettings>;
  readonly reason?: string;
}

// Configuration query filters
export interface ConfigurationFilters {
  readonly tags?: readonly string[];
  readonly author?: string;
  readonly search?: string;
  readonly hasErrors?: boolean;
  readonly createdAfter?: ISODateString;
  readonly createdBefore?: ISODateString;
  readonly minServers?: number;
  readonly maxServers?: number;
}

// Configuration events
export type ConfigurationEvent =
  | {
      readonly type: 'ConfigurationCreated';
      readonly configurationId: UUID;
      readonly data: CreateConfigurationInput;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ConfigurationUpdated';
      readonly configurationId: UUID;
      readonly changes: readonly ConfigurationChange[];
      readonly version: number;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ConfigurationDeleted';
      readonly configurationId: UUID;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ConfigurationBackupCreated';
      readonly configurationId: UUID;
      readonly backupId: BackupId;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ConfigurationImported';
      readonly configurationId: UUID;
      readonly source: FilePath;
      readonly timestamp: ISODateString;
    }
  | {
      readonly type: 'ConfigurationExported';
      readonly configurationId: UUID;
      readonly destination: FilePath;
      readonly options: ConfigurationExportOptions;
      readonly timestamp: ISODateString;
    };

// Type guards and utilities
export const isConfigurationValid = (
  validation: ConfigurationValidationResult
): validation is Extract<ConfigurationValidationResult, { isValid: true }> => {
  return validation.isValid;
};

export const hasConfigurationErrors = (validation: ConfigurationValidationResult): boolean => {
  return !validation.isValid && validation.errors.length > 0;
};

export const getConfigurationErrorCount = (validation: ConfigurationValidationResult): number => {
  return validation.isValid ? 0 : validation.errors.length;
};

export const getConfigurationWarningCount = (validation: ConfigurationValidationResult): number => {
  return validation.warnings.length;
};

// Configuration utility functions
export const calculateConfigurationChecksum = (config: Omit<MCPConfiguration, 'metadata' | 'statistics' | 'validation'>): Checksum => {
  // This would typically use a proper hashing algorithm
  const serialized = JSON.stringify(config, null, 0);
  const hash = serialized.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
  }, 0);
  return Math.abs(hash).toString(16) as Checksum;
};

export const isConfigurationOutdated = (
  config: MCPConfiguration,
  currentVersion: SemanticVersion
): boolean => {
  const [major, minor, patch] = config.metadata.version.split('.').map(Number);
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
  
  return (
    major < currentMajor ||
    (major === currentMajor && minor < currentMinor) ||
    (major === currentMajor && minor === currentMinor && patch < currentPatch)
  );
};