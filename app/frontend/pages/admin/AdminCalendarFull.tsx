import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Event as EventIcon } from "@mui/icons-material"
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
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, onValue, ref, remove, set, update } from "../../../backend/services/Firebase"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import { themeConfig } from "../../../theme/AppTheme"

type ProviderKey = "google" | "outlook"
type ViewMode = "month" | "week" | "day"
type CalendarCategory = "personal" | "company"
type CalendarEventProvider = ProviderKey | "task"

type CalendarMeta = { id: string; name: string; primary?: boolean }

type CalendarEvent = {
  provider: CalendarEventProvider
  calendarId: string
  id: string
  title: string
  description?: string
  start: string // ISO or yyyy-mm-dd
  end: string // ISO or yyyy-mm-dd
  allDay?: boolean
}

type ProviderSettings = {
  enabledCalendarIds?: string[]
  defaultCalendarId?: string
  calendarCategories?: Record<string, CalendarCategory>
  updatedAt?: number
}

type UserCalendarSettings = Partial<Record<ProviderKey, ProviderSettings>>

type AdminTaskLite = {
  id: string
  title: string
  dueDate?: string
  status?: string
  projectId?: string
}

type AdminProjectLite = { id: string; name: string }

type EventLink = { taskId?: string; projectId?: string; updatedAt?: number }

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

