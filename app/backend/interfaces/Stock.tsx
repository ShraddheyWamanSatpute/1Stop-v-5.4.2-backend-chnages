export type CategoryKind = "SaleDivision" | "Category" | "Subcategory"

export interface CategoryType {
  id: string
  name: string
  description?: string
  kind: CategoryKind
  salesDivisionId?: string
  parentCategoryId?: string
  active: boolean
  color?: string
  createdAt: number
  updatedAt: number
}

export interface Item {
  itemID: string
  name: string
  quantity: number
}

export interface OrderItem {
  productId: string
  quantity: number
  measureId: string
}

export interface Product {
  id: string
  name: string
  type: string
  categoryId: string
  subcategoryId: string
  salesDivisionId: string
  categoryName?: string  // Add categoryName
  subcategoryName?: string  // Add subcategoryName for consistency
  salesDivisionName?: string  // Add salesDivisionName for consistency
  createdAt?: string | Date  // Add createdAt for MenuManagement.tsx
  updatedAt?: string | Date  // Add updatedAt for MenuManagement.tsx
  quantity?: number  // Add quantity for analytics
  parLevel?: number  // Add parLevel for analytics
  // Extended properties for form compatibility
  sku?: string
  category?: string  // Display name for category
  subCategory?: string  // Display name for subcategory
  salesDivision?: string  // Display name for sales division
  salesMeasure?: string
  purchaseMeasure?: string
  baseUnit?: string
  quantityOfBaseUnits?: number
  costPerBaseUnit?: number
  profitPerBaseUnit?: number
  profitForSalesMeasure?: number
  profitMargin?: number
  active?: boolean
  featured?: boolean
  purchase?: {
    price: number
    measure: string
    quantity: number
    supplierId: string
    units: {
      measure: string
      price: number
      supplierId?: string
      quantity?: number
      refCode?: string
      // Optional fields used in StockItemForm for linking recipes
      useDefaultRecipe?: boolean
      recipeFactor?: number
      taxPercent?: number
    }[]
    // defaultSupplier may be unset when no supplier is specified yet
    defaultSupplier?: string
    defaultMeasure: string
    taxPercent?: number
  }
  sale?: {
    price: number
    measure: string
    quantity: number
    supplierId: string
    units: {
      measure: string
      price: number
      supplierId?: string
      quantity?: number
      // Recipe per sales unit - each unit can have its own ingredients list
      recipe?: {
        ingredients: Array<{
          type: string
          itemId: string
          measure: string
          quantity: number
        }>
        instructions?: string
        prepTime?: number
        cookTime?: number
        servings?: number
        difficulty?: string
      }
      // Legacy fields for backward compatibility
      useDefaultRecipe?: boolean
      recipeFactor?: number
    }[]
    // defaultSupplier may be unset if sales are not tied to a supplier
    defaultSupplier?: string
    defaultMeasure: string
    taxPercent?: number
  }
  finalMeasure?: string
  yield?: number
  salesPrice: number
  purchasePrice: number
  image?: string
  description?: string
  predictedStock: number
  course?: string
  taxPercent?: number
  taxAmount?: number
  // Properties referenced in frontend components
  price?: number
  measureId?: string
  salesTaxPercent?: number
  ingredients?: any[]
  // Additional properties used in StockItemForm and EditStockItem
  supplierId?: string
  amount?: number
  useDefaultRecipe?: boolean
  recipeFactor?: number
  // Properties used in Stock.tsx functions but missing from interface
  currentStock?: number
  currentStockValue?: number
  currentStockValuePerUnit?: number
  averageDailySales?: number
  daysRemaining?: number
  salesLast7Days?: number
  salesLast30Days?: number
  salesLast90Days?: number
  purchasesLast7Days?: number
  purchasesLast30Days?: number
  purchasesLast90Days?: number
  barcode?: string
  purchaseSupplier?: string
  status?: string
  lowStockLevel?: number
  purchaseBaseQuantity?: number
  purchaseBaseUnit?: string
  salesBaseQuantity?: number
  salesBaseUnit?: string
  recipe?: {
    items: any[]
    instructions?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    difficulty?: string
  }
  stockTracking?: {
    enabled: boolean
    currentStock: number
    minStock: number
    maxStock: number
    reorderPoint: number
    reorderQuantity: number
  }
}

