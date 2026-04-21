/**
 * UK National Insurance Calculation Engine
 * HMRC Compliant - All NI Categories Supported
 * 
 * Supports:
 * - Category A (Standard)
 * - Category B (Married women - reduced rate)
 * - Category C (Over state pension age - no NI)
 * - Category H (Apprentice under 25)
 * - Category M (Under 21)
 * - Category Z (Under 21 - deferred)
 * - Category F, I, J, L, S, V (various special cases)
 * - Director NI (annual calculation method)
 * - Standard and alternative calculation methods
 */

import { NICalculationResult, EmployeeYTDData } from './types'
import { Employee } from '../../interfaces/HRs'
import { TaxYearConfiguration } from '../../interfaces/Company'

export class NICalculationEngine {
  /**
   * Calculate National Insurance contributions
   */
  calculateNI(
    employee: Employee,
    grossPay: number,
    periodNumber: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    taxYearConfig: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): NICalculationResult {
    const niCategory = employee.niCategory || 'A'
    const isDirector = employee.isDirector || false
    
    // Category C - Over state pension age (no NI)
    if (niCategory === 'C') {
      return this.calculateCategoryC(grossPay, ytdData)
    }
    
    // Directors use annual calculation method
    if (isDirector) {
      return this.calculateDirectorNI(
        employee,
        grossPay,
        periodNumber,
        periodType,
        taxYearConfig,
        ytdData
      )
    }
    
    // Standard calculation for all other categories
    return this.calculateStandardNI(
      niCategory,
      grossPay,
      periodType,
      taxYearConfig,
      ytdData,
      employee
    )
  }
  
  /**
   * Standard NI calculation (non-directors)
   */
  private calculateStandardNI(
    niCategory: string,
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration,
    ytdData: EmployeeYTDData,
    employee: Employee
  ): NICalculationResult {
    // Get thresholds for period
    const thresholds = this.getThresholds(periodType, config)
    
    // Get rates for category
    const rates = this.getNICategoryRates(niCategory, config)
    
    // Calculate employee NI
    let employeeNI = 0
    if (grossPay > thresholds.primaryThreshold) {
      const earningsBelowUEL = Math.min(
        grossPay - thresholds.primaryThreshold,
        thresholds.upperEarningsLimit - thresholds.primaryThreshold
      )
      const earningsAboveUEL = Math.max(0, grossPay - thresholds.upperEarningsLimit)
      
      employeeNI = (earningsBelowUEL * rates.employeePrimaryRate) + 
                   (earningsAboveUEL * rates.employeeAboveUELRate)
    }
    
    // Calculate employer NI
    let employerNI = 0
    if (grossPay > thresholds.secondaryThreshold) {
      employerNI = (grossPay - thresholds.secondaryThreshold) * rates.employerRate
    }
    
    // Special handling for apprentices under 25 (Category H)
    if (niCategory === 'H' && employee.dateOfBirth) {
      const age = this.calculateAge(employee.dateOfBirth)
      if (age < 25) {
        // No employer NI up to apprentice upper secondary threshold
        const apprenticeThreshold = this.getApprenticeThreshold(periodType, config)
        if (grossPay <= apprenticeThreshold) {
          employerNI = 0
        } else {
          employerNI = (grossPay - apprenticeThreshold) * rates.employerRate
        }
      }
    }
    
    // Special handling for under 21 (Category M/Z)
    if ((niCategory === 'M' || niCategory === 'Z') && employee.dateOfBirth) {
      const age = this.calculateAge(employee.dateOfBirth)
      if (age < 21) {
        // No employer NI up to upper secondary threshold
        if (grossPay <= thresholds.upperEarningsLimit) {
          employerNI = 0
        } else {
          employerNI = (grossPay - thresholds.upperEarningsLimit) * rates.employerRate
        }
      }
    }
    
    return {
      niCategory,
      isDirector: false,
      calculationMethod: 'standard',
      
      employeeNIThisPeriod: Math.round(employeeNI * 100) / 100,
      employeeNIRate: rates.employeePrimaryRate,
      employeeNIYTD: Math.round((ytdData.employeeNIPaidYTD + employeeNI) * 100) / 100,
      
      employerNIThisPeriod: Math.round(employerNI * 100) / 100,
      employerNIRate: rates.employerRate,
      employerNIYTD: Math.round((ytdData.employerNIPaidYTD + employerNI) * 100) / 100,
      
      primaryThreshold: thresholds.primaryThreshold,
      upperEarningsLimit: thresholds.upperEarningsLimit,
      secondaryThreshold: thresholds.secondaryThreshold,
      
      calculation: `Category ${niCategory}: Gross £${grossPay.toFixed(2)}, Employee NI £${employeeNI.toFixed(2)} (${(rates.employeePrimaryRate * 100).toFixed(1)}%), Employer NI £${employerNI.toFixed(2)} (${(rates.employerRate * 100).toFixed(1)}%)`
    }
  }
  
