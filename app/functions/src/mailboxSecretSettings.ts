import { onCall, HttpsError } from "firebase-functions/v2/https"
import { db as adminDb } from "./admin"
import { loadMailboxConfig, saveMailboxConfig } from "./mailConfigSecrets"

type MailboxConfigType = "bookings" | "hr" | "stock"

function parseConfigType(value: unknown): MailboxConfigType {
  if (value === "bookings" || value === "hr" || value === "stock") return value
  throw new HttpsError("invalid-argument", "Invalid configType (bookings|hr|stock)")
}

async function requireCompanyMemberOrAdmin(uid: string, companyId: string): Promise<{ role?: string; isAdmin: boolean; isAdminStaff: boolean }> {
  const userSnap = await adminDb.ref(`users/${uid}`).get()
  const user = (userSnap.val() || {}) as any
  const isAdmin = Boolean(user?.isAdmin)
  const isAdminStaff = Boolean(user?.adminStaff?.active)

  const membershipSnap = await adminDb.ref(`users/${uid}/companies/${companyId}`).get()
  const membership = (membershipSnap.val() || {}) as any
  const role = typeof membership?.role === "string" ? membership.role : undefined

  if (isAdmin || isAdminStaff) return { role, isAdmin, isAdminStaff }
  if (membershipSnap.exists()) return { role, isAdmin, isAdminStaff }

  throw new HttpsError("permission-denied", "User is not a member of this company")
}

function requireOwnerOrAdmin(meta: { role?: string; isAdmin: boolean; isAdminStaff: boolean }) {
  if (meta.isAdmin || meta.isAdminStaff) return
  const r = String(meta.role || "").trim().toLowerCase()
  if (r === "owner") return
  throw new HttpsError("permission-denied", "Owner/admin required")
}

function buildBasePath(companyId: string, siteId?: string | null, subsiteId?: string | null) {
  const resolvedSite = String(siteId || "default").trim()
  const resolvedSubsite = String(subsiteId || "default").trim()
  return `companies/${companyId}/sites/${resolvedSite}/subsites/${resolvedSubsite}`
}

function buildConfigPath(basePath: string, configType: MailboxConfigType) {
  if (configType === "hr") return `${basePath}/hrEmailConfig`
  if (configType === "stock") return `${basePath}/stockEmailConfig`
  return `${basePath}/emailConfig`
}

export const saveMailboxSecretSettings = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  const configType = parseConfigType((req.data as any)?.configType)
  const email = String((req.data as any)?.email || "").trim()
  const senderName = String((req.data as any)?.senderName || "").trim()
  const appPassword = String((req.data as any)?.appPassword || "").trim()

  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")
  if (!email) throw new HttpsError("invalid-argument", "email is required")
  const meta = await requireCompanyMemberOrAdmin(uid, companyId)
  requireOwnerOrAdmin(meta)

  const basePath = buildBasePath(companyId, siteId, subsiteId)
  const configPath = buildConfigPath(basePath, configType)
  const now = Date.now()

  const existing = await loadMailboxConfig(basePath, configPath, configType)
  const effectivePassword = appPassword || existing.appPassword
  if (!effectivePassword) {
    throw new HttpsError("invalid-argument", "appPassword is required")
  }

  const loaded = await saveMailboxConfig(basePath, configPath, configType, {
    email,
    senderName,
    appPassword: effectivePassword,
    updatedAt: now,
  })

  if (!loaded.appPassword) {
    throw new HttpsError("unknown", "Failed to persist mailbox secret")
  }

  return {
    success: true,
    email,
    senderName: senderName || undefined,
    hasAppPassword: true,
    updatedAt: now,
    configType,
  }
})

export const getMailboxSecretSettingsStatus = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  const configType = parseConfigType((req.data as any)?.configType)

  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")

  await requireCompanyMemberOrAdmin(uid, companyId)

  const basePath = buildBasePath(companyId, siteId, subsiteId)
  const configPath = buildConfigPath(basePath, configType)
  const loaded = await loadMailboxConfig(basePath, configPath, configType)

  return {
    email: loaded.email || undefined,
    senderName: loaded.senderName || undefined,
    hasAppPassword: Boolean(loaded.appPassword),
    updatedAt: loaded.updatedAt,
    configType,
  }
})
