export enum WidgetType {
  // Basic widgets
  // Unified "Card" widget (replaces legacy STAT + DASHBOARD_CARD)
  CARD = "card",
  // Legacy (kept for backward compatibility with saved layouts)
  STAT = "stat",
  KPI_CARD = "kpiCard",
  DASHBOARD_CARD = "dashboardCard",
  
  // Chart widgets
  BAR_CHART = "barChart",
  LINE_CHART = "lineChart",
  PIE_CHART = "pieChart",
  DONUT_CHART = "donutChart",
  AREA_CHART = "areaChart",
  SCATTER_CHART = "scatterChart",
  BUBBLE_CHART = "bubbleChart",
  RADAR_CHART = "radarChart",
  HEATMAP = "heatmap",
  GAUGE = "gauge",
  FUNNEL_CHART = "funnelChart",
  WATERFALL_CHART = "waterfallChart",
  CANDLESTICK_CHART = "candlestickChart",
  
  // Multi-series charts
  MULTIPLE_SERIES_LINE_CHART = "multipleSeriesLineChart",
  MULTIPLE_SERIES_BAR_CHART = "multipleSeriesBarChart",
  STACKED_BAR_CHART = "stackedBarChart",
  STACKED_AREA_CHART = "stackedAreaChart",
  
  // Data display widgets
  TABLE = "table",
  DATA_GRID = "dataGrid",
  METRIC_LIST = "metricList",
  PROGRESS_BAR = "progressBar",
  TREND_INDICATOR = "trendIndicator",
  
  // Interactive widgets
  FILTER_WIDGET = "filterWidget",
  DATE_PICKER_WIDGET = "datePickerWidget",
  SEARCH_WIDGET = "searchWidget",
  
  // Tool widgets
  CALCULATOR = "calculator",
  
  // Specialized widgets
  CALENDAR_HEATMAP = "calendarHeatmap",
  GEOGRAPHIC_MAP = "geographicMap",
  TREE_MAP = "treeMap",
  SANKEY_DIAGRAM = "sankeyDiagram",
  NETWORK_DIAGRAM = "networkDiagram",
  
  // Layout widgets
  TABS_WIDGET = "tabsWidget",
  ACCORDION_WIDGET = "accordionWidget",
  CAROUSEL_WIDGET = "carouselWidget",
  
  // Legacy
  CHART = "chart",
}

export interface WidgetColors {
  background: string
  border: string
  text: string
  title?: string
  series: string[]
}

export interface DataSeries {
  dataType: DataType
  // Some metrics have sub-values (e.g. Gross/Net, Value/%). This selects which sub-value to use.
  dataOption?: string
  displayMode: "price" | "quantity" | "percentage" | "score"
  color: string
  visible: boolean
  label?: string
}

export interface WidgetSettings {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minW: number
  minH: number
  type: WidgetType
  dataType?: DataType
  displayMode?: "price" | "quantity" | "percentage" | "score"
  displayType?: "stat" | "dashboard" | "bar" | "line" | "pie"
  // Legacy `type: "chart"` widgets may still use this; UI should only offer bar/line/pie.
  chartType?: "bar" | "line" | "pie" | "area"
  // Determines whether a chart/table is configured with explicit series, or a breakdown dimension.
  dataConfigMode?: "series" | "breakdown"
  // Module-specific breakdown key (used when dataConfigMode === "breakdown")
  breakdownBy?:
    | "salesDivision"
    | "category"
    | "subcategory"
    | "course"
    | "supplier"
    | "location"
    | "device"
    | "paymentType"
    | "table"
    | "bookingType"
    | "status"
    | "tracking"
    | "tag"
    | "role"
    | "department"
    | "employmentType"
    | "payType"
    | "account"
    | "contact"
    | "type"
  dataSeries: DataSeries[]
  colors: WidgetColors
  // Optional icon for Card widgets (Iconify icon name, e.g. "mdi:cash-register")
  icon?: string
  // Optional finance card comparison target for showing variance in the card header.
  cardComparisonTarget?: "none" | "budget" | "forecast"
  gridX?: number
  gridY?: number
  gridWidth?: number
  gridHeight?: number
  visible?: boolean
   w?: number
  h?: number
  config?: {
    colors?: {
      background?: string
      border?: string
      text?: string
    }
  }
}

