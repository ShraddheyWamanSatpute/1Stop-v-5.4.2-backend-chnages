"use client"

import { themeConfig } from "../../../../backend/context/AppTheme"
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
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
  InputAdornment,
} from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material"
import type {
  Quote,
  InvoiceLineItem,
  Contact,
  Account,
  TaxRate,
} from "../../../../backend/interfaces/Finance"
import { useFinance } from "../../../../backend/context/FinanceContext"

export interface QuoteFormHandle {
  submit: () => void
}

interface QuoteFormProps {
  quote?: Quote | null
  mode?: "create" | "edit" | "view"
  onSave: (quote: Partial<Quote>) => void
}

const QuoteForm = React.forwardRef<QuoteFormHandle, QuoteFormProps>(({ quote, mode = "create", onSave }, ref) => {
  const { state: financeState } = useFinance()
  const isReadOnly = mode === "view"

  const [formData, setFormData] = useState({
    quoteNumber: "",
    customerId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    paymentTerms: 30,
    currency: "GBP",
    reference: "",
    description: "",
    notes: "",
    terms: "",
    status: "draft" as Quote["status"],
    // Keep as string so users can delete "0" (blank => 0)
    discountPercentage: "" as string,
    discountAmount: "" as string,
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null)

  const customers = useMemo(
    () => (financeState.contacts || []).filter((c) => c.type === "customer" || c.type === "both"),
    [financeState.contacts]
  )

  const accounts = useMemo(() => {
    // Use the full Chart of Accounts list (like Accounting page).
    // Keep archived accounts out of selection lists.
    return (financeState.accounts || [])
      .filter((a: any) => !a?.isArchived)
      .slice()
      .sort((a: any, b: any) => {
        const ac = String(a?.code || "")
        const bc = String(b?.code || "")
        if (ac && bc && ac !== bc) return ac.localeCompare(bc, undefined, { numeric: true })
        return String(a?.name || "").localeCompare(String(b?.name || ""))
      })
  }, [financeState.accounts])

  const taxRates = useMemo(
    () =>
      (financeState.taxRates && financeState.taxRates.length > 0
        ? financeState.taxRates
        : [
            { id: "vat_standard", name: "Standard VAT", rate: 20, type: "VAT" as const, isActive: true },
            { id: "vat_reduced", name: "Reduced VAT", rate: 5, type: "VAT" as const, isActive: true },
            { id: "vat_zero", name: "Zero VAT", rate: 0, type: "VAT" as const, isActive: true },
          ]) as TaxRate[],
    [financeState.taxRates]
  )

  const currencies = useMemo(() => {
    // Keep for symbol display only; currency selection UI is removed (defaults to GBP).
    return financeState.currencies && financeState.currencies.length > 0
      ? financeState.currencies
      : [
          {
            code: "GBP",
            name: "British Pound",
            symbol: "£",
            rate: 1,
            isBase: true,
            lastUpdated: new Date().toISOString(),
            status: "active" as const,
          },
        ]
  }, [financeState.currencies])

  const currencySymbol = useMemo(() => {
    return (currencies as any[]).find((c) => c.code === formData.currency)?.symbol || "£"
  }, [currencies, formData.currency])

  useEffect(() => {
    if (quote) {
      setFormData({
        quoteNumber: quote.quoteNumber || "",
        customerId: quote.customerId || "",
        issueDate: quote.issueDate || new Date().toISOString().split("T")[0],
        expiryDate: quote.expiryDate || "",
        paymentTerms: quote.paymentTerms || 30,
        currency: quote.currency || "GBP",
        reference: quote.reference || "",
        description: quote.description || "",
        notes: quote.notes || "",
        terms: quote.terms || "",
        status: quote.status || "draft",
        discountPercentage: (() => {
          const n = Number(quote.discountPercentage || 0)
          return n ? String(n) : ""
        })(),
        discountAmount: (() => {
          const n = Number(quote.discountAmount || 0)
          return n ? String(n) : ""
        })(),
      })
      const rawItems = (((quote as any).lineItems || (quote as any).line_items) ?? []) as any[]
      const normalizedItems: InvoiceLineItem[] = rawItems.map((li: any, idx: number) => {
        const quantity = Number(li.quantity ?? li.qty ?? 1)
        const unitPrice = Number(li.unitPrice ?? li.unit_price ?? 0)
        const taxRate = Number(li.taxRate ?? li.tax_rate ?? 0)
        const lineTotal = Number(li.lineTotal ?? li.line_total ?? quantity * unitPrice)
        const taxAmount = Number(li.taxAmount ?? li.tax_amount ?? lineTotal * (taxRate / 100))
        return {
          id: String(li.id ?? `line_${idx}_${Date.now()}`),
          description: String(li.description ?? ""),
          quantity: Number.isFinite(quantity) ? quantity : 1,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          taxRate: Number.isFinite(taxRate) ? taxRate : 0,
          taxAmount: Number.isFinite(taxAmount) ? taxAmount : 0,
          lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
          accountId: li.accountId ?? li.account_id ?? li.account ?? undefined,
          taxRateId: li.taxRateId ?? li.tax_rate_id ?? undefined,
          dimensionIds: li.dimensionIds ?? li.dimension_ids ?? undefined,
        }
      })
      setLineItems(normalizedItems)
      const customer = (financeState.contacts || []).find((c) => c.id === quote.customerId)
      if (customer) setSelectedCustomer(customer)
    } else {
      const defaultExpiry = new Date()
      defaultExpiry.setDate(defaultExpiry.getDate() + 14)
      setFormData((prev) => ({
        ...prev,
        expiryDate: prev.expiryDate || defaultExpiry.toISOString().split("T")[0],
      }))
    }
  }, [quote, financeState.contacts])

  useEffect(() => {
    if (formData.customerId) {
      const customer = (financeState.contacts || []).find((c) => c.id === formData.customerId)
      if (customer) {
        setSelectedCustomer(customer)
        if (customer.paymentTerms && !quote) {
          setFormData((prev) => ({ ...prev, paymentTerms: customer.paymentTerms || 30 }))
        }
      }
    }
  }, [formData.customerId, financeState.contacts, quote])

  const calculateLineItem = useCallback(
    (item: InvoiceLineItem): InvoiceLineItem => {
      const qty = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const lineTotal = qty * unitPrice
      const taxRate = Number(item.taxRate) || 0
      const taxAmount = lineTotal * (taxRate / 100)
      return {
        ...item,
        lineTotal,
        taxAmount,
      }
    },
    []
  )

  const totals = useMemo(() => {
    let subtotal = 0
    let taxAmount = 0

    lineItems.forEach((item) => {
      const calculated = calculateLineItem(item)
      subtotal += calculated.lineTotal || 0
      taxAmount += calculated.taxAmount || 0
    })

    const pct = Number((formData as any).discountPercentage || 0)
    const amt = Number((formData as any).discountAmount || 0)
    const discountAmount = pct > 0 ? subtotal * (pct / 100) : (Number.isFinite(amt) ? amt : 0)

    const discountedSubtotal = Math.max(0, subtotal - discountAmount)
    const totalAmount = discountedSubtotal + taxAmount

    return {
      subtotal,
      taxAmount,
      discountAmount,
      discountedSubtotal,
      totalAmount,
    }
  }, [calculateLineItem, formData.discountAmount, formData.discountPercentage, lineItems])

  const handleAddLineItem = () => {
    const defaultAccountId =
      (selectedCustomer as any)?.defaultAccountId ||
      (selectedCustomer as any)?.default_account_id ||
      accounts[0]?.id
    const defaultTaxRateId =
      (selectedCustomer as any)?.defaultTaxRateId ||
      (selectedCustomer as any)?.default_tax_rate_id ||
      taxRates[0]?.id
    const defaultTaxRate = taxRates.find((tr) => tr.id === defaultTaxRateId) || taxRates[0]

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
    } as any

    setLineItems([...lineItems, newItem])
  }

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value } as any
    updated[index] = calculateLineItem(updated[index])
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSave = useCallback(() => {
    if (!formData.customerId) {
      alert("Please select a customer")
      return
    }
    if (lineItems.length === 0) {
      alert("Please add at least one line item")
      return
    }

    const customer = (financeState.contacts || []).find((c) => c.id === formData.customerId)
    const discountPercentageNum = Number((formData as any).discountPercentage || 0)
    const discountAmountNum = Number((formData as any).discountAmount || 0)
    const quoteData: Partial<Quote> = {
      ...formData,
      customerId: formData.customerId,
      customerName: customer?.name || "",
      customerEmail: customer?.email,
      customerAddress: customer?.address,
      lineItems: lineItems.map(calculateLineItem),
      subtotal: totals.discountedSubtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      discountPercentage: Number.isFinite(discountPercentageNum) ? discountPercentageNum : 0,
      discountAmount: Number.isFinite(discountAmountNum) ? discountAmountNum : 0,
      quoteNumber: formData.quoteNumber || undefined,
    }

    onSave(quoteData)
  }, [calculateLineItem, financeState.contacts, formData, lineItems, onSave, totals])

  useImperativeHandle(ref, () => ({ submit: handleSave }), [handleSave])

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isReadOnly) handleSave()
      }}
      sx={{ width: "100%" }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || option.id}
            value={selectedCustomer}
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue)
              setFormData((prev) => ({ ...prev, customerId: newValue?.id || "" }))
            }}
            disabled={isReadOnly}
            renderInput={(params) => <TextField {...params} label="Customer" required />}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Issue Date"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))}
            disabled={isReadOnly}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Expiry Date"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
            disabled={isReadOnly}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Payment Terms (days)"
            type="number"
            value={formData.paymentTerms}
            onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: parseInt(e.target.value) || 0 }))}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={isReadOnly}>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
              label="Status"
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="declined">Declined</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="converted">Converted</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Reference"
            value={formData.reference}
            onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            disabled={isReadOnly}
            multiline
            rows={2}
          />
        </Grid>

        <Grid item xs={12}>
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
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.description || ""}
                        onChange={(e) => handleUpdateLineItem(index, "description", e.target.value)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                          value={(item as any).accountId || ""}
                          onChange={(e) => handleUpdateLineItem(index, "accountId" as any, e.target.value)}
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
                        // 0 shows as blank; blank => 0
                        value={(() => {
                          const raw = (item as any).quantity
                          if (raw === "" || raw === undefined || raw === null) return ""
                          const n = Number(raw)
                          if (!Number.isFinite(n) || n === 0) return ""
                          return raw
                        })()}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === "") {
                            handleUpdateLineItem(index, "quantity", "" as any)
                            return
                          }
                          const n = Number(raw)
                          handleUpdateLineItem(index, "quantity", Number.isFinite(n) ? n : 0)
                        }}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        // 0 shows as blank; blank => 0
                        value={(() => {
                          const raw = (item as any).unitPrice
                          if (raw === "" || raw === undefined || raw === null) return ""
                          const n = Number(raw)
                          if (!Number.isFinite(n) || n === 0) return ""
                          return raw
                        })()}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === "") {
                            handleUpdateLineItem(index, "unitPrice", "" as any)
                            return
                          }
                          const n = Number(raw)
                          handleUpdateLineItem(index, "unitPrice", Number.isFinite(n) ? n : 0)
                        }}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        // 0 shows as blank; blank => 0
                        value={(() => {
                          const raw = (item as any).taxRate
                          if (raw === "" || raw === undefined || raw === null) return ""
                          const n = Number(raw)
                          if (!Number.isFinite(n) || n === 0) return ""
                          return raw
                        })()}
                        onChange={(e) => {
                          const raw = e.target.value
                          // IMPORTANT: update taxRate + taxRateId together to avoid stale state overwriting
                          setLineItems((prev) => {
                            const updated = [...prev]
                            const n = raw === "" ? 0 : Number(raw)
                            const rate = raw === "" ? "" : (Number.isFinite(n) ? n : 0)
                            const matched =
                              raw === "" ? undefined : taxRates.find((tr) => Number(tr.rate) === Number(rate))
                            const next: any = {
                              ...updated[index],
                              taxRate: rate,
                              taxRateId: raw === "" ? undefined : matched?.id,
                            }
                            updated[index] = calculateLineItem(next)
                            return updated
                          })
                        }}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                      {calculateLineItem(item).taxAmount?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {currencies.find((c) => c.code === formData.currency)?.symbol || "£"}
                      {calculateLineItem(item).lineTotal?.toFixed(2) || "0.00"}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleRemoveLineItem(index)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 7 : 8} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        No line items. {!isReadOnly && "Click 'Add Line Item' below to add items."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!isReadOnly && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button startIcon={<AddIcon />} onClick={handleAddLineItem} variant="outlined" size="small">
                Add Line Item
              </Button>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Discount Percentage"
            type="number"
            value={formData.discountPercentage}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                discountPercentage: e.target.value,
                discountAmount: "",
              }))
            }
            disabled={isReadOnly}
            inputProps={{ min: 0, max: 100, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Discount Amount"
            type="number"
            value={formData.discountAmount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                discountAmount: e.target.value,
                discountPercentage: "",
              }))
            }
            disabled={isReadOnly}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}></Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>
                    {currencySymbol}
                    {totals.subtotal.toFixed(2)}
                  </Typography>
                </Box>
                {totals.discountAmount > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography color="success.main">Discount:</Typography>
                    <Typography color="success.main">
                      -{currencySymbol}
                      {totals.discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Tax:</Typography>
                  <Typography>
                    {currencySymbol}
                    {totals.taxAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" sx={{ color: themeConfig.brandColors.navy }}>
                    {currencySymbol}
                    {totals.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            multiline
            rows={2}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Terms"
            value={formData.terms}
            onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.value }))}
            multiline
            rows={2}
            placeholder="e.g. Payment due within 30 days"
            disabled={isReadOnly}
          />
        </Grid>

        {quote?.convertedToInvoiceId && (
          <Grid item xs={12}>
            <Chip label={`Converted to Invoice: ${quote.convertedToInvoiceId}`} color="info" size="small" />
          </Grid>
        )}
      </Grid>
    </Box>
  )
})

export default QuoteForm

