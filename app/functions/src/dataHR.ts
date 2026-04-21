import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type HrScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type HrHandlerArgs = {
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

const parseHrScope = (rawBasePath: string): HrScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(
    /^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/hr$/i,
  )

  if (!match) {
    throw Object.assign(new Error("Invalid HR basePath"), { status: 400 })
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
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for HR provider"),
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

const getCreatedAt = (payload: any) => {
  const value = payload?.createdAt
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

const createEntityRow = (
  scope: HrScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null },
) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(opts?.name || cleaned?.name || cleaned?.employeeName || id),
    status: opts?.status ?? cleaned?.status ?? null,
    payload: {
      ...cleaned,
      id,
    },
    created_at: getCreatedAt(cleaned),
    updated_at: Date.now(),
  }
}

const upsertEntity = async (
  table: string,
  scope: HrScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null },
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

const upsertEmployee = async (scope: HrScope, id: string, payload: any) =>
  upsertEntity("hr_employees", scope, id, payload, {
    name: [payload?.firstName, payload?.lastName].filter(Boolean).join(" ").trim() || payload?.email || id,
    status: payload?.status || "active",
  })

const upsertTimeOff = async (scope: HrScope, id: string, payload: any) =>
  upsertEntity("hr_time_offs", scope, id, payload, {
    name: payload?.employeeName || payload?.employeeId || id,
    status: payload?.status || "pending",
  })

const upsertAttendance = async (scope: HrScope, id: string, payload: any) =>
  upsertEntity("hr_attendances", scope, id, payload, {
    name: payload?.employeeId || id,
    status: payload?.status || "present",
  })

const upsertSchedule = async (scope: HrScope, id: string, payload: any) =>
  upsertEntity("hr_schedules", scope, id, payload, {
    name: `${payload?.employeeName || payload?.employeeId || "schedule"} ${payload?.date || ""}`.trim(),
    status: payload?.status || "scheduled",
  })

export const handleHRDataRequest = async ({ req, res, path, body, user }: HrHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  const entityMap: Record<
    string,
    {
      table: string
      list: (scope: HrScope) => Promise<any[]>
      upsert: (scope: HrScope, id: string, payload: any) => Promise<any>
    }
  > = {
    employees: {
      table: "hr_employees",
      list: (scope) => listRows("hr_employees", scope.basePath),
      upsert: upsertEmployee,
    },
    timeOffs: {
      table: "hr_time_offs",
      list: (scope) => listRows("hr_time_offs", scope.basePath),
      upsert: upsertTimeOff,
    },
    attendances: {
      table: "hr_attendances",
      list: (scope) => listRows("hr_attendances", scope.basePath),
      upsert: upsertAttendance,
    },
    schedules: {
      table: "hr_schedules",
      list: (scope) => listRows("hr_schedules", scope.basePath),
      upsert: upsertSchedule,
    },
  }

  const listMatch = pathname.match(/^\/data\/hr\/(employees|timeOffs|attendances|schedules)$/)
  if (listMatch && method === "GET") {
    const scope = parseHrScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    send(200, { ok: true, rows: await entityMap[entity].list(scope) })
    return
  }

  if (listMatch && method === "POST") {
    const scope = parseHrScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    const id = String(body?.data?.id || randomUUID())
    const row = await entityMap[entity].upsert(scope, id, body?.data || {})
    send(200, { ok: true, id, row })
    return
  }

  const itemMatch = pathname.match(/^\/data\/hr\/(employees|timeOffs|attendances|schedules)\/([^/]+)$/)
  if (itemMatch && method === "PATCH") {
    const scope = parseHrScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    const row = await entityMap[entity].upsert(scope, id, body?.updates || {})
    send(200, { ok: true, row })
    return
  }

  if (itemMatch && method === "DELETE") {
    const scope = parseHrScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath })
    send(200, { ok: true })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
