// POS-specific interfaces extracted from Stock.tsx and enhanced
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  categoryId?: string
  categoryName?: string
  image?: string
  isActive: boolean
  createdAt: number
  updatedAt?: number
}

export interface Bill {
  id: string
  tableId?: string
  tableName?: string
  tableNumber?: string // Add tableNumber for compatibility
  customerId?: string
  customerName?: string
  items: BillItem[]
  subtotal: number
  tax: number
  total: number
  status: "draft" | "open" | "closed" | "paid" | "cancelled"
  paymentMethod?: string
  paymentStatus: "pending" | "completed" | "failed"
  discountId?: string
  discountName?: string
  terminalId?: string
  discountAmount?: number
  discount?: number // Add discount for compatibility
  promotionId?: string
  promotionName?: string
  promotionAmount?: number
  staffId?: string
  staffName?: string
  server?: string // Add server for compatibility
  deviceId?: string
  deviceName?: string
  locationId?: string
  locationName?: string
  serviceCharge?: number // Add serviceCharge
  notes?: string
  bookingId?: string
  bookingReference?: string
  draftCreatedAt?: number
  openedAt?: number
  createdAt: number
  updatedAt: number
  closedAt?: number
  paidAt?: number
  voidReason?: string
  voidedAt?: number
  voidedById?: string
  voidedByName?: string
}

export interface BillItem {
  id: string
  productId: string
  productName: string
  name?: string // Add name for compatibility
  quantity: number
  unitPrice: number
  totalPrice: number
  price?: number // Add price for compatibility
  total?: number // Add total for compatibility (alias for totalPrice)
  categoryId?: string
  categoryName?: string
  courseId?: string
  courseName?: string
  modifiers?: BillItemModifier[]
  notes?: string
  discountId?: string
  discountName?: string
  discountAmount?: number
  promotionId?: string
  promotionName?: string
  promotionAmount?: number
  serviceChargePercent?: number
  serviceChargeAmount?: number
  status?: "draft" | "saved" | "void" | "refunded"
  draftAt?: number
  savedAt?: number
  taxPercent?: number
  taxAmount?: number
  createdAt: number
}


export interface BillItemModifier {
  id: string
  name: string
  price: number
  quantity: number
}

