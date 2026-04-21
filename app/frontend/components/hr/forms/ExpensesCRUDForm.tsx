"use client"

import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Chip,
  Paper,
  Avatar,
  Alert,
  Button,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  Assignment as AssignmentIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'
import { uploadFile } from '../../../../backend/services/Firebase'

interface ExpenseReport {
  id?: string
  employeeId: string
  title: string
  description: string
  category: 'travel' | 'meals' | 'accommodation' | 'transport' | 'office_supplies' | 'training' | 'client_entertainment' | 'other'
  amount: number
  currency: string
  expenseDate: Date
  submissionDate: Date
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
  approvedBy?: string
  approvedDate?: Date
  rejectionReason?: string
  receiptUrl?: string
  notes?: string
  businessPurpose: string
  clientName?: string
  projectCode?: string
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'company_card'
  reimbursementDate?: Date
  createdAt: Date
  updatedAt: Date
}

interface ExpensesCRUDFormProps {
  expenseReport?: ExpenseReport | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface ExpensesCRUDFormHandle {
  submit: () => void
}

const ExpensesCRUDForm = React.forwardRef<ExpensesCRUDFormHandle, ExpensesCRUDFormProps>(({
  expenseReport,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<ExpenseReport>({
    employeeId: '',
    title: '',
    description: '',
    category: 'other',
    amount: 0,
    currency: 'GBP',
    expenseDate: new Date(),
    submissionDate: new Date(),
    status: 'draft',
    businessPurpose: '',
    paymentMethod: 'card',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Update form data when expenseReport prop changes
  useEffect(() => {
    if (expenseReport) {
      setFormData({
        ...expenseReport,
        expenseDate: new Date(expenseReport.expenseDate),
        submissionDate: new Date(expenseReport.submissionDate),
        approvedDate: expenseReport.approvedDate ? new Date(expenseReport.approvedDate) : undefined,
        reimbursementDate: expenseReport.reimbursementDate ? new Date(expenseReport.reimbursementDate) : undefined,
        createdAt: new Date(expenseReport.createdAt),
        updatedAt: new Date(expenseReport.updatedAt),
      })
    }
  }, [expenseReport])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please upload an image or PDF file')
        return
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      setReceiptFile(file)
      handleChange('receiptUrl', '')
    }
  }

  const handleSubmit = useCallback(async () => {
    let receiptUrl = formData.receiptUrl

    if (receiptFile) {
      setUploadingReceipt(true)
      try {
        receiptUrl = await uploadFile(receiptFile, `hr/expense-receipts/${formData.employeeId || "unassigned"}`)
      } finally {
        setUploadingReceipt(false)
      }
    }

    const submissionData = {
      ...formData,
      receiptUrl,
      expenseDate: formData.expenseDate.getTime(),
      submissionDate: formData.submissionDate.getTime(),
      approvedDate: formData.approvedDate?.getTime(),
      reimbursementDate: formData.reimbursementDate?.getTime(),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave, receiptFile])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'
  const canApprove = mode === 'edit' && formData.status === 'submitted'

  // Get selected employee and approver details
  const selectedEmployee = hrState.employees?.find(emp => emp.id === formData.employeeId)
  const approverEmployee = hrState.employees?.find(emp => emp.id === formData.approvedBy)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success'
      case 'rejected': return 'error'
      case 'paid': return 'info'
      case 'submitted': return 'warning'
      default: return 'default'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'travel': return '✈️'
      case 'meals': return '🍽️'
      case 'accommodation': return '🏨'
      case 'transport': return '🚗'
      case 'office_supplies': return '📎'
      case 'training': return '📚'
      case 'client_entertainment': return '🎉'
      default: return '📋'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Expense Information" 
          icon={<ReceiptIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  label="Employee"
                >
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {hrState.employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department || 'No department'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expense Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Brief description of the expense"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="travel">
                    {getCategoryIcon('travel')} Travel
                  </MenuItem>
                  <MenuItem value="meals">
                    {getCategoryIcon('meals')} Meals & Entertainment
                  </MenuItem>
                  <MenuItem value="accommodation">
                    {getCategoryIcon('accommodation')} Accommodation
                  </MenuItem>
                  <MenuItem value="transport">
                    {getCategoryIcon('transport')} Transport
                  </MenuItem>
                  <MenuItem value="office_supplies">
                    {getCategoryIcon('office_supplies')} Office Supplies
                  </MenuItem>
                  <MenuItem value="training">
                    {getCategoryIcon('training')} Training & Development
                  </MenuItem>
                  <MenuItem value="client_entertainment">
                    {getCategoryIcon('client_entertainment')} Client Entertainment
                  </MenuItem>
                  <MenuItem value="other">
                    {getCategoryIcon('other')} Other
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', Number(e.target.value))}
                required
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expense Date"
                value={formData.expenseDate}
                onChange={(date) => handleChange('expenseDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Personal Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="company_card">Company Card</MenuItem>
                </Select>
              </FormControl>
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
                placeholder="Detailed description of the expense..."
              />
            </Grid>
          </Grid>

          {selectedEmployee && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Employee Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={selectedEmployee.photo}
                  sx={{ width: 48, height: 48 }}
                >
                  {selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.position} - {selectedEmployee.department}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.email}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Business Details" 
          icon={<AssignmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Business Purpose"
                value={formData.businessPurpose}
                onChange={(e) => handleChange('businessPurpose', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="Explain the business purpose of this expense..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client Name (if applicable)"
                value={formData.clientName || ''}
                onChange={(e) => handleChange('clientName', e.target.value)}
                disabled={isReadOnly}
                placeholder="Client or customer name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Project Code (if applicable)"
                value={formData.projectCode || ''}
                onChange={(e) => handleChange('projectCode', e.target.value)}
                disabled={isReadOnly}
                placeholder="Internal project or cost center code"
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Receipt & Documentation" 
          icon={<CloudUploadIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {!isReadOnly && (
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    id="receipt-upload"
                    type="file"
                    onChange={handleReceiptUpload}
                  />
                  <label htmlFor="receipt-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mr: 2 }}
                      disabled={isReadOnly || uploadingReceipt}
                    >
                      {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                    </Button>
                  </label>
                  {receiptFile && (
                    <Typography variant="body2" color="text.secondary">
                      Selected: {receiptFile.name}
                    </Typography>
                  )}
                </Box>
              )}
              
              {formData.receiptUrl && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Receipt uploaded: {formData.receiptUrl.split('/').pop()}
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={isReadOnly}
                placeholder="Any additional notes or comments..."
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Approval Status" 
          icon={<AttachMoneyIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!canApprove}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => {
                    handleChange('status', e.target.value)
                    if (e.target.value === 'approved' || e.target.value === 'rejected') {
                      handleChange('approvedDate', new Date())
                    }
                  }}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {canApprove && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Approving Manager</InputLabel>
                  <Select
                    value={formData.approvedBy || ''}
                    onChange={(e) => handleChange('approvedBy', e.target.value)}
                    label="Approving Manager"
                  >
                    <MenuItem value="">
                      <em>Select approver</em>
                    </MenuItem>
                    {hrState.employees?.filter(emp => 
                      emp.position?.toLowerCase().includes('manager') || 
                      emp.position?.toLowerCase().includes('supervisor')
                    ).map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {formData.status === 'rejected' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Rejection Reason"
                  multiline
                  rows={3}
                  value={formData.rejectionReason || ''}
                  onChange={(e) => handleChange('rejectionReason', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Please provide a reason for rejection..."
                />
              </Grid>
            )}

            {formData.status === 'paid' && (
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Reimbursement Date"
                  value={formData.reimbursementDate || null}
                  onChange={(date) => handleChange('reimbursementDate', date)}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
            )}
          </Grid>

          {approverEmployee && formData.approvedDate && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'success.50' }}>
              <Typography variant="h6" gutterBottom>
                Approval Information
              </Typography>
              <Typography variant="body2">
                <strong>Approved by:</strong> {approverEmployee.firstName} {approverEmployee.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Approval Date:</strong> {formData.approvedDate.toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> 
                <Chip 
                  label={formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                  color={getStatusColor(formData.status) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              {formData.reimbursementDate && (
                <Typography variant="body2">
                  <strong>Reimbursed:</strong> {formData.reimbursementDate.toLocaleDateString()}
                </Typography>
              )}
            </Paper>
          )}
        </FormSection>

      </Box>
    </LocalizationProvider>
  )
})

export default ExpensesCRUDForm
