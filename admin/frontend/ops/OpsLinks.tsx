import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { db, get, onValue, ref } from "../../backend/services/Firebase"
import type { OpsDeployment } from "./opsTypes"

type JiraIssue = {
  key: string
  id: string | null
  summary: string | null
  status: string | null
  updated: string | null
  url: string | null
}

type GitHubCommit = {
  sha: string
  message: string
  author: string | null
  date: string | null
  url: string | null
  issueKeys?: string[]
}

function toArrayKeys(v: any): string[] {
  if (!v || typeof v !== "object") return []
  return Object.keys(v).filter(Boolean)
}

function normJiraKey(s: string): string {
  return String(s || "").trim().toUpperCase()
}

function firstLine(msg: string, max = 110): string {
  const s = String(msg || "").split("\n")[0] || ""
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function deploymentSortKey(d: OpsDeployment): number {
  return Number(d.deployTime || d.createdAt || 0)
}

export default function OpsLinks() {
  const [jiraBaseUrl, setJiraBaseUrl] = React.useState<string>("")

  React.useEffect(() => {
    const r = ref(db, "admin/ops/providers/jira/config/baseUrl")
    const unsub = onValue(r, (snap) => setJiraBaseUrl(String(snap.val() || "")))
    return () => unsub()
  }, [])

  const [jiraKeyInput, setJiraKeyInput] = React.useState("")
  const jiraKey = React.useMemo(() => normJiraKey(jiraKeyInput), [jiraKeyInput])

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [issue, setIssue] = React.useState<JiraIssue | null>(null)
  const [commits, setCommits] = React.useState<GitHubCommit[]>([])
  const [deployments, setDeployments] = React.useState<OpsDeployment[]>([])

  React.useEffect(() => {
    if (!jiraKey) {
      setError(null)
      setIssue(null)
      setCommits([])
      setDeployments([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        const [issueSnap, commitIndexSnap, depIndexSnap] = await Promise.all([
          get(ref(db, `admin/ops/providers/jira/issuesByKey/${jiraKey}`)),
          get(ref(db, `admin/ops/index/jira/${jiraKey}/commits`)),
          get(ref(db, `admin/ops/index/jira/${jiraKey}/deployments`)),
        ])

        const issueVal = issueSnap.val()
        const commitShas = toArrayKeys(commitIndexSnap.val()).slice(0, 50)
        const depIds = toArrayKeys(depIndexSnap.val()).slice(0, 50)

        const [commitRows, depRows] = await Promise.all([
          Promise.all(
            commitShas.map(async (sha) => {
              const s = await get(ref(db, `admin/ops/providers/github/commitsBySha/${sha}`))
              return s.val() as GitHubCommit | null
            }),
          ),
          Promise.all(
            depIds.map(async (id) => {
              const s = await get(ref(db, `admin/ops/deployments/${id}`))
              const raw = s.val()
              if (!raw) return null
              const row: OpsDeployment = {
                id,
                environment: String(raw.environment || "dev") as any,
                service: String(raw.service || "frontend") as any,
                baseUrl: raw?.baseUrl ? String(raw.baseUrl) : undefined,
                version: raw?.version ? String(raw.version) : undefined,
                gitSha: raw?.gitSha ? String(raw.gitSha) : undefined,
                buildTime: raw?.buildTime ? String(raw.buildTime) : undefined,
                deployTime: raw?.deployTime ? Number(raw.deployTime) : undefined,
                createdAt: Number(raw?.createdAt || 0),
                source: raw?.source ? String(raw.source) : undefined,
                actor: raw?.actor || undefined,
                notes: raw?.notes ? String(raw.notes) : undefined,
                jiraKeys: Array.isArray(raw?.jiraKeys)
                  ? raw.jiraKeys.map((k: any) => String(k || "").trim()).filter(Boolean)
                  : undefined,
              }
              return row
            }),
          ),
        ])

        if (cancelled) return
        setIssue(issueVal ? (issueVal as JiraIssue) : null)
        setCommits((commitRows.filter(Boolean) as GitHubCommit[]).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))))
        setDeployments((depRows.filter(Boolean) as OpsDeployment[]).sort((a, b) => deploymentSortKey(b) - deploymentSortKey(a)))
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || "Failed to load links")
        setIssue(null)
        setCommits([])
        setDeployments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [jiraKey])

  const openJira = React.useCallback(() => {
    if (!jiraKey) return
    const base = String(jiraBaseUrl || "").replace(/\/+$/, "")
    const url = base ? `${base}/browse/${encodeURIComponent(jiraKey)}` : issue?.url || ""
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }, [issue?.url, jiraBaseUrl, jiraKey])

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Links
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trace a Jira issue key to related commits and deployments.
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              label="Jira key"
              size="small"
              value={jiraKeyInput}
              onChange={(e) => setJiraKeyInput(e.target.value)}
              placeholder="e.g. OPS-123"
              sx={{ minWidth: 260 }}
            />
            <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={openJira} disabled={!jiraKey || (!jiraBaseUrl && !issue?.url)}>
              Open in Jira
            </Button>
            {loading ? <Chip size="small" label="Loading…" /> : null}
            {error ? <Chip size="small" color="error" label="Error" /> : null}
          </Stack>
          {error ? (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Issue
          </Typography>
          {!jiraKey ? (
            <Typography variant="body2" color="text.secondary">
              Enter a Jira key to begin.
            </Typography>
          ) : issue ? (
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <Chip size="small" label={issue.key} />
              {issue.status ? <Chip size="small" variant="outlined" label={issue.status} /> : null}
              {issue.summary ? (
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  {issue.summary}
                </Typography>
              ) : null}
              {issue.updated ? (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  updated {new Date(issue.updated).toLocaleString()}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No cached Jira issue found for {jiraKey}. (Run Jira sync first.)
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Related commits
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {commits.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {jiraKey ? "No commits linked yet." : "—"}
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
                  {commits.slice(0, 25).map((c) => (
                    <TableRow key={c.sha}>
                      <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{String(c.sha || "").slice(0, 8)}</TableCell>
                      <TableCell>{firstLine(c.message)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{c.date ? new Date(c.date).toLocaleString() : ""}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Open commit">
                          <span>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => c.url && window.open(c.url, "_blank", "noopener,noreferrer")}
                              disabled={!c.url}
                            >
                              Open
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Related deployments
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {deployments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {jiraKey ? "No deployments linked yet." : "—"}
            </Typography>
          ) : (
            <Stack gap={1}>
              {deployments.slice(0, 25).map((d) => (
                <Card key={d.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1} alignItems={{ xs: "stretch", md: "center" }}>
                      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <Chip size="small" label={String(d.environment || "").toUpperCase()} />
                        <Chip size="small" variant="outlined" label={String(d.service || "").toUpperCase()} />
                        {d.version ? <Chip size="small" variant="outlined" label={`v ${d.version}`} /> : null}
                        {d.gitSha ? <Chip size="small" variant="outlined" label={`sha ${d.gitSha}`} /> : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(d.deployTime || d.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    {d.notes ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {d.notes}
                      </Typography>
                    ) : null}
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

