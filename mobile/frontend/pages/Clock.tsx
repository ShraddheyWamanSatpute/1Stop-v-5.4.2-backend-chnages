/**
 * ESS Clock Page
 * 
 * Clock in/out functionality:
 * - Large clock button
 * - Location capture (if required)
 * - Today's time log
 * - Recent clock history
 */

"use client"

import React, { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
} from "@mui/material"
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  History as HistoryIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useESSGeolocation } from "../hooks/useMobileGeolocation"

const ESSClock: React.FC = () => {
  const theme = useTheme()
  const { state, clockIn, clockOut, clearError } = useESS()
  const { location, error: locationError, isLoading: locationLoading, requestLocation } = useESSGeolocation()

  const [isClocking, setIsClocking] = useState(false)

  // Calculate worked time
  const getWorkedTime = (): { hours: number; minutes: number; seconds: number } => {
    if (!state.clockInTime) return { hours: 0, minutes: 0, seconds: 0 }
    const diff = Date.now() - state.clockInTime
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { hours, minutes, seconds }
  }

  const workedTime = getWorkedTime()

  // Calculate time until next shift
  const getTimeUntilNextShift = (): { hours: number; minutes: number; seconds: number; hasShift: boolean; message: string } => {
    const now = Date.now()
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000)
    
    // Find all shifts that haven't started yet and are within 7 days
    const upcomingShifts = state.upcomingShifts
      .map((shift) => {
        // Parse shift date (could be string "YYYY-MM-DD" or timestamp)
        let shiftDate: Date
        if (typeof shift.date === "string") {
          shiftDate = new Date(shift.date + "T00:00:00")
        } else if (typeof shift.date === "number") {
          shiftDate = new Date(shift.date)
        } else {
          return null
        }

        // Parse start time
        const startTimeStr = shift.startTime || "00:00"
        const [hours, minutes] = startTimeStr.split(":").map(Number)
        shiftDate.setHours(hours, minutes, 0, 0)
        const shiftTime = shiftDate.getTime()

        return {
          shift,
          shiftTime,
        }
      })
      .filter((item) => {
        if (!item) return false
        // Only include shifts that are in the future and within 7 days
        return item.shiftTime > now && item.shiftTime <= sevenDaysFromNow
      })
      .sort((a, b) => a!.shiftTime - b!.shiftTime)

    // Get the next shift (first one in sorted list)
    const nextShiftItem = upcomingShifts[0]

    if (!nextShiftItem) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        hasShift: false,
        message: "No shift for next 7 days"
      }
    }

    // Calculate time until shift
    const diff = nextShiftItem.shiftTime - now

    if (diff <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        hasShift: false,
        message: "No shift for next 7 days"
      }
    }

    const totalHours = Math.floor(diff / (1000 * 60 * 60))
    const totalMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const totalSeconds = Math.floor((diff % (1000 * 60)) / 1000)

    // Format countdown message
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24

    let message = ""
    if (days > 0) {
      message = `${days}d ${hours}h ${totalMinutes}m`
    } else if (totalHours > 0) {
      message = `${totalHours}h ${totalMinutes}m ${totalSeconds}s`
    } else {
      message = `${totalMinutes}m ${totalSeconds}s`
    }

    return {
      hours: totalHours,
      minutes: totalMinutes,
      seconds: totalSeconds,
      hasShift: true,
      message: `Next shift in ${message}`
    }
  }

  // Calculate time until shift end (if clocked in)
  const getTimeUntilShiftEnd = (): { hours: number; minutes: number; seconds: number; hasShift: boolean; message: string } => {
    if (!state.isClockedIn || !state.clockInTime) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        hasShift: false,
        message: ""
      }
    }

    // Find today's shift
    const today = new Date().toISOString().split("T")[0]
    const todayShift = state.upcomingShifts.find((shift) => shift.date === today)

    if (!todayShift || !todayShift.endTime) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        hasShift: false,
        message: ""
      }
    }

    // Calculate time until shift end
    const [hours, minutes] = todayShift.endTime.split(":").map(Number)
    const shiftEndDate = new Date(today)
    shiftEndDate.setHours(hours, minutes, 0, 0)
    const shiftEndTime = shiftEndDate.getTime()
    const diff = shiftEndTime - Date.now()

    if (diff <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        hasShift: false,
        message: "Shift ended"
      }
    }

    const totalHours = Math.floor(diff / (1000 * 60 * 60))
    const totalMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const totalSeconds = Math.floor((diff % (1000 * 60)) / 1000)

    return {
      hours: totalHours,
      minutes: totalMinutes,
      seconds: totalSeconds,
      hasShift: true,
      message: `Shift ends in ${totalHours}h ${totalMinutes}m`
    }
  }

  // Update countdown every second
  const [countdown, setCountdown] = useState(getTimeUntilNextShift())
  const [shiftEndCountdown, setShiftEndCountdown] = useState(getTimeUntilShiftEnd())

  useEffect(() => {
    const timer = setInterval(() => {
      if (state.isClockedIn) {
        setShiftEndCountdown(getTimeUntilShiftEnd())
      } else {
        setCountdown(getTimeUntilNextShift())
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [state.isClockedIn, state.upcomingShifts, state.clockInTime])

  // Get error message string
  const getErrorMessage = (): string | null => {
    if (state.error) {
      const error = typeof state.error === "string" ? { message: state.error, details: "" } : state.error
      return error.details ? `${error.message}: ${error.details}` : error.message
    }
    if (locationError) {
      const error = typeof locationError === "string" ? { message: locationError, details: "" } : locationError
      return error.details ? `${error.message}: ${error.details}` : error.message
    }
    return null
  }

  const errorMessage = getErrorMessage()

  // Handle clock action - instant UI update with background location/sync
  const handleClockAction = async () => {
    clearError()
    
    // Get location in background (non-blocking for UI)
    const locationRequired = state.companySettings.clockInRequiresLocation
    let clockLocation = undefined
    
    // Start location request in background (don't wait for it)
    const locationPromise = (async () => {
      try {
        const loc = await requestLocation({ 
          timeout: 20000,
          enableHighAccuracy: true,
          maximumAge: 60000
        })
        
        if (loc) {
          return {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
          }
        }
      } catch (locError: any) {
        console.warn("Location request failed:", locError)
        
        // If timeout and location is required, try once more with lower accuracy
        if (locError?.code === 3 && locationRequired) {
          try {
            const loc = await requestLocation({ 
              timeout: 15000,
              enableHighAccuracy: false,
              maximumAge: 120000
            })
            
            if (loc) {
              return {
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy,
              }
            }
          } catch (retryError) {
            console.warn("Location retry also failed:", retryError)
          }
        }
        
        // If location is required and failed, we'll handle it in the clock function
        if (locationRequired) {
          throw locError
        }
      }
      return undefined
    })()

    // If location is required, wait for it (but with timeout)
    if (locationRequired) {
      try {
        // Wait max 5 seconds for location, then proceed anyway
        clockLocation = await Promise.race([
          locationPromise,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000))
        ])
        
        if (!clockLocation) {
          // Location timed out but we'll still try to clock in/out
          // The clock function will handle the error
        }
      } catch (error) {
        // Location failed - clock function will handle it
        console.warn("Location request failed:", error)
      }
    }

    // Call clock in/out immediately (UI updates instantly)
    // Location will be added if available, or clock function will handle error
    if (state.isClockedIn) {
      await clockOut({ location: clockLocation })
    } else {
      await clockIn({ location: clockLocation })
    }
    
    // Continue getting location in background and update if it arrives later
    if (!clockLocation && !locationRequired) {
      locationPromise.then((loc) => {
        if (loc && state.isClockedIn) {
          // Update location if we got it after clock in
          // This is a nice-to-have, not critical
        }
      }).catch(() => {
        // Ignore background location errors
      })
    }
  }

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Clock Widget with Countdown Timer */}
      <Card sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, textAlign: "center" }}>
        <CardContent sx={{ py: { xs: 3, sm: 4 } }}>
          {state.isClockedIn ? (
            <>
              {/* When Clocked In - Show Worked Time */}
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: "2rem", sm: "3rem" },
            }}
          >
                {String(workedTime.hours).padStart(2, "0")} : {String(workedTime.minutes).padStart(2, "0")} : {String(workedTime.seconds).padStart(2, "0")}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
                sx={{ fontSize: { xs: "0.8125rem", sm: "0.875rem" }, mb: 1 }}
      >
                Time worked today
              </Typography>
              {shiftEndCountdown.hasShift && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                  {shiftEndCountdown.message}
              </Typography>
              )}
            </>
          ) : (
            <>
              {/* When Not Clocked In - Show Countdown to Next Shift or Message */}
              {countdown.hasShift ? (
                <>
                  {/* Show ONLY countdown timer when shift is available */}
              <Typography 
                    variant="h2" 
                sx={{ 
                      fontWeight: 700, 
                      fontSize: { xs: "2rem", sm: "3rem" },
                      color: "primary.main",
                      letterSpacing: { xs: 1, sm: 2 },
                }}
              >
                    {String(countdown.hours).padStart(2, "0")} : {String(countdown.minutes).padStart(2, "0")} : {String(countdown.seconds).padStart(2, "0")}
              </Typography>
                </>
              ) : (
                <>
                  {/* Show ONLY message when no shift for next 7 days */}
              <Typography 
                    variant="body1" 
                color="text.secondary"
                    sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
              >
                    {countdown.message}
              </Typography>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Location Status */}
      {state.companySettings.clockInRequiresLocation && (
        <Alert
          severity={location ? "success" : "info"}
          icon={<LocationIcon />}
          sx={{ 
            mb: { xs: 2, sm: 3 }, 
            borderRadius: 2,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
          }}
        >
          {locationLoading
            ? "Getting your location..."
            : location
            ? "Location services enabled"
            : "Location required for clocking"}
        </Alert>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: { xs: 2, sm: 3 }, 
            borderRadius: 2,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
          }} 
          onClose={clearError}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Clock Button - Blue for Clock In, Red for Clock Out */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleClockAction}
        disabled={isClocking || state.isLoading}
        startIcon={
          isClocking ? (
            <CircularProgress size={20} color="inherit" />
          ) : state.isClockedIn ? (
            <ClockOutIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
          ) : (
            <ClockInIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
          )
        }
        sx={{
          py: { xs: 2.5, sm: 2 },
          minHeight: { xs: 56, sm: 48 },
          borderRadius: { xs: 2, sm: 3 },
          fontSize: { xs: "1.125rem", sm: "1.1rem" },
          fontWeight: 600,
          bgcolor: state.isClockedIn ? theme.palette.error.main : theme.palette.primary.main,
          "&:hover": {
            bgcolor: state.isClockedIn ? theme.palette.error.dark : theme.palette.primary.dark,
          },
          "&:active": {
            transform: "scale(0.98)",
          },
        }}
      >
        {isClocking ? "Processing..." : state.isClockedIn ? "Clock Out" : "Clock In"}
      </Button>

      {/* Recent Activity */}
      <Card sx={{ mt: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1.5, sm: 2 } }}>
            <HistoryIcon color="action" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: "0.9375rem", sm: "1rem" },
              }}
            >
              Recent Activity
            </Typography>
          </Box>
          <Divider sx={{ mb: { xs: 1.5, sm: 2 } }} />
          {state.recentAttendance.length > 0 ? (
            <List disablePadding>
              {state.recentAttendance.slice(0, 5).map((record, index) => (
                <ListItem key={record.id || index} disablePadding sx={{ py: { xs: 0.75, sm: 1 } }}>
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                    {record.clockIn && !record.clockOut ? (
                      <ClockInIcon color="success" sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    ) : record.clockIn && record.clockOut ? (
                      <TimeIcon color="action" sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    ) : (
                      <TimeIcon color="action" sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={new Date(record.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    secondary={
                      <>
                        {record.clockIn && (
                          <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }}>
                            <ClockInIcon sx={{ fontSize: 14 }} color="success" />
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                            >
                              Clock In: {new Date(record.clockIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </Typography>
                          </Box>
                        )}
                        {record.clockOut ? (
                          <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <ClockOutIcon sx={{ fontSize: 14 }} color="error" />
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                            >
                              Clock Out: {new Date(record.clockOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </Typography>
                          </Box>
                        ) : record.clockIn ? (
                          <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <ClockOutIcon sx={{ fontSize: 14 }} color="disabled" />
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                            >
                              In progress
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                          >
                            No clock events
                          </Typography>
                        )}
                      </>
                    }
                    primaryTypographyProps={{
                      sx: { fontSize: { xs: "0.8125rem", sm: "0.875rem" } },
                    }}
                  />
                  <Chip
                    label={record.status || "Present"}
                    size="small"
                    color={record.status === "present" ? "success" : "default"}
                    variant="outlined"
                    sx={{
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      height: { xs: 20, sm: 24 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                textAlign: "center", 
                py: 2,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              No recent activity
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default ESSClock