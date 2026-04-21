import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  // TextField, // TODO: Use when implementing text field functionality
  // Button, // TODO: Use when implementing button functionality
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  // Divider, // TODO: Use when implementing divider functionality
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  // DateRange as DateRangeIcon, // TODO: Use when implementing date range functionality
  Group as GroupIcon,
} from '@mui/icons-material';
import { useAnalytics, DateRange, FilterOptions, GroupByOptions, AnalyticsResult, KPIMetrics, ChartData } from '../../../backend/context/AnalyticsContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subMonths } from 'date-fns';
import { SimpleBarChart } from '../reusable/SimpleCharts';
// import { subDays } from 'date-fns'; // TODO: Use when implementing subDays functionality

interface ComprehensiveAnalyticsDashboardProps {
  module: 'stock' | 'hr' | 'bookings' | 'finance' | 'pos';
  title: string;
  availableFields: string[];
  defaultGroupBy?: GroupByOptions;
  onDataExport?: (data: any) => void;
}

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComprehensiveAnalyticsDashboard: React.FC<ComprehensiveAnalyticsDashboardProps> = ({
  module,
  title,
  availableFields,
  defaultGroupBy,
  onDataExport
}) => {
  const analytics = useAnalytics();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [customFilters] = useState<Record<string, any>>({});
  // const [setCustomFilters] = useState<Record<string, any>>({}); // TODO: Use when implementing custom filters
  
  // Group by states
  const [groupBy, setGroupBy] = useState<GroupByOptions>(
    defaultGroupBy || { field: 'createdAt', type: 'date', interval: 'day' }
  );
  
  // Data states
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);
  const [kpis, setKpis] = useState<KPIMetrics[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Get the appropriate analytics function based on module
  const getAnalyticsFunction = useCallback(() => {
    switch (module) {
      case 'stock':
        return analytics.getStockAnalytics;
      case 'hr':
        return analytics.getHRAnalytics;
      case 'bookings':
        return analytics.getBookingsAnalytics;
      case 'finance':
        return analytics.getFinanceAnalytics;
      case 'pos':
        return analytics.getPOSAnalytics;
      default:
        return analytics.getStockAnalytics;
    }
  }, [module, analytics]);

  const getKPIFunction = useCallback(() => {
    switch (module) {
      case 'stock':
        return analytics.getStockKPIs;
      case 'hr':
        return analytics.getHRKPIs;
      case 'bookings':
        return analytics.getBookingsKPIs;
      case 'finance':
        return analytics.getFinanceKPIs;
      case 'pos':
        return analytics.getPOSKPIs;
      default:
        return analytics.getStockKPIs;
    }
  }, [module, analytics]);

  const getChartDataFunction = useCallback(() => {
    switch (module) {
      case 'stock':
        return analytics.getStockChartData;
      case 'hr':
        return analytics.getHRChartData;
      case 'bookings':
        return analytics.getBookingsChartData;
      case 'finance':
        return analytics.getFinanceChartData;
      case 'pos':
        return analytics.getPOSChartData;
      default:
        return analytics.getStockChartData;
    }
  }, [module, analytics]);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: FilterOptions = {
        dateRange,
        ...(selectedFields.length > 0 && { customFilters: { fields: selectedFields } }),
        ...customFilters
      };

      const [analyticsResult, kpis, chartData] = await Promise.all([
        getAnalyticsFunction()(groupBy, filters),
        getKPIFunction()(),
        getChartDataFunction()(groupBy, 'value')
      ]);

      setAnalyticsResult(analyticsResult);
      setKpis(kpis);
      setChartData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading analytics data');
    } finally {
      setLoading(false);
    }
  }, [module, dateRange, selectedFields, customFilters, groupBy, getAnalyticsFunction, getKPIFunction, getChartDataFunction]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFieldChange = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleGroupByChange = (field: string, type: GroupByOptions['type'], interval?: GroupByOptions['interval']) => {
    setGroupBy({ field, type, interval });
  };

  const handleExportData = () => {
    if (analyticsResult && onDataExport) {
      onDataExport(analyticsResult);
    }
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${value} hours`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'success';
      case 'decrease':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            {title} Analytics
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={loadAnalyticsData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Data">
              <IconButton onClick={handleExportData} disabled={!analyticsResult}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filters & Grouping
            </Typography>
            <Grid container spacing={2}>
              {/* Date Range */}
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={new Date(dateRange.startDate)}
                  onChange={(date) => setDateRange(prev => ({ 
                    ...prev, 
                    startDate: date ? format(date, 'yyyy-MM-dd') : prev.startDate 
                  }))}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={new Date(dateRange.endDate)}
                  onChange={(date) => setDateRange(prev => ({ 
                    ...prev, 
                    endDate: date ? format(date, 'yyyy-MM-dd') : prev.endDate 
                  }))}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>

              {/* Group By */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Group By Field</InputLabel>
                  <Select
                    value={groupBy.field}
                    onChange={(e) => handleGroupByChange(e.target.value, groupBy.type, groupBy.interval)}
                  >
                    {availableFields.map(field => (
                      <MenuItem key={field} value={field}>
                        {field}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Group By Type */}
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Group Type</InputLabel>
                  <Select
                    value={groupBy.type}
                    onChange={(e) => handleGroupByChange(groupBy.field, e.target.value as GroupByOptions['type'], groupBy.interval)}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="category">Category</MenuItem>
                    <MenuItem value="location">Location</MenuItem>
                    <MenuItem value="supplier">Supplier</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Interval (if date grouping) */}
              {groupBy.type === 'date' && (
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Interval</InputLabel>
                    <Select
                      value={groupBy.interval || 'day'}
                      onChange={(e) => handleGroupByChange(groupBy.field, groupBy.type, e.target.value as GroupByOptions['interval'])}
                    >
                      <MenuItem value="day">Day</MenuItem>
                      <MenuItem value="week">Week</MenuItem>
                      <MenuItem value="month">Month</MenuItem>
                      <MenuItem value="quarter">Quarter</MenuItem>
                      <MenuItem value="year">Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Field Selection */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Select Fields to Include:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableFields.map(field => (
                    <Chip
                      key={field}
                      label={field}
                      onClick={() => handleFieldChange(field)}
                      color={selectedFields.includes(field) ? 'primary' : 'default'}
                      variant={selectedFields.includes(field) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="analytics tabs">
            <Tab icon={<TrendingUpIcon />} label="KPIs" />
            <Tab icon={<BarChartIcon />} label="Charts" />
            <Tab icon={<GroupIcon />} label="Data" />
            <Tab icon={<PieChartIcon />} label="Summary" />
          </Tabs>

          {/* KPIs Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={2}>
              {kpis.map((kpi, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h4" component="div">
                        {formatValue(kpi.value, kpi.format)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Chip
                          label={`${kpi.change > 0 ? '+' : ''}${kpi.change}%`}
                          color={getChangeColor(kpi.changeType)}
                          size="small"
                        />
                        <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                          {kpi.trend === 'up' ? '↗' : kpi.trend === 'down' ? '↘' : '→'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Charts Tab */}
          <TabPanel value={activeTab} index={1}>
            {chartData && (
              <Box sx={{ height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  {groupBy.field} Analysis
                </Typography>
                {chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
                  <SimpleBarChart
                    data={chartData.labels.map((label, index) => ({
                      name: label,
                      value: Number(chartData.datasets[0]?.data[index] || 0),
                    }))}
                    color="#1976d2"
                    width={900}
                    height={320}
                  />
                ) : (
                  <Alert severity="info">No chart data available for the selected filters.</Alert>
                )}
              </Box>
            )}
          </TabPanel>

          {/* Data Tab */}
          <TabPanel value={activeTab} index={2}>
            {analyticsResult && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Raw Data ({analyticsResult.data.length} records)
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <pre style={{ fontSize: '12px', margin: 0 }}>
                    {JSON.stringify(analyticsResult.data.slice(0, 10), null, 2)}
                  </pre>
                  {analyticsResult.data.length > 10 && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      ... and {analyticsResult.data.length - 10} more records
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </TabPanel>

          {/* Summary Tab */}
          <TabPanel value={activeTab} index={3}>
            {analyticsResult && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Summary Statistics
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Total:</Typography>
                          <Typography variant="h6">{formatValue(analyticsResult.summary.total, 'currency')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Average:</Typography>
                          <Typography variant="h6">{formatValue(analyticsResult.summary.average, 'currency')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Min:</Typography>
                          <Typography variant="h6">{formatValue(analyticsResult.summary.min, 'currency')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Max:</Typography>
                          <Typography variant="h6">{formatValue(analyticsResult.summary.max, 'currency')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Count:</Typography>
                          <Typography variant="h6">{analyticsResult.summary.count}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Insights
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {analyticsResult.insights.map((insight, index) => (
                          <Typography key={index} variant="body2">
                            • {insight}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ComprehensiveAnalyticsDashboard;
