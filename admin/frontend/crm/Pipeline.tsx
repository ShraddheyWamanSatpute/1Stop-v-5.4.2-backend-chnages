import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Checkbox,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, ViewKanban as KanbanIcon } from "@mui/icons-material"
import { db, get, onValue, push, ref, update } from "../../backend/services/Firebase"
import CRUDModal, {
  type CRUDModalCloseReason,
  isCrudModalHardDismiss,
  removeWorkspaceFormDraft,
} from "../../../app/frontend/components/reusable/CRUDModal"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import type { CRMOpportunity, CRMPipeline, CRMStage, StaffProfile } from "../shared/models"
import { createActivity, indexPath, nowMs, rootUpdate, upsertInternalCalendarEvent } from "../shared/rtdb"
import OpportunityCRUDForm, { type OpportunityCRUDFormHandle } from "./forms/OpportunityCRUDForm"
import { useAdmin } from "../../backend/context/AdminContext"
import { ArrowDownward as DownIcon, ArrowUpward as UpIcon } from "@mui/icons-material"
import { useLocation, useNavigate } from "react-router-dom"

type ClientLite = { id: string; name: string }
type ContactLite = { id: string; name: string; clientId?: string }

function normalizePipeline(p: any, id: string): CRMPipeline {
  return {
    id,
    name: p?.name || "Pipeline",
    stageOrder: Array.isArray(p?.stageOrder) ? p.stageOrder : undefined,
    createdAt: p?.createdAt || nowMs(),
    updatedAt: p?.updatedAt || nowMs(),
  }
}

function normalizeStage(s: any, id: string): CRMStage {
  return {
    id,
    name: s?.name || "Stage",
    order: typeof s?.order === "number" ? s.order : undefined,
    probability: typeof s?.probability === "number" ? s.probability : undefined,
    requireNextAction: Boolean(s?.requireNextAction),
    createdAt: s?.createdAt || nowMs(),
    updatedAt: s?.updatedAt || nowMs(),
  }
}

function normalizeOpportunity(raw: any, id: string): CRMOpportunity {
  return {
    id,
    title: raw?.title || "",
    pipelineId: raw?.pipelineId || "default",
    stageId: raw?.stageId || "",
    status: raw?.status || "open",
    ownerUserId: raw?.ownerUserId || undefined,
    clientId: raw?.clientId || undefined,
    contactId: raw?.contactId || undefined,
    leadId: raw?.leadId || undefined,
    value:
      raw?.value && typeof raw.value === "object"
        ? { amount: Number(raw.value.amount || 0), currency: String(raw.value.currency || "GBP") }
        : undefined,
    probability: typeof raw?.probability === "number" ? raw.probability : undefined,
    expectedCloseAt: typeof raw?.expectedCloseAt === "number" ? raw.expectedCloseAt : undefined,
    nextAction: raw?.nextAction && typeof raw.nextAction === "object" ? raw.nextAction : undefined,
    wonAt: typeof raw?.wonAt === "number" ? raw.wonAt : undefined,
    lostAt: typeof raw?.lostAt === "number" ? raw.lostAt : undefined,
    convertedProjectId: raw?.convertedProjectId || undefined,
    convertedKickoffEventId: raw?.convertedKickoffEventId || undefined,
    convertedTaskIds: Array.isArray(raw?.convertedTaskIds) ? raw.convertedTaskIds : undefined,
    notes: raw?.notes || "",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    createdAt: raw?.createdAt || nowMs(),
    updatedAt: raw?.updatedAt || nowMs(),
  } as any
}

