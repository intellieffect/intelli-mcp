/**
 * Claude Desktop MCP Server List Component
 * Displays all MCP servers configured in Claude Desktop
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Collapse,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../stores';
import { 
  selectClaudeDesktopServers, 
  claudeDesktopActions,
  selectClaudeDesktopLoading,
} from '../stores/claude-desktop-store';

interface ServerDetailsProps {
  serverName: string;
  server: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
}

const ServerDetails: React.FC<ServerDetailsProps> = ({ serverName, server }) => {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <ListItem>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon fontSize="small" color="primary" />
              <Typography variant="h6">{serverName}</Typography>
            </Box>
          }
          secondary={
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Command: <code>{server.command}</code>
              </Typography>
              {server.args && server.args.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Arguments: {server.args.join(' ')}
                </Typography>
              )}
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <Tooltip title={expanded ? "Hide details" : "Show details"}>
            <IconButton 
              edge="end" 
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy command">
            <IconButton 
              edge="end" 
              onClick={() => handleCopy(`${server.command} ${server.args?.join(' ') || ''}`)}
              sx={{ mr: 1 }}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
        </ListItemSecondaryAction>
      </ListItem>
      
      <Collapse in={expanded}>
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Full Command
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <code>
                  {server.command} {server.args?.join(' ') || ''}
                </code>
              </Paper>
            </Grid>
            
            {server.env && Object.keys(server.env).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Environment Variables
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {Object.entries(server.env).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip 
                        label={key} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Typography variant="body2">
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export const ClaudeDesktopServerList: React.FC = () => {
  const dispatch = useAppDispatch();
  const servers = useAppSelector(selectClaudeDesktopServers);
  const loading = useAppSelector(selectClaudeDesktopLoading);
  const [searchTerm, setSearchTerm] = useState('');

  const serverEntries = Object.entries(servers);
  const filteredServers = serverEntries.filter(([name]) => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading servers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search servers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {filteredServers.length} of {serverEntries.length} servers
        </Typography>
      </Box>

      {serverEntries.length === 0 ? (
        <Alert severity="info">
          No MCP servers configured in Claude Desktop.
        </Alert>
      ) : filteredServers.length === 0 ? (
        <Alert severity="warning">
          No servers match your search.
        </Alert>
      ) : (
        <List sx={{ p: 0 }}>
          {filteredServers.map(([serverName, server]) => (
            <ServerDetails
              key={serverName}
              serverName={serverName}
              server={server}
            />
          ))}
        </List>
      )}
    </Box>
  );
};

export default ClaudeDesktopServerList;