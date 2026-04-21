"use client"

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
  Alert,
} from "@mui/material"
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import type { CreditNote, InvoiceLineItem, Contact, Account, TaxRate, Currency, Invoice } from "../../../../backend/interfaces/Finance"
import { useFinance } from "../../../../backend/context/FinanceContext"

interface CreditNoteFormProps {
  creditNote?: CreditNote | null
  originalInvoice?: Invoice | null
  mode?: "create" | "edit" | "view"
  onSave: (creditNote: Partial<CreditNote>) => void
  onCancel?: () => void
}

const CreditNoteForm: React.FC<CreditNoteFormProps> = ({ creditNote, originalInvoice, mode = "create", onSave, onCancel }) => {
  const { state: financeState } = useFinance()
  const isReadOnly = mode === "view"

  const [formData, setFormData] = useState({
    customerId: "",
    issueDate: new Date().toISOString().split("T")[0],
    currency: "GBP",
    exchangeRate: 1,
    reason: "",
    originalInvoiceId: "",
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null)

  useEffect(() => {
    if (creditNote) {
      setFormData({
        customerId: creditNote.customerId || "",
        issueDate: creditNote.issueDate || new Date().toISOString().split("T")[0],
        currency: creditNote.currency || "GBP",
        exchangeRate: 1,
        reason: creditNote.reason || "",
        originalInvoiceId: creditNote.originalInvoiceId || "",
      })
      setLineItems(creditNote.lineItems || [])
      const customer = financeState.contacts.find((c) => c.id === creditNote.customerId)
      if (customer) setSelectedCustomer(customer)
    } else if (originalInvoice) {
      // Pre-fill from original invoice
      setFormData({
        customerId: originalInvoice.customerId || "",
        issueDate: new Date().toISOString().split("T")[0],
        currency: originalInvoice.currency || "GBP",
        exchangeRate: originalInvoice.exchangeRate || originalInvoice.exchange_rate || 1,
        reason: "",
        originalInvoiceId: originalInvoice.id,
      })
      // Copy line items from invoice
      setLineItems(
        originalInvoice.lineItems.map((item) => ({
          ...item,
          id: `line_${Date.now()}_${Math.random()}`,
        }))
      )
      const customer = financeState.contacts.find((c) => c.id === originalInvoice.customerId)
      if (customer) setSelectedCustomer(customer)
    }
  }, [creditNote, originalInvoice, financeState.contacts])

  const customers = financeState.contacts.filter((c) => c.type === "customer")
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

    const totalAmount = subtotal + taxAmount

    return {
      subtotal,
      taxAmount,
      totalAmount,
    }
  }

  const totals = calculateTotals()

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `line_${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: taxRates[0]?.rate || 20,
      taxRateId: taxRates[0]?.id,
      taxAmount: 0,
      lineTotal: 0,
      accountId: accounts[0]?.id,
    }
    setLineItems([...lineItems, newItem])
  }

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
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

    if (!formData.reason) {
      alert("Please provide a reason for the credit note")
      return
    }

    const customer = financeState.contacts.find((c) => c.id === formData.customerId)
    const creditNoteData: Partial<CreditNote> = {
      ...formData,
      customerId: formData.customerId,
      customerName: customer?.name || "",
      lineItems: lineItems.map(calculateLineItem),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      balance_due: totals.totalAmount,
      balanceDue: totals.totalAmount,
      status: "issued",
    }

    onSave(creditNoteData)
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Credit Note Details
          </Typography>
          <Divider />
        </Grid>

        {originalInvoice && (
          <Grid item xs={12}>
            <Alert severity="info">
              Creating credit note for Invoice: {originalInvoice.invoiceNumber} - {originalInvoice.customerName}
            </Alert>
          </Grid>
        )}

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
            disabled={isReadOnly || !!originalInvoice}
            renderInput={(params) => (
              <TextField {...params} label="Customer" required />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
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

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={isReadOnly || !!originalInvoice}
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
          <Grid item xs={12} sm={6}>
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

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Reason for Credit Note"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            required
            disabled={isReadOnly}
            placeholder="e.g., Returned goods, Service issue, Pricing error"
            multiline
            rows={2}
          />
        </Grid>

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
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Tax:</Typography>
                  <Typography>
                    {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                    {totals.taxAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6">Total Credit:</Typography>
                  <Typography variant="h6" color="success.main">
                    {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                    {totals.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {!isReadOnly && (
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              {onCancel && (
                <Button onClick={onCancel} variant="outlined">
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} variant="contained" color="primary">
                {mode === "create" ? "Create Credit Note" : "Save Changes"}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default CreditNoteForm
