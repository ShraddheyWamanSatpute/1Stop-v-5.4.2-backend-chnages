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
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Button,
  IconButton,
  Divider,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface AttendanceEntry {
  id?: string
  employeeId: string
  date: Date
  clockIn?: Date
  clockOut?: Date
  breakStart?: Date
  breakEnd?: Date
  totalHours: number
  regularHours: number
  overtimeHours: number
  status: 'present' | 'absent' | 'late' | 'half_day' | 'sick' | 'holiday'
  notes?: string
  approvedBy?: string
}

interface AttendanceCRUDFormProps {
  attendanceEntry?: AttendanceEntry | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const AttendanceCRUDForm: React.FC<AttendanceCRUDFormProps> = ({
  attendanceEntry,
  mode,
  onSave
}) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<AttendanceEntry>({
    employeeId: '',
    date: new Date(),
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    status: 'present',
    notes: '',
  })

  // Break periods for employees who take multiple breaks
  const [breakPeriods, setBreakPeriods] = useState<Array<{
    id: string
    start: Date | null
    end: Date | null
  }>>([])

  // Update form data when attendanceEntry prop changes
  useEffect(() => {
    if (attendanceEntry) {
      setFormData({
        ...attendanceEntry,
        date: new Date(attendanceEntry.date),
        clockIn: attendanceEntry.clockIn ? new Date(attendanceEntry.clockIn) : undefined,
        clockOut: attendanceEntry.clockOut ? new Date(attendanceEntry.clockOut) : undefined,
        breakStart: attendanceEntry.breakStart ? new Date(attendanceEntry.breakStart) : undefined,
        breakEnd: attendanceEntry.breakEnd ? new Date(attendanceEntry.breakEnd) : undefined,
      })
    }
  }, [attendanceEntry])

