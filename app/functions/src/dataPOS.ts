import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type PosScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type PosHandlerArgs = {
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

const firstQueryValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined
  return typeof value === "string" ? value : undefined
}

const normalizeBasePath = (raw: string): string => String(raw || "").trim().replace(/\/+$/, "")

const parseScope = (rawBasePath: string): PosScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/pos$/i)
  if (!match) throw Object.assign(new Error("Invalid POS basePath"), { status: 400 })

  return {
    companyId: match[1],
    siteId: match[2] || null,
    subsiteId: match[3] || null,
    basePath,
  }
}

const ENTITY_NAMES = new Set([
  "bills",
  "transactions",
  "tillscreens",
  "paymentTypes",
  "floorplans",
  "tables",
  "discounts",
  "promotions",
  "corrections",
  "bagCheckItems",
  "locations",
  "devices",
  "paymentIntegrations",
  "tickets",
  "ticketSales",
  "paymentTransactions",
  "sales",
  "groups",
  "courses",
  "cards",
  "bagCheckConfig",
])

const assertEntity = (value: string) => {
  if (!ENTITY_NAMES.has(value)) throw Object.assign(new Error(`Unsupported POS entity: ${value}`), { status: 400 })
  return value
}

const rowIdFor = (entityType: string, basePath: string, entityId: string) => `${entityType}::${basePath}::${entityId}`

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for POS provider"), {
      status: 500,
    })
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

const listRows = async (entityType: string, basePath: string) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("entity_type", `eq.${entityType}`)
  params.set("base_path", `eq.${basePath}`)
  params.set("order", "created_at.asc")
  return ((await supabaseRequest(`app_pos_entities?${params.toString()}`, { method: "GET" })) as Array<any>) || []
}

const getRow = async (entityType: string, basePath: string, entityId: string) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("entity_type", `eq.${entityType}`)
  params.set("base_path", `eq.${basePath}`)
  params.set("entity_id", `eq.${entityId}`)
  params.set("limit", "1")
  const rows = (await supabaseRequest(`app_pos_entities?${params.toString()}`, { method: "GET" })) as Array<any>
  return rows?.[0] || null
}

const insertRow = async (row: any) => {
  const rows = (await supabaseRequest("app_pos_entities", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  })) as Array<any>
  return rows?.[0] || null
}

const patchRow = async (rowId: string, patch: any) => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("row_id", `eq.${rowId}`)
  const rows = (await supabaseRequest(`app_pos_entities?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(stripUndefinedDeep(patch)),
  })) as Array<any>
  return rows?.[0] || null
}

const deleteRow = async (rowId: string) => {
  const params = new URLSearchParams()
  params.set("row_id", `eq.${rowId}`)
  await supabaseRequest(`app_pos_entities?${params.toString()}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })
}

const assertCompanyAccess = async (uid: string, companyId: string) => {
  const [userCompanySnap, companyUserSnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])

  if (!userCompanySnap.exists() && !companyUserSnap.exists()) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

const toTimestamp = (value: any, fallback = Date.now()) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const deriveName = (entityType: string, payload: any, entityId: string) =>
  String(
    payload?.name ||
      payload?.title ||
      payload?.tableName ||
      payload?.customerName ||
      payload?.ticketName ||
      payload?.locationName ||
      payload?.deviceName ||
      payload?.paymentMethod ||
      payload?.productId ||
      payload?.billId ||
      entityId,
  )

const deriveStatus = (payload: any) => {
  if (typeof payload?.status === "string") return payload.status
  if (payload?.isActive === false) return "inactive"
  if (payload?.isDefault === true) return "default"
  return "active"
}

const createEntityRow = (scope: PosScope, entityType: string, entityId: string, payload: any, existing?: any) => {
  const now = Date.now()
  const cleaned = stripUndefinedDeep(payload)
  const createdAt = toTimestamp(cleaned?.createdAt, existing?.created_at || now)
  const updatedAt = toTimestamp(cleaned?.updatedAt, now)

  return {
    row_id: rowIdFor(entityType, scope.basePath, entityId),
    entity_type: entityType,
    entity_id: entityId,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: deriveName(entityType, cleaned, entityId),
    status: deriveStatus(cleaned),
    payload: {
      ...(existing?.payload || {}),
      ...cleaned,
      id: entityId,
      createdAt,
      updatedAt,
    },
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

const normalizeRow = (row: any) => ({
  ...(row?.payload || {}),
  id: String(row?.entity_id || row?.payload?.id || ""),
})

export const handlePOSDataRequest = async ({ req, res, path, body, user }: PosHandlerArgs) => {
  try {
    const method = String(req.method || "GET").toUpperCase()

    const listMatch = path.match(/^\/data\/pos\/entities\/([^/]+)\/?$/)
    if (listMatch) {
      const entityType = assertEntity(decodeURIComponent(listMatch[1]))

      if (method === "GET") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        await assertCompanyAccess(user.uid, scope.companyId)
        const rows = (await listRows(entityType, scope.basePath)).map(normalizeRow)
        json(res, 200, { ok: true, rows })
        return
      }

      if (method === "POST") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const entityId = String(body?.data?.id || randomUUID())
        const row = createEntityRow(scope, entityType, entityId, body?.data || {})
        await insertRow(row)
        json(res, 200, { ok: true, row: normalizeRow(row), id: entityId })
        return
      }
    }

    const entityMatch = path.match(/^\/data\/pos\/entities\/([^/]+)\/([^/]+)\/?$/)
    if (entityMatch) {
      const entityType = assertEntity(decodeURIComponent(entityMatch[1]))
      const entityId = decodeURIComponent(entityMatch[2])

      if (method === "PATCH") {
        const scope = parseScope(String(body?.basePath || ""))
        await assertCompanyAccess(user.uid, scope.companyId)
        const existing = await getRow(entityType, scope.basePath, entityId)
        if (!existing) throw Object.assign(new Error(`${entityType} not found`), { status: 404 })
        const row = createEntityRow(scope, entityType, entityId, { ...existing.payload, ...(body?.updates || {}) }, existing)
        await patchRow(row.row_id, row)
        json(res, 200, { ok: true, row: normalizeRow(row) })
        return
      }

      if (method === "DELETE") {
        const scope = parseScope(firstQueryValue(req.query?.basePath) || "")
        await assertCompanyAccess(user.uid, scope.companyId)
        await deleteRow(rowIdFor(entityType, scope.basePath, entityId))
        json(res, 200, { ok: true })
        return
      }
    }

    json(res, 404, { error: `Unhandled POS route: ${method} ${path}` })
  } catch (error: any) {
    json(res, error?.status || 500, { error: error?.message || "Unexpected POS data error" })
  }
}
