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
    updateFileName,
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
        sx={{ p: 4 }}
      >
        <Paper sx={{
          p: 6,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <Stack alignItems="center" spacing={3}>
            <Box sx={{ position: 'relative' }}>
              <CircularProgress size={60} thickness={4} />
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '1.5rem',
              }}>
                ⚙️
              </Box>
            </Box>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500 }}>
              Initializing File Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Setting up configuration file management system...
            </Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper sx={{
          p: 4,
          backgroundColor: 'error.light',
          borderRadius: 2,
          border: '2px solid',
          borderColor: 'error.main',
        }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ color: 'error.dark', fontWeight: 600 }}>
                ❌ Error Loading Files
              </Typography>
            </Box>
            <Typography variant="body1" color="error.dark">
              {state.error.message}
            </Typography>
            <Box>
              <Button 
                variant="contained"
                color="error"
                onClick={handleRefresh}
                sx={{
                  fontWeight: 600,
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.35)',
                  }
                }}
              >
                🔄 Retry Loading
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // No files state
  if (state.files.length === 0) {
    return (
      <Paper sx={{ 
        p: 6, 
        textAlign: 'center',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '2px dashed',
        borderColor: 'divider',
        m: 2,
      }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
            📁 No Configuration Files
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
            Get started by adding JSON configuration files for your projects
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Supports claude_desktop_config.json, MCP server configs, and more
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={showAddFileDialog}
          disabled={state.isLoading}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          📂 Add Configuration Files
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
        onFileNameUpdate={updateFileName}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                📁 {state.files.find(f => f.id === state.activeFileId)?.path}
              </Typography>
            </Box>
            {hasUnsavedChanges && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                backgroundColor: 'warning.light',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'warning.main',
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'warning.main',
                  animation: 'pulse 2s infinite',
                }} />
                <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600 }}>
                  Unsaved changes
                </Typography>
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={state.isLoading}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  borderColor: 'primary.main',
                }
              }}
            >
              Refresh
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveLoading || state.isLoading}
              sx={{
                minWidth: 100,
                boxShadow: hasUnsavedChanges ? '0 2px 8px rgba(25, 118, 210, 0.25)' : 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
                }
              }}
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
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            p: 4,
          }}
        >
          <Box sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300',
            textAlign: 'center',
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              🔍 Select a file to edit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a configuration file from the tabs above to start editing
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MultiFileJsonEditor;