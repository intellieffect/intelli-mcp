/**
 * Hook for managing Claude Desktop MCP configuration
 */

import { useEffect, useState } from 'react';

export const useClaudeDesktopConfig = () => {
  const [configuration, setConfiguration] = useState<any>(null);
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverCount, setServerCount] = useState(0);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        // Get config path
        const path = await window.electronAPI.getConfigPath();
        setConfigPath(path);

        // Load config content
        const content = await window.electronAPI.readFile(path);
        const parsed = JSON.parse(content);
        setConfiguration(parsed);
        
        // Count servers
        const count = parsed?.mcpServers ? Object.keys(parsed.mcpServers).length : 0;
        setServerCount(count);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to load Claude Desktop config:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save config function
  const saveConfig = async (newConfig: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const configString = JSON.stringify(newConfig, null, 2);
      await window.electronAPI.writeFile(configPath, configString);
      
      setConfiguration(newConfig);
      
      // Update server count
      const count = newConfig?.mcpServers ? Object.keys(newConfig.mcpServers).length : 0;
      setServerCount(count);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to save Claude Desktop config:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Reload config function
  const reloadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const content = await window.electronAPI.readFile(configPath);
      const parsed = JSON.parse(content);
      setConfiguration(parsed);
      
      // Update server count
      const count = parsed?.mcpServers ? Object.keys(parsed.mcpServers).length : 0;
      setServerCount(count);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to reload Claude Desktop config:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    configuration,
    configPath,
    isLoading,
    error,
    serverCount,
    saveConfig,
    reloadConfig
  };
};