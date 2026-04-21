import * as firebaseProvider from "../../rtdatabase/Company"
import type { Site, Subsite } from "../../interfaces/Company"
import { authedDataFetch } from "./http"

export * from "../../rtdatabase/Company"

const sitesCache = new Map<string, { data: Site[]; timestamp: number }>()
const SITES_CACHE_TTL = 5 * 60 * 1000

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ""
}

const normalizeDataManagement = (value: any) => {
  if (!value || typeof value !== "object") return value
  return {
    accessibleModules: value.accessibleModules || {},
    accessibleSites: Array.isArray(value.accessibleSites) ? value.accessibleSites : [],
    accessibleSubsites: Array.isArray(value.accessibleSubsites) ? value.accessibleSubsites : [],
  }
}

export const invalidateSitesCache: typeof firebaseProvider.invalidateSitesCache = (companyId?: string) => {
  if (!companyId) {
    sitesCache.clear()
    return
  }
  sitesCache.delete(companyId)
}

const patchPermissions = async (companyId: string, path: string[], value: any) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ path, value }),
  })
}

export const createCompanyInDb: typeof firebaseProvider.createCompanyInDb = async (companyData) => {
  const result = await authedDataFetch(`/company/companies`, {
    method: "POST",
    body: JSON.stringify({ data: companyData }),
  })
  return String(result?.id || "")
}

export const updateCompanyInDb: typeof firebaseProvider.updateCompanyInDb = async (companyId: string, updates) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  })
}

export const getCompanyFromDb: typeof firebaseProvider.getCompanyFromDb = async (companyId: string) => {
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}`, { method: "GET" })
  return (result?.company || null) as Awaited<ReturnType<typeof firebaseProvider.getCompanyFromDb>>
}

export const deleteCompanyFromDb: typeof firebaseProvider.deleteCompanyFromDb = async (companyId: string) => {
  invalidateSitesCache(companyId)
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}`, { method: "DELETE" })
}

export const initializePermissionsInDb: typeof firebaseProvider.initializePermissionsInDb = async (companyId: string) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/permissions/initialize`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export const updateRolePermissionsInDb: typeof firebaseProvider.updateRolePermissionsInDb = async (
  companyId: string,
  role: string,
  permissions,
) => {
  await patchPermissions(companyId, ["roles", role], permissions)
}

export const updateDepartmentPermissionsInDb: typeof firebaseProvider.updateDepartmentPermissionsInDb = async (
  companyId: string,
  department: string,
  permissions,
) => {
  await patchPermissions(companyId, ["departments", department], permissions)
}

export const updateUserPermissionsInDb: typeof firebaseProvider.updateUserPermissionsInDb = async (
  companyId: string,
  userId: string,
  permissions,
) => {
  await patchPermissions(companyId, ["users", userId], permissions)
}

export const updateEmployeePermissionsInDb: typeof firebaseProvider.updateEmployeePermissionsInDb = async (
  companyId: string,
  employeeId: string,
  permissions,
) => {
  await patchPermissions(companyId, ["employees", employeeId], permissions)
}

export const getPermissionsFromDb: typeof firebaseProvider.getPermissionsFromDb = async (companyId: string) => {
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/permissions`, {
    method: "GET",
  })
  return result?.permissions ?? null
}

export const updateDefaultRoleInDb: typeof firebaseProvider.updateDefaultRoleInDb = async (
  companyId: string,
  defaultRole: string,
) => {
  await patchPermissions(companyId, ["defaultRole"], defaultRole)
}

export const updateDefaultDepartmentInDb: typeof firebaseProvider.updateDefaultDepartmentInDb = async (
  companyId: string,
  defaultDepartment: string,
) => {
  await patchPermissions(companyId, ["defaultDepartment"], defaultDepartment)
}

export const updateDefaultPermissionsInDb: typeof firebaseProvider.updateDefaultPermissionsInDb = async (
  companyId: string,
  defaultPermissions,
) => {
  await patchPermissions(companyId, ["defaultPermissions"], defaultPermissions || { modules: {} })
}

export const updateDepartmentPermissionsActiveInDb: typeof firebaseProvider.updateDepartmentPermissionsActiveInDb = async (
  companyId: string,
  departmentKey: string,
  active: boolean,
) => {
  await patchPermissions(companyId, ["departmentsMeta", departmentKey, "active"], active)
}

export const updateRolePermissionsActiveInDb: typeof firebaseProvider.updateRolePermissionsActiveInDb = async (
  companyId: string,
  roleKey: string,
  active: boolean,
) => {
  await patchPermissions(companyId, ["rolesMeta", roleKey, "active"], active)
}

export const updateUserPermissionsActiveInDb: typeof firebaseProvider.updateUserPermissionsActiveInDb = async (
  companyId: string,
  userId: string,
  active: boolean,
) => {
  await patchPermissions(companyId, ["usersMeta", userId, "active"], active)
}

export const updateEmployeePermissionsActiveInDb: typeof firebaseProvider.updateEmployeePermissionsActiveInDb = async (
  companyId: string,
  employeeId: string,
  active: boolean,
) => {
  await patchPermissions(companyId, ["employeesMeta", employeeId, "active"], active)
}