async function createProjectAndKickoff(params: {
  opportunityId: string
  opportunityTitle: string
  clientId?: string
  clientName?: string
  ownerUserId?: string
}) {
  const now = nowMs()
  const projectName = `${params.clientName ? `${params.clientName} • ` : ""}${params.opportunityTitle}`.trim()
  const projectRef = push(ref(db, "admin/projects"))
  const projectId = projectRef.key || ""
  if (!projectId) throw new Error("Failed to create project id")

  const eventStart = now + 24 * 60 * 60 * 1000 // tomorrow (simple default)
  const eventEnd = eventStart + 60 * 60 * 1000

  const ev = await upsertInternalCalendarEvent({
    title: `Kickoff: ${projectName}`,
    description: `Kickoff for opportunity ${params.opportunityId}`,
    type: "kickoff",
    startAt: eventStart,
    endAt: eventEnd,
    allDay: false,
    organizerUserId: params.ownerUserId || undefined,
    attendeeUserIds: params.ownerUserId ? [params.ownerUserId] : [],
    clientId: params.clientId || "",
    opportunityId: params.opportunityId,
    projectId,
    createdAt: now,
    updatedAt: now,
  } as any)

  // Auto-create a minimal project kickoff task set
  const t1Ref = push(ref(db, "admin/tasks"))
  const t2Ref = push(ref(db, "admin/tasks"))
  const taskId1 = t1Ref.key || ""
  const taskId2 = t2Ref.key || ""
  if (!taskId1 || !taskId2) throw new Error("Failed to create task ids")

  const updates: Record<string, any> = {
    [`admin/projects/${projectId}`]: {
      name: projectName || "Project",
      status: "active",
      clientId: params.clientId || "",
      ownerUserId: params.ownerUserId || "",
      description: `Auto-created from opportunity ${params.opportunityId}`,
      createdAt: now,
      updatedAt: now,
    },
    [`admin/tasks/${taskId1}`]: {
      title: "Kickoff & confirm scope",
      status: "todo",
      priority: "high",
      dueDate: "",
      projectId,
      clientId: params.clientId || "",
      description: `Created from won opportunity ${params.opportunityId}`,
      tags: ["kickoff"],
      assignee: "",
      assigneeUserIds: params.ownerUserId ? [params.ownerUserId] : [],
      opportunityId: params.opportunityId,
      createdAt: now,
      updatedAt: now,
    },
    [`admin/tasks/${taskId2}`]: {
      title: "Build initial project plan",
      status: "todo",
      priority: "medium",
      dueDate: "",
      projectId,
      clientId: params.clientId || "",
      description: `Created from won opportunity ${params.opportunityId}`,
      tags: ["planning"],
      assignee: "",
      assigneeUserIds: params.ownerUserId ? [params.ownerUserId] : [],
      opportunityId: params.opportunityId,
      createdAt: now,
      updatedAt: now,
    },
  }
  if (params.clientId) updates[indexPath("projectsByClient", params.clientId, projectId)] = true
  if (params.clientId) {
    updates[indexPath("tasksByClient", params.clientId, taskId1)] = true
    updates[indexPath("tasksByClient", params.clientId, taskId2)] = true
  }
  updates[indexPath("tasksByProject", projectId, taskId1)] = true
  updates[indexPath("tasksByProject", projectId, taskId2)] = true

  await rootUpdate(updates)

  await createActivity({
    type: "project_created",
    title: "Project created from won opportunity",
    body: projectName,
    projectId,
    opportunityId: params.opportunityId,
    clientId: params.clientId,
    createdAt: now,
    updatedAt: now,
    meta: { kickoffEventId: ev.id, createdTaskIds: [taskId1, taskId2] },
  } as any)

  await createActivity({
    type: "task_created",
    title: "Kickoff task created",
    body: "Kickoff & confirm scope",
    taskId: taskId1,
    projectId,
    opportunityId: params.opportunityId,
    clientId: params.clientId,
    createdAt: now,
    updatedAt: now,
  } as any)
  await createActivity({
    type: "task_created",
    title: "Planning task created",
    body: "Build initial project plan",
    taskId: taskId2,
    projectId,
    opportunityId: params.opportunityId,
    clientId: params.clientId,
    createdAt: now,
    updatedAt: now,
  } as any)

  return { projectId, kickoffEventId: ev.id, taskIds: [taskId1, taskId2] }
}

