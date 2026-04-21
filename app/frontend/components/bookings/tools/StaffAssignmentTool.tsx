"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  Chip,
  Card,
  CardContent,
  Stack,
  Grid,
} from "@mui/material"
import {
  PersonAdd,
  EventNote,
  People,
  CheckCircle,
} from "@mui/icons-material"
import { useBookings } from "../../../../backend/context/BookingsContext"
import { Booking } from "../../../../backend/interfaces/Bookings"
import DataHeader, { FilterOption } from "../../reusable/DataHeader"
import StatCard from "../../reusable/StatCard"

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

interface Staff {
  id: string
  firstName: string
  lastName: string
  role: string
  department: string
  fullName: string
}

const StaffAssignmentTool: React.FC = () => {
  const { bookings, bookingTypes, fetchBookingsByDate, updateBooking, loading: bookingsLoading, basePath, subscribeBookingStaff } = useBookings()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [dateBookings, setDateBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<"all" | "assigned" | "unassigned">("all")
  const [filterBookingType, setFilterBookingType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"table" | "time" | "guests">("table")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const selectedDate = formatDate(currentDate)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await fetchBookingsByDate(selectedDate)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedDate, fetchBookingsByDate])

  useEffect(() => {
    const unsubscribe = subscribeBookingStaff((staffList) => setStaff(staffList as any))
    return () => unsubscribe()
  }, [subscribeBookingStaff])

  useEffect(() => {
    const filtered = bookings.filter((booking: Booking) => booking.date === selectedDate)
    setDateBookings(filtered)
  }, [bookings, selectedDate])

  useEffect(() => {
    let filtered = [...dateBookings]

    // Filter by assignment status (check if assignedWaiter or assignedWaiters exists)
    if (filterStatus !== "all") {
      filtered = filtered.filter((booking: Booking) => {
        const isAssigned = !!booking.assignedWaiter || (booking.assignedWaiters && booking.assignedWaiters.length > 0)
        return filterStatus === "assigned" ? isAssigned : !isAssigned
      })
    }

    if (filterBookingType !== "all") {
      filtered = filtered.filter((booking: Booking) => {
        const typeName = bookingTypes.find(bt => bt.id === booking.bookingType)?.name || booking.bookingType
        return typeName === filterBookingType
      })
    }

    if (searchTerm) {
      filtered = filtered.filter((booking: Booking) => {
        const customerName = `${booking.firstName} ${booking.lastName}`.trim()
        return (
          booking.tableNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.arrivalTime?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "table":
          aValue = a.tableNumber?.toString() || ""
          bValue = b.tableNumber?.toString() || ""
          break
        case "time":
          aValue = a.arrivalTime?.replace(":", "") || ""
          bValue = b.arrivalTime?.replace(":", "") || ""
          break
        case "guests":
          aValue = a.guests || a.covers || 0
          bValue = b.guests || b.covers || 0
          break
        default:
          aValue = a.tableNumber?.toString() || ""
          bValue = b.tableNumber?.toString() || ""
      }

      if (typeof aValue === "string") {
        return aValue.localeCompare(bValue, undefined, { numeric: true })
      } else {
        return aValue - bValue
      }
    })

    setFilteredBookings(filtered)
  }, [dateBookings, filterStatus, filterBookingType, searchTerm, sortBy, bookingTypes])

  const handleWaiterChange = async (booking: Booking, newWaiters: Staff[]) => {
    try {
      if (!basePath) {
        setError("Base path not available")
        return
      }

      const waiterIds = newWaiters.map((w) => w.id)
      const waiterNames = newWaiters
        .map((w) => (w.fullName || "").split(" ")[0] || w.fullName)
        .filter(Boolean)
      const updates: Partial<Booking> = {
        assignedWaiter: waiterIds[0] || undefined,
        assignedWaiters: waiterIds.length > 0 ? waiterIds : undefined,
        assignedAt: waiterIds.length > 0 ? new Date().toISOString() : undefined,
        assignedTo: waiterNames.join(", ") || undefined,
      }
      
      await updateBooking(booking.id, updates)
    } catch (error) {
      console.error("Error updating waiter assignment:", error)
      setError("Failed to update waiter assignment. Please try again.")
    }
  }

  const getAssignedWaiters = (booking: Booking): Staff[] => {
    const assignedWaiters = booking.assignedWaiters || []
    const assignedWaiter = booking.assignedWaiter
    const waiterIds = assignedWaiters.length > 0 ? assignedWaiters : (assignedWaiter ? [assignedWaiter] : [])
    return waiterIds.map(id => staff.find(s => s.id === id)).filter(Boolean) as Staff[]
  }

  const getWaiterNames = (booking: Booking): string => {
    const assignedWaiters = booking.assignedWaiters || []
    const assignedWaiter = booking.assignedWaiter
    const waiterIds = assignedWaiters.length > 0 ? assignedWaiters : (assignedWaiter ? [assignedWaiter] : [])
    
    if (waiterIds.length === 0) return "Unassigned"
    const names = waiterIds.map(id => {
      const waiter = staff.find(s => s.id === id)
      return waiter ? waiter.fullName : "Unknown"
    }).filter(name => name !== "Unknown")
    return names.length > 0 ? names.join(", ") : "Unknown"
  }

  const uniqueBookingTypes = useMemo(() => {
    const types = new Set<string>()
    dateBookings.forEach((booking: Booking) => {
      if (booking.bookingType) {
        const typeName = bookingTypes.find(bt => bt.id === booking.bookingType)?.name || booking.bookingType
        types.add(typeName)
      }
    })
    return Array.from(types).sort()
  }, [dateBookings, bookingTypes])

  const unassignedCount = filteredBookings.filter((b: Booking) => {
    const isAssigned = !!b.assignedWaiter || (b.assignedWaiters && b.assignedWaiters.length > 0)
    return !isAssigned
  }).length
  const assignedCount = filteredBookings.filter((b: Booking) => {
    const isAssigned = !!b.assignedWaiter || (b.assignedWaiters && b.assignedWaiters.length > 0)
    return isAssigned
  }).length

  const statusFilterOptions: FilterOption[] = [
    { id: "all", name: "All" },
    { id: "assigned", name: "Assigned" },
    { id: "unassigned", name: "Unassigned" },
  ]

  const bookingTypeFilterOptions: FilterOption[] = useMemo(() => {
    return uniqueBookingTypes.map(type => ({ id: type, name: type }))
  }, [uniqueBookingTypes])

  // No loading UI: render instantly and hydrate as data arrives.

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <DataHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType="day"
        showDateTypeSelector={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Table, customer, time..."
        filters={[
          {
            label: "Status",
            options: statusFilterOptions,
            selectedValues: filterStatus === "all" ? [] : [filterStatus],
            onSelectionChange: (values) => setFilterStatus(values.length === 0 ? "all" : values[0] as "assigned" | "unassigned"),
          },
          {
            label: "Booking Type",
            options: bookingTypeFilterOptions,
            selectedValues: filterBookingType === "all" ? [] : [filterBookingType],
            onSelectionChange: (values) => setFilterBookingType(values.length === 0 ? "all" : values[0]),
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={[
          { value: "table", label: "Table Number" },
          { value: "time", label: "Time" },
          { value: "guests", label: "Guest Count" },
        ]}
        sortValue={sortBy}
        onSortChange={(value) => setSortBy(value as "table" | "time" | "guests")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={filteredBookings.length}
            color={themeConfig.brandColors.navy}
            icon={<EventNote />}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Assigned"
            value={assignedCount}
            color="success.main"
            icon={<CheckCircle />}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Unassigned"
            value={unassignedCount}
            color="warning.main"
            icon={<PersonAdd />}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Available Waiters"
            value={staff.length}
            color="info.main"
            icon={<People />}
            size="small"
          />
        </Grid>
      </Grid>

      {filteredBookings.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No bookings</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredBookings.map((booking: Booking) => {
            const isAssigned = !!booking.assignedWaiter || (booking.assignedWaiters && booking.assignedWaiters.length > 0)
            const customerName = `${booking.firstName} ${booking.lastName}`.trim()
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={booking.id}>
                <Card
                  elevation={2}
                  sx={{
                    border: `2px solid ${
                      isAssigned ? "success.main" : "warning.main"
                    }`,
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {booking.tableNumber ? `Table ${booking.tableNumber}` : "No Table"}
                        </Typography>
                        <Chip
                          label={isAssigned ? "Assigned" : "Unassigned"}
                          color={isAssigned ? "success" : "warning"}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2">Time: {booking.arrivalTime}</Typography>
                      <Typography variant="body2">Guests: {booking.guests || booking.covers}</Typography>
                      {customerName && (
                        <Typography variant="body2" color="text.secondary">
                          {customerName}
                        </Typography>
                      )}
                      {isAssigned && (
                        <Typography variant="caption" color="success.main">
                          {getWaiterNames(booking)}
                        </Typography>
                      )}
                      <Autocomplete
                        size="small"
                        multiple
                        options={staff}
                        getOptionLabel={(option) => option.fullName}
                        value={getAssignedWaiters(booking)}
                        onChange={(_, newValue) => handleWaiterChange(booking, newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={isAssigned ? "Reassign" : "Assign"}
                            variant="outlined"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index })
                            return (
                              <Chip
                                key={key}
                                variant="outlined"
                                label={option.firstName}
                                size="small"
                                {...tagProps}
                              />
                            )
                          })
                        }
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}

export default StaffAssignmentTool

