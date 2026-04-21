/**
 * ESS Protected Route
 * 
 * Route guard with session restoration
 */

"use client"

import React, { useEffect, useState, useRef } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material"
import {
  Person as PersonIcon,
  Warning as WarningIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useAuthReady } from "../hooks/useAuthReady"
import { ESSSessionPersistence } from "../../backend/utils/mobileSessionPersistence"
import { getESSBasePath, getESSDashboardPath } from "../utils/mobileRouteUtils"
import type { ESSAccessStatus } from "../../backend/interfaces"
import { useSettings } from "../../../app/backend/context/SettingsContext"
import { useCompany } from "../../../app/backend/context/CompanyContext"
import { useHR } from "../../../app/backend/context/HRContext"
import BrandedAppLoader from "../../../app/frontend/components/global/BrandedAppLoader"

// ============================================
// TEMPORARY TESTING FLAGS - REMOVE AFTER TESTING
// ============================================
// Set to true to allow all roles to access ESS portal for testing
// Set to false to restore original behavior (staff only)
const TEMP_ALLOW_ALL_ROLES_FOR_TESTING = false

// Set to true to bypass authentication completely (for testing without Firebase)
// Set to false to require authentication
const TEMP_BYPASS_AUTHENTICATION = false
// ============================================

interface ESSProtectedRouteProps {
  children: React.ReactNode
}

