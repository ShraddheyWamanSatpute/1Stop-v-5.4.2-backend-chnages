"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { WidgetSettings, DashboardState, DataSeries } from "../types/WidgetTypes"
import { WidgetType } from "../types/WidgetTypes"
import { v4 as uuidv4 } from "uuid"
import { DataType } from "../types/WidgetTypes"
import { useAnalytics } from "../../backend/context/AnalyticsContext"
import { themeConfig } from "../../theme/AppTheme"
import { useCompany } from "../../backend/context/CompanyContext"
import { useSettings } from "../../backend/context/SettingsContext"

// Grid configuration
export const GRID_SIZE = 20 // Size of each grid cell in pixels
export const MIN_WIDGET_WIDTH = 10 // Minimum widget width in grid units (200px)
export const MIN_WIDGET_HEIGHT = 7 // Minimum widget height in grid units (140px)

// Default colors for different data types
const BRAND = {
  navy: themeConfig.brandColors.navy,
  offWhite: themeConfig.brandColors.offWhite,
  divider: themeConfig.colors.divider,
  success: themeConfig.colors.success.main,
  warning: themeConfig.colors.warning.main,
  error: themeConfig.colors.error.main,
} as const

// Default colors for different data types
// Rule: keep semantic status colors; everything else collapses to brand navy/off-white.
const DEFAULT_DATA_COLORS: Record<string, string> = {
  stockCount: BRAND.success,
  purchases: BRAND.navy,
  sales: BRAND.error,
  predictedStock: BRAND.warning,
  costOfSales: BRAND.navy,
  profit: BRAND.success,
  parLevels: BRAND.navy,
  stockValue: BRAND.navy,
  stockTurnover: BRAND.navy,
  topItems: BRAND.navy,
  totalItems: BRAND.success,
  profitMargin: BRAND.success,
  lowStockItems: BRAND.warning,
  inventoryValue: BRAND.navy,
}

const normalizeSeriesColor = (input?: string) => {
  const c = String(input ?? "").trim().toLowerCase()
  if (!c) return BRAND.navy

  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)

  // Normalize any non-brand, non-semantic hex colors to navy (prevents legacy purples).
  if (isHex) {
    const allowed = new Set(
      [
        BRAND.navy,
        BRAND.offWhite,
        BRAND.success,
        BRAND.warning,
        BRAND.error,
      ].map((v) => String(v).toLowerCase()),
    )
    if (!allowed.has(c)) return BRAND.navy
  }

  // Pink/white -> off-white
  if (["#d81b60", "#e91e63", "#fff", "#ffffff", "white"].includes(c)) {
    return BRAND.offWhite
  }

  return input as string
}

const makeWidgetColors = (series: string[]) => ({
  background: BRAND.offWhite,
  border: BRAND.divider,
  text: BRAND.navy,
  series: series.map((s) => normalizeSeriesColor(s)),
})

// Convert pixel values to grid units
const toFiniteNumber = (value: unknown, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

// Convert pixel values to grid units (safe for legacy/partial layouts)
const convertPixelsToGridUnits = (pixels: unknown, fallback = 0) =>
  Math.round(toFiniteNumber(pixels, fallback) / GRID_SIZE)

// Convert grid units to pixels
const convertGridUnitsToPixels = (units: unknown, fallbackUnits = 0) =>
  toFiniteNumber(units, fallbackUnits) * GRID_SIZE

const normalizeWidgetType = (rawType: unknown, chartType?: unknown, displayType?: unknown): WidgetType => {
  const t = String(rawType ?? "").trim().toLowerCase()
  // Unified Card widget (legacy stat/dashboardCard/kpi all map to CARD)
  if (t === WidgetType.STAT.toLowerCase() || t === "kpi" || t === "metric" || t === "number") return WidgetType.CARD
  if (t === WidgetType.KPI_CARD.toLowerCase() || t === "dashboardcard" || t === "card") return WidgetType.CARD
  if (t === WidgetType.TABLE.toLowerCase() || t === "datagrid" || t === "grid") return WidgetType.TABLE
  if (t === WidgetType.CALCULATOR.toLowerCase()) return WidgetType.CALCULATOR
  if (t === WidgetType.BAR_CHART.toLowerCase() || t === "bar") return WidgetType.BAR_CHART
  if (t === WidgetType.LINE_CHART.toLowerCase() || t === "line") return WidgetType.LINE_CHART
  if (t === WidgetType.PIE_CHART.toLowerCase() || t === "pie") return WidgetType.PIE_CHART
  if (t === WidgetType.DONUT_CHART.toLowerCase() || t === "donut" || t === "doughnut") return WidgetType.DONUT_CHART
  if (t === WidgetType.AREA_CHART.toLowerCase() || t === "area") return WidgetType.AREA_CHART
  if (t === WidgetType.STACKED_BAR_CHART.toLowerCase()) return WidgetType.STACKED_BAR_CHART
  if (t === WidgetType.STACKED_AREA_CHART.toLowerCase()) return WidgetType.STACKED_AREA_CHART
  if (t === WidgetType.MULTIPLE_SERIES_LINE_CHART.toLowerCase()) return WidgetType.MULTIPLE_SERIES_LINE_CHART
  if (t === WidgetType.MULTIPLE_SERIES_BAR_CHART.toLowerCase()) return WidgetType.MULTIPLE_SERIES_BAR_CHART

  // Variants not natively rendered by DynamicWidget: degrade to bar chart
  // so legacy DB rows still display something.
  if (
    t === "radarchart" ||
    t === "scatterchart" ||
    t === "bubblechart" ||
    t === "heatmap" ||
    t === "gauge" ||
    t === "funnelchart" ||
    t === "waterfallchart" ||
    t === "candlestickchart" ||
    t === "calendarheatmap" ||
    t === "treemap" ||
    t === "sankeydiagram" ||
    t === "networkdiagram" ||
    t === "polarchart" ||
    t.endsWith("chart")
  ) {
    return WidgetType.BAR_CHART
  }

  if (t === WidgetType.CHART.toLowerCase() || t === "chart") {
    const c = String(chartType ?? displayType ?? "bar").trim().toLowerCase()
    if (c === "line") return WidgetType.LINE_CHART
    if (c === "pie") return WidgetType.PIE_CHART
    if (c === "donut" || c === "doughnut") return WidgetType.DONUT_CHART
    if (c === "area") return WidgetType.AREA_CHART
    return WidgetType.BAR_CHART
  }

  return (rawType as WidgetType) || WidgetType.CARD
}

// Normalize legacy widget layout fields so drag/resize math never receives NaN/undefined.
const normalizeWidgetLayout = (widget: WidgetSettings): WidgetSettings => {
  const normalized: any = { ...widget }

  normalized.type = normalizeWidgetType(normalized.type, normalized.chartType, normalized.displayType)

  // Prefer existing grid positions if present; otherwise derive from pixel values.
  const gridX = toFiniteNumber(normalized.gridX, convertPixelsToGridUnits(normalized.x, 0))
  const gridY = toFiniteNumber(normalized.gridY, convertPixelsToGridUnits(normalized.y, 0))
  const gridWidth = toFiniteNumber(normalized.gridWidth, convertPixelsToGridUnits(normalized.width, 10))
  const gridHeight = toFiniteNumber(normalized.gridHeight, convertPixelsToGridUnits(normalized.height, 6))

  normalized.gridX = gridX
  normalized.gridY = gridY
  normalized.gridWidth = gridWidth
  normalized.gridHeight = gridHeight

  // Ensure pixel values exist (StockDashboard uses x/y/width/height in pixels)
  normalized.x = toFiniteNumber(normalized.x, convertGridUnitsToPixels(gridX, 0))
  normalized.y = toFiniteNumber(normalized.y, convertGridUnitsToPixels(gridY, 0))
  normalized.width = toFiniteNumber(normalized.width, convertGridUnitsToPixels(gridWidth, 10))
  normalized.height = toFiniteNumber(normalized.height, convertGridUnitsToPixels(gridHeight, 6))

  // Ensure resize constraints exist
  normalized.minW = toFiniteNumber(normalized.minW, 2)
  normalized.minH = toFiniteNumber(normalized.minH, 2)

  // If this is a Card widget and `dataType` is missing, infer it from the first series.
  if (
    (normalized.type === WidgetType.CARD ||
      normalized.type === WidgetType.STAT ||
      normalized.type === WidgetType.DASHBOARD_CARD) &&
    !normalized.dataType &&
    Array.isArray(normalized.dataSeries) &&
    normalized.dataSeries[0]?.dataType
  ) {
    normalized.dataType = normalized.dataSeries[0].dataType
  }

  return normalized as WidgetSettings
}

// Migrate legacy "dashboard card" layouts (from AnalyticsContext v1) into WidgetSettings.
// Legacy widgets were stored as objects with `position: {x,y,w,h}` in grid-units and loose dataType strings.
const migrateLegacyDashboardLayout = (section: string, legacyLayout: any[]): DashboardState | null => {
  if (!Array.isArray(legacyLayout) || legacyLayout.length === 0) return null

  const dataTypeValues = new Set<string>(Object.values(DataType) as unknown as string[])

  const legacyKeyToDataType: Record<string, DataType> = {
    // HR (legacy analytics keys)
    totalEmployees: DataType.TOTAL_ITEMS,
    activeEmployees: DataType.TOTAL_ITEMS,
    pendingTimeOff: DataType.TIME_OFF_REQUESTS,
    trainingsCompleted: DataType.TRAINING,
    totalDepartments: DataType.DEPARTMENTS,
    averageAttendance: DataType.ATTENDANCE,
    turnoverRate: DataType.TURNOVER_ANALYSIS,
    trainingCompletionRate: DataType.TRAINING_PROGRESS,
    performanceScore: DataType.PERFORMANCE,
    recruitmentActive: DataType.RECRUITMENT,
    payrollTotal: DataType.PAYROLL,
    employeesByDepartment: DataType.EMPLOYEES_BY_DEPARTMENT,
    attendanceTrends: DataType.ATTENDANCE_TRENDS,
    performanceMetrics: DataType.PERFORMANCE_METRICS,
    trainingProgress: DataType.TRAINING_PROGRESS,
    payrollBreakdown: DataType.PAYROLL_BREAKDOWN,
    timeOffRequests: DataType.TIME_OFF_REQUESTS,
    recruitmentFunnel: DataType.RECRUITMENT_FUNNEL,
    turnoverAnalysis: DataType.TURNOVER_ANALYSIS,

    // Stock (legacy analytics keys)
    totalStockValue: DataType.STOCK_VALUE,
    lowStockCount: DataType.LOW_STOCK_ITEMS,
    stockByCategory: DataType.STOCK_BY_CATEGORY,
    stockTrends: DataType.STOCK_TRENDS,

    // Finance (legacy analytics keys)
    cashBalance: DataType.CASH_BALANCE,
    revenue: DataType.REVENUE,
    expenses: DataType.EXPENSES,
    profit: DataType.PROFIT,

    // Bookings (legacy analytics keys)
    totalBookings: DataType.TOTAL_BOOKINGS,
    confirmedBookings: DataType.TOTAL_BOOKINGS,
    cancelledBookings: DataType.CANCELLATION_ANALYSIS,
    noShowBookings: DataType.NO_SHOW_ANALYSIS,
    occupancyRate: DataType.OCCUPANCY_RATE,
    totalRevenue: DataType.REVENUE,

    // POS (legacy analytics keys)
    totalSales: DataType.SALES,
    totalTransactions: DataType.POS_TRANSACTIONS,
    averageTransactionValue: DataType.SALES,
    dailySales: DataType.SALES_BY_DAY,
    weeklySales: DataType.SALES_BY_WEEKDAY,
    monthlySales: DataType.SALES_BY_DAY,
  }

  const normalizeLegacyDataTypeAny = (raw: any): DataType | undefined => {
    const v = String(raw ?? "").trim()
    if (!v) return undefined
    if (dataTypeValues.has(v)) return v as DataType

    // Common older synonyms
    if (v === "itemsSummary") return DataType.TOTAL_ITEMS
    if (v === "sales") return DataType.REVENUE
    if (v === "expense" || v === "expenses") return DataType.EXPENSES
    if (v === "budget" || v === "budgetVariance" || v === "budgetvariance") return DataType.BUDGET_VARIANCE
    if (v === "invoice" || v === "invoices") return DataType.TOTAL_ITEMS
    if (v === "timeOff" || v === "timeOffRequests" || v === "holidays" || v === "holidayRequests") return DataType.TIME_OFF_REQUESTS
    if (v === "cancellations" || v === "cancelledBookings" || v === "bookingCancellations") return DataType.CANCELLATION_ANALYSIS
    if (v === "noShows" || v === "noShowBookings" || v === "noshows" || v === "bookingNoShows") return DataType.NO_SHOW_ANALYSIS

    if (v in legacyKeyToDataType) return legacyKeyToDataType[v]
    return undefined
  }

  const inferDisplayModeFromLegacy = (dt: DataType, config?: any): DataSeries["displayMode"] => {
    const fmt = String(config?.format || "").toLowerCase()
    if (fmt === "currency" || fmt === "money" || fmt === "gbp" || fmt === "price") return "price"
    if (fmt === "percentage" || fmt === "percent" || fmt === "%") return "percentage"
    if (fmt === "score" || fmt === "rating") return "score"

    // Fallback: infer from DataType (keeps consistency with widget creator)
    switch (dt) {
      case DataType.PROFIT_MARGIN:
      case DataType.ATTENDANCE:
      case DataType.OCCUPANCY_RATE:
      case DataType.TRAINING_PROGRESS:
      case DataType.ATTENDANCE_TRENDS:
        return "percentage"
      case DataType.PERFORMANCE:
      case DataType.PERFORMANCE_METRICS:
        return "score"
      case DataType.STOCK_VALUE:
      case DataType.INVENTORY_VALUE:
      case DataType.PROFIT:
      case DataType.COST_OF_SALES:
      case DataType.PAYROLL:
      case DataType.REVENUE:
      case DataType.EXPENSES:
      case DataType.CASH_FLOW_ANALYSIS:
      case DataType.EXPENSE_BREAKDOWN:
      case DataType.OUTSTANDING_INVOICES:
      case DataType.BUDGET_VARIANCE:
        return "price"
      default:
        return "quantity"
    }
  }

  const migratedWidgets: WidgetSettings[] = legacyLayout
    .map((lw: any) => {
      if (!lw || typeof lw !== "object") return null

      const pos = lw.position || { x: lw.x, y: lw.y, w: lw.w, h: lw.h }
      const gridX = toFiniteNumber(pos?.x, 0)
      const gridY = toFiniteNumber(pos?.y, 0)
      const gridWidth = Math.max(2, toFiniteNumber(pos?.w, 10))
      const gridHeight = Math.max(2, toFiniteNumber(pos?.h, 6))

      const type = normalizeWidgetType(lw.type, lw.chartType, lw.displayType)
      const dt = normalizeLegacyDataTypeAny(lw.dataType) || normalizeLegacyDataTypeAny(lw.dataKey) || DataType.TOTAL_ITEMS
      const displayMode = inferDisplayModeFromLegacy(dt, lw.config)
      const color = DEFAULT_DATA_COLORS[dt] || BRAND.navy

      const widget: WidgetSettings = {
        id: String(lw.id || uuidv4()),
        type,
        title: String(lw.title || toTitleFromDataType(dt)),
        gridX,
        gridY,
        gridWidth,
        gridHeight,
        x: convertGridUnitsToPixels(gridX, 0),
        y: convertGridUnitsToPixels(gridY, 0),
        width: convertGridUnitsToPixels(gridWidth, 10),
        height: convertGridUnitsToPixels(gridHeight, 6),
        minW: 2,
        minH: 2,
        dataType: dt,
        displayMode,
        dataConfigMode: "series",
        dataSeries: [
          {
            dataType: dt,
            displayMode,
            dataOption: "",
            color,
            visible: true,
            label: toTitleFromDataType(dt),
          },
        ],
        colors: makeWidgetColors([color]),
        visible: lw.visible !== false,
      }

      return normalizeWidgetLayout(widget)
    })
    .filter(Boolean) as WidgetSettings[]

  if (migratedWidgets.length === 0) return null
  return { widgets: migratedWidgets }
}

// Section-specific default layouts
const getDefaultLayoutForSection = (section: string): DashboardState => {
  switch (section) {
    case 'global':
      return {
        widgets: [
          {
            id: "total-employees",
            type: WidgetType.STAT,
            title: "Total Employees",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.TOTAL_ITEMS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.TOTAL_ITEMS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Total Employees" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "total-revenue",
            type: WidgetType.STAT,
            title: "Total Revenue",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.REVENUE,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.REVENUE, displayMode: "price", color: BRAND.success, visible: true, label: "Revenue" }],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "total-bookings",
            type: WidgetType.STAT,
            title: "Total Bookings",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.TOTAL_BOOKINGS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.TOTAL_BOOKINGS, displayMode: "quantity", color: BRAND.warning, visible: true, label: "Bookings" }],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "stock-value",
            type: WidgetType.STAT,
            title: "Stock Value",
            x: 660,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 33,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.STOCK_VALUE,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.STOCK_VALUE, displayMode: "price", color: BRAND.navy, visible: true, label: "Stock Value" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "revenue-trends",
            type: WidgetType.LINE_CHART,
            title: "Revenue Trends",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.REVENUE,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.REVENUE, displayMode: "price", color: BRAND.navy, visible: true, label: "Revenue" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning]),
            visible: true,
          },
          {
            id: "departments",
            type: WidgetType.PIE_CHART,
            title: "Employees by Department",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.DEPARTMENTS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.DEPARTMENTS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Departments" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning, BRAND.error, BRAND.navy]),
            visible: true,
          },
        ]
      }
    case 'stock':
      return {
        widgets: [
          {
            id: "total-items",
            type: WidgetType.STAT,
            title: "Total Items",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.TOTAL_ITEMS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.TOTAL_ITEMS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Total Items" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "stock-value",
            type: WidgetType.STAT,
            title: "Stock Value",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.STOCK_VALUE,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.STOCK_VALUE, displayMode: "price", color: BRAND.navy, visible: true, label: "Stock Value" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "low-stock",
            type: WidgetType.STAT,
            title: "Low Stock Items",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.LOW_STOCK_ITEMS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.LOW_STOCK_ITEMS, displayMode: "quantity", color: BRAND.warning, visible: true, label: "Low Stock" }],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "stock-trends",
            type: WidgetType.LINE_CHART,
            title: "Stock Trends",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.STOCK_TRENDS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.STOCK_TRENDS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Stock Trends" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning]),
            visible: true,
          },
          {
            id: "stock-by-category",
            type: WidgetType.PIE_CHART,
            title: "Stock by Category",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.STOCK_BY_CATEGORY,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.STOCK_BY_CATEGORY, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Categories" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning, BRAND.error, BRAND.navy]),
            visible: true,
          }
        ]
      }
    case 'hr':
      return {
        widgets: [
          {
            id: "total-employees",
            type: WidgetType.STAT,
            title: "Total Employees",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.TOTAL_ITEMS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.TOTAL_ITEMS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Total Employees" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "attendance-rate",
            type: WidgetType.STAT,
            title: "Attendance Rate",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.ATTENDANCE,
            displayMode: "percentage",
            dataSeries: [{ dataType: DataType.ATTENDANCE, displayMode: "percentage", color: BRAND.success, visible: true, label: "Attendance" }],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "performance-score",
            type: WidgetType.STAT,
            title: "Performance Score",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.PERFORMANCE,
            displayMode: "score",
            dataSeries: [{ dataType: DataType.PERFORMANCE, displayMode: "score", color: BRAND.warning, visible: true, label: "Performance" }],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "attendance-trends",
            type: WidgetType.LINE_CHART,
            title: "Attendance Trends",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.ATTENDANCE,
            displayMode: "percentage",
            dataSeries: [{ dataType: DataType.ATTENDANCE, displayMode: "percentage", color: BRAND.navy, visible: true, label: "Attendance Trends" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning]),
            visible: true,
          },
          {
            id: "employees-by-department",
            type: WidgetType.PIE_CHART,
            title: "Employees by Department",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.DEPARTMENTS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.DEPARTMENTS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Departments" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning, BRAND.error, BRAND.navy]),
            visible: true,
          }
        ]
      }
    case 'bookings':
      return {
        widgets: [
          {
            id: "total-bookings",
            type: WidgetType.STAT,
            title: "Total Bookings",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.TOTAL_BOOKINGS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.TOTAL_BOOKINGS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Total Bookings" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "occupancy-rate",
            type: WidgetType.STAT,
            title: "Occupancy Rate",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.OCCUPANCY_RATE,
            displayMode: "percentage",
            dataSeries: [{ dataType: DataType.OCCUPANCY_RATE, displayMode: "percentage", color: BRAND.success, visible: true, label: "Occupancy" }],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "waitlist-count",
            type: WidgetType.STAT,
            title: "Waitlist",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.WAITLIST_ANALYTICS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.WAITLIST_ANALYTICS, displayMode: "quantity", color: BRAND.warning, visible: true, label: "Waitlist" }],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "booking-trends",
            type: WidgetType.LINE_CHART,
            title: "Booking Trends",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.BOOKING_TRENDS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.BOOKING_TRENDS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Booking Trends" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning]),
            visible: true,
          },
          {
            id: "bookings-by-status",
            type: WidgetType.PIE_CHART,
            title: "Bookings by Status",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.BOOKINGS_BY_STATUS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.BOOKINGS_BY_STATUS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Status" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning, BRAND.error, BRAND.navy]),
            visible: true,
          }
        ]
      }
    case 'pos':
      return {
        widgets: [
          {
            id: "total-transactions",
            type: WidgetType.STAT,
            title: "Total Transactions",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.POS_TRANSACTIONS,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.POS_TRANSACTIONS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Transactions" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "daily-revenue",
            type: WidgetType.STAT,
            title: "Daily Revenue",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SALES_BY_DAY,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.SALES_BY_DAY, displayMode: "price", color: BRAND.success, visible: true, label: "Revenue" }],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "average-order-value",
            type: WidgetType.STAT,
            title: "Average Order Value",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SALES_BY_DAY,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.SALES_BY_DAY, displayMode: "price", color: BRAND.warning, visible: true, label: "AOV" }],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "sales-trends",
            type: WidgetType.LINE_CHART,
            title: "Sales Trends",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.SALES_BY_DAY,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.SALES_BY_DAY, displayMode: "price", color: BRAND.navy, visible: true, label: "Sales Trends" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning]),
            visible: true,
          },
          {
            id: "payment-methods",
            type: WidgetType.PIE_CHART,
            title: "Payment Methods",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.PAYMENT_METHOD_BREAKDOWN,
            displayMode: "quantity",
            dataSeries: [{ dataType: DataType.PAYMENT_METHOD_BREAKDOWN, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Payment Methods" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.warning, BRAND.error, BRAND.navy]),
            visible: true,
          }
        ]
      }
    case "supply":
      return {
        widgets: [
          {
            id: "supply-clients",
            type: WidgetType.STAT,
            title: "Total Clients",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SUPPLY_CLIENTS,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_CLIENTS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Clients" },
            ],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "supply-orders",
            type: WidgetType.STAT,
            title: "Total Orders",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SUPPLY_ORDERS,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_ORDERS, displayMode: "quantity", color: BRAND.success, visible: true, label: "Orders" },
            ],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "supply-deliveries",
            type: WidgetType.STAT,
            title: "Total Deliveries",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SUPPLY_DELIVERIES,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_DELIVERIES, displayMode: "quantity", color: BRAND.warning, visible: true, label: "Deliveries" },
            ],
            colors: makeWidgetColors([BRAND.warning]),
            visible: true,
          },
          {
            id: "supply-draft-orders",
            type: WidgetType.STAT,
            title: "Draft Orders",
            x: 660,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 33,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.SUPPLY_ORDERS_DRAFT,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_ORDERS_DRAFT, displayMode: "quantity", color: BRAND.error, visible: true, label: "Draft" },
            ],
            colors: makeWidgetColors([BRAND.error]),
            visible: true,
          },
          {
            id: "supply-orders-trend",
            type: WidgetType.LINE_CHART,
            title: "Orders Trend",
            x: 0,
            y: 120,
            width: 420,
            height: 240,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 21,
            gridHeight: 12,
            dataType: DataType.SUPPLY_ORDERS,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_ORDERS, displayMode: "quantity", color: BRAND.navy, visible: true, label: "Orders" },
            ],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "supply-deliveries-trend",
            type: WidgetType.LINE_CHART,
            title: "Deliveries Trend",
            x: 440,
            y: 120,
            width: 420,
            height: 240,
            minW: 4,
            minH: 3,
            gridX: 22,
            gridY: 6,
            gridWidth: 21,
            gridHeight: 12,
            dataType: DataType.SUPPLY_DELIVERIES,
            displayMode: "quantity",
            dataSeries: [
              { dataType: DataType.SUPPLY_DELIVERIES, displayMode: "quantity", color: BRAND.success, visible: true, label: "Deliveries" },
            ],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
        ],
      }
    case 'finance':
      return {
        widgets: [
          {
            id: "total-revenue",
            type: WidgetType.STAT,
            title: "Total Revenue",
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 0,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.REVENUE,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.REVENUE, displayMode: "price", color: BRAND.navy, visible: true, label: "Revenue" }],
            colors: makeWidgetColors([BRAND.navy]),
            visible: true,
          },
          {
            id: "total-expenses",
            type: WidgetType.STAT,
            title: "Total Expenses",
            x: 220,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 11,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.EXPENSES,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.EXPENSES, displayMode: "price", color: BRAND.error, visible: true, label: "Expenses" }],
            colors: makeWidgetColors([BRAND.error]),
            visible: true,
          },
          {
            id: "net-profit",
            type: WidgetType.STAT,
            title: "Net Profit",
            x: 440,
            y: 0,
            width: 200,
            height: 100,
            minW: 2,
            minH: 2,
            gridX: 22,
            gridY: 0,
            gridWidth: 10,
            gridHeight: 5,
            dataType: DataType.PROFIT,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.PROFIT, displayMode: "price", color: BRAND.success, visible: true, label: "Profit" }],
            colors: makeWidgetColors([BRAND.success]),
            visible: true,
          },
          {
            id: "cash-flow",
            type: WidgetType.LINE_CHART,
            title: "Cash Flow Analysis",
            x: 0,
            y: 120,
            width: 400,
            height: 200,
            minW: 4,
            minH: 3,
            gridX: 0,
            gridY: 6,
            gridWidth: 20,
            gridHeight: 10,
            dataType: DataType.CASH_FLOW_ANALYSIS,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.CASH_FLOW_ANALYSIS, displayMode: "price", color: BRAND.navy, visible: true, label: "Cash Flow" }],
            colors: makeWidgetColors([BRAND.navy, BRAND.success, BRAND.error]),
            visible: true,
          },
          {
            id: "expense-breakdown",
            type: WidgetType.PIE_CHART,
            title: "Expense Breakdown",
            x: 420,
            y: 120,
            width: 300,
            height: 200,
            minW: 3,
            minH: 3,
            gridX: 21,
            gridY: 6,
            gridWidth: 15,
            gridHeight: 10,
            dataType: DataType.EXPENSE_BREAKDOWN,
            displayMode: "price",
            dataSeries: [{ dataType: DataType.EXPENSE_BREAKDOWN, displayMode: "price", color: BRAND.warning, visible: true, label: "Expenses" }],
            colors: makeWidgetColors([BRAND.warning, BRAND.error, BRAND.navy, BRAND.navy, BRAND.success]),
            visible: true,
          }
        ]
      }
    default:
      return { widgets: [] }
  }
}

// Fix the initial dashboard state to use enum values
const INITIAL_DASHBOARD_STATE: DashboardState = {
  widgets: [
    {
      id: "performance-chart",
      type: WidgetType.LINE_CHART,
      title: "Stock Performance",
      x: 0,
      y: 0,
      width: 600,
      height: 300,
      minW: 4,
      minH: 3,
      gridX: 0,
      gridY: 0,
      gridWidth: 30, // 600px / 20px = 30 grid units
      gridHeight: 15, // 300px / 20px = 15 grid units
      dataType: DataType.STOCK_COUNT,
      displayMode: "quantity",
      dataSeries: [
        {
          dataType: DataType.STOCK_COUNT,
          displayMode: "quantity",
          color: BRAND.success,
          visible: true,
          label: "Stock Count",
        },
      ],
      colors: makeWidgetColors([BRAND.success, BRAND.navy, BRAND.error]),
      visible: true,
    },
    {
      id: "category-chart",
      type: WidgetType.BAR_CHART,
      title: "Category Distribution",
      x: 620,
      y: 0,
      width: 600,
      height: 300,
      minW: 4,
      minH: 3,
      gridX: 31, // (620px / 20px) = 31 grid units
      gridY: 0,
      gridWidth: 30, // 600px / 20px = 30 grid units
      gridHeight: 15, // 300px / 20px = 15 grid units
      dataType: DataType.STOCK_COUNT,
      displayMode: "quantity",
      dataSeries: [
        {
          dataType: DataType.STOCK_COUNT,
          displayMode: "quantity",
          color: BRAND.success,
          visible: true,
          label: "Stock Count",
        },
      ],
      colors: makeWidgetColors([BRAND.success, BRAND.navy, BRAND.error, BRAND.warning, BRAND.navy]),
      visible: true,
    },
    {
      id: "stock-value",
      type: WidgetType.STAT,
      title: "Total Stock Value",
      x: 0,
      y: 320,
      width: 300,
      height: 150,
      minW: 2,
      minH: 1,
      gridX: 0,
      gridY: 16, // (320px / 20px) = 16 grid units
      gridWidth: 15, // 300px / 20px = 15 grid units
      gridHeight: 8, // 150px / 20px = 7.5 grid units (rounded to 8)
      dataType: DataType.STOCK_VALUE,
      displayMode: "price",
      dataSeries: [
        {
          dataType: DataType.STOCK_VALUE,
          displayMode: "price",
          color: BRAND.navy,
          visible: true,
          label: "Stock Value",
        },
      ],
      colors: makeWidgetColors([BRAND.navy]),
      visible: true,
    },
    {
      id: "stock-count",
      type: WidgetType.STAT,
      title: "Total Items",
      x: 320,
      y: 320,
      width: 300,
      height: 150,
      minW: 2,
      minH: 1,
      gridX: 16, // (320px / 20px) = 16 grid units
      gridY: 16, // (320px / 20px) = 16 grid units
      gridWidth: 15, // 300px / 20px = 15 grid units
      gridHeight: 8, // 150px / 20px = 7.5 grid units (rounded to 8)
      dataType: DataType.STOCK_COUNT,
      displayMode: "quantity",
      dataSeries: [
        {
          dataType: DataType.STOCK_COUNT,
          displayMode: "quantity",
          color: BRAND.success,
          visible: true,
          label: "Stock Count",
        },
      ],
      colors: makeWidgetColors([BRAND.success]),
      visible: true,
    },
    {
      id: "profit-chart",
      type: WidgetType.PIE_CHART,
      title: "Profit Distribution",
      x: 640,
      y: 320,
      width: 300,
      height: 300,
      minW: 3,
      minH: 3,
      gridX: 32, // (640px / 20px) = 32 grid units
      gridY: 16, // (320px / 20px) = 16 grid units
      gridWidth: 15, // 300px / 20px = 15 grid units
      gridHeight: 15, // 300px / 20px = 15 grid units
      dataType: DataType.PROFIT,
      displayMode: "price",
      dataSeries: [
        {
          dataType: DataType.PROFIT,
          displayMode: "price",
          color: BRAND.success,
          visible: true,
          label: "Profit",
        },
      ],
      colors: makeWidgetColors([BRAND.success, BRAND.error]),
      visible: true,
    },
  ],
}

const useWidgetManager = (section: string = 'stock') => {
  const [dashboardState, setDashboardState] = useState<DashboardState>(() => getDefaultLayoutForSection(section))
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [, setContainerHeight] = useState<number>(600)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const savedStateSnapshotRef = useRef<DashboardState | null>(null) // Store snapshot for instant revert

  // Ensure dashboard persistence is scoped to the current user + company/site/subsite context.
  // This prevents overwriting layouts when switching between companies/sites/subsites.
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const scopeKey = [
    settingsState.auth?.uid || "anon",
    companyState.companyID || "no-company",
    companyState.selectedSiteID || "no-site",
    companyState.selectedSubsiteID || "no-subsite",
  ].join("::")
  
  // Call useAnalytics unconditionally at top level (React hooks rule)
  // The hook itself handles the case when provider is not available
  const analytics = useAnalytics()
  
  // Get analytics functions if available, otherwise use null
  const saveDashboardLayout = analytics?.saveDashboardLayout || null
  const loadDashboardLayout = analytics?.loadDashboardLayout || null

  // Stabilize analytics function references to avoid useEffect loops.
  // Some providers re-create function references on every render.
  const loadDashboardLayoutRef = useRef<typeof loadDashboardLayout>(null)
  const saveDashboardLayoutRef = useRef<typeof saveDashboardLayout>(null)

  useEffect(() => {
    loadDashboardLayoutRef.current = loadDashboardLayout
  }, [loadDashboardLayout])

  useEffect(() => {
    saveDashboardLayoutRef.current = saveDashboardLayout
  }, [saveDashboardLayout])
  
  // silent

  // Load dashboard state from database first, then localStorage fallback
  useEffect(() => {
    // Reset load flag when section or scope changes
    setIsInitialLoadComplete(false)
    
    const loadDashboard = async () => {
      // Try to load from database first (if analytics is available)
      const loadFn = loadDashboardLayoutRef.current
      if (loadFn) {
        try {
          // silent
          const dbLayout = await loadFn(section)
          
          // loadDashboardLayout returns the layout array directly
          // Handle both array return and object with layout property (for backward compatibility)
          let layoutArray: WidgetSettings[] = []
          if (Array.isArray(dbLayout)) {
            layoutArray = dbLayout
          } else if (dbLayout && typeof dbLayout === 'object' && 'layout' in dbLayout && Array.isArray((dbLayout as any).layout)) {
            layoutArray = (dbLayout as any).layout
          } else if (dbLayout && typeof dbLayout === 'object') {
            // Try to extract layout from any structure
            // silent
            layoutArray = []
          }
          
          // IMPORTANT: `AnalyticsContext.loadDashboardLayout()` previously saved "dashboard card" layouts
          // (objects with `position: {x,y,w,h}`) which are NOT compatible with WidgetSettings-based dashboards.
          // If we detect that shape, ignore it and migrate back to the widget-manager default layout.
          const looksLikeWidgetSettingsLayout =
            Array.isArray(layoutArray) &&
            layoutArray.some(
              (w: any) =>
                w &&
                typeof w === "object" &&
                ("width" in w || "height" in w || "gridWidth" in w || "gridHeight" in w || "minW" in w || "minH" in w),
            )

          if (layoutArray && layoutArray.length > 0 && !looksLikeWidgetSettingsLayout) {
            const migrated = migrateLegacyDashboardLayout(section, layoutArray as any[])
            const nextState = migrated || getDefaultLayoutForSection(section)
            setDashboardState(nextState)
            savedStateSnapshotRef.current = JSON.parse(JSON.stringify(nextState))
            updateContainerHeight(nextState.widgets)
            setIsInitialLoadComplete(true)
            setSelectedWidgetId(null)

            // Best-effort: overwrite incompatible DB layout with migrated/default so it doesn't keep coming back.
            const saveFn = saveDashboardLayoutRef.current
            if (saveFn) {
              try {
                await saveFn(section, nextState.widgets)
              } catch {
                // ignore
              }
            }
            return
          }

          if (layoutArray && layoutArray.length > 0) {
            // silent
            
            // Ensure all widgets have grid positions and dataSeries
            // NOTE: Don't return early after fixing grid coords; some older saved widgets are missing BOTH grid coords and dataSeries.
            const updatedWidgets = layoutArray.map((widget: WidgetSettings) => {
              let normalized: any = normalizeWidgetLayout(widget)

              const normalizeLegacyDataType = (dt: any): any => {
                const v = String(dt || "")
                if (v === "itemsSummary") return DataType.TOTAL_ITEMS
                if (v === "timeOff" || v === "timeOffRequests" || v === "holidays" || v === "holidayRequests")
                  return DataType.TIME_OFF_REQUESTS
                if (v === "cancellations" || v === "cancelledBookings" || v === "bookingCancellations")
                  return DataType.CANCELLATION_ANALYSIS
                if (v === "noShows" || v === "noShowBookings" || v === "noshows" || v === "bookingNoShows")
                  return DataType.NO_SHOW_ANALYSIS
                if (v === "sales") return DataType.REVENUE
                if (v === "expense" || v === "expenses") return DataType.EXPENSES
                if (v === "budget" || v === "budgetVariance" || v === "budgetvariance") return DataType.BUDGET_VARIANCE
                if (v === "invoice" || v === "invoices") return DataType.TOTAL_ITEMS
                return dt
              }

              // Migrate legacy/invalid data types early to avoid MUI Select warnings and builder issues.
              normalized.dataType = normalizeLegacyDataType(normalized.dataType)

              if (!Array.isArray(normalized.dataSeries)) {
                const dataType = (normalizeLegacyDataType(normalized.dataType) || DataType.TOTAL_ITEMS) as DataType
                const displayMode = normalized.displayMode || "quantity"
                const color = DEFAULT_DATA_COLORS[dataType] || BRAND.success

                normalized.dataSeries = [
                  {
                    dataType,
                    displayMode,
                    color,
                    visible: true,
                    dataOption: "",
                    label:
                      dataType
                        .toString()
                        .charAt(0)
                        .toUpperCase() +
                      dataType
                        .toString()
                        .slice(1)
                        .replace(/([A-Z])/g, " $1"),
                  },
                ]
              }

              // Ensure series are also migrated/safe for storage (RTDB rejects `undefined` values).
              if (Array.isArray(normalized.dataSeries)) {
                normalized.dataSeries = normalized.dataSeries.map((s: any) => ({
                  ...s,
                  dataType: normalizeLegacyDataType(s?.dataType),
                  dataOption: typeof s?.dataOption === "string" ? s.dataOption : "",
                }))
              }

              // Card widgets must have a `dataType` for non-chart data builders.
              if (
                (normalized.type === WidgetType.CARD ||
                  normalized.type === WidgetType.STAT ||
                  normalized.type === WidgetType.DASHBOARD_CARD) &&
                !normalized.dataType &&
                Array.isArray(normalized.dataSeries) &&
                normalized.dataSeries[0]?.dataType
              ) {
                normalized.dataType = normalized.dataSeries[0].dataType
              }

              return normalized as WidgetSettings
            })

          const loadedState = { widgets: updatedWidgets as WidgetSettings[] }
          setDashboardState(loadedState)
          savedStateSnapshotRef.current = JSON.parse(JSON.stringify(loadedState)) // Deep clone for snapshot
          updateContainerHeight(updatedWidgets)
          setIsInitialLoadComplete(true)
          return
          }
        } catch (error) {
          // silent
        }
      }

      // Fallback to localStorage
      const storageKey = `dashboardState_${scopeKey}_${section}`
      const savedState = localStorage.getItem(storageKey)
      // silent
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState)
          const widgetCount = parsedState.widgets?.length || 0
          // silent
          
          // If saved state has no widgets, use default layout instead
          if (widgetCount === 0) {
            // silent
            const defaultState = getDefaultLayoutForSection(section)
            setDashboardState(defaultState)
            savedStateSnapshotRef.current = JSON.parse(JSON.stringify(defaultState))
            updateContainerHeight(defaultState.widgets)
            setIsInitialLoadComplete(true)
            return
          }

          const updatedWidgets = parsedState.widgets.map((widget: WidgetSettings) => {
            let normalized: any = normalizeWidgetLayout(widget)

            const normalizeLegacyDataType = (dt: any): any => {
              const v = String(dt || "")
              if (v === "itemsSummary") return DataType.TOTAL_ITEMS
              if (v === "timeOff" || v === "timeOffRequests" || v === "holidays" || v === "holidayRequests")
                return DataType.TIME_OFF_REQUESTS
              if (v === "cancellations" || v === "cancelledBookings" || v === "bookingCancellations")
                return DataType.CANCELLATION_ANALYSIS
              if (v === "noShows" || v === "noShowBookings" || v === "noshows" || v === "bookingNoShows")
                return DataType.NO_SHOW_ANALYSIS
              if (v === "sales") return DataType.REVENUE
              if (v === "expense" || v === "expenses") return DataType.EXPENSES
              if (v === "budget" || v === "budgetVariance" || v === "budgetvariance") return DataType.BUDGET_VARIANCE
              if (v === "invoice" || v === "invoices") return DataType.TOTAL_ITEMS
              return dt
            }

            normalized.dataType = normalizeLegacyDataType(normalized.dataType)

            if (!Array.isArray(normalized.dataSeries)) {
              const dataType = normalizeLegacyDataType(normalized.dataType) || "stockCount"
              const displayMode = normalized.displayMode || "quantity"
              const color = DEFAULT_DATA_COLORS[dataType] || BRAND.success

              normalized.dataSeries = [
                {
                  dataType,
                  displayMode,
                  color,
                  visible: true,
                  dataOption: "",
                  label:
                    dataType.charAt(0).toUpperCase() +
                    dataType.slice(1).replace(/([A-Z])/g, " $1"),
                },
              ]
            }

            if (Array.isArray(normalized.dataSeries)) {
              normalized.dataSeries = normalized.dataSeries.map((s: any) => ({
                ...s,
                dataType: normalizeLegacyDataType(s?.dataType),
                dataOption: typeof s?.dataOption === "string" ? s.dataOption : "",
              }))
            }

            // Card widgets must have a `dataType` for non-chart data builders.
            if (
              (normalized.type === WidgetType.CARD ||
                normalized.type === WidgetType.STAT ||
                normalized.type === WidgetType.DASHBOARD_CARD) &&
              !normalized.dataType &&
              Array.isArray(normalized.dataSeries) &&
              normalized.dataSeries[0]?.dataType
            ) {
              normalized.dataType = normalized.dataSeries[0].dataType
            }

            return normalized
          })

          const loadedState = { ...parsedState, widgets: updatedWidgets }
          setDashboardState(loadedState)
          savedStateSnapshotRef.current = JSON.parse(JSON.stringify(loadedState)) // Deep clone for snapshot
          // silent
          updateContainerHeight(updatedWidgets)
          setIsInitialLoadComplete(true)
        } catch (error) {
          // silent
          const defaultState = getDefaultLayoutForSection(section)
          setDashboardState(defaultState)
          savedStateSnapshotRef.current = JSON.parse(JSON.stringify(defaultState)) // Deep clone for snapshot
          updateContainerHeight(defaultState.widgets)
          setIsInitialLoadComplete(true)
        }
      } else {
        const defaultState = getDefaultLayoutForSection(section)
        setDashboardState(defaultState)
        savedStateSnapshotRef.current = JSON.parse(JSON.stringify(defaultState)) // Deep clone for snapshot
        // silent
        updateContainerHeight(defaultState.widgets)
        setIsInitialLoadComplete(true)
      }
    }

    loadDashboard()
  }, [section, scopeKey])

  // Save dashboard state to database and localStorage whenever it changes
  useEffect(() => {
    // Don't save until initial load is complete to avoid overwriting saved layouts
    if (!isInitialLoadComplete) {
      return
    }

    const saveDashboard = async () => {
      // silent
      
      // Ensure all widgets have required grid positions before saving
      const widgetsToSave = dashboardState.widgets.map((widget) => {
        const widgetCopy = { ...widget }
        // Ensure grid positions exist
        if (widgetCopy.gridX === undefined) {
          widgetCopy.gridX = convertPixelsToGridUnits(widgetCopy.x, 0)
        }
        if (widgetCopy.gridY === undefined) {
          widgetCopy.gridY = convertPixelsToGridUnits(widgetCopy.y, 0)
        }
        if (widgetCopy.gridWidth === undefined) {
          widgetCopy.gridWidth = convertPixelsToGridUnits(widgetCopy.width, 10)
        }
        if (widgetCopy.gridHeight === undefined) {
          widgetCopy.gridHeight = convertPixelsToGridUnits(widgetCopy.height, 6)
        }
        return widgetCopy
      })
      
      // silent
      
      // Save to localStorage immediately for fast access
      const storageKey = `dashboardState_${scopeKey}_${section}`
      const stateToSave = { ...dashboardState, widgets: widgetsToSave }
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
      // silent
      
      // Save to database (if analytics is available)
      const saveFn = saveDashboardLayoutRef.current
      if (saveFn) {
        try {
          await saveFn(section, widgetsToSave)
          // silent
        } catch (error) {
          // silent
          // Continue with localStorage only if database save fails
        }
      } else {
        // silent
      }
    }

    saveDashboard()
  }, [dashboardState, section, scopeKey, isInitialLoadComplete])

  // Calculate the required container height based on widget positions
  const updateContainerHeight = (widgets: WidgetSettings[]) => {
    if (!widgets.length) {
      setContainerHeight(600)
      return
    }

      const maxY = Math.max(
        ...widgets.map((widget) => {
          const gridY = widget.gridY || 0
          const gridHeight = widget.gridHeight || 2
          return gridY + gridHeight
        }),
      )

    setContainerHeight(convertGridUnitsToPixels(maxY))
  }

  const updateWidgetSettings = useCallback((updatedSettings: WidgetSettings) => {
    setDashboardState((prevState: DashboardState) => {
      const nextSettings: any = { ...updatedSettings }

      // Ensure Card widgets keep `dataType` in sync with their primary series.
      if (
        (nextSettings.type === WidgetType.CARD ||
          nextSettings.type === WidgetType.STAT ||
          nextSettings.type === WidgetType.DASHBOARD_CARD) &&
        !nextSettings.dataType &&
        Array.isArray(nextSettings.dataSeries) &&
        nextSettings.dataSeries[0]?.dataType
      ) {
        nextSettings.dataType = nextSettings.dataSeries[0].dataType
      }

      const updatedWidgets = prevState.widgets.map((widget) =>
        widget.id === nextSettings.id ? (nextSettings as WidgetSettings) : widget,
      )

      // Update container height if needed
      updateContainerHeight(updatedWidgets)

      return {
        ...prevState,
        widgets: updatedWidgets,
      }
    })
  }, [])

  const toTitleFromDataType = (dataType: DataType) => {
    const raw = String(dataType || "")
    // dataType values are camelCase strings (e.g. "stockValue") → "Stock Value"
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/([A-Z])/g, " $1")
  }

  const removeWidget = useCallback(
    (id: string) => {
      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = prevState.widgets.filter((widget) => widget.id !== id)

        // Update container height if needed
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })

      if (selectedWidgetId === id) {
        setSelectedWidgetId(null)
      }
    },
    [selectedWidgetId],
  )

  // Fix the addWidget function to handle DataType enum
  const addWidget = useCallback(
    (
      type: "stat" | "barChart" | "lineChart" | "pieChart" | "chart" | "table" | "dashboardCard" | "calculator",
      dataType: DataType,
    ) => {
      // Find a suitable position for the new widget
      const existingWidgets = dashboardState.widgets

      // Find the lowest y position in grid units
      let maxGridY = 0
      if (existingWidgets.length > 0) {
        maxGridY = Math.max(...existingWidgets.map((w) => (w.gridY || 0) + (w.gridHeight || 2)))
      }

      // Default sizes based on widget type
      let gridWidth = 15 // 300px
      let gridHeight = 8 // 160px
      let minW = 2
      let minH = 1

      if (type === "barChart" || type === "lineChart") {
        gridWidth = 30 // 600px
        gridHeight = 15 // 300px
        minW = 4
        minH = 3
      } else if (type === "pieChart") {
        gridWidth = 15 // 300px
        gridHeight = 15 // 300px
        minW = 3
        minH = 3
      } else if (type === "table") {
        gridWidth = 30 // 600px
        gridHeight = 20 // 400px
        minW = 6
        minH = 4
      } else if (type === "dashboardCard") {
        gridWidth = 15 // 300px
        gridHeight = 8 // 160px
        minW = 3
        minH = 2
      } else if (type === "calculator") {
        gridWidth = 18 // 360px (portrait calculator ratio)
        gridHeight = 24 // 480px
        minW = 3
        minH = 4
      }

      // Convert to pixels
      const x = 0
      const y = convertGridUnitsToPixels(maxGridY + 1) // Add 1 grid unit of spacing
      const width = convertGridUnitsToPixels(gridWidth)
      const height = convertGridUnitsToPixels(gridHeight)

      const inferDisplayMode = (dt: DataType): DataSeries["displayMode"] => {
        switch (dt) {
          case DataType.PROFIT_MARGIN:
          case DataType.ATTENDANCE:
          case DataType.OCCUPANCY_RATE:
          case DataType.TRAINING_PROGRESS:
          case DataType.ATTENDANCE_TRENDS:
            return "percentage"
          case DataType.PERFORMANCE:
          case DataType.PERFORMANCE_METRICS:
            return "score"
          case DataType.STOCK_VALUE:
          case DataType.INVENTORY_VALUE:
          case DataType.PROFIT:
          case DataType.COST_OF_SALES:
          case DataType.PAYROLL:
          case DataType.REVENUE:
          case DataType.EXPENSES:
          case DataType.CASH_FLOW_ANALYSIS:
          case DataType.EXPENSE_BREAKDOWN:
          case DataType.OUTSTANDING_INVOICES:
          case DataType.BUDGET_VARIANCE:
            return "price"
          default:
            return "quantity"
        }
      }

      const getDefaultDataOption = (dt: DataType): string | undefined => {
        switch (dt) {
          case DataType.SALES:
          case DataType.PURCHASES:
          case DataType.REVENUE:
            return "gross"
          case DataType.PROFIT:
          case DataType.PROFIT_MARGIN:
            return "value"
          default:
            return undefined
        }
      }

      // Determine display mode based on data type + option.
      const dataOption = getDefaultDataOption(dataType)
      const displayMode: DataSeries["displayMode"] =
        dataOption === "percentage" ? "percentage" : dataOption === "value" || dataOption === "gross" || dataOption === "net" ? "price" : inferDisplayMode(dataType)

      // Create the data series
      const dataSeries: DataSeries[] = [
        {
          dataType,
          dataOption,
          displayMode,
          color: DEFAULT_DATA_COLORS[dataType] || BRAND.success,
          visible: true,
          label: dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/([A-Z])/g, " $1"),
        },
      ]

      // Map string type to WidgetType enum
      let widgetType: WidgetType
      const typeStr = type as string
      switch (typeStr) {
        case "stat":
          widgetType = WidgetType.CARD
          break
        case "barChart":
          widgetType = WidgetType.BAR_CHART
          break
        case "lineChart":
          widgetType = WidgetType.LINE_CHART
          break
        case "pieChart":
          widgetType = WidgetType.PIE_CHART
          break
        case "chart":
          widgetType = WidgetType.CHART
          break
        case "table":
          widgetType = WidgetType.TABLE
          break
        case "dashboardCard":
          widgetType = WidgetType.CARD
          break
        case "calculator":
          widgetType = WidgetType.CALCULATOR
          break
        default:
          widgetType = WidgetType.CARD
      }

      const newWidget: WidgetSettings = {
        id: uuidv4(),
        type: widgetType,
        title:
          widgetType === WidgetType.CARD
            ? toTitleFromDataType(dataType)
            : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        x,
        y,
        width,
        height,
        minW,
        minH,
        gridX: 0,
        gridY: maxGridY + 1,
        gridWidth,
        gridHeight,
        dataType,
        displayMode,
        dataConfigMode: "series",
        cardComparisonTarget: "none",
        dataSeries,
        colors: {
          ...makeWidgetColors([DEFAULT_DATA_COLORS[dataType] || BRAND.success]),
        },
        visible: true,
      }

      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = [...prevState.widgets, newWidget]

        // Update container height
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })

      return newWidget
    },
    [dashboardState.widgets],
  )

  // Fix the addDashboardCard function to handle DataType enum
  const addDashboardCard = useCallback(
    (cardData: any) => {
      // Convert dashboard card to widget
      const { title, dataType } = cardData

      // Find a suitable position
      const existingWidgets = dashboardState.widgets

      // Find the lowest y position in grid units
      let maxGridY = 0
      if (existingWidgets.length > 0) {
        maxGridY = Math.max(...existingWidgets.map((w) => (w.gridY || 0) + (w.gridHeight || 2)))
      }

      // Default sizes for dashboard card
      const gridWidth = 15 // 300px
      const gridHeight = 8 // 160px

      // Convert to pixels
      const x = 0
      const y = convertGridUnitsToPixels(maxGridY + 1) // Add 1 grid unit of spacing
      const width = convertGridUnitsToPixels(gridWidth)
      const height = convertGridUnitsToPixels(gridHeight)

      // Determine display mode based on data type
      const displayMode: "price" | "quantity" = [
        DataType.INVENTORY_VALUE,
        DataType.PROFIT_MARGIN,
        DataType.STOCK_VALUE,
        DataType.PREVIOUS_STOCK_VALUE,
        DataType.PREDICTED_STOCK_VALUE,
        DataType.PROFIT,
        DataType.WASTAGE,
      ].includes(dataType)
        ? "price"
        : "quantity"

      // Create the data series
      const dataSeries: DataSeries[] = [
        {
          dataType,
          displayMode,
          color: DEFAULT_DATA_COLORS[dataType] || BRAND.success,
          visible: true,
          label: title,
        },
      ]

      const newWidget: WidgetSettings = {
        id: uuidv4(),
        type: WidgetType.CARD,
        title,
        x,
        y,
        width,
        height,
        minW: 3,
        minH: 2,
        gridX: 0,
        gridY: maxGridY + 1,
        gridWidth,
        gridHeight,
        dataType,
        displayMode,
        dataConfigMode: "series",
        dataSeries,
        colors: {
          ...makeWidgetColors([DEFAULT_DATA_COLORS[dataType] || BRAND.success]),
        },
        visible: true,
        icon: getIconFromDataType(dataType),
      }

      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = [...prevState.widgets, newWidget]

        // Update container height
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })

      return newWidget
    },
    [dashboardState.widgets],
  )

  const getWidgetSettings = useCallback(
    (id: string): WidgetSettings | null => {
      return dashboardState.widgets.find((widget) => widget.id === id) || null
    },
    [dashboardState.widgets],
  )

  // Reset to the section default layout (and let the normal save effect persist it).
  const resetDashboard = useCallback(() => {
    const defaultState = getDefaultLayoutForSection(section)
    setDashboardState(defaultState)
    savedStateSnapshotRef.current = JSON.parse(JSON.stringify(defaultState))
    setSelectedWidgetId(null)
    updateContainerHeight(defaultState.widgets)
    setIsInitialLoadComplete(true)
  }, [section])

  // Revert to last saved layout (instant revert from snapshot)
  const revertDashboard = useCallback(async () => {
    // silent
    setIsInitialLoadComplete(false) // Prevent saving during reload
    
    // Instant revert from snapshot if available
    if (savedStateSnapshotRef.current) {
      const snapshot = JSON.parse(JSON.stringify(savedStateSnapshotRef.current)) // Deep clone
      setDashboardState(snapshot)
      updateContainerHeight(snapshot.widgets)
      setIsInitialLoadComplete(true)
      setSelectedWidgetId(null)
      // silent
      return
    }
    
    // Fallback: Try to load from database
    const loadFn = loadDashboardLayoutRef.current
    const saveFn = saveDashboardLayoutRef.current
    if (loadFn) {
      try {
        const dbLayout = await loadFn(section)
        const layoutArray = Array.isArray(dbLayout)
          ? dbLayout
          : dbLayout && typeof dbLayout === "object" && "layout" in dbLayout && Array.isArray((dbLayout as any).layout)
            ? (dbLayout as any).layout
            : (dbLayout || [])

        const looksLikeWidgetSettingsLayout =
          Array.isArray(layoutArray) &&
          layoutArray.some(
            (w: any) =>
              w &&
              typeof w === "object" &&
              ("width" in w || "height" in w || "gridWidth" in w || "gridHeight" in w || "minW" in w || "minH" in w),
          )
        
        if (layoutArray && layoutArray.length > 0 && !looksLikeWidgetSettingsLayout) {
          const migrated = migrateLegacyDashboardLayout(section, layoutArray as any[])
          const nextState = migrated || getDefaultLayoutForSection(section)
          setDashboardState(nextState)
          savedStateSnapshotRef.current = JSON.parse(JSON.stringify(nextState))
          updateContainerHeight(nextState.widgets)
          setIsInitialLoadComplete(true)
          setSelectedWidgetId(null)

          // Best-effort: overwrite incompatible DB layout (migrated/default)
          if (saveFn) {
            try {
              await saveFn(section, nextState.widgets)
            } catch {
              // ignore
            }
          }
          return
        }

        if (layoutArray && layoutArray.length > 0) {
          const updatedWidgets = layoutArray.map((widget: WidgetSettings) => {
            const normalized: any = normalizeWidgetLayout(widget)
            if (!Array.isArray(normalized.dataSeries)) {
              const dataType = (normalized.dataType || DataType.TOTAL_ITEMS) as DataType
              const displayMode = normalized.displayMode || "quantity"
              const color = DEFAULT_DATA_COLORS[dataType] || BRAND.success
              normalized.dataSeries = [
                {
                  dataType,
                  displayMode,
                  color,
                  visible: true,
                  label:
                    dataType
                      .toString()
                      .charAt(0)
                      .toUpperCase() +
                    dataType
                      .toString()
                      .slice(1)
                      .replace(/([A-Z])/g, " $1"),
                },
              ]
            }
            return normalized as WidgetSettings
          })
          
          setDashboardState({ widgets: updatedWidgets as WidgetSettings[] })
          updateContainerHeight(updatedWidgets)
          setIsInitialLoadComplete(true)
          setSelectedWidgetId(null)
          // silent
          return
        }
      } catch (error) {
        // silent
      }
    }
    
    // Fallback to localStorage (scoped by user/company/site/subsite)
    const storageKey = `dashboardState_${scopeKey}_${section}`
    const savedState = localStorage.getItem(storageKey)
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState)
        const updatedWidgets =
          parsedState.widgets?.map((widget: WidgetSettings) => {
            const normalized: any = normalizeWidgetLayout(widget)
            if (!Array.isArray(normalized.dataSeries)) {
              const dataType = (normalized.dataType || DataType.TOTAL_ITEMS) as DataType
              const displayMode = normalized.displayMode || "quantity"
              const color = DEFAULT_DATA_COLORS[dataType] || BRAND.success
              normalized.dataSeries = [
                {
                  dataType,
                  displayMode,
                  color,
                  visible: true,
                  label:
                    dataType
                      .toString()
                      .charAt(0)
                      .toUpperCase() +
                    dataType
                      .toString()
                      .slice(1)
                      .replace(/([A-Z])/g, " $1"),
                },
              ]
            }
            return normalized as WidgetSettings
          }) || []
        
        setDashboardState({ ...parsedState, widgets: updatedWidgets as WidgetSettings[] })
        updateContainerHeight(updatedWidgets)
        setIsInitialLoadComplete(true)
        setSelectedWidgetId(null)
        // silent
      } catch (error) {
        // silent
        // Fall back to default
        setDashboardState(getDefaultLayoutForSection(section))
        updateContainerHeight(getDefaultLayoutForSection(section).widgets)
        setIsInitialLoadComplete(true)
      }
    } else {
      // No saved state, revert to default
      setDashboardState(getDefaultLayoutForSection(section))
      updateContainerHeight(getDefaultLayoutForSection(section).widgets)
      setIsInitialLoadComplete(true)
      // silent
    }
  }, [section])

  // Fix the addDataSeriesToWidget function to handle DataType enum
  const addDataSeriesToWidget = useCallback((widgetId: string, dataType: DataType) => {
    setDashboardState((prevState: DashboardState) => {
      const updatedWidgets = prevState.widgets.map((widget) => {
        if (widget.id === widgetId) {
          if (widget.dataSeries.length >= 4) {
            return widget // Limit to 4 series
          }

          if (widget.dataSeries.some((series) => series.dataType === dataType)) {
            return widget // Avoid duplicate series
          }

          // Determine display mode based on data type
          const displayMode: "price" | "quantity" = [
            DataType.STOCK_VALUE,
            DataType.PROFIT,
            DataType.COST_OF_SALES,
            DataType.INVENTORY_VALUE,
            DataType.PROFIT_MARGIN,
          ].includes(dataType)
            ? "price"
            : "quantity"

          return {
            ...widget,
            dataSeries: [
              ...widget.dataSeries,
              {
                dataType,
                displayMode,
                color: DEFAULT_DATA_COLORS[dataType] || BRAND.success,
                visible: true,
                label: dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/([A-Z])/g, " $1"),
              },
            ],
          }
        }

        return widget
      })

      return {
        ...prevState,
        widgets: updatedWidgets,
      }
    })
  }, [])

  const removeDataSeriesFromWidget = useCallback((widgetId: string, dataTypeIndex: number) => {
    setDashboardState((prevState: DashboardState) => {
      const updatedWidgets = prevState.widgets.map((widget) => {
        if (widget.id === widgetId) {
          // Don't remove if it's the last data series
          if (widget.dataSeries.length <= 1) {
            return widget
          }

          // Remove the data series at the specified index
          const newDataSeries = [...widget.dataSeries]
          newDataSeries.splice(dataTypeIndex, 1)

          return {
            ...widget,
            dataSeries: newDataSeries,
            // Update the primary dataType to the first series
            dataType: newDataSeries[0].dataType,
            displayMode: newDataSeries[0].displayMode,
          }
        }
        return widget
      })

      return {
        ...prevState,
        widgets: updatedWidgets,
      }
    })
  }, [])

  // Snap position to grid
  const snapToGrid = useCallback((position: { x: number; y: number }) => {
    return {
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
    }
  }, [])

  // Snap size to grid
  const snapSizeToGrid = useCallback((size: { width: number; height: number }) => {
    return {
      width: Math.max(1, Math.round(size.width / GRID_SIZE)) * GRID_SIZE,
      height: Math.max(1, Math.round(size.height / GRID_SIZE)) * GRID_SIZE,
    }
  }, [])

  // Convert position to grid coordinates
  const positionToGrid = useCallback((position: { x: number; y: number }) => {
    return {
      col: Math.round(position.x / GRID_SIZE),
      row: Math.round(position.y / GRID_SIZE),
    }
  }, [])

  // Convert grid coordinates to position
  const gridToPosition = useCallback((grid: { row: number; col: number }) => {
    return {
      x: grid.col * GRID_SIZE,
      y: grid.row * GRID_SIZE,
    }
  }, [])

  // Check if a widget position would overlap with existing widgets
  const checkWidgetOverlap = useCallback(
    (id: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
      const gridPos = positionToGrid(position)
      const gridSize = {
        cols: Math.round(size.width / GRID_SIZE),
        rows: Math.round(size.height / GRID_SIZE),
      }

      // Check for overlap with other widgets
      for (const widget of dashboardState.widgets) {
        if (widget.id === id) continue // Skip the current widget

        const widgetGridX = widget.gridX || 0
        const widgetGridY = widget.gridY || 0
        const widgetGridWidth = widget.gridWidth || Math.round(widget.width / GRID_SIZE)
        const widgetGridHeight = widget.gridHeight || Math.round(widget.height / GRID_SIZE)

        // Check if rectangles overlap
        if (
          gridPos.col < widgetGridX + widgetGridWidth &&
          gridPos.col + gridSize.cols > widgetGridX &&
          gridPos.row < widgetGridY + widgetGridHeight &&
          gridPos.row + gridSize.rows > widgetGridY
        ) {
          return true // Overlap detected
        }
      }

      return false // No overlap
    },
    [dashboardState.widgets, positionToGrid],
  )

  // Find a valid position for a widget that doesn't overlap
  const findValidPosition = useCallback(
    (id: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
      const currentPos = { ...position }

      // Try to find a position without overlap
      let attempts = 0
      const maxAttempts = 100 // Prevent infinite loops

      while (checkWidgetOverlap(id, currentPos, size) && attempts < maxAttempts) {
        attempts++

        // Try moving right by one grid cell
        currentPos.x += GRID_SIZE

        // If we hit the right edge, move down and reset x
        if (currentPos.x > GRID_SIZE * 50) {
          // Assuming max width is 50 grid cells
          currentPos.x = 0
          currentPos.y += GRID_SIZE
        }
      }

      return currentPos
    },
    [checkWidgetOverlap],
  )

  const updateWidgetPosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      const widget = getWidgetSettings(id)
      if (!widget) return

      const snappedPosition = snapToGrid(position)

      // Find a position that doesn't overlap with other widgets
      const size = { width: widget.width, height: widget.height }
      const validPosition = findValidPosition(id, snappedPosition, size)

      const gridPosition = positionToGrid(validPosition)

      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = prevState.widgets.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                x: validPosition.x,
                y: validPosition.y,
                gridX: gridPosition.col,
                gridY: gridPosition.row,
              }
            : widget,
        )

        // Update container height if needed
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })
    },
    [snapToGrid, positionToGrid, getWidgetSettings, findValidPosition],
  )

  const updateWidgetSize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      const widget = getWidgetSettings(id)
      if (!widget) return

      // Ensure minimum size constraints are met
      const minWidth = widget.minW * GRID_SIZE
      const minHeight = widget.minH * GRID_SIZE

      const constrainedSize = {
        width: Math.max(size.width, minWidth),
        height: Math.max(size.height, minHeight),
      }

      const snappedSize = snapSizeToGrid(constrainedSize)
      const gridSize = {
        cols: Math.round(snappedSize.width / GRID_SIZE),
        rows: Math.round(snappedSize.height / GRID_SIZE),
      }

      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = prevState.widgets.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                width: snappedSize.width,
                height: snappedSize.height,
                gridWidth: gridSize.cols,
                gridHeight: gridSize.rows,
              }
            : widget,
        )

        // Update container height if needed
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })
    },
    [snapSizeToGrid, getWidgetSettings],
  )

  // Fix the updateWidgetDataTypes function to handle DataType enum
  const updateWidgetDataTypes = useCallback((id: string, dataTypes: DataType[]) => {
    setDashboardState((prevState: DashboardState) => {
      const updatedWidgets = prevState.widgets.map((widget) => {
        if (widget.id === id) {
          // Create a new widget without the dataTypes property
          const updatedWidget: WidgetSettings = {
            ...widget,
            // Update the primary dataType to the first in the array
            dataType: dataTypes[0],
            // Update the title based on the widget type and data types
            title: dataTypes.length === 1 ? `${widget.type} - ${dataTypes[0]}` : `${widget.type} - Multiple Data`,
          }
          return updatedWidget
        }
        return widget
      })

      return {
        ...prevState,
        widgets: updatedWidgets,
      }
    })
  }, [])

  const calculateContainerHeight = useCallback(() => {
    if (dashboardState.widgets.length === 0) return 600 // Default height

    const maxY = Math.max(
      ...dashboardState.widgets.map((widget) => {
        const gridY = widget.gridY || 0
        const gridHeight = widget.gridHeight || 2
        return gridY + gridHeight
      }),
    )

    return maxY * GRID_SIZE
  }, [dashboardState.widgets])

  // Fix the createWidget function to handle DataType enum
  const createWidget = useCallback(
    (
      type: "stat" | "barChart" | "lineChart" | "pieChart" | "chart" | "table" | "dashboardCard",
      initialDataType: DataType,
    ) => {
      // Find a suitable position for the new widget
      const existingWidgets = dashboardState.widgets

      // Find the lowest y position in grid units
      let maxGridY = 0
      if (existingWidgets.length > 0) {
        maxGridY = Math.max(...existingWidgets.map((w) => (w.gridY || 0) + (w.gridHeight || 2)))
      }

      // Default sizes based on widget type
      let gridWidth = 15 // 300px
      let gridHeight = 8 // 160px
      let minW = 2
      let minH = 1

      if (type === "barChart" || type === "lineChart") {
        gridWidth = 30 // 600px
        gridHeight = 15 // 300px
        minW = 4
        minH = 3
      } else if (type === "pieChart") {
        gridWidth = 15 // 300px
        gridHeight = 15 // 300px
        minW = 3
        minH = 3
      } else if (type === "table") {
        gridWidth = 30 // 600px
        gridHeight = 20 // 400px
        minW = 6
        minH = 4
      } else if (type === "dashboardCard") {
        gridWidth = 15 // 300px
        gridHeight = 8 // 160px
        minW = 3
        minH = 2
      }

      // Convert to pixels
      const x = 0
      const y = convertGridUnitsToPixels(maxGridY + 1) // Add 1 grid unit of spacing
      const width = convertGridUnitsToPixels(gridWidth)
      const height = convertGridUnitsToPixels(gridHeight)

      // Determine display mode based on data type
      const displayMode: "price" | "quantity" = [
        DataType.STOCK_VALUE,
        DataType.PREVIOUS_STOCK_VALUE,
        DataType.PREDICTED_STOCK_VALUE,
        DataType.PROFIT,
        DataType.COST_OF_SALES,
        DataType.INVENTORY_VALUE,
        DataType.PROFIT_MARGIN,
        DataType.WASTAGE,
      ].includes(initialDataType)
        ? "price"
        : "quantity"

      // Create the data series
      const dataSeries: DataSeries[] = [
        {
          dataType: initialDataType,
          displayMode,
          color: DEFAULT_DATA_COLORS[initialDataType] || BRAND.success,
          visible: true,
          label: initialDataType.charAt(0).toUpperCase() + initialDataType.slice(1).replace(/([A-Z])/g, " $1"),
        },
      ]

      // Map string type to WidgetType enum
      let widgetType: WidgetType
      const typeStr = type as string
      switch (typeStr) {
        case "stat":
          widgetType = WidgetType.CARD
          break
        case "barChart":
          widgetType = WidgetType.BAR_CHART
          break
        case "lineChart":
          widgetType = WidgetType.LINE_CHART
          break
        case "pieChart":
          widgetType = WidgetType.PIE_CHART
          break
        case "chart":
          widgetType = WidgetType.CHART
          break
        case "table":
          widgetType = WidgetType.TABLE
          break
        case "dashboardCard":
          widgetType = WidgetType.CARD
          break
        case "calculator":
          widgetType = WidgetType.CALCULATOR
          break
        default:
          widgetType = WidgetType.CARD
      }

      const newWidget: WidgetSettings = {
        id: uuidv4(),
        type: widgetType,
        title:
          widgetType === WidgetType.CARD
            ? toTitleFromDataType(initialDataType)
            : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        x,
        y,
        width,
        height,
        minW,
        minH,
        gridX: 0,
        gridY: maxGridY + 1,
        gridWidth,
        gridHeight,
        dataType: initialDataType,
        displayMode,
        dataConfigMode: "series",
        dataSeries,
        colors: {
          ...makeWidgetColors([DEFAULT_DATA_COLORS[initialDataType] || BRAND.success]),
        },
        visible: true,
      }

      setDashboardState((prevState: DashboardState) => {
        const updatedWidgets = [...prevState.widgets, newWidget]

        // Update container height
        updateContainerHeight(updatedWidgets)

        return {
          ...prevState,
          widgets: updatedWidgets,
        }
      })

      return newWidget
    },
    [dashboardState.widgets],
  )

  // Add helper functions for card types and icons
  const getCardTypeFromDataType = (dataType: DataType): "sales" | "inventory" | "alerts" | "performance" => {
    switch (dataType) {
      case DataType.SALES:
      case DataType.PROFIT:
      case DataType.PROFIT_MARGIN:
        return "sales"
      case DataType.STOCK_COUNT:
      case DataType.STOCK_VALUE:
      case DataType.INVENTORY_VALUE:
      case DataType.TOTAL_ITEMS:
        return "inventory"
      case DataType.LOW_STOCK_ITEMS:
      case DataType.STOCK_REORDER:
        return "alerts"
      default:
        return "performance"
    }
  }

  const getIconFromDataType = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.SALES:
      case DataType.PROFIT:
      case DataType.PROFIT_MARGIN:
        return "mdi:cash-register"
      case DataType.STOCK_COUNT:
      case DataType.STOCK_VALUE:
      case DataType.INVENTORY_VALUE:
      case DataType.TOTAL_ITEMS:
        return "mdi:package-variant-closed"
      case DataType.LOW_STOCK_ITEMS:
      case DataType.STOCK_REORDER:
        return "mdi:alert-circle-outline"
      default:
        return "mdi:chart-line"
    }
  }

  const clearAllWidgets = () => {
    setDashboardState((prev) => {
      const next = { ...prev, widgets: [] as WidgetSettings[] }
      savedStateSnapshotRef.current = JSON.parse(JSON.stringify(next))
      updateContainerHeight([])
      return next
    })
    setSelectedWidgetId(null)
    setIsInitialLoadComplete(true)
  }

  return {
    dashboardState,
    selectedWidgetId,
    setSelectedWidgetId,
    updateWidgetPosition,
    updateWidgetSize,
    updateWidgetSettings,
    removeWidget,
    addWidget,
    addDashboardCard,
    getWidgetSettings,
    resetDashboard,
    revertDashboard,
    addDataSeriesToWidget,
    removeDataSeriesFromWidget,
    createWidget,
    updateWidgetDataTypes,
    calculateContainerHeight,
    snapToGrid,
    snapSizeToGrid,
    gridToPosition,
    positionToGrid,
    checkWidgetOverlap,
    findValidPosition,
    clearAllWidgets,
  }
}

export { useWidgetManager }
export default useWidgetManager
