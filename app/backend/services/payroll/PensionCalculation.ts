/**
 * UK Pension Auto-Enrolment Calculation Engine
 * Compliant with Workplace Pension Regulations
 * 
 * Calculates pension contributions on qualifying earnings only
 * Supports auto-enrolment eligibility and opt-out tracking
 */

import { PensionCalculationResult, EmployeeYTDData } from './types'
import { Employee } from '../../interfaces/HRs'
import { TaxYearConfiguration } from '../../interfaces/Company'

export class PensionCalculationEngine {
  /**
   * Calculate pension contributions
   */
  calculatePension(
    employee: Employee,
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    taxYearConfig: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): PensionCalculationResult {
    const status = employee.autoEnrolmentStatus || 'not_eligible'
    
    // Only calculate pension if enrolled
    if (status !== 'enrolled') {
      return {
        isEnrolled: false,
        qualifyingEarnings: 0,
        lowerLimit: 0,
        upperLimit: 0,
        employeeContribution: 0,
        employeeRate: 0,
        employeeYTD: ytdData.employeePensionYTD,
        employerContribution: 0,
        employerRate: 0,
        employerYTD: ytdData.employerPensionYTD,
        calculation: `Pension: ${status} - no deductions`
      }
    }
    
    // Calculate qualifying earnings for this period
    const qualifyingEarnings = this.calculateQualifyingEarnings(
      grossPay,
      periodType,
      taxYearConfig
    )
    
    // Get contribution rates
    const employeeRate = (employee.pensionContributionPercentage || 5) / 100
    const employerRate = taxYearConfig.minimumEmployerContribution
    
    // Calculate contributions
    const employeeContribution = qualifyingEarnings * employeeRate
    const employerContribution = qualifyingEarnings * employerRate
    
    // Calculate thresholds for period
    const lowerLimit = this.getThresholdForPeriod(
      taxYearConfig.autoEnrolmentLowerLimitAnnual,
      periodType
    )
    const upperLimit = this.getThresholdForPeriod(
      taxYearConfig.autoEnrolmentUpperLimitAnnual,
      periodType
    )
    
    return {
      isEnrolled: true,
      qualifyingEarnings: Math.round(qualifyingEarnings * 100) / 100,
      lowerLimit,
      upperLimit,
      
      employeeContribution: Math.round(employeeContribution * 100) / 100,
      employeeRate,
      employeeYTD: Math.round((ytdData.employeePensionYTD + employeeContribution) * 100) / 100,
      
      employerContribution: Math.round(employerContribution * 100) / 100,
      employerRate,
      employerYTD: Math.round((ytdData.employerPensionYTD + employerContribution) * 100) / 100,
      
      calculation: `Pension: Qualifying earnings £${qualifyingEarnings.toFixed(2)}, Employee ${(employeeRate * 100).toFixed(1)}% = £${employeeContribution.toFixed(2)}, Employer ${(employerRate * 100).toFixed(1)}% = £${employerContribution.toFixed(2)}`
    }
  }
  
  /**
   * Calculate qualifying earnings (between lower and upper limits)
   */
  private calculateQualifyingEarnings(
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration
  ): number {
    const lowerLimit = this.getThresholdForPeriod(
      config.autoEnrolmentLowerLimitAnnual,
      periodType
    )
    const upperLimit = this.getThresholdForPeriod(
      config.autoEnrolmentUpperLimitAnnual,
      periodType
    )
    
    // Qualifying earnings are between lower and upper limits
    const qualifyingEarnings = Math.min(
      Math.max(0, grossPay - lowerLimit),
      upperLimit - lowerLimit
    )
    
    return qualifyingEarnings
  }
  
  /**
   * Get threshold for period
   */
  private getThresholdForPeriod(annualThreshold: number, periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'): number {
    if (periodType === 'weekly') {
      return annualThreshold / 52
    } else if (periodType === 'fortnightly') {
      return annualThreshold / 26
    } else if (periodType === 'four_weekly') {
      return annualThreshold / 13
    } else {
      return annualThreshold / 12
    }
  }
  
  /**
   * Check if employee is eligible for auto-enrolment
   */
  static checkEligibility(
    employee: Employee,
    annualEarnings: number,
    taxYearConfig: TaxYearConfiguration
  ): {
    eligible: boolean
    reason: string
    mustEnrol: boolean
  } {
    // Age check
    if (!employee.dateOfBirth) {
      return {
        eligible: false,
        reason: 'Date of birth not provided',
        mustEnrol: false
      }
    }
    
    const age = this.calculateAge(employee.dateOfBirth)
    
    // Must be 22 or over and under State Pension age
    if (age < 22) {
      return {
        eligible: false,
        reason: 'Under 22 years old',
        mustEnrol: false
      }
    }
    
    // State Pension age is currently 66 in UK
    if (age >= 66) {
      return {
        eligible: false,
        reason: 'Over State Pension age',
        mustEnrol: false
      }
    }
    
    // Earnings check
    if (annualEarnings < taxYearConfig.autoEnrolmentEarningsThresholdAnnual) {
      return {
        eligible: false,
        reason: `Earnings below £${taxYearConfig.autoEnrolmentEarningsThresholdAnnual} threshold`,
        mustEnrol: false
      }
    }
    
    return {
      eligible: true,
      reason: 'Meets all criteria',
      mustEnrol: true
    }
  }
  
  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: number): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }
}

/**
 * Validate pension contribution percentage
 */
export function validatePensionContribution(percentage: number): { valid: boolean; error?: string } {
  if (percentage < 0 || percentage > 100) {
    return {
      valid: false,
      error: 'Pension contribution must be between 0% and 100%'
    }
  }
  
  if (percentage < 5) {
    return {
      valid: false,
      error: 'Employee pension contribution must be at least 5% for auto-enrolment compliance'
    }
  }
  
  return { valid: true }
}

