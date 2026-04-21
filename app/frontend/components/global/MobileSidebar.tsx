"use client"

import { useMemo, useState } from "react"
import { useLocation, Link as RouterLink, useNavigate } from "react-router-dom"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
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
  Avatar,
  Typography,
  useTheme,
  AppBar,
  Toolbar,
  Collapse,
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
  Menu as MenuIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Build as BuildIcon,
  ExpandLess,
  ExpandMore,
  Map as MapIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Transform as TransformIcon,
  BugReport as BugReportIcon,
} from "@mui/icons-material"
import { useThemeContext } from "../../styles/ThemeProvider"
import { logout } from "../../../backend/functions/Settings"
import { getCurrentUser } from "../../../backend/functions/Settings"
import { useEffect } from "react"
import CompanyDropdown from "./CompanyDropdown"
import SiteDropdown from "./SiteDropdown"
import { getCompanyLayout, type ModuleKey } from "../../layouts/companyLayout"
import { themeConfig } from "../../../theme/AppTheme"
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

const toolsItems = [
  { name: "FloorFriend", icon: MapIcon, path: "/Tools/FloorFriend" },
  { name: "PDF to Excel", icon: PdfIcon, path: "/Tools/PdfToExcel" },
  { name: "Excel to PDF", icon: ExcelIcon, path: "/Tools/ExcelToPdf" },
  { name: "Excel Reformat", icon: TransformIcon, path: "/Tools/ExcelReformat" },
]

interface MobileSidebarProps {
  open: boolean
  toggleSidebar: () => void
}

