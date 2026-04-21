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
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material'
import {
  Lock as LockIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useCompany } from '../../../../backend/context/CompanyContext'
import { useSettings } from '../../../../backend/context/SettingsContext'
import type { PeriodLock } from '../../../../backend/interfaces/Finance'

interface PeriodLockFormProps {
  periodLock?: PeriodLock | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: Omit<PeriodLock, "id" | "created_at" | "updated_at">) => void
}

const PeriodLockForm: React.FC<PeriodLockFormProps> = ({
  periodLock,
  mode,
  onSave
}) => {
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()

  const [formData, setFormData] = useState({
    entity_id: companyState.companyID || '',
    period_type: 'month' as 'month' | 'quarter' | 'year',
    period_start: '',
    period_end: '',
    is_locked: true,
    locked_by: settingsState.auth?.uid || 'system',
    locked_at: new Date().toISOString(),
    reason: '',
  })

  useEffect(() => {
    if (periodLock) {
      setFormData({
        entity_id: periodLock.entity_id || companyState.companyID || '',
        period_type: periodLock.period_type || 'month',
        period_start: periodLock.period_start || '',
        period_end: periodLock.period_end || '',
        is_locked: periodLock.is_locked !== undefined ? periodLock.is_locked : true,
        locked_by: periodLock.locked_by || settingsState.auth?.uid || 'system',
        locked_at: periodLock.locked_at || new Date().toISOString(),
        reason: periodLock.reason || '',
      })
    } else {
      // Default to current month
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      setFormData(prev => ({
        ...prev,
        period_start: firstDay.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0],
      }))
    }
  }, [periodLock, companyState.companyID, settingsState.auth?.uid])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePeriodTypeChange = (type: 'month' | 'quarter' | 'year') => {
    const now = new Date()
    let start: Date, end: Date

    if (type === 'month') {
      const year = now.getFullYear()
      const month = now.getMonth()
      start = new Date(year, month, 1)
      end = new Date(year, month + 1, 0)
    } else if (type === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3)
      const year = now.getFullYear()
      start = new Date(year, quarter * 3, 1)
      end = new Date(year, (quarter + 1) * 3, 0)
    } else {
      const year = now.getFullYear()
      start = new Date(year, 0, 1)
      end = new Date(year, 11, 31)
    }

    setFormData(prev => ({
      ...prev,
      period_type: type,
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0],
    }))
  }

  const handleSubmit = () => {
    if (!formData.period_start || !formData.period_end) {
      alert('Please select a period start and end date')
      return
    }

    if (new Date(formData.period_start) > new Date(formData.period_end)) {
      alert('Period start date must be before end date')
      return
    }

    onSave({
      ...formData,
      locked_by: settingsState.auth?.uid || 'system',
      locked_at: new Date().toISOString(),
    })
  }

  const isReadOnly = mode === 'view'

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Period Lock Information" 
        icon={<LockIcon />}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          Locking a period prevents any journal entries from being created, edited, or deleted for that period. 
          This is typically done after closing a month, quarter, or year.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Period Type</InputLabel>
              <Select
                value={formData.period_type}
                onChange={(e) => handlePeriodTypeChange(e.target.value as 'month' | 'quarter' | 'year')}
                label="Period Type"
                disabled={isReadOnly}
              >
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="quarter">Quarter</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Period Start"
              type="date"
              value={formData.period_start}
              onChange={(e) => handleChange('period_start', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Period End"
              type="date"
              value={formData.period_end}
              onChange={(e) => handleChange('period_end', e.target.value)}
              required
              disabled={isReadOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reason for Locking"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g., Month-end close completed"
              multiline
              rows={2}
            />
          </Grid>

          {mode === 'edit' && (
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_locked}
                    onChange={(e) => handleChange('is_locked', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Period is Locked"
              />
            </Grid>
          )}
        </Grid>
      </FormSection>

      {!isReadOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!formData.period_start || !formData.period_end}
            style={{
              padding: '12px 24px',
              backgroundColor: (!formData.period_start || !formData.period_end) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!formData.period_start || !formData.period_end) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {mode === 'edit' ? 'Update Period Lock' : 'Lock Period'}
          </button>
        </Box>
      )}
    </Box>
  )
}

export default PeriodLockForm
