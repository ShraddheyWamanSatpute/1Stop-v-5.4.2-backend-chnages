import React from 'react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { Box, Typography } from '@mui/material';

const Analytics: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, px: 3, pt: 3 }}>
        Business Intelligence
      </Typography>
      <AnalyticsDashboard />
    </Box>
  );
};

export default Analytics;