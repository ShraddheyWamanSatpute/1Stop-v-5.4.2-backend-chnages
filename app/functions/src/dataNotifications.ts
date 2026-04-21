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

type NotificationFilter = {
  type?: string[]
  action?: string[]
  priority?: string[]
  category?: string[]
  read?: boolean
  dateFrom?: number
  dateTo?: number
  userId?: string
  companyId?: string
  siteId?: string
  subsiteId?: string
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
  const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i)

  if (!match) {
    throw Object.assign(new Error("Invalid notifications basePath"), { status: 400 })
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
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Notifications provider"),
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

const listRows = async (table: string, filters: Record<string, string>) => {
  const params = new URLSearchParams()
  params.set("select", "id,payload,created_at")
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`)
  }
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return rows || []
}

const getSingleRow = async (table: string, filters: Record<string, string>) => {
  const rows = await listRows(table, filters)
  return rows[0] || null
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

const normalizeNotification = (row: any) => ({
  ...(row?.payload || {}),
  id: String(row?.id || row?.payload?.id || ""),
})

const createNotificationRow = (scope: Scope, id: string, payload: any) => {
  const cleaned = stripUndefinedDeep(payload)
  const now = Date.now()
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: String(cleaned?.title || id),
    status: cleaned?.read ? "read" : "unread",
    payload: {
      ...cleaned,
      id,
    },
    created_at: typeof cleaned?.createdAt === "number" ? cleaned.createdAt : now,
    updated_at: typeof cleaned?.updatedAt === "number" ? cleaned.updatedAt : now,
  }
}

const createSettingsRow = (scope: Scope, userId: string, payload: any) => {
  const cleaned = stripUndefinedDeep(payload)
  const now = Date.now()
  return {
    id: userId,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    base_path: scope.basePath,
    name: userId,
    status: "active",
    payload: {
      ...cleaned,
      userId,
    },
    created_at: now,
    updated_at: now,
  }
}

const upsertNotification = async (scope: Scope, id: string, payload: any) => {
  const existing = await getSingleRow("app_notifications", { id, base_path: scope.basePath })
  const nextPayload = {
    ...(existing?.payload || {}),
    ...payload,
    id,
  }
  const row = createNotificationRow(scope, id, nextPayload)
  if (!existing) await insertRow("app_notifications", row)
  else await patchRow("app_notifications", { id, base_path: scope.basePath }, row)
  return normalizeNotification(row)
}

const upsertSettings = async (scope: Scope, userId: string, payload: any) => {
  const existing = await getSingleRow("app_notification_settings", { id: userId, base_path: scope.basePath })
  const row = createSettingsRow(scope, userId, {
    ...(existing?.payload || {}),
    ...payload,
    userId,
  })
  if (!existing) await insertRow("app_notification_settings", row)
  else await patchRow("app_notification_settings", { id: userId, base_path: scope.basePath }, row)
  return row.payload
}

const sortNotifications = (rows: any[]) =>
  rows
    .map(normalizeNotification)
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))

const matchesFilter = (notification: any, filter: NotificationFilter) => {
  if (filter.userId && notification.userId !== filter.userId) return false
  if (filter.companyId && notification.companyId !== filter.companyId) return false
  if (filter.siteId && notification.siteId !== filter.siteId) return false
  if (filter.subsiteId && notification.subsiteId !== filter.subsiteId) return false
  if (filter.type?.length && !filter.type.includes(notification.type)) return false
  if (filter.action?.length && !filter.action.includes(notification.action)) return false
  if (filter.priority?.length && !filter.priority.includes(notification.priority)) return false
  if (filter.category?.length && !filter.category.includes(notification.category)) return false
  if (filter.read !== undefined && notification.read !== filter.read) return false
  if (filter.dateFrom !== undefined && Number(notification.timestamp || 0) < filter.dateFrom) return false
  if (filter.dateTo !== undefined && Number(notification.timestamp || 0) > filter.dateTo) return false
  return true
}

const listNotifications = async (basePath: string) => {
  const rows = await listRows("app_notifications", { base_path: basePath })
  return sortNotifications(rows)
}

const listUserNotifications = async (basePath: string, userId: string, limit?: number) => {
  const rows = (await listNotifications(basePath)).filter((notification) => notification.userId === userId)
  return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows
}

export const handleNotificationsDataRequest = async ({ req, res, path, body, user }: HandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)
  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  if (pathname === "/data/notifications/notifications" && method === "GET") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const limit = Number.parseInt(getQuery("limit"), 10)
    const rows = await listUserNotifications(scope.basePath, getQuery("userId"), Number.isFinite(limit) ? limit : undefined)
    send(200, { ok: true, rows })
    return
  }

  if (pathname === "/data/notifications/notifications/filter" && method === "POST") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const rows = (await listNotifications(scope.basePath)).filter((notification) =>
      matchesFilter(notification, (body?.filter || {}) as NotificationFilter),
    )
    send(200, { ok: true, rows })
    return
  }

  if (pathname === "/data/notifications/notifications" && method === "POST") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = String(body?.data?.id || randomUUID())
    const row = await upsertNotification(scope, id, body?.data || {})
    send(200, { ok: true, id, row })
    return
  }

  const notificationMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)$/)
  if (notificationMatch && method === "DELETE") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = decodeURIComponent(notificationMatch[1])
    await deleteRow("app_notifications", { id, base_path: scope.basePath })
    send(200, { ok: true })
    return
  }

  const readMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)\/read$/)
  if (readMatch && method === "PATCH") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = decodeURIComponent(readMatch[1])
    const row = await upsertNotification(scope, id, { read: true, updatedAt: Date.now() })
    send(200, { ok: true, row })
    return
  }

  const readByMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)\/readBy\/([^/]+)$/)
  if (readByMatch && method === "PATCH") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const notificationId = decodeURIComponent(readByMatch[1])
    const targetUserId = decodeURIComponent(readByMatch[2])
    const existing = await getSingleRow("app_notifications", { id: notificationId, base_path: scope.basePath })
    const now = Date.now()
    const readBy = {
      ...((existing?.payload || {}).readBy || {}),
      [targetUserId]: {
        readAt: now,
        seen: true,
      },
    }
    const row = await upsertNotification(scope, notificationId, { readBy, updatedAt: now })
    send(200, { ok: true, row })
    return
  }

  if (pathname === "/data/notifications/notifications/readAll" && method === "PATCH") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const userId = String(body?.userId || "").trim()
    const rows = await listUserNotifications(scope.basePath, userId)
    await Promise.all(
      rows
        .filter((notification) => !notification.read)
        .map((notification) => upsertNotification(scope, String(notification.id), { read: true, updatedAt: Date.now() })),
    )
    send(200, { ok: true })
    return
  }

  if (pathname === "/data/notifications/notifications" && method === "DELETE") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const userId = getQuery("userId")
    const rows = await listUserNotifications(scope.basePath, userId)
    await Promise.all(rows.map((notification) => deleteRow("app_notifications", { id: String(notification.id), base_path: scope.basePath })))
    send(200, { ok: true })
    return
  }

  if (pathname === "/data/notifications/settings" && method === "GET") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const userId = getQuery("userId")
    const row = await getSingleRow("app_notification_settings", { id: userId, base_path: scope.basePath })
    send(200, { ok: true, row: row?.payload || null })
    return
  }

  if (pathname === "/data/notifications/settings" && method === "PUT") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const settings = body?.settings || {}
    const row = await upsertSettings(scope, String(settings?.userId || ""), settings)
    send(200, { ok: true, row })
    return
  }

  if (pathname === "/data/notifications/unreadCount" && method === "GET") {
    const scope = parseScope(getQuery("basePath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const userId = getQuery("userId")
    const rows = await listNotifications(scope.basePath)
    const count = rows.reduce((sum, notification) => {
      const seen = Boolean(notification?.readBy?.[userId]?.seen)
      return sum + (seen ? 0 : 1)
    }, 0)
    send(200, { ok: true, count })
    return
  }

  if (pathname === "/data/notifications/history" && method === "POST") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const userId = String(body?.userId || "").trim()
    const filter = (body?.filter || {}) as NotificationFilter
    const rows = (await listNotifications(scope.basePath))
      .map((notification) => ({
        ...notification,
        isReadByUser: Boolean(notification?.readBy?.[userId]?.seen),
        readAtByUser: notification?.readBy?.[userId]?.readAt ?? null,
      }))
      .filter((notification) => {
        if (filter.read !== undefined && notification.isReadByUser !== filter.read) return false
        if (filter.type?.length && !filter.type.includes(notification.type)) return false
        if (filter.dateFrom !== undefined && Number(notification.timestamp || 0) < filter.dateFrom) return false
        if (filter.dateTo !== undefined && Number(notification.timestamp || 0) > filter.dateTo) return false
        return true
      })
    send(200, { ok: true, rows })
    return
  }

  if (pathname === "/data/notifications/cleanup" && method === "POST") {
    const scope = parseScope(String(body?.basePath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const daysOld = Number(body?.daysOld || 30)
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000
    const rows = await listNotifications(scope.basePath)
    await Promise.all(
      rows
        .filter((notification) => Number(notification.timestamp || 0) < cutoffTime)
        .map((notification) => deleteRow("app_notifications", { id: String(notification.id), base_path: scope.basePath })),
    )
    send(200, { ok: true })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
