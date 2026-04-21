/**
 * ESS Session Persistence Utilities
 * 
 * Manages ESS session state across browser refreshes:
 * - Stores ESS mode status
 * - Persists last visited path
 * - Handles session expiration (24 hours)
 */

import { getESSDashboardPath } from "../../frontend/utils/mobileRouteUtils"

const ESS_SESSION_KEY = "ess_session"
const ESS_SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export interface ESSSession {
  isActive: boolean
  companyId: string
  siteId?: string
  lastPath: string
  timestamp: number
  expiresAt: number
}


/**
 * ESS Session Persistence Manager
 */
export const ESSSessionPersistence = {
  /**
   * Get the current session from localStorage
   */
  getSession(): ESSSession | null {
    try {
      const stored = localStorage.getItem(ESS_SESSION_KEY)
      if (!stored) return null

      const session: ESSSession = JSON.parse(stored)
      
      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error("[ESS] Failed to get session:", error)
      return null
    }
  },

  /**
   * Check if ESS mode is currently active
   */
  isESSModeActive(): boolean {
    const session = this.getSession()
    return session?.isActive === true
  },

  /**
   * Check if we should restore the session
   * Returns true if session exists, is active, and not expired
   */
  shouldRestoreSession(): boolean {
    const session = this.getSession()
    if (!session) return false
    
    return (
      session.isActive === true &&
      Date.now() < session.expiresAt &&
      !!session.companyId
    )
  },

  /**
   * Enable ESS mode and save session
   */
  enableESSMode(companyId: string, siteId?: string): void {
    try {
      const existingSession = this.getSession()
      const defaultDashboard = getESSDashboardPath()
      
      const session: ESSSession = {
        isActive: true,
        companyId,
        siteId,
        lastPath: existingSession?.lastPath || defaultDashboard,
        timestamp: Date.now(),
        expiresAt: Date.now() + ESS_SESSION_DURATION,
      }

      localStorage.setItem(ESS_SESSION_KEY, JSON.stringify(session))
    } catch (error) {
      console.error("[ESS] Failed to enable ESS mode:", error)
    }
  },

  /**
   * Disable ESS mode
   */
  disableESSMode(): void {
    try {
      const session = this.getSession()
      if (session) {
        session.isActive = false
        localStorage.setItem(ESS_SESSION_KEY, JSON.stringify(session))
      }
    } catch (error) {
      console.error("[ESS] Failed to disable ESS mode:", error)
    }
  },

  /**
   * Save the current path for session restoration
   */
  saveCurrentPath(path: string): void {
    try {
      const session = this.getSession()
      if (session) {
        session.lastPath = path
        session.timestamp = Date.now()
        localStorage.setItem(ESS_SESSION_KEY, JSON.stringify(session))
      }
    } catch (error) {
      console.error("[ESS] Failed to save current path:", error)
    }
  },

  /**
   * Get the last visited path
   */
  getLastPath(): string {
    const session = this.getSession()
    return session?.lastPath || "/ESS/Dashboard"
  },

  /**
   * Clear the entire session
   */
  clearSession(): void {
    try {
      localStorage.removeItem(ESS_SESSION_KEY)
    } catch (error) {
      console.error("[ESS] Failed to clear session:", error)
    }
  },

  /**
   * Refresh the session timestamp (extend expiration)
   */
  refreshSession(): void {
    try {
      const session = this.getSession()
      if (session && session.isActive) {
        session.timestamp = Date.now()
        session.expiresAt = Date.now() + ESS_SESSION_DURATION
        localStorage.setItem(ESS_SESSION_KEY, JSON.stringify(session))
      }
    } catch (error) {
      console.error("[ESS] Failed to refresh session:", error)
    }
  },

  /**
   * Get session info for debugging
   */
  getSessionInfo(): {
    isActive: boolean
    companyId: string | null
    lastPath: string | null
    expiresIn: number | null
  } {
    const session = this.getSession()
    if (!session) {
      return {
        isActive: false,
        companyId: null,
        lastPath: null,
        expiresIn: null,
      }
    }

    return {
      isActive: session.isActive,
      companyId: session.companyId,
      lastPath: session.lastPath,
      expiresIn: Math.max(0, session.expiresAt - Date.now()),
    }
  },
}

export default ESSSessionPersistence
