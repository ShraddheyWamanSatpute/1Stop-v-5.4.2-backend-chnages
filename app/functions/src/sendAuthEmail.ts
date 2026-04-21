import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import * as crypto from "crypto"
import { db } from "./admin"
import { sendAuthEmailInternal, type AuthEmailTemplateKey } from "./opsAuthEmails"

function json(res: any, status: number, body: any) {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

function getBearerToken(req: any): string | null {
  const h = String(req.headers?.authorization || req.headers?.Authorization || "")
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function clientIp(req: any): string {
  const xff = String(req.headers?.["x-forwarded-for"] || "")
  const first = xff.split(",")[0]?.trim()
  return first || String(req.ip || req.connection?.remoteAddress || "")
}

function normStr(v: any): string {
  return String(v ?? "").trim()
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function rateKey(s: string): string {
  return crypto.createHash("sha256").update(s).digest("base64url")
}

async function enforceRateLimit(key: string, max: number, windowMs: number) {
  const ref = db.ref(`admin/ops/authEmails/rateLimit/${key}`)
  const now = Date.now()
  const r = await ref.transaction((cur: any) => {
    const v = cur && typeof cur === "object" ? cur : {}
    const windowStart = typeof v.windowStart === "number" ? v.windowStart : now
    const count = typeof v.count === "number" ? v.count : 0
    const within = now - windowStart < windowMs
    const nextCount = within ? count + 1 : 1
    const nextStart = within ? windowStart : now
    return { windowStart: nextStart, count: nextCount, updatedAt: now }
  })

  const val = r.snapshot.val() || {}
  const count = Number((val as any)?.count || 0)
  if (count > max) {
    throw Object.assign(new Error("Too many requests. Please try again later."), { status: 429 })
  }
}

export const sendAuthEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed" })
    return
  }

  try {
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

    const type = normStr(body?.type) as AuthEmailTemplateKey
    if (type !== "verifyEmail" && type !== "passwordReset" && type !== "magicLink") {
      json(res, 400, { ok: false, error: "Invalid type" })
      return
    }

    const continueUrl = normStr(body?.continueUrl)

    // Determine email:
    // - verifyEmail: prefer auth token, but allow unauth by email (rate-limited, no existence leak)
    // - passwordReset/magicLink: email in body (rate-limited, no existence leak)
    let email = ""
    const token = getBearerToken(req)
    if (type === "verifyEmail" && token) {
      const decoded = await getAuth().verifyIdToken(token).catch(() => null)
      email = normStr(decoded?.email)
      if (!email) throw Object.assign(new Error("Missing user email"), { status: 400 })
    } else {
      email = normStr(body?.email)
      if (!email || !isValidEmail(email)) {
        // Do not leak existence; still return ok.
        json(res, 200, { ok: true })
        return
      }
      const ip = clientIp(req)
      await enforceRateLimit(rateKey(`${type}:${email}:${ip}`), 5, 15 * 60_000)
    }

    // Actor is "public"; keep minimal audit info.
    const actor = { uid: "", email: "public" }

    const r = await sendAuthEmailInternal(
      actor,
      { type, email, continueUrl },
      { suppressUserNotFound: !token },
    )

    json(res, 200, { ok: true, messageId: r.messageId || null })
  } catch (e: any) {
    const status = Number(e?.status || 500)
    // Password reset should not reveal user existence; suppress known errors.
    if (status === 400 && String(e?.message || "").toLowerCase().includes("user")) {
      json(res, 200, { ok: true })
      return
    }
    json(res, status, { ok: false, error: e?.message || "Failed" })
  }
})

