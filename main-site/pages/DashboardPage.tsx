import type React from "react"
import { Box, Typography, Container, Grid, Card, CardContent, Button } from "@mui/material"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts"
import Footer from "../components/Footer"

const DashboardPage: React.FC = () => {
  const salesData = [
    { name: "Jan", value: 4000 },
    { name: "Feb", value: 3000 },
    { name: "Mar", value: 5000 },
    { name: "Apr", value: 4500 },
    { name: "May", value: 6000 },
    { name: "Jun", value: 5500 },
  ]

  const categoryData = [
    { name: "Appetizers", value: 30, color: "#0088FE" },
    { name: "Main Course", value: 45, color: "#00C49F" },
    { name: "Desserts", value: 15, color: "#FFBB28" },
    { name: "Beverages", value: 10, color: "#FF8042" },
  ]

  const staffData = [
    { name: "Mon", hours: 45 },
    { name: "Tue", hours: 38 },
    { name: "Wed", hours: 42 },
    { name: "Thu", hours: 40 },
    { name: "Fri", hours: 52 },
    { name: "Sat", hours: 55 },
    { name: "Sun", hours: 50 },
  ]

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: "#17234E",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
            Interactive Dashboard
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
            Experience the power of our AI-driven analytics platform
          </Typography>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "white",
              color: "#17234E",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
              px: 4,
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
            }}
          >
            Apply for Access
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          Sample Dashboard
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Monthly Revenue
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3F51B5" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Staff Hours
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={staffData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="hours" stroke="#3F51B5" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Sales by Category
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Key Metrics
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
                      Average Order Value
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      $42.50
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
                      Customer Retention
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      68%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
                      Food Cost Percentage
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      28%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280", mb: 1 }}>
                      Table Turnover Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      1.8x
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Footer />
    </Box>
  )
}

export default DashboardPage
