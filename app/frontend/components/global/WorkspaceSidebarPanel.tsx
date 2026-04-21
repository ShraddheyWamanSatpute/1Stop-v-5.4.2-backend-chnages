"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import {
  AccountBalance,
  Business,
  CalendarMonth,
  Category,
  ChevronLeft,
  Contacts,
  CurrencyExchange,
  Dashboard,
  History,
  Inventory,
  LocalShipping,
  Message,
  People,
  PointOfSale,
  ReceiptLong,
  Rule,
  Settings,
  ShoppingCart,
  Star,
  StarBorder,
  Tune,
} from "@mui/icons-material"
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../backend/context/AppTheme"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { useWorkspaceNavigation } from "../../context/WorkspaceNavigationContext"
import { getCompanyLayout, type ModuleKey } from "../../layouts/companyLayout"
import { buildShortcutHref, type WorkspaceShortcut, type WorkspaceShortcutIcon } from "../../utils/workspaceShortcuts"
import { getNavigationPermissionTarget, normalizeSidebarSectionVisibility } from "../../utils/workspaceNavigationVisibility"

interface WorkspaceSidebarPanelProps {
  drawerWidth: number
}

function getShortcutIcon(icon?: WorkspaceShortcutIcon) {
  switch (icon) {
    case "dashboard":
      return <Dashboard fontSize="small" />
    case "finance":
    case "account":
    case "bank":
    case "budget":
      return <AccountBalance fontSize="small" />
    case "contact":
      return <Contacts fontSize="small" />
    case "currency":
      return <CurrencyExchange fontSize="small" />
    case "stock":
    case "product":
    case "stockCount":
    case "parLevel":
      return <Inventory fontSize="small" />
    case "purchaseOrder":
      return <ShoppingCart fontSize="small" />
    case "bill":
    case "invoice":
    case "journal":
      return <ReceiptLong fontSize="small" />
    case "rule":
      return <Rule fontSize="small" />
    case "transfer":
      return <Tune fontSize="small" />
    case "company":
      return <Business fontSize="small" />
    case "settings":
      return <Settings fontSize="small" />
    case "bookings":
      return <CalendarMonth fontSize="small" />
    case "hr":
      return <People fontSize="small" />
    case "messenger":
      return <Message fontSize="small" />
    case "pos":
      return <PointOfSale fontSize="small" />
    case "supply":
      return <LocalShipping fontSize="small" />
    case "favorites":
      return <Star fontSize="small" />
    case "recents":
      return <History fontSize="small" />
    default:
      return <Category fontSize="small" />
  }
}

function formatRecentTimestamp(timestamp?: number) {
  if (!timestamp) return ""
  return new Date(timestamp).toLocaleString()
}

function WorkspaceShortcutRow({
  shortcut,
  favorite,
  onToggleFavorite,
  onOpen,
}: {
  shortcut: WorkspaceShortcut
  favorite: boolean
  onToggleFavorite: (shortcut: WorkspaceShortcut) => void
  onOpen: (shortcut: WorkspaceShortcut) => void
}) {
  const theme = useTheme()

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => onOpen(shortcut)}
        sx={{
          minHeight: 56,
          alignItems: "center",
          px: 2.5,
          py: 1,
          "&:hover": {
            backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: 1.75,
            justifyContent: "center",
            color: themeConfig.brandColors.offWhite,
          }}
        >
          {getShortcutIcon(shortcut.icon)}
        </ListItemIcon>
        <ListItemText
          primary={shortcut.label}
          secondary={shortcut.recentAt ? formatRecentTimestamp(shortcut.recentAt) : shortcut.description}
          primaryTypographyProps={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: themeConfig.brandColors.offWhite,
          }}
          secondaryTypographyProps={{
            fontSize: "0.75rem",
            sx: { color: alpha(themeConfig.brandColors.offWhite, 0.7), mt: 0.25 },
          }}
          sx={{
            my: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        />
        <Tooltip title={favorite ? "Remove from favorites" : "Add to favorites"}>
          <IconButton
            edge="end"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(shortcut)
            }}
            sx={{
              ml: 1,
              alignSelf: "center",
              color: favorite ? theme.palette.warning.light : alpha(themeConfig.brandColors.offWhite, 0.72),
            }}
          >
            {favorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}