export interface TillScreen {
  id: string
  name: string
  description?: string
  deviceId?: string
  deviceName?: string
  locationId?: string
  locationName?: string
  layout: TillScreenLayout
  settings?: {
    aspectRatio: string
    canvasWidth: number
    canvasHeight: number
    gridSize: number
    snapToGrid: boolean
    isScrollable: boolean
  }
  isActive: boolean
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface TillScreenLayout {
  width: number
  height: number
  cards: Card[]
  backgroundColor?: string
  gridSize?: number
}

export interface Card {
  id: string
  name?: string
  // Some parts of the app treat cards like numbered assets
  number?: string | number
  price?: number
  image?: string
  categoryId?: string
  categoryName?: string
  productId?: string
  productName?: string
  product?: Product // Add product for compatibility
  // Designers store featureType strings into `type`. Keep this permissive but enumerable.
  type:
    | "product"
    | "item"
    | "category"
    | "function"
    | "modifier"
    | "billWindow"
    | "numpad"
    | "payment"
    | "discount"
    | "promotion"
    | "tablePlan"
    | "group"
    | "serviceCharge"
    | "tax"
    | "systemFunction"
    | "tillFunction"
    | "correction"
    | "sidebar"
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  borderWidth?: number
  borderRadius?: number
  cardColor?: string
  fontColor?: string
  borderColor?: string
  zIndex?: number
  content?: string | React.ReactElement
  data?: any
  option?: string
  text?: string
  isVisible: boolean
  createdAt: number
  updatedAt: number
  // Access restrictions
  restrictedRoles?: string[]
  restrictedDepartments?: string[]
  restrictedEmployees?: string[]
}

export interface PaymentType {
  id: string
  name: string
  type: "cash" | "card" | "digital" | "voucher" | "deposit" | "other"
  isActive: boolean
  requiresAuth: boolean // Make required
  // How to interpret `processingFee`:
  // - "flat": currency amount (e.g., 0.30)
  // - "percent": percentage (e.g., 1.5 means 1.5%)
  // Optional for backward compatibility; defaults to "flat" when missing.
  processingFeeType?: "flat" | "percent"
  processingFee: number // Make required
  integrationId?: string
  integrationName?: string
  cardConfig?: {
    mode: "integrated" | "manual"
    integrationId: string
    integrationName: string
  }
  settings?: Record<string, any>
  displayOrder?: number
  createdAt: number
  updatedAt: number
}

export interface FloorPlan {
  id: string
  name: string
  description?: string
  locationId?: string
  locationName?: string
  layout?: FloorPlanLayout
  width?: number
  height?: number
  tables?: Table[]
  obstacles?: FloorPlanObstacle[]
  isActive: boolean
  isDefault?: boolean
  createdAt: number
  updatedAt: number
}

export interface FloorPlanLayout {
  width: number
  height: number
  tables: Table[]
  obstacles?: FloorPlanObstacle[]
  backgroundColor?: string
  gridSize?: number
}

// Add compatibility properties to FloorPlan interface
export interface FloorPlanWithLayout extends FloorPlan {
  width?: number // Compatibility with layout.width
  height?: number // Compatibility with layout.height
  tables?: Table[] // Compatibility with layout.tables
}

export interface Table {
  id: string
  name: string
  number: number
  seats: number
  x: number
  y: number
  width: number
  height: number
  shape: "rectangle" | "circle" | "square"
  status: "available" | "occupied" | "reserved" | "cleaning"
  serverId?: string
  serverName?: string
  sectionId?: string
  sectionName?: string
  notes?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  // Add compatibility properties
  maxCovers?: number // Compatibility alias for seats
  minCovers?: number // Additional property
  type?: string // Additional property
  description?: string // Additional property
  order?: number // Additional property
  location?: { x: number; y: number } // Additional property
  tableId?: string // For table elements
  // Add styling properties
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  fontSize?: number
}

export interface FloorPlanObstacle {
  id: string
  name: string
  type: "wall" | "pillar" | "bar" | "kitchen" | "entrance" | "other"
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface Discount {
  id: string
  name: string
  // Backwards compatibility: some UIs/logging refer to `discount.code`
  code?: string
  description?: string
  type: "percentage" | "fixed_amount" | "buy_x_get_y"
  value: number
  // If set, the discount value is entered at checkout:
  // - "amount": open amount (currency)
  // - "percent": open percentage
  openValueType?: "amount" | "percent"
  conditions?: DiscountCondition[]
  applicableItems?: string[] // Product IDs
  applicableCategories?: string[] // Category IDs
  minimumAmount?: number
  maximumAmount?: number
  isActive: boolean
  startDate?: string
  endDate?: string
  usageLimit?: number
  usageCount?: number
  requiresAuth?: boolean
  staffId?: string
  staffName?: string
  createdAt: number
  updatedAt: number
}

export interface DiscountCondition {
  type: "minimum_quantity" | "minimum_amount" | "specific_items" | "time_based"
  value: any
  operator?: "equals" | "greater_than" | "less_than" | "between"
}

export interface Promotion {
  id: string
  name: string
  // Backwards compatibility: some UIs/logging refer to `promotion.code`
  code?: string
  description?: string
  type: "buy_x_get_y" | "percentage_off" | "fixed_amount_off" | "combo_deal" | "loyalty" | "time_based" | "bundle"
  conditions: PromotionCondition[]
  rewards: PromotionReward[]
  isActive: boolean
  startDate: string
  endDate: string
  usageLimit?: number
  usageCount?: number
  requiresAuth?: boolean
  priority?: number
  stackable?: boolean
  createdAt: number
  updatedAt: number
}

export interface PromotionCondition {
  type: "buy_quantity" | "buy_amount" | "specific_items" | "category_items" | "time_period"
  productIds?: string[]
  categoryIds?: string[]
  quantity?: number
  amount?: number
  timeStart?: string
  timeEnd?: string
  daysOfWeek?: number[]
}

export interface PromotionReward {
  type: "free_item" | "discount_percentage" | "discount_amount" | "upgrade"
  productIds?: string[]
  categoryIds?: string[]
  quantity?: number
  percentage?: number
  amount?: number
  maxDiscount?: number
}

export interface Correction {
  id: string
  name: string
  type: "void" | "waste" | "edit" | "refund" | "comp"
  description?: string
  billId?: string
  billItemId?: string
  productId?: string
  productName?: string
  originalQuantity?: number
  correctedQuantity?: number
  originalAmount?: number
  correctedAmount?: number
  amount?: number
  reason?: string
  staffId?: string
  staffName?: string
  managerId?: string
  managerName?: string
  requiresAuth: boolean
  isActive: boolean
  status?: "pending" | "approved" | "rejected"
  createdAt: number
  updatedAt?: number
}

export interface BagCheckItem {
  id: string
  // Backwards compatibility: some code refers to `item.name`
  name?: string
  itemType: "bag" | "coat" | "other"
  description?: string
  price: number
  qrCode: string
  customerPhone?: string
  customerInitials?: string
  customerName?: string
  isReturned: boolean
  returnedAt?: number
  returnedBy?: string
  returnedByName?: string
  paymentMethod: string
  paymentStatus: "pending" | "completed" | "failed"
  locationId?: string
  locationName?: string
  staffId?: string
  staffName?: string
  notes?: string
  createdAt: number
  updatedAt: number
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
  locationId?: string
  locationName?: string
  updatedAt: number
  updatedBy?: string
  updatedByName?: string
}

export interface Location {
  id: string
  name: string
  description?: string
  type: "dining_room" | "bar" | "patio" | "private_room" | "takeaway" | "delivery" | "other"
  address?: string
  capacity?: number
  isActive: boolean
  managerId?: string
  managerName?: string
  settings?: LocationSettings
  createdAt: number
  updatedAt: number
}

export interface LocationSettings {
  allowReservations?: boolean
  allowWalkIns?: boolean
  allowTakeaway?: boolean
  allowDelivery?: boolean
  taxRate?: number
  serviceChargeRate?: number
  tipSuggestions?: number[]
  autoGratuity?: {
    enabled: boolean
    threshold: number
    percentage: number
  }
}

export interface Device {
  id: string
  name: string
  type: "pos_terminal" | "pos_hub" | "kitchen_display" | "receipt_printer" | "payment_terminal" | "tablet" | "other"
  model?: string
  serialNumber?: string
  macAddress?: string
  ipAddress?: string
  locationId?: string
  locationName?: string
  tillScreenId?: string
  tillScreenName?: string
  isOnline: boolean
  isActive: boolean
  lastSeen?: number
  settings?: DeviceSettings
  createdAt: number
  updatedAt: number
}

export interface DeviceSettings {
  printReceipts?: boolean
  printKitchenTickets?: boolean
  acceptPayments?: boolean
  allowDiscounts?: boolean
  allowVoids?: boolean
  requireManagerAuth?: boolean
  autoLogout?: number
  theme?: string
  fontSize?: number
}

export interface PaymentIntegration {
  id: string
  name: string
  type: "square" | "stripe" | "paypal" | "sumup" | "worldpay" | "other"
  enabled: boolean
  isActive: boolean
  config: {
    apiKey?: string
    secretKey?: string
    merchantId?: string
    webhookUrl?: string
    testMode?: boolean
  }
  settings: {
    processingFee?: number
    currency?: string
    autoCapture?: boolean
    allowRefunds?: boolean
    allowPartialRefunds?: boolean
  }
  createdAt: number
  updatedAt: number
}

// ==========================================
// Payments (manual now, PDQ later)
// Stored under /data/pos/paymentTransactions
// ==========================================

export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled" | "refunded"

export type PaymentTransactionType = "payment" | "refund"

export interface PaymentTransaction {
  id: string
  billId: string
  transactionType?: PaymentTransactionType // default "payment" when omitted
  amount: number // tender amount applied to the bill (excluding tip unless you include it)
  tipAmount?: number
  method: string // e.g. "Cash", "Card", "Voucher", later PDQ methods
  status: PaymentStatus
  reference?: string // external ref (PDQ auth code, etc.)
  provider?: string // e.g. "dojo"
  providerData?: any // provider-specific details (authCode, masked PAN, entry mode, etc.)
  deviceId?: string
  deviceName?: string
  staffId?: string
  staffName?: string
  createdAt: number
  updatedAt?: number
}

export interface Ticket {
  id: string
  name: string
  description?: string
  price: number
  categoryId?: string
  categoryName?: string
  eventId?: string
  eventName?: string
  validFrom?: string
  validUntil?: string
  qrCode: string
  isActive: boolean
  maxQuantity?: number
  soldQuantity?: number
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
  redeemedByName?: string
  paymentMethod: string
  paymentStatus: "pending" | "completed" | "failed"
  customerId?: string
  customerName?: string
  customerInfo?: {
    name?: string
    email?: string
    phone?: string
  }
  eventId?: string
  eventName?: string
  locationId?: string
  locationName?: string
  createdAt: number
  updatedAt: number
}

// Sale interface for POS transactions
export interface Sale {
  id: string
  billId?: string
  productId: string
  productName: string
  categoryId?: string
  categoryName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discountAmount?: number
  taxAmount?: number
  staffId?: string
  staffName?: string
  customerId?: string
  customerName?: string
  locationId?: string
  locationName?: string
  deviceId?: string
  deviceName?: string
  terminalId?: string
  tableNumber?: string
  paymentMethod?: string
  createdAt: number
}

export interface SaleModifier {
  id: string
  name: string
  price: number
  quantity: number
}

export interface OrderSale {
  id: string
  orderId: string
  billId?: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  salePrice: number // Make required
  categoryId?: string
  categoryName?: string
  courseId?: string
  courseName?: string
  modifiers?: SaleModifier[]
  discountId?: string
  discountName?: string
  discountAmount?: number
  taxPercent?: number
  taxAmount?: number
  paymentMethod?: string
  paymentStatus: "pending" | "completed" | "failed"
  staffId?: string
  staffName?: string
  terminalId: string // Make required
  deviceId?: string
  deviceName?: string
  locationId?: string
  locationName?: string
  time: number // Make required
  notes?: string
  createdAt: number
  updatedAt: number
  // Additional properties for display
  items?: number
  total?: string
  status?: string
}

// ==========================================
// POS Screen/Group Designer models
// These are the shapes used by Till screen/group designers and consumed by runtime Till.
// Stored under /data/pos/tillscreens and /data/pos/groups.
// ==========================================

export type POSGroupType = "layout"

// Group used by POS designers (layout of cards/buttons).
// Note: we keep legacy fields optional for backward compatibility with older data.
export interface Group {
  id: string
  name: string
  description?: string

