"use client"

import type React from "react"

import { Box, Typography, Container, Card, CardContent, IconButton } from "@mui/material"
import { useState, useEffect } from "react"
import { TrendingUp, People, Inventory, Speed, ArrowBackIos, ArrowForwardIos } from "@mui/icons-material"

const RevolutionSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const features = [
    {
      icon: <TrendingUp sx={{ fontSize: { xs: "2.5rem", md: "3rem" } }} />,
      title: "Boost Sales",
      description: "Increase revenue by 25% with AI-powered insights and smart recommendations.",
      color: "#FF6B35",
      stat: "+25%",
      statLabel: "Revenue Growth",
    },
    {
      icon: <People sx={{ fontSize: { xs: "2.5rem", md: "3rem" } }} />,
      title: "Happy Staff",
      description: "Optimize schedules and track performance to keep your team motivated.",
      color: "#4ECDC4",
      stat: "90%",
      statLabel: "Staff Satisfaction",
    },
    {
      icon: <Inventory sx={{ fontSize: { xs: "2.5rem", md: "3rem" } }} />,
      title: "Zero Waste",
      description: "Reduce food waste by 40% with predictive inventory management.",
      color: "#45B7D1",
      stat: "-40%",
      statLabel: "Food Waste",
    },
    {
      icon: <Speed sx={{ fontSize: { xs: "2.5rem", md: "3rem" } }} />,
      title: "Real-time Data",
      description: "Get instant insights on everything happening in your venue.",
      color: "#96CEB4",
      stat: "24/7",
      statLabel: "Live Monitoring",
    },
  ]

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, features.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }

  const nextSlide = () => {
    const newIndex = (currentIndex + 1) % features.length
    goToSlide(newIndex)
  }

  const prevSlide = () => {
    const newIndex = currentIndex === 0 ? features.length - 1 : currentIndex - 1
    goToSlide(newIndex)
  }

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }
  }

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white", overflow: "hidden" }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 800,
              mb: 2,
              color: "#17234E",
              "@keyframes fadeInUp": {
                from: {
                  opacity: 0,
                  transform: "translateY(30px)",
                },
                to: {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
              animation: "fadeInUp 0.8s ease-out",
            }}
          >
            Everything You Need to
            <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
              Run a Successful Business
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "#718096",
              maxWidth: "600px",
              mx: "auto",
              lineHeight: 1.6,
              fontSize: { xs: "1rem", md: "1.125rem" },
              "@keyframes fadeInUp": {
                from: {
                  opacity: 0,
                  transform: "translateY(30px)",
                },
                to: {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
              animation: "fadeInUp 0.8s ease-out 0.2s both",
            }}
          >
            Stop juggling spreadsheets and guessing. Get the insights you need to make smart decisions.
          </Typography>
        </Box>

        {/* Mobile Carousel */}
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            position: "relative",
            px: 3,
          }}
        >
          {/* Navigation Arrows */}
          <IconButton
            onClick={prevSlide}
            sx={{
              position: "absolute",
              left: -5,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              backgroundColor: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              width: 35,
              height: 35,
              "&:hover": {
                backgroundColor: "#f8f9fa",
                transform: "translateY(-50%) scale(1.1)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <ArrowBackIos sx={{ fontSize: "0.9rem", ml: 0.5 }} />
          </IconButton>

          <IconButton
            onClick={nextSlide}
            sx={{
              position: "absolute",
              right: -5,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              backgroundColor: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              width: 35,
              height: 35,
              "&:hover": {
                backgroundColor: "#f8f9fa",
                transform: "translateY(-50%) scale(1.1)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <ArrowForwardIos sx={{ fontSize: "0.9rem" }} />
          </IconButton>

          {/* Single Card Display */}
          <Box
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
              width: "100%",
              maxWidth: "300px",
              mx: "auto",
            }}
          >
            <Card
              sx={{
                height: 320,
                width: "100%",
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                transform: "translateY(-8px) scale(1.02)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                border: `2px solid ${features[currentIndex].color}`,
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-12px) scale(1.03)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
                },
              }}
            >
              <CardContent
                sx={{
                  p: 3,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      color: features[currentIndex].color,
                      mb: 2,
                      display: "flex",
                      justifyContent: "center",
                      transform: "scale(1.1) rotate(5deg)",
                      transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {features[currentIndex].icon}
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#17234E",
                      fontSize: "1.2rem",
                    }}
                  >
                    {features[currentIndex].title}
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "#718096",
                      mb: 2,
                      lineHeight: 1.6,
                      fontSize: "0.9rem",
                    }}
                  >
                    {features[currentIndex].description}
                  </Typography>
                </Box>

                {/* Stat Display */}
                <Box
                  sx={{
                    backgroundColor: `${features[currentIndex].color}15`,
                    borderRadius: 2,
                    p: 2,
                    border: `1px solid ${features[currentIndex].color}30`,
                    transform: "scale(1.05)",
                    transition: "transform 0.3s ease",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: features[currentIndex].color,
                      mb: 0.5,
                      fontSize: "1.5rem",
                    }}
                  >
                    {features[currentIndex].stat}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#718096",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "none",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {features[currentIndex].statLabel}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Desktop Grid */}
        <Box
          sx={{
            display: { xs: "none", md: "grid" },
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
          }}
        >
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                height: 380,
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                transform: currentIndex === index ? "translateY(-8px) scale(1.02)" : "translateY(0)",
                boxShadow: currentIndex === index ? "0 20px 40px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.08)",
                border: currentIndex === index ? `2px solid ${feature.color}` : "1px solid #E2E8F0",
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-8px) scale(1.02)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                },
              }}
              onClick={() => goToSlide(index)}
            >
              <CardContent
                sx={{
                  p: 4,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Box
                    sx={{
                      color: feature.color,
                      mb: 3,
                      display: "flex",
                      justifyContent: "center",
                      transform: currentIndex === index ? "scale(1.1) rotate(5deg)" : "scale(1)",
                      transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {feature.icon}
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 2,
                      color: "#17234E",
                      fontSize: "1.5rem",
                    }}
                  >
                    {feature.title}
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "#718096",
                      mb: 3,
                      lineHeight: 1.6,
                      fontSize: "1rem",
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    backgroundColor: `${feature.color}15`,
                    borderRadius: 2,
                    p: 2,
                    border: `1px solid ${feature.color}30`,
                    transform: currentIndex === index ? "scale(1.05)" : "scale(1)",
                    transition: "transform 0.3s ease",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: feature.color,
                      mb: 0.5,
                      fontSize: "2rem",
                    }}
                  >
                    {feature.stat}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#718096",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      textTransform: "none",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {feature.statLabel}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Progress Indicators */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 4 }}>
          {features.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: { xs: 8, md: 12 },
                height: { xs: 8, md: 12 },
                borderRadius: "50%",
                backgroundColor: currentIndex === index ? "#1976D2" : "#E2E8F0",
                transition: "all 0.3s ease",
                cursor: "pointer",
                transform: currentIndex === index ? "scale(1.2)" : "scale(1)",
                "&:hover": {
                  backgroundColor: currentIndex === index ? "#1976D2" : "#CBD5E0",
                  transform: "scale(1.1)",
                },
              }}
              onClick={() => goToSlide(index)}
            />
          ))}
        </Box>
      </Container>
    </Box>
  )
}

export default RevolutionSection