async function ensureDefaultPipeline() {
  const snap = await get(ref(db, "admin/crm/pipelines"))
  const existing = snap.val() || {}
  const hasAny = Object.keys(existing).length > 0
  if (hasAny) return

  const now = nowMs()
  const pipelineId = "default"
  const stages: Array<{ id: string; name: string; order: number; probability: number }> = [
    { id: "new", name: "New", order: 1, probability: 10 },
    { id: "contacted", name: "Contacted", order: 2, probability: 25 },
    { id: "qualified", name: "Qualified", order: 3, probability: 40 },
    { id: "proposal", name: "Proposal", order: 4, probability: 60 },
    { id: "negotiation", name: "Negotiation", order: 5, probability: 75 },
    { id: "won", name: "Won", order: 6, probability: 100 },
  ]

  const stageOrder = stages.map((s) => s.id)
  const updates: Record<string, any> = {
    [`admin/crm/pipelines/${pipelineId}`]: { name: "Default Pipeline", stageOrder, createdAt: now, updatedAt: now },
  }
  for (const s of stages) {
    updates[`admin/crm/pipelines/${pipelineId}/stages/${s.id}`] = { ...s, requireNextAction: s.id !== "won", createdAt: now, updatedAt: now }
  }
  await rootUpdate(updates)
}

