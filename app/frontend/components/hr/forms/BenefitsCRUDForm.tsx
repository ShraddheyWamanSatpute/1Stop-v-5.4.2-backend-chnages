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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Card,
  CardContent,
  Alert,
  Slider,
  Autocomplete,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  CardGiftcard as CardGiftcardIcon,
  Group as GroupIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface BenefitPackage {
  id?: string
  name: string
  description: string
  category: 'health' | 'financial' | 'wellness' | 'time_off' | 'professional' | 'lifestyle' | 'other'
  type: 'mandatory' | 'optional' | 'tiered'
  eligibility: {
    employmentType: string[]
    minimumTenure: number // in months
    departments: string[]
    roles: string[]
  }
  coverage: {
    employeeCost: number
    employerContribution: number
    familyCoverage: boolean
    familyCost?: number
  }
  provider?: string
  details: {
    description: string
    terms: string
    limitations: string
    benefits: string[]
  }
  enrollmentPeriod: {
    startDate: Date
    endDate: Date
    isOpenEnrollment: boolean
  }
  isActive: boolean
  enrolledEmployees: Array<{
    employeeId: string
    enrollmentDate: Date
    coverageLevel: 'employee' | 'employee_spouse' | 'family'
    monthlyCost: number
  }>
  createdAt: Date
  updatedAt: Date
}

