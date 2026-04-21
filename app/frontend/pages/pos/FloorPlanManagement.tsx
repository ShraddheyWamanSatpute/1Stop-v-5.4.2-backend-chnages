"use client"
import { useLocation } from "react-router-dom"

import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  useTheme,
  FormControlLabel,
  Switch,
  CircularProgress,
  Menu,
  MenuItem,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Tooltip,
} from "@mui/material"
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Dashboard as AreaIcon,
  FormatColorFill as FormatColorFillIcon,
  Visibility as VisibilityIcon,
  Map as MapIcon,
  TableChart as TableIcon,
} from "@mui/icons-material"
import { Rnd } from "react-rnd"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { FloorPlan } from "../../../backend/interfaces/POS"
// import { useStock } from "../../../backend/context/StockContext" // Would use when implementing functions
// Would implement these functions in POSContext
// import {
//   fetchFloorPlans,
//   saveFloorPlan,
//   deleteFloorPlan,
// } from "../../../backend/context/POSContext"
import type { Table as POSTable } from "../../../backend/interfaces/POS"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import FormSection from "../../components/reusable/FormSection"
import DataHeader from "../../components/reusable/DataHeader"
import { themeConfig } from "../../../theme/AppTheme"

// TableElement interface removed as it's not currently used
// Would re-add when implementing advanced table positioning features

interface TableFormData {
  id?: string
  name: string
  number: number
  seats: number
  maxCovers: number
  minCovers: number
  type: "Dining" | "Bar" | "Outdoor" | "Private"
  description?: string
  order: number
  location?: string
}

interface ContextMenuPosition {
  mouseX: number
  mouseY: number
}

