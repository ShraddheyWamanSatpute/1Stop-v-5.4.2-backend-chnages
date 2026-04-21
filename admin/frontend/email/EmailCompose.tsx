import React, { useCallback, useRef, useState } from "react"
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material"
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  Close as CloseIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletIcon,
  FormatListNumbered as NumberIcon,
  InsertLink as LinkIcon,
  Save as DraftIcon,
  Delete as DiscardIcon,
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
  Minimize as MinimizeIcon,
  OpenInFull as MaximizeIcon,
} from "@mui/icons-material"
import type { ComposeState, EmailAttachment, EmailMessage } from "./types"
import { DEFAULT_COMPOSE } from "./types"

interface EmailComposeProps {
  open: boolean
  onClose: () => void
  onSend: (compose: ComposeState) => Promise<void>
  onSaveDraft: (compose: ComposeState) => Promise<void>
  onDiscard: () => void
  initialData?: Partial<ComposeState>
  replyTo?: EmailMessage | null
  forwardFrom?: EmailMessage | null
  mode?: "compose" | "reply" | "forward"
  senderAccounts?: { email: string; displayName: string; color: string }[]
  selectedAccount?: string
  onAccountChange?: (email: string) => void
}

const EmailCompose: React.FC<EmailComposeProps> = ({
  open,
  onClose,
  onSend,
  onSaveDraft,
  onDiscard,
  initialData,
  replyTo,
  forwardFrom,
  mode = "compose",
  senderAccounts = [],
  selectedAccount,
  onAccountChange,
}) => {
  const [compose, setCompose] = useState<ComposeState>(() => ({
    ...DEFAULT_COMPOSE,
    ...initialData,
    showCc: Boolean(initialData?.cc),
    showBcc: Boolean(initialData?.bcc),
  }))
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null)
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const handleFieldChange = useCallback((field: keyof ComposeState, value: any) => {
    setCompose((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleAttachFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newAttachments: EmailAttachment[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      mimeType: f.type,
    }))
    setCompose((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }))
    e.target.value = ""
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setCompose((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }))
  }, [])

  const handleSend = async () => {
    if (!compose.to.trim()) return
    setSending(true)
    try {
      await onSend(compose)
      onClose()
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    await onSaveDraft(compose)
    onClose()
  }

  const handleDiscard = () => {
    onDiscard()
    onClose()
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    bodyRef.current?.focus()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!open) return null

  const title = mode === "reply" ? `Re: ${replyTo?.subject || ""}` : mode === "forward" ? `Fwd: ${forwardFrom?.subject || ""}` : "New Message"

  const composeWidth = maximized ? "100%" : minimized ? 320 : 580
  const composeHeight = maximized ? "100%" : minimized ? 48 : "auto"

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: maximized ? 0 : 0,
        right: maximized ? 0 : 16,
        width: composeWidth,
        maxWidth: maximized ? "100%" : 580,
        maxHeight: maximized ? "100vh" : "80vh",
        height: composeHeight,
        zIndex: 1300,
        display: "flex",
        flexDirection: "column",
        borderRadius: maximized ? 0 : "12px 12px 0 0",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          bgcolor: "grey.900",
          color: "#fff",
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => minimized && setMinimized(false)}
      >
        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {title}
        </Typography>
        <IconButton size="small" sx={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); setMinimized((p) => !p) }}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); setMaximized((p) => !p); setMinimized(false) }}>
          <MaximizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); onClose() }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!minimized && (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
          {/* Sender Account Selector */}
          {senderAccounts.length > 1 && (
            <Box sx={{ px: 2, pt: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                From:
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={(e) => setAccountMenuAnchor(e.currentTarget)}
                sx={{ textTransform: "none" }}
              >
                {selectedAccount || senderAccounts[0]?.email || "Select account"}
              </Button>
              <Menu
                anchorEl={accountMenuAnchor}
                open={Boolean(accountMenuAnchor)}
                onClose={() => setAccountMenuAnchor(null)}
              >
                {senderAccounts.map((acc) => (
                  <MenuItem
                    key={acc.email}
                    onClick={() => { onAccountChange?.(acc.email); setAccountMenuAnchor(null) }}
                    selected={acc.email === selectedAccount}
                  >
                    <ListItemIcon>
                      <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: acc.color }} />
                    </ListItemIcon>
                    <ListItemText primary={acc.displayName} secondary={acc.email} />
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}

          {/* To / CC / BCC Fields */}
          <Box sx={{ px: 2, pt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                To:
              </Typography>
              <TextField
                size="small"
                fullWidth
                variant="standard"
                value={compose.to}
                onChange={(e) => handleFieldChange("to", e.target.value)}
                placeholder="Recipients"
                InputProps={{ disableUnderline: false }}
              />
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {!compose.showCc && (
                  <Button size="small" variant="text" sx={{ minWidth: 0, textTransform: "none", fontSize: 12 }} onClick={() => handleFieldChange("showCc", true)}>
                    Cc
                  </Button>
                )}
                {!compose.showBcc && (
                  <Button size="small" variant="text" sx={{ minWidth: 0, textTransform: "none", fontSize: 12 }} onClick={() => handleFieldChange("showBcc", true)}>
                    Bcc
                  </Button>
                )}
              </Box>
            </Box>

            <Collapse in={compose.showCc}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                  Cc:
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  variant="standard"
                  value={compose.cc}
                  onChange={(e) => handleFieldChange("cc", e.target.value)}
                  placeholder="CC recipients"
                  InputProps={{ disableUnderline: false }}
                />
              </Box>
            </Collapse>

            <Collapse in={compose.showBcc}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                  Bcc:
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  variant="standard"
                  value={compose.bcc}
                  onChange={(e) => handleFieldChange("bcc", e.target.value)}
                  placeholder="BCC recipients"
                  InputProps={{ disableUnderline: false }}
                />
              </Box>
            </Collapse>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                Subject:
              </Typography>
              <TextField
                size="small"
                fullWidth
                variant="standard"
                value={compose.subject}
                onChange={(e) => handleFieldChange("subject", e.target.value)}
                placeholder="Subject"
                InputProps={{ disableUnderline: false }}
              />
            </Box>
          </Box>

          <Divider sx={{ mt: 1 }} />

          {/* Formatting Toolbar */}
          <Box sx={{ px: 1, py: 0.5, display: "flex", gap: 0, flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}>
            <Tooltip title="Bold"><IconButton size="small" onClick={() => execCommand("bold")}><BoldIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Italic"><IconButton size="small" onClick={() => execCommand("italic")}><ItalicIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Underline"><IconButton size="small" onClick={() => execCommand("underline")}><UnderlineIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Bulleted list"><IconButton size="small" onClick={() => execCommand("insertUnorderedList")}><BulletIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Numbered list"><IconButton size="small" onClick={() => execCommand("insertOrderedList")}><NumberIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Quote"><IconButton size="small" onClick={() => execCommand("formatBlock", "blockquote")}><QuoteIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Code"><IconButton size="small" onClick={() => execCommand("formatBlock", "pre")}><CodeIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Insert link">
              <IconButton size="small" onClick={() => {
                const url = prompt("Enter URL:")
                if (url) execCommand("createLink", url)
              }}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Body */}
          <Box
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              const el = e.currentTarget
              handleFieldChange("body", el.innerText)
              handleFieldChange("bodyHtml", el.innerHTML)
            }}
            dangerouslySetInnerHTML={{ __html: compose.bodyHtml || compose.body || "" }}
            sx={{
              flex: 1,
              minHeight: 200,
              maxHeight: maximized ? "calc(100vh - 350px)" : 400,
              overflow: "auto",
              px: 2,
              py: 1.5,
              outline: "none",
              fontSize: 14,
              lineHeight: 1.6,
              "& blockquote": {
                borderLeft: "3px solid #ccc",
                pl: 1.5,
                ml: 0,
                color: "text.secondary",
              },
              "& pre": {
                bgcolor: "grey.100",
                p: 1,
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: 13,
              },
            }}
          />

          {/* Attachments */}
          {compose.attachments.length > 0 && (
            <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Attachments ({compose.attachments.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {compose.attachments.map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.name} (${formatFileSize(a.size)})`}
                    size="small"
                    onDelete={() => handleRemoveAttachment(a.id)}
                    icon={<AttachIcon fontSize="small" />}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Footer Actions */}
          <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, borderTop: 1, borderColor: "divider" }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleSend}
              disabled={sending || !compose.to.trim()}
              size="small"
            >
              {sending ? "Sending..." : "Send"}
            </Button>

            <Tooltip title="Attach files">
              <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                <AttachIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleAttachFiles}
            />

            <Box sx={{ flex: 1 }} />

            <Tooltip title="More options">
              <IconButton size="small" onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={moreMenuAnchor} open={Boolean(moreMenuAnchor)} onClose={() => setMoreMenuAnchor(null)}>
              <MenuItem onClick={() => { handleSaveDraft(); setMoreMenuAnchor(null) }}>
                <ListItemIcon><DraftIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Save as Draft</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMoreMenuAnchor(null) }}>
                <ListItemIcon><ScheduleIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Schedule Send</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { handleDiscard(); setMoreMenuAnchor(null) }}>
                <ListItemIcon><DiscardIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText sx={{ color: "error.main" }}>Discard Draft</ListItemText>
              </MenuItem>
            </Menu>

            <Tooltip title="Discard">
              <IconButton size="small" onClick={handleDiscard}>
                <DiscardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Paper>
  )
}

export default EmailCompose
