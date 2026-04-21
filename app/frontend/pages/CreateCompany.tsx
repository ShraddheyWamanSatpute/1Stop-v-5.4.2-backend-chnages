"use client"

import { alpha } from "@mui/material/styles";
import React, { useState, lazy, Suspense } from "react"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  CircularProgress,
  Typography
} from "@mui/material"
import {
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material"

// Lazy load components to improve tab switching performance
const CreateCompanyInfo = lazy(() => import("./company/CreateCompanyInfo"))
const CreateSiteManagement = lazy(() => import("./company/CreateSiteManagement"))

const CreateCompany: React.FC = () => {
  const theme = useTheme()
  const [tabValue, setTabValue] = useState(0)

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Define tabs
  const tabs = [
    {
      label: "Company Info",
      icon: <BusinessIcon />,
      path: "/CreateCompany/Info",
    },
    {
      label: "Site Management",
      icon: <LocationOnIcon />,
      path: "/CreateCompany/SiteManagement",
    }
  ]

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <Box sx={{ p: 3, mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Company
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set up your company information and add sites to get started.
        </Typography>
      </Box>

      <Paper 
        sx={{ 
          borderBottom: 1, 
          borderColor: "divider",
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(8px)",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="create company tabs"
          sx={{
            px: 2,
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.path}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{
                "&.Mui-selected": {
                  color: theme.palette.primary.main,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
          {tabValue === 0 && <CreateCompanyInfo />}
          {tabValue === 1 && <CreateSiteManagement />}
        </Suspense>
      </Box>
    </Box>
  )
}

export default CreateCompany
