"use client"

import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Tabs, Tab, Button, Grid, Card, CardContent } from '@mui/material';
import {
  BarChart as BarChartIcon,
  // PieChart as PieChartIcon, // TODO: Use when implementing charts
  TrendingUp as TrendingUpIcon,
  TableChart as TableChartIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useHRReportContext } from '../../../backend/context/AnalyticsContext';
// import { useDashboard } from '../../../backend/context/DashboardContext'; // TODO: Use when implementing dashboard features
import CustomizableDashboard from '../../components/dashboard/CustomizableDashboard';
import ReportGenerator from '../../components/reports/ReportGenerator';
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
      id={`hr-dashboard-tabpanel-${index}`}
      aria-labelledby={`hr-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const HRDashboard: React.FC = () => {
  const { hr: hrContext, hrState } = useHRReportContext()
  // const dashboard = useDashboard(); // TODO: Use when implementing dashboard features
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange] = useState<{ startDate: Date; endDate: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    return { startDate: start, endDate: end };
  });
  const [frequency] = useState<'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('daily');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    try {
      // Refresh all HR data using HRContext
      await hrContext.refreshEmployees();
      await hrContext.refreshRoles();
      await hrContext.refreshDepartments();
      console.log("HR data refreshed successfully");
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(hrState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!hrState.companyID) {
    return <LocationPlaceholder />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          HR Management Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDataExport}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Employees
              </Typography>
              <Typography variant="h4">
                {hrState.employees.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Employees
              </Typography>
              <Typography variant="h4">
                {hrState.employees.filter(e => e.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Time Off
              </Typography>
              <Typography variant="h4" color="warning.main">
                {hrState.timeOffs.filter(t => t.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Training Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {hrState.trainings.filter(t => t.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="hr dashboard tabs">
          <Tab icon={<PeopleIcon />} label="Dashboard" />
          <Tab icon={<TrendingUpIcon />} label="Analytics" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="hr"
            title="HR"
            dateRange={dateRange}
            frequency={frequency}
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              HR Analytics
            </Typography>
            <Typography color="textSecondary">
              Advanced analytics and insights for human resources management.
            </Typography>
            {/* HR analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              HR Charts
            </Typography>
            <Typography color="textSecondary">
              Visual representations of HR data and trends.
            </Typography>
            {/* HR chart components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              HR Data Tables
            </Typography>
            <Typography color="textSecondary">
              Detailed tabular views of HR data.
            </Typography>
            {/* HR data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={4}>
          <ReportGenerator
            module="hr"
            title="HR"
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default HRDashboard;
