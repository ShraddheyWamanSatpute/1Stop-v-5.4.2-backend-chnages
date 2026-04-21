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
  Alert,
  Chip,
  Autocomplete,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import type { Journal, JournalLine } from '../../../../backend/interfaces/Finance'

interface ManualJournalFormProps {
  journal?: Journal | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const ManualJournalForm: React.FC<ManualJournalFormProps> = ({
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
    source: 'manual' as 'manual' | 'system' | 'opening_balance' | 'reversal' | 'adjustment',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'cancelled',
    journal_lines: [] as Omit<JournalLine, 'id' | 'journal_id' | 'created_at'>[],
    created_by: settingsState.auth?.uid || '',
  })

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
        journal_lines: journal.journal_lines.map(line => ({
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          tax_rate_id: line.tax_rate_id,
          dimension_ids: line.dimension_ids,
        })),
        created_by: journal.created_by || settingsState.auth?.uid || '',
      })
    }
  }, [journal, companyState.companyID, settingsState.auth?.uid])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddLine = () => {
    setFormData(prev => ({
      ...prev,
      journal_lines: [
        ...prev.journal_lines,
        {
          account_id: '',
          debit: 0,
          credit: 0,
          description: '',
          tax_rate_id: undefined,
          dimension_ids: undefined,
        }
      ]
    }))
  }

  const handleRemoveLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      journal_lines: prev.journal_lines.filter((_, i) => i !== index)
    }))
  }

  const handleLineChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      journal_lines: prev.journal_lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }))
  }

  const calculateTotals = () => {
    const totalDebit = formData.journal_lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = formData.journal_lines.reduce((sum, line) => sum + (line.credit || 0), 0)
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 }
  }

  const handleSubmit = () => {
    const { totalDebit, totalCredit, isBalanced } = calculateTotals()
    
    if (!isBalanced) {
      throw new Error(`Journal entries must balance. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`)
    }

    if (formData.journal_lines.length < 2) {
      throw new Error('Journal must have at least 2 lines')
    }

    const submissionData = {
      ...formData,
      total_debit: totalDebit,
      total_credit: totalCredit,
      journal_lines: formData.journal_lines.map(line => ({
        ...line,
        debit: line.debit || 0,
        credit: line.credit || 0,
      })),
      created_at: journal?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view' || formData.status === 'posted'
  const { totalDebit, totalCredit, isBalanced } = calculateTotals()
  const difference = Math.abs(totalDebit - totalCredit)

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Journal Information" 
        icon={<CalculateIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Journal Number"
              value={formData.journal_number}
              onChange={(e) => handleChange('journal_number', e.target.value)}
              disabled={isReadOnly || mode === 'edit'}
              placeholder="Auto-generated if left empty"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Journal Date"
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
              placeholder="e.g., Month-end adjustment"
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
                <MenuItem value="opening_balance">Opening Balance</MenuItem>
                <MenuItem value="reversal">Reversal</MenuItem>
                <MenuItem value="adjustment">Adjustment</MenuItem>
              </Select>
            </FormControl>
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
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="pending_approval">Pending Approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="posted">Posted</MenuItem>
                  <MenuItem value="reversed">Reversed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </FormSection>

      <FormSection 
        title="Journal Lines" 
        icon={<CalculateIcon />}
      >
        <Box sx={{ mb: 2 }}>
          {!isReadOnly && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddLine}
              sx={{ mb: 2 }}
            >
              Add Line
            </Button>
          )}

          {formData.journal_lines.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Tax Rate</TableCell>
                    {!isReadOnly && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.journal_lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {isReadOnly ? (
                          financeState.accounts.find(a => a.id === line.account_id)?.name || line.account_id
                        ) : (
                          <FormControl fullWidth size="small">
                            <InputLabel>Account</InputLabel>
                            <Select
                              value={line.account_id}
                              onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                              label="Account"
                            >
                              {financeState.accounts.map((account) => (
                                <MenuItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      <TableCell>
                        {isReadOnly ? (
                          <Typography align="right">£{line.debit.toFixed(2)}</Typography>
                        ) : (
                          <TextField
                            type="number"
                            size="small"
                            value={line.debit || ''}
                            onChange={(e) => {
                              const debit = parseFloat(e.target.value) || 0
                              handleLineChange(index, 'debit', debit)
                              if (debit > 0) {
                                handleLineChange(index, 'credit', 0)
                              }
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 120 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isReadOnly ? (
                          <Typography align="right">£{line.credit.toFixed(2)}</Typography>
                        ) : (
                          <TextField
                            type="number"
                            size="small"
                            value={line.credit || ''}
                            onChange={(e) => {
                              const credit = parseFloat(e.target.value) || 0
                              handleLineChange(index, 'credit', credit)
                              if (credit > 0) {
                                handleLineChange(index, 'debit', 0)
                              }
                            }}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 120 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isReadOnly ? (
                          line.description || '-'
                        ) : (
                          <TextField
                            size="small"
                            value={line.description || ''}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            placeholder="Line description"
                            fullWidth
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isReadOnly ? (
                          financeState.taxRates.find(t => t.id === line.tax_rate_id)?.name || '-'
                        ) : (
                          <FormControl fullWidth size="small">
                            <InputLabel>Tax</InputLabel>
                            <Select
                              value={line.tax_rate_id || ''}
                              onChange={(e) => handleLineChange(index, 'tax_rate_id', e.target.value || undefined)}
                              label="Tax"
                            >
                              <MenuItem value="">None</MenuItem>
                              {financeState.taxRates.map((taxRate) => (
                                <MenuItem key={taxRate.id} value={taxRate.id}>
                                  {taxRate.name} ({taxRate.rate}%)
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLine(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {formData.journal_lines.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Debit
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    £{totalDebit.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Credit
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    £{totalCredit.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  {isBalanced ? (
                    <Alert severity="success" icon={<InfoIcon />}>
                      Journal is balanced
                    </Alert>
                  ) : (
                    <Alert severity="error" icon={<InfoIcon />}>
                      Journal is not balanced. Difference: £{difference.toFixed(2)}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isBalanced || formData.journal_lines.length < 2}
            style={{
              padding: '12px 24px',
              backgroundColor: (!isBalanced || formData.journal_lines.length < 2) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isBalanced || formData.journal_lines.length < 2) ? 'not-allowed' : 'pointer',
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

export default ManualJournalForm
