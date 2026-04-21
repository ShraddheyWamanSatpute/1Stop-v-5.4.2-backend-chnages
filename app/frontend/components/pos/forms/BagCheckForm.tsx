"use client"

import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material'
import {
  LocalLaundryService as BagCheckIcon,
  QrCode as QrCodeIcon,
  Person as CustomerIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import FormSection from '../../reusable/FormSection'

interface BagCheckFormData {
  customerPhone: string
  customerInitials: string
  itemType: 'bag' | 'coat' | 'other'
  description: string
  price: number
  qrCode: string
  paymentMethod: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  isReturned: boolean
  returnedAt?: number
  returnedBy?: string
}

interface BagCheckFormProps {
  bagCheckItem?: any // Existing item for edit/view mode
  mode: 'create' | 'edit' | 'view' | 'return'
  onSave: (data: any) => void
}

const BagCheckForm: React.FC<BagCheckFormProps> = ({
  bagCheckItem,
  mode,
  onSave,
}) => {

  const [formData, setFormData] = useState<BagCheckFormData>({
    customerPhone: '',
    customerInitials: '',
    itemType: 'bag',
    description: '',
    price: 5.00,
    qrCode: '',
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    isReturned: false,
  })

  // Initialize form data when bagCheckItem changes
  useEffect(() => {
    if (bagCheckItem) {
      setFormData({
        customerPhone: bagCheckItem.customerPhone || '',
        customerInitials: bagCheckItem.customerInitials || '',
        itemType: bagCheckItem.itemType || 'bag',
        description: bagCheckItem.description || '',
        price: bagCheckItem.price || 5.00,
        qrCode: bagCheckItem.qrCode || '',
        paymentMethod: bagCheckItem.paymentMethod || 'cash',
        paymentStatus: bagCheckItem.paymentStatus || 'completed',
        isReturned: bagCheckItem.isReturned || false,
        returnedAt: bagCheckItem.returnedAt,
        returnedBy: bagCheckItem.returnedBy,
      })
    } else {
      // Reset form for create mode
      setFormData({
        customerPhone: '',
        customerInitials: '',
        itemType: 'bag',
        description: '',
        price: 5.00,
        qrCode: `bagcheck-${Date.now()}`,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        isReturned: false,
      })
    }
  }, [bagCheckItem])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      qrCode: formData.qrCode || `bagcheck-${Date.now()}`,
    })
  }

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'bag':
        return 'Bag'
      case 'coat':
        return 'Coat'
      case 'other':
        return 'Other'
      default:
        return type
    }
  }

  const getItemPrice = (type: string) => {
    switch (type) {
      case 'bag':
        return 5.00
      case 'coat':
        return 3.00
      case 'other':
        return 2.00
      default:
        return 0
    }
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* Return Confirmation */}
      {mode === 'return' && (
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: 'warning.light', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'warning.main'
        }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Confirm Item Return
          </Typography>
          <Typography variant="body2">
            Are you sure you want to mark this {getItemTypeLabel(formData.itemType).toLowerCase()} as returned?
            This action cannot be undone.
          </Typography>
        </Box>
      )}

      {/* Customer Information */}
      <FormSection
        title="Customer Information"
        subtitle="Customer identification details"
        icon={<CustomerIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Customer Phone"
              value={formData.customerPhone}
              onChange={(e) => handleInputChange('customerPhone', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., 07123456789"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Customer Initials"
              value={formData.customerInitials}
              onChange={(e) => handleInputChange('customerInitials', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., JD"
              inputProps={{ maxLength: 5 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Item Information */}
      <FormSection
        title="Item Details"
        subtitle="What is being checked in"
        icon={<BagCheckIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Item Type</InputLabel>
              <Select
                value={formData.itemType}
                label="Item Type"
                onChange={(e) => {
                  const newType = e.target.value as 'bag' | 'coat' | 'other'
                  handleInputChange('itemType', newType)
                  if (mode === 'create') {
                    handleInputChange('price', getItemPrice(newType))
                  }
                }}
                disabled={isReadOnly}
              >
                <MenuItem value="bag">Bag (£5.00)</MenuItem>
                <MenuItem value="coat">Coat (£3.00)</MenuItem>
                <MenuItem value="other">Other (£2.00)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Price (£)"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', Number(e.target.value))}
              disabled={isReadOnly}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe the item (color, brand, special features...)"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Payment Information */}
      <FormSection
        title="Payment Details"
        subtitle="Payment method and status"
        icon={<MoneyIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="contactless">Contactless</MenuItem>
                <MenuItem value="mobile">Mobile Payment</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={formData.paymentStatus}
                label="Payment Status"
                onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      {/* QR Code Section */}
      <FormSection
        title="QR Code"
        subtitle="Item identification and retrieval"
        icon={<QrCodeIcon />}
        collapsible
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="QR Code"
              value={formData.qrCode}
              onChange={(e) => handleInputChange('qrCode', e.target.value)}
              disabled={isReadOnly}
              helperText="Unique identifier for item retrieval"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            {formData.qrCode && (
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                <QRCodeSVG
                  value={formData.qrCode}
                  size={120}
                  level="M"
                  includeMargin
                />
              </Paper>
            )}
          </Grid>
        </Grid>
      </FormSection>

      {/* Status Information for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Status Information"
          subtitle="Current item status"
          icon={<TimeIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.isReturned ? 'Returned' : 'In Storage'}
                  color={formData.isReturned ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.paymentStatus}
                  color={
                    formData.paymentStatus === 'completed' ? 'success' :
                    formData.paymentStatus === 'failed' ? 'error' : 'warning'
                  }
                  size="small"
                />
              </Box>
            </Grid>
            {bagCheckItem?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Checked In
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(bagCheckItem.createdAt).toLocaleString()}
                </Typography>
              </Grid>
            )}
            {formData.returnedAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Returned
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(formData.returnedAt).toLocaleString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </Box>
  )
}

export default BagCheckForm
