"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useEffect } from "react"
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material"
import {
  AccessTime as AccessTimeIcon,
  MyLocation as MyLocationIcon,
  LocationOff as LocationOffIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
// Company state is now handled through HRContext
// Functions now accessed through HRContext

interface ClockInOutFeatureProps {
  employeeId: string
  compact?: boolean
}

interface ClockEvent {
  id: string
  employeeId: string
  type: "in" | "out"
  timestamp: number
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
  notes?: string
  createdAt: number
}

const ClockInOutFeature: React.FC<ClockInOutFeatureProps> = ({ employeeId, compact = false }) => {
  // Using HR context for employee and announcements
  const { state: hrState, addAttendance } = useHR()
  // Company state is now handled through HRContext

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([])
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [lastClockEvent, setLastClockEvent] = useState<ClockEvent | null>(null)
  const employee = hrState.employees.find((e) => e.id === employeeId)
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [clockOutNotes, setClockOutNotes] = useState("")
  const [feedbackQuestions] = useState<string[]>([
    "How was your shift today?",
    "Any issues to report?",
    "Do you have suggestions for improvement?",
  ])
  const [shiftFeedback, setShiftFeedback] = useState<Record<string, string>>({})

  // Auto clock-out if configured
  useEffect(() => {
    if (!isClockedIn || !employee?.clockInSettings?.autoClockOut || !employee.clockInSettings.autoClockOutTime) return
    // Build today's auto clock-out Date
    const [h, m] = employee.clockInSettings.autoClockOutTime.split(":").map(Number)
    const now = new Date()
    const auto = new Date(now)
    auto.setHours(h || 0, m || 0, 0, 0)
    const delay = auto.getTime() - now.getTime()
    if (delay <= 0) {
      // If time already passed, clock out immediately
      handleClockAction("out")
      return
    }
    const t = setTimeout(() => {
      handleClockAction("out")
    }, delay)
    return () => clearTimeout(t)
  }, [isClockedIn, employee?.clockInSettings?.autoClockOut, employee?.clockInSettings?.autoClockOutTime])

  // Load clock events for the employee
  useEffect(() => {
    // Company state handled internally
    if (!employeeId) return

    const fetchClockEvents = async () => {
      setLoading(true)
      try {
        // Using attendance data from HRContext
        const events = hrState.attendances || []
        
        // Filter the events for the specific employee and convert to ClockEvent format
        const eventsArray = Array.isArray(events) ? events : []
        const filteredEvents = eventsArray
          .filter((event) => event.employeeId === employeeId)
          .map((event): ClockEvent => ({
            id: event.id,
            employeeId: event.employeeId,
            type: event.clockOut ? "out" : "in",
            timestamp: event.date,
            location: { latitude: 0, longitude: 0, accuracy: 0 }, // Default location
            notes: event.notes || "",
            createdAt: event.date
          }))

        if (filteredEvents && filteredEvents.length > 0) {
          // Sort by timestamp descending
          const sortedEvents = [...filteredEvents].sort((a, b) => b.timestamp - a.timestamp)
          setClockEvents(sortedEvents)

          // Check if the employee is currently clocked in
          const lastEvent = sortedEvents[0]
          setLastClockEvent(lastEvent)
          setIsClockedIn(lastEvent?.type === "in")
        } else {
          setClockEvents([])
          setIsClockedIn(false)
          setLastClockEvent(null)
        }
      } catch (err) {
        setError("Failed to load clock events. Please try again.")
        console.error("Error fetching clock events:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchClockEvents()
  }, [employeeId]) // Company state handled internally

  // Check for location permission status
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setLocationPermission(result.state as "granted" | "denied" | "prompt")

        // Listen for permission changes
        result.addEventListener("change", () => {
          setLocationPermission(result.state as "granted" | "denied" | "prompt")
        })
        return () => {
          result.removeEventListener("change", () => {
            setLocationPermission(result.state as "granted" | "denied" | "prompt")
          })
        }
      })
    }
  }, [])

  const requestLocation = () => {
    setIsRequestingLocation(true)
    setLocationError(null)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position)
          setIsRequestingLocation(false)
          setShowLocationDialog(true)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationError(
            error.code === 1
              ? "Location permission denied. Please enable location services."
              : "Could not get your location. Please try again."
          )
          setIsRequestingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setLocationError("Geolocation is not supported by your browser")
      setIsRequestingLocation(false)
    }
  }

  const handleClockAction = async (type: "in" | "out") => {
    // Company state handled internally
    if (!employeeId) {
      setError("Missing required information. Please try again.")
      return
    }

    if (!currentLocation && type === "in") {
      requestLocation()
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create location object from GeolocationPosition
      let locationData = null;
      if (currentLocation) {
        locationData = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        };
      }
      
      const clockEvent: ClockEvent = {
        id: `clock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        type,
        timestamp: Date.now(),
        location: locationData,
        notes: type === "out" ? clockOutNotes : "",
        createdAt: Date.now()
      }

      // Convert ClockEvent to Attendance format and save to database using HRContext
      const attendanceData = {
        employeeId: clockEvent.employeeId,
        date: clockEvent.timestamp,
        clockIn: type === "in" ? new Date(clockEvent.timestamp).toISOString() : "",
        clockOut: type === "out" ? new Date(clockEvent.timestamp).toISOString() : undefined,
        status: "present" as const,
        notes: clockEvent.notes,
        createdAt: Date.now()
      }
      await addAttendance(attendanceData)

      // Update local state
      setClockEvents([clockEvent, ...clockEvents])
      setIsClockedIn(type === "in")
      setLastClockEvent(clockEvent)
      setSuccess(`Successfully clocked ${type}.`)
      setShowLocationDialog(false)
      setCurrentLocation(null)
      setClockOutNotes("")
    } catch (err) {
      setError(`Failed to clock ${type}. Please try again.`)
      console.error(`Error clocking ${type}:`, err)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = () => {
    requestLocation()
  }

  const handleClockOut = () => {
    setShowLocationDialog(true)
  }

  const confirmClockAction = (type: "in" | "out") => {
    handleClockAction(type)
  }

  const cancelClockAction = () => {
    setShowLocationDialog(false)
    setCurrentLocation(null)
    setClockOutNotes("")
  }

  const content = (
    <>
      {!compact && (
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <AccessTimeIcon sx={{ mr: 1, color: themeConfig.brandColors.navy }} />
          <Typography variant="h6">Clock In/Out</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Chip
            label={isClockedIn ? "Clocked In" : "Clocked Out"}
            color={isClockedIn ? "success" : "default"}
            sx={{ mr: 1, fontSize: '1rem', height: '32px', '& .MuiChip-label': { fontSize: '1rem' } }}
          />
          {lastClockEvent && (
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
              {format(new Date(lastClockEvent.timestamp), "dd MMM yyyy, HH:mm:ss")}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={loading || isClockedIn}
          onClick={handleClockIn}
          startIcon={<AccessTimeIcon />}
          fullWidth
        >
          Clock In
        </Button>
        <Button
          variant="outlined"
          color="primary"
          disabled={loading || !isClockedIn}
          onClick={handleClockOut}
          startIcon={<AccessTimeIcon />}
          fullWidth
        >
          Clock Out
        </Button>
      </Box>

      {!compact && (
        <>
          {/* Targeted Clock-in Announcements */}
          {hrState.announcements && hrState.announcements.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Announcements</Typography>
              {hrState.announcements
                .filter((a: any) => {
                  const now = Date.now()
                  const active = a.active !== false && a.publishDate <= now && (!a.expiryDate || a.expiryDate >= now)
                  if (!active) return false
                  if (a.audience === 'All') return true
                  if (a.audience === 'Department') return a.audienceTarget && a.audienceTarget === employee?.department
                  if (a.audience === 'Role') return a.audienceTarget && a.audienceTarget === (employee?.role?.label || employee?.role)
                  if (a.audience === 'Location') return true // site-wide
                  return false
                })
                .slice(0, 3)
                .map((a: any) => (
                  <Alert key={a.id} severity={(a.priority || 'info').toLowerCase() as any} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{a.title}</Typography>
                    <Typography variant="caption">{a.content}</Typography>
                  </Alert>
                ))}
            </Box>
          )}

          {locationPermission === "denied" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Location permission is denied. Please enable location services in your browser settings to use the clock in/out
              feature.
            </Alert>
          )}

          {locationError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocationError(null)}>
              {locationError}
            </Alert>
          )}

          {clockEvents.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                {clockEvents.slice(0, 5).map((event) => (
                  <Box
                    key={event.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {event.type === "in" ? "Clocked In" : "Clocked Out"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(event.timestamp), "dd MMM yyyy, HH:mm:ss")}
                      </Typography>
                    </Box>
                    {event.location ? (
                      <Chip
                        icon={<MyLocationIcon />}
                        label="Location Shared"
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        icon={<LocationOffIcon />}
                        label="No Location"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Location Permission Dialog */}
      <Dialog open={showLocationDialog} onClose={cancelClockAction} maxWidth="sm" fullWidth>
        <DialogTitle>{isClockedIn ? "Clock Out" : "Clock In"} with Location</DialogTitle>
        <DialogContent>
          {isRequestingLocation ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
              <Typography>Requesting your location...</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body1" paragraph>
                {isClockedIn
                  ? "You are about to clock out. Your current location will be recorded."
                  : "You are about to clock in. Your current location will be recorded."}
              </Typography>

              {currentLocation && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Location Details:
                  </Typography>
                  <Typography variant="body2">
                    Latitude: {currentLocation.coords.latitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2">
                    Longitude: {currentLocation.coords.longitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2">
                    Accuracy: ±{Math.round(currentLocation.coords.accuracy)} meters
                  </Typography>
                </Box>
              )}

              {isClockedIn && (
                <>
                  <TextField
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    fullWidth
                    value={clockOutNotes}
                    onChange={(e) => setClockOutNotes(e.target.value)}
                    placeholder="Add any notes about your shift..."
                    sx={{ mt: 2, mb: 2 }}
                  />
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Shift Feedback
                  </Typography>
                  {feedbackQuestions.map((q) => (
                    <TextField
                      key={q}
                      fullWidth
                      label={q}
                      value={shiftFeedback[q] || ""}
                      onChange={(e) => setShiftFeedback((prev) => ({ ...prev, [q]: e.target.value }))}
                      multiline
                      rows={2}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClockAction} disabled={isRequestingLocation}>
            Cancel
          </Button>
          <Button
            onClick={() => confirmClockAction(isClockedIn ? "out" : "in")}
            variant="contained"
            color="primary"
            disabled={isRequestingLocation}
            startIcon={<MyLocationIcon />}
          >
            Confirm {isClockedIn ? "Clock Out" : "Clock In"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )

  return compact ? content : <Paper sx={{ p: 3, mb: 3 }}>{content}</Paper>
}

export default ClockInOutFeature
