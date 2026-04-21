/**
 * Admin HTTP endpoints for Lightspeed Restaurant (K-Series) operator setup.
 * Auth: Firebase ID token (Bearer) + super-admin OR admin staff with Integrations page.
 *
 * OAuth callback path (register in Lightspeed developer portal):
 *   https://<REGION>-<PROJECT_ID>.cloudfunctions.net/oauthCallbackLightspeedK
 *
 * Per-company OAuth app credentials are stored in Firestore collection `lightspeed_k_operator_oauth`
 * (see oauthLightspeedK.ts). Global fallback remains LIGHTSPEEDK_* env vars.
 */

import { onRequest } from "firebase-functions/v2/https"
import { getAuth } from "firebase-admin/auth"
import { firestore, db as rtdb } from "./admin"
import {
  K_OPERATOR_OAUTH_COLLECTION,
  LIGHTSPEED_K_DEFAULT_SCOPES,
  loadOperatorOAuthCreds,
  operatorOAuthDocId,
} from "./oauthLightspeedK"
import {
  buildLocationOptions,
  fetchAllItems,
  fetchBusinesses,
  fetchSales,
  loadValidToken,
} from "./lightspeedKSync"

function json(res: any, status: number, body: any) {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

function getBearerToken(req: any): string | null {
  const h = String(req.headers?.authorization || req.headers?.Authorization || "")
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function hasIntegrationsPage(user: any): boolean {
  if (Boolean(user?.isAdmin)) return true
  const pages = user?.adminStaff?.pages ?? user?.adminStaff?.permissions?.pages ?? user?.adminStaff?.permissions
  if (Array.isArray(pages)) return pages.includes("integrations")
  if (pages && typeof pages === "object") {
    const v = (pages as any).integrations
    if (typeof v === "boolean") return v
    if (v && typeof v === "object" && typeof (v as any).view === "boolean") return Boolean((v as any).view)
  }
  return false
}

async function requireIntegrationsActor(req: any): Promise<{ uid: string; email?: string }> {
  const token = getBearerToken(req)
  if (!token) throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 })
  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded?.uid) throw Object.assign(new Error("Invalid token"), { status: 401 })

  const snap = await rtdb.ref(`users/${decoded.uid}`).get()
  const user = (snap.val() || {}) as any
  const isAdmin = Boolean(user?.isAdmin)
  const isStaff = Boolean(user?.adminStaff?.active)
  if (!isAdmin && !(isStaff && hasIntegrationsPage(user))) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
  return { uid: decoded.uid, email: decoded.email }
}

function cloudFunctionsBaseUrl(): string {
  let cfg: any = {}
  try {
    cfg = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {}
  } catch {
    cfg = {}
  }
  const projectId = String(process.env.GCLOUD_PROJECT || cfg.projectId || "").trim()
  const region = String(process.env.FUNCTIONS_REGION || process.env.FUNCTION_REGION || "us-central1").trim() || "us-central1"
  return `https://${region}-${projectId}.cloudfunctions.net`
}

function lightspeedKOAuthCallbackUrl(): string {
  return `${cloudFunctionsBaseUrl()}/oauthCallbackLightspeedK`
}

function settingsPath(company_id: string, site_id: string, subsite_id: string): string {
  const siteOk = site_id && site_id !== "default" ? site_id : undefined
  const subOk = subsite_id && subsite_id !== "default" ? subsite_id : undefined
  if (siteOk && subOk) {
    return `companies/${company_id}/sites/${siteOk}/subsites/${subOk}/settings/lightspeedIntegration`
  }
  if (siteOk) {
    return `companies/${company_id}/sites/${siteOk}/settings/lightspeedIntegration`
  }
  return `companies/${company_id}/settings/lightspeedIntegration`
}

function kAdminLog(event: string, fields: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ source: "adminIntegrationsKSeries", event, ts: Date.now(), ...fields }))
  } catch {
    console.log(`[adminIntegrationsKSeries] ${event}`)
  }
}

