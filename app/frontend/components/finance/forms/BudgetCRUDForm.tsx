"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react'
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
  LinearProgress,
  Chip,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import type { Budget } from '../../../../backend/interfaces/Finance'
import { useCompany } from '../../../../backend/context/CompanyContext'

interface BudgetCRUDFormProps {
  budget?: Budget | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface BudgetCRUDFormRef {
  submit: () => void | Promise<void>
}

const BudgetCRUDForm = forwardRef<BudgetCRUDFormRef, BudgetCRUDFormProps>(({
  budget,
  mode,
  onSave
}, ref) => {
  const { state: companyState } = useCompany()
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    budgetType: 'custom' as 'total labour' | 'salaried labour' | 'hourly labour' | 'freelance' | 'stock purchasing' | 'stock holding' | 'custom',
    period_type: 'monthly' as 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly',
    period_start: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    budgeted: 0,
    actual: 0,
  })
  const [isCalculatingActual, setIsCalculatingActual] = useState(false)

  // Calculate period_end based on period_type and period_start
  const calculatePeriodEnd = (startDate: string, periodType: string): string => {
    const start = new Date(startDate)
    const end = new Date(start)
    
    switch (periodType) {
      case 'weekly':
        end.setDate(end.getDate() + 7)
        break
      case 'bi-weekly':
        end.setDate(end.getDate() + 14)
        break
      case 'monthly':
        end.setMonth(end.getMonth() + 1)
        break
      case 'quarterly':
        end.setMonth(end.getMonth() + 3)
        break
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1)
        break
      default:
        end.setMonth(end.getMonth() + 1)
    }
    
