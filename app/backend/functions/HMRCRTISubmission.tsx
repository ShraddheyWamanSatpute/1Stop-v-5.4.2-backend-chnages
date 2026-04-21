/**
 * HMRC RTI Submission Functions
 * Backend functions for submitting RTI data to HMRC
 */

import { ref, update } from 'firebase/database'
import { db } from '../services/Firebase'
import { RTIValidationService, RTIXMLGenerator } from '../services/hmrc'
import { Payroll, Employee } from '../interfaces/HRs'
import { FPSSubmissionData, EPSSubmissionData, FPSSubmissionResult, EPSSubmissionResult } from '../services/hmrc/types'
import { fetchHMRCSettings, saveHMRCSettings } from './HMRCSettings'
import { APP_KEYS, getFunctionsBaseUrl } from "../config/keys"
import { callCallableProxy } from '../services/callableProxy'

/**
 * Submit FPS (Full Payment Submission) for approved payroll records
 */
export async function submitFPSForPayrollRun(
  companyId: string,
  siteId: string,
  payrollIds: string[],
  subsiteId?: string | null
): Promise<FPSSubmissionResult> {
  try {
    // 1. Fetch HMRC settings with hierarchy support
    const { settings: hmrcSettings } = await fetchHMRCSettings(companyId, siteId, subsiteId)
    if (!hmrcSettings) {
      throw new Error('HMRC settings not configured. Please configure HMRC settings first.')
    }

    // 2. Validate HMRC settings
    if (!hmrcSettings.employerPAYEReference || !hmrcSettings.accountsOfficeReference) {
      throw new Error('HMRC employer references not configured')
    }

    // 3. Fetch payroll records with employee data
    const payrollRecords: Array<Payroll & { employee?: Employee }> = []
    const employees: Map<string, Employee> = new Map()
    const missingEmployeeIds: string[] = []

    for (const payrollId of payrollIds) {
      const payroll = await fetchPayrollRecord(companyId, siteId, payrollId)
      if (!payroll) {
        console.warn(`Payroll record not found: ${payrollId}`)
        continue
      }

      if (payroll.status !== 'approved') {
        console.warn(`Payroll record ${payrollId} is not approved (status: ${payroll.status})`)
        continue
      }

      // Fetch employee data (required for HMRC submission)
      let employee = employees.get(payroll.employeeId)
      if (!employee) {
        const fetchedEmployee = await fetchEmployee(companyId, siteId, payroll.employeeId)
        if (fetchedEmployee) {
          employee = fetchedEmployee
          employees.set(payroll.employeeId, employee)
        } else {
          missingEmployeeIds.push(payroll.employeeId)
          console.error(`Employee not found for payroll ${payrollId}: ${payroll.employeeId}`)
          continue
        }
      }

      // Validate required employee fields for HMRC
      if (!employee.nationalInsuranceNumber) {
        console.error(`Employee ${payroll.employeeId} missing National Insurance Number - required for HMRC submission`)
        continue
      }

      // Attach employee to payroll for XML generation
      const payrollWithEmployee = { ...payroll, employee }
      payrollRecords.push(payrollWithEmployee)
    }

    if (missingEmployeeIds.length > 0) {
      throw new Error(`Cannot submit FPS: Missing employee data for ${missingEmployeeIds.length} employee(s)`)
    }

    if (payrollRecords.length === 0) {
      throw new Error('No approved payroll records found to submit')
    }

    // 4. Validate all payroll records are for the same period
    const firstPayroll = payrollRecords[0]
    const taxYear = firstPayroll.taxYear
    const periodNumber = firstPayroll.taxPeriod
    const periodType = firstPayroll.periodType

    // Check all records are for the same period
    for (const payroll of payrollRecords) {
      if (payroll.taxYear !== taxYear || payroll.taxPeriod !== periodNumber || payroll.periodType !== periodType) {
        throw new Error(`Cannot batch submit: Payroll records must be for the same tax period. Found: ${payroll.taxYear} period ${payroll.taxPeriod} (${payroll.periodType})`)
      }
    }

    // Calculate payment date (use paymentDate if set, otherwise use period end date)
    let paymentDate: string
    if (firstPayroll.paymentDate) {
      paymentDate = typeof firstPayroll.paymentDate === 'string' 
        ? firstPayroll.paymentDate 
        : new Date(firstPayroll.paymentDate).toISOString().split('T')[0]
    } else if (firstPayroll.periodEndDate) {
      paymentDate = new Date(firstPayroll.periodEndDate).toISOString().split('T')[0]
    } else {
      // Fallback to today's date (not ideal, but better than failing)
      paymentDate = new Date().toISOString().split('T')[0]
      console.warn(`No payment date found for payroll ${firstPayroll.id}, using today's date`)
    }

    // 5. Validate all payroll records before submission
    const validationService = new RTIValidationService()
    const validationErrors: string[] = []
    const validationWarnings: string[] = []

    for (const payrollWithEmployee of payrollRecords) {
      const payroll = payrollWithEmployee as Payroll
      const employee = payrollWithEmployee.employee!
      
      const validation = validationService.validatePayrollForFPS(payroll, employee)
      validationErrors.push(...validation.errors)
      validationWarnings.push(...validation.warnings)
    }

    if (validationWarnings.length > 0) {
      console.warn('FPS validation warnings:', validationWarnings)
    }

    if (validationErrors.length > 0) {
      throw new Error(`FPS validation failed:\n${validationErrors.join('\n')}`)
    }

    // 6. Prepare FPS submission data
    const fpsData: FPSSubmissionData = {
      payrollRecords: payrollRecords.map(p => p as Payroll), // Remove employee attachment for submission
      employerPAYEReference: hmrcSettings.employerPAYEReference,
      accountsOfficeReference: hmrcSettings.accountsOfficeReference,
      taxYear: firstPayroll.taxYear,
      periodNumber: firstPayroll.taxPeriod,
      periodType: firstPayroll.periodType,
      paymentDate,
      submissionDate: new Date().toISOString().split('T')[0]
    }

    // 7. Validate FPS submission data structure
    const fpsValidation = validationService.validateFPSSubmission(fpsData)
    if (!fpsValidation.valid) {
      throw new Error(`FPS submission data validation failed:\n${fpsValidation.errors.join('\n')}`)
    }

    if (fpsValidation.warnings.length > 0) {
      console.warn('FPS submission warnings:', fpsValidation.warnings)
    }

    // 8. Generate XML client-side, submit server-side (tokens stay in Cloud Functions)
    const xmlGenerator = new RTIXMLGenerator()
    const xml = xmlGenerator.generateFPS(fpsData)
    const submitRes: any = await callCallableProxy("hmrcSubmitRtiXml", {
      companyId,
      siteId,
      subsiteId: subsiteId ?? null,
      type: "fps",
      xml,
      fraudHeaders: null,
    })

    const submitData = submitRes?.data || {}
    const ok = Boolean(submitData.success)
    const submissionId = submitData?.body?.submissionId || submitData?.correlationId
    const result: FPSSubmissionResult = ok
      ? {
          success: true,
          submissionId,
          correlationId: submitData?.correlationId,
          status: "accepted",
          submittedAt: Date.now(),
          responseBody: submitData?.body,
        }
      : {
          success: false,
          status: "rejected",
          errors: [
            {
              code: "SUBMISSION_ERROR",
              message: `HTTP ${submitData?.status || 0}: ${submitData?.statusText || "HMRC submission failed"}`,
            },
          ],
          submittedAt: Date.now(),
          responseBody: submitData?.body,
        }

    // 7. Update payroll records with submission status
    if (result.success && result.submissionId) {
      for (const payrollId of payrollIds) {
        await updatePayrollSubmissionStatus(
          companyId,
          siteId,
          payrollId,
          {
            submittedToHMRC: true,
            fpsSubmissionDate: result.submittedAt,
            fpsSubmissionId: result.submissionId,
            hmrcResponse: JSON.stringify(result.responseBody || {})
          }
        )
      }

      // Update HMRC settings with last submission date
      // Find where settings are stored and update there
      const { foundAt } = await fetchHMRCSettings(companyId, siteId, subsiteId)
      if (foundAt) {
        await saveHMRCSettings(companyId, siteId, subsiteId ?? null, foundAt, {
          lastFPSSubmissionDate: result.submittedAt
        })
      }
    } else {
      // Log errors but don't fail completely
      console.error('FPS submission failed:', result.errors)
      
      // Still update records with failure status
      for (const payrollId of payrollIds) {
        await updatePayrollSubmissionStatus(
          companyId,
          siteId,
          payrollId,
          {
            submittedToHMRC: false,
            hmrcResponse: JSON.stringify({
              success: false,
              errors: result.errors
            })
          }
        )
      }
    }

    return result
  } catch (error: any) {
    console.error('Error submitting FPS:', error)
    return {
      success: false,
      status: 'rejected',
      errors: [{
        code: 'EXCEPTION',
        message: error.message || 'Unknown error during FPS submission'
      }],
      submittedAt: Date.now()
    }
  }
}

