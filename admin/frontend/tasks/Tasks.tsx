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
  Assignment as TaskIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  Edit as EditIcon,
  ViewColumn as KanbanIcon,
  ViewList as ListIcon,
} from "@mui/icons-material"
import { useLocation, useNavigate } from "react-router-dom"
import { db, onValue, push, ref, update } from "../../backend/services/Firebase"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import CustomFieldsSection, { formatCustomFieldForTable } from "./components/CustomFieldsSection"
import type { CustomFieldDefinition, TaskPriority, TaskStatus } from "./types"
import type { StaffProfile } from "../shared/models"
import { createActivity, createUserNotifications, indexPath, nowMs, rootUpdate } from "../shared/rtdb"
import ActivityComposer from "../shared/ActivityComposer"
import ActivityTimeline from "../shared/ActivityTimeline"
import { useAdmin } from "../../backend/context/AdminContext"
import { chipSxFromBg, normalizeHexColor } from "../shared/colorUtils"

export type TaskView = {
  id: string
  name: string
  config: {
    taskSearch?: string
    statusFilter?: TaskStatus[]
    priorityFilter?: TaskPriority[]
    projectFilter?: string[]
    sprintFilter?: string[]
    sortValue?: "updatedAt" | "dueDate" | "title"
    sortDirection?: "asc" | "desc"
  }
  createdAt: number
  updatedAt: number
}

export type AdminTask = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  projectId?: string
  clientId?: string
  description?: string
  tags?: string[]
  assignee?: string // legacy/display
  assigneeUserIds?: string[]
  parentTaskId?: string
  dependencyTaskIds?: string[]
  estimatedHours?: number
  timeLoggedHours?: number
  watcherUserIds?: string[]
  sprintName?: string
  custom?: Record<string, any>
  createdAt: number
  updatedAt: number
}

type AdminProjectLite = { id: string; name: string }
type ClientLite = { id: string; name: string }

interface TasksProps {
  fields: CustomFieldDefinition[]
  projects: AdminProjectLite[]
  clients: ClientLite[]
  staff: Array<Pick<StaffProfile, "uid" | "email" | "displayName">>
}

