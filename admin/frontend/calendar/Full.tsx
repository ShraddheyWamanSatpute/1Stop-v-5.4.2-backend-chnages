import { themeConfig } from "../../../app/backend/context/AppTheme";
import { useEffect, useMemo, useState } from "react"
import { alpha } from "@mui/material/styles"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Event as EventIcon, Settings as SettingsIcon } from "@mui/icons-material"
import { useLocation, useNavigate } from "react-router-dom"
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { APP_KEYS, getFunctionsBaseUrl, getFunctionsFetchBaseUrl } from "../../backend/config/keys"
import { useAdmin } from "../../backend/context/AdminContext"
import { db, onValue, push, ref, remove, set } from "../../backend/services/Firebase"
import type { CustomFieldDefinition } from "../tasks/types"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../app/frontend/components/reusable/CRUDModal"
import { calendarLinkEventPath, nowMs, rootUpdate, upsertInternalCalendarEvent, upsertProviderLink } from "../shared/rtdb"
import { contrastText, normalizeHexColor } from "../shared/colorUtils"
import ColorSelect from "../../../app/frontend/components/reusable/ColorSelect"
import { AdminPageShell } from "../shared/AdminPageShell"

type ProviderKey = "google" | "outlook"
type ViewMode = "month" | "week" | "day"
type CalendarCategory = "personal" | "company"
type EventProvider = ProviderKey | "internal"
type CalendarEventProvider = EventProvider | "task"

type CalendarMeta = { id: string; name: string; primary?: boolean }

type CalendarEvent = {
  provider: CalendarEventProvider
  calendarId: string
  id: string
  sourceEventId?: string
  title: string
  description?: string
  location?: string
  start: string // ISO or yyyy-mm-dd
  end: string // ISO or yyyy-mm-dd
  allDay?: boolean
}

type InternalRecurrence = {
  freq: "daily" | "weekly" | "monthly"
  interval: number
  until?: string
}

type ProviderSettings = {
  enabledCalendarIds?: string[]
  defaultCalendarId?: string
  calendarCategories?: Record<string, CalendarCategory>
  calendarColors?: Record<string, string>
  updatedAt?: number
}

type UserCalendarSettings = Partial<Record<ProviderKey, ProviderSettings>>

type InternalCalendar = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

type AdminTaskLite = {
  id: string
  title: string
  dueDate?: string
  status?: string
  projectId?: string
  custom?: Record<string, any>
}

type AdminProjectLite = { id: string; name: string }

type CRMContactLite = { id: string; name: string }
type CRMClientLite = { id: string; name: string }
type OpportunityLite = { id: string; title: string; clientId?: string }

type EventLink = {
  taskId?: string
  projectId?: string
  contactId?: string
  clientId?: string
  opportunityId?: string
  meetingType?: string
  location?: string
  attendees?: string
  meetingUrl?: string
  reminderMinutes?: number
  responseStatus?: "needs_action" | "accepted" | "tentative" | "declined"
  conferenceProvider?: "google_meet" | "teams" | "zoom" | "custom" | ""
  updatedAt?: number
}

function isDateOnly(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || "")
}

