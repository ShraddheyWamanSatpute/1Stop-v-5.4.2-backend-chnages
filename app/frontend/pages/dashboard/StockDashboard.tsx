"use client"

import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Tabs, Tab, Button, Grid, Card, CardContent } from '@mui/material';
import {
  BarChart as BarChartIcon,
  // PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  TableChart as TableChartIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useStockReportContext } from '../../../backend/context/AnalyticsContext';
// import { useDashboard } from '../../../backend/context/DashboardContext'; // TODO: Use when implementing dashboard functionality
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
      id={`stock-dashboard-tabpanel-${index}`}
      aria-labelledby={`stock-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StockDashboard: React.FC = () => {
  const { stock: stockContext, stockState } = useStockReportContext()
  // const dashboard = useDashboard(); // TODO: Use when implementing dashboard functionality
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
      // Refresh all stock data using StockContext
      await stockContext.refreshAll();
      console.log("Stock data refreshed successfully");
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(stockState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!stockState.companyID) {
    return <LocationPlaceholder />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Stock Management Dashboard
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
                Total Products
              </Typography>
              <Typography variant="h4">
                {stockState.products.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Suppliers
              </Typography>
              <Typography variant="h4">
                {stockState.suppliers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Stock Value
              </Typography>
              <Typography variant="h4">
                ${stockState.products.reduce((sum, product) => sum + ((product.price || 0) * (product.quantity || 0)), 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" color="error">
                {stockState.products.filter(p => (p.quantity || 0) < (p.parLevel || 10)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="stock dashboard tabs">
          <Tab icon={<TrendingUpIcon />} label="Dashboard" />
          <Tab icon={<BarChartIcon />} label="Analytics" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="stock"
            title="Stock"
            dateRange={dateRange}
            frequency={frequency}
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stock Analytics
            </Typography>
            <Typography color="textSecondary">
              Advanced analytics and insights for stock management.
            </Typography>
            {/* Analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Data Tables
            </Typography>
            <Typography color="textSecondary">
              Detailed tabular views of stock data.
            </Typography>
            {/* Data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reports
            </Typography>
            <Typography color="textSecondary">
              Generate and manage stock reports.
            </Typography>
            {/* Report components would go here */}
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default StockDashboard;
