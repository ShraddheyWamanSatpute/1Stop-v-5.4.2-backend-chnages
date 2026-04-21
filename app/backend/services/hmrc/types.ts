/**
 * HMRC RTI Submission Types
 * Types for HMRC Real Time Information (RTI) submissions
 */

import { Payroll } from '../../interfaces/HRs'

/**
 * HMRC OAuth 2.0 Token Response
 */
export interface HMRCTokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
}

/**
 * HMRC API Error Response
 */
export interface HMRCErrorResponse {
  code: string
  message: string
  path?: string
  errors?: Array<{
    code: string
    message: string
    path: string
  }>
}

/**
 * FPS (Full Payment Submission) Result
 */
export interface FPSSubmissionResult {
  success: boolean
  submissionId?: string
  correlationId?: string
  status: 'accepted' | 'rejected' | 'pending'
  errors?: HMRCErrorResponse[]
  warnings?: string[]
  submittedAt: number
  responseBody?: any
}

/**
 * EPS (Employer Payment Summary) Result
 */
export interface EPSSubmissionResult {
  success: boolean
  submissionId?: string
  correlationId?: string
  status: 'accepted' | 'rejected' | 'pending'
  errors?: HMRCErrorResponse[]
  warnings?: string[]
  submittedAt: number
  responseBody?: any
}

/**
 * EYU (Earlier Year Update) Result
 */
export interface EYUSubmissionResult {
  success: boolean
  submissionId?: string
  correlationId?: string
  status: 'accepted' | 'rejected' | 'pending'
  errors?: HMRCErrorResponse[]
  warnings?: string[]
  submittedAt: number
  responseBody?: any
}

/**
 * FPS Submission Data
 */
export interface FPSSubmissionData {
  payrollRecords: Payroll[]
  employerPAYEReference: string
  accountsOfficeReference: string
  taxYear: string
  periodNumber: number
  periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
  paymentDate: string // ISO date format
  submissionDate: string // ISO date format
}

/**
 * EPS Submission Data
 */
export interface EPSSubmissionData {
  employerPAYEReference: string
  accountsOfficeReference: string
  taxYear: string
  periodNumber: number
  periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
  
  // No payment periods
  noPaymentForPeriod?: boolean
  
  // Statutory payment recovery
  statutoryPayRecovery?: {
    smp?: number // Statutory Maternity Pay
    spp?: number // Statutory Paternity Pay
    sap?: number // Statutory Adoption Pay
    shpp?: number // Shared Parental Pay
    aspp?: number // Additional Statutory Paternity Pay
  }
  
  // Employment Allowance
  employmentAllowance?: {
    claimed: boolean
    amount: number
  }
  
  // CIS deductions
  cisDeductions?: number
  
  // Apprenticeship Levy
  apprenticeshipLevy?: {
    amount: number
    allowance: number
  }
  
  submissionDate: string
}

/**
 * EYU Submission Data (for corrections to closed tax years)
 */
export interface EYUSubmissionData {
  employerPAYEReference: string
  accountsOfficeReference: string
  taxYear: string // The tax year being corrected
  employeeId: string
  originalPayrollId: string
  corrections: {
    grossPay?: number
    taxDeductions?: number
    niDeductions?: number
    studentLoanDeductions?: number
    pensionDeductions?: number
  }
  reason: string
  submissionDate: string
}

/**
 * Fraud Prevention Headers
 */
export interface FraudPreventionHeaders {
  'Gov-Client-Connection-Method': string
  'Gov-Client-Device-ID': string
  'Gov-Client-User-IDs': string
  'Gov-Client-Timezone': string
  'Gov-Client-Local-IPs': string
  'Gov-Client-Screens': string
  'Gov-Client-Window-Size': string
  'Gov-Client-Browser-Plugins': string
  'Gov-Client-Browser-JS-User-Agent': string
  'Gov-Client-Browser-Do-Not-Track': string
  'Gov-Client-Multi-Factor': string
}

/**
 * HMRC Submission Status
 */
export interface HMRCSubmissionStatus {
  submissionId: string
  type: 'FPS' | 'EPS' | 'EYU'
  status: 'pending' | 'accepted' | 'rejected' | 'processing'
  submittedAt: number
  processedAt?: number
  errors?: HMRCErrorResponse[]
  warnings?: string[]
}

/**
 * RTI Submission Configuration
 */
export interface RTISubmissionConfig {
  environment: 'sandbox' | 'production'
  employerPAYEReference: string
  accountsOfficeReference: string
  autoSubmit: boolean
  requireApproval: boolean
  submissionLeadTime: number // Days before payment date
}

