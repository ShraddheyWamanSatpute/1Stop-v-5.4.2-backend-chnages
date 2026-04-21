import { db as adminDb } from "./admin"

export type SyncActor = { uid: string; email?: string }

type ProviderLastError = { at: number; message: string }

type OpsAuditEvent = {
  at: number
  action: "sync" | "enrichDeployments"
  provider?: "github" | "jira" | "jenkins" | "links"
  ok: boolean
  actor: SyncActor
  counts?: Record<string, number>
  error?: string
}

async function logAuditEvent(e: OpsAuditEvent) {
  try {
    const r = adminDb.ref("admin/ops/audit/events").push()
    await r.set(e)
  } catch {
    // never fail core ops on audit logging
  }
}

function readEnv(name: string): string | undefined {
  const v = process.env[name]
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s : undefined
}

function requireEnv(name: string): string {
  const v = readEnv(name)
  if (!v) throw Object.assign(new Error(`Missing env: ${name}`), { status: 500 })
  return v
}

function normalizeBaseUrl(raw: string | undefined): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  return s.replace(/\/+$/, "")
}

function safeMsg(e: any): string {
  return String(e?.message || e || "Failed").slice(0, 500)
}

async function setProviderError(provider: string, message: string | null) {
  const p = adminDb.ref(`admin/ops/providers/${provider}/lastError`)
  if (!message) {
    await p.set(null)
    return
  }
  const now = Date.now()
  const payload: ProviderLastError = { at: now, message }
  await p.set(payload)
}

async function readProviderError(provider: string) {
  const snap = await adminDb.ref(`admin/ops/providers/${provider}/lastError`).get()
  return (snap.val() || null) as ProviderLastError | null
}

function extractJiraKeys(text: string): string[] {
  const s = String(text || "")
  // Typical Jira key format: ABC-123 (project key can include digits after first char)
  const matches = s.match(/\b[A-Z][A-Z0-9]+-\d+\b/g) || []
  const uniq = Array.from(new Set(matches.map((m) => m.toUpperCase())))
  return uniq.slice(0, 25)
}

// =========================
// GitHub
// =========================

async function githubRequest(path: string) {
  const token = requireEnv("GITHUB_TOKEN")
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
    throw Object.assign(new Error(msg), { status: 502 })
  }
  return data
}

export async function githubStatus() {
  const owner = readEnv("GITHUB_OWNER") || null
  const repo = readEnv("GITHUB_REPO") || null
  const configured = Boolean(readEnv("GITHUB_TOKEN") && owner && repo)
  const [lastSyncSnap, lastError] = await Promise.all([
    adminDb.ref("admin/ops/providers/github/lastSync").get(),
    readProviderError("github"),
  ])
  return {
    configured,
    owner,
    repo,
    lastSync: lastSyncSnap.val() || null,
    lastError,
  }
}

export async function githubSync(actor: SyncActor) {
  const owner = requireEnv("GITHUB_OWNER")
  const repo = requireEnv("GITHUB_REPO")
  const now = Date.now()
  try {
    const [commits, releases] = await Promise.all([
      githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=50`),
      githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=50`),
    ])

    const safeCommits = (Array.isArray(commits) ? commits : []).map((c: any) => {
      const sha = String(c?.sha || "")
      const message = String(c?.commit?.message || "").slice(0, 5000)
      return {
        sha,
        message,
        author: c?.commit?.author?.name ? String(c.commit.author.name) : null,
        date: c?.commit?.author?.date ? String(c.commit.author.date) : null,
        url: c?.html_url ? String(c.html_url) : null,
        issueKeys: extractJiraKeys(message),
      }
    })

    const safeReleases = (Array.isArray(releases) ? releases : []).map((r: any) => ({
      id: r?.id ? String(r.id) : null,
      tag: r?.tag_name ? String(r.tag_name) : null,
      name: r?.name ? String(r.name) : null,
      draft: Boolean(r?.draft),
      prerelease: Boolean(r?.prerelease),
      createdAt: r?.created_at ? String(r.created_at) : null,
      publishedAt: r?.published_at ? String(r.published_at) : null,
      url: r?.html_url ? String(r.html_url) : null,
    }))

    const updates: Record<string, any> = {}
    updates["admin/ops/providers/github/repo"] = { owner, repo, updatedAt: now }
    updates["admin/ops/providers/github/commits"] = safeCommits.map(({ issueKeys, ...rest }) => rest)
    updates["admin/ops/providers/github/releases"] = safeReleases
    updates["admin/ops/providers/github/lastSync"] = {
      at: now,
      actor,
      ok: true,
      counts: { commits: safeCommits.length, releases: safeReleases.length },
    }

    // Linking: sha -> issueKeys and issueKey -> shas
    safeCommits.forEach((c) => {
      if (!c.sha) return
      updates[`admin/ops/providers/github/commitsBySha/${c.sha}`] = {
        sha: c.sha,
        message: c.message,
        author: c.author,
        date: c.date,
        url: c.url,
        issueKeys: c.issueKeys,
      }
      updates[`admin/ops/providers/github/commitIssueKeys/${c.sha}`] = c.issueKeys.length ? c.issueKeys : null
      c.issueKeys.forEach((k) => {
        updates[`admin/ops/index/jira/${k}/commits/${c.sha}`] = true
      })
    })

    await adminDb.ref().update(updates)
    await setProviderError("github", null)
    await logAuditEvent({
      at: now,
      action: "sync",
      provider: "github",
      ok: true,
      actor,
      counts: { commits: safeCommits.length, releases: safeReleases.length },
    })
    return { ok: true, at: now, counts: { commits: safeCommits.length, releases: safeReleases.length } }
  } catch (e: any) {
    const msg = safeMsg(e)
    await setProviderError("github", msg)
    await adminDb.ref("admin/ops/providers/github/lastSync").set({ at: now, actor, ok: false, error: msg })
    await logAuditEvent({ at: now, action: "sync", provider: "github", ok: false, actor, error: msg })
    throw e
  }
}

