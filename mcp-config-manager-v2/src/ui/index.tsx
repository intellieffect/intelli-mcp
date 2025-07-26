/**
 * Simple entry point for the React renderer process
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Initialize the React application
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root container not found');
}

const root = createRoot(rootElement);

// Render the application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);