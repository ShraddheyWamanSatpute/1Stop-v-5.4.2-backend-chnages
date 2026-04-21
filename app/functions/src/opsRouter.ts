import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import { db as adminDb } from "./admin"
import { createHmac, timingSafeEqual } from "crypto"
import {
  opsAuthEmailsGetConfig,
  opsAuthEmailsSend,
  opsAuthEmailsUpsertSender,
  opsAuthEmailsUpsertSettings,
  opsAuthEmailsUpsertTemplate,
} from "./opsAuthEmails"
import { createProdReleaseAndChangelog } from "./opsChangelog"
import {
  githubStatus,
  githubSync,
  jiraStatus,
  jiraSync,
  jenkinsStatus,
  jenkinsSync,
  enrichDeploymentsWithJiraKeys,
} from "./opsProviders"
import { approveAction, cancelAction, processApprovedActions, requestAction } from "./opsActions"
import { handleSupplyDataRequest } from "./dataSupply"
import { handleFinanceDataRequest } from "./dataFinance"
import { handleStockDataRequest } from "./dataStock"
import { handleCompanyDataRequest } from "./dataCompany"
import { handleHRDataRequest } from "./dataHR"
import { handleAdminDataRequest } from "./dataAdmin"
import { handleLocationDataRequest } from "./dataLocation"
import { handleProductDataRequest } from "./dataProduct"
import { handleNotificationsDataRequest } from "./dataNotifications"
import { handleBookingsDataRequest } from "./dataBookings"
import { handleSettingsDataRequest } from "./dataSettings"
import { handlePOSDataRequest } from "./dataPOS"
import { handleMessengerDataRequest } from "./dataMessenger"

type AuthedUser = {
  uid: string
  email?: string
  isAdmin: boolean
  isAdminStaff: boolean
  opsPerms?: {
    request?: boolean
    approveTest?: boolean
    approveProd?: boolean
    process?: boolean
    syncProviders?: boolean
    manageAuthEmails?: boolean
  }
}

type OpsConfig = {
  devBaseUrl?: string
  prodBaseUrl?: string
}

