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
  FormHelperText,
} from '@mui/material'
import {
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import type { Account } from '../../../../backend/interfaces/Finance'

interface AccountCRUDFormProps {
  account?: Account | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const AccountCRUDForm: React.FC<AccountCRUDFormProps> = ({
  account,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset' as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
    subType: '',
    category: '',
    balance: 0,
    description: '',
    parentAccountId: '',
    currency: 'USD',
    isArchived: false,
    isSystemAccount: false,
  })

  // Update form data when account prop changes
  useEffect(() => {
    if (account) {
      // Map 'revenue' to 'income' for backwards compatibility
      const accountType = account.type === 'revenue' ? 'income' : account.type
      
      setFormData({
        code: account.code || '',
        name: account.name || '',
        type: accountType || 'asset',
        subType: account.subType || '',
        category: account.category || '',
        balance: account.balance || 0,
        description: account.description || '',
        parentAccountId: account.parentAccountId || '',
        currency: account.currency || 'USD',
        isArchived: account.isArchived || false,
        isSystemAccount: account.isSystemAccount || false,
      })
    }
  }, [account])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Auto-select subType based on type
    if (field === 'type') {
      let defaultSubType = ''
      if (value === 'asset') defaultSubType = 'current_asset'
      else if (value === 'liability') defaultSubType = 'current_liability'
      else if (value === 'expense') defaultSubType = 'operating_expense'
      else if (value === 'income') defaultSubType = 'revenue'
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
        subType: defaultSubType
      }))
    }
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      createdAt: account?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  // SubType options based on type
  const getSubTypeOptions = () => {
    switch (formData.type) {
      case 'asset':
        return [
          { value: 'current_asset', label: 'Current Asset' },
          { value: 'fixed_asset', label: 'Fixed Asset' },
          { value: 'inventory', label: 'Inventory' },
          { value: 'other_asset', label: 'Other Asset' },
        ]
      case 'liability':
        return [
          { value: 'current_liability', label: 'Current Liability' },
          { value: 'long_term_liability', label: 'Long-term Liability' },
          { value: 'other_liability', label: 'Other Liability' },
        ]
      case 'equity':
        return [
          { value: 'owner_equity', label: 'Owner Equity' },
          { value: 'retained_earnings', label: 'Retained Earnings' },
        ]
      case 'income':
        return [
          { value: 'revenue', label: 'Revenue' },
          { value: 'other_income', label: 'Other Income' },
        ]
      case 'expense':
        return [
          { value: 'operating_expense', label: 'Operating Expense' },
          { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold' },
          { value: 'other_expense', label: 'Other Expense' },
        ]
      default:
        return []
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Account Information" 
        icon={<AccountBalanceIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Account Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., 1000, 2000, etc."
              helperText="Unique identifier for this account"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Account Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Cash, Accounts Payable"
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
                <MenuItem value="asset">Asset</MenuItem>
                <MenuItem value="liability">Liability</MenuItem>
                <MenuItem value="equity">Equity</MenuItem>
                <MenuItem value="income">Income</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Sub-Type</InputLabel>
              <Select
                value={formData.subType}
                onChange={(e) => handleChange('subType', e.target.value)}
                label="Sub-Type"
              >
                {getSubTypeOptions().map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., Bank Account, Credit Card"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Initial Balance"
              type="number"
              value={formData.balance}
              onChange={(e) => handleChange('balance', parseFloat(e.target.value) || 0)}
              disabled={isReadOnly || mode === 'edit'}
              InputProps={{
                startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              }}
              helperText={mode === 'edit' ? "Balance cannot be changed after creation" : ""}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                label="Currency"
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
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
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Parent Account</InputLabel>
              <Select
                value={formData.parentAccountId}
                onChange={(e) => handleChange('parentAccountId', e.target.value)}
                label="Parent Account"
              >
                <MenuItem value="">
                  <em>None (Top Level Account)</em>
                </MenuItem>
                {financeState.accounts?.filter(acc => acc.id !== account?.id).map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Optional: Select a parent account for hierarchical organization</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Additional Details" 
        icon={<DescriptionIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe the purpose and usage of this account..."
            />
          </Grid>
          {mode !== 'create' && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Status: <strong>{formData.isArchived ? 'Archived' : 'Active'}</strong>
                </Typography>
                {formData.isSystemAccount && (
                  <Typography variant="body2" color="warning.main">
                    <strong>System Account (Cannot be deleted)</strong>
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
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
            {mode === 'edit' ? 'Update Account' : 'Create Account'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default AccountCRUDForm

