"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useStock } from "../../../../backend/context/StockContext"
import type { StockCount, StockCountItem, StockPreset } from "../../../../backend/interfaces/Stock"
import StepAdjuster from "../../reusable/StepAdjuster"
import { useStockSettings } from "../../../hooks/useStockSettings"

// TabPanel component for location tabs
interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

interface StockCountFormProps {
  stockCount?: StockCount | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: StockCount) => void
}

export interface StockCountFormRef {
  submit: () => void
  saveAsPreset: () => void
  hasItems: () => boolean
}

const StockCountForm = forwardRef<StockCountFormRef, StockCountFormProps>(({
  stockCount,
  mode,
  onSave,
}, ref) => {
  const { 
    state: stockState, 
    fetchPresetsFromDB,
    savePresetToDB,
    fetchLocations,
    refreshProducts,
  } = useStock()
  const { products, measures } = stockState
  const { stockDecimalPlaces } = useStockSettings()

  const [searchTerm, setSearchTerm] = useState<string>("")
  const [groupBy, setGroupBy] = useState<string>("none")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  
  // Locations and tabs state
  const [locations, setLocations] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<number>(0)
  
  // Presets state
  const [presets, setPresets] = useState<StockPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [, setIsPresetSelected] = useState<boolean>(false)
  
  // Dialog states
  const [showSavePresetDialog, setShowSavePresetDialog] = useState<boolean>(false)
  const [presetNameInput, setPresetNameInput] = useState<string>("")
  const [showMissingItemsDialog, setShowMissingItemsDialog] = useState<boolean>(false)
  const [missingItems, setMissingItems] = useState<any[]>([])
  
  // Notifications
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  // Stock count state
  const [stockCountData, setStockCountData] = useState<StockCount>({
    date: new Date().toISOString().split("T")[0],
    dateUK: new Date().toISOString().split("T")[0],
    status: "Awaiting Submission",
    items: [],
    reference: "", // Add reference field
    description: "", // Add description field
    presetName: "",
    notes: "",
    locations: {}, // Location-based items structure
  })

  const [validationErrors, setValidationErrors] = useState<{
    items?: string
    date?: string
    reference?: string
  }>({})

  const isReadOnly = mode === 'view'

  const normalizeDateForDateInput = (raw: any): string => {
    if (!raw) return new Date().toISOString().split("T")[0]
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().split("T")[0]
    const s = String(raw).trim()
    if (!s) return new Date().toISOString().split("T")[0]
    // Already ISO-ish (yyyy-MM-dd or yyyy-MM-ddTHH:mm...)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    // UK format dd/MM/yyyy (from older saved counts / tables)
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    // Last resort: try Date parsing
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
    return new Date().toISOString().split("T")[0]
  }

  // Ensure products are loaded when form mounts
  useEffect(() => {
    if (products.length === 0) {
      refreshProducts().catch(err => console.warn('Failed to refresh products:', err))
    }
  }, [products.length, refreshProducts])

  // Load stock count data when editing - enrich items with product/measure data
  useEffect(() => {
    if (stockCount && mode !== 'create') {
      const normalizedDate = normalizeDateForDateInput((stockCount as any).date || (stockCount as any).dateUK || (stockCount as any).timestamp)
      const normalizedDateUK = normalizeDateForDateInput((stockCount as any).dateUK || (stockCount as any).date || (stockCount as any).timestamp)

      // Enrich items with product and measure names
      const enrichedItems = (stockCount.items || []).map(item => {
        const productId = item.id || item.productId || ""
        const product = products.find(p => p.id === productId)
        const measure = measures.find(m => m.id === (item.measureId || ""))
        
        return {
          ...item,
          id: productId || item.id || "",
          productId: productId || item.productId || "",
          name: product?.name || item.name || item.productName || "",
          productName: product?.name || item.productName || item.name || "",
          measureId: item.measureId || "",
          unitName: measure?.name || item.unitName || "",
        }
      })
      
      setStockCountData({
        ...stockCount,
        // IMPORTANT: <input type="date"> must be yyyy-MM-dd (not dd/MM/yyyy)
        date: normalizedDate,
        dateUK: normalizedDateUK,
        items: enrichedItems,
      })
      if (stockCount.presetName) {
        setSelectedPreset(stockCount.presetName)
        setIsPresetSelected(true)
      }
    }
  }, [stockCount, mode, products, measures])

  // Load presets
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const presetsData = await fetchPresetsFromDB()
        setPresets(presetsData || [])
      } catch (error) {
        console.error("Error loading presets:", error)
      }
    }
    loadPresets()
  }, [fetchPresetsFromDB])

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locationsData = await fetchLocations()
        setLocations(locationsData || [])
      } catch (error) {
        console.error("Error loading locations:", error)
      }
    }
    loadLocations()
  }, [fetchLocations])



  // Handle product selection
  const handleProductChange = (index: number, product: any) => {
    console.log('handleProductChange called:', { index, product })
    if (!product) return

    // Get the default purchase measure or the first available purchase measure
    let defaultMeasureId = ""
    let defaultUnitName = ""
    
    if (product.purchase?.units && product.purchase.units.length > 0) {
      // Try to use the default measure first
      if (product.purchase.defaultMeasure) {
        const defaultMeasure = product.purchase.units.find((unit: any) => unit.measure === product.purchase.defaultMeasure)
        if (defaultMeasure) {
          defaultMeasureId = defaultMeasure.measure
          defaultUnitName = measures?.find(m => m.id === defaultMeasureId)?.name || ""
        }
      }
      
      // If no default or default not found, use the first available purchase measure
      if (!defaultMeasureId) {
        defaultMeasureId = product.purchase.units[0].measure
        defaultUnitName = measures?.find(m => m.id === defaultMeasureId)?.name || ""
      }
    }

    // Calculate previous quantity from latest stock count
    const previousQuantity = getPreviousStockQuantity(product.id, defaultMeasureId)

    console.log('Updating item with:', {
      id: product.id,
      name: product.name,
      measureId: defaultMeasureId,
      unitName: defaultUnitName,
      previousQuantity: previousQuantity,
    })

    // Use the location-based update function
    updateItemInCurrentLocation(index, {
      id: product.id,
      name: product.name,
      measureId: defaultMeasureId,
      unitName: defaultUnitName,
      previousQuantity: previousQuantity,
      salesDivisionId: product.salesDivisionId || "",
      categoryId: product.categoryId || "",
      subcategoryId: product.subcategoryId || "",
      type: product.type || "",
    })
  }


  // Filter, sort, and group products based on search and options
  const getFilteredProducts = () => {
    let filtered = products || []
    console.log('getFilteredProducts - products:', products?.length, 'filtered:', filtered.length)

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = ""
      let bValue = ""

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "category":
          aValue = a.categoryName || a.category || ""
          bValue = b.categoryName || b.category || ""
          break
        case "subcategory":
          aValue = a.subcategoryName || a.subCategory || ""
          bValue = b.subcategoryName || b.subCategory || ""
          break
        case "salesDivision":
          aValue = a.salesDivisionName || a.salesDivision || ""
          bValue = b.salesDivisionName || b.salesDivision || ""
          break
        case "type":
          aValue = a.type || ""
          bValue = b.type || ""
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

    return filtered
  }

  // Group products based on the selected grouping option
  const getGroupedProducts = () => {
    const filteredProducts = getFilteredProducts()
    
    if (groupBy === "none") {
      return { "All Products": filteredProducts }
    }

    const grouped: Record<string, any[]> = {}
    
    filteredProducts.forEach(product => {
      let groupKey = "Uncategorized"
      
      switch (groupBy) {
        case "salesDivision":
          groupKey = product.salesDivisionName || product.salesDivision || "Uncategorized"
          break
        case "category":
          groupKey = product.categoryName || product.category || "Uncategorized"
          break
        case "subcategory":
          groupKey = product.subcategoryName || product.subCategory || "Uncategorized"
          break
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(product)
    })
    
    // Sort groups by sales division first, then by category
    const sortedGroups: Record<string, any[]> = {}
    const groupEntries = Object.entries(grouped)
    
    // Sort groups alphabetically, but put "Uncategorized" at the end
    groupEntries.sort(([a], [b]) => {
      if (a === "Uncategorized") return 1
      if (b === "Uncategorized") return -1
      return a.localeCompare(b)
    })
    
    groupEntries.forEach(([key, value]) => {
      sortedGroups[key] = value
    })
    
    return sortedGroups
  }


  // Load all products for full count
  const loadAllProducts = () => {
    const items: StockCountItem[] = products.map(product => {
      const systemQuantity = product.predictedStock || 0
      const measure = measures.find(m => m.id === product.measureId) || measures[0]
      
      return {
        id: product.id!,
        name: product.name,
        measureId: measure.id,
        unitName: measure.name,
        countedQuantity: 0, // To be filled during count
        previousQuantity: systemQuantity,
        countedTotal: 0,
        salesDivisionId: product.salesDivisionId || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        type: product.type || "",
        systemQuantity: systemQuantity,
      }
    })
    setStockCountData(prev => ({ ...prev, items }))
    setNotification({
      open: true,
      message: `Loaded ${items.length} products for full count`,
      severity: "success"
    })
  }

  // Add missing items to the count
  const handleAddMissingItems = () => {
    const missingItemsToAdd = missingItems.map(product => {
      const systemQuantity = product.predictedStock || 0
      const measure = measures.find(m => m.id === product.measureId) || measures[0]
      
      return {
        id: product.id!,
        name: product.name,
        measureId: measure.id,
        unitName: measure.name,
        countedQuantity: 0, // To be filled during count
        previousQuantity: 0, // Could be enhanced to get from latest counts
        countedTotal: 0,
        salesDivisionId: product.salesDivisionId || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        type: product.type || "",
        systemQuantity: systemQuantity,
      }
    })

    setStockCountData(prev => ({
      ...prev,
      items: [...prev.items, ...missingItemsToAdd]
    }))

    setShowMissingItemsDialog(false)
    setNotification({
      open: true,
      message: `Added ${missingItemsToAdd.length} missing items to the count`,
      severity: "success"
    })
  }

  // Save without missing items
  const handleSaveWithoutMissingItems = () => {
    setShowMissingItemsDialog(false)
    handleSubmit()
  }

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault()
    }
    
    // Enhanced validation
    const errors: any = {}
    
    if (!stockCountData.reference?.trim()) {
      errors.reference = 'Stock count reference is required'
    }

    // Check if there are items
    if (stockCountData.items.length === 0) {
      errors.items = "At least one item is required"
    }

    const validItems = (stockCountData.items || []).filter((item) => {
      const productId = String(item.id || item.productId || "").trim()
      const quantity = Number(item.countedQuantity ?? item.quantity ?? 0)
      return productId && quantity > 0
    })

    if (stockCountData.items.length > 0 && validItems.length !== stockCountData.items.length) {
      errors.items = "Every row must include a product and a counted quantity greater than 0"
    }
    
    if (!stockCountData.date) {
      errors.date = "Date is required"
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const submitData = {
      ...stockCountData,
      items: validItems, // Universal items list
    }

    setValidationErrors({})
    onSave(submitData)
  }

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(),
    saveAsPreset: () => setShowSavePresetDialog(true),
    hasItems: () => stockCountData.items.length > 0
  }))

  const handleInputChange = (field: keyof StockCount, value: any) => {
    setStockCountData(prev => ({
      ...prev,
      [field]: value
    }))
  }


  // Helper function to get previous stock quantity for a product
  const getPreviousStockQuantity = (productId: string, measureId: string) => {
    if (!productId || !measureId || !stockState.latestCounts) return 0
    
    const latestCount = stockState.latestCounts[productId]
    if (!latestCount) return 0
    
    // Get the base quantity from the latest count
    const baseQuantity = latestCount.baseQuantity || 0
    
    // Convert to the selected measure if needed
    if (measureId && measures) {
      const measure = measures.find(m => m.id === measureId)
      if (measure) {
        // Convert from base units to the selected measure
        const measureQuantity = Number(measure.quantity) || 1
        if (measureQuantity > 0) {
          let convertedQuantity = baseQuantity / measureQuantity
          
          // Handle base unit conversions
          const unit = String(measure.unit || '').toLowerCase().trim()
          if (unit === "kg") {
            convertedQuantity /= 1000
          } else if (unit === "l" || unit === "litre" || unit === "liter") {
            convertedQuantity /= 1000
          }
          
          return convertedQuantity
        }
      }
    }
    
    return baseQuantity
  }

  // Helper function to get available measures for a specific product
  const getAvailableMeasuresForProduct = (productId: string) => {
    if (!productId || !products || !measures) return []
    
    const product = products.find(p => p.id === productId)
    if (!product) return []

    // Debug: Log the product structure to understand the actual data
    console.log("Product structure for", product.name, ":", product)
    
    // Try different possible structures for purchase units
    let purchaseMeasureIds: string[] = []
    
    if (product.purchase?.units) {
      // Structure 1: units array with 'measure' field
      purchaseMeasureIds = product.purchase.units.map(unit => unit.measure).filter(Boolean)
      console.log("Found purchase units (measure field):", purchaseMeasureIds)
    } else if (product.purchase?.defaultMeasure) {
      // Structure 2: just a default measure
      purchaseMeasureIds = [product.purchase.defaultMeasure]
      console.log("Found default purchase measure:", purchaseMeasureIds)
    } else if ((product as any).purchaseMeasure) {
      // Structure 3: direct purchaseMeasure field
      purchaseMeasureIds = [(product as any).purchaseMeasure]
      console.log("Found direct purchase measure:", purchaseMeasureIds)
    }
    
    // Filter measures to only include those available for purchase
    const availableMeasures = measures.filter(measure => purchaseMeasureIds.includes(measure.id))
    console.log("Available measures for", product.name, ":", availableMeasures.map(m => m.name))
    
    return availableMeasures
  }

  // Helper functions for location-based stock counts
  const getCurrentLocationId = () => {
    if (activeTab === 0) return "all" // "All Locations" tab
    if (activeTab === locations.length + 1) return "no-location" // "No Location" tab
    return locations[activeTab - 1]?.id || ""
  }

  const getCurrentLocationItems = () => {
    // Return universal items list - same items across all locations
    return stockCountData.items || []
  }


  const addItemToCurrentLocation = () => {
    const newItem = {
      id: "",
      name: "",
      measureId: "",
      unitName: "",
      countedQuantity: 0,
      countedTotal: 0,
      locationTotals: {}, // Initialize location-specific totals
      previousQuantity: 0,
      salesDivisionId: "",
      categoryId: "",
      subcategoryId: "",
      type: "",
    }
    
    // Add to universal items list
    setStockCountData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItemFromCurrentLocation = (index: number) => {
    const locationId = getCurrentLocationId()
    if (locationId === "all") {
      // For "All Locations" tab, we don't allow direct item removal
      return
    }
    
    // Remove from universal items list
    setStockCountData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItemInCurrentLocation = (index: number, changes: Partial<StockCountItem>) => {
    const locationId = getCurrentLocationId()
    if (locationId === "all") {
      // For "All Locations" tab, we don't allow direct item updates
      return
    }
    
    // Update universal items list
    setStockCountData(prev => {
      const updatedItems = [...prev.items]
      updatedItems[index] = { ...updatedItems[index], ...changes }
      
      return {
        ...prev,
        items: updatedItems
      }
    })
  }


  // Show notification
  const showNotification = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setNotification({
      open: true,
      message,
      severity,
    })
  }

  // Save preset functionality
  const handleSavePreset = async () => {
    if (!presetNameInput.trim()) {
      showNotification("Please enter a preset name", "warning")
      return
    }

    if (stockCountData.items.length === 0) {
      showNotification("Please add items before saving preset", "warning")
      return
    }

    const presetData = {
      name: presetNameInput.trim(),
      items: stockCountData.items.map((item, index) => ({
        index,
        itemID: item.id,
        unitID: item.measureId,
      })),
    }

    try {
      await savePresetToDB(presetData)
      showNotification("Preset saved successfully!", "success")
      
      // Refresh presets
      const updatedPresets = await fetchPresetsFromDB()
      setPresets(updatedPresets || [])
      
      // Close dialog and reset
      setShowSavePresetDialog(false)
      setPresetNameInput("")
    } catch (error) {
      console.error("Error saving preset:", error)
      showNotification("Failed to save preset. Please try again.", "error")
    }
  }

  // Check for missing items when loading preset
  const checkForMissingItems = (presetItems: any[]) => {
    const missing: any[] = []
    
    presetItems.forEach(presetItem => {
      const product = products?.find(p => p.id === presetItem.itemID)
      const measure = measures?.find(m => m.id === presetItem.unitID)
      
      if (!product) {
        missing.push({
          type: 'product',
          id: presetItem.itemID,
          name: 'Unknown Product'
        })
      } else if (!measure) {
        missing.push({
          type: 'measure',
          id: presetItem.unitID,
          name: 'Unknown Measure'
        })
      } else {
        // Check if the measure is available for purchase on this product
        const availableMeasures = getAvailableMeasuresForProduct(product.id)
        const isMeasureAvailable = availableMeasures.some(m => m.id === presetItem.unitID)
        
        if (!isMeasureAvailable) {
          missing.push({
            type: 'measure_not_available',
            id: presetItem.unitID,
            name: `${measure.name} (not available for purchase on ${product.name})`
          })
        }
      }
    })
    
    return missing
  }

  // Load preset with missing items check
  const loadPresetWithCheck = async (presetId: string) => {
    if (!presetId) return

    try {
      const preset = presets.find(p => p.id === presetId)
      if (!preset || !preset.items) return

      // Check for missing items
      const missing = checkForMissingItems(preset.items)
      
      if (missing.length > 0) {
        setMissingItems(missing)
        setShowMissingItemsDialog(true)
        return
      }

      // Load preset items into all locations
      const presetItems = preset.items.map(item => {
        const product = products?.find(p => p.id === item.itemID)
        const measureId = item.unitID || ""
        const unitName = measures?.find(m => m.id === measureId)?.name || "Unknown Unit"
        
        return {
          id: item.itemID || "",
          name: product?.name || "Unknown Product",
          measureId: measureId,
          unitName: unitName,
          countedQuantity: 0,
          countedTotal: 0,
          locationTotals: {}, // Initialize location-specific totals
          previousQuantity: 0,
          salesDivisionId: product?.salesDivisionId || "",
          categoryId: product?.categoryId || "",
          subcategoryId: product?.subcategoryId || "",
          type: product?.type || "",
        }
      })

      setStockCountData(prev => ({
        ...prev,
        items: presetItems, // Universal items list
        presetId: preset.id || "",
        presetName: preset.name,
      }))
      setIsPresetSelected(true)
      showNotification(`Loaded preset: ${preset.name}`, "success")
    } catch (error) {
      console.error("Error loading preset:", error)
      showNotification("Failed to load preset", "error")
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px' }}>
      <Paper sx={{ mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Reference"
                  value={stockCountData.reference || ""}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  error={!!validationErrors.reference}
                  helperText={validationErrors.reference}
                  disabled={isReadOnly}
                  placeholder="e.g., SC-2024-001"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={stockCountData.dateUK}
                  onChange={(e) => handleInputChange('dateUK', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={!!validationErrors.date}
                  helperText={validationErrors.date}
                  disabled={isReadOnly}
                  required
                />
              </Grid>



              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Load from Preset</InputLabel>
                  <Select
                    value={selectedPreset}
                    label="Load from Preset"
                    onChange={(e) => {
                      setSelectedPreset(e.target.value)
                      loadPresetWithCheck(e.target.value)
                    }}
                    disabled={isReadOnly}
                  >
                    <MenuItem value="">None</MenuItem>
                    {presets.map((preset) => (
                      <MenuItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Search, Filter, Sort, and Group Options */}
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 2, 
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: 'grey.50',
                  borderRadius: 1,
                  mb: 2
                }}>
                  {/* Search Bar */}
                <TextField
                    size="small"
                    label="Search Products"
                    placeholder="Search by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: '250px' }}
                  />

                  {/* Group By Dropdown */}
                  <FormControl size="small" sx={{ minWidth: '150px' }}>
                    <InputLabel>Group By</InputLabel>
                    <Select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      label="Group By"
                    >
                      <MenuItem value="none">No Grouping</MenuItem>
                      <MenuItem value="salesDivision">Sales Division</MenuItem>
                      <MenuItem value="category">Category</MenuItem>
                      <MenuItem value="subcategory">Subcategory</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Sort By Dropdown */}
                  <FormControl size="small" sx={{ minWidth: '150px' }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      label="Sort By"
                    >
                      <MenuItem value="name">Product Name</MenuItem>
                      <MenuItem value="category">Category</MenuItem>
                      <MenuItem value="subcategory">Subcategory</MenuItem>
                      <MenuItem value="salesDivision">Sales Division</MenuItem>
                      <MenuItem value="type">Product Type</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Sort Direction */}
                  <FormControl size="small" sx={{ minWidth: '120px' }}>
                    <InputLabel>Direction</InputLabel>
                    <Select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
                      label="Direction"
                    >
                      <MenuItem value="asc">A → Z</MenuItem>
                      <MenuItem value="desc">Z → A</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Clear Filters Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSearchTerm("")
                      setGroupBy("none")
                      setSortBy("name")
                      setSortDirection("asc")
                    }}
                    sx={{ ml: 'auto' }}
                  >
                    Clear All
                  </Button>
                </Box>
              </Grid>

              {/* Stock Items Table */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {!isReadOnly && (
                    <>
                      {stockCountData.countType === "full" && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={loadAllProducts}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          Load All Products
                        </Button>
                      )}
                    </>
                  )}
                </Box>

                {validationErrors.items && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationErrors.items}
                  </Alert>
                )}

                {/* Location Tabs */}
                <Box sx={{ width: '100%' }}>
                  <Tabs 
                    value={activeTab} 
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    aria-label="location tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab label="All Locations" />
                    {locations.map((location) => (
                      <Tab key={location.id} label={location.name} />
                    ))}
                    <Tab label="No Location" />
                  </Tabs>

                  {/* All Locations Tab */}
                  <TabPanel value={activeTab} index={0}>
                    <Box sx={{ p: 2 }}>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Product</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Measure</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Previous</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                            {(() => {
                              const allItems = getCurrentLocationItems()
                              const groupedItems = getGroupedProducts()
                              
                              return Object.entries(groupedItems).map(([groupName, groupProducts]) => {
                                // Only show groups that have items in the current stock count
                                const hasItemsInGroup = allItems.some(item => 
                                  groupProducts.some(p => p.id === item.id)
                                )
                                
                                if (!hasItemsInGroup && groupBy !== "none") return null
                                
                                return (
                                  <React.Fragment key={groupName}>
                                    {/* Group Header */}
                                    {groupBy !== "none" && (
                                      <TableRow>
                                        <TableCell 
                                          colSpan={4} 
                                          sx={{ 
                                            backgroundColor: themeConfig.brandColors.navy, 
                                            color: themeConfig.brandColors.offWhite,
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            py: 1
                                          }}
                                        >
                                          {groupName}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    
                                    {/* Group Items */}
                                    {allItems.map((item, index) => {
                                      // Check if this item belongs to the current group
                                      const itemProduct = groupProducts.find(p => p.id === item.id)
                                      if (!itemProduct && groupBy !== "none") return null
                                      
                                      return (
                                        <TableRow key={`all-${item.id || 'new'}-${index}`}>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Typography variant="body2">{item.name || "N/A"}</Typography>
                                          </TableCell>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Typography variant="body2">{item.unitName || "N/A"}</Typography>
                                          </TableCell>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Typography variant="body2">{(item.previousQuantity || 0).toFixed(stockDecimalPlaces)}</Typography>
                                          </TableCell>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Typography variant="body2">
                                              {(() => {
                                                // Calculate total across all locations including "No Location"
                                                if (item.locationTotals) {
                                                  const totalAcrossLocations = Object.values(item.locationTotals).reduce((sum, total) => sum + (total || 0), 0)
                                                  return totalAcrossLocations.toFixed(stockDecimalPlaces)
                                                }
                                                return (item.countedTotal || 0).toFixed(stockDecimalPlaces)
                                              })()}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </React.Fragment>
                                )
                              })
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </TabPanel>

                  {/* Individual Location Tabs */}
                  {locations.map((location, locationIndex) => (
                    <TabPanel key={location.id} value={activeTab} index={locationIndex + 1}>
                      <Box sx={{ p: 2 }}>
                        
                        <TableContainer 
                          component={Paper} 
                          sx={{ 
                            overflowX: 'visible',
                            maxHeight: { xs: '400px', sm: '500px', md: '600px' },
                            width: 'max-content',
                            minWidth: '100%'
                          }}
                        >
                          <Table 
                            size="small" 
                            sx={{ 
                              tableLayout: 'auto', 
                              width: 'max-content',
                              minWidth: '100%'
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Product</TableCell>
                                <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Measure</TableCell>
                                <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Counting</TableCell>
                                <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Total</TableCell>
                                {!isReadOnly && <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</TableCell>}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(() => {
                                const items = getCurrentLocationItems()
                                const groupedItems = getGroupedProducts()
                                
                                return Object.entries(groupedItems).map(([groupName, groupProducts]) => {
                                  // Only show groups that have items in the current stock count
                                  const hasItemsInGroup = items.some(item => 
                                    groupProducts.some(p => p.id === item.id)
                                  )
                                  
                                  if (!hasItemsInGroup && groupBy !== "none") return null
                                  
                                  return (
                                    <React.Fragment key={groupName}>
                                      {/* Group Header */}
                                      {groupBy !== "none" && (
                                        <TableRow>
                                          <TableCell 
                                            colSpan={isReadOnly ? 4 : 5} 
                                            sx={{ 
                                              backgroundColor: themeConfig.brandColors.navy, 
                                              color: themeConfig.brandColors.offWhite,
                                              fontWeight: 'bold',
                                              textAlign: 'center',
                                              py: 1
                                            }}
                                          >
                                            {groupName}
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      
                                      {/* Group Items */}
                                      {items.map((item, index) => {
                                        // Check if this item belongs to the current group
                                        const itemProduct = groupProducts.find(p => p.id === item.id)
                                        if (!itemProduct && groupBy !== "none") return null
                                        
                                        return (
                                          <TableRow key={`${location.id}-${item.id || 'new'}-${index}`}>
                                            <TableCell sx={{ 
                                              textAlign: 'center',
                                              width: 'auto',
                                              minWidth: 'fit-content',
                                              maxWidth: 'none',
                                              overflow: 'visible',
                                              padding: '8px'
                                            }}>
                            <Autocomplete
                              size="small"
                              options={getFilteredProducts()}
                              getOptionLabel={(option) => option.name || ""}
                              isOptionEqualToValue={(option, value) => option.id === value.id}
                                                value={item.id && item.name ? getFilteredProducts().find(p => p.id === item.id) || null : null}
                                                groupBy={(option) => {
                                                  if (groupBy === "none") return ""
                                                  
                                                  switch (groupBy) {
                                                    case "salesDivision":
                                                      return option.salesDivisionName || option.salesDivision || "Uncategorized"
                                                    case "category":
                                                      return option.categoryName || option.category || "Uncategorized"
                                                    case "subcategory":
                                                      return option.subcategoryName || option.subCategory || "Uncategorized"
                                                    default:
                                                      return ""
                                                  }
                                                }}
                                                onChange={(_, newValue) => {
                                                  console.log('Autocomplete onChange:', { index, newValue, currentItem: item })
                                                  handleProductChange(index, newValue)
                                                }}
                              disabled={isReadOnly}
                              renderInput={(params) => (
                                                  <TextField 
                                                    {...params} 
                                                    placeholder="Select product"
                                                    sx={{
                                                      '& .MuiInputBase-input': {
                                                        fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                                      }
                                                    }}
                                                  />
                                                )}
                                                sx={{ 
                                                  width: '100%',
                                                  minWidth: '200px',
                                                  '& .MuiAutocomplete-inputRoot': {
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                                  }
                                                }}
                            />
                          </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                            {!isReadOnly ? (
                                                <FormControl 
                                size="small"
                                                  sx={{ 
                                                    width: 'auto',
                                                    minWidth: 'fit-content',
                                                    maxWidth: '100%'
                                                  }}
                                                >
                                                  <Select
                                                    value={item.measureId || ""}
                                                    onChange={(e) => {
                                                      const selectedMeasure = getAvailableMeasuresForProduct(item.id).find(m => m.id === e.target.value)
                                                      const previousQuantity = getPreviousStockQuantity(item.id, e.target.value)
                                                      updateItemInCurrentLocation(index, {
                                                        measureId: e.target.value,
                                                        unitName: selectedMeasure?.name || "Unknown Unit",
                                                        previousQuantity: previousQuantity,
                                                      })
                                                    }}
                                                    displayEmpty
                                                    sx={{
                                                      '& .MuiSelect-select': {
                                                        fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                                      }
                                                    }}
                                                  >
                                                    {getAvailableMeasuresForProduct(item.id).map((measure) => (
                                                      <MenuItem 
                                                        key={measure.id} 
                                                        value={measure.id}
                                                        sx={{
                                                          fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                                        }}
                                                      >
                                                        {measure.name}
                                                      </MenuItem>
                                                    ))}
                                                  </Select>
                                                </FormControl>
                            ) : (
                              <Typography variant="body2">
                                {item.unitName || "N/A"}
                              </Typography>
                            )}
                          </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                            <StepAdjuster
                                                  value={0}
                                        onChange={(value) => {
                                          const locationId = getCurrentLocationId()
                                          const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                          const newLocationTotal = currentLocationTotal + value
                                          
                                          updateItemInCurrentLocation(index, {
                                            locationTotals: {
                                              ...item.locationTotals,
                                              [locationId]: newLocationTotal
                                            }
                                          })
                                        }}
                                      />
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TextField
                                          id={`counted-input-${location.id}-${index}`}
                                          size="small"
                                          type="number"
                                          placeholder="Enter amount"
                                          defaultValue=""
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              const inputValue = parseFloat((e.target as HTMLInputElement).value) || 0
                                              const locationId = getCurrentLocationId()
                                              const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                              const newLocationTotal = currentLocationTotal + inputValue
                                              
                                              updateItemInCurrentLocation(index, {
                                                locationTotals: {
                                                  ...item.locationTotals,
                                                  [locationId]: newLocationTotal
                                                }
                                              })
                                              ;(e.target as HTMLInputElement).value = ""
                                            }
                                          }}
                                          sx={{
                                            width: '80px',
                                            '& .MuiInputBase-input': {
                                              textAlign: 'center',
                                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                            }
                                          }}
                                        />
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            const inputValue = parseFloat((document.querySelector(`#counted-input-${location.id}-${index}`) as HTMLInputElement)?.value) || 0
                                            const locationId = getCurrentLocationId()
                                            const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                            const newLocationTotal = currentLocationTotal + inputValue
                                            
                                            updateItemInCurrentLocation(index, {
                                              locationTotals: {
                                                ...item.locationTotals,
                                                [locationId]: newLocationTotal
                                              }
                                            })
                                            ;(document.querySelector(`#counted-input-${location.id}-${index}`) as HTMLInputElement).value = ""
                                          }}
                                          sx={{ 
                                            p: 0.5,
                                            '& .MuiSvgIcon-root': {
                                              fontSize: '1rem'
                                            }
                                          }}
                                        >
                                          <AddIcon />
                                        </IconButton>
                                      </Box>
                                    </Box>
                          </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                            <Typography variant="body2">
                                                {(() => {
                                                  // Show location-specific total
                                                  const locationId = getCurrentLocationId()
                                                  if (item.locationTotals && item.locationTotals[locationId] !== undefined) {
                                                    return item.locationTotals[locationId].toFixed(stockDecimalPlaces)
                                                  }
                                                  return (item.countedTotal || 0).toFixed(stockDecimalPlaces)
                                                })()}
                            </Typography>
                          </TableCell>
                          {!isReadOnly && (
                                    <TableCell sx={{ textAlign: 'center' }}>
                              <IconButton
                                color="error"
                                        onClick={() => removeItemFromCurrentLocation(index)}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                                      )
                                    })}
                                  </React.Fragment>
                                )
                              })
                            })()}
                    </TableBody>
                  </Table>
                </TableContainer>
                        
                        {!isReadOnly && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={addItemToCurrentLocation}
                              size="small"
                            >
                              Add Item
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </TabPanel>
                  ))}

                  {/* No Location Tab */}
                  <TabPanel value={activeTab} index={locations.length + 1}>
                    <Box sx={{ p: 2 }}>
                      <TableContainer 
                        component={Paper} 
                        sx={{ 
                          overflowX: 'visible',
                          maxHeight: { xs: '400px', sm: '500px', md: '600px' },
                          width: 'max-content',
                          minWidth: '100%'
                        }}
                      >
                        <Table 
                          size="small" 
                          sx={{ 
                            tableLayout: 'auto', 
                            width: 'max-content',
                            minWidth: '100%'
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Product</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Measure</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Counting</TableCell>
                              <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Total</TableCell>
                              {!isReadOnly && <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(() => {
                              const items = getCurrentLocationItems()
                              const groupedItems = getGroupedProducts()
                              
                              return Object.entries(groupedItems).map(([groupName, groupProducts]) => {
                                // Only show groups that have items in the current stock count
                                const hasItemsInGroup = items.some(item => 
                                  groupProducts.some(p => p.id === item.id)
                                )
                                
                                if (!hasItemsInGroup && groupBy !== "none") return null
                                
                                return (
                                  <React.Fragment key={groupName}>
                                    {/* Group Header */}
                                    {groupBy !== "none" && (
                                      <TableRow>
                                        <TableCell 
                                          colSpan={isReadOnly ? 4 : 5} 
                                          sx={{ 
                                            backgroundColor: themeConfig.brandColors.navy, 
                                            color: themeConfig.brandColors.offWhite,
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            py: 1
                                          }}
                                        >
                                          {groupName}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    
                                    {/* Group Items */}
                                    {items.map((item, index) => {
                                      // Check if this item belongs to the current group
                                      const itemProduct = groupProducts.find(p => p.id === item.id)
                                      if (!itemProduct && groupBy !== "none") return null
                                      
                                      return (
                                        <TableRow key={`no-location-${item.id || 'new'}-${index}`}>
                                <TableCell sx={{ 
                                  textAlign: 'center',
                                  width: 'auto',
                                  minWidth: 'fit-content',
                                  maxWidth: 'none',
                                  overflow: 'visible',
                                  padding: '8px'
                                }}>
                                  <Autocomplete
                                    size="small"
                                    options={getFilteredProducts()}
                                    getOptionLabel={(option) => option.name || ""}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={item.id && item.name ? getFilteredProducts().find(p => p.id === item.id) || null : null}
                                    groupBy={(option) => {
                                      if (groupBy === "none") return ""
                                      
                                      switch (groupBy) {
                                        case "salesDivision":
                                          return option.salesDivisionName || option.salesDivision || "Uncategorized"
                                        case "category":
                                          return option.categoryName || option.category || "Uncategorized"
                                        case "subcategory":
                                          return option.subcategoryName || option.subCategory || "Uncategorized"
                                        default:
                                          return ""
                                      }
                                    }}
                                    onChange={(_, newValue) => {
                                      console.log('Autocomplete onChange:', { index, newValue, currentItem: item })
                                      handleProductChange(index, newValue)
                                    }}
                  disabled={isReadOnly}
                                    renderInput={(params) => (
                                      <TextField 
                                        {...params} 
                                        placeholder="Select product"
                                        sx={{
                                          '& .MuiInputBase-input': {
                                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                          }
                                        }}
                                      />
                                    )}
                                    sx={{ 
                                      width: '100%',
                                      minWidth: '200px',
                                      '& .MuiAutocomplete-inputRoot': {
                                        fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  {!isReadOnly ? (
                                    <FormControl 
                                      size="small" 
                                      sx={{ 
                                        width: 'auto',
                                        minWidth: 'fit-content',
                                        maxWidth: '100%'
                                      }}
                                    >
                  <Select
                                        value={item.measureId || ""}
                                        onChange={(e) => {
                                          const selectedMeasure = getAvailableMeasuresForProduct(item.id).find(m => m.id === e.target.value)
                                          const previousQuantity = getPreviousStockQuantity(item.id, e.target.value)
                                          updateItemInCurrentLocation(index, {
                                            measureId: e.target.value,
                                            unitName: selectedMeasure?.name || "Unknown Unit",
                                            previousQuantity: previousQuantity,
                                          })
                                        }}
                                        displayEmpty
                                        sx={{
                                          '& .MuiSelect-select': {
                                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                          }
                                        }}
                                      >
                                        {getAvailableMeasuresForProduct(item.id).map((measure) => (
                                          <MenuItem 
                                            key={measure.id} 
                                            value={measure.id}
                                            sx={{
                                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                            }}
                                          >
                                            {measure.name}
                                          </MenuItem>
                                        ))}
                  </Select>
                </FormControl>
                                  ) : (
                                    <Typography variant="body2">
                                      {item.unitName || "N/A"}
                </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                    <StepAdjuster
                                      value={0}
                                      onChange={(value) => {
                                        const locationId = getCurrentLocationId()
                                        const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                        const newLocationTotal = currentLocationTotal + value
                                        
                                        updateItemInCurrentLocation(index, {
                                          locationTotals: {
                                            ...item.locationTotals,
                                            [locationId]: newLocationTotal
                                          }
                                        })
                                      }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <TextField
                                        id={`counted-input-no-location-${index}`}
                                        size="small"
                                        type="number"
                                        placeholder="Enter amount"
                                        defaultValue=""
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            const inputValue = parseFloat((e.target as HTMLInputElement).value) || 0
                                            const locationId = getCurrentLocationId()
                                            const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                            const newLocationTotal = currentLocationTotal + inputValue
                                            
                                            updateItemInCurrentLocation(index, {
                                              locationTotals: {
                                                ...item.locationTotals,
                                                [locationId]: newLocationTotal
                                              }
                                            })
                                            ;(e.target as HTMLInputElement).value = ""
                                          }
                                        }}
                                        sx={{
                                          width: '80px',
                                          '& .MuiInputBase-input': {
                                            textAlign: 'center',
                                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                          }
                                        }}
                                      />
                                      <IconButton
                                        size="small"
                          onClick={() => {
                                          const inputValue = parseFloat((document.querySelector(`#counted-input-no-location-${index}`) as HTMLInputElement)?.value) || 0
                                          const locationId = getCurrentLocationId()
                                          const currentLocationTotal = item.locationTotals?.[locationId] || 0
                                          const newLocationTotal = currentLocationTotal + inputValue
                                          
                                          updateItemInCurrentLocation(index, {
                                            locationTotals: {
                                              ...item.locationTotals,
                                              [locationId]: newLocationTotal
                                            }
                                          })
                                          ;(document.querySelector(`#counted-input-no-location-${index}`) as HTMLInputElement).value = ""
                                        }}
                                        sx={{ 
                                          p: 0.5,
                                          '& .MuiSvgIcon-root': {
                                            fontSize: '1rem'
                                          }
                                        }}
                                      >
                                        <AddIcon />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                              <Typography variant="body2">
                                                {(() => {
                                                  // Show location-specific total
                                                  const locationId = getCurrentLocationId()
                                                  if (item.locationTotals && item.locationTotals[locationId] !== undefined) {
                                                    return item.locationTotals[locationId].toFixed(stockDecimalPlaces)
                                                  }
                                                  return (item.countedTotal || 0).toFixed(stockDecimalPlaces)
                                                })()}
                          </Typography>
                                            </TableCell>
                                {!isReadOnly && (
                                  <TableCell sx={{ textAlign: 'center' }}>
                                    <IconButton
                                      color="error"
                                      onClick={() => removeItemFromCurrentLocation(index)}
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                )}
                                      </TableRow>
                                    )
                                  })}
                                </React.Fragment>
                              )
                            })
                          })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {!isReadOnly && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={addItemToCurrentLocation}
                            size="small"
                          >
                            Add Item
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </TabPanel>
                </Box>
                    </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={stockCountData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={isReadOnly}
                />
                </Grid>
              </Grid>

          </Box>

        </form>
      </Paper>

      {/* Save Preset Dialog */}
      <Dialog open={showSavePresetDialog} onClose={() => setShowSavePresetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save as Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            type="text"
            fullWidth
            variant="outlined"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            placeholder="Enter a name for this preset..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowSavePresetDialog(false)
            setPresetNameInput("")
          }}>
            Cancel
          </Button>
          <Button onClick={handleSavePreset} variant="contained">
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Missing Items Dialog */}
      <Dialog open={showMissingItemsDialog} onClose={() => setShowMissingItemsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Missing Items Found</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Some items from the preset could not be found in your current inventory:
          </Typography>
          <List>
            {missingItems.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={
                    item.type === 'product' ? `Product: ${item.name}` :
                    item.type === 'measure' ? `Measure: ${item.name}` :
                    item.type === 'measure_not_available' ? `Measure Issue: ${item.name}` :
                    `Unknown Issue: ${item.name}`
                  }
                  secondary={`ID: ${item.id}`}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            You can skip the missing items and load only the available ones, or cancel to manually add the missing items first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMissingItemsDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveWithoutMissingItems}
            variant="outlined"
            color="warning"
          >
            Save Without Missing Items
          </Button>
          <Button
            onClick={handleAddMissingItems}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            Add Missing Items
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
})

StockCountForm.displayName = 'StockCountForm'

export default StockCountForm