// ProductRow interface is defined later in the file

export interface Purchase {
  id?: string
  supplierId?: string
  supplier?: string
  supplierName?: string
  orderDate?: string
  dateUK?: string
  deliveryDate?: string
  status?: "Awaiting Submission" | "Awaiting Approval" | "Approved"
  totalAmount?: number
  totalValue?: number
  invoiceNumber?: string
  items: PurchaseItem[]
  // Legacy fields for compatibility
  createdAt?: string
  updatedAt?: string
  timeUK?: string
  totalTax?: number
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
  // Extended properties for form compatibility
  reference?: string
  subtotal?: number
  tax?: number
  total?: number
}

// PurchaseOrder interface for compatibility with Stock functions
export interface PurchaseOrder {
  id: string
  supplierId: string
  items: PurchaseItem[]
  totalAmount: number
  status: "Awaiting Submission" | "Awaiting Approval" | "Approved"
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  supplier?: string
  invoiceNumber?: string
  dateUK?: string
  totalTax?: number
}

export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  // Legacy fields for compatibility - required for existing components
  itemID?: string
  name?: string
  measureId?: string
  supplierId?: string
  measureName?: string
  taxPercent?: number
  priceExcludingVAT?: number
  taxAmount?: number
  salesDivisionId?: string
  categoryId?: string
  subcategoryId?: string
  type?: string
}

export interface Site {
  id: string
  siteID: string
  siteName: string
  name: string
  address?: string
}

// Enhanced Measure interface to match form expectations
export interface Measure {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
  // Extended properties for form compatibility
  abbreviation?: string
  description?: string
  type?: string
  baseUnit?: string
  conversionFactor?: number
  active?: boolean
  isDefault?: boolean
}


export interface StockCount {
  id?: string
  date: string
  dateUK: string
  timeUK?: string
  status: "Awaiting Submission" | "Awaiting Approval" | "Approved"
  countedBy?: string
  presetName?: string
  items: StockCountItem[]
  totalValue?: number
  itemCount?: number
  varianceValue?: number
  createdAt?: string
  updatedAt?: string
  // Extended properties for form compatibility
  name?: string
  reference?: string
  description?: string
  countType?: "full" | "partial" | "cycle" | "spot"
  location?: string
  notes?: string
  // Location-based structure for multi-location stock counts
  locations?: Record<string, {
    items: StockCountItem[]
    totalValue?: number
    itemCount?: number
    varianceValue?: number
  }>
}

export interface StockCountItem {
  id: string
  name: string
  measureId: string
  unitName: string
  countedQuantity: number
  countedTotal: number
  // Location-specific totals
  locationTotals?: Record<string, number>
  // Extended properties for form compatibility
  productId?: string
  productName?: string
  systemQuantity?: number
  previousQuantity: number
  salesDivisionId: string
  categoryId: string
  subcategoryId: string
  type: string
}

// =======================
// Stock Transfers
// =======================

export type StockTransferType = "sent" | "received"

export interface StockTransferItem {
  productId: string
  productName: string
  measureId: string
  unitName: string
  quantity: number
}

export interface StockTransfer {
  id?: string
  // Shared id across both sites (sent + received) for correlation
  groupId?: string
  date: string
  dateUK: string
  timeUK?: string
  status: "Awaiting Submission" | "Awaiting Approval" | "Approved"
  // Dual-approval: transfer only impacts stock when BOTH are true
  approvedBySource?: boolean
  approvedByDestination?: boolean
  sourceApprovedAt?: string
  destinationApprovedAt?: string
  reference?: string
  description?: string
  notes?: string
  transferType: StockTransferType
  fromSiteId?: string
  fromSubsiteId?: string
  toSiteId?: string
  toSubsiteId?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  stockAdjustedAt?: string
  stockAdjustedBy?: string
  items: StockTransferItem[]
}

export interface StockLatestCount {
  baseQuantity: number
  baseUnit: string
  date: string
}

export interface SalesDivision {
  id: string
  name: string
  description?: string
  active?: boolean
}

export interface StockMeasure extends Measure {
  quantity?: number
  unit?: string
}

export interface StockData {
  products: Product[]
  suppliers: Supplier[]
  measures: StockMeasure[]
  salesDivisions: SalesDivision[]
  categories: CategoryType[]
  subcategories: CategoryType[]
  totalProducts?: number
  totalSuppliers?: number
  totalMeasures?: number
}

