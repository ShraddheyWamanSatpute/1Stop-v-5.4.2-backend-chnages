/**
 * ESS Context Provider
 * 
 * Main state management for ESS Portal:
 * - Triple verification (auth + role + employee)
 * - Data isolation (staff sees only their data)
 * - Clock in/out management
 * - Company settings integration
 * - Multi-company support
 */

"use client"

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react"
import { useSettings } from "../../../app/backend/context/SettingsContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { useHR } from "../../../app/backend/context/HRContext"
import { db, ref, get } from "../services/Firebase"
import { parseISO } from "date-fns"
import { ESSSessionPersistence } from "../utils/mobileSessionPersistence"
import {
  filterCurrentEmployee,
  filterUpcomingShifts,
  filterPendingTimeOff,
  filterApprovedTimeOff,
  filterRecentAttendance,
  filterEmployeePayslips,
  filterEmployeePerformanceReviews,
  calculateHolidayBalance,
  determineClockStatus,
} from "../utils/mobileDataFilters"
import { findEmployeeForUser } from "../utils/mobileEmployeeLookup"
import type { PerformanceReview } from "../../../app/backend/interfaces/HRs"
import {
  createESSError,
  handleFirebaseError,
  logESSError,
} from "../utils/mobileErrorHandler"
import { useESSDevice } from "../../frontend/hooks/useMobileDevice"
import type {
  ESSState,
  ESSAuthState,
  ESSContextValue,
  ESSCompanySettings,
  ESSClockInPayload,
  ESSClockOutPayload,
  ESSTimeOffRequest,
  ESSError,
  ESSPerformanceReview,
  ESSUserRole,
  ESSEmergencyContact,
} from "../interfaces"

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_COMPANY_SETTINGS: ESSCompanySettings = {
  clockInRequiresLocation: true,
  allowEarlyClockIn: true,
  earlyClockInMinutes: 15,
  allowLateClockOut: true,
  autoClockOutEnabled: false,
  autoClockOutTime: "23:59",
  breakDurationMinutes: 30,
}

const INITIAL_STATE: ESSState = {
  currentEmployee: null,
  employeeId: null,
  isEmployeeLinked: false,
  emulatedEmployeeId: null,
  isClockedIn: false,
  clockInTime: null,
  lastClockEvent: null,
  upcomingShifts: [],
  pendingTimeOff: [],
  approvedTimeOff: [],
  recentAttendance: [],
  payslips: [],
  performanceReviews: [],
  publicHolidays: [],
  holidayBalance: {
    total: 0,
    used: 0,
    pending: 0,
    remaining: 0,
    carryOver: 0,
  },
  companySettings: DEFAULT_COMPANY_SETTINGS,
  isLoading: true,
  isInitialized: false,
  error: null,
  emergencyContacts: [],
}

// ============================================
// REDUCER
// ============================================

type ESSAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: ESSError | null }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "SET_EMPLOYEE"; payload: { employee: ESSState["currentEmployee"]; employeeId: string | null } }
  | { type: "SET_EMULATED_EMPLOYEE"; payload: string | null }
  | { type: "SET_CLOCK_STATUS"; payload: { isClockedIn: boolean; clockInTime: number | null; lastClockEvent: ESSState["lastClockEvent"] } }
  | { type: "SET_SCHEDULES"; payload: ESSState["upcomingShifts"] }
  | { type: "SET_TIME_OFF"; payload: { pending: ESSState["pendingTimeOff"]; approved: ESSState["approvedTimeOff"] } }
  | { type: "SET_ATTENDANCE"; payload: ESSState["recentAttendance"] }
  | { type: "SET_PAYSLIPS"; payload: ESSState["payslips"] }
  | { type: "SET_PERFORMANCE_REVIEWS"; payload: ESSState["performanceReviews"] }
  | { type: "SET_PUBLIC_HOLIDAYS"; payload: ESSState["publicHolidays"] }
  | { type: "SET_HOLIDAY_BALANCE"; payload: ESSState["holidayBalance"] }
  | { type: "SET_COMPANY_SETTINGS"; payload: ESSCompanySettings }
  | { type: "SET_EMERGENCY_CONTACTS"; payload: ESSState["emergencyContacts"] }
  | { type: "RESET_STATE" }

