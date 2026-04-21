"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Typography,
  Chip,
} from '@mui/material'
import { BookingStatus } from '../../../../backend/context/BookingsContext'

interface BookingStatusFormProps {
  status?: BookingStatus | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BookingStatusForm: React.FC<BookingStatusFormProps> = ({
  status,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4CAF50',
    isDefault: false,
    allowsEditing: true,
    allowsSeating: true,
    countsAsAttended: false
  })

  useEffect(() => {
    if (status) {
      setFormData({
        name: status.name || '',
        description: status.description || '',
        color: status.color || '#4CAF50',
        isDefault: status.isDefault || false,
        allowsEditing: status.allowsEditing !== false,
        allowsSeating: status.allowsSeating !== false,
        countsAsAttended: status.countsAsAttended || false
      })
    }
  }, [status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Status Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            disabled={isReadOnly}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            disabled={isReadOnly}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Preview:
            </Typography>
            <Chip 
              label={formData.name || 'Status Name'} 
              sx={{ 
                backgroundColor: formData.color,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            disabled={isReadOnly}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Default Status"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowsEditing}
                onChange={(e) => setFormData(prev => ({ ...prev, allowsEditing: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Allows Editing"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowsSeating}
                onChange={(e) => setFormData(prev => ({ ...prev, allowsSeating: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Allows Seating"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.countsAsAttended}
                onChange={(e) => setFormData(prev => ({ ...prev, countsAsAttended: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Counts as Attended"
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default BookingStatusForm
