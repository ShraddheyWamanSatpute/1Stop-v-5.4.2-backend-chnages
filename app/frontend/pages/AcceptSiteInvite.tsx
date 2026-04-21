"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Box, Card, CardContent, Typography, Button, CircularProgress, Alert, Container, Divider } from "@mui/material"
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Email as EmailIcon,
} from "@mui/icons-material"
import { useSettings } from "../../backend/context/SettingsContext"
import { useCompany } from "../../backend/context/CompanyContext"
import type { SiteInvite } from "../../backend/interfaces/Company"
import { isMobilePhone } from "../../utils/deviceDetection"

const AcceptSiteInvite: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state } = useSettings()
  const { getSiteInviteByCode, acceptSiteInvite } = useCompany()

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invite, setInvite] = useState<SiteInvite | null>(null)

  useEffect(() => {
    const inviteCode = searchParams.get("code")

    if (!inviteCode) {
      setError("No invite code provided")
      setLoading(false)
      return
    }

    const loadInvite = async () => {
      try {
        const inviteData = await getSiteInviteByCode(inviteCode)

        if (!inviteData) {
          setError("Invalid invite code")
          return
        }

        if (inviteData.status !== "pending") {
          setError("This invite has already been used or cancelled")
          return
        }

        if (inviteData.expiresAt < Date.now()) {
          setError("This invite has expired")
          return
        }

        setInvite(inviteData)
      } catch (err) {
        console.error("Error loading invite:", err)
        setError("Failed to load invite details")
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [searchParams])

  const handleAcceptInvite = async () => {
    if (!invite || !state.auth.uid) {
      setError("Unable to accept invite. Please make sure you are logged in.")
      return
    }

    setAccepting(true)
    setError(null)

    try {
      if (!state.auth.uid) {
        setError("User not authenticated. Please log in and try again.")
        return
      }
      const result = await acceptSiteInvite(invite.code, state.auth.uid!)

      if (result.success) {
        setSuccess(true)
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate(isMobilePhone() ? "/Mobile/Dashboard" : "/")
        }, 3000)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error("Error accepting invite:", err)
      setError("Failed to accept invite. Please try again.")
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    navigate("/")
  }

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography>Loading invite details...</Typography>
        </Box>
      </Container>
    )
  }

  if (!state.auth.isLoggedIn) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Card>
            <CardContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You need to be logged in to accept this invite.
              </Alert>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <Button variant="contained" onClick={() => navigate("/Login")}>
                  Login
                </Button>
                <Button variant="outlined" onClick={() => navigate("/Register")}>
                  Register
                </Button>
                <Button variant="text" onClick={() => navigate("/JoinCompany" + (searchParams.get("code") ? `?code=${encodeURIComponent(searchParams.get("code")!)}` : ""))}>
                  Use Join Company Flow
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Card>
          <CardContent>
            {error ? (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Button variant="outlined" onClick={() => navigate("/")}>
                    Go to Dashboard
                  </Button>
                </Box>
              </>
            ) : success ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Successfully joined {invite?.companyName}! Redirecting to dashboard...
                </Alert>
                <Typography variant="body2" align="center" color="text.secondary">
                  You will be redirected in a few seconds...
                </Typography>
              </>
            ) : invite ? (
              <>
                <Typography variant="h5" gutterBottom align="center">
                  Site Invitation
                </Typography>

                <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  You've been invited to join a site. Review the details below:
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6">{invite.companyName}</Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <LocationIcon color="action" />
                    <Typography variant="body1">
                      {invite.siteName}
                      {invite.subsiteName && ` - ${invite.subsiteName}`}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <PersonIcon color="action" />
                    <Typography variant="body1">Role: {invite.role}</Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <EmailIcon color="action" />
                    <Typography variant="body1">Department: {invite.department}</Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Invited for: <strong>{invite.email}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expires: <strong>{new Date(invite.expiresAt).toLocaleDateString()}</strong>
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAcceptInvite}
                    disabled={accepting}
                    startIcon={accepting ? <CircularProgress size={20} /> : null}
                  >
                    {accepting ? "Accepting..." : "Accept Invitation"}
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={handleDecline} disabled={accepting}>
                    Decline
                  </Button>
                </Box>
              </>
            ) : (
              <Typography>Loading...</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default AcceptSiteInvite
