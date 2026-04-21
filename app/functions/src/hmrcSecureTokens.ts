import { onCall, HttpsError } from "firebase-functions/v2/https"
import { db as adminDb } from "./admin"
import {
  findHMRCLevel,
  getHMRCEncryptionKey,
  getHMRCSecretsPath,
  getHMRCSettingsPath,
  encryptSecret,
  decryptSecret,
  type HMRCLevel,
} from "./hmrcSecretsUtil"

function parseLevel(level: unknown): HMRCLevel {
  if (level === "company" || level === "site" || level === "subsite") return level
  throw new HttpsError("invalid-argument", "Invalid level (company|site|subsite)")
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

export const hmrcSaveClientSecret = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  const level = parseLevel((req.data as any)?.level)
  const clientSecret = String((req.data as any)?.clientSecret || "")
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")
  if (!clientSecret || clientSecret.length < 8) throw new HttpsError("invalid-argument", "clientSecret is required")

  const meta = await requireCompanyMemberOrAdmin(uid, companyId)
  requireOwnerOrAdmin(meta)

  const key = getHMRCEncryptionKey()
  const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level })

  await adminDb.ref(secretsPath).update({
    hmrcClientSecret: encryptSecret(clientSecret, key),
    updatedAt: Date.now(),
  })

  return { success: true, storedAt: level }
})

export const hmrcGetConnectionStatus = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")

  await requireCompanyMemberOrAdmin(uid, companyId)

  const foundAt = await findHMRCLevel(companyId, siteId, subsiteId)
  if (!foundAt) return { connected: false, status: "disconnected", foundAt: null }

  const key = getHMRCEncryptionKey()
  const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level: foundAt })
  const secretsSnap = await adminDb.ref(secretsPath).get()
  const secrets = (secretsSnap.val() || {}) as any

  const hasClientSecret = Boolean(decryptSecret(secrets.hmrcClientSecret, key))
  const tokenExpiry = typeof secrets.hmrcTokenExpiry === "number" ? secrets.hmrcTokenExpiry : 0
  const hasRefreshToken = Boolean(decryptSecret(secrets.hmrcRefreshToken, key))

  if (!hasRefreshToken) return { connected: false, status: "disconnected", foundAt, hasClientSecret }
  const now = Date.now()
  if (tokenExpiry > now + 300000) {
    return { connected: true, status: "connected", foundAt, tokenExpiry, hasClientSecret }
  }
  return { connected: true, status: "expired", foundAt, tokenExpiry, hasClientSecret }
})

export const hmrcExchangeCodeAndStoreTokens = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  const code = String((req.data as any)?.code || "").trim()
  const redirectUri = String((req.data as any)?.redirectUri || "").trim()
  const environment = ((req.data as any)?.environment === "production" ? "production" : "sandbox") as "sandbox" | "production"

  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")
  if (!code) throw new HttpsError("invalid-argument", "code is required")
  if (!redirectUri) throw new HttpsError("invalid-argument", "redirectUri is required")

  const meta = await requireCompanyMemberOrAdmin(uid, companyId)
  requireOwnerOrAdmin(meta)

  const foundAt = await findHMRCLevel(companyId, siteId, subsiteId)
  if (!foundAt) throw new HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.")

  const settingsPath = getHMRCSettingsPath({ companyId, siteId, subsiteId, level: foundAt })
  const settingsSnap = await adminDb.ref(settingsPath).get()
  const settings = (settingsSnap.val() || {}) as any
  const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim()
  if (!clientId) throw new HttpsError("failed-precondition", "Missing HMRC clientId (set hmrcClientId in settings or HMRC_CLIENT_ID env)")

  const key = getHMRCEncryptionKey()
  const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level: foundAt })
  const secretsSnap = await adminDb.ref(secretsPath).get()
  const secrets = (secretsSnap.val() || {}) as any
  const clientSecret =
    String(decryptSecret(secrets.hmrcClientSecret, key) || "").trim() ||
    String(process.env.HMRC_CLIENT_SECRET || "").trim()

  if (!clientSecret) throw new HttpsError("failed-precondition", "Missing HMRC clientSecret (save via hmrcSaveClientSecret or set HMRC_CLIENT_SECRET env)")

  const baseUrl = environment === "sandbox" ? "https://test-api.service.hmrc.gov.uk" : "https://api.service.hmrc.gov.uk"
  const tokenUrl = `${baseUrl}/oauth/token`
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  const rawText = await response.text()
  if (!response.ok) {
    throw new HttpsError("unknown", `HMRC token exchange failed: HTTP ${response.status} ${rawText.slice(0, 500)}`)
  }
  let tokenData: any = {}
  try {
    tokenData = JSON.parse(rawText)
  } catch {
    throw new HttpsError("unknown", "HMRC token exchange returned invalid JSON")
  }

  const expiresIn = Number(tokenData.expires_in || 0)
  const expiryTime = Date.now() + Math.max(0, expiresIn) * 1000

  await adminDb.ref(secretsPath).update({
    hmrcAccessToken: encryptSecret(String(tokenData.access_token || ""), key),
    hmrcRefreshToken: encryptSecret(String(tokenData.refresh_token || ""), key),
    hmrcTokenExpiry: expiryTime,
    hmrcEnvironment: environment,
    lastHMRCAuthDate: Date.now(),
    updatedAt: Date.now(),
  })

  return { success: true, storedAt: foundAt, tokenExpiry: expiryTime }
})

