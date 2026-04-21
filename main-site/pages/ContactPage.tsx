"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Container,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
} from "@mui/material"
import { Email, LocationOn } from "@mui/icons-material"
import Footer from "../components/Footer"
import { addLead } from "../firebase/leads"

const ContactPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await addLead({
        name: formData.name,
        email: formData.email,
        phone: "", // Phone field removed from ContactPage
        restaurantName: formData.restaurant,
        message: `Role: ${formData.role}\nRestaurant Size: ${formData.restaurantSize}\n\nBiggest challenge: ${formData.headache}`,
      })

      setFormData({
        name: "",
        email: "",
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

  const restaurantSizes = [
    { value: "1-5", label: "1-5 employees" },
    { value: "6-20", label: "6-20 employees" },
    { value: "21-50", label: "21-50 employees" },
    { value: "51-100", label: "51-100 employees" },
    { value: "100+", label: "100+ employees" },
  ]

  return (
    <>
      <Box sx={{ pt: "80px", pb: 8 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          <Grid container spacing={{ xs: 4, md: 6 }}>
            <Grid item xs={12} md={5}>
              <Typography
                variant="h4"
                sx={{
                  mb: { xs: 3, md: 4 },
                  fontWeight: 700,
                  color: "#17234E",
                  fontSize: { xs: "1.75rem", md: "2.125rem" },
                }}
              >
                Get In Touch
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6B7280",
                  mb: { xs: 3, md: 4 },
                  fontSize: { xs: "0.95rem", md: "1rem" },
                  lineHeight: 1.6,
                }}
              >
                Have questions about our platform? Want to book a chat? Our team is ready to help you transform your
                hospitality operations with AI-powered insights.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 3 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Email sx={{ color: "#17234E", fontSize: 28 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: "#17234E" }}>
                      hello@1stop-solutions.com
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <LocationOn sx={{ color: "#17234E", fontSize: 28 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: "#6B7280" }}>
                      Based
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: "#17234E" }}>
                      The United Kingdom
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={7}>
              <Card
                sx={{
                  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                  borderRadius: 3,
                  border: "1px solid #E2E8F0",
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
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
                      mb: 4,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Let's discuss how we can help transform your hospitality operations.
                  </Typography>

                  {isSubmitted ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Box sx={{ fontSize: "4rem", mb: 2 }}>🎉</Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "#17234E" }}>
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
                    </Box>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Footer />
    </>
  )
}

export default ContactPage
