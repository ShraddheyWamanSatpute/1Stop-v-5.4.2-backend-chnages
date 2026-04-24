/**
 * Data Filter Utilities for ESS Portal
 * Ensures staff can ONLY see their own data
 */

import type { Employee, Schedule, TimeOff, Attendance, Payroll, PerformanceReview } from "../../../app/backend/interfaces/HRs"
import type { ESSHolidayBalance, ESSClockEvent, ESSPublicHoliday } from "../interfaces"

/**
 * Filter employees to get current user's record only
 */
export const filterCurrentEmployee = (
  employees: Employee[],
  userId: string
): Employee | null => {
  if (!employees || !userId) return null

  return employees.find(
    (emp) =>
      String((emp as any).userId || (emp as any).userID || (emp as any).user_id || (emp as any).uid || (emp as any).userUID || (emp as any).firebaseUid) === String(userId) ||
      String(emp.id) === String(userId) ||
      String((emp as any).employeeId || (emp as any).employeeID) === String(userId)
  ) || null
}

/**
 * Filter schedules to current employee only
 */
export const filterEmployeeSchedules = (
  schedules: Schedule[],
  employeeId: string
): Schedule[] => {
  if (!schedules || !employeeId) return []

  return schedules.filter((schedule) => {
    // Handle both employeeId and employeeID (uppercase) field names
    const scheduleEmployeeId = schedule.employeeId || (schedule as any).employeeID
    return String(scheduleEmployeeId) === String(employeeId)
  })
}

/**
 * Normalize date to YYYY-MM-DD format for comparison
 */
const normalizeDate = (dateValue: string | number | Date | undefined): string | null => {
  if (!dateValue) return null
  
  // If it's already a string in YYYY-MM-DD format, return it
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }
  
  // If it's a number (timestamp), convert to date string
  if (typeof dateValue === 'number') {
    return new Date(dateValue).toISOString().split("T")[0]
  }
  
  // If it's a Date object, convert to string
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split("T")[0]
  }
  
  // If it's a string in another format, try to parse it
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
    // If it's already in a date-like format, try to extract YYYY-MM-DD
    const match = dateValue.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Get upcoming shifts (from today onwards)
 * Matches the logic from EmployeeSelfService in the main app
 * Uses direct employeeId comparison like: s.employeeId === currentEmployee.id
 */
export const filterUpcomingShifts = (
  schedules: Schedule[],
  employeeId: string,
  limit?: number
): Schedule[] => {
  if (!schedules || !employeeId) return []

  // Filter by employee first (matching EmployeeSelfService logic: s.employeeId === currentEmployee.id)
  const employeeSchedules = schedules.filter((s: any) => {
    const scheduleEmployeeId = s.employeeId || s.employeeID || (s as any).employeeId
    return String(scheduleEmployeeId) === String(employeeId)
  })

  if (employeeSchedules.length === 0) return []

  // Filter shifts - show scheduled, confirmed, and completed shifts (exclude cancelled and draft)
  // and only include shifts that are today or in the future.
  const todayKey = new Date().toISOString().split("T")[0]
  const filtered = employeeSchedules
    .filter((s) => {
      const scheduleDate = normalizeDate(s.date)
      if (!scheduleDate) return false
      if (scheduleDate < todayKey) return false
      return s.status === "scheduled" || s.status === "confirmed" || s.status === "completed"
    })
    .sort((a, b) => {
      const dateA = normalizeDate(a.date) || ""
      const dateB = normalizeDate(b.date) || ""
      return dateA.localeCompare(dateB)
    })

  return limit ? filtered.slice(0, limit) : filtered
}

/**
 * Filter time off requests to current employee only
 */
export const filterEmployeeTimeOff = (
  timeOffs: TimeOff[],
  employeeId: string
): TimeOff[] => {
  if (!timeOffs || !employeeId) return []

  return timeOffs.filter((t) => String(t.employeeId) === String(employeeId))
}

/**
 * Get pending time off requests
 */
export const filterPendingTimeOff = (
  timeOffs: TimeOff[],
  employeeId: string
): TimeOff[] => {
  return filterEmployeeTimeOff(timeOffs, employeeId).filter(
    (t) => t.status === "pending"
  )
}

/**
 * Get approved time off (for display)
 */
export const filterApprovedTimeOff = (
  timeOffs: TimeOff[],
  employeeId: string
): TimeOff[] => {
  return filterEmployeeTimeOff(timeOffs, employeeId).filter(
    (t) => t.status === "approved"
  )
}

/**
 * Filter attendance records to current employee only
 */
export const filterEmployeeAttendance = (
  attendances: Attendance[],
  employeeId: string
): Attendance[] => {
  if (!attendances || !employeeId) return []

  return attendances.filter((a) => String(a.employeeId) === String(employeeId))
}

/**
 * Get recent attendance (last N days)
 */
export const filterRecentAttendance = (
  attendances: Attendance[],
  employeeId: string,
  days: number = 14
): Attendance[] => {
  return filterEmployeeAttendance(attendances, employeeId)
    .sort((a, b) => b.date - a.date)
    .slice(0, days)
}

/**
 * Filter payroll/payslips to current employee only
 */
export const filterEmployeePayslips = (
  payrolls: Payroll[],
  employeeId: string
): Payroll[] => {
  if (!payrolls || !employeeId) return []

  return payrolls.filter((p) => String(p.employeeId) === String(employeeId))
}

/**
 * Filter performance reviews for a specific employee
 */
export const filterEmployeePerformanceReviews = (
  reviews: PerformanceReview[],
  employeeId: string
): PerformanceReview[] => {
  if (!reviews || !employeeId) return []

  return reviews.filter((review) => 
    String(review.employeeId) === String(employeeId)
  )
}

