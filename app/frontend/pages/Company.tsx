"use client"

import type React from "react"
import { memo, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Typography
} from "@mui/material"
import {
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  AssignmentInd as AssignmentIndIcon,
  People as PeopleIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import { useCompany } from "../../backend/context/CompanyContext"
import { useNavigate, useLocation } from "react-router-dom"

import ChecklistDashboard from "./company/ChecklistDashboard"
import CompanyInfo from "./company/CompanyInfo"
import SiteManagement from "./company/SiteManagement"
import UserSiteAllocation from "./company/UserSiteAllocation"
import Permissions from "./company/Permissions"
import Checklists from "./company/Checklists"
import ChecklistHistory from "./company/ChecklistHistory"
import ChecklistTypes from "./company/ChecklistTypes"
import MyChecklist from "./company/MyChecklist"
import Reports from "./company/Reports"
import Settings from "./company/Settings"
import { themeConfig } from "../../theme/AppTheme"
import usePersistentBoolean from "../hooks/usePersistentBoolean"

const MemoChecklistDashboard = memo(ChecklistDashboard)
const MemoCompanyInfo = memo(CompanyInfo)
const MemoSiteManagement = memo(SiteManagement)
const MemoUserSiteAllocation = memo(UserSiteAllocation)
const MemoPermissions = memo(Permissions)
const MemoChecklists = memo(Checklists)
const MemoChecklistHistory = memo(ChecklistHistory)
const MemoChecklistTypes = memo(ChecklistTypes)
const MemoMyChecklist = memo(MyChecklist)
const MemoReports = memo(Reports)
const MemoSettings = memo(Settings)

const Company: React.FC = () => {
  const { hasPermission, state: companyState } = useCompany()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check if user is owner or admin (legacy behavior - show these tabs to owners/admins)
  const isOwnerOrAdmin = useMemo(() => {
    const userRole = companyState.user?.role?.toLowerCase()
    return userRole === 'owner' || userRole === 'admin'
  }, [companyState.user?.role])

  // Use tab path as the value (stable even when tabs are filtered)
  const [activeTabPath, setActiveTabPath] = useState<string>("")
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  // Store lowercase path to make suppression case-insensitive (react-router can match case-insensitively)
  const suppressRouteSyncOnceRef = useRef<string>("")

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  // Define tabs with permission-based visibility (no hard-coded roles)
  const tabs = useMemo(() => [
    {
      label: "Dashboard",
      icon: <BusinessIcon />,
      path: "/Company/Dashboard",
      show: hasPermission("company", "dashboard", "view"),
    },
    {
      label: "Company Info",
      icon: <BusinessIcon />,
      path: "/Company/Info",
      show: hasPermission("company", "info", "view"),
    },
    {
      label: "Site Management",
      icon: <LocationOnIcon />,
      path: "/Company/SiteManagement",
      show: hasPermission("company", "siteManagement", "view"),
    },
    {
      label: "User Allocation",
      icon: <PeopleIcon />,
      path: "/Company/UserAllocation",
      show: hasPermission("company", "userAllocation", "view") || hasPermission("company", "permissions", "view") || isOwnerOrAdmin,
    },
    {
      label: "Permissions",
      icon: <SecurityIcon />,
      path: "/Company/Permissions",
      show: hasPermission("company", "permissions", "view"),
    },
    {
      label: "Checklists",
      icon: <AssignmentIcon />,
      path: "/Company/Checklists",
      show: hasPermission("company", "checklists", "view"),
    },
    {
      label: "Checklist History",
      icon: <HistoryIcon />,
      path: "/Company/ChecklistHistory",
      show: hasPermission("company", "checklistHistory", "view") || hasPermission("company", "checklists", "view") || isOwnerOrAdmin,
    },
    {
      label: "Checklist Types",
      icon: <CategoryIcon />,
      path: "/Company/ChecklistTypes",
      show: hasPermission("company", "checklistTypes", "view"),
    },
    {
      label: "My Checklists",
      icon: <AssignmentIndIcon />,
      path: "/Company/MyChecklist",
      show: hasPermission("company", "myChecklists", "view"),
    },
    {
      label: "Reports",
      icon: <DescriptionIcon />,
      path: "/Company/Reports",
      show: hasPermission("company", "reports", "view"),
    },
    {
      label: "Settings",
      icon: <SettingsIcon />,
      path: "/Company/Settings",
      show: hasPermission("company", "settings", "view"),
    },
  ], [hasPermission, isOwnerOrAdmin])

  // Filter tabs based on permissions - useMemo prevents unnecessary filtering
  const visibleTabs = useMemo(() => tabs.filter(tab => tab.show), [tabs])

  useEffect(() => {
    if (!visibleTabs.length) return
    // Keep active path valid when visibility changes (permissions load/update)
    // Use direct comparison for faster updates
    const isValid = activeTabPath && visibleTabs.some((t) => t.path.toLowerCase() === activeTabPath.toLowerCase())
    if (!isValid) {
      setActiveTabPath(visibleTabs[0].path)
    }
  }, [activeTabPath, visibleTabs])

  // Removed mountedTabPaths - render only active tab for instant UI like HR section

  useEffect(() => {
    if (!visibleTabs.length) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathLower = pathWithoutTrailingSlash.toLowerCase()

    // If a user clicked a tab, we temporarily suppress route->tab syncing until
    // the URL actually becomes that target. This prevents "bounce back" where
    // the effect re-selects the old tab before navigate() completes.
    const pendingTargetLower = suppressRouteSyncOnceRef.current
    const isSuppressed = suppressRouteSyncOnceRef.current === pathLower
    if (pendingTargetLower) {
      if (pathLower === pendingTargetLower) {
        // Navigation has caught up; release suppression.
        suppressRouteSyncOnceRef.current = ""
      } else {
        // Navigation not yet updated; don't override the user's selected tab.
        return
      }
    }

    // Legacy URL redirects (remove hyphens from Company checklist routes)
    const legacyRedirects: Array<{ from: string; to: string }> = [
      { from: "/company/checklist-history", to: "/Company/ChecklistHistory" },
      { from: "/company/checklist-types", to: "/Company/ChecklistTypes" },
      { from: "/company/user-allocation", to: "/Company/UserAllocation" },
      { from: "/company/my-checklist", to: "/Company/MyChecklist" },
      { from: "/company/contracts", to: "/Company/Info" },
    ]
    const legacyMatch = legacyRedirects.find(
      (r) => pathLower === r.from || pathLower.startsWith(`${r.from}/`),
    )
    if (legacyMatch) {
      const suffix = pathWithoutTrailingSlash.slice(legacyMatch.from.length)
      const nextPath = `${legacyMatch.to}${suffix}`
      if (pathWithoutTrailingSlash !== nextPath) {
        navigate(nextPath, { replace: true })
      }
      // Immediate UI response - like HR section
      setActiveTabPath(legacyMatch.to)
      return
    }

    // Find exact match first (most specific)
    let matchedIndex = visibleTabs.findIndex((tab) => 
      pathLower === tab.path.toLowerCase()
    )
    
    // If no exact match, try prefix match
    if (matchedIndex === -1) {
      matchedIndex = visibleTabs.findIndex((tab) =>
        pathLower.startsWith(`${tab.path.toLowerCase()}/`)
      )
    }

    const defaultPath = visibleTabs[0]?.path

    if (matchedIndex === -1) {
      // If this navigation was user-initiated, don't auto-redirect away from their target.
      // Only redirect if we're not on a valid Company route at all
      if (!isSuppressed && defaultPath && !pathWithoutTrailingSlash.toLowerCase().startsWith("/company")) {
        navigate(defaultPath, { replace: true })
        setActiveTabPath(defaultPath)
      }
      // Don't change activeTabPath if we're already on a valid Company route but it's not in visibleTabs
      // This preserves the user's intended tab even if permissions change
      return
    }

    const matched = visibleTabs[matchedIndex]
    if (matched && matched.path.toLowerCase() !== activeTabPath.toLowerCase()) {
      // Immediate UI response - like HR section
      setActiveTabPath(matched.path)
    }
  }, [activeTabPath, location.pathname, navigate, visibleTabs])

  const handleTabClick = (targetPath: string) => {
    // CRITICAL: Update state synchronously for instant visual feedback
    // Don't wait for navigation - indicator updates immediately
    if (activeTabPath !== targetPath) {
      setActiveTabPath(targetPath)
    }
    // Navigate in background - doesn't block UI
    const currentPath = location.pathname.replace(/\/+$/, "")
    if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
      suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
      // Navigate immediately; state has already been updated synchronously above.
      navigate(targetPath)
    }
  }

  if (visibleTabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access any company features. Please contact your administrator.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        m: 0,
        mt: isTabsExpanded ? 0 : -3,
        p: 0,
        transition: "margin 0.3s ease",
      }}
    >
      {isTabsExpanded && (
        <Paper 
          sx={{ 
            borderBottom: 1, 
            borderColor: "divider", 
            bgcolor: themeConfig.brandColors.navy, 
            color: themeConfig.brandColors.offWhite,
            m: 0,
            p: 0,
          }}
        >
          <Tabs
            value={activeTabPath || visibleTabs[0]?.path || ""}
            // We intentionally handle clicks on each Tab to avoid any index/value mismatches.
            onChange={() => {}}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="company tabs"
            sx={{
              px: 2,
              "& .MuiTabs-scrollButtons": {
                "&.Mui-disabled": {
                  opacity: 0,
                  width: 0,
                },
              },
              "& .MuiTabs-scroller": {
                overflow: "visible !important",
              },
              "& .MuiTab-root": {
                color: themeConfig.brandColors.offWhite,
                opacity: 0.7,
                transition: "opacity 0.1s ease", // Faster transition
                "&.Mui-selected": {
                  color: themeConfig.brandColors.offWhite,
                  opacity: 1,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: themeConfig.brandColors.offWhite,
                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)", // Faster, smoother transition
              },
            }}
          >
            {visibleTabs.map((tab, _index) => (
              <Tab
                key={tab.path}
                value={tab.path}
                icon={tab.icon}
                label={tab.label}
                onClick={() => handleTabClick(tab.path)}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "background.paper",
          m: 0,
          p: 0,
          lineHeight: 0,
        }}
      >
        <IconButton
          onClick={toggleTabsExpanded}
          size="small"
          sx={{
            color: "text.primary",
            m: 0,
            p: 0.5,
            "&:hover": {
              bgcolor: "transparent",
              opacity: 0.7,
            },
          }}
        >
          {isTabsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: "auto", 
          width: "100%",
        }}
      >
        {(() => {
          // Render only active tab - instant UI like HR section
          const activeTab = visibleTabs.find((t) => t.path.toLowerCase() === activeTabPath.toLowerCase())
          if (!activeTab) return null
          
          switch (activeTab.path) {
            case "/Company/Dashboard":
              return <MemoChecklistDashboard />
            case "/Company/Info":
              return <MemoCompanyInfo />
            case "/Company/SiteManagement":
              return <MemoSiteManagement />
            case "/Company/UserAllocation":
              return <MemoUserSiteAllocation />
            case "/Company/Permissions":
              return <MemoPermissions />
            case "/Company/Checklists":
              return <MemoChecklists />
            case "/Company/ChecklistHistory":
              return <MemoChecklistHistory />
            case "/Company/ChecklistTypes":
              return <MemoChecklistTypes />
            case "/Company/MyChecklist":
              return <MemoMyChecklist />
            case "/Company/Reports":
              return <MemoReports />
            case "/Company/Settings":
              return <MemoSettings />
            default:
              return null
          }
        })()}
      </Box>
    </Box>
  )
}

export default Company
