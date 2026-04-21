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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import type { OpeningBalance } from '../../../../backend/interfaces/Finance'

interface OpeningBalanceFormProps {
  onSave: (balances: Omit<OpeningBalance, "id" | "created_at" | "updated_at">[]) => void
}

const OpeningBalanceForm: React.FC<OpeningBalanceFormProps> = ({
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()

  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0])
  const [currency, setCurrency] = useState('GBP')
  const [balances, setBalances] = useState<Array<{
    account_id: string
    balance: number
  }>>([])

  const handleAddAccount = () => {
    setBalances(prev => [
      ...prev,
      {
        account_id: '',
        balance: 0,
      }
    ])
  }

  const handleRemoveAccount = (index: number) => {
    setBalances(prev => prev.filter((_, i) => i !== index))
  }

  const handleBalanceChange = (index: number, field: string, value: any) => {
    setBalances(prev => {
      const newBalances = [...prev]
      newBalances[index] = {
        ...newBalances[index],
        [field]: value
      }
      return newBalances
    })
  }

  const handleSubmit = () => {
    const openingBalances = balances
      .filter(b => b.account_id && b.balance !== 0)
      .map(b => ({
        entity_id: companyState.companyID || '',
        account_id: b.account_id,
        balance: b.balance,
        balance_date: balanceDate,
        currency,
        created_by: settingsState.auth?.uid || 'system',
      }))

    if (openingBalances.length === 0) {
      alert('Please add at least one account with a balance')
      return
    }

    onSave(openingBalances)
  }

  // Get accounts that don't have opening balances yet
  const accountsWithBalances = balances.map(b => b.account_id).filter(Boolean)
  const availableAccounts = financeState.accounts.filter(
    acc => !accountsWithBalances.includes(acc.id) && !acc.isSystemAccount
  )

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Opening Balance Information" 
        icon={<AccountBalanceIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Balance Date"
              type="date"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
              required
              InputLabelProps={{ shrink: true }}
              helperText="Date of the opening balance"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
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
        </Grid>
      </FormSection>

      <FormSection 
        title="Account Opening Balances" 
        icon={<AccountBalanceIcon />}
      >
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
          >
            Add Account
          </Button>
        </Box>

        {balances.length > 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Opening Balance</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balances.map((balance, index) => {
                  const account = financeState.accounts.find(a => a.id === balance.account_id)
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <FormControl fullWidth required>
                          <Select
                            value={balance.account_id}
                            onChange={(e) => handleBalanceChange(index, 'account_id', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">Select Account</MenuItem>
                            {availableAccounts.map((acc) => (
                              <MenuItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name} ({acc.type})
                              </MenuItem>
                            ))}
                            {account && (
                              <MenuItem value={account.id}>
                                {account.code} - {account.name} ({account.type})
                              </MenuItem>
                            )}
                          </Select>
                        </FormControl>
                        {account && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Current Balance: {currency} {account.balance.toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={balance.balance || ''}
                          onChange={(e) => handleBalanceChange(index, 'balance', parseFloat(e.target.value) || 0)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                          }}
                          inputProps={{ step: 0.01 }}
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveAccount(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {balances.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Click "Add Account" to set opening balances
            </Typography>
          </Box>
        )}
      </FormSection>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={balances.filter(b => b.account_id && b.balance !== 0).length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: balances.filter(b => b.account_id && b.balance !== 0).length === 0 ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: balances.filter(b => b.account_id && b.balance !== 0).length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Save Opening Balances
        </button>
      </Box>
    </Box>
  )
}

export default OpeningBalanceForm
