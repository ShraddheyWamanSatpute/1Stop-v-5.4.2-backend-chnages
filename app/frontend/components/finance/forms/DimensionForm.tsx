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
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  Autocomplete,
} from '@mui/material'
import {
  Category as CategoryIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import type { Dimension } from '../../../../backend/interfaces/Finance'

interface DimensionFormProps {
  dimension?: Dimension | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: Omit<Dimension, "id" | "created_at" | "updated_at">) => void
}

const DimensionForm: React.FC<DimensionFormProps> = ({
  dimension,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()

  const [formData, setFormData] = useState({
    entity_id: companyState.companyID || '',
    name: '',
    type: 'department' as 'department' | 'project' | 'location' | 'cost_center' | 'custom',
    code: '',
    description: '',
    is_active: true,
    is_required: false,
    parent_id: '',
    applicable_account_types: [] as string[],
  })

  useEffect(() => {
    if (dimension) {
      setFormData({
        entity_id: dimension.entity_id || companyState.companyID || '',
        name: dimension.name || '',
        type: dimension.type || 'department',
        code: dimension.code || '',
        description: dimension.description || '',
        is_active: dimension.is_active !== undefined ? dimension.is_active : true,
        is_required: dimension.is_required !== undefined ? dimension.is_required : false,
        parent_id: dimension.parent_id || '',
        applicable_account_types: dimension.applicable_account_types || [],
      })
    } else {
      // Generate code from name
      const generateCode = (name: string) => {
        return name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10)
      }
      setFormData(prev => ({
        ...prev,
        code: generateCode(prev.name),
      }))
    }
  }, [dimension, companyState.companyID])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-generate code from name if creating new
      if (field === 'name' && !dimension && value) {
        newData.code = value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10)
      }
      
      return newData
    })
  }

  const handleSubmit = () => {
    if (!formData.name) {
      alert('Please enter a dimension name')
      return
    }

    if (!formData.code) {
      alert('Please enter a dimension code')
      return
    }

    onSave({
      ...formData,
      parent_id: formData.parent_id || undefined,
    })
  }

  const isReadOnly = mode === 'view'

  // Get available parent dimensions (same type, excluding self)
  const availableParents = financeState.dimensions.filter(
    d => d.type === formData.type && d.id !== dimension?.id && d.is_active
  )

  const accountTypes = [
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' },
  ]

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Dimension Information" 
        icon={<CategoryIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dimension Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Department, Project, Location"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              required
              disabled={isReadOnly}
              placeholder="e.g., DEPT, PROJ"
              helperText="Short code for this dimension"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Dimension Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                label="Dimension Type"
                disabled={isReadOnly}
              >
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="project">Project</MenuItem>
                <MenuItem value="location">Location</MenuItem>
                <MenuItem value="cost_center">Cost Center</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Parent Dimension</InputLabel>
              <Select
                value={formData.parent_id}
                onChange={(e) => handleChange('parent_id', e.target.value)}
                label="Parent Dimension"
                disabled={isReadOnly}
                displayEmpty
              >
                <MenuItem value="">None (Top Level)</MenuItem>
                {availableParents.map((parent) => (
                  <MenuItem key={parent.id} value={parent.id}>
                    {parent.name} ({parent.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_required}
                  onChange={(e) => handleChange('is_required', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Required (must be set on journal lines)"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Applicable Account Types
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {accountTypes.map((type) => (
                <Chip
                  key={type.value}
                  label={type.label}
                  onClick={() => {
                    const newTypes = formData.applicable_account_types.includes(type.value)
                      ? formData.applicable_account_types.filter(t => t !== type.value)
                      : [...formData.applicable_account_types, type.value]
                    handleChange('applicable_account_types', newTypes)
                  }}
                  color={formData.applicable_account_types.includes(type.value) ? 'primary' : 'default'}
                  disabled={isReadOnly}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Select which account types this dimension applies to. Leave empty to apply to all.
            </Typography>
          </Grid>
        </Grid>
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.code}
            style={{
              padding: '12px 24px',
              backgroundColor: (!formData.name || !formData.code) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!formData.name || !formData.code) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Dimension' : 'Create Dimension'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default DimensionForm
