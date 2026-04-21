"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Badge,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Paper,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Message as MessageIcon,
  Work as WorkIcon,
  People as PeopleIcon,
} from "@mui/icons-material"
import { useMessenger, UserBasicDetails, Contact } from "../../../backend/context/MessengerContext"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"

interface ContactsManagerProps {
  open: boolean
  onClose: () => void
  onStartChat: (userId: string) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  const location = useLocation()
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

const ContactsManager: React.FC<ContactsManagerProps> = ({ open, onClose, onStartChat }) => {
  const {
    state,
    getWorkContacts,
    getSavedContacts,
    sendContactInvitation,
    acceptContactInvitation,
    declineContactInvitation,
    removeContact,
    updateContact,
  } = useMessenger()
  const { state: hrState } = useHR()
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)

  const [tabValue, setTabValue] = useState(0)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserBasicDetails | null>(null)
  const [inviteMessage, setInviteMessage] = useState("")
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const [workContacts, setWorkContacts] = useState<any[]>([])
  const [savedContacts, setSavedContacts] = useState<any[]>([])
  const pendingInvitations = state.contactInvitations?.filter((inv) => inv.status === "pending") || []

  // Fetch contacts when component mounts or dialog opens
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const workContactsData = await getWorkContacts()
        const savedContactsData = await getSavedContacts()
        setWorkContacts(workContactsData || [])
        setSavedContacts(savedContactsData || [])
      } catch (error) {
        // Error fetching contacts - handled by context
      }
    }
    
    if (open) {
      fetchContacts()
    }
  }, [open, getWorkContacts, getSavedContacts])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleInviteUser = (user: UserBasicDetails) => {
    setSelectedUser(user)
    setShowInviteDialog(true)
  }

  const handleSendInvitation = async () => {
    if (selectedUser) {
      const sent = await sendContactInvitation(selectedUser.uid, inviteMessage.trim() || undefined)
      if (!sent) return

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "contactsManagerModal2",
        crudMode: "create",
      })
      setShowInviteDialog(false)
      setSelectedUser(null)
      setInviteMessage("")
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptContactInvitation(invitationId)
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    await declineContactInvitation(invitationId)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, contact: Contact) => {
    setMenuAnchor(event.currentTarget)
    setSelectedContact(contact)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedContact(null)
  }

  const handleToggleFavorite = async () => {
    if (selectedContact) {
      await updateContact(selectedContact.id, {
        isFavorite: !selectedContact.isFavorite,
      })
      handleMenuClose()
    }
  }

  const handleRemoveContact = async () => {
    if (selectedContact) {
      await removeContact(selectedContact.id)
      handleMenuClose()
    }
  }

  const getUserDetails = (userId: string): UserBasicDetails | null => {
    return state.users?.find((user) => user.uid === userId) || null
  }

  const getDepartmentName = (departmentIds?: string[]) => {
    if (!departmentIds || departmentIds.length === 0) return "No department"
    const dept = hrState.departments?.find((d) => departmentIds.includes(d.id))
    return dept?.name || "Unknown department"
  }

  const getRoleName = (roleIds?: string[]) => {
    if (!roleIds || roleIds.length === 0) return "No role"
    const role = hrState.roles?.find((r) => roleIds.includes(r.id))
    return role?.label || role?.name || "Unknown role"
  }

  return (
                <CRUDModal
          open={open}
          onClose={(reason) => {
            const __workspaceOnClose = onClose
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }}
          workspaceFormShortcut={{
            crudEntity: "contactsManagerModal1",
            crudMode: "view",
          }}
          title="Contacts"
          icon={<PeopleIcon />}
          mode="view"
          maxWidth="md"
        >
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab icon={<WorkIcon />} label="Work Contacts" />
          <Tab icon={<PeopleIcon />} label="Saved Contacts" />
          <Tab
            icon={
              <Badge badgeContent={pendingInvitations.length} color="error">
                <PersonAddIcon />
              </Badge>
            }
            label="Invitations"
          />
        </Tabs>

        {/* Work Contacts Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: secondaryText }} gutterBottom>
              All employees in your company
            </Typography>
            <List>
              {workContacts.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: themeConfig.brandColors.navy }}>{user.firstName?.charAt(0) || "U"}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: secondaryText }}>
                          {getDepartmentName(user.departmentIds)} • {getRoleName(user.roleIds)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => onStartChat(user.uid)} color="primary">
                      <MessageIcon />
                    </IconButton>
                    <IconButton onClick={() => handleInviteUser(user)} size="small">
                      <PersonAddIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Saved Contacts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: secondaryText }} gutterBottom>
              Your personal contact list
            </Typography>
            <List>
              {savedContacts.map((contact) => {
                const user = getUserDetails(contact.contactUserId)
                if (!user) return null

                return (
                  <ListItem key={contact.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: themeConfig.brandColors.offWhite }}>{user.firstName?.charAt(0) || "U"}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {contact.nickname || `${user.firstName} ${user.lastName}`}
                          {contact.isFavorite && <StarIcon color="warning" fontSize="small" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {user.email}
                          </Typography>
                          {contact.notes && (
                            <Typography variant="caption" sx={{ color: secondaryText }}>
                              {contact.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => onStartChat(user.uid)} color="primary">
                        <MessageIcon />
                      </IconButton>
                      <IconButton onClick={(e) => handleMenuClick(e, contact)} size="small">
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
              {savedContacts.length === 0 && (
                <Paper sx={{ p: 3, textAlign: "center", bgcolor: hoverBg }}>
                  <Typography variant="body2" sx={{ color: secondaryText }}>
                    No saved contacts yet. Add contacts from the Work Contacts tab.
                  </Typography>
                </Paper>
              )}
            </List>
          </Box>
        </TabPanel>

        {/* Invitations Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: secondaryText }} gutterBottom>
              Pending contact invitations
            </Typography>
            <List>
              {pendingInvitations.map((invitation) => {
                const user = getUserDetails(invitation.fromUserId)
                if (!user) return null

                return (
                  <ListItem key={invitation.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "info.main" }}>{user.firstName?.charAt(0) || "U"}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${user.firstName} ${user.lastName}`}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {user.email}
                          </Typography>
                          {invitation.message && (
                            <Typography variant="caption" sx={{ color: secondaryText }}>
                              "{invitation.message}"
                            </Typography>
                          )}
                          <Chip
                            label={`Sent ${new Date(invitation.sentAt).toLocaleDateString()}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleAcceptInvitation(invitation.id)} color="success" size="small">
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeclineInvitation(invitation.id)} color="error" size="small">
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
              {pendingInvitations.length === 0 && (
                <Paper sx={{ p: 3, textAlign: "center", bgcolor: hoverBg }}>
                  <Typography variant="body2" sx={{ color: secondaryText }}>
                    No pending invitations
                  </Typography>
                </Paper>
              )}
            </List>
          </Box>
        </TabPanel>

      {/* Invite Dialog */}
      <CRUDModal
        open={showInviteDialog}
        onClose={(reason) => {
          setShowInviteDialog(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedUser(null)
            setInviteMessage("")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "contactsManagerModal2",
          crudMode: "create",
        }}
        title="Send Contact Invitation"
        icon={<PersonAddIcon />}
        mode="create"
        onSave={handleSendInvitation}
        saveButtonText="Send Invitation"
        maxWidth="sm"
      >
        {selectedUser && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: themeConfig.brandColors.navy }}>{selectedUser.firstName?.charAt(0) || "U"}</Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {selectedUser.firstName} {selectedUser.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: secondaryText }}>
                  {selectedUser.email}
                </Typography>
              </Box>
            </Box>
            <TextField
              fullWidth
              label="Message (Optional)"
              multiline
              rows={3}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Hi! I'd like to add you to my contacts."
            />
          </Box>
        )}
      </CRUDModal>

      {/* Contact Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleToggleFavorite}>
          {selectedContact?.isFavorite ? <StarIcon sx={{ mr: 1 }} /> : <StarBorderIcon sx={{ mr: 1 }} />}
          {selectedContact?.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleRemoveContact} sx={{ color: "error.main" }}>
          <CloseIcon sx={{ mr: 1 }} />
          Remove Contact
        </MenuItem>
      </Menu>
    </CRUDModal>
  )
}

export default ContactsManager
