import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import { useLocation } from "react-router-dom"
// This is a focused fix to ensure booking types and colors are properly loaded from the database

"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
} from "@mui/material"
import {
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, Booking } from "../../../backend/context/BookingsContext"
import BookingForm from "./BookingForm"
import BookingDetails from "./BookingDetails"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TabbedBookingForm from "./forms/TabbedBookingForm"
import DataHeader, { FilterOption } from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns"


// Import necessary components for the pie chart
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts"
import { debugWarn } from "../../../utils/debugLog"

// Helper function to normalize color values
const normalizeColor = (color: string | undefined): string => {
  if (!color) return "#4caf50" // Default color

  // Ensure color starts with #
  const normalizedColor = color.startsWith("#") ? color : "#" + color

  // Ensure it's a valid hex color
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
    return "#4caf50" // Default to green if invalid
  }

  return normalizedColor
}

const BookingCalendar: React.FC<{}> = () => {
  const theme = useTheme()
  const location = useLocation()
  const {
    bookings: contextBookings,
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    bookingTags: contextBookingTags,
    tables: contextTables,
    loading: contextLoading,
    error: contextError,
    fetchBookings: contextFetchBookings,
    fetchBookingTags,
    addBooking,
    updateBooking,
    deleteBooking,
  } = useBookingsContext()


  // Use context data instead of local state
  // Allow rendering even if loading - UI fills as data arrives (like HR section)
  const bookings = contextBookings || []
  const error = contextError
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [dayBookingsModalOpen, setDayBookingsModalOpen] = useState(false)
  
  // Add state for table sorting
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Add state for view mode
  const [viewMode, setViewMode] = useState<"month" | "week">("month")

  // Add state for filtering by booking type and status
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string[]>([])
  const [trackingFilter, setTrackingFilter] = useState<string[]>([])
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // CRUD form states
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingFormMode, setBookingFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBookingForForm, setSelectedBookingForForm] = useState<Booking | null>(null)

  // Use context data for booking types and statuses
  const actualBookingTypes = contextBookingTypes || []
  const actualBookingStatuses = contextBookingStatuses || []

  // Add state for booking type color map for quick lookup
  const [bookingTypeColorMap, setBookingTypeColorMap] = useState<Record<string, string>>({})

  // Get booking type name from database - useCallback
  const getBookingTypeName = useCallback((bookingTypeIdOrName: string | undefined): string => {
    if (!bookingTypeIdOrName) return "Unknown"
    const bookingType = actualBookingTypes.find((type) => type.id === bookingTypeIdOrName || type.name === bookingTypeIdOrName)
    return bookingType ? bookingType.name : bookingTypeIdOrName
  }, [actualBookingTypes])

  // Get status name from database - useCallback
  const getStatusName = useCallback((statusIdOrName: string | undefined): string => {
    if (!statusIdOrName) return "Unknown"
    const status = actualBookingStatuses.find((status) => status.id === statusIdOrName || status.name === statusIdOrName)
    return status ? status.name : statusIdOrName
  }, [actualBookingStatuses])

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings]

    // Apply status filter - filter options use names as IDs, so match directly
    if (statusFilter.length > 0) {
      filtered = filtered.filter((booking) => {
        const bookingStatusName = getStatusName(booking.status)
        return statusFilter.includes(bookingStatusName)
      })
    }

    // Apply booking type filter - filter options use names as IDs, so match directly
    if (bookingTypeFilter.length > 0) {
      filtered = filtered.filter((booking) => {
        const bookingTypeName = getBookingTypeName(booking.bookingType)
        return bookingTypeFilter.includes(bookingTypeName)
      })
    }

    // Apply tracking filter
    if (trackingFilter.length > 0) {
      filtered = filtered.filter((booking) => trackingFilter.includes(booking.tracking || ""))
    }

    return filtered
  }, [bookings, statusFilter, bookingTypeFilter, trackingFilter, actualBookingStatuses, actualBookingTypes, getStatusName, getBookingTypeName])

  // Get tag name from database - useCallback
  const getTagName = useCallback((tagIdOrName: string | undefined): string => {
    if (!tagIdOrName) return "Unknown"
    const tag = contextBookingTags?.find((tag) => tag.id === tagIdOrName || tag.name === tagIdOrName)
    return tag ? tag.name : tagIdOrName
  }, [contextBookingTags])

  // Tracking colors mapping
  const TRACKING_COLORS: Record<string, string> = {
    "Not Arrived": "#9e9e9e",
    Arrived: "#2196f3",
    Seated: "#4caf50",
    Appetizers: themeConfig.colors.primary.light,
    Starters: themeConfig.brandColors.navy,
    Mains: "#90caf9",
    Desserts: themeConfig.colors.primary.light,
    Bill: "#f44336",
    Paid: "#4caf50",
    Left: "#81c784",
    "No Show": "#ff9800",
  }

  // Get tracking color
  const getTrackingColor = useCallback((tracking: string | undefined): string => {
    const trackingKey = tracking || "Not Arrived"
    return TRACKING_COLORS[trackingKey] || "#9e9e9e"
  }, [])

  // Calculate booking statistics from filtered bookings
  const bookingStats = useMemo(() => {
    const stats: Record<string, {
      totalBookings: number
      totalGuests: number
      typeBreakdown: Record<string, number>
    }> = {}

    filteredBookings.forEach((booking) => {
      const dateStr = booking.date
      if (!dateStr) return

      if (!stats[dateStr]) {
        stats[dateStr] = {
          totalBookings: 0,
          totalGuests: 0,
          typeBreakdown: {}
        }
      }

      stats[dateStr].totalBookings += 1
      stats[dateStr].totalGuests += booking.guests || 0

      const bookingTypeName = getBookingTypeName(booking.bookingType)
      stats[dateStr].typeBreakdown[bookingTypeName] = (stats[dateStr].typeBreakdown[bookingTypeName] || 0) + 1
    })

    return stats
  }, [filteredBookings, actualBookingTypes])

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Compute dayBookings from filtered data and selectedDate with sorting
  const dayBookings = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    let bookings = filteredBookings.filter((booking) => booking.date === dateStr)
    
    // Apply sorting if a field is selected
    if (sortField) {
      bookings.sort((a, b) => {
        let aValue: any = ''
        let bValue: any = ''
        
        switch (sortField) {
          case 'name':
            aValue = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()
            bValue = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase()
            break
          case 'startTime':
            aValue = a.arrivalTime || ''
            bValue = b.arrivalTime || ''
            break
          case 'endTime':
            aValue = a.endTime || a.until || ''
            bValue = b.endTime || b.until || ''
            break
          case 'guests':
            aValue = a.guests || a.covers || 0
            bValue = b.guests || b.covers || 0
            break
          case 'status':
            aValue = getStatusName(a.status).toLowerCase()
            bValue = getStatusName(b.status).toLowerCase()
            break
          case 'type':
            aValue = getBookingTypeName(a.bookingType).toLowerCase()
            bValue = getBookingTypeName(b.bookingType).toLowerCase()
            break
          case 'tracking':
            aValue = (a.tracking || 'Not Arrived').toLowerCase()
            bValue = (b.tracking || 'Not Arrived').toLowerCase()
            break
          default:
            return 0
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return bookings
  }, [filteredBookings, selectedDate, sortField, sortDirection, getStatusName, getBookingTypeName])

  // Ref for the date picker

  // Fetch data when component mounts
  useEffect(() => {
    contextFetchBookings()
  }, []) // Empty dependency array - only run once on mount

  // Ensure tables and booking tags are fetched
  const { fetchTables } = useBookingsContext()
  useEffect(() => {
    fetchTables()
    fetchBookingTags()
  }, []) // Empty dependency array - only run once on mount

  // Create a color map when booking types change
  useEffect(() => {
    const colorMap: Record<string, string> = {}

    actualBookingTypes.forEach((type) => {
      if (type.name) {
        colorMap[type.name] = normalizeColor(type.color)
      }
      if (type.id) {
        colorMap[type.id] = normalizeColor(type.color)
      }
    })

    setBookingTypeColorMap(colorMap)
  }, [actualBookingTypes])



  // Get all unique statuses from bookings if no database statuses

  // Get all unique booking types from bookings if no database types


  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteBooking(bookingId)
        setIsDetailsOpen(false)
        contextFetchBookings()
      } catch (err) {
        debugWarn("Error deleting booking:", err)
      }
    }
  }


  // CRUD form handlers
  const handleOpenBookingForm = (booking: Booking | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedBookingForForm(booking)
    setBookingFormMode(mode)
    setBookingFormOpen(true)
  }

  const handleCloseBookingForm = () => {
    setBookingFormOpen(false)
    setSelectedBookingForForm(null)
  }

  const handleSaveBooking = async (bookingData: any) => {
    try {
      if (bookingFormMode === 'create') {
        await addBooking(bookingData)
      } else if (bookingFormMode === 'edit' && selectedBookingForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = { ...bookingData, id: selectedBookingForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBooking(selectedBookingForForm.id, updatePayload)
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bookingCalendarModal2",
        crudMode: bookingFormMode,
        id: selectedBookingForForm?.id ?? bookingData?.id,
        itemLabel:
          [bookingData?.firstName, bookingData?.lastName].filter(Boolean).join(" ").trim() || undefined,
      })
      handleCloseBookingForm()
      await contextFetchBookings()
    } catch (error) {
      debugWarn('Error saving booking:', error)
    }
  }

  // Prepare filter options for DataHeader
  const filterOptions = useMemo(() => {
    const filters = []
    
    // Status filter - use names as IDs for matching
    if (actualBookingStatuses.length > 0) {
      filters.push({
        label: "Status",
        options: actualBookingStatuses.map((status): FilterOption => ({
          id: status.name, // Use name as ID for matching
          name: status.name,
          color: status.color,
        })),
        selectedValues: statusFilter,
        onSelectionChange: (values: string[]) => setStatusFilter(values),
      })
    }
    
    // Booking Type filter - use names as IDs for matching
    if (actualBookingTypes.length > 0) {
      filters.push({
        label: "Type",
        options: actualBookingTypes.map((type): FilterOption => ({
          id: type.name, // Use name as ID for matching
          name: type.name,
          color: type.color,
        })),
        selectedValues: bookingTypeFilter,
        onSelectionChange: (values: string[]) => setBookingTypeFilter(values),
      })
    }
    
    // Tracking filter
    const trackingOptions = ["Not Arrived","Arrived","Seated","Appetizers","Starters","Mains","Desserts","Bill","Paid","Left","No Show"]
    filters.push({
      label: "Tracking",
      options: trackingOptions.map((option): FilterOption => ({
        id: option,
        name: option,
        color: getTrackingColor(option),
      })),
      selectedValues: trackingFilter,
      onSelectionChange: (values: string[]) => setTrackingFilter(values),
    })
    
    return filters
  }, [actualBookingStatuses, actualBookingTypes, statusFilter, bookingTypeFilter, trackingFilter, getTrackingColor])

  // Update the renderHeader function to use DataHeader
  const renderDataHeader = () => (
    <DataHeader
      currentDate={currentMonth}
      onDateChange={setCurrentMonth}
      dateType={viewMode === "month" ? "month" : "week"}
      onDateTypeChange={(type) => setViewMode(type === "month" ? "month" : "week")}
      showDateTypeSelector={true}
      availableDateTypes={["week", "month"]}
      filters={filterOptions}
      filtersExpanded={filtersExpanded}
      onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
      onCreateNew={() => handleOpenBookingForm(null, 'create')}
      createButtonLabel="Create Booking"
    />
  )


  const handleDateClick = (day: Date) => {
    setSelectedDate(day)

    // Find bookings for this day
    const dateStr = format(day, "yyyy-MM-dd")
    const bookingsForDay = filteredBookings.filter((booking) => booking.date === dateStr)

    if (bookingsForDay.length === 1) {
      // If only one booking, open it directly in view mode
      handleOpenBookingForm(bookingsForDay[0], 'view')
    } else if (bookingsForDay.length > 1) {
      // If multiple bookings, show the CRUD modal with bookings list
      setDayBookingsModalOpen(true)
    } else {
      // If no bookings, open the form to create a new booking with the selected date
      const newBooking = {
        date: dateStr,
        arrivalTime: '18:00',
        guests: 2,
        duration: 2,
        status: 'Pending',
        tracking: 'Not Arrived'
      } as Booking
      handleOpenBookingForm(newBooking, 'create')
    }
  }


  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <Grid container>
        {days.map((day) => (
          <Grid item xs key={day} sx={{ textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                color: theme.palette.text.secondary,
                py: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
    )
  }


  // Get booking type color from database - SIMPLIFIED DIRECT LOOKUP
  const getBookingTypeColor = (booking: Booking) => {
    if (!booking.bookingType) return theme.palette.primary.light

    // Use the color map for direct lookup
    if (!booking.bookingType) return theme.palette.primary.light

    // Use the color map for direct lookup
    if (bookingTypeColorMap[booking.bookingType]) {
      return bookingTypeColorMap[booking.bookingType]
    }

    // Try to find the booking type in actual database types
    const bookingType = actualBookingTypes.find(
      (type) => type.name === booking.bookingType || type.id === booking.bookingType,
    )

    if (bookingType && bookingType.color) {
      // Add to the map for future lookups
      const color = normalizeColor(bookingType.color)
      const bookingTypeKey = booking.bookingType as string
      if (bookingTypeKey) {
        setBookingTypeColorMap((prev) => ({
          ...prev,
          [bookingTypeKey]: color,
        }))
      }
      return color
    }

    // Last resort fallback
    return theme.palette.primary.light
  }

  // Get status color from database
  const getStatusColor = (status: string | undefined) => {
    if (!status) return theme.palette.primary.main

    // Find the matching status by name
    const statusObj = actualBookingStatuses.find((s) => s.name === status)

    if (statusObj && statusObj.color) {
      return normalizeColor(statusObj.color)
    }

    // Fallback
    return theme.palette.primary.main
  }

  // Create a mini pie chart component for day cells - make it larger and centered
  const DayBookingsPieChart = ({ date }: { date: string }) => {
    const stats = bookingStats[date]

    if (!stats || stats.totalBookings === 0) return null

    const data = Object.entries(stats.typeBreakdown).map(([name, value]) => ({
      name,
      value,
    }))

    // Get colors based on booking types from the database - USING COLOR MAP
    const typeColors = data.map((item) => {
      // Direct lookup from color map using the booking type name
      if (bookingTypeColorMap[item.name]) {
        return bookingTypeColorMap[item.name]
      }

      // Try to find the booking type in actual database types
      const bookingType = actualBookingTypes.find((type) => type.name === item.name)

      if (bookingType && bookingType.color) {
        // Add to color map for future lookups
        setBookingTypeColorMap((prev) => ({
          ...prev,
          [item.name]: normalizeColor(bookingType.color),
        }))
        return normalizeColor(bookingType.color)
      }

      // Fallback
      return theme.palette.primary.light
    })

    return (
      <Box sx={{ width: 80, height: 80 }}>
        <PieChart width={80} height={80}>
          <Pie
            data={data}
            cx={40}
            cy={40}
            innerRadius={15}
            outerRadius={35}
            paddingAngle={2}
            dataKey="value"
            animationDuration={500}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={typeColors[index]}
                stroke={theme.palette.background.paper}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value, name) => {
              // Calculate guests for this booking type
              const guestsForType = filteredBookings
                .filter(booking => booking.date === date && getBookingTypeName(booking.bookingType) === name)
                .reduce((sum, booking) => sum + (booking.guests || booking.covers || 0), 0)
              
              return [`${value} booking${value !== 1 ? "s" : ""}, ${guestsForType} guest${guestsForType !== 1 ? "s" : ""}`, name]
            }}
            labelFormatter={() => ""}
            wrapperStyle={{
              zIndex: 99999,
              position: 'fixed',
              pointerEvents: 'none',
            }}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              boxShadow: theme.shadows[8],
              zIndex: 99999,
              position: 'relative',
              pointerEvents: 'none',
            }}
          />
        </PieChart>
      </Box>
    )
  }

  // Update the renderCells function to redesign the day box layout
  const renderCells = () => {
    const dateRange = viewMode === "month" ? getMonthDateRange() : getWeekDateRange()

    const rows: React.ReactNode[] = []
    let days: React.ReactNode[] = []

    dateRange.forEach((day, i) => {
      const dateStr = format(day, "yyyy-MM-dd")
      const dayStats = bookingStats[dateStr]
      const isCurrentDay = isToday(day)
      const isCurrentMonth = isSameMonth(day, currentMonth)
      const dayBookings = filteredBookings.filter((booking) => booking.date === dateStr)
      const hasBookings = dayBookings.length > 0

      days.push(
        <Grid item xs key={day.toString()}>
          <Paper
            elevation={isCurrentDay ? 3 : 0}
            sx={{
              height: 120,
              p: 1,
              backgroundColor: isCurrentDay
                ? `${theme.palette.primary.main}15`
                : isCurrentMonth
                  ? theme.palette.background.paper
                  : theme.palette.action.disabledBackground,
              opacity: isCurrentMonth ? 1 : 0.6,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: isCurrentDay ? `${theme.palette.primary.main}25` : `${theme.palette.action.hover}`,
                transform: "translateY(-2px)",
                boxShadow: 2,
              },
              display: "flex",
              flexDirection: "column",
              position: "relative",
              border: isCurrentDay
                ? `1px solid ${theme.palette.primary.main}`
                : hasBookings
                  ? `1px solid ${theme.palette.divider}`
                  : "none",
              borderRadius: 1,
            }}
            onClick={() => handleDateClick(day)}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: isCurrentDay ? "bold" : "normal",
                color: isCurrentDay ? theme.palette.primary.main : "inherit",
                position: "absolute",
                top: 4,
                left: 8,
              }}
            >
              {format(day, "d")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "100%",
                pt: 2,
                px: 1,
              }}
            >
              {/* Left side - Booking info */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "50%" }}>
                {dayStats && dayStats.totalBookings > 0 ? (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <EventIcon fontSize="small" color="primary" sx={{ fontSize: 14 }} />
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={themeConfig.brandColors.navy}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {dayStats.totalBookings}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <GroupIcon fontSize="small" color="secondary" sx={{ fontSize: 14 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                        {dayStats.totalGuests}
                      </Typography>
                    </Box>
                  </>
                ) : isCurrentMonth ? (
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7, fontSize: "0.7rem" }}>
                    No bookings
                  </Typography>
                ) : null}
              </Box>

              {/* Right side - Pie chart - centered vertically */}
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <DayBookingsPieChart date={dateStr} />
              </Box>
            </Box>

            {/* Show status indicators for bookings */}
            {dayBookings.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                }}
              >
                {dayBookings.length <= 3 ? (
                  dayBookings.map((booking, idx) => {
                    const statusColor = getStatusColor(booking.status)

                    return (
                      <Tooltip key={idx} title={`${booking.firstName} ${booking.lastName} - ${booking.arrivalTime}`}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: statusColor,
                          }}
                        />
                      </Tooltip>
                    )
                  })
                ) : (
                  <Chip
                    label={`+${dayBookings.length}`}
                    size="small"
                    color="primary"
                    sx={{
                      height: 16,
                      fontSize: "0.625rem",
                      "& .MuiChip-label": { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            )}
          </Paper>
        </Grid>,
      )

      if ((i + 1) % 7 === 0 || i === dateRange.length - 1) {
        rows.push(
          <Grid container spacing={1} key={day.toString()}>
            {days}
          </Grid>,
        )
        days = []
      }
    })

    return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>{rows}</Box>
  }

  // Sortable header component
  const SortableHeader = ({ field, children, width }: { field: string; children: React.ReactNode; width: string }) => (
    <TableCell 
      align="center" 
      sx={{ 
        width, 
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { bgcolor: 'action.hover' },
        position: 'relative'
      }}
      onClick={() => handleSort(field)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ArrowUpwardIcon fontSize="small" /> : 
            <ArrowDownwardIcon fontSize="small" />
        )}
      </Box>
    </TableCell>
  )

  // Component to render day bookings in a table format similar to employee list
  const renderDayBookingsTable = () => {
    if (!selectedDate) return null

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, width: '100%' }}>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <SortableHeader field="name" width="18%">Name</SortableHeader>
              <SortableHeader field="startTime" width="10%">Start Time</SortableHeader>
              <SortableHeader field="endTime" width="10%">End Time</SortableHeader>
              <SortableHeader field="guests" width="8%">Guests</SortableHeader>
              <SortableHeader field="status" width="12%">Status</SortableHeader>
              <SortableHeader field="type" width="12%">Type</SortableHeader>
              <SortableHeader field="tracking" width="12%">Tracking</SortableHeader>
              <TableCell align="center" sx={{ width: '13%' }}>Tags</TableCell>
              <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dayBookings.map((booking) => (
              <TableRow
                key={booking.id}
                hover
                sx={{ 
                  cursor: "pointer",
                  '& > td': {
                    verticalAlign: 'middle',
                    paddingTop: 1,
                    paddingBottom: 1,
                  }
                }}
              >
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {`${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.email || "No email"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" fontFamily="monospace">
                    {booking.arrivalTime || "No time"}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" fontFamily="monospace">
                    {booking.endTime || booking.until || "No end time"}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GroupIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />
                    <Typography variant="body2" fontWeight="medium">
                      {booking.guests || booking.covers || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip
                    label={getStatusName(booking.status)}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(booking.status)}20`,
                      color: getStatusColor(booking.status),
                      borderColor: getStatusColor(booking.status),
                      border: "1px solid",
                      fontWeight: "medium",
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  {booking.bookingType ? (
                    <Chip
                      label={getBookingTypeName(booking.bookingType)}
                      size="small"
                      sx={{
                        bgcolor: `${getBookingTypeColor(booking)}20`,
                        color: getBookingTypeColor(booking),
                        borderColor: getBookingTypeColor(booking),
                        border: "1px solid",
                        fontWeight: "medium",
                      }}
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip
                    label={booking.tracking || "Not Arrived"}
                    size="small"
                    sx={{
                      cursor: "default",
                      fontWeight: "medium",
                      bgcolor: `${getTrackingColor(booking.tracking)}20`,
                      color: getTrackingColor(booking.tracking),
                      borderColor: getTrackingColor(booking.tracking),
                      border: "1px solid",
                    }}
                  />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  {booking.tags && booking.tags.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                      {booking.tags.slice(0, 2).map((tag, index) => {
                        const tagName = getTagName(tag)
                        const tagObj = contextBookingTags?.find(t => t.id === tag || t.name === tag)
                        return (
                          <Chip
                            key={index}
                            label={tagName}
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              bgcolor: tagObj?.color ? `${tagObj.color}20` : alpha(themeConfig.brandColors.navy, 0.12),
                              color: tagObj?.color || theme.palette.primary.main,
                              borderColor: tagObj?.color || theme.palette.primary.main,
                              border: "1px solid",
                            }}
                          />
                        )
                      })}
                      {booking.tags.length > 2 && (
                        <Chip
                          label={`+${booking.tags.length - 2}`}
                          size="small"
                          sx={{
                            fontSize: '0.75rem',
                            bgcolor: theme.palette.grey[200],
                            color: theme.palette.text.secondary,
                          }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="View">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setDayBookingsModalOpen(false)
                          handleOpenBookingForm(booking, 'view')
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setDayBookingsModalOpen(false)
                          handleOpenBookingForm(booking, 'edit')
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  // Helper function to get month date range
  const getMonthDateRange = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = new Date(monthStart)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const endDate = new Date(monthEnd)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    return eachDayOfInterval({ start: startDate, end: endDate })
  }

  // Helper function to get week date range
  const getWeekDateRange = () => {
    const weekStart = startOfWeek(currentMonth)
    const weekEnd = endOfWeek(currentMonth)

    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }

  // Update the return statement to conditionally render based on view mode
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} variant="filled">
          {error}
        </Alert>
      )}

      {/* No loading indicators — UI renders and fills as data arrives */}
      <Box sx={{ mb: 3, overflow: "hidden" }}>
        {renderDataHeader()}
        {filteredBookings.length === 0 && !error ? (
          <Box sx={{ py: 4 }}>
            <EmptyStateCard
              icon={CalendarIcon}
              title={statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "No bookings match your filters" : "No bookings found"}
              description={statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "Try adjusting your filters" : "Create your first booking to get started."}
            />
          </Box>
        ) : (
          <>
            {renderDays()}
            {renderCells()}
          </>
        )}
      </Box>

      {/* New Booking Form */}
      <BookingForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={contextFetchBookings}
        booking={
          selectedDate
            ? ({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                date: format(selectedDate, "yyyy-MM-dd"),
                guests: 1,
                arrivalTime: "18:00",
                status: "Pending",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as Booking)
            : undefined
        }
      />

      {/* Booking Details */}
      {selectedBooking && (
        <BookingDetails
          open={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          tableName={(() => {
            // Handle new selectedTables format
            if (selectedBooking.selectedTables && selectedBooking.selectedTables.length > 0) {
              const firstTableId = selectedBooking.selectedTables[0]
              const table = contextTables?.find(t => t.id === firstTableId || t.name === firstTableId)
              return table?.name || firstTableId
            }
            // Handle legacy format
            if (selectedBooking.tableNumber) {
              return selectedBooking.tableNumber
            }
            if (selectedBooking.tableId) {
              const table = contextTables?.find(t => t.id === selectedBooking.tableId)
              return table?.name || selectedBooking.tableId
            }
            return "Unassigned"
          })()}
          onEdit={() => {
            setIsDetailsOpen(false)
            setSelectedBooking(selectedBooking)
            setIsFormOpen(true)
          }}
          onDelete={() => handleDeleteBooking(selectedBooking.id)}
          onUpdate={async (bookingId, updates) => {
            try {
              // Include id in update payload (required for proper updates)
              const updatePayload: any = { ...updates, id: bookingId }
              // Filter out undefined values
              Object.keys(updatePayload).forEach(key => {
                if (updatePayload[key] === undefined) {
                  delete updatePayload[key]
                }
              })
              await updateBooking(bookingId, updatePayload)
              setIsDetailsOpen(false)
              setSelectedBooking(null)
              // Refresh data
              contextFetchBookings()
            } catch (error) {
              debugWarn('Error updating booking:', error)
              throw error
            }
          }}
          bookingStatuses={contextBookingStatuses}
          tables={contextTables}
        />
      )}
      {/* Day Bookings CRUD Modal */}
            <CRUDModal
        open={dayBookingsModalOpen}
        onClose={(reason) => {
          setDayBookingsModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = () => setDayBookingsModalOpen(false)
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bookingCalendarModal1",
          crudMode: "view",
        }}
        title={selectedDate ? `Bookings for ${format(selectedDate, "EEEE, MMMM do, yyyy")}` : "Day Bookings"}
        mode="view"
        maxWidth="xl"
        fullWidth={true}
      >
        <Box sx={{ p: 2 }}>
          {dayBookings.length > 0 ? (
            renderDayBookingsTable()
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No bookings for this day.
              </Typography>
            </Box>
          )}
        </Box>
      </CRUDModal>

      {/* CRUD Modal */}
      <CRUDModal
        open={bookingFormOpen}
        onClose={(reason) => {
          setBookingFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBookingForForm(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bookingCalendarModal2",
          crudMode: bookingFormMode,
          id: selectedBookingForForm?.id,
          itemLabel:
            [selectedBookingForForm?.firstName, selectedBookingForForm?.lastName].filter(Boolean).join(" ").trim() ||
            undefined,
        }}
        title={
          bookingFormMode === "create"
            ? "Create Booking"
            : bookingFormMode === "edit"
              ? "Edit Booking"
              : "View Booking"
        }
        icon={<SaveIcon />}
        mode={bookingFormMode}
        onEdit={() => setBookingFormMode("edit")}
        onSave={bookingFormMode !== "view" ? async () => {} : undefined}
        hideSaveButton={bookingFormMode === "view"}
        maxWidth="lg"
      >
        <TabbedBookingForm
          booking={selectedBookingForForm}
          mode={bookingFormMode}
          onSave={handleSaveBooking}
        />
      </CRUDModal>
    </Box>
  )
}

export default BookingCalendar