function json(res: any, status: number, body: any) {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

function getBearerToken(req: any): string | null {
  const h = String(req.headers?.authorization || req.headers?.Authorization || "")
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function hasAdminPageAccessRecord(user: any, page: string): boolean {
  if (Boolean(user?.isAdmin)) return true
  if (!Boolean(user?.adminStaff?.active)) return false
  if (page === "dashboard" || page === "profile") return true

  const pages =
    user?.adminStaff?.pages ??
    user?.adminStaff?.permissions?.pages ??
    user?.adminStaff?.permissions ??
    null

  if (Array.isArray(pages)) return pages.includes(page)
  if (pages && typeof pages === "object") {
    const v = (pages as any)[page]
    if (typeof v === "boolean") return v
    if (v && typeof v === "object" && typeof (v as any).view === "boolean") return Boolean((v as any).view)
  }
  return false
}

function safeUrl(raw: any): string | null {
  const s = String(raw || "").trim()
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

async function readOpsConfig(): Promise<OpsConfig> {
  const snap = await adminDb.ref("admin/ops/config").get()
  const v = (snap.val() || {}) as any
  return {
    devBaseUrl: safeUrl(v?.devBaseUrl) || undefined,
    prodBaseUrl: safeUrl(v?.prodBaseUrl) || undefined,
  }
}

async function writeOpsConfig(actor: { uid: string; email?: string }, body: any): Promise<OpsConfig> {
  const next = {
    devBaseUrl: safeUrl(body?.devBaseUrl),
    prodBaseUrl: safeUrl(body?.prodBaseUrl),
    updatedAt: Date.now(),
    updatedBy: { uid: actor.uid, email: actor.email || null },
  }
  await adminDb.ref("admin/ops/config").set(next)
  return readOpsConfig()
}

function githubRepoConfig() {
  const owner = String(process.env.GITHUB_OWNER || process.env.GITHUB_CI_OWNER || "").trim()
  const repo = String(process.env.GITHUB_REPO || process.env.GITHUB_CI_REPO || "").trim()
  const token = String(process.env.GITHUB_TOKEN || process.env.GITHUB_CI_TOKEN || "").trim()
  const ref = String(process.env.GITHUB_CI_REF || process.env.GITHUB_DEFAULT_REF || "main").trim() || "main"
  return { owner, repo, token, ref }
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = String(process.env[name] || "").trim()
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function joinUrl(base: string | undefined, suffix = ""): string | null {
  const root = safeUrl(base)
  if (!root) return null
  const path = String(suffix || "").trim()
  if (!path) return root
  return `${root}${path.startsWith("/") ? path : `/${path}`}`
}

function firebaseDeployConfig() {
  return {
    dev: {
      projectId: String(process.env.OPS_FIREBASE_PROJECT_DEV || "stop-test-8025f").trim() || "stop-test-8025f",
      hostingTarget: String(process.env.OPS_FIREBASE_HOSTING_TARGET_DEV || "dev").trim() || "dev",
      sites: {
        mainSite: String(process.env.OPS_FIREBASE_SITE_DEV_MAIN_SITE || "stop-test-8025f").trim() || "stop-test-8025f",
        app: String(process.env.OPS_FIREBASE_SITE_DEV_APP || "").trim() || null,
        admin: String(process.env.OPS_FIREBASE_SITE_DEV_ADMIN || "").trim() || null,
        mobile: String(process.env.OPS_FIREBASE_SITE_DEV_MOBILE || "").trim() || null,
      },
    },
    prod: {
      projectId: String(process.env.OPS_FIREBASE_PROJECT_PROD || "stop-stock-a22f5").trim() || "stop-stock-a22f5",
      hostingTarget: String(process.env.OPS_FIREBASE_HOSTING_TARGET_PROD || "prod").trim() || "prod",
      sites: {
        mainSite: String(process.env.OPS_FIREBASE_SITE_PROD_MAIN_SITE || "onestop-f493a").trim() || "onestop-f493a",
        app: String(process.env.OPS_FIREBASE_SITE_PROD_APP || "").trim() || null,
        admin: String(process.env.OPS_FIREBASE_SITE_PROD_ADMIN || "").trim() || null,
        mobile: String(process.env.OPS_FIREBASE_SITE_PROD_MOBILE || "").trim() || null,
      },
    },
    functionsRegion: String(process.env.OPS_FIREBASE_FUNCTIONS_REGION || process.env.FUNCTIONS_REGION || "us-central1").trim() || "us-central1",
  }
}

function opsServiceCatalog() {
  return [
    { key: "main-site", label: "Main Site", buildCommand: "build:main-site", deployOnly: "hosting" },
    { key: "app", label: "App", buildCommand: "build:app", deployOnly: "hosting" },
    { key: "admin", label: "Admin", buildCommand: "build:admin", deployOnly: "hosting" },
    { key: "mobile", label: "Mobile", buildCommand: "build:mobile", deployOnly: "hosting" },
    { key: "api", label: "API", buildCommand: "app/functions build", deployOnly: "functions" },
    { key: "all", label: "All", buildCommand: "build:all + app/functions build", deployOnly: "hosting + functions" },
  ]
}

function buildOpsCatalog(config: OpsConfig) {
  const gh = githubRepoConfig()
  const fb = firebaseDeployConfig()
  const dispatchToken = String(process.env.GITHUB_CI_TOKEN || "").trim()
  const dispatchWorkflow = String(process.env.GITHUB_CI_WORKFLOW || "").trim()
  const approvalsFallback = parseIntEnv("OPS_APPROVALS_REQUIRED", 1)
  return {
    services: opsServiceCatalog(),
    urls: {
      dev: {
        base: joinUrl(config.devBaseUrl),
        mainSite: joinUrl(config.devBaseUrl),
        app: joinUrl(config.devBaseUrl, "/App"),
        admin: joinUrl(config.devBaseUrl, "/Admin"),
        mobile: joinUrl(config.devBaseUrl, "/Mobile"),
        apiVersion: joinUrl(config.devBaseUrl, "/api/version"),
      },
      prod: {
        base: joinUrl(config.prodBaseUrl),
        mainSite: joinUrl(config.prodBaseUrl),
        app: joinUrl(config.prodBaseUrl, "/App"),
        admin: joinUrl(config.prodBaseUrl, "/Admin"),
        mobile: joinUrl(config.prodBaseUrl, "/Mobile"),
        apiVersion: joinUrl(config.prodBaseUrl, "/api/version"),
      },
    },
    firebase: fb,
    github: {
      owner: gh.owner || null,
      repo: gh.repo || null,
      ref: gh.ref || "main",
      workflow: dispatchWorkflow || null,
      downloadLatestConfigured: Boolean(gh.owner && gh.repo && gh.token),
      dispatchConfigured: Boolean(gh.owner && gh.repo && dispatchToken && dispatchWorkflow),
    },
    ops: {
      executionEnabled: String(process.env.OPS_ENABLE_EXECUTION || "").trim().toLowerCase() === "true",
      allowSelfApprove: String(process.env.OPS_ALLOW_SELF_APPROVE || "").trim().toLowerCase() === "true",
      approvalsRequired: {
        dev: parseIntEnv("OPS_APPROVALS_REQUIRED_DEV", approvalsFallback),
        prod: parseIntEnv("OPS_APPROVALS_REQUIRED_PROD", approvalsFallback),
      },
    },
  }
}

function safeArchiveName(s: string): string {
  return String(s || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "latest"
}

async function githubApiGetJson(pathAndQuery: string): Promise<any> {
  const cfg = githubRepoConfig()
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    throw Object.assign(new Error("GitHub is not configured (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)"), { status: 500 })
  }
  const url = pathAndQuery.startsWith("http") ? pathAndQuery : `https://api.github.com${pathAndQuery}`
  const upstream = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "1stop-ops",
    },
  })
  const text = await upstream.text().catch(() => "")
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  if (!upstream.ok) {
    const msg = typeof data?.message === "string" ? data.message : `GitHub API failed (${upstream.status})`
    throw Object.assign(new Error(msg), { status: 502 })
  }
  return data
}

async function downloadLatestCode(res: any, refOverride?: string) {
  const cfg = githubRepoConfig()
  if (!cfg.owner || !cfg.repo || !cfg.token) throw Object.assign(new Error("GitHub code download is not configured"), { status: 500 })

  const refName = String(refOverride || cfg.ref || "main").trim() || "main"
  const upstream = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/zipball/${encodeURIComponent(refName)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cfg.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "1stop-ops",
      },
    },
  )

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    throw Object.assign(new Error(text || `GitHub download failed (${upstream.status})`), { status: 502 })
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const filename = `${safeArchiveName(cfg.repo)}-${safeArchiveName(refName)}.zip`
  res.set("Cache-Control", "no-store")
  res.set("Content-Type", upstream.headers.get("content-type") || "application/zip")
  res.set("Content-Disposition", `attachment; filename="${filename}"`)
  res.status(200).send(buffer)
}

