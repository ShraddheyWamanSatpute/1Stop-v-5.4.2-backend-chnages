"use client"

import { Box, Container, Typography, Grid, Card, CardContent } from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Security, Lock, Shield, Visibility } from "@mui/icons-material"

const PrivacyPolicyPage = () => {
  const sections = [
    {
      icon: <Security sx={{ fontSize: "3rem" }} />,
      title: "Information We Collect",
      description:
        "We collect information that you provide directly to us when you register for an account, use our services, or communicate with us. This may include your name, email address, phone number, business information, payment details, and any other information you choose to provide.",
      color: "#FF6B35",
    },
    {
      icon: <Lock sx={{ fontSize: "3rem" }} />,
      title: "How We Use Your Information",
      description:
        "We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.",
      color: "#4ECDC4",
    },
    {
      icon: <Shield sx={{ fontSize: "3rem" }} />,
      title: "Data Security",
      description:
        "We implement appropriate technical and organizational measures to protect the security of your personal information. However, please note that no method of transmission over the Internet or electronic storage is 100% secure.",
      color: "#45B7D1",
    },
    {
      icon: <Visibility sx={{ fontSize: "3rem" }} />,
      title: "Third-Party Services",
      description:
        "Our services may contain links to third-party websites and services. We are not responsible for the content or privacy practices of these sites and encourage you to read their privacy statements.",
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
                Privacy Policy
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Your Privacy Matters to Us
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
                At One-Stop Solutions, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you visit our website or use our hospitality management
                platform.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Main Content Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {sections.map((section, index) => (
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
                      },
                    }}
                  >
                    <Box sx={{ color: section.color, mb: 3, display: "flex", justifyContent: "center" }}>
                      {section.icon}
                    </Box>
                    <Typography
                      variant="h5"
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
                      variant="body1"
                      sx={{
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 1.7,
                      }}
                    >
                      {section.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Additional Sections */}
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
                  Changes to This Privacy Policy
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#6B7280",
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                  Privacy Policy on this page and updating the "Last Updated" date.
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
                  If you have any questions about this Privacy Policy, please contact us at hello@1stop-solutions.com.
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

export default PrivacyPolicyPage
