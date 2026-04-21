"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Autocomplete,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, parseISO } from 'date-fns'
import FormSection from '../../reusable/FormSection'
import { useBookings, Booking } from '../../../../backend/context/BookingsContext'

interface BookingCRUDFormProps {
  booking?: Booking | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BookingCRUDForm: React.FC<BookingCRUDFormProps> = ({
  booking,
  mode,
  onSave
}) => {
  const { 
    bookingTypes: contextBookingTypes,
    bookingStatuses: contextBookingStatuses,
    tables: contextTables,
  } = useBookings()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    bookingType: '',
    guests: 1,
    arrivalTime: '18:00',
    duration: 2,
    status: 'Pending',
    tracking: 'Not Arrived',
    specialRequests: '',
    dietaryRequirements: '',
    deposit: 0,
    depositPaid: false,
    tableNumber: '',
    tableId: '',
    selectedTables: [] as string[], // Array of table IDs for multi-select
    tags: [] as string[], // Array of tags for multi-select
  })

  // Update form data when booking prop changes
  useEffect(() => {
    if (booking) {
      // Handle existing single table selection or new multi-table selection
      const selectedTables = booking.selectedTables || 
        (booking.tableId ? [booking.tableId] : 
        (booking.tableNumber ? [booking.tableNumber] : []))
      
      setFormData({
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        email: booking.email || '',
        phone: booking.phone || '',
        company: booking.company || '',
        source: booking.source || '',
        notes: booking.notes || '',
        date: booking.date || format(new Date(), 'yyyy-MM-dd'),
        bookingType: booking.bookingType || '',
        guests: booking.guests || 1,
        arrivalTime: booking.arrivalTime || '18:00',
        duration: booking.duration || 2,
        status: booking.status || 'Pending',
        tracking: booking.tracking || 'Not Arrived',
        specialRequests: booking.specialRequests || '',
        dietaryRequirements: booking.dietaryRequirements || '',
        deposit: booking.deposit || 0,
        depositPaid: booking.depositPaid || false,
        tableNumber: booking.tableNumber || '',
        tableId: booking.tableId || '',
        selectedTables: selectedTables,
        tags: booking.tags || [],
      })
    }
  }, [booking])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const bookingData = {
      ...formData,
      id: booking?.id,
      createdAt: booking?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Calculate end time based on arrival time and duration
      endTime: formData.arrivalTime && formData.duration ? 
        (() => {
          const [hours, minutes] = formData.arrivalTime.split(':').map(Number)
          const endDate = new Date()
          endDate.setHours(hours + Math.floor(formData.duration), minutes + ((formData.duration % 1) * 60))
          return endDate.toTimeString().slice(0, 5)
        })() : undefined,
      // Ensure numeric fields are properly typed
      guests: Number(formData.guests),
      duration: Number(formData.duration),
      deposit: Number(formData.deposit),
      // Include selected tables array
      selectedTables: formData.selectedTables,
      // Include tags array
      tags: formData.tags,
    }
    onSave(bookingData)
  }

  // Expose handleSubmit to parent component
  React.useEffect(() => {
    // Store the submit function in a way the parent can access it
    if (mode !== 'view') {
      (window as any).bookingFormSubmit = handleSubmit
    }
    return () => {
      delete (window as any).bookingFormSubmit
    }
  }, [formData, booking, mode])

  const isReadOnly = mode === 'view'

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
        <FormSection title="Guest Information" defaultExpanded>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                fullWidth
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                fullWidth
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                fullWidth
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                fullWidth
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                fullWidth
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Source"
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                fullWidth
                disabled={isReadOnly}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Booking Details" defaultExpanded>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date"
                value={parseISO(formData.date)}
                onChange={(date) => handleChange('date', date ? format(date, 'yyyy-MM-dd') : '')}
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
              <TimePicker
                label="Arrival Time"
                value={parseISO(`2000-01-01T${formData.arrivalTime}:00`)}
                onChange={(time) => handleChange('arrivalTime', time ? format(time, 'HH:mm') : '')}
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
                label="Number of Guests"
                type="number"
                value={formData.guests}
                onChange={(e) => handleChange('guests', parseInt(e.target.value) || 1)}
                fullWidth
                required
                inputProps={{ min: 1, max: 20 }}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Duration (hours)"
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseFloat(e.target.value) || 1)}
                fullWidth
                inputProps={{ min: 0.5, max: 8, step: 0.5 }}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Booking Type</InputLabel>
                <Select
                  value={formData.bookingType}
                  onChange={(e) => handleChange('bookingType', e.target.value)}
                  label="Booking Type"
                  disabled={isReadOnly}
                >
                  {contextBookingTypes.map((type) => (
                    <MenuItem key={type.id} value={type.name}>
                      {type.name}
                    </MenuItem>
                  ))}
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
                  {contextBookingStatuses.map((status) => (
                    <MenuItem key={status.id} value={status.name}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={contextTables}
                getOptionLabel={(table) => table.name || ''}
                value={contextTables.filter(table => 
                  formData.selectedTables.includes(table.id || '') ||
                  formData.selectedTables.includes(table.name || '')
                )}
                onChange={(_, selectedTables) => {
                  const tableIds = selectedTables.map(table => table.id || table.name || '')
                  handleChange('selectedTables', tableIds)
                  // Update legacy fields for backward compatibility
                  handleChange('tableId', tableIds[0] || '')
                  handleChange('tableNumber', selectedTables[0]?.name || '')
                }}
                disabled={isReadOnly}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tables"
                    placeholder="Select tables..."
                    fullWidth
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })
                    return (
                      <Box
                        key={option.id || option.name || index}
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: themeConfig.brandColors.navy,
                          color: themeConfig.brandColors.offWhite,
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          mr: 0.5,
                          mb: 0.5,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                        {...tagProps}
                      >
                        {option.name}
                        {!isReadOnly && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.7 },
                            }}
                            onClick={() => {
                              const newTables = formData.selectedTables.filter(
                                id => id !== (option.id || option.name)
                              )
                              handleChange('selectedTables', newTables)
                              handleChange('tableId', newTables[0] || '')
                              const firstTable = contextTables.find(t => 
                                t.id === newTables[0] || t.name === newTables[0]
                              )
                              handleChange('tableNumber', firstTable?.name || '')
                            }}
                          >
                            ×
                          </Box>
                        )}
                      </Box>
                    )
                  })
                }
                ChipProps={{
                  size: 'small',
                  color: 'primary',
                  variant: 'filled',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tracking Status</InputLabel>
                <Select
                  value={formData.tracking}
                  onChange={(e) => handleChange('tracking', e.target.value)}
                  label="Tracking Status"
                  disabled={isReadOnly}
                >
                  {['Not Arrived', 'Arrived', 'Seated', 'Appetizers', 'Starters', 'Mains', 'Desserts', 'Bill', 'Paid', 'Left', 'No Show'].map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormSection>

        <FormSection title="Additional Information">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Special Requests"
                value={formData.specialRequests}
                onChange={(e) => handleChange('specialRequests', e.target.value)}
                fullWidth
                multiline
                rows={2}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dietary Requirements"
                value={formData.dietaryRequirements}
                onChange={(e) => handleChange('dietaryRequirements', e.target.value)}
                fullWidth
                multiline
                rows={2}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                fullWidth
                multiline
                rows={3}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={['VIP', 'Birthday', 'Anniversary', 'Business', 'Special Diet', 'Large Party', 'Repeat Customer', 'Celebration']}
                value={formData.tags}
                onChange={(_, newTags) => handleChange('tags', newTags)}
                disabled={isReadOnly}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Select tags..."
                    fullWidth
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })
                    return (
                      <Box
                        key={option || index}
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: themeConfig.brandColors.navy,
                          color: themeConfig.brandColors.offWhite,
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          mr: 0.5,
                          mb: 0.5,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                        {...tagProps}
                      >
                        {option}
                        {!isReadOnly && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.7 },
                            }}
                            onClick={() => {
                              const newTags = formData.tags.filter(tag => tag !== option)
                              handleChange('tags', newTags)
                            }}
                          >
                            ×
                          </Box>
                        )}
                      </Box>
                    )
                  })
                }
                ChipProps={{
                  size: 'small',
                  color: 'primary',
                  variant: 'filled',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Deposit Amount"
                type="number"
                value={formData.deposit}
                onChange={(e) => handleChange('deposit', parseFloat(e.target.value) || 0)}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.depositPaid}
                    onChange={(e) => handleChange('depositPaid', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Deposit Paid"
              />
            </Grid>
          </Grid>
        </FormSection>

        {mode !== 'view' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Click Save in the modal header to save changes
            </Typography>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default BookingCRUDForm
