// Core HR Interfaces
export interface Employee {
  id: string
  employeeID?: string // Alternative ID field used in database
  firstName: string
  lastName: string
  email: string
  phone?: string
  departmentId: string
  roleId?: string
  hireDate: number
  status: "active" | "inactive" | "terminated" | "on_leave"
  salary?: number
  hourlyRate?: number
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  notes?: string
  createdAt: number
  updatedAt?: number
  // Additional fields that exist in the data
  state?: string
  companyId?: string
  siteId?: string
  userId?: string
  // Extended fields used throughout the application
  middleName?: string
  gender?: string
  photo?: string
  position?: string
  department?: string
  employmentType?: string
  payType?: "salary" | "hourly"
  payFrequency?: "weekly" | "biweekly" | "every4weeks" | "monthly" | "endOfWeek"
  payrollNumber?: string
  qualifications?: string[]
  lengthOfService?: number
  ethnicity?: string
  clockInSettings?: {
    autoClockOut?: boolean
    autoClockOutTime?: string
    requiresPermissionFor8HrGap?: boolean
  }
  has8HourRestPermission?: boolean
  wageStreamEnabled?: boolean
  salesTargets?: {
    daily?: number
    weekly?: number
    monthly?: number
  }
  tronc?: number
  bonus?: number
  manager?: string
  dateOfBirth?: number
  nationalInsuranceNumber?: string
  city?: string
  zip?: string
  country?: string
  isFullTime?: boolean
  holidaysPerYear?: number
  hoursPerWeek?: number
  minHoursPerWeek?: number
  maxHoursPerWeek?: number
  availabilityDays?: string
  availabilityHours?: string
  startDate?: string
  endDate?: string
  jobTitle?: string
  bankDetails?: {
    accountName: string
    accountNumber: string
    routingNumber: string
    bankName: string
  }
  taxInformation?: {
    taxId: string
    filingStatus: string
    withholding: number
  }
  terminationDate?: number
  documents?: Document[]
  role?: Role
  
  // ========== HMRC PAYROLL REQUIRED FIELDS ==========
  
  // Tax Information
  taxCode?: string // e.g., "1257L", "BR", "D0", "D1", "K100", "NT", "0T"
  taxCodeBasis?: "cumulative" | "week1month1" // Week 1/Month 1 (emergency tax) or cumulative
  taxCodeDate?: number // When tax code was last updated
  previousTaxCode?: string // For audit trail
  
  // National Insurance
  niCategory?: "A" | "B" | "C" | "F" | "H" | "I" | "J" | "L" | "M" | "S" | "V" | "Z" // NI category letter
  niCategoryDate?: number // When NI category was last set
  
  // Director Status (different NI calculation)
  isDirector?: boolean
  directorNICalculationMethod?: "annual" | "alternative" // Annual or alternative method
  directorStartDate?: number // When directorship started
  
  // New Starter Information
  starterDeclaration?: "A" | "B" | "C" // HMRC starter declarations
  starterDeclarationDate?: number
  
  // P45 Data (from previous employer)
  p45Data?: {
    previousEmployerName: string
    previousEmployerPAYERef: string
    leavingDate: number
    taxCodeAtLeaving: string
    payToDate: number
    taxToDate: number
    studentLoanDeductionsToDate?: number
    postgraduateLoanDeductionsToDate?: number
  }
  
  // Student Loans
  studentLoanPlan?: "none" | "plan1" | "plan2" | "plan4" // Scotland uses plan 4
  hasPostgraduateLoan?: boolean
  studentLoanStartDate?: number
  studentLoanEndDate?: number
  
  // Pension Auto-Enrolment
  pensionSchemeReference?: string // PSTR - Pension Scheme Tax Reference
  autoEnrolmentDate?: number // Date auto-enrolled
  autoEnrolmentStatus?: "eligible" | "enrolled" | "opted_out" | "not_eligible" | "postponed"
  pensionOptOutDate?: number
  pensionOptInDate?: number
  postponementEndDate?: number // End of postponement period
  lastReEnrolmentDate?: number // Last re-enrolment date (every 3 years)
  nextReEnrolmentDate?: number // Next re-enrolment due date
  pensionContributionPercentage?: number // Employee contribution %
  pensionQualifyingEarningsOnly?: boolean // Calculate on qualifying earnings only
  
  // Payment Information
  paymentFrequency?: "weekly" | "fortnightly" | "four_weekly" | "monthly" // How often paid
  paymentWeekNumber?: number // For tracking week number in tax year (1-52/53)
  paymentMonthNumber?: number // For tracking month number in tax year (1-12)
  paymentDayOfWeek?: number // 1-7 for weekly/fortnightly
  paymentDayOfMonth?: number // 1-31 for monthly
  regularPayday?: string // e.g., "Friday" or "15th"
  
  // Employment Status
  isIrregularEmployment?: boolean // Casual/irregular worker flag
  isApprentice?: boolean // Apprentice flag (different NI for under 25)
  isOffPayrollWorker?: boolean // IR35 off-payroll worker
  
  // Statutory Payments Eligibility
  sspEligible?: boolean // Statutory Sick Pay eligible
  smpEligible?: boolean // Statutory Maternity Pay eligible  
  sppEligible?: boolean // Statutory Paternity Pay eligible
  
  // Leaver Information
  leavingDate?: number
  leavingReason?: "resignation" | "dismissal" | "redundancy" | "retirement" | "end_of_contract" | "death" | "other"
  p45Issued?: boolean
  p45IssueDate?: number
  paymentAfterLeaving?: boolean // Flag if payments made after employment ended
  
