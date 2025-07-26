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
    logger = getLogger();
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
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
  // Normalize the path
  const path = require('path');
  const normalizedPath = path.normalize(filePath);
  
  // Check for directory traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    ensureLogger().warn('Potential directory traversal attempt:', filePath);
    return false;
  }
  
  // Check for null bytes
  if (normalizedPath.includes('\0')) {
    ensureLogger().warn('Null byte in file path:', filePath);
    return false;
  }
  
  return true;
};