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
  Alert,
} from '@mui/material'
import {
  SwapHoriz as TransferIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import type { BankTransfer } from '../../../../backend/interfaces/Finance'

interface BankTransferFormProps {
  bankTransfer?: BankTransfer | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BankTransferForm: React.FC<BankTransferFormProps> = ({
  bankTransfer,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()

  const [formData, setFormData] = useState({
    entity_id: companyState.companyID || '',
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    currency: 'GBP',
    exchange_rate: undefined as number | undefined,
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    created_by: settingsState.auth?.uid || '',
  })

  const [exchangeRateEnabled, setExchangeRateEnabled] = useState(false)

  useEffect(() => {
    if (bankTransfer) {
      setFormData({
        entity_id: bankTransfer.entity_id || companyState.companyID || '',
        from_account_id: bankTransfer.from_account_id || '',
        to_account_id: bankTransfer.to_account_id || '',
        amount: bankTransfer.amount || 0,
        currency: bankTransfer.currency || 'GBP',
        exchange_rate: bankTransfer.exchange_rate,
        date: bankTransfer.date || new Date().toISOString().split('T')[0],
        description: bankTransfer.description || '',
        reference: bankTransfer.reference || '',
        status: bankTransfer.status || 'pending',
        created_by: bankTransfer.created_by || settingsState.auth?.uid || '',
      })
      setExchangeRateEnabled(!!bankTransfer.exchange_rate)
    }
  }, [bankTransfer, companyState.companyID, settingsState.auth?.uid])

  // Auto-detect currency from selected accounts
  useEffect(() => {
    if (formData.from_account_id) {
      const fromAccount = financeState.bankAccounts.find(a => a.id === formData.from_account_id)
      if (fromAccount) {
        setFormData(prev => ({ ...prev, currency: fromAccount.currency }))
      }
    }
  }, [formData.from_account_id, financeState.bankAccounts])

  // Check if accounts have different currencies
  useEffect(() => {
    if (formData.from_account_id && formData.to_account_id) {
      const fromAccount = financeState.bankAccounts.find(a => a.id === formData.from_account_id)
      const toAccount = financeState.bankAccounts.find(a => a.id === formData.to_account_id)
      
      if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
        setExchangeRateEnabled(true)
        // Get exchange rate from currencies
        const fromCurrency = financeState.currencies.find(c => c.code === fromAccount.currency)
        const toCurrency = financeState.currencies.find(c => c.code === toAccount.currency)
        
        if (fromCurrency && toCurrency && !formData.exchange_rate) {
          const rate = toCurrency.rate / fromCurrency.rate
          setFormData(prev => ({ ...prev, exchange_rate: rate }))
        }
      } else {
        setExchangeRateEnabled(false)
        setFormData(prev => ({ ...prev, exchange_rate: undefined }))
      }
    }
  }, [formData.from_account_id, formData.to_account_id, financeState.bankAccounts, financeState.currencies])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      exchange_rate: exchangeRateEnabled ? formData.exchange_rate : undefined,
      created_at: bankTransfer?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'
  const fromAccount = financeState.bankAccounts.find(a => a.id === formData.from_account_id)
  const toAccount = financeState.bankAccounts.find(a => a.id === formData.to_account_id)
  const hasDifferentCurrencies = fromAccount && toAccount && fromAccount.currency !== toAccount.currency

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Transfer Details" 
        icon={<TransferIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>From Account</InputLabel>
              <Select
                value={formData.from_account_id}
                onChange={(e) => handleChange('from_account_id', e.target.value)}
                label="From Account"
              >
                {financeState.bankAccounts
                  .filter(acc => acc.status === 'active')
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.bank}) - {account.currency} {account.balance.toLocaleString()}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {fromAccount && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Current Balance: {fromAccount.currency} {fromAccount.balance.toLocaleString()}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>To Account</InputLabel>
              <Select
                value={formData.to_account_id}
                onChange={(e) => handleChange('to_account_id', e.target.value)}
                label="To Account"
              >
                {financeState.bankAccounts
                  .filter(acc => acc.status === 'active' && acc.id !== formData.from_account_id)
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.bank}) - {account.currency} {account.balance.toLocaleString()}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {toAccount && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Current Balance: {toAccount.currency} {toAccount.balance.toLocaleString()}
              </Typography>
            )}
          </Grid>

          {hasDifferentCurrencies && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<InfoIcon />}>
                Different currencies detected. Exchange rate will be required.
                {formData.exchange_rate && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Rate: 1 {fromAccount?.currency} = {formData.exchange_rate.toFixed(4)} {toAccount?.currency}
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Transfer Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              required
              disabled={isReadOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              }}
              helperText={fromAccount && formData.amount > fromAccount.balance ? "Amount exceeds account balance" : ""}
              error={fromAccount ? formData.amount > fromAccount.balance : false}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Transfer Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {exchangeRateEnabled && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Exchange Rate"
                type="number"
                value={formData.exchange_rate || ''}
                onChange={(e) => handleChange('exchange_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={isReadOnly}
                helperText={`1 ${fromAccount?.currency} = ? ${toAccount?.currency}`}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., Transfer to savings account"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Reference"
              value={formData.reference}
              onChange={(e) => handleChange('reference', e.target.value)}
              disabled={isReadOnly}
              placeholder="Optional reference number"
            />
          </Grid>

          {mode === 'edit' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </FormSection>

      <FormSection 
        title="Transfer Summary" 
        icon={<InfoIcon />}
      >
        {fromAccount && toAccount && formData.amount > 0 && (
          <Box>
            <Typography variant="body2" gutterBottom>
              <strong>From:</strong> {fromAccount.name} ({fromAccount.currency})
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>To:</strong> {toAccount.name} ({toAccount.currency})
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Amount:</strong> {formData.currency} {formData.amount.toLocaleString()}
            </Typography>
            {formData.exchange_rate && (
              <Typography variant="body2" gutterBottom>
                <strong>Exchange Rate:</strong> {formData.exchange_rate.toFixed(4)}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              This transfer will create two journal entries (credit from account, debit to account).
            </Typography>
          </Box>
        )}
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!formData.from_account_id || !formData.to_account_id || formData.amount <= 0 || (fromAccount && formData.amount > fromAccount.balance)}
            style={{
              padding: '12px 24px',
              backgroundColor: (!formData.from_account_id || !formData.to_account_id || formData.amount <= 0 || (fromAccount && formData.amount > fromAccount.balance)) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!formData.from_account_id || !formData.to_account_id || formData.amount <= 0 || (fromAccount && formData.amount > fromAccount.balance)) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Transfer' : 'Create Transfer'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default BankTransferForm
