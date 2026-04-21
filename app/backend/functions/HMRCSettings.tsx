/**
 * HMRC Settings Database Functions
 * Functions to fetch and update HMRC settings per company/site/subsite
 * Supports hierarchy: subsite → site → company
 */

import { ref, get, set, update } from 'firebase/database'
import { db } from '../services/Firebase'
import { HMRCSettings } from '../interfaces/Company'

const HMRC_SENSITIVE_FIELDS: Array<keyof HMRCSettings> = [
  'hmrcClientSecret',
  'hmrcAccessToken',
  'hmrcRefreshToken',
]

function sanitizeHMRCSettings(settings: HMRCSettings): HMRCSettings {
  const sanitized = { ...settings }
  for (const field of HMRC_SENSITIVE_FIELDS) {
    delete sanitized[field]
  }
  return sanitized
}

function stripSensitiveHMRCSettings(settings: Partial<HMRCSettings>): Partial<HMRCSettings> {
  const sanitized = { ...settings }
  for (const field of HMRC_SENSITIVE_FIELDS) {
    delete sanitized[field]
  }
  return sanitized
}

/**
 * Get the path for HMRC settings at a specific level
 */
function getHMRCSettingsPath(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  level: "company" | "site" | "subsite"
): string {
  if (level === "subsite" && subsiteId && siteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSettings`
  } else if (level === "site" && siteId) {
    return `companies/${companyId}/sites/${siteId}/data/company/hmrcSettings`
  } else {
    return `companies/${companyId}/data/company/hmrcSettings`
  }
}

/**
 * Fetch HMRC settings with hierarchy fallback (subsite → site → company)
 * Returns the first found settings and indicates where they were found
 */
export async function fetchHMRCSettings(
  companyId: string,
  siteId: string | null,
  subsiteId?: string | null
): Promise<{ settings: HMRCSettings | null; foundAt: "subsite" | "site" | "company" | null }> {
  try {
    // Check hierarchy: subsite → site → company
    const paths: Array<{ path: string; level: "subsite" | "site" | "company" }> = []
    
    // 1. Check subsite level (if subsiteId provided)
    if (subsiteId && siteId) {
      paths.push({
        path: getHMRCSettingsPath(companyId, siteId, subsiteId, "subsite"),
        level: "subsite"
      })
    }
    
    // 2. Check site level (if siteId provided)
    if (siteId) {
      paths.push({
        path: getHMRCSettingsPath(companyId, siteId, null, "site"),
        level: "site"
      })
    }
    
    // 3. Check company level
    paths.push({
      path: getHMRCSettingsPath(companyId, null, null, "company"),
      level: "company"
    })
    
    // Try each path in order
    for (const { path, level } of paths) {
      const settingsRef = ref(db, path)
      const snapshot = await get(settingsRef)
      
      if (snapshot.exists()) {
        const settings = sanitizeHMRCSettings(snapshot.val() as HMRCSettings)
        // Ensure the foundAt field is set
        if (!settings.configuredAt) {
          settings.configuredAt = level
        }
        return { settings, foundAt: level }
      }
    }
    
    return { settings: null, foundAt: null }
  } catch (error) {
    console.error('Error fetching HMRC settings:', error)
    throw error
  }
}

/**
 * Create or update HMRC settings at specified level
 */
export async function saveHMRCSettings(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  level: "company" | "site" | "subsite",
  settings: Partial<HMRCSettings>
): Promise<void> {
  try {
    const path = getHMRCSettingsPath(companyId, siteId, subsiteId, level)
    const settingsRef = ref(db, path)
    const existing = await get(settingsRef)
    const safeSettings = stripSensitiveHMRCSettings(settings)
    
    const updatedSettings: Partial<HMRCSettings> = {
      ...safeSettings,
      level,
      configuredAt: level,
      updatedAt: Date.now()
    }
    
    if (existing.exists()) {
      await update(settingsRef, updatedSettings)
    } else {
      await set(settingsRef, {
        ...updatedSettings,
        createdAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error saving HMRC settings:', error)
    throw error
  }
}

/**
 * Update stored HMRC OAuth tokens.
 * Updates the most specific configured location: subsite → site → company.
 */
export async function updateHMRCTokens(
  companyId: string,
  siteId: string | null,
  subsiteId: string | null,
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }
): Promise<void> {
  const subsitePath = siteId && subsiteId ? getHMRCSettingsPath(companyId, siteId, subsiteId, "subsite") : null
  const sitePath = siteId ? getHMRCSettingsPath(companyId, siteId, null, "site") : null
  const companyPath = getHMRCSettingsPath(companyId, null, null, "company")

  const resolveTargetPath = async (): Promise<string> => {
    if (subsitePath) {
      const snap = await get(ref(db, subsitePath))
      if (snap.exists()) return subsitePath
    }
    if (sitePath) {
      const snap = await get(ref(db, sitePath))
      if (snap.exists()) return sitePath
    }
    return companyPath
  }

  try {
    const path = await resolveTargetPath()
    const settingsRef = ref(db, path)

    const hmrcTokenExpiry =
      typeof tokens.expiresIn === "number" && Number.isFinite(tokens.expiresIn)
        ? Date.now() + Math.max(0, tokens.expiresIn) * 1000
        : undefined

    const payload: Partial<HMRCSettings> = {
      ...(hmrcTokenExpiry ? { hmrcTokenExpiry } : {}),
      lastHMRCAuthDate: Date.now(),
      updatedAt: Date.now(),
    }

    await update(settingsRef, payload)
  } catch (error) {
    console.error("Error updating HMRC tokens:", error)
    throw error
  }
}

