import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type BookingScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  basePath: string
}

type BookingHandlerArgs = {
  req: any
  res: any
  path: string
  body: any
  user: AppAuthedUser
}

const DEFAULT_BOOKING_SETTINGS = {
  openTimes: {},
  bookingTypes: {},
  businessHours: [],
  blackoutDates: [],
  allowOnlineBookings: false,
  maxDaysInAdvance: 30,
  minHoursInAdvance: 1,
  timeSlotInterval: 30,
  defaultDuration: 2,
  maxPartySize: 20,
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

const parseBookingScope = (rawBasePath: string): BookingScope => {
  const basePath = normalizeBasePath(rawBasePath)
  const match = basePath.match(
    /^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/bookings$/i,
  )

  if (!match) {
    throw Object.assign(new Error("Invalid bookings basePath"), { status: 400 })
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
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Bookings provider"),
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
  params.set("select", "id,payload,created_at")
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

const createEntityRow = (
  scope: BookingScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null; createdAt?: number },
) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(opts?.name || cleaned?.name || cleaned?.firstName || cleaned?.description || id),
    status: opts?.status ?? cleaned?.status ?? null,
    code: opts?.code ?? cleaned?.code ?? null,
    payload: {
      ...cleaned,
      id,
    },
    created_at: opts?.createdAt ?? Date.parse(cleaned?.createdAt || cleaned?.timeAdded || new Date().toISOString()),
    updated_at: Date.now(),
  }
}

const upsertEntity = async (
  table: string,
  scope: BookingScope,
  id: string,
  payload: any,
  opts?: { name?: string; status?: string | null; code?: string | null; createdAt?: number },
) => {
  const existing = await getSingleRow(table, { id, base_path: scope.basePath })
  const mergedPayload = {
    ...(existing?.payload || {}),
    ...stripUndefinedDeep(payload),
    id,
  }
  const row = createEntityRow(scope, id, mergedPayload, opts)

  if (!existing) await insertRow(table, row)
  else await patchRow(table, { id, base_path: scope.basePath }, row)

  return { ...(row.payload || {}), id }
}

const lower = (value: unknown) => String(value || "").toLowerCase()

const tableTypeRowName = (payload: any) => String(payload?.name || payload || "Table Type")

const buildBookingStats = (bookings: any[]) => {
  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    noShowBookings: 0,
    averagePartySize: 0,
    totalCovers: 0,
    peakHours: {} as Record<string, number>,
    bookingsByType: {} as Record<string, number>,
    bookingsByDay: {} as Record<string, number>,
    occupancyRate: 0,
  }

  let totalGuests = 0
  for (const booking of bookings) {
    const status = lower(booking?.status)
    if (status === "confirmed") stats.confirmedBookings += 1
    else if (status === "cancelled" || status === "canceled") stats.cancelledBookings += 1
    else if (status === "pending") stats.pendingBookings += 1
    else if (status === "no-show" || status === "no show") stats.noShowBookings += 1

    const guests = Number(booking?.guests || booking?.covers || booking?.guestCount || 0)
    totalGuests += guests
    stats.totalCovers += guests

    const hour = String(booking?.arrivalTime || "").split(":")[0] || "Unknown"
    stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1

    const bookingType = String(booking?.bookingType || "Standard")
    stats.bookingsByType[bookingType] = (stats.bookingsByType[bookingType] || 0) + 1

    const bookingDate = new Date(String(booking?.date || ""))
    if (!Number.isNaN(bookingDate.getTime())) {
      const day = bookingDate.toLocaleDateString("en-US", { weekday: "long" })
      stats.bookingsByDay[day] = (stats.bookingsByDay[day] || 0) + 1
    }
  }

  stats.averagePartySize = bookings.length > 0 ? totalGuests / bookings.length : 0
  return stats
}

