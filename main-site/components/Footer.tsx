"use client"

import { Box, Container, Typography, Grid, Link, IconButton, Divider } from "@mui/material"
import { Twitter, LinkedIn, Instagram, Email } from "@mui/icons-material"
import { useEffect, useState } from "react"
import { type AppSettings, getDefaultSettings, subscribeToSettings } from "../firebase/settings"

// The exact color from the logo - updated to match #17234E
const LOGO_NAVY_BLUE = "#17234E"

const Footer = () => {
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Subscribe to real-time settings updates
    const unsubscribe = subscribeToSettings((newSettings) => {
      if (newSettings) {
        setSettings(newSettings)
      } else {
        setSettings(getDefaultSettings())
      }
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <Box sx={{ backgroundColor: LOGO_NAVY_BLUE, color: "white", pt: 8, pb: 4, minHeight: 200 }}>
        <Container maxWidth="lg">
          <Typography variant="body1" sx={{ color: "#9CA3AF", textAlign: "center" }}>
            Loading...
          </Typography>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ backgroundColor: LOGO_NAVY_BLUE, color: "white", pt: 8, pb: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <img src="/images/logo.png" alt="One-Stop Solutions" style={{ height: 40, width: 40, marginRight: 12 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>
                {settings.company.companyName}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "#9CA3AF", mb: 3, maxWidth: 600, lineHeight: 1.6 }}>
              Transforming hospitality management with AI-powered insights, automation, and customer intelligence. Our
              platform helps restaurants, cafes, and bars increase revenue, reduce costs, and improve customer satisfaction.
            </Typography>

            {/* Contact Info and Social Media */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Email sx={{ color: "#9CA3AF", fontSize: "1rem" }} />
                <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                  {settings.company.email}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                {settings.socialMedia.twitter && (
                  <IconButton
                    component="a"
                    href={settings.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: "#9CA3AF", "&:hover": { color: "#1DA1F2" } }}
                    size="small"
                  >
                    <Twitter />
                  </IconButton>
                )}
                {settings.socialMedia.linkedin && (
                  <IconButton
                    component="a"
                    href={settings.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: "#9CA3AF", "&:hover": { color: "#0A66C2" } }}
                    size="small"
                  >
                    <LinkedIn />
                  </IconButton>
                )}
                {settings.socialMedia.instagram && (
                  <IconButton
                    component="a"
                    href={settings.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: "#9CA3AF", "&:hover": { color: "#E4405F" } }}
                    size="small"
                  >
                    <Instagram />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Features Column */}
          <Grid item xs={6} sm={3} md={2.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, color: "white" }}>
              Features
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Link
                href="/Features/SalesTracking"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                Sales Tracking
              </Link>
              <Link
                href="/Features/StaffPerformance"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                Staff Performance
              </Link>
              <Link
                href="/Features/InventoryOptimization"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                Inventory Optimization
              </Link>
            </Box>
          </Grid>

          {/* Company Column */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, color: "white" }}>
              Company
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Link
                href="/AboutUs"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                About Us
              </Link>
              <Link
                href="/Contact"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                Contact
              </Link>
              <Link
                href="/PrivacyPolicy"
                underline="hover"
                sx={{
                  color: "#9CA3AF",
                  fontSize: "0.875rem",
                  "&:hover": { color: "white" },
                }}
              >
                Privacy Policy
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 6, borderColor: "#374151" }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
            © {new Date().getFullYear()} {settings.company.companyName}. All rights reserved.
          </Typography>
          <Box sx={{ display: "flex", gap: 4 }}>
            <Link
              href="/PrivacyPolicy"
              underline="hover"
              sx={{ color: "#9CA3AF", fontSize: "0.875rem", "&:hover": { color: "white" } }}
            >
              Privacy
            </Link>
            <Link
              href="/Terms"
              underline="hover"
              sx={{ color: "#9CA3AF", fontSize: "0.875rem", "&:hover": { color: "white" } }}
            >
              Terms
            </Link>
            <Link
              href="/Cookies"
              underline="hover"
              sx={{ color: "#9CA3AF", fontSize: "0.875rem", "&:hover": { color: "white" } }}
            >
              Cookies
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default Footer
