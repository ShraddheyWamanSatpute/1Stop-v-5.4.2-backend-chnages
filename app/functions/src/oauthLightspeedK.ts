import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import { firestore, db as rtdb } from "./admin"
import { FUNCTION_KEYS } from "./keys"
import * as crypto from "crypto"

type EnvName = "production" | "trial"

/** Default OAuth scopes for K-Series (catalog, orders, financial, refresh). */
export const LIGHTSPEED_K_DEFAULT_SCOPES = "items orders-api financial-api offline_access"

export const K_OPERATOR_OAUTH_COLLECTION = "lightspeed_k_operator_oauth"

export function operatorOAuthDocId(companyId: string, siteId?: string, subsiteId?: string) {
  return `${String(companyId).trim()}__${String(siteId || "default").trim()}__${String(subsiteId || "default").trim()}`
}

function kOAuthLog(event: string, fields: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ source: "oauthLightspeedK", event, ts: Date.now(), ...fields }))
  } catch {
    console.log(`[oauthLightspeedK] ${event}`)
  }
}

/** Per-company OAuth app (client id/secret) saved by admin tooling; falls back to FUNCTION_KEYS when absent. */
export async function loadOperatorOAuthCreds(
  companyId: string,
  siteId?: string,
  subsiteId?: string
): Promise<{
  client_id: string
  client_secret: string
  redirect_uri?: string
  scope?: string
  environment?: EnvName
} | null> {
  try {
    const snap = await firestore.collection(K_OPERATOR_OAUTH_COLLECTION).doc(operatorOAuthDocId(companyId, siteId, subsiteId)).get()
    if (!snap.exists) return null
    const d = snap.data() || {}
    const client_id = String(d.client_id || "").trim()
    const client_secret = String(d.client_secret || "").trim()
    if (!client_id || !client_secret) return null
    return {
      client_id,
      client_secret,
      redirect_uri: d.redirect_uri ? String(d.redirect_uri).trim() : undefined,
      scope: d.scope ? String(d.scope) : undefined,
      environment: d.environment === "trial" ? "trial" : "production",
    }
  } catch {
    return null
  }
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

async function requireUser(req: any): Promise<{ uid: string; email?: string }> {
  const token = getBearerToken(req)
  if (!token) throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 })
  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded?.uid) throw Object.assign(new Error("Invalid token"), { status: 401 })
  return { uid: decoded.uid, email: decoded.email }
}

async function requireCompanyAccess(uid: string, companyId: string): Promise<void> {
  const a = await rtdb.ref(`companies/${companyId}/users/${uid}`).get()
  if (a.exists()) return
  const b = await rtdb.ref(`users/${uid}/companies/${companyId}`).get()
  if (b.exists()) return
  throw Object.assign(new Error("Forbidden"), { status: 403 })
}

/** Company member, global super-admin, or admin staff with Integrations page (support tooling). */
export async function requireCompanyMemberOrAdminSupport(uid: string, companyId: string): Promise<void> {
  const uSnap = await rtdb.ref(`users/${uid}`).get()
  const user = (uSnap.val() || {}) as any
  if (Boolean(user?.isAdmin)) return
  if (Boolean(user?.adminStaff?.active)) {
    const pages = user?.adminStaff?.pages ?? user?.adminStaff?.permissions?.pages ?? user?.adminStaff?.permissions
    if (Array.isArray(pages) && pages.includes("integrations")) return
    if (pages && typeof pages === "object") {
      const v = (pages as any).integrations
      if (typeof v === "boolean" && v) return
      if (v && typeof v === "object" && Boolean((v as any).view)) return
    }
  }
  await requireCompanyAccess(uid, companyId)
}

function getEnvBaseUrl(environment: EnvName): string {
  return environment === "trial" ? "https://api.trial.lsk.lightspeed.app" : "https://api.lsk.lightspeed.app"
}

