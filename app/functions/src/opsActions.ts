import { db as adminDb } from "./admin"

export type OpsActionStatus = "requested" | "approved" | "running" | "succeeded" | "failed" | "cancelled"
export type OpsActionKind = "deploy"

export type SyncActor = { uid: string; email?: string }

export type OpsApproval = { uid: string; email?: string; at: number }

export type OpsAction = {
  id: string
  kind: OpsActionKind
  status: OpsActionStatus
  environment: "dev" | "prod"
  service: "frontend" | "app" | "admin" | "mobile" | "main-site" | "api" | "all"
  requiredApprovals?: number
  requestedAt: number
  requestedBy: SyncActor
  approvals?: OpsApproval[]
  approvedAt?: number
  approvedBy?: SyncActor
  cancelledAt?: number
  cancelledBy?: SyncActor
  desired?: {
    version?: string
    gitSha?: string
    notes?: string
  }
  execution?: {
    startedAt?: number
    finishedAt?: number
    updatedAt?: number
    provider?: "none" | "jenkins" | "githubActions"
    externalUrl?: string
    message?: string
    ok?: boolean
  }
}

type OpsAuditEvent = {
  at: number
  action: "action.request" | "action.approve" | "action.cancel" | "action.run"
  ok: boolean
  actor: SyncActor
  targetId?: string
  meta?: any
  error?: string
}

async function logAuditEvent(e: OpsAuditEvent) {
  try {
    await adminDb.ref("admin/ops/audit/events").push().set(e)
  } catch {
    // ignore
  }
}

// NOTE: deployment → Jira linking was removed from this file to keep
// the Functions build clean (noUnusedLocals). It’s still implemented
// in opsRouter’s CI report handler for successful deploys.

function safeString(v: any, max = 500): string {
  const s = String(v ?? "").trim()
  return s.length > max ? s.slice(0, max) : s
}

function isEnv(v: any): v is "dev" | "prod" {
  return v === "dev" || v === "prod"
}

