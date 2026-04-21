import { randomUUID } from "crypto"
import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type CompanyHandlerArgs = {
  req: any
  res: any
  path: string
  body: any
  user: AppAuthedUser
}

const DEFAULT_PERMISSIONS = {
  defaultPermissions: { modules: {} },
  roles: {},
  departments: {},
  users: {},
  employees: {},
  rolesMeta: {},
  departmentsMeta: {},
  usersMeta: {},
  employeesMeta: {},
  defaultRole: "staff",
  defaultDepartment: "front-of-house",
}

const DEFAULT_CONFIG: string[] = []

const json = (res: any, status: number, body: any) => {
  res.set("Cache-Control", "no-store")
  res.status(status).json(body)
}

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value))

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

const toMillis = (value: any, fallback = Date.now()): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const normalizeDataManagement = (value: any) => {
  if (!value || typeof value !== "object") return value
  return {
    accessibleModules: value.accessibleModules || {},
    accessibleSites: Array.isArray(value.accessibleSites) ? value.accessibleSites : [],
    accessibleSubsites: Array.isArray(value.accessibleSubsites) ? value.accessibleSubsites : [],
  }
}

const setNestedValue = (source: any, path: string[], value: any) => {
  const root = source && typeof source === "object" ? cloneJson(source) : {}
  if (!path.length) return stripUndefinedDeep(value)

  let cursor = root
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    const child = cursor[key]
    if (!child || typeof child !== "object") {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }

  cursor[path[path.length - 1]] = stripUndefinedDeep(value)
  return root
}

const configRowId = (companyId: string, scopeType: "company" | "site" | "subsite", siteId?: string | null, subsiteId?: string | null) =>
  [companyId, scopeType, siteId || "", subsiteId || ""].join("::")

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Company provider"),
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

const listRows = async (table: string, filters: Record<string, string | null | undefined>, order = "created_at.asc") => {
  const params = new URLSearchParams()
  params.set("select", "*")
  params.set("order", order)
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue
    params.set(key, `eq.${value}`)
  }
  return ((await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) as Array<any>) || []
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

const assertCompanyAccess = async (uid: string, companyId: string, opts?: { allowCreator?: boolean }) => {
  const [userCompanySnap, ownedCompanySnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])

  if (userCompanySnap.exists() || ownedCompanySnap.exists()) return

  if (opts?.allowCreator) {
    const companyRow = await getSingleRow("companies", { id: companyId })
    if (companyRow?.created_by === uid) return
  }

  throw Object.assign(new Error("Forbidden"), { status: 403 })
}

