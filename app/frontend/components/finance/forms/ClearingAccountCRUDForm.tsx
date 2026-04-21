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
  Switch,
  FormControlLabel,
} from '@mui/material'
import {
  AccountBalanceWallet as ClearingIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import type { ClearingAccount } from '../../../../backend/interfaces/Finance'

interface ClearingAccountCRUDFormProps {
  clearingAccount?: ClearingAccount | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const ClearingAccountCRUDForm: React.FC<ClearingAccountCRUDFormProps> = ({
  clearingAccount,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()

  const [formData, setFormData] = useState({
    entity_id: companyState.companyID || '',
    name: '',
    account_id: '',
    bank_account_id: '',
    type: 'pos' as 'pos' | 'gateway' | 'other',
    auto_reconcile: false,
    reconciliation_frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
  })

  useEffect(() => {
    if (clearingAccount) {
      setFormData({
        entity_id: clearingAccount.entity_id || companyState.companyID || '',
        name: clearingAccount.name || '',
        account_id: clearingAccount.account_id || '',
        bank_account_id: clearingAccount.bank_account_id || '',
        type: clearingAccount.type || 'pos',
        auto_reconcile: clearingAccount.auto_reconcile ?? false,
        reconciliation_frequency: clearingAccount.reconciliation_frequency || 'daily',
      })
    }
  }, [clearingAccount, companyState.companyID])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      created_at: clearingAccount?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Clearing Account Information" 
        icon={<ClearingIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Clearing Account Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., POS Clearing Account"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                label="Type"
              >
                <MenuItem value="pos">POS (Point of Sale)</MenuItem>
                <MenuItem value="gateway">Payment Gateway</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>GL Account</InputLabel>
              <Select
                value={formData.account_id}
                onChange={(e) => handleChange('account_id', e.target.value)}
                label="GL Account"
              >
                {financeState.accounts
                  .filter(acc => acc.type === 'asset' && acc.subType === 'current_asset')
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Select the GL account used for clearing transactions
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={formData.bank_account_id}
                onChange={(e) => handleChange('bank_account_id', e.target.value)}
                label="Bank Account"
              >
                {financeState.bankAccounts
                  .filter(acc => acc.status === 'active')
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.bank})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Bank account where funds are deposited
            </Typography>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Reconciliation Settings" 
        icon={<InfoIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.auto_reconcile}
                  onChange={(e) => handleChange('auto_reconcile', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Auto-Reconcile"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Automatically reconcile clearing account transactions with bank statements
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly || !formData.auto_reconcile}>
              <InputLabel>Reconciliation Frequency</InputLabel>
              <Select
                value={formData.reconciliation_frequency}
                onChange={(e) => handleChange('reconciliation_frequency', e.target.value)}
                label="Reconciliation Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              How often to automatically reconcile this clearing account
            </Typography>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Usage Information" 
        icon={<InfoIcon />}
      >
        <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Clearing accounts</strong> are used to track funds that are temporarily held before being deposited into your bank account.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Common use cases:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>POS transactions that batch and settle daily</li>
            <li>Payment gateway transactions with delayed settlement</li>
            <li>Third-party payment processors</li>
          </Typography>
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
            {mode === 'edit' ? 'Update Clearing Account' : 'Create Clearing Account'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default ClearingAccountCRUDForm
