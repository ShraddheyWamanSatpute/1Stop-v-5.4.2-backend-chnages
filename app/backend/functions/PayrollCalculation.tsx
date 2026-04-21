/**
 * Payroll Calculation Backend Functions
 * HMRC-Compliant UK Payroll Processing
 * 
 * These functions integrate the calculation engines with Firebase
 */

import { ref, get, set, update } from 'firebase/database'
import { db } from '../services/Firebase'
import { Employee, Payroll, EmployeeYTD, Schedule } from '../interfaces/HRs'
import { TaxYearConfiguration } from '../interfaces/Company'
import { 
  PayrollEngine, 
  createDefaultYTD, 
  getDefaultTaxYearConfig,
  PayrollCalculationInput,
  PayrollCalculationResult,
  EmployeeYTDData
} from '../services/payroll'
import { callCallableProxy } from '../services/callableProxy'

/**
 * Calculate payroll for a single employee
 */
export async function calculateEmployeePayroll(
  companyId: string,
  siteId: string,
  employeeId: string,
  payrollData: {
    grossPay: number
    payPeriodStart: number
    payPeriodEnd: number
    periodNumber: number
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
    bonuses?: number
    commission?: number
    troncPayment?: number
    holidayPay?: number
    otherPayments?: number
    regularHours?: number
    overtimeHours?: number
  },
  options?: {
    /**
     * If true, NI number missing/invalid is treated as a warning (not an error).
     * This allows payroll generation previews while still requiring NI for HMRC submission later.
     */
    relaxNIValidation?: boolean
  }
): Promise<PayrollCalculationResult> {
  try {
    // 1. Fetch employee data
    const employee = await fetchEmployee(companyId, siteId, employeeId)
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`)
    }
    
    // 2. Fetch or create YTD data
    const ytdData = await fetchOrCreateEmployeeYTD(
      companyId,
      siteId,
      employeeId,
      payrollData.periodType
    )
    
    // 3. Fetch tax year configuration
    const taxYearConfig = await fetchOrCreateTaxYearConfig(companyId, siteId)
    
    // 4. Prepare calculation input
    const input: PayrollCalculationInput = {
      employee,
      grossPay: payrollData.grossPay,
      payPeriodStart: payrollData.payPeriodStart,
      payPeriodEnd: payrollData.payPeriodEnd,
      periodNumber: payrollData.periodNumber,
      periodType: payrollData.periodType,
      taxYearConfig,
      employeeYTD: ytdData,
      bonuses: payrollData.bonuses,
      commission: payrollData.commission,
      troncPayment: payrollData.troncPayment,
      holidayPay: payrollData.holidayPay,
      otherPayments: payrollData.otherPayments
    }
    
    // 5. Run calculation engine
    const payrollEngine = new PayrollEngine()
    
    // Validate input first
    const validation = payrollEngine.validateInput(input)
    if (!validation.valid) {
      const errors = [...validation.errors]
      if (options?.relaxNIValidation) {
        const nonNI = errors.filter(
          (e) =>
            !e.toLowerCase().includes("national insurance") &&
            !e.toLowerCase().includes("ni number"),
        )
        if (nonNI.length === 0) {
          // Allow calculation to proceed in preview/generation mode.
          console.warn(
            `Payroll validation warnings for ${employeeId}: ${errors.join(", ")}`,
          )
        } else {
          throw new Error(`Validation failed: ${nonNI.join(', ')}`)
        }
      } else {
        throw new Error(`Validation failed: ${errors.join(', ')}`)
      }
    }
    
    // Calculate payroll
    const result = payrollEngine.calculatePayroll(input)
    
    return result
  } catch (error) {
    console.error('Error calculating payroll:', error)
    throw error
  }
}

/**
 * Create and save a complete payroll record
 */
export async function createPayrollRecord(
  companyId: string,
  siteId: string,
  employeeId: string,
  payrollData: {
    grossPay: number
    payPeriodStart: number
    payPeriodEnd: number
    periodNumber: number
    periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
    // Optional breakdowns (used by schedule-based generation)
    regularPay?: number
    overtimePay?: number
    hourlyRate?: number
    totalHours?: number
    bonuses?: number
    commission?: number
    troncPayment?: number
    holidayPay?: number
    otherPayments?: number
    regularHours?: number
    overtimeHours?: number
    notes?: string
  },
  options?: {
    relaxNIValidation?: boolean
  }
): Promise<Payroll> {
  try {
    // Calculate payroll using engine
    const calculationResult = await calculateEmployeePayroll(
      companyId,
      siteId,
      employeeId,
      payrollData,
      options
    )
    
    // Fetch employee for name
    const employee = await fetchEmployee(companyId, siteId, employeeId)
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`)
    }
    
    // Generate unique ID
    const payrollId = `payroll_${Date.now()}_${employeeId}`
    
    // Build payroll record
    const payrollRecord: Partial<Payroll> = {
      id: payrollId,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      periodId: `period_${payrollData.periodNumber}`,
      periodStartDate: payrollData.payPeriodStart,
      periodEndDate: payrollData.payPeriodEnd,
      payPeriodStart: new Date(payrollData.payPeriodStart).toISOString().split('T')[0],
      payPeriodEnd: new Date(payrollData.payPeriodEnd).toISOString().split('T')[0],
      
      // Tax year info (calculate from period start date)
      taxYear: getCurrentTaxYear(),
      taxPeriod: payrollData.periodNumber,
      periodType: payrollData.periodType,
      
      // Hours and pay
      regularHours: payrollData.regularHours || 0,
      overtimeHours: payrollData.overtimeHours || 0,
      totalHours: (payrollData.regularHours || 0) + (payrollData.overtimeHours || 0),
      hoursWorked: (payrollData.regularHours || 0) + (payrollData.overtimeHours || 0),
      hourlyRate: payrollData.hourlyRate ?? employee.hourlyRate ?? 0,
      regularPay: payrollData.regularPay ?? payrollData.grossPay,
      overtimePay: payrollData.overtimePay ?? 0,
      bonuses: payrollData.bonuses || 0,
      commission: payrollData.commission || 0,
      troncPayment: payrollData.troncPayment || 0,
      holidayPay: payrollData.holidayPay || 0,
      otherPayments: payrollData.otherPayments || 0,
      
      // Gross pay
      grossPay: calculationResult.grossPayBeforeDeductions,
      totalGross: calculationResult.grossPayBeforeDeductions,
      taxableGrossPay: calculationResult.taxableGrossPay,
      niableGrossPay: calculationResult.niableGrossPay,
      pensionableGrossPay: calculationResult.pensionableGrossPay,
      
      // Tax
      taxCode: calculationResult.taxCalculation.taxCode,
      taxCodeBasis: calculationResult.taxCalculation.taxCodeBasis,
      taxDeductions: calculationResult.taxCalculation.taxDueThisPeriod,
      taxPaidYTD: calculationResult.taxCalculation.taxPaidYTD,
      
      // NI
      niCategory: calculationResult.niCalculation.niCategory,
      employeeNIDeductions: calculationResult.niCalculation.employeeNIThisPeriod,
      employerNIContributions: calculationResult.niCalculation.employerNIThisPeriod,
      employeeNIPaidYTD: calculationResult.niCalculation.employeeNIYTD,
      employerNIPaidYTD: calculationResult.niCalculation.employerNIYTD,
      
      // Student loans
      studentLoanPlan: employee.studentLoanPlan || 'none',
      studentLoanDeductions: calculationResult.studentLoanCalculation.totalDeduction,
      hasPostgraduateLoan: Boolean(employee.hasPostgraduateLoan),
      postgraduateLoanDeductions: calculationResult.studentLoanCalculation.plans.find(p => p.plan === 'postgraduate')?.deduction || 0,
      studentLoanPaidYTD: calculationResult.studentLoanCalculation.plans.find(p => p.plan !== 'postgraduate')?.ytd || 0,
      postgraduateLoanPaidYTD: calculationResult.studentLoanCalculation.plans.find(p => p.plan === 'postgraduate')?.ytd || 0,
      
      // Pension
      pensionSchemeReference: employee.pensionSchemeReference || '',
      employeePensionDeductions: calculationResult.pensionCalculation.employeeContribution,
      employerPensionContributions: calculationResult.pensionCalculation.employerContribution,
      pensionQualifyingEarnings: calculationResult.pensionCalculation.qualifyingEarnings,
      employeePensionPaidYTD: calculationResult.pensionCalculation.employeeYTD,
      employerPensionPaidYTD: calculationResult.pensionCalculation.employerYTD,
      
      // Legacy deductions structure
      deductions: {
        tax: calculationResult.taxCalculation.taxDueThisPeriod,
        nationalInsurance: calculationResult.niCalculation.employeeNIThisPeriod,
        pension: calculationResult.pensionCalculation.employeeContribution,
        studentLoan: calculationResult.studentLoanCalculation.totalDeduction,
        other: 0
      },
      
      // Totals
      totalDeductions: calculationResult.totalDeductions,
      netPay: calculationResult.netPay,
      totalNet: calculationResult.netPay,
      
      // YTD snapshot
      ytdData: calculationResult.updatedYTD,
      
      // Status
      status: 'draft',
      
      // Calculation log
      calculationLog: calculationResult.calculationLog,
      calculationEngine: 'v2',
      
      // Metadata
      notes: payrollData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const stripUndefinedDeep = (value: any): any => {
      if (Array.isArray(value)) {
        return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
      }
      if (value && typeof value === 'object') {
        const out: any = {}
        Object.entries(value).forEach(([k, v]) => {
          if (v === undefined) return
          const cleaned = stripUndefinedDeep(v)
          if (cleaned === undefined) return
          out[k] = cleaned
        })
        return out
      }
      return value
    }

    // Save encrypted payroll via Cloud Functions (server-side key custody)
    const hrPath = `companies/${companyId}/sites/${siteId}/data/hr`
    await callCallableProxy("hrSavePayroll", {
      hrPath,
      payrollId,
      payroll: stripUndefinedDeep(payrollRecord),
    })
    
    // Update employee YTD
    await updateEmployeeYTD(
      companyId,
      siteId,
      employeeId,
      calculationResult.updatedYTD,
      payrollId
    )
    
    return payrollRecord as Payroll
  } catch (error) {
    console.error('Error creating payroll record:', error)
    throw error
  }
}

