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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
} from '@mui/material'
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'
import type { Department } from '../../../../backend/interfaces/HRs'

interface DepartmentCRUDFormProps {
  department?: Department | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface DepartmentCRUDFormHandle {
  submit: () => void
}

const DepartmentCRUDForm = React.forwardRef<DepartmentCRUDFormHandle, DepartmentCRUDFormProps>(({
  department,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    isActive: true,
  })

  // Update form data when department prop changes
  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        description: department.description || '',
        managerId: department.managerId || '',
        isActive: department.isActive !== false,
      })
    }
  }, [department])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      employees: department?.employees || [],
      roles: department?.roles || [],
      createdAt: department?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    onSave(submissionData)
  }, [department?.createdAt, department?.employees, department?.roles, formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Get employees in this department
  const departmentEmployees = hrState.employees?.filter(emp => 
    emp.department === department?.name || emp.departmentId === department?.id
  ) || []

  // Get roles in this department
  const departmentRoles = hrState.roles?.filter(role => 
    role.department === department?.name || role.departmentId === department?.id
  ) || []

  // Get manager details
  const manager = hrState.employees?.find(emp => emp.id === formData.managerId)

  return (
    <Box sx={{ width: '100%' }}>
      <FormSection 
        title="Basic Information" 
        icon={<BusinessIcon />}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={isReadOnly}
              placeholder="e.g., Kitchen, Front of House, Management"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel>Manager</InputLabel>
              <Select
                value={formData.managerId}
                onChange={(e) => handleChange('managerId', e.target.value)}
                label="Manager"
              >
                <MenuItem value="">
                  <em>No Manager Assigned</em>
                </MenuItem>
                {hrState.employees?.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                    {employee.position && ` (${employee.position})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isReadOnly}
              placeholder="Describe the department's purpose and responsibilities..."
            />
          </Grid>
        </Grid>
      </FormSection>

      {manager && (
        <FormSection 
          title="Department Manager" 
          icon={<PersonIcon />}
        >
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={manager.photo}
                sx={{ width: 56, height: 56 }}
              >
                {manager.firstName?.charAt(0)}{manager.lastName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {manager.firstName} {manager.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.position || 'No position specified'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.phone}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </FormSection>
      )}

      {mode !== 'create' && (
        <>
          <FormSection 
            title={`Department Staff (${departmentEmployees.length})`}
            icon={<GroupIcon />}
          >
            {departmentEmployees.length > 0 ? (
              <List>
                {departmentEmployees.map((employee) => (
                  <ListItem key={employee.id} divider>
                    <ListItemAvatar>
                      <Avatar
                        src={employee.photo}
                        sx={{ width: 40, height: 40 }}
                      >
                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${employee.firstName} ${employee.lastName}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {employee.position || 'No position specified'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              size="small"
                              label={employee.status || 'active'}
                              color={
                                employee.status === 'active' ? 'success' :
                                employee.status === 'on_leave' ? 'warning' :
                                employee.status === 'terminated' ? 'error' : 'default'
                              }
                            />
                            <Chip
                              size="small"
                              label={employee.employmentType || 'full_time'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No employees assigned to this department yet.
              </Typography>
            )}
          </FormSection>

          <FormSection 
            title={`Department Roles (${departmentRoles.length})`}
            icon={<BusinessIcon />}
          >
            {departmentRoles.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {departmentRoles.map((role) => (
                  <Chip
                    key={role.id}
                    label={role.label || role.name}
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No specific roles defined for this department yet.
              </Typography>
            )}
          </FormSection>
        </>
      )}

    </Box>
  )
})

export default DepartmentCRUDForm
