import { onCall, HttpsError } from "firebase-functions/v2/https"
import { db as adminDb } from "./admin"
import {
  decryptSecret,
  encryptSecret,
  findHMRCLevel,
  getHMRCEncryptionKey,
  getHMRCSecretsPath,
  getHMRCSettingsPath,
} from "./hmrcSecretsUtil"

type RTIType = "fps" | "eps" | "eyu"

function parseType(t: unknown): RTIType {
  if (t === "fps" || t === "eps" || t === "eyu") return t
  throw new HttpsError("invalid-argument", "Invalid type (fps|eps|eyu)")
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

export const hmrcSubmitRtiXml = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError("unauthenticated", "Login required")

  const companyId = String((req.data as any)?.companyId || "").trim()
  const siteId = (req.data as any)?.siteId ?? null
  const subsiteId = (req.data as any)?.subsiteId ?? null
  const type = parseType((req.data as any)?.type)
  const xml = String((req.data as any)?.xml || "")
  const fraudHeaders = ((req.data as any)?.fraudHeaders || null) as Record<string, string> | null

  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required")
  if (!xml || xml.length < 20) throw new HttpsError("invalid-argument", "xml is required")

  const meta = await requireCompanyMemberOrAdmin(uid, companyId)
  requireOwnerOrAdmin(meta)

  const foundAt = await findHMRCLevel(companyId, siteId, subsiteId)
  if (!foundAt) throw new HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.")

  const settingsPath = getHMRCSettingsPath({ companyId, siteId, subsiteId, level: foundAt })
  const settingsSnap = await adminDb.ref(settingsPath).get()
  const settings = (settingsSnap.val() || {}) as any

  const employerPAYEReference = String(settings.employerPAYEReference || "").trim().toUpperCase().replace(/\s+/g, "")
  const environment = (settings.hmrcEnvironment === "production" ? "production" : "sandbox") as "sandbox" | "production"

  if (!employerPAYEReference) throw new HttpsError("failed-precondition", "Missing employerPAYEReference in HMRC settings")

  const baseUrl = environment === "production" ? "https://api.service.hmrc.gov.uk" : "https://test-api.service.hmrc.gov.uk"

  const encKey = getHMRCEncryptionKey()
  const secretsPath = getHMRCSecretsPath({ companyId, siteId, subsiteId, level: foundAt })
  const secretsSnap = await adminDb.ref(secretsPath).get()
  const secrets = (secretsSnap.val() || {}) as any

  let accessToken = decryptSecret(secrets.hmrcAccessToken, encKey)
  const refreshToken = decryptSecret(secrets.hmrcRefreshToken, encKey)
  const tokenExpiry = typeof secrets.hmrcTokenExpiry === "number" ? secrets.hmrcTokenExpiry : 0
  const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim()
  const clientSecret = String(decryptSecret(secrets.hmrcClientSecret, encKey) || "").trim() || String(process.env.HMRC_CLIENT_SECRET || "").trim()

  if (!accessToken || !refreshToken) throw new HttpsError("failed-precondition", "HMRC OAuth not connected. Reconnect to HMRC.")

  const now = Date.now()
  if (!tokenExpiry || tokenExpiry <= now + 300000) {
    if (clientId && clientSecret) {
      const tokenUrl = `${baseUrl}/oauth/token`
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      const refreshResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: String(refreshToken),
        }).toString(),
      })
      if (refreshResponse.ok) {
        const tokenData: any = await refreshResponse.json()
        accessToken = String(tokenData.access_token || accessToken)
        const newExpiry = now + (Number(tokenData.expires_in || 0) * 1000)
        await adminDb.ref(secretsPath).update({
          hmrcAccessToken: encryptSecret(String(tokenData.access_token || ""), encKey),
          hmrcRefreshToken: encryptSecret(String(tokenData.refresh_token || refreshToken), encKey),
          hmrcTokenExpiry: newExpiry,
          updatedAt: now,
        })
      }
    }
  }

  const defaultFraudHeaders: Record<string, string> = {
    "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
    "Gov-Client-Device-ID": `server-${Date.now()}`,
    "Gov-Client-User-IDs": uid ? `os=${uid}` : "",
    "Gov-Client-Timezone": "UTC+00:00",
    "Gov-Client-Local-IPs": "",
    "Gov-Client-Screens": "",
    "Gov-Client-Window-Size": "",
    "Gov-Client-Browser-Plugins": "",
    "Gov-Client-Browser-JS-User-Agent": "",
    "Gov-Client-Browser-Do-Not-Track": "false",
    "Gov-Client-Multi-Factor": "",
  }

  const finalFraudHeaders = fraudHeaders || defaultFraudHeaders

  // HMRC expects the employer reference in URL with "/" replaced by "%2F" (avoid double encoding).
  const employerRef = employerPAYEReference.replace("/", "%2F")
  const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/${type}`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
      Accept: "application/json",
      ...finalFraudHeaders,
    },
    body: xml,
  })

  const contentType = response.headers.get("content-type") || ""
  let body: any = null
  try {
    body = contentType.includes("application/json") ? await response.json() : await response.text()
  } catch {
    body = null
  }

  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    success: response.status === 200 || response.status === 202,
    status: response.status,
    statusText: response.statusText,
    correlationId: headers["x-correlation-id"] || headers["xCorrelationId"],
    headers,
    body,
  }
})

