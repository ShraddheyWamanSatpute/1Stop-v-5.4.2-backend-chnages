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
  Autocomplete,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Campaign as CampaignIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface Announcement {
  id?: string
  title: string
  content: string
  type: 'general' | 'urgent' | 'policy' | 'event' | 'celebration' | 'safety' | 'training'
  priority: 'low' | 'medium' | 'high' | 'critical'
  targetAudience: 'all' | 'department' | 'role' | 'specific_employees'
  targetDepartments: string[]
  targetRoles: string[]
  targetEmployees: string[]
  publishDate: Date
  expiryDate?: Date
  isActive: boolean
  isPinned: boolean
  requiresAcknowledgment: boolean
  acknowledgedBy: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
}

interface AnnouncementCRUDFormProps {
  announcement?: Announcement | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface AnnouncementCRUDFormHandle {
  submit: () => void
}

const AnnouncementCRUDForm = React.forwardRef<AnnouncementCRUDFormHandle, AnnouncementCRUDFormProps>(({
  announcement,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<Announcement>({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium',
    targetAudience: 'all',
    targetDepartments: [],
    targetRoles: [],
    targetEmployees: [],
    publishDate: new Date(),
    isActive: true,
    isPinned: false,
    requiresAcknowledgment: false,
    acknowledgedBy: [],
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when announcement prop changes
  useEffect(() => {
    if (announcement) {
      setFormData({
        ...announcement,
        publishDate: new Date(announcement.publishDate),
        expiryDate: announcement.expiryDate ? new Date(announcement.expiryDate) : undefined,
        createdAt: new Date(announcement.createdAt),
        updatedAt: new Date(announcement.updatedAt),
      })
    }
  }, [announcement])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      publishDate: formData.publishDate.getTime(),
      expiryDate: formData.expiryDate?.getTime(),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Get target audience details
  const getTargetAudienceCount = () => {
    if (formData.targetAudience === 'all') {
      return hrState.employees?.length || 0
    } else if (formData.targetAudience === 'department') {
      return hrState.employees?.filter(emp => 
        formData.targetDepartments.includes(emp.department || '')
      ).length || 0
    } else if (formData.targetAudience === 'role') {
      return hrState.employees?.filter(emp => 
        formData.targetRoles.includes(emp.roleId || '')
      ).length || 0
    } else if (formData.targetAudience === 'specific_employees') {
      return formData.targetEmployees.length
    }
    return 0
  }

  const getAcknowledgmentRate = () => {
    const targetCount = getTargetAudienceCount()
    const acknowledgedCount = formData.acknowledgedBy.length
    return targetCount > 0 ? (acknowledgedCount / targetCount) * 100 : 0
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'error'
      case 'policy': return 'warning'
      case 'event': return 'info'
      case 'celebration': return 'success'
      case 'safety': return 'error'
      case 'training': return 'primary'
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Announcement Details" 
          icon={<CampaignIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Enter announcement title"
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
                  <MenuItem value="general">📢 General</MenuItem>
                  <MenuItem value="urgent">🚨 Urgent</MenuItem>
                  <MenuItem value="policy">📋 Policy</MenuItem>
                  <MenuItem value="event">🎉 Event</MenuItem>
                  <MenuItem value="celebration">🎊 Celebration</MenuItem>
                  <MenuItem value="safety">⚠️ Safety</MenuItem>
                  <MenuItem value="training">📚 Training</MenuItem>
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={formData.targetAudience}
                  onChange={(e) => {
                    handleChange('targetAudience', e.target.value)
                    // Reset target arrays when audience type changes
                    handleChange('targetDepartments', [])
                    handleChange('targetRoles', [])
                    handleChange('targetEmployees', [])
                  }}
                  label="Target Audience"
                >
                  <MenuItem value="all">All Employees</MenuItem>
                  <MenuItem value="department">Specific Departments</MenuItem>
                  <MenuItem value="role">Specific Roles</MenuItem>
                  <MenuItem value="specific_employees">Specific Employees</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content"
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Enter the announcement content..."
              />
            </Grid>
          </Grid>
        </FormSection>

        {/* Target Audience Selection */}
        {formData.targetAudience === 'department' && (
          <FormSection 
            title="Target Departments" 
            icon={<GroupIcon />}
          >
            <Autocomplete
              multiple
              options={hrState.departments?.map(dept => dept.name) || []}
              value={formData.targetDepartments}
              onChange={(_, newValue) => handleChange('targetDepartments', newValue)}
              disabled={isReadOnly}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Departments"
                  placeholder="Choose departments to target"
                />
              )}
            />
          </FormSection>
        )}

        {formData.targetAudience === 'role' && (
          <FormSection 
            title="Target Roles" 
            icon={<GroupIcon />}
          >
            <Autocomplete
              multiple
              options={hrState.roles?.map(role => role.id) || []}
              value={formData.targetRoles}
              onChange={(_, newValue) => handleChange('targetRoles', newValue)}
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
                  label="Select Roles"
                  placeholder="Choose roles to target"
                />
              )}
            />
          </FormSection>
        )}

        {formData.targetAudience === 'specific_employees' && (
          <FormSection 
            title="Target Employees" 
            icon={<GroupIcon />}
          >
            <Autocomplete
              multiple
              options={hrState.employees?.map(emp => emp.id) || []}
              value={formData.targetEmployees}
              onChange={(_, newValue) => handleChange('targetEmployees', newValue)}
              disabled={isReadOnly}
              getOptionLabel={(option) => {
                const emp = hrState.employees?.find(e => e.id === option)
                return emp ? `${emp.firstName} ${emp.lastName} - ${emp.department}` : option
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const emp = hrState.employees?.find(e => e.id === option)
                  return (
                    <Chip 
                      variant="outlined" 
                      label={emp ? `${emp.firstName} ${emp.lastName} - ${emp.department}` : option} 
                      {...getTagProps({ index })} 
                      key={option} 
                    />
                  )
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Employees"
                  placeholder="Choose specific employees"
                />
              )}
            />
          </FormSection>
        )}

        <FormSection 
          title="Publishing Settings" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Publish Date"
                value={formData.publishDate}
                onChange={(date) => handleChange('publishDate', date || new Date())}
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
                label="Expiry Date (Optional)"
                value={formData.expiryDate || null}
                onChange={(date) => handleChange('expiryDate', date)}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
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
                label="Active"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPinned}
                    onChange={(e) => handleChange('isPinned', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Pin to Top"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresAcknowledgment}
                    onChange={(e) => handleChange('requiresAcknowledgment', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Requires Acknowledgment"
              />
            </Grid>
          </Grid>

          <Paper sx={{ mt: 3, p: 2, bgcolor: 'info.50' }}>
            <Typography variant="h6" gutterBottom>
              Audience Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Target Audience:</strong> {formData.targetAudience.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Typography>
                <Typography variant="body2">
                  <strong>Estimated Recipients:</strong> {getTargetAudienceCount()} employees
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={formData.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} 
                    color={getTypeColor(formData.type) as any}
                    size="small"
                  />
                  <Chip 
                    label={`${formData.priority.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Priority`} 
                    color={getPriorityColor(formData.priority) as any}
                    size="small"
                  />
                  {formData.isPinned && <Chip label="Pinned" color="secondary" size="small" />}
                  {formData.requiresAcknowledgment && <Chip label="Requires acknowledgement" color="warning" size="small" />}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </FormSection>

        {mode !== 'create' && formData.requiresAcknowledgment && (
          <FormSection 
            title="Acknowledgment Tracking" 
            icon={<VisibilityIcon />}
          >
            <Alert severity="info" sx={{ mb: 2 }}>
              Acknowledgment Rate: {getAcknowledgmentRate().toFixed(1)}% 
              ({formData.acknowledgedBy.length} of {getTargetAudienceCount()} employees)
            </Alert>

            {formData.acknowledgedBy.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Acknowledged By
                </Typography>
                <List>
                  {formData.acknowledgedBy.slice(0, 10).map((employeeId) => {
                    const employee = hrState.employees?.find(emp => emp.id === employeeId)
                    return employee ? (
                      <ListItem key={employeeId} dense>
                        <ListItemAvatar>
                          <Avatar src={employee.photo} sx={{ width: 32, height: 32 }}>
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${employee.firstName} ${employee.lastName}`}
                          secondary={employee.department}
                        />
                      </ListItem>
                    ) : null
                  })}
                  {formData.acknowledgedBy.length > 10 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${formData.acknowledgedBy.length - 10} more`}
                        sx={{ textAlign: 'center', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
          </FormSection>
        )}

      </Box>
    </LocalizationProvider>
  )
})

export default AnnouncementCRUDForm
