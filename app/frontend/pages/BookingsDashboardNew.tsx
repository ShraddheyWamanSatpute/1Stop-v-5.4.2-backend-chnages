"use client"

import React, { useState, useCallback, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  type SelectChangeEvent,
} from "@mui/material"
import { WidgetType, DataType } from "../types/WidgetTypes"
import DynamicWidget from "../components/reusable/DynamicWidget"
import useWidgetManager from "../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../hooks/useResponsiveWidgetCanvas"
import WidgetContextMenu from "../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../components/reusable/WidgetSettingsDialog"
import DashboardHeader from "../components/reusable/DashboardHeader"
import { Rnd } from "react-rnd"
import { useBookingsReportContext } from "../../backend/context/AnalyticsContext"
import { debugWarn } from "../../utils/debugLog"
import { alpha, useTheme } from "@mui/material/styles"
import { themeConfig } from "../../theme/AppTheme"
import { useNavigate } from "react-router-dom"

// Import date-fns
import { format, subDays, addDays, startOfMonth, startOfYear } from "date-fns"
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

// Define the GRID_CELL_SIZE constant
const GRID_CELL_SIZE = 20

const BookingsDashboardNew = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const bookingsState = useBookingsReportContext()
  const { hasPermission } = bookingsState
  
  // All hooks must be called before any conditional returns
  
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
    addWidget,
    removeWidget,
    updateWidgetSettings,
    updateWidgetPosition,
    updateWidgetSize,
    clearAllWidgets,
    selectedWidgetId,
    setSelectedWidgetId,
    calculateContainerHeight,
    revertDashboard,
  } = useWidgetManager("bookings")
  const containerHeight = Math.max(calculateContainerHeight(), 400)
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // Memoized booking metrics for performance
  const bookingMetrics = useMemo(() => {
    const totalBookings = bookingsState.bookings.length
    const confirmedBookings = bookingsState.bookings.filter((b: any) => b.status === "confirmed").length
    const cancelledBookings = bookingsState.bookings.filter((b: any) => b.status === "cancelled").length
    const noShowBookings = bookingsState.bookings.filter((b: any) => b.status === "no-show").length
    const waitlistCount = bookingsState.waitlistEntries.length
    const activeTables = bookingsState.tables.filter((t: any) => t.status === "active").length
    const occupancyRate = bookingsState.bookingStats?.occupancyRate || 0
    const averagePartySize = bookingsState.bookings.length > 0 
      ? Math.round(bookingsState.bookings.reduce((sum: number, b: any) => sum + (b.partySize || 1), 0) / bookingsState.bookings.length)
      : 0

    // Calculate revenue metrics
    const totalRevenue = bookingsState.bookings.reduce((total: number, booking: any) => {
      return total + (booking.estimatedValue || booking.totalValue || 0)
    }, 0)


    // Get unique booking types and sources
    const bookingTypes = [...new Set(bookingsState.bookings.map((b: any) => 
      b.bookingType || b.type || 'Standard'
    ).filter(Boolean))]
    
    const bookingSources = [...new Set(bookingsState.bookings.map((b: any) => 
      b.source || b.bookingSource || 'Direct'
    ).filter(Boolean))]

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      noShowBookings,
      waitlistCount,
      activeTables,
      occupancyRate,
      averagePartySize,
      totalRevenue,
      bookingTypes,
      bookingSources
    }
  }, [bookingsState.bookings, bookingsState.waitlistEntries, bookingsState.tables, bookingsState.bookingStats])

  // Get widget data function
  const getWidgetData = useCallback((widget: any) => {
    if (!widget || !widget.dataType) return { history: [] }

    const rawDataType = String(widget.dataType || "")
    const dataType =
      rawDataType === "cancellations" || rawDataType === "cancelledBookings" || rawDataType === "bookingCancellations"
        ? DataType.CANCELLATION_ANALYSIS
        : rawDataType === "noShows" || rawDataType === "noShowBookings" || rawDataType === "noshows" || rawDataType === "bookingNoShows"
          ? DataType.NO_SHOW_ANALYSIS
          : widget.dataType

    // Use memoized metrics
    const { 
      totalBookings, confirmedBookings, cancelledBookings, noShowBookings, 
      waitlistCount, activeTables, occupancyRate, averagePartySize,
      bookingTypes, bookingSources 
    } = bookingMetrics

    // Generate historical data based on date range and frequency
    const generateHistoricalData = (baseValue: number, _variationFactor: number = 0.1) => {
      // Safely parse dates and validate them
      const startDate = dateRange?.startDate instanceof Date && !isNaN(dateRange.startDate.getTime())
        ? dateRange.startDate
        : dateRange?.startDate
        ? new Date(dateRange.startDate)
        : subDays(new Date(), 30)
      
      const endDate = dateRange?.endDate instanceof Date && !isNaN(dateRange.endDate.getTime())
        ? dateRange.endDate
        : dateRange?.endDate
        ? new Date(dateRange.endDate)
        : new Date()
      
      // Validate dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        debugWarn('Invalid date range, using default dates')
        const defaultStart = subDays(new Date(), 30)
        const defaultEnd = new Date()
        const daysDiff = Math.ceil((defaultEnd.getTime() - defaultStart.getTime()) / (1000 * 60 * 60 * 24))
        return Array.from({ length: Math.min(daysDiff, 30) }).map((_, i) => {
          const currentDate = new Date(defaultStart.getTime() + (i * 24 * 60 * 60 * 1000))
          return {
            date: format(currentDate, "yyyy-MM-dd"),
            value: Math.max(0, Math.round(baseValue * (0.9 + (((Math.sin((i + 1) * 1.618) + 1) / 2) * 0.2)))),
          }
        })
      }
      
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Ensure daysDiff is positive and reasonable (allow up to 5 years for yearly frequency)
      const maxDays = frequency === 'yearly' ? 1825 : (frequency === 'quarterly' ? 730 : 365) // 5 years, 2 years, or 1 year
      if (daysDiff <= 0 || daysDiff > maxDays) {
        debugWarn('Invalid date range difference, using default')
        const defaultStart = subDays(new Date(), 30)
        const defaultEnd = new Date()
        const validDaysDiff = Math.ceil((defaultEnd.getTime() - defaultStart.getTime()) / (1000 * 60 * 60 * 24))
        return Array.from({ length: Math.min(validDaysDiff, 30) }).map((_, i) => {
          const currentDate = new Date(defaultStart.getTime() + (i * 24 * 60 * 60 * 1000))
          return {
            date: format(currentDate, "yyyy-MM-dd"),
            value: Math.max(0, Math.round(baseValue * (0.9 + (((Math.sin((i + 1) * 1.618) + 1) / 2) * 0.2)))),
          }
        })
      }
      
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
      
      return Array.from({ length: Math.max(1, dataPoints) }).map((_, i) => {
        const currentDate = new Date(startDate.getTime() + (i * dateIncrement * 24 * 60 * 60 * 1000))
        // Validate the date before formatting
        if (isNaN(currentDate.getTime())) {
          debugWarn('Invalid date generated, using fallback')
          return {
            date: format(new Date(), "yyyy-MM-dd"),
            value: Math.max(0, Math.round(baseValue * (0.9 + (((Math.sin((i + 1) * 1.618) + 1) / 2) * 0.2)))),
          }
        }
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
      widget.type === WidgetType.MULTIPLE_SERIES_LINE_CHART ||
      widget.type === WidgetType.MULTIPLE_SERIES_BAR_CHART ||
      widget.type === WidgetType.AREA_CHART ||
      widget.type === WidgetType.DONUT_CHART ||
      widget.type === WidgetType.STACKED_BAR_CHART ||
      widget.type === WidgetType.STACKED_AREA_CHART

    // Charts/tables: always return a consistent `history[]` structure keyed by DataType.
    // This prevents "blank charts" when older widgets rely on DynamicWidget's series readers.
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

      const seed = `bookings-widget|${widget.id}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`
      const rngFor = (key: string) => mulberry32(hashSeed(`${seed}|${key}`))

      const baseFor = (dt: DataType) => {
        switch (dt) {
          case DataType.TOTAL_BOOKINGS:
          case DataType.BOOKING_TRENDS:
          case DataType.BOOKINGS_BY_DAY:
            return totalBookings
          case DataType.OCCUPANCY_RATE:
          case DataType.TABLE_OCCUPANCY:
          case DataType.TABLE_UTILIZATION:
            return occupancyRate
          case DataType.WAITLIST_ANALYTICS:
            return waitlistCount
          case DataType.CANCELLATION_ANALYSIS:
            return cancelledBookings
          case DataType.NO_SHOW_ANALYSIS:
            return noShowBookings
          default:
            return totalBookings
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

      // Breakdown mode (simple buckets) for pie/stacked breakdown visualizations.
      if ((widget as any)?.dataConfigMode === "breakdown" && (widget as any)?.breakdownBy) {
        const dt0 = (effectiveSeries[0]?.dataType || widget.dataType || DataType.TOTAL_BOOKINGS) as DataType
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
        case DataType.TOTAL_BOOKINGS:
          return {
            totalBookings: totalBookings,
            history: generateHistoricalData(totalBookings).map((item) => ({
              date: item.date,
              totalBookings: { count: item.value },
            })),
          }
        case DataType.OCCUPANCY_RATE:
          return {
            occupancyRate: occupancyRate,
            history: generateHistoricalData(occupancyRate, 0.05).map((item) => ({
              date: item.date,
              occupancyRate: { rate: item.value },
            })),
          }
        case DataType.BOOKINGS_BY_STATUS:
          return {
            confirmedBookings: confirmedBookings,
            cancelledBookings: cancelledBookings,
            noShowBookings: noShowBookings,
            history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
              date: item.date,
              bookingsByStatus: { 
                confirmed: Math.round(item.value * 0.7),
                cancelled: Math.round(item.value * 0.15),
                noShow: Math.round(item.value * 0.15)
              },
            })),
          }
        case DataType.BOOKINGS_BY_TYPE:
          return {
            bookingTypes: bookingTypes,
            history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
              date: item.date,
              bookingsByType: { count: item.value },
            })),
          }
        case DataType.TABLE_UTILIZATION:
          return {
            activeTables: activeTables,
            history: generateHistoricalData(activeTables, 0.05).map((item) => ({
              date: item.date,
              tableUtilization: { utilization: item.value },
            })),
          }
        case DataType.WAITLIST_ANALYTICS:
          return {
            waitlistCount: waitlistCount,
            history: generateHistoricalData(waitlistCount, 0.2).map((item) => ({
              date: item.date,
              waitlistAnalytics: { count: item.value },
            })),
          }
        case DataType.BOOKING_TRENDS:
          return {
            totalBookings: totalBookings,
            history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
              date: item.date,
              bookingTrends: { count: item.value },
            })),
          }
        case DataType.CUSTOMER_SEGMENTS:
          return {
            averagePartySize: averagePartySize,
            history: generateHistoricalData(averagePartySize, 0.1).map((item) => ({
              date: item.date,
              customerSegments: { partySize: item.value },
            })),
          }
        case DataType.CANCELLATION_ANALYSIS:
          return {
            cancellationRate: totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
            cancellationCount: cancelledBookings,
            [DataType.CANCELLATION_ANALYSIS]: {
              quantity: cancelledBookings,
              price: 0,
              percentage: 0,
              score: 0,
              value: cancelledBookings,
              options: {},
            },
            history: generateHistoricalData(cancelledBookings, 0.2).map((item) => ({
              date: item.date,
              cancellationAnalysis: { count: item.value },
            })),
          }
        case DataType.NO_SHOW_ANALYSIS:
          return {
            noShowCount: noShowBookings,
            [DataType.NO_SHOW_ANALYSIS]: {
              quantity: noShowBookings,
              price: 0,
              percentage: 0,
              score: 0,
              value: noShowBookings,
              options: {},
            },
            history: generateHistoricalData(noShowBookings, 0.2).map((item) => ({
              date: item.date,
              noShowAnalysis: { count: item.value },
            })),
          }
        case DataType.SEASONAL_TRENDS:
          return {
            totalBookings: totalBookings,
            history: generateHistoricalData(totalBookings, 0.15).map((item) => ({
              date: item.date,
              seasonalTrends: { count: item.value },
            })),
          }
      }
    }

    // For charts, provide the history data
    switch (dataType) {
      case DataType.TOTAL_BOOKINGS:
        return {
          history: generateHistoricalData(totalBookings).map((item) => ({
            date: item.date,
            totalBookings: { count: item.value },
          })),
        }
      case DataType.BOOKINGS_BY_DAY:
        return {
          history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
            date: item.date,
            bookingsByDay: { count: item.value },
          })),
        }
      case DataType.BOOKINGS_BY_HOUR:
        return {
          history: generateHistoricalData(24, 0.3).map((item, idx) => ({
            date: item.date,
            bookingsByHour: { 
              hour: idx % 24,
              count: item.value 
            },
          })),
        }
      case DataType.BOOKINGS_BY_SOURCE:
        return {
          data: bookingSources.map((source) => ({
            source,
            count: 10 + ((source.length * 7) % 50),
            value: 10 + ((source.length * 7) % 50)
          })),
          history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
            date: item.date,
            bookingsBySource: { count: item.value },
          })),
        }
      case DataType.BOOKINGS_BY_PARTY_SIZE:
        return {
          data: [1, 2, 3, 4, 5, 6, 7, 8].map((size) => ({
            partySize: size,
            count: 5 + ((size * 9) % 30),
            value: 5 + ((size * 9) % 30)
          })),
          history: generateHistoricalData(averagePartySize, 0.1).map((item) => ({
            date: item.date,
            bookingsByPartySize: { size: item.value },
          })),
        }
      case DataType.BOOKINGS_BY_TYPE:
        return {
          data: bookingTypes.map((type) => ({
            type,
            count: 10 + ((String(type).length * 11) % 40),
            value: 10 + ((String(type).length * 11) % 40)
          })),
          history: generateHistoricalData(totalBookings, 0.1).map((item) => ({
            date: item.date,
            bookingsByType: { count: item.value },
          })),
        }
      case DataType.TABLE_UTILIZATION:
        return {
          data: bookingsState.tables.slice(0, 10).map((table: any) => ({
            table: table.name || `Table ${table.id}`,
            utilization: ((table.name || `Table ${table.id}`).length * 13) % 100,
            value: ((table.name || `Table ${table.id}`).length * 13) % 100,
            count: 5 + (((table.name || `Table ${table.id}`).length * 3) % 20)
          })),
          history: generateHistoricalData(activeTables, 0.05).map((item) => ({
            date: item.date,
            tableUtilization: { utilization: item.value },
          })),
        }
      case DataType.WAITLIST_ANALYTICS:
        return {
          history: generateHistoricalData(waitlistCount, 0.2).map((item) => ({
            date: item.date,
            waitlistAnalytics: { count: item.value },
          })),
        }
      case DataType.CANCELLATION_ANALYSIS:
        return {
          history: generateHistoricalData(cancelledBookings, 0.2).map((item) => ({
            date: item.date,
            cancellationAnalysis: { count: item.value },
          })),
        }
      case DataType.NO_SHOW_ANALYSIS:
        return {
          history: generateHistoricalData(noShowBookings, 0.2).map((item) => ({
            date: item.date,
            noShowAnalysis: { count: item.value },
          })),
        }
      default:
        return { history: generateHistoricalData(totalBookings) }
    }
  }, [dateRange, frequency, bookingMetrics, bookingsState.tables])

  // Date range handlers
  const handleDateRangeChange = (newRange: string) => {
    setSelectedDateRange(newRange)
    const now = new Date()
    let start: Date, end: Date

    switch (newRange) {
      case "today":
        start = end = now
        break
      case "yesterday":
        start = end = subDays(now, 1)
        break
      case "last7days":
        start = subDays(now, 7)
        end = now
        break
      case "last30days":
        start = subDays(now, 30)
        end = now
        break
      case "thismonth":
        start = startOfMonth(now)
        end = now
        break
      case "lastmonth":
        start = startOfMonth(subDays(now, 30))
        end = startOfMonth(now)
        break
      case "thisyear":
        start = startOfYear(now)
        end = now
        break
      case "custom":
        setCustomDateDialogOpen(true)
        return
      default:
        start = subDays(now, 7)
        end = now
    }

    setDateRange({ startDate: start, endDate: end })
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency.toLowerCase())
  }

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
      case "thismonth":
        return "This Month"
      case "lastmonth":
        return "Last Month"
      case "thisyear":
        return "This Year"
      case "custom":
        // Safely validate dates before formatting
        const startDate = dateRange?.startDate instanceof Date && !isNaN(dateRange.startDate.getTime())
          ? dateRange.startDate
          : dateRange?.startDate
          ? new Date(dateRange.startDate)
          : subDays(new Date(), 30)
        const endDate = dateRange?.endDate instanceof Date && !isNaN(dateRange.endDate.getTime())
          ? dateRange.endDate
          : dateRange?.endDate
          ? new Date(dateRange.endDate)
          : new Date()
        
        // Validate dates before formatting
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return "Invalid date range"
        }
        
        return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
      default:
        return "Last 7 Days"
    }
  }

  // Widget management functions
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
    if (isEditing) {
      setSelectedWidgetId(null)
    }
  }

  // Handle revert - reload saved layout and exit edit mode without saving
  const handleRevert = async () => {
    await revertDashboard()
    setIsEditing(false)
    setSelectedWidgetId(null)
  }

  const handleClearWidgets = () => {
    setClearWidgetsDialogOpen(true)
  }

  const confirmClearWidgets = () => {
    clearAllWidgets()
    setClearWidgetsDialogOpen(false)
  }

  // Available data types for widgets
  const availableDataTypes = [
    { value: DataType.TOTAL_BOOKINGS, label: "Bookings" },
    { value: DataType.WAITLIST_ANALYTICS, label: "Waitlist" },
    { value: DataType.CANCELLATION_ANALYSIS, label: "Cancellations" },
    { value: DataType.NO_SHOW_ANALYSIS, label: "No Shows" },
  ]

  const cardDataTypes = [
    { value: DataType.TOTAL_BOOKINGS, label: "Bookings" },
    { value: DataType.WAITLIST_ANALYTICS, label: "Waitlist" },
    { value: DataType.CANCELLATION_ANALYSIS, label: "Cancellations" },
    { value: DataType.NO_SHOW_ANALYSIS, label: "No Shows" },
  ]

  // Render the dashboard content
  const renderDashboard = () => {
    return (
      <Box sx={{ width: "100%" }}>
        {/* Dashboard Header */}
        <DashboardHeader
          title="Bookings Dashboard"
          subtitle="Bookings Dashboard"
          canEdit={hasPermission("bookings", "dashboard", "edit")}
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
              permission: hasPermission("bookings", "dashboard", "edit"),
            },
            {
              label: "New Booking",
              onClick: () => navigate("/Bookings/List"),
              permission: hasPermission("bookings", "list", "edit"),
            },
            {
              label: "Manage Tables",
              onClick: () => navigate("/Bookings/Tables"),
              permission: hasPermission("bookings", "tables", "edit"),
            },
            {
              label: "View Calendar",
              onClick: () => navigate("/Bookings/Calendar"),
              permission: hasPermission("bookings", "calendar", "view"),
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
                backgroundColor: theme.palette.background.default,
                backgroundImage: showGrid
                  ? `linear-gradient(${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px), 
                   linear-gradient(90deg, ${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px)`
                  : "none",
                backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                backgroundPosition: "0 0",
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
                border: selectedWidgetId === widget.id ? `2px solid ${themeConfig.brandColors.navy}` : "none",
                borderRadius: "8px",
                overflow: "hidden",
              }}
              onMouseDown={() => isEditing && setSelectedWidgetId(widget.id)}
              onContextMenu={(e: React.MouseEvent<Element, MouseEvent>) => {
                e.preventDefault()
                setContextMenu({
                  mouseX: e.clientX + 2,
                  mouseY: e.clientY - 6,
                  widgetId: widget.id,
                })
              }}
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

      </Box>
    )
  }

  // Context menu handlers

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleOpenWidgetSettings = (widgetId: string) => {
    const widget = dashboardState.widgets.find((w: any) => w.id === widgetId)
    if (widget) {
      setWidgetDialogMode("edit")
      setPendingCreatedWidgetId(null)
      setCurrentWidgetSettings(widget)
      setSettingsDialogOpen(true)
    }
    setContextMenu(null)
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
    const newWidget = addWidget("stat" as any, DataType.TOTAL_BOOKINGS)
    setSelectedWidgetId(newWidget.id)
    setCurrentWidgetSettings(newWidget)
    setWidgetDialogMode("create")
    setPendingCreatedWidgetId(newWidget.id)
    setSettingsDialogOpen(true)
  }

  const handleDeleteWidget = (widgetId: string) => {
    removeWidget(widgetId)
    setContextMenu(null)
  }

  return (
    <Box sx={{ width: "100%" }}>
      {renderDashboard()}

      {/* Clear Widgets Dialog */}
      <Dialog open={clearWidgetsDialogOpen} onClose={() => setClearWidgetsDialogOpen(false)}>
        <DialogTitle>Clear All Widgets</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to clear all widgets? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearWidgetsDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmClearWidgets} color="error" variant="contained">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Date Range Dialog */}
      <Dialog open={customDateDialogOpen} onClose={() => setCustomDateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange((prev) => ({ ...prev, startDate: newValue }))
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal'
                  }
                }}
              />
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange((prev) => ({ ...prev, endDate: newValue }))
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal'
                  }
                }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDateDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setCustomDateDialogOpen(false)} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Widget Context Menu */}
      <WidgetContextMenu
        open={contextMenu !== null}
        position={contextMenu ? { x: contextMenu.mouseX, y: contextMenu.mouseY } : { x: 0, y: 0 }}
        onClose={handleCloseContextMenu}
        widgetId={contextMenu?.widgetId || ""}
        onSettingsOpen={handleOpenWidgetSettings}
        onRemove={() => handleDeleteWidget(contextMenu?.widgetId || "")}
      />

      {/* Widget Settings Dialog */}
      <WidgetSettingsDialog
        open={settingsDialogOpen}
        onClose={handleCloseWidgetDialog}
        widget={currentWidgetSettings}
        onSave={(updatedWidget) => {
          updateWidgetSettings(updatedWidget)
          setWidgetDialogMode("edit")
          setPendingCreatedWidgetId(null)
          setCurrentWidgetSettings(null)
          setSettingsDialogOpen(false)
        }}
        availableDataTypes={availableDataTypes}
        cardDataTypes={cardDataTypes}
        seriesDataTypes={availableDataTypes}
        mode={widgetDialogMode}
      />
    </Box>
  )
}

export default BookingsDashboardNew
