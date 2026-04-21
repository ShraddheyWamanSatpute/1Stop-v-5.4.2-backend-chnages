"use client"

import React, { useState, useEffect, useCallback } from "react"
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
  Alert, 
} from "@mui/material"
import { 
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
} from "@mui/icons-material"
import { Rnd } from "react-rnd"
import { format, subDays, addDays, startOfMonth, startOfYear } from "date-fns"
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"

import { useFinanceReportContext } from "../../../backend/context/AnalyticsContext"
import useWidgetManager from "../../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../../hooks/useResponsiveWidgetCanvas"
import WidgetContextMenu from "../../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../../components/reusable/WidgetSettingsDialog"
import DynamicWidget from "../../components/reusable/DynamicWidget"
import { DataType, WidgetType } from "../../types/WidgetTypes"
import DashboardHeader from "../../components/reusable/DashboardHeader"
import LocationPlaceholder from "../../components/common/LocationPlaceholder"
import { alpha, useTheme } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"

const GRID_CELL_SIZE = 20

const FinanceDashboard: React.FC = () => {
  const theme = useTheme()
  const { finance, financeState, companyState, hasPermission } = useFinanceReportContext()
  const { refreshAll } = finance

  // Track if component has been initialized
  const isInitialized = React.useRef(false)

  // Memoize finance data snapshot
  const financeDataSnapshot = React.useMemo(
    () => ({
      invoices: financeState.invoices || [],
      bills: financeState.bills || [],
      expenses: financeState.expenses || [],
      bankAccounts: financeState.bankAccounts || [],
      contacts: financeState.contacts || [],
      transactions: financeState.transactions || [],
      budgets: financeState.budgets || [],
      dailyForecasts: financeState.dailyForecasts || [],
      accounts: financeState.accounts || [],
    }),
    [
      financeState.invoices?.length,
      financeState.bills?.length,
      financeState.expenses?.length,
      financeState.bankAccounts?.length,
      financeState.contacts?.length,
      financeState.transactions?.length,
      financeState.budgets?.length,
      financeState.dailyForecasts?.length,
      financeState.accounts?.length,
    ]
  )

  // Dashboard widget state
  const [isEditing, setIsEditing] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<string>("last30days")
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
    startDate: subDays(new Date(), 30),
    endDate: addDays(new Date(), 30),
  })
  const [frequency, setFrequency] = useState<string>("daily")

  // Widget management
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
  } = useWidgetManager("finance")

  // Calculate container height
  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // Note: Finance data is loaded automatically by FinanceContext
  // Only refresh if data is missing (e.g., user navigated directly to this page)
  useEffect(() => {
    if (!isInitialized.current && companyState.companyID && financeState.basePath) {
      // Only refresh if we have a basePath but no data yet
      if (financeState.accounts.length === 0 && !financeState.loading) {
        refreshAll()
      }
      isInitialized.current = true
    }
  }, [companyState.companyID, financeState.basePath, financeState.accounts.length, financeState.loading, refreshAll])

  // Get data for widget based on its type
  const getWidgetData = useCallback(
    (widget: any) => {
      if (!widget || !widget.dataType) return { history: [] }

      const rawDataType = String(widget.dataType || "")
      const dataType =
        rawDataType === "sales"
          ? DataType.REVENUE
          : rawDataType === "expense" || rawDataType === "expenses"
            ? DataType.EXPENSES
            : rawDataType === "budget" || rawDataType === "budgetVariance" || rawDataType === "budgetvariance"
              ? DataType.BUDGET_VARIANCE
              : rawDataType === "invoice" || rawDataType === "invoices"
                ? DataType.TOTAL_ITEMS
                : widget.dataType

      // Calculate metrics from finance data
      const totalRevenue = financeDataSnapshot.invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)

      const totalExpenses = financeDataSnapshot.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)

      const outstandingInvoices = financeDataSnapshot.invoices
        .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
        .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)


      const totalBankBalance = financeDataSnapshot.bankAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)

      const profit = (Number(totalRevenue) || 0) - (Number(totalExpenses) || 0)
      const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0

      // Budget variance
      const budgetedTotal = financeDataSnapshot.budgets.reduce((sum, b) => sum + (Number(b.budgeted) || 0), 0)
      const actualTotal = financeDataSnapshot.budgets.reduce((sum, b) => sum + (Number(b.actual) || 0), 0)
      const budgetVariance = budgetedTotal - actualTotal
      const dailyForecastTotal = financeDataSnapshot.dailyForecasts
        .filter((forecast) => {
          const forecastDate = new Date(forecast.date)
          return forecastDate >= dateRange.startDate && forecastDate <= dateRange.endDate
        })
        .reduce((sum, forecast) => sum + (Number(forecast.amount) || 0), 0)

      const buildTypedMetricBucket = (
        metricValue: number,
        displayMode: "price" | "quantity" | "percentage" | "score",
      ) => {
        const safeMetricValue = Number.isFinite(metricValue) ? metricValue : 0
        return {
        price: displayMode === "price" ? safeMetricValue : 0,
        quantity: displayMode === "quantity" ? safeMetricValue : 0,
        percentage: displayMode === "percentage" ? safeMetricValue : 0,
        score: displayMode === "score" ? safeMetricValue : 0,
        value: safeMetricValue,
        options: {},
      }}

      const buildHistoryRows = (
        metricType: DataType,
        metricValue: number,
        displayMode: "price" | "quantity" | "percentage" | "score",
        variationFactor: number = 0.1,
      ) =>
        generateHistoricalData(metricValue, variationFactor).map((item) => ({
          date: item.date,
          [metricType]: buildTypedMetricBucket(item.value, displayMode),
        }))

      const buildCardComparison = (
        metricType: DataType,
        metricValue: number,
        displayMode: "price" | "quantity" | "percentage" | "score",
      ) => {
        const comparisonTarget = String((widget as any)?.cardComparisonTarget || "none")

        if (comparisonTarget === "budget") {
          const budgetComparableMetrics = new Set<DataType>([
            DataType.REVENUE,
            DataType.EXPENSES,
            DataType.PROFIT,
            DataType.CASH_FLOW,
            DataType.OUTSTANDING_INVOICES,
          ])

          if (!budgetComparableMetrics.has(metricType) || financeDataSnapshot.budgets.length === 0) {
            return null
          }

          const baseline = budgetedTotal
          return {
            target: "budget",
            label: "vs Budget",
            baseline,
            variance: metricValue - baseline,
            percentage: baseline !== 0 ? ((metricValue - baseline) / baseline) * 100 : null,
            displayMode,
            dataType: metricType,
          }
        }

        if (comparisonTarget === "forecast") {
          if (metricType !== DataType.REVENUE || financeDataSnapshot.dailyForecasts.length === 0) {
            return null
          }

          const baseline = dailyForecastTotal
          return {
            target: "forecast",
            label: "vs Forecast",
            baseline,
            variance: metricValue - baseline,
            percentage: baseline !== 0 ? ((metricValue - baseline) / baseline) * 100 : null,
            displayMode,
            dataType: metricType,
          }
        }

        return null
      }

      const buildCardMetricPayload = (
        metricKey: string,
        metricType: DataType,
        metricValue: number,
        displayMode: "price" | "quantity" | "percentage" | "score",
        historyRows: any[],
      ) => {
        const comparison = buildCardComparison(metricType, metricValue, displayMode)
        return {
          [metricKey]: metricValue,
          [metricType]: buildTypedMetricBucket(metricValue, displayMode),
          ...(comparison ? { comparison } : {}),
          history: historyRows,
        }
      }

      // Generate historical data
      const generateHistoricalData = (baseValue: number, _variationFactor: number = 0.1) => {
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        let dataPoints: number
        let dateIncrement: number

        switch (frequency) {
          case "hourly":
            dataPoints = Math.min(daysDiff * 24, 168)
            dateIncrement = 1 / 24
            break
          case "daily":
            dataPoints = Math.min(daysDiff, 90)
            dateIncrement = 1
            break
          case "weekly":
            dataPoints = Math.min(Math.ceil(daysDiff / 7), 52)
            dateIncrement = 7
            break
          case "monthly":
            dataPoints = Math.min(Math.ceil(daysDiff / 30), 24)
            dateIncrement = 30
            break
          default:
            dataPoints = Math.min(daysDiff, 30)
            dateIncrement = 1
        }

        return Array.from({ length: dataPoints }).map((_, i) => {
          const currentDate = new Date(startDate.getTime() + i * dateIncrement * 24 * 60 * 60 * 1000)
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
              `finance-widget|${widget.id}|${key}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`,
            ),
          )

        const baseFor = (dt: DataType) => {
          switch (dt) {
            case DataType.REVENUE:
              return totalRevenue
            case DataType.EXPENSES:
              return totalExpenses
            case DataType.OUTSTANDING_INVOICES:
              return outstandingInvoices
            case DataType.CASH_FLOW_ANALYSIS:
              return totalBankBalance
            case DataType.PROFIT:
              return profit
            case DataType.BUDGET_VARIANCE:
              return budgetVariance
            default:
              return totalRevenue
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
          const dt0 = (effectiveSeries[0]?.dataType || widget.dataType || DataType.REVENUE) as DataType
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
            return buildCardMetricPayload(
              "totalItems",
              DataType.TOTAL_ITEMS,
              financeDataSnapshot.invoices.length,
              "quantity",
              buildHistoryRows(DataType.TOTAL_ITEMS, financeDataSnapshot.invoices.length, "quantity"),
            )
          case DataType.REVENUE:
            return buildCardMetricPayload(
              "revenue",
              DataType.REVENUE,
              totalRevenue,
              "price",
              buildHistoryRows(DataType.REVENUE, totalRevenue, "price", 0.15),
            )
          case DataType.EXPENSES:
            return buildCardMetricPayload(
              "expenses",
              DataType.EXPENSES,
              totalExpenses,
              "price",
              buildHistoryRows(DataType.EXPENSES, totalExpenses, "price", 0.1),
            )
          case DataType.PROFIT:
            return buildCardMetricPayload(
              "profit",
              DataType.PROFIT,
              profit,
              "price",
              buildHistoryRows(DataType.PROFIT, profit, "price", 0.2),
            )
          case DataType.CASH_FLOW:
            return buildCardMetricPayload(
              "cashFlow",
              DataType.CASH_FLOW,
              totalBankBalance,
              "price",
              buildHistoryRows(DataType.CASH_FLOW, totalBankBalance, "price", 0.12),
            )
          case DataType.OUTSTANDING_INVOICES:
            return buildCardMetricPayload(
              "outstandingInvoices",
              DataType.OUTSTANDING_INVOICES,
              outstandingInvoices,
              "price",
              buildHistoryRows(DataType.OUTSTANDING_INVOICES, outstandingInvoices, "price", 0.25),
            )
          case DataType.PROFIT_MARGIN:
            return buildCardMetricPayload(
              "profitMargin",
              DataType.PROFIT_MARGIN,
              profitMargin,
              "percentage",
              buildHistoryRows(DataType.PROFIT_MARGIN, profitMargin, "percentage", 0.08),
            )
          case DataType.BUDGET_VARIANCE:
            return buildCardMetricPayload(
              "budgetVariance",
              DataType.BUDGET_VARIANCE,
              budgetVariance,
              "price",
              buildHistoryRows(DataType.BUDGET_VARIANCE, Math.abs(budgetVariance), "price", 0.3).map((item) => ({
                ...item,
                [DataType.BUDGET_VARIANCE]: buildTypedMetricBucket(
                  Number((item as any)[DataType.BUDGET_VARIANCE]?.price || 0) * (budgetVariance < 0 ? -1 : 1),
                  "price",
                ),
              })),
            )
        }
      }

      // For charts, provide the history data
      switch (dataType) {
        case DataType.TOTAL_ITEMS:
          return {
            history: buildHistoryRows(DataType.TOTAL_ITEMS, financeDataSnapshot.invoices.length, "quantity"),
          }
        case DataType.REVENUE:
          return {
            history: buildHistoryRows(DataType.REVENUE, totalRevenue, "price", 0.15),
          }
        case DataType.EXPENSES:
          return {
            history: buildHistoryRows(DataType.EXPENSES, totalExpenses, "price", 0.1),
          }
        case DataType.PROFIT:
          return {
            history: buildHistoryRows(DataType.PROFIT, profit, "price", 0.2),
          }
        case DataType.CASH_FLOW:
          return {
            history: buildHistoryRows(DataType.CASH_FLOW, totalBankBalance, "price", 0.12),
          }
        case DataType.OUTSTANDING_INVOICES:
          return {
            history: buildHistoryRows(DataType.OUTSTANDING_INVOICES, outstandingInvoices, "price", 0.25),
          }
        case DataType.PROFIT_MARGIN:
          return {
            history: buildHistoryRows(DataType.PROFIT_MARGIN, profitMargin, "percentage", 0.08),
          }
        case DataType.BUDGET_VARIANCE:
          return {
            history: buildHistoryRows(DataType.BUDGET_VARIANCE, Math.abs(budgetVariance), "price", 0.3).map((item) => ({
              ...item,
              [DataType.BUDGET_VARIANCE]: buildTypedMetricBucket(
                Number((item as any)[DataType.BUDGET_VARIANCE]?.price || 0) * (budgetVariance < 0 ? -1 : 1),
                "price",
              ),
            })),
          }
        case DataType.CASH_FLOW_ANALYSIS:
          return {
            history: buildHistoryRows(DataType.CASH_FLOW_ANALYSIS, totalBankBalance, "price", 0.15),
          }
        case DataType.REVENUE_BY_CUSTOMER:
          const customerRevenue = financeDataSnapshot.invoices.reduce((acc: Record<string, number>, inv) => {
            const customer = inv.customerName || "Unknown"
            acc[customer] = (acc[customer] || 0) + (inv.totalAmount || 0)
            return acc
          }, {} as Record<string, number>)

          return {
            data: Object.entries(customerRevenue)
              .map(([customer, amount]) => ({
                name: customer,
                category: customer,
                customer,
                amount,
                value: amount,
                count: amount,
              }))
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 10),
          }
        case DataType.EXPENSE_BREAKDOWN:
          const expenseByCategory = financeDataSnapshot.expenses.reduce((acc: Record<string, number>, exp) => {
            const category = exp.category || "Other"
            acc[category] = (acc[category] || 0) + (exp.amount || 0)
            return acc
          }, {} as Record<string, number>)

          return {
            data: Object.entries(expenseByCategory).map(([category, amount]) => ({
              name: category,
              category,
              amount,
              value: amount,
              count: amount,
            })),
          }
        case DataType.BUDGET_PERFORMANCE:
          return {
            data: financeDataSnapshot.budgets.map((budget) => ({
              name: budget.category,
              category: budget.category,
              budgeted: budget.budgeted,
              actual: budget.actual,
              variance: budget.remaining,
              percentage: budget.percentage,
              value: budget.actual || 0,
              count: budget.actual || 0,
            })),
          }
        default:
          return { history: generateHistoricalData(totalRevenue) }
      }
    },
    [dateRange, frequency, financeDataSnapshot]
  )

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  // Handle revert - reload saved layout and exit edit mode without saving
  const handleRevert = async () => {
    // Finance Dashboard: Reverting changes and exiting edit mode
    await revertDashboard()
    setIsEditing(false)
  }

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
        return "Last 30 Days"
    }
  }

  const handleDateRangeChange = (range: string) => {
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

    setDateRange({ startDate: start, endDate: end })
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency)
  }

  const handleCustomDateApply = () => {
    setCustomDateDialogOpen(false)
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
    const newWidget = addWidget("stat" as any, DataType.REVENUE)
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

  // Available data types for finance widgets
  const availableDataTypes = [
    { value: DataType.TOTAL_ITEMS, label: "Total Invoices" },
    { value: DataType.REVENUE, label: "Revenue" },
    { value: DataType.EXPENSES, label: "Expenses" },
    { value: DataType.PROFIT, label: "Profit" },
    { value: DataType.CASH_FLOW, label: "Cash Flow" },
    { value: DataType.OUTSTANDING_INVOICES, label: "Outstanding Invoices" },
    { value: DataType.PROFIT_MARGIN, label: "Profit Margin" },
    { value: DataType.BUDGET_VARIANCE, label: "Budget Variance" },
    { value: DataType.CASH_FLOW_ANALYSIS, label: "Cash Flow Analysis" },
    { value: DataType.REVENUE_BY_CUSTOMER, label: "Revenue by Customer" },
    { value: DataType.EXPENSE_BREAKDOWN, label: "Expense Breakdown" },
    { value: DataType.BUDGET_PERFORMANCE, label: "Budget Performance" },
  ]

  const cardDataTypes = [
    { value: DataType.REVENUE, label: "Sales" },
    { value: DataType.BUDGET_VARIANCE, label: "Budget Variance" },
    { value: DataType.EXPENSES, label: "Expenses" },
    { value: DataType.PROFIT, label: "Profit" },
    { value: DataType.TOTAL_ITEMS, label: "Invoices" },
  ]

  if (!companyState.companyID) {
    return <LocationPlaceholder />
  }

  return (
    <Box sx={{ width: "100%" }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}
      {/* Dashboard Header */}
      <DashboardHeader
        title="Finance Dashboard"
        subtitle="Finance Dashboard"
        canEdit={hasPermission("finance", "dashboard", "edit")}
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
            permission: hasPermission("finance", "dashboard", "edit"),
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
        cardDataTypes={cardDataTypes}
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

export default FinanceDashboard