export const initializeConfigInDb: typeof firebaseProvider.initializeConfigInDb = async (companyId: string) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/config/initialize`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export const updateCompanyConfigInDb: typeof firebaseProvider.updateCompanyConfigInDb = async (
  companyId: string,
  config: string[],
) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/config`, {
    method: "PATCH",
    body: JSON.stringify({ scopeType: "company", config }),
  })
}

export const updateSiteConfigInDb: typeof firebaseProvider.updateSiteConfigInDb = async (
  companyId: string,
  siteId: string,
  config: string[],
) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/config`, {
    method: "PATCH",
    body: JSON.stringify({ scopeType: "site", siteId, config }),
  })
}

export const updateSubsiteConfigInDb: typeof firebaseProvider.updateSubsiteConfigInDb = async (
  companyId: string,
  siteId: string,
  subsiteId: string,
  config: string[],
) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/config`, {
    method: "PATCH",
    body: JSON.stringify({ scopeType: "subsite", siteId, subsiteId, config }),
  })
}

export const getConfigFromDb: typeof firebaseProvider.getConfigFromDb = async (companyId: string) => {
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/config`, {
    method: "GET",
  })
  return result?.config ?? null
}

export const createSiteInDb: typeof firebaseProvider.createSiteInDb = async (companyId: string, siteData) => {
  invalidateSitesCache(companyId)
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/sites`, {
    method: "POST",
    body: JSON.stringify({ data: siteData }),
  })
  return String(result?.id || "")
}

export const updateSiteInDb: typeof firebaseProvider.updateSiteInDb = async (
  companyId: string,
  siteId: string,
  updates,
) => {
  invalidateSitesCache(companyId)
  const payload = updates?.dataManagement
    ? { ...updates, dataManagement: normalizeDataManagement(updates.dataManagement) }
    : updates
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates: payload }),
  })
}

export const deleteSiteFromDb: typeof firebaseProvider.deleteSiteFromDb = async (companyId: string, siteId: string) => {
  invalidateSitesCache(companyId)
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}`, {
    method: "DELETE",
  })
}

export const getSitesFromDb: typeof firebaseProvider.getSitesFromDb = async (
  companyId: string,
  _shallow = true,
  options,
) => {
  const cached = sitesCache.get(companyId)
  const bypassCache = options?.bypassCache === true
  if (!bypassCache && cached && Date.now() - cached.timestamp < SITES_CACHE_TTL) {
    return cached.data
  }

  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/sites`, {
    method: "GET",
  })
  const rows = ((result?.rows || []) as Site[]).filter((site) => {
    const name = site?.name || (site as any)?.siteName || ""
    return String(name).trim().length > 0
  })
  sitesCache.set(companyId, { data: rows, timestamp: Date.now() })
  return rows
}

export const createSubsiteInDb: typeof firebaseProvider.createSubsiteInDb = async (
  companyId: string,
  siteId: string,
  subsiteData,
) => {
  invalidateSitesCache(companyId)
  const result = await authedDataFetch(
    `/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}/subsites`,
    {
      method: "POST",
      body: JSON.stringify({ data: subsiteData }),
    },
  )
  return String(result?.id || "")
}

export const updateSubsiteInDb: typeof firebaseProvider.updateSubsiteInDb = async (
  companyId: string,
  siteId: string,
  subsiteId: string,
  updates,
) => {
  invalidateSitesCache(companyId)
  const payload = updates?.dataManagement
    ? { ...updates, dataManagement: normalizeDataManagement(updates.dataManagement) }
    : updates
  await authedDataFetch(
    `/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}/subsites/${encodeURIComponent(subsiteId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ updates: payload }),
    },
  )
}

export const getSubsiteFromDb: typeof firebaseProvider.getSubsiteFromDb = async (
  companyId: string,
  siteId: string,
  subsiteId: string,
) => {
  const result = await authedDataFetch(
    `/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}/subsites/${encodeURIComponent(subsiteId)}`,
    {
      method: "GET",
    },
  )
  return (result?.subsite || null) as Subsite | null
}

export const deleteSubsiteFromDb: typeof firebaseProvider.deleteSubsiteFromDb = async (
  companyId: string,
  siteId: string,
  subsiteId: string,
) => {
  invalidateSitesCache(companyId)
  await authedDataFetch(
    `/company/companies/${encodeURIComponent(companyId)}/sites/${encodeURIComponent(siteId)}/subsites/${encodeURIComponent(subsiteId)}`,
    {
      method: "DELETE",
    },
  )
}

export const fetchCompanySetupFromDb: typeof firebaseProvider.fetchCompanySetupFromDb = async (companyId: string) => {
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/setup`, {
    method: "GET",
  })
  return result?.setup ?? null
}

export const saveCompanySetupToDb: typeof firebaseProvider.saveCompanySetupToDb = async (companyId: string, setup) => {
  await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/setup`, {
    method: "PUT",
    body: JSON.stringify({ setup }),
  })
}

export const getCompanyUsersFromDb: typeof firebaseProvider.getCompanyUsersFromDb = async (companyId: string) => {
  const result = await authedDataFetch(`/company/companies/${encodeURIComponent(companyId)}/users`, {
    method: "GET",
  })
  return result?.rows || []
}

export const getUserCompaniesFromDb: typeof firebaseProvider.getUserCompaniesFromDb = async (uid: string) => {
  const result = await authedDataFetch(`/company/users/${encodeURIComponent(uid)}/companies${query({})}`, {
    method: "GET",
  })
  return result?.rows || []
}