interface BenefitsCRUDFormProps {
  benefitPackage?: BenefitPackage | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface BenefitsCRUDFormHandle {
  submit: () => void
}

const BenefitsCRUDForm = React.forwardRef<BenefitsCRUDFormHandle, BenefitsCRUDFormProps>(({
  benefitPackage,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<BenefitPackage>({
    name: '',
    description: '',
    category: 'health',
    type: 'optional',
    eligibility: {
      employmentType: ['full_time'],
      minimumTenure: 0,
      departments: [],
      roles: []
    },
    coverage: {
      employeeCost: 0,
      employerContribution: 0,
      familyCoverage: false
    },
    details: {
      description: '',
      terms: '',
      limitations: '',
      benefits: []
    },
    enrollmentPeriod: {
      startDate: new Date(),
      endDate: new Date(),
      isOpenEnrollment: true
    },
    isActive: true,
    enrolledEmployees: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const [newBenefit, setNewBenefit] = useState('')

  // Update form data when benefitPackage prop changes
  useEffect(() => {
    if (benefitPackage) {
      setFormData({
        ...benefitPackage,
        enrollmentPeriod: {
          ...benefitPackage.enrollmentPeriod,
          startDate: new Date(benefitPackage.enrollmentPeriod.startDate),
          endDate: new Date(benefitPackage.enrollmentPeriod.endDate),
        },
        enrolledEmployees: benefitPackage.enrolledEmployees.map(enrollment => ({
          ...enrollment,
          enrollmentDate: new Date(enrollment.enrollmentDate)
        })),
        createdAt: new Date(benefitPackage.createdAt),
        updatedAt: new Date(benefitPackage.updatedAt),
      })
    }
  }, [benefitPackage])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('eligibility.')) {
      const eligibilityField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        eligibility: {
          ...prev.eligibility,
          [eligibilityField]: value
        },
        updatedAt: new Date()
      }))
    } else if (field.startsWith('coverage.')) {
      const coverageField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        coverage: {
          ...prev.coverage,
          [coverageField]: value
        },
        updatedAt: new Date()
      }))
    } else if (field.startsWith('details.')) {
      const detailsField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        details: {
          ...prev.details,
          [detailsField]: value
        },
        updatedAt: new Date()
      }))
    } else if (field.startsWith('enrollmentPeriod.')) {
      const enrollmentField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        enrollmentPeriod: {
          ...prev.enrollmentPeriod,
          [enrollmentField]: value
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

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        details: {
          ...prev.details,
          benefits: [...prev.details.benefits, newBenefit.trim()]
        }
      }))
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        benefits: prev.details.benefits.filter((_, i) => i !== index)
      }
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      enrollmentPeriod: {
        ...formData.enrollmentPeriod,
        startDate: formData.enrollmentPeriod.startDate.getTime(),
        endDate: formData.enrollmentPeriod.endDate.getTime(),
      },
      enrolledEmployees: formData.enrolledEmployees.map(enrollment => ({
        ...enrollment,
        enrollmentDate: enrollment.enrollmentDate.getTime()
      })),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Calculate eligible employees
  const getEligibleEmployees = () => {
    return hrState.employees?.filter(employee => {
      // Check employment type
      if (!formData.eligibility.employmentType.includes(employee.employmentType || '')) {
        return false
      }
      
      // Check tenure (simplified - would need hire date calculation)
      // For now, assume all employees meet tenure requirements
      
      // Check departments
      if (formData.eligibility.departments.length > 0 && 
          !formData.eligibility.departments.includes(employee.department || '')) {
        return false
      }
      
      // Check roles
      if (formData.eligibility.roles.length > 0 && 
          !formData.eligibility.roles.includes(employee.roleId || '')) {
        return false
      }
      
      return true
    }) || []
  }

  const eligibleEmployees = getEligibleEmployees()
  const enrollmentRate = eligibleEmployees.length > 0 
    ? (formData.enrolledEmployees.length / eligibleEmployees.length) * 100 
    : 0


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Benefit Package Information" 
          icon={<CardGiftcardIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Benefit Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Health Insurance, Dental Plan"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider"
                value={formData.provider || ''}
                onChange={(e) => handleChange('provider', e.target.value)}
                disabled={isReadOnly}
                placeholder="Insurance company or benefit provider"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="health">🏥 Health & Medical</MenuItem>
                  <MenuItem value="financial">💰 Financial</MenuItem>
                  <MenuItem value="wellness">🧘 Wellness</MenuItem>
                  <MenuItem value="time_off">🏖️ Time Off</MenuItem>
                  <MenuItem value="professional">📚 Professional Development</MenuItem>
                  <MenuItem value="lifestyle">🎯 Lifestyle</MenuItem>
                  <MenuItem value="other">📋 Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="mandatory">Mandatory</MenuItem>
                  <MenuItem value="optional">Optional</MenuItem>
                  <MenuItem value="tiered">Tiered</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Active Benefit"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Brief overview of the benefit package..."
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Eligibility Requirements" 
          icon={<GroupIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={['full_time', 'part_time', 'contract', 'temporary']}
                value={formData.eligibility.employmentType}
                onChange={(_, newValue) => handleChange('eligibility.employmentType', newValue)}
                disabled={isReadOnly}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip 
                      variant="outlined" 
                      label={option.replace('_', ' ').toUpperCase()} 
                      {...getTagProps({ index })} 
                      key={option} 
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employment Types"
                    placeholder="Select eligible employment types"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Minimum Tenure: {formData.eligibility.minimumTenure} months
                </Typography>
                <Slider
                  value={formData.eligibility.minimumTenure}
                  onChange={(_, newValue) => handleChange('eligibility.minimumTenure', newValue)}
                  disabled={isReadOnly}
                  min={0}
                  max={36}
                  step={1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 6, label: '6' },
                    { value: 12, label: '12' },
                    { value: 24, label: '24' },
                    { value: 36, label: '36' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={hrState.departments?.map(dept => dept.name) || []}
                value={formData.eligibility.departments}
                onChange={(_, newValue) => handleChange('eligibility.departments', newValue)}
                disabled={isReadOnly}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Eligible Departments"
                    placeholder="Leave empty for all departments"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={hrState.roles?.map(role => role.id) || []}
                value={formData.eligibility.roles}
                onChange={(_, newValue) => handleChange('eligibility.roles', newValue)}
                disabled={isReadOnly}
                getOptionLabel={(option) => {
                  const role = hrState.roles?.find(r => r.id === option)
                  return role?.label || role?.name || option
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const role = hrState.roles?.find(r => r.id === option)
                    return (
                      <Chip 
                        variant="outlined" 
                        label={role?.label || role?.name || option} 
                        {...getTagProps({ index })} 
                        key={option} 
                      />
                    )
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Eligible Roles"
                    placeholder="Leave empty for all roles"
                  />
                )}
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            Based on current eligibility criteria: <strong>{eligibleEmployees.length}</strong> employees are eligible for this benefit
          </Alert>
        </FormSection>

        <FormSection 
          title="Coverage & Costs" 
          icon={<AttachMoneyIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Employee Cost (Monthly)"
                type="number"
                value={formData.coverage.employeeCost}
                onChange={(e) => handleChange('coverage.employeeCost', Number(e.target.value))}
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
                label="Employer Contribution"
                type="number"
                value={formData.coverage.employerContribution}
                onChange={(e) => handleChange('coverage.employerContribution', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.coverage.familyCoverage}
                    onChange={(e) => handleChange('coverage.familyCoverage', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Family Coverage Available"
              />
            </Grid>
            {formData.coverage.familyCoverage && (
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Family Coverage Cost"
                  type="number"
                  value={formData.coverage.familyCost || 0}
                  onChange={(e) => handleChange('coverage.familyCost', Number(e.target.value))}
                  disabled={isReadOnly}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
            )}
          </Grid>

          <Paper sx={{ mt: 3, p: 2, bgcolor: 'success.50' }}>
            <Typography variant="h6" gutterBottom>
              Cost Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Total Monthly Cost:</strong> £{(formData.coverage.employeeCost + formData.coverage.employerContribution).toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Employee Portion:</strong> £{formData.coverage.employeeCost.toFixed(2)} 
                  ({formData.coverage.employeeCost > 0 ? ((formData.coverage.employeeCost / (formData.coverage.employeeCost + formData.coverage.employerContribution)) * 100).toFixed(1) : 0}%)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Employer Portion:</strong> £{formData.coverage.employerContribution.toFixed(2)} 
                  ({formData.coverage.employerContribution > 0 ? ((formData.coverage.employerContribution / (formData.coverage.employeeCost + formData.coverage.employerContribution)) * 100).toFixed(1) : 0}%)
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </FormSection>

        <FormSection 
          title="Benefit Details" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Detailed Description"
                multiline
                rows={4}
                value={formData.details.description}
                onChange={(e) => handleChange('details.description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Comprehensive description of what this benefit covers..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Terms & Conditions"
                multiline
                rows={3}
                value={formData.details.terms}
                onChange={(e) => handleChange('details.terms', e.target.value)}
                disabled={isReadOnly}
                placeholder="Important terms and conditions..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Limitations & Exclusions"
                multiline
                rows={3}
                value={formData.details.limitations}
                onChange={(e) => handleChange('details.limitations', e.target.value)}
                disabled={isReadOnly}
                placeholder="What's not covered or limitations..."
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Key Benefits</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a key benefit"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                disabled={isReadOnly}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addBenefit()
                  }
                }}
              />
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addBenefit}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.details.benefits.map((benefit, index) => (
                <Chip
                  key={index}
                  label={benefit}
                  onDelete={!isReadOnly ? () => removeBenefit(index) : undefined}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </FormSection>

        <FormSection 
          title="Enrollment Period" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Enrollment Start"
                value={formData.enrollmentPeriod.startDate}
                onChange={(date) => handleChange('enrollmentPeriod.startDate', date || new Date())}
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
                label="Enrollment End"
                value={formData.enrollmentPeriod.endDate}
                onChange={(date) => handleChange('enrollmentPeriod.endDate', date || new Date())}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enrollmentPeriod.isOpenEnrollment}
                    onChange={(e) => handleChange('enrollmentPeriod.isOpenEnrollment', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Open Enrollment Period"
              />
            </Grid>
          </Grid>
        </FormSection>

        {mode !== 'create' && formData.enrolledEmployees.length > 0 && (
          <FormSection 
            title="Enrollment Status" 
          >
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {formData.enrolledEmployees.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enrolled
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {eligibleEmployees.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Eligible
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {enrollmentRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enrollment Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Enrollments
              </Typography>
              <List>
                {formData.enrolledEmployees.slice(0, 10).map((enrollment) => {
                  const employee = hrState.employees?.find(emp => emp.id === enrollment.employeeId)
                  return employee ? (
                    <ListItem key={enrollment.employeeId} divider>
                      <ListItemAvatar>
                        <Avatar src={employee.photo}>
                          {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${employee.firstName} ${employee.lastName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {employee.department} | Enrolled: {enrollment.enrollmentDate.toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Coverage: {enrollment.coverageLevel.replace('_', ' ')} | Cost: £{enrollment.monthlyCost}/month
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ) : null
                })}
              </List>
            </Paper>
          </FormSection>
        )}

      </Box>
    </LocalizationProvider>
  )
})

export default BenefitsCRUDForm
