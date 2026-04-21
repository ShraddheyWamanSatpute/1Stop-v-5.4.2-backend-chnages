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
  Chip,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import type { Currency } from '../../../../backend/interfaces/Finance'

interface CurrencyCRUDFormProps {
  currency?: Currency | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const CurrencyCRUDForm: React.FC<CurrencyCRUDFormProps> = ({
  currency,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    rate: 1.0,
    isBase: false,
    status: 'active' as 'active' | 'inactive',
  })

  // Update form data when currency prop changes
  useEffect(() => {
    if (currency) {
      setFormData({
        code: currency.code || '',
        name: currency.name || '',
        symbol: currency.symbol || '',
        rate: currency.rate || 1.0,
        isBase: currency.isBase || false,
        status: currency.status || 'active',
      })
    }
  }, [currency])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      code: formData.code.toUpperCase(),
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  // Common currencies for quick selection
  const commonCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  ]

  const handleQuickSelect = (selectedCurrency: typeof commonCurrencies[0]) => {
    setFormData(prev => ({
      ...prev,
      code: selectedCurrency.code,
      name: selectedCurrency.name,
      symbol: selectedCurrency.symbol,
    }))
  }

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Currency Information" 
        icon={<AttachMoneyIcon />}
      >
        <Grid container spacing={3}>
          {mode === 'create' && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Quick Select: {commonCurrencies.map((curr) => (
                  <Chip
                    key={curr.code}
                    label={`${curr.code} (${curr.symbol})`}
                    onClick={() => handleQuickSelect(curr)}
                    size="small"
                    sx={{ ml: 0.5, mb: 0.5 }}
                    variant={formData.code === curr.code ? 'filled' : 'outlined'}
                    color={formData.code === curr.code ? 'primary' : 'default'}
                  />
                ))}
              </Alert>
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Currency Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              required
              disabled={isReadOnly || mode === 'edit'}
              placeholder="e.g., USD, EUR, GBP"
              inputProps={{ maxLength: 3 }}
              helperText={mode === 'edit' ? "Code cannot be changed" : "3-letter ISO code"}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Currency Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., US Dollar"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Symbol"
              value={formData.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., $, €, £"
              inputProps={{ maxLength: 3 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Exchange Rate & Settings" 
        icon={<TrendingUpIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Exchange Rate"
              type="number"
              value={formData.rate}
              onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 1.0)}
              required
              disabled={isReadOnly || formData.isBase}
              inputProps={{ step: 0.0001, min: 0 }}
              helperText={
                formData.isBase 
                  ? "Base currency always has rate of 1.0" 
                  : "Rate relative to base currency"
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isBase}
                  onChange={(e) => {
                    handleChange('isBase', e.target.checked)
                    if (e.target.checked) {
                      handleChange('rate', 1.0)
                    }
                  }}
                  disabled={isReadOnly}
                />
              }
              label="Set as Base Currency"
            />
            {formData.isBase && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Base currency is used as the reference for all exchange rates. 
                Only one currency can be the base currency at a time.
              </Alert>
            )}
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Exchange Rate Preview" 
        icon={<AttachMoneyIcon />}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Example Conversion:
              </Typography>
              <Typography variant="h6">
                1 {formData.isBase ? formData.code || 'BASE' : 'BASE'} = {formData.rate.toFixed(4)} {formData.isBase ? 'BASE' : formData.code || 'XXX'}
              </Typography>
              {!formData.isBase && formData.rate > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  1 {formData.code || 'XXX'} = {(1 / formData.rate).toFixed(4)} BASE
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip 
                label={formData.status.toUpperCase()} 
                color={formData.status === 'active' ? 'success' : 'default'}
                size="small"
              />
              {formData.isBase && (
                <Chip 
                  label="BASE CURRENCY" 
                  color="primary"
                  size="small"
                />
              )}
              {currency && currency.lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last Updated: {currency.lastUpdated}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
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
            {mode === 'edit' ? 'Update Currency' : 'Add Currency'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default CurrencyCRUDForm

