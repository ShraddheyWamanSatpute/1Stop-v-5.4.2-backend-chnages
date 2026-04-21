"use client"

import React, { useState, useEffect } from 'react'
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
  Card,
  CardContent,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Event as EventIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface CompanyEvent {
  id?: string
  title: string
  description: string
  type: 'meeting' | 'training' | 'social' | 'celebration' | 'conference' | 'team_building' | 'other'
  category: 'mandatory' | 'optional' | 'invitation_only'
  startDate: Date
  endDate: Date
  startTime: Date
  endTime: Date
  location: string
  isVirtual: boolean
  virtualLink?: string
  maxAttendees?: number
  cost?: number
  budget?: number
  organizer: string
  targetAudience: 'all' | 'department' | 'role' | 'specific_employees'
  targetDepartments: string[]
  targetRoles: string[]
  targetEmployees: string[]
  attendees: Array<{
    employeeId: string
    status: 'invited' | 'accepted' | 'declined' | 'attended' | 'no_show'
    responseDate?: Date
    notes?: string
  }>
  agenda?: string
  materials?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  catering?: {
    required: boolean
    type?: string
    dietary?: string[]
    cost?: number
  }
  status: 'planning' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  feedback?: Array<{
    employeeId: string
    rating: number
    comments: string
    submittedDate: Date
  }>
  createdAt: Date
  updatedAt: Date
}

