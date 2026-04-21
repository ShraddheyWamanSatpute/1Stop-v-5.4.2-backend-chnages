import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import SyncIcon from "@mui/icons-material/Sync"
import { db, onValue, ref } from "../../backend/services/Firebase"
import { useAdmin } from "../../backend/context/AdminContext"
import { authedFetch } from "./opsApi"
import type { OpsAction, OpsEnvironmentKey, OpsServiceKey } from "./opsTypes"

const REQUESTABLE_SERVICES: Array<{ value: OpsServiceKey; label: string }> = [
  { value: "main-site", label: "Main Site" },
  { value: "app", label: "App" },
  { value: "admin", label: "Admin" },
  { value: "mobile", label: "Mobile" },
  { value: "api", label: "API" },
  { value: "all", label: "All" },
]

function toActions(val: any): OpsAction[] {
  const entries = Object.entries(val || {}) as Array<[string, any]>
  const rows = entries.map(([id, raw]) => ({
    id,
    kind: "deploy" as const,
    status: String(raw?.status || "requested") as any,
    environment: String(raw?.environment || "dev") as any,
    service: String(raw?.service || "frontend") as any,
    requestedAt: Number(raw?.requestedAt || 0),
    requestedBy: raw?.requestedBy || undefined,
    approvals: Array.isArray(raw?.approvals) ? raw.approvals : undefined,
    requiredApprovals: raw?.requiredApprovals ? Number(raw.requiredApprovals) : undefined,
    approvedAt: raw?.approvedAt ? Number(raw.approvedAt) : undefined,
    approvedBy: raw?.approvedBy || undefined,
    cancelledAt: raw?.cancelledAt ? Number(raw.cancelledAt) : undefined,
    cancelledBy: raw?.cancelledBy || undefined,
    deploymentId: raw?.deploymentId ? String(raw.deploymentId) : undefined,
    desired: raw?.desired || undefined,
    execution: raw?.execution
      ? {
          ...raw.execution,
          startedAt: raw.execution?.startedAt ? Number(raw.execution.startedAt) : undefined,
          finishedAt: raw.execution?.finishedAt ? Number(raw.execution.finishedAt) : undefined,
          updatedAt: raw.execution?.updatedAt ? Number(raw.execution.updatedAt) : undefined,
        }
      : undefined,
  }))
  return rows
    .filter((a) => a.requestedAt)
    .sort((a, b) => Number(b.requestedAt || 0) - Number(a.requestedAt || 0))
}

function statusColor(s: OpsAction["status"]): "default" | "warning" | "success" | "error" | "info" {
  if (s === "requested") return "warning"
  if (s === "approved") return "info"
  if (s === "running") return "info"
  if (s === "succeeded") return "success"
  if (s === "failed") return "error"
  if (s === "cancelled") return "default"
  return "default"
}

