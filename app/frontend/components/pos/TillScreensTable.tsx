"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  TextField,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Divider,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PointOfSale as PointOfSaleIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { useCompany } from "../../../backend/context/CompanyContext"
// All operations now come from POSContext
import { usePOS } from "../../../backend/context/POSContext"
import { TillScreen, TillScreenLayout } from "../../../backend/interfaces/POS"
import type { Card } from "../../../backend/context/POSContext"
import { format } from "date-fns"
import TillScreenForm from "./forms/TillScreenForm"
import CanvasArea from "./CanvasArea"
import ProductListPanel from "./ProductListPanel"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"
import { themeConfig } from "../../../theme/AppTheme"

// Define sort direction type
type Order = "asc" | "desc"

// Enhanced Card interface for designer
interface EnhancedCard extends Card {
  option?: string
  selected?: boolean
  text?: string
}

// Aspect ratio options
const aspectRatios = [
  { label: "16:9 (Widescreen)", value: "16:9", width: 1600, height: 900 },
  { label: "4:3 (Standard)", value: "4:3", width: 1600, height: 1200 },
  { label: "1:1 (Square)", value: "1:1", width: 1200, height: 1200 },
  { label: "21:9 (Ultrawide)", value: "21:9", width: 1680, height: 720 },
  { label: "Custom", value: "custom", width: 1600, height: 900 },
]

