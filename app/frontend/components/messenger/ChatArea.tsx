"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Paper,
  Chip,
  InputAdornment,
  Collapse,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  InsertEmoticon as EmojiIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Group as GroupIcon,
} from "@mui/icons-material"
import { useMessenger, Chat, Message } from "../../../backend/context/MessengerContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
// Use Messenger context instead of Company context
import MessageList from "./MessageList"
import ChatInfo from "./ChatInfo"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
// Removed direct Firebase auth import - using context instead

interface ChatAreaProps {
  chat: Chat
  onBack?: () => void
  showBackButton?: boolean
}

const ChatArea: React.FC<ChatAreaProps> = ({ chat, onBack, showBackButton }) => {
  const { state, sendMessage, forwardMessage, editMessage, uploadAttachment } = useMessenger()
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const disabledText = alpha(themeConfig.brandColors.navy, 0.45)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)
  const selectedBg = alpha(themeConfig.brandColors.navy, 0.08)
  // Use Messenger context for company data
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showForwardDialog, setShowForwardDialog] = useState(false)
  const [selectedChats, setSelectedChats] = useState<string[]>([])
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus message input when chat changes
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
    scrollToBottom()
  }, [chat.id])
  
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return

    setIsTyping(true)
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, newMessage.trim())
      } else {
        const mapped = attachments.length > 0
          ? ((await Promise.all(attachments.map((file) => uploadAttachment(file)))).filter(
              (attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment)
            ))
          : undefined

        await sendMessage(newMessage, mapped)
      }

      // Assume success if no error was thrown
      setNewMessage("")
      setAttachments([])
      setReplyTo(null)
      setEditingMessage(null)
      scrollToBottom()
      setShowEmojiPicker(false)
    } catch (error) {
      // Error sending message - handled by context
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleHeaderClick = () => {
    setShowChatInfo(true)
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }

  const handleEdit = (message: Message) => {
    setNewMessage(message.text)
    setReplyTo(null)
    setEditingMessage(message)
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }

  const handleForward = (message: Message) => {
    setForwardingMessage(message)
    setShowForwardDialog(true)
  }

  const handleForwardConfirm = async () => {
    if (forwardingMessage && selectedChats.length > 0) {
      try {
        // Forward the message to selected chats in one call
        await forwardMessage(forwardingMessage.id, selectedChats)
        // Assume success if no error was thrown
        setShowForwardDialog(false)
        setForwardingMessage(null)
        setSelectedChats([])
      } catch (error) {
        // Error forwarding message - handled by context
      }
    }
  }

  const handleForwardCancel = () => {
    setShowForwardDialog(false)
    setForwardingMessage(null)
    setSelectedChats([])
  }

  const handleChatToggle = (chatId: string) => {
    setSelectedChats((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]))
  }

  const getChatIcon = () => {
    switch (chat.type) {
      case "company":
        return <BusinessIcon />
      case "site":
        return <LocationIcon />
      case "department":
        return <WorkIcon />
      case "group":
        return <GroupIcon />
      default:
        return chat.name.charAt(0).toUpperCase()
    }
  }

  const getChatSubtitle = () => {
    switch (chat.type) {
      case "company":
        return "Company-wide chat"
      case "site":
        return "Site chat"
      case "department":
        return "Department chat"
      case "group":
        return `${chat.participants?.length ?? 0} members`
      case "direct":
        const otherParticipant = state.users?.find(
          (user) => user.uid !== settingsState.auth?.uid && (chat.participants || []).includes(user.uid),
        )
        const status = state.userStatuses?.[otherParticipant?.uid || ""]
        return status ? `${status.status}${status.customStatus ? ` - ${status.customStatus}` : ""}` : "offline"
      default:
        return ""
    }
  }

  return (
    <Box sx={{ 
      height: "100%", 
      width: "100%",
      display: "flex", 
      flexDirection: "column", 
      minHeight: 0,
      maxHeight: "100%",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Chat Header - Clickable to open Chat Info */}
      <Paper
        elevation={0}
        onClick={handleHeaderClick}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: alpha(themeConfig.brandColors.offWhite, 0.12),
          bgcolor: themeConfig.brandColors.navy,
          color: themeConfig.brandColors.offWhite,
          cursor: "pointer",
          "&:hover": {
            bgcolor: alpha(themeConfig.brandColors.navy, 0.92),
          },
          transition: "background-color 0.2s",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          {showBackButton && (
            <IconButton 
              onClick={(e) => {
                e.stopPropagation()
                onBack?.()
              }} 
              sx={{ mr: 1, color: themeConfig.brandColors.offWhite }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
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
              ) : chat.type === "group" ? (
                <Avatar
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: themeConfig.brandColors.offWhite,
                    color: themeConfig.brandColors.navy,
                    fontSize: "0.6rem",
                  }}
                >
                  {(chat.participants?.length ?? 0)}
                </Avatar>
              ) : null
            }
          >
            <Avatar
              sx={{
                bgcolor: themeConfig.brandColors.offWhite,
                color: themeConfig.brandColors.navy,
                width: 40,
                height: 40,
              }}
            >
              {getChatIcon()}
            </Avatar>
          </Badge>
          <Box sx={{ ml: 2, flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: themeConfig.brandColors.offWhite }}>
              {chat.type === "company" ? (companyState.companyName || chat.name) : chat.name}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.8) }}>
              {getChatSubtitle()}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: "hidden", minHeight: 0, maxHeight: "100%", display: "flex", flexDirection: "column" }}>
        <MessageList
          messages={state.messages?.[chat.id] || []}
          onReply={handleReply}
          onForward={handleForward}
          onEdit={handleEdit}
          currentUserId={settingsState.auth?.uid || ""}
        />
      </Box>

      {/* Reply / Edit Preview */}
      <Collapse in={!!replyTo || !!editingMessage}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mx: 2,
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: hoverBg,
            borderLeft: 3,
            borderColor: themeConfig.brandColors.navy,
            borderRadius: 1,
            flexShrink: 0
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: secondaryText }}>
              {editingMessage
                ? `Editing message from ${editingMessage.firstName} ${editingMessage.lastName}`.trim()
                : `Replying to ${replyTo?.firstName || ""} ${replyTo?.lastName || ""}`.trim()}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {editingMessage?.text || replyTo?.text}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => {
            setReplyTo(null)
            setEditingMessage(null)
          }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Collapse>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: "divider",
          flexShrink: 0,
          bgcolor: "background.paper"
        }}>
          <Typography variant="caption" sx={{ color: secondaryText }} gutterBottom>
            Attachments ({attachments.length})
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {attachments.map((file, index) => (
              <Chip
                key={index}
                label={file.name}
                onDelete={() => removeAttachment(index)}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Message Input */}
      <Box sx={{ 
        p: 1.5, 
        borderTop: 1, 
        borderColor: "divider", 
        bgcolor: "background.paper", 
        flexShrink: 0
      }}>
        {/* Emoji Picker - Show above input */}
        <Collapse in={showEmojiPicker}>
          <Box sx={{ mb: 1.5, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              width="100%" 
              height={350}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
            />
          </Box>
        </Collapse>

        <Box sx={{ 
          display: "flex", 
          alignItems: "flex-end", 
          gap: 0.75,
          bgcolor: hoverBg,
          borderRadius: 3,
          p: 0.5,
          border: 1,
          borderColor: "divider",
        }}>
          <IconButton 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            size="small"
            sx={{
              color: showEmojiPicker ? themeConfig.brandColors.navy : secondaryText,
              "&:hover": {
                bgcolor: selectedBg,
              },
            }}
          >
            <EmojiIcon fontSize="small" />
          </IconButton>
          <IconButton 
            onClick={handleAttachClick} 
            size="small"
            sx={{
              color: secondaryText,
              "&:hover": {
                bgcolor: selectedBg,
              },
            }}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} multiple />
          <TextField
            ref={messageInputRef}
            fullWidth
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            variant="standard"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            disabled={isTyping}
            InputProps={{
              disableUnderline: true,
              endAdornment: isTyping && (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "0.9375rem",
                px: 1,
                py: 0.5,
              },
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachments.length === 0) || isTyping}
            sx={{
              bgcolor: (!newMessage.trim() && attachments.length === 0) || isTyping 
                ? "transparent" 
                : themeConfig.brandColors.navy,
              color: (!newMessage.trim() && attachments.length === 0) || isTyping
                ? disabledText
                : themeConfig.brandColors.offWhite,
              "&:hover": {
                bgcolor: (!newMessage.trim() && attachments.length === 0) || isTyping
                  ? "transparent"
                  : "primary.dark",
              },
              "&.Mui-disabled": {
                bgcolor: "transparent",
              },
              transition: "all 0.2s",
            }}
            size="small"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onClose={handleForwardCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: secondaryText }} gutterBottom>
            Select chats to forward this message to:
          </Typography>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {state.chats
              .filter((c) => c.id !== chat.id) // Don't show current chat
              .map((chatItem) => (
                <ListItem key={chatItem.id} disablePadding>
                  <ListItem button onClick={() => handleChatToggle(chatItem.id)} sx={{ pl: 0 }}>
                    <Checkbox checked={selectedChats.includes(chatItem.id)} tabIndex={-1} disableRipple />
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: themeConfig.brandColors.navy }}>{chatItem.name.charAt(0).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={chatItem.name} secondary={`${chatItem.participants?.length ?? 0} members`} />
                  </ListItem>
                </ListItem>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleForwardCancel}>Cancel</Button>
          <Button onClick={handleForwardConfirm} variant="contained" disabled={selectedChats.length === 0}>
            Forward ({selectedChats.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat Info Dialog */}
      <ChatInfo open={showChatInfo} onClose={() => setShowChatInfo(false)} chat={chat} />
    </Box>
  )
}

export default ChatArea
