"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Badge,
  Stack
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Event as EventIcon,
  AutoFixHigh as AutoFixHighIcon,
  CalendarToday as CalendarTodayIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval, addWeeks, subWeeks } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
import { useBookings } from "../../../backend/context/BookingsContext"
import type { Schedule } from "../../../backend/interfaces/HRs"

// AI Learning System Interfaces
interface AILearningData {
  id: string
  date: string
  employeeId: string
  originalShift: {
    startTime: string
    endTime: string
    department: string
    role: string
  }
  userAdjustment: {
    action: "modified" | "deleted" | "added"
    newShift?: {
      startTime: string
      endTime: string
      department: string
      role: string
    }
    reason?: string
  }
  bookingDemand?: {
    totalBookings: number
    peakHours: number[]
    covers: number
  }
  timestamp: number
  learnedPattern: {
    preferredHours: string[]
    avoidedHours: string[]
    departmentPreferences: Record<string, number>
    roleEfficiency: Record<string, number>
  }
}

interface CalendarShift extends Schedule {
  bookingDemand?: {
    totalBookings: number
    peakHours: number[]
    covers: number
  }
  aiConfidence?: number
  canEdit?: boolean
  canDelete?: boolean
}

interface AICalendarScheduleProps {
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  onScheduleChange?: (schedules: Schedule[]) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-calendar-tabpanel-${index}`}
      aria-labelledby={`ai-calendar-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const AICalendarSchedule: React.FC<AICalendarScheduleProps> = ({
  dateRange
}) => {
  const { state: hrState, updateSchedule, deleteSchedule, refreshSchedules } = useHR()
  const bookingsState = useBookings()

  // State management
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    dateRange?.startDate || startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAILearningDialogOpen, setIsAILearningDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "warning" | "info"
  }>({ open: false, message: "", severity: "info" })

  // AI Learning State
  const [aiLearningData, setAiLearningData] = useState<AILearningData[]>([])
  const [aiInsights, setAiInsights] = useState<{
    patterns: Record<string, any>
    recommendations: string[]
    confidence: number
  }>({
    patterns: {},
    recommendations: [],
    confidence: 0
  })

  // Form state for editing
  const [editFormData, setEditFormData] = useState<Partial<CalendarShift>>({})
  const [aiLearningEnabled, setAiLearningEnabled] = useState(true)

