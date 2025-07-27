/**
 * Multi-file JSON Config Editor App
 */

import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { MinimalLayout, MultiFileJsonEditor } from './components';
import { FileManagementProvider } from './context/FileManagementContext';

// Simple theme with system fonts (no Google Fonts)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          '@import': undefined, // Prevent Google Fonts import
        },
      },
    },
  },
});

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FileManagementProvider>
        <MinimalLayout>
          <MultiFileJsonEditor />
        </MinimalLayout>
      </FileManagementProvider>
    </ThemeProvider>
  );
};

export default App;