/**
 * Multi-file JSON config editor with file selector
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Alert,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useFileManagement } from '../context/FileManagementContext';
import { FileSelector } from './FileSelector';
import { InteractiveJsonEditor } from './InteractiveJsonEditor';

export const MultiFileJsonEditor: React.FC = () => {
  const {
    state,
    setActiveFile,
    removeFile,
    saveActiveFile,
    refreshFiles,
    showAddFileDialog,
  } = useFileManagement();

  const [saveLoading, setSaveLoading] = useState(false);
  const [localContent, setLocalContent] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local content when active content changes
  React.useEffect(() => {
    setLocalContent(state.activeContent);
    setHasUnsavedChanges(false);
  }, [state.activeContent]);

  // Handle content changes
  const handleContentChange = useCallback((newContentString: string) => {
    try {
      const newContent = JSON.parse(newContentString);
      setLocalContent(newContent);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Invalid JSON:', error);
      // Still update to show the user what they typed
      setLocalContent(newContentString);
      setHasUnsavedChanges(true);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (fileId: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them and switch files?'
      );
      if (!confirmed) return;
    }

    try {
      await setActiveFile(fileId);
    } catch (error) {
      console.error('Failed to select file:', error);
    }
  }, [hasUnsavedChanges, setActiveFile]);

  // Handle file removal
  const handleFileRemove = useCallback(async (fileId: string) => {
    const file = state.files.find(f => f.id === fileId);
    const confirmed = window.confirm(
      `Are you sure you want to remove "${file?.name}" from the editor?\n\nThis will not delete the actual file, just remove it from the editor.`
    );

    if (!confirmed) return;

    try {
      await removeFile(fileId);
    } catch (error) {
      console.error('Failed to remove file:', error);
    }
  }, [state.files, removeFile]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!localContent || !state.activeFileId) return;

    try {
      setSaveLoading(true);
      await saveActiveFile(localContent);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setSaveLoading(false);
    }
  }, [localContent, state.activeFileId, saveActiveFile]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them and refresh?'
      );
      if (!confirmed) return;
    }

    try {
      await refreshFiles();
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  }, [hasUnsavedChanges, refreshFiles]);

  // Loading state
  if (!state.isInitialized) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Initializing file management...
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
      >
        <Typography variant="body2">
          {state.error.message}
        </Typography>
      </Alert>
    );
  }

  // No files state
  if (state.files.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No Configuration Files
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add JSON configuration files to get started
        </Typography>
        <Button
          variant="contained"
          onClick={showAddFileDialog}
          disabled={state.isLoading}
        >
          Add Files
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* File Selector */}
      <FileSelector
        files={state.files}
        activeFileId={state.activeFileId}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        onAddFiles={showAddFileDialog}
        isLoading={state.isLoading}
      />

      {/* Action Bar */}
      {state.activeFileId && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {state.files.find(f => f.id === state.activeFileId)?.path}
            </Typography>
            {hasUnsavedChanges && (
              <Typography variant="caption" color="warning.main">
                • Unsaved changes
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={state.isLoading}
            >
              Refresh
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveLoading || state.isLoading}
            >
              {saveLoading ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Editor */}
      {state.activeFileId && localContent && (
        <Box sx={{ p: 2 }}>
          <InteractiveJsonEditor
            value={typeof localContent === 'string' ? localContent : JSON.stringify(localContent, null, 2)}
            onChange={handleContentChange}
            readOnly={false}
          />
        </Box>
      )}

      {/* No active file */}
      {state.files.length > 0 && !state.activeFileId && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Select a file to edit
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MultiFileJsonEditor;