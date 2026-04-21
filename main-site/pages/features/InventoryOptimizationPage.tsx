"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Box, Typography, Container, Grid, Card, CardContent, Button } from "@mui/material"
import { Inventory, TrendingDown, Assessment, CheckCircle, Schedule, TrendingUp } from "@mui/icons-material"
import Header from "../../components/Header"
import Footer from "../../components/Footer"

const InventoryOptimizationPage: React.FC = () => {
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
                Inventory Optimization
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Reduce Waste, Maximize Profit
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
                Our AI-powered inventory system predicts exactly what you need, when you need it, reducing waste and
                maximizing profitability.
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
                  The Secret Ingredient: Predictive Analytics
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 4,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  Food waste isn't just bad for the planet—it's detrimental to your bottom line. Our inventory
                  optimization system uses AI to:
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Predict demand with exceptional accuracy
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Know exactly how many of each menu item you'll sell, even accounting for weather and local events.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Optimize order quantities
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Generate precise order lists that ensure you never run out of popular items or over-order
                        perishables.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Reduce waste dramatically
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Our customers typically reduce food waste by 30-40%, translating to thousands in savings monthly.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant="contained"
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
                  src="/images/inventory optimisation.avif"
                  alt="Inventory optimization dashboard"
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

        {/* Feature Cards Section */}
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
                    <Schedule sx={{ fontSize: "3rem" }} />
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
                    Just-in-Time Ordering
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      mb: 3,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Our system knows exactly when you'll need each ingredient, ensuring maximum freshness without
                    emergency runs to the store. Optimize your inventory levels for peak quality.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Reduce inventory holding costs by 15-20%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Minimize emergency ordering and associated premium costs
                      </Typography>
                    </Box>
                  </Box>
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
                    <TrendingDown sx={{ fontSize: "3rem" }} />
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
                    Vendor Price Comparison
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      mb: 3,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Automatically compare prices across vendors and identify the best deals. Optimize your purchasing
                    strategy to minimize costs while maintaining quality.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Save 5-10% on ingredient costs through strategic purchasing
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Identify alternative suppliers for critical ingredients
                      </Typography>
                    </Box>
                  </Box>
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
                  <Box sx={{ color: "#96CEB4", mb: 3, display: "flex", justifyContent: "center" }}>
                    <TrendingUp sx={{ fontSize: "3rem" }} />
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
                    Waste Tracking Analytics
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#6B7280",
                      mb: 3,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Track exactly what's getting thrown out and why. Identify the root causes of waste and implement
                    targeted solutions to minimize it permanently.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#059669", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Categorize waste by type to identify specific problem areas
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#059669", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Track waste reduction progress over time with detailed analytics
                      </Typography>
                    </Box>
                  </Box>
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
                Advanced Inventory Management Features
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
                Powerful tools to reduce waste and maximize profits
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
                      <TrendingUp sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Ingredient Usage Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Track how each ingredient is used across your menu. Identify opportunities to streamline your
                        inventory by using versatile ingredients across multiple dishes.
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
                      <Schedule sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Seasonal Forecasting
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Anticipate seasonal fluctuations in demand and ingredient availability. Plan your menu and inventory
                        strategy to capitalize on seasonal opportunities.
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
                      <Inventory sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Automated Ordering
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Set up automatic purchase orders based on inventory levels and projected demand. Reduce the time
                        spent on manual ordering and eliminate human error.
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
                        Cost Control Analytics
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Track food costs as a percentage of sales in real-time. Identify cost spikes immediately and take
                        corrective action before they impact your profitability.
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Final CTA Section */}
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
                Ready to optimize your inventory management?
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
                Join hundreds of successful restaurants, cafes, and bars using our platform to reduce waste and maximize
                profits.
              </Typography>
              <Button
                variant="contained"
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

export default InventoryOptimizationPage
