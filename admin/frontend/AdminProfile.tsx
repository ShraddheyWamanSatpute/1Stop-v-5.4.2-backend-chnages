import { useEffect, useMemo, useState } from "react"
import { Box, Button, Card, CardContent, Divider, Grid, TextField, Typography, Alert, CircularProgress } from "@mui/material"
import { Person as PersonIcon } from "@mui/icons-material"
import DataHeader from "../../app/frontend/components/reusable/DataHeader"
import { useAdmin } from "../backend/context/AdminContext"
import { db, get, ref, set } from "../backend/services/Firebase"
import { nowMs, rootUpdate } from "./shared/rtdb"
import { AdminPageShell } from "./shared/AdminPageShell"

type StaffCardDoc = {
  uid: string
  // Public card fields (already used by landing page)
  displayName?: string
  title?: string
  company?: string
  email?: string
  phone?: string
  website?: string
  photoURL?: string

  // Profile fields requested
  firstName?: string
  lastName?: string
  linkedin?: string

  // Company + socials (managed here, used by QR/landing)
  companyWebsite?: string
  companyLinkedin?: string
  companyInstagram?: string
  companyFacebook?: string
  companyTwitter?: string

  createdAt?: number
  updatedAt?: number
}

export default function AdminProfile() {
  const { state } = useAdmin()
  const uid = state.user?.uid || ""

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maintenanceBusy, setMaintenanceBusy] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
    photoURL: "",
    title: "",
    companyName: "",
    companyWebsite: "",
    companyLinkedin: "",
    companyInstagram: "",
    companyFacebook: "",
    companyTwitter: "",
  })

  const displayName = useMemo(() => {
    const fromNames = `${form.firstName} ${form.lastName}`.trim()
    return fromNames || state.user?.email || "Admin"
  }, [form.firstName, form.lastName, state.user?.email])

  useEffect(() => {
    const run = async () => {
      if (!uid) return
      setLoading(true)
      setError(null)
      setSaved(false)
      try {
        const snap = await get(ref(db, `admin/staffCards/${uid}`))
        const v: StaffCardDoc = (snap.exists() ? (snap.val() as any) : {}) || {}

        const inferredName =
          v.displayName ||
          `${v.firstName || ""} ${v.lastName || ""}`.trim() ||
          state.user?.displayName ||
          ""

        const inferredFirst = v.firstName || (inferredName || "").split(" ").slice(0, 1).join(" ")
        const inferredLast = v.lastName || (inferredName || "").split(" ").slice(1).join(" ")

        setForm({
          firstName: inferredFirst || "",
          lastName: inferredLast || "",
          email: v.email || state.user?.email || "",
          phone: v.phone || "",
          linkedin: v.linkedin || "",
          photoURL: v.photoURL || state.user?.photoURL || "",
          title: v.title || "",
          companyName: v.company || "",
          companyWebsite: v.companyWebsite || v.website || "",
          companyLinkedin: v.companyLinkedin || "",
          companyInstagram: v.companyInstagram || "",
          companyFacebook: v.companyFacebook || "",
          companyTwitter: v.companyTwitter || "",
        })
      } catch (e: any) {
        setError(e?.message || "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [uid, state.user?.email, state.user?.photoURL, state.user])

  const save = async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      const now = Date.now()

      const doc: StaffCardDoc = {
        uid,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName} ${form.lastName}`.trim() || displayName,
        title: form.title.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        linkedin: form.linkedin.trim(),
        photoURL: form.photoURL.trim(),

        // Public-facing company fields (kept for backward compatibility)
        company: form.companyName.trim(),
        website: form.companyWebsite.trim(),

        // Company socials
        companyWebsite: form.companyWebsite.trim(),
        companyLinkedin: form.companyLinkedin.trim(),
        companyInstagram: form.companyInstagram.trim(),
        companyFacebook: form.companyFacebook.trim(),
        companyTwitter: form.companyTwitter.trim(),

        updatedAt: now,
      }

      // Preserve createdAt if already exists
      const existing = await get(ref(db, `admin/staffCards/${uid}`))
      if (!existing.exists()) {
        doc.createdAt = now
      } else {
        doc.createdAt = (existing.val() as any)?.createdAt || now
      }

      await set(ref(db, `admin/staffCards/${uid}`), doc)
      setSaved(true)
    } catch (e: any) {
      setError(e?.message || "Failed to save profile")
    } finally {
      setLoading(false)
    }
  }

  const runBackfill = async () => {
    setMaintenanceBusy(true)
    setMaintenanceMsg(null)
    try {
      const now = nowMs()

      const [projectsSnap, tasksSnap, oppSnap, taskLinksSnap, internalEventsSnap] = await Promise.all([
        get(ref(db, "admin/projects")),
        get(ref(db, "admin/tasks")),
        get(ref(db, "admin/crm/opportunities")),
        get(ref(db, "admin/calendar/taskLinks")),
        get(ref(db, "admin/calendar/events")),
      ])

      const projects = projectsSnap.exists() ? (projectsSnap.val() as any) : {}
      const tasks = tasksSnap.exists() ? (tasksSnap.val() as any) : {}
      const opps = oppSnap.exists() ? (oppSnap.val() as any) : {}
      const taskLinks = taskLinksSnap.exists() ? (taskLinksSnap.val() as any) : {}
      const internalEvents = internalEventsSnap.exists() ? (internalEventsSnap.val() as any) : {}

      const updates: Record<string, any> = {}

      // Projects → projectsByClient
      for (const [projectId, raw] of Object.entries(projects || {})) {
        const clientId = String((raw as any)?.clientId || "").trim()
        if (!clientId) continue
        updates[`admin/index/projectsByClient/${clientId}/${projectId}`] = true

        const ownerUserId = String((raw as any)?.ownerUserId || "").trim()
        if (ownerUserId) updates[`admin/index/projectsByOwner/${ownerUserId}/${projectId}`] = true
      }

      // Tasks → tasksByClient + tasksByProject + tasksByAssignee
      for (const [taskId, raw] of Object.entries(tasks || {})) {
        const clientId = String((raw as any)?.clientId || "").trim()
        const projectId = String((raw as any)?.projectId || "").trim()
        if (clientId) updates[`admin/index/tasksByClient/${clientId}/${taskId}`] = true
        if (projectId) updates[`admin/index/tasksByProject/${projectId}/${taskId}`] = true
        const assignees = Array.isArray((raw as any)?.assigneeUserIds) ? ((raw as any).assigneeUserIds as any[]) : []
        for (const uid of assignees) {
          const v = String(uid || "").trim()
          if (v) updates[`admin/index/tasksByAssignee/${v}/${taskId}`] = true
        }
      }

      // Opportunities → opportunitiesByClient + opportunitiesByOwner
      for (const [oppId, raw] of Object.entries(opps || {})) {
        const clientId = String((raw as any)?.clientId || "").trim()
        if (!clientId) continue
        updates[`admin/index/opportunitiesByClient/${clientId}/${oppId}`] = true
        const ownerUserId = String((raw as any)?.ownerUserId || "").trim()
        if (ownerUserId) updates[`admin/index/opportunitiesByOwner/${ownerUserId}/${oppId}`] = true
      }

      // Migrate legacy taskLinks → calendar/links/task/*
      for (const [taskId, byProvider] of Object.entries(taskLinks || {})) {
        const providers = (byProvider as any) || {}
        for (const [provider, link] of Object.entries(providers)) {
          const calendarId = String((link as any)?.calendarId || "").trim()
          const eventId = String((link as any)?.eventId || "").trim()
          if (!calendarId || !eventId) continue
          updates[`admin/calendar/links/task/${taskId}/${provider}/${eventId}`] = { calendarId, eventId, updatedAt: now }
        }
      }

      // Backfill internal calendar generalized links: calendar/links/{entity}/{id}/internal
      for (const [eventId, raw] of Object.entries(internalEvents || {})) {
        const e = (raw as any) || {}
        const updatedAt = Number(e?.updatedAt || e?.startAt || now)
        const writeLink = (entityType: string, entityId: any) => {
          const id = String(entityId || "").trim()
          if (!id) return
          updates[`admin/calendar/links/${entityType}/${id}/internal/${String(e?.id || eventId)}`] = { eventId: String(e?.id || eventId), updatedAt }
        }
        writeLink("task", e.taskId)
        writeLink("project", e.projectId)
        writeLink("contact", e.contactId)
        writeLink("client", e.clientId)
        writeLink("opportunity", e.opportunityId)
      }

      // Chunk large updates to avoid payload limits
      const entries = Object.entries(updates)
      const chunkSize = 500
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize)
        await rootUpdate(Object.fromEntries(chunk))
      }

      setMaintenanceMsg(`Backfill complete. Wrote ${entries.length} index/link updates.`)
    } catch (e: any) {
      setMaintenanceMsg(`Backfill failed: ${e?.message || "unknown error"}`)
    } finally {
      setMaintenanceBusy(false)
    }
  }

  const syncAdminStaffPermissions = async () => {
    setMaintenanceBusy(true)
    setMaintenanceMsg(null)
    try {
      const now = nowMs()
      const staffSnap = await get(ref(db, "admin/staff"))
      const staff = staffSnap.exists() ? (staffSnap.val() as any) : {}

      const updates: Record<string, any> = {}
      for (const [uid, raw] of Object.entries(staff || {})) {
        const id = String(uid || "").trim()
        if (!id) continue
        const pages = (raw as any)?.pages
        if (pages && typeof pages === "object") {
          updates[`users/${id}/adminStaff/pages`] = pages
        }
        updates[`users/${id}/adminStaff/active`] = true
        updates[`users/${id}/updatedAt`] = now
      }

      const entries = Object.entries(updates)
      const chunkSize = 500
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize)
        await rootUpdate(Object.fromEntries(chunk))
      }
      setMaintenanceMsg(`Staff permissions sync complete. Wrote ${entries.length} user adminStaff updates.`)
    } catch (e: any) {
      setMaintenanceMsg(`Staff permissions sync failed: ${e?.message || "unknown error"}`)
    } finally {
      setMaintenanceBusy(false)
    }
  }

  return (
    <AdminPageShell
      title="Profile"
      description="Public staff card details, referral-ready profile data, and admin maintenance tools now sit inside the shared admin shell."
      metrics={[
        { label: "Display name", value: displayName || "Admin", icon: <PersonIcon fontSize="small" /> },
        { label: "Profile email", value: form.email || "Not set", icon: <PersonIcon fontSize="small" /> },
        { label: "Company", value: form.companyName || "Not set", icon: <PersonIcon fontSize="small" /> },
      ]}
    >
      <DataHeader
        showDateControls={false}
        showDateTypeSelector={false}
        onCreateNew={undefined}
        additionalButtons={[
          {
            label: "Save",
            icon: <PersonIcon />,
            onClick: () => save(),
            variant: "contained",
            disabled: loading || !uid,
          },
        ]}
      />

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Profile saved. Your QR page and public staff page will now use these details.
        </Alert>
      ) : null}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Personal details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First name"
                fullWidth
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Surname"
                fullWidth
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="LinkedIn (profile URL)"
                fullWidth
                value={form.linkedin}
                onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Profile picture URL"
                fullWidth
                value={form.photoURL}
                onChange={(e) => setForm((p) => ({ ...p, photoURL: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Title (optional)"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Company (shown on your public staff page)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company name"
                fullWidth
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company website"
                fullWidth
                value={form.companyWebsite}
                onChange={(e) => setForm((p) => ({ ...p, companyWebsite: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company LinkedIn (URL)"
                fullWidth
                value={form.companyLinkedin}
                onChange={(e) => setForm((p) => ({ ...p, companyLinkedin: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Instagram (URL)"
                fullWidth
                value={form.companyInstagram}
                onChange={(e) => setForm((p) => ({ ...p, companyInstagram: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Facebook (URL)"
                fullWidth
                value={form.companyFacebook}
                onChange={(e) => setForm((p) => ({ ...p, companyFacebook: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Twitter/X (URL)"
                fullWidth
                value={form.companyTwitter}
                onChange={(e) => setForm((p) => ({ ...p, companyTwitter: e.target.value }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Admin maintenance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Safe backfill tool. Creates missing index nodes for CRM/PM linking and migrates legacy calendar task links.
          </Typography>

          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="contained" onClick={() => void runBackfill()} disabled={maintenanceBusy}>
              {maintenanceBusy ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              Backfill indexes
            </Button>
                <Button variant="outlined" onClick={() => void syncAdminStaffPermissions()} disabled={maintenanceBusy}>
                  Sync staff permissions
                </Button>
          </Box>

          {maintenanceMsg ? (
            <Alert severity={maintenanceMsg.startsWith("Backfill complete") ? "success" : "warning"} sx={{ mt: 2 }}>
              {maintenanceMsg}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
