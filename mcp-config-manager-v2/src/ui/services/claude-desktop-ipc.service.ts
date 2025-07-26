/**
 * Claude Desktop IPC Service - SIMPLIFIED
 * 
 * 단순한 편집-저장 기능만 제공
 */

import type { Result } from '@shared/types/result';
import type { ClaudeDesktopConfig } from '../stores/claude-desktop-store';

export interface ClaudeDesktopMCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * 단순한 Claude Desktop Configuration IPC Service
 */
export class ClaudeDesktopIPCService {
  /**
   * Load Claude Desktop configuration
   */
  async loadConfiguration(): Promise<Result<ClaudeDesktopConfig>> {
    try {
      const response = await window.electronAPI.loadConfig();
      
      if (!response.success) {
        return {
          kind: 'failure',
          error: {
            name: 'CONFIG_LOAD_ERROR',
            message: response.error || 'Failed to load configuration',
          },
        };
      }

      return {
        kind: 'success',
        value: response.data as ClaudeDesktopConfig,
      };
    } catch (error) {
      return {
        kind: 'failure',
        error: {
          name: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'IPC communication failed',
        },
      };
    }
  }

  /**
   * Add new MCP server
   */
  async addServer(name: string, server: ClaudeDesktopMCPServer): Promise<Result<void>> {
    try {
      const response = await window.electronAPI.addServer(name, server);
      
      if (!response.success) {
        return {
          kind: 'failure',
          error: {
            name: 'SERVER_ADD_ERROR',
            message: response.error || 'Failed to add server',
          },
        };
      }

      return {
        kind: 'success',
        value: undefined,
      };
    } catch (error) {
      return {
        kind: 'failure',
        error: {
          name: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'IPC communication failed',
        },
      };
    }
  }

  /**
   * Update existing MCP server
   */
  async updateServer(name: string, server: ClaudeDesktopMCPServer): Promise<Result<void>> {
    try {
      const response = await window.electronAPI.updateServer(name, server);
      
      if (!response.success) {
        return {
          kind: 'failure',
          error: {
            name: 'SERVER_UPDATE_ERROR',
            message: response.error || 'Failed to update server',
          },
        };
      }

      return {
        kind: 'success',
        value: undefined,
      };
    } catch (error) {
      return {
        kind: 'failure',
        error: {
          name: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'IPC communication failed',
        },
      };
    }
  }
}

// Export singleton instance
export const claudeDesktopIPCService = new ClaudeDesktopIPCService();