export default function OpsActions() {
  const { state } = useAdmin()
  const userAny = state.user as any
  const isAdmin = Boolean(userAny?.isAdmin)

  const opsPerms = (userAny?.adminStaff?.permissions?.ops || userAny?.adminStaff?.permissions?.Ops || null) as any
  const canRequest = isAdmin || Boolean(opsPerms?.request)
  const canApproveDev = isAdmin || Boolean(opsPerms?.approveTest)
  const canApproveProd = isAdmin || Boolean(opsPerms?.approveProd)
  const canProcessDev = isAdmin || (Boolean(opsPerms?.process) && Boolean(opsPerms?.approveTest))
  const canProcessProd = isAdmin || (Boolean(opsPerms?.process) && Boolean(opsPerms?.approveProd))

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actions, setActions] = React.useState<OpsAction[]>([])

  const [environment, setEnvironment] = React.useState<OpsEnvironmentKey>("dev")
  const [service, setService] = React.useState<OpsServiceKey>("app")
  const [version, setVersion] = React.useState("")
  const [gitSha, setGitSha] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const [working, setWorking] = React.useState(false)

  React.useEffect(() => {
    const r = ref(db, "admin/ops/actions")
    const unsub = onValue(r, (snap) => {
      setActions(toActions(snap.val()))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const requestDeploy = async () => {
    setWorking(true)
    setError(null)
    try {
      await authedFetch("/actions/request", {
        method: "POST",
        body: JSON.stringify({
          environment,
          service,
          desired: { version: version.trim(), gitSha: gitSha.trim(), notes: notes.trim() },
        }),
      })
      setNotes("")
    } catch (e: any) {
      setError(e?.message || "Request failed")
    } finally {
      setWorking(false)
    }
  }

  const approve = async (id: string) => {
    setWorking(true)
    setError(null)
    try {
      await authedFetch("/actions/approve", { method: "POST", body: JSON.stringify({ id }) })
    } catch (e: any) {
      setError(e?.message || "Approve failed")
    } finally {
      setWorking(false)
    }
  }

  const cancel = async (id: string) => {
    setWorking(true)
    setError(null)
    try {
      await authedFetch("/actions/cancel", { method: "POST", body: JSON.stringify({ id }) })
    } catch (e: any) {
      setError(e?.message || "Cancel failed")
    } finally {
      setWorking(false)
    }
  }

  const processNow = async (env?: OpsEnvironmentKey) => {
    setWorking(true)
    setError(null)
    try {
      await authedFetch("/actions/process", { method: "POST", body: JSON.stringify(env ? { environment: env } : {}) })
    } catch (e: any) {
      setError(e?.message || "Process failed")
    } finally {
      setWorking(false)
    }
  }

  const canCancel = React.useCallback(
    (action: OpsAction) => {
      if (isAdmin) return true
      const isRequester = Boolean(action.requestedBy?.uid) && action.requestedBy?.uid === userAny?.uid
      if (isRequester) return true
      if (action.environment === "dev") return canApproveDev || Boolean(opsPerms?.process)
      if (action.environment === "prod") return canApproveProd || Boolean(opsPerms?.process)
      return false
    },
    [canApproveDev, canApproveProd, isAdmin, opsPerms?.process, userAny?.uid],
  )

  const approvalSummary = React.useCallback((action: OpsAction) => {
    const current = Array.isArray(action.approvals) ? action.approvals.length : 0
    const required = Number(action.requiredApprovals || (action.environment === "prod" ? 2 : 1))
    return `${current}/${required}`
  }, [])

  const executionTimestamp = React.useCallback((action: OpsAction) => {
    const at = action.execution?.updatedAt || action.execution?.finishedAt || action.execution?.startedAt
    return at ? new Date(at).toLocaleString() : ""
  }, [])

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Request, approve, and execute deployment actions.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          {canProcessDev ? (
            <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => processNow("dev")} disabled={working}>
              Process Dev
            </Button>
          ) : null}
          {canProcessProd ? (
            <Button variant="outlined" color="error" startIcon={<SyncIcon />} onClick={() => processNow("prod")} disabled={working}>
              Process Prod
            </Button>
          ) : null}
          {isAdmin ? (
            <Button variant="outlined" startIcon={<SyncIcon />} onClick={() => processNow()} disabled={working}>
              Process all
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error ? (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Request a deploy
          </Typography>
          {!canRequest ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              You can review action history here, but you do not have permission to request deployments.
            </Typography>
          ) : null}
          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mb: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Environment</InputLabel>
              <Select label="Environment" value={environment} onChange={(e) => setEnvironment(e.target.value as OpsEnvironmentKey)} disabled={!canRequest}>
                <MenuItem value="dev">Dev</MenuItem>
                <MenuItem value="prod">Prod</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Service</InputLabel>
              <Select label="Service" value={service} onChange={(e) => setService(e.target.value as OpsServiceKey)} disabled={!canRequest}>
                {REQUESTABLE_SERVICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Version (optional)" value={version} onChange={(e) => setVersion(e.target.value)} disabled={!canRequest} />
            <TextField size="small" label="Git SHA (optional)" value={gitSha} onChange={(e) => setGitSha(e.target.value)} disabled={!canRequest} />
          </Stack>
          <TextField
            size="small"
            fullWidth
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What is changing? Any rollout notes?"
            sx={{ mb: 1.5 }}
            disabled={!canRequest}
          />
          <Button variant="contained" onClick={requestDeploy} disabled={working || !canRequest}>
            Request deploy
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Recent actions
          </Typography>
          <Divider sx={{ mb: 1.5 }} />

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : actions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No actions yet.
            </Typography>
          ) : (
            <Stack gap={1}>
              {actions.slice(0, 30).map((a) => (
                <Card key={a.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} alignItems={{ xs: "stretch", md: "center" }}>
                      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <Chip size="small" color={statusColor(a.status)} label={String(a.status).toUpperCase()} />
                        <Chip size="small" variant="outlined" label={`${String(a.environment).toUpperCase()} • ${String(a.service).toUpperCase()}`} />
                        {a.desired?.version ? <Chip size="small" variant="outlined" label={`v ${a.desired.version}`} /> : null}
                        {a.desired?.gitSha ? <Chip size="small" variant="outlined" label={`sha ${a.desired.gitSha}`} /> : null}
                        <Chip size="small" variant="outlined" label={`Approvals ${approvalSummary(a)}`} />
                        {a.deploymentId ? <Chip size="small" variant="outlined" label={`Deployment ${a.deploymentId}`} /> : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(a.requestedAt).toLocaleString()}
                        {a.requestedBy?.email ? ` • ${a.requestedBy.email}` : ""}
                      </Typography>
                    </Stack>

                    {Array.isArray(a.approvals) && a.approvals.length ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Approved by:{" "}
                        {a.approvals
                          .map((ap) => String(ap?.email || ap?.uid || "").trim())
                          .filter(Boolean)
                          .slice(0, 5)
                          .join(", ")}
                      </Typography>
                    ) : null}

                    {a.desired?.notes ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {a.desired.notes}
                      </Typography>
                    ) : null}

                    {a.execution?.message ? (
                      <Typography variant="caption" color={a.execution.ok ? "text.secondary" : "error"} sx={{ display: "block", mt: 1 }}>
                        {a.execution.message}
                        {a.execution.externalUrl ? ` • ${a.execution.externalUrl}` : ""}
                      </Typography>
                    ) : null}

                    {executionTimestamp(a) ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Last update: {executionTimestamp(a)}
                      </Typography>
                    ) : null}

                    <Stack direction="row" gap={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                      {a.status === "requested" && ((a.environment === "dev" && canApproveDev) || (a.environment === "prod" && canApproveProd)) ? (
                        <Button size="small" variant="contained" onClick={() => approve(a.id)} disabled={working}>
                          Approve
                        </Button>
                      ) : null}
                      {a.execution?.externalUrl ? (
                        <Button size="small" variant="text" onClick={() => window.open(a.execution?.externalUrl || "", "_blank", "noopener,noreferrer")}>
                          Open workflow
                        </Button>
                      ) : null}
                      {(a.status === "requested" || a.status === "approved" || a.status === "running") && canCancel(a) ? (
                        <Button size="small" variant="outlined" onClick={() => cancel(a.id)} disabled={working}>
                          Cancel
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

