"use client"

import { Description as BillsIcon, Map as MapIcon } from "@mui/icons-material"
import type React from "react"
import { Suspense, useState, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material"
import {
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  PointOfSale as PointOfSaleIcon,
  Inventory as InventoryIcon,
  ConfirmationNumber as TicketIcon,
  LocalLaundryService as BagCheckIcon,
  Calculate as CalculatorIcon,
} from "@mui/icons-material"
import { useNavigate, useLocation } from "react-router-dom"
import { Rnd } from "react-rnd"
import { alpha, useTheme } from "@mui/material/styles"
import { debugLog, debugWarn } from "../../utils/debugLog"
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { themeConfig } from "../../theme/AppTheme"
import { lazyWithPreload } from "../utils/lazyWithPreload"

import DynamicWidget from "../components/reusable/DynamicWidget"
import WidgetContextMenu from "../components/reusable/WidgetContextMenu"
import WidgetSettingsDialog from "../components/reusable/WidgetSettingsDialog"
import DashboardHeader from "../components/reusable/DashboardHeader"
import CollapsibleTabHeader from "../components/reusable/CollapsibleTabHeader"
import { useWidgetManager } from "../hooks/useWidgetManager"
import useResponsiveWidgetCanvas from "../hooks/useResponsiveWidgetCanvas"
import { WidgetType, DataType } from "../types/WidgetTypes"
import { useCompany } from "../../backend/context/CompanyContext"
import { POSProvider, usePOS } from "../../backend/context/POSContext"
import { useAnalytics } from "../../backend/context/AnalyticsContext"
import usePersistentBoolean from "../hooks/usePersistentBoolean"
const OrdersTable = lazyWithPreload(() => import("../components/pos/OrdersTable"))
const BillsManagement = lazyWithPreload(() => import("./pos/BillsManagement"))
const TableLayoutDesigner = lazyWithPreload(() => import("../components/bookings/TableLayoutDesigner"))
const StockTable = lazyWithPreload(() => import("../components/stock/StockTable"))
const TillScreensTable = lazyWithPreload(() => import("../components/pos/TillScreensTable"))
const TicketManagement = lazyWithPreload(() => import("../components/pos/TicketManagement"))
const BagCheckManagement = lazyWithPreload(() => import("../components/pos/BagCheckManagement"))
const DeviceManagement = lazyWithPreload(() => import("./pos/DeviceManagement"))
const LocationManagement = lazyWithPreload(() => import("./pos/LocationManagement"))
const PaymentManagement = lazyWithPreload(() => import("./pos/PaymentManagement"))
const GroupManagement = lazyWithPreload(() => import("../components/pos/GroupManagement"))
const CategoriesManagement = lazyWithPreload(() => import("../components/stock/CategoriesManagement"))
const TableManagement = lazyWithPreload(() => import("../components/bookings/TableManagement"))
const CoursesManagement = lazyWithPreload(() => import("../components/stock/CoursesManagement"))
const TillUsage = lazyWithPreload(() => import("../components/pos/TillUsage"))
const CorrectionsManagement = lazyWithPreload(() => import("./pos/CorrectionsManagement"))
const DiscountsManagement = lazyWithPreload(() => import("./pos/DiscountsManagement"))
const PromotionsManagement = lazyWithPreload(() => import("./pos/PromotionsManagement"))
const ReportsPage = lazyWithPreload(() => import("../components/stock/reports/ReportsPage"))
const POSSettings = lazyWithPreload(() => import("../components/pos/POSSettings"))

// Grid configuration
const GRID_CELL_SIZE = 20 // Size of each grid cell in pixels

// Available data types for POS dashboard - now includes Stock data
const getPOSDataTypes = (getAvailableDataTypes?: (section?: string) => Array<{ value: string; label: string; category: string }>) => {
  const basePosTypes =
    typeof getAvailableDataTypes === "function"
      ? getAvailableDataTypes("pos")
      : [
    // POS-specific data types
    { value: DataType.SALES, label: "Sales", category: "POS" },
    { value: DataType.POS_TRANSACTIONS, label: "Total Transactions", category: "POS" },
    { value: DataType.SALES_BY_DAY, label: "Daily Sales", category: "POS" },
    { value: DataType.SALES_BY_HOUR, label: "Hourly Sales", category: "POS" },
    { value: DataType.PAYMENT_METHOD_BREAKDOWN, label: "Payment Methods", category: "POS" },
    { value: DataType.CUSTOMER_ANALYTICS, label: "Customer Analytics", category: "POS" },
    { value: DataType.CATEGORIES, label: "Categories", category: "POS" },
    { value: DataType.PROFIT, label: "Profit", category: "POS" },
    { value: DataType.TOP_ITEMS, label: "Top Items", category: "POS" },
    { value: DataType.TOTAL_ITEMS, label: "Total Orders", category: "POS" },
    { value: DataType.PROFIT_MARGIN, label: "Profit Margin", category: "POS" },
    { value: DataType.INVENTORY_VALUE, label: "Revenue", category: "POS" },
      ]

  return basePosTypes.concat([
    // Stock data types (cross-module access)
    { value: DataType.STOCK_COUNT, label: "Stock Count", category: "Stock" },
    { value: DataType.STOCK_VALUE, label: "Stock Value", category: "Stock" },
    { value: DataType.LOW_STOCK_ITEMS, label: "Low Stock Items", category: "Stock" },
    { value: DataType.STOCK_BY_CATEGORY, label: "Stock by Category", category: "Stock" },
    { value: DataType.STOCK_BY_SUPPLIER, label: "Stock by Supplier", category: "Stock" },
    { value: DataType.TOP_SELLING_ITEMS, label: "Top Selling Items", category: "Stock" },
    { value: DataType.PURCHASE_HISTORY, label: "Purchase History", category: "Stock" },
    { value: DataType.STOCK_TRENDS, label: "Stock Trends", category: "Stock" },
  ])
}

const getPOSCardDataTypes = () => [
  { value: DataType.SALES, label: "Sales" },
  { value: DataType.PROFIT, label: "Profit" },
  { value: DataType.TOTAL_ITEMS, label: "Bills" },
  { value: DataType.POS_TRANSACTIONS, label: "Transactions" },
]

const POSInlineLoader = () => (
  <Box
    sx={{
      minHeight: "32vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: 3,
      py: 6,
    }}
  >
    <Typography variant="body1" color="text.secondary">
      Loading 1Stop...
    </Typography>
  </Box>
)

type PreloadablePanelComponent = React.LazyExoticComponent<React.ComponentType<any>> & {
  preload?: () => Promise<unknown>
}

const renderDeferredPOSPanel = (Component: PreloadablePanelComponent) => (
  <Suspense fallback={<POSInlineLoader />}>
    <Component />
  </Suspense>
)

const POSDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { state: companyState, hasPermission } = useCompany()
  const pos = usePOS()
  const { state: posState } = pos
  const theme = useTheme()
  const lastRouteSyncPathRef = useRef<string>("")
  const suppressRouteSyncOnceRef = useRef<string>("") // lowercase
  
  // POS Context for fallback data (available via context)
  // const posState = usePOS() // Available but not directly used
  
  // Analytics Context for enhanced data (POS + Stock) - optional
  let analytics: any = null
  try {
    analytics = useAnalytics()
  } catch (error) {
    // Analytics Context not available - use fallback mode
  }
  
  const getPOSWidgets = analytics?.getPOSWidgets
  const getStockWidgets = analytics?.getStockWidgets
  const getAvailableDataTypes = analytics?.getAvailableDataTypes

  // ========= Stable (seeded) RNG =========
  // This prevents dashboard data from "changing" on tab navigation (re-renders).
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

  // State variables
  const [isEditing, setIsEditing] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)

  // Menu and dialog states
  const [selectedDateRange, setSelectedDateRange] = useState<string>("last7days")
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false)
  const [clearWidgetsDialogOpen, setClearWidgetsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [managementTab, setManagementTab] = useState(0)

  const managementSections = [
    {
      label: "Devices",
      slug: "devices",
      component: () => renderDeferredPOSPanel(DeviceManagement),
      preload: DeviceManagement.preload,
      permission: hasPermission("pos", "devices", "view"),
    },
    {
      label: "Locations",
      slug: "locations",
      component: () => renderDeferredPOSPanel(LocationManagement),
      preload: LocationManagement.preload,
      permission: hasPermission("pos", "locations", "view"),
    },
    {
      label: "Payments",
      slug: "payments",
      component: () => renderDeferredPOSPanel(PaymentManagement),
      preload: PaymentManagement.preload,
      permission: hasPermission("pos", "payments", "view"),
    },
    {
      label: "Groups",
      slug: "groups",
      component: () => renderDeferredPOSPanel(GroupManagement),
      preload: GroupManagement.preload,
      permission: hasPermission("pos", "groups", "view"),
    },
    {
      label: "Categories",
      slug: "categories",
      component: () => renderDeferredPOSPanel(CategoriesManagement),
      preload: CategoriesManagement.preload,
      permission: hasPermission("pos", "categories", "view"),
    },
    {
      label: "Tables",
      slug: "tables",
      component: () => renderDeferredPOSPanel(TableManagement),
      preload: TableManagement.preload,
      permission: hasPermission("pos", "tables", "view"),
    },
    {
      label: "Courses",
      slug: "courses",
      component: () => renderDeferredPOSPanel(CoursesManagement),
      preload: CoursesManagement.preload,
      permission: hasPermission("pos", "courses", "view"),
    },
    {
      label: "Till Usage",
      slug: "till-usage",
      component: () => renderDeferredPOSPanel(TillUsage),
      preload: TillUsage.preload,
      permission: hasPermission("pos", "usage", "view"),
    },
    {
      label: "Corrections",
      slug: "corrections",
      component: () => renderDeferredPOSPanel(CorrectionsManagement),
      preload: CorrectionsManagement.preload,
      permission: hasPermission("pos", "corrections", "view"),
    },
    {
      label: "Discounts",
      slug: "discounts",
      component: () => renderDeferredPOSPanel(DiscountsManagement),
      preload: DiscountsManagement.preload,
      permission: hasPermission("pos", "discounts", "view"),
    },
    {
      label: "Promotions",
      slug: "promotions",
      component: () => renderDeferredPOSPanel(PromotionsManagement),
      preload: PromotionsManagement.preload,
      permission: hasPermission("pos", "promotions", "view"),
    },
  ]

  const visibleManagementSections = managementSections.filter((section) => section.permission)

  useEffect(() => {
    if (managementTab >= visibleManagementSections.length) {
      setManagementTab(0)
    }
  }, [managementTab, visibleManagementSections.length])

  const handleManagementTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setManagementTab(newValue)

    const selectedSection = visibleManagementSections[newValue]
    if (!selectedSection) {
      return
    }

    const targetPath = `/POS/Management/${slugToPascalPath(selectedSection.slug)}`
    const currentPath = location.pathname.replace(/\/+$/, "")
    if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
      suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
      navigate(targetPath)
    }
  }

  const renderManagementContent = () => {
    if (!visibleManagementSections.length) {
      return (
        <Box sx={{ width: "100%", mt: 2 }}>
          <Typography variant="body1" color="text.secondary">
            No management sections available.
          </Typography>
        </Box>
      )
    }

    return (
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            m: 0,
            p: 0,
          }}
        >
          <Tabs
            value={managementTab}
            onChange={handleManagementTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              minHeight: 42,
              "& .MuiTab-root": {
                minHeight: 42,
                py: 1,
              },
            }}
            >
              {visibleManagementSections.map((section) => (
                <Tab
                  key={section.slug}
                  label={section.label}
                  onMouseEnter={() => section.preload?.()}
                  onFocus={() => section.preload?.()}
                  onTouchStart={() => section.preload?.()}
                />
              ))}
            </Tabs>
          </Box>
          <Box sx={{ mt: 2, minHeight: "60vh", display: "flex", flexDirection: "column" }}>
            {typeof visibleManagementSections[managementTab]?.component === "function"
              ? visibleManagementSections[managementTab]?.component()
              : visibleManagementSections[managementTab]?.component}
          </Box>
        </Box>
      )
  }

  // Define available tabs with permission checks
  const availableTabs = [
      {
        label: "Item Sales",
        slug: "item-sales",
        icon: <ReceiptIcon />,
        component: () => renderDeferredPOSPanel(OrdersTable),
        preload: OrdersTable.preload,
        permission: hasPermission("pos", "sales", "view"),
      },
      {
        label: "Bills",
        slug: "bills",
        icon: <BillsIcon />,
        component: () => renderDeferredPOSPanel(BillsManagement),
        preload: BillsManagement.preload,
        permission: hasPermission("pos", "bills", "view"),
      },
      {
        label: "Floor Plan",
        slug: "floor-plan",
        icon: <MapIcon />,
        component: () => renderDeferredPOSPanel(TableLayoutDesigner),
        preload: TableLayoutDesigner.preload,
        permission: hasPermission("pos", "floorplan", "view"),
      },
      {
        label: "Items",
        slug: "items",
        icon: <InventoryIcon />,
        component: () => renderDeferredPOSPanel(StockTable),
        preload: StockTable.preload,
        permission: hasPermission("pos", "items", "view"),
      },
      {
        label: "Till Screens",
        slug: "till-screens",
        icon: <PointOfSaleIcon />,
        component: () => renderDeferredPOSPanel(TillScreensTable),
        preload: TillScreensTable.preload,
        permission: hasPermission("pos", "tillscreens", "view"),
      },
      {
        label: "Tickets",
        slug: "tickets",
        icon: <TicketIcon />,
        component: () => renderDeferredPOSPanel(TicketManagement),
        preload: TicketManagement.preload,
        permission: hasPermission("pos", "tickets", "view"),
      },
      {
        label: "Bag Check",
        slug: "bag-check",
        icon: <BagCheckIcon />,
        component: () => renderDeferredPOSPanel(BagCheckManagement),
        preload: BagCheckManagement.preload,
        permission: hasPermission("pos", "bagcheck", "view"),
      },
    {
      label: "Management",
      slug: "management",
      icon: <DashboardIcon />,
      component: renderManagementContent,
      permission: hasPermission("pos", "management", "view") && visibleManagementSections.length > 0,
    },
      {
        label: "Reports",
        slug: "reports",
        icon: <BarChartIcon />,
        component: () => renderDeferredPOSPanel(ReportsPage),
        preload: ReportsPage.preload,
        permission: hasPermission("pos", "reports", "view"),
      },
      {
        label: "Settings",
        slug: "settings",
        icon: <SettingsIcon />,
        component: () => renderDeferredPOSPanel(POSSettings),
        preload: POSSettings.preload,
        permission: hasPermission("pos", "settings", "view"),
      },
  ]

  // Filter tabs based on permissions
  const visibleTabs = availableTabs.filter((tab) => tab.permission)

  // Helper function to convert slug to PascalCase path (no hyphens)
  const slugToPascalPath = (slug: string) => {
    return slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
  }

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
    const pathLower = pathWithoutTrailingSlash.toLowerCase()

    // Only sync POS internal tab state while we're actually on a POS route.
    // This prevents the page from fighting app-level navigation when leaving POS.
    if (!pathLower.startsWith("/pos")) {
      return
    }

    const isSuppressed = suppressRouteSyncOnceRef.current === pathLower
    if (isSuppressed) {
      suppressRouteSyncOnceRef.current = ""
    }

    if (lastRouteSyncPathRef.current === pathLower) {
      return
    }
    lastRouteSyncPathRef.current = pathLower

    const pathSegments = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const posIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "pos")
    const tabSegment = posIndex !== -1 ? pathSegments[posIndex + 1] : undefined
    const subTabSegment = posIndex !== -1 ? pathSegments[posIndex + 2] : undefined

    const defaultTab = visibleTabs[0]
    const getManagementPath = (sectionSlug?: string | null) => {
      const slug = sectionSlug ?? visibleManagementSections[0]?.slug
      return slug ? `/POS/Management/${slugToPascalPath(slug)}` : `/POS/Management`
    }

    if (!tabSegment) {
      if (!defaultTab) {
        return
      }

      const defaultPath =
        defaultTab.slug === "management" ? getManagementPath(null) : `/POS/${slugToPascalPath(defaultTab.slug)}`

      if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
        navigate(defaultPath, { replace: true })
      }

      if (activeTab !== 0) {
        setActiveTab(0)
      }

      if (defaultTab.slug === "management" && visibleManagementSections.length && managementTab !== 0) {
        setManagementTab(0)
      }
      return
    }

    // Match tab by slug, handling PascalCase paths
    const tabSegLower = (tabSegment || "").toLowerCase()
    const matchedIndex = visibleTabs.findIndex((tab) => {
      const pascalSlug = slugToPascalPath(tab.slug)
      return tab.slug.toLowerCase() === tabSegLower || pascalSlug.toLowerCase() === tabSegLower
    })
    if (matchedIndex === -1) {
      if (!defaultTab) {
        return
      }

      const defaultPath =
        defaultTab.slug === "management" ? getManagementPath(null) : `/POS/${slugToPascalPath(defaultTab.slug)}`

      if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
        navigate(defaultPath, { replace: true })
      }

      if (activeTab !== 0) {
        setActiveTab(0)
      }

      if (defaultTab.slug === "management" && visibleManagementSections.length && managementTab !== 0) {
        setManagementTab(0)
      }
      return
    }

    if (matchedIndex !== activeTab) {
      setActiveTab(matchedIndex)
    }

    const matchedTab = visibleTabs[matchedIndex]

    if (matchedTab.slug === "management") {
      if (!visibleManagementSections.length) {
        return
      }

      if (!subTabSegment) {
        const currentSection = visibleManagementSections[managementTab] ?? visibleManagementSections[0]
        const targetPath = getManagementPath(currentSection?.slug ?? null)
        if (!isSuppressed && pathLower !== targetPath.toLowerCase()) {
          navigate(targetPath, { replace: true })
        }
        return
      }

      // Match management section by slug, handling both PascalCase paths and lowercase slugs
      const subSegLower = subTabSegment.toLowerCase()
      const matchedManagementIndex = visibleManagementSections.findIndex((section) => {
        const pascalSlug = slugToPascalPath(section.slug)
        return section.slug.toLowerCase() === subSegLower || pascalSlug.toLowerCase() === subSegLower
      })

      if (matchedManagementIndex === -1) {
        const targetPath = getManagementPath(null)
        if (!isSuppressed && pathLower !== targetPath.toLowerCase()) {
          navigate(targetPath, { replace: true })
        }
        if (managementTab !== 0) {
          setManagementTab(0)
        }
        return
      }

      if (matchedManagementIndex !== managementTab) {
        setManagementTab(matchedManagementIndex)
      }
    } else if (subTabSegment) {
      const targetPath = `/POS/${slugToPascalPath(matchedTab.slug)}`
      if (!isSuppressed && pathLower !== targetPath.toLowerCase()) {
        navigate(targetPath, { replace: true })
      }
    }
  }, [activeTab, location.pathname, managementTab, navigate, visibleManagementSections, visibleTabs])

  useEffect(() => {
    const active = visibleTabs[activeTab]
    active?.preload?.()

    const nextTab = visibleTabs[activeTab + 1]
    if (!nextTab?.preload) {
      return
    }

    const timer = window.setTimeout(() => {
      nextTab.preload?.()
    }, 120)

    return () => window.clearTimeout(timer)
  }, [activeTab, visibleTabs])

  useEffect(() => {
    const activeSection = visibleManagementSections[managementTab]
    activeSection?.preload?.()

    const nextSection = visibleManagementSections[managementTab + 1]
    if (!nextSection?.preload) {
      return
    }

    const timer = window.setTimeout(() => {
      nextSection.preload?.()
    }, 160)

    return () => window.clearTimeout(timer)
  }, [managementTab, visibleManagementSections])

  // Update the handleTabChange function to prevent scrolling
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const selectedTab = visibleTabs[newValue]
    if (!selectedTab) {
      return
    }

    setActiveTab(newValue)

    if (selectedTab.slug === "management") {
      const currentSection = visibleManagementSections[managementTab] ?? visibleManagementSections[0]
      if (currentSection) {
        const targetPath = `/POS/Management/${slugToPascalPath(currentSection.slug)}`
        const currentPath = location.pathname.replace(/\/+$/, "")
        if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
          suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
          navigate(targetPath)
        }
      } else {
        const targetPath = `/POS/Management`
        const currentPath = location.pathname.replace(/\/+$/, "")
        if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
          suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
          navigate(targetPath)
        }
      }
    } else {
      const targetPath = `/POS/${slugToPascalPath(selectedTab.slug)}`
      const currentPath = location.pathname.replace(/\/+$/, "")
      if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
        suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
        navigate(targetPath)
      }
    }
  }

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  

  // Date range state
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: subDays(new Date(), 6),
    endDate: new Date(),
  })
  const [frequency, setFrequency] = useState<string>("daily")

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
  } = useWidgetManager('pos')

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

  // Analytics data state (POS + Stock)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [stockAnalyticsData, setStockAnalyticsData] = useState<any>(null)

  // Calculate container height based on widget positions
  const containerHeight = calculateContainerHeight()
  const { canvasViewportRef, canvasWidth, canvasScale, scaledHeight } = useResponsiveWidgetCanvas({
    widgets: dashboardState.widgets,
    containerHeight,
  })

  // POS data state derived from POSContext
  const [posData, setPosData] = useState<{
    totalOrders: number
    profitMargin: number
    revenue: number
    paymentMethodBreakdown: Record<string, number>
    salesData: Array<{
      date: string
      sales?: { quantity: number; price: number }
    }>
    categoryData: Array<{
      date: string
      categories?: { name: string; quantity: number; price: number }
    }>
  }>({
    totalOrders: 0,
    profitMargin: 0,
    revenue: 0,
    paymentMethodBreakdown: {},
    salesData: [],
    categoryData: [],
  })

  // Load analytics data when component mounts or date range changes
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        const dateRangeFormatted = {
          startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
          endDate: format(dateRange.endDate, 'yyyy-MM-dd')
        }
        
        // Load both POS and Stock data for cross-module access
        const [posAnalyticsData, stockData] = await Promise.all([
          getPOSWidgets(dateRangeFormatted),
          getStockWidgets(dateRangeFormatted)
        ])
        
        setAnalyticsData(posAnalyticsData)
        setStockAnalyticsData(stockData)
      } catch (error) {
        debugWarn('Error loading POS analytics data, will use POS Context fallback:', error)
        // Don't set analyticsData so fallback will be used
      }
    }
    
    if (companyState.companyID && companyState.selectedSiteID && getPOSWidgets && getStockWidgets) {
      loadAnalyticsData()
    }
  }, [dateRange, frequency, getPOSWidgets, companyState.companyID, companyState.selectedSiteID])

  // Ensure bills are refreshed when entering POS.
  useEffect(() => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    pos.refreshBills?.().catch(() => {})
  }, [companyState.companyID, companyState.selectedSiteID, pos.refreshBills])

  const fetchPOSData = async (startDate: Date, endDate: Date, dataFrequency: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      const getBillTimestamp = (bill: any): number => {
        const t =
          bill?.paidAt ??
          bill?.closedAt ??
          bill?.openedAt ??
          bill?.createdAt ??
          bill?.updatedAt
        const n = typeof t === "number" ? t : Number(t)
        return Number.isFinite(n) ? n : Date.now()
      }

      const allBills = Array.isArray((posState as any)?.bills) ? ((posState as any).bills as any[]) : []
      const filteredBills = allBills.filter((bill: any) => {
        const ts = getBillTimestamp(bill)
        const d = new Date(ts)
        return d >= startDate && d <= endDate && String(bill?.status || "").toLowerCase() !== "cancelled"
      })

      const salesByDayMap = new Map<string, { quantity: number; price: number }>()
      for (const bill of filteredBills) {
        const ts = getBillTimestamp(bill)
        const day = format(new Date(ts), "yyyy-MM-dd")
        const items = Array.isArray(bill?.items) ? bill.items : []
        const qty = items.reduce((sum: number, it: any) => sum + (Number(it?.quantity) || 0), 0) || items.length || 1
        const total = Number(bill?.total ?? bill?.totalAmount ?? bill?.amount ?? 0) || 0
        const prev = salesByDayMap.get(day) || { quantity: 0, price: 0 }
        salesByDayMap.set(day, { quantity: prev.quantity + qty, price: prev.price + total })
      }

      const salesData = Array.from(salesByDayMap.entries())
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))

      // Helper function to group data by frequency
      const groupDataByFrequency = (data: any[], frequency: string) => {
        if (frequency === 'daily' || data.length === 0) return data;
        
        const grouped: Record<string, any> = {};
        
        data.forEach(item => {
          let key = item.date;
          
          if (frequency === 'weekly') {
            const date = new Date(item.date);
            const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
            key = `Week of ${weekStart}`;
          } else if (frequency === 'monthly') {
            key = item.date.substring(0, 7); // YYYY-MM
          } else if (frequency === 'yearly') {
            key = item.date.substring(0, 4); // YYYY
          }
          
          if (!grouped[key]) {
            grouped[key] = {
              date: key,
              sales: { quantity: 0, price: 0 }
            };
          }
          
          grouped[key].sales.quantity += item.sales?.quantity || 0;
          grouped[key].sales.price += item.sales?.price || 0;
        });
        
        return Object.values(grouped);
      };
      
      // Group data by frequency if needed
      const groupedSalesData = groupDataByFrequency(salesData, dataFrequency)

      // Calculate summary metrics
      const totalOrders = filteredBills.length
      const revenue = filteredBills.reduce((sum: number, bill: any) => sum + (Number(bill?.total ?? bill?.totalAmount ?? 0) || 0), 0)
      const profitMargin = 30 // No cost basis available here; default until COGS is wired.

      const paymentMethodBreakdown = filteredBills.reduce((acc: Record<string, number>, bill: any) => {
        const method = String(bill?.paymentMethod || bill?.paymentType || "Unknown")
        const amt = Number(bill?.total ?? bill?.totalAmount ?? 0) || 0
        acc[method] = (acc[method] || 0) + amt
        return acc
      }, {})

      const categoryTotals = new Map<string, { quantity: number; price: number }>()
      for (const bill of filteredBills) {
        const items = Array.isArray(bill?.items) ? bill.items : []
        for (const it of items) {
          const cat = String(it?.categoryName || it?.category || "Uncategorized")
          const qty = Number(it?.quantity) || 0
          const total = Number(it?.totalPrice ?? it?.total ?? 0) || 0
          const prev = categoryTotals.get(cat) || { quantity: 0, price: 0 }
          categoryTotals.set(cat, { quantity: prev.quantity + qty, price: prev.price + total })
        }
      }

      const categoryData = Array.from(categoryTotals.entries())
        .map(([name, agg]) => ({
          date: name,
          categories: { name, quantity: agg.quantity, price: agg.price },
        }))
        .sort((a, b) => (b.categories?.price || 0) - (a.categories?.price || 0))

      setPosData((prev) => ({
        ...prev,
        totalOrders,
        revenue,
        profitMargin,
        paymentMethodBreakdown,
        categoryData,
        salesData: groupedSalesData.length > 0 ? groupedSalesData : prev.salesData,
      }))
    } catch (error) {
      debugWarn("Error fetching POS data:", error)
    }
  }

  // Keep fallback POS metrics in sync with real bills.
  useEffect(() => {
    if (!companyState.companyID || !companyState.selectedSiteID) return
    void fetchPOSData(dateRange.startDate, dateRange.endDate, frequency)
  }, [companyState.companyID, companyState.selectedSiteID, (posState as any)?.bills, dateRange.startDate, dateRange.endDate, frequency])

  // Helper functions for data processing

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  // Handle revert - reload saved layout and exit edit mode without saving
  const handleRevert = async () => {
    await revertDashboard()
    setIsEditing(false)
  }

  // Date range handling
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
    fetchPOSData(start, end, frequency)
  }

  const handleFrequencyChange = (newFrequency: string) => {
    setFrequency(newFrequency)
    fetchPOSData(dateRange.startDate, dateRange.endDate, newFrequency)
  }

  const handleCustomDateApply = () => {
    setCustomDateDialogOpen(false)
    fetchPOSData(dateRange.startDate, dateRange.endDate, frequency)
  }

  // Widget handling
  const handleWidgetContextMenu = (event: React.MouseEvent, widgetId: string) => {
    if (!isEditing) return

    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      widgetId,
    })
  }

  const handleOpenWidgetSettings = (widgetId: string) => {
    const settings = getWidgetSettings(widgetId)
    if (settings) {
      setWidgetDialogMode("edit")
      setPendingCreatedWidgetId(null)
      setCurrentWidgetSettings(settings)
      setSettingsDialogOpen(true)
    }
  }

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
    const newWidget = addWidget("stat", DataType.SALES)
    setSelectedWidgetId(newWidget.id)
    setCurrentWidgetSettings(newWidget)
    setWidgetDialogMode("create")
    setPendingCreatedWidgetId(newWidget.id)
    setSettingsDialogOpen(true)
  }

  const handleClearWidgets = () => {
    setClearWidgetsDialogOpen(true)
  }

  const confirmClearWidgets = () => {
    clearAllWidgets()
    setClearWidgetsDialogOpen(false)
  }


  // Fallback function to get data directly from POS Context (original approach)
  const getPOSContextData = (widget: any, dataType: DataType) => {
    const safePosRevenue = Number(posData.revenue || 0) || 0
    const safePosProfitMargin = Number(posData.profitMargin || 0) || 0
    const safePosProfit = safePosRevenue * (safePosProfitMargin / 100)
    const buildTypedMetric = (
      metricType: DataType,
      metricValue: number,
      displayMode: "price" | "quantity" | "percentage" | "score" = "quantity",
      extra: Record<string, any> = {},
    ) => ({
      [metricType]: {
        price: displayMode === "price" ? metricValue : 0,
        quantity: displayMode === "quantity" ? metricValue : 0,
        percentage: displayMode === "percentage" ? metricValue : 0,
        score: displayMode === "score" ? metricValue : 0,
        value: metricValue,
        options: {},
      },
      ...extra,
    })

    const normalizeCategoricalRows = (input: any, keyName: string) => {
      if (Array.isArray(input)) {
        return input.map((row: any, index: number) => ({
          [keyName]:
            row?.[keyName] ??
            row?.name ??
            row?.label ??
            row?.category ??
            row?.supplier ??
            row?.method ??
            row?.segment ??
            `Item ${index + 1}`,
          value: Number(row?.value ?? row?.amount ?? row?.sales ?? row?.total ?? row?.averageSpend ?? row?.count ?? 0) || 0,
          count: Number(row?.count ?? row?.quantity ?? row?.transactions ?? row?.value ?? 0) || 0,
        }))
      }

      if (input && typeof input === "object") {
        return Object.entries(input).map(([label, rawValue]) => ({
          [keyName]: label,
          value: Number(rawValue) || 0,
          count: Number(rawValue) || 0,
        }))
      }

      return []
    }
    
    // IMPORTANT: avoid Math.random() here.
    // getWidgetData() is called on every render; using randomness causes values to change when switching tabs.
    const historyFromSales = (
      seriesType: DataType,
      options?: { quantityScale?: number; priceScale?: number; constantQuantity?: number; constantPrice?: number }
    ) => {
      const quantityScale = options?.quantityScale ?? 1
      const priceScale = options?.priceScale ?? 1
      const constantQuantity = options?.constantQuantity
      const constantPrice = options?.constantPrice

      // Prefer stable POS history if available; otherwise return empty.
      const base = Array.isArray(posData.salesData) ? posData.salesData : []
      return base.map((point: any) => ({
        date: point.date,
        [seriesType]: {
          quantity:
            constantQuantity !== undefined
              ? constantQuantity
              : Math.round((point.sales?.quantity || 0) * quantityScale),
          price:
            constantPrice !== undefined ? constantPrice : Math.round((point.sales?.price || 0) * priceScale),
        },
      }))
    }

    // For dashboard cards and stats, provide the specific value
    if (widget.type === WidgetType.CARD || widget.type === WidgetType.DASHBOARD_CARD || widget.type === WidgetType.STAT) {
      switch (dataType) {
        case DataType.TOTAL_ITEMS:
          return buildTypedMetric(DataType.TOTAL_ITEMS, Number(posData.totalOrders || 0), "quantity", {
            totalItems: posData.totalOrders,
            history: historyFromSales(dataType, { quantityScale: 1, priceScale: 1 }),
          })
        case DataType.POS_TRANSACTIONS:
          return buildTypedMetric(DataType.POS_TRANSACTIONS, Number(posData.totalOrders || 0), "quantity", {
            totalTransactions: posData.totalOrders,
            history: historyFromSales(dataType, { quantityScale: 1, priceScale: 1 }),
          })
        case DataType.PROFIT_MARGIN:
          return buildTypedMetric(DataType.PROFIT_MARGIN, Number(posData.profitMargin || 0), "percentage", {
            profitMargin: posData.profitMargin,
            history: historyFromSales(dataType, {
              constantQuantity: posData.profitMargin,
              constantPrice: posData.profitMargin,
            }),
          })
        case DataType.INVENTORY_VALUE: // Using this for Revenue
          return buildTypedMetric(DataType.INVENTORY_VALUE, Number(posData.revenue || 0), "price", {
            inventoryValue: posData.revenue,
            totalValue: posData.revenue,
            history: historyFromSales(dataType, { quantityScale: 0.01, priceScale: 1 }),
          })
        case DataType.STOCK_VALUE:
          return buildTypedMetric(DataType.STOCK_VALUE, Number(stockAnalyticsData?.kpis?.totalStockValue || 0), "price", {
            totalValue: stockAnalyticsData?.kpis?.totalStockValue || 0,
            inventoryValue: stockAnalyticsData?.kpis?.totalStockValue || 0,
            history: historyFromSales(dataType, { constantPrice: Number(stockAnalyticsData?.kpis?.totalStockValue || 0) }),
          })
        case DataType.LOW_STOCK_ITEMS:
          return buildTypedMetric(DataType.LOW_STOCK_ITEMS, Number(stockAnalyticsData?.kpis?.lowStockCount || 0), "quantity", {
            lowStockItems: stockAnalyticsData?.kpis?.lowStockCount || 0,
            history: historyFromSales(dataType, { constantQuantity: Number(stockAnalyticsData?.kpis?.lowStockCount || 0) }),
          })
        case DataType.SALES:
          return {
            totalValue: posData.revenue,
            sales: {
              price: posData.revenue,
              quantity: posData.revenue,
              options: {
                gross: { price: posData.revenue, quantity: posData.revenue },
                net: { price: posData.revenue, quantity: posData.revenue },
              },
            },
            history: historyFromSales(dataType, { quantityScale: 1, priceScale: 1 }).map((p: any) => ({
              ...p,
              sales: {
                ...(p?.sales || {}),
                options: {
                  gross: { price: p?.sales?.price ?? 0, quantity: p?.sales?.quantity ?? 0 },
                  net: { price: p?.sales?.price ?? 0, quantity: p?.sales?.quantity ?? 0 },
                },
              },
            })),
          }
        case DataType.PROFIT:
          return buildTypedMetric(DataType.PROFIT, safePosProfit, "price", {
            totalProfit: safePosProfit,
            history: historyFromSales(dataType, { quantityScale: 1, priceScale: safePosProfitMargin / 100 }),
          })
        default:
          return {
            value: 0,
            history: historyFromSales(dataType),
          }
      }
    }

    // For charts, provide the appropriate historical data
    switch (dataType) {
      case DataType.SALES:
      case DataType.SALES_BY_DAY:
      case DataType.SALES_BY_HOUR:
      case DataType.POS_TRANSACTIONS:
      case DataType.TOTAL_ITEMS:
        return { history: historyFromSales(dataType) }
      case DataType.CATEGORIES:
        // Stable fallback category breakdown
        return { data: normalizeCategoricalRows(posData.categoryData, "category") }
      case DataType.PAYMENT_METHOD_BREAKDOWN:
        return { data: normalizeCategoricalRows(posData.paymentMethodBreakdown, "name") }
      default:
        return { history: historyFromSales(dataType) }
    }
  }

  // Get data for widget based on its type using analytics context or fallback to POS context
  const getWidgetData = (widget: any) => {
    if (!widget || !widget.dataType) {
      return { history: [] }
    }

    const dataType = widget.dataType
    const safeAnalyticsSales = Number(analyticsData?.kpis?.totalSales || 0) || 0
    const safeAnalyticsProfit = Number.isFinite(safeAnalyticsSales * 0.3) ? safeAnalyticsSales * 0.3 : 0
    const buildTypedMetric = (
      metricType: DataType,
      metricValue: number,
      displayMode: "price" | "quantity" | "percentage" | "score" = "quantity",
      extra: Record<string, any> = {},
    ) => {
      const safeMetricValue = Number.isFinite(metricValue) ? metricValue : 0
      return {
      [metricType]: {
        price: displayMode === "price" ? safeMetricValue : 0,
        quantity: displayMode === "quantity" ? safeMetricValue : 0,
        percentage: displayMode === "percentage" ? safeMetricValue : 0,
        score: displayMode === "score" ? safeMetricValue : 0,
        value: safeMetricValue,
        options: {},
      },
      ...extra,
    }}
    const normalizeCategoricalRows = (input: any, keyName: string) => {
      if (Array.isArray(input)) {
        return input.map((row: any, index: number) => ({
          [keyName]:
            row?.[keyName] ??
            row?.name ??
            row?.label ??
            row?.category ??
            row?.supplier ??
            row?.method ??
            row?.segment ??
            `Item ${index + 1}`,
          value: Number(row?.value ?? row?.amount ?? row?.sales ?? row?.total ?? row?.averageSpend ?? row?.count ?? 0) || 0,
          count: Number(row?.count ?? row?.quantity ?? row?.transactions ?? row?.value ?? 0) || 0,
        }))
      }

      if (input && typeof input === "object") {
        return Object.entries(input).map(([label, rawValue]) => ({
          [keyName]: label,
          value: Number(rawValue) || 0,
          count: Number(rawValue) || 0,
        }))
      }

      return []
    }

    const isChartOrTable =
      widget.type === WidgetType.BAR_CHART ||
      widget.type === WidgetType.LINE_CHART ||
      widget.type === WidgetType.PIE_CHART ||
      widget.type === WidgetType.TABLE ||
      widget.type === WidgetType.MULTIPLE_SERIES_LINE_CHART

    if (isChartOrTable) {
      const hashSeed = (input: string) => {
        let h = 2166136261
        for (let i = 0; i < input.length; i++) {
          h ^= input.charCodeAt(i)
          h = Math.imul(h, 16777619)
        }
        return h >>> 0
      }
      const mulberry32 = (a: number) => () => {
        let t = (a += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const rngFor = (key: string) =>
        mulberry32(
          hashSeed(
            `pos-widget|${widget.id}|${key}|${format(dateRange.startDate, "yyyy-MM-dd")}|${format(dateRange.endDate, "yyyy-MM-dd")}|${frequency}`,
          ),
        )

      const kpis = analyticsData?.kpis
      const baseFor = (dt: DataType) => {
        switch (dt) {
          case DataType.SALES:
          case DataType.REVENUE:
            return Number(kpis?.totalSales ?? posData?.kpis?.totalSales ?? 0) || 0
          case DataType.POS_TRANSACTIONS:
            return Number(kpis?.totalTransactions ?? posData?.kpis?.totalTransactions ?? 0) || 0
          case DataType.TOTAL_ITEMS:
            return Number(kpis?.totalTransactions ?? posData?.totalOrders ?? 0) || 0
          case DataType.PROFIT:
            return (Number(kpis?.totalSales ?? 0) || 0) * 0.3
          case DataType.PROFIT_MARGIN:
            return 30
          case DataType.STOCK_VALUE:
            return Number(stockAnalyticsData?.kpis?.totalStockValue ?? 0) || 0
          case DataType.LOW_STOCK_ITEMS:
            return Number(stockAnalyticsData?.kpis?.lowStockCount ?? 0) || 0
          default:
            return Number(kpis?.totalSales ?? 0) || 0
        }
      }

      const seriesList = Array.isArray(widget.dataSeries) ? widget.dataSeries.filter((s: any) => s?.visible !== false) : []
      const effectiveSeries =
        seriesList.length > 0
          ? seriesList
          : widget.dataType
            ? [{ dataType: widget.dataType, displayMode: widget.displayMode || "quantity", label: "Series 1", color: themeConfig.brandColors.navy, visible: true }]
            : []

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

      if ((widget as any)?.dataConfigMode === "breakdown" && (widget as any)?.breakdownBy) {
        const dt0 = (effectiveSeries[0]?.dataType || widget.dataType || DataType.SALES) as DataType
        const mode0 = (effectiveSeries[0]?.displayMode || widget.displayMode || "quantity") as any
        const buckets = ["A", "B", "C", "D"].map((k) => ({ key: k, label: k }))
        const labels = widget.type === WidgetType.PIE_CHART ? buckets.map((b) => b.label) : dates
        const datasets =
          widget.type === WidgetType.PIE_CHART
            ? [
                {
                  label: String(dt0),
                  data: buckets.map((b, idx) => {
                    const r = rngFor(`breakdown-pie|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
                    return Math.max(0, baseFor(dt0) * (0.6 + r() * 0.8) * (0.4 + (idx + 1) / (buckets.length + 2)))
                  }),
                  backgroundColor: buckets.map((_b, i) => widget.colors?.series?.[i] || themeConfig.brandColors.navy),
                },
              ]
            : buckets.map((b, idx) => {
                const r = rngFor(`breakdown|${String((widget as any).breakdownBy)}|${b.key}|${String(dt0)}`)
                const base = baseFor(dt0)
                return {
                  label: b.label,
                  data: dates.map((_d, i) => {
                    const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, dates.length - 1)) * Math.PI * 2)
                    const jitter = 0.88 + r() * 0.24
                    return Math.max(0, base * wave * jitter * (0.4 + (idx + 1) / (buckets.length + 2)))
                  }),
                  borderColor: widget.colors?.series?.[idx] || themeConfig.brandColors.navy,
                  backgroundColor: widget.colors?.series?.[idx] || themeConfig.brandColors.navy,
                }
              })

        const baseValue = baseFor(dt0)
        return {
          [dt0]: { price: baseValue, quantity: baseValue, percentage: baseValue, score: baseValue, value: baseValue, options: {} },
          breakdownChartData: { labels, datasets },
          breakdownMeta: { displayMode: mode0 },
        }
      }

      const history = dates.map((date, i) => {
        const row: any = { date }
        for (const s of effectiveSeries) {
          const dt = s.dataType as DataType
          const optKey = typeof s.dataOption === "string" ? s.dataOption : undefined
          const r = rngFor(`series|${String(dt)}|${String(optKey || "base")}`)
          const base = baseFor(dt)
          const wave = 0.92 + 0.16 * Math.sin((i / Math.max(1, dates.length - 1)) * Math.PI * 2)
          const jitter = 0.88 + r() * 0.24
          const v = base * wave * jitter
          row[dt] = row[dt] || { price: 0, quantity: 0, percentage: 0, score: 0, options: {} }
          const bucket = { price: v, quantity: v, percentage: v, score: v }
          if (optKey) {
            row[dt].options[optKey] = bucket
            if (!row[dt].price && !row[dt].quantity && !row[dt].percentage && !row[dt].score) Object.assign(row[dt], bucket)
          } else {
            Object.assign(row[dt], bucket)
          }
        }
        return row
      })

      return { history }
    }

    // Fallback to POS Context data if Analytics Context is not available or empty
    if (!analyticsData || Object.keys(analyticsData).length === 0 || !analyticsData.kpis) {
      return getPOSContextData(widget, dataType)
    }

    // For dashboard cards and stats, provide the specific value from analytics
    if (widget.type === WidgetType.CARD || widget.type === WidgetType.DASHBOARD_CARD || widget.type === WidgetType.STAT) {
      switch (dataType) {
        case DataType.TOTAL_ITEMS:
          return buildTypedMetric(DataType.TOTAL_ITEMS, Number(analyticsData.kpis?.totalTransactions || 0), "quantity", {
            totalItems: analyticsData.kpis?.totalTransactions || 0,
            history: analyticsData.salesByDay || [],
          })
        case DataType.POS_TRANSACTIONS:
          return buildTypedMetric(DataType.POS_TRANSACTIONS, Number(analyticsData.kpis?.totalTransactions || 0), "quantity", {
            totalTransactions: analyticsData.kpis?.totalTransactions || 0,
            history: analyticsData.salesByDay || [],
          })
        case DataType.PROFIT_MARGIN:
          return buildTypedMetric(DataType.PROFIT_MARGIN, 30, "percentage", {
            profitMargin: 30, // Default margin
            history: analyticsData.salesByDay || [],
          })
        case DataType.INVENTORY_VALUE: // Using this for Revenue
          return buildTypedMetric(DataType.INVENTORY_VALUE, Number(analyticsData.kpis?.totalSales || 0), "price", {
            inventoryValue: analyticsData.kpis?.totalSales || 0,
            totalValue: analyticsData.kpis?.totalSales || 0,
            history: analyticsData.salesByDay || [],
          })
        case DataType.STOCK_VALUE:
          return buildTypedMetric(DataType.STOCK_VALUE, Number(stockAnalyticsData?.kpis?.totalStockValue || 0), "price", {
            totalValue: stockAnalyticsData?.kpis?.totalStockValue || 0,
            inventoryValue: stockAnalyticsData?.kpis?.totalStockValue || 0,
            history: stockAnalyticsData?.stockTrends || [],
          })
        case DataType.LOW_STOCK_ITEMS:
          return buildTypedMetric(DataType.LOW_STOCK_ITEMS, Number(stockAnalyticsData?.kpis?.lowStockCount || 0), "quantity", {
            lowStockItems: stockAnalyticsData?.kpis?.lowStockCount || 0,
            data: stockAnalyticsData?.lowStockItems || [],
          })
        case DataType.SALES:
          return (() => {
            const kpis = analyticsData.kpis || {}
            const gross = Number(kpis.grossTakings ?? kpis.totalSales ?? 0) || 0
            const net = Number(kpis.netTakings ?? gross) || 0
            const historyBase = Array.isArray(analyticsData.salesByDay) ? analyticsData.salesByDay : []
            const ratio = gross > 0 ? net / gross : 1
            const history = historyBase.map((p: any) => {
              const gp = Number(p?.sales?.price ?? p?.total ?? p?.amount ?? 0) || 0
              const np = gp * ratio
              return {
                ...p,
                sales: {
                  ...(p?.sales || {}),
                  options: {
                    gross: { price: gp, quantity: p?.sales?.quantity ?? 0 },
                    net: { price: np, quantity: p?.sales?.quantity ?? 0 },
                  },
                },
              }
            })
            return {
              totalValue: gross, // legacy consumers
              sales: {
                price: gross,
                quantity: gross,
                options: {
                  gross: { price: gross, quantity: gross },
                  net: { price: net, quantity: net },
                },
              },
              history,
            }
          })()
        case DataType.PROFIT:
          return buildTypedMetric(DataType.PROFIT, safeAnalyticsProfit, "price", {
            totalProfit: safeAnalyticsProfit,
            history: analyticsData.salesByDay || [],
          })
      }
    }

    // For charts, provide the appropriate analytics data (POS + Stock)
    switch (dataType) {
      case DataType.SALES:
      case DataType.SALES_BY_DAY:
      case DataType.SALES_BY_HOUR:
        return { history: analyticsData.salesByDay || analyticsData.salesByHour || [] }
      case DataType.CATEGORIES:
        return { data: normalizeCategoricalRows((analyticsData as any).categoryBreakdown || [], "category") }
      case DataType.PAYMENT_METHOD_BREAKDOWN:
        return { data: normalizeCategoricalRows(analyticsData.paymentMethodBreakdown || {}, "name") }
      case DataType.CUSTOMER_ANALYTICS:
        return { data: normalizeCategoricalRows(analyticsData.customerAnalytics || [], "name") }
      
      // Stock data types (cross-module access)
      case DataType.STOCK_COUNT:
        return { history: stockAnalyticsData?.stockTrends || [] }
      case DataType.STOCK_VALUE:
        return { 
          totalValue: stockAnalyticsData?.kpis?.totalStockValue || 0,
          history: stockAnalyticsData?.stockTrends || [] 
        }
      case DataType.LOW_STOCK_ITEMS:
        return { 
          lowStockItems: stockAnalyticsData?.kpis?.lowStockCount || 0,
          data: stockAnalyticsData?.lowStockItems || [] 
        }
      case DataType.STOCK_BY_CATEGORY:
        return { data: normalizeCategoricalRows(stockAnalyticsData?.stockByCategory || [], "category") }
      case DataType.STOCK_BY_SUPPLIER:
        return { data: normalizeCategoricalRows(stockAnalyticsData?.stockBySupplier || [], "supplier") }
      case DataType.TOP_SELLING_ITEMS:
        return { data: normalizeCategoricalRows(stockAnalyticsData?.topSellingItems || [], "name") }
      case DataType.PURCHASE_HISTORY:
        return { history: stockAnalyticsData?.purchaseHistory || [] }
      case DataType.STOCK_TRENDS:
        return { history: stockAnalyticsData?.stockTrends || [] }
      
      default:
        return { history: analyticsData.salesByDay || [] }
    }
  }

  // Show message if no company selected
  if (!companyState.companyID) {
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
          POS Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Please select a company to view POS data.
        </Typography>
      </Box>
    )
  }

  // Show message if no tabs are visible due to permissions
  if (visibleTabs.length === 0) {
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
          You don't have permission to access any POS features. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  // Dashboard content to be collapsed with tabs
  const dashboardContent = (
    <Box sx={{ width: "100%" }}>
      <DashboardHeader
        title="Sales Dashboard"
        subtitle="Sales Dashboard"
        canEdit={hasPermission("pos", "dashboard", "edit")}
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
            permission: hasPermission("pos", "dashboard", "edit"),
          },
          {
            label: "Menu Item",
            onClick: () => navigate("/POS/Items"),
            permission: hasPermission("pos", "items", "edit"),
          },
          {
            label: "Order",
            onClick: () => navigate("/POS/ItemSales"),
            permission: hasPermission("pos", "orders", "edit"),
          },
          {
            label: "Till Screen",
            onClick: () => navigate("/POS/TillScreens"),
            permission: hasPermission("pos", "tillscreens", "edit"),
          },
          {
            label: "Payment Type",
            onClick: () => navigate("/POS/Management/Payments"),
            permission: hasPermission("pos", "payments", "edit"),
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
        {dashboardState.widgets.map((widget) => (
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
                data={getWidgetData(widget)}
                onSettingsOpen={handleOpenWidgetSettings}
                isEditing={isEditing}
              />
            </Box>
          </Rnd>
        ))}
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
              onTabIntent={(index) => visibleTabs[index]?.preload?.()}
              isExpanded={isTabsExpanded}
              onToggleExpanded={toggleTabsExpanded}
              dashboardContent={dashboardContent}
            />

          <Box sx={{ width: "100%", minHeight: 0, pt: 2, pb: 0 }}>
            {visibleTabs[activeTab] && (
              typeof visibleTabs[activeTab].component === 'function' 
                ? visibleTabs[activeTab].component() 
                : visibleTabs[activeTab].component
            )}
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
        availableDataTypes={getPOSDataTypes(getAvailableDataTypes)}
        cardDataTypes={getPOSCardDataTypes() as any}
        seriesDataTypes={getPOSDataTypes(getAvailableDataTypes)}
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

// Wrap the component with POSProvider
const POS = () => {
  return (
    <POSProvider>
      <POSDashboard />
    </POSProvider>
  )
}

export default POS
