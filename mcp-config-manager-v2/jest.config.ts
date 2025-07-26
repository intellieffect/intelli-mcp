/**
 * Jest configuration for comprehensive testing with type coverage
 */

import type { Config } from 'jest';

const config: Config = {
  // Use the TypeScript preset
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
  ],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@test/(.*)$': '<rootDir>/src/test/$1',
  },
  
  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/release/',
    '/coverage/',
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.{ts,js}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/test/**/*',
    '!src/main/index.ts', // Electron main process
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    // Stricter thresholds for core domain logic
    './src/core/domain/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // UI components should have good coverage too
    './src/ui/components/**/*.tsx': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'MCP Config Manager v2 Test Report',
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
  ],
  
  // Verbose output for CI
  verbose: process.env.CI === 'true',
  
  // Performance optimizations
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Global configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false,
    },
  },
  
  // Extensions to treat as ESM
  extensionsToTreatAsEsm: [],
  
  // Mock patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/release/',
  ],
  
  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library))',
  ],
  
  // Projects for different test types
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.unit.{ts,tsx}',
        '<rootDir>/src/**/*.unit.{test,spec}.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    },
    
    // Integration tests
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.integration.{ts,tsx}',
        '<rootDir>/src/**/*.integration.{test,spec}.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    },
    
    // Component tests
    {
      displayName: 'component',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.component.{ts,tsx}',
        '<rootDir>/src/**/*.component.{test,spec}.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testEnvironment: 'jsdom',
    },
    
    // Accessibility tests
    {
      displayName: 'accessibility',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.accessibility.{ts,tsx}',
        '<rootDir>/src/**/*.accessibility.{test,spec}.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testEnvironment: 'jsdom',
    },
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    '@emotion/jest/serializer',
  ],
};

export default config;