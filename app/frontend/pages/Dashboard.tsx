"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
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
  Paper,
  IconButton,
  CircularProgress,
} from "@mui/material"
import {
  Dashboard as DashboardIcon,
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
} from "@mui/icons-material"
import { useGlobalDashboardContext } from "../../backend/context/AnalyticsContext"
import { useNavigate } from "react-router-dom"

// Import date-fns
import { format, subDays, addDays } from "date-fns"
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
import LocationPlaceholder from "../components/common/LocationPlaceholder"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../theme/AppTheme"

// Define the GRID_CELL_SIZE constant
const GRID_CELL_SIZE = 20

type GlobalDashboardCtx = ReturnType<typeof useGlobalDashboardContext>

const DashboardContent: React.FC<{ ctx: GlobalDashboardCtx }> = ({ ctx }) => {
  const navigate = useNavigate()
  const { companyState, hasPermission, hrState, stockState, financeState, bookingsState, posState } = ctx
  const { bookings, tables: bookingTables } = bookingsState
  

  // Dashboard widget state
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
    startDate: subDays(new Date(), 30),
    endDate: addDays(new Date(), 30),
  })
  const [frequency, setFrequency] = useState<string>("daily")

  // Widget management - using 'global' section to access all data
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
    resetDashboard,
  } = useWidgetManager('global')

  // Calculate container height based on widget positions
  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // Memoize data snapshots from all contexts - MUST be defined before useEffect that uses it
  const allDataSnapshot = useMemo(() => ({
    // HR Data
    employees: hrState.employees || [],
    departments: hrState.departments || [],
    trainings: hrState.trainings || [],
    attendances: hrState.attendances || [],
    performanceReviews: hrState.performanceReviews || [],
    payrollRecords: hrState.payrollRecords || [],
    // Stock Data
    products: stockState.products || [],
    categories: stockState.categories || [],
    suppliers: stockState.suppliers || [],
    stockCounts: stockState.stockCounts || [],
    // Finance Data
    invoices: financeState.invoices || [],
    expenses: financeState.expenses || [],
    bankAccounts: financeState.bankAccounts || [],
    budgets: financeState.budgets || [],
    // Bookings Data
    bookings: bookings || [],
    tables: bookingTables || [],
    // POS Data
    bills: (posState as any)?.bills || [],
  }), [
    hrState.employees?.length,
    hrState.departments?.length,
    stockState.products?.length,
    financeState.invoices?.length,
    bookings?.length,
    bookingTables?.length,
    (posState as any)?.bills?.length,
  ])

  // Get data for widget based on its type - pulling from all sections
  const getWidgetData = useCallback((widget: any) => {
    if (!widget || !widget.dataType) return { history: [] }

    const dataType = widget.dataType
    // Calculate metrics from all data sources
    const totalEmployees = allDataSnapshot.employees.length
    const totalProducts = allDataSnapshot.products.length
    const totalBookings = allDataSnapshot.bookings.length
    const totalRevenue = allDataSnapshot.invoices
      .filter((inv: any) => inv.status === "paid")
      .reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
    const totalExpenses = allDataSnapshot.expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
    const profit = totalRevenue - totalExpenses

    // Generate historical data based on date range and frequency
    const generateHistoricalData = (baseValue: number, variationFactor: number = 0.1) => {
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
        case "quarterly":
          dataPoints = Math.min(Math.ceil(daysDiff / 90), 8)
          dateIncrement = 90
          break
        case "yearly":
          dataPoints = Math.min(Math.ceil(daysDiff / 365), 5)
          dateIncrement = 365
          break
        default:
          dataPoints = Math.min(daysDiff, 30)
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

    // Handle stat and dashboard card widgets
    if (widget.type === WidgetType.CARD || widget.type === WidgetType.DASHBOARD_CARD || widget.type === WidgetType.STAT) {
      switch (dataType) {
        // HR Metrics
        case DataType.TOTAL_ITEMS:
          return {
            totalItems: totalEmployees,
            history: generateHistoricalData(totalEmployees).map((item) => ({
              date: item.date,
              totalItems: { quantity: item.value },
            })),
          }
        case DataType.ATTENDANCE:
          const attendanceRate = allDataSnapshot.attendances.length
            ? Math.round(
                (allDataSnapshot.attendances.filter((record: any) => record.status === "present").length /
                  allDataSnapshot.attendances.length) * 100,
              )
            : 0
          return {
            attendanceRate: attendanceRate,
            history: generateHistoricalData(attendanceRate, 0.05).map((item) => ({
              date: item.date,
              attendance: { rate: item.value },
            })),
          }
        // Stock Metrics
        case DataType.STOCK_COUNT:
          return {
            stockCount: totalProducts,
            history: generateHistoricalData(totalProducts).map((item) => ({
              date: item.date,
              stockCount: { quantity: item.value },
            })),
          }
        case DataType.STOCK_VALUE:
          const stockValue = allDataSnapshot.products.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.quantity || 0)), 0)
          return {
            stockValue: stockValue,
            history: generateHistoricalData(stockValue / 100, 0.1).map((item) => ({
              date: item.date,
              stockValue: { price: item.value * 100 },
            })),
          }
        // Finance Metrics
        case DataType.REVENUE:
          return {
            revenue: totalRevenue,
            history: generateHistoricalData(totalRevenue / 100, 0.1).map((item) => ({
              date: item.date,
              revenue: { price: item.value * 100 },
            })),
          }
        case DataType.EXPENSES:
          return {
            expenses: totalExpenses,
            history: generateHistoricalData(totalExpenses / 100, 0.1).map((item) => ({
              date: item.date,
              expenses: { price: item.value * 100 },
            })),
          }
        case DataType.PROFIT:
          return {
            profit: profit,
            history: generateHistoricalData(profit / 100, 0.15).map((item) => ({
              date: item.date,
              profit: { price: item.value * 100 },
            })),
          }
        // Bookings Metrics
        case DataType.TOTAL_BOOKINGS:
          return {
            totalBookings: totalBookings,
            history: generateHistoricalData(totalBookings).map((item) => ({
              date: item.date,
              totalBookings: { quantity: item.value },
            })),
          }
        case DataType.OCCUPANCY_RATE:
          const occupancyRate = allDataSnapshot.tables.length
            ? Math.round((totalBookings / (allDataSnapshot.tables.length * 30)) * 100)
            : 0
          return {
            occupancyRate: occupancyRate,
            history: generateHistoricalData(occupancyRate, 0.1).map((item) => ({
              date: item.date,
              occupancyRate: { rate: item.value },
            })),
          }
        case DataType.LOW_STOCK_ITEMS:
          const lowStockItems = allDataSnapshot.products.filter((p: any) => Number(p?.quantity ?? p?.predictedStock ?? 0) <= 5).length
          return {
            lowStockItems,
            history: generateHistoricalData(lowStockItems).map((item) => ({
              date: item.date,
              lowStockItems: { quantity: item.value },
            })),
          }
        case DataType.POS_TRANSACTIONS:
          const totalTransactions = allDataSnapshot.bills?.length || 0
          return {
            totalTransactions,
            history: generateHistoricalData(totalTransactions).map((item) => ({
              date: item.date,
              posTransactions: { quantity: item.value },
            })),
          }
        case DataType.PAYROLL:
          const totalPayroll = allDataSnapshot.payrollRecords?.reduce((sum: number, record: any) => sum + (record?.grossPay || 0), 0) || 0
          return {
            payrollCost: totalPayroll,
            history: generateHistoricalData(totalPayroll || 1, 0.05).map((item) => ({
              date: item.date,
              payroll: { cost: item.value },
            })),
          }
        default:
          return { history: [] }
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
      case DataType.STOCK_COUNT:
        return {
          history: generateHistoricalData(totalProducts).map((item) => ({
            date: item.date,
            stockCount: { quantity: item.value },
          })),
        }
      case DataType.REVENUE:
        return {
          history: generateHistoricalData(totalRevenue / 100, 0.1).map((item) => ({
            date: item.date,
            revenue: { price: item.value * 100 },
          })),
        }
      case DataType.PROFIT:
        return {
          history: generateHistoricalData(profit / 100, 0.15).map((item) => ({
            date: item.date,
            profit: { price: item.value * 100 },
          })),
        }
      case DataType.TOTAL_BOOKINGS:
        return {
          history: generateHistoricalData(totalBookings).map((item) => ({
            date: item.date,
            totalBookings: { quantity: item.value },
          })),
        }
      case DataType.DEPARTMENTS:
      case DataType.EMPLOYEES_BY_DEPARTMENT:
        return {
          data: allDataSnapshot.departments.map((dept: any) => ({
            department: dept.name,
            employees: allDataSnapshot.employees.filter((emp: any) => 
              emp.departmentId === dept.id || emp.department === dept.name || emp.department === dept.id
            ).length,
            value: allDataSnapshot.employees.filter((emp: any) => 
              emp.departmentId === dept.id || emp.department === dept.name || emp.department === dept.id
            ).length
          })),
          history: generateHistoricalData(totalEmployees).map((item) => ({
            date: item.date,
            departments: { employees: item.value },
          })),
        }
      default:
        return { history: [] }
    }
  }, [allDataSnapshot, dateRange, frequency])

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
    if (isEditing) {
      setSelectedWidgetId(null)
    }
  }

  // Handle widget context menu
  const handleWidgetContextMenu = (e: React.MouseEvent, widgetId: string) => {
    e.preventDefault()
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
            widgetId,
          }
        : null,
    )
  }

  // Handle open widget settings
  const handleOpenWidgetSettings = (widgetId: string) => {
    const widget = getWidgetSettings(widgetId)
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setCurrentWidgetSettings(widget)
    setSettingsDialogOpen(true)
    setContextMenu(null)
  }

  // Handle save widget settings
  const handleSaveWidgetSettings = (updatedSettings: any) => {
    updateWidgetSettings(updatedSettings)
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setSettingsDialogOpen(false)
    setCurrentWidgetSettings(null)
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

  // Handle clear widgets
  const handleClearWidgets = () => {
    setClearWidgetsDialogOpen(true)
  }

  const confirmClearWidgets = () => {
    clearAllWidgets()
    setClearWidgetsDialogOpen(false)
  }

  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range)
    const now = new Date()
    switch (range) {
      case "today":
        setDateRange({ startDate: now, endDate: now })
        break
      case "yesterday":
        const yesterday = subDays(now, 1)
        setDateRange({ startDate: yesterday, endDate: yesterday })
        break
      case "last7days":
        setDateRange({ startDate: subDays(now, 7), endDate: now })
        break
      case "last30days":
        setDateRange({ startDate: subDays(now, 30), endDate: now })
        break
      case "last90days":
        setDateRange({ startDate: subDays(now, 90), endDate: now })
        break
      case "thisMonth":
        setDateRange({ startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: now })
        break
      case "lastMonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        setDateRange({ startDate: lastMonth, endDate: lastMonthEnd })
        break
      case "thisYear":
        setDateRange({ startDate: new Date(now.getFullYear(), 0, 1), endDate: now })
        break
      case "custom":
        setCustomDateDialogOpen(true)
        break
    }
  }

  const handleCustomDateApply = () => {
    setCustomDateDialogOpen(false)
    setSelectedDateRange("custom")
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency)
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
      case "last90days":
        return "Last 90 Days"
      case "thisMonth":
        return "This Month"
      case "lastMonth":
        return "Last Month"
      case "thisYear":
        return "This Year"
      case "custom":
        return `${format(dateRange.startDate, "MMM d")} - ${format(dateRange.endDate, "MMM d, yyyy")}`
      default:
        return "Last 7 Days"
    }
  }

  // All available data types from all sections
  const availableDataTypes = [
    // Stock Analytics
    { value: DataType.STOCK_COUNT, label: "Stock Count" },
    { value: DataType.STOCK_VALUE, label: "Stock Value" },
    { value: DataType.TOTAL_ITEMS, label: "Total Items" },
    { value: DataType.LOW_STOCK_ITEMS, label: "Low Stock Items" },
    { value: DataType.INVENTORY_VALUE, label: "Inventory Value" },
    { value: DataType.PROFIT_MARGIN, label: "Profit Margin" },
    { value: DataType.SALES, label: "Sales" },
    { value: DataType.PURCHASES, label: "Purchases" },
    { value: DataType.PROFIT, label: "Profit" },
    // HR Analytics
    { value: DataType.ATTENDANCE, label: "Attendance" },
    { value: DataType.PERFORMANCE, label: "Performance" },
    { value: DataType.TURNOVER, label: "Turnover" },
    { value: DataType.RECRUITMENT, label: "Recruitment" },
    { value: DataType.TRAINING, label: "Training" },
    { value: DataType.PAYROLL, label: "Payroll" },
    { value: DataType.DEPARTMENTS, label: "Departments" },
    { value: DataType.EMPLOYEES_BY_DEPARTMENT, label: "Employees by Department" },
    { value: DataType.ATTENDANCE_TRENDS, label: "Attendance Trends" },
    { value: DataType.PERFORMANCE_METRICS, label: "Performance Metrics" },
    { value: DataType.TRAINING_PROGRESS, label: "Training Progress" },
    { value: DataType.PAYROLL_BREAKDOWN, label: "Payroll Breakdown" },
    { value: DataType.TURNOVER_ANALYSIS, label: "Turnover Analysis" },
    // Finance Analytics
    { value: DataType.REVENUE, label: "Revenue" },
    { value: DataType.EXPENSES, label: "Expenses" },
    { value: DataType.CASH_FLOW, label: "Cash Flow" },
    { value: DataType.CASH_BALANCE, label: "Cash Balance" },
    { value: DataType.OUTSTANDING_INVOICES, label: "Outstanding Invoices" },
    { value: DataType.BUDGET_VARIANCE, label: "Budget Variance" },
    { value: DataType.EXPENSE_BREAKDOWN, label: "Expense Breakdown" },
    // Bookings Analytics
    { value: DataType.TOTAL_BOOKINGS, label: "Total Bookings" },
    { value: DataType.OCCUPANCY_RATE, label: "Occupancy Rate" },
    { value: DataType.WAITLIST_ANALYTICS, label: "Waitlist Analytics" },
    { value: DataType.BOOKINGS_BY_STATUS, label: "Bookings by Status" },
    { value: DataType.BOOKING_TRENDS, label: "Booking Trends" },
    // POS Analytics
    { value: DataType.POS_TRANSACTIONS, label: "POS Transactions" },
    { value: DataType.SALES_BY_DAY, label: "Sales by Day" },
    { value: DataType.PAYMENT_METHOD_BREAKDOWN, label: "Payment Method Breakdown" },
  ]

  const cardDataTypes = [
    { value: DataType.STOCK_VALUE, label: "Stock Value" },
    { value: DataType.LOW_STOCK_ITEMS, label: "Low Stock Items" },
    { value: DataType.TOTAL_ITEMS, label: "Total Items" },
    { value: DataType.REVENUE, label: "Revenue" },
    { value: DataType.EXPENSES, label: "Expenses" },
    { value: DataType.PROFIT, label: "Profit" },
    { value: DataType.TOTAL_BOOKINGS, label: "Total Bookings" },
    { value: DataType.OCCUPANCY_RATE, label: "Occupancy Rate" },
    { value: DataType.POS_TRANSACTIONS, label: "POS Transactions" },
    { value: DataType.ATTENDANCE, label: "Attendance" },
    { value: DataType.PAYROLL, label: "Payroll" },
  ]

  // Render the dashboard content
  const renderDashboard = () => {
    return (
      <Box sx={{ width: "100%" }}>
        {/* Dashboard Header */}
        <DashboardHeader
          title="Global Business Dashboard"
          subtitle="Overview of All Sections"
          canEdit={hasPermission("dashboard", "dashboard", "edit")}
          isEditing={isEditing}
          onToggleEdit={toggleEditMode}
          onClearWidgets={handleClearWidgets}
          onRevert={revertDashboard}
          showGrid={showGrid}
          onToggleGrid={setShowGrid}
          menuItems={[
            {
              label: "Add Widget",
              onClick: handleCreateWidget,
              permission: hasPermission("dashboard", "dashboard", "edit"),
            },
            {
              label: "HR Dashboard",
              onClick: () => navigate("/HR"),
              permission: hasPermission("hr", "dashboard", "view"),
            },
            {
              label: "Stock Dashboard",
              onClick: () => navigate("/Stock"),
              permission: hasPermission("stock", "dashboard", "view"),
            },
            {
              label: "Finance Dashboard",
              onClick: () => navigate("/Finance"),
              permission: hasPermission("finance", "dashboard", "view"),
            },
            {
              label: "Bookings Dashboard",
              onClick: () => navigate("/Bookings"),
              permission: hasPermission("bookings", "dashboard", "view"),
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
        <Box sx={{ position: "relative", minHeight: `${Math.max(scaledHeight, 400)}px` }}>
          <Box
            sx={{
              position: "relative",
              width: `${canvasWidth}px`,
              minHeight: `${Math.max(containerHeight, 400)}px`,
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
          {dashboardState.widgets.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
                p: 4,
                textAlign: "center",
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No widgets yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Click "Add Widget" in the header to get started, or reset to load default widgets
                </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  onClick={handleCreateWidget}
                  startIcon={<DashboardIcon />}
                >
                  Add Your First Widget
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => resetDashboard()}
                >
                  Reset to Default Layout
                </Button>
              </Box>
              </Box>
          ) : (
            dashboardState.widgets.filter(w => w.visible !== false).map((widget) => (
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
                overflow: "visible",
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
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  frequency={frequency}
                />
              </Box>
            </Rnd>
            ))
          )}
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

  // Ensure we always render something visible
  if (!dashboardState) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    )
  }
  
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 64px)",
        overflow: "auto",
        m: 0,
        p: 0,
        // Force brand background so pages can't drift to defaults
        backgroundColor: themeConfig.brandColors.offWhite,
      }}
    >
      {renderDashboard()}
    </Box>
  )
}

const Dashboard: React.FC = () => {
  const ctx = useGlobalDashboardContext()
  const { companyState } = ctx

  // Gate the heavy dashboard/hooks behind location selection to avoid hook-order issues.
  if (!companyState?.companyID) {
    return <LocationPlaceholder />
  }

  return <DashboardContent ctx={ctx} />
}

export default Dashboard
