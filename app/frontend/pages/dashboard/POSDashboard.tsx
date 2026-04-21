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
  PointOfSale as PointOfSaleIcon,
} from '@mui/icons-material';
import { usePOSReportContext } from '../../../backend/context/AnalyticsContext';
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
      id={`pos-dashboard-tabpanel-${index}`}
      aria-labelledby={`pos-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const POSDashboard: React.FC = () => {
  const { pos, posState, companyState } = usePOSReportContext();
  const { refreshBills } = pos;
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
      await refreshBills();
      // await posState.refreshCards();
      // await posState.refreshDiscounts();
      // await posState.refreshPromotions();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(posState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!companyState.companyID) {
    return <LocationPlaceholder />;
  }

  const totalSales = posState.bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
  const totalTransactions = posState.bills.length;
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          POS Management Dashboard
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
                Total Sales
              </Typography>
              <Typography variant="h4" color="success.main">
                ${totalSales.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Transactions
              </Typography>
              <Typography variant="h4">
                {totalTransactions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Transaction
              </Typography>
              <Typography variant="h4">
                ${averageTransactionValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Promotions
              </Typography>
              <Typography variant="h4" color="info.main">
                {posState.promotions.filter(p => p.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="pos dashboard tabs">
          <Tab icon={<PointOfSaleIcon />} label="Dashboard" />
          <Tab icon={<TrendingUpIcon />} label="Analytics" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="pos"
            title="POS"
            dateRange={dateRange}
            frequency={frequency}
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              POS Analytics
            </Typography>
            <Typography color="textSecondary">
              Advanced analytics and insights for point of sale management.
            </Typography>
            {/* POS analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              POS Charts
            </Typography>
            <Typography color="textSecondary">
              Visual representations of POS data and trends.
            </Typography>
            {/* POS chart components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              POS Data Tables
            </Typography>
            <Typography color="textSecondary">
              Detailed tabular views of POS data.
            </Typography>
            {/* POS data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={4}>
          <ReportGenerator
            module="pos"
            title="POS"
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default POSDashboard;
