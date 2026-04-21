"use client"

import { Box, Container, Typography, Grid, Card, Button, Chip } from "@mui/material"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, TrendingDown, Analytics, Restaurant, Inventory, Assessment } from "@mui/icons-material"

const BRAND_NAVY = "#17234E"
const BRAND_BLUE = "#0066CC"

const salesData = [
  { name: "Mon", revenue: 2400, orders: 45, avgOrder: 53 },
  { name: "Tue", revenue: 3200, orders: 58, avgOrder: 55 },
  { name: "Wed", revenue: 4500, orders: 78, avgOrder: 58 },
  { name: "Thu", revenue: 6200, orders: 102, avgOrder: 61 },
  { name: "Fri", revenue: 8500, orders: 135, avgOrder: 63 },
  { name: "Sat", revenue: 9200, orders: 142, avgOrder: 65 },
  { name: "Sun", revenue: 7800, orders: 118, avgOrder: 66 },
]

const insights = [
  {
    icon: <Analytics sx={{ fontSize: 32, color: BRAND_BLUE }} />,
    title: "Predictive Analytics",
    description: "AI forecasts demand patterns to optimize inventory and staffing",
    metric: "95% accuracy",
    trend: "+12%",
  },
  {
    icon: <Restaurant sx={{ fontSize: 32, color: BRAND_BLUE }} />,
    title: "Menu Optimization",
    description: "Identify high-margin items and optimize pricing strategies",
    metric: "32% profit boost",
    trend: "+8%",
  },
  {
    icon: <Inventory sx={{ fontSize: 32, color: BRAND_BLUE }} />,
    title: "Waste Reduction",
    description: "Smart ordering prevents over-purchasing and reduces waste",
    metric: "40% less waste",
    trend: "-15%",
  },
  {
    icon: <Assessment sx={{ fontSize: 32, color: BRAND_BLUE }} />,
    title: "Performance Tracking",
    description: "Real-time insights into staff productivity and customer satisfaction",
    metric: "98% uptime",
    trend: "+25%",
  },
]

const InsightsSection = () => {
  return (
    <Box id="dashboard" sx={{ py: { xs: 6, md: 10 }, backgroundColor: "white" }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: BRAND_NAVY,
              mb: 4,
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3.5rem" },
              lineHeight: 1.1,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Turn Data Into
            <br />
            <Box component="span" sx={{ color: BRAND_BLUE }}>
              Profitable Decisions
            </Box>
          </Typography>
          <Typography
            sx={{
              color: "#6B7280",
              mb: 6,
              lineHeight: 1.6,
              fontSize: { xs: "1rem", md: "1.125rem" },
              maxWidth: "700px",
              mx: "auto",
            }}
          >
            Our AI-powered dashboard transforms complex hospitality data into clear, actionable insights that drive real
            results.
          </Typography>
        </Box>

        {/* Insights Cards */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {insights.map((insight, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  borderRadius: 3,
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    borderColor: BRAND_BLUE,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    backgroundColor: "#F0F4FF",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 3,
                  }}
                >
                  {insight.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: BRAND_NAVY }}>
                  {insight.title}
                </Typography>
                <Typography sx={{ color: "#6B7280", mb: 3, fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {insight.description}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_NAVY }}>
                    {insight.metric}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TrendingUp sx={{ color: "#10B981", fontSize: 16, mr: 0.5 }} />
                    <Typography sx={{ color: "#10B981", fontSize: "0.75rem", fontWeight: 600 }}>
                      {insight.trend}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Dashboard Preview */}
        <Card
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            border: "1px solid #E5E7EB",
          }}
        >
          {/* Dashboard Header */}
          <Box
            sx={{
              backgroundColor: BRAND_NAVY,
              p: 4,
              color: "white",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Hospitality Analytics Dashboard
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 8, height: 8, backgroundColor: "#10B981", borderRadius: "50%" }} />
                <Typography variant="body2">Live Data</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Chip label="Today" sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }} />
              <Chip
                label="This Week"
                variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,0.3)", color: "white" }}
              />
              <Chip
                label="This Month"
                variant="outlined"
                sx={{ borderColor: "rgba(255,255,255,0.3)", color: "white" }}
              />
            </Box>
          </Box>

          {/* Metrics Row */}
          <Grid container spacing={0}>
            {[
              { label: "Revenue", value: "£24,389", change: "+12.5%", positive: true },
              { label: "Orders", value: "678", change: "+8.2%", positive: true },
              { label: "Avg Order", value: "£36", change: "+4.1%", positive: true },
              { label: "Satisfaction", value: "4.8★", change: "+0.3", positive: true },
            ].map((metric, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box
                  sx={{
                    p: 3,
                    borderRight: index < 3 ? "1px solid #E5E7EB" : "none",
                    borderBottom: { xs: index < 2 ? "1px solid #E5E7EB" : "none", md: "none" },
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: BRAND_NAVY, mb: 1 }}>
                    {metric.value}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {metric.positive ? (
                      <TrendingUp sx={{ color: "#10B981", fontSize: 16, mr: 0.5 }} />
                    ) : (
                      <TrendingDown sx={{ color: "#EF4444", fontSize: 16, mr: 0.5 }} />
                    )}
                    <Typography
                      sx={{
                        color: metric.positive ? "#10B981" : "#EF4444",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {metric.change}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Charts Section */}
          <Box sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: BRAND_NAVY }}>
                  Weekly Revenue Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={BRAND_BLUE}
                      strokeWidth={3}
                      dot={{ fill: BRAND_BLUE, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: BRAND_NAVY }}>
                  Daily Orders
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="orders" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Box>
        </Card>

        {/* CTA Section */}
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: BRAND_NAVY, mb: 3 }}>
            Ready to Transform Your Business Data?
          </Typography>
          <Typography sx={{ color: "#6B7280", mb: 4, fontSize: "1.125rem", maxWidth: "600px", mx: "auto" }}>
            Experience the power of AI-driven hospitality insights and transform your operations today.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              backgroundColor: BRAND_NAVY,
              color: "white",
              px: 6,
              py: 2,
              borderRadius: 3,
              textTransform: "none",
              fontSize: "1.125rem",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(23, 35, 78, 0.3)",
              "&:hover": {
                backgroundColor: "#0F1629",
                transform: "translateY(-2px)",
                boxShadow: "0 12px 32px rgba(23, 35, 78, 0.4)",
              },
              transition: "all 0.3s ease",
            }}
            onClick={() => {
              document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            Apply for Access
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default InsightsSection
