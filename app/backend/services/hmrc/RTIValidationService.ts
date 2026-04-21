/**
 * RTI Validation Service
 * Validates payroll data before HMRC submission
 */

import { Payroll } from '../../interfaces/HRs'
import { Employee } from '../../interfaces/HRs'
import { FPSSubmissionData } from './types'

export interface RTIValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class RTIValidationService {
  /**
   * Validate payroll record for FPS submission
   */
  validatePayrollForFPS(payroll: Payroll, employee: Employee): RTIValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required employee fields
    if (!employee.nationalInsuranceNumber) {
      errors.push(`Employee ${employee.id} (${employee.firstName} ${employee.lastName}): Missing National Insurance Number`)
    } else {
      const niNumber = employee.nationalInsuranceNumber.replace(/\s/g, '').toUpperCase()
      if (niNumber.length !== 9 || !/^[A-Z]{2}[0-9]{6}[A-Z]?$/.test(niNumber)) {
        warnings.push(`Employee ${employee.id}: NI number format may be invalid: ${niNumber}`)
      }
    }

    // Required payroll fields
    if (!payroll.taxYear) {
      errors.push(`Payroll ${payroll.id}: Missing tax year`)
    }

    if (!payroll.taxPeriod || payroll.taxPeriod < 1) {
      errors.push(`Payroll ${payroll.id}: Invalid tax period (${payroll.taxPeriod})`)
    }

    if (!payroll.periodType) {
      errors.push(`Payroll ${payroll.id}: Missing period type`)
    }

    if (!payroll.taxCode) {
      warnings.push(`Payroll ${payroll.id}: Missing tax code, will use default '1257L'`)
    }

    if (!payroll.niCategory) {
      warnings.push(`Payroll ${payroll.id}: Missing NI category, will use default 'A'`)
    }

    // Validate amounts are numbers
    if (typeof payroll.grossPay !== 'number' || isNaN(payroll.grossPay)) {
      errors.push(`Payroll ${payroll.id}: Invalid gross pay`)
    }

    if (typeof payroll.taxableGrossPay !== 'number' || isNaN(payroll.taxableGrossPay)) {
      errors.push(`Payroll ${payroll.id}: Invalid taxable gross pay`)
    }

    if (typeof payroll.taxDeductions !== 'number' || isNaN(payroll.taxDeductions)) {
      errors.push(`Payroll ${payroll.id}: Invalid tax deductions`)
    }

    if (typeof payroll.employeeNIDeductions !== 'number' || isNaN(payroll.employeeNIDeductions)) {
      errors.push(`Payroll ${payroll.id}: Invalid employee NI deductions`)
    }

    if (typeof payroll.employerNIContributions !== 'number' || isNaN(payroll.employerNIContributions)) {
      errors.push(`Payroll ${payroll.id}: Invalid employer NI contributions`)
    }

    // Validate YTD data exists
    if (!payroll.ytdData) {
      errors.push(`Payroll ${payroll.id}: Missing YTD data`)
    } else {
      if (typeof payroll.ytdData.grossPayYTD !== 'number' || isNaN(payroll.ytdData.grossPayYTD)) {
        errors.push(`Payroll ${payroll.id}: Invalid YTD gross pay`)
      }

      if (typeof payroll.ytdData.taxPaidYTD !== 'number' || isNaN(payroll.ytdData.taxPaidYTD)) {
        errors.push(`Payroll ${payroll.id}: Invalid YTD tax paid`)
      }

      if (typeof payroll.ytdData.employeeNIPaidYTD !== 'number' || isNaN(payroll.ytdData.employeeNIPaidYTD)) {
        errors.push(`Payroll ${payroll.id}: Invalid YTD employee NI`)
      }

      if (typeof payroll.ytdData.employerNIPaidYTD !== 'number' || isNaN(payroll.ytdData.employerNIPaidYTD)) {
        errors.push(`Payroll ${payroll.id}: Invalid YTD employer NI`)
      }
    }

    // Validate payment date
    if (!payroll.paymentDate && !payroll.periodEndDate) {
      warnings.push(`Payroll ${payroll.id}: No payment date set, will use period end date`)
    }

    // Check for negative values (shouldn't happen, but warn)
    if (payroll.grossPay < 0) {
      warnings.push(`Payroll ${payroll.id}: Gross pay is negative`)
    }

    if (payroll.taxDeductions < 0) {
      warnings.push(`Payroll ${payroll.id}: Tax deductions are negative`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate FPS submission data
   */
  validateFPSSubmission(data: FPSSubmissionData): RTIValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate employer references
    if (!data.employerPAYEReference) {
      errors.push('Missing employer PAYE reference')
    } else if (!/^\d{3}\/[A-Z]{2}\d{6}$/.test(data.employerPAYEReference)) {
      warnings.push(`PAYE reference format may be invalid: ${data.employerPAYEReference}`)
    }

    if (!data.accountsOfficeReference) {
      errors.push('Missing Accounts Office reference')
    } else if (!/^\d{3}PA\d{9}$/.test(data.accountsOfficeReference)) {
      warnings.push(`Accounts Office reference format may be invalid: ${data.accountsOfficeReference}`)
    }

    // Validate tax year format
    if (!data.taxYear || !/^\d{4}-\d{2}$/.test(data.taxYear)) {
      errors.push(`Invalid tax year format: ${data.taxYear}`)
    }

    // Validate period
    if (!data.periodNumber || data.periodNumber < 1) {
      errors.push(`Invalid period number: ${data.periodNumber}`)
    }

    if (!data.periodType) {
      errors.push('Missing period type')
    }

    // Validate dates
    if (!data.paymentDate) {
      errors.push('Missing payment date')
    } else {
      const paymentDate = new Date(data.paymentDate)
      if (isNaN(paymentDate.getTime())) {
        errors.push(`Invalid payment date: ${data.paymentDate}`)
      }
    }

    if (!data.submissionDate) {
      errors.push('Missing submission date')
    } else {
      const submissionDate = new Date(data.submissionDate)
      if (isNaN(submissionDate.getTime())) {
        errors.push(`Invalid submission date: ${data.submissionDate}`)
      }
    }

    // Validate payroll records
    if (!data.payrollRecords || data.payrollRecords.length === 0) {
      errors.push('No payroll records to submit')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

