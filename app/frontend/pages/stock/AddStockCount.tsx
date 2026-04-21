"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Grid,
  MenuItem,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Merge as MergeIcon,
  Drafts as DraftIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material"
// All company state is now handled through StockContext
// Site functionality is now part of CompanyContext
import { useStock } from "../../../backend/context/StockContext"
import type { StockCount, StockCountItem, StockPreset, TabPanelProps } from "../../../backend/interfaces/Stock"
import { usePermission } from "../../hooks/usePermission"

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-count-tabpanel-${index}`}
      aria-labelledby={`stock-count-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const AddStockCount: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { canView, canEdit } = usePermission()
  const canViewPage = canView("stock", "counts")
  const canMutate = canEdit("stock", "counts")
  const { 
    state: stockState, 
    fetchAllStockCounts: contextFetchAllStockCounts,
    fetchPresetsFromDB: contextFetchPresetsFromDB,
    savePresetToDB: contextSavePresetToDB,
    saveStockCount: contextSaveStockCount,
    fetchLatestCountsForProducts: contextFetchLatestCountsForProducts,
  } = useStock()
  const { products, measures, salesDivisions, categories, subcategories } = stockState

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [groupBy, setGroupBy] = useState<string>("none")
  const [duplicateRows, setDuplicateRows] = useState<number[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [showMissingItemsDialog, setShowMissingItemsDialog] = useState(false)
  const [missingItems, setMissingItems] = useState<any[]>([])
  const [tabValue, setTabValue] = useState(0)

  // Presets state
  const [presets, setPresets] = useState<StockPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>("")
  const [isPresetSelected, setIsPresetSelected] = useState<boolean>(false)

  // Stock count state
  const [stockCount, setStockCount] = useState<StockCount>({
    date: new Date().toISOString(),
    dateUK: new Date().toISOString().split("T")[0],
    timeUK: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    status: "Awaiting Submission",
    items: [],
    countType: "partial", // Add count type
    name: "", // Add name field
    description: "", // Add description field
    location: "", // Add location field
    notes: "", // Add notes field
  })

  const [originalStockCount, setOriginalStockCount] = useState<StockCount | null>(null)
  
  // Progress tracking
  const [progress, setProgress] = useState<number>(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Previous counts data
  const [latestCounts, setLatestCounts] = useState<{
    [productId: string]: {
      baseQuantity: number
      baseUnit: string
      date: string
    }
  }>({})

  // Load stock count data if editing
  useEffect(() => {
    const fetchData = async () => {
      // All data operations are now handled through StockContext

      setLoading(true)

      try {
        // basePath is already available from context
        
        // Fetch presets
        const presetData = await contextFetchPresetsFromDB()
        setPresets(presetData)

        // If editing, load the stock count first
        if (id) {
          console.log("Fetching stock counts for id:", id)
          const allStockCounts = await contextFetchAllStockCounts()
          console.log("All stock counts fetched:", allStockCounts)
          const stockCountToEdit = allStockCounts.find((sc) => sc.id === id)

          if (stockCountToEdit) {
            console.log("Loading stock count for editing:", stockCountToEdit)
            console.log("Stock count items:", stockCountToEdit.items)
            console.log("Stock count items type:", typeof stockCountToEdit.items)
            console.log("Stock count items is array:", Array.isArray(stockCountToEdit.items))
            
            // Ensure items is an array - convert object to array if needed
            let itemsArray: StockCountItem[] = []
            if (Array.isArray(stockCountToEdit.items)) {
              itemsArray = stockCountToEdit.items
            } else if (stockCountToEdit.items && typeof stockCountToEdit.items === 'object') {
              // Convert object to array
              itemsArray = Object.values(stockCountToEdit.items)
            }
            
            const stockCountWithArrayItems = {
              ...stockCountToEdit,
              items: itemsArray
            }
            
            console.log("Converted items array:", itemsArray)
            
            setStockCount(stockCountWithArrayItems)
            setOriginalStockCount(JSON.parse(JSON.stringify(stockCountWithArrayItems)))
          } else {
            console.log("Stock count not found with id:", id)
            console.log("Available stock count IDs:", allStockCounts.map(sc => sc.id))
            setErrorMessage("Stock count not found")
          }
        }

        // Fetch previous counts only if we have products and measures
        if (products.length > 0 && measures.length > 0) {
          const previousCounts = await contextFetchLatestCountsForProducts()
          setLatestCounts(previousCounts)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setErrorMessage("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Separate effect for fetching previous counts when products/measures are available
  useEffect(() => {
    const fetchPreviousCounts = async () => {
      if (products.length === 0 || measures.length === 0) return

      try {
        // basePath is already available from context
        const previousCounts = await contextFetchLatestCountsForProducts()
        setLatestCounts(previousCounts)
      } catch (error) {
        console.error("Error fetching previous counts:", error)
      }
    }

    fetchPreviousCounts()
  }, [products, measures])

  // Check for duplicates whenever items change
  useEffect(() => {
    findDuplicateRows()
  }, [stockCount.items])

  // Calculate progress based on counted items
  useEffect(() => {
    if (stockCount.countType === "full") {
      const totalProducts = products.length
      const countedProducts = stockCount.items.length
      setProgress(totalProducts > 0 ? (countedProducts / totalProducts) * 100 : 0)
    } else {
      // For partial counts, progress is based on items added
      setProgress(stockCount.items.length > 0 ? 100 : 0)
    }
  }, [stockCount.items, products, stockCount.countType])

  // Handle preset selection
  const handlePresetSelection = (presetName: string) => {
    if (presetName === "") {
      setStockCount((prev) => ({ ...prev, items: [] }))
      setSelectedPreset("")
      setIsPresetSelected(false)
    } else {
      loadPreset(presetName)
      setIsPresetSelected(true)
    }
  }

  // Load preset items
  const loadPreset = (presetName: string) => {
    setSelectedPreset(presetName)
    const selected = presets.find((preset) => preset.name === presetName)

    if (!selected) {
      console.error("Preset not found:", presetName)
      return
    }

    const presetItems = selected.items.map((presetItem) => {
      const product = products.find((p) => p.id === presetItem.itemID)
      const unit = measures.find((m) => m.id === presetItem.unitID)

      return {
        id: presetItem.itemID || "Unknown ID",
        name: product?.name || "Unknown Product",
        measureId: presetItem.unitID || "Unknown Measure",
        unitName: unit?.name || "Unknown Unit",
        countedQuantity: 0,
        previousQuantity: latestCounts[presetItem.itemID]?.baseQuantity || 0,
        countedTotal: 0,
        salesDivisionId: product?.salesDivisionId || "",
        categoryId: product?.categoryId || "",
        subcategoryId: product?.subcategoryId || "",
        type: product?.type || "",
      } as StockCountItem
    })

    setStockCount((prev) => ({ ...prev, items: presetItems }))
  }

  // Save preset
  const savePreset = async () => {
    // All data operations are now handled through StockContext

    const presetName = prompt("Enter a name for this preset:")
    if (!presetName) return

    const presetData = {
      name: presetName,
      items: stockCount.items.map((item, index) => ({
        index,
        itemID: item.id,
        unitID: item.measureId,
      })),
    }

    try {
      await contextSavePresetToDB(presetData)
      setSuccessMessage("Preset saved successfully!")

      // Refresh presets
      const updatedPresets = await contextFetchPresetsFromDB()
      setPresets(updatedPresets)
      setIsPresetSelected(false)
    } catch (error) {
      console.error("Error saving preset:", error)
      setErrorMessage("Failed to save preset. Please try again.")
    }
  }

  // Update preset
  const updatePreset = async () => {
    if (!selectedPreset) return

    const presetEntry = presets.find((preset) => preset.name === selectedPreset)
    if (!presetEntry || !presetEntry.id) {
      console.error("Preset not found or missing ID:", selectedPreset)
      return
    }

    try {
      const updatedItems = stockCount.items.map((item, index) => ({
        index,
        itemID: item.id,
        unitID: item.measureId,
      }))

      const updatedPreset = {
        ...presetEntry,
        items: updatedItems,
      }

      await contextSavePresetToDB(updatedPreset)
      setSuccessMessage("Preset updated successfully!")

      // Refresh presets
      const updatedPresets = await contextFetchPresetsFromDB()
      setPresets(updatedPresets)
    } catch (error) {
      console.error("Error updating preset:", error)
      setErrorMessage("Failed to update preset. Please try again.")
    }
  }

  // Add a new stock item
  const addStockItem = () => {
    setStockCount((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: "",
          name: "",
          measureId: "",
          unitName: "",
          countedQuantity: 0,
          countedTotal: 0,
          previousQuantity: 0,
          salesDivisionId: "",
          categoryId: "",
          subcategoryId: "",
          type: "",
        },
      ],
    }))
  }

  // Update a stock item
  const updateStockItem = (index: number, changes: Partial<StockCountItem>) => {
    setStockCount((prev) => {
      const updatedItems = [...prev.items]

      // If we're updating countedQuantity, we need to handle it specially
      if ("countedQuantity" in changes) {
        const newQuantity = changes.countedQuantity || 0
        const oldQuantity = updatedItems[index].countedQuantity || 0

        // If this is a direct set (not an increment), we calculate the new total
        if (changes.countedTotal === undefined) {
          // Calculate the difference and add it to the current total
          const difference = newQuantity - oldQuantity
          const currentTotal = updatedItems[index].countedTotal || 0
          changes.countedTotal = currentTotal + difference
        }
      }

      updatedItems[index] = { ...updatedItems[index], ...changes }
      return { ...prev, items: updatedItems }
    })
  }

  // Handle product selection
  const handleProductChange = (index: number, product: any) => {
    if (!product) return

    const defaultMeasureId = product.purchase?.defaultMeasure || ""
    const defaultUnit = measures.find((m) => m.id === defaultMeasureId)

    updateStockItem(index, {
      id: product.id,
      name: product.name,
      measureId: defaultMeasureId,
      unitName: defaultUnit?.name || "Unknown Unit",
      salesDivisionId: product.salesDivisionId || "",
      categoryId: product.categoryId || "",
      subcategoryId: product.subcategoryId || "",
      type: product.type || "",
      previousQuantity: latestCounts[product.id]?.baseQuantity || 0,
    })
  }

  // Delete a stock item
  const deleteStockItem = (index: number) => {
    setStockCount((prev) => {
      const updatedItems = [...prev.items]
      updatedItems.splice(index, 1)
      return { ...prev, items: updatedItems }
    })
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
        previousQuantity: latestCounts[product.id!]?.baseQuantity || systemQuantity,
        countedTotal: 0,
        salesDivisionId: product.salesDivisionId || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        type: product.type || "",
        systemQuantity: systemQuantity,
      }
    })

    setStockCount(prev => ({ ...prev, items }))
  }

  // Calculate totals and variances
  const calculateTotals = () => {
    const totalCounted = stockCount.items.reduce((sum, item) => sum + (item.countedTotal || 0), 0)
    const totalVariance = stockCount.items.reduce((sum, item) => {
      const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
      return sum + variance
    }, 0)
    const positiveVariances = stockCount.items.filter(item => {
      const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
      return variance > 0
    }).length
    const negativeVariances = stockCount.items.filter(item => {
      const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
      return variance < 0
    }).length
    
    return { totalCounted, totalVariance, positiveVariances, negativeVariances }
  }

  const totals = calculateTotals()

  // Revert changes
  const handleRevert = () => {
    if (originalStockCount) {
      setStockCount(JSON.parse(JSON.stringify(originalStockCount)))
    } else {
        setStockCount({
          date: new Date().toISOString(),
          dateUK: new Date().toISOString().split("T")[0],
          timeUK: new Date().toLocaleTimeString("en-GB", { hour12: false }),
          status: "Awaiting Submission",
          items: [],
        })
    }
  }

  // Function to find duplicate rows
  const findDuplicateRows = () => {
    const duplicateGroups: { [key: string]: number[] } = {}
    const duplicates: number[] = []

    stockCount.items.forEach((item, index) => {
      if (!item.id || !item.measureId) return

      const key = `${item.id}-${item.measureId}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = []
      }
      duplicateGroups[key].push(index)
    })

    // Find groups with more than one item
    Object.values(duplicateGroups).forEach((group) => {
      if (group.length > 1) {
        duplicates.push(...group)
      }
    })

    setDuplicateRows(duplicates)
  }

  // Function to get duplicate groups for combining
  const getDuplicateGroups = () => {
    const duplicateGroups: { [key: string]: { items: StockCountItem[]; indices: number[] } } = {}

    stockCount.items.forEach((item, index) => {
      if (!item.id || !item.measureId) return

      const key = `${item.id}-${item.measureId}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = { items: [], indices: [] }
      }
      duplicateGroups[key].items.push(item)
      duplicateGroups[key].indices.push(index)
    })

    // Return only groups with duplicates
    return Object.entries(duplicateGroups).filter(([_, group]) => group.items.length > 1)
  }

  // Function to combine duplicate items
  const combineDuplicates = () => {
    const duplicateGroups = getDuplicateGroups()

    if (duplicateGroups.length === 0) {
      setErrorMessage("No duplicates found to combine.")
      return
    }

    setStockCount((prev) => {
      const newItems: StockCountItem[] = []
      const processedIndices = new Set<number>()

      duplicateGroups.forEach(([_, group]) => {
        // Combine all items in this group
        const combinedItem = { ...group.items[0] }
        combinedItem.countedQuantity = group.items.reduce((sum, item) => sum + (item.countedQuantity || 0), 0)
        combinedItem.countedTotal = group.items.reduce((sum, item) => sum + (item.countedTotal || 0), 0)

        newItems.push(combinedItem)
        group.indices.forEach((index) => processedIndices.add(index))
      })

      // Add non-duplicate items
      prev.items.forEach((item, index) => {
        if (!processedIndices.has(index)) {
          newItems.push(item)
        }
      })

      return { ...prev, items: newItems }
    })

    setSuccessMessage("Duplicate items have been combined successfully!")
    setShowDuplicateDialog(false)
  }

  const detectMissingItems = () => {
    const countedProductIds = new Set(stockCount.items.map((item) => item.id))
    const missing = products.filter((product) => product.type !== "recipe" && !countedProductIds.has(product.id))
    setMissingItems(missing)
    return missing.length > 0
  }

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!stockCount.name?.trim()) {
      newErrors.name = 'Stock count name is required'
    }

    if (!stockCount.countType) {
      newErrors.countType = 'Count type is required'
    }

    if (stockCount.items.length === 0) {
      newErrors.items = 'At least one item must be counted'
    }

    // For full counts, check if all items are counted
    if (stockCount.countType === 'full') {
      const uncountedItems = stockCount.items.filter(item => !item.countedQuantity || item.countedQuantity === 0)
      if (uncountedItems.length > 0) {
        newErrors.items = `Please count all items. ${uncountedItems.length} items still need to be counted.`
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorMessage(Object.values(newErrors).join('. '))
      return false
    }

    return true
  }

  // Save stock count
  const handleSave = async (status: "Awaiting Submission" | "Awaiting Approval") => {
    // All data operations are now handled through StockContext
    if (!canMutate) {
      setErrorMessage("You don't have permission to edit Stock Counts.")
      return
    }

    // Validate form first
    if (!validateForm()) {
      return
    }

    // Check for duplicates before submitting for approval
    if (duplicateRows.length > 0 && status === "Awaiting Approval") {
      setShowDuplicateDialog(true)
      return
    }

    // Detect missing items before saving for approval
    const hasMissingItems = detectMissingItems()
    if (hasMissingItems && status === "Awaiting Approval") {
      setShowMissingItemsDialog(true)
      return
    }

    setSaving(true)

    try {
      // Sanitize items
      const sanitizedItems = stockCount.items.map((item) => ({
        ...item,
        unitName: item.unitName || "Unknown Unit",
      }))

      const finalStockCount: StockCount = {
        ...stockCount,
        status: status,
        items: sanitizedItems,
      }

      await contextSaveStockCount(finalStockCount)

      const message =
        status === "Awaiting Submission"
          ? "Stock count saved as draft successfully!"
          : "Stock count submitted for approval successfully!"

      setSuccessMessage(message)

      setTimeout(() => {
        navigate("/Stock")
      }, 2000)
    } catch (error) {
      console.error("Error saving stock count:", error)
      setErrorMessage("Failed to save stock count. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Filter items based on search term
  const filteredItems = stockCount.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Group items by selected field
  const getGroupName = (item: StockCountItem, field: string): string => {
    if (field === "salesDivisionId") {
      const sd = salesDivisions.find((sd) => sd.id === item.salesDivisionId)
      return sd ? sd.name : "Unassigned"
    }
    if (field === "categoryId") {
      const cat = categories.find((c) => c.id === item.categoryId)
      return cat ? cat.name : "Unassigned"
    }
    if (field === "subcategoryId") {
      const sub = subcategories.find((sc) => sc.id === item.subcategoryId)
      return sub ? sub.name : "Unassigned"
    }
    if (field === "type") {
      return item.type || "Unassigned"
    }
    return "Unassigned"
  }

  const groupItems = (items: StockCountItem[], groupField: string) => {
    if (groupField === "none") return items

    const groups: Record<string, StockCountItem[]> = {}

    items.forEach((item) => {
      const groupKey = getGroupName(item, groupField)
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    return Object.entries(groups).flatMap(([groupKey, groupItems]) => [
      { groupKey, isGroupHeader: true } as any,
      ...groupItems,
    ])
  }

  const groupedItems = groupItems(filteredItems, groupBy)

  // Debug logging
  console.log("Stock count items:", stockCount.items)
  console.log("Stock count items length:", stockCount.items?.length)
  console.log("Stock count items type:", typeof stockCount.items)
  console.log("Filtered items:", filteredItems)
  console.log("Search term:", searchTerm)
  console.log("Group by:", groupBy)
  console.log("Grouped items:", groupedItems)

  const handleCloseSnackbar = () => {
    setSuccessMessage("")
    setErrorMessage(null)
  }

  const handleCloseDuplicateDialog = () => {
    setShowDuplicateDialog(false)
  }

  const handleCloseMissingItemsDialog = () => {
    setShowMissingItemsDialog(false)
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
        previousQuantity: latestCounts[product.id!]?.baseQuantity || systemQuantity,
        countedTotal: 0,
        salesDivisionId: product.salesDivisionId || "",
        categoryId: product.categoryId || "",
        subcategoryId: product.subcategoryId || "",
        type: product.type || "",
        systemQuantity: systemQuantity,
      }
    })

    setStockCount(prev => ({
      ...prev,
      items: [...prev.items, ...missingItemsToAdd]
    }))

    setShowMissingItemsDialog(false)
    setSuccessMessage(`Added ${missingItemsToAdd.length} missing items to the count`)
  }

  // Save without missing items
  const handleSaveWithoutMissingItems = async () => {
    setShowMissingItemsDialog(false)
    await handleSave("Awaiting Approval")
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Awaiting Submission":
        return "default"
      case "Awaiting Approval":
        return "warning"
      case "Approved":
        return "success"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading stock count data...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
      {!canViewPage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to view Stock Counts.
        </Alert>
      )}
      {!canMutate && canViewPage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to Stock Counts.
        </Alert>
      )}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Duplicate Items Dialog */}
      <Dialog open={showDuplicateDialog} onClose={handleCloseDuplicateDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WarningIcon color="warning" />
            Duplicate Items Detected
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The following duplicate items were found. Would you like to combine them before submitting?
          </Typography>
          <List>
            {getDuplicateGroups().map(([, group], index) => {
              const product = products.find((p) => p.id === group.items[0].id)
              const measure = measures.find((m) => m.id === group.items[0].measureId)

              return (
                <ListItem key={index} sx={{ bgcolor: "rgba(255, 0, 0, 0.1)", mb: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={`${product?.name || "Unknown Product"} - ${measure?.name || "Unknown Unit"}`}
                    secondary={`${group.items.length} duplicate entries | Total Counted: ${group.items.reduce((sum, item) => sum + (item.countedTotal || 0), 0)}`}
                  />
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog}>Cancel</Button>
          <Button onClick={combineDuplicates} variant="contained" color="primary" startIcon={<MergeIcon />}>
            Combine Duplicates
          </Button>
          <Button
            onClick={() => {
              setShowDuplicateDialog(false)
              handleSave("Awaiting Approval")
            }}
            variant="outlined"
            color="warning"
          >
            Submit Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Missing Items Dialog */}
      <Dialog open={showMissingItemsDialog} onClose={handleCloseMissingItemsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Missing Items</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The following items are not included in the stock count. Would you like to add them?
          </DialogContentText>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {missingItems.map((item) => (
              <ListItem key={item.id}>
                <ListItemText primary={item.name} secondary={`Type: ${item.type || "Unknown"}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMissingItemsDialog}>Cancel</Button>
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

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
            {id ? "Edit Stock Count" : "New Stock Count"}
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/" onClick={() => navigate("/")}>
              Dashboard
            </Link>
            <Link color="inherit" href="/Stock" onClick={() => navigate("/Stock")}>
              Stock
            </Link>
            <Typography color="text.primary">{id ? "Edit Stock Count" : "New Stock Count"}</Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/Stock")}
          sx={{ borderRadius: 2 }}
        >
          Back to Stock
        </Button>
      </Box>

      <Card elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: "visible" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="stock count tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Count Details" />
          <Tab label="Count Items" />
          <Tab label="Summary" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
                  Stock Count Details
                </Typography>
                {stockCount.status && (
                  <Chip label={stockCount.status} color={getStatusColor(stockCount.status) as any} size="small" />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Stock Count Name"
                name="name"
                value={stockCount.name || ""}
                onChange={(e) => setStockCount({ ...stockCount, name: e.target.value })}
                variant="outlined"
                placeholder="e.g., Monthly Stock Count"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={stockCount.dateUK}
                onChange={(e) => setStockCount({ ...stockCount, dateUK: e.target.value })}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Count Type</InputLabel>
                <Select
                  value={stockCount.countType || "partial"}
                  label="Count Type"
                  onChange={(e) => setStockCount({ ...stockCount, countType: e.target.value as any })}
                >
                  <MenuItem value="full">Full Count (All Products)</MenuItem>
                  <MenuItem value="partial">Partial Count (Selected Products)</MenuItem>
                  <MenuItem value="cycle">Cycle Count</MenuItem>
                  <MenuItem value="spot">Spot Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={stockCount.location || ""}
                onChange={(e) => setStockCount({ ...stockCount, location: e.target.value })}
                variant="outlined"
                placeholder="e.g., Main Store, Warehouse A"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={stockCount.description || ""}
                onChange={(e) => setStockCount({ ...stockCount, description: e.target.value })}
                variant="outlined"
                multiline
                rows={2}
                placeholder="Purpose of this stock count..."
              />
            </Grid>

            {/* Progress */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Progress: {stockCount.items.length} items counted
                  {stockCount.countType === "full" && ` of ${products.length} total products`}
                </Typography>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Select Preset</InputLabel>
                    <Select
                      value={selectedPreset}
                      label="Select Preset"
                      onChange={(e) => handlePresetSelection(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {presets.map((preset) => (
                        <MenuItem key={preset.id} value={preset.name}>
                          {preset.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {isPresetSelected ? (
                    <Button variant="contained" color="primary" onClick={updatePreset}>
                      Update Preset
                    </Button>
                  ) : (
                    <Button variant="outlined" color="primary" onClick={savePreset}>
                      Save as Preset
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
                Count Items ({stockCount.items.length})
              </Typography>

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />,
                  }}
                  sx={{ minWidth: 200 }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Group By</InputLabel>
                  <Select value={groupBy} label="Group By" onChange={(e) => setGroupBy(e.target.value)}>
                    <MenuItem value="none">No Grouping</MenuItem>
                    <MenuItem value="salesDivisionId">Sales Division</MenuItem>
                    <MenuItem value="categoryId">Category</MenuItem>
                    <MenuItem value="subcategoryId">Subcategory</MenuItem>
                    <MenuItem value="type">Type</MenuItem>
                  </Select>
                </FormControl>

                {duplicateRows.length > 0 && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<MergeIcon />}
                    onClick={() => setShowDuplicateDialog(true)}
                  >
                    Combine Duplicates
                  </Button>
                )}

                {stockCount.countType === "full" && (
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadAllProducts}
                    sx={{ mr: 2 }}
                  >
                    Load All Products for Full Count
                  </Button>
                )}

                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={addStockItem}>
                  Add Item
                </Button>
              </Box>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <Table>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Measure</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    System Quantity
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Counted Quantity
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Variance
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Variance %
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="right">
                    Value
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No items added yet. Click "Add Item" to start.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedItems.map((item: any, idx) =>
                    item.isGroupHeader ? (
                      <TableRow key={`group-${idx}`} sx={{ bgcolor: "rgba(0, 0, 0, 0.04)" }}>
                        <TableCell colSpan={8} sx={{ fontWeight: "bold" }}>
                          {item.groupKey}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow
                        key={`item-${idx}`}
                        sx={{
                          ...(duplicateRows.includes(
                            stockCount.items.findIndex((i) => i.id === item.id && i.measureId === item.measureId),
                          )
                            ? { bgcolor: "error.light", border: 2, borderColor: "error.main" }
                            : {}),
                        }}
                      >
                        <TableCell>
                          <Autocomplete
                            options={products}
                            getOptionLabel={(option: any) => option.name || ""}
                            value={products.find((p) => p.id === item.id) || null}
                            onChange={(_, newValue) =>
                              handleProductChange(
                                stockCount.items.findIndex(
                                  (i) => i.id === item.id && i.measureId === item.measureId,
                                ),
                                newValue,
                              )
                            }
                            renderInput={(params) => <TextField {...params} fullWidth />}
                          />
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            options={measures}
                            getOptionLabel={(option: any) => option.name || ""}
                            value={measures.find((m) => m.id === item.measureId) || null}
                            onChange={(_, newValue) => {
                              const index = stockCount.items.findIndex(
                                (i) => i.id === item.id && i.measureId === item.measureId,
                              )
                              updateStockItem(index, {
                                measureId: newValue?.id || "",
                                unitName: newValue?.name || "Unknown Unit",
                              })
                            }}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                          />
                        </TableCell>
                        <TableCell align="right">{item.systemQuantity || 0}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.countedQuantity || 0}
                            onChange={(e) => {
                              const index = stockCount.items.findIndex(
                                (i) => i.id === item.id && i.measureId === item.measureId,
                              )
                              updateStockItem(index, {
                                countedQuantity: parseFloat(e.target.value) || 0,
                                countedTotal: (parseFloat(e.target.value) || 0) * (item.previousQuantity || 0),
                              })
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
                            return (
                              <Chip
                                label={`${variance >= 0 ? '+' : ''}${variance.toFixed(2)}`}
                                color={variance === 0 ? 'success' : Math.abs(variance) <= 5 ? 'warning' : 'error'}
                                size="small"
                              />
                            )
                          })()}
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
                            const variancePercentage = item.systemQuantity ? (variance / item.systemQuantity) * 100 : 0
                            return `${variancePercentage.toFixed(1)}%`
                          })()}
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const variance = (item.countedQuantity || 0) - (item.systemQuantity || 0)
                            const product = products.find(p => p.id === item.id)
                            const value = (product?.salesPrice || 0) * Math.abs(variance)
                            return `£${value.toFixed(2)}`
                          })()}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => {
                              const index = stockCount.items.findIndex(
                                (i) => i.id === item.id && i.measureId === item.measureId,
                              )
                              deleteStockItem(index)
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Items: {stockCount.items.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Variance: {totals.totalVariance.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Positive Variances: {totals.positiveVariances}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Negative Variances: {totals.negativeVariances}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={stockCount.notes || ""}
                onChange={(e) => setStockCount({ ...stockCount, notes: e.target.value })}
                variant="outlined"
                multiline
                rows={3}
                placeholder="Additional notes about this stock count..."
              />
            </Grid>

            <Grid
              item
              xs={12}
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 2,
              }}
            >
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleRevert}>
                Revert Changes
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DraftIcon />}
                onClick={() => handleSave("Awaiting Submission")}
                disabled={saving || !canMutate || !canViewPage}
              >
                {saving ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  "Save as Draft"
                )}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={() => handleSave("Awaiting Approval")}
                disabled={saving || !canMutate || !canViewPage}
              >
                {saving ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : id ? (
                  "Update & Submit"
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  )
}

export default AddStockCount
