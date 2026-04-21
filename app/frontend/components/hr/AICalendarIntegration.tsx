"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React from "react"
import { Box, Typography, Paper, Button, Alert } from "@mui/material"
import { AutoFixHigh as AutoFixHighIcon, CalendarToday as CalendarTodayIcon } from "@mui/icons-material"
import AICalendarSchedule from "./AICalendarSchedule"

interface AICalendarIntegrationProps {
  onNavigate?: (route: string) => void
}

/**
 * AI Calendar Integration Component
 * 
 * This component provides a standalone AI-powered calendar schedule management system
 * that integrates booking data, employee schedules, and AI learning capabilities.
 * 
 * Features:
 * - Calendar view with booking and schedule integration
 * - Drag-and-drop schedule editing
 * - AI learning from user adjustments
 * - Booking demand analysis
 * - Intelligent scheduling suggestions
 */
const AICalendarIntegration: React.FC<AICalendarIntegrationProps> = ({
  onNavigate
}) => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AutoFixHighIcon sx={{ fontSize: 40, color: themeConfig.brandColors.navy }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              AI Calendar Schedule Manager
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Intelligent schedule management with booking integration and machine learning
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>AI Learning Active:</strong> The system learns from your schedule adjustments to improve future suggestions. 
            Enable AI Learning to help the system understand your scheduling preferences.
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<CalendarTodayIcon />}
            onClick={() => onNavigate?.('/HR/Scheduling')}
          >
            View Standard Schedule Manager
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutoFixHighIcon />}
            onClick={() => {
              // Scroll to AI insights section
              const insightsButton = document.querySelector('[data-ai-insights]')
              if (insightsButton) {
                insightsButton.scrollIntoView({ behavior: 'smooth' })
              }
            }}
          >
            View AI Insights
          </Button>
        </Box>
      </Paper>

      {/* Main AI Calendar Component */}
      <AICalendarSchedule />
    </Box>
  )
}

export default AICalendarIntegration
