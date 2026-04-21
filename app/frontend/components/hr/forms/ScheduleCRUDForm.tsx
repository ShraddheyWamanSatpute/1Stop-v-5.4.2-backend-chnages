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
  Avatar,
  Card,
  CardContent,
  Button,
  IconButton,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, differenceInHours, addDays } from 'date-fns'
import {
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface Shift {
  id: string
  employeeId: string
  date: Date
  startTime: Date
  endTime: Date
  breakDuration: number // in minutes
  breakStartTime?: Date
  position?: string
  location?: string
  notes?: string
}

interface Schedule {
  id?: string
  title: string
  weekStarting: Date
  weekEnding: Date
  department?: string
  status: 'draft' | 'published' | 'locked'
  shifts: Shift[]
  totalHours: number
  totalStaffCost: number
  notes?: string
  createdBy: string
  publishedDate?: Date
  createdAt: Date
  updatedAt: Date
}

interface ScheduleCRUDFormProps {
  schedule?: Schedule | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const ScheduleCRUDForm: React.FC<ScheduleCRUDFormProps> = ({
  schedule,
  mode,
  onSave
}) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<Schedule>({
    title: '',
    weekStarting: new Date(),
    weekEnding: addDays(new Date(), 6),
    status: 'draft',
    shifts: [],
    totalHours: 0,
    totalStaffCost: 0,
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when schedule prop changes
  useEffect(() => {
    if (schedule) {
      setFormData({
        ...schedule,
        weekStarting: new Date(schedule.weekStarting),
        weekEnding: new Date(schedule.weekEnding),
        publishedDate: schedule.publishedDate ? new Date(schedule.publishedDate) : undefined,
        shifts: schedule.shifts.map(shift => ({
          ...shift,
          date: new Date(shift.date),
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          breakStartTime: (shift as any).breakStartTime ? new Date((shift as any).breakStartTime) : undefined,
        })),
        createdAt: new Date(schedule.createdAt),
        updatedAt: new Date(schedule.updatedAt),
      })
    }
  }, [schedule])

  // Auto-calculate total hours and cost when shifts change
  useEffect(() => {
    const totalHours = formData.shifts.reduce((total, shift) => {
      const hours = differenceInHours(shift.endTime, shift.startTime)
      const breakHours = shift.breakDuration / 60
      return total + Math.max(0, hours - breakHours)
    }, 0)

    const totalStaffCost = formData.shifts.reduce((total, shift) => {
      const employee = hrState.employees?.find(emp => emp.id === shift.employeeId)
      const hours = differenceInHours(shift.endTime, shift.startTime)
      const breakHours = shift.breakDuration / 60
      const workedHours = Math.max(0, hours - breakHours)
      const hourlyRate = employee?.hourlyRate || 0
      return total + (workedHours * hourlyRate)
    }, 0)

    setFormData(prev => ({
      ...prev,
      totalHours: Number(totalHours.toFixed(2)),
      totalStaffCost: Number(totalStaffCost.toFixed(2))
    }))
  }, [formData.shifts, hrState.employees])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  const addShift = () => {
    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId: '',
      date: formData.weekStarting,
      startTime: new Date(),
      endTime: new Date(),
      breakDuration: 30,
    }
    setFormData(prev => ({
      ...prev,
      shifts: [...prev.shifts, newShift]
    }))
  }

  const updateShift = (shiftId: string, updates: Partial<Shift>) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.map(shift => 
        shift.id === shiftId ? { ...shift, ...updates } : shift
      )
    }))
  }

  const removeShift = (shiftId: string) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.filter(shift => shift.id !== shiftId)
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      weekStarting: formData.weekStarting.getTime(),
      weekEnding: formData.weekEnding.getTime(),
      publishedDate: formData.publishedDate?.getTime(),
      shifts: formData.shifts.map(shift => ({
        ...shift,
        date: shift.date.getTime(),
        startTime: shift.startTime.getTime(),
        endTime: shift.endTime.getTime(),
        breakStartTime: shift.breakStartTime ? shift.breakStartTime.getTime() : undefined,
      })),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success'
      case 'locked': return 'error'
      default: return 'default'
    }
  }

  // Group shifts by day
  const shiftsByDay = formData.shifts.reduce((acc, shift) => {
    const dayKey = format(shift.date, 'yyyy-MM-dd')
    if (!acc[dayKey]) {
      acc[dayKey] = []
    }
    acc[dayKey].push(shift)
    return acc
  }, {} as Record<string, Shift[]>)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Schedule Information" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Schedule Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Kitchen Staff - Week 1"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department || ''}
                  onChange={(e) => handleChange('department', e.target.value)}
                  label="Department"
                >
                  <MenuItem value="">
                    <em>All Departments</em>
                  </MenuItem>
                  {hrState.departments?.map((department) => (
                    <MenuItem key={department.id} value={department.name}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Week Starting"
                value={formData.weekStarting}
                onChange={(date) => {
                  if (date) {
                    handleChange('weekStarting', date)
                    handleChange('weekEnding', addDays(date, 6))
                  }
                }}
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
                label="Week Ending"
                value={formData.weekEnding}
                onChange={(date) => handleChange('weekEnding', date || new Date())}
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
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="locked">Locked</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Schedule Overview" 
          icon={<AccessTimeIcon />}
        >
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {formData.shifts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Shifts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {formData.totalHours}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    £{formData.totalStaffCost.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Cost
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Shifts</Typography>
            {!isReadOnly && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addShift}
              >
                Add Shift
              </Button>
            )}
          </Box>

          {formData.shifts.map((shift) => {
            const employee = hrState.employees?.find(emp => emp.id === shift.employeeId)
            const shiftHours = differenceInHours(shift.endTime, shift.startTime) - (shift.breakDuration / 60)
            
            return (
              <Paper key={shift.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small" disabled={isReadOnly}>
                      <InputLabel>Employee</InputLabel>
                      <Select
                        value={shift.employeeId}
                        onChange={(e) => updateShift(shift.id, { employeeId: e.target.value })}
                        label="Employee"
                      >
                        <MenuItem value="">
                          <em>Select employee</em>
                        </MenuItem>
                        {hrState.employees?.map((employee) => (
                          <MenuItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <DatePicker
                      label="Date"
                      value={shift.date}
                      onChange={(date) => updateShift(shift.id, { date: date || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <TimePicker
                      label="Start"
                      value={shift.startTime}
                      onChange={(time) => updateShift(shift.id, { startTime: time || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <TimePicker
                      label="End"
                      value={shift.endTime}
                      onChange={(time) => updateShift(shift.id, { endTime: time || new Date() })}
                      disabled={isReadOnly}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <TimePicker
                      label="Break Start"
                      value={shift.breakStartTime || null}
                      onChange={(time) => updateShift(shift.id, { breakStartTime: time || undefined })}
                      disabled={isReadOnly}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Break (min)"
                      type="number"
                      value={shift.breakDuration}
                      onChange={(e) => updateShift(shift.id, { breakDuration: Number(e.target.value) })}
                      disabled={isReadOnly}
                      InputProps={{
                        inputProps: { min: 0, step: 15 }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Position"
                      value={shift.position || ''}
                      onChange={(e) => updateShift(shift.id, { position: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      {shiftHours.toFixed(1)}h
                    </Typography>
                    {employee && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        £{((employee.hourlyRate || 0) * shiftHours).toFixed(2)}
                      </Typography>
                    )}
                  </Grid>
                  {!isReadOnly && (
                    <Grid item xs={12} sm={0.5}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeShift(shift.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  )}
                </Grid>
                
                {employee && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={employee.photo} sx={{ width: 24, height: 24 }}>
                      {employee.firstName?.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {employee.firstName} {employee.lastName} - {employee.department}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )
          })}

          {formData.shifts.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No shifts scheduled. {!isReadOnly && 'Click "Add Shift" to start building the schedule.'}
            </Typography>
          )}
        </FormSection>

        {mode !== 'create' && Object.keys(shiftsByDay).length > 0 && (
          <FormSection 
            title="Daily Breakdown" 
          >
            {Object.entries(shiftsByDay).map(([dayKey, dayShifts]) => (
              <Paper key={dayKey} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {format(new Date(dayKey), 'EEEE, MMMM d')}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Shifts: {dayShifts.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours: {dayShifts.reduce((total, shift) => {
                        const hours = differenceInHours(shift.endTime, shift.startTime) - (shift.breakDuration / 60)
                        return total + Math.max(0, hours)
                      }, 0).toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Staff: {new Set(dayShifts.map(s => s.employeeId)).size} employees
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Cost: £{dayShifts.reduce((total, shift) => {
                        const employee = hrState.employees?.find(emp => emp.id === shift.employeeId)
                        const hours = differenceInHours(shift.endTime, shift.startTime) - (shift.breakDuration / 60)
                        return total + (Math.max(0, hours) * (employee?.hourlyRate || 0))
                      }, 0).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </FormSection>
        )}

        <Paper sx={{ mt: 3, p: 2, bgcolor: 'info.50' }}>
          <Typography variant="h6" gutterBottom>
            Schedule Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Week:</strong> {format(formData.weekStarting, 'MMM d')} - {format(formData.weekEnding, 'MMM d, yyyy')}
              </Typography>
              <Typography variant="body2">
                <strong>Department:</strong> {formData.department || 'All Departments'}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> 
                <Chip 
                  label={formData.status.toUpperCase()} 
                  color={getStatusColor(formData.status) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Total Shifts:</strong> {formData.shifts.length}
              </Typography>
              <Typography variant="body2">
                <strong>Total Hours:</strong> {formData.totalHours} hours
              </Typography>
              <Typography variant="body2">
                <strong>Estimated Cost:</strong> £{formData.totalStaffCost.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
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
              {mode === 'edit' ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default ScheduleCRUDForm
