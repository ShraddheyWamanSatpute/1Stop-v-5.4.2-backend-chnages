"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material"
import type { SelectChangeEvent } from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import { Rnd } from "react-rnd"
import { format, subDays, addDays, startOfMonth, startOfYear } from "date-fns"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers"
import DashboardHeader from "../../components/reusable/DashboardHeader"
import DynamicWidget from "../../components/reusable/DynamicWidget"
import WidgetContextMenu from "../../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../../components/reusable/WidgetSettingsDialog"
import useWidgetManager from "../../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../../hooks/useResponsiveWidgetCanvas"
import { DataType, WidgetType } from "../../types/WidgetTypes"
import { themeConfig } from "../../../theme/AppTheme"
import { useSupply } from "../../../backend/context/SupplyContext"

// Grid constants (match other dashboards)
const GRID_CELL_SIZE = 20

const SupplyDashboard: React.FC = () => {
  const theme = useTheme()
  const { state: supplyState } = useSupply()

  const [isEditing, setIsEditing] = useState(false)
  const [showGrid, setShowGrid] = useState(false)

  const [widgetDialogMode, setWidgetDialogMode] = useState<"create" | "edit">("edit")
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState<string | null>(null)

  const [selectedDateRange, setSelectedDateRange] = useState<string>("last30days")
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: subDays(new Date(), 29),
    endDate: new Date(),
  })
  const [frequency, setFrequency] = useState<string>("daily")

  const [clearWidgetsDialogOpen, setClearWidgetsDialogOpen] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; widgetId: string } | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [currentWidgetSettings, setCurrentWidgetSettings] = useState<any>(null)

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
  } = useWidgetManager("supply")

  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  const supplySnapshot = useMemo(() => {
    const clients = supplyState.clients || []
    const orders = supplyState.orders || []
    const deliveries = supplyState.deliveries || []
    return {
      clients,
      orders,
      deliveries,
      ordersDraftCount: orders.filter((o: any) => o.status === "draft").length,
      deliveriesInTransitCount: deliveries.filter((d: any) => d.status === "in_transit").length,
    }
  }, [supplyState.clients, supplyState.orders, supplyState.deliveries])

  // Deterministic-ish series generator (stable per widget + company path)
  const seedKey = `${supplyState.supplyPath || "no-path"}|${selectedDateRange}|${frequency}`
  const hashSeed = (input: string) => {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }
  const mulberry32 = (seed: number) => {
    return () => {
      let t = (seed += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const rngFor = (key: string) => mulberry32(hashSeed(`${seedKey}|${key}`))

  const buildHistory = useCallback(
    (seriesList: Array<{ dataType: DataType; displayMode: "quantity" | "price" | "percentage" | "score" }>, baseValue: number) => {
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const step =
        frequency === "hourly" ? 1 / 24 :
        frequency === "weekly" ? 7 :
        frequency === "monthly" ? 30 :
        frequency === "quarterly" ? 90 :
        frequency === "yearly" ? 365 :
        1

      const points = Math.min(90, Math.max(7, Math.ceil(days / Math.max(step, 1))))
      const rng = rngFor(seriesList.map((s) => s.dataType).join("|"))

      return Array.from({ length: points }).map((_, i) => {
        const current = new Date(start.getTime() + i * step * 24 * 60 * 60 * 1000)
        const date = format(current, "yyyy-MM-dd")
        const row: any = { date }
        for (const s of seriesList) {
          const noise = 0.85 + rng() * 0.3 // ±15%
          const v = Math.max(0, Math.round(baseValue * noise))
          row[s.dataType] = { quantity: v, price: v }
        }
        return row
      })
    },
    [dateRange.startDate, dateRange.endDate, frequency],
  )

  const getWidgetData = useCallback(
    (widget: any) => {
      if (!widget) return { history: [] }

      const totalClients = supplySnapshot.clients.length
      const totalOrders = supplySnapshot.orders.length
      const totalDeliveries = supplySnapshot.deliveries.length
      const ordersDraft = supplySnapshot.ordersDraftCount
      const deliveriesInTransit = supplySnapshot.deliveriesInTransitCount

      const baseByType: Record<string, number> = {
        [DataType.SUPPLY_CLIENTS]: totalClients,
        [DataType.SUPPLY_ORDERS]: totalOrders,
        [DataType.SUPPLY_DELIVERIES]: totalDeliveries,
        [DataType.SUPPLY_ORDERS_DRAFT]: ordersDraft,
        [DataType.SUPPLY_DELIVERIES_IN_TRANSIT]: deliveriesInTransit,
      }

      const primary = widget.dataType as DataType | undefined
      const base = primary ? baseByType[primary] ?? 0 : 0

      const seriesList = (Array.isArray(widget.dataSeries) ? widget.dataSeries : []).map((s: any) => ({
        dataType: s.dataType as DataType,
        displayMode: (s.displayMode || "quantity") as any,
      }))

      return {
        // Stat mappings (DynamicWidget reads these for Supply DataTypes)
        totalSupplyClients: totalClients,
        totalSupplyOrders: totalOrders,
        totalSupplyDeliveries: totalDeliveries,
        supplyOrdersDraft: ordersDraft,
        supplyDeliveriesInTransit: deliveriesInTransit,

        // Time series for charts
        history: buildHistory(seriesList.length ? seriesList : (primary ? [{ dataType: primary, displayMode: "quantity" }] : []), base),
      }
    },
    [buildHistory, supplySnapshot],
  )

  const handleWidgetContextMenu = (event: React.MouseEvent, widgetId: string) => {
    if (!isEditing) return
    event.preventDefault()
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, widgetId })
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
    const newWidget = addWidget("stat" as any, DataType.SUPPLY_CLIENTS)
    setSelectedWidgetId(newWidget.id)
    setCurrentWidgetSettings(newWidget)
    setWidgetDialogMode("create")
    setPendingCreatedWidgetId(newWidget.id)
    setSettingsDialogOpen(true)
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
      case "lastMonth": {
        const lastMonthEnd = subDays(startOfMonth(today), 1)
        start = startOfMonth(lastMonthEnd)
        end = lastMonthEnd
        break
      }
      case "thisYear":
        start = startOfYear(today)
        end = today
        break
      case "lastYear": {
        const lastYearEnd = subDays(startOfYear(today), 1)
        start = startOfYear(lastYearEnd)
        end = lastYearEnd
        break
      }
      default:
        break
    }
    setDateRange({ startDate: start, endDate: end })
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency)
  }

  const supplyDataTypes = useMemo(
    () => [
      { value: DataType.SUPPLY_CLIENTS, label: "Total Clients" },
      { value: DataType.SUPPLY_ORDERS, label: "Total Orders" },
      { value: DataType.SUPPLY_DELIVERIES, label: "Total Deliveries" },
      { value: DataType.SUPPLY_ORDERS_DRAFT, label: "Draft Orders" },
      { value: DataType.SUPPLY_DELIVERIES_IN_TRANSIT, label: "Deliveries In Transit" },
    ],
    [],
  )

  return (
    <Box sx={{ width: "100%" }}>
      <DashboardHeader
        title="Supply Dashboard"
        subtitle="Supply Overview"
        canEdit
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((v) => !v)}
        onClearWidgets={() => setClearWidgetsDialogOpen(true)}
        onRevert={() => {
          void revertDashboard()
          setIsEditing(false)
        }}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        menuItems={[
          { label: "Add Widget", onClick: handleCreateWidget, permission: true },
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

      {/* Widget canvas */}
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
        {dashboardState.widgets.map((widget: any) => (
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
              <DynamicWidget widget={widget} data={getWidgetData(widget)} onSettingsOpen={handleOpenWidgetSettings} isEditing={isEditing} />
            </Box>
          </Rnd>
        ))}
          </Box>
        </Box>
      </Box>

      <WidgetContextMenu
        open={contextMenu !== null}
        position={contextMenu ? { x: contextMenu.mouseX, y: contextMenu.mouseY } : { x: 0, y: 0 }}
        onClose={() => setContextMenu(null)}
        widgetId={contextMenu?.widgetId || ""}
        onSettingsOpen={(id) => handleOpenWidgetSettings(id)}
        onRemove={() => {
          if (!contextMenu) return
          removeWidget(contextMenu.widgetId)
        }}
      />

      <WidgetSettingsDialog
        open={settingsDialogOpen}
        onClose={handleCloseWidgetDialog}
        widget={currentWidgetSettings}
        onSave={handleSaveWidgetSettings}
        availableDataTypes={supplyDataTypes as any}
        cardDataTypes={supplyDataTypes as any}
        seriesDataTypes={supplyDataTypes as any}
        mode={widgetDialogMode}
      />

      {/* Custom Date Range Dialog */}
      <Dialog open={customDateDialogOpen} onClose={() => setCustomDateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(d) => d && setDateRange((prev) => ({ ...prev, startDate: d }))}
              />
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(d) => d && setDateRange((prev) => ({ ...prev, endDate: d }))}
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

      {/* Clear Widgets Confirmation Dialog */}
      <Dialog open={clearWidgetsDialogOpen} onClose={() => setClearWidgetsDialogOpen(false)}>
        <DialogTitle>Clear All Widgets</DialogTitle>
        <DialogContent>
          <Typography>Remove all widgets from this dashboard? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearWidgetsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              clearAllWidgets()
              setClearWidgetsDialogOpen(false)
            }}
            variant="contained"
            color="error"
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SupplyDashboard

