"use client"

import type React from "react"
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Pagination,
  Button,
} from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { useState } from "react"

const BlogPage = () => {
  const [page, setPage] = useState(1)

  const blogPosts = [
    {
      title: "5 Ways AI is Transforming Hospitality Management",
      excerpt:
        "Discover how artificial intelligence is helping hospitality business owners make better decisions and improve operations.",
      date: "May 28, 2025",
      category: "Technology",
      image: "/placeholder.svg?height=200&width=400",
      author: "Sarah Johnson",
    },
    {
      title: "Inventory Management Best Practices for Hospitality Businesses",
      excerpt: "Learn how to reduce waste, control costs, and optimize your venue's inventory management process.",
      date: "May 21, 2025",
      category: "Operations",
      image: "/placeholder.svg?height=200&width=400",
      author: "Michael Chen",
    },
    {
      title: "How to Motivate and Retain Hospitality Staff",
      excerpt: "Strategies for building a positive work culture and reducing turnover in your hospitality business.",
      date: "May 14, 2025",
      category: "Management",
      image: "/placeholder.svg?height=200&width=400",
      author: "Priya Patel",
    },
    {
      title: "Menu Engineering: Boost Profitability Through Smart Design",
      excerpt: "Use data-driven insights to create menus that maximize profits while delighting customers.",
      date: "May 7, 2025",
      category: "Marketing",
      image: "/placeholder.svg?height=200&width=400",
      author: "David Rodriguez",
    },
    {
      title: "Customer Loyalty Programs That Actually Work",
      excerpt: "Build lasting customer relationships with these proven loyalty program strategies for restaurants, cafes, and bars.",
      date: "April 30, 2025",
      category: "Marketing",
      image: "/placeholder.svg?height=200&width=400",
      author: "Sarah Johnson",
    },
    {
      title: "Sustainability in Hospitality: Good for the Planet and Your Bottom Line",
      excerpt:
        "How implementing sustainable practices can reduce costs and attract environmentally conscious customers.",
      date: "April 23, 2025",
      category: "Sustainability",
      image: "/placeholder.svg?height=200&width=400",
      author: "Michael Chen",
    },
  ]

  const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
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
                Hospitality Management Insights
                <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
                  Expert Advice & Industry Trends
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
                Expert advice, industry trends, and practical tips for hospitality business owners and managers
              </Typography>
            </Box>
          </Container>
        </Box>

        {/* Blog Posts Section */}
        <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              {blogPosts.map((post, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      borderRadius: 3,
                      border: "1px solid #E5E7EB",
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.image}
                      alt={post.title}
                      sx={{ objectFit: "cover" }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 3, display: "flex", flexDirection: "column" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Chip
                          label={post.category}
                          size="small"
                          sx={{
                            backgroundColor: "#E3F2FD",
                            color: "#1976D2",
                            fontWeight: 600,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#9CA3AF" }}>
                          {post.date}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{
                          fontWeight: 700,
                          mb: 2,
                          color: "#17234E",
                          lineHeight: 1.3,
                        }}
                      >
                        {post.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#6B7280",
                          mb: 2,
                          lineHeight: 1.6,
                          flexGrow: 1,
                        }}
                      >
                        {post.excerpt}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", mt: "auto" }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#17234E" }}>
                          By {post.author}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "center", mt: { xs: 6, md: 8 } }}>
              <Pagination
                count={3}
                page={page}
                onChange={handleChangePage}
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: "#17234E",
                    "&.Mui-selected": {
                      backgroundColor: "#17234E",
                      color: "white",
                    },
                  },
                }}
              />
            </Box>
          </Container>
        </Box>

        {/* Newsletter Section */}
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

          <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: "#17234E",
                }}
              >
                Subscribe to Our Newsletter
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 4,
                  color: "#6B7280",
                  maxWidth: 600,
                  mx: "auto",
                  lineHeight: 1.6,
                }}
              >
                Get the latest hospitality management insights, tips, and industry news delivered straight to your inbox.
              </Typography>
              <Box
                component="form"
                sx={{
                  display: "flex",
                  maxWidth: 500,
                  mx: "auto",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "16px",
                    }}
                  />
                </Box>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#17234E",
                    color: "white",
                    px: 4,
                    py: 1.5,
                    "&:hover": {
                      backgroundColor: "#0F1419",
                    },
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Subscribe
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  )
}

export default BlogPage
