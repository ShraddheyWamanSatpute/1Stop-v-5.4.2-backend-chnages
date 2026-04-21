import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp,
  ReceiptLong,
  Person,
  ShoppingCart,
  ShowChart,
  AttachMoney,
  MoreVert,
  Restaurant,
  LocalBar,
  FastfoodOutlined,
  LocalCafe,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import LocationPlaceholder from "../../components/common/LocationPlaceholder";

import { ViewPermission } from "../../components/company/PermissionFilter";
import { usePOSReportContext } from "../../../backend/context/AnalyticsContext";
import { Sale } from "../../../backend/interfaces/POS";
import { Product } from "../../../backend/interfaces/POS";
import PerformanceChart from "../../components/reusable/PerformanceChart";
import CategoryChart from "../../components/reusable/CategoryChart";
import AnimatedCounter from "../../components/reusable/AnimatedCounter";
import DataHeader from "../../components/reusable/DataHeader";

const POSDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { companyState, posState, pos } = usePOSReportContext();
  const { refreshBills, refreshCards } = pos;
  // const { getPath } = posState; // Would implement getPath functionality

  // Show location placeholder if no company is selected
  if (!companyState.companyID) {
    return <LocationPlaceholder />
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(true);
  const [dateRange] = useState("last7Days");

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Refresh POS data only when location context changes (NOT when bills change)
  useEffect(() => {
    const fetchData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        setLoading(true)
        await refreshBills()
        await refreshCards()
        setProducts([]) // Would get products from Stock context
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID, refreshBills, refreshCards])

  // Derive sales from bills deterministically; no extra state updates on tab/UI changes
  const sales: Sale[] = useMemo(() => {
    return (posState.bills || []).map((bill: any) => ({
      id: bill.id,
      billId: bill.id,
      productId: bill.items?.[0]?.productId || bill.id,
      productName: bill.items?.[0]?.productName || "Unknown Product",
      quantity: bill.items?.[0]?.quantity || 1,
      unitPrice: bill.items?.[0]?.unitPrice || 0,
      totalPrice: bill.items?.[0]?.totalPrice || bill.total || 0,
      salePrice: bill.items?.[0]?.totalPrice || bill.total || 0,
      measureId: "default",
      paymentMethod: bill.paymentMethod || "cash",
      date: new Date(bill.createdAt || Date.now()).toISOString().split("T")[0],
      time: new Date(bill.createdAt || Date.now()).toTimeString().split(" ")[0],
      terminalId: bill.terminalId || "default",
      tradingDate: new Date(bill.createdAt || Date.now()).toISOString().split("T")[0],
      createdAt: bill.createdAt || Date.now(),
    }))
  }, [posState.bills])

  // Calculate metrics
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalOrders = new Set(sales.map((sale) => sale.billId)).size;
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // Get top selling products
  const productSales = sales.reduce(
    (acc: { [key: string]: { quantity: number; revenue: number } }, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = { quantity: 0, revenue: 0 };
      }
      acc[sale.productId].quantity += sale.quantity;
      acc[sale.productId].revenue += sale.totalPrice;
      return acc;
    },
    {}
  );

  const topSellingProducts = Object.entries(productSales)
    .map(([productId, data]) => {
      const product = products.find((p) => p.id === productId);
      return {
        id: productId,
        name: product?.name || "Unknown Product",
        quantity: data.quantity,
        revenue: data.revenue,
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Prepare data for charts
  const salesPerformanceData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "This Week",
        data: [1200, 1900, 1500, 2000, 2400, 2800, 3200],
        backgroundColor: alpha(themeConfig.brandColors.navy, 0.24),
      },
      {
        label: "Last Week",
        data: [900, 1600, 1400, 1800, 2100, 2500, 2900],
        backgroundColor: theme.palette.secondary.main + "40",
      },
    ],
  };

  // Calculate revenue by category
  const categoriesMap: { [key: string]: number } = {};
  sales.forEach((sale) => {
    const product = products.find((p) => p.id === sale.productId);
    if (product) {
      const category = product.categoryId || "Uncategorized";
      if (!categoriesMap[category]) {
        categoriesMap[category] = 0;
      }
      categoriesMap[category] += sale.totalPrice;
    }
  });

  const categorySalesData = {
    labels:
      Object.keys(categoriesMap).length > 0
        ? Object.keys(categoriesMap)
        : ["No Data"],
    datasets: [
      {
        data:
          Object.keys(categoriesMap).length > 0
            ? Object.values(categoriesMap)
            : [100],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main,
          theme.palette.info.main,
          theme.palette.warning.main,
        ],
      },
    ],
  };

  // DataHeader handlers
  const sortOptions = [
    { value: 'createdAt', label: 'Date' },
    { value: 'totalPrice', label: 'Amount' },
    { value: 'productName', label: 'Product' },
    { value: 'paymentMethod', label: 'Payment Method' }
  ]

  const filteredAndSortedSales = sales
    .filter(sale => 
      sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Sale]
      const bValue = b[sortBy as keyof Sale]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = () => {
    const data = filteredAndSortedSales.map(sale => ({
      'Date': new Date(sale.createdAt).toLocaleDateString(),
      'Product': sale.productName,
      'Quantity': sale.quantity,
      'Unit Price': `$${sale.unitPrice.toFixed(2)}`,
      'Total': `$${sale.totalPrice.toFixed(2)}`,
      'Payment Method': sale.paymentMethod
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pos-sales-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 3, mb: 4 }}>
        <DataHeader
          title="POS Dashboard"
          showDateControls={true}
          dateType="custom"
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search sales..."
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onExportCSV={() => handleExport()}
          onExportPDF={() => handleExport()}
          additionalButtons={[
            {
              label: "Back to POS",
              icon: <ArrowBackIcon />,
              onClick: () => navigate("/POS"),
              variant: 'outlined' as const
            }
          ]}
        />

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <ViewPermission module="pos" page="dashboard">
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Revenue
                      </Typography>
                      <Typography variant="h4" sx={{ my: 1 }}>
                        <AnimatedCounter
                          value={totalRevenue}
                          prefix="$"
                          decimals={2}
                        />
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          color: "success.main",
                        }}
                      >
                        <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />{" "}
                        +5.3% from last week
                      </Typography>
                    </Box>
                    <AttachMoney
                      sx={{
                        fontSize: 48,
                        color: themeConfig.brandColors.navy,
                        opacity: 0.6,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </ViewPermission>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Orders Today
                  </Typography>
                  <ReceiptLong color="primary" />
                </Box>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  <AnimatedCounter
                    value={totalOrders}
                    duration={1500}
                    decimals={0}
                  />
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TrendingUp
                    sx={{ color: "success.main", fontSize: "1rem", mr: 0.5 }}
                  />
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: "medium" }}
                  >
                    +8% from yesterday
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Average Order Value
                  </Typography>
                  <ShoppingCart color="primary" />
                </Box>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  $
                  <AnimatedCounter
                    value={averageOrderValue}
                    duration={1500}
                    decimals={2}
                  />
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TrendingUp
                    sx={{ color: "success.main", fontSize: "1rem", mr: 0.5 }}
                  />
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: "medium" }}
                  >
                    +3.2% from yesterday
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Customers
                  </Typography>
                  <Person color="primary" />
                </Box>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  <AnimatedCounter value={15} duration={1500} decimals={0} />
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TrendingUp
                    sx={{ color: "success.main", fontSize: "1rem", mr: 0.5 }}
                  />
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: "medium" }}
                  >
                    +2 from yesterday
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <ViewPermission module="pos" page="dashboard">
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h6">Sales Performance</Typography>
                  <IconButton size="small">
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ height: 300 }}>
                  <PerformanceChart
                    data={salesPerformanceData}
                    dateRange={dateRange}
                  />
                </Box>
              </Paper>
            </ViewPermission>
          </Grid>

          <Grid item xs={12} md={4}>
            <ViewPermission module="pos" page="dashboard">
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h6">Sales by Category</Typography>
                  <IconButton size="small">
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>
                <Box
                  sx={{ height: 300, display: "flex", justifyContent: "center" }}
                >
                  <CategoryChart data={categorySalesData} dateRange={dateRange} />
                </Box>
              </Paper>
            </ViewPermission>
          </Grid>
        </Grid>

        {/* Bottom Row */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ViewPermission module="pos" page="dashboard">
              <Paper sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Top Selling Items</Typography>
                  <ViewPermission module="pos" page="reports">
                    <Button size="small" endIcon={<ShowChart />}>
                      View All
                    </Button>
                  </ViewPermission>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List disablePadding>
                  {topSellingProducts.map((product, index) => (
                    <ListItem
                      key={product.id}
                      divider={index < topSellingProducts.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {index === 0 && <FastfoodOutlined />}
                        {index === 1 && <LocalBar />}
                        {index === 2 && <LocalCafe />}
                        {index === 3 && <Restaurant />}
                        {index >= 4 && <FastfoodOutlined />}
                      </ListItemIcon>
                      <ListItemText
                        primary={product.name}
                        secondary={`${product.quantity} sold`}
                      />
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ fontWeight: "medium" }}
                      >
                        ${product.revenue.toFixed(2)}
                      </Typography>
                    </ListItem>
                  ))}
                  {topSellingProducts.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary="No products sold yet"
                        secondary="Sales data will appear here"
                        sx={{ color: "text.secondary" }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </ViewPermission>
          </Grid>

          <Grid item xs={12} md={6}>
            <ViewPermission module="pos" page="dashboard">
              <Paper sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Recent Transactions</Typography>
                  <ViewPermission module="pos" page="orders">
                    <Button size="small" endIcon={<ShowChart />}>
                      View All
                    </Button>
                  </ViewPermission>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List disablePadding>
                  {sales.slice(0, 5).map((sale, index) => (
                    <ListItem
                      key={sale.id}
                      divider={index < Math.min(sales.length, 5) - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemText
                        primary={`Order #${sale.billId}`}
                        secondary={new Date(sale.createdAt).toLocaleString()}
                      />
                      <Box>
                        <Typography
                          variant="body2"
                          align="right"
                          sx={{ fontWeight: "medium" }}
                        >
                          ${sale.totalPrice.toFixed(2)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          align="right"
                          display="block"
                        >
                          {sale.paymentMethod}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                  {sales.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary="No recent transactions"
                        secondary="Transaction data will appear here"
                        sx={{ color: "text.secondary" }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </ViewPermission>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default POSDashboard;
