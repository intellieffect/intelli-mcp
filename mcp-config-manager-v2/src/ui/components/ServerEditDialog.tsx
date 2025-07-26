/**
 * Server Edit Dialog - 초간단 버전
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../stores';
import {
  claudeDesktopActions,
  selectClaudeDesktopServers,
  selectSaving,
  selectClaudeDesktopError,
} from '../stores/claude-desktop-store';
import { claudeDesktopIPCService } from '../services/claude-desktop-ipc.service';

interface ServerEditDialogProps {
  open: boolean;
  onClose: () => void;
  serverName?: string;
}

export const ServerEditDialog: React.FC<ServerEditDialogProps> = ({
  open,
  onClose,
  serverName,
}) => {
  const dispatch = useAppDispatch();
  const servers = useAppSelector(selectClaudeDesktopServers);
  const saving = useAppSelector(selectSaving);
  const error = useAppSelector(selectClaudeDesktopError);

  const isEditMode = Boolean(serverName);
  const currentServer = serverName ? servers[serverName] : null;

  // 단순한 state
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [env, setEnv] = useState('');

  // 폼 초기화
  useEffect(() => {
    if (open) {
      dispatch(claudeDesktopActions.clearError());
      
      if (isEditMode && currentServer) {
        setName(serverName || '');
        setCommand(currentServer.command);
        setArgs((currentServer.args || []).join(' '));
        setEnv(Object.entries(currentServer.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));
      } else {
        setName('');
        setCommand('');
        setArgs('');
        setEnv('');
      }
    }
  }, [open, isEditMode, currentServer, serverName, dispatch]);

  // 저장
  const handleSave = async () => {
    if (!name || !command) return;

    try {
      dispatch(claudeDesktopActions.setSaving(true));

      const serverConfig = {
        command: command.trim(),
        args: args.trim() ? args.trim().split(' ') : [],
        env: env.trim() ? 
          env.split('\n').reduce((acc, line) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
              acc[key.trim()] = valueParts.join('=').trim();
            }
            return acc;
          }, {} as Record<string, string>) : {}
      };

      let result;
      if (isEditMode && serverName) {
        result = await claudeDesktopIPCService.updateServer(serverName, serverConfig);
      } else {
        result = await claudeDesktopIPCService.addServer(name, serverConfig);
      }

      if (result.kind === 'failure') {
        throw new Error(result.error.message);
      }

      dispatch(claudeDesktopActions.updateServer({
        serverName: name,
        config: serverConfig,
      }));

      dispatch(claudeDesktopActions.setSaving(false));
      onClose();
    } catch (error) {
      dispatch(claudeDesktopActions.setSaving(false));
      dispatch(claudeDesktopActions.setError(
        error instanceof Error ? error.message : 'Save failed'
      ));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isEditMode ? `Edit: ${serverName}` : 'New Server'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Server Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEditMode || saving}
            fullWidth
          />
          
          <TextField
            label="Command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={saving}
            fullWidth
          />
          
          <TextField
            label="Arguments (space separated)"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            disabled={saving}
            fullWidth
            placeholder="arg1 arg2 arg3"
          />
          
          <TextField
            label="Environment Variables (KEY=VALUE, one per line)"
            value={env}
            onChange={(e) => setEnv(e.target.value)}
            disabled={saving}
            fullWidth
            multiline
            rows={3}
            placeholder="KEY1=value1&#10;KEY2=value2"
          />

          {error && (
            <Box bgcolor="error.light" p={2} borderRadius={1}>
              <Typography color="error.contrastText" variant="body2">
                {error}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!name || !command || saving}
          startIcon={<SaveIcon />}
        >
          {saving ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerEditDialog;