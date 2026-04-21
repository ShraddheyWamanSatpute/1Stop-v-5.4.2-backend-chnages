"use client"

import { alpha } from "@mui/material/styles";
import React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  CircularProgress,
  Typography,
} from "@mui/material"
import {
  Assignment as RunsheetIcon,
  ShoppingCart as PreordersIcon,
  TableRestaurant as TableTrackingIcon,
  MenuBook as MenuIcon,
  StickyNote2 as NotesIcon,
  Upload as UploadIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useBookings } from "../../../backend/context/BookingsContext"

// Import Floor Friend components
import {
  FloorFriendRunsheet,
  FloorFriendPreorders,
  FloorFriendTableTracking,
  FloorFriendMenus,
  FloorFriendNotes,
  FloorFriendExcelUpload,
} from '../../components/floorfriend'

const FloorFriend: React.FC = () => {
  const theme = useTheme()
  const { state: companyState, hasPermission } = useCompany()
  const bookingsContext = useBookings()
  
  const [tabValue, setTabValue] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])

  // Load bookings data when component mounts
  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      setIsLoading(true)
      // Use the correct method from BookingsContext with required parameters
      if (bookingsContext.fetchBookings) {
        bookingsContext.fetchBookings()
          .finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    }
  }, [companyState.companyID, companyState.selectedSiteID, bookingsContext])

  // Update local bookings when context changes
  useEffect(() => {
    // Access bookings through the state property (assuming it exists in the actual context)
    // For now, we'll use an empty array as fallback
    setBookings([])
  }, [])

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Check if user has permission for a specific section
  const checkPermission = (permission: string): boolean => {
    try {
      // Split permission string like "bookings.view" into section and action
      const [section, action = "view"] = permission.split(".")
      // Cast action to the expected type
      const validAction = action as "view" | "edit" | "delete"
      return hasPermission(section, "", validAction)
    } catch (error) {
      console.warn(`Permission check failed for ${permission}:`, error)
      return false
    }
  }

  // Define tabs with their permissions
  const tabs = [
    { 
      id: "runsheet", 
      label: "Runsheet", 
      icon: <RunsheetIcon />, 
      permission: "bookings.view" 
    },
    { 
      id: "preorders", 
      label: "Preorders", 
      icon: <PreordersIcon />, 
      permission: "bookings.view" 
    },
    { 
      id: "tabletracking", 
      label: "Table Tracking", 
      icon: <TableTrackingIcon />, 
      permission: "bookings.view" 
    },
    { 
      id: "menus", 
      label: "Menus", 
      icon: <MenuIcon />, 
      permission: "pos.view" 
    },
    { 
      id: "notes", 
      label: "Manager Notes", 
      icon: <NotesIcon />, 
      permission: "company.view" 
    },
    { 
      id: "upload", 
      label: "Excel Upload", 
      icon: <UploadIcon />, 
      permission: "bookings.edit" 
    },
  ]

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(tab => checkPermission(tab.permission))

  // Show message if no tabs are visible due to permissions
  if (visibleTabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access any Floor Friend features.
          <br />
          Please contact your administrator for access.
        </Typography>
      </Box>
    )
  }

  // Show message if no company/site selected
  if (!companyState.companyID || !companyState.selectedSiteID) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Floor Friend
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Please select a company and site to access Floor Friend features.
        </Typography>
      </Box>
    )
  }

  // Render tab content
  const renderTabContent = () => {
    const currentTab = visibleTabs[tabValue]
    if (!currentTab) return null

    switch (currentTab.id) {
      case "runsheet":
        return <FloorFriendRunsheet bookings={bookings} />
      case "preorders":
        return <FloorFriendPreorders bookings={bookings} />
      case "tabletracking":
        return <FloorFriendTableTracking bookings={bookings} />
      case "menus":
        return <FloorFriendMenus />
      case "notes":
        return <FloorFriendNotes />
      case "upload":
        return <FloorFriendExcelUpload onDataUploaded={() => {
          // Refresh bookings after upload
          if (bookingsContext.fetchBookings && companyState.companyID && companyState.selectedSiteID) {
            bookingsContext.fetchBookings()
          }
        }} />
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography>Tab content not implemented</Typography>
          </Box>
        )
    }
  }

  return (
    <Box sx={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Floor Friend
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive restaurant floor management tool
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            },
          }}
        >
          {visibleTabs.map((tab, _index) => (
            <Tab
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{
                "&.Mui-selected": {
                  color: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          renderTabContent()
        )}
      </Box>
    </Box>
  )
}

export default FloorFriend
