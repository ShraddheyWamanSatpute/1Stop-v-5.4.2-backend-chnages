"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  useTheme,
} from "@mui/material"
import {
  ViewModule as GroupIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  AspectRatio as AspectRatioIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { v4 as uuidv4 } from "uuid"
import type { Card } from "../../../backend/interfaces/POS"
import CanvasArea from "../../components/pos/CanvasArea"
import ProductListPanel from "../../components/pos/ProductListPanel"
import DataHeader from "../../components/reusable/DataHeader"
import GroupForm from "../../components/pos/forms/GroupForm"
import { themeConfig } from "../../../theme/AppTheme"

interface ProductGroup {
  id: string
  name: string
  description: string
  layout: Card[]
  tags: string[]
  createdAt: number
  updatedAt: number
  isDefault?: boolean
}

const canvasSizeOptions = [
  { label: "Small (400×300)", width: 400, height: 300 },
  { label: "Medium (600×400)", width: 600, height: 400 },
  { label: "Large (800×600)", width: 800, height: 600 },
  { label: "Wide (800×400)", width: 800, height: 400 },
  { label: "Square (500×500)", width: 500, height: 500 },
]

const gridSizeOptions = [10, 15, 20, 25, 30, 50]

// Helper functions - now using POSContext

const GroupManagement: React.FC = () => {
  const theme = useTheme()
  const { state: companyState } = useCompany()
  const { state: posState, createGroup, updateGroup, deleteGroup, refreshGroups } = usePOS()
  const [currentGroup, setCurrentGroup] = useState<ProductGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDesigning, setIsDesigning] = useState(false)

  const [cards, setCards] = useState<Card[]>([])
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  // Canvas settings
  const [canvasSize, setCanvasSize] = useState(canvasSizeOptions[1]) // Medium by default
  const [gridSize, setGridSize] = useState(20)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  const featureTypes = React.useMemo(
    () => ({
      payment: {
        name: "Payment",
        color: themeConfig.colors.success.main,
        options: ["Cash", "Card", "Split Payment", "Account", "Voucher"],
        icon: <></>,
      },
      billWindow: {
        name: "Bill Window",
        // blue -> navy
        color: theme.palette.primary.main,
        options: ["Standard", "Compact", "Detailed", "Kitchen View"],
        icon: <></>,
      },
      discount: {
        name: "Discount",
        color: themeConfig.colors.warning.main,
        options: ["Percentage", "Fixed Amount", "Item Discount"],
        icon: <></>,
      },
      promotion: {
        name: "Promotion",
        // pink -> off-white
        color: theme.palette.secondary.main,
        options: ["BOGO", "Bundle", "Happy Hour", "Special Offer"],
        icon: <></>,
      },
      numpad: {
        name: "Number Pad",
        color: themeConfig.brandColors.navy,
        options: ["Standard", "With Function Keys"],
        icon: <></>,
      },
      sidebar: {
        name: "Sidebar",
        // blue-ish -> navy
        color: theme.palette.primary.main,
        options: ["Categories", "Recent Items", "Favorites"],
        icon: <></>,
      },
      group: {
        name: "Group",
        color: themeConfig.brandColors.navy,
        options: ["Mini Till", "Quick Items", "Custom Group"],
        icon: <></>,
      },
      systemFunction: {
        name: "System Function",
        color: themeConfig.colors.error.main,
        options: ["Log Out", "End Shift", "Manager Functions", "Reports"],
        icon: <></>,
      },
      tillFunction: {
        name: "Till Function",
        // blue -> navy
        color: theme.palette.primary.main,
        options: ["Save", "Print", "Receipt", "Void", "Refund"],
        icon: <></>,
      },
      serviceCharge: {
        name: "Service Charge",
        color: themeConfig.colors.success.main,
        options: ["Automatic", "Manual", "Remove"],
        icon: <></>,
      },
      tax: {
        name: "Tax",
        color: themeConfig.colors.warning.main,
        options: ["Add Tax", "Remove Tax", "Tax Exempt"],
        icon: <></>,
      },
      tablePlan: {
        name: "Table Plan",
        color: themeConfig.colors.success.main,
        options: ["Main Floor", "Bar Area", "Outdoor", "Private Dining"],
        icon: <></>,
      },
    }),
    [theme.palette.primary.main],
  )

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      setLoading(true)
      try {
        await refreshGroups()
      } catch (error) {
        console.error("Error loading data:", error)
        setError("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [companyState.companyID, companyState.selectedSiteID, refreshGroups])



  const handleDeleteGroup = async (id: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    if (!window.confirm("Are you sure you want to delete this group?")) return

    try {
      await deleteGroup(id)
      setSuccess("Group deleted successfully")
    } catch (error) {
      console.error("Error deleting group:", error)
      setError("Failed to delete group. Please try again.")
    }
  }

  const handleBackToList = () => {
    setIsDesigning(false)
    setCurrentGroup(null)
    setCards([])
  }

  const handleAddProduct = (product: any) => {
    const newCard: Card = {
      id: uuidv4(),
      type: "product" as const,
      content: product,
      x: snapToGrid ? gridSize : 20,
      y: snapToGrid ? gridSize : 20,
      width: snapToGrid ? gridSize * 4 : 80,
      height: snapToGrid ? gridSize * 3 : 60,
      fontSize: 12,
      // black/grey -> navy/off-white
      fontColor: theme.palette.primary.main,
      cardColor: theme.palette.secondary.main,
      zIndex: cards.length + 1,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setCards([...cards, newCard])
  }

  const handleAddFeature = (featureType: string, option = "") => {
    const feature = featureTypes[featureType as keyof typeof featureTypes]
    if (!feature) return

    let cardWidth = snapToGrid ? gridSize * 6 : 120
    let cardHeight = snapToGrid ? gridSize * 3 : 60

    if (featureType === "numpad") {
      cardWidth = snapToGrid ? gridSize * 8 : 160
      cardHeight = snapToGrid ? gridSize * 10 : 200
    } else if (featureType === "billWindow") {
      cardWidth = snapToGrid ? gridSize * 12 : 240
      cardHeight = snapToGrid ? gridSize * 15 : 300
    }

    const newCard: Card = {
      id: uuidv4(),
      type: featureType as "function" | "product" | "billWindow" | "numpad" | "category" | "modifier",
      content: option || feature.name,
      x: snapToGrid ? gridSize : 20,
      y: snapToGrid ? gridSize * 2 : 40,
      width: cardWidth,
      height: cardHeight,
      fontSize: 12,
      // white/pink -> off-white, but keep contrast on off-white cards
      fontColor: feature.color === theme.palette.secondary.main ? theme.palette.primary.main : theme.palette.secondary.main,
      cardColor: feature.color,
      zIndex: cards.length + 1,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setCards([...cards, newCard])
  }

  const handleUpdateCards = (updatedCards: Card[]) => {
    setCards(updatedCards)
  }

  const handleSaveScreen = async () => {
    try {
      if (!companyState.companyID || !companyState.selectedSiteID || !currentGroup) return

      let groupName = currentGroup.name
      if (currentGroup.id === "new") {
        groupName = prompt("Enter group name:") || "Untitled Group"
      }

      const groupData = {
        name: groupName,
        description: currentGroup.description,
        layout: cards,
        tags: currentGroup.tags,
        createdAt: currentGroup.createdAt,
        updatedAt: Date.now(),
        isDefault: currentGroup.isDefault || false,
      }

      if (currentGroup.id === "new") {
        await createGroup(groupData)
        setSuccess("Group created successfully!")
      } else {
        await updateGroup(currentGroup.id, groupData)
        setSuccess("Group updated successfully!")
      }

      handleBackToList()
    } catch (error) {
      console.error("Error saving group:", error)
      setError("Failed to save group")
    }
  }

  const getFeatureIcon = (featureType: string) => {
    return featureTypes[featureType as keyof typeof featureTypes]?.icon || <></>
  }

  // DataHeader handlers
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'isDefault', label: 'Default Status' }
  ]

  const filteredAndSortedGroups = posState.groups
    .filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy as keyof ProductGroup]
      const bValue = b[sortBy as keyof ProductGroup]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = () => {
    const data = filteredAndSortedGroups.map(group => ({
      'Name': group.name,
      'Description': group.description,
      'Default': group.isDefault ? 'Yes' : 'No',
      'Items': group.layout.length,
      'Tags': group.tags.join(', '),
      'Created': new Date(group.createdAt).toLocaleDateString(),
      'Updated': new Date(group.updatedAt).toLocaleDateString()
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `product-groups-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // CRUD Modal handlers
  const handleOpenCrudModal = (group: ProductGroup | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedGroup(group)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedGroup(null)
    setCrudMode('create')
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        await createGroup(formData)
        setSuccess('Group created successfully')
      } else if (crudMode === 'edit' && selectedGroup) {
        await updateGroup(selectedGroup.id, formData)
        setSuccess('Group updated successfully')
      }
      handleCloseCrudModal()
    } catch (error) {
      console.error('Failed to save group:', error)
      setError('Failed to save group')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
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

      <DataHeader
        title={undefined}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search groups..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport()}
        onExportPDF={() => handleExport()}
        // Remove extra create button here to avoid duplication
      />

      {filteredAndSortedGroups.length > 0 ? (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Items</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Tags</TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedGroups.map((group) => (
                  <TableRow 
                    key={group.id}
                    hover
                    onClick={() => handleOpenCrudModal(group, 'view')}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <GroupIcon color="primary" />
                        <Typography variant="body2">{group.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {group.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {group.layout?.length || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                        {group.tags.length > 0 ? (
                          group.tags.map((tag: string, tagIndex: number) => (
                            <Chip key={tagIndex} label={tag} size="small" />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={group.isDefault ? "Default" : "Active"} 
                        size="small" 
                        color={group.isDefault ? "success" : "default"} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenCrudModal(group, 'edit')
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGroup(group.id)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <GroupIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Groups Created
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Create your first group to get started. Groups help organize products and functions for quick access on till
            screens.
          </Typography>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => handleOpenCrudModal(null, 'create')}>
            Create Group
          </Button>
        </Paper>
      )}

      {/* Group Designer Dialog */}
      <Dialog
        open={isDesigning && currentGroup !== null}
        onClose={handleBackToList}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              {currentGroup?.id === "new" ? "Create New Group" : `Edit Group - ${currentGroup?.name}`}
            </Typography>
            <IconButton onClick={handleBackToList}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Canvas Settings Header */}
          <Paper sx={{ p: 2, m: 2, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Canvas Size</InputLabel>
                <Select
                  value={canvasSizeOptions.findIndex(
                    (option) => option.width === canvasSize.width && option.height === canvasSize.height,
                  )}
                  label="Canvas Size"
                  onChange={(e) => setCanvasSize(canvasSizeOptions[e.target.value as number])}
                >
                  {canvasSizeOptions.map((option, index) => (
                    <MenuItem key={index} value={index}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Grid Size</InputLabel>
                <Select value={gridSize} label="Grid Size" onChange={(e) => setGridSize(e.target.value as number)}>
                  {gridSizeOptions.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}px
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={<Switch checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />}
                label="Snap to Grid"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    icon={<GridOffIcon />}
                    checkedIcon={<GridOnIcon />}
                  />
                }
                label="Show Grid"
              />

              <Chip
                icon={<AspectRatioIcon />}
                label={`${canvasSize.width} × ${canvasSize.height}`}
                variant="outlined"
                size="small"
              />
            </Box>
          </Paper>

          <Divider />

          {/* Main Design Area */}
          <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
            {/* Product Panel */}
            <Box
              sx={{
                width: 280,
                height: "100%",
                overflow: "auto",
                borderRight: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <ProductListPanel
                onAddProduct={handleAddProduct}
                onAddFeature={handleAddFeature}
                expandedFeature={expandedFeature}
                setExpandedFeature={setExpandedFeature}
                getFeatureIcon={getFeatureIcon}
              />
            </Box>

            {/* Canvas Area */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
                bgcolor: themeConfig.brandColors.offWhite,
                overflow: "auto",
              }}
            >
              <Box
                sx={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                  border: "2px solid",
                  borderColor: themeConfig.brandColors.navy,
                  borderRadius: 1,
                  bgcolor: themeConfig.brandColors.offWhite,
                  boxShadow: 3,
                }}
              >
                <CanvasArea
                  cards={cards}
                  onUpdateCards={handleUpdateCards}
                  snapToGrid={snapToGrid}
                  showGrid={showGrid}
                  gridSize={gridSize}
                  canvasWidth={canvasSize.width}
                  canvasHeight={canvasSize.height}
                  isScrollable={false}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={handleBackToList}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveScreen}>
            {currentGroup?.id === "new" ? "Create Group" : "Update Group"}
          </Button>
        </DialogActions>
      </Dialog>

      <GroupForm
        open={crudModalOpen}
        onClose={handleCloseCrudModal}
        group={selectedGroup}
        mode={crudMode}
        onSave={handleSaveCrudModal}
        onModeChange={setCrudMode}
      />
    </Box>
  )
}

export default GroupManagement