  // Validation & Compliance
  niNumberValidated?: boolean // NI number verified
  niValidationDate?: number
  taxCodeValidated?: boolean
  taxCodeValidationDate?: number
  rightToWorkVerified?: boolean
  rightToWorkDocuments?: string[] // Document IDs
  rightToWorkExpiryDate?: number
  
  // GDPR & Data Protection
  dataConsentGiven?: boolean
  dataConsentDate?: number
  payslipEmailConsent?: boolean // Consent to email payslips
  
  // Tronc Scheme (Hospitality Specific)
  troncParticipant?: boolean // Participates in tronc scheme
  troncPoints?: number // Points for tronc allocation
  troncStartDate?: number
  doNotIncludeOnRota?: boolean // Exclude from scheduling/rota}
}

export interface Role {
  id: string
  name: string
  label: string
  description?: string
  departmentId: string
  permissions: string[]
  isActive: boolean
  createdAt: number
  updatedAt?: number
  // Additional fields that exist in the data
  department?: string
  active?: boolean
  responsibilities?: string[]
  requirements?: string[]
  minSalary?: number
  maxSalary?: number
}

export interface Department {
  id: string
  name: string
  description?: string
  managerId?: string
  budget?: number
  isActive: boolean
  createdAt: number
  updatedAt?: number
  // Additional fields that exist in the data
  employees?: string[]
  roles?: string[]
  location?: string
}

// UI Component Interfaces
export interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export interface TimeOffFormData {
  id?: string
  employeeId: string
  type: string
  startDate: string
  endDate: string
  reason: string
  status?: string
  notes?: string
}

export interface PayrollFormData {
  employeeId: string
  payPeriod: string
  payPeriodStart: string
  payPeriodEnd: string
  hoursWorked: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  bonuses: number
  grossPay: number
  totalGross: number
  deductions: {
    tax: number
    insurance: number
    retirement: number
    other: number
  }
  totalDeductions: number
  netPay: number
  totalNet: number
  status: string
  paymentMethod: string
  paymentDate: string
  notes?: string
  id?: string
}

export interface Schedule {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  department: string
  role?: string
  notes?: string
  status: "draft" | "scheduled" | "approved" | "confirmed" | "finalized" | "completed" | "cancelled"
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  // Breaks (minutes)
  breakDuration?: number
  // Clock in/out tracking
  clockInTime?: string
  clockOutTime?: string
  actualHours?: number
  clockInLocation?: string
  clockOutLocation?: string
  // Approval workflow
  approvedBy?: string
  approvedAt?: string
  confirmedBy?: string
  confirmedAt?: string
  // Hours adjustment
  adjustedHours?: number
  adjustmentReason?: string
  adjustmentApprovedBy?: string
  adjustmentApprovedAt?: string
  weather?: {
    temperature?: number
    condition?: string
    icon?: string
  }
  // Database specific fields
  departmentID?: string
  createdAt: string
  updatedAt?: string
}

export interface ScheduleFormData {
  id?: string
  employeeId: string
  employeeName?: string
  date: Date | null
  startTime: Date | null
  endTime: Date | null
  department: string
  role?: string
  notes?: string
  status: "draft" | "scheduled" | "approved" | "confirmed" | "finalized" | "completed" | "cancelled" | "no_show"
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  // Breaks (minutes)
  breakDuration?: number
  breakStartTime?: Date | null
  // Clock in/out tracking
  clockInTime?: string
  clockOutTime?: string
  actualHours?: number
  clockInLocation?: string
  clockOutLocation?: string
  // Hours adjustment
  adjustedHours?: number
  adjustmentReason?: string
}

export interface ScheduleManagerProps {
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  bookingsData?: any[] // Bookings data from BookingsContext
  businessHours?: any // Business hours from booking settings
}

export interface WarningRecord {
  id: string
  employeeId: string
  type: string
  description: string
  date: string
  severity: "low" | "medium" | "high"
  status: "active" | "resolved"
}

export interface ViewEmployeeProps {
  employee: Employee
  onClose: () => void
}

export interface EmployeeDetailViewProps {
  employee: Employee
  onClose: () => void
}

export interface ClockInOutFeatureProps {
  employeeId: string
  onClockIn?: () => void
  onClockOut?: () => void
}

export interface ClockEvent {
  id: string
  employeeId: string
  type: "clock_in" | "clock_out"
  timestamp: string
  location?: string
}

export interface AnnouncementFormData {
  title: string
  content: string
  priority: "low" | "medium" | "high"
  targetRoles: string[]
  startDate: string
  endDate: string
  isActive: boolean
}

export interface CalendarViewProps {
  date: Date
  onDateChange: (date: Date) => void
}

export interface ColumnConfig {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
  format?: (value: any) => string
}

export interface TrainingManagementProps {}

export interface RoleFormData extends Omit<Role, "id"> {
  // Inherits all Role properties except id
}



export interface Training {
  id: string
  employeeId: string
  title: string
  description?: string
  startDate: number
  endDate?: number
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  type: "onboarding" | "compliance" | "skills" | "leadership" | "other"
  provider?: string
  location?: string
  cost?: number
  notes?: string
  createdAt: number
  updatedAt?: number
  completionRate?: number
}

export interface Shift {
  id: string
  employeeId: string
  employeeName?: string
  date: number
  startTime: string
  endTime: string
  hours: number
  breakDuration: number
  breakStartTime?: string
  department: string
  position: string
  notes?: string
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  createdBy: string
  createdAt: number
  updatedAt?: number
}

