import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react"
import { useTheme } from "@mui/material/styles"
import { useLocation } from "react-router-dom"
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  Search as SearchIcon
} from "@mui/icons-material"

import { useBookings as useBookingsContext, FloorPlan, TableElement, Table as BookingTable } from "../../../backend/context/BookingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import DataHeader from "../reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import { exportReportContainerToCsv, exportReportContainerToPdf } from "../../utils/reportExport"

// Table Edit Form Component
interface TableEditFormProps {
  table: TableElement | null
  onSave: (data: Partial<TableElement>) => void
  onCancel: () => void
}

const TableEditForm: React.FC<TableEditFormProps> = ({ table, onSave, onCancel }) => {
  const location = useLocation()
  const [formData, setFormData] = useState({
    name: table?.name || '',
    seats: table?.seats || 4,
    shape: table?.shape || 'Round',
    width: table?.width || 45,
    height: table?.height || 45,
    color: table?.color || '#ffffff',
    borderColor: table?.borderColor || '#000000',
    borderWidth: table?.borderWidth || 2,
    textColor: table?.textColor || '#000000',
    textSize: table?.textSize || 8
  })

  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name || '',
        seats: table.seats || 4,
        shape: table.shape || 'Round',
        width: table.width || 45,
        height: table.height || 45,
        color: table.color || '#ffffff',
        borderColor: table.borderColor || '#000000',
        borderWidth: table.borderWidth || 2,
        textColor: table.textColor || '#000000',
        textSize: table.textSize || 8
      })
    }
  }, [table])

  const handleSubmit = () => {
    onSave(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Table Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Seats"
            type="number"
            value={formData.seats}
            onChange={(e) => handleChange('seats', Number(e.target.value))}
            fullWidth
            inputProps={{ min: 1, max: 20 }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Shape</InputLabel>
            <Select
              value={formData.shape}
              onChange={(e: any) => handleChange('shape', e.target.value)}
              label="Shape"
            >
              <MenuItem value="Round">Round</MenuItem>
              <MenuItem value="Square">Square</MenuItem>
              <MenuItem value="Rectangle">Rectangle</MenuItem>
              <MenuItem value="Diamond">Diamond</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Width (px)"
            type="number"
            value={formData.width}
            onChange={(e) => handleChange('width', Number(e.target.value))}
            fullWidth
            inputProps={{ min: 20, max: 200 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Height (px)"
            type="number"
            value={formData.height}
            onChange={(e) => handleChange('height', Number(e.target.value))}
            fullWidth
            inputProps={{ min: 20, max: 200 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Background Color"
            type="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Border Color"
            type="color"
            value={formData.borderColor}
            onChange={(e) => handleChange('borderColor', e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Border Width (px)"
            type="number"
            value={formData.borderWidth}
            onChange={(e) => handleChange('borderWidth', Number(e.target.value))}
            fullWidth
            inputProps={{ min: 1, max: 10 }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Text Size (px)"
            type="number"
            value={formData.textSize}
            onChange={(e) => handleChange('textSize', Number(e.target.value))}
            fullWidth
            inputProps={{ min: 6, max: 20 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Text Color"
            type="color"
            value={formData.textColor}
            onChange={(e) => handleChange('textColor', e.target.value)}
            fullWidth
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save Changes</Button>
      </Box>
    </Box>
  )
}

// Floor Plan Form Component
interface FloorPlanFormProps {
  floorPlan?: FloorPlan | null
  mode: 'create' | 'edit' | 'view'
  tableSearchTerm: string
  setTableSearchTerm: (term: string) => void
  // Booking-related props
  bookings?: any[]
  selectedDate?: string // Add selectedDate prop for date filtering
  onBookingUpdate?: (bookingId: string, updates: any) => Promise<void>
  onBookingClick?: (booking: any) => void
}

interface FloorPlanFormRef {
  submit: () => void
}

const FloorPlanForm = forwardRef<FloorPlanFormRef, FloorPlanFormProps>(({ 
  floorPlan, 
  mode, 
  tableSearchTerm, 
  setTableSearchTerm,
  bookings = [],
  selectedDate,
  onBookingUpdate,
  onBookingClick 
}, ref) => {
  const { 
    tables: contextTables, 
    bookings: contextBookings = [],
    updateBooking: contextUpdateBooking,
    fetchTables,
    fetchBookings,
    fetchBookingTypes,
    fetchBookingStatuses,
    bookingTypes: contextBookingTypes = [],
    bookingStatuses: contextBookingStatuses = [],
    subsiteID
  } = useBookingsContext()
  const theme = useTheme()
  
  // Get company context for fallback subsiteID
  const { state: companyState } = useCompany()
  
  // Use context data as fallback when props are not provided
  // Always prefer context bookings for real-time updates, fallback to props if context is empty
  const rawBookings = contextBookings.length > 0 ? contextBookings : bookings
  
  // Filter bookings by selected date if provided
  const actualBookings = useMemo(() => {
    if (!selectedDate) {
      return rawBookings
    }
    
    const filtered = rawBookings.filter(booking => {
      // Convert booking date to YYYY-MM-DD format for comparison
      const bookingDate = booking.date || booking.arrivalDate
      if (!bookingDate) {
        return false
      }
      
      // Handle different date formats
      let normalizedBookingDate: string
      if (bookingDate instanceof Date) {
        normalizedBookingDate = bookingDate.toISOString().split('T')[0]
      } else if (typeof bookingDate === 'string') {
        // Handle various string formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
        const date = new Date(bookingDate)
        normalizedBookingDate = date.toISOString().split('T')[0]
      } else {
        return false
      }
      
      // Normalize selected date
      const normalizedSelectedDate = new Date(selectedDate).toISOString().split('T')[0]
      
      return normalizedBookingDate === normalizedSelectedDate
    })
    
    return filtered
  }, [rawBookings, selectedDate])
  
  const actualOnBookingUpdate = onBookingUpdate || contextUpdateBooking
  
  const [formData, setFormData] = useState({
    name: floorPlan?.name || '',
    description: floorPlan?.description || '',
    width: floorPlan?.width || 800,
    height: floorPlan?.height || 450,
    tables: floorPlan?.tables || []
  })

  // Local state for designer functionality
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(floorPlan || null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTable, setDraggedTable] = useState<TableElement | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>('')
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 })
  
  // Booking drag and drop state
  const [draggedBooking, setDraggedBooking] = useState<any | null>(null)
  const [dragOverTable, setDragOverTable] = useState<string | null>(null)
  
  // Table editing state
  const [editingTable, setEditingTable] = useState<TableElement | null>(null)
  const [tableEditDialogOpen, setTableEditDialogOpen] = useState(false)
  
  // Color maps for performance
  const [bookingTypeColorMap, setBookingTypeColorMap] = useState<Record<string, string>>({})
  const [statusColorMap, setStatusColorMap] = useState<Record<string, string>>({})
  
  // Grid dots removed for cleaner interface

  // Removed unused isReadOnly variable
  const isDesigner = mode === 'edit' || mode === 'create'

  // Fetch tables on mount
  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  // Fetch booking types and statuses
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        await fetchBookingTypes()
        await fetchBookingStatuses()
        // Note: These functions update the context state directly
        // We'll get the data from context in the FloorPlanEditor parent component
      } catch (error) {
        console.error('Error fetching booking data:', error)
      }
    }
    loadBookingData()
  }, [fetchBookingTypes, fetchBookingStatuses])

  // Update form data when floorPlan prop changes
  useEffect(() => {
    if (floorPlan) {
      setFormData({
        name: floorPlan.name || '',
        description: floorPlan.description || '',
        width: floorPlan.width || 800,
        height: floorPlan.height || 450,
        tables: floorPlan.tables || []
      })
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        width: 800,
        height: 450,
        tables: []
      })
    }
  }, [floorPlan, mode])

  // Removed handleChange function since name/description fields were removed

  // Update form data for save when needed
  useEffect(() => {
    if (mode !== 'view' && currentFloorPlan && formData.name) {
      const formDataToSave = {
        ...formData,
        width: currentFloorPlan.width || 800,
        height: currentFloorPlan.height || 450,
        layout: {
          width: currentFloorPlan.width || 800,
          height: currentFloorPlan.height || 450,
          tables: currentFloorPlan.tables || [],
          backgroundColor: "#ffffff",
          gridSize: 20
        },
        tables: currentFloorPlan.tables || []
      }
      ;(window as any).currentFloorPlanFormData = formDataToSave
    }
  }, [
    formData.name, 
    formData.description, 
    currentFloorPlan?.tables?.length, // Only trigger on table count changes, not position changes
    currentFloorPlan?.width, 
    currentFloorPlan?.height, 
    mode
  ])

  // Initialize current floor plan for editing
  useEffect(() => {
    if (floorPlan && (mode === 'edit' || mode === 'view')) {
      // Ensure tables are properly loaded from the floor plan
      const loadedFloorPlan = {
        ...floorPlan,
        tables: floorPlan.tables || floorPlan.layout?.tables || []
      }
      setCurrentFloorPlan(loadedFloorPlan)
    } else if (mode === 'create') {
      setCurrentFloorPlan({
        id: 'temp',
        name: formData.name,
        description: formData.description,
        width: 800, // Default widescreen width
        height: 450, // Default widescreen height (16:9 ratio)
        tables: []
      })
    }
  }, [floorPlan, mode])

  // Drag and drop handlers for tables
  const handleMouseDown = (e: React.MouseEvent, table: TableElement) => {
    if (!isDesigner) return
    
    e.preventDefault()
    setIsDragging(true)
    setDraggedTable(table)
    setSelectedTableId(table.id)
    
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle resizing
    if (isResizing) {
      handleResizeMove(e)
      return
    }
    
    // Handle dragging
    if (!isDragging || !draggedTable || !currentFloorPlan) return
    
    e.preventDefault()
    const canvas = e.currentTarget as HTMLElement
    const rect = canvas.getBoundingClientRect()
    
    // Calculate boundaries based on actual canvas size
    const canvasWidth = rect.width
    const canvasHeight = rect.height
    const tableWidth = draggedTable.width || 60
    const tableHeight = draggedTable.height || 60
    
    const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, canvasWidth - tableWidth))
    const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, canvasHeight - tableHeight))
    
    
    const updatedTables = (currentFloorPlan.tables || []).map(table => 
      table.id === draggedTable.id 
        ? { ...table, x: newX, y: newY }
        : table
    )
    
    setCurrentFloorPlan({
      ...currentFloorPlan,
      tables: updatedTables
    })
  }

  const handleMouseUp = () => {
    if (isResizing) {
      handleResizeEnd()
    } else {
      setIsDragging(false)
      setDraggedTable(null)
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const handleDoubleClick = (table: TableElement) => {
    if (isDesigner) {
      setEditingTable(table)
      setTableEditDialogOpen(true)
    }
  }

  const removeTableFromCanvas = (tableId: string) => {
    if (!isDesigner || !currentFloorPlan) return
    
    const updatedTables = (currentFloorPlan.tables || []).filter(t => t.id !== tableId)
    setCurrentFloorPlan({
      ...currentFloorPlan,
      tables: updatedTables
    })
  }

  const handleRightClick = (e: React.MouseEvent, table: TableElement) => {
    e.preventDefault()
    if (window.confirm(`Remove ${table.name} from canvas?`)) {
      removeTableFromCanvas(table.id)
    }
  }

  const handleTableEditSave = (updatedTableData: Partial<TableElement>) => {
    if (!editingTable || !currentFloorPlan) return

    const updatedTables = (currentFloorPlan.tables || []).map(table => 
      table.id === editingTable.id 
        ? { ...table, ...updatedTableData }
        : table
    )

    setCurrentFloorPlan({
      ...currentFloorPlan,
      tables: updatedTables
    })

    setTableEditDialogOpen(false)
    setEditingTable(null)
  }

  const handleTableEditCancel = () => {
    setTableEditDialogOpen(false)
    setEditingTable(null)
  }

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, table: TableElement, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeHandle(handle)
    setDraggedTable(table)
    setSelectedTableId(table.id)
    setResizeStartPos({ x: e.clientX, y: e.clientY })
    setResizeStartSize({ width: table.width || 45, height: table.height || 45 })
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !draggedTable || !currentFloorPlan || !resizeHandle) return
    
    e.preventDefault()
    const deltaX = e.clientX - resizeStartPos.x
    const deltaY = e.clientY - resizeStartPos.y
    
    let newWidth = resizeStartSize.width
    let newHeight = resizeStartSize.height
    
    // Calculate new size based on resize handle
    switch (resizeHandle) {
      case 'se': // Southeast corner
        newWidth = Math.max(20, resizeStartSize.width + deltaX)
        newHeight = Math.max(20, resizeStartSize.height + deltaY)
        break
      case 'sw': // Southwest corner
        newWidth = Math.max(20, resizeStartSize.width - deltaX)
        newHeight = Math.max(20, resizeStartSize.height + deltaY)
        break
      case 'ne': // Northeast corner
        newWidth = Math.max(20, resizeStartSize.width + deltaX)
        newHeight = Math.max(20, resizeStartSize.height - deltaY)
        break
      case 'nw': // Northwest corner
        newWidth = Math.max(20, resizeStartSize.width - deltaX)
        newHeight = Math.max(20, resizeStartSize.height - deltaY)
        break
      case 'e': // East edge
        newWidth = Math.max(20, resizeStartSize.width + deltaX)
        break
      case 'w': // West edge
        newWidth = Math.max(20, resizeStartSize.width - deltaX)
        break
      case 's': // South edge
        newHeight = Math.max(20, resizeStartSize.height + deltaY)
        break
      case 'n': // North edge
        newHeight = Math.max(20, resizeStartSize.height - deltaY)
        break
    }
    
    // Update table size
    const updatedTables = (currentFloorPlan.tables || []).map(table => 
      table.id === draggedTable.id 
        ? { ...table, width: newWidth, height: newHeight }
        : table
    )
    
    setCurrentFloorPlan({
      ...currentFloorPlan,
      tables: updatedTables
    })
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    setResizeHandle('')
    setDraggedTable(null)
    setResizeStartPos({ x: 0, y: 0 })
    setResizeStartSize({ width: 0, height: 0 })
  }

  // Get available tables from database, grouped by section
  const availableTables = useMemo(() => {
    return contextTables.filter(table => table.active !== false)
  }, [contextTables])

  const tablesBySection = useMemo(() => {
    const sections: Record<string, typeof contextTables> = {}
    availableTables.forEach(table => {
      const section = table.section || 'General'
      if (!sections[section]) {
        sections[section] = []
      }
      sections[section].push(table)
    })
    return sections
  }, [availableTables])

  // Booking drag and drop handlers
  const handleBookingDragStart = (e: React.DragEvent, booking: any) => {
    setDraggedBooking(booking)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", booking.id)
  }

  const handleBookingDragEnd = () => {
    setDraggedBooking(null)
    setDragOverTable(null)
  }

  const handleBookingDragOver = (e: React.DragEvent, tableId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverTable(tableId)
  }

  const handleBookingDragLeave = () => {
    setDragOverTable(null)
  }

  const handleBookingDrop = async (e: React.DragEvent, tableId: string) => {
    e.preventDefault()
    setDragOverTable(null)

    if (!draggedBooking || !actualOnBookingUpdate) {
      return
    }

    try {
      // Get subsiteID from context or company context as fallback
      const currentSubsiteID = subsiteID || companyState.selectedSubsiteID
      
      // Include subsiteID to prevent notification errors
      const updateData = {
        tableNumber: tableId,
        tableId: tableId,
        ...(currentSubsiteID && { subsiteId: currentSubsiteID }) // Add subsiteId if available
      }
      
      await actualOnBookingUpdate(draggedBooking.id, updateData)
      
      // Refresh bookings data to update the UI
      await fetchBookings()
    } catch (error) {
      // Error moving booking - silent fail
    }

    setDraggedBooking(null)
  }

  // Helper function to normalize colors
  const normalizeColor = (color: string): string => {
    if (!color) return theme.palette.primary.main
    if (color.startsWith('#')) return color
    if (color.startsWith('rgb')) return color
    return `#${color}`
  }

  // Get booking type color from database
  const getBookingTypeColor = useCallback((booking: any) => {
    if (!booking.bookingType) return theme.palette.primary.light

    // Use the color map for direct lookup
    if (bookingTypeColorMap[booking.bookingType]) {
      return bookingTypeColorMap[booking.bookingType]
    }

    // Try to find the booking type in actual database types
    const bookingType = contextBookingTypes?.find(
      (type: any) => type.name === booking.bookingType || type.id === booking.bookingType,
    )

    if (bookingType && bookingType.color) {
      // Add to the map for future lookups
      const color = normalizeColor(bookingType.color)
      const bookingTypeKey = booking.bookingType as string
      if (bookingTypeKey) {
        setBookingTypeColorMap((prev) => ({
          ...prev,
          [bookingTypeKey]: color,
        }))
      }
      return color
    }

    // Last resort fallback
    return theme.palette.primary.light
  }, [contextBookingTypes, bookingTypeColorMap, theme.palette.primary.light])

  // Get status color from database
  const getStatusColor = useCallback((status: string | undefined) => {
    if (!status) return theme.palette.primary.main

    // Use the color map for direct lookup
    if (statusColorMap[status]) {
      return statusColorMap[status]
    }

    // Find the matching status by name
    const statusObj = contextBookingStatuses?.find((s: any) => s.name === status)

    if (statusObj && statusObj.color) {
      // Add to the map for future lookups
      const color = normalizeColor(statusObj.color)
      setStatusColorMap((prev) => ({
        ...prev,
        [status]: color,
      }))
      return color
    }

    // Fallback
    return theme.palette.primary.main
  }, [contextBookingStatuses, statusColorMap, theme.palette.primary.main])

  // Group bookings by table and sort by time
  const bookingsByTable = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    actualBookings.forEach(booking => {
      const tableId = booking.tableNumber || booking.tableId
      if (tableId) {
        if (!grouped[tableId]) {
          grouped[tableId] = []
        }
        grouped[tableId].push(booking)
      }
    })
    
    // Sort bookings by arrival time within each table
    Object.keys(grouped).forEach(tableId => {
      grouped[tableId].sort((a, b) => {
        const timeA = a.arrivalTime || '00:00'
        const timeB = b.arrivalTime || '00:00'
        return timeA.localeCompare(timeB)
      })
    })
    
    return grouped
  }, [actualBookings])

  const addTableToCanvas = (table: BookingTable) => {
    if (!isDesigner || !currentFloorPlan) return
    
    // Check if table is already on canvas
    const existingTable = (currentFloorPlan.tables || []).find(t => t.id === table.id)
    if (existingTable) return
    
    const newTableElement: TableElement = {
      id: table.id,
      name: table.name,
      seats: table.capacity,
      shape: (table.shape as "Rectangle" | "Round" | "Square" | "Custom" | "Diamond") || 'Round',
      x: 50 + (Math.random() * 100), // Add some randomness to avoid overlap
      y: 50 + (Math.random() * 100),
      width: table.width || (table.shape === 'Rectangle' ? 60 : 45),
      height: table.height || (table.shape === 'Rectangle' ? 30 : 45),
      rotation: table.rotation || 0,
      color: table.color || '#ffffff',
      borderColor: '#000000',
      borderWidth: 2,
      textColor: '#000000',
      textSize: 8
    }
    
    setCurrentFloorPlan({
      ...currentFloorPlan,
      tables: [...(currentFloorPlan.tables || []), newTableElement]
    })
  }

  // Expose submit method to parent via ref
  useImperativeHandle(ref, () => ({
    submit: () => {
      // Update form data with current table positions before saving
      if (mode !== 'view' && currentFloorPlan && formData.name) {
        const formDataToSave = {
          ...formData,
          width: currentFloorPlan.width || 800,
          height: currentFloorPlan.height || 450,
          layout: {
            width: currentFloorPlan.width || 800,
            height: currentFloorPlan.height || 450,
            tables: currentFloorPlan.tables || [],
            backgroundColor: "#ffffff",
            gridSize: 20
          },
          tables: currentFloorPlan.tables || []
        }
        ;(window as any).currentFloorPlanFormData = formDataToSave
        return true
      }
      return false
    }
  }))

  return (
    <Box 
      sx={{ p: 2, height: isDesigner ? '85vh' : 'auto', display: 'flex', flexDirection: 'column' }}
    >
      {/* Removed floor plan name and description fields per user request */}

      {/* Designer Interface - For create/edit/view */}
      {currentFloorPlan && (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, mt: 2 }}>
          {/* Left Panel - Available Tables - Only for create/edit */}
          {isDesigner && (
            <Box sx={{ width: 200, borderRight: 1, borderColor: 'divider', pr: 2, maxHeight: '70vh', overflow: 'auto' }}>
              {/* Search field for tables */}
              <TextField
                size="small"
                placeholder="Search tables..."
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                sx={{ mb: 2, width: '100%' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16 }} />
                    </InputAdornment>
                  )
                }}
              />
            {Object.entries(tablesBySection).map(([section, tables]) => {
              // Filter tables based on search term
              const filteredTables = tables.filter(table => 
                table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
              )
              
              // Only show section if it has filtered tables
              if (filteredTables.length === 0) return null
              
              return (
              <Box key={section} sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, color: themeConfig.brandColors.navy, fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {section}
                </Typography>
                {filteredTables.map((table, tableIndex) => {
                  const isOnCanvas = (Array.isArray(currentFloorPlan?.tables) ? currentFloorPlan.tables : Object.values(currentFloorPlan?.tables || {}) as TableElement[]).some(t => t.id === table.id)
                  return (
                    <Paper
                      key={`sidebar-table-${section.replace(/\s+/g, '-')}-${table.id || `fallback-${tableIndex}`}-${tableIndex}`}
                      sx={{
                        p: 0.75,
                        mb: 0.5,
                        cursor: isOnCanvas ? 'not-allowed' : 'pointer',
                        opacity: isOnCanvas ? 0.5 : 1,
                        '&:hover': !isOnCanvas ? { bgcolor: 'action.hover' } : {},
                        border: 1,
                        borderColor: isOnCanvas ? 'grey.300' : 'divider',
                        bgcolor: isOnCanvas ? 'grey.50' : 'background.paper',
                        borderRadius: 1
                      }}
                      onClick={() => !isOnCanvas && addTableToCanvas(table)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                            {table.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {table.capacity} seats
                            </Typography>
                            {table.shape && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                • {table.shape}
                              </Typography>
                            )}
                            {table.isVip && (
                              <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 'bold', fontSize: '0.65rem' }}>
                                • VIP
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {isOnCanvas && (
                          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '0.6rem' }}>
                            ✓
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            )
            })}
            {availableTables.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                No tables available. Create tables in Table Management first.
              </Typography>
            )}
          </Box>
          )}

          {/* Canvas Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isDesigner && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Drag to move • Click to select • Drag handles to resize • Right-click to remove • Double-click to edit
                </Typography>
              </Box>
            )}
            <Paper
              sx={{
                width: '100%',
                aspectRatio: '16/9', // Widescreen aspect ratio
                minWidth: '1000px',
                minHeight: '562px', // 16:9 ratio of 1000px
                position: 'relative',
                border: 2,
                borderColor: 'divider',
                bgcolor: '#f9f9f9',
                overflow: 'auto',
                cursor: isDragging ? 'grabbing' : 'default'
              }}
              onMouseMove={isDesigner ? handleMouseMove : undefined}
              onMouseUp={isDesigner ? handleMouseUp : undefined}
              onMouseLeave={isDesigner ? handleMouseUp : undefined}
            >
              {(Array.isArray(currentFloorPlan?.tables) ? currentFloorPlan.tables : Object.values(currentFloorPlan?.tables || {}) as TableElement[]).map((table, tableIndex) => {
                return (
                <Box
                  key={`canvas-table-${table.id || `fallback-${tableIndex}`}-idx-${tableIndex}`}
                  sx={{
                    position: 'absolute',
                    left: table.x,
                    top: table.y,
                    width: table.width,
                    height: table.height,
                    bgcolor: table.color || '#ffffff',
                    border: `${table.borderWidth || 2}px solid ${table.borderColor || '#000000'}`,
                    borderRadius: table.shape === 'Round' ? '50%' : table.shape === 'Square' ? 1 : 0,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    '&:hover': {
                      boxShadow: 2,
                      '& .resize-handle': {
                        opacity: 1
                      }
                    },
                    ...(selectedTableId === table.id && {
                      boxShadow: 3,
                      borderColor: themeConfig.brandColors.navy,
                      '& .resize-handle': {
                        opacity: 1
                      }
                    }),
                    ...((dragOverTable === table.id) && {
                      bgcolor: 'action.hover',
                      borderColor: themeConfig.brandColors.navy
                    })
                  }}
                  onMouseDown={isDesigner ? (e) => handleMouseDown(e, table) : undefined}
                  onDoubleClick={isDesigner ? () => handleDoubleClick(table) : undefined}
                  onContextMenu={isDesigner ? (e) => handleRightClick(e, table) : undefined}
                  onDragOver={mode === 'view' ? (e) => handleBookingDragOver(e, table.id) : undefined}
                  onDragLeave={mode === 'view' ? handleBookingDragLeave : undefined}
                  onDrop={mode === 'view' ? (e) => handleBookingDrop(e, table.id) : undefined}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ 
                      fontSize: table.textSize || 8, 
                      color: table.textColor || '#000000',
                      textAlign: 'center', 
                      lineHeight: 1 
                    }}>
                      {table.name}
                    </Typography>
                    
                    {/* Display bookings for this table */}
                    {mode === 'view' && bookingsByTable[table.id] && (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1px', 
                        width: '100%',
                        flex: 1,
                        overflow: 'hidden',
                        padding: '2px'
                      }}>
                        {bookingsByTable[table.id].map((booking: any, bookingIndex: number) => (
                          <Box
                            key={`booking-${table.id}-${booking.id}-idx-${bookingIndex}`}
                            draggable
                            onDragStart={(e) => handleBookingDragStart(e, booking)}
                            onDragEnd={handleBookingDragEnd}
                            onClick={(e) => {
                              e.stopPropagation()
                              onBookingClick?.(booking)
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '10px',
                              padding: '1px 2px',
                              height: '16px',
                              backgroundColor: getBookingTypeColor(booking), // Full booking type color for background
                              borderRadius: '2px',
                              border: 'none', // Remove border since we'll use status color for the circle
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'grab',
                              transition: 'all 0.2s ease-in-out',
                              zIndex: 9999, // Highest z-index to be in front of all components
                              position: 'relative', // Ensure z-index works
                              color: '#fff', // White text for better contrast on colored backgrounds
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)', // Text shadow for better readability
                              '&:hover': {
                                transform: 'translateX(2px)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                zIndex: 10000, // Even higher on hover
                              },
                              '&:active': {
                                cursor: 'grabbing',
                              },
                              opacity: draggedBooking?.id === booking.id ? 0.5 : 1,
                              touchAction: 'none',
                              WebkitUserSelect: 'none',
                              userSelect: 'none',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {booking.firstName} {booking.lastName} ({booking.guests || 1})
                              </span>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                              <span style={{ fontSize: '9px' }}>
                                {booking.arrivalTime}
                                {booking.endTime && ` - ${booking.endTime}`}
                              </span>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: getStatusColor(booking.status), // Use status color instead of tracking color
                                  border: 'none', // Remove any border
                                  ml: 0.5,
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease-in-out',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)', // Add subtle shadow for better visibility
                                  '&:hover': {
                                    transform: 'scale(1.2)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                  },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Handle tracking change if needed
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                  
                  {/* Resize Handles - Only in designer mode */}
                  {isDesigner && selectedTableId === table.id && (
                    <>
                      {/* Corner handles */}
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          top: -4,
                          left: -4,
                          width: 8,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'nw-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: '50%'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'nw')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 8,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'ne-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: '50%'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'ne')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          bottom: -4,
                          left: -4,
                          width: 8,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'sw-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: '50%'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'sw')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          width: 8,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'se-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: '50%'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'se')}
                      />
                      
                      {/* Edge handles */}
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          top: -2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 8,
                          height: 4,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'n-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: 1
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'n')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 8,
                          height: 4,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 's-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: 1
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 's')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          left: -2,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 4,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'w-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: 1
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'w')}
                      />
                      <Box
                        className="resize-handle"
                        sx={{
                          position: 'absolute',
                          right: -2,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 4,
                          height: 8,
                          bgcolor: themeConfig.brandColors.navy,
                          cursor: 'e-resize',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: 1
                        }}
                        onMouseDown={(e) => handleResizeStart(e, table, 'e')}
                      />
                    </>
                  )}
                </Box>
                )
              })}
              
              {(Array.isArray(currentFloorPlan?.tables) ? currentFloorPlan.tables : Object.values(currentFloorPlan?.tables || {})).length === 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Typography variant="body2">
                    {isDesigner 
                      ? "Click on table types to add them to the canvas"
                      : "No tables in this floor plan"
                    }
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}


      {/* Table Edit Dialog */}
      <Dialog open={tableEditDialogOpen} onClose={handleTableEditCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Table Properties</DialogTitle>
        <DialogContent>
          <TableEditForm
            table={editingTable}
            onSave={handleTableEditSave}
            onCancel={handleTableEditCancel}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
})

