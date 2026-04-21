"use client"

import { themeConfig } from "../../../app/backend/context/AppTheme";
import { alpha } from "@mui/material/styles";
import { useState, useEffect } from "react"
import { useParams, useLocation } from "react-router-dom"
import { Box, Typography, Avatar, Button, IconButton, Card, CardContent, Chip, Fade, Grow } from "@mui/material"
import {
  Phone,
  Email,
  Language,
  Instagram,
  LinkedIn,
  Twitter,
  Business,
  LocationOn,
  Schedule,
} from "@mui/icons-material"
import { fetchAdminProfile } from "../../backend/functions/AdminProfile"
import type { AdminProfile } from "../../backend/interfaces/AdminProfile"
import { getSettings } from "../../backend/data/Settings"
import { getDefaultSettings, type AppSettings } from "../../backend/interfaces/Settings"
import { trackQRScan } from "../../backend/functions/QR"

const QRLandingPage = () => {
  const params = useParams()
  const location = useLocation()
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [adminId, setAdminId] = useState<string>("")
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Priority 1: Get from localStorage (set by QR form)
    const storedAdminId = localStorage.getItem("qr_admin_id")

    // Priority 2: Get from URL params
    const urlAdminId = params.adminId

    // Priority 3: Parse from URL path
    const pathSegments = location.pathname.split("/").filter((segment) => segment !== "")
    const qrIndex = pathSegments.indexOf("qr")
    const pathAdminId = qrIndex !== -1 && qrIndex + 1 < pathSegments.length ? pathSegments[qrIndex + 1] : ""

    // Use the first available ID
    const finalAdminId = storedAdminId || urlAdminId || pathAdminId

    if (finalAdminId) {
      setAdminId(finalAdminId)
      loadData(finalAdminId)
    } else {
      setError("No admin ID found. Please scan the QR code again.")
      setLoading(false)
    }
  }, [params, location])

  const loadData = async (adminIdToUse: string) => {
    try {
      if (!adminIdToUse) {
        throw new Error("Admin ID is required")
      }

      // Load admin profile
      const profile = await fetchAdminProfile(adminIdToUse)
      
      // Track QR scan if we have a QR ID in the URL
      const urlParams = new URLSearchParams(location.search)
      const qrId = urlParams.get("qr")
      if (qrId) {
        await trackQRScan(qrId, true) // true = personal QR
      }

      if (!profile) {
        throw new Error(`No profile found for admin ID: ${adminIdToUse}`)
      }

      setAdminProfile(profile)

      // Load settings
      const dbSettings = await getSettings()
      if (dbSettings) {
        setSettings(dbSettings)
      }

      // Trigger animations
      setTimeout(() => setShowContent(true), 300)
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleCall = () => {
    if (adminProfile?.phone) {
      window.location.href = `tel:${adminProfile.phone}`
    }
  }

  const handleEmail = () => {
    if (adminProfile?.email) {
      window.location.href = `mailto:${adminProfile.email}`
    }
  }

  const handleWebsite = () => {
    if (settings.company.website) {
      window.open(
        settings.company.website.startsWith("http") ? settings.company.website : `https://${settings.company.website}`,
        "_blank",
      )
    }
  }

  const handleSocialLink = (platform: string) => {
    if (!adminProfile) return

    let url = ""

    switch (platform) {
      case "instagram":
        if (adminProfile.instagram) {
          const username = adminProfile.instagram.replace("@", "")
          url = `https://instagram.com/${username}`
        }
        break
      case "linkedin":
        if (adminProfile.linkedin) {
          url = adminProfile.linkedin.startsWith("http") ? adminProfile.linkedin : `https://${adminProfile.linkedin}`
        }
        break
      case "twitter":
        if (adminProfile.twitter) {
          const username = adminProfile.twitter.replace("@", "")
          url = `https://twitter.com/${username}`
        }
        break
    }

    if (url) {
      window.open(url, "_blank")
    }
  }

  const handleAddToContacts = () => {
    if (!adminProfile) return

    // Create vCard data using admin profile
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${adminProfile.name}
ORG:${adminProfile.company || settings.company.companyName}
TITLE:${adminProfile.position || ""}
TEL:${adminProfile.phone || ""}
EMAIL:${adminProfile.email || ""}
URL:${settings.company.website || ""}
END:VCARD`

    const blob = new Blob([vCard], { type: "text/vcard" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${adminProfile.name.replace(/\s+/g, "-").toLowerCase()}.vcf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleScheduleMeeting = () => {
    const subject = `Meeting Request - ${adminProfile?.name}`
    const body = `Hi ${adminProfile?.name},\n\nI'd like to schedule a meeting to discuss potential collaboration opportunities.\n\nBest regards`
    window.location.href = `mailto:${adminProfile?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #17234E 0%, #2a3f6b 100%)",
        }}
      >
        <Fade in={true}>
          <Box sx={{ textAlign: "center", color: "white" }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                border: "4px solid alpha(themeConfig.brandColors.offWhite, 0.3)",
                borderTop: "4px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                mx: "auto",
                mb: 3,
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Loading Profile...
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Admin ID: {adminId || "Searching..."}
            </Typography>
          </Box>
        </Fade>
      </Box>
    )
  }

  if (error || !adminProfile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #17234E 0%, #2a3f6b 100%)",
          px: 3,
        }}
      >
        <Fade in={true}>
          <Card sx={{ maxWidth: 400, textAlign: "center", p: 3 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2, color: "error.main", fontWeight: 600 }}>
                Profile Not Available
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                {error}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Admin ID: {adminId || "Not found"}
              </Typography>

              <Button variant="contained" sx={{ mt: 3 }} onClick={() => (window.location.href = "/Admin/Profile")}>
                Complete Profile Setup
              </Button>
            </CardContent>
          </Card>
        </Fade>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #17234E 0%, #2a3f6b 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: alpha(themeConfig.brandColors.offWhite, 0.1),
          animation: "float 6s ease-in-out infinite",
          "@keyframes float": {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-20px)" },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: alpha(themeConfig.brandColors.offWhite, 0.05),
          animation: "float 8s ease-in-out infinite reverse",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, p: 3 }}>
        {/* Header Section */}
        <Fade in={showContent} timeout={800}>
          <Box sx={{ textAlign: "center", mb: 4, pt: 4 }}>
            {/* Company Logo */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "3px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#17234E",
                mx: "auto",
                mb: 3,
                backdropFilter: "blur(10px)",
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src="/images/logo.png"
                alt="One-Stop Solutions"
                sx={{
                  width: 65,
                  height: 65,
                  objectFit: "contain",
                }}
              />
            </Box>

            {/* Profile Photo */}
            <Grow in={showContent} timeout={1000}>
              <Avatar
                src={adminProfile.photoURL}
                sx={{
                  width: 120,
                  height: 120,
                  mx: "auto",
                  mb: 3,
                  border: "4px solid white",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  fontSize: "3rem",
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                }}
              >
                {adminProfile.name.charAt(0).toUpperCase()}
              </Avatar>
            </Grow>

            {/* Profile Information */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: "2rem", sm: "2.5rem" },
                color: "white",
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {adminProfile.name}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 1,
                fontSize: { xs: "1.1rem", sm: "1.3rem" },
                color: alpha(themeConfig.brandColors.offWhite, 0.9),
                fontWeight: 400,
              }}
            >
              {adminProfile.position || "Team Member"}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "1rem", sm: "1.1rem" },
                color: alpha(themeConfig.brandColors.offWhite, 0.8),
                fontWeight: 300,
                mb: 2,
              }}
            >
              {adminProfile.company || settings.company.companyName}
            </Typography>

            {/* Status Chips */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 4 }}>
              <Chip
                icon={<Business />}
                label="Available"
                sx={{
                  bgcolor: "rgba(76, 175, 80, 0.9)",
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <Chip
                icon={<LocationOn />}
                label="Remote"
                sx={{
                  bgcolor: "rgba(33, 150, 243, 0.9)",
                  color: "white",
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </Fade>

        {/* Contact Cards */}
        <Fade in={showContent} timeout={1200}>
          <Box sx={{ maxWidth: 400, mx: "auto", mb: 4 }}>
            {/* Email Card */}
            {adminProfile.email && (
              <Card
                onClick={handleEmail}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.95),
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, py: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#1976d2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Email sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b", mb: 0.5 }}>
                      {adminProfile.email}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      Send Email
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Phone Card */}
            {adminProfile.phone && (
              <Card
                onClick={handleCall}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.95),
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, py: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#2e7d32",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Phone sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b", mb: 0.5 }}>
                      {adminProfile.phone}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      Call Now
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Website Card */}
            {settings.company.website && (
              <Card
                onClick={handleWebsite}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.95),
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, py: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#ed6c02",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Language sx={{ color: "white", fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b", mb: 0.5 }}>
                      {settings.company.website}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      Visit Website
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Fade>

        {/* Social Media Icons */}
        <Fade in={showContent} timeout={1400}>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mb: 4 }}>
            {adminProfile.instagram && (
              <IconButton
                onClick={() => handleSocialLink("instagram")}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: "rgba(233, 30, 99, 0.9)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    bgcolor: "rgba(233, 30, 99, 1)",
                    transform: "scale(1.1) translateY(-2px)",
                    boxShadow: "0 8px 16px rgba(233, 30, 99, 0.4)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <Instagram sx={{ fontSize: 30 }} />
              </IconButton>
            )}
            {adminProfile.linkedin && (
              <IconButton
                onClick={() => handleSocialLink("linkedin")}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: "rgba(0, 119, 181, 0.9)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    bgcolor: "rgba(0, 119, 181, 1)",
                    transform: "scale(1.1) translateY(-2px)",
                    boxShadow: "0 8px 16px rgba(0, 119, 181, 0.4)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <LinkedIn sx={{ fontSize: 30 }} />
              </IconButton>
            )}
            {adminProfile.twitter && (
              <IconButton
                onClick={() => handleSocialLink("twitter")}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: "rgba(29, 161, 242, 0.9)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    bgcolor: "rgba(29, 161, 242, 1)",
                    transform: "scale(1.1) translateY(-2px)",
                    boxShadow: "0 8px 16px rgba(29, 161, 242, 0.4)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <Twitter sx={{ fontSize: 30 }} />
              </IconButton>
            )}
          </Box>
        </Fade>

        {/* Action Buttons */}
        <Fade in={showContent} timeout={1600}>
          <Box sx={{ maxWidth: 400, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleAddToContacts}
              sx={{
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.95),
                color: "#1e293b",
                py: 2.5,
                fontSize: "18px",
                fontWeight: 600,
                borderRadius: 3,
                textTransform: "none",
                backdropFilter: "blur(10px)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,1)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                },
                transition: "all 0.3s ease",
              }}
              startIcon={<Box sx={{ fontSize: "1.4rem" }}>📱</Box>}
            >
              Save Contact
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleScheduleMeeting}
              sx={{
                borderColor: alpha(themeConfig.brandColors.offWhite, 0.8),
                color: "white",
                py: 2.5,
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: 3,
                textTransform: "none",
                backdropFilter: "blur(10px)",
                "&:hover": {
                  borderColor: "white",
                  bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                  transform: "translateY(-2px)",
                },
                transition: "all 0.3s ease",
              }}
              startIcon={<Schedule />}
            >
              Schedule Meeting
            </Button>
          </Box>
        </Fade>
      </Box>
    </Box>
  )
}

export default QRLandingPage
