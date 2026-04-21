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
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material'
import FormSection from '../../reusable/FormSection'
import { useStock } from '../../../../backend/context/StockContext'
import type { Product } from '../../../../backend/context/StockContext'

interface ProductFormProps {
  open?: boolean
  onClose?: () => void
  product?: Product | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onCancel?: () => void
}

const ProductForm: React.FC<ProductFormProps> = ({

  product,
  mode,
  onSave,

}) => {
  const { state: stockState } = useStock()
  const { suppliers, measures, categories, subCategories, salesDivisions, courses } = stockState

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    subCategory: '',
    salesDivision: '',
    course: '',
    type: 'product',
    purchaseSupplier: '',
    salesMeasure: '',
    purchaseMeasure: '',
    baseUnit: '',
    quantityOfBaseUnits: 1,
    purchasePrice: 0,
    price: 0,
    costPerBaseUnit: 0,
    profitPerBaseUnit: 0,
    profitForSalesMeasure: 0,
    profitMargin: 0,
    parLevel: 0,
    currentStock: 0,
    active: true,
    featured: false
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        salesDivision: product.salesDivision || '',
        course: product.course || '',
        type: product.type || 'product',
        purchaseSupplier: product.purchaseSupplier || '',
        salesMeasure: product.salesMeasure || '',
        purchaseMeasure: product.purchaseMeasure || '',
        baseUnit: product.baseUnit || '',
        quantityOfBaseUnits: product.quantityOfBaseUnits || 1,
        purchasePrice: product.purchasePrice || 0,
        price: product.price || 0,
        costPerBaseUnit: product.costPerBaseUnit || 0,
        profitPerBaseUnit: product.profitPerBaseUnit || 0,
        profitForSalesMeasure: product.profitForSalesMeasure || 0,
        profitMargin: product.profitMargin || 0,
        parLevel: product.parLevel || 0,
        currentStock: product.currentStock || 0,
        active: product.active !== false,
        featured: product.featured || false
      })
    }
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Basic Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Barcode"
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                disabled={isReadOnly}
              >
                <MenuItem value="product">Product</MenuItem>
                <MenuItem value="service">Service</MenuItem>
                <MenuItem value="bundle">Bundle</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Categories">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={categories?.find(c => c.id === formData.category) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, category: value?.id || '' }))}
              options={categories || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={subCategories?.find((sc: any) => sc.id === formData.subCategory) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, subCategory: value?.id || '' }))}
              options={subCategories || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sub Category"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={salesDivisions?.find(sd => sd.id === formData.salesDivision) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, salesDivision: value?.id || '' }))}
              options={salesDivisions || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sales Division"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={courses?.find((c: any) => c.id === formData.course) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, course: value?.id || '' }))}
              options={courses || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Course"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Supplier & Measures">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={suppliers?.find(s => s.id === formData.purchaseSupplier) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, purchaseSupplier: value?.id || '' }))}
              options={suppliers || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Purchase Supplier"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={measures?.find(m => m.id === formData.salesMeasure) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, salesMeasure: value?.id || '' }))}
              options={measures || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sales Measure"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={measures?.find(m => m.id === formData.purchaseMeasure) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, purchaseMeasure: value?.id || '' }))}
              options={measures || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Purchase Measure"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={measures?.find(m => m.id === formData.baseUnit) || null}
              onChange={(_, value) => setFormData(prev => ({ ...prev, baseUnit: value?.id || '' }))}
              options={measures || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Base Unit"
                  disabled={isReadOnly}
                  fullWidth
                />
              )}
              disabled={isReadOnly}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Pricing & Stock">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Sales Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Current Stock"
              type="number"
              value={formData.currentStock}
              onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Par Level"
              type="number"
              value={formData.parLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, parLevel: parseInt(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Quantity of Base Units"
              type="number"
              value={formData.quantityOfBaseUnits}
              onChange={(e) => setFormData(prev => ({ ...prev, quantityOfBaseUnits: parseInt(e.target.value) || 1 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Profit Margin %"
              type="number"
              value={formData.profitMargin}
              disabled
              fullWidth
              inputProps={{ step: 0.01 }}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection title="Settings">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Active"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Featured"
            />
          </Grid>
        </Grid>
      </FormSection>
    </Box>
  )
}

export default ProductForm
