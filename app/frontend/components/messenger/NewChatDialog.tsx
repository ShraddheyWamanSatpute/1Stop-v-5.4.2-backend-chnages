"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect } from "react"
import {
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Badge,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Work as DepartmentIcon,
  Badge as RoleIcon,
  Search as SearchIcon,
} from "@mui/icons-material"
import { useMessenger, UserBasicDetails, Contact } from "../../../backend/context/MessengerContext"
import { useHR } from "../../../backend/context/HRContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import type { Employee } from "../../../backend/interfaces/HRs"

// TODO: Define these types locally until they're exported from HRContext
interface Department {
  id: string
  name: string
  description?: string
}

interface Role {
  id: string
  name: string
  label?: string
  description?: string
  department?: string
}
// Use Messenger context instead of Company context

interface NewChatDialogProps {
  open: boolean
  onClose: () => void
  onChatCreated: (chatId: string) => void
}

const NewChatDialog: React.FC<NewChatDialogProps> = ({ open, onClose, onChatCreated }) => {
  const location = useLocation()
  const { state: messengerState, createChat } = useMessenger()
  const { state: companyState } = useCompany()
  const { state: hrState } = useHR()
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  // Use Messenger context for company data

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companyUsers, setCompanyUsers] = useState<UserBasicDetails[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  // Form states
  const [chatName, setChatName] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, companyState.companyID, companyState.selectedSiteID])

  const loadData = async () => {
    if (!companyState.companyID) return

    setLoading(true)
    try {
      // Get company ID
      // const companyId = companyState.companyID || localStorage.getItem("companyId") || localStorage.getItem("userCompanyId") || "default-company" // TODO: Use when implementing functions

      // Core data already available in MessengerContext
      const contactsPromise = Promise.resolve(messengerState.contacts || [])
      const usersPromise = Promise.resolve(messengerState.users || [])

      // Site-scoped data fetched using HRContext when site is selected
      const depsPromise = companyState.selectedSiteID ? 
        Promise.resolve(hrState?.departments || []) : Promise.resolve([])
      const rolesPromise = companyState.selectedSiteID ? 
        Promise.resolve(hrState?.roles || []) : Promise.resolve([])

      const [contactsData, usersData, departmentsData, rolesData] = await Promise.all([
        contactsPromise,
        usersPromise,
        depsPromise,
        rolesPromise,
      ])

      setContacts(contactsData)
      setCompanyUsers(usersData)
      setDepartments(departmentsData)
      setRoles(rolesData)
      setError(null)
    } catch (err: any) {
      // Error loading data - handled by context
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChat = async () => {
    if (!companyState.companyID) {
      setError("Company ID is required")
      return
    }

    setLoading(true)
    try {
      let chatId: string | null = null

      switch (activeTab) {
        case 0: // Direct Message
          if (selectedUsers.length !== 1) {
            setError("Please select exactly one user for direct message")
            return
          }
          const directUser = companyUsers.find((user) => user.uid === selectedUsers[0])
          chatId = await createChat(
            directUser
              ? `${directUser.firstName || ""} ${directUser.lastName || ""}`.trim() || directUser.email
              : `Direct: ${selectedUsers[0]}`,
            selectedUsers,
            "direct",
            {
              companyId: companyState.companyID,
              isPrivate: true,
              isArchived: false
            }
          )
          break

        case 1: // Group Chat
          if (!chatName.trim()) {
            setError("Chat name is required")
            return
          }
          if (selectedUsers.length === 0) {
            setError("Please select at least one user")
            return
          }
          chatId = await createChat(
            chatName,
            selectedUsers,
            "group",
            {
              companyId: companyState.companyID,
              isPrivate: true,
              isArchived: false
            }
          )
          break

        case 2: // Company Chat
          chatId = await createChat(
            `${companyState.companyName || "Company"} Chat`,
            getCompanyParticipantIds(),
            "company",
            {
              companyId: companyState.companyID,
              isPrivate: false,
              isArchived: false
            }
          )
          break

        case 3: // Site Chat
          if (!companyState.selectedSiteID) {
            setError("Site ID is required")
            return
          }
          chatId = await createChat(
            `${companyState.selectedSiteName || "Site"} Chat`,
            getSiteParticipantIds(),
            "site",
            {
              companyId: companyState.companyID,
              siteId: companyState.selectedSiteID,
              isPrivate: false,
              isArchived: false
            }
          )
          break

        case 4: // Department Chat
          if (!selectedDepartment) {
            setError("Please select a department")
            return
          }
          const department = departments.find((d) => d.id === selectedDepartment)
          chatId = await createChat(
            `${department?.name || "Department"} Chat`,
            getDepartmentParticipantIds(selectedDepartment),
            "department",
            {
              companyId: companyState.companyID,
              siteId: companyState.selectedSiteID || undefined,
              departmentId: selectedDepartment,
              isPrivate: false,
              isArchived: false
            }
          )
          break

        case 5: // Role Chat
          if (!selectedRole) {
            setError("Please select a role")
            return
          }
          const role = roles.find((r) => r.id === selectedRole)
          chatId = await createChat(
            `${role?.label || role?.name || "Role"} Chat`,
            getRoleParticipantIds(selectedRole),
            "role",
            {
              companyId: companyState.companyID,
              siteId: companyState.selectedSiteID || undefined,
              roleId: selectedRole,
              isPrivate: false,
              isArchived: false
            }
          )
          break

        default:
          setError("Invalid chat type selected")
          return
      }

      if (chatId) {
        onChatCreated(chatId)
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "newChatDialogModal1",
          crudMode: "create",
        })
        handleClose()
      } else {
        setError("Failed to create chat")
      }
    } catch (err: any) {
      // Error creating chat - handled by context
      setError(err.message || "Failed to create chat")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setChatName("")
    setSelectedUsers([])
    setSelectedDepartment("")
    setSelectedRole("")
    setSearchTerm("")
    setActiveTab(0)
    setError(null)
    onClose()
  }

  const handleUserToggle = (userId: string) => {
    if (activeTab === 0) {
      // Direct chat - only one user
      setSelectedUsers([userId])
    } else {
      setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
    }
  }

  const getCompanyParticipantIds = () =>
    Array.from(new Set(companyUsers.filter((user) => user.isActive !== false).map((user) => user.uid)))

  const getSiteParticipantIds = () => {
    if (!companyState.selectedSiteID) return getCompanyParticipantIds()

    const employeeUserIds = (hrState.employees || [])
      .filter((employee: Employee) => employee.siteId === companyState.selectedSiteID && employee.userId)
      .map((employee: Employee) => employee.userId as string)

    return Array.from(new Set(employeeUserIds.length > 0 ? employeeUserIds : getCompanyParticipantIds()))
  }

  const getDepartmentParticipantIds = (departmentId: string) => {
    const employeeUserIds = (hrState.employees || [])
      .filter((employee: Employee) => employee.departmentId === departmentId && employee.userId)
      .map((employee: Employee) => employee.userId as string)

    return Array.from(new Set(employeeUserIds))
  }

  const getRoleParticipantIds = (roleId: string) => {
    const employeeUserIds = (hrState.employees || [])
      .filter((employee: Employee) => employee.roleId === roleId && employee.userId)
      .map((employee: Employee) => employee.userId as string)

    return Array.from(new Set(employeeUserIds))
  }

  const getFilteredUsers = () => {
    let users: Array<UserBasicDetails & { type?: string }> = []

    if (activeTab === 0) {
      // Direct chat - show contacts and company users
      users = [
        ...(contacts
          .map((contact) => {
            const user = companyUsers.find((u) => u.uid === contact.contactUserId)
            return user ? { ...user, type: "contact" } : null
          })
          .filter(Boolean) as UserBasicDetails[]),
        ...companyUsers
          .filter((user) => !contacts.some((contact) => contact.contactUserId === user.uid))
          .map((user) => ({ ...user, type: "company" })),
      ]
    } else {
      // Group chat - show all company users
      users = companyUsers.map((user) => ({ ...user, type: "company" }))
    }

    if (searchTerm) {
      users = users.filter(
        (user) =>
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return users
  }

  const tabConfig = [
    { label: "Direct Chat", icon: <PersonIcon />, description: "Start a 1-on-1 conversation" },
    { label: "Group Chat", icon: <GroupIcon />, description: "Create a custom group" },
    { label: "Company Chat", icon: <BusinessIcon />, description: "All company employees" },
    { label: "Site Chat", icon: <LocationIcon />, description: "All employees at this site" },
    { label: "Department Chat", icon: <DepartmentIcon />, description: "Department-specific chat" },
    { label: "Role Chat", icon: <RoleIcon />, description: "Role-based group chat" },
  ]

  return (
    <CRUDModal
      open={open}
      onClose={(reason) => {
        if (isCrudModalHardDismiss(reason)) {
          handleClose()
        } else {
          onClose()
        }
      }}
      workspaceFormShortcut={{
        crudEntity: "newChatDialogModal1",
        crudMode: "create",
      }}
      title="Create New Chat"
      icon={<GroupIcon />}
      mode="create"
      onSave={handleCreateChat}
      saveButtonText={loading ? "Creating..." : "Create Chat"}
          maxWidth="md"
          loading={loading}
          disabled={loading ||
        (activeTab === 0 && selectedUsers.length !== 1) ||
        (activeTab === 1 && (selectedUsers.length < 2 || !chatName.trim())) ||
        (activeTab === 4 && !selectedDepartment) ||
        (activeTab === 5 && !selectedRole)}
        >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Chat Type Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => {
              setActiveTab(newValue)
              setSelectedUsers([])
              setSelectedDepartment("")
              setSelectedRole("")
              setError(null)
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabConfig.map((tab, index) => (
              <Tab key={index} icon={tab.icon} label={tab.label} sx={{ minWidth: 120 }} />
            ))}
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Box sx={{ minHeight: 400 }}>
          {/* Description */}
          <Alert severity="info" sx={{ mb: 2 }}>
            {tabConfig[activeTab].description}
          </Alert>

          {/* Direct Chat & Group Chat */}
          {(activeTab === 0 || activeTab === 1) && (
            <Box>
              {activeTab === 1 && (
                <TextField
                  fullWidth
                  label="Group Name"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  sx={{ mb: 2 }}
                  required
                />
              )}

              <TextField
                fullWidth
                label="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: secondaryText }} />,
                }}
                sx={{ mb: 2 }}
              />

              {selectedUsers.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected ({selectedUsers.length}):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedUsers.map((userId) => {
                      const user = getFilteredUsers().find((u) => u.uid === userId)
                      return user ? (
                        <Chip
                          key={userId}
                          label={`${user.firstName} ${user.lastName}`}
                          onDelete={() => handleUserToggle(userId)}
                          avatar={<Avatar src={user.avatar}>{user.firstName[0]}</Avatar>}
                          size="small"
                        />
                      ) : null
                    })}
                  </Box>
                </Box>
              )}

              <List sx={{ maxHeight: 300, overflow: "auto" }}>
                {getFilteredUsers().map((user) => (
                  <ListItem key={user.uid} disablePadding>
                    <ListItemButton onClick={() => handleUserToggle(user.uid)}>
                      <Checkbox checked={selectedUsers.includes(user.uid)} tabIndex={-1} disableRipple />
                      <ListItemAvatar>
                        <Badge badgeContent={user.type === "contact" ? "★" : ""} color="primary">
                          <Avatar src={user.avatar}>
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ color: secondaryText }}>
                              {user.email}
                            </Typography>
                            {user.type === "contact" && <Chip label="Contact" size="small" color="primary" />}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Company Chat */}
          {activeTab === 2 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <BusinessIcon sx={{ fontSize: 64, color: themeConfig.brandColors.navy, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Company-Wide Chat
              </Typography>
              <Typography variant="body1" sx={{ color: secondaryText }} paragraph>
                This will create a chat seeded with the company users currently available in Messenger.
              </Typography>
              <Typography variant="body2" sx={{ color: secondaryText }}>
                Company: {companyState.companyName || "Current Company"}
              </Typography>
            </Box>
          )}

          {/* Site Chat */}
          {activeTab === 3 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <LocationIcon sx={{ fontSize: 64, color: themeConfig.brandColors.navy, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Site-Specific Chat
              </Typography>
              <Typography variant="body1" sx={{ color: secondaryText }} paragraph>
                This will create a chat seeded with employees currently linked to this site.
              </Typography>
              <Typography variant="body2" sx={{ color: secondaryText }}>
                Site: {companyState.selectedSiteName || "Current Site"}
              </Typography>
            </Box>
          )}

          {/* Department Chat */}
          {activeTab === 4 && (
            <Box>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Department</InputLabel>
                <Select
                  value={selectedDepartment}
                  label="Select Department"
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DepartmentIcon />
                        <Box>
                          <Typography variant="body1">{dept.name}</Typography>
                          <Typography variant="caption" sx={{ color: secondaryText }}>
                            {dept.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedDepartment && (
                <Alert severity="info">
                  This chat will be seeded with employees currently linked to the selected department.
                </Alert>
              )}
            </Box>
          )}

          {/* Role Chat */}
          {activeTab === 5 && (
            <Box>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Role</InputLabel>
                <Select value={selectedRole} label="Select Role" onChange={(e) => setSelectedRole(e.target.value)}>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <RoleIcon />
                        <Box>
                          <Typography variant="body1">{role.label || role.name}</Typography>
                          <Typography variant="caption" sx={{ color: secondaryText }}>
                            {role.department}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedRole && (
                <Alert severity="info">
                  This chat will be seeded with employees currently linked to the selected role.
                </Alert>
              )}
            </Box>
          )}
        </Box>
    </CRUDModal>
  )
}

export default NewChatDialog
