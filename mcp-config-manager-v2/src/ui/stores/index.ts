/**
 * Root store configuration with type safety
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import serverReducer from './server-store';
import configurationReducer from './configuration-store';
import uiReducer from './ui-store';
import claudeDesktopReducer from './claude-desktop-store';
import type { IServerService } from '@core/application/services/server-service';
import type { IConfigurationService } from '@core/application/services/configuration-service';

// Root reducer
const rootReducer = combineReducers({
  servers: serverReducer,
  configurations: configurationReducer,
  ui: uiReducer,
  claudeDesktop: claudeDesktopReducer,
});

// Store configuration
export const createStore = (services: {
  serverService: IServerService;
  configurationService: IConfigurationService;
}) => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services,
        },
        serializableCheck: {
          // Ignore these field paths in all actions
          ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
          // Ignore these paths in the state
          ignoredPaths: ['servers.servers', 'configurations.configurations'],
        },
      }),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

// Infer the type of store
export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Store instance (will be created in main app)
let store: AppStore | null = null;

export const getStore = (): AppStore => {
  if (!store) {
    throw new Error('Store not initialized. Call initializeStore first.');
  }
  return store;
};

export const initializeStore = (services: {
  serverService: IServerService;
  configurationService: IConfigurationService;
}): AppStore => {
  store = createStore(services);
  return store;
};

// Export reducer types for module augmentation
export type { ServerState } from './server-store';
export type { ConfigurationState } from './configuration-store';
export type { UIState } from './ui-store';