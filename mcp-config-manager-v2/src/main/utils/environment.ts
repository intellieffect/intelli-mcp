/**
 * Environment detection utilities
 */

// For Electron apps, we need to check multiple ways to detect development mode
// 1. NODE_ENV environment variable (set at runtime)
// 2. ELECTRON_IS_DEV environment variable
// 3. app.isPackaged (false in development)
// 4. process.defaultApp (true in development when running from electron command)

import { app } from 'electron';

// Check runtime NODE_ENV first, then fall back to other detection methods
const nodeEnv = process.env.NODE_ENV || 
  (process.defaultApp ? 'development' : 'production') ||
  (!app.isPackaged ? 'development' : 'production');

export const isDev = nodeEnv === 'development' || 
  process.env.ELECTRON_IS_DEV === '1' ||
  process.defaultApp ||
  !app.isPackaged;

export const isProduction = !isDev && nodeEnv === 'production';
export const isTest = nodeEnv === 'test';

export const getEnvironment = () => {
  if (isDev) return 'development';
  if (isProduction) return 'production';
  if (isTest) return 'test';
  return 'unknown';
};

export const isElectronDev = isDev && process.env.ELECTRON_IS_DEV === 'true';
export const isPackaged = !isDev && !process.defaultApp;

export const getAppVersion = () => {
  // In Electron, we can get the version from package.json
  const { app } = require('electron');
  return app?.getVersion() || process.env.npm_package_version || '0.0.0';
};

export const getPlatformInfo = () => ({
  platform: process.platform,
  arch: process.arch,
  version: process.getSystemVersion?.() || 'unknown',
  node: process.versions.node,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
});

export const getResourcePath = (relativePath: string): string => {
  if (isPackaged) {
    // In packaged app, resources are in the app.asar
    return require('path').join(process.resourcesPath, 'app.asar', relativePath);
  } else {
    // In development, use relative to __dirname
    return require('path').join(__dirname, '..', '..', relativePath);
  }
};

export const getUserDataPath = (): string => {
  const { app } = require('electron');
  return app.getPath('userData');
};

export const getLogsPath = (): string => {
  const { app } = require('electron');
  return app.getPath('logs');
};

export const getTempPath = (): string => {
  const { app } = require('electron');
  return app.getPath('temp');
};