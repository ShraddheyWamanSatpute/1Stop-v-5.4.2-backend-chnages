import React from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import AddIcon from "@mui/icons-material/Add"
import { db, get, onValue, push, ref, set } from "../../backend/services/Firebase"
import type { OpsRelease, VersionPayload } from "./opsTypes"

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

function toReleases(val: any): OpsRelease[] {
  const entries = Object.entries(val || {}) as Array<[string, any]>
  const rows = entries.map(([id, raw]) => ({
    id,
    version: String(raw?.version || ""),
    gitSha: raw?.gitSha ? String(raw.gitSha) : undefined,
    notes: raw?.notes ? String(raw.notes) : undefined,
    createdAt: Number(raw?.createdAt || 0),
    actionId: raw?.actionId ? String(raw.actionId) : undefined,
    deploymentId: raw?.deploymentId ? String(raw.deploymentId) : undefined,
    executionUrl: raw?.executionUrl ? String(raw.executionUrl) : undefined,
    actor: raw?.actor || undefined,
  }))
  return rows
    .filter((r) => r.version)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export default function OpsReleases({
  actor,
  devFrontend,
  devApi,
  prodFrontend,
  prodApi,
}: {
  actor: { uid?: string; email?: string }
  devFrontend?: VersionPayload
  devApi?: VersionPayload
  prodFrontend?: VersionPayload
  prodApi?: VersionPayload
}) {
  const [releases, setReleases] = React.useState<OpsRelease[]>([])
  const [loading, setLoading] = React.useState(true)
  const [changelogOpen, setChangelogOpen] = React.useState(false)
  const [changelogLoading, setChangelogLoading] = React.useState(false)
  const [changelogError, setChangelogError] = React.useState<string | null>(null)
  const [changelog, setChangelog] = React.useState<any>(null)
  const [changelogRelease, setChangelogRelease] = React.useState<OpsRelease | null>(null)

  const [version, setVersion] = React.useState("")
  const [gitSha, setGitSha] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const r = ref(db, "admin/ops/releases")
    const unsub = onValue(r, (snap) => {
      setReleases(toReleases(snap.val()))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const quickPick = (p?: VersionPayload) => {
    if (!p) return
    if (p.version && !version) setVersion(String(p.version))
    if (p.gitSha && !gitSha) setGitSha(String(p.gitSha))
  }

  const createRelease = async () => {
    const v = version.trim()
    if (!v) return
    setSaving(true)
    try {
      const at = Date.now()
      const r = ref(db, "admin/ops/releases")
      const p = push(r)
      await set(p, {
        version: v,
        gitSha: gitSha.trim() || null,
        notes: notes.trim() || null,
        createdAt: at,
        actor: actor || null,
      })
      setNotes("")
      // keep version/gitSha for batch entry
    } finally {
      setSaving(false)
    }
  }

  const openChangelog = async (r: OpsRelease) => {
    setChangelogRelease(r)
    setChangelogOpen(true)
    setChangelogLoading(true)
    setChangelogError(null)
    setChangelog(null)
    try {
      const snap = await get(ref(db, `admin/ops/changelogs/${r.id}`))
      setChangelog(snap.val() || null)
    } catch (e: any) {
      setChangelogError(e?.message || "Failed to load changelog")
    } finally {
      setChangelogLoading(false)
    }
  }

  const filteredReleases = React.useMemo(() => {
    if (!query.trim()) return releases
    const q = query.trim().toLowerCase()
    return releases.filter((r) =>
      [r.version, r.gitSha, r.notes, r.actor?.email, r.actionId, r.deploymentId, r.executionUrl].some((v) =>
        String(v || "").toLowerCase().includes(q),
      ),
    )
  }, [query, releases])

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} gap={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Releases
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Internal release records with version tracking and changelog notes.
              </Typography>
            </Box>

            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
              <Button size="small" variant="outlined" onClick={() => quickPick(devFrontend)}>
                Use Dev Frontend
              </Button>
              <Button size="small" variant="outlined" onClick={() => quickPick(devApi)}>
                Use Dev API
              </Button>
              <Button size="small" variant="outlined" onClick={() => quickPick(prodFrontend)}>
                Use Prod Frontend
              </Button>
              <Button size="small" variant="outlined" onClick={() => quickPick(prodApi)}>
                Use Prod API
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.3" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Git SHA (optional)" value={gitSha} onChange={(e) => setGitSha(e.target.value)} placeholder="abc1234" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed?" />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} disabled={saving || !version.trim()} onClick={createRelease}>
              Create release
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            History
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} gap={1} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              label="Search releases"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="version / sha / action / deployment"
            />
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>
              Showing {Math.min(100, filteredReleases.length)} / {releases.length}
            </Typography>
          </Stack>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : filteredReleases.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No releases yet.
            </Typography>
          ) : (
            <Stack gap={1}>
              {filteredReleases.slice(0, 100).map((r) => (
                <Box key={r.id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Stack direction={{ xs: "column", md: "row" }} gap={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                    <Box>
                      <Typography fontWeight={900}>{r.version}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                        {r.actor?.email ? ` • ${r.actor.email}` : ""}
                      </Typography>
                    </Box>

                    <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
                      <Button size="small" variant="text" onClick={() => openChangelog(r)}>
                        View changelog
                      </Button>
                      {r.gitSha ? (
                        <>
                          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                            {r.gitSha}
                          </Typography>
                          <Tooltip title="Copy SHA">
                            <IconButton size="small" onClick={() => copyToClipboard(r.gitSha || "")}>
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : null}
                    </Stack>
                  </Stack>
                  {r.notes ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
                      {r.notes}
                    </Typography>
                  ) : null}
                  {r.actionId || r.deploymentId || r.executionUrl ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                      {r.actionId ? `Action ${r.actionId}` : ""}
                      {r.actionId && r.deploymentId ? " | " : ""}
                      {r.deploymentId ? `Deployment ${r.deploymentId}` : ""}
                      {r.executionUrl ? ` | ${r.executionUrl}` : ""}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={changelogOpen} onClose={() => setChangelogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Changelog {changelogRelease?.version ? `• ${changelogRelease.version}` : ""}</DialogTitle>
        <DialogContent>
          {changelogLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : changelogError ? (
            <Typography variant="body2" color="error">
              {changelogError}
            </Typography>
          ) : !changelog ? (
            <Typography variant="body2" color="text.secondary">
              No changelog found for this release yet.
            </Typography>
          ) : (
            <Stack gap={2}>
              <Box>
                <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                  Jira issues
                </Typography>
                {Array.isArray(changelog.issues) && changelog.issues.length ? (
                  <Stack gap={0.75}>
                    {changelog.issues.slice(0, 50).map((i: any) => (
                      <Typography key={String(i.key)} variant="body2">
                        <strong>{String(i.key)}</strong>
                        {i.status ? ` • ${String(i.status)}` : ""}
                        {i.summary ? ` • ${String(i.summary)}` : ""}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No issues linked.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                  Commits
                </Typography>
                {Array.isArray(changelog.commits) && changelog.commits.length ? (
                  <Stack gap={0.75}>
                    {changelog.commits.slice(0, 50).map((c: any, idx: number) => (
                      <Typography key={`${String(c.sha || "c")}-${idx}`} variant="body2" sx={{ fontFamily: "monospace" }}>
                        {String(c.sha || "").slice(0, 8)}{" "}
                        <span style={{ fontFamily: "inherit" }}>{String(c.message || "").split("\\n")[0]}</span>
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No commits recorded.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

