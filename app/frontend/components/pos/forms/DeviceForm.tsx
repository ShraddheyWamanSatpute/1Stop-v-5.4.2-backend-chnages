"use client"

import React, { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
} from '@mui/material'
import {
  Devices as DeviceIcon,
  Router as RouterIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'

interface DeviceFormData {
  name: string
  type: 'pos_terminal' | 'tablet' | 'phone' | 'printer' | 'cash_drawer' | 'scanner' | 'router' | 'other'
  model: string
  serialNumber: string
  ipAddress: string
  macAddress: string
  location: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  isActive: boolean
  lastSeen?: number
}

interface DeviceFormProps {
  device?: any // Existing device for edit mode
  mode: 'create' | 'edit' | 'view'
  onSave: (formData: any) => void
}

const DeviceForm: React.FC<DeviceFormProps> = ({
  device,
  mode,
  onSave,
}) => {

  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    type: 'pos_terminal',
    model: '',
    serialNumber: '',
    ipAddress: '',
    macAddress: '',
    location: '',
    status: 'offline',
    isActive: true,
  })

  // Initialize form data when device changes
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || '',
        type: device.type || 'pos_terminal',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        ipAddress: device.ipAddress || '',
        macAddress: device.macAddress || '',
        location: device.location || '',
        status: device.status || 'offline',
        isActive: device.isActive ?? true,
        lastSeen: device.lastSeen,
      })
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        type: 'pos_terminal',
        model: '',
        serialNumber: '',
        ipAddress: '',
        macAddress: '',
        location: '',
        status: 'offline',
        isActive: true,
      })
    }
  }, [device])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success'
      case 'offline':
        return 'default'
      case 'maintenance':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>

      {/* Basic Information */}
      <FormSection
        title="Device Information"
        subtitle="Basic device details"
        icon={<DeviceIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Device Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isReadOnly}
              required
              placeholder="e.g., Main POS Terminal, Receipt Printer"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Device Type</InputLabel>
              <Select
                value={formData.type}
                label="Device Type"
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="pos_terminal">POS Terminal</MenuItem>
                <MenuItem value="tablet">Tablet</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="printer">Printer</MenuItem>
                <MenuItem value="cash_drawer">Cash Drawer</MenuItem>
                <MenuItem value="scanner">Scanner</MenuItem>
                <MenuItem value="router">Router</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Model"
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., iPad Pro, Epson TM-T20"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => handleInputChange('serialNumber', e.target.value)}
              disabled={isReadOnly}
              placeholder="Device serial number"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={isReadOnly}
              placeholder="Physical location of device"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      {/* Network Configuration */}
      <FormSection
        title="Network Configuration"
        subtitle="Network and connectivity settings"
        icon={<RouterIcon />}
        collapsible
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="IP Address"
              value={formData.ipAddress}
              onChange={(e) => handleInputChange('ipAddress', e.target.value)}
              disabled={isReadOnly}
              placeholder="192.168.1.100"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="MAC Address"
              value={formData.macAddress}
              onChange={(e) => handleInputChange('macAddress', e.target.value)}
              disabled={isReadOnly}
              placeholder="00:11:22:33:44:55"
            />
          </Grid>
        </Grid>
      </FormSection>

      {/* Status Information for View Mode */}
      {mode === 'view' && (
        <FormSection
          title="Status Information"
          subtitle="Current device status and activity"
          icon={<DeviceIcon />}
        >
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Current Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.status}
                  color={getStatusColor(formData.status) as any}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={formData.isActive ? 'Yes' : 'No'}
                  color={formData.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
            {formData.lastSeen && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Last Seen
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(formData.lastSeen).toLocaleString()}
                </Typography>
              </Grid>
            )}
            {device?.createdAt && (
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Added
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(device.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </FormSection>
      )}
    </Box>
  )
}

export default DeviceForm