async function requireAdmin(req: any): Promise<AuthedUser> {
  const token = getBearerToken(req)
  if (!token) throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 })

  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded?.uid) throw Object.assign(new Error("Invalid token"), { status: 401 })

  // Verify user is allowed to use Admin Ops (super-admin or adminStaff.active).
  const snap = await adminDb.ref(`users/${decoded.uid}`).get()
  const user = (snap.val() || {}) as any
  const isAdmin = Boolean(user?.isAdmin)
  const isAdminStaff = Boolean(user?.adminStaff?.active)
  if (!isAdmin && !isAdminStaff) throw Object.assign(new Error("Forbidden"), { status: 403 })
  if (!isAdmin && !hasAdminPageAccessRecord(user, "ops")) throw Object.assign(new Error("Forbidden"), { status: 403 })

  const opsPerms = (user?.adminStaff?.permissions?.ops || user?.adminStaff?.permissions?.Ops || null) as any

  return {
    uid: decoded.uid,
    email: decoded.email,
    isAdmin,
    isAdminStaff,
    opsPerms: opsPerms && typeof opsPerms === "object" ? opsPerms : undefined,
  }
}

async function requireAuthenticatedUser(req: any): Promise<{ uid: string; email?: string }> {
  const token = getBearerToken(req)
  if (!token) throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 })

  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded?.uid) throw Object.assign(new Error("Invalid token"), { status: 401 })

  return {
    uid: decoded.uid,
    email: decoded.email,
  }
}

