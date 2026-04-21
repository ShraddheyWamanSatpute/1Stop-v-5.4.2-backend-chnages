"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Warning as CorrectionIcon,
  Delete as VoidIcon,
  DeleteSweep as WasteIcon,
  Edit as EditIcon,
  Undo as UndoIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface CorrectionFormData {
  name: string
  type: 'void' | 'waste' | 'edit' | 'refund' | 'discount'
  description?: string
  reason: string
  amount?: number
  billId?: string
  itemId?: string
  staffId: string
  approvedBy?: string
  timestamp: number
}

interface CorrectionFormProps {
  open: boolean
  onClose: () => void
  correction?: any // Existing correction for edit/view mode
  mode: 'create' | 'edit' | 'view'
  billId?: string // Pre-fill bill ID for corrections from bill view
  onSave?: (formData: any) => void
  itemId?: string // Pre-fill item ID for item-specific corrections
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const CorrectionForm: React.FC<CorrectionFormProps> = ({
  open,
  onClose,
  correction,
  mode,
  billId,
  itemId,
  onSave,
  onModeChange,
}) => {
  const location = useLocation()
  const { createCorrection, updateCorrection } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<CorrectionFormData>({
    name: '',
    type: 'void',
    description: '',
    reason: '',
    amount: 0,
    billId: billId || '',
    itemId: itemId || '',
    staffId: 'current-staff', // Would get from auth context - would use useSettings().state.auth?.uid
    timestamp: Date.now(),
  })

  // Initialize form data when correction changes
  useEffect(() => {
    if (correction && open) {
      setFormData({
        name: correction.name || '',
        type: correction.type || 'void',
        description: correction.description || '',
        reason: correction.reason || '',
        amount: correction.amount || 0,
        billId: correction.billId || billId || '',
        itemId: correction.itemId || itemId || '',
        staffId: correction.staffId || 'current-staff',
        approvedBy: correction.approvedBy,
        timestamp: correction.timestamp || Date.now(),
      })
    } else if (!correction && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'void',
        description: '',
        reason: '',
        amount: 0,
        billId: billId || '',
        itemId: itemId || '',
        staffId: 'current-staff',
        timestamp: Date.now(),
      })
    }
    setError(null)
    setSuccess(null)
  }, [correction, open, billId, itemId])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Correction name is required')
      return
    }

    if (!formData.reason.trim()) {
      setError('Reason is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (onSave) {
        // Use external onSave handler
        await onSave(formData)
        setSuccess('Correction saved successfully!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        // Use internal context methods
        if (mode === 'create') {
          await createCorrection(formData as any)
          setSuccess('Correction recorded successfully!')
        } else if (mode === 'edit') {
          await updateCorrection(correction.id, formData as any)
          setSuccess('Correction updated successfully!')
        }

        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(mode === 'create' ? 'Failed to record correction' : 'Failed to update correction')
      console.error('Error saving correction:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Record New Correction'
      case 'edit':
        return 'Edit Correction'
      case 'view':
        return 'View Correction'
      default:
        return 'Correction'
    }
  }

  const getCorrectionTypeIcon = (type: string) => {
    switch (type) {
      case 'void':
        return <VoidIcon />
      case 'waste':
        return <WasteIcon />
      case 'edit':
        return <EditIcon />
      case 'refund':
        return <UndoIcon />
      default:
        return <CorrectionIcon />
    }
  }

  const getCorrectionTypeColor = (type: string) => {
    switch (type) {
      case 'void':
        return 'error'
      case 'waste':
        return 'warning'
      case 'edit':
        return 'info'
      case 'refund':
        return 'success'
      default:
        return 'default'
    }
  }

  const isReadOnly = mode === 'view'

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "correctionFormModal1",
            crudMode: mode,
          }}
          title={getTitle()}
          subtitle={mode === 'view' ? `${formData.type.toUpperCase()} - ${formData.name}` : undefined}
          icon={getCorrectionTypeIcon(formData.type)}
          mode={mode}
          onEdit={() => {
        if (onModeChange) onModeChange("edit")
        else onClose()
      }}
          onSave={async (...args) => {
            const __workspaceOnSave = async () => {
        await handleSubmit()
      }
            if (typeof __workspaceOnSave !== "function") return undefined
            const result = await __workspaceOnSave(...args)
            removeWorkspaceFormDraft(location.pathname, {
              crudEntity: "correctionFormModal1",
              crudMode: mode,
            })
            return result
          }}
          maxWidth="md"
          loading={loading}
          disabled={loading || (mode !== "view" && (!formData.name.trim() || !formData.reason.trim()))}
        >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Correction Details */}
      <FormSection
        title="Correction Details"
        subtitle="What needs to be corrected"
        icon={<CorrectionIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Correction Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Void Coffee Order, Mark Sandwich as Waste"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="void">Void</MenuItem>
                <MenuItem value="waste">Waste</MenuItem>
                <MenuItem value="edit">Edit</MenuItem>
                <MenuItem value="refund">Refund</MenuItem>
                <MenuItem value="discount">Discount</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={3}
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="Explain why this correction is needed..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Additional details about the correction..."
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Transaction References */}
      <FormSection
        title="Transaction References"
        subtitle="Link to affected bill or item"
        icon={<ReceiptIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bill ID"
              value={formData.billId}
              onChange={(e) => handleInputChange('billId', e.target.value)}
              disabled={isReadOnly}
              placeholder="Related bill ID"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Item ID"
              value={formData.itemId}
              onChange={(e) => handleInputChange('itemId', e.target.value)}
              disabled={isReadOnly}
              placeholder="Specific item ID if applicable"
            />
          </Grid>
          {(formData.type === 'refund' || formData.type === 'discount') && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount (£)"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                disabled={isReadOnly}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
          )}
        </Grid>
      </FormSection>

      {/* Staff Information */}
      <FormSection
        title="Staff Information"
        subtitle="Who is performing this correction"
        icon={<PersonIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Staff ID"
              value={formData.staffId}
              onChange={(e) => handleInputChange('staffId', e.target.value)}
              disabled={isReadOnly}
              placeholder="Staff member performing correction"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Approved By"
              value={formData.approvedBy || ''}
              onChange={(e) => handleInputChange('approvedBy', e.target.value)}
              disabled={isReadOnly}
              placeholder="Manager approval (if required)"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Correction Summary"
          subtitle="Complete correction details"
          icon={<TimeIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Type
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.type}
                  color={getCorrectionTypeColor(formData.type) as any}
                  size="small"
                  icon={getCorrectionTypeIcon(formData.type)}
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.amount ? `£${formData.amount.toFixed(2)}` : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Timestamp
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {new Date(formData.timestamp).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default CorrectionForm

