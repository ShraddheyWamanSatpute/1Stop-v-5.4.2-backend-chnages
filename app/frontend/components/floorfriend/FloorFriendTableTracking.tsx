"use client"

import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,


} from "@mui/material"
import {
  TableRestaurant as TableIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,

  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material"

interface FloorFriendTableTrackingProps {
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
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "confirmed":
    case "seated":
    case "completed":
      return "success"
    case "pending":
    case "arrived":
      return "warning"
    case "cancelled":
    case "no-show":
      return "error"
    default:
      return "default"
  }
}

// Get status icon
const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case "confirmed":
    case "seated":
    case "completed":
      return <CheckCircleIcon />
    case "pending":
    case "arrived":
      return <WarningIcon />
    case "cancelled":
    case "no-show":
      return <ErrorIcon />
    default:
      return <ScheduleIcon />
  }
}

const FloorFriendTableTracking: React.FC<FloorFriendTableTrackingProps> = ({ bookings }) => {
  const [globalSearch, setGlobalSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const normalizedSearch = globalSearch.toLowerCase()

  // Process bookings for table tracking
  const tableBookings = useMemo(() => {
    return bookings.map((booking) => ({
      ...booking,
      customerName: getFieldValue(booking, "customerName") || getFieldValue(booking, "name") || "Unknown",
      tableNumber: getFieldValue(booking, "tableNumber") || "N/A",
      time: getFieldValue(booking, "time") || getFieldValue(booking, "bookingTime") || "",
      status: getFieldValue(booking, "status") || "pending",
      partySize: getFieldValue(booking, "partySize") || getFieldValue(booking, "guests") || 1,
      phone: getFieldValue(booking, "phone") || getFieldValue(booking, "phoneNumber") || "",
      email: getFieldValue(booking, "email") || "",
      notes: getFieldValue(booking, "notes") || getFieldValue(booking, "specialRequirements") || "",
    }))
  }, [bookings])

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return tableBookings.filter((booking) => {
      // Global search filter
      if (normalizedSearch) {
        const searchableFields = [
          booking.customerName,
          booking.tableNumber,
          booking.phone,
          booking.email,
          booking.status,
          booking.notes,
        ]
        
        const matchesSearch = searchableFields.some(field => 
          String(field || "").toLowerCase().includes(normalizedSearch)
        )
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== "all" && booking.status?.toLowerCase() !== statusFilter) {
        return false
      }

      // Table filter
      if (tableFilter !== "all" && String(booking.tableNumber) !== tableFilter) {
        return false
      }

      return true
    })
  }, [tableBookings, normalizedSearch, statusFilter, tableFilter])

  // Get unique tables and statuses for filters
  const uniqueTables = useMemo(() => {
    const tables = new Set(tableBookings.map(b => String(b.tableNumber)).filter(t => t !== "N/A"))
    return Array.from(tables).sort((a, b) => {
      const numA = parseInt(a)
      const numB = parseInt(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b)
    })
  }, [tableBookings])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(tableBookings.map(b => b.status?.toLowerCase()).filter(Boolean))
    return Array.from(statuses)
  }, [tableBookings])

  // Group bookings by table
  const bookingsByTable = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    filteredBookings.forEach((booking) => {
      const table = String(booking.tableNumber)
      if (!grouped[table]) grouped[table] = []
      grouped[table].push(booking)
    })
    return grouped
  }, [filteredBookings])

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking)
    setDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsOpen(false)
    setSelectedBooking(null)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TableIcon />
        Table Tracking
      </Typography>

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {Object.keys(bookingsByTable).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Tables
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="primary">
              {filteredBookings.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Bookings
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="success.main">
              {filteredBookings.filter(b => ["confirmed", "seated"].includes(b.status?.toLowerCase())).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirmed/Seated
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h6" color="warning.main">
              {filteredBookings.filter(b => ["pending", "arrived"].includes(b.status?.toLowerCase())).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending/Arrived
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search bookings"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {uniqueStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Table</InputLabel>
              <Select
                value={tableFilter}
                label="Filter by Table"
                onChange={(e) => setTableFilter(e.target.value)}
              >
                <MenuItem value="all">All Tables</MenuItem>
                {uniqueTables.map((table) => (
                  <MenuItem key={table} value={table}>
                    Table {table}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Grid */}
      <Grid container spacing={2}>
        {Object.entries(bookingsByTable).map(([tableNumber, tableBookings]) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={tableNumber}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TableIcon />
                  Table {tableNumber}
                </Typography>
                
                <Stack spacing={2}>
                  {tableBookings.map((booking, index) => (
                    <Card key={`${booking.id}-${index}`} variant="outlined" sx={{ p: 1 }}>
                      <Stack spacing={1}>
                        {/* Customer and Status */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {booking.customerName}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(booking.status)}
                            label={booking.status}
                            size="small"
                            color={getStatusColor(booking.status) as any}
                            variant="outlined"
                          />
                        </Box>

                        {/* Time and Party Size */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ScheduleIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {booking.time}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {booking.partySize} guests
                          </Typography>
                        </Box>

                        {/* Contact Info */}
                        {booking.phone && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                              {booking.phone}
                            </Typography>
                          </Box>
                        )}

                        {/* Action Button */}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(booking)}
                          startIcon={<EditIcon />}
                        >
                          Details
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {Object.keys(bookingsByTable).length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <TableIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No table bookings found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {globalSearch || statusFilter !== "all" || tableFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No table bookings available for today"}
          </Typography>
        </Paper>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>
          Booking Details - {selectedBooking?.customerName}
        </DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Table</Typography>
                <Typography variant="body1">Table {selectedBooking.tableNumber}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Time</Typography>
                <Typography variant="body1">{selectedBooking.time}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Party Size</Typography>
                <Typography variant="body1">{selectedBooking.partySize} guests</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  icon={getStatusIcon(selectedBooking.status)}
                  label={selectedBooking.status}
                  color={getStatusColor(selectedBooking.status) as any}
                  variant="outlined"
                />
              </Box>
              
              {selectedBooking.phone && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{selectedBooking.phone}</Typography>
                </Box>
              )}
              
              {selectedBooking.email && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedBooking.email}</Typography>
                </Box>
              )}
              
              {selectedBooking.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{selectedBooking.notes}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FloorFriendTableTracking
