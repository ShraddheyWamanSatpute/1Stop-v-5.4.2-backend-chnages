export type SupplyEntityStatus = "active" | "inactive" | "archived"

export interface SupplyClient {
  id: string
  name: string
  type: "customer" | "client"
  status: SupplyEntityStatus
  // Optional accounting references (customer codes, etc.)
  accountReference?: string
  vatNumber?: string

  // Primary contact (general)
  email?: string
  phone?: string
  website?: string
  contactName?: string

  // Legacy single-address fields (kept for backward compatibility)
  addressLine1?: string
  addressLine2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string

  // Billing address (optional, if different from delivery)
  billingAddressLine1?: string
  billingAddressLine2?: string
  billingCity?: string
  billingCounty?: string
  billingPostcode?: string
  billingCountry?: string

  // Delivery / receiving details (what a supplier needs to deliver to this customer)
  deliveryContactName?: string
  deliveryContactEmail?: string
  deliveryContactPhone?: string

  deliveryAddressLine1?: string
  deliveryAddressLine2?: string
  deliveryCity?: string
  deliveryCounty?: string
  deliveryPostcode?: string
  deliveryCountry?: string

  receivingHours?: string
  preferredDeliveryDays?: string[] // e.g. ["Mon", "Tue"]
  preferredDeliveryTimeFrom?: string // "HH:mm"
  preferredDeliveryTimeTo?: string // "HH:mm"
  requiresPONumber?: boolean
  unloadingRequirements?: string
  accessInstructions?: string // gate code, parking, entrance, etc.
  deliveryInstructions?: string

  paymentTerms?: "due_on_receipt" | "net_7" | "net_14" | "net_30" | "net_60"
  creditLimit?: number
  notes?: string
  tags?: string[]
  createdAt: number
  updatedAt?: number
}

export type SupplyInviteStatus = "pending" | "accepted" | "expired" | "cancelled"

// Client invite (for a future client portal / invite accept flow)
// Stored under:
// - <supplierSupplyPath>/clientInvites/<code> (supplier side)
// - supplyInvites/<code> (global index for lookup by code)
export interface SupplyClientInvite {
  id: string // same as code (document key)
  code: string
  clientId: string
  clientName?: string
  email?: string
  phone?: string
  status: SupplyInviteStatus
  createdAt: number
  createdBy?: string
  expiresAt: number
  acceptedAt?: number
  // Acceptance happens inside the recipient (customer) company
  acceptedByUserId?: string
  acceptedByCompanyId?: string
  // Supplier company metadata for recipient UI
  supplierCompanyId?: string
  supplierCompanyName?: string
  supplierSupplyPath?: string
  // The recipient can link this invite to an existing/new Stock Supplier record
  linkedStockSupplierId?: string
}

export type SupplyOrderStatus =
  | "draft"
  | "confirmed"
  | "processing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "cancelled"

export interface SupplyOrderLine {
  id: string
  sku?: string
  name: string
  measureId?: string
  measureName?: string
  qty: number
  unitPrice: number
  notes?: string
}

export interface SupplyOrder {
  id: string
  orderNumber: string
  clientId: string
  clientName: string
  status: SupplyOrderStatus
  orderDate: number
  requestedDeliveryDate?: number
  currency?: string
  lines: SupplyOrderLine[]
  subtotal: number
  tax: number
  total: number
  reference?: string
  notes?: string
  createdAt: number
  updatedAt?: number
}

export type SupplyDeliveryStatus = "scheduled" | "in_transit" | "delivered" | "failed" | "cancelled"

export interface SupplyDelivery {
  id: string
  deliveryNumber: string
  orderId?: string
  orderNumber?: string
  clientId: string
  clientName: string
  status: SupplyDeliveryStatus
  scheduledDate?: number
  dispatchedAt?: number
  deliveredAt?: number
  driverName?: string
  trackingRef?: string
  deliveryAddress?: string
  proofOfDeliveryUrl?: string
  notes?: string
  createdAt: number
  updatedAt?: number
}

