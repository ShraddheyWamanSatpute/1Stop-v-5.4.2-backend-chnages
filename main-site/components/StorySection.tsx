"use client"

import { Box, Container, Typography, Button } from "@mui/material"
import { ArrowForward } from "@mui/icons-material"

const StorySection = () => {
  return (
    <Box
      sx={{ py: { xs: 8, md: 12 }, backgroundColor: "#F8F9FA", position: "relative", overflow: "hidden" }}
      id="approach"
    >
      <Container maxWidth="lg">
        {/* Background DNA Animation */}
        <Box
          sx={{
            position: "absolute",
            right: { xs: -100, md: -50 },
            top: "50%",
            transform: "translateY(-50%)",
            width: { xs: 300, md: 400 },
            height: { xs: 400, md: 500 },
            opacity: 0.1,
            zIndex: 0,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* DNA Double Helix */}
            <g>
              {/* Left Strand */}
              <path
                d="M100 50 Q150 100 100 150 Q50 200 100 250 Q150 300 100 350 Q50 400 100 450"
                stroke="#17234E"
                strokeWidth="4"
                fill="none"
                opacity="0.6"
              >
                <animate
                  attributeName="d"
                  values="M100 50 Q150 100 100 150 Q50 200 100 250 Q150 300 100 350 Q50 400 100 450;
                          M100 50 Q50 100 100 150 Q150 200 100 250 Q50 300 100 350 Q150 400 100 450;
                          M100 50 Q150 100 100 150 Q50 200 100 250 Q150 300 100 350 Q50 400 100 450"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Right Strand */}
              <path
                d="M300 50 Q250 100 300 150 Q350 200 300 250 Q250 300 300 350 Q350 400 300 450"
                stroke="#0066CC"
                strokeWidth="4"
                fill="none"
                opacity="0.6"
              >
                <animate
                  attributeName="d"
                  values="M300 50 Q250 100 300 150 Q350 200 300 250 Q250 300 300 350 Q350 400 300 450;
                          M300 50 Q350 100 300 150 Q250 200 300 250 Q350 300 300 350 Q250 400 300 450;
                          M300 50 Q250 100 300 150 Q350 200 300 250 Q250 300 300 350 Q350 400 300 450"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>

              {/* Connecting Base Pairs */}
              {[75, 125, 175, 225, 275, 325, 375, 425].map((y, index) => (
                <line key={index} x1="100" y1={y} x2="300" y2={y} stroke="#17234E" strokeWidth="2" opacity="0.4">
                  <animate
                    attributeName="opacity"
                    values="0.4;0.8;0.4"
                    dur="2s"
                    begin={`${index * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Floating Particles */}
              {[...Array(8)].map((_, index) => (
                <circle key={index} cx={50 + index * 40} cy={100 + index * 30} r="3" fill="#0066CC" opacity="0.5">
                  <animate
                    attributeName="cy"
                    values={`${100 + index * 30};${80 + index * 30};${100 + index * 30}`}
                    dur={`${2 + index * 0.3}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;1;0.5"
                    dur={`${1.5 + index * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          </svg>
        </Box>

        {/* Content */}
        <Box sx={{ position: "relative", zIndex: 1, maxWidth: { xs: "100%", md: "60%" } }}>
          {/* Header */}
          <Typography
            sx={{
              fontWeight: 800,
              color: "#17234E",
              mb: 6,
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
            Built By Hospitality Experts,
            <br />
            <Box component="span" sx={{ color: "#0066CC" }}>
              For Hospitality Success
            </Box>
          </Typography>

          {/* Main Story Content */}
          <Typography
            sx={{
              color: "#6B7280",
              mb: 4,
              lineHeight: 1.7,
              fontSize: { xs: "1rem", md: "1.125rem" },
              animation: "fadeInUp 0.8s ease-out 0.2s both",
              textAlign: "center",
            }}
          >
            After years of struggling with outdated systems and gut-feeling decisions, we built the solution we wished
            we had. We've lived through the chaos of reconciling numbers at 2 AM, the stress of over-ordering
            ingredients, and the frustration of being understaffed during rush hour.
          </Typography>

          <Typography
            sx={{
              color: "#6B7280",
              mb: 4,
              lineHeight: 1.7,
              fontSize: { xs: "1rem", md: "1.125rem" },
              animation: "fadeInUp 0.8s ease-out 0.4s both",
              textAlign: "center",
            }}
          >
            Our platform combines cutting-edge AI with real hospitality experience. We don't just build software – we
            solve the problems we faced every day in our own venues. Every late night taught us something new about
            what restaurants, cafes, and bars really need.
          </Typography>

          <Typography
            sx={{
              color: "#6B7280",
              mb: 6,
              lineHeight: 1.7,
              fontSize: { xs: "1rem", md: "1.125rem" },
              animation: "fadeInUp 0.8s ease-out 0.6s both",
              textAlign: "center",
            }}
          >
            Now we're on a mission to help hospitality business owners and managers transform their operations with intelligent
            insights, predictive analytics, and data-driven decision making. Be part of the future of hospitality management.
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              sx={{
                backgroundColor: "#17234E",
                color: "white",
                px: { xs: 3, md: 4 },
                py: { xs: 1.5, md: 2 },
                borderRadius: 2,
                textTransform: "none",
                fontSize: { xs: "0.9375rem", md: "1rem" },
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(23, 35, 78, 0.3)",
                animation: "fadeInUp 0.8s ease-out 0.8s both",
                "&:hover": {
                  backgroundColor: "#0F1629",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(23, 35, 78, 0.4)",
                },
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onClick={() => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              Apply for Access
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default StorySection
