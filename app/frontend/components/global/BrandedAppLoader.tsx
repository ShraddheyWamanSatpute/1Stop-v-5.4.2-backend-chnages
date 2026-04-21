import React from "react"
import { Box, CircularProgress, Typography } from "@mui/material"
import { themeConfig } from "../../../theme/AppTheme"

interface BrandedAppLoaderProps {
  message?: string
  children?: React.ReactNode
}

const BrandedAppLoader: React.FC<BrandedAppLoaderProps> = ({ message = "Loading 1Stop...", children }) => {
  const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")
  const logoSrc = `${baseUrl}images/logo.png`

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: themeConfig.brandColors.navy,
        zIndex: 20000,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Box sx={{ position: "relative", width: 140, height: 140 }}>
          {/* Center logo (same as browser tab favicon) */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Box
              component="img"
              src={logoSrc}
              alt="1 Stop"
              sx={{
                width: 96,
                height: 96,
                objectFit: "contain",
                // Flat on the background (no radius/shadow) and gently blended
                borderRadius: 0,
                boxShadow: "none",
                opacity: 0.92,
              }}
              onError={(e) => {
                e.currentTarget.src = logoSrc
              }}
            />
          </Box>

          {/* Spinner ring (render above logo) */}
          <CircularProgress
            size={140}
            thickness={3.5}
            disableShrink
            sx={{
              color: themeConfig.brandColors.offWhite,
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 2,
              animationDuration: "1.8s",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{
            mt: 1,
            color: themeConfig.brandColors.offWhite,
            fontWeight: 600,
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          {message}
        </Typography>

        {children}
      </Box>
    </Box>
  )
}

export default BrandedAppLoader

