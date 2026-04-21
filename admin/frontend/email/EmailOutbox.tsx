import React, { useMemo, useState } from "react"
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
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
  Badge,
} from "@mui/material"
import {
  Search as SearchIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Drafts as DraftIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SentIcon,
  Error as FailedIcon,
  HourglassEmpty as QueuedIcon,
  Outbox as OutboxIcon,
  Replay as RetryIcon,
} from "@mui/icons-material"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import type { OutboxItem, OutboxStatus } from "./types"

interface EmailOutboxProps {
  outbox: OutboxItem[]
  onComposeNew: () => void
  onViewItem: (item: OutboxItem) => void
  onEditDraft: (item: OutboxItem) => void
  onDeleteItems: (ids: string[]) => void
  onRetryItems: (ids: string[]) => void
}

const STATUS_CONFIG: Record<OutboxStatus, { label: string; color: "default" | "success" | "error" | "warning" | "info"; icon: React.ReactElement }> = {
  draft: { label: "Draft", color: "default", icon: <DraftIcon fontSize="small" /> },
  queued: { label: "Queued", color: "info", icon: <QueuedIcon fontSize="small" /> },
  sent: { label: "Sent", color: "success", icon: <SentIcon fontSize="small" /> },
  failed: { label: "Failed", color: "error", icon: <FailedIcon fontSize="small" /> },
}

const EmailOutbox: React.FC<EmailOutboxProps> = ({
  outbox,
  onComposeNew,
  onViewItem,
  onEditDraft,
  onDeleteItems,
  onRetryItems,
}) => {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | "all">("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return outbox.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (!q) return true
      return (
        (o.subject || "").toLowerCase().includes(q) ||
        (o.to || "").toLowerCase().includes(q) ||
        (o.body || "").toLowerCase().includes(q)
      )
    })
  }, [outbox, search, statusFilter])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, queued: 0, sent: 0, failed: 0 }
    outbox.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1 })
    return counts
  }, [outbox])

  const handleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map((o) => o.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    onDeleteItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleBulkRetry = () => {
    onRetryItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const hasSelection = selectedIds.size > 0

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search & Actions Bar */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search outbox..."
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
              <Badge badgeContent={statusFilter !== "all" ? 1 : 0} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<SendIcon />} onClick={onComposeNew} size="small">
            Compose
          </Button>
        </Box>

        {/* Status Summary */}
        <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
          {(["draft", "queued", "sent", "failed"] as OutboxStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status]
            return (
              <Chip
                key={status}
                icon={cfg.icon}
                label={`${cfg.label}: ${statusCounts[status] || 0}`}
                size="small"
                color={statusFilter === status ? cfg.color : "default"}
                variant={statusFilter === status ? "filled" : "outlined"}
                onClick={() => {
                  setStatusFilter((prev) => prev === status ? "all" : status)
                  setPage(0)
                }}
                sx={{ cursor: "pointer" }}
              />
            )
          })}
        </Box>

        {/* Filters */}
        {showFilters && (
          <Box sx={{ display: "flex", gap: 1.5, mt: 1.5, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0) }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="queued">Queued</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <Button size="small" onClick={() => { setStatusFilter("all"); setPage(0) }}>
              Clear
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              {filtered.length} of {outbox.length} items
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bulk Actions */}
      {hasSelection && (
        <Box sx={{ px: 2, py: 0.5, display: "flex", gap: 1, alignItems: "center", bgcolor: "action.selected", borderBottom: 1, borderColor: "divider" }}>
          <Checkbox
            checked={selectedIds.size === paginated.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < paginated.length}
            onChange={handleSelectAll}
            size="small"
          />
          <Typography variant="body2" sx={{ mr: 1 }}>
            {selectedIds.size} selected
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Retry failed/queued">
            <IconButton size="small" onClick={handleBulkRetry}>
              <RetryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={handleBulkDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Outbox Table */}
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
              <TableCell>To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell sx={{ width: 100 }}>Status</TableCell>
              <TableCell sx={{ width: 140 }} align="right">Updated</TableCell>
              <TableCell sx={{ width: 80 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((o) => {
              const isSelected = selectedIds.has(o.id)
              const cfg = STATUS_CONFIG[o.status]
              return (
                <TableRow
                  key={o.id}
                  hover
                  selected={isSelected}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => handleToggleSelect(o.id)} size="small" />
                  </TableCell>
                  <TableCell onClick={() => onViewItem(o)}>
                    <Typography variant="body2" noWrap>{o.to || "—"}</Typography>
                  </TableCell>
                  <TableCell onClick={() => onViewItem(o)}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {o.subject || "(no subject)"}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={() => onViewItem(o)}>
                    <Chip
                      size="small"
                      icon={cfg.icon}
                      label={cfg.label}
                      color={cfg.color}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell onClick={() => onViewItem(o)} align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(o.updatedAt || o.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                      {(o.status === "draft" || o.status === "failed") && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEditDraft(o)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {o.status === "failed" && (
                        <Tooltip title="Retry">
                          <IconButton size="small" onClick={() => onRetryItems([o.id])}>
                            <RetryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <EmptyStateCard
                    icon={OutboxIcon}
                    title="No outbox items"
                    description="Compose an email to add it to your outbox."
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

export default EmailOutbox
