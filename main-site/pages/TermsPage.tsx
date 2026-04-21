"use client"

import { Box, Container, Typography, Grid, Card, CardContent } from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { CheckCircle, Payment, AccountCircle, Copyright, Gavel, Update } from "@mui/icons-material"

const TermsPage = () => {
  const sections = [
    {
      icon: <CheckCircle sx={{ fontSize: "3rem" }} />,
      title: "Acceptance of Terms",
      description:
        "By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.",
      color: "#FF6B35",
    },
    {
      icon: <Payment sx={{ fontSize: "3rem" }} />,
      title: "Subscription and Payments",
      description:
        "Some features of our service require a subscription. You agree to pay the fees associated with your selected plan. Subscription fees are billed in advance and are non-refundable.",
      color: "#4ECDC4",
    },
    {
      icon: <AccountCircle sx={{ fontSize: "3rem" }} />,
      title: "User Accounts",
      description:
        "When you create an account with us, you must provide accurate and complete information. You are responsible for safeguarding the password and for all activities that occur under your account.",
      color: "#45B7D1",
    },
    {
      icon: <Copyright sx={{ fontSize: "3rem" }} />,
      title: "Intellectual Property",
      description:
        "The service and its original content, features, and functionality are owned by One-Stop Solutions and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.",
      color: "#96CEB4",
    },
    {
      icon: <Gavel sx={{ fontSize: "3rem" }} />,
      title: "Limitation of Liability",
      description:
        "In no event shall One-Stop Solutions, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.",
      color: "#FFEAA7",
    },
    {
      icon: <Update sx={{ fontSize: "3rem" }} />,
      title: "Changes to Terms",
      description:
        "We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.",
      color: "#DDA0DD",
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
                Terms of Service
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Our Commitment to You
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
                Please read these Terms of Service ("Terms") carefully before using the One-Stop Solutions website and
                platform.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Terms Sections */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {sections.map((section, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
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
                      },
                    }}
                  >
                    <Box sx={{ color: section.color, mb: 3, display: "flex", justifyContent: "center" }}>
                      {section.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        textAlign: "center",
                        color: "#17234E",
                      }}
                    >
                      {section.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 1.6,
                      }}
                    >
                      {section.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Additional Section */}
            <Box sx={{ mt: { xs: 6, md: 8 } }}>
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
                  Governing Law
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#6B7280",
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  These Terms shall be governed by the laws of the jurisdiction in which One-Stop Solutions is established,
                  without regard to its conflict of law provisions.
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
                  If you have any questions about these Terms, please contact us at hello@1stop-solutions.com.
                </Typography>
              </Card>
            </Box>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default TermsPage
