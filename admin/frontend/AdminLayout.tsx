import { alpha } from "@mui/material/styles";
import React, { useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Toolbar,
  Typography,
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
  Button,
  TextField,
  useTheme,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Contacts as CRMIcon,
  Assignment as TasksIcon,
  CalendarMonth as CalendarIcon,
  Visibility as ViewIcon,
  Campaign as SocialIcon,
  Email as EmailIcon,
  QrCode2 as QrIcon,
  AdminPanelSettings as StaffIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  Analytics as AnalyticsIcon,
  IntegrationInstructions as IntegrationIcon,
  Build as OpsIcon,
} from "@mui/icons-material";
import { useAdmin } from "../backend/context/AdminContext";
import { themeConfig } from "../../app/backend/context/AppTheme";
import { hasAdminPageAccess } from "../backend/AdminAccess";
import { SessionPersistence } from "../../app/frontend/utils/sessionPersistence";
import SectionLoadingScreen from "./components/SectionLoadingScreen";
import { db, onValue, ref } from "../backend/services/Firebase";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const baseUrl = (((import.meta as any).env?.BASE_URL as string) || "/").replace(/\/?$/, "/");
const logoSrc = `${baseUrl}images/logo.png`;

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const theme = useTheme();
  const { state, logout } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const contentScrollRef = useRef<HTMLDivElement | null>(null)

  // Admin router uses basename="/Admin". Strip any accidental "/Admin" prefix so we can
  // compare and navigate using router-relative paths (prevents "/Admin/Admin/...").
  const normPath = React.useCallback((p: string) => {
    const stripped = (p || "").replace(/^\/Admin/i, "")
    return stripped === "" ? "/" : stripped
  }, [])

  // IMPORTANT: Hooks must run unconditionally. AdminLayout can render while auth is loading,
  // so we must declare stateful hooks before any early returns (to avoid hook order changes).
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Match main App sidebar widths (expanded 240, collapsed 64)
  const drawerWidth = sidebarOpen ? 240 : 64;

  const isViewerRoute = useMemo(() => {
    const path = normPath(location.pathname || "")
    return path.toLowerCase().startsWith("/viewer")
  }, [location.pathname, normPath])

  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    try {
      return (
        SessionPersistence.getSessionState().companyID ||
        localStorage.getItem("selectedCompanyID") ||
        localStorage.getItem("companyID") ||
        ""
      )
    } catch {
      return ""
    }
  })

  React.useEffect(() => {
    const syncFromStorage = () => {
      try {
        const nextCompanyId =
          SessionPersistence.getSessionState().companyID ||
          localStorage.getItem("selectedCompanyID") ||
          localStorage.getItem("companyID") ||
          ""
        setSelectedCompanyId((current) => (current === nextCompanyId ? current : nextCompanyId))
      } catch {
        // ignore
      }
    }

    window.addEventListener("storage", syncFromStorage)
    window.addEventListener("admin-company-changed", syncFromStorage)
    return () => {
      window.removeEventListener("storage", syncFromStorage)
      window.removeEventListener("admin-company-changed", syncFromStorage)
    }
  }, [])

  // Load companies for viewer autocomplete (from RTDB /companies)
  React.useEffect(() => {
    if (!isViewerRoute) return
    // CRM "Companies" tab currently reads from /companies (AdminCompanies.tsx).
    // If you later store a dedicated CRM companies node, we also merge `admin/crm/companies` (preferred).
    const toRows = (val: any) =>
      Object.entries(val || {}).map(([id, raw]: any) => ({
        id,
        name: raw?.companyName || raw?.name || raw?.legalName || "Untitled",
      }))

    const crmRef = ref(db, "admin/crm/companies")
    const companiesRef = ref(db, "companies")

    let crmVal: any = null
    let baseVal: any = null

    const recompute = () => {
      const crmRows = toRows(crmVal)
      const baseRows = toRows(baseVal)
      const map = new Map<string, { id: string; name: string }>()
      // Prefer CRM node if present
      baseRows.forEach((r: any) => map.set(r.id, r))
      crmRows.forEach((r: any) => map.set(r.id, r))
      const rows = Array.from(map.values()).filter((r) => r.id && r.name)
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setCompanies(rows)
    }

    const unsubCrm = onValue(crmRef, (snap) => {
      crmVal = snap.val() || {}
      recompute()
    })
    const unsubBase = onValue(companiesRef, (snap) => {
      baseVal = snap.val() || {}
      recompute()
    })

    return () => {
      unsubCrm()
      unsubBase()
    }
  }, [isViewerRoute])

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null
    return companies.find((c) => c.id === selectedCompanyId) || null
  }, [companies, selectedCompanyId])

  const setCompanySelection = (company: { id: string; name: string } | null) => {
    const id = company?.id || ""
    const name = company?.name || ""
    setSelectedCompanyId(id)
    try {
      if (id) {
        SessionPersistence.setActiveCompany(id, name || undefined)
        localStorage.setItem("companyId", id)
      } else {
        SessionPersistence.setActiveCompany(undefined)
        localStorage.removeItem("selectedCompanyID")
        localStorage.removeItem("companyID")
        localStorage.removeItem("companyId")
        localStorage.removeItem("selectedCompanyName")
        localStorage.removeItem("selectedSiteID")
        localStorage.removeItem("selectedSiteName")
        localStorage.removeItem("selectedSubsiteID")
        localStorage.removeItem("selectedSubsiteName")
        localStorage.removeItem("siteId")
        localStorage.removeItem("subsiteId")
      }
    } catch {
      // ignore
    }

    // Notify AdminViewMode (same page) so it can reload the embedded iframe.
    // StorageEvent only fires in *other* tabs, so we use a custom DOM event.
    try {
      window.dispatchEvent(
        new CustomEvent("admin-company-changed", { detail: { id, name } }),
      )
    } catch {
      // ignore
    }
  }

  const navItems = useMemo(
    () =>
      [
        { key: "dashboard", label: "Home", path: "/", icon: <DashboardIcon /> },
        { key: "crm", label: "CRM", path: "/CRM/Contacts", icon: <CRMIcon /> },
        // Combined hub: Socials + Content + Marketing
        { key: "marketing", label: "Marketing", path: "/Marketing/Social", icon: <SocialIcon /> },
        { key: "tasks", label: "Organisation", path: "/Tasks/Tasks", icon: <TasksIcon /> },
        { key: "calendar", label: "Calendar", path: "/Calendar", icon: <CalendarIcon /> },
        { key: "integrations", label: "Integrations", path: "/Integrations/Dashboard", icon: <IntegrationIcon /> },
        { key: "email", label: "Emails", path: "/Email", icon: <EmailIcon /> },
        { key: "viewer", label: "View", path: "/Viewer", icon: <ViewIcon /> },
        { key: "staff", label: "Staff", path: "/Staff/Employees", icon: <StaffIcon /> },
        { key: "analytics", label: "Analytics", path: "/Analytics", icon: <AnalyticsIcon /> },
        { key: "ops", label: "Ops", path: "/Ops", icon: <OpsIcon /> },
      ] as const,
    [],
  );

  const visibleNavItems = useMemo(() => {
    const user = state.user as any;
    return navItems.filter((i) => {
      // Marketing hub should appear if user has ANY of the related permissions.
      if (i.key === "marketing") {
        return (
          hasAdminPageAccess(user, "marketing" as any) ||
          hasAdminPageAccess(user, "social" as any) ||
          hasAdminPageAccess(user, "content" as any)
        )
      }
      return hasAdminPageAccess(user, i.key as any)
    });
  }, [navItems, state.user]);

  const navPath = normPath(location.pathname || "")

  const sidebarNav = useMemo(() => {
    return visibleNavItems.map((item) => {
      const isActive =
        item.key === "staff"
          ? navPath === "/Staff" || navPath.startsWith("/Staff/")
          : navPath === item.path || (item.path !== "/" && navPath.startsWith(`${item.path}/`))
      return (
        <ListItem key={item.path} disablePadding>
          {sidebarOpen ? (
            <ListItemButton
              selected={isActive}
              onClick={() => navigate(item.path)}
              sx={{
                minHeight: 48,
                justifyContent: "initial",
                px: 2.5,
                "&.Mui-selected": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.15),
                  "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.25) },
                },
                "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 3,
                  justifyContent: "center",
                  color: themeConfig.brandColors.offWhite,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} sx={{ opacity: 1 }} />
            </ListItemButton>
          ) : (
            <Tooltip title={item.label} placement="right">
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: "center",
                  px: 2.5,
                  "&.Mui-selected": {
                    backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.15),
                    "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.25) },
                  },
                  "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: "auto",
                    justifyContent: "center",
                    color: themeConfig.brandColors.offWhite,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} sx={{ opacity: 0, height: 0, overflow: "hidden", m: 0 }} />
              </ListItemButton>
            </Tooltip>
          )}
        </ListItem>
      )
    })
  }, [visibleNavItems, navPath, sidebarOpen, navigate])

  const headerLabel = useMemo(() => {
    const path = normPath(location.pathname || "")
    const parts = path.replace(/\/+$/, "").split("/").filter(Boolean)
    const seg2 = String(parts[1] || "")

    // Tab-aware pages
    if (path.startsWith("/Tasks")) {
      const tab = seg2.toLowerCase()
      if (tab === "projects") return "Projects"
      if (tab === "notes") return "Notes"
      return "Organisation"
    }

    if (path.startsWith("/CRM")) {
      const tab = seg2.toLowerCase()
      if (tab === "companies") return "Companies"
      if (tab === "qr") return "QR Codes"
      if (tab === "clients") return "Clients"
      if (tab === "contacts") return "Contacts"
      if (tab === "client360") return "Client 360"
      if (tab === "pipeline") return "Pipeline"
      if (tab === "fields") return "CRM Fields"
      if (tab === "bugreports") return "Bug reports"
      return "CRM"
    }

    if (path.startsWith("/Staff")) {
      const tab = seg2.toLowerCase()
      if (tab === "positions") return "Positions"
      if (tab === "employees") return "Employees"
      return "Staff"
    }

    // Combined comms hub
    if (path.startsWith("/Marketing")) {
      const tab = seg2.toLowerCase()
      if (tab === "social") return "Socials"
      if (tab === "content") return "Content Schedule"
      if (tab === "settings") return "Marketing Settings"
      if (tab === "marketing") return "Marketing"
      return "Marketing"
    }

    if (path.startsWith("/Ops")) return "Ops"
    if (path.startsWith("/Reports")) return "Reports"
    if (path.startsWith("/Integrations")) {
      const tab = seg2
      if (!tab) return "Integrations"
      const t = tab.toLowerCase()
      const labelMap: Record<string, string> = {
        dashboard: "Dashboard",
        company: "Company",
        stock: "Stock",
        hr: "HR",
        bookings: "Bookings",
        pos: "POS",
        finance: "Finance",
        messenger: "Messenger",
        supply: "Supply",
        analytics: "Analytics",
        settings: "Settings",
      }
      const pretty = labelMap[t] || tab
      return `Integrations · ${pretty}`
    }

    // Non-sidebar admin pages
    if (path.startsWith("/Profile")) return "Profile"
    if (path.startsWith("/Referrals")) return "Referrals"
    if (path.startsWith("/Analytics")) return "Analytics"
    // Legacy (now redirected)
    if (path.startsWith("/Content")) return "Content Schedule"
    if (path.startsWith("/Social")) return "Socials"
    // Notes now lives under Organisation (legacy /Notes redirects).
    if (path.startsWith("/Notes")) return "Notes"
    if (path.startsWith("/QR")) return "QR Codes"

    // Sidebar pages (best-effort by path)
    const match = navItems.find((i) => path === i.path || (i.path !== "/" && path.startsWith(`${i.path}/`)))
    return match?.label || "Admin"
  }, [location.pathname, location.search, navItems, normPath])

  // Admin uses its own scroll container (not the window). When switching sections/routes,
  // keep navigation feeling responsive by resetting the scroll position.
  React.useEffect(() => {
    const el = contentScrollRef.current
    if (!el) return
    el.scrollTop = 0
  }, [location.pathname, location.search])

  // Show a readable error state (otherwise admin can hang forever on a loader/blank screen).
  if (state.error) {
    return (
      <Box
        sx={{
          height: "100vh",
          bgcolor: themeConfig.components.header.backgroundColor,
          color: themeConfig.brandColors.offWhite,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          gap: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" fontWeight={800}>
          Admin failed to load
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 640 }}>
          {state.error}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="contained" onClick={() => navigate("/AdminLogin")}>
            Back to Login
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Box>
      </Box>
    );
  }

  // Show loading screen when admin context is loading
  if (state.loading) {
    return <SectionLoadingScreen section="admin" />
  }

  const handleLogout = async () => {
    try {
      localStorage.removeItem("supportViewMode")
    } catch {
      // ignore
    }
    await logout()
    navigate("/AdminLogin")
  }

  const userLabel =
    (state.user as any)?.displayName ||
    `${(state.user as any)?.firstName || ""} ${(state.user as any)?.lastName || ""}`.trim() ||
    state.user?.email ||
    "Admin";

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            overflowX: "hidden",
            borderRadius: 0,
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shortest,
            }),
            backgroundColor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexDirection: sidebarOpen ? "row" : "column",
            justifyContent: sidebarOpen ? "space-between" : "center",
            padding: theme.spacing(2),
            width: "100%",
            gap: sidebarOpen ? 0 : 2,
          }}
        >
          <Box
          onClick={() => navigate("/")}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 1,
              userSelect: "none",
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
                src="/images/logo.png"
                alt="1 Stop Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Box>
            {sidebarOpen ? (
              <Typography fontWeight={800} sx={{ userSelect: "none" }}>
                1Stop
              </Typography>
            ) : null}
          </Box>

          <IconButton
            onClick={() => setSidebarOpen((p) => !p)}
            sx={{
              color: themeConfig.brandColors.offWhite,
              backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.2) },
            }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />

        <List sx={{ flexGrow: 1, py: 1 }}>{sidebarNav}</List>

        <Divider sx={{ backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1) }} />

        <Box sx={{ p: 2 }}>
          <Tooltip title={sidebarOpen ? "" : "Logout"} placement="right">
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                justifyContent: sidebarOpen ? "initial" : "center",
                "&:hover": {
                  backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.1),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen ? 2 : "auto",
                  justifyContent: "center",
                  color: alpha(themeConfig.brandColors.offWhite, 0.7),
                }}
              >
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                sx={{
                  opacity: sidebarOpen ? 1 : 0,
                  "& .MuiListItemText-primary": {
                    color: alpha(themeConfig.brandColors.offWhite, 0.7),
                    fontSize: "0.875rem",
                  },
                }}
              />
            </ListItemButton>
          </Tooltip>
        </Box>
      </Drawer>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {/* Single scroll column: top bar scrolls away with content (no fixed/sticky AppBar). */}
        <Box
          ref={contentScrollRef}
          sx={{
            flex: 1,
            overflow: "auto",
            overflowAnchor: "none",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Box
            component="header"
            sx={{
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
              bgcolor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              borderBottom: `1px solid ${alpha(themeConfig.brandColors.offWhite, 0.12)}`,
            }}
          >
            <Toolbar disableGutters sx={{ gap: 2, px: 2, minHeight: { xs: 56, sm: 64 } }}>
              <Box onClick={() => navigate("/")} sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1, overflow: "hidden" }}>
                  <img src={logoSrc} alt="1 Stop" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </Box>
                <Typography fontWeight={800} sx={{ userSelect: "none", color: themeConfig.brandColors.offWhite }}>
                  Admin • {headerLabel}
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", gap: 2, alignItems: "center" }}>
                {isViewerRoute ? (
                  <Autocomplete
                    size="small"
                    options={companies}
                    value={selectedCompany}
                    getOptionLabel={(o) => o?.name || ""}
                    onChange={(_e, v) => setCompanySelection(v)}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    sx={{ width: { xs: 220, md: 420 } }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Company"
                        placeholder="Select company…"
                        InputLabelProps={{ ...params.InputLabelProps, sx: { color: alpha(themeConfig.brandColors.offWhite, 0.8) } }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.12),
                            color: themeConfig.brandColors.offWhite,
                            "& fieldset": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.35) },
                            "&:hover fieldset": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.6) },
                          },
                          "& .MuiSvgIcon-root": { color: themeConfig.brandColors.offWhite },
                        }}
                      />
                    )}
                  />
                ) : null}
                <Tooltip title="QR / Referrals">
                  <IconButton
                    onClick={() => navigate("/Referrals")}
                    sx={{
                      color: themeConfig.brandColors.offWhite,
                      backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.12),
                      "&:hover": { backgroundColor: alpha(themeConfig.brandColors.offWhite, 0.22) },
                    }}
                  >
                    <QrIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Tooltip title="Profile">
                <IconButton onClick={() => navigate("/Profile")} size="small">
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {String(userLabel || "A").slice(0, 1).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Toolbar>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              pt: 3,
              px: 3,
              pb: 3,
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
