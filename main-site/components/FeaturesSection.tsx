import type React from "react"
import { Link } from "react-router-dom"
import { Box, Typography, Container, Grid, Card, CardContent, Button } from "@mui/material"
import { TrendingUp, People, Inventory, Analytics, Restaurant, Speed } from "@mui/icons-material"

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <TrendingUp sx={{ fontSize: "3rem" }} />,
      title: "Sales Tracking & Analytics",
      description:
        "Monitor real-time sales performance, identify trends, and optimize revenue streams with advanced analytics.",
      link: "/Features/SalesTracking",
      color: "#FF6B35",
    },
    {
      icon: <People sx={{ fontSize: "3rem" }} />,
      title: "Staff Performance Management",
      description:
        "Track employee productivity, optimize scheduling, and improve service quality with AI-driven insights.",
      link: "/Features/StaffPerformance",
      color: "#4ECDC4",
    },
    {
      icon: <Inventory sx={{ fontSize: "3rem" }} />,
      title: "Inventory Optimization",
      description: "Reduce waste, prevent stockouts, and optimize purchasing with predictive inventory management.",
      link: "/Features/InventoryOptimization",
      color: "#45B7D1",
    },
    {
      icon: <Analytics sx={{ fontSize: "3rem" }} />,
      title: "Predictive Analytics",
      description: "Forecast demand, predict busy periods, and make data-driven decisions for better planning.",
      link: "#",
      color: "#96CEB4",
    },
    {
      icon: <Restaurant sx={{ fontSize: "3rem" }} />,
      title: "Menu Optimization",
      description:
        "Analyze dish performance, optimize pricing, and enhance menu profitability with AI recommendations.",
      link: "#",
      color: "#FFEAA7",
    },
    {
      icon: <Speed sx={{ fontSize: "3rem" }} />,
      title: "Real-time Monitoring",
      description: "Get instant alerts, monitor KPIs in real-time, and respond quickly to operational changes.",
      link: "#",
      color: "#DDA0DD",
    },
  ]

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "background.paper" }}>
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
            Powerful Features for Modern Hospitality
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
            Discover how our AI-powered platform transforms every aspect of your hospitality operations
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                  },
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ p: 4, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Box
                    sx={{
                      color: feature.color,
                      mb: 3,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      textAlign: "center",
                      color: "primary.main",
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "text.secondary",
                      textAlign: "center",
                      mb: 3,
                      flexGrow: 1,
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                  {feature.link !== "#" && (
                    <Button
                      component={Link}
                      to={feature.link}
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: feature.color,
                        color: feature.color,
                        "&:hover": {
                          backgroundColor: feature.color,
                          color: "white",
                        },
                      }}
                    >
                      Learn More
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default FeaturesSection
