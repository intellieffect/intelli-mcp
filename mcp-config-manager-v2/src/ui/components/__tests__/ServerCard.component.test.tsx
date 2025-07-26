/**
 * Component tests for ServerCard with accessibility validation
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ServerCard } from '../ServerCard';
import { renderWithProviders, createTestServer, checkAccessibility } from '@test/utils/test-utils';
import type { MCPServer } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('ServerCard Component', () => {
  let mockServer: MCPServer;
  let mockHandlers: {
    onStart: jest.Mock;
    onStop: jest.Mock;
    onRestart: jest.Mock;
    onEdit: jest.Mock;
    onDelete: jest.Mock;
    onToggleEnabled: jest.Mock;
  };

  beforeEach(() => {
    mockServer = createTestServer({
      id: 'test-server-1' as UUID,
      name: 'Test Server',
      description: 'A test server for component testing',
      status: {
        kind: 'running',
        since: '2024-01-01T00:00:00.000Z' as any,
        pid: 1234,
      },
      tags: ['test', 'development', 'api'],
    });

    mockHandlers = {
      onStart: jest.fn(),
      onStop: jest.fn(),
      onRestart: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleEnabled: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render server information correctly', () => {
      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByText('A test server for component testing')).toBeInTheDocument();
      expect(screen.getByText(/Running.*PID: 1234/)).toBeInTheDocument();
      
      // Check tags
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });

    it('should render loading states correctly', () => {
      renderWithProviders(
        <ServerCard
          server={mockServer}
          {...mockHandlers}
          loading={{ starting: true }}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error messages correctly', () => {
      renderWithProviders(
        <ServerCard
          server={mockServer}
          {...mockHandlers}
          errors={{ start: 'Failed to start server' }}
        />
      );

      expect(screen.getByText('Failed to start: Failed to start server')).toBeInTheDocument();
    });

    it('should render different server statuses correctly', () => {
      const stoppedServer = createTestServer({
        status: {
          kind: 'stopped',
          since: '2024-01-01T00:00:00.000Z' as any,
          reason: 'Manual stop',
        },
      });

      renderWithProviders(
        <ServerCard server={stoppedServer} {...mockHandlers} />
      );

      expect(screen.getByText('Stopped (Manual stop)')).toBeInTheDocument();
    });

    it('should render error status correctly', () => {
      const errorServer = createTestServer({
        status: {
          kind: 'error',
          since: '2024-01-01T00:00:00.000Z' as any,
          error: {
            code: 'STARTUP_ERROR',
            message: 'Failed to bind to port',
            timestamp: '2024-01-01T00:00:00.000Z' as any,
          },
          retryCount: 2,
        },
      });

      renderWithProviders(
        <ServerCard server={errorServer} {...mockHandlers} />
      );

      expect(screen.getByText('Error: Failed to bind to port')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should expand and collapse details', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Initially collapsed
      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();

      // Click to expand
      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Click to collapse
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
      });
    });

    it('should call onStart when start button is clicked', async () => {
      const user = userEvent.setup();
      const stoppedServer = createTestServer({
        status: { kind: 'stopped', since: '2024-01-01T00:00:00.000Z' as any },
      });

      renderWithProviders(
        <ServerCard server={stoppedServer} {...mockHandlers} />
      );

      const startButton = screen.getByRole('button', { name: /start.*test server/i });
      await user.click(startButton);

      expect(mockHandlers.onStart).toHaveBeenCalledWith(stoppedServer.id);
    });

    it('should call onStop when stop button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const stopButton = screen.getByRole('button', { name: /stop.*test server/i });
      await user.click(stopButton);

      expect(mockHandlers.onStop).toHaveBeenCalledWith(mockServer.id);
    });

    it('should call onRestart when restart button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const restartButton = screen.getByRole('button', { name: /restart.*test server/i });
      await user.click(restartButton);

      expect(mockHandlers.onRestart).toHaveBeenCalledWith(mockServer.id);
    });

    it('should open context menu and call edit', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Open context menu
      const moreButton = screen.getByRole('button', { name: /more actions/i });
      await user.click(moreButton);

      // Click edit
      const editMenuItem = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editMenuItem);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockServer);
    });

    it('should confirm before delete', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Open context menu
      const moreButton = screen.getByRole('button', { name: /more actions/i });
      await user.click(moreButton);

      // Click delete
      const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete server "Test Server"?');
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockServer.id);

      confirmSpy.mockRestore();
    });

    it('should not delete if not confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Open context menu
      const moreButton = screen.getByRole('button', { name: /more actions/i });
      await user.click(moreButton);

      // Click delete
      const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteMenuItem);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockHandlers.onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should toggle enabled state', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const enableSwitch = screen.getByRole('switch', { name: /disable.*test server/i });
      await user.click(enableSwitch);

      expect(mockHandlers.onToggleEnabled).toHaveBeenCalledWith(mockServer.id, false);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for expand/collapse', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const expandArea = screen.getByRole('button', { name: /toggle details/i });
      
      // Focus and press Enter
      await user.tab();
      expect(expandArea).toHaveFocus();
      
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });

      // Press Space to collapse
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
      });
    });

    it('should support keyboard navigation through action buttons', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Tab through all interactive elements
      await user.tab(); // Expand button
      await user.tab(); // More actions button
      await user.tab(); // Enable/disable switch
      await user.tab(); // Stop button
      await user.tab(); // Restart button

      const restartButton = screen.getByRole('button', { name: /restart.*test server/i });
      expect(restartButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockHandlers.onRestart).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      await checkAccessibility(container);
    });

    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      expect(screen.getByRole('button', { name: /toggle details for test server/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /more actions for test server/i })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /disable test server/i })).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for expanded state', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      
      // Initially collapsed
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // Expand
      await user.click(expandButton);

      await waitFor(() => {
        expect(expandButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have proper ARIA attributes for menu', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      const moreButton = screen.getByRole('button', { name: /more actions/i });
      
      // Initially closed
      expect(moreButton).toHaveAttribute('aria-expanded', 'false');
      expect(moreButton).toHaveAttribute('aria-haspopup', 'true');

      // Open menu
      await user.click(moreButton);

      expect(moreButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be readable by screen readers', () => {
      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Server name should be a heading
      const serverName = screen.getByRole('heading', { level: 3 });
      expect(serverName).toHaveTextContent('Test Server');

      // Status should be accessible
      expect(screen.getByText(/Running.*PID: 1234/)).toBeInTheDocument();
    });

    it('should handle high contrast mode', () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Component should render without errors
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    it('should handle reduced motion preference', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Component should render without errors
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });
  });

  describe('Expanded Content', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ServerCard server={mockServer} {...mockHandlers} />
      );

      // Expand the card
      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Configuration')).toBeInTheDocument();
      });
    });

    it('should show configuration details', () => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Command:')).toBeInTheDocument();
      expect(screen.getByText('node')).toBeInTheDocument();
    });

    it('should show arguments if present', () => {
      const serverWithArgs = createTestServer({
        configuration: {
          command: 'node' as any,
          args: ['server.js', '--port', '3000'],
          environment: new Map(),
        },
      });

      const { rerender } = renderWithProviders(
        <ServerCard server={serverWithArgs} {...mockHandlers} />
      );

      const user = userEvent.setup();
      
      // Re-expand for the new server
      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      user.click(expandButton);

      waitFor(() => {
        expect(screen.getByText('Arguments:')).toBeInTheDocument();
        expect(screen.getByText('server.js --port 3000')).toBeInTheDocument();
      });
    });

    it('should show environment variables', () => {
      const serverWithEnv = createTestServer({
        configuration: {
          command: 'node' as any,
          args: [],
          environment: new Map([
            ['NODE_ENV' as any, 'production' as any],
            ['PORT' as any, '8080' as any],
          ]),
        },
      });

      renderWithProviders(
        <ServerCard server={serverWithEnv} {...mockHandlers} />
      );

      const user = userEvent.setup();
      
      // Expand
      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      user.click(expandButton);

      waitFor(() => {
        expect(screen.getByText('Environment Variables')).toBeInTheDocument();
        expect(screen.getByText('NODE_ENV:')).toBeInTheDocument();
        expect(screen.getByText('production')).toBeInTheDocument();
        expect(screen.getByText('PORT:')).toBeInTheDocument();
        expect(screen.getByText('8080')).toBeInTheDocument();
      });
    });

    it('should show metrics', () => {
      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
      expect(screen.getByText('Restarts')).toBeInTheDocument();
      
      // Check uptime calculation (should be in minutes)
      const expectedUptimeMinutes = Math.floor(mockServer.metrics.uptime / 1000 / 60);
      expect(screen.getByText(`${expectedUptimeMinutes} minutes`)).toBeInTheDocument();
      
      expect(screen.getByText(mockServer.metrics.restartCount.toString())).toBeInTheDocument();
    });

    it('should show memory and CPU usage if available', () => {
      const serverWithUsage = createTestServer({
        metrics: {
          uptime: 3600000,
          restartCount: 0,
          memoryUsage: 256 * 1024 * 1024, // 256 MB
          cpuUsage: 25.5,
        },
      });

      renderWithProviders(
        <ServerCard server={serverWithUsage} {...mockHandlers} />
      );

      const user = userEvent.setup();
      
      // Expand
      const expandButton = screen.getByRole('button', { name: /toggle details/i });
      user.click(expandButton);

      waitFor(() => {
        expect(screen.getByText('Memory')).toBeInTheDocument();
        expect(screen.getByText('256 MB')).toBeInTheDocument();
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.getByText('25.5%')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle server without description', () => {
      const serverWithoutDesc = createTestServer({
        description: undefined,
      });

      renderWithProviders(
        <ServerCard server={serverWithoutDesc} {...mockHandlers} />
      );

      expect(screen.getByText('Test Server')).toBeInTheDocument();
      // Description should not be present
      expect(screen.queryByText('A test server for component testing')).not.toBeInTheDocument();
    });

    it('should handle server without tags', () => {
      const serverWithoutTags = createTestServer({
        tags: [],
      });

      renderWithProviders(
        <ServerCard server={serverWithoutTags} {...mockHandlers} />
      );

      expect(screen.getByText('Test Server')).toBeInTheDocument();
      // No tag chips should be present
      expect(screen.queryByText('test')).not.toBeInTheDocument();
    });

    it('should handle multiple error types', () => {
      renderWithProviders(
        <ServerCard
          server={mockServer}
          {...mockHandlers}
          errors={{
            start: 'Start error',
            stop: 'Stop error',
            update: 'Update error',
          }}
        />
      );

      expect(screen.getByText('Failed to start: Start error')).toBeInTheDocument();
      expect(screen.getByText('Failed to stop: Stop error')).toBeInTheDocument();
      expect(screen.getByText('Failed to update: Update error')).toBeInTheDocument();
    });

    it('should handle long server names gracefully', () => {
      const longNameServer = createTestServer({
        name: 'A'.repeat(100) as any,
      });

      renderWithProviders(
        <ServerCard server={longNameServer} {...mockHandlers} />
      );

      // Should render without breaking layout
      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });
  });
});