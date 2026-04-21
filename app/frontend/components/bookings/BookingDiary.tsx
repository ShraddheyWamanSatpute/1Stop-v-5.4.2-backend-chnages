"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Typography,
  Box,
  Button,
  useTheme,
  Paper,
  Alert,
  Chip,
  Snackbar,
} from "@mui/material"
import {
  OpenWith,
  ViewList as ViewListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, Booking, BookingType, Table } from "../../../backend/context/BookingsContext"
// All operations now come from BookingsContext
import { format } from "date-fns"
import { debugWarn, debugLog } from "../../../utils/debugLog"
import BookingForm from "./BookingForm"
import BookingDetails from "./BookingDetails"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TabbedBookingForm from "./forms/TabbedBookingForm"
import DataHeader, { FilterOption } from "../reusable/DataHeader"
import BookingList from "./BookingList"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { THEME_COLORS } from "../../styles/themeColors"

// Function to generate time slots based on business hours
const generateTimeSlotsFromBusinessHours = (bookingSettings: any) => {
  if (!bookingSettings?.businessHours || !Array.isArray(bookingSettings.businessHours)) {
    // Fallback to default time slots if no business hours (9am to 11pm)
    return [
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", 
      "19:00", "20:00", "21:00", "22:00", "23:00"
    ]
  }

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayName = dayNames[dayOfWeek]

  // Find business hours for today
  const todayBusinessHours = bookingSettings.businessHours.find(
    (hours: any) => hours.day === currentDayName
  )

  if (!todayBusinessHours || todayBusinessHours.closed) {
    // If closed today, use default hours (9am to 11pm)
    return [
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", 
      "19:00", "20:00", "21:00", "22:00", "23:00"
    ]
  }

  // Generate time slots based on business hours
  const timeSlots: string[] = []
  const openTime = todayBusinessHours.open || "12:00"
  const closeTime = todayBusinessHours.close || "23:00"

  // Parse open and close times
  const [openHour, openMin] = openTime.split(':').map(Number)
  const [closeHour, closeMin] = closeTime.split(':').map(Number)

  // Convert to minutes for easier calculation
  const openMinutes = openHour * 60 + openMin
  const closeMinutes = closeHour * 60 + closeMin

  // Handle overnight hours (close time is before open time = same day but late night)
  const isOvernight = closeMinutes < openMinutes

  let currentMinutes = openMinutes
  let endMinutes = closeMinutes

  if (isOvernight) {
    // For same-day overnight (e.g., 19:00 to 01:30), we want to show slots until 23:00
    // and then from 00:00 to close time, but all on the same day
    endMinutes = 24 * 60 // End at midnight (24:00)
  }

  // Generate slots from open time to end time
  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60) % 24
    const min = currentMinutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    timeSlots.push(timeString)

    // Increment by 1 hour (60 minutes)
    currentMinutes += 60
  }

  // If it's overnight, also add slots from 00:00 to close time
  if (isOvernight) {
    currentMinutes = 0 // Start at midnight
    endMinutes = closeMinutes

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60) % 24
      const min = currentMinutes % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      timeSlots.push(timeString)

      // Increment by 1 hour (60 minutes)
      currentMinutes += 60
    }
  }

  // Always add the close time if it's on the hour
  if (closeMin === 0) {
    const closeTimeString = `${closeHour.toString().padStart(2, '0')}:00`
    if (!timeSlots.includes(closeTimeString)) {
      timeSlots.push(closeTimeString)
    }
  }

  return timeSlots.length > 0 ? timeSlots : [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00", "22:00", "23:00"
  ]
}


// Function to generate 15-minute time slots based on business hours
const generate15MinTimeSlotsFromBusinessHours = (bookingSettings: any) => {
  if (!bookingSettings?.businessHours || !Array.isArray(bookingSettings.businessHours)) {
    // Fallback to default 15-minute slots if no business hours (9am to 11pm)
    return [
      "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
      "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
      "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45",
      "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45",
      "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45",
      "21:00", "21:15", "21:30", "21:45", "22:00", "22:15", "22:30", "22:45",
      "23:00", "23:15", "23:30", "23:45"
    ]
  }

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayName = dayNames[dayOfWeek]

  // Find business hours for today
  const todayBusinessHours = bookingSettings.businessHours.find(
    (hours: any) => hours.day === currentDayName
  )

  if (!todayBusinessHours || todayBusinessHours.closed) {
    // If closed today, use default 15-minute slots (9am to 11pm)
    return [
      "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
      "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
      "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45",
      "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45",
      "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45",
      "21:00", "21:15", "21:30", "21:45", "22:00", "22:15", "22:30", "22:45",
      "23:00", "23:15", "23:30", "23:45"
    ]
  }

  // Generate 15-minute time slots based on business hours
  const timeSlots: string[] = []
  const openTime = todayBusinessHours.open || "12:00"
  const closeTime = todayBusinessHours.close || "23:00"

  // Parse open and close times
  const [openHour, openMin] = openTime.split(':').map(Number)
  const [closeHour, closeMin] = closeTime.split(':').map(Number)

  // Convert to minutes for easier calculation
  const openMinutes = openHour * 60 + openMin
  const closeMinutes = closeHour * 60 + closeMin

  // Handle overnight hours (close time is before open time = same day but late night)
  const isOvernight = closeMinutes < openMinutes

  let currentMinutes = openMinutes
  let endMinutes = closeMinutes

  if (isOvernight) {
    // For same-day overnight (e.g., 19:00 to 01:30), we want to show slots until 23:45
    // and then from 00:00 to close time, but all on the same day
    endMinutes = 24 * 60 // End at midnight (24:00)
  }

  // Generate slots from open time to end time
  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60) % 24
    const min = currentMinutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    timeSlots.push(timeString)

    // Increment by 15 minutes
    currentMinutes += 15
  }

  // If it's overnight, also add slots from 00:00 to close time
  if (isOvernight) {
    currentMinutes = 0 // Start at midnight
    endMinutes = closeMinutes

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60) % 24
      const min = currentMinutes % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      timeSlots.push(timeString)

      // Increment by 15 minutes
      currentMinutes += 15
    }
  }

  return timeSlots.length > 0 ? timeSlots : [
    "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
    "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45",
    "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
    "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45",
    "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45",
    "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45",
    "21:00", "21:15", "21:30", "21:45", "22:00", "22:15", "22:30", "22:45",
    "23:00", "23:15", "23:30", "23:45"
  ]
}

// Interface for drag data
interface DragData {
  bookingId: string
  sourceTableId: string
}

// Update the BookingStatus interface to match the one in other components
interface BookingStatus {
  id?: string
  name: string
  description: string
  color: string
  isDefault: boolean
  allowsEditing: boolean
  allowsSeating: boolean
  countsAsAttended: boolean
  active: boolean
  order: number
  createdAt?: string
  updatedAt?: string
}

// Define tracking status type to match the Booking interface
type TrackingStatus =
  | "Not Arrived"
  | "Arrived"
  | "Seated"
  | "Appetizers"
  | "Starters"
  | "Mains"
  | "Desserts"
  | "Bill"
  | "Paid"
  | "Left"
  | "No Show"
  | undefined

// Define default status colors - these match the original code
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

// Define default tracking statuses
const TRACKING_STATUSES: TrackingStatus[] = [
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
]


// Define default booking types with colors
const DEFAULT_BOOKING_TYPES: BookingType[] = [
  { id: "standard", name: "Standard", color: "#E3F2FD", description: "Regular booking" } as BookingType, // Light Blue
  { id: "vip", name: "VIP", color: "#F3E5F5", description: "VIP booking" } as BookingType, // Light Purple
  { id: "event", name: "Event", color: "#E8F5E8", description: "Event booking" } as BookingType, // Light Green
  { id: "corporate", name: "Corporate", color: "#FFF3E0", description: "Corporate booking" } as BookingType, // Light Orange
  { id: "birthday", name: "Birthday", color: "#FCE4EC", description: "Birthday celebration" } as BookingType, // Light Pink
  { id: "anniversary", name: "Anniversary", color: "#F1F8E9", description: "Anniversary celebration" } as BookingType, // Light Lime
]

// Helper function to normalize color values - copied from BookingCalendar
const normalizeColor = (color: string | undefined): string => {
  const location = useLocation()
  if (!color) return "#4caf50" // Default color

  // Ensure color starts with #
  const normalizedColor = color.startsWith("#") ? color : "#" + color

  // Ensure it's a valid hex color
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
    return "#4caf50" // Default to green if invalid
  }

  return normalizedColor
}

