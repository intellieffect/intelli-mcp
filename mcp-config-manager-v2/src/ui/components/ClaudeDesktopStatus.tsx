/**
 * Claude Desktop connection status component
 */

import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudDone as ConnectedIcon,
  CloudOff as DisconnectedIcon,
  Refresh as RefreshIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { useClaudeDesktopConfig } from '../hooks/useClaudeDesktopConfig';

export const ClaudeDesktopStatus: React.FC = () => {
  const { configPath, configuration, isLoading, error, reloadConfig, serverCount } = useClaudeDesktopConfig();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading Claude Desktop configuration...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <IconButton color="inherit" size="small" onClick={reloadConfig}>
            <RefreshIcon />
          </IconButton>
        }
      >
        Failed to load configuration: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Chip
          icon={<ConnectedIcon />}
          label="Connected to Claude Desktop"
          color="success"
          size="small"
        />
        <Typography variant="body2" color="text.secondary">
          {serverCount} MCP server{serverCount !== 1 ? 's' : ''} configured
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Reload configuration">
            <IconButton size="small" onClick={reloadConfig}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open config file location">
            <IconButton 
              size="small" 
              onClick={() => {
                if (configPath) {
                  // Open the folder containing the config file
                  window.electronAPI.showItemInFolder?.(configPath);
                }
              }}
            >
              <FolderIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {configPath && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
            maxWidth: '100%'
          }}
        >
          Config location: {configPath}
        </Typography>
      )}
    </Box>
  );
};