export interface Attendance {
  id: string
  employeeId: string
  date: number
  clockIn: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  totalHours?: number
  status: "present" | "absent" | "late" | "early_departure" | "on_leave"
  notes?: string
  approvedBy?: string
  approvedAt?: number
  autoClockOut?: boolean
  autoClockOutTime?: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  shiftFeedback?: ShiftFeedback
  createdAt: number
  updatedAt?: number
}

export interface TimeOff {
  id: string
  employeeId: string
  type: "vacation" | "sick" | "personal" | "bereavement" | "jury_duty" | "other"
  startDate: number
  endDate: number
  totalDays: number
  reason?: string
  status: "pending" | "approved" | "denied" | "cancelled"
  approvedBy?: string
  approvedAt?: number
  notes?: string
  createdAt: number
  updatedAt?: number
}

// Add TimeOffRequest interface for compatibility
export interface TimeOffRequest {
  id: string
  employeeId: string
  employeeName: string
  startDate: string
  endDate: string
  type: string
  reason: string
  status: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  approvedBy?: string
  approvedDate?: string
  totalDays?: number
}

export interface PayrollPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: "draft" | "processing" | "completed" | "closed"
  payDate?: string
  createdAt: string
  updatedAt?: string
}

export interface PayrollSettings {
  payPeriodType: "weekly" | "biweekly" | "monthly" | "semimonthly" | "every4weeks" | "endOfWeek"
  payDay: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  taxSettings: {
    name: string
    rate: number
    isRequired: boolean
    applicableStates?: string[]
  }[]
  deductionTypes: {
    name: string
    type: "percentage" | "fixed"
    amount: number
    isRequired: boolean
  }[]
  allowanceTypes: {
    name: string
    type: "percentage" | "fixed"
    amount: number
  }[]
  overtimeRules: {
    enabled: boolean
    rate: number
    threshold: number
  }
}

export interface Payroll {
  id: string
  employeeId: string
  employeeName: string
  periodId: string
  periodStartDate: number
  periodEndDate: number
  payPeriodStart: string
  payPeriodEnd: string
  
  // Tax Year Information
  taxYear: string // "2024-25"
  taxPeriod: number // 1-52 for weekly, 1-12 for monthly
  periodType: "weekly" | "fortnightly" | "four_weekly" | "monthly"
  
  // Hours & Pay
  regularHours: number
  overtimeHours: number
  totalHours: number
  hoursWorked: number
  hourlyRate?: number
  regularPay: number
  overtimePay: number
  bonuses?: number
  commission?: number
  troncPayment?: number // Hospitality tronc/service charge
  holidayPay?: number
  otherPayments?: number
  
  // Gross Pay
  grossPay: number
  totalGross: number
  taxableGrossPay: number // May differ from gross for salary sacrifice
  niableGrossPay: number
  pensionableGrossPay: number
  
  // ========== HMRC-COMPLIANT DEDUCTIONS ==========
  
  // Tax Information
  taxCode: string // As used for this period
  taxCodeBasis: "cumulative" | "week1month1"
  taxDeductions: number
  taxPaidYTD: number
  
  // National Insurance
  niCategory: string // A, B, C, H, M, etc.
  employeeNIDeductions: number
  employerNIContributions: number
  employeeNIPaidYTD: number
  employerNIPaidYTD: number
  
  // Student Loans
  studentLoanPlan?: "none" | "plan1" | "plan2" | "plan4"
  studentLoanDeductions: number
  hasPostgraduateLoan?: boolean
  postgraduateLoanDeductions?: number
  studentLoanPaidYTD?: number
  postgraduateLoanPaidYTD?: number
  
  // Pension
  pensionSchemeReference?: string
  employeePensionDeductions: number
  employerPensionContributions: number
  pensionQualifyingEarnings?: number
  employeePensionPaidYTD: number
  employerPensionPaidYTD: number
  
  // Legacy deductions structure (kept for backward compatibility)
  deductions: {
    tax: number
    nationalInsurance: number
    pension: number
    studentLoan: number
    insurance?: number
    retirement?: number
    other: number
  }
  
  // Totals
  totalDeductions: number
  netPay: number
  totalNet: number
  
  // Year-to-Date Figures (snapshot at this payroll run)
  ytdData: {
    grossPayYTD: number
    taxablePayYTD: number
    taxPaidYTD: number
    niablePayYTD: number
    employeeNIPaidYTD: number
    employerNIPaidYTD: number
    pensionablePayYTD: number
    employeePensionYTD: number
    employerPensionYTD: number
    studentLoanPaidYTD?: number
    postgraduateLoanPaidYTD?: number
  }
  
  // Status & Payment
  status: "draft" | "pending" | "approved" | "paid" | "cancelled"
  paymentMethod?: "bank_transfer" | "direct_deposit" | "check" | "cash"
  paymentDate?: string
  paidDate?: number
  
  // Approval Workflow
  approvedBy?: string
  approvedAt?: number
  approverNotes?: string
  
  // Calculation Log (for audit trail)
  calculationLog?: string[] // Detailed calculation steps
  calculationEngine?: "v1" | "v2" // Version of calculation engine used
  
  // Documents
  payslipUrl?: string // URL to generated payslip PDF
  payslipGenerated?: boolean
  payslipGeneratedAt?: number
  
  // RTI Submission Tracking
  submittedToHMRC?: boolean
  fpsSubmissionDate?: number
  fpsSubmissionId?: string
  hmrcResponse?: string
  
