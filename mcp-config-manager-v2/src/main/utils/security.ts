/**
 * Simple security utilities for JSON config editor
 */

import { BrowserWindow } from 'electron';
import * as os from 'os';
import * as path from 'path';

/**
 * Basic security setup for the window
 */
export const setupSecurity = (window: BrowserWindow): void => {
  // Prevent new window creation
  window.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  // Prevent navigation to external sites
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });
};

/**
 * Validate file paths to prevent directory traversal
 */
export const validateFilePath = (filePath: string): boolean => {
  const normalizedPath = path.normalize(filePath);
  
  // Check for directory traversal attempts
  if (normalizedPath.includes('..')) {
    return false;
  }
  
  // Check for null bytes
  if (normalizedPath.includes('\0')) {
    return false;
  }
  
  // Allow paths within user home directory
  const homedir = os.homedir();
  if (normalizedPath.startsWith(homedir)) {
    return true;
  }
  
  // Allow specific safe paths for Claude config
  const safePaths = [
    '/Users',
    '/home',
  ];
  
  return safePaths.some(safePath => normalizedPath.startsWith(safePath));
};