"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
} from "@mui/icons-material"
import { format } from "date-fns"
import { useMessenger, Message } from "../../../backend/context/MessengerContext"

interface MessageListProps {
  messages: Message[]
  onReply: (message: Message) => void
  onForward: (message: Message) => void
  onEdit: (message: Message) => void
  currentUserId: string
}

const MessageList: React.FC<MessageListProps> = ({ messages, onReply, onForward, onEdit, currentUserId }) => {
  const { addReaction, removeReaction, pinMessage, unpinMessage, deleteMessage } = useMessenger()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const disabledText = alpha(themeConfig.brandColors.navy, 0.45)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, message: Message) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedMessage(message)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedMessage(null)
  }

  const handleReply = () => {
    if (selectedMessage) {
      onReply(selectedMessage)
      handleMenuClose()
    }
  }

  const handleForward = () => {
    if (selectedMessage) {
      onForward(selectedMessage)
      handleMenuClose()
    }
  }

  const handleEdit = () => {
    if (selectedMessage) {
      onEdit(selectedMessage)
      handleMenuClose()
    }
  }

  const handlePin = async () => {
    if (selectedMessage) {
      if (selectedMessage.isPinned) {
        await unpinMessage(selectedMessage.id)
      } else {
        await pinMessage(selectedMessage.id)
      }
      handleMenuClose()
    }
  }

  const handleDelete = async () => {
    if (selectedMessage) {
      await deleteMessage(selectedMessage.id)
      handleMenuClose()
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message) return

    const reactions = message.reactions || {}
    const userReacted = reactions[emoji]?.includes(currentUserId)

    if (userReacted) {
      await removeReaction(messageId, emoji)
    } else {
      await addReaction(messageId, emoji)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()

    if (date.toDateString() === now.toDateString()) {
      return format(date, "h:mm a")
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, "MMM d, h:mm a")
    } else {
      return format(date, "MM/dd/yyyy, h:mm a")
    }
  }

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUserId) return null

    switch (message.status) {
      case "sending":
        return <ScheduleIcon sx={{ fontSize: 14, color: disabledText }} />
      case "sent":
        return <CheckCircleIcon sx={{ fontSize: 14, color: disabledText }} />
      case "delivered":
        return <CheckCircleIcon sx={{ fontSize: 14, color: "info.main" }} />
      case "read":
        return <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
      case "failed":
        return <ErrorIcon sx={{ fontSize: 14, color: "error.main" }} />
      default:
        return null
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {}

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: secondaryText }} gutterBottom>
          No messages yet
        </Typography>
        <Typography variant="body2" sx={{ color: disabledText }}>
          Start the conversation by sending a message below
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      height: "100%", 
      width: "100%",
      overflow: "auto", 
      p: 2, 
      overscrollBehavior: "contain",
      flex: 1,
      minHeight: 0,
      maxHeight: "100%",
      bgcolor: themeConfig.brandColors.offWhite,
    }}>
      {Object.entries(messageGroups).map(([date, dateMessages]) => (
        <Box key={date}>
          {/* Date Separator */}
          <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Chip
              label={format(new Date(date), "MMMM d, yyyy")}
              size="small"
              sx={{ mx: 2, bgcolor: "background.paper" }}
            />
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* Messages for this date */}
          {dateMessages.map((message, index) => {
            const isSentByMe = message.senderId === currentUserId
            const showAvatar = !isSentByMe && (index === 0 || dateMessages[index - 1].senderId !== message.senderId)
            const isConsecutive = index > 0 && dateMessages[index - 1].senderId === message.senderId
            const hasReactions = message.reactions && Object.keys(message.reactions).length > 0

            return (
              <Box
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent: isSentByMe ? "flex-end" : "flex-start",
                  mb: isConsecutive ? 0.5 : 2,
                  alignItems: "flex-end",
                }}
              >
                {/* Avatar for received messages */}
                {!isSentByMe && (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1,
                      visibility: showAvatar ? "visible" : "hidden",
                      bgcolor: themeConfig.brandColors.offWhite,
                    }}
                  >
                    {message.firstName?.charAt(0) || "U"}
                  </Avatar>
                )}

                <Box sx={{ maxWidth: "70%", position: "relative" }}>
                  {/* Sender name for group chats */}
                  {!isSentByMe && showAvatar && (
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5, ml: 1, color: secondaryText }}>
                      {message.firstName} {message.lastName}
                    </Typography>
                  )}

                  {/* Forwarded message indicator */}
                  {message.forwardedFrom && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        mb: 0.5,
                        bgcolor: hoverBg,
                        borderLeft: 3,
                        borderColor: "info.main",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: secondaryText }}>
                        Forwarded from {message.forwardedFrom.chatName}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: secondaryText }}>
                        Originally by {message.forwardedFrom.originalSenderName}
                      </Typography>
                    </Paper>
                  )}

                  {/* Reply preview */}
                  {message.replyTo && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        mb: 0.5,
                        bgcolor: hoverBg,
                        borderLeft: 3,
                        borderColor: themeConfig.brandColors.navy,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: secondaryText }}>
                        Replying to message
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {message.replyTo.text.length > 50
                          ? `${message.replyTo.text.substring(0, 50)}...`
                          : message.replyTo.text}
                      </Typography>
                    </Paper>
                  )}

                  {/* Message bubble */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: isSentByMe ? themeConfig.brandColors.navy : "background.paper",
                      color: isSentByMe ? themeConfig.brandColors.offWhite : "text.primary",
                      borderRadius: 2,
                      border: isSentByMe ? "none" : 1,
                      borderColor: "divider",
                      position: "relative",
                      ...(message.isPinned && {
                        borderLeft: 4,
                        borderLeftColor: "warning.main",
                      }),
                    }}
                  >
                    {message.isPinned && (
                      <StarIcon
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          fontSize: 16,
                          color: "warning.main",
                          bgcolor: "background.paper",
                          borderRadius: "50%",
                        }}
                      />
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Typography variant="body1" sx={{ wordBreak: "break-word", flex: 1 }}>
                        {message.text}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, message)}
                        sx={{
                          ml: 1,
                          opacity: 0.7,
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {message.isEdited && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          opacity: 0.7,
                          fontStyle: "italic",
                        }}
                      >
                        (edited)
                      </Typography>
                    )}

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {message.attachments.map((attachment, attachIndex) => (
                          <Chip
                            key={attachIndex}
                            label={attachment.name}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>

                  {/* Reactions */}
                  {hasReactions && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                      {Object.entries(message.reactions || {}).map(([emoji, users]) => (
                        <Chip
                          key={emoji}
                          label={`${emoji} ${users.length}`}
                          size="small"
                          variant={users.includes(currentUserId) ? "filled" : "outlined"}
                          onClick={() => handleReaction(message.id, emoji)}
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: hoverBg,
                            },
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Message info */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: isSentByMe ? "flex-end" : "flex-start",
                      alignItems: "center",
                      mt: 0.5,
                      gap: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: secondaryText }}>
                      {formatTime(message.timestamp)}
                    </Typography>
                    {getMessageStatus(message)}
                  </Box>
                </Box>

                {/* Avatar for sent messages */}
                {isSentByMe && (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      ml: 1,
                      bgcolor: themeConfig.brandColors.navy,
                    }}
                  >
                    {currentUserId.charAt(0).toUpperCase()}
                  </Avatar>
                )}
              </Box>
            )
          })}
        </Box>
      ))}

      {/* Message Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleReply}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleForward}>
          <ListItemIcon>
            <ForwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Forward</ListItemText>
        </MenuItem>

        {selectedMessage?.senderId === currentUserId && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handlePin}>
          <ListItemIcon>
            <PinIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{selectedMessage?.isPinned ? "Unpin" : "Pin"}</ListItemText>
        </MenuItem>

        {selectedMessage?.senderId === currentUserId && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <div ref={messagesEndRef} />
    </Box>
  )
}

export default MessageList
