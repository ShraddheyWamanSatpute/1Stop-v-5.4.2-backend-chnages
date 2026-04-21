"use client"

import type React from "react"
import { Box, Container, Typography, Grid, TextField, Button, Card, MenuItem } from "@mui/material"
import { useState } from "react"
import { addLead } from "../firebase/leads"

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurant: "",
    restaurantSize: "",
    role: "",
    headache: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const restaurantSizes = [
    { value: "1-5", label: "1-5 employees" },
    { value: "6-20", label: "6-20 employees" },
    { value: "21-50", label: "21-50 employees" },
    { value: "51-100", label: "51-100 employees" },
    { value: "100+", label: "100+ employees" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await addLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        restaurantName: formData.restaurant,
        message: `Role: ${formData.role}\n\nBiggest challenge: ${formData.headache}`,
      })

      setFormData({
        name: "",
        email: "",
        phone: "",
        restaurant: "",
        restaurantSize: "",
        role: "",
        headache: "",
      })

      setIsSubmitted(true)
      setTimeout(() => setIsSubmitted(false), 5000)
    } catch (error) {
      console.error("Error submitting lead:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Box
        id="contact"
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
            backgroundColor: "rgba(23, 35, 78, 0.08)",
            borderRadius: "30%",
            animation: "float 4s ease-in-out infinite reverse",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "5%",
            width: { xs: 30, md: 60 },
            height: { xs: 30, md: 60 },
            backgroundColor: "rgba(0, 102, 204, 0.06)",
            borderRadius: "50%",
            animation: "float 5s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "15%",
            right: "12%",
            width: { xs: 45, md: 80 },
            height: { xs: 45, md: 80 },
            backgroundColor: "rgba(0, 102, 204, 0.06)",
            borderRadius: "40%",
            animation: "float 7s ease-in-out infinite reverse",
          }}
        />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Card
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              borderRadius: 3,
            }}
          >
            <Box sx={{ fontSize: "4rem", mb: 2 }}>🎉</Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: "#17234E" }}>
              Thanks! We'll be in touch soon.
            </Typography>
            <Typography variant="body1" sx={{ color: "#718096", mb: 3 }}>
              We'll review your info and get back to you within 24 hours with next steps.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setIsSubmitted(false)}
              sx={{ borderColor: "#1976D2", color: "#1976D2" }}
            >
              Submit Another Request
            </Button>
          </Card>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      id="contact"
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
          backgroundColor: "rgba(23, 35, 78, 0.08)",
          borderRadius: "30%",
          animation: "float 4s ease-in-out infinite reverse",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "5%",
          width: { xs: 30, md: 60 },
          height: { xs: 30, md: 60 },
          backgroundColor: "rgba(0, 102, 204, 0.06)",
          borderRadius: "50%",
          animation: "float 5s ease-in-out infinite",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "15%",
          right: "12%",
          width: { xs: 45, md: 80 },
          height: { xs: 45, md: 80 },
          backgroundColor: "rgba(0, 102, 204, 0.06)",
          borderRadius: "40%",
          animation: "float 7s ease-in-out infinite reverse",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: "#17234E",
              mb: 2,
              fontSize: { xs: "2rem", md: "2.5rem" },
              lineHeight: 1.1,
            }}
          >
            Ready to Transform
            <Box component="span" sx={{ color: "#1976D2", display: "block" }}>
              Your Business?
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "#718096",
              maxWidth: "500px",
              mx: "auto",
              lineHeight: 1.6,
              fontSize: { xs: "1rem", md: "1.125rem" },
            }}
          >
           Ready to transform your restaurant, café, or bar? Book a chat with our team to see how we can help you succeed. </Typography>
        </Box>

        <Grid container spacing={6} justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
            <Card
              sx={{
                p: { xs: 3, md: 4 },
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                borderRadius: 3,
                border: "1px solid #E2E8F0",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "#17234E",
                  mb: 1,
                  textAlign: "center",
                  fontSize: { xs: "1.25rem", md: "1.5rem" },
                }}
              >
                Book a Chat
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#718096",
                  mb: 2,
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                Let's discuss how we can help transform your hospitality operations.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Business Name"
                      name="restaurant"
                      value={formData.restaurant}
                      onChange={handleChange}
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Your Role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      placeholder="Owner, Manager, Chef..."
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="Business Size"
                      name="restaurantSize"
                      value={formData.restaurantSize}
                      onChange={handleChange}
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    >
                      {restaurantSizes.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="What's your biggest challenge right now?"
                      name="headache"
                      multiline
                      rows={3}
                      value={formData.headache}
                      onChange={handleChange}
                      placeholder="Staff scheduling, food costs, inventory management..."
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={isSubmitting}
                      sx={{
                        backgroundColor: "#17234E",
                        color: "white",
                        py: 2.5,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        borderRadius: 2,
                        "&:hover": {
                          backgroundColor: "#0F1419",
                        },
                        "&:disabled": {
                          backgroundColor: "#9CA3AF",
                        },
                      }}
                    >
                      {isSubmitting ? "Submitting..." : "Book a Chat →"}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default ContactSection