/**
 * Fetch employee data
 */
async function fetchEmployee(
  companyId: string,
  siteId: string,
  employeeId: string
): Promise<Employee | null> {
  try {
    const siteHrPath = `companies/${companyId}/sites/${siteId}/data/hr`
    const companyHrPath = `companies/${companyId}/data/hr`

    const res1: any = await callCallableProxy("hrGetEmployee", { hrPath: siteHrPath, employeeId })
    let employee = (res1?.data?.employee as Employee) || null

    if (!employee) {
      const res2: any = await callCallableProxy("hrGetEmployee", { hrPath: companyHrPath, employeeId })
      employee = (res2?.data?.employee as Employee) || null
    }

    if (!employee) return null

    // Ensure stable id and numeric normalization
    const out: any = { id: employeeId, ...(employee as any) }
    if (typeof out.dateOfBirth === "string" && out.dateOfBirth.trim() !== "") {
      const n = Number(out.dateOfBirth)
      if (Number.isFinite(n)) out.dateOfBirth = n
    }
    if (typeof out.salary === "string" && out.salary.trim() !== "") {
      const n = Number(out.salary)
      if (Number.isFinite(n)) out.salary = n
    }
    if (typeof out.hourlyRate === "string" && out.hourlyRate.trim() !== "") {
      const n = Number(out.hourlyRate)
      if (Number.isFinite(n)) out.hourlyRate = n
    }

    return out as Employee
  } catch (error) {
    console.error('Error fetching employee:', error)
    throw error
  }
}

