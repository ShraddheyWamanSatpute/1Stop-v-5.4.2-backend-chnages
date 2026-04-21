"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Button,
  useTheme,
  FormControl,
  Select,
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import {
  Dashboard,
  Inventory,
  Notifications,
  Settings,
  DarkMode,
  LightMode,
  Warning,
  ShoppingCart,
  People,
  EventNote,
  PointOfSale,
  Message,
  Login,
  AppRegistration,
  LockReset,
  AddCircle,
  ListAlt,
  TrendingUp,
  Receipt,
  RestaurantMenu,
  BarChart,
  AttachMoney,
  AccountBalance,
  Payment,
  MonetizationOn,
  Assessment,
  ArrowDropDown,
} from "@mui/icons-material"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useNotifications } from "../../../backend/context/NotificationsContext"
import { areDependenciesReady } from "../../../backend/utils/ContextDependencies"
import { Alert } from "@mui/material"
import LocationSelector from "./LocationSelector"
import { themeConfig } from "../../../theme/AppTheme"
import { pageShortcutCatalog } from "../../utils/workspaceShortcuts"
import { useWorkspaceNavigation } from "../../context/WorkspaceNavigationContext"
import { getCompanyLayout, type ModuleKey } from "../../layouts/companyLayout"
import { getNavigationPermissionTarget } from "../../utils/workspaceNavigationVisibility"