// =========================
// Jira (Cloud or Server)
// =========================

function jiraAuthHeaders(): Record<string, string> {
  const email = readEnv("JIRA_EMAIL")
  const apiToken = readEnv("JIRA_API_TOKEN")
  const bearer = readEnv("JIRA_BEARER_TOKEN")

  if (email && apiToken) {
    const b64 = Buffer.from(`${email}:${apiToken}`, "utf8").toString("base64")
    return { Authorization: `Basic ${b64}` }
  }
  if (bearer) return { Authorization: `Bearer ${bearer}` }
  return {}
}

async function jiraRequest(path: string) {
  const base = normalizeBaseUrl(readEnv("JIRA_BASE_URL"))
  if (!base) throw Object.assign(new Error("Missing env: JIRA_BASE_URL"), { status: 500 })

  const headers = jiraAuthHeaders()
  if (!headers.Authorization) {
    throw Object.assign(new Error("Missing Jira auth env (JIRA_EMAIL+JIRA_API_TOKEN or JIRA_BEARER_TOKEN)"), { status: 500 })
  }

  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "1stop-ops",
      ...headers,
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
    const msg = typeof data?.errorMessages?.[0] === "string" ? data.errorMessages[0] : `Jira request failed (${res.status})`
    throw Object.assign(new Error(msg), { status: 502 })
  }
  return data
}

export async function jiraStatus() {
  const baseUrl = normalizeBaseUrl(readEnv("JIRA_BASE_URL"))
  const projectKey = readEnv("JIRA_PROJECT_KEY") || null
  const configured = Boolean(
    baseUrl &&
      (Boolean(readEnv("JIRA_BEARER_TOKEN")) || (Boolean(readEnv("JIRA_EMAIL")) && Boolean(readEnv("JIRA_API_TOKEN")))),
  )
  const [lastSyncSnap, lastError] = await Promise.all([
    adminDb.ref("admin/ops/providers/jira/lastSync").get(),
    readProviderError("jira"),
  ])
  return {
    configured,
    baseUrl,
    projectKey,
    lastSync: lastSyncSnap.val() || null,
    lastError,
  }
}

