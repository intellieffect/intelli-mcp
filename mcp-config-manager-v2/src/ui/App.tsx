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

// Simple theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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