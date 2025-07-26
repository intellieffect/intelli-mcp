/**
 * Settings page component
 */

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Application Settings
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Application settings and preferences will be available in a future update.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;