const assertSelfAccess = (actorUid: string, targetUid: string) => {
  if (actorUid !== targetUid) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

const toCompanyPayload = (companyId: string, payload: any, existing?: any) => {
  const now = Date.now()
  const merged = stripUndefinedDeep({
    ...(existing?.payload || {}),
    ...(payload || {}),
    companyID: companyId,
  })

  return {
    id: companyId,
    name: String(merged.companyName || merged.name || companyId),
    status: merged.companyStatus || null,
    company_type: merged.companyType || null,
    payload: merged,
    created_at: existing?.created_at ?? toMillis(merged.createdAt ?? merged.companyCreated, now),
    updated_at: now,
  }
}

const toSitePayload = (companyId: string, siteId: string, payload: any, existing?: any) => {
  const now = Date.now()
  const merged = stripUndefinedDeep({
    ...(existing?.payload || {}),
    ...(payload || {}),
    siteID: siteId,
    companyID: companyId,
    updatedAt: now,
  })

  if (!merged.address) {
    merged.address = { street: "", city: "", state: "", zipCode: "", country: "" }
  }
  if (!merged.teams) merged.teams = {}
  if (merged.dataManagement) merged.dataManagement = normalizeDataManagement(merged.dataManagement)
  merged.createdAt = existing?.payload?.createdAt ?? merged.createdAt ?? now

  const payloadWithoutSubsites = { ...merged, subsites: {} }

  return {
    id: siteId,
    company_id: companyId,
    name: String(merged.name || merged.siteName || siteId),
    payload: payloadWithoutSubsites,
    created_at: existing?.created_at ?? toMillis(merged.createdAt, now),
    updated_at: now,
  }
}

const toSubsitePayload = (companyId: string, siteId: string, subsiteId: string, payload: any, existing?: any) => {
  const now = Date.now()
  const merged = stripUndefinedDeep({
    ...(existing?.payload || {}),
    ...(payload || {}),
    subsiteID: subsiteId,
    updatedAt: now,
  })

  if (!merged.address) {
    merged.address = { street: "", city: "", state: "", zipCode: "", country: "" }
  }
  if (!merged.teams) merged.teams = {}
  if (merged.dataManagement) merged.dataManagement = normalizeDataManagement(merged.dataManagement)
  merged.createdAt = existing?.payload?.createdAt ?? merged.createdAt ?? now

  return {
    id: subsiteId,
    company_id: companyId,
    site_id: siteId,
    name: String(merged.name || merged.subsiteName || subsiteId),
    payload: merged,
    created_at: existing?.created_at ?? toMillis(merged.createdAt, now),
    updated_at: now,
  }
}

const buildSetupFallback = (companyId: string, companyPayload: any) => {
  const safeParseIso = (iso: unknown): number | null => {
    if (typeof iso !== "string") return null
    const ms = Date.parse(iso)
    return Number.isFinite(ms) ? ms : null
  }

  const createdAt =
    (typeof companyPayload?.createdAt === "number" ? companyPayload.createdAt : null) ??
    safeParseIso(companyPayload?.companyCreated) ??
    Date.now()
  const updatedAt =
    (typeof companyPayload?.updatedAt === "number" ? companyPayload.updatedAt : null) ??
    safeParseIso(companyPayload?.companyUpdated) ??
    undefined

  return {
    id: companyId,
    name: String(companyPayload?.companyName || companyPayload?.name || ""),
    legalName: String(companyPayload?.legalName || companyPayload?.companyName || companyPayload?.name || ""),
    companyType: (String(companyPayload?.companyType || "hospitality").trim().toLowerCase() as any) || "hospitality",
    address: {
      street: String(companyPayload?.companyAddress || ""),
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    contact: {
      email: String(companyPayload?.companyEmail || ""),
      phone: String(companyPayload?.companyPhone || ""),
      website: companyPayload?.companyWebsite ? String(companyPayload.companyWebsite) : "",
    },
    business: {
      taxId: "",
      registrationNumber: "",
      industry: String(companyPayload?.companyIndustry || ""),
      businessType: "",
    },
    settings: {
      currency: "USD",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      fiscalYearStart: "01/01",
      enableNotifications: true,
      enableMultiLocation: false,
      workingDays: ["1", "2", "3", "4", "5"],
      workingHours: { start: "09:00", end: "17:00" },
    },
    branding: {
      logo: String(companyPayload?.companyLogo || ""),
      primaryColor: "",
      secondaryColor: "",
    },
    createdAt,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
  }
}

const listCompanySites = async (companyId: string) => {
  const [siteRows, subsiteRows] = await Promise.all([
    listRows("company_sites", { company_id: companyId }),
    listRows("company_subsites", { company_id: companyId }),
  ])

  const subsitesBySite = new Map<string, Record<string, any>>()
  for (const row of subsiteRows) {
    const siteId = String(row?.site_id || "")
    if (!siteId) continue
    const existing = subsitesBySite.get(siteId) || {}
    existing[row.id] = {
      ...(row?.payload || {}),
      subsiteID: row.id,
    }
    subsitesBySite.set(siteId, existing)
  }

  return siteRows.map((row) => ({
    ...(row?.payload || {}),
    siteID: row.id,
    companyID: companyId,
    subsites: subsitesBySite.get(String(row.id)) || {},
  }))
}

const getPermissionPayload = async (companyId: string) => {
  const row = await getSingleRow("company_permissions", { id: companyId })
  return row?.payload || null
}

const upsertPermissions = async (companyId: string, payload: any) => {
  const row = {
    id: companyId,
    company_id: companyId,
    payload: stripUndefinedDeep(payload),
    updated_at: Date.now(),
  }
  const existing = await getSingleRow("company_permissions", { id: companyId })
  if (!existing) {
    await insertRow("company_permissions", row)
    return row.payload
  }
  await patchRow("company_permissions", { id: companyId }, row)
  return row.payload
}

const getConfigPayload = async (
  companyId: string,
  scopeType: "company" | "site" | "subsite",
  siteId?: string | null,
  subsiteId?: string | null,
) => {
  const row = await getSingleRow("company_configs", { id: configRowId(companyId, scopeType, siteId, subsiteId) })
  return row?.payload ?? null
}

const upsertConfig = async (
  companyId: string,
  scopeType: "company" | "site" | "subsite",
  siteId: string | null,
  subsiteId: string | null,
  payload: any,
) => {
  const row = {
    id: configRowId(companyId, scopeType, siteId, subsiteId),
    company_id: companyId,
    scope_type: scopeType,
    site_id: siteId,
    subsite_id: subsiteId,
    payload: stripUndefinedDeep(payload),
    updated_at: Date.now(),
  }

  const existing = await getSingleRow("company_configs", { id: row.id })
  if (!existing) {
    await insertRow("company_configs", row)
    return row.payload
  }
  await patchRow("company_configs", { id: row.id }, row)
  return row.payload
}

export const handleCompanyDataRequest = async ({ req, res, path, body, user }: CompanyHandlerArgs) => {
  const method = String(req.method || "GET").toUpperCase()
  const pathname = String(path || "").replace(/\/+$/, "")
  const send = (status: number, payload: any) => json(res, status, payload)

  if (pathname === "/data/company/companies" && method === "POST") {
    const companyId = String(body?.data?.companyID || randomUUID())
    const row = {
      ...toCompanyPayload(companyId, body?.data || {}),
      created_by: user.uid,
    }
    await insertRow("companies", row)
    await Promise.all([
      upsertPermissions(companyId, cloneJson(DEFAULT_PERMISSIONS)),
      upsertConfig(companyId, "company", null, null, cloneJson(DEFAULT_CONFIG)),
    ])
    send(200, { ok: true, id: companyId, row: { ...(row.payload || {}), companyID: companyId } })
    return
  }

  const companyMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)$/)
  if (companyMatch) {
    const companyId = decodeURIComponent(companyMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      const row = await getSingleRow("companies", { id: companyId })
      send(200, { ok: true, company: row ? { ...(row.payload || {}), companyID: companyId } : null })
      return
    }

    if (method === "PATCH") {
      const existing = await getSingleRow("companies", { id: companyId })
      if (!existing) throw Object.assign(new Error("Not found"), { status: 404 })
      const row = {
        ...toCompanyPayload(companyId, { ...(body?.updates || {}), updatedAt: Date.now() }, existing),
        created_by: existing.created_by || user.uid,
      }
      await patchRow("companies", { id: companyId }, row)
      send(200, { ok: true })
      return
    }

    if (method === "DELETE") {
      await deleteRow("companies", { id: companyId })
      send(200, { ok: true })
      return
    }
  }

  const permissionsInitMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/permissions\/initialize$/)
  if (permissionsInitMatch && method === "POST") {
    const companyId = decodeURIComponent(permissionsInitMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })
    const current = await getPermissionPayload(companyId)
    const payload = current || cloneJson(DEFAULT_PERMISSIONS)
    await upsertPermissions(companyId, payload)
    send(200, { ok: true })
    return
  }

  const permissionsMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/permissions$/)
  if (permissionsMatch) {
    const companyId = decodeURIComponent(permissionsMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      send(200, { ok: true, permissions: await getPermissionPayload(companyId) })
      return
    }

    if (method === "PATCH") {
      const current = (await getPermissionPayload(companyId)) || cloneJson(DEFAULT_PERMISSIONS)
      const next =
        body?.payload !== undefined
          ? stripUndefinedDeep(body.payload)
          : setNestedValue(current, Array.isArray(body?.path) ? body.path.map(String) : [], body?.value)
      await upsertPermissions(companyId, next)
      send(200, { ok: true })
      return
    }
  }

  const configInitMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/config\/initialize$/)
  if (configInitMatch && method === "POST") {
    const companyId = decodeURIComponent(configInitMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })
    const current = await getConfigPayload(companyId, "company")
    await upsertConfig(companyId, "company", null, null, current ?? cloneJson(DEFAULT_CONFIG))
    send(200, { ok: true })
    return
  }

  const configMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/config$/)
  if (configMatch) {
    const companyId = decodeURIComponent(configMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      send(200, { ok: true, config: await getConfigPayload(companyId, "company") })
      return
    }

    if (method === "PATCH") {
      const scopeType =
        body?.scopeType === "site" || body?.scopeType === "subsite" ? body.scopeType : "company"
      const siteId = body?.siteId ? String(body.siteId) : null
      const subsiteId = body?.subsiteId ? String(body.subsiteId) : null
      await upsertConfig(companyId, scopeType, siteId, subsiteId, body?.config || [])
      send(200, { ok: true })
      return
    }
  }

  const sitesMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites$/)
  if (sitesMatch) {
    const companyId = decodeURIComponent(sitesMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      send(200, { ok: true, rows: await listCompanySites(companyId) })
      return
    }

    if (method === "POST") {
      const siteId = String(body?.data?.siteID || randomUUID())
      const existing = await getSingleRow("company_sites", { id: siteId })
      const row = toSitePayload(companyId, siteId, body?.data || {}, existing)
      if (!existing) {
        await insertRow("company_sites", row)
      } else {
        await patchRow("company_sites", { id: siteId }, row)
      }
      send(200, { ok: true, id: siteId, row: { ...(row.payload || {}), siteID: siteId, companyID: companyId } })
      return
    }
  }

  const siteMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)$/)
  if (siteMatch) {
    const companyId = decodeURIComponent(siteMatch[1])
    const siteId = decodeURIComponent(siteMatch[2])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "PATCH") {
      const existing = await getSingleRow("company_sites", { id: siteId, company_id: companyId })
      if (!existing) throw Object.assign(new Error("Not found"), { status: 404 })
      const row = toSitePayload(companyId, siteId, body?.updates || {}, existing)
      await patchRow("company_sites", { id: siteId, company_id: companyId }, row)
      send(200, { ok: true })
      return
    }

    if (method === "DELETE") {
      await deleteRow("company_sites", { id: siteId, company_id: companyId })
      send(200, { ok: true })
      return
    }
  }

  const subsitesMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)\/subsites$/)
  if (subsitesMatch) {
    const companyId = decodeURIComponent(subsitesMatch[1])
    const siteId = decodeURIComponent(subsitesMatch[2])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "POST") {
      const subsiteId = String(body?.data?.subsiteID || randomUUID())
      const existing = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId })
      const row = toSubsitePayload(companyId, siteId, subsiteId, body?.data || {}, existing)
      if (!existing) {
        await insertRow("company_subsites", row)
      } else {
        await patchRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId }, row)
      }
      send(200, { ok: true, id: subsiteId, row: { ...(row.payload || {}), subsiteID: subsiteId } })
      return
    }
  }

  const subsiteMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)\/subsites\/([^/]+)$/)
  if (subsiteMatch) {
    const companyId = decodeURIComponent(subsiteMatch[1])
    const siteId = decodeURIComponent(subsiteMatch[2])
    const subsiteId = decodeURIComponent(subsiteMatch[3])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      const row = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId })
      send(200, { ok: true, subsite: row ? { ...(row.payload || {}), subsiteID: subsiteId } : null })
      return
    }

    if (method === "PATCH") {
      const existing = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId })
      if (!existing) throw Object.assign(new Error("Not found"), { status: 404 })
      const row = toSubsitePayload(companyId, siteId, subsiteId, body?.updates || {}, existing)
      await patchRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId }, row)
      send(200, { ok: true })
      return
    }

    if (method === "DELETE") {
      await deleteRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId })
      send(200, { ok: true })
      return
    }
  }

  const setupMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/setup$/)
  if (setupMatch) {
    const companyId = decodeURIComponent(setupMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    if (method === "GET") {
      const setupRow = await getSingleRow("company_setups", { id: companyId })
      if (setupRow?.payload) {
        send(200, { ok: true, setup: { ...(setupRow.payload || {}), id: companyId } })
        return
      }

      const companyRow = await getSingleRow("companies", { id: companyId })
      send(200, {
        ok: true,
        setup: companyRow?.payload ? buildSetupFallback(companyId, companyRow.payload) : null,
      })
      return
    }

    if (method === "PUT") {
      const existing = await getSingleRow("company_setups", { id: companyId })
      const payload = stripUndefinedDeep({
        ...(existing?.payload || {}),
        ...(body?.setup || {}),
        id: companyId,
        createdAt: existing?.payload?.createdAt ?? body?.setup?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      })
      const row = {
        id: companyId,
        company_id: companyId,
        payload,
        created_at: existing?.created_at ?? toMillis(payload.createdAt),
        updated_at: Date.now(),
      }
      if (!existing) {
        await insertRow("company_setups", row)
      } else {
        await patchRow("company_setups", { id: companyId }, row)
      }
      send(200, { ok: true })
      return
    }
  }

  const companyUsersMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/users$/)
  if (companyUsersMatch && method === "GET") {
    const companyId = decodeURIComponent(companyUsersMatch[1])
    await assertCompanyAccess(user.uid, companyId, { allowCreator: true })

    const usersSnap = await adminDb.ref("users").get()
    const usersData = (usersSnap.val() || {}) as Record<string, any>
    const companyUsers: any[] = []

    for (const [userId, userData] of Object.entries(usersData)) {
      if (userData?.companies && userData.companies[companyId]) {
        companyUsers.push({
          uid: userId,
          ...userData,
          companyRole: userData.companies[companyId]?.role,
          companyDepartment: userData.companies[companyId]?.department,
        })
      }
    }

    send(200, { ok: true, rows: companyUsers })
    return
  }

  const userCompaniesMatch = pathname.match(/^\/data\/company\/users\/([^/]+)\/companies$/)
  if (userCompaniesMatch && method === "GET") {
    const uid = decodeURIComponent(userCompaniesMatch[1])
    assertSelfAccess(user.uid, uid)

    const snapshot = await adminDb.ref(`users/${uid}/companies`).get()
    if (!snapshot.exists()) {
      send(200, { ok: true, rows: [] })
      return
    }

    const companiesData = snapshot.val() || {}
    const companyIds = Object.keys(companiesData)
    const rows = await Promise.all(
      companyIds.map(async (companyId) => {
        const companyRow = await getSingleRow("companies", { id: companyId })
        if (companyRow?.payload) {
          return {
            companyID: companyId,
            companyName: companyRow.payload?.companyName || "Unknown Company",
            userPermission: companiesData[companyId]?.role || "N/A",
          }
        }

        const companySnap = await adminDb.ref(`companies/${companyId}`).get()
        if (!companySnap.exists()) return null
        const companyData = companySnap.val() || {}
        return {
          companyID: companyId,
          companyName: companyData.companyName || "Unknown Company",
          userPermission: companiesData[companyId]?.role || "N/A",
        }
      }),
    )

    send(200, { ok: true, rows: rows.filter(Boolean) })
    return
  }

  throw Object.assign(new Error("Not found"), { status: 404 })
}
