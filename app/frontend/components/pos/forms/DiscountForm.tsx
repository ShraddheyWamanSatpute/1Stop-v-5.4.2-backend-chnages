"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  LocalOffer as DiscountIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface DiscountFormData {
  name: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  active: boolean
  minOrderAmount?: number
  maxDiscountAmount?: number
  validFrom?: string
  validTo?: string
  applicableItems?: string[]
  usageLimit?: number
  usageCount?: number
}

interface DiscountFormProps {
  open: boolean
  onClose: () => void
  discount?: any // Existing discount for edit mode
  mode: 'create' | 'edit' | 'view'
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const DiscountForm: React.FC<DiscountFormProps> = ({
  open,
  onClose,
  discount,
  mode,
  onModeChange,
}) => {
  const location = useLocation()
  const { createDiscount, updateDiscount } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<DiscountFormData>({
    name: '',
    type: 'percentage',
    value: 0,
    description: '',
    active: true,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    validFrom: '',
    validTo: '',
    applicableItems: [],
    usageLimit: 0,
    usageCount: 0,
  })

  // Initialize form data when discount changes
  useEffect(() => {
    if (discount && open) {
      setFormData({
        name: discount.name || '',
        type: discount.type || 'percentage',
        value: discount.value || 0,
        description: discount.description || '',
        active: discount.active ?? true,
        minOrderAmount: discount.minOrderAmount || 0,
        maxDiscountAmount: discount.maxDiscountAmount || 0,
        validFrom: discount.validFrom || '',
        validTo: discount.validTo || '',
        applicableItems: discount.applicableItems || [],
        usageLimit: discount.usageLimit || 0,
        usageCount: discount.usageCount || 0,
      })
    } else if (!discount && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'percentage',
        value: 0,
        description: '',
        active: true,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        validFrom: '',
        validTo: '',
        applicableItems: [],
        usageLimit: 0,
        usageCount: 0,
      })
    }
    setError(null)
    setSuccess(null)
  }, [discount, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Discount name is required')
      return
    }

    if (formData.value <= 0) {
      setError('Discount value must be greater than 0')
      return
    }

    if (formData.type === 'percentage' && formData.value > 100) {
      setError('Percentage discount cannot exceed 100%')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (mode === 'create') {
        await createDiscount(formData as any)
        setSuccess('Discount created successfully!')
      } else if (mode === 'edit') {
        await updateDiscount(discount.id, formData as any)
        setSuccess('Discount updated successfully!')
      }

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create discount' : 'Failed to update discount')
      console.error('Error saving discount:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Discount'
      case 'edit':
        return 'Edit Discount'
      case 'view':
        return 'View Discount'
      default:
        return 'Discount'
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
            crudEntity: "discountFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={<DiscountIcon />}
          mode={mode}
          onEdit={() => {
        if (onModeChange) onModeChange("edit")
        else onClose()
      }}
          onSave={async (...args) => {
            const __workspaceOnSave = async () => {
        await handleSubmit()
      }
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "discountFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="md"
          loading={loading}
          disabled={loading || (mode !== "view" && (!formData.name.trim() || formData.value <= 0))}
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

      {/* Basic Information */}
      <FormSection
        title="Discount Information"
        subtitle="Basic discount details"
        icon={<DiscountIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Discount Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Staff Discount, Happy Hour"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="percentage">Percentage (%)</MenuItem>
                <MenuItem value="fixed">Fixed Amount (£)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (£)'}
              type="number"
              value={formData.value}
              onChange={(e) => handleInputChange('value', Number(e.target.value))}
              disabled={isReadOnly}
              required
              inputProps={{
                min: 0,
                max: formData.type === 'percentage' ? 100 : undefined,
                step: formData.type === 'percentage' ? 1 : 0.01,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active"
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
              placeholder="Describe when and how this discount applies..."
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Discount Rules */}
      <FormSection
        title="Discount Rules"
        subtitle="Configure discount conditions and limits"
        icon={<MoneyIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Minimum Order Amount (£)"
              type="number"
              value={formData.minOrderAmount || ''}
              onChange={(e) => handleInputChange('minOrderAmount', e.target.value ? Number(e.target.value) : undefined)}
              disabled={isReadOnly}
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0 = no minimum"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maximum Discount Amount (£)"
              type="number"
              value={formData.maxDiscountAmount || ''}
              onChange={(e) => handleInputChange('maxDiscountAmount', e.target.value ? Number(e.target.value) : undefined)}
              disabled={isReadOnly}
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0 = no maximum"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Usage Limit"
              type="number"
              value={formData.usageLimit || ''}
              onChange={(e) => handleInputChange('usageLimit', e.target.value ? Number(e.target.value) : undefined)}
              disabled={isReadOnly}
              inputProps={{ min: 0 }}
              helperText="0 = unlimited usage"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Validity Period */}
      <FormSection
        title="Validity Period"
        subtitle="Set discount start and end dates"
        icon={<TimeIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Valid From"
              type="date"
              value={formData.validFrom}
              onChange={(e) => handleInputChange('validFrom', e.target.value)}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Valid To"
              type="date"
              value={formData.validTo}
              onChange={(e) => handleInputChange('validTo', e.target.value)}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Discount Summary"
          subtitle="Complete discount overview"
          icon={<PercentIcon />}
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
                Discount Value
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.type === 'percentage' ? `${formData.value}%` : `£${formData.value.toFixed(2)}`}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Usage
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.usageCount || 0}
                {formData.usageLimit ? ` / ${formData.usageLimit}` : ' (unlimited)'}
              </Typography>
            </Grid>
            {discount?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(discount.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default DiscountForm

