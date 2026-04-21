import { db as adminDb } from "./admin"

type JiraIssueRow = {
  key: string
  id: string | null
  summary: string | null
  status: string | null
  updated: string | null
  url: string | null
}

type GitHubCommitRow = {
  sha: string
  message: string
  url: string | null
  issueKeys?: string[]
}

function requireEnv(name: string): string {
  const v = String(process.env[name] || "").trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function readEnv(name: string): string | undefined {
  const v = String(process.env[name] || "").trim()
  return v ? v : undefined
}

function extractJiraKeys(text: string): string[] {
  const s = String(text || "")
  const matches = s.match(/\\b[A-Z][A-Z0-9]+-\\d+\\b/g) || []
  const uniq = Array.from(new Set(matches.map((m) => m.toUpperCase())))
  return uniq.slice(0, 25)
}

async function githubRequest(path: string) {
  const token = readEnv("GITHUB_TOKEN") || readEnv("GITHUB_CI_TOKEN") || ""
  if (!token) throw new Error("Missing env: GITHUB_TOKEN (or GITHUB_CI_TOKEN)")
  const res = await fetch(`https://api.github.com${path}`, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "1stop-ops",
    },
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const msg = typeof data?.message === "string" ? data.message : `GitHub request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

async function findPreviousProdSha(currentSha: string): Promise<string | null> {
  const snap = await adminDb.ref("admin/ops/deployments").orderByChild("deployTime").limitToLast(50).get()
  const v = snap.val() || {}
  const rows = Object.entries(v) as Array<[string, any]>
  rows.sort((a, b) => Number(b[1]?.deployTime || b[1]?.createdAt || 0) - Number(a[1]?.deployTime || a[1]?.createdAt || 0))
  for (const [_id, raw] of rows) {
    if (String(raw?.environment || "") !== "prod") continue
    const sha = String(raw?.gitSha || "").trim()
    if (!sha) continue
    if (sha === currentSha) continue
    return sha
  }
  return null
}

export async function createProdReleaseAndChangelog(params: {
  version: string
  gitSha: string
  actionId?: string
  deploymentId?: string
  executionUrl?: string
  actor?: { uid?: string; email?: string } | null
}) {
  const version = String(params.version || "").trim()
  const gitSha = String(params.gitSha || "").trim()
  if (!version || !gitSha) return { ok: false, skipped: true }

  const owner = requireEnv("GITHUB_OWNER")
  const repo = requireEnv("GITHUB_REPO")

  const baseSha = await findPreviousProdSha(gitSha)

  let commits: GitHubCommitRow[] = []
  if (baseSha) {
    const compare = await githubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(gitSha)}`,
    )
    const arr = Array.isArray(compare?.commits) ? compare.commits : []
    commits = arr.slice(0, 250).map((c: any) => {
      const sha = String(c?.sha || "")
      const msg = String(c?.commit?.message || "").slice(0, 5000)
      return {
        sha,
        message: msg,
        url: c?.html_url ? String(c.html_url) : null,
        issueKeys: extractJiraKeys(msg),
      }
    })
  } else {
    // Fallback: use cached latest commits (best-effort)
    const snap = await adminDb.ref("admin/ops/providers/github/commits").get()
    const arr = snap.val()
    if (Array.isArray(arr)) {
      commits = (arr as any[]).slice(0, 50).map((c: any) => {
        const sha = String(c?.sha || "")
        const msg = String(c?.message || "").slice(0, 5000)
        return { sha, message: msg, url: c?.url ? String(c.url) : null, issueKeys: extractJiraKeys(msg) }
      })
    }
  }

  const issueKeys = Array.from(
    new Set(
      commits
        .flatMap((c) => (Array.isArray(c.issueKeys) ? c.issueKeys : []))
        .map((k) => String(k || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 50)

  const issues: JiraIssueRow[] = []
  for (const k of issueKeys.slice(0, 50)) {
    const s = await adminDb.ref(`admin/ops/providers/jira/issuesByKey/${k}`).get()
    const row = s.val()
    if (row && typeof row === "object") {
      issues.push({
        key: String((row as any).key || k),
        id: (row as any).id ? String((row as any).id) : null,
        summary: (row as any).summary ? String((row as any).summary) : null,
        status: (row as any).status ? String((row as any).status) : null,
        updated: (row as any).updated ? String((row as any).updated) : null,
        url: (row as any).url ? String((row as any).url) : null,
      })
    } else {
      issues.push({ key: k, id: null, summary: null, status: null, updated: null, url: null })
    }
  }

  const now = Date.now()
  const relRef = adminDb.ref("admin/ops/releases").push()
  const releaseId = relRef.key || ""
  await relRef.set({
    version,
    gitSha,
    notes: null,
    createdAt: now,
    actor: params.actor || null,
    deploymentId: params.deploymentId || null,
    actionId: params.actionId || null,
    executionUrl: params.executionUrl || null,
  })

  await adminDb.ref(`admin/ops/changelogs/${releaseId}`).set({
    version,
    gitSha,
    baseGitSha: baseSha || null,
    createdAt: now,
    actionId: params.actionId || null,
    deploymentId: params.deploymentId || null,
    executionUrl: params.executionUrl || null,
    issues,
    commits: commits.map((c) => ({
      sha: c.sha,
      message: c.message,
      url: c.url,
      issueKeys: Array.isArray(c.issueKeys) && c.issueKeys.length ? c.issueKeys : null,
    })),
  })

  return { ok: true, releaseId }
}