/**
 * Submit EPS (Employer Payment Summary)
 */
export async function submitEPS(
  companyId: string,
  siteId: string,
  epsData: Partial<EPSSubmissionData>,
  subsiteId?: string | null,
): Promise<EPSSubmissionResult> {
  try {
    // 1. Fetch HMRC settings with hierarchy support
    const { settings: hmrcSettings, foundAt } = await fetchHMRCSettings(companyId, siteId, subsiteId)
    if (!hmrcSettings) {
      throw new Error('HMRC settings not configured')
    }

    // 2. Get current tax year and period
    const currentTaxYear = getCurrentTaxYear()
    
    // 3. Prepare EPS data
    const fullEPSData: EPSSubmissionData = {
      employerPAYEReference: hmrcSettings.employerPAYEReference,
      accountsOfficeReference: hmrcSettings.accountsOfficeReference,
      taxYear: epsData.taxYear || currentTaxYear,
      periodNumber: epsData.periodNumber || 1,
      periodType: epsData.periodType || 'monthly',
      noPaymentForPeriod: epsData.noPaymentForPeriod,
      statutoryPayRecovery: epsData.statutoryPayRecovery,
      employmentAllowance: epsData.employmentAllowance || (hmrcSettings.claimsEmploymentAllowance ? {
        claimed: true,
        amount: hmrcSettings.employmentAllowanceAmount || 5000
      } : undefined),
      cisDeductions: epsData.cisDeductions,
      apprenticeshipLevy: epsData.apprenticeshipLevy || (hmrcSettings.isApprenticeshipLevyPayer ? {
        amount: 0, // Calculate based on payroll
        allowance: hmrcSettings.apprenticeshipLevyAllowance || 15000
      } : undefined),
      submissionDate: new Date().toISOString().split('T')[0]
    }

    // 4. Generate XML client-side, submit server-side (tokens stay in Cloud Functions)
    const xmlGenerator = new RTIXMLGenerator()
    const xml = xmlGenerator.generateEPS(fullEPSData)
    const submitRes: any = await callCallableProxy("hmrcSubmitRtiXml", {
      companyId,
      siteId,
      subsiteId: subsiteId ?? null,
      type: "eps",
      xml,
      fraudHeaders: null,
    })

    const submitData = submitRes?.data || {}
    const ok = Boolean(submitData.success)
    const submissionId = submitData?.body?.submissionId || submitData?.correlationId
    const result: EPSSubmissionResult = ok
      ? {
          success: true,
          submissionId,
          correlationId: submitData?.correlationId,
          status: "accepted",
          submittedAt: Date.now(),
          responseBody: submitData?.body,
        }
      : {
          success: false,
          status: "rejected",
          errors: [
            {
              code: "SUBMISSION_ERROR",
              message: `HTTP ${submitData?.status || 0}: ${submitData?.statusText || "HMRC submission failed"}`,
            },
          ],
          submittedAt: Date.now(),
          responseBody: submitData?.body,
        }

    // 5. Update HMRC settings
    if (result.success && foundAt) {
      await saveHMRCSettings(companyId, siteId, subsiteId ?? null, foundAt, {
        lastEPSSubmissionDate: result.submittedAt
      })
    }

    return result
  } catch (error: any) {
    console.error('Error submitting EPS:', error)
    return {
      success: false,
      status: 'rejected',
      errors: [{
        code: 'EXCEPTION',
        message: error.message || 'Unknown error during EPS submission'
      }],
      submittedAt: Date.now()
    }
  }
}

