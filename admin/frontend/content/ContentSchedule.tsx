"use client"
import { useLocation } from "react-router-dom"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import { useAdmin } from "../../backend/context/AdminContext"
import type { ContentPost } from "../../backend/interfaces/Content"
import ContentPostCRUDForm, { type ContentPostCRUDFormHandle } from "./forms/ContentPostCRUDForm"

type ColumnConfig = {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
}

export default function ContentSchedulePage() {
  const location = useLocation()
  const { contentPosts, fetchContentSchedule, createContentPost, updateContentPost, publishPost, deleteContentPost } =
    useAdmin()

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<Array<ContentPost["platform"]>>([])
  const [statusFilter, setStatusFilter] = useState<Array<ContentPost["status"]>>([])
  const [sortValue, setSortValue] = useState<"scheduledDate" | "status">("scheduledDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // CRUD modal
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<ContentPost | null>(null)
  const formRef = useRef<ContentPostCRUDFormHandle | null>(null)

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ContentPost | null>(null)

  useEffect(() => {
    fetchContentSchedule()
  }, [fetchContentSchedule])

  const columns: ColumnConfig[] = useMemo(
    () => [
      { id: "platform", label: "Platform", minWidth: 160 },
      { id: "status", label: "Status", minWidth: 140, align: "center" },
      { id: "scheduled", label: "Scheduled", minWidth: 180 },
      { id: "content", label: "Content", minWidth: 420 },
      { id: "actions", label: "Actions", minWidth: 160, align: "center" },
    ],
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = (contentPosts || []).filter((p) => {
      if (platformFilter.length > 0 && !platformFilter.includes(p.platform)) return false
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false
      if (!q) return true
      const tags = (p.hashtags || []).join(" ").toLowerCase()
      return String(p.content || "").toLowerCase().includes(q) || tags.includes(q)
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "status") return String(a.status).localeCompare(String(b.status)) * dir
      return (Number(a.scheduledDate || 0) - Number(b.scheduledDate || 0)) * dir
    })
  }, [contentPosts, platformFilter, search, sortDirection, sortValue, statusFilter])

  const paginated = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const openCreate = useCallback(() => {
    setSelected(null)
    setCrudMode("create")
    setCrudOpen(true)
  }, [])

  const openView = useCallback((p: ContentPost) => {
    setSelected(p)
    setCrudMode("view")
    setCrudOpen(true)
  }, [])

  const openEdit = useCallback((p: ContentPost) => {
    setSelected(p)
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const closeCrud = useCallback(() => {
    setCrudOpen(false)
    setSelected(null)
    setCrudMode("create")
  }, [])

  const save = useCallback(
    async (payload: {
      platform: ContentPost["platform"]
      content: string
      scheduledDate: number
      status: ContentPost["status"]
      hashtags: string[]
      targetAudience: string
      isAd: boolean
      adBudget: number
      mediaUrls: string[]
    }) => {
      const modeSnapshot = crudMode
      const selectedSnapshot = selected
      if (selected?.id && crudMode === "edit") {
        await updateContentPost(selected.id, payload as any)
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "contentScheduleModal1",
          crudMode: modeSnapshot,
          id: selectedSnapshot?.id,
          itemLabel: payload.content?.slice(0, 80) || undefined,
        })
        closeCrud()
        return
      }

      await createContentPost(payload as any)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "contentScheduleModal1",
        crudMode: modeSnapshot,
        id: undefined,
        itemLabel: payload.content?.slice(0, 80) || undefined,
      })
      closeCrud()
    },
    [closeCrud, createContentPost, crudMode, location.pathname, selected, updateContentPost],
  )

  const askDelete = useCallback((p: ContentPost) => {
    setToDelete(p)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!toDelete?.id) return
    await deleteContentPost(toDelete.id)
    setDeleteConfirmOpen(false)
    setToDelete(null)
  }, [deleteContentPost, toDelete])

  const publishNow = async (p: ContentPost) => {
    if (!p.id) return
    await publishPost(p.id)
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
            label: "Platform",
            options: ["instagram", "facebook", "linkedin", "twitter", "google_ads"].map((v) => ({ id: v, name: v })),
            selectedValues: platformFilter as any,
            onSelectionChange: (values) => {
              setPlatformFilter(values as any)
              setPage(0)
            },
          },
          {
            label: "Status",
            options: ["draft", "scheduled", "published", "failed"].map((v) => ({ id: v, name: v })),
            selectedValues: statusFilter as any,
            onSelectionChange: (values) => {
              setStatusFilter(values as any)
              setPage(0)
            },
          },
        ]}
        sortOptions={[
          { value: "scheduledDate", label: "Scheduled date" },
          { value: "status", label: "Status" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value as any)
          setSortDirection(direction)
          setPage(0)
        }}
        onCreateNew={openCreate}
        createButtonLabel="Add Post"
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
                {columns.map((c) => (
                  <TableCell key={c.id} align={(c.align as any) || "left"} sx={{ minWidth: c.minWidth }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {c.label}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id || `${p.platform}-${p.scheduledDate}`} hover sx={{ cursor: "pointer" }} onClick={() => openView(p)}>
                  <TableCell sx={{ textTransform: "capitalize" }}>{String(p.platform || "").replace("_", " ")}</TableCell>
                  <TableCell align="center" sx={{ textTransform: "capitalize" }}>
                    {p.status}
                  </TableCell>
                  <TableCell>{p.scheduledDate ? new Date(p.scheduledDate).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Typography noWrap sx={{ maxWidth: 520 }}>
                      {p.content || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                      {(p.status === "draft" || p.status === "scheduled") && p.id ? (
                        <IconButton size="small" title="Publish now" onClick={() => void publishNow(p)}>
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                      <IconButton size="small" title="Edit" onClick={() => openEdit(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(p)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={ScheduleIcon}
                      title="No posts found"
                      description="Create your first post, or adjust your search/filters."
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
        open={crudOpen}
        onClose={(reason) => {
          setCrudOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            closeCrud()
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "contentScheduleModal1",
          crudMode: crudMode,
          id: selected?.id,
          itemLabel: selected?.content?.slice(0, 80) || undefined,
        }}
        title={crudMode === "create" ? "Create post" : crudMode === "edit" ? "Edit post" : "View post"}
        subtitle={selected?.id ? `Post: ${selected.id}` : undefined}
        icon={<ScheduleIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selected ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : save}
        formRef={formRef as any}
      >
        <ContentPostCRUDForm ref={formRef} post={selected} mode={crudMode} onSave={save} />
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm delete</DialogTitle>
        <DialogContent>
          <Typography>Delete post? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!toDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

