"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import { Icon } from "@iconify/react"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "./CRUDModal"
import ColorSelect from "./ColorSelect"
import {
  type WidgetSettingsDialogProps,
  WidgetType,
  DataType,
  type WidgetSettings,
  type DataSeries,
} from "../../types/WidgetTypes"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`widget-settings-tabpanel-${index}`}
      aria-labelledby={`widget-settings-tab-${index}`}
      {...other}
      sx={{ py: 2 }}
    >
      {value === index && children}
    </Box>
  )
}

const WidgetSettingsDialog: React.FC<WidgetSettingsDialogProps> = ({
  open,
  onClose,
  widget,
  onSave,
  availableDataTypes,
  cardDataTypes,
  seriesDataTypes,
  mode = "edit",
}) => {
  const location = useLocation()
  const [settings, setSettings] = useState<WidgetSettings | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false)
  const availableIcons = [
    "mdi:cash-register",
    "mdi:package-variant-closed",
    "mdi:alert-circle-outline",
    "mdi:chart-line",
    "mdi:information-outline",
    "mdi:tag-outline",
    "mdi:account-group",
    "mdi:store",
    "mdi:truck-delivery",
    "mdi:calendar-check",
  ]

  const DEFAULT_COLORS: WidgetSettings["colors"] = {
    background: themeConfig.brandColors.offWhite,
    border: themeConfig.colors.divider,
    text: themeConfig.brandColors.navy,
    title: themeConfig.brandColors.navy,
    series: [
      themeConfig.brandColors.navy,
      themeConfig.colors.success.main,
      themeConfig.colors.warning.main,
      themeConfig.colors.error.main,
    ],
  }

  const inferDisplayMode = (dataType?: DataType): DataSeries["displayMode"] => {
    switch (dataType) {
      case DataType.ATTENDANCE:
      case DataType.OCCUPANCY_RATE:
      case DataType.TRAINING_PROGRESS:
      case DataType.ATTENDANCE_TRENDS:
      case DataType.PROFIT_MARGIN:
        return "percentage"
      case DataType.PERFORMANCE:
      case DataType.PERFORMANCE_METRICS:
        return "score"
      case DataType.STOCK_VALUE:
      case DataType.PREVIOUS_STOCK_VALUE:
      case DataType.PREDICTED_STOCK_VALUE:
      case DataType.INVENTORY_VALUE:
      case DataType.PROFIT:
      case DataType.COST_OF_SALES:
      case DataType.PAYROLL:
      case DataType.REVENUE:
      case DataType.EXPENSES:
      case DataType.CASH_FLOW_ANALYSIS:
      case DataType.EXPENSE_BREAKDOWN:
      case DataType.WASTAGE:
        return "price"
      default:
        return "quantity"
    }
  }

  const cardPool = useMemo(() => (Array.isArray(cardDataTypes) && cardDataTypes.length > 0 ? cardDataTypes : availableDataTypes), [cardDataTypes, availableDataTypes])

  const seriesPoolBase = useMemo(
    () => (Array.isArray(seriesDataTypes) && seriesDataTypes.length > 0 ? seriesDataTypes : cardPool),
    [seriesDataTypes, cardPool],
  )

  const seriesPool = useMemo(() => {
    const base = [...(seriesPoolBase || [])]
    const selected = (settings?.dataSeries || []).map((s) => String(s?.dataType || "")).filter(Boolean)
    for (const v of selected) {
      if (!base.some((o) => String(o.value) === v)) {
        // Keep legacy selections editable even if not in the pool.
        base.push({ value: v, label: v })
      }
    }
    return base
  }, [seriesPoolBase, settings?.dataSeries])

  const normalizeLegacyDataType = (dt: any): DataType => {
    const v = String(dt || "")
    // Legacy saved dashboards used this value; map it to the closest supported metric.
    if (v === "itemsSummary") return DataType.TOTAL_ITEMS
    if (v === "timeOff" || v === "timeOffRequests" || v === "holidays" || v === "holidayRequests") return DataType.TIME_OFF_REQUESTS
    if (v === "cancellations" || v === "cancelledBookings" || v === "bookingCancellations") return DataType.CANCELLATION_ANALYSIS
    if (v === "noShows" || v === "noShowBookings" || v === "noshows" || v === "bookingNoShows") return DataType.NO_SHOW_ANALYSIS
    if (v === "sales") return DataType.REVENUE
    if (v === "expense" || v === "expenses") return DataType.EXPENSES
    if (v === "budget" || v === "budgetVariance" || v === "budgetvariance") return DataType.BUDGET_VARIANCE
    if (v === "invoice" || v === "invoices") return DataType.TOTAL_ITEMS
    return dt as DataType
  }

  useEffect(() => {
    if (!open) return
    // Avoid Chrome "Blocked aria-hidden..." warning when MUI Dialog opens and
    // applies aria-hidden to #root while the trigger still has focus.
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }, [open])

  const getMetricLabel = (value: any, fallback = "Series") => {
    const v = String(value || "")
    return seriesPool.find((d) => String(d.value) === v)?.label || cardPool.find((d) => String(d.value) === v)?.label || fallback
  }

  const getDataOptionsForType = (dt?: DataType): { value: string; label: string }[] => {
    switch (dt) {
      // Common “gross / net” style options (used across modules)
      case DataType.SALES:
      case DataType.PURCHASES:
      case DataType.REVENUE:
        return [
          { value: "gross", label: "Gross" },
          { value: "net", label: "Net" },
        ]

      // Common “value / percentage” style options
      case DataType.PROFIT:
      case DataType.PROFIT_MARGIN:
        return [
          { value: "value", label: "Value" },
          { value: "percentage", label: "Percentage" },
        ]

      default:
        return []
    }
  }

  const getCardComparisonOptions = (dt?: DataType): { value: "none" | "budget" | "forecast"; label: string }[] => {
    const moduleName = inferModule()
    const options: { value: "none" | "budget" | "forecast"; label: string }[] = [{ value: "none", label: "None" }]

    if (moduleName !== "finance") {
      return options
    }

    const financeBudgetComparable = new Set<DataType>([
      DataType.REVENUE,
      DataType.EXPENSES,
      DataType.PROFIT,
      DataType.CASH_FLOW,
      DataType.OUTSTANDING_INVOICES,
    ])

    if (dt && financeBudgetComparable.has(dt)) {
      options.push({ value: "budget", label: "Budget" })
    }

    if (dt === DataType.REVENUE) {
      options.push({ value: "forecast", label: "Forecast" })
    }

    return options
  }

  const allowedFormatsFor = (dt?: DataType, dataOption?: string): DataSeries["displayMode"][] => {
    const opt = String(dataOption || "")
    if (opt === "gross" || opt === "net" || opt === "value") return ["price"]
    if (opt === "percentage") return ["percentage"]

    // No option selected: fall back to defaults by metric.
    const inferred = inferDisplayMode(dt)
    if (inferred === "price") return ["price", "quantity"]
    if (inferred === "percentage") return ["percentage", "quantity"]
    if (inferred === "score") return ["score", "quantity"]
    return ["quantity", "price", "percentage", "score"]
  }

  const clampFormatToAllowed = (dt?: DataType, dataOption?: string, current?: DataSeries["displayMode"]) => {
    const allowed = allowedFormatsFor(dt, dataOption)
    const c = current || inferDisplayMode(dt)
    return allowed.includes(c) ? c : allowed[0] || inferDisplayMode(dt)
  }

  const inferModuleFromDataType = (dt?: DataType) => {
    switch (dt) {
      case DataType.TOTAL_BOOKINGS:
      case DataType.WAITLIST_ANALYTICS:
      case DataType.CANCELLATION_ANALYSIS:
      case DataType.NO_SHOW_ANALYSIS:
      case DataType.OCCUPANCY_RATE:
      case DataType.TABLE_OCCUPANCY:
      case DataType.BOOKING_TRENDS:
        return "bookings"
      case DataType.ATTENDANCE:
      case DataType.PAYROLL:
      case DataType.TIME_OFF:
      case DataType.TRAINING:
      case DataType.RECRUITMENT:
      case DataType.PERFORMANCE:
      case DataType.EMPLOYEES_BY_DEPARTMENT:
        return "hr"
      case DataType.POS_TRANSACTIONS:
      case DataType.PAYMENT_METHOD_BREAKDOWN:
      case DataType.SALES_BY_DAY:
      case DataType.SALES_BY_HOUR:
      case DataType.CUSTOMER_ANALYTICS:
      case DataType.POS_SALES:
        return "pos"
      case DataType.OUTSTANDING_INVOICES:
      case DataType.CASH_FLOW_ANALYSIS:
      case DataType.EXPENSES:
      case DataType.REVENUE:
      case DataType.BUDGET_VARIANCE:
      case DataType.EXPENSE_BREAKDOWN:
      case DataType.BUDGET_PERFORMANCE:
      case DataType.REVENUE_BY_CUSTOMER:
        return "finance"
      default:
        return null
    }
  }

  const inferModule = () => {
    const fromCurrentType = inferModuleFromDataType((settings as any)?.dataType || (widget as any)?.dataType)
    if (fromCurrentType) return fromCurrentType

    const values = new Set((availableDataTypes || []).map((d) => String(d.value)))
    if (values.has(String(DataType.TOTAL_BOOKINGS)) || values.has(String(DataType.WAITLIST_ANALYTICS)) || values.has(String(DataType.TABLE_OCCUPANCY))) return "bookings"
    if (values.has(String(DataType.ATTENDANCE)) || values.has(String(DataType.PAYROLL)) || values.has(String(DataType.TIME_OFF))) return "hr"
    if (values.has(String(DataType.POS_TRANSACTIONS)) || values.has(String(DataType.PAYMENT_METHOD_BREAKDOWN))) return "pos"
    if (values.has(String(DataType.OUTSTANDING_INVOICES)) || values.has(String(DataType.CASH_FLOW_ANALYSIS)) || values.has(String(DataType.EXPENSES))) return "finance"
    return "stock"
  }

  const breakdownOptions = useMemo(() => {
    const m = inferModule()
    if (m === "bookings") {
      return [
        { value: "bookingType", label: "Booking Types" },
        { value: "status", label: "Status" },
        { value: "tracking", label: "Tracking" },
        { value: "tag", label: "Tags" },
        { value: "location", label: "Location" },
        { value: "table", label: "Tables" },
      ]
    }
    if (m === "hr") {
      return [
        { value: "role", label: "Role" },
        { value: "department", label: "Department" },
        { value: "status", label: "Status" },
        { value: "employmentType", label: "Employment Type" },
        { value: "payType", label: "Pay Type" },
      ]
    }
    if (m === "pos") {
      return [
        { value: "salesDivision", label: "Sales Divisions" },
        { value: "category", label: "Categories" },
        { value: "subcategory", label: "Subcategories" },
        { value: "course", label: "Courses" },
        { value: "supplier", label: "Suppliers" },
        { value: "location", label: "Location" },
        { value: "device", label: "Devices" },
        { value: "table", label: "Tables" },
        { value: "paymentType", label: "Payment Type" },
      ]
    }
    if (m === "finance") {
      return [
        { value: "account", label: "Account" },
        { value: "contact", label: "Contact" },
        { value: "type", label: "Type" },
      ]
    }
    // stock
    return [
      { value: "salesDivision", label: "Sales Divisions" },
      { value: "category", label: "Categories" },
      { value: "subcategory", label: "Subcategories" },
      { value: "course", label: "Courses" },
      { value: "supplier", label: "Suppliers" },
      { value: "location", label: "Location" },
    ]
  }, [availableDataTypes])

  const normalizeWidgetForDialog = (w: WidgetSettings): WidgetSettings => {
    // Coerce legacy multi-series line chart to normal line chart in the editor.
    const coercedType =
      (w as any)?.type === WidgetType.MULTIPLE_SERIES_LINE_CHART ? WidgetType.LINE_CHART : (w as any)?.type

    // Coerce legacy card types to unified CARD.
    const unifiedType =
      coercedType === WidgetType.STAT || coercedType === WidgetType.DASHBOARD_CARD ? WidgetType.CARD : coercedType

    const c: any = (w as any)?.colors
    const safeColors: WidgetSettings["colors"] = {
      background: c?.background || DEFAULT_COLORS.background,
      border: c?.border || DEFAULT_COLORS.border,
      text: c?.text || DEFAULT_COLORS.text,
      title: c?.title || c?.text || DEFAULT_COLORS.title,
      series: Array.isArray(c?.series) && c.series.length > 0 ? c.series : DEFAULT_COLORS.series,
    }

    const rawSeries = Array.isArray((w as any)?.dataSeries) ? ((w as any).dataSeries as any[]) : []
    const widgetDt = normalizeLegacyDataType((w as any)?.dataType ?? rawSeries?.[0]?.dataType ?? DataType.TOTAL_ITEMS)
    const safeSeries: DataSeries[] = rawSeries.filter(Boolean).map((s: any, idx: number) => {
      const dt = normalizeLegacyDataType(s?.dataType ?? widgetDt ?? DataType.TOTAL_ITEMS) as DataType
      const options = getDataOptionsForType(dt)
      const opt = typeof s?.dataOption === "string" ? s.dataOption : (options[0]?.value ?? "")
      const mode = clampFormatToAllowed(dt, opt, (s?.displayMode ?? (w as any).displayMode) as any)
      const autoLabelBase = getMetricLabel(dt, String(dt))
      const optLabel = options.find((o) => o.value === opt)?.label
      const label = String(s?.label || (optLabel ? `${autoLabelBase} - ${optLabel}` : autoLabelBase))
      return {
        dataType: dt,
        dataOption: opt,
        displayMode: mode,
        color: String(s?.color || safeColors.series[idx % safeColors.series.length] || DEFAULT_COLORS.series[0]),
        visible: typeof s?.visible === "boolean" ? s.visible : true,
        label,
      }
    })

    if (safeSeries.length === 0) {
      const dt = normalizeLegacyDataType((w as any)?.dataType ?? DataType.TOTAL_ITEMS) as DataType
      const options = getDataOptionsForType(dt)
      const opt = options[0]?.value ?? ""
      safeSeries.push({
        dataType: dt,
        dataOption: opt,
        displayMode: clampFormatToAllowed(dt, opt, (w.displayMode ?? inferDisplayMode(dt)) as any),
        color: safeColors.series[0] || DEFAULT_COLORS.series[0],
        visible: true,
        label: getMetricLabel(dt, "Series 1"),
      })
    }

    return {
      ...w,
      type: unifiedType,
      dataType: widgetDt,
      cardComparisonTarget: getCardComparisonOptions(widgetDt).some((option) => option.value === (w as any)?.cardComparisonTarget)
        ? (w as any).cardComparisonTarget
        : "none",
      colors: safeColors,
      dataSeries: safeSeries,
      dataConfigMode: (w as any)?.dataConfigMode || "series",
      breakdownBy: (w as any)?.breakdownBy || breakdownOptions[0]?.value,
    }
  }

  useEffect(() => {
    if (widget) {
      setSettings(normalizeWidgetForDialog({ ...widget }))
      setTitleManuallyEdited(false)
    }
  }, [widget])

  const hideTabsForCard = settings?.type === WidgetType.CARD

  useEffect(() => {
    if (hideTabsForCard) setTabValue(0)
  }, [hideTabsForCard])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleChange = (field: keyof WidgetSettings, value: any) => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      if (field === "title") {
        setTitleManuallyEdited(true)
      }

      // Keep Card widgets' primary series in sync with selected data + options.
      if (field === "dataType" && prev.type === WidgetType.CARD) {
        const nextDt = normalizeLegacyDataType(value) as DataType
        const options = getDataOptionsForType(nextDt)
        const nextOpt = options[0]?.value ?? ""
        const nextComparisonOptions = getCardComparisonOptions(nextDt)
        const nextComparison =
          nextComparisonOptions.find((option) => option.value === ((prev as any)?.cardComparisonTarget || "none"))?.value || "none"
        const nextSeries: DataSeries = {
          ...(prev.dataSeries?.[0] || ({} as any)),
          dataType: nextDt,
          dataOption: nextOpt,
          displayMode: clampFormatToAllowed(nextDt, nextOpt, prev.dataSeries?.[0]?.displayMode as any),
          color: prev.dataSeries?.[0]?.color || prev.colors?.series?.[0] || DEFAULT_COLORS.series[0],
          visible: true,
          label: prev.dataSeries?.[0]?.label || getMetricLabel(nextDt, "Series 1"),
        }
        return {
          ...prev,
          dataType: nextDt,
          cardComparisonTarget: nextComparison,
          dataSeries: [nextSeries],
        }
      }

      // Special handling for widget type changes
      if (field === "type") {
        const newSettings = { ...prev, [field]: value }

        // Set appropriate defaults based on widget type
        switch (value) {
          case WidgetType.CARD:
          case WidgetType.STAT: // legacy
          case WidgetType.DASHBOARD_CARD: // legacy
            newSettings.minW = 3
            newSettings.minH = 2
            newSettings.width = Math.max(newSettings.width, 300)
            newSettings.height = Math.max(newSettings.height, 200)
            break

          case WidgetType.BAR_CHART:
          case WidgetType.LINE_CHART:
          case WidgetType.PIE_CHART:
            newSettings.minW = 4
            newSettings.minH = 3
            newSettings.width = Math.max(newSettings.width, 420)
            newSettings.height = Math.max(newSettings.height, 320)
            newSettings.dataConfigMode = (newSettings as any)?.dataConfigMode || "series"
            newSettings.breakdownBy = (newSettings as any)?.breakdownBy || breakdownOptions[0]?.value
            break

          case WidgetType.TABLE:
            newSettings.minW = 6
            newSettings.minH = 4
            newSettings.width = Math.max(newSettings.width, 650)
            newSettings.height = Math.max(newSettings.height, 420)
            newSettings.dataConfigMode = (newSettings as any)?.dataConfigMode || "series"
            newSettings.breakdownBy = (newSettings as any)?.breakdownBy || breakdownOptions[0]?.value
            break
        }

        return newSettings
      }

      return { ...prev, [field]: value }
    })
  }

  // In create mode, auto-title Card widgets from the selected data type
  useEffect(() => {
    if (!settings) return
    if (mode !== "create") return
    if (settings.type !== WidgetType.CARD) return
    if (titleManuallyEdited) return
    const label = cardPool.find((d) => String(d.value) === String(settings.dataType || ""))?.label
    if (!label) return
    if (settings.title === label) return
    setSettings((prev) => (prev ? { ...prev, title: label } : prev))
  }, [mode, settings?.type, settings?.dataType, titleManuallyEdited, cardPool])

  const handleColorChange = (colorField: string, color: string) => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      const newColors = { ...prev.colors }

      return {
        ...prev,
        colors: {
          ...newColors,
          [colorField as keyof typeof newColors]: color,
        },
      }
    })
  }

  const handleDataSeriesChange = (index: number, field: keyof DataSeries, value: any) => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      const newSeries = [...prev.dataSeries]
      const before = newSeries[index] || ({} as any)
      const next: any = { ...before, [field]: value }

      if (field === "dataType") {
        const dt = normalizeLegacyDataType(next.dataType) as DataType
        const opts = getDataOptionsForType(dt)
        const nextOpt = typeof next.dataOption === "string" ? next.dataOption : (opts[0]?.value ?? "")
        next.dataOption = nextOpt

        // Auto-update Data Format only if it was on the inferred/default.
        const prevDefault = clampFormatToAllowed(before.dataType, before.dataOption, before.displayMode)
        const isAutoFormat = !before.displayMode || before.displayMode === prevDefault
        if (isAutoFormat) {
          next.displayMode = clampFormatToAllowed(dt, nextOpt, next.displayMode)
        } else {
          next.displayMode = clampFormatToAllowed(dt, nextOpt, next.displayMode)
        }

        // Auto-update label if it was still "auto".
        const prevBase = getMetricLabel(before.dataType, String(before.dataType || ""))
        const prevOptLabel = getDataOptionsForType(before.dataType)?.find((o) => o.value === before.dataOption)?.label
        const prevAutoLabel = prevOptLabel ? `${prevBase} - ${prevOptLabel}` : prevBase
        const wasAutoLabel =
          !before.label || String(before.label).trim() === "" || String(before.label) === `Series ${index + 1}` || String(before.label) === prevAutoLabel

        if (wasAutoLabel) {
          const base = getMetricLabel(dt, String(dt))
          const optLabel = opts.find((o) => o.value === nextOpt)?.label
          next.label = optLabel ? `${base} - ${optLabel}` : base
        }
      }

      if (field === "dataOption") {
        const dt = normalizeLegacyDataType(next.dataType) as DataType
        const opts = getDataOptionsForType(dt)
        const opt = typeof next.dataOption === "string" ? next.dataOption : (opts[0]?.value ?? "")
        next.dataOption = opt
        next.displayMode = clampFormatToAllowed(dt, opt, next.displayMode)

        const base = getMetricLabel(dt, String(dt))
        const prevOptLabel = opts.find((o) => o.value === before.dataOption)?.label
        const prevAutoLabel = prevOptLabel ? `${base} - ${prevOptLabel}` : base
        const wasAutoLabel =
          !before.label || String(before.label).trim() === "" || String(before.label) === `Series ${index + 1}` || String(before.label) === prevAutoLabel

        if (wasAutoLabel) {
          const optLabel = opts.find((o) => o.value === opt)?.label
          next.label = optLabel ? `${base} - ${optLabel}` : base
        }
      }

      if (field === "displayMode") {
        next.displayMode = clampFormatToAllowed(next.dataType, next.dataOption, next.displayMode)
      }

      newSeries[index] = next

      return { ...prev, dataSeries: newSeries }
    })
  }

  const handleAddSeries = () => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      const newSeries = [...prev.dataSeries]
      const defaultColor = prev.colors.series[newSeries.length % prev.colors.series.length] || "#4CAF50"
      const dt = normalizeLegacyDataType(seriesPool[0]?.value || prev.dataType || DataType.TOTAL_ITEMS) as DataType
      const opts = getDataOptionsForType(dt)
      const opt = opts[0]?.value ?? ""

      newSeries.push({
        dataType: dt,
        dataOption: opt,
        displayMode: clampFormatToAllowed(dt, opt, inferDisplayMode(dt)),
        color: defaultColor,
        visible: true,
        label: getMetricLabel(dt, `Series ${newSeries.length + 1}`),
      })

      return { ...prev, dataSeries: newSeries }
    })
  }

  const handleRemoveSeries = (index: number) => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      const newSeries = [...prev.dataSeries]
      newSeries.splice(index, 1)

      // Ensure we always have at least one data series
      if (newSeries.length === 0) {
        const defaultColor = prev.colors.series[0] || "#4CAF50"
        const dt = normalizeLegacyDataType(seriesPool[0]?.value || prev.dataType || DataType.TOTAL_ITEMS) as DataType
        const opts = getDataOptionsForType(dt)
        const opt = opts[0]?.value ?? ""
        newSeries.push({
          dataType: dt,
          dataOption: opt,
          displayMode: clampFormatToAllowed(dt, opt, inferDisplayMode(dt)),
          color: defaultColor,
          visible: true,
          label: getMetricLabel(dt, "Series 1"),
        })
      }

      return { ...prev, dataSeries: newSeries }
    })
  }

  const handleToggleSeriesVisibility = (index: number) => {
    if (!settings) return

    setSettings((prev) => {
      if (!prev) return null

      const newSeries = [...prev.dataSeries]
      newSeries[index] = { ...newSeries[index], visible: !newSeries[index].visible }

      return { ...prev, dataSeries: newSeries }
    })
  }

  const handleSave = async () => {
    if (settings) {
      await onSave(settings)
    }
  }

  if (!settings) return null

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "widgetSettingsDialogModal1",
            crudMode: mode,
          }}
          title={mode === "create" ? "Create Widget" : "Widget Settings"}
          icon={<SettingsIcon />}
          mode={mode}
          onSave={async (...args) => {
            const __workspaceOnSave = handleSave
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "widgetSettingsDialogModal1",
              crudMode: mode,
            })
            return result
          }}
          saveButtonText={mode === "create" ? "Create Widget" : "Save Changes"}
          maxWidth="md"
        >
      {!hideTabsForCard && (
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="widget settings tabs"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            mb: 3,
          }}
        >
          <Tab label="General & Appearance" />
          <Tab label="Data Configuration" />
        </Tabs>
      )}

      <Box>
        <TabPanel value={tabValue} index={0}>
          <Box>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Widget Title"
                value={settings.title}
                onChange={(e) => handleChange("title", e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={settings.type === WidgetType.CARD ? 6 : 12}>
              <FormControl fullWidth variant="outlined">
                    <InputLabel>Widget Type</InputLabel>
                <Select
                  value={settings.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                      label="Widget Type"
                    >
                      <MenuItem value={WidgetType.CARD}>
                        <Box>
                          <Typography variant="body1">🪪 Card</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value={WidgetType.BAR_CHART}>
                        <Box>
                          <Typography variant="body1">📊 Bar Chart</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value={WidgetType.LINE_CHART}>
                        <Box>
                          <Typography variant="body1">📈 Line Chart</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value={WidgetType.PIE_CHART}>
                        <Box>
                          <Typography variant="body1">🥧 Pie Chart</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value={WidgetType.MULTIPLE_SERIES_LINE_CHART}>
                        <Box>
                          <Typography variant="body1">📈 Multi-Line Chart</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value={WidgetType.TABLE}>
                        <Box>
                          <Typography variant="body1">📋 Data Table</Typography>
                        </Box>
                      </MenuItem>
                </Select>
              </FormControl>
                </Grid>
                
                {settings.type === WidgetType.CARD && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Data</InputLabel>
                      <Select
                        value={settings.dataType || ""}
                        onChange={(e) => handleChange("dataType", e.target.value)}
                        label="Data"
                      >
                        {cardPool.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {settings.type === WidgetType.CARD && getDataOptionsForType(settings.dataType as any).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Option</InputLabel>
                      <Select
                        value={String(settings.dataSeries?.[0]?.dataOption || "")}
                        onChange={(e) => handleDataSeriesChange(0, "dataOption", e.target.value)}
                        label="Option"
                      >
                        {getDataOptionsForType(settings.dataType as any).map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {settings.type === WidgetType.CARD && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" disabled={(settings as any)?.dataConfigMode !== "breakdown"}>
                      <InputLabel>Breakdown</InputLabel>
                      <Select
                        value={(settings as any)?.breakdownBy || breakdownOptions[0]?.value || ""}
                        onChange={(e) => handleChange("breakdownBy" as any, e.target.value)}
                        label="Breakdown"
                      >
                        {breakdownOptions.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {settings.type === WidgetType.CARD && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={(settings as any)?.dataConfigMode === "breakdown"}
                          onChange={(e) => {
                            const enabled = e.target.checked
                            setSettings((prev) => {
                              if (!prev) return null
                              const next: any = { ...prev }
                              next.dataConfigMode = enabled ? "breakdown" : "series"
                              if (enabled) {
                                next.breakdownBy = next.breakdownBy || breakdownOptions[0]?.value
                                next.dataSeries = Array.isArray(next.dataSeries) && next.dataSeries.length > 0 ? [next.dataSeries[0]] : next.dataSeries
                              }
                              return next
                            })
                          }}
                        />
                      }
                      label="Breakdown specific data"
                      sx={{ ml: 0 }}
                    />
                  </Grid>
                )}

                {settings.type === WidgetType.CARD && inferModule() === "finance" && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Variance</InputLabel>
                      <Select
                        value={(settings as any).cardComparisonTarget || "none"}
                        onChange={(e) => handleChange("cardComparisonTarget" as any, e.target.value)}
                        label="Variance"
                      >
                        {getCardComparisonOptions(settings.dataType as any).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
            </Grid>

            {/* Appearance Section */}
            <Box sx={{ pt: 3, borderTop: 1, borderColor: "divider" }}>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <ColorSelect
                    label="Background"
                    value={settings.colors.background}
                    onChange={(c) => handleColorChange("background", c)}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ColorSelect
                    label="Border"
                    value={settings.colors.border}
                    onChange={(c) => handleColorChange("border", c)}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ColorSelect
                    label="Text"
                    value={settings.colors.text}
                    onChange={(c) => handleColorChange("text", c)}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ColorSelect
                    label="Title"
                    value={settings.colors.title || settings.colors.text}
                    onChange={(c) => handleColorChange("title", c)}
                    size="small"
                    variant="outlined"
                  />
                </Grid>

                {/* Series colors are configured per-series in the Data tab. */}
          </Grid>
            </Box>
          </Box>
        </TabPanel>

        {!hideTabsForCard && (
        <TabPanel value={tabValue} index={1}>
          {/* Stat Cards and Dashboard Cards - Simple single data source */}
          {/* Charts / Table - Can have multiple data series */}
          {(settings.type === WidgetType.BAR_CHART ||
            settings.type === WidgetType.LINE_CHART ||
            settings.type === WidgetType.PIE_CHART ||
            settings.type === WidgetType.TABLE) && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Data Series ({settings.dataSeries.length})
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth variant="outlined" size="small" disabled={(settings as any)?.dataConfigMode !== "breakdown"}>
                    <InputLabel>Breakdown</InputLabel>
                    <Select
                      value={(settings as any)?.breakdownBy || breakdownOptions[0]?.value || ""}
                      onChange={(e) => handleChange("breakdownBy" as any, e.target.value)}
                      label="Breakdown"
                    >
                      {breakdownOptions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: "flex", alignItems: "center" }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={(settings as any)?.dataConfigMode === "breakdown"}
                        onChange={(e) => {
                          const enabled = e.target.checked
                          setSettings((prev) => {
                            if (!prev) return null
                            const next: any = { ...prev }
                            next.dataConfigMode = enabled ? "breakdown" : "series"
                            if (enabled) {
                              next.breakdownBy = next.breakdownBy || breakdownOptions[0]?.value
                              next.dataSeries = Array.isArray(next.dataSeries) && next.dataSeries.length > 0 ? [next.dataSeries[0]] : next.dataSeries
                            }
                            return next
                          })
                        }}
                      />
                    }
                    label="Breakdown specific data"
                    sx={{ ml: 0 }}
                  />
                </Grid>
              </Grid>

              {(settings.dataSeries || []).map((series, index) => {
                const options = getDataOptionsForType(series.dataType)
                const allowed = allowedFormatsFor(series.dataType, (series as any)?.dataOption)
                return (
                  <Box
                    key={`${String((series as any)?.dataType || "series")}-${index}-${String((series as any)?.dataOption || "none")}`}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                        Series {index + 1}:
                      </Typography>
                      <TextField
                        label="Label"
                        value={series.label || ""}
                        onChange={(e) => handleDataSeriesChange(index, "label", e.target.value)}
                        size="small"
                        fullWidth
                      />
                      {settings.dataSeries.length > 1 && (settings as any)?.dataConfigMode !== "breakdown" && (
                        <Tooltip title="Remove series">
                          <IconButton size="small" onClick={() => handleRemoveSeries(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={options.length > 0 ? 4 : 5}>
                        <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel>Data</InputLabel>
                          <Select
                            value={series.dataType}
                            onChange={(e) => handleDataSeriesChange(index, "dataType", e.target.value)}
                            label="Data"
                          >
                            {seriesPool.map((t) => (
                              <MenuItem key={t.value} value={t.value}>
                                {t.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {options.length > 0 && (
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth variant="outlined" size="small">
                            <InputLabel>Data Option</InputLabel>
                            <Select
                              value={(series as any)?.dataOption || options[0]?.value || ""}
                              onChange={(e) => handleDataSeriesChange(index, "dataOption" as any, e.target.value)}
                              label="Data Option"
                            >
                              {options.map((o) => (
                                <MenuItem key={o.value} value={o.value}>
                                  {o.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}

                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel>Data Format</InputLabel>
                          <Select
                            value={series.displayMode}
                            onChange={(e) => handleDataSeriesChange(index, "displayMode", e.target.value)}
                            label="Data Format"
                          >
                            {allowed.includes("price") && <MenuItem value="price">Currency</MenuItem>}
                            {allowed.includes("quantity") && <MenuItem value="quantity">Number</MenuItem>}
                            {allowed.includes("percentage") && <MenuItem value="percentage">Percentage</MenuItem>}
                            {allowed.includes("score") && <MenuItem value="score">Score</MenuItem>}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={options.length > 0 ? 2 : 4}>
                        <ColorSelect
                          label="Color"
                          value={series.color || themeConfig.brandColors.navy}
                          onChange={(c) => handleDataSeriesChange(index, "color", c)}
                          size="small"
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )
              })}

              {(settings as any)?.dataConfigMode !== "breakdown" && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Button startIcon={<AddIcon />} onClick={handleAddSeries} variant="outlined">
                    Add Series
                  </Button>
                </Box>
              )}
                </Box>
            )}
        </TabPanel>
        )}

        {settings.type === WidgetType.CARD && (
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Tooltip key="no-icon" title="No icon">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid",
                    borderColor: !settings.icon ? themeConfig.brandColors.navy : "divider",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: !settings.icon ? "primary.light" : "transparent",
                    "&:hover": {
                      backgroundColor: !settings.icon ? "primary.light" : "action.hover",
                    },
                  }}
                  onClick={() => handleChange("icon", undefined)}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    None
                  </Typography>
                </Box>
              </Tooltip>
              {availableIcons.map((iconName) => (
                <Tooltip key={iconName} title={iconName.split(":")[1]}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid",
                      borderColor: settings.icon === iconName ? themeConfig.brandColors.navy : "divider",
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor: settings.icon === iconName ? "primary.light" : "transparent",
                      "&:hover": {
                        backgroundColor: settings.icon === iconName ? "primary.light" : "action.hover",
                      },
                    }}
                    onClick={() => handleChange("icon", iconName)}
                  >
                    <Icon icon={iconName} style={{ fontSize: "24px" }} />
                  </Box>
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </CRUDModal>
  )
}

export default WidgetSettingsDialog
