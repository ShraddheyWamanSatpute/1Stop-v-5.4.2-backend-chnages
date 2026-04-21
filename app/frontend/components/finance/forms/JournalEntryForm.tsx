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
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  InputAdornment,
  Autocomplete,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import type { Journal, JournalLine } from '../../../../backend/interfaces/Finance'

interface JournalEntryFormProps {
  journal?: Journal | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  journal,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()

  const [formData, setFormData] = useState({
    entity_id: companyState.companyID || '',
    journal_number: '',
    source: 'manual' as 'manual' | 'system' | 'recurring' | 'reversal' | 'opening_balance',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled',
    currency: 'GBP',
    exchange_rate: undefined as number | undefined,
    is_recurring: false,
    notes: '',
  })

  const [journalLines, setJournalLines] = useState<Omit<JournalLine, "id" | "journal_id" | "created_at" | "line_number">[]>([])

  useEffect(() => {
    if (journal) {
      setFormData({
        entity_id: journal.entity_id || companyState.companyID || '',
        journal_number: journal.journal_number || '',
        source: journal.source || 'manual',
        date: journal.date || new Date().toISOString().split('T')[0],
        description: journal.description || '',
        reference: journal.reference || '',
        status: journal.status || 'draft',
        currency: journal.currency || 'GBP',
        exchange_rate: journal.exchange_rate,
        is_recurring: journal.is_recurring || false,
        notes: journal.notes || '',
      })
      setJournalLines(journal.journal_lines.map(line => ({
        account_id: line.account_id,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        tax_rate_id: line.tax_rate_id,
        dimension_ids: line.dimension_ids,
      })))
    } else {
      // Add initial empty line
      setJournalLines([{
        account_id: '',
        description: '',
        debit: 0,
        credit: 0,
      }])
    }
  }, [journal, companyState.companyID])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...journalLines]
    newLines[index] = {
      ...newLines[index],
      [field]: value
    }
    // If debit is set, clear credit and vice versa
    if (field === 'debit' && value > 0) {
      newLines[index].credit = 0
    } else if (field === 'credit' && value > 0) {
      newLines[index].debit = 0
    }
    setJournalLines(newLines)
  }

  const handleAddLine = () => {
    setJournalLines([...journalLines, {
      account_id: '',
      description: '',
      debit: 0,
      credit: 0,
    }])
  }

  const handleRemoveLine = (index: number) => {
    if (journalLines.length > 1) {
      setJournalLines(journalLines.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const totalDebit = journalLines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = journalLines.reduce((sum, line) => sum + (line.credit || 0), 0)
    return { totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit), isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 }
  }

  const handleSubmit = () => {
    const { totalDebit, totalCredit, isBalanced } = calculateTotals()
    
    if (!isBalanced) {
      alert('Journal is not balanced. Total debits must equal total credits.')
      return
    }

    if (journalLines.length < 2) {
      alert('Journal must have at least 2 lines.')
      return
    }

    const linesWithNumbers: JournalLine[] = journalLines.map((line, index) => ({
      ...line,
      id: '', // Will be set by backend
      journal_id: journal?.id || '', // Will be set by backend
      line_number: index + 1,
      created_at: new Date().toISOString(),
    }))

    const submissionData = {
      ...formData,
      journal_lines: linesWithNumbers,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      created_by: settingsState.auth?.uid || 'system',
      created_at: journal?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'
  const { totalDebit, totalCredit, difference, isBalanced } = calculateTotals()

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection title="Journal Header" icon={<CheckCircleIcon />}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Journal Number"
              value={formData.journal_number}
              onChange={(e) => handleChange('journal_number', e.target.value)}
              required
              disabled={isReadOnly || !!journal}
              placeholder="Auto-generated if empty"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Monthly accrual adjustment"
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
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Source</InputLabel>
              <Select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                label="Source"
              >
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="system">System Generated</MenuItem>
                <MenuItem value="recurring">Recurring</MenuItem>
                <MenuItem value="reversal">Reversal</MenuItem>
                <MenuItem value="opening_balance">Opening Balance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Journal Lines" icon={<CheckCircleIcon />}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Journal Lines</Typography>
            {!isReadOnly && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddLine}
              >
                Add Line
              </Button>
            )}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell>Tax Rate</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journalLines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <FormControl fullWidth size="small" disabled={isReadOnly}>
                        <Select
                          value={line.account_id}
                          onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Select Account</MenuItem>
                          {financeState.accounts.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={line.description || ''}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Line description"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={line.debit || 0}
                        onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                        disabled={isReadOnly}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                        }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={line.credit || 0}
                        onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                        disabled={isReadOnly}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                        }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small" disabled={isReadOnly}>
                        <Select
                          value={line.tax_rate_id || ''}
                          onChange={(e) => handleLineChange(index, 'tax_rate_id', e.target.value || undefined)}
                          displayEmpty
                        >
                          <MenuItem value="">None</MenuItem>
                          {financeState.taxRates.map((taxRate) => (
                            <MenuItem key={taxRate.id} value={taxRate.id}>
                              {taxRate.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {!isReadOnly && journalLines.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveLine(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">Total Debit:</Typography>
              <Typography variant="body2" fontWeight="bold">{formData.currency} {totalDebit.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">Total Credit:</Typography>
              <Typography variant="body2" fontWeight="bold">{formData.currency} {totalCredit.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" fontWeight="medium">Difference:</Typography>
              <Chip
                label={formData.currency + ' ' + difference.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                color={isBalanced ? 'success' : 'error'}
                size="small"
                icon={isBalanced ? <CheckCircleIcon /> : <WarningIcon />}
              />
            </Box>
          </Box>

          {!isBalanced && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Journal is not balanced. Total debits ({formData.currency} {totalDebit.toLocaleString()}) must equal total credits ({formData.currency} {totalCredit.toLocaleString()}).
            </Alert>
          )}
        </Box>
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isBalanced || journalLines.length < 2}
            style={{
              padding: '12px 24px',
              backgroundColor: (!isBalanced || journalLines.length < 2) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isBalanced || journalLines.length < 2) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Journal' : 'Create Journal'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default JournalEntryForm