const essReducer = (state: ESSState, action: ESSAction): ESSState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }
    case "SET_INITIALIZED":
      return { ...state, isInitialized: action.payload }
    case "SET_EMPLOYEE":
      return {
        ...state,
        currentEmployee: action.payload.employee,
        employeeId: action.payload.employeeId,
        isEmployeeLinked: !!action.payload.employee,
      }
    case "SET_EMULATED_EMPLOYEE":
      return {
        ...state,
        emulatedEmployeeId: action.payload,
      }
    case "SET_CLOCK_STATUS":
      return {
        ...state,
        isClockedIn: action.payload.isClockedIn,
        clockInTime: action.payload.clockInTime,
        lastClockEvent: action.payload.lastClockEvent,
      }
    case "SET_SCHEDULES":
      return { ...state, upcomingShifts: action.payload }
    case "SET_TIME_OFF":
      return {
        ...state,
        pendingTimeOff: action.payload.pending,
        approvedTimeOff: action.payload.approved,
      }
    case "SET_ATTENDANCE":
      return { ...state, recentAttendance: action.payload }
    case "SET_PAYSLIPS":
      return { ...state, payslips: action.payload }
    case "SET_PERFORMANCE_REVIEWS":
      return { ...state, performanceReviews: action.payload }
    case "SET_PUBLIC_HOLIDAYS":
      return { ...state, publicHolidays: action.payload }
    case "SET_HOLIDAY_BALANCE":
      return { ...state, holidayBalance: action.payload }
    case "SET_COMPANY_SETTINGS":
      return { ...state, companySettings: action.payload }
    case "SET_EMERGENCY_CONTACTS":
      return { ...state, emergencyContacts: action.payload }
    case "RESET_STATE":
      return INITIAL_STATE
    default:
      return state
  }
}

// ============================================
// CONTEXT
// ============================================

const ESSContext = createContext<ESSContextValue | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

interface ESSProviderProps {
  children: React.ReactNode
}

