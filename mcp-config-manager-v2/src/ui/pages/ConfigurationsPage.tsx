/**
 * Configurations page component
 */

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ConfigurationsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuration Management
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configuration management features will be available in a future update.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConfigurationsPage;