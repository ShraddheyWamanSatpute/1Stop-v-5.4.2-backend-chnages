"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  Box,
  Typography,
  IconButton,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import { Settings as SettingsIcon } from "@mui/icons-material"
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js"
import { DataGrid } from "@mui/x-data-grid"
import { type DynamicWidgetProps, WidgetType, DataType, type DataSeries } from "../../types/WidgetTypes"
import AnimatedCounter from "./AnimatedCounter"
import { Icon } from "@iconify/react"
import { useTouchInteractions } from "../../hooks/useTouchInteractions"
import { getCurrencyPrefix, formatValueByDataType, isCurrencyDataType } from "../../utils/currencyUtils"
import SimpleCalculatorWidget from "../tools/SimpleCalculatorWidget"
import EmptyCardState from "../dashboard/cards/EmptyCardState"
import { themeConfig } from "../../../theme/AppTheme"

// Register ChartJS components
/* ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

*/

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

function normalizeWidgetChartType(widget: any): WidgetType {
  const rawType = String(widget?.type ?? "").trim()
  const type = rawType.toLowerCase()

  // Common legacy/non-enum widget types
  if (type === "stat" || type === "kpi" || type === "metric" || type === "number") return WidgetType.CARD
  if (type === "kpicard" || type === "dashboardcard" || type === "card") return WidgetType.CARD
  if (type === "table" || type === "datagrid" || type === "grid") return WidgetType.TABLE
  if (type === "calculator") return WidgetType.CALCULATOR
  if (type === "barchart" || type === "bar") return WidgetType.BAR_CHART
  if (type === "linechart" || type === "line") return WidgetType.LINE_CHART
  if (type === "piechart" || type === "pie") return WidgetType.PIE_CHART
  if (type === "donutchart" || type === "donut" || type === "doughnut") return WidgetType.DONUT_CHART
  if (type === "areachart" || type === "area") return WidgetType.AREA_CHART
  if (type === "stackedbarchart") return WidgetType.STACKED_BAR_CHART
  if (type === "stackedareachart") return WidgetType.STACKED_AREA_CHART
  if (type === "multipleserieslinechart" || type === "multiserieslinechart") return WidgetType.MULTIPLE_SERIES_LINE_CHART
  if (type === "multipleseriesbarchart" || type === "multiseriesbarchart") return WidgetType.MULTIPLE_SERIES_BAR_CHART

  // New/legacy chart variants that this renderer doesn't natively support.
  // Fallback to a bar chart instead of breaking the widget.
  if (
    type === "radarchart" ||
    type === "scatterchart" ||
    type === "bubblechart" ||
    type === "heatmap" ||
    type === "gauge" ||
    type === "funnelchart" ||
    type === "waterfallchart" ||
    type === "candlestickchart" ||
    type === "calendarheatmap" ||
    type === "treemap" ||
    type === "sankeydiagram" ||
    type === "networkdiagram" ||
    type === "polarchart" ||
    type.endsWith("chart")
  ) {
    return WidgetType.BAR_CHART
  }

  // Legacy widgets used `type: "chart"` plus `chartType` / `displayType` strings.
  if (rawType === WidgetType.CHART || type === "chart") {
    const chartType = String(widget?.chartType || widget?.displayType || "bar").toLowerCase()
    if (chartType === "bar") return WidgetType.BAR_CHART
    if (chartType === "line") return WidgetType.LINE_CHART
    if (chartType === "pie") return WidgetType.PIE_CHART
    if (chartType === "donut" || chartType === "doughnut") return WidgetType.DONUT_CHART
    if (chartType === "area") return WidgetType.AREA_CHART
    if (chartType === "multiline" || chartType === "multi_line" || chartType === "multi") {
      return WidgetType.MULTIPLE_SERIES_LINE_CHART
    }
    return WidgetType.BAR_CHART
  }

  return widget?.type as WidgetType
}

const DynamicWidget: React.FC<DynamicWidgetProps> = ({ widget, data, onSettingsOpen, isEditing = false }) => {
  const theme = useTheme()
  const [chartData, setChartData] = useState<any>(null)
  const chartRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const effectiveWidgetType = useMemo(() => normalizeWidgetChartType(widget as any), [widget])
  // Some older saved widget layouts may omit `dataSeries`; normalize so the widget never crashes.
  const dataSeries = useMemo<DataSeries[]>(() => {
    return Array.isArray((widget as any)?.dataSeries) ? (widget as any).dataSeries : []
  }, [(widget as any)?.dataSeries])
  // Some saved widget configs may omit colors; normalize to prevent crashes
  const widgetColors = useMemo(() => {
    const c = (widget as any)?.colors
    return {
      background: c?.background || themeConfig.brandColors.offWhite,
      text: c?.text || themeConfig.brandColors.navy,
      title: c?.title || c?.text || themeConfig.brandColors.navy,
      border: c?.border || themeConfig.colors.divider,
      series:
        Array.isArray(c?.series) && c.series.length > 0
          ? c.series
          : [
              themeConfig.brandColors.navy,
              themeConfig.colors.success.main,
              themeConfig.colors.warning.main,
              themeConfig.colors.error.main,
            ],
    }
  }, [widget])

  // Touch interaction for long press to open settings
  const { handleTouchStart: onTouchStart, onTouchMove: onTouchMoveRaw, onTouchEnd, isLongPress } = useTouchInteractions({
    longPressDelay: 800,
    moveThreshold: 10,
  })

  // Function to handle responsive font sizing
  const getResponsiveFontSize = (baseSize: number) => {
    const scaleFactor = Math.min(containerSize.width / 300, containerSize.height / 200)
    // Don't go below 70% of base size
    return Math.max(baseSize * scaleFactor, baseSize * 0.7)
  }

  // Update container size on resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
    }
  }, [])

  // Helper function to format dates for compact display
  const formatDateLabel = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.getMonth() + 1
      const year = date.getFullYear().toString()

      // Format as DD/MM/YYYY
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
    } catch {
      return dateString
    }
  }

  const normalizeRuntimeDataType = (dt?: any): DataType | undefined => {
    const v = String(dt || "")
    if (v === "itemsSummary" || v === "invoice" || v === "invoices") return DataType.TOTAL_ITEMS
    if (v === "timeOff" || v === "timeOffRequests" || v === "holidays" || v === "holidayRequests") return DataType.TIME_OFF_REQUESTS
    if (v === "cancellations" || v === "cancelledBookings" || v === "bookingCancellations") return DataType.CANCELLATION_ANALYSIS
    if (v === "noShows" || v === "noShowBookings" || v === "noshows" || v === "bookingNoShows") return DataType.NO_SHOW_ANALYSIS
    if (v === "sales") return DataType.REVENUE
    if (v === "expense" || v === "expenses") return DataType.EXPENSES
    if (v === "budget" || v === "budgetVariance" || v === "budgetvariance") return DataType.BUDGET_VARIANCE
    return dt as DataType | undefined
  }

  const getFallbackNumeric = (value: any): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    if (!value || typeof value !== "object") return 0

    const numericEntry = Object.entries(value).find(
      ([key, raw]) => key !== "id" && typeof raw === "number" && Number.isFinite(raw),
    )

    return numericEntry ? Number(numericEntry[1]) || 0 : 0
  }

  const getValueForDisplayMode = (value: any, mode: "price" | "quantity" | "percentage" | "score"): number => {
    if (!value) return 0

    if (mode === "price") {
      return (
        Number(
          value.price ??
            value.value ??
            value.amount ??
            value.cost ??
            value.revenue ??
            value.profit ??
            value.expenses ??
            value.actual ??
            value.budgeted ??
            value.variance ??
            value.net,
        ) || getFallbackNumeric(value)
      )
    }

    if (mode === "percentage") {
      return (
        Number(
          value.percentage ??
            value.rate ??
            value.completion ??
            value.utilization ??
            value.margin ??
            value.conversion ??
            value.growth,
        ) || getFallbackNumeric(value)
      )
    }

    if (mode === "score") {
      return Number(value.score ?? value.value ?? value.benchmark ?? value.average ?? value.rating) || getFallbackNumeric(value)
    }

    return (
      Number(
        value.quantity ??
          value.count ??
          value.value ??
          value.bookings ??
          value.employees ??
          value.transactions ??
          value.items ??
          value.present ??
          value.active ??
          value.waitlisted ??
          value.converted,
      ) || getFallbackNumeric(value)
    )
  }

  const getCategoricalLabel = (item: any, index?: number): string => {
    const keys = [
      "label",
      "name",
      "category",
      "supplier",
      "customer",
      "department",
      "employee",
      "table",
      "hour",
      "day",
      "month",
      "source",
      "segment",
      "stage",
      "role",
      "course",
      "account",
      "contact",
      "type",
      "location",
      "status",
      "reason",
      "item",
      "bookingType",
      "tracking",
      "tag",
      "device",
      "paymentType",
      "subcategory",
      "ratio",
      "period",
    ]

    for (const key of keys) {
      const raw = item?.[key]
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") return String(raw)
    }

    const firstStringEntry = Object.entries(item || {}).find(([, raw]) => typeof raw === "string" && raw.trim() !== "")
    if (firstStringEntry) return String(firstStringEntry[1])

    return `Item ${Number(index ?? 0) + 1}`
  }

  // Process data for charts
  useEffect(() => {
    if (!data || !widget) {
      setChartData(null)
      return
    }

    const processChartData = () => {
      try {
        const getSeriesValue = (item: any, series: any) => {
          const dt = series?.dataType
          const optKey = typeof series?.dataOption === "string" ? series.dataOption : undefined
          const mode = series?.displayMode as "price" | "quantity" | "percentage" | "score"
          const base = dt ? item?.[dt] : null
          const bucket = optKey ? base?.options?.[optKey] || base : base
          if (!bucket) return 0
          return getValueForDisplayMode(bucket, mode)
        }

      switch (effectiveWidgetType) {
        case WidgetType.BAR_CHART:
        case WidgetType.MULTIPLE_SERIES_BAR_CHART:
        case WidgetType.STACKED_BAR_CHART:
          // Handle both history and data arrays for bar charts
          const barLabels =
            data.history?.map((item: any) => formatDateLabel(item.date)) ||
            data.data?.map((item: any, index: number) => getCategoricalLabel(item, index)) ||
            []
          
          return {
            labels: barLabels,
            datasets: dataSeries
              .filter((series) => series.visible)
              .map((series, seriesIndex) => {
                const dataArray = data.history || data.data || []
                if (!Array.isArray(dataArray)) {
                  return {
                    label: series.label || series.dataType,
                    data: [],
                    backgroundColor: series.color || themeConfig.brandColors.navy,
                    borderColor: series.color || themeConfig.brandColors.navy,
                    borderWidth: 1,
                  }
                }
                
                const chartData = dataArray.map((item: any) => {
                  let value = 0
                  
                  // For category/supplier data (data.data format)
                  if (data.data) {
                    value = getValueForDisplayMode(item, series.displayMode || "quantity")
                  } else {
                    // For history data (data.history format)
                    value = getSeriesValue(item, series)
                  }
                  
                  // silent
                  return value;
                })
                
                return {
                  label: series.label || series.dataType,
                  data: chartData,
                  backgroundColor:
                    series.color || widgetColors.series[seriesIndex % widgetColors.series.length] || themeConfig.brandColors.navy,
                  borderColor:
                    series.color || widgetColors.series[seriesIndex % widgetColors.series.length] || themeConfig.brandColors.navy,
                  borderWidth: 1,
                }
              }),
          }

        case WidgetType.LINE_CHART:
        case WidgetType.MULTIPLE_SERIES_LINE_CHART:
        case WidgetType.AREA_CHART:
        case WidgetType.STACKED_AREA_CHART:
          // For line charts, we primarily use history data (time series)
          const lineLabels = data.history?.map((item: any) => formatDateLabel(item.date)) || []
          
          return {
            labels: lineLabels,
            datasets: dataSeries
              .filter((series) => series.visible)
              .map((series, seriesIndex) => {
                const dataArray = data.history || []
                if (!Array.isArray(dataArray)) {
                  // silent
                  return {
                    label: series.label || series.dataType,
                    data: [],
                    borderColor: series.color || themeConfig.brandColors.navy,
                    backgroundColor: alpha(series.color || themeConfig.brandColors.navy, 0.12),
                    borderWidth: 2,
                    tension: 0.4,
                  }
                }
                
                const chartData = dataArray.map((item: any) => {
                  let value = 0
                  
                  // For history data (data.history format)
                  value = getSeriesValue(item, series)
                  
                  return value || 0
                })
                
                return {
                  label: series.label || series.dataType,
                  data: chartData,
                  borderColor:
                    series.color || widgetColors.series[seriesIndex % widgetColors.series.length] || themeConfig.brandColors.navy,
                  backgroundColor: alpha(
                    series.color || widgetColors.series[seriesIndex % widgetColors.series.length] || themeConfig.brandColors.navy,
                    0.12,
                  ),
                  borderWidth: 2,
                  tension: 0.4,
                  fill:
                    effectiveWidgetType === WidgetType.AREA_CHART ||
                    effectiveWidgetType === WidgetType.STACKED_AREA_CHART ||
                    widget.chartType === "area",
                  pointRadius: 3,
                  pointHoverRadius: 5,
                }
              }),
          }

        case WidgetType.PIE_CHART:
        case WidgetType.DONUT_CHART:
          if (Array.isArray(data.data) && data.data.length > 0) {
            const pieLabels = data.data.map((item: any, index: number) => getCategoricalLabel(item, index))
            const visibleSeries = dataSeries.filter((series) => series.visible)
            const primaryMode = (visibleSeries[0]?.displayMode || widget.displayMode || "quantity") as
              | "price"
              | "quantity"
              | "percentage"
              | "score"
            return {
              labels: pieLabels,
              datasets: [
                {
                  data: data.data.map((item: any) => getValueForDisplayMode(item, primaryMode)),
                  backgroundColor: data.data.map(
                    (_item: any, index: number) =>
                      widgetColors.series[index % widgetColors.series.length] || themeConfig.brandColors.navy,
                  ),
                  borderColor: alpha(widgetColors.border, 0.25),
                  borderWidth: 1,
                },
              ],
            }
          }

          // For pie charts, we need to aggregate data differently
          const pieData = dataSeries
            .filter((series) => series.visible)
            .map((series) => {
              // Handle both history and data arrays
              const dataArray = data.history || data.data || []
              
              // Ensure dataArray is actually an array
              if (!Array.isArray(dataArray)) {
                // silent
                return {
                  label: series.label || series.dataType,
                  value: 0,
                }
              }
              
              // Sum up all values for this series
              const total = dataArray.reduce((sum: number, item: any) => {
                let value = 0
                
                // For category/supplier data (data.data format)
                if (data.data) {
                  value = getValueForDisplayMode(item, series.displayMode || "quantity")
                } else {
                  // For history data (data.history format)
                  value = getSeriesValue(item, series)
                }
                
                return sum + (value || 0)
              }, 0)

              return {
                label: series.label || series.dataType,
                value: total,
              }
            })

          return {
            labels: pieData.map((item) => item.label),
            datasets: [
              {
                data: pieData.map((item) => item.value),
                backgroundColor: dataSeries
                  .filter((series) => series.visible)
                  .map(
                    (series, seriesIndex) =>
                      series.color ||
                      widgetColors.series[seriesIndex % widgetColors.series.length] ||
                      themeConfig.brandColors.navy,
                  ),
                borderColor: widgetColors.border || themeConfig.brandColors.offWhite,
                borderWidth: 2,
              },
            ],
          }

        default:
          return null
      }
      } catch (error) {
        // silent
        return null
      }
    }

    setChartData(processChartData())
  }, [data, widget, dataSeries, widgetColors.series, widgetColors.border, effectiveWidgetType])

  // Handle long press to open settings
  useEffect(() => {
    if (isLongPress && isEditing && onSettingsOpen) {
      onSettingsOpen(widget.id)
    }
  }, [isLongPress, isEditing, onSettingsOpen, widget.id])

  // Render different widget types
  const renderWidget = () => {
    if (!widget) return null

    const titleFontSize = getResponsiveFontSize(16)
    const valueFontSize = getResponsiveFontSize(24)

    switch (effectiveWidgetType) {
      case WidgetType.CARD:
      case WidgetType.STAT: // legacy
      case WidgetType.DASHBOARD_CARD: // legacy
      case WidgetType.KPI_CARD: // legacy
        let value = 0
        let hasValidData = false
        const legacyCardType = String((widget as any)?.cardType || "")

        const fallbackIconFromLegacyType = (t: string): string | undefined => {
          switch (t) {
            case "sales":
              return "mdi:cash-register"
            case "inventory":
              return "mdi:package-variant-closed"
            case "alerts":
              return "mdi:alert-circle-outline"
            case "performance":
              return "mdi:chart-line"
            default:
              return undefined
          }
        }

        const fallbackIconFromDataType = (dt?: DataType): string | undefined => {
          switch (dt) {
            case DataType.SALES:
            case DataType.REVENUE:
            case DataType.PROFIT:
            case DataType.PROFIT_MARGIN:
              return "mdi:cash-register"
            case DataType.STOCK_VALUE:
            case DataType.INVENTORY_VALUE:
            case DataType.TOTAL_ITEMS:
            case DataType.LOW_STOCK_ITEMS:
            case DataType.NO_STOCK_ITEMS:
            case DataType.NEW_STOCK_ITEMS:
              return "mdi:package-variant-closed"
            case DataType.COST_OF_SALES:
            case DataType.PURCHASES:
              return "mdi:tag-outline"
            default:
              return undefined
          }
        }

        const normalizedWidgetDataType = normalizeRuntimeDataType(widget.dataType)

        const resolvedIcon =
          widget.icon || fallbackIconFromLegacyType(legacyCardType) || fallbackIconFromDataType(normalizedWidgetDataType)

        const primarySeries = Array.isArray(dataSeries) && dataSeries.length > 0 ? dataSeries[0] : (undefined as any)
        const dt0 = normalizeRuntimeDataType(primarySeries?.dataType || normalizedWidgetDataType) as any
        const opt0 = typeof (primarySeries as any)?.dataOption === "string" ? (primarySeries as any).dataOption : undefined
        const mode0 = (primarySeries?.displayMode || widget.displayMode || "quantity") as
          | "price"
          | "quantity"
          | "percentage"
          | "score"

        const tryResolveFromTypedBucket = () => {
          if (!data || !dt0) return null
          const base = (data as any)?.[dt0]
          if (typeof base === "number") return Number(base) || 0
          const bucket = opt0 ? base?.options?.[opt0] || base : base
          if (!bucket) return null
          return getValueForDisplayMode(bucket, mode0)
        }

        const typedResolved = tryResolveFromTypedBucket()

        if (!data) {
          value = 0
          hasValidData = false
        } else if (typedResolved !== null) {
          value = typedResolved
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.PREVIOUS_STOCK_VALUE && data.previousStockValue !== undefined) {
          value = data.previousStockValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.PREDICTED_STOCK_VALUE && data.predictedStockValue !== undefined) {
          value = data.predictedStockValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.STOCK_VALUE && data.totalValue !== undefined) {
          value = data.totalValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.STOCK_QUANTITY && data.totalQuantity !== undefined) {
          value = data.totalQuantity
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.STOCK_PROFIT && data.totalProfit !== undefined) {
          value = data.totalProfit
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.TOTAL_ITEMS && data.totalItems !== undefined) {
          value = data.totalItems
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.PROFIT_MARGIN && data.profitMargin !== undefined) {
          value = data.profitMargin
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.LOW_STOCK_ITEMS && data.lowStockItems !== undefined) {
          value = data.lowStockItems
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.NEW_STOCK_ITEMS && data.newStockItems !== undefined) {
          value = data.newStockItems
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.NO_STOCK_ITEMS && data.noStockItems !== undefined) {
          value = data.noStockItems
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.WASTAGE && data.wastage !== undefined) {
          value = data.wastage
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.INVENTORY_VALUE && data.inventoryValue !== undefined) {
          value = data.inventoryValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.PURCHASES && data.purchasesValue !== undefined) {
          value = data.purchasesValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.SALES && data.totalSalesValue !== undefined) {
          value = data.totalSalesValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.COST_OF_SALES && data.totalCostValue !== undefined) {
          value = data.totalCostValue
          hasValidData = true
        } else if (normalizedWidgetDataType === DataType.PROFIT && data.profit !== undefined) {
          value = data.profit
          hasValidData = true
        } else if (widget.dataType === DataType.STOCK_QUANTITY && data.totalQuantity !== undefined) {
          value = data.totalQuantity
          hasValidData = true
        } else if (widget.dataType === DataType.ATTENDANCE && data.attendanceRate !== undefined) {
          value = data.attendanceRate
          hasValidData = true
        } else if (widget.dataType === DataType.PERFORMANCE && data.performanceScore !== undefined) {
          value = data.performanceScore
          hasValidData = true
        } else if (widget.dataType === DataType.TURNOVER && data.turnoverRate !== undefined) {
          value = data.turnoverRate
          hasValidData = true
        } else if (widget.dataType === DataType.RECRUITMENT && data.timeToHire !== undefined) {
          value = data.timeToHire
          hasValidData = true
        } else if (widget.dataType === DataType.TRAINING && data.trainingCompletion !== undefined) {
          value = data.trainingCompletion
          hasValidData = true
        } else if (widget.dataType === DataType.PAYROLL && data.payrollCost !== undefined) {
          value = data.payrollCost
          hasValidData = true
        } else if (widget.dataType === DataType.POS_TRANSACTIONS && data.totalTransactions !== undefined) {
          value = data.totalTransactions
          hasValidData = true
        } else if (widget.dataType === DataType.SALES_BY_DAY && data.dailySales !== undefined) {
          value = data.dailySales
          hasValidData = true
        } else if (widget.dataType === DataType.SALES_BY_HOUR && data.hourlySales !== undefined) {
          value = data.hourlySales
          hasValidData = true
        } else if (widget.dataType === DataType.PAYMENT_METHOD_BREAKDOWN && data.paymentMethods !== undefined) {
          value = data.paymentMethods
          hasValidData = true
        } else if (widget.dataType === DataType.CUSTOMER_ANALYTICS && data.customerAnalytics !== undefined) {
          value = data.customerAnalytics
          hasValidData = true
        } else if (widget.dataType === DataType.TOTAL_BOOKINGS && data.totalBookings !== undefined) {
          value = data.totalBookings
          hasValidData = true
        } else if (widget.dataType === DataType.OCCUPANCY_RATE && data.occupancyRate !== undefined) {
          value = data.occupancyRate
          hasValidData = true
        } else if (widget.dataType === DataType.WAITLIST_ANALYTICS && data.waitlistCount !== undefined) {
          value = data.waitlistCount
          hasValidData = true
        } else if (widget.dataType === DataType.TABLE_UTILIZATION && data.activeTables !== undefined) {
          value = data.activeTables
          hasValidData = true
        } else if (widget.dataType === DataType.BOOKING_TRENDS && data.totalBookings !== undefined) {
          value = data.totalBookings
          hasValidData = true
        } else if (widget.dataType === DataType.SUPPLY_CLIENTS && data.totalSupplyClients !== undefined) {
          value = data.totalSupplyClients
          hasValidData = true
        } else if (widget.dataType === DataType.SUPPLY_ORDERS && data.totalSupplyOrders !== undefined) {
          value = data.totalSupplyOrders
          hasValidData = true
        } else if (widget.dataType === DataType.SUPPLY_DELIVERIES && data.totalSupplyDeliveries !== undefined) {
          value = data.totalSupplyDeliveries
          hasValidData = true
        } else if (widget.dataType === DataType.SUPPLY_ORDERS_DRAFT && data.supplyOrdersDraft !== undefined) {
          value = data.supplyOrdersDraft
          hasValidData = true
        } else if (
          widget.dataType === DataType.SUPPLY_DELIVERIES_IN_TRANSIT &&
          data.supplyDeliveriesInTransit !== undefined
        ) {
          value = data.supplyDeliveriesInTransit
          hasValidData = true
        }

        if (!Number.isFinite(value)) {
          value = 0
          hasValidData = false
        }

        const prefix = getCurrencyPrefix(normalizedWidgetDataType || DataType.STOCK_VALUE)
        const comparison = (data as any)?.comparison as
          | {
              label?: string
              variance?: number
              percentage?: number | null
              displayMode?: "price" | "quantity" | "percentage" | "score"
              dataType?: DataType
            }
          | undefined
        const breakdownChartData = (data as any)?.breakdownChartData as
          | {
              labels?: any[]
              datasets?: Array<{
                label?: string
                data?: any[]
                backgroundColor?: any
                borderColor?: any
              }>
            }
          | undefined
        const comparisonMode = comparison?.displayMode || mode0
        const comparisonDataType = comparison?.dataType || normalizedWidgetDataType || DataType.STOCK_VALUE
        const comparisonValue = Number(comparison?.variance ?? 0)
        const hasComparison = Boolean(comparison && Number.isFinite(comparisonValue))
        const comparisonSign = comparisonValue > 0 ? "+" : comparisonValue < 0 ? "-" : ""
        const formatComparisonValue = (rawValue: number) => {
          const absValue = Math.abs(rawValue)
          if (comparisonMode === "price") {
            return `${comparisonSign}${formatValueByDataType(absValue, comparisonDataType)}`
          }
          if (comparisonMode === "percentage") {
            return `${comparisonSign}${absValue.toFixed(1)}%`
          }
          if (comparisonMode === "score") {
            return `${comparisonSign}${absValue.toFixed(1)}`
          }
          return `${comparisonSign}${absValue.toLocaleString("en-GB")}`
        }
        const comparisonTone =
          comparisonValue > 0
            ? themeConfig.colors.success.main
            : comparisonValue < 0
              ? themeConfig.colors.error.main
              : alpha(widgetColors.text || themeConfig.brandColors.navy, 0.72)
        const varianceCopy = hasComparison ? formatComparisonValue(comparisonValue) : ""
        const varianceMeta =
          hasComparison && typeof comparison?.percentage === "number" && Number.isFinite(comparison.percentage)
            ? `${comparison.percentage > 0 ? "+" : comparison.percentage < 0 ? "-" : ""}${Math.abs(comparison.percentage).toFixed(1)}%`
            : comparison?.label || ""
        const breakdownSegments = (() => {
          if (!breakdownChartData || !Array.isArray(breakdownChartData.datasets) || breakdownChartData.datasets.length === 0) return []

          const firstDataset = breakdownChartData.datasets[0]
          const isPieLike = Array.isArray(firstDataset?.data) && Array.isArray(breakdownChartData.labels) && firstDataset.data.length === breakdownChartData.labels.length

          if (isPieLike && breakdownChartData.datasets.length === 1) {
            const values = (firstDataset.data || []).map((entry: any) => Number(entry) || 0)
            const total = values.reduce((sum: number, current: number) => sum + current, 0)
            if (total <= 0) return []
            return values
              .map((segmentValue: number, index: number) => ({
                label: String(breakdownChartData.labels?.[index] || `Segment ${index + 1}`),
                value: segmentValue,
                percent: segmentValue / total,
                color:
                  (Array.isArray(firstDataset.backgroundColor) ? firstDataset.backgroundColor[index] : firstDataset.backgroundColor) ||
                  widgetColors.series[index % widgetColors.series.length] ||
                  themeConfig.brandColors.navy,
              }))
              .filter((segment) => segment.value > 0)
          }

          const values = breakdownChartData.datasets.map((dataset: any) => {
            const series = Array.isArray(dataset?.data) ? dataset.data : []
            const lastValue = series.length > 0 ? Number(series[series.length - 1]) || 0 : 0
            return {
              label: String(dataset?.label || "Segment"),
              value: lastValue,
              color: String(dataset?.backgroundColor || dataset?.borderColor || themeConfig.brandColors.navy),
            }
          })
          const total = values.reduce((sum: number, segment: any) => sum + segment.value, 0)
          if (total <= 0) return []
          return values
            .map((segment: any) => ({
              ...segment,
              percent: segment.value / total,
            }))
            .filter((segment: any) => segment.value > 0)
        })()

        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "stretch",
              height: "100%",
              p: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: resolvedIcon ? "auto 1fr auto" : "1fr auto",
                alignItems: "center",
                columnGap: 1.25,
                pb: 1.25,
                position: "relative",
              }}
            >
              {resolvedIcon ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    color: widgetColors.text || themeConfig.brandColors.navy,
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}
                >
                  <Icon icon={resolvedIcon} style={{ fontSize: 26 }} />
                </Box>
              ) : null}
              <Typography
                variant="h6"
                component="div"
                sx={{
                  color: widgetColors.title || widgetColors.text,
                  fontSize: Math.max(titleFontSize * 1.18, 18),
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                  fontWeight: 700,
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  maxWidth: hasComparison && resolvedIcon ? "52%" : hasComparison || resolvedIcon ? "64%" : "78%",
                  pointerEvents: "none",
                }}
              >
                {widget.title}
              </Typography>
              <Box
                sx={{
                  minWidth: 0,
                  textAlign: "right",
                  visibility: hasComparison ? "visible" : "hidden",
                }}
              >
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    color: comparisonTone,
                    fontWeight: 800,
                    fontSize: Math.max(titleFontSize * 0.82, 10),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {varianceCopy || " "}
                </Typography>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    color: alpha(widgetColors.text || themeConfig.brandColors.navy, 0.72),
                    fontSize: Math.max(titleFontSize * 0.58, 9),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {varianceMeta || " "}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: breakdownSegments.length > 0 ? "stretch" : "center",
                justifyContent: "flex-start",
                flexDirection: "column",
                pt: 1.25,
              }}
            >
              <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {hasValidData ? (
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      color: widgetColors.text,
                      fontWeight: "bold",
                      fontSize: valueFontSize,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                  >
                    <AnimatedCounter
                      value={value}
                      prefix={prefix}
                      suffix={normalizedWidgetDataType === DataType.PROFIT_MARGIN ? "%" : ""}
                      decimals={normalizedWidgetDataType === DataType.PROFIT_MARGIN ? 1 : 0}
                      isCurrency={isCurrencyDataType(normalizedWidgetDataType || DataType.STOCK_VALUE)}
                    />
                  </Typography>
                ) : (
                  <Box sx={{ width: "100%", height: "100%" }} />
                )}
              </Box>
              {breakdownSegments.length > 0 ? (
                <Box sx={{ width: "100%", pt: 0.75 }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: Math.max(Math.min(containerSize.height * 0.05, 10), 6),
                      display: "flex",
                      overflow: "hidden",
                      borderRadius: 999,
                      backgroundColor: alpha(widgetColors.text || themeConfig.brandColors.navy, 0.08),
                    }}
                  >
                    {breakdownSegments.map((segment: any, index: number) => (
                      <Box
                        key={`${segment.label}-${index}`}
                        sx={{
                          width: `${Math.max(segment.percent * 100, 2)}%`,
                          backgroundColor: segment.color,
                          flexShrink: 0,
                        }}
                        title={`${segment.label}: ${(segment.percent * 100).toFixed(0)}%`}
                      />
                    ))}
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Box>
        )

      case WidgetType.BAR_CHART:
      case WidgetType.MULTIPLE_SERIES_BAR_CHART:
      case WidgetType.LINE_CHART:
      case WidgetType.PIE_CHART:
      case WidgetType.MULTIPLE_SERIES_LINE_CHART:
      case WidgetType.AREA_CHART:
      case WidgetType.DONUT_CHART:
      case WidgetType.STACKED_BAR_CHART:
      case WidgetType.STACKED_AREA_CHART:
        if (dataSeries.length === 0) {
          return <Box sx={{ width: "100%", height: "100%" }} />
        }
        const hasChartPoints =
          Boolean(chartData?.labels?.length) &&
          Array.isArray(chartData?.datasets) &&
          chartData.datasets.some((ds: any) => Array.isArray(ds?.data) && ds.data.length > 0)

        if (!chartData || !hasChartPoints) {
          return <Box sx={{ width: "100%", height: "100%" }} />
        }

        // Calculate percentage-based sizes
        const titleHeight = Math.max(containerSize.height * 0.12, 20) // 12% of height, min 20px
        const labelFontSize = Math.max(containerSize.height * 0.045, 8) // 4.5% of height, min 8px
        const axisLabelSize = Math.max(containerSize.height * 0.04, 7) // 4% of height, min 7px
        const legendSize = Math.max(containerSize.height * 0.045, 8) // 4.5% of height, min 8px
        
        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 2,
              right: 2,
              bottom: 2,
              left: 2,
            },
          },
          plugins: {
            legend: {
              display: dataSeries.length > 1,
              position: "bottom" as const,
              labels: {
                boxWidth: Math.max(containerSize.width * 0.025, 8), // 2.5% of width
                padding: Math.max(containerSize.height * 0.02, 4), // 2% of height
                font: {
                  size: legendSize,
                },
              },
            },
            tooltip: {
              enabled: true,
              mode: "index" as const,
              intersect: false,
              callbacks: {
                label: (context: any) => {
                  let label = context.dataset.label || ""
                  if (label) {
                    label += ": "
                  }
                  if (context.parsed.y !== null && context.parsed.y !== undefined) {
                    const s = dataSeries[context.datasetIndex]
                    const mode = (s?.displayMode || "quantity") as any
                    const dt = s?.dataType
                    const v = Number(context.parsed.y || 0)
                    if (mode === "price") {
                      label += formatValueByDataType(v, dt)
                    } else if (mode === "percentage") {
                      label += `${Number.isFinite(v) ? v.toFixed(1) : "0.0"}%`
                    } else if (mode === "score") {
                      label += `${Number.isFinite(v) ? v.toFixed(1) : "0.0"}`
                    } else {
                      label += v.toLocaleString("en-GB")
                    }
                  } else {
                    label += "0"
                  }
                  return label
                },
              },
            },
          },
          scales:
            effectiveWidgetType !== WidgetType.PIE_CHART && effectiveWidgetType !== WidgetType.DONUT_CHART
              ? {
                  x: {
                    grid: {
                      display: false,
                      drawBorder: false,
                    },
                    stacked: effectiveWidgetType === WidgetType.STACKED_BAR_CHART || effectiveWidgetType === WidgetType.STACKED_AREA_CHART,
                    ticks: {
                      font: {
                        size: axisLabelSize,
                      },
                      maxRotation: 35, // Reduced from 45 for better readability
                      minRotation: 35,
                      autoSkip: true,
                      maxTicksLimit: Math.max(Math.floor(containerSize.width / 45), 4), // More aggressive limiting
                      padding: 2, // Minimal padding
                    },
                  },
                  y: {
                    beginAtZero: true,
                    stacked: effectiveWidgetType === WidgetType.STACKED_BAR_CHART || effectiveWidgetType === WidgetType.STACKED_AREA_CHART,
                    grid: {
                      color: `${widgetColors.text}08`,
                      drawBorder: false,
                      lineWidth: 0.5,
                    },
                    ticks: {
                      font: {
                        size: axisLabelSize,
                      },
                      padding: Math.max(containerSize.width * 0.01, 2), // 1% of width
                      autoSkip: true,
                      maxTicksLimit: Math.max(Math.floor(containerSize.height / 35), 3), // More aggressive limiting
                      callback: (value: any) => {
                        if (
                          dataSeries.some(
                            (s) => (s as any)?.displayMode === "price"
                          )
                        ) {
                          // Compact currency format for small charts
                          const numValue = Number(value)
                          if (numValue >= 1000000) {
                            return `£${(numValue / 1000000).toFixed(1)}M`
                          } else if (numValue >= 1000) {
                            return `£${(numValue / 1000).toFixed(1)}K`
                          }
                          return formatValueByDataType(value, dataSeries[0]?.dataType || 'STOCK_VALUE')
                        }
                        if (dataSeries.some((s) => (s as any)?.displayMode === "percentage")) {
                          const numValue = Number(value)
                          return `${Number.isFinite(numValue) ? numValue.toFixed(0) : "0"}%`
                        }
                        // Compact number format
                        const numValue = Number(value)
                        if (numValue >= 1000000) {
                          return `${(numValue / 1000000).toFixed(1)}M`
                        } else if (numValue >= 1000) {
                          return `${(numValue / 1000).toFixed(1)}K`
                        }
                        return value
                      },
                    },
                  },
                }
              : undefined,
        }

        return (
          <Box sx={{ 
            height: "100%", 
            display: "flex", 
            flexDirection: "column", 
            p: 0.5, // Minimal padding (4px)
            overflow: "visible",
          }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                color: widgetColors.title || widgetColors.text,
                height: `${titleHeight}px`,
                maxHeight: `${titleHeight}px`,
                lineHeight: `${titleHeight}px`,
                fontSize: `${labelFontSize}px`,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                px: 0.25, // Minimal horizontal padding
                mb: 0.25, // Minimal margin bottom (2px)
                flexShrink: 0,
              }}
            >
              {widget.title}
            </Typography>
            <Box sx={{ 
              flexGrow: 1, 
              position: "relative",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              minHeight: 0,
              overflow: "visible", // Allow labels to overflow
              mx: 0, // No negative margin needed with minimal padding
            }}>
              {(effectiveWidgetType === WidgetType.BAR_CHART ||
                effectiveWidgetType === WidgetType.MULTIPLE_SERIES_BAR_CHART ||
                effectiveWidgetType === WidgetType.STACKED_BAR_CHART) && (
                <Bar data={chartData} options={chartOptions} ref={chartRef} />
              )}
              {(effectiveWidgetType === WidgetType.LINE_CHART ||
                effectiveWidgetType === WidgetType.MULTIPLE_SERIES_LINE_CHART ||
                effectiveWidgetType === WidgetType.AREA_CHART ||
                effectiveWidgetType === WidgetType.STACKED_AREA_CHART) && (
                <Line data={chartData} options={chartOptions} ref={chartRef} />
              )}
              {effectiveWidgetType === WidgetType.PIE_CHART && <Pie data={chartData} options={chartOptions} ref={chartRef} />}
              {effectiveWidgetType === WidgetType.DONUT_CHART && <Doughnut data={chartData} options={chartOptions} ref={chartRef} />}
            </Box>
          </Box>
        )

      case WidgetType.TABLE: {
        const OUTER_PAD_PX = 12
        const isBreakdown = (widget as any)?.dataConfigMode === "breakdown"
        const breakdownChartData = isBreakdown ? (data as any)?.breakdownChartData : null

        const visibleSeries = Array.isArray((widget as any)?.dataSeries)
          ? ((widget as any).dataSeries as any[]).filter((s) => s?.visible !== false)
          : []

        const getValueFromItem = (item: any, series: any): number => {
          const dt = series?.dataType
          const optKey = typeof series?.dataOption === "string" ? series.dataOption : undefined
          const mode = (series?.displayMode || "quantity") as "price" | "quantity" | "percentage" | "score"
          const base = dt ? item?.[dt] : null
          const bucket = optKey ? base?.options?.[optKey] || base : base
          if (!bucket) {
            // Fallback: try common scalar keys.
            return getValueForDisplayMode(item, mode)
          }
          return getValueForDisplayMode(bucket, mode)
        }

        const formatCell = (value: number, mode: "price" | "quantity" | "percentage" | "score", dtHint?: any) => {
          if (mode === "price") return formatValueByDataType(value, String(dtHint || ""))
          if (mode === "percentage") return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`
          if (mode === "score") return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}`
          return (Number.isFinite(value) ? value : 0).toLocaleString("en-GB")
        }

        const buildTotals = (values: number[], mode: "price" | "quantity" | "percentage" | "score") => {
          if (values.length === 0) return 0
          if (mode === "percentage" || mode === "score") {
            const sum = values.reduce((a, b) => a + (Number(b) || 0), 0)
            return sum / values.length
          }
          return values.reduce((a, b) => a + (Number(b) || 0), 0)
        }

        const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

        const measureCtxRef: any = (DynamicWidget as any).__measureCtxRef || { current: null }
        ;(DynamicWidget as any).__measureCtxRef = measureCtxRef

        const getMeasureCtx = () => {
          if (measureCtxRef.current) return measureCtxRef.current as CanvasRenderingContext2D
          const canvas = document.createElement("canvas")
          measureCtxRef.current = canvas.getContext("2d")
          return measureCtxRef.current as CanvasRenderingContext2D
        }

        const measureWidth = (text: string, fontSizePx: number, fontWeight: number) => {
          const ctx = getMeasureCtx()
          const family = (theme as any)?.typography?.fontFamily || "Roboto, Arial, sans-serif"
          ctx.font = `${fontWeight} ${fontSizePx}px ${family}`
          return ctx.measureText(String(text || "")).width || 0
        }

        const fitFontPx = (texts: string[], colW: number, padX: number, basePx: number, fontWeight: number, minPx: number) => {
          const usableW = Math.max(1, colW - padX * 2 - 10)
          const widestAtBase = Math.max(1, ...texts.map((t) => measureWidth(t, basePx, fontWeight)))
          const scaled = Math.floor((basePx * usableW) / widestAtBase * 0.75)
          return clamp(scaled, minPx, basePx)
        }

        const normalizeDateLabel = (raw: string) => {
          const s = String(raw || "").trim()
          const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
          return s
        }

        const compactDateLabelToFit = (raw: string, colW: number, padX: number, headFontPx: number, rotate: boolean) => {
          const s = normalizeDateLabel(raw)
          const usableW = Math.max(1, colW - padX * 2 - 10)
          const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
          const candidates = m ? [s, `${m[1]}/${m[2]}`, `${m[1]}`, ""] : [s, ""]

          const angle = rotate ? Math.PI / 4 : 0
          const cos = rotate ? Math.cos(angle) : 1
          const sin = rotate ? Math.sin(angle) : 0
          const approxTextH = headFontPx * 1.2

          for (const c of candidates) {
            if (!c) return ""
            const w = measureWidth(c, headFontPx, 800)
            const requiredW = rotate ? w * cos + approxTextH * sin + 4 : w + 4
            if (requiredW <= usableW) return c
          }
          return ""
        }

        const computeTableSizing = (colCount: number, bodyRowCount: number) => {
          const w = Math.max(1, containerSize.width || 0)
          const h = Math.max(1, containerSize.height || 0)
          const titlePx = clamp(Math.round(h * 0.085), 18, 34)
          const availableH = Math.max(80, h - titlePx - 10)
          const totalRows = Math.max(1, bodyRowCount + 1)
          const targetRowH = clamp(Math.floor(availableH / totalRows), 12, 30)
          const cellPadY = clamp(Math.floor(targetRowH * 0.14), 1, 5)
          const textH = Math.max(9, targetRowH - cellPadY * 2)
          const bodyFont = clamp(Math.floor(textH * 0.78), 5, 14)
          const headFont = clamp(bodyFont + 1, 6, 15)
          const cellPadX = clamp(Math.floor((w / Math.max(1, colCount)) * 0.02), 0, 1)
          return {
            titlePx,
            targetRowH,
            headFont,
            bodyFont,
            cellPadY,
            cellPadX,
            nameColMin: clamp(Math.floor(w * 0.22), 80, 220),
            totalColMin: clamp(Math.floor(w * 0.12), 60, 140),
          }
        }

        const computeColumnFonts = (opts: {
          containerW: number
          nameColW: number
          totalColW: number
          padX: number
          baseHeadFont: number
          baseBodyFont: number
          headerLabels: string[]
          rowLabels: string[]
          cellStrings: string[][]
          totalStrings: string[]
          grandTotalString: string
        }) => {
          const dateColCount = opts.headerLabels.length
          const effectiveW = Math.max(1, opts.containerW - 8)
          const nameColW = Math.max(24, Math.min(opts.nameColW, effectiveW))
          const totalColW = Math.max(20, Math.min(opts.totalColW, Math.max(20, effectiveW - nameColW)))
          const remainingW = Math.max(1, effectiveW - nameColW - totalColW)
          const dateColW = Math.max(4, Math.floor(remainingW / Math.max(1, dateColCount)))

          const headFonts: number[] = []
          const bodyFonts: number[] = []

          const seriesAdornmentW = 10
          const seriesColW = Math.max(16, nameColW - seriesAdornmentW)
          headFonts.push(fitFontPx(["Series"], seriesColW, opts.padX, opts.baseHeadFont, 800, 2))
          bodyFonts.push(fitFontPx(opts.rowLabels, seriesColW, opts.padX, opts.baseBodyFont, 400, 1))

          for (let c = 0; c < dateColCount; c++) {
            const header = String(opts.headerLabels[c] || "")
            const colTexts = [...opts.cellStrings.map((row) => String(row?.[c] ?? "")), String(opts.totalStrings?.[c] ?? "")]
            headFonts.push(fitFontPx([header], dateColW, opts.padX, opts.baseHeadFont, 800, 2))
            bodyFonts.push(fitFontPx(colTexts, dateColW, opts.padX, opts.baseBodyFont, 400, 1))
          }

          const totalTexts = [...opts.totalStrings, String(opts.grandTotalString || "")]
          headFonts.push(fitFontPx(["Total"], totalColW, opts.padX, opts.baseHeadFont, 800, 2))
          bodyFonts.push(fitFontPx(totalTexts, totalColW, opts.padX, opts.baseBodyFont, 400, 1))

          return { headFonts, bodyFonts, dateColW, nameColW, totalColW }
        }

        // Breakdown mode: use pre-built ChartJS data to form rows/cols.
        if (breakdownChartData && Array.isArray(breakdownChartData.labels) && Array.isArray(breakdownChartData.datasets)) {
          const rawColLabels = breakdownChartData.labels.map((l: any) => String(l))
          const rows = (breakdownChartData.datasets as any[]).map((ds: any, idx: number) => ({
            key: String(ds?.label || `Series ${idx + 1}`),
            label: String(ds?.label || `Series ${idx + 1}`),
            color: String(ds?.borderColor || ds?.backgroundColor || widgetColors.series[idx % widgetColors.series.length] || themeConfig.brandColors.navy),
            values: Array.isArray(ds?.data) ? (ds.data as number[]).map((v: any) => Number(v) || 0) : [],
          }))

          const displayMode = ((data as any)?.breakdownMeta?.displayMode || "quantity") as any
          const colTotals = rawColLabels.map((_c: string, colIdx: number) => buildTotals(rows.map((r: any) => r.values[colIdx] ?? 0), displayMode))
          const rowTotals = rows.map((r: any) => buildTotals(r.values, displayMode))
          const grandTotal = buildTotals(rows.flatMap((r: any) => r.values), displayMode)

          const sizing = computeTableSizing(rawColLabels.length + 2, rows.length + 2)
          const rowLabels = rows.map((r: any) => String(r.label || ""))
          const cellStrings = rows.map((r: any) => rawColLabels.map((_c: string, colIdx: number) => formatCell(r.values[colIdx] ?? 0, displayMode, widget.dataType)))
          const totalStrings = colTotals.map((v: number) => formatCell(v, displayMode, widget.dataType))
          const grandTotalString = formatCell(grandTotal, displayMode, widget.dataType)
          const rowTotalStrings = rowTotals.map((v: number) => formatCell(v, displayMode, widget.dataType))

          const tmp = computeColumnFonts({
            containerW: Math.max(1, (containerSize.width || 0) - OUTER_PAD_PX * 2),
            nameColW: sizing.nameColMin,
            totalColW: sizing.totalColMin,
            padX: sizing.cellPadX,
            baseHeadFont: sizing.headFont,
            baseBodyFont: sizing.bodyFont,
            headerLabels: rawColLabels,
            rowLabels,
            cellStrings,
            totalStrings,
            grandTotalString,
          })

          const { headFonts, bodyFonts, dateColW, nameColW, totalColW } = tmp
          const seriesHeaderLabel = nameColW < 60 ? "S" : nameColW < 90 ? "Ser" : "Series"
          const totalHeaderLabel = totalColW < 60 ? "T" : totalColW < 90 ? "Tot" : "Total"
          const rotateDates = dateColW < (rawColLabels.length >= 7 ? 70 : 58)
          const colLabels = rawColLabels.map((l: string, i: number) =>
            compactDateLabelToFit(l, dateColW, sizing.cellPadX, headFonts[i + 1] || sizing.headFont, rotateDates),
          )

          const headerRowHeight = (() => {
            if (!rotateDates) return sizing.targetRowH + 2
            const angle = Math.PI / 4
            const sin = Math.sin(angle)
            const cos = Math.cos(angle)
            const h = Math.max(
              ...colLabels.map((lbl: string, i: number) => {
                if (!lbl) return sizing.targetRowH + 2
                const fontPx = headFonts[i + 1] || sizing.headFont
                const w = measureWidth(lbl, fontPx, 800)
                const textH = fontPx * 1.2
                const requiredH = w * sin + textH * cos
                return Math.ceil(requiredH + sizing.cellPadY * 2 + 6)
              }),
              sizing.targetRowH + 2,
            )
            return h
          })()

          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column", px: 1.5, py: 0.75, minHeight: 0 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  color: widgetColors.title || widgetColors.text,
                  height: `${Math.max(containerSize.height * 0.12, 20)}px`,
                  maxHeight: `${Math.max(containerSize.height * 0.12, 20)}px`,
                  lineHeight: `${Math.max(containerSize.height * 0.12, 20)}px`,
                  fontSize: `${Math.max(containerSize.height * 0.045, 8)}px`,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  px: 0.25,
                  mb: 0.25,
                  flexShrink: 0,
                }}
              >
                {widget.title}
              </Typography>

              <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden", borderRadius: 1, border: "none" }}>
                <MuiTable
                  size="small"
                  stickyHeader
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    "& .MuiTableCell-root": {
                      py: `${sizing.cellPadY}px`,
                      px: `${sizing.cellPadX}px`,
                      lineHeight: 1.05,
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      fontSize: `${sizing.bodyFont}px`,
                    },
                    "& .MuiTableCell-head": {
                      fontSize: `${sizing.headFont}px`,
                      fontWeight: 800,
                    },
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ height: `${headerRowHeight}px` }}>
                      <TableCell sx={{ minWidth: 0, width: nameColW, maxWidth: nameColW, fontSize: `${headFonts[0]}px` }}>
                        {seriesHeaderLabel}
                      </TableCell>
                      {colLabels.map((c: string, i: number) => (
                        <TableCell
                          key={`${c}-${i}`}
                          align="right"
                          sx={{ width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${headFonts[i + 1]}px` }}
                        >
                          {rotateDates && c ? (
                            <Box component="span" sx={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
                              <Box
                                component="span"
                                sx={{
                                  position: "absolute",
                                  left: "50%",
                                  bottom: 2,
                                  transform: "translateX(-50%) rotate(-45deg)",
                                  transformOrigin: "center",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c}
                              </Box>
                            </Box>
                          ) : (
                            c
                          )}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ minWidth: 0, width: totalColW, maxWidth: totalColW, fontSize: `${headFonts[headFonts.length - 1]}px` }}>
                        {totalHeaderLabel}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r: any, idx: number) => (
                      <TableRow key={r.key} hover sx={{ height: `${sizing.targetRowH}px` }}>
                        <TableCell sx={{ fontSize: `${bodyFonts[0]}px`, minWidth: 0, width: nameColW, maxWidth: nameColW }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: r.color, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontSize: "inherit", minWidth: 0 }} noWrap>
                              {r.label}
                            </Typography>
                          </Box>
                        </TableCell>
                        {colLabels.map((_c: string, colIdx: number) => (
                          <TableCell key={`${r.key}-${colIdx}`} align="right" sx={{ width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${bodyFonts[colIdx + 1]}px` }}>
                            {cellStrings[idx]?.[colIdx] ?? formatCell(r.values[colIdx] ?? 0, displayMode, widget.dataType)}
                          </TableCell>
                        ))}
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: `${bodyFonts[bodyFonts.length - 1]}px`, minWidth: 0, width: totalColW, maxWidth: totalColW }}>
                          {rowTotalStrings[idx] ?? formatCell(rowTotals[idx] ?? 0, displayMode, widget.dataType)}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow sx={{ height: `${sizing.targetRowH}px` }}>
                      <TableCell sx={{ fontWeight: 900, fontSize: `${bodyFonts[0]}px`, minWidth: 0, width: nameColW, maxWidth: nameColW }}>
                        Total
                      </TableCell>
                      {colTotals.map((v: number, i: number) => (
                        <TableCell key={`col-total-${i}`} align="right" sx={{ fontWeight: 900, width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${bodyFonts[i + 1]}px` }}>
                          {totalStrings[i] ?? formatCell(v, displayMode, widget.dataType)}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: `${bodyFonts[bodyFonts.length - 1]}px`, minWidth: 0, width: totalColW, maxWidth: totalColW }}>
                        {grandTotalString}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </Box>
          )
        }

        // Series mode: build table from history.
        const history = Array.isArray((data as any)?.history) ? ((data as any).history as any[]) : []
        const rawColLabels = history.map((h: any) => formatDateLabel(String(h?.date || "")))

        const seriesRows = (visibleSeries.length > 0
          ? visibleSeries
          : [{ dataType: widget.dataType, displayMode: (widget as any)?.displayMode || "quantity", label: "Series 1", color: widgetColors.series[0], visible: true }]).map(
          (s: any, idx: number) => {
            const values = history.map((item: any) => getValueFromItem(item, s))
            return {
              key: `${String(s.dataType || "series")}-${idx}-${String(s.dataOption || "none")}`,
              label: String(s.label || s.dataType || `Series ${idx + 1}`),
              color: String(s.color || widgetColors.series[idx % widgetColors.series.length] || themeConfig.brandColors.navy),
              mode: (s.displayMode || "quantity") as any,
              dt: s.dataType,
              values,
            }
          },
        )

        const colTotals = rawColLabels.map((_c: string, colIdx: number) => {
          const mode = seriesRows[0]?.mode || "quantity"
          return buildTotals(seriesRows.map((r: any) => r.values[colIdx] ?? 0), mode)
        })
        const rowTotals = seriesRows.map((r: any) => buildTotals(r.values, r.mode))
        const mode0 = seriesRows[0]?.mode || "quantity"
        const grandTotal = buildTotals(seriesRows.flatMap((r: any) => r.values), mode0)

        const sizing = computeTableSizing(rawColLabels.length + 2, seriesRows.length + 2)
        const rowLabels = seriesRows.map((r: any) => String(r.label || ""))
        const cellStrings = seriesRows.map((r: any) => rawColLabels.map((_c: string, colIdx: number) => formatCell(r.values[colIdx] ?? 0, r.mode, r.dt)))
        const totalStrings = colTotals.map((v: number) => formatCell(v, mode0, widget.dataType))
        const grandTotalString = formatCell(grandTotal, mode0, widget.dataType)
        const rowTotalStrings = rowTotals.map((v: number, idx: number) => formatCell(v, seriesRows[idx]?.mode || mode0, seriesRows[idx]?.dt))

        const tmp = computeColumnFonts({
          containerW: Math.max(1, (containerSize.width || 0) - OUTER_PAD_PX * 2),
          nameColW: sizing.nameColMin,
          totalColW: sizing.totalColMin,
          padX: sizing.cellPadX,
          baseHeadFont: sizing.headFont,
          baseBodyFont: sizing.bodyFont,
          headerLabels: rawColLabels,
          rowLabels,
          cellStrings,
          totalStrings,
          grandTotalString,
        })
        const { headFonts, bodyFonts, dateColW, nameColW, totalColW } = tmp
        const seriesHeaderLabel = nameColW < 60 ? "S" : nameColW < 90 ? "Ser" : "Series"
        const totalHeaderLabel = totalColW < 60 ? "T" : totalColW < 90 ? "Tot" : "Total"
        const rotateDates = dateColW < (rawColLabels.length >= 7 ? 70 : 58)
        const colLabels = rawColLabels.map((l: string, i: number) =>
          compactDateLabelToFit(l, dateColW, sizing.cellPadX, headFonts[i + 1] || sizing.headFont, rotateDates),
        )
        const headerRowHeight = (() => {
          if (!rotateDates) return sizing.targetRowH + 2
          const angle = Math.PI / 4
          const sin = Math.sin(angle)
          const cos = Math.cos(angle)
          const h = Math.max(
            ...colLabels.map((lbl: string, i: number) => {
              if (!lbl) return sizing.targetRowH + 2
              const fontPx = headFonts[i + 1] || sizing.headFont
              const w = measureWidth(lbl, fontPx, 800)
              const textH = fontPx * 1.2
              const requiredH = w * sin + textH * cos
              return Math.ceil(requiredH + sizing.cellPadY * 2 + 6)
            }),
            sizing.targetRowH + 2,
          )
          return h
        })()

        if (history.length === 0) {
          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
              <Typography variant="h6" component="div" sx={{ color: widgetColors.title || widgetColors.text, mb: 1, fontSize: titleFontSize }}>
                {widget.title}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
            </Box>
          )
        }

        return (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", px: 1.5, py: 0.75, minHeight: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                color: widgetColors.title || widgetColors.text,
                height: `${Math.max(containerSize.height * 0.12, 20)}px`,
                maxHeight: `${Math.max(containerSize.height * 0.12, 20)}px`,
                lineHeight: `${Math.max(containerSize.height * 0.12, 20)}px`,
                fontSize: `${Math.max(containerSize.height * 0.045, 8)}px`,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                px: 0.25,
                mb: 0.25,
                flexShrink: 0,
              }}
            >
              {widget.title}
            </Typography>

            <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden", borderRadius: 1, border: "none" }}>
              <MuiTable
                size="small"
                stickyHeader
                sx={{
                  tableLayout: "fixed",
                  width: "100%",
                  "& .MuiTableCell-root": {
                    py: `${sizing.cellPadY}px`,
                    px: `${sizing.cellPadX}px`,
                    lineHeight: 1.05,
                    verticalAlign: "middle",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    fontSize: `${sizing.bodyFont}px`,
                  },
                  "& .MuiTableCell-head": {
                    fontSize: `${sizing.headFont}px`,
                    fontWeight: 800,
                  },
                }}
              >
                <TableHead>
                  <TableRow sx={{ height: `${headerRowHeight}px` }}>
                    <TableCell sx={{ minWidth: 0, width: nameColW, maxWidth: nameColW, fontSize: `${headFonts[0]}px` }}>
                      {seriesHeaderLabel}
                    </TableCell>
                    {colLabels.map((c: string, i: number) => (
                      <TableCell
                        key={`${c}-${i}`}
                        align="right"
                        sx={{ width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${headFonts[i + 1]}px` }}
                      >
                        {rotateDates && c ? (
                          <Box component="span" sx={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
                            <Box
                              component="span"
                              sx={{
                                position: "absolute",
                                left: "50%",
                                bottom: 2,
                                transform: "translateX(-50%) rotate(-45deg)",
                                transformOrigin: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c}
                            </Box>
                          </Box>
                        ) : (
                          c
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ minWidth: 0, width: totalColW, maxWidth: totalColW, fontSize: `${headFonts[headFonts.length - 1]}px` }}>
                      {totalHeaderLabel}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seriesRows.map((r: any, idx: number) => (
                    <TableRow key={r.key} hover sx={{ height: `${sizing.targetRowH}px` }}>
                      <TableCell sx={{ fontSize: `${bodyFonts[0]}px`, minWidth: 0, width: nameColW, maxWidth: nameColW }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: r.color, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontSize: "inherit", minWidth: 0 }} noWrap>
                            {r.label}
                          </Typography>
                        </Box>
                      </TableCell>
                      {colLabels.map((_c: string, colIdx: number) => (
                        <TableCell key={`${r.key}-${colIdx}`} align="right" sx={{ width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${bodyFonts[colIdx + 1]}px` }}>
                          {cellStrings[idx]?.[colIdx] ?? formatCell(r.values[colIdx] ?? 0, r.mode, r.dt)}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: `${bodyFonts[bodyFonts.length - 1]}px`, minWidth: 0, width: totalColW, maxWidth: totalColW }}>
                        {rowTotalStrings[idx] ?? formatCell(rowTotals[idx] ?? 0, r.mode, r.dt)}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow sx={{ height: `${sizing.targetRowH}px` }}>
                    <TableCell sx={{ fontWeight: 900, fontSize: `${bodyFonts[0]}px`, minWidth: 0, width: nameColW, maxWidth: nameColW }}>
                      Total
                    </TableCell>
                    {colTotals.map((v: number, i: number) => (
                      <TableCell key={`col-total-${i}`} align="right" sx={{ fontWeight: 900, width: dateColW, minWidth: 0, maxWidth: dateColW, fontSize: `${bodyFonts[i + 1]}px` }}>
                        {totalStrings[i] ?? formatCell(v, mode0, widget.dataType)}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 900, fontSize: `${bodyFonts[bodyFonts.length - 1]}px`, minWidth: 0, width: totalColW, maxWidth: totalColW }}>
                      {grandTotalString}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </MuiTable>
            </TableContainer>
          </Box>
        )
      }

      case WidgetType.DATA_GRID: {
        // Prepare columns and rows for DataGrid (inventory-style tables).
        const columns = [
          { field: "name", headerName: "Name", flex: 1 },
          {
            field: "quantity",
            headerName: "Quantity",
            width: 120,
            valueFormatter: (params: any) => {
              return params.value !== null && params.value !== undefined ? params.value.toLocaleString() : "0"
            },
          },
          {
            field: "value",
            headerName: "Value",
            width: 120,
            valueFormatter: (params: any) => {
              return params.value !== null && params.value !== undefined
                ? formatValueByDataType(params.value, "STOCK_VALUE")
                : formatValueByDataType(0, "STOCK_VALUE")
            },
          },
        ]

        const rows =
          data.items?.map((item: any, index: number) => ({
            id: index,
            name: item.name || "Unknown",
            quantity: item.quantity || 0,
            value: item.value || 0,
          })) || []

        if (rows.length === 0) {
          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
              <Typography variant="h6" component="div" sx={{ color: widgetColors.title || widgetColors.text, mb: 1, fontSize: titleFontSize }}>
                {widget.title}
              </Typography>
              <Box sx={{ flexGrow: 1, width: "100%" }}>
                <EmptyCardState message="No table data available" height="100%" />
              </Box>
            </Box>
          )
        }

        return (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
            <Typography variant="h6" component="div" sx={{ color: widgetColors.title || widgetColors.text, mb: 1, fontSize: titleFontSize }}>
              {widget.title}
            </Typography>
            <Box sx={{ flexGrow: 1, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                density="compact"
                autoPageSize
                sx={{
                  border: "none",
                  "& .MuiDataGrid-cell": { fontSize: getResponsiveFontSize(12) },
                  "& .MuiDataGrid-columnHeader": { fontSize: getResponsiveFontSize(12) },
                }}
              />
            </Box>
          </Box>
        )
      }

      case WidgetType.CALCULATOR:
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <SimpleCalculatorWidget />
            </Box>
          </Box>
        )

      default:
        return <Box>Unsupported widget type</Box>
    }
  }

  return (
    <Box
      component="div"
      ref={containerRef}
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: widgetColors.background,
        color: widgetColors.text,
        border: `1px solid ${widgetColors.border}`,
        borderRadius: "6px", // Slightly smaller radius for tighter look
        overflow: "visible", // Allow labels to overflow card boundaries
        boxShadow: isEditing
          ? `0 0 0 2px ${themeConfig.brandColors.navy}`
          : `0 1px 3px ${alpha(themeConfig.brandColors.navy, 0.12)}`,
        transition: "box-shadow 0.2s ease-in-out",
        position: "relative",
        touchAction: isEditing ? "none" : "auto", // Prevent scrolling when editing
      }}
      onTouchStart={onTouchStart}
      onTouchMove={(e) => {
        // Convert React.TouchEvent to TouchEvent for the hook
        onTouchMoveRaw(e.nativeEvent)
      }}
      onTouchEnd={onTouchEnd}
    >
      {isEditing && onSettingsOpen && (
        <IconButton
          size="small"
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.8),
            "&:hover": {
              backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.9),
            },
            zIndex: 10,
          }}
          onClick={() => onSettingsOpen(widget.id)}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      )}
      {renderWidget()}
    </Box>
  )
}

export default DynamicWidget
