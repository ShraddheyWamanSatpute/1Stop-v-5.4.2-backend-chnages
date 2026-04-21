"use client"

import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { calculateEmployeePayroll, calculatePeriodNumber } from '../../../../backend/functions/PayrollCalculation'

interface PayrollEntry {
  id?: string
  employeeId: string
  payPeriodStart: Date
  payPeriodEnd: Date
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
  bonuses?: number
  commission?: number
  troncPayment?: number
  holidayPay?: number
  otherPayments?: number
  grossPay: number
  taxDeductions: number
  niDeductions: number
  pensionDeductions: number
  studentLoanDeductions?: number
  otherDeductions: number
  netPay: number
  status: 'draft' | 'approved' | 'paid'
  payDate?: Date
  notes?: string
  // Calculation results
  taxCode?: string
  niCategory?: string
  calculationLog?: string[]
  ytdData?: any
}

interface PayrollCRUDFormProps {
  payrollEntry?: PayrollEntry | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  employees?: any[]
}

export interface PayrollCRUDFormHandle {
  submit: () => void
}

const PayrollCRUDForm = React.forwardRef<PayrollCRUDFormHandle, PayrollCRUDFormProps>(({
  payrollEntry,
  mode,
  onSave,
  employees: employeesProp
}, ref) => {
  const { state: hrState } = useHR()
  const { state: companyState } = useCompany()
  
  // Use employees from props if provided, otherwise from hrState
  const employees = employeesProp || hrState.employees || []

  const [formData, setFormData] = useState<PayrollEntry>({
    employeeId: '',
    payPeriodStart: new Date(),
    payPeriodEnd: new Date(),
    regularHours: 0,
    overtimeHours: 0,
    regularRate: 0,
    overtimeRate: 0,
    bonuses: 0,
    commission: 0,
    troncPayment: 0,
    holidayPay: 0,
    otherPayments: 0,
    grossPay: 0,
    taxDeductions: 0,
    niDeductions: 0,
    pensionDeductions: 0,
    studentLoanDeductions: 0,
    otherDeductions: 0,
    netPay: 0,
    status: 'draft',
    notes: '',
  })

  const [calculating, setCalculating] = useState(false)
  const [calculationResult, setCalculationResult] = useState<any>(null)
  const [calculationError, setCalculationError] = useState<string | null>(null)

  // Update form data when payrollEntry prop changes
  useEffect(() => {
    if (payrollEntry) {
      setFormData({
        ...payrollEntry,
        payPeriodStart: new Date(payrollEntry.payPeriodStart),
        payPeriodEnd: new Date(payrollEntry.payPeriodEnd),
        payDate: payrollEntry.payDate ? new Date(payrollEntry.payDate) : undefined,
      })
    }
  }, [payrollEntry])

  // Auto-calculate payroll using backend when relevant fields change
  useEffect(() => {
    const calculatePayroll = async () => {
      // Only calculate if we have required data
      if (!formData.employeeId || formData.regularHours === 0) {
        return
      }

      const employee = employees?.find(emp => emp.id === formData.employeeId)
      if (!employee) return

      setCalculating(true)
      setCalculationError(null)

      try {
        // Calculate gross pay
        const regularPay = formData.regularHours * formData.regularRate
        const overtimePay = formData.overtimeHours * formData.overtimeRate
        const grossPay = regularPay + overtimePay

        // Determine period type from employee
        const periodType = employee.paymentFrequency || 'monthly'
        
        // Calculate period number
        const periodNumber = calculatePeriodNumber(
          formData.payPeriodStart,
          periodType as any
        )

        // Call backend calculation
        // Use a default site ID - in production, this should come from user context
        const siteId = 'default-site'
        const result = await calculateEmployeePayroll(
          companyState.companyID || '',
          siteId,
          formData.employeeId,
          {
            grossPay,
            payPeriodStart: formData.payPeriodStart.getTime(),
            payPeriodEnd: formData.payPeriodEnd.getTime(),
            periodNumber,
            periodType: periodType as any,
            bonuses: formData.bonuses || 0,
            commission: formData.commission || 0,
            troncPayment: formData.troncPayment || 0,
            holidayPay: formData.holidayPay || 0,
            otherPayments: formData.otherPayments || 0,
            regularHours: formData.regularHours,
            overtimeHours: formData.overtimeHours,
          }
        )

        // Update form with calculated values
        setFormData(prev => ({
          ...prev,
          grossPay: result.grossPayBeforeDeductions,
          taxDeductions: result.taxCalculation.taxDueThisPeriod,
          niDeductions: result.niCalculation.employeeNIThisPeriod,
          pensionDeductions: result.pensionCalculation.employeeContribution,
          studentLoanDeductions: result.studentLoanCalculation.totalDeduction,
          netPay: result.netPay,
          taxCode: result.taxCalculation.taxCode,
          niCategory: result.niCalculation.niCategory,
          calculationLog: result.calculationLog,
          ytdData: result.updatedYTD,
        }))

        setCalculationResult(result)
      } catch (error: any) {
        console.error('Calculation error:', error)
        setCalculationError(error.message || 'Failed to calculate payroll')
      } finally {
        setCalculating(false)
      }
    }

    calculatePayroll()
  }, [
    formData.employeeId,
    formData.regularHours,
    formData.overtimeHours,
    formData.regularRate,
    formData.overtimeRate,
    formData.bonuses,
    formData.commission,
    formData.troncPayment,
    formData.holidayPay,
    formData.otherPayments,
    formData.payPeriodStart,
    formData.payPeriodEnd,
    employees,
    companyState.companyID,
    companyState.company,
  ])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      payPeriodStart: formData.payPeriodStart.getTime(),
      payPeriodEnd: formData.payPeriodEnd.getTime(),
      payDate: formData.payDate?.getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Get selected employee details
  const selectedEmployee = employees?.find(emp => emp.id === formData.employeeId)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        {calculationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Calculation Error:</strong> {calculationError}
          </Alert>
        )}

        <FormSection 
          title="Employee & Pay Period" 
          icon={<PersonIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => {
                    const employee = employees?.find(emp => emp.id === e.target.value)
                    handleChange('employeeId', e.target.value)
                    if (employee) {
                      // Auto-fill rates from employee data
                      const rate = employee.hourlyRate || (employee.salary / 52 / (employee.hoursPerWeek || 40))
                      handleChange('regularRate', rate)
                      handleChange('overtimeRate', rate * 1.5)
                    }
                  }}
                  label="Employee"
                >
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.position || 'No position'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Pay Period Start"
                value={formData.payPeriodStart}
                onChange={(date) => handleChange('payPeriodStart', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Pay Period End"
                value={formData.payPeriodEnd}
                onChange={(date) => handleChange('payPeriodEnd', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            {formData.status === 'paid' && (
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Pay Date"
                  value={formData.payDate || null}
                  onChange={(date) => handleChange('payDate', date)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            )}
          </Grid>

          {selectedEmployee && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Employee Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>NI Number:</strong> {selectedEmployee.nationalInsuranceNumber || 'Not set'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tax Code:</strong> {selectedEmployee.taxCode || '1257L'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>NI Category:</strong> {selectedEmployee.niCategory || 'A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Payment Frequency:</strong> {selectedEmployee.paymentFrequency || 'monthly'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Student Loan:</strong> {selectedEmployee.studentLoanPlan || 'None'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Pension Status:</strong> {selectedEmployee.autoEnrolmentStatus || 'Not enrolled'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Hourly Rate:</strong> £{selectedEmployee.hourlyRate || 0}/hour
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Hours & Base Pay" 
          icon={<CalculateIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Regular Hours"
                type="number"
                value={formData.regularHours}
                onChange={(e) => handleChange('regularHours', Number(e.target.value))}
                disabled={isReadOnly}
                required
                InputProps={{
                  inputProps: { min: 0, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Regular Rate"
                type="number"
                value={formData.regularRate}
                onChange={(e) => handleChange('regularRate', Number(e.target.value))}
                disabled={isReadOnly}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Overtime Hours"
                type="number"
                value={formData.overtimeHours}
                onChange={(e) => handleChange('overtimeHours', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 0, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Overtime Rate"
                type="number"
                value={formData.overtimeRate}
                onChange={(e) => handleChange('overtimeRate', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" gutterBottom>
            Additional Payments
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Bonuses"
                type="number"
                value={formData.bonuses || 0}
                onChange={(e) => handleChange('bonuses', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Commission"
                type="number"
                value={formData.commission || 0}
                onChange={(e) => handleChange('commission', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Tronc/Service Charge"
                type="number"
                value={formData.troncPayment || 0}
                onChange={(e) => handleChange('troncPayment', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
                helperText="Tips and service charges"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Holiday Pay"
                type="number"
                value={formData.holidayPay || 0}
                onChange={(e) => handleChange('holidayPay', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Payroll Calculation" 
          icon={<AttachMoneyIcon />}
        >
          {calculating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography>Calculating HMRC-compliant payroll...</Typography>
            </Box>
          )}

          {!calculating && calculationResult && (
            <Alert severity="success" sx={{ mb: 3 }} icon={<CheckIcon />}>
              Payroll calculated using HMRC-compliant backend engine (Tax Code: {formData.taxCode}, NI Category: {formData.niCategory})
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Gross Pay Breakdown
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Regular Pay"
                      secondary={`${formData.regularHours} hours × £${formData.regularRate}`}
                    />
                    <Typography variant="body1">
                      £{(formData.regularHours * formData.regularRate).toFixed(2)}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Overtime Pay"
                      secondary={`${formData.overtimeHours} hours × £${formData.overtimeRate}`}
                    />
                    <Typography variant="body1">
                      £{(formData.overtimeHours * formData.overtimeRate).toFixed(2)}
                    </Typography>
                  </ListItem>
                  {formData.bonuses! > 0 && (
                    <ListItem>
                      <ListItemText primary="Bonuses" />
                      <Typography variant="body1">£{formData.bonuses!.toFixed(2)}</Typography>
                    </ListItem>
                  )}
                  {formData.commission! > 0 && (
                    <ListItem>
                      <ListItemText primary="Commission" />
                      <Typography variant="body1">£{formData.commission!.toFixed(2)}</Typography>
                    </ListItem>
                  )}
                  {formData.troncPayment! > 0 && (
                    <ListItem>
                      <ListItemText primary="Tronc/Service Charge" />
                      <Typography variant="body1">£{formData.troncPayment!.toFixed(2)}</Typography>
                    </ListItem>
                  )}
                  {formData.holidayPay! > 0 && (
                    <ListItem>
                      <ListItemText primary="Holiday Pay" />
                      <Typography variant="body1">£{formData.holidayPay!.toFixed(2)}</Typography>
                    </ListItem>
                  )}
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="GROSS PAY"
                      primaryTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                    />
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      £{formData.grossPay.toFixed(2)}
                    </Typography>
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom color="error">
                  Deductions
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary={`Income Tax (${formData.taxCode || '1257L'})`}
                      secondary={calculationResult?.taxCalculation?.calculation}
                    />
                    <Typography variant="body1" color="error">
                      -£{formData.taxDeductions.toFixed(2)}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={`National Insurance (${formData.niCategory || 'A'})`}
                      secondary={calculationResult?.niCalculation?.calculation}
                    />
                    <Typography variant="body1" color="error">
                      -£{formData.niDeductions.toFixed(2)}
                    </Typography>
                  </ListItem>
                  {formData.pensionDeductions > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary="Pension Contribution"
                        secondary={calculationResult?.pensionCalculation?.calculation}
                      />
                      <Typography variant="body1" color="error">
                        -£{formData.pensionDeductions.toFixed(2)}
                      </Typography>
                    </ListItem>
                  )}
                  {formData.studentLoanDeductions! > 0 && (
                    <ListItem>
                      <ListItemText 
                        primary="Student Loan"
                        secondary={calculationResult?.studentLoanCalculation?.calculation}
                      />
                      <Typography variant="body1" color="error">
                        -£{formData.studentLoanDeductions!.toFixed(2)}
                      </Typography>
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText 
                      primary={
                        <TextField
                          size="small"
                          label="Other Deductions"
                          type="number"
                          value={formData.otherDeductions}
                          onChange={(e) => handleChange('otherDeductions', Number(e.target.value))}
                          disabled={isReadOnly}
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>-£</Typography>,
                            inputProps: { min: 0, step: 0.01 }
                          }}
                          sx={{ minWidth: 150 }}
                        />
                      }
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="NET PAY"
                      primaryTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                    />
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      £{formData.netPay.toFixed(2)}
                    </Typography>
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>

          {calculationResult?.ytdData && (
            <Accordion sx={{ mt: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  Year-to-Date Figures (After This Payment)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Gross Pay YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.grossPayYTD.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Tax Paid YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.taxPaidYTD.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Employee NI YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.employeeNIPaidYTD.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Pension YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.employeePensionYTD.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Employer NI YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.employerNIPaidYTD.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Employer Pension YTD</Typography>
                    <Typography variant="body1">£{calculationResult.ytdData.employerPensionYTD.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          {calculationResult?.calculationLog && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  Detailed Calculation Log (Audit Trail)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {calculationResult.calculationLog.map((log: string, index: number) => (
                    <Typography key={index} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                      {log}
                    </Typography>
                  ))}
                </Paper>
              </AccordionDetails>
            </Accordion>
          )}
        </FormSection>

        <FormSection 
          title="Notes" 
          icon={<ReceiptIcon />}
        >
          <TextField
            fullWidth
            label="Additional Notes"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={isReadOnly}
            placeholder="Any additional notes about this payroll entry..."
          />
        </FormSection>

        {!isReadOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={calculating || !formData.employeeId}
              style={{
                padding: '12px 24px',
                backgroundColor: calculating || !formData.employeeId ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: calculating || !formData.employeeId ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {mode === 'edit' ? 'Update Payroll Entry' : 'Create Payroll Entry'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
})

export default PayrollCRUDForm