function toDate(v: string) {
  if (!v) return null
  if (isDateOnly(v)) return new Date(`${v}T00:00:00`)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateKey(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function addDaysKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

function addMonthsKey(dateKey: string, months: number): string {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return toDateKey(d)
}

function normalizeEventLinks(links?: Partial<EventLink> | null) {
  return {
    taskId: String(links?.taskId || "").trim(),
    projectId: String(links?.projectId || "").trim(),
    contactId: String(links?.contactId || "").trim(),
    clientId: String(links?.clientId || "").trim(),
    opportunityId: String(links?.opportunityId || "").trim(),
  }
}

function buildCalendarLinkCleanupUpdates(
  provider: EventProvider,
  eventId: string,
  previousLinks?: Partial<EventLink> | null,
  nextLinks?: Partial<EventLink> | null,
) {
  const providerKey = provider === "internal" ? "internal" : provider
  const prev = normalizeEventLinks(previousLinks)
  const next = normalizeEventLinks(nextLinks)
  const pairs: Array<{ entityType: "task" | "project" | "contact" | "client" | "opportunity"; prevId: string; nextId: string }> = [
    { entityType: "task", prevId: prev.taskId, nextId: next.taskId },
    { entityType: "project", prevId: prev.projectId, nextId: next.projectId },
    { entityType: "contact", prevId: prev.contactId, nextId: next.contactId },
    { entityType: "client", prevId: prev.clientId, nextId: next.clientId },
    { entityType: "opportunity", prevId: prev.opportunityId, nextId: next.opportunityId },
  ]

  const updates: Record<string, any> = {}
  for (const pair of pairs) {
    if (pair.prevId && pair.prevId !== pair.nextId) {
      updates[calendarLinkEventPath(pair.entityType, pair.prevId, providerKey as any, eventId)] = null
    }
  }
  return updates
}

function normalizeInternalRecurrence(raw: any): InternalRecurrence | null {
  if (!raw || typeof raw !== "object") return null
  const freq = String(raw.freq || "").trim()
  if (freq !== "daily" && freq !== "weekly" && freq !== "monthly") return null
  const interval = Math.max(1, Number(raw.interval || 1) || 1)
  const until = String(raw.until || "").trim()
  return {
    freq,
    interval,
    until: isDateOnly(until) ? until : undefined,
  }
}

function nextOccurrenceDate(dateKey: string, recurrence: InternalRecurrence): string {
  if (recurrence.freq === "daily") return addDaysKey(dateKey, recurrence.interval)
  if (recurrence.freq === "weekly") return addDaysKey(dateKey, recurrence.interval * 7)
  return addMonthsKey(dateKey, recurrence.interval)
}

function escapeIcsText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function toIcsStamp(value: string, allDay?: boolean) {
  if (allDay || isDateOnly(value)) {
    return String(value || "").replace(/-/g, "")
  }
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function downloadIcsFile(filename: string, events: Array<{ uid: string; title: string; description?: string; location?: string; start: string; end: string; allDay?: boolean }>) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//1Stop Admin//Calendar//EN",
    ...events.flatMap((event) => {
      const dtStart = event.allDay ? `DTSTART;VALUE=DATE:${toIcsStamp(event.start, true)}` : `DTSTART:${toIcsStamp(event.start, false)}`
      const dtEnd = event.allDay ? `DTEND;VALUE=DATE:${toIcsStamp(event.end, true)}` : `DTEND:${toIcsStamp(event.end, false)}`
      return [
        "BEGIN:VEVENT",
        `UID:${escapeIcsText(event.uid)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        dtStart,
        dtEnd,
        `DESCRIPTION:${escapeIcsText(event.description || "")}`,
        `LOCATION:${escapeIcsText(event.location || "")}`,
        `DTSTAMP:${toIcsStamp(new Date().toISOString(), false)}`,
        "END:VEVENT",
      ]
    }),
    "END:VCALENDAR",
  ]
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export default function AdminCalendarFull() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useAdmin()
  const uid = state.user?.uid || ""

  const fnBase = useMemo(
    () =>
      getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      }),
    [],
  )
  const fnFetchBase = useMemo(
    () =>
      getFunctionsFetchBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      }),
    [],
  )

  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const [settings, setSettingsState] = useState<UserCalendarSettings>({})

  const [internalCalendars, setInternalCalendars] = useState<InternalCalendar[]>([])
  const [internalSettings, setInternalSettings] = useState<ProviderSettings>({ enabledCalendarIds: [], defaultCalendarId: "" })
  const [oauthStatus, setOauthStatus] = useState<
    Record<ProviderKey, { connected: boolean; email?: string; error?: string }>
  >({
    google: { connected: false },
    outlook: { connected: false },
  })

  const [calendars, setCalendars] = useState<Record<ProviderKey, CalendarMeta[]>>({
    google: [],
    outlook: [],
  })

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingCalendars, setLoadingCalendars] = useState<Record<string, boolean>>({})

  const [calendarFilter, setCalendarFilter] = useState<string[]>([])
  const [showTasks, setShowTasks] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState(0)

  const [tasks, setTasks] = useState<AdminTaskLite[]>([])
  const [taskFields, setTaskFields] = useState<CustomFieldDefinition[]>([])
  const [projects, setProjects] = useState<AdminProjectLite[]>([])
  const [contacts, setContacts] = useState<CRMContactLite[]>([])
  const [clients, setClients] = useState<CRMClientLite[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityLite[]>([])
  const [eventLinks, setEventLinks] = useState<Record<string, Record<string, EventLink>>>({})
  const [internalEvents, setInternalEvents] = useState<Record<string, any>>({})

  // Visual colors (RTDB-backed)
  const [uiTaskStatusColors, setUiTaskStatusColors] = useState<Record<string, string>>({})
  const [uiTaskCustomFieldColors, setUiTaskCustomFieldColors] = useState<Record<string, Record<string, string>>>({})
  const [uiInternalTypeColors, setUiInternalTypeColors] = useState<Record<string, string>>({})
  const [taskEventColoring, setTaskEventColoring] = useState<{ mode: "default" | "status" | "customField"; fieldId?: string }>({
    mode: "status",
    fieldId: "",
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view")
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null)
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    location: "",
    meetingType: "meeting",
    attendees: "",
    meetingUrl: "",
    reminderMinutes: "15",
    responseStatus: "needs_action" as NonNullable<EventLink["responseStatus"]>,
    conferenceProvider: "" as NonNullable<EventLink["conferenceProvider"]>,
    allDay: true,
    startDate: toDateKey(new Date()),
    startTime: "09:00",
    endDate: toDateKey(new Date()),
    endTime: "10:00",
    provider: "google" as EventProvider,
    calendarId: "",
    linkedTaskId: "",
    linkedProjectId: "",
    linkedContactId: "",
    linkedClientId: "",
    linkedOpportunityId: "",
    recurrenceEnabled: false,
    recurrenceFreq: "weekly" as InternalRecurrence["freq"],
    recurrenceInterval: "1",
    recurrenceUntil: "",
  })

  const banner = useMemo(() => {
    const params = new URLSearchParams(location.search || "")
    const success = params.get("success")
    const error = params.get("error")
    const provider = params.get("provider")
    const email = params.get("email")
    if (success) return { type: "success" as const, text: `Connected: ${provider}${email ? ` (${email})` : ""}` }
    if (error) return { type: "error" as const, text: `OAuth error: ${error}` }
    return null
  }, [location.search])

  useEffect(() => {
    if (!uid) return
    const sRef = ref(db, `admin/calendar/settings/${uid}`)
    const unsub = onValue(sRef, (snap) => setSettingsState(snap.val() || {}))
    return () => unsub()
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const sRef = ref(db, `admin/calendar/settings/${uid}/internal`)
    const unsub = onValue(sRef, (snap) => setInternalSettings((snap.val() || {}) as any))
    return () => unsub()
  }, [uid])

  useEffect(() => {
    const cRef = ref(db, `admin/calendar/internalCalendars`)
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      const rows: InternalCalendar[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: String(raw?.name || "Untitled"),
        createdAt: Number(raw?.createdAt || 0),
        updatedAt: Number(raw?.updatedAt || 0),
      }))
      rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      setInternalCalendars(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const tasksRef = ref(db, `admin/tasks`)
    const unsub = onValue(tasksRef, (snap) => {
      const val = snap.val() || {}
      const rows: AdminTaskLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        title: raw?.title || "",
        dueDate: raw?.dueDate || "",
        status: raw?.status || "",
        projectId: raw?.projectId || "",
        custom: raw?.custom && typeof raw.custom === "object" ? raw.custom : {},
      }))
      rows.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")))
      setTasks(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const fieldsRef = ref(db, "admin/tasks/fields")
    const unsub = onValue(fieldsRef, (snap) => {
      const val = snap.val() || {}
      const rows: CustomFieldDefinition[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        label: raw?.label || raw?.name || "",
        type: raw?.type || "text",
        options: Array.isArray(raw?.options) ? raw.options : [],
        required: Boolean(raw?.required),
        showInTable: Boolean(raw?.showInTable),
        order: typeof raw?.order === "number" ? raw.order : 0,
        createdAt: raw?.createdAt || Date.now(),
        updatedAt: raw?.updatedAt || Date.now(),
      }))
      rows.sort((a, b) => {
        const ao = typeof a.order === "number" ? a.order : 9999
        const bo = typeof b.order === "number" ? b.order : 9999
        if (ao !== bo) return ao - bo
        return String(a.label || "").localeCompare(String(b.label || ""))
      })
      setTaskFields(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const projectsRef = ref(db, `admin/projects`)
    const unsub = onValue(projectsRef, (snap) => {
      const val = snap.val() || {}
      const rows: AdminProjectLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: raw?.name || "Untitled",
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setProjects(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const contactsRef = ref(db, `admin/crm/contacts`)
    const unsub = onValue(contactsRef, (snap) => {
      const val = snap.val() || {}
      const rows: CRMContactLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        name: String(raw?.name || "").trim() || id,
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setContacts(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const clientsRef = ref(db, `admin/crm/clients`)
    const unsub = onValue(clientsRef, (snap) => {
      const val = snap.val() || {}
      const rows: CRMClientLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: String(raw?.name || raw?.companyName || "").trim() || String(id),
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const oppRef = ref(db, `admin/crm/opportunities`)
    const unsub = onValue(oppRef, (snap) => {
      const val = snap.val() || {}
      const rows: OpportunityLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        title: String(raw?.title || "").trim() || String(id),
        clientId: String(raw?.clientId || "").trim() || undefined,
      }))
      rows.sort((a, b) => String(a.title).localeCompare(String(b.title)))
      setOpportunities(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!uid) return
    const linkRef = ref(db, `admin/calendar/eventLinks/${uid}`)
    const unsub = onValue(linkRef, (snap) => setEventLinks(snap.val() || {}))
    return () => unsub()
  }, [uid])

  // Internal events (RTDB) support
  useEffect(() => {
    const iRef = ref(db, `admin/calendar/events`)
    const unsub = onValue(iRef, (snap) => setInternalEvents(snap.val() || {}))
    return () => unsub()
  }, [])

  useEffect(() => {
    const cRef = ref(db, "admin/ui/colors")
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      setUiTaskStatusColors(((val?.tasks?.status || {}) as any) || {})
      setUiTaskCustomFieldColors(((val?.tasks?.customFields || {}) as any) || {})
      setUiInternalTypeColors(((val?.calendar?.internalTypes || {}) as any) || {})
      const te = (val?.calendar?.taskEvents || {}) as any
      setTaskEventColoring({
        mode: (te?.mode as any) || "status",
        fieldId: String(te?.fieldId || ""),
      })
    })
    return () => unsub()
  }, [])

  const enabledIds = (provider: ProviderKey) =>
    Array.isArray(settings?.[provider]?.enabledCalendarIds) ? (settings[provider]!.enabledCalendarIds as string[]) : []

  const defaultCalendarId = (provider: ProviderKey) => String(settings?.[provider]?.defaultCalendarId || "")

  const enabledInternalIds = () => (Array.isArray(internalSettings?.enabledCalendarIds) ? (internalSettings.enabledCalendarIds as string[]) : [])
  const defaultInternalCalendarId = () => String(internalSettings?.defaultCalendarId || "")
  const internalColorSetting = (calendarId: string): string => {
    const colors = (internalSettings?.calendarColors || {}) as Record<string, string>
    return String(colors?.[calendarId] || "").trim()
  }

  const categoryByCalendar = (provider: ProviderKey, calendarId: string): CalendarCategory => {
    const cats = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    return (cats?.[calendarId] as CalendarCategory) || "personal"
  }

  const colorByCalendarSetting = (provider: ProviderKey, calendarId: string): string => {
    const colors = (settings?.[provider]?.calendarColors || {}) as Record<string, string>
    return String(colors?.[calendarId] || "").trim()
  }

  const refreshOAuthStatus = async () => {
    const checkOne = async (tokenDocId: string) => {
      const url = new URL(`${fnFetchBase}/checkOAuthStatus`, window.location.origin)
      url.searchParams.set("tokenDocId", tokenDocId)
      const resp = await fetch(url.toString())
      const data = await resp.json()
      return {
        connected: Boolean(data?.valid),
        email: data?.email || undefined,
      }
    }

    try {
      const google = await checkOne("admin_default_default_google_calendar")
      const outlook = await checkOne("admin_default_default_outlook_calendar")
      setOauthStatus({ google, outlook })
    } catch (e: any) {
      setOauthStatus({
        google: { connected: false, error: e?.message || "Failed to check status" },
        outlook: { connected: false, error: e?.message || "Failed to check status" },
      })
    }
  }

  useEffect(() => {
    refreshOAuthStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginOAuth = (provider: ProviderKey) => {
    const endpoint = provider === "google" ? "oauthGoogleCalendar" : "oauthOutlookCalendar"
    const url = new URL(`${fnBase}/${endpoint}`)
    url.searchParams.set("company_id", "admin")
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    if (uid) url.searchParams.set("user_id", uid)
    url.searchParams.set("return_path", `${window.location.origin}/Admin/Calendar`)
    window.location.href = url.toString()
  }

  const disconnect = async (provider: ProviderKey) => {
      const url = new URL(`${fnFetchBase}/disconnectOAuth`, window.location.origin)
    url.searchParams.set("company_id", "admin")
    url.searchParams.set("site_id", "default")
    url.searchParams.set("subsite_id", "default")
    url.searchParams.set("provider", provider === "google" ? "google_calendar" : "outlook_calendar")
    await fetch(url.toString())
    await refreshOAuthStatus()
  }

  const loadCalendars = async (provider: ProviderKey) => {
    try {
      setLoadingCalendars((p) => ({ ...p, [provider]: true }))
      const url = new URL(`${fnFetchBase}/listCalendars`, window.location.origin)
      url.searchParams.set("company_id", "admin")
      url.searchParams.set("provider", provider)
      const resp = await fetch(url.toString())
      const data = await resp.json()
      if (!data?.success) throw new Error(data?.error || "Failed to load calendars")
      const list: CalendarMeta[] = (data.calendars || []).map((c: any) => ({
        id: String(c.id || ""),
        name: String(c.name || c.summary || c.id || ""),
        primary: Boolean(c.primary),
      }))
      setCalendars((p) => ({ ...p, [provider]: list }))
    } finally {
      setLoadingCalendars((p) => ({ ...p, [provider]: false }))
    }
  }

  useEffect(() => {
    const run = async () => {
      if (oauthStatus.google.connected && calendars.google.length === 0) await loadCalendars("google")
      if (oauthStatus.outlook.connected && calendars.outlook.length === 0) await loadCalendars("outlook")
    }
    run().catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthStatus.google.connected, oauthStatus.outlook.connected])

  const saveProviderSettings = async (provider: ProviderKey, next: ProviderSettings) => {
    if (!uid) return
    await set(ref(db, `admin/calendar/settings/${uid}/${provider}`), { ...next, updatedAt: Date.now() })
  }

  const saveInternalSettings = async (next: ProviderSettings) => {
    if (!uid) return
    await set(ref(db, `admin/calendar/settings/${uid}/internal`), { ...next, updatedAt: Date.now() })
  }

  const toggleInternalCalendar = async (calendarId: string, enabled: boolean) => {
    const current = new Set(enabledInternalIds())
    if (enabled) current.add(calendarId)
    else current.delete(calendarId)
    const enabledCalendarIds = Array.from(current)
    const currentDefault = defaultInternalCalendarId()
    const nextDefault = currentDefault && enabledCalendarIds.includes(currentDefault) ? currentDefault : enabledCalendarIds[0] || ""
    const calendarColors = (internalSettings?.calendarColors || {}) as Record<string, string>
    await saveInternalSettings({ enabledCalendarIds, defaultCalendarId: nextDefault, calendarColors })
  }

  const setDefaultInternalCalendar = async (calendarId: string) => {
    const calendarColors = (internalSettings?.calendarColors || {}) as Record<string, string>
    await saveInternalSettings({ enabledCalendarIds: enabledInternalIds(), defaultCalendarId: calendarId, calendarColors })
  }

  const setInternalCalendarColor = async (calendarId: string, color: string) => {
    const enabledCalendarIds = enabledInternalIds()
    const defaultId = defaultInternalCalendarId()
    const current = ((internalSettings?.calendarColors || {}) as Record<string, string>) || {}
    const nextColors = { ...current, [calendarId]: color }
    await saveInternalSettings({ enabledCalendarIds, defaultCalendarId: defaultId, calendarColors: nextColors })
  }


  const setDefaultCalendar = async (provider: ProviderKey, calendarId: string) => {
    const calendarCategories = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    const calendarColors = (settings?.[provider]?.calendarColors || {}) as Record<string, string>
    await saveProviderSettings(provider, { enabledCalendarIds: enabledIds(provider), defaultCalendarId: calendarId, calendarCategories, calendarColors })
  }

  const setCalendarCategory = async (provider: ProviderKey, calendarId: string, category: CalendarCategory) => {
    const enabledCalendarIds = enabledIds(provider)
    const defaultId = defaultCalendarId(provider)
    const current = ((settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>) || {}
    const nextCats = { ...current, [calendarId]: category }
    const calendarColors = (settings?.[provider]?.calendarColors || {}) as Record<string, string>
    await saveProviderSettings(provider, { enabledCalendarIds, defaultCalendarId: defaultId, calendarCategories: nextCats, calendarColors })
  }

  const setCalendarColor = async (provider: ProviderKey, calendarId: string, color: string) => {
    const enabledCalendarIds = enabledIds(provider)
    const defaultId = defaultCalendarId(provider)
    const calendarCategories = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    const current = ((settings?.[provider]?.calendarColors || {}) as Record<string, string>) || {}
    const nextColors = { ...current, [calendarId]: color }
    await saveProviderSettings(provider, { enabledCalendarIds, defaultCalendarId: defaultId, calendarCategories, calendarColors: nextColors })
  }

  const visibleRange = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
      return { start, end }
    }
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return { start, end }
    }
    return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
  }, [currentDate, viewMode])

  const allAvailableCalendars = useMemo(() => {
    const list: Array<{ id: string; name: string; provider: string; calendarId: string }> = []
    for (const c of internalCalendars) {
      list.push({ id: `internal:${c.id}`, name: c.name, provider: "internal", calendarId: c.id })
    }
    for (const p of ["google", "outlook"] as ProviderKey[]) {
      if (!oauthStatus[p].connected) continue
      for (const c of calendars[p] || []) {
        list.push({ id: `${p}:${c.id}`, name: `${p === "google" ? "Google" : "Outlook"} — ${c.name}`, provider: p, calendarId: c.id })
      }
    }
    return list
  }, [internalCalendars, calendars, oauthStatus.google.connected, oauthStatus.outlook.connected])

  const loadEventsForRange = async () => {
    const filterSet = new Set(calendarFilter)
    const useAll = filterSet.size === 0
    const sources: Array<{ provider: ProviderKey; calendarId: string }> = []
    ;(["google", "outlook"] as ProviderKey[]).forEach((p) => {
      if (!oauthStatus[p].connected) return
      enabledIds(p).forEach((calendarId) => {
        if (!useAll && !filterSet.has(`${p}:${calendarId}`)) return
        sources.push({ provider: p, calendarId })
      })
    })

    if (sources.length === 0) {
      setEvents([])
      return
    }

    setLoadingEvents(true)
    try {
      const timeMin = visibleRange.start.toISOString()
      const timeMax = visibleRange.end.toISOString()

      const results = await Promise.all(
        sources.map(async (s) => {
      const url = new URL(`${fnFetchBase}/listEvents`, window.location.origin)
          url.searchParams.set("company_id", "admin")
          url.searchParams.set("provider", s.provider)
          url.searchParams.set("calendar_id", s.calendarId)
          url.searchParams.set("time_min", timeMin)
          url.searchParams.set("time_max", timeMax)
          const resp = await fetch(url.toString())
          const data = await resp.json()
          if (!data?.success) return []
          const evs: CalendarEvent[] = (data.events || []).map((ev: any) => ({
            provider: s.provider,
            calendarId: s.calendarId,
            id: String(ev.id || ""),
            title: String(ev.title || ""),
            description: String(ev.description || ""),
            location: String(ev.location || ""),
            start: String(ev.start || ""),
            end: String(ev.end || ""),
            allDay: Boolean(ev.allDay),
          }))
          return evs
        }),
      )

      setEvents(results.flat().filter((e) => e.id && e.start && e.end))
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    loadEventsForRange().catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    oauthStatus.google.connected,
    oauthStatus.outlook.connected,
    settings,
    calendarFilter.join(","),
    visibleRange.start.getTime(),
    visibleRange.end.getTime(),
  ])

  const colorByCalendar = useMemo(() => {
    const palette = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#d32f2f", "#0288d1", "#6d4c41", "#455a64", "#00897b"]
    const providerKeys = Array.from(new Set(events.map((e) => `${e.provider}:${e.calendarId}`))).sort()
    const internalKeys = enabledInternalIds()
      .map((id) => `internal:${id}`)
      .sort()

    const keys = Array.from(new Set([...providerKeys, ...internalKeys]))
    const map = new Map<string, string>()
    keys.forEach((k, i) => {
      const [provider, calendarId] = k.split(":") as [string, string]
      if (provider === "internal") {
        const configured = internalColorSetting(calendarId)
        map.set(k, configured || palette[i % palette.length])
        return
      }
      const configured = provider && calendarId ? colorByCalendarSetting(provider as ProviderKey, calendarId) : ""
      map.set(k, configured || palette[i % palette.length])
    })
    map.set("task:tasks", themeConfig.brandColors.navy)
    return map
  }, [events, internalCalendars, internalSettings, settings])

  const setInternalTypeColor = async (type: string, color: string) => {
    const hex = normalizeHexColor(color)
    await rootUpdate({ [`admin/ui/colors/calendar/internalTypes/${type}`]: hex || null })
  }

  const setTaskEventColorRule = async (next: { mode: "default" | "status" | "customField"; fieldId?: string }) => {
    await rootUpdate({
      [`admin/ui/colors/calendar/taskEvents`]: { mode: next.mode, fieldId: String(next.fieldId || "") },
    })
  }

  const taskById = useMemo(() => {
    const m = new Map<string, AdminTaskLite>()
    tasks.forEach((t) => m.set(t.id, t))
    return m
  }, [tasks])

  const taskEventColor = (taskId: string): string => {
    if (taskEventColoring.mode === "default") return ""
    const t = taskById.get(taskId)
    if (!t) return ""
    if (taskEventColoring.mode === "status") {
      const st = String(t.status || "")
      return normalizeHexColor(uiTaskStatusColors?.[st] || "")
    }
    if (taskEventColoring.mode === "customField") {
      const fid = String(taskEventColoring.fieldId || "").trim()
      if (!fid) return ""
      const def = taskFields.find((f) => f.id === fid) || null
      if (!def || (def.type !== "select" && def.type !== "multiselect")) return ""
      const raw = (t.custom || {})[fid]
      const opt =
        def.type === "select"
          ? String(raw || "").trim()
          : Array.isArray(raw) && raw.length
            ? String(raw[0] || "").trim()
            : ""
      const mapped = opt ? uiTaskCustomFieldColors?.[fid]?.[opt] : ""
      return normalizeHexColor(mapped || "")
    }
    return ""
  }

  const internalTypeColor = (type: string): string => normalizeHexColor(uiInternalTypeColors?.[String(type || "").trim()] || "")

  const internalEventColor = (eventId: string): string => {
    const rawId = String(eventId || "").split("__")[0]
    const raw = (internalEvents as any)?.[rawId] || {}
    const t = String(raw?.type || raw?.meetingType || "internal")
    return internalTypeColor(t)
  }


  const taskEvents = useMemo(() => {
    if (!showTasks) return [] as CalendarEvent[]
    const rows = tasks
      .filter((t) => Boolean(t.dueDate))
      .map((t) => {
        const dateKey = String(t.dueDate || "").trim()
        return {
          provider: "task" as const,
          calendarId: "tasks",
          id: t.id,
          title: t.title || "Task",
          description: "",
          start: dateKey,
          end: addDaysKey(dateKey, 1),
          allDay: true,
        } as CalendarEvent
      })
    return rows
  }, [showTasks, tasks])

  const displayedEvents = useMemo(() => {
    const internal: CalendarEvent[] = Object.entries(internalEvents || {})
      .flatMap(([id, raw]: any) => {
        const startAt = Number(raw?.startAt || 0)
        const endAt = Number(raw?.endAt || 0)
        if (!startAt || !endAt) return []
        const fallbackInternalCalendarId =
          defaultInternalCalendarId() || enabledInternalIds()[0] || internalCalendars[0]?.id || ""
        const recurrence = normalizeInternalRecurrence(raw?.recurrence)
        const baseEvent = {
          provider: "internal" as const,
          calendarId: String(raw?.calendarId || fallbackInternalCalendarId || ""),
          sourceEventId: id,
          title: String(raw?.title || ""),
          description: String(raw?.description || ""),
          location: String(raw?.location || ""),
          allDay: Boolean(raw?.allDay),
        }

        if (!recurrence) {
          return [
            {
              ...baseEvent,
              id,
              start: new Date(startAt).toISOString(),
              end: new Date(endAt).toISOString(),
            } as CalendarEvent,
          ]
        }

        const startDateKey = format(new Date(startAt), "yyyy-MM-dd")
        const rangeStartKey = format(visibleRange.start, "yyyy-MM-dd")
        const rangeEndKey = format(visibleRange.end, "yyyy-MM-dd")
        const durationMs = Math.max(0, endAt - startAt)
        const timePart = format(new Date(startAt), "HH:mm:ss")
        const occurrences: CalendarEvent[] = []
        let occurrenceDateKey = startDateKey
        let guard = 0

        while (guard < 366) {
          guard += 1
          if (recurrence.until && occurrenceDateKey > recurrence.until) break
          if (occurrenceDateKey > rangeEndKey) break
          if (occurrenceDateKey >= rangeStartKey) {
            const occurrenceStart = baseEvent.allDay
              ? new Date(`${occurrenceDateKey}T00:00:00`).getTime()
              : new Date(`${occurrenceDateKey}T${timePart}`).getTime()
            occurrences.push({
              ...baseEvent,
              id: `${id}__${occurrenceDateKey}`,
              start: new Date(occurrenceStart).toISOString(),
              end: new Date(occurrenceStart + durationMs).toISOString(),
            })
          }
          occurrenceDateKey = nextOccurrenceDate(occurrenceDateKey, recurrence)
        }

        return occurrences
      })
      .filter(Boolean) as any

    const filterSet = new Set(calendarFilter)
    const useAll = filterSet.size === 0
    const internalInRange = internal.filter((ev) => {
      if (!useAll && !filterSet.has(`internal:${ev.calendarId}`)) return false
      if (!ev.calendarId) return false
      const startD = toDate(ev.start)
      const endD = toDate(ev.end)
      const s = startD ? startD.getTime() : 0
      const e = endD ? endD.getTime() : s
      return s <= visibleRange.end.getTime() && e >= visibleRange.start.getTime()
    })

    return [...events, ...internalInRange, ...taskEvents]
  }, [events, internalEvents, internalSettings, calendarFilter, taskEvents, visibleRange.end, visibleRange.start])

  const schedulingConflicts = useMemo(() => {
    if (!modalOpen || draft.allDay || !draft.startDate || !draft.endDate) return []
    const startAt = new Date(`${draft.startDate}T${draft.startTime || "00:00"}:00`).getTime()
    const endAt = new Date(`${draft.endDate}T${draft.endTime || "00:00"}:00`).getTime()
    if (!startAt || !endAt || endAt <= startAt) return []
    const editingKey = editingEvent?.provider === "internal" ? (editingEvent.sourceEventId || editingEvent.id) : editingEvent?.id || ""
    return displayedEvents.filter((event) => {
      if (event.provider === "task") return false
      const eventKey = event.provider === "internal" ? (event.sourceEventId || event.id) : event.id
      if (editingKey && event.provider === editingEvent?.provider && eventKey === editingKey) return false
      const eventStart = toDate(event.start)?.getTime() || 0
      const eventEnd = toDate(event.end)?.getTime() || eventStart
      if (!eventStart || !eventEnd) return false
      return startAt < eventEnd && endAt > eventStart
    })
  }, [displayedEvents, draft.allDay, draft.endDate, draft.endTime, draft.startDate, draft.startTime, editingEvent, modalOpen])

  const exportVisibleRangeIcs = () => {
    const rows = displayedEvents
      .filter((event) => event.provider !== "task")
      .map((event) => ({
        uid: `${event.provider}-${event.calendarId}-${event.id}`,
        title: event.title || "Event",
        description: event.description || "",
        location: event.location || "",
        start: event.start,
        end: event.end,
        allDay: Boolean(event.allDay || isDateOnly(event.start)),
      }))
    if (!rows.length) return
    downloadIcsFile(`calendar-${format(visibleRange.start, "yyyyMMdd")}-${format(visibleRange.end, "yyyyMMdd")}.ics`, rows)
  }

  const exportDraftEventIcs = () => {
    if (!draft.title.trim()) return
    const start = draft.allDay ? draft.startDate : new Date(`${draft.startDate}T${draft.startTime}:00`).toISOString()
    const end = draft.allDay
      ? (draft.endDate || addDaysKey(draft.startDate, 1))
      : new Date(`${draft.endDate}T${draft.endTime}:00`).toISOString()
    downloadIcsFile(`${draft.title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "event"}.ics`, [
      {
        uid: `${draft.provider}-${draft.calendarId}-${editingEvent?.id || "draft"}`,
        title: draft.title.trim(),
        description: draft.description || "",
        location: draft.location || "",
        start,
        end,
        allDay: Boolean(draft.allDay),
      },
    ])
  }

  const moveInternalEventToDate = async (event: CalendarEvent, day: Date) => {
    if (event.provider !== "internal") return
    const baseId = event.sourceEventId || event.id
    const raw = (internalEvents as any)?.[baseId]
    if (!raw) return
    const originalStart = Number(raw?.startAt || 0)
    const originalEnd = Number(raw?.endAt || 0)
    if (!originalStart || !originalEnd) return
    const durationMs = Math.max(0, originalEnd - originalStart)
    const targetDateKey = toDateKey(day)
    const originalDate = new Date(originalStart)
    if (normalizeInternalRecurrence(raw?.recurrence)) return
    const startAt = raw?.allDay
      ? new Date(`${targetDateKey}T00:00:00`).getTime()
      : new Date(`${targetDateKey}T${format(originalDate, "HH:mm")}:00`).getTime()
    const endAt = raw?.allDay ? startAt + durationMs : startAt + durationMs

    await upsertInternalCalendarEvent({
      ...(raw || {}),
      id: baseId,
      startAt,
      endAt,
      updatedAt: nowMs(),
    } as any)
  }

  const eventsForDay = (day: Date) => {
    const dayStart = startOfDay(day).getTime()
    const dayEnd = endOfDay(day).getTime()

    return displayedEvents
      .map((e) => {
        const s = toDate(e.start)
        const en = toDate(e.end)
        if (!s || !en) return null
        return { e, s, en }
      })
      .filter(Boolean)
      .filter(({ s, en }: any) => s.getTime() < dayEnd && en.getTime() > dayStart)
      .map(({ e }: any) => e as CalendarEvent)
      .sort((a, b) => (toDate(a.start)?.getTime() || 0) - (toDate(b.start)?.getTime() || 0))
  }

  const openCreate = (day?: Date) => {
    const d = day || new Date()
    const dateKey = toDateKey(d)
    const provider: EventProvider = oauthStatus.google.connected ? "google" : oauthStatus.outlook.connected ? "outlook" : "internal"
    const calendarId =
      provider === "internal"
        ? defaultInternalCalendarId() || enabledInternalIds()[0] || internalCalendars[0]?.id || ""
        : defaultCalendarId(provider) ||
          enabledIds(provider)[0] ||
          calendars[provider].find((c) => c.primary)?.id ||
          calendars[provider][0]?.id ||
          ""

    setEditingEvent(null)
    setModalMode("create")
    setDraft({
      title: "",
      description: "",
      location: "",
      meetingType: "meeting",
      attendees: "",
      meetingUrl: "",
      reminderMinutes: "15",
      responseStatus: "needs_action",
      conferenceProvider: "",
      allDay: viewMode !== "day",
      startDate: dateKey,
      startTime: "09:00",
      endDate: viewMode !== "day" ? addDaysKey(dateKey, 1) : dateKey,
      endTime: "10:00",
      provider,
      calendarId,
      linkedTaskId: "",
      linkedProjectId: "",
      linkedContactId: "",
      linkedClientId: "",
      linkedOpportunityId: "",
      recurrenceEnabled: false,
      recurrenceFreq: "weekly",
      recurrenceInterval: "1",
      recurrenceUntil: "",
    })
    setModalOpen(true)
  }

  // Deep-link creation: /Admin/Calendar?create=1&contactId=...&clientId=...&opportunityId=...&taskId=...&projectId=...&date=yyyy-mm-dd
  useEffect(() => {
    if (modalOpen) return
    const params = new URLSearchParams(location.search || "")
    const create = String(params.get("create") || "").trim()
    if (create !== "1") return

    const contactId = String(params.get("contactId") || "").trim()
    const clientId = String(params.get("clientId") || "").trim()
    const opportunityId = String(params.get("opportunityId") || "").trim()
    const taskId = String(params.get("taskId") || "").trim()
    const projectId = String(params.get("projectId") || "").trim()
    const dateKey = String(params.get("date") || "").trim()

    const day = dateKey && isDateOnly(dateKey) ? new Date(`${dateKey}T00:00:00`) : currentDate
    openCreate(day)

    // Apply links + a sensible title
    const contactName = contactId ? contacts.find((c) => c.id === contactId)?.name : ""
    const taskTitle = taskId ? tasks.find((t) => t.id === taskId)?.title : ""
    const inferredTitle = contactName ? `Meeting with ${contactName}` : taskTitle ? `Task: ${taskTitle}` : ""

    setDraft((p) => ({
      ...p,
      linkedContactId: contactId || p.linkedContactId,
      linkedClientId: clientId || p.linkedClientId,
      linkedOpportunityId: opportunityId || p.linkedOpportunityId,
      linkedTaskId: taskId || p.linkedTaskId,
      linkedProjectId: projectId || p.linkedProjectId,
      title: inferredTitle || p.title,
    }))

    // Clear the one-shot param so it doesn't re-trigger on close.
    params.delete("create")
    const nextSearch = params.toString()
    navigate({ pathname: "/Calendar", search: nextSearch ? `?${nextSearch}` : "" }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, modalOpen, contacts, tasks, currentDate])

  // Deep-link open: /Admin/Calendar?eventId=...
  useEffect(() => {
    if (modalOpen) return
    const params = new URLSearchParams(location.search || "")
    const eventId = String(params.get("eventId") || "").trim()
    if (!eventId) return
    const raw = (internalEvents as any)?.[eventId] || null
    if (!raw) return
    const startAt = Number(raw?.startAt || 0)
    const endAt = Number(raw?.endAt || 0) || startAt
    if (!startAt) return
    const allDay = Boolean(raw?.allDay)
    const fallbackInternalCalendarId =
      defaultInternalCalendarId() || enabledInternalIds()[0] || internalCalendars[0]?.id || ""
    const ev: CalendarEvent = {
      provider: "internal",
      calendarId: String(raw?.calendarId || fallbackInternalCalendarId || ""),
      id: eventId,
      sourceEventId: eventId,
      title: String(raw?.title || "Event"),
      description: String(raw?.description || ""),
      location: String(raw?.location || ""),
      start: allDay ? format(new Date(startAt), "yyyy-MM-dd") : new Date(startAt).toISOString(),
      end: allDay ? format(new Date(endAt), "yyyy-MM-dd") : new Date(endAt).toISOString(),
      allDay,
    }
    openView(ev)
    params.delete("eventId")
    const nextSearch = params.toString()
    navigate({ pathname: "/Calendar", search: nextSearch ? `?${nextSearch}` : "" }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalEvents, location.search, modalOpen])

  const openView = (ev: CalendarEvent) => {
    if (ev.provider === "task") {
      navigate(`/Tasks/Tasks?taskId=${encodeURIComponent(ev.id)}`)
      return
    }
    setEditingEvent(ev)
    setModalMode("view")
    const startD = toDate(ev.start) || new Date()
    const endD = toDate(ev.end) || startD
    const link =
      ev.provider === "internal"
        ? ((internalEvents as any)?.[ev.sourceEventId || ev.id] || {}) as EventLink
        : ((eventLinks as any)?.[ev.provider]?.[ev.id] || {}) as EventLink
    const recurrence =
      ev.provider === "internal"
        ? normalizeInternalRecurrence((internalEvents as any)?.[ev.sourceEventId || ev.id]?.recurrence)
        : null
    setDraft({
      title: ev.title || "",
      description: ev.description || "",
      location: ev.location || String(link.location || ""),
      meetingType: String(link.meetingType || "meeting") || "meeting",
      attendees: String(link.attendees || ""),
      meetingUrl: String(link.meetingUrl || ""),
      reminderMinutes: String(link.reminderMinutes ?? 15),
      responseStatus: (String(link.responseStatus || "needs_action") as NonNullable<EventLink["responseStatus"]>) || "needs_action",
      conferenceProvider: (String(link.conferenceProvider || "") as NonNullable<EventLink["conferenceProvider"]>) || "",
      allDay: Boolean(ev.allDay || isDateOnly(ev.start)),
      startDate: toDateKey(startD),
      startTime: format(startD, "HH:mm"),
      endDate: toDateKey(endD),
      endTime: format(endD, "HH:mm"),
      provider: ev.provider as any,
      calendarId: ev.calendarId,
      linkedTaskId: String((link as any).taskId || ""),
      linkedProjectId: String((link as any).projectId || ""),
      linkedContactId: String((link as any).contactId || ""),
      linkedClientId: String((link as any).clientId || ""),
      linkedOpportunityId: String((link as any).opportunityId || ""),
      recurrenceEnabled: Boolean(recurrence),
      recurrenceFreq: recurrence?.freq || "weekly",
      recurrenceInterval: String(recurrence?.interval || 1),
      recurrenceUntil: recurrence?.until || "",
    })
    setModalOpen(true)
  }

  const switchToEdit = () => setModalMode("edit")

  const saveEvent = async () => {
    if (!draft.title.trim()) return
    if (!draft.calendarId) return

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    const allDay = Boolean(draft.allDay)
    const reminderMinutes = Math.max(0, Number(draft.reminderMinutes || 0) || 0)
    const nextLinks = normalizeEventLinks({
      taskId: draft.linkedTaskId,
      projectId: draft.linkedProjectId,
      contactId: draft.linkedContactId,
      clientId: draft.linkedClientId,
      opportunityId: draft.linkedOpportunityId,
    })
    const recurrence =
      draft.provider === "internal" && draft.recurrenceEnabled
        ? normalizeInternalRecurrence({
            freq: draft.recurrenceFreq,
            interval: draft.recurrenceInterval,
            until: draft.recurrenceUntil,
          })
        : null

    let start = ""
    let end = ""
    if (allDay) {
      start = draft.startDate
      end = draft.endDate || addDaysKey(draft.startDate, 1)
      if (end === start) end = addDaysKey(start, 1)
    } else {
      start = new Date(`${draft.startDate}T${draft.startTime}:00`).toISOString()
      end = new Date(`${draft.endDate}T${draft.endTime}:00`).toISOString()
    }

    // INTERNAL events: stored directly in RTDB.
    if (draft.provider === "internal") {
      const previousLinks =
        editingEvent?.provider === "internal"
          ? (((internalEvents as any)?.[editingEvent.sourceEventId || editingEvent.id] || {}) as Partial<EventLink>)
          : null
      const internalEventId =
        editingEvent?.provider === "internal" ? (editingEvent.sourceEventId || editingEvent.id) : undefined
      const startAt = allDay
        ? new Date(`${draft.startDate}T00:00:00`).getTime()
        : new Date(`${draft.startDate}T${draft.startTime}:00`).getTime()
      const endAt = allDay
        ? new Date(`${draft.endDate || addDaysKey(draft.startDate, 1)}T00:00:00`).getTime()
        : new Date(`${draft.endDate}T${draft.endTime}:00`).getTime()

      await upsertInternalCalendarEvent({
        id: internalEventId,
        title: draft.title.trim(),
        description: draft.description || "",
        type: draft.meetingType || "internal",
        startAt,
        endAt,
        allDay,
        calendarId: draft.calendarId,
        meetingType: draft.meetingType || "meeting",
        location: draft.location || "",
        attendees: draft.attendees || "",
        meetingUrl: draft.meetingUrl || "",
        reminderMinutes,
        responseStatus: draft.responseStatus || "needs_action",
        conferenceProvider: draft.conferenceProvider || "",
        taskId: nextLinks.taskId,
        projectId: nextLinks.projectId,
        contactId: nextLinks.contactId,
        clientId: nextLinks.clientId,
        opportunityId: nextLinks.opportunityId,
        recurrence,
        updatedAt: nowMs(),
        createdAt: internalEventId ? undefined : nowMs(),
      } as any)

      const cleanupUpdates = buildCalendarLinkCleanupUpdates("internal", internalEventId || "", previousLinks, nextLinks)
      if (Object.keys(cleanupUpdates).length) {
        await rootUpdate(cleanupUpdates)
      }

      setModalOpen(false)
      return
    }

      const resp = await fetch(`${fnFetchBase}/upsertEvent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "admin",
        provider: draft.provider,
        calendarId: draft.calendarId,
        eventId: editingEvent?.id || "",
        title: draft.title.trim(),
        description: draft.description || "",
        location: draft.location || "",
        attendees: String(draft.attendees || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        start,
        end,
        allDay,
        timeZone: tz,
      }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!data?.success) throw new Error(data?.error || "Failed to save event")

    const eventId = String(data?.eventId || editingEvent?.id || "").trim()

    // Store per-user link metadata (legacy UI integration)
    try {
      if (uid && eventId) {
        const linkRef = ref(db, `admin/calendar/eventLinks/${uid}/${draft.provider}/${eventId}`)
        if (
          draft.linkedTaskId ||
          draft.linkedProjectId ||
          draft.linkedContactId ||
          draft.linkedClientId ||
          draft.linkedOpportunityId ||
          draft.location ||
          draft.meetingType ||
          draft.attendees
        ) {
          await set(linkRef, {
            taskId: draft.linkedTaskId || "",
            projectId: draft.linkedProjectId || "",
            contactId: draft.linkedContactId || "",
            clientId: draft.linkedClientId || "",
            opportunityId: draft.linkedOpportunityId || "",
            meetingType: draft.meetingType || "",
            location: draft.location || "",
            attendees: draft.attendees || "",
            meetingUrl: draft.meetingUrl || "",
            reminderMinutes,
            responseStatus: draft.responseStatus || "needs_action",
            conferenceProvider: draft.conferenceProvider || "",
            updatedAt: nowMs(),
          })
        } else {
          await remove(linkRef)
        }
      }
    } catch {
      // ignore
    }

    // Generalized provider links so other sections can resolve related events
    if (eventId && (draft.provider === "google" || draft.provider === "outlook")) {
      const provider = draft.provider
      const calendarId = draft.calendarId
      const previousLinks =
        editingEvent?.provider === provider
          ? (((eventLinks as any)?.[provider]?.[editingEvent.id] || {}) as Partial<EventLink>)
          : null
      const writes: Array<Promise<any>> = []
      const providerLinkPayload = {
        provider,
        calendarId,
        eventId,
        title: draft.title.trim(),
        start,
        end,
        allDay,
        location: draft.location || "",
        meetingType: draft.meetingType || "",
        meetingUrl: draft.meetingUrl || "",
        reminderMinutes,
        responseStatus: (draft.responseStatus || "needs_action") as NonNullable<EventLink["responseStatus"]>,
        conferenceProvider: (draft.conferenceProvider || "") as NonNullable<EventLink["conferenceProvider"]>,
      }
      if (nextLinks.taskId) writes.push(upsertProviderLink({ entityType: "task", entityId: nextLinks.taskId, ...providerLinkPayload }))
      if (nextLinks.projectId) writes.push(upsertProviderLink({ entityType: "project", entityId: nextLinks.projectId, ...providerLinkPayload }))
      if (nextLinks.contactId) writes.push(upsertProviderLink({ entityType: "contact", entityId: nextLinks.contactId, ...providerLinkPayload }))
      if (nextLinks.clientId) writes.push(upsertProviderLink({ entityType: "client", entityId: nextLinks.clientId, ...providerLinkPayload }))
      if (nextLinks.opportunityId) writes.push(upsertProviderLink({ entityType: "opportunity", entityId: nextLinks.opportunityId, ...providerLinkPayload }))
      await Promise.all(writes)

      const cleanupUpdates = buildCalendarLinkCleanupUpdates(provider, eventId, previousLinks, nextLinks)
      if (Object.keys(cleanupUpdates).length) {
        await rootUpdate(cleanupUpdates)
      }
    }

    setModalOpen(false)
    await loadEventsForRange()
  }

  const openProviderWeb = () => {
    if (draft.provider === "google") {
      window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer")
      return
    }
    if (draft.provider === "internal") return
    window.open("https://outlook.office.com/calendar/", "_blank", "noopener,noreferrer")
  }

  const openProviderCompose = () => {
    const title = String(draft.title || "").trim()
    const body = String(draft.description || "")
    const locationText = String(draft.location || "")
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

    const allDay = Boolean(draft.allDay)
    const startD = allDay ? new Date(`${draft.startDate}T00:00:00`) : new Date(`${draft.startDate}T${draft.startTime}:00`)
    const endD = allDay ? new Date(`${draft.endDate || addDaysKey(draft.startDate, 1)}T00:00:00`) : new Date(`${draft.endDate}T${draft.endTime}:00`)

    if (draft.provider === "internal") return
    if (draft.provider === "google") {
      const url = new URL("https://calendar.google.com/calendar/u/0/r/eventedit")
      url.searchParams.set("text", title || "New event")
      if (locationText) url.searchParams.set("location", locationText)
      if (body) url.searchParams.set("details", body)
      // dates: YYYYMMDD/YYYYMMDD for all-day; otherwise YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ
      const fmtDate = (d: Date) => format(d, "yyyyMMdd")
      const fmtDateTimeZ = (d: Date) => format(new Date(d.toISOString()), "yyyyMMdd'T'HHmmss'Z'")
      const dates = allDay ? `${fmtDate(startD)}/${fmtDate(endD)}` : `${fmtDateTimeZ(startD)}/${fmtDateTimeZ(endD)}`
      url.searchParams.set("dates", dates)
      // Provide tz hint for Google; it will still respect account settings
      url.searchParams.set("ctz", tz)
      window.open(url.toString(), "_blank", "noopener,noreferrer")
      return
    }

    // Outlook web compose deep link
    const url = new URL("https://outlook.office.com/calendar/0/deeplink/compose")
    url.searchParams.set("subject", title || "New event")
    url.searchParams.set("body", body || "")
    if (locationText) url.searchParams.set("location", locationText)
    url.searchParams.set("startdt", startD.toISOString())
    url.searchParams.set("enddt", endD.toISOString())
    window.open(url.toString(), "_blank", "noopener,noreferrer")
  }

  const generateConferenceLink = () => {
    const slug = Math.random().toString(36).slice(2, 10)
    if (draft.conferenceProvider === "google_meet") {
      setDraft((p) => ({ ...p, meetingUrl: `https://meet.google.com/${slug.slice(0, 3)}-${slug.slice(3, 6)}-${slug.slice(6, 9)}` }))
      return
    }
    if (draft.conferenceProvider === "teams") {
      setDraft((p) => ({ ...p, meetingUrl: `https://teams.microsoft.com/l/meetup-join/${slug}` }))
      return
    }
    if (draft.conferenceProvider === "zoom") {
      setDraft((p) => ({ ...p, meetingUrl: `https://zoom.us/j/${slug}${Date.now().toString().slice(-3)}` }))
      return
    }
    setDraft((p) => ({ ...p, meetingUrl: `https://meet.1stop.local/${slug}` }))
  }

  const deleteEditingEvent = async () => {
    if (!editingEvent) return
    if (editingEvent.provider === "internal") {
      const internalEventId = editingEvent.sourceEventId || editingEvent.id
      const raw = ((internalEvents as any)?.[internalEventId] || {}) as any
      const updates: Record<string, any> = {
        [`admin/calendar/events/${internalEventId}`]: null,
      }
      const del = (entityType: any, entityId: any) => {
        const id = String(entityId || "").trim()
        if (!id) return
        updates[calendarLinkEventPath(entityType, id, "internal" as any, internalEventId)] = null
      }
      del("task", raw.taskId)
      del("project", raw.projectId)
      del("contact", raw.contactId)
      del("client", raw.clientId)
      del("opportunity", raw.opportunityId)
      await rootUpdate(updates)
      setModalOpen(false)
      return
    }
      const resp = await fetch(`${fnFetchBase}/deleteEvent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "admin",
        provider: editingEvent.provider,
        calendarId: editingEvent.calendarId,
        eventId: editingEvent.id,
      }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!data?.success) throw new Error(data?.error || "Failed to delete event")

    try {
      if (uid) {
        await remove(ref(db, `admin/calendar/eventLinks/${uid}/${editingEvent.provider}/${editingEvent.id}`))
      }
    } catch {
      // ignore
    }

    // Best-effort cleanup for generalized links using current draft links
    if (editingEvent.provider === "google" || editingEvent.provider === "outlook") {
      const provider = editingEvent.provider
      const updates: Record<string, any> = {}
      const del = (entityType: any, entityId: string) => {
        const id = String(entityId || "").trim()
        if (!id) return
        updates[calendarLinkEventPath(entityType, id, provider, editingEvent.id)] = null
      }
      del("task", draft.linkedTaskId)
      del("project", draft.linkedProjectId)
      del("contact", draft.linkedContactId)
      del("client", draft.linkedClientId)
      del("opportunity", draft.linkedOpportunityId)
      if (Object.keys(updates).length) await rootUpdate(updates)
    }

    setModalOpen(false)
    await loadEventsForRange()
  }

  const monthDays = useMemo(() => {
    if (viewMode !== "month") return []
    return eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end })
  }, [visibleRange.end, visibleRange.start, viewMode])

  const dateType = viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month"

  return (
    <AdminPageShell
      title="Calendar"
      description="Internal events, synced providers, task deadlines, and the upgraded calendar controls now sit inside the same admin shell as the rest of the workspace."
      metrics={[
        { label: "Visible events", value: events.length, icon: <EventIcon fontSize="small" /> },
        { label: "Tasks available", value: tasks.length, icon: <SettingsIcon fontSize="small" /> },
        { label: "Internal calendars", value: internalCalendars.length, icon: <SettingsIcon fontSize="small" /> },
      ]}
    >
    <Box sx={{ p: 0 }}>
      <DataHeader
        currentDate={currentDate}
        onDateChange={(d) => setCurrentDate(d)}
        dateType={dateType}
        onDateTypeChange={(t) => setViewMode(t === "day" ? "day" : t === "week" ? "week" : "month")}
        showDateControls
        showDateTypeSelector
        availableDateTypes={["day", "week", "month"]}
        onCreateNew={() => openCreate(currentDate)}
        createButtonLabel="New Event"
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((p) => !p)}
        filters={[
          {
            label: "Calendars",
            options: allAvailableCalendars.map((c) => ({ id: c.id, name: c.name })),
            selectedValues: calendarFilter,
            onSelectionChange: (values) => setCalendarFilter(values as string[]),
          },
        ]}
        additionalButtons={[
          {
            label: showTasks ? "Tasks: On" : "Tasks: Off",
            icon: <EventIcon />,
            onClick: () => setShowTasks((p) => !p),
            variant: "outlined",
          },
          {
            label: "Settings",
            icon: <SettingsIcon />,
            onClick: () => setSettingsOpen(true),
            variant: "outlined",
          },
          {
            label: "Export View",
            icon: <EventIcon />,
            onClick: exportVisibleRangeIcs,
            variant: "outlined",
          },
        ]}
      />

      {banner ? (
        <Alert severity={banner.type} sx={{ mt: 2 }}>
          {banner.text}
        </Alert>
      ) : null}

                        <CRUDModal
              open={settingsOpen}
              onClose={(reason) => {
                setSettingsOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = () => setSettingsOpen(false)
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "fullModal1",
                crudMode: "view",
              }}
              title="Calendar Settings"
              subtitle="Manage calendars, integrations and defaults"
              icon={<SettingsIcon />}
              mode="view"
            >
        <Box sx={{ p: 0 }}>
          <Tabs
            value={settingsTab}
            onChange={(_e, v) => setSettingsTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}
          >
            <Tab label="Calendars" />
            <Tab label="Integrations" />
            <Tab label="Defaults" />
          </Tabs>

          {/* ── Calendars Tab ── */}
          {settingsTab === 0 ? (
            <Box>
              <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                App Calendars
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Calendars stored in the app. All are available — pick a color and set the default for new events.
              </Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                <TextField
                  size="small"
                  label="New Calendar Name"
                  value={(internalSettings as any).__newName || ""}
                  onChange={(e) => setInternalSettings((p) => ({ ...(p as any), __newName: e.target.value }))}
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="outlined"
                  onClick={async () => {
                    const name = String((internalSettings as any).__newName || "").trim()
                    if (!name) return
                    const now = nowMs()
                    const newRef = push(ref(db, `admin/calendar/internalCalendars`))
                    const id = newRef.key || ""
                    if (!id) return
                    await set(newRef, { name, createdAt: now, updatedAt: now })
                    setInternalSettings((p) => ({ ...(p as any), __newName: "" }))
                    await toggleInternalCalendar(id, true)
                  }}
                >
                  Create
                </Button>
              </Box>

              {internalCalendars.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No app calendars yet. Create one above.
                </Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {internalCalendars.slice(0, 50).map((c) => (
                    <Paper
                      key={c.id}
                      variant="outlined"
                      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, px: 2, py: 1.5 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>{c.name}</Typography>
                        {defaultInternalCalendarId() === c.id ? (
                          <Chip size="small" label="Default" color="primary" sx={{ mt: 0.5 }} />
                        ) : (
                          <Button size="small" variant="text" sx={{ mt: 0.5, p: 0, minWidth: 0 }} onClick={() => setDefaultInternalCalendar(c.id)}>
                            Set As Default
                          </Button>
                        )}
                      </Box>
                      <Box sx={{ minWidth: 180 }}>
                        <ColorSelect
                          label="Color"
                          value={internalColorSetting(c.id) || "#1976d2"}
                          onChange={(color) => setInternalCalendarColor(c.id, color)}
                        />
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={async () => {
                          await remove(ref(db, `admin/calendar/internalCalendars/${c.id}`))
                          await toggleInternalCalendar(c.id, false)
                        }}
                      >
                        Delete
                      </Button>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Synced provider calendars */}
              {(["google", "outlook"] as ProviderKey[]).map((provider) => {
                const connected = oauthStatus[provider].connected
                const calendarsForProvider = calendars[provider] || []
                if (!connected || calendarsForProvider.length === 0) return null

                return (
                  <Box key={provider} sx={{ mt: 3 }}>
                    <Typography fontWeight={900} sx={{ mb: 0.5, textTransform: "capitalize" }}>
                      {provider === "google" ? "Google" : "Outlook"} Calendars
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Synced from your {provider === "google" ? "Google" : "Outlook"} account. Pick a color and category for each.
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1 }}>
                      {calendarsForProvider.slice(0, 50).map((c: CalendarMeta) => (
                        <Paper
                          key={c.id}
                          variant="outlined"
                          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, px: 2, py: 1.5 }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={700}>
                              {c.name} {c.primary ? <Chip size="small" label="Primary" sx={{ ml: 0.5 }} /> : null}
                            </Typography>
                            {defaultCalendarId(provider) === c.id ? (
                              <Chip size="small" label="Default" color="primary" sx={{ mt: 0.5 }} />
                            ) : (
                              <Button size="small" variant="text" sx={{ mt: 0.5, p: 0, minWidth: 0 }} onClick={() => setDefaultCalendar(provider, c.id)}>
                                Set As Default
                              </Button>
                            )}
                          </Box>
                          <Box sx={{ minWidth: 160 }}>
                            <ColorSelect
                              label="Color"
                              value={colorByCalendarSetting(provider, c.id) || "#1976d2"}
                              onChange={(color) => setCalendarColor(provider, c.id, color)}
                            />
                          </Box>
                          <Select
                            size="small"
                            value={categoryByCalendar(provider, c.id)}
                            onChange={(e) => setCalendarCategory(provider, c.id, e.target.value as CalendarCategory)}
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="personal">Personal</MenuItem>
                            <MenuItem value="company">Company</MenuItem>
                          </Select>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ) : null}

          {/* ── Integrations Tab ── */}
          {settingsTab === 1 ? (
            <Box>
              {/* Google Calendar */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box>
                    <Typography fontWeight={900}>Google Calendar</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {oauthStatus.google.connected
                        ? `Connected${oauthStatus.google.email ? ` (${oauthStatus.google.email})` : ""}`
                        : "Not connected"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={oauthStatus.google.connected ? "Connected" : "Disconnected"}
                    color={oauthStatus.google.connected ? "success" : "default"}
                  />
                </Box>

                {oauthStatus.google.error ? <Alert severity="error" sx={{ mb: 1 }}>{oauthStatus.google.error}</Alert> : null}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Connect using OAuth (App Password). This enables two-way sync — events created here appear in Google Calendar and vice versa.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                  {!oauthStatus.google.connected ? (
                    <Button variant="contained" onClick={() => beginOAuth("google")} disabled={!uid}>
                      Connect Google Calendar
                    </Button>
                  ) : (
                    <>
                      <Button variant="outlined" color="error" onClick={() => disconnect("google")}>
                        Disconnect
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => loadCalendars("google")}
                        disabled={Boolean(loadingCalendars.google)}
                      >
                        {loadingCalendars.google ? "Loading…" : "Refresh Calendars"}
                      </Button>
                    </>
                  )}
                  <Button variant="text" onClick={refreshOAuthStatus}>
                    Refresh Status
                  </Button>
                </Box>

                {oauthStatus.google.connected && (calendars.google || []).length > 0 ? (
                  <Alert severity="success">
                    {calendars.google.length} calendar{calendars.google.length !== 1 ? "s" : ""} found. Go to the Calendars tab to configure colors and defaults.
                  </Alert>
                ) : oauthStatus.google.connected ? (
                  <Alert severity="info">Connected — click "Refresh Calendars" to load your calendars.</Alert>
                ) : null}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box>
                    <Typography fontWeight={900}>Outlook Calendar</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {oauthStatus.outlook.connected
                        ? `Connected${oauthStatus.outlook.email ? ` (${oauthStatus.outlook.email})` : ""}`
                        : "Not connected"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={oauthStatus.outlook.connected ? "Connected" : "Disconnected"}
                    color={oauthStatus.outlook.connected ? "success" : "default"}
                  />
                </Box>
                {oauthStatus.outlook.error ? <Alert severity="error" sx={{ mb: 1 }}>{oauthStatus.outlook.error}</Alert> : null}
                <Typography variant="body2" color="text.secondary">
                  Connect using OAuth. This enables two-way sync so Outlook or Microsoft 365 calendar events can be managed from the admin workspace.
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5, mb: 1.5 }}>
                  {!oauthStatus.outlook.connected ? (
                    <Button variant="contained" onClick={() => beginOAuth("outlook")} disabled={!uid}>
                      Connect Outlook Calendar
                    </Button>
                  ) : (
                    <>
                      <Button variant="outlined" color="error" onClick={() => disconnect("outlook")}>
                        Disconnect
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => loadCalendars("outlook")}
                        disabled={Boolean(loadingCalendars.outlook)}
                      >
                        {loadingCalendars.outlook ? "Loading…" : "Refresh Calendars"}
                      </Button>
                    </>
                  )}
                  <Button variant="text" onClick={refreshOAuthStatus}>
                    Refresh Status
                  </Button>
                </Box>
                {oauthStatus.outlook.connected && (calendars.outlook || []).length > 0 ? (
                  <Alert severity="success">
                    {calendars.outlook.length} calendar{calendars.outlook.length !== 1 ? "s" : ""} found. Go to the Calendars tab to configure colors and defaults.
                  </Alert>
                ) : oauthStatus.outlook.connected ? (
                  <Alert severity="info">Connected — click "Refresh Calendars" to load your calendars.</Alert>
                ) : null}
              </Paper>
            </Box>
          ) : null}

          {/* ── Defaults Tab ── */}
          {settingsTab === 2 ? (
            <Box>
              <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                Visual Colors
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure how task due-date events and internal event types are colored on the calendar.
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography fontWeight={800} sx={{ mb: 1 }}>
                  Task Events (Due Dates)
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 1, alignItems: "center" }}>
                  <Select
                    size="small"
                    value={taskEventColoring.mode}
                    onChange={(e) => void setTaskEventColorRule({ mode: e.target.value as any, fieldId: taskEventColoring.fieldId })}
                  >
                    <MenuItem value="default">Default (Calendar Color)</MenuItem>
                    <MenuItem value="status">By Task Status</MenuItem>
                    <MenuItem value="customField">By Task Custom Field</MenuItem>
                  </Select>
                  <Select
                    size="small"
                    value={String(taskEventColoring.fieldId || "")}
                    disabled={taskEventColoring.mode !== "customField"}
                    onChange={(e) => void setTaskEventColorRule({ mode: "customField", fieldId: String(e.target.value || "") })}
                    displayEmpty
                    renderValue={(v) => {
                      const id = String(v || "")
                      if (!id) return <Typography color="text.secondary">Choose Field…</Typography>
                      return taskFields.find((f) => f.id === id)?.label || id
                    }}
                  >
                    <MenuItem value="">
                      <em>Choose Field…</em>
                    </MenuItem>
                    {taskFields
                      .filter((f) => f.type === "select" || f.type === "multiselect")
                      .map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.label}
                        </MenuItem>
                      ))}
                  </Select>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Note: "By Task Custom Field" uses the first selected option for multiselect fields.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography fontWeight={800} sx={{ mb: 1 }}>
                  Internal Event Type Colors
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 180px 90px", gap: 1, alignItems: "center" }}>
                  {["meeting", "call", "demo", "site_visit", "kickoff", "review", "deadline", "internal"].map((t) => (
                    <Box key={t} sx={{ display: "contents" }}>
                      <Typography sx={{ textTransform: "capitalize" }}>{t.replace("_", " ")}</Typography>
                      <ColorSelect
                        label=""
                        value={internalTypeColor(t) || "#616161"}
                        onChange={(color) => void setInternalTypeColor(t, color)}
                      />
                      <Button size="small" variant="outlined" onClick={() => void setInternalTypeColor(t, "")}>
                        Clear
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Alert severity="info">
                Calendar-specific colors are set in the Calendars tab. These defaults control how task and internal events appear.
              </Alert>
            </Box>
          ) : null}
        </Box>
      </CRUDModal>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
              {loadingEvents ? <Alert severity="info">Loading events…</Alert> : null}

              {viewMode === "month" ? (
                <Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, mb: 1 }}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <Typography key={d} variant="caption" fontWeight={800} color="text.secondary">
                        {d}
                      </Typography>
                    ))}
                  </Box>

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                    {monthDays.map((day) => {
                      const dayEvents = eventsForDay(day).slice(0, 3)
                      return (
                        <Box
                          key={day.toISOString()}
                          onClick={() => openCreate(day)}
                          onDragOver={(e) => {
                            if (draggingEvent?.provider === "internal") e.preventDefault()
                          }}
                          onDrop={async (e) => {
                            if (draggingEvent?.provider !== "internal") return
                            e.preventDefault()
                            e.stopPropagation()
                            await moveInternalEventToDate(draggingEvent, day)
                            setDraggingEvent(null)
                          }}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 1,
                            minHeight: 92,
                            cursor: "pointer",
                            bgcolor: isToday(day) ? "action.hover" : "background.paper",
                            opacity: isSameMonth(day, currentDate) ? 1 : 0.55,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={800}>
                              {format(day, "d")}
                            </Typography>
                            <AddIcon fontSize="small" sx={{ opacity: 0.6 }} />
                          </Box>

                          {dayEvents.map((ev) => {
                            let color = colorByCalendar.get(`${ev.provider}:${ev.calendarId}`) || "#1976d2"
                            if (ev.provider === "task") {
                              const configured = taskEventColor(ev.id)
                              if (configured) color = configured
                            }
                            if (ev.provider === "internal") {
                              const configured = internalEventColor(ev.id)
                              if (configured) color = configured
                            }
                            const fg = contrastText(color)
                            return (
                              <Box
                                key={`${ev.provider}:${ev.calendarId}:${ev.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openView(ev)
                                }}
                                draggable={ev.provider === "internal" && !normalizeInternalRecurrence((internalEvents as any)?.[ev.sourceEventId || ev.id]?.recurrence)}
                                onDragStart={(e) => {
                                  if (ev.provider !== "internal") return
                                  e.stopPropagation()
                                  setDraggingEvent(ev)
                                }}
                                onDragEnd={() => setDraggingEvent(null)}
                                sx={{
                                  mb: 0.5,
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 0.75,
                                  bgcolor: color,
                                  color: fg,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: 12,
                                  cursor: ev.provider === "internal" ? "grab" : "pointer",
                                }}
                              >
                                {ev.title || "Untitled"}
                              </Box>
                            )
                          })}
                          {eventsForDay(day).length > 3 ? (
                            <Typography variant="caption" color="text.secondary">
                              +{eventsForDay(day).length - 3} more
                            </Typography>
                          ) : null}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }).map((day) => {
                    const dayEvents = eventsForDay(day)
                    return (
                      <Card key={day.toISOString()} variant="outlined">
                        <CardContent sx={{ py: 1.5 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography fontWeight={800}>{format(day, "EEE, MMM d")}</Typography>
                            <Button size="small" variant="outlined" onClick={() => openCreate(day)} startIcon={<AddIcon />}>
                              Add
                            </Button>
                          </Box>
                          {dayEvents.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              No Events
                            </Typography>
                          ) : (
                            <Box sx={{ mt: 1, display: "grid", gap: 0.75 }}>
                              {dayEvents.map((ev) => {
                                let color = colorByCalendar.get(`${ev.provider}:${ev.calendarId}`) || "#1976d2"
                                if (ev.provider === "task") {
                                  const configured = taskEventColor(ev.id)
                                  if (configured) color = configured
                                }
                                if (ev.provider === "internal") {
                                  const configured = internalEventColor(ev.id)
                                  if (configured) color = configured
                                }
                                const startD = toDate(ev.start)
                                const timeLabel =
                                  ev.allDay || isDateOnly(ev.start) ? "All Day" : startD ? format(startD, "HH:mm") : ""
                                return (
                                  <Box
                                    key={`${ev.provider}:${ev.calendarId}:${ev.id}`}
                                    onClick={() => openView(ev)}
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 2,
                                      p: 1,
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      borderLeft: `4px solid ${alpha(color, 0.9)}`,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography fontWeight={700} sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {ev.title || "Untitled"}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {timeLabel} • {ev.provider}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ width: 10, borderRadius: 999, bgcolor: color }} />
                                  </Box>
                                )
                              })}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              )}

          </Paper>
        </Grid>
      </Grid>

                        <CRUDModal
              open={modalOpen}
              onClose={(reason) => {
                setModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  setEditingEvent(null)
                  setModalMode("view")
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "fullModal2",
                crudMode: modalMode,
                id: editingEvent?.id,
                itemLabel: draft.title || editingEvent?.title || undefined,
              }}
              title={
                modalMode === "create" ? "New Event" : modalMode === "edit" ? "Edit Event" : "Event"
              }
              subtitle={editingEvent ? `${editingEvent.provider} • ${editingEvent.calendarId}` : undefined}
              icon={<EventIcon />}
              mode={modalMode}
              onEdit={modalMode === "view" ? switchToEdit : undefined}
              onSave={
                modalMode === "view"
                  ? undefined
                  : async () => {
                      const modeSnapshot = modalMode
                      const idSnapshot = editingEvent?.id
                      const labelSnapshot = (draft.title || editingEvent?.title || "").trim()
                      await saveEvent()
                      removeWorkspaceFormDraft(location.pathname, {
                        crudEntity: "fullModal2",
                        crudMode: modeSnapshot,
                        id: idSnapshot,
                        itemLabel: labelSnapshot || undefined,
                      })
                    }
              }
              saveButtonText={modalMode === "create" ? "Create" : "Save"}
              topBarActions={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {draft.provider !== "internal" ? (
              <>
                <Button size="small" variant="outlined" onClick={openProviderCompose}>
                  Open In {draft.provider === "google" ? "Google" : "Outlook"}
                </Button>
                <Button size="small" variant="outlined" onClick={openProviderWeb}>
                  Open Calendar
                </Button>
              </>
            ) : null}
            {draft.meetingUrl ? (
              <Button size="small" variant="outlined" onClick={() => window.open(draft.meetingUrl, "_blank", "noopener,noreferrer")}>
                Join Meeting
              </Button>
            ) : null}
            <Button size="small" variant="outlined" onClick={exportDraftEventIcs}>
              Export ICS
            </Button>
            {modalMode === "view" ? (
              <>
                {draft.linkedClientId ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/CRM/Client360/${encodeURIComponent(draft.linkedClientId)}`)}
                  >
                    Client 360
                  </Button>
                ) : null}
                {draft.linkedOpportunityId ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/CRM/Pipeline?opportunityId=${encodeURIComponent(draft.linkedOpportunityId)}`)}
                  >
                    Opportunity
                  </Button>
                ) : null}
                {draft.linkedProjectId ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/Tasks/Projects?projectId=${encodeURIComponent(draft.linkedProjectId)}`)}
                  >
                    Project
                  </Button>
                ) : null}
                {draft.linkedTaskId ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/Tasks/Tasks?taskId=${encodeURIComponent(draft.linkedTaskId)}`)}
                  >
                    Task
                  </Button>
                ) : null}
              </>
            ) : null}
            {modalMode === "view" && editingEvent ? (
              <>
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={switchToEdit}>
                  Edit
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={deleteEditingEvent}>
                  Delete
                </Button>
              </>
            ) : null}
          </Box>}
            >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.provider}
              disabled={modalMode === "view" || Boolean(editingEvent)}
              onChange={(e) => setDraft((p) => ({ ...p, provider: e.target.value as EventProvider, calendarId: "" }))}
            >
              <MenuItem value="google" disabled={!oauthStatus.google.connected}>
                Google
              </MenuItem>
              <MenuItem value="outlook" disabled={!oauthStatus.outlook.connected}>
                Outlook
              </MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              Provider
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.calendarId}
              disabled={modalMode === "view" || Boolean(editingEvent)}
              onChange={(e) => setDraft((p) => ({ ...p, calendarId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Choose Calendar…</Typography>
                if (draft.provider === "internal") {
                  const found = internalCalendars.find((c) => c.id === v)
                  return found?.name || v
                }
                const found = calendars[draft.provider as ProviderKey].find((c) => c.id === v)
                return found?.name || v
              }}
            >
              <MenuItem value="">
                <em>Choose Calendar…</em>
              </MenuItem>
              {draft.provider === "internal"
                ? enabledInternalIds().map((id) => {
                    const found = internalCalendars.find((c) => c.id === id)
                    return (
                      <MenuItem key={id} value={id}>
                        {found?.name || id}
                      </MenuItem>
                    )
                  })
                : enabledIds(draft.provider as ProviderKey).map((id) => {
                    const found = calendars[draft.provider as ProviderKey].find((c) => c.id === id)
                    return (
                      <MenuItem key={id} value={id}>
                        {found?.name || id}
                      </MenuItem>
                    )
                  })}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Calendar
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Title"
              fullWidth
              value={draft.title}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={4}
              value={draft.description}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Location"
              fullWidth
              value={draft.location}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.meetingType}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, meetingType: String(e.target.value || "meeting") }))}
            >
              <MenuItem value="meeting">Meeting</MenuItem>
              <MenuItem value="sales_call">Sales Call</MenuItem>
              <MenuItem value="demo">Demo</MenuItem>
              <MenuItem value="site_visit">Site Visit</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Attendees (Comma Separated Emails)"
              fullWidth
              value={draft.attendees}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, attendees: e.target.value }))}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.conferenceProvider}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, conferenceProvider: e.target.value as NonNullable<EventLink["conferenceProvider"]> }))}
            >
              <MenuItem value="">No Conference Link</MenuItem>
              <MenuItem value="google_meet">Google Meet</MenuItem>
              <MenuItem value="teams">Microsoft Teams</MenuItem>
              <MenuItem value="zoom">Zoom</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              Conferencing
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Meeting URL"
                fullWidth
                value={draft.meetingUrl}
                disabled={modalMode === "view"}
                onChange={(e) => setDraft((p) => ({ ...p, meetingUrl: e.target.value }))}
              />
              {modalMode !== "view" ? (
                <Button variant="outlined" onClick={generateConferenceLink} sx={{ whiteSpace: "nowrap" }}>
                  Generate
                </Button>
              ) : null}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Reminder (Minutes Before)"
              type="number"
              fullWidth
              value={draft.reminderMinutes}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, reminderMinutes: e.target.value }))}
              inputProps={{ min: 0, step: 5 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.responseStatus}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, responseStatus: e.target.value as NonNullable<EventLink["responseStatus"]> }))}
            >
              <MenuItem value="needs_action">Needs Action</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="tentative">Tentative</MenuItem>
              <MenuItem value="declined">Declined</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              My Response
            </Typography>
          </Grid>

          {schedulingConflicts.length > 0 ? (
            <Grid item xs={12}>
              <Alert severity="warning">
                {`This event overlaps ${schedulingConflicts.length} existing item${schedulingConflicts.length === 1 ? "" : "s"} in the current range.`}
              </Alert>
            </Grid>
          ) : null}

          {draft.provider === "internal" ? (
            <>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={draft.recurrenceEnabled}
                      disabled={modalMode === "view"}
                      onChange={(_e, checked) => setDraft((p) => ({ ...p, recurrenceEnabled: checked }))}
                    />
                  }
                  label="Repeat Event"
                />
              </Grid>
              {draft.recurrenceEnabled ? (
                <>
                  <Grid item xs={12} md={4}>
                    <Select
                      fullWidth
                      value={draft.recurrenceFreq}
                      disabled={modalMode === "view"}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, recurrenceFreq: e.target.value as InternalRecurrence["freq"] }))
                      }
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      Repeat Frequency
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Repeat Every"
                      type="number"
                      fullWidth
                      value={draft.recurrenceInterval}
                      disabled={modalMode === "view"}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          recurrenceInterval: String(Math.max(1, Number(e.target.value || 1) || 1)),
                        }))
                      }
                      inputProps={{ min: 1, step: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Repeat Until"
                      type="date"
                      fullWidth
                      value={draft.recurrenceUntil}
                      disabled={modalMode === "view"}
                      onChange={(e) => setDraft((p) => ({ ...p, recurrenceUntil: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              ) : null}
            </>
          ) : null}

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.linkedTaskId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedTaskId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link Task…</Typography>
                const found = tasks.find((t) => t.id === v)
                return found?.title || String(v)
              }}
            >
              <MenuItem value="">
                <em>No Linked Task</em>
              </MenuItem>
              {tasks.slice(0, 250).map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.title || t.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked Task (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.linkedProjectId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedProjectId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link Project…</Typography>
                const found = projects.find((t) => t.id === v)
                return found?.name || String(v)
              }}
            >
              <MenuItem value="">
                <em>No Linked Project</em>
              </MenuItem>
              {projects.slice(0, 250).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name || p.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked Project (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.linkedContactId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedContactId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link Contact…</Typography>
                const found = contacts.find((c) => c.id === v)
                return found?.name || String(v)
              }}
            >
              <MenuItem value="">
                <em>No Linked Contact</em>
              </MenuItem>
              {contacts.slice(0, 250).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked Contact (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.linkedClientId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedClientId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link Client…</Typography>
                const found = clients.find((c) => c.id === v)
                return found?.name || String(v)
              }}
            >
              <MenuItem value="">
                <em>No Linked Client</em>
              </MenuItem>
              {clients.slice(0, 250).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked Client (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.linkedOpportunityId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedOpportunityId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link Opportunity…</Typography>
                const found = opportunities.find((o) => o.id === v)
                return found?.title || String(v)
              }}
            >
              <MenuItem value="">
                <em>No Linked Opportunity</em>
              </MenuItem>
              {opportunities.slice(0, 250).map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.title || o.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked Opportunity (Optional)
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.allDay}
                  disabled={modalMode === "view"}
                  onChange={(_e, checked) => setDraft((p) => ({ ...p, allDay: checked }))}
                />
              }
              label="All Day"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={draft.startDate}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={draft.endDate}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {!draft.allDay ? (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  fullWidth
                  value={draft.startTime}
                  disabled={modalMode === "view"}
                  onChange={(e) => setDraft((p) => ({ ...p, startTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="End Time"
                  type="time"
                  fullWidth
                  value={draft.endTime}
                  disabled={modalMode === "view"}
                  onChange={(e) => setDraft((p) => ({ ...p, endTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          ) : null}
        </Grid>
      </CRUDModal>
    </Box>
    </AdminPageShell>
  )
}
