/**
 * File selector component with tabs for switching between managed files
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Chip,
  Button,
  TextField,
  Tooltip,
  Typography,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Description as JsonIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CancelIcon,
} from '@mui/icons-material';
import { ManagedFile, getFileManagementService } from '../services/file-management-ipc.service';
import { formatModifiedDate, formatDetailedDate, isRecentlyModified } from '../utils/dateUtils';

interface FileSelectorProps {
  files: ManagedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFiles: () => void;
  onFileNameUpdate?: (fileId: string, newName: string) => void;
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

const getFileTheme = (type: ManagedFile['type'], isActive: boolean, hasAlias: boolean) => {
  const themes = {
    claude: {
      bg: isActive ? '#1976d2' : hasAlias ? '#e3f2fd' : '#f5f5f5',
      color: isActive ? '#ffffff' : hasAlias ? '#0d47a1' : '#666666',
      border: '#1976d2',
      hoverBg: '#e3f2fd'
    },
    mcp: {
      bg: isActive ? '#9c27b0' : hasAlias ? '#f3e5f5' : '#f5f5f5',
      color: isActive ? '#ffffff' : hasAlias ? '#4a148c' : '#666666',
      border: '#9c27b0',
      hoverBg: '#f3e5f5'
    },
    json: {
      bg: isActive ? '#689f38' : hasAlias ? '#f1f8e9' : '#f5f5f5',
      color: isActive ? '#ffffff' : hasAlias ? '#33691e' : '#666666',
      border: '#689f38',
      hoverBg: '#f1f8e9'
    }
  };
  
  return themes[type] || themes.json;
};

/**
 * Enhanced file chip with custom naming support
 */
interface FileChipProps {
  file: ManagedFile;
  isActive: boolean;
  onSelect: (fileId: string) => void;
  onRemove?: (fileId: string) => void;
  onNameUpdate?: (fileId: string, newName: string) => void;
}

