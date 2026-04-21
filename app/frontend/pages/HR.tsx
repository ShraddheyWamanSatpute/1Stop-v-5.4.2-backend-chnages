"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Box,
  Typography,
  Button,
  useTheme,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Paper,
  IconButton,
} from "@mui/material"
import {
  Person,
  Group,
  Work,
  EventNote,
  Badge as BadgeIcon,
  Dashboard,
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import { useHR } from "../../backend/context/HRContext"
import { useCompany } from "../../backend/context/CompanyContext"
import { useBookings } from "../../backend/context/BookingsContext"
import { useAnalytics } from "../../backend/context/AnalyticsContext"
import { useNavigate, useLocation } from "react-router-dom"

// Import all HR components
import {
  EmployeeList,
  RoleManagement,
  ScheduleManager,
  FinalizeShifts,
  PayrollManagement,
  ServiceChargeAllocationPage,
  PerformanceReviewManagement,
  RecruitmentManagement,
  BenefitsManagement,
  WarningsTracking,
  ComplianceTracking,
  TimeOffManagement,
  AnnouncementsManagement,
  EmployeeSelfService,
  DepartmentManagement,
  EventsManagement,
  HRReportsDashboard,
  DiversityInclusion,
  ExpensesManagement,
  ContractsManagement,
  TrainingManagement,
  StarterChecklist,
} from "../components/hr/index"
import HRSettings from "../components/hr/Settings"

// Import date-fns
import { format, subDays, addDays, startOfMonth, startOfYear } from "date-fns"
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

// Import Rnd for resizable and draggable components
import { Rnd } from "react-rnd"

// Import custom hooks and components for widget management
import useWidgetManager from "../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../hooks/useResponsiveWidgetCanvas"
import WidgetContextMenu from "../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../components/reusable/WidgetSettingsDialog"
import DynamicWidget from "../components/reusable/DynamicWidget"
import { DataType, WidgetType } from "../types/WidgetTypes"
import DashboardHeader from "../components/reusable/DashboardHeader"
import EmptyStateCard from "../components/reusable/EmptyStateCard"
import { themeConfig } from "../../theme/AppTheme"
import { alpha } from "@mui/material/styles"
import usePersistentBoolean from "../hooks/usePersistentBoolean"


// Define the GRID_CELL_SIZE constant
const GRID_CELL_SIZE = 20

const getHRDataTypes = (getAvailableDataTypes?: (section?: string) => Array<{ value: string; label: string; category: string }>) => {
  return [
    { value: DataType.TIME_OFF_REQUESTS, label: "Holidays", category: "HR" },
    { value: DataType.TRAINING, label: "Training", category: "HR" },
    { value: DataType.PAYROLL, label: "Payroll", category: "HR" },
    { value: DataType.RECRUITMENT, label: "Recruitment", category: "HR" },
    { value: DataType.ATTENDANCE, label: "Attendance", category: "HR" },
    { value: DataType.PERFORMANCE, label: "Performance", category: "HR" },
    { value: DataType.TOTAL_ITEMS, label: "Employees", category: "HR" },
  ]
}

const getHRCardDataTypes = () => [
  { value: DataType.TIME_OFF_REQUESTS, label: "Holidays" },
  { value: DataType.TRAINING, label: "Training" },
  { value: DataType.PAYROLL, label: "Payroll" },
  { value: DataType.RECRUITMENT, label: "Recruitment" },
  { value: DataType.ATTENDANCE, label: "Attendance" },
  { value: DataType.PERFORMANCE, label: "Performance" },
  { value: DataType.TOTAL_ITEMS, label: "Employees" },
]

const slugToPascalSegment = (slug: string) => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

type SchedulingSectionProps = {
  dateRange: { startDate: Date; endDate: Date }
  bookingsData?: any[]
  businessHours?: any
}

/**
 * Scheduling has its own in-page navigation (DataHeader buttons).
 * We intentionally avoid rendering HR sub-tabs ("Rota" / "Finalize Shifts") above the DataHeader.
 */
const SchedulingSection: React.FC<SchedulingSectionProps> = ({ dateRange, bookingsData, businessHours }) => {
  const location = useLocation()
  const path = String(location.pathname || "").replace(/\/+$/, "").toLowerCase()

  const isFinalize =
    path === "/hr/scheduling/finalizeshifts" ||
    path.startsWith("/hr/scheduling/finalizeshifts/") ||
    path === "/hr/scheduling/finalize-shifts" ||
    path.startsWith("/hr/scheduling/finalize-shifts/") ||
    path === "/hr/scheduling/finaliseshifts" ||
    path.startsWith("/hr/scheduling/finaliseshifts/") ||
    path === "/hr/scheduling/finalise-shifts" ||
    path.startsWith("/hr/scheduling/finalise-shifts/")

  if (isFinalize) return <FinalizeShifts />

  return <ScheduleManager dateRange={dateRange} bookingsData={bookingsData} businessHours={businessHours} />
}

const HR = () => {
  const theme = useTheme()
  const { state: hrState, refreshEmployees, refreshDepartments, refreshRoles, refreshTrainings, refreshAttendances, refreshPayrolls, refreshPerformanceReviews } = useHR()
  const { state: companyState, hasPermission } = useCompany()
  const { bookings, bookingSettings, initialized: bookingsInitialized } = useBookings()
  const { getAvailableDataTypes } = useAnalytics()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Track if component has been initialized to prevent duplicate renders
  const isInitialized = React.useRef(false)
  const hasTriggeredRefresh = React.useRef<string | null>(null) // Track which company we've refreshed for
  
  // Check if providers are actually available (not just initialized)
  // Providers return empty context when not loaded, so we check if we have a real provider
  const hrProviderAvailable = hrState !== undefined && (hrState.initialized !== undefined || hrState.employees !== undefined)
  const bookingsProviderAvailable = bookingsInitialized !== undefined || bookings !== undefined
  
  // Trigger data refresh only once when component mounts or company changes
  // This ensures data is loaded even if the HRContext thinks it's already loaded
  useEffect(() => {
    // Only trigger if we have a company context
    if (!companyState.companyID || !hrProviderAvailable) {
      return
    }
    
    // Skip if we've already refreshed for this company
    if (hasTriggeredRefresh.current === companyState.companyID) {
      return
    }
    
    // Only check once - if initialized but no data, trigger refresh
    // Use a timeout to ensure this only runs once after mount
    const timeoutId = setTimeout(() => {
      // Check if data is empty
      const hasNoData = !hrState.employees?.length && 
                        !hrState.departments?.length && 
                        !hrState.roles?.length &&
                        hrState.initialized &&
                        !hrState.isLoading
      
      // Only trigger refresh if data is empty
      if (hasNoData) {
        hasTriggeredRefresh.current = companyState.companyID
        
        // Trigger refresh of all HR data when navigating to HR section
        const refreshHRData = async () => {
          try {
            await Promise.all([
              refreshEmployees().catch(() => {}),
              refreshDepartments().catch(() => {}),
              refreshRoles().catch(() => {}),
              refreshTrainings().catch(() => {}),
              refreshAttendances().catch(() => {}),
              refreshPayrolls().catch(() => {}),
              refreshPerformanceReviews().catch(() => {}),
            ])
          } catch (error) {
            // silent
          }
        }
        
        refreshHRData()
      } else {
        // If we have data, mark as refreshed for this company
        hasTriggeredRefresh.current = companyState.companyID
      }
    }, 100) // Small delay to ensure state is stable
    
    return () => clearTimeout(timeoutId)
  }, [companyState.companyID, hrProviderAvailable]) // Only depend on company ID and provider availability
  
  // Wait for HR and Bookings providers to be available before rendering
  // Allow rendering even if not fully initialized (empty state is valid)
  // Only show loading if providers aren't loaded at all
  if (!hrProviderAvailable || !bookingsProviderAvailable) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "background.default",
          px: 2,
        }}
      >
        <EmptyStateCard
          icon={SettingsIcon}
          title="HR module is initializing"
          description="Please wait a moment while providers load."
          cardSx={{ width: "100%", maxWidth: 560 }}
        />
      </Box>
    )
  }
  
  // Memoize HR data to prevent unnecessary re-renders
  const hrDataSnapshot = React.useMemo(() => ({
    employees: hrState.employees || [],
    departments: hrState.departments || [],
    trainings: hrState.trainings || [],
    attendances: hrState.attendances || [],
    performanceReviews: hrState.performanceReviews || [],
    payrollRecords: hrState.payrollRecords || [],
    jobPostings: hrState.jobPostings || [],
    timeOffRequests: (hrState as any).timeOffRequests || [],
  }), [
    hrState.employees?.length,
    hrState.departments?.length,
    hrState.trainings?.length,
    hrState.attendances?.length,
    hrState.performanceReviews?.length,
    hrState.payrollRecords?.length,
    hrState.jobPostings?.length,
    (hrState as any).timeOffRequests?.length,
  ])
  
  // Debug logging for business hours (only log once after initialization)
  React.useEffect(() => {
    if (!isInitialized.current && hrState.employees?.length > 0) {
      isInitialized.current = true
    }
  }, [hrState.employees?.length, hrState.departments?.length, bookings?.length])

  // All hooks must be called before any conditional returns
  const [activeTab, setActiveTab] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  

  // Dashboard widget state - moved from renderDashboard to top level
  const [isEditing, setIsEditing] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<string>("last7days")
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false)
  const [clearWidgetsDialogOpen, setClearWidgetsDialogOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    widgetId: string
  } | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false)
  const [currentWidgetSettings, setCurrentWidgetSettings] = useState<any>(null)
  const [widgetDialogMode, setWidgetDialogMode] = useState<"create" | "edit">("edit")
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState<string | null>(null)

  // Date range state
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: subDays(new Date(), 30), // Last 30 days for broader view
    endDate: addDays(new Date(), 30), // Next 30 days for broader view
  })
  const [frequency, setFrequency] = useState<string>("daily")

  // Widget management - MUST be called before any conditional returns
  const {
    dashboardState,
    selectedWidgetId,
    setSelectedWidgetId,
    updateWidgetPosition,
    updateWidgetSize,
    updateWidgetSettings,
    removeWidget,
    addWidget,
    getWidgetSettings,
    calculateContainerHeight,
    clearAllWidgets,
    revertDashboard,
  } = useWidgetManager('hr')

  // Calculate container height based on widget positions
  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // Get data for widget based on its type - using HR context data
  const getWidgetData = useCallback((widget: any) => {
    if (!widget || !widget.dataType) return { history: [] }

    const rawDataType = String(widget.dataType || "")
    const dataType =
      rawDataType === "timeOff" || rawDataType === "timeOffRequests" || rawDataType === "holidays" || rawDataType === "holidayRequests"
        ? DataType.TIME_OFF_REQUESTS
        : widget.dataType

    // Calculate metrics from memoized HR data snapshot
    const totalEmployees = hrDataSnapshot.employees.length
    const averageTrainingCompletion = hrDataSnapshot.trainings.length
      ? Math.round(
          (hrDataSnapshot.trainings.filter((t: any) => t.status === 'completed').length / hrDataSnapshot.trainings.length) * 100
        )
      : 0
    const averagePerformanceScore = hrDataSnapshot.performanceReviews.length
      ? Math.round(
          hrDataSnapshot.performanceReviews.reduce((acc: number, review: any) => acc + (review.overallScore || 0), 0) /
            hrDataSnapshot.performanceReviews.length,
        )
      : 0
    const attendanceRate = hrDataSnapshot.attendances.length
      ? Math.round(
          (hrDataSnapshot.attendances.filter((record: any) => record.status === "present").length /
            hrDataSnapshot.attendances.length) *
            100,
        )
      : 0

    // Generate historical data based on date range and frequency
    const generateHistoricalData = (baseValue: number, _variationFactor: number = 0.1) => {
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let dataPoints: number
      let dateIncrement: number
      
      switch (frequency) {
        case "hourly":
          dataPoints = Math.min(daysDiff * 24, 168) // Max 1 week of hourly data
          dateIncrement = 1 / 24
          break
        case "daily":
          dataPoints = Math.min(daysDiff, 90) // Max 90 days
          dateIncrement = 1
          break
        case "weekly":
          dataPoints = Math.min(Math.ceil(daysDiff / 7), 52) // Max 52 weeks
          dateIncrement = 7
          break
        case "monthly":
          dataPoints = Math.min(Math.ceil(daysDiff / 30), 24) // Max 24 months
          dateIncrement = 30
          break
        case "quarterly":
          dataPoints = Math.min(Math.ceil(daysDiff / 90), 8) // Max 8 quarters (2 years)
          dateIncrement = 90
          break
        case "yearly":
          dataPoints = Math.min(Math.ceil(daysDiff / 365), 5) // Max 5 years
          dateIncrement = 365
          break
        default:
          dataPoints = Math.min(daysDiff, 30) // Default to 30 days max
          dateIncrement = 1
      }
      
      return Array.from({ length: dataPoints }).map((_, i) => {
        const currentDate = new Date(startDate.getTime() + (i * dateIncrement * 24 * 60 * 60 * 1000))
        const date = format(currentDate, "yyyy-MM-dd")
        const variation = 0.9 + (((Math.sin((i + 1) * 1.618) + 1) / 2) * 0.2)
        return {
          date,
          value: Math.max(0, Math.round(baseValue * variation)),
        }
      })
    }

    const isChartOrTable =
      widget.type === WidgetType.BAR_CHART ||
      widget.type === WidgetType.LINE_CHART ||
      widget.type === WidgetType.PIE_CHART ||
      widget.type === WidgetType.TABLE ||
      widget.type === WidgetType.MULTIPLE_SERIES_LINE_CHART

    if (isChartOrTable) {
      const hashSeed = (input: string) => {
        let h = 2166136261
        for (let i = 0; i < input.length; i++) {
          h ^= input.charCodeAt(i)
          h = Math.imul(h, 16777619)
        }
        return h >>> 0
      }
      const mulberry32 = (a: number) => () => {
        let t = (a += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const rngFor = (key: string) =>
        mulberry32(
          hashSeed(
            `hr-widget|${widget.id}|${key}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`,
          ),
        )

      const baseFor = (dt: DataType) => {
        switch (dt) {
          case DataType.TOTAL_ITEMS:
            return totalEmployees
          case DataType.ATTENDANCE:
            return attendanceRate
          case DataType.PERFORMANCE:
            return averagePerformanceScore
          case DataType.TRAINING:
            return averageTrainingCompletion
          default:
            return totalEmployees
        }
      }

      const seriesList = Array.isArray(widget.dataSeries) ? widget.dataSeries.filter((s: any) => s?.visible !== false) : []
      const effectiveSeries =
        seriesList.length > 0
          ? seriesList
          : widget.dataType
            ? [{ dataType: widget.dataType, displayMode: widget.displayMode || "quantity", label: "Series 1", color: themeConfig.brandColors.navy, visible: true }]
            : []

      const dates = generateHistoricalData(1).map((d) => d.date)

      if ((widget as any)?.dataConfigMode === "breakdown" && (widget as any)?.breakdownBy) {
        const dt0 = (effectiveSeries[0]?.dataType || widget.dataType || DataType.TOTAL_ITEMS) as DataType
        const mode0 = (effectiveSeries[0]?.displayMode || widget.displayMode || "quantity") as any
        const buckets = ["A", "B", "C", "D"].map((k) => ({ key: k, label: k }))
        const labels = widget.type === WidgetType.PIE_CHART ? buckets.map((b) => b.label) : dates
        const datasets =
          widget.type === WidgetType.PIE_CHART
            ? [
                {
                  label: String(dt0),
                  data: buckets.map((b, idx) => {
                    const r = rngFor(`breakdown-pie|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
                    return Math.max(0, baseFor(dt0) * (0.6 + r() * 0.8) * (0.4 + (idx + 1) / (buckets.length + 2)))
                  }),
                  backgroundColor: buckets.map((_b, i) => widget.colors?.series?.[i] || themeConfig.brandColors.navy),
                },
              ]
            : buckets.map((b, idx) => {
                const r = rngFor(`breakdown|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
                const base = baseFor(dt0)
                return {
                  label: b.label,
                  data: dates.map((_d, i) => {
                    const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, dates.length - 1)) * Math.PI * 2)
                    const jitter = 0.88 + r() * 0.24
                    return Math.max(0, base * wave * jitter * (0.4 + (idx + 1) / (buckets.length + 2)))
                  }),
                  borderColor: widget.colors?.series?.[idx] || themeConfig.brandColors.navy,
                  backgroundColor: widget.colors?.series?.[idx] || themeConfig.brandColors.navy,
                }
              })

        const baseValue = baseFor(dt0)
        return {
          [dt0]: { price: baseValue, quantity: baseValue, percentage: baseValue, score: baseValue, value: baseValue, options: {} },
          breakdownChartData: { labels, datasets },
          breakdownMeta: { displayMode: mode0 },
        }
      }

      const history = dates.map((date, i) => {
        const row: any = { date }
        for (const s of effectiveSeries) {
          const dt = s.dataType as DataType
          const optKey = typeof s.dataOption === "string" ? s.dataOption : undefined
          const r = rngFor(`series|${String(dt)}|${String(optKey || "base")}`)
          const base = baseFor(dt)
          const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, dates.length - 1)) * Math.PI * 2)
          const jitter = 0.88 + r() * 0.24
          const v = base * wave * jitter
          row[dt] = row[dt] || { price: 0, quantity: 0, percentage: 0, score: 0, options: {} }
          const bucket = { price: v, quantity: v, percentage: v, score: v }
          if (optKey) {
            row[dt].options[optKey] = bucket
            if (!row[dt].price && !row[dt].quantity && !row[dt].percentage && !row[dt].score) Object.assign(row[dt], bucket)
          } else {
            Object.assign(row[dt], bucket)
          }
        }
        return row
      })

      return { history }
    }

    // Handle stat and dashboard card widgets
    if (widget.type === WidgetType.CARD || widget.type === WidgetType.DASHBOARD_CARD || widget.type === WidgetType.STAT) {
      switch (dataType) {
        case DataType.TOTAL_ITEMS:
          return {
            totalItems: totalEmployees,
            history: generateHistoricalData(totalEmployees).map((item) => ({
              date: item.date,
              totalItems: { quantity: item.value },
            })),
          }
        case DataType.ATTENDANCE:
          return {
            attendanceRate: attendanceRate,
            history: generateHistoricalData(attendanceRate, 0.05).map((item) => ({
              date: item.date,
              attendance: { rate: item.value },
            })),
          }
        case DataType.PERFORMANCE:
          return {
            performanceScore: averagePerformanceScore,
            history: generateHistoricalData(averagePerformanceScore, 0.1).map((item) => ({
              date: item.date,
              performance: { score: item.value },
            })),
          }
        case DataType.TURNOVER:
          const turnoverRate = hrDataSnapshot.employees.length
            ? Math.round(
                (hrDataSnapshot.employees.filter((e: any) => e.status === "terminated").length / hrDataSnapshot.employees.length) * 100,
              )
            : 0
          return {
            turnoverRate: turnoverRate,
            history: generateHistoricalData(turnoverRate, 0.2).map((item) => ({
              date: item.date,
              turnover: { rate: item.value },
            })),
          }
        case DataType.RECRUITMENT:
          const avgTimeToHire = hrDataSnapshot.jobPostings.length
            ? Math.round(
                hrDataSnapshot.jobPostings.reduce((acc: number, job: any) => acc + (job.daysToFill || 21), 0) / hrDataSnapshot.jobPostings.length,
              )
            : 21
          return {
            timeToHire: avgTimeToHire,
            history: generateHistoricalData(15, 0.3).map((item) => ({
              date: item.date,
              recruitment: { timeToHire: item.value },
            })),
          }
        case DataType.TRAINING:
          return {
            trainingCompletion: averageTrainingCompletion,
            history: generateHistoricalData(averageTrainingCompletion, 0.1).map((item) => ({
              date: item.date,
              training: { completion: item.value },
            })),
          }
        case DataType.PAYROLL:
          const totalPayroll = hrDataSnapshot.payrollRecords.reduce((acc: number, record: any) => acc + (record.grossPay || 0), 0) || 45000
          return {
            payrollCost: totalPayroll,
            history: generateHistoricalData(totalPayroll, 0.05).map((item) => ({
              date: item.date,
              payroll: { cost: item.value },
            })),
          }
        case DataType.TIME_OFF_REQUESTS:
          const holidaysCount = hrDataSnapshot.timeOffRequests?.length || 0
          return {
            timeOffRequests: holidaysCount,
            [DataType.TIME_OFF_REQUESTS]: { quantity: holidaysCount, price: 0, percentage: 0, score: 0, value: holidaysCount, options: {} },
            history: generateHistoricalData(holidaysCount || 1, 0.2).map((item) => ({
              date: item.date,
              timeOffRequests: { count: item.value },
            })),
          }
      }
    }

    // For charts, provide the history data
    switch (dataType) {
      case DataType.TOTAL_ITEMS:
        return {
          history: generateHistoricalData(totalEmployees).map((item) => ({
            date: item.date,
            totalItems: { quantity: item.value },
          })),
        }
      case DataType.ATTENDANCE:
        return {
          history: generateHistoricalData(20, 0.2).map((item) => ({
            date: item.date,
            attendance: {
              present: item.value,
              absent: Math.max(0, 25 - item.value),
              late: i % 3,
            },
          })),
        }
      case DataType.PERFORMANCE:
        return {
          history: generateHistoricalData(averagePerformanceScore, 0.1).map((item) => ({
            date: item.date,
            performance: { score: item.value },
          })),
        }
      case DataType.RECRUITMENT:
        return {
          history: generateHistoricalData(15, 0.3).map((item) => ({
            date: item.date,
            recruitment: {
              applicants: item.value,
              hired: Math.floor(item.value * 0.2),
            },
          })),
        }
        case DataType.DEPARTMENTS:
        case DataType.EMPLOYEES_BY_DEPARTMENT:
          return {
            data: hrDataSnapshot.departments.map((dept: any) => ({
              department: dept.name,
              employees: hrDataSnapshot.employees.filter((emp: any) => 
                emp.departmentId === dept.id || emp.department === dept.name || emp.department === dept.id
              ).length,
              value: hrDataSnapshot.employees.filter((emp: any) => 
                emp.departmentId === dept.id || emp.department === dept.name || emp.department === dept.id
              ).length
            })),
            history: generateHistoricalData(totalEmployees).map((item) => ({
              date: item.date,
              departments: { employees: item.value },
            })),
          }
        case DataType.ATTENDANCE_TRENDS:
          return {
            history: generateHistoricalData(attendanceRate, 0.05).map((item) => ({
              date: item.date,
              attendanceTrends: { rate: item.value },
            })),
          }
        case DataType.PERFORMANCE_METRICS:
          return {
            history: generateHistoricalData(averagePerformanceScore, 0.1).map((item) => ({
              date: item.date,
              performanceMetrics: { score: item.value },
            })),
          }
        case DataType.TRAINING_PROGRESS:
          return {
            history: generateHistoricalData(averageTrainingCompletion, 0.1).map((item) => ({
              date: item.date,
              trainingProgress: { completion: item.value },
            })),
          }
        case DataType.PAYROLL_BREAKDOWN:
          const payrollBreakdown = hrDataSnapshot.payrollRecords.reduce((acc: Record<string, number>, record: any) => {
            const department = hrDataSnapshot.employees.find((emp: any) => emp.id === record.employeeId)?.department || 'Unknown'
            acc[department] = (acc[department] || 0) + (record.grossPay || 0)
            return acc
          }, {} as Record<string, number>)
          
          return {
            data: Object.entries(payrollBreakdown).map(([department, amount]) => ({
              department,
              amount,
              value: amount,
              count: hrDataSnapshot.employees.filter((emp: any) => emp.department === department).length
            })),
            history: generateHistoricalData(45000, 0.05).map((item) => ({
              date: item.date,
              payrollBreakdown: { cost: item.value },
            })),
          }
        case DataType.TIME_OFF_REQUESTS:
          return {
            history: generateHistoricalData(5, 0.3).map((item) => ({
              date: item.date,
              timeOffRequests: { count: item.value },
            })),
          }
        case DataType.RECRUITMENT_FUNNEL:
          return {
            history: generateHistoricalData(15, 0.3).map((item) => ({
              date: item.date,
              recruitmentFunnel: { applicants: item.value },
            })),
          }
        case DataType.TURNOVER_ANALYSIS:
          const turnoverRateForAnalysis = hrDataSnapshot.employees.length
            ? Math.round(
                (hrDataSnapshot.employees.filter((e: any) => e.status === "terminated").length / hrDataSnapshot.employees.length) * 100,
              )
            : 0
          return {
            history: generateHistoricalData(turnoverRateForAnalysis, 0.2).map((item) => ({
              date: item.date,
              turnoverAnalysis: { rate: item.value },
            })),
          }
      default:
        return { history: generateHistoricalData(totalEmployees) }
    }
  }, [
    dateRange, 
    frequency, 
    hrDataSnapshot
  ])

  // Default dashboard setup is now handled by useWidgetManager with section-specific layouts

  // Define main navigation categories with permission checks
  const mainCategories = useMemo(() => [
    {
      id: 0,
      label: "Dashboard",
      slug: "dashboard",
      icon: <Dashboard />,
      component: null, // Dashboard is handled separately
      permission: hasPermission("hr", "dashboard", "view"),
    },
    {
      id: 1,
      label: "Employees",
      slug: "employees",
      icon: <Person />,
      component: <EmployeeList />,
      permission: hasPermission("hr", "employees", "view"),
    },
    {
      id: 2,
      label: "Scheduling",
      slug: "scheduling",
      icon: <EventNote />,
      component: (
        <SchedulingSection
          dateRange={dateRange}
          bookingsData={bookings}
          businessHours={bookingSettings?.businessHours}
        />
      ),
      permission: hasPermission("hr", "scheduling", "view"),
    },
    {
      id: 3,
      label: "Time Off",
      slug: "time-off",
      icon: <BadgeIcon />,
      component: <TimeOffManagement />,
      permission: hasPermission("hr", "timeoff", "view"),
    },
    {
      id: 4,
      label: "Payroll",
      slug: "payroll",
      icon: <Work />,
      component: <PayrollManagement />,
      permission: hasPermission("hr", "payroll", "view"),
    },
    {
      id: 5,
      label: "Self Service",
      slug: "self-service",
      icon: <BadgeIcon />,
      component: <EmployeeSelfService />,
      permission: hasPermission("hr", "selfservice", "view"),
    },
    {
      id: 6,
      label: "Management",
      slug: "management",
      icon: <Group />,
      permission:
        hasPermission("hr", "performance", "view") ||
        hasPermission("hr", "recruitment", "view") ||
        hasPermission("hr", "roles", "view") ||
        hasPermission("hr", "departments", "view") ||
        hasPermission("hr", "announcements", "view") ||
        hasPermission("hr", "training", "view") ||
        hasPermission("hr", "benefits", "view") ||
        hasPermission("hr", "expenses", "view") ||
        hasPermission("hr", "compliance", "view") ||
        hasPermission("hr", "employees", "view"),
      subTabs: [
        {
          id: "contracts",
          label: "Contracts",
          component: <ContractsManagement />,
          permission: hasPermission("hr", "employees", "view"),
        },
        {
          id: "performance",
          label: "Staff Performance",
          component: <PerformanceReviewManagement />,
          permission: hasPermission("hr", "performance", "view"),
        },
        {
          id: "recruitment",
          label: "Recruitment",
          component: <RecruitmentManagement />,
          permission: hasPermission("hr", "recruitment", "view"),
        },
        {
          id: "warnings",
          label: "Warnings",
          component: <WarningsTracking />,
          permission: hasPermission("hr", "warnings", "view"),
        },
        {
          id: "roles",
          label: "Roles",
          component: <RoleManagement />,
          permission: hasPermission("hr", "roles", "view"),
        },
        {
          id: "departments",
          label: "Departments",
          component: <DepartmentManagement />,
          permission: hasPermission("hr", "departments", "view"),
        },
        {
          id: "announcements",
          label: "Announcements",
          component: <AnnouncementsManagement />,
          permission: hasPermission("hr", "announcements", "view"),
        },
        {
          id: "training",
          label: "Training",
          component: <TrainingManagement />,
          permission: hasPermission("hr", "training", "view"),
        },
        {
          id: "benefits",
          label: "Benefits",
          component: <BenefitsManagement />,
          permission: hasPermission("hr", "benefits", "view"),
        },
        {
          id: "expenses",
          label: "Expenses",
          component: <ExpensesManagement />,
          permission: hasPermission("hr", "expenses", "view"),
        },
        {
          id: "starter-checklist",
          label: "Starter Checklist",
          component: <StarterChecklist />,
          permission: hasPermission("hr", "employees", "view"),
        },
        {
          id: "risk",
          label: "Risk & Compliance",
          component: <ComplianceTracking />,
          permission: hasPermission("hr", "compliance", "view"),
        },
        {
          id: "events",
          label: "Events",
          component: <EventsManagement />,
          permission: hasPermission("hr", "events", "view"),
        },
        {
          id: "diversity",
          label: "Diversity & Inclusion",
          component: <DiversityInclusion />,
          permission: hasPermission("hr", "diversity", "view"),
        },
      ],
    },
    {
      id: 7,
      label: "Reports",
      slug: "reports",
      icon: <BarChartIcon />,
      component: <HRReportsDashboard />,
      permission: hasPermission("hr", "reports", "view"),
    },
    {
      id: 8,
      label: "Settings",
      slug: "settings",
      icon: <SettingsIcon />,
      component: <HRSettings />,
      // Visibility is controlled by view permission (edit/delete handled inside pages)
      permission: hasPermission("hr", "settings", "view"),
    },
  ], [hasPermission, dateRange, bookings, bookingSettings?.businessHours])

  // Memoize visibleCategories to prevent unnecessary re-renders
  const memoizedVisibleCategories = React.useMemo(() => {
    return mainCategories
      .filter((category) => category.permission)
      .map((category) => ({
        ...category,
        subTabs: category.subTabs?.filter((subTab) => subTab.permission),
      }))
  }, [mainCategories])

  // Use memoized visible categories
  const visibleCategories = memoizedVisibleCategories

  useEffect(() => {
    if (activeTab >= visibleCategories.length) {
      setActiveTab(0)
    }
  }, [visibleCategories.length, activeTab])

  // Initialize activeSubTab when component mounts or when activeTab changes
  const initializeActiveSubTab = () => {
    // Make sure activeTab is valid and the tab exists
    const currentTab = visibleCategories[activeTab]
    // If the current tab has subtabs, ensure activeSubTab is set to a valid value
    if (currentTab && currentTab.subTabs && currentTab.subTabs.length > 0) {
      // If activeSubTab is null or doesn't match any available subtab, set it to the first subtab
      const availableSubTabs = currentTab.subTabs.map((tab) => tab.id)
      if (!activeSubTab || !availableSubTabs.includes(activeSubTab)) {
        setActiveSubTab(availableSubTabs[0])
      }
    } else {
      // If the current tab doesn't have subtabs, reset activeSubTab to null
      setActiveSubTab(null)
    }
  }

  // Initialize activeSubTab when component mounts or when activeTab changes (optimized)
  useEffect(() => {
    initializeActiveSubTab()
  }, [activeTab]) // Remove excessive dependencies

  const lastRouteSyncPathRef = useRef<string>("")
  const suppressRouteSyncOnceRef = useRef<string>("")

  useEffect(() => {
    if (!visibleCategories.length) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathLower = pathWithoutTrailingSlash.toLowerCase()

    // Normalize legacy scheduling URLs for *matching* (avoid redirect loops / flashing).
    // We intentionally do NOT navigate here; we just treat these as "/HR/Scheduling".
    let normalizedPath = pathWithoutTrailingSlash
    let normalizedLower = pathLower
    if (
      normalizedLower === "/hr/management/schedulemanager" ||
      normalizedLower.startsWith("/hr/management/schedulemanager/") ||
      normalizedLower === "/hr/scheduling/schedulemanager" ||
      normalizedLower.startsWith("/hr/scheduling/schedulemanager/")
    ) {
      normalizedPath = "/HR/Scheduling"
      normalizedLower = "/hr/scheduling"
    }

    if (suppressRouteSyncOnceRef.current === pathWithoutTrailingSlash) {
      suppressRouteSyncOnceRef.current = ""
      lastRouteSyncPathRef.current = pathWithoutTrailingSlash
      return
    }
    if (lastRouteSyncPathRef.current === pathWithoutTrailingSlash) {
      return
    }
    lastRouteSyncPathRef.current = pathWithoutTrailingSlash

    const pathSegments = normalizedPath.split("/").filter(Boolean)
    const hrIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "hr")
    const tabSegment = hrIndex !== -1 ? pathSegments[hrIndex + 1] : undefined
    const subTabSegment = hrIndex !== -1 ? pathSegments[hrIndex + 2] : undefined

    const getCategoryPath = (category: any, subTabId?: string | null) => {
      if (!category) {
        return null
      }
      if (category.subTabs && category.subTabs.length > 0) {
        const slug = subTabId ?? category.subTabs[0]?.id

        // Scheduling: default "Rota" lives at /HR/Scheduling (no extra segment)
        if (category.slug === "scheduling" && (!slug || slug === "schedule-manager")) {
          return `/HR/${slugToPascalSegment(category.slug)}`
        }

        if (slug) {
          return `/HR/${slugToPascalSegment(category.slug)}/${slugToPascalSegment(slug)}`
        }
      }
      return `/HR/${slugToPascalSegment(category.slug)}`
    }

    const defaultCategory = visibleCategories[0]
    const defaultPath = getCategoryPath(defaultCategory)

    if (!tabSegment) {
      if (defaultPath && location.pathname !== defaultPath) {
        navigate(defaultPath, { replace: true })
      }
      return
    }

    // Match category by slug, handling both PascalCase paths and lowercase slugs
    const matchedIndex = visibleCategories.findIndex((category) => {
      const pascalSlug = slugToPascalSegment(category.slug)
      return category.slug === tabSegment || pascalSlug === tabSegment
    })
    if (matchedIndex === -1) {
      if (defaultPath && location.pathname !== defaultPath) {
        navigate(defaultPath, { replace: true })
      }
      return
    }

    // Drive internal state from URL
    if (matchedIndex !== activeTab) setActiveTab(matchedIndex)

    const matchedCategory = visibleCategories[matchedIndex]
    if (!matchedCategory) {
      return
    }
    
    if (matchedCategory.subTabs && matchedCategory.subTabs.length > 0) {
      if (!subTabSegment) {
        const firstSub = matchedCategory.subTabs[0]?.id ?? null

        // For Scheduling, we intentionally keep the URL as /HR/Scheduling for the default subtab.
        // For other categories, we also avoid redirecting during normal sync to keep switching instant.
        if (activeSubTab !== firstSub) setActiveSubTab(firstSub)
        return
      }

      // Match subTab by id, handling both PascalCase paths and lowercase ids
      const matchedSub = matchedCategory.subTabs.find((subTab: any) => {
        const pascalId = slugToPascalSegment(subTab.id)
        return subTab.id === subTabSegment || pascalId === subTabSegment
      })
      if (!matchedSub) {
        const firstSub = matchedCategory.subTabs[0]?.id ?? null
        if (activeSubTab !== firstSub) setActiveSubTab(firstSub)
        return
      }

      if (activeSubTab !== matchedSub.id) setActiveSubTab(matchedSub.id)
    } else {
      if (activeSubTab !== null) setActiveSubTab(null)
      if (subTabSegment) {
        // No redirect here; just let state render the right view.
      }
    }
  }, [location.pathname, navigate, visibleCategories, activeTab, activeSubTab])

  // Log site/subsite changes only when they actually change
  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      if (companyState.selectedSubsiteID) {
        // silent
      } else {
        // silent
      }
    }
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID]) // Remove activeTab dependency

  // Show message if no company/site selected - check after all hooks
  if (!companyState.companyID) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Human Resources
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Please select a company to access HR data.
        </Typography>
      </Box>
    )
  }

  // Show message if no categories are visible due to permissions
  if (visibleCategories.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access any HR features. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  

  const handleTabChange = (newTab: number) => {
    const selectedCategory = visibleCategories[newTab]
    if (!selectedCategory) {
      return
    }

    if (selectedCategory.subTabs && selectedCategory.subTabs.length > 0) {
      const firstSubTab = selectedCategory.subTabs[0]?.id ?? null
      // Immediate UI response
      setActiveTab(newTab)
      setActiveSubTab(firstSubTab)
      const targetPath =
        selectedCategory.slug === "scheduling" && (!firstSubTab || firstSubTab === "schedule-manager")
          ? `/HR/${slugToPascalSegment(selectedCategory.slug)}`
          : firstSubTab !== null
            ? `/HR/${slugToPascalSegment(selectedCategory.slug)}/${slugToPascalSegment(firstSubTab)}`
            : `/HR/${slugToPascalSegment(selectedCategory.slug)}`
      if (location.pathname !== targetPath) {
        suppressRouteSyncOnceRef.current = targetPath
        navigate(targetPath)
      }
    } else {
      const targetPath = `/HR/${slugToPascalSegment(selectedCategory.slug)}`
      setActiveTab(newTab)
      setActiveSubTab(null)
      if (location.pathname !== targetPath) {
        suppressRouteSyncOnceRef.current = targetPath
        navigate(targetPath)
      }
    }
  }

  const handleSubTabChange = (_event: React.SyntheticEvent, newSubTab: string) => {
    const currentCategory = visibleCategories[activeTab]
    if (!currentCategory) {
      return
    }

    const targetPath =
      currentCategory.slug === "scheduling" && newSubTab === "schedule-manager"
        ? `/HR/${slugToPascalSegment(currentCategory.slug)}`
        : `/HR/${slugToPascalSegment(currentCategory.slug)}/${slugToPascalSegment(newSubTab)}`
    setActiveSubTab(newSubTab)
    if (location.pathname !== targetPath) {
      suppressRouteSyncOnceRef.current = targetPath
      navigate(targetPath)
    }
  }

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (isEditing) {
      // When exiting edit mode, the layout is automatically saved via useWidgetManager's useEffect
      // silent
    } else {
      // silent
    }
    setIsEditing(!isEditing)
  }, [isEditing])

  // Handle revert - reload saved layout and exit edit mode without saving
  const handleRevert = useCallback(async () => {
    // silent
    await revertDashboard()
    setIsEditing(false)
  }, [revertDashboard])

  // Date range handling
  const getDateRangeLabel = () => {
    switch (selectedDateRange) {
      case "today":
        return "Today"
      case "yesterday":
        return "Yesterday"
      case "last7days":
        return "Last 7 Days"
      case "last30days":
        return "Last 30 Days"
      case "thisMonth":
        return "This Month"
      case "lastMonth":
        return "Last Month"
      case "thisYear":
        return "This Year"
      case "lastYear":
        return "Last Year"
      case "custom":
        return `${format(dateRange.startDate, "MMM d, yyyy")} - ${format(dateRange.endDate, "MMM d, yyyy")}`
      default:
        return "Last 7 Days"
    }
  }

  const handleDateRangeChange = (range: string) => {
    // silent
    setSelectedDateRange(range)

    if (range === "custom") {
      setCustomDateDialogOpen(true)
      return
    }

    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (range) {
      case "today":
        start = new Date(today)
        end = new Date(today)
        break
      case "yesterday":
        start = subDays(today, 1)
        end = subDays(today, 1)
        break
      case "last7days":
        start = subDays(today, 6)
        end = today
        break
      case "last30days":
        start = subDays(today, 29)
        end = today
        break
      case "thisMonth":
        start = startOfMonth(today)
        end = today
        break
      case "lastMonth":
        const lastMonthEnd = subDays(startOfMonth(today), 1)
        start = startOfMonth(lastMonthEnd)
        end = lastMonthEnd
        break
      case "thisYear":
        start = startOfYear(today)
        end = today
        break
      case "lastYear":
        const lastYearEnd = subDays(startOfYear(today), 1)
        start = startOfYear(lastYearEnd)
        end = lastYearEnd
        break
      default:
        break
    }

      // silent
    setDateRange({ startDate: start, endDate: end })
  }

  const handleFrequencyChange = (newFrequency: string) => {
    // silent
    setFrequency(newFrequency)
    // Force widget data refresh by updating a dependency
  }

  const handleCustomDateApply = () => {
    // silent
    setCustomDateDialogOpen(false)
    // The dateRange state is already updated via the DatePicker onChange handlers
    // This will trigger widget data refresh via the getWidgetData dependency
  }

  // Widget handling
  const handleWidgetContextMenu = (event: React.MouseEvent, widgetId: string) => {
    if (!isEditing) return

    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      widgetId,
    })
  }

  const handleOpenWidgetSettings = (widgetId: string) => {
    const settings = getWidgetSettings(widgetId)
    if (settings) {
      setWidgetDialogMode("edit")
      setPendingCreatedWidgetId(null)
      setCurrentWidgetSettings(settings)
      setSettingsDialogOpen(true)
    }
  }

  const handleSaveWidgetSettings = (settings: any) => {
    updateWidgetSettings(settings)
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setCurrentWidgetSettings(null)
    setSettingsDialogOpen(false)
  }

  const handleCloseWidgetDialog = () => {
    setSettingsDialogOpen(false)
    if (widgetDialogMode === "create" && pendingCreatedWidgetId) {
      removeWidget(pendingCreatedWidgetId)
    }
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setCurrentWidgetSettings(null)
  }

  const handleCreateWidget = () => {
    const newWidget = addWidget("stat" as any, DataType.TOTAL_ITEMS)
    setSelectedWidgetId(newWidget.id)
    setCurrentWidgetSettings(newWidget)
    setWidgetDialogMode("create")
    setPendingCreatedWidgetId(newWidget.id)
    setSettingsDialogOpen(true)
  }

  const handleClearWidgets = () => {
    setClearWidgetsDialogOpen(true)
  }

  const confirmClearWidgets = () => {
    clearAllWidgets()
    setClearWidgetsDialogOpen(false)
  }

  // Available data types for widgets
  const availableDataTypes = getHRDataTypes(getAvailableDataTypes as any)

  // Side navigation removed in favor of top horizontal tabs

  // Render the dashboard content
  const renderDashboard = () => {
    return (
      <Box sx={{ width: "100%" }}>
        {/* Dashboard Header */}
        <DashboardHeader
          title="Human Resources Dashboard"
          subtitle="HR Dashboad"
          canEdit={hasPermission("hr", "dashboard", "edit")}
          isEditing={isEditing}
          onToggleEdit={toggleEditMode}
          onClearWidgets={handleClearWidgets}
          onRevert={handleRevert}
          showGrid={showGrid}
          onToggleGrid={setShowGrid}
          menuItems={[
            {
              label: "Add Widget",
              onClick: handleCreateWidget,
              permission: hasPermission("hr", "dashboard", "edit"),
            },
            {
              label: "Add Employee",
              onClick: () => handleTabChange(1),
              permission: hasPermission("hr", "employees", "edit"),
            },
            {
              label: "Schedule Shift",
              onClick: () => handleTabChange(2),
              permission: hasPermission("hr", "scheduling", "edit"),
            },
            {
              label: "Add Announcement",
              onClick: () => handleTabChange(4),
              permission: hasPermission("hr", "announcements", "edit"),
            },
          ]}
          dateRange={{
            value: selectedDateRange,
            label: getDateRangeLabel(),
            onChange: handleDateRangeChange,
          }}
          frequency={{
            value: frequency,
            options: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"],
            onChange: handleFrequencyChange,
          }}
        />

        {/* Widgets Container */}
        <Box ref={canvasViewportRef} sx={{ width: "100%", mb: 4, overflowX: "hidden" }}>
          <Box sx={{ position: "relative", minHeight: `${scaledHeight}px` }}>
            <Box
              sx={{
                position: "relative",
                width: `${canvasWidth}px`,
                minHeight: `${containerHeight}px`,
                pt: 2,
                px: 2,
                pb: 0,
                backgroundColor: "transparent",
                backgroundImage: showGrid
                  ? `linear-gradient(${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px), 
                   linear-gradient(90deg, ${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px)`
                  : "none",
                backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                backgroundPosition: "0 0",
                overflow: "visible",
                transform: `scale(${canvasScale})`,
                transformOrigin: "top left",
              }}
            >
          {dashboardState.widgets.map((widget) => (
            <Rnd
              key={widget.id}
              default={{
                x: widget.x,
                y: widget.y,
                width: widget.width,
                height: widget.height,
              }}
              size={{ width: widget.width, height: widget.height }}
              position={{ x: widget.x, y: widget.y }}
              minWidth={widget.minW * GRID_CELL_SIZE}
              minHeight={widget.minH * GRID_CELL_SIZE}
              disableDragging={!isEditing}
              enableResizing={isEditing}
              bounds="parent"
              onDragStop={(_e, d) => {
                updateWidgetPosition(widget.id, { x: d.x, y: d.y })
              }}
              onResizeStop={(_e, _direction, ref, _delta, position) => {
                updateWidgetSize(widget.id, {
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                })
                updateWidgetPosition(widget.id, {
                  x: position.x,
                  y: position.y,
                })
              }}
              style={{
                border: selectedWidgetId === widget.id ? `2px solid ${theme.palette.primary.main}` : "none",
                borderRadius: "8px",
                overflow: "visible", // Changed to visible to ensure content isn't cut off
                zIndex: selectedWidgetId === widget.id ? 1000 : 1,
              }}
              onMouseDown={() => isEditing && setSelectedWidgetId(widget.id)}
              onContextMenu={(e: React.MouseEvent<Element, MouseEvent>) => handleWidgetContextMenu(e, widget.id)}
              dragGrid={[GRID_CELL_SIZE, GRID_CELL_SIZE]}
              resizeGrid={[GRID_CELL_SIZE, GRID_CELL_SIZE]}
              scale={canvasScale}
            >
              <Box sx={{ height: "100%", width: "100%", overflow: "hidden" }}>
                <DynamicWidget
                  widget={widget}
                  data={getWidgetData(widget)}
                  onSettingsOpen={handleOpenWidgetSettings}
                  isEditing={isEditing}
                />
              </Box>
            </Rnd>
          ))}
            </Box>
          </Box>
        </Box>

        {/* Widget Context Menu */}
        <WidgetContextMenu
          open={contextMenu !== null}
          position={contextMenu ? { x: contextMenu.mouseX, y: contextMenu.mouseY } : { x: 0, y: 0 }}
          onClose={() => setContextMenu(null)}
          widgetId={contextMenu?.widgetId || ""}
          onSettingsOpen={handleOpenWidgetSettings}
          onRemove={() => {
            if (contextMenu) {
              removeWidget(contextMenu.widgetId)
              setContextMenu(null)
            }
          }}
        />

        {/* Widget Settings Dialog */}
        <WidgetSettingsDialog
          open={settingsDialogOpen}
          onClose={handleCloseWidgetDialog}
          widget={currentWidgetSettings}
          onSave={handleSaveWidgetSettings}
          availableDataTypes={availableDataTypes}
          cardDataTypes={getHRCardDataTypes() as any}
          seriesDataTypes={availableDataTypes}
          mode={widgetDialogMode}
        />


        {/* Custom Date Range Dialog */}
        <Dialog open={customDateDialogOpen} onClose={() => setCustomDateDialogOpen(false)}>
          <DialogTitle>Select Custom Date Range</DialogTitle>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2, minWidth: 300 }}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setDateRange((prev) => ({ ...prev, startDate: newValue }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setDateRange((prev) => ({ ...prev, endDate: newValue }))
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCustomDateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCustomDateApply} variant="contained" color="primary">
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear Widgets Confirmation Dialog */}
        <Dialog open={clearWidgetsDialogOpen} onClose={() => setClearWidgetsDialogOpen(false)}>
          <DialogTitle>Clear All Widgets</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to remove all widgets from the dashboard? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearWidgetsDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmClearWidgets} variant="contained" color="error">
              Clear All Widgets
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  // Main layout (Top horizontal tabs like Bookings)
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        m: 0,
        mt: isTabsExpanded ? 0 : -3,
        p: 0,
        transition: "margin 0.3s ease",
      }}
    >
      {isTabsExpanded && (
        <Paper 
          sx={{ 
            borderBottom: 1, 
            borderColor: "divider", 
            bgcolor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
            m: 0,
            p: 0,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, val: number) => handleTabChange(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              "& .MuiTab-root": {
                color: themeConfig.brandColors.offWhite,
                opacity: 0.7,
                "&.Mui-selected": {
                  color: themeConfig.brandColors.offWhite,
                  opacity: 1,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: themeConfig.brandColors.offWhite,
              },
            }}
          >
            {visibleCategories.map((category) => (
              <Tab key={category.id} icon={category.icon} label={category.label} />
            ))}
          </Tabs>
        </Paper>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "background.paper",
          m: 0,
          p: 0,
          lineHeight: 0,
        }}
      >
        <IconButton
          onClick={toggleTabsExpanded}
          size="small"
          sx={{
            color: "text.primary",
            m: 0,
            p: 0.5,
            "&:hover": {
              bgcolor: "transparent",
              opacity: 0.7,
            },
          }}
        >
          {isTabsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto", width: "100%" }}>
        {activeTab === 0 ? (
          <Box>{renderDashboard()}</Box>
        ) : (
          <Box sx={{ width: "100%" }}>
            {/* Secondary horizontal tabs for sections with sub-tabs */}
            {visibleCategories[activeTab]?.subTabs && visibleCategories[activeTab].subTabs!.length > 0 && (
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: themeConfig.brandColors.navy,
                  color: themeConfig.brandColors.offWhite,
                }}
              >
                <Tabs
                  value={activeSubTab}
                  onChange={handleSubTabChange}
                  aria-label="hr section sub-tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    px: 2,
                    "& .MuiTab-root": {
                      color: themeConfig.brandColors.offWhite,
                      opacity: 0.7,
                      "&.Mui-selected": {
                        color: themeConfig.brandColors.offWhite,
                        opacity: 1,
                      },
                    },
                    "& .MuiTabs-indicator": {
                      backgroundColor: themeConfig.brandColors.offWhite,
                    },
                  }}
                >
                  {visibleCategories[activeTab].subTabs!.map((subTab) => (
                    <Tab key={subTab.id} label={subTab.label} value={subTab.id} />
                  ))}
                </Tabs>
              </Box>
            )}

            {/* Render the appropriate component based on active tab and sub-tab */}
            {visibleCategories[activeTab]?.subTabs && visibleCategories[activeTab].subTabs!.length > 0
              ? visibleCategories[activeTab].subTabs!.find((subTab) => subTab.id === activeSubTab)?.component
              : visibleCategories[activeTab]?.component}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default HR
