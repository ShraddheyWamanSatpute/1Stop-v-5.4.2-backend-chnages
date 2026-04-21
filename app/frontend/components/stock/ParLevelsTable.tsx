"use client"

import React from "react"

import type { useLocation, ReactElement } from "react"
import type { ParLevelRow, ParLevelProfile, UIParLevel, BackendParLevelProfile, Column } from "../../../backend/interfaces/Stock"
import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  InputLabel,
  FormControlLabel,
  Checkbox,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  GroupWork as GroupWorkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import ParLevelForm from "./forms/ParLevelForm"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"
import { useStockSettings } from "../../hooks/useStockSettings"

// All company state is now handled through StockContext
import { useStock } from "../../../backend/context/StockContext"
import type { 
  UIParLevelProfile,
  SortDirection
} from "../../../backend/context/StockContext"

// Helper function to convert UIParLevel to the expected format
// const convertUIParLevel = (uiParLevel: UIParLevel): { parLevel: number; measureId: string } => ({
//   parLevel: uiParLevel.parLevel,
//   measureId: uiParLevel.unitID
// }); // Would use when implementing UIParLevel conversion

interface GroupByField {
  field: string;
  label: string;
}
// All database operations are now handled through StockContext

// All interfaces are now imported from backend

// All helper functions are now imported from backend

// All interfaces are now imported from backend

// Complete columns array with all available columns
const columns: Column[] = [
  { id: "productName", label: "Product Name", visible: true, sortable: true, filterable: true, minWidth: 200 },
  { id: "category", label: "Category", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "subcategory", label: "Subcategory", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "salesDivision", label: "Sales Division", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "type", label: "Type", visible: true, sortable: true, filterable: true, minWidth: 100 },
  { id: "currentStock", label: "Current Stock", visible: true, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "predictedStock", label: "Predicted Stock", visible: false, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "previousCount", label: "Previous Count", visible: false, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "parLevelWithUnit", label: "Par Level", visible: true, sortable: true, filterable: false, minWidth: 120, align: "right" },
  { id: "orderQuantityWithUnit", label: "Order Quantity", visible: true, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "measureName", label: "Measure", visible: true, sortable: true, filterable: true, minWidth: 120 },
  { id: "status", label: "Status", visible: true, sortable: true, filterable: true, minWidth: 100, align: "center" },
  { id: "purchaseBaseQuantity", label: "Purchase Base Qty", visible: false, sortable: true, filterable: false, minWidth: 140, align: "right" },
  { id: "totalPurchaseQuantity", label: "Total Purchase Qty", visible: false, sortable: true, filterable: false, minWidth: 150, align: "right" },
  {
    id: "totalPurchaseCost",
    label: "Total Purchase Cost",
    visible: false,
    sortable: true,
    filterable: false,
    minWidth: 150,
    align: "right",
    format: (value: number) => `£${value.toFixed(2)}`,
  },
  {
    id: "costPerUnit",
    label: "Cost per Unit",
    visible: false,
    sortable: true,
    filterable: false,
    minWidth: 120,
    align: "right",
    format: (value: number) => `£${value.toFixed(2)}`,
  },
  { id: "purchaseSupplier", label: "Purchase Supplier", visible: false, sortable: true, filterable: false, minWidth: 140 },
  { id: "purchaseMeasure", label: "Purchase Measure", visible: false, sortable: true, filterable: false, minWidth: 140 },
  { id: "salesBaseQuantity", label: "Sales Base Qty", visible: false, sortable: true, filterable: false, minWidth: 130, align: "right" },
  { id: "totalSoldQuantity", label: "Total Sold Qty", visible: false, sortable: true, filterable: false, minWidth: 130, align: "right" },
  {
    id: "totalSoldValue",
    label: "Total Sold Value",
    visible: false,
    sortable: true,
    filterable: false,
    minWidth: 140,
    align: "right",
    format: (value: number) => `£${value.toFixed(2)}`,
  },
  {
    id: "profit",
    label: "Profit",
    visible: false,
    sortable: true,
    filterable: false,
    minWidth: 100,
    align: "right",
    format: (value: number) => `£${value.toFixed(2)}`,
  },
  { id: "salesMeasure", label: "Sales Measure", visible: false, sortable: true, filterable: false, minWidth: 120 },
]

// Default visible columns (core par level columns)
const defaultVisibleColumns = [
  "productName",
  "category",
  "subcategory",
  "predictedStock",
  "parLevelWithUnit",
  "orderQuantityWithUnit",
  "status",
]