export const handleBookingsDataRequest = async ({ req, res, path, body, user }: BookingHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  const entityMap: Record<
    string,
    {
      table: string
      list: (scope: BookingScope) => Promise<any[]>
      upsert: (scope: BookingScope, id: string, payload: any) => Promise<any>
    }
  > = {
    bookings: {
      table: "app_bookings",
      list: (scope) => listRows("app_bookings", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_bookings", scope, id, payload, {
          name: [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || id,
          status: payload?.status || null,
          code: payload?.date || null,
        }),
    },
    tables: {
      table: "app_booking_tables",
      list: (scope) => listRows("app_booking_tables", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_tables", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.active === false ? "inactive" : "active",
          code: payload?.number ? String(payload.number) : null,
        }),
    },
    tableTypes: {
      table: "app_booking_table_types",
      list: async (scope) =>
        (await listRows("app_booking_table_types", scope.basePath)).map((row) => ({
          id: row.id,
          name: row.name || row.payload || row.value || "",
        })),
      upsert: (scope, id, payload) =>
        upsertEntity(
          "app_booking_table_types",
          scope,
          id,
          typeof payload === "string" ? { name: payload } : payload,
          {
            name: tableTypeRowName(payload),
            status: "active",
            code: null,
          },
        ),
    },
    bookingTypes: {
      table: "app_booking_types",
      list: (scope) => listRows("app_booking_types", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_types", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.active === false ? "inactive" : "active",
          code: null,
        }),
    },
    statuses: {
      table: "app_booking_statuses",
      list: (scope) => listRows("app_booking_statuses", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_statuses", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.active === false ? "inactive" : "active",
          code: null,
        }),
    },
    waitlist: {
      table: "app_booking_waitlist",
      list: (scope) => listRows("app_booking_waitlist", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_waitlist", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.status || "Waiting",
          code: null,
        }),
    },
    customers: {
      table: "app_booking_customers",
      list: (scope) => listRows("app_booking_customers", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_customers", scope, id, payload, {
          name: [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || id,
          status: payload?.active === false ? "inactive" : "active",
          code: null,
        }),
    },
    floorPlans: {
      table: "app_booking_floor_plans",
      list: (scope) => listRows("app_booking_floor_plans", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_floor_plans", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.isDefault ? "default" : "active",
          code: null,
        }),
    },
    tags: {
      table: "app_booking_tags",
      list: (scope) => listRows("app_booking_tags", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_tags", scope, id, payload, {
          name: payload?.name || id,
          status: payload?.active === false ? "inactive" : "active",
          code: null,
        }),
    },
    preorderProfiles: {
      table: "app_booking_preorder_profiles",
      list: (scope) => listRows("app_booking_preorder_profiles", scope.basePath),
      upsert: (scope, id, payload) =>
        upsertEntity("app_booking_preorder_profiles", scope, id, payload, {
          name: payload?.name || id,
          status: "active",
          code: null,
        }),
    },
  }

  const listMatch = pathname.match(
    /^\/data\/bookings\/(bookings|tables|tableTypes|bookingTypes|statuses|waitlist|customers|floorPlans|tags|preorderProfiles)$/,
  )
  if (listMatch && method === "GET") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    send(200, { ok: true, rows: await entityMap[entity].list(scope) })
    return
  }

  if (pathname === "/data/bookings/bookings/byDate" && method === "GET") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const wanted = getQuery("date")
    const rows = (await entityMap.bookings.list(scope)).filter((booking) => String(booking?.date || "") === wanted)
    send(200, { ok: true, rows })
    return
  }

  if (listMatch && method === "POST") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = listMatch[1]
    const data = body?.data ?? body?.value ?? {}
    const id = String(
      data?.id ||
        (entity === "customers" ? data?.id : "") ||
        randomUUID(),
    )
    const row = await entityMap[entity].upsert(scope, id, data)
    send(200, { ok: true, id, row })
    return
  }

  const itemMatch = pathname.match(
    /^\/data\/bookings\/(bookings|tables|tableTypes|bookingTypes|statuses|waitlist|customers|floorPlans|tags|preorderProfiles)\/([^/]+)$/,
  )
  if (itemMatch && method === "PATCH") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    const updates = body?.updates ?? body?.data ?? {}
    const row = await entityMap[entity].upsert(scope, id, updates)
    send(200, { ok: true, row })
    return
  }

  if (itemMatch && method === "DELETE") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const entity = itemMatch[1]
    const id = decodeURIComponent(itemMatch[2])
    await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath })
    send(200, { ok: true })
    return
  }

  const bookingMessageMatch = pathname.match(/^\/data\/bookings\/bookings\/([^/]+)\/messages$/)
  if (bookingMessageMatch && method === "POST") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = decodeURIComponent(bookingMessageMatch[1])
    const existing = await getSingleRow("app_bookings", { id, base_path: scope.basePath })
    if (!existing?.payload) throw Object.assign(new Error("Booking not found"), { status: 404 })
    const messages = Array.isArray(existing.payload.messages) ? existing.payload.messages : []
    const row = await entityMap.bookings.upsert(scope, id, {
      ...existing.payload,
      messages: [...messages, body?.message],
      updatedAt: new Date().toISOString(),
    })
    send(200, { ok: true, row })
    return
  }

  if (pathname === "/data/bookings/settings" && method === "GET") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const row = await getSingleRow("app_booking_settings", { id: "settings", base_path: scope.basePath })
    send(200, { ok: true, row: row?.payload || DEFAULT_BOOKING_SETTINGS })
    return
  }

  if (pathname === "/data/bookings/settings" && method === "PUT") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const row = await upsertEntity("app_booking_settings", scope, "settings", body?.settings || {}, {
      name: "settings",
      status: "active",
      code: null,
    })
    send(200, { ok: true, row })
    return
  }

  if (pathname === "/data/bookings/stats" && method === "GET") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const startDate = getQuery("startDate")
    const endDate = getQuery("endDate")
    const bookings = await entityMap.bookings.list(scope)
    const filtered = bookings.filter((booking) => {
      const date = String(booking?.date || "")
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })
    send(200, { ok: true, row: buildBookingStats(filtered) })
    return
  }

  const floorPlanTableMatch = pathname.match(/^\/data\/bookings\/floorPlans\/([^/]+)\/tables(?:\/([^/]+))?$/)
  if (floorPlanTableMatch && method === "POST") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const floorPlanId = decodeURIComponent(floorPlanTableMatch[1])
    const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath })
    if (!existing?.payload) throw Object.assign(new Error("Floor plan not found"), { status: 404 })
    const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : []
    const element = {
      ...body?.tableElement,
      id: String(body?.tableElement?.id || randomUUID()),
    }
    const row = await entityMap.floorPlans.upsert(scope, floorPlanId, {
      ...existing.payload,
      tables: [...tables, element],
      updatedAt: new Date().toISOString(),
    })
    send(200, { ok: true, row, tableElement: element })
    return
  }

  if (floorPlanTableMatch && method === "PATCH") {
    const scope = parseBookingScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const floorPlanId = decodeURIComponent(floorPlanTableMatch[1])
    const tableElementId = decodeURIComponent(String(floorPlanTableMatch[2] || ""))
    const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath })
    if (!existing?.payload) throw Object.assign(new Error("Floor plan not found"), { status: 404 })
    const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : []
    const row = await entityMap.floorPlans.upsert(scope, floorPlanId, {
      ...existing.payload,
      tables: tables.map((table: any) =>
        String(table?.id) === tableElementId ? { ...table, ...(body?.updates || {}) } : table,
      ),
      updatedAt: new Date().toISOString(),
    })
    send(200, { ok: true, row })
    return
  }

  if (floorPlanTableMatch && method === "DELETE") {
    const scope = parseBookingScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const floorPlanId = decodeURIComponent(floorPlanTableMatch[1])
    const tableElementId = decodeURIComponent(String(floorPlanTableMatch[2] || ""))
    const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath })
    if (!existing?.payload) throw Object.assign(new Error("Floor plan not found"), { status: 404 })
    const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : []
    const row = await entityMap.floorPlans.upsert(scope, floorPlanId, {
      ...existing.payload,
      tables: tables.filter((table: any) => String(table?.id) !== tableElementId),
      updatedAt: new Date().toISOString(),
    })
    send(200, { ok: true, row })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