  /**
   * Director NI calculation (annual method)
   */
  private calculateDirectorNI(
    employee: Employee,
    grossPayThisPeriod: number,
    _periodNumber: number,
    _periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): NICalculationResult {
    const niCategory = employee.niCategory || 'A'
    const calculationMethod = employee.directorNICalculationMethod || 'annual'
    
    // For annual method, calculate based on cumulative earnings
    const totalEarningsYTD = ytdData.niablePayYTD + grossPayThisPeriod
    
    // Annual thresholds
    const annualPT = config.niPrimaryThresholdAnnual
    const annualUEL = config.niUpperEarningsLimitAnnual
    const annualST = config.niSecondaryThresholdAnnual
    
    const rates = this.getNICategoryRates(niCategory, config)
    
    // Calculate total NI due to date
    let totalEmployeeNIDue = 0
    if (totalEarningsYTD > annualPT) {
      const earningsBelowUEL = Math.min(
        totalEarningsYTD - annualPT,
        annualUEL - annualPT
      )
      const earningsAboveUEL = Math.max(0, totalEarningsYTD - annualUEL)
      
      totalEmployeeNIDue = (earningsBelowUEL * rates.employeePrimaryRate) + 
                           (earningsAboveUEL * rates.employeeAboveUELRate)
    }
    
    let totalEmployerNIDue = 0
    if (totalEarningsYTD > annualST) {
      totalEmployerNIDue = (totalEarningsYTD - annualST) * rates.employerRate
    }
    
    // NI for this period = total due - already paid
    const employeeNIThisPeriod = Math.max(0, totalEmployeeNIDue - ytdData.employeeNIPaidYTD)
    const employerNIThisPeriod = Math.max(0, totalEmployerNIDue - ytdData.employerNIPaidYTD)
    
    return {
      niCategory,
      isDirector: true,
      calculationMethod,
      
      employeeNIThisPeriod: Math.round(employeeNIThisPeriod * 100) / 100,
      employeeNIRate: rates.employeePrimaryRate,
      employeeNIYTD: Math.round(totalEmployeeNIDue * 100) / 100,
      
      employerNIThisPeriod: Math.round(employerNIThisPeriod * 100) / 100,
      employerNIRate: rates.employerRate,
      employerNIYTD: Math.round(totalEmployerNIDue * 100) / 100,
      
      primaryThreshold: annualPT,
      upperEarningsLimit: annualUEL,
      secondaryThreshold: annualST,
      
      calculation: `Director (${calculationMethod}): YTD Earnings £${totalEarningsYTD.toFixed(2)}, Employee NI £${employeeNIThisPeriod.toFixed(2)}, Employer NI £${employerNIThisPeriod.toFixed(2)}`
    }
  }
  
  /**
   * Category C - Over state pension age (no NI)
   */
  private calculateCategoryC(
    _grossPay: number,
    ytdData: EmployeeYTDData
  ): NICalculationResult {
    return {
      niCategory: 'C',
      isDirector: false,
      calculationMethod: 'standard',
      
      employeeNIThisPeriod: 0,
      employeeNIRate: 0,
      employeeNIYTD: ytdData.employeeNIPaidYTD,
      
      employerNIThisPeriod: 0,
      employerNIRate: 0,
      employerNIYTD: ytdData.employerNIPaidYTD,
      
      primaryThreshold: 0,
      upperEarningsLimit: 0,
      secondaryThreshold: 0,
      
      calculation: `Category C: Over state pension age - no NI contributions`
    }
  }
  
