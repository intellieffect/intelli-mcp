/**
 * Hook for managing Claude Desktop MCP configuration
 */

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../stores';
import { claudeDesktopActions, selectClaudeDesktopConfig, selectClaudeDesktopConfigPath, selectClaudeDesktopLoading, selectClaudeDesktopError, selectClaudeDesktopServerCount } from '../stores/claude-desktop-store';

export const useClaudeDesktopConfig = () => {
  const dispatch = useAppDispatch();
  
  const configuration = useAppSelector(selectClaudeDesktopConfig);
  const configPath = useAppSelector(selectClaudeDesktopConfigPath);
  const isLoading = useAppSelector(selectClaudeDesktopLoading);
  const error = useAppSelector(selectClaudeDesktopError);
  const serverCount = useAppSelector(selectClaudeDesktopServerCount);

  useEffect(() => {
    // Get config path
    const getConfigPath = async () => {
      try {
        const result = await window.electronAPI.getConfigPath();
        if (result.success) {
          dispatch(claudeDesktopActions.setConfigPath(result.data));
        }
      } catch (err) {
        console.error('Failed to get config path:', err);
      }
    };

    // Load configuration on mount
    const loadConfig = async () => {
      dispatch(claudeDesktopActions.setLoading(true));
      dispatch(claudeDesktopActions.clearError());
      
      try {
        const result = await window.electronAPI.loadConfig();
        if (result.success) {
          dispatch(claudeDesktopActions.setConfig(result.data));
        } else {
          throw new Error(result.error || 'Failed to load configuration');
        }
      } catch (err) {
        dispatch(claudeDesktopActions.setError(
          err instanceof Error ? err.message : 'Failed to load configuration'
        ));
      } finally {
        dispatch(claudeDesktopActions.setLoading(false));
      }
    };

    getConfigPath();
    loadConfig();
  }, [dispatch]);

  const reloadConfig = async () => {
    dispatch(claudeDesktopActions.setLoading(true));
    dispatch(claudeDesktopActions.clearError());
    
    try {
      const result = await window.electronAPI.loadConfig();
      if (result.success) {
        dispatch(claudeDesktopActions.setConfig(result.data));
      } else {
        throw new Error(result.error || 'Failed to reload configuration');
      }
    } catch (err) {
      dispatch(claudeDesktopActions.setError(
        err instanceof Error ? err.message : 'Failed to reload configuration'
      ));
    } finally {
      dispatch(claudeDesktopActions.setLoading(false));
    }
  };

  return {
    configPath,
    configuration,
    isLoading,
    error,
    reloadConfig,
    serverCount,
  };
};