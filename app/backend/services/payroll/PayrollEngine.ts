/**
 * Main Payroll Calculation Engine
 * Orchestrates all payroll calculations in correct order
 * HMRC Compliant - Full RTI Support
 */

import { 
  PayrollCalculationInput, 
  PayrollCalculationResult,
  EmployeeYTDData,
  ValidationResult 
} from './types'
import { TaxCalculationEngine, validateTaxCode } from './TaxCalculation'
import { NICalculationEngine, validateNICategory } from './NICalculation'
import { StudentLoanCalculationEngine, validateStudentLoanPlan } from './StudentLoanCalculation'
import { PensionCalculationEngine, validatePensionContribution } from './PensionCalculation'
import { TaxYearConfiguration } from '../../interfaces/Company'

export class PayrollEngine {
  private taxEngine: TaxCalculationEngine
  private niEngine: NICalculationEngine
  private studentLoanEngine: StudentLoanCalculationEngine
  private pensionEngine: PensionCalculationEngine
  
  constructor() {
    this.taxEngine = new TaxCalculationEngine()
    this.niEngine = new NICalculationEngine()
    this.studentLoanEngine = new StudentLoanCalculationEngine()
    this.pensionEngine = new PensionCalculationEngine()
  }
  
  /**
   * Calculate full payroll for an employee
   */
  calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const calculationLog: string[] = []
    calculationLog.push(`=== Payroll Calculation for ${input.employee.firstName} ${input.employee.lastName} ===`)
    calculationLog.push(`Period: ${new Date(input.payPeriodStart).toISOString().split('T')[0]} to ${new Date(input.payPeriodEnd).toISOString().split('T')[0]}`)
    calculationLog.push(`Period Type: ${input.periodType}, Period Number: ${input.periodNumber}`)
    
    // 1. Calculate Gross Pay
    const grossPay = this.calculateGrossPay(input)
    calculationLog.push(`Gross Pay: £${grossPay.toFixed(2)}`)
    
    // 2. Calculate Tax
    const taxCalculation = this.taxEngine.calculateTax(
      input.employee,
      grossPay,
      input.periodNumber,
      input.periodType,
      input.taxYearConfig,
      input.employeeYTD
    )
    calculationLog.push(taxCalculation.calculation)
    
    // 3. Calculate National Insurance
    const niCalculation = this.niEngine.calculateNI(
      input.employee,
      grossPay,
      input.periodNumber,
      input.periodType as any,
      input.taxYearConfig,
      input.employeeYTD
    )
    calculationLog.push(niCalculation.calculation)
    
    // 4. Calculate Student Loans
    const studentLoanCalculation = this.studentLoanEngine.calculateStudentLoan(
      input.employee,
      grossPay,
      input.periodType,
      input.taxYearConfig,
      input.employeeYTD
    )
    calculationLog.push(studentLoanCalculation.calculation)
    
    // 5. Calculate Pension
    const pensionCalculation = this.pensionEngine.calculatePension(
      input.employee,
      grossPay,
      input.periodType,
      input.taxYearConfig,
      input.employeeYTD
    )
    calculationLog.push(pensionCalculation.calculation)
    
    // 6. Calculate Total Deductions and Net Pay
    const totalDeductions = 
      taxCalculation.taxDueThisPeriod +
      niCalculation.employeeNIThisPeriod +
      studentLoanCalculation.totalDeduction +
      pensionCalculation.employeeContribution
    
    const netPay = grossPay - totalDeductions
    
    calculationLog.push(`Total Deductions: £${totalDeductions.toFixed(2)}`)
    calculationLog.push(`Net Pay: £${netPay.toFixed(2)}`)
    
    // 7. Update YTD Figures
    const updatedYTD = this.updateYTD(
      input.employeeYTD,
      grossPay,
      taxCalculation,
      niCalculation,
      studentLoanCalculation,
      pensionCalculation
    )
    
