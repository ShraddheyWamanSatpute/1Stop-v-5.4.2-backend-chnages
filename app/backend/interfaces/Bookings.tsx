// src/backend/interfaces/Bookings.tsx

// Consolidated BookingType interface
export interface BookingType {
  id: string
  name: string
  description?: string
  color?: string
  defaultDuration?: number
  duration?: number
  active?: boolean
  createdAt?: string
  updatedAt?: string
  // Extended properties for form compatibility
  maxPartySize?: number
  minPartySize?: number
  price?: number
  depositRequired?: boolean
  requiresDeposit?: boolean
  depositAmount?: number
  advanceBookingDays?: number
  cancellationPolicy?: string
  requiresApproval?: boolean
  isDefault?: boolean
  allowOnlineBooking?: boolean
  requiresPhone?: boolean
  requiresEmail?: boolean
  tags?: string[]
  // Booking constraints
  minAdvanceHours?: number
  maxAdvanceDays?: number
  depositType?: "fixed" | "percentage" | "none"
  availableDays?: string[]
  availableTimeSlots?: string[]
  // Extended fields
  preorderProfileId?: string
  autoSendPreorders?: boolean
  autoSendDepositEmails?: boolean
  depositPerPerson?: boolean
  availabilityMode?: "hourly" | "daily" | "weekly"
  availableTimesByDay?: Record<string, string[]>
}

// Consolidated Table interface
export interface Table {
  id: string
  name: string
  capacity: number
  // Backwards compatibility: some code refers to `table.number`
  number?: string | number
  createdAt?: string
  updatedAt?: string
  description?: string
  // Extended properties for form compatibility
  section?: string
  location?: string
  locationId?: string
  minPartySize?: number
  maxPartySize?: number
  minGuests?: number
  maxGuests?: number
  minCovers?: number
  maxCovers?: number
  isVip?: boolean
  isAccessible?: boolean
  allowsSmoking?: boolean
  hasView?: boolean
  notes?: string
  // Layout and display properties
  status?: string
  active?: boolean
  order?: number
  position?: { x: number; y: number }
  shape?: string
  color?: string
  width?: number
  height?: number
  x?: number
  y?: number
  rotation?: number
  tableType?: string
}

export interface Booking {
  totalAmount: number | null
  guestCount: number
  id: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  company?: string
  date: string
  arrivalTime: string
  until?: string
  duration?: number
  guests: number
  tableNumber?: string
  tableId?: string
  bookingType?: string
  deposit?: number
  depositPaid?: boolean
  source?: string
  notes?: string
  specialRequests?: string
  dietaryRequirements?: string
  createdAt: string
  updatedAt: string
  startTime: string
  endTime: string
  covers: number
  customerId?: string
  customer?: any
  status: string
  tracking?:
    | "Not Arrived"
    | "Arrived"
    | "Seated"
    | "Appetizers"
    | "Starters"
    | "Mains"
    | "Desserts"
    | "Bill"
    | "Paid"
    | "Left"
    | "No Show"
  // Extended booking data
  preorder?: BookingPreorder
  payments?: BookingPayment
  messages?: BookingMessage[]
  // Applied tags (names from TagsManagement)
  tags?: string[]
  // Multi-table selection support
  selectedTables?: string[]
  // Staff assignment fields
  assignedWaiter?: string
  assignedWaiters?: string[]
  assignedAt?: string
  assignedTo?: string
}

export interface BookingStatus {
  id: string
  name: string
  description: string
  color: string
  isDefault: boolean
  allowsEditing: boolean
  allowsSeating: boolean
  countsAsAttended: boolean
  active: boolean
  order: number
  createdAt?: string
  updatedAt?: string
}


export interface TableType {
  id: string
  name: string
  description?: string
}


export interface WaitlistEntry {
  id: string
  name: string
  contact: string
  email?: string
  partySize: number
  notes: string
  timeAdded: string
  status: string
  estimatedWaitTime?: number
  notified?: boolean
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company?: string
  notes?: string
  visitCount?: number
  lastVisit?: string
  totalSpent?: number
  preferences?: string
  dietaryRequirements?: string
  vip?: boolean
  marketing?: boolean
  createdAt: string
  updatedAt: string
}

// Update the BookingSettings interface to include all properties used in the component
export interface BookingSettings {
  openTimes: Record<string, any>
  bookingTypes: Record<string, any>
  businessHours?: Array<{
    day: string
    closed: boolean
    open: string
    close: string
  }>
  blackoutDates?: Array<{
    // Backwards compatible: older entries may only have `date`
    date?: string
    startDate?: string
    endDate?: string
    reason: string
  }>
  allowOnlineBookings?: boolean
  maxDaysInAdvance?: number
  minHoursInAdvance?: number
  timeSlotInterval?: number
  defaultDuration?: number
  maxPartySize?: number
  enableWaitlist?: boolean
  waitlistMaxPartySize?: number
  waitlistNotificationType?: string
  waitlistNotificationTime?: number
  depositRequired?: boolean
  depositAmount?: number
  depositType?: string
  depositPercentage?: number
  requireDeposit?: boolean
  cancellationPolicy?: string
  cancellationHours?: number
  sendConfirmations?: boolean
  sendReminders?: boolean
  reminderHours?: number[]
  confirmationEmailTemplate?: string
  reminderEmailTemplate?: string
  // Email provider settings for contact section
  contactEmailProvider?: "gmail" | "outlook" | "custom"
  contactEmailAddress?: string
  // Optional venue SMTP for custom provider
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  // Email templates and provider integrations
  predefinedEmailTemplates?: Array<{ id?: string; name: string; subject: string; body: string }>
  customEmailTemplates?: Array<{ id?: string; name: string; subject: string; body: string }>
  gmailConnected?: boolean
  outlookConnected?: boolean
  // OAuth provider config per venue
  googleClientId?: string
  googleClientSecret?: string
  googleRedirectUri?: string
  outlookClientId?: string
  outlookClientSecret?: string
  outlookRedirectUri?: string

