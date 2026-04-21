"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useFinance } from '../../../../backend/context/FinanceContext'
import type { Bill, BillLineItem, Contact, RecurringSchedule } from '../../../../backend/interfaces/Finance'

interface BillCRUDFormProps {
  bill?: Bill | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BillCRUDForm: React.FC<BillCRUDFormProps> = ({
  bill,
  mode,
  onSave
}) => {
  const { state: financeState } = useFinance()

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    reference: '',
    description: '',
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'GBP',
    receiveDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    purchaseOrderNumber: '',
    isRecurring: false,
  })

  const [lineItems, setLineItems] = useState<BillLineItem[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Contact | null>(null)
  const [recurringSchedule, setRecurringSchedule] = useState<RecurringSchedule | null>(null)

  // Update form data when bill prop changes
  useEffect(() => {
    if (bill) {
      setFormData({
        supplierId: bill.supplierId || '',
        supplierName: bill.supplierName || '',
        reference: bill.reference || '',
        description: bill.description || '',
        subtotal: bill.subtotal || 0,
        taxAmount: bill.taxAmount || 0,
        totalAmount: bill.totalAmount || 0,
        currency: bill.currency || 'GBP',
        receiveDate: bill.receiveDate || new Date().toISOString().split("T")[0],
        dueDate: bill.dueDate || new Date().toISOString().split("T")[0],
        purchaseOrderNumber: bill.purchaseOrderNumber || '',
        isRecurring: !!bill.recurringSchedule,
      })
      setLineItems(bill.lineItems || [])
      setRecurringSchedule(bill.recurringSchedule || null)
      const supplier = financeState.contacts?.find(c => c.id === bill.supplierId && c.type === 'supplier')
      if (supplier) setSelectedSupplier(supplier)
    } else {
      // Set default due date (30 days from receive date)
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setFormData(prev => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split("T")[0],
      }))
    }
  }, [bill, financeState.contacts])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Auto-update supplier name when supplier is selected
    if (field === 'supplierId') {
      const supplier = financeState.contacts?.find(c => c.id === value && (c.type === 'supplier' || c.type === 'both'))
      if (supplier) {
        setFormData(prev => ({
          ...prev,
          supplierId: value,
          supplierName: supplier.name,
          currency: supplier.currency || prev.currency,
        }))
        setSelectedSupplier(supplier)
        // Set default payment terms from supplier if available
        if (supplier.paymentTerms && !bill) {
          const dueDate = new Date(formData.receiveDate)
          dueDate.setDate(dueDate.getDate() + supplier.paymentTerms)
          setFormData(prev => ({
            ...prev,
            dueDate: dueDate.toISOString().split("T")[0],
          }))
        }
      }
    }
  }

  const suppliers = financeState.contacts?.filter(c => c.type === 'supplier' || c.type === 'both') || []
  const accounts = financeState.accounts?.filter(a => 
    a.type === 'expense' || a.subType === 'expense' || a.subType === 'cost_of_goods_sold' || a.type === 'asset'
  ) || []
  const taxRates = financeState.taxRates?.length > 0 ? financeState.taxRates : [
    { id: 'vat_standard', name: 'Standard VAT', rate: 20, type: 'VAT' as const, isActive: true },
    { id: 'vat_reduced', name: 'Reduced VAT', rate: 5, type: 'VAT' as const, isActive: true },
    { id: 'vat_zero', name: 'Zero VAT', rate: 0, type: 'VAT' as const, isActive: true },
  ]
  const currencies = financeState.currencies?.length > 0 ? financeState.currencies : [
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1, isBase: true, lastUpdated: new Date().toISOString(), status: 'active' as const },
  ]

  const calculateLineItem = (item: BillLineItem): BillLineItem => {
    const lineTotal = item.quantity * item.unitPrice
    const taxAmount = lineTotal * (item.taxRate / 100)
    return {
      ...item,
      lineTotal,
      taxAmount,
    }
  }

  const calculateTotals = () => {
    let subtotal = 0
    let taxAmount = 0

    lineItems.forEach((item) => {
      const calculated = calculateLineItem(item)
      subtotal += calculated.lineTotal
      taxAmount += calculated.taxAmount
    })

    const totalAmount = subtotal + taxAmount

    return {
      subtotal,
      taxAmount,
      totalAmount,
    }
  }

  const totals = calculateTotals()

  // Update form totals when line items change
  useEffect(() => {
    const calculated = calculateTotals()
    setFormData(prev => ({
      ...prev,
      subtotal: calculated.subtotal,
      taxAmount: calculated.taxAmount,
      totalAmount: calculated.totalAmount,
    }))
  }, [lineItems])

  const handleAddLineItem = () => {
    // Use supplier's default account and tax rate if available
    const defaultAccountId = selectedSupplier?.defaultAccountId || accounts[0]?.id
    const defaultTaxRateId = selectedSupplier?.defaultTaxRateId
    const defaultTaxRate = defaultTaxRateId 
      ? taxRates.find(tr => tr.id === defaultTaxRateId) 
      : taxRates[0]
    
    const newItem: BillLineItem = {
      id: `line_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultTaxRate?.rate || 20,
      taxAmount: 0,
      lineTotal: 0,
      accountId: defaultAccountId,
    }
    setLineItems([...lineItems, newItem])
  }

  const handleUpdateLineItem = (index: number, field: keyof BillLineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate line item
    updated[index] = calculateLineItem(updated[index])
    
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!formData.supplierId) {
      alert('Please select a supplier')
      return
    }

    if (lineItems.length === 0 && formData.subtotal === 0) {
      alert('Please add line items or enter a subtotal')
      return
    }

    const billNumber = bill?.billNumber || `BILL-${Date.now()}`
    const calculatedTotals = lineItems.length > 0 ? calculateTotals() : {
      subtotal: formData.subtotal,
      taxAmount: formData.taxAmount,
      totalAmount: formData.totalAmount,
    }
    
    const submissionData = {
      billNumber,
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      reference: formData.reference,
      description: formData.description,
      lineItems: lineItems.length > 0 ? lineItems.map(calculateLineItem) : [],
      subtotal: calculatedTotals.subtotal,
      taxAmount: calculatedTotals.taxAmount,
      totalAmount: calculatedTotals.totalAmount,
      balance_due: calculatedTotals.totalAmount,
      balanceDue: calculatedTotals.totalAmount,
      currency: formData.currency,
      status: bill?.status || 'pending',
      receiveDate: formData.receiveDate,
      dueDate: formData.dueDate,
      purchaseOrderNumber: formData.purchaseOrderNumber,
      recurringSchedule: formData.isRecurring && recurringSchedule ? recurringSchedule : undefined,
      createdAt: bill?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Bill Information" 
        icon={<ReceiptIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(option) => option.name || option.id}
              value={selectedSupplier}
              onChange={(_, newValue) => {
                setSelectedSupplier(newValue)
                handleChange('supplierId', newValue?.id || '')
              }}
              disabled={isReadOnly}
              renderInput={(params) => (
                <TextField {...params} label="Supplier" required />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Reference/Invoice #"
              value={formData.reference}
              onChange={(e) => handleChange('reference', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., INV-2024-001"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Receive Date"
              type="date"
              value={formData.receiveDate}
              onChange={(e) => {
                handleChange('receiveDate', e.target.value)
                // Auto-update due date if not manually set
                if (!bill) {
                  const dueDate = new Date(e.target.value)
                  dueDate.setDate(dueDate.getDate() + 30)
                  handleChange('dueDate', dueDate.toISOString().split("T")[0])
                }
              }}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
              helperText="Date the bill was received"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
              helperText="Payment due date"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Purchase Order #"
              value={formData.purchaseOrderNumber}
              onChange={(e) => handleChange('purchaseOrderNumber', e.target.value)}
              disabled={isReadOnly}
              placeholder="Optional PO reference"
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
                {currencies.map((curr) => (
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
        title="Line Items" 
        icon={<DescriptionIcon />}
      >
        <Box sx={{ mb: 2 }}>
          {!isReadOnly && (
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddLineItem}
              variant="outlined"
              size="small"
            >
              Add Line Item
            </Button>
          )}
        </Box>
        {lineItems.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Account</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Tax Rate</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Total</TableCell>
                  {!isReadOnly && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Item description"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={item.accountId || ''}
                          onChange={(e) => handleUpdateLineItem(index, 'accountId', e.target.value)}
                          disabled={isReadOnly}
                        >
                          {accounts.map((acc) => (
                            <MenuItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 100 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={item.taxRate}
                          onChange={(e) =>
                            handleUpdateLineItem(index, 'taxRate', parseFloat(String(e.target.value)) || 0)
                          }
                          disabled={isReadOnly}
                        >
                          {taxRates.map((tax) => (
                            <MenuItem key={tax.id} value={tax.rate}>
                              {tax.name} ({tax.rate}%)
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      {formData.currency} {calculateLineItem(item).taxAmount.toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {formData.currency} {calculateLineItem(item).lineTotal.toFixed(2)}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveLineItem(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <Typography variant="body2">No line items added. Click "Add Line Item" to start.</Typography>
            {!isReadOnly && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Or enter amounts manually below
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </FormSection>

      {lineItems.length === 0 && (
        <FormSection 
          title="Amount Details (Manual Entry)" 
          icon={<DescriptionIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subtotal"
                type="number"
                value={formData.subtotal}
                onChange={(e) => handleChange('subtotal', parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tax Amount"
                type="number"
                value={formData.taxAmount}
                onChange={(e) => {
                  handleChange('taxAmount', parseFloat(e.target.value) || 0)
                  handleChange('totalAmount', formData.subtotal + (parseFloat(e.target.value) || 0))
                }}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </FormSection>
      )}

      <FormSection 
        title="Totals" 
        icon={<ReceiptIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: alpha(themeConfig.brandColors.navy, 0.04), 
              borderRadius: 1,
            }}>
              <Typography variant="caption" color="text.secondary">
                Subtotal
              </Typography>
              <Typography variant="h6">
                {formData.currency} {totals.subtotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: themeConfig.brandColors.navy,
              borderRadius: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="caption" sx={{ color: themeConfig.brandColors.offWhite }}>
                Total Amount
              </Typography>
              <Typography variant="h5" sx={{ color: themeConfig.brandColors.offWhite }} fontWeight="bold">
                {formData.currency} {totals.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe what this bill is for..."
            />
          </Grid>
        </Grid>
      </FormSection>

      {!bill && (
        <FormSection 
          title="Recurring Bill" 
          icon={<ReceiptIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isRecurring}
                    onChange={(e) => handleChange('isRecurring', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Make this a recurring bill"
              />
            </Grid>
            {formData.isRecurring && (
              <>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={recurringSchedule?.frequency || 'monthly'}
                      onChange={(e) => setRecurringSchedule({
                        ...(recurringSchedule || {
                          frequency: 'monthly',
                          interval: 1,
                          nextDate: formData.dueDate,
                          isActive: true,
                        }),
                        frequency: e.target.value as any,
                      })}
                      disabled={isReadOnly}
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Interval"
                    type="number"
                    value={recurringSchedule?.interval || 1}
                    onChange={(e) => setRecurringSchedule({
                      ...(recurringSchedule || {
                        frequency: 'monthly',
                        interval: 1,
                        nextDate: formData.dueDate,
                        isActive: true,
                      }),
                      interval: parseInt(e.target.value) || 1,
                    })}
                    disabled={isReadOnly}
                    inputProps={{ min: 1 }}
                    helperText="Every X periods"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="End Date (Optional)"
                    type="date"
                    value={recurringSchedule?.endDate || ''}
                    onChange={(e) => setRecurringSchedule({
                      ...(recurringSchedule || {
                        frequency: 'monthly',
                        interval: 1,
                        nextDate: formData.dueDate,
                        isActive: true,
                      }),
                      endDate: e.target.value || undefined,
                    })}
                    disabled={isReadOnly}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </FormSection>
      )}

      {bill && (
        <FormSection 
          title="Bill Status" 
          icon={<ReceiptIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Bill Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{bill.billNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      label={
                        bill.status
                          ? bill.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          : ""
                      }
                      color={
                        bill.status === 'paid' ? 'success' :
                        bill.status === 'approved' ? 'info' :
                        bill.status === 'overdue' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  </Box>
                </Box>
                {bill.balance_due !== undefined && bill.balance_due > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                    <Typography variant="body1" fontWeight="bold" color="error.main">
                      {bill.currency} {bill.balance_due.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                {bill.approvedBy && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Approved By</Typography>
                    <Typography variant="body2">{bill.approvedBy}</Typography>
                  </Box>
                )}
                {bill.approvedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Approved On</Typography>
                    <Typography variant="body2">
                      {new Date(bill.approvedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </FormSection>
      )}

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
            {mode === 'edit' ? 'Update Bill' : 'Create Bill'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default BillCRUDForm
