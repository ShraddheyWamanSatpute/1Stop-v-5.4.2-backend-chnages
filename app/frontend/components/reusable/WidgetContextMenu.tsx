"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"
import { Settings as SettingsIcon, Delete as DeleteIcon, ContentCopy as DuplicateIcon } from "@mui/icons-material"
import type { WidgetContextMenuProps } from "../../types/WidgetTypes"

// Update the WidgetContextMenu component to work better with touch
const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  open,
  position,
  onClose,
  widgetId,
  onSettingsOpen,
  onRemove,
  onDuplicate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, onClose])

  return (
    <Menu
      ref={menuRef}
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={position ? { top: position.y, left: position.x } : undefined}
      PaperProps={{
        elevation: 3,
        sx: {
          minWidth: 180,
          borderRadius: "8px",
          overflow: "hidden",
        },
      }}
    >
      <MenuItem
        onClick={() => {
          onSettingsOpen(widgetId)
          onClose()
        }}
      >
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Widget Settings</ListItemText>
      </MenuItem>

      {onDuplicate && (
        <MenuItem
          onClick={() => {
            onDuplicate()
            onClose()
          }}
        >
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate Widget</ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onRemove()
          onClose()
        }}
      >
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText sx={{ color: "error.main" }}>Remove Widget</ListItemText>
      </MenuItem>
    </Menu>
  )
}

export default WidgetContextMenu
