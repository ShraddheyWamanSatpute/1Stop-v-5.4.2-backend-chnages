import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import BugReportIcon from "@mui/icons-material/BugReport"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import CloudSyncIcon from "@mui/icons-material/CloudSync"
import CodeIcon from "@mui/icons-material/Code"
import DashboardIcon from "@mui/icons-material/Dashboard"
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions"
import LinkIcon from "@mui/icons-material/Link"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import NewReleasesIcon from "@mui/icons-material/NewReleases"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline"
import RefreshIcon from "@mui/icons-material/Refresh"
import { db, push, ref, set } from "../backend/services/Firebase"
import { useAdmin } from "../backend/context/AdminContext"
import OpsDeployments from "./ops/OpsDeployments"
import OpsIntegrations from "./ops/OpsIntegrations"
import OpsActions from "./ops/OpsActions"
import OpsLinks from "./ops/OpsLinks"
import OpsReleases from "./ops/OpsReleases"
import OpsAuthEmails from "./ops/OpsAuthEmails"
import OpsGitCode from "./ops/OpsGitCode"
import BugReportsPanel from "./reports/BugReportsPanel"
import { authedFetch } from "./ops/opsApi"
import type { VersionPayload } from "./ops/opsTypes"
import CollapsibleTabHeader from "../../app/frontend/components/reusable/CollapsibleTabHeader"
import { AdminPageShell, AdminSectionCard } from "./shared/AdminPageShell"

type CheckResult = {
  status: "idle" | "loading" | "ok" | "error"
  ms?: number
  url?: string
  data?: VersionPayload
  error?: string
}

function normalizeBaseUrl(raw: string): string {
  const s = String(raw || "").trim()
  if (!s) return ""
  return s.replace(/\/+$/, "")
}

function safeParseUrl(maybeUrl: string): URL | null {
  try {
    return new URL(maybeUrl)
  } catch {
    return null
  }
}

function isLikelyFirebaseProjectId(s: string | undefined): boolean {
  if (!s) return false
  const v = s.trim()
  if (!v) return false
  // Keep it permissive: Firebase project IDs are typically lowercase with dashes.
  return /^[a-z0-9-]+$/i.test(v)
}

async function copyToClipboard(text: string) {
  const t = String(text || "")
  if (!t) return
  try {
    await navigator.clipboard.writeText(t)
  } catch {
    // Fallback
    const el = document.createElement("textarea")
    el.value = t
    el.style.position = "fixed"
    el.style.left = "-9999px"
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand("copy")
    } finally {
      document.body.removeChild(el)
    }
  }
}

