"use client"

import { useLocation, Link as RouterLink, useNavigate } from "react-router-dom"
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Avatar,
  Typography,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  AttachMoney as AttachMoneyIcon,
  Business as BusinessIcon,
  Calculate as CalculatorIcon,
  SmartToy as AssistantIcon,
  Star as StarIcon,
  History as HistoryIcon,
  BugReport as BugReportIcon,
} from "@mui/icons-material"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useMemo, useState, useEffect } from "react"
import { useCalculator } from "../../../backend/context/CalculatorContext"
import { useAssistant } from "../../../backend/context/AssistantContext"
import { logout } from "../../../backend/functions/Settings"
import { getCompanyLayout, type ModuleKey } from "../../layouts/companyLayout"
import { themeConfig } from "../../../theme/AppTheme"
import { useWorkspaceNavigation } from "../../context/WorkspaceNavigationContext"
import { preloadForPathname } from "../../utils/preloadAppRoutes"
import BugReportWidget from "./BugReportWidget"

const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")
const logoSrc = `${baseUrl}images/logo.png`

const navigationItems: Array<{
  name: string
  icon: any
  path: string
  moduleKey?: string
  always?: boolean
}> = [
  { name: "Dashboard", icon: DashboardIcon, path: "/Dashboard", moduleKey: "dashboard" },
  { name: "Stock", icon: InventoryIcon, path: "/Stock", moduleKey: "stock" },
  { name: "HR", icon: PeopleIcon, path: "/HR", moduleKey: "hr" },
  { name: "Bookings", icon: CalendarIcon, path: "/Bookings", moduleKey: "bookings" },
  { name: "POS", icon: ShoppingCartIcon, path: "/POS", moduleKey: "pos" },
  { name: "Finance", icon: AttachMoneyIcon, path: "/Finance", moduleKey: "finance" },
  // Supplier-only section (driven by layout feature flags)
  { name: "Supply", icon: LocalShippingIcon, path: "/Supply", always: true },
  { name: "Messenger", icon: MessageIcon, path: "/Messenger", moduleKey: "messenger" },
  { name: "Company", icon: BusinessIcon, path: "/Company", moduleKey: "company" },
  { name: "Settings", icon: SettingsIcon, path: "/Settings", always: true },
]

const bottomNavigationItems = [
  { name: "Calculator", icon: CalculatorIcon, path: "#", action: "openCalculator" },
  { name: "Assistant", icon: AssistantIcon, path: "#", action: "openAssistant" },
]

const workspacePanelItems = [
  { name: "Favorites", icon: StarIcon, panel: "favorites" as const },
  { name: "Recents", icon: HistoryIcon, panel: "recents" as const },
]

const navigationSectionByPath: Record<
  string,
  "dashboard" | "stock" | "hr" | "bookings" | "pos" | "finance" | "supply" | "messenger" | "company" | "settings"
> = {
  "/Dashboard": "dashboard",
  "/Stock": "stock",
  "/HR": "hr",
  "/Bookings": "bookings",
  "/POS": "pos",
  "/Finance": "finance",
  "/Supply": "supply",
  "/Messenger": "messenger",
  "/Company": "company",
  "/Settings": "settings",
}


interface SidebarProps {
  open: boolean
  toggleSidebar: () => void
}

