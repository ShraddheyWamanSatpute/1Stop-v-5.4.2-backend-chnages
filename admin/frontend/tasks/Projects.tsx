"use client"

import { themeConfig } from "../../../app/backend/context/AppTheme"
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
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  ViewColumn as KanbanIcon,
  ViewList as ListIcon,
} from "@mui/icons-material"
import { db, onValue, push, ref } from "../../backend/services/Firebase"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import CustomFieldsSection, { formatCustomFieldForTable } from "./components/CustomFieldsSection"
import type { CustomFieldDefinition } from "./types"
import { useLocation, useNavigate } from "react-router-dom"
import type { StaffProfile } from "../shared/models"
import { createActivity, indexPath, nowMs, rootUpdate } from "../shared/rtdb"
import ActivityComposer from "../shared/ActivityComposer"
import ActivityTimeline from "../shared/ActivityTimeline"
import { useAdmin } from "../../backend/context/AdminContext"
import { chipSxFromBg } from "../shared/colorUtils"

type ProjectStatus = "active" | "on_hold" | "completed"

type AdminProject = {
  id: string
  name: string
  status: ProjectStatus
  clientId?: string
  ownerUserId?: string
  startDate?: string
  dueDate?: string
  health?: "green" | "amber" | "red"
  description?: string
  phase?: string
  budgetAmount?: number
  sprintCadence?: string
  teamUserIds?: string[]
  custom?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface ProjectsProps {
  embed?: boolean
  hideHeader?: boolean
  searchTerm?: string
  onSearchChange?: (term: string) => void
  sortValue?: "updatedAt" | "name"
  sortDirection?: "asc" | "desc"
  onSortChange?: (value: "updatedAt" | "name", direction: "asc" | "desc") => void
  createHandlerRef?: React.MutableRefObject<(() => void) | null>
  fields: CustomFieldDefinition[]
  clients?: Array<{ id: string; name: string }>
  staff?: Array<Pick<StaffProfile, "uid" | "email" | "displayName">>
}

const Projects: React.FC<ProjectsProps> = ({
  embed,
  hideHeader,
  searchTerm,
  onSearchChange,
  sortValue,
  sortDirection,
  onSortChange,
  createHandlerRef,
  fields,
  clients = [],
  staff = [],
}) => {
  const { state } = useAdmin()
  const currentUid = state.user?.uid || ""
  const staffIdSet = useMemo(() => new Set((staff || []).map((member) => String(member.uid || "")).filter(Boolean)), [staff])
  const [, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const getParam = (params: URLSearchParams, key: string) => params.get(key) ?? params.get(key.charAt(0).toLowerCase() + key.slice(1))

  const setCanonicalParam = (params: URLSearchParams, key: string, value: string) => {
    params.set(key, value)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }

  const deleteCanonicalParam = (params: URLSearchParams, key: string) => {
    params.delete(key)
    params.delete(key.charAt(0).toLowerCase() + key.slice(1))
  }
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [relatedTasks, setRelatedTasks] = useState<Array<{ id: string; title: string; projectId?: string; status?: string; dueDate?: string; assignee?: string }>>([])

  const [search, setSearch] = useState("")
  const effectiveSearch = searchTerm !== undefined ? searchTerm : search
  const setEffectiveSearch = onSearchChange || setSearch

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [groupBy, setGroupBy] = useState<"status" | "health" | "client">("status")

  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string>("all") // all | mine | unassigned | uid
  const [clientFilter, setClientFilter] = useState<string>("all") // all | clientId
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [projectColors, setProjectColors] = useState<{ status: Partial<Record<ProjectStatus, string>>; health: Partial<Record<string, string>> }>({
    status: {},
    health: {},
  })
  const [projectCustomFieldColors, setProjectCustomFieldColors] = useState<Record<string, Record<string, string>>>({})
  const [rowColoring, setRowColoring] = useState<{ mode: "none" | "status" | "customField"; fieldId?: string }>({
    mode: "status",
    fieldId: "",
  })

  const [localSortValue, setLocalSortValue] = useState<"updatedAt" | "name">("updatedAt")
  const [localSortDirection, setLocalSortDirection] = useState<"asc" | "desc">("desc")
  const effectiveSortValue = sortValue !== undefined ? sortValue : localSortValue
  const effectiveSortDirection = sortDirection !== undefined ? sortDirection : localSortDirection
  const setEffectiveSort = onSortChange
    ? onSortChange
    : (value: "updatedAt" | "name", direction: "asc" | "desc") => {
        setLocalSortValue(value)
        setLocalSortDirection(direction)
      }

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<AdminProject | null>(null)
  const [draft, setDraft] = useState<{
    name: string
    status: ProjectStatus
    clientId: string
    ownerUserId: string
    startDate: string
    dueDate: string
    health: "green" | "amber" | "red"
    description: string
    phase: string
    budgetAmount: string
    sprintCadence: string
    teamUserIds: string[]
  }>({
    name: "",
    status: "active",
    clientId: "",
    ownerUserId: "",
    startDate: "",
    dueDate: "",
    health: "green",
    description: "",
    phase: "",
    budgetAmount: "",
    sprintCadence: "",
    teamUserIds: [],
  })
  const [customDraft, setCustomDraft] = useState<Record<string, any>>({})
  const validDraftOwnerUserId = draft.ownerUserId && staffIdSet.has(draft.ownerUserId) ? draft.ownerUserId : ""
  const validDraftTeamUserIds = useMemo(
    () => (draft.teamUserIds || []).map((id) => String(id || "")).filter((id) => staffIdSet.has(id)),
    [draft.teamUserIds, staffIdSet],
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminProject | null>(null)

  // Views
  const [views, setViews] = useState<
    Array<{
      id: string
      name: string
      config: {
        search?: string
        statusFilter?: ProjectStatus[]
        sortValue?: "updatedAt" | "name"
        sortDirection?: "asc" | "desc"
      }
      createdAt: number
      updatedAt: number
    }>
  >([])
  const [activeViewId, setActiveViewId] = useState("")

  useEffect(() => {
    setLoading(true)
    const projectsRef = ref(db, `admin/projects`)
    const unsubscribe = onValue(
      projectsRef,
      (snap) => {
        const val = snap.val() || {}
        const rows: AdminProject[] = Object.entries(val).map(([id, raw]: any) => ({
          id,
          name: raw?.name || "",
          status: (raw?.status as ProjectStatus) || "active",
          clientId: raw?.clientId || "",
          ownerUserId: raw?.ownerUserId || "",
          startDate: raw?.startDate || "",
          dueDate: raw?.dueDate || "",
          health: raw?.health || "green",
          description: raw?.description || "",
          phase: raw?.phase || "",
          budgetAmount: typeof raw?.budgetAmount === "number" ? raw.budgetAmount : undefined,
          sprintCadence: raw?.sprintCadence || "",
          teamUserIds: Array.isArray(raw?.teamUserIds) ? raw.teamUserIds : [],
          custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
          createdAt: raw?.createdAt || Date.now(),
          updatedAt: raw?.updatedAt || Date.now(),
        }))
        rows.sort((a, b) => b.updatedAt - a.updatedAt)
        setProjects(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const tasksRef = ref(db, "admin/tasks")
    const unsub = onValue(tasksRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        title: raw?.title || "Task",
        projectId: raw?.projectId || "",
        status: raw?.status || "",
        dueDate: raw?.dueDate || "",
        assignee: raw?.assignee || "",
      }))
      setRelatedTasks(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const colorsRef = ref(db, `admin/ui/colors/projects`)
    const unsub = onValue(colorsRef, (snap) => {
      const val = snap.val() || {}
      setProjectColors({
        status: (val?.status || {}) as any,
        health: (val?.health || {}) as any,
      })
      setProjectCustomFieldColors(((val?.customFields || {}) as any) || {})
      const rc = (val?.rowColoring || {}) as any
      setRowColoring({
        mode: (rc?.mode as any) || "status",
        fieldId: String(rc?.fieldId || ""),
      })
    })
    return () => unsub()
  }, [])

  const statusBg = (s: ProjectStatus) => projectColors.status?.[s] || ""
  const customOptBg = (fieldId: string, opt: string) => (projectCustomFieldColors?.[fieldId]?.[opt]) || ""
  const rowAccentBg = (p: AdminProject) => {
    if (rowColoring.mode === "none") return ""
    if (rowColoring.mode === "status") return statusBg(p.status)
    if (rowColoring.mode === "customField" && rowColoring.fieldId) {
      const v = (p.custom || {})[rowColoring.fieldId]
      if (typeof v === "string") return customOptBg(rowColoring.fieldId, v)
      if (Array.isArray(v) && v.length) return customOptBg(rowColoring.fieldId, String(v[0]))
    }
    return ""
  }

  const taskSummaryByProjectId = useMemo(() => {
    const summary = new Map<string, { total: number; done: number; open: number }>()
    relatedTasks.forEach((task) => {
      const projectId = String(task.projectId || "").trim()
      if (!projectId) return
      const current = summary.get(projectId) || { total: 0, done: 0, open: 0 }
      current.total += 1
      if (task.status === "done") current.done += 1
      else current.open += 1
      summary.set(projectId, current)
    })
    return summary
  }, [relatedTasks])

  useEffect(() => {
    const viewsRef = ref(db, `admin/projects/views`)
    const unsub = onValue(viewsRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled view",
        config: raw?.config || {},
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
      setViews(rows as any)
    })
    return () => unsub()
  }, [])

  const applyView = (v: any) => {
    if (!v) return
    const cfg = v.config || {}
    setEffectiveSearch(String(cfg.search || ""))
    setStatusFilter(Array.isArray(cfg.statusFilter) ? (cfg.statusFilter as any) : [])
    setEffectiveSort((cfg.sortValue as any) || "updatedAt", (cfg.sortDirection as any) || "desc")
  }

  const openCreate = useCallback(() => {
    setSelected(null)
    const params = new URLSearchParams(location.search || "")
    const clientId = String(getParam(params, "ClientId") || "").trim()
    setDraft({
      name: "",
      status: "active",
      clientId,
      ownerUserId: currentUid || "",
      startDate: "",
      dueDate: "",
      health: "green",
      description: "",
      phase: "",
      budgetAmount: "",
      sprintCadence: "",
      teamUserIds: currentUid ? [currentUid] : [],
    })
    setCustomDraft({})
    setCrudMode("create")
    setCrudOpen(true)
  }, [currentUid, location.search])

  // Allow parent to trigger "Add Project" from a shared DataHeader
  useEffect(() => {
    if (!createHandlerRef) return
    createHandlerRef.current = () => openCreate()
    return () => {
      createHandlerRef.current = null
    }
  }, [createHandlerRef, openCreate])

  const openView = useCallback((p: AdminProject) => {
    setSelected(p)
    setDraft({
      name: p.name || "",
      status: p.status || "active",
      clientId: p.clientId || "",
      ownerUserId: p.ownerUserId || "",
      startDate: p.startDate || "",
      dueDate: p.dueDate || "",
      health: (p.health as any) || "green",
      description: p.description || "",
      phase: p.phase || "",
      budgetAmount: p.budgetAmount === undefined ? "" : String(p.budgetAmount),
      sprintCadence: p.sprintCadence || "",
      teamUserIds: Array.isArray(p.teamUserIds) ? p.teamUserIds : [],
    })
    setCustomDraft(p.custom && typeof p.custom === "object" ? p.custom : {})
    setCrudMode("view")
    setCrudOpen(true)

    const params = new URLSearchParams(location.search || "")
    setCanonicalParam(params, "ProjectId", p.id)
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
  }, [])

  const openEdit = useCallback((p: AdminProject) => {
    setSelected(p)
    setDraft({
      name: p.name || "",
      status: p.status || "active",
      clientId: p.clientId || "",
      ownerUserId: p.ownerUserId || "",
      startDate: p.startDate || "",
      dueDate: p.dueDate || "",
      health: (p.health as any) || "green",
      description: p.description || "",
      phase: p.phase || "",
      budgetAmount: p.budgetAmount === undefined ? "" : String(p.budgetAmount),
      sprintCadence: p.sprintCadence || "",
      teamUserIds: Array.isArray(p.teamUserIds) ? p.teamUserIds : [],
    })
    setCustomDraft(p.custom && typeof p.custom === "object" ? p.custom : {})
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const closeCrud = useCallback(() => {
    setCrudOpen(false)
    setSelected(null)
    setCrudMode("create")
    const params = new URLSearchParams(location.search || "")
    if (getParam(params, "ProjectId")) {
      deleteCanonicalParam(params, "ProjectId")
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const projectId = String(getParam(params, "ProjectId") || "").trim()
    if (!projectId) return
    if (crudOpen) return
    const found = projects.find((p) => p.id === projectId)
    if (found) openView(found)
  }, [crudOpen, location.search, openView, projects])

  // Deep-link create: /Tasks?tab=projects&create=1&clientId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const create = String(getParam(params, "Create") || "").trim()
    if (create !== "1") return
    if (crudOpen) return
    openCreate()
    deleteCanonicalParam(params, "Create")
    const next = params.toString()
    navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crudOpen, location.search])

  const save = useCallback(async () => {
    if (!draft.name.trim()) return
    const modeSnapshot = crudMode
    const selectedSnapshot = selected
    const now = nowMs()
    const budgetAmount = Number(draft.budgetAmount || 0)
    const ownerUserId = staffIdSet.has(String(draft.ownerUserId || "")) ? String(draft.ownerUserId || "") : ""
    const teamUserIds = Array.from(new Set((draft.teamUserIds || []).map((id) => String(id || "").trim()).filter((id) => staffIdSet.has(id))))
    const payload = {
      name: draft.name.trim(),
      status: draft.status,
      clientId: draft.clientId || "",
      ownerUserId,
      startDate: draft.startDate || "",
      dueDate: draft.dueDate || "",
      health: draft.health || "green",
      description: draft.description,
      phase: String(draft.phase || "").trim(),
      budgetAmount: Number.isFinite(budgetAmount) && budgetAmount > 0 ? budgetAmount : null,
      sprintCadence: String(draft.sprintCadence || "").trim(),
      teamUserIds,
      custom: customDraft || {},
      updatedAt: now,
    }

    if (selected?.id && crudMode === "edit") {
      const updates: Record<string, any> = {
        [`admin/projects/${selected.id}`]: { ...(selected as any), ...payload },
      }
      const oldClientId = String(selected.clientId || "")
      const newClientId = String(draft.clientId || "")
      if (oldClientId && oldClientId !== newClientId) updates[indexPath("projectsByClient", oldClientId, selected.id)] = null
      if (newClientId) updates[indexPath("projectsByClient", newClientId, selected.id)] = true

      const oldOwnerId = String((selected as any).ownerUserId || "")
      const newOwnerId = ownerUserId
      if (oldOwnerId && oldOwnerId !== newOwnerId) updates[indexPath("projectsByOwner", oldOwnerId, selected.id)] = null
      if (newOwnerId) updates[indexPath("projectsByOwner", newOwnerId, selected.id)] = true
      await rootUpdate(updates)

      await createActivity({
        type: "project_updated",
        title: "Project updated",
        body: payload.name,
        projectId: selected.id,
        clientId: newClientId || undefined,
        createdAt: now,
        updatedAt: now,
      } as any)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "projectsModal1",
        crudMode: modeSnapshot,
        id: selectedSnapshot?.id,
        itemLabel: selectedSnapshot?.name || payload.name,
      })
      closeCrud()
      return
    }

    const newRef = push(ref(db, `admin/projects`))
    const id = newRef.key || ""
    if (!id) return
    const updates: Record<string, any> = {
      [`admin/projects/${id}`]: { ...payload, createdAt: now },
    }
    if (draft.clientId) updates[indexPath("projectsByClient", draft.clientId, id)] = true
    if (ownerUserId) updates[indexPath("projectsByOwner", ownerUserId, id)] = true
    await rootUpdate(updates)

    await createActivity({
      type: "project_created",
      title: "Project created",
      body: payload.name,
      projectId: id,
      clientId: payload.clientId || undefined,
      createdAt: now,
      updatedAt: now,
    } as any)
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "projectsModal1",
      crudMode: modeSnapshot,
      id,
      itemLabel: payload.name,
    })
    closeCrud()
  }, [
    closeCrud,
    crudMode,
    location.pathname,
    customDraft,
    draft.clientId,
    draft.description,
    draft.dueDate,
    draft.health,
    draft.name,
    draft.ownerUserId,
    draft.startDate,
    draft.status,
    selected,
    staffIdSet,
  ])

  const askDelete = useCallback((p: AdminProject) => {
    setToDelete(p)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!toDelete?.id) return
    const updates: Record<string, any> = {
      [`admin/projects/${toDelete.id}`]: null,
    }
    const clientId = String(toDelete.clientId || "")
    const ownerUserId = String(toDelete.ownerUserId || "")
    if (clientId) updates[indexPath("projectsByClient", clientId, toDelete.id)] = null
    if (ownerUserId) updates[indexPath("projectsByOwner", ownerUserId, toDelete.id)] = null
    await rootUpdate(updates)
    setDeleteConfirmOpen(false)
    setToDelete(null)
  }, [toDelete])

  const customTableFields = useMemo(() => (fields || []).filter((f) => f.showInTable), [fields])

  const columns = useMemo(() => {
    const base = [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "description", label: "Description" },
      { key: "updatedAt", label: "Updated" },
      { key: "actions", label: "Actions" },
    ]
    const customs = customTableFields.map((f) => ({ key: `custom:${f.id}`, label: f.label }))
    return [...base.slice(0, 3), ...customs, ...base.slice(3)]
  }, [customTableFields])

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev }
      for (const c of columns) {
        if (next[c.key] === undefined) next[c.key] = true
      }
      return next
    })
  }, [columns])

  const filtered = useMemo(() => {
    const q = (effectiveSearch || "").trim().toLowerCase()
    const base = projects.filter((p) => {
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false
      if (clientFilter !== "all" && String(p.clientId || "") !== clientFilter) return false
      if (ownerFilter === "mine") {
        if (!currentUid) return false
        if (String(p.ownerUserId || "") !== currentUid) return false
      }
      if (ownerFilter === "unassigned") {
        if (String(p.ownerUserId || "").trim()) return false
      }
      if (ownerFilter !== "all" && ownerFilter !== "mine" && ownerFilter !== "unassigned") {
        if (String(p.ownerUserId || "") !== ownerFilter) return false
      }
      if (!q) return true
      const customText = Object.values(p.custom || {})
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .join(" ")
        .toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        customText.includes(q)
      )
    })
    const dir = effectiveSortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (effectiveSortValue === "name") return a.name.localeCompare(b.name) * dir
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir
    })
  }, [projects, effectiveSearch, effectiveSortValue, effectiveSortDirection, statusFilter, ownerFilter, clientFilter, currentUid])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  return (
    <Box sx={{ p: 0 }}>
      {!hideHeader ? (
        <DataHeader
          showDateControls={false}
          showDateTypeSelector={false}
          searchTerm={effectiveSearch}
          onSearchChange={(t) => {
            setEffectiveSearch(t)
            setPage(0)
          }}
          searchPlaceholder="Search projects…"
          filtersExpanded={filtersExpanded}
          onFiltersToggle={() => setFiltersExpanded((p) => !p)}
          filters={[
            {
              label: "Status",
              options: ["active", "on_hold", "completed"].map((v) => ({ id: v, name: v })),
              selectedValues: statusFilter as any,
              onSelectionChange: (values) => {
                setStatusFilter(values as any)
                setPage(0)
              },
            },
            {
              label: "Client",
              options: clients.map((c) => ({ id: c.id, name: c.name })),
              selectedValues: clientFilter !== "all" ? [clientFilter] : [],
              onSelectionChange: (values) => {
                const v = Array.isArray(values) && values.length ? String(values[0]) : ""
                setClientFilter(v || "all")
                setPage(0)
              },
            },
            {
              label: "Owner",
              options: [
                { id: "mine", name: "Me" },
                { id: "unassigned", name: "Unassigned" },
                ...staff.map((s) => ({ id: s.uid, name: s.displayName || s.email || s.uid })),
              ],
              selectedValues: ownerFilter !== "all" ? [ownerFilter] : [],
              onSelectionChange: (values) => {
                const v = Array.isArray(values) && values.length ? String(values[0]) : ""
                setOwnerFilter(v || "all")
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
                if (v) applyView(v as any)
                setPage(0)
              },
            },
          ]}
          sortOptions={[
            { value: "updatedAt", label: "Last Updated" },
            { value: "name", label: "Name" },
          ]}
          sortValue={effectiveSortValue}
          sortDirection={effectiveSortDirection}
          onSortChange={(value, direction) => {
            setEffectiveSort(value as any, direction)
            setPage(0)
          }}
          columns={columns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onCreateNew={openCreate}
          createButtonLabel="Add Project"
          singleRow={embed ? true : false}
          additionalControls={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
              <Select
                size="small"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                sx={{
                  minWidth: 120,
                  color: themeConfig.brandColors.offWhite,
                  "& .MuiSvgIcon-root": { color: themeConfig.brandColors.offWhite },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                }}
              >
                <MenuItem value="status">By Status</MenuItem>
                <MenuItem value="health">By Health</MenuItem>
                <MenuItem value="client">By Client</MenuItem>
              </Select>
              <IconButton
                size="small"
                title="List view"
                onClick={() => setViewMode("list")}
                sx={{ color: themeConfig.brandColors.offWhite, opacity: viewMode === "list" ? 1 : 0.5 }}
              >
                <ListIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                title="Kanban view"
                onClick={() => setViewMode("kanban")}
                sx={{ color: themeConfig.brandColors.offWhite, opacity: viewMode === "kanban" ? 1 : 0.5 }}
              >
                <KanbanIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        />
      ) : null}

      {viewMode === "kanban" ? (
        <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2, px: 1, minHeight: 400 }}>
          {(() => {
            const groups: { key: string; label: string; items: typeof filtered }[] = []
            if (groupBy === "status") {
              for (const s of ["active", "on_hold", "completed"] as ProjectStatus[]) {
                groups.push({ key: s, label: s.replace("_", " "), items: filtered.filter((p) => p.status === s) })
              }
            } else if (groupBy === "health") {
              for (const h of ["green", "amber", "red"] as const) {
                groups.push({ key: h, label: h, items: filtered.filter((p) => (p.health || "green") === h) })
              }
            } else if (groupBy === "client") {
              const seen = new Set<string>()
              for (const p of filtered) {
                const cid = p.clientId || "__none__"
                if (!seen.has(cid)) {
                  seen.add(cid)
                  groups.push({
                    key: cid,
                    label: cid === "__none__" ? "No Client" : (clients.find((c) => c.id === cid)?.name || cid),
                    items: filtered.filter((x) => (x.clientId || "__none__") === cid),
                  })
                }
              }
              if (groups.length === 0) groups.push({ key: "__none__", label: "No Client", items: [] })
            }
            return groups.map((g) => (
              <Paper key={g.key} sx={{ minWidth: 300, maxWidth: 360, p: 1.5, flexShrink: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography fontWeight={900} sx={{ textTransform: "capitalize" }}>{g.label}</Typography>
                  <Chip size="small" label={g.items.length} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {g.items.map((p) => {
                    const accent = rowAccentBg(p)
                    return (
                      <Paper
                        key={p.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          cursor: "pointer",
                          borderLeft: accent ? `4px solid ${accent}` : undefined,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => openView(p)}
                      >
                        <Typography fontWeight={700} variant="body2">{p.name}</Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            size="small"
                            label={p.status}
                            sx={{ textTransform: "capitalize", ...(chipSxFromBg(statusBg(p.status)) as any) }}
                          />
                          {p.dueDate ? <Chip size="small" label={p.dueDate} variant="outlined" /> : null}
                          {taskSummaryByProjectId.get(p.id)?.total ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${taskSummaryByProjectId.get(p.id)?.done}/${taskSummaryByProjectId.get(p.id)?.total} tasks done`}
                            />
                          ) : null}
                        </Box>
                        {p.description ? (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.5, display: "block", maxWidth: 280 }}>
                            {p.description}
                          </Typography>
                        ) : null}
                      </Paper>
                    )
                  })}
                  {g.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No projects
                    </Typography>
                  ) : null}
                </Box>
              </Paper>
            ))
          })()}
        </Box>
      ) : (
      <Paper
        sx={{
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: embed ? "calc(100vh - 260px)" : "calc(100vh - 300px)",
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
              {paginated.map((p) => {
                const accent = rowAccentBg(p)
                return (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    borderLeft: accent ? `4px solid ${accent}` : undefined,
                  }}
                  onClick={() => openView(p)}
                >
                  {columnVisibility["name"] !== false ? (
                    <TableCell>
                      <Typography fontWeight={800}>{p.name || "—"}</Typography>
                      {taskSummaryByProjectId.get(p.id)?.total || p.phase ? (
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
                          {taskSummaryByProjectId.get(p.id)?.total ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${taskSummaryByProjectId.get(p.id)?.done}/${taskSummaryByProjectId.get(p.id)?.total} tasks done`}
                            />
                          ) : null}
                          {p.phase ? <Chip size="small" variant="outlined" label={p.phase} /> : null}
                        </Box>
                      ) : null}
                    </TableCell>
                  ) : null}
                  {columnVisibility["status"] !== false ? (
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.status}
                        color={statusBg(p.status) ? "default" : (p.status === "active" ? "success" : p.status === "on_hold" ? "warning" : "default")}
                        sx={{ textTransform: "capitalize", ...(chipSxFromBg(statusBg(p.status)) as any) }}
                      />
                    </TableCell>
                  ) : null}
                  {columnVisibility["description"] !== false ? (
                    <TableCell>
                      <Typography noWrap sx={{ maxWidth: 520 }}>
                        {p.description || "—"}
                      </Typography>
                    </TableCell>
                  ) : null}

                  {customTableFields.map((f) => {
                    if (columnVisibility[`custom:${f.id}`] === false) return null
                    const v = (p.custom || {})[f.id]
                    if (f.type === "select") {
                      const s = String(v || "").trim()
                      const c = s ? customOptBg(f.id, s) : ""
                      return (
                        <TableCell key={f.id}>
                          {s ? <Chip size="small" label={s} sx={{ ...(chipSxFromBg(c) as any) }} /> : "—"}
                        </TableCell>
                      )
                    }
                    if (f.type === "multiselect") {
                      const arr = Array.isArray(v) ? v : []
                      return (
                        <TableCell key={f.id}>
                          {arr.length ? (
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {arr.map((x: any) => {
                                const s = String(x || "").trim()
                                if (!s) return null
                                const c = customOptBg(f.id, s)
                                return <Chip key={s} size="small" label={s} sx={{ ...(chipSxFromBg(c) as any) }} />
                              })}
                            </Box>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )
                    }
                    return (
                      <TableCell key={f.id}>
                        {formatCustomFieldForTable(f.type, v) || "—"}
                      </TableCell>
                    )
                  })}

                  {columnVisibility["updatedAt"] !== false ? (
                    <TableCell>{new Date(p.updatedAt).toLocaleString()}</TableCell>
                  ) : null}
                  {columnVisibility["actions"] !== false ? (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                        <IconButton size="small" title="Edit" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
                )
              })}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter((c) => columnVisibility[c.key] !== false).length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={FolderIcon}
                      title="No projects found"
                      description="Create your first project, or adjust your search/filters."
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
      )}

            <CRUDModal
        open={crudOpen}
        onClose={(reason) => {
          setCrudOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            closeCrud()
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "projectsModal1",
          crudMode: crudMode,
          id: selected?.id,
          itemLabel: selected?.name || draft.name || undefined,
        }}
        title={
          crudMode === "create" ? "Create Project" : crudMode === "edit" ? "Edit Project" : "View Project"
        }
        subtitle={selected?.id ? `Project: ${selected.id}` : undefined}
        icon={<FolderIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selected ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : save}
      >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 }}>
            <TextField
              label="Project Name"
              required
              fullWidth
              value={draft.name}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <Select
              fullWidth
              value={draft.status}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ProjectStatus }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.clientId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, clientId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Link To Client (Optional)"
                return clients.find((c) => c.id === id)?.name || "Client"
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>

            <Select
              fullWidth
              value={validDraftOwnerUserId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, ownerUserId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Owner (Optional)"
                const u = staff.find((s) => s.uid === id)
                return u?.displayName || u?.email || id
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.uid} value={s.uid}>
                  {s.displayName || s.email || s.uid}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={draft.startDate}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={draft.dueDate}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <Select
              fullWidth
              value={draft.health}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, health: e.target.value as any }))}
            >
              <MenuItem value="green">Green</MenuItem>
              <MenuItem value="amber">Amber</MenuItem>
              <MenuItem value="red">Red</MenuItem>
            </Select>
          </Box>

          <TextField
            sx={{ mt: 2 }}
            label="Description"
            fullWidth
            multiline
            minRows={4}
            value={draft.description}
            disabled={crudMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
            <TextField
              label="Phase"
              fullWidth
              value={draft.phase}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, phase: e.target.value }))}
            />
            <TextField
              label="Budget"
              fullWidth
              type="number"
              value={draft.budgetAmount}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, budgetAmount: e.target.value }))}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              label="Sprint Cadence"
              fullWidth
              value={draft.sprintCadence}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, sprintCadence: e.target.value }))}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Select
              fullWidth
              multiple
              value={validDraftTeamUserIds}
              disabled={crudMode === "view"}
              onChange={(e) => {
                const next = Array.isArray(e.target.value) ? e.target.value : String(e.target.value || "").split(",")
                setDraft((d) => ({ ...d, teamUserIds: next.map((id) => String(id || "")) }))
              }}
              displayEmpty
              renderValue={(selectedIds) => {
                const ids = Array.isArray(selectedIds) ? selectedIds : []
                if (!ids.length) return "Team Members (Optional)"
                return ids
                  .map((id) => {
                    const user = staff.find((member) => member.uid === id)
                    return user?.displayName || user?.email || id
                  })
                  .join(", ")
              }}
            >
              {staff.map((member) => (
                <MenuItem key={member.uid} value={member.uid}>
                  {member.displayName || member.email || member.uid}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <CustomFieldsSection
            fields={fields}
            value={customDraft}
            disabled={crudMode === "view"}
            onChange={(next) => setCustomDraft(next)}
            optionColorsByFieldId={projectCustomFieldColors}
          />

          {selected?.id ? (
            <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1 }}>
                  <Typography fontWeight={900}>Delivery Snapshot</Typography>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/Tasks/Tasks?create=1&projectId=${encodeURIComponent(selected.id)}`)}>
                    Add Task
                  </Button>
                </Box>
                {taskSummaryByProjectId.get(selected.id)?.total ? (
                  <Box sx={{ display: "grid", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {taskSummaryByProjectId.get(selected.id)?.done} of {taskSummaryByProjectId.get(selected.id)?.total} linked tasks are complete.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {relatedTasks
                        .filter((task) => task.projectId === selected.id)
                        .slice(0, 8)
                        .map((task) => (
                          <Chip key={task.id} label={task.title || task.id} onClick={() => navigate(`/Tasks/Tasks?taskId=${encodeURIComponent(task.id)}`)} />
                        ))}
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No linked tasks yet.
                  </Typography>
                )}
              </Paper>
              <ActivityComposer entityType="project" entityId={selected.id} defaultTitle={selected.name || "Project update"} />
              <ActivityTimeline entityType="project" entityId={selected.id} title="Project activity" />
            </Box>
          ) : null}
        </Box>
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete project <strong>{toDelete?.name || "—"}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Close</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={!toDelete?.id}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings moved to the Settings tab */}
    </Box>
  )
}

export default Projects