async function buildLightspeedAuthorizeUrl(opts: {
  req: any
  companyId: string
  siteId?: string
  subsiteId?: string
  returnPath: string
  environment: EnvName
  scope: string
}): Promise<string> {
  const op = await loadOperatorOAuthCreds(opts.companyId, opts.siteId, opts.subsiteId)
  const clientId = op?.client_id || FUNCTION_KEYS.lightspeedk.clientId
  if (!clientId) {
    throw new Error("Missing Lightspeed K client id (set admin operator credentials or LIGHTSPEEDK_CLIENT_ID).")
  }

  const redirectUri =
    (op?.redirect_uri && String(op.redirect_uri).trim()) ||
    FUNCTION_KEYS.lightspeedk.redirectUri ||
    getDefaultRedirectUri(opts.req)

  let redirectHost = ""
  try {
    redirectHost = new URL(redirectUri).host
  } catch {
    redirectHost = "invalid-url"
  }

  kOAuthLog("build_authorize_url", {
    companyId: opts.companyId,
    siteId: opts.siteId || "default",
    subsiteId: opts.subsiteId || "default",
    environment: opts.environment,
    usingOperatorCreds: Boolean(op),
    clientIdLength: clientId.length,
    redirectHost,
    scopePreview: String(opts.scope || "").slice(0, 120),
  })

  const nonce = crypto.randomBytes(16).toString("hex")
  const state = base64UrlEncodeJson({
    provider: "lightspeedk",
    companyId: opts.companyId,
    siteId: opts.siteId || "default",
    subsiteId: opts.subsiteId || "default",
    returnPath: opts.returnPath,
    environment: opts.environment,
    scope: opts.scope,
    nonce,
    ts: Date.now(),
  })

  const baseUrl = getEnvBaseUrl(opts.environment)
  return `${baseUrl}/oauth/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: opts.scope,
    state,
  }).toString()}`
}

function base64UrlEncodeJson(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url")
}

function base64UrlDecodeJson(raw: string): any {
  return JSON.parse(Buffer.from(String(raw), "base64url").toString("utf8"))
}

function resolveProto(req: any): string {
  const xf = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim()
  return xf || req.protocol || "https"
}

function getDefaultRedirectUri(req: any): string {
  const proto = resolveProto(req)
  const host = req.get("host")
  return `${proto}://${host}/oauthCallbackLightspeedK`
}

