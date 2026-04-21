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
} from '@mui/material'
import FormSection from '../../reusable/FormSection'
import type { Measure } from '../../../../backend/context/StockContext'

interface MeasureFormProps {
  measure?: Measure | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onCancel?: () => void
  onFormDataChange?: (data: any) => void
}

const MeasureForm: React.FC<MeasureFormProps> = ({
  measure,
  mode,
  onSave,
  onFormDataChange,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    description: '',
    type: 'weight',
    baseUnit: 'gram',
    conversionFactor: 1,
    active: true,
    isDefault: false
  })

  useEffect(() => {
    if (measure) {
      setFormData({
        name: measure.name || '',
        abbreviation: measure.abbreviation || '',
        description: measure.description || '',
        type: measure.type || 'weight',
        baseUnit: measure.baseUnit || 'gram',
        conversionFactor: measure.conversionFactor || 1,
        active: measure.active !== false,
        isDefault: measure.isDefault || false
      })
    }
  }, [measure])

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
      <FormSection title="Measure Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Measure Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Abbreviation"
              value={formData.abbreviation}
              onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value }))}
              required
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
        </Grid>
      </FormSection>

      <FormSection title="Measurement Details">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="weight">Weight</MenuItem>
                <MenuItem value="volume">Volume</MenuItem>
                <MenuItem value="length">Length</MenuItem>
                <MenuItem value="area">Area</MenuItem>
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="time">Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Base Unit</InputLabel>
              <Select
                value={formData.baseUnit}
                label="Base Unit"
                onChange={(e) => setFormData(prev => ({ ...prev, baseUnit: e.target.value }))}
                disabled={isReadOnly}
              >
                {/* Weight units */}
                <MenuItem value="gram">Gram (g)</MenuItem>
                <MenuItem value="kilogram">Kilogram (kg)</MenuItem>
                <MenuItem value="pound">Pound (lb)</MenuItem>
                <MenuItem value="ounce">Ounce (oz)</MenuItem>
                
                {/* Volume units */}
                <MenuItem value="milliliter">Milliliter (ml)</MenuItem>
                <MenuItem value="liter">Liter (l)</MenuItem>
                <MenuItem value="gallon">Gallon</MenuItem>
                <MenuItem value="pint">Pint</MenuItem>
                
                {/* Count units */}
                <MenuItem value="piece">Piece</MenuItem>
                <MenuItem value="dozen">Dozen</MenuItem>
                <MenuItem value="case">Case</MenuItem>
                <MenuItem value="box">Box</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Conversion Factor"
              type="number"
              value={formData.conversionFactor}
              onChange={(e) => setFormData(prev => ({ ...prev, conversionFactor: parseFloat(e.target.value) || 1 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0.001, step: 0.001 }}
              helperText="Factor to convert to base unit"
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
              label="Default Measure"
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default MeasureForm