/**
 * Auto-submit FPS after payroll approval (if enabled)
 */
export async function autoSubmitFPSIfEnabled(
  companyId: string,
  siteId: string,
  payrollId: string,
  subsiteId?: string | null,
): Promise<FPSSubmissionResult | null> {
  try {
    const { settings: hmrcSettings } = await fetchHMRCSettings(companyId, siteId, subsiteId)
    
    if (!hmrcSettings || !hmrcSettings.autoSubmitFPS) {
      // Auto-submit not enabled
      return null
    }

    // Submit FPS for this payroll
    return await submitFPSForPayrollRun(companyId, siteId, [payrollId], subsiteId || null)
  } catch (error) {
    console.error('Error in auto-submit FPS:', error)
    // Don't throw - auto-submit failures shouldn't block payroll approval
    return null
  }
}


/**
 * Fetch payroll record
 */
async function fetchPayrollRecord(
  companyId: string,
  siteId: string,
  payrollId: string
): Promise<Payroll | null> {
  try {
    const hrPath = `companies/${companyId}/sites/${siteId}/data/hr`
    const res: any = await callCallableProxy("hrGetPayroll", { hrPath, payrollId })
    return (res?.data?.payroll as Payroll) || null
  } catch (error) {
    console.error('Error fetching payroll record:', error)
    return null
  }
}

