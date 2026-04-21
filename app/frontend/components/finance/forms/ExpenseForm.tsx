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
  Button,
  Divider,
  Alert,
  Autocomplete,
  Chip,
  IconButton,
  Paper,
} from "@mui/material"
import {
  CloudUpload,
  Delete as DeleteIcon,
  DirectionsCar,
} from "@mui/icons-material"
import type { Expense, Account, TaxRate, Contact } from "../../../../backend/interfaces/Finance"
import { useFinance } from "../../../../backend/context/FinanceContext"

interface ExpenseFormProps {
  expense?: Expense | null
  mode?: "create" | "edit" | "view"
  onSave: (expense: Partial<Expense>) => void
  onCancel?: () => void
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, mode = "create", onSave, onCancel }) => {
  const { state: financeState } = useFinance()
  const isReadOnly = mode === "view"

  const [formData, setFormData] = useState({
    employee: "",
    employee_id: "",
    description: "",
    amount: 0,
    currency: "GBP",
    category: "",
    account_id: "",
    tax_rate_id: "",
    tax_included: false,
    is_taxable: true,
    expenseDate: new Date().toISOString().split("T")[0],
    submitDate: new Date().toISOString().split("T")[0],
    department: "",
    payment_method: "card" as Expense["payment_method"],
    mileage: {
      distance: 0,
      rate: 0.45, // Default UK HMRC rate per mile
      total: 0,
    },
    receipt_urls: [] as string[],
    notes: "",
    project_code: "",
    client_name: "",
  })

  const [receiptFiles, setReceiptFiles] = useState<File[]>([])
  const [expenseType, setExpenseType] = useState<"standard" | "mileage">("standard")
  const [selectedEmployee, setSelectedEmployee] = useState<Contact | null>(null)

  useEffect(() => {
    if (expense) {
      setFormData({
        employee: expense.employee || "",
        employee_id: expense.employee_id || "",
        description: expense.description || "",
        amount: expense.amount || 0,
        currency: expense.currency || "GBP",
        category: expense.category || "",
        account_id: expense.account_id || "",
        tax_rate_id: expense.tax_rate_id || "",
        tax_included: expense.tax_included || false,
        is_taxable: expense.is_taxable !== undefined ? expense.is_taxable : true,
        expenseDate: expense.expenseDate || expense.submitDate || new Date().toISOString().split("T")[0],
        submitDate: expense.submitDate || new Date().toISOString().split("T")[0],
        department: expense.department || "",
        payment_method: expense.payment_method || "card",
        mileage: expense.mileage || { distance: 0, rate: 0.45, total: 0 },
        receipt_urls: expense.receipt_urls || [],
        notes: expense.notes || "",
        project_code: expense.project_code || "",
        client_name: expense.client_name || "",
      })
      
      if (expense.mileage && expense.mileage.distance > 0) {
        setExpenseType("mileage")
      }
      
      const employee = financeState.contacts.find((c) => c.id === expense.employee_id || c.name === expense.employee)
      if (employee) setSelectedEmployee(employee)
    }
  }, [expense, financeState.contacts])

  const employees = financeState.contacts.filter((c) => 
    (c.type === "employee" || c.type === "both") && 
    !c.isArchived && 
    c.isActive !== false
  )
  const expenseAccounts = financeState.accounts.filter((a) => a.type === "expense" || a.subType === "expense")
  const taxRates = financeState.taxRates.length > 0 ? financeState.taxRates : [
    { id: "vat_standard", name: "Standard VAT", rate: 20, type: "VAT" as const, isActive: true },
    { id: "vat_reduced", name: "Reduced VAT", rate: 5, type: "VAT" as const, isActive: true },
    { id: "vat_zero", name: "Zero VAT", rate: 0, type: "VAT" as const, isActive: true },
  ]

  const categories = [
    "Food & Beverage Supplies",
    "Utilities",
    "Fuel",
    "Maintenance",
    "Marketing",
    "Travel",
    "Office Supplies",
    "Equipment",
    "Professional Services",
    "Mileage",
    "Accommodation",
    "Meals & Entertainment",
    "Other",
  ]

  const departments = ["Rooms", "Restaurant", "Bar", "Kitchen", "Housekeeping", "Front Desk", "Management", "Other"]

  const calculateMileage = () => {
    const total = formData.mileage.distance * formData.mileage.rate
    setFormData((prev) => ({
      ...prev,
      mileage: { ...prev.mileage, total },
      amount: expenseType === "mileage" ? total : prev.amount,
    }))
  }

  useEffect(() => {
    if (expenseType === "mileage") {
      calculateMileage()
    }
  }, [formData.mileage.distance, formData.mileage.rate, expenseType])

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setReceiptFiles([...receiptFiles, ...newFiles])
      // In production, upload files to storage and get URLs
      // For now, we'll store file names
      const newUrls = newFiles.map((file) => `receipts/${Date.now()}_${file.name}`)
      setFormData((prev) => ({
        ...prev,
        receipt_urls: [...(prev.receipt_urls || []), ...newUrls],
      }))
    }
  }

  const handleRemoveReceipt = (index: number) => {
    const newFiles = receiptFiles.filter((_, i) => i !== index)
    const newUrls = formData.receipt_urls?.filter((_, i) => i !== index) || []
    setReceiptFiles(newFiles)
    setFormData((prev) => ({
      ...prev,
      receipt_urls: newUrls,
    }))
  }

  const calculateTax = () => {
    if (!formData.is_taxable || !formData.tax_rate_id) return 0
    
    const taxRate = taxRates.find((tr) => tr.id === formData.tax_rate_id)
    if (!taxRate) return 0

    if (formData.tax_included) {
      // Tax is included, calculate backwards
      return formData.amount - (formData.amount / (1 + (taxRate.rate / 100)))
    } else {
      // Tax is added
      return formData.amount * (taxRate.rate / 100)
    }
  }

  const taxAmount = calculateTax()
  const totalAmount = formData.tax_included ? formData.amount : formData.amount + taxAmount

  const handleSave = () => {
    if (!formData.employee && !formData.employee_id) {
      alert("Please select an employee")
      return
    }

    if (!formData.description) {
      alert("Please provide a description")
      return
    }

    if (formData.amount <= 0) {
      alert("Amount must be greater than zero")
      return
    }

    if (!formData.category) {
      alert("Please select a category")
      return
    }

    if (!formData.account_id) {
      alert("Please select an expense account")
      return
    }

    const expenseData: Partial<Expense> = {
      ...formData,
      employee: selectedEmployee?.name || formData.employee,
      employee_id: selectedEmployee?.id || formData.employee_id,
      receiptAttached: (formData.receipt_urls?.length || 0) > 0,
      tax_amount: taxAmount,
      status: expense?.status || "pending",
    }

    onSave(expenseData)
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Expense Details
          </Typography>
          <Divider />
        </Grid>

        {/* Expense Type */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Expense Type</InputLabel>
            <Select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as "standard" | "mileage")}
              disabled={isReadOnly}
            >
              <MenuItem value="standard">Standard Expense</MenuItem>
              <MenuItem value="mileage">Mileage Claim</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Employee Selection */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={employees}
            getOptionLabel={(option) => option.name || option.id}
            value={selectedEmployee}
            onChange={(_, newValue) => {
              setSelectedEmployee(newValue)
              setFormData((prev) => ({
                ...prev,
                employee: newValue?.name || "",
                employee_id: newValue?.id || "",
              }))
            }}
            disabled={isReadOnly}
            renderInput={(params) => (
              <TextField {...params} label="Employee" required />
            )}
          />
        </Grid>

        {/* Dates */}
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Expense Date"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Submit Date"
            type="date"
            value={formData.submitDate}
            onChange={(e) => setFormData({ ...formData, submitDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            disabled={isReadOnly}
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            multiline
            rows={2}
            disabled={isReadOnly}
            placeholder="Describe the expense..."
          />
        </Grid>

        {/* Mileage Section */}
        {expenseType === "mileage" && (
          <>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <DirectionsCar color="primary" />
                  <Typography variant="h6">Mileage Details</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Distance (miles)"
                      type="number"
                      value={formData.mileage.distance}
                      onChange={(e) => {
                        const distance = parseFloat(e.target.value) || 0
                        setFormData((prev) => ({
                          ...prev,
                          mileage: { ...prev.mileage, distance },
                        }))
                      }}
                      disabled={isReadOnly}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Rate per Mile (£)"
                      type="number"
                      value={formData.mileage.rate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0
                        setFormData((prev) => ({
                          ...prev,
                          mileage: { ...prev.mileage, rate },
                        }))
                      }}
                      disabled={isReadOnly}
                      inputProps={{ min: 0, step: 0.01 }}
                      helperText="HMRC standard rate: £0.45/mile"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Total Mileage Claim: £{formData.mileage.total.toFixed(2)}
                    </Alert>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </>
        )}

        {/* Standard Amount */}
        {expenseType === "standard" && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              disabled={isReadOnly}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
        )}

        {/* Currency */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={isReadOnly}
            >
              <MenuItem value="GBP">GBP - British Pound</MenuItem>
              <MenuItem value="USD">USD - US Dollar</MenuItem>
              <MenuItem value="EUR">EUR - Euro</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Category and Department */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              disabled={isReadOnly}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              disabled={isReadOnly}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Account Selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Expense Account</InputLabel>
            <Select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              disabled={isReadOnly}
            >
              {expenseAccounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Payment Method */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Expense["payment_method"] })}
              disabled={isReadOnly}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Personal Card</MenuItem>
              <MenuItem value="company_card">Company Card</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="reimbursement">Reimbursement</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Tax Section */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Typography variant="subtitle1" gutterBottom>
              Tax Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Tax Rate</InputLabel>
                  <Select
                    value={formData.tax_rate_id}
                    onChange={(e) => setFormData({ ...formData, tax_rate_id: e.target.value })}
                    disabled={isReadOnly || !formData.is_taxable}
                  >
                    <MenuItem value="">No Tax</MenuItem>
                    {taxRates.map((tr) => (
                      <MenuItem key={tr.id} value={tr.id}>
                        {tr.name} ({tr.rate}%)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Tax Included?</InputLabel>
                  <Select
                    value={formData.tax_included ? "yes" : "no"}
                    onChange={(e) => setFormData({ ...formData, tax_included: e.target.value === "yes" })}
                    disabled={isReadOnly || !formData.is_taxable || !formData.tax_rate_id}
                  >
                    <MenuItem value="no">Tax Added</MenuItem>
                    <MenuItem value="yes">Tax Included</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Taxable?</InputLabel>
                  <Select
                    value={formData.is_taxable ? "yes" : "no"}
                    onChange={(e) => setFormData({ ...formData, is_taxable: e.target.value === "yes" })}
                    disabled={isReadOnly}
                  >
                    <MenuItem value="yes">Taxable</MenuItem>
                    <MenuItem value="no">Non-Taxable</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.is_taxable && formData.tax_rate_id && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Tax Amount: £{taxAmount.toFixed(2)} | Total: £{totalAmount.toFixed(2)}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Receipt Upload */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Receipts
            </Typography>
            {!isReadOnly && (
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  id="receipt-upload"
                  type="file"
                  multiple
                  onChange={handleReceiptUpload}
                />
                <label htmlFor="receipt-upload">
                  <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                    Upload Receipt(s)
                  </Button>
                </label>
              </Box>
            )}
            {formData.receipt_urls && formData.receipt_urls.length > 0 && (
              <Box>
                {formData.receipt_urls.map((url, index) => (
                  <Chip
                    key={index}
                    label={url.split("/").pop() || `Receipt ${index + 1}`}
                    onDelete={isReadOnly ? undefined : () => handleRemoveReceipt(index)}
                    sx={{ mr: 1, mb: 1 }}
                    icon={<CloudUpload />}
                  />
                ))}
              </Box>
            )}
            {(!formData.receipt_urls || formData.receipt_urls.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                No receipts uploaded
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Additional Fields */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Project Code"
            value={formData.project_code}
            onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Client Name"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            disabled={isReadOnly}
          />
        </Grid>

        <Grid item xs={12}>
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

        {/* Totals */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}></Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography>Amount:</Typography>
                  <Typography>£{formData.amount.toFixed(2)}</Typography>
                </Box>
                {formData.is_taxable && formData.tax_rate_id && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography>Tax:</Typography>
                    <Typography>£{taxAmount.toFixed(2)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" sx={{ color: themeConfig.brandColors.navy }}>
                    £{totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
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
                {mode === "create" ? "Submit Expense" : "Save Changes"}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default ExpenseForm
