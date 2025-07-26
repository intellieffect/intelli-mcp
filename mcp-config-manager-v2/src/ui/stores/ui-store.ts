/**
 * UI state management for application-wide UI concerns
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Theme configuration
export type ThemeMode = 'light' | 'dark' | 'system';

// Notification types
export interface Notification {
  readonly id: string;
  readonly type: 'success' | 'error' | 'warning' | 'info';
  readonly title: string;
  readonly message: string;
  readonly autoClose?: boolean;
  readonly duration?: number; // milliseconds
  readonly timestamp: string;
}

// Dialog types
export interface Dialog {
  readonly id: string;
  readonly type: 'confirm' | 'prompt' | 'custom';
  readonly title: string;
  readonly content: string;
  readonly actions: readonly DialogAction[];
  readonly data?: Record<string, unknown>;
}

export interface DialogAction {
  readonly id: string;
  readonly label: string;
  readonly variant: 'primary' | 'secondary' | 'danger';
  readonly autoClose?: boolean;
}

// Layout configuration
export interface LayoutConfig {
  readonly sidebarWidth: number;
  readonly sidebarCollapsed: boolean;
  readonly headerHeight: number;
  readonly footerVisible: boolean;
  readonly density: 'comfortable' | 'compact';
}

// UI preferences
export interface UIPreferences {
  readonly theme: ThemeMode;
  readonly language: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly timeFormat: '12h' | '24h';
  readonly numberFormat: string;
  readonly animations: boolean;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly fontSize: 'small' | 'medium' | 'large';
}

// UI state interface
export interface UIState {
  readonly theme: ThemeMode;
  readonly layout: LayoutConfig;
  readonly preferences: UIPreferences;
  readonly notifications: readonly Notification[];
  readonly dialogs: readonly Dialog[];
  readonly loading: {
    readonly global: boolean;
    readonly operations: ReadonlyMap<string, boolean>;
  };
  readonly errors: {
    readonly global: string | null;
    readonly operations: ReadonlyMap<string, string>;
  };
  readonly connectivity: {
    readonly online: boolean;
    readonly lastOnline: string | null;
  };
  readonly performance: {
    readonly fps: number;
    readonly memoryUsage: number;
    readonly renderTime: number;
  };
  readonly accessibility: {
    readonly screenReader: boolean;
    readonly keyboardNavigation: boolean;
    readonly focusVisible: boolean;
  };
}

// Initial state
const initialState: UIState = {
  theme: 'system',
  layout: {
    sidebarWidth: 280,
    sidebarCollapsed: false,
    headerHeight: 64,
    footerVisible: true,
    density: 'comfortable',
  },
  preferences: {
    theme: 'system',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    numberFormat: 'en-US',
    animations: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
  },
  notifications: [],
  dialogs: [],
  loading: {
    global: false,
    operations: new Map(),
  },
  errors: {
    global: null,
    operations: new Map(),
  },
  connectivity: {
    online: navigator.onLine,
    lastOnline: navigator.onLine ? new Date().toISOString() : null,
  },
  performance: {
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
  },
  accessibility: {
    screenReader: false,
    keyboardNavigation: false,
    focusVisible: true,
  },
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme actions
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
      state.preferences = {
        ...state.preferences,
        theme: action.payload,
      };
    },

    // Layout actions
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.layout = {
        ...state.layout,
        sidebarWidth: Math.max(200, Math.min(400, action.payload)),
      };
    },

    toggleSidebar: (state) => {
      state.layout = {
        ...state.layout,
        sidebarCollapsed: !state.layout.sidebarCollapsed,
      };
    },

    setLayoutDensity: (state, action: PayloadAction<'comfortable' | 'compact'>) => {
      state.layout = {
        ...state.layout,
        density: action.payload,
      };
    },

    // Preferences actions
    updatePreferences: (state, action: PayloadAction<Partial<UIPreferences>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },

    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
      };
      
      state.notifications = [notification, ...state.notifications];
      
      // Limit to 10 notifications
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(0, 10);
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Dialog actions
    openDialog: (state, action: PayloadAction<Omit<Dialog, 'id'>>) => {
      const dialog: Dialog = {
        ...action.payload,
        id: `dialog-${Date.now()}-${Math.random()}`,
      };
      
      state.dialogs = [...state.dialogs, dialog];
    },

    closeDialog: (state, action: PayloadAction<string>) => {
      state.dialogs = state.dialogs.filter(d => d.id !== action.payload);
    },

    closeAllDialogs: (state) => {
      state.dialogs = [];
    },

    // Loading actions
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = {
        ...state.loading,
        global: action.payload,
      };
    },

    setOperationLoading: (state, action: PayloadAction<{
      operation: string;
      loading: boolean;
    }>) => {
      const { operation, loading } = action.payload;
      const operations = new Map(state.loading.operations);
      
      if (loading) {
        operations.set(operation, true);
      } else {
        operations.delete(operation);
      }
      
      state.loading = {
        ...state.loading,
        operations,
      };
    },

    // Error actions
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.errors = {
        ...state.errors,
        global: action.payload,
      };
    },

    setOperationError: (state, action: PayloadAction<{
      operation: string;
      error: string | null;
    }>) => {
      const { operation, error } = action.payload;
      const operations = new Map(state.errors.operations);
      
      if (error) {
        operations.set(operation, error);
      } else {
        operations.delete(operation);
      }
      
      state.errors = {
        ...state.errors,
        operations,
      };
    },

    clearAllErrors: (state) => {
      state.errors = {
        global: null,
        operations: new Map(),
      };
    },

    // Connectivity actions
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.connectivity = {
        online: action.payload,
        lastOnline: action.payload ? new Date().toISOString() : state.connectivity.lastOnline,
      };
    },

    // Performance actions
    updatePerformance: (state, action: PayloadAction<Partial<UIState['performance']>>) => {
      state.performance = {
        ...state.performance,
        ...action.payload,
      };
    },

    // Accessibility actions
    updateAccessibility: (state, action: PayloadAction<Partial<UIState['accessibility']>>) => {
      state.accessibility = {
        ...state.accessibility,
        ...action.payload,
      };
    },

    // System detection actions
    detectSystemPreferences: (state) => {
      // Detect system theme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        state.theme = 'dark';
      } else {
        state.theme = 'light';
      }

      // Detect reduced motion preference
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        state.preferences = {
          ...state.preferences,
          reducedMotion: true,
          animations: false,
        };
      }

      // Detect high contrast preference
      if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
        state.preferences = {
          ...state.preferences,
          highContrast: true,
        };
      }

      // Detect screen reader
      const screenReaderDetected = !!(
        window.speechSynthesis ||
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.navigator.userAgent.includes('VoiceOver')
      );
      
      state.accessibility = {
        ...state.accessibility,
        screenReader: screenReaderDetected,
      };
    },

    // Quick actions for common UI operations
    showSuccessNotification: (state, action: PayloadAction<{
      title: string;
      message: string;
    }>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        type: 'success',
        title: action.payload.title,
        message: action.payload.message,
        autoClose: true,
        duration: 4000,
        timestamp: new Date().toISOString(),
      };
      
      state.notifications = [notification, ...state.notifications];
    },

    showErrorNotification: (state, action: PayloadAction<{
      title: string;
      message: string;
    }>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        type: 'error',
        title: action.payload.title,
        message: action.payload.message,
        autoClose: false,
        timestamp: new Date().toISOString(),
      };
      
      state.notifications = [notification, ...state.notifications];
    },

    showConfirmDialog: (state, action: PayloadAction<{
      title: string;
      content: string;
      onConfirm: string; // action type to dispatch
      onCancel?: string; // action type to dispatch
    }>) => {
      const dialog: Dialog = {
        id: `dialog-${Date.now()}-${Math.random()}`,
        type: 'confirm',
        title: action.payload.title,
        content: action.payload.content,
        actions: [
          {
            id: 'cancel',
            label: 'Cancel',
            variant: 'secondary',
            autoClose: true,
          },
          {
            id: 'confirm',
            label: 'Confirm',
            variant: 'primary',
            autoClose: true,
          },
        ],
        data: {
          onConfirm: action.payload.onConfirm,
          onCancel: action.payload.onCancel,
        },
      };
      
      state.dialogs = [...state.dialogs, dialog];
    },
  },
});

// Actions
export const {
  setTheme,
  setSidebarWidth,
  toggleSidebar,
  setLayoutDensity,
  updatePreferences,
  addNotification,
  removeNotification,
  clearNotifications,
  openDialog,
  closeDialog,
  closeAllDialogs,
  setGlobalLoading,
  setOperationLoading,
  setGlobalError,
  setOperationError,
  clearAllErrors,
  setOnlineStatus,
  updatePerformance,
  updateAccessibility,
  detectSystemPreferences,
  showSuccessNotification,
  showErrorNotification,
  showConfirmDialog,
} = uiSlice.actions;

// Export the reducer
export default uiSlice.reducer;