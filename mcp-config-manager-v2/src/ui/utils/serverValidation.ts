/**
 * MCP Server Configuration Validation Utility
 * Validates server configurations for security and correctness
 */

import { ParsedServer } from './mcpServerParser';

export interface ValidationError {
  field: string;
  message: string;
  serverName: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ConflictInfo {
  serverName: string;
  action: 'skip' | 'replace' | 'rename';
  newName?: string;
}

/**
 * Validate a single server configuration
 */
export function validateServerConfig(
  name: string, 
  config: any
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // 1. Server name validation
  if (!name || name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Server name cannot be empty',
      serverName: name,
      severity: 'error'
    });
  } else {
    // Check for valid server name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      warnings.push({
        field: 'name',
        message: 'Server name should only contain letters, numbers, hyphens, and underscores',
        serverName: name,
        severity: 'warning'
      });
    }
    
    // Check name length
    if (name.length > 50) {
      warnings.push({
        field: 'name',
        message: 'Server name is quite long (>50 characters)',
        serverName: name,
        severity: 'warning'
      });
    }
  }
  
  // 2. Command validation
  if (!config.command || typeof config.command !== 'string') {
    errors.push({
      field: 'command',
      message: 'Command is required and must be a string',
      serverName: name,
      severity: 'error'
    });
  } else {
    const command = config.command.toLowerCase().trim();
    
    // Check for dangerous commands
    const dangerousCommands = ['rm', 'del', 'format', 'sudo', 'chmod', 'chown'];
    if (dangerousCommands.some(cmd => command.includes(cmd))) {
      warnings.push({
        field: 'command',
        message: 'Command contains potentially dangerous operations',
        serverName: name,
        severity: 'warning'
      });
    }
    
    // Check for common valid commands
    const validCommands = ['node', 'npx', 'python', 'python3', 'deno', 'bun'];
    if (!validCommands.includes(command)) {
      warnings.push({
        field: 'command',
        message: 'Uncommon command detected - please verify it\'s correct',
        serverName: name,
        severity: 'warning'
      });
    }
  }
  
  // 3. Args validation
  if (config.args !== undefined) {
    if (!Array.isArray(config.args)) {
      errors.push({
        field: 'args',
        message: 'Args must be an array',
        serverName: name,
        severity: 'error'
      });
    } else {
      // Check each argument
      config.args.forEach((arg: any, index: number) => {
        if (typeof arg !== 'string') {
          errors.push({
            field: `args[${index}]`,
            message: 'All arguments must be strings',
            serverName: name,
            severity: 'error'
          });
        } else {
          // Check for suspicious paths
          if (arg.includes('../') || arg.includes('..\\')) {
            warnings.push({
              field: `args[${index}]`,
              message: 'Argument contains path traversal pattern (../)',
              serverName: name,
              severity: 'warning'
            });
          }
          
          // Check for very long arguments
          if (arg.length > 500) {
            warnings.push({
              field: `args[${index}]`,
              message: 'Very long argument detected',
              serverName: name,
              severity: 'warning'
            });
          }
        }
      });
      
      // NPX specific validations
      if (config.command === 'npx' && config.args.length >= 2) {
        const packageArg = config.args.find((arg: string) => 
          arg.startsWith('@') || (!arg.startsWith('-') && arg.includes('/'))
        );
        
        if (!packageArg) {
          warnings.push({
            field: 'args',
            message: 'NPX command should specify a package to run',
            serverName: name,
            severity: 'warning'
          });
        }
      }
    }
  }
  
  // 4. Environment variables validation
  if (config.env !== undefined) {
    if (typeof config.env !== 'object' || config.env === null || Array.isArray(config.env)) {
      errors.push({
        field: 'env',
        message: 'Environment variables must be an object',
        serverName: name,
        severity: 'error'
      });
    } else {
      Object.entries(config.env).forEach(([key, value]) => {
        // Check key format
        if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
          warnings.push({
            field: `env.${key}`,
            message: 'Environment variable names should be UPPER_CASE',
            serverName: name,
            severity: 'warning'
          });
        }
        
        // Check value type
        if (typeof value !== 'string') {
          errors.push({
            field: `env.${key}`,
            message: 'Environment variable values must be strings',
            serverName: name,
            severity: 'error'
          });
        } else {
          // Check for placeholder values
          const placeholderPatterns = [
            '<your-token-here>',
            '<personal-access-token>',
            '<project-ref>',
            'your-token-here',
            'your-url',
            'your-key'
          ];
          
          if (placeholderPatterns.some(pattern => 
            value.toLowerCase().includes(pattern.toLowerCase())
          )) {
            warnings.push({
              field: `env.${key}`,
              message: 'Environment variable contains placeholder value',
              serverName: name,
              severity: 'warning'
            });
          }
          
          // Check for suspicious content
          const sensitiveKeywords = ['password', 'secret', 'key', 'token'];
          if (sensitiveKeywords.some(keyword => 
            key.toLowerCase().includes(keyword)
          )) {
            if (value.length < 10) {
              warnings.push({
                field: `env.${key}`,
                message: 'Sensitive environment variable has very short value',
                serverName: name,
                severity: 'warning'
              });
            }
            
            if (value.includes(' ') || value.includes('\n')) {
              warnings.push({
                field: `env.${key}`,
                message: 'Sensitive environment variable contains whitespace',
                serverName: name,
                severity: 'warning'
              });
            }
          }
        }
      });
    }
  }
  
  // 5. Overall configuration validation
  const requiredFields = ['command'];
  const hasAllRequired = requiredFields.every(field => 
    config[field] !== undefined && config[field] !== null && config[field] !== ''
  );
  
  if (!hasAllRequired) {
    errors.push({
      field: 'config',
      message: 'Missing required configuration fields',
      serverName: name,
      severity: 'error'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple server configurations
 */
export function validateServers(servers: ParsedServer[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  
  // Check for duplicate names
  const nameCount = new Map<string, number>();
  servers.forEach(server => {
    const count = nameCount.get(server.name) || 0;
    nameCount.set(server.name, count + 1);
  });
  
  nameCount.forEach((count, name) => {
    if (count > 1) {
      allErrors.push({
        field: 'name',
        message: `Duplicate server name: ${name} (appears ${count} times)`,
        serverName: name,
        severity: 'error'
      });
    }
  });
  
  // Validate each server individually
  servers.forEach(server => {
    const result = validateServerConfig(server.name, server.config);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Check for conflicts with existing servers
 */
export function checkConflicts(
  newServers: ParsedServer[],
  existingServerNames: string[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  
  newServers.forEach(server => {
    if (existingServerNames.includes(server.name)) {
      conflicts.push({
        serverName: server.name,
        action: 'skip' // Default action
      });
    }
  });
  
  return conflicts;
}

/**
 * Generate new names for conflicting servers
 */
export function generateUniqueNames(
  servers: ParsedServer[],
  existingNames: string[]
): Map<string, string> {
  const nameMap = new Map<string, string>();
  const allExistingNames = new Set([...existingNames]);
  
  servers.forEach(server => {
    if (existingNames.includes(server.name)) {
      let newName = server.name;
      let counter = 1;
      
      while (allExistingNames.has(newName)) {
        newName = `${server.name}_${counter}`;
        counter++;
      }
      
      nameMap.set(server.name, newName);
      allExistingNames.add(newName);
    }
  });
  
  return nameMap;
}

/**
 * Apply conflict resolution to servers
 */
export function resolveConflicts(
  servers: ParsedServer[],
  existingNames: string[],
  resolution: 'skip' | 'replace' | 'rename'
): ParsedServer[] {
  switch (resolution) {
    case 'skip':
      return servers.filter(server => !existingNames.includes(server.name));
      
    case 'replace':
      return servers; // Keep all servers, they will overwrite existing ones
      
    case 'rename':
      const nameMap = generateUniqueNames(servers, existingNames);
      return servers.map(server => ({
        ...server,
        name: nameMap.get(server.name) || server.name
      }));
      
    default:
      return servers;
  }
}