"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState } from "react"
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  Circle as CircleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useMessenger } from "../../../backend/context/MessengerContext"
import { auth } from "../../../backend/services/Firebase"
import { useTheme } from "@mui/material/styles"

interface UserStatusBarProps {
  onLogout?: () => void
  onSettings?: () => void
}

const UserStatusBar: React.FC<UserStatusBarProps> = ({ onLogout, onSettings }) => {
  const { state, setUserStatus } = useMessenger()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [customStatus, setCustomStatus] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"online" | "away" | "busy" | "offline">("online")
  const theme = useTheme()
  const secondaryText = alpha(themeConfig.brandColors.navy, 0.7)
  const disabledText = alpha(themeConfig.brandColors.navy, 0.45)
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)
  const selectedBg = alpha(themeConfig.brandColors.navy, 0.08)

  const currentUser = auth.currentUser
  const currentUserDetails = state.users?.find((user) => user.uid === currentUser?.uid)
  const currentUserStatus = state.userStatuses?.[currentUser?.uid || ""]

  const statusOptions: Array<{ status: "online" | "away" | "busy" | "offline"; label: string; color: string }> = [
    { status: "online", label: "Online", color: theme.palette.success.main },
    { status: "away", label: "Away", color: theme.palette.warning.main },
    { status: "busy", label: "Busy", color: theme.palette.error.main },
    { status: "offline", label: "Offline", color: disabledText },
  ]

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleStatusClick = () => {
    setShowStatusDialog(true)
    setSelectedStatus(currentUserStatus?.status || "online")
    setCustomStatus(currentUserStatus?.customStatus || "")
    handleMenuClose()
  }

  const handleStatusSave = async () => {
    // setUserStatus only accepts one argument (status)
    await setUserStatus(selectedStatus, customStatus || undefined)
    setShowStatusDialog(false)
  }

  const handleStatusCancel = () => {
    setShowStatusDialog(false)
    setSelectedStatus(currentUserStatus?.status || "online")
    setCustomStatus(currentUserStatus?.customStatus || "")
  }

  const getCurrentStatusColor = () => {
    const status = currentUserStatus?.status || "offline"
    return statusOptions.find((opt) => opt.status === status)?.color || disabledText
  }

  const getCurrentStatusLabel = () => {
    const status = currentUserStatus?.status || "offline"
    return statusOptions.find((opt) => opt.status === status)?.label || "Offline"
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: themeConfig.brandColors.navy,
            }}
          >
            {currentUserDetails?.firstName?.charAt(0) || currentUser?.email?.charAt(0) || "U"}
          </Avatar>
          <CircleIcon
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              color: getCurrentStatusColor(),
              bgcolor: "background.paper",
              borderRadius: "50%",
            }}
          />
        </Box>

        <Box sx={{ flex: 1, ml: 2, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {currentUserDetails
              ? `${currentUserDetails.firstName} ${currentUserDetails.lastName}`
              : currentUser?.email || "User"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: secondaryText }}>
              {getCurrentStatusLabel()}
            </Typography>
            {currentUserStatus?.customStatus && (
              <Chip
                label={currentUserStatus.customStatus}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
          </Box>
        </Box>

        <IconButton onClick={handleMenuClick} size="small">
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* User Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleStatusClick}>
          <ListItemIcon>
            <CircleIcon sx={{ color: getCurrentStatusColor() }} />
          </ListItemIcon>
          <ListItemText>
            <Box>
              <Typography variant="body2">Status: {getCurrentStatusLabel()}</Typography>
              {currentUserStatus?.customStatus && (
                <Typography variant="caption" sx={{ color: secondaryText }}>
                  {currentUserStatus.customStatus}
                </Typography>
              )}
            </Box>
          </ListItemText>
        </MenuItem>
        <Divider />
        {onSettings && (
          <MenuItem onClick={onSettings}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        )}
        {onLogout && (
          <MenuItem onClick={onLogout} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <LogoutIcon color="error" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onClose={handleStatusCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Status
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {statusOptions.map((option) => (
                <Box
                  key={option.status}
                  onClick={() => setSelectedStatus(option.status)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor: selectedStatus === option.status ? selectedBg : "transparent",
                    "&:hover": {
                      bgcolor: hoverBg,
                    },
                  }}
                >
                  <CircleIcon sx={{ color: option.color, mr: 2 }} />
                  <Typography variant="body2">{option.label}</Typography>
                  {selectedStatus === option.status && <CheckIcon sx={{ ml: "auto", color: themeConfig.brandColors.navy }} />}
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Custom Status Message (Optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="What's on your mind?"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              variant="outlined"
              size="small"
              inputProps={{ maxLength: 100 }}
              helperText={`${customStatus.length}/100 characters`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStatusCancel} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button onClick={handleStatusSave} variant="contained" startIcon={<CheckIcon />}>
            Save Status
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default UserStatusBar