// Add Widget interface for POS component
export interface Widget {
  id: string
  title: string
  type: WidgetType
  x?: number
  y?: number
  w?: number
  h?: number
  dataType?: DataType
  config?: {
    colors?: {
      background?: string
      border?: string
      text?: string
    }
  }
}

export interface DashboardState {
  widgets: WidgetSettings[]
}

export interface WidgetContextMenuProps {
  open: boolean
  position: { x: number; y: number }
  onClose: () => void
  widgetId: string
  onSettingsOpen: (widgetId: string) => void
  onRemove: () => void
  onDuplicate?: () => void
}

export interface WidgetSettingsDialogProps {
  open: boolean
  onClose: () => void
  widget: WidgetSettings | null
  onSave: (updatedSettings: WidgetSettings) => void
  availableDataTypes: { value: string; label: string }[]
  // Optional: allow the caller to provide curated pools for cards vs chart series.
  cardDataTypes?: { value: string; label: string }[]
  seriesDataTypes?: { value: string; label: string }[]
  mode?: "create" | "edit"
}

export interface DynamicWidgetProps {
  widget: WidgetSettings
  data: any
  onSettingsOpen?: (widgetId: string) => void
  isEditing?: boolean
  startDate?: Date
  endDate?: Date
  frequency?: string
}

export interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  isCurrency?: boolean
  format?: (val: number) => string // ✅ Add this
}

export interface DashboardCardProps {
  title: string
  value: string | number
  icon: string
  change?: number
  changeLabel?: string
  color?: string
  onClick?: () => void
}

// Helper function to convert widget settings to a format expected by components
export function convertWidgetSettingsToWidget(settings: WidgetSettings): Widget {
  return {
    id: settings.id,
    title: settings.title,
    type: settings.type,
    x: settings.gridX,
    y: settings.gridY,
    w: settings.gridWidth,
    h: settings.gridHeight,
    dataType: settings.dataType,
    config: {
      colors: {
        background: settings.colors.background,
        border: settings.colors.border,
        text: settings.colors.text,
      },
    },
  }
}

export enum DataType {
  // Stock Analytics
  STOCK_COUNT = "stockCount",
  STOCK_VALUE = "stockValue",
  PREVIOUS_STOCK_VALUE = "previousStockValue",
  PREDICTED_STOCK_VALUE = "predictedStockValue",
  STOCK_QUANTITY = "stockQuantity",
  PURCHASES = "purchases",
  SALES = "sales",
  PREDICTED_STOCK = "predictedStock",
  COST_OF_SALES = "costOfSales",
  PROFIT = "profit",
  PAR_LEVELS = "parLevels",
  STOCK_TURNOVER = "stockTurnover",
  TOP_ITEMS = "topItems",
  TOTAL_ITEMS = "totalItems",
  PROFIT_MARGIN = "profitMargin",
  LOW_STOCK_ITEMS = "lowStockItems",
  NEW_STOCK_ITEMS = "newStockItems",
  NO_STOCK_ITEMS = "noStockItems",
  WASTAGE = "wastage",
  INVENTORY_VALUE = "inventoryValue",
  STOCK_REORDER = "stockReorder",
  STOCK_PROFIT = "stockProfit",
  CATEGORIES = "categories",
  SUPPLIERS = "suppliers",
  LOCATIONS = "locations",
  STOCK_ACCURACY = "stockAccuracy",
  EXPIRED_ITEMS = "expiredItems",
  STOCK_BY_CATEGORY = "stockByCategory",
  STOCK_BY_SUPPLIER = "stockBySupplier",
  STOCK_BY_LOCATION = "stockByLocation",
  STOCK_TRENDS = "stockTrends",
  PURCHASE_HISTORY = "purchaseHistory",
  SALES_HISTORY = "salesHistory",
  STOCK_COUNTS_HISTORY = "stockCountsHistory",
  PAR_LEVEL_STATUS = "parLevelStatus",
  PROFIT_ANALYSIS = "profitAnalysis",