const FloorPlanManagement: React.FC = () => {
  const location = useLocation()
  const theme = useTheme()
  const { state: companyState } = useCompany()
  const { 
    state: posState,
    refreshFloorPlans,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    createTable,
    updateTable,
    deleteTable
  } = usePOS()
  const { floorPlans } = posState
  const canvasRef = useRef<HTMLDivElement>(null)

  // State for current floor plan
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(null)

  // State for tables
  const [tables] = useState<POSTable[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [tableFormData, setTableFormData] = useState<TableFormData>({
    name: "",
    number: 1,
    seats: 4,
    maxCovers: 4,
    minCovers: 1,
    type: "Dining",
    order: 0,
    location: "",
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null)
  const [contextMenuTableId, setContextMenuTableId] = useState<string | null>(null)

  // Style dialog state
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false)
  const [styleFormData, setStyleFormData] = useState({
    // white -> off-white
    backgroundColor: themeConfig.brandColors.offWhite,
    borderColor: themeConfig.brandColors.navy,
    // black/grey -> navy
    textColor: themeConfig.brandColors.navy,
    fontSize: 12,
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'designer'>('table')

  // Table view state (following TillScreensTable pattern)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState<keyof FloorPlan>('name')

  // DataHeader state
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [defaultStatusFilter, setDefaultStatusFilter] = useState<string>("all")
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all")

  // CRUD Modal states
  const [floorPlanFormOpen, setFloorPlanFormOpen] = useState(false)
  const [floorPlanFormMode, setFloorPlanFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedFloorPlanForForm, setSelectedFloorPlanForForm] = useState<FloorPlan | null>(null)

  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize, setGridSize] = useState(20) // Grid size in pixels

  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      fetchData()
    }
  }, [companyState.companyID, companyState.selectedSiteID])

  const fetchData = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch floor plans from BookingsContext
      await refreshFloorPlans()

      // Set current floor plan to default or first one
      if (floorPlans && floorPlans.length > 0) {
        const defaultPlan = floorPlans.find((plan: any) => plan.isDefault) || floorPlans[0] || null
        setCurrentFloorPlan(defaultPlan)
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Add explicit types to the parameters
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (floorPlans[newValue]) {
      setCurrentFloorPlan(floorPlans[newValue])
    }
    setActiveTab(newValue)
  }



  // Table functions
  const handleOpenTableDialog = (tableId?: string) => {
    if (tableId) {
      const table = tables.find((t) => t.id === tableId)
      if (table) {
        setTableFormData({
          id: table.id,
          name: table.name,
          number: table.number,
          seats: table.seats,
          maxCovers: table.seats, // Use seats as maxCovers fallback
          minCovers: 1,
          type: "Dining", // Default type since Table interface doesn't have this property
          description: table.notes || "",
          order: 0, // Default order since Table interface doesn't have this property
          location: table.sectionName || "",
        })
      }
    } else {
      setTableFormData({
        name: `Table ${tables.length + 1}`,
        number: tables.length + 1,
        seats: 4,
        maxCovers: 4,
        minCovers: 1,
        type: "Dining",
        order: tables.length,
        location: currentFloorPlan?.name || "",
      })
    }
    setIsTableDialogOpen(true)
  }

  const handleTableInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target
    if (name) {
      setTableFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

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

  // CRUD Modal handlers
  const handleOpenFloorPlanForm = (floorPlan: FloorPlan | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedFloorPlanForForm(floorPlan)
    setFloorPlanFormMode(mode)
    setFloorPlanFormOpen(true)
  }

  const handleCloseFloorPlanForm = () => {
    setFloorPlanFormOpen(false)
    setSelectedFloorPlanForForm(null)
    setFloorPlanFormMode('create')
  }

  const handleSaveFloorPlanForm = async () => {
    try {
      // Get form data from the form component
      let floorPlanData = (window as any).currentFloorPlanFormData
      
      // If no form data from window, try to get it from selected floor plan
      if (!floorPlanData && selectedFloorPlanForForm) {
        floorPlanData = {
          name: selectedFloorPlanForForm.name,
          description: selectedFloorPlanForForm.description || '',
          width: selectedFloorPlanForForm.width || selectedFloorPlanForForm.layout?.width || 1000,
          height: selectedFloorPlanForForm.height || selectedFloorPlanForForm.layout?.height || 800,
          tables: selectedFloorPlanForForm.tables || selectedFloorPlanForForm.layout?.tables || [],
          isDefault: selectedFloorPlanForForm.isDefault || false
        }
      }
      
      if (!floorPlanData || !floorPlanData.name?.trim()) {
        setError("Floor plan name is required")
        return
      }

      if (floorPlanFormMode === 'create') {
        const newFloorPlanData = {
          name: floorPlanData.name,
          description: floorPlanData.description || '',
          layout: {
            width: floorPlanData.width || 1000,
            height: floorPlanData.height || 800,
            obstacles: [],
            tables: floorPlanData.tables || []
          },
          isActive: true,
          isDefault: floorPlanData.isDefault || false
        }
        await createFloorPlan(newFloorPlanData)
        setSuccess("Floor plan created successfully")
      } else if (floorPlanFormMode === 'edit' && selectedFloorPlanForForm?.id) {
        // Preserve existing layout data when updating
        const existingLayout = selectedFloorPlanForForm.layout || {}
        const updatedFloorPlanData = {
          name: floorPlanData.name,
          description: floorPlanData.description || selectedFloorPlanForForm.description || '',
          layout: {
            width: floorPlanData.width || existingLayout.width || selectedFloorPlanForForm.width || 1000,
            height: floorPlanData.height || existingLayout.height || selectedFloorPlanForForm.height || 800,
            obstacles: existingLayout.obstacles || [],
            tables: floorPlanData.tables || existingLayout.tables || selectedFloorPlanForForm.tables || []
          },
          isActive: selectedFloorPlanForForm.isActive !== false,
          isDefault: floorPlanData.isDefault !== undefined ? floorPlanData.isDefault : selectedFloorPlanForForm.isDefault || false
        }
        await updateFloorPlan(selectedFloorPlanForForm.id, updatedFloorPlanData)
        setSuccess("Floor plan updated successfully")
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "floorPlanManagementModal1",
        crudMode: floorPlanFormMode,
        id: selectedFloorPlanForForm?.id,
        itemLabel: floorPlanData?.name,
      })
      handleCloseFloorPlanForm()
      await refreshFloorPlans() // Refresh the data
    } catch (error) {
      console.error("Error saving floor plan:", error)
      setError("Failed to save floor plan")
    }
  }

  const handleDeleteFloorPlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this floor plan? This action cannot be undone.")) {
      return
    }

    try {
      await deleteFloorPlan(id)
      setSuccess("Floor plan deleted successfully")
      await refreshFloorPlans() // Refresh the data
    } catch (error) {
      console.error("Error deleting floor plan:", error)
      setError("Failed to delete floor plan")
    }
  }

  // Create filters for DataHeader
  const filters = useMemo(() => [
    {
      label: "Default Status",
      options: [
        { id: "all", name: "All Floor Plans" },
        { id: "default", name: "Default Plans" },
        { id: "custom", name: "Custom Plans" }
      ],
      selectedValues: defaultStatusFilter !== "all" ? [defaultStatusFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setDefaultStatusFilter(value)
      }
    },
    {
      label: "Active Status",
      options: [
        { id: "all", name: "All Status" },
        { id: "active", name: "Active" },
        { id: "inactive", name: "Inactive" }
      ],
      selectedValues: activeStatusFilter !== "all" ? [activeStatusFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setActiveStatusFilter(value)
      }
    }
  ], [defaultStatusFilter, activeStatusFilter])

  // Filter and sort floor plans for table view
  const filteredFloorPlans = floorPlans.filter(plan => {
    // Search filter
    if (!plan.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Default status filter
    if (defaultStatusFilter === "default" && !plan.isDefault) {
      return false
    }
    if (defaultStatusFilter === "custom" && plan.isDefault) {
      return false
    }

    // Active status filter
    if (activeStatusFilter === "active" && !plan.isActive) {
      return false
    }
    if (activeStatusFilter === "inactive" && plan.isActive) {
      return false
    }

    return true
  })

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

  const handleSaveTable = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    if (!tableFormData.name) {
      setError("Table name is required")
      return
    }

    try {
      let savedTable: POSTable;
      
      // const dataBasePath = `${basePath}/data` // Would use when implementing functions
      if (tableFormData.id) {
        // Update existing table
        await updateTable(tableFormData.id, {
          ...tableFormData,
          location: { x: 0, y: 0 },
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          shape: "rectangle" as const,
          status: "available" as const,
          isActive: true,
        })
        savedTable = { 
          ...tableFormData,
          id: tableFormData.id || '',
          location: { x: 0, y: 0 },
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          shape: "rectangle" as const,
          status: "available" as const,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        console.log('Updated table:', savedTable); // savedTable used here
      } else {
        // Create new table
        const tableId = await createTable({
          ...tableFormData,
          location: { x: 0, y: 0 },
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          shape: "rectangle" as const,
          status: "available" as const,
          isActive: true,
        })
        savedTable = { 
          ...tableFormData,
          id: typeof tableId === 'string' ? tableId : tableId?.id || '',
          location: { x: 0, y: 0 },
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          shape: "rectangle" as const,
          status: "available" as const,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        console.log('Created table:', savedTable); // savedTable used here
      }

      // Add table to current floor plan if one exists
      if (currentFloorPlan) {
        const tableElement: POSTable = {
          id: `table-${Date.now()}`,
          name: tableFormData.name,
          number: tableFormData.number,
          seats: tableFormData.seats,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          shape: "rectangle",
          status: "available",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const updatedFloorPlan: FloorPlan = {
          ...currentFloorPlan,
          layout: { ...currentFloorPlan.layout, tables: [...(currentFloorPlan.layout.tables || []), tableElement] },
        }

        // Save floor plan using POS context
        await updateFloorPlan(currentFloorPlan.id, updatedFloorPlan)
      }

      setIsTableDialogOpen(false)
      setSuccess("Table saved successfully")
      fetchData()
    } catch (err) {
      console.error("Error saving table:", err)
      setError("Failed to save table. Please try again.")
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    if (!window.confirm("Are you sure you want to delete this table?")) return

    try {
      // const dataBasePath = `${basePath}/data` // Would use when implementing functions
      // Delete table using POS context
      await deleteTable(tableId)

      // Remove table from all floor plans
      for (const floorPlan of floorPlans) {
        if (floorPlan.layout.tables && floorPlan.layout.tables.some((t: POSTable) => t.id === tableId)) {
          const updatedTables = floorPlan.layout.tables.filter((t: POSTable) => t.id !== tableId)
          // Update floor plan using POS context
          await updateFloorPlan(floorPlan.id, {
            ...floorPlan,
            layout: { ...floorPlan.layout, tables: updatedTables },
          })
        }
      }

      setSuccess("Table deleted successfully")
      fetchData()
    } catch (err) {
      console.error("Error deleting table:", err)
      setError("Failed to delete table. Please try again.")
    }
  }

  // Table element functions
  // Add explicit types to the table parameters
  const handleAddTableToLayout = (tableId: string, shape: "Rectangle" | "Round" | "Square" | "Diamond" | "Custom") => {
    if (!currentFloorPlan) return

    // Table element positioning logic would be implemented here
    console.log("Adding table to layout:", tableId, shape)

    const tableForFloorPlan: POSTable = {
      id: `table-${Date.now()}`,
      name: tableFormData.name,
      number: tableFormData.number,
      seats: tableFormData.seats,
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      shape: "rectangle",
      status: "available",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const updatedFloorPlan: FloorPlan = {
      ...currentFloorPlan,
      layout: { ...currentFloorPlan.layout, tables: [...(currentFloorPlan.layout.tables || []), tableForFloorPlan] },
    }

    setCurrentFloorPlan(updatedFloorPlan)
  }

  const handleTableElementResize = (
    id: string,
    position: { x: number; y: number },
    size: { width: number; height: number },
  ) => {
    if (!currentFloorPlan) return

    // Apply grid snapping if enabled
    let snappedPosition = { ...position }
    let snappedSize = { ...size }

    if (snapToGrid) {
      snappedPosition = {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize,
      }

      snappedSize = {
        width: Math.round(size.width / gridSize) * gridSize,
        height: Math.round(size.height / gridSize) * gridSize,
      }

      // Ensure minimum size
      if (snappedSize.width < gridSize) snappedSize.width = gridSize
      if (snappedSize.height < gridSize) snappedSize.height = gridSize
    }

    const updatedTables = currentFloorPlan.layout.tables.map((table: POSTable) => {
      if (table.id === id) {
        return {
          ...table,
          x: snappedPosition.x,
          y: snappedPosition.y,
          width: snappedSize.width,
          height: snappedSize.height,
        }
      }
      return table
    })

    setCurrentFloorPlan({
      ...currentFloorPlan,
      layout: {
        ...currentFloorPlan.layout,
        tables: updatedTables,
      }
    })
  }

  const handleRemoveTableElement = (id: string) => {
    if (!currentFloorPlan) return

    const updatedTables = currentFloorPlan.layout.tables.filter((table: POSTable) => table.id !== id)

    setCurrentFloorPlan({
      ...currentFloorPlan,
      layout: {
        ...currentFloorPlan.layout,
        tables: updatedTables,
      }
    })
  }

  const handleSaveLayout = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID || !currentFloorPlan) return

    try {
      // const dataBasePath = `${basePath}/data` // Would use when implementing functions
      // Save floor plan using POS context
      await updateFloorPlan(currentFloorPlan.id, currentFloorPlan)
      setSuccess("Layout saved successfully")
    } catch (err) {
      console.error("Error saving layout:", err)
      setError("Failed to save layout. Please try again.")
    }
  }

  // Context menu functions
  const handleContextMenu = (event: React.MouseEvent, tableId: string) => {
    event.preventDefault()
    setContextMenuTableId(tableId)
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    })
  }

  const handleContextMenuClose = () => {
    setContextMenu(null)
    setContextMenuTableId(null)
  }

  // Style dialog functions
  const handleOpenStyleDialog = (tableId: string) => {
    if (!currentFloorPlan) return

    const foundTable = currentFloorPlan.layout.tables.find((t: POSTable) => t.id === tableId)
    if (foundTable) {
      setStyleFormData({
        backgroundColor: foundTable.backgroundColor || themeConfig.brandColors.offWhite,
        borderColor: foundTable.borderColor || themeConfig.brandColors.navy,
        textColor: foundTable.textColor || themeConfig.brandColors.navy,
        fontSize: foundTable.fontSize || 12,
      })
      setContextMenuTableId(tableId)
      setIsStyleDialogOpen(true)
    }

    handleContextMenuClose()
  }

  const handleStyleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target
    if (name) {
      setStyleFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSaveStyle = () => {
    if (!currentFloorPlan || !contextMenuTableId) return

    const updatedTables = currentFloorPlan.layout.tables.map((table: POSTable) => {
      if (table.id === contextMenuTableId) {
        return {
          ...table,
          backgroundColor: styleFormData.backgroundColor,
          borderColor: styleFormData.borderColor,
          textColor: styleFormData.textColor,
          fontSize: styleFormData.fontSize,
        }
      }
      return table
    })

    setCurrentFloorPlan({
      ...currentFloorPlan,
      layout: {
        ...currentFloorPlan.layout,
        tables: updatedTables,
      }
    })

    setIsStyleDialogOpen(false)
    setContextMenuTableId(null)
  }

  // DataHeader handlers
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'isDefault', label: 'Default Status' }
  ]

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
    // Update legacy sorting state for compatibility
    setOrderBy(field as keyof FloorPlan)
    setOrder(direction)
  }

  const handleExport = () => {
    const data = filteredFloorPlans.map(plan => ({
      'Name': plan.name,
      'Default': plan.isDefault ? 'Yes' : 'No',
      'Width': plan.layout.width,
      'Height': plan.layout.height,
      'Tables': plan.layout.tables.length,
      'Created': plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '',
      'Updated': plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : ''
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `floor-plans-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Add explicit type to the table parameter
  const renderTableShape = (table: POSTable) => {
    const tableData = tables.find((t) => t.id === table.id)
    const tableName = tableData?.name || "Table"
    const tableCovers = tableData?.maxCovers || 4

    // Use custom styles or defaults
    const backgroundColor = themeConfig.brandColors.offWhite
    const borderColor = themeConfig.brandColors.navy
    const textColor = themeConfig.brandColors.navy
    const fontSize = 12

    switch (table.shape) {
      case "circle":
        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: `2px solid ${borderColor}`,
              backgroundColor: backgroundColor,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
            onContextMenu={(e) => handleContextMenu(e, table.id)}
          >
            <Typography variant="caption" fontWeight="bold" noWrap sx={{ color: textColor, fontSize }}>
              {tableName}
            </Typography>
            <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, fontSize: fontSize - 2 }} noWrap>
              {tableCovers} seats
            </Typography>
          </Box>
        )
      case "square":
        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              border: `2px solid ${borderColor}`,
              backgroundColor: backgroundColor,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
            onContextMenu={(e) => handleContextMenu(e, table.id)}
          >
            <Typography variant="caption" fontWeight="bold" noWrap sx={{ color: textColor, fontSize }}>
              {tableName}
            </Typography>
            <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, fontSize: fontSize - 2 }} noWrap>
              {tableCovers} seats
            </Typography>
          </Box>
        )
      case "rectangle":
        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              transform: "rotate(45deg)",
              border: `2px solid ${borderColor}`,
              backgroundColor: backgroundColor,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
            onContextMenu={(e) => handleContextMenu(e, table.id)}
          >
            <Box
              sx={{
                transform: "rotate(-45deg)",
                textAlign: "center",
                width: "100%",
              }}
            >
              <Typography variant="caption" fontWeight="bold" noWrap sx={{ color: textColor, fontSize }}>
                {tableName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: textColor, opacity: 0.7, fontSize: fontSize - 2 }}
                display="block"
                noWrap
              >
                {tableCovers} seats
              </Typography>
            </Box>
          </Box>
        )
      default:
        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: 1,
              border: `2px solid ${borderColor}`,
              backgroundColor: backgroundColor,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
            onContextMenu={(e) => handleContextMenu(e, table.id)}
          >
            <Typography variant="caption" fontWeight="bold" noWrap sx={{ color: textColor, fontSize }}>
              {tableName}
            </Typography>
            <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, fontSize: fontSize - 2 }} noWrap>
              {tableCovers} seats
            </Typography>
          </Box>
        )
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search floor plans..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        onExportCSV={handleExport}
        onCreateNew={() => handleOpenFloorPlanForm(null, 'create')}
        createButtonLabel="Create Floor Plan"
        additionalButtons={[
          {
            label: viewMode === 'table' ? 'Table View' : 'Designer View',
            icon: viewMode === 'table' ? <TableIcon /> : <MapIcon />,
            onClick: () => setViewMode(viewMode === 'table' ? 'designer' : 'table'),
            variant: 'outlined' as const
          }
        ]}
      />

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

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h6" color="primary">
            {floorPlans.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Floor Plans
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h6" color="success.main">
            {floorPlans.filter(plan => plan.isDefault).length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Default Plans
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h6" color="info.main">
            {tables.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Tables
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h6" color="warning.main">
            {filteredFloorPlans.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filtered Results
          </Typography>
        </Paper>
      </Box>


      {viewMode === 'table' ? (
        // Table View (following TillScreensTable pattern)
        <Paper sx={{ width: "100%", mb: 2 }}>
          <TableContainer>
            <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleRequestSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "createdAt"}
                      direction={orderBy === "createdAt" ? order : "asc"}
                      onClick={() => handleRequestSort("createdAt")}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Dimensions</TableCell>
                  <TableCell>Tables</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFloorPlans.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <MapIcon color="primary" />
                        <Typography variant="body2">{plan.name}</Typography>
                        {plan.isDefault && <Chip label="Default" size="small" color="success" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {plan.layout?.width || 0} × {plan.layout?.height || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tables.length} tables
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={plan.isDefault ? "Default" : "Active"} 
                        size="small" 
                        color={plan.isDefault ? "success" : "primary"} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton 
                          size="small" 
                          color="info" 
                          onClick={() => handleOpenFloorPlanForm(plan, 'view')}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Floor Plan">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => {
                            setCurrentFloorPlan(plan)
                            setViewMode('designer')
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteFloorPlan(plan.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedFloorPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
      ) : (
        // Designer View (existing designer functionality)
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Table Layout Designer</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenFloorPlanForm(null, 'create')}>
                New Floor Plan
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveLayout} disabled={!currentFloorPlan}>
                Save Layout
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label="Snap to Grid"
              />
              {snapToGrid && (
                <TextField
                  label="Grid Size"
                  type="number"
                  size="small"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  InputProps={{ inputProps: { min: 5, max: 50 } }}
                  sx={{ width: 100 }}
                />
              )}
            </Box>
          </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {floorPlans.length > 0 ? (
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={(theme) => ({
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  minHeight: 44
                },
                '& .MuiTab-root.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600
                }
              })}
            >
              {floorPlans.map((plan) => (
                <Tab
                  key={plan.id}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <AreaIcon sx={{ mr: 1, fontSize: "small" }} />
                      {plan.name}
                      {plan.isDefault && (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            fontSize: "0.7rem",
                            color: "success.main",
                          }}
                        >
                          (Default)
                        </Box>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFloorPlan(plan.id)
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={9}>
              <Paper
                ref={canvasRef}
                sx={{
                  height: 600,
                  position: "relative",
                  overflow: "hidden",
                  // grey -> off-white
                  backgroundColor: themeConfig.brandColors.offWhite,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                {snapToGrid && currentFloorPlan && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: currentFloorPlan.layout.width,
                      height: currentFloorPlan.layout.height,
                      pointerEvents: "none",
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                      backgroundImage:
                        `linear-gradient(to right, ${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px), linear-gradient(to bottom, ${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px)`,
                      zIndex: 0,
                    }}
                  />
                )}
                {currentFloorPlan && (
                  <Box
                    sx={{
                      width: currentFloorPlan.layout.width,
                      height: currentFloorPlan.layout.height,
                      position: "relative",
                    }}
                  >
                    {currentFloorPlan.layout.tables &&
                      currentFloorPlan.layout.tables.map((table: POSTable) => (
                        <Rnd
                          key={table.id}
                          size={{ width: table.width, height: table.height }}
                          position={{ x: table.x, y: table.y }}
                          onDragStop={(_e, d) => {
                            handleTableElementResize(
                              table.id,
                              { x: d.x, y: d.y },
                              { width: table.width, height: table.height },
                            )
                          }}
                          onResizeStop={(_e, _direction, ref, _delta, position) => {
                            handleTableElementResize(table.id, position, {
                              width: Number.parseInt(ref.style.width),
                              height: Number.parseInt(ref.style.height),
                            })
                          }}
                          bounds="parent"
                          onClick={() => setSelectedTable(table.id)}
                          style={{
                            border:
                              selectedTable === table.id ? `2px dashed ${themeConfig.brandColors.offWhite}` : "none",
                            zIndex: selectedTable === table.id ? 10 : 1,
                          }}
                        >
                          <Box
                            sx={{
                              position: "relative",
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            {renderTableShape(table)}
                            {selectedTable === table.id && (
                              <IconButton
                                size="small"
                                sx={{
                                  position: "absolute",
                                  top: -15,
                                  right: -15,
                                  backgroundColor: theme.palette.error.main,
                                  color: themeConfig.brandColors.offWhite,
                                  "&:hover": {
                                    backgroundColor: theme.palette.error.dark,
                                  },
                                }}
                                onClick={() => handleRemoveTableElement(table.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Rnd>
                      ))}
                  </Box>
                )}
                {!currentFloorPlan && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No floor plan selected. Please create or select a floor plan.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle1" gutterBottom>
                  Tables
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenTableDialog()}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Add New Table
                </Button>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Available Tables
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                  {tables.map((table) => (
                    <Card key={table.id} sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {table.maxCovers} seats
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ pt: 0 }}>
                        <Button size="small" onClick={() => handleAddTableToLayout(table.id, "Rectangle")}>
                          Rectangle
                        </Button>
                        <Button size="small" onClick={() => handleAddTableToLayout(table.id, "Round")}>
                          Round
                        </Button>
                        <Button size="small" onClick={() => handleAddTableToLayout(table.id, "Diamond")}>
                          Diamond
                        </Button>
                        <IconButton size="small" onClick={() => handleOpenTableDialog(table.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteTable(table.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  ))}
                  {tables.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No tables found. Add a table to get started.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            No Floor Plans Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create your first floor plan to start designing your table layout.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenFloorPlanForm(null, 'create')}>
            Create Floor Plan
          </Button>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem
          onClick={() => {
            if (contextMenuTableId) handleOpenStyleDialog(contextMenuTableId)
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FormatColorFillIcon sx={{ mr: 1, fontSize: "small" }} />
            Style Table
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenuTableId) handleRemoveTableElement(contextMenuTableId)
            handleContextMenuClose()
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: theme.palette.error.main,
            }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: "small" }} />
            Delete Table
          </Box>
        </MenuItem>
      </Menu>


      {/* Table Dialog */}
      <Dialog open={isTableDialogOpen} onClose={() => setIsTableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{tableFormData.id ? "Edit Table" : "Add New Table"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Table Name"
                name="name"
                value={tableFormData.name}
                onChange={handleTableInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Table Type"
                name="type"
                value={tableFormData.type}
                onChange={handleTableInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Maximum Covers"
                name="maxCovers"
                type="number"
                value={tableFormData.maxCovers}
                onChange={handleTableInputChange}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Minimum Covers"
                name="minCovers"
                type="number"
                value={tableFormData.minCovers}
                onChange={handleTableInputChange}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Order"
                name="order"
                type="number"
                value={tableFormData.order}
                onChange={handleTableInputChange}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Location"
                name="location"
                value={tableFormData.location}
                onChange={handleTableInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={tableFormData.description}
                onChange={handleTableInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTableDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTable}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Style Dialog */}
      <Dialog open={isStyleDialogOpen} onClose={() => setIsStyleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Table Style</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    backgroundColor: styleFormData.backgroundColor,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <TextField
                  id="background-color"
                  name="backgroundColor"
                  label="Background Color"
                  value={styleFormData.backgroundColor}
                  onChange={handleStyleInputChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    backgroundColor: styleFormData.borderColor,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <TextField
                  id="border-color"
                  name="borderColor"
                  label="Border Color"
                  value={styleFormData.borderColor}
                  onChange={handleStyleInputChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    backgroundColor: styleFormData.textColor,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <TextField
                  id="text-color"
                  name="textColor"
                  label="Text Color"
                  value={styleFormData.textColor}
                  onChange={handleStyleInputChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography id="floorplan-style-font-size-label" variant="body2" sx={{ display: "block", mt: 1, mb: 0.5 }}>
                Font Size
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Slider
                  value={styleFormData.fontSize}
                  min={8}
                  max={24}
                  step={1}
                  onChange={(_, value) =>
                    setStyleFormData((prev) => ({
                      ...prev,
                      fontSize: value as number,
                    }))
                  }
                  aria-labelledby="floorplan-style-font-size-label"
                  sx={{ flexGrow: 1 }}
                />
                <Typography variant="body2" sx={{ minWidth: 30 }}>
                  {styleFormData.fontSize}px
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStyleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveStyle}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      )}

      {/* Floor Plan CRUD Modal */}
      <CRUDModal
        open={floorPlanFormOpen}
        onClose={(reason) => {
          setFloorPlanFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedFloorPlanForForm(null)
            setFloorPlanFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "floorPlanManagementModal1",
          crudMode: floorPlanFormMode,
          id: selectedFloorPlanForForm?.id,
          itemLabel: selectedFloorPlanForForm?.name,
        }}
        title={
          floorPlanFormMode === "create"
            ? "Create Floor Plan"
            : floorPlanFormMode === "edit"
              ? "Edit Floor Plan"
              : "View Floor Plan"
        }
        mode={floorPlanFormMode}
        onEdit={() => setFloorPlanFormMode("edit")}
        onSave={floorPlanFormMode !== "view" ? handleSaveFloorPlanForm : undefined}
        hideSaveButton={floorPlanFormMode === "view"}
      >
        <FloorPlanForm
          floorPlan={selectedFloorPlanForForm}
          mode={floorPlanFormMode}
          onCancel={handleCloseFloorPlanForm}
        />
      </CRUDModal>
    </Box>
  )
}

// Floor Plan Form Component
interface FloorPlanFormProps {
  floorPlan?: FloorPlan | null
  mode: 'create' | 'edit' | 'view'
  onCancel: () => void
}

const FloorPlanForm: React.FC<FloorPlanFormProps> = ({ floorPlan, mode }) => {
  const [formData, setFormData] = useState({
    name: floorPlan?.name || '',
    description: floorPlan?.description || '',
    width: floorPlan?.layout?.width || 1000,
    height: floorPlan?.layout?.height || 800,
    isDefault: floorPlan?.isDefault || false,
  })

  const isReadOnly = mode === 'view'

  const handleChange = (field: string, value: any) => {
    if (!isReadOnly) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  // Return form data for parent component to save
  useEffect(() => {
    if (mode !== 'view') {
      // This allows the parent to access form data when saving
      (window as any).currentFloorPlanFormData = formData
    }
  }, [formData, mode])

  return (
    <Box sx={{ p: 2 }}>
      <FormSection title="Basic Information" defaultExpanded>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Floor Plan Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isReadOnly}
              fullWidth
              required
              helperText="Enter a unique name for this floor plan"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={2}
              helperText="Optional description for this floor plan"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => handleChange('isDefault', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Set as Default Floor Plan"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Canvas Dimensions">
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <TextField
              label="Width (px)"
              type="number"
              value={formData.width}
              onChange={(e) => handleChange('width', Number(e.target.value))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 500, max: 5000 }}
              helperText="Canvas width in pixels"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Height (px)"
              type="number"
              value={formData.height}
              onChange={(e) => handleChange('height', Number(e.target.value))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 400, max: 4000 }}
              helperText="Canvas height in pixels"
            />
          </Grid>
        </Grid>
      </FormSection>


      {mode === 'view' && floorPlan && (
        <FormSection title="Statistics" defaultExpanded>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <TextField
                label="Total Tables"
                value={floorPlan.layout?.tables?.length || 0}
                disabled
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Created Date"
                value={floorPlan.createdAt ? new Date(floorPlan.createdAt).toLocaleDateString() : 'N/A'}
                disabled
                fullWidth
              />
            </Grid>
          </Grid>
        </FormSection>
      )}
    </Box>
  )
}

export default FloorPlanManagement