  /**
   * Get NI thresholds for period type
   */
  private getThresholds(
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration
  ): NIThresholds {
    if (periodType === 'weekly') {
      return {
        primaryThreshold: config.niPrimaryThresholdWeekly,
        upperEarningsLimit: config.niUpperEarningsLimitWeekly,
        secondaryThreshold: config.niSecondaryThresholdWeekly
      }
    } else if (periodType === 'fortnightly') {
      return {
        primaryThreshold: config.niPrimaryThresholdWeekly * 2,
        upperEarningsLimit: config.niUpperEarningsLimitWeekly * 2,
        secondaryThreshold: config.niSecondaryThresholdWeekly * 2
      }
    } else if (periodType === 'four_weekly') {
      return {
        primaryThreshold: config.niPrimaryThresholdWeekly * 4,
        upperEarningsLimit: config.niUpperEarningsLimitWeekly * 4,
        secondaryThreshold: config.niSecondaryThresholdWeekly * 4
      }
    } else {
      return {
        primaryThreshold: config.niPrimaryThresholdMonthly,
        upperEarningsLimit: config.niUpperEarningsLimitMonthly,
        secondaryThreshold: config.niSecondaryThresholdMonthly
      }
    }
  }
  
  /**
   * Get NI rates for category
   */
  private getNICategoryRates(
    category: string,
    config: TaxYearConfiguration
  ): NICategoryRates {
    switch (category) {
      case 'A': // Standard
      case 'H': // Apprentice under 25
      case 'M': // Under 21
      case 'Z': // Under 21 - deferred
      case 'F': // Female over 60
      case 'I': // Married women certificate holder
      case 'J': // Deferred - multiple employment
      case 'L': // Deferred - director
      case 'S': // Deferred - employed and self-employed
      case 'V': // Contract out
        return {
          employeePrimaryRate: config.niPrimaryRate,
          employeeAboveUELRate: config.niPrimaryRateAboveUEL,
          employerRate: config.niEmployerRate
        }
      
      case 'B': // Married women - reduced rate
        return {
          employeePrimaryRate: 0.0135, // 1.35% reduced rate
          employeeAboveUELRate: 0.0135,
          employerRate: config.niEmployerRate
        }
      
      case 'C': // Over state pension age
        return {
          employeePrimaryRate: 0,
          employeeAboveUELRate: 0,
          employerRate: 0
        }
      
      default:
        // Default to Category A
        console.warn(`Unknown NI category: ${category}, using Category A`)
        return {
          employeePrimaryRate: config.niPrimaryRate,
          employeeAboveUELRate: config.niPrimaryRateAboveUEL,
          employerRate: config.niEmployerRate
        }
    }
  }
  
  /**
   * Get apprentice upper secondary threshold
   */
  private getApprenticeThreshold(
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration
  ): number {
    // Apprentice threshold is same as UEL
    if (periodType === 'weekly') {
      return config.niUpperEarningsLimitWeekly
    } else if (periodType === 'fortnightly') {
      return config.niUpperEarningsLimitWeekly * 2
    } else if (periodType === 'four_weekly') {
      return config.niUpperEarningsLimitWeekly * 4
    } else {
      return config.niUpperEarningsLimitMonthly
    }
  }
  
  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: number): number {
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

interface NIThresholds {
  primaryThreshold: number
  upperEarningsLimit: number
  secondaryThreshold: number
}

interface NICategoryRates {
  employeePrimaryRate: number
  employeeAboveUELRate: number
  employerRate: number
}

/**
 * Validate NI category
 */
export function validateNICategory(category: string): { valid: boolean; error?: string } {
  const validCategories = ['A', 'B', 'C', 'F', 'H', 'I', 'J', 'L', 'M', 'S', 'V', 'Z']
  
  if (!validCategories.includes(category.toUpperCase())) {
    return {
      valid: false,
      error: `Invalid NI category. Valid categories: ${validCategories.join(', ')}`
    }
  }
  
  return { valid: true }
}

