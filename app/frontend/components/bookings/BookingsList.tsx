"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  MenuItem,
  Grid,
  Collapse,
  CardContent,
  Divider,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Group as GroupIcon,
  AttachMoney as AttachMoneyIcon,
  Check as CheckIcon,
  AccessTime as AccessTimeIcon,
  Save as SaveIcon,
  ViewList as ListIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, Booking } from "../../../backend/context/BookingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TabbedBookingForm from "./forms/TabbedBookingForm"
import { format, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import DataHeader, { FilterOption, ColumnOption } from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

// Update the BookingsListProps interface to include groupBy
interface BookingsListProps {
  date?: string
  filterByStatus?: string
}

// Define time slots for 15-minute intervals

// Define tracking statuses

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

// Define tracking colors for visual indication (using actual color values)
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

const normalizeColor = (color: string | undefined): string => {
  if (!color) return "#9e9e9e" // Default gray color

  // Ensure color starts with #
  const normalizedColor = color.startsWith("#") ? color : "#" + color

  // Ensure it's a valid hex color
  if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
    return "#9e9e9e" // Default to gray if invalid
  }

  return normalizedColor
}

const BookingsList: React.FC<BookingsListProps> = ({ date: initialDate, filterByStatus }: BookingsListProps) => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "list")
  const canRemove = canDelete("bookings", "list")
  const {
    bookings: contextBookings,
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    tables: contextTables,
    bookingTags: contextBookingTags,
    loading: contextLoading,
    error: contextError,
    fetchBookings: contextFetchBookings,
    fetchBookingTags,
    addBooking,
    deleteBooking,
    updateBooking,
  } = useBookingsContext()

  const theme = useTheme()

  // Use context data instead of local state
  // Allow rendering even if loading - UI fills as data arrives (like HR section)
  const bookings = contextBookings || []
  const tables = contextTables || []
  const bookingTypes = contextBookingTypes || []
  const bookingStatuses = contextBookingStatuses || []
  const bookingTags = contextBookingTags || []
  const error = contextError
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)
  const [, setSelectedDate] = useState<string | null>(initialDate || format(new Date(), "yyyy-MM-dd"))
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>(filterByStatus ? [filterByStatus] : [])
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string[]>([])
  const [trackingFilter, setTrackingFilter] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<"none" | "status" | "bookingType" | "date" | "tracking">("none")
  const [currentDate, setCurrentDate] = useState(new Date())


  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null)

  // CRUD form states
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingFormMode, setBookingFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBookingForForm, setSelectedBookingForForm] = useState<Booking | null>(null)

  // Status change menu
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [bookingForStatusChange, setBookingForStatusChange] = useState<Booking | null>(null)

  // Tracking change menu
  const [trackingMenuAnchorEl, setTrackingMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [bookingForTrackingChange, setBookingForTrackingChange] = useState<Booking | null>(null)

  // Table change menu
  const [tableMenuAnchorEl, setTableMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [bookingForTableChange, setBookingForTableChange] = useState<Booking | null>(null)

  // Tags change menu
  const [tagsMenuAnchorEl, setTagsMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [bookingForTagsChange, setBookingForTagsChange] = useState<Booking | null>(null)

  // Group expansion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  // Add state for booking type color map for quick lookup - from BookingCalendar
  const [bookingTypeColorMap, setBookingTypeColorMap] = useState<Record<string, string>>({})
  const [statusColorMap, setStatusColorMap] = useState<Record<string, string>>({})

  // Filters expansion
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    email: true,
    date: true,
    startTime: true,
    endTime: true,
    guests: true,
    table: true,
    type: true,
    status: true,
    tracking: true,
    tags: true,
    notes: true,
    deposit: true,
    actions: true,
  })
  const visibleColumnCount = useMemo(
    () => Object.values(columnVisibility).filter(Boolean).length,
    [columnVisibility],
  )

  // Refs
  const isMounted = useRef(true)

  // Initialize with props
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setDateRange("custom")
    }

    if (filterByStatus) {
      setStatusFilter([filterByStatus])
    }
  }, [initialDate, filterByStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fetch data when component mounts
  useEffect(() => {
    contextFetchBookings()
    fetchBookingTags()
  }, []) // Only run on mount



  // Refetch when date changes (but not on every render)
  useEffect(() => {
    contextFetchBookings()
  }, [currentDate]) // Only when currentDate actually changes

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

  // CRUD form handlers
  const handleOpenBookingForm = (booking: Booking | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedBookingForForm(booking)
    setBookingFormMode(mode)
    setBookingFormOpen(true)
  }

  const toggleAnalyticsExpansion = () => {
    setAnalyticsExpanded(!analyticsExpanded)
  }

  const handleCloseBookingForm = () => {
    setBookingFormOpen(false)
    setSelectedBookingForForm(null)
  }

  const handleSaveBooking = async (bookingData: any) => {
    if (!canMutate) return
    try {
      if (bookingFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(bookingData).filter(([_, value]) => value !== undefined)
        )
        await addBooking(createPayload)
        setNotification({ message: 'Booking created successfully', type: 'success' })
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
        setNotification({ message: 'Booking updated successfully', type: 'success' })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bookingsListModal1",
        crudMode: bookingFormMode,
        id: selectedBookingForForm?.id ?? bookingData?.id,
        itemLabel:
          [bookingData?.firstName, bookingData?.lastName].filter(Boolean).join(" ").trim() || undefined,
      })
      handleCloseBookingForm()
      await contextFetchBookings()
    } catch (error) {
      debugWarn('Error saving booking:', error)
      setNotification({ message: 'Failed to save booking', type: 'error' })
    }
  }


  const handleDeleteClick = (bookingId: string) => {
    if (!canRemove) return
    setBookingToDelete(bookingId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!canRemove) return
    if (!bookingToDelete) return

    try {
      await deleteBooking(bookingToDelete)
      setNotification({ message: "Booking deleted successfully", type: "success" })
      setIsDeleteDialogOpen(false)
      setBookingToDelete(null)
      // Refresh bookings to get updated list
      contextFetchBookings()
    } catch (err) {
      debugWarn("Error deleting booking:", err)
      setNotification({ message: "Failed to delete booking", type: "error" })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!bookingForStatusChange) return

    try {
      // Include id in update payload (required for proper updates)
      const updatePayload: any = { id: bookingForStatusChange.id, status: newStatus }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateBooking(bookingForStatusChange.id, updatePayload)

      setNotification({ message: `Status updated to ${newStatus}`, type: "success" })
      // Refresh bookings to get updated list
      contextFetchBookings()
    } catch (err) {
      debugWarn("Error updating booking status:", err)
      setNotification({ message: "Failed to update status", type: "error" })
    } finally {
      setStatusMenuAnchorEl(null)
      setBookingForStatusChange(null)
    }
  }

  // Handle tracking change
  const handleTrackingChange = async (newTracking: TrackingStatus) => {
    if (!bookingForTrackingChange) return

    try {
      // Include id in update payload (required for proper updates)
      const updatePayload: any = { id: bookingForTrackingChange.id, tracking: newTracking }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateBooking(bookingForTrackingChange.id, updatePayload)

      setNotification({ message: `Tracking updated to ${newTracking}`, type: "success" })
      // Refresh bookings to get updated list
      contextFetchBookings()
    } catch (err) {
      debugWarn("Error updating booking tracking:", err)
      setNotification({ message: "Failed to update tracking", type: "error" })
    } finally {
      setTrackingMenuAnchorEl(null)
      setBookingForTrackingChange(null)
    }
  }

  // Handle multi-table change
  const handleMultiTableChange = async (newTableIds: string[]) => {
    if (!bookingForTableChange) return

    try {
      // Update with new selectedTables array and maintain legacy fields for compatibility
      const firstTableId = newTableIds[0] || ''
      const firstTable = tables.find(t => t.id === firstTableId || t.name === firstTableId)
      
      // Include id in update payload (required for proper updates)
      const updatePayload: any = {
        id: bookingForTableChange.id,
        selectedTables: newTableIds,
        tableId: firstTableId, // Legacy compatibility
        tableNumber: firstTable?.name || "", // Legacy compatibility (never store raw IDs in display fields)
      }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateBooking(bookingForTableChange.id, updatePayload)

      const tableNames = newTableIds.map(id => {
        const table = tables.find(t => t.id === id || t.name === id)
        return table?.name || "Unknown"
      }).join(', ')

      setNotification({ 
        message: `Tables updated to: ${tableNames || 'None'}`, 
        type: "success" 
      })
      contextFetchBookings()
    } catch (err) {
      debugWarn("Error updating booking tables:", err)
      setNotification({ message: "Failed to update tables", type: "error" })
    } finally {
      setTableMenuAnchorEl(null)
      setBookingForTableChange(null)
    }
  }

  // Handle tags change
  const handleTagsChange = async (newTags: string[]) => {
    if (!bookingForTagsChange) return


    try {
      // Include id in update payload (required for proper updates)
      const updatePayload: any = { id: bookingForTagsChange.id, tags: newTags }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateBooking(bookingForTagsChange.id, updatePayload)

      setNotification({ message: `Tags updated`, type: "success" })
      contextFetchBookings()
    } catch (err) {
      debugWarn("Error updating booking tags:", err)
      setNotification({ message: "Failed to update tags", type: "error" })
    } finally {
      setTagsMenuAnchorEl(null)
      setBookingForTagsChange(null)
    }
  }

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null)
  }

  // Helper functions for getting names from IDs - memoized with useCallback
  const getBookingTypeName = useCallback((bookingTypeId: string | undefined): string => {
    if (!bookingTypeId) return "Unknown"
    const bookingType = bookingTypes.find((type) => type.id === bookingTypeId || type.name === bookingTypeId)
    return bookingType?.name || "Unknown"
  }, [bookingTypes])

  const getStatusName = useCallback((statusId: string | undefined): string => {
    if (!statusId) return "Unknown"
    const status = bookingStatuses.find((status) => status.id === statusId || status.name === statusId)
    return status?.name || "Unknown"
  }, [bookingStatuses])

  // Get tracking color - return hex color from TRACKING_COLORS
  const getTrackingColor = useCallback((tracking: string | undefined): string => {
    const trackingKey = tracking || "Not Arrived"
    return TRACKING_COLORS[trackingKey] || "#9e9e9e"
  }, [])

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((booking) => {
        const fullName = `${booking.firstName || ""} ${booking.lastName || ""}`.toLowerCase()
        const email = (booking.email || "").toLowerCase()
        const notes = (booking.notes || "").toLowerCase()
        return fullName.includes(searchLower) || email.includes(searchLower) || notes.includes(searchLower)
      })
    }

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

    // Filter by current date
    const dateStr = format(currentDate, "yyyy-MM-dd")
    filtered = filtered.filter((booking) => booking.date === dateStr)

    return filtered
  }, [bookings, searchTerm, statusFilter, bookingTypeFilter, trackingFilter, currentDate, bookingTypes, bookingStatuses, getStatusName, getBookingTypeName])

  // Prepare filter options for DataHeader
  const filterOptions = useMemo(() => {
    const filters = []
    
    // Status filter - use names instead of IDs to match booking.status
    if (bookingStatuses.length > 0) {
      filters.push({
        label: "Status",
        options: bookingStatuses.map((status): FilterOption => ({
          id: status.name, // Use name as ID for matching
          name: status.name,
          color: status.color,
        })),
        selectedValues: statusFilter,
        onSelectionChange: (values: string[]) => setStatusFilter(values),
      })
    }
    
    // Booking Type filter - use names instead of IDs to match booking.bookingType
    if (bookingTypes.length > 0) {
      filters.push({
        label: "Type",
        options: bookingTypes.map((type): FilterOption => ({
          id: type.name, // Use name as ID for matching
          name: type.name,
          color: type.color,
        })),
        selectedValues: bookingTypeFilter,
        onSelectionChange: (values: string[]) => setBookingTypeFilter(values),
      })
    }
    
    // Tracking filter
    filters.push({
      label: "Tracking",
      options: TRACKING_OPTIONS.map((option): FilterOption => ({
        id: option,
        name: option,
        color: getTrackingColor(option),
      })),
      selectedValues: trackingFilter,
      onSelectionChange: (values: string[]) => setTrackingFilter(values),
    })
    
      return filters
  }, [bookingStatuses, bookingTypes, statusFilter, bookingTypeFilter, trackingFilter, getTrackingColor])

  // Prepare column options for DataHeader
  const columnOptions: ColumnOption[] = useMemo(() => [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "date", label: "Date" },
    { key: "startTime", label: "Start Time" },
    { key: "endTime", label: "End Time" },
    { key: "guests", label: "Guests" },
    { key: "table", label: "Table" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "tracking", label: "Tracking" },
    { key: "tags", label: "Tags" },
    { key: "notes", label: "Notes" },
    { key: "deposit", label: "Deposit" },
    { key: "actions", label: "Actions" },
  ], [])

  // Prepare group by options for DataHeader
  const groupByOptions = useMemo(() => [
    { value: "none", label: "None" },
    { value: "status", label: "Status" },
    { value: "bookingType", label: "Type" },
    { value: "date", label: "Date" },
    { value: "tracking", label: "Tracking" },
  ], [])

  // Render the new DataHeader component
  const renderDataHeader = () => (
    <DataHeader
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      dateType={dateRange === "today" ? "day" : dateRange}
      onDateTypeChange={(type) => setDateRange(type === "day" ? "today" : type)}
      showDateTypeSelector={true}
      availableDateTypes={["day", "week", "month", "custom"]}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search bookings..."
      filters={filterOptions}
      filtersExpanded={filtersExpanded}
      onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
      columns={columnOptions}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={(visibility) => setColumnVisibility(visibility as typeof columnVisibility)}
      groupByOptions={groupByOptions}
      groupByValue={groupBy}
      onGroupByChange={(value) => setGroupBy(value as "none" | "status" | "bookingType" | "date" | "tracking")}
      onExportCSV={handleExportCSV}
      onExportPDF={handleExportPDF}
      onCreateNew={() => handleOpenBookingForm(null, 'create')}
      createButtonLabel="Create Booking"
      createDisabled={!canMutate}
      createDisabledTooltip="You don't have permission to create or edit bookings."
    />
  )

  // Add the status change menu
  const renderStatusMenu = () => (
    <Menu 
      anchorEl={statusMenuAnchorEl} 
      open={Boolean(statusMenuAnchorEl)} 
      onClose={(_event, reason) => {
        // Only close on backdrop click or escape key, not on item selection
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          setStatusMenuAnchorEl(null)
        }
      }}
      disableAutoFocusItem
      disableRestoreFocus
      disableEnforceFocus
      disablePortal={false}
      keepMounted
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          style: {
            position: 'fixed',
          }
        }
      }}
      PaperProps={{
        onClick: (e: React.MouseEvent) => e.stopPropagation()
      }}
    >
      {bookingStatuses.map((status) => (
        <MenuItem 
          key={status.id || status.name} 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setTimeout(() => {
              handleStatusChange(status.name)
            }, 0)
          }}
        >
          <ListItemIcon>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: status.color,
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          </ListItemIcon>
          <ListItemText>{status.name}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  )


  // Add the tracking change menu
  const renderTrackingMenu = () => (
    <Menu
      anchorEl={trackingMenuAnchorEl}
      open={Boolean(trackingMenuAnchorEl)}
      onClose={(_event, reason) => {
        // Only close on backdrop click or escape key, not on item selection
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          setTrackingMenuAnchorEl(null)
        }
      }}
      disableAutoFocusItem
      disableRestoreFocus
      disableEnforceFocus
      disablePortal={false}
      keepMounted
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          style: {
            position: 'fixed',
          }
        }
      }}
      PaperProps={{
        onClick: (e: React.MouseEvent) => e.stopPropagation()
      }}
    >
      {TRACKING_OPTIONS.map((option) => (
        <MenuItem 
          key={option} 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setTimeout(() => {
              handleTrackingChange(option as TrackingStatus)
            }, 0)
          }}
        >
          <ListItemIcon>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                bgcolor: getTrackingColor(option),
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          </ListItemIcon>
          <ListItemText>{option}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  )

  // Add the table change menu (multi-select)
  const renderTableMenu = () => {
    // Split tables into columns of 10 items each
    const itemsPerColumn = 10
    const tableColumns = []
    for (let i = 0; i < tables.length; i += itemsPerColumn) {
      tableColumns.push(tables.slice(i, i + itemsPerColumn))
    }

    return (
      <Menu
        anchorEl={tableMenuAnchorEl}
        open={Boolean(tableMenuAnchorEl)}
        onClose={(_event, reason) => {
          // Only close on backdrop click or escape key, not on item selection
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setTableMenuAnchorEl(null)
          }
        }}
        disableAutoFocusItem
        disableRestoreFocus
        disableEnforceFocus
        disablePortal={false}
        keepMounted
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            style: {
              position: 'fixed',
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: '70vh',
            overflow: 'auto',
          },
          onClick: (e: React.MouseEvent) => e.stopPropagation() // Prevent menu from closing on internal clicks
        }}
      >
        <Box sx={{ display: 'flex', minWidth: 400 }}>
          {tableColumns.map((column, columnIndex) => (
            <Box key={columnIndex} sx={{ minWidth: 200, borderRight: columnIndex < tableColumns.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              {column.map((table) => {
                const isSelected = bookingForTableChange?.selectedTables?.includes(table.id || '') || 
                                  bookingForTableChange?.selectedTables?.includes(table.name || '') ||
                                  bookingForTableChange?.tableId === table.id ||
                                  bookingForTableChange?.tableNumber === table.name
                return (
                  <MenuItem 
                    key={table.id} 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Use setTimeout to prevent immediate re-render that causes menu repositioning
                      setTimeout(() => {
                        const currentTables = bookingForTableChange?.selectedTables || 
                                            (bookingForTableChange?.tableId ? [bookingForTableChange.tableId] : [])
                        const tableId = table.id || table.name || ''
                        const newTables = isSelected 
                          ? currentTables.filter(t => t !== tableId && t !== table.name)
                          : [...currentTables, tableId]
                        handleMultiTableChange(newTables)
                      }, 0)
                    }}
                    sx={{
                      py: 0.5,
                      px: 1,
                      minHeight: 'auto',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          bgcolor: isSelected ? themeConfig.brandColors.navy : 'transparent',
                          border: `2px solid ${isSelected ? themeConfig.brandColors.navy : 'grey.400'}`,
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={table.name}
                      sx={{ 
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          lineHeight: 1.2,
                        }
                      }}
                    />
                  </MenuItem>
                )
              })}
            </Box>
          ))}
        </Box>
      </Menu>
    )
  }

  // Add the tags change menu
  const renderTagsMenu = () => {
    return (
      <Menu
        anchorEl={tagsMenuAnchorEl}
        open={Boolean(tagsMenuAnchorEl)}
        onClose={(_event, reason) => {
          // Only close on backdrop click or escape key, not on item selection
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setTagsMenuAnchorEl(null)
          }
        }}
        disableAutoFocusItem
        disableRestoreFocus
        disableEnforceFocus
        disablePortal={false}
        keepMounted
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            style: {
              position: 'fixed',
            }
          }
        }}
        PaperProps={{
          onClick: (e: React.MouseEvent) => e.stopPropagation() // Prevent menu from closing on internal clicks
        }}
      >
        {bookingTags.map((tag) => {
          const isSelected = bookingForTagsChange?.tags?.includes(tag.id || tag.name) || false
          return (
            <MenuItem 
              key={tag.id || tag.name} 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Use setTimeout to prevent immediate re-render that causes menu repositioning
                setTimeout(() => {
                  const currentTags = bookingForTagsChange?.tags || []
                  const tagIdentifier = tag.id || tag.name
                  const newTags = isSelected 
                    ? currentTags.filter(t => t !== tagIdentifier)
                    : [...currentTags, tagIdentifier]
                  handleTagsChange(newTags)
                }, 0)
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    bgcolor: isSelected ? (tag.color || themeConfig.brandColors.navy) : 'transparent',
                    border: `2px solid ${tag.color || themeConfig.brandColors.navy}`,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />
              </ListItemIcon>
              <ListItemText>{tag.name}</ListItemText>
            </MenuItem>
          )
        })}
      </Menu>
    )
  }

  const getTableName = (tableId: string | undefined): string => {
    if (!tableId) return "Unknown"
    const table = tables.find((table) => table.id === tableId)
    return table?.name || "Unknown"
  }

  const getTagName = (tagIdOrName: string | undefined): string => {
    if (!tagIdOrName) return "Unknown"
    const tag = bookingTags.find((tag) => tag.id === tagIdOrName || tag.name === tagIdOrName)
    return tag?.name || "Unknown"
  }

  const getTagColor = (tagIdOrName: string | undefined): string => {
    if (!tagIdOrName) return themeConfig.brandColors.navy
    const tag = bookingTags.find((tag) => tag.id === tagIdOrName || tag.name === tagIdOrName)
    return tag ? tag.color || themeConfig.brandColors.navy : themeConfig.brandColors.navy
  }

  const getBookingTypeColor = (booking: Booking): string => {
    if (!booking.bookingType) return theme.palette.text.disabled

    return bookingTypeColorMap[booking.bookingType] || theme.palette.text.disabled
  }

  const getStatusColor = (status: string | undefined): string => {
    if (!status) return theme.palette.text.disabled

    return statusColorMap[status] || theme.palette.text.disabled
  }

  // Export filtered bookings to CSV
  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Date",
      "Start Time",
      "End Time",
      "Guests",
      "Table",
      "Type",
      "Status",
      "Tracking",
      "Notes",
      "Deposit",
    ]

    const escapeCSV = (val: unknown) => {
      const s = (val ?? "").toString()
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }

    const rows = filteredBookings.map((b) => [
      `${(b.firstName || "").trim()} ${(b.lastName || "").trim()}`.trim(),
      b.email || "",
      b.date || "",
      b.arrivalTime || "",
      b.endTime || b.until || "",
      String(b.guests || b.covers || 0),
      getTableName(b.tableNumber || b.tableId),
      getBookingTypeName(b.bookingType),
      getStatusName(b.status),
      b.tracking || "",
      b.notes || "",
      b.deposit != null ? String(b.deposit) : "",
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const dateStr = format(new Date(), "yyyyMMdd_HHmmss")
    link.download = `bookings_${dateStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setNotification({ message: "CSV exported", type: "success" })
  }

  // Export filtered bookings to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    const headers = [
      "Name",
      "Email",
      "Date",
      "Start Time",
      "End Time",
      "Guests",
      "Table",
      "Type",
      "Status",
      "Tracking",
      "Notes",
      "Deposit",
    ]
    const rows = filteredBookings.map((b) => [
      `${(b.firstName || "").trim()} ${(b.lastName || "").trim()}`.trim(),
      b.email || "",
      b.date || "",
      b.arrivalTime || "",
      b.endTime || b.until || "",
      String(b.guests || b.covers || 0),
      getTableName(b.tableNumber || b.tableId),
      getBookingTypeName(b.bookingType),
      getStatusName(b.status),
      b.tracking || "",
      b.notes || "",
      b.deposit != null ? String(b.deposit) : "",
    ])

    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210] },
      startY: 14,
      margin: 10,
    })

    const dateStr = format(new Date(), "yyyyMMdd_HHmmss")
    doc.save(`bookings_${dateStr}.pdf`)
    setNotification({ message: "PDF exported", type: "success" })
  }


  // Update the table rendering to support grouping
  const renderBookingsTable = () => {
    if (groupBy === "none") {
      return (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: "calc(100vh - 350px)", overflow: "auto", borderRadius: 2 }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columnVisibility.name && <TableCell align="center">Name</TableCell>}
                {columnVisibility.email && <TableCell align="center">Email</TableCell>}
                {columnVisibility.date && <TableCell align="center">Date</TableCell>}
                {columnVisibility.startTime && <TableCell align="center">Start Time</TableCell>}
                {columnVisibility.endTime && <TableCell align="center">End Time</TableCell>}
                {columnVisibility.guests && <TableCell align="center">Guests</TableCell>}
                {columnVisibility.table && <TableCell align="center">Table</TableCell>}
                {columnVisibility.type && <TableCell align="center">Type</TableCell>}
                {columnVisibility.status && <TableCell align="center">Status</TableCell>}
                {columnVisibility.tracking && <TableCell align="center">Tracking</TableCell>}
                {columnVisibility.tags && <TableCell align="center">Tags</TableCell>}
                {columnVisibility.notes && <TableCell align="center">Notes</TableCell>}
                {columnVisibility.deposit && <TableCell align="center">Deposit</TableCell>}
                {columnVisibility.actions && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} align="center" sx={{ py: 6 }}>
                    <EmptyStateCard
                      icon={ListIcon}
                      title={searchTerm || statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "No bookings match your filters" : "No bookings found"}
                      description={searchTerm || statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "Try adjusting your filters or search query" : "Create your first booking to get started."}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                renderBookingRows(filteredBookings)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )
    } else {
      // Group bookings based on the selected grouping
      const groupedBookings: Record<string, Booking[]> = {}

      filteredBookings.forEach((booking) => {
        let groupKey = "Unknown"

        if (groupBy === "status") {
          groupKey = getStatusName(booking.status) || "Unknown"
        } else if (groupBy === "bookingType") {
          groupKey = getBookingTypeName(booking.bookingType) || "Unknown"
        } else if (groupBy === "date") {
          if (booking.date) {
            try {
              groupKey = format(parseISO(booking.date), "dd/MM/yyyy")
            } catch {
              groupKey = booking.date
            }
          } else {
            groupKey = "Unknown"
          }
        } else if (groupBy === "tracking") {
          groupKey = booking.tracking || "Unknown"
        }

        if (!groupedBookings[groupKey]) {
          groupedBookings[groupKey] = []
        }

        groupedBookings[groupKey].push(booking)
      })

      if (Object.keys(groupedBookings).length === 0) {
        return (
          <Box sx={{ py: 4 }}>
            <EmptyStateCard
              icon={ListIcon}
              title={searchTerm || statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "No bookings match your filters" : "No bookings found"}
              description={searchTerm || statusFilter.length > 0 || bookingTypeFilter.length > 0 || trackingFilter.length > 0 ? "Try adjusting your filters or search query" : "Create your first booking to get started."}
            />
          </Box>
        )
      }
      
      return (
        <Box sx={{ maxHeight: "calc(100vh - 350px)", overflow: "auto" }}>
          {Object.entries(groupedBookings).map(([groupName, groupBookings]) => (
            <Paper key={groupName} sx={{ mb: 2, overflow: "hidden", borderRadius: 2 }} variant="outlined">
              <Box
                sx={{
                  p: 1.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  bgcolor: "action.hover",
                  cursor: "pointer",
                }}
                onClick={() => toggleGroupExpansion(groupName)}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {expandedGroups[groupName] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: "medium" }}>
                    {groupName}
                  </Typography>
                  <Chip label={`${groupBookings.length} bookings`} size="small" sx={{ ml: 2 }} />
                  <Chip
                    label={`${groupBookings.reduce((sum, booking) => sum + (booking.guests || 0), 0)} guests`}
                    size="small"
                    sx={{ ml: 1 }}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box>
              <Collapse in={expandedGroups[groupName] || false}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {columnVisibility.name && <TableCell align="center">Name</TableCell>}
                        {columnVisibility.email && <TableCell align="center">Email</TableCell>}
                        {columnVisibility.date && <TableCell align="center">Date</TableCell>}
                        {columnVisibility.startTime && <TableCell align="center">Start Time</TableCell>}
                        {columnVisibility.endTime && <TableCell align="center">End Time</TableCell>}
                        {columnVisibility.guests && <TableCell align="center">Guests</TableCell>}
                        {columnVisibility.table && <TableCell align="center">Table</TableCell>}
                        {columnVisibility.type && <TableCell align="center">Type</TableCell>}
                        {columnVisibility.status && <TableCell align="center">Status</TableCell>}
                        {columnVisibility.tracking && <TableCell align="center">Tracking</TableCell>}
                        {columnVisibility.tags && <TableCell align="center">Tags</TableCell>}
                        {columnVisibility.notes && <TableCell align="center">Notes</TableCell>}
                        {columnVisibility.deposit && <TableCell align="center">Deposit</TableCell>}
                        {columnVisibility.actions && <TableCell align="center">Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>{renderBookingRows(groupBookings)}</TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Paper>
          ))}
        </Box>
      )
    }
  }


  // Update the booking rows rendering to include tracking
  const renderBookingRows = (bookingsToRender: Booking[]) => {
    if (bookingsToRender.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={visibleColumnCount} align="center">
            <Box sx={{ py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No bookings found. {searchTerm && "Try adjusting your search criteria."}
              </Typography>
            </Box>
          </TableCell>
        </TableRow>
      )
    }

    return bookingsToRender.map((booking) => (
      <TableRow
        key={
          booking.id ||
          `${booking.date}-${booking.arrivalTime}-${booking.tableNumber || booking.tableId || "no-table"}-${
            booking.firstName
          }-${booking.lastName}`
        }
        hover
        onClick={() => handleOpenBookingForm(booking, 'view')}
        sx={{ 
          cursor: "pointer",
          '& > td': {
            paddingTop: 1,
            paddingBottom: 1,
          }
        }}
      >
        {columnVisibility.name && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography variant="body2" fontWeight="medium">
              {`${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Unknown"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.email && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography variant="body2" color="text.secondary">
              {booking.email || "No email"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.date && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography variant="body2">
              {booking.date ? format(parseISO(booking.date), "dd/MM/yyyy") : "No date"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.startTime && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography variant="body2" fontFamily="monospace">
              {booking.arrivalTime || "No time"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.endTime && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography variant="body2" fontFamily="monospace">
              {booking.endTime || booking.until || "No end time"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.guests && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GroupIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />
              <Typography variant="body2" fontWeight="medium">
                {booking.guests || booking.covers || 0}
              </Typography>
            </Box>
          </TableCell>
        )}
        {columnVisibility.table && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            {booking.selectedTables && booking.selectedTables.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  p: 0.5,
                  borderRadius: 1,
                  minHeight: 'auto',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setTableMenuAnchorEl(e.currentTarget)
                  setBookingForTableChange(booking)
                }}
              >
                {booking.selectedTables.map((tableId, index) => {
                  const tableName = getTableName(tableId)
                  return (
                    <Chip
                      key={tableId || index}
                      label={tableName}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )
                })}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Chip
                  label={getTableName(booking.tableNumber || booking.tableId)}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTableMenuAnchorEl(e.currentTarget)
                    setBookingForTableChange(booking)
                  }}
                  sx={{
                    cursor: "pointer",
                    fontWeight: "medium",
                    bgcolor: "action.hover",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                />
              </Box>
            )}
          </TableCell>
        )}
        {columnVisibility.type && (
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
        )}
        {columnVisibility.status && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Chip
              label={getStatusName(booking.status)}
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setStatusMenuAnchorEl(e.currentTarget)
                setBookingForStatusChange(booking)
              }}
              sx={{
                cursor: "pointer",
                fontWeight: "medium",
                bgcolor: `${getStatusColor(booking.status)}20`,
                color: getStatusColor(booking.status),
                borderColor: getStatusColor(booking.status),
                border: "1px solid",
              }}
            />
          </TableCell>
        )}
        {columnVisibility.tracking && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Chip
              label={booking.tracking || "Not Arrived"}
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setBookingForTrackingChange(booking)
                setTrackingMenuAnchorEl(e.currentTarget)
              }}
              sx={{
                cursor: "pointer",
                fontWeight: "medium",
                bgcolor: `${getTrackingColor(booking.tracking)}20`,
                color: getTrackingColor(booking.tracking),
                borderColor: getTrackingColor(booking.tracking),
                border: "1px solid",
              }}
            />
          </TableCell>
        )}
        {columnVisibility.tags && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            {booking.tags && booking.tags.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  p: 0.5,
                  borderRadius: 1,
                  minHeight: 'auto',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setTagsMenuAnchorEl(e.currentTarget)
                  setBookingForTagsChange(booking)
                }}
              >
                {booking.tags.map((tag, index) => (
                  <Chip
                    key={tag || index}
                    label={getTagName(tag)}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.75rem',
                      borderColor: getTagColor(tag),
                      color: getTagColor(tag),
                      '&:hover': {
                        backgroundColor: `${getTagColor(tag)}15`
                      }
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Chip
                  label="Add Tags"
                  size="small"
                  variant="outlined"
                  sx={{ 
                    cursor: "pointer",
                    opacity: 0.6,
                    "&:hover": { opacity: 1 }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setTagsMenuAnchorEl(e.currentTarget)
                    setBookingForTagsChange(booking)
                  }}
                />
              </Box>
            )}
          </TableCell>
        )}
        {columnVisibility.notes && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                maxWidth: 300,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
                minHeight: 'auto',
                textAlign: 'center',
              }}
            >
              {booking.notes || "-"}
            </Typography>
          </TableCell>
        )}
        {columnVisibility.deposit && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
              {booking.deposit != null && booking.deposit > 0 ? (
                <>
                  <AttachMoneyIcon fontSize="small" color="success" />
                  <Typography variant="body2" fontWeight="medium">{booking.deposit}</Typography>
                  {booking.depositPaid && <CheckIcon fontSize="small" color="success" />}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">-</Typography>
              )}
            </Box>
          </TableCell>
        )}
        {columnVisibility.actions && (
          <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
            <Box 
              onClick={(e) => e.stopPropagation()}
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => handleOpenBookingForm(booking, 'edit')} disabled={!canMutate}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDeleteClick(booking.id!)} disabled={!canRemove}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </TableCell>
        )}
      </TableRow>
    ))
  }



  // Render stat cards with analytics dropdown
  const renderStatsWithAnalytics = () => {
    const totalBookings = filteredBookings.length
    const totalGuests = filteredBookings.reduce((sum, booking) => sum + (booking.guests || booking.covers || 0), 0)
    
    // Use status names for filtering instead of hardcoded IDs
    const confirmedBookings = filteredBookings.filter(b => getStatusName(b.status).toLowerCase().includes('confirmed')).length
    const pendingBookings = filteredBookings.filter(b => getStatusName(b.status).toLowerCase().includes('pending')).length
    const cancelledBookings = filteredBookings.filter(b => getStatusName(b.status).toLowerCase().includes('cancelled')).length

    // Calculate analytics data using status names
    const statusBreakdown = filteredBookings.reduce((acc, booking) => {
      const statusName = getStatusName(booking.status) || 'Unknown'
      acc[statusName] = (acc[statusName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const typeBreakdown = filteredBookings.reduce((acc, booking) => {
      const type = getBookingTypeName(booking.bookingType) || 'Standard'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate peak hours
    const hourCounts = filteredBookings.reduce((acc, booking) => {
      if (booking.arrivalTime) {
        const hour = booking.arrivalTime.split(':')[0]
        acc[hour] = (acc[hour] || 0) + (booking.guests || booking.covers || 1)
      }
      return acc
    }, {} as Record<string, number>)

    const hoursWithGuests = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return (
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {totalBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Bookings
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {totalGuests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Guests
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {confirmedBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confirmed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {pendingBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2.4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {cancelledBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cancelled
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  endIcon={analyticsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={toggleAnalyticsExpansion}
                  sx={{ minWidth: 140 }}
                >
                  View Analytics
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Collapse in={analyticsExpanded}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Status Breakdown
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {Object.entries(statusBreakdown)
                    .sort(([_, a], [__, b]) => b - a)
                    .map(([statusName, count]) => {
                      // Find the original status ID to get the correct color
                      const originalStatus = bookingStatuses.find(s => s.name === statusName)
                      const statusColor = originalStatus ? getStatusColor(originalStatus.id || originalStatus.name) : theme.palette.text.disabled
                      const percentage = totalBookings > 0 ? ((count / totalBookings) * 100).toFixed(1) : "0.0"
                      return (
                        <Box key={statusName} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: statusColor, border: `1px solid ${theme.palette.divider}` }} />
                            <Typography variant="body2">{statusName}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {count}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({percentage}%)
                            </Typography>
                          </Box>
                        </Box>
                      )
                    })}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Peak Hours
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {hoursWithGuests.map(([hour, count]) => (
                    <Box key={hour} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="primary" />
                        <Typography variant="body2">{hour}:00</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="medium" color={themeConfig.brandColors.navy}>
                        {count} guests
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Booking Types
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {Object.entries(typeBreakdown)
                    .sort(([_, a], [__, b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => {
                      const bookingType = bookingTypes.find((t) => t.name === type)
                      const typeColor = bookingType?.color || theme.palette.text.disabled
                      return (
                        <Box key={type} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: typeColor, border: `1px solid ${theme.palette.divider}` }} />
                            <Typography variant="body2">{type}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {count}
                          </Typography>
                        </Box>
                      )
                    })}
                </Box>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Paper>
    )
  }

  // Update the return statement to use the new rendering functions
  return (
    <Box>
      {/* Stats Cards with Analytics */}
      {renderStatsWithAnalytics()}

      {/* Data Header */}
      {renderDataHeader()}

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Bookings Table */}
      {renderBookingsTable()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Booking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this booking? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Menu */}
      {renderStatusMenu()}

      {/* Tracking Change Menu */}
      {renderTrackingMenu()}

      {/* Table Change Menu */}
      {renderTableMenu()}

      {/* Tags Change Menu */}
      {renderTagsMenu()}

      {/* Booking Form Dialog */}
      <CRUDModal
        open={bookingFormOpen}
        onClose={(reason) => {
          setBookingFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBookingForForm(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bookingsListModal1",
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
          mode={bookingFormMode}
          booking={selectedBookingForForm}
          onSave={handleSaveBooking}
        />
      </CRUDModal>

      {/* Notification Snackbar */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification?.type || "info"} sx={{ width: '100%' }}>
          {notification?.message || ""}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default BookingsList
