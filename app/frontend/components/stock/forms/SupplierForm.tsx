"use client"

import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import type { Supplier } from '../../../../backend/context/StockContext'

interface Contact {
  name: string
  email: string
  phone: string
  role: string
}

interface SupplierFormProps {
  supplier?: Supplier | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  onCancel?: () => void
  onFormDataChange?: (data: any) => void
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  supplier,
  mode,
  onSave,
  onFormDataChange,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ref: '',
    orderUrl: '',
    description: '',
    active: true
  })

  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        address: supplier.address || '',
        ref: supplier.ref || '',
        orderUrl: supplier.orderUrl || '',
        description: supplier.description || '',
        active: supplier.active !== false
      })
      setContacts((supplier.contacts || []).map(contact => ({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || contact.number || '',
        role: 'Contact'
      })))
    }
  }, [supplier])

  // Notify parent of form data changes (for modal save buttons)
  useEffect(() => {
    onFormDataChange?.({
      ...formData,
      contacts,
    })
  }, [formData, contacts, onFormDataChange])

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', email: '', phone: '', role: '' }])
  }

  const handleUpdateContact = (index: number, field: keyof Contact, value: string) => {
    const updatedContacts = [...contacts]
    updatedContacts[index] = { ...updatedContacts[index], [field]: value }
    setContacts(updatedContacts)
  }

  const handleRemoveContact = (index: number) => {
    const updatedContacts = contacts.filter((_, i) => i !== index)
    setContacts(updatedContacts)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      contacts
    })
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <FormSection title="Supplier Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Reference Code"
              value={formData.ref}
              onChange={(e) => setFormData(prev => ({ ...prev, ref: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={isReadOnly}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Order URL"
              value={formData.orderUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, orderUrl: e.target.value }))}
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
          <Grid item xs={12}>
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
        </Grid>
      </FormSection>

      <FormSection title="Contacts">
        {!isReadOnly && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddContact}
            >
              Add Contact
            </Button>
          </Box>
        )}
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                {!isReadOnly && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((contact, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {isReadOnly ? (
                      contact.name
                    ) : (
                      <TextField
                        size="small"
                        value={contact.name}
                        onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
                        fullWidth
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      contact.email
                    ) : (
                      <TextField
                        size="small"
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleUpdateContact(index, 'email', e.target.value)}
                        fullWidth
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      contact.phone
                    ) : (
                      <TextField
                        size="small"
                        value={contact.phone}
                        onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                        fullWidth
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      contact.role
                    ) : (
                      <TextField
                        size="small"
                        value={contact.role}
                        onChange={(e) => handleUpdateContact(index, 'role', e.target.value)}
                        fullWidth
                      />
                    )}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveContact(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No contacts added yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </FormSection>
    </Box>
  )
}

export default SupplierForm
