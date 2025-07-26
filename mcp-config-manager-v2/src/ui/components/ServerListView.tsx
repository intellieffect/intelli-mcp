/**
 * Server list view component with advanced filtering, sorting, and accessibility
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Fab,
  Pagination,
  Switch,
  FormControlLabel,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  KeyboardArrowDown as ExpandIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { ServerCard } from './ServerCard';
import type { MCPServer, ServerFilters, ServerSortOptions } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

// Component props
interface ServerListViewProps {
  readonly servers: readonly MCPServer[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly totalCount: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly filters: ServerFilters;
  readonly sort: ServerSortOptions;
  readonly onServerAction: (action: ServerAction, serverId: UUID, data?: any) => void;
  readonly onFiltersChange: (filters: ServerFilters) => void;
  readonly onSortChange: (sort: ServerSortOptions) => void;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  readonly onCreateServer: () => void;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

// Server action types
type ServerAction = 'start' | 'stop' | 'restart' | 'edit' | 'delete' | 'toggle-enabled';

// View types
type ViewType = 'grid' | 'list';

// Filter state
interface FilterState {
  readonly search: string;
  readonly status: MCPServer['status']['kind'] | 'all';
  readonly tags: readonly string[];
  readonly showAdvanced: boolean;
}

// Sort options
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'uptime', label: 'Uptime' },
] as const;

// Status options
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses', color: 'default' },
  { value: 'running', label: 'Running', color: 'success' },
  { value: 'stopped', label: 'Stopped', color: 'default' },
  { value: 'error', label: 'Error', color: 'error' },
  { value: 'updating', label: 'Updating', color: 'warning' },
  { value: 'idle', label: 'Idle', color: 'info' },
] as const;

export const ServerListView: React.FC<ServerListViewProps> = ({
  servers,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  filters,
  sort,
  onServerAction,
  onFiltersChange,
  onSortChange,
  onPageChange,
  onRefresh,
  onCreateServer,
  className,
  'data-testid': testId,
}) => {
  // State
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [filterState, setFilterState] = useState<FilterState>({
    search: filters.search || '',
    status: filters.status || 'all',
    tags: filters.tags || [],
    showAdvanced: false,
  });
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [showEmpty, setShowEmpty] = useState(true);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Available tags from all servers
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    servers.forEach(server => {
      server.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [servers]);

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      total: servers.length,
      running: 0,
      stopped: 0,
      error: 0,
      idle: 0,
      updating: 0,
    };

    servers.forEach(server => {
      switch (server.status.kind) {
        case 'running':
          stats.running++;
          break;
        case 'stopped':
          stats.stopped++;
          break;
        case 'error':
          stats.error++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'updating':
          stats.updating++;
          break;
      }
    });

    return stats;
  }, [servers]);

  // Event handlers
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    setFilterState(prev => ({ ...prev, search }));
    
    // Debounced filter update
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: search || undefined,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((status: FilterState['status']) => {
    setFilterState(prev => ({ ...prev, status }));
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status,
    });
  }, [filters, onFiltersChange]);

  const handleTagToggle = useCallback((tag: string) => {
    setFilterState(prev => {
      const tags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      
      onFiltersChange({
        ...filters,
        tags: tags.length > 0 ? tags : undefined,
      });

      return { ...prev, tags };
    });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSortMenuAnchor(null);
    onSortChange({
      field: field as any,
      direction,
    });
  }, [onSortChange]);

  const handleClearFilters = useCallback(() => {
    setFilterState({
      search: '',
      status: 'all',
      tags: [],
      showAdvanced: false,
    });
    onFiltersChange({});
  }, [onFiltersChange]);

  const handleServerAction = useCallback((action: ServerAction, serverId: UUID, data?: any) => {
    onServerAction(action, serverId, data);
  }, [onServerAction]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'r':
            event.preventDefault();
            onRefresh();
            break;
          case 'n':
            event.preventDefault();
            onCreateServer();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onRefresh, onCreateServer]);

  // Focus management
  const handleListFocus = useCallback(() => {
    listRef.current?.focus();
  }, []);

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: pageSize }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Paper sx={{ p: 2, height: 200 }}>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={80} sx={{ mb: 2 }} />
            <Box display="flex" justifyContent="space-between">
              <Skeleton variant="circular" width={32} height={32} />
              <Box display="flex" gap={1}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  // Empty state
  const renderEmptyState = () => (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        bgcolor: 'background.default',
        border: '2px dashed',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {filters.search || filters.status || (filters.tags && filters.tags.length > 0)
          ? 'No servers match your filters'
          : 'No servers configured'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {filters.search || filters.status || (filters.tags && filters.tags.length > 0)
          ? 'Try adjusting your search criteria or filters'
          : 'Get started by creating your first MCP server configuration'}
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onCreateServer}
        size="large"
      >
        Create Server
      </Button>
    </Paper>
  );

  return (
    <Box className={className} data-testid={testId}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" component="h1">
            Server Management
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh (Ctrl+R)">
              <IconButton
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh servers"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Grid view">
              <IconButton
                onClick={() => setViewType('grid')}
                color={viewType === 'grid' ? 'primary' : 'default'}
                aria-label="Grid view"
              >
                <GridViewIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="List view">
              <IconButton
                onClick={() => setViewType('list')}
                color={viewType === 'list' ? 'primary' : 'default'}
                aria-label="List view"
              >
                <ListViewIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Statistics */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          <Chip
            label={`Total: ${statistics.total}`}
            color="default"
            size="small"
          />
          <Chip
            label={`Running: ${statistics.running}`}
            color="success"
            size="small"
          />
          <Chip
            label={`Stopped: ${statistics.stopped}`}
            color="default"
            size="small"
          />
          {statistics.error > 0 && (
            <Chip
              label={`Errors: ${statistics.error}`}
              color="error"
              size="small"
            />
          )}
          {statistics.updating > 0 && (
            <Chip
              label={`Updating: ${statistics.updating}`}
              color="warning"
              size="small"
            />
          )}
        </Box>

        {/* Search and Filters */}
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <TextField
            ref={searchInputRef}
            placeholder="Search servers... (Ctrl+F)"
            value={filterState.search}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: filterState.search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFilterState(prev => ({ ...prev, search: '' }));
                      onFiltersChange({ ...filters, search: undefined });
                    }}
                    aria-label="Clear search"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterState.status}
              label="Status"
              onChange={(e) => handleStatusChange(e.target.value as FilterState['status'])}
            >
              {STATUS_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Sort options">
            <IconButton
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              aria-label="Sort options"
              aria-haspopup="true"
            >
              <SortIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Filter options">
            <IconButton
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              aria-label="Filter options"
              aria-haspopup="true"
            >
              <FilterIcon />
            </IconButton>
          </Tooltip>

          {(filterState.search || filterState.status !== 'all' || filterState.tags.length > 0) && (
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              size="small"
              color="secondary"
            >
              Clear Filters
            </Button>
          )}
        </Box>

        {/* Active Filters */}
        {filterState.tags.length > 0 && (
          <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
              Tags:
            </Typography>
            {filterState.tags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => handleTagToggle(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Content */}
      <Box ref={listRef} tabIndex={-1} sx={{ outline: 'none' }}>
        {loading ? (
          renderLoadingSkeleton()
        ) : servers.length === 0 ? (
          showEmpty && renderEmptyState()
        ) : (
          <Grid container spacing={3}>
            {servers.map(server => (
              <Grid
                item
                xs={12}
                sm={viewType === 'grid' ? 6 : 12}
                md={viewType === 'grid' ? 4 : 12}
                key={server.id}
              >
                <ServerCard
                  server={server}
                  onStart={(id) => handleServerAction('start', id)}
                  onStop={(id) => handleServerAction('stop', id)}
                  onRestart={(id) => handleServerAction('restart', id)}
                  onEdit={(server) => handleServerAction('edit', server.id, server)}
                  onDelete={(id) => handleServerAction('delete', id)}
                  onToggleEnabled={(id, enabled) => handleServerAction('toggle-enabled', id, { enabled })}
                  data-testid={`server-card-${server.id}`}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Pagination */}
      {totalCount > pageSize && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={Math.ceil(totalCount / pageSize)}
            page={currentPage}
            onChange={(_, page) => onPageChange(page)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Create server (Ctrl+N)"
        onClick={onCreateServer}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuList>
          {SORT_OPTIONS.map(option => (
            <React.Fragment key={option.value}>
              <MenuItem
                onClick={() => handleSortChange(option.value, 'asc')}
                selected={sort.field === option.value && sort.direction === 'asc'}
              >
                <ListItemText primary={`${option.label} (A-Z)`} />
              </MenuItem>
              <MenuItem
                onClick={() => handleSortChange(option.value, 'desc')}
                selected={sort.field === option.value && sort.direction === 'desc'}
              >
                <ListItemText primary={`${option.label} (Z-A)`} />
              </MenuItem>
              <Divider />
            </React.Fragment>
          ))}
        </MenuList>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 300, maxWidth: 400 },
        }}
      >
        <Box p={2}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by Tags
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {availableTags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                clickable
                color={filterState.tags.includes(tag) ? 'primary' : 'default'}
                onClick={() => handleTagToggle(tag)}
              />
            ))}
            {availableTags.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No tags available
              </Typography>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={showEmpty}
                onChange={(e) => setShowEmpty(e.target.checked)}
                size="small"
              />
            }
            label="Show empty state"
          />
        </Box>
      </Menu>
    </Box>
  );
};

export default ServerListView;