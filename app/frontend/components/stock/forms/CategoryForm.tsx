"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { useStock } from '../../../../backend/context/StockContext'

interface CategoryFormProps {
  category?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onFormDataChange?: (data: any) => void
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  mode,
  onSave,
  onFormDataChange
}) => {
  const { state: stockState } = useStock()
  const { categories, salesDivisions } = stockState

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kind: 'Category' as 'SaleDivision' | 'Category' | 'Subcategory',
    parentCategory: '',
    salesDivision: '',
    color: '#1976d2',
    icon: ''
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        kind: category.kind || 'Category',
        parentCategory: category.parentCategory || '',
        salesDivision: category.salesDivision || '',
        color: category.color || '#1976d2',
        icon: category.icon || ''
      })
    }
  }, [category])

  // Notify parent of form data changes
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData)
    }
  }, [formData, onFormDataChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Category Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            disabled={isReadOnly}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={isReadOnly}>
            <InputLabel>Category Type</InputLabel>
            <Select
              value={formData.kind}
              onChange={(e) => setFormData(prev => ({ ...prev, kind: e.target.value as 'SaleDivision' | 'Category' | 'Subcategory' }))}
              label="Category Type"
            >
              <MenuItem value="SaleDivision">Sales Division</MenuItem>
              <MenuItem value="Category">Category</MenuItem>
              <MenuItem value="Subcategory">Subcategory</MenuItem>
            </Select>
          </FormControl>
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

        {/* Sales Division - no parent required */}
        {formData.kind === 'SaleDivision' && (
          <Grid item xs={12}>
            <TextField
              label="Sales Division Info"
              value="Sales Divisions are top-level categories and don't require a parent"
              disabled
              fullWidth
              variant="outlined"
              sx={{ 
                '& .MuiInputBase-input': { 
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }
              }}
            />
          </Grid>
        )}

        {/* Category - requires Sales Division as parent */}
        {formData.kind === 'Category' && (
          <Grid item xs={12}>
            <Autocomplete
              value={salesDivisions?.find(sd => sd.id === formData.salesDivision) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, salesDivision: value?.id || '' }))}
              options={salesDivisions || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parent Sales Division"
                  disabled={isReadOnly}
                  fullWidth
                  required
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
        )}

        {/* Subcategory - requires Category as parent */}
        {formData.kind === 'Subcategory' && (
          <Grid item xs={12}>
            <Autocomplete
              value={categories?.find(c => c.id === formData.parentCategory) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, parentCategory: value?.id || '' }))}
              options={categories?.filter(c => c.id !== category?.id) || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parent Category"
                  disabled={isReadOnly}
                  fullWidth
                  required
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
        )}

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
        <Grid item xs={12} sm={6}>
          <TextField
            label="Icon"
            value={formData.icon}
            onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
            disabled={isReadOnly}
            fullWidth
            placeholder="e.g., restaurant, local_bar, cake"
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default CategoryForm
