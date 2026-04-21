import { db as adminDb } from "./admin"

type AppAuthedUser = {
  uid: string
  email?: string
}

type SettingsHandlerArgs = {
  req: any
  res: any
  path: string
  body: any
  user: AppAuthedUser
}

const DEFAULT_PERSONAL_SETTINGS = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  avatar: "",
  address: { street: "", city: "", state: "", zipCode: "", country: "" },
  bankDetails: { accountHolderName: "", bankName: "", accountNumber: "", sortCode: "", iban: "" },
  niNumber: "",
  taxCode: "",
  emergencyContact: { name: "", relationship: "", phone: "", email: "" },
  emergencyContacts: [] as any[],
}

const DEFAULT_PREFERENCES_SETTINGS = {
  theme: "light",
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  emailPreferences: {
    lowStock: true,
    orderUpdates: true,
    systemNotifications: true,
    marketing: false,
  },
  language: "en",
}

const DEFAULT_BUSINESS_SETTINGS = {
  businessName: "",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  taxNumber: "",
  businessLogo: "",
  industry: "",
}

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

const firstQueryValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined
  return typeof value === "string" ? value : undefined
}

const toMillis = (value: any, fallback = Date.now()): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const mergeObject = (base: any, patch: any) => stripUndefinedDeep({ ...(base || {}), ...(patch || {}) })

const normalizeCompaniesCollection = (raw: any): any => {
  if (Array.isArray(raw)) {
    const map: Record<string, any> = {}
    for (const entry of raw) {
      const id = String((entry as any)?.companyID || (entry as any)?.companyId || "").trim()
      if (id) map[id] = entry
    }
    return map
  }
  return raw && typeof raw === "object" ? raw : {}
}

const companyIdsFromCollection = (raw: any): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => String((entry as any)?.companyID || (entry as any)?.companyId || "").trim())
      .filter(Boolean)
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw)
      .map(([key, value]) => String((value as any)?.companyID || (value as any)?.companyId || key || "").trim())
      .filter(Boolean)
  }
  return []
}

const getSupabaseConfig = () => {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "")
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Settings provider"),
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

const assertCompanyAccess = async (uid: string, companyId: string) => {
  const [userCompanySnap, companyUserSnap] = await Promise.all([
    adminDb.ref(`users/${uid}/companies/${companyId}`).get(),
    adminDb.ref(`companies/${companyId}/users/${uid}`).get(),
  ])

  if (!userCompanySnap.exists() && !companyUserSnap.exists()) {
    throw Object.assign(new Error("Forbidden"), { status: 403 })
  }
}

const hasSharedCompany = async (actorUid: string, targetUid: string) => {
  if (actorUid === targetUid) return true

  const [actorCompaniesSnap, targetCompaniesSnap] = await Promise.all([
    adminDb.ref(`users/${actorUid}/companies`).get(),
    adminDb.ref(`users/${targetUid}/companies`).get(),
  ])

  const actorCompanyIds = new Set(companyIdsFromCollection(actorCompaniesSnap.val()))
  const targetCompanyIds = companyIdsFromCollection(targetCompaniesSnap.val())

  return targetCompanyIds.some((companyId) => actorCompanyIds.has(companyId))
}

const assertUserAccess = async (actorUid: string, targetUid: string) => {
  const allowed = await hasSharedCompany(actorUid, targetUid)
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 })
}