/**
 * Fetch employee
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

    const out: any = { id: employeeId, ...(employee as any) }
    const dob = out.dateOfBirth
    if (typeof dob === "string" && dob.trim() !== "") {
      const n = Number(dob)
      if (Number.isFinite(n)) out.dateOfBirth = n
    }
    const leavingDate = out.leavingDate
    if (typeof leavingDate === "string" && leavingDate.trim() !== "") {
      const n = Number(leavingDate)
      if (Number.isFinite(n)) out.leavingDate = n
    }
    return out as Employee
  } catch (error) {
    console.error('Error fetching employee:', error)
    return null
  }
}

/**
 * Update payroll submission status
 */
async function updatePayrollSubmissionStatus(
  companyId: string,
  siteId: string,
  payrollId: string,
  updates: {
    submittedToHMRC?: boolean
    fpsSubmissionDate?: number
    fpsSubmissionId?: string
    hmrcResponse?: string
  }
): Promise<void> {
  try {
    const payrollRef = ref(db, `companies/${companyId}/sites/${siteId}/data/hr/payrolls/${payrollId}`)
    await update(payrollRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating payroll submission status:', error)
    throw error
  }
}

/**
 * Test HMRC API connection - makes a simple API call to register with HMRC Gateway
 * This is required to verify the integration before moving to production
 * Uses Firebase Function to proxy the request (server-side to avoid CORS)
 */
export async function testHMRCAPIConnection(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  userId?: string
): Promise<{
  success: boolean
  status: number
  message: string
  data?: any
}> {
  try {
    // Proxy via Cloud Function (server-side, uses encrypted hmrcSecrets)
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId || 'stop-test-8025f',
      region: APP_KEYS.firebase.functionsRegion || 'us-central1',
    }).replace(':5002/', ':5001/') // This feature uses the other emulator port

    const requestBody = {
      companyId,
      siteId,
      subsiteId,
      userId: userId || undefined,
      fraudHeaders: null,
    }

    console.log('Calling Firebase Function to test HMRC API:', `${fnBase}/testHMRCAPIConnection`)

    // Add timeout to fetch (30 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    let response
    try {
      response = await fetch(`${fnBase}/testHMRCAPIConnection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds. Please check if the Firebase Functions emulator is running.')
      }
      throw fetchError
    }

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        const text = await response.text()
        throw new Error(`Server error (${response.status}): ${text}`)
      }
      
      return {
        success: false,
        status: response.status,
        message: errorData.message || errorData.error || 'Failed to test API connection'
      }
    }

    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('Error testing HMRC API connection:', error)
    return {
      success: false,
      status: 0,
      message: error.message || 'Unknown error during API connection test'
    }
  }
}

/**
 * Get current UK tax year
 */
function getCurrentTaxYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  
  if (month < 4 || (month === 4 && day < 6)) {
    return `${year - 1}-${year.toString().slice(-2)}`
  } else {
    return `${year}-${(year + 1).toString().slice(-2)}`
  }
}

