import { useEffect, useMemo, useState } from "react"
import { alpha } from "@mui/material/styles"
import { Box, Button, Chip, Divider, Paper, Select, MenuItem, Typography } from "@mui/material"
import { useLocation, useNavigate } from "react-router-dom"
import { themeConfig } from "../../../app/backend/context/AppTheme"
import { db, onValue, ref } from "../../backend/services/Firebase"
import ActivityComposer from "../shared/ActivityComposer"
import ActivityTimeline from "../shared/ActivityTimeline"

type ClientLite = { id: string; name: string; status?: string; email?: string; phone?: string; updatedAt?: number }
type ContactLite = { id: string; name: string; clientId?: string; status?: string }
type OpportunityLite = {
  id: string
  title: string
  clientId?: string
  stageId?: string
  status?: string
  ownerUserId?: string
  convertedProjectId?: string
  convertedKickoffEventId?: string
  convertedTaskIds?: string[]
  updatedAt?: number
}
type ProjectLite = { id: string; name: string; clientId?: string; status?: string; dueDate?: string; ownerUserId?: string; updatedAt?: number }
type TaskLite = {
  id: string
  title: string
  clientId?: string
  projectId?: string
  status?: string
  dueDate?: string
  assigneeUserIds?: string[]
  updatedAt?: number
}
type InternalEventLite = { id: string; title: string; clientId?: string; startAt?: number; endAt?: number; allDay?: boolean }
type ProviderLinkedEventLite = {
  provider: "google" | "outlook"
  eventId: string
  title?: string
  start?: string
  end?: string
  allDay?: boolean
  location?: string
  meetingType?: string
  updatedAt?: number
}
type StaffLite = { uid: string; email?: string; displayName?: string }

