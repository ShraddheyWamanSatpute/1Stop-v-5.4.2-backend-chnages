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
  Rating,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface PerformanceReview {
  id?: string
  employeeId: string
  reviewerId: string
  reviewPeriodStart: Date
  reviewPeriodEnd: Date
  reviewDate: Date
  overallRating: number
  categories: {
    workQuality: number
    productivity: number
    communication: number
    teamwork: number
    punctuality: number
    initiative: number
    problemSolving: number
    adaptability: number
  }
  strengths: string
  areasForImprovement: string
  goals: Array<{
    id: string
    title: string
    description: string
    targetDate: Date
    status: 'not_started' | 'in_progress' | 'completed'
    priority: 'low' | 'medium' | 'high'
  }>
  actionPlan: string
  employeeComments: string
  reviewerComments: string
  status: 'draft' | 'completed' | 'acknowledged'
  nextReviewDate?: Date
}

interface PerformanceCRUDFormProps {
  performanceReview?: PerformanceReview | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface PerformanceCRUDFormHandle {
  submit: () => void
}

const PerformanceCRUDForm = React.forwardRef<PerformanceCRUDFormHandle, PerformanceCRUDFormProps>(({
  performanceReview,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<PerformanceReview>({
    employeeId: '',
    reviewerId: '',
    reviewPeriodStart: new Date(),
    reviewPeriodEnd: new Date(),
    reviewDate: new Date(),
    overallRating: 3,
    categories: {
      workQuality: 3,
      productivity: 3,
      communication: 3,
      teamwork: 3,
      punctuality: 3,
      initiative: 3,
      problemSolving: 3,
      adaptability: 3,
    },
    strengths: '',
    areasForImprovement: '',
    goals: [],
    actionPlan: '',
    employeeComments: '',
    reviewerComments: '',
    status: 'draft',
  })

  // Update form data when performanceReview prop changes
  useEffect(() => {
    if (performanceReview) {
      setFormData({
        ...performanceReview,
        reviewPeriodStart: new Date(performanceReview.reviewPeriodStart),
        reviewPeriodEnd: new Date(performanceReview.reviewPeriodEnd),
        reviewDate: new Date(performanceReview.reviewDate),
        nextReviewDate: performanceReview.nextReviewDate ? new Date(performanceReview.nextReviewDate) : undefined,
        goals: performanceReview.goals.map(goal => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
        })),
      })
    }
  }, [performanceReview])

  // Calculate overall rating based on category ratings
  useEffect(() => {
    const categories = formData.categories
    const totalRating = Object.values(categories).reduce((sum, rating) => sum + rating, 0)
    const averageRating = totalRating / Object.keys(categories).length
    setFormData(prev => ({
      ...prev,
      overallRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    }))
  }, [formData.categories])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('categories.')) {
      const categoryField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [categoryField]: value,
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const addGoal = () => {
    const newGoal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      targetDate: new Date(),
      status: 'not_started' as const,
      priority: 'medium' as const,
    }
    setFormData(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }))
  }

  const updateGoal = (id: string, updates: Partial<typeof formData.goals[0]>) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === id ? { ...goal, ...updates } : goal
      ),
    }))
  }

  const removeGoal = (id: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal.id !== id),
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      reviewPeriodStart: formData.reviewPeriodStart.getTime(),
      reviewPeriodEnd: formData.reviewPeriodEnd.getTime(),
      reviewDate: formData.reviewDate.getTime(),
      nextReviewDate: formData.nextReviewDate?.getTime(),
      goals: formData.goals.map(goal => ({
        ...goal,
        targetDate: goal.targetDate.getTime(),
      })),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Get selected employee and reviewer details
  const selectedEmployee = hrState.employees?.find(emp => emp.id === formData.employeeId)

  // Performance category labels
  const categoryLabels = {
    workQuality: 'Work Quality',
    productivity: 'Productivity',
    communication: 'Communication',
    teamwork: 'Teamwork',
    punctuality: 'Punctuality',
    initiative: 'Initiative',
    problemSolving: 'Problem Solving',
    adaptability: 'Adaptability',
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success'
    if (rating >= 3.5) return 'info'
    if (rating >= 2.5) return 'warning'
    return 'error'
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Excellent'
    if (rating >= 3.5) return 'Good'
    if (rating >= 2.5) return 'Satisfactory'
    if (rating >= 1.5) return 'Needs Improvement'
    return 'Poor'
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Review Information" 
          icon={<PersonIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  label="Employee"
                >
                  <MenuItem value="">
                    <em>Select an employee</em>
                  </MenuItem>
                  {hrState.employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.department || 'No department'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isReadOnly}>
                <InputLabel>Reviewer</InputLabel>
                <Select
                  value={formData.reviewerId}
                  onChange={(e) => handleChange('reviewerId', e.target.value)}
                  label="Reviewer"
                >
                  <MenuItem value="">
                    <em>Select a reviewer</em>
                  </MenuItem>
                  {hrState.employees?.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.position || employee.department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Review Period Start"
                value={formData.reviewPeriodStart}
                onChange={(date) => handleChange('reviewPeriodStart', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Review Period End"
                value={formData.reviewPeriodEnd}
                onChange={(date) => handleChange('reviewPeriodEnd', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Review Date"
                value={formData.reviewDate}
                onChange={(date) => handleChange('reviewDate', date || new Date())}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="acknowledged">Acknowledged by Employee</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Next Review Date"
                value={formData.nextReviewDate || null}
                onChange={(date) => handleChange('nextReviewDate', date)}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>
          </Grid>

          {selectedEmployee && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Employee Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Position:</strong> {selectedEmployee.position || 'Not specified'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Department:</strong> {selectedEmployee.department || 'Not assigned'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Hire Date:</strong> {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'Not specified'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Employment Type:</strong> {selectedEmployee.employmentType}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </FormSection>

        <FormSection 
          title="Performance Ratings" 
          icon={<AssessmentIcon />}
        >
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color={`${getRatingColor(formData.overallRating)}.main`}>
                {formData.overallRating.toFixed(1)}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Overall Rating
              </Typography>
              <Chip 
                label={getRatingLabel(formData.overallRating)}
                color={getRatingColor(formData.overallRating) as any}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={formData.categories[key as keyof typeof formData.categories]}
                      onChange={(_event, newValue) => {
                        if (newValue !== null) {
                          handleChange(`categories.${key}`, newValue)
                        }
                      }}
                      disabled={isReadOnly}
                      precision={0.5}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formData.categories[key as keyof typeof formData.categories]}/5
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(formData.categories[key as keyof typeof formData.categories] / 5) * 100}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    color={getRatingColor(formData.categories[key as keyof typeof formData.categories]) as any}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </FormSection>

        <FormSection 
          title="Feedback & Development" 
          icon={<TrendingUpIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Strengths"
                multiline
                rows={4}
                value={formData.strengths}
                onChange={(e) => handleChange('strengths', e.target.value)}
                disabled={isReadOnly}
                placeholder="What are the employee's key strengths and accomplishments during this review period?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Areas for Improvement"
                multiline
                rows={4}
                value={formData.areasForImprovement}
                onChange={(e) => handleChange('areasForImprovement', e.target.value)}
                disabled={isReadOnly}
                placeholder="What areas need development or improvement?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Action Plan"
                multiline
                rows={4}
                value={formData.actionPlan}
                onChange={(e) => handleChange('actionPlan', e.target.value)}
                disabled={isReadOnly}
                placeholder="What specific actions will be taken to support the employee's development?"
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Goals & Objectives" 
          icon={<AssignmentIcon />}
        >
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Performance Goals</Typography>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addGoal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Add Goal
              </button>
            )}
          </Box>
          
          {formData.goals.map((goal, _index) => (
            <Paper key={goal.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Goal Title"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small" disabled={isReadOnly}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={goal.priority}
                      onChange={(e) => updateGoal(goal.id, { priority: e.target.value as any })}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small" disabled={isReadOnly}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={goal.status}
                      onChange={(e) => updateGoal(goal.id, { status: e.target.value as any })}
                      label="Status"
                    >
                      <MenuItem value="not_started">Not Started</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    multiline
                    rows={2}
                    value={goal.description}
                    onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Target Date"
                    value={goal.targetDate}
                    onChange={(date) => updateGoal(goal.id, { targetDate: date || new Date() })}
                    disabled={isReadOnly}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
                {!isReadOnly && (
                  <Grid item xs={12} sm={6}>
                    <button
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Remove Goal
                    </button>
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}
          
          {formData.goals.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No goals set for this review period. {!isReadOnly && 'Click "Add Goal" to create performance objectives.'}
            </Typography>
          )}
        </FormSection>

        <FormSection 
          title="Comments" 
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reviewer Comments"
                multiline
                rows={4}
                value={formData.reviewerComments}
                onChange={(e) => handleChange('reviewerComments', e.target.value)}
                disabled={isReadOnly}
                placeholder="Additional comments from the reviewer..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee Comments"
                multiline
                rows={4}
                value={formData.employeeComments}
                onChange={(e) => handleChange('employeeComments', e.target.value)}
                disabled={isReadOnly}
                placeholder="Employee's response and comments on the review..."
              />
            </Grid>
          </Grid>
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
              {mode === 'edit' ? 'Update Performance Review' : 'Create Performance Review'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
})

export default PerformanceCRUDForm
