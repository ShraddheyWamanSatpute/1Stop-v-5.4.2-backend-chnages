import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import SyncIcon from "@mui/icons-material/Sync"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { db, onValue, ref } from "../../backend/services/Firebase"
import { useAdmin } from "../../backend/context/AdminContext"
import { authedBlobFetch, authedFetch } from "./opsApi"

type GitHubStatus = {
  configured: boolean
  owner: string | null
  repo: string | null
  lastError?: null | { at: number; message: string }
  lastSync: null | {
    at?: number
    counts?: { commits?: number; releases?: number }
    actor?: { uid?: string; email?: string }
    ok?: boolean
    error?: string
  }
}

type JiraStatus = {
  configured: boolean
  baseUrl: string | null
  projectKey: string | null
  lastError?: null | { at: number; message: string }
  lastSync: null | {
    at?: number
    counts?: { issues?: number }
    actor?: { uid?: string; email?: string }
    ok?: boolean
    error?: string
  }
}

type JenkinsStatus = {
  configured: boolean
  baseUrl: string | null
  lastError?: null | { at: number; message: string }
  lastSync: null | {
    at?: number
    counts?: { builds?: number }
    actor?: { uid?: string; email?: string }
    ok?: boolean
    error?: string
  }
}

type GitHubCommitRow = {
  sha: string
  message: string
  author: string | null
  date: string | null
  url: string | null
}

type GitHubReleaseRow = {
  id: string | null
  tag: string | null
  name: string | null
  draft: boolean
  prerelease: boolean
  createdAt: string | null
  publishedAt: string | null
  url: string | null
}

type JiraIssueRow = {
  key: string
  id: string | null
  summary: string | null
  status: string | null
  updated: string | null
  url: string | null
}

type JenkinsBuildRow = {
  number: number | null
  url: string | null
  result: string | null
  durationMs: number | null
  timestamp: number | null
}

