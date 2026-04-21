/**
 * ESS Navigation Hook
 * 
 * Handles navigation with proper history management:
 * - Prevents broken back button flows
 * - Manages navigation stack
 * - Provides safe navigation methods
 */

import { useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { getESSBasePath, getESSDashboardPath } from "../utils/mobileRouteUtils"

export const useESSNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = useMemo(() => getESSBasePath(), [location.pathname])
  const p = useCallback((segment: string) => `${basePath}/${segment}`, [basePath])

  const NAVIGATION_HIERARCHY: Record<string, string> = useMemo(() => ({
    // Secondary pages → their parent
    [p("TimeOff")]: p("Profile"),
    [p("Payslips")]: p("Profile"),
    [p("Performance")]: p("Profile"),
    [p("EmergencyContacts")]: p("Profile"),
    [p("Holidays")]: p("Profile"),
    // Primary pages → dashboard
    [p("Schedule")]: p("Dashboard"),
    [p("Clock")]: p("Dashboard"),
    [p("Documents")]: p("Dashboard"),
    [p("Profile")]: p("Dashboard"),
    // Company selector → dashboard (after selection)
    [p("CompanySelect")]: p("Dashboard"),
  }), [p])

  const REPLACE_PAGES = useMemo(() => [p("Dashboard"), p("CompanySelect")], [p])

  /**
   * Navigate to a page with proper history handling
   */
  const navigateTo = useCallback((
    path: string,
    options?: { replace?: boolean }
  ) => {
    const shouldReplace = options?.replace || REPLACE_PAGES.includes(path)
    navigate(path, { replace: shouldReplace })
  }, [navigate, REPLACE_PAGES])

  /**
   * Go back with fallback to parent page
   */
  const goBack = useCallback(() => {
    const currentPath = location.pathname
    const parentPath = NAVIGATION_HIERARCHY[currentPath]

    if (parentPath) {
      // Navigate to defined parent
      navigate(parentPath, { replace: true })
    } else if (window.history.length > 1) {
      // Try browser back
      navigate(-1)
    } else {
      // Fallback to dashboard
      navigate(getESSDashboardPath(), { replace: true })
    }
  }, [location.pathname, navigate, NAVIGATION_HIERARCHY])

  /**
   * Navigate after action completion (e.g., after clock in)
   * Replaces current entry to prevent back to action page
   */
  const navigateAfterAction = useCallback((path: string) => {
    navigate(path, { replace: true })
  }, [navigate])

  /**
   * Reset navigation to dashboard
   * Clears forward history
   */
  const resetToHome = useCallback(() => {
    const dash = getESSDashboardPath()
    navigate(dash, { replace: true })
    // Clear forward history
    window.history.pushState(null, "", dash)
  }, [navigate])

  return {
    navigateTo,
    goBack,
    navigateAfterAction,
    resetToHome,
    currentPath: location.pathname,
  }
}

export default useESSNavigation