async function fetchJsonWithTiming(url: string, timeoutMs = 8000): Promise<{ ms: number; data: any }> {
  const controller = new AbortController()
  const t0 = performance.now()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
    const ms = performance.now() - t0
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`)
    }
    const data = await res.json()
    return { ms, data }
  } finally {
    window.clearTimeout(timer)
  }
}

function readLocalOpsConfig() {
  try {
    return {
      devBaseUrl: localStorage.getItem("adminOps.devBaseUrl") || "",
      prodBaseUrl: localStorage.getItem("adminOps.prodBaseUrl") || "",
      auditEnabled: localStorage.getItem("adminOps.auditEnabled") === "true",
    }
  } catch {
    return { devBaseUrl: "", prodBaseUrl: "", auditEnabled: false }
  }
}

function writeLocalOpsConfig(next: { devBaseUrl?: string; prodBaseUrl?: string; auditEnabled?: boolean }) {
  try {
    if (typeof next.devBaseUrl === "string") localStorage.setItem("adminOps.devBaseUrl", next.devBaseUrl)
    if (typeof next.prodBaseUrl === "string") localStorage.setItem("adminOps.prodBaseUrl", next.prodBaseUrl)
    if (typeof next.auditEnabled === "boolean") localStorage.setItem("adminOps.auditEnabled", String(next.auditEnabled))
  } catch {
    // ignore
  }
}

export default function AdminOps() {
  const { state } = useAdmin()
  const userAny = state.user as any
  const isAdmin = Boolean(userAny?.isAdmin)
  const opsPerms = (userAny?.adminStaff?.permissions?.ops || userAny?.adminStaff?.permissions?.Ops || null) as any
  const canManageAuthEmails = isAdmin || Boolean(opsPerms?.manageAuthEmails)

  const [devBaseUrl, setDevBaseUrl] = React.useState(() => readLocalOpsConfig().devBaseUrl)
  const [prodBaseUrl, setProdBaseUrl] = React.useState(() => readLocalOpsConfig().prodBaseUrl)
  const [auditEnabled, setAuditEnabled] = React.useState(() => readLocalOpsConfig().auditEnabled)
  const [configLoading, setConfigLoading] = React.useState(false)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [configMessage, setConfigMessage] = React.useState<string | null>(null)
  const [opsCatalog, setOpsCatalog] = React.useState<any>(null)

  const [devFrontend, setDevFrontend] = React.useState<CheckResult>({ status: "idle" })
  const [devApi, setDevApi] = React.useState<CheckResult>({ status: "idle" })
  const [prodFrontend, setProdFrontend] = React.useState<CheckResult>({ status: "idle" })
  const [prodApi, setProdApi] = React.useState<CheckResult>({ status: "idle" })

  const [tab, setTab] = React.useState<
    | "overview"
    | "deployments"
    | "releases"
    | "integrations"
    | "bugReports"
    | "links"
    | "gitCode"
    | "actions"
    | "authEmails"
  >(() => {
    try {
      const v = localStorage.getItem("adminOps.tab") || ""
      if (
        v === "deployments" ||
        v === "releases" ||
        v === "integrations" ||
        v === "bugReports" ||
        v === "overview" ||
        v === "links" ||
        v === "gitCode" ||
        v === "actions" ||
        v === "authEmails"
      )
        return v
    } catch {
      // ignore
    }
    return "overview"
  })
  const [isTabsExpanded, setIsTabsExpanded] = React.useState(true)

  React.useEffect(() => {
    try {
      localStorage.setItem("adminOps.tab", tab)
    } catch {
      // ignore
    }
  }, [tab])

  const runChecks = React.useCallback(async () => {
    const dev = normalizeBaseUrl(devBaseUrl)
    const prod = normalizeBaseUrl(prodBaseUrl)

    const setLoading = (setter: React.Dispatch<React.SetStateAction<CheckResult>>, url: string) =>
      setter({ status: "loading", url })

    const runOne = async (setter: React.Dispatch<React.SetStateAction<CheckResult>>, url: string) => {
      setLoading(setter, url)
      try {
        const { ms, data } = await fetchJsonWithTiming(url)
        setter({ status: "ok", url, ms, data })
      } catch (e: any) {
        setter({ status: "error", url, error: e?.message || "Request failed" })
      }
    }

    const tasks: Array<Promise<void>> = []
    if (dev) {
      tasks.push(runOne(setDevFrontend, `${dev}/version.json`))
      tasks.push(runOne(setDevApi, `${dev}/api/version`))
    } else {
      setDevFrontend({ status: "idle" })
      setDevApi({ status: "idle" })
    }
    if (prod) {
      tasks.push(runOne(setProdFrontend, `${prod}/version.json`))
      tasks.push(runOne(setProdApi, `${prod}/api/version`))
    } else {
      setProdFrontend({ status: "idle" })
      setProdApi({ status: "idle" })
    }

    await Promise.allSettled(tasks)
  }, [devBaseUrl, prodBaseUrl])

  // Persist local fallback live
  React.useEffect(() => {
    writeLocalOpsConfig({ devBaseUrl, prodBaseUrl, auditEnabled })
  }, [devBaseUrl, prodBaseUrl, auditEnabled])

  React.useEffect(() => {
    let active = true
    if (!state.user) return () => {}
    setConfigLoading(true)
    authedFetch("/config", { method: "GET" })
      .then((data: any) => {
        if (!active) return
        const next = data?.config || {}
        setDevBaseUrl((prev) => normalizeBaseUrl(next?.devBaseUrl || prev))
        setProdBaseUrl((prev) => normalizeBaseUrl(next?.prodBaseUrl || prev))
        setOpsCatalog(data?.catalog || null)
      })
      .catch((e: any) => {
        if (!active) return
        setConfigMessage(e?.message || "Failed to load shared Ops config")
      })
      .finally(() => {
        if (active) setConfigLoading(false)
      })
    return () => {
      active = false
    }
  }, [state.user])

  // Optional audit logging (client-side) - disabled by default.
  React.useEffect(() => {
    if (!auditEnabled) return
    const userAny = state.user as any
    const uid = userAny?.uid || ""
    const email = userAny?.email || ""
    if (!uid) return
    const at = Date.now()
    const r = ref(db, "admin/ops/audit/views")
    const p = push(r)
    set(p, {
      uid,
      email,
      at,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    }).catch(() => {})
  }, [auditEnabled, state.user])

  // First load: default dev to current origin if unset, then run checks.
  React.useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1")
    if (!devBaseUrl && origin && !isLocal) {
      setDevBaseUrl(origin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    runChecks()
  }, [runChecks])

  React.useEffect(() => {
    if (!canManageAuthEmails && tab === "authEmails") setTab("overview")
  }, [canManageAuthEmails, tab])

  const opsHeaderTabs = React.useMemo(() => {
    const rows: Array<{ label: string; slug: typeof tab; icon: React.ReactElement }> = [
      { label: "Overview", slug: "overview", icon: <DashboardIcon /> },
      { label: "Deployments", slug: "deployments", icon: <CloudSyncIcon /> },
      { label: "Releases", slug: "releases", icon: <NewReleasesIcon /> },
      { label: "Integrations", slug: "integrations", icon: <IntegrationInstructionsIcon /> },
      { label: "Bug reports", slug: "bugReports", icon: <BugReportIcon /> },
    ]
    if (canManageAuthEmails) {
      rows.push({ label: "Auth Emails", slug: "authEmails", icon: <MailOutlineIcon /> })
    }
    rows.push(
      { label: "Links", slug: "links", icon: <LinkIcon /> },
      { label: "Git & code", slug: "gitCode", icon: <CodeIcon /> },
      { label: "Actions", slug: "actions", icon: <PlayCircleOutlineIcon /> },
    )
    return rows
  }, [canManageAuthEmails])

  const activeTabIndex = React.useMemo(() => {
    const i = opsHeaderTabs.findIndex((row) => row.slug === tab)
    return i >= 0 ? i : 0
  }, [opsHeaderTabs, tab])

  React.useEffect(() => {
    if (opsHeaderTabs.findIndex((row) => row.slug === tab) < 0) setTab("overview")
  }, [opsHeaderTabs, tab])

  const handleOpsTabChange = (_e: React.SyntheticEvent, newValue: number) => {
    const row = opsHeaderTabs[newValue]
    if (row) setTab(row.slug)
  }

  const saveSharedConfig = React.useCallback(async () => {
    setConfigSaving(true)
    setConfigMessage(null)
    try {
      const data = await authedFetch("/config", {
        method: "POST",
        body: JSON.stringify({
          devBaseUrl: normalizeBaseUrl(devBaseUrl),
          prodBaseUrl: normalizeBaseUrl(prodBaseUrl),
        }),
      })
      const next = data?.config || {}
      setDevBaseUrl(normalizeBaseUrl(next?.devBaseUrl || ""))
      setProdBaseUrl(normalizeBaseUrl(next?.prodBaseUrl || ""))
      setOpsCatalog(data?.catalog || null)
      setConfigMessage("Shared Ops config saved.")
    } catch (e: any) {
      setConfigMessage(e?.message || "Failed to save shared Ops config")
    } finally {
      setConfigSaving(false)
    }
  }, [devBaseUrl, prodBaseUrl])

  const renderStatusChip = (r: CheckResult) => {
    if (r.status === "loading") return <Chip size="small" label="Checking…" />
    if (r.status === "ok") return <Chip size="small" color="success" label={`${Math.round(r.ms || 0)}ms`} />
    if (r.status === "error") return <Chip size="small" color="error" label="Error" />
    return <Chip size="small" variant="outlined" label="Not set" />
  }

  const prefillDeploymentLog = React.useCallback(
    (environment: "dev" | "prod", service: "frontend" | "api", payload?: VersionPayload) => {
      try {
        localStorage.setItem(
          "adminOps.deployPrefill",
          JSON.stringify({
            environment,
            service,
            payload: payload
              ? {
                  version: payload.version || "",
                  gitSha: payload.gitSha || "",
                  buildTime: payload.buildTime || "",
                }
              : undefined,
          }),
        )
      } catch {
        // ignore
      }
      setTab("deployments")
    },
    [setTab],
  )

  const envCard = (label: string, baseUrl: string, frontend: CheckResult, api: CheckResult) => {
    const base = normalizeBaseUrl(baseUrl)
    const frontendProject = frontend.data?.environment
    const apiProject = api.data?.environment
    const projectId = (isLikelyFirebaseProjectId(apiProject) && apiProject) || (isLikelyFirebaseProjectId(frontendProject) && frontendProject) || ""
    const siteUrl = base ? base : ""
    const consoleUrl = projectId ? `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/overview` : ""

    const frontendSha = frontend.data?.gitSha || ""
    const apiSha = api.data?.gitSha || ""

    const envKey = label.toLowerCase() === "prod" ? "prod" : "dev"

    return (
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {base ? base : "Set a base URL to enable checks."}
              </Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
              {siteUrl ? (
                <Tooltip title="Open site">
                  <IconButton onClick={() => window.open(siteUrl, "_blank", "noopener,noreferrer")}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              {consoleUrl ? (
                <Tooltip title="Open Firebase Console">
                  <IconButton onClick={() => window.open(consoleUrl, "_blank", "noopener,noreferrer")}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack gap={2}>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                <Typography fontWeight={700}>Frontend</Typography>
                {renderStatusChip(frontend)}
              </Stack>
              {frontend.status === "error" ? (
                <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                  {frontend.error || "Failed"}
                </Typography>
              ) : null}
              {frontend.status === "ok" ? (
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                  <Chip size="small" label={`v ${frontend.data?.version || "unknown"}`} />
                  <Chip size="small" variant="outlined" label={`sha ${frontend.data?.gitSha || "unknown"}`} />
                  {frontendSha ? (
                    <Tooltip title="Copy SHA">
                      <IconButton size="small" onClick={() => copyToClipboard(frontendSha)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => prefillDeploymentLog(envKey, "frontend", frontend.data)}
                  >
                    Log deploy
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {frontend.data?.buildTime ? `build ${frontend.data.buildTime}` : ""}
                  </Typography>
                </Stack>
              ) : null}
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                <Typography fontWeight={700}>API</Typography>
                {renderStatusChip(api)}
              </Stack>
              {api.status === "error" ? (
                <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                  {api.error || "Failed"}
                </Typography>
              ) : null}
              {api.status === "ok" ? (
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                  <Chip size="small" label={`v ${api.data?.version || "unknown"}`} />
                  <Chip size="small" variant="outlined" label={`sha ${api.data?.gitSha || "unknown"}`} />
                  {apiSha ? (
                    <Tooltip title="Copy SHA">
                      <IconButton size="small" onClick={() => copyToClipboard(apiSha)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => prefillDeploymentLog(envKey, "api", api.data)}
                  >
                    Log deploy
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {api.data?.buildTime ? `build ${api.data.buildTime}` : ""}
                  </Typography>
                </Stack>
              ) : null}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const devUrlOk = Boolean(safeParseUrl(normalizeBaseUrl(devBaseUrl)))
  const prodUrlOk = Boolean(safeParseUrl(normalizeBaseUrl(prodBaseUrl)))

  const actor = React.useMemo(() => {
    const userAny = state.user as any
    return {
      uid: userAny?.uid || "",
      email: userAny?.email || "",
    }
  }, [state.user])

  const catalogUrls = React.useMemo(() => {
    const mk = (base: string) => {
      const clean = normalizeBaseUrl(base)
      return {
        mainSite: clean || "",
        app: clean ? `${clean}/App` : "",
        admin: clean ? `${clean}/Admin` : "",
        mobile: clean ? `${clean}/Mobile` : "",
        apiVersion: clean ? `${clean}/api/version` : "",
      }
    }
    return {
      dev: opsCatalog?.urls?.dev || mk(devBaseUrl),
      prod: opsCatalog?.urls?.prod || mk(prodBaseUrl),
    }
  }, [devBaseUrl, opsCatalog, prodBaseUrl])

  const tabBodyPadding = { px: { xs: 2, md: 2.5 }, pb: 2, pt: 2 } as const

  return (
    <AdminPageShell title="Ops" sx={{ height: "100%" }}>
      <AdminSectionCard flush sx={{ flex: 1 }}>
        <CollapsibleTabHeader
          layout="dataHeaderGap"
          tabs={opsHeaderTabs}
          activeTab={activeTabIndex}
          onTabChange={handleOpsTabChange}
          isExpanded={isTabsExpanded}
          onToggleExpanded={() => setIsTabsExpanded((v) => !v)}
        />

        <Box sx={{ flexGrow: 1, overflow: "auto", width: "100%", minHeight: 0 }}>
          {opsHeaderTabs.map((row) => (
            <Box
              key={row.slug}
              sx={{
                display: tab === row.slug ? "block" : "none",
                height: "100%",
                minHeight: 0,
              }}
            >
              {row.slug === "deployments" ? (
                <Box sx={tabBodyPadding}>
                  <OpsDeployments
                    actor={actor}
                    devBaseUrl={devBaseUrl}
                    prodBaseUrl={prodBaseUrl}
                    devFrontend={devFrontend.data}
                    devApi={devApi.data}
                    prodFrontend={prodFrontend.data}
                    prodApi={prodApi.data}
                  />
                </Box>
              ) : null}

              {row.slug === "releases" ? (
                <Box sx={tabBodyPadding}>
                  <OpsReleases
                    actor={actor}
                    devFrontend={devFrontend.data}
                    devApi={devApi.data}
                    prodFrontend={prodFrontend.data}
                    prodApi={prodApi.data}
                  />
                </Box>
              ) : null}

              {row.slug === "integrations" ? (
                <Box sx={tabBodyPadding}>
                  <OpsIntegrations />
                </Box>
              ) : null}

              {row.slug === "bugReports" ? (
                <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
                  <BugReportsPanel embedded />
                </Box>
              ) : null}

              {row.slug === "authEmails" && canManageAuthEmails ? (
                <Box sx={tabBodyPadding}>
                  <OpsAuthEmails />
                </Box>
              ) : null}

              {row.slug === "links" ? (
                <Box sx={tabBodyPadding}>
                  <OpsLinks />
                </Box>
              ) : null}

              {row.slug === "gitCode" ? (
                <Box sx={tabBodyPadding}>
                  <OpsGitCode onGoToActions={() => setTab("actions")} />
                </Box>
              ) : null}

              {row.slug === "actions" ? (
                <Box sx={tabBodyPadding}>
                  <OpsActions />
                </Box>
              ) : null}

              {row.slug !== "overview" ? null : (
                <Box sx={tabBodyPadding}>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => void runChecks()}
                    >
                      Refresh checks
                    </Button>
                  </Stack>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Environments
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dev base URL"
                value={devBaseUrl}
                onChange={(e) => setDevBaseUrl(e.target.value)}
                placeholder="https://your-dev-site.web.app"
                error={Boolean(devBaseUrl) && !devUrlOk}
                helperText={Boolean(devBaseUrl) && !devUrlOk ? "Invalid URL" : "Shared across the Ops team when saved. Example: https://stop-test-8025f.web.app"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prod base URL"
                value={prodBaseUrl}
                onChange={(e) => setProdBaseUrl(e.target.value)}
                placeholder="https://your-prod-site.web.app"
                error={Boolean(prodBaseUrl) && !prodUrlOk}
                helperText={Boolean(prodBaseUrl) && !prodUrlOk ? "Invalid URL" : "Shared across the Ops team when saved. Example: https://onestop-f493a.web.app"}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                size="small"
                variant="text"
                onClick={() => setDevBaseUrl(window.location.origin)}
                disabled={typeof window === "undefined"}
              >
                Use current as Dev
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setDevBaseUrl("")
                  setProdBaseUrl("")
                }}
              >
                Clear
              </Button>
              {isAdmin ? (
                <Button
                  size="small"
                  variant="contained"
                  onClick={saveSharedConfig}
                  disabled={configSaving || configLoading || (Boolean(devBaseUrl) && !devUrlOk) || (Boolean(prodBaseUrl) && !prodUrlOk)}
                >
                  {configSaving ? "Saving..." : "Save shared config"}
                </Button>
              ) : null}
            </Stack>

            <Stack direction="row" gap={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Audit “viewed Ops page”
              </Typography>
              <Switch checked={auditEnabled} onChange={(_e, v) => setAuditEnabled(v)} />
            </Stack>
          </Stack>
          {configLoading ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Loading shared Ops config...
            </Typography>
          ) : null}
          {configMessage ? (
            <Typography
              variant="caption"
              color={configMessage.includes("saved") ? "text.secondary" : "error"}
              sx={{ display: "block", mt: 1.5 }}
            >
              {configMessage}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Deploy Matrix And Config
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                Deploy targets
              </Typography>
                  <Stack gap={0.75}>
                {(opsCatalog?.services || []).map((service: any) => (
                  <Typography key={String(service?.key || "")} variant="body2" color="text.secondary">
                    {String(service?.label || service?.key || "")}: {String(service?.buildCommand || "")} {"->"} {String(service?.deployOnly || "")}
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                Test URLs
              </Typography>
              <Stack gap={0.75}>
                <Typography variant="body2" color="text.secondary">Main Site: {catalogUrls.dev.mainSite || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">App: {catalogUrls.dev.app || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">Admin: {catalogUrls.dev.admin || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">Mobile: {catalogUrls.dev.mobile || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">API: {catalogUrls.dev.apiVersion || "Not set"}</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                Production URLs
              </Typography>
              <Stack gap={0.75}>
                <Typography variant="body2" color="text.secondary">Main Site: {catalogUrls.prod.mainSite || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">App: {catalogUrls.prod.app || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">Admin: {catalogUrls.prod.admin || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">Mobile: {catalogUrls.prod.mobile || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">API: {catalogUrls.prod.apiVersion || "Not set"}</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                Firebase
              </Typography>
              <Stack gap={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Test: {opsCatalog?.firebase?.dev?.projectId || "Not set"} / target {opsCatalog?.firebase?.dev?.hostingTarget || "Not set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sites: main {opsCatalog?.firebase?.dev?.sites?.mainSite || "Not set"}, app {opsCatalog?.firebase?.dev?.sites?.app || "Not set"}, admin {opsCatalog?.firebase?.dev?.sites?.admin || "Not set"}, mobile {opsCatalog?.firebase?.dev?.sites?.mobile || "Not set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prod: {opsCatalog?.firebase?.prod?.projectId || "Not set"} / target {opsCatalog?.firebase?.prod?.hostingTarget || "Not set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sites: main {opsCatalog?.firebase?.prod?.sites?.mainSite || "Not set"}, app {opsCatalog?.firebase?.prod?.sites?.app || "Not set"}, admin {opsCatalog?.firebase?.prod?.sites?.admin || "Not set"}, mobile {opsCatalog?.firebase?.prod?.sites?.mobile || "Not set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Functions region: {opsCatalog?.firebase?.functionsRegion || "Not set"}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                GitHub
              </Typography>
              <Stack gap={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Repo: {opsCatalog?.github?.owner && opsCatalog?.github?.repo ? `${opsCatalog.github.owner}/${opsCatalog.github.repo}` : "Not set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">Workflow: {opsCatalog?.github?.workflow || "Not set"}</Typography>
                <Typography variant="body2" color="text.secondary">Default ref: {opsCatalog?.github?.ref || "main"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Download latest: {opsCatalog?.github?.downloadLatestConfigured ? "Configured" : "Missing config"}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={700} sx={{ mb: 0.75 }}>
                Ops runtime
              </Typography>
              <Stack gap={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Execution: {opsCatalog?.ops?.executionEnabled ? "Enabled" : "Disabled"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approvals: test {String(opsCatalog?.ops?.approvalsRequired?.dev ?? "1")} / prod {String(opsCatalog?.ops?.approvalsRequired?.prod ?? "1")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Self approve: {opsCatalog?.ops?.allowSelfApprove ? "Allowed" : "Blocked"}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {envCard("Dev", devBaseUrl, devFrontend, devApi)}
        </Grid>
        <Grid item xs={12} md={6}>
          {envCard("Prod", prodBaseUrl, prodFrontend, prodApi)}
        </Grid>
      </Grid>

                </Box>
              )}

            </Box>
          ))}
        </Box>
      </AdminSectionCard>
    </AdminPageShell>
  )
}

