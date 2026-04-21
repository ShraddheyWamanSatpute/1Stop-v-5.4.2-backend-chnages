import React, { useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Palette as PaletteIcon,
  Star as DefaultIcon,
  StarBorder as NotDefaultIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
} from "@mui/icons-material"
import type { EmailAccountConfig, GmailAppPasswordConfig, EmailProvider } from "./types"
import { DEFAULT_ACCOUNT_COLORS } from "./types"

interface EmailSettingsProps {
  accounts: EmailAccountConfig[]
  gmailMailbox: GmailAppPasswordConfig
  oauthStatus: { gmail?: any; outlook?: any } | null
  onSaveGmailMailbox: (config: GmailAppPasswordConfig) => Promise<void>
  onBeginOAuth: (provider: EmailProvider) => void
  onDisconnectProvider: (provider: EmailProvider) => Promise<void>
  onSyncInbox: (provider: EmailProvider) => Promise<void>
  onUpdateAccount: (account: EmailAccountConfig) => Promise<void>
  onDeleteAccount: (id: string) => Promise<void>
  onSetDefaultAccount: (id: string) => Promise<void>
}

const EmailSettings: React.FC<EmailSettingsProps> = ({
  accounts,
  gmailMailbox: initialGmailMailbox,
  oauthStatus,
  onSaveGmailMailbox,
  onBeginOAuth,
  onDisconnectProvider,
  onSyncInbox,
  onUpdateAccount,
  onDeleteAccount,
  onSetDefaultAccount,
}) => {
  const [gmailMode, setGmailMode] = useState<"view" | "edit">("view")
  const [gmailMailbox, setGmailMailbox] = useState<GmailAppPasswordConfig>(initialGmailMailbox)
  const [gmailSaving, setGmailSaving] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EmailAccountConfig | null>(null)
  const [editDialog, setEditDialog] = useState(false)
  const [editColor, setEditColor] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editSignature, setEditSignature] = useState("")

  const saveGmailMailbox = async () => {
    const email = gmailMailbox.email.trim()
    const senderName = (gmailMailbox.senderName || "").trim() || "1Stop Admin"
    const appPassword = gmailMailbox.appPassword.trim()
    if (!email || !appPassword) return
    setGmailSaving(true)
    try {
      await onSaveGmailMailbox({ email, senderName, appPassword, updatedAt: Date.now() })
      setGmailMailbox((p) => ({ ...p, email, senderName, appPassword: "", updatedAt: Date.now() }))
      setGmailMode("view")
    } finally {
      setGmailSaving(false)
    }
  }

  const openEditAccount = (acc: EmailAccountConfig) => {
    setEditingAccount(acc)
    setEditColor(acc.color)
    setEditDisplayName(acc.displayName)
    setEditSignature(acc.signature || "")
    setEditDialog(true)
  }

  const saveEditAccount = async () => {
    if (!editingAccount) return
    await onUpdateAccount({
      ...editingAccount,
      color: editColor,
      displayName: editDisplayName,
      signature: editSignature,
    })
    setEditDialog(false)
    setEditingAccount(null)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 2, overflow: "auto" }}>
      {/* Gmail App Password Configuration */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
          Gmail App Password (SMTP Sending)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure a Gmail App Password to send emails via SMTP. The password is never shown again after saving.
        </Typography>

        <Box sx={{ display: "grid", gap: 1.5, maxWidth: 500 }}>
          <TextField
            size="small"
            label="Gmail address"
            value={gmailMailbox.email}
            disabled={gmailMode === "view"}
            onChange={(e) => setGmailMailbox((p) => ({ ...p, email: e.target.value }))}
            fullWidth
          />
          <TextField
            size="small"
            label="Sender name"
            value={gmailMailbox.senderName}
            disabled={gmailMode === "view"}
            onChange={(e) => setGmailMailbox((p) => ({ ...p, senderName: e.target.value }))}
            fullWidth
          />
          <TextField
            size="small"
            label="Gmail App Password"
            type="password"
            value={gmailMailbox.appPassword}
            disabled={gmailMode === "view"}
            onChange={(e) => setGmailMailbox((p) => ({ ...p, appPassword: e.target.value }))}
            helperText={gmailMode === "view" ? "Enter a new app password to update" : "Required to save"}
            fullWidth
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            {gmailMode === "view" ? (
              <Button variant="outlined" onClick={() => setGmailMode("edit")}>
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={() => { setGmailMode("view"); setGmailMailbox((p) => ({ ...p, appPassword: "" })) }}
                  disabled={gmailSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={saveGmailMailbox}
                  disabled={gmailSaving || !gmailMailbox.email.trim() || !gmailMailbox.appPassword.trim()}
                >
                  {gmailSaving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </Box>
        </Box>

        {gmailMailbox.email.trim() && (
          <Alert severity="success" sx={{ mt: 2 }}>
            SMTP configured for: <strong>{gmailMailbox.email}</strong>
            {gmailMailbox.updatedAt && (
              <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                (last updated: {new Date(gmailMailbox.updatedAt).toLocaleString()})
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* Connected Accounts / OAuth */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
          Connected Email Providers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Connect your email providers to sync your inbox. OAuth tokens are stored securely in Firestore.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Connected Email</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(["gmail", "outlook"] as EmailProvider[]).map((provider) => {
                const isConnected = Boolean((oauthStatus as any)?.[provider]?.connected)
                const connectedEmail = (oauthStatus as any)?.[provider]?.email || ""
                return (
                  <TableRow key={provider} hover>
                    <TableCell>
                      <Typography fontWeight={800} sx={{ textTransform: "capitalize" }}>
                        {provider}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={isConnected ? "Connected" : "Not Connected"}
                        color={isConnected ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>{connectedEmail || "—"}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "inline-flex", gap: 1, flexWrap: "wrap" }}>
                        <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => onBeginOAuth(provider)}>
                          {isConnected ? "Reconnect" : "Connect"}
                        </Button>
                        {isConnected && (
                          <>
                            <Button size="small" variant="outlined" startIcon={<UnlinkIcon />} onClick={() => onDisconnectProvider(provider)}>
                              Disconnect
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<SyncIcon />} onClick={() => onSyncInbox(provider)}>
                              Sync
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Account Customisation */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
          Account Customisation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Customise display names, colors, and signatures for each connected account. Colors appear as accent indicators in the inbox.
        </Typography>

        {accounts.length === 0 ? (
          <Alert severity="info">
            No accounts configured yet. Connect an email provider above or configure Gmail App Password to get started.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Color</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id} hover>
                    <TableCell>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: acc.color || "#4285f4",
                          border: "2px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                        }}
                        onClick={() => openEditAccount(acc)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{acc.displayName || acc.email}</Typography>
                    </TableCell>
                    <TableCell>{acc.email}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>{acc.provider}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => onSetDefaultAccount(acc.id)}
                        sx={{ color: acc.isDefault ? "#f4b400" : "text.disabled" }}
                      >
                        {acc.isDefault ? <DefaultIcon fontSize="small" /> : <NotDefaultIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                        <Tooltip title="Customise">
                          <IconButton size="small" onClick={() => openEditAccount(acc)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => onDeleteAccount(acc.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit Account Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Customise Account
          <IconButton onClick={() => setEditDialog(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingAccount && (
            <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
              <TextField
                label="Display Name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                fullWidth
                size="small"
              />

              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  Account Color
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {DEFAULT_ACCOUNT_COLORS.map((c) => (
                    <Box
                      key={c}
                      onClick={() => setEditColor(c)}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: c,
                        cursor: "pointer",
                        border: editColor === c ? "3px solid" : "2px solid transparent",
                        borderColor: editColor === c ? "text.primary" : "transparent",
                        transition: "all 0.15s",
                        "&:hover": { transform: "scale(1.15)" },
                      }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Custom:
                  </Typography>
                  <input
                    type="color"
                    value={editColor || "#4285f4"}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ width: 36, height: 28, border: "none", cursor: "pointer", padding: 0 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {editColor}
                  </Typography>
                </Box>
              </Box>

              <TextField
                label="Email Signature"
                value={editSignature}
                onChange={(e) => setEditSignature(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                size="small"
                placeholder="Your email signature (supports plain text)"
                helperText="This signature will be appended to emails sent from this account."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditAccount}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EmailSettings
