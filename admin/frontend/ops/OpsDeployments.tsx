import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { db, onValue, push, ref, set } from "../../backend/services/Firebase"
import { useAdmin } from "../../backend/context/AdminContext"
import { authedFetch } from "./opsApi"
import type { OpsDeployment, OpsEnvironmentKey, OpsServiceKey, VersionPayload } from "./opsTypes"

const DEPLOY_SERVICES: Array<{ value: OpsServiceKey; label: string }> = [
  { value: "main-site", label: "Main Site" },
  { value: "app", label: "App" },
  { value: "admin", label: "Admin" },
  { value: "mobile", label: "Mobile" },
  { value: "api", label: "API" },
  { value: "all", label: "All" },
]

function normalizeBaseUrl(raw: string): string {
  const s = String(raw || "").trim()
  if (!s) return ""
  return s.replace(/\/+$/, "")
}

function toDeployments(val: any): OpsDeployment[] {
  const entries = Object.entries(val || {}) as Array<[string, any]>
  const rows = entries.map(([id, raw]) => ({
    id,
    environment: (raw?.environment || "dev") as OpsEnvironmentKey,
    service: (raw?.service || "frontend") as OpsServiceKey,
    baseUrl: raw?.baseUrl ? String(raw.baseUrl) : undefined,
    version: raw?.version ? String(raw.version) : undefined,
    gitSha: raw?.gitSha ? String(raw.gitSha) : undefined,
    buildTime: raw?.buildTime ? String(raw.buildTime) : undefined,
    deployTime: raw?.deployTime ? Number(raw.deployTime) : undefined,
    createdAt: Number(raw?.createdAt || 0),
    source: raw?.source ? String(raw.source) : undefined,
    actionId: raw?.actionId ? String(raw.actionId) : undefined,
    executionUrl: raw?.executionUrl ? String(raw.executionUrl) : undefined,
    actor: raw?.actor || undefined,
    notes: raw?.notes ? String(raw.notes) : undefined,
    jiraKeys: Array.isArray(raw?.jiraKeys) ? raw.jiraKeys.map((k: any) => String(k || "").trim()).filter(Boolean) : undefined,
  }))
  return rows
    .filter((d) => d.createdAt)
    .sort((a, b) => {
      const at = (a.deployTime || a.createdAt || 0) as number
      const bt = (b.deployTime || b.createdAt || 0) as number
      return bt - at
    })
}

function chipColor(env: OpsEnvironmentKey) {
  if (env === "prod") return "error"
  return "info"
}

function serviceColor(svc: OpsServiceKey) {
  if (svc === "api") return "warning"
  if (svc === "all") return "secondary"
  if (svc === "admin") return "primary"
  return "success"
}

function payloadToDefaults(p?: VersionPayload) {
  return {
    version: p?.version ? String(p.version) : "",
    gitSha: p?.gitSha ? String(p.gitSha) : "",
    buildTime: p?.buildTime ? String(p.buildTime) : "",
  }
}