const MobileSidebar = ({ open, toggleSidebar }: MobileSidebarProps) => {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useThemeContext()
  const { state } = useSettings()
  const { getUserPermissions, state: companyState } = useCompany()
  const layout = useMemo(() => getCompanyLayout(companyState?.company?.companyType), [companyState?.company?.companyType])

  const [userProfile, setUserProfile] = useState<{
    firstName: string
    lastName: string
  } | null>(null)

  const [toolsOpen, setToolsOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  useEffect(() => {
    const getUserProfile = async () => {
      if (state.auth.uid) {
        const profile = await getCurrentUser()
        if (profile) {
          setUserProfile({
            firstName: (profile as any).firstName || profile.displayName?.split(' ')[0] || '',
            lastName: (profile as any).lastName || profile.displayName?.split(' ')[1] || '',
          })
        }
      }
    }

    getUserProfile()
  }, [state.auth.uid])

  const handleSignOut = async () => {
    try {
      await logout()
      navigate("/Login")
    } catch (error) {
      console.error("Error logging out", error)
    }
  }

  const visibleNavigationItems = useMemo(() => {
    const baseItems = navigationItems.filter((item) => {
      if (item.path === "/Supply") return layout.enabledFeatures.has("supply")
      return true
    })

    // Apply company layout restrictions first.
    const layoutFiltered = baseItems.filter((item) => {
      if (!item.moduleKey) return true
      return !layout.disabledModules.has(item.moduleKey as ModuleKey)
    })

    const effective = getUserPermissions?.()
    const modules = (effective as any)?.modules || {}

    const canSeeModule = (moduleKey?: string) => {
      if (!moduleKey) return true
      if (companyState?.loading) return true
      const mod = modules?.[moduleKey]
      if (!mod) return false
      return Object.values(mod).some((page: any) => Boolean(page?.view))
    }

    return layoutFiltered.filter((item) => item.always || canSeeModule(item.moduleKey))
  }, [getUserPermissions, companyState?.loading, layout])

  const preloadNavTarget = (path: string) => {
    preloadForPathname(path)
  }

  const handleOpenProfile = () => {
    navigate("/Settings/Personal")
    toggleSidebar()
  }

  return (
    <>
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: themeConfig.brandColors.navy,
            zIndex: theme.zIndex.appBar,
          }}
        >
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={toggleSidebar} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            1 Stop
          </Typography>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode === false ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <Avatar sx={{ ml: 1, width: 32, height: 32 }}>
            {userProfile ? `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}` : "U"}
          </Avatar>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* This is to offset the content below the AppBar */}
        <Drawer
          anchor="left"
          open={open}
          onClose={toggleSidebar}
          sx={{
            "& .MuiDrawer-paper": {
              width: 280,
              zIndex: theme.zIndex.drawer,
              backgroundColor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
            },
          }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img
              src={logoSrc}
              alt="1 Stop Logo"
              style={{
                width: 32,
                height: 32,
                marginRight: 12,
                objectFit: "contain",
              }}
              onError={(e) => {
                e.currentTarget.src = logoSrc
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              1 Stop
            </Typography>
          </Box>
          <IconButton
            onClick={toggleSidebar}
            sx={{
              color: themeConfig.brandColors.offWhite,
              "&:hover": {
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />

        {/* Company and Site Dropdowns at the top */}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: alpha(themeConfig.brandColors.offWhite, 0.7) }}>
            Company & Location
          </Typography>

          <Box
            sx={{
              borderRadius: 1,
              mb: 1,
              p: 1,
              display: "flex",
              alignItems: "center",
              "&:hover": {
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            <BusinessIcon
              fontSize="small"
              sx={{
                mr: 2,
                color: alpha(themeConfig.brandColors.offWhite, 0.7),
              }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <CompanyDropdown />
            </Box>
          </Box>

          <Box
            sx={{
              borderRadius: 1,
              mb: 1,
              p: 1,
              display: "flex",
              alignItems: "center",
              "&:hover": {
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            <LocationOnIcon
              fontSize="small"
              sx={{
                mr: 2,
                color: alpha(themeConfig.brandColors.offWhite, 0.7),
              }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <SiteDropdown />
            </Box>
          </Box>
        </Box>
        <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />

        <List sx={{ flexGrow: 1 }}>
          {visibleNavigationItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return (
              <ListItem key={item.name} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={isActive}
                  onMouseEnter={() => preloadNavTarget(item.path)}
                  onFocus={() => preloadNavTarget(item.path)}
                  onTouchStart={() => preloadNavTarget(item.path)}
                  onClick={toggleSidebar}
                  sx={{
                    minHeight: 48,
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
                      mr: 2,
                      justifyContent: "center",
                      color: themeConfig.brandColors.offWhite,
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontWeight: isActive ? 600 : 400,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}

          {/* Tools Section */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setToolsOpen(!toolsOpen)}
              selected={location.pathname.startsWith("/Tools")}
              sx={{
                minHeight: 48,
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
                  mr: 2,
                  justifyContent: "center",
                color: themeConfig.brandColors.offWhite,
                }}
              >
                <BuildIcon />
              </ListItemIcon>
              <ListItemText
                primary="Tools"
                sx={{
                  "& .MuiListItemText-primary": {
                    fontWeight: location.pathname.startsWith("/Tools") ? 600 : 400,
                  },
                }}
              />
              {toolsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={toolsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {toolsItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <ListItem key={item.name} disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to={item.path}
                      selected={isActive}
                      onClick={toggleSidebar}
                      sx={{
                        pl: 4,
                        minHeight: 40,
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
                          mr: 2,
                          justifyContent: "center",
                          color: themeConfig.brandColors.offWhite,
                        }}
                      >
                        <item.icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        sx={{
                          "& .MuiListItemText-primary": {
                            fontSize: "0.875rem",
                            fontWeight: isActive ? 600 : 400,
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          </Collapse>
        </List>
        <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />
        <Box sx={{ p: 2 }}>
          <ListItemButton
            onClick={() => setBugReportOpen(true)}
            sx={{
              borderRadius: 1,
              mb: 1.25,
              "&:hover": {
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 2,
                justifyContent: "center",
                color: alpha(themeConfig.brandColors.offWhite, 0.7),
              }}
            >
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText
              primary="Report Bug"
              sx={{
                "& .MuiListItemText-primary": {
                  color: themeConfig.brandColors.offWhite,
                  fontWeight: 600,
                },
              }}
            />
          </ListItemButton>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ListItemButton
              onClick={handleOpenProfile}
              sx={{
                borderRadius: 1,
                flex: 1,
                "&:hover": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: "center",
                  color: themeConfig.brandColors.offWhite,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                  {userProfile ? `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}` : "U"}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Profile"}
                secondary={`Signed in as ${state.auth.email || "user@example.com"}`}
                sx={{
                  "& .MuiListItemText-primary": {
                    color: themeConfig.brandColors.offWhite,
                    fontWeight: 500,
                  },
                  "& .MuiListItemText-secondary": {
                    color: alpha(themeConfig.brandColors.offWhite, 0.7),
                  },
                }}
              />
            </ListItemButton>

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
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
      <BugReportWidget open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </>
  )
}

export default MobileSidebar
