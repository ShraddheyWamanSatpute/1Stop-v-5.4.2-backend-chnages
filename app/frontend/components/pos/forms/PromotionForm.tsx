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
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  LocalOffer as OfferIcon,
  Schedule as ScheduleIcon,
  Loyalty as LoyaltyIcon,
  Category as BundleIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface PromotionFormData {
  name: string
  type: string
  description: string
  conditions: {
    buyQuantity: number
    getQuantity: number
    bundleItems: string[]
    timeSlots: string[]
    timeRange: string
    loyaltyPoints: number
    applicableCategories: string[]
  }
  rewards?: {
    discountType: string
    discountValue: number
  }
  discount?: {
    type: "percentage" | "fixed"
    value: number
  }
  active: boolean
  startDate: string
  endDate: string
  validFrom: string
  validTo: string
  applicableItems: string[]
  usageLimit: number
}

interface PromotionFormProps {
  open: boolean
  onClose: () => void
  promotion?: any // Existing promotion for edit mode
  mode: 'create' | 'edit' | 'view'
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const PromotionForm: React.FC<PromotionFormProps> = ({
  open,
  onClose,
  promotion,
  mode,
  onModeChange,
}) => {
  const location = useLocation()
  const { createPromotion, updatePromotion } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<PromotionFormData>({
    name: '',
    type: 'buy_x_get_y',
    description: '',
    conditions: {
      buyQuantity: 2,
      getQuantity: 1,
      bundleItems: [],
      timeSlots: [],
      timeRange: '',
      loyaltyPoints: 0,
      applicableCategories: [],
    },
    rewards: {
      discountType: 'percentage',
      discountValue: 0,
    },
    discount: {
      type: 'percentage',
      value: 0,
    },
    active: true,
    startDate: '',
    endDate: '',
    validFrom: '',
    validTo: '',
    applicableItems: [],
    usageLimit: 0,
  })

  // Initialize form data when promotion changes
  useEffect(() => {
    if (promotion && open) {
      setFormData({
        name: promotion.name || '',
        type: promotion.type || 'buy_x_get_y',
        description: promotion.description || '',
        conditions: {
          buyQuantity: promotion.conditions?.buyQuantity || 2,
          getQuantity: promotion.conditions?.getQuantity || 1,
          bundleItems: promotion.conditions?.bundleItems || [],
          timeSlots: promotion.conditions?.timeSlots || [],
          timeRange: promotion.conditions?.timeRange || '',
          loyaltyPoints: promotion.conditions?.loyaltyPoints || 0,
          applicableCategories: promotion.conditions?.applicableCategories || [],
        },
        rewards: {
          discountType: promotion.rewards?.discountType || 'percentage',
          discountValue: promotion.rewards?.discountValue || 0,
        },
        discount: {
          type: promotion.discount?.type || 'percentage',
          value: promotion.discount?.value || 0,
        },
        active: promotion.active ?? true,
        startDate: promotion.startDate || '',
        endDate: promotion.endDate || '',
        validFrom: promotion.validFrom || '',
        validTo: promotion.validTo || '',
        applicableItems: promotion.applicableItems || [],
        usageLimit: promotion.usageLimit || 0,
      })
    } else if (!promotion && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'buy_x_get_y',
        description: '',
        conditions: {
          buyQuantity: 2,
          getQuantity: 1,
          bundleItems: [],
          timeSlots: [],
          timeRange: '',
          loyaltyPoints: 0,
          applicableCategories: [],
        },
        rewards: {
          discountType: 'percentage',
          discountValue: 0,
        },
        discount: {
          type: 'percentage',
          value: 0,
        },
        active: true,
        startDate: '',
        endDate: '',
        validFrom: '',
        validTo: '',
        applicableItems: [],
        usageLimit: 0,
      })
    }
    setError(null)
    setSuccess(null)
  }, [promotion, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConditionChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [field]: value,
      },
    }))
  }

  const handleRewardChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rewards: {
        ...prev.rewards!,
        [field]: value,
      },
    }))
  }

  const handleDiscountChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      discount: {
        ...prev.discount!,
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Promotion name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (mode === 'create') {
        await createPromotion(formData as any)
        setSuccess('Promotion created successfully!')
      } else if (mode === 'edit') {
        await updatePromotion(promotion.id, formData as any)
        setSuccess('Promotion updated successfully!')
      }

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create promotion' : 'Failed to update promotion')
      console.error('Error saving promotion:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'buy_x_get_y':
        return <OfferIcon />
      case 'percentage_off':
        return <PercentIcon />
      case 'time_based':
        return <ScheduleIcon />
      case 'loyalty':
        return <LoyaltyIcon />
      case 'bundle':
        return <BundleIcon />
      default:
        return <OfferIcon />
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Promotion'
      case 'edit':
        return 'Edit Promotion'
      case 'view':
        return 'View Promotion'
      default:
        return 'Promotion'
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
            crudEntity: "promotionFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={getPromotionTypeIcon(formData.type)}
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
              crudEntity: "promotionFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="lg"
          loading={loading}
          disabled={loading || (mode !== "view" && !formData.name.trim())}
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
        title="Basic Information"
        subtitle="General promotion details"
        icon={<OfferIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Promotion Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
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
                <MenuItem value="buy_x_get_y">Buy X Get Y</MenuItem>
                <MenuItem value="percentage_off">Percentage Off</MenuItem>
                <MenuItem value="time_based">Time Based</MenuItem>
                <MenuItem value="loyalty">Loyalty</MenuItem>
                <MenuItem value="bundle">Bundle</MenuItem>
              </Select>
            </FormControl>
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
        </Grid>
      </FormSection>

      {/* Conditions */}
      <FormSection
        title="Conditions"
        subtitle="Define when this promotion applies"
        icon={<ScheduleIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          {formData.type === 'buy_x_get_y' && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buy Quantity"
                  type="number"
                  value={formData.conditions.buyQuantity}
                  onChange={(e) => handleConditionChange('buyQuantity', Number(e.target.value))}
                  disabled={isReadOnly}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Get Quantity"
                  type="number"
                  value={formData.conditions.getQuantity}
                  onChange={(e) => handleConditionChange('getQuantity', Number(e.target.value))}
                  disabled={isReadOnly}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </>
          )}

          {formData.type === 'percentage_off' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Time Range (e.g., 12:00-15:00)"
                value={formData.conditions.timeRange}
                onChange={(e) => handleConditionChange('timeRange', e.target.value)}
                disabled={isReadOnly}
                placeholder="12:00-15:00"
              />
            </Grid>
          )}

          {formData.type === 'loyalty' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Required Loyalty Points"
                type="number"
                value={formData.conditions.loyaltyPoints}
                onChange={(e) => handleConditionChange('loyaltyPoints', Number(e.target.value))}
                disabled={isReadOnly}
                inputProps={{ min: 0 }}
              />
            </Grid>
          )}
        </Grid>
      </FormSection>

      {/* Rewards/Discount */}
      <FormSection
        title="Rewards"
        subtitle="Define the promotion benefit"
        icon={<MoneyIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Discount Type</InputLabel>
              <Select
                value={formData.rewards?.discountType || formData.discount?.type || 'percentage'}
                label="Discount Type"
                onChange={(e) => {
                  handleRewardChange('discountType', e.target.value)
                  handleDiscountChange('type', e.target.value)
                }}
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
              label={
                (formData.rewards?.discountType || formData.discount?.type) === 'percentage'
                  ? 'Percentage (%)'
                  : 'Amount (£)'
              }
              type="number"
              value={formData.rewards?.discountValue || formData.discount?.value || 0}
              onChange={(e) => {
                const value = Number(e.target.value)
                handleRewardChange('discountValue', value)
                handleDiscountChange('value', value)
              }}
              disabled={isReadOnly}
              inputProps={{
                min: 0,
                max: (formData.rewards?.discountType || formData.discount?.type) === 'percentage' ? 100 : undefined,
              }}
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Validity Period */}
      <FormSection
        title="Validity Period"
        subtitle="Set promotion start and end dates"
        icon={<ScheduleIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate || formData.validFrom}
              onChange={(e) => {
                handleInputChange('startDate', e.target.value)
                handleInputChange('validFrom', e.target.value)
              }}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.endDate || formData.validTo}
              onChange={(e) => {
                handleInputChange('endDate', e.target.value)
                handleInputChange('validTo', e.target.value)
              }}
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Usage Limit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => handleInputChange('usageLimit', Number(e.target.value))}
              disabled={isReadOnly}
              helperText="0 = unlimited usage"
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>
      </FormSection>
    </CRUDModal>
  )
}

export default PromotionForm
