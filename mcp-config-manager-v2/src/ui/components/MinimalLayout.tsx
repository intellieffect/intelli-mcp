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
      {/* Draggable Header Area */}
      <Box
        sx={{
          '-webkit-app-region': 'drag',
          '-webkit-user-select': 'none',
          userSelect: 'none',
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          zIndex: 100,
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ pt: 4, pb: 2 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 500,
              color: 'text.primary',
              mb: 1,
              '-webkit-user-select': 'none',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            MCP Config Manager v2
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mb: 3,
              '-webkit-user-select': 'none',
              userSelect: 'none',
              cursor: 'default',
            }}
          >
            Simple JSON editor for Claude Desktop configuration
          </Typography>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default MinimalLayout;