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
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Autocomplete,
} from '@mui/material'
import {
  Rule as RuleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import type { BankRule } from '../../../../backend/interfaces/Finance'

interface BankRuleCRUDFormProps {
  bankRule?: BankRule | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BankRuleCRUDForm: React.FC<BankRuleCRUDFormProps> = ({
  bankRule,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()

  const [formData, setFormData] = useState({
    name: '',
    entity_id: companyState.companyID || '',
    conditions: {
      description_contains: [] as string[],
      description_matches: '',
      amount_equals: undefined as number | undefined,
      amount_range: { min: undefined as number | undefined, max: undefined as number | undefined },
      reference_contains: [] as string[],
      type: undefined as 'debit' | 'credit' | undefined,
    },
    target_account: '',
    tax_rate_id: '',
    is_active: true,
    priority: 1,
  })

  const [newDescriptionContains, setNewDescriptionContains] = useState('')
  const [newReferenceContains, setNewReferenceContains] = useState('')

  useEffect(() => {
    if (bankRule) {
      setFormData({
        name: bankRule.name || '',
        entity_id: bankRule.entity_id || companyState.companyID || '',
        conditions: bankRule.conditions || {
          description_contains: [],
          description_matches: '',
          amount_equals: undefined,
          amount_range: { min: undefined, max: undefined },
          reference_contains: [],
          type: undefined,
        },
        target_account: bankRule.target_account || '',
        tax_rate_id: bankRule.tax_rate_id || '',
        is_active: bankRule.is_active ?? true,
        priority: bankRule.priority || 1,
      })
    }
  }, [bankRule, companyState.companyID])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('conditions.')) {
      const conditionField = field.replace('conditions.', '')
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          [conditionField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleAddDescriptionContains = () => {
    if (newDescriptionContains.trim()) {
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          description_contains: [...(prev.conditions.description_contains || []), newDescriptionContains.trim()]
        }
      }))
      setNewDescriptionContains('')
    }
  }

  const handleRemoveDescriptionContains = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        description_contains: (prev.conditions.description_contains || []).filter((_, i) => i !== index)
      }
    }))
  }

  const handleAddReferenceContains = () => {
    if (newReferenceContains.trim()) {
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          reference_contains: [...(prev.conditions.reference_contains || []), newReferenceContains.trim()]
        }
      }))
      setNewReferenceContains('')
    }
  }

  const handleRemoveReferenceContains = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        reference_contains: (prev.conditions.reference_contains || []).filter((_, i) => i !== index)
      }
    }))
  }

  const handleSubmit = () => {
    // Clean up undefined values
    const cleanedConditions: any = {}
    if (formData.conditions.description_contains && formData.conditions.description_contains.length > 0) {
      cleanedConditions.description_contains = formData.conditions.description_contains
    }
    if (formData.conditions.description_matches) {
      cleanedConditions.description_matches = formData.conditions.description_matches
    }
    if (formData.conditions.amount_equals !== undefined) {
      cleanedConditions.amount_equals = formData.conditions.amount_equals
    }
    if (formData.conditions.amount_range?.min !== undefined || formData.conditions.amount_range?.max !== undefined) {
      cleanedConditions.amount_range = {
        min: formData.conditions.amount_range.min,
        max: formData.conditions.amount_range.max,
      }
    }
    if (formData.conditions.reference_contains && formData.conditions.reference_contains.length > 0) {
      cleanedConditions.reference_contains = formData.conditions.reference_contains
    }
    if (formData.conditions.type) {
      cleanedConditions.type = formData.conditions.type
    }

    const submissionData = {
      ...formData,
      conditions: cleanedConditions,
      created_at: bankRule?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Bank Rule Information" 
        icon={<RuleIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Rule Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Match PayPal transactions"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Priority"
              type="number"
              value={formData.priority}
              onChange={(e) => handleChange('priority', parseInt(e.target.value) || 1)}
              disabled={isReadOnly}
              helperText="Higher priority rules are checked first"
              inputProps={{ min: 1, max: 100 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Matching Conditions" 
        icon={<RuleIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Description Contains (any of these)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {(formData.conditions.description_contains || []).map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  onDelete={isReadOnly ? undefined : () => handleRemoveDescriptionContains(index)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            {!isReadOnly && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Enter keyword..."
                  value={newDescriptionContains}
                  onChange={(e) => setNewDescriptionContains(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDescriptionContains()
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddDescriptionContains}
                >
                  Add
                </Button>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Description Matches (exact)"
              value={formData.conditions.description_matches || ''}
              onChange={(e) => handleChange('conditions.description_matches', e.target.value)}
              disabled={isReadOnly}
              placeholder="Exact description match"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={formData.conditions.type || ''}
                onChange={(e) => handleChange('conditions.type', e.target.value || undefined)}
                label="Transaction Type"
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="debit">Debit</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount Equals"
              type="number"
              value={formData.conditions.amount_equals || ''}
              onChange={(e) => handleChange('conditions.amount_equals', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={isReadOnly}
              placeholder="Exact amount"
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Min Amount"
              type="number"
              value={formData.conditions.amount_range?.min || ''}
              onChange={(e) => handleChange('conditions.amount_range', {
                ...formData.conditions.amount_range,
                min: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              disabled={isReadOnly}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Max Amount"
              type="number"
              value={formData.conditions.amount_range?.max || ''}
              onChange={(e) => handleChange('conditions.amount_range', {
                ...formData.conditions.amount_range,
                max: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              disabled={isReadOnly}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Reference Contains (any of these)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {(formData.conditions.reference_contains || []).map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  onDelete={isReadOnly ? undefined : () => handleRemoveReferenceContains(index)}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
            {!isReadOnly && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Enter reference..."
                  value={newReferenceContains}
                  onChange={(e) => setNewReferenceContains(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddReferenceContains()
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddReferenceContains}
                >
                  Add
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </FormSection>

      <FormSection 
        title="Target Account" 
        icon={<RuleIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Target GL Account</InputLabel>
              <Select
                value={formData.target_account}
                onChange={(e) => handleChange('target_account', e.target.value)}
                label="Target GL Account"
              >
                {financeState.accounts
                  .filter(acc => acc.type === 'expense' || acc.type === 'revenue')
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Tax Rate (Optional)</InputLabel>
              <Select
                value={formData.tax_rate_id}
                onChange={(e) => handleChange('tax_rate_id', e.target.value || '')}
                label="Tax Rate (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {financeState.taxRates.map((taxRate) => (
                  <MenuItem key={taxRate.id} value={taxRate.id}>
                    {taxRate.name} ({taxRate.rate}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            {mode === 'edit' ? 'Update Bank Rule' : 'Create Bank Rule'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default BankRuleCRUDForm
