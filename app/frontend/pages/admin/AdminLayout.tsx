import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
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
  Business as BusinessIcon,
  AdminPanelSettings as StaffIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useSettings } from "../../../backend/context/SettingsContext";
import { hasAdminPageAccess } from "./AdminAccess";

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const theme = useTheme();
  const { state: settingsState, logout } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const drawerWidth = sidebarOpen ? 240 : 72;

  const navItems = useMemo(
    () =>
      [
        { key: "dashboard", label: "Home", path: "/Admin", icon: <DashboardIcon /> },
        { key: "crm", label: "CRM", path: "/Admin/CRM", icon: <CRMIcon /> },
        { key: "tasks", label: "Tasks", path: "/Admin/Tasks", icon: <TasksIcon /> },
        { key: "calendar", label: "Calendar", path: "/Admin/Calendar", icon: <CalendarIcon /> },
        { key: "viewer", label: "View", path: "/Admin/Viewer", icon: <ViewIcon /> },
        { key: "social", label: "Socials", path: "/Admin/Social", icon: <SocialIcon /> },
        { key: "email", label: "Emails", path: "/Admin/Email", icon: <EmailIcon /> },
        { key: "createCompany", label: "Companies", path: "/Admin/CreateCompany", icon: <BusinessIcon /> },
        { key: "staff", label: "Staff", path: "/Admin/Staff", icon: <StaffIcon /> },
      ] as const,
    [],
  );

  const visibleNavItems = useMemo(() => {
    const user = settingsState.user as any;
    return navItems.filter((i) => hasAdminPageAccess(user, i.key as any));
  }, [navItems, settingsState.user]);

  const headerLabel = useMemo(() => {
    const path = location.pathname || ""
    const params = new URLSearchParams(location.search || "")

    // Tab-aware pages
    if (path.startsWith("/Admin/Tasks")) {
      const tab = (params.get("tab") || "").toLowerCase()
      if (tab === "projects") return "Projects"
      if (tab === "fields") return "Task Fields"
      return "Tasks"
    }

    if (path.startsWith("/Admin/CRM")) {
      const tab = (params.get("tab") || "").toLowerCase()
      if (tab === "clients") return "Clients"
      if (tab === "contacts") return "Contacts"
      if (tab === "fields") return "CRM Fields"
      return "CRM"
    }

    if (path.startsWith("/Admin/Staff")) {
      const tab = (params.get("tab") || "").toLowerCase()
      if (tab === "createadmin") return "Create Admin"
      if (tab === "contacts") return "Staff Contacts"
      return "Staff"
    }

    if (path.startsWith("/Admin/Social")) {
      const tab = (params.get("tab") || "").toLowerCase()
      if (tab === "settings") return "Social Settings"
      return "Social Posts"
    }

    // Non-sidebar admin pages
    if (path.startsWith("/Admin/Profile")) return "Profile"
    if (path.startsWith("/Admin/Referrals")) return "Referrals"

    // Sidebar pages (best-effort by path)
    const match = navItems.find((i) => path === i.path || (i.path !== "/Admin" && path.startsWith(`${i.path}/`)))
    return match?.label || "Admin"
  }, [location.pathname, location.search, navItems])

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
    (settingsState.user as any)?.displayName ||
    `${(settingsState.user as any)?.firstName || ""} ${(settingsState.user as any)?.lastName || ""}`.trim() ||
    settingsState.auth?.email ||
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
              duration: theme.transitions.duration.enteringScreen,
            }),
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
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
            onClick={() => navigate("/Admin")}
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
                src={`${(import.meta.env.BASE_URL || '/app/').replace(/\/$/, '')}/logo.png`}
                alt="1 Stop Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  // Fallback if logo doesn't load
                  e.currentTarget.src = '/app/logo.png'
                }}
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
              color: theme.palette.primary.contrastText,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

        <List sx={{ flexGrow: 1, py: 1 }}>
          {visibleNavItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/Admin" && location.pathname.startsWith(`${item.path}/`));
            return (
              <ListItem key={item.path} disablePadding>
                <Tooltip title={sidebarOpen ? "" : item.label} placement="right">
                  <ListItemButton
                    selected={isActive}
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: sidebarOpen ? "initial" : "center",
                      px: 2.5,
                      "&.Mui-selected": {
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.25)" },
                      },
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarOpen ? 3 : "auto",
                        justifyContent: "center",
                        color: theme.palette.primary.contrastText,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} sx={{ opacity: sidebarOpen ? 1 : 0 }} />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

        <Box sx={{ p: 1.5 }}>
          <Tooltip title={sidebarOpen ? "" : "Logout"} placement="right">
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                justifyContent: sidebarOpen ? "flex-start" : "center",
                minWidth: 0,
                color: theme.palette.primary.contrastText,
                borderColor: "rgba(255,255,255,0.6)",
                "&:hover": { borderColor: "rgba(255,255,255,0.9)", bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              {sidebarOpen ? "Logout" : null}
            </Button>
          </Tooltip>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.main" }}>
          <Toolbar sx={{ gap: 2 }}>
            <Box onClick={() => navigate("/Admin")} sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1, overflow: "hidden" }}>
                <img 
                  src={`${(import.meta.env.BASE_URL || '/app/').replace(/\/$/, '')}/logo.png`} 
                  alt="1 Stop" 
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    // Fallback if logo doesn't load
                    e.currentTarget.src = '/app/logo.png'
                  }}
                />
              </Box>
              <Typography fontWeight={800} sx={{ userSelect: "none", color: "primary.contrastText" }}>
                Admin • {headerLabel}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
              <Tooltip title="QR / Referrals">
                <IconButton
                  onClick={() => navigate("/Admin/Referrals")}
                  sx={{
                    color: theme.palette.primary.contrastText,
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.22)" },
                  }}
                >
                  <QrIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Tooltip title="Profile">
              <IconButton onClick={() => navigate("/Admin/Profile")} size="small">
                <Avatar sx={{ width: 32, height: 32 }}>
                  {String(userLabel || "A").slice(0, 1).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
