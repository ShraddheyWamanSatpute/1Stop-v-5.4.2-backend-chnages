"use client"
import { themeConfig } from "../../theme/AppTheme";
import { useState, useEffect, useRef, useMemo } from "react"
import type React from "react"

import { Box, Paper, Tabs, Tab, Typography, Card, CardContent, IconButton } from "@mui/material"
import {
  CalendarMonth as CalendarIcon,
  TableBar as TableIcon,
  Map as MapIcon,
  PeopleAlt as PeopleIcon,
  BarChart as BarChartIcon,
  ViewList as ListIcon,
  AccessTime as WaitlistIcon,
  Settings as SettingsIcon,
  MenuBook as DiaryIcon,
  Label as LabelIcon,
  LocationOn as LocationOnIcon,
  Bookmark as BookmarkIcon,
  Dashboard as BookingsDashboardIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Build as ToolsIcon,
} from "@mui/icons-material"
import { useCompany } from "../../backend/context/CompanyContext"
import {
  BookingsList,
  FloorPlanEditor,
  TableManagement,
  BookingTypesManagement,
  WaitlistManager,
  BookingCalendar,
  BookingsReportsDashboard,
  BookingSettingsTabs,
  BookingDiary,
  StatusManagement,
  PreorderProfiles,
  TagsManagement,
  LocationManagement,
  Tools,
} from "../components/bookings"
import BookingsDashboardNew from "./BookingsDashboardNew"
import { useNavigate, useLocation } from "react-router-dom"
import usePersistentBoolean from "../hooks/usePersistentBoolean"

