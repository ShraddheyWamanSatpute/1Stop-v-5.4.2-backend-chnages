import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { getAuth } from "firebase-admin/auth"
import { firestore, db as rtdb } from "./admin"
import { FUNCTION_KEYS } from "./keys"
import { loadOperatorOAuthCreds, requireCompanyMemberOrAdminSupport } from "./oauthLightspeedK"

type EnvName = "production" | "trial"

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

function kSyncLog(event: string, fields: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ source: "lightspeedKSync", event, ts: Date.now(), ...fields }))
  } catch {
    console.log(`[lightspeedKSync] ${event}`)
  }
}

function getEnvBaseUrl(environment: EnvName): string {
  return environment === "trial" ? "https://api.trial.lsk.lightspeed.app" : "https://api.lsk.lightspeed.app"
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

function getStockBasePath(companyId: string, siteId?: string, subsiteId?: string): string {
  if (subsiteId && siteId) return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/stock`
  if (siteId) return `companies/${companyId}/sites/${siteId}/data/stock`
  return `companies/${companyId}/data/stock`
}

function getPOSBasePath(companyId: string, siteId?: string, subsiteId?: string): string {
  if (subsiteId && siteId) return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/pos`
  if (siteId) return `companies/${companyId}/sites/${siteId}/data/pos`
  return `companies/${companyId}/data/pos`
}

function getTokenDocId(companyId: string, siteId?: string, subsiteId?: string): string {
  const s = siteId || "default"
  const ss = subsiteId || "default"
  return `${companyId}_${s}_${ss}_lightspeedk`
}

type StoredTokenDoc = {
  provider: "lightspeedk"
  companyId: string
  siteId: string
  subsiteId: string
  environment: EnvName
  scope?: string
  access_token: string
  refresh_token: string
  token_type: string
  expires_at_sec: number
}

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
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

  kSyncLog("refresh_access_token", { environment: opts.environment, usingOperatorCreds: Boolean(opts.operator) })

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
    throw new Error(`Lightspeed token refresh failed (${resp.status}): ${txt}`)
  }

  return resp.json()
}

export async function loadValidToken(companyId: string, siteId?: string, subsiteId?: string): Promise<{
  token: StoredTokenDoc
  accessToken: string
}> {
  const tokenDocId = getTokenDocId(companyId, siteId, subsiteId)
  const docRef = firestore.collection("pos_oauth_tokens").doc(tokenDocId)
  const snap = await docRef.get()
  if (!snap.exists) throw Object.assign(new Error("Not connected to Lightspeed (missing token)"), { status: 400 })
  const data = snap.data() as any as StoredTokenDoc
  if (!data?.access_token || !data?.refresh_token) {
    throw Object.assign(new Error("Invalid Lightspeed token document"), { status: 500 })
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const expiry = Number(data.expires_at_sec || 0)
  const shouldRefresh = !expiry || expiry <= nowSec + 300 // 5 min skew

  if (!shouldRefresh) {
    return { token: data, accessToken: data.access_token }
  }

  const op = await loadOperatorOAuthCreds(companyId, siteId, subsiteId)
  const refreshed = await refreshAccessToken({
    environment: data.environment || "production",
    refreshToken: data.refresh_token,
    operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
  })
  const expiresAtSec = nowSec + (Number(refreshed.expires_in) || 3600)

  const merged: Partial<StoredTokenDoc> = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || data.refresh_token,
    token_type: refreshed.token_type || data.token_type,
    scope: refreshed.scope || data.scope,
    expires_at_sec: expiresAtSec,
  }

  await docRef.set({ ...merged, updatedAt: new Date() } as any, { merge: true })

  // Update RTDB mirror (non-sensitive)
  const settingsPath = getSettingsPath(companyId, siteId, subsiteId)
  await rtdb.ref(settingsPath).update({
    tokenType: merged.token_type,
    tokenExpiry: expiresAtSec,
    scope: merged.scope,
    updatedAt: Date.now(),
  })

  const nextToken = { ...(data as any), ...(merged as any) } as StoredTokenDoc
  return { token: nextToken, accessToken: String(refreshed.access_token) }
}

