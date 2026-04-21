import type React from "react"
import { Box, Typography, Container, Grid, Card, CardContent } from "@mui/material"
import { Analytics, Restaurant, Inventory, People, TrendingUp, Speed } from "@mui/icons-material"
import Footer from "../components/Footer"

const FeaturesPage: React.FC = () => {
  const features = [
    {
      icon: <Analytics sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "AI-Powered Analytics",
      description:
        "Our advanced analytics engine processes your hospitality data to provide actionable insights and recommendations. Understand customer behavior, optimize menu performance, and identify growth opportunities.",
    },
    {
      icon: <Restaurant sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "Menu Optimization",
      description:
        "Analyze which menu items are performing well and which ones aren't. Get AI-driven recommendations on pricing, placement, and promotion to maximize profitability and customer satisfaction.",
    },
    {
      icon: <Inventory sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "Inventory Management",
      description:
        "Reduce waste and optimize your inventory with predictive ordering. Our system learns from your sales patterns to recommend optimal stock levels and alert you when supplies are running low.",
    },
    {
      icon: <People sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "Staff Scheduling",
      description:
        "Schedule the right number of staff at the right times based on predicted customer traffic. Reduce labor costs while maintaining service quality during peak hours.",
    },
    {
      icon: <TrendingUp sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "Revenue Forecasting",
      description:
        "Predict your revenue with remarkable accuracy using our machine learning models. Plan ahead for seasonal changes, special events, and market fluctuations.",
    },
    {
      icon: <Speed sx={{ fontSize: 48, color: "#17234E" }} />,
      title: "Real-time Dashboard",
      description:
        "Monitor your business's performance in real-time with our intuitive dashboard. Get instant alerts and notifications about important metrics and events.",
    },
  ]

  return (
    <Box sx={{ fontFamily: "Inter, sans-serif" }}>
      <Box
        sx={{
          backgroundColor: "#17234E",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: "2.5rem", md: "3rem" } }}>
            Powerful Features
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 4, fontSize: { xs: "1.2rem", md: "1.5rem" } }}>
            Our AI-powered platform offers everything you need to transform your hospitality operations
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600, color: "#17234E" }}>
          Key Features
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.05)",
                  borderRadius: "15px",
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "#17234E" }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#6B7280" }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Footer />
    </Box>
  )
}

export default FeaturesPage
