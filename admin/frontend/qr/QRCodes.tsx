"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Alert, Box, Snackbar, Typography, Button, Card, CardContent, TextField, Avatar, IconButton, Grid } from "@mui/material"
import { PhotoCamera, Download, ContentCopy, QrCode, Person, ArrowBack } from "@mui/icons-material"
import { QRCodeSVG } from "qrcode.react"
import { createPersonalQR, createGenericQR } from "../../backend/functions/QR"
import type { PersonalQR } from "../../backend/interfaces/QR"
import { fetchAdminProfile } from "../../backend/functions/AdminProfile"
import type { AdminProfile } from "../../backend/interfaces/AdminProfile"
import { useAdmin } from "../../backend/context/AdminContext"

// The exact color from the logo
const LOGO_NAVY_BLUE = "#1A2243"

interface ContactForm {
  name: string
  email: string
  phone: string
  company: string
  position: string
  howWeMet: string
  photo: string
}

const QRCodesPage = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    howWeMet: "",
    photo: "",
  })
  const [currentQR, setCurrentQR] = useState<string>("")
  const [qrType, setQrType] = useState<"personal" | "generic" | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [, setCurrentQRId] = useState<string>("")
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [feedback, setFeedback] = useState<{ open: boolean; severity: "success" | "error" | "info"; message: string }>({
    open: false,
    severity: "info",
    message: "",
  })

  const { state } = useAdmin()
  const currentUser = state.user

  // Load admin profile when component mounts
  useEffect(() => {
    if (currentUser?.uid) {
      loadAdminProfile()
    }
  }, [currentUser])

  const loadAdminProfile = async () => {
    try {
      if (currentUser?.uid) {
        const profile = await fetchAdminProfile(currentUser.uid)
        setAdminProfile(profile)

        // Pre-fill form with admin profile data
        if (profile) {
          setFormData({
            name: profile.name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            company: profile.company || "",
            position: profile.position || "",
            howWeMet: "",
            photo: profile.photoURL || "",
          })
          setPhotoPreview(profile.photoURL || "")
        }
      }
    } catch (error) {
      console.error("Error loading admin profile:", error)
      setFeedback({ open: true, severity: "error", message: "We couldn't load your admin profile just now." })
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPhotoPreview(result)
        setFormData({ ...formData, photo: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const generatePersonalQR = async () => {
    if (!currentUser?.uid) {
      setFeedback({ open: true, severity: "error", message: "You must be logged in to create a QR code." })
      return
    }

    setIsGenerating(true)
    try {
      // Create QR that goes directly to the landing page with the admin's user ID
      const qrUrl = `${window.location.origin}/Qr/${currentUser.uid}`

      // Create the personal QR record with admin's info
      const personalQRData: Omit<PersonalQR, "id" | "timestamp"> = {
        adminId: currentUser.uid,
        contactId: "",
        name: formData.name,
        photo: formData.photo,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        howWeMet: formData.howWeMet,
        qrUrl: qrUrl,
        landingPageUrl: qrUrl,
        scans: 0,
        isActive: true,
      }

      const qrRecordId = await createPersonalQR(personalQRData)

      setCurrentQR(qrUrl)
      setCurrentQRId(qrRecordId)
      setQrType("personal")
      setFeedback({ open: true, severity: "success", message: "Personal QR created successfully." })
    } catch (error) {
      console.error("Error creating personal QR:", error)
      setFeedback({ open: true, severity: "error", message: "We couldn't create that QR code. Please try again." })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateGenericQR = async () => {
    if (!currentUser?.uid) {
      setFeedback({ open: true, severity: "error", message: "You must be logged in to create a QR code." })
      return
    }

    setIsGenerating(true)
    try {
      // Generate unique QR ID for generic QR too
      const qrId = Math.random().toString(36).substring(7)
      const genericUrl = `${window.location.origin}/QrForm?qr=${qrId}&adminId=${currentUser.uid}`
      
      // Save generic QR to database
      const genericQRId = await createGenericQR({
        adminId: currentUser.uid,
        qrId: qrId,
        qrUrl: genericUrl,
        formUrl: genericUrl,
        scans: 0,
        isActive: true,
      })
      setCurrentQR(genericUrl)
      setQrType("generic")
      setCurrentQRId(genericQRId)
    } catch (error) {
      console.error("Error creating generic QR:", error)
      setFeedback({ open: true, severity: "error", message: "We couldn't create that QR code. Please try again." })
    } finally {
      setIsGenerating(false)
    }
  }

  const startPersonalQR = () => {
    setQrType("personal")
    setCurrentQR("")
    setCurrentQRId("")
  }

  const startGenericQR = () => {
    generateGenericQR()
  }

  const goBack = () => {
    if (qrType === "generic") {
      setQrType(null)
      setCurrentQR("")
      setCurrentQRId("")
    } else if (qrType === "personal" && !currentQR) {
      setQrType(null)
    }
  }

  const generateNewQR = () => {
    // Reset to admin profile data instead of clearing everything
    if (adminProfile) {
      setFormData({
        name: adminProfile.name || "",
        email: adminProfile.email || "",
        phone: adminProfile.phone || "",
        company: adminProfile.company || "",
        position: adminProfile.position || "",
        howWeMet: "",
        photo: adminProfile.photoURL || "",
      })
      setPhotoPreview(adminProfile.photoURL || "")
    }
    setCurrentQR("")
    setQrType(null)
    setCurrentQRId("")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentQR)
    setFeedback({ open: true, severity: "success", message: "QR code link copied." })
  }

  const downloadQR = () => {
    const svg = document.querySelector("#qr-code-svg") as SVGElement
    if (svg) {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const data = new XMLSerializer().serializeToString(svg)
      const img = new Image()

      canvas.width = 300
      canvas.height = 300

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, 300, 300)
          ctx.drawImage(img, 0, 0, 300, 300)

          const link = document.createElement("a")
          link.download = `qr-code-${formData.name || "personal"}-${Date.now()}.png`
          link.href = canvas.toDataURL()
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }

      img.src = "data:image/svg+xml;base64," + btoa(data)
    }
  }

  // Main options screen
  if (!qrType) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", p: 0 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: LOGO_NAVY_BLUE }}>
            QR Generator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create QR codes for networking
          </Typography>
          {adminProfile && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: "green" }}>
              Welcome, {adminProfile.name}!
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Person />}
            onClick={startPersonalQR}
            sx={{
              py: 3,
              fontSize: "1.2rem",
              bgcolor: LOGO_NAVY_BLUE,
              "&:hover": { bgcolor: "#101733" },
            }}
          >
            Create Personal QR
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<QrCode />}
            onClick={startGenericQR}
            sx={{
              py: 3,
              fontSize: "1.2rem",
              borderColor: LOGO_NAVY_BLUE,
              color: LOGO_NAVY_BLUE,
              "&:hover": {
                bgcolor: LOGO_NAVY_BLUE,
                color: "white",
              },
            }}
          >
            Create Generic QR
          </Button>
        </Box>

        <Card sx={{ bgcolor: "grey.50" }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Personal QR:</strong> Pre-filled with your profile details
              <br />💡 <strong>Generic QR:</strong> General contact form
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Generic QR screen
  if (qrType === "generic" && currentQR) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", p: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={goBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: LOGO_NAVY_BLUE }}>
              Generic QR
            </Typography>
            <Typography variant="body2" color="text.secondary">
              QR code for contact form
            </Typography>
          </Box>
        </Box>

        <Card sx={{ mb: 3, textAlign: "center" }}>
          <CardContent sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <QRCodeSVG id="qr-code-svg" value={currentQR} size={200} level="H" includeMargin />
            </Box>

            <Box sx={{ mb: 3 }}>
              <QrCode sx={{ fontSize: 40, color: LOGO_NAVY_BLUE, mb: 1 }} />
              <Typography variant="h6" sx={{ color: LOGO_NAVY_BLUE }}>
                Contact Form
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scan to connect with you
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
              <IconButton
                onClick={copyToClipboard}
                sx={{ bgcolor: LOGO_NAVY_BLUE, color: "white", "&:hover": { bgcolor: "#101733" } }}
              >
                <ContentCopy />
              </IconButton>
              <IconButton
                onClick={downloadQR}
                sx={{ bgcolor: LOGO_NAVY_BLUE, color: "white", "&:hover": { bgcolor: "#101733" } }}
              >
                <Download />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={startPersonalQR}
              sx={{
                py: 1.5,
                px: 4,
                mb: 2,
                bgcolor: LOGO_NAVY_BLUE,
                "&:hover": { bgcolor: "#101733" },
              }}
            >
              Create Personal QR
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton onClick={goBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: LOGO_NAVY_BLUE }}>
            Personal QR
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your profile details for the landing page
          </Typography>
        </Box>
      </Box>

      {/* QR Code Display */}
      {currentQR && (
        <Card sx={{ mb: 3, textAlign: "center" }}>
          <CardContent sx={{ py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <QRCodeSVG id="qr-code-svg" value={currentQR} size={200} level="H" includeMargin />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Avatar
                src={photoPreview}
                sx={{
                  width: 60,
                  height: 60,
                  mx: "auto",
                  mb: 2,
                  border: 2,
                  borderColor: LOGO_NAVY_BLUE,
                }}
              >
                {formData.name.charAt(0) || "?"}
              </Avatar>
              <Typography variant="h6" sx={{ color: LOGO_NAVY_BLUE }}>
                {formData.name || "Your Profile"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.position} {formData.company && `at ${formData.company}`}
              </Typography>
            </Box>

            <Typography variant="caption" display="block" sx={{ mb: 2, color: "text.secondary" }}>
              QR URL: {currentQR}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
              <IconButton
                onClick={copyToClipboard}
                sx={{ bgcolor: LOGO_NAVY_BLUE, color: "white", "&:hover": { bgcolor: "#101733" } }}
              >
                <ContentCopy />
              </IconButton>
              <IconButton
                onClick={downloadQR}
                sx={{ bgcolor: LOGO_NAVY_BLUE, color: "white", "&:hover": { bgcolor: "#101733" } }}
              >
                <Download />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={generateNewQR}
                sx={{
                  py: 1.5,
                  px: 4,
                  bgcolor: LOGO_NAVY_BLUE,
                  "&:hover": { bgcolor: "#101733" },
                }}
              >
                Generate New QR
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={startGenericQR}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderColor: LOGO_NAVY_BLUE,
                  color: LOGO_NAVY_BLUE,
                  "&:hover": {
                    bgcolor: LOGO_NAVY_BLUE,
                    color: "white",
                  },
                }}
              >
                Create Generic QR
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Contact Form for Personal QR */}
      {qrType === "personal" && !currentQR && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="photo-upload"
                  type="file"
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="photo-upload">
                  <Avatar
                    src={photoPreview}
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      cursor: "pointer",
                      border: 2,
                      borderColor: LOGO_NAVY_BLUE,
                      borderStyle: photoPreview ? "solid" : "dashed",
                    }}
                  >
                    {photoPreview ? formData.name.charAt(0) || "?" : <PhotoCamera />}
                  </Avatar>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {photoPreview ? "Tap to change photo" : "Tap to add your photo"}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: LOGO_NAVY_BLUE,
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: LOGO_NAVY_BLUE,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: LOGO_NAVY_BLUE,
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: LOGO_NAVY_BLUE,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: LOGO_NAVY_BLUE,
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: LOGO_NAVY_BLUE,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: LOGO_NAVY_BLUE,
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: LOGO_NAVY_BLUE,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: LOGO_NAVY_BLUE,
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: LOGO_NAVY_BLUE,
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            size="large"
            onClick={generatePersonalQR}
            disabled={isGenerating || !currentUser}
            sx={{
              width: "100%",
              py: 2,
              fontSize: "1.1rem",
              bgcolor: LOGO_NAVY_BLUE,
              "&:hover": { bgcolor: "#101733" },
              "&:disabled": { bgcolor: "#94a3b8" },
            }}
          >
            {isGenerating ? "Generating..." : "Generate Personal QR"}
          </Button>
        </>
      )}
      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((current) => ({ ...current, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default QRCodesPage
