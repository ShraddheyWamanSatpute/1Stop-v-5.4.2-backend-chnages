"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import { Fragment, useState, useMemo, useCallback, useEffect, useRef, type FC, type ChangeEvent } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  Tooltip,
} from "@mui/material"
import {
  Close as CloseIcon,
  FilterAlt as FilterAltIcon,
  WbSunny as WbSunnyIcon,
  Cloud as CloudIcon,
  Umbrella as UmbrellaIcon,
  AcUnit as AcUnitIcon,
  FilterDrama as FilterDramaIcon,
  ContentCopy as ContentCopyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { format, startOfWeek, addDays, subWeeks, differenceInHours, differenceInMinutes, parseISO, isValid, isWithinInterval, endOfWeek, eachDayOfInterval } from "date-fns"
import { useHRContext } from "../../../backend/context/HRContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useFinance } from "../../../backend/context/FinanceContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import AICalendarModal from "./AICalendarModal"
import FinalizeShiftsModal from "./FinalizeShiftsModal"
import ShiftForm, { type ShiftFormHandle } from "./forms/ShiftForm"
import BulkScheduleForm from "./forms/BulkScheduleForm"
// Company state is now handled through HRContext
// Site management is now part of CompanyContext
import type { Employee, Schedule, ScheduleFormData, ScheduleManagerProps } from "../../../backend/interfaces/HRs"
// Functions now accessed through HRContext
import type { Booking } from "../../../backend/interfaces/Bookings"
import { fetchWeatherForCity } from "../../../backend/services/WeatherService"
import type { ScheduleValidation } from "../../../backend/interfaces/HRs"
// Removed CalendarView and ListView imports as we only use employee view now
import DataHeader from "../reusable/DataHeader"
import { Assignment as AssignmentIcon } from "@mui/icons-material"

const initialFormData: ScheduleFormData = {
  employeeId: "",
  date: new Date(),
  startTime: null,
  endTime: null,
  department: "",
  role: "",
  notes: "",
  status: "draft",
  shiftType: "regular",
  payType: "hourly",
  payRate: undefined,
  breakDuration: 0,
  breakStartTime: null,
}

// Helper function to calculate hours from time strings, handling overnight shifts
const calculateHoursFromTimeStrings = (startTime: string, endTime: string): number => {
  const location = useLocation()
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  
  let startMinutes = sh * 60 + sm
  let endMinutes = eh * 60 + em
  
  // If end time is before start time, it's an overnight shift (add 24 hours)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }
  
  const totalMinutes = endMinutes - startMinutes
  return totalMinutes / 60
}

const ScheduleManager: FC<ScheduleManagerProps> = ({ dateRange, bookingsData, businessHours }) => {
  const { state: hrState, addSchedule, updateSchedule, deleteSchedule, refreshSchedules, loadHRSettingsSection } = useHRContext()
  const { state: companyState } = useCompany()
  const { state: financeState, refreshBudgets, refreshDailyForecasts } = useFinance()
  const { state: settingsState } = useSettings()
  const currentUserId = settingsState?.auth?.uid || settingsState?.user?.uid || "system"
  // Company state is now handled through HRContext

  // HR Settings state
  const [hrSettings, setHrSettings] = useState<{
    salaryDividedByDay?: boolean
    splitSalaryAndHourlyCosts?: boolean
  }>({
    salaryDividedByDay: false,
    splitSalaryAndHourlyCosts: false,
  })

  // Load HR settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadHRSettingsSection("general")
        if (settings) {
          setHrSettings({
            salaryDividedByDay: settings.salaryDividedByDay || false,
            splitSalaryAndHourlyCosts: settings.splitSalaryAndHourlyCosts || false,
          })
        }
      } catch (error) {
        console.error("Error loading HR settings:", error)
      }
    }
    loadSettings()
  }, [loadHRSettingsSection])

  // Weather API state
  const [weatherData, setWeatherData] = useState<Record<string, any>>({})
  const [, setWeatherLoading] = useState(false) // Used in fetchWeatherData function

  const loading = hrState.isLoading
  const [schedulesLoading, setSchedulesLoading] = useState(false)

  // DataHeader date controls state
  const [selectedDate, setSelectedDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [dateType] = useState<"day" | "week" | "month" | "custom">("week")
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Load budgets when component mounts or company changes
  useEffect(() => {
    if (companyState.companyID) {
      refreshBudgets().catch(() => {
        // Silently fail if budgets can't be loaded
      })
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, refreshBudgets])

  // Load daily forecasts for labour % comparisons
  useEffect(() => {
    if (companyState.companyID) {
      refreshDailyForecasts().catch(() => {
        // Silently fail if forecasts can't be loaded
      })
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, refreshDailyForecasts])

  // Also refresh when FinanceContext switches scope (site/subsite basePath).
  // This ensures Scheduling updates immediately even if CompanyContext changes first.
  useEffect(() => {
    if (!financeState.basePath) return
    refreshDailyForecasts().catch(() => {
      // Silently fail if forecasts can't be loaded
    })
  }, [financeState.basePath, refreshDailyForecasts])

  const dailyForecastByDate = useMemo(() => {
    const map: Record<string, number> = {}
    ;(financeState.dailyForecasts || []).forEach((f: any) => {
      if (!f?.date) return
      const amount = Number(f.amount || 0)
      if (!Number.isFinite(amount)) return
      // First-write wins to avoid dupes; can be overridden by latest if needed.
      if (map[f.date] === undefined) map[f.date] = amount
    })
    return map
  }, [financeState.dailyForecasts])

  const formatCostWithPct = (cost: number, forecast: number) => {
    const safeCost = Number.isFinite(cost) ? cost : 0
    const safeForecast = Number.isFinite(forecast) ? forecast : 0
    const costText = `£${safeCost.toFixed(2)}`
    const pctText = safeForecast > 0 ? `${((safeCost / safeForecast) * 100).toFixed(1)}%` : "n/a"
    return { costText, pctText }
  }
  
  // Dynamic date range based on current week
  const [dynamicDateRange, setDynamicDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
    endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
  })

  // Load schedules when component mounts (only once)
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setSchedulesLoading(true)
        await refreshSchedules()
      } catch (error) {
        console.error("ScheduleManager - Error loading schedules:", error)
      } finally {
        setSchedulesLoading(false)
      }
    }
    
    loadSchedules()
  }, []) // Empty dependency array to run only once on mount

  // Sync currentWeekStart with selectedDate when component mounts
  useEffect(() => {
    setCurrentWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }))
  }, [selectedDate])

  // Update dynamic date range when current week changes
  useEffect(() => {
    const newDateRange = {
      startDate: currentWeekStart,
      endDate: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    }
    setDynamicDateRange(newDateRange)
  }, [currentWeekStart])
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error" | "info" | "warning"
  } | null>(null)

  // UI state
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData)
  
  // Drag and drop state - use refs to avoid re-renders during drag
  const draggedScheduleRef = useRef<Schedule | null>(null)
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null) // Only for visual feedback
  const [dragOverCell, setDragOverCell] = useState<{ employeeId: string; day: Date } | null>(null)
  const dragOverCellRef = useRef<{ employeeId: string; day: Date } | null>(null)

  // New CRUD Modal state
  const [scheduleCRUDModalOpen, setScheduleCRUDModalOpen] = useState(false)
  const [selectedScheduleForCRUD, setSelectedScheduleForCRUD] = useState<Schedule | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const shiftFormRef = useRef<ShiftFormHandle | null>(null)
  const [deleteShiftConfirmOpen, setDeleteShiftConfirmOpen] = useState(false)
  const [deleteShiftLoading, setDeleteShiftLoading] = useState(false)

  // CRUD handlers
  const handleOpenScheduleCRUD = (schedule: Schedule | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedScheduleForCRUD(schedule)
    setCrudMode(mode)
    setScheduleCRUDModalOpen(true)
  }

  const handleCloseScheduleCRUD = () => {
    setScheduleCRUDModalOpen(false)
    setSelectedScheduleForCRUD(null)
  }

  const handleSaveScheduleCRUD = async (shiftData: any) => {
    try {
      // Format the data correctly
      const formattedData = {
        ...shiftData,
        date: typeof shiftData.date === 'string' ? shiftData.date : format(shiftData.date, 'yyyy-MM-dd'),
        startTime: typeof shiftData.startTime === 'string' ? shiftData.startTime : format(shiftData.startTime, 'HH:mm'),
        endTime: typeof shiftData.endTime === 'string' ? shiftData.endTime : format(shiftData.endTime, 'HH:mm'),
        breakStartTime: shiftData.breakStartTime 
          ? (typeof shiftData.breakStartTime === 'string' ? shiftData.breakStartTime : format(shiftData.breakStartTime, 'HH:mm'))
          : undefined,
      }
      
      if (crudMode === 'create') {
        // Create new shift
        const result = await addSchedule(formattedData)
        
        if (result) {
          // Add a small delay to ensure database write is complete
          await new Promise(resolve => setTimeout(resolve, 500))
          // Force refresh of schedules
          await refreshSchedules()
          
          setNotification({
            message: "Shift created successfully!",
            type: "success",
          })
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "scheduleManagerModal2",
            crudMode: "create",
          })
        } else {
          setNotification({
            message: "Failed to create shift",
            type: "error",
          })
        }
      } else if (crudMode === 'edit' && selectedScheduleForCRUD) {
        // Update existing shift
        const result = await updateSchedule(selectedScheduleForCRUD.id, formattedData)
        
        if (result) {
          // Add a small delay to ensure database write is complete
          await new Promise(resolve => setTimeout(resolve, 500))
          // Force refresh of schedules
          await refreshSchedules()
          
          setNotification({
            message: "Shift updated successfully!",
            type: "success",
          })
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "scheduleManagerModal2",
            crudMode: "edit",
            id: selectedScheduleForCRUD?.id,
            itemLabel:
              selectedScheduleForCRUD?.employeeName && selectedScheduleForCRUD?.date
                ? `${selectedScheduleForCRUD.employeeName} · ${selectedScheduleForCRUD.date}`
                : undefined,
          })
        } else {
          console.log("❌ Save Shift - Failed to update shift")
          setNotification({
            message: "Failed to update shift",
            type: "error",
          })
        }
      }
      
      handleCloseScheduleCRUD()
    } catch (error) {
      console.error('❌ Save Shift - Error saving shift:', error)
      setNotification({
        message: "Failed to save shift",
        type: "error",
      })
    }
  }

  const handleRequestDeleteShift = () => {
    if (!selectedScheduleForCRUD?.id) return
    setDeleteShiftConfirmOpen(true)
  }

  const handleConfirmDeleteShift = async () => {
    if (!selectedScheduleForCRUD?.id) return

    try {
      setDeleteShiftLoading(true)
      const ok = await deleteSchedule(selectedScheduleForCRUD.id)
      if (ok) {
        setNotification({ message: "Shift deleted successfully!", type: "success" })
        setDeleteShiftConfirmOpen(false)
        handleCloseScheduleCRUD()
      } else {
        setNotification({ message: "Failed to delete shift", type: "error" })
      }
    } catch (error) {
      console.error("Error deleting shift:", error)
      setNotification({ message: "Failed to delete shift", type: "error" })
    } finally {
      setDeleteShiftLoading(false)
    }
  }
  const [editMode, setEditMode] = useState(false)
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<Employee | null>(null)
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDepartment, setFilterDepartment] = useState<string[]>([])
  const [filterRole, setFilterRole] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Use departments and roles from HR context instead of local state
  const departments = hrState.departments || []
  const roles = hrState.roles || []

  // Finalize Shifts modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  
  // Finalize shifts toggle mode
  const [finalizeMode, setFinalizeMode] = useState(false)
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set())
  const [selectedFinalShift, setSelectedFinalShift] = useState<Record<string, 'scheduled' | 'clock' | 'edited'>>({})
  const [editingFinalShift, setEditingFinalShift] = useState<Record<string, Partial<Schedule>>>({})

  // DataHeader handlers
  const handleCreateNew = () => {
    handleOpenScheduleCRUD(null, 'create')
  }

  // Date change handlers for DataHeader
  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    // Update currentWeekStart to match the selected date
    if (dateType === "week") {
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
    } else if (dateType === "day") {
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
    } else if (dateType === "month") {
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
    }
  }


  // Approval workflow state
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [selectedDateForConfirmation, _setSelectedDateForConfirmation] = useState<string>("")
  const [approvingRota, setApprovingRota] = useState(false)
  const [confirmingShifts, setConfirmingShifts] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    clockInTime: string
    clockOutTime: string
    clockInLocation: string
    clockOutLocation: string
    actualHours: number
    adjustedHours?: number
    adjustmentReason?: string
  }>({
    clockInTime: "",
    clockOutTime: "",
    clockInLocation: "",
    clockOutLocation: "",
    actualHours: 0,
  })
  const [bulkScheduleMode, setBulkScheduleMode] = useState(false)
  const [groupBy, setGroupBy] = useState<"department" | "role" | "none">("department")
  const [filterOpen, setFilterOpen] = useState(false)
  
  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return hrState.employees.filter((employee) => {
      // Exclude employees with doNotIncludeOnRota set to true
      if (employee.doNotIncludeOnRota === true) {
        return false
      }
      
      const matchesSearch = searchTerm === "" || 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Fix department filter - match by department name from departmentID
      const employeeDeptID = (employee as any).departmentID
      const employeeDept = employeeDeptID ? departments.find(d => d.id === employeeDeptID) : null
      const employeeDeptName = employeeDept?.name || employee.department || ""
      const matchesDepartment = filterDepartment.length === 0 || 
        filterDepartment.includes(employeeDeptName)
      
      const roleId = employee.roleId || (employee as any).roleID
      const employeeRole = roleId ? roles.find(r => r.id === roleId) : null
      const roleName = employeeRole?.label || employeeRole?.name || ""
      const matchesRole = filterRole.length === 0 || 
        filterRole.includes(roleName) || filterRole.includes(roleId || "")
      
      return matchesSearch && matchesDepartment && matchesRole
    })
  }, [hrState.employees, searchTerm, filterDepartment, filterRole, roles, departments])

  // Use schedules from HR context state with role names enriched and date range filtering
  const schedules = useMemo(() => {
    if (!hrState.schedules) {
      return []
    }
    
    let filteredSchedules = hrState.schedules
    
    // Apply date range filtering - use dynamic date range for week navigation
    const effectiveDateRange = dynamicDateRange || dateRange
    if (effectiveDateRange) {
      const startDateStr = format(effectiveDateRange.startDate, 'yyyy-MM-dd')
      const endDateStr = format(effectiveDateRange.endDate, 'yyyy-MM-dd')
      
      filteredSchedules = hrState.schedules.filter(schedule => {
        if (!schedule.date) {
          return false
        }
        const isInRange = schedule.date >= startDateStr && schedule.date <= endDateStr
        return isInRange
      })
    }
    
    return filteredSchedules.map(schedule => {
      // Fix field name mismatch: schedule data uses employeeID but we need employeeId
      const employeeId = schedule.employeeId || (schedule as any).employeeID
      
      const employee = hrState.employees?.find(emp => emp.id === employeeId)
      // Handle both roleID (uppercase) and roleId (lowercase) like EmployeeList
      const roleId = (employee as any)?.roleID || employee?.roleId
      const employeeRole = roleId ? roles.find(r => r.id === roleId) : null
      
      // Also resolve department for schedules
      const employeeDeptID = (employee as any)?.departmentID
      const employeeDept = employeeDeptID ? departments.find(d => d.id === employeeDeptID) : null
      
      return {
        ...schedule,
        employeeId, // Ensure consistent field name
        role: employeeRole?.label || employeeRole?.name || schedule.role || "—",
        department: employeeDept?.name || schedule.department || "—",
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : (schedule.employeeName && schedule.employeeName !== "Unknown Employee" ? schedule.employeeName : "Unknown Employee")
      }
    }).filter(schedule => {
      // Only show schedules for filtered employees
      if (!filteredEmployees.some(emp => emp.id === schedule.employeeId)) {
        return false
      }
      // Apply status filter - check within the date range
      if (filterStatus.length > 0 && !filterStatus.includes(schedule.status)) {
        return false
      }
      return true
    })
  }, [hrState.schedules, hrState.employees, roles, departments, dateRange, dynamicDateRange, filterStatus, filteredEmployees])
  
  const [aiCalendarModalOpen, setAiCalendarModalOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    employeeId: string
    employeeName: string
    date: string
    startTime: string
    endTime: string
    department: string
    role?: string
    notes: string
    shiftType: "regular" | "holiday" | "off" | "training"
    payType: "hourly" | "flat"
    payRate?: number
  }[]>([])

  // Data loading is handled by HRContext automatically
  // No need for separate loading functions since HR context manages all data

  // Data comes from HR context automatically - no manual loading needed
  useEffect(() => {
    // Keep console quiet; HRContext handles loading and logging.
  }, [departments.length, roles.length, hrState.employees?.length, hrState.schedules?.length])

  useEffect(() => {
    // Data comes from HR context automatically
    fetchWeatherForecast()
  }, [])

  // Fetch weather forecast using the backend service with caching
  const fetchWeatherForecast = useCallback(async () => {
    // Company state is now handled internally by HRContext
    if (false) { // Disabled company state check
      return
    }

    try {
      setWeatherLoading(true)

      // Use the backend service to fetch weather data for the city
      // This will use cached data if it's less than 30 minutes old
      // For now, using a default city - this should be configured per site
      const defaultCity = "New York"
      const defaultCountry = "US"
      
      const weatherResult = await fetchWeatherForCity(
        defaultCity, 
        defaultCountry, 
        "", // Company state handled internally
        "" // Company state handled internally
      )

      if (weatherResult) {
        setWeatherData(weatherResult)
      } else {
        // Weather is non-critical; stay quiet if unavailable.
      }
    } catch (error) {
      console.error("Weather data fetch skipped or failed:", error)
      // Don't show error notification to user as weather is non-critical
    } finally {
      setWeatherLoading(false)
    }
  }, []) // Company state handled internally

  // Derived data

  const currentWeekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    })
  }, [currentWeekStart])



  // Compute schedule validations per employee per week
  const weeklyValidations = useMemo(() => {
    // Group schedules by employee within current week
    const start = currentWeekStart
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    const result: Record<string, ScheduleValidation> = {}

    const employees = hrState.employees || []
    employees.forEach((employee: Employee) => {
      const empSchedules = schedules.filter((s) => {
        const date = parseISO(s.date)
        return s.employeeId === employee.id && isWithinInterval(date, { start, end })
      })

      const totalHours = empSchedules.reduce((sum, s) => {
        const hrs = calculateHoursFromTimeStrings(s.startTime, s.endTime)
        return sum + (isNaN(hrs) ? 0 : hrs)
      }, 0)

      const minHours = employee.minHoursPerWeek ?? 0
      const maxHours = employee.maxHoursPerWeek ?? Infinity

      const violations: ScheduleValidation["violations"] = []
      if (minHours > 0 && totalHours < minHours) {
        violations.push({ type: "min_hours", message: `Under minimum weekly hours (${totalHours.toFixed(2)} < ${minHours})`, severity: "warning" })
      }
      if (isFinite(maxHours) && totalHours > maxHours) {
        violations.push({ type: "max_hours", message: `Over maximum weekly hours (${totalHours.toFixed(2)} > ${maxHours})`, severity: "warning" })
      }

      // Sort schedules by date/time to check rest gaps
      const sorted = [...empSchedules].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      let minGapHrs: number | undefined
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const curr = sorted[i]
        const prevEnd = parseISO(`${prev.date}T${prev.endTime}`)
        const currStart = parseISO(`${curr.date}T${curr.startTime}`)
        const gapMinutes = differenceInMinutes(currStart, prevEnd)
        const gapHours = gapMinutes / 60
        if (minGapHrs === undefined || gapHours < minGapHrs) minGapHrs = gapHours
        if (gapHours < 11) {
          const has8hr = employee.has8HourRestPermission || employee.clockInSettings?.requiresPermissionFor8HrGap
          if (gapHours < 8 && !has8hr) {
            violations.push({ type: "gap_8hr_no_permission", message: `Rest gap ${gapHours.toFixed(2)}h < 8h and no permission`, severity: "error" })
          } else if (gapHours < 11) {
            violations.push({ type: "gap_11hr", message: `Rest gap ${gapHours.toFixed(2)}h < 11h`, severity: has8hr && gapHours >= 8 ? "warning" : "error" })
          }
        }
      }

      if (empSchedules.length > 0) {
        result[employee.id] = {
          employeeId: employee.id,
          date: format(start, "yyyy-MM-dd"),
          violations,
          totalHours,
          gapBetweenShifts: minGapHrs,
          hasPermissionFor8HrGap: Boolean(employee.has8HourRestPermission || employee.clockInSettings?.requiresPermissionFor8HrGap),
        }
      }
    })

    return result
  }, [hrState.employees, schedules, currentWeekStart])

  const groupedEmployees = useMemo(() => {
    // Use the filteredEmployees from the main filter logic above
    // This ensures consistency with the DataHeader filters

    // Then group the filtered employees
    if (groupBy === "none") {
      // No grouping - return all employees in a single group
      return { "All Employees": filteredEmployees }
    }
    
    return filteredEmployees.reduce((groups: Record<string, Employee[]>, employee: Employee) => {
      let groupKey = ""

      if (groupBy === "department") {
        // Use direct department field, fallback to resolving from departmentID if needed
        groupKey = employee.department || (() => {
          const employeeDeptID = (employee as any).departmentID
          const foundDept = employeeDeptID ? departments.find((d) => d.id === employeeDeptID) : undefined
          return foundDept ? foundDept.name : "Unassigned"
        })()
      } else if (groupBy === "role") {
        // Resolve role name from roleId/roleID
        const roleId = employee.roleId || (employee as any).roleID
        const role = roleId ? roles.find((r) => r.id === roleId) : undefined
        groupKey = role ? (role.label || role.name) : "Unassigned"
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(employee)
      return groups
    }, {})
  }, [filteredEmployees, groupBy, roles, departments])

  // Removed unused groupedSchedules

  // Handler functions


  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false)
    setFormData(initialFormData)
    setEditMode(false)
    setSelectedEmployeeData(null)
  }, [])

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }))
  }, [])

  const handleSelectChange = useCallback((e: SelectChangeEvent) => {
    const { name, value } = e.target
    if (name) {
      // Type assertion to ensure correct types for shiftType and payType
      if (name === "shiftType") {
        setFormData((prev) => ({
          ...prev,
          [name]: value as "regular" | "holiday" | "off" | "training",
        }))
      } else if (name === "payType") {
        setFormData((prev) => ({
          ...prev,
          [name]: value as "hourly" | "flat",
        }))
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }))
      }
    }
  }, [])

  const handleEmployeeChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      const employeeId = e.target.value
      const employee = hrState.employees.find((emp) => emp.id === employeeId)

      if (employee) {
        // Handle both roleID (uppercase) and roleId (lowercase) like EmployeeList
        const roleId = (employee as any)?.roleID || employee?.roleId
        const employeeRole = roleId ? roles.find((r) => r.id === roleId) : null
        const department = employee.department || ""

        setFormData({
          ...formData,
          employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department,
          role: employeeRole?.label || employeeRole?.name || "",
        })

        // Store the selected employee data for cost calculations
        setSelectedEmployeeData(employee)
      }
    },
    [formData, hrState.employees, roles],
  )

  const handleSubmit = useCallback(async () => {
    // Validate form data
    if (!formData.employeeId || !formData.date || !formData.startTime || !formData.endTime || !formData.department) {
      setNotification({ message: "Please fill in all required fields.", type: "error" })
      return
    }

    // Company state is now handled internally by HRContext
    if (false) { // Disabled company state check
      setNotification({ message: "Company or site not selected", type: "error" })
      return
    }

    // Loading state handled by HR context
    try {
      // Calculate hours
      // const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

      // Get employee data to use hourly rate if needed
      // const employee = (hrState.employees || []).find((emp) => emp.id === formData.employeeId)

      // Create shift object for database
      // const shiftData: Omit<Shift, "id"> = {
      //   employeeId: formData.employeeId,
      //   date: new Date(formData.date).getTime(),
      //   startTime: format(formData.startTime, "HH:mm"),
      //   endTime: format(formData.endTime, "HH:mm"),
      //   hours,
      //   breakDuration: 0, // Default break duration
      //   department: formData.department,
      //   position: formData.role || "",
      //   notes: formData.notes,
      //   status: formData.status as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show",
      //   shiftType: formData.shiftType,
      //   payType: formData.payType,
      //   // Ensure payRate is always a valid number, never undefined
      //   payRate: formData.payType === "flat" ? formData.payRate || 0 : employee?.hourlyRate || 0, // Use employee's hourly rate or 0
      //   createdBy: "current_user", // In a real app, get from auth context
      //   createdAt: Date.now(),
      // }

      if (editMode && formData.id) {
        // Update existing schedule
        // Would replace with specific HRContext function for updating schedules
        // await updateSchedule(formData.id, { ...shiftData, updatedAt: Date.now() })
        setNotification({ message: "Schedule updated successfully!", type: "success" })
      } else {
        // Create new schedule
        // Would replace with specific HRContext function for creating schedules
        // await createSchedule(shiftData)
        setNotification({ message: "Schedule created successfully!", type: "success" })
      }

      // Reload schedules
      // Data will be refreshed automatically by HRContext
      handleCloseDialog()
    } catch (err: any) {
      console.error("Error saving schedule:", err)
      setNotification({ message: err.message || "Failed to save schedule", type: "error" })
    } finally {
      // Loading state handled by HR context
    }
  }, [
    editMode,
    formData,
    hrState.employees,
    setNotification,
    handleCloseDialog
  ])

  // Calculate employee cost based on pay type, hours, tronc, and bonus
  const calculateEmployeeCost = useCallback(
    (employee: Employee | null, startTime: Date | null, endTime: Date | null, payType: string, payRate?: number) => {
      if (!employee || !startTime || !endTime) return null

      // Calculate shift duration in hours
      const durationHours = differenceInHours(endTime, startTime)
      const durationMinutes = differenceInMinutes(endTime, startTime) % 60
      const totalHours = durationHours + durationMinutes / 60

      let cost = 0

      if (payType === "hourly") {
        // Use hourly rate. If employee is salaried, derive hourly from salary and contract hours
        let hourlyRate = employee.hourlyRate || 0
        if (employee.payType === "salary" && employee.salary) {
          const contractHours = employee.hoursPerWeek && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40
          hourlyRate = (employee.salary / 52) / contractHours
        }
        cost = hourlyRate * totalHours
      } else if (payType === "flat") {
        // Use the specified flat rate
        cost = payRate || 0
      } else if (employee.payType === "salary" && employee.salary) {
        // Derive hourly from salary as a fallback
        const contractHours = employee.hoursPerWeek && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40
        const hourlyRate = (employee.salary / 52) / contractHours
        cost = hourlyRate * totalHours
      }

      // Add proportional tronc and bonus for the shift duration
      // Assuming tronc and bonus are monthly values, we calculate daily rates
      const workDaysPerMonth = 22 // Average work days in a month
      const workHoursPerDay = (employee.hoursPerWeek || 40) / 5 // Average work hours per day based on employee's hours

      // Calculate proportional tronc for this shift
      const troncPerHour = (employee.tronc || 0) / (workDaysPerMonth * workHoursPerDay)
      const troncForShift = troncPerHour * totalHours

      // Calculate proportional bonus for this shift
      const bonusPerHour = (employee.bonus || 0) / (workDaysPerMonth * workHoursPerDay)
      const bonusForShift = bonusPerHour * totalHours

      // Add tronc and bonus to the cost
      cost += troncForShift + bonusForShift

      return cost
    },
    [],
  )

  // Update estimated cost when relevant form data changes
  useEffect(() => {
    const cost = calculateEmployeeCost(
      selectedEmployeeData,
      formData.startTime,
      formData.endTime,
      formData.payType,
      formData.payRate,
    )
    setEstimatedCost(cost)
  }, [
    formData.startTime,
    formData.endTime,
    formData.payType,
    formData.payRate,
    selectedEmployeeData,
    calculateEmployeeCost,
  ])


  const handleBulkScheduleSubmit = useCallback(async (bulkData: any) => {
    const { selectedEmployees, selectedDays, startTime, endTime, department, role, notes, shiftType, payType, payRate } = bulkData

    try {
      const promises: Promise<any>[] = []
      let totalEstimatedCost = 0

      selectedEmployees.forEach((employeeId: string) => {
        selectedDays.forEach((dayIndex: number) => {
          const targetDate = addDays(currentWeekStart, dayIndex === 0 ? 6 : dayIndex - 1)
          const dateStr = format(targetDate, "yyyy-MM-dd")

          const employee = hrState.employees.find((emp) => emp.id === employeeId)
          if (!employee) return

          const scheduleData = {
            employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            date: dateStr,
            startTime,
            endTime,
            department: department || employee.department || "",
            role: role || (employee.roleId ? (roles.find((r) => r.id === employee.roleId)?.label || roles.find((r) => r.id === employee.roleId)?.name) : ""),
            notes: notes || "",
            status: "draft" as const,
            shiftType: shiftType || "regular",
            payType: payType || "hourly",
            payRate: payRate || employee.hourlyRate || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          // Calculate estimated cost
          const startTimeObj = parseISO(`2000-01-01T${startTime}`)
          const endTimeObj = parseISO(`2000-01-01T${endTime}`)
          const shiftCost = calculateEmployeeCost(employee, startTimeObj, endTimeObj, payType, payRate)

          if (shiftCost !== null) {
            totalEstimatedCost += shiftCost
          }

          promises.push(addSchedule(scheduleData))
        })
      })

      await Promise.all(promises)
      setNotification({
        message: `Bulk schedules created successfully! Total estimated cost: £${totalEstimatedCost.toFixed(2)}`,
        type: "success",
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "scheduleManagerModal1",
        crudMode: "create",
      })
      setBulkScheduleMode(false)
      // Data will be refreshed automatically by HRContext
    } catch (err: any) {
      console.error("Error creating bulk schedules:", err)
      setNotification({ message: err.message || "Failed to create bulk schedules", type: "error" })
      throw err // Re-throw to let the form handle the error
    }
  }, [currentWeekStart, hrState.employees, calculateEmployeeCost, addSchedule])

  // Copy last week's schedule
  const handleCopyLastWeek = useCallback(async () => {
    // Company state is now handled internally by HRContext
    if (false) { // Disabled company state check
      setNotification({ message: "Company or site not selected", type: "error" })
      return
    }
    
    if (!addSchedule) {
      setNotification({ message: "Schedule creation function not available", type: "error" })
      return
    }

    const lastWeekStart = subWeeks(currentWeekStart, 1)
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 })

    // Find schedules from last week
    const lastWeekSchedules = schedules.filter((schedule) => {
      const scheduleDate = parseISO(schedule.date)
      return isWithinInterval(scheduleDate, {
        start: lastWeekStart,
        end: lastWeekEnd,
      })
    })

    if (lastWeekSchedules.length === 0) {
      setNotification({ message: "No schedules found for last week to copy", type: "info" })
      return
    }

    // Loading state handled by HR context
    try {
      // Group schedules by employee and new date to avoid duplicates
      const groupedSchedules = new Map<string, any[]>()
      let totalEstimatedCost = 0

      lastWeekSchedules.forEach((schedule) => {
        // Try to find employee by both id and employeeID fields
        let employee = hrState.employees.find((emp) => emp.id === schedule.employeeId)
        if (!employee) {
          employee = hrState.employees.find((emp) => emp.employeeID === schedule.employeeId)
        }
        
        if (!employee) {
          return
        }

        // Check if employee is still active
        if (employee.status !== "active" && !(employee as any).isActive) {
          return
        }

        // Calculate the new date (same day of week, but current week)
        const originalDate = parseISO(schedule.date)
        const dayOfWeek = originalDate.getDay()
        const newDate = addDays(currentWeekStart, dayOfWeek === 0 ? 6 : dayOfWeek - 1)
        const newDateStr = format(newDate, "yyyy-MM-dd")

        // Get department name from departmentId if needed
        let departmentName = schedule.department || employee.department || ""
        if (!departmentName && employee.departmentId) {
          const department = departments.find((dept) => dept.id === employee.departmentId)
          departmentName = department?.name || ""
        }
        
        // Get role name from roleId if needed
        let roleName = schedule.role || ""
        if (!roleName && employee.roleId) {
          const role = roles.find((r) => r.id === employee.roleId)
          roleName = role?.label || role?.name || ""
        }

        const scheduleData = {
          employeeId: schedule.employeeId,
          employeeName: schedule.employeeName || `${employee.firstName} ${employee.lastName}`,
          date: newDateStr,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          department: departmentName,
          role: roleName,
          notes: schedule.notes || "",
          status: "scheduled" as const,
          shiftType: schedule.shiftType || "regular",
          payType: schedule.payType || "hourly",
          payRate: schedule.payRate || employee.hourlyRate || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Calculate cost for this shift
        const startTime = parseISO(`2000-01-01T${schedule.startTime}`)
        const endTime = parseISO(`2000-01-01T${schedule.endTime}`)
        const shiftCost = calculateEmployeeCost(employee, startTime, endTime, schedule.payType, schedule.payRate)

        if (shiftCost !== null) {
          totalEstimatedCost += shiftCost
        }

        // Group by employee and date
        const groupKey = `${schedule.employeeId}_${newDateStr}`
        if (!groupedSchedules.has(groupKey)) {
          groupedSchedules.set(groupKey, [])
        }
        groupedSchedules.get(groupKey)!.push(scheduleData)
      })

      // Create schedules for each group
      const promises: Promise<any>[] = []
      for (const [_groupKey, schedules] of groupedSchedules) {
        for (const scheduleData of schedules) {
          // Wrap addSchedule in a function to catch any errors
          const schedulePromise = addSchedule(scheduleData).catch(error => {
            throw error
          })
          
          promises.push(schedulePromise)
        }
      }

      await Promise.all(promises)
      
      // Add a small delay to ensure database writes are complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const totalShifts = Array.from(groupedSchedules.values()).flat().length
      setNotification({
        message: `Copied ${totalShifts} shifts from last week for ${groupedSchedules.size} employee-day combinations! Total estimated cost: £${totalEstimatedCost.toFixed(2)}`,
        type: "success",
      })
      // Data will be refreshed automatically by HRContext
    } catch (err: any) {
      console.error("❌ Copy Last Week - Error copying last week's schedule:", err)
      setNotification({ message: err.message || "Failed to copy last week's schedule", type: "error" })
    } finally {
      // Loading state handled by HR context
    }
  }, [
    currentWeekStart,
    schedules,
    hrState.employees,
    calculateEmployeeCost,
    addSchedule,
    roles,
    setNotification,
    dateRange,
    dynamicDateRange,
  ])

  // Analyze historical patterns from past schedules
  const analyzeHistoricalPatterns = useCallback((historicalSchedules: Schedule[], employees: Employee[], bookingsData?: any[]) => {
    const dayOfWeekPatterns: Record<number, {
      averageStaff: number
      peakHours: Record<number, number>
      employeeShifts: Array<{
        employeeId: string
        averageStartTime: string
        averageEndTime: string
        frequency: number
      }>
    }> = {}

    // Initialize patterns for each day of week
    for (let day = 0; day < 7; day++) {
      dayOfWeekPatterns[day] = {
        averageStaff: 0,
        peakHours: {},
        employeeShifts: []
      }
    }

    // Analyze schedules by day of week
    historicalSchedules.forEach((schedule) => {
      const scheduleDate = parseISO(schedule.date)
      const dayOfWeek = scheduleDate.getDay()
      
      if (!dayOfWeekPatterns[dayOfWeek]) {
        dayOfWeekPatterns[dayOfWeek] = {
          averageStaff: 0,
          peakHours: {},
          employeeShifts: []
        }
      }

      // Count staff per day
      dayOfWeekPatterns[dayOfWeek].averageStaff += 1

      // Track peak hours
      const startHour = parseInt(schedule.startTime.split(':')[0])
      const endHour = parseInt(schedule.endTime.split(':')[0])
      for (let hour = startHour; hour < endHour; hour++) {
        dayOfWeekPatterns[dayOfWeek].peakHours[hour] = (dayOfWeekPatterns[dayOfWeek].peakHours[hour] || 0) + 1
      }
    })

    // Calculate averages and employee patterns
    Object.keys(dayOfWeekPatterns).forEach(dayKey => {
      const day = parseInt(dayKey)
      const pattern = dayOfWeekPatterns[day]
      
      // Calculate average staff per day (divide by number of weeks analyzed)
      const weeksAnalyzed = Math.max(1, Math.floor(historicalSchedules.length / 7))
      pattern.averageStaff = Math.round(pattern.averageStaff / weeksAnalyzed)

      // Find peak hours
      // const maxPeak = Math.max(...Object.values(pattern.peakHours))
      Object.keys(pattern.peakHours).forEach(hour => {
        pattern.peakHours[parseInt(hour)] = Math.round((pattern.peakHours[parseInt(hour)] / weeksAnalyzed) * 100) / 100
      })

      // Analyze employee shift patterns for this day
      const employeeShifts: Record<string, {
        startTimes: string[]
        endTimes: string[]
        count: number
      }> = {}

      historicalSchedules.forEach((schedule) => {
        const scheduleDate = parseISO(schedule.date)
        if (scheduleDate.getDay() === day) {
          if (!employeeShifts[schedule.employeeId]) {
            employeeShifts[schedule.employeeId] = {
              startTimes: [],
              endTimes: [],
              count: 0
            }
          }
          employeeShifts[schedule.employeeId].startTimes.push(schedule.startTime)
          employeeShifts[schedule.employeeId].endTimes.push(schedule.endTime)
          employeeShifts[schedule.employeeId].count += 1
        }
      })

      // Calculate average shift times for each employee
      Object.keys(employeeShifts).forEach(empId => {
        const empShifts = employeeShifts[empId]
        if (empShifts.count > 0) {
          // Calculate average start time
          const startMinutes = empShifts.startTimes.map(time => {
            const [hours, minutes] = time.split(':').map(Number)
            return hours * 60 + minutes
          }).reduce((sum, mins) => sum + mins, 0) / empShifts.startTimes.length

          const endMinutes = empShifts.endTimes.map(time => {
            const [hours, minutes] = time.split(':').map(Number)
            return hours * 60 + minutes
          }).reduce((sum, mins) => sum + mins, 0) / empShifts.endTimes.length

          const avgStartHour = Math.floor(startMinutes / 60)
          const avgStartMin = Math.floor(startMinutes % 60)
          const avgEndHour = Math.floor(endMinutes / 60)
          const avgEndMin = Math.floor(endMinutes % 60)

          pattern.employeeShifts.push({
            employeeId: empId,
            averageStartTime: `${String(avgStartHour).padStart(2, '0')}:${String(avgStartMin).padStart(2, '0')}`,
            averageEndTime: `${String(avgEndHour).padStart(2, '0')}:${String(avgEndMin).padStart(2, '0')}`,
            frequency: empShifts.count
          })
        }
      })

      // Sort by frequency (most frequent first)
      pattern.employeeShifts.sort((a, b) => b.frequency - a.frequency)
    })

    console.log("Historical patterns analysis:", {
      dayOfWeekPatterns,
      totalHistoricalSchedules: historicalSchedules.length,
      bookingsDataAvailable: !!bookingsData,
      uniqueEmployees: Object.keys(dayOfWeekPatterns).reduce((acc, dayKey) => {
        const day = parseInt(dayKey)
        const pattern = dayOfWeekPatterns[day]
        pattern.employeeShifts.forEach(shift => {
          acc.add(shift.employeeId)
        })
        return acc
      }, new Set<string>()).size
    })

    return {
      dayOfWeekPatterns,
      totalWeeksAnalyzed: Math.max(1, Math.floor(historicalSchedules.length / 7)),
      peakDemandHours: calculatePeakDemandHours(bookingsData),
      employeeAvailabilityPatterns: analyzeEmployeeAvailability(historicalSchedules, employees)
    }
  }, [])

  // Calculate peak demand hours from booking data
  const calculatePeakDemandHours = useCallback((bookingsData?: any[]) => {
    if (!bookingsData || bookingsData.length === 0) return {}
    
    const hourlyDemand: Record<number, number> = {}
    
    bookingsData.forEach(booking => {
      const startTime = new Date(booking.startTime || booking.startDate)
      const endTime = new Date(booking.endTime || booking.endDate)
      
      for (let hour = startTime.getHours(); hour < endTime.getHours(); hour++) {
        hourlyDemand[hour] = (hourlyDemand[hour] || 0) + 1
      }
    })

    return hourlyDemand
  }, [])

  // Analyze employee availability patterns
  const analyzeEmployeeAvailability = useCallback((schedules: Schedule[], employees: Employee[]) => {
    const availabilityPatterns: Record<string, {
      preferredDays: Record<number, number>
      preferredHours: Record<string, number>
      totalShifts: number
    }> = {}

    employees.forEach(emp => {
      availabilityPatterns[getEmployeeId(emp) || ''] = {
        preferredDays: {},
        preferredHours: {},
        totalShifts: 0
      }
    })

    schedules.forEach(schedule => {
      const empId = schedule.employeeId
      if (availabilityPatterns[empId]) {
        const scheduleDate = parseISO(schedule.date)
        const dayOfWeek = scheduleDate.getDay()
        
        availabilityPatterns[empId].preferredDays[dayOfWeek] = 
          (availabilityPatterns[empId].preferredDays[dayOfWeek] || 0) + 1
        
        const timeSlot = `${schedule.startTime}-${schedule.endTime}`
        availabilityPatterns[empId].preferredHours[timeSlot] = 
          (availabilityPatterns[empId].preferredHours[timeSlot] || 0) + 1
        
        availabilityPatterns[empId].totalShifts += 1
      }
    })

    return availabilityPatterns
  }, [])

  // Helper function to get employee ID safely
  const getEmployeeId = (emp: any): string => {
    return emp.id || emp.employeeID || ''
  }

  const generateRotaWithAI = useCallback(async () => {
    // Company state is now handled internally by HRContext
    if (false) { // Disabled company state check
      setNotification({ message: "Company or site not selected", type: "error" })
      return
    }

    try {
      // Check if employees are loaded
      if (!hrState.employees || hrState.employees.length === 0) {
        console.error("❌ AI Scheduling - No employees loaded in HR state")
        setNotification({ message: "No employees found. Please ensure employees are loaded.", type: "error" })
        return
      }
      
      // Use ALL schedules from hrState for AI analysis, not just the filtered current week schedules
      const allSchedules = hrState.schedules || []
      
      // Debug: Log all employees and their IDs
      console.log("🔍 AI Scheduling - Current employees list:", {
        totalEmployees: hrState.employees.length,
        employeeIds: hrState.employees.map(emp => ({
          id: emp.id,
          employeeID: emp.employeeID,
          name: `${emp.firstName} ${emp.lastName}`,
          status: emp.status
        }))
      })

      console.log("🔍 AI Scheduling - Using ALL schedules for analysis:", {
        totalSchedulesInHRState: allSchedules.length,
        filteredSchedulesForView: schedules.length,
        sampleSchedule: allSchedules[0],
        dateRange: allSchedules.length > 0 ? {
          earliest: Math.min(...allSchedules.map(s => new Date(s.date).getTime())),
          latest: Math.max(...allSchedules.map(s => new Date(s.date).getTime())),
          earliestDate: new Date(Math.min(...allSchedules.map(s => new Date(s.date).getTime()))).toISOString().split('T')[0],
          latestDate: new Date(Math.max(...allSchedules.map(s => new Date(s.date).getTime()))).toISOString().split('T')[0]
        } : null,
        hrStateEmployeesCount: hrState.employees?.length || 0,
        hrStateEmployeesSample: hrState.employees?.slice(0, 3).map(e => ({
          id: e.id,
          employeeID: e.employeeID,
          name: `${e.firstName} ${e.lastName}`,
          status: e.status,
          isActive: (e as any).isActive
        })) || []
      })
      
      // Analyze comprehensive historical data (last 8 weeks for better patterns)
      const historicalWeeks = 8
      const historicalStart = subWeeks(currentWeekStart, historicalWeeks)
      const historicalEnd = subWeeks(currentWeekStart, 1) // Exclude current week
      
      const historicalSchedules = allSchedules.filter((schedule) => {
        const scheduleDate = parseISO(schedule.date)
        return isWithinInterval(scheduleDate, { start: historicalStart, end: historicalEnd })
      })

      console.log("AI Scheduling - Historical data analysis:", {
        historicalWeeks,
        historicalSchedules: historicalSchedules.length,
        dateRange: `${format(historicalStart, "yyyy-MM-dd")} to ${format(historicalEnd, "yyyy-MM-dd")}`,
        totalSchedulesAvailable: allSchedules.length,
        historicalSchedulesSample: historicalSchedules.slice(0, 3).map(s => ({
          id: s.id,
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      })

      // Debug: Show unique employee IDs in historical schedules
      const uniqueHistoricalEmployeeIds = [...new Set(historicalSchedules.map(s => s.employeeId))].sort()
      console.log("🔍 AI Scheduling - Unique employee IDs in historical schedules:", {
        count: uniqueHistoricalEmployeeIds.length,
        employeeIds: uniqueHistoricalEmployeeIds.slice(0, 10), // Show first 10
        allEmployeeIds: uniqueHistoricalEmployeeIds
      })
      
      // Debug: Show sample historical schedules with employee names
      console.log("🔍 AI Scheduling - Sample historical schedules with employee names:", {
        sampleSchedules: historicalSchedules.slice(0, 5).map(s => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      })

      // Analyze patterns from historical data
      console.log("🔍 AI Scheduling - Analyzing historical patterns:", {
        historicalSchedulesCount: historicalSchedules.length,
        employeesCount: hrState.employees.length,
        bookingsCount: bookingsData?.length || 0,
        sampleHistoricalSchedule: historicalSchedules[0],
        sampleEmployee: hrState.employees[0],
        historicalSchedulesByEmployee: historicalSchedules.reduce((acc, schedule) => {
          const empId = schedule.employeeId
          acc[empId] = (acc[empId] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        uniqueHistoricalEmployees: [...new Set(historicalSchedules.map(s => s.employeeId))],
        dateRange: historicalSchedules.length > 0 ? {
          earliest: Math.min(...historicalSchedules.map(s => new Date(s.date).getTime())),
          latest: Math.max(...historicalSchedules.map(s => new Date(s.date).getTime())),
          earliestDate: new Date(Math.min(...historicalSchedules.map(s => new Date(s.date).getTime()))).toISOString().split('T')[0],
          latestDate: new Date(Math.max(...historicalSchedules.map(s => new Date(s.date).getTime()))).toISOString().split('T')[0]
        } : null
      })
      
      const historicalPatterns = analyzeHistoricalPatterns(historicalSchedules, hrState.employees, bookingsData)
      
      console.log("📊 AI Scheduling - Historical patterns result:", {
        dayOfWeekPatterns: Object.keys(historicalPatterns.dayOfWeekPatterns).length,
        totalWeeksAnalyzed: historicalPatterns.totalWeeksAnalyzed,
        peakDemandHours: Object.keys(historicalPatterns.peakDemandHours).length,
        dayPatterns: Object.entries(historicalPatterns.dayOfWeekPatterns).map(([day, pattern]) => ({
          day,
          averageStaff: pattern.averageStaff,
          employeeShiftsCount: pattern.employeeShifts.length,
          employeeShifts: pattern.employeeShifts.map(shift => ({
            employeeId: shift.employeeId,
            averageStartTime: shift.averageStartTime,
            averageEndTime: shift.averageEndTime
          }))
        }))
      })
      
      // Create a comprehensive employee list that includes both current employees and employees from historical schedules
      const allEmployeeIds = new Set<string>()
      const employeeMap = new Map<string, any>()
      
      // Add current employees
      hrState.employees.forEach(emp => {
        const empId = getEmployeeId(emp)
        if (empId) {
          allEmployeeIds.add(empId)
          employeeMap.set(empId, emp)
        }
      })
      
      // Add employees from historical schedules (even if not in current employee list)
      historicalSchedules.forEach(schedule => {
        if (schedule.employeeId && !allEmployeeIds.has(schedule.employeeId)) {
          allEmployeeIds.add(schedule.employeeId)
          // Create a minimal employee object for historical employees not in current list
          const employeeName = schedule.employeeName || 'Unknown Employee'
          const nameParts = employeeName.split(' ')
          const firstName = nameParts[0] || 'Unknown'
          const lastName = nameParts.slice(1).join(' ') || 'Employee'
          
          console.log(`🔍 Creating historical employee:`, {
            employeeId: schedule.employeeId,
            originalName: schedule.employeeName,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`
          })
          
          employeeMap.set(schedule.employeeId, {
            id: schedule.employeeId,
            employeeID: schedule.employeeId,
            firstName,
            lastName,
            status: 'active', // Assume active for historical employees
            department: schedule.department || '',
            roleId: schedule.role || '',
            hourlyRate: 0
          })
        }
      })
      
      console.log("🔍 AI Scheduling - Comprehensive employee list:", {
        totalEmployees: allEmployeeIds.size,
        currentEmployees: hrState.employees.length,
        historicalOnlyEmployees: allEmployeeIds.size - hrState.employees.length,
        allEmployeeIds: Array.from(allEmployeeIds)
      })

      // Use historical patterns to generate base suggestions
      const baseSuggestions: typeof aiSuggestions = []
      const currentWeekDates = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) })
      
      currentWeekDates.forEach((day) => {
        const dayOfWeek = day.getDay()
        const dayPattern = historicalPatterns.dayOfWeekPatterns[dayOfWeek]
        
        if (dayPattern && dayPattern.averageStaff > 0) {
          // Generate shifts based on historical patterns for this day of week
          dayPattern.employeeShifts.forEach((empShift) => {
            console.log(`🔍 Looking for employee with historical pattern ID: ${empShift.employeeId}`)
            const emp = employeeMap.get(empShift.employeeId)
            if (!emp) {
              console.warn(`❌ Employee not found for historical pattern ID: ${empShift.employeeId}`)
              return
            }
            
            // For historical employees, we'll include them regardless of status
            // For current employees, check if they're active
            const isCurrentEmployee = hrState.employees.some(e => getEmployeeId(e) === empShift.employeeId)
            if (isCurrentEmployee && emp.status !== "active" && (emp as any).isActive !== true) {
              console.warn(`⚠️ Current employee ${emp.firstName} ${emp.lastName} is not active (status: ${emp.status}, isActive: ${(emp as any).isActive})`)
              return
            }

            const generatedEmployeeId = getEmployeeId(emp)
            console.log(`🤖 AI Generating suggestion for:`, {
              employeeName: `${emp.firstName} ${emp.lastName}`,
              employeeId: emp.id,
              employeeID: emp.employeeID,
              generatedEmployeeId: generatedEmployeeId,
              status: emp.status,
              isActive: (emp as any).isActive
            })

            const suggestion = {
              employeeId: generatedEmployeeId,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              date: format(day, "yyyy-MM-dd"),
              startTime: empShift.averageStartTime,
              endTime: empShift.averageEndTime,
              department: emp.department || "",
              role: emp.roleId ? (roles.find((r) => r.id === emp.roleId)?.label || roles.find((r) => r.id === emp.roleId)?.name) : "",
              notes: "AI generated - historical pattern",
              shiftType: "regular" as const,
              payType: "hourly" as const,
              payRate: emp.hourlyRate || 0,
            }
            
            console.log(`✅ Creating base suggestion:`, {
              employeeId: suggestion.employeeId,
              employeeName: suggestion.employeeName,
              date: suggestion.date,
              time: `${suggestion.startTime}-${suggestion.endTime}`,
              department: suggestion.department
            })
            
            baseSuggestions.push(suggestion)
          })
        }
      })

      console.log("AI Scheduling - Base suggestions from historical patterns:", {
        baseSuggestions: baseSuggestions.length,
        uniqueEmployeesInBase: new Set(baseSuggestions.map(s => s.employeeId)).size,
        sampleBaseSuggestion: baseSuggestions[0],
        allBaseSuggestions: baseSuggestions.map(s => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        })),
        historicalPatterns: historicalPatterns,
        totalActiveEmployees: hrState.employees.filter((emp) => emp.status === "active" || (emp as any).isActive === true).length,
        baseSuggestionsDetails: baseSuggestions.map(s => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      })

      // Helper: parse availability hours (e.g., "08:00-22:00")
      const parseAvailabilityHours = (hoursStr?: string): { start: number; end: number } | null => {
        if (!hoursStr) return null
        const m = hoursStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
        if (!m) return null
        const sh = Number(m[1]); const sm = Number(m[2]); const eh = Number(m[3]); const em = Number(m[4])
        return { start: sh + sm / 60, end: eh + em / 60 }
      }

      // Helper: get business hours for a specific day
      const getBusinessHoursForDay = (dayOfWeek: number): { open: string; close: string; closed: boolean } => {
        if (!businessHours || !Array.isArray(businessHours)) {
          // Default business hours if not provided
          const defaultHours = {
            1: { open: "09:00", close: "17:00", closed: false }, // Monday
            2: { open: "09:00", close: "17:00", closed: false }, // Tuesday
            3: { open: "09:00", close: "17:00", closed: false }, // Wednesday
            4: { open: "09:00", close: "17:00", closed: false }, // Thursday
            5: { open: "09:00", close: "17:00", closed: false }, // Friday
            6: { open: "10:00", close: "16:00", closed: false }, // Saturday
            0: { open: "10:00", close: "16:00", closed: true },  // Sunday
          }
          return defaultHours[dayOfWeek as keyof typeof defaultHours] || { open: "09:00", close: "17:00", closed: false }
        }

        // Find business hours for this day of week
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        const dayName = dayNames[dayOfWeek]
        const dayHours = businessHours.find((bh: any) => bh.day === dayName)
        
        if (dayHours) {
          return {
            open: dayHours.open || "09:00",
            close: dayHours.close || "17:00",
            closed: dayHours.closed || false
          }
        }

        // Default fallback
        return { open: "09:00", close: "17:00", closed: false }
      }

      // Helper: parse availability days (e.g., "Monday to Saturday", "Mon, Tue")
      const parseAvailabilityDays = (daysStr?: string): number[] => {
        if (!daysStr) return []
        const mapping: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 }
        let s = daysStr.toLowerCase().replace(/,/g, ' ').replace(/-/g, ' to ')
        if (s.includes(' to ')) {
          const [a, b] = s.split(' to ').map((t) => t.trim())
          if (a in mapping && b in mapping) {
            const ai = mapping[a]; const bi = mapping[b]
            if (ai <= bi) return Array.from({ length: bi - ai + 1 }, (_, i) => ai + i)
            return [...Array.from({ length: 7 - ai }, (_, i) => ai + i), ...Array.from({ length: bi + 1 }, (_, i) => i)]
          }
        }
        const out: number[] = []
        Object.entries(mapping).forEach(([k, v]) => { if (s.includes(k)) out.push(v) })
        return out.length ? out : [1,2,3,4,5] // default Mon-Fri
      }

      // Demand forecast from bookings (current week)
      let bookingsCurrentWeek: Booking[] = bookingsData || []
      let allBookingsAll: Booking[] = bookingsData || []
      
      console.log("AI Scheduling - Using bookings data:", {
        totalBookings: bookingsData?.length || 0,
        currentWeekStart: format(currentWeekStart, "yyyy-MM-dd"),
        businessHoursAvailable: !!businessHours
      })
      const demandByDayHour: Record<string, number> = {}
      // Derive covers per staff-hour and typical shift lengths from historical schedules
      const dowHourAvgStaff: Record<number, Record<number, number>> = {}
      const dowHourAvgCovers: Record<number, Record<number, number>> = {}
      // Build staff presence per DOW/hour
      allSchedules.forEach((s) => {
        const dow = parseISO(s.date).getDay()
        const sh = Number(s.startTime.split(":")[0]) || 0
        const eh = Number(s.endTime.split(":")[0]) || sh + 8
        if (!dowHourAvgStaff[dow]) dowHourAvgStaff[dow] = {}
        for (let h = sh; h <= eh; h++) {
          dowHourAvgStaff[dow][h] = (dowHourAvgStaff[dow][h] || 0) + 1
        }
      })
      // Build covers per hour by aggregating ALL bookings historically per DOW/hour
      allBookingsAll.forEach((b) => {
        const dow = parseISO(b.date).getDay()
        const sh = Number((b.startTime || b.arrivalTime || "00:00").split(":")[0]) || 0
        const eh = Number((b.endTime || b.until || b.startTime || "00:00").split(":")[0]) || sh + Math.round(((b.duration || 120) / 60))
        const covers = b.guests || b.covers || 2
        if (!dowHourAvgCovers[dow]) dowHourAvgCovers[dow] = {}
        for (let h = sh; h <= eh; h++) {
          dowHourAvgCovers[dow][h] = (dowHourAvgCovers[dow][h] || 0) + covers
        }
      })
      
      console.log("AI Scheduling - Historical trends analysis:", {
        totalBookingsAnalyzed: allBookingsAll.length,
        dayOfWeekCoverage: Object.keys(dowHourAvgCovers).length,
        peakHours: Object.entries(dowHourAvgCovers).reduce((acc, [dow, hours]) => {
          const maxHour = Object.entries(hours as Record<number, number>).reduce((max, [hour, covers]) => 
            covers > (hours[parseInt(max)] || 0) ? hour : max, Object.keys(hours)[0] || "0"
          )
          acc[dow] = { hour: maxHour, covers: (hours as Record<number, number>)[parseInt(maxHour)] || 0 }
          return acc
        }, {} as Record<string, { hour: string; covers: number }>)
      })
      // Estimate covers-per-staff-hour from historical alignment; default to 20 if unknown
      const estimateStaffNeeded = (dateStr: string, hour: number, covers: number) => {
        const dow = parseISO(dateStr).getDay()
        const avgCovers = dowHourAvgCovers[dow]?.[hour]
        const avgStaff = dowHourAvgStaff[dow]?.[hour]
        const cpsh = avgCovers && avgStaff ? Math.max(1, avgCovers) / Math.max(1, avgStaff) : 20
        return Math.max(0.25, covers / cpsh)
      }
      bookingsCurrentWeek.forEach((b) => {
        const startH = Number((b.startTime || b.arrivalTime || "00:00").split(":")[0]) || 0
        const endH = Number((b.endTime || b.until || b.startTime || "00:00").split(":")[0]) || startH + Math.round(((b.duration || 120) / 60))
        const covers = b.guests || b.covers || 2
        for (let h = startH; h <= endH; h++) {
          const key = `${b.date}#${String(h).padStart(2, "0")}`
          const needed = estimateStaffNeeded(b.date, h, covers)
          demandByDayHour[key] = (demandByDayHour[key] || 0) + needed
        }
      })

      // Role/Department distribution across ALL past schedules by day-of-week and hour
      const roleDeptWeightByDOWHour: Record<number, Record<number, Record<string, number>>> = {}
      allSchedules.forEach((s) => {
        const dow = parseISO(s.date).getDay() // 0=Sun..6=Sat
        const startH = Number(s.startTime.split(":")[0]) || 0
        const endH = Number(s.endTime.split(":")[0]) || startH + 8
        const emp = hrState.employees.find((e) => getEmployeeId(e) === s.employeeId)
        const dept = emp?.department || s.department || ""
        const roleId = emp?.roleId || "none"
        const bucket = `${dept}::${roleId}`
        if (!roleDeptWeightByDOWHour[dow]) roleDeptWeightByDOWHour[dow] = {}
        for (let h = startH; h <= endH; h++) {
          if (!roleDeptWeightByDOWHour[dow][h]) roleDeptWeightByDOWHour[dow][h] = {}
          roleDeptWeightByDOWHour[dow][h][bucket] = (roleDeptWeightByDOWHour[dow][h][bucket] || 0) + 1
        }
      })

      // Translate demand into per-bucket needs using last week's distribution
      const needByBucket: Record<string, Record<string, number>> = {}
      Object.entries(demandByDayHour).forEach(([key, demand]) => {
        const [dateStr, hourStr] = key.split('#')
        const dow = parseISO(dateStr).getDay()
        const hour = Number(hourStr)
        const weights = roleDeptWeightByDOWHour[dow]?.[hour]
        if (!weights) return
        const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
        Object.entries(weights).forEach(([bucket, w]) => {
          if (!needByBucket[key]) needByBucket[key] = {}
          needByBucket[key][bucket] = (needByBucket[key][bucket] || 0) + (demand * (w / total))
        })
      })
      const assignedByBucket: Record<string, Record<string, number>> = {}


      // Fallback: generate suggestions for all active employees who don't have historical patterns
      let candidateSuggestions: typeof aiSuggestions = [...baseSuggestions]
      
      // Consider ALL active employees, not just those without patterns
      const employeesWithPatterns = new Set(baseSuggestions.map(s => s.employeeId))
      // Use the comprehensive employee list instead of just current employees
      const activeEmployees = Array.from(employeeMap.values()).filter((emp) => {
        // Exclude employees with doNotIncludeOnRota set to true
        if (emp.doNotIncludeOnRota === true) {
          return false
        }
        // More inclusive filtering - include employees that are not explicitly inactive
        const isActive = emp.status !== "inactive" && emp.status !== "terminated" && emp.status !== "suspended"
        console.log(`🔍 Employee ${emp.firstName} ${emp.lastName}: status="${emp.status}", isActive=${(emp as any).isActive}, result=${isActive}`)
        return isActive
      })
      // Use ALL active employees instead of just those without patterns
      const employeesToSchedule = activeEmployees
      
      console.log("🔍 AI Scheduling - Employee pattern matching debug:", {
        baseSuggestionsEmployeeIds: Array.from(employeesWithPatterns),
        activeEmployeeIds: activeEmployees.map(e => getEmployeeId(e)),
        employeesToScheduleIds: employeesToSchedule.map(e => getEmployeeId(e)),
        allEmployeeIds: hrState.employees.map(e => getEmployeeId(e)),
        totalEmployeesInHRState: hrState.employees.length,
        employeeIdMatching: activeEmployees.map(emp => ({
          name: `${emp.firstName} ${emp.lastName}`,
          id: emp.id,
          employeeID: emp.employeeID,
          generatedId: getEmployeeId(emp),
          hasPattern: employeesWithPatterns.has(getEmployeeId(emp)),
          status: emp.status,
          isActive: (emp as any).isActive
        })),
        allEmployeesDebug: hrState.employees.map(emp => ({
          name: `${emp.firstName} ${emp.lastName}`,
          id: emp.id,
          employeeID: emp.employeeID,
          status: emp.status,
          isActive: (emp as any).isActive
        }))
      })
      
      console.log("AI Scheduling - Employee pattern analysis:", {
        totalEmployees: hrState.employees.length,
        totalActiveEmployees: activeEmployees.length,
        employeesWithHistoricalPatterns: employeesWithPatterns.size,
        employeesToSchedule: employeesToSchedule.length,
        employeesToScheduleList: employeesToSchedule.map(e => `${e.firstName} ${e.lastName} (ID: ${e.id}, employeeID: ${e.employeeID}, status: ${e.status}, isActive: ${(e as any).isActive})`),
        employeesWithPatternsList: Array.from(employeesWithPatterns).map(id => {
          const emp = hrState.employees.find(e => e.id === id)
          return emp ? `${emp.firstName} ${emp.lastName} (ID: ${id})` : `Unknown (ID: ${id})`
        }),
        baseSuggestionsCount: baseSuggestions.length,
        allEmployeesList: hrState.employees.map(e => `${e.firstName} ${e.lastName} (ID: ${e.id}, employeeID: ${e.employeeID}, status: ${e.status}, isActive: ${(e as any).isActive})`)
      })
      
      // DEBUG: Check HR context state
      console.log("🔍 AI Scheduling - HR Context State Debug:", {
        hrStateEmployeesCount: hrState.employees?.length || 0,
        hrStateIsLoading: hrState.isLoading,
        hrStateInitialized: hrState.initialized,
        hrStateError: hrState.error,
        employeesPreview: hrState.employees?.slice(0, 5).map(e => ({
          id: e.id,
          employeeID: e.employeeID,
          name: `${e.firstName} ${e.lastName}`,
          status: e.status,
          isActive: (e as any).isActive
        })) || []
      })
      
      // Generate suggestions for ALL active employees
      if (employeesToSchedule.length > 0) {
        console.log("AI Scheduling - Starting schedule generation for ALL active employees")
        
        const candidateWeekDates = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) })
        const coverageByDay: Record<string, number> = {}
        candidateWeekDates.forEach((d) => {
          const key = format(d, "yyyy-MM-dd")
          coverageByDay[key] = allSchedules.filter((s) => s.date === key).length
        })

        const existingByEmpDay: Record<string, Set<string>> = {}
        allSchedules.forEach((s) => {
          if (!existingByEmpDay[s.employeeId]) existingByEmpDay[s.employeeId] = new Set<string>()
          existingByEmpDay[s.employeeId].add(s.date)
        })

        // Get time off data from HR context
        const timeOffs = (hrState as any).timeOffs as { employeeId: string; startDate: number; endDate: number; status: string }[] | undefined
        
        console.log("AI Scheduling - Fallback setup:", {
          candidateWeekDates: candidateWeekDates.map(d => format(d, "yyyy-MM-dd")),
          coverageByDay,
          existingByEmpDay: Object.keys(existingByEmpDay).length,
          timeOffsAvailable: !!timeOffs,
          timeOffsCount: timeOffs?.length || 0
        })
        
        // Analyze roles and departments for better shift distribution
        const departmentDistribution: Record<string, number> = {}
        const roleDistribution: Record<string, number> = {}
        
        hrState.employees.forEach(emp => {
          if (emp.department) {
            departmentDistribution[emp.department] = (departmentDistribution[emp.department] || 0) + 1
          }
          if (emp.roleId) {
            roleDistribution[emp.roleId] = (roleDistribution[emp.roleId] || 0) + 1
          }
        })
        
        // Calculate actual staffing needs based on bookings and historical patterns
        const avgHistoricalStaffPerDay = Object.values(historicalPatterns.dayOfWeekPatterns)
          .reduce((sum, pattern) => sum + pattern.averageStaff, 0) / 7
        
        // Use bookings to determine actual demand
        const avgBookingsPerDay = bookingsData ? bookingsData.length / 7 : 0
        const staffPerBooking = 0.3 // Rough estimate: 1 staff per 3 bookings
        
        // Calculate realistic staffing needs - allow more employees to be scheduled
        const minStaffPerDay = Math.max(3, Math.min(Math.ceil(activeEmployees.length * 0.7), Math.round(avgHistoricalStaffPerDay || avgBookingsPerDay * staffPerBooking || Math.ceil(activeEmployees.length * 0.5))))
        
        console.log("AI Scheduling - Staffing calculation:", {
          avgHistoricalStaffPerDay: avgHistoricalStaffPerDay.toFixed(2),
          avgBookingsPerDay: avgBookingsPerDay.toFixed(2),
          calculatedMinStaffPerDay: minStaffPerDay,
          totalBookings: bookingsData?.length || 0
        })
        
        // Consider ALL active employees, not just a subset
        const fallbackEmployees = activeEmployees // Use all active employees
        
        console.log("AI Scheduling - All employees for first pass:", {
          fallbackEmployeesCount: activeEmployees.length,
          fallbackEmployeeNames: activeEmployees.map(e => `${e.firstName} ${e.lastName} (ID: ${e.id})`),
          fallbackEmployeeAvailability: activeEmployees.map(e => ({
            name: `${e.firstName} ${e.lastName}`,
            availabilityDays: e.availabilityDays,
            availabilityHours: e.availabilityHours
          }))
        })
        
        console.log("AI Scheduling - Employee constraints:", {
          totalEmployees: hrState.employees.length,
          activeEmployees: activeEmployees.length,
          employeesWithPatterns: employeesWithPatterns.size,
          employeesToSchedule: employeesToSchedule.length,
          fallbackEmployees: activeEmployees.length,
          timeOffRequests: timeOffs?.length || 0,
          bookingsData: bookingsData?.length || 0,
          departments: Object.keys(departmentDistribution).length,
          roles: Object.keys(roleDistribution).length
        })
        const fallback: typeof aiSuggestions = []
        const lastEndByEmp: Record<string, Date | null> = {}
        
        console.log("AI Scheduling - Business hours analysis:", {
          businessHoursProvided: !!businessHours,
          fallbackEmployees: activeEmployees.length,
          minStaffPerDay
        })
        
        // Sort days by current coverage (least covered first)
        const sortedDaysByCoverage = candidateWeekDates
          .map((d) => ({ d, k: format(d, "yyyy-MM-dd"), coverage: coverageByDay[format(d, "yyyy-MM-dd")] || 0 }))
          .sort((a, b) => a.coverage - b.coverage)

        // Ensure each day has minimum coverage
        console.log("First pass - ensuring minimum coverage:", {
          sortedDaysByCoverage: sortedDaysByCoverage.map(d => ({ day: d.k, coverage: d.coverage })),
          minStaffPerDay
        })
        
        for (const { d, k, coverage } of sortedDaysByCoverage) {
          if (coverage >= minStaffPerDay) continue
          
          // Check if business is open on this day
          const businessHoursForDay = getBusinessHoursForDay(d.getDay())
          if (businessHoursForDay.closed) {
            console.log(`Day ${k}: Business is closed, skipping`)
            continue
          }
          
          const availableEmployees = fallbackEmployees.filter((emp) => {
            const availDays = parseAvailabilityDays(emp.availabilityDays)
            // If no availability data is set, assume employee is available all days (fallback)
            const isAvailable = availDays.length > 0 ? availDays.includes(d.getDay()) : true
            const notScheduled = !existingByEmpDay[getEmployeeId(emp)]?.has(k)
            const notOnTimeOff = !timeOffs?.some((to) => to.employeeId === (getEmployeeId(emp)) && to.status === "approved" && d.getTime() >= to.startDate && d.getTime() <= to.endDate)
            
            console.log(`Employee ${emp.firstName} ${emp.lastName} (${d.getDay()}):`, {
              availabilityDays: emp.availabilityDays,
              parsedAvailDays: availDays,
              isAvailable,
              notScheduled,
              notOnTimeOff,
              finalResult: isAvailable && notScheduled && notOnTimeOff
            })
            
            return isAvailable && notScheduled && notOnTimeOff
          })

          const needed = Math.max(minStaffPerDay - coverage, Math.min(availableEmployees.length, Math.max(3, Math.ceil(availableEmployees.length * 0.6)))) // Schedule more employees per day
          console.log(`Day ${k}: coverage=${coverage}, needed=${needed}, available=${availableEmployees.length}, businessHours=${businessHoursForDay.open}-${businessHoursForDay.close}`)

          // Assign employees to this day
          for (let i = 0; i < Math.min(needed, availableEmployees.length); i++) {
            const emp = availableEmployees[i]
            const availHours = parseAvailabilityHours(emp.availabilityHours) || { start: 9, end: 17 }
            
            // Use business hours as constraints for shift times
            const businessOpenHour = parseInt(businessHoursForDay.open.split(':')[0])
            const businessCloseHour = parseInt(businessHoursForDay.close.split(':')[0])
            
            // Calculate shift times based on business hours and employee availability
            const shiftStartHour = Math.max(businessOpenHour, Math.floor(availHours.start))
            const shiftEndHour = Math.min(businessCloseHour, Math.ceil(availHours.end))
            
            console.log(`Employee ${emp.firstName} ${emp.lastName}: businessHours=${businessOpenHour}-${businessCloseHour}, availHours=${availHours.start}-${availHours.end}, shiftStart=${shiftStartHour}, shiftEnd=${shiftEndHour}`)
            
            // Use the calculated shift times
            const startHour = shiftStartHour
            const endHour = shiftEndHour
            
            const empRole = emp.roleId ? (roles.find((r) => r.id === emp.roleId)?.label || roles.find((r) => r.id === emp.roleId)?.name) : ""
            
            const newShift = {
              employeeId: getEmployeeId(emp),
              employeeName: `${emp.firstName} ${emp.lastName}`,
              date: k,
              startTime: `${String(startHour).padStart(2, "0")}:00`,
              endTime: `${String(endHour).padStart(2, "0")}:00`,
              department: emp.department || "",
              role: empRole || "",
              notes: "AI generated - minimum coverage",
              shiftType: "regular" as const,
              payType: "hourly" as const,
              payRate: emp.hourlyRate || 0,
            }
            
            console.log(`Adding shift for ${emp.firstName} on ${k}:`, newShift)
            fallback.push(newShift)
            
            // Mark as scheduled to avoid double booking
            if (!existingByEmpDay[getEmployeeId(emp)]) existingByEmpDay[getEmployeeId(emp)] = new Set<string>()
            existingByEmpDay[getEmployeeId(emp)].add(k)
            coverageByDay[k] = (coverageByDay[k] || 0) + 1
          }
        }
        
        console.log("AI Scheduling - After first pass:", {
          fallbackShiftsAdded: fallback.length,
          fallbackShifts: fallback.map(s => `${s.employeeName} on ${s.date} (${s.startTime}-${s.endTime})`)
        })

        // Second pass: Fill remaining hours for fallback employees
        fallbackEmployees.forEach((emp) => {
          const minH = emp.minHoursPerWeek ?? 0
          const baseH = emp.hoursPerWeek ?? (emp.isFullTime ? 40 : 20)
          const maxH = emp.maxHoursPerWeek ?? Infinity
          let targetHours = Math.max(minH, baseH)
          if (isFinite(maxH)) targetHours = Math.min(targetHours, maxH)
          
          console.log(`Employee ${emp.firstName} ${emp.lastName} target hours:`, {
            minH,
            baseH,
            maxH,
            targetHours,
            isFullTime: emp.isFullTime,
            hoursPerWeek: emp.hoursPerWeek
          })

          // Subtract already scheduled hours this week (including fallback from first pass)
          const empWeekSchedules = allSchedules.filter((s) => s.employeeId === (getEmployeeId(emp)) && candidateWeekDates.some((d) => format(d, "yyyy-MM-dd") === s.date))
          const empFallbackSchedules = fallback.filter((s) => s.employeeId === (getEmployeeId(emp)))
          const allEmpSchedules = [...empWeekSchedules, ...empFallbackSchedules]
          
          const alreadyHrs = allEmpSchedules.reduce((sum, s) => {
            const [sh, sm] = s.startTime.split(":").map(Number)
            const [eh, em] = s.endTime.split(":").map(Number)
            let hrs = eh - sh
            if (em < sm) hrs -= 1
            hrs += (em - sm) / 60
            return sum + (isNaN(hrs) ? 0 : hrs)
          }, 0)
          let remaining = Math.max(0, targetHours - alreadyHrs)
          
          console.log(`Employee ${emp.firstName} ${emp.lastName} hours calculation:`, {
            targetHours,
            alreadyHrs,
            remaining,
            willSchedule: remaining > 0.25
          })
          
          if (remaining <= 0.25) return

          const availDays = parseAvailabilityDays(emp.availabilityDays)
          const availHours = parseAvailabilityHours(emp.availabilityHours) || { start: 9, end: 17 }
          const sortedDays = candidateWeekDates
            .map((d) => ({ d, k: format(d, "yyyy-MM-dd") }))
            .filter(({ d }) => availDays.length > 0 ? availDays.includes(d.getDay()) : true) // Fallback: available all days if no availability set
            .sort((a, b) => coverageByDay[a.k] - coverageByDay[b.k])

          const empRole = emp.roleId ? (roles.find((r) => r.id === emp.roleId)?.label || roles.find((r) => r.id === emp.roleId)?.name) : ""
          lastEndByEmp[getEmployeeId(emp)] = null

          for (const { d, k } of sortedDays) {
            if (remaining <= 0.25) break
            // Skip if employee already scheduled on that day
            if (existingByEmpDay[getEmployeeId(emp)]?.has(k)) continue
            // Skip if approved time off
            if (timeOffs && timeOffs.some((to) => to.employeeId === (getEmployeeId(emp)) && to.status === "approved" && d.getTime() >= to.startDate && d.getTime() <= to.endDate)) continue

            // Pick hour window guided by demand and availability
            let bestStart = Math.floor(availHours.start)
            let bestScore = -Infinity
            for (let h = Math.floor(availHours.start); h <= Math.floor(Math.max(availHours.end - 4, availHours.start)); h++) {
              let score = 0
              const bucketKey = `${emp.department || ""}::${emp.roleId || "none"}`
              for (let x = 0; x < 4; x++) {
                const key = `${k}#${String(h + x).padStart(2, "0")}`
                const bucketNeed = needByBucket[key]?.[bucketKey]
                if (bucketNeed !== undefined) {
                  const already = assignedByBucket[key]?.[bucketKey] || 0
                  score += Math.max(0, bucketNeed - already)
                } else {
                  // No historical distribution -> fall back to general demand
                  score += (demandByDayHour[key] || 0)
                }
              }
              if (score > bestScore) { bestScore = score; bestStart = h }
            }
            const startHour = bestStart
            const proposed = Math.max(4, Math.min(8, Math.round(remaining)))
            const endHour = Math.min(Math.floor(availHours.end), startHour + proposed)

            const sStart = parseISO(`${k}T${String(startHour).padStart(2, "0")}:00`)
            const sEnd = parseISO(`${k}T${String(endHour).padStart(2, "0")}:00`)
            const prevEnd = lastEndByEmp[getEmployeeId(emp)]
            const allow8h = Boolean(emp?.has8HourRestPermission || emp?.clockInSettings?.requiresPermissionFor8HrGap)
            const gapHrs = prevEnd ? (differenceInMinutes(sStart, prevEnd) / 60) : Infinity
            if (!(gapHrs >= 11 || (allow8h && gapHrs >= 8))) continue

            fallback.push({
              employeeId: getEmployeeId(emp),
              employeeName: `${emp.firstName} ${emp.lastName}`,
              date: k,
              startTime: `${String(startHour).padStart(2, "0")}:00`,
              endTime: `${String(endHour).padStart(2, "0")}:00`,
              department: emp.department || "",
              role: empRole || "",
              notes: "AI generated - additional hours",
              shiftType: "regular" as const,
              payType: emp.payType === "salary" ? "hourly" : "hourly",
              payRate: emp.hourlyRate,
            })
              // Track assigned counts against bucket and each hour in the shift
              const bucketKey = `${emp.department || ""}::${emp.roleId || "none"}`
              for (let hh = startHour; hh <= endHour; hh++) {
                const aKey = `${k}#${String(hh).padStart(2, "0")}`
                if (!assignedByBucket[aKey]) assignedByBucket[aKey] = {}
                assignedByBucket[aKey][bucketKey] = (assignedByBucket[aKey][bucketKey] || 0) + 1
              }
              lastEndByEmp[getEmployeeId(emp)] = sEnd
              remaining -= (endHour - startHour)
              coverageByDay[k] = (coverageByDay[k] || 0) + 1
            }
          })

        console.log("Fallback generation debug:", {
          fallbackLength: fallback.length,
          weekDates: candidateWeekDates.length,
          fallbackEmployees: activeEmployees.length,
          coverageByDay
        })
        
        // If no shifts were generated, create a simple fallback
        if (fallback.length === 0 && fallbackEmployees.length > 0) {
          console.log("No shifts generated, creating simple fallback")
          const firstEmployee = fallbackEmployees[0]
          const firstDay = candidateWeekDates[0]
          const dayKey = format(firstDay, "yyyy-MM-dd")
          
          fallback.push({
            employeeId: firstEmployee.id,
            employeeName: `${firstEmployee.firstName} ${firstEmployee.lastName}`,
            date: dayKey,
            startTime: "09:00",
            endTime: "17:00",
            department: firstEmployee.department || "General",
            role: firstEmployee.roleId ? (roles.find((r) => r.id === firstEmployee.roleId)?.label || roles.find((r) => r.id === firstEmployee.roleId)?.name) : "",
            notes: "AI generated - simple fallback",
            shiftType: "regular",
            payType: "hourly",
            payRate: firstEmployee.hourlyRate || 0,
          })
        }
        
        candidateSuggestions = [...candidateSuggestions, ...fallback]
        
        // Limited safety check: Only add emergency shifts if we have very few total suggestions
        // This prevents over-generation while ensuring basic coverage
        const totalSuggestions = candidateSuggestions.length
        const minSuggestionsForWeek = Math.max(activeEmployees.length * 2, minStaffPerDay * 5) // Ensure most employees get at least 2 shifts per week
        
        console.log("AI Scheduling - Checking if emergency fallback needed:", {
          totalSuggestions,
          minSuggestionsForWeek,
          needsEmergencyFallback: totalSuggestions < minSuggestionsForWeek
        })
        
        if (totalSuggestions < minSuggestionsForWeek) {
          const employeesWithSuggestions = new Set(candidateSuggestions.map(s => s.employeeId))
          const employeesStillWithoutSuggestions = activeEmployees
            .filter((emp: any) => !employeesWithSuggestions.has(getEmployeeId(emp)))
            // Consider all remaining employees, not just 3
          
          console.log("AI Scheduling - Adding emergency shifts for all remaining employees (low coverage detected):", {
            totalSuggestions,
            minSuggestionsForWeek,
            totalActiveEmployees: activeEmployees.length,
            employeesWithSuggestions: employeesWithSuggestions.size,
            employeesStillWithoutSuggestions: employeesStillWithoutSuggestions.length,
            employeesStillWithoutSuggestionsNames: employeesStillWithoutSuggestions.map(e => `${e.firstName} ${e.lastName} (ID: ${e.id})`)
          })
          
          // Add multiple shifts for each selected employee to ensure better coverage
          employeesStillWithoutSuggestions.forEach((emp, index) => {
            const availableDays = candidateWeekDates.filter(d => {
              const dayOfWeek = d.getDay()
              return dayOfWeek >= 1 && dayOfWeek <= 5 // Monday to Friday
            })
            
            console.log(`Emergency shift for ${emp.firstName} ${emp.lastName}:`, {
              availableDays: availableDays.map(d => format(d, "yyyy-MM-dd")),
              selectedDay: availableDays[index % availableDays.length] ? format(availableDays[index % availableDays.length], "yyyy-MM-dd") : "none"
            })
            
            // Add multiple shifts for this employee (up to 3 days)
            const shiftsToAdd = Math.min(3, availableDays.length)
            for (let shiftIndex = 0; shiftIndex < shiftsToAdd; shiftIndex++) {
              const day = availableDays[(index + shiftIndex) % availableDays.length]
              const dateStr = format(day, "yyyy-MM-dd")
              
              const alreadyScheduled = candidateSuggestions.some(s => s.employeeId === (getEmployeeId(emp)) && s.date === dateStr)
              
              if (!alreadyScheduled) {
                const businessHoursForDay = getBusinessHoursForDay(day.getDay())
                if (!businessHoursForDay.closed) {
                  const startHour = parseInt(businessHoursForDay.open.split(':')[0])
                  const endHour = Math.min(startHour + 4, parseInt(businessHoursForDay.close.split(':')[0])) // Max 4 hour shift
                  
                  const emergencyShift = {
                    employeeId: getEmployeeId(emp),
                    employeeName: `${emp.firstName} ${emp.lastName}`,
                    date: dateStr,
                    startTime: `${String(startHour).padStart(2, "0")}:00`,
                    endTime: `${String(endHour).padStart(2, "0")}:00`,
                    department: emp.department || "",
                    role: emp.roleId ? (roles.find((r) => r.id === emp.roleId)?.label || roles.find((r) => r.id === emp.roleId)?.name) : "",
                    notes: "AI generated - limited emergency coverage",
                    shiftType: "regular" as const,
                    payType: "hourly" as const,
                    payRate: emp.hourlyRate || 0,
                  }
                  
                  console.log(`Adding limited emergency shift for ${emp.firstName} ${emp.lastName} on ${dateStr}:`, emergencyShift)
                  candidateSuggestions.push(emergencyShift)
                }
              }
            }
          })
        } else {
          console.log("AI Scheduling - Skipping emergency fallback (sufficient coverage):", {
            totalSuggestions,
            minSuggestionsForWeek
          })
        }
        
        console.log("AI Scheduling - Final candidate suggestions after fallback:", {
          totalSuggestions: candidateSuggestions.length,
          uniqueEmployees: new Set(candidateSuggestions.map(s => s.employeeId)).size,
          totalActiveEmployees: activeEmployees.length,
          suggestionBreakdown: candidateSuggestions.reduce((acc, s) => {
            acc[s.employeeName] = (acc[s.employeeName] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        })
      }

      // Filter out suggestions that conflict with approved time off
      const timeOffs = (hrState as any).timeOffs as { employeeId: string; startDate: number; endDate: number; status: string }[] | undefined
      const withoutTimeOff = candidateSuggestions.filter((s) => {
        if (!timeOffs || timeOffs.length === 0) return true
        const d = parseISO(s.date).getTime()
        const offs = timeOffs.filter((t) => t.employeeId === s.employeeId && t.status === "approved")
        return !offs.some((t) => d >= t.startDate && d <= t.endDate)
      })

      // Enforce rest gap rules (>=11h unless permission for 8h)
      const byEmployee: Record<string, typeof withoutTimeOff> = {}
      withoutTimeOff.forEach((s) => {
        if (!byEmployee[s.employeeId]) byEmployee[s.employeeId] = []
        byEmployee[s.employeeId].push(s)
      })
      Object.values(byEmployee).forEach((list) => {
        list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      })

      const restCompliant: typeof aiSuggestions = []
      Object.entries(byEmployee).forEach(([empId, list]) => {
        const emp = hrState.employees.find((e) => e.id === empId)
        const allow8h = Boolean(emp?.has8HourRestPermission || emp?.clockInSettings?.requiresPermissionFor8HrGap)
        let prevEnd: Date | null = null
        list.forEach((s) => {
          const sStart = parseISO(`${s.date}T${s.startTime}`)
          const sEnd = parseISO(`${s.date}T${s.endTime}`)
          const gapHrs = prevEnd ? (differenceInMinutes(sStart, prevEnd) / 60) : Infinity
          if (gapHrs >= 11 || (allow8h && gapHrs >= 8)) {
            restCompliant.push(s)
            prevEnd = sEnd
          } else {
            // skip this shift due to insufficient rest gap
          }
        })
      })

      // Balance min/max weekly hours per employee
      const calcHours = (s: { startTime: string; endTime: string }) => {
        const [sh, sm] = s.startTime.split(":").map(Number)
        const [eh, em] = s.endTime.split(":").map(Number)
        let hrs = eh - sh
        if (em < sm) hrs -= 1
        hrs += (em - sm) / 60
        return isNaN(hrs) ? 0 : hrs
      }

      const byEmpForBalance: Record<string, typeof restCompliant> = {}
      restCompliant.forEach((s) => {
        if (!byEmpForBalance[s.employeeId]) byEmpForBalance[s.employeeId] = []
        byEmpForBalance[s.employeeId].push(s)
      })

      // Trim to maxHours
      Object.entries(byEmpForBalance).forEach(([empId, list]) => {
        const emp = hrState.employees.find((e) => e.id === empId)
        if (!emp) return
        const maxH = emp.maxHoursPerWeek ?? Infinity
        list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        let total = list.reduce((sum, s) => sum + calcHours(s), 0)
        while (isFinite(maxH) && total > maxH && list.length > 0) {
          const removed = list.pop()!
          total -= calcHours(removed)
        }
      })

      // Flatten back
      let balanced: typeof aiSuggestions = ([] as typeof aiSuggestions).concat(...Object.values(byEmpForBalance))

      // Add shifts for employees under minHours
      const balanceWeekDates = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) })
      const coverageByDay: Record<string, number> = {}
      balanceWeekDates.forEach((d) => {
        const key = format(d, "yyyy-MM-dd")
        coverageByDay[key] = balanced.filter((s) => s.date === key).length
      })

      hrState.employees.forEach((emp) => {
        if (emp.status !== "active" && (emp as any).isActive !== true) return
        const empShifts = allSchedules.filter((s) => s.employeeId === (getEmployeeId(emp)) && balanceWeekDates.some((d) => format(d, "yyyy-MM-dd") === s.date))
        const currentHours = empShifts.reduce((sum, s) => sum + calcHours(s), 0)
        const minH = emp.minHoursPerWeek ?? 0
        console.log(`AI Scheduling - Employee ${emp.firstName} ${emp.lastName}:`, {
          minHoursPerWeek: minH,
          currentHours,
          empShifts: empShifts.length,
          weekDates: balanceWeekDates.map(d => format(d, "yyyy-MM-dd")),
          coverageByDay
        })
        
        if (minH > 0 && currentHours + 0.25 < minH) {
          // Propose one additional shift towards min hours
          const desiredDaily = Math.max(4, Math.min(8, Math.round(((emp.hoursPerWeek ?? 40) / 5))))
          // Pick a day with lowest coverage where employee has no shift and no approved time off
          const candidateDay = balanceWeekDates
            .map((d: Date) => ({ d, k: format(d, "yyyy-MM-dd") }))
            .filter(({ k }: { k: string }) => !empShifts.some((s) => s.date === k))
            .filter(({ d }: { d: Date }) => {
              if (!timeOffs || timeOffs.length === 0) return true
              const t = d.getTime()
              const offs = timeOffs.filter((to) => to.employeeId === (getEmployeeId(emp)) && to.status === "approved")
              return !offs.some((to) => t >= to.startDate && t <= to.endDate)
            })
            .sort((a: { k: string }, b: { k: string }) => (coverageByDay[a.k] - coverageByDay[b.k]))[0]

          if (candidateDay) {
            const startHour = 12
            const endHour = Math.min(23, startHour + desiredDaily)
            const k = candidateDay.k
            balanced.push({
              employeeId: getEmployeeId(emp),
              employeeName: `${emp.firstName} ${emp.lastName}`,
              date: k,
              startTime: `${String(startHour).padStart(2, "0")}:00`,
              endTime: `${String(endHour).padStart(2, "0")}:00`,
              department: emp.department || "",
              role: emp.roleId ? (roles.find((r) => r.id === emp.roleId)?.label || roles.find((r) => r.id === emp.roleId)?.name) : "",
              notes: "AI generated to meet min hours",
              shiftType: "regular" as const,
              payType: emp.payType === "salary" ? "hourly" : "hourly",
              payRate: emp.hourlyRate,
            })
          }
        }
      })

      // Finalize suggestions
      console.log("AI Generation Debug:", {
        baseSuggestions: baseSuggestions.length,
        candidateSuggestions: candidateSuggestions.length,
        balanced: balanced.length,
        employees: hrState.employees.length,
        activeEmployees: activeEmployees.length,
        schedules: schedules.length,
        bookingsData: bookingsData?.length || 0,
        businessHoursProvided: !!businessHours,
        timeOffRequests: timeOffs?.length || 0
      })
      
      console.log("🚀 FINAL AI SCHEDULE GENERATION:", {
        totalSuggestions: balanced.length,
        suggestionsPreview: balanced.slice(0, 5).map(s => ({
          employeeId: s.employeeId,
          employee: s.employeeName,
          date: s.date,
          time: `${s.startTime}-${s.endTime}`,
          department: s.department
        })),
        allSuggestions: balanced.map(s => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        })),
        uniqueEmployees: new Set(balanced.map(s => s.employeeId)).size,
        totalActiveEmployees: hrState.employees.filter(e => e.status === "active" || (e as any).isActive === true).length,
        employeeCoveragePercentage: ((new Set(balanced.map(s => s.employeeId)).size / hrState.employees.filter(e => e.status === "active" || (e as any).isActive === true).length) * 100).toFixed(1) + "%",
        dateRange: {
          start: Math.min(...balanced.map(s => new Date(s.date).getTime())),
          end: Math.max(...balanced.map(s => new Date(s.date).getTime()))
        }
      })
      
      setAiSuggestions(balanced)
      if (balanced.length > 0) {
        setNotification({ message: `AI generated ${balanced.length} shift suggestions for this week.`, type: "info" })
      } else {
        setNotification({ message: "AI could not generate suggestions (no data/constraints). Try adding last week's shifts or employee hour settings.", type: "warning" })
      }
    } catch (err: any) {
      console.error("AI rota generation failed:", err)
      setNotification({ message: err?.message || "Failed to generate rota with AI", type: "error" })
    }
  }, [currentWeekStart, hrState.schedules, hrState.employees, roles])

  const handleNotificationClose = useCallback(() => {
    setNotification(null)
  }, [])

  // Memoized callback for schedule updates
  const handleSchedulesUpdated = useCallback(() => {
    refreshSchedules().catch((error) => {
      console.error("❌ ScheduleManager - refreshSchedules failed:", error)
    })
  }, [refreshSchedules])


  const handleCellClick = useCallback(
    (employeeId: string, date: Date, schedule?: Schedule) => {
      if (schedule) {
        // If clicking on an existing shift, open edit modal
        handleOpenScheduleCRUD(schedule, 'edit')
      } else {
        // If clicking on empty cell, open create modal with pre-populated employee and date
        const employee = hrState.employees.find((emp) => emp.id === employeeId)
        if (employee) {
          // Create a temporary schedule object with employee and date pre-filled
          // Use Date object for the form, it will be formatted on save
          const tempSchedule: Partial<ScheduleFormData> = {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            date: date, // Pass Date object, form will handle it
            department: employee.department || '',
            role: (() => {
              const roleId = employee.roleId || (employee as any).roleID
              const role = roleId ? (hrState.roles?.find(r => r.id === roleId)) : undefined
              return role ? (role.label || role.name) : ''
            })(),
            status: 'draft',
            shiftType: 'regular',
            payType: (employee.payType === 'hourly' ? 'hourly' : 'hourly') as 'hourly' | 'flat', // Employee payType can be 'salary', but Schedule only supports 'hourly' or 'flat'
            payRate: employee.hourlyRate || 0,
          }
          handleOpenScheduleCRUD(tempSchedule as any, 'create')
        }
      }
    },
    [hrState.employees, hrState.roles, handleOpenScheduleCRUD],
  )


  // Approval workflow functions
  const handleApproveRota = useCallback(async () => {
    if (approvingRota) return
    try {
      setApprovingRota(true)
      // Approve shifts: change from 'draft' to 'scheduled'
      const startDateStr = format(dynamicDateRange.startDate, 'yyyy-MM-dd')
      const endDateStr = format(dynamicDateRange.endDate, 'yyyy-MM-dd')
      const draftShifts = hrState.schedules.filter(s =>
        s.status === 'draft' && s.date >= startDateStr && s.date <= endDateStr
      )
      console.log('🔄 Approving rota - draft shifts:', draftShifts.map(s => ({ id: s.id, status: s.status })))
      
      const promises = draftShifts.map(async (schedule) => {
        console.log(`📝 Updating schedule ${schedule.id} from ${schedule.status} to scheduled`)
        const result = await updateSchedule(schedule.id, {
          status: 'scheduled',
          approvedBy: currentUserId,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        console.log(`✅ Updated schedule ${schedule.id}:`, result)
        return result
      })
      
      await Promise.all(promises)
      
      // Force refresh schedules to see changes
      await refreshSchedules()
      console.log('🔄 Refreshed schedules after rota approval')
      
      setNotification({ 
        message: `Approved ${draftShifts.length} shifts`, 
        type: "success" 
      })
      setShowApprovalDialog(false)
    } catch (error) {
      console.error('❌ Error approving rota:', error)
      setNotification({ 
        message: "Error approving rota", 
        type: "error" 
      })
    } finally {
      setApprovingRota(false)
    }
  }, [approvingRota, dynamicDateRange.endDate, dynamicDateRange.startDate, hrState.schedules, refreshSchedules, updateSchedule])

  const handleConfirmShifts = useCallback(async () => {
    if (confirmingShifts) return
    try {
      setConfirmingShifts(true)
      // Confirm shifts: change from 'scheduled' to 'completed' for the selected date
      const dateSchedules = hrState.schedules.filter(s =>
        s.status === 'scheduled' && s.date === selectedDateForConfirmation
      )
      
      console.log('🔄 Confirming shifts - Found scheduled shifts:', dateSchedules.map(s => ({ id: s.id, date: s.date, status: s.status })))
      
      const promises = dateSchedules.map(async (schedule) => {
        console.log(`📝 Updating schedule ${schedule.id} from ${schedule.status} to completed`)
        const actualHours =
          confirmationData.actualHours && confirmationData.actualHours > 0
            ? confirmationData.actualHours
            : (confirmationData.clockInTime && confirmationData.clockOutTime)
              ? (differenceInMinutes(
                  parseISO(`2000-01-01T${confirmationData.clockOutTime}`),
                  parseISO(`2000-01-01T${confirmationData.clockInTime}`),
                ) / 60)
              : undefined

        const result = await updateSchedule(schedule.id, {
          status: 'completed',
          clockInTime: confirmationData.clockInTime || undefined,
          clockOutTime: confirmationData.clockOutTime || undefined,
          clockInLocation: confirmationData.clockInLocation || undefined,
          clockOutLocation: confirmationData.clockOutLocation || undefined,
          actualHours,
          confirmedBy: currentUserId,
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        console.log(`✅ Updated schedule ${schedule.id}:`, result)
        return result
      })
      
      await Promise.all(promises)
      
      // Force refresh schedules to see changes
      await refreshSchedules()
      console.log('🔄 Refreshed schedules after confirmation')
      setNotification({ 
        message: `Confirmed ${dateSchedules.length} shift(s)`, 
        type: "success" 
      })
      setShowConfirmationDialog(false)
    } catch (error) {
      console.error('Error confirming shifts:', error)
      setNotification({ 
        message: "Error confirming shifts", 
        type: "error" 
      })
    } finally {
      setConfirmingShifts(false)
    }
  }, [confirmationData.clockInLocation, confirmationData.clockInTime, confirmationData.clockOutLocation, confirmationData.clockOutTime, confirmationData.actualHours, confirmingShifts, hrState.schedules, refreshSchedules, selectedDateForConfirmation, updateSchedule])


  // Navigate to Finalize Shifts tab
  const handleNavigateToFinalize = () => {
    // Toggle finalize mode instead of opening modal
    setFinalizeMode(!finalizeMode)
    if (!finalizeMode) {
      // When entering finalize mode, expand all shifts that have clock in/out data
      const shiftsWithClockData = new Set<string>()
      schedules.forEach(schedule => {
        if (schedule.clockInTime || schedule.clockOutTime) {
          shiftsWithClockData.add(schedule.id)
        }
      })
      setExpandedShifts(shiftsWithClockData)
    } else {
      // When exiting finalize mode, clear selections
      setExpandedShifts(new Set())
      setSelectedFinalShift({})
      setEditingFinalShift({})
    }
  }
  
  // Toggle expand/collapse for a shift's clock in/out data
  const toggleShiftExpand = (shiftId: string) => {
    setExpandedShifts(prev => {
      const next = new Set(prev)
      if (next.has(shiftId)) {
        next.delete(shiftId)
      } else {
        next.add(shiftId)
      }
      return next
    })
  }
  
  // Select which shift to finalize (scheduled or clock in/out)
  const handleSelectFinalShift = (shiftId: string, type: 'scheduled' | 'clock' | 'edited') => {
    // If type is 'edited', treat it as 'scheduled' for the selection state
    const finalType = type === 'edited' ? 'scheduled' : type
    setSelectedFinalShift(prev => ({
      ...prev,
      [shiftId]: finalType
    }))
    // Clear editing if selecting a predefined option
    setEditingFinalShift(prev => {
      const next = { ...prev }
      delete next[shiftId]
      return next
    })
  }
  
  // Finalize the selected shift
  const handleFinalizeShift = async (schedule: Schedule) => {
    const shiftId = schedule.id
    const selectedType = selectedFinalShift[shiftId]
    const editedData = editingFinalShift[shiftId]
    
    try {
      setSchedulesLoading(true)
      
      let finalShiftData: Partial<Schedule> = {
        ...schedule,
        status: 'finalized',
        updatedAt: new Date().toISOString()
      }
      
      if (selectedType === 'clock') {
        // Use clock in/out times as the final shift
        if (schedule.clockInTime && schedule.clockOutTime) {
          // Helper function to extract time in HH:mm format
          const extractTime = (timeValue: string): string => {
            if (!timeValue) return ""
            // If it's an ISO string (contains 'T')
            if (timeValue.includes('T')) {
              try {
                return format(parseISO(timeValue), 'HH:mm')
              } catch {
                // Fallback: try to extract from ISO string manually
                const timePart = timeValue.split('T')[1]
                if (timePart) {
                  return timePart.substring(0, 5) // Get HH:mm
                }
              }
            }
            // If it's already in HH:mm or HH:mm:ss format
            if (timeValue.match(/^\d{2}:\d{2}/)) {
              return timeValue.substring(0, 5) // Return first 5 chars (HH:mm)
            }
            // Return as-is if it's a simple time string
            return timeValue
          }
          
          // Calculate actual hours from clock in/out
          let clockIn: Date
          let clockOut: Date
          
          try {
            if (schedule.clockInTime.includes('T')) {
              clockIn = parseISO(schedule.clockInTime)
            } else {
              // Handle time-only format - combine with schedule date
              const timeStr = schedule.clockInTime.length > 5 
                ? schedule.clockInTime.substring(0, 5) 
                : schedule.clockInTime
              clockIn = new Date(`${schedule.date}T${timeStr}:00`)
            }
            
            if (schedule.clockOutTime.includes('T')) {
              clockOut = parseISO(schedule.clockOutTime)
            } else {
              // Handle time-only format - combine with schedule date
              const timeStr = schedule.clockOutTime.length > 5 
                ? schedule.clockOutTime.substring(0, 5) 
                : schedule.clockOutTime
              clockOut = new Date(`${schedule.date}T${timeStr}:00`)
            }
            
            // Handle overnight shifts (clock out is next day)
            if (clockOut < clockIn) {
              clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000)
            }
            
            const diffMs = clockOut.getTime() - clockIn.getTime()
            const actualHours = diffMs / (1000 * 60 * 60)
            
            finalShiftData = {
              ...finalShiftData,
              startTime: extractTime(schedule.clockInTime),
              endTime: extractTime(schedule.clockOutTime),
              actualHours: Math.max(0, actualHours), // Ensure non-negative
              clockInLocation: schedule.clockInLocation,
              clockOutLocation: schedule.clockOutLocation
            }
          } catch (error) {
            console.error('Error processing clock times:', error)
            // Fallback: use the times as-is
            finalShiftData = {
              ...finalShiftData,
              startTime: extractTime(schedule.clockInTime),
              endTime: extractTime(schedule.clockOutTime),
              clockInLocation: schedule.clockInLocation,
              clockOutLocation: schedule.clockOutLocation
            }
          }
        }
      } else if (selectedType === 'scheduled') {
        // Use scheduled times as the final shift
        finalShiftData = {
          ...finalShiftData,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }
      } else if (editedData) {
        // Use edited data
        finalShiftData = {
          ...finalShiftData,
          ...editedData
        }
      }
      
      await updateSchedule(shiftId, finalShiftData)
      await refreshSchedules()
      
      // Clear selection after finalizing
      setSelectedFinalShift(prev => {
        const next = { ...prev }
        delete next[shiftId]
        return next
      })
      setEditingFinalShift(prev => {
        const next = { ...prev }
        delete next[shiftId]
        return next
      })
      
      setNotification({
        message: "Shift finalized successfully",
        type: "success"
      })
    } catch (error) {
      console.error('Error finalizing shift:', error)
      setNotification({
        message: "Failed to finalize shift",
        type: "error"
      })
    } finally {
      setSchedulesLoading(false)
    }
  }
  
  // Handle editing final shift
  const handleEditFinalShift = (shiftId: string, field: string, value: any) => {
    setEditingFinalShift(prev => ({
      ...prev,
      [shiftId]: {
        ...prev[shiftId],
        [field]: value
      }
    }))
    // Mark as edited type
    setSelectedFinalShift(prev => ({
      ...prev,
      [shiftId]: 'edited'
    }))
  }

  // Render employee view with grouping support
  const renderEmployeeView = () => {
    // Calculate daily cost for schedules on a specific day
    const calculateDailyCost = (daySchedules: Schedule[], returnSplit: boolean = false, dayStr?: string) => {
      let salaryCost = 0
      let hourlyCost = 0
      let totalCost = 0

      // Track which employees have schedules on this day
      // Handle both employeeId and employeeID field names
      const scheduledEmployeeIds = new Set(daySchedules.map(s => s.employeeId || (s as any).employeeID))

      daySchedules.forEach((schedule) => {
        // Find the employee for this schedule
        // Handle both employeeId and employeeID field names
        const scheduleEmployeeId = schedule.employeeId || (schedule as any).employeeID
        const employee = hrState.employees.find((emp) => emp.id === scheduleEmployeeId)
        if (!employee) return

        // Parse start and end times properly using date-fns
        const startTime = parseISO(`2000-01-01T${schedule.startTime}:00`)
        const endTime = parseISO(`2000-01-01T${schedule.endTime}:00`)
        
        if (!isValid(startTime) || !isValid(endTime)) {
          console.warn("Invalid time format in schedule:", schedule.startTime, schedule.endTime)
          return
        }

        // Calculate total hours worked, handling overnight shifts
        const totalHours = calculateHoursFromTimeStrings(schedule.startTime, schedule.endTime)

        // Calculate cost based on employee pay type
        let cost = 0
        if (employee.payType === "hourly" && employee.hourlyRate) {
          cost = employee.hourlyRate * totalHours
          hourlyCost += cost
        } else if (employee.payType === "salary" && employee.salary) {
          if (hrSettings.salaryDividedByDay) {
            // Divide salary equally by day (salary/365 per day)
            cost = employee.salary / 365
            salaryCost += cost
          } else {
            // For salary: cost per hour = (salary ÷ 52) ÷ hours per week (fallback to 40 if missing)
            const contractHours = employee.hoursPerWeek && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40
            const hourlyRate = employee.salary / 52 / contractHours
            cost = hourlyRate * totalHours
            salaryCost += cost
          }
        }

        // Add proportional tronc and bonus if available
        if (employee.tronc) {
          // Assuming tronc is monthly, calculate hourly proportion
          const workDaysPerMonth = 22 // Average work days in a month
          const workHoursPerDay = (employee.hoursPerWeek || 40) / 5 // Average work hours per day
          const troncPerHour = employee.tronc / (workDaysPerMonth * workHoursPerDay)
          const troncCost = troncPerHour * totalHours
          cost += troncCost
          if (employee.payType === "salary") {
            salaryCost += troncCost
          } else {
            hourlyCost += troncCost
          }
        }

        if (employee.bonus) {
          // Assuming bonus is monthly, calculate hourly proportion
          const workDaysPerMonth = 22 // Average work days in a month
          const workHoursPerDay = (employee.hoursPerWeek || 40) / 5 // Average work hours per day
          const bonusPerHour = employee.bonus / (workDaysPerMonth * workHoursPerDay)
          const bonusCost = bonusPerHour * totalHours
          cost += bonusCost
          if (employee.payType === "salary") {
            salaryCost += bonusCost
          } else {
            hourlyCost += bonusCost
          }
        }

        totalCost += cost
      })

      // If salaryDividedByDay is enabled, add daily salary cost for salaried employees who are not scheduled on this day
      if (hrSettings.salaryDividedByDay && dayStr) {
        // Get ALL salaried employees (not just filtered) who are not scheduled on this day
        // Exclude employees with doNotIncludeOnRota set to true
        const unscheduledSalariedEmployees = (hrState.employees || []).filter(emp => 
          emp.payType === "salary" && 
          emp.salary && 
          emp.doNotIncludeOnRota !== true &&
          !scheduledEmployeeIds.has(emp.id)
        )

        unscheduledSalariedEmployees.forEach((employee) => {
          // Add daily salary cost (salary/365 per day) for unscheduled salaried employees
          if (employee.salary) {
            const dailySalaryCost = employee.salary / 365
            salaryCost += dailySalaryCost
            totalCost += dailySalaryCost
          }
        })
      }

      if (returnSplit) {
        return { salaryCost, hourlyCost, totalCost }
      }
      return totalCost
    }
    
    const renderEmployeeTable = (employees: Employee[], title?: string) => {
      // Filter employees by search and filters
      let tableEmployees = employees.filter(emp => filteredEmployees.some(fe => fe.id === emp.id))
      
      // Apply sorting
      tableEmployees = [...tableEmployees].sort((a, b) => {
        let aValue: any
        let bValue: any
        
        if (sortBy === "name") {
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase()
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase()
        } else if (sortBy === "department") {
          const aDeptID = (a as any).departmentID
          const aDept = aDeptID ? departments.find(d => d.id === aDeptID) : null
          aValue = (aDept?.name || a.department || "").toLowerCase()
          const bDeptID = (b as any).departmentID
          const bDept = bDeptID ? departments.find(d => d.id === bDeptID) : null
          bValue = (bDept?.name || b.department || "").toLowerCase()
        } else if (sortBy === "role") {
          const aRoleId = a.roleId || (a as any).roleID
          const aRole = aRoleId ? roles.find(r => r.id === aRoleId) : null
          aValue = (aRole?.label || aRole?.name || "").toLowerCase()
          const bRoleId = b.roleId || (b as any).roleID
          const bRole = bRoleId ? roles.find(r => r.id === bRoleId) : null
          bValue = (bRole?.label || bRole?.name || "").toLowerCase()
        } else if (sortBy === "hours") {
          // Calculate total hours for the week
          const aHours = currentWeekDays.reduce((sum, day) => {
            const dayStr = format(day, "yyyy-MM-dd")
            const daySchedules = schedules.filter(s => s.employeeId === a.id && s.date === dayStr)
            return sum + daySchedules.reduce((d, s) => {
              const hrs = calculateHoursFromTimeStrings(s.startTime, s.endTime)
              return d + (isNaN(hrs) ? 0 : hrs)
            }, 0)
          }, 0)
          const bHours = currentWeekDays.reduce((sum, day) => {
            const dayStr = format(day, "yyyy-MM-dd")
            const daySchedules = schedules.filter(s => s.employeeId === b.id && s.date === dayStr)
            return sum + daySchedules.reduce((d, s) => {
              const hrs = calculateHoursFromTimeStrings(s.startTime, s.endTime)
              return d + (isNaN(hrs) ? 0 : hrs)
            }, 0)
          }, 0)
          aValue = aHours
          bValue = bHours
        } else {
          return 0
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        } else {
          return sortDirection === "asc"
            ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
            : (bValue < aValue ? -1 : bValue > aValue ? 1 : 0)
        }
      })
      // Calculate group totals for the header
      const groupTotals = title ? (() => {
        const groupSchedules = schedules.filter(schedule => {
          const employee = employees.find(emp => emp.id === schedule.employeeId)
          return employee !== undefined
        })
        
        const totalHours = groupSchedules.reduce((sum, schedule) => {
          const hrs = calculateHoursFromTimeStrings(schedule.startTime, schedule.endTime)
          return sum + (isNaN(hrs) ? 0 : hrs)
        }, 0)
        
        const totalCost = groupSchedules.reduce((sum, schedule) => {
          const employee = hrState.employees.find(emp => emp.id === schedule.employeeId)
          if (!employee) return sum
          
          const totalHours = calculateHoursFromTimeStrings(schedule.startTime, schedule.endTime)
          let cost = 0
          
          if (employee.payType === "hourly" && employee.hourlyRate) {
            cost = employee.hourlyRate * totalHours
          } else if (employee.payType === "salary" && employee.salary) {
            if (hrSettings.salaryDividedByDay) {
              // Divide salary equally by day (salary/365 per day)
              cost = employee.salary / 365
            } else {
              const contractHours = employee.hoursPerWeek && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40
              const hourlyRate = employee.salary / 52 / contractHours
              cost = hourlyRate * totalHours
            }
          }
          
          return sum + cost
        }, 0)
        
        return { totalHours, totalCost }
      })() : null

      const handleApproveGroupShifts = async () => {
        // Approve shifts: change from 'draft' to 'scheduled'
        // Use hrState.schedules directly to ensure we have the latest data
        const groupSchedules = hrState.schedules.filter(schedule => {
          const employee = employees.find(emp => emp.id === schedule.employeeId)
          return employee !== undefined && schedule.status === 'draft'
        })
        
        if (groupSchedules.length === 0) {
          setNotification({ message: "No draft shifts to approve in this group", type: "info" })
          return
        }
        
        try {
          console.log('🔄 Approving group shifts:', groupSchedules.map(s => ({ id: s.id, currentStatus: s.status })))
          
          // Update each schedule from draft to scheduled
          const updatePromises = groupSchedules.map(async (schedule) => {
            console.log(`📝 Updating schedule ${schedule.id} from ${schedule.status} to scheduled`)
            const result = await updateSchedule(schedule.id, {
              status: 'scheduled',
              approvedBy: currentUserId,
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            console.log(`✅ Updated schedule ${schedule.id}:`, result)
            return result
          })
          
          await Promise.all(updatePromises)
          
          // Force refresh schedules to see changes
          await refreshSchedules()
          console.log('🔄 Refreshed schedules after approval')
          
          setNotification({ 
            message: `Approved ${groupSchedules.length} shifts for ${title}`, 
            type: "success" 
          })
        } catch (error) {
          console.error('❌ Error approving shifts:', error)
          setNotification({ 
            message: "Failed to approve shifts. Please try again.", 
            type: "error" 
          })
        }
      }

      const handleConfirmGroupShifts = async () => {
        const today = new Date()
        // Confirm shifts: change from 'scheduled' to 'completed'
        // Use hrState.schedules directly to ensure we have the latest data
        const groupSchedules = hrState.schedules.filter(schedule => {
          const employee = employees.find(emp => emp.id === schedule.employeeId)
          const scheduleDate = new Date(schedule.date)
          return employee !== undefined && 
                 schedule.status === 'scheduled' && 
                 scheduleDate < today // Only allow confirming shifts from past days
        })
        
        if (groupSchedules.length === 0) {
          setNotification({ message: "No scheduled shifts from past days to confirm in this group", type: "info" })
          return
        }
        
        try {
          console.log('🔄 Confirming group shifts:', groupSchedules.map(s => ({ id: s.id, currentStatus: s.status, date: s.date })))
          
          // Update each schedule from scheduled to completed
          const updatePromises = groupSchedules.map(async (schedule) => {
            console.log(`📝 Updating schedule ${schedule.id} from ${schedule.status} to completed`)
            const result = await updateSchedule(schedule.id, { 
              status: 'completed',
              confirmedBy: currentUserId,
              confirmedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            console.log(`✅ Updated schedule ${schedule.id}:`, result)
            return result
          })
          
          await Promise.all(updatePromises)
          
          // Force refresh schedules to see changes
          await refreshSchedules()
          console.log('🔄 Refreshed schedules after confirmation')
          
          setNotification({ 
            message: `Confirmed ${groupSchedules.length} shifts for ${title}`, 
            type: "success" 
          })
        } catch (error) {
          console.error('❌ Error confirming shifts:', error)
          setNotification({ 
            message: "Failed to confirm shifts. Please try again.", 
            type: "error" 
          })
        }
      }

      const handleUnapproveGroupShifts = async () => {
        // Unapprove shifts: change from 'scheduled' back to 'draft'
        const groupSchedules = hrState.schedules.filter(schedule => {
          const employee = employees.find(emp => emp.id === schedule.employeeId)
          return employee !== undefined && schedule.status === 'scheduled'
        })
        
        if (groupSchedules.length === 0) {
          setNotification({ message: "No scheduled shifts to unapprove in this group", type: "info" })
          return
        }
        
        try {
          const updatePromises = groupSchedules.map(async (schedule) => {
            const result = await updateSchedule(schedule.id, { 
              status: 'draft',
              approvedBy: undefined,
              approvedAt: undefined,
              updatedAt: new Date().toISOString()
            })
            return result
          })
          
          await Promise.all(updatePromises)
          await refreshSchedules()
          
          setNotification({ 
            message: `Unapproved ${groupSchedules.length} shifts for ${title}`, 
            type: "success" 
          })
        } catch (error) {
          console.error('❌ Error unapproving shifts:', error)
          setNotification({ 
            message: "Failed to unapprove shifts. Please try again.", 
            type: "error" 
          })
        }
      }

      const handleUnconfirmGroupShifts = async () => {
        // Unconfirm shifts: change from 'completed' back to 'scheduled'
        const groupSchedules = hrState.schedules.filter(schedule => {
          const employee = employees.find(emp => emp.id === schedule.employeeId)
          return employee !== undefined && schedule.status === 'completed'
        })
        
        if (groupSchedules.length === 0) {
          setNotification({ message: "No confirmed shifts to unconfirm in this group", type: "info" })
          return
        }
        
        try {
          const updatePromises = groupSchedules.map(async (schedule) => {
            const result = await updateSchedule(schedule.id, {
              status: 'scheduled',
              confirmedBy: undefined,
              confirmedAt: undefined,
              updatedAt: new Date().toISOString()
            })
            return result
          })
          
          await Promise.all(updatePromises)
          await refreshSchedules()
          
          setNotification({ 
            message: `Unconfirmed ${groupSchedules.length} shifts for ${title}`, 
            type: "success" 
          })
        } catch (error) {
          console.error('❌ Error unconfirming shifts:', error)
          setNotification({ 
            message: "Failed to unconfirm shifts. Please try again.", 
            type: "error" 
          })
        }
      }

      return (
        <Box sx={{ mb: title ? 3 : 0 }}>
          {title && (
            <Paper
              sx={{
                p: 2,
                mb: 2,
                bgcolor: themeConfig.brandColors.navy,
                color: themeConfig.brandColors.offWhite,
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {title} ({employees.length} employee{employees.length !== 1 ? "s" : ""})
                  </Typography>
                  {groupTotals && (
                    <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Hours: <strong>{groupTotals.totalHours.toFixed(1)}h</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Cost: <strong>£{groupTotals.totalCost.toFixed(2)}</strong>
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Combined Approve/Confirm button - shows Approve if there are draft shifts, Confirm if all are scheduled */}
                  {(() => {
                    // Use hrState.schedules directly to ensure we have the latest data
                    const groupSchedules = hrState.schedules.filter(schedule => {
                      const employee = employees.find(emp => emp.id === schedule.employeeId)
                      return employee !== undefined
                    })
                    
                    const draftShifts = groupSchedules.filter(s => s.status === 'draft')
                    const scheduledShifts = groupSchedules.filter(s => s.status === 'scheduled')
                    const today = new Date()
                    today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
                    const scheduledShiftsFromPast = scheduledShifts.filter(s => {
                      const scheduleDate = new Date(s.date)
                      scheduleDate.setHours(0, 0, 0, 0)
                      return scheduleDate < today
                    })
                    
                    // If there are draft shifts, show Approve button
                    if (draftShifts.length > 0) {
                      return (
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={handleApproveGroupShifts}
                          sx={{ 
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                            color: themeConfig.brandColors.offWhite,
                            "&:hover": {
                              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.3)
                            }
                          }}
                        >
                          Approve All ({draftShifts.length})
                        </Button>
                      )
                    }
                    
                    // If there are scheduled shifts, show Unapprove button
                    if (scheduledShifts.length > 0 && draftShifts.length === 0) {
                      return (
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={handleUnapproveGroupShifts}
                          sx={{ 
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                            color: themeConfig.brandColors.offWhite,
                            borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                            "&:hover": {
                              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                              borderColor: alpha(themeConfig.brandColors.offWhite, 0.5)
                            }
                          }}
                        >
                          Unapprove All ({scheduledShifts.length})
                        </Button>
                      )
                    }
                    
                    // If all shifts are scheduled and there are scheduled shifts from past days, show Confirm button
                    if (scheduledShiftsFromPast.length > 0 && draftShifts.length === 0) {
                      return (
                        <Button
                          variant="contained"
                          color="info"
                          size="small"
                          onClick={handleConfirmGroupShifts}
                          sx={{ 
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                            color: themeConfig.brandColors.offWhite,
                            "&:hover": {
                              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.3)
                            }
                          }}
                        >
                          Confirm All ({scheduledShiftsFromPast.length})
                        </Button>
                      )
                    }
                    
                    // If there are completed shifts, show Unconfirm button
                    const completedShifts = groupSchedules.filter(s => s.status === 'completed')
                    if (completedShifts.length > 0 && draftShifts.length === 0 && scheduledShifts.length === 0) {
                      return (
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={handleUnconfirmGroupShifts}
                          sx={{ 
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                            color: themeConfig.brandColors.offWhite,
                            borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                            "&:hover": {
                              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                              borderColor: alpha(themeConfig.brandColors.offWhite, 0.5)
                            }
                          }}
                        >
                          Unconfirm All ({completedShifts.length})
                        </Button>
                      )
                    }
                    
                    return null
                  })()}
                </Box>
              </Box>
            </Paper>
          )}

        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 150, maxWidth: 180 }}>Employee</TableCell>
                {currentWeekDays.map((day) => (
                  <TableCell key={day.toISOString()} align="center" sx={{ minWidth: 120 }}>
                    {/* No date headers here - they're in the main header above */}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableEmployees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell sx={{ width: 150, verticalAlign: 'top', p: 2 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", lineHeight: 1.2 }}>
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {(() => {
                          // Handle both roleID (uppercase) and roleId (lowercase) like EmployeeList
                          const roleId = (employee as any).roleID || employee.roleId
                          const employeeRole = roleId ? roles.find((r) => r.id === roleId) : null
                          const employeeDeptID = (employee as any).departmentID
                          const employeeDept = employeeDeptID ? departments.find((d) => d.id === employeeDeptID) : null
                          const roleName = employeeRole ? (employeeRole.label || employeeRole.name) : "No Role"
                          const deptName = employeeDept ? employeeDept.name : (employee.department || "No Dept")
                          return `${roleName} • ${deptName}`
                        })()} 
                      </Typography>
                      
                      {/* Weekly Hours */}
                      <Typography variant="caption" sx={{ fontWeight: "bold", color: themeConfig.brandColors.navy }}>
                        {(() => {
                          const totalHrs = currentWeekDays.reduce((sum, day) => {
                            const dayStr = format(day, "yyyy-MM-dd")
                            const daySchedules = schedules.filter(s => s.employeeId === employee.id && s.date === dayStr)
                            const daySum = daySchedules.reduce((d, s) => {
                              const hrs = calculateHoursFromTimeStrings(s.startTime, s.endTime)
                              return d + (isNaN(hrs) ? 0 : hrs)
                            }, 0)
                            return sum + daySum
                          }, 0)
                          return `${totalHrs.toFixed(1)}h this week`
                        })()}
                      </Typography>

                      {/* Shift Warnings */}
                      {(() => {
                        const warnings = []
                        
                        // Check for overtime (>40 hours)
                        const totalWeekHours = currentWeekDays.reduce((sum, day) => {
                          const dayStr = format(day, "yyyy-MM-dd")
                          const daySchedules = schedules.filter(s => s.employeeId === employee.id && s.date === dayStr)
                          return sum + daySchedules.reduce((d, s) => {
                            const hrs = calculateHoursFromTimeStrings(s.startTime, s.endTime)
                            return d + (isNaN(hrs) ? 0 : hrs)
                          }, 0)
                        }, 0)
                        
                        if (totalWeekHours > 40) {
                          warnings.push({ type: 'overtime', message: `${(totalWeekHours - 40).toFixed(1)}h overtime` })
                        }
                        
                        // Check for consecutive days
                        let consecutiveDays = 0
                        let maxConsecutive = 0
                        currentWeekDays.forEach(day => {
                          const dayStr = format(day, "yyyy-MM-dd")
                          const hasShift = schedules.some(s => s.employeeId === employee.id && s.date === dayStr)
                          if (hasShift) {
                            consecutiveDays++
                            maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
                          } else {
                            consecutiveDays = 0
                          }
                        })
                        
                        if (maxConsecutive > 5) {
                          warnings.push({ type: 'consecutive', message: `${maxConsecutive} consecutive days` })
                        }

                        // Check for gap issues and overhours from validation
                        const employeeValidation = Array.isArray(weeklyValidations) ? 
                          weeklyValidations.find((v: any) => 
                            v.schedules && v.schedules.some((s: any) => s.employeeId === employee.id)
                          ) : null
                        if (employeeValidation) {
                          const hasGapIssue = employeeValidation.hasConflicts || employeeValidation.gapBetweenShifts < 11
                          if (hasGapIssue) {
                            warnings.push({ 
                              type: 'gap', 
                              message: employeeValidation.hasPermissionFor8HrGap ? 'Gap <11h' : 'Gap issue' 
                            })
                          }
                        }
                        
                        // Check for under/over hours based on contract
                        const contractHours = employee.hoursPerWeek || 40
                        if (totalWeekHours < contractHours * 0.8) {
                          warnings.push({ type: 'under', message: 'Under hours' })
                        } else if (totalWeekHours > contractHours * 1.2) {
                          warnings.push({ type: 'over', message: 'Over hours' })
                        }
                        
                        return warnings.length > 0 ? (
                          <Box sx={{ mt: 0.5 }}>
                            {warnings.map((warning, index) => (
                              <Chip
                                key={`${warning.type}-${warning.message}-${index}`}
                                size="small"
                                label={warning.message}
                                color={
                                  warning.type === 'overtime' || warning.type === 'over' ? 'warning' : 
                                  warning.type === 'gap' || warning.type === 'under' ? 'info' :
                                  'error'
                                }
                                sx={{ 
                                  fontSize: '0.65rem', 
                                  height: 18, 
                                  mb: 0.25,
                                  mr: 0.25,
                                  display: 'inline-block'
                                }}
                              />
                            ))}
                          </Box>
                        ) : null
                      })()}
                    </Box>
                  </TableCell>
                  {currentWeekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd")
                    const daySchedules = schedules.filter(
                      (schedule) => schedule.employeeId === employee.id && schedule.date === dayStr,
                    )

                    return (
                      <TableCell
                        key={day.toISOString()}
                        align="center"
                        onClick={(e) => {
                          // Only handle cell click if not clicking on a shift
                          if (!(e.target as HTMLElement).closest('[data-shift-paper]')) {
                            handleCellClick(employee.id, day)
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation() // Prevent bubbling
                          if (e.dataTransfer) {
                            e.dataTransfer.dropEffect = 'copy'
                          }
                          // Only update state if the cell actually changed to avoid unnecessary re-renders
                          const cellKey = `${employee.id}-${day.getTime()}`
                          const currentKey = dragOverCellRef.current ? `${dragOverCellRef.current.employeeId}-${dragOverCellRef.current.day.getTime()}` : null
                          if (cellKey !== currentKey) {
                            dragOverCellRef.current = { employeeId: employee.id, day }
                            setDragOverCell({ employeeId: employee.id, day })
                          }
                        }}
                        onDragLeave={(e) => {
                          // Only clear if we're actually leaving the cell (not entering a child)
                          const relatedTarget = e.relatedTarget as HTMLElement
                          if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                            dragOverCellRef.current = null
                            setDragOverCell(null)
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault()
                          e.stopPropagation() // Prevent cell click from firing
                          
                          // Get schedule data from dataTransfer if available, otherwise use ref
                          let scheduleToCopy = draggedScheduleRef.current
                          
                          // Try to get from dataTransfer as backup
                          if (!scheduleToCopy && e.dataTransfer) {
                            try {
                              const data = e.dataTransfer.getData('text/plain')
                              if (data) {
                                const parsed = JSON.parse(data)
                                if (parsed.scheduleId) {
                                  scheduleToCopy = schedules.find(s => s.id === parsed.scheduleId) || null
                                }
                              }
                            } catch (err) {
                              // Could not parse drag data - continue with ref fallback
                            }
                          }
                          
                          // Fallback to state
                          if (!scheduleToCopy) {
                            scheduleToCopy = draggedSchedule
                          }
                          
                          dragOverCellRef.current = null
                          setDragOverCell(null)
                          
                          if (scheduleToCopy) {
                            // Copy the shift to this employee and day
                            const dayStr = format(day, "yyyy-MM-dd")
                            // Parse startTime and endTime to Date objects or keep as strings
                            const parseTime = (timeStr: string): Date | null => {
                              if (!timeStr) return null
                              try {
                                const [hours, minutes] = timeStr.split(':')
                                const date = new Date()
                                date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
                                return date
                              } catch {
                                return null
                              }
                            }
                            
                            const scheduleDate = new Date(day)
                            scheduleDate.setHours(0, 0, 0, 0)
                            
                            const newScheduleData: ScheduleFormData = {
                              employeeId: employee.id,
                              date: scheduleDate, // Use Date object as ScheduleFormData expects
                              startTime: parseTime(scheduleToCopy.startTime),
                              endTime: parseTime(scheduleToCopy.endTime),
                              department: employee.department || scheduleToCopy.department,
                              role: (() => {
                                const roleId = employee.roleId || (employee as any).roleID
                                const role = roleId ? roles.find((r) => r.id === roleId) : undefined
                                return role ? (role.label || role.name) : scheduleToCopy.role
                              })(),
                              notes: scheduleToCopy.notes || '',
                              status: 'draft',
                              shiftType: scheduleToCopy.shiftType || 'regular',
                              payType: (scheduleToCopy.payType || 'hourly') as 'hourly' | 'flat',
                              payRate: scheduleToCopy.payRate ?? 0,
                              breakDuration: (scheduleToCopy as any).breakDuration ?? 0,
                            }
                            
                            // Format the data correctly before passing to addSchedule
                            const formattedData: Omit<Schedule, "id"> = {
                              employeeId: newScheduleData.employeeId,
                              employeeName: `${employee.firstName} ${employee.lastName}`,
                              date: dayStr, // Convert to string format
                              startTime: scheduleToCopy.startTime, // Keep as string
                              endTime: scheduleToCopy.endTime, // Keep as string
                              department: newScheduleData.department,
                              role: newScheduleData.role,
                              notes: newScheduleData.notes || '',
                              status: 'draft', // Ensure valid Schedule status (not 'no_show')
                              shiftType: newScheduleData.shiftType || 'regular',
                              payType: (scheduleToCopy.payType || 'hourly') as 'hourly' | 'flat',
                              payRate: newScheduleData.payRate ?? 0,
                              breakDuration: newScheduleData.breakDuration ?? 0,
                              createdAt: new Date().toISOString(), // Add createdAt as required
                            }
                            
                            try {
                              await addSchedule(formattedData)
                              // Wait a bit for database to update
                              await new Promise(resolve => setTimeout(resolve, 300))
                              await refreshSchedules()
                              setNotification({
                                message: `Shift copied to ${employee.firstName} ${employee.lastName} for ${format(day, 'MMM dd')}`,
                                type: "success"
                              })
                            } catch (error) {
                              console.error('❌ Error copying shift:', error)
                              setNotification({
                                message: "Failed to copy shift",
                                type: "error"
                              })
                            } finally {
                              draggedScheduleRef.current = null
                              setDraggedSchedule(null)
                            }
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          minWidth: 120,
                          verticalAlign: 'top',
                          p: 1,
                          "&:hover": { bgcolor: "action.hover" },
                          ...(dragOverCell && dragOverCell.employeeId === employee.id && dragOverCell.day.getTime() === day.getTime() ? {
                            bgcolor: "action.selected",
                            border: "2px dashed",
                            borderColor: themeConfig.brandColors.navy
                          } : {})
                        }}
                      >
                        {daySchedules.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                            {daySchedules.map((schedule) => {
                              const hasClockData = !!(schedule.clockInTime || schedule.clockOutTime)
                              const isExpanded = expandedShifts.has(schedule.id)
                              const selectedType = selectedFinalShift[schedule.id]
                              const editedData = editingFinalShift[schedule.id]
                              const displaySchedule = editedData ? { ...schedule, ...editedData } : schedule
                              
                              // Format clock times
                              const formatTime = (timeValue?: string): string => {
                                if (!timeValue) return ""
                                if (timeValue.includes('T')) {
                                  return format(parseISO(timeValue), 'HH:mm')
                                }
                                return timeValue.length > 5 ? timeValue.substring(0, 5) : timeValue
                              }
                              
                              // Calculate actual hours from clock in/out
                              const calculateClockHours = (): number => {
                                if (!schedule.clockInTime || !schedule.clockOutTime) return 0
                                try {
                                  let clockIn: Date
                                  let clockOut: Date
                                  
                                  if (schedule.clockInTime.includes('T')) {
                                    clockIn = parseISO(schedule.clockInTime)
                                  } else {
                                    // Handle time-only format - combine with schedule date
                                    const timeStr = schedule.clockInTime.length > 5 
                                      ? schedule.clockInTime.substring(0, 5) 
                                      : schedule.clockInTime
                                    clockIn = new Date(`${schedule.date}T${timeStr}:00`)
                                  }
                                  
                                  if (schedule.clockOutTime.includes('T')) {
                                    clockOut = parseISO(schedule.clockOutTime)
                                  } else {
                                    // Handle time-only format - combine with schedule date
                                    const timeStr = schedule.clockOutTime.length > 5 
                                      ? schedule.clockOutTime.substring(0, 5) 
                                      : schedule.clockOutTime
                                    clockOut = new Date(`${schedule.date}T${timeStr}:00`)
                                  }
                                  
                                  // Handle overnight shifts (clock out is next day)
                                  if (clockOut < clockIn) {
                                    clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000)
                                  }
                                  
                                  const diffMs = clockOut.getTime() - clockIn.getTime()
                                  return Math.max(0, diffMs / (1000 * 60 * 60))
                                } catch (error) {
                                  console.error('Error calculating clock hours:', error)
                                  return 0
                                }
                              }
                              
                              return (
                                <Box key={schedule.id}>
                                  {/* Main scheduled shift row */}
                                  <Paper
                                    data-shift-paper
                                    elevation={1}
                                    draggable={!finalizeMode}
                                    onDragStart={(e) => {
                                      if (finalizeMode) {
                                        e.preventDefault()
                                        return
                                      }
                                      e.stopPropagation()
                                      draggedScheduleRef.current = schedule
                                      setDraggedSchedule(schedule)
                                      if (e.dataTransfer) {
                                        e.dataTransfer.effectAllowed = 'copy'
                                        e.dataTransfer.dropEffect = 'copy'
                                        try {
                                          e.dataTransfer.setData('text/plain', JSON.stringify({ scheduleId: schedule.id }))
                                        } catch (err) {
                                          // Some browsers don't support setData in dragstart
                                        }
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation()
                                      draggedScheduleRef.current = null
                                      setDraggedSchedule(null)
                                      dragOverCellRef.current = null
                                      setDragOverCell(null)
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                      if (!draggedScheduleRef.current && !finalizeMode) {
                                        e.stopPropagation()
                                        handleCellClick(employee.id, day, schedule)
                                      }
                                    }}
                                    sx={{
                                      cursor: finalizeMode ? 'default' : 'grab',
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      pointerEvents: 'auto',
                                      '& *': {
                                        pointerEvents: finalizeMode ? 'auto' : 'none',
                                      },
                                      '&:active': {
                                        cursor: finalizeMode ? 'default' : 'grabbing'
                                      },
                                      p: 1,
                                      width: '100%',
                                      borderRadius: 1,
                                      bgcolor: 
                                        schedule.status === "draft"
                                          ? "#f5f5f5"
                                          : schedule.status === "scheduled"
                                            ? "#fff3e0"
                                            : schedule.status === "completed"
                                              ? "#e8f5e8"
                                              : schedule.status === "finalized"
                                                ? "#e3f2fd"
                                              : schedule.status === "cancelled"
                                                ? "#ffebee"
                                                : alpha(themeConfig.brandColors.navy, 0.04),
                                      color:
                                        schedule.status === "draft"
                                          ? "#757575"
                                          : schedule.status === "scheduled"
                                            ? "#e65100"
                                            : schedule.status === "completed"
                                              ? "#2e7d32"
                                              : schedule.status === "finalized"
                                                ? "#1976d2"
                                              : schedule.status === "cancelled"
                                                ? "#c62828"
                                                : "text.primary",
                                      border: 1,
                                      borderColor:
                                        schedule.status === "draft"
                                          ? "#9e9e9e"
                                          : schedule.status === "scheduled"
                                            ? "#ff9800"
                                            : schedule.status === "completed"
                                              ? "#4caf50"
                                              : schedule.status === "finalized"
                                                ? "#2196f3"
                                              : schedule.status === "cancelled"
                                                ? "#f44336"
                                                : "grey.300",
                                      '&:hover': {
                                        elevation: 2,
                                        transform: 'translateY(-1px)',
                                        transition: 'all 0.2s ease-in-out'
                                      },
                                      ...(finalizeMode && selectedType === 'scheduled' ? {
                                        borderColor: '#4caf50',
                                        borderWidth: 2
                                      } : {})
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      {finalizeMode && (
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleSelectFinalShift(schedule.id, 'scheduled')
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          {selectedType === 'scheduled' ? (
                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                                          ) : (
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
                                          )}
                                        </IconButton>
                                      )}
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textAlign: 'center' }}>
                                          {displaySchedule.startTime}-{displaySchedule.endTime}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', textAlign: 'center', opacity: 0.8 }}>
                                          {(() => {
                                            const hrs = calculateHoursFromTimeStrings(displaySchedule.startTime, displaySchedule.endTime)
                                            return `${(isNaN(hrs) ? 0 : hrs).toFixed(1)}h`
                                          })()}
                                        </Typography>
                                        {schedule.status !== 'completed' && schedule.status !== 'finalized' && (
                                          <Chip
                                            size="small"
                                            label={schedule.status}
                                            sx={{
                                              height: 14,
                                              fontSize: '0.6rem',
                                              mt: 0.25,
                                              '& .MuiChip-label': { px: 0.5 },
                                              bgcolor: 
                                                schedule.status === "draft" ? "#9e9e9e" :
                                                schedule.status === "scheduled" ? "#ff9800" :
                                                schedule.status === "cancelled" ? "#f44336" : "#9e9e9e",
                                              color: "white",
                                              '&:hover': {
                                                bgcolor: 
                                                  schedule.status === "draft" ? "#757575" :
                                                  schedule.status === "scheduled" ? "#f57c00" :
                                                  schedule.status === "cancelled" ? "#d32f2f" : "#757575"
                                              }
                                            }}
                                          />
                                        )}
                                      </Box>
                                      {finalizeMode && hasClockData && (
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleShiftExpand(schedule.id)
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          {isExpanded ? (
                                            <ExpandLessIcon sx={{ fontSize: 18 }} />
                                          ) : (
                                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                          )}
                                        </IconButton>
                                      )}
                                      {finalizeMode && selectedType && (
                                        <Tooltip title="Finalize this shift">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleFinalizeShift(schedule)
                                            }}
                                            sx={{ p: 0.5, color: 'success.main' }}
                                          >
                                            <CheckCircleIcon sx={{ fontSize: 20 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {finalizeMode && !selectedType && (
                                        <Tooltip title="Edit shift">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSelectFinalShift(schedule.id, 'edited')
                                            }}
                                            sx={{ p: 0.5 }}
                                          >
                                            <EditIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Paper>
                                  
                                  {/* Clock in/out sub-row (only in finalize mode) */}
                                  {finalizeMode && hasClockData && (
                                    <Collapse in={isExpanded}>
                                      <Paper
                                        elevation={1}
                                        sx={{
                                          mt: 0.5,
                                          p: 1,
                                          width: '100%',
                                          borderRadius: 1,
                                          bgcolor: '#f5f5f5',
                                          color: '#757575',
                                          border: 1,
                                          borderColor: selectedType === 'clock' ? '#4caf50' : '#e0e0e0',
                                          borderWidth: selectedType === 'clock' ? 2 : 1,
                                          '&:hover': {
                                            elevation: 2,
                                            transform: 'translateY(-1px)',
                                            transition: 'all 0.2s ease-in-out'
                                          }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleSelectFinalShift(schedule.id, 'clock')}
                                            sx={{ p: 0.5 }}
                                          >
                                            {selectedType === 'clock' ? (
                                              <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                                            ) : (
                                              <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
                                            )}
                                          </IconButton>
                                          <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textAlign: 'center', fontSize: '0.7rem', mb: 0.25 }}>
                                              Clock In/Out Shift
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', textAlign: 'center' }}>
                                              {formatTime(schedule.clockInTime)}-{formatTime(schedule.clockOutTime)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', textAlign: 'center', opacity: 0.8 }}>
                                              {calculateClockHours().toFixed(1)}h
                                            </Typography>
                                          </Box>
                                          {selectedType === 'clock' && (
                                            <Tooltip title="Finalize this shift">
                                              <IconButton
                                                size="small"
                                                onClick={() => handleFinalizeShift(schedule)}
                                                sx={{ p: 0.5, color: 'success.main' }}
                                              >
                                                <CheckCircleIcon sx={{ fontSize: 20 }} />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Box>
                                      </Paper>
                                    </Collapse>
                                  )}
                                  
                                  {/* Edit mode sub-row (when neither is selected and user wants to edit) */}
                                  {finalizeMode && selectedType === 'edited' && (
                                    <Collapse in={true}>
                                      <Paper
                                        elevation={0}
                                        sx={{
                                          mt: 0.5,
                                          p: 1,
                                          bgcolor: '#fff9c4',
                                          border: 1,
                                          borderColor: '#4caf50',
                                          borderWidth: 2,
                                          borderRadius: 1
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleSelectFinalShift(schedule.id, 'edited')}
                                            sx={{ p: 0.5 }}
                                          >
                                            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                                          </IconButton>
                                          <Typography variant="caption" sx={{ fontWeight: 'bold', flex: 1 }}>
                                            Custom Shift (Edit)
                                          </Typography>
                                          <Tooltip title="Finalize this shift">
                                            <IconButton
                                              size="small"
                                              onClick={() => handleFinalizeShift(schedule)}
                                              sx={{ p: 0.5, color: 'success.main' }}
                                            >
                                              <CheckCircleIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                          </Tooltip>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 4 }}>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ minWidth: 80 }}>Start:</Typography>
                                            <TextField
                                              size="small"
                                              type="time"
                                              value={displaySchedule.startTime || ''}
                                              onChange={(e) => handleEditFinalShift(schedule.id, 'startTime', e.target.value)}
                                              sx={{ width: 100 }}
                                              InputLabelProps={{ shrink: true }}
                                            />
                                          </Box>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ minWidth: 80 }}>End:</Typography>
                                            <TextField
                                              size="small"
                                              type="time"
                                              value={displaySchedule.endTime || ''}
                                              onChange={(e) => handleEditFinalShift(schedule.id, 'endTime', e.target.value)}
                                              sx={{ width: 100 }}
                                              InputLabelProps={{ shrink: true }}
                                            />
                                          </Box>
                                        </Box>
                                      </Paper>
                                    </Collapse>
                                  )}
                                </Box>
                              )
                            })}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            + Add
                          </Typography>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      )
    }

    // Render date header with weather and costs
    const renderDateHeader = () => (
      <Paper sx={{ mb: 2, overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 150, bgcolor: "grey.50" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Week Schedule
                </Typography>
              </TableCell>
              {currentWeekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd")
                // Calculate total daily cost for all employees on this day
                const daySchedules = schedules.filter(s => s.date === dayStr)
                const dailyCostNum = calculateDailyCost(daySchedules, false, dayStr) as number
                
                return (
                  <TableCell key={day.toISOString()} align="center" sx={{ minWidth: 120, bgcolor: "grey.50" }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {format(day, "EEE")}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>{format(day, "MMM d")}</Typography>
                      
                      {/* Weather information */}
                      {weatherData && weatherData[dayStr] && (() => {
                        const dayWeather = weatherData[dayStr]
                        return (
                          <Box key={`weather-${dayStr}`} sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                            {dayWeather?.condition?.toLowerCase().includes("sun") ||
                            dayWeather?.condition?.toLowerCase().includes("clear") ? (
                              <WbSunnyIcon sx={{ color: "warning.main", fontSize: 18 }} />
                            ) : dayWeather?.condition?.toLowerCase().includes("rain") ||
                              dayWeather?.condition?.toLowerCase().includes("shower") ? (
                              <UmbrellaIcon sx={{ color: themeConfig.brandColors.navy, fontSize: 18 }} />
                            ) : dayWeather?.condition?.toLowerCase().includes("snow") ? (
                              <AcUnitIcon sx={{ color: "info.light", fontSize: 18 }} />
                            ) : dayWeather?.condition?.toLowerCase().includes("partly") ? (
                              <FilterDramaIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            ) : (
                              <CloudIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                            )}
                            <Typography variant="caption" sx={{ ml: 0.5, fontSize: "0.75rem" }}>
                              {dayWeather?.temperature ? Math.round(dayWeather.temperature) : "--"}°C
                            </Typography>
                          </Box>
                        )
                      })()}
                      
                      {/* Daily cost information - only show if split is disabled */}
                      {!hrSettings.splitSalaryAndHourlyCosts && dailyCostNum > 0 && (
                        <Typography variant="body2" sx={{ fontSize: "0.8rem", color: themeConfig.brandColors.navy, fontWeight: "bold" }}>
                          {(() => {
                            const forecast = dailyForecastByDate[dayStr] || 0
                            const { costText, pctText } = formatCostWithPct(dailyCostNum, forecast)
                            return (
                              <>
                                {costText} <span style={{ opacity: 0.8 }}>({pctText})</span>
                              </>
                            )
                          })()}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                )
              })}
            </TableRow>
            {/* Forecast Row - shows revenue/forecast target for the day */}
            {(() => {
              const hasAnyForecast = currentWeekDays.some((day) => {
                const dayStr = format(day, "yyyy-MM-dd")
                return (dailyForecastByDate[dayStr] || 0) > 0
              })
              if (!hasAnyForecast) return null

              return (
                <TableRow sx={{ bgcolor: "#4caf50", '& .MuiTableCell-root': { fontWeight: 'bold', color: 'white', py: 1 } }}>
                  <TableCell sx={{ bgcolor: "#4caf50", color: "white" }}>Forecast</TableCell>
                  {currentWeekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd")
                    const forecast = dailyForecastByDate[dayStr] || 0
                    return (
                      <TableCell key={day.toISOString()} align="center" sx={{ bgcolor: "#4caf50", color: "white" }}>
                        {forecast > 0 ? `£${forecast.toFixed(2)}` : "—"}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })()}
            {/* Split Cost Rows - shown when splitSalaryAndHourlyCosts is enabled */}
            {hrSettings.splitSalaryAndHourlyCosts && (
              <>
                <TableRow sx={{ bgcolor: 'primary.light', '& .MuiTableCell-root': { fontWeight: 'bold', color: themeConfig.brandColors.offWhite, py: 1 } }}>
                  <TableCell sx={{ bgcolor: 'primary.light', color: themeConfig.brandColors.offWhite }}>Salary Costs</TableCell>
                  {currentWeekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd")
                    const daySchedules = schedules.filter(s => s.date === dayStr)
                    const costs = calculateDailyCost(daySchedules, true, dayStr) as { salaryCost: number; hourlyCost: number; totalCost: number }
                    const forecast = dailyForecastByDate[dayStr] || 0
                    const { costText, pctText } = formatCostWithPct(costs.salaryCost, forecast)
                    return (
                      <TableCell key={day.toISOString()} align="center" sx={{ bgcolor: 'primary.light', color: themeConfig.brandColors.offWhite }}>
                        {costText} <span style={{ opacity: 0.9 }}>({pctText})</span>
                      </TableCell>
                    )
                  })}
                </TableRow>
                <TableRow sx={{ bgcolor: 'secondary.light', '& .MuiTableCell-root': { fontWeight: 'bold', color: themeConfig.brandColors.navy, py: 1 } }}>
                  <TableCell sx={{ bgcolor: 'secondary.light', color: themeConfig.brandColors.navy }}>Hourly Costs</TableCell>
                  {currentWeekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd")
                    const daySchedules = schedules.filter(s => s.date === dayStr)
                    const costs = calculateDailyCost(daySchedules, true, dayStr) as { salaryCost: number; hourlyCost: number; totalCost: number }
                    const forecast = dailyForecastByDate[dayStr] || 0
                    const { costText, pctText } = formatCostWithPct(costs.hourlyCost, forecast)
                    return (
                      <TableCell key={day.toISOString()} align="center" sx={{ bgcolor: 'secondary.light', color: themeConfig.brandColors.navy }}>
                        {costText} <span style={{ opacity: 0.9 }}>({pctText})</span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              </>
            )}
            {/* Budget Row - shows budget allocation for the period */}
            {(() => {
              // Get relevant budgets (total labour, salaried labour, hourly labour, freelance)
              const labourBudgets = (financeState.budgets || []).filter(budget => 
                budget.budgetType === 'total labour' || 
                budget.budgetType === 'salaried labour' || 
                budget.budgetType === 'hourly labour' || 
                budget.budgetType === 'freelance'
              )

              // Calculate daily budget allocation for each day in the week
              const calculateDailyBudget = (day: Date): number => {
                const dayStr = format(day, "yyyy-MM-dd")
                let totalDailyBudget = 0

                labourBudgets.forEach(budget => {
                  if (!budget.period_start || !budget.budgeted) return

                  const budgetStart = parseISO(budget.period_start)
                  const budgetEnd = budget.period_end ? parseISO(budget.period_end) : null
                  const currentDay = parseISO(dayStr)

                  // Check if this day falls within the budget period
                  if (!isValid(budgetStart) || !isValid(currentDay)) return
                  if (budgetEnd && !isValid(budgetEnd)) return

                  const isWithinPeriod = budgetEnd 
                    ? isWithinInterval(currentDay, { start: budgetStart, end: budgetEnd })
                    : currentDay >= budgetStart

                  if (!isWithinPeriod) return

                  // Calculate daily allocation based on period type
                  let dailyAllocation = 0
                  const periodType = budget.period_type || 'monthly'

                  switch (periodType) {
                    case 'weekly':
                      // Divide by 7 days
                      dailyAllocation = budget.budgeted / 7
                      break
                    case 'bi-weekly':
                      // Divide by 14 days
                      dailyAllocation = budget.budgeted / 14
                      break
                    case 'monthly':
                      // Calculate days in the month
                      const monthEnd = new Date(budgetStart.getFullYear(), budgetStart.getMonth() + 1, 0)
                      const daysInMonth = monthEnd.getDate()
                      dailyAllocation = budget.budgeted / daysInMonth
                      break
                    case 'quarterly':
                      // Calculate days in the quarter
                      const quarterStart = new Date(budgetStart.getFullYear(), Math.floor(budgetStart.getMonth() / 3) * 3, 1)
                      const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0)
                      const daysInQuarter = Math.ceil((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      dailyAllocation = budget.budgeted / daysInQuarter
                      break
                    case 'yearly':
                      // Divide by 365 days
                      dailyAllocation = budget.budgeted / 365
                      break
                    default:
                      dailyAllocation = budget.budgeted / 30 // Default to monthly
                  }

                  totalDailyBudget += dailyAllocation
                })

                return totalDailyBudget
              }

              // Only show budget row if there are relevant budgets
              if (labourBudgets.length === 0) return null

              return (
                <TableRow sx={{ bgcolor: '#ff9800', '& .MuiTableCell-root': { fontWeight: 'bold', color: 'white', py: 1 } }}>
                  <TableCell sx={{ bgcolor: '#ff9800', color: 'white' }}>Budget</TableCell>
                  {currentWeekDays.map((day) => {
                    const dailyBudget = calculateDailyBudget(day)
                    return (
                      <TableCell key={day.toISOString()} align="center" sx={{ bgcolor: '#ff9800', color: 'white' }}>
                        £{dailyBudget.toFixed(2)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })()}
            {/* Total Cost Row */}
            <TableRow sx={{ bgcolor: themeConfig.brandColors.navy, '& .MuiTableCell-root': { fontWeight: 'bold', color: themeConfig.brandColors.offWhite, py: 1.5 } }}>
              <TableCell sx={{ bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>Total</TableCell>
              {currentWeekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd")
                const daySchedules = schedules.filter(s => s.date === dayStr)
                const costs: { totalCost: number } = hrSettings.splitSalaryAndHourlyCosts 
                  ? (calculateDailyCost(daySchedules, true, dayStr) as { salaryCost: number; hourlyCost: number; totalCost: number })
                  : { totalCost: calculateDailyCost(daySchedules, false, dayStr) as number }
                const forecast = dailyForecastByDate[dayStr] || 0
                const { costText, pctText } = formatCostWithPct(costs.totalCost, forecast)
                return (
                  <TableCell key={day.toISOString()} align="center" sx={{ bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
                    {costText} <span style={{ opacity: 0.9 }}>({pctText})</span>
                  </TableCell>
                )
              })}
            </TableRow>
          </TableHead>
        </Table>
      </Paper>
    )

    return (
      <Box sx={{ mt: 2 }}>
        {renderDateHeader()}
        {Object.entries(groupedEmployees).map(([groupName, employees]) => (
          <Fragment key={groupName}>
            {renderEmployeeTable(employees, groupName)}
          </Fragment>
        ))}
      </Box>
    )
  }

  if (schedulesLoading) {
    // No loading UI — render the page structure and let data fill in.
    // Keep showing whatever data we currently have (often empty during first load).
  }

  // No debug/empty-state takeover — keep the full UI rendered and let data fill in.

  return (
    <Box sx={{ width: "100%" }}>
      {/* DataHeader with simplified controls */}
      <DataHeader
        showDateControls={true}
        currentDate={selectedDate}
        dateType="week"
        onDateChange={handleDateChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees..."
        onCreateNew={handleCreateNew}
        createButtonLabel="Add Shift"
        singleRow={true}
        filters={[
          {
            label: "Department",
            options: departments.map(dept => ({ id: dept.name, name: dept.name })),
            selectedValues: filterDepartment,
            onSelectionChange: setFilterDepartment
          },
          {
            label: "Role",
            options: roles.map(role => ({ id: role.label || role.name, name: role.label || role.name })),
            selectedValues: filterRole,
            onSelectionChange: setFilterRole
          },
          {
            label: "Status",
            options: [
              { id: "draft", name: "Draft" },
              { id: "scheduled", name: "Scheduled" },
              { id: "completed", name: "Completed" },
              { id: "cancelled", name: "Cancelled" }
            ],
            selectedValues: filterStatus,
            onSelectionChange: setFilterStatus
          }
        ]}
        filtersExpanded={filterOpen}
        onFiltersToggle={() => setFilterOpen(!filterOpen)}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "department", label: "Department" },
          { value: "role", label: "Role" },
          { value: "hours", label: "Hours" }
        ]}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortBy(value)
          setSortDirection(direction)
        }}
        additionalButtons={[
          {
            label: finalizeMode ? "Exit Finalise" : "Finalise",
            icon: <AssignmentIcon />,
            onClick: handleNavigateToFinalize,
            variant: finalizeMode ? "contained" as const : "outlined" as const,
            color: finalizeMode ? "success" as const : "primary" as const
          },
          {
            label: "Copy Week",
            icon: <ContentCopyIcon />,
            onClick: handleCopyLastWeek,
            color: "secondary"
          },
          {
            label: "Bulk",
            icon: <FilterAltIcon />,
            onClick: () => setBulkScheduleMode(true),
            color: "secondary"
          },
          {
            label: "AI Rota",
            icon: <AutoAwesomeIcon />,
            onClick: () => {
              generateRotaWithAI()
              setAiCalendarModalOpen(true)
            },
            color: "secondary"
          },
          ...((() => {
            // Get schedules in the current date range
            const startDateStr = format(dynamicDateRange.startDate, 'yyyy-MM-dd')
            const endDateStr = format(dynamicDateRange.endDate, 'yyyy-MM-dd')
            const rangeSchedules = hrState.schedules.filter(s => 
              s.date >= startDateStr && s.date <= endDateStr
            )
            
            // Find the lowest status (draft < scheduled < completed)
            const statusOrder = { draft: 0, scheduled: 1, completed: 2, cancelled: 3 }
            const statuses = rangeSchedules.map(s => s.status).filter(s => s !== 'cancelled')
            const lowestStatus = statuses.length > 0 
              ? statuses.reduce((lowest, current) => 
                  (statusOrder[current as keyof typeof statusOrder] ?? 999) < 
                  (statusOrder[lowest as keyof typeof statusOrder] ?? 999) 
                    ? current 
                    : lowest
                )
              : null
            
            if (lowestStatus === 'draft') {
              const draftCount = rangeSchedules.filter(s => s.status === 'draft').length
              return draftCount > 0 ? [{
                label: `Approve (${draftCount})`,
                icon: <AutoAwesomeIcon />,
                onClick: async () => {
                  // Recalculate range schedules with current data
                  const currentStartDateStr = format(dynamicDateRange.startDate, 'yyyy-MM-dd')
                  const currentEndDateStr = format(dynamicDateRange.endDate, 'yyyy-MM-dd')
                  const currentRangeSchedules = hrState.schedules.filter(s => 
                    s.date >= currentStartDateStr && s.date <= currentEndDateStr
                  )
                  // Approve all draft shifts in range - move to completed
                  const draftShifts = currentRangeSchedules.filter(s => s.status === 'draft')
                  if (draftShifts.length === 0) {
                    setNotification({ 
                      message: "No draft shifts to approve", 
                      type: "info" 
                    })
                    return
                  }
                  try {
                    console.log('🔄 Approving shifts:', draftShifts.map(s => ({ id: s.id, status: s.status })))
                    await Promise.all(draftShifts.map(s => 
                      updateSchedule(s.id, { status: 'completed', updatedAt: new Date().toISOString() })
                    ))
                    await refreshSchedules()
                    console.log('✅ Approved shifts successfully')
                    setNotification({ 
                      message: `Approved ${draftShifts.length} shift(s)`, 
                      type: "success" 
                    })
                  } catch (error) {
                    console.error('❌ Error approving shifts:', error)
                    setNotification({ 
                      message: "Error approving shifts", 
                      type: "error" 
                    })
                  }
                },
                color: "success" as const
              }] : []
            } else if (lowestStatus === 'scheduled') {
              const scheduledCount = rangeSchedules.filter(s => s.status === 'scheduled').length
              return scheduledCount > 0 ? [{
                label: `Confirm (${scheduledCount})`,
                icon: <AutoAwesomeIcon />,
                onClick: async () => {
                  // Recalculate range schedules with current data
                  const currentStartDateStr = format(dynamicDateRange.startDate, 'yyyy-MM-dd')
                  const currentEndDateStr = format(dynamicDateRange.endDate, 'yyyy-MM-dd')
                  const currentRangeSchedules = hrState.schedules.filter(s => 
                    s.date >= currentStartDateStr && s.date <= currentEndDateStr
                  )
                  // Confirm all scheduled shifts in range - move to completed
                  const scheduledShifts = currentRangeSchedules.filter(s => s.status === 'scheduled')
                  if (scheduledShifts.length === 0) {
                    setNotification({ 
                      message: "No scheduled shifts to confirm", 
                      type: "info" 
                    })
                    return
                  }
                  try {
                    console.log('🔄 Confirming shifts:', scheduledShifts.map(s => ({ id: s.id, status: s.status })))
                    await Promise.all(scheduledShifts.map(s => 
                      updateSchedule(s.id, { status: 'completed', updatedAt: new Date().toISOString() })
                    ))
                    await refreshSchedules()
                    console.log('✅ Confirmed shifts successfully')
                    setNotification({ 
                      message: `Confirmed ${scheduledShifts.length} shift(s)`, 
                      type: "success" 
                    })
                  } catch (error) {
                    console.error('❌ Error confirming shifts:', error)
                    setNotification({ 
                      message: "Error confirming shifts", 
                      type: "error" 
                    })
                  }
                },
                color: "warning" as const
              }] : []
            }
            return []
          })())
        ]}
        additionalControls={
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "department" | "role" | "none")}
              sx={{ 
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                }
              }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="department">Group by Department</MenuItem>
              <MenuItem value="role">Group by Role</MenuItem>
            </Select>
          </FormControl>
        }
      />

      {/* Finalize Shifts (modal) */}
      <FinalizeShiftsModal open={finalizeModalOpen} onClose={() => setFinalizeModalOpen(false)} />

      {/* Error Display - Removed since error state variable was removed */}

      {/* Enhanced Employee View with Grouping */}
      {renderEmployeeView()}

      {/* Add/Edit Shift Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{editMode ? "Edit Shift" : "Add Shift"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a single shift for an employee on a specific date and time.
          </Typography>
          <FormControl fullWidth margin="dense">
            <InputLabel>Employee</InputLabel>
            <Select
              value={formData.employeeId}
              onChange={handleEmployeeChange}
              label="Employee"
              required
              disabled={editMode}
            >
              {hrState.employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} - {employee.department || "No Department"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="dense"
            label="Date"
            type="date"
            value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
            onChange={(e) => setFormData({ ...formData, date: e.target.value ? new Date(e.target.value) : null })}
            InputLabelProps={{ shrink: true }}
            required
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              margin="dense"
              label="Start Time"
              type="time"
              value={formData.startTime ? format(formData.startTime, "HH:mm") : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startTime: e.target.value ? parseISO(`2000-01-01T${e.target.value}`) : null,
                })
              }
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              margin="dense"
              label="End Time"
              type="time"
              value={formData.endTime ? format(formData.endTime, "HH:mm") : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endTime: e.target.value ? parseISO(`2000-01-01T${e.target.value}`) : null,
                })
              }
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              margin="dense"
              label="Break Start Time"
              type="time"
              value={formData.breakStartTime ? format(formData.breakStartTime, "HH:mm") : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  breakStartTime: e.target.value ? parseISO(`2000-01-01T${e.target.value}`) : null,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Break Duration (min)"
              type="number"
              value={formData.breakDuration || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  breakDuration: e.target.value ? Number(e.target.value) : 0,
                })
              }
              InputLabelProps={{ shrink: true }}
              InputProps={{
                inputProps: { min: 0, step: 15 }
              }}
            />
          </Box>

          <TextField
            fullWidth
            margin="dense"
            label="Department"
            name="department"
            value={formData.department}
            disabled
            helperText="Auto-filled from employee information"
          />
          <TextField
            fullWidth
            margin="dense"
            label="Role"
            name="role"
            value={formData.role || ""}
            disabled
            helperText="Auto-filled from employee information"
          />
          <TextField
            fullWidth
            margin="dense"
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Shift Type</InputLabel>
              <Select name="shiftType" value={formData.shiftType} onChange={handleSelectChange} label="Shift Type">
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="off">Day Off</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel>Pay Type</InputLabel>
              <Select name="payType" value={formData.payType} onChange={handleSelectChange} label="Pay Type">
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="flat">Flat Rate</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {formData.payType === "flat" && (
            <TextField
              fullWidth
              margin="dense"
              label="Pay Rate"
              type="number"
              value={formData.payRate || ""}
              onChange={(e) =>
                setFormData({ ...formData, payRate: e.target.value ? Number(e.target.value) : undefined })
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">£</InputAdornment>,
              }}
            />
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} onChange={handleSelectChange} label="Status">
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          {/* Display estimated cost information */}
          {selectedEmployeeData && formData.startTime && formData.endTime && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                Estimated Cost Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Base Pay:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    £{(() => {
                      // Handle overnight shifts - if endTime is before startTime, add 24 hours
                      let totalHours = differenceInMinutes(formData.endTime, formData.startTime) / 60
                      if (totalHours < 0) totalHours += 24
                      if (formData.payType === "flat") {
                        return (formData.payRate || 0).toFixed(2)
                      } else if (formData.payType === "hourly") {
                        return ((selectedEmployeeData.hourlyRate || 0) * totalHours).toFixed(2)
                      } else if (
                        selectedEmployeeData.payType === "salary" &&
                        selectedEmployeeData.salary &&
                        selectedEmployeeData.hoursPerWeek
                      ) {
                        const hourlyRate = selectedEmployeeData.salary / 52 / selectedEmployeeData.hoursPerWeek
                        return (hourlyRate * totalHours).toFixed(2)
                      }
                      return "0.00"
                    })()}
                  </Typography>
                </Grid>

                {selectedEmployeeData.hoursPerWeek && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Standard Hours/Week:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">{selectedEmployeeData.hoursPerWeek} hours</Typography>
                    </Grid>
                  </>
                )}

                {selectedEmployeeData.payType === "salary" &&
                  selectedEmployeeData.salary &&
                  selectedEmployeeData.hoursPerWeek && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Calculated Hourly Rate:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          £{(selectedEmployeeData.salary / 52 / selectedEmployeeData.hoursPerWeek).toFixed(2)}/hr
                        </Typography>
                      </Grid>
                    </>
                  )}

                {selectedEmployeeData.tronc !== undefined && selectedEmployeeData.tronc > 0 && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Tronc (proportional):
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        £{(() => {
                          // Handle overnight shifts - if endTime is before startTime, add 24 hours
                          let totalHours = differenceInMinutes(formData.endTime, formData.startTime) / 60
                          if (totalHours < 0) totalHours += 24
                          const workHoursPerDay = (selectedEmployeeData.hoursPerWeek || 40) / 5
                          return (((selectedEmployeeData.tronc || 0) / (22 * workHoursPerDay)) * totalHours).toFixed(2)
                        })()}
                      </Typography>
                    </Grid>
                  </>
                )}

                {selectedEmployeeData.bonus !== undefined && selectedEmployeeData.bonus > 0 && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Bonus (proportional):
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        £{(() => {
                          // Handle overnight shifts - if endTime is before startTime, add 24 hours
                          let totalHours = differenceInMinutes(formData.endTime, formData.startTime) / 60
                          if (totalHours < 0) totalHours += 24
                          const workHoursPerDay = (selectedEmployeeData.hoursPerWeek || 40) / 5
                          return (((selectedEmployeeData.bonus || 0) / (22 * workHoursPerDay)) * totalHours).toFixed(2)
                        })()}
                      </Typography>
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Total Estimated Cost:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    £{estimatedCost !== null ? estimatedCost.toFixed(2) : "0.00"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
            {editMode ? "Update Shift" : "Create Shift"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog - Removed as handlers are not implemented */}

      {/* AI Suggestions Preview Dialog */}

      {/* Old Bulk Schedule Dialog - Commented out */}
      {/* <Dialog open={bulkScheduleMode} onClose={() => setBulkScheduleMode(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Bulk Schedule</Typography>
            <IconButton onClick={() => setBulkScheduleMode(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Select Employees
          </Typography>
          <List sx={{ maxHeight: 200, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
            {hrState.employees.map((employee) => (
              <ListItem key={employee.id} divider>
                <ListItemText
                  primary={`${employee.firstName} ${employee.lastName}`}
                  secondary={`${employee.department || "No Department"} • ${
                    employee.roleId ? roles.find((r) => r.id === employee.roleId)?.name || "No Role" : "No Role"
                  }`}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={() => handleEmployeeToggle(employee.id)}
                    checked={selectedEmployees.includes(employee.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Select Days
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-around", mb: 2 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={selectedDays.includes(index + 1)}
                    onChange={() => handleDayToggle(index + 1)}
                    name={day}
                  />
                }
                label={day}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Schedule Details
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={formData.startTime ? format(formData.startTime, "HH:mm") : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startTime: e.target.value ? parseISO(`2000-01-01T${e.target.value}`) : null,
                })
              }
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={formData.endTime ? format(formData.endTime, "HH:mm") : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endTime: e.target.value ? parseISO(`2000-01-01T${e.target.value}`) : null,
                })
              }
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
          <FormControl fullWidth margin="dense">
            <InputLabel>Department</InputLabel>
            <Select
              name="department"
              value={formData.department}
              onChange={handleSelectChange}
              label="Department"
              required
            >
              {departmentsList.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role || ""} onChange={handleSelectChange} label="Role">
              <MenuItem value="">No Role</MenuItem>
              {rolesList.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Shift Type</InputLabel>
              <Select name="shiftType" value={formData.shiftType} onChange={handleSelectChange} label="Shift Type">
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="off">Day Off</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel>Pay Type</InputLabel>
              <Select name="payType" value={formData.payType} onChange={handleSelectChange} label="Pay Type">
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="flat">Flat Rate</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {formData.payType === "flat" && (
            <TextField
              fullWidth
              margin="dense"
              label="Pay Rate"
              type="number"
              value={formData.payRate || ""}
              onChange={(e) =>
                setFormData({ ...formData, payRate: e.target.value ? Number(e.target.value) : undefined })
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">£</InputAdornment>,
              }}
            />
          )}

          <TextField
            fullWidth
            margin="dense"
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkScheduleMode(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleBulkScheduleSubmit} variant="contained" color="primary" disabled={loading}>
            Create Bulk Schedules
          </Button>
        </DialogActions>
      </Dialog> */}

      {/* Enhanced Bulk Schedule CRUD Modal */}
      <CRUDModal
        open={bulkScheduleMode}
        onClose={() => {
          setBulkScheduleMode(false)
        }}
        workspaceFormShortcut={{
          crudEntity: "scheduleManagerModal1",
          crudMode: "create",
        }}
        title="Bulk Schedule"
        icon={<AssignmentIcon />}
        mode="create"
        maxWidth="md"
        fullWidth
        hideSaveButton
      >
        <BulkScheduleForm
          onSubmit={handleBulkScheduleSubmit}
          loading={loading}
        />
      </CRUDModal>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleNotificationClose} severity={notification?.type || "info"} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>

      {/* CRUD Modal - For individual shifts */}
      <CRUDModal
        open={scheduleCRUDModalOpen}
        onClose={(reason) => {
          setScheduleCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedScheduleForCRUD(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "scheduleManagerModal2",
          crudMode: crudMode,
          id: selectedScheduleForCRUD?.id,
          itemLabel:
            selectedScheduleForCRUD?.employeeName && selectedScheduleForCRUD?.date
              ? `${selectedScheduleForCRUD.employeeName} · ${selectedScheduleForCRUD.date}`
              : undefined,
        }}
        title={crudMode === 'create' ? 'Add Shift' : crudMode === 'edit' ? 'Edit Shift' : 'View Shift'}
        icon={<AssignmentIcon />}
        mode={crudMode}
        maxWidth="md"
        formRef={shiftFormRef}
        cancelButtonText={undefined}
        hideCloseButton={true}
        hideCloseAction={true}
        hideSaveButton={crudMode === "view"}
        onSave={crudMode !== "view" ? () => shiftFormRef.current?.submit() : undefined}
      >
        <ShiftForm
          ref={shiftFormRef}
          shift={selectedScheduleForCRUD as any}
          mode={crudMode}
          onSave={handleSaveScheduleCRUD}
          employees={hrState.employees}
        />
      </CRUDModal>

      {/* Delete Shift Confirmation */}
      <Dialog
        open={deleteShiftConfirmOpen}
        onClose={() => setDeleteShiftConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete shift?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the shift{selectedScheduleForCRUD?.employeeName ? ` for ${selectedScheduleForCRUD.employeeName}` : ""}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteShiftConfirmOpen(false)} disabled={deleteShiftLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteShift}
            color="error"
            variant="contained"
            disabled={deleteShiftLoading}
            startIcon={<DeleteIcon />}
          >
            {deleteShiftLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rota Approval Dialog */}
      <Dialog open={showApprovalDialog} onClose={() => setShowApprovalDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Approve Rota</Typography>
            <IconButton onClick={() => setShowApprovalDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to approve all draft shifts? This will change their status to "scheduled" and they will be visible to employees.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hrState.schedules.filter(s => s.status === 'draft').length} draft shifts will be approved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApprovalDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApproveRota} variant="contained" color="primary" disabled={loading || approvingRota}>
            Approve Rota
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shift Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onClose={() => setShowConfirmationDialog(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Confirm Shifts - {selectedDateForConfirmation}</Typography>
            <IconButton onClick={() => setShowConfirmationDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Confirm clock in/out times and locations for all scheduled shifts on this date. This will change their status to "completed".
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Clock In Time"
                type="time"
                value={confirmationData.clockInTime}
                onChange={(e) => setConfirmationData(prev => ({ ...prev, clockInTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Clock Out Time"
                type="time"
                value={confirmationData.clockOutTime}
                onChange={(e) => setConfirmationData(prev => ({ ...prev, clockOutTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Clock In Location"
                value={confirmationData.clockInLocation}
                onChange={(e) => setConfirmationData(prev => ({ ...prev, clockInLocation: e.target.value }))}
                placeholder="e.g., Main Office, Store Front"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Clock Out Location"
                value={confirmationData.clockOutLocation}
                onChange={(e) => setConfirmationData(prev => ({ ...prev, clockOutLocation: e.target.value }))}
                placeholder="e.g., Main Office, Store Front"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Actual Hours (optional - will be calculated from times)"
                type="number"
                value={confirmationData.actualHours}
                onChange={(e) => setConfirmationData(prev => ({ ...prev, actualHours: Number(e.target.value) }))}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
          </Grid>

          {/* Schedule Summary Table */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Scheduled Shifts for {selectedDateForConfirmation}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Scheduled Start</TableCell>
                  <TableCell>Scheduled End</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hrState.schedules
                  .filter(s => s.date === selectedDateForConfirmation && s.status === 'scheduled')
                  .map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.employeeName}</TableCell>
                      <TableCell>{schedule.startTime}</TableCell>
                      <TableCell>{schedule.endTime}</TableCell>
                      <TableCell>{schedule.department}</TableCell>
                      <TableCell>
                        <Chip 
                          label={schedule.status} 
                          size="small" 
                          color="warning"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmationDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmShifts} variant="contained" color="primary" disabled={loading || confirmingShifts || !selectedDateForConfirmation}>
            Confirm Shifts
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Calendar Modal */}
      <AICalendarModal
        open={aiCalendarModalOpen}
        onClose={() => setAiCalendarModalOpen(false)}
        currentWeekStart={currentWeekStart}
        onSchedulesUpdated={handleSchedulesUpdated}
        existingSchedules={hrState.schedules}
        bookingData={bookingsData || []}
        aiSuggestions={aiSuggestions as any}
      />
    </Box>
  )
}

export default ScheduleManager
