/**
 * Security utilities for Electron main process
 */

import { BrowserWindow, session } from 'electron';
import { isProduction } from './environment';
import { getLogger, type Logger } from './logging';

// Logger will be initialized when needed
let logger: Logger | null = null;

const ensureLogger = (): Logger => {
  if (!logger) {
    try {
      logger = getLogger();
    } catch (error) {
      // If logger fails to initialize, create a console-based fallback
      console.error('Failed to initialize logger:', error);
      logger = {
        info: (...args: any[]) => console.log('[Security INFO]', ...args),
        warn: (...args: any[]) => console.warn('[Security WARN]', ...args),
        error: (...args: any[]) => console.error('[Security ERROR]', ...args),
        debug: (...args: any[]) => console.debug('[Security DEBUG]', ...args),
      } as Logger;
    }
  }
  return logger;
};

/**
 * Set up security measures for the application
 */
export const setupSecurity = (window: BrowserWindow): void => {
  // Set up Content Security Policy
  setupContentSecurityPolicy();
  
  // Set up session security
  setupSessionSecurity(window);
  
  // Set up web security
  setupWebSecurity(window);
  
  ensureLogger().info('Security measures configured');
};

/**
 * Configure Content Security Policy
 */
const setupContentSecurityPolicy = (): void => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React dev tools
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https:",
            "connect-src 'self' ws: wss:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        ],
      },
    });
  });
};

/**
 * Configure session-level security
 */
const setupSessionSecurity = (window: BrowserWindow): void => {
  const ses = window.webContents.session;
  
  // Clear all data on app quit
  window.on('closed', () => {
    ses.clearStorageData();
  });
  
  // Set up secure cookie policy
  ses.cookies.on('changed', (event, cookie, cause, removed) => {
    if (!removed && !cookie.secure && isProduction) {
      ensureLogger().warn('Non-secure cookie detected in production:', cookie.name);
    }
  });
  
  // Block insecure content in production
  if (isProduction) {
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
      // Deny all permission requests by default
      callback(false);
    });
    
    // Block external resource loading
    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      const url = new URL(details.url);
      
      // Allow localhost in development, file protocol, and specific allowed domains
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
      ];
      
      if (url.protocol === 'file:' || allowedHosts.includes(url.hostname)) {
        callback({});
      } else {
        ensureLogger().warn('Blocked external resource:', details.url);
        callback({ cancel: true });
      }
    });
  }
};

/**
 * Configure web security for the renderer process
 */
const setupWebSecurity = (window: BrowserWindow): void => {
  // Prevent new window creation
  window.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  // Prevent navigation to external sites
  window.webContents.on('will-navigate', (event, url) => {
    const allowedUrls = [
      'http://localhost:3000',
      'file://',
    ];
    
    const isAllowed = allowedUrls.some(allowed => url.startsWith(allowed));
    
    if (!isAllowed) {
      event.preventDefault();
      ensureLogger().warn('Blocked navigation to:', url);
    }
  });
  
  // Handle download attempts
  window.webContents.session.on('will-download', (event, item, webContents) => {
    // In production, be very careful about downloads
    if (isProduction) {
      event.preventDefault();
      ensureLogger().warn('Download attempt blocked:', item.getURL());
    }
  });
  
  // Monitor console messages for security issues
  window.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('Mixed Content') || message.includes('Insecure')) {
      ensureLogger().warn('Security warning in renderer:', { message, sourceId, line });
    }
  });
  
  // Handle certificate errors
  window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    if (isProduction) {
      // In production, don't ignore certificate errors
      event.preventDefault();
      ensureLogger().error('Certificate error:', { url, error });
      callback(false);
    } else {
      // In development, allow self-signed certificates for localhost
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        event.preventDefault();
        callback(true);
      }
    }
  });
};

/**
 * Validate that security measures are working
 */
export const validateSecurity = (): boolean => {
  try {
    // Check if CSP is enabled
    const cspEnabled = session.defaultSession.webRequest.onHeadersReceived.length > 0;
    
    // Check if web security is enabled
    const webSecurityEnabled = isProduction;
    
    ensureLogger().info('Security validation:', {
      cspEnabled,
      webSecurityEnabled,
      environment: isProduction ? 'production' : 'development',
    });
    
    return cspEnabled && (webSecurityEnabled || !isProduction);
  } catch (error) {
    ensureLogger().error('Security validation failed:', error);
    return false;
  }
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate file paths to prevent directory traversal
 */
export const validateFilePath = (filePath: string): boolean => {
  try {
    // Normalize the path
    const path = require('path');
    const os = require('os');
    const normalizedPath = path.normalize(filePath);
    
    // Log for debugging
    console.log('[Security] Validating file path:', {
      original: filePath,
      normalized: normalizedPath,
      homedir: os.homedir(),
      isAbsolute: path.isAbsolute(normalizedPath)
    });
    
    // Check for null bytes first (most critical security check)
    if (normalizedPath.includes('\0')) {
      console.warn('[Security] Null byte in file path:', filePath);
      return false;
    }
    
    // Check for directory traversal attempts (but allow absolute paths)
    if (normalizedPath.includes('..')) {
      console.warn('[Security] Potential directory traversal attempt:', filePath);
      return false;
    }
    
    // Special handling for absolute paths
    if (!path.isAbsolute(normalizedPath)) {
      console.warn('[Security] Path is not absolute, rejecting:', normalizedPath);
      return false;
    }
    
    // Allow specific safe paths
    const safeBasePaths = [
      os.homedir(),
      '/Users',
      '/home',
      path.join(os.homedir(), 'Library', 'Application Support', 'Claude'),
      path.join(os.homedir(), '.config', 'claude'),
    ];
    
    // Special case for Claude config file on macOS
    if (process.platform === 'darwin') {
      safeBasePaths.push(path.join(os.homedir(), 'Library', 'Application Support'));
    }
    
    // Log safe paths for debugging
    console.log('[Security] Safe base paths:', safeBasePaths);
    
    // Check if the path starts with any safe base path
    let isInSafePath = false;
    for (const safePath of safeBasePaths) {
      // Normalize the safe path for consistent comparison
      const normalizedSafePath = path.normalize(safePath);
      const matches = normalizedPath.startsWith(normalizedSafePath);
      
      console.log('[Security] Comparing:', {
        normalizedPath,
        normalizedSafePath,
        matches
      });
      
      if (matches) {
        console.log('[Security] Path matches safe path:', safePath);
        isInSafePath = true;
        break;
      }
    }
    
    console.log('[Security] Is in safe path:', isInSafePath);
    
    if (!isInSafePath) {
      console.warn('[Security] File path outside safe directories:', filePath);
      return false;
    }
    
    console.log('[Security] Path validation passed');
    return true;
  } catch (error) {
    console.error('[Security] Error during path validation:', error);
    return false;
  }
};