export interface StockPreset {
  id?: string
  name: string
  items: Array<{
    index: number
    itemID: string
    unitID: string
  }>
}

export interface StockLocation {
  id: string
  name: string
  description?: string
  active: boolean
}

export interface FloorPlan {
  id: string
  name: string
  width: number
  height: number
  isDefault: boolean
  tables: TableElement[]
}

export interface TableElement {
  id: string
  tableId: string
  x: number
  y: number
  width: number
  height: number
  shape: "Round" | "Square" | "Rectangle" | "Diamond" | "Custom"
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  fontSize?: number
}

export interface Table {
  id: string
  name: string
  maxCovers: number
  minCovers: number
  type: "Dining" | "Bar" | "Outdoor" | "Private"
  description?: string
  order: number
  location: string
}

export interface Sale {
  id: string
  productId: string
  productName: string
  quantity: number
  salePrice: number
  measureId: string
  paymentMethod: string
  date: string
  time: string
  billId: string
  terminalId: string
  tradingDate: string
  // Add optional fields that might be used in calculations
  total?: number
  tax?: number
  discount?: number
  // Extended properties for form compatibility
  tableNumber?: string
}

export interface Bill {
  id: string
  items: BillItem[]
  status: "Open" | "Closed"
  total: number
  tableNumber: string
  server: string
  subtotal: number
  tax: number
  serviceCharge: number
  discount: number
  createdAt: number
  updatedAt: number
  paymentMethod?: string
  closedAt?: number
  // Extended properties for form compatibility
  terminalId?: string
}

export interface BillItem {
  id: string
  productId?: string  // Make optional for temporary items
  name: string
  quantity: number
  price: number
  total?: number  // Make optional since it can be calculated
  status?: string
  notes?: string
  image?: string
  category?: string
  type?: string
}

export interface PaymentType {
  id: string
  name: string
  type: "cash" | "card"
  cardConfig?: {
    acceptedCards?: string[]
    processingFee?: number
    terminal?: string
    gateway?: string
    mode?: "manual" | "integrated"
    integrationId?: string
    integrationName?: string
  }
}

export interface Device {
  id: string
  name: string
  type: "Tablet" | "PC" | "Phone" | "Printer" | "Scanner" | "Other"
  connection: "LAN" | "Online"
  location: StockLocation
  status: "Active" | "Inactive" | "Maintenance"
}

export interface Location {
  id: string
  name: string
  description?: string
  active: boolean
  // Extended properties for form compatibility
  type?: string
  isActive?: boolean
}

export interface Correction {
  id: string
  name: string
  type: "void" | "waste" | "edit"
}

export interface TillScreen {
  id: string
  name: string
  layout: any[]
  settings: {
    aspectRatio: string
    canvasWidth: number
    canvasHeight: number
    gridSize: number
    snapToGrid: boolean
    isScrollable: boolean
  }
  isDefault: boolean
  createdAt: string | number
  updatedAt: string | number
}

export interface Discount {
  id: string
  name: string
  type: "percentage" | "fixed"
  value: number
  conditions?: any
  active: boolean
  startDate?: string
  endDate?: string
}

export interface Promotion {
  id: string
  name: string
  description?: string
  type: "buy_x_get_y" | "percentage_off" | "fixed_amount_off"
  conditions: any
  rewards: any
  active: boolean
  startDate: string
  endDate: string
}

