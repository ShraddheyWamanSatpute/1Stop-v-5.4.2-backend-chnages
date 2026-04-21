import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type StockScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type StockHandlerArgs = {
  req: any
  res: any
  path: string
  body: any
  user: AppAuthedUser
}

const json = (res: any, status: number, body: any) => {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep)
  if (value && typeof value === "object") {
    const out: Record<string, any> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined) continue
      out[key] = stripUndefinedDeep(child)
    }
    return out
  }
  return value
}

const normalizeBasePath = (raw: string): string => String(raw || "").trim().replace(/\/+$/, "")

const parseStockScope = (rawBasePath: string): StockScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(
    /^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/stock$/i,
  )

  if (!match) {
    throw Object.assign(new Error("Invalid stock basePath"), { status: 400 })
  }

  return {
    companyId: match[1],
    siteId: match[2] || null,
    subsiteId: match[3] || null,
    basePath,
  }
}

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Stock provider"),
      { status: 500 },
    )
  }

  return { url, serviceRoleKey }
}

const supabaseRequest = async (path: string, init?: RequestInit) => {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(text || `Supabase request failed (${res.status})`), { status: 502 })
  }

  const text = await res.text().catch(() => "")
  return text ? JSON.parse(text) : null
}

const assertCompanyAccess = async (uid: string, companyId: string) => {
  const [userCompanySnap, ownedCompanySnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])

  if (!userCompanySnap.exists() && !ownedCompanySnap.exists()) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

const getSingleRow = async (table: string, filters: Record<string, string>) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("limit", "1")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return rows?.[0] || null
}

const listRows = async (table: string, basePath: string) => {
  const params = new URLSearchParams()
  params.set("base_path", `eq.${basePath}`)
  params.set("select", "id,payload,created_at,updated_at")
  params.set("order", "created_at.asc")
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return (rows || []).map((row) => ({
    ...(row?.payload || {}),
    id: row?.id,
  }))
}

const insertRow = async (table: string, row: any) => {
  const rows = (await supabaseRequest(`${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  })) as Array<any>
  return rows?.[0] || null
}

const patchRow = async (table: string, filters: Record<string, string>, patch: any) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(stripUndefinedDeep(patch)),
  })) as Array<any>
  return rows?.[0] || null
}

const deleteRow = async (table: string, filters: Record<string, string>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  await supabaseRequest(`${table}?${params.toString()}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })
}

const createEntityRow = (
  scope: StockScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null },
) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(opts?.name || cleaned?.name || id),
    status: opts?.status ?? cleaned?.status ?? null,
    code: opts?.code ?? cleaned?.sku ?? cleaned?.ref ?? null,
    payload: {
      ...cleaned,
      id,
    },
    created_at: Date.parse(cleaned?.createdAt || cleaned?.created_at || new Date().toISOString()),
    updated_at: Date.now(),
  }
}

const upsertEntity = async (
  table: string,
  scope: StockScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null },
) => {
  const existing = await getSingleRow(table, { id, base_path: scope.basePath })
  const mergedPayload = {
    ...(existing?.payload || {}),
    ...stripUndefinedDeep(payload),
    id,
  }
  const row = createEntityRow(scope, id, mergedPayload, opts)

  if (!existing) {
    await insertRow(table, row)
  } else {
    await patchRow(table, { id, base_path: scope.basePath }, row)
  }

  return {
    ...(row.payload || {}),
    id,
  }
}

const upsertSupplier = async (scope: StockScope, id: string, payload: any) =>
  upsertEntity("stock_suppliers", scope, id, payload, {
    name: payload?.name || id,
    status: payload?.active === false ? "inactive" : "active",
    code: payload?.ref || null,
  })

const upsertItem = async (scope: StockScope, id: string, payload: any) =>
  upsertEntity("stock_items", scope, id, payload, {
    name: payload?.name || id,
    status: payload?.active === false ? "inactive" : "active",
    code: payload?.sku || payload?.barcode || null,
  })

const upsertPurchaseOrder = async (scope: StockScope, id: string, payload: any) =>
  upsertEntity("stock_purchase_orders", scope, id, payload, {
    name: payload?.supplier || payload?.supplierName || id,
    status: payload?.status || null,
    code: payload?.invoiceNumber || null,
  })

const upsertStockCount = async (scope: StockScope, id: string, payload: any) =>
  upsertEntity("stock_counts", scope, id, payload, {
    name: payload?.name || payload?.reference || payload?.dateUK || id,
    status: payload?.status || null,
    code: payload?.reference || null,
  })

export const handleStockDataRequest = async ({ req, res, path, body, user }: StockHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  const entityMap: Record<
    string,
    {
      table: string
      list: (scope: StockScope) => Promise<any[]>
      upsert: (scope: StockScope, id: string, payload: any) => Promise<any>
    }
  > = {
    suppliers: {
      table: "stock_suppliers",
      list: (scope) => listRows("stock_suppliers", scope.basePath),
      upsert: upsertSupplier,
    },
    items: {
      table: "stock_items",
      list: (scope) => listRows("stock_items", scope.basePath),
      upsert: upsertItem,
    },
    purchaseOrders: {
      table: "stock_purchase_orders",
      list: (scope) => listRows("stock_purchase_orders", scope.basePath),
      upsert: upsertPurchaseOrder,
    },
    stockCounts: {
      table: "stock_counts",
      list: (scope) => listRows("stock_counts", scope.basePath),
      upsert: upsertStockCount,
    },
  }

  const listMatch = pathname.match(/^\/data\/stock\/(suppliers|items|purchaseOrders|stockCounts)$/)
  if (listMatch && method === "GET") {
    const scope = parseStockScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    send(200, { ok: true, rows: await entityMap[entity].list(scope) })
    return
  }

  if (listMatch && method === "POST") {
    const scope = parseStockScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    const id = String(body?.data?.id || randomUUID())
    const row = await entityMap[entity].upsert(scope, id, body?.data || {})
    send(200, { ok: true, id, row })
    return
  }

  const itemMatch = pathname.match(/^\/data\/stock\/(suppliers|items|purchaseOrders|stockCounts)\/([^/]+)$/)
  if (itemMatch && method === "PATCH") {
    const scope = parseStockScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    await entityMap[entity].upsert(scope, id, body?.updates || {})
    send(200, { ok: true })
    return
  }

  if (itemMatch && method === "DELETE") {
    const scope = parseStockScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath })
    send(200, { ok: true })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