  // Statutory Payments
  statutorySickPay?: number
  statutoryMaternityPay?: number
  statutoryPaternityPay?: number
  
  // Notes & Metadata
  notes?: string
  createdAt: string
  updatedAt?: string
  createdBy?: string
  frequency?: "weekly" | "biweekly" | "every4weeks" | "monthly" | "endOfWeek"
}

// Year-to-Date Data (stored separately for each employee)
export interface EmployeeYTD {
  id: string
  employeeId: string
  taxYear: string // "2024-25"
  
  // Gross Pay
  grossPayYTD: number
  taxablePayYTD: number
  niablePayYTD: number
  pensionablePayYTD: number
  
  // Deductions YTD
  taxPaidYTD: number
  employeeNIPaidYTD: number
  employerNIPaidYTD: number
  employeePensionYTD: number
  employerPensionYTD: number
  studentLoanPlan1YTD?: number
  studentLoanPlan2YTD?: number
  studentLoanPlan4YTD?: number
  postgraduateLoanYTD?: number
  
  // Statutory Payments YTD
  sspPaidYTD?: number
  smpPaidYTD?: number
  sppPaidYTD?: number
  
  // Last Updated
  lastPayrollId?: string
  lastPayrollDate?: number
  updatedAt: number
}

export interface Payslip {
  id: string
  payrollId: string
  employeeId: string
  employeeName: string
  payPeriod: string
  grossPay: number
  netPay: number
  deductions: {
    tax: number
    insurance: number
    retirement: number
    other: number
  }
  generatedAt: number
  url: string
  status: "generated" | "sent" | "viewed"
}

export interface Benefit {
  id: string
  name: string
  description: string
  type: "health" | "dental" | "vision" | "life" | "retirement" | "pto" | "other"
  provider: string
  cost: {
    employer: number
    employee: number
    frequency: "weekly" | "biweekly" | "monthly" | "annually"
  }
  eligibility: {
    employmentTypes: ("full_time" | "part_time" | "contract")[]
    waitingPeriod: number
    waitingPeriodUnit: "days" | "weeks" | "months"
    minimumHours: number
  }
  coverageDetails?: string
  links?: { url: string; title?: string }[]
  active: boolean
  createdAt: number
  updatedAt?: number
  // Additional properties used in components
  category?: string
  status?: "active" | "inactive" | "pending" | "expired"
  eligibilityRequirements?: string[]
}

export interface EmployeeBenefit {
  id: string
  employeeId: string
  benefitId: string
  enrollmentDate: number
  coverageLevel: "employee" | "employee_spouse" | "employee_children" | "family"
  dependents?: {
    name: string
    relationship: string
    dateOfBirth: number
  }[]
  employeeContribution: number
  employerContribution: number
  status: "active" | "pending" | "terminated"
  terminationDate?: number
  notes?: string
  createdAt: number
  updatedAt?: number
}

export interface ComplianceTask {
  id: string
  title: string
  description: string
  type: "training" | "certification" | "document" | "review" | "other"
  assignedTo: string[]
  dueDate: string
  priority: "low" | "medium" | "high" | "critical"
  notes?: string
  status: "pending" | "in_progress" | "completed" | "overdue"
  completedDate?: string
  documents: string[]
  createdBy: string
  createdAt: number
  updatedAt?: number
  completedBy?: string[]
  // Additional properties used in components
  category?: string
  completedAt?: string // Alias for completedDate for backward compatibility
}

export interface Warning {
  id: string
  employeeId: string
  issuedBy: string
  issuedDate: number
  type: "verbal" | "written" | "final" | "suspension"
  reason: string
  description: string
  consequences?: string
  improvementPlan?: string
  acknowledgement?: {
    acknowledged: boolean
    date?: number
    comments?: string
  }
  expiryDate?: number
  status: "active" | "resolved" | "expired"
  witnesses?: string[]
  notes?: string
  createdAt: number
  updatedAt?: number
}

export interface Announcement {
  id: string
  title: string
  content: string
  publishDate: number
  expiryDate?: number
  audience: "All" | "Department" | "Location" | "Role"
  audienceTarget?: string
  priority: "low" | "medium" | "high" | "urgent"
  author: string
  readBy?: string[]
  createdAt: number
  // Additional properties used in components
  date?: string
  time?: string
  sendEmail?: boolean
  updatedAt?: number
}

export interface Document {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: number
  expiryDate?: number
}

export interface EmployeeFormProps {
  mode: "add" | "edit"
  employee?: Employee
  roles: Role[]
  onSave: (employee: Omit<Employee, "id">) => void
  onCancel: () => void
}

export interface PerformanceReview {
  id: string
  employeeId: string
  reviewerId: string
  reviewPeriod: string
  startDate: number
  endDate: number
  qualificationAssessment: {
    qualification: string
    currentLevel: "beginner" | "intermediate" | "advanced" | "expert"
    targetLevel: "beginner" | "intermediate" | "advanced" | "expert"
    evidence: string[]
    developmentPlan: string
  }[]
  lengthOfServiceBonus: {
    months: number
    bonusPercentage: number
    applied: boolean
  }
  goals: {
    description: string
    status: "not_started" | "in_progress" | "completed"
    dueDate?: number
    reminder?: {
      frequency: "weekly" | "monthly"
      lastSent?: number
      nextSend?: number
    }
  }[]
  strengths: string[]
  areasForImprovement: string[]
  comments: string
  status: "draft" | "submitted" | "approved" | "completed"
  overallScore?: number
  createdAt: number
  updatedAt?: number
}

