"use client"

import React, { useState, useEffect, useRef } from 'react'
import { debugWarn } from "../../../../utils/debugLog"
import {
  Box,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { BookingType, useBookings } from '../../../../backend/context/BookingsContext'

interface BookingTypeFormProps {
  bookingType?: BookingType | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const BookingTypeForm: React.FC<BookingTypeFormProps> = ({
  bookingType,
  mode,
  onSave
}) => {
  const { fetchPreorderProfiles } = useBookings()
  const [preorderProfiles, setPreorderProfiles] = useState<Array<{id: string, name: string}>>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2196f3',
    duration: 120,
    depositRequired: false,
    depositAmount: 0,
    depositPerPerson: false, // 'flat' or 'perGuest'
    autoSendDepositEmails: false,
    requireAuthenticationPayment: false,
    authenticationAmount: 0,
    authenticationAmountType: 'flat', // 'flat' or 'perGuest'
    autoSendAuthentication: false,
    requirePreorder: false,
    autoSendPreorders: false,
    allowPreorder: false,
    preorderProfileId: '',
    advanceBookingValue: 30,
    advanceBookingUnit: 'days',
    requiresApproval: false,
    allowOnlineBooking: true,
    requiresPhone: false,
    requiresEmail: true,
    tags: [] as string[]
  })

  // Track if we've already loaded to prevent duplicate calls
  const hasLoadedProfilesRef = useRef(false)
  
  // Load preorder profiles (only once, not on every fetchPreorderProfiles change)
  useEffect(() => {
    if (hasLoadedProfilesRef.current) return
    hasLoadedProfilesRef.current = true
    
    const loadPreorderProfiles = async () => {
      try {
        const profiles = await fetchPreorderProfiles()
        setPreorderProfiles(profiles || [])
      } catch (error) {
        debugWarn('Error loading preorder profiles:', error)
      }
    }
    loadPreorderProfiles()
  }, [fetchPreorderProfiles])

  useEffect(() => {
    if (bookingType) {
      setFormData({
        name: bookingType.name || '',
        description: bookingType.description || '',
        color: bookingType.color || '#2196f3',
        duration: bookingType.duration || 120,
        depositRequired: bookingType.depositRequired || false,
        depositAmount: bookingType.depositAmount || 0,
        depositPerPerson: bookingType.depositPerPerson || false,
        autoSendDepositEmails: bookingType.autoSendDepositEmails || false,
        requireAuthenticationPayment: false, // Custom field not in interface
        authenticationAmount: 0, // Custom field not in interface
        authenticationAmountType: 'flat', // Custom field not in interface
        autoSendAuthentication: false, // Custom field not in interface
        requirePreorder: false, // Custom field not in interface
        autoSendPreorders: bookingType.autoSendPreorders || false,
        allowPreorder: false, // Custom field not in interface
        preorderProfileId: bookingType.preorderProfileId || '',
        advanceBookingValue: bookingType.advanceBookingDays || 30,
        advanceBookingUnit: 'days',
        requiresApproval: bookingType.requiresApproval || false,
        allowOnlineBooking: bookingType.allowOnlineBooking !== false,
        requiresPhone: bookingType.requiresPhone || false,
        requiresEmail: bookingType.requiresEmail !== false,
        tags: bookingType.tags || []
      })
    }
  }, [bookingType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Type Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            disabled={isReadOnly}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            disabled={isReadOnly}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Preview:
            </Typography>
            <Chip 
              label={formData.name || 'Type Name'} 
              sx={{ 
                backgroundColor: formData.color,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
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
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 120 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 15, step: 15 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Advance Booking"
                type="number"
                value={formData.advanceBookingValue}
                onChange={(e) => setFormData(prev => ({ ...prev, advanceBookingValue: parseInt(e.target.value) || 0 }))}
                disabled={isReadOnly}
                sx={{ flex: 1 }}
                inputProps={{ min: 0 }}
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.advanceBookingUnit}
                  onChange={(e) => setFormData(prev => ({ ...prev, advanceBookingUnit: e.target.value }))}
                  disabled={isReadOnly}
                  label="Unit"
                >
                  <MenuItem value="hours">Hours</MenuItem>
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="weeks">Weeks</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.depositRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositRequired: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Deposit Required"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoSendDepositEmails}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoSendDepositEmails: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Auto Send Deposit Emails"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Deposit Amount"
              type="number"
              value={formData.depositAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Deposit Amount Type</InputLabel>
              <Select
                value={formData.depositPerPerson ? 'perGuest' : 'flat'}
                onChange={(e) => setFormData(prev => ({ ...prev, depositPerPerson: e.target.value === 'perGuest' }))}
                disabled={isReadOnly}
                label="Deposit Amount Type"
              >
                <MenuItem value="flat">Flat Amount</MenuItem>
                <MenuItem value="perGuest">Per Guest</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requireAuthenticationPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireAuthenticationPayment: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Require Authentication Payment"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoSendAuthentication}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoSendAuthentication: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Auto Send Authentication"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Authentication Amount"
              type="number"
              value={formData.authenticationAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, authenticationAmount: parseFloat(e.target.value) || 0 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Authentication Amount Type</InputLabel>
              <Select
                value={formData.authenticationAmountType}
                onChange={(e) => setFormData(prev => ({ ...prev, authenticationAmountType: e.target.value }))}
                disabled={isReadOnly}
                label="Authentication Amount Type"
              >
                <MenuItem value="flat">Flat Amount</MenuItem>
                <MenuItem value="perGuest">Per Guest</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requirePreorder}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirePreorder: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Require Preorder"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoSendPreorders}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoSendPreorders: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Auto Send Preorders"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Preorder Profile</InputLabel>
              <Select
                value={formData.preorderProfileId}
                onChange={(e) => setFormData(prev => ({ ...prev, preorderProfileId: e.target.value }))}
                disabled={isReadOnly}
                label="Preorder Profile"
              >
                <MenuItem value="">
                  <em>No Profile Selected</em>
                </MenuItem>
                {preorderProfiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresApproval}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Requires Approval"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowOnlineBooking}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowOnlineBooking: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Allow Online Booking"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresPhone: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Phone Required"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresEmail: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Email Required"
            />
          </Grid>
        </Grid>
      </Box>

    </Box>
  )
}

export default BookingTypeForm
