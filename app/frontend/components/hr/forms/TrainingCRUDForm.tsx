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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Switch,
  FormControlLabel,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Button,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface TrainingProgram {
  id?: string
  title: string
  description: string
  type: 'mandatory' | 'optional' | 'certification' | 'onboarding' | 'skill_development'
  category: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'leadership' | 'other'
  provider: string
  duration: number // in hours
  format: 'in_person' | 'online' | 'hybrid' | 'self_paced'
  maxParticipants?: number
  cost?: number
  certificationRequired: boolean
  prerequisites: string[]
  learningObjectives: string[]
  materials: Array<{
    id: string
    name: string
    type: 'document' | 'video' | 'link' | 'quiz'
    url?: string
    required: boolean
  }>
  schedule: {
    startDate: Date
    endDate: Date
    sessions: Array<{
      id: string
      date: Date
      startTime: Date
      endTime: Date
      location?: string
      instructor?: string
    }>
  }
  enrolledEmployees: string[]
  completedEmployees: string[]
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

interface TrainingCRUDFormProps {
  trainingProgram?: TrainingProgram | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface TrainingCRUDFormHandle {
  submit: () => void
}

const TrainingCRUDForm = React.forwardRef<TrainingCRUDFormHandle, TrainingCRUDFormProps>(({
  trainingProgram,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<TrainingProgram>({
    title: '',
    description: '',
    type: 'optional',
    category: 'technical',
    provider: '',
    duration: 1,
    format: 'in_person',
    cost: 0,
    certificationRequired: false,
    prerequisites: [],
    learningObjectives: [],
    materials: [],
    schedule: {
      startDate: new Date(),
      endDate: new Date(),
      sessions: []
    },
    enrolledEmployees: [],
    completedEmployees: [],
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const [newObjective, setNewObjective] = useState('')
  const [newPrerequisite, setNewPrerequisite] = useState('')

  // Update form data when trainingProgram prop changes
  useEffect(() => {
    if (trainingProgram) {
      setFormData({
        ...trainingProgram,
        schedule: {
          ...trainingProgram.schedule,
          startDate: new Date(trainingProgram.schedule.startDate),
          endDate: new Date(trainingProgram.schedule.endDate),
          sessions: trainingProgram.schedule.sessions.map(session => ({
            ...session,
            date: new Date(session.date),
            startTime: new Date(session.startTime),
            endTime: new Date(session.endTime),
          }))
        },
        createdAt: new Date(trainingProgram.createdAt),
        updatedAt: new Date(trainingProgram.updatedAt),
      })
    }
  }, [trainingProgram])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('schedule.')) {
      const scheduleField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [scheduleField]: value
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

  const addLearningObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        learningObjectives: [...prev.learningObjectives, newObjective.trim()]
      }))
      setNewObjective('')
    }
  }

  const removeLearningObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((_, i) => i !== index)
    }))
  }

  const addPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, newPrerequisite.trim()]
      }))
      setNewPrerequisite('')
    }
  }

  const removePrerequisite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((_, i) => i !== index)
    }))
  }

  const addSession = () => {
    const newSession = {
      id: Date.now().toString(),
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      location: '',
      instructor: ''
    }
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        sessions: [...prev.schedule.sessions, newSession]
      }
    }))
  }

  const updateSession = (sessionId: string, updates: Partial<typeof formData.schedule.sessions[0]>) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        sessions: prev.schedule.sessions.map(session => 
          session.id === sessionId ? { ...session, ...updates } : session
        )
      }
    }))
  }

  const removeSession = (sessionId: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        sessions: prev.schedule.sessions.filter(session => session.id !== sessionId)
      }
    }))
  }


  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      schedule: {
        ...formData.schedule,
        startDate: formData.schedule.startDate.getTime(),
        endDate: formData.schedule.endDate.getTime(),
        sessions: formData.schedule.sessions.map(session => ({
          ...session,
          date: session.date.getTime(),
          startTime: session.startTime.getTime(),
          endTime: session.endTime.getTime(),
        }))
      },
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Calculate completion rate
  const completionRate = formData.enrolledEmployees.length > 0 
    ? (formData.completedEmployees.length / formData.enrolledEmployees.length) * 100 
    : 0


  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Training Program Information" 
          icon={<SchoolIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Training Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Food Safety Certification"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider/Instructor"
                value={formData.provider}
                onChange={(e) => handleChange('provider', e.target.value)}
                disabled={isReadOnly}
                placeholder="Training provider or instructor name"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Training Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Training Type"
                >
                  <MenuItem value="mandatory">Mandatory</MenuItem>
                  <MenuItem value="optional">Optional</MenuItem>
                  <MenuItem value="certification">Certification</MenuItem>
                  <MenuItem value="onboarding">Onboarding</MenuItem>
                  <MenuItem value="skill_development">Skill Development</MenuItem>
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
                  <MenuItem value="safety">Safety</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                  <MenuItem value="soft_skills">Soft Skills</MenuItem>
                  <MenuItem value="compliance">Compliance</MenuItem>
                  <MenuItem value="leadership">Leadership</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={formData.format}
                  onChange={(e) => handleChange('format', e.target.value)}
                  label="Format"
                >
                  <MenuItem value="in_person">In Person</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="hybrid">Hybrid</MenuItem>
                  <MenuItem value="self_paced">Self Paced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Duration (hours)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 0.5, step: 0.5 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Participants"
                type="number"
                value={formData.maxParticipants || ''}
                onChange={(e) => handleChange('maxParticipants', e.target.value ? Number(e.target.value) : undefined)}
                disabled={isReadOnly}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Cost per Person"
                type="number"
                value={formData.cost || ''}
                onChange={(e) => handleChange('cost', e.target.value ? Number(e.target.value) : 0)}
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
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Detailed description of the training program..."
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
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.certificationRequired}
                    onChange={(e) => handleChange('certificationRequired', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Certification Required"
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Schedule & Sessions" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Program Start Date"
                value={formData.schedule.startDate}
                onChange={(date) => handleChange('schedule.startDate', date || new Date())}
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
                label="Program End Date"
                value={formData.schedule.endDate}
                onChange={(date) => handleChange('schedule.endDate', date || new Date())}
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

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Training Sessions</Typography>
              {!isReadOnly && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addSession}
                >
                  Add Session
                </Button>
              )}
            </Box>
            
            {formData.schedule.sessions.map((session, index) => (
              <Paper key={session.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <DatePicker
                      label={`Session ${index + 1} Date`}
                      value={session.date}
                      onChange={(date) => updateSession(session.id, { date: date || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TimePicker
                      label="Start Time"
                      value={session.startTime}
                      onChange={(time) => updateSession(session.id, { startTime: time || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TimePicker
                      label="End Time"
                      value={session.endTime}
                      onChange={(time) => updateSession(session.id, { endTime: time || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Location"
                      value={session.location || ''}
                      onChange={(e) => updateSession(session.id, { location: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Instructor"
                      value={session.instructor || ''}
                      onChange={(e) => updateSession(session.id, { instructor: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </Grid>
                  {!isReadOnly && (
                    <Grid item xs={12} sm={0.5}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeSession(session.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            ))}
          </Box>
        </FormSection>

        <FormSection 
          title="Learning Objectives & Prerequisites" 
          icon={<AssignmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>Learning Objectives</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add learning objective"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  disabled={isReadOnly}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addLearningObjective()
                    }
                  }}
                />
                {!isReadOnly && (
                  <IconButton onClick={addLearningObjective} color="primary">
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List dense>
                {formData.learningObjectives.map((objective, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      !isReadOnly && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removeLearningObjective(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText primary={objective} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>Prerequisites</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add prerequisite"
                  value={newPrerequisite}
                  onChange={(e) => setNewPrerequisite(e.target.value)}
                  disabled={isReadOnly}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addPrerequisite()
                    }
                  }}
                />
                {!isReadOnly && (
                  <IconButton onClick={addPrerequisite} color="primary">
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List dense>
                {formData.prerequisites.map((prerequisite, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      !isReadOnly && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removePrerequisite(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText primary={prerequisite} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </FormSection>

        {mode !== 'create' && (
          <FormSection 
            title="Enrollment & Progress" 
            icon={<PersonIcon />}
          >
            <Grid container spacing={3}>
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
                    <Typography variant="h4" color="success.main">
                      {formData.completedEmployees.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {completionRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completion Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Progress Overview
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Grid>
            </Grid>

            {formData.enrolledEmployees.length > 0 && (
              <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Enrolled Employees
                </Typography>
                <List>
                  {formData.enrolledEmployees.slice(0, 5).map((employeeId) => {
                    const employee = hrState.employees?.find(emp => emp.id === employeeId)
                    const isCompleted = formData.completedEmployees.includes(employeeId)
                    return employee ? (
                      <ListItem key={employeeId} divider>
                        <ListItemAvatar>
                          <Avatar src={employee.photo}>
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${employee.firstName} ${employee.lastName}`}
                          secondary={employee.department}
                        />
                        <Chip
                          label={isCompleted ? 'Completed' : 'In Progress'}
                          color={isCompleted ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItem>
                    ) : null
                  })}
                  {formData.enrolledEmployees.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${formData.enrolledEmployees.length - 5} more`}
                        sx={{ textAlign: 'center', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
          </FormSection>
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
              {mode === 'edit' ? 'Update Training Program' : 'Create Training Program'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
})

export default TrainingCRUDForm