/**
 * Fetch or create employee YTD data
 */
async function fetchOrCreateEmployeeYTD(
  companyId: string,
  siteId: string,
  employeeId: string,
  _periodType: string
): Promise<EmployeeYTDData> {
  try {
    const currentTaxYear = getCurrentTaxYear()
    const ytdRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/employeeYTD/${employeeId}_${currentTaxYear}`)
    const snapshot = await get(ytdRef)
    
    if (snapshot.exists()) {
      const ytd = snapshot.val() as EmployeeYTD
      return {
        grossPayYTD: ytd.grossPayYTD || 0,
        taxablePayYTD: ytd.taxablePayYTD || 0,
        taxPaidYTD: ytd.taxPaidYTD || 0,
        niablePayYTD: ytd.niablePayYTD || 0,
        employeeNIPaidYTD: ytd.employeeNIPaidYTD || 0,
        employerNIPaidYTD: ytd.employerNIPaidYTD || 0,
        pensionablePayYTD: ytd.pensionablePayYTD || 0,
        employeePensionYTD: ytd.employeePensionYTD || 0,
        employerPensionYTD: ytd.employerPensionYTD || 0,
        studentLoanPlan1YTD: ytd.studentLoanPlan1YTD,
        studentLoanPlan2YTD: ytd.studentLoanPlan2YTD,
        studentLoanPlan4YTD: ytd.studentLoanPlan4YTD,
        postgraduateLoanYTD: ytd.postgraduateLoanYTD
      }
    }
    
    // Create default YTD
    return createDefaultYTD()
  } catch (error) {
    console.error('Error fetching YTD:', error)
    return createDefaultYTD()
  }
}

/**
 * Update employee YTD data
 */
async function updateEmployeeYTD(
  companyId: string,
  siteId: string,
  employeeId: string,
  ytdData: EmployeeYTDData,
  payrollId: string
): Promise<void> {
  try {
    const currentTaxYear = getCurrentTaxYear()
    const ytdRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/employeeYTD/${employeeId}_${currentTaxYear}`)
    
    const ytdRecord: EmployeeYTD = {
      id: `${employeeId}_${currentTaxYear}`,
      employeeId,
      taxYear: currentTaxYear,
      ...ytdData,
      lastPayrollId: payrollId,
      lastPayrollDate: Date.now(),
      updatedAt: Date.now()
    }
    
    await set(ytdRef, ytdRecord)
  } catch (error) {
    console.error('Error updating YTD:', error)
    throw error
  }
}