    return {
      grossPayBeforeDeductions: grossPay,
      taxableGrossPay: grossPay, // Can be adjusted for salary sacrifice etc.
      niableGrossPay: grossPay,
      pensionableGrossPay: grossPay,
      
      taxCalculation,
      niCalculation,
      studentLoanCalculation,
      pensionCalculation,
      
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      
      updatedYTD,
      calculationLog
    }
  }
  
  /**
   * Calculate total gross pay including bonuses, commission, etc.
   */
  private calculateGrossPay(input: PayrollCalculationInput): number {
    let gross = input.grossPay
    
    if (input.bonuses) gross += input.bonuses
    if (input.commission) gross += input.commission
    if (input.troncPayment) gross += input.troncPayment
    if (input.holidayPay) gross += input.holidayPay
    if (input.otherPayments) gross += input.otherPayments
    
    return gross
  }
  
  /**
   * Update Year-to-Date figures
   */
  private updateYTD(
    currentYTD: EmployeeYTDData,
    grossPay: number,
    tax: any,
    ni: any,
    studentLoan: any,
    pension: any
  ): EmployeeYTDData {
    return {
      grossPayYTD: currentYTD.grossPayYTD + grossPay,
      taxablePayYTD: currentYTD.taxablePayYTD + grossPay,
      taxPaidYTD: tax.taxPaidYTD,
      niablePayYTD: currentYTD.niablePayYTD + grossPay,
      employeeNIPaidYTD: ni.employeeNIYTD,
      employerNIPaidYTD: ni.employerNIYTD,
      pensionablePayYTD: currentYTD.pensionablePayYTD + grossPay,
      employeePensionYTD: pension.employeeYTD,
      employerPensionYTD: pension.employerYTD,
      studentLoanPlan1YTD: studentLoan.plans.find((p: any) => p.plan === 'plan1')?.ytd || currentYTD.studentLoanPlan1YTD,
      studentLoanPlan2YTD: studentLoan.plans.find((p: any) => p.plan === 'plan2')?.ytd || currentYTD.studentLoanPlan2YTD,
      studentLoanPlan4YTD: studentLoan.plans.find((p: any) => p.plan === 'plan4')?.ytd || currentYTD.studentLoanPlan4YTD,
      postgraduateLoanYTD: studentLoan.plans.find((p: any) => p.plan === 'postgraduate')?.ytd || currentYTD.postgraduateLoanYTD
    }
  }
  
  /**
   * Validate payroll input before calculation
   */
  validateInput(input: PayrollCalculationInput): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validate employee data
    if (!input.employee.id) {
      errors.push('Employee ID is required')
    }
    
    if (!input.employee.nationalInsuranceNumber) {
      errors.push('National Insurance Number is required')
    } else {
      const niValidation = this.validateNINumber(input.employee.nationalInsuranceNumber)
      if (!niValidation.valid) {
        errors.push(niValidation.error!)
      }
    }
    
    // Validate tax code
    if (input.employee.taxCode) {
      const taxCodeValidation = validateTaxCode(input.employee.taxCode)
      if (!taxCodeValidation.valid) {
        errors.push(taxCodeValidation.error!)
      }
    } else {
      warnings.push('No tax code provided, using default 1257L')
    }
    
    // Validate NI category
    if (input.employee.niCategory) {
      const niCategoryValidation = validateNICategory(input.employee.niCategory)
      if (!niCategoryValidation.valid) {
        errors.push(niCategoryValidation.error!)
      }
    } else {
      warnings.push('No NI category provided, using default Category A')
    }
    
    // Validate student loan
    if (input.employee.studentLoanPlan) {
      const loanValidation = validateStudentLoanPlan(input.employee.studentLoanPlan)
      if (!loanValidation.valid) {
        errors.push(loanValidation.error!)
      }
    }
    
    // Validate pension
    if (input.employee.autoEnrolmentStatus === 'enrolled' && input.employee.pensionContributionPercentage) {
      const pensionValidation = validatePensionContribution(input.employee.pensionContributionPercentage)
      if (!pensionValidation.valid) {
        errors.push(pensionValidation.error!)
      }
    }
    
    // Validate gross pay
    if (input.grossPay < 0) {
      errors.push('Gross pay cannot be negative')
    }
    
    // Validate period
    if (input.periodNumber < 1) {
      errors.push('Period number must be at least 1')
    }
    
    if (input.periodType === 'weekly' && input.periodNumber > 53) {
      errors.push('Period number cannot exceed 53 for weekly periods')
    }
    
    if (input.periodType === 'monthly' && input.periodNumber > 12) {
      errors.push('Period number cannot exceed 12 for monthly periods')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate UK National Insurance Number format
   */
  private validateNINumber(niNumber: string): { valid: boolean; error?: string } {
    const pattern = /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i
    
    if (!pattern.test(niNumber.replace(/\s/g, ''))) {
      return {
        valid: false,
        error: 'Invalid NI number format. Expected: AB123456C'
      }
    }
    
    return { valid: true }
  }
}

