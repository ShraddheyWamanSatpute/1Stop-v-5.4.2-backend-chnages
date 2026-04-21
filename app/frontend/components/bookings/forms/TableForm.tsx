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
import { useBookings, Table } from '../../../../backend/context/BookingsContext'

interface TableFormProps {
  table?: Table | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const TableForm: React.FC<TableFormProps> = ({
  table,
  mode,
  onSave
}) => {
  const { } = useBookings()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shape: 'rectangle',
    minPartySize: 1,
    maxPartySize: 8,
    isVip: false,
    isAccessible: false,
    allowsSmoking: false,
    hasView: false
  })


  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name || '',
        description: table.description || '',
        shape: table.shape || 'rectangle',
        minPartySize: table.minPartySize || 1,
        maxPartySize: table.maxPartySize || 8,
        isVip: table.isVip || false,
        isAccessible: table.isAccessible || false,
        allowsSmoking: table.allowsSmoking || false,
        hasView: table.hasView || false
      })
    }
  }, [table])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Table Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Shape</InputLabel>
            <Select
              value={formData.shape}
              label="Shape"
              onChange={(e) => setFormData(prev => ({ ...prev, shape: e.target.value }))}
              disabled={isReadOnly}
            >
              <MenuItem value="rectangle">Rectangle</MenuItem>
              <MenuItem value="circle">Circle</MenuItem>
              <MenuItem value="square">Square</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Min Party Size"
            type="number"
            value={formData.minPartySize}
            onChange={(e) => setFormData(prev => ({ ...prev, minPartySize: parseInt(e.target.value) || 1 }))}
            disabled={isReadOnly}
            fullWidth
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Max Party Size"
            type="number"
            value={formData.maxPartySize}
            onChange={(e) => setFormData(prev => ({ ...prev, maxPartySize: parseInt(e.target.value) || 8 }))}
            disabled={isReadOnly}
            fullWidth
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isVip}
                onChange={(e) => setFormData(prev => ({ ...prev, isVip: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="VIP Table"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isAccessible}
                onChange={(e) => setFormData(prev => ({ ...prev, isAccessible: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Wheelchair Accessible"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowsSmoking}
                onChange={(e) => setFormData(prev => ({ ...prev, allowsSmoking: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Allows Smoking"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.hasView}
                onChange={(e) => setFormData(prev => ({ ...prev, hasView: e.target.checked }))}
                disabled={isReadOnly}
              />
            }
            label="Has View"
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default TableForm
