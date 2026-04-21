"use client"

import React from "react"
import { Box } from "@mui/material"
import BookingSettings from "./BookingSettings"

/**
 * Compatibility wrapper: legacy routes render `BookingSettingsTabs`.
 * Settings UI is now consolidated into `BookingSettings` (General / Integrations / Profile).
 */
const BookingSettingsTabs: React.FC = () => {
  return (
    <Box sx={{ width: "100%" }}>
      <BookingSettings />
    </Box>
  )
}

export default BookingSettingsTabs

