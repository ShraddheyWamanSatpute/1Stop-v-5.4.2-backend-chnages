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
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon,
  PhonelinkRing as ContactlessIcon,
  QrCode as QrCodeIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface PaymentTypeFormData {
  name: string
  type: 'cash' | 'card' | 'contactless' | 'mobile' | 'voucher' | 'other'
  cardConfig?: {
    acceptedCards: string[]
    requirePin: boolean
    contactlessLimit: number
  }
  isActive: boolean
  sortOrder: number
}

interface PaymentTypeFormProps {
  open: boolean
  onClose: () => void
  paymentType?: any // Existing payment type for edit mode
  mode: 'create' | 'edit' | 'view'
  onSave?: (formData: any) => void
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const PaymentTypeForm: React.FC<PaymentTypeFormProps> = ({
  open,
  onClose,
  paymentType,
  mode,
  onSave,
  onModeChange,
}) => {
  const location = useLocation()
  const { createPaymentType, updatePaymentType } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<PaymentTypeFormData>({
    name: '',
    type: 'cash',
    cardConfig: {
      acceptedCards: [],
      requirePin: false,
      contactlessLimit: 100,
    },
    isActive: true,
    sortOrder: 0,
  })

  // Initialize form data when payment type changes
  useEffect(() => {
    if (paymentType && open) {
      setFormData({
        name: paymentType.name || '',
        type: paymentType.type || 'cash',
        cardConfig: {
          acceptedCards: paymentType.cardConfig?.acceptedCards || [],
          requirePin: paymentType.cardConfig?.requirePin || false,
          contactlessLimit: paymentType.cardConfig?.contactlessLimit || 100,
        },
        isActive: paymentType.isActive ?? true,
        sortOrder: paymentType.sortOrder || 0,
      })
    } else if (!paymentType && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'cash',
        cardConfig: {
          acceptedCards: [],
          requirePin: false,
          contactlessLimit: 100,
        },
        isActive: true,
        sortOrder: 0,
      })
    }
    setError(null)
    setSuccess(null)
  }, [paymentType, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCardConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      cardConfig: {
        ...prev.cardConfig!,
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Payment type name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (onSave) {
        // Use external onSave handler
        await onSave(formData)
        setSuccess('Payment type saved successfully!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Use internal context methods
        if (mode === 'create') {
          await createPaymentType(formData as any)
          setSuccess('Payment type created successfully!')
        } else if (mode === 'edit') {
          await updatePaymentType(paymentType.id, formData as any)
          setSuccess('Payment type updated successfully!')
        }

        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create payment type' : 'Failed to update payment type')
      console.error('Error saving payment type:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Payment Type'
      case 'edit':
        return 'Edit Payment Type'
      case 'view':
        return 'View Payment Type'
      default:
        return 'Payment Type'
    }
  }

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CardIcon />
      case 'contactless':
        return <ContactlessIcon />
      case 'mobile':
        return <QrCodeIcon />
      case 'cash':
      default:
        return <PaymentIcon />
    }
  }

  const isReadOnly = mode === 'view'
  const isCardType = formData.type === 'card' || formData.type === 'contactless'

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
            crudEntity: "paymentTypeFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? formData.name : undefined}
          icon={getPaymentTypeIcon(formData.type)}
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
              crudEntity: "paymentTypeFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="md"
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
        title="Payment Type Information"
        subtitle="Basic payment method details"
        icon={<PaymentIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Payment Type Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Visa/Mastercard, Apple Pay"
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
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="contactless">Contactless</MenuItem>
                <MenuItem value="mobile">Mobile Payment</MenuItem>
                <MenuItem value="voucher">Voucher</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sort Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => handleInputChange('sortOrder', Number(e.target.value))}
              disabled={isReadOnly}
              helperText="Display order in payment options"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Card Configuration */}
      {isCardType && (
        <FormSection
          title="Card Configuration"
          subtitle="Settings for card payments"
          icon={<CardIcon />}
          collapsible
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Accepted Card Types</InputLabel>
                <Select
                  multiple
                  value={formData.cardConfig?.acceptedCards || []}
                  onChange={(e) => handleCardConfigChange('acceptedCards', e.target.value)}
                  disabled={isReadOnly}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="visa">Visa</MenuItem>
                  <MenuItem value="mastercard">Mastercard</MenuItem>
                  <MenuItem value="amex">American Express</MenuItem>
                  <MenuItem value="discover">Discover</MenuItem>
                  <MenuItem value="maestro">Maestro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contactless Limit (£)"
                type="number"
                value={formData.cardConfig?.contactlessLimit || 100}
                onChange={(e) => handleCardConfigChange('contactlessLimit', Number(e.target.value))}
                disabled={isReadOnly}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.cardConfig?.requirePin || false}
                    onChange={(e) => handleCardConfigChange('requirePin', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Require PIN"
              />
            </Grid>
          </Grid>
        </FormSection>
      )}

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Summary"
          subtitle="Payment type overview"
          icon={<BankIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.isActive ? 'Active' : 'Inactive'}
                  color={formData.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Type
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.type}
                  color="primary"
                  size="small"
                  icon={getPaymentTypeIcon(formData.type)}
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Sort Order
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.sortOrder}
              </Typography>
            </Grid>
            {isCardType && formData.cardConfig && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Contactless Limit
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  £{formData.cardConfig.contactlessLimit}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default PaymentTypeForm

