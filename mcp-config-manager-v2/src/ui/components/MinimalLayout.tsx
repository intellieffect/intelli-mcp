/**
 * Minimal layout component for MCP Config Manager
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Divider,
} from '@mui/material';

interface MinimalLayoutProps {
  children: React.ReactNode;
}

export const MinimalLayout: React.FC<MinimalLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}>
      {/* Simple Header */}
      <Container maxWidth="lg" sx={{ pt: 4, pb: 2 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 500,
            color: 'text.primary',
            mb: 1
          }}
        >
          MCP Config Manager v2
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Simple JSON editor for Claude Desktop configuration
        </Typography>
        <Divider sx={{ mb: 3 }} />
      </Container>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default MinimalLayout;