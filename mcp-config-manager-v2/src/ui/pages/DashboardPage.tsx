/**
 * Dashboard page component
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useAppSelector } from '@ui/stores';
import { selectServerStatistics } from '@ui/stores/server-store';
import { ClaudeDesktopStatus, ClaudeDesktopServerList } from '@ui/components';

const DashboardPage: React.FC = () => {
  const serverStats = useAppSelector(selectServerStatistics);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Server Statistics */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Servers
              </Typography>
              <Typography variant="h3" color="primary">
                {serverStats?.total || 0}
              </Typography>
              <Box mt={1}>
                <Chip
                  label={`${serverStats?.running || 0} Running`}
                  color="success"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`${serverStats?.stopped || 0} Stopped`}
                  color="default"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Configurations */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configurations
              </Typography>
              <Typography variant="h3" color="secondary">
                0
              </Typography>
              <Box mt={1}>
                <Chip
                  label="0 Active"
                  color="success"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Typography variant="h3" color="success.main">
                Good
              </Typography>
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={85}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Uptime */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Uptime
              </Typography>
              <Typography variant="h3" color="info.main">
                99.9%
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Claude Desktop Configuration Status */}
      <Box mt={3}>
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