const ESSProtectedRoute: React.FC<ESSProtectedRouteProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, authState } = useESS()
  const { isReady, isAuthenticated, userRole, hasEmployeeRecord } = useAuthReady()
  const { state: settingsState, logout } = useSettings()
  const { state: companyState } = useCompany()
  const { state: hrState } = useHR()

  const [accessStatus, setAccessStatus] = useState<ESSAccessStatus>("loading")
  const [hasRestoredSession, setHasRestoredSession] = useState(false)
  const loadingStartTimeRef = useRef(Date.now())

  // ============================================
  // SESSION RESTORATION (on first load only)
  // ============================================

  useEffect(() => {
    // Only restore session once, and only if we're ready
    if (!isReady || hasRestoredSession) return

    // Check if we should restore a session
    const shouldRestore = ESSSessionPersistence.shouldRestoreSession()
    
    // Only restore if authenticated and has proper role
    if (shouldRestore && isAuthenticated && (TEMP_ALLOW_ALL_ROLES_FOR_TESTING || userRole === "staff")) {
      const session = ESSSessionPersistence.getSession()
      
      if (session?.lastPath && session.lastPath !== location.pathname) {
        // Restore to last path.
        // The router runs under a basename ("/Mobile" or "/ESS"), so prefer basename-relative paths.
        const lp = String(session.lastPath || "")
        const normalized =
          lp.startsWith("/Mobile/") ? lp.replace(/^\/Mobile/, "") :
          lp.startsWith("/ESS/") ? lp.replace(/^\/ESS/, "") :
          lp

        if (normalized.startsWith("/")) {
          navigate(normalized, { replace: true })
        } else {
          navigate(getESSDashboardPath(), { replace: true })
        }
      }
    }

    setHasRestoredSession(true)
  }, [isReady, isAuthenticated, userRole, hasRestoredSession, location.pathname, navigate])
  // ============================================
  // DETERMINE ACCESS STATUS
  // ============================================

  useEffect(() => {
    // OPTIMIZED: Check auth state directly from Settings (like main app ProtectedRoute)
    // This matches main app behavior - no "verifying" screen, just redirect if not logged in
    const isAuthLoading = settingsState.loading
    const isLoggedIn = settingsState.auth?.isLoggedIn === true
    
    // Timeout protection: if loading for more than 3 seconds, allow access anyway
    const loadingDuration = Date.now() - loadingStartTimeRef.current
    const isTimeout = loadingDuration > 3000
    
    // Debug logging (only log every 2 seconds to avoid spam)
    if (accessStatus === "loading" && loadingDuration % 2000 < 100) {
      console.log("[ESS] Loading state:", {
        isAuthLoading,
        isLoggedIn,
        isReady,
        userRole,
        hasEmployeeRecord,
        companyLoading: companyState?.loading,
        companyUser: !!companyState?.user,
        hrInitialized: hrState?.initialized,
        hrEmployeesCount: hrState?.employees?.length,
        essLoading: state.isLoading,
        essInitialized: state.isInitialized,
        loadingDuration: Math.round(loadingDuration / 1000) + "s",
        isTimeout,
      })
    }
    
    // If Settings is still loading auth, wait briefly (show nothing, like main app)
    if (isAuthLoading && !isTimeout) {
      setAccessStatus("loading")
      return
    }

    // Fast path: not authenticated - redirect immediately (like main app)
    // Don't wait for Company/HR contexts if user isn't even logged in
    if (!isLoggedIn) {
      setAccessStatus("not-authenticated")
      return
    }

    // OPTIMIZED: Allow access with basic auth data (like main app)
    // Don't wait for all contexts - let them load in background
    // ESSLayout will show loading state while data loads
    const hasRole = !!userRole || !!settingsState.user?.companies?.[0]?.role
    const hasCompanies = (settingsState.user?.companies?.length || 0) > 0
    
    // If we have auth + role + companies, allow access immediately
    // Contexts will load in background (same as main app)
    if (isLoggedIn && hasRole && hasCompanies) {
      // Allow access - ESS context will load employee data in background
      // ESSLayout will show loading screen while data loads
      setAccessStatus("authenticated")
      return
    }
    
    // Only wait if we don't have basics yet
    if (!isReady && !isTimeout) {
      setAccessStatus("loading")
      return
    }
    
    // Timeout: allow access anyway (contexts will load in background)
    if (!isReady && isTimeout) {
      console.warn("[ESS] Loading timeout - allowing access, contexts will load in background")
      setAccessStatus("authenticated")
      return
    }

    // Fast path: check termination first (no auth needed)
    const isTerminated = String((settingsState.user as any)?.accountStatus || "").toLowerCase() === "terminated"
    if (isTerminated) {
      setAccessStatus("terminated")
      return
    }

    // TEMPORARY: Bypass authentication for testing
    if (TEMP_BYPASS_AUTHENTICATION) {
      setAccessStatus("authenticated")
      return
    }

    // Allow all roles - no longer restricting to staff only
    // Removed wrong-role check

    // Fast path: no company - show error immediately
    if (!authState.currentCompanyId) {
      setAccessStatus("no-company")
      return
    }

    // For staff: check employee record (but don't block - let ESS context load in background)
    if (userRole === "staff") {
      // If ESS context is initialized and no employee linked, show error
      if (state.isInitialized && !state.isEmployeeLinked) {
        setAccessStatus("no-employee")
        return
      }
      
      // Otherwise allow access - ESS context will load employee data in background
      // ESSLayout will show loading screen while data loads (same as main app)
      setAccessStatus("authenticated")
      return
    }

    // Check for errors
    if (state.error) {
      setAccessStatus("error")
      return
    }

    // All checks passed
    setAccessStatus("authenticated")
  }, [
    isReady,
    isAuthenticated,
    userRole,
    hasEmployeeRecord,
    authState.currentCompanyId,
    state.isLoading,
    state.isInitialized,
    state.isEmployeeLinked,
    state.error,
    settingsState.user,
    settingsState.loading,
    settingsState.auth?.isLoggedIn,
    companyState.loading,
    companyState.user,
    hrState.initialized,
    hrState.employees?.length,
  ])

  // ============================================
  // BROWSER BACK BUTTON HANDLER
  // ============================================

  useEffect(() => {
    const handlePopState = () => {
      // If user is authenticated and tries to go back to login
      if (authState.isAuthenticated && window.location.pathname.endsWith("/Login")) {
        navigate(getESSDashboardPath(), { replace: true })
        return
      }

      // If user is on company selector but already has a company selected
      if (
        authState.currentCompanyId &&
        window.location.pathname.endsWith("/CompanySelect") &&
        !authState.isMultiCompany
      ) {
        navigate(getESSDashboardPath(), { replace: true })
        return
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [authState, navigate])

  // ============================================
  // REPLACE HISTORY ON LOAD
  // ============================================

  useEffect(() => {
    if (authState.isAuthenticated && (location.pathname.startsWith("/ESS/") || location.pathname.startsWith("/Mobile/"))) {
      window.history.replaceState(null, "", location.pathname)
    }
  }, [authState.isAuthenticated, location.pathname])

  // ============================================
  // RENDER BASED ON ACCESS STATUS
  // ============================================

  // Loading state - use BrandedAppLoader (actual loading screen)
  if (accessStatus === "loading") {
    return <BrandedAppLoader message="Loading your workspace..." />
  }

  // Not authenticated - redirect to login (use current path base for mobile/ess)
  if (accessStatus === "not-authenticated") {
    // Allow login route to be accessible
    if (location.pathname.endsWith("/Login")) {
      return <>{children}</>
    }
    
    ESSSessionPersistence.clearSession()
    // Use login path based on current route base
    const base = getESSBasePath()
    const loginPath = `${base}/Login`
    return (
      <Navigate
        to={loginPath}
        state={{ from: location, returnTo: "ess" }}
        replace
      />
    )
  }

  if (accessStatus === "terminated") {
    ESSSessionPersistence.clearSession()
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 2,
          gap: 2,
        }}
      >
        <Card sx={{ maxWidth: 520, width: "100%" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <WarningIcon color="error" />
              <Typography variant="h6">Access revoked</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your account has been terminated and you no longer have access to company data.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button variant="contained" onClick={logout}>
                Sign out
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Wrong role - allow access anyway (removed restriction)
  if (accessStatus === "wrong-role") {
    // Allow access - no longer restricting to staff only
    setAccessStatus("authenticated")
    return <>{children}</>
  }

  // No employee record
  if (accessStatus === "no-employee") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 400, width: "100%", borderRadius: 3 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "warning.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: "warning.dark" }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Profile Not Found
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your account is not linked to an employee profile. 
              Please contact your manager to set up your profile.
            </Typography>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => {
                ESSSessionPersistence.clearSession()
                navigate(`${getESSBasePath()}/Login`, { replace: true })
              }}
              sx={{ borderRadius: 2 }}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // No company
  if (accessStatus === "no-company") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 400, width: "100%", borderRadius: 3 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "warning.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <WarningIcon sx={{ fontSize: 40, color: "warning.dark" }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              No Company Access
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              You don't have access to any company. 
              Please contact your administrator.
            </Typography>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => {
                ESSSessionPersistence.clearSession()
                navigate(`${getESSBasePath()}/Login`, { replace: true })
              }}
              sx={{ borderRadius: 2 }}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Error state
  if (accessStatus === "error" && state.error) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 400, width: "100%", borderRadius: 3 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "error.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <WarningIcon sx={{ fontSize: 40, color: "error.dark" }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {state.error.code === "AUTH_REQUIRED" ? "Session Expired" : "Error"}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {state.error.message}
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => {
                if (state.error?.code === "AUTH_REQUIRED") {
                  ESSSessionPersistence.clearSession()
                  navigate(`${getESSBasePath()}/Login`, { replace: true })
                } else {
                  window.location.reload()
                }
              }}
              sx={{ borderRadius: 2 }}
            >
              {state.error.code === "AUTH_REQUIRED" ? "Go to Login" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // If authenticated and on login page, redirect to dashboard
  if (location.pathname.endsWith("/Login") && accessStatus === "authenticated") {
    return <Navigate to={getESSDashboardPath()} replace />
  }

  // Allow login route to be accessible when not authenticated
  if (location.pathname.endsWith("/Login")) {
    return <>{children}</>
  }

  // Authenticated - render children
  return <>{children}</>
}

export default ESSProtectedRoute