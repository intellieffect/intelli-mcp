/**
 * Help and support page component
 */

import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const HelpPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Help & Support
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Documentation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive documentation and help resources will be available soon.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HelpPage;