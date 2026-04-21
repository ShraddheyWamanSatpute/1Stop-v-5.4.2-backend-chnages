/**
 * UK Student Loan Calculation Engine
 * HMRC Compliant - All Loan Plans Supported
 * 
 * Supports:
 * - Plan 1 (Started before September 2012)
 * - Plan 2 (Started September 2012 or later - England/Wales)
 * - Plan 4 (Scotland)
 * - Postgraduate Loan
 * - Multiple loans simultaneously
 */

import { StudentLoanCalculationResult, EmployeeYTDData } from './types'
import { Employee } from '../../interfaces/HRs'
import { TaxYearConfiguration } from '../../interfaces/Company'

export class StudentLoanCalculationEngine {
  /**
   * Calculate student loan deductions
   */
  calculateStudentLoan(
    employee: Employee,
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    taxYearConfig: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): StudentLoanCalculationResult {
    const hasStudentLoan = employee.studentLoanPlan && employee.studentLoanPlan !== 'none'
    const hasPostgraduate = employee.hasPostgraduateLoan || false
    
    if (!hasStudentLoan && !hasPostgraduate) {
      return {
        hasStudentLoan: false,
        plans: [],
        totalDeduction: 0,
        calculation: 'No student loans'
      }
    }
    
    const plans: Array<{
      plan: 'plan1' | 'plan2' | 'plan4' | 'postgraduate'
      threshold: number
      rate: number
      deduction: number
      ytd: number
    }> = []
    
    let totalDeduction = 0
    
    // Calculate undergraduate loan
    if (hasStudentLoan && employee.studentLoanPlan !== 'none') {
      const undergraduateLoan = this.calculateUndergraduateLoan(
        employee.studentLoanPlan as 'plan1' | 'plan2' | 'plan4',
        grossPay,
        periodType,
        taxYearConfig,
        ytdData
      )
      plans.push(undergraduateLoan)
      totalDeduction += undergraduateLoan.deduction
    }
    
    // Calculate postgraduate loan (can be in addition to undergraduate)
    if (hasPostgraduate) {
      const postgraduateLoan = this.calculatePostgraduateLoan(
        grossPay,
        periodType,
        taxYearConfig,
        ytdData
      )
      plans.push(postgraduateLoan)
      totalDeduction += postgraduateLoan.deduction
    }
    
    const calculation = plans.map(p => 
      `${p.plan.toUpperCase()}: £${p.deduction.toFixed(2)}`
    ).join(', ')
    
    return {
      hasStudentLoan: true,
      plans,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      calculation: `Student Loans: ${calculation}`
    }
  }
  
  /**
   * Calculate undergraduate loan deduction
   */
  private calculateUndergraduateLoan(
    plan: 'plan1' | 'plan2' | 'plan4',
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): {
    plan: 'plan1' | 'plan2' | 'plan4'
    threshold: number
    rate: number
    deduction: number
    ytd: number
  } {
    // Get threshold for period
    const threshold = this.getThresholdForPeriod(plan, periodType, config)
    
    // Calculate deduction (9% above threshold)
    const deduction = grossPay > threshold 
      ? (grossPay - threshold) * config.studentLoanRate 
      : 0
    
    // Get YTD based on plan
    let ytd = 0
    if (plan === 'plan1') {
      ytd = (ytdData.studentLoanPlan1YTD || 0) + deduction
    } else if (plan === 'plan2') {
      ytd = (ytdData.studentLoanPlan2YTD || 0) + deduction
    } else if (plan === 'plan4') {
      ytd = (ytdData.studentLoanPlan4YTD || 0) + deduction
    }
    
    return {
      plan,
      threshold,
      rate: config.studentLoanRate,
      deduction: Math.round(deduction * 100) / 100,
      ytd: Math.round(ytd * 100) / 100
    }
  }
  
  /**
   * Calculate postgraduate loan deduction
   */
  private calculatePostgraduateLoan(
    grossPay: number,
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration,
    ytdData: EmployeeYTDData
  ): {
    plan: 'postgraduate'
    threshold: number
    rate: number
    deduction: number
    ytd: number
  } {
    // Get threshold for period
    const annualThreshold = config.postgraduateLoanThresholdAnnual
    let threshold: number
    if (periodType === 'weekly') {
      threshold = annualThreshold / 52
    } else if (periodType === 'fortnightly') {
      threshold = annualThreshold / 26
    } else if (periodType === 'four_weekly') {
      threshold = annualThreshold / 13
    } else {
      threshold = annualThreshold / 12
    }
    
    // Calculate deduction (6% above threshold)
    const deduction = grossPay > threshold 
      ? (grossPay - threshold) * config.postgraduateLoanRate 
      : 0
    
    const ytd = (ytdData.postgraduateLoanYTD || 0) + deduction
    
    return {
      plan: 'postgraduate',
      threshold,
      rate: config.postgraduateLoanRate,
      deduction: Math.round(deduction * 100) / 100,
      ytd: Math.round(ytd * 100) / 100
    }
  }
  
  /**
   * Get threshold for period and plan
   */
  private getThresholdForPeriod(
    plan: 'plan1' | 'plan2' | 'plan4',
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
    config: TaxYearConfiguration
  ): number {
    let annualThreshold = 0
    
    switch (plan) {
      case 'plan1':
        annualThreshold = config.studentLoanPlan1ThresholdAnnual
        break
      case 'plan2':
        annualThreshold = config.studentLoanPlan2ThresholdAnnual
        break
      case 'plan4':
        annualThreshold = config.studentLoanPlan4ThresholdAnnual
        break
    }
    
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
}

/**
 * Validate student loan plan
 */
export function validateStudentLoanPlan(plan: string): { valid: boolean; error?: string } {
  const validPlans = ['none', 'plan1', 'plan2', 'plan4']
  
  if (!validPlans.includes(plan.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid student loan plan. Valid plans: ${validPlans.join(', ')}`
    }
  }
  
  return { valid: true }
}

