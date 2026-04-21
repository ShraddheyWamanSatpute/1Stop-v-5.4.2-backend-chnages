"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
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
} from "@mui/material"
import { themeConfig } from "../../../theme/AppTheme"
import {
  Add as AddIcon,
  ViewModule as GroupIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  AspectRatio as AspectRatioIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { v4 as uuidv4 } from "uuid"
// Removed direct Firebase imports - now using POS context
import { usePOS } from "../../../backend/context/POSContext"
import type { Card } from "../../../backend/context/POSContext"
import CanvasArea from "../../components/pos/CanvasArea"
import ProductListPanel from "../../components/pos/ProductListPanel"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"

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

  const featureTypes = {
    payment: {
      name: "Payment",
      color: themeConfig.colors.success.main,
      options: ["Cash", "Card", "Split Payment", "Account", "Voucher"],
      icon: <></>,
    },
    billWindow: {
      name: "Bill Window",
      color: themeConfig.brandColors.navy,
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
      color: themeConfig.brandColors.offWhite,
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
      color: themeConfig.brandColors.navy,
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
      color: themeConfig.brandColors.navy,
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
  }

// Removed fetchGroups function - now using POS context

// Removed direct Firebase functions - now using POS context CRUD operations

const GroupManagement: React.FC = () => {
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "groups")
  const canRemove = canDelete("pos", "groups")
  const { state: companyState } = useCompany()
  const { 
    state: posState, 
    refreshGroups,
    createGroup,
    updateGroup,
    deleteGroup
  } = usePOS()
  
  const [currentGroup, setCurrentGroup] = useState<ProductGroup | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDesigning, setIsDesigning] = useState(false)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  const [isGroupDesignerFullscreen, setIsGroupDesignerFullscreen] = useState(false)
  
  // Form states
  
  const { groups, loading, error } = posState

  const [cards, setCards] = useState<Card[]>([])
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  // Canvas settings
  const [canvasSize, setCanvasSize] = useState(canvasSizeOptions[1]) // Medium by default
  const [gridSize, setGridSize] = useState(20)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      refreshGroups()
    }
  }, [companyState.companyID, companyState.selectedSiteID, refreshGroups])

  const handleCreateNewGroup = () => {
    if (!canMutate) return
    const newGroup: ProductGroup = {
      id: "new",
      name: "New Group",
      description: "",
      layout: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setCurrentGroup(newGroup)
    setCards([])
    setIsDesigning(true)
  }

  const handleEditGroup = (group: ProductGroup) => {
    if (!canMutate) return
    setCurrentGroup(group)
    setCards(group.layout || [])
    setIsDesigning(true)
  }

  const handleDeleteGroup = async (id: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this group?")) return

    try {
      await deleteGroup(id)
      setSuccess("Group deleted successfully")
    } catch (error) {
      debugWarn("Error deleting group:", error)
    }
  }

  const handleBackToList = () => {
    setIsDesigning(false)
    setCurrentGroup(null)
    setCards([])
  }

  const handleAddProduct = (product: any) => {
    if (!canMutate) return
    const newCard: Card = {
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      name: product.name,
      price: product.price,
      type: "product",
      x: snapToGrid ? gridSize : 20,
      y: snapToGrid ? gridSize : 20,
      width: snapToGrid ? gridSize * 4 : 80,
      height: snapToGrid ? gridSize * 3 : 60,
      fontSize: 12,
      fontColor: themeConfig.brandColors.navy,
      cardColor: themeConfig.brandColors.offWhite,
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
      type: "function" as "product" | "category" | "function" | "modifier",
      name: featureType,
      x: snapToGrid ? gridSize : 20,
      y: snapToGrid ? gridSize * 2 : 40,
      width: cardWidth,
      height: cardHeight,
      fontSize: 12,
      fontColor:
        feature.color === themeConfig.brandColors.offWhite
          ? themeConfig.brandColors.navy
          : themeConfig.brandColors.offWhite,
      cardColor: feature.color,
      zIndex: cards.length + 1,
      content: option || feature.name,
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
        // Filter out undefined values before creating
        const createPayload: any = { ...groupData }
        delete createPayload.id // Remove the "new" id
        // Filter out undefined values
        Object.keys(createPayload).forEach(key => {
          if (createPayload[key] === undefined) {
            delete createPayload[key]
          }
        })
        await createGroup(createPayload)
        setSuccess("Group created successfully!")
      } else {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = { ...groupData, id: currentGroup.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateGroup(currentGroup.id, updatePayload)
        setSuccess("Group updated successfully!")
      }

      handleBackToList()
    } catch (error) {
      debugWarn("Error saving group:", error)
    }
  }

  const getFeatureIcon = (featureType: string) => {
    return featureTypes[featureType as keyof typeof featureTypes]?.icon || <></>
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' }
  ];

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting groups as ${format}`);
    // Export functionality would be implemented here
  };

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search groups..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={handleCreateNewGroup}
        createButtonLabel="Create Group"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit groups."
      />

      {/* Stats Cards */}
      <StatsSection
        stats={[
          {
            value: groups.length,
            label: "Total Groups",
            color: "primary"
          },
          {
            value: groups.filter(group => group.isDefault).length,
            label: "Default Groups",
            color: "success"
          },
          {
            value: groups.reduce((sum, group) => sum + (group.layout?.length || 0), 0),
            label: "Total Items",
            color: "info"
          },
          {
            value: groups.filter(group => group.tags.length > 0).length,
            label: "Tagged Groups",
            color: "warning"
          }
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}


      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateNewGroup} disabled={!canMutate}>
          Create New Group
        </Button>
      </Box>

      {groups.length > 0 ? (
        <Paper>
          <List>
            {groups.map((group, index) => (
              <ListItem key={group.id} divider={index < groups.length - 1}>
                <GroupIcon color="primary" sx={{ mr: 2 }} />
                <ListItemText
                  primary={group.name}
                  secondary={
                    <>
                      {group.description && <span>{group.description} • </span>}
                      {group.layout?.length || 0} items
                      {group.tags.length > 0 && (
                        <Box component="span" sx={{ ml: 1 }}>
                          {group.tags.map((tag: string, tagIndex: number) => (
                            <Chip key={tagIndex} label={tag} size="small" sx={{ mr: 0.5, mt: 0.5 }} />
                          ))}
                        </Box>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleEditGroup(group)} sx={{ mr: 1 }} disabled={!canMutate}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDeleteGroup(group.id)} color="error" disabled={!canRemove}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={GroupIcon}
            title="No groups created"
            description="Create your first group to get started. Groups help organize products and functions for quick access on till screens."
          />
        </Box>
      )}

      {/* Group Designer Dialog */}
      <Dialog
        open={isDesigning && currentGroup !== null}
        onClose={handleBackToList}
        maxWidth={isGroupDesignerFullscreen ? false : "lg"}
        fullWidth={!isGroupDesignerFullscreen}
        fullScreen={isGroupDesignerFullscreen}
        PaperProps={{
          sx: {
            height: isGroupDesignerFullscreen ? "100vh" : "90vh",
            maxHeight: isGroupDesignerFullscreen ? "100vh" : "90vh",
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GroupIcon />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {currentGroup?.id === "new" ? "Create New Group" : `Edit Group`}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentGroup?.name && currentGroup.id !== "new" ? currentGroup.name : "Design the layout and arrangement of items"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton 
                onClick={() => setIsGroupDesignerFullscreen(!isGroupDesignerFullscreen)}
                sx={{ color: 'inherit' }}
              >
                {isGroupDesignerFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
              <IconButton onClick={handleBackToList} sx={{ color: 'inherit' }}>
                <CloseIcon />
              </IconButton>
            </Box>
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
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveScreen} disabled={!canMutate}>
            {currentGroup?.id === "new" ? "Create Group" : "Update Group"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GroupManagement
