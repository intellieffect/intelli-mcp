/**
 * Dashboard page component
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { ClaudeDesktopStatus, ClaudeDesktopServerList } from '@ui/components';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      {/* Claude Desktop Configuration Status */}
      <Box>
        <ClaudeDesktopStatus />
      </Box>

      {/* Claude Desktop MCP Servers */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Claude Desktop MCP Servers
            </Typography>
            <ClaudeDesktopServerList />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DashboardPage;