const TillScreensTable = () => {
  const navigate = useNavigate()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "tillscreens")
  const canRemove = canDelete("pos", "tillscreens")
  const { state: companyState } = useCompany()
  const { state: posState, refreshTillScreens, createTillScreen, deleteTillScreen, updateTillScreen } = usePOS()

  // State variables
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [orderBy, setOrderBy] = useState<keyof TillScreen>("name")
  const [order, setOrder] = useState<Order>("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [, setIsUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // Add state for viewing
  const [viewingScreen, setViewingScreen] = useState<TillScreen | null>(null)
  const [isTillViewFullscreen, setIsTillViewFullscreen] = useState(false)
  
  // Designer states (similar to GroupManagement)
  const [isDesigning, setIsDesigning] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<TillScreen | null>(null)
  const [designerMode, setDesignerMode] = useState<'create' | 'edit' | 'view'>('create')
  const [isTillDesignerFullscreen, setIsTillDesignerFullscreen] = useState(false)
  
  // Canvas and card states for full designer
  const [cards, setCards] = useState<EnhancedCard[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridSize, setGridSize] = useState(25)
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [scale, setScale] = useState(1)
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  
  // Form states
  const [tillFormOpen, setTillFormOpen] = useState(false)
  const [tillFormMode, setTillFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTillForForm, setSelectedTillForForm] = useState<TillScreen | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Fetch till screens on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        setError(null)
        await refreshTillScreens()
      } catch (err) {
        debugWarn("Error fetching till screens:", err)
        setError("Failed to load till screens data. Please try again.")
      }
    }

    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID, refreshTillScreens])

  // Handle sort request
  const handleRequestSort = (property: keyof TillScreen) => {
    const isAsc = orderBy === property && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(property)
  }

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  // Handle search

  // Handle view till screen

  // Handle create new till screen (designer mode)
  const handleCreateNewScreen = () => {
    if (!canMutate) return
    const newScreen: TillScreen = {
      id: "new",
      name: "",
      layout: {
        width: 1600,
        height: 900,
        cards: []
      },
      isActive: true,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setCurrentScreen(newScreen)
    setDesignerMode('create')
    setCards([])
    setIsDesigning(true)
  }

  // Handle edit till screen (designer mode)
  const handleEditScreen = (id: string) => {
    if (!canMutate) return
    const screen = tillScreens.find((s) => s.id === id)
    if (screen) {
      setCurrentScreen(screen)
      setDesignerMode('edit')
      setCards(screen.layout?.cards || [])
      setIsDesigning(true)
    }
  }

  const handleViewScreen = (id: string) => {
    const screen = tillScreens.find((s) => s.id === id)
    if (screen) {
      setViewingScreen(screen)
      setViewDialogOpen(true)
    }
  }

  // Handle back to list from designer
  const handleBackToList = () => {
    setIsDesigning(false)
    setCurrentScreen(null)
    setDesignerMode('create')
    setCards([])
  }

  // Handle adding product to canvas
  const handleAddProduct = (product: any) => {
    const newCard: EnhancedCard = {
      id: `card-${Date.now()}`,
      type: "product",
      data: product,
      x: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      y: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      width: 120,
      height: 80,
      fontSize: 12,
      fontColor: themeConfig.brandColors.offWhite,
      cardColor: themeConfig.brandColors.navy,
      zIndex: cards.length + 1,
      text: product.name || "Product",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setCards([...cards, newCard])
  }

  // Handle adding feature to canvas
  const handleAddFeature = (featureType: string, feature: any, option?: string, data?: any) => {
    let cardWidth = 120
    let cardHeight = 80

    // Adjust size based on feature type
    if (featureType === "function") {
      cardWidth = 150
      cardHeight = 100
    } else if (featureType === "category") {
      cardWidth = 200
      cardHeight = 120
    }

    const cardColor = feature.color || themeConfig.brandColors.navy
    const newCard: EnhancedCard = {
      id: `card-${Date.now()}`,
      type: featureType as "function" | "category" | "product" | "modifier",
      option: option,
      data: data,
      x: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      y: snapToGrid ? Math.round(200 / gridSize) * gridSize : 200,
      width: cardWidth,
      height: cardHeight,
      fontSize: 14,
      fontColor: cardColor === themeConfig.brandColors.offWhite ? themeConfig.brandColors.navy : themeConfig.brandColors.offWhite,
      cardColor,
      zIndex: cards.length + 1,
      text: option || feature.name || "Feature",
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setCards([...cards, newCard])
  }

  // Handle updating cards
  const handleUpdateCards = (updatedCards: Card[]) => {
    setCards(updatedCards as EnhancedCard[])
  }

  // Handle aspect ratio change
  const handleAspectRatioChange = (newAspectRatio: string) => {
    setAspectRatio(newAspectRatio)
    const ratio = aspectRatios.find(r => r.value === newAspectRatio)
    if (ratio && newAspectRatio !== "custom") {
      setCanvasSize({ width: ratio.width, height: ratio.height })
    }
  }

  // Handle save till screen from designer
  const handleSaveTillScreen = async () => {
    if (!canMutate) return
    if (!currentScreen) return

    try {
      const screenData = {
        ...currentScreen,
        layout: {
          width: canvasSize.width,
          height: canvasSize.height,
          cards: cards,
        } as TillScreenLayout,
      }

      if (currentScreen.id === "new") {
        // Filter out undefined values before creating
        const createPayload: any = { ...screenData }
        delete createPayload.id // Remove the "new" id
        // Filter out undefined values
        Object.keys(createPayload).forEach(key => {
          if (createPayload[key] === undefined) {
            delete createPayload[key]
          }
        })
        await createTillScreen(createPayload)
      } else {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = { ...screenData, id: currentScreen.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateTillScreen(currentScreen.id, updatePayload)
      }
      handleBackToList()
    } catch (error) {
      debugWarn("Error saving till screen:", error)
    }
  }

  // Handle delete till screen
  const handleDeleteClick = (id: string) => {
    if (!canRemove) return
    setSelectedScreenId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!canRemove) return
    if (!selectedScreenId || !companyState.companyID || !companyState.selectedSiteID) {
      setDeleteDialogOpen(false)
      return
    }

    try {
      setIsUpdating(selectedScreenId)
      // const basePath = `${getBasePath('pos')}/data` // Would use basePath when implementing functions
      // Delete till screen using POS context
      await deleteTillScreen(selectedScreenId)

      // Show success message
      setError(null)
    } catch (error) {
      debugWarn("Error deleting till screen:", error)
      setError("Failed to delete till screen. Please try again.")
    } finally {
      setDeleteDialogOpen(false)
      setSelectedScreenId(null)
      setIsUpdating(null)
    }
  }

  const handleDeleteTillScreen = async (id: string) => {
    if (!canRemove) return
    setSelectedScreenId(id)
    await handleDeleteConfirm()
  }

  // Handle set default till screen


  // Form handlers
  const handleOpenTillForm = (tillScreen: TillScreen | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedTillForForm(tillScreen)
    setTillFormMode(mode)
    setTillFormOpen(true)
  }

  const handleCloseTillForm = () => {
    setTillFormOpen(false)
    setSelectedTillForForm(null)
    setTillFormMode('create')
  }

  // Sort options
  const sortOptions = [
    { value: 'name', label: 'Screen Name' },
    { value: 'isDefault', label: 'Default Status' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' }
  ]

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
    // Update legacy sort state for compatibility
    setOrderBy(field as keyof TillScreen)
    setOrder(direction)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting till screens as ${format}`)
    // Export functionality would be implemented here
  }

  // Filter and sort till screens
  const tillScreens = posState.tillScreens || []
  const filteredScreens = tillScreens
    .filter((screen) => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return screen.name.toLowerCase().includes(searchLower)
      }
      return true
    })
    .sort((a, b) => {
      // Sort by selected column
      const aValue = a[orderBy]
      const bValue = b[orderBy]

      if (!aValue || !bValue) return 0

      // Handle different types of values
      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return 0
    })

  // Calculate pagination
  const paginatedScreens = filteredScreens.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  // Error is shown via Alert component below if needed

  return (
    <Box sx={{ width: "100%" }}>

      {/* Error Display */}
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: "error.light", color: "error.contrastText", borderRadius: 1 }}>
          <Typography>{error}</Typography>
        </Box>
      )}

      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search screens..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={handleCreateNewScreen}
        createButtonLabel="Create Till Screen"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit till screens."
      />

      <Paper sx={{ width: "100%", mb: 2 }}>
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
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>
                  <TableSortLabel
                    active={orderBy === "createdAt"}
                    direction={orderBy === "createdAt" ? order : "asc"}
                    onClick={() => handleRequestSort("createdAt")}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Items</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedScreens.length > 0 ? (
                paginatedScreens.map((screen, index) => (
                  <TableRow 
                    hover 
                    key={`${screen.id}-${index}`}
                    onClick={() => handleViewScreen(screen.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell align="center">{screen.name}</TableCell>
                    <TableCell align="center">
                      {screen.createdAt ? format(new Date(screen.createdAt), "MMM d, yyyy h:mm a") : "Unknown"}
                    </TableCell>
                    <TableCell align="center">{screen.layout?.cards?.length || 0} items</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditScreen(screen.id)
                            }}
                            disabled={!canMutate}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(screen.id)
                            }}
                            disabled={!canRemove}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box sx={{ py: 4 }}>
                      <EmptyStateCard
                        icon={PointOfSaleIcon}
                        title={searchTerm ? "No till screens match your filters" : "No till screens found"}
                        description={
                          searchTerm ? "Try adjusting your filters or search query" : "Create your first till screen to get started"
                        }
                      />
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
          count={filteredScreens.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Till Screen</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this till screen? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add view dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth={isTillViewFullscreen ? false : "lg"} 
        fullWidth={!isTillViewFullscreen}
        fullScreen={isTillViewFullscreen}
      >
        <DialogTitle sx={{ bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PointOfSaleIcon />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {viewingScreen?.name || "Till Screen"}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  View till screen details and layout
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton 
                onClick={() => setIsTillViewFullscreen(!isTillViewFullscreen)}
                sx={{ color: 'inherit' }}
              >
                {isTillViewFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
              <IconButton onClick={() => setViewDialogOpen(false)} sx={{ color: 'inherit' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingScreen && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Screen Details
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong>{" "}
                  {viewingScreen.createdAt
                    ? format(new Date(viewingScreen.createdAt), "MMM d, yyyy h:mm a")
                    : "Unknown"}
                </Typography>
                <Typography variant="body2">
                  <strong>Items:</strong> {viewingScreen.layout?.cards?.length || 0}
                </Typography>
                <Typography variant="body2">
                  <strong>Default:</strong> {viewingScreen.isDefault ? "Yes" : "No"}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Screen Preview
              </Typography>
              <Paper
                sx={{
                  width: "100%",
                  height: 400,
                  position: "relative",
                  overflow: "auto", // Changed from hidden to auto to allow scrolling
                  bgcolor: themeConfig.brandColors.offWhite,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                {/* Container with proper scaling */}
                <Box
                  sx={{
                    position: "relative",
                    transform: "scale(0.7)", // Add scaling to fix zoom issue
                    transformOrigin: "top left",
                    width: (viewingScreen as any).settings?.canvasWidth || 800,
                    height: (viewingScreen as any).settings?.canvasHeight || 600,
                  }}
                >
                  {viewingScreen.layout?.cards &&
                    viewingScreen.layout.cards.map((card: any) => (
                      <Paper
                        key={card.id}
                        sx={{
                          position: "absolute",
                          left: `${card.x}px`,
                          top: `${card.y}px`,
                          width: `${card.width}px`,
                          height: `${card.height}px`,
                          bgcolor: card.cardColor || themeConfig.brandColors.offWhite,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: card.zIndex || 1,
                          border: 1,
                          borderColor: "divider",
                          userSelect: "none",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: `${card.fontSize || 14}px`,
                            color: card.fontColor || "text.primary",
                            textAlign: "center",
                          }}
                        >
                          {card.product?.name || card.text || card.type || "Button"}
                        </Typography>
                      </Paper>
                    ))}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!viewingScreen?.id) return
              setViewDialogOpen(false)
              handleEditScreen(viewingScreen.id)
            }}
            startIcon={<EditIcon />}
            disabled={!canMutate}
          >
            Edit
          </Button>
          <Button
            onClick={() => {
              setViewDialogOpen(false)
              // Navigate to till usage with state containing the screen ID
              navigate("/POS/Management/TillUsage", {
                state: {
                  screenId: viewingScreen?.id,
                  fullscreen: true,
                },
              })
            }}
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
          >
            Use Till
          </Button>
        </DialogActions>
      </Dialog>

      {/* Till Screen Designer Dialog */}
      <Dialog
        open={isDesigning && currentScreen !== null}
        onClose={handleBackToList}
        maxWidth={isTillDesignerFullscreen ? false : "xl"}
        fullWidth={!isTillDesignerFullscreen}
        fullScreen={isTillDesignerFullscreen}
        PaperProps={{
          sx: {
            height: isTillDesignerFullscreen ? "100vh" : "90vh",
            maxHeight: isTillDesignerFullscreen ? "100vh" : "90vh",
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PointOfSaleIcon />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {currentScreen?.id === "new" ? "Create New Till Screen" : 
                   designerMode === 'view' ? "View Till Screen" : `Edit Till Screen`}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentScreen?.name && currentScreen.id !== "new" ? currentScreen.name : "Design your POS till screen layout"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton 
                onClick={() => setIsTillDesignerFullscreen(!isTillDesignerFullscreen)}
                sx={{ color: 'inherit' }}
              >
                {isTillDesignerFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
              <IconButton onClick={handleBackToList} sx={{ color: 'inherit' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Till Screen Settings Header */}
          <Paper sx={{ p: 2, m: 2, mb: 1 }}>
            {/* Screen Settings Row */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
              <TextField
                size="small"
                label="Screen Name"
                value={currentScreen?.name || ""}
                onChange={(e) => setCurrentScreen(prev => prev ? {...prev, name: e.target.value} : null)}
                disabled={designerMode === 'view'}
                sx={{ minWidth: 200 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={currentScreen?.isDefault || false}
                    onChange={(e) => setCurrentScreen(prev => prev ? {...prev, isDefault: e.target.checked} : null)}
                    disabled={designerMode === 'view'}
                  />
                }
                label="Default Screen"
              />
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Canvas Settings Row */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              {/* Aspect Ratio */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Aspect Ratio</InputLabel>
                <Select
                  value={aspectRatio}
                  label="Aspect Ratio"
                  onChange={(e) => handleAspectRatioChange(e.target.value)}
                  disabled={designerMode === 'view'}
                >
                  {aspectRatios.map((ratio) => (
                    <MenuItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Canvas Size (Custom) */}
              {aspectRatio === "custom" && (
                <>
                  <TextField
                    size="small"
                    label="Width"
                    type="number"
                    value={canvasSize.width}
                    onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1600 }))}
                    disabled={designerMode === 'view'}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    size="small"
                    label="Height"
                    type="number"
                    value={canvasSize.height}
                    onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 900 }))}
                    disabled={designerMode === 'view'}
                    sx={{ width: 100 }}
                  />
                </>
              )}

              {/* Grid Size */}
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Grid Size</InputLabel>
                <Select
                  value={gridSize}
                  label="Grid Size"
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={designerMode === 'view'}
                >
                  <MenuItem value={10}>10px</MenuItem>
                  <MenuItem value={20}>20px</MenuItem>
                  <MenuItem value={25}>25px</MenuItem>
                  <MenuItem value={50}>50px</MenuItem>
                </Select>
              </FormControl>

              {/* Grid Controls */}
              <FormControlLabel
                control={
                  <Switch
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    disabled={designerMode === 'view'}
                    size="small"
                  />
                }
                label="Show Grid"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    disabled={designerMode === 'view'}
                    size="small"
                  />
                }
                label="Snap to Grid"
              />

              {/* Scale Control */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 40 }}>
                  Scale:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={Math.round(scale * 100)}
                    onChange={(e) => setScale(Number(e.target.value) / 100)}
                    disabled={designerMode === 'view'}
                  >
                    <MenuItem value={25}>25%</MenuItem>
                    <MenuItem value={50}>50%</MenuItem>
                    <MenuItem value={75}>75%</MenuItem>
                    <MenuItem value={100}>100%</MenuItem>
                    <MenuItem value={125}>125%</MenuItem>
                    <MenuItem value={150}>150%</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Paper>

          {/* Main Designer Area */}
          <Box sx={{ flex: 1, display: "flex", height: "100%" }}>
            {/* Left sidebar - Product list */}
            <Box sx={{ width: 350, borderRight: 1, borderColor: "divider" }}>
              <ProductListPanel
                onAddProduct={handleAddProduct}
                onAddFeature={handleAddFeature}
                expandedFeature={expandedFeature}
                setExpandedFeature={setExpandedFeature}
              />
            </Box>

            {/* Main canvas area */}
            <Box sx={{ flex: 1 }}>
              <CanvasArea
                cards={cards}
                onUpdateCards={handleUpdateCards}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
                gridSize={gridSize}
                scale={scale}
                onScaleChange={setScale}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          {designerMode === 'view' ? (
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={() => setDesignerMode('edit')}
            >
              Edit
            </Button>
          ) : designerMode === 'edit' ? (
            <>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (currentScreen && window.confirm('Are you sure you want to delete this till screen?')) {
                    handleDeleteTillScreen(currentScreen.id)
                    handleBackToList()
                  }
                }}
                disabled={!canRemove}
              >
                Delete
              </Button>
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />} 
                onClick={handleSaveTillScreen}
                disabled={!canMutate}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSaveTillScreen}
              disabled={!canMutate}
            >
              Create Till Screen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Till Screen Form */}
      <TillScreenForm
        open={tillFormOpen}
        onClose={handleCloseTillForm}
        tillScreen={selectedTillForForm}
        mode={tillFormMode}
      />
    </Box>
  )
}

export default TillScreensTable
