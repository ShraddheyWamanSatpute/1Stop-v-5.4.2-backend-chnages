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
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { useBookingsReportContext } from '../../../backend/context/AnalyticsContext';
// import { useDashboard } from '../../../backend/context/DashboardContext'; // TODO: Implement dashboard functionality
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
      id={`bookings-dashboard-tabpanel-${index}`}
      aria-labelledby={`bookings-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BookingsDashboard: React.FC = () => {
  const bookingsState = useBookingsReportContext();
  // const dashboard = useDashboard(); // TODO: Implement dashboard functionality
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
      // Refresh all bookings data using BookingsContext
      await bookingsState.fetchBookings();
      await bookingsState.fetchTables();
      await bookingsState.fetchBookingTypes();
      await bookingsState.fetchBookingStatuses();
      console.log("Bookings data refreshed successfully");
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(bookingsState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!bookingsState.companyID) {
    return <LocationPlaceholder />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Bookings Management Dashboard
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
                Total Bookings
              </Typography>
              <Typography variant="h4">
                {bookingsState.bookings.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Confirmed Bookings
              </Typography>
              <Typography variant="h4" color="success.main">
                {bookingsState.bookings.filter(b => b.status === 'confirmed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Bookings
              </Typography>
              <Typography variant="h4" color="warning.main">
                {bookingsState.bookings.filter(b => b.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Tables
              </Typography>
              <Typography variant="h4">
                {bookingsState.tables.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="bookings dashboard tabs">
          <Tab icon={<CalendarTodayIcon />} label="Dashboard" />
          <Tab icon={<TrendingUpIcon />} label="Analytics" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="bookings"
            title="Bookings"
            dateRange={dateRange}
            frequency={frequency}
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bookings Analytics
            </Typography>
            <Typography color="textSecondary">
              Advanced analytics and insights for bookings management.
            </Typography>
            {/* Bookings analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bookings Charts
            </Typography>
            <Typography color="textSecondary">
              Visual representations of bookings data and trends.
            </Typography>
            {/* Bookings chart components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bookings Data Tables
            </Typography>
            <Typography color="textSecondary">
              Detailed tabular views of bookings data.
            </Typography>
            {/* Bookings data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={4}>
          <ReportGenerator
            module="bookings"
            title="Bookings"
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default BookingsDashboard;