async function apiJson<T>(opts: {
  environment: EnvName
  accessToken: string
  path: string
  method?: "GET" | "POST"
  body?: any
}): Promise<T> {
  const baseUrl = getEnvBaseUrl(opts.environment)
  const url = `${baseUrl}${opts.path.startsWith("/") ? "" : "/"}${opts.path}`

  const resp = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Lightspeed API error (${resp.status}) for ${opts.path}: ${txt}`)
  }

  return resp.json()
}

function normKey(v: any): string {
  return String(v || "").trim().toLowerCase()
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function fetchAllItems(environment: EnvName, accessToken: string, businessLocationId: number): Promise<any[]> {
  const pageSize = 200
  let offset = 0
  const items: any[] = []
  while (true) {
    const qs = new URLSearchParams({
      businessLocationId: String(businessLocationId),
      offset: String(offset),
      amount: String(pageSize),
    })
    const resp: any = await apiJson<any>({
      environment,
      accessToken,
      path: `/items/v1/items?${qs.toString()}`,
      method: "GET",
    })
    const page: any[] = Array.isArray(resp) ? resp : Array.isArray(resp?.items) ? resp.items : resp ? [resp] : []
    if (!page.length) break
    items.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return items
}

export async function fetchBusinesses(environment: EnvName, accessToken: string): Promise<any> {
  return apiJson<any>({ environment, accessToken, path: "/o/op/data/businesses", method: "GET" })
}

export async function fetchSales(environment: EnvName, accessToken: string, businessLocationId: number, startDate?: string, endDate?: string): Promise<any[]> {
  const out: any[] = []
  const include = ["payments", "table", "staff", "customer"]
  const pageSize = 200
  let nextPageToken: string | undefined = undefined

  while (true) {
    const qs = new URLSearchParams({
      include: include.join(","),
      limit: String(pageSize),
    })
    if (startDate) qs.set("from", startDate)
    if (endDate) qs.set("to", endDate)
    if (nextPageToken) qs.set("pageToken", nextPageToken)

    const resp: any = await apiJson<any>({
      environment,
      accessToken,
      path: `/f/v2/business-location/${businessLocationId}/sales?${qs.toString()}`,
      method: "GET",
    })

    const rows: any[] = Array.isArray(resp?.sales) ? resp.sales : Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : []
    out.push(...rows)

    nextPageToken = resp?.nextPageToken || resp?.next_page_token || undefined
    if (!nextPageToken || rows.length < pageSize) break
  }

  return out
}

async function fetchAvailability(environment: EnvName, accessToken: string, businessLocationId: number, skus: string[]): Promise<any[]> {
  const results: any[] = []
  for (const part of chunk(skus.filter(Boolean), 200)) {
    const qs = new URLSearchParams({
      businessLocationId: String(businessLocationId),
    })
    // Some deployments expect repeated `sku` params; others accept a comma list.
    // We try repeated parameters (most compatible).
    for (const sku of part) qs.append("sku", sku)

    const resp: any = await apiJson<any>({
      environment,
      accessToken,
      path: `/o/op/1/itemAvailability?${qs.toString()}`,
      method: "GET",
    })
    const rows: any[] = Array.isArray(resp) ? resp : Array.isArray(resp?.availabilities) ? resp.availabilities : Array.isArray(resp?.data) ? resp.data : []
    results.push(...rows)
  }
  return results
}

export function buildLocationOptions(raw: any): Array<{
  businessId?: number
  businessName?: string
  businessLocationId: number
  businessLocationName?: string
}> {
  const businesses: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.businesses) ? raw.businesses : Array.isArray(raw?.data) ? raw.data : []
  const out: any[] = []
  for (const b of businesses) {
    const bId = b?.id ?? b?.businessId
    const bName = b?.name ?? b?.businessName
    const locs: any[] = Array.isArray(b?.businessLocations)
      ? b.businessLocations
      : Array.isArray(b?.locations)
        ? b.locations
        : Array.isArray(b?.business_locations)
          ? b.business_locations
          : []

    for (const loc of locs) {
      const locId = Number(loc?.id ?? loc?.businessLocationId ?? loc?.business_location_id)
      if (!Number.isFinite(locId)) continue
      out.push({
        businessId: Number.isFinite(Number(bId)) ? Number(bId) : undefined,
        businessName: bName ? String(bName) : undefined,
        businessLocationId: locId,
        businessLocationName: loc?.name ? String(loc.name) : undefined,
      })
    }
  }
  // de-dupe
  const seen = new Set<string>()
  return out.filter((x) => {
    const k = `${x.businessLocationId}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Authenticated discovery: list businesses + locations using stored token.
 */
export const lightspeedKGetBusinesses = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
  try {
    const user = await requireUser(req)
    const companyId = String((req.method === "GET" ? req.query.companyId : req.body?.companyId) || "").trim()
    const siteId = String((req.method === "GET" ? req.query.siteId : req.body?.siteId) || "").trim() || undefined
    const subsiteId = String((req.method === "GET" ? req.query.subsiteId : req.body?.subsiteId) || "").trim() || undefined
    if (!companyId) throw Object.assign(new Error("Missing companyId"), { status: 400 })

    await requireCompanyMemberOrAdminSupport(user.uid, companyId)

    const { token, accessToken } = await loadValidToken(companyId, siteId, subsiteId)
    const raw = await fetchBusinesses(token.environment || "production", accessToken)
    const locations = buildLocationOptions(raw)

    json(res, 200, { ok: true, locations, rawSummary: { count: locations.length } })
  } catch (e: any) {
    console.error("lightspeedKGetBusinesses error:", e)
    json(res, e?.status || 500, { ok: false, error: e?.message || "Failed to fetch businesses" })
  }
  }
)

