"use client"

import { Box, Typography, Button, Container, Grid, Chip } from "@mui/material"
import { useState, useEffect } from "react"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import { Restaurant, TrendingUp, Analytics, Speed } from "@mui/icons-material"

const HeroSection = () => {
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    { icon: <Restaurant />, text: "Smart Menu Management" },
    { icon: <TrendingUp />, text: "Real-time Sales Tracking" },
    { icon: <Analytics />, text: "AI-Powered Analytics" },
    { icon: <Speed />, text: "Instant Insights" },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box
      sx={{
        backgroundColor: "#F8F9FA",
        py: { xs: 4, md: 8 },
        minHeight: { xs: "100vh", md: "calc(100vh - 64px)" },
        display: "flex",
        alignItems: "center",
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
          backgroundColor: "rgba(0, 102, 204, 0.1)",
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
          backgroundColor: "rgba(23, 35, 78, 0.1)",
          borderRadius: "30%",
          animation: "float 4s ease-in-out infinite reverse",
        }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                textAlign: { xs: "center", md: "left" },
                animation: "slideInLeft 0.8s ease-out",
                "@keyframes slideInLeft": {
                  "0%": { opacity: 0, transform: "translateX(-50px)" },
                  "100%": { opacity: 1, transform: "translateX(0)" },
                },
              }}
            >
              <Chip
                label="🚀 Now Live"
                sx={{
                  backgroundColor: "#E3F2FD",
                  color: "#1976D2",
                  fontWeight: 600,
                  fontSize: { xs: "0.8125rem", md: "0.875rem" },
                  mb: { xs: 2, md: 3 },
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.05)" },
                  },
                }}
              />

              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" },
                  fontWeight: 800,
                  mb: { xs: 2, md: 3 },
                  lineHeight: 1.1,
                  color: "#17234E",
                  animation: "fadeInUp 0.8s ease-out 0.2s both",
                  "@keyframes fadeInUp": {
                    "0%": { opacity: 0, transform: "translateY(30px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                Hospitality Management
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Made Simple
                </Box>
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  mb: { xs: 3, md: 4 },
                  color: "#718096",
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  fontWeight: 400,
                  lineHeight: 1.5,
                  animation: "fadeInUp 0.8s ease-out 0.4s both",
                }}
              >
                AI-powered platform designed to help restaurants, cafes, and bars increase profits, reduce waste, and delight customers
                through intelligent automation.
              </Typography>

              {/* Animated Feature Showcase */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                  gap: 2,
                  mb: { xs: 4, md: 5 },
                  minHeight: "60px",
                  animation: "fadeInUp 0.8s ease-out 0.6s both",
                }}
              >
                <Box
                  sx={{
                    color: "#1976D2",
                    transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: "scale(1.2)",
                    animation: "bounce 1s ease-in-out infinite alternate",
                    "@keyframes bounce": {
                      "0%": { transform: "scale(1.2) translateY(0)" },
                      "100%": { transform: "scale(1.2) translateY(-5px)" },
                    },
                  }}
                >
                  {features[currentFeature].icon}
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    color: "#17234E",
                    fontWeight: 600,
                    fontSize: { xs: "0.9375rem", md: "1.1rem" },
                  }}
                >
                  {features[currentFeature].text}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 2, md: 3 },
                  mb: { xs: 4, md: 5 },
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: { xs: "center", md: "flex-start" },
                  animation: "fadeInUp 0.8s ease-out 0.8s both",
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: "#17234E",
                    "&:hover": {
                      backgroundColor: "#2D3748",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 24px rgba(26, 31, 54, 0.3)",
                    },
                    px: { xs: 3, md: 4 },
                    py: { xs: 1.5, md: 2 },
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 600,
                    borderRadius: 2,
                    boxShadow: "0 4px 16px rgba(26, 31, 54, 0.2)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  href="#contact"
                >
                  Apply for Access
                </Button>
                <Button
                  variant="text"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    color: "#17234E",
                    px: { xs: 3, md: 4 },
                    py: { xs: 1.5, md: 2 },
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "rgba(26, 31, 54, 0.05)",
                      transform: "translateX(4px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                  href="#features"
                >
                  See How It Works
                </Button>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  justifyContent: { xs: "center", md: "flex-start" },
                  animation: "fadeInUp 0.8s ease-out 1s both",
                }}
              >
                <Box sx={{ display: "flex", position: "relative" }}>
                  {[1, 2, 3].map((num, index) => (
                    <Box
                      key={num}
                      sx={{
                        width: { xs: 36, md: 40 },
                        height: { xs: 36, md: 40 },
                        borderRadius: "50%",
                        backgroundColor: "#17234E",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: { xs: "0.8125rem", md: "0.9375rem" },
                        fontWeight: 700,
                        marginLeft: index > 0 ? "-12px" : 0,
                        border: "3px solid #F8F9FA",
                        zIndex: 3 - index,
                        animation: `popIn 0.5s ease-out ${1.2 + index * 0.1}s both`,
                        "@keyframes popIn": {
                          "0%": { opacity: 0, transform: "scale(0)" },
                          "100%": { opacity: 1, transform: "scale(1)" },
                        },
                      }}
                    >
                      ✓
                    </Box>
                  ))}
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#718096",
                    fontWeight: 500,
                    fontSize: { xs: "0.875rem", md: "1rem" },
                  }}
                >
                  Join today and transform your business
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: "relative",
                borderRadius: { xs: 2, md: 3 },
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                transform: { xs: "none", md: "rotate(2deg)" },
                animation: "slideInRight 0.8s ease-out 0.4s both",
                "&:hover": {
                  transform: { xs: "scale(1.02)", md: "rotate(0deg) scale(1.02)" },
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                },
                "@keyframes slideInRight": {
                  "0%": { opacity: 0, transform: "translateX(50px) rotate(2deg)" },
                  "100%": { opacity: 1, transform: "translateX(0) rotate(2deg)" },
                },
              }}
            >
              <Box
                component="img"
                src="/images/chef.avif"
                alt="Hospitality management dashboard"
                sx={{
                  width: "100%",
                  height: { xs: "250px", sm: "300px", md: "400px" },
                  objectFit: "cover",
                }}
              />

              {/* Floating Stats Card */}
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: 12, md: 24 },
                  right: { xs: 12, md: 24 },
                  backgroundColor: "white",
                  borderRadius: 2,
                  p: { xs: 1.5, md: 2 },
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  minWidth: { xs: 120, md: 160 },
                  animation: "subtlePulse 3s ease-in-out infinite",
                  "@keyframes subtlePulse": {
                    "0%, 100%": {
                      transform: "scale(1)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    },
                    "50%": {
                      transform: "scale(1.02)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
                    },
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                      animation: "dotPulse 2s infinite",
                      "@keyframes dotPulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.6 },
                      },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: "0.6875rem", md: "0.75rem" },
                      color: "#6B7280",
                      fontWeight: 600,
                    }}
                  >
                    LIVE STATS
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: { xs: "0.9375rem", md: "1.1rem" },
                    fontWeight: 800,
                    mb: 0.5,
                    color: "#1F2937",
                  }}
                >
                  Live Now
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.6875rem", md: "0.75rem" }, color: "#6B7280" }}>
                  Full version available
                </Typography>
              </Box>

              {/* Bottom Notification */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: { xs: 12, md: 24 },
                  left: { xs: 12, md: 24 },
                  backgroundColor: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 2,
                  p: { xs: 1.5, md: 2 },
                  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  maxWidth: { xs: 180, md: 240 },
                  animation: "slideInUp 1s ease-out 1.5s both",
                  "@keyframes slideInUp": {
                    "0%": { opacity: 0, transform: "translateY(20px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "0.75rem", md: "0.8125rem" },
                    fontWeight: 600,
                    color: "#1F2937",
                    mb: 0.5,
                  }}
                >
                  🎯 Smart Insights
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.6875rem", md: "0.75rem" }, color: "#6B7280" }}>
                  AI-powered recommendations ready
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default HeroSection
