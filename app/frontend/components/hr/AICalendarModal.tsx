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
  DialogContentText
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Event as EventIcon,
  AutoFixHigh as AutoFixHighIcon,
  CalendarToday as CalendarTodayIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Analytics as AnalyticsIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  SmartToy as SmartToyIcon
} from "@mui/icons-material"
import { format, parseISO, endOfWeek, eachDayOfInterval, addDays, isSameDay, isWithinInterval } from "date-fns"
import { useHR } from "../../../backend/context/HRContext"
import { debugVerbose } from "../../../utils/debugLog"
// import { useBookings } from "../../../backend/context/BookingsContext" // Commented out due to context issues
import type { Schedule } from "../../../backend/interfaces/HRs"

// AI Learning System Interfaces (simplified for modal)
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

interface AICalendarModalProps {
  open: boolean
  onClose: () => void
  currentWeekStart: Date
  onSchedulesUpdated?: (schedules: Schedule[]) => void
  existingSchedules?: Schedule[]
  bookingData?: any[] // Optional booking data to avoid context dependency
  aiSuggestions?: Array<{
    employeeId: string
    employeeName: string
    date: string
    startTime: string
    endTime: string
    department: string
    role?: string
    notes: string
    shiftType: "regular" | "holiday" | "off" | "training"
    payType: "hourly" | "flat"
    payRate?: number
  }> // AI-generated suggestions to accept
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
      id={`ai-modal-tabpanel-${index}`}
      aria-labelledby={`ai-modal-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const AICalendarModal: React.FC<AICalendarModalProps> = ({
  open,
  onClose,
  currentWeekStart,
  onSchedulesUpdated,
  existingSchedules = [],
  bookingData = [],
  aiSuggestions = []
}) => {
  const { state: hrState, addSchedule, updateSchedule, deleteSchedule, refreshEmployees } = useHR()
  
  // Debug HR context state (extra-noisy; enable with VITE_DEBUG_VERBOSE=true)
  debugVerbose("🔍 AI Calendar Modal - HR Context State:", {
    employeesCount: hrState.employees?.length || 0,
    schedulesCount: hrState.schedules?.length || 0,
    isLoading: hrState.isLoading,
    initialized: hrState.initialized,
    employees: hrState.employees?.slice(0, 3).map(e => ({ id: e.id, employeeID: e.employeeID, name: `${e.firstName} ${e.lastName}` })) || [],
    error: hrState.error
  })
  
  // Ensure employees are loaded when modal opens
  useEffect(() => {
    if (open && (!hrState.employees || hrState.employees.length === 0)) {
      debugVerbose("🔄 AI Calendar Modal - No employees found, refreshing employees...")
      refreshEmployees()
    }
  }, [open, hrState.employees, refreshEmployees])
  
  // Use provided booking data or fallback to empty array
  
  // Add some mock booking data for demonstration if no real data is provided
  const mockBookings = bookingData.length === 0 ? [
    {
      id: 'mock-1',
      date: format(currentWeekStart, 'yyyy-MM-dd'),
      startTime: '12:00',
      endTime: '14:00',
      guests: 4,
      covers: 4
    },
    {
      id: 'mock-2', 
      date: format(addDays(currentWeekStart, 1), 'yyyy-MM-dd'),
      startTime: '19:00',
      endTime: '21:00',
      guests: 6,
      covers: 6
    }
  ] : bookingData
  
  const finalBookingsState = { bookings: mockBookings }

  // Helper functions (moved before useMemo to avoid hoisting issues)
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

  // State management
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [acceptingSuggestions, setAcceptingSuggestions] = useState(false)
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

  // Get schedules for current week (use AI suggestions if available, otherwise existing schedules)
  const currentWeekSchedules = useMemo(() => {
    debugVerbose("🔍 AI Calendar Modal - Schedule Data Debug:", {
      aiSuggestionsLength: aiSuggestions.length,
      existingSchedulesLength: existingSchedules.length,
      currentWeekStart: format(currentWeekStart, "yyyy-MM-dd"),
      currentWeekEnd: format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      aiSuggestionsPreview: aiSuggestions.slice(0, 5).map(s => ({
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        role: s.role || "",
        notes: s.notes,
        shiftType: s.shiftType,
        payType: s.payType,
        payRate: s.payRate
      })),
      existingSchedulesPreview: existingSchedules.slice(0, 3).map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        role: s.role || "",
        notes: s.notes,
        shiftType: s.shiftType,
        payType: s.payType,
        payRate: s.payRate
      })),
      modalOpen: true,
      usingAISuggestions: aiSuggestions.length > 0
    })

    if (aiSuggestions.length > 0) {
      // Convert AI suggestions to schedule format for calendar view
      const convertedSuggestions = aiSuggestions.map(suggestion => ({
        id: `ai-suggestion-${suggestion.employeeId}-${suggestion.date}`, // Temporary ID for display
        employeeId: suggestion.employeeId,
        employeeName: suggestion.employeeName,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        department: suggestion.department,
        role: suggestion.role || "",
        notes: suggestion.notes,
        status: "scheduled",
        shiftType: suggestion.shiftType,
        payType: suggestion.payType,
        payRate: suggestion.payRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      debugVerbose("✅ Using AI suggestions, converted count:", convertedSuggestions.length)
      debugVerbose("🔍 Converted suggestions sample:", convertedSuggestions.slice(0, 3).map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        status: s.status
      })))
      debugVerbose("🎯 AI Calendar Modal - RETURNING AI SUGGESTIONS FOR CALENDAR DISPLAY")
      return convertedSuggestions
    } else {
      // Fall back to existing schedules if no AI suggestions
      const filteredSchedules = existingSchedules.filter(schedule => {
        const scheduleDate = parseISO(schedule.date)
        return isWithinInterval(scheduleDate, {
          start: currentWeekStart,
          end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
        })
      })
      
      debugVerbose("📅 Using existing schedules, filtered count:", filteredSchedules.length)
      return filteredSchedules
    }
  }, [aiSuggestions, existingSchedules, currentWeekStart])

  // Get bookings for current week
  const currentWeekBookings = useMemo(() => {
    if (!finalBookingsState.bookings) return []
    
    return finalBookingsState.bookings.filter(booking => {
      const bookingDate = new Date(booking.date || booking.startTime || booking.startDate)
      return isWithinInterval(bookingDate, {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      })
    })
  }, [finalBookingsState.bookings, currentWeekStart])

  // Enhanced schedules with booking data and AI insights
  const enhancedSchedules = useMemo(() => {
    debugVerbose("🔍 AI Calendar Modal - Enhancing schedules:", {
      currentWeekSchedulesCount: currentWeekSchedules.length,
      currentWeekBookingsCount: currentWeekBookings.length,
      sampleSchedule: currentWeekSchedules[0] ? {
        id: currentWeekSchedules[0].id,
        employeeId: currentWeekSchedules[0].employeeId,
        employeeName: currentWeekSchedules[0].employeeName,
        date: currentWeekSchedules[0].date,
        startTime: currentWeekSchedules[0].startTime,
        endTime: currentWeekSchedules[0].endTime
      } : null
    })
    
    return currentWeekSchedules.map(schedule => {
      const dayBookings = currentWeekBookings.filter(booking => {
        const bookingDate = new Date(booking.date || booking.startTime || booking.startDate)
        return isSameDay(bookingDate, parseISO(schedule.date))
      })

      // Calculate booking demand for this shift
      const bookingDemand = {
        totalBookings: dayBookings.length,
        peakHours: calculatePeakHours(dayBookings),
        covers: dayBookings.reduce((sum, booking) => sum + (booking.guests || booking.covers || 2), 0)
      }

      // Calculate AI confidence based on historical patterns
      const typedSchedule: Schedule = {
        ...schedule,
        status: schedule.status as "draft" | "scheduled" | "confirmed" | "completed" | "cancelled"
      }
      const aiConfidence = calculateAIConfidence(typedSchedule, bookingDemand)

      return {
        ...schedule,
        bookingDemand,
        aiConfidence,
        canEdit: true,
        canDelete: true
      } as CalendarShift
    })
  }, [currentWeekSchedules, currentWeekBookings])

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
      
      // Notify parent component of changes
      if (onSchedulesUpdated) {
        onSchedulesUpdated(hrState.schedules)
      }
      
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
  }, [selectedShift, editFormData, aiLearningEnabled, updateSchedule, onSchedulesUpdated])

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
      
      // Notify parent component of changes
      if (onSchedulesUpdated) {
        onSchedulesUpdated(hrState.schedules)
      }
      
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
  }, [selectedShift, aiLearningEnabled, deleteSchedule, onSchedulesUpdated])

  // Accept calendar view shifts and add them as actual schedules
  const handleAcceptAISuggestions = useCallback(async () => {
    // Use the shifts shown in the calendar view (which are based on AI suggestions if available)
    const shiftsToAccept = currentWeekSchedules
    
    debugVerbose("🎯 ACCEPT CALENDAR SHIFTS CALLED:", {
      totalShifts: shiftsToAccept.length,
      shiftsPreview: shiftsToAccept.slice(0, 5).map(s => ({
        employee: s.employeeName,
        date: s.date,
        time: `${s.startTime}-${s.endTime}`,
        department: s.department,
        isAISuggestion: s.id?.startsWith('ai-suggestion-') || false
      })),
      uniqueEmployees: new Set(shiftsToAccept.map(s => s.employeeId)).size,
      availableEmployees: hrState.employees.length,
      existingSchedules: hrState.schedules.length,
      aiSuggestionsAvailable: aiSuggestions.length
    })

    if (shiftsToAccept.length === 0) {
      setNotification({
        open: true,
        message: "No shifts to accept in the calendar view",
        severity: "warning"
      })
      return
    }

    try {
      setAcceptingSuggestions(true)
      const promises: Promise<any>[] = []
      const successfulSchedules: string[] = []
      const failedSchedules: string[] = []

      debugVerbose(`Accepting ${shiftsToAccept.length} calendar shifts...`)

      shiftsToAccept.forEach((shift, _index) => {
        debugVerbose(`🔍 Looking for employee with ID: ${shift.employeeId}`)
        debugVerbose(`📋 Available employees:`, hrState.employees.map(e => ({ 
          id: e.id, 
          employeeID: e.employeeID, 
          name: `${e.firstName} ${e.lastName}`,
          status: e.status
        })))
        
        const employee = hrState.employees.find((emp) => (emp.id || emp.employeeID) === shift.employeeId)
        if (!employee) {
          debugVerbose(`❌ Employee not found for shift ${_index + 1}:`, {
            shiftEmployeeId: shift.employeeId,
            shiftEmployeeName: shift.employeeName,
            availableEmployeeIds: hrState.employees.map(e => ({ id: e.id, employeeID: e.employeeID, name: `${e.firstName} ${e.lastName}` }))
          })
          failedSchedules.push(`${shift.employeeName} (${shift.date})`)
          return
        }
        
        debugVerbose(`✅ Found employee:`, { id: employee.id, employeeID: employee.employeeID, name: `${employee.firstName} ${employee.lastName}` })

        // Check for existing schedule conflicts (skip if this is already an existing schedule)
        const existingSchedule = shift.id?.startsWith('ai-suggestion-') ? 
          hrState.schedules.find((existing) => existing.employeeId === shift.employeeId && existing.date === shift.date) :
          null

        // Determine pay rate based on employee settings
        const payRate = shift.payType === "flat" ? (shift.payRate || 0) : (employee.hourlyRate || 0)

        // Validate and prepare schedule data according to Schedule interface
        const scheduleData: Omit<Schedule, "id"> = {
          employeeId: shift.employeeId, // Use employeeId for Schedule interface
          employeeName: shift.employeeName,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          department: shift.department || employee.department || "General",
          role: shift.role || employee.position || employee.jobTitle || "",
          notes: shift.notes || "Calendar View Schedule",
          status: "scheduled" as const,
          shiftType: (shift.shiftType || "regular") as "regular" | "holiday" | "off" | "training",
          payType: (shift.payType || "hourly") as "hourly" | "flat",
          payRate: payRate,
          departmentID: employee.departmentId || "", // Add departmentID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Validate required fields
        if (!scheduleData.employeeId || !scheduleData.employeeName || !scheduleData.date || !scheduleData.startTime || !scheduleData.endTime) {
          console.error(`❌ Invalid schedule data for ${shift.employeeName} on ${shift.date}:`, {
            employeeId: scheduleData.employeeId,
            employeeName: scheduleData.employeeName,
            date: scheduleData.date,
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime
          })
          failedSchedules.push(`${shift.employeeName} (${shift.date}) - Missing required fields`)
          return
        }

        debugVerbose(`Creating schedule ${_index + 1}/${shiftsToAccept.length}:`, {
          employeeId: scheduleData.employeeId,
          employeeName: scheduleData.employeeName,
          date: scheduleData.date,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          department: scheduleData.department,
          role: scheduleData.role,
          isAISuggestion: shift.id?.startsWith('ai-suggestion-') || false
        })

        const schedulePromise = (existingSchedule ? 
          // Update existing schedule
          updateSchedule(existingSchedule.id, scheduleData) :
          // Create new schedule
          addSchedule(scheduleData)
        ).then((result) => {
          debugVerbose(`📊 Database result for ${shift.employeeName} on ${shift.date}:`, {
            success: !!result,
            resultType: typeof result,
            resultId: result?.id,
            action: existingSchedule ? 'update' : 'create',
            scheduleData: {
              employeeId: scheduleData.employeeId,
              date: scheduleData.date,
              startTime: scheduleData.startTime,
              endTime: scheduleData.endTime,
              department: scheduleData.department,
              status: scheduleData.status
            }
          })
          
          if (result && result.id) {
            const action = existingSchedule ? 'updated' : 'created'
            const scheduleId = result.id
            successfulSchedules.push(`${shift.employeeName} (${shift.date})`)
            debugVerbose(`✅ Successfully ${action} schedule for ${shift.employeeName} on ${shift.date} with ID: ${scheduleId}`)
            return result
          } else {
            failedSchedules.push(`${shift.employeeName} (${shift.date}) - No ID returned`)
            const action = existingSchedule ? 'update' : 'create'
            debugVerbose(`❌ Failed to ${action} schedule for ${shift.employeeName} on ${shift.date} - no ID returned from database`)
            return null
          }
        }).catch((error) => {
          failedSchedules.push(`${shift.employeeName} (${shift.date}) - ${error.message || 'Unknown error'}`)
          const action = existingSchedule ? 'updating' : 'creating'
          console.error(`❌ Database error ${action} schedule for ${shift.employeeName} on ${shift.date}:`, {
            error: error.message,
            stack: error.stack,
            scheduleData: {
              employeeId: scheduleData.employeeId,
              date: scheduleData.date,
              startTime: scheduleData.startTime,
              endTime: scheduleData.endTime
            }
          })
          return null
        })

        promises.push(schedulePromise)
      })

      await Promise.all(promises)

      // Show comprehensive results
      debugVerbose("🎯 FINAL ACCEPTANCE RESULTS:", {
        totalProcessed: shiftsToAccept.length,
        successful: successfulSchedules.length,
        failed: failedSchedules.length,
        successRate: `${Math.round((successfulSchedules.length / shiftsToAccept.length) * 100)}%`,
        successfulSchedules: successfulSchedules,
        failedSchedules: failedSchedules
      })

      if (successfulSchedules.length > 0) {
        debugVerbose(`✅ Successfully accepted ${successfulSchedules.length} calendar shifts:`, successfulSchedules)
      }
      if (failedSchedules.length > 0) {
        debugVerbose(`❌ Failed to accept ${failedSchedules.length} calendar shifts:`, failedSchedules)
      }

      setNotification({ 
        open: true,
        message: `Accepted ${successfulSchedules.length} calendar shifts${failedSchedules.length > 0 ? ` (${failedSchedules.length} failed)` : ''}`, 
        severity: successfulSchedules.length > 0 ? "success" : "error" 
      })

      // Notify parent component of changes
      if (onSchedulesUpdated) {
        debugVerbose("📞 AI Calendar Modal - Calling onSchedulesUpdated callback")
        onSchedulesUpdated(hrState.schedules)
        debugVerbose("✅ AI Calendar Modal - onSchedulesUpdated callback completed")
      } else {
        debugVerbose("⚠️ AI Calendar Modal - onSchedulesUpdated callback not provided")
      }

      // Close modal after successful acceptance (wait for refresh to complete)
      if (successfulSchedules.length > 0) {
        setTimeout(() => {
          debugVerbose("🔄 AI Calendar Modal - Closing modal after successful acceptance")
          onClose()
        }, 3000) // Increased timeout to allow for refresh
      }

    } catch (error: any) {
      console.error("Failed to accept AI suggestions:", error)
      setNotification({
        open: true,
        message: error.message || "Failed to accept AI suggestions",
        severity: "error"
      })
    } finally {
      setAcceptingSuggestions(false)
    }
  }, [aiSuggestions, hrState.employees, addSchedule, updateSchedule, onSchedulesUpdated, onClose])

  // AI Learning functions
  const generateAIInsights = useCallback(() => {
    const patterns: Record<string, any> = {}
    const recommendations: string[] = []
    let confidence = 0

    if (aiLearningData.length > 0) {
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

      confidence = Math.min(1, aiLearningData.length / 50)
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
      const bookingDate = new Date(booking.date || booking.startTime || booking.startDate)
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

  const handleClose = () => {
    // Reset state when closing
    setTabValue(0)
    setSelectedShift(null)
    setEditFormData({})
    setIsEditDialogOpen(false)
    setIsDeleteDialogOpen(false)
    
    // Clear any focus to prevent aria-hidden conflicts
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    
    onClose()
  }

  return (
    <>
      {/* Main AI Calendar Modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SmartToyIcon sx={{ fontSize: 28, color: themeConfig.brandColors.navy }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" component="h2">
                AI Calendar Schedule Manager
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={aiLearningEnabled}
                    onChange={(e) => setAiLearningEnabled(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label="AI Learning"
              />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
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
                    AI Suggestions
                    {currentWeekSchedules.length > 0 && (
                      <Badge badgeContent={currentWeekSchedules.length} color="primary" />
                    )}
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AnalyticsIcon />
                    AI Learning
                    {aiLearningData.length > 0 && (
                      <Badge badgeContent={aiLearningData.length} color="secondary" />
                    )}
                  </Box>
                } 
              />
            </Tabs>
          </Box>

          {/* Calendar View Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ height: 'calc(90vh - 200px)', overflow: 'auto', p: 2 }}>
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
            </Box>
          </TabPanel>

          {/* Booking Analysis Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ height: 'calc(90vh - 200px)', overflow: 'auto', p: 2 }}>
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
            </Box>
          </TabPanel>

          {/* AI Suggestions Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ height: 'calc(90vh - 200px)', overflow: 'auto', p: 2 }}>
              {currentWeekSchedules.length > 0 ? (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6">
                      AI Generated Schedule Suggestions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review the suggestions below and use the "Accept All" button at the bottom to create schedules.
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {currentWeekSchedules.map((shift, _index) => {
                      const employee = hrState.employees.find(emp => (emp.id || emp.employeeID) === shift.employeeId)
                      const existingSchedule = hrState.schedules.find(
                        (existing) => existing.employeeId === shift.employeeId && existing.date === shift.date
                      )

                      return (
                        <Grid item xs={12} md={6} lg={4} key={`${shift.employeeId}-${shift.date}`}>
                          <Card sx={{ 
                            border: existingSchedule ? 2 : 1,
                            borderColor: existingSchedule ? 'warning.main' : 'divider',
                            bgcolor: existingSchedule ? 'warning.50' : 'background.paper'
                          }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                  <Typography variant="h6" noWrap>
                                    {employee?.firstName} {employee?.lastName}
                                  </Typography>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    {format(parseISO(shift.date), "EEEE, MMM d")}
                                  </Typography>
                                </Box>
                                {existingSchedule && (
                                  <Chip
                                    label="Update Existing"
                                    size="small"
                                    color="warning"
                                  />
                                )}
                              </Box>

                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                  {shift.startTime} - {shift.endTime}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <BusinessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                  {shift.department} • {shift.role}
                                </Typography>
                                {shift.notes && (
                                  <Typography variant="body2" color="text.secondary">
                                    {shift.notes}
                                  </Typography>
                                )}
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {shift.shiftType} • {shift.payType}
                                </Typography>
                                {shift.payRate && (
                                  <Typography variant="caption" color="text.secondary">
                                    £{shift.payRate}/hr
                                  </Typography>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                    })}
                  </Grid>

                  <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Note:</strong> Clicking "Accept All" will create new schedules or update existing ones. 
                      The AI learning system will track these changes for future improvements.
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AutoFixHighIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No AI Suggestions Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate AI suggestions first to see them here.
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* AI Learning Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ height: 'calc(90vh - 200px)', overflow: 'auto', p: 2 }}>
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
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleClose} 
            variant="outlined"
            disabled={acceptingSuggestions}
          >
            Close
          </Button>
          {currentWeekSchedules.length > 0 && (
            <Button
              variant="contained"
              color="success"
              onClick={handleAcceptAISuggestions}
              disabled={acceptingSuggestions}
              startIcon={<CheckIcon />}
              sx={{ minWidth: 200 }}
            >
              {`Accept All Calendar Shifts (${currentWeekSchedules.length})`}
            </Button>
          )}
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={acceptingSuggestions}
            startIcon={<RefreshIcon />}
          >
            Refresh & Close
          </Button>
        </DialogActions>
      </Dialog>

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
            startIcon={<SaveIcon />}
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
          <DialogContentText>
            Are you sure you want to delete this shift for {selectedShift?.employeeName} on {selectedShift && format(parseISO(selectedShift.date), "MMM d, yyyy")}?
          </DialogContentText>
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
            startIcon={<DeleteIcon />}
            disabled={loading}
          >
            Delete Shift
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
    </>
  )
}

export default AICalendarModal
