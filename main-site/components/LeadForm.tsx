"use client"

import type React from "react"
import { useState } from "react"
import {
  Box,
  Typography,
  Container,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
} from "@mui/material"
import { Email, Person, Business, Phone } from "@mui/icons-material"
import emailjs from "@emailjs/browser"

// The exact color from the logo
const LOGO_NAVY_BLUE = "#17234E"

const LeadForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    hearAboutUs: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      await emailjs.send(
        "YOUR_SERVICE_ID", // Replace with your EmailJS service ID
        "YOUR_TEMPLATE_ID", // Replace with your EmailJS template ID
        {
          from_name: formData.name,
          from_email: formData.email,
          company: formData.company,
          phone: formData.phone,
          hear_about_us: formData.hearAboutUs,
          message: formData.message,
        },
        "YOUR_USER_ID", // Replace with your EmailJS user ID
      )

      setSubmitStatus("success")
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        hearAboutUs: "",
        message: "",
      })
    } catch (error) {
      console.error("Error sending email:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      id="lead-form"
      sx={{
        py: { xs: 8, md: 12 },
        background: `linear-gradient(135deg, ${LOGO_NAVY_BLUE} 0%, #2A3256 100%)`,
        color: "white",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "2rem", md: "2.5rem" },
                fontWeight: 700,
                mb: 3,
              }}
            >
              Ready to Transform Your Business?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                opacity: 0.9,
                lineHeight: 1.6,
              }}
            >
              Get started with a free consultation and see how our AI-powered platform can revolutionize your hospitality
              operations. Our experts will analyze your specific needs and show you the potential impact on your
              business.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                "Full access to all features",
                "Personalized setup and onboarding",
                "24/7 customer support",
                "No long-term contracts required",
              ].map((benefit, index) => (
                <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "secondary.main",
                    }}
                  />
                  <Typography variant="body1">{benefit}</Typography>
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 4 }}>
              <CardContent>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    textAlign: "center",
                    color: LOGO_NAVY_BLUE,
                  }}
                >
                  Book a Chat
                </Typography>
                {submitStatus === "success" && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Thank you! We'll be in touch within 24 hours to schedule your chat.
                  </Alert>
                )}
                {submitStatus === "error" && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    Something went wrong. Please try again or contact us directly.
                  </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Business/Company Name"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: <Business sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Where did you hear about us?</InputLabel>
                    <Select
                      name="hearAboutUs"
                      value={formData.hearAboutUs}
                      onChange={handleSelectChange}
                      label="Where did you hear about us?"
                    >
                      <MenuItem value="Social Media">Social Media</MenuItem>
                      <MenuItem value="Referral">Referral</MenuItem>
                      <MenuItem value="Website">Website</MenuItem>
                      <MenuItem value="Google">Google</MenuItem>
                      <MenuItem value="YouTube">YouTube</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Tell us about your business and goals"
                    name="message"
                    multiline
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Number of locations, current challenges, what you hope to achieve..."
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    sx={{
                      backgroundColor: "secondary.main",
                      "&:hover": { backgroundColor: "secondary.dark" },
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    {isSubmitting ? "Sending..." : "Book a Chat"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default LeadForm
