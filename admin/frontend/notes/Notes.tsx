"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  Typography,
} from "@mui/material"
import { Delete as DeleteIcon, Edit as EditIcon, NoteAlt as NoteIcon } from "@mui/icons-material"
import { useLocation, useNavigate } from "react-router-dom"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import { db, onValue, ref } from "../../backend/services/Firebase"
import { useAdmin } from "../../backend/context/AdminContext"
import type { Note, NoteBlock } from "../../backend/interfaces/Notes"

type NoteCategory = Note["category"]
type NoteStatus = NonNullable<Note["status"]>
type NoteTemplate = NonNullable<Note["template"]>

const NOTE_TEMPLATE_CONTENT: Record<NoteTemplate, string> = {
  blank: "",
  meeting_notes: `Agenda\n- \n\nDecisions\n- \n\nActions\n- \n\nRisks / blockers\n- `,
  project_brief: `Goal\n\nScope\n- \n\nDeliverables\n- \n\nOwners\n- \n\nMilestones\n- `,
  retrospective: `What went well\n- \n\nWhat did not go well\n- \n\nActions for next cycle\n- `,
  sop: `Purpose\n\nWhen to use this\n\nSteps\n1. \n2. \n3. \n\nChecks\n- `,
}

function makeBlock(type: NoteBlock["type"], text = ""): NoteBlock {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text,
    checked: false,
  }
}

function blocksFromContent(content: string): NoteBlock[] {
  const lines = String(content || "").split(/\r?\n/)
  const blocks = lines.map((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("- [ ] ")) return { ...makeBlock("checklist", trimmed.slice(6)), checked: false }
    if (trimmed.startsWith("- [x] ")) return { ...makeBlock("checklist", trimmed.slice(6)), checked: true }
    if (/^[A-Z][^:]{0,40}$/.test(trimmed) && trimmed.length > 0) return makeBlock("heading", trimmed)
    return makeBlock("text", line)
  })
  return blocks.length ? blocks : [makeBlock("text", "")]
}

function blocksToContent(blocks: NoteBlock[]): string {
  return (blocks || [])
    .map((block) => {
      if (block.type === "heading") return String(block.text || "").trim()
      if (block.type === "checklist") return `- [${block.checked ? "x" : " "}] ${String(block.text || "").trim()}`
      return String(block.text || "")
    })
    .join("\n")
    .trim()
}

type NoteView = {
  id: string
  name: string
  config: {
    search?: string
    categories?: NoteCategory[]
    statuses?: NoteStatus[]
    sortValue?: "updatedAt" | "title" | "category"
    sortDirection?: "asc" | "desc"
  }
  createdAt: number
  updatedAt: number
}

