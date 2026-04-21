import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { Delete as DeleteIcon, Edit as EditIcon, Send as SendIcon, Share as ShareIcon } from "@mui/icons-material"
import { APP_KEYS, getFunctionsBaseUrl } from "../../app/backend/config/keys"
import { themeConfig } from "../../app/backend/context/AppTheme"
import { db, onValue, push, ref, remove, set, update } from "../backend/services/Firebase"
import DataHeader from "../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../app/frontend/components/reusable/EmptyStateCard"

type SocialPlatform = "twitter" | "instagram" | "facebook" | "linkedin"
type PostStatus = "draft" | "scheduled" | "queued" | "sent" | "failed"

type SocialPost = {
  id: string
  platforms: SocialPlatform[]
  content: string
  mediaUrl?: string
  scheduledAt?: number
  status: PostStatus
  createdAt: number
  updatedAt: number
}

const PLATFORMS: SocialPlatform[] = ["twitter", "instagram", "facebook", "linkedin"]

export default function AdminSocial() {
  const companyId = "admin"
  const location = useLocation()

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<PostStatus[]>([])
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [postModalOpen, setPostModalOpen] = useState(false)
  const [postModalMode, setPostModalMode] = useState<"create" | "edit" | "view">("create")
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  const [draft, setDraft] = useState<{
    platforms: Record<SocialPlatform, boolean>
    content: string
    mediaUrl: string
    scheduledAt: string // datetime-local
    schedule: boolean
  }>({
    platforms: { twitter: true, instagram: false, facebook: false, linkedin: false },
    content: "",
    mediaUrl: "",
    scheduledAt: "",
    schedule: false,
  })

  useEffect(() => {
    const postsRef = ref(db, `admin/social/posts`)
    const unsubPosts = onValue(postsRef, (snap) => {
      const val = snap.val() || {}
      const rows: SocialPost[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        platforms: Array.isArray(raw?.platforms) ? raw.platforms : [],
        content: raw?.content || "",
        mediaUrl: raw?.mediaUrl || "",
        scheduledAt: raw?.scheduledAt || undefined,
        status: (raw?.status as PostStatus) || "draft",
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => (b.scheduledAt || b.updatedAt) - (a.scheduledAt || a.updatedAt))
      setPosts(rows)
    })
    return () => unsubPosts()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter((p) => {
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false
      if (platformFilter.length > 0) {
        const s = new Set(p.platforms || [])
        if (!platformFilter.some((x) => s.has(x))) return false
      }
      if (!q) return true
      return (p.content || "").toLowerCase().includes(q) || (p.mediaUrl || "").toLowerCase().includes(q)
    })
  }, [platformFilter, posts, search, statusFilter])

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCompose = () => {
    const location = useLocation()
    setEditingPostId(null)
    setPostModalMode("create")
    setDraft({
      platforms: { twitter: true, instagram: false, facebook: false, linkedin: false },
      content: "",
      mediaUrl: "",
      scheduledAt: "",
      schedule: false,
    })
    setPostModalOpen(true)
  }

  const openViewPost = (p: SocialPost) => {
    setEditingPostId(p.id)
    setPostModalMode("view")
    setDraft({
      platforms: {
        twitter: (p.platforms || []).includes("twitter"),
        instagram: (p.platforms || []).includes("instagram"),
        facebook: (p.platforms || []).includes("facebook"),
        linkedin: (p.platforms || []).includes("linkedin"),
      },
      content: p.content || "",
      mediaUrl: p.mediaUrl || "",
      scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : "",
      schedule: Boolean(p.scheduledAt),
    })
    setPostModalOpen(true)
  }

  const savePost = async (status: PostStatus) => {
    const now = Date.now()
    const modeSnapshot = postModalMode
    const platforms = PLATFORMS.filter((p) => Boolean(draft.platforms[p]))
    if (platforms.length === 0) return
    if (!draft.content.trim()) return

    const scheduledAt = draft.schedule && draft.scheduledAt ? new Date(draft.scheduledAt).getTime() : undefined

    if (editingPostId && postModalMode === "edit") {
      await update(ref(db, `admin/social/posts/${editingPostId}`), {
        platforms,
        content: draft.content,
        mediaUrl: draft.mediaUrl || "",
        scheduledAt: scheduledAt || null,
        status: scheduledAt ? "scheduled" : status,
        updatedAt: now,
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminSocialModal1",
        crudMode: modeSnapshot,
        id: editingPostId,
        itemLabel: draft.content.trim().slice(0, 80) || undefined,
      })
      setPostModalOpen(false)
      setPostModalMode("view")
      return
    }

    const postsRef = ref(db, `admin/social/posts`)
    const newRef = push(postsRef)
    await set(newRef, {
      platforms,
      content: draft.content,
      mediaUrl: draft.mediaUrl || "",
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? "scheduled" : status,
      createdAt: now,
      updatedAt: now,
    })
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "adminSocialModal1",
      crudMode: modeSnapshot,
      id: newRef.key || undefined,
      itemLabel: draft.content.trim().slice(0, 80) || undefined,
    })
    setPostModalOpen(false)
  }

  const deletePost = async (postId: string) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return
    await remove(ref(db, `admin/social/posts/${postId}`))
  }

  const processDue = async () => {
    const fnBase = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })
    const url = new URL(`${fnBase}/processScheduledSocialPosts`)
    url.searchParams.set("company_id", companyId)
    await fetch(url.toString())
  }

  const statusChipColor = (s: PostStatus) => {
    if (s === "sent") return "success"
    if (s === "failed") return "error"
    if (s === "scheduled") return "info"
    if (s === "queued") return "warning"
    return "default"
  }

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => {
          setSearch(t)
          setPage(0)
        }}
        searchPlaceholder="Search posts…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Status",
            options: ["draft", "scheduled", "queued", "sent", "failed"].map((v) => ({ id: v, name: v })),
            selectedValues: statusFilter as any,
            onSelectionChange: (values) => {
              setStatusFilter(values as any)
              setPage(0)
            },
          },
          {
            label: "Platform",
            options: PLATFORMS.map((p) => ({ id: p, name: p })),
            selectedValues: platformFilter as any,
            onSelectionChange: (values) => {
              setPlatformFilter(values as any)
              setPage(0)
            },
          },
        ]}
        onCreateNew={openCompose}
        createButtonLabel="Compose"
        additionalButtons={[
          { label: "Process due", icon: <SendIcon />, onClick: () => void processDue(), variant: "outlined" },
        ]}
      />

      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 300px)",
          minHeight: 400,
        }}
      >
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Platforms
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 140 }} align="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Status
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Scheduled
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 520 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Content
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 140 }} align="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id} hover sx={{ cursor: "pointer" }} onClick={() => openViewPost(p)}>
                  <TableCell sx={{ textTransform: "capitalize" }}>{(p.platforms || []).join(", ") || "—"}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={p.status} color={statusChipColor(p.status) as any} sx={{ textTransform: "capitalize" }} />
                  </TableCell>
                  <TableCell>{p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : "Immediate"}</TableCell>
                  <TableCell>
                    <Typography noWrap sx={{ maxWidth: 620 }}>
                      {p.content || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                      <IconButton size="small" title="Edit" onClick={() => { setEditingPostId(p.id); setPostModalMode("edit"); setPostModalOpen(true) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" title="Delete" onClick={() => void deletePost(p.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={ShareIcon}
                      title="No posts found"
                      description="Compose your first post, or adjust your search/filters."
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
          />
        </Box>
      </Paper>

                        <CRUDModal
              open={postModalOpen}
              onClose={(reason) => {
                setPostModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setEditingPostId(null)
                  setPostModalMode("create")
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "adminSocialModal1",
                crudMode: postModalMode,
                id: editingPostId || undefined,
                itemLabel: draft.content.trim().slice(0, 80) || undefined,
              }}
              title={
                postModalMode === "create"
                  ? "Compose post"
                  : postModalMode === "edit"
                    ? "Edit post"
                    : "View post"
              }
              subtitle={editingPostId ? `Post: ${editingPostId}` : undefined}
              icon={<ShareIcon />}
              mode={postModalMode}
              onEdit={postModalMode === "view" ? () => setPostModalMode("edit") : undefined}
              onSave={postModalMode === "view" ? undefined : () => savePost("queued")}
              saveButtonText={draft.schedule ? "Schedule" : "Queue"}
            >
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Platforms
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <FormControlLabel
                key={p}
                control={
                  <Switch
                    checked={Boolean(draft.platforms[p])}
                    onChange={(e) => setDraft((d) => ({ ...d, platforms: { ...d.platforms, [p]: e.target.checked } }))}
                    disabled={postModalMode === "view"}
                  />
                }
                label={p}
              />
            ))}
          </Box>
          <TextField
            label="Content"
            fullWidth
            multiline
            minRows={6}
            value={draft.content}
            disabled={postModalMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Media URL (optional)"
            fullWidth
            value={draft.mediaUrl}
            disabled={postModalMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Switch checked={draft.schedule} disabled={postModalMode === "view"} onChange={(e) => setDraft((d) => ({ ...d, schedule: e.target.checked }))} />}
              label="Schedule"
            />
            {draft.schedule ? (
              <TextField
                type="datetime-local"
                fullWidth
                label="Scheduled time"
                value={draft.scheduledAt}
                disabled={postModalMode === "view"}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: alpha(themeConfig.brandColors.navy, 0.7) }}>
              Social credentials & platform enablement live under Marketing → Settings.
            </Typography>
          </Box>
        </Box>
      </CRUDModal>
    </Box>
  )
}

