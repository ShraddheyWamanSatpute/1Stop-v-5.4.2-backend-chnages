"use client"

import React from "react"
import { Box, Card, CardContent, Typography, Button, Alert } from "@mui/material"
import { useSettings } from "../../backend/context/SettingsContext"

const AccountTerminated: React.FC = () => {
  const { state, logout } = useSettings()

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 560, width: "100%" }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Your account has been terminated. You no longer have access to company data.
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If you believe this is a mistake, please contact your administrator.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Signed in as: <strong>{state.auth.email || "Unknown"}</strong>
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button variant="contained" color="primary" onClick={logout}>
              Sign out
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AccountTerminated

