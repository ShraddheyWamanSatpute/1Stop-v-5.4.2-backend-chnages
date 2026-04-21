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
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface CalendarEvent {
  id?: string
  title: string
  description: string
  type: 'meeting' | 'training' | 'holiday' | 'deadline' | 'review' | 'event' | 'other'
  startDate: Date
  endDate: Date
  startTime?: Date
  endTime?: Date
  isAllDay: boolean
  location?: string
  attendees: string[]
  organizer: string
  priority: 'low' | 'medium' | 'high'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  recurring: {
    enabled: boolean
    pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval?: number
    endDate?: Date
  }
  reminders: Array<{
    type: 'email' | 'notification'
    timing: number // minutes before event
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface CalendarCRUDFormProps {
  calendarEvent?: CalendarEvent | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const CalendarCRUDForm: React.FC<CalendarCRUDFormProps> = ({
  calendarEvent,
  mode,
  onSave
}) => {
  useHR()

  const [formData, setFormData] = useState<CalendarEvent>({
    title: '',
    description: '',
    type: 'meeting',
    startDate: new Date(),
    endDate: new Date(),
    isAllDay: false,
    attendees: [],
    organizer: '',
    priority: 'medium',
    status: 'scheduled',
    recurring: {
      enabled: false,
    },
    reminders: [
      { type: 'email', timing: 15 }
    ],
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  useEffect(() => {
    if (calendarEvent) {
      setFormData({
        ...calendarEvent,
        startDate: new Date(calendarEvent.startDate),
        endDate: new Date(calendarEvent.endDate),
        startTime: calendarEvent.startTime ? new Date(calendarEvent.startTime) : undefined,
        endTime: calendarEvent.endTime ? new Date(calendarEvent.endTime) : undefined,
        recurring: {
          ...calendarEvent.recurring,
          endDate: calendarEvent.recurring.endDate ? new Date(calendarEvent.recurring.endDate) : undefined,
        },
        createdAt: new Date(calendarEvent.createdAt),
        updatedAt: new Date(calendarEvent.updatedAt),
      })
    }
  }, [calendarEvent])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('recurring.')) {
      const recurringField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        recurring: {
          ...prev.recurring,
          [recurringField]: value
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
      startTime: formData.startTime?.getTime(),
      endTime: formData.endTime?.getTime(),
      recurring: {
        ...formData.recurring,
        endDate: formData.recurring.endDate?.getTime(),
      },
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection title="Event Details" icon={<CalendarTodayIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Event Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Event Type"
                >
                  <MenuItem value="meeting">Meeting</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
                  <MenuItem value="holiday">Holiday</MenuItem>
                  <MenuItem value="deadline">Deadline</MenuItem>
                  <MenuItem value="review">Review</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
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
              />
            </Grid>
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
              {mode === 'edit' ? 'Update Event' : 'Create Event'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default CalendarCRUDForm
