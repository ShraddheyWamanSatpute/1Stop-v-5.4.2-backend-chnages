"use client"

import React from "react"
import { Box } from "@mui/material"
import AICalendarIntegration from "./AICalendarIntegration"

/**
 * AI Calendar Route Component
 * 
 * This is a simple route wrapper for the AI Calendar Integration.
 * It can be easily added to your existing routing system.
 * 
 * Usage in your router:
 * ```tsx
 * <Route path="/HR/AICalendar" element={<AICalendarRoute />} />
 * ```
 */
const AICalendarRoute: React.FC = () => {
  const handleNavigation = (route: string) => {
    // Handle navigation to other HR routes
    console.log('Navigate to:', route)
    // You can integrate with your existing router here
    // For example: router.push(route)
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AICalendarIntegration onNavigate={handleNavigation} />
    </Box>
  )
}

export default AICalendarRoute