async function copyToClipboard(text: string) {
  const t = String(text || "")
  if (!t) return
  try {
    await navigator.clipboard.writeText(t)
  } catch {
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

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase()
}

function includesAny(haystack: any, q: string): boolean {
  const qq = norm(q)
  if (!qq) return true
  return norm(haystack).includes(qq)
}

function ageMs(at?: number | null): number | null {
  if (!at || typeof at !== "number") return null
  const ms = Date.now() - at
  return Number.isFinite(ms) ? ms : null
}

function stalenessLabel(ms: number): { label: string; color: "success" | "warning" | "error" } {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  if (ms > 24 * 60 * 60000) return { label: `Stale (${hours}h)`, color: "error" }
  if (ms > 2 * 60 * 60000) return { label: `Old (${hours}h)`, color: "warning" }
  return { label: `Fresh (${minutes}m)`, color: "success" }
}

export default function OpsIntegrations() {
  const { state } = useAdmin()
  const userAny = state.user as any
  const isAdmin = Boolean(userAny?.isAdmin)
  const opsPerms = (userAny?.adminStaff?.permissions?.ops || userAny?.adminStaff?.permissions?.Ops || null) as any
  const canSyncProviders = isAdmin || Boolean(opsPerms?.syncProviders)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [github, setGithub] = React.useState<GitHubStatus | null>(null)
  const [jira, setJira] = React.useState<JiraStatus | null>(null)
  const [jenkins, setJenkins] = React.useState<JenkinsStatus | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const [enriching, setEnriching] = React.useState(false)
  const [downloading, setDownloading] = React.useState(false)
  const [enrichResult, setEnrichResult] = React.useState<{ touched?: number } | null>(null)

  const [view, setView] = React.useState<"status" | "data">(() => {
    try {
      const v = localStorage.getItem("adminOps.integrationsView") || ""
      if (v === "data" || v === "status") return v
    } catch {
      // ignore
    }
    return "status"
  })

  React.useEffect(() => {
    try {
      localStorage.setItem("adminOps.integrationsView", view)
    } catch {
      // ignore
    }
  }, [view])

  // Provider caches (RTDB) - filled by sync jobs.
  const [ghCommits, setGhCommits] = React.useState<GitHubCommitRow[]>([])
  const [ghReleases, setGhReleases] = React.useState<GitHubReleaseRow[]>([])
  const [jiraIssues, setJiraIssues] = React.useState<JiraIssueRow[]>([])
  const [jenkinsBuilds, setJenkinsBuilds] = React.useState<JenkinsBuildRow[]>([])

  // Filters (provider data view)
  const [ghCommitQuery, setGhCommitQuery] = React.useState("")
  const [ghReleaseQuery, setGhReleaseQuery] = React.useState("")
  const [jiraQuery, setJiraQuery] = React.useState("")
  const [jiraStatus, setJiraStatus] = React.useState<"all" | string>("all")
  const [jenkinsQuery, setJenkinsQuery] = React.useState("")
  const [jenkinsResult, setJenkinsResult] = React.useState<"all" | string>("all")

  const jiraStatuses = React.useMemo(() => {
    const set = new Set<string>()
    jiraIssues.forEach((i) => {
      const s = String(i.status || "").trim()
      if (s) set.add(s)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [jiraIssues])

  const jenkinsResults = React.useMemo(() => {
    const set = new Set<string>()
    jenkinsBuilds.forEach((b) => {
      const r = String(b.result || "").trim()
      if (r) set.add(r)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [jenkinsBuilds])

  const filteredGhCommits = React.useMemo(() => {
    return ghCommits.filter((c) => {
      if (!ghCommitQuery.trim()) return true
      const q = ghCommitQuery.trim()
      return (
        includesAny(c.sha, q) ||
        includesAny(c.message, q) ||
        includesAny(c.author, q) ||
        includesAny(c.date, q)
      )
    })
  }, [ghCommits, ghCommitQuery])

  const filteredGhReleases = React.useMemo(() => {
    return ghReleases.filter((r) => {
      if (!ghReleaseQuery.trim()) return true
      const q = ghReleaseQuery.trim()
      return includesAny(r.tag, q) || includesAny(r.name, q) || includesAny(r.publishedAt, q)
    })
  }, [ghReleases, ghReleaseQuery])

  const filteredJiraIssues = React.useMemo(() => {
    return jiraIssues.filter((i) => {
      if (jiraStatus !== "all" && String(i.status || "") !== jiraStatus) return false
      if (!jiraQuery.trim()) return true
      const q = jiraQuery.trim()
      return includesAny(i.key, q) || includesAny(i.summary, q) || includesAny(i.status, q)
    })
  }, [jiraIssues, jiraQuery, jiraStatus])

  const filteredJenkinsBuilds = React.useMemo(() => {
    return jenkinsBuilds.filter((b) => {
      if (jenkinsResult !== "all" && String(b.result || "") !== jenkinsResult) return false
      if (!jenkinsQuery.trim()) return true
      const q = jenkinsQuery.trim()
      return includesAny(b.number, q) || includesAny(b.result, q) || includesAny(b.url, q)
    })
  }, [jenkinsBuilds, jenkinsQuery, jenkinsResult])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [gh, ji, je] = await Promise.all([
        authedFetch("/github/status", { method: "GET" }) as Promise<GitHubStatus>,
        authedFetch("/jira/status", { method: "GET" }) as Promise<JiraStatus>,
        authedFetch("/jenkins/status", { method: "GET" }) as Promise<JenkinsStatus>,
      ])
      setGithub(gh)
      setJira(ji)
      setJenkins(je)
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  React.useEffect(() => {
    const unsubs: Array<() => void> = []
    // GitHub commits
    unsubs.push(
      onValue(ref(db, "admin/ops/providers/github/commits"), (snap) => {
        const v = snap.val()
        setGhCommits(Array.isArray(v) ? (v as GitHubCommitRow[]) : [])
      }),
    )
    // GitHub releases
    unsubs.push(
      onValue(ref(db, "admin/ops/providers/github/releases"), (snap) => {
        const v = snap.val()
        setGhReleases(Array.isArray(v) ? (v as GitHubReleaseRow[]) : [])
      }),
    )
    // Jira issues
    unsubs.push(
      onValue(ref(db, "admin/ops/providers/jira/issues"), (snap) => {
        const v = snap.val()
        setJiraIssues(Array.isArray(v) ? (v as JiraIssueRow[]) : [])
      }),
    )
    // Jenkins builds
    unsubs.push(
      onValue(ref(db, "admin/ops/providers/jenkins/builds"), (snap) => {
        const v = snap.val()
        setJenkinsBuilds(Array.isArray(v) ? (v as JenkinsBuildRow[]) : [])
      }),
    )

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [])

  const syncGitHub = async () => {
    setSyncing(true)
    setError(null)
    try {
      await authedFetch("/github/sync", { method: "POST", body: "{}" })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const syncJira = async () => {
    setSyncing(true)
    setError(null)
    try {
      await authedFetch("/jira/sync", { method: "POST", body: "{}" })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const syncJenkins = async () => {
    setSyncing(true)
    setError(null)
    try {
      await authedFetch("/jenkins/sync", { method: "POST", body: "{}" })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const enrichDeployments = async () => {
    setEnriching(true)
    setError(null)
    setEnrichResult(null)
    try {
      const r = (await authedFetch("/links/enrichDeployments", { method: "POST", body: "{}" })) as any
      setEnrichResult({ touched: Number(r?.touched || 0) })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Enrich failed")
    } finally {
      setEnriching(false)
    }
  }

  const downloadLatestCode = async () => {
    setDownloading(true)
    setError(null)
    try {
      const { blob, contentDisposition, contentType } = await authedBlobFetch("/github/downloadLatest", { method: "GET" })
      const match = /filename="?([^"]+)"?/i.exec(contentDisposition || "")
      const filename = match?.[1] || `latest-code.${String(contentType || "").includes("zip") ? "zip" : "bin"}`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Integrations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            GitHub, Jira, and Jenkins connectors. View sync status and trigger manual syncs.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Tabs value={view} onChange={(_e, v) => setView(v)} textColor="primary" indicatorColor="primary">
            <Tab value="status" label="Status" />
            <Tab value="data" label="Provider data" />
          </Tabs>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading || syncing}>
            Refresh
          </Button>
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

      {view === "status" ? (
        <>
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography fontWeight={900}>GitHub</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {github?.configured ? `Connected to ${github.owner}/${github.repo}` : "Not configured"}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
                  <Button variant="outlined" onClick={downloadLatestCode} disabled={downloading || !github?.configured}>
                    {downloading ? "Downloading..." : "Download latest code"}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SyncIcon />}
                    onClick={syncGitHub}
                    disabled={loading || syncing || !github?.configured || !canSyncProviders}
                  >
                    Sync now
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              ) : github?.lastSync?.at ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Last sync: {new Date(github.lastSync.at).toLocaleString()} • commits {github.lastSync.counts?.commits ?? 0} • releases{" "}
                    {github.lastSync.counts?.releases ?? 0}
                  </Typography>
                  {ageMs(github.lastSync.at) != null ? (
                    <Chip
                      size="small"
                      color={stalenessLabel(ageMs(github.lastSync.at) as number).color}
                      label={stalenessLabel(ageMs(github.lastSync.at) as number).label}
                    />
                  ) : null}
                  {github?.lastError?.message ? (
                    <Chip size="small" color="error" variant="outlined" label={`Last error: ${github.lastError.message}`} />
                  ) : null}
                </Stack>
              ) : github?.lastError?.message ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    No sync recorded yet.
                  </Typography>
                  <Chip size="small" color="error" variant="outlined" label={`Last error: ${github.lastError.message}`} />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sync recorded yet.
                </Typography>
              )}
              {ghCommits[0]?.sha ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Latest cached commit: {ghCommits[0].sha.slice(0, 12)} {ghCommits[0].message ? `- ${ghCommits[0].message}` : ""}
                </Typography>
              ) : null}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography fontWeight={900}>Jira</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {jira?.configured ? `Connected (${jira.projectKey || "all projects"})` : "Not configured"}
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<SyncIcon />} onClick={syncJira} disabled={loading || syncing || !jira?.configured || !canSyncProviders}>
                  Sync now
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              ) : jira?.lastSync?.at ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Last sync: {new Date(jira.lastSync.at).toLocaleString()} • issues {jira.lastSync.counts?.issues ?? 0}
                  </Typography>
                  {ageMs(jira.lastSync.at) != null ? (
                    <Chip
                      size="small"
                      color={stalenessLabel(ageMs(jira.lastSync.at) as number).color}
                      label={stalenessLabel(ageMs(jira.lastSync.at) as number).label}
                    />
                  ) : null}
                  {jira?.lastError?.message ? (
                    <Chip size="small" color="error" variant="outlined" label={`Last error: ${jira.lastError.message}`} />
                  ) : null}
                </Stack>
              ) : jira?.lastError?.message ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    No sync recorded yet.
                  </Typography>
                  <Chip size="small" color="error" variant="outlined" label={`Last error: ${jira.lastError.message}`} />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sync recorded yet.
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography fontWeight={900}>Jenkins</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {jenkins?.configured ? "Connected" : "Not configured"}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={syncJenkins}
                  disabled={loading || syncing || !jenkins?.configured || !canSyncProviders}
                >
                  Sync now
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              ) : jenkins?.lastSync?.at ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Last sync: {new Date(jenkins.lastSync.at).toLocaleString()} • builds {jenkins.lastSync.counts?.builds ?? 0}
                  </Typography>
                  {ageMs(jenkins.lastSync.at) != null ? (
                    <Chip
                      size="small"
                      color={stalenessLabel(ageMs(jenkins.lastSync.at) as number).color}
                      label={stalenessLabel(ageMs(jenkins.lastSync.at) as number).label}
                    />
                  ) : null}
                  {jenkins?.lastError?.message ? (
                    <Chip size="small" color="error" variant="outlined" label={`Last error: ${jenkins.lastError.message}`} />
                  ) : null}
                </Stack>
              ) : jenkins?.lastError?.message ? (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    No sync recorded yet.
                  </Typography>
                  <Chip size="small" color="error" variant="outlined" label={`Last error: ${jenkins.lastError.message}`} />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sync recorded yet.
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography fontWeight={900}>Linking</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attach Jira keys to deployments (based on commit messages).
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<SyncIcon />} onClick={enrichDeployments} disabled={loading || syncing || enriching || !canSyncProviders}>
                  {enriching ? "Enriching…" : "Enrich now"}
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              {!canSyncProviders ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  You can view provider status here, but sync and enrichment require Ops sync permissions.
                </Typography>
              ) : null}
              {enrichResult ? (
                <Typography variant="body2" color="text.secondary">
                  Updated deployments: {enrichResult.touched ?? 0}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Uses cached GitHub commit → Jira-key mapping.
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                GitHub commits (latest)
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} gap={1} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Search commits"
                  value={ghCommitQuery}
                  onChange={(e) => setGhCommitQuery(e.target.value)}
                  placeholder="sha / message / author"
                />
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>
                  Showing {Math.min(25, filteredGhCommits.length)} / {ghCommits.length}
                </Typography>
              </Stack>
              {ghCommits.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet. Configure GitHub env vars and click Sync.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>SHA</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredGhCommits.slice(0, 25).map((c) => (
                        <TableRow key={c.sha}>
                          <TableCell sx={{ fontFamily: "monospace" }}>
                            {c.sha.slice(0, 8)}
                            <Tooltip title="Copy SHA">
                              <IconButton size="small" onClick={() => copyToClipboard(c.sha)}>
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{String(c.message || "").split("\n")[0]}</TableCell>
                          <TableCell>{c.date ? new Date(c.date).toLocaleString() : ""}</TableCell>
                          <TableCell align="right">
                            {c.url ? (
                              <Tooltip title="Open in GitHub">
                                <IconButton size="small" onClick={() => window.open(c.url || "", "_blank", "noopener,noreferrer")}>
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                GitHub releases (latest)
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} gap={1} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Search releases"
                  value={ghReleaseQuery}
                  onChange={(e) => setGhReleaseQuery(e.target.value)}
                  placeholder="tag / name"
                />
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>
                  Showing {Math.min(25, filteredGhReleases.length)} / {ghReleases.length}
                </Typography>
              </Stack>
              {ghReleases.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tag</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Published</TableCell>
                        <TableCell align="right">Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredGhReleases.slice(0, 25).map((r, idx) => (
                        <TableRow key={`${r.id || "rel"}-${idx}`}>
                          <TableCell sx={{ fontFamily: "monospace" }}>{r.tag || ""}</TableCell>
                          <TableCell>{r.name || ""}</TableCell>
                          <TableCell>{r.publishedAt ? new Date(r.publishedAt).toLocaleString() : ""}</TableCell>
                          <TableCell align="right">
                            {r.url ? (
                              <Tooltip title="Open release">
                                <IconButton size="small" onClick={() => window.open(r.url || "", "_blank", "noopener,noreferrer")}>
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Jira issues (latest)
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} gap={1} sx={{ mb: 1.5 }} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Search issues"
                  value={jiraQuery}
                  onChange={(e) => setJiraQuery(e.target.value)}
                  placeholder="key / summary"
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={jiraStatus} onChange={(e) => setJiraStatus(e.target.value as any)}>
                    <MenuItem value="all">All</MenuItem>
                    {jiraStatuses.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  Showing {Math.min(25, filteredJiraIssues.length)} / {jiraIssues.length}
                </Typography>
              </Stack>
              {jiraIssues.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet. Configure Jira env vars and click Sync.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Summary</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Updated</TableCell>
                        <TableCell align="right">Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredJiraIssues.slice(0, 25).map((i) => (
                        <TableRow key={i.key || String(i.id || Math.random())}>
                          <TableCell sx={{ fontFamily: "monospace" }}>{i.key}</TableCell>
                          <TableCell>{i.summary || ""}</TableCell>
                          <TableCell>{i.status || ""}</TableCell>
                          <TableCell>{i.updated ? new Date(i.updated).toLocaleString() : ""}</TableCell>
                          <TableCell align="right">
                            {i.url ? (
                              <Tooltip title="Open in Jira">
                                <IconButton size="small" onClick={() => window.open(i.url || "", "_blank", "noopener,noreferrer")}>
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Jenkins builds (latest)
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} gap={1} sx={{ mb: 1.5 }} alignItems={{ xs: "stretch", md: "center" }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Search builds"
                  value={jenkinsQuery}
                  onChange={(e) => setJenkinsQuery(e.target.value)}
                  placeholder="# / result"
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Result</InputLabel>
                  <Select label="Result" value={jenkinsResult} onChange={(e) => setJenkinsResult(e.target.value as any)}>
                    <MenuItem value="all">All</MenuItem>
                    {jenkinsResults.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  Showing {Math.min(25, filteredJenkinsBuilds.length)} / {jenkinsBuilds.length}
                </Typography>
              </Stack>
              {jenkinsBuilds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet. Configure Jenkins env vars and click Sync.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>When</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell align="right">Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredJenkinsBuilds.slice(0, 25).map((b, idx) => (
                        <TableRow key={`${b.number ?? "b"}-${idx}`}>
                          <TableCell sx={{ fontFamily: "monospace" }}>{b.number ?? ""}</TableCell>
                          <TableCell>{b.result || ""}</TableCell>
                          <TableCell>{typeof b.timestamp === "number" ? new Date(b.timestamp).toLocaleString() : ""}</TableCell>
                          <TableCell>{typeof b.durationMs === "number" ? `${Math.round(b.durationMs / 1000)}s` : ""}</TableCell>
                          <TableCell align="right">
                            {b.url ? (
                              <Tooltip title="Open build">
                                <IconButton size="small" onClick={() => window.open(b.url || "", "_blank", "noopener,noreferrer")}>
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}

