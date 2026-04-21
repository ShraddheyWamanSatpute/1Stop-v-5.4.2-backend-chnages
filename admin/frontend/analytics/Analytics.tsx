"use client"

import React, { useEffect, useMemo, useState } from "react"
import { alpha } from "@mui/material/styles"
import {
  Box,
  Chip,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  Article as ContentIcon,
  Assignment as TaskIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Folder as ProjectIcon,
  Groups as GroupsIcon,
  Mail as MailIcon,
  NoteAlt as NoteIcon,
  OpenInNew as OpenInNewIcon,
  People as PeopleIcon,
  QrCode2 as QrIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import DataHeader from "../../../app/frontend/components/reusable/DataHeader"
import EmptyStateCard from "../../../app/frontend/components/reusable/EmptyStateCard"
import { themeConfig } from "../../../app/backend/context/AppTheme"
import { db, onValue, ref } from "../../backend/services/Firebase"
import { useAdmin } from "../../backend/context/AdminContext"
import { AdminPageShell } from "../shared/AdminPageShell"

type ActivityRow = {
  id: string
  type: string
  label: string
  status?: string
  updatedAt: number
  href?: string
}

type DateType = "day" | "week" | "month" | "year" | "all" | "custom"

const toMs = (value: any): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : 0
  }
  return 0
}

const objToArray = (val: any): Array<{ id: string; raw: any }> => {
  const obj = val && typeof val === "object" ? val : {}
  return Object.entries(obj).map(([id, raw]) => ({ id, raw }))
}