export const hmrcRefreshAccessToken = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")

  const meta = await requireCompanyMemberOrAdmin(uid, companyId)
  requireOwnerOrAdmin(meta)

  const foundAt = await findHMRCLevel(companyId, siteId, subsiteId)
  if (!foundAt) throw new HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.")

  const settingsPath = getHMRCSettingsPath({ companyId, siteId, subsiteId, level: foundAt })
  const settingsSnap = await adminDb.ref(settingsPath).get()
  const settings = (settingsSnap.val() || {}) as any
  const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim()
  if (!clientId) throw new HttpsError("failed-precondition", "Missing HMRC clientId (set hmrcClientId in settings or HMRC_CLIENT_ID env)")

  const key = getHMRCEncryptionKey()
  const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level: foundAt })
  const secretsSnap = await adminDb.ref(secretsPath).get()
  const secrets = (secretsSnap.val() || {}) as any

  const refreshToken = String(decryptSecret(secrets.hmrcRefreshToken, key) || "").trim()
  const clientSecret = String(decryptSecret(secrets.hmrcClientSecret, key) || "").trim() || String(process.env.HMRC_CLIENT_SECRET || "").trim()
  const environment = (secrets.hmrcEnvironment === "production" ? "production" : "sandbox") as "sandbox" | "production"

  if (!refreshToken) throw new HttpsError("failed-precondition", "Missing HMRC refresh token. Reconnect to HMRC.")
  if (!clientSecret) throw new HttpsError("failed-precondition", "Missing HMRC client secret (save via hmrcSaveClientSecret or set HMRC_CLIENT_SECRET env)")

  const baseUrl = environment === "sandbox" ? "https://test-api.service.hmrc.gov.uk" : "https://api.service.hmrc.gov.uk"
  const tokenUrl = `${baseUrl}/oauth/token`
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  })

  const rawText = await response.text()
  if (!response.ok) {
    throw new HttpsError("unknown", `HMRC token refresh failed: HTTP ${response.status} ${rawText.slice(0, 500)}`)
  }

  let tokenData: any = {}
  try {
    tokenData = JSON.parse(rawText)
  } catch {
    throw new HttpsError("unknown", "HMRC token refresh returned invalid JSON")
  }

  const expiresIn = Number(tokenData.expires_in || 0)
  const expiryTime = Date.now() + Math.max(0, expiresIn) * 1000

  await adminDb.ref(secretsPath).update({
    hmrcAccessToken: encryptSecret(String(tokenData.access_token || ""), key),
    hmrcRefreshToken: encryptSecret(String(tokenData.refresh_token || refreshToken), key),
    hmrcTokenExpiry: expiryTime,
    updatedAt: Date.now(),
  })

  return { success: true, storedAt: foundAt, tokenExpiry: expiryTime }
})