/**
 * Filter public holidays by year
 * Returns holidays that fall within the specified year
 */
export const filterPublicHolidays = (
  holidays: ESSPublicHoliday[],
  year?: number
): ESSPublicHoliday[] => {
  if (!holidays || holidays.length === 0) return []

  // If no year specified, use current year
  const targetYear = year || new Date().getFullYear()

  return holidays.filter((holiday) => {
    // Convert date (timestamp) to Date object
    const holidayDate = new Date(holiday.date)
    const holidayYear = holidayDate.getFullYear()
    return holidayYear === targetYear
  }).sort((a, b) => a.date - b.date) // Sort by date ascending
}

/**
 * Calculate holiday balance from time off records
 */
/**
 * Calculate holiday balance using: accrued - used = remaining
 * Accrual is based on hours worked: accrued = (holidaysPerYear / (52 * hoursPerWeek)) * hoursWorked
 * Main app checks for both 'holiday' and 'vacation' types
 * Matching ViewEmployee logic from main app
 */
export const calculateHolidayBalance = (
  employee: Employee,
  timeOffs: TimeOff[],
  attendances?: any[] // Optional attendance data for actual hours worked
): ESSHolidayBalance => {
  // Get employee contract details
  const holidaysPerYear = employee.holidaysPerYear || 25
  const hoursPerWeek = employee.hoursPerWeek || 40
  const carryOver = (employee as any).holidayCarryOver || 0
  
  // Calculate hours worked
  let hoursWorked = 0
  
  if (attendances && attendances.length > 0) {
    // Use actual attendance data if available (sum of totalHours from attendance records)
    hoursWorked = attendances.reduce((sum, att) => sum + (att.totalHours || att.actualHours || 0), 0)
  } else {
    // Fallback: Calculate from hire date (matching ViewEmployee logic)
    const hireDateValue = employee.hireDate || employee.startDate || Date.now()
    const hireDate = typeof hireDateValue === 'number' ? hireDateValue : new Date(hireDateValue).getTime()
    const weeksWorked = Math.floor((Date.now() - hireDate) / (1000 * 60 * 60 * 24 * 7))
    const hoursPerWeekNum = Number(hoursPerWeek) || 40
    hoursWorked = Math.min(weeksWorked * hoursPerWeekNum, 52 * hoursPerWeekNum) // Cap at full year
  }
  
  // Calculate accrual rate: holidaysPerYear / (52 * hoursPerWeek)
  // Example: 28 days / (52 * 40) = 28 / 2080 = 0.01346... days per hour
  const hoursPerWeekNum = Number(hoursPerWeek) || 40
  const totalHoursPerYear = 52 * hoursPerWeekNum
  const hourlyAccrualRate = totalHoursPerYear > 0 ? holidaysPerYear / totalHoursPerYear : 0
  
  // Calculate accrued days based on hours worked
  const accruedFromHours = hourlyAccrualRate * hoursWorked
  
  // Total accrued = accrued from hours + carryOver
  const accrued = Math.floor(accruedFromHours) + carryOver

  // Filter employee time offs - match main app: checks for both 'holiday' and 'vacation'
  // Note: TimeOff type allows "vacation" | "sick" | "personal" | "bereavement" | "jury_duty" | "other"
  // But main app also checks for "holiday", so we need to cast to any to handle both
  const employeeTimeOffs = filterEmployeeTimeOff(timeOffs, employee.id).filter(
    (t) => (t.type as any) === "holiday" || t.type === "vacation"
  )

  // Calculate used holidays from approved requests
  const used = employeeTimeOffs
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + (t.totalDays || 0), 0)

  // Calculate pending holidays
  const pending = employeeTimeOffs
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + (t.totalDays || 0), 0)

  // Calculate remaining using: accrued - used = remaining
  const remaining = accrued - used

  return {
    total: accrued,
    used,
    pending,
    remaining: Math.max(0, remaining), // Ensure non-negative for display
    carryOver,
  }
}

/**
 * Determine current clock status from attendance
 */
export const determineClockStatus = (attendances: Attendance[]): {
  isClockedIn: boolean
  clockInTime: number | null
  lastClockEvent: ESSClockEvent | null
} => {
  if (!attendances?.length) {
    return { isClockedIn: false, clockInTime: null, lastClockEvent: null }
  }

  const today = new Date().toISOString().split("T")[0]
  const todayAttendance = attendances.find(
    (a) => new Date(a.date).toISOString().split("T")[0] === today
  )

  if (!todayAttendance) {
    return { isClockedIn: false, clockInTime: null, lastClockEvent: null }
  }

  const isClockedIn = !!todayAttendance.clockIn && !todayAttendance.clockOut

  // Build location object safely (only include properties that exist)
  let locationData: { latitude: number; longitude: number; accuracy?: number } | undefined
  
  if (todayAttendance.location) {
    locationData = {
      latitude: todayAttendance.location.latitude,
      longitude: todayAttendance.location.longitude,
    }
    
    // Only add accuracy if it exists on the location object
    if ('accuracy' in todayAttendance.location) {
      locationData.accuracy = (todayAttendance.location as any).accuracy
    }
  }

  return {
    isClockedIn,
    clockInTime: isClockedIn ? new Date(todayAttendance.clockIn).getTime() : null,
    lastClockEvent: {
      type: isClockedIn ? ("in" as const) : ("out" as const),
      timestamp: isClockedIn
        ? new Date(todayAttendance.clockIn).getTime()
        : todayAttendance.clockOut
          ? new Date(todayAttendance.clockOut).getTime()
          : todayAttendance.date,
      location: locationData,
    },
  }
}
