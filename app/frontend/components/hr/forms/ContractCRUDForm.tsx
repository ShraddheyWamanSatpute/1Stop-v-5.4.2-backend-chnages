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
  Chip,
  Paper,
  Switch,
  FormControlLabel,
  Avatar,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface Contract {
  id?: string
  employeeId: string
  contractType: 'permanent' | 'fixed_term' | 'zero_hours' | 'apprentice' | 'contractor'
  title: string
  startDate: Date
  endDate?: Date
  probationPeriod: number // in months
  noticePeriod: number // in weeks
  workingHours: {
    hoursPerWeek: number
    flexibleHours: boolean
    remoteWork: boolean
    remoteWorkDays?: number
  }
  compensation: {
    salaryType: 'hourly' | 'annual'
    amount: number
    currency: string
    payFrequency: 'weekly' | 'monthly'
    overtime: {
      eligible: boolean
      rate?: number
    }
  }
  benefits: string[]
  terms: {
    confidentiality: boolean
    nonCompete: boolean
    nonCompetePeriod?: number // in months
    intellectualProperty: boolean
  }
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated'
  signedDate?: Date
  terminationDate?: Date
  terminationReason?: string
  renewalDate?: Date
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface ContractCRUDFormProps {
  contract?: Contract | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface ContractCRUDFormHandle {
  submit: () => void
}

const ContractCRUDForm = React.forwardRef<ContractCRUDFormHandle, ContractCRUDFormProps>(({
  contract,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<Contract>({
    employeeId: '',
    contractType: 'permanent',
    title: '',
    startDate: new Date(),
    probationPeriod: 6,
    noticePeriod: 4,
    workingHours: {
      hoursPerWeek: 40,
      flexibleHours: false,
      remoteWork: false,
    },
    compensation: {
      salaryType: 'annual',
      amount: 0,
      currency: 'GBP',
      payFrequency: 'monthly',
      overtime: {
        eligible: true,
      }
    },
    benefits: [],
    terms: {
      confidentiality: true,
      nonCompete: false,
      intellectualProperty: true,
    },
    status: 'draft',
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when contract prop changes
  useEffect(() => {
    if (contract) {
      console.log("ContractCRUDForm - Loading contract data:", contract)
      
      // Handle both form interface and backend interface
      const formDataUpdate: any = {
        // Basic fields
        id: contract.id,
        employeeId: contract.employeeId || '',
        contractType: contract.contractType || (contract as any).type || 'permanent',
        title: contract.title || (contract as any).contractTitle || '',
        
        // Dates - handle both Date objects and timestamps
        startDate: contract.startDate 
          ? (contract.startDate instanceof Date ? contract.startDate : new Date(contract.startDate))
          : new Date(),
        endDate: contract.endDate 
          ? (contract.endDate instanceof Date ? contract.endDate : new Date(contract.endDate))
          : undefined,
        signedDate: contract.signedDate 
          ? (contract.signedDate instanceof Date ? contract.signedDate : new Date(contract.signedDate))
          : undefined,
        terminationDate: contract.terminationDate 
          ? (contract.terminationDate instanceof Date ? contract.terminationDate : new Date(contract.terminationDate))
          : undefined,
        renewalDate: contract.renewalDate 
          ? (contract.renewalDate instanceof Date ? contract.renewalDate : new Date(contract.renewalDate))
          : undefined,
        
        // Probation and notice
        probationPeriod: contract.probationPeriod || (contract as any).probationPeriod || 6,
        noticePeriod: contract.noticePeriod || 4,
        
        // Working hours - handle both object and string formats
        workingHours: contract.workingHours || {
          hoursPerWeek: (contract as any).workingHours?.hoursPerWeek || 40,
          flexibleHours: (contract as any).workingHours?.flexibleHours || false,
          remoteWork: (contract as any).workingHours?.remoteWork || false,
        },
        
        // Compensation - handle both object and flat formats
        compensation: contract.compensation || {
          salaryType: (contract as any).salaryType || 'annual',
          amount: contract.compensation?.amount || (contract as any).salary || 0,
          currency: contract.compensation?.currency || 'GBP',
          payFrequency: contract.compensation?.payFrequency || 'monthly',
          overtime: contract.compensation?.overtime || {
            eligible: true,
          }
        },
        
        // Benefits and terms
        benefits: contract.benefits || (contract as any).benefits || [],
        terms: contract.terms || {
          confidentiality: (contract as any).terms?.confidentiality !== false,
          nonCompete: (contract as any).terms?.nonCompete || false,
          intellectualProperty: (contract as any).terms?.intellectualProperty !== false,
        },
        
        // Status
        status: contract.status || 'draft',
        
        // Other fields
        notes: contract.notes || (contract as any).notes || '',
        createdBy: contract.createdBy || (contract as any).createdBy || '',
        createdAt: contract.createdAt 
          ? (contract.createdAt instanceof Date ? contract.createdAt : new Date(contract.createdAt))
          : new Date(),
        updatedAt: contract.updatedAt 
          ? (contract.updatedAt instanceof Date ? contract.updatedAt : new Date(contract.updatedAt))
          : new Date(),
      }
      
      console.log("ContractCRUDForm - Form data update:", formDataUpdate)
      setFormData(formDataUpdate)
    } else {
      // Reset to default when no contract
      setFormData({
        employeeId: '',
        contractType: 'permanent',
        title: '',
        startDate: new Date(),
        endDate: undefined,
        probationPeriod: 6,
        noticePeriod: 4,
        workingHours: {
          hoursPerWeek: 40,
          flexibleHours: false,
          remoteWork: false,
        },
        compensation: {
          salaryType: 'annual',
          amount: 0,
          currency: 'GBP',
          payFrequency: 'monthly',
          overtime: {
            eligible: true,
          }
        },
        benefits: [],
        terms: {
          confidentiality: true,
          nonCompete: false,
          intellectualProperty: true,
        },
        status: 'draft',
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }, [contract])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('workingHours.')) {
      const workingHoursField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [workingHoursField]: value
        },
        updatedAt: new Date()
      }))
    } else if (field.startsWith('compensation.')) {
      const compensationField = field.split('.')[1]
      if (field.startsWith('compensation.overtime.')) {
        const overtimeField = field.split('.')[2]
        setFormData(prev => ({
          ...prev,
          compensation: {
            ...prev.compensation,
            overtime: {
              ...prev.compensation.overtime,
              [overtimeField]: value
            }
          },
          updatedAt: new Date()
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          compensation: {
            ...prev.compensation,
            [compensationField]: value
          },
          updatedAt: new Date()
        }))
      }
    } else if (field.startsWith('terms.')) {
      const termsField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        terms: {
          ...prev.terms,
          [termsField]: value
        },
        updatedAt: new Date()
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        updatedAt: new Date()
      }))
    }
  }

  const handleSubmit = useCallback(() => {
    // Ensure employeeId is included and not empty
    if (!formData.employeeId) {
      console.error("ContractCRUDForm - employeeId is required but not set")
      alert("Please select an employee")
      return
    }
    
    const submissionData = {
      ...formData,
      // Explicitly ensure employeeId is included
      employeeId: formData.employeeId,
      startDate: formData.startDate.getTime(),
      endDate: formData.endDate?.getTime(),
      signedDate: formData.signedDate?.getTime(),
      terminationDate: formData.terminationDate?.getTime(),
      renewalDate: formData.renewalDate?.getTime(),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    
    console.log("ContractCRUDForm - Submitting data:", submissionData)
    console.log("ContractCRUDForm - employeeId in submission:", submissionData.employeeId)
    
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Get selected employee details
  const selectedEmployee = hrState.employees?.find(emp => emp.id === formData.employeeId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'expired': return 'error'
      case 'terminated': return 'error'
      case 'pending_signature': return 'warning'
      default: return 'default'
    }
  }

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'permanent': return 'Permanent Contract'
      case 'fixed_term': return 'Fixed Term Contract'
      case 'zero_hours': return 'Zero Hours Contract'
      case 'apprentice': return 'Apprenticeship Contract'
      case 'contractor': return 'Contractor Agreement'
      default: return type
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Contract Information" 
          icon={<AssignmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  label="Employee"
                >
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {hrState.employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department || 'No department'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Contract Type</InputLabel>
                <Select
                  value={formData.contractType}
                  onChange={(e) => handleChange('contractType', e.target.value)}
                  label="Contract Type"
                >
                  <MenuItem value="permanent">Permanent Contract</MenuItem>
                  <MenuItem value="fixed_term">Fixed Term Contract</MenuItem>
                  <MenuItem value="zero_hours">Zero Hours Contract</MenuItem>
                  <MenuItem value="apprentice">Apprenticeship Contract</MenuItem>
                  <MenuItem value="contractor">Contractor Agreement</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contract Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Senior Chef Employment Contract"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => handleChange('startDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            {formData.contractType === 'fixed_term' && (
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate || null}
                  onChange={(date) => handleChange('endDate', date)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: formData.contractType === 'fixed_term',
                    },
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="pending_signature">Pending Signature</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="terminated">Terminated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {selectedEmployee && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Employee Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedEmployee.photo}
                  sx={{ width: 48, height: 48 }}
                >
                  {selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.position} - {selectedEmployee.department}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.email}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Working Arrangements" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Hours Per Week"
                type="number"
                value={formData.workingHours.hoursPerWeek}
                onChange={(e) => handleChange('workingHours.hoursPerWeek', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 0, max: 168, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.workingHours.flexibleHours}
                    onChange={(e) => handleChange('workingHours.flexibleHours', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Flexible Hours"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.workingHours.remoteWork}
                    onChange={(e) => handleChange('workingHours.remoteWork', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Remote Work Allowed"
              />
            </Grid>
            {formData.workingHours.remoteWork && (
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Remote Work Days Per Week"
                  type="number"
                  value={formData.workingHours.remoteWorkDays || 0}
                  onChange={(e) => handleChange('workingHours.remoteWorkDays', Number(e.target.value))}
                  disabled={isReadOnly}
                  InputProps={{
                    inputProps: { min: 0, max: 7 }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Probation Period (months)"
                type="number"
                value={formData.probationPeriod}
                onChange={(e) => handleChange('probationPeriod', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 0, max: 24 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Notice Period (weeks)"
                type="number"
                value={formData.noticePeriod}
                onChange={(e) => handleChange('noticePeriod', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 1, max: 52 }
                }}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Compensation" 
          icon={<AttachMoneyIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Salary Type</InputLabel>
                <Select
                  value={formData.compensation.salaryType}
                  onChange={(e) => handleChange('compensation.salaryType', e.target.value)}
                  label="Salary Type"
                >
                  <MenuItem value="hourly">Hourly Rate</MenuItem>
                  <MenuItem value="annual">Annual Salary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label={formData.compensation.salaryType === 'hourly' ? 'Hourly Rate' : 'Annual Salary'}
                type="number"
                value={formData.compensation.amount}
                onChange={(e) => handleChange('compensation.amount', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.compensation.currency}
                  onChange={(e) => handleChange('compensation.currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Pay Frequency</InputLabel>
                <Select
                  value={formData.compensation.payFrequency}
                  onChange={(e) => handleChange('compensation.payFrequency', e.target.value)}
                  label="Pay Frequency"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.compensation.overtime.eligible}
                    onChange={(e) => handleChange('compensation.overtime.eligible', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Eligible for Overtime"
              />
            </Grid>
            {formData.compensation.overtime.eligible && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Overtime Rate Multiplier"
                  type="number"
                  value={formData.compensation.overtime.rate || 1.5}
                  onChange={(e) => handleChange('compensation.overtime.rate', Number(e.target.value))}
                  disabled={isReadOnly}
                  InputProps={{
                    inputProps: { min: 1, max: 3, step: 0.1 }
                  }}
                  helperText="e.g., 1.5 for time and a half"
                />
              </Grid>
            )}
          </Grid>
        </FormSection>

        <FormSection 
          title="Terms & Conditions" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.terms.confidentiality}
                    onChange={(e) => handleChange('terms.confidentiality', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Confidentiality Agreement"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.terms.nonCompete}
                    onChange={(e) => handleChange('terms.nonCompete', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Non-Compete Clause"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.terms.intellectualProperty}
                    onChange={(e) => handleChange('terms.intellectualProperty', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Intellectual Property Rights"
              />
            </Grid>
            {formData.terms.nonCompete && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Non-Compete Period (months)"
                  type="number"
                  value={formData.terms.nonCompetePeriod || 6}
                  onChange={(e) => handleChange('terms.nonCompetePeriod', Number(e.target.value))}
                  disabled={isReadOnly}
                  InputProps={{
                    inputProps: { min: 1, max: 24 }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={4}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isReadOnly}
                placeholder="Any additional contract terms or notes..."
              />
            </Grid>
          </Grid>
        </FormSection>

        {formData.status === 'terminated' && (
          <FormSection 
            title="Termination Details" 
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Termination Date"
                  value={formData.terminationDate || null}
                  onChange={(date) => handleChange('terminationDate', date)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Termination Reason"
                  multiline
                  rows={3}
                  value={formData.terminationReason || ''}
                  onChange={(e) => handleChange('terminationReason', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Reason for contract termination..."
                />
              </Grid>
            </Grid>
          </FormSection>
        )}

        <Paper sx={{ mt: 3, p: 2, bgcolor: 'info.50' }}>
          <Typography variant="h6" gutterBottom>
            Contract Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Contract Type:</strong> {getContractTypeLabel(formData.contractType)}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {formData.contractType === 'permanent' ? 'Permanent' : 
                  formData.endDate ? `Until ${formData.endDate.toLocaleDateString()}` : 'Ongoing'}
              </Typography>
              <Typography variant="body2">
                <strong>Working Hours:</strong> {formData.workingHours.hoursPerWeek} hours/week
                {formData.workingHours.flexibleHours && ' (Flexible)'}
                {formData.workingHours.remoteWork && ` (${formData.workingHours.remoteWorkDays || 0} remote days)`}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Compensation:</strong> £{formData.compensation.amount.toLocaleString()} 
                {formData.compensation.salaryType === 'hourly' ? '/hour' : '/year'} 
                ({formData.compensation.payFrequency})
              </Typography>
              <Typography variant="body2">
                <strong>Probation:</strong> {formData.probationPeriod} months
              </Typography>
              <Typography variant="body2">
                <strong>Notice Period:</strong> {formData.noticePeriod} weeks
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={formData.status.replace('_', ' ').toUpperCase()} 
              color={getStatusColor(formData.status) as any}
              size="small"
            />
          </Box>
        </Paper>

        {!isReadOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {mode === 'edit' ? 'Update Contract' : 'Create Contract'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
})

export default ContractCRUDForm
