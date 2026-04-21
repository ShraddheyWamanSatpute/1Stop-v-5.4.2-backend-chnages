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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
} from '@mui/material'
import {
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import type { Bill } from '../../../../backend/interfaces/POS'
import { useStock } from '../../../../backend/context/StockContext'
import type { Product } from '../../../../backend/interfaces/Stock'

interface BillItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

interface BillFormProps {
  bill?: Bill | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onCancel?: () => void
}

const BillForm: React.FC<BillFormProps> = ({
  bill,
  mode,
  onSave}) => {
  const { state: stockState } = useStock()
  const products = stockState.products || []

  const [formData, setFormData] = useState({
    tableNumber: '',
    server: 'System',
    customerName: 'Walk-in',
    status: 'Open',
    paymentMethod: 'cash',
    terminalId: 'Staff',
    notes: ''
  })

  const [items, setItems] = useState<BillItem[]>([])
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    serviceCharge: 0,
    total: 0
  })

  useEffect(() => {
    if (bill) {
      setFormData({
        tableNumber: bill.tableNumber || '',
        server: bill.server || 'System',
        customerName: bill.customerName || 'Walk-in',
        status: bill.status || 'Open',
        paymentMethod: bill.paymentMethod || 'cash',
        terminalId: bill.terminalId || 'Staff',
        notes: bill.notes || ''
      })
      
      // Convert bill items to form items
      const billItems: BillItem[] = (bill.items || []).map(item => ({
        id: item.id || item.productId || '',
        name: item.name || item.productName || '',
        quantity: item.quantity || 1,
        price: item.price || item.unitPrice || 0,
        total: item.total || item.totalPrice || 0
      }))
      
      setItems(billItems)
      setTotals({
        subtotal: bill.subtotal || 0,
        tax: bill.tax || 0,
        serviceCharge: bill.serviceCharge || 0,
        total: bill.total || 0
      })
    }
  }, [bill])

  useEffect(() => {
    // Recalculate totals when items change
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.2 // 20% VAT
    const serviceCharge = subtotal * 0.1 // 10% service charge
    const total = subtotal + tax + serviceCharge

    setTotals({
      subtotal,
      tax,
      serviceCharge,
      total
    })
  }, [items])

  const handleAddItem = (product: Product | null) => {
    if (product) {
      const newItem: BillItem = {
        id: product.id,
        name: product.name,
        quantity: 1,
        price: product.price || 0,
        total: product.price || 0
      }
      setItems([...items, newItem])
    }
  }

  const handleUpdateItem = (index: number, field: keyof BillItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate total for this item if quantity or price changed
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price
    }
    
    setItems(updatedItems)
  }

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const billData = {
      ...formData,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        unitPrice: item.price,
        total: item.total,
        totalPrice: item.total
      })),
      ...totals
    }
    
    onSave(billData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Bill Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Table Number"
              value={formData.tableNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, tableNumber: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Server"
              value={formData.server}
              onChange={(e) => setFormData(prev => ({ ...prev, server: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="contactless">Contactless</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="voucher">Voucher</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Terminal ID"
              value={formData.terminalId}
              onChange={(e) => setFormData(prev => ({ ...prev, terminalId: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Items">
        {!isReadOnly && (
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.name} - £${option.price?.toFixed(2) || '0.00'}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add Product"
                  placeholder="Search for a product to add..."
                />
              )}
              onChange={(_, value) => handleAddItem(value)}
              value={null}
            />
          </Box>
        )}
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Total</TableCell>
                {!isReadOnly && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">
                    {isReadOnly ? (
                      item.quantity
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1, style: { textAlign: 'right' } }}
                        sx={{ width: 80 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isReadOnly ? (
                      `£${item.price.toFixed(2)}`
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                        sx={{ width: 100 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">£{item.total.toFixed(2)}</TableCell>
                  {!isReadOnly && (
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No items added yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </FormSection>

      <FormSection title="Totals">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Subtotal"
              value={`£${totals.subtotal.toFixed(2)}`}
              disabled
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Tax (20%)"
              value={`£${totals.tax.toFixed(2)}`}
              disabled
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Service Charge (10%)"
              value={`£${totals.serviceCharge.toFixed(2)}`}
              disabled
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Total"
              value={`£${totals.total.toFixed(2)}`}
              disabled
              fullWidth
              sx={{
                '& .MuiInputBase-input': {
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }
              }}
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default BillForm