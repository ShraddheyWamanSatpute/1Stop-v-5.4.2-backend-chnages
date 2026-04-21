import type React from "react"
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
} from "@mui/material"
import { People, AttachMoney, Star, Favorite, LocalDining } from "@mui/icons-material"

const CustomerInsightsPage: React.FC = () => {
  // Mock data for customer insights
  const customerMetrics = [
    {
      title: "Total Customers",
      value: "2,847",
      change: "+12.5%",
      icon: <People sx={{ fontSize: 40, color: "#1976d2" }} />,
      color: "#1976d2",
    },
    {
      title: "Average Order Value",
      value: "$34.50",
      change: "+8.2%",
      icon: <AttachMoney sx={{ fontSize: 40, color: "#2e7d32" }} />,
      color: "#2e7d32",
    },
    {
      title: "Customer Satisfaction",
      value: "4.6/5",
      change: "+0.3",
      icon: <Star sx={{ fontSize: 40, color: "#f57c00" }} />,
      color: "#f57c00",
    },
    {
      title: "Repeat Customers",
      value: "68%",
      change: "+5.1%",
      icon: <Favorite sx={{ fontSize: 40, color: "#d32f2f" }} />,
      color: "#d32f2f",
    },
  ]

  const topCustomers = [
    {
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      orders: 47,
      totalSpent: "$1,620",
      lastVisit: "2 days ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      name: "Michael Chen",
      email: "m.chen@email.com",
      orders: 39,
      totalSpent: "$1,340",
      lastVisit: "1 week ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      name: "Emily Rodriguez",
      email: "emily.r@email.com",
      orders: 35,
      totalSpent: "$1,205",
      lastVisit: "3 days ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      name: "David Wilson",
      email: "d.wilson@email.com",
      orders: 32,
      totalSpent: "$1,100",
      lastVisit: "5 days ago",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const popularItems = [
    { name: "Grilled Salmon", orders: 342, revenue: "$6,840", rating: 4.8 },
    { name: "Caesar Salad", orders: 298, revenue: "$4,470", rating: 4.6 },
    { name: "Beef Burger", orders: 276, revenue: "$4,140", rating: 4.7 },
    { name: "Pasta Carbonara", orders: 234, revenue: "$4,680", rating: 4.5 },
    { name: "Chicken Wings", orders: 198, revenue: "$2,970", rating: 4.4 },
  ]

  const customerDemographics = [
    { ageGroup: "18-25", percentage: 22, count: 626 },
    { ageGroup: "26-35", percentage: 35, count: 996 },
    { ageGroup: "36-45", percentage: 28, count: 797 },
    { ageGroup: "46-55", percentage: 12, count: 341 },
    { ageGroup: "55+", percentage: 3, count: 87 },
  ]

  const recentReviews = [
    {
      customer: "Jennifer Adams",
      rating: 5,
      comment: "Amazing food and excellent service! The salmon was perfectly cooked.",
      date: "2 hours ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      customer: "Robert Taylor",
      rating: 4,
      comment: "Great atmosphere and delicious food. Will definitely come back!",
      date: "1 day ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      customer: "Lisa Brown",
      rating: 5,
      comment: "Best restaurant in town! The staff is incredibly friendly.",
      date: "2 days ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  ]

  return (
    <Box sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh", pt: 10 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: "#17234E", mb: 1 }}>
            Customer Insights
          </Typography>
          <Typography variant="h6" sx={{ color: "#666", mb: 3 }}>
            Understand your customers better with detailed analytics and insights
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {customerMetrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: "100%", borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    {metric.icon}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: "#17234E" }}>
                        {metric.value}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        {metric.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={metric.change}
                    size="small"
                    sx={{
                      backgroundColor: metric.change.startsWith("+") ? "#e8f5e8" : "#ffebee",
                      color: metric.change.startsWith("+") ? "#2e7d32" : "#d32f2f",
                      fontWeight: 600,
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Top Customers */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: "#17234E" }}>
                  Top Customers
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell align="center">Orders</TableCell>
                        <TableCell align="center">Total Spent</TableCell>
                        <TableCell align="center">Last Visit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCustomers.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Avatar src={customer.avatar} sx={{ mr: 2 }} />
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {customer.name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#666" }}>
                                  {customer.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {customer.orders}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                              {customer.totalSpent}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ color: "#666" }}>
                              {customer.lastVisit}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Customer Demographics */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: "#17234E" }}>
                  Customer Demographics
                </Typography>
                {customerDemographics.map((demo, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {demo.ageGroup}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        {demo.count} ({demo.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={demo.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#e0e0e0",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#1976d2",
                        },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Popular Items */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: "#17234E" }}>
                  Most Popular Items
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="center">Orders</TableCell>
                        <TableCell align="center">Revenue</TableCell>
                        <TableCell align="center">Rating</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <LocalDining sx={{ mr: 2, color: "#1976d2" }} />
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {item.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {item.orders}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                              {item.revenue}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Rating value={item.rating} readOnly size="small" precision={0.1} />
                              <Typography variant="body2" sx={{ ml: 1, color: "#666" }}>
                                {item.rating}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Reviews */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: "#17234E" }}>
                  Recent Reviews
                </Typography>
                {recentReviews.map((review, index) => (
                  <Box
                    key={index}
                    sx={{ mb: 3, pb: 2, borderBottom: index < recentReviews.length - 1 ? "1px solid #e0e0e0" : "none" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Avatar src={review.avatar} sx={{ width: 32, height: 32, mr: 2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {review.customer}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#666" }}>
                          {review.date}
                        </Typography>
                      </Box>
                      <Rating value={review.rating} readOnly size="small" />
                    </Box>
                    <Typography variant="body2" sx={{ color: "#666", fontStyle: "italic" }}>
                      "{review.comment}"
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default CustomerInsightsPage
