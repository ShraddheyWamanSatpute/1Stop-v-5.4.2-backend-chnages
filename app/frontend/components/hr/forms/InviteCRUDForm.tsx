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
  Typography,
  Button,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  PersonAdd as PersonAddIcon,
  Link as LinkIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface EmployeeInvite {
  id?: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  departmentId: string
  inviteCode: string
  inviteUrl: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expiryDate: Date
  sentDate: Date
  acceptedDate?: Date
  message?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface InviteCRUDFormProps {
  invite?: EmployeeInvite | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: EmployeeInvite & Record<string, unknown>) => void
}

const InviteCRUDForm: React.FC<InviteCRUDFormProps> = ({
  invite,
  mode,
  onSave
}) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<EmployeeInvite>({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    departmentId: '',
    inviteCode: '',
    inviteUrl: '',
    status: 'pending',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    sentDate: new Date(),
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  useEffect(() => {
    if (invite) {
      setFormData({
        ...invite,
        expiryDate: new Date(invite.expiryDate),
        sentDate: new Date(invite.sentDate),
        acceptedDate: invite.acceptedDate ? new Date(invite.acceptedDate) : undefined,
        createdAt: new Date(invite.createdAt),
        updatedAt: new Date(invite.updatedAt),
      })
    }
  }, [invite])

  const handleChange = <K extends keyof EmployeeInvite>(field: K, value: EmployeeInvite[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }))
  }

  const generateInviteCode = () => {
    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const origin = window.location.origin
    const basePath = '/app' // Match the basename in main.tsx
    const url = `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
    handleChange('inviteCode', code)
    handleChange('inviteUrl', url)
  }

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      expiryDate: formData.expiryDate.getTime(),
      sentDate: formData.sentDate.getTime(),
      acceptedDate: formData.acceptedDate?.getTime(),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection title="Invite Information" icon={<PersonAddIcon />}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.roleId}
                  onChange={(e) => handleChange('roleId', e.target.value)}
                  label="Role"
                >
                  {hrState.roles?.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.label || role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.departmentId}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                  label="Department"
                >
                  {hrState.departments?.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Expiry Date"
                value={formData.expiryDate}
                onChange={(date) => handleChange('expiryDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>
          </Grid>

          {mode === 'create' && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={generateInviteCode}
                disabled={isReadOnly}
              >
                Generate Invite Link
              </Button>
              {formData.inviteUrl && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Invite URL:</strong> {formData.inviteUrl}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </FormSection>

        {!isReadOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {mode === 'edit' ? 'Update Invite' : 'Send Invite'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default InviteCRUDForm
