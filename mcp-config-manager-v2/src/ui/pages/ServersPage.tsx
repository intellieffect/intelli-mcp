/**
 * Servers page component with full server management functionality
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ServerListView, ServerEditDialog } from '@ui/components';
import { useAppSelector, useAppDispatch } from '@ui/stores';
import {
  fetchServers,
  createServer,
  updateServer,
  deleteServer,
  startServer,
  stopServer,
  selectServers,
  selectServerLoading,
  selectServerErrors,
} from '@ui/stores/server-store';
import { showSuccessNotification, showErrorNotification } from '@ui/stores/ui-store';
import type { MCPServer, CreateServerInput, UpdateServerInput, ServerFilters, ServerSortOptions } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

const ServersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const servers = useAppSelector(selectServers);
  const loading = useAppSelector(selectServerLoading);
  const errors = useAppSelector(selectServerErrors);

  // Local state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ServerFilters>({});
  const [sort, setSort] = useState<ServerSortOptions>({ field: 'name', direction: 'asc' });

  const pageSize = 12;
  const totalCount = servers.length; // In real app, this would come from the API

  // Load servers on component mount
  useEffect(() => {
    dispatch(fetchServers({ filters, sort, pagination: { page: currentPage, limit: pageSize } }));
  }, [dispatch, filters, sort, currentPage]);

  // Event handlers
  const handleRefresh = useCallback(() => {
    dispatch(fetchServers({ filters, sort, pagination: { page: currentPage, limit: pageSize } }));
  }, [dispatch, filters, sort, currentPage]);

  const handleCreateServer = useCallback(() => {
    setEditingServer(null);
    setEditDialogOpen(true);
  }, []);

  const handleServerAction = useCallback(async (action: string, serverId: UUID, data?: any) => {
    try {
      switch (action) {
        case 'start':
          await dispatch(startServer(serverId)).unwrap();
          dispatch(showSuccessNotification({
            title: 'Server Started',
            message: 'Server has been started successfully',
          }));
          break;
          
        case 'stop':
          await dispatch(stopServer({ id: serverId })).unwrap();
          dispatch(showSuccessNotification({
            title: 'Server Stopped',
            message: 'Server has been stopped successfully',
          }));
          break;
          
        case 'restart':
          await dispatch(stopServer({ id: serverId })).unwrap();
          await dispatch(startServer(serverId)).unwrap();
          dispatch(showSuccessNotification({
            title: 'Server Restarted',
            message: 'Server has been restarted successfully',
          }));
          break;
          
        case 'edit':
          const server = servers.find(s => s.id === serverId);
          if (server) {
            setEditingServer(server);
            setEditDialogOpen(true);
          }
          break;
          
        case 'delete':
          if (window.confirm('Are you sure you want to delete this server?')) {
            await dispatch(deleteServer(serverId)).unwrap();
            dispatch(showSuccessNotification({
              title: 'Server Deleted',
              message: 'Server has been deleted successfully',
            }));
          }
          break;
          
        case 'toggle-enabled':
          // Toggle server enabled state - would need to be implemented in the store
          break;
      }
    } catch (error) {
      dispatch(showErrorNotification({
        title: 'Action Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, [dispatch, servers]);

  const handleDialogSave = useCallback(async (input: CreateServerInput | UpdateServerInput) => {
    try {
      if (editingServer) {
        // Update existing server
        await dispatch(updateServer({ id: editingServer.id, input: input as UpdateServerInput })).unwrap();
        dispatch(showSuccessNotification({
          title: 'Server Updated',
          message: 'Server has been updated successfully',
        }));
      } else {
        // Create new server
        await dispatch(createServer(input as CreateServerInput)).unwrap();
        dispatch(showSuccessNotification({
          title: 'Server Created',
          message: 'Server has been created successfully',
        }));
      }
      setEditDialogOpen(false);
      setEditingServer(null);
    } catch (error) {
      dispatch(showErrorNotification({
        title: editingServer ? 'Update Failed' : 'Creation Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, [dispatch, editingServer]);

  const handleDialogClose = useCallback(() => {
    setEditDialogOpen(false);
    setEditingServer(null);
  }, []);

  const handleFiltersChange = useCallback((newFilters: ServerFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleSortChange = useCallback((newSort: ServerSortOptions) => {
    setSort(newSort);
    setCurrentPage(1); // Reset to first page when sort changes
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Server Management
      </Typography>

      <ServerListView
        servers={servers}
        loading={loading.fetching}
        error={errors.fetch}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        filters={filters}
        sort={sort}
        onServerAction={handleServerAction}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onRefresh={handleRefresh}
        onCreateServer={handleCreateServer}
        data-testid="servers-page"
      />

      <ServerEditDialog
        open={editDialogOpen}
        server={editingServer}
        loading={loading.creating || loading.updating.size > 0}
        error={errors.create || Array.from(errors.update.values())[0] || null}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        data-testid="server-edit-dialog"
      />
    </Box>
  );
};

export default ServersPage;