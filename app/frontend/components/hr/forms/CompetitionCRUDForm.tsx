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
  Chip,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Card,
  CardContent,
  Rating,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import {
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  Star as StarIcon,
} from '@mui/icons-material'
import FormSection from '../../reusable/FormSection'
import { useHR } from '../../../../backend/context/HRContext'

interface Competition {
  id?: string
  title: string
  description: string
  type: 'sales' | 'performance' | 'innovation' | 'teamwork' | 'safety' | 'customer_service' | 'other'
  startDate: Date
  endDate: Date
  participants: Array<{
    employeeId: string
    score?: number
    metrics?: Record<string, number>
    notes?: string
  }>
  prizes: Array<{
    position: number
    description: string
    value?: number
  }>
  rules: string
  judging: {
    criteria: string[]
    method: 'automatic' | 'manual' | 'peer_review'
    judges?: string[]
  }
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  winner?: string
  results?: Array<{
    position: number
    employeeId: string
    score: number
    prize?: string
  }>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface CompetitionCRUDFormProps {
  competition?: Competition | null
  mode: 'create' | 'edit' | 'view'
  onSave: (data: any) => void
}

const CompetitionCRUDForm: React.FC<CompetitionCRUDFormProps> = ({
  competition,
  mode,
  onSave
}) => {
  const { state: hrState } = useHR()

  const [formData, setFormData] = useState<Competition>({
    title: '',
    description: '',
    type: 'performance',
    startDate: new Date(),
    endDate: new Date(),
    participants: [],
    prizes: [
      { position: 1, description: 'First Place' },
      { position: 2, description: 'Second Place' },
      { position: 3, description: 'Third Place' }
    ],
    rules: '',
    judging: {
      criteria: [],
      method: 'manual',
    },
    status: 'upcoming',
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Update form data when competition prop changes
  useEffect(() => {
    if (competition) {
      setFormData({
        ...competition,
        startDate: new Date(competition.startDate),
        endDate: new Date(competition.endDate),
        createdAt: new Date(competition.createdAt),
        updatedAt: new Date(competition.updatedAt),
      })
    }
  }, [competition])

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('judging.')) {
      const judgingField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        judging: {
          ...prev.judging,
          [judgingField]: value
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

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      startDate: formData.startDate.getTime(),
      endDate: formData.endDate.getTime(),
      createdAt: formData.createdAt.getTime(),
      updatedAt: new Date().getTime(),
    }
    onSave(submissionData)
  }

  const isReadOnly = mode === 'view'


  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sales': return '💰'
      case 'performance': return '📈'
      case 'innovation': return '💡'
      case 'teamwork': return '🤝'
      case 'safety': return '🦺'
      case 'customer_service': return '😊'
      default: return '🏆'
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <FormSection 
          title="Competition Information" 
          icon={<EmojiEventsIcon />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Competition Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                disabled={isReadOnly}
                placeholder="e.g., Employee of the Month, Sales Challenge"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Competition Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="Competition Type"
                >
                  <MenuItem value="sales">{getTypeIcon('sales')} Sales</MenuItem>
                  <MenuItem value="performance">{getTypeIcon('performance')} Performance</MenuItem>
                  <MenuItem value="innovation">{getTypeIcon('innovation')} Innovation</MenuItem>
                  <MenuItem value="teamwork">{getTypeIcon('teamwork')} Teamwork</MenuItem>
                  <MenuItem value="safety">{getTypeIcon('safety')} Safety</MenuItem>
                  <MenuItem value="customer_service">{getTypeIcon('customer_service')} Customer Service</MenuItem>
                  <MenuItem value="other">{getTypeIcon('other')} Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => handleChange('startDate', date || new Date())}
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
                label="End Date"
                value={formData.endDate}
                onChange={(date) => handleChange('endDate', date || new Date())}
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
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Describe the competition, its purpose, and what participants need to do..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rules & Guidelines"
                multiline
                rows={4}
                value={formData.rules}
                onChange={(e) => handleChange('rules', e.target.value)}
                disabled={isReadOnly}
                placeholder="Competition rules, eligibility criteria, and guidelines..."
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection 
          title="Prizes & Rewards" 
          icon={<StarIcon />}
        >
          {formData.prizes.map((prize, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={2}>
                  <Typography variant="h6" color="primary">
                    {prize.position === 1 ? '🥇' : prize.position === 2 ? '🥈' : prize.position === 3 ? '🥉' : `#${prize.position}`}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Prize Description"
                    value={prize.description}
                    onChange={(e) => {
                      const newPrizes = [...formData.prizes]
                      newPrizes[index] = { ...prize, description: e.target.value }
                      handleChange('prizes', newPrizes)
                    }}
                    disabled={isReadOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Prize Value"
                    type="number"
                    value={prize.value || ''}
                    onChange={(e) => {
                      const newPrizes = [...formData.prizes]
                      newPrizes[index] = { ...prize, value: e.target.value ? Number(e.target.value) : undefined }
                      handleChange('prizes', newPrizes)
                    }}
                    disabled={isReadOnly}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>,
                      inputProps: { min: 0, step: 0.01 }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </FormSection>

        {mode !== 'create' && formData.participants.length > 0 && (
          <FormSection 
            title="Participants & Results" 
            icon={<GroupIcon />}
          >
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Competition Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="h4" color="primary" align="center">
                      {formData.participants.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Total Participants
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="h4" color="info.main" align="center">
                      {formData.participants.filter(p => p.score !== undefined).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Scored Participants
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="h4" color="success.main" align="center">
                      {formData.results?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Final Results
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Participant List
              </Typography>
              <List>
                {formData.participants.map((participant) => {
                  const employee = hrState.employees?.find(emp => emp.id === participant.employeeId)
                  return employee ? (
                    <ListItem key={participant.employeeId} divider>
                      <ListItemAvatar>
                        <Avatar src={employee.photo}>
                          {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${employee.firstName} ${employee.lastName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {employee.department} - {employee.position}
                            </Typography>
                            {participant.score !== undefined && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Typography variant="body2">Score:</Typography>
                                <Rating value={participant.score / 20} readOnly size="small" />
                                <Typography variant="body2" color="primary">
                                  {participant.score}/100
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      {participant.score !== undefined && (
                        <Chip
                          label={`${participant.score} pts`}
                          color={participant.score >= 80 ? 'success' : participant.score >= 60 ? 'primary' : 'default'}
                          size="small"
                        />
                      )}
                    </ListItem>
                  ) : null
                })}
              </List>
            </Paper>

            {formData.results && formData.results.length > 0 && (
              <Paper sx={{ mt: 3, p: 2, bgcolor: 'warning.50' }}>
                <Typography variant="h6" gutterBottom>
                  Final Results
                </Typography>
                <List>
                  {formData.results.slice(0, 5).map((result) => {
                    const employee = hrState.employees?.find(emp => emp.id === result.employeeId)
                    return employee ? (
                      <ListItem key={result.employeeId}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: result.position <= 3 ? 'gold' : 'grey.300' }}>
                            {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : result.position}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${employee.firstName} ${employee.lastName}`}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Score: {result.score} | Prize: {result.prize || 'Recognition'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ) : null
                  })}
                </List>
              </Paper>
            )}
          </FormSection>
        )}

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
              {mode === 'edit' ? 'Update Competition' : 'Create Competition'}
            </button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default CompetitionCRUDForm