const normalizePersonalSettings = (payload: any) => {
  const personal = payload?.settings?.personal
  if (personal && typeof personal === "object") {
    const emergencyContacts =
      (Array.isArray((personal as any).emergencyContacts) && (personal as any).emergencyContacts) ||
      ((personal as any).emergencyContact ? [(personal as any).emergencyContact] : []) ||
      []

    return {
      ...DEFAULT_PERSONAL_SETTINGS,
      ...personal,
      address: mergeObject(DEFAULT_PERSONAL_SETTINGS.address, personal.address),
      bankDetails: mergeObject(DEFAULT_PERSONAL_SETTINGS.bankDetails, personal.bankDetails),
      emergencyContact: mergeObject(DEFAULT_PERSONAL_SETTINGS.emergencyContact, personal.emergencyContact),
      emergencyContacts,
    }
  }

  const legacy = {
    firstName: payload?.firstName || "",
    middleName: payload?.middleName || "",
    lastName: payload?.lastName || "",
    email: payload?.email || "",
    phone: payload?.phone || "",
    jobTitle: payload?.jobTitle || "",
    avatar: payload?.avatar || payload?.photoURL || "",
    address: payload?.address || payload?.personal?.address,
    bankDetails: payload?.bankDetails || payload?.personal?.bankDetails,
    niNumber: payload?.niNumber || payload?.personal?.niNumber,
    taxCode: payload?.taxCode || payload?.personal?.taxCode,
    emergencyContact: payload?.emergencyContact || payload?.personal?.emergencyContact,
    emergencyContacts: payload?.emergencyContacts || payload?.personal?.emergencyContacts,
  }
  const emergencyContacts =
    (Array.isArray((legacy as any).emergencyContacts) && (legacy as any).emergencyContacts) ||
    ((legacy as any).emergencyContact ? [(legacy as any).emergencyContact] : []) ||
    []

  return {
    ...DEFAULT_PERSONAL_SETTINGS,
    ...legacy,
    address: mergeObject(DEFAULT_PERSONAL_SETTINGS.address, legacy.address),
    bankDetails: mergeObject(DEFAULT_PERSONAL_SETTINGS.bankDetails, legacy.bankDetails),
    emergencyContact: mergeObject(DEFAULT_PERSONAL_SETTINGS.emergencyContact, legacy.emergencyContact),
    emergencyContacts,
  }
}

const normalizePreferencesSettings = (payload: any) => {
  const source = payload?.settings?.preferences || payload?.settings || {}
  return {
    ...DEFAULT_PREFERENCES_SETTINGS,
    ...source,
    notifications: mergeObject(DEFAULT_PREFERENCES_SETTINGS.notifications, source.notifications),
    emailPreferences: mergeObject(DEFAULT_PREFERENCES_SETTINGS.emailPreferences, source.emailPreferences),
    dashboardSettings: source.dashboardSettings ?? undefined,
  }
}

const normalizeBusinessSettings = (payload: any) => {
  const source = payload?.settings?.business || payload?.businessInfo || payload || {}
  return {
    ...DEFAULT_BUSINESS_SETTINGS,
    ...source,
    businessLogo: source.businessLogo || source.logo || "",
  }
}

const defaultUserPayload = (uid: string, email = "") => {
  const now = Date.now()
  return {
    uid,
    email,
    firstName: "",
    lastName: "",
    phone: "",
    jobTitle: "",
    avatar: "",
    companies: [],
    currentCompanyID: "",
    settings: {
      personal: {
        ...cloneJson(DEFAULT_PERSONAL_SETTINGS),
        email,
      },
      preferences: cloneJson(DEFAULT_PREFERENCES_SETTINGS),
    },
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  }
}

const normalizeUserPayload = (uid: string, payload: any, fallbackEmail = "") => {
  const base = defaultUserPayload(uid, fallbackEmail)
  const merged = mergeObject(base, payload || {})
  merged.uid = uid
  merged.email = String(merged.email || fallbackEmail || "")
  merged.settings = merged.settings && typeof merged.settings === "object" ? merged.settings : {}
  merged.settings.personal = normalizePersonalSettings(merged)
  merged.settings.preferences = normalizePreferencesSettings(merged)
  merged.createdAt = toMillis(merged.createdAt, base.createdAt)
  merged.updatedAt = toMillis(merged.updatedAt, Date.now())
  merged.lastLogin = toMillis(merged.lastLogin, merged.createdAt)
  return merged
}

const normalizeUserRow = (uid: string, row: any, fallbackEmail = "") => normalizeUserPayload(uid, row?.payload || row, fallbackEmail)

const createUserRow = (uid: string, payload: any, existing?: any) => {
  const normalized = normalizeUserPayload(uid, payload, payload?.email || existing?.email || "")
  const now = Date.now()
  return {
    id: uid,
    email: String(normalized.email || ""),
    display_name: String(normalized.displayName || normalized.firstName || uid),
    current_company_id: String(normalized.currentCompanyID || ""),
    account_status: normalized.accountStatus || "active",
    payload: normalized,
    created_at: existing?.created_at ?? toMillis(normalized.createdAt, now),
    updated_at: now,
  }
}

