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
  Alert,
  Avatar,
  Card,
  CardContent,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { differenceInDays, format } from 'date-fns'
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as PendingIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface TimeOffRequest {
  id?: string
  employeeId: string
  type: 'holiday' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'other'
  startDate: Date
  endDate: Date
  totalDays: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approvedBy?: string
  approvedDate?: Date
  rejectionReason?: string
  emergencyContact?: string
  medicalCertificate?: boolean
  coveringEmployee?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface TimeOffCRUDFormHandle {
  submit: () => void
}

interface TimeOffCRUDFormProps {
  timeOffRequest?: TimeOffRequest | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
  employees?: any[]
  restrictToEmployeeId?: string
  isEmployeeSelfService?: boolean
}

const TimeOffCRUDForm = React.forwardRef<TimeOffCRUDFormHandle, TimeOffCRUDFormProps>(
  ({ timeOffRequest, mode, onSave, employees: employeesProp, restrictToEmployeeId, isEmployeeSelfService = false }, ref) => {
    const { state: hrState } = useHR()

    // Use employees from props if provided, otherwise from hrState
    let employees = employeesProp || hrState.employees || []
    if (restrictToEmployeeId) {
      employees = employees.filter((emp: any) => emp.id === restrictToEmployeeId)
    }

    const [formData, setFormData] = useState<TimeOffRequest>({
      employeeId: '',
      type: 'holiday',
      startDate: new Date(),
      endDate: new Date(),
      totalDays: 1,
      status: 'pending',
      medicalCertificate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update form data when timeOffRequest prop changes
    useEffect(() => {
      if (timeOffRequest) {
        setFormData({
          ...timeOffRequest,
          startDate: new Date(timeOffRequest.startDate),
          endDate: new Date(timeOffRequest.endDate),
          approvedDate: timeOffRequest.approvedDate ? new Date(timeOffRequest.approvedDate) : undefined,
          createdAt: new Date(timeOffRequest.createdAt),
          updatedAt: new Date(timeOffRequest.updatedAt),
        })
      }
    }, [timeOffRequest])

    // Auto-calculate total days when dates change
    useEffect(() => {
      if (formData.startDate && formData.endDate) {
        const days = differenceInDays(formData.endDate, formData.startDate) + 1
        setFormData((prev) => ({
          ...prev,
          totalDays: Math.max(1, days),
        }))
      }
    }, [formData.startDate, formData.endDate])

    const handleChange = (field: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        updatedAt: new Date(),
      }))
    }

    const isReadOnly = mode === 'view'
    const canApprove = mode === 'edit' && formData.status === 'pending' && !isEmployeeSelfService

    // Get selected employee details
    const selectedEmployee = employees?.find((emp: any) => emp.id === formData.employeeId)
    const approverEmployee = employees?.find((emp: any) => emp.id === formData.approvedBy)
    const coveringEmployee = employees?.find((emp: any) => emp.id === formData.coveringEmployee)

    // Convert to RTDB-friendly payload and call onSave
    const submit = useCallback(() => {
      if (isReadOnly) return
      if (!formData.employeeId) {
        alert('Please select an employee')
        return
      }

      const submissionData = {
        ...formData,
        employeeId: formData.employeeId,
        startDate: formData.startDate instanceof Date ? formData.startDate.getTime() : new Date(formData.startDate).getTime(),
        endDate: formData.endDate instanceof Date ? formData.endDate.getTime() : new Date(formData.endDate).getTime(),
        approvedDate: formData.approvedDate
          ? (formData.approvedDate instanceof Date ? formData.approvedDate.getTime() : new Date(formData.approvedDate).getTime())
          : undefined,
        createdAt: formData.createdAt instanceof Date ? formData.createdAt.getTime() : new Date(formData.createdAt).getTime(),
        updatedAt: Date.now(),
      }

      onSave(submissionData)
    }, [formData, isReadOnly, onSave])

    useImperativeHandle(ref, () => ({ submit }), [submit])

    // Legacy window hook (still used by some flows)
    useEffect(() => {
      if (mode !== 'view') {
        ;(window as any).__timeOffFormSubmit = submit
      }
      return () => {
        delete (window as any).__timeOffFormSubmit
      }
    }, [mode, submit])

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved':
          return 'success'
        case 'rejected':
          return 'error'
        case 'cancelled':
          return 'default'
        default:
          return 'warning'
      }
    }

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'approved':
          return <CheckIcon fontSize="small" />
        case 'rejected':
          return <CancelIcon fontSize="small" />
        default:
          return <PendingIcon fontSize="small" />
      }
    }

    const formatType = (text: string) =>
      text
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    // View Mode Layout
    if (isReadOnly) {
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">
                {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : `Employee ${formData.employeeId}`} -{' '}
                {formatType(formData.type)}
              </Typography>
              <Chip
                icon={getStatusIcon(formData.status)}
                label={formatType(formData.status)}
                color={getStatusColor(formData.status) as any}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Request Information
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Start Date
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">{format(new Date(formData.startDate), 'MMM d, yyyy')}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          End Date
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">{format(new Date(formData.endDate), 'MMM d, yyyy')}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Days
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">{formData.totalDays} days</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Status Information
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Requested
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">{format(new Date(formData.createdAt), 'MMM d, yyyy')}</Typography>
                      </Grid>
                      {approverEmployee && formData.approvedDate && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Approved By
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2">
                              {approverEmployee.firstName} {approverEmployee.lastName}
                            </Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Reason
                    </Typography>
                    <Typography variant="body2">{formData.reason || 'No reason provided'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </LocalizationProvider>
      )
    }

    // Edit/Create Mode Layout
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ width: '100%' }}>
          <FormSection title="Request Information" icon={<PersonIcon />}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={isEmployeeSelfService || isReadOnly}>
                  <InputLabel>Employee</InputLabel>
                  <Select value={formData.employeeId} onChange={(e) => handleChange('employeeId', e.target.value)} label="Employee">
                    <MenuItem value="">
                      <em>Select an employee</em>
                    </MenuItem>
                    {employees?.map((employee: any) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.department || 'No department'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={isReadOnly}>
                  <InputLabel>Request Type</InputLabel>
                  <Select value={formData.type} onChange={(e) => handleChange('type', e.target.value)} label="Request Type">
                    <MenuItem value="holiday">Annual Leave</MenuItem>
                    <MenuItem value="sick">Sick Leave</MenuItem>
                    <MenuItem value="personal">Personal Leave</MenuItem>
                    <MenuItem value="maternity">Maternity Leave</MenuItem>
                    <MenuItem value="paternity">Paternity Leave</MenuItem>
                    <MenuItem value="bereavement">Bereavement Leave</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => handleChange('startDate', date || new Date())}
                  disabled={isReadOnly}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => handleChange('endDate', date || new Date())}
                  disabled={isReadOnly}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Total Days" value={formData.totalDays} disabled helperText="Automatically calculated" />
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Request Details" icon={<CalendarIcon />}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Time Off"
                  multiline
                  rows={3}
                  value={formData.reason || ''}
                  onChange={(e) => handleChange('reason', e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Approval Status" icon={<AssignmentIcon />}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!canApprove}>
                  <InputLabel>Status</InputLabel>
                  <Select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} label="Status">
                    <MenuItem value="pending">Pending Approval</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  multiline
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>
            </Grid>
          </FormSection>

          {selectedEmployee && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={selectedEmployee.photo} sx={{ width: 48, height: 48 }}>
                  {selectedEmployee.firstName?.charAt(0)}
                  {selectedEmployee.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    <strong>
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.position || 'No position'} - {selectedEmployee.department || 'No department'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {coveringEmployee && (
            <Alert sx={{ mt: 2 }} severity="info">
              Covering employee: {coveringEmployee.firstName} {coveringEmployee.lastName}
            </Alert>
          )}
        </Box>
      </LocalizationProvider>
    )
  },
)

export default TimeOffCRUDForm