export type LightspeedKSyncCoreInput = {
  triggeredBy: "http" | "schedule"
  companyId: string
  siteId?: string
  subsiteId?: string
  startDate?: string
  endDate?: string
  /** Optional POST-body style overrides (manual sync from app / admin). */
  body?: Record<string, any>
}

/**
 * Server-side sync used by `lightspeedKRunSync` and the scheduled job.
 * Products → RTDB stock; inventory rows; sales summaries → RTDB POS bills.
 */
export async function runLightspeedKSyncCore(input: LightspeedKSyncCoreInput): Promise<any> {
  const { companyId, siteId, subsiteId, startDate, endDate, body, triggeredBy } = input
  const settingsPath = getSettingsPath(companyId, siteId, subsiteId)
  const settingsSnap = await rtdb.ref(settingsPath).get()
  const settings: any = settingsSnap.exists() ? settingsSnap.val() : {}
  const b = body && typeof body === "object" ? body : {}

  const syncProducts = b.syncProducts !== undefined ? Boolean(b.syncProducts) : Boolean(settings?.syncProducts)
  const syncSales = b.syncSales !== undefined ? Boolean(b.syncSales) : Boolean(settings?.syncSales)
  const syncInventory = b.syncInventory !== undefined ? Boolean(b.syncInventory) : Boolean(settings?.syncInventory)

  const businessLocationId = Number(b.businessLocationId ?? settings?.businessLocationId ?? 0)
  if (!Number.isFinite(businessLocationId) || businessLocationId <= 0) {
    throw Object.assign(new Error("Missing businessLocationId. Use 'Discover locations' then save a location."), { status: 400 })
  }

  const stockBasePath = getStockBasePath(companyId, siteId, subsiteId)
  const posBasePath = getPOSBasePath(companyId, siteId, subsiteId)

  try {
    await rtdb.ref(settingsPath).update({
      syncStatus: "syncing",
      syncError: null,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    })

    kSyncLog("runSync_start", {
      triggeredBy,
      companyId,
      siteId: siteId || "default",
      subsiteId: subsiteId || "default",
      businessLocationId,
      syncProducts,
      syncSales,
      syncInventory,
      hasStartDate: Boolean(startDate),
      hasEndDate: Boolean(endDate),
    })

    const { token, accessToken } = await loadValidToken(companyId, siteId, subsiteId)
    const env = token.environment || (settings?.environment === "trial" ? "trial" : "production")

    const result: any = {
      ok: true,
      products: { created: 0, updated: 0, errors: 0 },
      inventory: { updated: 0, errors: 0 },
      sales: { created: 0, updated: 0, errors: 0 },
    }

    const productsSnap = await rtdb.ref(`${stockBasePath}/products`).get()
    const existingProducts: Record<string, any> = productsSnap.exists() ? (productsSnap.val() as any) : {}
    const bySku = new Map<string, { id: string; data: any }>()
    const byName = new Map<string, { id: string; data: any }>()
    for (const [id, p] of Object.entries(existingProducts)) {
      const sku = (p as any)?.sku
      const name = (p as any)?.name
      if (sku) bySku.set(normKey(sku), { id, data: p })
      if (name) byName.set(normKey(name), { id, data: p })
    }

    if (syncProducts) {
      const items = await fetchAllItems(env, accessToken, businessLocationId)
      for (const it of items) {
        try {
          const itemId = String(it?.id ?? it?.itemId ?? "")
          const name = String(it?.name ?? it?.description ?? "").trim()
          if (!itemId || !name) continue

          const sku = String(it?.sku ?? it?.skuCode ?? it?.PLU ?? it?.plu ?? itemId).trim()
          const price = Number(it?.price?.amount ?? it?.price ?? it?.unitPrice ?? 0)
          const cost = Number(it?.cost?.amount ?? it?.cost ?? 0)
          const categoryId = it?.categoryId ? String(it.categoryId) : "default"

          const local: any = {
            name,
            sku,
            type: "product",
            categoryId,
            subcategoryId: "default",
            salesDivisionId: "default",
            active: it?.active !== undefined ? Boolean(it.active) : true,
            salesPrice: Number.isFinite(price) ? price : 0,
            purchasePrice: Number.isFinite(cost) ? cost : 0,
            predictedStock: 0,
            description: it?.description ? String(it.description) : undefined,
            image: it?.imageUrl ? String(it.imageUrl) : undefined,
            metadata: {
              lightspeedk: {
                businessLocationId,
                itemId,
                sku,
                raw: undefined,
              },
            },
          }

          if (Number.isFinite(price) && price > 0) {
            local.sale = {
              price,
              measure: "unit",
              quantity: 1,
              supplierId: "default",
              defaultMeasure: "unit",
              units: [{ measure: "unit", price, quantity: 1 }],
            }
          }
          if (Number.isFinite(cost) && cost > 0) {
            local.purchase = {
              price: cost,
              measure: "unit",
              quantity: 1,
              supplierId: "default",
              defaultMeasure: "unit",
              units: [{ measure: "unit", price: cost, quantity: 1 }],
            }
          }

          const skuKey = normKey(sku)
          const nameKey = normKey(name)
          const existing =
            (skuKey && bySku.get(skuKey)) ||
            (nameKey && byName.get(nameKey)) ||
            undefined

          if (existing) {
            const targetRef = rtdb.ref(`${stockBasePath}/products/${existing.id}`)
            await targetRef.update({
              ...local,
              id: existing.id,
              updatedAt: new Date().toISOString(),
            })
            result.products.updated++
          } else {
            const deterministicId = `lightspeedk_${businessLocationId}_${itemId}`.replace(/[^\w-]/g, "_")
            const targetRef = rtdb.ref(`${stockBasePath}/products/${deterministicId}`)
            const createdAt = new Date().toISOString()
            await targetRef.set({
              ...local,
              id: deterministicId,
              createdAt,
              updatedAt: createdAt,
            })
            result.products.created++
            if (sku) bySku.set(skuKey, { id: deterministicId, data: local })
            if (name) byName.set(nameKey, { id: deterministicId, data: local })
          }
        } catch (err) {
          console.error("lightspeedKRunSync product error:", err)
          result.products.errors++
        }
      }
    }

    if (syncInventory) {
      try {
        const currentSnap = await rtdb.ref(`${stockBasePath}/products`).get()
        const currentProducts: Record<string, any> = currentSnap.exists() ? (currentSnap.val() as any) : {}
        const skuToId = new Map<string, string>()
        for (const [id, p] of Object.entries(currentProducts)) {
          const sku = (p as any)?.sku
          if (sku) skuToId.set(normKey(sku), id)
        }
        const skus = Array.from(skuToId.keys())
        const availabilityRows = await fetchAvailability(env, accessToken, businessLocationId, skus)
        for (const row of availabilityRows) {
          try {
            const sku = String(row?.sku ?? row?.itemSku ?? "").trim()
            if (!sku) continue
            const id = skuToId.get(normKey(sku))
            if (!id) continue
            const qty = Number(row?.availableQuantity ?? row?.available ?? row?.quantity ?? 0)
            await rtdb.ref(`${stockBasePath}/products/${id}`).update({
              quantity: Number.isFinite(qty) ? qty : 0,
              updatedAt: new Date().toISOString(),
            })
            result.inventory.updated++
          } catch (err) {
            console.error("lightspeedKRunSync inventory row error:", err)
            result.inventory.errors++
          }
        }
      } catch (err) {
        console.error("lightspeedKRunSync inventory error:", err)
        result.inventory.errors++
      }
    }

    if (syncSales) {
      const sales = await fetchSales(env, accessToken, businessLocationId, startDate, endDate)
      kSyncLog("runSync_sales_fetched", { companyId, businessLocationId, saleRows: sales.length, triggeredBy })

      const billsSnap = await rtdb.ref(`${posBasePath}/bills`).get()
      const existingBills: Record<string, any> = billsSnap.exists() ? (billsSnap.val() as any) : {}
      const existingIds = new Set(Object.keys(existingBills))

      for (const s of sales) {
        try {
          const saleId = String(s?.id ?? s?.saleId ?? s?.orderId ?? "")
          if (!saleId) continue

          const total = Number(s?.total?.amount ?? s?.totalAmount ?? s?.total ?? 0)
          const subtotal = Number(s?.subtotal?.amount ?? s?.subTotalAmount ?? s?.subtotal ?? 0)
          const tax = Number(s?.tax?.amount ?? s?.taxAmount ?? s?.tax ?? 0)

          const createdAt = (() => {
            const when = Date.parse(String(s?.date ?? s?.createdAt ?? s?.closedAt ?? ""))
            return Number.isFinite(when) ? when : Date.now()
          })()

          const raw: any = s
          const tableName =
            raw?.table?.name ||
            raw?.table?.tableName ||
            raw?.table?.displayName ||
            raw?.metadata?.tableName ||
            "TAKEAWAY"
          const staffName =
            raw?.staff?.name ||
            raw?.ownerName ||
            raw?.staffName ||
            raw?.customerName ||
            "System"

          const billId = `lightspeedk_${businessLocationId}_${saleId}`.replace(/[^\w-]/g, "_")
          const bill: any = {
            id: billId,
            tableName: String(tableName),
            tableNumber: String(tableName),
            server: String(staffName),
            staffName: String(staffName),
            items: [],
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            tax: Number.isFinite(tax) ? tax : 0,
            total: Number.isFinite(total) ? total : 0,
            status: "paid",
            paymentStatus: "completed",
            serviceCharge: 0,
            discount: 0,
            createdAt,
            updatedAt: Date.now(),
            paymentMethod: "lightspeed",
            locationId: String(businessLocationId),
            locationName: settings?.businessLocationName ? String(settings.businessLocationName) : undefined,
          }

          const existed = existingIds.has(billId)
          await rtdb.ref(`${posBasePath}/bills/${billId}`).update(bill)
          if (existed) result.sales.updated++
          else {
            result.sales.created++
            existingIds.add(billId)
          }
        } catch (err) {
          console.error("lightspeedKRunSync sale error:", err)
          result.sales.errors++
        }
      }
    }

    await rtdb.ref(settingsPath).update({
      syncStatus: "success",
      syncError: null,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    })

    kSyncLog("runSync_success", {
      triggeredBy,
      companyId,
      businessLocationId,
      products: result.products,
      inventory: result.inventory,
      sales: result.sales,
    })

    return result
  } catch (e: any) {
    console.error("runLightspeedKSyncCore error:", e)
    kSyncLog("runSync_error", {
      triggeredBy,
      message: String(e?.message || e),
      status: e?.status,
      companyId,
    })
    try {
      await rtdb.ref(settingsPath).update({
        syncStatus: "error",
        syncError: e?.message || "Sync failed",
        updatedAt: Date.now(),
      })
    } catch {}
    throw e
  }
}