const createBusinessRow = (companyId: string, payload: any, existing?: any) => {
  const normalized = normalizeBusinessSettings(payload)
  const now = Date.now()
  return {
    company_id: companyId,
    business_name: String(normalized.businessName || companyId),
    payload: normalized,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
}

const readLegacyUserPayload = async (uid: string) => {
  const snapshot = await adminDb.ref(`users/${uid}`).get()
  return snapshot.exists() ? snapshot.val() : null
}

const readLegacyBusinessPayload = async (companyId: string) => {
  const [settingsSnap, businessInfoSnap] = await Promise.all([
    adminDb.ref(`companies/${companyId}/settings/business`).get(),
    adminDb.ref(`companies/${companyId}/businessInfo`).get(),
  ])

  if (!settingsSnap.exists() && !businessInfoSnap.exists()) return null

  return normalizeBusinessSettings({
    ...(settingsSnap.val() || {}),
    ...(businessInfoSnap.val() || {}),
  })
}

const getUserPayload = async (uid: string) => {
  const row = await getSingleRow("app_user_profiles", { id: uid })
  if (row) return normalizeUserRow(uid, row)

  const legacy = await readLegacyUserPayload(uid)
  return legacy ? normalizeUserPayload(uid, legacy) : null
}

const upsertUserPayload = async (uid: string, payload: any) => {
  const existing = await getSingleRow("app_user_profiles", { id: uid })
  const row = createUserRow(
    uid,
    {
      ...(existing?.payload || {}),
      ...payload,
      uid,
    },
    existing,
  )

  if (!existing) await insertRow("app_user_profiles", row)
  else await patchRow("app_user_profiles", { id: uid }, row)

  await adminDb.ref(`users/${uid}`).set(row.payload)
  return row.payload
}

const patchUserPayload = async (uid: string, patch: any) => {
  const existing = (await getUserPayload(uid)) || defaultUserPayload(uid, patch?.email || "")
  const merged = normalizeUserPayload(
    uid,
    {
      ...existing,
      ...patch,
      settings: mergeObject(existing.settings, patch?.settings),
    },
    existing.email || patch?.email || "",
  )
  return upsertUserPayload(uid, merged)
}

const getBusinessPayload = async (companyId: string) => {
  const row = await getSingleRow("app_company_business_settings", { company_id: companyId })
  if (row) return normalizeBusinessSettings(row.payload || {})

  const legacy = await readLegacyBusinessPayload(companyId)
  return legacy || cloneJson(DEFAULT_BUSINESS_SETTINGS)
}

const upsertBusinessPayload = async (companyId: string, payload: any) => {
  const existing = await getSingleRow("app_company_business_settings", { company_id: companyId })
  const row = createBusinessRow(
    companyId,
    {
      ...(existing?.payload || {}),
      ...payload,
    },
    existing,
  )

  if (!existing) await insertRow("app_company_business_settings", row)
  else await patchRow("app_company_business_settings", { company_id: companyId }, row)

  await Promise.all([
    adminDb.ref(`companies/${companyId}/settings/business`).update(row.payload),
    adminDb.ref(`companies/${companyId}/businessInfo`).update({
      ...row.payload,
      logo: row.payload.businessLogo || row.payload.logo || "",
    }),
  ])

  return row.payload
}

const addCompanyMembership = (payload: any, company: any) => {
  const next = cloneJson(payload || {})
  const companyId = String(company?.companyID || company?.companyId || "").trim()
  if (!companyId) throw Object.assign(new Error("Company companyID is required"), { status: 400 })

  next.companies = normalizeCompaniesCollection(next.companies)
  next.companies[companyId] = {
    ...(next.companies[companyId] || {}),
    ...company,
    companyID: companyId,
  }
  return next
}

const removeCompanyMembership = (payload: any, companyId: string) => {
  const next = cloneJson(payload || {})
  const normalizedCompanyId = String(companyId || "").trim()
  if (!normalizedCompanyId) return next

  if (Array.isArray(next.companies)) {
    next.companies = next.companies.filter(
      (entry: any) => String(entry?.companyID || entry?.companyId || "").trim() !== normalizedCompanyId,
    )
    return next
  }

  const companies = normalizeCompaniesCollection(next.companies)
  delete companies[normalizedCompanyId]
  next.companies = companies

  if (String(next.currentCompanyID || "").trim() === normalizedCompanyId) {
    next.currentCompanyID = ""
  }

  return next
}

const fetchCombinedSettings = async (uid: string, companyId: string) => {
  const [userPayload, business] = await Promise.all([getUserPayload(uid), getBusinessPayload(companyId)])
  const normalizedUser = normalizeUserPayload(uid, userPayload || {})
  return {
    personal: normalizePersonalSettings(normalizedUser),
    preferences: normalizePreferencesSettings(normalizedUser),
    business,
  }
}

export const handleSettingsDataRequest = async ({ req, res, path, body, user }: SettingsHandlerArgs) => {
  try {
    const method = String(req.method || "GET").toUpperCase()

    const permissionMatch = path.match(/^\/data\/settings\/permissions\/?$/)
    if (permissionMatch && method === "GET") {
      const uid = String(firstQueryValue(req.query?.uid) || user.uid).trim()
      const companyId = String(firstQueryValue(req.query?.companyId) || "").trim()
      if (!uid || !companyId) throw Object.assign(new Error("uid and companyId are required"), { status: 400 })
      await assertUserAccess(user.uid, uid)
      const companyIds = companyIdsFromCollection((await adminDb.ref(`users/${uid}/companies`).get()).val())
      json(res, 200, { ok: true, allowed: companyIds.includes(companyId) })
      return
    }

    const userExistsMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/exists\/?$/)
    if (userExistsMatch && method === "GET") {
      const uid = decodeURIComponent(userExistsMatch[1])
      await assertUserAccess(user.uid, uid)
      const payload = await getUserPayload(uid)
      json(res, 200, { ok: true, exists: Boolean(payload) })
      return
    }

    const initializeMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/initialize\/?$/)
    if (initializeMatch && method === "POST") {
      const uid = decodeURIComponent(initializeMatch[1])
      if (uid !== user.uid) throw Object.assign(new Error("Forbidden"), { status: 403 })
      const payload = defaultUserPayload(uid, String(body?.email || user.email || ""))
      const saved = await upsertUserPayload(uid, payload)
      json(res, 200, { ok: true, row: saved })
      return
    }

    const userAllMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/all\/?$/)
    if (userAllMatch && method === "GET") {
      const uid = decodeURIComponent(userAllMatch[1])
      const companyId = String(firstQueryValue(req.query?.companyId) || "").trim()
      if (!companyId) throw Object.assign(new Error("companyId is required"), { status: 400 })
      await assertUserAccess(user.uid, uid)
      await assertCompanyAccess(user.uid, companyId)
      json(res, 200, { ok: true, row: await fetchCombinedSettings(uid, companyId) })
      return
    }

    const userPersonalMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/personal\/?$/)
    if (userPersonalMatch) {
      const uid = decodeURIComponent(userPersonalMatch[1])
      await assertUserAccess(user.uid, uid)
      if (method === "GET") {
        const payload = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
        json(res, 200, { ok: true, row: normalizePersonalSettings(payload) })
        return
      }
      if (method === "PATCH") {
        const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
        const next = mergeObject(existing, {
          settings: {
            ...(existing.settings || {}),
            personal: mergeObject(existing.settings?.personal, body?.personalSettings || body?.updates || body || {}),
          },
        })
        const saved = await upsertUserPayload(uid, next)
        json(res, 200, { ok: true, row: normalizePersonalSettings(saved) })
        return
      }
    }

    const userPreferencesMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/preferences\/?$/)
    if (userPreferencesMatch) {
      const uid = decodeURIComponent(userPreferencesMatch[1])
      await assertUserAccess(user.uid, uid)
      if (method === "GET") {
        const payload = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
        json(res, 200, { ok: true, row: normalizePreferencesSettings(payload) })
        return
      }
      if (method === "PATCH") {
        const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
        const next = mergeObject(existing, {
          settings: {
            ...(existing.settings || {}),
            preferences: mergeObject(
              existing.settings?.preferences,
              body?.preferencesSettings || body?.updates || body || {},
            ),
          },
        })
        const saved = await upsertUserPayload(uid, next)
        json(res, 200, { ok: true, row: normalizePreferencesSettings(saved) })
        return
      }
    }

    const currentCompanyMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/current-company\/?$/)
    if (currentCompanyMatch && method === "PUT") {
      const uid = decodeURIComponent(currentCompanyMatch[1])
      await assertUserAccess(user.uid, uid)
      const companyId = String(body?.companyId || body?.companyID || "").trim()
      const saved = await patchUserPayload(uid, { currentCompanyID: companyId })
      json(res, 200, { ok: true, row: saved })
      return
    }

    const userCompaniesMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/companies\/?$/)
    if (userCompaniesMatch && method === "POST") {
      const uid = decodeURIComponent(userCompaniesMatch[1])
      await assertUserAccess(user.uid, uid)
      const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
      const next = addCompanyMembership(existing, body?.company)
      const saved = await upsertUserPayload(uid, next)
      json(res, 200, { ok: true, row: saved })
      return
    }

    const userCompanyDeleteMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/companies\/([^/]+)\/?$/)
    if (userCompanyDeleteMatch && method === "DELETE") {
      const uid = decodeURIComponent(userCompanyDeleteMatch[1])
      await assertUserAccess(user.uid, uid)
      const companyId = decodeURIComponent(userCompanyDeleteMatch[2])
      const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {})
      const next = removeCompanyMembership(existing, companyId)
      const saved = await upsertUserPayload(uid, next)
      json(res, 200, { ok: true, row: saved })
      return
    }

    const userProfileMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/profile\/?$/)
    if (userProfileMatch) {
      const uid = decodeURIComponent(userProfileMatch[1])
      await assertUserAccess(user.uid, uid)
      if (method === "GET") {
        json(res, 200, { ok: true, row: await getUserPayload(uid) })
        return
      }
      if (method === "PATCH") {
        const saved = await patchUserPayload(uid, body?.updates || body || {})
        json(res, 200, { ok: true, row: saved })
        return
      }
    }

    const userRootMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/?$/)
    if (userRootMatch) {
      const uid = decodeURIComponent(userRootMatch[1])
      await assertUserAccess(user.uid, uid)
      if (method === "GET") {
        json(res, 200, { ok: true, row: await getUserPayload(uid) })
        return
      }
      if (method === "PUT") {
        const payload = normalizeUserPayload(uid, body?.userProfile || body?.data || body || {})
        const saved = await upsertUserPayload(uid, payload)
        json(res, 200, { ok: true, row: saved })
        return
      }
      if (method === "PATCH") {
        const saved = await patchUserPayload(uid, body?.userData || body?.updates || body || {})
        json(res, 200, { ok: true, row: saved })
        return
      }
    }

    const businessLogoMatch = path.match(/^\/data\/settings\/companies\/([^/]+)\/business\/logo\/?$/)
    if (businessLogoMatch && method === "PUT") {
      const companyId = decodeURIComponent(businessLogoMatch[1])
      await assertCompanyAccess(user.uid, companyId)
      const logoUrl = String(body?.logoUrl || "").trim()
      const saved = await upsertBusinessPayload(companyId, {
        businessLogo: logoUrl,
        logo: logoUrl,
      })
      json(res, 200, { ok: true, row: saved })
      return
    }

    const businessMatch = path.match(/^\/data\/settings\/companies\/([^/]+)\/business\/?$/)
    if (businessMatch) {
      const companyId = decodeURIComponent(businessMatch[1])
      await assertCompanyAccess(user.uid, companyId)
      if (method === "GET") {
        json(res, 200, { ok: true, row: await getBusinessPayload(companyId) })
        return
      }
      if (method === "PATCH") {
        const saved = await upsertBusinessPayload(companyId, body?.businessSettings || body?.updates || body || {})
        json(res, 200, { ok: true, row: saved })
        return
      }
    }

    json(res, 404, { error: `Unhandled settings route: ${method} ${path}` })
  } catch (error: any) {
    json(res, error?.status || 500, { error: error?.message || "Unexpected settings data error" })
  }
}