const FileChip: React.FC<FileChipProps> = ({ file, isActive, onSelect, onRemove, onNameUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const fileService = getFileManagementService();

  const hasAlias = !!file.displayName;
  const canRemove = !file.isDefault;

  const handleEditStart = useCallback(() => {
    setEditValue(file.displayName || '');
    setIsEditing(true);
  }, [file.displayName]);

  const handleEditSave = useCallback(async () => {
    if (editValue.trim() && editValue !== file.displayName) {
      try {
        await fileService.setCustomName(file.id, editValue.trim());
        onNameUpdate?.(file.id, editValue.trim());
      } catch (error) {
        console.error('Failed to save custom name:', error);
      }
    }
    setIsEditing(false);
  }, [editValue, file.displayName, file.id, fileService, onNameUpdate]);

  const handleEditCancel = useCallback(() => {
    setEditValue(file.displayName || '');
    setIsEditing(false);
  }, [file.displayName]);

  const handleClearCustomName = useCallback(async () => {
    try {
      await fileService.clearCustomName(file.id);
      onNameUpdate?.(file.id, '');
    } catch (error) {
      console.error('Failed to clear custom name:', error);
    }
  }, [file.id, fileService, onNameUpdate]);

  const theme = getFileTheme(file.type, isActive, hasAlias);
  const tooltipContent = (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 1,
        p: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        border: `1px solid ${theme.border}40`,
      }}>
        {getFileIcon(file.type)}
        <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
          {hasAlias ? file.displayName : file.name}
        </Typography>
        {hasAlias && (
          <Box sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: theme.border,
          }} />
        )}
      </Box>
      
      <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
        📁 {file.path}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="caption" component="div">
          🏷️ Type: {file.type.toUpperCase()}
        </Typography>
        {isRecentlyModified(file.lastModified) && (
          <Typography variant="caption" component="div" sx={{ color: '#4caf50', fontWeight: 600 }}>
            ✨ Recently modified
          </Typography>
        )}
      </Box>
      
      {hasAlias && (
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          🔤 Alias: <span style={{ fontWeight: 600, color: theme.color }}>{file.displayName}</span>
        </Typography>
      )}
      
      <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
        📄 File name: {file.name}
      </Typography>
      
      {file.lastModified && (
        <Typography variant="caption" component="div" sx={{ mb: 1 }}>
          🕒 Modified: {formatDetailedDate(file.lastModified)}
        </Typography>
      )}
      
      <Box sx={{ 
        mt: 1, 
        pt: 1, 
        borderTop: '1px solid rgba(255,255,255,0.2)',
        fontSize: '0.65rem',
        fontStyle: 'italic',
        opacity: 0.8
      }}>
        <Typography variant="caption" component="div">
          💡 Double-click to {hasAlias ? 'edit alias' : 'add alias'}
        </Typography>
        <Typography variant="caption" component="div">
          🖱️ Right-click to {hasAlias ? 'remove alias' : 'add alias'}
        </Typography>
      </Box>
    </Box>
  );

  if (isEditing) {
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        p: 1,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: `2px solid ${theme.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <TextField
          size="small"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={hasAlias ? 'Edit alias...' : 'Add alias...'}
          label={hasAlias ? 'Edit Alias' : 'Add Alias'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEditSave();
            } else if (e.key === 'Escape') {
              handleEditCancel();
            }
          }}
          autoFocus
          sx={{
            minWidth: '160px',
            maxWidth: '240px',
            '& .MuiInputBase-input': {
              fontSize: '0.75rem',
              padding: '6px 10px',
              fontWeight: 500,
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.7rem',
              color: theme.color,
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: theme.border,
              },
              '&:hover fieldset': {
                borderColor: theme.border,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.border,
                borderWidth: 2,
              },
            },
          }}
        />
        <IconButton 
          size="small" 
          onClick={handleEditSave} 
          color="primary"
          sx={{
            backgroundColor: theme.border,
            color: 'white',
            '&:hover': {
              backgroundColor: theme.border,
              opacity: 0.8,
            },
          }}
        >
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleEditCancel}
          sx={{
            backgroundColor: 'grey.300',
            color: 'grey.700',
            '&:hover': {
              backgroundColor: 'grey.400',
            },
          }}
        >
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={getFileIcon(file.type)}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ 
              fontWeight: hasAlias ? 600 : isActive ? 600 : 'normal',
              fontStyle: hasAlias ? 'italic' : 'normal'
            }}>
              {hasAlias ? file.displayName : file.name}
            </span>
            {isRecentlyModified(file.lastModified) && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  ml: 0.5,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  }
                }}
              />
            )}
          </Box>
        }
        variant={isActive ? 'filled' : 'outlined'}
        onClick={() => onSelect(file.id)}
        onDelete={canRemove ? () => onRemove?.(file.id) : undefined}
        onDoubleClick={handleEditStart}
        onContextMenu={(e) => {
          e.preventDefault();
          if (hasAlias) {
            handleClearCustomName();
          } else {
            handleEditStart();
          }
        }}
        sx={{
          maxWidth: '220px',
          cursor: 'pointer',
          position: 'relative',
          backgroundColor: theme.bg,
          color: theme.color,
          borderColor: theme.border,
          transition: 'all 0.2s ease-in-out',
          transform: 'scale(1)',
          '&:hover': {
            backgroundColor: isActive ? theme.bg : theme.hoverBg,
            transform: 'scale(1.02)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
          '& .MuiChip-label': {
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '8px 12px',
          },
          '& .MuiChip-icon': {
            color: theme.color,
            marginLeft: '8px',
          },
          '& .MuiChip-deleteIcon': {
            color: theme.color,
            '&:hover': {
              color: '#d32f2f',
            }
          },
          ...(hasAlias && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.border,
              zIndex: 1,
              boxShadow: '0 0 0 2px white',
            }
          })
        }}
      />
    </Tooltip>
  );
};

export const FileSelector: React.FC<FileSelectorProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFiles,
  onFileNameUpdate,
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
        py: 1.5,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: '48px' }}>
        {/* File tabs */}
        {files.map((file) => {
          const isActive = file.id === activeFileId;

          return (
            <FileChip
              key={file.id}
              file={file}
              isActive={isActive}
              onSelect={onFileSelect}
              onRemove={onFileRemove}
              onNameUpdate={onFileNameUpdate}
            />
          );
        })}

        {/* Add button */}
        <Tooltip title="Add configuration files" arrow>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={onAddFiles}
            disabled={isLoading}
            sx={{
              minWidth: 'auto',
              px: 2,
              py: 1,
              borderStyle: 'dashed',
              borderColor: 'primary.main',
              color: 'primary.main',
              backgroundColor: 'background.paper',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderStyle: 'solid',
                backgroundColor: 'primary.main',
                color: 'white',
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
              },
              '&:disabled': {
                borderStyle: 'dashed',
                opacity: 0.5,
              }
            }}
          >
            Add Files
          </Button>
        </Tooltip>

        {/* Status indicator */}
        {isLoading && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default FileSelector;