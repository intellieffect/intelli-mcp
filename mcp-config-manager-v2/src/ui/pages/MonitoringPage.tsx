/**
 * Monitoring page component
 */

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const MonitoringPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Monitoring
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time monitoring and analytics features will be available in a future update.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitoringPage;