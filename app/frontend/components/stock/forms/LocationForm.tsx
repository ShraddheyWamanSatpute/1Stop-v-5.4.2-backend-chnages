"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material'
import FormSection from '../../reusable/FormSection'

interface LocationFormProps {
  location?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onFormDataChange?: (data: any) => void
}

const LocationForm: React.FC<LocationFormProps> = ({
  location,
  mode,
  onSave,
  onFormDataChange
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    capacity: 0,
    type: 'warehouse',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    active: true,
    isDefault: false
  })

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        address: location.address || '',
        capacity: location.capacity || 0,
        type: location.type || 'warehouse',
        contactPerson: location.contactPerson || '',
        contactPhone: location.contactPhone || '',
        contactEmail: location.contactEmail || '',
        active: location.active !== false,
        isDefault: location.isDefault || false
      })
    }
  }, [location])

  // Notify parent of form data changes (for modal save buttons)
  useEffect(() => {
    onFormDataChange?.(formData)
  }, [formData, onFormDataChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Location Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Location Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              placeholder="e.g., warehouse, store, kitchen"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={3}
            />
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
            <TextField
              label="Capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0 }}
              helperText="Storage capacity (cubic meters)"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Contact Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Contact Phone"
              value={formData.contactPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Contact Email"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Settings">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Active"
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
              label="Default Location"
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default LocationForm
