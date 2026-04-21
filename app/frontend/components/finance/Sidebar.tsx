import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useLocation, Link } from "react-router-dom"
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
} from "@mui/material"
import {
  Dashboard as DashboardIcon,
  AccountBalance,
  Receipt,
  ShoppingCart,
  AttachMoney,
  People,
  Calculate,
  Assessment,
  Language,
  TrendingUp,
} from "@mui/icons-material"

interface SidebarItem {
  name: string
  path: string
  icon: React.ComponentType
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  { name: "Dashboard", path: "/", icon: DashboardIcon },
  { name: "Banking", path: "/banking", icon: AccountBalance },
  { name: "Sales", path: "/sales", icon: Receipt, badge: "12" },
  { name: "Purchases", path: "/purchases", icon: ShoppingCart, badge: "5" },
  { name: "Expenses", path: "/expenses", icon: AttachMoney },
  { name: "Contacts", path: "/contacts", icon: People },
  { name: "Accounting", path: "/accounting", icon: Calculate },
  { name: "Reports", path: "/reports", icon: Assessment },
  { name: "Multi-Currency", path: "/currency", icon: Language, badge: "Pro" },
  { name: "Budgeting", path: "/budgeting", icon: TrendingUp, badge: "Pro" },
]

const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 280,
          boxSizing: "border-box",
          backgroundColor: "background.default",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" sx={{ color: "white", fontWeight: "bold" }}>
          FinanceFlow Pro
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Acme Corporation
        </Typography>
      </Box>

      <List sx={{ px: 2 }}>
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: 2,
                  color: isActive ? themeConfig.brandColors.offWhite : "text.secondary",
                  backgroundColor: isActive ? "action.selected" : "transparent",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    color: "text.primary",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.75rem",
                      backgroundColor: item.badge === "Pro" ? themeConfig.brandColors.offWhite : themeConfig.brandColors.navy,
                      color: "common.white",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Drawer>
  )
}

export default Sidebar
