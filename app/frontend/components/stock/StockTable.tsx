"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useStock } from "../../../backend/context/StockContext"
import type { Product } from "../../../backend/context/StockContext"
import * as StockFunctions from "../../../backend/functions/Stock"
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Tooltip,
  useTheme,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TabbedProductForm, { TabbedProductFormRef } from "./forms/TabbedProductForm"
import DataHeader from "../reusable/DataHeader"
import type { ColumnOption } from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import { useStockSettings } from "../../hooks/useStockSettings"
import { debugLog, debugWarn } from "../../../utils/debugLog"
import EmptyStateCard from "../reusable/EmptyStateCard"

interface SimpleProductRow {
  id: string
  __rowKey: string
  name: string
  category: string
  categoryId: string
  subCategory: string
  salesDivision: string
  course: string
  type: string
  purchasePrice: number
  salesPrice: number
  purchaseSupplier: string
  status: string
  predictedStock: number
  previousStock: number
  sku: string
  barcode: string
  description: string
  unit: string
  baseUnit: string
  quantityOfBaseUnits: number
  salesMeasure: string
  purchaseMeasure: string
  costPerBaseUnit: number
  profitPerBaseUnit: number
  profitForSalesMeasure: number
  purchases: number
  sales: number
  wastage: number
  minStock: number
  maxStock: number
  location: string
  lastUpdated: string
  createdDate: string
  profitMargin: number
}