export default function OpsDeployments({
  actor,
  devBaseUrl,
  prodBaseUrl,
  devFrontend,
  devApi,
  prodFrontend,
  prodApi,
}: {
  actor: { uid?: string; email?: string }
  devBaseUrl: string
  prodBaseUrl: string
  devFrontend?: VersionPayload
  devApi?: VersionPayload
  prodFrontend?: VersionPayload
  prodApi?: VersionPayload
}) {
  const { state } = useAdmin()
  const userAny = state.user as any
  const isAdmin = Boolean(userAny?.isAdmin)
  const opsPerms = (userAny?.adminStaff?.permissions?.ops || userAny?.adminStaff?.permissions?.Ops || null) as any
  const canRequest = isAdmin || Boolean(opsPerms?.request)
  const [deployments, setDeployments] = React.useState<OpsDeployment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)

  const [jiraBaseUrl, setJiraBaseUrl] = React.useState<string>("")

  const openDialogWith = (env: OpsEnvironmentKey, svc: OpsServiceKey, p?: VersionPayload) => {
    setEnvironment(env)
    setService(svc)
    setBaseUrl(env === "prod" ? normalizeBaseUrl(prodBaseUrl) : normalizeBaseUrl(devBaseUrl))
    const d = payloadToDefaults(p)
    setVersion(d.version)
    setGitSha(d.gitSha)
    setBuildTime(d.buildTime)
    setNotes("")
    setOpen(true)
  }

  const [envFilter, setEnvFilter] = React.useState<"all" | OpsEnvironmentKey>("all")
  const [serviceFilter, setServiceFilter] = React.useState<"all" | OpsServiceKey>("all")
  const [query, setQuery] = React.useState("")

  const [open, setOpen] = React.useState(false)
  const [environment, setEnvironment] = React.useState<OpsEnvironmentKey>("dev")
  const [service, setService] = React.useState<OpsServiceKey>("app")
  const [baseUrl, setBaseUrl] = React.useState("")
  const [version, setVersion] = React.useState("")
  const [gitSha, setGitSha] = React.useState("")
  const [buildTime, setBuildTime] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const r = ref(db, "admin/ops/deployments")
    const unsub = onValue(r, (snap) => {
      setDeployments(toDeployments(snap.val()))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  React.useEffect(() => {
    const r = ref(db, "admin/ops/providers/jira/config/baseUrl")
    const unsub = onValue(r, (snap) => setJiraBaseUrl(String(snap.val() || "")))
    return () => unsub()
  }, [])

  // Allow parent (Overview) to prefill + open the dialog.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("adminOps.deployPrefill") || ""
      if (!raw) return
      localStorage.removeItem("adminOps.deployPrefill")
      const parsed = JSON.parse(raw) as any
      const env = (parsed?.environment || "dev") as OpsEnvironmentKey
      const svc = (parsed?.service || "frontend") as OpsServiceKey
      const p = (parsed?.payload || undefined) as VersionPayload | undefined
      openDialogWith(env, svc, p)
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const at = Date.now()
      const r = ref(db, "admin/ops/deployments")
      const p = push(r)
      await set(p, {
        environment,
        service,
        baseUrl: normalizeBaseUrl(baseUrl) || null,
        version: version.trim() || null,
        gitSha: gitSha.trim() || null,
        buildTime: buildTime.trim() || null,
        deployTime: at,
        createdAt: at,
        source: "manual",
        actor: actor || null,
        notes: notes.trim() || null,
      })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const requestRollback = async (deployment: OpsDeployment) => {
    if (!canRequest) return
    setActionMessage(null)
    try {
      await authedFetch("/actions/request", {
        method: "POST",
        body: JSON.stringify({
          environment: deployment.environment,
          service: deployment.service,
          desired: {
            version: deployment.version || "",
            gitSha: deployment.gitSha || "",
            notes: `Rollback requested from deployment ${deployment.id}${deployment.notes ? ` | ${deployment.notes}` : ""}`,
          },
        }),
      })
      setActionMessage(`Rollback request created for deployment ${deployment.id}.`)
    } catch (e: any) {
      setActionMessage(e?.message || "Failed to request rollback")
    }
  }

  const filtered = deployments.filter((d) => {
    if (envFilter !== "all" && d.environment !== envFilter) return false
    if (serviceFilter !== "all" && d.service !== serviceFilter) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const fields = [d.version, d.gitSha, d.baseUrl, d.source, d.notes, d.actionId, d.executionUrl, ...(d.jiraKeys || [])]
      if (!fields.some((v) => String(v || "").toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Deployments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deployment history log with environment and service tracking.
              </Typography>
            </Box>

            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("dev", "app", devFrontend)}>
                Log Dev App
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("dev", "admin", devFrontend)}>
                Log Dev Admin
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("dev", "mobile", devFrontend)}>
                Log Dev Mobile
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("dev", "main-site", devFrontend)}>
                Log Dev Main Site
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("dev", "api", devApi)}>
                Log Dev API
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("prod", "app", prodFrontend)}>
                Log Prod App
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("prod", "admin", prodFrontend)}>
                Log Prod Admin
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("prod", "mobile", prodFrontend)}>
                Log Prod Mobile
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("prod", "main-site", prodFrontend)}>
                Log Prod Main Site
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openDialogWith("prod", "api", prodApi)}>
                Log Prod API
              </Button>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                Log custom
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Environment</InputLabel>
                <Select label="Environment" value={envFilter} onChange={(e) => setEnvFilter(e.target.value as any)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="dev">Dev</MenuItem>
                  <MenuItem value="prod">Prod</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Service</InputLabel>
                <Select label="Service" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value as any)}>
                  <MenuItem value="all">All</MenuItem>
                  {DEPLOY_SERVICES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="sha / version / Jira / action" />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                Showing {filtered.length} / {deployments.length}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          {actionMessage ? (
            <Typography variant="body2" color={actionMessage.includes("created") ? "text.secondary" : "error"} sx={{ mb: 1.5 }}>
              {actionMessage}
            </Typography>
          ) : null}
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : filtered.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No deployments logged yet.
            </Typography>
          ) : (
            <Stack gap={1}>
              {filtered.slice(0, 200).map((d) => (
                <Box key={d.id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} alignItems={{ xs: "stretch", md: "center" }}>
                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                      <Chip size="small" color={chipColor(d.environment)} label={d.environment.toUpperCase()} />
                      <Chip size="small" color={serviceColor(d.service)} label={d.service.toUpperCase()} />
                      {d.version ? <Chip size="small" variant="outlined" label={`v ${d.version}`} /> : null}
                      {d.gitSha ? <Chip size="small" variant="outlined" label={`sha ${d.gitSha}`} /> : null}
                      {d.source ? <Chip size="small" variant="outlined" label={`source ${d.source}`} /> : null}
                {Array.isArray(d.jiraKeys) && d.jiraKeys.length ? (
                  d.jiraKeys.slice(0, 5).map((k) => (
                    <Chip
                      key={`${d.id}-${k}`}
                      size="small"
                      variant="outlined"
                      label={k}
                      onClick={
                        jiraBaseUrl
                          ? () => window.open(`${jiraBaseUrl.replace(/\/+$/, "")}/browse/${encodeURIComponent(k)}`, "_blank", "noopener,noreferrer")
                          : undefined
                      }
                    />
                  ))
                ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(d.deployTime || d.createdAt).toLocaleString()}
                      {d.actor?.email ? ` • ${d.actor.email}` : ""}
                    </Typography>
                  </Stack>
                  {d.baseUrl ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {d.baseUrl}
                    </Typography>
                  ) : null}
                  {d.buildTime ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Build time: {d.buildTime}
                    </Typography>
                  ) : null}
                  {d.executionUrl ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      <a href={d.executionUrl} target="_blank" rel="noreferrer noopener">
                        Workflow
                      </a>
                      {d.actionId ? ` • action ${d.actionId}` : ""}
                    </Typography>
                  ) : d.actionId ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      action {d.actionId}
                    </Typography>
                  ) : null}
                  {d.notes ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
                      {d.notes}
                    </Typography>
                  ) : null}
                  {canRequest && d.version && d.gitSha ? (
                    <Stack direction="row" gap={1} sx={{ mt: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => requestRollback(d)}>
                        Request rollback
                      </Button>
                    </Stack>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Log deployment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Environment</InputLabel>
                <Select label="Environment" value={environment} onChange={(e) => setEnvironment(e.target.value as OpsEnvironmentKey)}>
                  <MenuItem value="dev">Dev</MenuItem>
                  <MenuItem value="prod">Prod</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select label="Service" value={service} onChange={(e) => setService(e.target.value as OpsServiceKey)}>
                  {DEPLOY_SERVICES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Base URL (optional)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://...web.app" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Version (optional)" value={version} onChange={(e) => setVersion(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Git SHA (optional)" value={gitSha} onChange={(e) => setGitSha(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Build time (optional)" value={buildTime} onChange={(e) => setBuildTime(e.target.value)} placeholder="2026-02-03T12:34:56Z" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