export interface PerformanceReviewForm {
  id?: string
  employeeId: string
  employeeName: string
  reviewerId: string
  reviewerName: string
  reviewType: string
  reviewDate: string
  dueDate: string
  status: string
  overallRating: number
  categoryRatings: Array<{
    category: string
    rating: number
    weight: number
  }>
  qualificationAssessment?: {
    qualification: string
    currentLevel: "beginner" | "intermediate" | "advanced" | "expert"
    targetLevel: "beginner" | "intermediate" | "advanced" | "expert"
    evidence: string[]
    developmentPlan: string
  }[]
  lengthOfServiceBonus?: {
    months: number
    bonusPercentage: number
    applied: boolean
  }
  goals?: {
    description: string
    status: "not_started" | "in_progress" | "completed"
    dueDate?: number
    reminder?: {
      frequency: "weekly" | "monthly"
      lastSent?: number
      nextSend?: number
    }
  }[]
  strengths?: string[]
  areasForImprovement?: string[]
  comments?: string
  templateId?: string
  overallScore?: number
  createdAt?: number
  updatedAt?: number
}

// ============================
// Performance Review Templates
// ============================

export type PerformanceTemplateQuestionType = "rating" | "text" | "boolean" | "multiple_choice"

export interface PerformanceReviewTemplateQuestion {
  id: string
  label: string
  type: PerformanceTemplateQuestionType
  required?: boolean
  helperText?: string
  // rating
  maxRating?: number // default 5
  weight?: number // default 1
  // multiple choice
  options?: string[]
}

export interface PerformanceReviewTemplateSection {
  id: string
  title: string
  description?: string
  questions: PerformanceReviewTemplateQuestion[]
}

export interface PerformanceReviewTemplate {
  id: string
  name: string
  description?: string
  sections: PerformanceReviewTemplateSection[]
  isActive: boolean
  createdAt: number
  updatedAt?: number
  createdBy?: string
}

export interface PerformanceReviewAnswer {
  questionId: string
  value: string | number | boolean | null
}

// Stored under `performanceReviews` in RTDB (new template-based system)
export interface PerformanceReviewEntry {
  id: string
  templateId?: string
  templateName?: string
  employeeId: string
  reviewerId: string
  reviewDate: number
  dueDate?: number
  status: "draft" | "in_progress" | "completed"
  answers: PerformanceReviewAnswer[]
  overallScore?: number
  comments?: string
  createdAt: number
  updatedAt?: number
}

export interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  employmentType: "full_time" | "part_time" | "contract" | "temporary"
  description: string
  requirements: string[]
  responsibilities: string[]
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  benefits: string[]
  status: "draft" | "published" | "closed" | "on_hold" | "Draft" | "Published" | "Closed" | "On Hold"
  postedDate: number
  closingDate?: number
  hiringManager: string
  createdAt: number
  updatedAt?: number
  daysToFill?: number
}

export interface Candidate {
  id: string
  jobPostingId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  resumeUrl?: string
  coverLetterUrl?: string
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected"
  source: "website" | "referral" | "linkedin" | "indeed" | "other"
  notes?: string[]
  interviews: {
    id: string
    type: "phone" | "video" | "in_person"
    scheduledDate: number
    interviewer: string
    feedback?: string
    rating?: number
  }[]
  appliedDate: number
  createdAt: number
  updatedAt?: number
}

// Incentives System
export interface Incentive {
  id: string
  title: string
  description: string
  type: "individual" | "team" | "department" | "company"
  category: "sales" | "performance" | "attendance" | "customer_service" | "other"
  criteria: {
    metric: string
    target: number
    period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  }[]
  rewards: {
    type: "monetary" | "time_off" | "recognition" | "gift" | "other"
    value: number
    description: string
  }[]
  startDate: number
  endDate: number
  participants: string[]
  progress: {
    employeeId: string
    currentValue: number
    targetValue: number
    achieved: boolean
  }[]
  status: "active" | "completed" | "paused" | "cancelled"
  createdBy: string
  createdAt: number
  updatedAt?: number
}

export interface VenueBattle {
  id: string
  title: string
  description: string
  participants: string[] // Site IDs
  metrics: {
    name: string
    weight: number
    target?: number
  }[]
  startDate: number
  endDate: number
  leaderboard: {
    siteId: string
    siteName: string
    score: number
    rank: number
    metrics: { name: string; value: number }[]
  }[]
  prizes: {
    rank: number
    reward: string
    value: number
  }[]
  status: "upcoming" | "active" | "completed" | "cancelled"
  createdBy: string
  createdAt: number
  updatedAt?: number
}


export interface Schedule {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  department: string
  role?: string
  notes?: string
  status: "draft" | "scheduled" | "approved" | "confirmed" | "finalized" | "completed" | "cancelled"
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  // Breaks (minutes)
  breakDuration?: number
  breakStartTime?: string
  // Clock in/out tracking
  clockInTime?: string
  clockOutTime?: string
  actualHours?: number
  clockInLocation?: string
  clockOutLocation?: string
  // Approval workflow
  approvedBy?: string
  approvedAt?: string
  confirmedBy?: string
  confirmedAt?: string
  // Hours adjustment
  adjustedHours?: number
  adjustmentReason?: string
  adjustmentApprovedBy?: string
  adjustmentApprovedAt?: string
  weather?: {
    temperature?: number
    condition?: string
    icon?: string
  }
  temperature?: number
  condition?: string
  icon?: string
  salesTarget?: number
  validation?: ScheduleValidation
  createdAt: string
  updatedAt?: string
}