/**
 * Fetch or create tax year configuration
 */
async function fetchOrCreateTaxYearConfig(
  companyId: string,
  siteId: string
): Promise<TaxYearConfiguration> {
  try {
    const currentTaxYear = getCurrentTaxYear()
    const configRef = ref(db, `companies/${companyId}/sites/${siteId}/data/company/taxYearConfig/${currentTaxYear}`)
    const snapshot = await get(configRef)
    
    if (snapshot.exists()) {
      return snapshot.val() as TaxYearConfiguration
    }
    
    // Create default config
    const defaultConfig = getDefaultTaxYearConfig()
    await set(configRef, defaultConfig)
    return defaultConfig
  } catch (error) {
    console.error('Error fetching tax year config:', error)
    // Return default if error
    return getDefaultTaxYearConfig()
  }
}

/**
 * Get current UK tax year (April 6 to April 5)
 */
function getCurrentTaxYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  const day = now.getDate()
  
  // Tax year starts April 6
  if (month < 4 || (month === 4 && day < 6)) {
    // Before April 6, we're still in previous tax year
    return `${year - 1}-${year.toString().slice(-2)}`
  } else {
    // After April 6, new tax year
    return `${year}-${(year + 1).toString().slice(-2)}`
  }
}

/**
 * Calculate period number from date
 */
