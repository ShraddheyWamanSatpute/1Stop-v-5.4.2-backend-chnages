/**
 * ESS Bottom Navigation
 * 
 * Mobile-optimized bottom navigation:
 * - 4 primary navigation items (Home, Schedule, Clock, Docs)
 * - Badge indicators for notifications
 * - Clock status indicator
 * - Touch-friendly sizing
 * - Safe area handling for iOS
 */

"use client"

import React from "react"
import { format } from "date-fns"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  useTheme,
} from "@mui/material"
import {
  Home as HomeIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as ClockIcon,
  Description as DocumentsIcon,
} from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { getESSBasePath } from "../utils/mobileRouteUtils"

// ============================================
// NAVIGATION ITEMS
// ============================================

interface NavItem {
  label: string
  icon: React.ReactElement
  path: string
  badge?: () => number
  showClockIndicator?: boolean
}

const normalizeDateKey = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  const parsed =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value))

  if (Number.isNaN(parsed.getTime())) return null
  return format(parsed, "yyyy-MM-dd")
}

// ============================================
// COMPONENT
// ============================================

const ESSBottomNavigation: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useESS()
  const basePath = getESSBasePath()
  const p = (segment: string) => `${basePath}/${segment}`

  // ============================================
  // NAVIGATION ITEMS CONFIG
  // ============================================

  const navItems: NavItem[] = [
    {
      label: "Home",
      icon: <HomeIcon />,
      path: p("Dashboard"),
    },
    {
      label: "Schedule",
      icon: <CalendarIcon />,
      path: p("Schedule"),
      badge: () => {
        // Show count of today's shifts
        const today = format(new Date(), "yyyy-MM-dd")
        const todayShifts = state.upcomingShifts.filter(
          (s) => normalizeDateKey(s.date) === today
        )
        return todayShifts.length
      },
    },
    {
      label: "Clock",
      icon: <ClockIcon />,
      path: p("Clock"),
      showClockIndicator: true,
    },
    {
      label: "Docs",
      icon: <DocumentsIcon />,
      path: p("Documents"),
    },
  ]

  // ============================================
  // DETERMINE CURRENT VALUE
  // ============================================

  const getCurrentValue = (): string => {
    const currentPath = location.pathname

    // Direct match
    const directMatch = navItems.find((item) => item.path === currentPath)
    if (directMatch) return directMatch.path

    // Map secondary pages to their parent nav item
    const secondaryToParent: Record<string, string> = {
      [p("TimeOff")]: p("Dashboard"),
      [p("Payslips")]: p("Dashboard"),
      [p("Performance")]: p("Dashboard"),
      [p("EmergencyContacts")]: p("Dashboard"),
      [p("Holidays")]: p("Dashboard"),
      [p("MobileScheduling")]: p("Dashboard"),
      [p("Checklists")]: p("Dashboard"),
      [p("MyChecklist")]: p("Dashboard"),
      [p("Profile")]: p("Dashboard"),
    }

    const parentPath = secondaryToParent[currentPath]
    if (parentPath) return parentPath

    // Default to dashboard
    return p("Dashboard")
  }

  const currentValue = getCurrentValue()

  // ============================================
  // HANDLE NAVIGATION
  // ============================================

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar + 1, // Ensure it's above other content
        // Safe area for iOS home indicator
        paddingBottom: "env(safe-area-inset-bottom)",
        bgcolor: "background.paper",
        borderTop: `1px solid ${theme.palette.divider}`,
        // Shadow for elevation (theme-aware)
        boxShadow: theme.shadows[4],
        display: "flex",
        width: "100%",
      }}
    >
      <BottomNavigation
        value={currentValue}
        onChange={handleChange}
        showLabels
        sx={{
          width: "100%",
          height: { xs: 64, sm: 72 },
          bgcolor: "background.paper",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            maxWidth: "none",
            flex: 1,
            padding: "6px 0",
            color: "text.secondary",
            transition: "all 0.2s ease",
            "&.Mui-selected": {
              color: "primary.main",
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.7rem",
                fontWeight: 600,
              },
            },
            "&:active": {
              transform: "scale(0.95)",
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              marginTop: "4px",
              transition: "font-size 0.2s ease",
              whiteSpace: "nowrap",
            },
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 24, sm: 26 },
              color: "inherit",
            },
          },
        }}
      >
        {navItems.map((item) => {
          const badgeCount = item.badge ? item.badge() : 0

          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={
                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  {/* Badge for notifications */}
                  {badgeCount > 0 ? (
                    <Badge
                      badgeContent={badgeCount}
                      color="error"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: "0.65rem",
                          minWidth: 16,
                          height: 16,
                          padding: "0 4px",
                        },
                      }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}

                  {/* Clock status indicator (green dot when clocked in) */}
                  {item.showClockIndicator && state.isClockedIn && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        bgcolor: "success.main",
                        borderRadius: "50%",
                        border: `2px solid ${theme.palette.background.paper}`,
                        animation: "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%": {
                            boxShadow: `0 0 0 0 ${theme.palette.success.main}40`,
                          },
                          "70%": {
                            boxShadow: `0 0 0 6px ${theme.palette.success.main}00`,
                          },
                          "100%": {
                            boxShadow: `0 0 0 0 ${theme.palette.success.main}00`,
                          },
                        },
                      }}
                    />
                  )}
                </Box>
              }
              sx={{
                // Touch-friendly sizing
                minHeight: { xs: 64, sm: 72 },
              }}
            />
          )
        })}
      </BottomNavigation>
    </Box>
  )
}

export default ESSBottomNavigation
