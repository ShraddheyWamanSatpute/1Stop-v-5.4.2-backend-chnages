"use client"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import type React from "react"
import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Button,
  Collapse,
  ListSubheader,
} from "@mui/material"
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  NotificationsOff as NotificationsOffIcon,
  ExpandLess,
  ExpandMore,
  Clear as ClearIcon,
  Contacts as ContactsIcon,
} from "@mui/icons-material"
import { useMessenger, Chat } from "../../../backend/context/MessengerContext"
import { format } from "date-fns"
import EmptyStateCard from "../reusable/EmptyStateCard"

interface ChatSidebarProps {
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onShowContacts: () => void
  selectedChatId?: string
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onChatSelect, onNewChat, onShowContacts, selectedChatId }) => {
  const { state, updateChatSettings, updateChatDetails, deleteChat } = useMessenger()
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const disabledText = alpha(themeConfig.brandColors.navy, 0.45)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)
  const selectedBg = alpha(themeConfig.brandColors.navy, 0.08)
  const headerBg = themeConfig.brandColors.navy
  const headerText = themeConfig.brandColors.offWhite

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState(0)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    pinned: true,
    recent: true,
    archived: false,
  })

  const tabs: { label: string; icon: React.ReactElement; value: string }[] = [
    { label: "All", icon: <GroupIcon />, value: "all" },
    { label: "Direct", icon: <PersonIcon />, value: "direct" },
    { label: "Groups", icon: <GroupIcon />, value: "group" },
    { label: "Company", icon: <BusinessIcon />, value: "company" },
    { label: "Sites", icon: <LocationIcon />, value: "site" },
    { label: "Subsites", icon: <LocationIcon />, value: "subsite" },
    { label: "Departments", icon: <WorkIcon />, value: "department" },
    { label: "Roles", icon: <SecurityIcon />, value: "role" },
  ]

  const filteredChats = useMemo(() => {
    let chats = (state.chats || []).filter((chat) => {
      if (!chat) return false
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          chat.name?.toLowerCase().includes(searchLower) || chat.lastMessage?.text?.toLowerCase().includes(searchLower)
        )
      }
      return true
    })

    // Filter by tab
    const currentTab = tabs[activeTab]
    if (currentTab.value !== "all") {
      if (currentTab.value === "subsite") {
        chats = chats.filter((chat) => chat.type === "site" && (chat as any).subsiteId)
      } else {
        chats = chats.filter((chat) => chat.type === (currentTab.value as Chat["type"]))
      }
    }

    // Sort by last message timestamp
    const sortedChats = chats.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0
      return bTime - aTime
    })

    return sortedChats
  }, [state.chats, searchTerm, activeTab, tabs])

  const groupedChats = useMemo(() => {
    const groups: {
      pinned: Chat[];
      recent: Chat[];
      archived: Chat[];
    } = {
      pinned: [],
      recent: [],
      archived: [],
    }

    filteredChats.forEach((chat) => {
      const settings = state.chatSettings?.[chat.id]
      if (settings?.isPinned) {
        groups.pinned.push(chat)
      } else if (chat.isArchived) {
        groups.archived.push(chat)
      } else {
        groups.recent.push(chat)
      }
    })

    return groups
  }, [filteredChats, state.chatSettings])


  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, chat: Chat) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedChat(chat)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedChat(null)
  }

  const handleStarChat = async () => {
    if (selectedChat) {
      const settings = state.chatSettings?.[selectedChat.id]
      await updateChatSettings(selectedChat.id, {
        isStarred: !settings?.isStarred,
      })
      handleMenuClose()
    }
  }

  const handlePinChat = async () => {
    if (selectedChat) {
      const settings = state.chatSettings?.[selectedChat.id]
      await updateChatSettings(selectedChat.id, {
        isPinned: !settings?.isPinned,
      })
      handleMenuClose()
    }
  }

  const handleMuteChat = async () => {
    if (selectedChat) {
      const settings = state.chatSettings?.[selectedChat.id]
      await updateChatSettings(selectedChat.id, {
        isMuted: !settings?.isMuted,
      })
      handleMenuClose()
    }
  }

  const handleArchiveChat = async () => {
    if (selectedChat) {
      await updateChatDetails(selectedChat.id, {
        isArchived: !selectedChat.isArchived,
      })
      handleMenuClose()
    }
  }

  const handleDeleteChat = async () => {
    if (selectedChat) {
      await deleteChat(selectedChat.id)
      handleMenuClose()
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()

    if (date.toDateString() === now.toDateString()) {
      return format(date, "h:mm a")
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, "MMM d")
    } else {
      return format(date, "MM/dd/yyyy")
    }
  }

  const getChatIcon = (chat: Chat) => {
    // Treat subsites as a specialized site
    if (chat.type === "site" && (chat as any).subsiteId) {
      return <LocationIcon />
    }
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
        return chat.name.charAt(0).toUpperCase()
    }
  }

  const getUnreadCount = (chat: Chat) => {
    // This would be calculated based on the last read message timestamp
    const settings = state.chatSettings?.[chat.id]
    // Check if there's an unread message based on last message timestamp
    if (chat.lastMessage && settings?.lastReadMessageId !== chat.lastMessage.id) {
      return 1
    }
    return 0
  }

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }

  const renderChatList = (chats: Chat[], title?: string, collapsible = false) => {
    if (chats.length === 0) return null

    const isExpanded = title ? expandedCategories[title.toLowerCase()] !== false : true

    return (
      <Box key={title || "default"}>
        {title && (
          <ListSubheader
            component="div"
            sx={{
              bgcolor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: collapsible ? "pointer" : "default",
              py: 1,
            }}
            onClick={collapsible ? () => toggleCategoryExpansion(title.toLowerCase()) : undefined}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: secondaryText }}>
              {title} ({chats.length})
            </Typography>
            {collapsible && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListSubheader>
        )}
        <Collapse in={isExpanded}>
          {chats.map((chat) => {
            const unreadCount = getUnreadCount(chat)
            const settings = state.chatSettings?.[chat.id]
            const isSelected = selectedChatId === chat.id

            return (
              <ListItemButton
                key={chat.id}
                selected={isSelected}
                onClick={() => onChatSelect(chat.id)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  mb: 0.5,
                  py: 1.25,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: hoverBg,
                  },
                  "&.Mui-selected": {
                    bgcolor: selectedBg,
                    color: themeConfig.brandColors.navy,
                    borderLeft: `4px solid ${themeConfig.brandColors.navy}`,
                    "&:hover": {
                      bgcolor: alpha(themeConfig.brandColors.navy, 0.12),
                    },
                    "& .MuiListItemText-primary": {
                      fontWeight: 600,
                    },
                    "& .MuiListItemText-secondary": {
                      color: secondaryText,
                    },
                  },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    badgeContent={
                      chat.type === "direct" ? (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            border: "2px solid white",
                          }}
                        />
                      ) : null
                    }
                  >
                    <Avatar
                      sx={{
                        bgcolor: isSelected ? themeConfig.brandColors.navy : themeConfig.colors.primary.light,
                        color: themeConfig.brandColors.offWhite,
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getChatIcon(chat)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        component="span"
                        sx={{
                          fontWeight: unreadCount > 0 ? "bold" : "normal",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.875rem",
                        }}
                      >
                        {chat.name}
                      </Box>
                      {settings?.isStarred && <StarIcon sx={{ fontSize: 16, color: "warning.main" }} />}
                      {settings?.isMuted && <NotificationsOffIcon sx={{ fontSize: 16, color: disabledText }} />}
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.75rem",
                          color: secondaryText,
                        }}
                      >
                        {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ""}
                      </Box>
                    </Box>
                  }
                  secondaryTypographyProps={{
                    component: "div",
                    sx: { display: "flex", alignItems: "center", justifyContent: "space-between" }
                  }}
                  secondary={
                    <>
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.875rem",
                          color: unreadCount > 0 ? "text.primary" : secondaryText,
                          fontWeight: unreadCount > 0 ? "medium" : "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {chat.lastMessage?.text || "No messages yet"}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {unreadCount > 0 && (
                          <Chip
                            label={unreadCount}
                            color="primary"
                            size="small"
                            sx={{ height: 20, minWidth: 20, fontSize: "0.75rem" }}
                          />
                        )}
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, chat)}
                          sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </>
                  }
                />
              </ListItemButton>
            )
          })}
        </Collapse>
      </Box>
    )
  }

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0, maxHeight: "100%", overflow: "hidden", bgcolor: themeConfig.brandColors.offWhite }}>
      {/* Header - Search bar with action buttons */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: alpha(themeConfig.brandColors.offWhite, 0.12), bgcolor: headerBg, color: headerText }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <TextField
            placeholder="Search"
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: themeConfig.brandColors.navy }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchTerm("")}
                    sx={{ 
                      p: 0.5,
                      "&:hover": {
                        bgcolor: hoverBg,
                      },
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ 
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: themeConfig.brandColors.offWhite,
                "& fieldset": {
                  borderColor: alpha(themeConfig.brandColors.navy, 0.12),
                },
                "&:hover fieldset": {
                  borderColor: alpha(themeConfig.brandColors.navy, 0.24),
                },
                "&.Mui-focused fieldset": {
                  borderColor: themeConfig.brandColors.navy,
                },
              },
            }}
          />
          <IconButton 
            onClick={onShowContacts} 
            size="small" 
            sx={{
              color: headerText,
              flexShrink: 0,
              "&:hover": {
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.12),
              },
            }}
          >
            <ContactsIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onNewChat}
            sx={{ 
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              boxShadow: "none",
              flexShrink: 0,
              bgcolor: themeConfig.brandColors.offWhite,
              color: themeConfig.brandColors.navy,
              "&:hover": {
                boxShadow: "none",
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.9),
              },
            }}
          >
            New
          </Button>
        </Box>
      </Box>

      {/* Chat Type Filter */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: themeConfig.brandColors.offWhite }}>
        <FormControl fullWidth size="small">
          <Select
            value={activeTab}
            onChange={(e) => setActiveTab(Number(e.target.value))}
            displayEmpty
            sx={{ 
              borderRadius: 2,
              bgcolor: themeConfig.brandColors.offWhite,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: alpha(themeConfig.brandColors.navy, 0.12),
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: alpha(themeConfig.brandColors.navy, 0.24),
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: themeConfig.brandColors.navy,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <MenuItem key={index} value={index}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Chat List */}
      <Box sx={{ flex: 1, overflow: "auto", overscrollBehavior: "contain", minHeight: 0, maxHeight: "100%" }}>
        {state.isLoading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ color: secondaryText }}>Loading conversations...</Typography>
          </Box>
        ) : filteredChats.length > 0 ? (
          <List sx={{ p: 0 }}>
            {renderChatList(groupedChats.pinned, "Pinned", true)}
            {renderChatList(groupedChats.recent, "Recent", true)}
            {renderChatList(groupedChats.archived, "Archived", true)}
          </List>
        ) : (
          <EmptyStateCard
            icon={GroupIcon}
            title={searchTerm ? "No conversations match your search" : "No conversations yet"}
            description={searchTerm ? "Try adjusting your search query" : "Start a conversation to get started."}
            action={!searchTerm ? (
              <Button
                variant="outlined"
                onClick={onNewChat}
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  borderColor: alpha(themeConfig.brandColors.navy, 0.35),
                  color: themeConfig.brandColors.navy,
                  "&:hover": {
                    borderColor: themeConfig.brandColors.navy,
                    bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
                  },
                }}
              >
                Start a conversation
              </Button>
            ) : undefined}
          />
        )}
      </Box>

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleStarChat}>
          <StarIcon sx={{ mr: 1 }} />
          {state.chatSettings?.[selectedChat?.id || ""]?.isStarred ? "Unstar" : "Star"}
        </MenuItem>
        <MenuItem onClick={handlePinChat}>
          <StarIcon sx={{ mr: 1 }} />
          {state.chatSettings?.[selectedChat?.id || ""]?.isPinned ? "Unpin" : "Pin"}
        </MenuItem>
        <MenuItem onClick={handleMuteChat}>
          <NotificationsOffIcon sx={{ mr: 1 }} />
          {state.chatSettings?.[selectedChat?.id || ""]?.isMuted ? "Unmute" : "Mute"}
        </MenuItem>
        <MenuItem onClick={handleArchiveChat}>
          <ArchiveIcon sx={{ mr: 1 }} />
          {selectedChat?.isArchived ? "Unarchive" : "Archive"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteChat} sx={{ color: "error.main" }}>
          Delete Chat
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default ChatSidebar
