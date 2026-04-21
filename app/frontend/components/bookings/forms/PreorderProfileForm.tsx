"use client"

import React, { useState, useEffect, Fragment } from 'react'
import {
  Box,
  TextField,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { useStock } from '../../../../backend/context/StockContext'

interface PreorderCourse {
  courseId: string
  courseName: string
  minAmount: number
  maxAmount: number
  amountType: 'total' | 'perGuest'
  required: boolean
  items?: string[] // Array of item IDs that belong to this course
}

interface PreorderProfileFormProps {
  profile?: any | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const PreorderProfileForm: React.FC<PreorderProfileFormProps> = ({
  profile,
  mode,
  onSave
}) => {
  const { state } = useStock()
  const courses = state.courses
  const products = state.products

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cutoffHours: 24,
    allowModifications: true,
    requiresApproval: false
  })

  const [profileCourses, setProfileCourses] = useState<PreorderCourse[]>([])
  const [expandedCourseIndex, setExpandedCourseIndex] = useState<number | null>(null)

  // Transform stock courses to the format needed for the form
  const availableCourses = courses?.map((course: any) => ({
    id: course.id,
    name: course.name
  })) || []

  // Get items for a specific course
  const getItemsForCourse = (courseId: string) => {
    if (!products || !Array.isArray(products)) return []
    return products
      .filter((product: any) => product.course === courseId || product.courseId === courseId)
      .map((product: any) => ({
        id: product.id,
        name: product.name
      }))
  }

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        description: profile.description || '',
        cutoffHours: profile.cutoffHours || 24,
        allowModifications: profile.allowModifications !== false,
        requiresApproval: profile.requiresApproval || false
      })
      
      // Convert profile courses - filter out empty courses
      const profileCourses: PreorderCourse[] = (profile.courses || [])
        .filter((course: any) => course.courseId && course.courseName)
        .map((course: any) => ({
          courseId: course.courseId,
          courseName: course.courseName,
          minAmount: course.minAmount || 1,
          maxAmount: course.maxAmount || 1,
          amountType: course.amountType || 'total',
          required: course.required || false,
          items: course.items || []
        }))
      
      setProfileCourses(profileCourses)
    }
  }, [profile])

  const handleAddCourse = (course: { id: string; name: string } | null) => {
    if (course) {
      const newCourse: PreorderCourse = {
        courseId: course.id,
        courseName: course.name,
        minAmount: 1,
        maxAmount: 1,
        amountType: 'total',
        required: false,
        items: []
      }
      setProfileCourses([...profileCourses, newCourse])
    }
  }

  const handleUpdateCourseItems = (index: number, itemIds: string[]) => {
    const updatedCourses = [...profileCourses]
    updatedCourses[index] = { ...updatedCourses[index], items: itemIds }
    setProfileCourses(updatedCourses)
  }

  const handleUpdateCourse = (index: number, field: keyof PreorderCourse, value: any) => {
    const updatedCourses = [...profileCourses]
    updatedCourses[index] = { ...updatedCourses[index], [field]: value }
    setProfileCourses(updatedCourses)
  }

  const handleRemoveCourse = (index: number) => {
    const updatedCourses = profileCourses.filter((_, i) => i !== index)
    setProfileCourses(updatedCourses)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const profileData = {
      ...formData,
      courses: profileCourses
    }
    
    onSave(profileData)
  }

  const isReadOnly = mode === 'view'

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Profile Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
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
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Cutoff Hours"
              type="number"
              value={formData.cutoffHours}
              onChange={(e) => setFormData(prev => ({ ...prev, cutoffHours: parseInt(e.target.value) || 24 }))}
              disabled={isReadOnly}
              fullWidth
              inputProps={{ min: 1 }}
              helperText="Hours before event to stop taking orders"
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3 }}>
        {!isReadOnly && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Add Course</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  const selectedCourse = availableCourses.find(course => course.id === e.target.value)
                  handleAddCourse(selectedCourse || null)
                }}
                label="Add Course"
              >
                {availableCourses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell align="center">Min Amount</TableCell>
                <TableCell align="center">Max Amount</TableCell>
                <TableCell align="center">Amount Type</TableCell>
                <TableCell align="center">Required</TableCell>
                {!isReadOnly && <TableCell align="center">Items</TableCell>}
                {!isReadOnly && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {profileCourses.filter(course => course.courseId && course.courseName).map((course, index) => {
                const courseItems = getItemsForCourse(course.courseId)
                const selectedItems = course.items || []
                return (
                  <Fragment key={index}>
                    <TableRow>
                      <TableCell>{course.courseName}</TableCell>
                  <TableCell align="center">
                    {isReadOnly ? (
                      course.minAmount
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        value={course.minAmount}
                        onChange={(e) => handleUpdateCourse(index, 'minAmount', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1, style: { textAlign: 'center' } }}
                        sx={{ width: 80 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {isReadOnly ? (
                      course.maxAmount
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        value={course.maxAmount}
                        onChange={(e) => handleUpdateCourse(index, 'maxAmount', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1, style: { textAlign: 'center' } }}
                        sx={{ width: 80 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {isReadOnly ? (
                      course.amountType
                    ) : (
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                          value={course.amountType}
                          onChange={(e) => handleUpdateCourse(index, 'amountType', e.target.value)}
                        >
                          <MenuItem value="total">Total</MenuItem>
                          <MenuItem value="perGuest">Per Guest</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={course.required}
                          onChange={(e) => handleUpdateCourse(index, 'required', e.target.checked)}
                          disabled={isReadOnly}
                        />
                      }
                      label=""
                    />
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell align="center">
                      <Button
                        size="small"
                        onClick={() => setExpandedCourseIndex(expandedCourseIndex === index ? null : index)}
                        endIcon={expandedCourseIndex === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      >
                        {selectedItems.length} selected
                      </Button>
                    </TableCell>
                  )}
                  {!isReadOnly && (
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleRemoveCourse(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
                {!isReadOnly && expandedCourseIndex === index && courseItems.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Select items for {course.courseName}:</Typography>
                      <FormControl fullWidth>
                        <Select
                          multiple
                          value={selectedItems}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                            handleUpdateCourseItems(index, value as string[])
                          }}
                          renderValue={(selected) => {
                            const selectedNames = (selected as string[])
                              .map(id => courseItems.find(item => item.id === id)?.name)
                              .filter(Boolean)
                            return selectedNames.length > 0 ? selectedNames.join(', ') : 'No items selected'
                          }}
                        >
                          {courseItems.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              <Checkbox checked={selectedItems.indexOf(item.id) > -1} />
                              <ListItemText primary={item.name} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
                )
              })}
              {profileCourses.filter(course => course.courseId && course.courseName).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 5 : 7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No courses added yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowModifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowModifications: e.target.checked }))}
                  disabled={isReadOnly}
                />
              }
              label="Allow Modifications"
            />
          </Grid>
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
        </Grid>
      </Box>
    </Box>
  )
}

export default PreorderProfileForm
