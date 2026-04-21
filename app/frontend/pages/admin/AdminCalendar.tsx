import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { useLocation } from "react-router-dom"
import { APP_KEYS, getFunctionsBaseUrl } from "../../../config/keys"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, get, onValue, push, ref, set } from "../../../backend/services/Firebase"

type ProviderKey = "google" | "outlook"

type AdminTask = {
  id: string
  title: string
  description?: string
  dueDate?: string // yyyy-mm-dd
  status?: string
  priority?: string
  updatedAt?: number
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map((x) => Number(x))
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

export default function AdminCalendar() {
  const location = useLocation()
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

  const [tab, setTab] = useState<ProviderKey>("google")
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [taskLinks, setTaskLinks] = useState<Record<string, any>>({})
  const [settings, setSettings] = useState<Record<string, any>>({})

  const [oauthStatus, setOauthStatus] = useState<
    Record<ProviderKey, { connected: boolean; email?: string; error?: string }>
  >({
    google: { connected: false },
    outlook: { connected: false },
  })

  const [calendars, setCalendars] = useState<Record<ProviderKey, Array<{ id: string; name: string; primary?: boolean }>>>({
    google: [],
    outlook: [],
  })
  const [events, setEvents] = useState<Record<ProviderKey, Array<any>>>({ google: [], outlook: [] })
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const selectedCalendarId = (settings?.[tab]?.selectedCalendarId as string) || ""

  // Load tasks
  useEffect(() => {
    const tRef = ref(db, "admin/tasks")
    const unsub = onValue(tRef, (snap) => {
      const v = snap.val() || {}
      const rows: AdminTask[] = Object.entries(v).map(([id, raw]: any) => ({
        id,
        title: raw?.title || "",
        description: raw?.description || "",
        dueDate: raw?.dueDate || "",
        status: raw?.status || "",
        priority: raw?.priority || "",
        updatedAt: raw?.updatedAt || 0,
      }))
      rows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      setTasks(rows)
    })
    return () => unsub()
  }, [])

  // Load mapping links (taskId -> provider -> {calendarId,eventId})
  useEffect(() => {
    const linkRef = ref(db, "admin/calendar/taskLinks")
    const unsub = onValue(linkRef, (snap) => setTaskLinks(snap.val() || {}))
    return () => unsub()
  }, [])

  // Load per-user calendar settings (selected calendars)
  useEffect(() => {
    if (!uid) return
    const sRef = ref(db, `admin/calendar/settings/${uid}`)
    const unsub = onValue(sRef, (snap) => setSettings(snap.val() || {}))
    return () => unsub()
  }, [uid])

  // Show oauth success/error params
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
    const url = new URL(`${fnBase}/listCalendars`)
    url.searchParams.set("company_id", "admin")
    url.searchParams.set("provider", provider)
    const resp = await fetch(url.toString())
    const data = await resp.json()
    if (!data?.success) throw new Error(data?.error || "Failed to load calendars")
    setCalendars((p) => ({ ...p, [provider]: data.calendars || [] }))
  }

  const loadEvents = async (provider: ProviderKey) => {
    const calId = (settings?.[provider]?.selectedCalendarId as string) || ""
    if (!calId) {
      setEvents((p) => ({ ...p, [provider]: [] }))
      return
    }
    const url = new URL(`${fnBase}/listEvents`)
    url.searchParams.set("company_id", "admin")
    url.searchParams.set("provider", provider)
    url.searchParams.set("calendar_id", calId)
    const resp = await fetch(url.toString())
    const data = await resp.json()
    if (!data?.success) throw new Error(data?.error || "Failed to load events")
    setEvents((p) => ({ ...p, [provider]: data.events || [] }))
  }

  useEffect(() => {
    // whenever tab changes, try to load calendars/events (best effort)
    const run = async () => {
      try {
        await loadCalendars(tab)
        await loadEvents(tab)
      } catch {
        // ignore (likely not connected yet)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const setSelectedCalendar = async (provider: ProviderKey, calendarId: string) => {
    if (!uid) return
    await set(ref(db, `admin/calendar/settings/${uid}/${provider}`), { selectedCalendarId: calendarId, updatedAt: Date.now() })
    await loadEvents(provider)
  }

  const syncTaskToProvider = async (provider: ProviderKey, task: AdminTask) => {
    const calId = (settings?.[provider]?.selectedCalendarId as string) || ""
    if (!calId) {
      throw new Error(`Select a ${provider} calendar first`)
    }
    if (!task.dueDate) {
      throw new Error("Task has no due date (set dueDate to sync)")
    }

    const link = taskLinks?.[task.id]?.[provider] || {}
    const existingEventId = link?.eventId || ""

    // Baseline: treat dueDate as all-day event.
    if (provider === "google") {
      const body = {
        companyId: "admin",
        provider: "google",
        calendarId: calId,
        eventId: existingEventId,
        title: task.title,
        description: task.description || "",
        start: task.dueDate,
        end: addDays(task.dueDate, 1),
        allDay: true,
      }
      const resp = await fetch(`${fnBase}/upsertEvent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!data?.success) throw new Error(data?.error || "Failed to sync task")
      const eventId = data.eventId as string
      await set(ref(db, `admin/calendar/taskLinks/${task.id}/${provider}`), { calendarId: calId, eventId, updatedAt: Date.now() })
      return
    }

    const startIso = new Date(`${task.dueDate}T09:00:00Z`).toISOString()
    const endIso = new Date(`${task.dueDate}T10:00:00Z`).toISOString()

    const body = {
      companyId: "admin",
      provider: "outlook",
      calendarId: calId,
      eventId: existingEventId,
      title: task.title,
      description: task.description || "",
      start: startIso,
      end: endIso,
      allDay: false,
    }
    const resp = await fetch(`${fnBase}/upsertEvent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!data?.success) throw new Error(data?.error || "Failed to sync task")
    const eventId = data.eventId as string
    await set(ref(db, `admin/calendar/taskLinks/${task.id}/${provider}`), { calendarId: calId, eventId, updatedAt: Date.now() })
  }

  const importEventAsTask = async (provider: ProviderKey, ev: any) => {
    const now = Date.now()
    const title = String(ev?.title || "(no title)").trim()
    const start = String(ev?.start || "").trim()
    const dueDate = start.includes("T") ? start.slice(0, 10) : start.slice(0, 10)
    const tasksRef = ref(db, "admin/tasks")
    const newRef = push(tasksRef)
    await set(newRef, {
      title,
      description: String(ev?.description || ""),
      status: "todo",
      priority: "medium",
      dueDate,
      createdAt: now,
      updatedAt: now,
      source: { type: "calendarImport", provider },
    })
  }

  const dueTasks = useMemo(() => tasks.filter((t) => Boolean(t.dueDate)), [tasks])

  const currentCalendars = calendars[tab] || []
  const currentEvents = events[tab] || []

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Calendar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Baseline two-way sync: link tasks ↔ events (Google/Outlook) with selectable calendars.
      </Typography>

      {banner ? <Alert severity={banner.type} sx={{ mb: 2 }}>{banner.text}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Google Calendar</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {oauthStatus.google.connected ? `Connected ${oauthStatus.google.email ? `(${oauthStatus.google.email})` : ""}` : "Not connected"}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="contained" onClick={() => beginOAuth("google")} disabled={busy.oauth_google}>
                  Connect
                </Button>
                <Button variant="outlined" onClick={() => disconnect("google")} disabled={!oauthStatus.google.connected}>
                  Disconnect
                </Button>
                <Button variant="text" onClick={refreshOAuthStatus}>
                  Refresh status
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Outlook Calendar</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {oauthStatus.outlook.connected ? `Connected ${oauthStatus.outlook.email ? `(${oauthStatus.outlook.email})` : ""}` : "Not connected"}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="contained" onClick={() => beginOAuth("outlook")} disabled={busy.oauth_outlook}>
                  Connect
                </Button>
                <Button variant="outlined" onClick={() => disconnect("outlook")} disabled={!oauthStatus.outlook.connected}>
                  Disconnect
                </Button>
                <Button variant="text" onClick={refreshOAuthStatus}>
                  Refresh status
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="google" label="Google" />
        <Tab value="outlook" label="Outlook" />
      </Tabs>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Calendar selection</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pick which {tab} calendar to use for task sync.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    setBusy((p) => ({ ...p, [`cal_${tab}`]: true }))
                    try {
                      await loadCalendars(tab)
                    } finally {
                      setBusy((p) => ({ ...p, [`cal_${tab}`]: false }))
                    }
                  }}
                >
                  Refresh calendars
                </Button>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    setBusy((p) => ({ ...p, [`evt_${tab}`]: true }))
                    try {
                      await loadEvents(tab)
                    } finally {
                      setBusy((p) => ({ ...p, [`evt_${tab}`]: false }))
                    }
                  }}
                >
                  Refresh events
                </Button>
              </Box>

              <Select
                fullWidth
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendar(tab, String(e.target.value || ""))}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select a calendar…</em>
                </MenuItem>
                {currentCalendars.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.primary ? "(primary)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming events</Typography>
              <Typography variant="body2" color="text.secondary">
                Next 30 days from the selected calendar.
              </Typography>
              <Divider sx={{ my: 2 }} />
              {selectedCalendarId ? null : <Alert severity="info">Select a calendar to view events.</Alert>}
              {selectedCalendarId && currentEvents.length === 0 ? (
                <Typography color="text.secondary">No events found.</Typography>
              ) : null}
              {selectedCalendarId
                ? currentEvents.slice(0, 50).map((ev) => (
                    <Box key={ev.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1 }}>
                      <Box>
                        <Typography fontWeight={700}>{ev.title || "(no title)"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ev.start} → {ev.end}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" onClick={() => importEventAsTask(tab, ev)}>
                        Import as task
                      </Button>
                    </Box>
                  ))
                : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Tasks with due dates</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sync a task to the selected {tab} calendar. (Mapping stored in `admin/calendar/taskLinks/*`)
              </Typography>
              {dueTasks.length === 0 ? <Typography color="text.secondary">No tasks with due dates yet.</Typography> : null}
              {dueTasks.slice(0, 50).map((t) => {
                const link = taskLinks?.[t.id]?.[tab] || {}
                const linked = Boolean(link?.eventId && link?.calendarId)
                return (
                  <Box key={t.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1 }}>
                    <Box>
                      <Typography fontWeight={700}>{t.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due: {t.dueDate || "—"} {linked ? ` • Linked (${String(link.eventId).slice(0, 8)}…)` : ""}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={async () => {
                        const k = `sync_${tab}_${t.id}`
                        setBusy((p) => ({ ...p, [k]: true }))
                        try {
                          await syncTaskToProvider(tab, t)
                          await loadEvents(tab)
                        } finally {
                          setBusy((p) => ({ ...p, [k]: false }))
                        }
                      }}
                      disabled={!selectedCalendarId}
                    >
                      Sync to {tab}
                    </Button>
                  </Box>
                )
              })}
              {dueTasks.length > 50 ? (
                <Typography variant="caption" color="text.secondary">
                  Showing first 50 of {dueTasks.length}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