export const ESSProvider: React.FC<ESSProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(essReducer, INITIAL_STATE)

  // Get data from existing contexts
  const { state: settingsState } = useSettings()
  const { state: companyState, setCompanyID } = useCompany()
  const {
    state: hrState,
    addAttendance,
    updateAttendance,
    addTimeOff,
    updateTimeOff,
    updateEmployee,
    updateSchedule,
  } = useHR()

  // Device detection
  const deviceInfo = useESSDevice()

  // ============================================
  // DERIVED AUTH STATE
  // ============================================

  const authState = useMemo((): ESSAuthState => {
    const isAuthenticated = settingsState.auth?.isLoggedIn === true
    const userId = settingsState.auth?.uid || (settingsState.user as any)?.uid || null

    // Get companies from settingsState (can be Array or Record keyed by companyID)
    const rawCompanies: any = (settingsState.user as any)?.companies || []
    const asArray: any[] = Array.isArray(rawCompanies)
      ? rawCompanies
      : rawCompanies && typeof rawCompanies === "object"
        ? Object.values(rawCompanies)
        : []

    const seen = new Set<string>()
    const companies = asArray
      .map((c: any) => ({
        companyId: String(c?.companyID || c?.companyId || c?.id || "").trim(),
        companyName: String(c?.companyName || c?.name || "").trim(),
        role: String(c?.role || "staff").toLowerCase() as ESSUserRole,
        siteId: String(c?.siteId || "").trim(),
        siteName: String(c?.siteName || "").trim(),
      }))
      .filter((c) => {
        if (!c.companyId) return false
        if (seen.has(c.companyId)) return false
        seen.add(c.companyId)
        return true
      })
      .map((c) => ({
        ...c,
        companyName: c.companyName || c.companyId,
        role: (["staff", "manager", "admin", "owner"].includes(c.role) ? c.role : "staff") as ESSUserRole,
      }))

    // Prefer CompanyContext company if set; otherwise prefer persisted ESS session; otherwise fall back to first company.
    const persistedCompanyId =
      typeof window !== "undefined" ? ESSSessionPersistence.getSession()?.companyId || null : null
    const currentCompanyId = companyState.companyID || persistedCompanyId || companies[0]?.companyId || null

    const persistedSiteId =
      typeof window !== "undefined" ? ESSSessionPersistence.getSession()?.siteId || null : null
    const currentSiteId = companyState.selectedSiteID || persistedSiteId || null

    // Role resolution: prefer CompanyContext role, otherwise resolve from the selected company record
    const userRoleFromCompanyState = companyState.user?.role?.toLowerCase() || null
    const userRoleFromCompanies =
      companies.find((c) => c.companyId === currentCompanyId)?.role || companies[0]?.role || null
    const userRoleRaw = userRoleFromCompanyState || userRoleFromCompanies
    const userRole: ESSUserRole | null =
      userRoleRaw && ["staff", "manager", "admin", "owner"].includes(userRoleRaw)
        ? (userRoleRaw as ESSUserRole)
        : null

    return {
      isAuthenticated,
      userId,
      userRole,
      currentCompanyId,
      currentSiteId,
      companies,
      isMultiCompany: companies.length > 1,
    }
  }, [settingsState.auth, settingsState.user, companyState])

  // Ensure CompanyContext is aligned to the resolved ESS company.
  // This is critical because HRContext is scoped by CompanyContext (companyID/site selection).
  useEffect(() => {
    if (!authState.isAuthenticated) return
    if (!authState.currentCompanyId) return
    if (companyState.companyID === authState.currentCompanyId) return
    setCompanyID(authState.currentCompanyId)
  }, [authState.isAuthenticated, authState.currentCompanyId, companyState.companyID, setCompanyID])

  // ============================================
  // LOAD COMPANY SETTINGS
  // Enhanced with better error recovery and fallback logic
  // ============================================

  const loadCompanySettings = useCallback(async () => {
    if (!authState.currentCompanyId) {
      // No company ID - use defaults
      dispatch({ type: "SET_COMPANY_SETTINGS", payload: DEFAULT_COMPANY_SETTINGS })
      return
    }

    let retryCount = 0
    const maxRetries = 2

    const attemptLoad = async (): Promise<void> => {
      try {
        const settingsPath = `companies/${authState.currentCompanyId}/settings`
        const settingsRef = ref(db, settingsPath)
        const snapshot = await get(settingsRef)

        if (snapshot.exists()) {
          const settings = snapshot.val()
          
          // Validate and merge settings with defaults
          const mergedSettings: ESSCompanySettings = {
            clockInRequiresLocation: 
              typeof settings.clockInRequiresLocation === "boolean" 
                ? settings.clockInRequiresLocation 
                : DEFAULT_COMPANY_SETTINGS.clockInRequiresLocation,
            allowEarlyClockIn: 
              typeof settings.allowEarlyClockIn === "boolean" 
                ? settings.allowEarlyClockIn 
                : DEFAULT_COMPANY_SETTINGS.allowEarlyClockIn,
            earlyClockInMinutes: 
              typeof settings.earlyClockInMinutes === "number" && settings.earlyClockInMinutes > 0
                ? settings.earlyClockInMinutes 
                : DEFAULT_COMPANY_SETTINGS.earlyClockInMinutes,
            allowLateClockOut: 
              typeof settings.allowLateClockOut === "boolean" 
                ? settings.allowLateClockOut 
                : DEFAULT_COMPANY_SETTINGS.allowLateClockOut,
            autoClockOutEnabled: 
              typeof settings.autoClockOutEnabled === "boolean" 
                ? settings.autoClockOutEnabled 
                : DEFAULT_COMPANY_SETTINGS.autoClockOutEnabled,
            autoClockOutTime: 
              typeof settings.autoClockOutTime === "string" && settings.autoClockOutTime.length > 0
                ? settings.autoClockOutTime 
                : DEFAULT_COMPANY_SETTINGS.autoClockOutTime,
            breakDurationMinutes: 
              typeof settings.breakDurationMinutes === "number" && settings.breakDurationMinutes >= 0
                ? settings.breakDurationMinutes 
                : DEFAULT_COMPANY_SETTINGS.breakDurationMinutes,
          }

          dispatch({
            type: "SET_COMPANY_SETTINGS",
            payload: mergedSettings,
          })
        } else {
          // Settings don't exist - use defaults
          console.log("[ESS] Company settings not found, using defaults")
          dispatch({ type: "SET_COMPANY_SETTINGS", payload: DEFAULT_COMPANY_SETTINGS })
        }
      } catch (error: any) {
        console.error("[ESS] Failed to load company settings (attempt " + (retryCount + 1) + "):", error)
        
        // Retry on network errors
        if (retryCount < maxRetries && (
          error?.code === "unavailable" || 
          error?.code === "network-error" ||
          error?.message?.includes("network")
        )) {
          retryCount++
          console.log("[ESS] Retrying company settings load...")
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
          return attemptLoad()
        }
        
        // Use defaults on error after retries
        console.warn("[ESS] Using default company settings due to error")
        dispatch({ type: "SET_COMPANY_SETTINGS", payload: DEFAULT_COMPANY_SETTINGS })
      }
    }

    await attemptLoad()
  }, [authState.currentCompanyId])

  // ============================================
  // LOAD EMPLOYEE DATA
  // ============================================

  const loadEmployeeData = useCallback(async () => {
    // If emulated employee is set (owner mode), use that employee
    if (state.emulatedEmployeeId && hrState.employees) {
      const emulatedEmployee = hrState.employees.find((emp: any) => emp.id === state.emulatedEmployeeId)
      if (emulatedEmployee) {
        dispatch({
          type: "SET_EMPLOYEE",
          payload: {
            employee: emulatedEmployee,
            employeeId: emulatedEmployee.id,
          },
        })
        return
      }
    }

    // Smart employee lookup: use saved location or search across sites/subsites
    if (!authState.userId || !authState.currentCompanyId) {
      dispatch({ type: "SET_EMPLOYEE", payload: { employee: null, employeeId: null } })
      dispatch({ type: "SET_EMERGENCY_CONTACTS", payload: [] })
      return
    }

    // Get saved location from user company data
    const companyEntries = Array.isArray(settingsState.user?.companies)
      ? settingsState.user.companies
      : settingsState.user?.companies
        ? Object.values(settingsState.user.companies)
        : []

    const currentCompany = companyEntries.find(
      (c: any) => c?.companyID === authState.currentCompanyId
    )
    
    const savedLocation = currentCompany ? {
      employeePath: currentCompany.employeePath,
      employeeId: currentCompany.employeeId || currentCompany.employeeID,
      siteId: currentCompany.siteId,
      subsiteId: currentCompany.subsiteId,
    } : undefined

    // Try smart lookup (checks HR context first, then saved location, then searches)
    const location = await findEmployeeForUser(
      authState.userId,
      authState.currentCompanyId,
      savedLocation,
      hrState.employees // Pass already-loaded employees for faster lookup
    )

    if (location) {
      dispatch({
        type: "SET_EMPLOYEE",
        payload: {
          employee: location.employee,
          employeeId: location.employee.id,
        },
      })
      
      // Update company state with found location (for HR context)
      if (location.siteId && companyState.selectedSiteID !== location.siteId) {
        // Note: Company context will handle site selection
        // We just ensure HR context knows where to look
      }
    } else {
      // Fallback: try to find in already-loaded HR employees
      if (hrState.employees && hrState.employees.length > 0) {
        const employee = filterCurrentEmployee(hrState.employees, authState.userId)
        if (employee) {
          dispatch({
            type: "SET_EMPLOYEE",
            payload: {
              employee,
              employeeId: employee.id,
            },
          })
          return
        }
      }
      
      // No employee found
      dispatch({ type: "SET_EMPLOYEE", payload: { employee: null, employeeId: null } })
      dispatch({ type: "SET_EMERGENCY_CONTACTS", payload: [] })
    }
    
    // Emergency contacts will be loaded by loadEmergencyContacts() in loadFilteredData()
  }, [
    authState.userId,
    authState.currentCompanyId,
    hrState.employees,
    state.emulatedEmployeeId,
    settingsState.user?.companies,
    companyState.selectedSiteID,
  ])

  // ============================================
  // LOAD EMERGENCY CONTACTS
  // ============================================

  const loadEmergencyContacts = useCallback(() => {
    if (!state.currentEmployee) {
      dispatch({ type: "SET_EMERGENCY_CONTACTS", payload: [] })
      return
    }

    const employee = state.currentEmployee
    
    // Load emergency contacts from employee record
    // Employee interface has emergencyContact (singular object), convert to array format
    let emergencyContacts: ESSEmergencyContact[] = []
    if (employee?.emergencyContact) {
      const ec = employee.emergencyContact as any
      emergencyContacts = [{
        id: ec.id || `ec-${Date.now()}`,
        name: ec.name || "",
        relationship: ec.relationship || "",
        phone: ec.phone || "",
        email: ec.email,
        isPrimary: true,
      }]
    } else if ((employee as any)?.emergencyContacts) {
      // If employee has emergencyContacts array, use it
      emergencyContacts = (employee as any).emergencyContacts as ESSEmergencyContact[]
    }
    
    dispatch({ type: "SET_EMERGENCY_CONTACTS", payload: emergencyContacts })
  }, [state.currentEmployee])

  // ============================================
  // LOAD FILTERED DATA
  // Optimized for ESS: Only loads employee-specific data
  // Filters from HRContext data efficiently (no duplicate fetches)
  // ============================================

  const loadFilteredData = useCallback(() => {
    // Use emulated employee ID if set, otherwise use normal employee ID
    const employeeId = state.emulatedEmployeeId || state.employeeId
    if (!employeeId) {
      // Clear all data if no employee ID
      dispatch({ type: "SET_SCHEDULES", payload: [] })
      dispatch({ type: "SET_TIME_OFF", payload: { pending: [], approved: [] } })
      dispatch({ type: "SET_ATTENDANCE", payload: [] })
      dispatch({ type: "SET_PAYSLIPS", payload: [] })
      dispatch({ type: "SET_PERFORMANCE_REVIEWS", payload: [] })
      dispatch({ type: "SET_HOLIDAY_BALANCE", payload: { total: 0, used: 0, pending: 0, remaining: 0, carryOver: 0 } })
      return
    }

    // ESS only needs filtered data for current employee
    // All data comes from HRContext (already loaded/cached)
    // This is efficient - no additional network requests

    // Load upcoming shifts (filtered by employee) - no limit, get all upcoming
    // Debug logging
    console.log('[ESS] Loading shifts:', {
      totalSchedules: hrState.schedules?.length || 0,
      employeeId,
      schedulesSample: hrState.schedules?.slice(0, 3).map((s: any) => ({
        id: s.id,
        employeeId: s.employeeId || s.employeeID,
        date: s.date,
        status: s.status
      }))
    })
    
    const upcomingShifts = filterUpcomingShifts(hrState.schedules || [], employeeId)
    
    console.log('[ESS] Filtered shifts:', {
      count: upcomingShifts.length,
      shifts: upcomingShifts.slice(0, 5).map((s: any) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime
      }))
    })
    
    dispatch({ type: "SET_SCHEDULES", payload: upcomingShifts })

    // Load time off (filtered by employee)
    const pendingTimeOff = filterPendingTimeOff(hrState.timeOffs || [], employeeId)
    const approvedTimeOff = filterApprovedTimeOff(hrState.timeOffs || [], employeeId)
    dispatch({ type: "SET_TIME_OFF", payload: { pending: pendingTimeOff, approved: approvedTimeOff } })

    // Load attendance (filtered by employee)
    const recentAttendance = filterRecentAttendance(hrState.attendances || [], employeeId)
    dispatch({ type: "SET_ATTENDANCE", payload: recentAttendance })

    // Determine clock status from attendance
    // Preserve clock status if there was a recent clock event (within last 10 minutes)
    // This prevents losing clock status during navigation if attendance hasn't synced yet
    const clockStatus = determineClockStatus(recentAttendance)
    const hasRecentClockEvent = state.lastClockEvent && 
      (Date.now() - state.lastClockEvent.timestamp) < 10 * 60 * 1000 // 10 minutes
    
    // If we have a recent clock-in event and current state says we're clocked in,
    // but attendance records don't show it yet, preserve the clock status
    // This handles the case where the database write hasn't propagated yet
    if (hasRecentClockEvent && state.isClockedIn && state.clockInTime && !clockStatus.isClockedIn) {
      // Keep the existing clock status - don't overwrite with stale attendance data
      // The attendance record will sync eventually
    } else {
      // Use the calculated status from attendance records (most accurate)
      dispatch({ type: "SET_CLOCK_STATUS", payload: clockStatus })
    }

    // Load payslips (filtered by employee)
    const payslips = filterEmployeePayslips(hrState.payrollRecords || [], employeeId)
    dispatch({ type: "SET_PAYSLIPS", payload: payslips })

    // Load performance reviews (filtered by employee)
    // Note: HRContext stores PerformanceReviewForm[], but we need PerformanceReview[]
    // Convert PerformanceReview to ESSPerformanceReview format
    const rawReviews = filterEmployeePerformanceReviews(
      (hrState.performanceReviews || []) as any as PerformanceReview[],
      employeeId
    )
    
    // Convert PerformanceReview to ESSPerformanceReview
    const performanceReviews: ESSPerformanceReview[] = rawReviews.map((review) => ({
      id: review.id,
      reviewPeriod: review.reviewPeriod,
      reviewDate: review.startDate, // Use startDate as reviewDate
      endDate: review.endDate,
      overallScore: review.overallScore,
      feedback: review.comments, // Map comments to feedback
      comments: review.comments, // Keep comments for backward compatibility
      goals: review.goals?.map((goal) => ({
        title: goal.description,
        description: goal.description,
        dueDate: goal.dueDate,
        completed: goal.status === "completed",
        status: goal.status,
      })),
      strengths: review.strengths,
      areasForImprovement: review.areasForImprovement,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      qualificationAssessment: review.qualificationAssessment,
    }))
    
    dispatch({ type: "SET_PERFORMANCE_REVIEWS", payload: performanceReviews })

    // Calculate holiday balance (uses employee data + time offs + attendances for hours worked)
    // Use current employee from state (which may be emulated)
    if (state.currentEmployee) {
      // Pass attendances to calculate actual hours worked for accrual
      const holidayBalance = calculateHolidayBalance(
        state.currentEmployee, 
        hrState.timeOffs || [],
        hrState.attendances || [] // Pass attendances for actual hours worked calculation
      )
      dispatch({ type: "SET_HOLIDAY_BALANCE", payload: holidayBalance })
    } else {
      // If no employee, set default balance
      dispatch({ type: "SET_HOLIDAY_BALANCE", payload: { total: 0, used: 0, pending: 0, remaining: 0, carryOver: 0 } })
    }

    // Load emergency contacts (from employee record)
    loadEmergencyContacts()
  }, [state.employeeId, state.emulatedEmployeeId, state.currentEmployee, hrState, loadEmergencyContacts])

  // ============================================
  // INITIALIZATION EFFECT
  // ============================================

  useEffect(() => {
    const initialize = async () => {
      // Wait for auth to be ready
      if (!authState.isAuthenticated || !authState.userId) {
        dispatch({ type: "SET_LOADING", payload: false })
        return
      }

      // Wait for company data to load
      if (companyState.loading) {
        return
      }

      // ESS is primarily for staff, but other roles may still have an employee record
      // (and should be able to view their own data, matching the main app self-service behavior).
      //
      // Owners/admins/managers can also emulate an employee, but if they themselves are linked
      // to an employee record, we still want to load it.

      // OPTIMIZED: Don't wait for HR employees - smart lookup searches Firebase directly
      // This makes ESS initialization much faster
      // Smart lookup will use saved location or search across sites/subsites

      dispatch({ type: "SET_LOADING", payload: true })

      try {
        // Load company settings (lightweight)
        await loadCompanySettings()

        // Load employee data (smart lookup with saved location or search)
        await loadEmployeeData()

        // Enable ESS mode in session
        if (authState.currentCompanyId) {
          ESSSessionPersistence.enableESSMode(
            authState.currentCompanyId,
            authState.currentSiteId || undefined
          )
        }

        dispatch({ type: "SET_INITIALIZED", payload: true })
      } catch (error) {
        console.error("[ESS] Initialization error:", error)
        const essError = handleFirebaseError(error)
        logESSError(essError, "initialization")
        dispatch({ type: "SET_ERROR", payload: essError })
      } finally {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    initialize()
  }, [
    authState.isAuthenticated,
    authState.userId,
    authState.userRole,
    authState.currentCompanyId,
    authState.currentSiteId,
    companyState.loading,
    hrState.initialized,
    hrState.employees.length,
    loadCompanySettings,
    loadEmployeeData,
  ])

  // ============================================
  // LOAD FILTERED DATA WHEN EMPLOYEE CHANGES
  // ============================================

  useEffect(() => {
    // Reload employee data when emulated employee changes
    if (state.emulatedEmployeeId !== null || state.employeeId) {
      loadEmployeeData().catch(console.error)
    }
  }, [state.emulatedEmployeeId, loadEmployeeData])

  useEffect(() => {
    const effectiveEmployeeId = state.emulatedEmployeeId || state.employeeId
    if (effectiveEmployeeId && state.isInitialized) {
      loadFilteredData()
    }
  }, [state.employeeId, state.emulatedEmployeeId, state.isInitialized, hrState.schedules, hrState.timeOffs, hrState.attendances, hrState.payrollRecords, hrState.performanceReviews, loadFilteredData])

  // ============================================
  // SESSION PERSISTENCE
  // ============================================

  useEffect(() => {
    // Save current path on navigation
    const handlePathChange = () => {
      if (authState.isAuthenticated && (window.location.pathname.startsWith("/ESS/") || window.location.pathname.startsWith("/Mobile/"))) {
        ESSSessionPersistence.saveCurrentPath(window.location.pathname)
      }
    }

    handlePathChange()
    window.addEventListener("popstate", handlePathChange)
    return () => window.removeEventListener("popstate", handlePathChange)
  }, [authState.isAuthenticated])

  // Refresh session on activity
  useEffect(() => {
    const handleActivity = () => {
      ESSSessionPersistence.refreshSession()
    }

    window.addEventListener("click", handleActivity)
    window.addEventListener("keypress", handleActivity)

    return () => {
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("keypress", handleActivity)
    }
  }, [])

  // ============================================
  // ACTIONS
  // ============================================

  const refreshData = useCallback(async () => {
    const effectiveEmployeeId = state.emulatedEmployeeId || state.employeeId
    if (!effectiveEmployeeId) return

    dispatch({ type: "SET_LOADING", payload: true })

    try {
      loadFilteredData()
    } catch (error) {
      const essError = handleFirebaseError(error)
      logESSError(essError, "refreshData")
      dispatch({ type: "SET_ERROR", payload: essError })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [state.employeeId, state.emulatedEmployeeId, loadFilteredData])

  // ============================================
  // CLOCK IN - ✅ PATH FIXED
  // ============================================
  const clockIn = useCallback(async (payload?: ESSClockInPayload): Promise<boolean> => {
    if (!state.employeeId || !authState.currentCompanyId) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("CLOCK_FAILED", "Employee or company not found"),
      })
      return false
    }

    if (state.isClockedIn) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("CLOCK_FAILED", "You are already clocked in"),
      })
      return false
    }

    // Check if employee is on leave (approved time off for today)
    const today = new Date().toISOString().split("T")[0]
    const todayTimestamp = new Date(today).getTime()
    const isOnLeave = state.approvedTimeOff.some((timeOff) => {
      const startDate = new Date(timeOff.startDate).toISOString().split("T")[0]
      const endDate = new Date(timeOff.endDate).toISOString().split("T")[0]
      return today >= startDate && today <= endDate && timeOff.status === "approved"
    })

    if (isOnLeave) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError(
          "CLOCK_FAILED",
          "You cannot clock in while on approved leave. Please contact HR if you need to work during your leave period."
        ),
      })
      return false
    }

    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    const now = Date.now()
    const clockInTimeISO = new Date().toISOString()
    
    dispatch({
      type: "SET_CLOCK_STATUS",
      payload: {
        isClockedIn: true,
        clockInTime: now,
        lastClockEvent: {
          type: "in",
          timestamp: now,
          location: payload?.location,
        },
      },
    })

    // Now do the database write in the background (non-blocking)
    ;(async () => {
      try {
        const today = new Date().toISOString().split("T")[0]

        const attendanceData: any = {
          employeeId: state.employeeId,
          date: now,
          clockIn: clockInTimeISO,
          clockOut: null,
          status: "present",
          createdAt: now,
          updatedAt: now,
        }

        // Add location if provided
        let locationString: string | undefined = undefined
        if (payload?.location) {
          attendanceData.location = {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
          }
          locationString = JSON.stringify({
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
            accuracy: payload.location.accuracy,
          })
        }

        // Add notes if provided
        if (payload?.notes) {
          attendanceData.notes = payload.notes
        }

        await addAttendance(attendanceData)

        // Also update the schedule if there's a matching schedule for today
        try {
          const todaySchedule = hrState.schedules.find(
            (s) =>
              s.employeeId === state.employeeId &&
              s.date === today &&
              s.status !== "draft" &&
              s.status !== "cancelled"
          )

          if (todaySchedule && updateSchedule) {
            await updateSchedule(todaySchedule.id, {
              clockInTime: clockInTimeISO,
              clockInLocation: locationString,
            })
          }
        } catch (scheduleError) {
          console.warn("Failed to update schedule with clock in time:", scheduleError)
        }

        // Refresh attendance data in background
        setTimeout(() => {
          loadFilteredData()
        }, 500)
      } catch (error) {
        // Rollback optimistic update on error
        console.error("Clock in failed, rolling back:", error)
        dispatch({
          type: "SET_CLOCK_STATUS",
          payload: {
            isClockedIn: false,
            clockInTime: null,
            lastClockEvent: null,
          },
        })
        const essError = handleFirebaseError(error)
        logESSError(essError, "clockIn")
        dispatch({ type: "SET_ERROR", payload: essError })
      }
    })()

    return true
  }, [addAttendance, state.employeeId, state.isClockedIn, state.approvedTimeOff, authState.currentCompanyId, hrState.schedules, updateSchedule])

  // ============================================
  // CLOCK OUT - ✅ PATH FIXED
  // ============================================
  const clockOut = useCallback(async (payload?: ESSClockOutPayload): Promise<boolean> => {
    if (!state.employeeId || !authState.currentCompanyId) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("CLOCK_FAILED", "Employee or company not found"),
      })
      return false
    }

    if (!state.isClockedIn) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("CLOCK_FAILED", "You are not clocked in"),
      })
      return false
    }

    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    const now = Date.now()
    const clockOutTimeISO = new Date().toISOString()
    const previousClockInTime = state.clockInTime // Save for rollback
    
    dispatch({
      type: "SET_CLOCK_STATUS",
      payload: {
        isClockedIn: false,
        clockInTime: null,
        lastClockEvent: {
          type: "out",
          timestamp: now,
          location: payload?.location,
        },
      },
    })

    // Now do the database write in the background (non-blocking)
    ;(async () => {
      try {
        // Find today's attendance record
        const today = new Date().toISOString().split("T")[0]
        const todayAttendance = [...(state.recentAttendance || []), ...(hrState.attendances || [])].find(
          (attendance: any) =>
            attendance?.employeeId === state.employeeId &&
            attendance?.clockIn &&
            !attendance?.clockOut &&
            new Date(attendance.date).toISOString().split("T")[0] === today,
        ) as any

        if (!todayAttendance?.id) {
          throw new Error("No active clock-in found for today")
        }

        const updateData: any = {
          clockOut: clockOutTimeISO,
          updatedAt: now,
        }

        // Add location if provided
        let locationString: string | undefined = undefined
        if (payload?.location) {
          updateData.clockOutLocation = {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
          }
          locationString = JSON.stringify({
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
            accuracy: payload.location.accuracy,
          })
        }

        // Add notes if provided
        if (payload?.notes) {
          updateData.clockOutNotes = payload.notes
        }

        // Add shift feedback if provided
        if (payload?.shiftFeedback) {
          updateData.shiftFeedback = payload.shiftFeedback
        }

        await updateAttendance(todayAttendance.id, updateData)

        // Also update the schedule if there's a matching schedule for today
        try {
          const todaySchedule = hrState.schedules.find(
            (s) =>
              s.employeeId === state.employeeId &&
              s.date === today &&
              s.status !== "draft" &&
              s.status !== "cancelled"
          )

          if (todaySchedule && updateSchedule) {
            // Calculate actual hours
            let actualHours = 0
            if (todaySchedule.clockInTime) {
              try {
                const clockIn = parseISO(todaySchedule.clockInTime)
                const clockOut = parseISO(clockOutTimeISO)
                const diffMs = clockOut.getTime() - clockIn.getTime()
                actualHours = diffMs / (1000 * 60 * 60) // Convert to hours
              } catch {
                // If parsing fails, leave actualHours as 0
              }
            }

            await updateSchedule(todaySchedule.id, {
              clockOutTime: clockOutTimeISO,
              clockOutLocation: locationString,
              actualHours,
            })
          }
        } catch (scheduleError) {
          console.warn("Failed to update schedule with clock out time:", scheduleError)
        }

        // Refresh attendance data in background
        setTimeout(() => {
          loadFilteredData()
        }, 500)
      } catch (error) {
        // Rollback optimistic update on error
        console.error("Clock out failed, rolling back:", error)
        dispatch({
          type: "SET_CLOCK_STATUS",
          payload: {
            isClockedIn: true,
            clockInTime: previousClockInTime,
            lastClockEvent: {
              type: "in",
              timestamp: previousClockInTime || now,
              location: undefined,
            },
          },
        })
        const essError = handleFirebaseError(error)
        logESSError(essError, "clockOut")
        dispatch({ type: "SET_ERROR", payload: essError })
      }
    })()

    return true
  }, [hrState.attendances, state.employeeId, state.isClockedIn, state.recentAttendance, authState.currentCompanyId, updateAttendance, updateSchedule, hrState.schedules])

  // ============================================
  // REQUEST TIME OFF - ✅ PATH FIXED
  // ============================================
  const requestTimeOff = useCallback(async (request: ESSTimeOffRequest): Promise<boolean> => {
    if (!state.employeeId || !authState.currentCompanyId) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("VALIDATION_ERROR", "No employee or company data found. Please ensure you are logged in and have selected a company."),
      })
      return false
    }

    dispatch({ type: "SET_LOADING", payload: true })

    try {
      const now = Date.now()

      const timeOffData = {
        employeeId: state.employeeId,
        type: request.type,
        startDate: new Date(request.startDate).getTime(),
        endDate: new Date(request.endDate).getTime(),
        totalDays: request.totalDays,
        reason: request.reason || "",
        notes: request.notes || "",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }

      await addTimeOff(timeOffData as any)

      // Refresh data to show new request
      await refreshData()

      return true
    } catch (error) {
      const essError = handleFirebaseError(error)
      logESSError(essError, "requestTimeOff")
      dispatch({ type: "SET_ERROR", payload: essError })
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [addTimeOff, state.employeeId, authState.currentCompanyId, refreshData])

  // ============================================
  // CANCEL TIME OFF REQUEST - ✅ PATH FIXED
  // ============================================
  const cancelTimeOffRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!authState.currentCompanyId) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("VALIDATION_ERROR", "Company not found"),
      })
      return false
    }

    dispatch({ type: "SET_LOADING", payload: true })

    try {
      await updateTimeOff(requestId, {
        status: "cancelled",
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      })

      // Refresh data
      await refreshData()

      return true
    } catch (error) {
      const essError = handleFirebaseError(error)
      logESSError(essError, "cancelTimeOffRequest")
      dispatch({ type: "SET_ERROR", payload: essError })
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [authState.currentCompanyId, refreshData, updateTimeOff])

  // ============================================
  // UPDATE EMERGENCY CONTACTS - ✅ PATH FIXED
  // ============================================
  const updateEmergencyContacts = useCallback(async (contacts: ESSEmergencyContact[]): Promise<boolean> => {
    if (!state.employeeId || !authState.currentCompanyId) {
      dispatch({
        type: "SET_ERROR",
        payload: createESSError("VALIDATION_ERROR", "Employee or company not found"),
      })
      return false
    }

    dispatch({ type: "SET_LOADING", payload: true })

    try {
      await updateEmployee(state.employeeId, {
        emergencyContacts: contacts as any,
        emergencyContact: contacts[0]
          ? {
              name: contacts[0].name,
              relationship: contacts[0].relationship,
              phone: contacts[0].phone,
            }
          : undefined,
        updatedAt: Date.now(),
      } as any)

      // Update local state
      dispatch({ type: "SET_EMERGENCY_CONTACTS", payload: contacts })

      return true
    } catch (error) {
      const essError = handleFirebaseError(error)
      logESSError(essError, "updateEmergencyContacts")
      dispatch({ type: "SET_ERROR", payload: essError })
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [state.employeeId, authState.currentCompanyId, updateEmployee])

  // ============================================
  // SWITCH COMPANY
  // ============================================
  const switchCompany = useCallback(async (companyId: string): Promise<void> => {
    dispatch({ type: "SET_LOADING", payload: true })
    dispatch({ type: "RESET_STATE" })

    // Update session persistence
    ESSSessionPersistence.enableESSMode(companyId)

    // Switch CompanyContext immediately so HRContext scopes correctly.
    setCompanyID(companyId)
    // CompanyContext initialization + HRContext reload will happen via their existing effects.
  }, [setCompanyID])

  // ============================================
  // CLEAR ERROR
  // ============================================
  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null })
  }, [])

  // ============================================
  // OWNER EMULATION
  // ============================================
  const setEmulatedEmployee = useCallback((employeeId: string | null) => {
    dispatch({ type: "SET_EMULATED_EMPLOYEE", payload: employeeId })
  }, [])

  const clearEmulatedEmployee = useCallback(() => {
    dispatch({ type: "SET_EMULATED_EMPLOYEE", payload: null })
  }, [])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const contextValue = useMemo((): ESSContextValue => ({
    state,
    authState,
    deviceInfo,
    refreshData,
    clockIn,
    clockOut,
    requestTimeOff,
    cancelTimeOffRequest,
    updateEmergencyContacts,
    switchCompany,
    clearError,
    setEmulatedEmployee,
    clearEmulatedEmployee,
  }), [
    state,
    authState,
    deviceInfo,
    refreshData,
    clockIn,
    clockOut,
    requestTimeOff,
    cancelTimeOffRequest,
    updateEmergencyContacts,
    switchCompany,
    clearError,
    setEmulatedEmployee,
    clearEmulatedEmployee,
  ])

  return (
    <ESSContext.Provider value={contextValue}>
      {children}
    </ESSContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export const useESS = (): ESSContextValue => {
  const context = useContext(ESSContext)
  if (context === undefined) {
    throw new Error("useESS must be used within an ESSProvider")
  }
  return context
}

export default ESSContext