export default function NotesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notes, fetchNotes, createNote, updateNote, deleteNote } = useAdmin()

  const getParam = (params: URLSearchParams, key: string) => params.get(key) ?? params.get(key.charAt(0).toLowerCase() + key.slice(1))

  const setCanonicalParam = (params: URLSearchParams, key: string, value: string) => {
    params.set(key, value)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }

  const deleteCanonicalParam = (params: URLSearchParams, key: string) => {
    params.delete(key)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }

  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory[]>([])
  const [statusFilter, setStatusFilter] = useState<NoteStatus[]>([])
  const [sortValue, setSortValue] = useState<"updatedAt" | "title" | "category">("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [views, setViews] = useState<NoteView[]>([])
  const [activeViewId, setActiveViewId] = useState("")

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<Note | null>(null)
  const [draft, setDraft] = useState<{
    title: string
    category: NoteCategory
    status: NoteStatus
    template: NoteTemplate
    tags: string[]
    tagInput: string
    content: string
    blocks: NoteBlock[]
    clientId: string
    projectId: string
    taskId: string
  }>({
    title: "",
    category: "general",
    status: "active",
    template: "blank",
    tags: [],
    tagInput: "",
    content: "",
    blocks: [makeBlock("text", "")],
    clientId: "",
    projectId: "",
    taskId: "",
  })
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([])

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Note | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    const viewsRef = ref(db, `admin/notes/views`)
    const unsub = onValue(viewsRef, (snap) => {
      const val = snap.val() || {}
      const rows: NoteView[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled view",
        config: raw?.config || {},
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setViews(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const clientsRef = ref(db, "admin/crm/clients")
    const unsub = onValue(clientsRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || raw?.companyName || "Client",
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const projectsRef = ref(db, "admin/projects")
    const unsub = onValue(projectsRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || "Project",
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setProjects(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const tasksRef = ref(db, "admin/tasks")
    const unsub = onValue(tasksRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        title: raw?.title || "Task",
      }))
      rows.sort((a, b) => String(a.title).localeCompare(String(b.title)))
      setTasks(rows)
    })
    return () => unsub()
  }, [])

  const columns = useMemo(
    () => [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "tags", label: "Tags" },
      { key: "updatedAt", label: "Updated" },
      { key: "actions", label: "Actions" },
    ],
    [],
  )
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev }
      for (const c of columns) if (next[c.key] === undefined) next[c.key] = true
      return next
    })
  }, [columns])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = (notes || []).filter((n) => {
      if (categoryFilter.length > 0 && !categoryFilter.includes(n.category)) return false
      if (statusFilter.length > 0 && !statusFilter.includes((n.status || "active") as NoteStatus)) return false
      if (!q) return true
      const tags = (n.tags || []).join(" ").toLowerCase()
      return (
        String(n.title || "").toLowerCase().includes(q) ||
        String(n.content || "").toLowerCase().includes(q) ||
        tags.includes(q) ||
        String(n.category || "").toLowerCase().includes(q) ||
        String(n.status || "").toLowerCase().includes(q) ||
        String(n.template || "").toLowerCase().includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "title") return String(a.title || "").localeCompare(String(b.title || "")) * dir
      if (sortValue === "category") return String(a.category || "").localeCompare(String(b.category || "")) * dir
      return (Number(a.timestamp || 0) - Number(b.timestamp || 0)) * dir
    })
  }, [categoryFilter, notes, search, sortDirection, sortValue, statusFilter])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const applyView = (v: NoteView | null) => {
    if (!v) return
    const cfg = v.config || {}
    setSearch(String(cfg.search || ""))
    setCategoryFilter(Array.isArray(cfg.categories) ? (cfg.categories as NoteCategory[]) : [])
    setStatusFilter(Array.isArray(cfg.statuses) ? (cfg.statuses as NoteStatus[]) : [])
    setSortValue((cfg.sortValue as any) || "updatedAt")
    setSortDirection((cfg.sortDirection as any) || "desc")
  }

  const openCreate = useCallback(() => {
    setSelected(null)
    setDraft({ title: "", category: "general", status: "active", template: "blank", tags: [], tagInput: "", content: "", blocks: [makeBlock("text", "")], clientId: "", projectId: "", taskId: "" })
    setCrudMode("create")
    setCrudOpen(true)
  }, [])

  const openView = useCallback(
    (n: Note) => {
      setSelected(n)
      setDraft({
        title: n.title || "",
        category: n.category || "general",
        status: n.status || "active",
        template: n.template || "blank",
        tags: Array.isArray(n.tags) ? n.tags : [],
        tagInput: "",
        content: n.content || "",
        blocks: Array.isArray(n.blocks) && n.blocks.length ? n.blocks : blocksFromContent(n.content || ""),
        clientId: n.clientId || "",
        projectId: n.projectId || "",
        taskId: n.taskId || "",
      })
      setCrudMode("view")
      setCrudOpen(true)

      const params = new URLSearchParams(location.search || "")
      if (n.id) setCanonicalParam(params, "NoteId", n.id)
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true })
    },
    [location.pathname, location.search, navigate],
  )

  const openEdit = useCallback((n: Note) => {
    setSelected(n)
    setDraft({
      title: n.title || "",
      category: n.category || "general",
      status: n.status || "active",
      template: n.template || "blank",
      tags: Array.isArray(n.tags) ? n.tags : [],
      tagInput: "",
      content: n.content || "",
      blocks: Array.isArray(n.blocks) && n.blocks.length ? n.blocks : blocksFromContent(n.content || ""),
      clientId: n.clientId || "",
      projectId: n.projectId || "",
      taskId: n.taskId || "",
    })
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const resetCrudStateAndUrl = useCallback(() => {
    setSelected(null)
    setCrudMode("create")

    const params = new URLSearchParams(location.search || "")
    if (getParam(params, "NoteId")) {
      deleteCanonicalParam(params, "NoteId")
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const handleCrudModalClose = useCallback(
    (reason?: CRUDModalCloseReason) => {
      setCrudOpen(false)
      if (isCrudModalHardDismiss(reason)) {
        resetCrudStateAndUrl()
      }
    },
    [resetCrudStateAndUrl],
  )

  // Deep-link: /Tasks?tab=notes&noteId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const noteId = String(getParam(params, "NoteId") || "").trim()
    if (!noteId) return
    if (crudOpen) return
    const found = (notes || []).find((n) => n.id === noteId)
    if (found) openView(found)
  }, [crudOpen, location.search, notes, openView])

  const save = useCallback(async () => {
    const title = draft.title.trim()
    if (!title) return
    const modeSnapshot = crudMode
    const tags = draft.tags.filter(Boolean)
    const blocks = (draft.blocks || []).map((block) => ({
      ...block,
      text: String(block.text || ""),
    }))
    const content = blocksToContent(blocks) || draft.content || ""

    if (selected?.id && crudMode === "edit") {
      await updateNote(selected.id, {
        title,
        category: draft.category,
        status: draft.status,
        template: draft.template,
        tags,
        content,
        blocks,
        clientId: draft.clientId || "",
        projectId: draft.projectId || "",
        taskId: draft.taskId || "",
        timestamp: Date.now(),
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "adminNote",
        crudMode: modeSnapshot,
        id: selected.id,
        itemLabel: title,
      })
      setCrudOpen(false)
      resetCrudStateAndUrl()
      return
    }

    await createNote({
      title,
      category: draft.category,
      status: draft.status,
      template: draft.template,
      tags,
      content,
      blocks,
      clientId: draft.clientId || "",
      projectId: draft.projectId || "",
      taskId: draft.taskId || "",
      createdBy: "Admin",
    } as any)
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "adminNote",
      crudMode: modeSnapshot,
      id: undefined,
      itemLabel: title,
    })
    setCrudOpen(false)
    resetCrudStateAndUrl()
  }, [createNote, crudMode, draft, location.pathname, resetCrudStateAndUrl, selected?.id, updateNote])

  const askDelete = useCallback((n: Note) => {
    setToDelete(n)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!toDelete?.id) return
    await deleteNote(toDelete.id)
    setDeleteConfirmOpen(false)
    setToDelete(null)
  }, [deleteNote, toDelete?.id])

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
        searchPlaceholder="Search notes…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Category",
            options: ["meeting", "lead", "marketing", "general", "strategy"].map((c) => ({ id: c, name: c })),
            selectedValues: categoryFilter as any,
            onSelectionChange: (values) => {
              setCategoryFilter(values as any)
              setPage(0)
            },
          },
          {
            label: "Status",
            options: ["draft", "active", "archived"].map((status) => ({ id: status, name: status })),
            selectedValues: statusFilter as any,
            onSelectionChange: (values) => {
              setStatusFilter(values as any)
              setPage(0)
            },
          },
          {
            label: "View",
            options: views.map((v) => ({ id: v.id, name: v.name })),
            selectedValues: activeViewId ? [activeViewId] : [],
            onSelectionChange: (values) => {
              const id = Array.isArray(values) && values.length ? String(values[0]) : ""
              setActiveViewId(id)
              const v = views.find((x) => x.id === id) || null
              if (v) applyView(v)
              setPage(0)
            },
          },
        ]}
        sortOptions={[
          { value: "updatedAt", label: "Last Updated" },
          { value: "title", label: "Title" },
          { value: "category", label: "Category" },
        ]}
        sortValue={sortValue}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortValue(value as any)
          setSortDirection(direction)
          setPage(0)
        }}
        columns={columns}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onCreateNew={openCreate}
        createButtonLabel="Add Note"
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
                {columns
                  .filter((c) => columnVisibility[c.key] !== false)
                  .map((c) => (
                    <TableCell key={c.key}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {c.label}
                      </Typography>
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((n) => (
                <TableRow key={n.id || n.title} hover sx={{ cursor: "pointer" }} onClick={() => openView(n)}>
                  {columnVisibility["title"] !== false ? (
                    <TableCell>
                      <Typography fontWeight={800}>{n.title || "—"}</Typography>
                      {n.content ? (
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                          {String(n.content || "").slice(0, 120)}
                          {String(n.content || "").length > 120 ? "…" : ""}
                        </Typography>
                      ) : null}
                      {n.clientId || n.projectId || n.taskId ? (
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
                          {n.clientId ? <Chip size="small" variant="outlined" label={clients.find((c) => c.id === n.clientId)?.name || n.clientId} /> : null}
                          {n.projectId ? <Chip size="small" variant="outlined" label={projects.find((p) => p.id === n.projectId)?.name || n.projectId} /> : null}
                          {n.taskId ? <Chip size="small" variant="outlined" label={tasks.find((t) => t.id === n.taskId)?.title || n.taskId} /> : null}
                        </Box>
                      ) : null}
                    </TableCell>
                  ) : null}
                  {columnVisibility["category"] !== false ? (
                    <TableCell>
                      <Chip size="small" label={n.category} sx={{ textTransform: "capitalize" }} />
                    </TableCell>
                  ) : null}
                  {columnVisibility["status"] !== false ? (
                    <TableCell>
                      <Chip size="small" label={n.status || "active"} sx={{ textTransform: "capitalize" }} />
                    </TableCell>
                  ) : null}
                  {columnVisibility["tags"] !== false ? (
                    <TableCell>
                      <Typography noWrap sx={{ maxWidth: 360 }}>
                        {(n.tags || []).join(", ") || "—"}
                      </Typography>
                    </TableCell>
                  ) : null}
                  {columnVisibility["updatedAt"] !== false ? (
                    <TableCell>{n.timestamp ? new Date(n.timestamp).toLocaleString() : "—"}</TableCell>
                  ) : null}
                  {columnVisibility["actions"] !== false ? (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                        <IconButton size="small" title="Edit" onClick={() => openEdit(n)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(n)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter((c) => columnVisibility[c.key] !== false).length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={NoteIcon}
                      title="No notes found"
                      description="Create your first note, or adjust your search/filters."
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
        onClose={handleCrudModalClose}
        workspaceFormShortcut={{
          crudEntity: "adminNote",
          crudMode,
          id: selected?.id,
          itemLabel: draft.title?.trim() || selected?.title || undefined,
        }}
        title={crudMode === "create" ? "Create Note" : crudMode === "edit" ? "Edit Note" : "Note"}
        subtitle={selected?.id ? `Note: ${selected.id}` : undefined}
        icon={<NoteIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selected ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : save}
        topBarActions={
          crudMode === "view" ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {draft.clientId ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`/CRM/Client360/${encodeURIComponent(draft.clientId)}`)}>
                  Client
                </Button>
              ) : null}
              {draft.projectId ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`/Tasks/Projects?projectId=${encodeURIComponent(draft.projectId)}`)}>
                  Project
                </Button>
              ) : null}
              {draft.taskId ? (
                <Button size="small" variant="outlined" onClick={() => navigate(`/Tasks/Tasks?taskId=${encodeURIComponent(draft.taskId)}`)}>
                  Task
                </Button>
              ) : null}
            </Box>
          ) : undefined
        }
      >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <TextField
            label="Title"
            required
            fullWidth
            value={draft.title}
            disabled={crudMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.category}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as any }))}
            >
              <MenuItem value="meeting">Meeting</MenuItem>
              <MenuItem value="lead">Lead</MenuItem>
              <MenuItem value="marketing">Marketing</MenuItem>
              <MenuItem value="strategy">Strategy</MenuItem>
              <MenuItem value="general">General</MenuItem>
            </Select>
            <Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: draft.tags.length ? 1 : 0 }}>
                {draft.tags.map((tag, i) => (
                  <Chip
                    key={`${tag}-${i}`}
                    label={tag}
                    size="small"
                    onDelete={
                      crudMode === "view"
                        ? undefined
                        : () => setDraft((d) => ({ ...d, tags: d.tags.filter((_, idx) => idx !== i) }))
                    }
                  />
                ))}
              </Box>
              <TextField
                label="Tags"
                placeholder="Press Enter to add"
                fullWidth
                value={draft.tagInput}
                disabled={crudMode === "view"}
                onChange={(e) => setDraft((d) => ({ ...d, tagInput: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const val = draft.tagInput.trim()
                    if (val && !draft.tags.includes(val)) {
                      setDraft((d) => ({ ...d, tags: [...d.tags, val], tagInput: "" }))
                    }
                  }
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.status}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as NoteStatus }))}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Select
                fullWidth
                value={draft.template}
                disabled={crudMode === "view"}
                onChange={(e) => {
                  const template = e.target.value as NoteTemplate
                  const templateContent = NOTE_TEMPLATE_CONTENT[template]
                  setDraft((d) => ({
                    ...d,
                    template,
                    content: d.content.trim() ? d.content : templateContent,
                    blocks: d.content.trim() || d.blocks.some((block) => String(block.text || "").trim()) ? d.blocks : blocksFromContent(templateContent),
                  }))
                }}
              >
                <MenuItem value="blank">Blank</MenuItem>
                <MenuItem value="meeting_notes">Meeting Notes</MenuItem>
                <MenuItem value="project_brief">Project Brief</MenuItem>
                <MenuItem value="retrospective">Retrospective</MenuItem>
                <MenuItem value="sop">SOP</MenuItem>
              </Select>
              {crudMode !== "view" ? (
                <Button
                  variant="outlined"
                  onClick={() => setDraft((d) => ({ ...d, content: NOTE_TEMPLATE_CONTENT[d.template], blocks: blocksFromContent(NOTE_TEMPLATE_CONTENT[d.template]) }))}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Apply
                </Button>
              ) : null}
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.clientId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, clientId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link Client (Optional)"
                return clients.find((client) => client.id === id)?.name || id
              }}
            >
              <MenuItem value="">
                <em>No Linked Client</em>
              </MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              fullWidth
              value={draft.projectId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, projectId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link Project (Optional)"
                return projects.find((project) => project.id === id)?.name || id
              }}
            >
              <MenuItem value="">
                <em>No Linked Project</em>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              fullWidth
              value={draft.taskId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, taskId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link Task (Optional)"
                return tasks.find((task) => task.id === id)?.title || id
              }}
            >
              <MenuItem value="">
                <em>No Linked Task</em>
              </MenuItem>
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.title}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ mt: 2, display: "grid", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography fontWeight={800}>Structured Blocks</Typography>
              {crudMode !== "view" ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button size="small" variant="outlined" onClick={() => setDraft((d) => ({ ...d, blocks: [...d.blocks, makeBlock("heading", "Heading")] }))}>
                    Add Heading
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setDraft((d) => ({ ...d, blocks: [...d.blocks, makeBlock("text", "")] }))}>
                    Add Text
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setDraft((d) => ({ ...d, blocks: [...d.blocks, makeBlock("checklist", "")] }))}>
                    Add Checklist
                  </Button>
                </Box>
              ) : null}
            </Box>

            {(draft.blocks || []).map((block) => (
              <Paper key={block.id} variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: block.type === "checklist" ? "180px 1fr auto auto" : "180px 1fr auto" }, gap: 1, alignItems: "center" }}>
                  <Select
                    size="small"
                    value={block.type}
                    disabled={crudMode === "view"}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        blocks: d.blocks.map((entry) => (entry.id === block.id ? { ...entry, type: e.target.value as NoteBlock["type"] } : entry)),
                      }))
                    }
                  >
                    <MenuItem value="heading">Heading</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="checklist">Checklist</MenuItem>
                  </Select>

                  <TextField
                    fullWidth
                    multiline={block.type !== "heading"}
                    minRows={block.type === "text" ? 2 : 1}
                    value={block.text || ""}
                    disabled={crudMode === "view"}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        blocks: d.blocks.map((entry) => (entry.id === block.id ? { ...entry, text: e.target.value } : entry)),
                      }))
                    }
                  />

                  {block.type === "checklist" ? (
                    <Button
                      size="small"
                      variant={block.checked ? "contained" : "outlined"}
                      disabled={crudMode === "view"}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          blocks: d.blocks.map((entry) => (entry.id === block.id ? { ...entry, checked: !entry.checked } : entry)),
                        }))
                      }
                    >
                      {block.checked ? "Done" : "Open"}
                    </Button>
                  ) : null}

                  {crudMode !== "view" ? (
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          blocks: d.blocks.filter((entry) => entry.id !== block.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            ))}

            {crudMode === "view" ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={800} sx={{ mb: 1 }}>
                  Page Preview
                </Typography>
                <Box sx={{ display: "grid", gap: 1 }}>
                  {(draft.blocks || []).map((block) => (
                    <Box key={block.id}>
                      {block.type === "heading" ? (
                        <Typography variant="h6">{block.text || "Untitled section"}</Typography>
                      ) : block.type === "checklist" ? (
                        <Typography color={block.checked ? "text.secondary" : "text.primary"}>
                          {block.checked ? "☑" : "☐"} {block.text || ""}
                        </Typography>
                      ) : (
                        <Typography sx={{ whiteSpace: "pre-wrap" }}>{block.text || ""}</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>
            ) : (
              <TextField
                label="Content Preview"
                fullWidth
                multiline
                minRows={6}
                value={blocksToContent(draft.blocks)}
                disabled
              />
            )}
          </Box>
        </Box>
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete note <strong>{toDelete?.title || "—"}</strong>? This cannot be undone.
          </Typography>
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

