"use client"

import { themeConfig } from "../../../../theme/AppTheme";
import React, { useState, useEffect } from "react"
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
  Button,
  Divider,
  Autocomplete,
  Chip,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import type { Invoice, InvoiceLineItem, Contact, Account, TaxRate, Currency } from "../../../../backend/interfaces/Finance"
import { useFinance } from "../../../../backend/context/FinanceContext"

interface InvoiceFormProps {
  invoice?: Invoice | null
  mode?: "create" | "edit" | "view"
  onSave: (invoice: Partial<Invoice>) => void
  onCancel?: () => void
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, mode = "create", onSave, onCancel }) => {
  const { state: financeState } = useFinance()
  const isReadOnly = mode === "view"

  const [formData, setFormData] = useState({
    customerId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentTerms: 30,
    currency: "GBP",
    exchangeRate: 1,
    reference: "",
    description: "",
    notes: "",
    terms: "",
    status: "draft" as Invoice["status"],
    discountPercentage: 0,
    discountAmount: 0,
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null)

  useEffect(() => {
    if (invoice) {
      setFormData({
        customerId: invoice.customerId || "",
        issueDate: invoice.issueDate || new Date().toISOString().split("T")[0],
        dueDate: invoice.dueDate || "",
        paymentTerms: invoice.paymentTerms || 30,
        currency: invoice.currency || "GBP",
        exchangeRate: invoice.exchangeRate || invoice.exchange_rate || 1,
        reference: invoice.reference || "",
        description: invoice.description || "",
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        status: invoice.status || "draft",
        discountPercentage: invoice.discountPercentage || 0,
        discountAmount: invoice.discountAmount || 0,
      })
      setLineItems(invoice.lineItems || [])
      const customer = financeState.contacts.find((c) => c.id === invoice.customerId)
      if (customer) setSelectedCustomer(customer)
    } else {
      // Set default due date based on payment terms
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split("T")[0],
      }))
    }
  }, [invoice, financeState.contacts])

  useEffect(() => {
    // Update due date when payment terms change
    if (formData.issueDate && formData.paymentTerms) {
      const dueDate = new Date(formData.issueDate)
      dueDate.setDate(dueDate.getDate() + formData.paymentTerms)
      setFormData((prev) => ({
        ...prev,
        dueDate: dueDate.toISOString().split("T")[0],
      }))
    }
  }, [formData.issueDate, formData.paymentTerms])

  useEffect(() => {
    // Update customer when selected
    if (formData.customerId) {
      const customer = financeState.contacts.find((c) => c.id === formData.customerId)
      if (customer) {
        setSelectedCustomer(customer)
        // Set customer's default payment terms if available
        if (customer.paymentTerms && !invoice) {
          setFormData((prev) => ({
            ...prev,
            paymentTerms: customer.paymentTerms || 30,
          }))
        }
        // Set customer's default currency if available
        if (customer.currency && !invoice) {
          setFormData((prev) => ({
            ...prev,
            currency: customer.currency,
          }))
        }
      }
    }
  }, [formData.customerId, financeState.contacts, invoice])

  const customers = financeState.contacts.filter((c) => c.type === "customer" || c.type === "both")
  const accounts = financeState.accounts.filter((a) => a.type === "revenue" || a.subType === "revenue")
  const taxRates = financeState.taxRates.length > 0 ? financeState.taxRates : [
    { id: "vat_standard", name: "Standard VAT", rate: 20, type: "VAT" as const, isActive: true },
    { id: "vat_reduced", name: "Reduced VAT", rate: 5, type: "VAT" as const, isActive: true },
    { id: "vat_zero", name: "Zero VAT", rate: 0, type: "VAT" as const, isActive: true },
  ]
  const currencies = financeState.currencies.length > 0 ? financeState.currencies : [
    { code: "GBP", name: "British Pound", symbol: "£", rate: 1, isBase: true, lastUpdated: new Date().toISOString(), status: "active" as const },
  ]

  const calculateLineItem = (item: InvoiceLineItem): InvoiceLineItem => {
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

    // Apply discount
    const discountAmount = formData.discountPercentage
      ? subtotal * (formData.discountPercentage / 100)
      : formData.discountAmount || 0

    const discountedSubtotal = subtotal - discountAmount
    const totalAmount = discountedSubtotal + taxAmount

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      taxAmount,
      totalAmount,
    }
  }

  const totals = calculateTotals()

  const handleAddLineItem = () => {
    // Use customer's default account and tax rate if available
    const defaultAccountId = selectedCustomer?.defaultAccountId || accounts[0]?.id
    const defaultTaxRateId = selectedCustomer?.defaultTaxRateId || taxRates[0]?.id
    const defaultTaxRate = taxRates.find(tr => tr.id === defaultTaxRateId) || taxRates[0]
    
    const newItem: InvoiceLineItem = {
      id: `line_${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: defaultTaxRate?.rate || 20,
      taxRateId: defaultTaxRateId,
      taxAmount: 0,
      lineTotal: 0,
      accountId: defaultAccountId,
    }
    setLineItems([...lineItems, newItem])
  }

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate line item
    updated[index] = calculateLineItem(updated[index])
    
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!formData.customerId) {
      alert("Please select a customer")
      return
    }

    if (lineItems.length === 0) {
      alert("Please add at least one line item")
      return
    }

    const customer = financeState.contacts.find((c) => c.id === formData.customerId)
    const invoiceData: Partial<Invoice> = {
      ...formData,
      customerId: formData.customerId,
      customerName: customer?.name || "",
      customerEmail: customer?.email,
      customerAddress: customer?.address,
      lineItems: lineItems.map(calculateLineItem),
      subtotal: totals.discountedSubtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      balance_due: totals.totalAmount,
      balanceDue: totals.totalAmount,
      exchange_rate: formData.exchangeRate,
      exchangeRate: formData.exchangeRate,
      discountAmount: totals.discountAmount,
    }

    onSave(invoiceData)
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Invoice Details
          </Typography>
          <Divider />
        </Grid>

        {/* Customer Selection */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || option.id}
            value={selectedCustomer}
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue)
              setFormData((prev) => ({
                ...prev,
                customerId: newValue?.id || "",
              }))
            }}
            disabled={isReadOnly}
            renderInput={(params) => (
              <TextField {...params} label="Customer" required />
            )}
          />
        </Grid>

        {/* Dates and Terms */}
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Issue Date"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            disabled={isReadOnly}
          />
        </Grid>

        {/* Currency and Exchange Rate */}
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={isReadOnly}
            >
              {currencies.map((curr) => (
                <MenuItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {formData.currency !== "GBP" && (
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Exchange Rate"
              type="number"
              value={formData.exchangeRate}
              onChange={(e) =>
                setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })
              }
              disabled={isReadOnly}
              inputProps={{ step: 0.0001, min: 0 }}
            />
          </Grid>
        )}

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Payment Terms (days)"
            type="number"
            value={formData.paymentTerms}
            onChange={(e) =>
              setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 0 })
            }
            disabled={isReadOnly}
          />
        </Grid>

        {/* Reference and Description */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as Invoice["status"] })
              }
              disabled={isReadOnly || mode === "view"}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            disabled={isReadOnly}
          />
        </Grid>

        {/* Line Items Section */}
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Line Items</Typography>
            {!isReadOnly && (
              <Button startIcon={<AddIcon />} onClick={handleAddLineItem} variant="outlined" size="small">
                Add Line Item
              </Button>
            )}
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Qty</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Unit Price</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Tax Rate</TableCell>
                  <TableCell sx={{ width: 150 }}>Account</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Line Total</TableCell>
                  {!isReadOnly && <TableCell align="center" sx={{ width: 60 }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      {isReadOnly ? (
                        item.description
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateLineItem(index, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isReadOnly ? (
                        item.quantity
                      ) : (
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLineItem(index, "quantity", parseFloat(e.target.value) || 1)
                          }
                          inputProps={{ min: 0.01, step: 0.01, style: { textAlign: "right" } }}
                          sx={{ width: 100 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isReadOnly ? (
                        `${currencies.find((c) => c.code === formData.currency)?.symbol || "£"}${item.unitPrice.toFixed(2)}`
                      ) : (
                        <TextField
                          type="number"
                          size="small"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                          sx={{ width: 120 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isReadOnly ? (
                        `${item.taxRate}%`
                      ) : (
                        <FormControl size="small" sx={{ width: 100 }}>
                          <Select
                            value={item.taxRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value)
                              const taxRate = taxRates.find((tr) => tr.rate === rate)
                              handleUpdateLineItem(index, "taxRate", rate)
                              if (taxRate) {
                                handleUpdateLineItem(index, "taxRateId", taxRate.id)
                              }
                            }}
                          >
                            {taxRates.map((tr) => (
                              <MenuItem key={tr.id} value={tr.rate}>
                                {tr.rate}%
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        accounts.find((a) => a.id === item.accountId)?.name || "-"
                      ) : (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.accountId || ""}
                            onChange={(e) => handleUpdateLineItem(index, "accountId", e.target.value)}
                          >
                            {accounts.map((acc) => (
                              <MenuItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                      {calculateLineItem(item).lineTotal.toFixed(2)}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveLineItem(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 6 : 7} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        No line items. {!isReadOnly && "Click 'Add Line Item' to add items."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Discount Section */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Discount Percentage"
            type="number"
            value={formData.discountPercentage}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountPercentage: parseFloat(e.target.value) || 0,
                discountAmount: 0,
              })
            }
            disabled={isReadOnly}
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            helperText="Enter percentage (e.g., 10 for 10%)"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Discount Amount"
            type="number"
            value={formData.discountAmount}
            onChange={(e) =>
              setFormData({
                ...formData,
                discountAmount: parseFloat(e.target.value) || 0,
                discountPercentage: 0,
              })
            }
            disabled={isReadOnly}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        {/* Totals Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}></Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>
                    {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                    {totals.subtotal.toFixed(2)}
                  </Typography>
                </Box>
                {totals.discountAmount > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography color="success.main">Discount:</Typography>
                    <Typography color="success.main">
                      -{currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                      {totals.discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Tax:</Typography>
                  <Typography>
                    {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                    {totals.taxAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" sx={{ color: themeConfig.brandColors.navy }}>
                    {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                    {totals.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Notes and Terms */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Terms & Conditions"
            value={formData.terms}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            multiline
            rows={3}
            disabled={isReadOnly}
          />
        </Grid>

        {/* Action Buttons */}
        {!isReadOnly && (
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              {onCancel && (
                <Button onClick={onCancel} variant="outlined">
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} variant="contained" color="primary">
                {mode === "create" ? "Create Invoice" : "Save Changes"}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default InvoiceForm