  // Auto-calculate hours when clock times change
  useEffect(() => {
    if (formData.clockIn && formData.clockOut) {
      const totalMinutes = differenceInMinutes(formData.clockOut, formData.clockIn)
      
      // Subtract break time
      let breakMinutes = 0
      if (formData.breakStart && formData.breakEnd) {
        breakMinutes = differenceInMinutes(formData.breakEnd, formData.breakStart)
      }
      
      // Add additional break periods
      breakPeriods.forEach(period => {
        if (period.start && period.end) {
          breakMinutes += differenceInMinutes(period.end, period.start)
        }
      })

      const workedMinutes = Math.max(0, totalMinutes - breakMinutes)
      const totalHours = workedMinutes / 60
      
      // Calculate regular vs overtime (assuming 8 hours is standard)
      const regularHours = Math.min(8, totalHours)
      const overtimeHours = Math.max(0, totalHours - 8)

      setFormData(prev => ({
        ...prev,
        totalHours: Number(totalHours.toFixed(2)),
        regularHours: Number(regularHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
      }))
    }
  }, [formData.clockIn, formData.clockOut, formData.breakStart, formData.breakEnd, breakPeriods])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addBreakPeriod = () => {
    const newBreak = {
      id: Date.now().toString(),
      start: null,
      end: null,
    }
    setBreakPeriods(prev => [...prev, newBreak])
  }

  const updateBreakPeriod = (id: string, field: 'start' | 'end', value: Date | null) => {
    setBreakPeriods(prev => prev.map(period => 
      period.id === id ? { ...period, [field]: value } : period
    ))
  }

  const removeBreakPeriod = (id: string) => {
    setBreakPeriods(prev => prev.filter(period => period.id !== id))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      date: formData.date.getTime(),
      clockIn: formData.clockIn?.getTime(),
      clockOut: formData.clockOut?.getTime(),
      breakStart: formData.breakStart?.getTime(),
      breakEnd: formData.breakEnd?.getTime(),
      additionalBreaks: breakPeriods.map(period => ({
        start: period.start?.getTime(),
        end: period.end?.getTime(),
      })),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  // Get selected employee details
  const selectedEmployee = hrState.employees?.find(emp => emp.id === formData.employeeId)

  // Calculate if employee is late (assuming 9 AM start time)
  const isLate = formData.clockIn && formData.clockIn.getHours() > 9

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Employee & Date" 
          icon={<PersonIcon />}
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
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => handleChange('date', date || new Date())}
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
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="half_day">Half Day</MenuItem>
                  <MenuItem value="sick">Sick Leave</MenuItem>
                  <MenuItem value="holiday">Holiday</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
                    <strong>Department:</strong> {selectedEmployee.department || 'Not assigned'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Employment Type:</strong> {selectedEmployee.employmentType}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Standard Hours:</strong> {selectedEmployee.hoursPerWeek || 40} hours/week
                  </Typography>
                  <Typography variant="body2">
                    <strong>Hourly Rate:</strong> £{selectedEmployee.hourlyRate || 0}/hour
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </FormSection>

        {formData.status === 'present' || formData.status === 'late' || formData.status === 'half_day' ? (
          <FormSection 
            title="Clock Times" 
            icon={<AccessTimeIcon />}
          >
            {isLate && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Employee clocked in late at {formData.clockIn ? format(formData.clockIn, 'HH:mm') : ''}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Clock In"
                  value={formData.clockIn || null}
                  onChange={(time) => handleChange('clockIn', time)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Clock Out"
                  value={formData.clockOut || null}
                  onChange={(time) => handleChange('clockOut', time)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Break Times
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Main Break Start"
                  value={formData.breakStart || null}
                  onChange={(time) => handleChange('breakStart', time)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Main Break End"
                  value={formData.breakEnd || null}
                  onChange={(time) => handleChange('breakEnd', time)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            </Grid>

            {/* Additional Break Periods */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Additional Breaks</Typography>
                {!isReadOnly && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addBreakPeriod}
                  >
                    Add Break
                  </Button>
                )}
              </Box>
              
              {breakPeriods.map((period, index) => (
                <Paper key={period.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TimePicker
                        label={`Break ${index + 2} Start`}
                        value={period.start}
                        onChange={(time) => updateBreakPeriod(period.id, 'start', time)}
                        disabled={isReadOnly}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TimePicker
                        label={`Break ${index + 2} End`}
                        value={period.end}
                        onChange={(time) => updateBreakPeriod(period.id, 'end', time)}
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
                      <Typography variant="body2" color="text.secondary">
                        {period.start && period.end ? 
                          `${differenceInMinutes(period.end, period.start)} min` : 
                          'Incomplete'
                        }
                      </Typography>
                    </Grid>
                    {!isReadOnly && (
                      <Grid item xs={12} sm={2}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeBreakPeriod(period.id)}
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
        ) : null}

        <FormSection 
          title="Hours Summary" 
          icon={<ScheduleIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                <Typography variant="h4" color="primary">
                  {formData.totalHours}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                <Typography variant="h4" color="success.main">
                  {formData.regularHours}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Regular Hours
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                <Typography variant="h4" color="warning.main">
                  {formData.overtimeHours}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overtime Hours
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {formData.clockIn && formData.clockOut && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Time Breakdown
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Work Period"
                    secondary={`${format(formData.clockIn, 'HH:mm')} - ${format(formData.clockOut, 'HH:mm')}`}
                  />
                  <Typography variant="body2">
                    {differenceInHours(formData.clockOut, formData.clockIn, { roundingMethod: 'round' })} hours
                  </Typography>
                </ListItem>
                <Divider />
                {formData.breakStart && formData.breakEnd && (
                  <ListItem>
                    <ListItemText
                      primary="Main Break"
                      secondary={`${format(formData.breakStart, 'HH:mm')} - ${format(formData.breakEnd, 'HH:mm')}`}
                    />
                    <Typography variant="body2">
                      {differenceInMinutes(formData.breakEnd, formData.breakStart)} min
                    </Typography>
                  </ListItem>
                )}
                {breakPeriods.map((period, index) => (
                  period.start && period.end && (
                    <ListItem key={period.id}>
                      <ListItemText
                        primary={`Break ${index + 2}`}
                        secondary={`${format(period.start, 'HH:mm')} - ${format(period.end, 'HH:mm')}`}
                      />
                      <Typography variant="body2">
                        {differenceInMinutes(period.end, period.start)} min
                      </Typography>
                    </ListItem>
                  )
                ))}
              </List>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Notes & Approval" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isReadOnly}
                placeholder="Any additional notes about this attendance entry..."
              />
            </Grid>
            {formData.approvedBy && (
              <Grid item xs={12}>
                <Alert severity="success">
                  This attendance entry has been approved by {formData.approvedBy}
                </Alert>
              </Grid>
            )}
          </Grid>
        </FormSection>

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
              {mode === 'edit' ? 'Update Attendance' : 'Create Attendance Entry'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default AttendanceCRUDForm