function isService(v: any): v is "frontend" | "app" | "admin" | "mobile" | "main-site" | "api" | "all" {
  return v === "frontend" || v === "app" || v === "admin" || v === "mobile" || v === "main-site" || v === "api" || v === "all"
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = String(process.env[name] || "").trim()
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function approvalsRequired(env?: "dev" | "prod"): number {
  const fallback = parseIntEnv("OPS_APPROVALS_REQUIRED", 1)
  const n =
    env === "dev"
      ? parseIntEnv("OPS_APPROVALS_REQUIRED_DEV", fallback)
      : env === "prod"
        ? parseIntEnv("OPS_APPROVALS_REQUIRED_PROD", fallback)
        : fallback
  if (n <= 1) return 1
  if (n >= 3) return 3
  return 2
}

function allowSelfApprove(): boolean {
  return String(process.env.OPS_ALLOW_SELF_APPROVE || "")
    .trim()
    .toLowerCase() === "true"
}

function requireEnv(name: string): string {
  const v = String(process.env[name] || "").trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function githubDispatchDeploy(params: {
  actionId: string
  environment: "dev" | "prod"
  service: "frontend" | "app" | "admin" | "mobile" | "main-site" | "api" | "all"
  version?: string
  gitSha?: string
}) {
  const token = requireEnv("GITHUB_CI_TOKEN")
  const owner = requireEnv("GITHUB_CI_OWNER")
  const repo = requireEnv("GITHUB_CI_REPO")
  const workflow = requireEnv("GITHUB_CI_WORKFLOW") // id or filename (e.g. deploy.yml)
  const ref = String(process.env.GITHUB_CI_REF || "main").trim() || "main"

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "1stop-ops",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: {
          actionId: params.actionId,
          environment: params.environment,
          service: params.service,
          version: params.version || "",
          gitSha: params.gitSha || "",
        },
      }),
    },
  )

  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`GitHub Actions dispatch failed (${res.status})${t ? `: ${t.slice(0, 200)}` : ""}`)
  }

  const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`
  return { ok: true, workflowUrl }
}

export async function requestAction(actor: SyncActor, body: any) {
  const now = Date.now()
  const environment = body?.environment
  const service = body?.service
  if (!isEnv(environment)) throw Object.assign(new Error("Invalid environment"), { status: 400 })
  if (!isService(service)) throw Object.assign(new Error("Invalid service"), { status: 400 })

  const desired = {
    version: safeString(body?.desired?.version || body?.version || "", 80) || undefined,
    gitSha: safeString(body?.desired?.gitSha || body?.gitSha || "", 80) || undefined,
    notes: safeString(body?.desired?.notes || body?.notes || "", 1000) || undefined,
  }

  // Prod deploys must be deterministic (version + sha).
  if (environment === "prod") {
    if (!desired.version) throw Object.assign(new Error("Missing desired.version (required for prod)"), { status: 400 })
    if (!desired.gitSha) throw Object.assign(new Error("Missing desired.gitSha (required for prod)"), { status: 400 })
  }

  const ref = adminDb.ref("admin/ops/actions").push()
  const id = ref.key || ""
  const required = approvalsRequired(environment)
  const action: OpsAction = {
    id,
    kind: "deploy",
    status: "requested",
    environment,
    service,
    requiredApprovals: required,
    requestedAt: now,
    requestedBy: actor,
    desired,
  }

  await ref.set(action)
  await logAuditEvent({ at: now, action: "action.request", ok: true, actor, targetId: id, meta: { environment, service } })
  return { ok: true, id }
}

export async function approveAction(actor: SyncActor, id: string) {
  const now = Date.now()
  const actionRef = adminDb.ref(`admin/ops/actions/${id}`)

  const snap = await actionRef.get()
  const curPre = snap.val() as OpsAction | null
  if (!curPre) throw Object.assign(new Error("Not found"), { status: 404 })
  if (curPre.status !== "requested") throw Object.assign(new Error("Not in requested state"), { status: 400 })
  if (!allowSelfApprove() && curPre.requestedBy?.uid && actor.uid && curPre.requestedBy.uid === actor.uid) {
    throw Object.assign(new Error("Self-approve is disabled"), { status: 403 })
  }

  const required = Number(curPre.requiredApprovals || approvalsRequired(curPre.environment))

  const result = await actionRef.transaction((cur: OpsAction | null) => {
    if (!cur) return cur
    if (cur.status !== "requested") return cur

    const prev = Array.isArray(cur.approvals) ? cur.approvals : []
    if (prev.some((a) => a?.uid && a.uid === actor.uid)) return cur
    const nextApprovals: OpsApproval[] = [...prev, { uid: actor.uid, email: actor.email, at: now }]

    if (nextApprovals.length >= required) {
      return { ...cur, requiredApprovals: required, approvals: nextApprovals, status: "approved", approvedAt: now, approvedBy: actor }
    }
    return { ...cur, requiredApprovals: required, approvals: nextApprovals }
  })

  if (!result.committed) throw Object.assign(new Error("Not found or not in requested state"), { status: 400 })
  await logAuditEvent({ at: now, action: "action.approve", ok: true, actor, targetId: id })
  const post = result.snapshot.val() as OpsAction
  return { ok: true, status: post?.status, approvals: Array.isArray(post?.approvals) ? post.approvals.length : 0, required }
}

export async function cancelAction(actor: SyncActor, id: string) {
  const now = Date.now()
  const actionRef = adminDb.ref(`admin/ops/actions/${id}`)

  const result = await actionRef.transaction((cur: OpsAction | null) => {
    if (!cur) return cur
    if (cur.status === "succeeded" || cur.status === "failed" || cur.status === "cancelled") return cur
    return { ...cur, status: "cancelled", cancelledAt: now, cancelledBy: actor }
  })

  if (!result.committed) throw Object.assign(new Error("Not found"), { status: 404 })
  await logAuditEvent({ at: now, action: "action.cancel", ok: true, actor, targetId: id })
  return { ok: true }
}

export async function processApprovedActions(limit = 5, opts?: { environment?: "dev" | "prod" }) {
  const now = Date.now()
  const enableExec = String(process.env.OPS_ENABLE_EXECUTION || "").trim().toLowerCase() === "true"

  const snap = await adminDb
    .ref("admin/ops/actions")
    .orderByChild("status")
    .equalTo("approved")
    .limitToFirst(Math.max(limit * 10, 25))
    .get()

  const rows = snap.val() || {}
  const ids = Object.keys(rows).filter((id) => {
    if (!opts?.environment) return true
    const env = (rows as any)?.[id]?.environment
    return env === opts.environment
  })
  const processed: Array<{ id: string; ok: boolean; message?: string }> = []

  for (const id of ids.slice(0, limit)) {
    const actionRef = adminDb.ref(`admin/ops/actions/${id}`)
    const startedAt = Date.now()
    const systemActor: SyncActor = { uid: "system", email: "system@ops" }

    // Claim the action (approved -> running).
    const claim = await actionRef.transaction((cur: OpsAction | null) => {
      if (!cur) return cur
      if (cur.status !== "approved") return cur
      return {
        ...cur,
        status: "running",
        execution: { ...(cur.execution || {}), startedAt, provider: enableExec ? "githubActions" : "none" },
      }
    })

    if (!claim.committed) continue

    try {
      const cur = claim.snapshot.val() as OpsAction
      if (!enableExec) {
        const finishedAt = Date.now()
        await actionRef.update({
          status: "failed",
          execution: {
            ...(cur.execution || {}),
            finishedAt,
            updatedAt: finishedAt,
            ok: false,
            message: "Execution disabled (set OPS_ENABLE_EXECUTION=true to enable)",
            provider: "none",
          },
        })
        await logAuditEvent({
          at: finishedAt,
          action: "action.run",
          ok: false,
          actor: systemActor,
          targetId: id,
          meta: { provider: "none" },
        })
        processed.push({ id, ok: false, message: "Execution disabled" })
        continue
      }

      const dispatch = await githubDispatchDeploy({
        actionId: id,
        environment: cur.environment,
        service: cur.service,
        version: cur.desired?.version,
        gitSha: cur.desired?.gitSha,
      })

      const updatedAt = Date.now()
      await actionRef.update({
        execution: {
          ...(cur.execution || {}),
          provider: "githubActions",
          ok: true,
          message: "Dispatched GitHub Actions deploy workflow",
          externalUrl: dispatch.workflowUrl || undefined,
          updatedAt,
        } as any,
      })
      await logAuditEvent({
        at: updatedAt,
        action: "action.run",
        ok: true,
        actor: systemActor,
        targetId: id,
        meta: { provider: "githubActions", workflowUrl: dispatch.workflowUrl || null },
      })

      // Action remains in `running` until CI reports success/failure.
      processed.push({ id, ok: true, message: "Dispatched GitHub Actions workflow" })
    } catch (e: any) {
      const finishedAt = Date.now()
      const msg = safeString(e?.message || e || "Failed", 500)
      await actionRef.update({
        status: "failed",
        execution: { finishedAt, updatedAt: finishedAt, ok: false, message: msg, provider: enableExec ? "githubActions" : "none" },
      })
      await logAuditEvent({ at: finishedAt, action: "action.run", ok: false, actor: systemActor, targetId: id, error: msg })
      processed.push({ id, ok: false, message: msg })
    }
  }

  return { ok: true, at: now, processed }
}