export function calculatePeriodNumber(
  date: Date,
  _periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'
): number {
  const taxYearStart = getTaxYearStartDate(date.getFullYear())
  
  if (_periodType === 'monthly') {
    // Calculate months since tax year start
    const monthsDiff = 
      (date.getFullYear() - taxYearStart.getFullYear()) * 12 +
      (date.getMonth() - taxYearStart.getMonth())
    return Math.min(Math.max(monthsDiff + 1, 1), 12)
  } else {
    // Calculate weeks since tax year start
    const daysDiff = Math.floor((date.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24))
    const weeksDiff = Math.floor(daysDiff / 7)
    
    if (_periodType === 'weekly') {
      return Math.min(Math.max(weeksDiff + 1, 1), 53)
    } else if (_periodType === 'fortnightly') {
      return Math.min(Math.max(Math.floor(weeksDiff / 2) + 1, 1), 27)
    } else { // four_weekly
      return Math.min(Math.max(Math.floor(weeksDiff / 4) + 1, 1), 14)
    }
  }
}

/**
 * Get tax year start date (April 6)
 */
function getTaxYearStartDate(_year: number): Date {
  const now = new Date()
  const currentYear = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  
  // If we're before April 6, tax year started last year
  if (month < 4 || (month === 4 && day < 6)) {
    return new Date(currentYear - 1, 3, 6) // April 6 of last year
  } else {
    return new Date(currentYear, 3, 6) // April 6 of this year
  }
}

/**
 * Approve a payroll record
 * Optionally auto-submits to HMRC if enabled in settings
 */
