"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import {
  TrendingUp,
  Assessment,
  Timeline,
  CheckCircle,
  AttachMoney,
  BarChart,
  ShowChart,
} from "@mui/icons-material"
import Header from "../../components/Header"
import Footer from "../../components/Footer"

const SalesTrackingPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBookChatClick = () => {
    navigate("/Contact")
  }

  return (
    <>
      <Header />
      <Box sx={{ pt: "80px" }}>
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            backgroundColor: "#F8F9FA",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated Background Elements */}
          <Box
            sx={{
              position: "absolute",
              top: "10%",
              right: "10%",
              width: { xs: 60, md: 100 },
              height: { xs: 60, md: 100 },
              backgroundColor: "rgba(23, 35, 78, 0.08)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
              "@keyframes float": {
                "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                "50%": { transform: "translateY(-20px) rotate(180deg)" },
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "20%",
              left: "5%",
              width: { xs: 40, md: 80 },
              height: { xs: 40, md: 80 },
              backgroundColor: "rgba(0, 102, 204, 0.06)",
              borderRadius: "30%",
              animation: "float 4s ease-in-out infinite reverse",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "8%",
              width: { xs: 30, md: 60 },
              height: { xs: 30, md: 60 },
              backgroundColor: "rgba(23, 35, 78, 0.06)",
              borderRadius: "50%",
              animation: "float 5s ease-in-out infinite",
            }}
          />

          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#17234E",
                  mb: 3,
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "3.5rem" },
                  lineHeight: 1.1,
                  fontFamily: "Inter, sans-serif",
                  animation: "fadeInUp 0.8s ease-out",
                  "@keyframes fadeInUp": {
                    "0%": { opacity: 0, transform: "translateY(30px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                Real-Time Sales Tracking
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Monitor Performance Instantly
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: "#6B7280",
                  maxWidth: "700px",
                  mx: "auto",
                  lineHeight: 1.7,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                  animation: "fadeInUp 0.8s ease-out 0.2s both",
                }}
              >
                Monitor your venue's performance in real-time, with insights that help you make better decisions on the
                fly.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Main Content Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#17234E",
                    mb: 4,
                    fontSize: { xs: "1.75rem", md: "2.25rem" },
                    lineHeight: 1.2,
                  }}
                >
                  Stop Flying Blind
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 4,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  Our real-time sales tracking gives you minute-by-minute updates on:
                </Typography>
                <List sx={{ mb: 4 }}>
                  <ListItem sx={{ px: 0, alignItems: "flex-start" }}>
                    <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                      <AttachMoney sx={{ color: "#17234E", fontSize: "1.75rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Revenue by hour, day, week, and month"
                      secondary="See exactly when you're making money and when you're not."
                      primaryTypographyProps={{ fontWeight: 600, color: "#17234E", mb: 0.5 }}
                      secondaryTypographyProps={{ color: "#6B7280", lineHeight: 1.6 }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, alignItems: "flex-start" }}>
                    <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                      <BarChart sx={{ color: "#17234E", fontSize: "1.75rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Sales by menu category and item"
                      secondary="Know which dishes are performing well and which ones need attention."
                      primaryTypographyProps={{ fontWeight: 600, color: "#17234E", mb: 0.5 }}
                      secondaryTypographyProps={{ color: "#6B7280", lineHeight: 1.6 }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, alignItems: "flex-start" }}>
                    <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                      <ShowChart sx={{ color: "#17234E", fontSize: "1.75rem" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Comparative analysis"
                      secondary="See how you're doing compared to yesterday, last week, or last year. Context is everything."
                      primaryTypographyProps={{ fontWeight: 600, color: "#17234E", mb: 0.5 }}
                      secondaryTypographyProps={{ color: "#6B7280", lineHeight: 1.6 }}
                    />
                  </ListItem>
                </List>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleBookChatClick}
                  sx={{
                    backgroundColor: "#17234E",
                    color: "white",
                    py: 1.5,
                    px: 4,
                    fontSize: "1rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "#0F1419",
                    },
                  }}
                >
                  Book a Chat →
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  component="img"
                  src="/images/sales tracking.avif"
                  alt="Sales tracking dashboard"
                  sx={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 3,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                  }}
                />
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Benefits Cards Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "#F8F9FA", position: "relative", overflow: "hidden" }}>
          {/* Animated Background Elements */}
          <Box
            sx={{
              position: "absolute",
              top: "15%",
              right: "8%",
              width: { xs: 50, md: 90 },
              height: { xs: 50, md: 90 },
              backgroundColor: "rgba(23, 35, 78, 0.08)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
              "@keyframes float": {
                "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                "50%": { transform: "translateY(-20px) rotate(180deg)" },
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "25%",
              left: "8%",
              width: { xs: 35, md: 70 },
              height: { xs: 35, md: 70 },
              backgroundColor: "rgba(0, 102, 204, 0.06)",
              borderRadius: "30%",
              animation: "float 4s ease-in-out infinite reverse",
            }}
          />

          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    p: 4,
                    height: "100%",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ color: "#FF6B35", mb: 3, display: "flex", justifyContent: "center" }}>
                    <AttachMoney sx={{ fontSize: "3rem" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#17234E",
                      textAlign: "center",
                    }}
                  >
                    Increase Average Check Size
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      mb: 3,
                      textAlign: "center",
                    }}
                  >
                    Our AI identifies opportunities to upsell and cross-sell based on real-time ordering patterns,
                    increasing your average check size by 10-15%.
                  </Typography>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Identify complementary items that increase order value"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Optimize menu item placement based on sales patterns"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    p: 4,
                    height: "100%",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ color: "#4ECDC4", mb: 3, display: "flex", justifyContent: "center" }}>
                    <BarChart sx={{ fontSize: "3rem" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#17234E",
                      textAlign: "center",
                    }}
                  >
                    Optimize Menu Pricing
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      mb: 3,
                      textAlign: "center",
                    }}
                  >
                    See exactly how price changes impact sales volume in real-time. Make data-driven pricing decisions
                    that maximize revenue without alienating customers.
                  </Typography>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Test price elasticity across different menu categories"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Identify optimal price points for maximum profitability"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    p: 4,
                    height: "100%",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ color: "#45B7D1", mb: 3, display: "flex", justifyContent: "center" }}>
                    <ShowChart sx={{ fontSize: "3rem" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#17234E",
                      textAlign: "center",
                    }}
                  >
                    Identify Sales Trends
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      mb: 3,
                      textAlign: "center",
                    }}
                  >
                    Spot emerging trends before your competitors do. Our AI analyzes sales patterns to identify
                    opportunities for targeted promotions and menu adjustments.
                  </Typography>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Detect seasonal patterns to optimize inventory planning"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: "1rem", color: "#10B981" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Identify day-part specific opportunities to increase revenue"
                        primaryTypographyProps={{ fontSize: "0.875rem", color: "#6B7280" }}
                      />
                    </ListItem>
                  </List>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Advanced Features Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#17234E",
                  mb: 3,
                  fontSize: { xs: "2rem", md: "2.5rem" },
                  lineHeight: 1.1,
                }}
              >
                Advanced Sales Analytics Features
              </Typography>
              <Typography
                sx={{
                  color: "#6B7280",
                  maxWidth: "600px",
                  mx: "auto",
                  lineHeight: 1.6,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                }}
              >
                Powerful tools to drive data-informed decisions
              </Typography>
            </Box>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        backgroundColor: "#E3F2FD",
                        borderRadius: 2,
                        p: 2,
                        mr: 3,
                        color: "#17234E",
                      }}
                    >
                      <BarChart sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Menu Category Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Break down sales by category to identify your strongest and weakest menu sections. Optimize your
                        menu mix to focus on high-margin, high-volume items.
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        backgroundColor: "#E8F5E9",
                        borderRadius: 2,
                        p: 2,
                        mr: 3,
                        color: "#17234E",
                      }}
                    >
                      <TrendingUp sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Promotion Impact Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Measure the effectiveness of your promotions and special offers. See exactly how much additional
                        revenue each promotion generates and optimize your marketing strategy.
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        backgroundColor: "#FFF3E0",
                        borderRadius: 2,
                        p: 2,
                        mr: 3,
                        color: "#17234E",
                      }}
                    >
                      <Timeline sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Sales Forecasting
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Our AI predicts future sales based on historical data, seasonal patterns, and external factors
                        like weather and local events. Plan staffing and inventory with confidence.
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        backgroundColor: "#FCE4EC",
                        borderRadius: 2,
                        p: 2,
                        mr: 3,
                        color: "#17234E",
                      }}
                    >
                      <Assessment sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Real-time Alerts
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Receive instant notifications when sales patterns deviate from expectations. Identify and address
                        issues before they impact your bottom line.
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            backgroundColor: "#F8F9FA",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated Background Elements */}
          <Box
            sx={{
              position: "absolute",
              top: "15%",
              right: "8%",
              width: { xs: 50, md: 90 },
              height: { xs: 50, md: 90 },
              backgroundColor: "rgba(23, 35, 78, 0.08)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
              "@keyframes float": {
                "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                "50%": { transform: "translateY(-20px) rotate(180deg)" },
              },
            }}
          />

          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#17234E",
                  mb: 3,
                  fontSize: { xs: "2rem", md: "2.5rem" },
                  lineHeight: 1.1,
                }}
              >
                Ready to transform your sales data into actionable insights?
              </Typography>
              <Typography
                sx={{
                  mb: 6,
                  color: "#6B7280",
                  maxWidth: "600px",
                  mx: "auto",
                  lineHeight: 1.6,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                }}
              >
                Join hundreds of successful restaurants, cafes, and bars using our platform to drive data-informed
                decisions.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleBookChatClick}
                sx={{
                  backgroundColor: "#17234E",
                  color: "white",
                  py: 1.5,
                  px: 4,
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: 2,
                  "&:hover": {
                    backgroundColor: "#0F1419",
                  },
                }}
              >
                Book a Consultation Today
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default SalesTrackingPage