    return end.toISOString().split('T')[0]
  }

  // Update form data when budget prop changes
  useEffect(() => {
    if (budget) {
      // Handle period_type - check if it exists, otherwise try to infer from period string
      let validPeriodType: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
      if (budget.period_type) {
        validPeriodType = ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'].includes(budget.period_type as string) 
          ? (budget.period_type as 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly')
          : 'monthly'
      } else if (budget.period) {
        // Try to infer from period string (for backward compatibility)
        const periodLower = budget.period.toLowerCase()
        if (periodLower.includes('week')) {
          validPeriodType = periodLower.includes('bi') ? 'bi-weekly' : 'weekly'
        } else if (periodLower.includes('month')) {
          validPeriodType = 'monthly'
        } else if (periodLower.includes('quarter')) {
          validPeriodType = 'quarterly'
        } else if (periodLower.includes('year')) {
          validPeriodType = 'yearly'
        }
      }
      
      // Ensure budgetType is valid
      const validBudgetType: 'total labour' | 'salaried labour' | 'hourly labour' | 'freelance' | 'stock purchasing' | 'stock holding' | 'custom' =
        budget.budgetType && ['total labour', 'salaried labour', 'hourly labour', 'freelance', 'stock purchasing', 'stock holding', 'custom'].includes(budget.budgetType as string)
          ? (budget.budgetType as 'total labour' | 'salaried labour' | 'hourly labour' | 'freelance' | 'stock purchasing' | 'stock holding' | 'custom')
          : 'custom'
      
      setFormData({
        name: budget.name || budget.category || 'Unnamed Budget',
        budgetType: validBudgetType,
        period_type: validPeriodType,
        period_start: budget.period_start || new Date().toISOString().split('T')[0],
        budgeted: budget.budgeted || 0,
        actual: budget.actual || 0,
      })
    }
  }, [budget])

  // Calculate actual spent from HR/Stock data based on budget type
  // This function will be configured to pull real data from:
  // - HR Scheduling: For 'total labour', 'salaried labour', 'hourly labour', 'freelance'
  //   * Calculate from scheduled shifts within the budget period
  //   * Sum employee wages based on employment type (salaried/hourly/freelance)
  // - Stock Section: For 'stock purchasing', 'stock holding'
  //   * Stock purchasing: Sum of purchase orders within period
  //   * Stock holding: Calculate inventory holding costs
  const calculateActualFromData = useCallback(async (
    budgetType: string,
    periodStart: string,
    periodEnd: string
  ): Promise<number> => {
    // TODO: Implement actual data fetching from HR and Stock sections
    // Placeholder implementation - returns 0 until configured
    
    switch (budgetType) {
      case 'total labour':
        // TODO: Sum all labour costs from HR scheduling (salaried + hourly + freelance)
        // Fetch scheduled shifts from HR section for the period
        // Calculate: sum of all employee wages for shifts within period
        return 0
        
      case 'salaried labour':
        // TODO: Sum salaried employee costs from HR scheduling
        // Fetch salaried employees' scheduled shifts for the period
        // Calculate: sum of salaried employee fixed costs (pro-rated for period)
        return 0
        
      case 'hourly labour':
        // TODO: Sum hourly employee costs from HR scheduling
        // Fetch hourly employees' scheduled shifts for the period
        // Calculate: sum of (hours worked * hourly rate) for all hourly employees
        return 0
        
      case 'freelance':
        // TODO: Sum freelance costs from HR scheduling
        // Fetch freelance employee costs for the period
        // Calculate: sum of freelance payments/contracts within period
        return 0
        
      case 'stock purchasing':
        // TODO: Sum purchase orders from Stock section
        // Fetch purchase orders within the period
        // Calculate: sum of purchase order totals within period
        return 0
        
      case 'stock holding':
        // TODO: Calculate inventory holding costs from Stock section
        // Fetch inventory data and calculate holding costs
        // Calculate: inventory value * holding cost rate for the period
        return 0
        
      case 'custom':
      default:
        // Custom budgets use manual entry - return current value
        return formData.actual
    }
  }, [formData.actual])

  // Recalculate actual when budget type or period changes (for non-custom budgets)
  // Only recalculate if budget type changed or period changed, not on initial load
  const prevBudgetTypeRef = useRef<string>(formData.budgetType)
  const prevPeriodRef = useRef<string>(`${formData.period_start}-${formData.period_type}`)
  
  useEffect(() => {
    const currentPeriod = `${formData.period_start}-${formData.period_type}`
    const budgetTypeChanged = prevBudgetTypeRef.current !== formData.budgetType
    const periodChanged = prevPeriodRef.current !== currentPeriod
    
    // Only recalculate if budget type or period changed (not on initial mount)
    if (formData.budgetType !== 'custom' && formData.period_start && (budgetTypeChanged || periodChanged)) {
      setIsCalculatingActual(true)
      const periodEnd = calculatePeriodEnd(formData.period_start, formData.period_type)
      calculateActualFromData(formData.budgetType, formData.period_start, periodEnd)
        .then(calculatedActual => {
          setFormData(prev => ({
            ...prev,
            actual: calculatedActual
          }))
        })
        .catch(error => {
          console.error('Error calculating actual spent:', error)
          // Keep existing actual value on error
        })
        .finally(() => {
          setIsCalculatingActual(false)
        })
    }
    
    // Update refs
    prevBudgetTypeRef.current = formData.budgetType
    prevPeriodRef.current = currentPeriod
  }, [formData.budgetType, formData.period_type, formData.period_start, calculateActualFromData])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const submit = useCallback(() => {
    const budgeted = parseFloat(String(formData.budgeted))
    const actual = parseFloat(String(formData.actual))
    const remaining = budgeted - actual
    const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0
    
    // Calculate period_end
    const period_end = calculatePeriodEnd(formData.period_start, formData.period_type)
    
    // Format period string for display
    const periodString = `${formData.period_type.charAt(0).toUpperCase() + formData.period_type.slice(1)} (${formData.period_start} to ${period_end})`
    
    const submissionData = {
      name: formData.name,
      budgetType: formData.budgetType,
      period_type: formData.period_type,
      period_start: formData.period_start,
      period_end: period_end,
      period: periodString,
      budgeted,
      actual,
      remaining,
      percentage,
      status: percentage > 100 ? 'over-budget' : percentage >= 80 ? 'near-limit' : 'under-budget',
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  const isReadOnly = mode === 'view'
  
  const budgeted = parseFloat(String(formData.budgeted)) || 0
  const actual = parseFloat(String(formData.actual)) || 0
  const remaining = budgeted - actual
  const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0

  // History data - show budget updates and progress
  const historyData = budget ? [
    {
      date: budget.updated_at || budget.created_at || new Date().toISOString(),
      action: 'Updated',
      budgeted: budget.budgeted,
      actual: budget.actual,
      remaining: budget.remaining,
      percentage: budget.percentage,
      status: budget.status,
    },
    ...(budget.created_at && budget.created_at !== budget.updated_at ? [{
      date: budget.created_at,
      action: 'Created',
      budgeted: budget.budgeted,
      actual: 0,
      remaining: budget.budgeted,
      percentage: 0,
      status: 'under-budget' as const,
    }] : []),
  ] : []

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Budget Information" icon={<AccountBalanceIcon />} iconPosition="start" />
          <Tab label="Budget History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <FormSection 
          title="Budget Information" 
          icon={<AccountBalanceIcon />}
        >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Budget Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Q1 2024 Labour Budget"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Budget Type</InputLabel>
              <Select
                value={formData.budgetType}
                onChange={(e) => handleChange('budgetType', e.target.value)}
                label="Budget Type"
              >
                <MenuItem value="total labour">Total Labour</MenuItem>
                <MenuItem value="salaried labour">Salaried Labour</MenuItem>
                <MenuItem value="hourly labour">Hourly Labour</MenuItem>
                <MenuItem value="freelance">Freelance</MenuItem>
                <MenuItem value="stock purchasing">Stock Purchasing</MenuItem>
                <MenuItem value="stock holding">Stock Holding</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Period</InputLabel>
              <Select
                value={formData.period_type}
                onChange={(e) => handleChange('period_type', e.target.value)}
                label="Period"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.period_start}
              onChange={(e) => handleChange('period_start', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Budget period start date"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Budget Amount"
              type="number"
              value={formData.budgeted}
              onChange={(e) => handleChange('budgeted', e.target.value)}
              required
              disabled={isReadOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">£</InputAdornment>,
              }}
              helperText="Total budgeted amount for this period"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Actual Spent"
              type="number"
              value={formData.actual}
              onChange={(e) => handleChange('actual', e.target.value)}
              disabled={isReadOnly || formData.budgetType !== 'custom' || isCalculatingActual}
              InputProps={{
                startAdornment: <InputAdornment position="start">£</InputAdornment>,
              }}
              helperText={
                isCalculatingActual 
                  ? 'Calculating from data...' 
                  : formData.budgetType !== 'custom'
                    ? formData.budgetType === 'total labour' || formData.budgetType === 'salaried labour' || formData.budgetType === 'hourly labour' || formData.budgetType === 'freelance'
                      ? 'Calculated from HR scheduling data'
                      : 'Calculated from Stock section data'
                    : 'Amount actually spent so far (editable for custom budgets)'
              }
            />
          </Grid>
          {formData.period_start && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={calculatePeriodEnd(formData.period_start, formData.period_type)}
                disabled
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Calculated based on period type"
              />
            </Grid>
          )}
        </Grid>
      </FormSection>
      )}

      {tabValue === 1 && (
        <FormSection 
          title="Budget History" 
          icon={<HistoryIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Progress
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {percentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(percentage, 100)} 
                  color={
                    percentage > 100 ? 'error' :
                    percentage >= 80 ? 'warning' : 'success'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Budgeted</Typography>
                  <Typography variant="h6" sx={{ color: themeConfig.brandColors.navy }}>
                    £{budgeted.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Actual</Typography>
                  <Typography variant="h6" color={percentage > 100 ? 'error.main' : 'success.main'}>
                    £{actual.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Remaining</Typography>
                  <Typography variant="h6" color={remaining < 0 ? 'error.main' : 'text.primary'}>
                    £{remaining.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={
                        percentage > 100 ? 'Over Budget' :
                        percentage >= 80 ? 'Near Limit' : 'On Track'
                      }
                      color={
                        percentage > 100 ? 'error' :
                        percentage >= 80 ? 'warning' : 'success'
                      }
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Budget Timeline
              </Typography>
              {historyData.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell align="right">Budgeted</TableCell>
                        <TableCell align="right">Actual</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell align="right">% Used</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyData.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(entry.date).toLocaleString()}
                          </TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell align="right">£{entry.budgeted.toLocaleString()}</TableCell>
                          <TableCell align="right">£{entry.actual.toLocaleString()}</TableCell>
                          <TableCell align="right">£{entry.remaining.toLocaleString()}</TableCell>
                          <TableCell align="right">{entry.percentage.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Chip
                              label={entry.status.replace('-', ' ')}
                              size="small"
                              color={
                                entry.status === 'over-budget' ? 'error' :
                                entry.status === 'near-limit' ? 'warning' : 'success'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No history available yet. History will be tracked as the budget is updated.
                  </Typography>
                </Box>
              )}
            </Grid>
            {budget && (
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Budget Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Created</Typography>
                      <Typography variant="body2">
                        {budget.created_at ? new Date(budget.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                      <Typography variant="body2">
                        {budget.updated_at ? new Date(budget.updated_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Period Start</Typography>
                      <Typography variant="body2">
                        {budget.period_start ? new Date(budget.period_start).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Period End</Typography>
                      <Typography variant="body2">
                        {budget.period_end ? new Date(budget.period_end).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}

    </Box>
  )
})

BudgetCRUDForm.displayName = 'BudgetCRUDForm'

export default BudgetCRUDForm
