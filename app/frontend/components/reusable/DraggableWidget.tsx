"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Paper, Box, Typography, IconButton } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import SettingsIcon from "@mui/icons-material/Settings"
import DragIndicatorIcon from "@mui/icons-material/DragIndicator"
import { Rnd } from "react-rnd"
import DynamicWidget from "./DynamicWidget"
import WidgetSettingsDialog from "./WidgetSettingsDialog"
import WidgetContextMenu from "./WidgetContextMenu"
import type { WidgetSettings } from "../../types/WidgetTypes"

interface DraggableWidgetProps {
  widget: WidgetSettings
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<WidgetSettings>) => void
  onSaveLayout: () => void
  isMobile: boolean
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({ widget, onRemove, onUpdate, onSaveLayout, isMobile }) => {
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
  } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  // --------- Safety: ensure numeric layout values ---------
  // Old/partial layouts can have undefined minW/minH/w/h/x/y which would turn into NaN and break react-rnd sizing.
  const safeNumber = (value: unknown, fallback: number): number => {
    const n = typeof value === "number" ? value : Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  // Calculate grid size based on container width
  const gridSize = 20 // Size of each grid cell in pixels
  const containerWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth - 48 // Approximate container width
  const cols = Math.floor(containerWidth / gridSize)

  // Handle context menu (right click)
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX,
            mouseY: event.clientY,
          }
        : null,
    )
  }

  // Handle touch start for long press detection
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      // Get touch position
      if (widgetRef.current) {
        const rect = widgetRef.current.getBoundingClientRect()
        setContextMenu({
          mouseX: rect.left + rect.width / 2,
          mouseY: rect.top + rect.height / 2,
        })
      }
    }, 800) // 800ms long press
    setLongPressTimer(timer)
  }

  // Handle touch end to clear long press timer
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Handle touch move to cancel long press
  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Close context menu
  const handleClose = () => {
    setContextMenu(null)
  }

  // Handle widget removal
  const handleRemove = () => {
    onRemove(widget.id)
    handleClose()
  }

  // Handle widget settings
  const handleOpenSettings = () => {
    setShowSettings(true)
    handleClose()
  }

  // Handle widget settings update
  const handleSettingsUpdate = (updates: Partial<WidgetSettings>) => {
    onUpdate(widget.id, updates)
    setShowSettings(false)
  }

  // Snap to grid function
  const snapToGrid = (value: number, gridSize: number): number => {
    return Math.round(value / gridSize) * gridSize
  }

  // Calculate widget dimensions based on grid
  const minWCells = Math.max(1, Math.floor(safeNumber(widget.minW, 4)))
  const minHCells = Math.max(1, Math.floor(safeNumber(widget.minH, 3)))
  const wCells = Math.max(minWCells, Math.floor(safeNumber(widget.w, minWCells)))
  const hCells = Math.max(minHCells, Math.floor(safeNumber(widget.h, minHCells)))
  const xCells = Math.max(0, Math.floor(safeNumber(widget.x, 0)))
  const yCells = Math.max(0, Math.floor(safeNumber(widget.y, 0)))

  const widgetWidth = wCells * gridSize
  const widgetHeight = hCells * gridSize
  const widgetX = xCells * gridSize
  const widgetY = yCells * gridSize



  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  return (
    <>
      <Rnd
        size={{ width: widgetWidth, height: widgetHeight }}
        position={{ x: widgetX, y: widgetY }}
        onDragStart={() => setIsDragging(true)}
        onDragStop={(_e, d) => {
          setIsDragging(false)
          const newX = snapToGrid(d.x, gridSize)
          const newY = snapToGrid(d.y, gridSize)

          // Ensure widget stays within container bounds
          const maxX = (cols - wCells) * gridSize
          const boundedX = Math.max(0, Math.min(newX, maxX))

          onUpdate(widget.id, {
            x: boundedX / gridSize,
            y: newY / gridSize,
          })
          onSaveLayout()
        }}
        onResizeStart={() => setIsResizing(true)}
        onResizeStop={(_e, _direction, ref, _delta, position) => {
          setIsResizing(false)
          const newWidth = snapToGrid(Number.parseInt(ref.style.width), gridSize)
          const newHeight = snapToGrid(Number.parseInt(ref.style.height), gridSize)
          const newX = snapToGrid(position.x, gridSize)
          const newY = snapToGrid(position.y, gridSize)

          // Ensure widget stays within container bounds
          const maxX = (cols - Math.ceil(newWidth / gridSize)) * gridSize
          const boundedX = Math.max(0, Math.min(newX, maxX))

          // Ensure minimum dimensions
          const minWidth = minWCells * gridSize
          const minHeight = minHCells * gridSize
          const finalWidth = Math.max(minWidth, newWidth)
          const finalHeight = Math.max(minHeight, newHeight)

          onUpdate(widget.id, {
            w: finalWidth / gridSize,
            h: finalHeight / gridSize,
            x: boundedX / gridSize,
            y: newY / gridSize,
          })
          onSaveLayout()
        }}
        dragHandleClassName="drag-handle"
        resizeHandleStyles={{
          bottomRight: { cursor: "nwse-resize" },
          bottomLeft: { cursor: "nesw-resize" },
          topRight: { cursor: "nesw-resize" },
          topLeft: { cursor: "nwse-resize" },
        }}
        bounds="parent"
        minWidth={minWCells * gridSize}
        minHeight={minHCells * gridSize}
        maxWidth={cols * gridSize}
        disableDragging={isMobile}
      >
        <Paper
          ref={widgetRef}
          elevation={3}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            opacity: isDragging || isResizing ? 0.7 : 1,
            transition: "opacity 0.2s",
          }}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <Box
            className="drag-handle"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
              cursor: "move",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <DragIndicatorIcon sx={{ mr: 1, color: "text.secondary" }} />
              <Typography variant="subtitle2" noWrap>
                {widget.title}
              </Typography>
            </Box>
            <Box>
              <IconButton size="small" onClick={handleOpenSettings}>
                <SettingsIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onRemove(widget.id)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
            <DynamicWidget widget={widget} startDate={new Date()} endDate={new Date()} frequency="daily" data={undefined} />
          </Box>
        </Paper>
      </Rnd>

      <WidgetContextMenu
        open={contextMenu !== null}
        position={{ x: contextMenu!.mouseX, y: contextMenu!.mouseY }}
        onClose={handleClose}
        onRemove={handleRemove}
        onSettingsOpen={handleOpenSettings}
        widgetId={widget.id}
      />

      <WidgetSettingsDialog
        open={showSettings}
        widget={widget}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsUpdate}
        availableDataTypes={[
    { value: "STOCK_VALUE", label: "Stock Value" },
    { value: "SALES", label: "Sales" },
    // Add more as needed
  ]}
      />
    </>
  )
}

export default DraggableWidget
