"use client";

import type React from "react";
import { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DataHeader from "../../../frontend/components/reusable/DataHeader";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const UsagePage: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(), // today
  });
  const [searchTerm, setSearchTerm] = useState("");

  // DataHeader state
  const [sortBy, setSortBy] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Define sort options for DataHeader
  const sortOptions = [
    { value: "date", label: "Date" },
    { value: "sales", label: "Sales" },
  ];

  // Handle sort change from DataHeader
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortBy(field);
    setSortDirection(direction);
  };

  // Handle export from DataHeader
  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting usage analytics as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  // Sample data - in a real app, this would come from your database
  const salesData = [
    { date: "2023-06-01", sales: 1200 },
    { date: "2023-06-02", sales: 1900 },
    { date: "2023-06-03", sales: 800 },
    { date: "2023-06-04", sales: 1600 },
    { date: "2023-06-05", sales: 2000 },
    { date: "2023-06-06", sales: 1500 },
    { date: "2023-06-07", sales: 1800 },
  ];

  const categoryData = [
    { name: "Food", value: 4000 },
    { name: "Drinks", value: 3000 },
    { name: "Desserts", value: 2000 },
    { name: "Specials", value: 1000 },
  ];

  const paymentData = [
    { name: "Cash", value: 3500 },
    { name: "Credit Card", value: 5500 },
    { name: "Mobile Pay", value: 1000 },
  ];

  // Brand rules: navy/off-white for brand; keep semantic status colors.
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.primary.main,
  ];

  // Filter data based on date range
  const filteredSalesData = salesData.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= dateRange.start && itemDate <= dateRange.end;
  });

  // Calculate totals
  const totalSales = filteredSalesData.reduce(
    (sum, item) => sum + item.sales,
    0
  );
  const totalTransactions = 245; // Sample data
  const averageTransaction = totalSales / totalTransactions;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <DataHeader
        title="POS Usage Analytics"
        showDateControls={true}
        dateType="custom"
        customStartDate={dateRange.start}
        customEndDate={dateRange.end}
        onCustomDateRangeChange={(start, end) => setDateRange({ start, end })}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by product, category, or payment method..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        additionalButtons={[
          {
            label: "Back",
            icon: <ArrowBackIcon />,
            onClick: () => navigate("/POS"),
            variant: "outlined" as const,
          },
        ]}
      />

      <Paper sx={{ p: 3, mb: 3, mt: 3 }}>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Sales
                </Typography>
                <Typography variant="h4" component="div">
                  ${totalSales.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  For selected period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Transactions
                </Typography>
                <Typography variant="h4" component="div">
                  {totalTransactions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total orders processed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Average Order
                </Typography>
                <Typography variant="h4" component="div">
                  ${averageTransaction.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Per transaction
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Daily Sales
            </Typography>
            <Paper sx={{ p: 2, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredSalesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, "Sales"]} />
                  <Legend />
                  <Bar dataKey="sales" fill={theme.palette.primary.main} name="Sales ($)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Sales by Category
            </Typography>
            <Paper sx={{ p: 2, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                     outerRadius={80}
                     fill={theme.palette.primary.main}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, "Sales"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Payment Methods
            </Typography>
            <Paper sx={{ p: 2, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                     outerRadius={80}
                     fill={theme.palette.primary.main}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {paymentData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, "Sales"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default UsagePage;
