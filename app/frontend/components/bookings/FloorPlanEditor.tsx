"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  Snackbar,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import {
  Menu as MenuIcon,
  ViewList as ViewListIcon,
  Map as MapIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import DataHeader from "../reusable/DataHeader"
import { useBookings as useBookingsContext, FloorPlan, Table, Booking, BookingType, BookingStatus } from "../../../backend/context/BookingsContext"
import { format } from "date-fns"
import { debugWarn } from "../../../utils/debugLog"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { THEME_COLORS } from "../../styles/themeColors"
import BookingForm from "./BookingForm"
import TableLayoutDesigner from "./TableLayoutDesigner"
import BookingDetails from "./BookingDetails"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TabbedBookingForm from "./forms/TabbedBookingForm"
import BookingList from "./BookingList"
import type { SelectChangeEvent } from "@mui/material"

// Removed unused TableWithBookings interface


// Define tracking options in the correct order
const TRACKING_OPTIONS = [
  "Not Arrived",
  "Arrived",
  "Seated",
  "Appetizers",
  "Starters",
  "Mains",
  "Desserts",
  "Bill",
  "Paid",
  "Left",
  "No Show",
] as const

type TrackingStatus = (typeof TRACKING_OPTIONS)[number]

// Define tracking colors for visual indication
const TRACKING_COLORS: Record<string, string> = {
  "Not Arrived": THEME_COLORS.divider,
  Arrived: THEME_COLORS.lightBlue,
  Seated: THEME_COLORS.success,
  Appetizers: THEME_COLORS.lightBlue,
  Starters: THEME_COLORS.navy,
  Mains: THEME_COLORS.lightBlue,
  Desserts: THEME_COLORS.warningLight,
  Bill: THEME_COLORS.errorLight,
  Paid: THEME_COLORS.successLight,
  Left: THEME_COLORS.successLight,
  "No Show": THEME_COLORS.warning,
}

// Define default status colors
const DEFAULT_STATUSES: BookingStatus[] = [
  {
    id: "pending",
    name: "Pending",
    color: THEME_COLORS.warning,
    description: "Booking is awaiting confirmation",
    isDefault: false,
    allowsEditing: true,
    allowsSeating: false,
    countsAsAttended: false,
    active: true,
    order: 1,
  },
  {
    id: "confirmed",
    name: "Confirmed",
    color: THEME_COLORS.success,
    description: "Booking has been confirmed",
    isDefault: true,
    allowsEditing: true,
    allowsSeating: true,
    countsAsAttended: true,
    active: true,
    order: 2,
  },
  {
    id: "seated",
    name: "Seated",
    color: THEME_COLORS.lightBlue,
    description: "Guests have been seated",
    isDefault: false,
    allowsEditing: true,
    allowsSeating: false,
    countsAsAttended: true,
    active: true,
    order: 3,
  },
  {
    id: "completed",
    name: "Completed",
    color: THEME_COLORS.navy,
    description: "Booking has been completed",
    isDefault: false,
    allowsEditing: false,
    allowsSeating: false,
    countsAsAttended: true,
    active: true,
    order: 4,
  },
  {
    id: "cancelled",
    name: "Cancelled",
    color: THEME_COLORS.error,
    description: "Booking has been cancelled",
    isDefault: false,
    allowsEditing: false,
    allowsSeating: false,
    countsAsAttended: false,
    active: true,
    order: 5,
  },
  {
    id: "no-show",
    name: "No-Show",
    color: THEME_COLORS.divider,
    description: "Guests did not arrive",
    isDefault: false,
    allowsEditing: false,
    allowsSeating: false,
    countsAsAttended: false,
    active: true,
    order: 6,
  },
]

// Define default booking types with colors
const DEFAULT_BOOKING_TYPES: BookingType[] = [
  // Theme-consistent surfaces (derive from brand palette instead of arbitrary pastels)
  { id: "standard", name: "Standard", color: THEME_COLORS.backgroundDefault, description: "Regular booking" } as BookingType,
  { id: "vip", name: "VIP", color: THEME_COLORS.selectedOverlay, description: "VIP booking" } as BookingType,
  { id: "event", name: "Event", color: THEME_COLORS.hoverOverlay, description: "Event booking" } as BookingType,
  { id: "corporate", name: "Corporate", color: THEME_COLORS.selectedOverlay, description: "Corporate booking" } as BookingType,
  { id: "birthday", name: "Birthday", color: THEME_COLORS.hoverOverlay, description: "Birthday celebration" } as BookingType,
  { id: "anniversary", name: "Anniversary", color: THEME_COLORS.selectedOverlay, description: "Anniversary celebration" } as BookingType,
]

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


