"use client"

import { Box, Container, Typography, Grid, Card, CardContent, Button, Chip } from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Work, LocationOn, AccessTime, TrendingUp, Favorite, School } from "@mui/icons-material"

const CareersPage = () => {
  const openPositions = [
    {
      title: "Senior Full Stack Developer",
      department: "Engineering",
      location: "Remote (US)",
      type: "Full-time",
      description:
        "We're looking for an experienced full stack developer to help build and scale our hospitality management platform.",
    },
    {
      title: "AI/ML Engineer",
      department: "Engineering",
      location: "Remote (US)",
      type: "Full-time",
      description: "Join our team to develop and improve our AI-powered analytics and recommendation systems.",
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote (US)",
      type: "Full-time",
      description:
        "Help our hospitality business clients get the most out of our platform and ensure they achieve their business goals.",
    },
    {
      title: "Sales Development Representative",
      department: "Sales",
      location: "Remote (US)",
      type: "Full-time",
      description:
        "Generate qualified leads and help restaurants, cafes, and bars understand how our platform can transform their operations.",
    },
    {
      title: "UI/UX Designer",
      department: "Product",
      location: "Remote (US)",
      type: "Full-time",
      description:
        "Create intuitive, beautiful interfaces that make complex data and functionality accessible to hospitality staff.",
    },
  ]

  const benefits = [
    { icon: <Work sx={{ fontSize: "2.5rem" }} />, title: "Competitive Salary", color: "#FF6B35" },
    { icon: <Favorite sx={{ fontSize: "2.5rem" }} />, title: "Health Insurance", color: "#4ECDC4" },
    { icon: <TrendingUp sx={{ fontSize: "2.5rem" }} />, title: "401(k) Matching", color: "#45B7D1" },
    { icon: <AccessTime sx={{ fontSize: "2.5rem" }} />, title: "Unlimited PTO", color: "#96CEB4" },
    { icon: <LocationOn sx={{ fontSize: "2.5rem" }} />, title: "Remote Work", color: "#FFEAA7" },
    { icon: <School sx={{ fontSize: "2.5rem" }} />, title: "Professional Development", color: "#DDA0DD" },
  ]

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
            <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
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
                Join Our Team
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Build the Future of Hospitality
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
                At One-Stop Solutions, we're building technology that's transforming an entire industry. Our team combines
                deep hospitality industry expertise with cutting-edge AI and software development skills.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Why Work With Us Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#17234E",
                    mb: 3,
                    fontSize: { xs: "1.75rem", md: "2.25rem" },
                    lineHeight: 1.2,
                  }}
                >
                  Why Work With Us
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 3,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  We're a remote-first company that values work-life balance, continuous learning, and making a real
                  impact. Our team members enjoy competitive compensation, comprehensive benefits, and the opportunity to
                  grow with a rapidly expanding startup.
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  Join us in revolutionizing how restaurants, cafes, and bars manage their operations with intelligent
                  automation and data-driven insights.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    height: { xs: 300, md: 400 },
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(23, 35, 78, 0.1) 0%, rgba(0, 102, 204, 0.1) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#17234E",
                      fontSize: { xs: "3rem", md: "4rem" },
                      fontWeight: 700,
                      opacity: 0.3,
                    }}
                  >
                    Join Us
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Benefits Section */}
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
                Benefits & Perks
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
                We offer competitive benefits to support your personal and professional growth
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {benefits.map((benefit, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      p: 4,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      borderRadius: 3,
                      border: "1px solid #E5E7EB",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    <Box sx={{ color: benefit.color, mb: 3, display: "flex", justifyContent: "center" }}>
                      {benefit.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#17234E",
                      }}
                    >
                      {benefit.title}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Open Positions Section */}
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
                Open Positions
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
                Explore opportunities to join our growing team
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {openPositions.map((position, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      p: 4,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      borderRadius: 3,
                      border: "1px solid #E5E7EB",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                        borderColor: "#17234E",
                      },
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        color: "#17234E",
                      }}
                    >
                      {position.title}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
                      <Chip
                        label={position.department}
                        size="small"
                        sx={{
                          backgroundColor: "#E3F2FD",
                          color: "#1976D2",
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={position.location}
                        size="small"
                        sx={{
                          backgroundColor: "#F3E5F5",
                          color: "#7B1FA2",
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={position.type}
                        size="small"
                        sx={{
                          backgroundColor: "#E8F5E9",
                          color: "#388E3C",
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6B7280",
                        mb: 3,
                        lineHeight: 1.6,
                      }}
                    >
                      {position.description}
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: "#17234E",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "#0F1419",
                        },
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      Apply Now
                    </Button>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ textAlign: "center", mt: { xs: 6, md: 8 } }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  color: "#17234E",
                  fontWeight: 600,
                }}
              >
                Don't see a position that fits your skills?
              </Typography>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "#17234E",
                  color: "#17234E",
                  px: 4,
                  py: 1.5,
                  "&:hover": {
                    borderColor: "#0F1419",
                    backgroundColor: "rgba(23, 35, 78, 0.05)",
                  },
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Send us your resume
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default CareersPage