function can(user: AuthedUser, perm: keyof NonNullable<AuthedUser["opsPerms"]>): boolean {
  if (user.isAdmin) return true
  if (!user.isAdminStaff) return false
  return Boolean(user.opsPerms?.[perm])
}

function isEnv(v: any): v is "dev" | "prod" {
  return v === "dev" || v === "prod"
}

function computeHmacHex(secret: string, rawBody: Buffer | string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex")
}

function safeEqHex(a: string, b: string): boolean {
  try {
    const aa = Buffer.from(String(a || ""), "hex")
    const bb = Buffer.from(String(b || ""), "hex")
    if (aa.length !== bb.length) return false
    return timingSafeEqual(aa, bb)
  } catch {
    return false
  }
}

async function handleCiReport(req: any, res: any, body: any) {
  const secret = String(process.env.OPS_CI_HMAC_SECRET || "").trim()
  if (!secret) throw Object.assign(new Error("Missing env: OPS_CI_HMAC_SECRET"), { status: 500 })

  const sigRaw =
    String(req.headers?.["x-ops-signature"] || req.headers?.["x-ops-ci-signature"] || req.headers?.["X-Ops-Signature"] || "").trim()
  const sig = sigRaw.startsWith("sha256=") ? sigRaw.slice("sha256=".length) : sigRaw
  if (!sig) throw Object.assign(new Error("Missing signature"), { status: 401 })

  const raw = (req as any)?.rawBody ? (req as any).rawBody : Buffer.from(JSON.stringify(body || {}), "utf8")
  const expected = computeHmacHex(secret, raw)
  if (!safeEqHex(String(sig).trim(), expected)) throw Object.assign(new Error("Invalid signature"), { status: 403 })

  const id = String(body?.id || body?.actionId || "").trim()
  const ok = Boolean(body?.ok)
  const message = typeof body?.message === "string" ? body.message.slice(0, 500) : ""
  const externalUrl = typeof body?.externalUrl === "string" ? body.externalUrl.slice(0, 500) : ""
  if (!id) throw Object.assign(new Error("Missing action id"), { status: 400 })

  const now = Date.now()
  const actionRef = adminDb.ref(`admin/ops/actions/${id}`)
  const result = await actionRef.transaction((cur: any) => {
    if (!cur) return cur
    if (cur.status === "succeeded" || cur.status === "failed" || cur.status === "cancelled") return cur
    if (cur.status !== "running" && cur.status !== "approved") return cur
    const status = ok ? "succeeded" : "failed"
    return {
      ...cur,
      status,
      execution: {
        ...(cur.execution || {}),
        provider: "githubActions",
        finishedAt: now,
        ok,
        message: message || (ok ? "Deploy succeeded" : "Deploy failed"),
        externalUrl: externalUrl || cur.execution?.externalUrl || undefined,
      },
    }
  })

  if (!result.committed) throw Object.assign(new Error("Not found"), { status: 404 })

  // Server-side audit (append-only, best-effort).
  try {
    await adminDb.ref("admin/ops/audit/events").push().set({
      at: now,
      action: "ci.report",
      ok,
      actor: { uid: "ci", email: "ci@github-actions" },
      targetId: id,
      meta: { externalUrl: externalUrl || null },
    })
  } catch {
    // ignore
  }

  // Auto-log deployment + Jira links on success (best-effort).
  try {
    if (ok) {
      const cur = (result as any)?.snapshot?.val?.() || null
      const already = cur?.deploymentId
      const env = cur?.environment
      const svc = cur?.service
      const version = cur?.desired?.version
      const gitSha = cur?.desired?.gitSha
      const actor = cur?.requestedBy || null
      if (!already && (env === "dev" || env === "prod") && ["frontend", "app", "admin", "mobile", "main-site", "api", "all"].includes(String(svc || ""))) {
        const depRef = adminDb.ref("admin/ops/deployments").push()
        const depId = depRef.key || ""
        const notesParts: string[] = []
        if (cur?.desired?.notes) notesParts.push(String(cur.desired.notes))
        if (message) notesParts.push(String(message))
        if (externalUrl) notesParts.push(`Link: ${externalUrl}`)
        const notes = notesParts.filter(Boolean).join(" • ").slice(0, 2000)

        await depRef.set({
          environment: env,
          service: svc,
          version: version || null,
          gitSha: gitSha || null,
          deployTime: now,
          createdAt: now,
          source: "action",
          actor: actor || null,
          notes: notes || null,
          actionId: id,
          executionUrl: externalUrl || null,
        })

        // Link action -> deploymentId (don’t overwrite if some other worker already set it).
        await actionRef.child("deploymentId").transaction((v: any) => (v ? v : depId))

        // Attach Jira keys if the commit SHA is known and mapped.
        const sha = String(gitSha || "").trim()
        if (sha) {
          const snap = await adminDb.ref(`admin/ops/providers/github/commitIssueKeys/${sha}`).get()
          const keys = snap.val()
          if (Array.isArray(keys) && keys.length) {
            const clean = keys.map((k: any) => String(k || "").trim().toUpperCase()).filter(Boolean).slice(0, 25)
            if (clean.length) {
              const updates: Record<string, any> = {}
              updates[`admin/ops/deployments/${depId}/jiraKeys`] = clean
              clean.forEach((k) => {
                updates[`admin/ops/index/jira/${k}/deployments/${depId}`] = true
              })
              await adminDb.ref().update(updates)
            }
          }
        }

        // On successful PROD deploy, create a Release + Jira-linked changelog (best-effort).
        if (env === "prod" && version && gitSha) {
          await createProdReleaseAndChangelog({
            version: String(version),
            gitSha: String(gitSha),
            actionId: id,
            deploymentId: depId,
            executionUrl: externalUrl || undefined,
            actor,
          })
        }
      }
    }
  } catch {
    // ignore
  }

  json(res, 200, { ok: true })
}