// Add a keyframe animation for the logo
const logoAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
`

interface GlobalAppBarProps {
  darkMode: boolean
  toggleDarkMode: () => void
  sidebarOpen?: boolean
  toggleSidebar?: () => void
  sidebarWidth?: number
}

const GlobalAppBar = ({ darkMode, toggleDarkMode, sidebarWidth }: GlobalAppBarProps) => {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSettings()
  const { state: companyState, getUserPermissions, hasPermission } = useCompany()
  const { favorites, isFavorite } = useWorkspaceNavigation()
  // NotificationsProvider should always be available since it's rendered in LazyProviders
  // which wraps all routes that use MainLayout
  const { state: notificationsState, markAsRead, markAllAsRead, canViewNotifications, canEditNotifications } = useNotifications()
  const canViewNotificationsPanel = canViewNotifications()
  const canEditNotificationsPanel = canEditNotifications()
  
  // Check if core contexts (Settings and Company) are ready)
  // This ensures the top bar dropdowns load before other components access context data
  const coreContextsReady = areDependenciesReady(state, companyState)

  // Add style element for animations
  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = logoAnimation
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null)
  const [sectionPagesAnchor, setSectionPagesAnchor] = useState<null | HTMLElement>(null)
  const isAuthPage =
    location.pathname === "/Login" || location.pathname === "/Register" || location.pathname === "/ResetPassword"

  // Helper function to convert PascalCase or camelCase to readable title
  const formatRouteTitle = (segment: string): string => {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      "POS": "Point of Sale",
      "HR": "Human Resources",
      "ESS": "Employee Self Service",
      "OAuth": "OAuth",
      "HMRC": "HMRC",
      "AddItem": "Add New Item",
      "EditItem": "Edit Item",
      "AddPurchase": "Add Purchase Order",
      "EditPurchase": "Edit Purchase Order",
      "AddStockCount": "Add Stock Count",
      "EditStockCount": "Edit Stock Count",
      "AddParLevel": "Add Par Level",
      "ItemSales": "Item Sales",
      "TillScreen": "Till Screen",
      "TillUsage": "Till Usage",
      "TillManagement": "Till Management",
      "MenuManagement": "Menu Management",
      "MenuAdd": "Add Menu Item",
      "MenuEdit": "Edit Menu Item",
      "OrdersEdit": "Edit Order",
      "SiteManagement": "Site Management",
      "UserAllocation": "User Allocation",
      "ChecklistHistory": "Checklist History",
      "ChecklistTypes": "Checklist Types",
      "Checklist-History": "Checklist History",
      "Checklist-Types": "Checklist Types",
      "MyChecklist": "My Checklists",
      "My-Checklist": "My Checklists",
      "User-Allocation": "User Allocation",
      "ScheduleManager": "Schedule Manager",
      "AICalendar": "AI Calendar",
      "ChartOfAccounts": "Chart of Accounts",
      "ResetPassword": "Reset Password",
      "JoinCompany": "Join Company",
      "AcceptSiteInvite": "Accept Site Invite",
      "FloorFriend": "Floor Friend",
      "PdfToExcel": "PDF to Excel",
      "ExcelToPdf": "Excel to PDF",
      "ExcelReformat": "Excel Reformat",
      "PurchaseOrders": "Purchase Orders",
      "StockCounts": "Stock Counts",
      "ParLevels": "Par Levels",
    }

    if (specialCases[segment]) {
      return specialCases[segment]
    }

    // Convert PascalCase to Title Case
    // Split on capital letters and join with spaces
    const words = segment.replace(/([A-Z])/g, " $1").trim().split(" ")
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")
  }

  // Get page title and icon based on current route
  const getPageInfo = () => {
    const path = location.pathname
    const pathSegments = location.pathname.split("/").filter(Boolean)
    
    // Handle root and dashboard
    if (path === "/" || path === "/Dashboard" || pathSegments.length === 0) {
      return { title: "Dashboard", icon: <Dashboard /> }
    }

    // Get main section (first segment)
    const mainSection = pathSegments[0]

    // Define section icons
    const sectionIcons: Record<string, React.ReactElement> = {
      Stock: <Inventory />,
      HR: <People />,
      Bookings: <EventNote />,
      POS: <PointOfSale />,
      Finance: <AttachMoney />,
      Company: <Settings />,
      Settings: <Settings />,
      Messenger: <Message />,
      Analytics: <BarChart />,
      Tools: <Settings />,
      Notifications: <Notifications />,
      YourStop: <RestaurantMenu />,
      Login: <Login />,
      Register: <AppRegistration />,
      ResetPassword: <LockReset />,
      JoinCompany: <AppRegistration />,
      AcceptSiteInvite: <AppRegistration />,
      Mobile: <Settings />,
      ESS: <Settings />,
    }

    // Handle auth pages
    if (mainSection === "Login") return { title: "Login", icon: <Login /> }
    if (mainSection === "Register") return { title: "Register", icon: <AppRegistration /> }
    if (mainSection === "ResetPassword") {
      return { title: "Reset Password", icon: <LockReset /> }
    }
    if (mainSection === "JoinCompany") return { title: "Join Company", icon: <AppRegistration /> }
    if (mainSection === "AcceptSiteInvite") return { title: "Accept Site Invite", icon: <AppRegistration /> }

    // Handle main sections with no sub-routes
    if (pathSegments.length === 1) {
      const title = formatRouteTitle(mainSection)
      const icon = sectionIcons[mainSection] || <Dashboard />
      return { title, icon }
    }

    // Handle sub-routes
    const subRoute = pathSegments[1]
    const subRouteFormatted = formatRouteTitle(subRoute)

    // Special handling for specific routes
    if (mainSection === "Stock") {
      if (subRoute === "AddItem") return { title: "Stock - Add New Item", icon: <AddCircle /> }
      if (subRoute === "EditItem") return { title: "Stock - Edit Item", icon: <AddCircle /> }
      if (subRoute === "AddPurchase") return { title: "Stock - Add Purchase Order", icon: <ShoppingCart /> }
      if (subRoute === "EditPurchase") return { title: "Stock - Edit Purchase Order", icon: <ShoppingCart /> }
      if (subRoute === "AddStockCount") return { title: "Stock - Add Stock Count", icon: <ListAlt /> }
      if (subRoute === "EditStockCount") return { title: "Stock - Edit Stock Count", icon: <ListAlt /> }
      if (subRoute === "AddParLevel") return { title: "Stock - Add Par Level", icon: <TrendingUp /> }
      if (subRoute === "PurchaseOrders") return { title: "Stock - Purchase Orders", icon: <ShoppingCart /> }
      if (subRoute === "StockCounts") return { title: "Stock - Stock Counts", icon: <ListAlt /> }
      if (subRoute === "ParLevels") return { title: "Stock - Par Levels", icon: <TrendingUp /> }
      if (subRoute === "Items") return { title: "Stock - Stock Items", icon: <Inventory /> }
      if (subRoute === "Management") {
        const managementSub = pathSegments[2]
        if (managementSub) {
          return { title: `Stock - ${formatRouteTitle(managementSub)}`, icon: <Inventory /> }
        }
        return { title: "Stock - Management", icon: <Inventory /> }
      }
      return { title: `Stock - ${subRouteFormatted}`, icon: <Inventory /> }
    }

    if (mainSection === "POS") {
      if (subRoute === "ItemSales") return { title: "POS - Item Sales", icon: <PointOfSale /> }
      if (subRoute === "TillScreen") {
        const action = pathSegments[2]
        if (action === "Add") return { title: "POS - Add Till Screen", icon: <AddCircle /> }
        if (action === "Edit") return { title: "POS - Edit Till Screen", icon: <AddCircle /> }
        return { title: "POS - Till Screen", icon: <Settings /> }
      }
      if (subRoute === "TillUsage") return { title: "POS - Till Usage", icon: <BarChart /> }
      if (subRoute === "TillManagement") return { title: "POS - Till Management", icon: <Settings /> }
      if (subRoute === "MenuManagement") return { title: "POS - Menu Management", icon: <RestaurantMenu /> }
      if (subRoute === "MenuAdd") return { title: "POS - Add Menu Item", icon: <AddCircle /> }
      if (subRoute === "MenuEdit") return { title: "POS - Edit Menu Item", icon: <AddCircle /> }
      if (subRoute === "Orders" || subRoute === "OrdersEdit") return { title: "POS - Orders", icon: <Receipt /> }
      if (subRoute === "Management") {
        const managementSub = pathSegments[2]
        if (managementSub) {
          return { title: `POS - ${formatRouteTitle(managementSub)}`, icon: <PointOfSale /> }
        }
        return { title: "POS - Management", icon: <PointOfSale /> }
      }
      return { title: `POS - ${subRouteFormatted}`, icon: <PointOfSale /> }
    }

    if (mainSection === "Finance") {
      if (subRoute === "ChartOfAccounts") return { title: "Finance - Chart of Accounts", icon: <AccountBalance /> }
      if (subRoute === "Transactions") return { title: "Finance - Transactions", icon: <Payment /> }
      if (subRoute === "Invoices") return { title: "Finance - Invoices", icon: <Receipt /> }
      if (subRoute === "Bills") return { title: "Finance - Bills", icon: <MonetizationOn /> }
      if (subRoute === "Reports") return { title: "Finance - Financial Reports", icon: <Assessment /> }
      return { title: `Finance - ${subRouteFormatted}`, icon: <AttachMoney /> }
    }

    if (mainSection === "Company") {
      if (subRoute === "SiteManagement") return { title: "Company - Site Management", icon: <Settings /> }
      if (subRoute === "UserAllocation" || subRoute === "User-Allocation") return { title: "Company - User Allocation", icon: <People /> }
      if (subRoute === "ChecklistHistory" || subRoute === "Checklist-History") return { title: "Company - Checklist History", icon: <ListAlt /> }
      if (subRoute === "ChecklistTypes" || subRoute === "Checklist-Types") return { title: "Company - Checklist Types", icon: <ListAlt /> }
      if (subRoute === "MyChecklist" || subRoute === "My-Checklist") return { title: "Company - My Checklists", icon: <ListAlt /> }
      return { title: `Company - ${subRouteFormatted}`, icon: <Settings /> }
    }

    if (mainSection === "HR") {
      if (pathSegments.length > 2) {
        const subSubRoute = pathSegments[2]
        if (subRoute === "Management") {
          if (subSubRoute === "ScheduleManager") {
            return { title: "HR - Scheduling", icon: <EventNote /> }
          }
          return { title: `HR - ${formatRouteTitle(subSubRoute)}`, icon: <People /> }
        }
        if (subRoute === "Scheduling" && subSubRoute === "ScheduleManager") {
          return { title: "HR - Scheduling", icon: <EventNote /> }
        }
        return { title: `HR - ${formatRouteTitle(subSubRoute)}`, icon: <People /> }
      }
      return { title: `HR - ${subRouteFormatted}`, icon: <People /> }
    }

    if (mainSection === "Bookings") {
      return { title: `Bookings - ${subRouteFormatted}`, icon: <EventNote /> }
    }

    if (mainSection === "Settings") {
      if (subRoute === "Personal") return { title: "Settings - Personal Info", icon: <Settings /> }
      if (subRoute === "Account") return { title: "Settings - Account & Security", icon: <Settings /> }
      if (subRoute === "Preferences") return { title: "Settings - Preferences", icon: <Settings /> }
      if (subRoute === "Navigation") return { title: "Settings - Navigation", icon: <Settings /> }
      if (subRoute === "Companies") return { title: "Settings - Companies", icon: <Settings /> }
      return { title: `Settings - ${subRouteFormatted}`, icon: <Settings /> }
    }

    // Default: format the last segment as title
    const lastSegment = pathSegments[pathSegments.length - 1]
    const title = formatRouteTitle(lastSegment)
    const icon = sectionIcons[mainSection] || <Dashboard />

    return { title: `${formatRouteTitle(mainSection)} - ${title}`, icon }
  }

  const pageInfo = getPageInfo()
  const layout = useMemo(() => getCompanyLayout(companyState?.company?.companyType), [companyState?.company?.companyType])
  const sidebarVisibility = useMemo(
    () => (state.settings?.preferences as any)?.sidebarSections || {},
    [state.settings?.preferences],
  )
  const sectionPages = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean)
    const section = pathSegments[0]
    if (!section) return []

    const sectionPrefix = `/${section}`
    const entries = pageShortcutCatalog.filter((shortcut) => {
      return shortcut.path === sectionPrefix || shortcut.path.startsWith(`${sectionPrefix}/`)
    })

    const effectivePermissions = getUserPermissions?.()
    const canAccessPath = (path: string) => {
      const target = getNavigationPermissionTarget(path)
      if (target.alwaysVisible) return true
      if (target.sectionKey && sidebarVisibility[target.sectionKey] === false) return false
      if (target.moduleKey && layout.disabledModules.has(target.moduleKey as ModuleKey)) return false
      if (target.sectionKey === "supply" && !layout.enabledFeatures.has("supply")) return false
      if (companyState?.loading) return true
      if (!target.moduleKey) return true
      if (!target.pageKey) {
        const modulePermissions = (effectivePermissions as any)?.modules?.[target.moduleKey]
        if (!modulePermissions) return false
        return Object.values(modulePermissions).some((page: any) => Boolean(page?.view))
      }
      return hasPermission(target.moduleKey, target.pageKey, "view")
    }

    const byPath = new Map<string, any>()
    entries
      .filter((e) => canAccessPath(e.path))
      .forEach((entry) => {
        if (!byPath.has(entry.path)) byPath.set(entry.path, entry)
      })

    // Ensure current route is always selectable, even if missing from catalog.
    if (!byPath.has(location.pathname)) {
      byPath.set(location.pathname, { key: `page:current:${location.pathname}`, label: pageInfo.title, path: location.pathname })
    }

    const list = Array.from(byPath.values())
    list.sort((a: any, b: any) => {
      const fa = isFavorite?.(a) ? 1 : favorites.some((f) => f.path === a.path) ? 1 : 0
      const fb = isFavorite?.(b) ? 1 : favorites.some((f) => f.path === b.path) ? 1 : 0
      if (fa !== fb) return fb - fa
      return String(a.label || "").localeCompare(String(b.label || ""), "en", { sensitivity: "base" })
    })
    return list
  }, [location.pathname, pageInfo.title, favorites, getUserPermissions, hasPermission, isFavorite, layout, companyState?.loading, sidebarVisibility])


  // Don't show the full app bar on auth pages
  if (isAuthPage) {
    return (
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.appBar,
          boxShadow: 1,
          backgroundColor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
          borderRadius: 0,
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Auth pages use full width
          width: '100%',
          marginLeft: 0,
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Inventory
              sx={{
                mr: 1,
                animation: "spin 2s infinite ease-in-out",
              }}
            />
            <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
              1 Stop
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Toolbar>
      </AppBar>
    )
  }

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme.zIndex.appBar,
        boxShadow: 1,
        backgroundColor: themeConfig.brandColors.navy,
        color: themeConfig.brandColors.offWhite,
        borderRadius: 0,
        transition: theme.transitions.create(["margin", "width"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        // Adjust width and position based on sidebar state
        width: `calc(100% - ${sidebarWidth || 240}px)`,
        marginLeft: `${sidebarWidth || 240}px`,
        // On mobile, use full width
        '@media (max-width: 960px)': {
          width: '100%',
          marginLeft: 0,
        },
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              "& > svg": {
                animation:
                  location.pathname === "/"
                    ? "bounce 2s infinite ease-in-out"
                    : location.pathname.includes("/Stock")
                      ? "pulse 2s infinite ease-in-out"
                      : location.pathname.includes("/POS")
                        ? "spin 3s infinite linear"
                        : location.pathname.includes("/HR")
                          ? "pulse 2s infinite ease-in-out"
                          : location.pathname.includes("/Bookings")
                            ? "bounce 2s infinite ease-in-out"
                            : location.pathname.includes("/Finance")
                              ? "pulse 1.5s infinite ease-in-out"
                              : "none",
              },
            }}
          >
            {pageInfo.icon}
          </Box>
          {sectionPages.length > 0 ? (
            (() => {
              const pathSegments = location.pathname.split("/").filter(Boolean)
              const section = pathSegments[0] || ""
              const sectionLabel = formatRouteTitle(section)
              const selectedPath = sectionPages.some((p: any) => p.path === location.pathname)
                ? location.pathname
                : sectionPages[0]?.path
              const selectedLabel = sectionPages.find((p: any) => p.path === selectedPath)?.label || pageInfo.title

              return (
                <Box sx={{ display: "flex", alignItems: "center", ml: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1.2 }}>
                    {sectionLabel} -{" "}
                  </Typography>
                  <FormControl
                    variant="standard"
                    sx={{
                      minWidth: 0,
                      width: "fit-content",
                      maxWidth: 360,
                      flex: "0 1 auto",
                    }}
                  >
                    <Select
                      value={selectedPath}
                      onChange={(e) => {
                        const next = String(e.target.value)
                        if (next && next !== location.pathname) navigate(next)
                      }}
                      IconComponent={ArrowDropDown as any}
                      disableUnderline
                      renderValue={() => (
                        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            component="span"
                            sx={{
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 320,
                              lineHeight: 1.2,
                            }}
                          >
                            {selectedLabel}
                          </Typography>
                        </Box>
                      )}
                      sx={{
                        color: "inherit",
                        width: "fit-content",
                        maxWidth: "100%",
                        "& .MuiSelect-select": {
                          display: "inline-flex",
                          alignItems: "center",
                          width: "auto !important",
                          maxWidth: "100%",
                          minWidth: 0,
                          pr: "22px !important",
                          py: 0,
                          minHeight: "unset",
                        },
                        "& .MuiSelect-icon": {
                          color: "inherit",
                          right: 0,
                        },
                      }}
                      MenuProps={{ PaperProps: { sx: { minWidth: 280, maxHeight: 420 } } }}
                    >
                      {sectionPages.map((option: any) => (
                        <MenuItem key={option.path} value={option.path}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )
            })()
          ) : (
            <Typography
              variant="subtitle1"
              component="h1"
              sx={{
                ml: 1,
                lineHeight: 1.2,
              }}
            >
              {pageInfo.title}
            </Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {state && coreContextsReady && (
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
              <LocationSelector />
            </Box>
          )}

          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <LightMode /> : <DarkMode />}
          </IconButton>

          <IconButton
            color="inherit"
            disabled={!canViewNotificationsPanel}
            onClick={(e) => setNotificationsAnchor(e.currentTarget)}
          >
            <Badge badgeContent={notificationsState.unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationsAnchor}
            open={Boolean(notificationsAnchor)}
            onClose={() => setNotificationsAnchor(null)}
            PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
          >
            <MenuItem sx={{ justifyContent: "space-between" }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Notifications
              </Typography>
              <Button size="small" disabled={!canEditNotificationsPanel} onClick={markAllAsRead}>Mark all as read</Button>
            </MenuItem>
            <Divider />
            {notificationsState.notifications.length === 0 ? (
              <MenuItem>
                <ListItemText
                  primary="No notifications"
                  secondary="You're all caught up!"
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </MenuItem>
            ) : (
              notificationsState.notifications.slice(0, 5).map((notification) => {
                const getNotificationIcon = () => {
                  switch (notification.category) {
                    case 'warning': return <Warning color="warning" fontSize="small" />
                    case 'error': return <Warning color="error" fontSize="small" />
                    case 'success': return <Inventory color="success" fontSize="small" />
                    case 'alert': return <Warning color="error" fontSize="small" />
                    default: return <Notifications color="info" fontSize="small" />
                  }
                }

                return (
                  <MenuItem 
                    key={notification.id}
                    sx={{ 
                      bgcolor: notification.read ? "transparent" : "action.hover",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      if (canEditNotificationsPanel) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon()}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.title}
                      secondary={`${notification.message} • ${new Date(notification.timestamp).toLocaleTimeString()}`}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </MenuItem>
                )
              })
            )}
            <Divider />
            <MenuItem 
              sx={{ justifyContent: "center", cursor: "pointer" }}
              onClick={() => {
                setNotificationsAnchor(null)
                navigate('/Notifications')
              }}
            >
              <Typography color="primary">View all notifications</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      {!companyState.companyID && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Alert severity="info">Select a company to get started.</Alert>
        </Box>
      )}
    </AppBar>
  )
}

export default GlobalAppBar
