"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material"
import { format, parseISO, isPast, startOfDay } from "date-fns"
import { useHRContext } from "../../../backend/context/HRContext"
import type { Schedule } from "../../../backend/interfaces/HRs"
import { themeConfig } from "../../../theme/AppTheme"
import EmptyStateCard from "../reusable/EmptyStateCard"
import DataHeader from "../reusable/DataHeader"
import { useNavigate } from "react-router-dom"

type FinalizeShiftsProps = {
  embedded?: boolean
  hideRotaButton?: boolean
}

const FinalizeShifts: React.FC<FinalizeShiftsProps> = ({ embedded = false, hideRotaButton = false }) => {
  const { state: hrState, updateSchedule, refreshSchedules } = useHRContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  )
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [selectedShifts, setSelectedShifts] = useState<Schedule[]>([])
  const [editingShift, setEditingShift] = useState<Schedule | null>(null)
  const [editedShifts, setEditedShifts] = useState<Record<string, Partial<Schedule>>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDepartment, setFilterDepartment] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])

  // Defensive date parsing: some backends can return timestamps/objects instead of ISO strings.
  const coerceToDate = (value: any): Date | null => {
    if (!value) return null

    // Firestore Timestamp-like
    if (typeof value?.toDate === "function") {
      try {
        const d = value.toDate()
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
      } catch {
        return null
      }
    }

    // seconds / _seconds (Firebase Timestamp shape)
    const seconds = value?.seconds ?? value?._seconds
    if (typeof seconds === "number") {
      const d = new Date(seconds * 1000)
      return !Number.isNaN(d.getTime()) ? d : null
    }

    if (value instanceof Date) {
      return !Number.isNaN(value.getTime()) ? value : null
    }

    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value)
      return !Number.isNaN(d.getTime()) ? d : null
    }

    return null
  }

  const toISODateKey = (value: any): string | null => {
    const d = coerceToDate(value)
    if (!d) return null
    try {
      return format(d, "yyyy-MM-dd")
    } catch {
      return null
    }
  }

  const getShiftDateISO = (shift: Partial<Schedule> & { date?: any }): string | null => {
    if (typeof shift.date === "string" && shift.date) return shift.date
    return toISODateKey(shift.date)
  }

  // Navigate to Rota tab
  const handleNavigateToRota = () => {
    // Always use canonical HR route; "Rota" is the default Scheduling view.
    navigate("/HR/Scheduling")
  }

  // Filter shifts that are scheduled and the date has passed
  const shiftsToFinalize = useMemo(() => {
    const today = startOfDay(new Date())
    return hrState.schedules.filter(
      (schedule) => {
        const scheduleDateValue = coerceToDate((schedule as any).date)
        if (!scheduleDateValue) return false
        const scheduleDate = startOfDay(scheduleDateValue)
        return schedule.status === "scheduled" && isPast(scheduleDate) && scheduleDate <= today
      }
    )
  }, [hrState.schedules])

  const asString = (val: any): string => {
    if (val === null || val === undefined) return ""
    if (typeof val === "string") return val
    if (typeof val === "number" || typeof val === "boolean") return String(val)
    // Avoid React "Objects are not valid as a React child" crashes
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }

  const lower = (val: any): string => asString(val).toLowerCase()

  // Filter shifts by search and filters
  const filteredShifts = useMemo(() => {
    return shiftsToFinalize.filter((shift) => {
      const employee = hrState.employees.find(emp => emp.id === shift.employeeId)
      const employeeName = employee ? `${asString(employee.firstName)} ${asString(employee.lastName)}` : asString((shift as any).employeeName)
      
      const matchesSearch = searchTerm === "" || 
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lower((shift as any).department).includes(searchTerm.toLowerCase())
      
      const matchesDepartment = filterDepartment.length === 0 || 
        filterDepartment.includes(asString((shift as any).department))
      
      const matchesStatus = filterStatus.length === 0 || 
        filterStatus.includes(asString((shift as any).status))
      
      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [shiftsToFinalize, searchTerm, filterDepartment, filterStatus, hrState.employees])

  // Group shifts by date in chronological order
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {}
    filteredShifts.forEach((shift) => {
      const date = getShiftDateISO(shift as any)
      if (!date) return
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(shift)
    })
    // Sort dates chronologically
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })
    const sortedGrouped: Record<string, Schedule[]> = {}
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date]
    })
    return sortedGrouped
  }, [filteredShifts])

  // Get shifts for selected date
  const selectedDateShifts = useMemo(() => {
    return shiftsByDate[selectedDate] || []
  }, [shiftsByDate, selectedDate])

  // Get all unique dates
  const availableDates = useMemo(() => {
    return Object.keys(shiftsByDate).sort().reverse()
  }, [shiftsByDate])

  const handleSaveShift = useCallback(async (shift: Schedule) => {
    setLoading(true)
    try {
      const editedData = editedShifts[shift.id] || {}
      await updateSchedule(shift.id, {
        ...shift,
        ...editedData,
        updatedAt: new Date().toISOString(),
      })
      await refreshSchedules()
      
      // Remove from edited shifts
      setEditedShifts(prev => {
        const next = { ...prev }
        delete next[shift.id]
        return next
      })
      
      setNotification({
        message: "Shift updated successfully",
        type: "success",
      })
    } catch (error) {
      console.error("Error updating shift:", error)
      setNotification({
        message: "Failed to update shift",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [editedShifts, updateSchedule, refreshSchedules])

  const handleSaveAll = useCallback(async () => {
    setLoading(true)
    try {
      const promises = Object.entries(editedShifts).map(async ([shiftId, editedData]) => {
        const shift = shiftsToFinalize.find(s => s.id === shiftId)
        if (!shift) return
        return await updateSchedule(shiftId, {
          ...shift,
          ...editedData,
          updatedAt: new Date().toISOString(),
        })
      })

      await Promise.all(promises)
      await refreshSchedules()
      
      setEditedShifts({})
      setNotification({
        message: `Successfully updated ${Object.keys(editedShifts).length} shift(s)`,
        type: "success",
      })
    } catch (error) {
      console.error("Error updating shifts:", error)
      setNotification({
        message: "Failed to update shifts",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [editedShifts, shiftsToFinalize, updateSchedule, refreshSchedules])

  const handleFinalize = useCallback(async () => {
    if (selectedShifts.length === 0) return

    setLoading(true)
    try {
      const promises = selectedShifts.map(async (shift) => {
        return await updateSchedule(shift.id, {
          ...shift,
          status: "finalized",
          updatedAt: new Date().toISOString(),
        })
      })

      await Promise.all(promises)
      await refreshSchedules()

      setNotification({
        message: `Successfully finalized ${selectedShifts.length} shift(s)`,
        type: "success",
      })
      setFinalizeDialogOpen(false)
      setSelectedShifts([])
    } catch (error) {
      console.error("Error finalizing shifts:", error)
      setNotification({
        message: "Failed to finalize shifts",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedShifts, updateSchedule, refreshSchedules])

  const handleSelectShift = (shift: Schedule) => {
    setSelectedShifts((prev) => {
      const exists = prev.find((s) => s.id === shift.id)
      if (exists) {
        return prev.filter((s) => s.id !== shift.id)
      } else {
        return [...prev, shift]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedShifts.length === selectedDateShifts.length) {
      setSelectedShifts([])
    } else {
      setSelectedShifts([...selectedDateShifts])
    }
  }

  const formatTime = (timeValue?: any): string => {
    // For time inputs, an empty string is the only safe "no value" (type="time" rejects "--:--").
    if (!timeValue) return ""
    const timeString = asString(timeValue)
    try {
      // Handle both ISO string and time-only string
      if (timeString.includes("T")) {
        return format(parseISO(timeString), "HH:mm")
      }
      // If it's just a time string like "09:00", return as is
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        return timeString
      }
      return timeString
    } catch {
      return timeString
    }
  }

  const formatLocation = (location?: any): string => {
    if (!location) return ""
    if (typeof location !== "string") return asString(location)
    // If location is a JSON string, try to parse it
    try {
      const parsed = JSON.parse(location)
      if (parsed.latitude && parsed.longitude) {
        return `${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`
      }
    } catch {
      // If not JSON, return as is
    }
    return location
  }

  const calculateActualHours = (shift: Schedule): number => {
    if (shift.actualHours) return shift.actualHours
    if (shift.clockInTime && shift.clockOutTime) {
      try {
        const shiftDateISO = getShiftDateISO(shift as any)
        if (!shiftDateISO) return 0
        const clockIn = shift.clockInTime.includes("T")
          ? parseISO(shift.clockInTime)
          : new Date(`${shiftDateISO}T${shift.clockInTime}`)
        const clockOut = shift.clockOutTime.includes("T")
          ? parseISO(shift.clockOutTime)
          : new Date(`${shiftDateISO}T${shift.clockOutTime}`)
        const diffMs = clockOut.getTime() - clockIn.getTime()
        return diffMs / (1000 * 60 * 60) // Convert to hours
      } catch {
        return 0
      }
    }
    return 0
  }

  const handleEditShift = (shift: Schedule, field: string, value: any) => {
    setEditedShifts(prev => ({
      ...prev,
      [shift.id]: {
        ...prev[shift.id],
        [field]: value
      }
    }))
  }

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      <DataHeader
        title="Finalize Shifts"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees..."
        filters={[
          {
            label: "Department",
            options: [...new Set(shiftsToFinalize.map((s: any) => asString(s.department)).filter(Boolean))].map((dept) => ({ id: dept, name: dept })),
            selectedValues: filterDepartment,
            onSelectionChange: setFilterDepartment
          },
          {
            label: "Status",
            options: [
              { id: "scheduled", name: "Scheduled" },
              { id: "completed", name: "Completed" }
            ],
            selectedValues: filterStatus,
            onSelectionChange: setFilterStatus
          }
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        onRefresh={() => refreshSchedules()}
        additionalButtons={[
          ...(!hideRotaButton ? [{
            label: "Rota",
            icon: <CalendarMonthIcon />,
            onClick: handleNavigateToRota,
            variant: "outlined" as const,
            color: "primary" as const
          }] : []),
          ...(Object.keys(editedShifts).length > 0 ? [{
            label: `Save All (${Object.keys(editedShifts).length})`,
            icon: <SaveIcon />,
            onClick: handleSaveAll,
            variant: "contained" as const,
            color: "success" as const
          }] : [])
        ]}
      />

      {Object.keys(shiftsByDate).length === 0 ? (
        <EmptyStateCard
          icon={CalendarMonthIcon}
          title="No shifts available for finalization"
          description="Only scheduled shifts with dates in the past are shown."
          cardSx={{ maxWidth: 560, boxShadow: "none" }}
        />
      ) : (
        <>
          {Object.entries(shiftsByDate).map(([date, dateShifts]) => (
            <Box key={date} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {format(new Date(date), "EEEE, MMMM dd, yyyy")}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Shift Time</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <AccessTimeIcon fontSize="small" />
                          Clock In
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <AccessTimeIcon fontSize="small" />
                          Clock Out
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocationOnIcon fontSize="small" />
                          Clock In Location
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocationOnIcon fontSize="small" />
                          Clock Out Location
                        </Box>
                      </TableCell>
                      <TableCell>Actual Hours</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dateShifts.map((shift) => {
                      const editedData = editedShifts[shift.id] || {}
                      const displayShift = { ...shift, ...editedData }
                      const actualHours = calculateActualHours(displayShift)
                      const employeeNameText = asString((displayShift as any).employeeName)
                      const departmentText = asString((displayShift as any).department)

                      return (
                        <TableRow key={shift.id} hover>
                          <TableCell>{employeeNameText}</TableCell>
                          <TableCell>{departmentText}</TableCell>
                          <TableCell>
                            {(formatTime((displayShift as any).startTime) || "--:--")} - {(formatTime((displayShift as any).endTime) || "--:--")}
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="time"
                              value={formatTime((displayShift as any).clockInTime) || ""}
                              onChange={(e) => handleEditShift(shift, "clockInTime", e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="time"
                              value={formatTime((displayShift as any).clockOutTime) || ""}
                              onChange={(e) => handleEditShift(shift, "clockOutTime", e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={formatLocation((displayShift as any).clockInLocation) || ""}
                              onChange={(e) => handleEditShift(shift, "clockInLocation", e.target.value)}
                              placeholder="Location"
                              sx={{ minWidth: 150 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={formatLocation((displayShift as any).clockOutLocation) || ""}
                              onChange={(e) => handleEditShift(shift, "clockOutLocation", e.target.value)}
                              placeholder="Location"
                              sx={{ minWidth: 150 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {actualHours.toFixed(2)}h
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSaveShift(shift)}
                              disabled={!editedShifts[shift.id]}
                              title="Save changes"
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </>
      )}

      {/* Finalize Confirmation Dialog */}
      <Dialog
        open={finalizeDialogOpen}
        onClose={() => !loading && setFinalizeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Finalize Shifts</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to finalize {selectedShifts.length} shift(s)?
            This action will mark the shifts as finalized and they will be ready
            for approval.
          </Typography>
          <Box sx={{ mt: 2 }}>
            {selectedShifts.slice(0, 5).map((shift) => (
              <Typography key={shift.id} variant="body2" sx={{ mb: 0.5 }}>
                • {shift.employeeName} - {format(new Date(shift.date), "MMM dd")}
              </Typography>
            ))}
            {selectedShifts.length > 5 && (
              <Typography variant="body2" color="text.secondary">
                ...and {selectedShifts.length - 5} more
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setFinalizeDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFinalize}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Finalizing..." : "Finalize"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.type || "info"}
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default FinalizeShifts


