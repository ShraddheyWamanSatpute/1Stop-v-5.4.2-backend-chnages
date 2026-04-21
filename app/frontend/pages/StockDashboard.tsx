"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  type SelectChangeEvent,
} from "@mui/material"
import {
  BarChart as BarChartIcon,
  Dashboard as DashboardIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon,
  Category as CategoryIcon,
  Equalizer as EqualizerIcon,
  Settings as SettingsIcon,
  Calculate as CalculatorIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material"
import { WidgetType, DataType } from "../types/WidgetTypes"
import DynamicWidget from "../components/reusable/DynamicWidget"
import useWidgetManager from "../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../hooks/useResponsiveWidgetCanvas"
import WidgetContextMenu from "../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../components/reusable/WidgetSettingsDialog"
import DashboardHeader from "../components/reusable/DashboardHeader"
import CollapsibleTabHeader from "../components/reusable/CollapsibleTabHeader"
import { Rnd } from "react-rnd"
import { useStockReportContext } from "../../backend/context/AnalyticsContext"
import { useAnalytics } from "../../backend/context/AnalyticsContext"
import { useCompany } from "../../backend/context/CompanyContext"
import { useSettings } from "../../backend/context/SettingsContext"
import { areDependenciesReady } from "../../backend/utils/ContextDependencies"
import LocationPlaceholder from "../components/common/LocationPlaceholder"

import {
  StockTable,
  PurchaseOrdersTable,
  StockCountTable,
  StockTransfersTable,
  ManagementGrid,
  ParLevelsManagement,
  ReportsGrid,
} from "../components/stock"
import { format, subDays, startOfMonth, startOfYear } from "date-fns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { alpha, useTheme } from "@mui/material/styles"
import { useNavigate, useLocation } from "react-router-dom"
import StockOrder from "./stock/StockOrder"
import { themeConfig } from "../../theme/AppTheme"
import usePersistentBoolean from "../hooks/usePersistentBoolean"

// Grid constants
export const GRID_CELL_SIZE = 20
export const GRID_COLS = 60

// Settings Component
import StockSettings from "../components/stock/StockSettings"

// Available data types for stock dashboard - now powered by Analytics Context with POS data
const getStockDataTypes = (getAvailableDataTypes: any) => {
  return getAvailableDataTypes('stock').concat([
    // Stock-specific data types
    { value: DataType.STOCK_BY_CATEGORY, label: "Stock by Category", category: "Stock" },
    { value: DataType.STOCK_BY_SUPPLIER, label: "Stock by Supplier", category: "Stock" },
    { value: DataType.STOCK_BY_LOCATION, label: "Stock by Location", category: "Stock" },
    { value: DataType.TOP_SELLING_ITEMS, label: "Top Selling Items", category: "Stock" },
    { value: DataType.STOCK_TRENDS, label: "Stock Trends", category: "Stock" },
    { value: DataType.PURCHASE_HISTORY, label: "Purchase History", category: "Stock" },
    { value: DataType.SALES_HISTORY, label: "Sales History", category: "Stock" },
    { value: DataType.STOCK_COUNTS_HISTORY, label: "Stock Counts History", category: "Stock" },
    { value: DataType.PAR_LEVEL_STATUS, label: "Par Level Status", category: "Stock" },
    { value: DataType.PROFIT_ANALYSIS, label: "Profit Analysis", category: "Stock" },
    
    // POS data types (cross-module access)
    { value: DataType.SALES, label: "POS Sales", category: "POS" },
    { value: DataType.POS_TRANSACTIONS, label: "Total Transactions", category: "POS" },
    { value: DataType.SALES_BY_DAY, label: "Daily Sales", category: "POS" },
    { value: DataType.PAYMENT_METHOD_BREAKDOWN, label: "Payment Methods", category: "POS" },
    { value: DataType.SALES_BY_HOUR, label: "Hourly Sales", category: "POS" },
    { value: DataType.CUSTOMER_ANALYTICS, label: "Customer Analytics", category: "POS" },
  ])
}

// Stock cards should only offer a small, curated list of metrics.
const getStockCardDataTypes = () => [
  { value: DataType.TOTAL_ITEMS, label: "Items" },
  { value: DataType.NEW_STOCK_ITEMS, label: "New Stock Items" },
  { value: DataType.SALES, label: "Sales" },
  { value: DataType.PREVIOUS_STOCK_VALUE, label: "Previous Stock" },
  { value: DataType.PURCHASES, label: "Purchases" },
  { value: DataType.WASTAGE, label: "Wasteage" },
  { value: DataType.PROFIT, label: "Profit" },
  { value: DataType.COST_OF_SALES, label: "Cost of Sales" },
  { value: DataType.PREDICTED_STOCK_VALUE, label: "Predicted Stock" },
]

const StockDashboard = () => {
  // Get core contexts first to check readiness
  const { state: settingsState } = useSettings()
  const { state: companyState, hasPermission } = useCompany()
  
  // Wait for core contexts (Settings and Company) to be ready before proceeding
  // This prevents premature rendering and context access errors
  const coreContextsReady = areDependenciesReady(settingsState, companyState)
  
  // Theme context is provided app-wide; local darkMode not needed here
  const { stock } = useStockReportContext()
  const { state: stockState, refreshAll, canViewStock, canEditStock } = stock
  
  // Analytics context for all dashboard data (stock + POS)
  const {
    getStockWidgets,
    getAvailableDataTypes
  } = useAnalytics()
  
  const navigate = useNavigate()
  const location = useLocation()
  const isEditingRef = useRef(false)
  const theme = useTheme()

  // ========= Stable (seeded) RNG =========
  // Prevents "changing data" on tab navigation (re-renders).
  const hashSeed = (input: string) => {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  const mulberry32 = (seed: number) => {
    return () => {
      let t = (seed += 0x6D2B79F5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const rngFor = (seedKey: string) => mulberry32(hashSeed(seedKey))

  const seedPrefix = `${companyState.companyID || "no-company"}|${companyState.selectedSiteID || "no-site"}|${companyState.selectedSubsiteID || "no-subsite"}`

  const suppliersById = useMemo(() => {
    const map = new Map<string, any>()
    for (const s of stockState.suppliers || []) {
      if (!s) continue
      if ((s as any).id) map.set(String((s as any).id), s)
      const legacy = (s as any).legacyId
      if (legacy) map.set(String(legacy), s)
    }
    return map
  }, [stockState.suppliers])

  const categoriesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of stockState.categories || []) {
      if (!c?.id) continue
      map.set(String(c.id), String(c.name || c.id))
    }
    return map
  }, [stockState.categories])

  const getProductSupplierId = useCallback((product: any): string | undefined => {
    if (!product) return undefined
    // Prefer purchase default supplier
    if (product.purchase?.defaultSupplier) return product.purchase.defaultSupplier
    // Legacy shapes
    if (product.purchase?.supplierId) return product.purchase.supplierId
    if (product.supplierId) return product.supplierId
    // Units fallback
    const defaultMeasureId = product.purchase?.defaultMeasure || product.purchase?.measure
    const matchingUnit = product.purchase?.units?.find(
      (u: any) => u?.supplierId && u?.measure === defaultMeasureId
    )
    if (matchingUnit?.supplierId) return matchingUnit.supplierId
    const anyUnit = product.purchase?.units?.find((u: any) => u?.supplierId)
    if (anyUnit?.supplierId) return anyUnit.supplierId
    return undefined
  }, [])

  const resolveSupplierName = useCallback((product: any): string => {
    const id = getProductSupplierId(product)
    if (id) {
      const supplier = suppliersById.get(String(id))
      return supplier?.name || String(id)
    }
    return product?.supplier || product?.supplierName || "Unknown Supplier"
  }, [getProductSupplierId, suppliersById])

  const resolveCategoryName = useCallback((product: any): string => {
    const explicit = product?.category || product?.categoryName
    if (explicit) return explicit
    const id = product?.categoryId
    if (id && categoriesById.has(String(id))) return categoriesById.get(String(id)) as string
    return id || "Uncategorized"
  }, [categoriesById])

  // All useState hooks must be called before any conditional returns
  const [activeTab, setActiveTab] = useState<number>(0)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [showGrid, setShowGrid] = useState<boolean>(false)
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: subDays(new Date(), 6),
    endDate: new Date(),
  })
  const [frequency, setFrequency] = useState<string>("daily")
  const [, setIsLoadingData] = useState<boolean>(false)

  const [selectedDateRange, setSelectedDateRange] = useState<string>("last7days")
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState<boolean>(false)
  const [clearWidgetsDialogOpen, setClearWidgetsDialogOpen] = useState<boolean>(false)
  
  // Analytics data state (stock + POS)
  // const [posAnalyticsData] = useState<any>(null) // Removed unused variable

  // Widget management
  const {
    dashboardState,
    selectedWidgetId,
    setSelectedWidgetId,
    updateWidgetPosition,
    updateWidgetSize,
    updateWidgetSettings,
    removeWidget,
    addWidget,
    getWidgetSettings,
    calculateContainerHeight,
    clearAllWidgets,
    revertDashboard,
    resetDashboard,
  } = useWidgetManager('stock')

  // Calculate container height based on widget positions
  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // Default dashboard setup is now handled by useWidgetManager with section-specific layouts

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    widgetId: string
  } | null>(null)

  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false)
  const [currentWidgetSettings, setCurrentWidgetSettings] = useState<any>(null)
  const [widgetDialogMode, setWidgetDialogMode] = useState<"create" | "edit">("edit")
  const [pendingCreatedWidgetId, setPendingCreatedWidgetId] = useState<string | null>(null)

  // Dashboard data from Analytics Context
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  
  // Simplified data loading - just set loading to false since we use StockContext directly
  useEffect(() => {
    setIsLoadingData(false)
  }, [stockState.companyID, stockState.siteID])


  // Define available tabs with permission checks - use useMemo to recalculate when permissions change
  const availableTabs = useMemo(() => {
    const canViewManagement =
      hasPermission("stock", "categories", "view") ||
      hasPermission("stock", "suppliers", "view")

    const base = [
      {
        label: "Items",
        slug: "items",
        icon: <InventoryIcon />,
        component: <StockTable />,
        permission: hasPermission("stock", "items", "view"),
      },
      {
        label: "Purchase Orders",
        slug: "purchase-orders",
        icon: <ShoppingCartIcon />,
        component: <PurchaseOrdersTable />,
        permission: hasPermission("stock", "orders", "view"),
      },
      {
        label: "Stock Counts",
        slug: "stock-counts",
        icon: <AssessmentIcon />,
        component: <StockCountTable />,
        permission: hasPermission("stock", "counts", "view"),
      },
      {
        label: "Transfers",
        slug: "transfers",
        icon: <SwapHorizIcon />,
        component: <StockTransfersTable />,
        permission: hasPermission("stock", "counts", "view"),
      },
      {
        label: "Par Levels",
        slug: "par-levels",
        icon: <EqualizerIcon />,
        component: <ParLevelsManagement />,
        // No dedicated permission key; map to counts visibility
        permission: hasPermission("stock", "counts", "view"),
      },
      {
        label: "Management",
        slug: "management",
        icon: <CategoryIcon />,
        component: <ManagementGrid />,
        permission: canViewManagement,
      },
      {
        label: "Reports",
        slug: "reports",
        icon: <BarChartIcon />,
        component: <ReportsGrid />,
        permission: hasPermission("stock", "reports", "view"),
      },
      {
        label: "Settings",
        slug: "settings",
        icon: <SettingsIcon />,
        component: <StockSettings />,
        // No dedicated key; map to dashboard view for visibility (edit handled inside)
        permission: hasPermission("stock", "dashboard", "view"),
      },
    ]

    // Stock Ordering: shopping-style ordering screen (one order per supplier)
    // Insert right after Purchase Orders for discoverability.
    base.splice(2, 0, {
      label: "Order",
      slug: "order",
      icon: <ShoppingCartIcon />,
      component: <StockOrder />,
      // Reuse orders permission (same domain area)
      permission: hasPermission("stock", "orders", "view"),
    })

    return base
  }, [hasPermission])

  // Filter tabs based on permissions
  const visibleTabs = useMemo(() => availableTabs.filter((tab) => tab.permission), [availableTabs])
  
  // Wait for permissions to be loaded before showing access restricted message
  const permissionsLoaded = companyState.permissions && companyState.permissions.roles

  const loadMockData = () => {
    // Mock data loading logic here
    console.log("Loading mock data...")
  }

  const fetchDashboardData = async (startDate: Date, endDate: Date, dataFrequency: string) => {
    if (!stockState.companyID || !stockState.siteID) return

    setIsLoadingData(true)

    try {
      // Trigger analytics data refresh with new date range and frequency
      const dateRangeFormatted = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
      
       const stockData = await getStockWidgets(dateRangeFormatted)
       setAnalyticsData(stockData)
      
      // Update current date range and frequency for future widget updates
      setDateRange({ startDate, endDate })
      setFrequency(dataFrequency)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }


  // Ensure activeTab stays in bounds when visibleTabs change (e.g., permissions/site changes)
  useEffect(() => {
    if (activeTab >= visibleTabs.length) {
      setActiveTab(0)
    }
  }, [visibleTabs.length, activeTab])

  useEffect(() => {
    if (!visibleTabs.length) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathSegments = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const stockIndex = pathSegments.findIndex((segment) => segment === "Stock")
    const tabSegment = stockIndex !== -1 ? pathSegments[stockIndex + 1] : undefined

    const defaultSlug = visibleTabs[0]?.slug
    const slugToPascalPath = (slug: string) => {
      return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    }

    if (!tabSegment) {
      if (defaultSlug) {
        const defaultPath = `/Stock/${slugToPascalPath(defaultSlug)}`
        if (location.pathname !== defaultPath) {
          navigate(defaultPath, { replace: true })
        }
      }
      if (activeTab !== 0) {
        setActiveTab(0)
      }
      return
    }

    // Match tab by slug, handling both PascalCase paths and lowercase slugs
    const matchedIndex = visibleTabs.findIndex((tab) => {
      const pascalSlug = slugToPascalPath(tab.slug)
      return tab.slug === tabSegment || pascalSlug === tabSegment
    })
    if (matchedIndex === -1) {
      if (defaultSlug) {
        const defaultPath = `/Stock/${slugToPascalPath(defaultSlug)}`
        if (location.pathname !== defaultPath) {
          navigate(defaultPath, { replace: true })
        }
        if (activeTab !== 0) {
          setActiveTab(0)
        }
      }
      return
    }

    setActiveTab(matchedIndex)
  }, [location.pathname, navigate, visibleTabs])

  // Load data from StockContext
  useEffect(() => {
    if (stockState.companyID && stockState.siteID) {
      setIsLoadingData(true)
      refreshAll().finally(() => setIsLoadingData(false))
    }
  }, [stockState.companyID, stockState.siteID]) // Removed refreshAll dependency to prevent infinite loop

  // Trigger re-render when StockContext data changes (for fallback mode)
  useEffect(() => {
    // Force re-render of widgets when stock data changes and we're using fallback
    if (!analyticsData && stockState.products.length > 0) {
      // This will cause widgets to re-render with new data
    }
  }, [stockState.products, stockState.stockCounts, stockState.purchaseOrders, analyticsData])

  useEffect(() => {
    if (stockState.companyID && stockState.siteID) {
      fetchDashboardData(dateRange.startDate, dateRange.endDate, frequency)
    } else {
      loadMockData()
    }
  }, [stockState.companyID, stockState.siteID, dateRange.startDate, dateRange.endDate, frequency])

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
    isEditingRef.current = !isEditing
  }

  // Handle revert - reload saved layout and exit edit mode without saving
  const handleRevert = async () => {
    console.log('Stock Dashboard: Reverting changes and exiting edit mode')
    await revertDashboard()
    setIsEditing(false)
    isEditingRef.current = false
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)

    const selectedTab = visibleTabs[newValue]
    if (!selectedTab?.slug) {
      return
    }

    const slugToPascalPath = (slug: string) => {
      return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    }
    const targetPath = `/Stock/${slugToPascalPath(selectedTab.slug)}`
    if (location.pathname !== targetPath) {
      navigate(targetPath)
    }
  }

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  const getDateRangeLabel = () => {
    switch (selectedDateRange) {
      case "today":
        return "Today"
      case "yesterday":
        return "Yesterday"
      case "last7days":
        return "Last 7 Days"
      case "last30days":
        return "Last 30 Days"
      case "thisMonth":
        return "This Month"
      case "lastMonth":
        return "Last Month"
      case "thisYear":
        return "This Year"
      case "lastYear":
        return "Last Year"
      case "custom":
        return `${format(dateRange.startDate, "MMM d, yyyy")} - ${format(dateRange.endDate, "MMM d, yyyy")}`
      default:
        return "Last 7 Days"
    }
  }

  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range)
    // Close date range menu if it was open

    if (range === "custom") {
      setCustomDateDialogOpen(true)
      return
    }

    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (range) {
      case "today":
        start = new Date(today)
        end = new Date(today)
        break
      case "yesterday":
        start = subDays(today, 1)
        end = subDays(today, 1)
        break
      case "last7days":
        start = subDays(today, 6)
        end = today
        break
      case "last30days":
        start = subDays(today, 29)
        end = today
        break
      case "thisMonth":
        start = startOfMonth(today)
        end = today
        break
      case "lastMonth":
        const lastMonthEnd = subDays(startOfMonth(today), 1)
        start = startOfMonth(lastMonthEnd)
        end = lastMonthEnd
        break
      case "thisYear":
        start = startOfYear(today)
        end = today
        break
      case "lastYear":
        const lastYearEnd = subDays(startOfYear(today), 1)
        start = startOfYear(lastYearEnd)
        end = lastYearEnd
        break
      default:
        break
    }

    setDateRange({ startDate: start, endDate: end })
    // Widget data will automatically update due to useCallback dependencies
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency)
    // Widget data will automatically update due to useCallback dependencies
  }

  const handleCustomDateApply = () => {
    setCustomDateDialogOpen(false)
    // Widget data will automatically update due to useCallback dependencies
  }

  // Handle widget context menu
  const handleWidgetContextMenu = (event: React.MouseEvent, widgetId: string) => {
    if (!isEditing) return

    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      widgetId,
    })
  }

  // Handle widget settings dialog
  const handleOpenWidgetSettings = (widgetId: string) => {
    const settings = getWidgetSettings(widgetId)
    if (settings) {
      setWidgetDialogMode("edit")
      setPendingCreatedWidgetId(null)
      setCurrentWidgetSettings(settings)
      setSettingsDialogOpen(true)
    }
  }

  // Handle widget settings save
  const handleSaveWidgetSettings = (settings: any) => {
    updateWidgetSettings(settings)
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setCurrentWidgetSettings(null)
    setSettingsDialogOpen(false)
  }

  const handleCloseWidgetDialog = () => {
    setSettingsDialogOpen(false)
    if (widgetDialogMode === "create" && pendingCreatedWidgetId) {
      removeWidget(pendingCreatedWidgetId)
    }
    setWidgetDialogMode("edit")
    setPendingCreatedWidgetId(null)
    setCurrentWidgetSettings(null)
  }

  const handleCreateWidget = () => {
    const newWidget = addWidget("stat", DataType.PREVIOUS_STOCK_VALUE)
    setSelectedWidgetId(newWidget.id)
    setCurrentWidgetSettings(newWidget)
    setWidgetDialogMode("create")
    setPendingCreatedWidgetId(newWidget.id)
    setSettingsDialogOpen(true)
  }

  // Memoized stock metrics calculation with proper GBP calculations
  const stockMetrics = useMemo(() => {
    const totalItems = stockState.products.length
    const lowStockCount = stockState.products.filter((p: any) => (p.predictedStock || 0) < (p.parLevel || 10)).length
    
    // Calculate total sales value (what we could sell for)
    const totalSalesValue = stockState.products.reduce((total: number, product: any) => {
      const salePrice = product.price || product.salePrice || 0
      const quantity = product.predictedStock || 0
      return total + (salePrice * quantity)
    }, 0)
    
    // Calculate profit margin based on cost vs sale price
    const totalCostValue = stockState.products.reduce((total: number, product: any) => {
      const costPrice = product.purchasePrice || product.costPrice || 0
      const quantity = product.predictedStock || 0
      return total + (costPrice * quantity)
    }, 0)
    
    const profitMargin = totalSalesValue > 0 ? ((totalSalesValue - totalCostValue) / totalSalesValue) * 100 : 0
    const totalProfit = totalSalesValue - totalCostValue
    
    const categories = [...new Set(stockState.products.map((p: any) => 
      resolveCategoryName(p)
    ).filter(Boolean))]
    const suppliers = [...new Set(stockState.products.map((p: any) => 
      resolveSupplierName(p)
    ).filter(Boolean))]
    
    
    return {
      totalItems,
      lowStockCount,
      stockValue: totalCostValue, // Use cost basis for stock value
      totalSalesValue,
      totalCostValue,
      categories,
      suppliers,
      profitMargin: Math.round(profitMargin * 10) / 10, // Round to 1 decimal
      totalProfit: Math.round(totalProfit * 100) / 100 // Round to 2 decimals for currency
    }
  }, [stockState.products, resolveCategoryName, resolveSupplierName])

  // Improved data function that generates realistic data from StockContext
  const getStockContextData = useCallback((widget: any, dataType: DataType) => {
    // Use memoized metrics
    const { totalItems, lowStockCount, stockValue, totalSalesValue, totalCostValue, categories, suppliers, profitMargin, totalProfit } = stockMetrics
    
    // Generate realistic historical data based on date range and frequency (stable)
    const generateHistoricalData = (baseValue: number, seriesKey: string) => {
      const rand = rngFor(
        `stock-hist|${seedPrefix}|${seriesKey}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`,
      )
      const startDate = dateRange.startDate
      const endDate = dateRange.endDate
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine data points based on frequency
      let dataPoints = daysDiff
      let dateIncrement = 1 // days
      
      switch (frequency) {
        case 'hourly':
          dataPoints = Math.min(daysDiff * 24, 168) // Max 1 week
          dateIncrement = 1 / 24 // hours
          break
        case 'daily':
          dataPoints = Math.min(daysDiff, 90) // Max 90 days
          dateIncrement = 1 // days
          break
        case 'weekly':
          dataPoints = Math.min(Math.ceil(daysDiff / 7), 52) // Max 52 weeks
          dateIncrement = 7 // days
          break
        case 'monthly':
          dataPoints = Math.min(Math.ceil(daysDiff / 30), 24) // Max 24 months
          dateIncrement = 30 // days
          break
        case 'quarterly':
          dataPoints = Math.min(Math.ceil(daysDiff / 90), 8) // Max 8 quarters
          dateIncrement = 90 // days
          break
        case 'yearly':
          dataPoints = Math.min(Math.ceil(daysDiff / 365), 5) // Max 5 years
          dateIncrement = 365 // days
          break
        default:
          dataPoints = Math.min(daysDiff, 30) // Default to 30 days max
      }
      
      return Array.from({ length: dataPoints }).map((_, i) => {
        const currentDate = new Date(startDate.getTime() + (i * dateIncrement * 24 * 60 * 60 * 1000))
        const date = format(currentDate, "yyyy-MM-dd")
        const variation = 0.9 + rand() * 0.2 // ±10% variation (stable)
        return {
          date,
          value: Math.round(baseValue * variation),
          stockValue: Math.round(stockValue * variation),
          itemCount: Math.round(totalItems * variation)
        }
      })
    }

    // For cards (unified: CARD; legacy: STAT/DASHBOARD_CARD), provide the specific value
    if (widget.type === WidgetType.CARD || widget.type === WidgetType.DASHBOARD_CARD || widget.type === WidgetType.STAT) {
      switch (dataType) {
        case DataType.PREVIOUS_STOCK_VALUE:
          return {
            previousStockValue: stockValue,
            history: generateHistoricalData(stockValue / 1000, "previousStockValue"),
          }
        case DataType.PREDICTED_STOCK_VALUE:
          return {
            predictedStockValue: stockValue,
            history: generateHistoricalData(stockValue / 1000, "predictedStockValue"),
          }
        case DataType.PURCHASES: {
          const purchasesValue = (stockState.purchaseOrders || []).reduce((sum: number, po: any) => {
            const v = po?.totalValue ?? po?.totalAmount ?? po?.total ?? po?.subtotal ?? po?.amount ?? 0
            return sum + (Number(v) || 0)
          }, 0)
          return { purchasesValue, history: generateHistoricalData(purchasesValue / 1000, "purchasesValue") }
        }
        case DataType.PROFIT:
          return { profit: totalProfit, history: generateHistoricalData(totalProfit / 1000, "profit") }
        case DataType.NO_STOCK_ITEMS: {
          const noStockItems = (stockState.products || []).filter((p: any) => (p?.predictedStock || 0) <= 0).length
          return { noStockItems, history: generateHistoricalData(noStockItems, "noStockItems") }
        }
        case DataType.NEW_STOCK_ITEMS: {
          const newStockItems = (stockState.products || []).filter((p: any) => {
            const raw = p?.createdAt ?? p?.created ?? p?.createdOn ?? p?.dateCreated
            if (!raw) return false
            const d = raw instanceof Date ? raw : new Date(raw)
            return Number.isFinite(d.getTime()) ? d >= dateRange.startDate && d <= dateRange.endDate : false
          }).length
          return { newStockItems, history: generateHistoricalData(newStockItems, "newStockItems") }
        }
        case DataType.WASTAGE: {
          const wastage = (stockState.products || []).reduce((sum: number, p: any) => sum + (Number(p?.wastage) || 0), 0)
          return { wastage, history: generateHistoricalData(wastage, "wastage") }
        }
        case DataType.TOTAL_ITEMS:
          return {
            totalItems: totalItems,
            history: generateHistoricalData(totalItems, "totalItems"),
          }
        case DataType.PROFIT_MARGIN:
          return {
            profitMargin: profitMargin,
            history: generateHistoricalData(profitMargin, "profitMargin"),
          }
        case DataType.LOW_STOCK_ITEMS:
          return {
            lowStockItems: lowStockCount,
            history: generateHistoricalData(lowStockCount, "lowStockCount"),
          }
        case DataType.STOCK_VALUE:
        case DataType.INVENTORY_VALUE:
          return {
            totalValue: stockValue,
            inventoryValue: stockValue,
            history: generateHistoricalData(stockValue / 1000, "stockValue"), // Scale down for chart
          }
        case DataType.STOCK_PROFIT:
          return {
            totalProfit: totalProfit,
            history: generateHistoricalData(totalProfit / 1000, "totalProfit"),
          }
        case DataType.SALES:
          return {
            totalSalesValue: totalSalesValue,
            history: generateHistoricalData(totalSalesValue / 1000, "totalSalesValue"),
          }
        case DataType.COST_OF_SALES:
          return {
            totalCostValue: totalCostValue,
            history: generateHistoricalData(totalCostValue / 1000, "totalCostValue"),
          }
        default:
          return {
            value: totalItems,
            history: generateHistoricalData(totalItems, "default"),
          }
      }
    }

    // For charts, provide the appropriate data
    switch (dataType) {
      case DataType.STOCK_COUNT:
        return { 
          history: generateHistoricalData(totalItems, "stockCount").map(d => ({
            date: d.date,
            stockCount: { quantity: d.itemCount, price: d.stockValue }
          }))
        }
      case DataType.STOCK_TRENDS:
        return { 
          history: generateHistoricalData(totalItems, "stockTrends").map(d => ({
            date: d.date,
            stockTrends: { 
              price: d.stockValue, 
              quantity: d.itemCount 
            },
            stockValue: d.stockValue,
            itemCount: d.itemCount,
            transactions: Math.round(d.value * 0.1)
          }))
        }
      case DataType.PURCHASES:
        return { 
          history: generateHistoricalData(stockState.purchaseOrders.length, "purchases").map(d => ({
            date: d.date,
            purchases: { quantity: d.value, price: d.stockValue }
          }))
        }
      case DataType.SALES:
        return { 
          history: generateHistoricalData(Math.round(totalItems * 0.1), "sales").map(d => ({
            date: d.date,
            sales: { quantity: d.value, price: d.stockValue }
          }))
        }
      case DataType.STOCK_BY_CATEGORY:
        const categoryData = categories.map((category) => {
          // Calculate actual values for this category
          const categoryProducts = stockState.products.filter((p: any) => 
            resolveCategoryName(p) === category
          )
          
          const categoryValue = categoryProducts.reduce((total: number, product: any) => {
            const costPrice = product.purchasePrice || product.costPrice || product.price || 0
            const quantity = product.predictedStock || 0
            return total + (costPrice * quantity)
          }, 0)
          
          const categoryCount = categoryProducts.length
          
          return {
            category,
            value: Math.round(categoryValue * 100) / 100, // Round to 2 decimals
            count: categoryCount
          }
        })
        
        return { 
          data: categoryData,
          history: generateHistoricalData(totalItems, "stockByCategory").map(d => ({
            date: d.date,
            stockByCategory: { 
              price: d.stockValue, 
              quantity: d.itemCount 
            }
          }))
        }
      case DataType.STOCK_BY_SUPPLIER:
        const supplierData = suppliers.map((supplier) => {
          // Calculate actual values for this supplier
          const supplierProducts = stockState.products.filter((p: any) => 
            resolveSupplierName(p) === supplier
          )
          
          const supplierValue = supplierProducts.reduce((total: number, product: any) => {
            const costPrice = product.purchasePrice || product.costPrice || product.price || 0
            const quantity = product.predictedStock || 0
            return total + (costPrice * quantity)
          }, 0)
          
          const supplierCount = supplierProducts.length
          
          return {
            supplier,
            value: Math.round(supplierValue * 100) / 100, // Round to 2 decimals
            count: supplierCount
          }
        })
        
        return { 
          data: supplierData,
          history: generateHistoricalData(totalItems, "stockBySupplier").map(d => ({
            date: d.date,
            stockBySupplier: { 
              price: d.stockValue, 
              quantity: d.itemCount 
            }
          }))
        }
      case DataType.TOP_SELLING_ITEMS:
        return { 
          data: stockState.products.slice(0, 5).map((product: any, index: number) => ({
            name: product.name || `Item ${index + 1}`,
            value: product.price || 0,
            quantity: product.predictedStock || 0
          }))
        }
      case DataType.STOCK_BY_LOCATION:
        const locations = [...new Set(stockState.products.map((p: any) => 
          p.location || p.locationName || p.locationId || 'Unknown Location'
        ).filter(Boolean))]
        
        const locationData = locations.map((location) => {
          const locationProducts = stockState.products.filter((p: any) => 
            (p.location || p.locationName || p.locationId) === location
          )
          
          const locationValue = locationProducts.reduce((total: number, product: any) => {
            const costPrice = product.purchasePrice || product.costPrice || product.price || 0
            const quantity = product.predictedStock || 0
            return total + (costPrice * quantity)
          }, 0)
          
          return {
            location,
            value: Math.round(locationValue * 100) / 100,
            count: locationProducts.length
          }
        })
        
        return { 
          data: locationData,
          history: generateHistoricalData(totalItems, "stockByLocation").map(d => ({
            date: d.date,
            stockByLocation: { 
              price: d.stockValue, 
              quantity: d.itemCount 
            }
          }))
        }
      case DataType.PURCHASE_HISTORY:
        return { 
          history: stockState.purchaseOrders.map((order: any, index: number) => ({
            date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: order.total || order.amount || 0,
            items: order.items?.length || 0,
            supplier: order.supplier || 'Unknown Supplier'
          }))
        }
      case DataType.SALES_HISTORY:
        return { 
          history: generateHistoricalData(Math.round(totalItems * 0.1), "salesHistory").map(d => ({
            date: d.date,
            amount: d.stockValue,
            items: d.value,
            profit: d.stockValue * 0.3
          }))
        }
      case DataType.STOCK_COUNTS_HISTORY:
        const randAcc = rngFor(
          `stock-count-acc|${seedPrefix}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`,
        )
        return { 
          history: generateHistoricalData(totalItems, "stockCountsHistory").map(d => ({
            date: d.date,
            counted: d.itemCount,
            variance: Math.round(d.itemCount * 0.05),
            accuracy: Math.round((1 - randAcc() * 0.1) * 100)
          }))
        }
      case DataType.PAR_LEVEL_STATUS:
        return { 
          data: stockState.products.slice(0, 10).map((product: any) => ({
            item: product.name || 'Unknown Item',
            current: product.predictedStock || 0,
            parLevel: product.parLevel || 10,
            status: (product.predictedStock || 0) < (product.parLevel || 10) ? 'Low' : 'OK'
          }))
        }
      case DataType.PROFIT_ANALYSIS:
        return { 
          data: stockState.products.slice(0, 10).map((product: any) => ({
            item: product.name || 'Unknown Item',
            cost: product.purchasePrice || product.costPrice || 0,
            price: product.price || 0,
            margin: product.price && product.purchasePrice ? 
              ((product.price - product.purchasePrice) / product.price) * 100 : 0,
            volume: product.predictedStock || 0
          }))
        }
      default:
        return { 
          history: generateHistoricalData(totalItems, "defaultHistory").map(d => ({
            date: d.date,
            value: d.value
          }))
        }
    }
  }, [dateRange, frequency, stockMetrics, stockState.purchaseOrders, seedPrefix])

  // Widget data builder:
  // - Cards/stats use the existing StockContext-derived payloads
  // - Charts/tables use a consistent `history[]` structure keyed by series dataType (+ dataOption)
  const getWidgetDataForWidget = (widget: any) => {
    if (!widget) return { history: [] }

    const isChartOrTable =
      widget.type === WidgetType.BAR_CHART ||
      widget.type === WidgetType.LINE_CHART ||
      widget.type === WidgetType.PIE_CHART ||
      widget.type === WidgetType.TABLE ||
      widget.type === WidgetType.MULTIPLE_SERIES_LINE_CHART

    if (!isChartOrTable) {
      const dt = widget.dataType as DataType | undefined
      if (!dt) return { history: [] }
      return getStockContextData(widget, dt)
    }

    const seriesList = Array.isArray(widget.dataSeries) ? widget.dataSeries.filter((s: any) => s?.visible !== false) : []
    const effectiveSeries =
      seriesList.length > 0
        ? seriesList
        : widget.dataType
          ? [{ dataType: widget.dataType, displayMode: widget.displayMode || "quantity", label: "Series 1", color: themeConfig.brandColors.navy, visible: true }]
          : []

    const baseFor = (dt: DataType): number => {
      const { totalItems, stockValue, totalSalesValue, totalCostValue, totalProfit, profitMargin, lowStockCount } = stockMetrics
      switch (dt) {
        case DataType.TOTAL_ITEMS:
          return totalItems || 0
        case DataType.STOCK_VALUE:
        case DataType.INVENTORY_VALUE:
          return stockValue || 0
        case DataType.SALES:
          return totalSalesValue || 0
        case DataType.PURCHASES:
        case DataType.COST_OF_SALES:
          return totalCostValue || 0
        case DataType.PROFIT:
        case DataType.STOCK_PROFIT:
          return totalProfit || 0
        case DataType.PROFIT_MARGIN:
          return profitMargin || 0
        case DataType.LOW_STOCK_ITEMS:
          return lowStockCount || 0
        default:
          return Number((getStockContextData(widget, dt) as any)?.value ?? 0) || 0
      }
    }

    const valueForSeries = (s: any): number => {
      const dt = s.dataType as DataType
      const opt = typeof s.dataOption === "string" ? s.dataOption : ""
      const {
        totalItems,
        stockValue,
        totalSalesValue,
        totalCostValue,
        totalProfit,
        profitMargin,
        lowStockCount,
      } = stockMetrics

      if (dt === DataType.SALES) {
        if (opt === "net") return (totalSalesValue || 0) * 0.8
        return totalSalesValue || 0
      }
      if (dt === DataType.PURCHASES || dt === DataType.COST_OF_SALES) {
        if (opt === "net") return (totalCostValue || 0) * 0.8
        return totalCostValue || 0
      }
      if (dt === DataType.PROFIT || dt === DataType.STOCK_PROFIT) {
        if (opt === "percentage") return profitMargin || 0
        return totalProfit || 0
      }
      if (dt === DataType.PROFIT_MARGIN) {
        return profitMargin || 0
      }
      if (dt === DataType.LOW_STOCK_ITEMS) {
        return lowStockCount || 0
      }
      if (dt === DataType.TOTAL_ITEMS) {
        return totalItems || 0
      }
      if (dt === DataType.STOCK_VALUE || dt === DataType.INVENTORY_VALUE) {
        return stockValue || 0
      }
      return baseFor(dt)
    }

    const randFor = (key: string) => rngFor(`widget-series|${seedPrefix}|${widget.id}|${key}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`)
    const startDate = dateRange.startDate
    const endDate = dateRange.endDate
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    let dataPoints = Math.min(daysDiff, 30)
    let dateIncrement = 1
    switch (frequency) {
      case "hourly":
        dataPoints = Math.min(daysDiff * 24, 168)
        dateIncrement = 1 / 24
        break
      case "daily":
        dataPoints = Math.min(daysDiff, 90)
        dateIncrement = 1
        break
      case "weekly":
        dataPoints = Math.min(Math.ceil(daysDiff / 7), 52)
        dateIncrement = 7
        break
      case "monthly":
        dataPoints = Math.min(Math.ceil(daysDiff / 30), 24)
        dateIncrement = 30
        break
      case "yearly":
        dataPoints = Math.min(Math.ceil(daysDiff / 365), 5)
        dateIncrement = 365
        break
    }

    const dates = Array.from({ length: Math.max(1, dataPoints) }).map((_, i) => {
      const currentDate = new Date(startDate.getTime() + i * dateIncrement * 24 * 60 * 60 * 1000)
      return format(currentDate, "yyyy-MM-dd")
    })

    // Breakdown mode: create multiple datasets from a single metric.
    if ((widget as any)?.dataConfigMode === "breakdown" && (widget as any)?.breakdownBy) {
      const dt0 = (effectiveSeries[0]?.dataType || widget.dataType || DataType.TOTAL_ITEMS) as DataType
      const mode0 = (effectiveSeries[0]?.displayMode || widget.displayMode || "quantity") as any
      const buckets =
        (widget as any)?.breakdownBy === "category"
          ? stockMetrics.categories.map((c: any) => ({ key: c.name, label: c.name, color: c.color }))
          : (widget as any)?.breakdownBy === "supplier"
            ? stockMetrics.suppliers.map((s: any) => ({ key: s.name, label: s.name, color: s.color }))
            : [{ key: "A", label: "A" }, { key: "B", label: "B" }, { key: "C", label: "C" }]

      const labels = dates.map((d) => d)
      const datasets = buckets.map((b: any, idx: number) => {
        const r = randFor(`breakdown|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
        const base = baseFor(dt0)
        return {
          label: b.label,
          data: labels.map((_d: string, i: number) => {
            const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, labels.length - 1)) * Math.PI * 2)
            const jitter = 0.88 + r() * 0.24
            return Math.max(0, base * wave * jitter * (0.4 + (idx + 1) / (buckets.length + 2)))
          }),
          borderColor: b.color || themeConfig.brandColors.navy,
          backgroundColor: b.color || themeConfig.brandColors.navy,
        }
      })

      // Pie charts want category labels.
      const pieLabels = buckets.map((b: any) => b.label)
      const pieDataset = buckets.map((b: any, idx: number) => {
        const r = randFor(`breakdown-pie|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
        return Math.max(0, baseFor(dt0) * (0.6 + r() * 0.8) * (0.4 + (idx + 1) / (buckets.length + 2)))
      })

      const baseValue = baseFor(dt0)
      return {
        [dt0]: { price: baseValue, quantity: baseValue, percentage: baseValue, score: baseValue, value: baseValue, options: {} },
        breakdownChartData:
          widget.type === WidgetType.PIE_CHART
            ? { labels: pieLabels, datasets: [{ label: String(dt0), data: pieDataset, backgroundColor: buckets.map((b: any, i: number) => b.color || widget.colors?.series?.[i] || themeConfig.brandColors.navy) }] }
            : { labels, datasets },
        breakdownMeta: { displayMode: mode0 },
      }
    }

    // Series mode: build a `history[]` bucket per date with per-series keys.
    const history = dates.map((date, i) => {
      const row: any = { date }
      for (const s of effectiveSeries) {
        const dt = s.dataType as DataType
        const optKey = typeof s.dataOption === "string" ? s.dataOption : undefined
        const r = randFor(`series|${String(dt)}|${String(optKey || "base")}`)
        const base = valueForSeries(s)
        const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, dates.length - 1)) * Math.PI * 2)
        const jitter = 0.88 + r() * 0.24
        const v = base * wave * jitter

        row[dt] = row[dt] || { price: 0, quantity: 0, percentage: 0, score: 0, options: {} }
        const bucket = { price: v, quantity: v, percentage: v, score: v }
        if (optKey) {
          row[dt].options[optKey] = bucket
          if (!row[dt].price && !row[dt].quantity && !row[dt].percentage && !row[dt].score) {
            Object.assign(row[dt], bucket)
          }
        } else {
          Object.assign(row[dt], bucket)
        }
      }
      return row
    })

    return { history }
  }

  const handleClearWidgets = () => {
    setClearWidgetsDialogOpen(true)
  }

  const confirmClearWidgets = () => {
    clearAllWidgets()
    setClearWidgetsDialogOpen(false)
  }

  // Show location placeholder if no company is selected
  // Check companyState directly (source of truth) as stockState might not be synced yet
  if (!coreContextsReady) {
    return <Box sx={{ height: "100vh", bgcolor: "background.default" }} />
  }

  if (!companyState.companyID) {
    return <LocationPlaceholder />
  }

  // No full-screen loading UI; stock tables/widgets render and hydrate as data arrives.

  // If permissions aren't loaded yet, avoid showing "Access Restricted" prematurely (no loading UI).
  if (!permissionsLoaded && companyState.companyID) {
    return <Box sx={{ height: "100vh", bgcolor: "background.default" }} />
  }

  // Show message if no tabs are visible due to permissions (only after permissions are loaded)
  if (permissionsLoaded && visibleTabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access any stock management features. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  // Dashboard content to be collapsed with tabs
  const dashboardContent = (
    <Box sx={{ width: "100%" }}>
      <DashboardHeader
        title="Stock Dashboard"
        subtitle="Stock Dashboard"
        canEdit={canEditStock()}
        isEditing={isEditing}
        onToggleEdit={toggleEditMode}
        onClearWidgets={handleClearWidgets}
        onRevert={handleRevert}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        menuItems={[
          {
            label: "Widget",
            onClick: handleCreateWidget,
            permission: canEditStock(),
          },
          {
            label: "Product",
            onClick: () => navigate("/Stock/Items?crudEntity=product&crudMode=create"),
            permission: canEditStock(),
          },
          {
            label: "Stock Count",
            onClick: () => navigate("/Stock/StockCounts?crudEntity=stockCount&crudMode=create"),
            permission: canEditStock(),
          },
          {
            label: "Purchase",
            onClick: () => navigate("/Stock/PurchaseOrders?crudEntity=purchaseOrder&crudMode=create"),
            permission: canEditStock(),
          },
          {
            label: "Par Level",
            onClick: () => navigate("/Stock/ParLevels?crudEntity=parLevel&crudMode=create"),
            permission: canEditStock(),
          },
        ]}
        dateRange={{
          value: selectedDateRange,
          label: getDateRangeLabel(),
          onChange: handleDateRangeChange,
        }}
        frequency={{
          value: frequency,
          options: ["Hourly", "Daily", "Weekly", "Monthly", "Yearly"],
          onChange: handleFrequencyChange,
        }}
      />

      {/* Widgets Container */}
      <Box ref={canvasViewportRef} sx={{ width: "100%", mb: 0, overflowX: "hidden" }}>
        <Box sx={{ position: "relative", minHeight: `${scaledHeight}px` }}>
          <Box
            sx={{
              position: "relative",
              width: `${canvasWidth}px`,
              minHeight: `${containerHeight}px`,
              pt: 1,
              px: 2,
              pb: 0,
              backgroundColor: "background.default",
              backgroundImage: showGrid
                ? `linear-gradient(${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px), 
                 linear-gradient(90deg, ${alpha(themeConfig.brandColors.navy, 0.05)} 1px, transparent 1px)`
                : "none",
              backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
              backgroundPosition: "0 0",
              transform: `scale(${canvasScale})`,
              transformOrigin: "top left",
            }}
          >
        {dashboardState.widgets.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No widgets found. Click "Add Widget" to get started.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                // Reset to section default layout (persisted via useWidgetManager)
                resetDashboard()
              }}
            >
              Reset Dashboard
            </Button>
          </Box>
        )}
        {dashboardState.widgets.map((widget) => {
          return (
            <Rnd
              key={widget.id}
              default={{
                x: widget.x,
                y: widget.y,
                width: widget.width,
                height: widget.height,
              }}
              size={{ width: widget.width, height: widget.height }}
              position={{ x: widget.x, y: widget.y }}
              minWidth={widget.minW * GRID_CELL_SIZE}
              minHeight={widget.minH * GRID_CELL_SIZE}
              disableDragging={!isEditing}
              enableResizing={isEditing}
              bounds="parent"
              onDragStop={(_e, d) => {
                updateWidgetPosition(widget.id, { x: d.x, y: d.y })
              }}
              onResizeStop={(_e, _direction, ref, _delta, position) => {
                updateWidgetSize(widget.id, {
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                })
                updateWidgetPosition(widget.id, {
                  x: position.x,
                  y: position.y,
                })
              }}
              style={{
                border: selectedWidgetId === widget.id ? `2px solid ${themeConfig.brandColors.navy}` : "none",
                borderRadius: "8px",
                overflow: "hidden",
              }}
              onMouseDown={() => isEditing && setSelectedWidgetId(widget.id)}
              onContextMenu={(e: React.MouseEvent<Element, MouseEvent>) => handleWidgetContextMenu(e, widget.id)}
              dragGrid={[GRID_CELL_SIZE, GRID_CELL_SIZE]}
              resizeGrid={[GRID_CELL_SIZE, GRID_CELL_SIZE]}
              scale={canvasScale}
            >
              <Box sx={{ height: "100%", width: "100%", overflow: "hidden" }}>
                <DynamicWidget
                  widget={widget}
                  data={getWidgetDataForWidget(widget)}
                  onSettingsOpen={handleOpenWidgetSettings}
                  isEditing={isEditing}
                />
              </Box>
            </Rnd>
          )
        })}
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)",
          m: 0,
          mt: 0,
          p: 0,
          transition: "margin 0.3s ease",
        }}
      >
        <Box sx={{ overflow: "auto", flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <CollapsibleTabHeader
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isExpanded={isTabsExpanded}
            onToggleExpanded={toggleTabsExpanded}
            dashboardContent={dashboardContent}
          />

          <Box sx={{ width: "100%", minHeight: 0, pt: 2, pb: 0 }}>
            {visibleTabs[activeTab] && visibleTabs[activeTab].component}
          </Box>
        </Box>
      </Box>

      {/* Widget Context Menu */}
      <WidgetContextMenu
        open={contextMenu !== null}
        position={contextMenu ? { x: contextMenu.mouseX, y: contextMenu.mouseY } : { x: 0, y: 0 }}
        onClose={() => setContextMenu(null)}
        widgetId={contextMenu?.widgetId || ""}
        onSettingsOpen={handleOpenWidgetSettings}
        onRemove={() => {
          if (contextMenu) {
            removeWidget(contextMenu.widgetId)
            setContextMenu(null)
          }
        }}
      />

      {/* Widget Settings Dialog */}
      <WidgetSettingsDialog
        open={settingsDialogOpen}
        onClose={handleCloseWidgetDialog}
        widget={currentWidgetSettings}
        onSave={handleSaveWidgetSettings}
        availableDataTypes={getStockDataTypes(getAvailableDataTypes)}
        cardDataTypes={getStockCardDataTypes() as any}
        seriesDataTypes={getStockDataTypes(getAvailableDataTypes)}
        mode={widgetDialogMode}
      />

      {/* Custom Date Range Dialog */}
      <Dialog open={customDateDialogOpen} onClose={() => setCustomDateDialogOpen(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2, minWidth: 300 }}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange((prev) => ({ ...prev, startDate: newValue }))
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateRange((prev) => ({ ...prev, endDate: newValue }))
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomDateApply} variant="contained" color="primary">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      {/* Clear Widgets Confirmation Dialog */}
      <Dialog open={clearWidgetsDialogOpen} onClose={() => setClearWidgetsDialogOpen(false)}>
        <DialogTitle>Clear All Widgets</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove all widgets from the dashboard? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearWidgetsDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmClearWidgets} variant="contained" color="error">
            Clear All Widgets
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default StockDashboard
