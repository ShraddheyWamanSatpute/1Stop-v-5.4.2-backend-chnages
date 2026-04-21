"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { GlobalLoader } from "../../backend/shared/GlobalLoader";
import Sidebar from "../components/global/Sidebar";
import MobileSidebar from "../components/global/MobileSidebar";
import GlobalAppBar from "../components/global/GlobalAppBar";
import { useThemeContext } from "../styles/ThemeProvider";
import { useSettings } from "../../backend/context/SettingsContext";
import { useCompany } from "../../backend/context/CompanyContext";
import { isSettingsReady, isCompanyReady } from "../../backend/utils/ContextDependencies";
import AutoSelectSiteOnBoot from "../components/global/AutoSelectSiteOnBoot";
import { WorkspaceNavigationProvider } from "../context/WorkspaceNavigationContext";
import WorkspaceSidebarPanel from "../components/global/WorkspaceSidebarPanel";
import usePersistentBoolean from "../hooks/usePersistentBoolean";
import { startBackgroundRoutePreloading } from "../utils/preloadAppRoutes";


const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarExpandedPref, setSidebarExpandedPref] = usePersistentBoolean("app:ui:sidebar-expanded", true);
  const [sidebarOpen, setSidebarOpen] = useState(sidebarExpandedPref);
  const { darkMode, toggleDarkMode } = useThemeContext();

  const { state: settingsState } = useSettings();
  const { state: companyState } = useCompany();
  
  // Track if core contexts are ready using state (same approach as LazyProviders)
  // This ensures we wait for contexts to be fully initialized, not just checked during render
  const [coreContextsReady, setCoreContextsReady] = useState(false);
  
  // Check if Settings and Company are ready (using useEffect to avoid race conditions)
  useEffect(() => {
    const settingsReady = isSettingsReady(settingsState);
    const companyReady = isCompanyReady(companyState, settingsState);
    const ready = settingsReady && companyReady;
    
    if (ready && !coreContextsReady) {
      setCoreContextsReady(true);
    }
  }, [settingsState, companyState, coreContextsReady]);

  useEffect(() => {
    if (!coreContextsReady) return
    return startBackgroundRoutePreloading(location.pathname)
  }, [coreContextsReady, location.pathname])

  // Calculate sidebar width for animations
  const sidebarWidth = sidebarOpen ? 240 : 64;

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
      return;
    }

    const next = !sidebarOpen;
    setSidebarOpen(next);
    setSidebarExpandedPref(next);
  };

  // Check if we're on an auth page
  const isAuthPage =
    location.pathname === "/Login" ||
    location.pathname === "/Register" ||
    location.pathname === "/ResetPassword";

  // Full-bleed routes should not get the default content padding.
  // Messenger is a "full canvas" experience that needs to occupy the whole page area
  // below the top bar and beside the sidebar.
  const isMessengerRoute = location.pathname.startsWith("/Messenger");

  // Close sidebar by default on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      return;
    }

    setSidebarOpen(sidebarExpandedPref);
  }, [isMobile, sidebarExpandedPref]);

  if (isAuthPage) {
    return (
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        <GlobalAppBar
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          sidebarWidth={sidebarWidth}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: "auto",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    );
  }

  return (
    <WorkspaceNavigationProvider>
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      {isMobile ? (
        <MobileSidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />
      ) : (
        <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />
      )}
      {!isMobile && <WorkspaceSidebarPanel drawerWidth={sidebarWidth} />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: isMessengerRoute ? "hidden" : "auto",
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isMobile ? 0 : 0,
          width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <GlobalAppBar
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          sidebarWidth={sidebarWidth}
        />
          <AutoSelectSiteOnBoot />
        <Box
          sx={{
            // Default pages keep padding; Messenger is full-bleed (no side/bottom padding).
            px: isMessengerRoute ? 0 : 3,
            pb: isMessengerRoute ? 0 : 3,
            // Space for fixed AppBar:
            // - default pages use the existing larger offset
            // - Messenger should sit flush under the bar (no extra gap)
            pt: isMessengerRoute ? { xs: 7, sm: 8 } : 11,
            // For Messenger, keep total height at 100vh and use padding-top
            // to offset the fixed AppBar. This avoids subtracting the AppBar twice.
            height: isMessengerRoute ? "100vh" : "auto",
            overflow: isMessengerRoute ? "hidden" : "visible",
            transition: theme.transitions.create("padding", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          {/* Route-level lazy() suspends here so sidebar / app bar stay interactive while a page chunk loads. */}
          <Suspense fallback={<GlobalLoader variant="inline" />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
      
    </Box>
    </WorkspaceNavigationProvider>
  );
};

export default MainLayout;
