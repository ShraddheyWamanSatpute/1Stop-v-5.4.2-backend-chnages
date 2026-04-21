"use client"

import type React from "react"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"
import { ContentCopy as CopyIcon, Email as EmailIcon, WhatsApp as WhatsAppIcon } from "@mui/icons-material"

export interface SupplyClientInviteDialogProps {
  open: boolean
  onClose: () => void
  inviteLink: string
  companyName?: string
  client?: {
    contactName?: string
    email?: string
    phone?: string
  } | null
}

const SupplyClientInviteDialog: React.FC<SupplyClientInviteDialogProps> = ({ open, onClose, inviteLink, companyName, client }) => {
  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      // ignore
    }
  }

  const handleEmail = () => {
    if (!client?.email || !inviteLink) return
    const subject = encodeURIComponent(`Client invite - ${companyName || "our company"}`)
    const body = encodeURIComponent(
      `Hello${client?.contactName ? ` ${client.contactName}` : ""},\n\n` +
        `You've been invited to connect with ${companyName || "our company"}.\n\n` +
        `Invite link:\n${inviteLink}\n\n`,
    )
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, "_blank")
  }

  const handleWhatsApp = () => {
    if (!client?.phone || !inviteLink) return
    const phoneNumber = client.phone.replace(/\D/g, "")
    const text = encodeURIComponent(`You've been invited to connect with ${companyName || "our company"}. Link: ${inviteLink}`)
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, "_blank")
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Client</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField fullWidth label="Invite Link" value={inviteLink} InputProps={{ readOnly: true }} />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" startIcon={<CopyIcon />} onClick={() => void handleCopy()} disabled={!inviteLink}>
              Copy Link
            </Button>
            <Button variant="outlined" startIcon={<EmailIcon />} onClick={handleEmail} disabled={!inviteLink || !client?.email}>
              Email
            </Button>
            <Button variant="outlined" startIcon={<WhatsAppIcon />} onClick={handleWhatsApp} disabled={!inviteLink || !client?.phone}>
              WhatsApp
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Invite acceptance page is coming next — for now this link is generated + stored in Supply under `clientInvites`.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default SupplyClientInviteDialog

