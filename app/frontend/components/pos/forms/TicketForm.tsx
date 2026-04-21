"use client"

import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material'
import {
  ConfirmationNumber as TicketIcon,
  QrCode as QrCodeIcon,
  AttachMoney as MoneyIcon,
  Edit,
  Delete,
  Save as SaveIcon,
} from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from '../../reusable/CRUDModal'
import FormSection from '../../reusable/FormSection'
import { usePOS } from '../../../../backend/context/POSContext'

interface TicketFormData {
  name: string
  description: string
  price: number
  isActive: boolean
  qrCode?: string
}

interface TicketFormProps {
  open: boolean
  onClose: () => void
  ticket?: any // Existing ticket for edit mode
  mode: 'create' | 'edit' | 'view'
  onModeChange?: (mode: 'create' | 'edit' | 'view') => void
}

const TicketForm: React.FC<TicketFormProps> = ({
  open,
  onClose: onRequestClose,
  ticket,
  mode,
  onModeChange,
}) => {
  const location = useLocation()
  const { createTicket, updateTicket } = usePOS()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<TicketFormData>({
    name: '',
    description: '',
    price: 0,
    isActive: true,
    qrCode: '',
  })

  // Initialize form data when ticket changes
  useEffect(() => {
    if (ticket && open) {
      setFormData({
        name: ticket.name || '',
        description: ticket.description || '',
        price: ticket.price || 0,
        isActive: ticket.isActive ?? true,
        qrCode: ticket.qrCode || '',
      })
    } else if (!ticket && open) {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        price: 0,
        isActive: true,
        qrCode: '',
      })
    }
    setError(null)
    setSuccess(null)
  }, [ticket, open])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Ticket name is required')
      return
    }

    if (formData.price <= 0) {
      setError('Ticket price must be greater than 0')
      return
    }

    const modeSnapshot = mode
    const ticketSnapshot = ticket
    try {
      setLoading(true)
      setError(null)

      const ticketData = {
        ...formData,
        qrCode: formData.qrCode || `ticket-${Date.now()}`,
      }

      if (mode === 'create') {
        await createTicket(ticketData)
        setSuccess('Ticket created successfully!')
      } else if (mode === 'edit') {
        await updateTicket(ticket.id, ticketData)
        setSuccess('Ticket updated successfully!')
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "posTicket",
        crudMode: modeSnapshot,
        id: ticketSnapshot?.id,
        itemLabel: formData.name?.trim() || ticketSnapshot?.name || undefined,
      })

      setTimeout(() => {
        onRequestClose()
      }, 1500)
    } catch (err) {
      setError(mode === 'create' ? 'Failed to create ticket' : 'Failed to update ticket')
      console.error('Error saving ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New Ticket'
      case 'edit':
        return 'Edit Ticket'
      case 'view':
        return 'View Ticket'
      default:
        return 'Ticket'
    }
  }

  const isReadOnly = mode === 'view'

  return (
    <CRUDModal
      open={open}
      onClose={(reason) => {
        onRequestClose()
        if (isCrudModalHardDismiss(reason)) {
          setError(null)
          setSuccess(null)
        }
      }}
      workspaceFormShortcut={{
        crudEntity: "posTicket",
        crudMode: mode,
        id: ticket?.id,
        itemLabel: formData.name?.trim() || ticket?.name || undefined,
      }}
      title={getTitle()}
      subtitle={mode === 'view' ? formData.name : undefined}
      icon={<TicketIcon />}
      maxWidth="md"
      mode={mode}
      loading={loading}
      disabled={loading || (mode !== "view" && (!formData.name.trim() || formData.price <= 0))}
      onSave={async () => {
        await handleSubmit()
      }}
      onEdit={() => {
        if (onModeChange) onModeChange("edit")
        else onRequestClose()
      }}
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

      {/* Basic Information */}
      <FormSection
        title="Ticket Information"
        subtitle="Basic ticket details"
        icon={<TicketIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Ticket Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., VIP Access Pass"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Price (£)"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', Number(e.target.value))}
              disabled={isReadOnly}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe what this ticket provides access to..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label="Active (available for sale)"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* QR Code Section */}
      {(formData.qrCode || mode === 'view') && (
        <FormSection
          title="QR Code"
          subtitle="Ticket identification and validation"
          icon={<QrCodeIcon />}
          collapsible
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="QR Code"
                value={formData.qrCode || (mode === 'create' ? `ticket-${Date.now()}` : '')}
                onChange={(e) => handleInputChange('qrCode', e.target.value)}
                disabled={isReadOnly}
                helperText="Unique identifier for this ticket"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              {(formData.qrCode || mode === 'create') && (
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'grey.50',
                  }}
                >
                  <QRCodeSVG
                    value={formData.qrCode || `ticket-${Date.now()}`}
                    size={120}
                    level="M"
                    includeMargin
                  />
                </Paper>
              )}
            </Grid>
          </Grid>
        </FormSection>
      )}

      {/* Summary Section for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Summary"
          subtitle="Ticket overview"
          icon={<MoneyIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Price
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                £{formData.price.toFixed(2)}
              </Typography>
            </Grid>
            {ticket?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
            {ticket?.updatedAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </CRUDModal>
  )
}

export default TicketForm
