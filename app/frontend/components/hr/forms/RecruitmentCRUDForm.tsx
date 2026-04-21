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
  List,
  ListItem,
  ListItemText,
  Avatar,
  Rating,
  Card,
  CardContent,
  IconButton,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  Work as WorkIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface JobPosting {
  id?: string
  title: string
  department: string
  location: string
  type: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship'
  level: 'entry' | 'mid' | 'senior' | 'executive'
  description: string
  requirements: string[]
  responsibilities: string[]
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  benefits: string[]
  applicationDeadline?: Date
  startDate?: Date
  status: 'draft' | 'published' | 'closed' | 'filled'
  applicants: Array<{
    id: string
    name: string
    email: string
    phone: string
    resume?: string
    coverLetter?: string
    appliedDate: Date
    status: 'applied' | 'screening' | 'interviewing' | 'offer' | 'hired' | 'rejected'
    interviewScore?: number
    notes?: string
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface RecruitmentCRUDFormProps {
  jobPosting?: JobPosting | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

export interface RecruitmentCRUDFormHandle {
  submit: () => void
}

const RecruitmentCRUDForm = React.forwardRef<RecruitmentCRUDFormHandle, RecruitmentCRUDFormProps>(({
  jobPosting,
  mode,
  onSave
}, ref) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<JobPosting>({
    title: '',
    department: '',
    location: '',
    type: 'full_time',
    level: 'mid',
    description: '',
    requirements: [],
    responsibilities: [],
    salaryRange: {
      min: 0,
      max: 0,
      currency: 'GBP'
    },
    benefits: [],
    status: 'draft',
    applicants: [],
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const [newRequirement, setNewRequirement] = useState('')
  const [newResponsibility, setNewResponsibility] = useState('')
  const [newBenefit, setNewBenefit] = useState('')

  // Update form data when jobPosting prop changes
  useEffect(() => {
    if (jobPosting) {
      setFormData({
        ...jobPosting,
        applicationDeadline: jobPosting.applicationDeadline ? new Date(jobPosting.applicationDeadline) : undefined,
        startDate: jobPosting.startDate ? new Date(jobPosting.startDate) : undefined,
        applicants: jobPosting.applicants.map(applicant => ({
          ...applicant,
          appliedDate: new Date(applicant.appliedDate)
        })),
        createdAt: new Date(jobPosting.createdAt),
        updatedAt: new Date(jobPosting.updatedAt),
      })
    }
  }, [jobPosting])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('salaryRange.')) {
      const salaryField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        salaryRange: {
          ...prev.salaryRange,
          [salaryField]: value
        },
        updatedAt: new Date()
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        updatedAt: new Date()
      }))
    }
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }))
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      setFormData(prev => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()]
      }))
      setNewResponsibility('')
    }
  }

  const removeResponsibility = (index: number) => {
    setFormData(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }))
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }))
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = useCallback(() => {
    const submissionData = {
      ...formData,
      applicationDeadline: formData.applicationDeadline?.getTime(),
      startDate: formData.startDate?.getTime(),
      applicants: formData.applicants.map(applicant => ({
        ...applicant,
        appliedDate: applicant.appliedDate.getTime()
      })),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }, [formData, onSave])

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit])

  const isReadOnly = mode === 'view'

  // Calculate application statistics
  const totalApplicants = formData.applicants.length
  const screeningApplicants = formData.applicants.filter(a => a.status === 'screening').length
  const interviewingApplicants = formData.applicants.filter(a => a.status === 'interviewing').length
  const offerApplicants = formData.applicants.filter(a => a.status === 'offer').length

  const getApplicantStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'success'
      case 'offer': return 'info'
      case 'interviewing': return 'primary'
      case 'screening': return 'warning'
      case 'rejected': return 'error'
      default: return 'default'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Job Posting Information" 
          icon={<WorkIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Senior Chef, Restaurant Manager"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  label="Department"
                >
                  <MenuItem value="">
                    <em>Select department</em>
                  </MenuItem>
                  {hrState.departments?.map((department) => (
                    <MenuItem key={department.id} value={department.name}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g., London, Remote, Hybrid"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Employment Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Employment Type"
                >
                  <MenuItem value="full_time">Full Time</MenuItem>
                  <MenuItem value="part_time">Part Time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="temporary">Temporary</MenuItem>
                  <MenuItem value="internship">Internship</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Experience Level</InputLabel>
                <Select
                  value={formData.level}
                  onChange={(e) => handleChange('level', e.target.value)}
                  label="Experience Level"
                >
                  <MenuItem value="entry">Entry Level</MenuItem>
                  <MenuItem value="mid">Mid Level</MenuItem>
                  <MenuItem value="senior">Senior Level</MenuItem>
                  <MenuItem value="executive">Executive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Description"
                multiline
                rows={6}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Detailed description of the role, company culture, and what makes this opportunity unique..."
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
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="filled">Filled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Application Deadline"
                value={formData.applicationDeadline || null}
                onChange={(date) => handleChange('applicationDeadline', date)}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Compensation & Benefits" 
          icon={<AssessmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Minimum Salary"
                type="number"
                value={formData.salaryRange.min}
                onChange={(e) => handleChange('salaryRange.min', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Maximum Salary"
                type="number"
                value={formData.salaryRange.max}
                onChange={(e) => handleChange('salaryRange.max', Number(e.target.value))}
                disabled={isReadOnly}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.salaryRange.currency}
                  onChange={(e) => handleChange('salaryRange.currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Benefits</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add benefit (e.g., Health insurance, Flexible hours)"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                disabled={isReadOnly}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addBenefit()
                  }
                }}
              />
              {!isReadOnly && (
                <IconButton onClick={addBenefit} color="primary">
                  <AddIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.benefits.map((benefit, index) => (
                <Chip
                  key={index}
                  label={benefit}
                  onDelete={!isReadOnly ? () => removeBenefit(index) : undefined}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </FormSection>

        <FormSection 
          title="Requirements & Responsibilities" 
          icon={<AssessmentIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>Requirements</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add requirement"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  disabled={isReadOnly}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addRequirement()
                    }
                  }}
                />
                {!isReadOnly && (
                  <IconButton onClick={addRequirement} color="primary">
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List dense>
                {formData.requirements.map((requirement, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      !isReadOnly && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removeRequirement(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText primary={requirement} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="h6" gutterBottom>Responsibilities</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add responsibility"
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  disabled={isReadOnly}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addResponsibility()
                    }
                  }}
                />
                {!isReadOnly && (
                  <IconButton onClick={addResponsibility} color="primary">
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              <List dense>
                {formData.responsibilities.map((responsibility, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      !isReadOnly && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => removeResponsibility(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText primary={responsibility} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </FormSection>

        {mode !== 'create' && formData.applicants.length > 0 && (
          <FormSection 
            title="Applications & Candidates" 
            icon={<PersonIcon />}
          >
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {totalApplicants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Applications
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {screeningApplicants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Screening
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {interviewingApplicants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Interviewing
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {offerApplicants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Offers Extended
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Applicants
              </Typography>
              <List>
                {formData.applicants.slice(0, 10).map((applicant) => (
                  <ListItem key={applicant.id} divider>
                    <Avatar sx={{ mr: 2 }}>
                      {applicant.name.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={applicant.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {applicant.email} | Applied: {applicant.appliedDate.toLocaleDateString()}
                          </Typography>
                          {applicant.interviewScore && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <Typography variant="body2">Interview Score:</Typography>
                              <Rating value={applicant.interviewScore} readOnly size="small" />
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={applicant.status.replace('_', ' ').toUpperCase()}
                      color={getApplicantStatusColor(applicant.status) as any}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </FormSection>
        )}
      </Box>
    </LocalizationProvider>
  )
})

export default RecruitmentCRUDForm
