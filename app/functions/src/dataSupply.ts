import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type SupplyScope = {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  supplyPath: string
}

type SupplyHandlerArgs = {
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

const normalizeSupplyPath = (raw: string): string => String(raw || "").trim().replace(/\/+$/, "")

const parseSupplyScope = (rawSupplyPath: string): SupplyScope => {
  const supplyPath = normalizeSupplyPath(rawSupplyPath)
  const match = supplyPath.match(
    /^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/supply$/i,
  )

  if (!match) {
    throw Object.assign(new Error("Invalid supplyPath"), { status: 400 })
  }

  return {
    companyId: match[1],
    siteId: match[2] || null,
    subsiteId: match[3] || null,
    supplyPath,
  }
}

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Supply provider"),
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

const createEntityRow = (scope: SupplyScope, id: string, payload: any) => {
  const cleaned = stripUndefinedDeep(payload)
  return {
    id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    supply_path: scope.supplyPath,
    name: String(cleaned?.name || cleaned?.clientName || cleaned?.orderNumber || cleaned?.deliveryNumber || id),
    status: cleaned?.status ?? null,
    payload: {
      ...cleaned,
      id,
    },
    created_at: Number(cleaned?.createdAt || Date.now()),
    updated_at: Number(cleaned?.updatedAt || cleaned?.createdAt || Date.now()),
  }
}

const listRows = async (table: string, supplyPath: string) => {
  const params = new URLSearchParams()
  params.set("supply_path", `eq.${supplyPath}`)
  params.set("select", "id,payload,created_at,updated_at")
  params.set("order", "created_at.asc")
  const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>
  return (rows || []).map((row) => ({
    ...(row?.payload || {}),
    id: row?.id,
  }))
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

const insertRow = async (table: string, row: any) => {
  const rows = (await supabaseRequest(`${table}`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
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
    headers: {
      Prefer: "return=representation",
    },
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
    headers: {
      Prefer: "return=minimal",
    },
  })
}

const upsertEntity = async (table: string, scope: SupplyScope, id: string, payload: any) => {
  const existing = await getSingleRow(table, { id, supply_path: scope.supplyPath })
  const mergedPayload = {
    ...(existing?.payload || {}),
    ...stripUndefinedDeep(payload),
    id,
    createdAt: Number(existing?.payload?.createdAt || payload?.createdAt || Date.now()),
    updatedAt: Date.now(),
  }
  const row = createEntityRow(scope, id, mergedPayload)

  if (!existing) {
    await insertRow(table, row)
  } else {
    await patchRow(table, { id, supply_path: scope.supplyPath }, row)
  }

  return id
}

const upsertInvite = async (scope: SupplyScope, invite: any) => {
  const id = String(invite?.code || invite?.id || "").trim()
  if (!id) throw Object.assign(new Error("Invite code is required"), { status: 400 })

  const payload = {
    ...stripUndefinedDeep(invite),
    id,
    code: id,
    supplierCompanyId: invite?.supplierCompanyId || scope.companyId,
    supplierSupplyPath: invite?.supplierSupplyPath || scope.supplyPath,
    createdAt: Number(invite?.createdAt || Date.now()),
    updatedAt: Date.now(),
  }

  const existing = await getSingleRow("supply_client_invites", { id })
  const row = {
    id,
    code: id,
    company_id: scope.companyId,
    site_id: scope.siteId,
    subsite_id: scope.subsiteId,
    supply_path: scope.supplyPath,
    status: payload.status || "pending",
    expires_at: Number(payload.expiresAt || 0),
    payload,
    created_at: Number(existing?.created_at || payload.createdAt || Date.now()),
    updated_at: Date.now(),
  }

  if (!existing) {
    await insertRow("supply_client_invites", row)
  } else {
    await patchRow("supply_client_invites", { id }, row)
  }

  return id
}

export const handleSupplyDataRequest = async ({ req, res, path, body, user }: SupplyHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")

  const send = (status: number, payload: any) => json(res, status, payload)

  const getQuery = (name: string) => String(req.query?.[name] || "").trim()

  if (method === "GET" && pathname === "/data/supply/clients") {
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    send(200, { ok: true, rows: await listRows("supply_clients", scope.supplyPath) })
    return
  }
  if (method === "GET" && pathname === "/data/supply/orders") {
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    send(200, { ok: true, rows: await listRows("supply_orders", scope.supplyPath) })
    return
  }
  if (method === "GET" && pathname === "/data/supply/deliveries") {
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    send(200, { ok: true, rows: await listRows("supply_deliveries", scope.supplyPath) })
    return
  }

  if (method === "POST" && pathname === "/data/supply/clients") {
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = String(body?.data?.id || randomUUID())
    await upsertEntity("supply_clients", scope, id, body?.data || {})
    send(200, { ok: true, id })
    return
  }
  if (method === "POST" && pathname === "/data/supply/orders") {
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = String(body?.data?.id || randomUUID())
    await upsertEntity("supply_orders", scope, id, body?.data || {})
    send(200, { ok: true, id })
    return
  }
  if (method === "POST" && pathname === "/data/supply/deliveries") {
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = String(body?.data?.id || randomUUID())
    await upsertEntity("supply_deliveries", scope, id, body?.data || {})
    send(200, { ok: true, id })
    return
  }

  const entityMatch = pathname.match(/^\/data\/supply\/(clients|orders|deliveries)\/([^/]+)$/)
  if (entityMatch && method === "PATCH") {
    const entity = entityMatch[1]
    const id = decodeURIComponent(entityMatch[2])
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const table =
      entity === "clients" ? "supply_clients" : entity === "orders" ? "supply_orders" : "supply_deliveries"
    await upsertEntity(table, scope, id, body?.updates || {})
    send(200, { ok: true })
    return
  }
  if (entityMatch && method === "DELETE") {
    const entity = entityMatch[1]
    const id = decodeURIComponent(entityMatch[2])
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const table =
      entity === "clients" ? "supply_clients" : entity === "orders" ? "supply_orders" : "supply_deliveries"
    await deleteRow(table, { id, supply_path: scope.supplyPath })
    send(200, { ok: true })
    return
  }

  if (method === "POST" && pathname === "/data/supply/clientInvites") {
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    await assertCompanyAccess(user.uid, scope.companyId)
    const id = await upsertInvite(scope, body?.invite || {})
    send(200, { ok: true, id })
    return
  }

  const inviteMatch = pathname.match(/^\/data\/supply\/clientInvites\/([^/]+)$/)
  if (inviteMatch && method === "GET") {
    const code = decodeURIComponent(inviteMatch[1])
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const row = await getSingleRow("supply_client_invites", { id: code, supply_path: scope.supplyPath })
    send(200, { ok: true, row: row?.payload || null })
    return
  }
  if (inviteMatch && method === "PATCH") {
    const code = decodeURIComponent(inviteMatch[1])
    const scope = parseSupplyScope(String(body?.supplyPath || ""))
    const existing = await getSingleRow("supply_client_invites", { id: code })
    if (!existing) throw Object.assign(new Error("Invite not found"), { status: 404 })
    const acceptedByCompanyId = String(body?.updates?.acceptedByCompanyId || "").trim()
    if (acceptedByCompanyId) {
      await assertCompanyAccess(user.uid, acceptedByCompanyId)
    } else {
      await assertCompanyAccess(user.uid, scope.companyId)
    }
    await upsertInvite(scope, {
      ...(existing.payload || {}),
      ...(body?.updates || {}),
      id: code,
      code,
    })
    send(200, { ok: true })
    return
  }
  if (inviteMatch && method === "DELETE") {
    const code = decodeURIComponent(inviteMatch[1])
    const scope = parseSupplyScope(getQuery("supplyPath"))
    await assertCompanyAccess(user.uid, scope.companyId)
    const existing = await getSingleRow("supply_client_invites", { id: code })
    if (!existing) throw Object.assign(new Error("Invite not found"), { status: 404 })
    await upsertInvite(scope, {
      ...(existing.payload || {}),
      id: code,
      code,
      status: "cancelled",
    })
    send(200, { ok: true })
    return
  }

  const globalInviteMatch = pathname.match(/^\/data\/supply\/globalInvites\/([^/]+)$/)
  if (globalInviteMatch && method === "GET") {
    const code = decodeURIComponent(globalInviteMatch[1])
    const row = await getSingleRow("supply_client_invites", { id: code })
    send(200, { ok: true, row: row?.payload || null })
    return
  }
  if (globalInviteMatch && method === "PATCH") {
    const code = decodeURIComponent(globalInviteMatch[1])
    const existing = await getSingleRow("supply_client_invites", { id: code })
    if (!existing) throw Object.assign(new Error("Invite not found"), { status: 404 })
    const acceptedByCompanyId =
      String(body?.updates?.acceptedByCompanyId || existing?.payload?.acceptedByCompanyId || "").trim()
    if (acceptedByCompanyId) {
      await assertCompanyAccess(user.uid, acceptedByCompanyId)
    }
    const scope = parseSupplyScope(String(existing.supply_path))
    await upsertInvite(scope, {
      ...(existing.payload || {}),
      ...(body?.updates || {}),
      id: code,
      code,
    })
    send(200, { ok: true })
    return
  }

  if (method === "GET" && pathname === "/data/supply/supplierConnection") {
    const customerCompanyId = getQuery("customerCompanyId")
    const supplierCompanyId = getQuery("supplierCompanyId")
    if (!customerCompanyId || !supplierCompanyId) {
      throw Object.assign(new Error("Missing customerCompanyId or supplierCompanyId"), { status: 400 })
    }
    await assertCompanyAccess(user.uid, customerCompanyId)
    const row = await getSingleRow("supply_supplier_connections", {
      customer_company_id: customerCompanyId,
      supplier_company_id: supplierCompanyId,
    })
    send(200, { ok: true, row: row?.payload || null })
    return
  }

  if (method === "POST" && pathname === "/data/supply/supplierConnection") {
    const params = body?.params || {}
    const customerCompanyId = String(params?.customerCompanyId || "").trim()
    const supplierCompanyId = String(params?.supplierCompanyId || "").trim()
    if (!customerCompanyId || !supplierCompanyId) {
      throw Object.assign(new Error("Missing customerCompanyId or supplierCompanyId"), { status: 400 })
    }
    await assertCompanyAccess(user.uid, customerCompanyId)

    const existing = await getSingleRow("supply_supplier_connections", {
      customer_company_id: customerCompanyId,
      supplier_company_id: supplierCompanyId,
    })

    const payload = {
      ...(existing?.payload || {}),
      ...stripUndefinedDeep(params),
      updatedAt: Date.now(),
      linkedAt: Number(existing?.payload?.linkedAt || Date.now()),
    }

    const row = {
      id: `${customerCompanyId}__${supplierCompanyId}`,
      customer_company_id: customerCompanyId,
      supplier_company_id: supplierCompanyId,
      payload,
      linked_at: payload.linkedAt,
      updated_at: payload.updatedAt,
    }

    if (!existing) {
      await insertRow("supply_supplier_connections", row)
    } else {
      await patchRow(
        "supply_supplier_connections",
        { customer_company_id: customerCompanyId, supplier_company_id: supplierCompanyId },
        row,
      )
    }

    send(200, { ok: true })
    return
  }

  // Settings endpoints
  if (method === "GET" && pathname === "/data/supply/settings") {
    const basePath = getQuery("basePath")
    const section = getQuery("section")
    if (!basePath || !section) {
      throw Object.assign(new Error("Missing basePath or section"), { status: 400 })
    }
    
    // Parse the basePath to extract company info for access control
    const pathMatch = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i)
    if (!pathMatch) {
      throw Object.assign(new Error("Invalid basePath format"), { status: 400 })
    }
    
    const companyId = pathMatch[1]
    await assertCompanyAccess(user.uid, companyId)
    
    // Store settings in a generic settings table
    const settingsRow = await getSingleRow("supply_settings", {
      company_id: companyId,
      site_id: pathMatch[2] || null,
      subsite_id: pathMatch[3] || null,
      section,
    })
    
    send(200, { ok: true, value: settingsRow?.payload?.value || null })
    return
  }

  if (method === "POST" && pathname === "/data/supply/settings") {
    const basePath = String(body?.basePath || "").trim()
    const section = String(body?.section || "").trim()
    const data = body?.data || {}
    
    if (!basePath || !section) {
      throw Object.assign(new Error("Missing basePath or section"), { status: 400 })
    }
    
    // Parse the basePath to extract company info for access control
    const pathMatch = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i)
    if (!pathMatch) {
      throw Object.assign(new Error("Invalid basePath format"), { status: 400 })
    }
    
    const companyId = pathMatch[1]
    await assertCompanyAccess(user.uid, companyId)
    
    const settingsId = `${companyId}_${pathMatch[2] || 'global'}_${pathMatch[3] || 'global'}_${section}`
    
    const row = {
      id: settingsId,
      company_id: companyId,
      site_id: pathMatch[2] || null,
      subsite_id: pathMatch[3] || null,
      section,
      payload: { value: data },
      updated_at: Date.now(),
    }
    
    const existing = await getSingleRow("supply_settings", {
      company_id: companyId,
      site_id: pathMatch[2] || null,
      subsite_id: pathMatch[3] || null,
      section,
    })
    
    if (!existing) {
      await insertRow("supply_settings", row)
    } else {
      await patchRow(
        "supply_settings",
        { 
          company_id: companyId,
          site_id: pathMatch[2] || null,
          subsite_id: pathMatch[3] || null,
          section,
        },
        row,
      )
    }
    
    send(200, { ok: true })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