export async function jiraSync(actor: SyncActor) {
  const baseUrl = normalizeBaseUrl(requireEnv("JIRA_BASE_URL"))!
  const projectKey = readEnv("JIRA_PROJECT_KEY") || ""
  const now = Date.now()
  try {
    const jql = projectKey ? `project=${projectKey} ORDER BY updated DESC` : `ORDER BY updated DESC`
    const data = await jiraRequest(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`)
    const issues = Array.isArray(data?.issues) ? data.issues : []
    const safeIssues = issues.map((i: any) => ({
      key: i?.key ? String(i.key) : "",
      id: i?.id ? String(i.id) : null,
      summary: i?.fields?.summary ? String(i.fields.summary) : null,
      status: i?.fields?.status?.name ? String(i.fields.status.name) : null,
      updated: i?.fields?.updated ? String(i.fields.updated) : null,
      url: i?.key ? `${baseUrl}/browse/${String(i.key)}` : null,
    }))

    const updates: Record<string, any> = {}
    updates["admin/ops/providers/jira/config"] = { baseUrl, projectKey: projectKey || null, updatedAt: now }
    updates["admin/ops/providers/jira/issues"] = safeIssues
    safeIssues.forEach((i: { key: string }) => {
      const k = String(i.key || "").trim().toUpperCase()
      if (!k) return
      updates[`admin/ops/providers/jira/issuesByKey/${k}`] = i
    })
    updates["admin/ops/providers/jira/lastSync"] = { at: now, actor, ok: true, counts: { issues: safeIssues.length } }
    await adminDb.ref().update(updates)
    await setProviderError("jira", null)
    await logAuditEvent({ at: now, action: "sync", provider: "jira", ok: true, actor, counts: { issues: safeIssues.length } })
    return { ok: true, at: now, counts: { issues: safeIssues.length } }
  } catch (e: any) {
    const msg = safeMsg(e)
    await setProviderError("jira", msg)
    await adminDb.ref("admin/ops/providers/jira/lastSync").set({ at: now, actor, ok: false, error: msg })
    await logAuditEvent({ at: now, action: "sync", provider: "jira", ok: false, actor, error: msg })
    throw e
  }
}

// =========================
// Jenkins
// =========================

async function jenkinsRequest(path: string) {
  const base = normalizeBaseUrl(readEnv("JENKINS_BASE_URL"))
  const user = readEnv("JENKINS_USER")
  const token = readEnv("JENKINS_API_TOKEN")
  if (!base) throw Object.assign(new Error("Missing env: JENKINS_BASE_URL"), { status: 500 })
  if (!user || !token) throw Object.assign(new Error("Missing env: JENKINS_USER / JENKINS_API_TOKEN"), { status: 500 })

  const auth = Buffer.from(`${user}:${token}`, "utf8").toString("base64")
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
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
    throw Object.assign(new Error(`Jenkins request failed (${res.status})`), { status: 502 })
  }
  return data
}

export async function jenkinsStatus() {
  const baseUrl = normalizeBaseUrl(readEnv("JENKINS_BASE_URL"))
  const configured = Boolean(baseUrl && readEnv("JENKINS_USER") && readEnv("JENKINS_API_TOKEN"))
  const [lastSyncSnap, lastError] = await Promise.all([
    adminDb.ref("admin/ops/providers/jenkins/lastSync").get(),
    readProviderError("jenkins"),
  ])
  return {
    configured,
    baseUrl,
    lastSync: lastSyncSnap.val() || null,
    lastError,
  }
}

export async function jenkinsSync(actor: SyncActor) {
  const baseUrl = normalizeBaseUrl(requireEnv("JENKINS_BASE_URL"))!
  const job = readEnv("JENKINS_JOB") || ""
  const now = Date.now()
  try {
    const jobPath = job ? `/job/${encodeURIComponent(job)}` : ""
    const data = await jenkinsRequest(`${jobPath}/api/json?tree=jobs[name,url,color],builds[number,url,timestamp,result,duration]{0,50}`)
    const builds = Array.isArray(data?.builds) ? data.builds : []
    const safeBuilds = builds.slice(0, 50).map((b: any) => ({
      number: typeof b?.number === "number" ? b.number : null,
      url: b?.url ? String(b.url) : null,
      result: b?.result ? String(b.result) : null,
      durationMs: typeof b?.duration === "number" ? b.duration : null,
      timestamp: typeof b?.timestamp === "number" ? b.timestamp : null,
    }))

    const updates: Record<string, any> = {}
    updates["admin/ops/providers/jenkins/config"] = { baseUrl, job: job || null, updatedAt: now }
    updates["admin/ops/providers/jenkins/builds"] = safeBuilds
    updates["admin/ops/providers/jenkins/lastSync"] = { at: now, actor, ok: true, counts: { builds: safeBuilds.length } }
    await adminDb.ref().update(updates)
    await setProviderError("jenkins", null)
    await logAuditEvent({ at: now, action: "sync", provider: "jenkins", ok: true, actor, counts: { builds: safeBuilds.length } })
    return { ok: true, at: now, counts: { builds: safeBuilds.length } }
  } catch (e: any) {
    const msg = safeMsg(e)
    await setProviderError("jenkins", msg)
    await adminDb.ref("admin/ops/providers/jenkins/lastSync").set({ at: now, actor, ok: false, error: msg })
    await logAuditEvent({ at: now, action: "sync", provider: "jenkins", ok: false, actor, error: msg })
    throw e
  }
}

// =========================
// Linking/enrichment
// =========================

export async function enrichDeploymentsWithJiraKeys(
  limit = 200,
  actor: SyncActor = { uid: "system", email: "system@ops" },
) {
  const now = Date.now()
  const depSnap = await adminDb.ref("admin/ops/deployments").get()
  const deps = depSnap.val() || {}
  const entries = Object.entries(deps) as Array<[string, any]>
  // newest first best-effort
  entries.sort((a, b) => Number(b[1]?.deployTime || b[1]?.createdAt || 0) - Number(a[1]?.deployTime || b[1]?.createdAt || 0))

  const updates: Record<string, any> = {}
  let touched = 0
  for (const [id, raw] of entries.slice(0, limit)) {
    const gitSha = String(raw?.gitSha || "").trim()
    if (!gitSha) continue
    if (Array.isArray(raw?.jiraKeys) && raw.jiraKeys.length) continue
    const keysSnap = await adminDb.ref(`admin/ops/providers/github/commitIssueKeys/${gitSha}`).get()
    const keys = keysSnap.val()
    if (Array.isArray(keys) && keys.length) {
      updates[`admin/ops/deployments/${id}/jiraKeys`] = keys
      keys.forEach((k: any) => {
        const kk = String(k || "").trim().toUpperCase()
        if (!kk) return
        updates[`admin/ops/index/jira/${kk}/deployments/${id}`] = true
      })
      touched++
    }
  }
  if (touched) await adminDb.ref().update(updates)
  await logAuditEvent({
    at: now,
    action: "enrichDeployments",
    provider: "links",
    ok: true,
    actor,
    counts: { touched },
  })
  return { ok: true, touched }
}