export default function Pipeline() {
  const { state } = useAdmin()
  const currentUid = state.user?.uid || ""
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
  const [pipelines, setPipelines] = useState<CRMPipeline[]>([])
  const [stagesByPipelineId, setStagesByPipelineId] = useState<Record<string, CRMStage[]>>({})
  const [opps, setOpps] = useState<CRMOpportunity[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [staff, setStaff] = useState<Array<Pick<StaffProfile, "uid" | "email" | "displayName">>>([])

  const [activePipelineId, setActivePipelineId] = useState<string>("default")
  const [statusFilter, setStatusFilter] = useState<"open" | "won" | "lost">("open")
  const [ownerFilter, setOwnerFilter] = useState<string>("all") // all | mine | unassigned | uid
  const [search, setSearch] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [crudOpen, setCrudOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [selected, setSelected] = useState<CRMOpportunity | null>(null)
  const formRef = useRef<OpportunityCRUDFormHandle | null>(null)

  // Pipeline settings (minimal)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [deleteStageId, setDeleteStageId] = useState<string>("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    ensureDefaultPipeline().catch(() => {})
  }, [])

  // Load pipelines + nested stages
  useEffect(() => {
    const pRef = ref(db, "admin/crm/pipelines")
    const unsub = onValue(pRef, (snap) => {
      const val = snap.val() || {}
      const pRows: CRMPipeline[] = Object.entries(val).map(([id, raw]: any) => normalizePipeline(raw, String(id)))
      pRows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setPipelines(pRows)

      const nextStages: Record<string, CRMStage[]> = {}
      for (const p of pRows) {
        const stagesVal = val?.[p.id]?.stages || {}
        const sRows: CRMStage[] = Object.entries(stagesVal).map(([sid, sraw]: any) => normalizeStage(sraw, String(sid)))
        const order = Array.isArray(p.stageOrder) ? p.stageOrder : []
        if (order.length) {
          const byId = new Map(sRows.map((s) => [s.id, s]))
          const ordered = order.map((id) => byId.get(id)).filter(Boolean) as CRMStage[]
          const extras = sRows.filter((s) => !order.includes(s.id)).sort((a, b) => (a.order || 999) - (b.order || 999))
          nextStages[p.id] = [...ordered, ...extras]
        } else {
          sRows.sort((a, b) => (a.order || 999) - (b.order || 999))
          nextStages[p.id] = sRows
        }
      }
      setStagesByPipelineId(nextStages)
    })
    return () => unsub()
  }, [])

  // Load opportunities
  useEffect(() => {
    const oRef = ref(db, "admin/crm/opportunities")
    const unsub = onValue(oRef, (snap) => {
      const val = snap.val() || {}
      const rows: CRMOpportunity[] = Object.entries(val).map(([id, raw]: any) => normalizeOpportunity(raw, String(id)))
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      setOpps(rows)
    })
    return () => unsub()
  }, [])

  // Load clients + contacts
  useEffect(() => {
    const cRef = ref(db, "admin/crm/clients")
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      const rows: ClientLite[] = Object.entries(val).map(([id, raw]: any) => ({ id: String(id), name: raw?.name || raw?.companyName || "Client" }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const cRef = ref(db, "admin/crm/contacts")
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      const rows: ContactLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || "Contact",
        clientId: raw?.clientId || raw?.companyId || undefined,
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setContacts(rows)
    })
    return () => unsub()
  }, [])

  // Load staff for owner picker
  useEffect(() => {
    const sRef = ref(db, "admin/staff")
    const unsub = onValue(sRef, (snap) => {
      const val = snap.val() || {}
      const rows = Object.entries(val).map(([uid, raw]: any) => ({
        uid: String(uid),
        email: raw?.email || "",
        displayName: raw?.displayName || raw?.name || "",
      }))
      rows.sort((a, b) => String(a.displayName || a.email || a.uid).localeCompare(String(b.displayName || b.email || b.uid)))
      setStaff(rows as any)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!pipelines.length) return
    const ok = pipelines.some((p) => p.id === activePipelineId)
    if (!ok) setActivePipelineId(pipelines[0].id)
  }, [activePipelineId, pipelines])

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>()
    clients.forEach((c) => m.set(c.id, c.name))
    return m
  }, [clients])

  const stageColumns = useMemo(() => stagesByPipelineId[activePipelineId] || [], [activePipelineId, stagesByPipelineId])
  const stageById = useMemo(() => {
    const m = new Map<string, CRMStage>()
    stageColumns.forEach((s) => m.set(s.id, s))
    return m
  }, [stageColumns])

  const activeStageOrder = useMemo(() => stageColumns.map((s) => s.id), [stageColumns])

  const filteredOpps = useMemo(() => {
    const q = search.trim().toLowerCase()
    return opps.filter((o) => {
      if (o.pipelineId !== activePipelineId) return false
      if ((o.status as any) !== statusFilter) return false
      if (ownerFilter === "mine" && String(o.ownerUserId || "") !== currentUid) return false
      if (ownerFilter === "unassigned" && String(o.ownerUserId || "").trim()) return false
      if (ownerFilter !== "all" && ownerFilter !== "mine" && ownerFilter !== "unassigned") {
        if (String(o.ownerUserId || "") !== ownerFilter) return false
      }
      if (!q) return true
      const client = o.clientId ? clientNameById.get(o.clientId) || "" : ""
      const tags = (o.tags || []).join(" ").toLowerCase()
      return (
        String(o.title || "").toLowerCase().includes(q) ||
        String(o.id || "").toLowerCase().includes(q) ||
        String(client).toLowerCase().includes(q) ||
        tags.includes(q)
      )
    })
  }, [activePipelineId, clientNameById, currentUid, opps, ownerFilter, search, statusFilter])

  const pipelineStats = useMemo(() => {
    let sum = 0
    let weighted = 0
    for (const o of filteredOpps) {
      const amt = Number(o.value?.amount || 0)
      const p = typeof o.probability === "number" ? o.probability : 0
      if (amt) {
        sum += amt
        weighted += amt * (p / 100)
      }
    }
    return { count: filteredOpps.length, sum, weighted }
  }, [filteredOpps])

  const oppsByStage = useMemo(() => {
    const map = new Map<string, CRMOpportunity[]>()
    stageColumns.forEach((s) => map.set(s.id, []))
    for (const o of filteredOpps) {
      const key = o.stageId || "__none__"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      map.set(k, v)
    }
    return map
  }, [filteredOpps, stageColumns])

  const openCreate = () => {
    setSelected(null)
    setCrudMode("create")
    setCrudOpen(true)
  }

  const openView = (o: CRMOpportunity) => {
    setSelected(o)
    setCrudMode("view")
    setCrudOpen(true)
    const params = new URLSearchParams(location.search || "")
    setCanonicalParam(params, "OpportunityId", o.id)
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
  }

  const openEdit = (o: CRMOpportunity) => {
    setSelected(o)
    setCrudMode("edit")
    setCrudOpen(true)
    const params = new URLSearchParams(location.search || "")
    setCanonicalParam(params, "OpportunityId", o.id)
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true })
  }

  const resetCrudStateAndUrl = useCallback(() => {
    setSelected(null)
    setCrudMode("create")

    const params = new URLSearchParams(location.search || "")
    if (getParam(params, "OpportunityId")) {
      deleteCanonicalParam(params, "OpportunityId")
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

  // Deep-link open: /Admin/CRM?tab=pipeline&opportunityId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "")
    const oid = String(getParam(params, "OpportunityId") || "").trim()
    if (!oid) return
    if (crudOpen) return
    const found = opps.find((x) => x.id === oid) || null
    if (found) openView(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crudOpen, location.search, opps])

  const saveOpportunity = useCallback(
    async (payload: any) => {
      const now = nowMs()
      const modeSnapshot = crudMode
      const id = selected?.id && crudMode === "edit" ? selected.id : push(ref(db, "admin/crm/opportunities")).key || ""
      if (!id) return

      // Stage rule: require next action (if stage configured)
      const stages = stagesByPipelineId[payload.pipelineId] || []
      const st = stages.find((s) => s.id === payload.stageId)
      if (st?.requireNextAction) {
        const hasNext = Boolean(String(payload.nextActionTitle || "").trim()) && Boolean(Number(payload.nextActionDueAt || 0))
        if (!hasNext) {
          // Refuse save; user must add next action.
          throw new Error(`Stage "${st.name}" requires a next action.`)
        }
      }

      const next: any = {
        title: payload.title,
        pipelineId: payload.pipelineId,
        stageId: payload.stageId,
        status: payload.status,
        ownerUserId: payload.ownerUserId || currentUid || "",
        clientId: payload.clientId || "",
        contactId: payload.contactId || "",
        value:
          typeof payload.valueAmount === "number"
            ? { amount: payload.valueAmount, currency: String(payload.valueCurrency || "GBP") }
            : null,
        probability: typeof payload.probability === "number" ? payload.probability : null,
        expectedCloseAt: typeof payload.expectedCloseAt === "number" ? payload.expectedCloseAt : null,
        nextAction:
          payload.nextActionTitle || payload.nextActionDueAt
            ? { title: String(payload.nextActionTitle || ""), dueAt: Number(payload.nextActionDueAt || 0) }
            : null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        notes: payload.notes || "",
        updatedAt: now,
      }

      const updates: Record<string, any> = {
        [`admin/crm/opportunities/${id}`]: {
          ...next,
          createdAt: selected?.id && crudMode === "edit" ? (selected.createdAt || now) : now,
        },
      }

      // Indexes
      const oldClientId = String(selected?.clientId || "")
      const newClientId = String(payload.clientId || "")
      if (oldClientId && oldClientId !== newClientId) {
        updates[indexPath("opportunitiesByClient", oldClientId, id)] = null
      }
      if (newClientId) {
        updates[indexPath("opportunitiesByClient", newClientId, id)] = true
      }

      const oldOwnerId = String(selected?.ownerUserId || "")
      const newOwnerId = String(payload.ownerUserId || currentUid || "")
      if (oldOwnerId && oldOwnerId !== newOwnerId) {
        updates[indexPath("opportunitiesByOwner", oldOwnerId, id)] = null
      }
      if (newOwnerId) {
        updates[indexPath("opportunitiesByOwner", newOwnerId, id)] = true
      }

      // If moving to won on save, auto-create project + kickoff if missing
      if (payload.status === "won" && !selected?.convertedProjectId) {
        const clientName = payload.clientId ? clientNameById.get(payload.clientId) || "" : ""
        const { projectId, kickoffEventId, taskIds } = await createProjectAndKickoff({
          opportunityId: id,
          opportunityTitle: payload.title,
          clientId: payload.clientId,
          clientName,
          ownerUserId: (payload.ownerUserId || currentUid) as any,
        })
        updates[`admin/crm/opportunities/${id}`] = {
          ...(updates[`admin/crm/opportunities/${id}`] || {}),
          status: "won",
          wonAt: now,
          lostAt: null,
          convertedProjectId: projectId,
          convertedKickoffEventId: kickoffEventId,
          convertedTaskIds: taskIds,
          updatedAt: now,
        }
      }

      await rootUpdate(updates)

      await createActivity({
        type: selected?.id && crudMode === "edit" ? "opportunity_updated" : "opportunity_created",
        title: payload.title,
        body: payload.notes ? String(payload.notes).slice(0, 500) : "",
        opportunityId: id,
        clientId: newClientId || undefined,
        contactId: String(payload.contactId || "") || undefined,
        createdAt: now,
        updatedAt: now,
      } as any)

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "crmOpportunity",
        crudMode: modeSnapshot,
        id,
        itemLabel: String(payload.title || "").trim() || undefined,
      })
      setCrudOpen(false)
      resetCrudStateAndUrl()
    },
    [crudMode, currentUid, location.pathname, resetCrudStateAndUrl, selected, stagesByPipelineId],
  )

  const quickMove = async (o: CRMOpportunity, nextStageId: string) => {
    if (!o?.id) return
    const st = stageById.get(nextStageId)
    if (st?.requireNextAction) {
      const hasNext = Boolean(String(o?.nextAction?.title || "").trim()) && Boolean(Number(o?.nextAction?.dueAt || 0))
      if (!hasNext) {
        // Force edit flow so user can enter next action.
        openEdit(o)
        return
      }
    }
    const now = nowMs()
    await update(ref(db, `admin/crm/opportunities/${o.id}`), { stageId: nextStageId, updatedAt: now })
    await createActivity({
      type: "status_change",
      title: "Opportunity moved stage",
      body: `${o.title} → ${nextStageId}`,
      opportunityId: o.id,
      clientId: o.clientId,
      contactId: o.contactId,
      createdAt: now,
      updatedAt: now,
      meta: { fromStageId: o.stageId, toStageId: nextStageId },
    } as any)
  }

  const quickStatus = async (o: CRMOpportunity, nextStatus: "open" | "won" | "lost") => {
    if (!o?.id) return
    const now = nowMs()
    if (nextStatus === "won" && !o.convertedProjectId) {
      const clientName = o.clientId ? clientNameById.get(o.clientId) || "" : ""
      const { projectId, kickoffEventId, taskIds } = await createProjectAndKickoff({
        opportunityId: o.id,
        opportunityTitle: o.title,
        clientId: o.clientId,
        clientName,
        ownerUserId: o.ownerUserId || currentUid || undefined,
      })
      await update(ref(db, `admin/crm/opportunities/${o.id}`), {
        status: "won",
        wonAt: now,
        lostAt: null,
        convertedProjectId: projectId,
        convertedKickoffEventId: kickoffEventId,
        convertedTaskIds: taskIds,
        updatedAt: now,
      })
    } else {
      await update(ref(db, `admin/crm/opportunities/${o.id}`), {
        status: nextStatus,
        wonAt: nextStatus === "won" ? now : null,
        lostAt: nextStatus === "lost" ? now : null,
        updatedAt: now,
      })
    }
    await createActivity({
      type: "status_change",
      title: "Opportunity status changed",
      body: `${o.title} → ${nextStatus}`,
      opportunityId: o.id,
      clientId: o.clientId,
      contactId: o.contactId,
      createdAt: now,
      updatedAt: now,
      meta: { from: o.status, to: nextStatus },
    } as any)
  }

  const addStage = async () => {
    const name = String(newStageName || "").trim()
    if (!name) return
    const now = nowMs()
    const id = push(ref(db, `admin/crm/pipelines/${activePipelineId}/stages`)).key || ""
    if (!id) return
    const updates: Record<string, any> = {
      [`admin/crm/pipelines/${activePipelineId}/stages/${id}`]: { name, requireNextAction: true, createdAt: now, updatedAt: now },
      [`admin/crm/pipelines/${activePipelineId}/stageOrder`]: [...activeStageOrder, id],
      [`admin/crm/pipelines/${activePipelineId}/updatedAt`]: now,
    }
    await rootUpdate(updates)
    setNewStageName("")
  }

  const confirmDeleteStage = async () => {
    const sid = String(deleteStageId || "").trim()
    if (!sid) return
    const now = nowMs()
    const updates: Record<string, any> = {
      [`admin/crm/pipelines/${activePipelineId}/stages/${sid}`]: null,
      [`admin/crm/pipelines/${activePipelineId}/stageOrder`]: activeStageOrder.filter((x) => x !== sid),
      [`admin/crm/pipelines/${activePipelineId}/updatedAt`]: now,
    }
    await rootUpdate(updates)
    setConfirmDeleteOpen(false)
    setDeleteStageId("")
  }

  const moveStage = async (sid: string, dir: -1 | 1) => {
    const order = [...activeStageOrder]
    const idx = order.indexOf(sid)
    if (idx < 0) return
    const j = idx + dir
    if (j < 0 || j >= order.length) return
    ;[order[idx], order[j]] = [order[j], order[idx]]
    await update(ref(db, `admin/crm/pipelines/${activePipelineId}`), { stageOrder: order, updatedAt: nowMs() })
  }

  const updateStage = async (sid: string, updates: Partial<Pick<CRMStage, "name" | "probability" | "requireNextAction">>) => {
    await update(ref(db, `admin/crm/pipelines/${activePipelineId}/stages/${sid}`), { ...updates, updatedAt: nowMs() })
  }

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        searchTerm={search}
        onSearchChange={(t) => setSearch(t)}
        searchPlaceholder="Search opportunities…"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Pipeline",
            options: pipelines.map((p) => ({ id: p.id, name: p.name })),
            selectedValues: [activePipelineId],
            onSelectionChange: (values) => setActivePipelineId(String(values?.[0] || activePipelineId)),
          },
          {
            label: "Status",
            options: ["open", "won", "lost"].map((s) => ({ id: s, name: s })),
            selectedValues: [statusFilter],
            onSelectionChange: (values) => setStatusFilter(String(values?.[0] || "open") as any),
          },
        ]}
        onCreateNew={openCreate}
        createButtonLabel="Add Opportunity"
        additionalButtons={[
          {
            label: "Stages",
            icon: <EditIcon />,
            onClick: () => setSettingsOpen(true),
            variant: "outlined",
          },
        ]}
        additionalControls={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={`Count: ${pipelineStats.count}`} />
            <Chip size="small" label={`Value: ${Math.round(pipelineStats.sum)}`} />
            <Chip size="small" label={`Weighted: ${Math.round(pipelineStats.weighted)}`} />
            <Select
              size="small"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(String(e.target.value || "all"))}
              sx={{ minWidth: 200, color: "inherit" }}
              renderValue={(v) => {
                const id = String(v || "all")
                if (id === "all") return <Typography sx={{ color: "inherit" }}>Owner: All</Typography>
                if (id === "mine") return <Typography sx={{ color: "inherit" }}>Owner: Me</Typography>
                if (id === "unassigned") return <Typography sx={{ color: "inherit" }}>Owner: Unassigned</Typography>
                const u = staff.find((s) => s.uid === id)
                return <Typography sx={{ color: "inherit" }}>Owner: {u?.displayName || u?.email || id}</Typography>
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="mine" disabled={!currentUid}>Me</MenuItem>
              <MenuItem value="unassigned">Unassigned</MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.uid} value={s.uid}>
                  {s.displayName || s.email || s.uid}
                </MenuItem>
              ))}
            </Select>
          </Box>
        }
      />

      <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
        {stageColumns.map((s) => {
          const items = oppsByStage.get(s.id) || []
          return (
            <Paper key={s.id} sx={{ minWidth: 320, maxWidth: 360, p: 1.5, flexShrink: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography fontWeight={900}>{s.name}</Typography>
                <Chip size="small" label={items.length} />
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {items.length === 0 ? (
                  <Box sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      No opportunities in this stage.
                    </Typography>
                  </Box>
                ) : null}
                {items.map((o) => (
                  <Paper
                    key={o.id}
                    variant="outlined"
                    sx={{ p: 1.25, cursor: "pointer" }}
                    onClick={() => openView(o)}
                  >
                    <Typography fontWeight={800}>{o.title || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {o.clientId ? clientNameById.get(o.clientId) || o.clientId : "Unlinked client"}
                    </Typography>
                    {o.value?.amount ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {o.value.currency || "GBP"} {o.value.amount}
                      </Typography>
                    ) : null}
                    <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center", justifyContent: "space-between" }}>
                      <Select
                        size="small"
                        value={o.stageId}
                        onChange={(e) => void quickMove(o, String(e.target.value || ""))}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ flex: 1 }}
                      >
                        {stageColumns.map((st) => (
                          <MenuItem key={st.id} value={st.id}>
                            {st.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        value={o.status as any}
                        onChange={(e) => void quickStatus(o, e.target.value as any)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ width: 110 }}
                      >
                        <MenuItem value="open">open</MenuItem>
                        <MenuItem value="won">won</MenuItem>
                        <MenuItem value="lost">lost</MenuItem>
                      </Select>
                      <IconButton size="small" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(o) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Paper>
          )
        })}
        {stageColumns.length === 0 ? (
          <Box sx={{ width: "100%" }}>
            <EmptyStateCard
              icon={KanbanIcon as any}
              title="No stages configured"
              description="Add stages to your pipeline to start tracking opportunities."
              cardSx={{ maxWidth: 560, mx: "auto" }}
            />
          </Box>
        ) : null}
      </Box>

      <CRUDModal
        open={crudOpen}
        onClose={handleCrudModalClose}
        workspaceFormShortcut={{
          crudEntity: "crmOpportunity",
          crudMode,
          id: selected?.id,
          itemLabel: selected?.title || undefined,
        }}
        title={crudMode === "create" ? "Create Opportunity" : crudMode === "edit" ? "Edit Opportunity" : "Opportunity"}
        subtitle={selected?.id ? `Opportunity: ${selected.id}` : undefined}
        icon={<AddIcon />}
        mode={crudMode}
        onEdit={crudMode === "view" && selected ? () => setCrudMode("edit") : undefined}
        onSave={crudMode === "view" ? undefined : async () => void 0}
        formRef={formRef as any}
      >
        <OpportunityCRUDForm
          ref={formRef}
          mode={crudMode}
          opportunity={selected}
          pipelines={pipelines}
          stagesByPipelineId={stagesByPipelineId}
          staff={staff}
          clients={clients}
          contacts={contacts}
          onSave={saveOpportunity}
        />
      </CRUDModal>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pipeline Stages</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Add/remove stages, configure rules, and set stage ordering.
          </Typography>
          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              label="New Stage Name"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => void addStage()} disabled={!newStageName.trim()}>
              Add
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Existing Stages</Typography>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {(stageColumns || []).map((s) => (
              <Paper key={s.id} variant="outlined" sx={{ p: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 1 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1 }}>
                  <TextField
                    size="small"
                    label="Stage Name"
                    value={s.name}
                    onChange={(e) => void updateStage(s.id, { name: e.target.value })}
                  />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <TextField
                      size="small"
                      label="Probability (0-100)"
                      type="number"
                      value={typeof s.probability === "number" ? String(s.probability) : ""}
                      onChange={(e) => {
                        const v = String(e.target.value || "").trim()
                        const n = v ? Number(v) : NaN
                        void updateStage(s.id, { probability: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : undefined })
                      }}
                      sx={{ width: 180 }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Checkbox
                        checked={Boolean(s.requireNextAction)}
                        onChange={(e) => void updateStage(s.id, { requireNextAction: Boolean(e.target.checked) })}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Require next action
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", justifyContent: "flex-end" }}>
                  <IconButton size="small" title="Move up" onClick={() => void moveStage(s.id, -1)}>
                    <UpIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" title="Move down" onClick={() => void moveStage(s.id, 1)}>
                    <DownIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    title="Delete stage"
                    onClick={() => {
                      setDeleteStageId(s.id)
                      setConfirmDeleteOpen(true)
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
            {stageColumns.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No stages yet.
              </Typography>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Delete this stage? Existing opportunities in this stage will remain but may become ungrouped until you move them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void confirmDeleteStage()} disabled={!deleteStageId}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

