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
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material'
import FormSection from '../../reusable/FormSection'
import { useBookings } from '../../../../backend/context/BookingsContext'

interface WaitlistFormProps {
  waitlistEntry?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({
  waitlistEntry,
  mode,
  onSave
}) => {
  const { tables, bookingTypes } = useBookings()

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    preferredTable: '',
    bookingType: '',
    estimatedWait: 30,
    priority: 'normal',
    notes: '',
    status: 'waiting',
    arrivalTime: new Date().toISOString().slice(0, 16),
    notificationSent: false,
    specialRequests: ''
  })

  useEffect(() => {
    if (waitlistEntry) {
      setFormData({
        customerName: waitlistEntry.customerName || '',
        customerPhone: waitlistEntry.customerPhone || '',
        customerEmail: waitlistEntry.customerEmail || '',
        partySize: waitlistEntry.partySize || 2,
        preferredTable: waitlistEntry.preferredTable || '',
        bookingType: waitlistEntry.bookingType || '',
        estimatedWait: waitlistEntry.estimatedWait || 30,
        priority: waitlistEntry.priority || 'normal',
        notes: waitlistEntry.notes || '',
        status: waitlistEntry.status || 'waiting',
        arrivalTime: waitlistEntry.arrivalTime ? new Date(waitlistEntry.arrivalTime).toISOString().slice(0, 16) : '',
        notificationSent: waitlistEntry.notificationSent || false,
        specialRequests: waitlistEntry.specialRequests || ''
      })
    }
  }, [waitlistEntry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Customer Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Party Size"
              type="number"
              value={formData.partySize}
              onChange={(e) => setFormData(prev => ({ ...prev, partySize: parseInt(e.target.value) || 2 }))}
              required
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 1, max: 20 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Booking Preferences">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={tables?.find(t => t.id === formData.preferredTable) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, preferredTable: value?.id || '' }))}
              options={tables || []}
              getOptionLabel={(option) => `${option.name} (${option.capacity} seats)`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Preferred Table"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={bookingTypes?.find(bt => bt.id === formData.bookingType) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, bookingType: value?.id || '' }))}
              options={bookingTypes || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Booking Type"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Arrival Time"
              type="datetime-local"
              value={formData.arrivalTime}
              onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Estimated Wait (minutes)"
              type="number"
              value={formData.estimatedWait}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedWait: parseInt(e.target.value) || 30 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Priority & Status">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="waiting">Waiting</MenuItem>
                <MenuItem value="contacted">Contacted</MenuItem>
                <MenuItem value="seated">Seated</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="no-show">No Show</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.notificationSent}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationSent: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Notification Sent"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Additional Information">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Special Requests"
              value={formData.specialRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Internal Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default WaitlistForm
