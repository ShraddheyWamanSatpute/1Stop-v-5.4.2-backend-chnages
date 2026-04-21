"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  TextField,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Close as CloseIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  NotificationsOff as NotificationsOffIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  ExitToApp as ExitToAppIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  PushPin as PinIcon,
} from "@mui/icons-material"
import { useMessenger, Chat } from "../../../backend/context/MessengerContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { format } from "date-fns"

interface ChatInfoProps {
  open: boolean
  onClose: () => void
  chat: Chat
}

const ChatInfo: React.FC<ChatInfoProps> = ({ open, onClose, chat }) => {
  const { state, updateChatSettings, updateChatDetails, deleteChat } = useMessenger()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const [searchTerm, setSearchTerm] = useState("")
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)

  const settings = state.chatSettings?.[chat.id] || {}
  const participants = chat.participants || []
  const messages = state.messages?.[chat.id] || []

  const getChatIcon = () => {
    switch (chat.type) {
      case "company":
        return <BusinessIcon />
      case "site":
        return <LocationIcon />
      case "department":
        return <WorkIcon />
      case "role":
        return <SecurityIcon />
      case "group":
        return <GroupIcon />
      default:
        return <PersonIcon />
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleToggleMute = async () => {
    await updateChatSettings(chat.id, { isMuted: !settings.isMuted })
    handleMenuClose()
  }

  const handleToggleStar = async () => {
    await updateChatSettings(chat.id, { isStarred: !settings.isStarred })
    handleMenuClose()
  }

  const handleTogglePin = async () => {
    await updateChatSettings(chat.id, { isPinned: !settings.isPinned })
    handleMenuClose()
  }

  const handleArchive = async () => {
    await updateChatDetails(chat.id, { isArchived: !chat.isArchived })
    handleMenuClose()
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      await deleteChat(chat.id)
      handleMenuClose()
      onClose()
    }
  }

  const handleLeave = async () => {
    if (window.confirm("Are you sure you want to leave this chat?")) {
      const currentUserId = settingsState.auth?.uid
      if (!currentUserId) return

      await updateChatDetails(chat.id, {
        participants: participants.filter((participantId) => participantId !== currentUserId),
      })
      handleMenuClose()
      onClose()
    }
  }

  const filteredParticipants = participants.filter((participantId) => {
    const user = state.users?.find((u) => u.uid === participantId)
    if (!user) return false
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Chat Info</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={handleMenuClick} size="small">
              <MoreVertIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Chat Header */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: themeConfig.brandColors.navy,
              mb: 2,
            }}
          >
            {getChatIcon()}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {chat.type === "company" ? companyState.companyName || chat.name : chat.name}
          </Typography>
          <Typography variant="body2" sx={{ color: secondaryText }}>
            {chat.type === "group" ? `${participants.length} members` : chat.type}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Chat Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: hoverBg }}>
              <Typography variant="h6">{messages.length}</Typography>
              <Typography variant="caption" sx={{ color: secondaryText }}>
                Messages
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={0} sx={{ p: 2, textAlign: "center", bgcolor: hoverBg }}>
              <Typography variant="h6">{participants.length}</Typography>
              <Typography variant="caption" sx={{ color: secondaryText }}>
                Members
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Chat Settings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Settings
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.isMuted || false}
                onChange={handleToggleMute}
                size="small"
              />
            }
            label="Mute notifications"
          />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
            <Chip
              icon={settings.isStarred ? <StarIcon /> : undefined}
              label={settings.isStarred ? "Starred" : "Not starred"}
              onClick={handleToggleStar}
              color={settings.isStarred ? "warning" : "default"}
              variant={settings.isStarred ? "filled" : "outlined"}
              size="small"
            />
            <Chip
              icon={settings.isPinned ? <PinIcon /> : undefined}
              label={settings.isPinned ? "Pinned" : "Not pinned"}
              onClick={handleTogglePin}
              color={settings.isPinned ? "primary" : "default"}
              variant={settings.isPinned ? "filled" : "outlined"}
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Participants */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Members ({participants.length})
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: secondaryText }} />,
            }}
            sx={{ mb: 2 }}
          />
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {filteredParticipants.map((participantId) => {
              const user = state.users?.find((u) => u.uid === participantId)
              if (!user) return null
              return (
                <ListItem key={participantId} disablePadding>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: themeConfig.brandColors.navy }}>
                      {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
                    secondary={user.email}
                  />
                </ListItem>
              )
            })}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button onClick={handleLeave} color="error" variant="outlined" startIcon={<ExitToAppIcon />}>
          Leave Chat
        </Button>
      </DialogActions>

      {/* Options Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleToggleMute}>
          <NotificationsOffIcon sx={{ mr: 1 }} />
          {settings.isMuted ? "Unmute" : "Mute"}
        </MenuItem>
        <MenuItem onClick={handleToggleStar}>
          <StarIcon sx={{ mr: 1 }} />
          {settings.isStarred ? "Unstar" : "Star"}
        </MenuItem>
        <MenuItem onClick={handleTogglePin}>
          <PinIcon sx={{ mr: 1 }} />
          {settings.isPinned ? "Unpin" : "Pin"}
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          <ArchiveIcon sx={{ mr: 1 }} />
          {chat.isArchived ? "Unarchive" : "Archive"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Chat
        </MenuItem>
      </Menu>
    </Dialog>
  )
}

export default ChatInfo
