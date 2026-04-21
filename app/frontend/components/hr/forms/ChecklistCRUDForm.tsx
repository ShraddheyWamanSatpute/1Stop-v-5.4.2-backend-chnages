"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Checkbox,
  IconButton,
  Button,
  LinearProgress,
} from '@mui/material'
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
  order: number
}

interface StarterChecklist {
  id?: string
  title: string
  description: string
  employeeId?: string
  items: ChecklistItem[]
  completionRate: number
  isTemplate: boolean
  createdAt: Date
  updatedAt: Date
}

interface ChecklistCRUDFormProps {
  checklist?: StarterChecklist | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const ChecklistCRUDForm: React.FC<ChecklistCRUDFormProps> = ({
  checklist,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState<StarterChecklist>({
    title: '',
    description: '',
    items: [],
    completionRate: 0,
    isTemplate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  useEffect(() => {
    if (checklist) {
      setFormData({
        ...checklist,
        createdAt: new Date(checklist.createdAt),
        updatedAt: new Date(checklist.updatedAt),
      })
    }
  }, [checklist])

  useEffect(() => {
    const completedItems = formData.items.filter(item => item.completed).length
    const totalItems = formData.items.length
    const rate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    setFormData(prev => ({ ...prev, completionRate: rate }))
  }, [formData.items])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  const addItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      title: '',
      description: '',
      completed: false,
      required: true,
      order: formData.items.length + 1
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }))
  }

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection title="Checklist Information" icon={<AssignmentIcon />}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Checklist Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isTemplate}
                  onChange={(e) => handleChange('isTemplate', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Use as Template"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Checklist Items</Typography>
            {!isReadOnly && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addItem}
              >
                Add Item
              </Button>
            )}
          </Box>

          <Paper sx={{ mb: 2, p: 2, bgcolor: 'info.50' }}>
            <Typography variant="body2" gutterBottom>
              Completion Progress: {formData.completionRate.toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={formData.completionRate}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Paper>

          {formData.items.map((item) => (
            <Paper key={item.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1}>
                  <Checkbox
                    checked={item.completed}
                    onChange={(e) => updateItem(item.id, { completed: e.target.checked })}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Title"
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={1}>
                  <Switch
                    checked={item.required}
                    onChange={(e) => updateItem(item.id, { required: e.target.checked })}
                    disabled={isReadOnly}
                    size="small"
                  />
                </Grid>
                {!isReadOnly && (
                  <Grid item xs={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}
        </Box>
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Checklist' : 'Create Checklist'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default ChecklistCRUDForm