const WorkspaceSidebarPanel: React.FC<WorkspaceSidebarPanelProps> = ({ drawerWidth }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { state: settingsState } = useSettings()
  const { getUserPermissions, hasPermission, state: companyState } = useCompany()
  const { activePanel, closePanel, favorites, isFavorite, recents, toggleFavorite } = useWorkspaceNavigation()
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [displayPanel, setDisplayPanel] = React.useState<typeof activePanel>(activePanel)
  const isOpen = Boolean(activePanel)
  const layout = React.useMemo(
    () => getCompanyLayout(companyState?.company?.companyType),
    [companyState?.company?.companyType],
  )
  const effectivePermissions = getUserPermissions?.()
  const sidebarVisibility = React.useMemo(
    () => normalizeSidebarSectionVisibility((settingsState.settings?.preferences as any)?.sidebarSections),
    [settingsState.settings?.preferences],
  )
  const isSuperAdmin = Boolean((settingsState.user as any)?.isAdmin)
  const isAdminStaff = Boolean((settingsState.user as any)?.adminStaff?.active)
  const supportViewMode = (() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
    } catch {
      return false
    }
  })()

  React.useEffect(() => {
    if (!activePanel) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      if (panelRef.current?.contains(target)) {
        return
      }

      if (target.closest("[data-workspace-panel-trigger]")) {
        return
      }

      closePanel()
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [activePanel, closePanel])

  React.useEffect(() => {
    if (activePanel) {
      setDisplayPanel(activePanel)
    }
  }, [activePanel])

  const canAccessShortcut = React.useCallback(
    (shortcut: WorkspaceShortcut) => {
      const target = getNavigationPermissionTarget(shortcut.path)

      if (target.alwaysVisible) {
        return true
      }

      if (target.sectionKey && sidebarVisibility[target.sectionKey] === false) {
        return false
      }

      if (target.moduleKey && layout.disabledModules.has(target.moduleKey as ModuleKey)) {
        return false
      }

      if (target.sectionKey === "supply" && !layout.enabledFeatures.has("supply")) {
        return false
      }

      if (isSuperAdmin || (isAdminStaff && supportViewMode)) {
        return true
      }

      if (companyState?.loading) {
        return true
      }

      if (!target.moduleKey) {
        return true
      }

      if (!target.pageKey) {
        const modulePermissions = (effectivePermissions as any)?.modules?.[target.moduleKey]
        if (!modulePermissions) return false
        return Object.values(modulePermissions).some((page: any) => Boolean(page?.view))
      }

      return hasPermission(target.moduleKey, target.pageKey, "view")
    },
    [companyState?.loading, effectivePermissions, hasPermission, isAdminStaff, isSuperAdmin, layout, sidebarVisibility, supportViewMode],
  )

  const panelWidth = 240
  const panel = activePanel ?? displayPanel
  const title = panel === "recents" ? "Recents" : "Favorites"
  const items = React.useMemo(
    () => (panel === "recents" ? recents : favorites).filter(canAccessShortcut),
    [canAccessShortcut, favorites, panel, recents],
  )
  const emptyMessage =
    panel === "recents"
      ? "Leave a supported form open and switch pages to keep it here."
      : "Star pages or forms from Settings or Recents to build your shortlist."

  return (
    <Box
      ref={panelRef}
      data-workspace-panel-root="true"
        sx={{
          position: "fixed",
          top: 64,
          left: drawerWidth,
          bottom: 0,
          width: panelWidth,
          zIndex: 10990,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${alpha(themeConfig.brandColors.offWhite, 0.1)}`,
        backgroundColor: themeConfig.brandColors.navy,
        color: themeConfig.brandColors.offWhite,
        overflow: "hidden",
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateX(0)" : "translateX(-18px)",
        pointerEvents: isOpen ? "auto" : "none",
        boxShadow: isOpen ? `10px 0 28px ${alpha(theme.palette.common.black, 0.18)}` : "none",
        transition: theme.transitions.create(["opacity", "transform", "box-shadow"], {
          easing: theme.transitions.easing.easeInOut,
          duration: theme.transitions.duration.standard,
        }),
      }}
    >
      {panel ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 2,
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateX(0)" : "translateX(-10px)",
              transition: theme.transitions.create(["opacity", "transform"], {
                easing: theme.transitions.easing.easeInOut,
                duration: theme.transitions.duration.standard,
              }),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {panel === "recents" ? <History fontSize="small" /> : <Star fontSize="small" />}
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            </Box>
            <IconButton
              onClick={closePanel}
              size="small"
              sx={{
                color: themeConfig.brandColors.offWhite,
                backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                "&:hover": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.18),
                },
              }}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Box>

          <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />

          {items.length === 0 ? (
            <Box
              sx={{
                px: 2.5,
                py: 3,
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateX(0)" : "translateX(-10px)",
                transition: theme.transitions.create(["opacity", "transform"], {
                  easing: theme.transitions.easing.easeInOut,
                  duration: theme.transitions.duration.standard,
                }),
              }}
            >
              <Typography variant="body2" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.72), lineHeight: 1.6 }}>
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            <List
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                py: 0.5,
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateX(0)" : "translateX(-10px)",
                transition: theme.transitions.create(["opacity", "transform"], {
                  easing: theme.transitions.easing.easeInOut,
                  duration: theme.transitions.duration.standard,
                }),
              }}
            >
              {items.map((shortcut) => (
                <WorkspaceShortcutRow
                  key={shortcut.key}
                  shortcut={shortcut}
                  favorite={isFavorite(shortcut)}
                  onToggleFavorite={toggleFavorite}
                  onOpen={(selectedShortcut) => {
                    navigate(buildShortcutHref(selectedShortcut))
                    closePanel()
                  }}
                />
              ))}
            </List>
          )}
        </>
      ) : null}
    </Box>
  )
}

export default WorkspaceSidebarPanel
