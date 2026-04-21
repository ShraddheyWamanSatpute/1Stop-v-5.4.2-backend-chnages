/**
 * ESS Holidays Page
 * 
 * View holiday entitlement and history:
 * - Total/Used/Remaining balance
 * - Holiday history
 * - Public holidays calendar
 */

"use client"

import React from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
} from "@mui/material"
import {
  Event as EventIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { EmptyState } from "../components"

const ESSHolidays: React.FC = () => {
  const theme = useTheme()
  const { state } = useESS()

  // Combine approved and pending time off for holiday history
  const holidayHistory = [...state.approvedTimeOff, ...state.pendingTimeOff]
    .filter((req: any) => req.type === "vacation" || req.type === "holiday")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  // Format date
  const formatDate = (date: string | number): string => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <ApprovedIcon sx={{ color: "success.main" }} />
      case "pending":
        return <PendingIcon sx={{ color: "warning.main" }} />
      case "rejected":
        return <RejectedIcon sx={{ color: "error.main" }} />
      default:
        return <EventIcon color="action" />
    }
  }

  // Calculate percentage used
  const percentageUsed = state.holidayBalance.total > 0
    ? (state.holidayBalance.used / state.holidayBalance.total) * 100
    : 0

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Holiday Balance Card */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          {/* Balance Stats - Showing: Accrued, Used, Remaining */}
          <Box sx={{ display: "flex", justifyContent: "space-around", textAlign: "center", mb: 3 }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: "text.secondary" }}>
                {state.holidayBalance.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Accrued
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {state.holidayBalance.used}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Taken
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main" }}>
                {state.holidayBalance.remaining}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Remaining
              </Typography>
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {percentageUsed.toFixed(0)}% used
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {state.holidayBalance.pending} pending
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentageUsed}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: theme.palette.grey[200],
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Holiday History - No tabs, just show history directly */}
      <Box>
        {holidayHistory.length > 0 ? (
          <Card sx={{ borderRadius: 3 }}>
            <List disablePadding>
              {holidayHistory.map((holiday, index) => (
                <React.Fragment key={holiday.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemIcon>{getStatusIcon(holiday.status)}</ListItemIcon>
                    <ListItemText
                      primary={`${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}`}
                      secondary={`${holiday.totalDays} day${holiday.totalDays !== 1 ? "s" : ""}`}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={holiday.status}
                      size="small"
                      color={
                        holiday.status === "approved"
                          ? "success"
                          : holiday.status === "pending"
                          ? "warning"
                          : "error"
                      }
                      variant="outlined"
                    />
                  </ListItem>
                  {index < holidayHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        ) : (
          <EmptyState
            icon={<CalendarIcon sx={{ fontSize: 48 }} />}
            title="No Holiday History"
            description="Your approved and pending holiday requests will appear here."
          />
        )}
      </Box>
    </Box>
  )
}

export default ESSHolidays