const Bookings: React.FC = () => {
  const { state: companyState, hasPermission } = useCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const [tabIndex, setTabIndex] = useState(0)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  const lastRouteSyncPathRef = useRef<string>("")
  const suppressRouteSyncOnceRef = useRef<string>("") // lowercase

  // Calculate tabs BEFORE any early returns to ensure hooks are always called
  const availableTabs = useMemo(() => {
    if (!companyState.companyID || !hasPermission) return []
    
    return [
      {
        label: "Dashboard",
        slug: "dashboard",
        icon: <BookingsDashboardIcon />,
        component: <BookingsDashboardNew />,
        permission: hasPermission("bookings", "dashboard", "view"),
      },
      {
        label: "Bookings List",
        slug: "list",
        icon: <ListIcon />,
        component: <BookingsList />,
        permission: hasPermission("bookings", "list", "view"),
      },
      {
        label: "Calendar",
        slug: "calendar",
        icon: <CalendarIcon />,
        component: <BookingCalendar />,
        permission: hasPermission("bookings", "calendar", "view"),
      },
      {
        label: "Diary",
        slug: "diary",
        icon: <DiaryIcon />,
        component: <BookingDiary />,
        permission: hasPermission("bookings", "diary", "view"),
      },
      {
        label: "Floor Plan",
        slug: "floor-plan",
        icon: <MapIcon />,
        component: <FloorPlanEditor />,
        permission: hasPermission("bookings", "floorplan", "view"),
      },
      {
        label: "Waitlist",
        slug: "waitlist",
        icon: <WaitlistIcon />,
        component: <WaitlistManager />,
        permission: hasPermission("bookings", "waitlist", "view"),
      },
      {
        label: "Tables",
        slug: "tables",
        icon: <TableIcon />,
        component: <TableManagement />,
        permission: hasPermission("bookings", "tables", "view"),
      },
      {
        label: "Locations",
        slug: "locations",
        icon: <LocationOnIcon />,
        component: <LocationManagement />,
        permission: hasPermission("bookings", "locations", "view"),
      },
      {
        label: "Booking Types",
        slug: "booking-types",
        icon: <PeopleIcon />,
        component: <BookingTypesManagement />,
        permission: hasPermission("bookings", "types", "view"),
      },
      {
        label: "Preorder Profiles",
        slug: "preorder-profiles",
        icon: <BookmarkIcon />,
        component: <PreorderProfiles />,
        permission: hasPermission("bookings", "preorders", "view"),
      },
      {
        label: "Status",
        slug: "status",
        icon: <LabelIcon />,
        component: <StatusManagement />,
        permission: hasPermission("bookings", "status", "view"),
      },
      {
        label: "Tags",
        slug: "tags",
        icon: <LabelIcon />,
        component: <TagsManagement />,
        permission: hasPermission("bookings", "tags", "view"),
      },
      {
        label: "Reports",
        slug: "reports",
        icon: <BarChartIcon />,
        component: <BookingsReportsDashboard />,
        permission: hasPermission("bookings", "reports", "view"),
      },
      {
        label: "Tools",
        slug: "tools",
        icon: <ToolsIcon />,
        component: <Tools />,
        permission: hasPermission("bookings", "tools", "view"),
      },
      {
        label: "Settings",
        slug: "settings",
        icon: <SettingsIcon />,
        component: <BookingSettingsTabs />,
        permission: hasPermission("bookings", "settings", "view"),
      },
    ]
  }, [companyState.companyID, hasPermission])

  // Filter tabs based on permissions
  const visibleTabs = useMemo(() => availableTabs.filter((tab) => tab.permission), [availableTabs])

  // ALL hooks must be called before any early returns
  useEffect(() => {
    if (tabIndex >= visibleTabs.length && visibleTabs.length > 0) {
      setTabIndex(0)
    }
  }, [visibleTabs.length, tabIndex])

  useEffect(() => {
    if (!visibleTabs.length) {
      return
    }

    const pathWithoutTrailingSlash = location.pathname.replace(/\/+$/, "")
    const pathLower = pathWithoutTrailingSlash.toLowerCase()

    const isSuppressed = suppressRouteSyncOnceRef.current === pathLower
    if (isSuppressed) {
      suppressRouteSyncOnceRef.current = ""
    }

    if (lastRouteSyncPathRef.current === pathLower) {
      return
    }
    lastRouteSyncPathRef.current = pathLower

    const pathSegments = pathWithoutTrailingSlash.split("/").filter(Boolean)
    const bookingsIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "bookings")
    const tabSegment = bookingsIndex !== -1 ? pathSegments[bookingsIndex + 1] : undefined

    const defaultSlug = visibleTabs[0]?.slug

    if (!tabSegment) {
      if (defaultSlug) {
        const defaultPath = `/Bookings/${slugToPascalPath(defaultSlug)}`
        if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
          navigate(defaultPath, { replace: true })
        }
      }
      if (tabIndex !== 0) {
        setTabIndex(0)
      }
      return
    }

    // Match tab by slug, handling both PascalCase paths and lowercase slugs
    const tabSegLower = tabSegment.toLowerCase()
    const matchedIndex = visibleTabs.findIndex((tab) => {
      const pascalSlug = slugToPascalPath(tab.slug)
      return tab.slug.toLowerCase() === tabSegLower || pascalSlug.toLowerCase() === tabSegLower
    })

    if (matchedIndex !== -1) {
      if (tabIndex !== matchedIndex) {
        setTabIndex(matchedIndex)
      }
    } else if (defaultSlug) {
      const defaultPath = `/Bookings/${slugToPascalPath(defaultSlug)}`
      if (!isSuppressed && pathLower !== defaultPath.toLowerCase()) {
        navigate(defaultPath, { replace: true })
      }
      if (tabIndex !== 0) {
        setTabIndex(0)
      }
    }
  }, [visibleTabs, location.pathname, navigate, tabIndex])

  const slugToPascalPath = (slug: string) => {
    return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue)

    const selectedTab = visibleTabs[newValue]
    if (!selectedTab?.slug) {
      return
    }

    const targetPath = `/Bookings/${slugToPascalPath(selectedTab.slug)}`
    const currentPath = location.pathname.replace(/\/+$/, "")
    if (currentPath.toLowerCase() !== targetPath.toLowerCase()) {
      suppressRouteSyncOnceRef.current = targetPath.toLowerCase()
      navigate(targetPath)
    }
  }

  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  if (!companyState.companyID) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 64px)",
          flexGrow: 1,
        }}
      >
        <Card sx={{ padding: 3 }}>
          <CardContent>
            <Typography variant="h5" align="center">
              Choose a Company to Continue
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Show message if no tabs are visible due to permissions
  if (visibleTabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 64px)",
          flexGrow: 1,
        }}
      >
        <Card sx={{ padding: 3 }}>
          <CardContent>
            <Typography variant="h5" align="center">
              Access Restricted
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 2 }}>
              You don't have permission to access any booking features. Please contact your administrator.
            </Typography>
          </CardContent>
        </Card>
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
            value={tabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
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
                "&.Mui-selected": {
                  color: themeConfig.brandColors.offWhite,
                  opacity: 1,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: themeConfig.brandColors.offWhite,
              },
            }}
          >
            {visibleTabs.map((tab) => (
              <Tab key={tab.slug ?? tab.label} icon={tab.icon} label={tab.label} />
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
        {visibleTabs[tabIndex] && visibleTabs[tabIndex].component}
      </Box>
    </Box>
  )
}

export default Bookings