// Add display name for debugging
FloorPlanForm.displayName = 'FloorPlanForm'

interface TableLayoutDesignerProps {
  initialFloorPlan?: FloorPlan | null
  initialMode?: 'create' | 'edit' | 'view'
  onClose?: () => void
  // Booking-related props for view mode
  bookings?: any[]
  selectedDate?: string // Add selectedDate prop for date filtering
  onBookingUpdate?: (bookingId: string, updates: any) => Promise<void>
  onBookingClick?: (booking: any) => void
}

const TableLayoutDesigner: React.FC<TableLayoutDesignerProps> = ({ 
  initialFloorPlan = null, 
  initialMode = 'create',
  onClose,
  bookings = [],
  selectedDate,
  onBookingUpdate,
  onBookingClick
}) => {
  const floorPlanFormRef = useRef<FloorPlanFormRef>(null)
  const reportRef = useRef<HTMLDivElement | null>(null)
  
  const { 
    floorPlans,
    fetchFloorPlans,
    addFloorPlan,
    updateFloorPlan,
    deleteFloorPlan  } = useBookingsContext()

  // State for floor plans
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(initialFloorPlan)
  
  // Update currentFloorPlan when initialFloorPlan prop changes
  useEffect(() => {
    if (initialFloorPlan) {
      setCurrentFloorPlan(initialFloorPlan)
    }
  }, [initialFloorPlan])


  // Table view state (following TillScreensTable pattern)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState<keyof FloorPlan>('name')
  
  // Table search state for left panel
  const [tableSearchTerm, setTableSearchTerm] = useState("")

  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")


  // CRUD Modal states
  const [floorPlanFormOpen, setFloorPlanFormOpen] = useState(initialFloorPlan && initialMode !== 'view' ? true : false)
  const [floorPlanFormMode, setFloorPlanFormMode] = useState<'create' | 'edit' | 'view'>(initialMode)
  const [selectedFloorPlanForForm, setSelectedFloorPlanForForm] = useState<FloorPlan | null>(initialFloorPlan)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  

  useEffect(() => {
    fetchFloorPlans()
  }, [fetchFloorPlans])

  // Table view handlers (following TillScreensTable pattern)

  const handleRequestSort = (property: keyof FloorPlan) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Filter and sort floor plans for table view
  const filteredFloorPlans = floorPlans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const sortedFloorPlans = filteredFloorPlans.sort((a, b) => {
    const aValue = a[orderBy]
    const bValue = b[orderBy]
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return order === 'asc' ? 1 : -1
    if (bValue === undefined) return order === 'asc' ? -1 : 1
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    
    return order === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1)
  })

  const handleDeleteFloorPlan = async (floorPlanId: string) => {
    try {
      setLoading(true)
      setError(null)
      await deleteFloorPlan(floorPlanId)
      
      // If the deleted floor plan was the current one, clear it
      if (currentFloorPlan?.id === floorPlanId) {
        setCurrentFloorPlan(null)
      }
      
      setSuccess("Floor plan deleted successfully")
      await fetchFloorPlans() // Refresh the data
    } catch (err) {
      setError("Failed to delete floor plan")
    } finally {
      setLoading(false)
    }
  }

  // CRUD Modal handlers
  const handleOpenFloorPlanForm = (floorPlan: FloorPlan | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedFloorPlanForForm(floorPlan)
    setFloorPlanFormMode(mode)
    setFloorPlanFormOpen(true)
    
    // Update the main currentFloorPlan state when viewing/editing a floor plan
    if (floorPlan && (mode === 'view' || mode === 'edit')) {
      setCurrentFloorPlan(floorPlan)
    } else if (mode === 'create') {
      // Clear current floor plan when creating a new one
      setCurrentFloorPlan(null)
    }
  }

  const handleCloseFloorPlanForm = () => {
    setFloorPlanFormOpen(false)
    setSelectedFloorPlanForForm(null)
    setFloorPlanFormMode('create')
    onClose?.() // Call the onClose prop if provided
  }

  const handleSaveFloorPlanForm = useCallback(async () => {
    try {
      
      // Force trigger the form's submit method to get latest data
      if (floorPlanFormRef.current) {
        floorPlanFormRef.current.submit()
      }
      
      // Get current form data directly
      let floorPlanData = (window as any).currentFloorPlanFormData
      
      // Always use current floor plan data for tables (includes drag changes)
      if (currentFloorPlan) {
        floorPlanData = {
          ...floorPlanData,
          name: floorPlanData?.name || currentFloorPlan.name,
          description: floorPlanData?.description || currentFloorPlan.description,
          width: currentFloorPlan.width || 800,
          height: currentFloorPlan.height || 450,
          tables: currentFloorPlan.tables || [],
          layout: {
            width: currentFloorPlan.width || 800,
            height: currentFloorPlan.height || 450,
            tables: currentFloorPlan.tables || [],
            backgroundColor: "#ffffff",
            gridSize: 20
          }
        }
      }
      
      // If no form data, create it from current state
      if (!floorPlanData && selectedFloorPlanForForm) {
        floorPlanData = {
          name: selectedFloorPlanForForm.name,
          description: selectedFloorPlanForForm.description,
          width: selectedFloorPlanForForm.width || 800,
          height: selectedFloorPlanForForm.height || 450,
          tables: selectedFloorPlanForForm.tables || [],
          layout: {
            width: selectedFloorPlanForForm.width || 800,
            height: selectedFloorPlanForForm.height || 450,
            tables: selectedFloorPlanForForm.tables || [],
            backgroundColor: "#ffffff",
            gridSize: 20
          }
        }
      }
      
      
      if (!floorPlanData || !floorPlanData.name?.trim()) {
        setError("Floor plan name is required")
        return
      }

      if (floorPlanFormMode === 'create') {
        const newFloorPlanData = {
          id: `fp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate temporary ID
          name: floorPlanData.name,
          description: floorPlanData.description || '',
          width: floorPlanData.width || 800,
          height: floorPlanData.height || 450,
          layout: floorPlanData.layout || {
            width: floorPlanData.width || 800,
            height: floorPlanData.height || 450,
            tables: floorPlanData.tables || [],
            backgroundColor: "#ffffff",
            gridSize: 20
          },
          tables: floorPlanData.tables || []
        }
        await addFloorPlan(newFloorPlanData)
        setSuccess("Floor plan created successfully")
      } else if (floorPlanFormMode === 'edit' && selectedFloorPlanForForm) {
        if (!selectedFloorPlanForForm.id || selectedFloorPlanForForm.id === '') {
          setError("Cannot save: Floor plan ID is missing")
          return
        }
        const updatedFloorPlanData = {
          ...selectedFloorPlanForForm,
          name: floorPlanData.name,
          description: floorPlanData.description || selectedFloorPlanForForm.description || '',
          width: floorPlanData.width || selectedFloorPlanForForm.width || 800,
          height: floorPlanData.height || selectedFloorPlanForForm.height || 450,
          layout: floorPlanData.layout || {
            width: floorPlanData.width || selectedFloorPlanForForm.width || 800,
            height: floorPlanData.height || selectedFloorPlanForForm.height || 450,
            tables: floorPlanData.tables || [],
            backgroundColor: "#ffffff",
            gridSize: 20
          },
          tables: floorPlanData.tables || []
        }
        await updateFloorPlan(selectedFloorPlanForForm.id, updatedFloorPlanData)
        setSuccess("Floor plan updated successfully")
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "tableLayoutDesignerModal1",
        crudMode: floorPlanFormMode,
        id: selectedFloorPlanForForm?.id,
        itemLabel: (window as any).currentFloorPlanFormData?.name ?? selectedFloorPlanForForm?.name,
      })
      handleCloseFloorPlanForm()
      await fetchFloorPlans() // Refresh the data
    } catch (error) {
      console.error("Error saving floor plan:", error)
      setError("Failed to save floor plan")
    }
  }, [floorPlanFormMode, selectedFloorPlanForForm?.id, currentFloorPlan, addFloorPlan, updateFloorPlan, setError, setSuccess, handleCloseFloorPlanForm, fetchFloorPlans, location.pathname])









  // Helper function to ensure tables is always an array

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'description', label: 'Description' },
    { value: 'width', label: 'Width' },
    { value: 'height', label: 'Height' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
    setOrder(direction);
    setOrderBy(field as keyof FloorPlan);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const exportWorked = format === "csv"
      ? exportReportContainerToCsv(reportRef.current, "bookings-floor-plans.csv")
      : exportReportContainerToPdf(reportRef.current, "Bookings Floor Plans", "bookings-floor-plans.pdf")

    if (!exportWorked) {
      setError("There is no floor plan table data available to export right now.")
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Data Header - Only show when not in view mode with initial floor plan */}
      {!(initialFloorPlan && initialMode === 'view') && (
        <DataHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search floor plans..."
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onExportCSV={() => handleExport('csv')}
          onExportPDF={() => handleExport('pdf')}
          onCreateNew={() => handleOpenFloorPlanForm(null, 'create')}
          createButtonLabel="Create Floor Plan"
        />
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Display */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}



      {/* Table View (following TillScreensTable pattern) - Only show when not in view mode with initial floor plan */}
      {!(initialFloorPlan && initialMode === 'view') && (
        <Paper ref={reportRef} sx={{ width: "100%", mb: 2 }}>
          <TableContainer>
            <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleRequestSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Tables</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFloorPlans.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((plan, index) => {
                  return (
                  <TableRow 
                    key={plan.id || `floor-plan-${index}`} 
                    hover
                    onClick={() => handleOpenFloorPlanForm(plan, 'view')}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <MapIcon color="primary" />
                        <Typography variant="body2">{plan.name}</Typography>
                        {plan.isDefault && <Chip label="Default" size="small" color="success" />}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {plan.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {plan.tables?.length || 0} tables
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Edit Floor Plan">
                          <span>
                            <IconButton
                              size="small" 
                              color="primary" 
                              disabled={!plan.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                plan.id && handleOpenFloorPlanForm(plan, 'edit')
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFloorPlan(plan.id)
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  )
                })}
                {sortedFloorPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <MapIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                        <Typography variant="h6" color="text.secondary">
                          No floor plans found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? "Try adjusting your search" : "Create your first floor plan to get started"}
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenFloorPlanForm(null, 'create')} sx={{ mt: 1 }}>
                          Create Floor Plan
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedFloorPlans.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {/* Direct Floor Plan View - For view mode with initial floor plan */}
      {initialFloorPlan && initialMode === 'view' && (
        <FloorPlanForm
          key={`direct-view-${initialFloorPlan.id || 'no-id'}`}
          floorPlan={initialFloorPlan}
          mode="view"
          tableSearchTerm={tableSearchTerm}
          setTableSearchTerm={setTableSearchTerm}
          bookings={bookings}
          selectedDate={selectedDate}
          onBookingUpdate={onBookingUpdate}
          onBookingClick={onBookingClick}
        />
      )}

      {/* Floor Plan CRUD Modal */}
      <CRUDModal
        open={floorPlanFormOpen}
        onClose={(reason) => {
          if (isCrudModalHardDismiss(reason)) {
            handleCloseFloorPlanForm()
          } else {
            setFloorPlanFormOpen(false)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "tableLayoutDesignerModal1",
          crudMode: floorPlanFormMode,
          id: selectedFloorPlanForForm?.id,
          itemLabel: selectedFloorPlanForForm?.name,
        }}
        title={floorPlanFormMode === 'create' ? 'Create Floor Plan' : floorPlanFormMode === 'edit' ? 'Edit Floor Plan' : 'View Floor Plan'}
        mode={floorPlanFormMode}
        onEdit={() => setFloorPlanFormMode("edit")}
        onSave={floorPlanFormMode !== "view" ? handleSaveFloorPlanForm : undefined}
        hideSaveButton={floorPlanFormMode === "view"}
        maxWidth="xl"
        formRef={floorPlanFormRef}
      >
        <FloorPlanForm
          key={`modal-${floorPlanFormMode}-${selectedFloorPlanForForm?.id || 'new'}`}
          ref={floorPlanFormRef}
          floorPlan={selectedFloorPlanForForm}
          mode={floorPlanFormMode}
          tableSearchTerm={tableSearchTerm}
          setTableSearchTerm={setTableSearchTerm}
          selectedDate={selectedDate}
        />
      </CRUDModal>
    </Box>
  )
}

export default TableLayoutDesigner
