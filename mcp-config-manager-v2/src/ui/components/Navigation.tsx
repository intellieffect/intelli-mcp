/**
 * Navigation component with sidebar, header, and accessibility features
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Switch,
  FormControlLabel,
  Chip,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as ServersIcon,
  Settings as ConfigIcon,
  Timeline as MonitoringIcon,
  Help as HelpIcon,
  Info as AboutIcon,
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  Computer as SystemIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '@ui/stores';
import { 
  toggleSidebar,
  setTheme,
} from '@ui/stores/ui-store';
import { selectServerStatistics } from '@ui/stores/server-store';
import type { ThemeMode } from '@ui/stores/ui-store';

// Navigation item interface
interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ReactElement;
  readonly path: string;
  readonly badge?: number | string;
  readonly children?: readonly NavigationItem[];
  readonly disabled?: boolean;
}

// Component props
interface NavigationProps {
  readonly currentPath: string;
  readonly onNavigate: (path: string) => void;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

// Navigation items configuration
const useNavigationItems = (): readonly NavigationItem[] => {
  const serverStats = useAppSelector(selectServerStatistics);
  const configStats = useAppSelector(state => ({
    total: 0, // Placeholder - would come from configuration statistics
    active: 0,
    errors: 0,
  }));

  return useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      id: 'servers',
      label: 'Servers',
      icon: <ServersIcon />,
      path: '/servers',
      badge: serverStats?.errors > 0 ? serverStats.errors : undefined,
      children: [
        {
          id: 'servers-list',
          label: 'All Servers',
          icon: <ServersIcon />,
          path: '/servers',
          badge: serverStats?.total,
        },
        {
          id: 'servers-running',
          label: 'Running',
          icon: <SuccessIcon />,
          path: '/servers?status=running',
          badge: serverStats?.running,
        },
        {
          id: 'servers-stopped',
          label: 'Stopped',
          icon: <ErrorIcon />,
          path: '/servers?status=stopped',
          badge: serverStats?.stopped,
        },
      ],
    },
    {
      id: 'configurations',
      label: 'Configurations',
      icon: <ConfigIcon />,
      path: '/configurations',
      badge: configStats.errors > 0 ? configStats.errors : undefined,
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: <MonitoringIcon />,
      path: '/monitoring',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: <HelpIcon />,
      path: '/help',
      children: [
        {
          id: 'help-docs',
          label: 'Documentation',
          icon: <HelpIcon />,
          path: '/help/docs',
        },
        {
          id: 'help-about',
          label: 'About',
          icon: <AboutIcon />,
          path: '/help/about',
        },
      ],
    },
  ], [serverStats, configStats]);
};

export const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavigate,
  className,
  'data-testid': testId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  
  // State from Redux
  const sidebarCollapsed = useAppSelector(state => state.ui.layout.sidebarCollapsed);
  const currentTheme = useAppSelector(state => state.ui.theme);
  const notifications = useAppSelector(state => state.ui.notifications);
  const online = useAppSelector(state => state.ui.connectivity.online);
  
  // Local state
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const navigationItems = useNavigationItems();
  const drawerWidth = sidebarCollapsed ? 64 : 280;

  // Notification counts
  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => n.type === 'error').length;
  }, [notifications]);

  // Event handlers
  const handleSidebarToggle = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  const handleThemeChange = useCallback((newTheme: ThemeMode) => {
    dispatch(setTheme(newTheme));
    setAccountMenuAnchor(null);
  }, [dispatch]);

  const handleNavigate = useCallback((path: string) => {
    onNavigate(path);
    if (isMobile) {
      dispatch(toggleSidebar());
    }
  }, [onNavigate, isMobile, dispatch]);

  const handleItemExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  // Navigation item renderer
  const renderNavigationItem = useCallback((item: NavigationItem, level = 0) => {
    const isActive = currentPath === item.path;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = Boolean(item.children && item.children.length > 0);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                handleItemExpand(item.id);
              } else {
                handleNavigate(item.path);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, () => {
              if (hasChildren) {
                handleItemExpand(item.id);
              } else {
                handleNavigate(item.path);
              }
            })}
            selected={isActive}
            disabled={item.disabled}
            sx={{
              minHeight: 48,
              pl: level > 0 ? 4 + level * 2 : 2,
              pr: 2,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '20',
                borderRight: `3px solid ${theme.palette.primary.main}`,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main + '30',
                },
              },
            }}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-label={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: sidebarCollapsed ? 0 : 3,
                justifyContent: 'center',
                color: isActive ? 'primary.main' : 'inherit',
              }}
            >
              {item.badge && typeof item.badge === 'number' && item.badge > 0 ? (
                <Badge badgeContent={item.badge} color="error" max={99}>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            
            {!sidebarCollapsed && (
              <>
                <ListItemText
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'inherit',
                    },
                  }}
                />
                
                {item.badge && typeof item.badge === 'string' && (
                  <Chip
                    label={item.badge}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                
                {hasChildren && (
                  <IconButton size="small" edge="end">
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </>
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && !sidebarCollapsed && (
          <Collapse in={isExpanded} timeout="auto">
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  }, [
    currentPath,
    expandedItems,
    sidebarCollapsed,
    theme.palette.primary.main,
    handleItemExpand,
    handleNavigate,
    handleKeyDown,
  ]);

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Title */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          minHeight: 64,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {!sidebarCollapsed && (
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            MCP Config Manager
          </Typography>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {navigationItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      {/* Connection Status */}
      {!sidebarCollapsed && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: online ? 'success.main' : 'error.main',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {online ? 'Connected' : 'Offline'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box className={className} data-testid={testId}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="Toggle sidebar"
            onClick={handleSidebarToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Dynamic page title based on current path */}
            {navigationItems.find(item => item.path === currentPath)?.label || 'MCP Config Manager'}
          </Typography>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={(e) => setNotificationMenuAnchor(e.currentTarget)}
              aria-label={`Notifications ${unreadNotifications > 0 ? `(${unreadNotifications} unread)` : ''}`}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Account Menu */}
          <Tooltip title="Account settings">
            <IconButton
              color="inherit"
              onClick={(e) => setAccountMenuAnchor(e.currentTarget)}
              aria-label="Account settings"
              aria-haspopup="true"
            >
              <AccountIcon />
            </IconButton>
          </Tooltip>

          {/* Theme Toggle (Quick Access) */}
          <Tooltip title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}>
            <IconButton
              color="inherit"
              onClick={() => handleThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? !sidebarCollapsed : true}
        onClose={handleSidebarToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Account Menu */}
      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={() => setAccountMenuAnchor(null)}
        onClick={() => setAccountMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Theme Settings
          </Typography>
          
          <Box mt={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentTheme === 'light'}
                  onChange={() => handleThemeChange('light')}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <LightIcon fontSize="small" />
                  Light
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentTheme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <DarkIcon fontSize="small" />
                  Dark
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentTheme === 'system'}
                  onChange={() => handleThemeChange('system')}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <SystemIcon fontSize="small" />
                  System
                </Box>
              }
            />
          </Box>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={() => onNavigate('/settings')}>
          <ListItemIcon>
            <ConfigIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        
        <MenuItem onClick={() => onNavigate('/help/about')}>
          <ListItemIcon>
            <AboutIcon fontSize="small" />
          </ListItemIcon>
          About
        </MenuItem>
      </Menu>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={() => setNotificationMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 320, maxHeight: 400 },
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Notifications
          </Typography>
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {notifications.slice(0, 5).map(notification => (
              <ListItem key={notification.id} dense>
                <ListItemIcon>
                  {notification.type === 'error' && <ErrorIcon color="error" />}
                  {notification.type === 'warning' && <WarningIcon color="warning" />}
                  {notification.type === 'success' && <SuccessIcon color="success" />}
                  {notification.type === 'info' && <NotificationsIcon color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={notification.message}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        )}
        
        {notifications.length > 5 && (
          <>
            <Divider />
            <MenuItem onClick={() => onNavigate('/notifications')}>
              View All Notifications
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default Navigation;