async function forwardLightspeedRunSync(authHeader: string, body: Record<string, any>) {
  const url = `${cloudFunctionsBaseUrl()}/lightspeedKRunSync`
  kAdminLog("forward_run_sync", { url, companyId: body.companyId, syncProducts: body.syncProducts, syncSales: body.syncSales })
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw Object.assign(new Error(String((data as any)?.error || `Sync failed (${resp.status})`)), { status: resp.status })
  }
  return data
}

export const adminIntegrationsListCompanies = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const snap = await rtdb.ref("companies").get()
    const val = snap.exists() ? (snap.val() as Record<string, any>) : {}
    const companies = Object.entries(val).map(([id, raw]) => ({
      id,
      name: String(raw?.name || raw?.companyName || id),
    }))
    companies.sort((a, b) => a.name.localeCompare(b.name))
    kAdminLog("list_companies", { count: companies.length })
    json(res, 200, { companies })
  } catch (e: any) {
    kAdminLog("list_companies_error", { message: e?.message })
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsListSites = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const company_id = String(req.query.company_id || "").trim()
    if (!company_id) {
      json(res, 400, { error: "Missing company_id" })
      return
    }
    const snap = await rtdb.ref(`companies/${company_id}/sites`).get()
    const val = snap.exists() ? (snap.val() as Record<string, any>) : {}
    const sites = Object.entries(val).map(([id, raw]) => ({
      id,
      name: String(raw?.name || raw?.siteName || id),
    }))
    sites.sort((a, b) => a.name.localeCompare(b.name))
    json(res, 200, { sites })
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsListSubsites = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const company_id = String(req.query.company_id || "").trim()
    const site_id = String(req.query.site_id || "").trim()
    if (!company_id || !site_id) {
      json(res, 400, { error: "Missing company_id or site_id" })
      return
    }
    const snap = await rtdb.ref(`companies/${company_id}/sites/${site_id}/subsites`).get()
    const val = snap.exists() ? (snap.val() as Record<string, any>) : {}
    const subsites = Object.entries(val).map(([id, raw]) => ({
      id,
      name: String(raw?.name || raw?.subsiteName || id),
    }))
    subsites.sort((a, b) => a.name.localeCompare(b.name))
    json(res, 200, { subsites })
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsKSeriesStatus = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const company_id = String(req.query.company_id || "").trim()
    const site_id = String(req.query.site_id || "default").trim() || "default"
    const subsite_id = String(req.query.subsite_id || "default").trim() || "default"
    if (!company_id) {
      json(res, 400, { error: "Missing company_id" })
      return
    }
    const path = settingsPath(company_id, site_id, subsite_id)
    const settingsSnap = await rtdb.ref(path).get()
    const raw = settingsSnap.exists() ? settingsSnap.val() : {}
    const opSnap = await firestore.collection(K_OPERATOR_OAUTH_COLLECTION).doc(operatorOAuthDocId(company_id, site_id, subsite_id)).get()
    const hasOpSecret = opSnap.exists && String((opSnap.data() as any)?.client_secret || "").trim().length > 0

    const s = site_id === "default" ? undefined : site_id
    const ss = subsite_id === "default" ? undefined : subsite_id
    const tokenDocId = `${company_id}_${s || "default"}_${ss || "default"}_lightspeedk`
    const tokSnap = await firestore.collection("pos_oauth_tokens").doc(tokenDocId).get()

    const auditSnap = await rtdb.ref(`${path}/integrationAudit`).get()
    const auditVal = auditSnap.exists() ? auditSnap.val() : null
    const audit: any[] = []
    if (auditVal && typeof auditVal === "object") {
      Object.values(auditVal).forEach((row: any) => {
        if (row && typeof row === "object") audit.push(row)
      })
      audit.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    }

    json(res, 200, {
      settingsPath: path,
      settings: {
        ...raw,
        clientId: raw?.clientId || (opSnap.data() as any)?.client_id || "",
        redirectUri: raw?.redirectUri || (opSnap.data() as any)?.redirect_uri || "",
        scope: raw?.scope || (opSnap.data() as any)?.scope || "",
        env: raw?.environment || (opSnap.data() as any)?.environment || "production",
        isConnected: Boolean(raw?.isConnected) || tokSnap.exists,
        hasServerSecret: Boolean(raw?.hasServerSecret) || hasOpSecret,
      },
      audit: audit.slice(0, 50),
    })
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsKSeriesPreview = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("")
        return
      }
      if (req.method !== "GET") {
        json(res, 405, { error: "Method not allowed" })
        return
      }
      await requireIntegrationsActor(req)
      const company_id = String(req.query.company_id || "").trim()
      const site_id = String(req.query.site_id || "default").trim() || "default"
      const subsite_id = String(req.query.subsite_id || "default").trim() || "default"
      const financial_from = String(req.query.financial_from || "").trim()
      const financial_to = String(req.query.financial_to || "").trim()
      const blRaw = String(req.query.business_location_id || "").trim()
      const businessLocationId = blRaw ? Number(blRaw) : NaN

      if (!company_id) {
        json(res, 400, { error: "Missing company_id" })
        return
      }

      const s = site_id === "default" ? undefined : site_id
      const ss = subsite_id === "default" ? undefined : subsite_id
      const { token, accessToken } = await loadValidToken(company_id, s, ss)
      const env = (token.environment || "production") as "production" | "trial"

      const rawBiz = await fetchBusinesses(env, accessToken)
      const businesses = buildLocationOptions(rawBiz)

      const settingsSnap = await rtdb.ref(settingsPath(company_id, site_id, subsite_id)).get()
      const settings = settingsSnap.exists() ? settingsSnap.val() : {}
      const selectedId = Number.isFinite(businessLocationId) && businessLocationId > 0 ? businessLocationId : Number(settings?.businessLocationId || 0)

      let itemCount = 0
      let financialCount = 0
      let selectedBusinessLocationName: string | null = null

      if (Number.isFinite(selectedId) && selectedId > 0) {
        const match = businesses.find((b) => b.businessLocationId === selectedId)
        selectedBusinessLocationName = match?.businessLocationName ? String(match.businessLocationName) : null
        const items = await fetchAllItems(env, accessToken, selectedId)
        itemCount = items.length
        const sales = await fetchSales(env, accessToken, selectedId, financial_from || undefined, financial_to || undefined)
        financialCount = sales.length
      }

      kAdminLog("preview_ok", { company_id, selectedId, itemCount, financialCount })

      json(res, 200, {
        businesses,
        selectedBusinessLocationId: Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null,
        selectedBusinessLocationName,
        itemCount,
        financialCount,
      })
    } catch (e: any) {
      kAdminLog("preview_error", { message: e?.message })
      json(res, e?.status || 500, { error: e?.message || "Failed" })
    }
  }
)

