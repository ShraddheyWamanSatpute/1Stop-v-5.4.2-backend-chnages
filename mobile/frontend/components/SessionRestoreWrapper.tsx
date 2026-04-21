/**
 * ESS Session Restore Wrapper
 * 
 * Handles session restoration at app startup.
 * Must be placed inside all required context providers.
 */

"use client"

import React from "react"
import { Box, CircularProgress } from "@mui/material"
import { useESSSessionRestore } from "../hooks/useMobileSessionRestore"

interface ESSSessionRestoreWrapperProps {
  children: React.ReactNode
}

const ESSSessionRestoreWrapper: React.FC<ESSSessionRestoreWrapperProps> = ({
  children,
}) => {
  const { isRestoring } = useESSSessionRestore()

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return <>{children}</>
}

export default ESSSessionRestoreWrapper