/**
 * Main application component with routing, theming, and layout
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  useMediaQuery,
} from '@mui/material';
import { Provider } from 'react-redux';
import { useAppSelector } from '@ui/stores';
import { initializeStore } from '@ui/stores';
import { Container } from '@core/infrastructure/di/container';
import type { IServerService } from '@core/application/services/server-service';
import type { IConfigurationService } from '@core/application/services/configuration-service';

// Route components
const DashboardPage = React.lazy(() => import('@ui/pages/DashboardPage'));

// Theme configuration
const createAppTheme = (mode: 'light' | 'dark', systemPrefersDark: boolean) => {
  const themeMode = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;
  
  return createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      error: {
        main: '#f44336',
        light: '#e57373',
        dark: '#d32f2f',
      },
      warning: {
        main: '#ff9800',
        light: '#ffb74d',
        dark: '#f57c00',
      },
      info: {
        main: '#2196f3',
        light: '#64b5f6',
        dark: '#1976d2',
      },
      success: {
        main: '#4caf50',
        light: '#81c784',
        dark: '#388e3c',
      },
      background: {
        default: themeMode === 'dark' ? '#121212' : '#fafafa',
        paper: themeMode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 600,
      },
      h2: {
        fontWeight: 600,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: themeMode === 'dark' 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};


// Main app content component
const AppContent: React.FC = () => {
  const theme = useAppSelector(state => state.ui.theme);
  
  // System theme detection
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Create theme based on user preference and system settings
  const appTheme = useMemo(() => {
    const resolvedTheme = theme === 'system' 
      ? (systemPrefersDark ? 'dark' : 'light') 
      : theme;
    
    return createAppTheme(resolvedTheme as 'light' | 'dark', systemPrefersDark);
  }, [theme, systemPrefersDark]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {/* Draggable title bar area for Electron */}
      <Box 
        sx={{ 
          height: '32px',
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          WebkitAppRegion: 'drag',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}
      />
      <Box sx={{ 
        minHeight: '100vh',
        p: 3,
        pt: '48px', // Account for fixed title bar
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <DashboardPage />
          </React.Suspense>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

// Main App component
interface AppProps {
  readonly serverService: IServerService;
  readonly configurationService: IConfigurationService;
}

export const App: React.FC<AppProps> = ({
  serverService,
  configurationService,
}) => {
  // Initialize store with services
  const store = useMemo(() => {
    return initializeStore({
      serverService,
      configurationService,
    });
  }, [serverService, configurationService]);

  // Initialize system preferences
  useEffect(() => {
    // Detect system preferences on app start
    store.dispatch({ type: 'ui/detectSystemPreferences' });
    
    // Set up event listeners for system changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleSystemChange = () => {
      store.dispatch({ type: 'ui/detectSystemPreferences' });
    };

    darkModeQuery.addEventListener('change', handleSystemChange);
    reducedMotionQuery.addEventListener('change', handleSystemChange);
    contrastQuery.addEventListener('change', handleSystemChange);

    // Online/offline status
    const handleOnlineStatus = () => {
      store.dispatch({
        type: 'ui/setOnlineStatus',
        payload: navigator.onLine,
      });
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Performance monitoring
    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const paintEntries = entries.filter(entry => entry.entryType === 'paint');
      
      if (paintEntries.length > 0) {
        const renderTime = paintEntries[paintEntries.length - 1].startTime;
        store.dispatch({
          type: 'ui/updatePerformance',
          payload: { renderTime },
        });
      }
    });

    performanceObserver.observe({ entryTypes: ['paint'] });

    // Cleanup
    return () => {
      darkModeQuery.removeEventListener('change', handleSystemChange);
      reducedMotionQuery.removeEventListener('change', handleSystemChange);
      contrastQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      performanceObserver.disconnect();
    };
  }, [store]);

  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;