function normalizePath(req: any): string {
  let p = String(req.path || req.url || "").split("?")[0] || "/"
  // Full URL (some runtimes): take pathname only
  if (p.includes("://")) {
    try {
      p = new URL(p).pathname || "/"
    } catch {
      p = "/"
    }
  }
  // Support both:
  // - /api/ops/* via Firebase Hosting rewrites
  // - /* when calling the function directly
  if (p.startsWith("/api/ops")) {
    const rest = p.slice("/api/ops".length)
    p = rest || "/"
  }
  // HTTPS URL is .../opsRouter/config — Express often exposes path as /opsRouter/config
  if (p === "/opsRouter" || p.startsWith("/opsRouter/")) {
    const rest = p === "/opsRouter" ? "/" : p.slice("/opsRouter".length)
    p = rest || "/"
  }
  return p || "/"
}

export const opsRouter = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }

  try {
    const p = normalizePath(req)

    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : (() => {
            try {
              const raw = (req as any)?.rawBody ? String((req as any).rawBody) : ""
              return raw ? JSON.parse(raw) : {}
            } catch {
              return {}
            }
          })()

    // CI callback (no Firebase user token; HMAC-signed)
    if (req.method === "POST" && (p === "/actions/report" || p === "/actions/report/")) {
      await handleCiReport(req, res, body)
      return
    }

    if (p.startsWith("/data/supply")) {
      const user = await requireAuthenticatedUser(req)
      await handleSupplyDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/finance")) {
      const user = await requireAuthenticatedUser(req)
      await handleFinanceDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/stock")) {
      const user = await requireAuthenticatedUser(req)
      await handleStockDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/company")) {
      const user = await requireAuthenticatedUser(req)
      await handleCompanyDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/hr")) {
      const user = await requireAuthenticatedUser(req)
      await handleHRDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/location")) {
      const user = await requireAuthenticatedUser(req)
      await handleLocationDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/product")) {
      const user = await requireAuthenticatedUser(req)
      await handleProductDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/notifications")) {
      const user = await requireAuthenticatedUser(req)
      await handleNotificationsDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/bookings")) {
      const user = await requireAuthenticatedUser(req)
      await handleBookingsDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/settings")) {
      const user = await requireAuthenticatedUser(req)
      await handleSettingsDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/pos")) {
      const user = await requireAuthenticatedUser(req)
      await handlePOSDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/messenger")) {
      const user = await requireAuthenticatedUser(req)
      await handleMessengerDataRequest({ req, res, path: p, body, user })
      return
    }
    if (p.startsWith("/data/admin")) {
      const user = await requireAdmin(req)
      await handleAdminDataRequest({ req, res, path: p, body, user })
      return
    }

    const user = await requireAdmin(req)

    // Health
    if (req.method === "GET" && (p === "/" || p === "")) {
      json(res, 200, { ok: true })
      return
    }

    // Auth emails (custom Firebase Auth templates + sender)
    if (req.method === "GET" && (p === "/authEmails/templates" || p === "/authEmails/templates/")) {
      if (!user.isAdmin && !can(user, "manageAuthEmails")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, { ok: true, ...(await opsAuthEmailsGetConfig()) })
      return
    }
    if (req.method === "POST" && (p === "/authEmails/settings" || p === "/authEmails/settings/")) {
      if (!user.isAdmin && !can(user, "manageAuthEmails")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, { ok: true, settings: await opsAuthEmailsUpsertSettings({ uid: user.uid, email: user.email }, body) })
      return
    }
    if (req.method === "POST" && (p === "/authEmails/sender" || p === "/authEmails/sender/")) {
      if (!user.isAdmin && !can(user, "manageAuthEmails")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, { ok: true, ...(await opsAuthEmailsUpsertSender({ uid: user.uid, email: user.email }, body)) })
      return
    }
    if (req.method === "POST" && (p === "/authEmails/templates/upsert" || p === "/authEmails/templates/upsert/")) {
      if (!user.isAdmin && !can(user, "manageAuthEmails")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, { ok: true, ...(await opsAuthEmailsUpsertTemplate({ uid: user.uid, email: user.email }, body)) })
      return
    }
    if (req.method === "POST" && (p === "/authEmails/send" || p === "/authEmails/send/")) {
      if (!user.isAdmin && !can(user, "manageAuthEmails")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await opsAuthEmailsSend({ uid: user.uid, email: user.email }, body))
      return
    }

    // Shared Ops config
    if (req.method === "GET" && (p === "/config" || p === "/config/")) {
      const config = await readOpsConfig()
      json(res, 200, { ok: true, config, catalog: buildOpsCatalog(config) })
      return
    }
    if (req.method === "POST" && (p === "/config" || p === "/config/")) {
      if (!user.isAdmin) throw Object.assign(new Error("Forbidden"), { status: 403 })
      const config = await writeOpsConfig({ uid: user.uid, email: user.email }, body)
      json(res, 200, { ok: true, config, catalog: buildOpsCatalog(config) })
      return
    }

    // GitHub
    if (req.method === "GET" && (p === "/github/status" || p === "/github/status/")) {
      json(res, 200, await githubStatus())
      return
    }
    if (req.method === "GET" && (p === "/github/branches" || p === "/github/branches/")) {
      try {
        const cfg = githubRepoConfig()
        if (!cfg.owner || !cfg.repo || !cfg.token) {
          json(res, 200, { ok: true, configured: false, branches: [], defaultRef: cfg.ref || "main" })
          return
        }
        const rawPer = String(req.query?.per_page || "").trim()
        const perNum = rawPer ? Number.parseInt(rawPer, 10) : 40
        const per = Math.min(100, Math.max(1, Number.isFinite(perNum) ? perNum : 40))
        const rows = await githubApiGetJson(
          `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/branches?per_page=${per}`,
        )
        const branches = (Array.isArray(rows) ? rows : []).map((b: any) => ({
          name: String(b?.name || ""),
          sha: b?.commit?.sha ? String(b.commit.sha).slice(0, 7) : null,
          fullSha: b?.commit?.sha ? String(b.commit.sha) : null,
        }))
        json(res, 200, { ok: true, configured: true, owner: cfg.owner, repo: cfg.repo, defaultRef: cfg.ref, branches })
      } catch (e: any) {
        json(res, Number(e?.status || 500), { ok: false, error: e?.message || "Failed to list branches" })
      }
      return
    }
    if (req.method === "GET" && (p === "/github/compare" || p === "/github/compare/")) {
      try {
        const base = String(req.query?.base || "").trim()
        const head = String(req.query?.head || "").trim()
        if (!base || !head) throw Object.assign(new Error("Query params base and head are required"), { status: 400 })
        const cfg = githubRepoConfig()
        if (!cfg.owner || !cfg.repo || !cfg.token) {
          throw Object.assign(new Error("GitHub is not configured"), { status: 500 })
        }
        const basehead = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`
        const cmp = await githubApiGetJson(
          `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/compare/${basehead}`,
        )
        const files = Array.isArray(cmp?.files)
          ? cmp.files.map((f: any) => ({
              filename: String(f?.filename || ""),
              status: String(f?.status || ""),
              additions: Number(f?.additions || 0),
              deletions: Number(f?.deletions || 0),
            }))
          : []
        json(res, 200, {
          ok: true,
          html_url: cmp?.html_url ? String(cmp.html_url) : null,
          status: cmp?.status ? String(cmp.status) : null,
          ahead_by: Number(cmp?.ahead_by || 0),
          behind_by: Number(cmp?.behind_by || 0),
          total_commits: Array.isArray(cmp?.commits) ? cmp.commits.length : 0,
          files,
          owner: cfg.owner,
          repo: cfg.repo,
        })
      } catch (e: any) {
        json(res, Number(e?.status || 500), { ok: false, error: e?.message || "Compare failed" })
      }
      return
    }
    if (req.method === "GET" && (p === "/github/downloadLatest" || p === "/github/downloadLatest/")) {
      const refOverride = typeof req.query?.ref === "string" ? req.query.ref : undefined
      await downloadLatestCode(res, refOverride)
      return
    }
    if (req.method === "POST" && (p === "/github/sync" || p === "/github/sync/")) {
      if (!user.isAdmin && !can(user, "syncProviders")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await githubSync({ uid: user.uid, email: user.email }))
      return
    }

    // Jira
    if (req.method === "GET" && (p === "/jira/status" || p === "/jira/status/")) {
      json(res, 200, await jiraStatus())
      return
    }
    if (req.method === "POST" && (p === "/jira/sync" || p === "/jira/sync/")) {
      if (!user.isAdmin && !can(user, "syncProviders")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await jiraSync({ uid: user.uid, email: user.email }))
      return
    }

    // Jenkins
    if (req.method === "GET" && (p === "/jenkins/status" || p === "/jenkins/status/")) {
      json(res, 200, await jenkinsStatus())
      return
    }
    if (req.method === "POST" && (p === "/jenkins/sync" || p === "/jenkins/sync/")) {
      if (!user.isAdmin && !can(user, "syncProviders")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await jenkinsSync({ uid: user.uid, email: user.email }))
      return
    }

    // Linking/enrichment
    if (req.method === "POST" && (p === "/links/enrichDeployments" || p === "/links/enrichDeployments/")) {
      if (!user.isAdmin && !can(user, "syncProviders")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await enrichDeploymentsWithJiraKeys(200, { uid: user.uid, email: user.email }))
      return
    }

    // Actions (Update Manager foundation)
    if (req.method === "POST" && (p === "/actions/request" || p === "/actions/request/")) {
      if (!user.isAdmin && !can(user, "request")) throw Object.assign(new Error("Forbidden"), { status: 403 })
      json(res, 200, await requestAction({ uid: user.uid, email: user.email }, body))
      return
    }
    if (req.method === "POST" && (p === "/actions/approve" || p === "/actions/approve/")) {
      const id = String(body?.id || "").trim()
      if (!id) throw Object.assign(new Error("Missing id"), { status: 400 })
      if (!user.isAdmin) {
        const snap = await adminDb.ref(`admin/ops/actions/${id}`).get()
        const action = (snap.val() || null) as any
        if (!action) throw Object.assign(new Error("Not found"), { status: 404 })
        const env = action?.environment
        if (env === "dev") {
          if (!can(user, "approveTest")) throw Object.assign(new Error("Forbidden"), { status: 403 })
        } else if (env === "prod") {
          if (!can(user, "approveProd")) throw Object.assign(new Error("Forbidden"), { status: 403 })
        } else {
          throw Object.assign(new Error("Invalid environment"), { status: 400 })
        }
      }
      json(res, 200, await approveAction({ uid: user.uid, email: user.email }, id))
      return
    }
    if (req.method === "POST" && (p === "/actions/cancel" || p === "/actions/cancel/")) {
      const id = String(body?.id || "").trim()
      if (!id) throw Object.assign(new Error("Missing id"), { status: 400 })
      if (!user.isAdmin) {
        const snap = await adminDb.ref(`admin/ops/actions/${id}`).get()
        const action = (snap.val() || null) as any
        if (!action) throw Object.assign(new Error("Not found"), { status: 404 })
        const isRequester = action?.requestedBy?.uid && action.requestedBy.uid === user.uid
        const canCancelEnv =
          action?.environment === "dev"
            ? can(user, "approveTest") || can(user, "process")
            : action?.environment === "prod"
              ? can(user, "approveProd") || can(user, "process")
              : false
        if (!isRequester && !canCancelEnv) throw Object.assign(new Error("Forbidden"), { status: 403 })
      }
      json(res, 200, await cancelAction({ uid: user.uid, email: user.email }, id))
      return
    }
    if (req.method === "POST" && (p === "/actions/process" || p === "/actions/process/")) {
      const env = body?.environment
      if (!env) {
        if (!user.isAdmin) throw Object.assign(new Error("Forbidden"), { status: 403 })
        json(res, 200, await processApprovedActions(5))
        return
      }
      if (!isEnv(env)) throw Object.assign(new Error("Invalid environment"), { status: 400 })
      if (!user.isAdmin) {
        const ok = can(user, "process") && (env === "dev" ? can(user, "approveTest") : can(user, "approveProd"))
        if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 })
      }
      json(res, 200, await processApprovedActions(5, { environment: env }))
      return
    }

    json(res, 404, { ok: false, error: "Not found" })
  } catch (e: any) {
    const status = Number(e?.status || 500)
    json(res, status, { ok: false, error: e?.message || "Failed" })
  }
})