  // HR Analytics
  ATTENDANCE = "attendance",
  PERFORMANCE = "performance",
  TURNOVER = "turnover",
  RECRUITMENT = "recruitment",
  TRAINING = "training",
  PAYROLL = "payroll",
  DEPARTMENTS = "departments",
  EMPLOYEES_BY_DEPARTMENT = "employeesByDepartment",
  ATTENDANCE_TRENDS = "attendanceTrends",
  PERFORMANCE_METRICS = "performanceMetrics",
  TRAINING_PROGRESS = "trainingProgress",
  PAYROLL_BREAKDOWN = "payrollBreakdown",
  TIME_OFF_REQUESTS = "timeOffRequests",
  RECRUITMENT_FUNNEL = "recruitmentFunnel",
  TURNOVER_ANALYSIS = "turnoverAnalysis",

  // Finance Analytics
  CASH_BALANCE = "cashBalance",
  REVENUE = "revenue",
  EXPENSES = "expenses",
  CASH_FLOW = "cashFlow",
  OUTSTANDING_INVOICES = "outstandingInvoices",
  BUDGET_VARIANCE = "budgetVariance",
  CASH_FLOW_ANALYSIS = "cashFlowAnalysis",
  REVENUE_BY_CUSTOMER = "revenueByCustomer",
  EXPENSE_BREAKDOWN = "expenseBreakdown",
  BUDGET_PERFORMANCE = "budgetPerformance",
  REVENUE_BY_SOURCE = "revenueBySource",
  EXPENSES_BY_CATEGORY = "expensesByCategory",
  PROFIT_LOSS_TRENDS = "profitLossTrends",
  BUDGET_VS_ACTUAL = "budgetVsActual",
  INVOICE_ANALYSIS = "invoiceAnalysis",
  PAYMENT_TRENDS = "paymentTrends",
  FINANCIAL_RATIOS = "financialRatios",
  TAX_ANALYSIS = "taxAnalysis",
  ACCOUNTS_RECEIVABLE = "accountsReceivable",
  ACCOUNTS_PAYABLE = "accountsPayable",

  // POS Analytics
  POS_SALES = "posSales",
  POS_TRANSACTIONS = "posTransactions",
  TOTAL_TRANSACTIONS = "totalTransactions",
  DAILY_SALES = "dailySales",
  HOURLY_SALES = "hourlySales",
  SALES_BY_DAY = "salesByDay",
  SALES_BY_HOUR = "salesByHour",
  SALES_BY_WEEKDAY = "salesByWeekday",
  PAYMENT_METHODS = "paymentMethods",
  PAYMENT_METHOD_BREAKDOWN = "paymentMethodBreakdown",
  TOP_SELLING_ITEMS = "topSellingItems",
  CUSTOMER_ANALYTICS = "customerAnalytics",
  DISCOUNT_ANALYSIS = "discountAnalysis",
  REFUND_ANALYSIS = "refundAnalysis",
  PEAK_TIMES = "peakTimes",
  TABLE_UTILIZATION = "tableUtilization",