export default function Tasks({ fields, projects, clients, staff }: TasksProps) {
  const { state } = useAdmin()
  const currentUid = state.user?.uid || ""
  const staffIdSet = useMemo(() => new Set((staff || []).map((member) => String(member.uid || "")).filter(Boolean)), [staff])
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

  const [tasks, setTasks] = useState<AdminTask[]>([])

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "project" | "sprint">("status")

  // Header controls
  const [taskSearch, setTaskSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([])
  const [projectFilter, setProjectFilter] = useState<string[]>([])
  const [sprintFilter, setSprintFilter] = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string>("all") // all | clientId
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all") // all | mine | unassigned | uid
  const [sortValue, setSortValue] = useState<"updatedAt" | "dueDate" | "title">("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Views (keep existing functionality)
  const [views, setViews] = useState<TaskView[]>([])
  const [activeViewId, setActiveViewId] = useState<string>("")

  // Table
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // CRUD
  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<AdminTask | null>(null)
  const [draft, setDraft] = useState<{
    title: string
    status: TaskStatus
    priority: TaskPriority
    dueDate: string
    projectId: string
    clientId: string
    description: string
    tags: string
    assignee: string
    assigneeUserId: string
    parentTaskId: string
    dependencyTaskIds: string[]
    estimatedHours: string
    timeLoggedHours: string
    watcherUserIds: string[]
    sprintName: string
  }>({
    title: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    projectId: "",
    clientId: "",
    description: "",
    tags: "",
    assignee: "",
    assigneeUserId: "",
    parentTaskId: "",
    dependencyTaskIds: [],
    estimatedHours: "",
    timeLoggedHours: "",
    watcherUserIds: [],
    sprintName: "",
  })
  const [customDraft, setCustomDraft] = useState<Record<string, any>>({})
  const validDraftAssigneeUserId = draft.assigneeUserId && staffIdSet.has(draft.assigneeUserId) ? draft.assigneeUserId : ""
  const validDraftWatcherUserIds = useMemo(
    () => (draft.watcherUserIds || []).map((id) => String(id || "")).filter((id) => staffIdSet.has(id)),
    [draft.watcherUserIds, staffIdSet],
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AdminTask | null>(null)

  const [taskColors, setTaskColors] = useState<{
    status: Partial<Record<TaskStatus, string>>
    priority: Partial<Record<TaskPriority, string>>
  }>({ status: {}, priority: {} })
  const [taskCustomFieldColors, setTaskCustomFieldColors] = useState<Record<string, Record<string, string>>>({})
  const [rowColoring, setRowColoring] = useState<{ mode: "none" | "status" | "priority" | "customField"; fieldId?: string }>({
    mode: "status",
    fieldId: "",
  })

  useEffect(() => {
    const tasksRef = ref(db, `admin/tasks`)
    const unsub = onValue(tasksRef, (snap) => {
      const val = snap.val() || {}
      const rows: AdminTask[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        title: raw?.title || "",
        status: (raw?.status as TaskStatus) || "todo",
        priority: (raw?.priority as TaskPriority) || "medium",
        dueDate: raw?.dueDate || "",
        projectId: raw?.projectId || "",
        clientId: raw?.clientId || "",
        description: raw?.description || "",
        tags: Array.isArray(raw?.tags) ? raw.tags : [],
        assignee: raw?.assignee || "",
        assigneeUserIds: Array.isArray(raw?.assigneeUserIds) ? raw.assigneeUserIds : [],
        parentTaskId: raw?.parentTaskId || "",
        dependencyTaskIds: Array.isArray(raw?.dependencyTaskIds) ? raw.dependencyTaskIds : [],
        estimatedHours: typeof raw?.estimatedHours === "number" ? raw.estimatedHours : undefined,
        timeLoggedHours: typeof raw?.timeLoggedHours === "number" ? raw.timeLoggedHours : undefined,
        watcherUserIds: Array.isArray(raw?.watcherUserIds) ? raw.watcherUserIds : [],
        sprintName: raw?.sprintName || "",
        custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => b.updatedAt - a.updatedAt)
      setTasks(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const cRef = ref(db, "admin/ui/colors/tasks")
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      setTaskColors({
        status: (val?.status || {}) as any,
        priority: (val?.priority || {}) as any,
      })
      setTaskCustomFieldColors(((val?.customFields || {}) as any) || {})
      const rc = (val?.rowColoring || {}) as any
      setRowColoring({
        mode: (rc?.mode as any) || "status",
        fieldId: String(rc?.fieldId || ""),
      })
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const viewsRef = ref(db, `admin/tasks/views`)
    const unsub = onValue(viewsRef, (snap) => {
      const val = snap.val() || {}
      const rows: TaskView[] = Object.entries(val).map(([id, raw]: any) => ({
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

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => map.set(p.id, p.name))
    return map
  }, [projects])

  const taskTitleById = useMemo(() => {
    const map = new Map<string, string>()
    tasks.forEach((task) => map.set(task.id, task.title || task.id))
    return map
  }, [tasks])

  const childTasksByParentId = useMemo(() => {
    const map = new Map<string, AdminTask[]>()
    tasks.forEach((task) => {
      const parentId = String(task.parentTaskId || "").trim()
      if (!parentId) return
      const current = map.get(parentId) || []
      current.push(task)
      map.set(parentId, current)
    })
    return map
  }, [tasks])

  const taskById = useMemo(() => {
    const map = new Map<string, AdminTask>()
    tasks.forEach((task) => map.set(task.id, task))
    return map
  }, [tasks])

  const customTableFields = useMemo(() => (fields || []).filter((f) => f.showInTable), [fields])
  const sprintOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => String(task.sprintName || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [tasks],
  )

  const columns = useMemo(() => {
    const base = [
      { key: "title", label: "Title" },
      { key: "project", label: "Project" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "dueDate", label: "Due" },
      { key: "assignee", label: "Assignee" },
      { key: "updatedAt", label: "Updated" },
      { key: "actions", label: "Actions" },
    ]
    const customs = customTableFields.map((f) => ({ key: `custom:${f.id}`, label: f.label }))
    // insert customs after Priority
    const idx = base.findIndex((x) => x.key === "priority")
    return [...base.slice(0, idx + 1), ...customs, ...base.slice(idx + 1)]
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
    const q = taskSearch.trim().toLowerCase()
    const base = tasks.filter((t) => {
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false
      if (projectFilter.length > 0 && !projectFilter.includes(t.projectId || "")) return false
      if (sprintFilter.length > 0 && !sprintFilter.includes(String(t.sprintName || ""))) return false
      if (clientFilter !== "all" && String(t.clientId || "") !== clientFilter) return false
      if (assigneeFilter === "mine") {
        if (!currentUid) return false
        if (!(t.assigneeUserIds || []).includes(currentUid)) return false
      }
      if (assigneeFilter === "unassigned") {
        if ((t.assigneeUserIds || []).length > 0) return false
      }
      if (assigneeFilter !== "all" && assigneeFilter !== "mine" && assigneeFilter !== "unassigned") {
        if (!(t.assigneeUserIds || []).includes(assigneeFilter)) return false
      }

      if (!q) return true
      const projectName = projectNameById.get(t.projectId || "") || ""
      const tagsText = (t.tags || []).join(" ").toLowerCase()
      const assigneeText = String(t.assignee || "").toLowerCase()
      const customText = Object.values(t.custom || {})
        .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
        .join(" ")
        .toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        projectName.toLowerCase().includes(q) ||
        tagsText.includes(q) ||
        assigneeText.includes(q) ||
        customText.includes(q)
      )
    })

    const dir = sortDirection === "asc" ? 1 : -1
    return [...base].sort((a, b) => {
      if (sortValue === "title") return a.title.localeCompare(b.title) * dir
      if (sortValue === "dueDate") return String(a.dueDate || "").localeCompare(String(b.dueDate || "")) * dir
      return (Number(a.updatedAt || 0) - Number(b.updatedAt || 0)) * dir
    })
  }, [
    tasks,
    taskSearch,
    projectNameById,
    statusFilter,
    priorityFilter,
    projectFilter,
    sprintFilter,
    sortValue,
    sortDirection,
    clientFilter,
    assigneeFilter,
    currentUid,
  ])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, page, rowsPerPage])

  const applyView = (v: TaskView | null) => {
    if (!v) return
    const cfg = v.config || {}
    setTaskSearch(String(cfg.taskSearch || ""))
    setStatusFilter(Array.isArray(cfg.statusFilter) ? (cfg.statusFilter as TaskStatus[]) : [])
    setPriorityFilter(Array.isArray(cfg.priorityFilter) ? (cfg.priorityFilter as TaskPriority[]) : [])
    setProjectFilter(Array.isArray(cfg.projectFilter) ? (cfg.projectFilter as string[]) : [])
    setSprintFilter(Array.isArray(cfg.sprintFilter) ? (cfg.sprintFilter as string[]) : [])
    // Keep new filters independent from saved views for now (safe default)
    setSortValue((cfg.sortValue as any) || "updatedAt")
    setSortDirection((cfg.sortDirection as any) || "desc")
  }

  const saveCurrentView = useCallback(async () => {
    const name = window.prompt("Save current task view as:", "")
    const trimmed = String(name || "").trim()
    if (!trimmed) return
    const now = nowMs()
    const newRef = push(ref(db, "admin/tasks/views"))
    const id = newRef.key || ""
    if (!id) return
    await rootUpdate({
      [`admin/tasks/views/${id}`]: {
        name: trimmed,
        config: {
          taskSearch,
          statusFilter,
          priorityFilter,
          projectFilter,
          sprintFilter,
          sortValue,
          sortDirection,
        },
        createdAt: now,
        updatedAt: now,
      },
    })
    setActiveViewId(id)
  }, [priorityFilter, projectFilter, sortDirection, sortValue, sprintFilter, statusFilter, taskSearch])

  const openCreate = useCallback(() => {
    const params = new URLSearchParams(location.search || "")
    const projectId = getParam(params, "ProjectId") || ""
    const clientId = getParam(params, "ClientId") || ""
    setSelected(null)
    setDraft({
      title: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      projectId,
      clientId,
      description: "",
      tags: "",
      assignee: "",
      assigneeUserId: currentUid,
      parentTaskId: "",
      dependencyTaskIds: [],
      estimatedHours: "",
      timeLoggedHours: "",
      watcherUserIds: currentUid ? [currentUid] : [],
      sprintName: "",
    })
    setCustomDraft({})
    setCrudMode("create")
    setCrudOpen(true)
  }, [currentUid, location.search])

  const openView = useCallback(
    (t: AdminTask) => {
      setSelected(t)
      setDraft({
        title: t.title || "",
        status: t.status || "todo",
        priority: t.priority || "medium",
        dueDate: t.dueDate || "",
        projectId: t.projectId || "",
        clientId: t.clientId || "",
        description: t.description || "",
        tags: (t.tags || []).join(", "),
        assignee: t.assignee || "",
        assigneeUserId: (t.assigneeUserIds || [])[0] || "",
        parentTaskId: t.parentTaskId || "",
        dependencyTaskIds: Array.isArray(t.dependencyTaskIds) ? t.dependencyTaskIds : [],
        estimatedHours: t.estimatedHours === undefined ? "" : String(t.estimatedHours),
        timeLoggedHours: t.timeLoggedHours === undefined ? "" : String(t.timeLoggedHours),
        watcherUserIds: Array.isArray(t.watcherUserIds) ? t.watcherUserIds : [],
        sprintName: t.sprintName || "",
      })
      setCustomDraft(t.custom && typeof t.custom === "object" ? t.custom : {})
      setCrudMode("view")
      setCrudOpen(true)

      const params = new URLSearchParams(location.search || "")
      setCanonicalParam(params, "TaskId", t.id)
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
    },
    [location.pathname, location.search, navigate],
  )

  const openEdit = useCallback((t: AdminTask) => {
    setSelected(t)
    setDraft({
      title: t.title || "",
      status: t.status || "todo",
      priority: t.priority || "medium",
      dueDate: t.dueDate || "",
      projectId: t.projectId || "",
      clientId: t.clientId || "",
      description: t.description || "",
      tags: (t.tags || []).join(", "),
      assignee: t.assignee || "",
      assigneeUserId: (t.assigneeUserIds || [])[0] || "",
      parentTaskId: t.parentTaskId || "",
      dependencyTaskIds: Array.isArray(t.dependencyTaskIds) ? t.dependencyTaskIds : [],
      estimatedHours: t.estimatedHours === undefined ? "" : String(t.estimatedHours),
      timeLoggedHours: t.timeLoggedHours === undefined ? "" : String(t.timeLoggedHours),
      watcherUserIds: Array.isArray(t.watcherUserIds) ? t.watcherUserIds : [],
      sprintName: t.sprintName || "",
    })
    setCustomDraft(t.custom && typeof t.custom === "object" ? t.custom : {})
    setCrudMode("edit")
    setCrudOpen(true)
  }, [])

  const closeCrud = useCallback(() => {
    setCrudOpen(false)
    setSelected(null)
    setCrudMode("create")

    const params = new URLSearchParams(location.search || "")
    if (getParam(params, "TaskId")) {
      deleteCanonicalParam(params, "TaskId")
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  // Deep-link: /Tasks?tab=tasks&taskId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const taskId = String(getParam(params, "TaskId") || "").trim()
    if (!taskId) return
    if (crudOpen) return
    const found = tasks.find((t) => t.id === taskId)
    if (found) openView(found)
  }, [crudOpen, location.search, openView, tasks])

  // Deep-link create: /Tasks?tab=tasks&create=1&projectId=...&clientId=...
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
    if (!draft.title.trim()) return
    const modeSnapshot = crudMode
    const selectedSnapshot = selected
    const now = nowMs()
    const tags = draft.tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)

    const assigneeUserId = staffIdSet.has(String(draft.assigneeUserId || "")) ? String(draft.assigneeUserId || "") : ""
    const assigneeUserIds = assigneeUserId ? [assigneeUserId] : []
    const assigneeLabel =
      assigneeUserId ? (staff.find((s) => s.uid === assigneeUserId)?.displayName || staff.find((s) => s.uid === assigneeUserId)?.email || "") : ""
    const parentTaskId = String(draft.parentTaskId || "").trim()
    const dependencyTaskIds = Array.from(new Set((draft.dependencyTaskIds || []).map((id) => String(id || "").trim()).filter(Boolean)))
      .filter((id) => id !== (selected?.id || ""))
      .filter((id) => id !== parentTaskId)
    const estimatedHours = Number(draft.estimatedHours || 0)
    const timeLoggedHours = Number(draft.timeLoggedHours || 0)
    const watcherUserIds = Array.from(new Set((draft.watcherUserIds || []).map((id) => String(id || "").trim()).filter((id) => staffIdSet.has(id))))

    const payload = {
      title: draft.title.trim(),
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate || "",
      projectId: draft.projectId || "",
      clientId: draft.clientId || "",
      description: draft.description,
      tags,
      assignee: (assigneeLabel || draft.assignee || "").trim(),
      assigneeUserIds,
      parentTaskId,
      dependencyTaskIds,
      estimatedHours: Number.isFinite(estimatedHours) && estimatedHours > 0 ? estimatedHours : null,
      timeLoggedHours: Number.isFinite(timeLoggedHours) && timeLoggedHours > 0 ? timeLoggedHours : null,
      watcherUserIds,
      sprintName: String(draft.sprintName || "").trim(),
      custom: customDraft || {},
      updatedAt: now,
    }

    if (selected?.id && crudMode === "edit") {
      const updates: Record<string, any> = {
        [`admin/tasks/${selected.id}`]: { ...(selected as any), ...payload },
      }

      // Index maintenance
      const oldClientId = String(selected.clientId || "")
      const newClientId = String(draft.clientId || "")
      if (oldClientId && oldClientId !== newClientId) updates[indexPath("tasksByClient", oldClientId, selected.id)] = null
      if (newClientId) updates[indexPath("tasksByClient", newClientId, selected.id)] = true

      const oldProjectId = String(selected.projectId || "")
      const newProjectId = String(draft.projectId || "")
      if (oldProjectId && oldProjectId !== newProjectId) updates[indexPath("tasksByProject", oldProjectId, selected.id)] = null
      if (newProjectId) updates[indexPath("tasksByProject", newProjectId, selected.id)] = true

      const oldAssignees = Array.isArray((selected as any).assigneeUserIds) ? ((selected as any).assigneeUserIds as string[]) : []
      const newAssignees = Array.isArray(assigneeUserIds) ? assigneeUserIds : []
      for (const uid of oldAssignees) {
        if (!newAssignees.includes(uid)) updates[indexPath("tasksByAssignee", uid, selected.id)] = null
      }
      for (const uid of newAssignees) {
        updates[indexPath("tasksByAssignee", uid, selected.id)] = true
      }

      await rootUpdate(updates)

      await createActivity({
        type: "task_updated",
        title: "Task updated",
        body: payload.title,
        taskId: selected.id,
        projectId: newProjectId || undefined,
        clientId: newClientId || undefined,
        createdAt: now,
        updatedAt: now,
      } as any)
      await createUserNotifications({
        userIds: [...newAssignees, ...watcherUserIds].filter((uid) => uid && uid !== currentUid),
        type: "task_updated",
        title: payload.title,
        body: "A task you are following was updated.",
        links: {
          taskId: selected.id,
          projectId: newProjectId || undefined,
          clientId: newClientId || undefined,
        },
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "tasksModal1",
        crudMode: modeSnapshot,
        id: selectedSnapshot?.id,
        itemLabel: selectedSnapshot?.title || payload.title,
      })
      closeCrud()
      return
    }

    const newRef = push(ref(db, `admin/tasks`))
    const id = newRef.key || ""
    if (!id) return
    const updates: Record<string, any> = {
      [`admin/tasks/${id}`]: { ...payload, createdAt: now },
    }
    if (draft.clientId) updates[indexPath("tasksByClient", draft.clientId, id)] = true
    if (draft.projectId) updates[indexPath("tasksByProject", draft.projectId, id)] = true
    for (const uid of assigneeUserIds) {
      updates[indexPath("tasksByAssignee", uid, id)] = true
    }
    await rootUpdate(updates)

    await createActivity({
      type: "task_created",
      title: "Task created",
      body: payload.title,
      taskId: id,
      projectId: payload.projectId || undefined,
      clientId: payload.clientId || undefined,
      createdAt: now,
      updatedAt: now,
    } as any)
    await createUserNotifications({
      userIds: [...assigneeUserIds, ...watcherUserIds].filter((uid) => uid && uid !== currentUid),
      type: "task_created",
      title: payload.title,
      body: "You were added to a new task.",
      links: {
        taskId: id,
        projectId: payload.projectId || undefined,
        clientId: payload.clientId || undefined,
      },
    })
    removeWorkspaceFormDraft(location.pathname, {
      crudEntity: "tasksModal1",
      crudMode: modeSnapshot,
      id,
      itemLabel: payload.title,
    })
    closeCrud()
  }, [closeCrud, crudMode, currentUid, customDraft, draft, location.pathname, selected, staff, staffIdSet])

  const askDelete = useCallback((t: AdminTask) => {
    setToDelete(t)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!toDelete?.id) return
    const updates: Record<string, any> = {
      [`admin/tasks/${toDelete.id}`]: null,
    }
    const clientId = String(toDelete.clientId || "")
    const projectId = String(toDelete.projectId || "")
    if (clientId) updates[indexPath("tasksByClient", clientId, toDelete.id)] = null
    if (projectId) updates[indexPath("tasksByProject", projectId, toDelete.id)] = null
    for (const uid of Array.isArray(toDelete.assigneeUserIds) ? toDelete.assigneeUserIds : []) {
      if (uid) updates[indexPath("tasksByAssignee", uid, toDelete.id)] = null
    }
    await rootUpdate(updates)
    setDeleteConfirmOpen(false)
    setToDelete(null)
  }, [toDelete])

  const quickSetStatus = async (task: AdminTask, nextStatus: TaskStatus) => {
    if (!task?.id) return
    await update(ref(db, `admin/tasks/${task.id}`), { status: nextStatus, updatedAt: Date.now() })
  }

  const statusChipColor = (s: TaskStatus) => {
    if (s === "done") return "success"
    if (s === "blocked") return "warning"
    if (s === "in_progress") return "info"
    return "default"
  }

  const statusBg = (s: TaskStatus) => normalizeHexColor((taskColors.status as any)?.[s] || "")
  const priorityBg = (p: TaskPriority) => normalizeHexColor((taskColors.priority as any)?.[p] || "")
  const customOptBg = (fieldId: string, opt: string) => normalizeHexColor(taskCustomFieldColors?.[fieldId]?.[opt] || "")

  const rowAccentBg = (t: AdminTask): string => {
    if (rowColoring.mode === "none") return ""
    if (rowColoring.mode === "status") return statusBg(t.status)
    if (rowColoring.mode === "priority") return priorityBg(t.priority)
    if (rowColoring.mode === "customField") {
      const fid = String(rowColoring.fieldId || "").trim()
      if (!fid) return ""
      const def = (fields || []).find((f) => f.id === fid) || null
      if (!def || (def.type !== "select" && def.type !== "multiselect")) return ""
      const raw = (t.custom || {})[fid]
      const opt =
        def.type === "select"
          ? String(raw || "").trim()
          : Array.isArray(raw) && raw.length
            ? String(raw[0] || "").trim()
            : ""
      return opt ? customOptBg(fid, opt) : ""
    }
    return ""
  }

  const unresolvedDependencyCount = (task: AdminTask) =>
    (task.dependencyTaskIds || []).filter((id) => {
      const dep = taskById.get(id)
      return dep && dep.status !== "done"
    }).length

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={taskSearch}
        onSearchChange={(t) => {
          setTaskSearch(t)
          setPage(0)
        }}
        searchPlaceholder="Search title, description, status, priority, project, tags…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Status",
            options: [
              { id: "todo", name: "todo" },
              { id: "in_progress", name: "in_progress" },
              { id: "blocked", name: "blocked" },
              { id: "done", name: "done" },
            ],
            selectedValues: statusFilter,
            onSelectionChange: (values) => {
              setStatusFilter(values as TaskStatus[])
              setPage(0)
            },
          },
          {
            label: "Priority",
            options: [
              { id: "low", name: "low" },
              { id: "medium", name: "medium" },
              { id: "high", name: "high" },
            ],
            selectedValues: priorityFilter,
            onSelectionChange: (values) => {
              setPriorityFilter(values as TaskPriority[])
              setPage(0)
            },
          },
          {
            label: "Project",
            options: projects.map((p) => ({ id: p.id, name: p.name })),
            selectedValues: projectFilter,
            onSelectionChange: (values) => {
              setProjectFilter(values)
              setPage(0)
            },
          },
          {
            label: "Sprint",
            options: sprintOptions.map((name) => ({ id: name, name })),
            selectedValues: sprintFilter,
            onSelectionChange: (values) => {
              setSprintFilter(values)
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
            label: "Assignee",
            options: [
              { id: "mine", name: "Me" },
              { id: "unassigned", name: "Unassigned" },
              ...staff.map((s) => ({ id: s.uid, name: s.displayName || s.email || s.uid })),
            ],
            selectedValues: assigneeFilter !== "all" ? [assigneeFilter] : [],
            onSelectionChange: (values) => {
              const v = Array.isArray(values) && values.length ? String(values[0]) : ""
              setAssigneeFilter(v || "all")
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
          { value: "dueDate", label: "Due Date" },
          { value: "title", label: "Title" },
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
        createButtonLabel="Add Task"
        additionalControls={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
            <Button size="small" variant="outlined" onClick={() => void saveCurrentView()} sx={{ color: themeConfig.brandColors.offWhite, borderColor: themeConfig.brandColors.offWhite }}>
              Save View
            </Button>
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
              <MenuItem value="priority">By Priority</MenuItem>
              <MenuItem value="project">By Project</MenuItem>
              <MenuItem value="sprint">By Sprint</MenuItem>
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

      {viewMode === "kanban" ? (
        <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2, px: 1, minHeight: 400 }}>
          {(() => {
            const groups: { key: string; label: string; items: typeof filtered }[] = []
            if (groupBy === "status") {
              for (const s of ["todo", "in_progress", "blocked", "done"] as TaskStatus[]) {
                groups.push({ key: s, label: s.replace("_", " "), items: filtered.filter((t) => t.status === s) })
              }
            } else if (groupBy === "priority") {
              for (const p of ["high", "medium", "low"] as TaskPriority[]) {
                groups.push({ key: p, label: p, items: filtered.filter((t) => t.priority === p) })
              }
            } else if (groupBy === "project") {
              const seen = new Set<string>()
              for (const t of filtered) {
                const pid = t.projectId || "__none__"
                if (!seen.has(pid)) {
                  seen.add(pid)
                  groups.push({
                    key: pid,
                    label: pid === "__none__" ? "No Project" : (projectNameById.get(pid) || pid),
                    items: filtered.filter((x) => (x.projectId || "__none__") === pid),
                  })
                }
              }
              if (groups.length === 0) groups.push({ key: "__none__", label: "No Project", items: [] })
            } else if (groupBy === "sprint") {
              const seen = new Set<string>()
              for (const t of filtered) {
                const sprint = String(t.sprintName || "").trim() || "__none__"
                if (!seen.has(sprint)) {
                  seen.add(sprint)
                  groups.push({
                    key: sprint,
                    label: sprint === "__none__" ? "Backlog" : sprint,
                    items: filtered.filter((x) => (String(x.sprintName || "").trim() || "__none__") === sprint),
                  })
                }
              }
              if (groups.length === 0) groups.push({ key: "__none__", label: "Backlog", items: [] })
            }
            return groups.map((g) => (
              <Paper key={g.key} sx={{ minWidth: 300, maxWidth: 360, p: 1.5, flexShrink: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography fontWeight={900} sx={{ textTransform: "capitalize" }}>{g.label}</Typography>
                  <Chip size="small" label={g.items.length} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {g.items.map((t) => {
                    const accent = rowAccentBg(t)
                    return (
                      <Paper
                        key={t.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          cursor: "pointer",
                          borderLeft: accent ? `4px solid ${accent}` : undefined,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => openView(t)}
                      >
                        <Typography fontWeight={700} variant="body2">{t.title}</Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                          <Chip
                            size="small"
                            label={t.priority}
                            sx={{ textTransform: "capitalize", ...(chipSxFromBg(priorityBg(t.priority)) as any) }}
                          />
                          {t.dueDate ? <Chip size="small" label={t.dueDate} variant="outlined" /> : null}
                          {t.assignee ? <Chip size="small" label={t.assignee} variant="outlined" /> : null}
                          {t.parentTaskId ? <Chip size="small" label={`Subtask of ${taskTitleById.get(t.parentTaskId) || t.parentTaskId}`} variant="outlined" /> : null}
                          {childTasksByParentId.get(t.id)?.length ? <Chip size="small" label={`${childTasksByParentId.get(t.id)?.length} subtasks`} variant="outlined" /> : null}
                          {unresolvedDependencyCount(t) ? <Chip size="small" color="warning" label={`${unresolvedDependencyCount(t)} blockers`} /> : null}
                          {t.estimatedHours ? <Chip size="small" variant="outlined" label={`${t.timeLoggedHours || 0}/${t.estimatedHours}h`} /> : null}
                        </Box>
                        {t.projectId && groupBy !== "project" ? (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            {projectNameById.get(t.projectId) || t.projectId}
                          </Typography>
                        ) : null}
                      </Paper>
                    )
                  })}
                  {g.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No tasks
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
              {paginated.map((t) => (
                (() => {
                  const accent = rowAccentBg(t)
                  return (
                <TableRow
                  key={t.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    borderLeft: accent ? `4px solid ${accent}` : undefined,
                  }}
                  onClick={() => openView(t)}
                >
                  {columnVisibility["title"] !== false ? (
                    <TableCell>
                      <Typography fontWeight={800}>{t.title || "—"}</Typography>
                      {t.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {t.description}
                        </Typography>
                      ) : null}
                      {t.parentTaskId || childTasksByParentId.get(t.id)?.length || unresolvedDependencyCount(t) ? (
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
                          {t.parentTaskId ? <Chip size="small" variant="outlined" label={`Parent: ${taskTitleById.get(t.parentTaskId) || t.parentTaskId}`} /> : null}
                          {childTasksByParentId.get(t.id)?.length ? (
                            <Chip size="small" variant="outlined" label={`${childTasksByParentId.get(t.id)?.length} subtasks`} />
                          ) : null}
                          {unresolvedDependencyCount(t) ? <Chip size="small" color="warning" label={`${unresolvedDependencyCount(t)} blockers`} /> : null}
                          {t.estimatedHours ? <Chip size="small" variant="outlined" label={`${t.timeLoggedHours || 0}/${t.estimatedHours}h`} /> : null}
                        </Box>
                      ) : null}
                    </TableCell>
                  ) : null}
                  {columnVisibility["project"] !== false ? (
                    <TableCell>{projectNameById.get(t.projectId || "") || "—"}</TableCell>
                  ) : null}
                  {columnVisibility["status"] !== false ? (
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.status}
                        color={statusBg(t.status) ? "default" : (statusChipColor(t.status) as any)}
                        sx={{ textTransform: "capitalize", ...(chipSxFromBg(statusBg(t.status)) as any) }}
                      />
                    </TableCell>
                  ) : null}
                  {columnVisibility["priority"] !== false ? (
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.priority}
                        color="default"
                        sx={{ textTransform: "capitalize", ...(chipSxFromBg(priorityBg(t.priority)) as any) }}
                      />
                    </TableCell>
                  ) : null}

                  {customTableFields.map((f) => {
                    if (columnVisibility[`custom:${f.id}`] === false) return null
                    const v = (t.custom || {})[f.id]
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

                  {columnVisibility["dueDate"] !== false ? <TableCell>{t.dueDate || "—"}</TableCell> : null}
                  {columnVisibility["assignee"] !== false ? <TableCell>{t.assignee || "—"}</TableCell> : null}
                  {columnVisibility["updatedAt"] !== false ? <TableCell>{new Date(t.updatedAt).toLocaleString()}</TableCell> : null}
                  {columnVisibility["actions"] !== false ? (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "inline-flex", gap: 0.5 }}>
                        <IconButton size="small" title="Mark done" onClick={() => void quickSetStatus(t, "done")}>
                          <DoneIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Edit" onClick={() => openEdit(t)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete" onClick={() => askDelete(t)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
                  )
                })()
              ))}

              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter((c) => columnVisibility[c.key] !== false).length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={TaskIcon}
                      title="No tasks found"
                      description="Create your first task, or adjust your search/filters."
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
                crudEntity: "tasksModal1",
                crudMode: crudMode,
                id: selected?.id,
                itemLabel: selected?.title || draft.title || undefined,
              }}
              title={crudMode === "create" ? "Create task" : crudMode === "edit" ? "Edit task" : "View task"}
              subtitle={selected?.id ? `Task: ${selected.id}` : undefined}
              icon={<TaskIcon />}
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
          <TextField
            label="Title"
            required
            fullWidth
            value={draft.title}
            disabled={crudMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.status}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as TaskStatus }))}
            >
              <MenuItem value="todo">Todo</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </Select>
            <Select
              fullWidth
              value={draft.priority}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TaskPriority }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={draft.dueDate}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.projectId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, projectId: String(e.target.value || "") }))}
              displayEmpty
            >
              <MenuItem value="">
                <em>No project</em>
              </MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
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
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={validDraftAssigneeUserId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, assigneeUserId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Assignee (Optional)"
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
            <TextField
              label="Assignee (Free Text)"
              fullWidth
              value={draft.assignee}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
              helperText="Optional. Prefer selecting a staff member above."
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <Select
              fullWidth
              value={draft.parentTaskId}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, parentTaskId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return "Parent Task (Optional)"
                return taskTitleById.get(id) || id
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {tasks
                .filter((task) => task.id !== selected?.id)
                .map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.title || task.id}
                  </MenuItem>
                ))}
            </Select>

            <Select
              fullWidth
              multiple
              value={draft.dependencyTaskIds}
              disabled={crudMode === "view"}
              onChange={(e) => {
                const next = Array.isArray(e.target.value) ? e.target.value : String(e.target.value || "").split(",")
                setDraft((d) => ({ ...d, dependencyTaskIds: next.map((id) => String(id || "")) }))
              }}
              displayEmpty
              renderValue={(selectedIds) => {
                const ids = Array.isArray(selectedIds) ? selectedIds : []
                if (!ids.length) return "Blocked By Tasks (Optional)"
                return ids.map((id) => taskTitleById.get(String(id)) || String(id)).join(", ")
              }}
            >
              {tasks
                .filter((task) => task.id !== selected?.id && task.id !== draft.parentTaskId)
                .map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.title || task.id}
                  </MenuItem>
                ))}
            </Select>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <TextField
              label="Estimated Hours"
              fullWidth
              type="number"
              value={draft.estimatedHours}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, estimatedHours: e.target.value }))}
              inputProps={{ min: 0, step: 0.5 }}
            />
            <TextField
              label="Sprint / Workstream"
              fullWidth
              value={draft.sprintName}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, sprintName: e.target.value }))}
              helperText="Use this to group backlog items, sprint buckets, or workstreams."
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <TextField
              label="Time Logged (Hours)"
              fullWidth
              type="number"
              value={draft.timeLoggedHours}
              disabled={crudMode === "view"}
              onChange={(e) => setDraft((d) => ({ ...d, timeLoggedHours: e.target.value }))}
              inputProps={{ min: 0, step: 0.25 }}
            />
            <Select
              fullWidth
              multiple
              value={validDraftWatcherUserIds}
              disabled={crudMode === "view"}
              onChange={(e) => {
                const next = Array.isArray(e.target.value) ? e.target.value : String(e.target.value || "").split(",")
                setDraft((d) => ({ ...d, watcherUserIds: next.map((id) => String(id || "")) }))
              }}
              displayEmpty
              renderValue={(selectedIds) => {
                const ids = Array.isArray(selectedIds) ? selectedIds : []
                if (!ids.length) return "Watchers (Optional)"
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

          <TextField
            sx={{ mt: 2 }}
            label="Tags (Comma Separated)"
            fullWidth
            value={draft.tags}
            disabled={crudMode === "view"}
            onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
          />

          <CustomFieldsSection
            fields={fields}
            value={customDraft}
            disabled={crudMode === "view"}
            onChange={setCustomDraft}
            optionColorsByFieldId={taskCustomFieldColors}
          />

          {selected?.id ? (
            <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
              {childTasksByParentId.get(selected.id)?.length ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={900} sx={{ mb: 1 }}>
                    Subtasks
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {(childTasksByParentId.get(selected.id) || []).map((task) => (
                      <Chip key={task.id} label={task.title || task.id} onClick={() => openView(task)} />
                    ))}
                  </Box>
                </Paper>
              ) : null}
              <ActivityComposer entityType="task" entityId={selected.id} defaultTitle={selected.title || "Task update"} />
              <ActivityTimeline entityType="task" entityId={selected.id} title="Task activity" />
            </Box>
          ) : null}
        </Box>
      </CRUDModal>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete task <strong>{toDelete?.title || "—"}</strong>? This cannot be undone.
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

