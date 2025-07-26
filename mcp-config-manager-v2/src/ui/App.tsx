/**
 * Simple JSON Config Editor App
 */

import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
} from '@mui/material';
import { JsonConfigEditor } from './components';

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
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}>
        <JsonConfigEditor />
      </Box>
    </ThemeProvider>
  );
};

export default App;