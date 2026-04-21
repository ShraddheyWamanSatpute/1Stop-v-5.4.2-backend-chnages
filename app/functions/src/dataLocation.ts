import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type Scope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type HandlerArgs = {
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

const parseScope = (rawBasePath: string): Scope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?(?:\/data\/[^/]+)?$/i)

  if (!match) {
    throw Object.assign(new Error("Invalid location basePath"), { status: 400 })
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
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Location provider"),
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
  params.set("select", "id,payload")
  params.set("order", "created_at.asc")
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return (rows || []).map((row) => ({ ...(row?.payload || {}), id: row?.id }))
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

const createRow = (scope: Scope, id: string, payload: any) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(cleaned?.name || id),
    status: cleaned?.active === false ? "inactive" : "active",
    payload: {
      ...cleaned,
      id,
    },
    created_at: Date.parse(cleaned?.createdAt || new Date().toISOString()),
    updated_at: Date.now(),
  }
}

const upsertLocation = async (scope: Scope, id: string, payload: any) => {
  const existing = await getSingleRow("app_locations", { id, base_path: scope.basePath })
  const row = createRow(scope, id, {
    ...(existing?.payload || {}),
    ...payload,
    id,
  })
  if (!existing) await insertRow("app_locations", row)
  else await patchRow("app_locations", { id, base_path: scope.basePath }, row)
  return { ...(row.payload || {}), id }
}

export const handleLocationDataRequest = async ({ req, res, path, body, user }: HandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  if (pathname === "/data/location/locations" && method === "GET") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    send(200, { ok: true, rows: await listRows("app_locations", scope.basePath) })
    return
  }

  if (pathname === "/data/location/locations" && method === "POST") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = String(body?.data?.id || randomUUID())
    const row = await upsertLocation(scope, id, body?.data || {})
    send(200, { ok: true, id, row })
    return
  }

  const itemMatch = pathname.match(/^\/data\/location\/locations\/([^/]+)$/)
  if (itemMatch && method === "PATCH") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = decodeURIComponent(itemMatch[1])
    const row = await upsertLocation(scope, id, body?.updates || {})
    send(200, { ok: true, row })
    return
  }

  if (itemMatch && method === "DELETE") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = decodeURIComponent(itemMatch[1])
    await deleteRow("app_locations", { id, base_path: scope.basePath })
    send(200, { ok: true })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
