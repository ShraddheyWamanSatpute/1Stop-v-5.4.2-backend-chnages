"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Card,
  CardContent,
  Alert,
  Snackbar,
  TablePagination,
  Avatar,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
  Pending as PendingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, differenceInDays, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
// Company state is now handled through HRContext

import type { TimeOff } from "../../../backend/interfaces/HRs"
// Functions now accessed through HRContext

import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TimeOffCRUDForm, { type TimeOffCRUDFormHandle } from "./forms/TimeOffCRUDForm"
import DataHeader from "../reusable/DataHeader"
import { calculateHolidayBalance } from "../../../../mobile/backend/utils/mobileDataFilters"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"


const TimeOffManagement = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "timeoff")
  const canRemove = canDelete("hr", "timeoff")
  const { state: hrState, refreshEmployees, refreshTimeOffs, handleHRAction, deleteTimeOff, updateTimeOff, addTimeOff } = useHR()
  // Company state is now handled through HRContext

  // Use time off requests from HR context state
  const timeOffRequests = hrState.timeOffs || []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info" | "warning"
  } | null>(null)

  // UI state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [approveRejectDialogOpen, setApproveRejectDialogOpen] = useState(false)
  const [requestToApproveReject, setRequestToApproveReject] = useState<TimeOff | null>(null)
  const [approveRejectAction, setApproveRejectAction] = useState<"approve" | "reject" | null>(null)
  const [approveRejectNote, setApproveRejectNote] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<string>("startDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "year" | "all" | "custom">("month")

  // Employee Balance Tracking
  const [employeeBalances, setEmployeeBalances] = useState<{ [employeeId: string]: number }>({})
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [balanceChange, setBalanceChange] = useState<number>(0)

  // New CRUD Modal state
  const [timeOffCRUDModalOpen, setTimeOffCRUDModalOpen] = useState(false)
  const [selectedTimeOffForCRUD, setSelectedTimeOffForCRUD] = useState<TimeOff | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const timeOffCRUDFormRef = useRef<TimeOffCRUDFormHandle | null>(null)


  // Derived data
  const timeOffTypes = ["vacation", "sick", "personal", "bereavement", "jury_duty", "other"]
  const statuses = ["pending", "approved", "denied", "cancelled"]

  // Date range filtering state - calculated based on dateType
  const { dateRangeStart, dateRangeEnd } = useMemo(() => {
    if (dateType === "all") {
      return { dateRangeStart: null, dateRangeEnd: null } // Show all time
    }
    
    if (dateType === "custom") {
      // Custom range is handled separately via customStartDate/customEndDate
      return { dateRangeStart: null, dateRangeEnd: null }
    }

    let start: Date
    let end: Date

    switch (dateType) {
      case "day":
        start = startOfDay(currentDate)
        end = endOfDay(currentDate)
        break
      case "week":
        start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
        end = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case "month":
        start = startOfMonth(currentDate)
        end = endOfMonth(currentDate)
        break
      case "year":
        start = startOfYear(currentDate)
        end = endOfYear(currentDate)
        break
      default:
        return { dateRangeStart: null, dateRangeEnd: null }
    }

    return { dateRangeStart: start, dateRangeEnd: end }
  }, [dateType, currentDate])

  // Custom date range state (for custom dateType)
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)

  const filteredRequests = useMemo(() => {
    if (!timeOffRequests || timeOffRequests.length === 0) {
      return []
    }
    
    // Filter out orphaned time off requests (ones with employeeIds that don't exist)
    // But only if employees are loaded - keep them during loading to avoid flicker
    const validRequests = hrState.employees?.length > 0 && hrState.initialized
      ? timeOffRequests.filter((request) => {
          // Keep requests with valid employeeIds or if employees haven't loaded yet
          if (!request.employeeId) return false
          return hrState.employees.some((emp) => emp.id === request.employeeId)
        })
      : timeOffRequests // Keep all during loading
    
    return validRequests.filter((request) => {
      const employee = hrState.employees.find((emp) => emp.id === request.employeeId)
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${request.employeeId}`

      const matchesSearch =
        searchQuery === "" ||
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

      // Case-insensitive comparison since filter uses formatted names but data uses lowercase
      const matchesType = selectedType === "" || request.type.toLowerCase() === selectedType.toLowerCase()
      const matchesStatus = selectedStatus === "" || request.status.toLowerCase() === selectedStatus.toLowerCase()

      // Date range filtering - check if request overlaps with date range
      let matchesDateRange = true
      
      // Use custom dates if dateType is "custom", otherwise use calculated date range
      const effectiveStartDate = dateType === "custom" ? customStartDate : dateRangeStart
      const effectiveEndDate = dateType === "custom" ? customEndDate : dateRangeEnd
      
      // If dateType is "all", show all requests (no date filtering)
      if (dateType === "all") {
        matchesDateRange = true
      } else if (effectiveStartDate && effectiveEndDate) {
        try {
          const requestStartDate = new Date(request.startDate)
          const requestEndDate = new Date(request.endDate)
          
          // Check if dates are valid
          if (isNaN(requestStartDate.getTime()) || isNaN(requestEndDate.getTime())) {
            matchesDateRange = true // Include invalid dates if no date range filter
          } else {
            // Request overlaps with date range if:
            // - Request starts within range, OR
            // - Request ends within range, OR
            // - Request completely contains the range
            matchesDateRange = 
              (requestStartDate >= effectiveStartDate && requestStartDate <= effectiveEndDate) ||
              (requestEndDate >= effectiveStartDate && requestEndDate <= effectiveEndDate) ||
              (requestStartDate <= effectiveStartDate && requestEndDate >= effectiveEndDate)
          }
        } catch (e) {
          // Keep quiet; include on error.
          matchesDateRange = true // Include on error
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDateRange
    })
  }, [timeOffRequests, searchQuery, selectedType, selectedStatus, hrState.employees, hrState.initialized, dateRangeStart, dateRangeEnd, dateType, customStartDate, customEndDate])

  // Sort filtered requests
  const sortedRequests = useMemo(() => {
    const getEmployeeName = (employeeId: string) => {
      const emp = hrState.employees.find((e) => e.id === employeeId)
      if (!emp) {
        return `Employee ${employeeId}`
      }
      return `${emp.firstName} ${emp.lastName}`
    }

    const getValue = (r: TimeOff, key: string) => {
      switch (key) {
        case "employeeName":
        case "employee":
          return getEmployeeName(r.employeeId)
        case "type":
          return r.type || ""
        case "startDate":
          return r.startDate
        case "endDate":
          return r.endDate
        case "dates":
          return r.startDate
        case "totalDays":
        case "days":
          return (r as any).totalDays ?? 0
        case "reason":
          return r.reason || ""
        case "status":
          return r.status || ""
        case "balance":
          return employeeBalances[r.employeeId] ?? 0
        default:
          return (r as any)[key]
      }
    }

    const copy = [...filteredRequests]
    copy.sort((a, b) => {
      const av = getValue(a, sortBy)
      const bv = getValue(b, sortBy)

      let cmp = 0
      const isDate = sortBy === "startDate" || sortBy === "endDate" || sortBy === "dates"
      if (isDate) {
        const ad = av ? Date.parse(av as string) : 0
        const bd = bv ? Date.parse(bv as string) : 0
        cmp = ad - bd
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv
      } else {
        const as = (av ?? "").toString().toLowerCase()
        const bs = (bv ?? "").toString().toLowerCase()
        cmp = as.localeCompare(bs)
      }

      return sortOrder === "asc" ? cmp : -cmp
    })
    return copy
  }, [filteredRequests, sortBy, sortOrder, hrState.employees, employeeBalances])

  // Pagination
  const paginatedRequests = useMemo(() => {
    return sortedRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [sortedRequests, page, rowsPerPage])

  // Calendar data - always show month view for calendar
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    })
  }, [currentDate])

  const timeOffByDate = useMemo(() => {
    const result = new Map<string, TimeOff[]>()

    // Use filteredRequests instead of timeOffRequests so calendar respects filters
    filteredRequests.forEach((request) => {
      if (request.status === "approved" || request.status === "pending") {
        const start = new Date(request.startDate)
        const end = new Date(request.endDate)

        // Check if dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return
        }

        const daysInInterval = eachDayOfInterval({ start, end })

        daysInInterval.forEach((day) => {
          const dateKey = format(day, "yyyy-MM-dd")
          if (!result.has(dateKey)) {
            result.set(dateKey, [])
          }
          result.get(dateKey)?.push(request)
        })
      }
    })

    return result
  }, [filteredRequests])

  // Load time off requests when component mounts
  useEffect(() => {
    // Ensure data is loaded - wait for HR context to initialize
    const loadData = async () => {
      try {
        // Wait a bit for HR context to initialize if needed
        if (!hrState.initialized && hrState.isLoading) {
          // Wait for initialization
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await refreshTimeOffs()
        await refreshEmployees() // Ensure employees are loaded
        if (hrState.employees.length > 0) {
          loadEmployeeBalances()
        }
      } catch (error) {
        console.error("Error loading time off data:", error)
      }
    }
    loadData()
  }, [hrState.initialized])

  // Update balances when employees or time offs change
  useEffect(() => {
    if (hrState.employees.length > 0 && timeOffRequests.length >= 0) {
      loadEmployeeBalances()
    }
  }, [hrState.employees, timeOffRequests])

  // Note: Data is now loaded automatically by HRContext
  // No need to manually refresh - context handles loading and caching
  // Only refresh if explicitly needed (e.g., after creating/updating)

  // Keep console quiet; HRContext handles data loading.
  useEffect(() => {
  }, [hrState.employees, timeOffRequests, hrState.initialized, hrState.isLoading, refreshEmployees])


  const loadEmployeeBalances = async () => {
    try {
      // Use the same calculateHolidayBalance function from mobile/ess
      const balances: { [employeeId: string]: number } = {}

      hrState.employees.forEach((employee) => {
        // Use calculateHolidayBalance from mobile/ess which matches the employee form logic
        const balance = calculateHolidayBalance(
          employee,
          timeOffRequests,
          hrState.attendances?.filter(att => att.employeeId === employee.id) || []
        )
        
        // Store remaining balance for display
        balances[employee.id] = balance.remaining
      })

      setEmployeeBalances(balances)
    } catch (err) {
      console.error("Error calculating employee balances:", err)
    }
  }




  const handlePreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }

  const handleCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  const handleDeleteClick = (id: string) => {
    if (!canRemove) return
    setRequestToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canRemove) return
    if (!requestToDelete) return

    setLoading(true)
    try {
      // Use the specific deleteTimeOff function which handles the correct path and state updates
      const success = await deleteTimeOff(requestToDelete)
      
      if (success) {
        // HRContext already updates state via dispatch, so UI updates automatically
        // Only refresh balances which depend on the updated data
        await loadEmployeeBalances()
        
        setNotification({ message: "Time off request deleted successfully", type: "success" })
      } else {
        throw new Error("Delete operation returned false")
      }
    } catch (err) {
      console.error("Error deleting time off request:", err)
      setError("Failed to delete time off request. Please try again.")
      setNotification({ message: "Failed to delete time off request", type: "error" })
    } finally {
      setLoading(false)
      setDeleteConfirmOpen(false)
      setRequestToDelete(null)
    }
  }

  const handleApproveRejectClick = (request: TimeOff, action: "approve" | "reject") => {
    setRequestToApproveReject(request)
    setApproveRejectAction(action)
    setApproveRejectNote("")
    setApproveRejectDialogOpen(true)
  }

  const handleConfirmApproveReject = async () => {
    if (!requestToApproveReject || !approveRejectAction) return

    try {
      // const updatedRequest: TimeOff = {
      //   ...requestToApproveReject,
      //   status: (approveRejectAction === "approve" ? "approved" : "denied") as "approved" | "denied",
      //   approvedBy: "Current User", // In a real app, get from auth context
      //   approvedAt: Date.now(),
      //   notes: approveRejectNote || requestToApproveReject.notes,
      // }

      await handleHRAction({
        companyId: hrState.companyID || "",
        siteId: hrState.selectedSiteID || "",
        action: "edit",
        entity: "timeOffs",
        id: requestToApproveReject.id,
        data: {
          ...requestToApproveReject,
          status: (approveRejectAction === "approve" ? "approved" : "denied") as "approved" | "denied",
          approvedBy: "Current User", // In a real app, get from auth context
          approvedAt: Date.now(),
          notes: approveRejectNote || requestToApproveReject.notes,
        },
      })

      // Data will be updated automatically by HRContext

      // Update employee balance if approved
      if (approveRejectAction === "approve" && requestToApproveReject.type === "vacation") {
        const days = calculateDays(requestToApproveReject.startDate, requestToApproveReject.endDate)
        setEmployeeBalances((prev) => ({
          ...prev,
          [requestToApproveReject.employeeId]: (prev[requestToApproveReject.employeeId] || 0) - days,
        }))
      }

      setNotification({
        message: `Time off request ${approveRejectAction}d successfully`,
        type: "success",
      })
    } catch (err) {
      console.error(`Error ${approveRejectAction}ing time off request:`, err)
      setNotification({ message: `Failed to ${approveRejectAction} time off request`, type: "error" })
    } finally {
      setApproveRejectDialogOpen(false)
      setRequestToApproveReject(null)
      setApproveRejectAction(null)
      setApproveRejectNote("")
    }
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleViewRequest = (request: TimeOff) => {
    handleOpenTimeOffCRUD(request, 'view')
  }

  // Employee Balance Management
  const handleOpenBalanceDialog = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setBalanceChange(0)
    setBalanceDialogOpen(true)
  }

  const handleCloseBalanceDialog = () => {
    setSelectedEmployeeId(null)
    setBalanceDialogOpen(false)
  }

  const handleBalanceChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBalanceChange(Number(event.target.value))
  }

  const handleUpdateBalance = async () => {
    if (selectedEmployeeId) {
      try {
        // In a real app, update the database
        setEmployeeBalances((prev) => ({
          ...prev,
          [selectedEmployeeId]: (prev[selectedEmployeeId] || 0) + balanceChange,
        }))

        setNotification({ message: "Employee balance updated", type: "success" })
        handleCloseBalanceDialog()
      } catch (err) {
        console.error("Error updating balance:", err)
        setNotification({ message: "Failed to update balance", type: "error" })
      }
    }
  }

  // New CRUD Modal handlers
  const handleOpenTimeOffCRUD = (timeOff: TimeOff | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTimeOffForCRUD(timeOff)
    setCrudMode(mode)
    setTimeOffCRUDModalOpen(true)
  }

  const handleCloseTimeOffCRUD = () => {
    setTimeOffCRUDModalOpen(false)
    setSelectedTimeOffForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveTimeOffCRUD = async (timeOffData: any) => {
    if (!canMutate) return
    try {
      // Calculate totalDays if not provided
      if (!timeOffData.totalDays && timeOffData.startDate && timeOffData.endDate) {
        timeOffData.totalDays = calculateDays(timeOffData.startDate, timeOffData.endDate)
      }

      if (crudMode === 'create') {
        // Ensure employeeId is set
        if (!timeOffData.employeeId) {
          console.error("handleSaveTimeOffCRUD - employeeId is required but not set")
          setNotification({ message: "Please select an employee", type: "error" })
          return
        }
        
        // Ensure dates are in the correct format (timestamps)
        const timeOffToCreate = {
          ...timeOffData,
          startDate: typeof timeOffData.startDate === 'number' 
            ? timeOffData.startDate 
            : new Date(timeOffData.startDate).getTime(),
          endDate: typeof timeOffData.endDate === 'number'
            ? timeOffData.endDate
            : new Date(timeOffData.endDate).getTime(),
          // Ensure status is set (default to pending for new requests)
          status: timeOffData.status || 'pending',
          // Ensure createdAt is set
          createdAt: timeOffData.createdAt || Date.now(),
        }
        
        // Use the specific addTimeOff function which handles the correct path and state updates
        const result = await addTimeOff(timeOffToCreate)
        
        if (result) {
          setNotification({ message: "Time off request created successfully", type: "success" })
        } else {
          console.error("handleSaveTimeOffCRUD - Create returned null")
          setNotification({ message: "Failed to create time off request", type: "error" })
          return // Don't close or refresh if create failed
        }
      } else if (crudMode === 'edit' && selectedTimeOffForCRUD) {
        // Use the specific updateTimeOff function which handles the correct path and state updates
        const result = await updateTimeOff(selectedTimeOffForCRUD.id, timeOffData)
        
        if (result) {
          setNotification({ message: "Time off request updated successfully", type: "success" })
        } else {
          console.error("handleSaveTimeOffCRUD - Update returned null")
          setNotification({ message: "Failed to update time off request", type: "error" })
          return // Don't close or refresh if update failed
        }
      }
      handleCloseTimeOffCRUD()
      // HRContext already updates state via dispatch, so UI updates automatically
      // Only refresh balances which depend on the updated data
      await loadEmployeeBalances()
    } catch (error) {
      console.error("Error saving time off request:", error)
      setNotification({ message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} time off request`, type: "error" })
    }
  }

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success"
      case "pending":
        return "warning"
      case "denied":
        return "error"
      case "cancelled":
        return "default"
      default:
        return "default"
    }
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircleIcon fontSize="small" />
      case "pending":
        return <PendingIcon fontSize="small" />
      case "denied":
        return <CancelIcon fontSize="small" />
      case "cancelled":
        return <CancelIcon fontSize="small" />
      default:
        return <EventIcon fontSize="small" />
    }
  }

  // Helper function to calculate days
  const calculateDays = (startDate: Date | number, endDate: Date | number) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Safety check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0
    }
    
    const days = differenceInDays(end, start) + 1
    return days > 0 ? days : 0
  }

  // Helper function to format type
  const formatType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Render calendar view
  const renderCalendarView = () => {
    // Get first day of month and determine which day of week it falls on (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = startOfMonth(currentDate)
    const firstDayWeekday = firstDayOfMonth.getDay()
    // Convert Sunday (0) to 7 for easier calculation, Monday (1) stays 1, etc.
    const adjustedFirstDay = firstDayWeekday === 0 ? 7 : firstDayWeekday
    // Calculate how many empty cells we need before the first day (Monday = 1, so we need 0 empty cells)
    const emptyCellsBefore = adjustedFirstDay - 1

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 3,
          flexWrap: "wrap",
          gap: 2
        }}>
          <Button 
            startIcon={<NavigateNextIcon sx={{ transform: "rotate(180deg)" }} />} 
            onClick={handlePreviousMonth}
            variant="outlined"
            size="small"
          >
            Previous Month
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {format(currentDate, "MMMM yyyy")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button 
              onClick={handleCurrentMonth}
              variant="outlined"
              size="small"
            >
              Today
            </Button>
            <Button 
              startIcon={<NavigateNextIcon />} 
              onClick={handleNextMonth}
              variant="outlined"
              size="small"
            >
              Next Month
            </Button>
          </Box>
        </Box>

        <Paper elevation={2} sx={{ p: 2 }}>
          <Grid container spacing={0.5}>
            {/* Calendar header */}
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <Grid item xs key={day} sx={{ minHeight: 40 }}>
                <Box sx={{ 
                  p: 1.5, 
                  textAlign: "center", 
                  fontWeight: "bold",
                  bgcolor: themeConfig.brandColors.navy,
                  color: themeConfig.brandColors.offWhite,
                  borderRadius: 1
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {day}
                  </Typography>
                </Box>
              </Grid>
            ))}

            {/* Empty cells before first day of month */}
            {Array.from({ length: emptyCellsBefore }).map((_, index) => (
              <Grid item xs key={`empty-before-${index}`}>
                <Box sx={{ minHeight: 100 }} />
              </Grid>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const dayRequests = timeOffByDate.get(dateKey) || []
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

              return (
                <Grid item xs key={day.toISOString()}>
                  <Card
                    variant="outlined"
                    sx={{
                      minHeight: 100,
                      height: "100%",
                      cursor: "pointer",
                      border: isToday ? 2 : 1,
                      borderColor: isToday ? themeConfig.brandColors.navy : "divider",
                      bgcolor: isToday ? "action.selected" : "background.paper",
                      "&:hover": { 
                        bgcolor: "action.hover",
                        boxShadow: 2
                      },
                      transition: "all 0.2s ease-in-out"
                    }}
                  >
                    <CardContent sx={{ p: 1, "&:last-child": { pb: 1 }, height: "100%", display: "flex", flexDirection: "column" }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mb: 0.5,
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? themeConfig.brandColors.navy : "text.primary"
                        }}
                      >
                        {format(day, "d")}
                      </Typography>
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5, overflow: "hidden" }}>
                        {dayRequests.slice(0, 3).map((request) => {
                          const employee = hrState.employees.find((emp) => emp.id === request.employeeId)
                          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${request.employeeId}`
                          const isApproved = request.status === "approved"

                          return (
                            <Box
                              key={request.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewRequest(request)
                              }}
                              sx={{
                                p: 0.75,
                                borderRadius: 1,
                                bgcolor: isApproved ? "success.main" : "warning.main",
                                color: isApproved ? "success.contrastText" : "warning.contrastText",
                                cursor: "pointer",
                                "&:hover": {
                                  opacity: 0.9,
                                  transform: "scale(1.02)"
                                },
                                transition: "all 0.15s ease-in-out"
                              }}
                            >
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: "0.65rem",
                                  fontWeight: 500,
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                                title={`${employeeName.split(" ")[0]} - ${formatType(request.type)}`}
                              >
                                {employeeName.split(" ")[0]} - {formatType(request.type)}
                              </Typography>
                            </Box>
                          )
                        })}
                        {dayRequests.length > 3 && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: "0.65rem",
                              fontStyle: "italic",
                              mt: 0.5
                            }}
                          >
                            +{dayRequests.length - 3} more
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Paper>
      </Box>
    )
  }

  // Render list view
  const renderListView = () => {
    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "employeeName") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("employeeName"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Employee</Typography>
                  {sortBy === "employeeName" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "type") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("type"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Type</Typography>
                  {sortBy === "type" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "startDate") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("startDate"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Dates</Typography>
                  {sortBy === "startDate" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "totalDays") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("totalDays"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Days</Typography>
                  {sortBy === "totalDays" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "reason") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("reason"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Reason</Typography>
                  {sortBy === "reason" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "status") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("status"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Status</Typography>
                  {sortBy === "status" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell
                align="center"
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  cursor: "pointer",
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => {
                  if (sortBy === "balance") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  else { setSortBy("balance"); setSortOrder("asc") }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Balance</Typography>
                  {sortBy === "balance" && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => {
                const employee = hrState.employees.find((emp) => emp.id === request.employeeId)
                const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${request.employeeId} (Not Found)`

                return (
                  <TableRow 
                    key={request.id} 
                    hover
                    onClick={() => handleViewRequest(request)}
                    sx={{ 
                      cursor: "pointer",
                      '& > td': {
                        paddingTop: 1,
                        paddingBottom: 1,
                      }
                    }}
                  >
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>{employee?.firstName?.charAt(0) || "?"}</Avatar>
                        {employeeName}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{formatType(request.type)}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      {format(new Date(request.startDate), "dd MMM")} -{" "}
                      {format(new Date(request.endDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{request.totalDays} days</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{request.reason}</TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Chip
                        icon={getStatusIcon(request.status)}
                        label={formatType(request.status)}
                        color={getStatusColor(request.status) as "success" | "warning" | "error" | "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {employeeBalances[request.employeeId] !== undefined
                          ? `${employeeBalances[request.employeeId]} days`
                          : "N/A"}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenBalanceDialog(request.employeeId)
                          }}
                          sx={{ ml: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                      <Box display="flex" gap={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenTimeOffCRUD(request, 'edit')
                          }}
                          disabled={!canMutate}
                          title={canMutate ? "Edit" : "No permission to edit"}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!canRemove) return
                            handleDeleteClick(request.id)
                          }}
                          disabled={!canRemove}
                          title={canRemove ? "Delete" : "No permission to delete"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <EmptyStateCard
                    icon={CalendarIcon}
                    title="No time off requests found"
                    description="Try adjusting your search or filters."
                    cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Stats Cards */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '80px' }}>
                <CardContent 
                  sx={{ 
                    py: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    '&:last-child': { pb: 2 } 
                  }}
                >
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: 1,
                      color: 'warning.main'
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>
                      {filteredRequests.filter((request) => request.status === "pending").length}
                    </span>
                    <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                      Pending Requests
                    </span>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '80px' }}>
                <CardContent 
                  sx={{ 
                    py: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    '&:last-child': { pb: 2 } 
                  }}
                >
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: 1,
                      color: 'success.main'
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>
                      {(() => {
                        const currentMonthStart = startOfMonth(new Date())
                        const currentMonthEnd = endOfMonth(new Date())
                        return filteredRequests.filter((request) => {
                          if (!request.startDate) return false
                          try {
                            const requestDate = new Date(request.startDate)
                            if (isNaN(requestDate.getTime())) return false
                            return (
                              request.status === "approved" &&
                              requestDate >= currentMonthStart &&
                              requestDate <= currentMonthEnd
                            )
                          } catch {
                            return false
                          }
                        }).length
                      })()}
                    </span>
                    <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                      Approved This Month
                    </span>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '80px' }}>
                <CardContent 
                  sx={{ 
                    py: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    '&:last-child': { pb: 2 } 
                  }}
                >
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: 1,
                      color: 'info.main'
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>
                      {filteredRequests
                        .filter((request) => request.status === "approved")
                        .reduce((total, request) => {
                          const days = request.totalDays || calculateDays(request.startDate, request.endDate)
                          return total + days
                        }, 0)}
                    </span>
                    <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>
                      Total Days Requested
                    </span>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Reusable Data Header */}
        <DataHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          dateType={dateType}
          onDateTypeChange={setDateType}
          showDateControls={true}
          showDateTypeSelector={true}
          availableDateTypes={["day", "week", "month", "year", "all", "custom"]}
          customStartDate={customStartDate || undefined}
          customEndDate={customEndDate || undefined}
          onCustomDateRangeChange={(start, end) => {
            setCustomStartDate(start)
            setCustomEndDate(end)
          }}
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search time off requests..."
          filters={[
            {
              label: "Type",
              options: timeOffTypes.map(type => ({ 
                id: type, 
                name: formatType(type) // Use formatted name for display, comparison is case-insensitive
              })),
              selectedValues: selectedType ? [formatType(selectedType)] : [],
              onSelectionChange: (values) => {
                // Convert formatted name back to lowercase type for comparison
                const selectedValue = values[0] || ""
                const matchingType = timeOffTypes.find(type => formatType(type).toLowerCase() === selectedValue.toLowerCase())
                setSelectedType(matchingType || selectedValue.toLowerCase())
              }
            },
            {
              label: "Status",
              options: statuses.map(status => ({ 
                id: status, 
                name: formatType(status) // Use formatted name for display, comparison is case-insensitive
              })),
              selectedValues: selectedStatus ? [formatType(selectedStatus)] : [],
              onSelectionChange: (values) => {
                // Convert formatted name back to lowercase status for comparison
                const selectedValue = values[0] || ""
                const matchingStatus = statuses.find(status => formatType(status).toLowerCase() === selectedValue.toLowerCase())
                setSelectedStatus(matchingStatus || selectedValue.toLowerCase())
              }
            }
          ]}
          filtersExpanded={filtersExpanded}
          onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
          sortOptions={[
            { value: "startDate", label: "Start Date" },
            { value: "endDate", label: "End Date" },
            { value: "employeeName", label: "Employee Name" },
            { value: "type", label: "Type" },
            { value: "status", label: "Status" },
            { value: "totalDays", label: "Days" }
          ]}
          sortValue={sortBy}
          sortDirection={sortOrder}
          onSortChange={(value, direction) => {
            setSortBy(value)
            setSortOrder(direction)
          }}
          onExportCSV={() => {
            // Export CSV functionality
            const csvData = sortedRequests.map(req => {
              const employee = hrState.employees.find(emp => emp.id === req.employeeId)
              const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${req.employeeId}`
              return {
                Employee: employeeName,
                Type: req.type,
                'Start Date': format(new Date(req.startDate), 'yyyy-MM-dd'),
                'End Date': format(new Date(req.endDate), 'yyyy-MM-dd'),
                Days: req.totalDays || calculateDays(req.startDate, req.endDate),
                Status: req.status,
                Reason: req.reason || ''
              }
            })
            
            const headers = Object.keys(csvData[0] || {})
            const csvContent = [
              headers.join(','),
              ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
            ].join('\n')
            
            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `time-off-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`
            link.click()
            URL.revokeObjectURL(url)
            
            setNotification({ message: "CSV exported successfully!", type: "success" })
          }}
          onCreateNew={() => handleOpenTimeOffCRUD(null, 'create')}
          createButtonLabel="New Request"
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit time off."
          additionalButtons={[
            {
              label: viewMode === "list" ? "Calendar View" : "List View",
              icon: viewMode === "list" ? <CalendarIcon /> : <ListIcon />,
              onClick: () => setViewMode(viewMode === "list" ? "calendar" : "list"),
              variant: "outlined"
            }
          ]}
        />





        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* No loading UI — render and let data fill in */}
        <>
          {/* Time Off Requests View */}
          {viewMode === "calendar" ? renderCalendarView() : renderListView()}

          {/* Pagination (only for list view) */}
          {viewMode === "list" && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRequests.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </>


        {/* Approve/Reject Dialog */}
        <Dialog
          open={approveRejectDialogOpen}
          onClose={() => setApproveRejectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{approveRejectAction === "approve" ? "Approve" : "Reject"} Time Off Request</DialogTitle>
          <DialogContent>
            {requestToApproveReject && (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Are you sure you want to {approveRejectAction} the time off request for{" "}
                  <strong>
                    {(() => {
                      const employee = hrState.employees.find((emp) => emp.id === requestToApproveReject.employeeId)
                      return employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${requestToApproveReject.employeeId} (Not Found)`
                    })()}
                  </strong>
                  ?
                </Typography>
                <TextField
                  fullWidth
                  label={`${approveRejectAction === "approve" ? "Approval" : "Rejection"} Notes (Optional)`}
                  value={approveRejectNote}
                  onChange={(e) => setApproveRejectNote(e.target.value)}
                  multiline
                  rows={3}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color={approveRejectAction === "approve" ? "success" : "error"}
              onClick={handleConfirmApproveReject}
            >
              {approveRejectAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this time off request? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Employee Balance Dialog */}
        <Dialog open={balanceDialogOpen} onClose={handleCloseBalanceDialog}>
          <DialogTitle>Update Employee Balance</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enter the number of days to add to or subtract from the employee's balance.
            </Typography>
            <TextField
              label="Balance Change"
              type="number"
              value={balanceChange}
              onChange={handleBalanceChangeInput}
              fullWidth
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleUpdateBalance}>
              Update Balance
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification */}
        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={() => setNotification(null)} severity={notification?.type} sx={{ width: "100%" }}>
            {notification?.message}
          </Alert>
        </Snackbar>

        {/* New CRUD Modal */}
                <CRUDModal
          open={timeOffCRUDModalOpen}
          onClose={(reason) => {
            setTimeOffCRUDModalOpen(false)
            if (isCrudModalHardDismiss(reason)) {
              const __workspaceOnClose = handleCloseTimeOffCRUD
              if (typeof __workspaceOnClose === "function") {
                __workspaceOnClose(reason)
              }
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "timeOffManagementModal1",
            crudMode,
            id: selectedTimeOffForCRUD?.id,
            itemLabel: selectedTimeOffForCRUD?.employeeName,
          }}
        >
          <TimeOffCRUDForm
            ref={timeOffCRUDFormRef}
            timeOffRequest={selectedTimeOffForCRUD as any}
            mode={crudMode}
            onSave={handleSaveTimeOffCRUD}
            employees={hrState.employees}
          />
        </CRUDModal>
      </Box>
    </LocalizationProvider>
  )
}

export default TimeOffManagement
