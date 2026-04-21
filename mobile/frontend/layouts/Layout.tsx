/**
 * ESS Layout
 * 
 * Main layout component for ESS Portal:
 * - Mobile-first design
 * - NO sidebar navigation
 * - Bottom navigation for primary pages
 * - Consistent header with Staff Workplace name on all pages
 * - Safe area handling for iOS
 */

"use client"

import React, { useEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Box, CircularProgress } from "@mui/material"
import { useESS } from "../../backend/context/MobileContext"
import { useESSNavigation } from "../hooks/useMobileNavigation"
import { ESSSessionPersistence } from "../../backend/utils/mobileSessionPersistence"
import { usePullToRefresh } from "../hooks/usePullToRefresh"
import ESSHeader from "./Header"
import ESSBottomNavigation from "./BottomNavigation"
import ESSLoadingScreen from "../components/LoadingScreen"
import { getESSDashboardPath } from "../utils/mobileRouteUtils"

// ============================================
// PAGE CONFIGURATION
// ============================================

// Page titles mapping (route segment after /Mobile or /ESS)
const PAGE_TITLES: Record<string, string> = {
  Dashboard: "Home",
  Schedule: "My Schedule",
  Clock: "Clock In/Out",
  Documents: "My Documents",
  Profile: "Profile",
  TimeOff: "Time Off",
  Payslips: "Payslips",
  Performance: "Performance",
  EmergencyContacts: "Emergency Contacts",
  Holidays: "Holiday Balance",
  MobileScheduling: "Team Schedule",
  CompanySelect: "Select Company",
  Login: "Login",
}

// ============================================
// COMPONENT
// ============================================

const ESSLayout: React.FC = () => {
  const location = useLocation()
  const { state, authState, refreshData } = useESS()
  const { goBack, currentPath } = useESSNavigation()
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Get page title
  const routeSegments = location.pathname.split("/").filter(Boolean)
  const routeSegment = routeSegments[routeSegments.length - 1] || "Dashboard"
  const pageTitle = PAGE_TITLES[routeSegment] || "ESS Portal"

  // Pull to refresh
  const { isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: refreshData,
    threshold: 80,
    elementRef: mainContentRef,
  })

  // ============================================
  // SCROLL TO TOP ON NAVIGATION
  // ============================================

  useEffect(() => {
    // Scroll to top when navigating to a new page
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  // ============================================
  // SESSION PERSISTENCE
  // ============================================

  useEffect(() => {
    // Save current path for session restore
    // In this app, router paths are basename-relative (e.g. "/Dashboard"), so persist any
    // authenticated, non-login path.
    if (authState.isAuthenticated && !location.pathname.endsWith("/Login")) {
      ESSSessionPersistence.saveCurrentPath(location.pathname)
    }
  }, [authState.isAuthenticated, location.pathname])

  // ============================================
  // HARDWARE BACK BUTTON HANDLER (Android)
  // ============================================

  useEffect(() => {
    const handlePopState = () => {
      // If on dashboard, let browser handle it (exit behavior)
      if (currentPath === getESSDashboardPath()) {
        return
      }

      // Use our navigation
      goBack()
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [currentPath, goBack])

  // ============================================
  // LOADING STATE
  // ============================================
  // Show loading while ESS context initializes (same pattern as main app)
  // This allows route access but shows loading while data loads

  if (state.isLoading && !state.isInitialized) {
    return <ESSLoadingScreen message="Loading your data..." />
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh", // Use dynamic viewport height for mobile
        bgcolor: "background.default",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        // Safe area for iOS notch
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Header - Consistent across all pages (no back button) */}
      <ESSHeader
        title={pageTitle}
      />

      {/* Main Content Area with Pull to Refresh */}
      <Box
        component="main"
        ref={mainContentRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          // Safe area for iOS home indicator + bottom nav
          paddingBottom: `calc(80px + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: Math.min(pullDistance, 80),
              transform: `translateY(${Math.min(pullDistance - 80, 0)}px)`,
              transition: isRefreshing ? "none" : "transform 0.2s ease-out",
              zIndex: 1000,
            }}
          >
            {isRefreshing ? (
              <CircularProgress size={24} />
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: `3px solid ${pullProgress >= 1 ? "primary.main" : "grey.300"}`,
                  borderTopColor: "primary.main",
                  transform: `rotate(${pullProgress * 360}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
              />
            )}
          </Box>
        )}
        <Outlet />
      </Box>

      {/* Bottom Navigation - Show on all ESS pages */}
      <ESSBottomNavigation />
    </Box>
  )
}

export default ESSLayout
