"use client"

import React, { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip,
  Divider,
  Alert,
  Button,
} from '@mui/material'
import { useHRContext } from '../../../../backend/context/HRContext'

interface BulkScheduleFormProps {
  onSubmit: (data: BulkScheduleData) => Promise<void>
  loading?: boolean
}

interface BulkScheduleData {
  selectedEmployees: string[]
  selectedDays: number[]
  startTime: string
  endTime: string
  department?: string
  role?: string
  notes?: string
  shiftType: "regular" | "holiday" | "off" | "training"
  payType: "hourly" | "flat"
  payRate?: number
  groupBy: "none" | "department" | "role"
}

const BulkScheduleForm: React.FC<BulkScheduleFormProps> = ({
  onSubmit,
  loading = false
}) => {
  const { state: hrState } = useHRContext()
  
  // Form state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri by default
  const [groupBy, setGroupBy] = useState<"none" | "department" | "role">("none")
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "17:00",
    department: "",
    role: "",
    notes: "",
    shiftType: "regular" as const,
    payType: "hourly" as const,
    payRate: 0,
  })

  // Derived data
  const departments = hrState.departments || []
  const roles = hrState.roles || []
  const employees = hrState.employees || []

  // Filter employees based on groupBy selection
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => emp.status === "active" || (emp as any).isActive === true)
    
    if (groupBy === "department" && formData.department) {
      filtered = filtered.filter(emp => emp.department === formData.department)
    }
    
    if (groupBy === "role" && formData.role) {
      filtered = filtered.filter(emp => emp.roleId === formData.role)
    }
    
    return filtered
  }, [employees, groupBy, formData.department, formData.role])

  // Day names for display
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  // Handle employee selection
  const handleEmployeeToggle = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }, [])

  // Handle day selection
  const handleDayToggle = useCallback((dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(day => day !== dayIndex)
        : [...prev, dayIndex]
    )
  }, [])

  // Handle form data changes
  const handleFormDataChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    if (selectedEmployees.length === 0 || selectedDays.length === 0) return 0
    
    const startTime = new Date(`2000-01-01T${formData.startTime}`)
    const endTime = new Date(`2000-01-01T${formData.endTime}`)
    const hoursPerShift = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    
    let totalCost = 0
    selectedEmployees.forEach(empId => {
      const employee = employees.find(emp => emp.id === empId)
      if (employee) {
        const hourlyRate = employee.hourlyRate || 0
        totalCost += hourlyRate * hoursPerShift * selectedDays.length
      }
    })
    
    return totalCost
  }, [selectedEmployees, selectedDays, formData.startTime, formData.endTime, employees])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (selectedEmployees.length === 0) {
      return
    }

    const bulkData: BulkScheduleData = {
      selectedEmployees,
      selectedDays,
      startTime: formData.startTime,
      endTime: formData.endTime,
      department: formData.department,
      role: formData.role,
      notes: formData.notes,
      shiftType: formData.shiftType,
      payType: formData.payType,
      payRate: formData.payRate,
      groupBy,
    }

    await onSubmit(bulkData)
  }, [selectedEmployees, selectedDays, formData, groupBy, onSubmit])

  return (
    <Box sx={{ p: 2 }}>
      {/* Group By Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Group Selection
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Group By</InputLabel>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            label="Group By"
          >
            <MenuItem value="none">All Employees</MenuItem>
            <MenuItem value="department">Department</MenuItem>
            <MenuItem value="role">Role</MenuItem>
          </Select>
        </FormControl>

        {groupBy === "department" && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department}
              onChange={(e) => handleFormDataChange("department", e.target.value)}
              label="Department"
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.name}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {groupBy === "role" && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              onChange={(e) => handleFormDataChange("role", e.target.value)}
              label="Role"
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.label || role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Employee Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Employees ({selectedEmployees.length} selected)
        </Typography>
        <List sx={{ maxHeight: 200, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
          {filteredEmployees.map((employee) => (
            <ListItem key={employee.id} disablePadding>
              <ListItemButton
                onClick={() => handleEmployeeToggle(employee.id)}
                dense
              >
                <Checkbox
                  checked={selectedEmployees.includes(employee.id)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText
                  primary={`${employee.firstName} ${employee.lastName}`}
                  secondary={`${employee.department || "No Department"} • ${employee.roleId ? (roles.find(r => r.id === employee.roleId)?.label || roles.find(r => r.id === employee.roleId)?.name || "No Role") : "No Role"}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Day Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Days
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {dayNames.map((day, index) => (
            <Chip
              key={index}
              label={day}
              clickable
              color={selectedDays.includes(index) ? "primary" : "default"}
              onClick={() => handleDayToggle(index)}
            />
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Schedule Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Schedule Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleFormDataChange("startTime", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleFormDataChange("endTime", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Shift Type</InputLabel>
              <Select
                value={formData.shiftType}
                onChange={(e) => handleFormDataChange("shiftType", e.target.value)}
                label="Shift Type"
              >
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="off">Off</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Pay Type</InputLabel>
              <Select
                value={formData.payType}
                onChange={(e) => handleFormDataChange("payType", e.target.value)}
                label="Pay Type"
              >
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="flat">Flat Rate</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => handleFormDataChange("notes", e.target.value)}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Cost Estimation */}
      {estimatedCost > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Estimated Cost: £{estimatedCost.toFixed(2)} ({selectedEmployees.length} employees × {selectedDays.length} days)
        </Alert>
      )}

      {/* Submit Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || selectedEmployees.length === 0 || selectedDays.length === 0}
        >
          {loading ? "Creating Schedules..." : `Create ${selectedEmployees.length * selectedDays.length} Schedules`}
        </Button>
      </Box>
    </Box>
  )
}

export default BulkScheduleForm