const BookingDiary: React.FC<{}> = () => {
  const theme = useTheme()
  const {
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    bookings: contextBookings,
    tables: contextTables,
    bookingTags,
    bookingSettings,
    loading: contextLoading,
    error: contextError,
    fetchBookingTypes,
    fetchBookingStatuses,
    fetchTables,
    fetchBookings,
    fetchBookingSettings,
    addBooking,
    updateBooking,
    deleteBooking,
  } = useBookingsContext()

  // Use context data instead of local state
  // Sort tables by order field (from table management)
  const tables = useMemo(() => {
    const contextTablesList = contextTables || []
    return [...contextTablesList].sort((a, b) => {
      const aOrder = a.order || 0
      const bOrder = b.order || 0
      return aOrder - bOrder
    })
  }, [contextTables])
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Use context bookings directly, filtered by current date
  const bookings = useMemo(() => {
    const fetchedBookings = contextBookings || []
    const dateStr = format(currentDate, "yyyy-MM-dd")
    return fetchedBookings.filter((booking: Booking) => booking.date === dateStr)
  }, [contextBookings, currentDate])

  // Generate time slots based on business hours and extend if bookings exist outside business hours
  const HOUR_SLOTS = useMemo(() => {
    const baseTimeSlots = generateTimeSlotsFromBusinessHours(bookingSettings)
    
    // Check if there are any bookings outside business hours
    const todayBookings = bookings.filter(booking => {
      if (!booking.date || !booking.arrivalTime) return false
      const bookingDate = new Date(booking.date)
      return bookingDate.toDateString() === new Date().toDateString()
    })

    if (todayBookings.length === 0) {
      return baseTimeSlots
    }

    // Extract unique time slots from bookings
    const bookingTimes = new Set<string>()
    todayBookings.forEach(booking => {
      if (booking.arrivalTime) {
        // Extract hour from time (e.g., "14:30" -> "14:00")
        const [hour] = booking.arrivalTime.split(':')
        const timeSlot = `${hour.padStart(2, '0')}:00`
        bookingTimes.add(timeSlot)
      }
    })

    // Add booking times that are outside business hours
    const extendedTimeSlots = [...baseTimeSlots]
    bookingTimes.forEach(timeSlot => {
      if (!extendedTimeSlots.includes(timeSlot)) {
        extendedTimeSlots.push(timeSlot)
      }
    })

    // Sort the extended time slots
    extendedTimeSlots.sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number)
      const [bHour, bMin] = b.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    })

    return extendedTimeSlots
  }, [bookingSettings, bookings])

  // Generate 15-minute time slots based on business hours and extend if bookings exist outside business hours
  const TIME_SLOTS_15MIN = useMemo(() => {
    const baseTimeSlots = generate15MinTimeSlotsFromBusinessHours(bookingSettings)
    
    // Check if there are any bookings outside business hours
    const todayBookings = bookings.filter(booking => {
      if (!booking.date || !booking.arrivalTime) return false
      const bookingDate = new Date(booking.date)
      return bookingDate.toDateString() === new Date().toDateString()
    })

    if (todayBookings.length === 0) {
      return baseTimeSlots
    }

    // Extract unique time slots from bookings (15-minute intervals)
    const bookingTimes = new Set<string>()
    todayBookings.forEach(booking => {
      if (booking.arrivalTime) {
        // Round to nearest 15-minute interval
        const [hour, min] = booking.arrivalTime.split(':').map(Number)
        const totalMinutes = hour * 60 + min
        const roundedMinutes = Math.floor(totalMinutes / 15) * 15
        const roundedHour = Math.floor(roundedMinutes / 60)
        const roundedMin = roundedMinutes % 60
        const timeSlot = `${roundedHour.toString().padStart(2, '0')}:${roundedMin.toString().padStart(2, '0')}`
        bookingTimes.add(timeSlot)
      }
    })

    // Add booking times that are outside business hours
    const extendedTimeSlots = [...baseTimeSlots]
    bookingTimes.forEach(timeSlot => {
      if (!extendedTimeSlots.includes(timeSlot)) {
        extendedTimeSlots.push(timeSlot)
      }
    })

    // Sort the extended time slots
    extendedTimeSlots.sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number)
      const [bHour, bMin] = b.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    })

    return extendedTimeSlots
  }, [bookingSettings, bookings])
  // Local loading removed - using context loading state
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterBookingType, setFilterBookingType] = useState<string[]>([])
  const [filterTracking, setFilterTracking] = useState<string[]>([])
  const [showSplitView, setShowSplitView] = useState(false)
  const [mode, setMode] = useState<"view" | "move">("view")
  const [draggedBooking, setDraggedBooking] = useState<DragData | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([])
  const [groupBy, setGroupBy] = useState<"none" | "location" | "bookingType" | "tracking">("none")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const UNASSIGNED_TABLE_ID = "__unassigned__"

  // Add state for booking type color map for quick lookup - from BookingCalendar
  const [bookingTypeColorMap, setBookingTypeColorMap] = useState<Record<string, string>>({})
  const [statusColorMap, setStatusColorMap] = useState<Record<string, string>>({})

  // Add these state variables at the top of the component with other state declarations
  const [touchLongPressTimer, setTouchLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [touchLongPressActive, setTouchLongPressActive] = useState(false)

  // CRUD form states
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingFormMode, setBookingFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBookingForForm, setSelectedBookingForForm] = useState<Booking | null>(null)
  const [touchFeedback, setTouchFeedback] = useState<HTMLElement | null>(null)
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null)
  const [touchBooking, setTouchBooking] = useState<Booking | null>(null)
  const [touchTarget, setTouchTarget] = useState<string | null>(null)

  // Refs
  const isMounted = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchTables()
    fetchBookingTypesAndStatuses()
    fetchBookingSettings()
  }, [currentDate])

  // Also fetch tables and settings on component mount
  useEffect(() => {
    fetchTables()
    fetchBookingSettings()
  }, [])

  // Create color maps when booking types and statuses change - from BookingCalendar
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

  // Helpers to reliably resolve a booking's table to a specific table id
  const normalizeText = (value?: string) => (value ? String(value).trim().toLowerCase() : "")
  const normalizeAlnum = (value?: string) => (value ? String(value).toLowerCase().replace(/[^a-z0-9]/g, "") : "")

  const tableIdSet = useMemo(() => new Set(tables.map((t) => String(t.id))), [tables])
  const tableNameToId = useMemo(() => {
    const map: Record<string, string> = {}
    tables.forEach((t) => {
      const key = normalizeText(String(t.name))
      if (key) map[key] = t.id
    })
    return map
  }, [tables])
  const tableNameAlnumToId = useMemo(() => {
    const map: Record<string, string> = {}
    tables.forEach((t) => {
      const key = normalizeAlnum(String(t.name))
      if (key) map[key] = t.id
    })
    return map
  }, [tables])

  const extractDigits = (val?: string) => (val ? val.replace(/\D+/g, "") : "")

  const resolveBookingTableId = (booking: Booking): string | null => {
    // First check if booking has selectedTables (new multi-select format)
    if (booking.selectedTables && booking.selectedTables.length > 0) {
      // For multi-table bookings, return the first table that exists
      for (const tableId of booking.selectedTables) {
        if (tableIdSet.has(tableId)) return tableId
        // Also check if it's a table name that maps to an ID
        const byName = tableNameToId[normalizeText(tableId)]
        if (byName) return byName
      }
    }

    // Fallback to legacy single table logic
    const idCandidate = String(booking.tableId || booking.tableNumber || "")
    if (idCandidate && tableIdSet.has(idCandidate)) return idCandidate

    const byNumberAsId = booking.tableNumber && tableIdSet.has(String(booking.tableNumber)) ? String(booking.tableNumber) : null
    if (byNumberAsId) return byNumberAsId

    const byNumberAsName = booking.tableNumber ? tableNameToId[normalizeText(booking.tableNumber)] : undefined
    if (byNumberAsName) return byNumberAsName

    const byIdAsName = booking.tableId ? tableNameToId[normalizeText(booking.tableId)] : undefined
    if (byIdAsName) return byIdAsName

    // Heuristic: match by alphanumeric-normalized name (e.g., "table1" ~ "1")
    const alnumKey = normalizeAlnum(booking.tableNumber || booking.tableId)
    if (alnumKey) {
      const byAlnum = tableNameAlnumToId[alnumKey]
      if (byAlnum) return byAlnum
    }

    // Heuristic: match by numeric component ignoring leading zeros
    const digits = extractDigits(booking.tableNumber || booking.tableId)
    if (digits) {
      const wanted = Number(digits)
      if (!Number.isNaN(wanted)) {
        const matches = tables.filter((t) => Number(extractDigits(String(t.name))) === wanted)
        if (matches.length === 1) return matches[0].id
      }
    }

    return null
  }

  // Check if a booking should appear on a specific table (for multi-table bookings)
  const isBookingOnTable = (booking: Booking, tableId: string): boolean => {
    // First check if booking has selectedTables (new multi-select format)
    if (booking.selectedTables && booking.selectedTables.length > 0) {
      // Check if this table is in the selected tables
      for (const selectedTableId of booking.selectedTables) {
        if (selectedTableId === tableId) return true
        // Also check if it's a table name that maps to this ID
        const byName = tableNameToId[normalizeText(selectedTableId)]
        if (byName === tableId) return true
      }
      return false
    }

    // Fallback to legacy single table logic
    const resolvedTableId = resolveBookingTableId(booking)
    return resolvedTableId === tableId
  }


  // Fetch booking types and statuses using BookingsContext
  const fetchBookingTypesAndStatuses = async () => {
    try {
      // Use fetchBookingTypes and fetchBookingStatuses from BookingsContext
      await Promise.all([
        fetchBookingTypes(),
        fetchBookingStatuses(),
      ])

      // Get the booking types and statuses from context
      const types = contextBookingTypes || []
      const statuses = contextBookingStatuses || []

      // Ensure we have valid arrays
      const validTypes = Array.isArray(types) ? types : []
      const validStatuses = Array.isArray(statuses) ? statuses : []

      // Normalize colors before setting state
      const typesWithNormalizedColors = validTypes.map((type: BookingType) => ({
        ...type,
        color: normalizeColor(type.color),
      }))

      const statusesWithNormalizedColors = validStatuses.map((status: any) => ({
        ...status,
        color: normalizeColor(status.color),
      }))

      setBookingTypes(typesWithNormalizedColors.length > 0 ? typesWithNormalizedColors : DEFAULT_BOOKING_TYPES)
      setBookingStatuses(statusesWithNormalizedColors.length > 0 ? statusesWithNormalizedColors : DEFAULT_STATUSES)
    } catch (err) {
      debugWarn("Error fetching booking types and statuses:", err)
      // Fallback to defaults on error
      setBookingTypes(DEFAULT_BOOKING_TYPES)
      setBookingStatuses(DEFAULT_STATUSES)
    }
  }

  // Remove fetchBookingsData function - now using context data directly




  const handleBookingClick = (booking: Booking) => {
    if (mode === "view") {
      setSelectedBooking(booking)
      setIsDetailsOpen(true)
    }
  }

  const handleAddBooking = (tableId?: string, timeSlot?: string) => {
    const defaultTime = timeSlot || "18:00"
    // Find the next hour slot or 1 hour later
    const timeIndex = TIME_SLOTS_15MIN.indexOf(defaultTime)
    const nextHourSlot = TIME_SLOTS_15MIN[Math.min(timeIndex + 4, TIME_SLOTS_15MIN.length - 1)]

    setSelectedBooking({
      id: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      date: format(currentDate, "yyyy-MM-dd"),
      arrivalTime: defaultTime,
      guests: 1,
      tableNumber: tableId || "",
      status: "Pending",
      tracking: "Not Arrived",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableId: tableId || "",
      endTime: nextHourSlot,
    } as Booking)

    setIsFormOpen(true)
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
        // Create new booking using the context
        const timeIndex = TIME_SLOTS_15MIN.indexOf(bookingData.arrivalTime || "18:00")
        const nextHourSlot = TIME_SLOTS_15MIN[Math.min(timeIndex + 4, TIME_SLOTS_15MIN.length - 1)]
        
        // Filter out undefined values before creating
        const newBookingData: any = {
          ...bookingData,
          date: format(currentDate, "yyyy-MM-dd"),
          endTime: nextHourSlot,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        // Filter out undefined values
        Object.keys(newBookingData).forEach(key => {
          if (newBookingData[key] === undefined) {
            delete newBookingData[key]
          }
        })
        
        // Add booking using the context
        await addBooking(newBookingData)
        setSnackbarMessage('Booking created successfully')
        setSnackbarOpen(true)
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
        setSnackbarMessage('Booking updated successfully')
        setSnackbarOpen(true)
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bookingDiaryModal1",
        crudMode: bookingFormMode,
        id: selectedBookingForForm?.id ?? bookingData?.id,
        itemLabel:
          [bookingData?.firstName, bookingData?.lastName].filter(Boolean).join(" ").trim() || undefined,
      })
      handleCloseBookingForm()
    } catch (error) {
      debugWarn('Error saving booking:', error)
      setSnackbarMessage('Failed to save booking')
      setSnackbarOpen(true)
    }
  }

  // Global scroll prevention function
  let globalPreventScroll: ((e: Event) => void) | null = null
  
  // State to prevent UI updates during move operation
  const [isMovingBooking, setIsMovingBooking] = useState(false)
  
  // Ref to store scroll position during move
  const scrollPositionRef = useRef<{ top: number; left: number } | null>(null)
  
  // Effect to maintain scroll position during move operations
  useEffect(() => {
    if (isMovingBooking && scrollPositionRef.current) {
      const interval = setInterval(() => {
        window.scrollTo(scrollPositionRef.current!.left, scrollPositionRef.current!.top)
      }, 5) // Check every 5ms
      
      return () => clearInterval(interval)
    }
  }, [isMovingBooking])

  const handleDragStart = (event: React.DragEvent, booking: Booking) => {
    if (mode !== "move") return

    // Store current scroll position to prevent page jumping
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
    const currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    
    // Store scroll position in ref for persistent access
    scrollPositionRef.current = { top: currentScrollTop, left: currentScrollLeft }
    
    // Store scroll position in the event data for later restoration
    event.dataTransfer.setData("scroll-top", currentScrollTop.toString())
    event.dataTransfer.setData("scroll-left", currentScrollLeft.toString())

    // Prevent scrolling during drag by adding a temporary style
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${currentScrollTop}px`
    document.body.style.left = `-${currentScrollLeft}px`
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    // Also prevent scrolling on the document element
    document.documentElement.style.overflow = 'hidden'

    // Prevent focus changes that might cause scrolling
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }

    // Add a global scroll prevention listener
    globalPreventScroll = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      window.scrollTo(currentScrollLeft, currentScrollTop)
    }
    
    window.addEventListener('scroll', globalPreventScroll, { passive: false })
    document.addEventListener('scroll', globalPreventScroll, { passive: false })

    event.dataTransfer.setData("text/plain", booking.id)
    setDraggedBooking({
      bookingId: booking.id,
      sourceTableId: booking.tableNumber || "",
    })

    // Set a custom drag image with better styling
    const dragImage = document.createElement("div")
    dragImage.innerHTML = `
      <div style="
        background: ${getBookingTypeColor(booking)};
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid ${getStatusColor(booking.status)};
        min-width: 120px;
        text-align: center;
        transform: rotate(-2deg);
      ">
        ${booking.firstName} ${booking.lastName} • ${booking.guests}
      </div>
    `
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    dragImage.style.left = "-1000px"
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 60, 20)

    // Clean up after drag
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
  }

  const handleDragEnd = () => {
    if (mode !== "move") return
    
    // Clean up scroll styles in case drag was cancelled
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.width = ''
    document.body.style.height = ''
    document.documentElement.style.overflow = ''
    
    // Remove scroll prevention listeners
    if (globalPreventScroll) {
      window.removeEventListener('scroll', globalPreventScroll)
      document.removeEventListener('scroll', globalPreventScroll)
      globalPreventScroll = null
    }
    
    // Clean up any remaining drag-over visual feedback
    const dragOverElements = document.querySelectorAll('.drag-over')
    dragOverElements.forEach(el => {
      el.classList.remove('drag-over')
      const htmlEl = el as HTMLElement
      htmlEl.style.backgroundColor = ''
      htmlEl.style.borderColor = ''
    })
  }

  const handleDragOver = (event: React.DragEvent) => {
    if (mode !== "move") return
    
    // Prevent default to allow drop
    event.preventDefault()
    
    // Add visual feedback for drop zones
    const target = event.currentTarget as HTMLElement
    if (target && !target.classList.contains('drag-over')) {
      target.classList.add('drag-over')
      target.style.backgroundColor = theme.palette.primary.light + '20'
      target.style.borderColor = theme.palette.primary.main
    }
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (mode !== "move") return
    
    // Remove visual feedback
    const target = event.currentTarget as HTMLElement
    if (target) {
      target.classList.remove('drag-over')
      target.style.backgroundColor = ''
      target.style.borderColor = ''
    }
  }

  const handleDrop = async (event: React.DragEvent, tableId: string) => {
    if (mode !== "move" || !draggedBooking) return
    
    // Prevent any default behavior and propagation
    event.preventDefault()
    event.stopPropagation()
    
    // Get stored scroll position from drag start
    const storedScrollTop = event.dataTransfer.getData("scroll-top")
    const storedScrollLeft = event.dataTransfer.getData("scroll-left")
    const currentScrollTop = storedScrollTop ? parseInt(storedScrollTop) : (window.pageYOffset || document.documentElement.scrollTop)
    const currentScrollLeft = storedScrollLeft ? parseInt(storedScrollLeft) : (window.pageXOffset || document.documentElement.scrollLeft)

    const bookingId = event.dataTransfer.getData("text/plain")
    if (!bookingId) return

    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    // If dropped on the same table, do nothing
    if (booking.tableNumber === tableId) {
      setDraggedBooking(null)
      return
    }

    try {
      // Set moving state to prevent UI updates
      setIsMovingBooking(true)
      
      // Ensure tableId is a string (not undefined)
      const safeTableId = tableId || ""
      const targetTable = tables.find((t) => t.id === safeTableId)

      // Create an updates object with only the fields that need to be updated
      const updates = {
        // Update both id and human readable number/name
        tableId: safeTableId,
        tableNumber: targetTable?.name || safeTableId,
        updatedAt: new Date().toISOString(),
      }

      // Include id in update payload (required for proper updates)
      const updatePayload: any = { ...updates, id: bookingId }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      // Update the booking in the backend
      await updateBooking(bookingId, updatePayload)

      // Show success message immediately to prevent UI flash
      setSnackbarMessage(`Booking moved to ${targetTable?.name || safeTableId}`)
      setSnackbarOpen(true)
      
      // Keep the moving state active for a while to maintain scroll position via useEffect
      setTimeout(() => {
        setIsMovingBooking(false)
      }, 3000)
    } catch (err) {
      debugWarn("Error updating booking:", err)
      setError("Failed to move booking. Please try again.")
      setIsMovingBooking(false) // Clear moving state on error
      // Don't refresh here to prevent page reload - let user retry manually
    } finally {
      setDraggedBooking(null)
      // Note: setIsMovingBooking(false) is handled by timeout in success case
      
      // Restore scroll styles and position
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      
      // Remove scroll prevention listeners
      const removeScrollListeners = () => {
        if (globalPreventScroll) {
          window.removeEventListener('scroll', globalPreventScroll)
          document.removeEventListener('scroll', globalPreventScroll)
          globalPreventScroll = null
        }
      }
      
      // Keep scroll prevention active for a while after drop
      setTimeout(() => {
        removeScrollListeners()
      }, 3000) // Keep it active longer
      
      // Restore scroll position to prevent page jumping
      window.scrollTo(currentScrollLeft, currentScrollTop)
      
      // Clean up any remaining drag-over visual feedback
      const dragOverElements = document.querySelectorAll('.drag-over')
      dragOverElements.forEach(el => {
        el.classList.remove('drag-over')
        const htmlEl = el as HTMLElement
        htmlEl.style.backgroundColor = ''
        htmlEl.style.borderColor = ''
      })
    }
  }

  // Replace the existing touch handlers with these improved versions
  const handleTouchStart = (e: React.TouchEvent, booking: Booking) => {
    if (mode !== "move") return

    // Don't prevent default here due to passive event listeners
    // Instead, we'll use CSS touch-action: none on the element

    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setTouchBooking(booking)

    // Clear any existing timer
    if (touchLongPressTimer) {
      clearTimeout(touchLongPressTimer)
    }

    // Set a timer for long press (150ms for faster response)
    const timer = setTimeout(() => {
      setTouchLongPressActive(true)

      // Create visual feedback element
      const feedback = document.createElement("div")
      feedback.textContent = `${booking.firstName} ${booking.lastName}`
      feedback.style.position = "fixed"
      feedback.style.left = `${touch.clientX - 50}px`
      feedback.style.top = `${touch.clientY - 25}px`
      feedback.style.backgroundColor = getBookingTypeColor(booking)
      feedback.style.color = "white"
      feedback.style.padding = "8px 12px"
      feedback.style.borderRadius = "8px"
      feedback.style.zIndex = "9999"
      feedback.style.pointerEvents = "none"
      feedback.style.opacity = "0.9"
      feedback.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)"
      feedback.style.fontSize = "14px"
      feedback.style.fontWeight = "bold"
      feedback.style.transform = "scale(1.1)"
      feedback.style.transition = "all 0.2s ease"
      document.body.appendChild(feedback)
      setTouchFeedback(feedback)

      // Set dragged booking state similar to mouse drag
      setDraggedBooking({
        bookingId: booking.id,
        sourceTableId: booking.tableNumber || "",
      })

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 150)

    setTouchLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || !touchBooking || mode !== "move") return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)

    // If we've moved beyond threshold before long press activated, cancel the long press
    if (!touchLongPressActive && (deltaX > 10 || deltaY > 10)) {
      if (touchLongPressTimer) {
        clearTimeout(touchLongPressTimer)
        setTouchLongPressTimer(null)
      }
      return
    }

    // Only proceed with drag behavior if long press is active
    if (touchLongPressActive) {
      // Move the feedback element with the touch
      if (touchFeedback) {
        touchFeedback.style.left = `${touch.clientX - 50}px`
        touchFeedback.style.top = `${touch.clientY - 25}px`
      }

      // Find the element under the touch point
      const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY)

      // Look for table elements under the touch point
      const tableElement = elementsUnderTouch.find((el) => el.getAttribute("data-table-id")) as HTMLElement | undefined

      if (tableElement) {
        const tableId = tableElement.getAttribute("data-table-id")
        if (tableId) {
          setTouchTarget(tableId)

          // Highlight the target table
          tableElement.style.backgroundColor = `${theme.palette.primary.light}20`
          tableElement.style.boxShadow = `inset 0 0 0 2px ${theme.palette.primary.main}`
        }
      } else {
        setTouchTarget(null)
      }
    }
  }

  const handleTouchEnd = async (_e: React.TouchEvent) => {
    // Clear the long press timer
    if (touchLongPressTimer) {
      clearTimeout(touchLongPressTimer)
      setTouchLongPressTimer(null)
    }

    // If long press wasn't activated, treat as a click
    if (!touchLongPressActive && touchBooking && mode !== "move") {
      handleBookingClick(touchBooking)
      resetTouchState()
      return
    }

    // Clean up the feedback element
    if (touchFeedback) {
      // Add a fade out animation
      touchFeedback.style.opacity = "0"
      touchFeedback.style.transform = "scale(0.8)"
      setTimeout(() => {
        if (touchFeedback && document.body.contains(touchFeedback)) {
          document.body.removeChild(touchFeedback)
        }
      }, 200)
      setTouchFeedback(null)
    }

    // Reset any highlighted tables
    const highlightedTables = document.querySelectorAll("[data-table-id]")
    highlightedTables.forEach((el: Element) => {
      ;(el as HTMLElement).style.backgroundColor = ""
      ;(el as HTMLElement).style.boxShadow = ""
    })

    // If we have a booking and target table, perform the move
    if (touchBooking && touchTarget) {
      try {
        // If dropped on the same table, do nothing
        if (touchBooking.tableNumber === touchTarget) {
          resetTouchState()
          return
        }

        // Create an updates object with only the fields that need to be updated
        // Include id in update payload (required for proper updates)
        const updates: any = {
          id: touchBooking.id,
          tableId: touchTarget,
          tableNumber: tables.find((t) => t.id === touchTarget)?.name || touchTarget,
          updatedAt: new Date().toISOString(),
        }
        // Filter out undefined values
        Object.keys(updates).forEach(key => {
          if (updates[key] === undefined) {
            delete updates[key]
          }
        })

        await updateBooking(touchBooking.id, updates)

        // Show success message
        const table = tables.find((t) => t.id === touchTarget)
        setSnackbarMessage(`Booking moved to ${table?.name || touchTarget}`)
        setSnackbarOpen(true)

        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50])
        }
      } catch (err) {
        debugWarn("Error updating booking:", err)
        setError("Failed to move booking. Please try again.")
      }
    }

    resetTouchState()
  }

  // Add this helper function to reset all touch state
  const resetTouchState = () => {
    setTouchBooking(null)
    setTouchTarget(null)
    setTouchStartPos(null)
    setDraggedBooking(null)
    setTouchLongPressActive(false)
  }

  // Update the getAllBookingStatuses function to ensure proper type handling
  const getAllBookingStatuses = useMemo(() => {
    if (bookingStatuses.length > 0) {
      return bookingStatuses
    }

    // Extract unique statuses from bookings
    const uniqueStatuses = Array.from(new Set(bookings.map((b) => b.status).filter(Boolean)))
    return uniqueStatuses.map((status) => {
      const defaultStatus = DEFAULT_STATUSES.find((s) => s.name === status)
      return (
        defaultStatus || {
          id: `default-${status}`,
          name: status,
          color: theme.palette.text.disabled,
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
      // Ensure all bookingTypes have a valid name property
      return bookingTypes.map(type => ({
        ...type,
        name: type.name || 'Unnamed Type' // Provide default name if undefined
      })) as BookingType[]
    }

    // Extract unique types from bookings
    const uniqueTypes = Array.from(new Set(bookings.map((b) => b.bookingType).filter(Boolean)))
    return uniqueTypes.map((type, index) => {
      const defaultType = DEFAULT_BOOKING_TYPES.find((t) => t.name === type)
      if (defaultType) return defaultType

      return {
        id: `type-${index}`,
        name: type || 'Unnamed Type', // Ensure name is never undefined
        color: `hsl(${index * 60}, 70%, 50%)`, // Generate different colors
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
    }) as BookingType[]
  }, [bookingTypes, bookings])

  // Get all unique tracking statuses from bookings
  const getAllTrackingStatuses = useMemo(() => {
    // Start with the default tracking statuses
    const trackingSet = new Set(TRACKING_STATUSES)

    // Add any custom tracking statuses from bookings
    bookings.forEach((booking) => {
      if (booking.tracking) {
        trackingSet.add(booking.tracking as TrackingStatus)
      }
    })

    return Array.from(trackingSet)
  }, [bookings])

  // Helper functions for getting names from IDs - memoized with useCallback
  const getBookingTypeName = useCallback((bookingTypeId: string | undefined): string => {
    if (!bookingTypeId) return "Unknown"
    const bookingType = getAllBookingTypes.find((type) => type.id === bookingTypeId || type.name === bookingTypeId)
    return bookingType ? bookingType.name : bookingTypeId
  }, [getAllBookingTypes])

  const getStatusName = useCallback((statusId: string | undefined): string => {
    if (!statusId) return "Unknown"
    const status = getAllBookingStatuses.find((s) => s.id === statusId || s.name === statusId)
    return status ? status.name : statusId
  }, [getAllBookingStatuses])

  // Filter bookings based on selected filters and search term
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Status filter (multi)
      const statusMatch = filterStatus.length === 0 || (booking.status && filterStatus.includes(booking.status))

      // Booking type filter (multi)
      const typeMatch = filterBookingType.length === 0 || (booking.bookingType && filterBookingType.includes(booking.bookingType))

      // Tracking filter (multi)
      const trackingMatch = filterTracking.length === 0 || (booking.tracking && filterTracking.includes(booking.tracking))

      // Search filter - search across name, email, phone, notes, table name
      const searchMatch = !searchTerm || (() => {
        const searchLower = searchTerm.toLowerCase()
        const fullName = `${booking.firstName} ${booking.lastName}`.toLowerCase()
        const email = (booking.email || "").toLowerCase()
        const phone = (booking.phone || "").toLowerCase()
        const notes = (booking.notes || "").toLowerCase()
        const specialRequests = (booking.specialRequests || "").toLowerCase()
        const dietaryRequirements = (booking.dietaryRequirements || "").toLowerCase()
        
        // Also search table names
        const resolvedTableId = resolveBookingTableId(booking)
        const tableName = resolvedTableId ? (tables.find(t => t.id === resolvedTableId)?.name || "").toLowerCase() : ""
        
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
    filterBookingType,
    filterTracking,
    searchTerm,
    tables,
    getAllBookingStatuses,
    getAllBookingTypes,
    getAllTrackingStatuses,
  ])


  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(":").map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  // Calculate the duration of a booking in 15-minute slots
  const getBookingDuration = (booking: Booking): number => {
    if (!booking.endTime && booking.duration) {
      // booking.duration in interfaces is minutes; if it's hours from form, we convert there
      return Math.max(1, Math.ceil((booking.duration) / 15))
    }

    if (!booking.endTime) return 4 // Default to 1 hour (4 x 15-minute slots) if no end time

    const startMinutes = timeToMinutes(booking.arrivalTime)
    let endMinutes = timeToMinutes(booking.endTime)

    // Handle overnight bookings
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60 // Add a day
    }

    const durationMinutes = endMinutes - startMinutes
    return Math.max(1, Math.ceil(durationMinutes / 15)) // Convert to 15-minute slots
  }

  // Get booking type color from database - UPDATED to match BookingCalendar approach
  const getBookingTypeColor = (booking: Booking) => {
    if (!booking.bookingType) return theme.palette.primary.light

    // Use the color map for direct lookup
    if (bookingTypeColorMap[booking.bookingType]) {
      return bookingTypeColorMap[booking.bookingType]
    }

    // Try to find the booking type in actual database types
    const bookingType = getAllBookingTypes.find(
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

    // Try to find in default booking types
    const defaultType = DEFAULT_BOOKING_TYPES.find(
      (type) => type.name === booking.bookingType || type.id === booking.bookingType,
    )
    if (defaultType && defaultType.color) {
      return normalizeColor(defaultType.color)
    }

    // Last resort fallback
    return theme.palette.primary.light
  }

  // Get status color from database - UPDATED to match BookingCalendar approach
  const getStatusColor = (status: string | undefined) => {
    if (!status) return theme.palette.primary.main

    // Use the color map for direct lookup
    if (statusColorMap[status]) {
      return statusColorMap[status]
    }

    // Find the matching status by name
    const statusObj = getAllBookingStatuses.find((s) => s.name === status)

    if (statusObj && statusObj.color) {
      // Add to the map for future lookups
      const color = normalizeColor(statusObj.color)
      setStatusColorMap((prev) => ({
        ...prev,
        [status]: color,
      }))
      return color
    }

    // Fallback to default statuses
    const defaultStatus = DEFAULT_STATUSES.find((s) => s.name === status)
    return defaultStatus?.color || theme.palette.primary.main
  }


  // Calculate total guests arriving at a specific 15-minute time slot
  const getTotalGuestsArrivingAtTime = (timeSlot: string) => {
    return filteredBookings.reduce((total, booking) => {
      if (booking.status === "Cancelled") return total

      // Only count guests if they are arriving at this exact time
      if (booking.arrivalTime === timeSlot) {
        return total + booking.guests
      }

      return total
    }, 0)
  }


  // Prepare filter options for DataHeader
  const filterOptions = useMemo(() => {
    const filters = []
    
    // Status filter
    if (getAllBookingStatuses.length > 0) {
      filters.push({
        label: "Status",
        options: getAllBookingStatuses.map((status): FilterOption => ({
          id: (status.id || status.name || "unknown") as string,
          name: (status.name || "Unknown") as string,
          color: status.color,
        })),
        selectedValues: filterStatus,
        onSelectionChange: (values: string[]) => setFilterStatus(values),
      })
    }
    
    // Booking Type filter
    if (getAllBookingTypes.length > 0) {
      filters.push({
        label: "Type",
        options: getAllBookingTypes.map((type): FilterOption => ({
          id: (type.id || type.name || "unknown") as string,
          name: (type.name || "Unknown") as string,
          color: type.color,
        })),
        selectedValues: filterBookingType,
        onSelectionChange: (values: string[]) => setFilterBookingType(values),
      })
    }
    
    // Tracking filter
    filters.push({
      label: "Tracking",
      options: getAllTrackingStatuses.map((option): FilterOption => ({
        id: option || "unknown",
        name: option || "Unknown",
        color: "#9e9e9e", // Default color for tracking
      })),
      selectedValues: filterTracking,
      onSelectionChange: (values: string[]) => setFilterTracking(values),
    })
    
    return filters
  }, [getAllBookingStatuses, getAllBookingTypes, filterStatus, filterBookingType, filterTracking])

  // Group by options for DataHeader
  const groupByOptions = useMemo(() => [
    { value: "none", label: "None" },
    { value: "location", label: "Location" },
    { value: "bookingType", label: "Type" },
    { value: "tracking", label: "Tracking" },
  ], [])

  // Update the renderHeader function to use DataHeader
  const renderDataHeader = () => (
    <DataHeader
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      dateType="day"
      onDateTypeChange={() => {}} // Diary is always day view
      showDateTypeSelector={false} // Hide date type selector - always day view
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search bookings by name, email, phone, notes, or table..."
      filters={filterOptions}
      filtersExpanded={filtersExpanded}
      onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
      groupByOptions={groupByOptions}
      groupByValue={groupBy}
      onGroupByChange={(value) => setGroupBy(value as "none" | "location" | "bookingType" | "tracking")}
      onCreateNew={() => handleOpenBookingForm(null, 'create')}
      createButtonLabel="Create Booking"
      additionalButtons={[
        {
          label: showSplitView ? "Split View" : "Single View",
          icon: <ViewListIcon />,
          onClick: () => setShowSplitView(!showSplitView),
          variant: "outlined",
        },
        {
          label: mode === "view" ? "View Mode" : "Move Mode",
          icon: <OpenWith />,
          onClick: () => setMode(mode === "view" ? "move" : "view"),
          variant: mode === "move" ? "contained" : "outlined",
        }
      ]}
    />
  )

  // Keep the old renderHeader function for reference (to be removed)

  // Render the time slots header with hourly labels and guest counters
  const renderTimeHeader = (headerHeight: number = 40) => (
    <Box
      sx={{
        display: "flex",
        position: "sticky",
        top: 0,
        zIndex: 2,
        bgcolor: theme.palette.background.paper,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <Box
        sx={{
          width: 150,
          flexShrink: 0,
          height: headerHeight, // Use dynamic height
          p: 0.5, // Compact padding
          borderRight: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
          Tables
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
        }}
      >
        {HOUR_SLOTS.map((hourSlot, index) => {
          if (index === HOUR_SLOTS.length - 1) return null // Skip the last hour slot

          // Get the 15-minute slots for this hour
          const slotIndex = TIME_SLOTS_15MIN.indexOf(hourSlot)
          const fifteenMinSlots = TIME_SLOTS_15MIN.slice(slotIndex, slotIndex + 4)

          return (
            <Box
              key={hourSlot}
              sx={{
                width: 100,
                flexShrink: 0,
                borderRight: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.grey[50],
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Hour label */}
              <Box
                sx={{
                  p: 1,
                  textAlign: "center",
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="body2" fontWeight="bold" color="text.primary">
                  {hourSlot}
                </Typography>
              </Box>

              {/* Guest counters for each 15-minute slot */}
              <Box
                sx={{
                  display: "flex",
                  height: 20,
                }}
              >
                {fifteenMinSlots.map((slot, slotIndex) => {
                  const guestsAtSlot = getTotalGuestsArrivingAtTime(slot)
                  return (
                    <Box
                      key={slot}
                      sx={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRight: slotIndex < 3 ? `1px solid ${theme.palette.divider}` : "none",
                        opacity: 0.7,
                      }}
                    >
                      {guestsAtSlot > 0 && (
                        <Chip
                          label={guestsAtSlot}
                          size="small"
                          color="primary"
                          sx={{
                            height: 14,
                            fontSize: "0.55rem",
                            fontWeight: "bold",
                            "& .MuiChip-label": { px: 0.3 },
                            minWidth: 20,
                          }}
                        />
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )

  // Render a table row with 15-minute grid lines
  const renderTableRow = (table: Table, groupFilter?: (booking: Booking) => boolean) => {
    // Get all bookings for this table (or unassigned pseudo row)
    let tableBookings =
      table.id === UNASSIGNED_TABLE_ID
        ? filteredBookings.filter((booking) => resolveBookingTableId(booking) === null)
        : filteredBookings.filter((booking) => {
            // Include bookings that are assigned to this table OR are multi-table bookings that include this table
            return isBookingOnTable(booking, table.id)
          })
    
    // Apply group filter if provided (for bookingType or tracking grouping)
    if (groupFilter) {
      tableBookings = tableBookings.filter(groupFilter)
    }

    // Table bookings processed


    // Calculate dynamic row height based on maximum overlapping bookings across all hour slots
    let maxOverlaps = 1
    HOUR_SLOTS.forEach((hourSlot, index) => {
      if (index === HOUR_SLOTS.length - 1) return

      const hourStartMinutes = timeToMinutes(hourSlot)
      const hourEndMinutes = hourStartMinutes + 60

      // Find all bookings that have any overlap within this hour
      const bookingsInHour = tableBookings.filter((booking) => {
        const bookingStart = timeToMinutes(booking.arrivalTime)
        const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + 60

        return bookingStart < hourEndMinutes && bookingEnd > hourStartMinutes
      })

      // For each minute in this hour, count overlapping bookings
      for (let minute = 0; minute < 60; minute += 15) {
        const checkTime = hourStartMinutes + minute
        const overlappingAtTime = bookingsInHour.filter((booking) => {
          const bookingStart = timeToMinutes(booking.arrivalTime)
          const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + 60
          return bookingStart <= checkTime && bookingEnd > checkTime
        })
        maxOverlaps = Math.max(maxOverlaps, overlappingAtTime.length)
      }
    })

    // Calculate dynamic row height based on maximum overlapping bookings
    const baseRowHeight = 40
    const overlapHeight = 20 // Height per overlapping booking
    const rowHeight = Math.max(baseRowHeight, maxOverlaps * overlapHeight + 10)
    

    return (
      <Box
        key={table.id || `name-${table.name}`}
        data-table-id={table.id !== UNASSIGNED_TABLE_ID ? table.id : undefined}
        sx={{
          display: "flex",
          minHeight: rowHeight, // Use minHeight to allow expansion
          height: rowHeight, // Also set height for consistency
          borderBottom: `1px solid ${theme.palette.divider}`,
          "&:hover": {
            bgcolor: theme.palette.action.hover,
          },
          backgroundColor: touchTarget === table.id ? `${theme.palette.primary.light}20` : undefined,
          boxShadow: touchTarget === table.id ? `inset 0 0 0 2px ${theme.palette.primary.main}` : undefined,
          transition: "background-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onDragOver={table.id === UNASSIGNED_TABLE_ID ? undefined : handleDragOver}
        onDragLeave={table.id === UNASSIGNED_TABLE_ID ? undefined : handleDragLeave}
        onDrop={table.id === UNASSIGNED_TABLE_ID ? undefined : (e) => handleDrop(e, table.id)}
      >
        <Box
          sx={{
            width: 150,
            flexShrink: 0,
            minHeight: rowHeight, // Use minHeight to allow expansion
            height: rowHeight, // Also set height for consistency
            p: 0.5, // Compact padding
            borderRight: `1px solid ${theme.palette.divider}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            bgcolor: theme.palette.background.default,
          }}
        >
          <Typography variant="body1" fontWeight="bold" color="text.primary">
            {table.id === UNASSIGNED_TABLE_ID ? "Unassigned" : table.name}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            position: "relative",
            minHeight: rowHeight,
          }}
        >
          {HOUR_SLOTS.map((hourSlot, hourIndex) => {
            if (hourIndex === HOUR_SLOTS.length - 1) return null

            // Get the 15-minute slots for this hour
            const slotIndex = TIME_SLOTS_15MIN.indexOf(hourSlot)
            const fifteenMinSlots = TIME_SLOTS_15MIN.slice(slotIndex, slotIndex + 4)

            return (
              <Box
                key={`${table.id}-${hourSlot}`}
                sx={{
                  width: 100,
                  flexShrink: 0,
                  minHeight: rowHeight, // Use minHeight to allow expansion
                  height: rowHeight, // Also set height for consistency
                  borderRight: `1px solid ${theme.palette.divider}`,
                  position: "relative",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: theme.palette.action.hover,
                  },
                }}
                onClick={() => table.id !== UNASSIGNED_TABLE_ID && handleAddBooking(table.id, hourSlot)}
              >
                {/* 15-minute vertical grid lines */}
                {fifteenMinSlots.slice(0, 3).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: "absolute",
                      left: `${(i + 1) * 25}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      bgcolor: theme.palette.divider,
                      opacity: 0.5,
                      zIndex: 1,
                    }}
                  />
                ))}

                {/* Render bookings as continuous blocks across their full duration */}
                {tableBookings.map((booking, bookingIndex) => {
                  const hourStartMinutes = timeToMinutes(hourSlot)
                  const hourEndMinutes = hourStartMinutes + 60

                  const bookingStart = timeToMinutes(booking.arrivalTime)
                  const bookingEndRaw = booking.endTime
                    ? timeToMinutes(booking.endTime)
                    : bookingStart + (getBookingDuration(booking) * 15)
                  const bookingEnd = bookingEndRaw < bookingStart ? bookingEndRaw + 24 * 60 : bookingEndRaw

                  // Only render in the hour slot where the booking starts
                  if (bookingStart < hourStartMinutes || bookingStart >= hourEndMinutes) return null

                  const typeColor = getBookingTypeColor(booking)
                  const statusColor = getStatusColor(booking.status)
                  

                  // Calculate position and width for the full booking duration across the entire day
                  const segmentStart = bookingStart - hourStartMinutes
                  const leftPct = (segmentStart / 60) * 100
                  
                  // Calculate width based on full booking duration, not just within this hour
                  const bookingDurationMinutes = bookingEnd - bookingStart
                  const widthPct = Math.max(2, (bookingDurationMinutes / 60) * 100)

                  // Find all bookings that overlap with this booking in time
                  const overlappingBookings = tableBookings.filter((otherBooking) => {
                    const otherStart = timeToMinutes(otherBooking.arrivalTime)
                    const otherEnd = otherBooking.endTime ? timeToMinutes(otherBooking.endTime) : otherStart + 60
                    
                    // Check if bookings overlap in time OR are back-to-back (for better visual stacking)
                    const hasOverlap = (
                      otherBooking.id !== booking.id &&
                      (
                        // Traditional overlap: bookings that share time
                        (otherStart < bookingEnd && otherEnd > bookingStart) ||
                        // Back-to-back: one ends exactly when the other starts
                        (otherStart === bookingEnd || otherEnd === bookingStart)
                      )
                    )
                    
                    
                    return hasOverlap
                  })

                  // Sort all overlapping bookings by start time
                  const allOverlapping = [booking, ...overlappingBookings].sort((a, b) => {
                    const aStart = timeToMinutes(a.arrivalTime)
                    const bStart = timeToMinutes(b.arrivalTime)
                    return aStart - bStart
                  })
                  
                  const overlapIndex = allOverlapping.findIndex(b => b.id === booking.id)
                  const totalOverlaps = allOverlapping.length

                  // Calculate booking card dimensions with overlap stacking
                  const bookingHeight = Math.max(20, (rowHeight - 8) / totalOverlaps) // Divide height among overlapping bookings
                  const verticalOffset = 4 + (overlapIndex * bookingHeight) // Stack vertically


                  // Check if this is a multi-table booking
                  const isMultiTable = booking.selectedTables && booking.selectedTables.length > 1
                  const isMainTable = !isMultiTable || booking.tableId === table.id
                  const isSecondaryTable = isMultiTable && booking.tableId !== table.id

                  return (
                    <Box
                      key={`${booking.id}-${table.id}-${hourSlot}-${segmentStart}-${overlapIndex}-${bookingIndex}`}
                      draggable={mode === "move"}
                      onDragStart={(e) => handleDragStart(e, booking)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, booking)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      sx={{
                        position: "absolute",
                        top: verticalOffset,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: bookingHeight,
                        backgroundColor: typeColor,
                        border: `2px solid ${statusColor}`,
                        borderRadius: 1,
                        p: 0.25,
                        zIndex: 10 - overlapIndex, // Higher z-index for earlier bookings
                        cursor: mode === "move" ? "grab" : "pointer",
                        overflow: "hidden",
                        boxShadow: isSecondaryTable ? "0 1px 2px rgba(0,0,0,0.1)" : "0 2px 4px rgba(0,0,0,0.15)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        touchAction: mode === "move" ? "none" : "auto",
                        opacity: draggedBooking?.bookingId === booking.id ? 0.5 : (isSecondaryTable ? 0.6 : 1),
                        transform: draggedBooking?.bookingId === booking.id ? "scale(0.95)" : "scale(1)",
                        "&:hover": {
                          transform: mode === "move" ? "translateY(-2px) scale(1.02)" : "translateY(-2px)",
                          boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
                          zIndex: 2,
                        },
                        "&:active": {
                          cursor: mode === "move" ? "grabbing" : "pointer",
                          transform: "scale(0.98)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBookingClick(booking)
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
                        <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: "bold",
                              fontSize: "0.7rem",
                              lineHeight: 1.1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: theme.palette.text.primary,
                            }}
                          >
                            {booking.firstName} {booking.lastName}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.6rem",
                              lineHeight: 1.1,
                              color: theme.palette.text.secondary,
                              fontWeight: "medium",
                              flexShrink: 0,
                            }}
                          >
                            • {booking.guests}
                            {isMultiTable && (
                              <span style={{ marginLeft: 4, fontSize: "0.5rem", opacity: 0.8 }}>
                                {isMainTable ? " (Main)" : " (Multi)"}
                              </span>
                            )}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: statusColor,
                            flexShrink: 0,
                            border: "2px solid white",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }}
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  // Render the main diary content - simplified to always show continuous list of tables
  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const renderDiaryContent = () => {
    if (contextError || error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {contextError || error}
          <Button onClick={() => fetchBookings()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )
    }

    // Calculate maximum row height across all tables for consistent header height
    const maxRowHeight = Math.max(40, ...tables.map(table => {
      const tableBookings = table.id === UNASSIGNED_TABLE_ID
        ? filteredBookings.filter((booking) => resolveBookingTableId(booking) === null)
        : filteredBookings.filter((booking) => isBookingOnTable(booking, table.id))
      
      let maxOverlaps = 1
      HOUR_SLOTS.forEach((hourSlot, index) => {
        if (index === HOUR_SLOTS.length - 1) return
        const hourStartMinutes = timeToMinutes(hourSlot)
        const hourEndMinutes = hourStartMinutes + 60
        const bookingsInHour = tableBookings.filter((booking) => {
          const bookingStart = timeToMinutes(booking.arrivalTime)
          const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + 60
          return bookingStart < hourEndMinutes && bookingEnd > hourStartMinutes
        })
        for (let minute = 0; minute < 60; minute += 15) {
          const checkTime = hourStartMinutes + minute
          const overlappingAtTime = bookingsInHour.filter((booking) => {
            const bookingStart = timeToMinutes(booking.arrivalTime)
            const bookingEnd = booking.endTime ? timeToMinutes(booking.endTime) : bookingStart + 60
            return bookingStart <= checkTime && bookingEnd > checkTime
          })
          maxOverlaps = Math.max(maxOverlaps, overlappingAtTime.length)
        }
      })
      return Math.max(40, maxOverlaps * 20 + 10)
    }))

    // Calculate maximum row height

    // Group tables/bookings based on groupBy setting
    if (groupBy === "none") {
      // Show empty state if no tables or bookings
      if (tables.length === 0 && filteredBookings.length === 0) {
        return (
          <Box sx={{ py: 4 }}>
            <EmptyStateCard
              icon={ViewListIcon}
              title="No bookings found"
              description="Create your first booking to get started."
            />
          </Box>
        )
      }
      
      // Always show tables in a continuous list
      return (
        <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: "hidden" }}>
          {renderTimeHeader(maxRowHeight)}
          {tables.map((table) => renderTableRow(table))}
          {/* Unassigned row shows bookings we couldn't map to a table */}
          {filteredBookings.some(b => resolveBookingTableId(b) === null) && (
            renderTableRow({
              id: UNASSIGNED_TABLE_ID,
              name: "Unassigned",
              capacity: 0,
              status: "",
              active: true,
              minCovers: 0,
              createdAt: "",
              updatedAt: "",
              description: "",
              tableType: "",
            } as unknown as Table)
          )}
        </Box>
      )
    }

    // Group bookings by the selected criteria
    const groupedData: Record<string, { bookings: Booking[], tables: Table[] }> = {}

    if (groupBy === "location") {
      // Group by table location/area
      tables.forEach((table) => {
        const location = (table as any).area || (table as any).location || "Unknown"
        if (!groupedData[location]) {
          groupedData[location] = { bookings: [], tables: [] }
        }
        groupedData[location].tables.push(table)
      })

      // Add unassigned bookings to a group
      const unassignedBookings = filteredBookings.filter((booking) => resolveBookingTableId(booking) === null)
      if (unassignedBookings.length > 0) {
        if (!groupedData["Unassigned"]) {
          groupedData["Unassigned"] = { bookings: [], tables: [] }
        }
        groupedData["Unassigned"].bookings.push(...unassignedBookings)
      }
    } else if (groupBy === "bookingType") {
      // Group by booking type
      filteredBookings.forEach((booking) => {
        const typeName = getBookingTypeName(booking.bookingType) || "Unknown"
        if (!groupedData[typeName]) {
          groupedData[typeName] = { bookings: [], tables: [] }
        }
        groupedData[typeName].bookings.push(booking)
      })

      // For each group, find the tables that have bookings in that group
      Object.keys(groupedData).forEach((groupKey) => {
        const groupBookings = groupedData[groupKey].bookings
        const tablesInGroup = new Set<string>()
        
        groupBookings.forEach((booking) => {
          const tableId = resolveBookingTableId(booking)
          if (tableId) {
            tablesInGroup.add(tableId)
          }
        })

        // Add only tables that have bookings in this group
        tables.forEach((table) => {
          if (tablesInGroup.has(table.id)) {
            groupedData[groupKey].tables.push(table)
          }
        })
      })
    } else if (groupBy === "tracking") {
      // Group by tracking status
      filteredBookings.forEach((booking) => {
        const tracking = booking.tracking || "Not Arrived"
        if (!groupedData[tracking]) {
          groupedData[tracking] = { bookings: [], tables: [] }
        }
        groupedData[tracking].bookings.push(booking)
      })

      // For each group, find the tables that have bookings in that group
      Object.keys(groupedData).forEach((groupKey) => {
        const groupBookings = groupedData[groupKey].bookings
        const tablesInGroup = new Set<string>()
        
        groupBookings.forEach((booking) => {
          const tableId = resolveBookingTableId(booking)
          if (tableId) {
            tablesInGroup.add(tableId)
          }
        })

        // Add only tables that have bookings in this group
        tables.forEach((table) => {
          if (tablesInGroup.has(table.id)) {
            groupedData[groupKey].tables.push(table)
          }
        })
      })
    }

    // Render grouped content
    // Show empty state if no data
    if (tables.length === 0 && filteredBookings.length === 0) {
      return (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={ViewListIcon}
            title="No bookings found"
            description="Create your first booking to get started."
          />
        </Box>
      )
    }
    
    return (
      <Box>
        {Object.keys(groupedData).map((groupKey) => {
          const group = groupedData[groupKey]
          
          // For location grouping, show all tables in that location
          if (groupBy === "location") {
            return (
              <Box key={groupKey} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, px: 2, py: 1, bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, borderRadius: 1 }}>
                  {groupKey} ({group.tables.length} {group.tables.length === 1 ? 'table' : 'tables'})
                </Typography>
                <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: "hidden" }}>
                  {renderTimeHeader(maxRowHeight)}
                  {group.tables.map((table) => renderTableRow(table))}
                  {groupKey === "Unassigned" && group.bookings.length > 0 && (
                    renderTableRow({
                      id: UNASSIGNED_TABLE_ID,
                      name: "Unassigned",
                      capacity: 0,
                      status: "",
                      active: true,
                      minCovers: 0,
                      createdAt: "",
                      updatedAt: "",
                      description: "",
                      tableType: "",
                    } as unknown as Table)
                  )}
                </Box>
              </Box>
            )
          } else {
            // For bookingType or tracking grouping, show tables that have bookings in that group
            // Skip empty groups
            if (group.tables.length === 0 && group.bookings.length === 0) {
              return null
            }

            // Create a filter function for this group
            const groupFilter = (booking: Booking): boolean => {
              if (groupBy === "bookingType") {
                const bookingTypeName = getBookingTypeName(booking.bookingType) || "Unknown"
                return bookingTypeName === groupKey
              } else if (groupBy === "tracking") {
                const tracking = booking.tracking || "Not Arrived"
                return tracking === groupKey
              }
              return true
            }

            return (
              <Box key={groupKey} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, px: 2, py: 1, bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, borderRadius: 1 }}>
                  {groupKey} ({group.bookings.length} {group.bookings.length === 1 ? 'booking' : 'bookings'})
                </Typography>
                <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: "hidden" }}>
                  {renderTimeHeader(maxRowHeight)}
                  {group.tables.map((table) => renderTableRow(table, groupFilter))}
                  {group.bookings.some(b => resolveBookingTableId(b) === null) && (
                    renderTableRow({
                      id: UNASSIGNED_TABLE_ID,
                      name: "Unassigned",
                      capacity: 0,
                      status: "",
                      active: true,
                      minCovers: 0,
                      createdAt: "",
                      updatedAt: "",
                      description: "",
                      tableType: "",
                    } as unknown as Table, groupFilter)
                  )}
                </Box>
              </Box>
            )
          }
        })}
      </Box>
    )
  }

  // Render side panel with bookings list
  const renderSidePanel = () => {
    if (!showSplitView) return null

    return (
      <Paper sx={{ width: 300, ml: 2, overflow: "hidden", height: "100%" }}>
        <BookingList
          selectedDate={format(currentDate, "yyyy-MM-dd")}
          showUnassignedOnly={false}
          title="All Bookings"
          onBookingClick={handleBookingClick}
          onTrackingChange={async (bookingId, newTracking) => {
            try {
              // Include id in update payload (required for proper updates)
              const updatePayload: any = { id: bookingId, tracking: newTracking }
              // Filter out undefined values
              Object.keys(updatePayload).forEach(key => {
                if (updatePayload[key] === undefined) {
                  delete updatePayload[key]
                }
              })
              await updateBooking(bookingId, updatePayload)
              setSnackbarMessage(`Booking tracking updated to ${newTracking}`)
              setSnackbarOpen(true)
            } catch (error) {
              debugWarn('Error updating booking tracking:', error)
              setSnackbarMessage("Failed to update booking tracking")
              setSnackbarOpen(true)
            }
          }}
        />
      </Paper>
    )
  }

  // Render the main component layout
  return (
    <Box sx={{ p: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with date navigation and controls */}
      {renderDataHeader()}

      {/* Main content area */}
      <Box sx={{ flexGrow: 1, display: "flex", overflow: "auto" }}>
        {/* Booking Diary */}
        <Box sx={{ flexGrow: 1, overflowX: "auto", overflowY: "auto" }}>{renderDiaryContent()}</Box>

        {/* Side Panel (List View) */}
        {renderSidePanel()}
      </Box>

      {/* Booking Form Dialog */}
      <BookingForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedBooking(null)
        }}
        booking={selectedBooking as Booking}
        tables={tables}
        bookingTypes={getAllBookingTypes}
        bookingStatuses={getAllBookingStatuses}
        onBookingUpdate={() => {
          fetchBookings()
          setSnackbarMessage("Booking updated successfully")
          setSnackbarOpen(true)
        }}
      />

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetails
          open={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking as Booking}
          tableName={tables.find(t => t.id === selectedBooking.tableId)?.name || 'Unknown'}
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
              fetchBookings()
              setSnackbarMessage("Booking updated successfully")
              setSnackbarOpen(true)
            } catch (error) {
              debugWarn('Error updating booking:', error)
              throw error
            }
          }}
          bookingStatuses={bookingStatuses}
          tables={tables}
          bookingTags={bookingTags}
          onEdit={() => {
            setIsDetailsOpen(false);
            setIsFormOpen(true);
          }}
          onDelete={() => {
            // Close the details dialog
            setIsDetailsOpen(false);
            setSelectedBooking(null);
            // Show confirmation message
            setSnackbarMessage("Booking deleted successfully");
            setSnackbarOpen(true);
            // Refresh bookings
            fetchBookings();
          }}
        />
      )}

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

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
          crudEntity: "bookingDiaryModal1",
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

export default BookingDiary