  // Designer layout (what the UI builds)
  layout?: Card[]
  tags?: string[]
  isDefault?: boolean

  // Legacy/compat fields (older implementations may have stored these)
  type?: POSGroupType | "product_group" | "category_group" | "staff_group" | "location_group"
  items?: string[]
  color?: string
  icon?: string
  displayOrder?: number
  isActive?: boolean

  createdAt: number
  updatedAt: number
}

// Course interface for menu organization
export interface Course {
  id: string
  name: string
  description?: string
  displayOrder: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// Analytics and reporting interfaces
export interface POSAnalytics {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topProducts: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>
  topCategories: Array<{
    categoryId: string
    categoryName: string
    quantity: number
    revenue: number
  }>
  salesByHour: Array<{
    hour: number
    sales: number
    orders: number
  }>
  salesByDay: Array<{
    date: string
    sales: number
    orders: number
  }>
  paymentMethods: Array<{
    method: string
    count: number
    amount: number
  }>
}

// UI Component Props Interfaces
export interface NewBillProps {
  onClose: () => void
  onSave: (bill: Omit<Bill, "id">) => void
  open: boolean
}

export interface NewTillScreenProps {
  onClose: () => void
  onSave: (tillScreen: Omit<TillScreen, "id">) => void
  open: boolean
}

export interface NewPaymentTypeProps {
  onClose: () => void
  onSave?: (paymentType: Omit<PaymentType, "id">) => void
  open: boolean
  onAddPayment: (paymentType: { name: string; type: "cash" | "card" | "digital" | "voucher" | "other" }) => Promise<void>
}

export interface NewDiscountProps {
  onClose: () => void
  onSave: (discount: Omit<Discount, "id">) => void
  open: boolean
}

export interface NewPromotionProps {
  onClose: () => void
  onSave: (promotion: Omit<Promotion, "id">) => void
  open: boolean
}

export interface NewCorrectionProps {
  onClose: () => void
  onSave?: (correction: Omit<Correction, "id">) => void
  open: boolean
  onAddCorrection: (correction: { name: string; type: "void" | "waste" | "edit" | "refund" | "comp" }) => Promise<void>
}

export interface NewDeviceProps {
  onClose: () => void
  onSave: (device: Omit<Device, "id">) => void
  open: boolean
  onAddDevice: (device: Omit<Device, "id">) => Promise<void>
  locations: Location[]
}

export interface NewLocationProps {
  onClose: () => void
  onSave: (location: Omit<Location, "id">) => void
  open: boolean
}

export interface NewTicketProps {
  onClose: () => void
  onSave: (ticket: Omit<Ticket, "id">) => void
  open: boolean
}

export interface NewBagCheckItemProps {
  onClose: () => void
  onSave: (item: Omit<BagCheckItem, "id">) => void
  open: boolean
}

// All interfaces are already exported above with 'export interface'
// No need for additional export type block
