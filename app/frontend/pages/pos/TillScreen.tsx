"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  useTheme,
} from "@mui/material"
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon, // Add this import
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  LocalOffer as LocalOfferIcon,
  CardGiftcard as CardGiftcardIcon,
  Dialpad as DialpadIcon,
  ViewSidebar as ViewSidebarIcon,
  ViewModule as ViewModuleIcon,
  Settings as SettingsIcon,
  PointOfSale as PointOfSaleIcon,
  Money as MoneyIcon,
  Percent as PercentIcon,
  TableRestaurant as TableRestaurantIcon,
  Category as CategoryIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Grid3x3 as GridIcon,
} from "@mui/icons-material"
import { useNavigate, useParams } from "react-router-dom"
import { useCompany } from "../../../backend/context/CompanyContext"

// import { usePOS } from "../../../backend/context/POSContext" // Would use when implementing functions
import { v4 as uuidv4 } from "uuid"
import type { Card, TillScreen } from "../../../backend/context/POSContext"
import CanvasArea from "../../components/pos/CanvasArea"
import ProductListPanel from "../../components/pos/ProductListPanel"
import SaveScreenDialog from "../../components/pos/SaveScreenDialog"
import { themeConfig } from "../../../theme/AppTheme"

interface EnhancedCard extends Card {
  option?: string
  selected?: boolean
  text?: string
  data?: any
}

// Aspect ratio options
const aspectRatios = [
  { label: "16:9 (Widescreen)", value: "16:9", width: 1600, height: 900 },
  { label: "4:3 (Standard)", value: "4:3", width: 1600, height: 1200 },
  { label: "1:1 (Square)", value: "1:1", width: 1200, height: 1200 },
  { label: "21:9 (Ultrawide)", value: "21:9", width: 1680, height: 720 },
  { label: "Custom", value: "custom", width: 1600, height: 900 },
]

