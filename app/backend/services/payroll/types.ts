// Payroll Calculation Service Types

import { Employee } from '../../interfaces/HRs'
import { TaxYearConfiguration } from '../../interfaces/Company'

export interface PayrollCalculationInput {
  employee: Employee
  grossPay: number
  payPeriodStart: number
  payPeriodEnd: number
  periodNumber: number // 1-52 for weekly, 1-12 for monthly
  periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
  taxYearConfig: TaxYearConfiguration
  employeeYTD: EmployeeYTDData
  bonuses?: number
  commission?: number
  troncPayment?: number
  holidayPay?: number
  otherPayments?: number
}

export interface EmployeeYTDData {
  grossPayYTD: number
  taxablePayYTD: number
  taxPaidYTD: number
  niablePayYTD: number
  employeeNIPaidYTD: number
  employerNIPaidYTD: number
  pensionablePayYTD: number
  employeePensionYTD: number
  employerPensionYTD: number
  studentLoanPlan1YTD?: number
  studentLoanPlan2YTD?: number
  studentLoanPlan4YTD?: number
  postgraduateLoanYTD?: number
}

export interface PayrollCalculationResult {
  // Gross Pay Breakdown
  grossPayBeforeDeductions: number
  taxableGrossPay: number
  niableGrossPay: number
  pensionableGrossPay: number
  
  // Tax Calculation
  taxCalculation: TaxCalculationResult
  
  // NI Calculation
  niCalculation: NICalculationResult
  
  // Student Loan Calculation
  studentLoanCalculation: StudentLoanCalculationResult
  
  // Pension Calculation
  pensionCalculation: PensionCalculationResult
  
  // Total Deductions
  totalDeductions: number
  netPay: number
  
  // Updated YTD
  updatedYTD: EmployeeYTDData
  
  // Calculation Log
  calculationLog: string[]
}

export interface TaxCalculationResult {
  taxCode: string
  taxCodeBasis: 'cumulative' | 'week1month1'
  taxablePayThisPeriod: number
  taxDueThisPeriod: number
  taxPaidYTD: number
  personalAllowanceUsed: number
  taxBands: Array<{
    band: string
    rate: number
    amount: number
    taxOnBand: number
  }>
  calculation: string
}

export interface NICalculationResult {
  niCategory: string
  isDirector: boolean
  calculationMethod: 'standard' | 'annual' | 'alternative'
  
  // Employee NI
  employeeNIThisPeriod: number
  employeeNIRate: number
  employeeNIYTD: number
  
  // Employer NI
  employerNIThisPeriod: number
  employerNIRate: number
  employerNIYTD: number
  
  // Thresholds used
  primaryThreshold: number
  upperEarningsLimit: number
  secondaryThreshold: number
  
  calculation: string
}

export interface StudentLoanCalculationResult {
  hasStudentLoan: boolean
  plans: Array<{
    plan: 'plan1' | 'plan2' | 'plan4' | 'postgraduate'
    threshold: number
    rate: number
    deduction: number
    ytd: number
  }>
  totalDeduction: number
  calculation: string
}

export interface PensionCalculationResult {
  isEnrolled: boolean
  qualifyingEarnings: number
  lowerLimit: number
  upperLimit: number
  
  // Employee Contribution
  employeeContribution: number
  employeeRate: number
  employeeYTD: number
  
  // Employer Contribution
  employerContribution: number
  employerRate: number
  employerYTD: number
  
  calculation: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