const Sidebar = ({ open, toggleSidebar }: SidebarProps) => {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSettings()
  const { getUserPermissions, state: companyState } = useCompany()
  const { openAssistant } = useAssistant()
  const { activePanel, togglePanel } = useWorkspaceNavigation()
  const layout = useMemo(() => getCompanyLayout(companyState?.company?.companyType), [companyState?.company?.companyType])
  const isSuperAdmin = Boolean((state.user as any)?.isAdmin)
  const isAdminStaff = Boolean((state.user as any)?.adminStaff?.active)
  const supportViewMode = (() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
    } catch {
      return false
    }
  })()

  const drawerWidth = open ? 240 : 64
  const { openCalculator } = useCalculator()
 
  const [userProfile, setUserProfile] = useState<{
    firstName: string
    lastName: string
    email?: string
  } | undefined>(undefined)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [bugReportOpen, setBugReportOpen] = useState(false)


  // Set user profile synchronously (no loading delays)
  useEffect(() => {
    if (!state.auth.uid) {
      setUserProfile(undefined)
      setLoadingProfile(false)
      return
    }

    // Don't update profile during loading to prevent flashing
    if (state.loading) {
      return
    }

    let firstName = "User"
    let lastName = ""
    let email = state.auth.email || ""

    // Priority 1: Personal settings (most reliable)
    if (state.settings?.personal?.firstName && state.settings?.personal?.lastName) {
      firstName = state.settings.personal.firstName
      lastName = state.settings.personal.lastName
      email = state.user?.email || state.auth.email || ""
    }
    // Priority 2: User object properties
    else if (state.user) {
      const userWithNames = state.user as any
      if (userWithNames.firstName && userWithNames.lastName) {
        firstName = userWithNames.firstName
        lastName = userWithNames.lastName
        email = state.user.email || state.auth.email || ""
      }
      // Priority 3: Display name parsing
      else if (state.user.displayName) {
        const nameParts = state.user.displayName.split(' ')
        firstName = nameParts[0] || "User"
        lastName = nameParts.slice(1).join(' ') || ""
        email = state.user.email || state.auth.email || ""
      }
      // Priority 4: Auth display name
      else if (state.auth.displayName) {
        const nameParts = state.auth.displayName.split(' ')
        firstName = nameParts[0] || "User"
        lastName = nameParts.slice(1).join(' ') || ""
      }
      // Priority 5: Email username
      else if (state.user.email) {
        firstName = state.user.email.split('@')[0] || "User"
        email = state.user.email
      }
    }
    // Priority 6: Auth display name fallback
    else if (state.auth.displayName) {
      const nameParts = state.auth.displayName.split(' ')
      firstName = nameParts[0] || "User"
      lastName = nameParts.slice(1).join(' ') || ""
    }

    // Set profile immediately (no async delays)
    setUserProfile({
      firstName,
      lastName,
      email
    })
    setLoadingProfile(false)
  }, [state.auth.uid, state.settings?.personal?.firstName, state.settings?.personal?.lastName, state.user?.displayName, state.auth.displayName, state.user?.email, state.auth.email, state.loading])

  // Don't show sidebar on auth pages
  if (
    location.pathname === "/Login" ||
    location.pathname === "/Register" ||
    location.pathname === "/ResetPassword"
  ) {
    return null
  }

  const handleSignOut = async () => {
    try {
      // Fix nullable type issues by providing empty string fallbacks
      await logout()
      navigate("/Login")
    } catch (error) {
      console.error("Error logging out", error)
    }
  }

  const visibleNavigationItems = useMemo(() => {
    const baseItems = navigationItems.filter((item) => {
      // Hide Supply if the feature isn't enabled for this layout (keeps hospitality unchanged).
      if (item.path === "/Supply") return layout.enabledFeatures.has("supply")
      return true
    })

    // Apply company layout restrictions first (independent of permissions/support view).
    const layoutFiltered = baseItems.filter((item) => {
      if (!item.moduleKey) return true
      return !layout.disabledModules.has(item.moduleKey as ModuleKey)
    })

    // Super-admins see everything always.
    if (isSuperAdmin) return layoutFiltered

    // Admin staff see everything only in support view mode.
    if (isAdminStaff && supportViewMode) return layoutFiltered

    const effective = getUserPermissions?.()
    const modules = (effective as any)?.modules || {}

    const canSeeModule = (moduleKey?: string) => {
      if (!moduleKey) return true
      // While company is still loading permissions, avoid hiding menu to prevent UI "popping".
      if (companyState?.loading) return true
      const mod = modules?.[moduleKey]
      if (!mod) return false
      return Object.values(mod).some((page: any) => Boolean(page?.view))
    }

    const permissionFiltered = layoutFiltered.filter((item) => item.always || canSeeModule(item.moduleKey))
    const sidebarSections = (state.settings?.preferences as any)?.sidebarSections || {}

    // User-configured sidebar visibility from Settings > Navigation.
    return permissionFiltered.filter((item) => {
      const sectionKey = navigationSectionByPath[item.path]
      if (!sectionKey) return true
      const enabled = sidebarSections[sectionKey]
      return enabled !== false
    })
  }, [getUserPermissions, companyState?.loading, isSuperAdmin, isAdminStaff, supportViewMode, layout, state.settings?.preferences])

  const preloadNavTarget = (path: string) => {
    preloadForPathname(path)
  }

  const handleOpenProfile = () => {
    navigate("/Settings/Personal")
  }


  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        zIndex: theme.zIndex.drawer,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRadius: 0,
          zIndex: theme.zIndex.drawer,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          backgroundColor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
          overflowX: "hidden",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexDirection: open ? "row" : "column",
          justifyContent: open ? "space-between" : "center",
          padding: theme.spacing(2),
          width: "100%",
          gap: open ? 0 : 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={logoSrc}
            alt="1 Stop Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.currentTarget.src = logoSrc
            }}
          />
        </Box>
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: themeConfig.brandColors.offWhite,
            backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
            "&:hover": {
              backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.2),
            },
          }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />
      <List sx={{ flexGrow: 1 }}>
        {visibleNavigationItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(`${item.path}/`))

          return (
            <ListItem disablePadding key={item.name}>
              <Tooltip title={open ? "" : item.name} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onMouseEnter={() => preloadNavTarget(item.path)}
                  onFocus={() => preloadNavTarget(item.path)}
                  onTouchStart={() => preloadNavTarget(item.path)}
                  selected={isActive}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? "initial" : "center",
                    px: 2.5,
                    "&.Mui-selected": {
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.15),
                      "&:hover": {
                        backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.25),
                      },
                    },
                    "&:hover": {
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : "auto",
                      justifyContent: "center",
                      color: themeConfig.brandColors.offWhite,
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.name} sx={{ opacity: open ? 1 : 0 }} />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}

      </List>

      <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />
      <List>
        {workspacePanelItems.map((item) => {
          const selected = activePanel === item.panel
          return (
            <ListItem key={item.name} disablePadding>
              <Tooltip title={open ? "" : item.name} placement="right">
                <ListItemButton
                  data-workspace-panel-trigger="true"
                  onClick={() => togglePanel(item.panel)}
                  selected={selected}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? "initial" : "center",
                    px: 2.5,
                    "&.Mui-selected": {
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.15),
                      "&:hover": {
                        backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.25),
                      },
                    },
                    "&:hover": {
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : "auto",
                      justifyContent: "center",
                      color: themeConfig.brandColors.offWhite,
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.name} sx={{ opacity: open ? 1 : 0 }} />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>
      
      {/* Bottom Navigation Items */}
      <List>
        {bottomNavigationItems.map((item) => {
          return (
            <ListItem key={item.name} disablePadding>
              <Tooltip title={open ? "" : item.name} placement="right">
                <ListItemButton
                  component={item.action ? 'button' : RouterLink}
                  to={item.action ? undefined : item.path}
                  onClick={item.action === 'openCalculator' ? openCalculator : item.action === 'openAssistant' ? openAssistant : undefined}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? "initial" : "center",
                    px: 2.5,
                    "&:hover": {
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : "auto",
                      justifyContent: "center",
                      color: themeConfig.brandColors.offWhite,
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    sx={{ opacity: open ? 1 : 0 }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>
      
      <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />
      <Box sx={{ p: 2 }}>
        <Tooltip title={open ? "" : "Report Bug"} placement="right">
          <ListItemButton
            onClick={() => setBugReportOpen(true)}
            sx={{
              borderRadius: 1,
              justifyContent: open ? "initial" : "center",
              mb: 1.25,
              "&:hover": {
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : "auto",
                justifyContent: "center",
                color: themeConfig.brandColors.offWhite,
              }}
            >
              <BugReportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Report Bug"
              sx={{
                opacity: open ? 1 : 0,
                "& .MuiListItemText-primary": {
                  fontSize: "0.9rem",
                  fontWeight: 600,
                },
              }}
            />
          </ListItemButton>
        </Tooltip>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={open ? "" : "Profile"} placement="right">
            <ListItemButton
              onClick={handleOpenProfile}
              sx={{
                borderRadius: 1,
                flex: 1,
                minWidth: 0,
                justifyContent: open ? "flex-start" : "center",
                "&:hover": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 1.5 : "auto",
                  justifyContent: "center",
                  color: themeConfig.brandColors.offWhite,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                  {loadingProfile
                    ? "..."
                    : (userProfile && userProfile.firstName)
                      ? userProfile.firstName.charAt(0) + (userProfile.lastName ? userProfile.lastName.charAt(0) : "")
                      : "U"}
                </Avatar>
              </ListItemIcon>
              {open ? (
                <ListItemText
                  primary={loadingProfile ? "Loading..." : userProfile ? `${userProfile.firstName}${userProfile.lastName ? ` ${userProfile.lastName}` : ""}` : "Profile"}
                  secondary={
                    loadingProfile
                      ? "Loading account…"
                      : `Signed in as ${userProfile?.email || state.user?.email || state.auth.email || "user@example.com"}`
                  }
                  sx={{
                    minWidth: 0,
                    "& .MuiListItemText-primary": {
                      color: themeConfig.brandColors.offWhite,
                      fontSize: "0.875rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                    "& .MuiListItemText-secondary": {
                      color: alpha(themeConfig.brandColors.offWhite, 0.68),
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                />
              ) : null}
            </ListItemButton>
          </Tooltip>

          <Tooltip title="Logout" placement="right">
            <IconButton
              onClick={handleSignOut}
              sx={{
                color: alpha(themeConfig.brandColors.offWhite, 0.8),
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.08),
                "&:hover": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.16),
                },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <BugReportWidget open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </Drawer>
  )
}

export default Sidebar