export const adminIntegrationsKSeriesSaveCredentials = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    const actor = await requireIntegrationsActor(req)
    const body = typeof req.body === "object" && req.body ? req.body : {}
    const company_id = String(body.company_id || "").trim()
    const site_id = String(body.site_id || "default").trim() || "default"
    const subsite_id = String(body.subsite_id || "default").trim() || "default"
    const env = String(body.env || "production") === "trial" ? "trial" : "production"
    const client_id = String(body.client_id || "").trim()
    const client_secret = String(body.client_secret || "").trim()
    const redirect_uri = String(body.redirect_uri || "").trim() || lightspeedKOAuthCallbackUrl()
    const scope = String(body.scope || "").trim() || LIGHTSPEED_K_DEFAULT_SCOPES

    if (!company_id || !client_id) {
      json(res, 400, { error: "Missing company_id or client_id" })
      return
    }

    const path = settingsPath(company_id, site_id, subsite_id)
    const docId = operatorOAuthDocId(company_id, site_id, subsite_id)

    const firePayload: Record<string, any> = {
      client_id,
      redirect_uri: redirect_uri || null,
      scope: scope || null,
      environment: env,
      updatedAt: new Date(),
      updatedByUid: actor.uid,
    }
    if (client_secret) {
      firePayload.client_secret = client_secret
    }
    await firestore.collection(K_OPERATOR_OAUTH_COLLECTION).doc(docId).set(firePayload, { merge: true })

    const op = await loadOperatorOAuthCreds(company_id, site_id, subsite_id)
    await rtdb.ref(path).update({
      clientId: client_id,
      redirectUri: redirect_uri || null,
      scope: scope || null,
      environment: env,
      hasServerSecret: Boolean(op?.client_secret),
      updatedAt: Date.now(),
    })

    await rtdb.ref(`${path}/integrationAudit`).push({
      ts: Date.now(),
      action: "admin_save_credentials",
      actorUid: actor.uid,
    })

    kAdminLog("save_credentials", { company_id, site_id, subsite_id, hasSecret: Boolean(client_secret) })
    json(res, 200, { ok: true })
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsKSeriesSaveBusinessLocation = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    const actor = await requireIntegrationsActor(req)
    const body = typeof req.body === "object" && req.body ? req.body : {}
    const company_id = String(body.company_id || "").trim()
    const site_id = String(body.site_id || "default").trim() || "default"
    const subsite_id = String(body.subsite_id || "default").trim() || "default"
    const business_location_id = Number(body.business_location_id ?? 0)
    if (!company_id || !Number.isFinite(business_location_id) || business_location_id <= 0) {
      json(res, 400, { error: "Missing company_id or business_location_id" })
      return
    }

    const s = site_id === "default" ? undefined : site_id
    const ss = subsite_id === "default" ? undefined : subsite_id
    const { token, accessToken } = await loadValidToken(company_id, s, ss)
    const env = (token.environment || "production") as "production" | "trial"
    const rawBiz = await fetchBusinesses(env, accessToken)
    const businesses = buildLocationOptions(rawBiz)
    const match = businesses.find((b) => b.businessLocationId === business_location_id)

    const path = settingsPath(company_id, site_id, subsite_id)
    await rtdb.ref(path).update({
      businessLocationId: business_location_id,
      businessLocationName: match?.businessLocationName || "",
      updatedAt: Date.now(),
    })
    await rtdb.ref(`${path}/integrationAudit`).push({
      ts: Date.now(),
      action: "admin_save_business_location",
      actorUid: actor.uid,
      businessLocationId: business_location_id,
    })
    json(res, 200, { ok: true })
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsKSeriesSyncItems = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const body = typeof req.body === "object" && req.body ? req.body : {}
    const authHeader = String(req.headers?.authorization || req.headers?.Authorization || "")
    const companyId = String(body.company_id || "").trim()
    const siteId = String(body.site_id || "default").trim()
    const subsiteId = String(body.subsite_id || "default").trim()
    const business_location_id = Number(body.business_location_id ?? 0)
    if (!companyId || !Number.isFinite(business_location_id) || business_location_id <= 0) {
      json(res, 400, { error: "Missing company_id or business_location_id" })
      return
    }
    const data = await forwardLightspeedRunSync(authHeader, {
      companyId,
      siteId: siteId === "default" ? undefined : siteId,
      subsiteId: subsiteId === "default" ? undefined : subsiteId,
      businessLocationId: business_location_id,
      syncProducts: true,
      syncSales: false,
      syncInventory: false,
    })
    json(res, 200, data)
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})