/**
 * Authenticated sync runner (manual / app-triggered).
 */
export const lightspeedKRunSync = onRequest(
  { cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        json(res, 405, { ok: false, error: "Method not allowed" })
        return
      }

      const user = await requireUser(req)
      const companyId = String(req.body?.companyId || "").trim()
      const siteId = String(req.body?.siteId || "").trim() || undefined
      const subsiteId = String(req.body?.subsiteId || "").trim() || undefined
      const startDate = req.body?.startDate ? String(req.body.startDate) : undefined
      const endDate = req.body?.endDate ? String(req.body.endDate) : undefined

      if (!companyId) throw Object.assign(new Error("Missing companyId"), { status: 400 })
      await requireCompanyMemberOrAdminSupport(user.uid, companyId)

      const result = await runLightspeedKSyncCore({
        triggeredBy: "http",
        companyId,
        siteId,
        subsiteId,
        startDate,
        endDate,
        body: req.body && typeof req.body === "object" ? req.body : undefined,
      })
      json(res, 200, result)
    } catch (e: any) {
      console.error("lightspeedKRunSync error:", e)
      json(res, e?.status || 500, { ok: false, error: e?.message || "Sync failed" })
    }
  }
)

const SCHEDULE_MAX_TARGETS = 18

/**
 * Periodically pulls Lightspeed data for tenants that enabled auto-sync in POS settings.
 * Runs every 15 minutes; respects `autoSyncInterval` (minutes) between successful runs per tenant.
 */
