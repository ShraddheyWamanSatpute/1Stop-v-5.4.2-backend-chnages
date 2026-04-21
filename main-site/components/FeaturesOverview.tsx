"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Box, Typography, Container, Card, CardContent, IconButton } from "@mui/material"
import {
  Analytics,
  Restaurant,
  Inventory,
  People,
  TrendingUp,
  Schedule,
  Assessment,
  MonetizationOn,
  ArrowBackIos,
  ArrowForwardIos,
} from "@mui/icons-material"

const FeaturesOverview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const features = [
    {
      icon: <Analytics sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "AI-Powered Analytics",
      description:
        "Transform your data into actionable insights with advanced analytics that predict trends and optimize operations.",
      benefits: ["Predictive insights", "Real-time data", "Custom dashboards"],
      color: "#E8F4FD",
    },
    {
      icon: <Restaurant sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Menu Optimization",
      description: "Optimize your menu for profitability and customer satisfaction using data-driven recommendations.",
      benefits: ["Menu engineering", "Price optimization", "Profit analysis"],
      color: "#F0F9FF",
    },
    {
      icon: <Inventory sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Smart Inventory",
      description: "Reduce waste and optimize inventory with predictive ordering and automated stock management.",
      benefits: ["Waste reduction", "Auto-ordering", "Cost tracking"],
      color: "#F0FDF4",
    },
    {
      icon: <People sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Staff Scheduling",
      description: "Schedule the right staff at the right times based on predicted demand and performance metrics.",
      benefits: ["Labor optimization", "Demand forecasting", "Performance tracking"],
      color: "#FEF3F2",
    },
    {
      icon: <TrendingUp sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Sales Forecasting",
      description: "Predict future sales patterns and prepare your venue for peak times and slow periods.",
      benefits: ["Revenue planning", "Demand insights", "Seasonal trends"],
      color: "#FFFBEB",
    },
    {
      icon: <Schedule sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Operations Management",
      description: "Streamline daily operations with automated workflows and intelligent task management.",
      benefits: ["Workflow automation", "Task prioritization", "Efficiency tracking"],
      color: "#F5F3FF",
    },
    {
      icon: <Assessment sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Performance Reports",
      description:
        "Get comprehensive reports on all aspects of your business's performance with actionable recommendations.",
      benefits: ["Custom reports", "KPI tracking", "Benchmarking"],
      color: "#ECFDF5",
    },
    {
      icon: <MonetizationOn sx={{ fontSize: 48, color: "#0066CC" }} />,
      title: "Profit Optimization",
      description:
        "Maximize profitability through intelligent pricing, cost control, and revenue optimization strategies.",
      benefits: ["Margin analysis", "Cost optimization", "Revenue growth"],
      color: "#FDF2F8",
    },
  ]

  const itemsPerView = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  }

  const getItemsPerView = () => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) return itemsPerView.mobile
      if (window.innerWidth < 1024) return itemsPerView.tablet
      return itemsPerView.desktop
    }
    return itemsPerView.desktop
  }

  const [currentItemsPerView, setCurrentItemsPerView] = useState(getItemsPerView())
  const maxIndex = Math.max(0, features.length - currentItemsPerView)

  useEffect(() => {
    const handleResize = () => {
      setCurrentItemsPerView(getItemsPerView())
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || isDragging) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, maxIndex, isDragging])

  const nextSlide = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  const prevSlide = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false)
    setCurrentIndex(Math.min(index, maxIndex))
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  // Touch/Mouse drag handlers
  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
    setScrollLeft(currentIndex)
    setIsAutoPlaying(false)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    const diff = startX - clientX
    const sensitivity = 100
    if (Math.abs(diff) > sensitivity) {
      if (diff > 0 && currentIndex < maxIndex) {
        setCurrentIndex(currentIndex + 1)
        setIsDragging(false)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        setIsDragging(false)
      }
    }
  }

  const handleEnd = () => {
    setIsDragging(false)
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: "white", overflow: "hidden" }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: "#17234E",
              mb: 4,
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
            Everything You Need to
            <br />
            <Box component="span" sx={{ color: "#0066CC" }}>
              Run a Successful Business
            </Box>
          </Typography>
          <Typography
            sx={{
              color: "#6B7280",
              mb: 6,
              lineHeight: 1.6,
              fontSize: { xs: "1rem", md: "1.125rem" },
              maxWidth: "700px",
              mx: "auto",
              animation: "fadeInUp 0.8s ease-out 0.2s both",
            }}
          >
            Our comprehensive platform covers every aspect of hospitality management with intelligent automation and
            insights.
          </Typography>
        </Box>

        {/* Carousel Container */}
        <Box sx={{ position: "relative", mx: { xs: -2, md: 0 }, overflow: "hidden" }}>
          {/* Navigation Buttons - Hidden on mobile */}
          <IconButton
            onClick={prevSlide}
            sx={{
              position: "absolute",
              left: { xs: 8, md: -20 },
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              backgroundColor: "white",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              "&:hover": {
                backgroundColor: "#F9FAFB",
                transform: "translateY(-50%) scale(1.1)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <ArrowBackIos sx={{ color: "#17234E", fontSize: { xs: 18, md: 24 } }} />
          </IconButton>

          <IconButton
            onClick={nextSlide}
            sx={{
              position: "absolute",
              right: { xs: 8, md: -20 },
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              backgroundColor: "white",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              "&:hover": {
                backgroundColor: "#F9FAFB",
                transform: "translateY(-50%) scale(1.1)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <ArrowForwardIos sx={{ color: "#17234E", fontSize: { xs: 18, md: 24 } }} />
          </IconButton>

          {/* Carousel Track */}
          <Box
            ref={carouselRef}
            sx={{
              display: "flex",
              flexDirection: "row !important", // Force horizontal
              flexWrap: "nowrap", // Prevent wrapping
              transform: `translateX(-${currentIndex * (100 / currentItemsPerView)}%)`,
              transition: isDragging ? "none" : "transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              gap: { xs: 2, md: 3 },
              px: { xs: 2, md: 0 },
              cursor: isDragging ? "grabbing" : "grab",
              width: `${features.length * 100}%`, // Full width for all cards
            }}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
          >
            {features.map((feature, index) => (
              <Box
                key={index}
                sx={{
                  flex: "0 0 auto", // Don't grow or shrink
                  width: `${100 / currentItemsPerView}%`, // Explicit width
                  minWidth: `${100 / currentItemsPerView}%`, // Minimum width
                  maxWidth: `${100 / currentItemsPerView}%`, // Maximum width
                  animation: `slideInRight 0.6s ease-out ${index * 0.1}s both`,
                  "@keyframes slideInRight": {
                    "0%": { opacity: 0, transform: "translateX(50px)" },
                    "100%": { opacity: 1, transform: "translateX(0)" },
                  },
                }}
              >
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: { xs: 2, md: 3 },
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-12px) scale(1.02)",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                      borderColor: "#0066CC",
                    },
                    userSelect: "none",
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 }, height: "100%" }}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: { xs: 70, md: 80 },
                        height: { xs: 70, md: 80 },
                        backgroundColor: feature.color,
                        borderRadius: { xs: 2, md: 3 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        mx: "auto",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "rotate(5deg) scale(1.1)",
                        },
                      }}
                    >
                      {feature.icon}
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        color: "#17234E",
                        textAlign: "center",
                        fontSize: { xs: "1.25rem", md: "1.5rem" },
                      }}
                    >
                      {feature.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      sx={{
                        color: "#6B7280",
                        mb: 3,
                        lineHeight: 1.6,
                        textAlign: "center",
                        fontSize: { xs: "0.875rem", md: "0.9375rem" },
                      }}
                    >
                      {feature.description}
                    </Typography>

                    {/* Benefits */}
                    <Box sx={{ mt: "auto" }}>
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <Box
                          key={benefitIndex}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1,
                            justifyContent: "center",
                            animation: `fadeIn 0.5s ease-out ${benefitIndex * 0.1 + 0.5}s both`,
                            "@keyframes fadeIn": {
                              "0%": { opacity: 0 },
                              "100%": { opacity: 1 },
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              backgroundColor: "#0066CC",
                              borderRadius: "50%",
                              mr: 2,
                              animation: "pulse 2s infinite",
                              "@keyframes pulse": {
                                "0%, 100%": { opacity: 1 },
                                "50%": { opacity: 0.5 },
                              },
                            }}
                          />
                          <Typography
                            sx={{
                              color: "#374151",
                              fontSize: { xs: "0.8125rem", md: "0.875rem" },
                              fontWeight: 500,
                            }}
                          >
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Dots Indicator */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 4, md: 6 }, gap: 1 }}>
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <Box
              key={index}
              onClick={() => goToSlide(index)}
              sx={{
                width: { xs: 8, md: 12 },
                height: { xs: 8, md: 12 },
                borderRadius: "50%",
                backgroundColor: currentIndex === index ? "#0066CC" : "#E5E7EB",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: currentIndex === index ? "#0052A3" : "#D1D5DB",
                  transform: "scale(1.3)",
                },
              }}
            />
          ))}
        </Box>

        {/* Mobile Swipe Hint */}
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 3 }}>
          <Typography
            sx={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: "0.875rem",
              animation: "bounce 2s infinite",
              "@keyframes bounce": {
                "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
                "40%": { transform: "translateY(-10px)" },
                "60%": { transform: "translateY(-5px)" },
              },
            }}
          >
            👆 Swipe to explore all features
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default FeaturesOverview
