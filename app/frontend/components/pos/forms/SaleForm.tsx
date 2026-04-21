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
  Autocomplete,
} from '@mui/material'
import FormSection from '../../reusable/FormSection'
import type { Sale } from '../../../../backend/interfaces/POS'
import type { Product } from '../../../../backend/interfaces/Stock'

interface SaleFormProps {
  sale?: Sale | null
  mode: 'create' | 'edit' | 'view'
  products: Product[]
  onSave: (data: any) => void
  onCancel?: () => void
}

const SaleForm: React.FC<SaleFormProps> = ({
  sale,
  mode,
  products,
  onSave}) => {
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    paymentMethod: 'cash',
    customerName: 'Walk-in',
    terminalId: 'Staff',
    tableNumber: '',
    billId: ''
  })

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (sale) {
      setFormData({
        productId: sale.productId || '',
        productName: sale.productName || '',
        quantity: sale.quantity || 1,
        unitPrice: sale.unitPrice || 0,
        totalPrice: sale.totalPrice || 0,
        paymentMethod: sale.paymentMethod || 'cash',
        customerName: sale.customerName || 'Walk-in',
        terminalId: sale.terminalId || 'Staff',
        tableNumber: sale.tableNumber || '',
        billId: sale.billId || ''
      })
      
      // Find the selected product
      const product = products.find(p => p.id === sale.productId)
      if (product) {
        setSelectedProduct(product)
      }
    }
  }, [sale, products])

  const handleProductChange = (product: Product | null) => {
    setSelectedProduct(product)
    if (product) {
      const unitPrice = product.price || 0
      const totalPrice = unitPrice * formData.quantity
      
      setFormData(prev => ({
        ...prev,
        productId: product.id,
        productName: product.name,
        unitPrice: unitPrice,
        totalPrice: totalPrice
      }))
    }
  }

  const handleQuantityChange = (quantity: number) => {
    const totalPrice = formData.unitPrice * quantity
    setFormData(prev => ({
      ...prev,
      quantity: quantity,
      totalPrice: totalPrice
    }))
  }

  const handleUnitPriceChange = (unitPrice: number) => {
    const totalPrice = unitPrice * formData.quantity
    setFormData(prev => ({
      ...prev,
      unitPrice: unitPrice,
      totalPrice: totalPrice
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Product Information">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              value={selectedProduct}
              onChange={(_, value) => handleProductChange(value)}
              options={products}
              getOptionLabel={(option) => `${option.name} - £${option.price?.toFixed(2) || '0.00'}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  required
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              required
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Unit Price"
              type="number"
              value={formData.unitPrice}
              onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
              required
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Total Price"
              type="number"
              value={formData.totalPrice}
              disabled
              fullWidth
              inputProps={{ step: 0.01 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Sale Details">
        <Grid container spacing={2}>
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
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
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
          <Grid item xs={12} sm={6}>
            <TextField
              label="Table Number"
              value={formData.tableNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, tableNumber: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
        </Grid>
      </FormSection>

      {mode === 'view' && (
        <FormSection title="Transaction Information">
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Bill ID"
                value={formData.billId}
                disabled
                fullWidth
              />
            </Grid>
          </Grid>
        </FormSection>
      )}
    </Box>
  )
}

export default SaleForm
