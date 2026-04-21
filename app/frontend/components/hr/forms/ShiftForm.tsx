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
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { parseISO, format } from 'date-fns'
import { useHRContext } from '../../../../backend/context/HRContext'
import type { Schedule } from '../../../../backend/interfaces/HRs'

interface ShiftFormProps {
  shift?: Schedule | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  employees?: any[]
}

export interface ShiftFormHandle {
  submit: () => void
}

const ShiftForm = React.forwardRef<ShiftFormHandle, ShiftFormProps>(({
  shift,
  mode,
  onSave,
  employees: employeesProp
}, ref) => {
  const { state: hrState } = useHRContext()
  
  // Use employees from props if provided, otherwise from hrState
  const employees = employeesProp || hrState.employees || []
  
  // Local state for time inputs (allows partial input)
  const [breakStartTimeInput, setBreakStartTimeInput] = useState<string>("")
  const [startTimeInput, setStartTimeInput] = useState<string>("")
  const [endTimeInput, setEndTimeInput] = useState<string>("")

  const [formData, setFormData] = useState<{
    employeeId: string
    employeeName: string
    date: Date
    startTime: Date
    endTime: Date
    breakDuration: number
    breakStartTime: Date | null
    department: string
    role: string
    notes: string
    status: 'draft' | 'scheduled' | 'completed' | 'cancelled'
    shiftType: 'regular' | 'holiday' | 'off' | 'training'
    payType: 'hourly' | 'salary'
    payRate: number
  }>({
    employeeId: '',
    employeeName: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    breakDuration: 0,
    breakStartTime: null,
    department: '',
    role: '',
    notes: '',
    status: 'draft',
    shiftType: 'regular',
    payType: 'hourly',
    payRate: 0,
  })

  // Update form data when shift prop changes
  useEffect(() => {
    if (shift) {
      // Handle date - can be string (yyyy-MM-dd) or Date object
      let dateValue: Date
      if (typeof shift.date === 'string') {
        dateValue = parseISO(shift.date)
      } else if (shift.date && typeof shift.date === 'object' && 'getTime' in shift.date) {
        dateValue = shift.date as Date
      } else {
        dateValue = new Date()
      }

      setFormData({
        employeeId: shift.employeeId || '',
        employeeName: shift.employeeName || '',
        date: dateValue,
        startTime: shift.startTime ? parseISO(`2000-01-01T${shift.startTime}`) : new Date(),
        endTime: shift.endTime ? parseISO(`2000-01-01T${shift.endTime}`) : new Date(),
        breakDuration: shift.breakDuration || 0,
        breakStartTime: shift.breakStartTime ? parseISO(`2000-01-01T${shift.breakStartTime}`) : null,
        department: shift.department || '',
        role: shift.role || '',
        notes: shift.notes || '',
        status: (shift.status as "draft" | "scheduled" | "completed" | "cancelled") || 'draft',
        shiftType: (shift.shiftType as "regular") || 'regular',
        payType: (shift.payType as "hourly") || 'hourly',
        payRate: shift.payRate || 0,
      })
      setBreakStartTimeInput(shift.breakStartTime ? format(parseISO(`2000-01-01T${shift.breakStartTime}`), "HH:mm") : "")
      setStartTimeInput(shift.startTime ? format(parseISO(`2000-01-01T${shift.startTime}`), "HH:mm") : format(new Date(), "HH:mm"))
      setEndTimeInput(shift.endTime ? format(parseISO(`2000-01-01T${shift.endTime}`), "HH:mm") : format(new Date(), "HH:mm"))
    } else {
      // Reset form when shift is null (creating new)
      setFormData({
        employeeId: '',
        employeeName: '',
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        breakDuration: 0,
        breakStartTime: null,
        department: '',
        role: '',
        notes: '',
        status: 'draft',
        shiftType: 'regular',
        payType: 'hourly',
        payRate: 0,
      })
      setBreakStartTimeInput("")
    }
  }, [shift])

  // Auto-fill employee data when employee is selected
  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees?.find(emp => emp.id === employeeId)
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department || '',
        role: employee.roleId ? (hrState.roles?.find(r => r.id === employee.roleId)?.label || hrState.roles?.find(r => r.id === employee.roleId)?.name || '') : '',
        payRate: employee.hourlyRate || 0,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: '',
        department: '',
        role: '',
        payRate: 0,
      }))
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const isReadOnly = mode === 'view'

  const hoursOptions = Array.from({ length: 24 }, (_, h) => h)
  const baseMinutesOptions = Array.from({ length: 12 }, (_, i) => i * 5) // 0..55 step 5

  const setTimeParts = (base: Date, nextHour?: number, nextMinute?: number) => {
    const d = new Date(base)
    if (typeof nextHour === 'number') d.setHours(nextHour)
    if (typeof nextMinute === 'number') d.setMinutes(nextMinute)
    d.setSeconds(0, 0)
    return d
  }

  const minutesOptionsFor = (value: Date) => {
    const m = value.getMinutes()
    return baseMinutesOptions.includes(m) ? baseMinutesOptions : [...baseMinutesOptions, m].sort((a, b) => a - b)
  }

  const format2 = (n: number) => String(n).padStart(2, '0')

  // Helper function to format time input on blur
  const formatTimeInput = (value: string): string | null => {
    const normalizedValue = value.trim().replace(/\./g, ':') // Replace . with :
    if (normalizedValue === "") {
      return null
    }
    // If user typed just hours (like "17" or "2"), auto-fill minutes as "00"
    if (/^\d{1,2}$/.test(normalizedValue)) {
      const hours = parseInt(normalizedValue, 10)
      if (hours >= 0 && hours <= 23) {
        return `${String(hours).padStart(2, '0')}:00`
      }
    } else if (/^\d{1,2}:\d{1,2}$/.test(normalizedValue)) {
      // If user typed full time format (like "17:30" or "2:5")
      const match = normalizedValue.match(/^(\d{1,2}):(\d{1,2})$/)
      if (match) {
        const hours = parseInt(match[1], 10)
        const minutes = parseInt(match[2], 10)
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        }
      }
    }
    return null
  }

  const submit = useCallback(() => {
    if (isReadOnly) return
    const shiftData = {
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      date: typeof formData.date === 'string' ? formData.date : format(formData.date, 'yyyy-MM-dd'),
      startTime: typeof formData.startTime === 'string' ? formData.startTime : format(formData.startTime, 'HH:mm'),
      endTime: typeof formData.endTime === 'string' ? formData.endTime : format(formData.endTime, 'HH:mm'),
      breakDuration: formData.breakDuration || 0,
      breakStartTime: formData.breakStartTime ? (typeof formData.breakStartTime === 'string' ? formData.breakStartTime : format(formData.breakStartTime, 'HH:mm')) : undefined,
      department: formData.department,
      role: formData.role,
      notes: formData.notes,
      status: formData.status,
      shiftType: formData.shiftType,
      payType: formData.payType,
      payRate: formData.payRate,
    }
    onSave(shiftData)
  }, [formData, isReadOnly, onSave])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  // Back-compat for older CRUDModal flows
  useEffect(() => {
    if (mode !== 'view') {
      ;(window as any).shiftFormSubmit = submit
    }
    return () => {
      delete (window as any).shiftFormSubmit
    }
  }, [mode, submit])

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <form onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}>
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Employee</InputLabel>
              <Select
                value={formData.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                label="Employee"
                disabled={isReadOnly}
              >
                <MenuItem value="">
                  <em>Select an employee</em>
                </MenuItem>
                {employees?.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.department || 'No Department'}
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
            <TextField
              fullWidth
              label="Start Time"
              type="text"
              value={startTimeInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\./g, ':') // Replace . with :
                setStartTimeInput(value)
              }}
              onBlur={(e) => {
                const formattedTime = formatTimeInput(e.target.value)
                if (formattedTime) {
                  const timeDate = parseISO(`2000-01-01T${formattedTime}`)
                  handleChange('startTime', timeDate)
                  setStartTimeInput(formattedTime)
                } else if (e.target.value.trim() === "") {
                  const now = new Date()
                  handleChange('startTime', now)
                  setStartTimeInput(format(now, "HH:mm"))
                }
              }}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
              placeholder="HH:mm (e.g., 17:00 or just 17)"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Time"
              type="text"
              value={endTimeInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\./g, ':') // Replace . with :
                setEndTimeInput(value)
              }}
              onBlur={(e) => {
                const formattedTime = formatTimeInput(e.target.value)
                if (formattedTime) {
                  const timeDate = parseISO(`2000-01-01T${formattedTime}`)
                  handleChange('endTime', timeDate)
                  setEndTimeInput(formattedTime)
                } else if (e.target.value.trim() === "") {
                  const now = new Date()
                  handleChange('endTime', now)
                  setEndTimeInput(format(now, "HH:mm"))
                }
              }}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
              placeholder="HH:mm (e.g., 17:00 or just 17)"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              disabled
              helperText="Auto-filled from employee information"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Role"
              value={formData.role}
              disabled
              helperText="Auto-filled from employee information"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Break Start Time"
              type="text"
              value={breakStartTimeInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\./g, ':') // Replace . with :
                setBreakStartTimeInput(value)
              }}
              onBlur={(e) => {
                const formattedTime = formatTimeInput(e.target.value)
                if (formattedTime) {
                  const timeDate = parseISO(`2000-01-01T${formattedTime}`)
                  handleChange('breakStartTime', timeDate)
                  setBreakStartTimeInput(formattedTime)
                } else {
                  handleChange('breakStartTime', null)
                  setBreakStartTimeInput("")
                }
              }}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
              placeholder="HH:mm (e.g., 17:00 or just 17)"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Break Duration (min)"
              type="number"
              value={formData.breakDuration}
              onChange={(e) => handleChange('breakDuration', Number(e.target.value) || 0)}
              disabled={isReadOnly}
              InputProps={{
                inputProps: { min: 0, step: 15 }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Shift Type</InputLabel>
              <Select
                value={formData.shiftType}
                onChange={(e) => handleChange('shiftType', e.target.value)}
                label="Shift Type"
                disabled={isReadOnly}
              >
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="off">Off</MenuItem>
                <MenuItem value="training">Training</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                label="Status"
                disabled={isReadOnly}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={3}
              disabled={isReadOnly}
              placeholder="Add any notes about this shift..."
            />
          </Grid>
          </Grid>
        </Box>
      </form>
    </LocalizationProvider>
    )
})

export default ShiftForm
