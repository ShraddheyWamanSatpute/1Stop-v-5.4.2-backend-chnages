"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Paper,
  Stack,


} from "@mui/material"
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Restaurant as RestaurantIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Notes as NotesIcon,
} from "@mui/icons-material"
import { THEME_COLORS } from "../../styles/themeColors"

interface FloorFriendRunsheetProps {
  bookings: any[]
}

// Utility to get field value case-insensitively
const getFieldValue = (obj: any, field: string): any => {
  if (!obj) return undefined
  const lowerCaseField = field.toLowerCase()
  const matchingKey = Object.keys(obj).find((key) => key.toLowerCase() === lowerCaseField)
  return matchingKey ? obj[matchingKey] : undefined
}

// Get status color
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return THEME_COLORS.success
    case 'pending':
      return THEME_COLORS.warning
    case 'cancelled':
      return THEME_COLORS.error
    case 'seated':
      return THEME_COLORS.lightBlue
    case 'completed':
      return THEME_COLORS.navy
    default:
      return THEME_COLORS.divider
  }
}

const FloorFriendRunsheet: React.FC<FloorFriendRunsheetProps> = ({ bookings }) => {
  const [globalSearch, setGlobalSearch] = useState("")
  const [runsheetSort, setRunsheetSort] = useState("time")
  const [selectedWaiters, setSelectedWaiters] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const normalizedSearch = globalSearch.toLowerCase()

  // Get unique waiters and statuses from bookings
  const { assignedWaiters, availableStatuses } = useMemo(() => {
    const waitersSet = new Set<string>()
    const statusesSet = new Set<string>()
    
    bookings.forEach((booking) => {
      const assignedTo = getFieldValue(booking, "assignedTo") || 
                        getFieldValue(booking, "assigned to") || 
                        getFieldValue(booking, "waiter") ||
                        getFieldValue(booking, "staff")
      if (assignedTo) waitersSet.add(String(assignedTo).trim())
      
      const status = getFieldValue(booking, "status") || 
                    getFieldValue(booking, "bookingStatus") ||
                    "pending"
      if (status) statusesSet.add(String(status).trim())
    })
    
    return {
      assignedWaiters: Array.from(waitersSet),
      availableStatuses: Array.from(statusesSet)
    }
  }, [bookings])

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter((booking) => {
      // Global search filter
      if (normalizedSearch) {
        const searchableFields = [
          getFieldValue(booking, "customerName"),
          getFieldValue(booking, "name"),
          getFieldValue(booking, "phone"),
          getFieldValue(booking, "email"),
          getFieldValue(booking, "notes"),
          getFieldValue(booking, "tableNumber"),
          getFieldValue(booking, "assignedTo"),
        ]
        
        const matchesSearch = searchableFields.some(field => 
          String(field || "").toLowerCase().includes(normalizedSearch)
        )
        if (!matchesSearch) return false
      }

      // Waiter filter
      if (selectedWaiters.length > 0) {
        const assignedTo = getFieldValue(booking, "assignedTo") || 
                          getFieldValue(booking, "assigned to") || 
                          getFieldValue(booking, "waiter") ||
                          getFieldValue(booking, "staff")
        if (!selectedWaiters.includes(String(assignedTo || ""))) return false
      }

      // Status filter
      if (selectedStatuses.length > 0) {
        const status = getFieldValue(booking, "status") || 
                      getFieldValue(booking, "bookingStatus") ||
                      "pending"
        if (!selectedStatuses.includes(String(status || ""))) return false
      }

      return true
    })

    // Sort bookings
    filtered.sort((a, b) => {
      switch (runsheetSort) {
        case "time":
          const timeA = getFieldValue(a, "time") || getFieldValue(a, "bookingTime") || ""
          const timeB = getFieldValue(b, "time") || getFieldValue(b, "bookingTime") || ""
          return timeA.localeCompare(timeB)
        case "table":
          const tableA = getFieldValue(a, "tableNumber") || ""
          const tableB = getFieldValue(b, "tableNumber") || ""
          return String(tableA).localeCompare(String(tableB))
        case "name":
          const nameA = getFieldValue(a, "customerName") || getFieldValue(a, "name") || ""
          const nameB = getFieldValue(b, "customerName") || getFieldValue(b, "name") || ""
          return String(nameA).localeCompare(String(nameB))
        case "status":
          const statusA = getFieldValue(a, "status") || getFieldValue(a, "bookingStatus") || ""
          const statusB = getFieldValue(b, "status") || getFieldValue(b, "bookingStatus") || ""
          return String(statusA).localeCompare(String(statusB))
        default:
          return 0
      }
    })

    return filtered
  }, [bookings, normalizedSearch, selectedWaiters, selectedStatuses, runsheetSort])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <RestaurantIcon />
        Runsheet
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search bookings"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort by</InputLabel>
              <Select
                value={runsheetSort}
                label="Sort by"
                onChange={(e) => setRunsheetSort(e.target.value)}
              >
                <MenuItem value="time">Time</MenuItem>
                <MenuItem value="table">Table</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Waiter</InputLabel>
              <Select
                multiple
                value={selectedWaiters}
                onChange={(e) => setSelectedWaiters(e.target.value as string[])}
                input={<OutlinedInput label="Filter by Waiter" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {assignedWaiters.map((waiter) => (
                  <MenuItem key={waiter} value={waiter}>
                    <Checkbox checked={selectedWaiters.indexOf(waiter) > -1} />
                    <ListItemText primary={waiter} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                multiple
                value={selectedStatuses}
                onChange={(e) => setSelectedStatuses(e.target.value as string[])}
                input={<OutlinedInput label="Filter by Status" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={selectedStatuses.indexOf(status) > -1} />
                    <ListItemText primary={status} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Bookings Grid */}
      <Grid container spacing={2}>
        {filteredAndSortedBookings.map((booking, index) => {
          const customerName = getFieldValue(booking, "customerName") || getFieldValue(booking, "name") || "Unknown"
          const tableNumber = getFieldValue(booking, "tableNumber") || "N/A"
          const time = getFieldValue(booking, "time") || getFieldValue(booking, "bookingTime") || ""
          const guests = getFieldValue(booking, "guests") || getFieldValue(booking, "partySize") || 0
          const status = getFieldValue(booking, "status") || getFieldValue(booking, "bookingStatus") || "pending"
          const phone = getFieldValue(booking, "phone") || getFieldValue(booking, "phoneNumber") || ""
          const email = getFieldValue(booking, "email") || ""
          const notes = getFieldValue(booking, "notes") || getFieldValue(booking, "specialRequests") || ""
          const assignedTo = getFieldValue(booking, "assignedTo") || getFieldValue(booking, "waiter") || ""

          return (
            <Grid item xs={12} sm={6} md={4} key={booking.id || index}>
              <Card sx={{ height: "100%", border: `2px solid ${getStatusColor(status)}` }}>
                <CardContent>
                  <Stack spacing={1}>
                    {/* Header */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" component="h3">
                        Table {tableNumber}
                      </Typography>
                      <Chip 
                        label={status} 
                        size="small" 
                        sx={{ 
                          backgroundColor: getStatusColor(status),
                          color: 'white'
                        }}
                      />
                    </Box>

                    {/* Time and Guests */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">{time}</Typography>
                      <GroupIcon fontSize="small" color="action" />
                      <Typography variant="body2">{guests} guests</Typography>
                    </Box>

                    <Divider />

                    {/* Customer Info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight="bold">
                        {customerName}
                      </Typography>
                    </Box>

                    {phone && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{phone}</Typography>
                      </Box>
                    )}

                    {email && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{email}</Typography>
                      </Box>
                    )}

                    {assignedTo && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <RestaurantIcon fontSize="small" color="action" />
                        <Typography variant="body2">Waiter: {assignedTo}</Typography>
                      </Box>
                    )}

                    {notes && (
                      <>
                        <Divider />
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                          <NotesIcon fontSize="small" color="action" />
                          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                            {notes}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {filteredAndSortedBookings.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <RestaurantIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bookings found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {globalSearch || selectedWaiters.length > 0 || selectedStatuses.length > 0
              ? "Try adjusting your search or filter criteria"
              : "No bookings available for today"}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default FloorFriendRunsheet
