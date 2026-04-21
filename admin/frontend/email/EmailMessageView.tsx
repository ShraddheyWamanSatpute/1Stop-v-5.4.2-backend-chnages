import React, { useState } from "react"
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Avatar,
} from "@mui/material"
import {
  Reply as ReplyIcon,
  ReplyAll as ReplyAllIcon,
  Forward as ForwardIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Label as LabelIcon,
  Print as PrintIcon,
  MoreVert as MoreIcon,
  ArrowBack as BackIcon,
  AttachFile as AttachmentIcon,
  Download as DownloadIcon,
  OpenInNew as OpenIcon,
  Report as SpamIcon,
  MoveToInbox as MoveIcon,
  DraftsOutlined as ReadIcon,
  MarkunreadMailbox as UnreadIcon,
} from "@mui/icons-material"
import type { EmailMessage } from "./types"
import { LABEL_COLORS } from "./types"

interface EmailMessageViewProps {
  message: EmailMessage
  onBack: () => void
  onReply: (m: EmailMessage) => void
  onReplyAll: (m: EmailMessage) => void
  onForward: (m: EmailMessage) => void
  onToggleStar: (id: string, starred: boolean) => void
  onToggleRead: (ids: string[], read: boolean) => void
  onDelete: (ids: string[]) => void
  onArchive: (ids: string[]) => void
  onMarkSpam: (ids: string[]) => void
  accountColors?: Record<string, string>
}

const EmailMessageView: React.FC<EmailMessageViewProps> = ({
  message,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onToggleStar,
  onToggleRead,
  onDelete,
  onArchive,
  onMarkSpam,
  accountColors = {},
}) => {
  const [showFullHeaders, setShowFullHeaders] = useState(false)

  const senderEmail = message.direction === "inbound" ? message.from : message.to
  const accentColor = accountColors[senderEmail] || "#4285f4"

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    const parts = name.split(/[\s@]/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0]?.[0]?.toUpperCase() || "?"
  }

  const senderName = message.fromName || message.from || "Unknown"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Top Action Bar */}
      <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 0.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <Tooltip title="Back to inbox">
          <IconButton onClick={onBack} size="small">
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="Archive">
          <IconButton size="small" onClick={() => onArchive([message.id])}>
            <ArchiveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Report spam">
          <IconButton size="small" onClick={() => onMarkSpam([message.id])}>
            <SpamIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete([message.id])}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title={message.read ? "Mark as unread" : "Mark as read"}>
          <IconButton size="small" onClick={() => onToggleRead([message.id], !message.read)}>
            {message.read ? <UnreadIcon fontSize="small" /> : <ReadIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Labels">
          <IconButton size="small">
            <LabelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Print">
          <IconButton size="small" onClick={() => window.print()}>
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Message Content */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {/* Subject */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
          <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
            {message.subject || "(no subject)"}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", flexShrink: 0 }}>
            {(message.labels || []).map((l) => (
              <Chip
                key={l}
                label={l}
                size="small"
                sx={{
                  bgcolor: LABEL_COLORS[l] || "#e0e0e0",
                  color: "#fff",
                  textTransform: "capitalize",
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Sender Info */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: accentColor,
              width: 44,
              height: 44,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {getInitials(senderName)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography fontWeight={700}>
                {senderName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                &lt;{message.from}&gt;
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {formatDate(message.receivedAt || message.updatedAt)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onToggleStar(message.id, !message.starred)}
                sx={{ color: message.starred ? "#f4b400" : "text.disabled" }}
              >
                {message.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              <Typography variant="body2" color="text.secondary">
                to {message.to}
              </Typography>
              {message.cc && (
                <Typography variant="body2" color="text.secondary">
                  , cc: {message.cc}
                </Typography>
              )}
              <Button
                size="small"
                variant="text"
                sx={{ minWidth: 0, textTransform: "none", fontSize: 11, p: 0, ml: 0.5 }}
                onClick={() => setShowFullHeaders((p) => !p)}
              >
                {showFullHeaders ? "Hide details" : "Show details"}
              </Button>
            </Box>

            {showFullHeaders && (
              <Paper variant="outlined" sx={{ mt: 1, p: 1.5, fontSize: 12 }}>
                <Typography variant="caption" component="div"><strong>From:</strong> {message.from}</Typography>
                <Typography variant="caption" component="div"><strong>To:</strong> {message.to}</Typography>
                {message.cc && <Typography variant="caption" component="div"><strong>Cc:</strong> {message.cc}</Typography>}
                {message.bcc && <Typography variant="caption" component="div"><strong>Bcc:</strong> {message.bcc}</Typography>}
                {message.replyTo && <Typography variant="caption" component="div"><strong>Reply-To:</strong> {message.replyTo}</Typography>}
                <Typography variant="caption" component="div"><strong>Date:</strong> {formatDate(message.receivedAt || message.updatedAt)}</Typography>
                <Typography variant="caption" component="div"><strong>Direction:</strong> {message.direction}</Typography>
                {message.threadId && <Typography variant="caption" component="div"><strong>Thread ID:</strong> {message.threadId}</Typography>}
              </Paper>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Message Body */}
        {message.bodyHtml ? (
          <Box
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            sx={{
              fontSize: 14,
              lineHeight: 1.7,
              "& a": { color: "primary.main" },
              "& img": { maxWidth: "100%", height: "auto" },
              "& blockquote": {
                borderLeft: "3px solid #ccc",
                pl: 2,
                ml: 0,
                color: "text.secondary",
              },
            }}
          />
        ) : (
          <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>
            {message.body || message.bodyPreview || "(no content)"}
          </Typography>
        )}

        {/* Attachments */}
        {(message.attachments || []).length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              Attachments ({message.attachments!.length})
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {message.attachments!.map((a) => (
                <Paper
                  key={a.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 200,
                    maxWidth: 300,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => a.url && window.open(a.url, "_blank")}
                >
                  <AttachmentIcon fontSize="small" color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap fontWeight={600}>
                      {a.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(a.size)}
                    </Typography>
                  </Box>
                  {a.url && (
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank") }}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* Reply / Forward Actions */}
        <Box sx={{ mt: 4, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<ReplyIcon />} onClick={() => onReply(message)} size="small">
            Reply
          </Button>
          {message.cc && (
            <Button variant="outlined" startIcon={<ReplyAllIcon />} onClick={() => onReplyAll(message)} size="small">
              Reply All
            </Button>
          )}
          <Button variant="outlined" startIcon={<ForwardIcon />} onClick={() => onForward(message)} size="small">
            Forward
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default EmailMessageView
