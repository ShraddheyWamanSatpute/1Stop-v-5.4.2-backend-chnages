"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material'
import FormSection from '../../reusable/FormSection'

interface CourseFormProps {
  course?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onFormDataChange?: (data: any) => void
}

const CourseForm: React.FC<CourseFormProps> = ({
  course,
  mode,
  onSave,
  onFormDataChange
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    color: '#1976d2',
    duration: 60,
    price: 0,
    active: true,
    isDefault: false
  })

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        description: course.description || '',
        displayOrder: course.displayOrder || 0,
        color: course.color || '#1976d2',
        duration: course.duration || 60,
        price: course.price || 0,
        active: course.active !== false,
        isDefault: course.isDefault || false
      })
    }
  }, [course])

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
      <FormSection title="Course Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Course Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
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
          <Grid item xs={12}>
            <Typography gutterBottom>Display Order: {formData.displayOrder}</Typography>
            <Slider
              value={formData.displayOrder}
              onChange={(_, value) => setFormData(prev => ({ ...prev, displayOrder: value as number }))}
              disabled={isReadOnly}
              min={0}
              max={100}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Course Details">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
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
              label="Default Course"
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default CourseForm
