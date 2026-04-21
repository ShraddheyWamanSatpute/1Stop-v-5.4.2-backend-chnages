/**
 * Auth Ready Hook
 * 
 * Waits for authentication AND user data to be fully loaded
 * before allowing navigation decisions
 */

import { useState, useEffect, useCallback } from "react"
import { useSettings } from "../../../app/backend/context/SettingsContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { useHR } from "../../../app/backend/context/HRContext"

interface AuthReadyState {
  isReady: boolean
  isAuthenticated: boolean
  userId: string | null
  userRole: string | null
  hasEmployeeRecord: boolean
  companies: string[]
  isLoading: boolean
  error: string | null
}

const INITIAL_STATE: AuthReadyState = {
  isReady: false,
  isAuthenticated: false,
  userId: null,
  userRole: null,
  hasEmployeeRecord: false,
  companies: [],
  isLoading: true,
  error: null,
}

export const useAuthReady = () => {
  const { state: settingsState } = useSettings()
  const { state: companyState } = useCompany()
  // useHR handles missing provider gracefully, so we can call it safely
  const { state: hrState } = useHR()

  const [authState, setAuthState] = useState<AuthReadyState>(INITIAL_STATE)

  // Check if all required data is loaded
  // OPTIMIZED: Allow access with minimal data, don't wait for everything
  const checkDataReady = useCallback((): AuthReadyState => {
    const isAuthenticated = settingsState.auth?.isLoggedIn === true
    const userId = settingsState.auth?.uid || (settingsState.user as any)?.uid || null

    // Not authenticated - we're ready (to redirect to login)
    if (!isAuthenticated || !userId) {
      return {
        isReady: true,
        isAuthenticated: false,
        userId: null,
        userRole: null,
        hasEmployeeRecord: false,
        companies: [],
        isLoading: false,
        error: null,
      }
    }

    // OPTIMIZED: Get role from settings first (faster), fallback to companyState
    // Don't wait for companyState.user - it can load in background
    let userRole: string | null = null
    
    // Try settings first (faster)
    if (settingsState.user?.companies?.[0]?.role) {
      userRole = settingsState.user.companies[0].role.toLowerCase()
    } else if (companyState.user?.role) {
      // Fallback to companyState if available
      userRole = companyState.user.role.toLowerCase()
    }

    // Get companies from settingsState.user.companies (array of company objects)
    const userCompanies = settingsState.user?.companies || []
    const companyIds = userCompanies
      .map((c: any) => c.companyID)
      .filter(Boolean) as string[]

    // If we don't have role yet, wait only if company is actively loading
    if (!userRole) {
      // Only wait if company is still loading (might get role soon)
      if (companyState.loading) {
        return {
          ...INITIAL_STATE,
          isAuthenticated: true,
          userId,
          isLoading: true,
        }
      }
      // Company not loading and no role - default to staff if we have companies
      if (companyIds.length > 0) {
        userRole = "staff" // Default to staff for ESS
        console.warn("[ESS] No role found, defaulting to staff")
      } else {
        return {
          isReady: true,
          isAuthenticated: true,
          userId,
          userRole: null,
          hasEmployeeRecord: false,
          companies: [],
          isLoading: false,
          error: "No company access found",
        }
      }
    }

    // No companies found
    if (companyIds.length === 0) {
      return {
        isReady: true,
        isAuthenticated: true,
        userId,
        userRole,
        hasEmployeeRecord: false,
        companies: [],
        isLoading: false,
        error: "No company access found",
      }
    }

    // For staff: allow access immediately (like main app)
    // HR employees will load in background - ESS context will handle it
    if (userRole === "staff") {
      // Check for employee record if employees are available
      let hasEmployeeRecord = false
      if (hrState.employees && hrState.employees.length > 0) {
        hasEmployeeRecord = hrState.employees.some(
          (emp: any) =>
            String(emp.userId || emp.userID || emp.user_id || emp.uid || emp.userUID || emp.firebaseUid) === String(userId) ||
            String(emp.id) === String(userId) ||
            String(emp.employeeId || emp.employeeID) === String(userId)
        ) || false
      }

      // Allow access immediately - HR will load in background (same as main app)
      // ESS context will find employee when HR data is ready
      return {
        isReady: true,
        isAuthenticated: true,
        userId,
        userRole,
        hasEmployeeRecord,
        companies: companyIds,
        isLoading: false,
        error: null,
      }
    }

    // Non-staff roles are ready without employee check
    return {
      isReady: true,
      isAuthenticated: true,
      userId,
      userRole,
      hasEmployeeRecord: false, // Not relevant for non-staff
      companies: companyIds,
      isLoading: false,
      error: null,
    }
  }, [settingsState.auth, settingsState.user, companyState, hrState])

  // Use React state subscriptions instead of polling - much faster!
  useEffect(() => {
    const state = checkDataReady()
    setAuthState(state)
  }, [
    settingsState.auth?.isLoggedIn,
    settingsState.auth?.uid,
    settingsState.user?.companies,
    companyState.loading,
    companyState.user?.role,
    companyState.user, // Watch for user object itself (critical for ESS)
    companyState.companyID,
    hrState.initialized, // Watch for HR initialization (critical for ESS)
    hrState.employees?.length, // Watch for employees array length (critical for ESS)
    hrState.employees, // Watch for employees array itself (critical for ESS)
    checkDataReady,
  ])

  // Wait for auth ready (returns a promise) - optimized version
  const waitForReady = useCallback((): Promise<AuthReadyState> => {
    return new Promise((resolve) => {
      const state = checkDataReady()
      if (state.isReady) {
        resolve(state)
        return
      }
      
      // If not ready, wait for next state update (max 5 seconds)
      const timeout = setTimeout(() => {
        const finalState = checkDataReady()
        resolve({
          ...finalState,
          isReady: true,
          error: finalState.isReady ? null : "Timeout loading user data",
        })
      }, 5000)
      
      // Check periodically but less frequently
      const interval = setInterval(() => {
        const currentState = checkDataReady()
        if (currentState.isReady) {
          clearInterval(interval)
          clearTimeout(timeout)
          resolve(currentState)
        }
      }, 200)
      
      // Cleanup
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    })
  }, [checkDataReady])

  return {
    ...authState,
    waitForReady,
  }
}

export default useAuthReady