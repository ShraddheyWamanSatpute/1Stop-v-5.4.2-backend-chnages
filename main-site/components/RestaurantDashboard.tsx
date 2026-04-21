import type React from "react"
import { Box, Typography, Container, Grid, Card, CardContent, LinearProgress } from "@mui/material"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

const RestaurantDashboard: React.FC = () => {
  const salesData = [
    { name: "Mon", sales: 4000, orders: 24 },
    { name: "Tue", sales: 3000, orders: 18 },
    { name: "Wed", sales: 5000, orders: 32 },
    { name: "Thu", sales: 4500, orders: 28 },
    { name: "Fri", sales: 6000, orders: 38 },
    { name: "Sat", sales: 8000, orders: 52 },
    { name: "Sun", sales: 7000, orders: 45 },
  ]

  const topDishes = [
    { name: "Margherita Pizza", orders: 45, revenue: 675 },
    { name: "Caesar Salad", orders: 32, revenue: 384 },
    { name: "Grilled Salmon", orders: 28, revenue: 560 },
    { name: "Pasta Carbonara", orders: 25, revenue: 375 },
  ]

  const metrics = [
    { title: "Daily Revenue", value: "$8,450", change: "+12%", color: "#4CAF50" },
    { title: "Orders Today", value: "156", change: "+8%", color: "#2196F3" },
    { title: "Avg Order Value", value: "$54.17", change: "+5%", color: "#FF9800" },
    { title: "Customer Satisfaction", value: "4.8/5", change: "+0.2", color: "#9C27B0" },
  ]

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 700,
              mb: 2,
              color: "primary.main",
            }}
          >
            Real-Time Restaurant Analytics
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              maxWidth: "600px",
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            See how our dashboard provides instant insights into your restaurant's performance
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ textAlign: "center", p: 2 }}>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: metric.color, mb: 1 }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    {metric.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: metric.color, fontWeight: 600 }}>
                    {metric.change}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          {/* Sales Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: { xs: 4, md: 4 }, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Weekly Sales Performance
                </Typography>
                <Box sx={{ height: { xs: 250, md: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="sales" stroke="#17234E" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Dishes */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: { xs: 2, md: 3 }, height: "100%" }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Top Performing Dishes
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {topDishes.map((dish, index) => (
                  <Box key={index}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dish.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        ${dish.revenue}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(dish.orders / 50) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "grey.200",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#17234E",
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {dish.orders} orders
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Orders Chart */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Daily Order Volume
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#FF6B35" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default RestaurantDashboard
