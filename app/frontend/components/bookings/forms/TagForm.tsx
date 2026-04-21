"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material'

interface TagFormProps {
  tag?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const TagForm: React.FC<TagFormProps> = ({
  tag,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4caf50',
    isDefault: false
  })

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name || '',
        description: tag.description || '',
        color: tag.color || '#4caf50',
        isDefault: tag.isDefault || false
      })
    }
  }, [tag])

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
            label="Tag Name"
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
              label={formData.name || 'Tag Name'} 
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
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Priority Tag"
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default TagForm