/**
 * Create default YTD data for a new employee
 */
export function createDefaultYTD(): EmployeeYTDData {
  return {
    grossPayYTD: 0,
    taxablePayYTD: 0,
    taxPaidYTD: 0,
    niablePayYTD: 0,
    employeeNIPaidYTD: 0,
    employerNIPaidYTD: 0,
    pensionablePayYTD: 0,
    employeePensionYTD: 0,
    employerPensionYTD: 0,
    studentLoanPlan1YTD: 0,
    studentLoanPlan2YTD: 0,
    studentLoanPlan4YTD: 0,
    postgraduateLoanYTD: 0
  }
}

/**
 * Get default tax year configuration for 2024/25
 */
export function getDefaultTaxYearConfig(): TaxYearConfiguration {
  return {
    taxYear: '2024-25',
    effectiveFrom: new Date('2024-04-06').getTime(),
    effectiveTo: new Date('2025-04-05').getTime(),
    
    // England & NI Tax Rates
    personalAllowance: 12570,
    personalAllowanceMonthly: 1047.50,
    basicRateLimit: 50270,
    higherRateLimit: 125140,
    basicRate: 0.20,
    higherRate: 0.40,
    additionalRate: 0.45,
    
    // Scottish Tax Rates
    scottishStarterRate: 0.19,
    scottishBasicRate: 0.20,
    scottishIntermediateRate: 0.21,
    scottishHigherRate: 0.42,
    scottishTopRate: 0.47,
    scottishBands: {
      starterLimit: 14876,
      basicLimit: 26561,
      intermediateLimit: 43662,
      higherLimit: 75000
    },
    
    // Welsh Tax Rates
    welshBasicRate: 0.20,
    welshHigherRate: 0.40,
    welshAdditionalRate: 0.45,
    
    // National Insurance
    niPrimaryThresholdAnnual: 12570,
    niPrimaryThresholdMonthly: 1048,
    niPrimaryThresholdWeekly: 242,
    niUpperEarningsLimitAnnual: 50270,
    niUpperEarningsLimitMonthly: 4189,
    niUpperEarningsLimitWeekly: 967,
    niPrimaryRate: 0.12,
    niPrimaryRateAboveUEL: 0.02,
    
    niSecondaryThresholdAnnual: 9100,
    niSecondaryThresholdMonthly: 758,
    niSecondaryThresholdWeekly: 175,
    niEmployerRate: 0.138,
    
    niApprenticeUpperSecondaryThresholdAnnual: 50270,
    niApprenticeRate: 0,
    
    // Student Loans
    studentLoanPlan1ThresholdAnnual: 22015,
    studentLoanPlan2ThresholdAnnual: 27295,
    studentLoanPlan4ThresholdAnnual: 27660,
    postgraduateLoanThresholdAnnual: 21000,
    studentLoanRate: 0.09,
    postgraduateLoanRate: 0.06,
    
    // Pension Auto-Enrolment
    autoEnrolmentLowerLimitAnnual: 6240,
    autoEnrolmentUpperLimitAnnual: 50270,
    autoEnrolmentEarningsThresholdAnnual: 10000,
    minimumEmployeeContribution: 0.05,
    minimumEmployerContribution: 0.03,
    totalMinimumContribution: 0.08,
    
    // Statutory Payments
    statutorySickPayWeekly: 116.75,
    statutoryMaternityPayWeekly: 184.03,
    statutoryPaternityPayWeekly: 184.03,
    statutoryAdoptionPayWeekly: 184.03,
    statutorySharedParentalPayWeekly: 184.03,
    statutoryParentalBereavementPayWeekly: 184.03,
    smpHigherRate: 0.90,
    
    // Apprenticeship Levy
    apprenticeshipLevyRate: 0.005,
    apprenticeshipLevyAllowance: 15000,
    apprenticeshipLevyThreshold: 3000000,
    
    // Metadata
    isActive: true,
    createdAt: Date.now()
  }
}

