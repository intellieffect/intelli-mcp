/**
 * Server card component with comprehensive accessibility and type safety
 */

import React, { useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Health as HealthIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import type { MCPServer } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

// Component props with strict typing
interface ServerCardProps {
  readonly server: MCPServer;
  readonly onStart: (id: UUID) => void;
  readonly onStop: (id: UUID) => void;
  readonly onRestart: (id: UUID) => void;
  readonly onEdit: (server: MCPServer) => void;
  readonly onDelete: (id: UUID) => void;
  readonly onToggleEnabled: (id: UUID, enabled: boolean) => void;
  readonly loading?: {
    readonly starting?: boolean;
    readonly stopping?: boolean;
    readonly updating?: boolean;
    readonly deleting?: boolean;
  };
  readonly errors?: {
    readonly start?: string;
    readonly stop?: string;
    readonly update?: string;
    readonly delete?: string;
  };
  readonly className?: string;
  readonly 'data-testid'?: string;
}

// Server status styling
const getStatusColor = (status: MCPServer['status']['kind']) => {
  switch (status) {
    case 'running':
      return 'success';
    case 'stopped':
      return 'default';
    case 'error':
      return 'error';
    case 'updating':
      return 'warning';
    case 'idle':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: MCPServer['status']['kind']) => {
  switch (status) {
    case 'running':
      return <SuccessIcon fontSize="small" />;
    case 'stopped':
      return <StopIcon fontSize="small" />;
    case 'error':
      return <ErrorIcon fontSize="small" />;
    case 'updating':
      return <CircularProgress size={16} />;
    case 'idle':
      return <HealthIcon fontSize="small" />;
    default:
      return null;
  }
};

const getStatusText = (status: MCPServer['status']) => {
  switch (status.kind) {
    case 'running':
      return `Running${status.pid ? ` (PID: ${status.pid})` : ''}`;
    case 'stopped':
      return `Stopped${status.reason ? ` (${status.reason})` : ''}`;
    case 'error':
      return `Error: ${status.error.message}`;
    case 'updating':
      return `Updating (${status.progress}%)`;
    case 'idle':
      return 'Idle';
    default:
      return 'Unknown';
  }
};

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onToggleEnabled,
  loading = {},
  errors = {},
  className,
  'data-testid': testId,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [expanded, setExpanded] = React.useState(false);

  const isMenuOpen = Boolean(anchorEl);
  const isRunning = server.status.kind === 'running';
  const canStart = server.status.kind === 'stopped' || server.status.kind === 'idle';
  const canStop = server.status.kind === 'running';

  // Memoized values for performance
  const statusColor = useMemo(() => getStatusColor(server.status.kind), [server.status.kind]);
  const statusIcon = useMemo(() => getStatusIcon(server.status.kind), [server.status.kind]);
  const statusText = useMemo(() => getStatusText(server.status), [server.status]);

  // Event handlers
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleStart = useCallback(() => {
    onStart(server.id);
    handleMenuClose();
  }, [onStart, server.id, handleMenuClose]);

  const handleStop = useCallback(() => {
    onStop(server.id);
    handleMenuClose();
  }, [onStop, server.id, handleMenuClose]);

  const handleRestart = useCallback(() => {
    onRestart(server.id);
    handleMenuClose();
  }, [onRestart, server.id, handleMenuClose]);

  const handleEdit = useCallback(() => {
    onEdit(server);
    handleMenuClose();
  }, [onEdit, server, handleMenuClose]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete server "${server.name}"?`)) {
      onDelete(server.id);
    }
    handleMenuClose();
  }, [onDelete, server.id, server.name, handleMenuClose]);

  const handleToggleEnabled = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onToggleEnabled(server.id, event.target.checked);
  }, [onToggleEnabled, server.id]);

  const handleExpandToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // Keyboard navigation
  const handleCardKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleExpandToggle();
    }
  }, [handleExpandToggle]);

  return (
    <Card
      className={className}
      data-testid={testId}
      sx={{
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
        },
        '&:focus-within': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
          role="button"
          tabIndex={0}
          onClick={handleExpandToggle}
          onKeyDown={handleCardKeyDown}
          sx={{
            cursor: 'pointer',
            borderRadius: 1,
            p: 0.5,
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px',
            },
          }}
          aria-expanded={expanded}
          aria-label={`Toggle details for ${server.name}`}
        >
          <Box display="flex" alignItems="center" gap={1} flex={1}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {server.name}
            </Typography>
            
            <Chip
              icon={statusIcon}
              label={statusText}
              color={statusColor}
              size="small"
              variant="outlined"
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={expanded ? 'Collapse details' : 'Expand details'}>
              <IconButton size="small" aria-label="toggle details">
                {expanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(e);
                }}
                aria-label={`More actions for ${server.name}`}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                <MoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Description */}
        {server.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {server.description}
          </Typography>
        )}

        {/* Tags */}
        {server.tags.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
            {server.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        )}

        {/* Errors */}
        {Object.values(errors).some(Boolean) && (
          <Box mb={2}>
            {errors.start && (
              <Alert severity="error" size="small" sx={{ mb: 1 }}>
                Failed to start: {errors.start}
              </Alert>
            )}
            {errors.stop && (
              <Alert severity="error" size="small" sx={{ mb: 1 }}>
                Failed to stop: {errors.stop}
              </Alert>
            )}
            {errors.update && (
              <Alert severity="error" size="small" sx={{ mb: 1 }}>
                Failed to update: {errors.update}
              </Alert>
            )}
            {errors.delete && (
              <Alert severity="error" size="small">
                Failed to delete: {errors.delete}
              </Alert>
            )}
          </Box>
        )}

        {/* Expanded Details */}
        <Collapse in={expanded}>
          <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Configuration
            </Typography>
            
            <Box display="grid" gridTemplateColumns="auto 1fr" gap={1} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Command:
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {server.configuration.command}
              </Typography>
              
              {server.configuration.args.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Arguments:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {server.configuration.args.join(' ')}
                  </Typography>
                </>
              )}
            </Box>

            {server.configuration.environment.size > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Environment Variables
                </Typography>
                <Box display="grid" gridTemplateColumns="auto 1fr" gap={1}>
                  {Array.from(server.configuration.environment.entries()).map(([key, value]) => (
                    <React.Fragment key={key}>
                      <Typography variant="body2" color="text.secondary">
                        {key}:
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {value}
                      </Typography>
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}

            {/* Metrics */}
            <Typography variant="subtitle2" gutterBottom>
              Metrics
            </Typography>
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Uptime
                </Typography>
                <Typography variant="body2">
                  {Math.floor(server.metrics.uptime / 1000 / 60)} minutes
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Restarts
                </Typography>
                <Typography variant="body2">
                  {server.metrics.restartCount}
                </Typography>
              </Box>
              {server.metrics.memoryUsage && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Memory
                  </Typography>
                  <Typography variant="body2">
                    {Math.round(server.metrics.memoryUsage / 1024 / 1024)} MB
                  </Typography>
                </Box>
              )}
              {server.metrics.cpuUsage && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    CPU
                  </Typography>
                  <Typography variant="body2">
                    {server.metrics.cpuUsage.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Collapse>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={`${server.status.kind === 'running' ? 'Disable' : 'Enable'} server`}>
            <Switch
              checked={server.status.kind !== 'stopped'}
              onChange={handleToggleEnabled}
              disabled={loading.updating}
              size="small"
              inputProps={{
                'aria-label': `${server.status.kind === 'running' ? 'Disable' : 'Enable'} ${server.name}`,
              }}
            />
          </Tooltip>
        </Box>

        <Box display="flex" gap={1}>
          {canStart && (
            <Tooltip title="Start server">
              <IconButton
                onClick={handleStart}
                disabled={loading.starting}
                color="success"
                size="small"
                aria-label={`Start ${server.name}`}
              >
                {loading.starting ? <CircularProgress size={20} /> : <StartIcon />}
              </IconButton>
            </Tooltip>
          )}

          {canStop && (
            <Tooltip title="Stop server">
              <IconButton
                onClick={handleStop}
                disabled={loading.stopping}
                color="error"
                size="small"
                aria-label={`Stop ${server.name}`}
              >
                {loading.stopping ? <CircularProgress size={20} /> : <StopIcon />}
              </IconButton>
            </Tooltip>
          )}

          {isRunning && (
            <Tooltip title="Restart server">
              <IconButton
                onClick={handleRestart}
                disabled={loading.starting || loading.stopping}
                color="warning"
                size="small"
                aria-label={`Restart ${server.name}`}
              >
                <RestartIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit} disabled={loading.updating}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        
        <MenuItem onClick={handleStart} disabled={!canStart || loading.starting}>
          <StartIcon sx={{ mr: 1 }} fontSize="small" />
          Start
        </MenuItem>
        
        <MenuItem onClick={handleStop} disabled={!canStop || loading.stopping}>
          <StopIcon sx={{ mr: 1 }} fontSize="small" />
          Stop
        </MenuItem>
        
        <MenuItem onClick={handleRestart} disabled={!isRunning}>
          <RestartIcon sx={{ mr: 1 }} fontSize="small" />
          Restart
        </MenuItem>
        
        <MenuItem 
          onClick={handleDelete}
          disabled={loading.deleting}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default ServerCard;