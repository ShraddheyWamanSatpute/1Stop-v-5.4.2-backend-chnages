"use client"

import React, { useMemo, useState } from "react"
import { Box, IconButton, Paper, Tab, Tabs, Typography } from "@mui/material"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material"
import { useCompany } from "../../backend/context/CompanyContext"
import { areDependenciesReady } from "../../backend/utils/ContextDependencies"
import { useSettings } from "../../backend/context/SettingsContext"
import { SupplyProvider } from "../../backend/context/SupplyContext"
import { themeConfig } from "../../theme/AppTheme"
import SupplyClients from "./supply/SupplyClients"
import SupplyClientInvite from "./supply/SupplyClientInvite"
import SupplyOrders from "./supply/SupplyOrders"
import SupplyDeliveries from "./supply/SupplyDeliveries"
import SupplyDashboard from "./supply/SupplyDashboard"
import SupplyReports from "./supply/SupplyReports"
import SupplySettingsPage from "./supply/SupplySettings"
import usePersistentBoolean from "../hooks/usePersistentBoolean"

const Supply: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { state: companyState, hasPermission } = useCompany()
  const { state: settingsState } = useSettings()

  const coreReady = areDependenciesReady(settingsState, companyState)
  const [isTabsExpanded, setIsTabsExpanded] = usePersistentBoolean("app:ui:section-tabs-expanded", true)
  const toggleTabsExpanded = () => {
    setIsTabsExpanded(!isTabsExpanded)
  }

  const tabs = useMemo(
    () => [
      {
        label: "Dashboard",
        to: "/Supply/Dashboard",
        route: "Dashboard",
        key: "dashboard",
        icon: <DashboardIcon />,
        permission: hasPermission("supply", "dashboard", "view"),
      },
      {
        label: "Clients",
        to: "/Supply/Clients",
        route: "Clients",
        key: "clients",
        icon: <PeopleIcon />,
        permission: hasPermission("supply", "clients", "view"),
      },
      {
        label: "Orders",
        to: "/Supply/Orders",
        route: "Orders",
        key: "orders",
        icon: <ShoppingCartIcon />,
        permission: hasPermission("supply", "orders", "view"),
      },
      {
        label: "Deliveries",
        to: "/Supply/Deliveries",
        route: "Deliveries",
        key: "deliveries",
        icon: <LocalShippingIcon />,
        permission: hasPermission("supply", "deliveries", "view"),
      },
      {
        label: "Reports",
        to: "/Supply/Reports",
        route: "Reports",
        key: "reports",
        icon: <BarChartIcon />,
        permission: hasPermission("supply", "reports", "view"),
      },
      {
        label: "Settings",
        to: "/Supply/Settings",
        route: "Settings",
        key: "settings",
        icon: <SettingsIcon />,
        permission: hasPermission("supply", "settings", "view"),
      },
    ],
    [hasPermission],
  )

  const visibleTabs = useMemo(() => tabs.filter((tab) => tab.permission), [tabs])
  const defaultRoute = visibleTabs[0]?.route || "Dashboard"
  const canViewClients = tabs.find((tab) => tab.key === "clients")?.permission ?? false

  const activeKey = (() => {
    const seg = (location.pathname.split("/")[2] || "").toLowerCase()
    if (!seg) return visibleTabs[0]?.key.toLowerCase() || "dashboard"
    return seg
  })()

  const activeTab = Math.max(0, visibleTabs.findIndex((t) => t.key.toLowerCase() === activeKey))

  const handleTabChange = (newTab: number) => {
    const target = visibleTabs[newTab]
    if (!target) return
    navigate(target.to)
  }

  if (!coreReady) {
    return <Box sx={{ height: "100vh", bgcolor: "background.default" }} />
  }

  if (!visibleTabs.length) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Typography color="text.secondary">You do not currently have access to any Supply pages.</Typography>
      </Box>
    )
  }

  return (
    <SupplyProvider>
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
              value={activeTab}
              onChange={(_e, val: number) => handleTabChange(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 2,
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
              {visibleTabs.map((t) => (
                <Tab key={t.key} icon={t.icon} label={t.label} />
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

        <Box sx={{ flexGrow: 1, overflow: "auto", width: "100%" }}>
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />

            {tabs.find((tab) => tab.key === "dashboard")?.permission && (
              <Route path="Dashboard" element={<SupplyDashboard />} />
            )}
            {tabs.find((tab) => tab.key === "clients")?.permission && (
              <Route path="Clients" element={<SupplyClients />} />
            )}
            {canViewClients && <Route path="ClientInvite" element={<SupplyClientInvite />} />}
            {tabs.find((tab) => tab.key === "orders")?.permission && (
              <Route path="Orders" element={<SupplyOrders />} />
            )}
            {tabs.find((tab) => tab.key === "orders")?.permission && (
              <Route path="LegacyOrders" element={<Navigate to="/Supply/Orders" replace />} />
            )}
            {tabs.find((tab) => tab.key === "deliveries")?.permission && (
              <Route path="Deliveries" element={<SupplyDeliveries />} />
            )}
            {tabs.find((tab) => tab.key === "reports")?.permission && (
              <Route path="Reports" element={<SupplyReports />} />
            )}
            {tabs.find((tab) => tab.key === "settings")?.permission && (
              <Route path="Settings" element={<SupplySettingsPage />} />
            )}

            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </Box>
      </Box>
    </SupplyProvider>
  )
}

export default Supply

