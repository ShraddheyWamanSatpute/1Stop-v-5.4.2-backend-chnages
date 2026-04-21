"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Alert, Box } from "@mui/material"
import { submitLead } from "../../backend/functions/QR"

const QRFormPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qrId = searchParams.get("qr") // Get QR ID from query parameter
  const adminId = searchParams.get("adminId") // Get admin ID from query parameter

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Store admin ID in localStorage when component mounts
  useEffect(() => {
    if (adminId) {
      localStorage.setItem("qr_admin_id", adminId)
    }
  }, [adminId, qrId, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const storedAdminId = localStorage.getItem("qr_admin_id")
      await submitLead({
        ...formData,
        status: "new",
        source: "qr_code",
        adminId: storedAdminId || adminId || undefined,
        qrId: qrId || undefined,
      })
      setSubmitted(true)

      // Redirect to QR landing page after 2 seconds
      setTimeout(() => {
        if (storedAdminId) {
          navigate(`/Qr/${storedAdminId}`)
        } else if (adminId) {
          navigate(`/Qr/${adminId}`)
        } else {
          navigate("/")
        }
      }, 2000)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewProfile = () => {
    const storedAdminId = localStorage.getItem("qr_admin_id")

    if (storedAdminId) {
      navigate(`/Qr/${storedAdminId}`)
    } else if (adminId) {
      navigate(`/Qr/${adminId}`)
    } else {
      navigate("/")
    }
  }

  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card elevation={3}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ mb: 2, color: "#172554", fontWeight: 700 }}>
                Thank You!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We've received your information and will be in touch soon.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You'll be redirected to the profile page in a moment...
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={handleViewProfile}
              sx={{
                bgcolor: "#172554",
                color: "white",
                px: 4,
                py: 1.5,
                fontWeight: 600,
                "&:hover": { bgcolor: "#1e40af" },
              }}
            >
              View Profile Now
            </Button>
          </CardContent>
        </Card>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, textAlign: "center", fontWeight: 600, color: "#172554" }}>
            Get in Touch
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: "center" }}>
            We'd love to learn more about your restaurant and how we can help you succeed.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#172554",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#172554",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#172554",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#172554",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#172554",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#172554",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Restaurant Name"
                  value={formData.restaurantName}
                  onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#172554",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#172554",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tell us about your needs"
                  multiline
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="What challenges are you facing? What are you looking to improve?"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#172554",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#172554",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    bgcolor: "#172554",
                    color: "white",
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#1e40af" },
                    "&:disabled": { bgcolor: "#94a3b8" },
                  }}
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </Grid>
            </Grid>
          </form>

          <Alert severity="info" sx={{ mt: 3 }}>
            Your information is secure and will only be used to contact you about our services.
          </Alert>
        </CardContent>
      </Card>
    </Container>
  )
}

export default QRFormPage
