/**
 * File selector component with tabs for switching between managed files
 */

import React from 'react';
import {
  Box,
  Chip,
  Button,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Description as JsonIcon,
} from '@mui/icons-material';
import { ManagedFile } from '../services/file-management-ipc.service';

interface FileSelectorProps {
  files: ManagedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFiles: () => void;
  isLoading?: boolean;
}

const getFileIcon = (type: ManagedFile['type']) => {
  switch (type) {
    case 'claude':
      return <SettingsIcon fontSize="small" />;
    case 'mcp':
      return <StorageIcon fontSize="small" />;
    default:
      return <JsonIcon fontSize="small" />;
  }
};

const getFileColor = (type: ManagedFile['type'], isActive: boolean) => {
  if (isActive) {
    switch (type) {
      case 'claude':
        return 'primary';
      case 'mcp':
        return 'secondary';
      default:
        return 'default';
    }
  }
  return 'default';
};

export const FileSelector: React.FC<FileSelectorProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFiles,
  isLoading = false,
}) => {
  if (files.length === 0 && !isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No configuration files added yet
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddFiles}
          disabled={isLoading}
        >
          Add Files
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: '40px' }}>
        {/* File tabs */}
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const canRemove = !file.isDefault;

          return (
            <Tooltip
              key={file.id}
              title={
                <Box>
                  <Typography variant="caption" component="div">
                    {file.path}
                  </Typography>
                  <Typography variant="caption" component="div" color="inherit">
                    Type: {file.type.toUpperCase()}
                  </Typography>
                  {file.lastModified && (
                    <Typography variant="caption" component="div" color="inherit">
                      Modified: {new Date(file.lastModified).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              }
            >
              <Chip
                icon={getFileIcon(file.type)}
                label={file.name}
                color={getFileColor(file.type, isActive) as any}
                variant={isActive ? 'filled' : 'outlined'}
                onClick={() => onFileSelect(file.id)}
                onDelete={canRemove ? () => onFileRemove(file.id) : undefined}
                sx={{
                  maxWidth: '200px',
                  cursor: 'pointer',
                  '& .MuiChip-label': {
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  ...(isActive && {
                    fontWeight: 600,
                  }),
                }}
              />
            </Tooltip>
          );
        })}

        {/* Add button */}
        <Tooltip title="Add configuration files">
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddFiles}
            disabled={isLoading}
            sx={{
              minWidth: 'auto',
              px: 1,
              borderStyle: 'dashed',
              '&:hover': {
                borderStyle: 'solid',
              },
            }}
          >
            Add
          </Button>
        </Tooltip>

        {/* Status indicator */}
        {isLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Loading...
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default FileSelector;