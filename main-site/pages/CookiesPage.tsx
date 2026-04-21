"use client"

import { Box, Container, Typography, Grid, Card, CardContent } from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Cookie, Settings, Analytics, Lock } from "@mui/icons-material"

const CookiesPage = () => {
  const cookieTypes = [
    {
      icon: <Lock sx={{ fontSize: "3rem" }} />,
      title: "Essential Cookies",
      description:
        "These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas.",
      color: "#FF6B35",
    },
    {
      icon: <Analytics sx={{ fontSize: "3rem" }} />,
      title: "Performance Cookies",
      description:
        "These cookies collect information about how you use our website, such as which pages you visit most often and if you receive error messages from certain pages.",
      color: "#4ECDC4",
    },
    {
      icon: <Settings sx={{ fontSize: "3rem" }} />,
      title: "Functionality Cookies",
      description:
        "These cookies allow us to remember choices you make when you use our website, such as remembering your login details or language preference.",
      color: "#45B7D1",
    },
    {
      icon: <Cookie sx={{ fontSize: "3rem" }} />,
      title: "Analytics Cookies",
      description:
        "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
      color: "#96CEB4",
    },
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
                Cookies Policy
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Understanding Our Cookie Usage
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
                Last Updated: June 2, 2025
              </Typography>
              <Typography
                sx={{
                  color: "#6B7280",
                  maxWidth: "700px",
                  mx: "auto",
                  lineHeight: 1.7,
                  fontSize: { xs: "1rem", md: "1.125rem" },
                  mt: 2,
                  animation: "fadeInUp 0.8s ease-out 0.4s both",
                }}
              >
                This Cookies Policy explains how One-Stop Solutions uses cookies and similar technologies to recognize you
                when you visit our website and use our platform. It explains what these technologies are and why we use
                them, as well as your rights to control our use of them.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* What Are Cookies Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Card
              sx={{
                p: { xs: 4, md: 6 },
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                mb: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: "#17234E",
                }}
              >
                What Are Cookies?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6B7280",
                  lineHeight: 1.7,
                }}
              >
                Cookies are small data files that are placed on your computer or mobile device when you visit a website.
                Cookies are widely used by website owners to make their websites work, or to work more efficiently, as
                well as to provide reporting information.
              </Typography>
            </Card>

            <Card
              sx={{
                p: { xs: 4, md: 6 },
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                mb: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: "#17234E",
                }}
              >
                Why Do We Use Cookies?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6B7280",
                  lineHeight: 1.7,
                  mb: 2,
                }}
              >
                We use first-party and third-party cookies for several reasons. Some cookies are required for technical
                reasons for our website and platform to operate, and we refer to these as "essential" or "strictly
                necessary" cookies. Other cookies enable us to track and target the interests of our users to enhance the
                experience on our website. Third parties serve cookies through our website for analytics, personalization,
                and advertising purposes.
              </Typography>
            </Card>
          </Container>
        </Box>

        {/* Cookie Types Section */}
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
                Types of Cookies We Use
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
                Understanding the different types of cookies we use
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {cookieTypes.map((cookie, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
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
                    <Box sx={{ color: cookie.color, mb: 3, display: "flex", justifyContent: "center" }}>
                      {cookie.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        color: "#17234E",
                      }}
                    >
                      {cookie.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6B7280",
                        lineHeight: 1.6,
                      }}
                    >
                      {cookie.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Control Cookies Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Card
              sx={{
                p: { xs: 4, md: 6 },
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                mb: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: "#17234E",
                }}
              >
                How to Control Cookies
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6B7280",
                  lineHeight: 1.7,
                  mb: 3,
                }}
              >
                You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject
                cookies, you may still use our website though your access to some functionality and areas may be
                restricted.
              </Typography>
            </Card>

            <Card
              sx={{
                p: { xs: 4, md: 6 },
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                borderRadius: 3,
                border: "1px solid #E5E7EB",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: "#17234E",
                }}
              >
                Contact Us
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6B7280",
                  lineHeight: 1.7,
                }}
              >
                If you have any questions about our use of cookies or other technologies, please contact us at
                hello@1stop-solutions.com.
              </Typography>
            </Card>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default CookiesPage