export interface StockItem {
  id: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  category: string
  supplier?: string
  costPrice: number
  sellingPrice: number
  currentStock: number
  reorderLevel: number
  maxStock?: number
  unit: string
  trackStock: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id?: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  ref?: string
  orderUrl?: string
  contacts?: Contact[]
  description?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PurchaseOrderItem {
  itemId: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ProductRow {
  id: string
  rawProduct: Product
  name: string
  type: string
  purchasePrice: number
  salesPrice: number
  finalMeasure: string
  yield: number
  purchaseBaseQuantity?: number
  purchaseBaseUnit: string
  salesBaseQuantity?: number
  salesBaseUnit: string
  currentStock: number
  currentStockValue: number
  currentStockValuePerUnit: number
  averageDailySales: number
  daysRemaining: number
  salesLast7Days: number
  salesLast30Days: number
  salesLast90Days: number
  purchasesLast7Days: number
  purchasesLast30Days: number
  purchasesLast90Days: number
  previousCount: number
  previousUnit: string
  totalPurchaseQuantity: number
  totalPurchaseCost: number
  totalSoldQuantity: number
  soldBaseUnit: string
  totalSoldValue: number
  predictedStock: number
  predictedBaseUnit: string
  salesDivision: string
  category: string
  subcategory: string
  purchaseMeasure: string
  purchaseSupplier: string
  salesMeasure: string
  supplier: string
  costPerUnit: number
  profit: number
  profitMargin: number
  status: string
  trend: string
  isLowStock: boolean
  lowStockLevel: number
  barcode: string
  uid?: string
  image?: string
  [key: string]: any
}

// Add missing interfaces referenced in frontend components
export interface Card {
  id: string
  name?: string  // Make optional since some cards are features/controls
  price?: number  // Make optional since some cards are features/controls
  image?: string
  category?: string
  type?: string
  product?: Product
  quantity?: number
  x?: number
  y?: number
  width?: number
  height?: number
  fontSize?: number
  borderWidth?: number
  borderRadius?: number
  content?: string | JSX.Element  // Allow both string and JSX.Element
  cardColor?: string
  fontColor?: string
  borderColor?: string
  zIndex?: number
  text?: string
  data?: any  // For feature cards
  option?: string  // For feature cards
}

export interface NewCorrectionProps {
  onClose: () => void
  onSave?: (correction: Omit<Correction, "id">) => void  // Make optional since not used
  open: boolean
  onAddCorrection: (correction: { name: string; type: "void" | "waste" | "edit" }) => Promise<void>
}

export interface NewDeviceProps {
  onClose: () => void
  onSave: (device: Omit<Device, "id">) => void
  open: boolean
  onAddDevice: (device: Omit<Device, "id">) => Promise<void>
  locations: Location[]
}

export interface NewPaymentTypeProps {
  onClose: () => void
  onSave?: (paymentType: Omit<PaymentType, "id">) => void  // Make optional since not used
  open: boolean
  onAddPayment: (paymentType: { name: string; type: "cash" | "card" }) => Promise<void>
}

// Split ParLevel into base and UI interfaces
export interface BaseParLevel {
  productId: string
  targetQuantity: number
  minimumQuantity: number
  maximumQuantity: number
  measureId: string
  supplierId?: string
  isActive: boolean
  lastUpdated?: string
  updatedBy?: string
}

export interface UIParLevel {
  itemID: string
  itemName: string
  unitID: string
  unitName: string
  parLevel: number
}

export interface ParLevel extends Partial<BaseParLevel>, Partial<UIParLevel> {
  // At least one of productId or itemID must be present
  productId?: string
  itemID?: string
}

export interface PaymentIntegration {
  id: string
  name: string
  type: "square" | "stripe" | "paypal" | "sumup" | "worldpay"
  enabled: boolean
  settings: Record<string, any>
  active?: boolean
  config: {
    apiKey?: string
    secretKey?: string
    merchantId?: string
  }
}

// Ticket Management Interfaces
export interface Ticket {
  id: string
  name: string
  description?: string
  price: number
  isActive: boolean
  qrCode: string
  createdAt: number
  updatedAt: number
}

export interface TicketSale {
  id: string
  ticketId: string
  ticketName: string
  price: number
  quantity: number
  total: number
  qrCode: string
  isRedeemed: boolean
  redeemedAt?: number
  redeemedBy?: string
  paymentMethod: string
  paymentStatus: "pending" | "completed" | "failed"
  createdAt: number
  updatedAt: number
  customerInfo?: {
    name?: string
    email?: string
    phone?: string
  }
}

// Bag and Coat Check Interfaces
export interface BagCheckItem {
  id: string
  itemType: "bag" | "coat" | "other"
  description?: string
  price: number
  qrCode: string
  customerPhone?: string
  customerInitials?: string
  isReturned: boolean
  returnedAt?: number
  returnedBy?: string
  paymentMethod: string
  paymentStatus: "pending" | "completed" | "failed"
  createdAt: number
  updatedAt: number
  notes?: string
}

export interface BagCheckConfig {
  id: string
  bagPrice: number
  coatPrice: number
  otherPrice: number
  requirePhone: boolean
  requireInitials: boolean
  autoGenerateQR: boolean
  isActive: boolean
  updatedAt: string | number
}

export interface ParLevelProfile {
  id?: string
  name: string
  description?: string
  parLevels: {
    [productId: string]:
      | number
      | {
          parLevel: number
          measureId?: string
          lowStockValue?: number
        }
  }
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

// Management Grid Interfaces
export interface Contact {
  name: string
  position?: string
  email: string
  number?: string
  phone?: string // backward-compat
}

// Supplier interface consolidated above

export interface Course {
  id?: string
  name: string
  description?: string
  displayOrder?: number
  active?: boolean
}


// UI Component Interfaces
export interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export interface HeadCell {
  id: string
  label: string
  numeric: boolean
  sortable: boolean
}

// Duplicate interfaces removed - using the ones at the end of file

export interface FilterGroup {
  id: string
  label: string
  operator?: "AND" | "OR"
  filters: Filter[]
}

export interface Filter {
  id: string
  label: string
  field: string
  operator: string
  value: any
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export type SortDirection = "asc" | "desc"
export type GroupByField = "none" | "type" | "category" | "subcategory" | "salesDivision"

// ParLevel specific interfaces
export interface BackendParLevelProfile {
  id?: string
  name: string
  description?: string
  parLevels: {
    [productId: string]: number | { parLevel: number; measureId: string }
  }
  isDefault?: boolean
  months?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface UIParLevelProfile {
  id?: string
  name: string
  description?: string
  parType?: "Standard" | "Booking" | "Seasonal"
  parLevels: {
    [productId: string]: UIParLevel
  }
  isActive?: boolean
  isDefault?: boolean
  bookingNumber?: string
  months?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ParLevelRow {
  productId: string
  productName: string
  type: string
  category: string
  subcategory: string
  salesDivision: string
  currentStock: number
  averageDailySales: number
  parLevel: number
  daysRemaining: number
  costPerUnit: number
  totalValue: number
  profit: number
  measureId: string
  measureName: string
  status: "OK" | "Low" | "Order Required"
  // Additional properties used by frontend
  predictedStock?: string
  predictedStockValue?: number
  previousCount?: string
  previousCountValue?: number
  purchaseBaseQuantity?: string
  purchaseBaseQuantityValue?: number
  totalPurchaseQuantity?: string
  totalPurchaseQuantityValue?: number
  totalPurchaseCost?: number
  purchaseSupplier?: string
  purchaseMeasure?: string
  salesBaseQuantity?: string
  salesBaseQuantityValue?: number
  totalSoldQuantity?: string
  totalSoldQuantityValue?: number
  totalSoldValue?: number
  salesMeasure?: string
  parLevelMeasureId?: string
  parLevelMeasureName?: string
  parLevelWithUnit?: string
  parLevelBaseQuantity?: string
  parLevelBaseValue?: number
  orderQuantity?: number
  orderQuantityWithUnit?: string
  orderQuantityBaseUnit?: string
  orderQuantityBaseValue?: number
  defaultMeasure?: string
  lowStockValue?: number
  lowStockValueWithUnit?: string
}


// Additional UI Component Interfaces
export interface Column {
  id: string
  label: string
  visible: boolean
  sortable: boolean
  filterable: boolean
  minWidth?: number
  align?: "left" | "right" | "center"
  format?: (value: any, row?: any) => React.ReactNode
}

export interface MeasureOption {
  id: string
  name: string
  price: number
  quantity?: number
  supplierId: string
}

// ParLevel specific interfaces
export interface ParLevelProfileFromDB {
  id?: string
  name: string
  description?: string
  parType?: "Standard" | "Booking" | "Seasonal"
  parLevels: {
    [productId: string]: number | { parLevel: number; measureId: string }
  }
  isActive?: boolean
  isDefault?: boolean
  bookingNumber?: string
  months?: string[]
  createdAt?: string
  updatedAt?: string
}

// Stock Data Grid Props
export interface StockDataGridProps {
  title?: string
  onLoadPreset?: (presetId: string) => void
  onDeletePreset?: (presetId: string) => void
  presets?: any[]
  selectedPreset?: string | null
  onPresetChange?: (presetId: string | null) => void
}

// ===== STOCK CONTEXT INTERFACES =====

// Stock State interface
export interface StockState {
  companyID: string | null
  siteID: string | null
  subsiteID: string | null
  products: Product[]
  suppliers: Supplier[]
  measures: StockMeasure[]
  salesDivisions: SalesDivision[]
  categories: CategoryType[]
  subcategories: CategoryType[]
  subCategories: CategoryType[]  // Alias for backward compatibility
  courses: Course[]
  purchases: Purchase[]
  stockCounts: StockCount[]
  stockTransfers: StockTransfer[]
  stockItems: StockItem[]
  purchaseOrders: PurchaseOrder[]
  parLevels: any[]
  latestCounts: Record<string, StockLatestCount>
  purchaseHistory: any[]
  salesHistory: any[]
  loading: boolean
  error: string | null
  dataVersion: number // Increments on data changes to trigger re-renders
}

// Stock Action types
export type StockAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_COMPANY_ID"; payload: string | null }
  | { type: "SET_SITE_ID"; payload: string | null }
  | { type: "SET_SUBSITE_ID"; payload: string | null }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_SUPPLIERS"; payload: Supplier[] }
  | { type: "SET_MEASURES"; payload: StockMeasure[] }
  | { type: "SET_SALES_DIVISIONS"; payload: SalesDivision[] }
  | { type: "SET_CATEGORIES"; payload: CategoryType[] }
  | { type: "SET_SUBCATEGORIES"; payload: CategoryType[] }
  | { type: "SET_SUB_CATEGORIES"; payload: CategoryType[] }  // Alias for backward compatibility
  | { type: "SET_COURSES"; payload: Course[] }
  | { type: "SET_PURCHASES"; payload: Purchase[] }
  | { type: "SET_STOCK_COUNTS"; payload: StockCount[] }
  | { type: "SET_STOCK_TRANSFERS"; payload: StockTransfer[] }
  | { type: "SET_STOCK_ITEMS"; payload: StockItem[] }
  | { type: "SET_PURCHASE_ORDERS"; payload: PurchaseOrder[] }
  | { type: "SET_LATEST_COUNTS"; payload: Record<string, StockLatestCount> }
  | { type: "SET_PURCHASE_HISTORY"; payload: any[] }
  | { type: "SET_SALES_HISTORY"; payload: any[] }
  | { type: "SET_ALL_DATA"; payload: {
      products?: Product[]
      suppliers?: Supplier[]
      measures?: StockMeasure[]
      salesDivisions?: SalesDivision[]
      categories?: CategoryType[]
      subcategories?: CategoryType[]
      subCategories?: CategoryType[]
      courses?: Course[]
      purchases?: Purchase[]
      stockCounts?: StockCount[]
      stockTransfers?: StockTransfer[]
      stockItems?: StockItem[]
      purchaseOrders?: PurchaseOrder[]
      parLevels?: any[]
      latestCounts?: Record<string, StockLatestCount>
      purchaseHistory?: any[]
      salesHistory?: any[]
    } }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: string }
  | { type: "ADD_SUPPLIER"; payload: Supplier }
  | { type: "UPDATE_SUPPLIER"; payload: Supplier }
  | { type: "DELETE_SUPPLIER"; payload: string }

// Stock Context Type interface
export interface StockContextType {
  state: StockState
  dispatch: React.Dispatch<StockAction>
  // Helper functions
  refreshProducts: () => Promise<void>
  refreshSuppliers: () => Promise<void>
  refreshMeasures: () => Promise<void>
  refreshAll: () => Promise<void>
  getStockData: () => StockData
  // Permission functions
  canViewStock: () => boolean
  canEditStock: () => boolean
  canDeleteStock: () => boolean
  isOwner: () => boolean
  // Base path for stock module (e.g., companies/<id>/sites/<id>/data/stock)
  basePath: string
  // Data operation functions
  // Product operations
  saveProduct: (product: Product, isUpdate?: boolean) => Promise<void>
  fetchProductById: (productId: string) => Promise<Product | null>
  deleteProduct: (productId: string) => Promise<void>
  // Purchase operations
  savePurchase: (purchase: Purchase) => Promise<void>
  fetchAllPurchases: () => Promise<Purchase[]>
  deletePurchase: (purchaseId: string) => Promise<void>
  // Stock Count operations
  saveStockCount: (stockCount: StockCount) => Promise<void>
  fetchAllStockCounts: () => Promise<StockCount[]>
  deleteStockCount: (stockCountId: string) => Promise<void>
  fetchLatestCountsForProducts: () => Promise<Record<string, any>>
  // Stock Transfer operations
  // Saving a transfer mirrors it: source gets type "sent", destination gets type "received"
  saveStockTransferPair: (transfer: StockTransfer) => Promise<void>
  fetchAllStockTransfers: () => Promise<StockTransfer[]>
  deleteStockTransferPair: (transfer: StockTransfer) => Promise<void>
  // Par Level operations
  saveParLevelProfile: (profile: any) => Promise<void>
  fetchParProfiles: () => Promise<any[]>
  deleteParProfile: (profileId: string) => Promise<void>
  // Measure operations
  fetchMeasureData: (measureId: string) => Promise<any>
  // History operations
  fetchSalesHistory: () => Promise<any[]>
  fetchPurchasesHistory: () => Promise<any[]>
  fetchCurrentStock: () => Promise<any[]>
  // Preset operations
  fetchPresetsFromDB: () => Promise<any[]>
  savePresetToDB: (presetData: any) => Promise<void>
  // Course operations
  fetchCourses: () => Promise<any[]>
  saveCourse: (course: any) => Promise<string | undefined>
  updateCourse: (courseId: string, course: any) => Promise<void>
  deleteCourse: (courseId: string) => Promise<void>
  // Supplier operations
  createSupplier: (supplier: any) => Promise<void>
  updateSupplier: (supplierId: string, supplier: any) => Promise<void>
  deleteSupplier: (supplierId: string) => Promise<void>
  fetchSuppliers: () => Promise<any[]>
  // Location operations
  fetchLocations: () => Promise<any[]>
  updateLocation: (locationId: string, location: any) => Promise<void>
  deleteLocation: (locationId: string) => Promise<void>
  // Measure operations
  fetchMeasures: () => Promise<any[]>
  saveMeasure: (measure: any) => Promise<string | undefined>
  updateMeasure: (measureId: string, measure: any) => Promise<void>
  deleteMeasure: (measureId: string) => Promise<void>
  // Utility functions
  getGoogleMapsApiKey: () => string
  parseAddressComponents: (components: any[]) => any
  // Till screen functions
  fetchTillScreen: (screenId: string) => Promise<any>
  saveTillScreenWithId: (screenId: string, screenData: any) => Promise<void>
  fetchStockHistory: () => Promise<any[]>
  // Helper functions
  getParLevelValue: (value: number | { parLevel: number; measureId: string }) => number
  getParLevelMeasureId: (value: number | { parLevel: number; measureId: string }) => string | undefined
  // New CRUD functions
  createCategory?: (categoryData: any) => Promise<string | undefined>
  updateCategory?: (categoryId: string, categoryData: any) => Promise<void>
  deleteCategory?: (categoryId: string) => Promise<void>
  createStockLocation?: (locationData: any) => Promise<string | undefined>
  updateStockLocation?: (locationId: string, locationData: any) => Promise<void>
  deleteStockLocation?: (locationId: string) => Promise<void>
  createParLevel?: (parLevelData: any) => Promise<string | undefined>
  updateParLevel?: (parLevelId: string, parLevelData: any) => Promise<void>
  deleteParLevel?: (parLevelId: string) => Promise<void>
  // Product CRUD functions
  createProduct?: (productData: any) => Promise<string | undefined>
  updateProduct?: (productId: string, productData: any) => Promise<void>

  // =======================
  // Stock Settings (module settings, not /data/stock)
  // =======================
  getStockSettingsPath: () => string | null
  loadStockSettings: () => Promise<any | null>
  saveStockSettings: (settings: Record<string, any>) => Promise<void>

  // Targets under settings/stock/.../targets
  fetchStockTargets: () => Promise<any[]>
  saveStockTarget: (targetId: string, target: Record<string, any>) => Promise<void>
  deleteStockTarget: (targetId: string) => Promise<void>

  // Integrations under settings/stock/integrations/...
  loadStockIntegrations: () => Promise<Record<string, any>>
  saveStockIntegration: (integration: { id: string } & Record<string, any>) => Promise<void>
}

// Stock Provider Props interface
export interface StockProviderProps {
  children: React.ReactNode
}