  // =========================
  // New: General settings (modern settings UI)
  // =========================
  autoConfirmBookings?: boolean
  autoConfirmRules?: Array<{
    id: string
    enabled: boolean
    bookingTypeId?: string
    minGuests?: number
    maxGuests?: number
    daysOfWeek?: string[] // e.g. ["Monday","Tuesday"]
    startTime?: string // "HH:mm"
    endTime?: string // "HH:mm"
    minAdvanceHours?: number
    maxAdvanceDays?: number
    notes?: string
    createdAt?: number
    updatedAt?: number
  }>

  bookingTypeTimeConfig?: Record<string, {
    durationMinutes?: number
    slotIntervalMinutes?: number
    minAdvanceHours?: number
    maxAdvanceDays?: number
  }>

  openingHoursOverride?: Array<{
    day: string
    closed: boolean
    open: string
    close: string
  }>

  venueHirePricing?: {
    currency?: string // e.g. "GBP"
    perHour?: number
    perDay?: number
    notes?: string
  }

  // =========================
  // New: Public venue profile
  // =========================
  publicProfile?: {
    enabled?: boolean
    venueType?: "restaurant" | "pub" | "cafe" | "hotel" | "venue" | "other"
    displayName?: string
    tagline?: string
    bio?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    images?: string[] // URLs
    coverImage?: string // URL
    amenities?: string[]
    social?: {
      facebook?: string
      instagram?: string
      tiktok?: string
      x?: string
    }
    bookingNotes?: string
  }
}

// Define the TableElement interface for use in FloorPlan
export interface TableElement {
  id: string
  tableId?: string
  name: string
  seats: number
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  shape: "Rectangle" | "Round" | "Square" | "Custom" | "Diamond"
  color?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  textColor?: string
  fontSize?: number
  textSize?: number
}

export interface FloorPlan {
  id: string
  name: string
  description?: string
  tables?: TableElement[] // Use the TableElement interface instead of inline type
  width?: number
  height?: number
  background?: string
  isDefault?: boolean
  layout?: {
    width: number
    height: number
    tables: TableElement[]
    backgroundColor?: string
    gridSize?: number
  }
}

export interface BookingStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  noShowBookings: number
  averagePartySize: number
  totalCovers: number
  peakHours: Record<string, number>
  bookingsByType: Record<string, number>
  bookingsByDay: Record<string, number>
  occupancyRate: number
}

// Table Layout Designer interfaces - consolidated into main TableFormData below"

export interface TableFormData {
  id?: string
  name: string
  maxCovers: number
  minCovers: number
  tableType: string
  description?: string
  order?: number
  location?: string
  status?: string
  capacity?: number
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ContextMenuPosition {
  mouseX: number
  mouseY: number
}

// New: Booking preorder data captured per booking
export interface BookingPreorderItemSelection {
  itemId: string
  requirement?: "required" | "optional"
  perPerson?: boolean
  quantityPerPerson?: number
}

export interface BookingPreorder {
  profileId?: string
  notes?: string
  items?: BookingPreorderItemSelection[]
  // Per-guest preorder responses (used by staff UI + preorder page)
  responses?: Array<{
    firstName: string
    lastName: string
    allergies?: string[]
    requests?: string
    // key: courseId (or course.id), value: itemIds selected for that course
    selections: Record<string, string[]>
  }>
}

// New: Booking payment/deposit tracking
export interface BookingPayment {
  currency?: string
  depositAmount?: number
  depositStatus?: "unpaid" | "paid" | "refunded" | "waived"
  depositPaidAt?: string
  stripePaymentLink?: string
  stripePaymentIntentId?: string
  transactions?: Array<{
    id?: string
    type: "deposit" | "balance" | "refund" | "authorization"
    amount: number
    currency: string
    status: "created" | "paid" | "refunded" | "failed"
    createdAt: string
    providerId?: string
    meta?: Record<string, any>
  }>
}

// New: Logged communications for a booking
export interface BookingMessage {
  id: string
  type: "preorder" | "deposit" | "general"
  to: string
  cc?: string | string[]
  bcc?: string | string[]
  from?: string
  subject?: string
  body?: string
  sentAt?: string
  status?: "draft" | "queued" | "sent" | "delivered" | "bounced" | "replied"
  replyAt?: string
  meta?: Record<string, any>
}

// Booking tag interface for tags management
export interface BookingTag {
  id?: string
  name: string
  description?: string
  color?: string
  category?: string
  displayOrder?: number
  active?: boolean
  isDefault?: boolean
  showInFilters?: boolean
  showInReports?: boolean
  createdAt?: string
  updatedAt?: string
}


// Location interface
export interface Location {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  email: string
  website?: string
  description?: string
  active: boolean
  createdAt: string
  updatedAt: string
}
