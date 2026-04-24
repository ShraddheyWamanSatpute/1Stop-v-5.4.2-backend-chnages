/**
 * ESS Portal Type Definitions
 * Extends existing HR interfaces for ESS-specific needs
 */

import type { Employee, Schedule, TimeOff, Attendance, Payroll } from "../../../app/backend/interfaces/HRs"

// ============================================
// ESS STATE TYPES
// ============================================

export interface ESSState {
  // Current employee (linked to auth.uid)
  currentEmployee: Employee | null
  employeeId: string | null
  isEmployeeLinked: boolean

  // Owner emulation (for owners viewing as another employee)
  emulatedEmployeeId: string | null

  // Clock status
  isClockedIn: boolean
  clockInTime: number | null
  lastClockEvent: ESSClockEvent | null

  // Quick access data (filtered to current employee only)
  upcomingShifts: Schedule[]
  pendingTimeOff: TimeOff[]
  approvedTimeOff: TimeOff[]
  recentAttendance: Attendance[]
  payslips: Payroll[]
  performanceReviews: ESSPerformanceReview[]
  publicHolidays: ESSPublicHoliday[]

  // Holiday balance
  holidayBalance: ESSHolidayBalance

  // Company settings
  companySettings: ESSCompanySettings

  // Loading states
  isLoading: boolean
  isInitialized: boolean
  error: ESSError | null

  emergencyContacts: ESSEmergencyContact[]
}

export interface ESSClockEvent {
  type: "in" | "out"
  timestamp: number
  location?: ESSLocation
}

export interface ESSLocation {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

export interface ESSHolidayBalance {
  total: number
  used: number
  pending: number
  remaining: number
  carryOver: number
}

export interface ESSCompanySettings {
  clockInRequiresLocation: boolean
  allowEarlyClockIn: boolean
  earlyClockInMinutes: number
  allowLateClockOut: boolean
  autoClockOutEnabled: boolean
  autoClockOutTime: string
  breakDurationMinutes: number
}


/**
 * Emergency Contact
 */
export interface ESSEmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  email?: string
  isPrimary?: boolean
}

// ============================================
// AUTHENTICATION & ACCESS TYPES
// ============================================

export interface ESSAuthState {
  isAuthenticated: boolean
  userId: string | null
  userRole: ESSUserRole | null
  currentCompanyId: string | null
  currentSiteId: string | null
  companies: ESSCompanyAccess[]
  isMultiCompany: boolean
}

export type ESSUserRole = "staff" | "manager" | "admin" | "owner"

export interface ESSCompanyAccess {
  companyId: string
  companyName: string
  companyLogo?: string
  siteId?: string
  siteName?: string
  subsiteId?: string
  subsiteName?: string
  role: string
  department?: string
}

export type ESSAccessStatus =
  | "loading"
  | "authenticated"
  | "not-authenticated"
  | "wrong-role"
  | "no-employee"
  | "no-company"
  | "terminated"
  | "error"

// ============================================
// DEVICE DETECTION TYPES
// ============================================

export interface ESSDeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  userAgent: string
  screenWidth: number
  screenHeight: number
  platform: "ios" | "android" | "windows" | "macos" | "linux" | "unknown"
  deviceType: "mobile" | "tablet" | "desktop"
  orientation: "portrait" | "landscape"
}

// ============================================
// ERROR HANDLING TYPES
// ============================================

export interface ESSError {
  code: ESSErrorCode
  message: string
  details?: string
  timestamp: number
  recoverable: boolean
}

export type ESSErrorCode =
  | "AUTH_REQUIRED"
  | "WRONG_ROLE"
  | "NO_EMPLOYEE"
  | "NO_COMPANY"
  | "LOCATION_DENIED"
  | "LOCATION_TIMEOUT"
  | "LOCATION_UNAVAILABLE"
  | "CLOCK_FAILED"
  | "NETWORK_ERROR"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR"

// ============================================
// ACTION TYPES
// ============================================

export interface ESSClockInPayload {
  location?: ESSLocation
  notes?: string
}

export interface ESSClockOutPayload {
  location?: ESSLocation
  notes?: string
  shiftFeedback?: ESSShiftFeedback
}

export interface ESSShiftFeedback {
  rating?: number
  notes?: string
  issues?: string[]
}

export interface ESSTimeOffRequest {
  type: "vacation" | "sick" | "personal" | "bereavement" | "unpaid" | "other"
  startDate: string
  endDate: string
  totalDays: number
  reason?: string
  notes?: string
}

// ============================================
// PERFORMANCE REVIEW TYPES
// ============================================

/**
 * ESS Performance Review
 * Simplified performance review structure for ESS portal display
 * Maps from backend PerformanceReview interface
 */
export interface ESSPerformanceReview {
  id: string
  reviewPeriod: string
  reviewDate: number
  endDate?: number
  overallScore?: number
  categories?: ESSPerformanceCategory[]
  feedback?: string
  comments?: string
  reviewerName?: string
  goals?: ESSPerformanceGoal[]
  strengths?: string[]
  areasForImprovement?: string[]
  status: "draft" | "submitted" | "approved" | "completed"
  createdAt?: number
  updatedAt?: number
  qualificationAssessment?: Array<{
    qualification: string
    currentLevel: "beginner" | "intermediate" | "advanced" | "expert"
    targetLevel: "beginner" | "intermediate" | "advanced" | "expert"
  }>
}

/**
 * Performance Score Category
 * Individual category scores within a performance review
 */
export interface ESSPerformanceCategory {
  name: string
  score: number
  maxScore?: number
}

/**
 * Performance Goal
 * Goals and objectives from performance reviews
 */
export interface ESSPerformanceGoal {
  title: string
  description?: string
  dueDate?: number
  completed: boolean
  status?: "not_started" | "in_progress" | "completed"
}

// ============================================
// PUBLIC HOLIDAY TYPES
// ============================================

/**
 * Public Holiday
 * Company or region-specific public holidays
 */
export interface ESSPublicHoliday {
  id: string
  name: string
  date: number
  dateString?: string
  type?: "national" | "regional" | "company"
  region?: string
  description?: string
}

// ============================================
// CONTEXT VALUE TYPE
// ============================================

export interface ESSContextValue {
  state: ESSState
  authState: ESSAuthState
  deviceInfo: ESSDeviceInfo

  // Actions
  refreshData: () => Promise<void>
  clockIn: (payload?: ESSClockInPayload) => Promise<boolean>
  clockOut: (payload?: ESSClockOutPayload) => Promise<boolean>
  requestTimeOff: (request: ESSTimeOffRequest) => Promise<boolean>
  cancelTimeOffRequest: (requestId: string) => Promise<boolean>
  updateEmergencyContacts: (contacts: ESSEmergencyContact[]) => Promise<boolean>
  switchCompany: (companyId: string) => Promise<void>
  clearError: () => void
  
  // Owner emulation
  setEmulatedEmployee: (employeeId: string | null) => void
  clearEmulatedEmployee: () => void
}
