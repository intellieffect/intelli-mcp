/**
 * Branded types for enhanced type safety
 * These prevent mixing of semantically different but structurally similar types
 */

// Core branded types
export type UUID = string & { readonly __brand: 'UUID' };
export type ISODateString = string & { readonly __brand: 'ISODateString' };
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };
export type FilePath = string & { readonly __brand: 'FilePath' };
export type Command = string & { readonly __brand: 'Command' };
export type Port = number & { readonly __brand: 'Port' };
export type EnvironmentKey = string & { readonly __brand: 'EnvironmentKey' };
export type EnvironmentValue = string & { readonly __brand: 'EnvironmentValue' };

// Domain-specific branded types
export type ServerName = NonEmptyString & { readonly __domain: 'ServerName' };
export type ServerDescription = string & { readonly __domain: 'ServerDescription' };
export type ConfigurationName = NonEmptyString & { readonly __domain: 'ConfigurationName' };
export type BackupId = UUID & { readonly __domain: 'BackupId' };
export type ValidationErrorCode = string & { readonly __domain: 'ValidationErrorCode' };

// Network related
export type URL = string & { readonly __brand: 'URL' };
export type IPAddress = string & { readonly __brand: 'IPAddress' };
export type HostName = string & { readonly __brand: 'HostName' };

// Security related
export type SecretKey = string & { readonly __brand: 'SecretKey' };
export type AccessToken = string & { readonly __brand: 'AccessToken' };
export type EncryptedData = string & { readonly __brand: 'EncryptedData' };

// Version and build related
export type SemanticVersion = string & { readonly __brand: 'SemanticVersion' };
export type BuildNumber = number & { readonly __brand: 'BuildNumber' };
export type Checksum = string & { readonly __brand: 'Checksum' };

// Type guards for branded types
export const isUUID = (value: string): value is UUID => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const isISODateString = (value: string): value is ISODateString => {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
};

export const isNonEmptyString = (value: string): value is NonEmptyString => {
  return value.trim().length > 0;
};

export const isFilePath = (value: string): value is FilePath => {
  return value.length > 0 && !value.includes('\0') && !/[<>:"|?*]/.test(value);
};

export const isCommand = (value: string): value is Command => {
  return isNonEmptyString(value) && !value.includes('\0');
};

export const isPort = (value: number): value is Port => {
  return Number.isInteger(value) && value >= 0 && value <= 65535;
};

export const isURL = (value: string): value is URL => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isSemanticVersion = (value: string): value is SemanticVersion => {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(value);
};

// Factory functions for creating branded types safely
export const createUUID = (value?: string): UUID => {
  if (value) {
    if (!isUUID(value)) {
      throw new TypeError(`Invalid UUID format: ${value}`);
    }
    return value as UUID;
  }
  
  // Generate new UUID if no value provided
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID() as UUID;
  }
  
  // Fallback for test environments
  return `test-uuid-${Math.random().toString(36).substr(2, 9)}` as UUID;
};

export const createISODateString = (value: string | Date): ISODateString => {
  const dateString = value instanceof Date ? value.toISOString() : value;
  if (!isISODateString(dateString)) {
    throw new TypeError(`Invalid ISO date string: ${dateString}`);
  }
  return dateString as ISODateString;
};

export const createNonEmptyString = (value: string): NonEmptyString => {
  if (!isNonEmptyString(value)) {
    throw new TypeError('String cannot be empty or whitespace only');
  }
  return value as NonEmptyString;
};

export const createFilePath = (value: string): FilePath => {
  if (!isFilePath(value)) {
    throw new TypeError(`Invalid file path: ${value}`);
  }
  return value as FilePath;
};

export const createCommand = (value: string): Command => {
  if (!isCommand(value)) {
    throw new TypeError(`Invalid command: ${value}`);
  }
  return value as Command;
};

export const createPort = (value: number): Port => {
  if (!isPort(value)) {
    throw new TypeError(`Invalid port number: ${value}. Must be between 0 and 65535`);
  }
  return value as Port;
};

export const createURL = (value: string): URL => {
  if (!isURL(value)) {
    throw new TypeError(`Invalid URL: ${value}`);
  }
  return value as URL;
};

export const createSemanticVersion = (value: string): SemanticVersion => {
  if (!isSemanticVersion(value)) {
    throw new TypeError(`Invalid semantic version: ${value}`);
  }
  return value as SemanticVersion;
};

// Utility type to extract the base type from a branded type
export type Unbrand<T> = T extends string & { readonly __brand: any }
  ? string
  : T extends number & { readonly __brand: any }
  ? number
  : T;

// Helper for exhaustive checking
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value in exhaustive check: ${JSON.stringify(value)}`);
};