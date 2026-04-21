"use client"

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  Alert,
  Divider,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import { useStock } from "../../../../backend/context/StockContext"
import type { Purchase, PurchaseItem } from "../../../../backend/interfaces/Stock"

interface PurchaseOrderFormProps {
  purchase?: Purchase | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: Purchase) => void
}

export interface PurchaseOrderFormRef {
  submit: () => void
}

const PurchaseOrderForm = forwardRef<PurchaseOrderFormRef, PurchaseOrderFormProps>(({
  purchase,
  mode,
  onSave,
}, ref) => {
  const { state: stockState, refreshProducts } = useStock()
  const { products, suppliers, measures } = stockState

  const [purchaseData, setPurchaseData] = useState<Purchase>({
    supplier: "",
    dateUK: new Date().toISOString().split("T")[0],
    status: "Awaiting Submission",
    totalTax: 0,
    totalValue: 0,
    invoiceNumber: "",
    items: [],
  })

  const [applySupplierToAll] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    supplier?: string
    items?: string
  }>({})

  // Ensure products are loaded when form mounts
  useEffect(() => {
    if (products.length === 0) {
      refreshProducts().catch(err => console.warn('Failed to refresh products:', err))
    }
  }, [products.length, refreshProducts])

  // Load purchase data when editing - enrich items with product/measure data
  useEffect(() => {
    if (purchase && mode !== 'create') {
      // Enrich items with product and measure names
      const enrichedItems = (purchase.items || []).map(item => {
        const productId = item.productId || item.itemID || ""
        const product = products.find(p => p.id === productId)
        const measure = measures.find(m => m.id === (item.measureId || ""))
        
        return {
          ...item,
          productId: productId || item.productId || "",
          itemID: productId || item.itemID || "",
          productName: product?.name || item.productName || item.name || "",
          name: product?.name || item.name || item.productName || "",
          measureId: item.measureId || "",
          measureName: measure?.name || item.measureName || "",
        }
      })
      
      setPurchaseData({
        ...purchase,
        dateUK: purchase.deliveryDate || purchase.dateUK || new Date().toISOString().split("T")[0],
        deliveryDate: purchase.deliveryDate || purchase.dateUK || new Date().toISOString().split("T")[0],
        items: enrichedItems,
      })
    }
  }, [purchase, mode, products, measures])

  const isReadOnly = mode === 'view'

  // Add a new purchase item
  const addPurchaseItem = () => {
    setPurchaseData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          productName: "",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          itemID: "",
          name: "",
          supplierId: applySupplierToAll ? prev.supplier : "",
          measureId: "",
          measureName: "",
          taxPercent: 20,
          priceExcludingVAT: 0,
          taxAmount: 0,
          salesDivisionId: "",
          categoryId: "",
          subcategoryId: "",
          type: "",
        },
      ],
    }))
  }

  // Update a purchase item
  const updatePurchaseItem = (index: number, changes: Partial<PurchaseItem>) => {
    setPurchaseData((prev) => {
      const updatedItems = [...prev.items]
      updatedItems[index] = { ...updatedItems[index], ...changes }

      // Recalculate totals
      const quantity = updatedItems[index].quantity || 0
      const unitPrice = updatedItems[index].unitPrice || 0
      const taxPercent = updatedItems[index].taxPercent || 0

      const totalPrice = quantity * unitPrice
      const taxAmount = (totalPrice * taxPercent) / (100 + taxPercent)
      const priceExcludingVAT = totalPrice - taxAmount

      updatedItems[index] = {
        ...updatedItems[index],
        totalPrice,
        taxAmount,
        priceExcludingVAT,
      }

      // Update purchase totals
      const newTotalTax = updatedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
      const newTotalValue = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      return {
        ...prev,
        items: updatedItems,
        totalTax: newTotalTax,
        totalValue: newTotalValue,
      }
    })
  }

  // Remove a purchase item
  const removePurchaseItem = (index: number) => {
    setPurchaseData((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index)
      
      // Recalculate totals
      const newTotalTax = updatedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
      const newTotalValue = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      return {
        ...prev,
        items: updatedItems,
        totalTax: newTotalTax,
        totalValue: newTotalValue,
      }
    })
  }

  // Helper function to get available purchase measures for a specific product
  const getAvailablePurchaseMeasures = (productId: string) => {
    if (!productId || !products || !measures) return []
    
    const product = products.find(p => p.id === productId)
    if (!product) return []
    
    // Get measure IDs from purchase units array
    let purchaseMeasureIds: string[] = []
    
    if (product.purchase?.units && Array.isArray(product.purchase.units)) {
      purchaseMeasureIds = product.purchase.units.map(unit => unit.measure).filter(Boolean)
    } else if (product.purchase?.defaultMeasure) {
      // Fallback to default measure if units array doesn't exist
      purchaseMeasureIds = [product.purchase.defaultMeasure]
    }
    
    // Filter measures to only include those available for purchase
    return measures.filter(measure => purchaseMeasureIds.includes(measure.id))
  }

  // Handle product selection - get data based on selected supplier
  const handleProductChange = (index: number, product: any) => {
    if (!product) return

    const selectedSupplierId = purchaseData.supplier || ""
    const defaultMeasureId = product.purchase?.defaultMeasure || ""
    const defaultUnit = measures.find((m) => m.id === defaultMeasureId)
    
    // Get price and tax based on the selected supplier in the purchase order
    let selectedPrice = 0
    let selectedTax = 20 // Default VAT rate
    let selectedMeasureId = defaultMeasureId
    
    // First, try to find a unit that matches the selected supplier
    if (product.purchase?.units && Array.isArray(product.purchase.units) && selectedSupplierId) {
      const supplierUnit = product.purchase.units.find((u: any) => u.supplierId === selectedSupplierId)
      if (supplierUnit) {
        selectedPrice = supplierUnit.price || 0
        selectedTax = supplierUnit.taxPercent || product.purchase.taxPercent || 20
        selectedMeasureId = supplierUnit.measure || defaultMeasureId
        const selectedUnit = measures.find((m) => m.id === selectedMeasureId)
        updatePurchaseItem(index, {
          productId: product.id,
          productName: product.name,
          itemID: product.id,
          name: product.name,
          supplierId: selectedSupplierId,
          measureId: selectedMeasureId,
          measureName: selectedUnit?.name || defaultUnit?.name || "Unknown Unit",
          unitPrice: selectedPrice,
          taxPercent: selectedTax,
          salesDivisionId: product.salesDivisionId || "",
          categoryId: product.categoryId || "",
          subcategoryId: product.subcategoryId || "",
          type: product.type || "",
        })
        return
      }
    }
    
    // Fallback to default purchase unit if no supplier-specific unit found
    if (product.purchase?.units && Array.isArray(product.purchase.units)) {
      const defaultPurchaseUnit = product.purchase.units.find((u: any) => u.measure === defaultMeasureId)
      if (defaultPurchaseUnit) {
        selectedPrice = defaultPurchaseUnit.price || 0
        selectedTax = defaultPurchaseUnit.taxPercent || product.purchase.taxPercent || 20
      }
    } else {
      selectedPrice = product.purchase?.price || 0
      selectedTax = product.purchase?.taxPercent || 20
    }

    updatePurchaseItem(index, {
      productId: product.id,
      productName: product.name,
      itemID: product.id,
      name: product.name,
      supplierId: selectedSupplierId,
      measureId: selectedMeasureId,
      measureName: defaultUnit?.name || "Unknown Unit",
      unitPrice: selectedPrice,
      taxPercent: selectedTax,
      salesDivisionId: product.salesDivisionId || "",
      categoryId: product.categoryId || "",
      subcategoryId: product.subcategoryId || "",
      type: product.type || "",
    })
  }

  // Handle measure change - update price and tax from product data based on supplier
  const handleMeasureChange = (index: number, measureId: string, measureName: string) => {
    const item = purchaseData.items[index]
    const product = products.find((p) => p.id === item.productId)
    const selectedSupplierId = purchaseData.supplier || ""
    
    if (!product) {
      updatePurchaseItem(index, { measureId, measureName })
      return
    }
    
    // Get price and tax for this specific measure and supplier
    let price = 0
    let tax = 20
    
    // First try to find a unit matching both the measure and supplier
    if (product.purchase?.units && Array.isArray(product.purchase.units) && selectedSupplierId) {
      const supplierMeasureUnit = product.purchase.units.find((u: any) => 
        u.measure === measureId && u.supplierId === selectedSupplierId
      )
      if (supplierMeasureUnit) {
        price = supplierMeasureUnit.price || 0
        tax = supplierMeasureUnit.taxPercent || product.purchase.taxPercent || 20
        updatePurchaseItem(index, {
          measureId,
          measureName,
          unitPrice: price,
          taxPercent: tax,
        })
        return
      }
    }
    
    // Fallback to measure-only match
    if (product.purchase?.units && Array.isArray(product.purchase.units)) {
      const purchaseUnit = product.purchase.units.find((u: any) => u.measure === measureId)
      if (purchaseUnit) {
        price = purchaseUnit.price || 0
        tax = purchaseUnit.taxPercent || product.purchase.taxPercent || 20
      }
    } else {
      price = product.purchase?.price || 0
      tax = product.purchase?.taxPercent || 20
    }
    
    updatePurchaseItem(index, {
      measureId,
      measureName,
      unitPrice: price,
      taxPercent: tax,
    })
  }


  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault()
    }
    
    // Validation
    const errors: any = {}
    if (!purchaseData.supplier) {
      errors.supplier = "Supplier is required"
    }
    if (purchaseData.items.length === 0) {
      errors.items = "At least one item is required"
    }

    const validItems = (purchaseData.items || []).filter((item) => {
      const productId = String(item.productId || item.itemID || "").trim()
      const measureId = String(item.measureId || "").trim()
      const quantity = Number(item.quantity || 0)
      return productId && measureId && quantity > 0
    })

    if (purchaseData.items.length > 0 && validItems.length !== purchaseData.items.length) {
      errors.items = "Every line must include a product, a measure, and a quantity greater than 0"
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    // Ensure deliveryDate is set from dateUK
    const submitData = {
      ...purchaseData,
      deliveryDate: purchaseData.dateUK || purchaseData.deliveryDate || new Date().toISOString().split("T")[0],
      dateUK: purchaseData.dateUK || purchaseData.deliveryDate || new Date().toISOString().split("T")[0],
      items: validItems,
    }
    onSave(submitData)
  }

  // Expose submit function to parent component
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit()
  }))

  const handleInputChange = (field: keyof Purchase, value: any) => {
    setPurchaseData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Box sx={{ 
      width: 'max-content',
      minWidth: '300px',
      maxWidth: 'none'
    }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Header Information */}

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="purchase-order-supplier-label" component="span">
                Supplier
              </InputLabel>
              <Select
                id="purchase-order-supplier"
                name="supplier"
                labelId="purchase-order-supplier-label"
                value={purchaseData.supplier}
                label="Supplier"
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                error={!!validationErrors.supplier}
                disabled={isReadOnly}
                required
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' },
                  '& .MuiSelect-select': {
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                  }
                }}
              >
                {(suppliers || []).map((supplier) => (
                  <MenuItem 
                    key={supplier.id} 
                    value={supplier.id}
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                    }}
                  >
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {validationErrors.supplier && (
              <Typography variant="caption" color="error">
                {validationErrors.supplier}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              id="purchase-order-invoice-number"
              name="invoiceNumber"
              fullWidth
              label="Invoice Number"
              value={purchaseData.invoiceNumber}
              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
              disabled={isReadOnly}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              id="purchase-order-delivery-date"
              name="deliveryDate"
              fullWidth
              label="Delivery Date"
              type="date"
              value={purchaseData.dateUK || purchaseData.deliveryDate || ""}
              onChange={(e) => {
                handleInputChange('dateUK', e.target.value)
                handleInputChange('deliveryDate', e.target.value)
              }}
              InputLabelProps={{ shrink: true }}
              disabled={isReadOnly}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="purchase-order-status-label" component="span">
                Status
              </InputLabel>
              <Select
                id="purchase-order-status"
                name="status"
                labelId="purchase-order-status-label"
                value={purchaseData.status || "Awaiting Submission"}
                label="Status"
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isReadOnly}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' },
                  '& .MuiSelect-select': {
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' }
                  }
                }}
              >
                <MenuItem value="Awaiting Submission">Awaiting Submission</MenuItem>
                <MenuItem value="Awaiting Approval">Awaiting Approval</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
              </Select>
            </FormControl>
          </Grid>


          {/* Purchase Items */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />

            {validationErrors.items && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validationErrors.items}
              </Alert>
            )}

            <TableContainer 
              component={Paper} 
              sx={{ 
                overflowX: 'visible',
                maxHeight: { xs: '400px', sm: '500px', md: '600px' },
                width: 'max-content',
                minWidth: '100%'
              }}
            >
              <Table 
                size="small" 
                sx={{ 
                  tableLayout: 'auto', 
                  width: 'max-content',
                  minWidth: '100%'
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Product</TableCell>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Measure</TableCell>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Quantity</TableCell>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Unit Price</TableCell>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Tax %</TableCell>
                    <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Total</TableCell>
                    {!isReadOnly && <TableCell sx={{ 
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ 
                        textAlign: 'center',
                        width: 'auto',
                        minWidth: 'fit-content',
                        maxWidth: 'none',
                        overflow: 'visible',
                        padding: '8px'
                      }}>
                        <Autocomplete
                          size="small"
                          options={products || []}
                          getOptionLabel={(option) => option.name || ""}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          value={(products || []).find(p => p.id === item.productId) || null}
                          onChange={(_, newValue) => handleProductChange(index, newValue)}
                          disabled={isReadOnly}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              id={`purchase-order-item-${index}-product`}
                              name={`purchase-order-item-${index}-product`}
                              placeholder="Select product"
                              inputProps={{
                                ...params.inputProps,
                                name: `purchase-order-item-${index}-product`,
                              }}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                }
                              }}
                            />
                          )}
                          sx={{ 
                            width: '100%',
                            minWidth: '200px',
                            '& .MuiAutocomplete-inputRoot': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <FormControl 
                          size="small" 
                          fullWidth
                          sx={{
                            width: 'auto',
                            minWidth: 'fit-content',
                            maxWidth: '100%'
                          }}
                        >
                          <Select
                            id={`purchase-order-item-${index}-measure`}
                            name={`purchase-order-item-${index}-measure`}
                            value={item.measureId || ""}
                            onChange={(e) => {
                              const measure = measures.find(m => m.id === e.target.value)
                              handleMeasureChange(index, e.target.value, measure?.name || "")
                            }}
                            disabled={isReadOnly}
                            inputProps={{ "aria-label": "Measure" }}
                            sx={{
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
                              '& .MuiSelect-select': {
                                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                              }
                            }}
                          >
                            {getAvailablePurchaseMeasures(item.productId).map((measure) => (
                              <MenuItem 
                                key={measure.id} 
                                value={measure.id}
                                sx={{
                                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                                }}
                              >
                                {measure.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <TextField
                          id={`purchase-order-item-${index}-quantity`}
                          name={`purchase-order-item-${index}-quantity`}
                          size="small"
                          type="number"
                          value={item.quantity || 0}
                          onChange={(e) => updatePurchaseItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          disabled={isReadOnly}
                          inputProps={{ 
                            min: 0, 
                            step: 0.01,
                            style: { 
                              fontSize: 'inherit',
                              textAlign: 'center'
                            }
                          }}
                          sx={{ 
                            width: { xs: 60, sm: 70, md: 80, lg: 90, xl: 100 },
                            minWidth: { xs: 60, sm: 70, md: 80, lg: 90, xl: 100 },
                            maxWidth: '100%',
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
                              textAlign: 'center'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <TextField
                          id={`purchase-order-item-${index}-unit-price`}
                          name={`purchase-order-item-${index}-unit-price`}
                          size="small"
                          type="number"
                          value={item.unitPrice || 0}
                          onChange={(e) => updatePurchaseItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">£</InputAdornment>,
                          }}
                          disabled={isReadOnly}
                          inputProps={{ 
                            min: 0, 
                            step: 0.01,
                            style: { 
                              fontSize: 'inherit',
                              textAlign: 'center'
                            }
                          }}
                          sx={{ 
                            width: { xs: 80, sm: 90, md: 100, lg: 110, xl: 120 },
                            minWidth: { xs: 80, sm: 90, md: 100, lg: 110, xl: 120 },
                            maxWidth: '100%',
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
                              textAlign: 'center'
                            },
                            '& .MuiInputAdornment-root': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <TextField
                          id={`purchase-order-item-${index}-tax-percent`}
                          name={`purchase-order-item-${index}-tax-percent`}
                          size="small"
                          type="number"
                          value={item.taxPercent || 20}
                          onChange={(e) => updatePurchaseItem(index, { taxPercent: parseFloat(e.target.value) || 0 })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          disabled={isReadOnly}
                          inputProps={{ 
                            min: 0, 
                            step: 0.01,
                            style: { 
                              fontSize: 'inherit',
                              textAlign: 'center'
                            }
                          }}
                          sx={{ 
                            width: { xs: 50, sm: 60, md: 70, lg: 80, xl: 90 },
                            minWidth: { xs: 50, sm: 60, md: 70, lg: 80, xl: 90 },
                            maxWidth: '100%',
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
                              textAlign: 'center'
                            },
                            '& .MuiInputAdornment-root': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">
                          £{(item.totalPrice || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton
                            color="error"
                            onClick={() => removePurchaseItem(index)}
                            size="small"
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

            {/* Add Item Button - Centered below table */}
            {!isReadOnly && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addPurchaseItem}
                  size="small"
                >
                  Add Item
                </Button>
              </Box>
            )}

            {/* Totals */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Grid container spacing={2} sx={{ maxWidth: 400 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    Subtotal (excl. VAT):
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    £{((purchaseData.totalValue || 0) - (purchaseData.totalTax || 0)).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    Total VAT:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    £{(purchaseData.totalTax || 0).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right">
                    £{(purchaseData.totalValue || 0).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

        </Grid>
      </form>
    </Box>
  )
})

PurchaseOrderForm.displayName = 'PurchaseOrderForm'

export default PurchaseOrderForm
