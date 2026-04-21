"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface ComplianceRecord {
  id?: string
  title: string
  description: string
  type: 'certification' | 'training' | 'document' | 'policy_acknowledgment' | 'safety_check' | 'audit'
  category: 'legal' | 'safety' | 'data_protection' | 'financial' | 'operational' | 'hr_policies'
  priority: 'low' | 'medium' | 'high' | 'critical'
  requiredFor: 'all' | 'department' | 'role' | 'specific_employees'
  targetDepartments: string[]
  targetRoles: string[]
  targetEmployees: string[]
  requirements: {
    description: string
    dueDate: Date
    renewalRequired: boolean
    renewalPeriod?: number // in months
    documentRequired: boolean
    trainingRequired: boolean
  }
  compliance: Array<{
    employeeId: string
    status: 'compliant' | 'non_compliant' | 'pending' | 'expired'
    completionDate?: Date
    expiryDate?: Date
    documentUrl?: string
    notes?: string
  }>
  status: 'active' | 'inactive' | 'expired'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface ComplianceCRUDFormProps {
  complianceRecord?: ComplianceRecord | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface ComplianceCRUDFormHandle {
  submit: () => void
}

const ComplianceCRUDForm = React.forwardRef<ComplianceCRUDFormHandle, ComplianceCRUDFormProps>(({
  complianceRecord,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<ComplianceRecord>({
    title: '',
    description: '',
    type: 'certification',
    category: 'legal',
    priority: 'medium',
    requiredFor: 'all',
    targetDepartments: [],
    targetRoles: [],
    targetEmployees: [],
    requirements: {
      description: '',
      dueDate: new Date(),
      renewalRequired: false,
      documentRequired: false,
      trainingRequired: false,
    },
    compliance: [],
    status: 'active',
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when complianceRecord prop changes
  useEffect(() => {
    if (complianceRecord) {
      setFormData({
        ...complianceRecord,
        requirements: {
          ...complianceRecord.requirements,
          dueDate: new Date(complianceRecord.requirements.dueDate),
        },
        compliance: complianceRecord.compliance.map(comp => ({
          ...comp,
          completionDate: comp.completionDate ? new Date(comp.completionDate) : undefined,
          expiryDate: comp.expiryDate ? new Date(comp.expiryDate) : undefined,
        })),
        createdAt: new Date(complianceRecord.createdAt),
        updatedAt: new Date(complianceRecord.updatedAt),
      })
    }
  }, [complianceRecord])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('requirements.')) {
      const requirementField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          [requirementField]: value
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
    const submissionData = {
      ...formData,
      requirements: {
        ...formData.requirements,
        dueDate: formData.requirements.dueDate.getTime(),
      },
      compliance: formData.compliance.map(comp => ({
        ...comp,
        completionDate: comp.completionDate?.getTime(),
        expiryDate: comp.expiryDate?.getTime(),
      })),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Calculate compliance statistics
  const getComplianceStats = () => {
    const total = formData.compliance.length
    const compliant = formData.compliance.filter(c => c.status === 'compliant').length
    const nonCompliant = formData.compliance.filter(c => c.status === 'non_compliant').length
    const pending = formData.compliance.filter(c => c.status === 'pending').length
    const expired = formData.compliance.filter(c => c.status === 'expired').length
    
    return { total, compliant, nonCompliant, pending, expired }
  }

  const complianceStats = getComplianceStats()
  const complianceRate = complianceStats.total > 0 ? (complianceStats.compliant / complianceStats.total) * 100 : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'success'
      case 'non_compliant': return 'error'
      case 'expired': return 'error'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'default'
      default: return 'default'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'legal': return '⚖️'
      case 'safety': return '🦺'
      case 'data_protection': return '🔒'
      case 'financial': return '💰'
      case 'operational': return '⚙️'
      case 'hr_policies': return '👥'
      default: return '📋'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Compliance Requirement" 
          icon={<SecurityIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Compliance Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Food Safety Certification, GDPR Training"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="certification">Certification</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
                  <MenuItem value="document">Document</MenuItem>
                  <MenuItem value="policy_acknowledgment">Policy Acknowledgment</MenuItem>
                  <MenuItem value="safety_check">Safety Check</MenuItem>
                  <MenuItem value="audit">Audit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="legal">{getCategoryIcon('legal')} Legal</MenuItem>
                  <MenuItem value="safety">{getCategoryIcon('safety')} Safety</MenuItem>
                  <MenuItem value="data_protection">{getCategoryIcon('data_protection')} Data Protection</MenuItem>
                  <MenuItem value="financial">{getCategoryIcon('financial')} Financial</MenuItem>
                  <MenuItem value="operational">{getCategoryIcon('operational')} Operational</MenuItem>
                  <MenuItem value="hr_policies">{getCategoryIcon('hr_policies')} HR Policies</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Detailed description of the compliance requirement..."
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Requirements & Timeline" 
          icon={<AssignmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Requirement Details"
                multiline
                rows={3}
                value={formData.requirements.description}
                onChange={(e) => handleChange('requirements.description', e.target.value)}
                disabled={isReadOnly}
                placeholder="What needs to be done to achieve compliance..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Due Date"
                value={formData.requirements.dueDate}
                onChange={(date) => handleChange('requirements.dueDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requirements.renewalRequired}
                    onChange={(e) => handleChange('requirements.renewalRequired', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Renewal Required"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requirements.documentRequired}
                    onChange={(e) => handleChange('requirements.documentRequired', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Document Required"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requirements.trainingRequired}
                    onChange={(e) => handleChange('requirements.trainingRequired', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Training Required"
              />
            </Grid>
            {formData.requirements.renewalRequired && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Renewal Period (months)"
                  type="number"
                  value={formData.requirements.renewalPeriod || 12}
                  onChange={(e) => handleChange('requirements.renewalPeriod', Number(e.target.value))}
                  disabled={isReadOnly}
                  InputProps={{
                    inputProps: { min: 1, max: 60 }
                  }}
                />
              </Grid>
            )}
          </Grid>
        </FormSection>

        {mode !== 'create' && formData.compliance.length > 0 && (
          <FormSection 
            title="Compliance Status" 
            icon={<PersonIcon />}
          >
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                  <Typography variant="h4" color="success.main">
                    {complianceStats.compliant}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compliant
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                  <Typography variant="h4" color="warning.main">
                    {complianceStats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                  <Typography variant="h4" color="error.main">
                    {complianceStats.nonCompliant}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Non-Compliant
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                  <Typography variant="h4" color="text.secondary">
                    {complianceStats.expired}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expired
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Overall Compliance Rate: {complianceRate.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={complianceRate}
                    sx={{ height: 10, borderRadius: 5 }}
                    color={complianceRate >= 90 ? 'success' : complianceRate >= 70 ? 'warning' : 'error'}
                  />
                </Box>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Employee Compliance Status
              </Typography>
              <List>
                {formData.compliance.slice(0, 10).map((compliance) => {
                  const employee = hrState.employees?.find(emp => emp.id === compliance.employeeId)
                  return employee ? (
                    <ListItem key={compliance.employeeId} divider>
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
                              {employee.department} - {employee.position}
                            </Typography>
                            {compliance.completionDate && (
                              <Typography variant="body2" color="text.secondary">
                                Completed: {compliance.completionDate.toLocaleDateString()}
                              </Typography>
                            )}
                            {compliance.expiryDate && (
                              <Typography variant="body2" color="text.secondary">
                                Expires: {compliance.expiryDate.toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip
                        label={compliance.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        color={getStatusColor(compliance.status) as any}
                        size="small"
                      />
                    </ListItem>
                  ) : null
                })}
                {formData.compliance.length > 10 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${formData.compliance.length - 10} more employees`}
                      sx={{ textAlign: 'center', fontStyle: 'italic' }}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </FormSection>
        )}

        <Paper sx={{ mt: 3, p: 2, bgcolor: 'warning.50' }}>
          <Typography variant="h6" gutterBottom>
            Compliance Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Type:</strong> {formData.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> 
                <Chip 
                  label={formData.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} 
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2">
                <strong>Priority:</strong> 
                <Chip 
                  label={formData.priority.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} 
                  color={getPriorityColor(formData.priority) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Due Date:</strong> {formData.requirements.dueDate.toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Renewal Required:</strong> {formData.requirements.renewalRequired ? 'Yes' : 'No'}
                {formData.requirements.renewalRequired && formData.requirements.renewalPeriod && 
                  ` (every ${formData.requirements.renewalPeriod} months)`
                }
              </Typography>
              <Typography variant="body2">
                <strong>Requirements:</strong> 
                {formData.requirements.documentRequired && <Chip label="Document" size="small" sx={{ ml: 0.5 }} />}
                {formData.requirements.trainingRequired && <Chip label="Training" size="small" sx={{ ml: 0.5 }} />}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </LocalizationProvider>
  )
})

export default ComplianceCRUDForm
