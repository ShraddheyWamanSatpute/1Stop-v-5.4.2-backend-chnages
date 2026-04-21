import * as firebaseProvider from "../../rtdatabase/Settings"
import type {
  BusinessSettings,
  PersonalSettings,
  PreferencesSettings,
  Settings as CombinedSettings,
  User,
} from "../../interfaces/Settings"
import { authedDataFetch, createPollingSubscription } from "./http"

export * from "../../rtdatabase/Settings"

const DEFAULT_PERSONAL_SETTINGS: PersonalSettings = {
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
  emergencyContacts: [],
}

const DEFAULT_PREFERENCES_SETTINGS: PreferencesSettings = {
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

const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  taxNumber: "",
  businessLogo: "",
  industry: "",
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const mergeObject = (base: any, patch: any) => ({ ...(base || {}), ...(patch || {}) })

const normalizePersonalSettings = (value: any): PersonalSettings => {
  const emergencyContacts =
    (Array.isArray(value?.emergencyContacts) && value.emergencyContacts) ||
    (value?.emergencyContact ? [value.emergencyContact] : []) ||
    []

  return {
    ...DEFAULT_PERSONAL_SETTINGS,
    ...(value || {}),
    address: mergeObject(DEFAULT_PERSONAL_SETTINGS.address, value?.address),
    bankDetails: mergeObject(DEFAULT_PERSONAL_SETTINGS.bankDetails, value?.bankDetails),
    emergencyContact: mergeObject(DEFAULT_PERSONAL_SETTINGS.emergencyContact, value?.emergencyContact),
    emergencyContacts,
  }
}

const normalizePreferencesSettings = (value: any): PreferencesSettings => ({
  ...DEFAULT_PREFERENCES_SETTINGS,
  ...(value || {}),
  notifications: mergeObject(DEFAULT_PREFERENCES_SETTINGS.notifications, value?.notifications),
  emailPreferences: mergeObject(DEFAULT_PREFERENCES_SETTINGS.emailPreferences, value?.emailPreferences),
  dashboardSettings: value?.dashboardSettings ?? undefined,
})

const normalizeBusinessSettings = (value: any): BusinessSettings => ({
  ...DEFAULT_BUSINESS_SETTINGS,
  ...(value || {}),
  businessLogo: value?.businessLogo || value?.logo || "",
})

const normalizeUser = (value: any): User => ({
  ...(value || {}),
  uid: String(value?.uid || ""),
  email: String(value?.email || ""),
  companies: Array.isArray(value?.companies) ? value.companies : value?.companies || [],
  createdAt: Number(value?.createdAt || Date.now()),
  lastLogin: Number(value?.lastLogin || value?.createdAt || Date.now()),
  settings: {
    theme: value?.settings?.theme || value?.settings?.preferences?.theme || "light",
    notifications:
      typeof value?.settings?.notifications === "boolean"
        ? value.settings.notifications
        : Boolean(value?.settings?.preferences?.notifications?.push ?? true),
    language: value?.settings?.language || value?.settings?.preferences?.language || "en",
  },
})

const normalizeCombinedSettings = (value: any): CombinedSettings => ({
  personal: normalizePersonalSettings(value?.personal),
  preferences: normalizePreferencesSettings(value?.preferences),
  business: normalizeBusinessSettings(value?.business),
})

export const createUserProfileInDb: typeof firebaseProvider.createUserProfileInDb = async (userProfile: any) => {
  const uid = String(userProfile?.uid || "").trim()
  if (!uid) throw new Error("User profile uid is required")

  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: JSON.stringify({ userProfile }),
  })
}

export const updateAvatarInDb: typeof firebaseProvider.updateAvatarInDb = async (uid: string, avatarUrl: string) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/personal`, {
    method: "PATCH",
    body: JSON.stringify({ updates: { avatar: avatarUrl } }),
  })
}

export const updateThemeInDb: typeof firebaseProvider.updateThemeInDb = async (uid: string, theme: string) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/preferences`, {
    method: "PATCH",
    body: JSON.stringify({ updates: { theme } }),
  })
}

export const updateBusinessLogoInDb: typeof firebaseProvider.updateBusinessLogoInDb = async (
  companyId: string,
  logoUrl: string,
) => {
  await authedDataFetch(`/settings/companies/${encodeURIComponent(companyId)}/business/logo`, {
    method: "PUT",
    body: JSON.stringify({ logoUrl }),
  })
}

export const getUserData: typeof firebaseProvider.getUserData = async (uid: string) => {
  const result = await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}`, {
    method: "GET",
  })
  return result?.row ? normalizeUser(result.row) : null
}

export const updateUserData: typeof firebaseProvider.updateUserData = async (uid: string, userData: Partial<User>) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    body: JSON.stringify({ userData }),
  })
}

export const setCurrentCompany: typeof firebaseProvider.setCurrentCompany = async (uid: string, companyID: string) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/current-company`, {
    method: "PUT",
    body: JSON.stringify({ companyId: companyID }),
  })
}

