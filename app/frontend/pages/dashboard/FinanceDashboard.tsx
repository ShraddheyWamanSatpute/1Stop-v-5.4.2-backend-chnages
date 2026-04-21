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
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
// import { useDashboard } from '../../../backend/context/DashboardContext'; // TODO: Use when implementing dashboard functionality
import { useFinanceReportContext } from '../../../backend/context/AnalyticsContext';
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
      id={`finance-dashboard-tabpanel-${index}`}
      aria-labelledby={`finance-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const FinanceDashboard: React.FC = () => {
  const { finance: financeContext, financeState, companyState } = useFinanceReportContext()
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
      // Refresh all finance data using FinanceContext
      await financeContext.refreshTransactions();
      await financeContext.refreshInvoices();
      await financeContext.refreshExpenses();
      console.log("Finance data refreshed successfully");
      console.log("Refresh budgets");
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleDataExport = () => {
    const dataStr = JSON.stringify(financeState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check if we have the required company context
  if (!companyState.companyID) {
    return <LocationPlaceholder />;
  }

  const totalRevenue = financeState.transactions
    .filter(t => t.type === 'payment') // TODO: Fix transaction type comparison
    .reduce((sum, t) => sum + (t as any).amount, 0);

  const totalExpenses = financeState.expenses
    .reduce((sum, e) => sum + e.amount, 0);

  const profit = totalRevenue - totalExpenses;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Finance Management Dashboard
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
                Total Revenue
              </Typography>
              <Typography variant="h4" color="success.main">
                ${totalRevenue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4" color="error.main">
                ${totalExpenses.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Net Profit
              </Typography>
              <Typography variant="h4" color={profit >= 0 ? 'success.main' : 'error.main'}>
                ${profit.toLocaleString()}
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
                {financeState.transactions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Dashboard Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="finance dashboard tabs">
          <Tab icon={<AccountBalanceIcon />} label="Dashboard" />
          <Tab icon={<TrendingUpIcon />} label="Analytics" />
          <Tab icon={<BarChartIcon />} label="Charts" />
          <Tab icon={<TableChartIcon />} label="Data Tables" />
          <Tab icon={<AssessmentIcon />} label="Reports" />
        </Tabs>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <CustomizableDashboard
            module="finance"
            title="Finance"
            dateRange={dateRange}
            frequency={frequency}
            onLayoutChange={(layout) => console.log('Layout changed:', layout)}
          />
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Finance Analytics
            </Typography>
            <Typography color="textSecondary">
              Advanced analytics and insights for financial management.
            </Typography>
            {/* Finance analytics components would go here */}
          </Box>
        </TabPanel>

        {/* Charts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Finance Charts
            </Typography>
            <Typography color="textSecondary">
              Visual representations of financial data and trends.
            </Typography>
            {/* Finance chart components would go here */}
          </Box>
        </TabPanel>

        {/* Data Tables Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Finance Data Tables
            </Typography>
            <Typography color="textSecondary">
              Detailed tabular views of financial data.
            </Typography>
            {/* Finance data table components would go here */}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={activeTab} index={4}>
          <ReportGenerator
            module="finance"
            title="Finance"
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default FinanceDashboard;