export interface CompanyEvent {
  id: string
  title: string
  description: string
  type: "meeting" | "training" | "social" | "company_wide" | "department" | "celebration"
  startDate: number
  endDate: number
  startTime: string
  endTime: string
  location: string
  isVirtual: boolean
  virtualLink?: string
  organizer: string
  attendees: string[]
  maxAttendees?: number
  isPublic: boolean
  requiresRSVP: boolean
  status: "draft" | "published" | "cancelled" | "completed"
  tags: string[]
  createdAt: number
  updatedAt?: number
}

export interface EventRSVP {
  id: string
  eventId: string
  employeeId: string
  employeeName: string
  status: "attending" | "not_attending" | "maybe"
  responseDate: number
  notes?: string
  createdAt: number
  updatedAt?: number
}

export interface DiversityInitiative {
  id: string
  title: string
  category: "training" | "cultural" | "recruitment" | "accessibility"
  description: string
  status: "active" | "planning" | "completed"
  startDate: string
  endDate: string
  participants: number
  budget: number
  progress: number
  apiRecommendations?: string[] // From Pineapple API
  improvementAreas: string[]
  createdAt: number
  updatedAt?: number
}

export interface DiversitySurvey {
  id: string
  title: string
  date: string
  participants: number
  participationRate: number
  overallScore: number
  keyFindings: string[]
  status: "completed" | "active" | "upcoming"
  createdAt: number
  updatedAt?: number
}


export interface Schedule {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  department: string
  role?: string
  notes?: string
  status: "draft" | "scheduled" | "approved" | "confirmed" | "finalized" | "completed" | "cancelled"
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  // Breaks (minutes)
  breakDuration?: number
  // Clock in/out tracking
  clockInTime?: string
  clockOutTime?: string
  actualHours?: number
  clockInLocation?: string
  clockOutLocation?: string
  // Approval workflow
  approvedBy?: string
  approvedAt?: string
  confirmedBy?: string
  confirmedAt?: string
  // Hours adjustment
  adjustedHours?: number
  adjustmentReason?: string
  adjustmentApprovedBy?: string
  adjustmentApprovedAt?: string
  weather?: {
    temperature?: number
    condition?: string
    icon?: string
  }
  // Database specific fields
  departmentID?: string
  createdAt: string
  updatedAt?: string
}

export interface Interview {
  id: string
  candidateId: string
  jobPostingId: string
  type: "phone" | "video" | "in_person"
  scheduledDate: number
  startTime: string
  endTime: string
  interviewer: string
  interviewerEmail?: string
  location?: string
  meetingLink?: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
  feedback?: string
  rating?: number
  notes?: string
  questions?: string[]
  createdAt: number
  updatedAt?: number
}

export interface ListViewProps {
  filteredSchedules: Schedule[]
  handleEditSchedule: (schedule: Schedule) => void
  handleDeleteSchedule: (id: string) => void
}

// ATS (Applicant Tracking System) Interfaces
export interface Application {
  id: string
  candidateId: string
  jobPostingId: string
  status: "applied" | "screening" | "interview" | "assessment" | "offer" | "hired" | "rejected" | "withdrawn"
  applicationDate: number
  source: "website" | "referral" | "linkedin" | "indeed" | "glassdoor" | "other"
  referredBy?: string
  coverLetter?: string
  resumeUrl?: string
  portfolioUrl?: string
  expectedSalary?: number
  availableStartDate?: number
  notes?: string[]
  tags: string[]
  score?: number
  createdAt: number
  updatedAt?: number
}

export interface ATSPipeline {
  id: string
  name: string
  stages: ATSStage[]
  isDefault: boolean
  createdAt: number
  updatedAt?: number
}

export interface ATSStage {
  id: string
  name: string
  order: number
  color: string
  isRequired: boolean
  autoAdvance?: boolean
  timeLimit?: number // in days
  actions: string[]
}

// Employee Starter Checklist
export interface StarterChecklist {
  id: string
  employeeId: string
  payrollNumber: string
  items: StarterChecklistItem[]
  status: "pending" | "in_progress" | "completed"
  assignedTo: string
  dueDate: number
  completedDate?: number
  createdAt: number
  updatedAt?: number
}

export interface StarterChecklistItem {
  id: string
  title: string
  description: string
  category: "documentation" | "equipment" | "training" | "access" | "other"
  isRequired: boolean
  completed: boolean
  completedBy?: string
  completedAt?: number
  notes?: string
  documents?: string[]
}

// Wage Stream Integration
export interface WageStreamRequest {
  id: string
  employeeId: string
  amount: number
  requestDate: number
  status: "pending" | "approved" | "rejected" | "paid"
  approvedBy?: string
  approvedAt?: number
  paymentDate?: number
  fees: number
  netAmount: number
  reason?: string
  createdAt: number
  updatedAt?: number
}

// Pleo-like Expense Management
export interface ExpenseReport {
  id: string
  employeeId: string
  employeeName: string
  title: string
  description?: string
  totalAmount: number
  currency: string
  status: "draft" | "submitted" | "approved" | "rejected" | "reimbursed"
  submittedDate?: number
  approvedBy?: string
  approvedDate?: number
  receipts: ExpenseReceipt[]
  categories: string[]
  businessPurpose: string
  createdAt: number
  updatedAt?: number
}