interface EventCRUDFormProps {
  companyEvent?: CompanyEvent | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const EventCRUDForm: React.FC<EventCRUDFormProps> = ({
  companyEvent,
  mode,
  onSave
}) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<CompanyEvent>({
    title: '',
    description: '',
    type: 'meeting',
    category: 'optional',
    startDate: new Date(),
    endDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    location: '',
    isVirtual: false,
    organizer: '',
    targetAudience: 'all',
    targetDepartments: [],
    targetRoles: [],
    targetEmployees: [],
    attendees: [],
    status: 'planning',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when companyEvent prop changes
  useEffect(() => {
    if (companyEvent) {
      setFormData({
        ...companyEvent,
        startDate: new Date(companyEvent.startDate),
        endDate: new Date(companyEvent.endDate),
        startTime: new Date(companyEvent.startTime),
        endTime: new Date(companyEvent.endTime),
        attendees: companyEvent.attendees.map(attendee => ({
          ...attendee,
          responseDate: attendee.responseDate ? new Date(attendee.responseDate) : undefined
        })),
        feedback: companyEvent.feedback?.map(fb => ({
          ...fb,
          submittedDate: new Date(fb.submittedDate)
        })),
        createdAt: new Date(companyEvent.createdAt),
        updatedAt: new Date(companyEvent.updatedAt),
      })
    }
  }, [companyEvent])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('catering.')) {
      const cateringField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        catering: {
          required: false,
          ...prev.catering,
          [cateringField]: value
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

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      startDate: formData.startDate.getTime(),
      endDate: formData.endDate.getTime(),
      startTime: formData.startTime.getTime(),
      endTime: formData.endTime.getTime(),
      attendees: formData.attendees.map(attendee => ({
        ...attendee,
        responseDate: attendee.responseDate?.getTime()
      })),
      feedback: formData.feedback?.map(fb => ({
        ...fb,
        submittedDate: fb.submittedDate.getTime()
      })),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  // Get organizer details
  const organizer = hrState.employees?.find(emp => emp.id === formData.organizer)

  // Calculate attendance statistics
  const totalInvited = formData.attendees.length
  const acceptedCount = formData.attendees.filter(a => a.status === 'accepted').length
  const declinedCount = formData.attendees.filter(a => a.status === 'declined').length
  const attendedCount = formData.attendees.filter(a => a.status === 'attended').length

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '📅'
      case 'training': return '📚'
      case 'social': return '🎉'
      case 'celebration': return '🎊'
      case 'conference': return '🎤'
      case 'team_building': return '🤝'
      default: return '📋'
    }
  }


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Event Information" 
          icon={<EventIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Event Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Monthly Team Meeting, Holiday Party"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Organizer</InputLabel>
                <Select
                  value={formData.organizer}
                  onChange={(e) => handleChange('organizer', e.target.value)}
                  label="Organizer"
                >
                  <MenuItem value="">
                    <em>Select organizer</em>
                  </MenuItem>
                  {hrState.employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Event Type"
                >
                  <MenuItem value="meeting">{getTypeIcon('meeting')} Meeting</MenuItem>
                  <MenuItem value="training">{getTypeIcon('training')} Training</MenuItem>
                  <MenuItem value="social">{getTypeIcon('social')} Social Event</MenuItem>
                  <MenuItem value="celebration">{getTypeIcon('celebration')} Celebration</MenuItem>
                  <MenuItem value="conference">{getTypeIcon('conference')} Conference</MenuItem>
                  <MenuItem value="team_building">{getTypeIcon('team_building')} Team Building</MenuItem>
                  <MenuItem value="other">{getTypeIcon('other')} Other</MenuItem>
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
                  <MenuItem value="mandatory">Mandatory</MenuItem>
                  <MenuItem value="optional">Optional</MenuItem>
                  <MenuItem value="invitation_only">Invitation Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="planning">Planning</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
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
                placeholder="Detailed description of the event..."
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Date, Time & Location" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
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
            <Grid item xs={12} sm={3}>
              <TimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(time) => handleChange('startTime', time || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="End Date"
                value={formData.endDate}
                onChange={(date) => handleChange('endDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(time) => handleChange('endTime', time || new Date())}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isVirtual}
                    onChange={(e) => handleChange('isVirtual', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Virtual Event"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Attendees"
                type="number"
                value={formData.maxAttendees || ''}
                onChange={(e) => handleChange('maxAttendees', e.target.value ? Number(e.target.value) : undefined)}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={formData.isVirtual ? "Virtual Meeting Link" : "Location"}
                value={formData.isVirtual ? (formData.virtualLink || '') : formData.location}
                onChange={(e) => handleChange(formData.isVirtual ? 'virtualLink' : 'location', e.target.value)}
                disabled={isReadOnly}
                placeholder={formData.isVirtual ? "Enter meeting link (Zoom, Teams, etc.)" : "Enter physical location"}
              />
            </Grid>
          </Grid>
        </FormSection>

        {mode !== 'create' && formData.attendees.length > 0 && (
          <FormSection 
            title="Attendance Overview" 
            icon={<GroupIcon />}
          >
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {totalInvited}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Invited
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {acceptedCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Accepted
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {declinedCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Declined
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {attendedCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attended
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Attendee List
              </Typography>
              <List>
                {formData.attendees.slice(0, 10).map((attendee) => {
                  const employee = hrState.employees?.find(emp => emp.id === attendee.employeeId)
                  return employee ? (
                    <ListItem key={attendee.employeeId} divider>
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
                            {attendee.responseDate && (
                              <Typography variant="body2" color="text.secondary">
                                Responded: {attendee.responseDate.toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip
                        label={attendee.status.replace('_', ' ').toUpperCase()}
                        color={
                          attendee.status === 'attended' ? 'success' :
                          attendee.status === 'accepted' ? 'primary' :
                          attendee.status === 'declined' ? 'error' :
                          attendee.status === 'no_show' ? 'warning' : 'default'
                        }
                        size="small"
                      />
                    </ListItem>
                  ) : null
                })}
                {formData.attendees.length > 10 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${formData.attendees.length - 10} more attendees`}
                      sx={{ textAlign: 'center', fontStyle: 'italic' }}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </FormSection>
        )}

        <FormSection 
          title="Additional Details" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Budget"
                type="number"
                value={formData.budget || ''}
                onChange={(e) => handleChange('budget', e.target.value ? Number(e.target.value) : undefined)}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Actual Cost"
                type="number"
                value={formData.cost || ''}
                onChange={(e) => handleChange('cost', e.target.value ? Number(e.target.value) : undefined)}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Agenda"
                multiline
                rows={4}
                value={formData.agenda || ''}
                onChange={(e) => handleChange('agenda', e.target.value)}
                disabled={isReadOnly}
                placeholder="Event agenda or schedule..."
              />
            </Grid>
          </Grid>
        </FormSection>

        {organizer && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Event Organizer
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={organizer.photo}
                sx={{ width: 48, height: 48 }}
              >
                {organizer.firstName?.charAt(0)}{organizer.lastName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1">
                  <strong>{organizer.firstName} {organizer.lastName}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {organizer.position} - {organizer.department}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {organizer.email} | {organizer.phone}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

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
              {mode === 'edit' ? 'Update Event' : 'Create Event'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default EventCRUDForm