// Define ToolType type
type ToolType = "select" | "pan" | "rect" | "circle" | "text" | "image" | "table"


// Define touch interaction handlers
interface TouchInteractions {
  onPanStart: (x: number, y: number) => void
  onPanMove: (x: number, y: number) => void
  onPanEnd: () => void
  onPinchStart: () => void
  onPinchMove: (scale: number) => void
  onPinchEnd: () => void
}

// Custom hook for handling touch interactions
const useTouchInteractions = ({
  onPanStart,
  onPanMove,
  onPanEnd,
  onPinchStart,
  onPinchMove,
  onPinchEnd,
}: TouchInteractions) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; distance?: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setTouchStart({ x: touch.clientX, y: touch.clientY })
      onPanStart(touch.clientX, touch.clientY)
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      setTouchStart({
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
        distance,
      })
      onPinchStart()
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      onPanMove(touch.clientX, touch.clientY)
    } else if (e.touches.length === 2 && touchStart.distance) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      const scale = currentDistance / touchStart.distance
      onPinchMove(scale)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart) {
      onPanEnd()
      onPinchEnd()
      setTouchStart(null)
    }
  }

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}

// Remove duplicate imports

const FloorPlanEditor: React.FC = () => {
  const location = useLocation()
  const theme = useTheme()
  const { 
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    floorPlans: contextFloorPlans,
    tables: contextTables,
    bookings: contextBookings,
    fetchBookingTypes,
    fetchBookingStatuses,
    fetchFloorPlans,
    fetchTables,
    fetchBookings,
    addBooking,
    updateBooking,
    deleteBooking,
  } = useBookingsContext()


  // State for floor plans and tables
  const floorPlans = contextFloorPlans || []
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string>("")
  const [tables, setTables] = useState<Table[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([])
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([])
  // No local loading state - allow rendering even if loading (like HR section)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [, setForceUpdate] = useState(0)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Add state for booking type and status color maps for quick lookup
  const [, setBookingTypeColorMap] = useState<Record<string, string>>({})
  const [, setStatusColorMap] = useState<Record<string, string>>({})

  // State for booking management
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  // Removed unused selectedTable state

  // CRUD form states
  const [bookingCRUDFormOpen, setBookingCRUDFormOpen] = useState(false)
  const [bookingCRUDFormMode, setBookingCRUDFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBookingForCRUD, setSelectedBookingForCRUD] = useState<Booking | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [showSplitView, setShowSplitView] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterTracking, setFilterTracking] = useState<string[]>([])
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string[]>([])
  const [designerOpen, setDesignerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Drag and drop state
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Tracking change menu
  const [trackingMenuAnchorEl, setTrackingMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [bookingForTrackingChange, setBookingForTrackingChange] = useState<Booking | null>(null)

  // Canvas refs

  // State for floor plan
  const [dragStartX, setDragStartXShapes] = useState(0)
  const [dragStartY, setDragStartYShapes] = useState(0)
  const [, setZoom] = useState(1)
  const [, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [activeTool, ] = useState<ToolType>("select")

  // Touch interactions
  const {
    handleTouchStart: handleTouchPanStart,
    handleTouchMove: handleTouchPanMove,
    handleTouchEnd: handleTouchPanEnd,
  } = useTouchInteractions({
    onPanStart: (x, y) => {
      if (activeTool === "pan") {
        setIsPanning(true)
        setDragStartXShapes(x)
        setDragStartYShapes(y)
      }
    },
    onPanMove: (x, y) => {
      if (isPanning) {
        const deltaX = x - dragStartX
        const deltaY = y - dragStartY
        setPanOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
        setDragStartXShapes(x)
        setDragStartYShapes(y)
      }
    },
    onPanEnd: () => {
      setIsPanning(false)
    },
    onPinchStart: () => {
      // Handle pinch start
    },
    onPinchMove: (scale) => {
      setZoom((prevZoom) => Math.max(0.1, Math.min(5, prevZoom * scale)))
    },
    onPinchEnd: () => {
      // Handle pinch end
    },
  })

  // Ref to track if component is mounted
  const isMounted = useRef(true)
  // Ref for the date picker
  const dateButtonRef = useRef<HTMLButtonElement>(null)


  // Add touch interaction state for booking movement
  // const [touchMoveThreshold] = useState(10) // Minimum distance to start drag

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Add debugging for color data
  useEffect(() => {
    // Booking statuses and types loaded
    // Keep console quiet
  }, [bookingStatuses, bookingTypes])

  // Create color maps when booking types and statuses change
  useEffect(() => {
    const colorMap: Record<string, string> = {}

    bookingTypes.forEach((type) => {
      if (type.name) {
        colorMap[type.name] = normalizeColor(type.color)
      }
      if (type.id) {
        colorMap[type.id] = normalizeColor(type.color)
      }
    })

    setBookingTypeColorMap(colorMap)
  }, [bookingTypes])

  useEffect(() => {
    const colorMap: Record<string, string> = {}

    bookingStatuses.forEach((status) => {
      if (status.name) {
        colorMap[status.name] = normalizeColor(status.color)
      }
      if (status.id) {
        colorMap[status.id] = normalizeColor(status.color)
      }
    })

    setStatusColorMap(colorMap)
  }, [bookingStatuses])

  // Add a dedicated function to fetch booking types and statuses - similar to BookingCalendar
  // Add this function after the useEffect hooks and before the fetchData function

  // Fetch booking types and statuses using BookingsContext
  const fetchBookingTypesAndStatuses = async () => {
    try {
      
      // Use fetchBookingTypes and fetchBookingStatuses from BookingsContext
      await Promise.all([
        fetchBookingTypes(),
        fetchBookingStatuses()
      ])
      
      // Get the booking types and statuses from context
      const types = contextBookingTypes || []
      const statuses = contextBookingStatuses || []
      
      
      
      // Normalize colors before setting state
      const typesWithNormalizedColors = types.map((type: BookingType) => ({
        ...type,
        color: normalizeColor(type.color),
      }))
      
      const statusesWithNormalizedColors = statuses.map((status: BookingStatus) => ({
        ...status,
        color: normalizeColor(status.color),
      }))
      
      setBookingTypes(typesWithNormalizedColors.length > 0 ? typesWithNormalizedColors : DEFAULT_BOOKING_TYPES)
      setBookingStatuses(statusesWithNormalizedColors.length > 0 ? statusesWithNormalizedColors : DEFAULT_STATUSES)
    } catch (err) {
      console.error("Error fetching booking types and statuses:", err)
    }
  }

  // Add a useEffect to call this function when component mounts
  useEffect(() => {
    fetchBookingTypesAndStatuses()
  }, [])

  // Set default floor plan when context floor plans are loaded
  useEffect(() => {
    if (floorPlans.length > 0 && !selectedFloorPlanId) {
      const defaultPlan = floorPlans.find((plan: FloorPlan) => plan.isDefault) || floorPlans[0]
      setSelectedFloorPlanId(defaultPlan.id)
    }
  }, [floorPlans, selectedFloorPlanId])

  // Fetch floor plans, tables, and bookings on component mount or when date changes
  useEffect(() => {
    fetchData()
  }, [currentDate])

  // Removed unused checkBookingsOverlap function

  // Fetch data from database using BookingsContext
  // No loading state - UI renders and fills as data arrives (like HR section)
  const fetchData = async () => {
    setError(null)

    try {
      // Fetch floor plans using context
      await fetchFloorPlans()

      // Fetch tables using context
      await fetchTables()
      const fetchedTables = contextTables || []
      setTables(fetchedTables)

      // Fetch bookings for the selected date using context
      const dateStr = format(currentDate, "yyyy-MM-dd")
      await fetchBookings()
      const fetchedBookings = contextBookings || []
      // Make sure we're filtering correctly by date
      const dateFilteredBookings = fetchedBookings.filter((booking: Booking) => booking.date === dateStr)

      setBookings(dateFilteredBookings)

      // Force a re-render after data is loaded
      setTimeout(() => {
        setForceUpdate((prev) => prev + 1)
      }, 100)
    } catch (err) {
      debugWarn("Error fetching data:", err)
      setError("Failed to load floor plan data. Please try again.")
    }
  }


  const handleDateChange = (date: Date | null) => {
    if (date) {
      setCurrentDate(date)
    }
    setDatePickerOpen(false)
  }

  // CRUD form handlers for bookings
  const handleOpenBookingCRUDForm = (booking: Booking | null = null, mode: 'create' | 'edit' | 'view' = 'create', tableId?: string) => {
    if (mode === 'create' && tableId) {
      // Pre-fill with table information
      const newBooking = {
        id: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        date: format(currentDate, "yyyy-MM-dd"),
        arrivalTime: "18:00",
        guests: 2,
        tableNumber: tableId,
        tableId: tableId,
        status: "Pending",
        tracking: "Not Arrived",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        endTime: "19:00",
      } as Booking
      setSelectedBookingForCRUD(newBooking)
    } else {
      setSelectedBookingForCRUD(booking)
    }
    setBookingCRUDFormMode(mode)
    setBookingCRUDFormOpen(true)
  }

  const handleCloseBookingCRUDForm = () => {
    setBookingCRUDFormOpen(false)
    setSelectedBookingForCRUD(null)
  }

  const handleSaveBookingCRUD = async (bookingData: any) => {
    try {
      if (bookingCRUDFormMode === 'create') {
        await addBooking(bookingData)
        setNotification({ message: 'Booking created successfully', type: 'success' })
      } else if (bookingCRUDFormMode === 'edit' && selectedBookingForCRUD?.id) {
        await updateBooking(selectedBookingForCRUD.id, bookingData)
        setNotification({ message: 'Booking updated successfully', type: 'success' })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "floorPlanEditorModal1",
        crudMode: bookingCRUDFormMode,
        id: selectedBookingForCRUD?.id ?? bookingData?.id,
        itemLabel:
          [bookingData?.firstName, bookingData?.lastName].filter(Boolean).join(" ").trim() || undefined,
      })
      handleCloseBookingCRUDForm()
      fetchData() // Refresh the data
    } catch (error) {
      console.error('Error saving booking:', error)
      setNotification({ message: 'Failed to save booking', type: 'error' })
    }
  }


  // Get the selected floor plan
  const selectedFloorPlan = useMemo(() => {
    return floorPlans.find((plan) => plan.id === selectedFloorPlanId) || null
  }, [floorPlans, selectedFloorPlanId])

  // Get all unique statuses from bookings if no database statuses
  const getAllBookingStatuses = useMemo(() => {
    if (bookingStatuses.length > 0) {
      return bookingStatuses
    }

    // Extract unique statuses from bookings
    const uniqueStatuses = Array.from(new Set(bookings.map((b) => b.status).filter(Boolean)))
    return uniqueStatuses.map((statusName) => {
      const defaultStatus = DEFAULT_STATUSES.find((s) => s.name === statusName)
      return (
        defaultStatus || {
          id: `default-${statusName}`,
          name: statusName,
          color: "#9e9e9e",
          description: "",
          isDefault: false,
          allowsEditing: true,
          allowsSeating: true,
          countsAsAttended: true,
          active: true,
          order: 999,
        }
      )
    })
  }, [bookingStatuses, bookings])

  // Get all unique booking types from bookings if no database types
  const getAllBookingTypes = useMemo(() => {
    if (bookingTypes.length > 0) {
      return bookingTypes
    }

    // Extract unique types from bookings
    const uniqueTypes = Array.from(new Set(bookings.map((b) => b.bookingType).filter(Boolean)))
    return uniqueTypes.map((type, index) => {
      const defaultType = DEFAULT_BOOKING_TYPES.find((t) => t.name === type)
      if (defaultType) return defaultType

      return {
        id: `type-${index}`,
        name: type,
        color: `hsl(${index * 60}, 70%, 50%)`,
        description: "",
        defaultDuration: 2,
        requiresDeposit: false,
        depositAmount: 0,
        active: true,
        minAdvanceHours: 1,
        maxAdvanceDays: 30,
        depositType: "fixed" as const,
        availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        availableTimeSlots: ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }, [bookingTypes, bookings])

  // Filter bookings based on selected filters and search term
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Status filter (multi)
      const statusMatch = filterStatus.length === 0 || (booking.status && filterStatus.includes(booking.status))

      // Booking type filter (multi)
      const typeMatch = bookingTypeFilter.length === 0 || (booking.bookingType && bookingTypeFilter.includes(booking.bookingType))

      // Tracking filter (multi)
      const trackingMatch = filterTracking.length === 0 || (booking.tracking && filterTracking.includes(booking.tracking))

      // Search filter - search across name, email, phone, notes, table name
      const searchMatch = !searchTerm || (() => {
        const searchLower = searchTerm.toLowerCase()
        const fullName = `${booking.firstName || ''} ${booking.lastName || ''}`.toLowerCase()
        const email = (booking.email || "").toLowerCase()
        const phone = (booking.phone || "").toLowerCase()
        const notes = (booking.notes || "").toLowerCase()
        const specialRequests = (booking.specialRequests || "").toLowerCase()
        const dietaryRequirements = (booking.dietaryRequirements || "").toLowerCase()
        
        // Also search table names
        const resolvedTableId = booking.tableId || booking.tableNumber
        const tableName = resolvedTableId ? (tables.find(t => t.id === resolvedTableId || t.name === resolvedTableId)?.name || "").toLowerCase() : ""
        
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower) ||
               notes.includes(searchLower) ||
               specialRequests.includes(searchLower) ||
               dietaryRequirements.includes(searchLower) ||
               tableName.includes(searchLower)
      })()

      return statusMatch && typeMatch && trackingMatch && searchMatch
    })
  }, [
    bookings,
    filterStatus,
    bookingTypeFilter,
    filterTracking,
    searchTerm,
    tables,
  ])

  // Get unassigned bookings

  // Handle floor plan selection
  const handleFloorPlanChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value
    if (value === "__create__") {
      setDesignerOpen(true)
      return
    }
    setSelectedFloorPlanId(value)
  }

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailsOpen(true)
  }

  // Removed unused handleAddBooking function

  const toggleSplitView = () => {
    setShowSplitView(!showSplitView)
  }

  // Drag and drop handlers


  // Removed unused drag handler functions (handleDragOver, handleDragLeave, handleDrop)

  // Handle tracking change
  const handleTrackingChange = async (newTracking: TrackingStatus) => {
    if (!bookingForTrackingChange) {
      setTrackingMenuAnchorEl(null)
      return
    }

    try {
      await updateBooking(bookingForTrackingChange.id, {
        tracking: newTracking,
      })

      // Update local state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingForTrackingChange.id ? { ...booking, tracking: newTracking } : booking,
        ),
      )

      setNotification({ message: `Booking tracking updated to ${newTracking}`, type: "success" })
    } catch (err) {
      console.error("Error updating booking tracking:", err)
      setNotification({ message: "Failed to update booking tracking", type: "error" })
    } finally {
      setTrackingMenuAnchorEl(null)
      setBookingForTrackingChange(null)
    }
  }

  // Get status color from database

  // Get booking type color from database - SIMPLIFIED DIRECT LOOKUP

  // Removed unused calculation functions (calculateTableHeight, calculateBookingHeight)

  // Touch handlers for booking elements
  // Replace the handleTouchStart function with this improved version

  // Replace the handleTouchMove function with this improved version

  // Replace the handleTouchEnd function with this improved version

  // Add this helper function to reset all touch state


  // Render the tracking change menu
  const renderTrackingMenu = () => (
    <Menu
      anchorEl={trackingMenuAnchorEl}
      open={Boolean(trackingMenuAnchorEl)}
      onClose={() => setTrackingMenuAnchorEl(null)}
    >
      {TRACKING_OPTIONS.map((option) => (
        <MenuItem key={option} onClick={() => handleTrackingChange(option)}>
          <ListItemIcon>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: TRACKING_COLORS[option],
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          </ListItemIcon>
          <ListItemText>{option}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  )

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={fetchData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
      {/* Header */}
      <DataHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType="day"
        onDateTypeChange={() => {}} // FloorPlan is always day view
        showDateTypeSelector={false} // Hide date type selector - always day view
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bookings by name, email, phone, notes, or table..."
        filters={[
          {
            label: "Status",
            options: getAllBookingStatuses.map((status) => ({
              id: status.id || status.name || "unknown",
              name: status.name || "Unknown",
              color: status.color || "#9e9e9e",
            })),
            selectedValues: filterStatus,
            onSelectionChange: setFilterStatus,
          },
          {
            label: "Type",
            options: getAllBookingTypes.map((type) => ({
              id: type.id || type.name || "unknown",
              name: type.name || "Unknown",
              color: type.color || "#9e9e9e",
            })),
            selectedValues: bookingTypeFilter,
            onSelectionChange: setBookingTypeFilter,
          },
          {
            label: "Tracking",
            options: TRACKING_OPTIONS.map((option) => ({
              id: option,
              name: option,
              color: TRACKING_COLORS[option],
            })),
            selectedValues: filterTracking,
            onSelectionChange: setFilterTracking,
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        onCreateNew={() => handleOpenBookingCRUDForm(null, 'create')}
        createButtonLabel="Create Booking"
        additionalButtons={[
          {
            label: showSplitView ? "Split View" : "Single View",
            icon: <ViewListIcon />,
            onClick: toggleSplitView,
            variant: showSplitView ? "contained" : "outlined",
          },
          ...(selectedFloorPlanId ? [{
            label: "Edit Floor Plan",
            icon: <MenuIcon />,
            onClick: () => setDesignerOpen(true),
            variant: "outlined" as const,
          }] : []),
        ]}
        // Add floor plan dropdown to the header
        additionalControls={
          <FormControl size="small" sx={{ minWidth: 200, ml: 1 }}>
            <InputLabel sx={{ color: "white" }}>Floor Plan</InputLabel>
            <Select
              value={selectedFloorPlanId}
              onChange={handleFloorPlanChange}
              label="Floor Plan"
              sx={{
                color: "white",
                "& .MuiSvgIcon-root": { color: "white" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
              }}
              MenuProps={{
                PaperProps: { sx: { mt: 1 } },
              }}
            >
              <MenuItem value="">
                Select a floor plan
              </MenuItem>
              <MenuItem value="__create__">+ Create New Floor Plan</MenuItem>
              {floorPlans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.isDefault && <Chip label="Default" size="small" sx={{ ml: 1 }} />}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Floor Plan View */}
        <Paper
          sx={{
            flex: showSplitView ? 0.7 : 1,
            position: "relative",
            overflow: "auto",
            mr: showSplitView ? 2 : 0,
            backgroundColor: isDragging ? theme.palette.action.hover : theme.palette.background.paper,
            transition: "background-color 0.3s ease",
          }}
          onTouchStart={handleTouchPanStart}
          onTouchMove={handleTouchPanMove}
          onTouchEnd={handleTouchPanEnd}
        >
          {selectedFloorPlan ? (
            <TableLayoutDesigner 
              initialFloorPlan={selectedFloorPlan}
              initialMode="view"
              bookings={filteredBookings}
              selectedDate={format(currentDate, "yyyy-MM-dd")}
              onBookingUpdate={updateBooking}
              onBookingClick={handleBookingClick}
            />
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", p: 4 }}>
              {floorPlans.length === 0 ? (
                <EmptyStateCard
                  icon={MapIcon}
                  title="No floor plans found"
                  description="Create your first floor plan to get started."
                />
              ) : (
                <EmptyStateCard
                  icon={MapIcon}
                  title="No floor plan selected"
                  description="Select a floor plan from the dropdown above to view bookings."
                />
              )}
            </Box>
          )}

          {/* Unassigned Bookings Section */}
          <Box
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              padding: 2,
              backgroundColor: theme.palette.grey[50],
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
            }}
            onDrop={async (e) => {
              e.preventDefault()
              if (!draggedBooking) return

              try {
                // Remove table assignment
                await updateBooking(draggedBooking.id, {
                  tableNumber: "",
                  tableId: "",
                })

                // Update local state
                setBookings((prevBookings) =>
                  prevBookings.map((booking) =>
                    booking.id === draggedBooking.id ? { ...booking, tableNumber: "", tableId: "" } : booking,
                  ),
                )

                setNotification({
                  message: "Booking moved to unassigned",
                  type: "success",
                })
              } catch (err) {
                console.error("Error unassigning booking:", err)
                setNotification({
                  message: "Failed to unassign booking",
                  type: "error",
                })
              }

              setDraggedBooking(null)
              setIsDragging(false)
            }}
          >
            <BookingList
              selectedDate={format(currentDate, "yyyy-MM-dd")}
              showUnassignedOnly={true}
              title="Unassigned Bookings"
              onBookingClick={handleBookingClick}
              onTrackingChange={async (bookingId, newTracking) => {
                try {
                  await updateBooking(bookingId, { tracking: newTracking })
                  setNotification({ message: `Booking tracking updated to ${newTracking}`, type: "success" })
                } catch (error) {
                  console.error('Error updating booking tracking:', error)
                  setNotification({ message: "Failed to update booking tracking", type: "error" })
                }
              }}
              maxHeight="300px"
            />
          </Box>
        </Paper>

        {/* Side Panel (when split view is enabled) */}
        {showSplitView && (
          <Paper sx={{ width: 300, ml: 2, overflow: "hidden", height: "100%" }}>
            <BookingList
              selectedDate={format(currentDate, "yyyy-MM-dd")}
              showUnassignedOnly={false}
              title={`All Bookings`}
              onBookingClick={handleBookingClick}
              onTrackingChange={async (bookingId, newTracking) => {
                try {
                  await updateBooking(bookingId, { tracking: newTracking })
                  setNotification({ message: `Booking tracking updated to ${newTracking}`, type: "success" })
                } catch (error) {
                  console.error('Error updating booking tracking:', error)
                  setNotification({ message: "Failed to update booking tracking", type: "error" })
                }
              }}
            />
          </Paper>
        )}
      </Box>

      {/* Date Picker Dialog */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          value={currentDate}
          onChange={handleDateChange}
          slotProps={{
            textField: { sx: { display: "none" } },
            popper: {
              anchorEl: dateButtonRef.current,
              placement: "bottom-start",
              sx: {
                zIndex: 1300,
                "& .MuiPaper-root": {
                  marginTop: 1,
                },
              },
            },
          }}
        />
      </LocalizationProvider>

      {/* Tracking Change Menu */}
      {renderTrackingMenu()}

      {/* Booking Form Dialog */}
      <BookingForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        booking={selectedBooking || undefined}
        onSave={fetchData}
      />

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetails
          open={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          booking={selectedBooking}
          tableName={tables.find((t) => t.id === selectedBooking.tableNumber)?.name || "Unassigned"}
          onEdit={() => {
            setIsDetailsOpen(false)
            setIsFormOpen(true)
          }}
          onDelete={() => {
            setIsDetailsOpen(false)
            fetchData()
          }}
        />
      )}

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification ? (
          <Alert onClose={() => setNotification(null)} severity={notification.type} sx={{ width: "100%" }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      {/* Floor Plan Designer (Create/Edit) */}
      <Dialog open={designerOpen} onClose={() => setDesignerOpen(false)} maxWidth="xl" fullWidth>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableLayoutDesigner 
            initialFloorPlan={selectedFloorPlan}
            initialMode={selectedFloorPlan ? 'edit' : 'create'}
            selectedDate={format(currentDate, "yyyy-MM-dd")}
            onClose={() => {
              setDesignerOpen(false)
              fetchData() // Refresh data after editing
            }}
          />
        </DialogContent>
      </Dialog>

      {/* CRUD Modal for Bookings */}
      <CRUDModal
        open={bookingCRUDFormOpen}
        onClose={(reason) => {
          setBookingCRUDFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBookingForCRUD(null)
            setBookingCRUDFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "floorPlanEditorModal1",
          crudMode: bookingCRUDFormMode,
          id: selectedBookingForCRUD?.id,
          itemLabel:
            [selectedBookingForCRUD?.firstName, selectedBookingForCRUD?.lastName].filter(Boolean).join(" ").trim() ||
            undefined,
        }}
        title={bookingCRUDFormMode === 'create' ? 'Create Booking' : bookingCRUDFormMode === 'edit' ? 'Edit Booking' : 'View Booking'}
        icon={<SaveIcon />}
        mode={bookingCRUDFormMode}
        onEdit={() => setBookingCRUDFormMode("edit")}
        onSave={bookingCRUDFormMode !== "view" ? async () => {} : undefined}
        hideSaveButton={bookingCRUDFormMode === "view"}
        maxWidth="lg"
      >
        <TabbedBookingForm
          booking={selectedBookingForCRUD}
          mode={bookingCRUDFormMode}
          onSave={handleSaveBookingCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default FloorPlanEditor
