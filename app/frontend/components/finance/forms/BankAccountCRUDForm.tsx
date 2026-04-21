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
  InputAdornment,
  Chip,
} from '@mui/material'
import {
  AccountBalance as AccountBalanceIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import type { BankAccount } from '../../../../backend/interfaces/Finance'

interface BankAccountCRUDFormProps {
  bankAccount?: BankAccount | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BankAccountCRUDForm: React.FC<BankAccountCRUDFormProps> = ({
  bankAccount,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()

  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    accountNumber: '',
    type: 'checking' as 'checking' | 'savings' | 'credit_card' | 'line_of_credit',
    currency: 'GBP',
    balance: 0,
    status: 'active' as 'active' | 'inactive' | 'closed',
  })

  // Update form data when bankAccount prop changes
  useEffect(() => {
    if (bankAccount) {
      // Map 'credit' to 'credit_card' for backwards compatibility
      const accountType = bankAccount.type === 'credit' ? 'credit_card' : bankAccount.type
      
      setFormData({
        name: bankAccount.name || '',
        bank: bankAccount.bank || '',
        accountNumber: bankAccount.accountNumber || '',
        type: accountType || 'checking',
        currency: bankAccount.currency || 'GBP',
        balance: bankAccount.balance || 0,
        status: bankAccount.status || 'active',
      })
    }
  }, [bankAccount])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      lastSync: bankAccount?.lastSync || new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Bank Account Information" 
        icon={<AccountBalanceIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Account Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Main Business Checking"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Bank Name"
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Chase, Wells Fargo"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Account Number"
              value={formData.accountNumber}
              onChange={(e) => handleChange('accountNumber', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="Last 4 digits: ****1234"
              helperText="For security, enter only the last 4 digits"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                label="Account Type"
              >
                <MenuItem value="checking">Checking Account</MenuItem>
                <MenuItem value="savings">Savings Account</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="line_of_credit">Line of Credit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                label="Currency"
              >
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                {financeState.currencies?.map((curr) => (
                  <MenuItem key={curr.code} value={curr.code}>
                    {curr.code} - {curr.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Current Balance"
              type="number"
              value={formData.balance}
              onChange={(e) => handleChange('balance', parseFloat(e.target.value) || 0)}
              disabled={isReadOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              }}
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
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Account Status" 
        icon={<InfoIcon />}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip 
                label={formData.status.toUpperCase()} 
                color={
                  formData.status === 'active' ? 'success' :
                  formData.status === 'inactive' ? 'warning' : 'error'
                }
                size="small"
              />
              <Chip 
                label={formData.type.replace('_', ' ').toUpperCase()} 
                variant="outlined"
                size="small"
              />
              {bankAccount && bankAccount.lastSync && (
                <Typography variant="body2" color="text.secondary">
                  Last Synced: {new Date(bankAccount.lastSync).toLocaleString()}
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
            {mode === 'edit' ? 'Update Bank Account' : 'Add Bank Account'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default BankAccountCRUDForm