const StockTable: React.FC = () => {
  const location = useLocation()
  const { state, deleteProduct, createProduct, updateProduct, fetchParProfiles } = useStock()
  const { dataVersion, loading } = state
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const theme = useTheme()
  const { canEdit, canDelete } = usePermission()
  const { stockDecimalPlaces } = useStockSettings()
  const canMutate = canEdit("stock", "items")
  const canRemove = canDelete("stock", "items")

  const [defaultParLevels, setDefaultParLevels] = useState<Record<string, any>>({})

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const profiles = await fetchParProfiles()
        const def = (profiles || []).find((p: any) => p?.isDefault) || (profiles || [])[0]
        const parLevels = def && typeof def === "object" ? (def.parLevels || {}) : {}
        if (!cancelled) setDefaultParLevels(parLevels || {})
      } catch {
        if (!cancelled) setDefaultParLevels({})
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fetchParProfiles, dataVersion])

  const [searchQuery, setSearchQuery] = useState("")
  const [displayedItems, setDisplayedItems] = useState<SimpleProductRow[]>([])
  const [itemsPerBatch] = useState(50)
  const [currentBatch, setCurrentBatch] = useState(1)
  const observerRef = useRef<HTMLDivElement>(null)

  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  
  // Legacy sorting state for compatibility
  const [orderBy, setOrderBy] = useState<keyof SimpleProductRow>("name")
  const [order, setOrder] = useState<'asc' | 'desc'>("asc")
  
  // Filters state for DataHeader
  const [filters, setFilters] = useState({
    category: [] as string[],
    subCategory: [] as string[],
    salesDivision: [] as string[],
    course: [] as string[],
    type: [] as string[],
    status: [] as string[],
    supplier: [] as string[]
  })

  // Handle filter changes from DataHeader
  const handleFilterChange = (filterType: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values.includes('all') ? [] : values
    }))
  }


  // Column configuration for visibility and width
  const [columnConfig, setColumnConfig] = useState<Record<string, { visible: boolean; label: string; width: number }>>({
    name: { visible: true, label: "Name", width: 200 },
    category: { visible: true, label: "Category", width: 150 },
    subCategory: { visible: false, label: "Sub Category", width: 130 },
    salesDivision: { visible: false, label: "Sales Division", width: 130 },
    course: { visible: false, label: "Course", width: 100 },
    sku: { visible: true, label: "SKU", width: 120 },
    type: { visible: false, label: "Type", width: 100 },
    purchaseSupplier: { visible: true, label: "Supplier", width: 150 },
    salesMeasure: { visible: true, label: "Sales Measures", width: 200 },
    purchaseMeasure: { visible: true, label: "Purchase Measures", width: 200 },
    purchasePrice: { visible: true, label: "Purchase Price", width: 130 },
    salesPrice: { visible: true, label: "Sales Price", width: 120 },
    baseUnit: { visible: false, label: "Base Unit", width: 100 },
    quantityOfBaseUnits: { visible: false, label: "Qty Base Units", width: 120 },
    costPerBaseUnit: { visible: false, label: "Cost/Base Unit", width: 120 },
    profitPerBaseUnit: { visible: false, label: "Profit/Base Unit", width: 130 },
    profitForSalesMeasure: { visible: false, label: "Profit/Sales Measure", width: 150 },
    profitMargin: { visible: true, label: "Profit %", width: 100 },
    previousStock: { visible: true, label: "Previous Stock", width: 120 },
    purchases: { visible: true, label: "Purchases", width: 100 },
    sales: { visible: true, label: "Sales", width: 100 },
    predictedStock: { visible: true, label: "Current Stock", width: 120 },
    wastage: { visible: false, label: "Wastage", width: 100 },
    status: { visible: true, label: "Status", width: 100 },
    barcode: { visible: false, label: "Barcode", width: 120 },
    description: { visible: false, label: "Description", width: 200 },
    unit: { visible: false, label: "Unit", width: 80 },
    minStock: { visible: false, label: "Min Stock", width: 100 },
    maxStock: { visible: false, label: "Max Stock", width: 100 },
    location: { visible: false, label: "Location", width: 120 },
    lastUpdated: { visible: false, label: "Last Updated", width: 120 },
    createdDate: { visible: false, label: "Created", width: 120 },
  })

  // Product form states
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedProductForForm, setSelectedProductForForm] = useState<Product | null>(null)
  
  // Ref for the product form to expose submit function
  const productFormRef = useRef<TabbedProductFormRef>(null)

  // Helper functions to get display names from IDs
  const suppliersById = useMemo(() => {
    const map = new Map<string, any>()
    for (const s of state.suppliers || []) {
      if (!s) continue
      if (s.id) map.set(String(s.id), s)
      // Backward compatibility: some suppliers may carry a legacy id
      const legacy = (s as any).legacyId
      if (legacy) map.set(String(legacy), s)
    }
    return map
  }, [state.suppliers])

  const getSupplierName = useCallback((supplierId: string | undefined) => {
    if (!supplierId) return "No Supplier"
    const supplier = suppliersById.get(String(supplierId))
    return supplier?.name || supplierId
  }, [suppliersById])

  const getMeasureName = useCallback((measureId: string | undefined) => {
    if (!measureId) return "pcs"
    const measure = state.measures?.find(m => m.id === measureId)
    return measure?.name || measure?.abbreviation || "Unknown Unit"
  }, [state.measures])

  const getCategoryName = useCallback((categoryId: string | undefined) => {
    if (!categoryId) return ""
    const category = state.categories?.find(c => c.id === categoryId)
    return category?.name || categoryId
  }, [state.categories])

  const getSubCategoryName = useCallback((subcategoryId: string | undefined) => {
    if (!subcategoryId) return ""
    const subcategory = state.subcategories?.find(sc => sc.id === subcategoryId)
    return subcategory?.name || subcategoryId
  }, [state.subcategories])

  const getSalesDivisionName = useCallback((salesDivisionId: string | undefined) => {
    if (!salesDivisionId) return ""
    const salesDivision = state.salesDivisions?.find(sd => sd.id === salesDivisionId)
    return salesDivision?.name || salesDivisionId
  }, [state.salesDivisions])

  const getCourseName = useCallback((courseId: string | undefined) => {
    if (!courseId) return ""
    const course = state.courses?.find(c => c.id === courseId)
    return course?.name || courseId
  }, [state.courses])

  const getProductSupplierId = useCallback((product: any): string | undefined => {
    if (!product) return undefined
    // Primary
    if (product.purchase?.defaultSupplier) return product.purchase.defaultSupplier
    // Legacy / alternate
    if (product.purchase?.supplierId) return product.purchase.supplierId
    // Fallback: supplier on the unit matching default measure
    const defaultMeasureId = product.purchase?.defaultMeasure || product.purchase?.measure
    const matchingUnit = product.purchase?.units?.find(
      (u: any) => u?.supplierId && u?.measure === defaultMeasureId
    )
    if (matchingUnit?.supplierId) return matchingUnit.supplierId
    // Final fallback: any purchase unit with supplier
    const anyUnit = product.purchase?.units?.find((u: any) => u?.supplierId)
    if (anyUnit?.supplierId) return anyUnit.supplierId
    return undefined
  }, [])

  const formatMoneyOrBlank = useCallback((val: unknown) => {
    const num = typeof val === "number" ? val : Number(val)
    if (!Number.isFinite(num) || num === 0) return "-"
    return `£${num.toFixed(2)}`
  }, [])


  const rows: SimpleProductRow[] = useMemo(() => {
    if (!state.products || !Array.isArray(state.products)) return []
    
    return state.products.map((product: Product, idx: number) => {
      // Get prices from default measure units (correct way)
      let purchasePrice = 0
      let salesPrice = 0
      
      // For recipe-type products, calculate cost from ingredients using proper helper
      if (product.type === "recipe" || product.type === "choice" || product.type === "prepped-item") {
        // Use StockFunctions.getProductCost which handles recipe calculation properly
        purchasePrice = StockFunctions.getProductCost(product, state.products, state.measures)
        
        // Sales price from default sale unit
        const defaultSaleUnit = product.sale?.units?.find(
          (u: any) => u.measure === product.sale?.defaultMeasure
        )
        salesPrice = defaultSaleUnit?.price || product.sale?.price || product.salesPrice || 0
      } else {
        // For non-recipe products, use default measure unit prices
        purchasePrice = StockFunctions.getDefaultPurchasePrice(product)
        salesPrice = StockFunctions.getDefaultSalePrice(product)
      }
      
      const profitMargin = purchasePrice > 0 ? ((salesPrice - purchasePrice) / purchasePrice) * 100 : 0
      
      // Calculate stock movements for display
      // Get the latest stock count
      const latestCount = state.latestCounts?.[product.id]
      const previousStock = latestCount?.baseQuantity || 0
      const countDate = latestCount?.date ? new Date(latestCount.date) : new Date(0)
      
      // Calculate purchases SINCE the latest stock count (in base units)
      // Use purchaseHistory for full purchase records (not purchase orders)
      let totalPurchases = 0
      if (state.purchaseHistory && Array.isArray(state.purchaseHistory)) {
        state.purchaseHistory.forEach((purchase: any) => {
          const purchaseDate = new Date(purchase.dateOrdered || purchase.date || 0)
          // Only count purchases after the stock count date
          if (purchaseDate >= countDate) {
            if (purchase.items && Array.isArray(purchase.items)) {
              purchase.items.forEach((item: any) => {
                if (item.itemID === product.id || item.productId === product.id) {
                  const baseQty = StockFunctions.convertToBaseUnits(
                    item.quantity || 0,
                    item.measureId,
                    state.measures
                  )
                  totalPurchases += baseQty
                }
              })
            }
          }
        })
      }
      
      // Calculate sales SINCE the latest stock count (in base units)
      let totalSales = 0
      if (state.salesHistory && Array.isArray(state.salesHistory)) {
        state.salesHistory.forEach((sale: any) => {
          const saleDate = new Date(sale.date || sale.timestamp || 0)
          // Only count sales after the stock count date
          if (saleDate >= countDate) {
            if (sale.productId === product.id || sale.itemID === product.id) {
              const baseQty = StockFunctions.convertToBaseUnits(
                sale.quantity || 0,
                sale.measureId,
                state.measures
              )
              totalSales += baseQty
            }
          }
        })
      }
      
      // Use the product's existing predictedStock/currentStock if available, otherwise calculate
      const currentStock = product.predictedStock || product.currentStock || (previousStock + totalPurchases - totalSales)

      // Status based on default par level + current stock (all in base units)
      const parEntryRaw: any = defaultParLevels?.[product.id as any]
      const parEntry: any = typeof parEntryRaw === "number" ? { parLevel: parEntryRaw } : (parEntryRaw || {})
      const parLevelValue = Number(parEntry?.parLevel || 0) || 0
      const lowStockValue = Number(parEntry?.lowStockValue || 0) || 0
      const parMeasureId =
        (typeof parEntry?.measureId === "string" && parEntry.measureId.trim() !== "" ? parEntry.measureId : "") ||
        product.purchase?.defaultMeasure ||
        product.sale?.defaultMeasure ||
        product.purchase?.measure ||
        product.sale?.measure ||
        ""

      const parLevelBase =
        parMeasureId && parLevelValue > 0
          ? StockFunctions.convertToBaseUnits(parLevelValue, parMeasureId, state.measures)
          : 0
      const lowStockBase =
        parMeasureId && lowStockValue > 0
          ? StockFunctions.convertToBaseUnits(lowStockValue, parMeasureId, state.measures)
          : 0

      // Status labels for stock items list:
      // - No Stock: currentStock <= 0
      // - Low Stock: currentStock <= lowStockValue (when configured)
      // - Above Par: currentStock >= parLevel (when configured)
      // - In Stock: otherwise (including below par but > low)
      let computedStatus = currentStock <= 0 ? "No Stock" : "In Stock"
      if (currentStock > 0) {
        if (lowStockBase > 0 && currentStock <= lowStockBase) {
          computedStatus = "Low Stock"
        } else if (parLevelBase > 0 && currentStock >= parLevelBase) {
          computedStatus = "Above Par"
        } else {
          computedStatus = "In Stock"
        }
      }

      const productId = (product as any)?.id || ""
      // Unique key for rendering (prevents React row re-use when ids are missing/duplicate)
      const rowKey =
        productId ||
        (product as any)?.sku ||
        `${(product as any)?.name || "product"}-${idx}-${(product as any)?.barcode || ""}`
      
      return {
        id: productId,
        __rowKey: rowKey,
        name: product.name || "",
        category: product.categoryName || getCategoryName(product.categoryId) || "",
        categoryId: product.categoryId || "",
        subCategory: product.subcategoryName || getSubCategoryName(product.subcategoryId) || "",
        salesDivision: product.salesDivisionName || getSalesDivisionName(product.salesDivisionId) || "",
        course: getCourseName(product.course) || "",
        type: product.type || "",
        purchasePrice,
        salesPrice,
        profitMargin,
        purchaseSupplier: getSupplierName(getProductSupplierId(product)) || "No Supplier",
        status: computedStatus,
        predictedStock: currentStock,
        previousStock: previousStock,
        sku: product.sku || product.id || "",
        barcode: product.barcode || "",
        description: product.description || "",
        unit: (product as any).unit || "pcs",
        baseUnit: (product as any).baseUnit || product.baseUnit || "pcs",
        quantityOfBaseUnits: (product as any).quantityOfBaseUnits || 1,
        // Use defaultMeasure instead of measure (CORRECTED)
        salesMeasure: getMeasureName(product.sale?.defaultMeasure || product.sale?.measure) || "pcs",
        purchaseMeasure: getMeasureName(product.purchase?.defaultMeasure || product.purchase?.measure) || "pcs",
        costPerBaseUnit: (product as any).costPerBaseUnit || purchasePrice,
        profitPerBaseUnit: (product as any).profitPerBaseUnit || (salesPrice - purchasePrice),
        profitForSalesMeasure: (product as any).profitForSalesMeasure || (salesPrice - purchasePrice),
        purchases: totalPurchases,
        sales: totalSales,
        wastage: (product as any).wastage || 0,
        minStock: (product as any).minStock || 0,
        maxStock: (product as any).maxStock || 0,
        location: (product as any).location || "",
        lastUpdated: (product as any).lastUpdated || (typeof product.createdAt === 'string' ? product.createdAt : new Date().toISOString().split('T')[0]),
        createdDate: typeof product.createdAt === 'string' ? product.createdAt : new Date().toISOString().split('T')[0],
      }
    })
  }, [state.products, state.latestCounts, state.purchaseHistory, state.salesHistory, state.measures, defaultParLevels, getSupplierName, getMeasureName, getCategoryName, getSubCategoryName, getSalesDivisionName, getCourseName, dataVersion])

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    return [...new Set(rows.map(item => item.category).filter(Boolean))]
  }, [rows])

  const uniqueStatuses = useMemo(() => {
    return [...new Set(rows.map(item => item.status).filter(Boolean))]
  }, [rows])

  const uniqueSuppliers = useMemo(() => {
    return [...new Set(rows.map(item => item.purchaseSupplier).filter(Boolean))]
  }, [rows])

  const uniqueSubCategories = useMemo(() => {
    return [...new Set(rows.map(item => item.subCategory).filter(Boolean))]
  }, [rows])

  const uniqueSalesDivisions = useMemo(() => {
    return [...new Set(rows.map(item => item.salesDivision).filter(Boolean))]
  }, [rows])

  const uniqueCourses = useMemo(() => {
    return [...new Set(rows.map(item => item.course).filter(Boolean))]
  }, [rows])

  const uniqueTypes = useMemo(() => {
    return [...new Set(rows.map(item => item.type).filter(Boolean))]
  }, [rows])

  // DataHeader options
  const filterOptions = useMemo(() => [
    {
      label: 'Category',
      options: [
        { id: 'all', name: 'All Categories' },
        ...uniqueCategories.map(cat => ({ id: cat, name: cat }))
      ],
      selectedValues: filters.category || [],
      onSelectionChange: (values: string[]) => handleFilterChange('category', values)
    },
    {
      label: 'Sub Category',
      options: [
        { id: 'all', name: 'All Sub Categories' },
        ...uniqueSubCategories.map(subCat => ({ id: subCat, name: subCat }))
      ],
      selectedValues: filters.subCategory || [],
      onSelectionChange: (values: string[]) => handleFilterChange('subCategory', values)
    },
    {
      label: 'Sales Division',
      options: [
        { id: 'all', name: 'All Sales Divisions' },
        ...uniqueSalesDivisions.map(div => ({ id: div, name: div }))
      ],
      selectedValues: filters.salesDivision || [],
      onSelectionChange: (values: string[]) => handleFilterChange('salesDivision', values)
    },
    {
      label: 'Course',
      options: [
        { id: 'all', name: 'All Courses' },
        ...uniqueCourses.map(course => ({ id: course, name: course }))
      ],
      selectedValues: filters.course || [],
      onSelectionChange: (values: string[]) => handleFilterChange('course', values)
    },
    {
      label: 'Type',
      options: [
        { id: 'all', name: 'All Types' },
        ...uniqueTypes.map(type => ({ id: type, name: type }))
      ],
      selectedValues: filters.type || [],
      onSelectionChange: (values: string[]) => handleFilterChange('type', values)
    },
    {
      label: 'Status',
      options: [
        { id: 'all', name: 'All Statuses' },
        ...uniqueStatuses.map(status => ({ id: status, name: status }))
      ],
      selectedValues: filters.status || [],
      onSelectionChange: (values: string[]) => handleFilterChange('status', values)
    },
    {
      label: 'Supplier',
      options: [
        { id: 'all', name: 'All Suppliers' },
        ...uniqueSuppliers.map(supplier => ({ id: supplier, name: supplier }))
      ],
      selectedValues: filters.supplier || [],
      onSelectionChange: (values: string[]) => handleFilterChange('supplier', values)
    }
  ], [uniqueCategories, uniqueSubCategories, uniqueSalesDivisions, uniqueCourses, uniqueTypes, uniqueStatuses, uniqueSuppliers, filters])

  const columnOptions = useMemo((): ColumnOption[] => 
    Object.entries(columnConfig).map(([key, config]) => ({
      key: key,
      label: config.label,
      visible: config.visible
    })),
    [columnConfig]
  )

  // Handle column visibility changes from DataHeader
  const handleColumnVisibilityChange = useCallback((visibility: Record<string, boolean>) => {
    setColumnConfig(prev => {
      const newConfig = { ...prev }
      Object.keys(visibility).forEach(key => {
        if (newConfig[key]) {
          newConfig[key] = { ...newConfig[key], visible: visibility[key] }
        }
      })
      return newConfig
    })
  }, [])

  // Convert columnConfig to columnVisibility format for DataHeader
  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {}
    Object.entries(columnConfig).forEach(([key, config]) => {
      visibility[key] = config.visible
    })
    return visibility
  }, [columnConfig])

  const sortOptions = useMemo(() => [
    { value: 'name', label: 'Name' },
    { value: 'category', label: 'Category' },
    { value: 'subCategory', label: 'Sub Category' },
    { value: 'salesDivision', label: 'Sales Division' },
    { value: 'course', label: 'Course' },
    { value: 'type', label: 'Type' },
    { value: 'sku', label: 'SKU' },
    { value: 'purchasePrice', label: 'Purchase Price' },
    { value: 'salesPrice', label: 'Sales Price' },
    { value: 'predictedStock', label: 'Predicted Stock' },
    { value: 'status', label: 'Status' },
    { value: 'purchaseSupplier', label: 'Supplier' },
    { value: 'profitMargin', label: 'Profit Margin' },
    { value: 'salesMeasure', label: 'Sales Measure' },
    { value: 'purchaseMeasure', label: 'Purchase Measure' },
    { value: 'createdDate', label: 'Created Date' },
    { value: 'lastUpdated', label: 'Last Updated' }
  ], [])

  const filteredItems = useMemo(() => {
    let filtered = rows

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.salesDivision?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purchaseSupplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply multi-value filters
    if (filters.category && filters.category.length > 0 && !filters.category.includes('all')) {
      filtered = filtered.filter((item) => filters.category.includes(item.category))
    }

    if (filters.subCategory && filters.subCategory.length > 0 && !filters.subCategory.includes('all')) {
      filtered = filtered.filter((item) => filters.subCategory.includes(item.subCategory))
    }

    if (filters.salesDivision && filters.salesDivision.length > 0 && !filters.salesDivision.includes('all')) {
      filtered = filtered.filter((item) => filters.salesDivision.includes(item.salesDivision))
    }

    if (filters.course && filters.course.length > 0 && !filters.course.includes('all')) {
      filtered = filtered.filter((item) => filters.course.includes(item.course))
    }

    if (filters.type && filters.type.length > 0 && !filters.type.includes('all')) {
      filtered = filtered.filter((item) => filters.type.includes(item.type))
    }

    if (filters.status && filters.status.length > 0 && !filters.status.includes('all')) {
      filtered = filtered.filter((item) => filters.status.includes(item.status))
    }

    if (filters.supplier && filters.supplier.length > 0 && !filters.supplier.includes('all')) {
      filtered = filtered.filter((item) => filters.supplier.includes(item.purchaseSupplier))
    }

    // Apply sorting using new sort state
    const sortKey = sortBy as keyof SimpleProductRow
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]
      
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

    return filtered
  }, [rows, searchQuery, filters, sortBy, sortDirection])

  const loadMoreItems = useCallback((batchNumber?: number) => {
    // Use provided batch number or current state
    const batchToUse = batchNumber !== undefined ? batchNumber : currentBatch
    
    // Check if there are more items to load
    const startIndex = (batchToUse - 1) * itemsPerBatch
    if (startIndex >= filteredItems.length) {
      return
    }
    
    // Load items without showing loading UI (instant UI like HR section)
    const endIndex = startIndex + itemsPerBatch
    const newItems = filteredItems.slice(startIndex, endIndex)
    
    if (batchToUse === 1) {
      setDisplayedItems(newItems)
    } else {
      setDisplayedItems(prev => [...prev, ...newItems])
    }
    
    // Update batch number
    if (batchNumber === undefined) {
      setCurrentBatch(prev => prev + 1)
    } else {
      setCurrentBatch(batchNumber + 1)
    }
  }, [filteredItems, currentBatch, itemsPerBatch])

  useEffect(() => {
    setCurrentBatch(1)
    setDisplayedItems([])
    // Pass batch 1 directly to avoid race condition with state update
    loadMoreItems(1)
  }, [filteredItems, loadMoreItems])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const startIndex = (currentBatch - 1) * itemsPerBatch
        const hasMoreItems = startIndex < filteredItems.length
        
        if (entries[0].isIntersecting && displayedItems.length < filteredItems.length && hasMoreItems) {
          loadMoreItems()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreItems, displayedItems.length, filteredItems.length, currentBatch, itemsPerBatch])


  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in stock":
        return "success"
      case "low stock":
        return "warning"
      case "no stock":
        return "error"
      case "above par":
        return "info"
      default:
        return "default"
    }
  }

  const handleSort = (column: keyof SimpleProductRow) => {
    const isAsc = orderBy === column && order === 'asc'
    const newOrder = isAsc ? 'desc' : 'asc'
    setOrder(newOrder)
    setOrderBy(column)
    // Also update DataHeader state
    setSortBy(column)
    setSortDirection(newOrder)
  }


  // Product form handlers
  const handleOpenProductForm = (product: Product | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedProductForForm(product)
    setProductFormMode(mode)
    setProductFormOpen(true)
  }

  const handleCloseProductForm = () => {
    setProductFormOpen(false)
    setSelectedProductForForm(null)
    setProductFormMode('create')
  }

  // URL-driven modal open (used by StockDashboard header + legacy route redirects)
  useEffect(() => {
    const entity = searchParams.get("crudEntity")
    const mode = searchParams.get("crudMode") as 'create' | 'edit' | 'view' | null
    const id = searchParams.get("id")

    if (entity !== "product" || !mode) return

    if (mode === "create") {
      handleOpenProductForm(null, "create")
    } else if ((mode === "edit" || mode === "view") && id) {
      const product = state.products?.find((p: Product) => p.id === id) || null
      if (!product) return
      handleOpenProductForm(product, mode)
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    next.delete("id")
    setSearchParams(next, { replace: true })
    // Ensure we don't re-open on the same path due to upstream replaces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, state.products, setSearchParams])

  const handleSaveProduct = async (productData: any) => {
    try {
      // If this was triggered from a button click, React passes a MouseEvent.
      // In that case, submit the form via ref so we save real product data (not the event object).
      if (productData && typeof productData === "object" && "nativeEvent" in productData && "target" in productData) {
        productFormRef.current?.submit?.()
        return
      }

      if (productFormMode === 'create') {
        if (!createProduct) {
          throw new Error("createProduct function is not available")
        }
        
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(productData).filter(([_, value]) => value !== undefined)
        )
        await createProduct(createPayload)
        
        // createProduct already calls refreshProducts internally
        setCurrentBatch(1)
        setDisplayedItems([])
      } else if (productFormMode === 'edit' && selectedProductForForm?.id) {
        if (!updateProduct) {
          throw new Error("updateProduct function is not available")
        }
        
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...productData, id: selectedProductForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        
        await updateProduct(selectedProductForForm.id, updatePayload)
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "stockTableModal1",
        crudMode: productFormMode,
        id: selectedProductForForm?.id ?? productData?.id,
        itemLabel: productData?.name,
      })
      
      handleCloseProductForm()
    } catch (error) {
      debugWarn("Error saving product:", error)
      // Show error to user
      alert(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Don't close modal on error so user can retry
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!canRemove) return
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(productId)
      } catch (error) {
        debugWarn('Error deleting product:', error)
      }
    }
  }

  // Measure change handlers
  const handleMeasureChange = async (productId: string, measureId: string, measureType: 'sales' | 'purchase') => {
    try {
      const product = state.products?.find((p: Product) => p.id === productId)
      if (!product) return

      // Create updated product data
      const updatedProduct = { ...product }
      if (measureType === 'sales') {
        if (updatedProduct.sale) {
          updatedProduct.sale = {
            ...updatedProduct.sale,
            measure: measureId,
            defaultMeasure: measureId,
          }
        }
      } else {
        if (updatedProduct.purchase) {
          updatedProduct.purchase = {
            ...updatedProduct.purchase,
            measure: measureId,
            defaultMeasure: measureId,
          }
        }
      }

      if (updateProduct) {
        await updateProduct(productId, updatedProduct)
      }
    } catch (error) {
      // Error handling - show user notification if needed
    }
  }




  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
    // Also update legacy sort state for compatibility
    setOrderBy(field as keyof SimpleProductRow)
    setOrder(direction)
  }

  const handleExport = (exportFormat: 'csv' | 'pdf') => {
    const dataToExport = filteredItems
    const dateStr = format(new Date(), "yyyyMMdd_HHmmss")
    
    if (exportFormat === 'csv') {
      const escapeCSV = (val: unknown) => {
        const s = (val ?? "").toString()
        if (s.includes(",") || s.includes("\n") || s.includes('"')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }
      
      const headers = [
        "Name", "Category", "Sub Category", "Sales Division", "Course", "Type",
        "SKU", "Barcode", "Purchase Price", "Sales Price", "Purchase Supplier",
        "Status", "Predicted Stock", "Previous Stock", "Purchase Measure",
        "Sales Measure", "Profit Margin (%)", "Cost Per Base Unit",
        "Profit Per Base Unit", "Created Date", "Last Updated"
      ]
      
      const rows = dataToExport.map(item => [
        item.name,
        item.category,
        item.subCategory,
        item.salesDivision,
        item.course,
        item.type,
        item.sku,
        item.barcode,
        item.purchasePrice.toFixed(2),
        item.salesPrice.toFixed(2),
        item.purchaseSupplier,
        item.status,
        item.predictedStock.toFixed(stockDecimalPlaces),
        item.previousStock.toFixed(stockDecimalPlaces),
        item.purchaseMeasure,
        item.salesMeasure,
        item.profitMargin.toFixed(2),
        item.costPerBaseUnit.toFixed(2),
        item.profitPerBaseUnit.toFixed(2),
        item.createdDate,
        item.lastUpdated,
      ])
      
      const csv = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `products_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: "landscape" })
      doc.setFontSize(16)
      doc.text('Products Export', 14, 15)
      doc.setFontSize(10)
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22)
      doc.text(`Total Items: ${dataToExport.length}`, 14, 28)
      
      const headers = [
        ["Name", "Category", "Sub Category", "Type", "Purchase Price", "Sales Price",
         "Supplier", "Status", "Stock", "Profit Margin (%)"]
      ]
      
      const rows = dataToExport.map(item => [
        item.name || "",
        item.category || "",
        item.subCategory || "",
        item.type || "",
        `£${item.purchasePrice.toFixed(2)}`,
        `£${item.salesPrice.toFixed(2)}`,
        item.purchaseSupplier || "",
        item.status || "",
        item.predictedStock.toFixed(stockDecimalPlaces),
        `${item.profitMargin.toFixed(2)}%`,
      ])
      
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35 },
      })
      
      doc.save(`products_${dateStr}.pdf`)
    }
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchQuery.length > 0 || Object.values(filters).some(arr => arr.length > 0)

  return (
    <Box>
      <DataHeader
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search products..."
        filters={filterOptions}
        columns={columnOptions}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenProductForm(null, 'create')}
        createButtonLabel="Add Product"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit products."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {displayedItems.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={InventoryIcon}
            title={hasActiveFilters ? "No products match your filters" : "No products found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first product to get started."
            }
          />
        </Box>
      ) : (
        <>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {Object.entries(columnConfig)
                      .filter(([, config]) => config.visible)
                      .map(([columnId, config]) => (
                        <TableCell 
                          key={columnId} 
                          align="center"
                          sx={{ 
                            width: config.width,
                            textAlign: 'center !important',
                            padding: '16px 16px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                          onClick={() => handleSort(columnId as keyof SimpleProductRow)}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: 0.5
                          }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {config.label}
                            </Typography>
                            {orderBy === columnId && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {order === 'asc' ? '↑' : '↓'}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedItems.map((item) => (
                    <TableRow 
                      key={item.__rowKey} 
                      hover
                      onClick={() => {
                        const product = state.products?.find((p: Product) => p.id === item.id)
                        if (product) handleOpenProductForm(product, 'view')
                      }}
                      sx={{ 
                        cursor: "pointer",
                        '& > td': {
                          paddingTop: 1,
                          paddingBottom: 1,
                        }
                      }}
                    >
                      {Object.entries(columnConfig)
                        .filter(([, config]) => config.visible)
                        .map(([columnId]) => (
                          <TableCell key={columnId} align="center" sx={{ verticalAlign: 'middle' }}>
                            {(() => {
                              const value = item[columnId as keyof SimpleProductRow]
                              
                              // Price columns
                              if (columnId === 'purchasePrice' || columnId === 'salesPrice' || 
                                  columnId === 'costPerBaseUnit' || columnId === 'profitPerBaseUnit' || 
                                  columnId === 'profitForSalesMeasure') {
                                return formatMoneyOrBlank(value)
                              }
                              
                              // Percentage columns
                              if (columnId === 'profitMargin') {
                                return `${(Number(value) || 0).toFixed(1)}%`
                              }
                              
                              // Quantity columns (displayed with configurable decimal places)
                              if (columnId === 'quantityOfBaseUnits' || columnId === 'purchases' || 
                                  columnId === 'sales' || columnId === 'previousStock' || columnId === 'predictedStock' || 
                                  columnId === 'wastage' || columnId === 'minStock' || columnId === 'maxStock') {
                                return (Number(value) || 0).toFixed(stockDecimalPlaces)
                              }
                              
                              // Status column with chip
                              if (columnId === 'status') {
                                return (
                                  <Chip
                                    label={String(value || 'Unknown')}
                                    color={getStatusColor(String(value || 'Unknown')) as any}
                                    size="small"
                                  />
                                )
                              }
                              
                              // Measure columns - show ALL available measures from units array with clickable dropdown
                              if (columnId === 'salesMeasure' || columnId === 'purchaseMeasure') {
                                const product = state.products?.find((p: Product) => p.id === item.id)
                                if (!product) return String(value || 'pcs')
                                
                                // Get all measures from units array
                                const units = columnId === 'salesMeasure' 
                                  ? product.sale?.units 
                                  : product.purchase?.units
                                
                                const defaultMeasureId = columnId === 'salesMeasure'
                                  ? product.sale?.defaultMeasure
                                  : product.purchase?.defaultMeasure
                                
                                if (!units || units.length === 0) {
                                  return String(value || 'pcs')
                                }
                                
                                return (
                                  <Box 
                                    sx={{ 
                                      display: 'flex', 
                                      gap: 0.5, 
                                      flexWrap: 'wrap', 
                                      justifyContent: 'center',
                                      cursor: canMutate ? 'pointer' : 'default'
                                    }}
                                  >
                                    {units.map((unit: any, idx: number) => {
                                      const measureName = getMeasureName(unit.measure) || 'Unknown'
                                      const isDefault = unit.measure === defaultMeasureId
                                      
                                      return (
                                        <Chip
                                          key={`${unit.measure}-${idx}`}
                                          label={measureName}
                                          size="small"
                                          variant={isDefault ? "filled" : "outlined"}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (!canMutate) return
                                            if (!item.id) return
                                            handleMeasureChange(
                                              item.id,
                                              unit.measure,
                                              columnId === 'salesMeasure' ? 'sales' : 'purchase'
                                            )
                                          }}
                                          sx={{
                                            fontWeight: isDefault ? "bold" : "normal",
                                            bgcolor: isDefault ? theme.palette.primary.main : 'transparent',
                                            color: isDefault ? theme.palette.primary.contrastText : theme.palette.text.primary,
                                            borderColor: theme.palette.primary.main,
                                            cursor: 'pointer',
                                            '&:hover': {
                                              bgcolor: isDefault ? theme.palette.primary.dark : theme.palette.action.hover,
                                            }
                                          }}
                                        />
                                      )
                                    })}
                                  </Box>
                                )
                              }
                              
                              // Other unit columns
                              if (columnId === 'baseUnit' || columnId === 'unit') {
                                return String(value || 'pcs')
                              }
                              
                              // Default text columns
                              return String(value || '-')
                            })()}
                          </TableCell>
                        ))}
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              disabled={!canMutate}
                              onClick={(e) => {
                                e.stopPropagation()
                                const product = state.products?.find((p: Product) => p.id === item.id)
                                if (product) handleOpenProductForm(product, 'edit')
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error" 
                              disabled={!canRemove}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!canRemove) return
                                handleDeleteProduct(item.id)
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {displayedItems.length < filteredItems.length && (
              <div ref={observerRef} style={{ height: "20px" }} />
            )}
          </Paper>
        </>
      )}


      {/* Product Form Modal */}
      <CRUDModal
        open={productFormOpen}
        onClose={(reason) => {
          setProductFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedProductForForm(null)
            setProductFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "stockTableModal1",
          crudMode: productFormMode,
          id: selectedProductForForm?.id,
          itemLabel: selectedProductForForm?.name,
        }}
        title={
          productFormMode === "create"
            ? "Add product"
            : productFormMode === "edit"
              ? "Edit product"
              : "View product"
        }
        icon={<InventoryIcon />}
        mode={productFormMode}
        onSave={productFormMode !== "view" ? handleSaveProduct : undefined}
        hideSaveButton={productFormMode === "view"}
        maxWidth="lg"
        formRef={productFormRef}
      >
        <TabbedProductForm
          ref={productFormRef}
          product={selectedProductForForm}
          mode={productFormMode}
          onSave={handleSaveProduct}
        />
      </CRUDModal>
    </Box>
  )
}

export default StockTable