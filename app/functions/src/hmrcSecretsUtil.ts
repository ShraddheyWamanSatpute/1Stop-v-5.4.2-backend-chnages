import { HttpsError } from "firebase-functions/v2/https"
import { decryptString, encryptString, isEncryptedValue } from "./hrCrypto"
import { db as adminDb } from "./admin"

export type HMRCLevel = "company" | "site" | "subsite"

export function getHMRCSettingsPath(params: {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  level: HMRCLevel
}): string {
  const { companyId, siteId, subsiteId, level } = params
  if (level === "subsite" && siteId && subsiteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSettings`
  }
  if (level === "site" && siteId) {
    return `companies/${companyId}/sites/${siteId}/data/company/hmrcSettings`
  }
  return `companies/${companyId}/data/company/hmrcSettings`
}

export function getHMRCSecretsPath(params: {
  companyId: string
  siteId?: string | null
  subsiteId?: string | null
  level: HMRCLevel
}): string {
  const { companyId, siteId, subsiteId, level } = params
  if (level === "subsite" && siteId && subsiteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSecrets`
  }
  if (level === "site" && siteId) {
    return `companies/${companyId}/sites/${siteId}/data/company/hmrcSecrets`
  }
  return `companies/${companyId}/data/company/hmrcSecrets`
}

export async function findHMRCLevel(companyId: string, siteId?: string | null, subsiteId?: string | null): Promise<HMRCLevel | null> {
  const candidates: Array<{ level: HMRCLevel; path: string }> = []
  if (siteId && subsiteId) candidates.push({ level: "subsite", path: getHMRCSettingsPath({ companyId, siteId, subsiteId, level: "subsite" }) })
  if (siteId) candidates.push({ level: "site", path: getHMRCSettingsPath({ companyId, siteId, level: "site" }) })
  candidates.push({ level: "company", path: getHMRCSettingsPath({ companyId, level: "company" }) })

  for (const c of candidates) {
    const snap = await adminDb.ref(c.path).get()
    if (snap.exists()) return c.level
  }
  return null
}

export function getHMRCEncryptionKey(): string {
  const key = String(process.env.HMRC_ENCRYPTION_KEY || "").trim()
  if (!key || key.length < 32) {
    throw new HttpsError("failed-precondition", "Missing HMRC_ENCRYPTION_KEY (min 32 chars)")
  }
  return key
}

export function encryptSecret(value: string, key: string): string {
  if (!value) return value
  if (isEncryptedValue(value)) return value
  return encryptString(value, key)
}

export function decryptSecret(value: string | undefined | null, key: string): string | undefined {
  if (!value) return undefined
  if (!isEncryptedValue(value)) return value
  return decryptString(value, key)
}