  // Bookings Analytics
  TOTAL_BOOKINGS = "totalBookings",
  BOOKINGS_BY_DAY = "bookingsByDay",
  BOOKINGS_BY_HOUR = "bookingsByHour",
  BOOKINGS_BY_SOURCE = "bookingsBySource",
  BOOKINGS_BY_PARTY_SIZE = "bookingsByPartySize",
  CUSTOMER_SEGMENTS = "customerSegments",
  SEASONAL_TRENDS = "seasonalTrends",
  CANCELLATION_ANALYSIS = "cancellationAnalysis",
  WAITLIST_ANALYTICS = "waitlistAnalytics",
  OCCUPANCY_RATE = "occupancyRate",
  BOOKINGS_BY_STATUS = "bookingsByStatus",
  BOOKINGS_BY_TYPE = "bookingsByType",
  TABLE_OCCUPANCY = "tableOccupancy",
  BOOKING_TRENDS = "bookingTrends",
  NO_SHOW_ANALYSIS = "noShowAnalysis",

  // Company Analytics
  TOTAL_SITES = "totalSites",
  CHECKLIST_STATS = "checklistStats",
  SITE_PERFORMANCE = "sitePerformance",
  NOTIFICATIONS_BREAKDOWN = "notificationsBreakdown",
  COMPANY_METRICS = "companyMetrics",

  // Messenger Analytics
  MESSENGER_CHATS = "messengerChats",
  MESSENGER_ACTIVITY = "messengerActivity",
  RESPONSE_TIMES = "responseTimes",
  MESSAGE_VOLUME = "messageVolume",

  // Cross-module Analytics
  BUSINESS_OVERVIEW = "businessOverview",
  PERFORMANCE_DASHBOARD = "performanceDashboard",
  OPERATIONAL_METRICS = "operationalMetrics",
  FINANCIAL_HEALTH = "financialHealth",

  // Supply Analytics
  SUPPLY_CLIENTS = "supplyClients",
  SUPPLY_ORDERS = "supplyOrders",
  SUPPLY_DELIVERIES = "supplyDeliveries",
  SUPPLY_ORDERS_DRAFT = "supplyOrdersDraft",
  SUPPLY_DELIVERIES_IN_TRANSIT = "supplyDeliveriesInTransit",
}

export const availableDataTypes = [
  { value: DataType.STOCK_COUNT, label: "Stock Count" },
  { value: DataType.STOCK_VALUE, label: "Stock Value" },
  { value: DataType.STOCK_QUANTITY, label: "Stock Quantity" },
  { value: DataType.PURCHASES, label: "Purchases" },
  { value: DataType.SALES, label: "Sales" },
  { value: DataType.PREDICTED_STOCK, label: "Predicted Stock" },
  { value: DataType.COST_OF_SALES, label: "Cost of Sales" },
  { value: DataType.PROFIT, label: "Profit" },
  { value: DataType.PAR_LEVELS, label: "Par Levels" },
  { value: DataType.STOCK_TURNOVER, label: "Stock Turnover" },
  { value: DataType.TOP_ITEMS, label: "Top Items" },
  { value: DataType.TOTAL_ITEMS, label: "Total Items" },
  { value: DataType.PROFIT_MARGIN, label: "Profit Margin" },
  { value: DataType.LOW_STOCK_ITEMS, label: "Low Stock Items" },
  { value: DataType.INVENTORY_VALUE, label: "Inventory Value" },
  { value: DataType.STOCK_REORDER, label: "Stock Reorder" },
  { value: DataType.STOCK_PROFIT, label: "Stock Profit" },
  { value: DataType.CATEGORIES, label: "Categories" },
  { value: DataType.ATTENDANCE, label: "Attendance" },
  { value: DataType.PERFORMANCE, label: "Performance" },
  { value: DataType.TURNOVER, label: "Turnover" },
  { value: DataType.RECRUITMENT, label: "Recruitment" },
  { value: DataType.TRAINING, label: "Training" },
  { value: DataType.PAYROLL, label: "Payroll" },
  { value: DataType.DEPARTMENTS, label: "Departments" },
  { value: DataType.SUPPLY_CLIENTS, label: "Supply Clients" },
  { value: DataType.SUPPLY_ORDERS, label: "Supply Orders" },
  { value: DataType.SUPPLY_DELIVERIES, label: "Supply Deliveries" },
]
