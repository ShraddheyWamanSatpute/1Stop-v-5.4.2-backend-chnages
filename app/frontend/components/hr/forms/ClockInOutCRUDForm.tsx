"use client"

import React, { useState } from 'react'
import {
  Box,
  Alert,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'

interface ClockEntry {
  id?: string
  employeeId: string
  clockIn: Date
  clockOut?: Date
  totalHours: number
  date: Date
  location?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface ClockInOutCRUDFormProps {
  clockEntry?: ClockEntry | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const ClockInOutCRUDForm: React.FC<ClockInOutCRUDFormProps> = ({
  mode,
  onSave
}) => {
  const [formData] = useState<ClockEntry>({
    employeeId: '',
    clockIn: new Date(),
    totalHours: 0,
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const handleSubmit = () => {
    onSave(formData)
  }

  const isReadOnly = mode === 'view'

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection title="Clock Entry" icon={<AccessTimeIcon />}>
          <Alert severity="info">
            Clock In/Out functionality is handled by the AttendanceCRUDForm
          </Alert>
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
              {mode === 'edit' ? 'Update Entry' : 'Create Entry'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default ClockInOutCRUDForm
