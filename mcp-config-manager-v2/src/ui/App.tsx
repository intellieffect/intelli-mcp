/**
 * Simple JSON Config Editor App
 */

import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { JsonConfigEditor, MinimalLayout } from './components';

// Simple theme with system fonts (no Google Fonts)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
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
      <MinimalLayout>
        <JsonConfigEditor />
      </MinimalLayout>
    </ThemeProvider>
  );
};

export default App;