export const addCompanyToUser: typeof firebaseProvider.addCompanyToUser = async (uid: string, company) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/companies`, {
    method: "POST",
    body: JSON.stringify({ company }),
  })
}

export const removeCompanyFromUser: typeof firebaseProvider.removeCompanyFromUser = async (
  uid: string,
  companyID: string,
) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/companies/${encodeURIComponent(companyID)}`, {
    method: "DELETE",
  })
}

export const fetchUserPersonalSettings: typeof firebaseProvider.fetchUserPersonalSettings = async (uid: string) => {
  const result = await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/personal`, {
    method: "GET",
  })
  return normalizePersonalSettings(result?.row)
}

export const fetchPersonalSettings: typeof firebaseProvider.fetchPersonalSettings = async (uid: string) =>
  fetchUserPersonalSettings(uid)

export const updatePersonalSettings: typeof firebaseProvider.updatePersonalSettings = async (
  uid: string,
  personalSettings,
) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/personal`, {
    method: "PATCH",
    body: JSON.stringify({ personalSettings }),
  })
}

export const updateAvatar: typeof firebaseProvider.updateAvatar = async (uid: string, avatarUrl: string) =>
  updateAvatarInDb(uid, avatarUrl)

export const fetchUserPreferencesSettings: typeof firebaseProvider.fetchUserPreferencesSettings = async (uid: string) => {
  const result = await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/preferences`, {
    method: "GET",
  })
  return normalizePreferencesSettings(result?.row)
}

export const fetchPreferencesSettings: typeof firebaseProvider.fetchPreferencesSettings = async (uid: string) =>
  fetchUserPreferencesSettings(uid)

export const updatePreferencesSettings: typeof firebaseProvider.updatePreferencesSettings = async (
  uid: string,
  preferencesSettings,
) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/preferences`, {
    method: "PATCH",
    body: JSON.stringify({ preferencesSettings }),
  })
}

export const updateTheme: typeof firebaseProvider.updateTheme = async (uid: string, theme: "light" | "dark") =>
  updateThemeInDb(uid, theme)

export const fetchCompanyBusinessSettings: typeof firebaseProvider.fetchCompanyBusinessSettings = async (
  companyId: string,
) => {
  const result = await authedDataFetch(`/settings/companies/${encodeURIComponent(companyId)}/business`, {
    method: "GET",
  })
  return normalizeBusinessSettings(result?.row)
}

export const fetchBusinessSettings: typeof firebaseProvider.fetchBusinessSettings = async (companyId: string) =>
  fetchCompanyBusinessSettings(companyId)

export const updateBusinessSettings: typeof firebaseProvider.updateBusinessSettings = async (
  companyId: string,
  businessSettings,
) => {
  await authedDataFetch(`/settings/companies/${encodeURIComponent(companyId)}/business`, {
    method: "PATCH",
    body: JSON.stringify({ businessSettings }),
  })
}

export const updateBusinessLogo: typeof firebaseProvider.updateBusinessLogo = async (
  companyId: string,
  logoUrl: string,
) => updateBusinessLogoInDb(companyId, logoUrl)

export const fetchAllSettings: typeof firebaseProvider.fetchAllSettings = async (uid: string, companyId: string) => {
  const result = await authedDataFetch(
    `/settings/users/${encodeURIComponent(uid)}/all${query({ companyId })}`,
    { method: "GET" },
  )
  return normalizeCombinedSettings(result?.row)
}

export const subscribeToSettings: typeof firebaseProvider.subscribeToSettings = (uid, companyId, callback) =>
  createPollingSubscription(
    () => fetchAllSettings(uid, companyId),
    (settings) => callback(settings),
  )

export const fetchUserProfileFromDb: typeof firebaseProvider.fetchUserProfileFromDb = async (uid: string) => {
  const result = await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/profile`, {
    method: "GET",
  })
  return result?.row || null
}

export const updateUserProfileInDb: typeof firebaseProvider.updateUserProfileInDb = async (uid: string, updates: any) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/profile`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
}

export const checkUserExists: typeof firebaseProvider.checkUserExists = async (uid: string) => {
  const result = await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/exists`, {
    method: "GET",
  })
  return Boolean(result?.exists)
}

export const initializeUserSettingsInDb: typeof firebaseProvider.initializeUserSettingsInDb = async (
  uid: string,
  email: string,
) => {
  await authedDataFetch(`/settings/users/${encodeURIComponent(uid)}/initialize`, {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export const checkSettingsPermission: typeof firebaseProvider.checkSettingsPermission = async (
  uid: string,
  companyId: string,
) => {
  const result = await authedDataFetch(`/settings/permissions${query({ uid, companyId })}`, {
    method: "GET",
  })
  return Boolean(result?.allowed)
}

// ===== GENERIC PATH CRUD =====

export const fetchIntegrationsFromPath: typeof firebaseProvider.fetchIntegrationsFromPath = async (path: string) => {
  const result = await authedDataFetch(`/settings/generic${query({ path })}`, { method: "GET" })
  return result || null
}

export const saveIntegrationToPath: typeof firebaseProvider.saveIntegrationToPath = async (path: string, integrationId: string, data: any) => {
  const fullPath = integrationId ? `${path}/${integrationId}` : path
  await authedDataFetch(`/settings/generic`, {
    method: "PUT",
    body: JSON.stringify({ path: fullPath, data }),
  })
}
