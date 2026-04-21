"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material'
import {
  LocationOn as LocationIcon,
  People as CapacityIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import { usePOS } from '../../../../backend/context/POSContext'

// FormSection component for organizing form content
interface FormSectionProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

const FormSection: React.FC<FormSectionProps> = ({ title, subtitle, icon, children }) => {
  const location = useLocation()
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon && <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{icon}</Box>}
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Paper>
  )
}

interface LocationFormData {
  name: string
  description: string
  capacity?: number
  active?: boolean
}

interface LocationFormProps {
  open: boolean
  onClose: () => void
  location?: any // Existing location for edit mode
  mode: 'create' | 'edit' | 'view'
  onSave?: (formData: any) => void
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const LocationForm: React.FC<LocationFormProps> = ({
  open,
  onClose,
  location,
  mode,
  onSave,
  onModeChange,
}) => {
  const { createLocation, updateLocation } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    description: '',
    capacity: undefined,
    active: true,
  })

  // Initialize form data when location changes
  useEffect(() => {
    if (location && open) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        capacity: location.capacity,
        active: location.active !== undefined ? location.active : true,
      })
    } else if (!location && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        capacity: undefined,
        active: true,
      })
    }
    setError(null)
    setSuccess(null)
  }, [location, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Location name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const submitData = {
        ...formData,
        type: 'other' as const,
        isActive: formData.active ?? true
      }

      if (onSave) {
        // Use external onSave handler
        await onSave(submitData)
        setSuccess('Location saved successfully!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Use internal context methods
        if (mode === 'create') {
          await createLocation(submitData)
          setSuccess('Location created successfully!')
        } else if (mode === 'edit') {
          await updateLocation(location.id, submitData)
          setSuccess('Location updated successfully!')
        }

        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create location' : 'Failed to update location')
      console.error('Error saving location:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Location'
      case 'edit':
        return 'Edit Location'
      case 'view':
        return 'View Location'
      default:
        return 'Location'
    }
  }

  const isReadOnly = mode === 'view'

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "locationFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={<LocationIcon />}
          mode={mode}
          onEdit={mode === "view"
          ? () => {
              if (onModeChange) onModeChange("edit")
            }
          : undefined}
          onSave={async (...args) => {
            const __workspaceOnSave = async () => {
        await handleSubmit()
      }
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "locationFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="md"
          loading={loading}
          disabled={loading || (!isReadOnly && !formData.name.trim())}
        >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            label="Location Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isReadOnly}
            required
            placeholder="e.g., Main Dining Area, Private Room 1"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Capacity"
            type="number"
            value={formData.capacity || ''}
            onChange={(e) => handleInputChange('capacity', e.target.value ? Number(e.target.value) : undefined)}
            disabled={isReadOnly}
            inputProps={{ min: 1 }}
            placeholder="Max people"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isReadOnly}
            placeholder="Describe this location, its features, and any special requirements..."
          />
        </Grid>
      </Grid>

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Summary"
          subtitle="Location overview"
          icon={<CapacityIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.active ? 'Active' : 'Inactive'}
                  color={formData.active ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Capacity
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.capacity ? `${formData.capacity} people` : 'No limit'}
              </Typography>
            </Grid>
            {location?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(location.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

// Create a content-only version for use inside CRUDModal
interface LocationFormContentProps {
  location?: any
  mode: 'create' | 'edit' | 'view'
  onCancel?: () => void
}

export const LocationFormContent: React.FC<LocationFormContentProps> = ({
  location,
  mode,
}) => {
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    description: location?.description || '',
    capacity: location?.capacity || 0,
    active: location?.active !== undefined ? location.active : true,
  })

  const isReadOnly = mode === 'view'

  const handleChange = (field: keyof LocationFormData, value: any) => {
    if (!isReadOnly) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  // Expose form data to parent component for saving
  useEffect(() => {
    if (mode !== 'view') {
      (window as any).currentLocationFormData = formData
    }
  }, [formData, mode])

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Location Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={isReadOnly}
            fullWidth
            required
            helperText="Enter a unique name for this location"
            InputProps={{
              startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={isReadOnly}
            fullWidth
            multiline
            rows={3}
            helperText="Optional description for this location"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => handleChange('capacity', Number(e.target.value))}
            disabled={isReadOnly}
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Maximum number of people"
            InputProps={{
              startAdornment: <CapacityIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default LocationForm