export const lightspeedKScheduledSync = onSchedule(
  {
    schedule: "every 15 minutes",
    secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"],
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    kSyncLog("schedule_tick_start", {})
    const qs = await firestore.collection("pos_oauth_tokens").where("provider", "==", "lightspeedk").limit(250).get()
    let ran = 0
    for (const doc of qs.docs) {
      if (ran >= SCHEDULE_MAX_TARGETS) break
      const data = doc.data() as any
      const companyId = String(data.companyId || "").trim()
      if (!companyId) continue

      const siteId = String(data.siteId || "default") === "default" ? undefined : String(data.siteId)
      const subsiteId = String(data.subsiteId || "default") === "default" ? undefined : String(data.subsiteId)
      const settingsPath = getSettingsPath(companyId, siteId, subsiteId)
      const settingsSnap = await rtdb.ref(settingsPath).get()
      const settings: any = settingsSnap.exists() ? settingsSnap.val() : {}

      if (!settings.autoSyncEnabled) continue

      const bl = Number(settings.businessLocationId || 0)
      if (!Number.isFinite(bl) || bl <= 0) continue

      const intervalMin = Math.max(5, Number(settings.autoSyncInterval || 30))
      const lastOk = Number(settings.lastScheduledSyncAt || 0)
      if (lastOk && Date.now() - lastOk < intervalMin * 60 * 1000) continue

      try {
        await runLightspeedKSyncCore({
          triggeredBy: "schedule",
          companyId,
          siteId,
          subsiteId,
        })
        await rtdb.ref(settingsPath).update({ lastScheduledSyncAt: Date.now() })
        ran++
      } catch (e: any) {
        kSyncLog("schedule_target_failed", { companyId, siteId: siteId || "default", message: String(e?.message || e) })
      }
    }
    kSyncLog("schedule_tick_done", { tokenDocs: qs.size, ran })
  }
)

