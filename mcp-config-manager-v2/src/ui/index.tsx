/**
 * Main entry point for the React renderer process
 */

// Import polyfills first (before any other imports)
import './polyfills';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { App } from './App';
import { Container } from '../core/infrastructure/di/container';
import { RendererServerService, RendererConfigurationService } from './services/renderer-services';
import type { IServerService } from '../core/application/services/server-service';
import type { IConfigurationService } from '../core/application/services/configuration-service';

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div className="error-boundary">
    <h1 className="error-title">Something went wrong</h1>
    <p className="error-message">
      The application encountered an unexpected error. This could be due to a bug in the application
      or an incompatibility with your system.
    </p>
    <div className="error-details">
      {error.name}: {error.message}
      {error.stack && (
        <>
          {'\n\nStack trace:\n'}
          {error.stack}
        </>
      )}
    </div>
    <button
      onClick={resetErrorBoundary}
      style={{
        marginTop: '24px',
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      Try Again
    </button>
  </div>
);

// Initialize the React application
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root container not found');
}

const root = createRoot(rootElement);

// Create real services that use IPC
const serverService = new RendererServerService();
const configurationService = new RendererConfigurationService();

// Handle uncaught errors during development
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

// Render the application with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('React Error Boundary caught an error:', error, errorInfo);
        
        // In a real application, you might want to log this to an error reporting service
        if (process.env.NODE_ENV === 'production') {
          // Example: errorReportingService.captureException(error, { extra: errorInfo });
        }
      }}
      onReset={() => {
        // Clear any error state and reload if necessary
        window.location.reload();
      }}
    >
      <App serverService={serverService} configurationService={configurationService} />
    </ErrorBoundary>
  </React.StrictMode>
);

// Hot module replacement for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    // Re-import and re-render the App component
    const NextApp = require('./App').App;
    root.render(
      <React.StrictMode>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onError={(error, errorInfo) => {
            console.error('React Error Boundary caught an error:', error, errorInfo);
          }}
          onReset={() => {
            window.location.reload();
          }}
        >
          <NextApp serverService={serverService} configurationService={configurationService} />
        </ErrorBoundary>
      </React.StrictMode>
    );
  });
}