const ParLevelsTable: React.FC = (): ReactElement => {
  const { stockDecimalPlaces } = useStockSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedProfile, setSelectedProfile] = useState<string>("")
  const [profiles, setProfiles] = useState<ParLevelProfile[]>([])
  const [rows, setRows] = useState<ParLevelRow[]>([])
  // Loading state removed - UI renders instantly, data fills as it arrives (like HR section)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [editMeasureId, setEditMeasureId] = useState<string>("")

  // Sorting and filtering
  const [sortBy, setSortBy] = useState<keyof ParLevelRow>("productName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(defaultVisibleColumns))
  const [groupBy, setGroupBy] = useState<GroupByField>({ field: "none", label: "None" })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // DataHeader state
  const [dataHeaderSortBy, setDataHeaderSortBy] = useState<string>("productName")
  const [dataHeaderSortDirection, setDataHeaderSortDirection] = useState<'asc' | 'desc'>("asc")

  // Par Level form states
  const [parLevelFormOpen, setParLevelFormOpen] = useState(false)
  const [parLevelFormMode, setParLevelFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedParLevelForForm, setSelectedParLevelForForm] = useState<any | null>(null)

  // Dialogs
  const [newProfileDialog, setNewProfileDialog] = useState(false)
  const [editProfileDialog, setEditProfileDialog] = useState(false)
  const [deleteProfileDialog, setDeleteProfileDialog] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileDescription, setNewProfileDescription] = useState("")
  const [newProfileIsDefault, setNewProfileIsDefault] = useState(false)
  const [editProfileName, setEditProfileName] = useState("")
  const [editProfileDescription, setEditProfileDescription] = useState("")
  const [editProfileIsDefault, setEditProfileIsDefault] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("")
  const [salesDivisionFilter, setSalesDivisionFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  
  // Combined filters object for DataHeader
  const filters = {
    type: typeFilter ? [typeFilter] : [],
    category: categoryFilter ? [categoryFilter] : [],
    subcategory: subcategoryFilter ? [subcategoryFilter] : [],
    salesDivision: salesDivisionFilter ? [salesDivisionFilter] : [],
    status: statusFilter ? [statusFilter] : []
  }

  const { 
    state: stockState, 
    fetchParProfiles: contextFetchParProfiles,
    saveParLevelProfile: contextSaveParLevelProfile,
    deleteParProfile: contextDeleteParProfile,
    fetchCurrentStock: contextFetchCurrentStock,
    fetchSalesHistory: contextFetchSalesHistory,
    fetchPurchasesHistory: contextFetchPurchasesHistory,
    fetchLatestCountsForProducts: contextFetchLatestCountsForProducts,
    fetchMeasureData: contextFetchMeasureData,
    refreshProducts,
    refreshMeasures,
    // getParLevelValue: contextGetParLevelValue, // Would use when implementing functions
    // getParLevelMeasureId: contextGetParLevelMeasureId, // Would use when implementing functions
  } = useStock()
  const { products, measures, categories, subcategories, salesDivisions } = stockState

  // Notification system
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  const showNotification = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setNotification({
      open: true,
      message,
      severity,
    })
  }


  /**
   * Convert quantity to base units using the same logic as backend
   * FORMULA: quantity * measure.quantity * unit_multiplier
   * Async because it has a fallback to fetch from database
   */
  const convertToBaseUnits = async (quantity: number, measureId: string): Promise<number> => {
    // Validate inputs
    if (!quantity || quantity < 0) return 0
    if (!measureId) {
      // Only warn in development mode
      debugWarn('convertToBaseUnits: No measureId provided')
      return quantity
    }

    // First, try to find the measure in the context (faster and more reliable)
    const measure = measures.find((m) => m.id === measureId)
    if (measure) {
      try {
        const unit = String(measure.unit || '').toLowerCase().trim()
        const measureQuantity =
          typeof measure.quantity === "string" ? Number.parseFloat(measure.quantity) : Number(measure.quantity) || 1

        // Validate measure quantity
        if (measureQuantity <= 0) {
          // Only warn in development mode
          debugWarn(`convertToBaseUnits: Invalid measure quantity (${measureQuantity}) for measure ${measureId}`)
          return quantity
        }

        // Base conversion
        let baseQuantity = quantity * measureQuantity
        
        // Apply unit multiplier for weight/volume conversions
        if (unit === "kg") {
          baseQuantity *= 1000  // kg to g
        } else if (unit === "l" || unit === "litre" || unit === "liter") {
          baseQuantity *= 1000  // l to ml
        }
        // For other units (g, ml, single, unit, etc.), no multiplier needed
        
        return baseQuantity
      } catch (error) {
        // Only warn in development mode
        debugWarn(`Error processing measure ${measureId} from context:`, error)
        return quantity
      }
    }

    // Fallback: try to fetch from database if not found in context
    // Don't warn if measures array is empty (still loading)
    if (measures.length === 0) {
      return quantity
    }
    
    try {
      const measureData = await contextFetchMeasureData(measureId)
      return quantity * measureData.totalQuantity
    } catch (error) {
      // Only warn in development mode
      debugWarn(`Measure not found for ID: ${measureId}, using original quantity. Error:`, error)
      return quantity
    }
  }

  // Helper function to convert from base units to measure units
  // const convertFromBaseUnits = async (baseQuantity: number, measureId: string): Promise<number> => { // Would use when implementing unit conversion
  //   try {
  //     const measureData = await contextFetchMeasureData(measureId)
  //     return baseQuantity / measureData.totalQuantity
  //   } catch (error) {
  //     console.error("Error converting from base units:", error)
  //     // Fallback to measure data from context
  //     const measure = measures.find((m) => m.id === measureId)
  //     if (measure) {
  //       const unit = measure.unit?.toLowerCase()
  //       const measureQuantity =
  //         typeof measure.quantity === "string" ? Number.parseFloat(measure.quantity) : measure.quantity || 1

  //       let conversionFactor = measureQuantity
  //       if (unit === "kg") {
  //         conversionFactor *= 1000 // Convert kg to g
  //       } else if (unit === "l") {
  //         conversionFactor *= 1000 // Convert l to ml
  //       }
  //       return baseQuantity / conversionFactor
  //     }
  //     return baseQuantity
  //   }
  // }

  // Helper function to get base unit
  // const getBaseUnit = (measure: any) => { // Would use when implementing unit display
  //   if (!measure) return ""
  //   const unit = measure.unit?.toLowerCase()
  //   if (unit === "kg") return "g"
  //   if (unit === "l") return "ml"
  //   return measure.unit || ""
  // }

  // Calculate predicted stock properly
  const calculatePredictedStock = async (product: any, salesData: any[], purchaseData: any[], latestCount: any) => {
    // Start with the latest count if available
    let predictedStock = latestCount?.baseQuantity || 0

    // Add purchases since the last count
    const lastCountDate = latestCount?.date ? new Date(latestCount.date) : new Date(0)

    for (const purchase of purchaseData) {
      const purchaseDate = new Date(purchase.date || purchase.createdAt || 0)
      if (purchaseDate > lastCountDate && purchase.items) {
        for (const item of purchase.items) {
          if (item.itemID === product.id) {
            const baseQty = await convertToBaseUnits(item.quantity || 0, item.measureId)
            predictedStock += baseQty
          }
        }
      }
    }

    // Subtract sales since the last count
    for (const sale of salesData) {
      if (sale.productId === product.id) {
        const saleDate = new Date(sale.date || sale.createdAt || 0)
        if (saleDate > lastCountDate) {
          const baseQty = await convertToBaseUnits(sale.quantity || 0, sale.measureId)
          predictedStock -= baseQty
        }
      }
    }

    return Math.max(0, predictedStock) // Ensure non-negative
  }

  // Get available measures for a product
  const getProductMeasures = (product: any) => {
    const productMeasures: string[] = []

    // Add purchase measures
    if (product.purchase?.defaultMeasure) {
      productMeasures.push(product.purchase.defaultMeasure)
    }
    if (product.purchase?.units) {
      product.purchase.units.forEach((unit: any) => {
        if (unit.measure && !productMeasures.includes(unit.measure)) {
          productMeasures.push(unit.measure)
        }
      })
    }

    // Add sales measures
    if (product.sale?.defaultMeasure) {
      if (!productMeasures.includes(product.sale.defaultMeasure)) {
        productMeasures.push(product.sale.defaultMeasure)
      }
    }
    if (product.sale?.units) {
      product.sale.units.forEach((unit: any) => {
        if (unit.measure && !productMeasures.includes(unit.measure)) {
          productMeasures.push(unit.measure)
        }
      })
    }

    return measures.filter((m) => productMeasures.includes(m.id))
  }

  // Adapter functions to handle profile format conversion
  const convertToBackendFormat = (profile: ParLevelProfile): BackendParLevelProfile => {
    const location = useLocation()
    const backendProfile = { ...profile }
    const convertedParLevels: { [key: string]: number | { parLevel: number; measureId: string } } = {}

    Object.entries(profile.parLevels).forEach(([productId, value]) => {
      if (typeof value === "number") {
        convertedParLevels[productId] = value
      } else if (value && typeof value === "object" && "parLevel" in value) {
        // Check if it's a complete UIParLevel object or just a partial one
        const hasRequiredProps = "itemID" in value && "itemName" in value && "unitID" in value && "unitName" in value
        if (hasRequiredProps) {
          const uiParLevel = value as UIParLevel
          // Only include measureId if it's defined and not empty
          if (uiParLevel.unitID && uiParLevel.unitID.trim() !== "") {
            convertedParLevels[productId] = {
              parLevel: uiParLevel.parLevel,
              measureId: uiParLevel.unitID
            }
          } else {
            convertedParLevels[productId] = uiParLevel.parLevel
          }
        } else {
          // Handle partial object with just parLevel and measureId
          const partialLevel = value as { parLevel: number; measureId?: string; unitID?: string }
          const measureId = partialLevel.measureId || partialLevel.unitID
          if (measureId && measureId.trim() !== "") {
            convertedParLevels[productId] = {
              parLevel: partialLevel.parLevel,
              measureId: measureId
            }
          } else {
            convertedParLevels[productId] = partialLevel.parLevel
          }
        }
      }
    })

    backendProfile.parLevels = convertedParLevels as any // Would fix type compatibility
    return backendProfile as any // Would fix type compatibility
  }

  const convertFromBackendFormat = (profile: any): ParLevelProfile => {
    const convertedProfile = { ...profile }
    const convertedParLevels: { [key: string]: { parLevel: number; measureId: string } } = {}

    Object.entries(profile.parLevels || {}).forEach(([productId, value]) => {
      if (typeof value === "number") {
        // Use default measure ID if available from product
        const product = products.find((p) => p.id === productId)
        const defaultMeasureId = product?.purchase?.defaultMeasure || product?.sale?.defaultMeasure || ""
        convertedParLevels[productId] = {
          parLevel: value as number,
          measureId: defaultMeasureId,
        }
      } else {
        convertedParLevels[productId] = value as { parLevel: number; measureId: string }
      }
    })

    convertedProfile.parLevels = convertedParLevels
    return convertedProfile as ParLevelProfile
  }

  // Fetch par level profiles function
  const fetchProfiles = async () => {
    // All data operations are now handled through StockContext

    try {
      const fetchedProfiles = await contextFetchParProfiles()
      debugLog("Fetched par profiles:", fetchedProfiles)
      setProfiles(fetchedProfiles.map((profile) => convertFromBackendFormat(profile)))

      // Auto-select first profile if available
      if (fetchedProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(fetchedProfiles[0].id!)
      }
    } catch (error) {
      debugWarn("Error fetching par profiles:", error)
      showNotification("Failed to fetch par level profiles", "error")
    }
  }

  // Ensure products and measures are loaded when component mounts
  useEffect(() => {
    if (products.length === 0) {
      refreshProducts().catch(err => debugWarn('Failed to refresh products:', err))
    }
    if (measures.length === 0) {
      refreshMeasures().catch(err => debugWarn('Failed to refresh measures:', err))
    }
  }, [products.length, measures.length, refreshProducts, refreshMeasures])

  // Fetch par level profiles
  useEffect(() => {
    fetchProfiles()
  }, [selectedProfile, products])

  // Transform products to par level rows
  useEffect(() => {
    const transformProductsToParLevelRows = async () => {
      debugLog("ParLevelsTable: Starting data transformation", { products: products.length, measures: measures.length, profiles: profiles.length, selectedProfile })
      
      if (!products.length || !measures.length) {
        debugLog("Waiting for products and measures data...")
        setRows([]) // Clear rows while waiting
        // Loading state removed - UI renders instantly
        return
      }

      // Loading state removed - UI renders instantly
      debugLog("Transforming products to par level rows...")

      try {
        const selectedProfileData = profiles.find((p) => p.id === selectedProfile)
        debugLog("Selected profile data:", selectedProfileData)

        // Fetch sales and purchase data
        const [salesData, purchaseData, latestCounts] = await Promise.all([
          contextFetchSalesHistory(),
          contextFetchPurchasesHistory(),
          contextFetchLatestCountsForProducts(),
        ])

        const parLevelRows: ParLevelRow[] = []

        for (const product of products) {
          if (!product.id) continue

          // Get category and subcategory names
          const categoryName = categories.find((c) => c.id === product.categoryId)?.name || "Unknown"
          const subcategoryName = subcategories.find((sc) => sc.id === product.subcategoryId)?.name || "Unknown"
          const salesDivisionName = salesDivisions.find((sd) => sd.id === product.salesDivisionId)?.name || "Unknown"

          // Get measures
          const purchaseMeasureId = product.purchase?.defaultMeasure
          const salesMeasureId = product.sale?.defaultMeasure
          const purchaseMeasure = measures.find((m) => m.id === purchaseMeasureId)
          const salesMeasure = measures.find((m) => m.id === salesMeasureId)

          // Get par level for this product from the selected profile
          const parLevelData = selectedProfileData?.parLevels?.[product.id]
          let parLevelValue = 0
          let parLevelMeasureId = ""
          
          if (typeof parLevelData === "number") {
            parLevelValue = parLevelData
          } else if (parLevelData && typeof parLevelData === "object" && "parLevel" in parLevelData) {
            parLevelValue = parLevelData.parLevel
            // Check if it has the full UIParLevel structure
            if ("unitID" in parLevelData && typeof parLevelData.unitID === "string") {
              parLevelMeasureId = parLevelData.unitID
            } else if ("measureId" in parLevelData && typeof parLevelData.measureId === "string") {
              parLevelMeasureId = parLevelData.measureId
            }
          }

          // const parLevelMeasure = measures.find((m) => m.id === parLevelMeasureId) // Would use when implementing par level display

          // Calculate purchase data
          const productPurchases = purchaseData.filter(
            (p: any) => p.items && p.items.some((item: any) => item.itemID === product.id),
          )

          let totalPurchaseQuantity = 0
          let totalPurchaseCost = 0
          let purchaseBaseQuantity = 0

          for (const purchase of productPurchases) {
            if (purchase.items) {
              for (const item of purchase.items) {
                if (item.itemID === product.id) {
                  totalPurchaseQuantity += item.quantity || 0
                  totalPurchaseCost += item.totalPrice || 0

                  // Convert to base units
                  const baseQty = await convertToBaseUnits(item.quantity || 0, item.measureId)
                  purchaseBaseQuantity += baseQty
                }
              }
            }
          }

          // Calculate sales data
          const productSales = salesData.filter((s: any) => s.productId === product.id)
          let totalSoldQuantity = 0
          let totalSoldValue = 0
          let salesBaseQuantity = 0

          for (const sale of productSales) {
            totalSoldQuantity += sale.quantity || 0
            totalSoldValue += sale.salePrice || 0

            // Convert to base units
            const baseQty = await convertToBaseUnits(sale.quantity || 0, sale.measureId)
            salesBaseQuantity += baseQty
          }

          // Get predicted stock and previous count
          const latestCount = latestCounts[product.id]
          // const previousCount = latestCount?.baseQuantity || 0 // Would use when implementing previous count display
          const predictedStock = await calculatePredictedStock(product, productSales, productPurchases, latestCount)

          // Calculate cost per unit and profit
          // const costPerUnit = purchaseBaseQuantity > 0 ? totalPurchaseCost / purchaseBaseQuantity : 0 // Would use when implementing cost display
          // const salesPrice = product.sale?.price || 0 // Would use when implementing sales price display
          // const profit = salesPrice - costPerUnit // Would use when implementing profit display

          // Get current stock
          let currentStock = predictedStock
          try {
            const fetchedStock = await contextFetchCurrentStock()
            currentStock = Array.isArray(fetchedStock) ? predictedStock : (fetchedStock || predictedStock)
          } catch (error) {
            currentStock = predictedStock
          }

          // Calculate total value
          // const totalValue = currentStock * costPerUnit // Would use when implementing total value display

          // Calculate par level in base units
          const parLevelBaseQuantity =
            parLevelMeasureId && parLevelValue > 0 
              ? await convertToBaseUnits(parLevelValue, parLevelMeasureId) 
              : 0
          
          // Debug logging for measure conversion issues
          if (parLevelMeasureId && parLevelValue > 0 && parLevelBaseQuantity === 0) {
            debugWarn(`ParLevel conversion resulted in 0 for product ${product.name}, measureId: ${parLevelMeasureId}, value: ${parLevelValue}`)
          }

          // Calculate order quantity
          const orderQuantityBase = Math.max(0, parLevelBaseQuantity - currentStock)
          const orderQuantityInMeasure = orderQuantityBase > 0 ? orderQuantityBase : 0

          // Determine status
          let status: "OK" | "Low" | "Order Required" = "OK"
          if (parLevelValue > 0 && parLevelBaseQuantity > 0) {
            if (currentStock <= 0) {
              status = "Order Required"
            } else if (currentStock < parLevelBaseQuantity * 0.5) {
              status = "Low"
            }
          }

          // Get base units for display
          // const purchaseBaseUnit = getBaseUnit(purchaseMeasure) // Would use when implementing purchase display
          // const salesBaseUnit = getBaseUnit(salesMeasure) // Would use when implementing sales display
          // const defaultBaseUnit = getBaseUnit(purchaseMeasure || salesMeasure) // Would use when implementing unit display

          // Get the primary measure for display
          const primaryMeasure = purchaseMeasure || salesMeasure
          const primaryMeasureId = purchaseMeasureId || salesMeasureId
          const parLevelMeasure = measures.find((m) => m.id === parLevelMeasureId)
          
          // Calculate additional fields
          const costPerUnit = purchaseBaseQuantity > 0 ? totalPurchaseCost / purchaseBaseQuantity : 0
          const dailySales = productSales.length > 0 ? totalSoldQuantity / Math.max(productSales.length, 1) : 0
          
          parLevelRows.push({
            productId: product.id,
            productName: product.name || "Unknown Product",
            category: categoryName,
            subcategory: subcategoryName,
            salesDivision: salesDivisionName,
            type: product.type || "Unknown",

            // Stock data with units
            currentStock: currentStock,
            predictedStock: predictedStock.toString(),
            predictedStockValue: predictedStock,

            // Purchase data
            purchaseBaseQuantity: purchaseBaseQuantity.toString(),
            purchaseBaseQuantityValue: purchaseBaseQuantity,
            totalPurchaseQuantity: totalPurchaseQuantity.toString(),
            totalPurchaseQuantityValue: totalPurchaseQuantity,
            totalPurchaseCost: totalPurchaseCost,
            purchaseSupplier: "", // TODO: Get supplier name if needed
            purchaseMeasure: purchaseMeasure?.name || "",

            // Sales data
            salesBaseQuantity: salesBaseQuantity.toString(),
            salesBaseQuantityValue: salesBaseQuantity,
            totalSoldQuantity: totalSoldQuantity.toString(),
            totalSoldQuantityValue: totalSoldQuantity,
            totalSoldValue: totalSoldValue,
            salesMeasure: salesMeasure?.name || "",

            // Par level data
            parLevel: parLevelValue,
            parLevelWithUnit: parLevelValue > 0 ? `${parLevelValue} ${parLevelMeasure?.name || primaryMeasure?.name || "unit"}` : "0",
            parLevelBaseQuantity: parLevelBaseQuantity.toString(),
            parLevelBaseValue: parLevelBaseQuantity,
            parLevelMeasureId: parLevelMeasureId || primaryMeasureId || "",
            parLevelMeasureName: parLevelMeasure?.name || primaryMeasure?.name || "Unknown",

            // Order quantity data
            orderQuantity: orderQuantityInMeasure,
            orderQuantityWithUnit: orderQuantityInMeasure > 0 ? `${orderQuantityInMeasure.toFixed(stockDecimalPlaces)} ${primaryMeasure?.name || "unit"}` : "0",
            orderQuantityBaseUnit: primaryMeasure?.unit || "unit",
            orderQuantityBaseValue: orderQuantityBase,

            // Required properties for ParLevelRow interface
            measureId: primaryMeasureId || "",
            measureName: primaryMeasure?.name || "Unknown",
            status,
            
            // Additional calculated fields
            averageDailySales: dailySales,
            daysRemaining: dailySales > 0 ? Math.floor(currentStock / dailySales) : 0,
            costPerUnit: costPerUnit,
            totalValue: currentStock * costPerUnit,
            profit: totalSoldValue - totalPurchaseCost,
            defaultMeasure: primaryMeasure?.name || "unit",
          })
        }

        debugLog("Generated par level rows:", parLevelRows.length)
        setRows(parLevelRows)
      } catch (error) {
        debugWarn("Error transforming products to par level rows:", error)
        showNotification("Error loading product data", "error")
      } finally {
        // Loading state removed - UI renders instantly
      }
    }

    transformProductsToParLevelRows()
  }, [
    products,
    measures,
    categories,
    subcategories,
    salesDivisions,
    selectedProfile,
    profiles,
    // All data operations are now handled through StockContext
  ])

  // Handle sorting
  const handleSort = (columnId: string) => {
    const column = columnId as keyof ParLevelRow
    const isAsc = sortBy === column && sortDirection === "asc"
    setSortDirection(isAsc ? "desc" : "asc")
    setSortBy(column)
  }

  // Group data by field
  const groupData = (data: ParLevelRow[]) => {
    if (groupBy.field === "none") return { "All Products": data }

    const grouped: { [key: string]: ParLevelRow[] } = {}

    data.forEach((row) => {
      let groupKey = ""
      switch (groupBy.field) {
        case "type":
          groupKey = row.type || "Unknown"
          break
        case "category":
          groupKey = row.category || "Unknown"
          break
        case "subcategory":
          groupKey = row.subcategory || "Unknown"
          break
        case "salesDivision":
          groupKey = row.salesDivision || "Unknown"
          break
        default:
          groupKey = "All Products"
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = []
      }
      grouped[groupKey].push(row)
    })

    return grouped
  }

  // Sort and filter data
  const sortedAndFilteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesSearch =
        row.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.salesDivision || "").toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = !typeFilter || row.type === typeFilter
      const matchesCategory = !categoryFilter || row.category === categoryFilter
      const matchesSubcategory = !subcategoryFilter || row.subcategory === subcategoryFilter
      const matchesSalesDivision = !salesDivisionFilter || row.salesDivision === salesDivisionFilter
      const matchesStatus = !statusFilter || row.status === statusFilter

      return (
        matchesSearch && matchesType && matchesCategory && matchesSubcategory && matchesSalesDivision && matchesStatus
      )
    })

    // Sort the data
    filtered.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc" ? ((aValue || 0) < (bValue || 0) ? -1 : 1) : (bValue || 0) < (aValue || 0) ? -1 : 1
    })

    return filtered
  }, [
    rows,
    searchQuery,
    sortBy,
    sortDirection,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    salesDivisionFilter,
    statusFilter,
  ])

  // DataHeader options
  const filterOptions = useMemo(() => {
    const uniqueTypes = [...new Set(rows.map(row => row.type).filter(Boolean))]
    const uniqueCategories = [...new Set(rows.map(row => row.category).filter(Boolean))]
    const uniqueSubcategories = [...new Set(rows.map(row => row.subcategory).filter(Boolean))]
    const uniqueSalesDivisions = [...new Set(rows.map(row => row.salesDivision).filter(Boolean))]
    const uniqueStatuses = [...new Set(rows.map(row => row.status).filter(Boolean))]

    return [
      {
        label: 'Type',
        options: [
          { id: '', name: 'All Types' },
          ...uniqueTypes.map(type => ({ id: type || '', name: type || '' }))
        ],
        selectedValues: filters.type || [],
        onSelectionChange: (values: string[]) => handleFilterChange('type', values)
      },
      {
        label: 'Category',
        options: [
          { id: '', name: 'All Categories' },
          ...uniqueCategories.map(category => ({ id: category || '', name: category || '' }))
        ],
        selectedValues: filters.category || [],
        onSelectionChange: (values: string[]) => handleFilterChange('category', values)
      },
      {
        label: 'Subcategory',
        options: [
          { id: '', name: 'All Subcategories' },
          ...uniqueSubcategories.map(subcategory => ({ id: subcategory || '', name: subcategory || '' }))
        ],
        selectedValues: filters.subcategory || [],
        onSelectionChange: (values: string[]) => handleFilterChange('subcategory', values)
      },
      {
        label: 'Sales Division',
        options: [
          { id: '', name: 'All Divisions' },
          ...uniqueSalesDivisions.map(division => ({ id: division || '', name: division || '' }))
        ],
        selectedValues: filters.salesDivision || [],
        onSelectionChange: (values: string[]) => handleFilterChange('salesDivision', values)
      },
      {
        label: 'Status',
        options: [
          { id: '', name: 'All Statuses' },
          ...uniqueStatuses.map(status => ({ id: status || '', name: status || '' }))
        ],
        selectedValues: filters.status || [],
        onSelectionChange: (values: string[]) => handleFilterChange('status', values)
      }
    ]
  }, [rows, filters])

  const columnOptions = useMemo(() => 
    columns.map((col: any) => ({
      key: col.id,
      label: col.label
    })),
    [columns]
  )

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {}
    columns.forEach(col => {
      visibility[col.id] = visibleColumns.has(col.id)
    })
    return visibility
  }, [columns, visibleColumns])

  const sortOptions = useMemo(() => [
    { value: 'productName', label: 'Product Name' },
    { value: 'category', label: 'Category' },
    { value: 'subcategory', label: 'Subcategory' },
    { value: 'salesDivision', label: 'Sales Division' },
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' },
    { value: 'parLevel', label: 'Par Level' },
    { value: 'measureName', label: 'Measure' }
  ], [])

  const groupByOptions = useMemo(() => [
    { value: 'none', label: 'None' },
    { value: 'category', label: 'Category' },
    { value: 'subcategory', label: 'Subcategory' },
    { value: 'salesDivision', label: 'Sales Division' },
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' }
  ], [])

  // DataHeader handlers
  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    const value = selectedValues.length > 0 ? selectedValues[0] : ''
    
    switch (filterId) {
      case 'type':
        setTypeFilter(value)
        break
      case 'category':
        setCategoryFilter(value)
        break
      case 'subcategory':
        setSubcategoryFilter(value)
        break
      case 'salesDivision':
        setSalesDivisionFilter(value)
        break
      case 'status':
        setStatusFilter(value)
        break
    }
  }

  const handleColumnVisibilityChange = (visibility: Record<string, boolean>) => {
    setVisibleColumns(new Set(Object.entries(visibility).filter(([, visible]) => visible).map(([id]) => id)))
  }

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setDataHeaderSortBy(field)
    setDataHeaderSortDirection(direction)
    // Update legacy sort state for compatibility
    setSortBy(field as keyof ParLevelRow)
    setSortDirection(direction)
  }

  const handleGroupByChange = (groupByValue: string) => {
    const groupByOption = groupByOptions.find(option => option.value === groupByValue)
    if (groupByOption) {
      setGroupBy({ field: groupByValue, label: groupByOption.label })
    }
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting par levels as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  // Handle par level edit
  const handleEditParLevel = (productId: string, currentParLevel: number) => {
    setEditingRow(productId)
    setEditValue(currentParLevel)
    setEditMeasureId(products.find((p) => p.id === productId)?.purchase?.defaultMeasure || "")
  }

  // Handle save par level (inline editing)
  const handleSaveParLevelInline = async (productId: string) => {
    if (!selectedProfile) {
      showNotification("Please select a par level profile first", "warning")
      return
    }

    if (!editMeasureId) {
      showNotification("Please select a measure for the par level", "warning")
      return
    }

    try {
      const profileToUpdate = profiles.find((p) => p.id === selectedProfile)
      if (!profileToUpdate) {
        showNotification("Selected profile not found", "error")
        return
      }

      const updatedProfile: ParLevelProfile = {
        ...profileToUpdate,
        parLevels: {
          ...profileToUpdate.parLevels,
          [productId]: editMeasureId && editMeasureId.trim() !== "" ? {
            parLevel: editValue,
            measureId: editMeasureId
          } : editValue,
        },
        updatedAt: new Date().toISOString(),
      }

      await contextSaveParLevelProfile(convertToBackendFormat(updatedProfile))

      // Update local state
      setProfiles(profiles.map((p) => (p.id === selectedProfile ? updatedProfile : p)))

      // Refresh the data to recalculate everything
      // This will trigger the useEffect that transforms products to par level rows
      setSelectedProfile(selectedProfile)

      setEditingRow(null)
      showNotification("Par level updated successfully", "success")
    } catch (error) {
      debugWarn("Error saving par level:", error)
      showNotification("Failed to save par level", "error")
    }
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRow(null)
    setEditValue(0)
    setEditMeasureId("")
  }

  // Handle delete par level
  const handleDeleteParLevel = async (productId: string) => {
    if (!selectedProfile) {
      showNotification("Please select a par level profile first", "warning")
      return
    }

    try {
      const profile = profiles.find((p) => p.id === selectedProfile)
      if (!profile) {
        showNotification("Profile not found", "error")
        return
      }

      // Remove the product from the par levels
      const updatedParLevels = { ...profile.parLevels }
      delete updatedParLevels[productId]

      const updatedProfile = {
        ...profile,
        parLevels: updatedParLevels,
        updatedAt: new Date().toISOString()
      }

      await contextSaveParLevelProfile(updatedProfile)
      
      // Refresh the data
      await fetchProfiles()
      showNotification("Par level deleted successfully", "success")
    } catch (error) {
      debugWarn("Error deleting par level:", error)
      showNotification("Failed to delete par level", "error")
    }
  }


  // Handle create new profile
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      showNotification("Profile name is required", "warning");
      return;
    }

    try {
      // If setting as default, first remove isDefault from all other profiles
      if (newProfileIsDefault) {
        const updatedProfiles = profiles.map(profile => ({
          ...profile,
          isDefault: false
        }));

        for (const profile of updatedProfiles) {
          await contextSaveParLevelProfile(convertToBackendFormat(profile));
        }
      }

      const newProfile: ParLevelProfile = {
        name: newProfileName.trim(),
        description: newProfileDescription.trim(),
        parLevels: {},
        isDefault: newProfileIsDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await contextSaveParLevelProfile(convertToBackendFormat(newProfile))

      // Refresh profiles to get the updated list with the new profile
      await fetchProfiles()

      // Reset form
      setNewProfileName("")
      setNewProfileDescription("")
      setNewProfileIsDefault(false)
      setNewProfileDialog(false)

      showNotification("Par level profile created successfully", "success")
    } catch (error) {
      debugWarn("Error creating par level profile:", error)
      showNotification("Failed to create par level profile", "error")
    }
  }

  // Par Level CRUD form handlers
  const handleOpenParLevelForm = (parLevel: any | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedParLevelForForm(parLevel)
    setParLevelFormMode(mode)
    setParLevelFormOpen(true)
  }

  const handleCloseParLevelForm = () => {
    setParLevelFormOpen(false)
    setSelectedParLevelForForm(null)
    setParLevelFormMode('create')
  }

  // URL-driven modal open (used by StockDashboard header + legacy route redirects)
  useEffect(() => {
    const entity = searchParams.get("crudEntity")
    const mode = searchParams.get("crudMode") as 'create' | 'edit' | 'view' | null
    const id = searchParams.get("id")

    if (entity !== "parLevel" || !mode) return

    if (mode === "create") {
      handleOpenParLevelForm(null, "create")
    } else if ((mode === "edit" || mode === "view") && id) {
      const profile = profiles.find((p) => p.id === id) || null
      if (!profile) return
      handleOpenParLevelForm(profile as any, mode)
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    next.delete("id")
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, profiles, setSearchParams])

  const handleSaveParLevel = async (parLevelData: UIParLevelProfile) => {
    try {
      await contextSaveParLevelProfile(parLevelData)
      showNotification('Par Level Profile saved successfully', 'success')
      handleCloseParLevelForm()
      // Refresh data
      await fetchProfiles()
    } catch (error) {
      console.error('Error saving par level:', error)
      showNotification('Failed to save par level profile', 'error')
    }
  }


  // Handle edit profile
  const handleEditProfile = () => {
    const profile = profiles.find((p): p is ParLevelProfile => typeof p === 'object' && p !== null && p.id === selectedProfile);
    if (!profile) {
      showNotification("Selected profile not found", "warning");
      return;
    }
    
    setEditProfileName(profile.name);
    setEditProfileDescription(profile.description || "");
    setEditProfileIsDefault(profile.isDefault || false);
    setEditProfileDialog(true);
  }

  const handleMakeDefault = async () => {
    if (!selectedProfile) {
      showNotification("No profile selected", "warning");
      return;
    }

    try {
      // First, remove isDefault from all profiles
      const updatedProfiles = profiles.map(profile => ({
        ...profile,
        isDefault: false
      }));

      // Then set the selected profile as default
      const profileToUpdate = updatedProfiles.find(p => p.id === selectedProfile);
      if (profileToUpdate) {
        profileToUpdate.isDefault = true;
        profileToUpdate.updatedAt = new Date().toISOString();

        // Save all profiles to ensure only one is default
        for (const profile of updatedProfiles) {
          await contextSaveParLevelProfile(convertToBackendFormat(profile));
        }

        showNotification("Profile set as default", "success");
        await fetchProfiles(); // Refresh the profiles list
      }
    } catch (error) {
      debugWarn("Error setting default profile:", error);
      showNotification("Failed to set default profile", "error");
    }
  }

  // Handle save profile edit
  const handleSaveProfileEdit = async () => {
    if (!selectedProfile || !editProfileName.trim()) {
      showNotification("Profile name is required", "warning");
      return;
    }

    try {
      const existingProfile = profiles.find(p => p.id === selectedProfile);
      if (!existingProfile) {
        showNotification("Selected profile not found", "error");
        return;
      }

      // If setting as default, first remove isDefault from all other profiles
      if (editProfileIsDefault && !existingProfile.isDefault) {
        const updatedProfiles = profiles.map(profile => ({
          ...profile,
          isDefault: false
        }));

        for (const profile of updatedProfiles) {
          await contextSaveParLevelProfile(convertToBackendFormat(profile));
        }
      }

      const updatedProfile: ParLevelProfile = {
        ...existingProfile,
        name: editProfileName.trim(),
        description: editProfileDescription.trim(),
        isDefault: editProfileIsDefault,
        updatedAt: new Date().toISOString(),
        parLevels: existingProfile.parLevels || {}
      }

      await contextSaveParLevelProfile(convertToBackendFormat(updatedProfile));

      // Update local state
      setProfiles(profiles.map((p) => (p.id === selectedProfile ? updatedProfile : p)));

      setEditProfileDialog(false);
      showNotification("Profile updated successfully", "success");
    } catch (error) {
      debugWarn("Error updating profile:", error);
      showNotification("Failed to update profile", "error");
    }
  };

  // Handle delete profile
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return

    try {
      await contextDeleteParProfile(selectedProfile)

      // Update local state
      const updatedProfiles = profiles.filter((p) => p.id !== selectedProfile)
      setProfiles(updatedProfiles)
      setSelectedProfile(updatedProfiles.length > 0 ? updatedProfiles[0].id! : "")

      setDeleteProfileDialog(false)
      showNotification("Profile deleted successfully", "success")
    } catch (error) {
      debugWarn("Error deleting profile:", error)
      showNotification("Failed to delete profile", "error")
    }
  }

  // Handle group toggle
  const handleGroupToggle = (groupKey: string) => {
    const newExpandedGroups = new Set(expandedGroups)
    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey)
    } else {
      newExpandedGroups.add(groupKey)
    }
    setExpandedGroups(newExpandedGroups)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK":
        return "success"
      case "Low":
        return "warning"
      case "Order Required":
        return "error"
      default:
        return "default"
    }
  }



  const groupedData = groupData(sortedAndFilteredRows)
  const visibleColumnsList = columns.filter((column) => visibleColumns.has(column.id))

  // Handle refresh function
  const handleRefresh = async () => {
    try {
      await fetchProfiles()
      // The useEffect will automatically trigger data transformation when profiles change
    } catch (error) {
      debugWarn("Error refreshing par level data:", error)
    }
  }

  // Create additional controls for DataHeader
  const additionalControls = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 400 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel sx={{ color: "white" }}>Par Level Profile</InputLabel>
        <Select
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          label="Par Level Profile"
          sx={{
            color: "white",
            "& .MuiSvgIcon-root": { color: "white" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
          }}
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{profile.name}</span>
                {profile.isDefault && (
                  <Chip 
                    label="Default" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontSize: '0.75rem' }}>
        {profiles.find(p => p.id === selectedProfile)?.description || ''}
      </Typography>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setNewProfileDialog(true)}
        size="small"
      >
        New Profile
      </Button>
    </Box>
  )

  return (
    <Box>
      <DataHeader
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search items..."
        additionalControls={additionalControls}
        filters={filterOptions}
        columns={columnOptions}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        sortOptions={sortOptions}
        sortValue={dataHeaderSortBy}
        sortDirection={dataHeaderSortDirection}
        onSortChange={handleSortChange}
        groupByOptions={groupByOptions}
        groupByValue={groupBy.field}
        onGroupByChange={handleGroupByChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onRefresh={handleRefresh}
        additionalButtons={[
          {
            label: "Create Par Level",
            icon: <AddIcon />,
            onClick: () => handleOpenParLevelForm(null, 'create'),
            variant: "contained" as const,
            color: "primary" as const
          }
        ]}
      />


      {/* Profile Info */}
      {selectedProfile && (
        <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6">
                  {profiles.find((p) => p.id === selectedProfile)?.name || "Unknown Profile"}
                </Typography>
                {profiles.find((p) => p.id === selectedProfile)?.isDefault && (
                  <Chip 
                    label="Default" 
                    size="small" 
                    color="primary" 
                    variant="filled"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {profiles.find((p) => p.id === selectedProfile)?.description || "No description"}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!profiles.find((p) => p.id === selectedProfile)?.isDefault && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleMakeDefault}
                  color="primary"
                >
                  Make Default
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={handleEditProfile}
                color="primary"
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteProfileDialog(true)}
                color="error"
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              {columns
                .filter((column) => visibleColumns.has(column.id))
                .map((column) => (
                  <TableCell 
                    key={column.id} 
                    align="center"
                    sx={{ 
                      textAlign: 'center !important',
                      padding: '16px 16px',
                      cursor: column.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: column.sortable ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                      }
                    }}
                    onClick={column.sortable ? () => handleSort(column.id) : undefined}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 0.5
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {column.label}
                      </Typography>
                      {column.sortable && sortBy === column.id && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                ))}
              <TableCell 
                align="center" 
                sx={{ 
                  textAlign: 'center !important',
                  padding: '16px 16px',
                  fontWeight: 'bold'
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedData).map(([groupKey, groupRows]) => (
              <React.Fragment key={groupKey}>
                {groupBy.field !== "none" && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.filter((col) => visibleColumns.has(col.id)).length + 1}
                      sx={{ bgcolor: "action.selected", fontWeight: "bold" }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                        onClick={() => handleGroupToggle(groupKey)}
                      >
                        {expandedGroups.has(groupKey) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        <GroupWorkIcon sx={{ ml: 1, mr: 1 }} />
                        {groupKey} ({groupRows.length} items)
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {groupRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.filter((col) => visibleColumns.has(col.id)).length + 1}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <EmptyStateCard
                        icon={GroupWorkIcon}
                        title={!selectedProfile ? "Please select a par level profile" : "No products found matching your search"}
                        description={
                          !selectedProfile ? "Select a par level profile from the dropdown above to view data" : "Try adjusting your search or filters"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  groupRows.map((row) => (
                    <TableRow
                      key={row.productId}
                      sx={{
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      {visibleColumnsList.map((column) => {
                        const value = row[column.id as keyof ParLevelRow]
                        return (
                          <TableCell key={column.id} align="center" sx={{ verticalAlign: 'middle' }}>
                            {column.id === "parLevelWithUnit" && editingRow === row.productId ? (
                              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                <TextField
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(Number(e.target.value))}
                                  size="small"
                                  sx={{ width: 80 }}
                                  inputProps={{ min: 0, step: 0.01 }}
                                />
                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                  <Select value={editMeasureId} onChange={(e) => setEditMeasureId(e.target.value)}>
                                    {getProductMeasures(products.find((p) => p.id === row.productId)).map((measure) => (
                                      <MenuItem key={measure.id} value={measure.id}>
                                        {measure.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            ) : column.id === "status" ? (
                              <Chip
                                label={value as string}
                                color={getStatusColor(value as string) as any}
                                size="small"
                                variant={value === "OK" ? "filled" : "outlined"}
                              />
                            ) : column.format ? (
                              column.format(value)
                            ) : (
                              value
                            )}
                          </TableCell>
                        )
                      })}
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        {editingRow === row.productId ? (
                          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                            <IconButton size="small" color="primary" onClick={() => handleSaveParLevelInline(row.productId)}>
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="secondary" onClick={handleCancelEdit}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditParLevel(row.productId, row.parLevel)}
                              disabled={!selectedProfile}
                              title="Edit Par Level"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteParLevel(row.productId)}
                              disabled={!selectedProfile}
                              title="Delete Par Level"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {sortedAndFilteredRows.length} of {rows.length} products
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Order Required: {sortedAndFilteredRows.filter((r) => r.status === "Order Required").length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Low Stock: {sortedAndFilteredRows.filter((r) => r.status === "Low").length}
          </Typography>
        </Box>
      </Box>


      {/* New Profile Dialog */}
      <Dialog open={newProfileDialog} onClose={() => setNewProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Par Level Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            variant="outlined"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProfileDescription}
            onChange={(e) => setNewProfileDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newProfileIsDefault}
                onChange={(e) => setNewProfileIsDefault(e.target.checked)}
                color="primary"
              />
            }
            label="Make this the default profile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProfile} variant="contained">
            Create Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialog} onClose={() => setEditProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Par Level Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            variant="outlined"
            value={editProfileName}
            onChange={(e) => setEditProfileName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editProfileDescription}
            onChange={(e) => setEditProfileDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editProfileIsDefault}
                onChange={(e) => setEditProfileIsDefault(e.target.checked)}
                color="primary"
              />
            }
            label="Make this the default profile"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveProfileEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Profile Dialog */}
      <Dialog open={deleteProfileDialog} onClose={() => setDeleteProfileDialog(false)}>
        <DialogTitle>Delete Par Level Profile</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the profile "{profiles.find((p) => p.id === selectedProfile)?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
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

      {/* Par Level Form Modal */}
                        <CRUDModal
              open={parLevelFormOpen}
              onClose={(reason) => {
                setParLevelFormOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = handleCloseParLevelForm
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "parLevelsTableModal1",
                crudMode: parLevelFormMode,
              }}
              title={parLevelFormMode === 'create' ? 'Create Par Level Profile' : parLevelFormMode === 'edit' ? 'Edit Par Level Profile' : 'View Par Level Profile'}
              mode={parLevelFormMode}
              onEdit={() => setParLevelFormMode('edit')}
              onSave={async (...args) => {
                const __workspaceOnSave = handleSaveParLevel
                if (typeof __workspaceOnSave !== "function") return undefined
                const result = await __workspaceOnSave(...args)
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "parLevelsTableModal1",
                  crudMode: parLevelFormMode,
                })
                return result
              }}
            >
        <ParLevelForm
          parLevel={selectedParLevelForForm}
          mode={parLevelFormMode}
          onSave={handleSaveParLevel}
        />
      </CRUDModal>
    </Box>
  )
}

export default ParLevelsTable
