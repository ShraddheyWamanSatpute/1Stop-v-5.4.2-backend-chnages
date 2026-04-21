import React from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import RefreshIcon from "@mui/icons-material/Refresh"
import CompareArrowsIcon from "@mui/icons-material/CompareArrows"
import { authedBlobFetch, authedFetch } from "./opsApi"

type GitHubBranchRow = { name: string; sha: string | null; fullSha: string | null }

type GitHubBranchesResponse = {
  ok: boolean
  configured?: boolean
  owner?: string
  repo?: string
  defaultRef?: string
  branches?: GitHubBranchRow[]
  error?: string
}

type GitHubCompareResponse = {
  ok: boolean
  html_url?: string | null
  status?: string | null
  ahead_by?: number
  behind_by?: number
  total_commits?: number
  files?: Array<{ filename: string; status: string; additions: number; deletions: number }>
  error?: string
}

type GitHubStatus = {
  configured: boolean
  owner: string | null
  repo: string | null
  lastError?: null | { at: number; message: string }
}

type OpsGitCodeProps = {
  onGoToActions?: () => void
}

export default function OpsGitCode({ onGoToActions }: OpsGitCodeProps) {
  const [status, setStatus] = React.useState<GitHubStatus | null>(null)
  const [defaultRef, setDefaultRef] = React.useState("main")
  const [downloadRef, setDownloadRef] = React.useState("")
  const [branches, setBranches] = React.useState<GitHubBranchRow[]>([])
  const [branchesLoading, setBranchesLoading] = React.useState(false)
  const [branchesError, setBranchesError] = React.useState<string | null>(null)

  const [compareBase, setCompareBase] = React.useState("")
  const [compareHead, setCompareHead] = React.useState("")
  const [compareResult, setCompareResult] = React.useState<GitHubCompareResponse | null>(null)
  const [compareLoading, setCompareLoading] = React.useState(false)
  const [compareError, setCompareError] = React.useState<string | null>(null)

  const [downloadWorking, setDownloadWorking] = React.useState(false)
  const [downloadError, setDownloadError] = React.useState<string | null>(null)

  const loadStatus = React.useCallback(async () => {
    try {
      const [st, cfg] = await Promise.all([
        authedFetch("/github/status", { method: "GET" }) as Promise<GitHubStatus>,
        authedFetch("/config", { method: "GET" }) as Promise<any>,
      ])
      setStatus(st)
      const ref = cfg?.catalog?.github?.ref
      if (typeof ref === "string" && ref) {
        setDefaultRef(ref)
        setDownloadRef((cur) => (cur ? cur : ref))
        setCompareBase((cur) => (cur ? cur : ref))
      }
    } catch {
      setStatus({ configured: false, owner: null, repo: null })
    }
  }, [])

  React.useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const loadBranches = async () => {
    setBranchesLoading(true)
    setBranchesError(null)
    try {
      const r = (await authedFetch("/github/branches?per_page=50", { method: "GET" })) as GitHubBranchesResponse
      if (!r?.ok) throw new Error(r?.error || "Failed")
      setBranches(r.branches || [])
      if (r.defaultRef && !downloadRef) setDownloadRef(r.defaultRef)
    } catch (e: any) {
      setBranchesError(e?.message || "Failed to load branches")
      setBranches([])
    } finally {
      setBranchesLoading(false)
    }
  }

  const runCompare = async () => {
    setCompareLoading(true)
    setCompareError(null)
    setCompareResult(null)
    try {
      const qs = new URLSearchParams({ base: compareBase.trim(), head: compareHead.trim() })
      const r = (await authedFetch(`/github/compare?${qs.toString()}`, {
        method: "GET",
      })) as GitHubCompareResponse
      if (!r?.ok) throw new Error(r?.error || "Compare failed")
      setCompareResult(r)
    } catch (e: any) {
      setCompareError(e?.message || "Compare failed")
    } finally {
      setCompareLoading(false)
    }
  }

  const downloadZip = async () => {
    const ref = downloadRef.trim() || defaultRef
    setDownloadWorking(true)
    setDownloadError(null)
    try {
      const { blob, contentDisposition } = await authedBlobFetch(`/github/downloadLatest?ref=${encodeURIComponent(ref)}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const m = /filename="?([^";]+)"?/i.exec(contentDisposition)
      a.download = m?.[1]?.trim() || `repo-${ref}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setDownloadError(e?.message || "Download failed")
    } finally {
      setDownloadWorking(false)
    }
  }

  const repoWebUrl =
    status?.owner && status?.repo ? `https://github.com/${status.owner}/${status.repo}` : null

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            Git &amp; code
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Download source archives, list branches, and open GitHub compares. Deployments still run via GitHub Actions from the{" "}
            <strong>Actions</strong> tab (request → approvals → process).
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadStatus}>
          Refresh status
        </Button>
      </Stack>

      {!status?.configured ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          GitHub is not configured for this project. Set <code>GITHUB_OWNER</code>, <code>GITHUB_REPO</code>, and <code>GITHUB_TOKEN</code>{" "}
          on Firebase Functions (see <code>.env.example</code>). Optionally <code>GITHUB_DEFAULT_REF</code> or <code>GITHUB_CI_REF</code> for the
          default branch name.
        </Alert>
      ) : null}

      {status?.lastError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Last provider error: {status.lastError.message}
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Repository
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {status?.owner && status?.repo ? (
              <>
                <strong>
                  {status.owner}/{status.repo}
                </strong>
                {repoWebUrl ? (
                  <>
                    {" "}
                    <Link href={repoWebUrl} target="_blank" rel="noreferrer">
                      Open on GitHub <OpenInNewIcon sx={{ fontSize: 14, verticalAlign: "middle" }} />
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              "Not linked"
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Default ref for downloads (from env): <code>{defaultRef}</code>
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Download source (zip)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Same archive as GitHub’s “Download ZIP” for a branch or tag. Use this to start work from the current or an older revision.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
            <TextField
              size="small"
              label="Branch or tag"
              value={downloadRef}
              onChange={(e) => setDownloadRef(e.target.value)}
              placeholder={defaultRef}
              sx={{ minWidth: 220 }}
            />
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={downloadZip}
              disabled={downloadWorking || !status?.configured}
            >
              Download ZIP
            </Button>
          </Stack>
          {downloadError ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {downloadError}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ mb: 1 }}>
            <Typography fontWeight={900}>Branches</Typography>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadBranches} disabled={branchesLoading || !status?.configured}>
              {branchesLoading ? "Loading…" : "Load branches"}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Read-only list from GitHub. Creating or deleting branches still happens in Git or GitHub; you can then deploy a SHA from{" "}
            <strong>Actions</strong>.
          </Typography>
          {branchesError ? (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {branchesError}
            </Typography>
          ) : null}
          {branches.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Branch</TableCell>
                    <TableCell>SHA</TableCell>
                    <TableCell align="right">Use</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell>{b.name}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace" }}>{b.sha || "—"}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => {
                            setDownloadRef(b.name)
                            setCompareHead(b.name)
                          }}
                        >
                          Set ref
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Load branches to see the list.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Compare revisions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Diff summary via GitHub API. Use <strong>Open compare</strong> for the full GitHub UI (files and commits).
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mb: 1.5 }}>
            <TextField size="small" label="Base" value={compareBase} onChange={(e) => setCompareBase(e.target.value)} placeholder="main" />
            <TextField size="small" label="Head" value={compareHead} onChange={(e) => setCompareHead(e.target.value)} placeholder="feature/xyz" />
            <Button
              variant="contained"
              startIcon={<CompareArrowsIcon />}
              onClick={runCompare}
              disabled={compareLoading || !compareBase.trim() || !compareHead.trim() || !status?.configured}
            >
              Compare
            </Button>
          </Stack>
          {compareError ? (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {compareError}
            </Typography>
          ) : null}
          {compareResult ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Status: <strong>{compareResult.status || "—"}</strong> · Ahead: {compareResult.ahead_by ?? 0} · Behind: {compareResult.behind_by ?? 0}{" "}
                · Commits: {compareResult.total_commits ?? 0} · Files changed: {compareResult.files?.length ?? 0}
              </Typography>
              {compareResult.html_url ? (
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  href={compareResult.html_url}
                  target="_blank"
                  rel="noreferrer"
                  component={Link}
                >
                  Open compare on GitHub
                </Button>
              ) : null}
              {compareResult.files && compareResult.files.length > 0 ? (
                <TableContainer sx={{ mt: 1, maxHeight: 240 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>File</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">+/-</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {compareResult.files.slice(0, 80).map((f) => (
                        <TableRow key={f.filename}>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{f.filename}</TableCell>
                          <TableCell>{f.status}</TableCell>
                          <TableCell align="right">
                            +{f.additions} / -{f.deletions}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
              {compareResult.files && compareResult.files.length > 80 ? (
                <Typography variant="caption" color="text.secondary">
                  Showing first 80 files. Open GitHub for the full list.
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Deploy workflow
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Typical flow: set version / SHA → request deploy to <strong>dev</strong> (test) → required approvers sign off → <strong>Process Dev</strong>{" "}
            runs CI → verify on test URLs → repeat for <strong>prod</strong> when ready.
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          {onGoToActions ? (
            <Button variant="outlined" onClick={onGoToActions}>
              Go to Actions (request deploy)
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Open the <strong>Actions</strong> tab in Ops to request a deployment.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
