/**
 * ESS Session Restore Hook
 * 
 * Handles restoring ESS session after page refresh:
 * - Checks if user was in ESS mode
 * - Validates session is still valid
 * - Redirects to appropriate page
 */

import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ESSSessionPersistence } from "../../backend/utils/mobileSessionPersistence"
import { useAuthReady } from "./useAuthReady"
import { getESSBasePath, getESSDashboardPath } from "../utils/mobileRouteUtils"

interface SessionRestoreState {
  isRestoring: boolean
  shouldRedirect: boolean
  targetPath: string | null
}

export const useESSSessionRestore = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isReady, isAuthenticated, userRole } = useAuthReady()

  const [state, setState] = useState<SessionRestoreState>({
    isRestoring: true,
    shouldRedirect: false,
    targetPath: null,
  })

  useEffect(() => {
    const restoreSession = () => {
      // Wait for auth to be ready
      if (!isReady) return

      const session = ESSSessionPersistence.getSession()
      const sessionState = session ? {
        isESSMode: session.isActive,
        isExpired: Date.now() > session.expiresAt,
        lastPath: session.lastPath
      } : {
        isESSMode: false,
        isExpired: true,
        lastPath: getESSDashboardPath()
      }

      // Case 1: Not authenticated - clear session and don't restore
      if (!isAuthenticated) {
        ESSSessionPersistence.clearSession()
        setState({ isRestoring: false, shouldRedirect: false, targetPath: null })
        return
      }

      // Case 2: User is authenticated but not staff - clear ESS session
      if (userRole !== "staff") {
        ESSSessionPersistence.clearSession()
        setState({ isRestoring: false, shouldRedirect: false, targetPath: null })
        return
      }

      // Case 3: User is staff and was in ESS mode
      if (sessionState.isESSMode && !sessionState.isExpired) {
        // Check if already on an ESS page
        if (location.pathname.startsWith("/ESS/") || location.pathname.startsWith("/Mobile/")) {
          // Already on ESS page, no redirect needed
          setState({ isRestoring: false, shouldRedirect: false, targetPath: null })
          return
        }

        // User is on a non-ESS page but should be in ESS mode
        const targetPath = sessionState.lastPath || getESSDashboardPath()
        setState({ isRestoring: false, shouldRedirect: true, targetPath })
        return
      }

      // Case 4: User is staff but no ESS session
      if (userRole === "staff" && !(location.pathname.startsWith("/ESS/") || location.pathname.startsWith("/Mobile/"))) {
        // Staff user not in ESS mode, redirect to ESS
        setState({ isRestoring: false, shouldRedirect: true, targetPath: `${getESSBasePath()}/Dashboard` })
        return
      }

      // Default: No action needed
      setState({ isRestoring: false, shouldRedirect: false, targetPath: null })
    }

    restoreSession()
  }, [isReady, isAuthenticated, userRole, location.pathname])

  // Perform redirect if needed
  useEffect(() => {
    if (!state.isRestoring && state.shouldRedirect && state.targetPath) {
      navigate(state.targetPath, { replace: true })
    }
  }, [state, navigate])

  return state
}

export default useESSSessionRestore