export interface ExpenseReceipt {
  id: string
  expenseReportId: string
  amount: number
  currency: string
  date: number
  vendor: string
  category: string
  description: string
  receiptUrl: string
  isPersonal: boolean
  taxDeductible: boolean
  createdAt: number
}

// Clock In/Out System
export interface ClockEntry {
  id: string
  employeeId: string
  employeeName: string
  type: "clock_in" | "clock_out" | "break_start" | "break_end"
  timestamp: number
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  photo?: string
  notes?: string
  approved: boolean
  approvedBy?: string
  createdAt: number
}

export interface ShiftFeedback {
  id: string
  employeeId: string
  shiftId: string
  date: number
  questions: {
    question: string
    answer: string
    type: "text" | "rating" | "boolean" | "multiple_choice"
  }[]
  overallRating?: number
  comments?: string
  submittedAt: number
}

export interface ClockInMessage {
  id: string
  title: string
  content: string
  type: "announcement" | "reminder" | "alert" | "info"
  targetType: "all" | "role" | "department" | "user"
  targetValue?: string
  startDate: number
  endDate?: number
  priority: "low" | "medium" | "high" | "urgent"
  active: boolean
  createdBy: string
  createdAt: number
  updatedAt?: number
}

// Schedule Validation
export interface ScheduleValidation {
  employeeId: string
  date: string
  violations: {
    type: "min_hours" | "max_hours" | "gap_11hr" | "gap_8hr_no_permission"
    message: string
    severity: "warning" | "error"
  }[]
  totalHours: number
  gapBetweenShifts?: number
  hasPermissionFor8HrGap?: boolean
}

// Benefits System
export interface BenefitPlan {
  id: string
  name: string
  description: string
  type: "health" | "dental" | "vision" | "life" | "retirement" | "pto" | "insurance" | "other"
  provider: string
  isStatic: boolean
  eligibilityRules: {
    afterMonths?: number
    minimumHours?: number
    employmentTypes: string[]
  }
  rewards: {
    condition: string // "after_x_get_x"
    benefit: string
    value: number
  }[]
  links: {
    title: string
    url: string
    description?: string
  }[]
  active: boolean
  createdAt: number
  updatedAt?: number
}

// Risk Management (formerly Compliance)
export interface RiskAssessment {
  id: string
  title: string
  category: "health_safety" | "financial" | "operational" | "legal" | "cyber" | "other"
  riskLevel: "low" | "medium" | "high" | "critical"
  probability: number // 1-5
  impact: number // 1-5
  description: string
  mitigationSteps: string[]
  assignedTo: string[]
  dueDate: number
  status: "identified" | "assessing" | "mitigating" | "monitoring" | "closed"
  lastReviewDate?: number
  nextReviewDate?: number
  createdBy: string
  createdAt: number
  updatedAt?: number
}

// DEI (Diversity, Equality & Inclusion)
export interface DEIMetrics {
  id: string
  period: string
  demographics: {
    age: { range: string; count: number; percentage: number }[]
    gender: { type: string; count: number; percentage: number }[]
    ethnicity: { type: string; count: number; percentage: number }[]
    byRole: {
      role: string
      demographics: {
        age: { range: string; count: number }[]
        gender: { type: string; count: number }[]
        ethnicity: { type: string; count: number }[]
      }
    }[]
  }
  inclusionScore: number
  recommendations: string[]
  generatedAt: number
  apiSource?: string
}

export interface DEIInitiative {
  id: string
  title: string
  description: string
  category: "recruitment" | "training" | "policy" | "culture" | "accessibility" | "other"
  targetMetrics: string[]
  timeline: {
    startDate: number
    endDate: number
    milestones: {
      title: string
      date: number
      completed: boolean
    }[]
  }
  budget?: number
  participants: string[]
  progress: number
  status: "planning" | "active" | "completed" | "paused" | "cancelled"
  createdBy: string
  createdAt: number
  updatedAt?: number
}

// Employee Analytics
export interface EmployeeAnalytics {
  totalEmployees: number
  turnoverRate: number
  averageTenure: number
  birthdays: {
    today: Employee[]
    thisWeek: Employee[]
    thisMonth: Employee[]
  }
  workAnniversaries: {
    today: Employee[]
    thisWeek: Employee[]
    thisMonth: Employee[]
  }
  onboardingProgress: {
    pending: number
    inProgress: number
    completed: number
  }
  departmentBreakdown: {
    department: string
    count: number
    percentage: number
  }[]
  generatedAt: number
}

// Contract Management
export interface Contract {
  id: string
  employeeId: string
  type: "permanent" | "fixed_term" | "casual" | "apprentice" | "intern"
  startDate: number
  endDate?: number
  probationPeriod?: number // in months
  probationEndDate?: number
  salary: number
  benefits: string[]
  terms: string[]
  workingHours?: string
  holidayEntitlement?: string
  status: "draft" | "sent" | "signed" | "active" | "expired" | "terminated"
  signedDate?: number
  documentUrl?: string
  autoRenew?: boolean
  renewalNoticeDate?: number
  createdBy: string
  createdAt: number
  updatedAt?: number
  // New fields for templating and role linkage
  templateId?: string
  roleId?: string
  roleName?: string
  contractTitle?: string
  bodyHtml?: string
}