const countKeys = (val: any) => {
  if (!val || typeof val !== "object") return 0
  return Object.keys(val).length
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
const startOfWeekMonday = (d: Date) => {
  const day = d.getDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // 0 if Monday, 6 if Sunday
  const out = new Date(d)
  out.setDate(d.getDate() - diff)
  return startOfDay(out)
}
const endOfWeekMonday = (d: Date) => {
  const s = startOfWeekMonday(d)
  const out = new Date(s)
  out.setDate(s.getDate() + 6)
  return endOfDay(out)
}

const StatTile = ({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) => {
  return (
    <Paper
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        height: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(themeConfig.brandColors.navy, 0.08),
            color: themeConfig.brandColors.navy,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { state } = useAdmin()
  const uid = state.user?.uid || ""

  // Header controls (date + filters)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [dateType, setDateType] = useState<DateType>("month")
  const [customStartDate, setCustomStartDate] = useState<Date>(() => startOfMonth(new Date()))
  const [customEndDate, setCustomEndDate] = useState<Date>(() => endOfMonth(new Date()))
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const [crmCompanies, setCrmCompanies] = useState<Record<string, any>>({})
  const [companies, setCompanies] = useState<Record<string, any>>({})
  const [clients, setClients] = useState<Record<string, any>>({})
  const [contacts, setContacts] = useState<Record<string, any>>({})
  const [tasks, setTasks] = useState<Record<string, any>>({})
  const [projects, setProjects] = useState<Record<string, any>>({})
  const [notes, setNotes] = useState<Record<string, any>>({})
  const [leads, setLeads] = useState<Record<string, any>>({})
  const [marketingEvents, setMarketingEvents] = useState<Record<string, any>>({})
  const [contentPosts, setContentPosts] = useState<Record<string, any>>({})
  const [staff, setStaff] = useState<Record<string, any>>({})
  const [staffInvites, setStaffInvites] = useState<Record<string, any>>({})
  const [emailMessages, setEmailMessages] = useState<Record<string, any>>({})
  const [emailOutbox, setEmailOutbox] = useState<Record<string, any>>({})

  const [activityPage, setActivityPage] = useState(0)
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(10)

  useEffect(() => {
    const unsubs: Array<() => void> = []

    unsubs.push(
      onValue(ref(db, "admin/crm/companies"), (snap) => setCrmCompanies(snap.val() || {})),
      onValue(ref(db, "companies"), (snap) => setCompanies(snap.val() || {})),
      onValue(ref(db, "admin/crm/clients"), (snap) => setClients(snap.val() || {})),
      onValue(ref(db, "admin/crm/contacts"), (snap) => setContacts(snap.val() || {})),
      onValue(ref(db, "admin/tasks"), (snap) => setTasks(snap.val() || {})),
      onValue(ref(db, "admin/projects"), (snap) => setProjects(snap.val() || {})),
      onValue(ref(db, "admin/notes"), (snap) => setNotes(snap.val() || {})),
      onValue(ref(db, "admin/leads"), (snap) => setLeads(snap.val() || {})),
      onValue(ref(db, "admin/marketing"), (snap) => setMarketingEvents(snap.val() || {})),
      onValue(ref(db, "admin/content/posts"), (snap) => setContentPosts(snap.val() || {})),
      onValue(ref(db, "admin/staff"), (snap) => setStaff(snap.val() || {})),
      onValue(ref(db, "admin/staffInvites"), (snap) => setStaffInvites(snap.val() || {})),
    )

    if (uid) {
      unsubs.push(
        onValue(ref(db, `admin/email/users/${uid}/messages`), (snap) => setEmailMessages(snap.val() || {})),
        onValue(ref(db, `admin/email/users/${uid}/outbox`), (snap) => setEmailOutbox(snap.val() || {})),
      )
    } else {
      setEmailMessages({})
      setEmailOutbox({})
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u()
        } catch {
          // ignore
        }
      })
    }
  }, [uid])

  const dateWindow = useMemo(() => {
    if (dateType === "all") return { startMs: 0, endMs: Number.POSITIVE_INFINITY }
    if (dateType === "custom") return { startMs: +startOfDay(customStartDate), endMs: +endOfDay(customEndDate) }
    if (dateType === "day") return { startMs: +startOfDay(currentDate), endMs: +endOfDay(currentDate) }
    if (dateType === "week") return { startMs: +startOfWeekMonday(currentDate), endMs: +endOfWeekMonday(currentDate) }
    if (dateType === "month") return { startMs: +startOfMonth(currentDate), endMs: +endOfMonth(currentDate) }
    if (dateType === "year") return { startMs: +startOfYear(currentDate), endMs: +endOfYear(currentDate) }
    return { startMs: 0, endMs: Number.POSITIVE_INFINITY }
  }, [currentDate, dateType, customStartDate, customEndDate])

  const inWindow = useMemo(() => {
    return (ts: number) => ts >= dateWindow.startMs && ts <= dateWindow.endMs
  }, [dateWindow.endMs, dateWindow.startMs])

  const mergedCompaniesCount = useMemo(() => {
    // Prefer CRM companies if present, but merge to avoid double counting.
    const merged: Record<string, any> = {}
    Object.entries(companies || {}).forEach(([id, v]) => (merged[id] = v))
    Object.entries(crmCompanies || {}).forEach(([id, v]) => (merged[id] = v))
    return Object.keys(merged).length
  }, [companies, crmCompanies])

  const mergedCompaniesUpdatedInRange = useMemo(() => {
    const merged: Record<string, any> = {}
    Object.entries(companies || {}).forEach(([id, v]) => (merged[id] = v))
    Object.entries(crmCompanies || {}).forEach(([id, v]) => (merged[id] = v))
    return objToArray(merged).filter(({ raw }) => {
      const updatedAt = Math.max(
        toMs(raw?.updatedAt),
        toMs(raw?.companyUpdated),
        toMs(raw?.timestamp),
        toMs(raw?.createdAt),
        0,
      )
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [companies, crmCompanies, inWindow])

  const clientsUpdatedInRange = useMemo(() => {
    return objToArray(clients).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [clients, inWindow])

  const contactsUpdatedInRange = useMemo(() => {
    return objToArray(contacts).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [contacts, inWindow])

  const notesUpdatedInRange = useMemo(() => {
    return objToArray(notes).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [notes, inWindow])

  const leadsUpdatedInRange = useMemo(() => {
    return objToArray(leads).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [leads, inWindow])

  const tasksInRange = useMemo(() => {
    return objToArray(tasks).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    })
  }, [tasks, inWindow])

  const taskStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 }
    objToArray(tasks).forEach(({ raw }) => {
      const s = String(raw?.status || "todo")
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [tasks])

  const taskStatusCountsInRange = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 }
    tasksInRange.forEach(({ raw }) => {
      const s = String(raw?.status || "todo")
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [tasksInRange])

  const projectsInRange = useMemo(() => {
    return objToArray(projects).filter(({ raw }) => {
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    })
  }, [projects, inWindow])

  const projectStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, on_hold: 0, completed: 0 }
    objToArray(projects).forEach(({ raw }) => {
      const s = String(raw?.status || "active")
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [projects])

  const projectStatusCountsInRange = useMemo(() => {
    const counts: Record<string, number> = { active: 0, on_hold: 0, completed: 0 }
    projectsInRange.forEach(({ raw }) => {
      const s = String(raw?.status || "active")
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [projectsInRange])

  const emailCounts = useMemo(() => {
    const msgs = objToArray(emailMessages).map((x) => x.raw)
    const out = objToArray(emailOutbox).map((x) => x.raw)
    const inbox = msgs.length
    const queued = out.filter((m) => String(m?.status || "").toLowerCase() === "queued").length
    const failed = out.filter((m) => String(m?.status || "").toLowerCase() === "failed").length
    return { inbox, queued, failed }
  }, [emailMessages, emailOutbox])

  const inboxUpdatedInRange = useMemo(() => {
    const msgs = objToArray(emailMessages).map((x) => x.raw)
    return msgs.filter((m) => {
      const updatedAt = Math.max(toMs(m?.receivedAt), toMs(m?.updatedAt), toMs(m?.createdAt), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    }).length
  }, [emailMessages, inWindow])

  const contentCounts = useMemo(() => {
    const posts = objToArray(contentPosts).map((x) => x.raw)
    const scheduled = posts.filter((p) => String(p?.status || "").toLowerCase() === "scheduled").length
    const published = posts.filter((p) => String(p?.status || "").toLowerCase() === "published").length
    return { scheduled, published }
  }, [contentPosts])

  const contentCountsInRange = useMemo(() => {
    const posts = objToArray(contentPosts).map((x) => x.raw).filter((p) => {
      const updatedAt = Math.max(toMs(p?.updatedAt), toMs(p?.timestamp), toMs(p?.createdAt), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    })
    const scheduled = posts.filter((p) => String(p?.status || "").toLowerCase() === "scheduled").length
    const published = posts.filter((p) => String(p?.status || "").toLowerCase() === "published").length
    return { scheduled, published }
  }, [contentPosts, inWindow])

  const marketingCounts = useMemo(() => {
    const events = objToArray(marketingEvents).map((x) => x.raw)
    const active = events.filter((e) => String(e?.status || "").toLowerCase() === "active").length
    return { total: events.length, active }
  }, [marketingEvents])

  const marketingCountsInRange = useMemo(() => {
    const events = objToArray(marketingEvents).map((x) => x.raw).filter((e) => {
      const updatedAt = Math.max(toMs(e?.updatedAt), toMs(e?.timestamp), toMs(e?.createdAt), 0)
      return updatedAt > 0 && inWindow(updatedAt)
    })
    const active = events.filter((e) => String(e?.status || "").toLowerCase() === "active").length
    return { total: events.length, active }
  }, [marketingEvents, inWindow])

  const recentActivity = useMemo((): ActivityRow[] => {
    const rows: ActivityRow[] = []

    // Companies (supports both schemas)
    objToArray({ ...(companies || {}), ...(crmCompanies || {}) }).forEach(({ id, raw }) => {
      const label = String(raw?.companyName || raw?.name || raw?.title || "Company")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.companyUpdated), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      if (updatedAt > 0) {
        rows.push({
          id: `company:${id}`,
          type: "Company",
          label,
          updatedAt,
          href: "/CRM/Companies",
        })
      }
    })

    objToArray(clients).forEach(({ id, raw }) => {
      const label = String(raw?.name || "Client")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      rows.push({
        id: `client:${id}`,
        type: "Client",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: "/CRM/Clients",
      })
    })

    objToArray(contacts).forEach(({ id, raw }) => {
      const label = String(raw?.name || "Contact")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      rows.push({
        id: `contact:${id}`,
        type: "Contact",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: "/CRM/Contacts",
      })
    })

    objToArray(tasks).forEach(({ id, raw }) => {
      const label = String(raw?.title || "Task")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      rows.push({
        id: `task:${id}`,
        type: "Task",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: `/Tasks/Tasks?taskId=${encodeURIComponent(id)}`,
      })
    })

    objToArray(projects).forEach(({ id, raw }) => {
      const label = String(raw?.name || "Project")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.createdAt), toMs(raw?.timestamp), 0)
      rows.push({
        id: `project:${id}`,
        type: "Project",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: `/Tasks/Projects?projectId=${encodeURIComponent(id)}`,
      })
    })

    objToArray(notes).forEach(({ id, raw }) => {
      const label = String(raw?.title || "Note")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      rows.push({
        id: `note:${id}`,
        type: "Note",
        label,
        status: raw?.category ? String(raw.category) : undefined,
        updatedAt,
        href: `/Tasks/Notes?noteId=${encodeURIComponent(id)}`,
      })
    })

    objToArray(leads).forEach(({ id, raw }) => {
      const label = String(raw?.name || raw?.fullName || raw?.email || "Lead")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      rows.push({
        id: `lead:${id}`,
        type: "Lead",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: "/CRM/QR",
      })
    })

    objToArray(marketingEvents).forEach(({ id, raw }) => {
      const label = String(raw?.name || "Campaign")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      rows.push({
        id: `marketing:${id}`,
        type: "Marketing",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: "/Marketing/Marketing",
      })
    })

    objToArray(contentPosts).forEach(({ id, raw }) => {
      const label = String(raw?.title || raw?.content || "Content")
      const updatedAt = Math.max(toMs(raw?.updatedAt), toMs(raw?.timestamp), toMs(raw?.createdAt), 0)
      rows.push({
        id: `content:${id}`,
        type: "Content",
        label,
        status: raw?.status ? String(raw.status) : undefined,
        updatedAt,
        href: "/Marketing/Content",
      })
    })

    rows.sort((a, b) => b.updatedAt - a.updatedAt)
    return rows.filter((r) => r.updatedAt > 0).slice(0, 200)
  }, [companies, crmCompanies, clients, contacts, tasks, projects, notes, leads, marketingEvents, contentPosts])

  const filteredActivity = useMemo(() => {
    const typeSet = new Set((typeFilter || []).map((s) => s.toLowerCase()).filter(Boolean))
    const statusSet = new Set((statusFilter || []).map((s) => s.toLowerCase()).filter(Boolean))

    const out = recentActivity.filter((r) => {
      if (!inWindow(r.updatedAt)) return false
      if (typeSet.size > 0 && !typeSet.has(String(r.type || "").toLowerCase())) return false
      if (statusSet.size > 0) {
        const s = String(r.status || "").toLowerCase()
        if (!s || !statusSet.has(s)) return false
      }
      return true
    })

    return out
  }, [inWindow, recentActivity, statusFilter, typeFilter])

  const activityTypeOptions = useMemo(() => {
    const types = Array.from(new Set(recentActivity.map((r) => String(r.type || "").trim()).filter(Boolean)))
    types.sort((a, b) => a.localeCompare(b))
    return types.map((t) => ({ id: t, name: t }))
  }, [recentActivity])

  const activityStatusOptions = useMemo(() => {
    const statuses = Array.from(new Set(recentActivity.map((r) => String(r.status || "").trim()).filter(Boolean)))
    statuses.sort((a, b) => a.localeCompare(b))
    return statuses.map((s) => ({ id: s, name: s }))
  }, [recentActivity])

  const activityPageRows = useMemo(() => {
    const start = activityPage * activityRowsPerPage
    const end = start + activityRowsPerPage
    return filteredActivity.slice(start, end)
  }, [filteredActivity, activityPage, activityRowsPerPage])

  return (
    <AdminPageShell
      title="Analytics"
      description="The upgraded admin reporting pages now use the same 1Stop shell, while keeping date controls and activity reporting close to the live metrics."
      metrics={[
        { label: "Companies", value: mergedCompaniesCount, icon: <BusinessIcon fontSize="small" /> },
        { label: "Clients", value: countKeys(clients), icon: <PeopleIcon fontSize="small" /> },
        { label: "Inbox emails", value: emailCounts.inbox, icon: <MailIcon fontSize="small" /> },
        { label: "Staff invites", value: countKeys(staffInvites), icon: <GroupsIcon fontSize="small" /> },
      ]}
    >
    <Box>
      <DataHeader
        title=""
        currentDate={currentDate}
        onDateChange={(d) => {
          setCurrentDate(d)
          setActivityPage(0)
        }}
        dateType={dateType}
        onDateTypeChange={(t) => {
          setDateType(t as DateType)
          setActivityPage(0)
        }}
        showDateControls
        showDateTypeSelector
        availableDateTypes={["day", "week", "month", "year", "all", "custom"]}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => {
          setCustomStartDate(start)
          setCustomEndDate(end)
          setActivityPage(0)
        }}
        filters={[
          {
            label: "Type",
            options: activityTypeOptions,
            selectedValues: typeFilter,
            onSelectionChange: (values) => {
              setTypeFilter(values)
              setActivityPage(0)
            },
          },
          {
            label: "Status",
            options: activityStatusOptions,
            selectedValues: statusFilter,
            onSelectionChange: (values) => {
              setStatusFilter(values)
              setActivityPage(0)
            },
          },
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded((v) => !v)}
        singleRow
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Companies" : "Companies (updated)"}
            value={String(dateType === "all" ? mergedCompaniesCount : mergedCompaniesUpdatedInRange)}
            icon={<BusinessIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Clients" : "Clients (updated)"}
            value={String(dateType === "all" ? countKeys(clients) : clientsUpdatedInRange)}
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Contacts" : "Contacts (updated)"}
            value={String(dateType === "all" ? countKeys(contacts) : contactsUpdatedInRange)}
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Leads (QR)" : "Leads (updated)"}
            value={String(dateType === "all" ? countKeys(leads) : leadsUpdatedInRange)}
            icon={<QrIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Open Tasks" : "Open Tasks (updated)"}
            value={String(
              dateType === "all"
                ? (taskStatusCounts.todo || 0) + (taskStatusCounts.in_progress || 0) + (taskStatusCounts.blocked || 0)
                : (taskStatusCountsInRange.todo || 0) +
                    (taskStatusCountsInRange.in_progress || 0) +
                    (taskStatusCountsInRange.blocked || 0),
            )}
            icon={<TaskIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Active Projects" : "Active Projects (updated)"}
            value={String(dateType === "all" ? projectStatusCounts.active || 0 : projectStatusCountsInRange.active || 0)}
            icon={<ProjectIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Notes" : "Notes (updated)"}
            value={String(dateType === "all" ? countKeys(notes) : notesUpdatedInRange)}
            icon={<NoteIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label={dateType === "all" ? "Emails (Inbox)" : "Emails (in range)"}
            value={String(dateType === "all" ? emailCounts.inbox : inboxUpdatedInRange)}
            icon={<MailIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Status breakdown
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Workload and pipeline at a glance.
              </Typography>
            </Box>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Count
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(dateType === "all" ? taskStatusCounts : taskStatusCountsInRange).map(([status, count]) => (
                    <TableRow key={`tasks:${status}`} hover>
                      <TableCell>Tasks</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={String(status || "").split("_").join(" ")}
                          sx={{
                            bgcolor: alpha(themeConfig.brandColors.navy, 0.08),
                            color: themeConfig.brandColors.navy,
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                  {Object.entries(dateType === "all" ? projectStatusCounts : projectStatusCountsInRange).map(([status, count]) => (
                    <TableRow key={`projects:${status}`} hover>
                      <TableCell>Projects</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={status.replace(/_/g, " ")}
                          sx={{
                            bgcolor: alpha(themeConfig.brandColors.navy, 0.08),
                            color: themeConfig.brandColors.navy,
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow hover>
                    <TableCell>Marketing</TableCell>
                    <TableCell>
                      <Chip size="small" label="Active campaigns" icon={<CampaignIcon fontSize="small" />} />
                    </TableCell>
                    <TableCell align="right">{dateType === "all" ? marketingCounts.active : marketingCountsInRange.active}</TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>Content</TableCell>
                    <TableCell>
                      <Chip size="small" label="Scheduled posts" icon={<ContentIcon fontSize="small" />} />
                    </TableCell>
                    <TableCell align="right">{dateType === "all" ? contentCounts.scheduled : contentCountsInRange.scheduled}</TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>Staff</TableCell>
                    <TableCell>
                      <Chip size="small" label="Active staff" icon={<GroupsIcon fontSize="small" />} />
                    </TableCell>
                    <TableCell align="right">{countKeys(staff)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latest updates across CRM, Organisation, Marketing and QR.
              </Typography>
            </Box>

            {filteredActivity.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <EmptyStateCard
                  title="No activity in this range"
                  description="Try switching to All Time or widening the date range."
                />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Open
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityPageRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.type}</TableCell>
                          <TableCell sx={{ maxWidth: 340 }}>
                            <Typography variant="body2" noWrap title={row.label}>
                              {row.label}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.status ? (
                              <Chip
                                size="small"
                                label={row.status}
                                sx={{
                                  bgcolor: alpha(themeConfig.brandColors.navy, 0.08),
                                  color: themeConfig.brandColors.navy,
                                  textTransform: "capitalize",
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell align="right">
                            {row.href ? (
                              <Tooltip title="Open">
                                <IconButton size="small" onClick={() => navigate(row.href!)}>
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredActivity.length}
                  page={activityPage}
                  onPageChange={(_e, p) => setActivityPage(p)}
                  rowsPerPage={activityRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setActivityRowsPerPage(parseInt(e.target.value, 10))
                    setActivityPage(0)
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, color: "text.secondary" }}>
        <Typography variant="caption">
          Email stats are shown for the currently logged-in admin user. All other counts are pulled directly from admin RTDB collections.
        </Typography>
      </Box>
    </Box>
    </AdminPageShell>
  )
}
