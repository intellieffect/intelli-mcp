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
import { JsonConfigEditor } from '@ui/components';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      {/* JSON Config Editor */}
      <JsonConfigEditor />
    </Box>
  );
};

export default DashboardPage;