export default function Client360() {
  const location = useLocation()
  const navigate = useNavigate()

  const [clients, setClients] = useState<ClientLite[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [opps, setOpps] = useState<OpportunityLite[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [internalEvents, setInternalEvents] = useState<InternalEventLite[]>([])
  const [providerLinkedEvents, setProviderLinkedEvents] = useState<ProviderLinkedEventLite[]>([])
  const [staff, setStaff] = useState<StaffLite[]>([])

  const clientId = useMemo(() => {
    const path = (location.pathname || "").replace(/\/+$/, "")
    const parts = path.split("/").filter(Boolean)
    const idx = parts.findIndex((p) => p.toLowerCase() === "client360")
    const fromPath = idx !== -1 ? String(parts[idx + 1] || "").trim() : ""
    if (fromPath) return fromPath
    const params = new URLSearchParams(location.search || "")
    return String(params.get("clientId") || "").trim()
  }, [location.pathname, location.search])

  useEffect(() => {
    const cRef = ref(db, "admin/crm/clients")
    const unsub = onValue(cRef, (snap) => {
      const val = snap.val() || {}
      const rows: ClientLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || raw?.companyName || "Client",
        status: raw?.status || "",
        email: raw?.email || "",
        phone: raw?.phone || "",
        updatedAt: raw?.updatedAt || 0,
      }))
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setClients(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const sRef = ref(db, "admin/staff")
    const unsub = onValue(sRef, (snap) => {
      const val = snap.val() || {}
      const rows: StaffLite[] = Object.entries(val).map(([uid, raw]: any) => ({
        uid: String(uid),
        email: raw?.email || "",
        displayName: raw?.displayName || raw?.name || "",
      }))
      rows.sort((a, b) => String(a.displayName || a.email || a.uid).localeCompare(String(b.displayName || b.email || b.uid)))
      setStaff(rows)
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
        clientId: raw?.clientId || raw?.companyId || "",
        status: raw?.status || "",
      }))
      setContacts(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const oRef = ref(db, "admin/crm/opportunities")
    const unsub = onValue(oRef, (snap) => {
      const val = snap.val() || {}
      const rows: OpportunityLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        title: raw?.title || "Opportunity",
        clientId: raw?.clientId || "",
        stageId: raw?.stageId || "",
        status: raw?.status || "",
        ownerUserId: raw?.ownerUserId || "",
        convertedProjectId: raw?.convertedProjectId || "",
        convertedKickoffEventId: raw?.convertedKickoffEventId || "",
        convertedTaskIds: Array.isArray(raw?.convertedTaskIds) ? raw.convertedTaskIds : undefined,
        updatedAt: raw?.updatedAt || 0,
      }))
      setOpps(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const pRef = ref(db, "admin/projects")
    const unsub = onValue(pRef, (snap) => {
      const val = snap.val() || {}
      const rows: ProjectLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        name: raw?.name || "Project",
        clientId: raw?.clientId || "",
        status: raw?.status || "",
        dueDate: raw?.dueDate || "",
        ownerUserId: raw?.ownerUserId || "",
        updatedAt: raw?.updatedAt || 0,
      }))
      setProjects(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const tRef = ref(db, "admin/tasks")
    const unsub = onValue(tRef, (snap) => {
      const val = snap.val() || {}
      const rows: TaskLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(id),
        title: raw?.title || "Task",
        clientId: raw?.clientId || "",
        projectId: raw?.projectId || "",
        status: raw?.status || "",
        dueDate: raw?.dueDate || "",
        assigneeUserIds: Array.isArray(raw?.assigneeUserIds) ? raw.assigneeUserIds : [],
        updatedAt: raw?.updatedAt || 0,
      }))
      setTasks(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const eRef = ref(db, "admin/calendar/events")
    const unsub = onValue(eRef, (snap) => {
      const val = snap.val() || {}
      const rows: InternalEventLite[] = Object.entries(val).map(([id, raw]: any) => ({
        id: String(raw?.id || id),
        title: raw?.title || "Event",
        clientId: raw?.clientId || "",
        startAt: raw?.startAt || 0,
        endAt: raw?.endAt || 0,
        allDay: Boolean(raw?.allDay),
      }))
      setInternalEvents(rows)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!clientId) {
      setProviderLinkedEvents([])
      return
    }
    const linksRef = ref(db, `admin/calendar/links/client/${clientId}`)
    const unsub = onValue(linksRef, (snap) => {
      const val = snap.val() || {}
      const rows: ProviderLinkedEventLite[] = Object.entries(val)
        .filter(([provider]) => provider === "google" || provider === "outlook")
        .flatMap(([provider, raw]: any) => {
          const providerKey = provider as "google" | "outlook"
          const container = raw && typeof raw === "object" ? raw : {}
          const looksLikeSingleLink = typeof container?.eventId === "string" && container.eventId
          const entries = looksLikeSingleLink ? [[String(container.eventId), container]] : Object.entries(container)
          return entries.map(([, link]: any) => ({
            provider: providerKey,
            eventId: String(link?.eventId || ""),
            title: link?.title || "",
            start: link?.start || "",
            end: link?.end || "",
            allDay: Boolean(link?.allDay),
            location: link?.location || "",
            meetingType: link?.meetingType || "",
            updatedAt: link?.updatedAt || 0,
          }))
        })
        .filter((row) => Boolean(row.eventId))
      setProviderLinkedEvents(rows)
    })
    return () => unsub()
  }, [clientId])

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) || null, [clientId, clients])
  const staffLabelByUid = useMemo(() => {
    const m = new Map<string, string>()
    staff.forEach((s) => m.set(s.uid, s.displayName || s.email || s.uid))
    return m
  }, [staff])

  const filteredContacts = useMemo(() => contacts.filter((c) => String(c.clientId || "") === clientId), [clientId, contacts])
  const filteredOpps = useMemo(
    () => opps.filter((o) => String(o.clientId || "") === clientId).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)),
    [clientId, opps],
  )
  const filteredProjects = useMemo(
    () => projects.filter((p) => String(p.clientId || "") === clientId).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)),
    [clientId, projects],
  )
  const filteredTasks = useMemo(
    () => tasks.filter((t) => String(t.clientId || "") === clientId).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)),
    [clientId, tasks],
  )

  const upcomingInternalEvents = useMemo(() => {
    const now = Date.now()
    return internalEvents
      .filter((e) => String(e.clientId || "") === clientId)
      .filter((e) => Number(e.endAt || 0) >= now)
      .sort((a, b) => Number(a.startAt || 0) - Number(b.startAt || 0))
      .slice(0, 20)
  }, [clientId, internalEvents])

  const upcomingLinkedEvents = useMemo(() => {
    const now = Date.now()
    const providerRows = providerLinkedEvents
      .map((event) => {
        const startAt = event.start ? new Date(event.start).getTime() : 0
        const endAt = event.end ? new Date(event.end).getTime() : startAt
        return {
          kind: "provider" as const,
          id: `${event.provider}:${event.eventId}`,
          provider: event.provider,
          title: event.title || `${event.provider === "google" ? "Google" : "Outlook"} event`,
          startAt,
          endAt,
          allDay: Boolean(event.allDay),
          location: event.location || "",
          meetingType: event.meetingType || "",
        }
      })
      .filter((event) => !event.endAt || event.endAt >= now)

    const internalRows = upcomingInternalEvents.map((event) => ({
      kind: "internal" as const,
      id: event.id,
      provider: "internal" as const,
      title: event.title,
      startAt: Number(event.startAt || 0),
      endAt: Number(event.endAt || 0),
      allDay: Boolean(event.allDay),
      location: "",
      meetingType: "",
    }))

    return [...internalRows, ...providerRows]
      .sort((a, b) => {
        const left = a.startAt || Number.MAX_SAFE_INTEGER
        const right = b.startAt || Number.MAX_SAFE_INTEGER
        return left - right
      })
      .slice(0, 20)
  }, [providerLinkedEvents, upcomingInternalEvents])

  const setClientId = (id: string) => {
    const next = String(id || "").trim()
    if (!next) {
      navigate(`/CRM/Client360`, { replace: true })
      return
    }
    navigate(`/CRM/Client360/${encodeURIComponent(next)}`, { replace: true })
  }

  const sectionCardSx = {
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    p: 2,
  }

  return (
    <Box sx={{ width: "100%", px: { xs: 1.5, sm: 2, md: 3 }, py: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            bgcolor: themeConfig.brandColors.navy,
            color: themeConfig.brandColors.offWhite,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: "inherit" }}>
              Client 360
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.7) }}>
              One place for pipeline, delivery, tasks, and timeline.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Select
              size="small"
              value={clientId}
              displayEmpty
              sx={{
                minWidth: 280,
                color: themeConfig.brandColors.offWhite,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.4) },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(themeConfig.brandColors.offWhite, 0.7) },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: themeConfig.brandColors.offWhite },
                "& .MuiSvgIcon-root": { color: themeConfig.brandColors.offWhite },
              }}
              onChange={(e) => setClientId(String(e.target.value || ""))}
              renderValue={(v) => {
                const id = String(v || "")
                if (!id) return <Typography sx={{ color: alpha(themeConfig.brandColors.offWhite, 0.5) }}>Select a client…</Typography>
                return selectedClient?.name || id
              }}
            >
              <MenuItem value="">
                <em>Select a client…</em>
              </MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name || c.id}
                </MenuItem>
              ))}
            </Select>

            {clientId ? (
              <>
                {[
                  { label: "Open record", to: `/CRM/Clients?clientId=${encodeURIComponent(clientId)}` },
                  { label: "Schedule event", to: `/Calendar?create=1&clientId=${encodeURIComponent(clientId)}` },
                  { label: "New project", to: `/Tasks/Projects?create=1&clientId=${encodeURIComponent(clientId)}` },
                  { label: "New task", to: `/Tasks/Tasks?create=1&clientId=${encodeURIComponent(clientId)}` },
                ].map((btn) => (
                  <Button
                    key={btn.label}
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(btn.to)}
                    sx={{
                      color: themeConfig.brandColors.offWhite,
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.4),
                      "&:hover": {
                        bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
                        borderColor: alpha(themeConfig.brandColors.offWhite, 0.7),
                      },
                    }}
                  >
                    {btn.label}
                  </Button>
                ))}
              </>
            ) : null}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {!clientId ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="text.secondary">Select a client above to view their 360.</Typography>
            </Box>
          ) : (
            <>
              {/* Client summary */}
              <Box sx={{ ...sectionCardSx, mb: 2, bgcolor: alpha(themeConfig.brandColors.navy, 0.04) }}>
                <Typography fontWeight={700}>{selectedClient?.name || clientId}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedClient?.email ? `Email: ${selectedClient.email}` : ""}
                  {selectedClient?.email && selectedClient?.phone ? " • " : ""}
                  {selectedClient?.phone ? `Phone: ${selectedClient.phone}` : ""}
                  {(selectedClient?.email || selectedClient?.phone) && selectedClient?.status ? " • " : ""}
                  {selectedClient?.status ? `Status: ${selectedClient.status}` : ""}
                </Typography>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" }, gap: 2 }}>
                {/* Left column */}
                <Box sx={{ display: "grid", gap: 2 }}>
                  {/* Pipeline */}
                  <Box sx={sectionCardSx}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      Pipeline
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {filteredOpps.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No opportunities linked to this client yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 1 }}>
                        {filteredOpps.slice(0, 10).map((o) => (
                          <Box key={o.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>
                                {o.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {o.status || "open"} {o.stageId ? `• ${o.stageId}` : ""}
                              </Typography>
                              <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {o.ownerUserId ? <Chip size="small" label={`Owner: ${staffLabelByUid.get(o.ownerUserId) || o.ownerUserId}`} /> : null}
                                {o.convertedProjectId ? <Chip size="small" color="success" label="Converted to project" /> : null}
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "flex-start" }}>
                              <Button size="small" variant="outlined" onClick={() => navigate(`/CRM/Pipeline?opportunityId=${encodeURIComponent(o.id)}`)}>
                                Open
                              </Button>
                              {o.convertedProjectId ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => navigate(`/Tasks/Projects?projectId=${encodeURIComponent(o.convertedProjectId || "")}`)}
                                >
                                  Project
                                </Button>
                              ) : null}
                              {o.convertedKickoffEventId ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => navigate(`/Calendar?eventId=${encodeURIComponent(o.convertedKickoffEventId || "")}`)}
                                >
                                  Kickoff
                                </Button>
                              ) : null}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Projects */}
                  <Box sx={sectionCardSx}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      Projects
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {filteredProjects.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No projects linked yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 1 }}>
                        {filteredProjects.slice(0, 10).map((p) => (
                          <Box key={p.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.status || "active"} {p.dueDate ? `• Due ${p.dueDate}` : ""}
                              </Typography>
                              {p.ownerUserId ? (
                                <Box sx={{ mt: 0.75 }}>
                                  <Chip size="small" label={`Owner: ${staffLabelByUid.get(p.ownerUserId) || p.ownerUserId}`} />
                                </Box>
                              ) : null}
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => navigate(`/Tasks/Projects?projectId=${encodeURIComponent(p.id)}`)}>
                              Open
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Tasks */}
                  <Box sx={sectionCardSx}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      Tasks
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {filteredTasks.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No tasks linked yet.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 1 }}>
                        {filteredTasks.slice(0, 12).map((t) => (
                          <Box key={t.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>
                                {t.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t.status || "todo"} {t.dueDate ? `• Due ${t.dueDate}` : ""} {t.projectId ? `• Project ${t.projectId}` : ""}
                              </Typography>
                              {(t.assigneeUserIds || []).length ? (
                                <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                  {(t.assigneeUserIds || []).slice(0, 3).map((uid) => (
                                    <Chip key={uid} size="small" label={staffLabelByUid.get(uid) || uid} />
                                  ))}
                                  {(t.assigneeUserIds || []).length > 3 ? <Chip size="small" label={`+${(t.assigneeUserIds || []).length - 3}`} /> : null}
                                </Box>
                              ) : null}
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => navigate(`/Tasks/Tasks?taskId=${encodeURIComponent(t.id)}`)}>
                              Open
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Right column */}
                <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
                  {/* Contacts */}
                  <Box sx={sectionCardSx}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      Contacts
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {filteredContacts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No contacts linked.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {filteredContacts.slice(0, 12).map((c) => (
                          <Chip key={c.id} label={c.name} size="small" />
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Upcoming events */}
                  <Box sx={sectionCardSx}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      Upcoming Events
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {upcomingLinkedEvents.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No upcoming events linked.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 1 }}>
                        {upcomingLinkedEvents.map((e) => (
                          <Box key={e.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} noWrap>
                                {e.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {e.startAt ? new Date(e.startAt).toLocaleString() : "Time pending"}
                                {e.allDay ? " • all-day" : ""}
                                {e.provider !== "internal" ? ` • ${e.provider}` : " • internal"}
                                {e.location ? ` • ${e.location}` : ""}
                              </Typography>
                            </Box>
                            {e.provider === "internal" ? (
                              <Button size="small" variant="outlined" onClick={() => navigate(`/Calendar?eventId=${encodeURIComponent(e.id)}`)}>
                                Open
                              </Button>
                            ) : (
                              <Button size="small" variant="outlined" onClick={() => navigate(`/Calendar`)}>
                                Calendar
                              </Button>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Activity */}
                  <Box sx={sectionCardSx}>
                    <ActivityComposer entityType="client" entityId={clientId} defaultTitle="Note" />
                  </Box>
                  <Box sx={sectionCardSx}>
                    <ActivityTimeline entityType="client" entityId={clientId} title="Timeline" />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