  // Calculate current week dates
  const currentWeekDates = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    })
  }, [currentWeekStart])

  // Get schedules for current week
  const currentWeekSchedules = useMemo(() => {
    return hrState.schedules.filter(schedule => {
      const scheduleDate = parseISO(schedule.date)
      return isWithinInterval(scheduleDate, {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      })
    })
  }, [hrState.schedules, currentWeekStart])

  // Get bookings for current week
  const currentWeekBookings = useMemo(() => {
    if (!bookingsState.bookings) return []
    
    return bookingsState.bookings.filter(booking => {
      const bookingDate = new Date(booking.date || booking.arrivalTime)
      return isWithinInterval(bookingDate, {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      })
    })
  }, [bookingsState.bookings, currentWeekStart])

  // Enhanced schedules with booking data and AI insights
  const enhancedSchedules = useMemo(() => {
    return currentWeekSchedules.map(schedule => {
      const dayBookings = currentWeekBookings.filter(booking => {
        const bookingDate = new Date(booking.date || booking.arrivalTime)
        return isSameDay(bookingDate, parseISO(schedule.date))
      })

      // Calculate booking demand for this shift
      const bookingDemand = {
        totalBookings: dayBookings.length,
        peakHours: calculatePeakHours(dayBookings),
        covers: dayBookings.reduce((sum, booking) => sum + (booking.guests || booking.covers || 2), 0)
      }

      // Calculate AI confidence based on historical patterns
      const aiConfidence = calculateAIConfidence(schedule, bookingDemand)

      return {
        ...schedule,
        bookingDemand,
        aiConfidence,
        canEdit: true,
        canDelete: true
      } as CalendarShift
    })
  }, [currentWeekSchedules, currentWeekBookings])

  // Helper functions
  const calculatePeakHours = (bookings: any[]): number[] => {
    const hourCounts: Record<number, number> = {}
    
    bookings.forEach(booking => {
      const startTime = new Date(booking.startTime || booking.startDate)
      const hour = startTime.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    // Return top 3 peak hours
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))
  }

  const calculateAIConfidence = (schedule: Schedule, bookingDemand: any): number => {
    // Simple confidence calculation based on historical patterns
    // This would be enhanced with actual ML models in production
    const employee = hrState.employees.find(emp => emp.id === schedule.employeeId)
    if (!employee) return 0.5

    let confidence = 0.7 // Base confidence

    // Adjust based on booking demand
    if (bookingDemand.totalBookings > 10) confidence += 0.2
    if (bookingDemand.totalBookings < 3) confidence -= 0.1

    // Adjust based on employee experience
    const hireDate = new Date(employee.hireDate)
    const monthsSinceHire = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSinceHire > 6) confidence += 0.1

    return Math.min(1, Math.max(0, confidence))
  }

  // Navigation functions
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => subWeeks(prev, 1))
  }, [])

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1))
  }, [])


  // Schedule management functions
  const handleEditShift = useCallback((shift: CalendarShift) => {
    setSelectedShift(shift)
    setEditFormData(shift)
    setIsEditDialogOpen(true)
  }, [])

  const handleDeleteShift = useCallback((shift: CalendarShift) => {
    setSelectedShift(shift)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedShift || !editFormData) return

    try {
      setLoading(true)
      
      // Record AI learning data if enabled
      if (aiLearningEnabled && selectedShift.id) {
        const learningData: AILearningData = {
          id: `learning_${Date.now()}`,
          date: selectedShift.date,
          employeeId: selectedShift.employeeId,
          originalShift: {
            startTime: selectedShift.startTime,
            endTime: selectedShift.endTime,
            department: selectedShift.department,
            role: selectedShift.role || ""
          },
          userAdjustment: {
            action: "modified",
            newShift: {
              startTime: editFormData.startTime || selectedShift.startTime,
              endTime: editFormData.endTime || selectedShift.endTime,
              department: editFormData.department || selectedShift.department,
              role: editFormData.role || selectedShift.role || ""
            },
            reason: "User modification"
          },
          bookingDemand: selectedShift.bookingDemand,
          timestamp: Date.now(),
          learnedPattern: {
            preferredHours: [],
            avoidedHours: [],
            departmentPreferences: {},
            roleEfficiency: {}
          }
        }
        
        setAiLearningData(prev => [...prev, learningData])
      }

      // Update the schedule
      await updateSchedule(selectedShift.id, {
        ...selectedShift,
        ...editFormData,
        updatedAt: new Date().toISOString()
      })

      setNotification({
        open: true,
        message: "Schedule updated successfully",
        severity: "success"
      })

      setIsEditDialogOpen(false)
      setSelectedShift(null)
      setEditFormData({})
      
      // Refresh schedules
      await refreshSchedules()
      
    } catch (error: any) {
      console.error("Failed to update schedule:", error)
      setNotification({
        open: true,
        message: error.message || "Failed to update schedule",
        severity: "error"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedShift, editFormData, aiLearningEnabled, updateSchedule, refreshSchedules])

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedShift) return

    try {
      setLoading(true)

      // Record AI learning data if enabled
      if (aiLearningEnabled && selectedShift.id) {
        const learningData: AILearningData = {
          id: `learning_${Date.now()}`,
          date: selectedShift.date,
          employeeId: selectedShift.employeeId,
          originalShift: {
            startTime: selectedShift.startTime,
            endTime: selectedShift.endTime,
            department: selectedShift.department,
            role: selectedShift.role || ""
          },
          userAdjustment: {
            action: "deleted",
            reason: "User deletion"
          },
          bookingDemand: selectedShift.bookingDemand,
          timestamp: Date.now(),
          learnedPattern: {
            preferredHours: [],
            avoidedHours: [],
            departmentPreferences: {},
            roleEfficiency: {}
          }
        }
        
        setAiLearningData(prev => [...prev, learningData])
      }

      // Delete the schedule
      await deleteSchedule(selectedShift.id)

      setNotification({
        open: true,
        message: "Schedule deleted successfully",
        severity: "success"
      })

      setIsDeleteDialogOpen(false)
      setSelectedShift(null)
      
      // Refresh schedules
      await refreshSchedules()
      
    } catch (error: any) {
      console.error("Failed to delete schedule:", error)
      setNotification({
        open: true,
        message: error.message || "Failed to delete schedule",
        severity: "error"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedShift, aiLearningEnabled, deleteSchedule, refreshSchedules])

  // AI Learning functions
  const generateAIInsights = useCallback(() => {
    // Analyze learning data to generate insights
    const patterns: Record<string, any> = {}
    const recommendations: string[] = []
    let confidence = 0

    if (aiLearningData.length > 0) {
      // Analyze user modifications
      const modifications = aiLearningData.filter(d => d.userAdjustment.action === "modified")
      const deletions = aiLearningData.filter(d => d.userAdjustment.action === "deleted")

      if (modifications.length > 0) {
        patterns.userPreferences = {
          commonChanges: modifications.length,
          frequentAdjustments: modifications.slice(-10)
        }
        recommendations.push("Consider adjusting default shift times based on user modifications")
      }

      if (deletions.length > 0) {
        patterns.avoidedShifts = {
          deletedShifts: deletions.length,
          commonReasons: deletions.map(d => d.userAdjustment.reason)
        }
        recommendations.push("Review frequently deleted shifts to improve initial scheduling")
      }

      confidence = Math.min(1, aiLearningData.length / 50) // Confidence increases with more data
    }

    setAiInsights({
      patterns,
      recommendations,
      confidence
    })
  }, [aiLearningData])

  // Load AI learning data from localStorage on mount
  useEffect(() => {
    const savedLearningData = localStorage.getItem('aiScheduleLearning')
    if (savedLearningData) {
      try {
        setAiLearningData(JSON.parse(savedLearningData))
      } catch (error) {
        console.error('Failed to load AI learning data:', error)
      }
    }
  }, [])

  // Save AI learning data to localStorage
  useEffect(() => {
    if (aiLearningData.length > 0) {
      localStorage.setItem('aiScheduleLearning', JSON.stringify(aiLearningData))
    }
  }, [aiLearningData])

  // Generate insights when learning data changes
  useEffect(() => {
    generateAIInsights()
  }, [generateAIInsights])

  // Get schedules grouped by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, CalendarShift[]> = {}
    
    enhancedSchedules.forEach(schedule => {
      if (!grouped[schedule.date]) {
        grouped[schedule.date] = []
      }
      grouped[schedule.date].push(schedule)
    })
    
    return grouped
  }, [enhancedSchedules])

  // Get bookings grouped by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    
    currentWeekBookings.forEach(booking => {
      const bookingDate = new Date(booking.date || booking.arrivalTime)
      const dateKey = format(bookingDate, "yyyy-MM-dd")
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(booking)
    })
    
    return grouped
  }, [currentWeekBookings])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }))
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            AI Calendar Schedule
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Intelligent schedule management with booking integration and AI learning
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => setIsAILearningDialogOpen(true)}
          >
            AI Insights
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={aiLearningEnabled}
                onChange={(e) => setAiLearningEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="AI Learning"
          />
        </Stack>
      </Box>

      {/* Week Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          onClick={goToPreviousWeek}
          startIcon={<CalendarTodayIcon />}
        >
          Previous Week
        </Button>
        
        <Typography variant="h6">
          {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
        </Typography>
        
        <Button
          variant="outlined"
          onClick={goToNextWeek}
          endIcon={<CalendarTodayIcon />}
        >
          Next Week
        </Button>
      </Box>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="AI Calendar tabs">
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon />
                  Calendar View
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon />
                  Booking Analysis
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoFixHighIcon />
                  AI Learning
                  {aiLearningData.length > 0 && (
                    <Badge badgeContent={aiLearningData.length} color="primary" />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Calendar View Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            {currentWeekDates.map((date, _index) => {
              const dateKey = format(date, "yyyy-MM-dd")
              const daySchedules = schedulesByDate[dateKey] || []
              const dayBookings = bookingsByDate[dateKey] || []
              const isToday = isSameDay(date, new Date())

              return (
                <Grid item xs={12} md={6} lg={4} key={dateKey}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      border: isToday ? 2 : 1,
                      borderColor: isToday ? themeConfig.brandColors.navy : 'divider',
                      bgcolor: isToday ? 'primary.50' : 'background.paper'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          {format(date, "EEEE")}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          {format(date, "MMM d")}
                        </Typography>
                      </Box>

                      {/* Booking Summary */}
                      {dayBookings.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Chip
                            icon={<EventIcon />}
                            label={`${dayBookings.length} bookings`}
                            size="small"
                            color="info"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            icon={<PeopleIcon />}
                            label={`${dayBookings.reduce((sum, b) => sum + (b.guests || b.covers || 2), 0)} covers`}
                            size="small"
                            color="secondary"
                          />
                        </Box>
                      )}

                      {/* Schedules */}
                      <Box sx={{ space: 1 }}>
                        {daySchedules.map((schedule) => {
                          const employee = hrState.employees.find(emp => emp.id === schedule.employeeId)
                          
                          return (
                            <Paper
                              key={schedule.id}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                border: 1,
                                borderColor: schedule.aiConfidence && schedule.aiConfidence > 0.8 ? 'success.main' : 
                                           schedule.aiConfidence && schedule.aiConfidence < 0.5 ? 'warning.main' : 'divider',
                                bgcolor: schedule.aiConfidence && schedule.aiConfidence > 0.8 ? 'success.50' : 'background.paper'
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" noWrap>
                                    {employee?.firstName} {employee?.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {schedule.startTime} - {schedule.endTime}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {schedule.department} • {schedule.role}
                                  </Typography>
                                  {schedule.aiConfidence && (
                                    <Chip
                                      label={`${Math.round(schedule.aiConfidence * 100)}% confidence`}
                                      size="small"
                                      color={schedule.aiConfidence > 0.8 ? 'success' : schedule.aiConfidence > 0.5 ? 'warning' : 'error'}
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                </Box>
                                
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Tooltip title="Edit shift">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditShift(schedule)}
                                      disabled={!schedule.canEdit}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete shift">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteShift(schedule)}
                                      disabled={!schedule.canDelete}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </Paper>
                          )
                        })}

                        {daySchedules.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No shifts scheduled
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* Booking Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {currentWeekDates.map((date, _index) => {
              const dateKey = format(date, "yyyy-MM-dd")
              const dayBookings = bookingsByDate[dateKey] || []
              const daySchedules = schedulesByDate[dateKey] || []

              return (
                <Grid item xs={12} md={6} lg={4} key={dateKey}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {format(date, "EEEE, MMM d")}
                      </Typography>

                      {/* Booking Statistics */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Booking Demand
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'info.50' }}>
                              <Typography variant="h6" color="info.main">
                                {dayBookings.length}
                              </Typography>
                              <Typography variant="caption">
                                Bookings
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6}>
                            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.50' }}>
                              <Typography variant="h6" sx={{ color: themeConfig.brandColors.navy }}>
                                {dayBookings.reduce((sum, b) => sum + (b.guests || b.covers || 2), 0)}
                              </Typography>
                              <Typography variant="caption">
                                Covers
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Staff Coverage */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Staff Coverage
                        </Typography>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.50' }}>
                          <Typography variant="h6" color="success.main">
                            {daySchedules.length}
                          </Typography>
                          <Typography variant="caption">
                            Staff Scheduled
                          </Typography>
                        </Paper>
                      </Box>

                      {/* Peak Hours */}
                      {dayBookings.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Peak Hours
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {calculatePeakHours(dayBookings).map(hour => (
                              <Chip
                                key={hour}
                                label={`${hour}:00`}
                                size="small"
                                color="primary"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* AI Learning Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Learning Statistics
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Learning Events
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {aiLearningData.length}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      AI Confidence
                    </Typography>
                    <Typography variant="h4" color="success">
                      {Math.round(aiInsights.confidence * 100)}%
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Recent Learning Events
                  </Typography>
                  {aiLearningData.slice(-5).reverse().map((learning, _index) => (
                    <Paper key={learning.id} sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(learning.timestamp), "MMM d, HH:mm")}
                      </Typography>
                      <Typography variant="body2">
                        {learning.userAdjustment.action === 'modified' ? 'Modified' : 
                         learning.userAdjustment.action === 'deleted' ? 'Deleted' : 'Added'} shift
                      </Typography>
                    </Paper>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    AI Recommendations
                  </Typography>
                  
                  {aiInsights.recommendations.length > 0 ? (
                    <Box>
                      {aiInsights.recommendations.map((recommendation, _index) => (
                        <Alert key={_index} severity="info" sx={{ mb: 1 }}>
                          {recommendation}
                        </Alert>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recommendations yet. Start making adjustments to schedules to help the AI learn your preferences.
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Learning Status
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={aiLearningEnabled}
                        onChange={(e) => setAiLearningEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={aiLearningEnabled ? "AI Learning Active" : "AI Learning Disabled"}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Shift</DialogTitle>
        <DialogContent>
          {selectedShift && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={editFormData.startTime || selectedShift.startTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Time"
                    type="time"
                    value={editFormData.endTime || selectedShift.endTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Department"
                    value={editFormData.department || selectedShift.department}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Role"
                    value={editFormData.role || selectedShift.role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    multiline
                    rows={3}
                    value={editFormData.notes || selectedShift.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={loading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Shift</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this shift for {selectedShift?.employeeName} on {selectedShift && format(parseISO(selectedShift.date), "MMM d, yyyy")}?
          </Typography>
          {aiLearningEnabled && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This action will be recorded for AI learning purposes.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Delete Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Learning Dialog */}
      <Dialog open={isAILearningDialogOpen} onClose={() => setIsAILearningDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>AI Learning Insights</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Learning Patterns
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Learning Events: {aiLearningData.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI Confidence: {Math.round(aiInsights.confidence * 100)}%
                </Typography>
              </Box>

              {Object.keys(aiInsights.patterns).length > 0 && (
                <Box>
                  {Object.entries(aiInsights.patterns).map(([key, value]) => (
                    <Paper key={key} sx={{ p: 2, mb: 1 }}>
                      <Typography variant="subtitle2">{key}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {JSON.stringify(value, null, 2)}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {aiInsights.recommendations.length > 0 ? (
                <Box>
                  {aiInsights.recommendations.map((recommendation, _index) => (
                    <Alert key={_index} severity="info" sx={{ mb: 1 }}>
                      {recommendation}
                    </Alert>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recommendations available yet. Make more schedule adjustments to improve AI learning.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAILearningDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AICalendarSchedule