export async function approvePayrollRecord(
  companyId: string,
  siteId: string,
  payrollId: string,
  approvedBy: string,
  notes?: string,
  autoSubmitToHMRC: boolean = true
): Promise<void> {
  try {
    const payrollRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls/${payrollId}`)
    
    await update(payrollRef, {
      status: 'approved',
      approvedBy,
      approvedAt: Date.now(),
      approverNotes: notes,
      updatedAt: new Date().toISOString()
    })

    // Auto-submit to HMRC if enabled
    if (autoSubmitToHMRC) {
      try {
        const { autoSubmitFPSIfEnabled } = await import('./HMRCRTISubmission')
        await autoSubmitFPSIfEnabled(companyId, siteId, payrollId, approvedBy)
      } catch (hmrcError) {
        // Log but don't fail approval if HMRC submission fails
        console.warn('HMRC auto-submission failed (payroll still approved):', hmrcError)
      }
    }
  } catch (error) {
    console.error('Error approving payroll:', error)
    throw error
  }
}

/**
 * Mark payroll as paid
 */
export async function markPayrollAsPaid(
  companyId: string,
  siteId: string,
  payrollId: string,
  paymentDate: number,
  paymentMethod: string
): Promise<void> {
  try {
    const payrollRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls/${payrollId}`)
    
    await update(payrollRef, {
      status: 'paid',
      paidDate: paymentDate,
      paymentMethod,
      paymentDate: new Date(paymentDate).toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error marking payroll as paid:', error)
    throw error
  }
}

/**
 * Get employee YTD data
 */
export async function getEmployeeYTD(
  companyId: string,
  siteId: string,
  employeeId: string,
  taxYear?: string
): Promise<EmployeeYTD | null> {
  try {
    const year = taxYear || getCurrentTaxYear()
    const ytdRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/employeeYTD/${employeeId}_${year}`)
    const snapshot = await get(ytdRef)
    
    if (snapshot.exists()) {
      return snapshot.val() as EmployeeYTD
    }
    
    return null
  } catch (error) {
    console.error('Error fetching employee YTD:', error)
    return null
  }
}

/**
 * Generate payroll records from confirmed schedules
 * This function takes confirmed schedules and creates payroll records with proper HMRC calculations
 */
export async function generatePayrollFromApprovedSchedules(
  companyId: string,
  siteId: string,
  payPeriodStart: number,
  payPeriodEnd: number,
  periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly',
  serviceChargeAllocations?: Map<string, number>, // employeeId -> serviceChargeAmount
  userId?: string
): Promise<Payroll[]> {
  try {
    // 1. Fetch confirmed schedules for the period
    const schedulesRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/schedules`)
    const schedulesSnapshot = await get(schedulesRef)
    
    if (!schedulesSnapshot.exists()) {
      throw new Error('No schedules found')
    }
    
    const allSchedules = schedulesSnapshot.val() as Record<string, Schedule>
    const periodStartDate = new Date(payPeriodStart)
    const periodEndDate = new Date(payPeriodEnd)
    
    // Filter confirmed shifts within the period
    // NOTE: In the scheduling UI, "Confirm" moves shifts from 'scheduled' -> 'completed'
    // and sets confirmedBy/confirmedAt. Some legacy data may only have 'completed'.
    const approvedSchedules = Object.values(allSchedules).filter(schedule => {
      const scheduleDate = new Date(schedule.date)
      // A "confirmed" shift (per UI) is stored as status 'completed' (usually with confirmedAt/confirmedBy)
      const isApproved = schedule.status === 'completed'
      const inPeriod = scheduleDate >= periodStartDate && scheduleDate <= periodEndDate
      return isApproved && inPeriod
    })
    
    if (approvedSchedules.length === 0) {
      throw new Error('No confirmed shifts found for this period')
    }
    
    // 2. Group schedules by employee
    const employeeSchedulesMap = new Map<string, Schedule[]>()
    for (const schedule of approvedSchedules) {
      if (!employeeSchedulesMap.has(schedule.employeeId)) {
        employeeSchedulesMap.set(schedule.employeeId, [])
      }
      employeeSchedulesMap.get(schedule.employeeId)!.push(schedule)
    }
    
    // 3. Calculate period number
    const periodNumber = calculatePeriodNumber(periodStartDate, periodType)
    
    // 4. Generate payroll for each employee
    const payrollRecords: Payroll[] = []
    const failures: string[] = []
    
    for (const [employeeId, schedules] of employeeSchedulesMap.entries()) {
      try {
        // Fetch employee
        const employee = await fetchEmployee(companyId, siteId, employeeId)
        if (!employee) {
          console.warn(`Employee not found: ${employeeId}, skipping`)
          continue
        }

        const isSalaryEmployee =
          employee.payType === 'salary' || (typeof employee.salary === 'number' && employee.salary > 0 && !employee.hourlyRate)

        const annualSalary = typeof employee.salary === 'number' ? employee.salary : 0
        const hoursPerWeek = typeof employee.hoursPerWeek === 'number' && employee.hoursPerWeek > 0 ? employee.hoursPerWeek : 40

        const resolveSalaryPerPeriod = () => {
          if (!annualSalary || annualSalary <= 0) return 0
          switch (periodType) {
            case 'weekly':
              return annualSalary / 52
            case 'fortnightly':
              return annualSalary / 26
            case 'four_weekly':
              return annualSalary / 13
            case 'monthly':
            default:
              return annualSalary / 12
          }
        }

        let derivedHourlyRate = employee.hourlyRate ?? 0
        if ((!derivedHourlyRate || derivedHourlyRate <= 0) && annualSalary > 0) {
          derivedHourlyRate = annualSalary / 52 / hoursPerWeek
        }

        // Pay and hours breakdown
        let totalRegularHours = 0
        let totalOvertimeHours = 0
        let holidayHours = 0
        let regularPay = 0
        let overtimePay = 0
        let holidayPay = 0

        // For hourly pay, apply daily overtime threshold. For salary, we still track hours for reporting only.
        const dailyHours: Record<string, number> = {}
        const dailyBasePay: Record<string, number> = {}

        for (const schedule of schedules) {
          const scheduleDate = schedule.date

          // Compute hours with breaks/adjustments
          const startTime = new Date(`${scheduleDate}T${schedule.startTime}`)
          const endTime = schedule.clockOutTime
            ? new Date(`${scheduleDate}T${schedule.clockOutTime}`)
            : new Date(`${scheduleDate}T${schedule.endTime}`)

          let hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
          const breakHours = (schedule.breakDuration ? Number(schedule.breakDuration) : 0) / 60
          hours = Math.max(0, hours - (isNaN(breakHours) ? 0 : breakHours))

          if (typeof schedule.adjustedHours === 'number' && schedule.adjustedHours >= 0) {
            hours = schedule.adjustedHours
          }

          const payType = schedule.payType || 'hourly'
          const payRate = (typeof schedule.payRate === 'number' ? schedule.payRate : undefined) ?? derivedHourlyRate

          // Salary employees: pay is salary-per-period; schedule hours are tracked only.
          if (isSalaryEmployee) {
            if (schedule.shiftType !== 'off') {
              totalRegularHours += hours
            }
            continue
          }

          // Holiday shifts: treated as holiday pay (not affecting overtime threshold).
          if (schedule.shiftType === 'holiday') {
            holidayHours += hours
            if (payType === 'flat') {
              holidayPay += typeof schedule.payRate === 'number' ? schedule.payRate : 0
            } else {
              holidayPay += hours * payRate
            }
            continue
          }

          // Flat-pay shifts: count hours but treat pay as flat amount.
          if (payType === 'flat') {
            totalRegularHours += hours
            regularPay += typeof schedule.payRate === 'number' ? schedule.payRate : 0
            continue
          }

          // Hourly shifts: accumulate by day for overtime calculation.
          dailyHours[scheduleDate] = (dailyHours[scheduleDate] || 0) + hours
          dailyBasePay[scheduleDate] = (dailyBasePay[scheduleDate] || 0) + hours * payRate
        }

        if (isSalaryEmployee) {
          regularPay = resolveSalaryPerPeriod()
          totalOvertimeHours = 0
        } else {
          // Apply daily overtime threshold (8h/day) using a weighted average rate per day.
          for (const [date, hours] of Object.entries(dailyHours)) {
            const basePay = dailyBasePay[date] || 0
            const avgRate = hours > 0 ? basePay / hours : 0

            if (hours > 8) {
              totalOvertimeHours += hours - 8
              totalRegularHours += 8
              regularPay += 8 * avgRate
              overtimePay += (hours - 8) * avgRate * 1.5
            } else {
              totalRegularHours += hours
              regularPay += hours * avgRate
            }
          }
        }

        const serviceCharge = serviceChargeAllocations?.get(employeeId) || 0
        const troncPayment = serviceCharge

        // IMPORTANT: grossPay here is base pay only; holidayPay/tronc/etc. are passed separately so the engine logs them.
        const grossPay = regularPay + overtimePay
        
        // 5. Create payroll record using calculation engine
        const payrollRecord = await createPayrollRecord(
          companyId,
          siteId,
          employeeId,
          {
            grossPay,
            payPeriodStart,
            payPeriodEnd,
            periodNumber,
            periodType,
            hourlyRate: derivedHourlyRate,
            regularPay,
            overtimePay,
            regularHours: totalRegularHours,
            overtimeHours: totalOvertimeHours,
            troncPayment,
            holidayPay,
            notes: `Generated from ${schedules.length} confirmed shift(s) for period ${periodStartDate.toISOString().split('T')[0]} to ${periodEndDate.toISOString().split('T')[0]}`
          },
          { relaxNIValidation: true }
        )
        
        payrollRecords.push(payrollRecord)
      } catch (error) {
        console.error(`Error generating payroll for employee ${employeeId}:`, error)
        failures.push(`${employeeId}: ${(error as any)?.message || String(error)}`)
        // Continue with other employees
      }
    }
    
    if (payrollRecords.length === 0) {
      const sample = failures.slice(0, 3).join(" | ")
      throw new Error(
        `No payroll records could be generated. Confirmed shifts were found, but payroll calculation failed. ${sample ? `Sample errors: ${sample}` : ""}`.trim(),
      )
    }

    return payrollRecords
  } catch (error) {
    console.error('Error generating payroll from confirmed schedules:', error)
    throw error
  }
}