export default function AdminCalendarFull() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state: settingsState } = useSettings()
  const uid = settingsState.auth?.uid || ""

  const fnBase = useMemo(
    () =>
      getFunctionsBaseUrl({
        projectId: APP_KEYS.firebase.projectId,
        region: APP_KEYS.firebase.functionsRegion,
      }),
    [],
  )

  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const [settings, setSettingsState] = useState<UserCalendarSettings>({})
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

  const [providerFilter, setProviderFilter] = useState<ProviderKey[]>(["google", "outlook"])
  const [categoryFilter, setCategoryFilter] = useState<CalendarCategory[]>(["personal", "company"])
  const [showTasks, setShowTasks] = useState(true)

  const [tasks, setTasks] = useState<AdminTaskLite[]>([])
  const [projects, setProjects] = useState<AdminProjectLite[]>([])
  const [eventLinks, setEventLinks] = useState<Record<string, Record<string, EventLink>>>({})

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("view")
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    allDay: true,
    startDate: toDateKey(new Date()),
    startTime: "09:00",
    endDate: toDateKey(new Date()),
    endTime: "10:00",
    provider: "google" as ProviderKey,
    calendarId: "",
    linkedTaskId: "",
    linkedProjectId: "",
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
    const tasksRef = ref(db, `admin/tasks`)
    const unsub = onValue(tasksRef, (snap) => {
      const val = snap.val() || {}
      const rows: AdminTaskLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id,
        title: raw?.title || "",
        dueDate: raw?.dueDate || "",
        status: raw?.status || "",
        projectId: raw?.projectId || "",
      }))
      rows.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")))
      setTasks(rows)
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
    if (!uid) return
    const linkRef = ref(db, `admin/calendar/eventLinks/${uid}`)
    const unsub = onValue(linkRef, (snap) => setEventLinks(snap.val() || {}))
    return () => unsub()
  }, [uid])

  const enabledIds = (provider: ProviderKey) =>
    Array.isArray(settings?.[provider]?.enabledCalendarIds) ? (settings[provider]!.enabledCalendarIds as string[]) : []

  const defaultCalendarId = (provider: ProviderKey) => String(settings?.[provider]?.defaultCalendarId || "")

  const categoryByCalendar = (provider: ProviderKey, calendarId: string): CalendarCategory => {
    const cats = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    return (cats?.[calendarId] as CalendarCategory) || "personal"
  }

  const refreshOAuthStatus = async () => {
    const checkOne = async (tokenDocId: string) => {
      const url = new URL(`${fnBase}/checkOAuthStatus`)
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
    url.searchParams.set("return_path", "/Admin/Calendar")
    window.location.href = url.toString()
  }

  const disconnect = async (provider: ProviderKey) => {
    const url = new URL(`${fnBase}/disconnectOAuth`)
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
      const url = new URL(`${fnBase}/listCalendars`)
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

  const toggleCalendar = async (provider: ProviderKey, calendarId: string, enabled: boolean) => {
    const current = new Set(enabledIds(provider))
    if (enabled) current.add(calendarId)
    else current.delete(calendarId)

    const enabledCalendarIds = Array.from(current)
    const currentDefault = defaultCalendarId(provider)
    const nextDefault =
      currentDefault && enabledCalendarIds.includes(currentDefault)
        ? currentDefault
        : enabledCalendarIds[0] || ""

    const calendarCategories = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    await saveProviderSettings(provider, { enabledCalendarIds, defaultCalendarId: nextDefault, calendarCategories })
  }

  const setDefaultCalendar = async (provider: ProviderKey, calendarId: string) => {
    const calendarCategories = (settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>
    await saveProviderSettings(provider, { enabledCalendarIds: enabledIds(provider), defaultCalendarId: calendarId, calendarCategories })
  }

  const setCalendarCategory = async (provider: ProviderKey, calendarId: string, category: CalendarCategory) => {
    const enabledCalendarIds = enabledIds(provider)
    const defaultId = defaultCalendarId(provider)
    const current = ((settings?.[provider]?.calendarCategories || {}) as Record<string, CalendarCategory>) || {}
    const nextCats = { ...current, [calendarId]: category }
    await saveProviderSettings(provider, { enabledCalendarIds, defaultCalendarId: defaultId, calendarCategories: nextCats })
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

  const loadEventsForRange = async () => {
    const sources: Array<{ provider: ProviderKey; calendarId: string }> = []
    ;(["google", "outlook"] as ProviderKey[]).forEach((p) => {
      if (!oauthStatus[p].connected) return
      if (providerFilter.length > 0 && !providerFilter.includes(p)) return
      enabledIds(p).forEach((calendarId) => {
        const cat = categoryByCalendar(p, calendarId)
        if (categoryFilter.length > 0 && !categoryFilter.includes(cat)) return
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
          const url = new URL(`${fnBase}/listEvents`)
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
    providerFilter.join(","),
    categoryFilter.join(","),
    visibleRange.start.getTime(),
    visibleRange.end.getTime(),
  ])

  const colorByCalendar = useMemo(() => {
    const palette = [
      themeConfig.brandColors.navy,
      themeConfig.colors.success.main,
      themeConfig.colors.warning.main,
      themeConfig.brandColors.navy,
      themeConfig.colors.error.main,
      themeConfig.colors.info.main,
      themeConfig.brandColors.navy,
    ]
    const keys = Array.from(new Set(events.map((e) => `${e.provider}:${e.calendarId}`))).sort()
    const map = new Map<string, string>()
    keys.forEach((k, i) => map.set(k, palette[i % palette.length]))
    map.set("task:tasks", themeConfig.brandColors.navy)
    return map
  }, [events])

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
    return [...events, ...taskEvents]
  }, [events, taskEvents])

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
    const provider: ProviderKey = oauthStatus.google.connected ? "google" : "outlook"
    const calendarId =
      defaultCalendarId(provider) ||
      enabledIds(provider)[0] ||
      calendars[provider].find((c) => c.primary)?.id ||
      calendars[provider][0]?.id ||
      ""

    setEditingEvent(null)
    setModalMode("create")
    setDraft({
      title: "",
      description: "",
      allDay: viewMode !== "day",
      startDate: dateKey,
      startTime: "09:00",
      endDate: viewMode !== "day" ? addDaysKey(dateKey, 1) : dateKey,
      endTime: "10:00",
      provider,
      calendarId,
      linkedTaskId: "",
      linkedProjectId: "",
    })
    setModalOpen(true)
  }

  const openView = (ev: CalendarEvent) => {
    if (ev.provider === "task") {
      navigate(`/Admin/Tasks?tab=tasks&taskId=${encodeURIComponent(ev.id)}`)
      return
    }
    setEditingEvent(ev)
    setModalMode("view")
    const startD = toDate(ev.start) || new Date()
    const endD = toDate(ev.end) || startD
    const link = ((eventLinks as any)?.[ev.provider]?.[ev.id] || {}) as EventLink
    setDraft({
      title: ev.title || "",
      description: ev.description || "",
      allDay: Boolean(ev.allDay || isDateOnly(ev.start)),
      startDate: toDateKey(startD),
      startTime: format(startD, "HH:mm"),
      endDate: toDateKey(endD),
      endTime: format(endD, "HH:mm"),
      provider: ev.provider,
      calendarId: ev.calendarId,
      linkedTaskId: String(link.taskId || ""),
      linkedProjectId: String(link.projectId || ""),
    })
    setModalOpen(true)
  }

  const switchToEdit = () => setModalMode("edit")

  const saveEvent = async () => {
    if (!draft.title.trim()) return
    if (!draft.calendarId) return

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    const allDay = Boolean(draft.allDay)

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

    const resp = await fetch(`${fnBase}/upsertEvent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: "admin",
        provider: draft.provider,
        calendarId: draft.calendarId,
        eventId: editingEvent?.id || "",
        title: draft.title.trim(),
        description: draft.description || "",
        start,
        end,
        allDay,
        timeZone: tz,
      }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!data?.success) throw new Error(data?.error || "Failed to save event")

    // Store local links (task/project) for UI integration
    try {
      const eventId = String(data?.eventId || editingEvent?.id || "").trim()
      if (uid && eventId) {
        const linkRef = ref(db, `admin/calendar/eventLinks/${uid}/${draft.provider}/${eventId}`)
        if (draft.linkedTaskId || draft.linkedProjectId) {
          await set(linkRef, {
            taskId: draft.linkedTaskId || "",
            projectId: draft.linkedProjectId || "",
            updatedAt: Date.now(),
          })
        } else {
          await remove(linkRef)
        }
      }
    } catch {
      // ignore (link storage is optional)
    }

    setModalOpen(false)
    await loadEventsForRange()
  }

  const deleteEditingEvent = async () => {
    if (!editingEvent) return
    const resp = await fetch(`${fnBase}/deleteEvent`, {
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
    setModalOpen(false)
    await loadEventsForRange()
  }

  const monthDays = useMemo(() => {
    if (viewMode !== "month") return []
    return eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end })
  }, [visibleRange.end, visibleRange.start, viewMode])

  const dateType = viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month"

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        currentDate={currentDate}
        onDateChange={(d) => setCurrentDate(d)}
        dateType={dateType}
        onDateTypeChange={(t) => setViewMode(t === "day" ? "day" : t === "week" ? "week" : "month")}
        showDateControls
        showDateTypeSelector
        availableDateTypes={["day", "week", "month"]}
        onCreateNew={() => openCreate(currentDate)}
        createButtonLabel="New event"
        additionalControls={
          <Typography variant="caption" sx={{ color: "primary.contrastText" }}>
            Google {oauthStatus.google.connected ? "✓" : "—"} • Outlook {oauthStatus.outlook.connected ? "✓" : "—"}
          </Typography>
        }
      />

      {banner ? (
        <Alert severity={banner.type} sx={{ mt: 2 }}>
          {banner.text}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Calendars
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={providerFilter.includes("google")}
                      onChange={(_e, checked) =>
                        setProviderFilter((p) => (checked ? Array.from(new Set([...p, "google"])) : p.filter((x) => x !== "google")))
                      }
                    />
                  }
                  label={<Typography variant="body2">Google</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={providerFilter.includes("outlook")}
                      onChange={(_e, checked) =>
                        setProviderFilter((p) => (checked ? Array.from(new Set([...p, "outlook"])) : p.filter((x) => x !== "outlook")))
                      }
                    />
                  }
                  label={<Typography variant="body2">Outlook</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={categoryFilter.includes("personal")}
                      onChange={(_e, checked) =>
                        setCategoryFilter((p) => (checked ? Array.from(new Set([...p, "personal"])) : p.filter((x) => x !== "personal")))
                      }
                    />
                  }
                  label={<Typography variant="body2">Personal</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={categoryFilter.includes("company")}
                      onChange={(_e, checked) =>
                        setCategoryFilter((p) => (checked ? Array.from(new Set([...p, "company"])) : p.filter((x) => x !== "company")))
                      }
                    />
                  }
                  label={<Typography variant="body2">Company</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={showTasks} onChange={(_e, checked) => setShowTasks(checked)} />}
                  label={<Typography variant="body2">Tasks</Typography>}
                />
              </Box>

              {(["google", "outlook"] as ProviderKey[]).map((provider) => {
                const connected = oauthStatus[provider].connected
                const list = calendars[provider] || []
                const enabled = new Set(enabledIds(provider))
                const defaultId = defaultCalendarId(provider)

                return (
                  <Box key={provider} sx={{ mb: 2 }}>
                    <Typography fontWeight={700}>{provider === "google" ? "Google" : "Outlook"}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {connected
                        ? `Connected${oauthStatus[provider].email ? ` (${oauthStatus[provider].email})` : ""}`
                        : "Not connected"}
                    </Typography>

                    {oauthStatus[provider].error ? <Alert severity="error">{oauthStatus[provider].error}</Alert> : null}

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                      {!connected ? (
                        <Button variant="contained" onClick={() => beginOAuth(provider)} disabled={!uid}>
                          Connect
                        </Button>
                      ) : (
                        <Button variant="outlined" onClick={() => disconnect(provider)}>
                          Disconnect
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        onClick={() => loadCalendars(provider)}
                        disabled={!connected || Boolean(loadingCalendars[provider])}
                      >
                        Load
                      </Button>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {list.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No calendars loaded.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 0.25 }}>
                        {list.slice(0, 20).map((c) => (
                          <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={enabled.has(c.id)}
                                  onChange={(_e, checked) => toggleCalendar(provider, c.id, checked)}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {c.name} {c.primary ? "(primary)" : ""}
                                </Typography>
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            />
                            <Select
                              size="small"
                              value={categoryByCalendar(provider, c.id)}
                              onChange={(e) => setCalendarCategory(provider, c.id, e.target.value as CalendarCategory)}
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value="personal">Personal</MenuItem>
                              <MenuItem value="company">Company</MenuItem>
                            </Select>
                          </Box>
                        ))}
                        {list.length > 20 ? (
                          <Typography variant="caption" color="text.secondary">
                            Showing first 20 calendars
                          </Typography>
                        ) : null}

                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Default calendar (new events)
                          </Typography>
                          <Select
                            fullWidth
                            value={defaultId}
                            onChange={(e) => setDefaultCalendar(provider, String(e.target.value || ""))}
                            disabled={enabled.size === 0}
                            displayEmpty
                            renderValue={(v) => {
                              if (!v) return <Typography color="text.secondary">Pick default…</Typography>
                              const found = list.find((x) => x.id === v)
                              return found?.name || v
                            }}
                          >
                            <MenuItem value="">
                              <em>Pick default…</em>
                            </MenuItem>
                            {Array.from(enabled).map((id) => {
                              const found = list.find((x) => x.id === id)
                              return (
                                <MenuItem key={id} value={id}>
                                  {found?.name || id}
                                </MenuItem>
                              )
                            })}
                          </Select>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              })}

              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Enable multiple calendars to view them together. Creating/editing writes directly to the provider calendar (2‑way sync).
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
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
                            const color = colorByCalendar.get(`${ev.provider}:${ev.calendarId}`) || themeConfig.brandColors.navy
                            return (
                              <Box
                                key={`${ev.provider}:${ev.calendarId}:${ev.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openView(ev)
                                }}
                                sx={{
                                  mb: 0.5,
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 0.75,
                                  bgcolor: color,
                                  color: themeConfig.brandColors.offWhite,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: 12,
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
                              No events
                            </Typography>
                          ) : (
                            <Box sx={{ mt: 1, display: "grid", gap: 0.75 }}>
                              {dayEvents.map((ev) => {
                                const color = colorByCalendar.get(`${ev.provider}:${ev.calendarId}`) || themeConfig.brandColors.navy
                                const startD = toDate(ev.start)
                                const timeLabel =
                                  ev.allDay || isDateOnly(ev.start) ? "All day" : startD ? format(startD, "HH:mm") : ""
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

              {events.length === 0 && !loadingEvents ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Enable at least one connected calendar to display events.
                </Alert>
              ) : null}
            </CardContent>
          </Card>
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
                crudEntity: "adminCalendarFullModal1",
                crudMode: modalMode,
                id: editingEvent?.id,
                itemLabel: draft.title || editingEvent?.title || undefined,
              }}
              title={
                modalMode === "create" ? "New event" : modalMode === "edit" ? "Edit event" : "Event"
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
                        crudEntity: "adminCalendarFullModal1",
                        crudMode: modeSnapshot,
                        id: idSnapshot,
                        itemLabel: labelSnapshot || undefined,
                      })
                    }
              }
              saveButtonText={modalMode === "create" ? "Create" : "Save"}
              topBarActions={modalMode === "view" && editingEvent ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={switchToEdit}>
                Edit
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={deleteEditingEvent}>
                Delete
              </Button>
            </Box>
          ) : null}
            >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Select
              fullWidth
              value={draft.provider}
              disabled={modalMode === "view" || Boolean(editingEvent)}
              onChange={(e) => setDraft((p) => ({ ...p, provider: e.target.value as ProviderKey, calendarId: "" }))}
            >
              <MenuItem value="google" disabled={!oauthStatus.google.connected}>
                Google
              </MenuItem>
              <MenuItem value="outlook" disabled={!oauthStatus.outlook.connected}>
                Outlook
              </MenuItem>
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
                if (!v) return <Typography color="text.secondary">Choose calendar…</Typography>
                const found = calendars[draft.provider].find((c) => c.id === v)
                return found?.name || v
              }}
            >
              <MenuItem value="">
                <em>Choose calendar…</em>
              </MenuItem>
              {enabledIds(draft.provider).map((id) => {
                const found = calendars[draft.provider].find((c) => c.id === id)
                return (
                  <MenuItem key={id} value={id}>
                    {found?.name || id}
                  </MenuItem>
                )
              })}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Calendar (enabled)
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
            <Select
              fullWidth
              value={draft.linkedTaskId}
              disabled={modalMode === "view"}
              onChange={(e) => setDraft((p) => ({ ...p, linkedTaskId: String(e.target.value || "") }))}
              displayEmpty
              renderValue={(v) => {
                if (!v) return <Typography color="text.secondary">Link task…</Typography>
                const found = tasks.find((t) => t.id === v)
                return found?.title || String(v)
              }}
            >
              <MenuItem value="">
                <em>No linked task</em>
              </MenuItem>
              {tasks.slice(0, 250).map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.title || t.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked task (optional)
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
                if (!v) return <Typography color="text.secondary">Link project…</Typography>
                const found = projects.find((t) => t.id === v)
                return found?.name || String(v)
              }}
            >
              <MenuItem value="">
                <em>No linked project</em>
              </MenuItem>
              {projects.slice(0, 250).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name || p.id}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary">
              Linked project (optional)
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
              label="All-day"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Start date"
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
              label="End date"
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
                  label="Start time"
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
                  label="End time"
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
  )
}

