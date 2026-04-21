"use client"

import { Box, Container, Typography, Grid, Card, CardContent, Avatar } from "@mui/material"
import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { CheckCircle, Lightbulb, Favorite, Security } from "@mui/icons-material"

interface AdminProfile {
  id: string
  name: string
  email: string
  position?: string
  company?: string
  bio?: string
  photo?: string
}

const AboutUsPage = () => {
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdminProfiles = async () => {
      try {
        const profilesCollection = collection(db, "profiles")
        const profilesSnapshot = await getDocs(profilesCollection)
        const profiles = profilesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AdminProfile[]

        setAdminProfiles(profiles)
      } catch (error) {
        console.error("Error fetching admin profiles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminProfiles()
  }, [])

  const values = [
    {
      icon: <CheckCircle sx={{ fontSize: "3rem" }} />,
      title: "Customer Success",
      description: "We measure our success by the success of our customers. If they're not thriving, we're not doing our job.",
      color: "#FF6B35",
    },
    {
      icon: <Lightbulb sx={{ fontSize: "3rem" }} />,
      title: "Innovation",
      description: "We're constantly pushing the boundaries of what's possible with AI and data analytics in the hospitality industry.",
      color: "#4ECDC4",
    },
    {
      icon: <Favorite sx={{ fontSize: "3rem" }} />,
      title: "Simplicity",
      description: "We believe powerful technology should be easy to use. We focus on intuitive design and clear communication.",
      color: "#45B7D1",
    },
    {
      icon: <Security sx={{ fontSize: "3rem" }} />,
      title: "Integrity",
      description: "We're transparent in our practices and honest in our communications. We do what we say we'll do.",
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
                About One-Stop Solutions
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Transforming Hospitality Management
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
                We're on a mission to transform hospitality management with AI-powered insights, automation, and customer
                intelligence.
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Story Section */}
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
                  Our Story
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 3,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  One-Stop Solutions was founded in 2022 by a team of hospitality industry veterans and technology
                  experts who saw a gap in the market for truly integrated, AI-powered hospitality management solutions.
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    mb: 3,
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  After years of watching hospitality business owners struggle with disconnected systems, manual processes, and a
                  lack of actionable insights, we decided to build the platform we wished had existed when we were in
                  their shoes.
                </Typography>
                <Typography
                  sx={{
                    color: "#6B7280",
                    lineHeight: 1.7,
                    fontSize: { xs: "1rem", md: "1.125rem" },
                  }}
                >
                  Today, we're proud to serve hundreds of restaurants, cafes, and bars across the country, helping them increase revenue,
                  reduce costs, and improve customer satisfaction through our comprehensive platform.
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
                    2022
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Values Section */}
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
                Our Values
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
                The principles that guide everything we do
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {values.map((value, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
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
                    <Box sx={{ color: value.color, mb: 3, display: "flex", justifyContent: "center" }}>
                      {value.icon}
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
                      {value.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 1.6,
                      }}
                    >
                      {value.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Team Section */}
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
                Meet Our Team
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
                The passionate people behind One-Stop Solutions
              </Typography>
            </Box>

            {loading ? (
              <Typography variant="body1" sx={{ textAlign: "center", color: "#6B7280" }}>
                Loading team members...
              </Typography>
            ) : adminProfiles.length > 0 ? (
              <Grid container spacing={4}>
                {adminProfiles.map((member) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={member.id}>
                    <Card
                      sx={{
                        textAlign: "center",
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
                      <Avatar
                        src={member.photo || "/placeholder.svg?height=120&width=120"}
                        alt={member.name}
                        sx={{
                          width: { xs: 100, md: 120 },
                          height: { xs: 100, md: 120 },
                          mx: "auto",
                          mb: 3,
                          border: "4px solid #F8F9FA",
                        }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          color: "#17234E",
                        }}
                      >
                        {member.name}
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: "#6B7280",
                          mb: 1,
                        }}
                      >
                        {member.position || "Team Member"}
                      </Typography>
                      {member.company && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#9CA3AF",
                            mb: 2,
                          }}
                        >
                          {member.company}
                        </Typography>
                      )}
                      {member.bio && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#6B7280",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                          }}
                        >
                          {member.bio}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" sx={{ textAlign: "center", color: "#6B7280" }}>
                No team members found.
              </Typography>
            )}
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default AboutUsPage
