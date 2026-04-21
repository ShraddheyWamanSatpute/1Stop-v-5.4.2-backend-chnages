"use client"

import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Tabs, Tab, Button, Grid, Card, CardContent } from '@mui/material';
import {
  BarChart as BarChartIcon,
  // PieChart as PieChartIcon, // TODO: Implement pie chart functionality
  TrendingUp as TrendingUpIcon,
  TableChart as TableChartIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useCompany } from '../../../backend/context/CompanyContext';
import { useDashboard } from '../../../backend/context/DashboardContext';
import CustomizableDashboard from '../../components/dashboard/CustomizableDashboard';
import LocationPlaceholder from '../../components/common/LocationPlaceholder';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`global-dashboard-tabpanel-${index}`}
      aria-labelledby={`global-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const GlobalDashboard: React.FC = () => {
  const { state: companyState } = useCompany();
  const dashboard = useDashboard();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    try {
      // Refresh all module data
      await dashboard.refreshAllCards();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(companyState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `global-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!companyState.companyID) {
    return <LocationPlaceholder />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Global Business Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh All
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDataExport}
          >
            Export All Data
          </Button>
        </Box>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sites
              </Typography>
              <Typography variant="h4">
                {companyState.sites.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Subsites
              </Typography>
              <Typography variant="h4">
                {companyState.subsites.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Users
              </Typography>
              <Typography variant="h4">
                {companyState.user ? 1 : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Company Status
              </Typography>
              <Typography variant="h4" color="success.main">
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="global dashboard tabs">
          <Tab icon={<DashboardIcon />} label="Overview" />
          <Tab icon={<TrendingUpIcon />} label="Analytics" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="global"
            title="Global Business"
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Global Analytics
            </Typography>
            <Typography color="textSecondary">
              Cross-module analytics and business intelligence.
            </Typography>
            {/* Global analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Global Charts
            </Typography>
            <Typography color="textSecondary">
              Visual representations of business data across all modules.
            </Typography>
            {/* Global chart components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Global Data Tables
            </Typography>
            <Typography color="textSecondary">
              Comprehensive tabular views of all business data.
            </Typography>
            {/* Global data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Global Reports
            </Typography>
            <Typography color="textSecondary">
              Generate and manage comprehensive business reports.
            </Typography>
            {/* Global report components would go here */}
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default GlobalDashboard;
