/**
 * ESS Profile Page
 * 
 * Employee profile information:
 * - Personal details
 * - Contact information
 * - Quick links to related pages
 * - Account settings
 */

"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
  useTheme,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
    Email as EmailIcon,
    Phone as PhoneIcon,
    Work as WorkIcon,
    CalendarMonth as CalendarIcon,
    ContactPhone as EmergencyIcon,
    ChevronRight as ChevronRightIcon,
    Badge as BadgeIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Home as HomeIcon,
    CreditCard as CreditCardIcon,
    AccessTime as AccessTimeIcon,
    AccountCircle as AccountCircleIcon,
  } from "@mui/icons-material"
import { useESS } from "../../backend/context/MobileContext"
import { useSettings } from "../../../app/backend/context/SettingsContext"
import { useHR } from "../../../app/backend/context/HRContext"
// Note: HRContext is available via useHR() if direct employee updates are needed
// ESSContext already uses HRContext internally for data fetching
import { ESSSessionPersistence } from "../../backend/utils/mobileSessionPersistence"
import { getESSPath } from "../utils/mobileRouteUtils"

const ESSProfile: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { state, authState } = useESS()
  // Use same contexts as main app for data fetching and updating
  // SettingsContext: For user settings (firstName, lastName, email, phone, address, etc.)
  // HRContext: Available via ESSContext for employee data (already used internally)
  // Both contexts use the same Firebase paths and update methods as the main app
  const settingsContext = useSettings() as any
  const { state: hrState } = useHR() // Get roles from HRContext to resolve role names

  const employee = state.currentEmployee

  // Get role name from roleId (matching main app logic from EmployeeList and EmployeeSelfService)
  const getEmployeeRoleName = (): string => {
    if (!employee) return "N/A"
    
    // Check if role is already a string/name
    if (employee.role && typeof employee.role === 'string') {
      return employee.role
    }
    
    // Check if role is an object with name property
    if (employee.role && typeof employee.role === 'object' && employee.role.name) {
      return employee.role.name
    }
    
    // Get roleId (handle both roleID and roleId field names - matching main app)
    const roleId = (employee as any).roleID || employee.roleId
    
    if (!roleId || !hrState?.roles || !Array.isArray(hrState.roles)) {
      return employee.position || employee.jobTitle || "N/A"
    }
    
    // Try to find role by ID (matching EmployeeList logic)
    const role = hrState.roles.find((r: any) => r.id === roleId || (r as any).roleID === roleId)
    if (role) {
      return role.label || role.name || roleId
    }
    
    // If not found by ID, try to find by name (in case roleId is actually a name)
    const roleByName = hrState.roles.find((r: any) => 
      r.name === roleId || r.label === roleId
    )
    if (roleByName) {
      return roleByName.label || roleByName.name || roleId
    }
    
    // Fallback to position/jobTitle if role not found
    return employee.position || employee.jobTitle || roleId || "N/A"
  }

  // Format date
  const formatDate = (dateValue: string | number | undefined): string => {
    if (!dateValue) return "N/A"
    const date = new Date(dateValue)
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Handle logout
  const handleLogout = async () => {
    ESSSessionPersistence.clearSession()
    
    // Call logout from SettingsContext if available
    if (typeof settingsContext.logout === "function") {
      await settingsContext.logout()
    }
    
    navigate("/Login", { replace: true })
  }

  // Menu items for navigation - Only Emergency Contacts and Logout
  const menuItems = [
    {
      icon: <EmergencyIcon />,
      label: "Emergency Contacts",
      sublabel: "Manage contacts",
      path: getESSPath("EmergencyContacts"),
      color: theme.palette.error.main,
      onClick: () => navigate(getESSPath("EmergencyContacts")),
    },
    {
      icon: <LogoutIcon />,
      label: "Logout",
      sublabel: "Sign out of your account",
      path: "",
      color: theme.palette.error.main,
      onClick: handleLogout,
    },
  ]

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 2 },
      pb: { xs: 12, sm: 4 },
      maxWidth: "100%",
      overflowX: "hidden",
    }}>
      {/* Profile Header */}
      <Card sx={{ mb: 3, borderRadius: 3, overflow: "visible" }}>
        <CardContent sx={{ textAlign: "center", pt: 4, pb: 3 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              mx: "auto",
              mb: 2,
              bgcolor: theme.palette.primary.main,
              border: `4px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[3],
            }}
          >
            <PersonIcon sx={{ fontSize: 60, color: theme.palette.primary.contrastText }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            {employee ? `${employee.firstName} ${employee.lastName}` : "Employee"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center", flexWrap: "wrap", mb: 1 }}>
            <Chip
              icon={<WorkIcon />}
              label={employee?.department || "Department"}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<BadgeIcon />}
              label={getEmployeeRoleName()}
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Personal Information - Detailed View */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Personal Information
          </Typography>
          <List disablePadding>
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <EmailIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Email"
                secondary={employee?.email || authState.userId || "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PhoneIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Phone"
                secondary={employee?.phone || "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CalendarIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Date of Birth"
                secondary={employee?.dateOfBirth ? formatDate(employee.dateOfBirth) : "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HomeIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Address"
                secondary={
                  employee?.address
                    ? `${employee.address.street}, ${employee.address.city}, ${employee.address.zipCode || ""}`
                    : employee?.city
                    ? `${employee.city}, ${employee.zip || ""}`
                    : "Not provided"
                }
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CreditCardIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="National Insurance"
                secondary={employee?.nationalInsuranceNumber || "Not provided"}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Employment Information
      </Typography>
          <List disablePadding>
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <BadgeIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Employee ID"
                secondary={employee?.employeeID || employee?.id || "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <WorkIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Role"
                secondary={getEmployeeRoleName()}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <WorkIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Department"
                secondary={employee?.department || "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AccountCircleIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Employment Type"
                secondary={employee?.employmentType || (employee?.isFullTime ? "Full-time" : "Part-time") || "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CalendarIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Hire Date"
                secondary={formatDate(employee?.startDate || employee?.hireDate)}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AccessTimeIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Length of Service"
                secondary={
                  employee?.lengthOfService
                    ? `${employee.lengthOfService} years`
                    : employee?.hireDate
                    ? `${Math.floor((Date.now() - employee.hireDate) / (1000 * 60 * 60 * 24 * 365))} years`
                    : "N/A"
                }
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <BadgeIcon color="action" />
              </ListItemIcon>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Status
                </Typography>
                {(() => {
                  // Determine actual status: on leave during holidays, active otherwise
                  const today = new Date().toISOString().split("T")[0]
                  const isOnLeave = state.approvedTimeOff.some((timeOff) => {
                    const startDate = new Date(timeOff.startDate).toISOString().split("T")[0]
                    const endDate = new Date(timeOff.endDate).toISOString().split("T")[0]
                    return today >= startDate && today <= endDate && timeOff.status === "approved"
                  })
                  
                  const actualStatus = isOnLeave ? "On Leave" : (employee?.status === "active" ? "Active" : employee?.status || "N/A")
                  // Format status: capitalize and replace underscores with spaces
                  const formattedStatus = actualStatus
                    .split("_")
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(" ")
                  
                  return (
                    <Chip
                      label={formattedStatus}
                      size="small"
                      color={isOnLeave ? "warning" : actualStatus === "Active" ? "success" : "default"}
                      variant="outlined"
                    />
                  )
                })()}
              </Box>
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PersonIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Manager"
                secondary={employee?.manager || "Not assigned"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AccessTimeIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Working Hours"
                secondary={employee?.hoursPerWeek ? `${employee.hoursPerWeek} hours/week` : "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CalendarIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Holiday Entitlement"
                secondary={employee?.holidaysPerYear ? `${employee.holidaysPerYear} days/year` : "N/A"}
              />
            </ListItem>
            <Divider component="li" />
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CreditCardIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Pay Type"
                secondary={employee?.payType ? employee.payType.charAt(0).toUpperCase() + employee.payType.slice(1) : "N/A"}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Emergency Contacts and Logout */}
      <Card sx={{ borderRadius: 3, mt: 3 }}>
        <List disablePadding>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.path || `logout-${index}`}>
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={item.onClick || (() => navigate(item.path))} 
                  sx={{ 
                    py: 1.5,
                    ...(item.label === "Logout" && { color: theme.palette.error.main })
                  }}
                >
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(item.color, 0.12),
                      }}
                    >
                      {React.cloneElement(item.icon, {
                        sx: { 
                          color: item.color, 
                          fontSize: 20,
                          ...(item.label === "Logout" && { color: theme.palette.error.main })
                        },
                      })}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.sublabel}
                    primaryTypographyProps={{ 
                      fontWeight: 500,
                      ...(item.label === "Logout" && { color: theme.palette.error.main })
                    }}
                  />
                  {item.label !== "Logout" && <ChevronRightIcon color="action" />}
                </ListItemButton>
              </ListItem>
              {index < menuItems.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Card>

      {/* Multi-Company Switch */}
      {authState.isMultiCompany && (
        <Card sx={{ mt: 3, borderRadius: 3 }}>
          <CardActionArea onClick={() => navigate(getESSPath("CompanySelect"))}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: theme.palette.grey[200] }}>
                <WorkIcon color="action" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Switch Company
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  You have access to {authState.companies.length} companies
                </Typography>
              </Box>
              <ChevronRightIcon color="action" />
            </CardContent>
          </CardActionArea>
        </Card>
      )}
    </Box>
  )
}

export default ESSProfile