export const adminIntegrationsKSeriesSyncFinancials = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" })
      return
    }
    await requireIntegrationsActor(req)
    const body = typeof req.body === "object" && req.body ? req.body : {}
    const authHeader = String(req.headers?.authorization || req.headers?.Authorization || "")
    const companyId = String(body.company_id || "").trim()
    const siteId = String(body.site_id || "default").trim()
    const subsiteId = String(body.subsite_id || "default").trim()
    const business_location_id = Number(body.business_location_id ?? 0)
    const financial_from = body.financial_from ? String(body.financial_from) : undefined
    const financial_to = body.financial_to ? String(body.financial_to) : undefined
    if (!companyId || !Number.isFinite(business_location_id) || business_location_id <= 0) {
      json(res, 400, { error: "Missing company_id or business_location_id" })
      return
    }
    const data = await forwardLightspeedRunSync(authHeader, {
      companyId,
      siteId: siteId === "default" ? undefined : siteId,
      subsiteId: subsiteId === "default" ? undefined : subsiteId,
      businessLocationId: business_location_id,
      syncProducts: false,
      syncSales: true,
      syncInventory: false,
      startDate: financial_from,
      endDate: financial_to,
    })
    json(res, 200, data)
  } catch (e: any) {
    json(res, e?.status || 500, { error: e?.message || "Failed" })
  }
})