// Contract Templates, typically defined per role with placeholders
export interface ContractTemplate {
  id: string
  name: string
  roleId?: string
  roleName?: string
  description?: string
  defaultType: "permanent" | "fixed_term" | "casual" | "apprentice" | "intern"
  defaultProbationMonths?: number
  defaultBenefits?: string[]
  baseSalaryFromRole?: boolean
  terms: string[]
  bodyHtml: string // supports placeholders like {{employee.firstName}}, {{role.name}}, {{salary}}
  active: boolean
  createdBy: string
  createdAt: number
  updatedAt?: number
}

// Ad Hoc Reports
export interface AdHocReport {
  id: string
  title: string
  description: string
  type: "employee" | "payroll" | "attendance" | "performance" | "diversity" | "custom"
  filters: {
    dateRange?: { start: number; end: number }
    departments?: string[]
    roles?: string[]
    employmentTypes?: string[]
    customFilters?: { field: string; operator: string; value: any }[]
  }
  columns: string[]
  data: any[]
  generatedBy: string
  generatedAt: number
  format: "table" | "chart" | "export"
  exportUrl?: string
}

// Generic HR Action Handler Interface
export interface HRActionParams<T = any> {
  companyId: string
  siteId: string
  action: "fetch" | "create" | "edit" | "delete"
  entity: "jobs" | "candidates" | "interviews" | "trainings" | "timeOffs" | "warnings" | "attendances" | "complianceTasks" | "announcements" | "payrolls" | "payrollPeriods" | "reviews" | "reviewTemplates" | "schedules" | "departments" | "roles" | "benefits" | "employeeBenefits" | "events" | "eventRsvps" | "diversityInitiatives" | "diversitySurveys" | "wageStreamRequests" | "expenseReports" | "expenseReceipts" | "starterChecklists" | "incentives" | "venueBattles" | "contracts" | "contractTemplates"
  id?: string
  data?: Partial<T>
  employeeId?: string
  benefitId?: string
}

// HR Analytics Interface
export interface HRAnalytics {
  totalEmployees: number
  activeEmployees: number
  pendingTimeOffRequests: number
  completedTrainings: number
  averagePerformanceScore: number
  departmentDistribution: Record<string, number>
  turnoverRate: number
  lastUpdated: number
}

// Service Charge Allocation Interfaces
export interface ServiceChargeAllocation {
  id: string
  payPeriodId: string
  payPeriodStart: string
  payPeriodEnd: string
  totalServiceCharge: number
  totalTips: number
  allocationMethod: "role_based" | "flat_rate" | "pot_system" | "points" | "percentage" | "hybrid"
  // Role-based allocation rules
  roleBasedRules?: ServiceChargeRoleRule[]
  // Flat rate allocation
  flatRateAmount?: number
  // Pot system allocation (remainder after role-based/flat rate)
  potSystemEnabled?: boolean
  potSystemMethod?: "hours_points" | "hours_only" | "points_only"
  // Legacy allocation methods
  pointsTotal?: number
  percentageTotal?: number
  hybridPointsWeight?: number // 0-1, percentage of allocation by points
  hybridPercentageWeight?: number // 0-1, percentage of allocation by percentage
  status: "draft" | "pending" | "approved" | "finalized" | "cancelled"
  createdAt: string
  updatedAt?: string
  finalizedAt?: string
  finalizedBy?: string
  notes?: string
  auditTrail: ServiceChargeAuditEntry[]
  // Sales data for role-based allocation
  employeeSales?: Record<string, number> // employeeId -> sales amount
}

export interface ServiceChargeRoleRule {
  id: string
  role: string
  department?: string
  allocationType: "percentage_of_sales" | "flat_rate" | "percentage_of_total"
  percentage?: number // e.g., 45 for 45% of their sales
  flatAmount?: number
  minimumSales?: number // Minimum sales required to be eligible
  maximumAllocation?: number // Cap on allocation amount
}

export interface ServiceChargeEmployeeAllocation {
  id: string
  allocationId: string
  employeeId: string
  employeeName: string
  department: string
  role: string
  points?: number
  percentage?: number
  allocatedAmount: number
  baseSalary: number
  grossPay: number
  deductions: {
    tax: number
    nationalInsurance: number
    pension: number
    insurance: number
    other: number
  }
  totalDeductions: number
  netPay: number
  status: "pending" | "approved" | "paid"
  notes?: string
}

export interface ServiceChargeAuditEntry {
  id: string
  allocationId: string
  action: "created" | "updated" | "approved" | "finalized" | "adjusted" | "reversed"
  performedBy: string
  performedAt: string
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  notes?: string
}

export interface ServiceChargeFormData {
  id?: string
  payPeriodStart: Date | null
  payPeriodEnd: Date | null
  totalServiceCharge: number
  totalTips: number
  allocationMethod: "points" | "percentage" | "hybrid"
  hybridPointsWeight?: number
  hybridPercentageWeight?: number
  employeeAllocations: ServiceChargeEmployeeAllocationFormData[]
  notes?: string
}

export interface ServiceChargeEmployeeAllocationFormData {
  id?: string
  employeeId: string
  employeeName?: string
  department?: string
  role?: string
  points?: number
  percentage?: number
  baseSalary: number
  notes?: string
}

export interface TipPoolingConfig {
  id: string
  name: string
  description: string
  isActive: boolean
  allocationRules: TipPoolingRule[]
  createdAt: string
  updatedAt?: string
}

export interface TipPoolingRule {
  id: string
  poolId: string
  role: string
  department?: string
  allocationPercentage: number
  minimumHours?: number
  isEligible: boolean
}

export interface ServiceChargeValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  totalPoints?: number
  totalPercentage?: number
  pointsValue?: number
  percentageValue?: number
}
