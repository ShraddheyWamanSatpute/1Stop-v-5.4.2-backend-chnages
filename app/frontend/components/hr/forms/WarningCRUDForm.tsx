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
  Avatar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface WarningRecord {
  id?: string
  employeeId: string
  issuedBy: string
  type: 'verbal' | 'written' | 'final' | 'disciplinary_action'
  category: 'attendance' | 'performance' | 'conduct' | 'safety' | 'policy_violation' | 'other'
  severity: 'minor' | 'moderate' | 'serious' | 'severe'
  title: string
  description: string
  incidentDate: Date
  issuedDate: Date
  witnessIds: string[]
  actionTaken: string
  expectedImprovement: string
  followUpDate?: Date
  followUpNotes?: string
  employeeResponse?: string
  employeeAcknowledged: boolean
  acknowledgedDate?: Date
  status: 'active' | 'resolved' | 'escalated' | 'dismissed'
  escalationLevel: number
  previousWarnings: string[]
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  createdAt: Date
  updatedAt: Date
}

interface WarningCRUDFormProps {
  warningRecord?: WarningRecord | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void | Promise<void>
  employees?: any[]
}

export interface WarningCRUDFormHandle {
  submit: () => void | Promise<void>
}

const WarningCRUDForm = React.forwardRef<WarningCRUDFormHandle, WarningCRUDFormProps>(({
  warningRecord,
  mode,
  onSave,
  employees: employeesProp
}, ref) => {
  const { state: hrState } = useHR()
  
  // Use employees from props if provided, otherwise from hrState
  const employees = employeesProp || hrState.employees || []

  const [formData, setFormData] = useState<WarningRecord>({
    employeeId: '',
    issuedBy: '',
    type: 'verbal',
    category: 'performance',
    severity: 'minor',
    title: '',
    description: '',
    incidentDate: new Date(),
    issuedDate: new Date(),
    witnessIds: [],
    actionTaken: '',
    expectedImprovement: '',
    employeeResponse: '',
    employeeAcknowledged: false,
    status: 'active',
    escalationLevel: 1,
    previousWarnings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when warningRecord prop changes
  useEffect(() => {
    if (warningRecord) {
      setFormData({
        ...warningRecord,
        incidentDate: new Date(warningRecord.incidentDate),
        issuedDate: new Date(warningRecord.issuedDate),
        followUpDate: warningRecord.followUpDate ? new Date(warningRecord.followUpDate) : undefined,
        acknowledgedDate: warningRecord.acknowledgedDate ? new Date(warningRecord.acknowledgedDate) : undefined,
        createdAt: new Date(warningRecord.createdAt),
        updatedAt: new Date(warningRecord.updatedAt),
        witnessIds: warningRecord.witnessIds || [],
        previousWarnings: warningRecord.previousWarnings || [],
      })
    }
  }, [warningRecord])

  const isReadOnly = mode === 'view'

  const submit = useCallback(async () => {
    if (isReadOnly) return

    const now = Date.now()
    const issuedDateMs = formData.issuedDate instanceof Date ? formData.issuedDate.getTime() : now
    const incidentDateMs = formData.incidentDate instanceof Date ? formData.incidentDate.getTime() : now
    const followUpMs =
      formData.followUpDate instanceof Date ? formData.followUpDate.getTime() :
      formData.followUpDate ? new Date(formData.followUpDate as any).getTime() : undefined

    const payload: any = {
      employeeId: formData.employeeId,
      issuedBy: formData.issuedBy,
      issuedDate: issuedDateMs,
      // Map extended form types to backend Warning types
      type: formData.type === 'disciplinary_action' ? 'suspension' : formData.type,
      reason: formData.title || 'Warning',
      description: formData.description || '',
      status: (formData.status === 'dismissed' ? 'resolved' : formData.status),
      // Use follow-up date as expiry date for backend Warning
      expiryDate: followUpMs,
      notes: [
        formData.actionTaken ? `Action taken: ${formData.actionTaken}` : null,
        formData.expectedImprovement ? `Expected improvement: ${formData.expectedImprovement}` : null,
        formData.employeeResponse ? `Employee response: ${formData.employeeResponse}` : null,
        incidentDateMs ? `Incident: ${new Date(incidentDateMs).toISOString()}` : null,
      ].filter(Boolean).join('\n'),
      createdAt: warningRecord?.createdAt ? new Date(warningRecord.createdAt as any).getTime() : now,
      updatedAt: now,
    }

    if (!payload.expiryDate || !Number.isFinite(payload.expiryDate)) delete payload.expiryDate
    if (formData.employeeAcknowledged) {
      payload.acknowledgement = { acknowledged: true, date: now }
    }

    // Strip undefined keys (Firebase rejects undefined)
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

    await onSave(payload)
  }, [formData, isReadOnly, onSave, warningRecord?.createdAt])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  // Get selected employee, issuer, and witness details
  const selectedEmployee = employees?.find(emp => emp.id === formData.employeeId)
  const witnesses = (formData.witnessIds || []).map(id => 
    employees?.find(emp => emp.id === id)
  ).filter(Boolean)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'error'
      case 'serious': return 'warning'
      case 'moderate': return 'info'
      case 'minor': return 'default'
      default: return 'default'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'final': return 'error'
      case 'disciplinary_action': return 'error'
      case 'written': return 'warning'
      case 'verbal': return 'info'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success'
      case 'escalated': return 'error'
      case 'dismissed': return 'default'
      default: return 'warning'
    }
  }

  // Warning escalation steps
  const escalationSteps = [
    'Verbal Warning',
    'Written Warning',
    'Final Warning',
    'Disciplinary Action'
  ]

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Warning Information" 
          icon={<WarningIcon />}
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
                  {employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department || 'No department'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Issued By</InputLabel>
                <Select
                  value={formData.issuedBy}
                  onChange={(e) => handleChange('issuedBy', e.target.value)}
                  label="Issued By"
                >
                  <MenuItem value="">
                    <em>Select issuing manager</em>
                  </MenuItem>
                  {employees?.filter(emp => 
                    emp.position?.toLowerCase().includes('manager') || 
                    emp.position?.toLowerCase().includes('supervisor')
                  ).map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Warning Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Brief title describing the warning"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Warning Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Warning Type"
                >
                  <MenuItem value="verbal">Verbal Warning</MenuItem>
                  <MenuItem value="written">Written Warning</MenuItem>
                  <MenuItem value="final">Final Warning</MenuItem>
                  <MenuItem value="disciplinary_action">Disciplinary Action</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="attendance">Attendance</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                  <MenuItem value="conduct">Conduct</MenuItem>
                  <MenuItem value="safety">Safety</MenuItem>
                  <MenuItem value="policy_violation">Policy Violation</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => handleChange('severity', e.target.value)}
                  label="Severity"
                >
                  <MenuItem value="minor">Minor</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="serious">Serious</MenuItem>
                  <MenuItem value="severe">Severe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="escalated">Escalated</MenuItem>
                  <MenuItem value="dismissed">Dismissed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Incident Date"
                value={formData.incidentDate}
                onChange={(date) => handleChange('incidentDate', date || new Date())}
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
              <DatePicker
                label="Warning Issued Date"
                value={formData.issuedDate}
                onChange={(date) => handleChange('issuedDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
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
                    Employee ID: {selectedEmployee.id} | Hire Date: {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Incident Details" 
          icon={<AssignmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Detailed Description"
                multiline
                rows={6}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Provide a detailed description of the incident, including dates, times, and specific behaviors..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Action Taken"
                multiline
                rows={3}
                value={formData.actionTaken}
                onChange={(e) => handleChange('actionTaken', e.target.value)}
                disabled={isReadOnly}
                placeholder="Describe the immediate action taken..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expected Improvement"
                multiline
                rows={3}
                value={formData.expectedImprovement}
                onChange={(e) => handleChange('expectedImprovement', e.target.value)}
                disabled={isReadOnly}
                placeholder="Clearly outline what improvements are expected..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Follow-up Date"
                value={formData.followUpDate || null}
                onChange={(date) => handleChange('followUpDate', date)}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>
            {formData.followUpDate && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Follow-up Notes"
                  multiline
                  rows={2}
                  value={formData.followUpNotes || ''}
                  onChange={(e) => handleChange('followUpNotes', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Notes from follow-up meeting..."
                />
              </Grid>
            )}
          </Grid>
        </FormSection>

        <FormSection 
          title="Witnesses & Documentation" 
          icon={<PersonIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Witnesses</InputLabel>
                <Select
                  multiple
                  value={formData.witnessIds}
                  onChange={(e) => handleChange('witnessIds', typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Witnesses"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((witnessId) => {
                        const witness = employees?.find(emp => emp.id === witnessId)
                        return witness ? (
                          <Chip 
                            key={witnessId} 
                            label={`${witness.firstName} ${witness.lastName}`} 
                            size="small" 
                          />
                        ) : null
                      })}
                    </Box>
                  )}
                >
                  {employees?.filter(emp => emp.id !== formData.employeeId).map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {witnesses.length > 0 && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Witnesses Present
              </Typography>
              <List>
                {witnesses.map((witness) => (
                  witness && (
                    <ListItem key={witness.id} dense>
                      <ListItemAvatar>
                        <Avatar src={witness.photo} sx={{ width: 32, height: 32 }}>
                          {witness.firstName?.charAt(0)}{witness.lastName?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${witness.firstName} ${witness.lastName}`}
                        secondary={`${witness.position} - ${witness.department}`}
                      />
                    </ListItem>
                  )
                ))}
              </List>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Employee Response & Acknowledgment" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee Response"
                multiline
                rows={4}
                value={formData.employeeResponse || ''}
                onChange={(e) => handleChange('employeeResponse', e.target.value)}
                disabled={isReadOnly}
                placeholder="Employee's response to the warning..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Acknowledgment Status</InputLabel>
                <Select
                  value={formData.employeeAcknowledged ? 'acknowledged' : 'pending'}
                  onChange={(e) => {
                    const acknowledged = e.target.value === 'acknowledged'
                    handleChange('employeeAcknowledged', acknowledged)
                    if (acknowledged) {
                      handleChange('acknowledgedDate', new Date())
                    }
                  }}
                  label="Acknowledgment Status"
                >
                  <MenuItem value="pending">Pending Acknowledgment</MenuItem>
                  <MenuItem value="acknowledged">Acknowledged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.employeeAcknowledged && formData.acknowledgedDate && (
              <Grid item xs={12} sm={6}>
                <Alert severity="success">
                  Acknowledged on {formData.acknowledgedDate.toLocaleDateString()}
                </Alert>
              </Grid>
            )}
          </Grid>
        </FormSection>

        <FormSection 
          title="Escalation History" 
          icon={<TimelineIcon />}
        >
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Warning Escalation Level: {formData.escalationLevel}
            </Typography>
            <Stepper activeStep={formData.escalationLevel - 1} orientation="vertical">
              {escalationSteps.map((step, index) => (
                <Step key={step}>
                  <StepLabel>
                    <Typography 
                      variant="body2" 
                      color={index < formData.escalationLevel ? 'primary' : 'text.secondary'}
                    >
                      {step}
                    </Typography>
                  </StepLabel>
                  {index < formData.escalationLevel && (
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {index === formData.escalationLevel - 1 ? 'Current warning level' : 'Previously completed'}
                      </Typography>
                    </StepContent>
                  )}
                </Step>
              ))}
            </Stepper>
          </Paper>

          {formData.previousWarnings && formData.previousWarnings.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This employee has {formData.previousWarnings.length} previous warning(s) on record.
            </Alert>
          )}
        </FormSection>

        <Paper sx={{ mt: 3, p: 2, bgcolor: 'warning.50' }}>
          <Typography variant="h6" gutterBottom>
            Warning Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Type:</strong> 
                <Chip 
                  label={formData.type.replace('_', ' ').toUpperCase()} 
                  color={getTypeColor(formData.type) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {formData.category.replace('_', ' ').toUpperCase()}
              </Typography>
              <Typography variant="body2">
                <strong>Severity:</strong> 
                <Chip 
                  label={formData.severity.toUpperCase()} 
                  color={getSeverityColor(formData.severity) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Status:</strong> 
                <Chip 
                  label={formData.status.replace('_', ' ').toUpperCase()} 
                  color={getStatusColor(formData.status) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2">
                <strong>Escalation Level:</strong> {formData.escalationLevel}/4
              </Typography>
              <Typography variant="body2">
                <strong>Acknowledged:</strong> {formData.employeeAcknowledged ? 'Yes' : 'No'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </LocalizationProvider>
  )
})

export default WarningCRUDForm