const TillScreenComponent: React.FC = () => {
  const theme = useTheme()
  const { screenId } = useParams<{ screenId?: string }>()
  const isEditing = Boolean(screenId)
  const navigate = useNavigate()
  const { state: companyState } = useCompany()
  const [cards, setCards] = useState<Card[]>([])
  const [scale, setScale] = useState(1)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [screenName, setScreenName] = useState("New Till Screen")

  // Add loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Loading state is used instead of separate isSaving state
  const [saveSuccess, setSaveSuccess] = useState(false)

  // New state for grid and layout options
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [gridSize, setGridSize] = useState(25)
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [canvasWidth, setCanvasWidth] = useState(1600)
  const [canvasHeight, setCanvasHeight] = useState(900)
  const [isScrollable, setIsScrollable] = useState(false)

  const featureTypes = React.useMemo(
    () => ({
      payment: {
        name: "Payment",
        color: themeConfig.colors.success.main,
        options: ["Cash", "Card", "Split Payment", "Account", "Voucher"],
        icon: <PaymentIcon />,
      },
      billWindow: {
        name: "Bill Window",
        // blue -> navy
        color: theme.palette.primary.main,
        options: ["Standard", "Compact", "Detailed", "Kitchen View"],
        icon: <ReceiptIcon />,
      },
      discount: {
        name: "Discount",
        color: themeConfig.colors.warning.main,
        options: ["Percentage", "Fixed Amount", "Item Discount"],
        icon: <LocalOfferIcon />,
      },
      promotion: {
        name: "Promotion",
        // pink -> off-white
        color: theme.palette.secondary.main,
        options: ["BOGO", "Bundle", "Happy Hour", "Special Offer"],
        icon: <CardGiftcardIcon />,
      },
      numpad: {
        name: "Number Pad",
        color: themeConfig.brandColors.navy,
        options: ["Standard", "With Function Keys"],
        icon: <DialpadIcon />,
      },
      sidebar: {
        name: "Sidebar",
        // blue-ish -> navy
        color: theme.palette.primary.main,
        options: ["Categories", "Recent Items", "Favorites"],
        icon: <ViewSidebarIcon />,
      },
      group: {
        name: "Group",
        color: themeConfig.brandColors.navy,
        options: ["Mini Till", "Quick Items", "Custom Group"],
        icon: <ViewModuleIcon />,
      },
      systemFunction: {
        name: "System Function",
        color: themeConfig.colors.error.main,
        options: ["Log Out", "End Shift", "Manager Functions", "Reports"],
        icon: <SettingsIcon />,
      },
      tillFunction: {
        name: "Till Function",
        // blue -> navy
        color: theme.palette.primary.main,
        options: ["Save", "Print", "Receipt", "Void", "Refund"],
        icon: <PointOfSaleIcon />,
      },
      serviceCharge: {
        name: "Service Charge",
        color: themeConfig.colors.success.main,
        options: ["Automatic", "Manual", "Remove"],
        icon: <MoneyIcon />,
      },
      tax: {
        name: "Tax",
        color: themeConfig.colors.warning.main,
        options: ["Add Tax", "Remove Tax", "Tax Exempt"],
        icon: <PercentIcon />,
      },
      tablePlan: {
        name: "Table Plan",
        color: themeConfig.colors.success.main,
        options: ["Main Floor", "Bar Area", "Outdoor", "Private Dining"],
        icon: <TableRestaurantIcon />,
      },
    }),
    [theme.palette.primary.main],
  )

  const handleAddProduct = (product: any) => {
    const newCard: Card = {
      id: uuidv4(),
      product,
      type: "product",
      x: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      y: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      width: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      height: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      fontSize: 14,
      // black/grey -> navy/off-white
      fontColor: theme.palette.primary.main,
      cardColor: theme.palette.secondary.main,
      zIndex: cards.length + 1,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setCards([...cards, newCard])
  }

  const handleAddFeature = (featureType: string, option = "", data?: any) => {
    const feature = featureTypes[featureType as keyof typeof featureTypes]
    if (!feature) return

    let cardWidth = 150
    let cardHeight = 80

    if (featureType === "numpad") {
      cardWidth = 200
      cardHeight = 300
    } else if (featureType === "billWindow") {
      cardWidth = 350
      cardHeight = 500
    }

    // Snap to grid if enabled
    if (snapToGrid) {
      cardWidth = Math.round(cardWidth / gridSize) * gridSize
      cardHeight = Math.round(cardHeight / gridSize) * gridSize
    }

    const newCard: EnhancedCard = {
      id: uuidv4(),
      type: featureType as "function" | "category" | "product" | "modifier",
      option: option,
      data: data,
      x: snapToGrid ? Math.round(100 / gridSize) * gridSize : 100,
      y: snapToGrid ? Math.round(200 / gridSize) * gridSize : 200,
      width: cardWidth,
      height: cardHeight,
      fontSize: 14,
      // white/pink -> off-white, but keep contrast on off-white cards
      fontColor: feature.color === theme.palette.secondary.main ? theme.palette.primary.main : theme.palette.secondary.main,
      cardColor: feature.color,
      zIndex: cards.length + 1,
      text: option || feature.name,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setCards([...cards, newCard])
  }

  const handleUpdateCards = (updatedCards: Card[]) => {
    setCards(updatedCards)
  }

  // Add delete functionality
  const handleDeleteScreen = async () => {
    if (!screenId || !companyState.companyID || !companyState.selectedSiteID) return

    if (window.confirm("Are you sure you want to delete this till screen? This action cannot be undone.")) {
      try {
        setIsLoading(true)
        // Would implement deleteTillScreen in POSContext
        console.log("Delete till screen:", screenId)
        navigate("/POS/TillManagement")
      } catch (error) {
        console.error("Error deleting till screen:", error)
        setError("Failed to delete till screen. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Update the handleSaveScreen function to ensure proper data structure
  const handleSaveScreen = async () => {
    try {
      if (!companyState.companyID || !companyState.selectedSiteID) {
        setError("Company or site information is missing")
        return
      }

      console.log("Saving screen with data:", { screenId, screenName, cards: cards.length }) // Debug log
      setIsLoading(true)
      setError(null)

      // Create screen data with proper structure
      const screenData: TillScreen = {
        id: screenId || uuidv4(),
        name: screenName,
        layout: {
          width: canvasWidth,
          height: canvasHeight,
          cards: cards,
          // white -> off-white
          backgroundColor: theme.palette.secondary.main,
          gridSize: gridSize
        },
        isActive: true,
        isDefault: false,
        createdAt: isEditing ? Date.now() : Date.now(),
        updatedAt: Date.now(),
      }

      console.log("Screen data to save:", screenData) // Debug log

      if (isEditing && screenId) {
        console.log("Updating existing screen") // Debug log
        // Would implement updateTillScreen in POSContext
        console.log("Update till screen:", screenData)
      } else {
        console.log("Creating new screen") // Debug log
        // Would implement saveTillScreen in POSContext
        const newId = "temp-id" // await saveTillScreen(companyState.companyID, companyState.selectedSiteID, screenData)
        if (!isEditing) {
          navigate(`/POS/TillScreen/Edit/${newId}`)
          return
        }
      }

      setSaveSuccess(true)
      setSaveDialogOpen(false)
      console.log("Screen saved successfully") // Debug log

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving till screen:", error)
      setError(`Failed to save till screen: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getFeatureIcon = (featureType: string) => {
    return featureTypes[featureType as keyof typeof featureTypes]?.icon || <CategoryIcon />
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle aspect ratio change
  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value)
    const ratio = aspectRatios.find((r) => r.value === value)
    if (ratio && value !== "custom") {
      setCanvasWidth(ratio.width)
      setCanvasHeight(ratio.height)
    }
  }

  useEffect(() => {
    if (isEditing && screenId && companyState.companyID && companyState.selectedSiteID) {
      console.log("Loading existing screen:", screenId) // Debug log
      setIsLoading(true)
      setError(null)

      // Would implement subscribeTillScreens in POSContext
      const unsubscribe = () => {} // subscribeTillScreens(companyState.companyID, companyState.selectedSiteID, (screens: any[]) => {
      console.log("Loaded screens for editing:", 0) // screens.length) // Debug log
      const screen = null // screens.find((s: any) => s.id === screenId)
      if (screen) {
        console.log("Found screen to edit:", screen) // Debug log
        setCards((screen as any).layout || [])
        setScreenName((screen as any).name)

        // Handle settings with proper defaults
        const settings = (screen as any).settings || {}
        setAspectRatio(settings.aspectRatio || "16:9")
        setCanvasWidth(settings.canvasWidth || 1600)
        setCanvasHeight(settings.canvasHeight || 900)
        setGridSize(settings.gridSize || 25)
        setSnapToGrid(settings.snapToGrid !== undefined ? settings.snapToGrid : true)
        setIsScrollable(settings.isScrollable || false)
        setShowGrid(true)
      } else {
        console.error("Screen not found:", screenId) // Debug log
        setError("Till screen not found")
      }
      setIsLoading(false)
      // })

      return () => unsubscribe()
    }
  }, [isEditing, screenId, companyState.companyID, companyState.selectedSiteID])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Exit fullscreen with Escape key
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }

      // Save with Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSaveScreen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  // Show loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Till Screen...
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth={false} disableGutters sx={{ height: "100vh", overflow: "hidden" }}>
      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, bgcolor: "error.light", color: "error.contrastText", mb: 2 }}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Success message */}
      {saveSuccess && (
        <Box sx={{ p: 2, bgcolor: "success.light", color: "success.contrastText", mb: 2 }}>
          <Typography>Till screen saved successfully!</Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", height: "100%", flexDirection: { xs: "column", md: "row" } }}>
        {/* Left Panel */}
        {!isFullscreen && (
          <Box
            sx={{
              width: { xs: "100%", md: 300 },
              height: { xs: "auto", md: "100%" },
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${themeConfig.colors.divider}`,
              borderBottom: { xs: `1px solid ${themeConfig.colors.divider}`, md: "none" },
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
        )}

        {/* Main Content - Canvas */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              py: 1,
              px: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: 1,
              borderColor: "divider",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton onClick={() => navigate("/POS")} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" component="h1">
                {isEditing ? `Edit: ${screenName}` : "New Till Screen"}
              </Typography>
            </Box>

            {/* Layout Controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1, sm: 2 },
                flexWrap: "wrap",
                justifyContent: { xs: "center", sm: "flex-start" },
              }}
            >
              {/* Aspect Ratio */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Aspect Ratio</InputLabel>
                <Select
                  value={aspectRatio}
                  label="Aspect Ratio"
                  onChange={(e) => handleAspectRatioChange(e.target.value)}
                >
                  {aspectRatios.map((ratio) => (
                    <MenuItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Grid Size */}
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Grid Size</InputLabel>
                <Select value={gridSize} label="Grid Size" onChange={(e) => setGridSize(Number(e.target.value))}>
                  <MenuItem value={10}>10px</MenuItem>
                  <MenuItem value={20}>20px</MenuItem>
                  <MenuItem value={25}>25px</MenuItem>
                  <MenuItem value={50}>50px</MenuItem>
                </Select>
              </FormControl>

              <Divider orientation="vertical" flexItem />

              {/* Grid Controls */}
              <FormControlLabel
                control={<Switch checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} size="small" />}
                label="Snap to Grid"
              />

              <FormControlLabel
                control={<Switch checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} size="small" />}
                label={<GridIcon />}
              />

              <FormControlLabel
                control={
                  <Switch checked={isScrollable} onChange={(e) => setIsScrollable(e.target.checked)} size="small" />
                }
                label="Scrollable"
              />

              <Divider orientation="vertical" flexItem />

              {/* Action Buttons */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={toggleFullscreen} size="small">
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>

                {isEditing && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteScreen}
                    size="small"
                    startIcon={<DeleteIcon />}
                  >
                    Delete
                  </Button>
                )}

                <Button
                  variant="contained"
                  onClick={isEditing ? handleSaveScreen : () => setSaveDialogOpen(true)}
                  size="small"
                  startIcon={<SaveIcon />}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : isEditing ? "Update Screen" : "Save Screen"}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Canvas Area */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: isScrollable ? "auto" : "hidden",
              p: 2,
              minHeight: isScrollable ? "auto" : 0,
            }}
          >
            <CanvasArea
              cards={cards}
              onUpdateCards={handleUpdateCards}
              scale={scale}
              onScaleChange={setScale}
              snapToGrid={snapToGrid}
              showGrid={showGrid}
              gridSize={gridSize}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              isScrollable={isScrollable}
            />
          </Box>
        </Box>
      </Box>

      {/* Save Screen Dialog - Only show for new screens */}
      {!isEditing && (
        <SaveScreenDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          onSave={(name, _description) => {
            setScreenName(name)
            handleSaveScreen()
          }}
          initialName={screenName}
        />
      )}
    </Container>
  )
}

export default TillScreenComponent
