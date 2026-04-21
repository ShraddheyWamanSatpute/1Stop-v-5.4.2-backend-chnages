"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Box, Typography, Container, Grid, Card, CardContent, Button } from "@mui/material"
import { People, Schedule, Star, TrendingUp, CheckCircle } from "@mui/icons-material"
import Header from "../../components/Header"
import Footer from "../../components/Footer"

const StaffPerformancePage: React.FC = () => {
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
                Staff Performance Metrics
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Optimize Your Team
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
                Turn your team into a well-oiled machine with data-driven insights that motivate, train, and retain your
                best talent.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Main Content Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#17234E",
                    mb: 4,
                    fontSize: { xs: "1.75rem", md: "2.25rem" },
                    lineHeight: 1.2,
                  }}
                >
                  Your Staff, Optimized
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 4,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  Your team is your biggest expense AND your biggest asset. Our staff performance metrics help you:
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Identify top and underperforming staff
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        See who's selling the most, turning tables fastest, and generating the highest tips.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Create healthy competition
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Gamify performance with leaderboards and incentives that motivate your team to excel.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <CheckCircle sx={{ color: "#17234E", fontSize: "1.5rem", mr: 2, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#17234E" }}>
                        Optimize scheduling
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Put your best servers on during peak hours and ensure you're never over or understaffed.
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
              <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
                <Box
                  component="img"
                  src="/images/staff performance.avif"
                  alt="Staff performance dashboard"
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
                    <People sx={{ fontSize: "3rem" }} />
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
                    Reduce Turnover
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
                    Identify which managers have the lowest staff turnover and replicate their leadership style. Reduce
                    turnover costs and maintain consistent service quality.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Track employee satisfaction and engagement metrics
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Identify early warning signs of potential turnover
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
                    Targeted Training
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
                    See exactly where each team member needs improvement. Develop personalized training programs that
                    address specific skill gaps and improve overall performance.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Identify specific skill gaps for each employee
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#17234E", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Track training effectiveness through performance metrics
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
                    Performance Incentives
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
                    Create data-driven bonus structures that reward real results. Implement fair and transparent incentive
                    programs that motivate your entire team.
                  </Typography>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                      <CheckCircle sx={{ color: "#059669", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Design customized incentive programs based on individual strengths
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <CheckCircle sx={{ color: "#059669", fontSize: "1rem", mr: 1.5, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        Track ROI on incentive programs to optimize spending
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
                Advanced Staff Performance Features
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
                Powerful tools to develop and retain top talent
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
                        Performance Dashboards
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Customizable dashboards that provide real-time visibility into individual and team performance.
                        Track key metrics like sales per hour, table turnover, and customer satisfaction.
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
                      <People sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Team Composition Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Identify the optimal mix of experience levels and skill sets for each shift. Create balanced teams
                        that maximize efficiency and provide excellent customer service.
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
                      <Schedule sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Shift Optimization
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        AI-powered scheduling that matches your best staff with your busiest periods. Reduce labor costs
                        while maintaining service quality and employee satisfaction.
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
                      <Star sx={{ fontSize: "2rem" }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#17234E" }}>
                        Labor Cost Optimization
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.6 }}>
                        Balance staffing levels with expected demand to minimize labor costs without sacrificing service
                        quality. Identify opportunities to reduce overtime and improve scheduling efficiency.
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
                Ready to build a high-performing team?
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
                Join hundreds of successful restaurants, cafes, and bars using our platform to develop and retain top
                talent.
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

export default StaffPerformancePage
