import React, { useCallback, useMemo, useState } from "react"
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  InputLabel,
  Badge,
} from "@mui/material"
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Label as LabelIcon,
  MarkunreadMailbox as UnreadIcon,
  DraftsOutlined as ReadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Report as SpamIcon,
  AttachFile as AttachmentIcon,
} from "@mui/icons-material"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import type { EmailMessage, EmailDirection } from "./types"
import { LABEL_COLORS } from "./types"

interface EmailInboxProps {
  messages: EmailMessage[]
  onOpenMessage: (m: EmailMessage) => void
  onComposeNew: () => void
  onSyncInboxes: () => void
  onToggleStar: (id: string, starred: boolean) => void
  onToggleRead: (ids: string[], read: boolean) => void
  onDeleteMessages: (ids: string[]) => void
  onArchiveMessages: (ids: string[]) => void
  onLabelMessages: (ids: string[], label: string) => void
  onMarkSpam: (ids: string[]) => void
  accountColors?: Record<string, string>
}

const EmailInbox: React.FC<EmailInboxProps> = ({
  messages,
  onOpenMessage,
  onComposeNew,
  onSyncInboxes,
  onToggleStar,
  onToggleRead,
  onDeleteMessages,
  onArchiveMessages,
  onLabelMessages,
  onMarkSpam,
  accountColors = {},
}) => {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [directionFilter, setDirectionFilter] = useState<EmailDirection | "all">("all")
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all")
  const [labelFilter, setLabelFilter] = useState<string>("all")
  const [starredFilter, setStarredFilter] = useState<boolean | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null)
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<null | HTMLElement>(null)

  const allLabels = useMemo(() => {
    const labelSet = new Set<string>()
    messages.forEach((m) => m.labels?.forEach((l) => labelSet.add(l)))
    return Array.from(labelSet).sort()
  }, [messages])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages.filter((m) => {
      if (directionFilter !== "all" && m.direction !== directionFilter) return false
      if (readFilter === "read" && !m.read) return false
      if (readFilter === "unread" && m.read) return false
      if (starredFilter === true && !m.starred) return false
      if (starredFilter === false && m.starred) return false
      if (labelFilter !== "all" && !(m.labels || []).includes(labelFilter)) return false
      if (!q) return true
      return (
        (m.subject || "").toLowerCase().includes(q) ||
        (m.from || "").toLowerCase().includes(q) ||
        (m.fromName || "").toLowerCase().includes(q) ||
        (m.to || "").toLowerCase().includes(q) ||
        (m.bodyPreview || "").toLowerCase().includes(q)
      )
    })
  }, [messages, search, directionFilter, readFilter, labelFilter, starredFilter])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const unreadCount = useMemo(() => messages.filter((m) => !m.read).length, [messages])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map((m) => m.id)))
    }
  }, [paginated, selectedIds])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkAction = (action: string) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    switch (action) {
      case "read": onToggleRead(ids, true); break
      case "unread": onToggleRead(ids, false); break
      case "delete": onDeleteMessages(ids); break
      case "archive": onArchiveMessages(ids); break
      case "spam": onMarkSpam(ids); break
    }
    setSelectedIds(new Set())
    setBulkMenuAnchor(null)
  }

  const handleLabelAction = (label: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length) onLabelMessages(ids, label)
    setSelectedIds(new Set())
    setLabelMenuAnchor(null)
  }

  const getAccountColor = (email: string) => {
    return accountColors[email] || "#4285f4"
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const isThisYear = d.getFullYear() === now.getFullYear()
    if (isThisYear) return d.toLocaleDateString([], { month: "short", day: "numeric" })
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }

  const hasSelection = selectedIds.size > 0

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search & Actions Bar */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Toggle filters">
            <IconButton onClick={() => setShowFilters((p) => !p)} color={showFilters ? "primary" : "default"}>
              <Badge badgeContent={[directionFilter !== "all" ? 1 : 0, readFilter !== "all" ? 1 : 0, labelFilter !== "all" ? 1 : 0, starredFilter !== null ? 1 : 0].reduce((a, b) => a + b, 0)} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Pull latest from email providers">
            <IconButton onClick={onSyncInboxes} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<SendIcon />} onClick={onComposeNew} size="small">
            Compose
          </Button>
        </Box>

        {/* Filter Row */}
        {showFilters && (
          <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Direction</InputLabel>
              <Select
                value={directionFilter}
                label="Direction"
                onChange={(e) => { setDirectionFilter(e.target.value as any); setPage(0) }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="inbound">Inbound</MenuItem>
                <MenuItem value="outbound">Outbound</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Read Status</InputLabel>
              <Select
                value={readFilter}
                label="Read Status"
                onChange={(e) => { setReadFilter(e.target.value as any); setPage(0) }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="read">Read</MenuItem>
                <MenuItem value="unread">Unread</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Starred</InputLabel>
              <Select
                value={starredFilter === null ? "all" : starredFilter ? "starred" : "not"}
                label="Starred"
                onChange={(e) => {
                  const v = e.target.value
                  setStarredFilter(v === "all" ? null : v === "starred")
                  setPage(0)
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="starred">Starred</MenuItem>
                <MenuItem value="not">Not Starred</MenuItem>
              </Select>
            </FormControl>

            {allLabels.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Label</InputLabel>
                <Select
                  value={labelFilter}
                  label="Label"
                  onChange={(e) => { setLabelFilter(e.target.value); setPage(0) }}
                >
                  <MenuItem value="all">All</MenuItem>
                  {allLabels.map((l) => (
                    <MenuItem key={l} value={l}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: LABEL_COLORS[l] || "#999" }} />
                        {l}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button size="small" onClick={() => { setDirectionFilter("all"); setReadFilter("all"); setLabelFilter("all"); setStarredFilter(null); setPage(0) }}>
              Clear Filters
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              {unreadCount} unread · {filtered.length} shown of {messages.length}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <Box sx={{ px: 2, py: 0.5, display: "flex", gap: 0.5, alignItems: "center", bgcolor: "action.selected", borderBottom: 1, borderColor: "divider" }}>
          <Checkbox
            checked={selectedIds.size === paginated.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < paginated.length}
            onChange={handleSelectAll}
            size="small"
          />
          <Typography variant="body2" sx={{ mr: 1 }}>
            {selectedIds.size} selected
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Mark as read">
            <IconButton size="small" onClick={() => handleBulkAction("read")}>
              <ReadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Mark as unread">
            <IconButton size="small" onClick={() => handleBulkAction("unread")}>
              <UnreadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive">
            <IconButton size="small" onClick={() => handleBulkAction("archive")}>
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Report spam">
            <IconButton size="small" onClick={() => handleBulkAction("spam")}>
              <SpamIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleBulkAction("delete")}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Label">
            <IconButton size="small" onClick={(e) => setLabelMenuAnchor(e.currentTarget)}>
              <LabelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={labelMenuAnchor} open={Boolean(labelMenuAnchor)} onClose={() => setLabelMenuAnchor(null)}>
            {["primary", "social", "promotions", "updates", "important"].map((label) => (
              <MenuItem key={label} onClick={() => handleLabelAction(label)}>
                <ListItemIcon>
                  <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: LABEL_COLORS[label] || "#999" }} />
                </ListItemIcon>
                <ListItemText sx={{ textTransform: "capitalize" }}>{label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}

      {/* Message List */}
      <TableContainer sx={{ flex: 1, overflow: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 42 }}>
                <Checkbox
                  checked={paginated.length > 0 && selectedIds.size === paginated.length}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < paginated.length}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ width: 42 }} />
              <TableCell sx={{ width: 200 }}>From / To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell sx={{ width: 100 }}>Labels</TableCell>
              <TableCell sx={{ width: 48 }} />
              <TableCell sx={{ width: 110 }} align="right">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((m) => {
              const isSelected = selectedIds.has(m.id)
              const isUnread = !m.read
              const senderEmail = m.direction === "inbound" ? m.from : m.to
              const accentColor = getAccountColor(senderEmail)
              return (
                <TableRow
                  key={m.id}
                  hover
                  selected={isSelected}
                  sx={{
                    cursor: "pointer",
                    bgcolor: isUnread ? "action.hover" : "transparent",
                    borderLeft: `3px solid ${accentColor}`,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => handleToggleSelect(m.id)} size="small" />
                  </TableCell>
                  <TableCell onClick={(e) => { e.stopPropagation(); onToggleStar(m.id, !m.starred) }} sx={{ px: 0 }}>
                    <IconButton size="small" sx={{ color: m.starred ? "#f4b400" : "text.disabled" }}>
                      {m.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell onClick={() => onOpenMessage(m)}>
                    <Typography variant="body2" fontWeight={isUnread ? 800 : 400} noWrap>
                      {m.direction === "inbound" ? (m.fromName || m.from) : `To: ${m.to}`}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={() => onOpenMessage(m)}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" fontWeight={isUnread ? 800 : 400} noWrap sx={{ maxWidth: 300 }}>
                        {m.subject || "(no subject)"}
                      </Typography>
                      {m.bodyPreview && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                          — {m.bodyPreview}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell onClick={() => onOpenMessage(m)}>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {(m.labels || []).slice(0, 2).map((l) => (
                        <Chip
                          key={l}
                          label={l}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 11,
                            bgcolor: LABEL_COLORS[l] || "#e0e0e0",
                            color: "#fff",
                            textTransform: "capitalize",
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell onClick={() => onOpenMessage(m)}>
                    {(m.attachments || []).length > 0 && (
                      <Tooltip title={`${m.attachments!.length} attachment(s)`}>
                        <AttachmentIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell onClick={() => onOpenMessage(m)} align="right">
                    <Typography variant="body2" color="text.secondary" fontWeight={isUnread ? 700 : 400}>
                      {formatDate(m.receivedAt || m.updatedAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <EmptyStateCard
                    icon={InboxIcon}
                    title="No messages"
                    description="Your inbox updates automatically. Adjust your search or filters, or compose a new message."
                    cardSx={{ maxWidth: 560, mx: "auto" }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
        />
      </Box>
    </Box>
  )
}

export default EmailInbox
