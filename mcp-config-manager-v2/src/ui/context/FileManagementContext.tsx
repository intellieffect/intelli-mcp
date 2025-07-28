/**
 * File management context for handling multi-file state
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { ManagedFile, getFileManagementService } from '../services/file-management-ipc.service';

// State interface
interface FileManagementState {
  files: ManagedFile[];
  activeFileId: string | null;
  activeContent: any;
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
}

// Action types
type FileManagementAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_FILES'; payload: ManagedFile[] }
  | { type: 'ADD_FILES'; payload: ManagedFile[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_ACTIVE_FILE'; payload: string | null }
  | { type: 'SET_ACTIVE_CONTENT'; payload: any }
  | { type: 'SET_INITIALIZED'; payload: boolean };

// Context interface
interface FileManagementContextValue {
  state: FileManagementState;
  addFiles: (paths: string[]) => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
  setActiveFile: (fileId: string) => Promise<void>;
  saveActiveFile: (content: any) => Promise<void>;
  refreshFiles: () => Promise<void>;
  showAddFileDialog: () => Promise<void>;
  updateFileName: (fileId: string, customName: string) => Promise<void>;
}

// Initial state
const initialState: FileManagementState = {
  files: [],
  activeFileId: null,
  activeContent: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Reducer
function fileManagementReducer(state: FileManagementState, action: FileManagementAction): FileManagementState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_FILES':
      return { ...state, files: action.payload };
    
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.payload] };
    
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(f => f.id !== action.payload),
        activeFileId: state.activeFileId === action.payload ? null : state.activeFileId,
        activeContent: state.activeFileId === action.payload ? null : state.activeContent,
      };
    
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileId: action.payload };
    
    case 'SET_ACTIVE_CONTENT':
      return { ...state, activeContent: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    default:
      return state;
  }
}

// Create context
const FileManagementContext = createContext<FileManagementContextValue | null>(null);

// Hook to use the context
export function useFileManagement(): FileManagementContextValue {
  const context = useContext(FileManagementContext);
  if (!context) {
    throw new Error('useFileManagement must be used within a FileManagementProvider');
  }
  return context;
}

// Provider component
interface FileManagementProviderProps {
  children: React.ReactNode;
}

export const FileManagementProvider: React.FC<FileManagementProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(fileManagementReducer, initialState);
  const fileService = getFileManagementService();

  // Initialize files on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (state.isInitialized) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Load all managed files
        const files = await fileService.listFiles();
        if (!mounted) return;

        dispatch({ type: 'SET_FILES', payload: files });

        // Get last active file ID
        const activeId = await fileService.getActiveFileId();
        if (!mounted) return;

        // Set active file (first file if no saved active ID)
        const targetFileId = activeId && files.find(f => f.id === activeId) 
          ? activeId 
          : files[0]?.id || null;

        if (targetFileId) {
          await setActiveFileInternal(targetFileId);
        }

        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to initialize file management:', error);
        dispatch({ type: 'SET_ERROR', payload: error as Error });
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [state.isInitialized]);

  // Internal function to set active file and load content
  const setActiveFileInternal = useCallback(async (fileId: string) => {
    try {
      const content = await fileService.readFile(fileId);
      dispatch({ type: 'SET_ACTIVE_FILE', payload: fileId });
      dispatch({ type: 'SET_ACTIVE_CONTENT', payload: content });
      await fileService.setActiveFileId(fileId);
    } catch (error) {
      console.error('Failed to set active file:', error);
      throw error;
    }
  }, [fileService]);

  // Add files
  const addFiles = useCallback(async (paths: string[]) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newFiles = await fileService.addFiles(paths);
      dispatch({ type: 'ADD_FILES', payload: newFiles });
      
      // Auto-select first added file if no active file
      if (!state.activeFileId && newFiles.length > 0) {
        await setActiveFileInternal(newFiles[0].id);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeFileId, setActiveFileInternal, fileService]);

  // Remove file
  const removeFile = useCallback(async (fileId: string) => {
    try {
      await fileService.removeFile(fileId);
      dispatch({ type: 'REMOVE_FILE', payload: fileId });
      
      // If we removed the active file, select another one
      if (state.activeFileId === fileId) {
        const remainingFiles = state.files.filter(f => f.id !== fileId);
        if (remainingFiles.length > 0) {
          await setActiveFileInternal(remainingFiles[0].id);
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [state.activeFileId, state.files, setActiveFileInternal, fileService]);

  // Set active file
  const setActiveFile = useCallback(async (fileId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await setActiveFileInternal(fileId);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setActiveFileInternal]);

  // Save active file
  const saveActiveFile = useCallback(async (content: any) => {
    if (!state.activeFileId) {
      throw new Error('No active file to save');
    }

    try {
      await fileService.writeFile(state.activeFileId, content);
      dispatch({ type: 'SET_ACTIVE_CONTENT', payload: content });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [state.activeFileId, fileService]);

  // Refresh files
  const refreshFiles = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const files = await fileService.listFiles();
      dispatch({ type: 'SET_FILES', payload: files });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fileService]);

  // Show add file dialog
  const showAddFileDialog = useCallback(async () => {
    try {
      const selectedPaths = await fileService.showOpenDialog();
      if (selectedPaths.length > 0) {
        await addFiles(selectedPaths);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [addFiles]);

  // Update file name (custom display name)
  const updateFileName = useCallback(async (fileId: string, customName: string) => {
    try {
      // If customName is empty, clear the custom name
      if (!customName.trim()) {
        await fileService.clearCustomName(fileId);
      } else {
        await fileService.setCustomName(fileId, customName.trim());
      }
      
      // Refresh files to get updated data
      await refreshFiles();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [fileService, refreshFiles]);

  const contextValue: FileManagementContextValue = {
    state,
    addFiles,
    removeFile,
    setActiveFile,
    saveActiveFile,
    refreshFiles,
    showAddFileDialog,
    updateFileName,
  };

  return (
    <FileManagementContext.Provider value={contextValue}>
      {children}
    </FileManagementContext.Provider>
  );
};