function getSettingsPath(companyId: string, siteId?: string, subsiteId?: string): string {
  if (siteId && subsiteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/settings/lightspeedIntegration`
  }
  if (siteId) {
    return `companies/${companyId}/sites/${siteId}/settings/lightspeedIntegration`
  }
  return `companies/${companyId}/settings/lightspeedIntegration`
}

function getTokenDocId(companyId: string, siteId?: string, subsiteId?: string): string {
  const s = siteId || "default"
  const ss = subsiteId || "default"
  return `${companyId}_${s}_${ss}_lightspeedk`
}

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

async function exchangeCodeForToken(opts: {
  environment: EnvName
  code: string
  redirectUri: string
  operator?: { clientId: string; clientSecret: string } | null
}): Promise<TokenResponse> {
  const clientId = opts.operator?.clientId || FUNCTION_KEYS.lightspeedk.clientId
  const clientSecret = opts.operator?.clientSecret || FUNCTION_KEYS.lightspeedk.clientSecret
  if (!clientId || !clientSecret) {
    throw new Error("Missing Lightspeed K credentials (operator Firestore doc or LIGHTSPEEDK_CLIENT_ID/LIGHTSPEEDK_CLIENT_SECRET).")
  }

  const baseUrl = getEnvBaseUrl(opts.environment)
  const url = `${baseUrl}/oauth/token?${new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
  }).toString()}`

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  kOAuthLog("token_exchange_request", {
    environment: opts.environment,
    usingOperatorBasicAuth: Boolean(opts.operator),
    redirectUriHost: (() => {
      try {
        return new URL(opts.redirectUri).host
      } catch {
        return ""
      }
    })(),
  })

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  })

  if (!resp.ok) {
    const txt = await resp.text()
    kOAuthLog("token_exchange_failed", { status: resp.status, bodyPreview: txt.slice(0, 800) })
    throw new Error(`Lightspeed token exchange failed (${resp.status}): ${txt}`)
  }

  const jsonBody = await resp.json()
  kOAuthLog("token_exchange_ok", {
    expires_in: jsonBody?.expires_in,
    scope: typeof jsonBody?.scope === "string" ? jsonBody.scope.slice(0, 200) : jsonBody?.scope,
  })
  return jsonBody
}

async function refreshAccessToken(opts: {
  environment: EnvName
  refreshToken: string
  operator?: { clientId: string; clientSecret: string } | null
}): Promise<TokenResponse> {
  const clientId = opts.operator?.clientId || FUNCTION_KEYS.lightspeedk.clientId
  const clientSecret = opts.operator?.clientSecret || FUNCTION_KEYS.lightspeedk.clientSecret
  if (!clientId || !clientSecret) {
    throw new Error("Missing Lightspeed K credentials (LIGHTSPEEDK_CLIENT_ID/LIGHTSPEEDK_CLIENT_SECRET).")
  }

  const baseUrl = getEnvBaseUrl(opts.environment)
  const url = `${baseUrl}/oauth/token`
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  kOAuthLog("refresh_token_request", { environment: opts.environment, usingOperatorBasicAuth: Boolean(opts.operator) })

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: opts.refreshToken,
    }).toString(),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    kOAuthLog("refresh_token_failed", { status: resp.status, bodyPreview: txt.slice(0, 800) })
    throw new Error(`Lightspeed token refresh failed (${resp.status}): ${txt}`)
  }

  return resp.json()
}

/**
 * Start OAuth: redirects to Lightspeed /oauth/authorize.
 */
export const oauthLightspeedK = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    const companyId = String(req.query.company_id || "").trim()
    const siteId = String(req.query.site_id || "").trim() || undefined
    const subsiteId = String(req.query.subsite_id || "").trim() || undefined
    const returnPath = String(req.query.return_path || "/pos/settings")
    const environment = (String(req.query.environment || "production") === "trial" ? "trial" : "production") as EnvName
    const scope = String(req.query.scope || LIGHTSPEED_K_DEFAULT_SCOPES)

    if (!companyId) {
      res.status(400).send("Missing company_id")
      return
    }

    const authUrl = await buildLightspeedAuthorizeUrl({ req, companyId, siteId, subsiteId, returnPath, environment, scope })
    res.redirect(authUrl)
  } catch (e) {
    console.error("oauthLightspeedK error:", e)
    kOAuthLog("oauth_start_failed", { message: String((e as any)?.message || e) })
    res.status(500).send("OAuth initialization failed")
  }
  }
)

/**
 * Back-compat connect endpoint.
 * Some older frontends call `/lightspeedKConnect?mode=json` to obtain the authorize URL via fetch.
 * - `mode=json` → returns `{ ok: true, url }`
 * - otherwise → redirects to authorize URL
 */
export const lightspeedKConnect = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "GET" && req.method !== "POST") {
      json(res, 405, { ok: false, error: "Method not allowed" })
      return
    }

    const body = req.body && typeof req.body === "object" ? req.body : {}
    const q: any = req.query || {}
    const companyId = String(q.company_id || q.companyId || body.company_id || body.companyId || "").trim()
    const siteId = String(q.site_id || q.siteId || body.site_id || body.siteId || "").trim() || undefined
    const subsiteId = String(q.subsite_id || q.subsiteId || body.subsite_id || body.subsiteId || "").trim() || undefined
    const returnPath = String(q.return_path || q.returnPath || body.return_path || body.returnPath || "/pos/settings")
    const environment = (String(q.environment || body.environment || "production") === "trial" ? "trial" : "production") as EnvName
    const scope = String(q.scope || body.scope || LIGHTSPEED_K_DEFAULT_SCOPES)

    if (!companyId) {
      json(res, 400, { ok: false, error: "Missing company_id" })
      return
    }

    const authUrl = await buildLightspeedAuthorizeUrl({ req, companyId, siteId, subsiteId, returnPath, environment, scope })
    const mode = String(q.mode || body.mode || "").toLowerCase()
    if (mode === "json") {
      // Back-compat: some clients expect `authUrl`, others expect `url`
      json(res, 200, { ok: true, url: authUrl, authUrl, data: { authUrl } })
      return
    }
    res.redirect(authUrl)
  } catch (e: any) {
    console.error("lightspeedKConnect error:", e)
    const status = Number(e?.status || 500)
    json(res, status, { ok: false, error: e?.message || "OAuth initialization failed" })
  }
  }
)

/**
 * OAuth callback: exchanges code for tokens, stores Firestore tokens + RTDB mirror, redirects to returnPath.
 */
export const oauthCallbackLightspeedK = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    const { code, state, error } = req.query as any

    if (error) {
      kOAuthLog("callback_query_error", { error: String(error) })
      res.status(400).send(`OAuth error: ${String(error)}`)
      return
    }
    if (!code || !state) {
      kOAuthLog("callback_missing_code_or_state", {})
      res.status(400).send("Missing code or state")
      return
    }

    const decoded = base64UrlDecodeJson(String(state))
    const companyId = String(decoded?.companyId || "").trim()
    const siteId = String(decoded?.siteId || "").trim()
    const subsiteId = String(decoded?.subsiteId || "").trim()
    const returnPath = String(decoded?.returnPath || "/pos/settings")
    const environment = (String(decoded?.environment || "production") === "trial" ? "trial" : "production") as EnvName
    const scope = String(decoded?.scope || "")

    if (!companyId) {
      res.status(400).send("Invalid state (missing companyId)")
      return
    }

    kOAuthLog("callback_received", { companyId, siteId, subsiteId, environment })

    const op = await loadOperatorOAuthCreds(companyId, siteId, subsiteId)
    const redirectUri =
      (op?.redirect_uri && String(op.redirect_uri).trim()) ||
      FUNCTION_KEYS.lightspeedk.redirectUri ||
      getDefaultRedirectUri(req)

    const token = await exchangeCodeForToken({
      environment,
      code: String(code),
      redirectUri,
      operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
    })

    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAtSec = nowSec + (Number(token.expires_in) || 3600)

    // Store sensitive tokens in Firestore
    const tokenDocId = getTokenDocId(companyId, siteId, subsiteId)
    await firestore.collection("pos_oauth_tokens").doc(tokenDocId).set(
      {
        provider: "lightspeedk",
        companyId,
        siteId: siteId || "default",
        subsiteId: subsiteId || "default",
        environment,
        scope: token.scope || scope,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_at_sec: expiresAtSec,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    )

    // Store non-sensitive mirror in RTDB for UI
    const settingsPath = getSettingsPath(companyId, siteId !== "default" ? siteId : undefined, subsiteId !== "default" ? subsiteId : undefined)
    await rtdb.ref(settingsPath).update({
      provider: "lightspeed",
      environment,
      scope: token.scope || scope,
      tokenType: token.token_type,
      tokenExpiry: expiresAtSec,
      isEnabled: true,
      isConnected: true,
      connectedAt: Date.now(),
      syncStatus: "idle",
      updatedAt: Date.now(),
    })

    const sep = returnPath.includes("?") ? "&" : "?"
    res.redirect(`${returnPath}${sep}success=true&provider=lightspeed`)
  } catch (e: any) {
    console.error("oauthCallbackLightspeedK error:", e)
    res.status(500).send(e?.message || "OAuth callback failed")
  }
  }
)

/**
 * Refresh token (server-side). Requires Firebase auth.
 */
export const lightspeedKRefreshToken = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { ok: false, error: "Method not allowed" })
      return
    }

    const user = await requireUser(req)
    const body = req.body && typeof req.body === "object" ? req.body : {}
    const companyId = String(body.companyId || "").trim()
    const siteId = String(body.siteId || "").trim() || undefined
    const subsiteId = String(body.subsiteId || "").trim() || undefined

    if (!companyId) throw Object.assign(new Error("Missing companyId"), { status: 400 })
    await requireCompanyMemberOrAdminSupport(user.uid, companyId)

    const tokenDocId = getTokenDocId(companyId, siteId, subsiteId)
    const doc = await firestore.collection("pos_oauth_tokens").doc(tokenDocId).get()
    if (!doc.exists) throw Object.assign(new Error("Not connected"), { status: 400 })

    const data = doc.data() || {}
    const environment = (String(data.environment || "production") === "trial" ? "trial" : "production") as EnvName
    const refreshToken = String(data.refresh_token || "").trim()
    if (!refreshToken) throw Object.assign(new Error("Missing refresh token"), { status: 400 })

    const op = await loadOperatorOAuthCreds(companyId, siteId, subsiteId)
    const token = await refreshAccessToken({
      environment,
      refreshToken,
      operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
    })
    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAtSec = nowSec + (Number(token.expires_in) || 3600)

    await firestore.collection("pos_oauth_tokens").doc(tokenDocId).set(
      {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_at_sec: expiresAtSec,
        scope: token.scope || data.scope,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    const settingsPath = getSettingsPath(companyId, siteId, subsiteId)
    await rtdb.ref(settingsPath).update({
      tokenType: token.token_type,
      tokenExpiry: expiresAtSec,
      scope: token.scope || data.scope,
      updatedAt: Date.now(),
    })

    json(res, 200, { ok: true, tokenExpiry: expiresAtSec })
  } catch (e: any) {
    const status = Number(e?.status || 500)
    json(res, status, { ok: false, error: e?.message || "Failed" })
  }
  }
)

/**
 * Disconnect: deletes Firestore token doc and clears RTDB mirror. Requires Firebase auth.
 */
export const lightspeedKDisconnect = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { ok: false, error: "Method not allowed" })
      return
    }

    const user = await requireUser(req)
    const body = req.body && typeof req.body === "object" ? req.body : {}
    const companyId = String(body.companyId || "").trim()
    const siteId = String(body.siteId || "").trim() || undefined
    const subsiteId = String(body.subsiteId || "").trim() || undefined

    if (!companyId) throw Object.assign(new Error("Missing companyId"), { status: 400 })
    await requireCompanyMemberOrAdminSupport(user.uid, companyId)

    const tokenDocId = getTokenDocId(companyId, siteId, subsiteId)
    await firestore.collection("pos_oauth_tokens").doc(tokenDocId).delete().catch(() => {})

    const settingsPath = getSettingsPath(companyId, siteId, subsiteId)
    await rtdb.ref(settingsPath).update({
      isEnabled: false,
      isConnected: false,
      syncStatus: "idle",
      syncError: null,
      tokenType: null,
      tokenExpiry: null,
      scope: null,
      businessId: null,
      businessName: null,
      businessLocationId: null,
      businessLocationName: null,
      updatedAt: Date.now(),
    })

    json(res, 200, { ok: true })
  } catch (e: any) {
    const status = Number(e?.status || 500)
    json(res, status, { ok: false, error: e?.message || "Failed" })
  }
  }
)

