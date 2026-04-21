/**
 * HMRC RTI XML Generator
 * Generates XML for FPS, EPS, and EYU submissions according to HMRC schemas
 */

import { FPSSubmissionData, EPSSubmissionData, EYUSubmissionData } from './types'
import { Payroll, Employee } from '../../interfaces/HRs'

export class RTIXMLGenerator {
  /**
   * Generate FPS (Full Payment Submission) XML
   */
  generateFPS(data: FPSSubmissionData): string {
    const { payrollRecords, employerPAYEReference, accountsOfficeReference, taxYear, periodNumber, periodType, paymentDate, submissionDate } = data

    // Extract office number and reference from PAYE reference (format: 123/AB45678)
    const [officeNumber, officeReference] = employerPAYEReference.split('/')

    // Map period type to HMRC code
    const periodTypeCode = this.mapPeriodTypeToCode(periodType)

    // Build employee payment sections
    // Note: Employee data should be attached to payroll records before calling this method
    const employeePayments = payrollRecords.map((payroll, index) => {
      // Get employee from payroll (attached during submission in HMRCRTISubmission.tsx)
      const payrollWithEmployee = payroll as Payroll & { employee?: Employee }
      const employee = payrollWithEmployee.employee
      
      if (!employee) {
        throw new Error(`Employee data missing for payroll ${payroll.id} (index ${index}) - required for HMRC submission. Ensure employee data is fetched and attached before generating XML.`)
      }

      return this.generateEmployeePaymentSection(payroll, employee)
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/14-15/1">
  <IRheader>
    <Keys>
      <Key Type="TaxOfficeNumber">${this.escapeXML(officeNumber)}</Key>
      <Key Type="TaxOfficeReference">${this.escapeXML(officeReference)}</Key>
    </Keys>
    <PeriodEnd>${this.formatDate(submissionDate)}</PeriodEnd>
    <Sender>Software</Sender>
    <SenderID>1Stop Payroll v5</SenderID>
  </IRheader>
  
  <FullPaymentSubmission>
    <EmpRefs>
      <OfficeNo>${this.escapeXML(officeNumber)}</OfficeNo>
      <PayeRef>${this.escapeXML(officeReference)}</PayeRef>
      <AORef>${this.escapeXML(accountsOfficeReference)}</AORef>
    </EmpRefs>
    
    <TaxYear>${taxYear}</TaxYear>
    <PayFrequency>${periodTypeCode}</PayFrequency>
    <PayId>${periodNumber}</PayId>
    <PaymentDate>${this.formatDate(paymentDate)}</PaymentDate>
    
    ${employeePayments}
  </FullPaymentSubmission>
</IRenvelope>`

    return xml
  }

  /**
   * Generate EPS (Employer Payment Summary) XML
   */
  generateEPS(data: EPSSubmissionData): string {
    const { employerPAYEReference, accountsOfficeReference, taxYear, periodNumber, periodType, submissionDate } = data

    const [officeNumber, officeReference] = employerPAYEReference.split('/')
    const periodTypeCode = this.mapPeriodTypeToCode(periodType)

    let epsContent = ''

    // No payment for period
    if (data.noPaymentForPeriod) {
      epsContent += '<NoPaymentForPeriod>true</NoPaymentForPeriod>\n'
    }

    // Statutory payment recovery
    if (data.statutoryPayRecovery) {
      const sp = data.statutoryPayRecovery
      epsContent += '<StatutoryPayRecovery>\n'
      if (sp.smp) epsContent += `  <SMP>${sp.smp.toFixed(2)}</SMP>\n`
      if (sp.spp) epsContent += `  <SPP>${sp.spp.toFixed(2)}</SPP>\n`
      if (sp.sap) epsContent += `  <SAP>${sp.sap.toFixed(2)}</SAP>\n`
      if (sp.shpp) epsContent += `  <ShPP>${sp.shpp.toFixed(2)}</ShPP>\n`
      if (sp.aspp) epsContent += `  <ASPP>${sp.aspp.toFixed(2)}</ASPP>\n`
      epsContent += '</StatutoryPayRecovery>\n'
    }

    // Employment Allowance
    if (data.employmentAllowance?.claimed) {
      epsContent += `<EmploymentAllowance>${data.employmentAllowance.amount.toFixed(2)}</EmploymentAllowance>\n`
    }

    // CIS deductions
    if (data.cisDeductions) {
      epsContent += `<CISDeductions>${data.cisDeductions.toFixed(2)}</CISDeductions>\n`
    }

    // Apprenticeship Levy
    if (data.apprenticeshipLevy) {
      epsContent += `<ApprenticeshipLevy>
  <Amount>${data.apprenticeshipLevy.amount.toFixed(2)}</Amount>
  <Allowance>${data.apprenticeshipLevy.allowance.toFixed(2)}</Allowance>
</ApprenticeshipLevy>\n`
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EmployerPaymentSummary/14-15/1">
  <IRheader>
    <Keys>
      <Key Type="TaxOfficeNumber">${this.escapeXML(officeNumber)}</Key>
      <Key Type="TaxOfficeReference">${this.escapeXML(officeReference)}</Key>
    </Keys>
    <PeriodEnd>${this.formatDate(submissionDate)}</PeriodEnd>
    <Sender>Software</Sender>
    <SenderID>1Stop Payroll v5</SenderID>
  </IRheader>
  
  <EmployerPaymentSummary>
    <EmpRefs>
      <OfficeNo>${this.escapeXML(officeNumber)}</OfficeNo>
      <PayeRef>${this.escapeXML(officeReference)}</PayeRef>
      <AORef>${this.escapeXML(accountsOfficeReference)}</AORef>
    </EmpRefs>
    
    <TaxYear>${taxYear}</TaxYear>
    <PayFrequency>${periodTypeCode}</PayFrequency>
    <PayId>${periodNumber}</PayId>
    
    ${epsContent}
  </EmployerPaymentSummary>
</IRenvelope>`

    return xml
  }

  /**
   * Generate EYU (Earlier Year Update) XML
   */
  generateEYU(data: EYUSubmissionData): string {
    const { employerPAYEReference, accountsOfficeReference, taxYear, employeeId, originalPayrollId, corrections, reason, submissionDate } = data

    const [officeNumber, officeReference] = employerPAYEReference.split('/')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EarlierYearUpdate/14-15/1">
  <IRheader>
    <Keys>
      <Key Type="TaxOfficeNumber">${this.escapeXML(officeNumber)}</Key>
      <Key Type="TaxOfficeReference">${this.escapeXML(officeReference)}</Key>
    </Keys>
    <PeriodEnd>${this.formatDate(submissionDate)}</PeriodEnd>
    <Sender>Software</Sender>
    <SenderID>1Stop Payroll v5</SenderID>
  </IRheader>
  
  <EarlierYearUpdate>
    <EmpRefs>
      <OfficeNo>${this.escapeXML(officeNumber)}</OfficeNo>
      <PayeRef>${this.escapeXML(officeReference)}</PayeRef>
      <AORef>${this.escapeXML(accountsOfficeReference)}</AORef>
    </EmpRefs>
    
    <TaxYear>${taxYear}</TaxYear>
    <EmployeeId>${this.escapeXML(employeeId)}</EmployeeId>
    <OriginalPayrollId>${this.escapeXML(originalPayrollId)}</OriginalPayrollId>
    <Reason>${this.escapeXML(reason)}</Reason>
    
    <Corrections>
      ${corrections.grossPay !== undefined ? `<GrossPay>${corrections.grossPay.toFixed(2)}</GrossPay>` : ''}
      ${corrections.taxDeductions !== undefined ? `<TaxDeductions>${corrections.taxDeductions.toFixed(2)}</TaxDeductions>` : ''}
      ${corrections.niDeductions !== undefined ? `<NIDeductions>${corrections.niDeductions.toFixed(2)}</NIDeductions>` : ''}
      ${corrections.studentLoanDeductions !== undefined ? `<StudentLoanDeductions>${corrections.studentLoanDeductions.toFixed(2)}</StudentLoanDeductions>` : ''}
      ${corrections.pensionDeductions !== undefined ? `<PensionDeductions>${corrections.pensionDeductions.toFixed(2)}</PensionDeductions>` : ''}
    </Corrections>
  </EarlierYearUpdate>
</IRenvelope>`

    return xml
  }

  /**
   * Generate employee payment section for FPS
   */
  private generateEmployeePaymentSection(payroll: Payroll, employee: Employee): string {
    // Format NI number (remove spaces, ensure uppercase) - REQUIRED
    if (!employee.nationalInsuranceNumber) {
      throw new Error(`Employee ${employee.id} missing National Insurance Number - required for HMRC submission`)
    }
    const niNumber = employee.nationalInsuranceNumber.replace(/\s/g, '').toUpperCase()

    // Validate NI number format (basic check: should be 9 characters after formatting)
    if (niNumber.length !== 9 || !/^[A-Z]{2}[0-9]{6}[A-Z]?$/.test(niNumber)) {
      console.warn(`Invalid NI number format for employee ${employee.id}: ${niNumber}`)
    }

    // Get tax code (use from payroll, fallback to employee, then default)
    const taxCode = payroll.taxCode || employee.taxCode || '1257L'

    // Get tax code basis (use from payroll, fallback to employee, then default to cumulative)
    const taxCodeBasis = payroll.taxCodeBasis || employee.taxCodeBasis || 'cumulative'

    // Payment after leaving indicator (check employee status, not payroll status)
    const paymentAfterLeaving = (employee.status === 'terminated') ? 'true' : 'false'

    // Irregular employment indicator (can be set based on employee.employmentType or other factors)
    const irregularEmployment = (employee.employmentType === 'temporary' || employee.employmentType === 'contract') ? 'true' : 'false'

    return `    <Employee>
      <NINO>${this.escapeXML(niNumber)}</NINO>
      <PayId>${payroll.taxPeriod}</PayId>
      <TaxCode>${this.escapeXML(taxCode)}</TaxCode>
      <TaxBasis>${taxCodeBasis === 'cumulative' ? 'C' : 'W1'}</TaxBasis>
      <GrossPay>${payroll.grossPay.toFixed(2)}</GrossPay>
      <TaxablePay>${payroll.taxableGrossPay.toFixed(2)}</TaxablePay>
      <TaxDeducted>${payroll.taxDeductions.toFixed(2)}</TaxDeducted>
      <NICategory>${this.escapeXML(payroll.niCategory || 'A')}</NICategory>
      <EmployeeNIContributions>${payroll.employeeNIDeductions.toFixed(2)}</EmployeeNIContributions>
      <EmployerNIContributions>${payroll.employerNIContributions.toFixed(2)}</EmployerNIContributions>
      ${payroll.studentLoanDeductions > 0 ? `<StudentLoanDeduction>${payroll.studentLoanDeductions.toFixed(2)}</StudentLoanDeduction>` : ''}
      ${payroll.postgraduateLoanDeductions && payroll.postgraduateLoanDeductions > 0 ? `<PostgraduateLoanDeduction>${payroll.postgraduateLoanDeductions.toFixed(2)}</PostgraduateLoanDeduction>` : ''}
      ${payroll.employeePensionDeductions > 0 ? `<PensionDeduction>${payroll.employeePensionDeductions.toFixed(2)}</PensionDeduction>` : ''}
      ${payroll.statutorySickPay && payroll.statutorySickPay > 0 ? `<SSP>${payroll.statutorySickPay.toFixed(2)}</SSP>` : ''}
      ${payroll.statutoryMaternityPay && payroll.statutoryMaternityPay > 0 ? `<SMP>${payroll.statutoryMaternityPay.toFixed(2)}</SMP>` : ''}
      ${payroll.statutoryPaternityPay && payroll.statutoryPaternityPay > 0 ? `<SPP>${payroll.statutoryPaternityPay.toFixed(2)}</SPP>` : ''}
      <PaymentAfterLeaving>${paymentAfterLeaving}</PaymentAfterLeaving>
      <IrregularEmployment>${irregularEmployment}</IrregularEmployment>
      <YTDGrossPay>${payroll.ytdData.grossPayYTD.toFixed(2)}</YTDGrossPay>
      <YTDTaxablePay>${payroll.ytdData.taxablePayYTD.toFixed(2)}</YTDTaxablePay>
      <YTDTaxDeducted>${payroll.ytdData.taxPaidYTD.toFixed(2)}</YTDTaxDeducted>
      <YTDEmployeeNIContributions>${payroll.ytdData.employeeNIPaidYTD.toFixed(2)}</YTDEmployeeNIContributions>
      <YTDEmployerNIContributions>${payroll.ytdData.employerNIPaidYTD.toFixed(2)}</YTDEmployerNIContributions>
      ${payroll.ytdData.studentLoanPaidYTD !== undefined && payroll.ytdData.studentLoanPaidYTD > 0 ? `<YTDStudentLoanDeduction>${payroll.ytdData.studentLoanPaidYTD.toFixed(2)}</YTDStudentLoanDeduction>` : ''}
      ${payroll.ytdData.postgraduateLoanPaidYTD !== undefined && payroll.ytdData.postgraduateLoanPaidYTD > 0 ? `<YTDPostgraduateLoanDeduction>${payroll.ytdData.postgraduateLoanPaidYTD.toFixed(2)}</YTDPostgraduateLoanDeduction>` : ''}
      ${payroll.ytdData.employeePensionYTD > 0 ? `<YTDPensionDeduction>${payroll.ytdData.employeePensionYTD.toFixed(2)}</YTDPensionDeduction>` : ''}
    </Employee>`
  }

  /**
   * Map period type to HMRC code
   */
  private mapPeriodTypeToCode(periodType: 'weekly' | 'monthly' | 'fortnightly' | 'four_weekly'): string {
    const mapping = {
      'weekly': 'W1',
      'fortnightly': 'W2',
      'four_weekly': 'W4',
      'monthly': 'M1'
    }
    return mapping[periodType] || 'M1'
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Validate XML structure (basic validation)
   */
  validateXML(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for well-formed XML
    if (!xml.includes('<?xml')) {
      errors.push('Missing XML declaration')
    }

    // Check for required elements (basic checks)
    if (xml.includes('<FullPaymentSubmission>') && !xml.includes('<Employee>')) {
      errors.push('FPS must contain at least one Employee element')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

