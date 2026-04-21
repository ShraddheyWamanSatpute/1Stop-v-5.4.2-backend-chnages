import {
  Site,
  Subsite,
  UserProfile,
  SiteInvite,
  CompanyMessage,
  CompanySetup,
  CompanyChecklist,
  ChecklistCompletion,
  SiteDataConfigState
} from "../interfaces/Company"

import {
  createCompanyInDb,
  updateCompanyInDb,
  getCompanyFromDb,
  deleteCompanyFromDb,
  initializePermissionsInDb,
  updateRolePermissionsInDb,
  updateDepartmentPermissionsInDb,
  updateUserPermissionsInDb,
  updateEmployeePermissionsInDb,
  getPermissionsFromDb,
  updateDefaultRoleInDb,
  updateDefaultDepartmentInDb,
  updateDefaultPermissionsInDb,
  updateDepartmentPermissionsActiveInDb,
  updateRolePermissionsActiveInDb,
  updateUserPermissionsActiveInDb,
  updateEmployeePermissionsActiveInDb,
  initializeConfigInDb,
  updateCompanyConfigInDb,
  updateSiteConfigInDb,
  updateSubsiteConfigInDb,
  getConfigFromDb,
  createSiteInDb,
  updateSiteInDb,
  deleteSiteFromDb,
  getSitesFromDb,
  createSubsiteInDb,
  updateSubsiteInDb,
  deleteSubsiteFromDb,
  getSubsiteFromDb,
  fetchChecklistsFromDb,
  createChecklistInDb,
  updateChecklistInDb,
  deleteChecklistFromDb,
  fetchCompanySetupFromDb,
  saveCompanySetupToDb,
  fetchUserProfileFromDb,
  updateUserProfileInDb,
  fetchCompanyMessagesFromDb,
  createCompanyMessageInDb,
  createSiteInviteInDb,
  getSiteInvitesFromDb,
  getSiteInviteByCodeFromDb,
  updateSiteInviteInDb,
  getUserCompaniesFromDb,
  getCompanyUsersFromDb,
  createEmployeeJoinCodeInDb,
  getEmployeeJoinCodesFromDb,
  getEmployeeJoinCodeByCodeFromDb,
  revokeEmployeeJoinCodeInDb,
} from "../data/Company"
import { setCurrentCompany, updatePersonalSettings } from "../data/Settings"
import { db, ref, get, update, runTransaction } from "../services/Firebase"
import { callCallableProxy } from "../services/callableProxy"

const linkUserAndCompanyAtomically = async (
  userId: string,
  companyId: string,
  userCompanyData: Record<string, any>,
  companyUserData: Record<string, any>,
): Promise<void> => {
  const updates: Record<string, any> = {
    [`users/${userId}/companies/${companyId}`]: userCompanyData,
    [`companies/${companyId}/users/${userId}`]: companyUserData,
  }
  await update(ref(db), updates)
}

/**
 * Helper function to search for an employee across all sites and subsites in a company
 * Returns the employee data and the path where it was found
 * @param companyId Company ID
 * @param employeeId Employee ID
 * @returns Promise<{ employee: any, basePath: string, siteId?: string, subsiteId?: string } | null>
 */
const findEmployeeAcrossCompany = async (
  companyId: string,
  employeeId: string
): Promise<{ employee: any, basePath: string, siteId?: string, subsiteId?: string } | null> => {
  try {
    // First try company-level HR
    const companyHrPath = `companies/${companyId}/data/hr`
    const companyRes: any = await callCallableProxy("hrGetEmployee", { hrPath: companyHrPath, employeeId })
    if (companyRes?.data?.employee) {
      return {
        employee: companyRes.data.employee,
        basePath: companyHrPath
      }
    }

    // Get all sites
    const sitesRef = ref(db, `companies/${companyId}/sites`)
    const sitesSnap = await get(sitesRef)
    
    if (!sitesSnap.exists()) {
      return null
    }

    const sites = sitesSnap.val() || {}
    const siteIds = Object.keys(sites)

    // Try all sites (parallel fetch for performance)
    const sitePromises = siteIds.map(async (siteId) => {
      // Try site-level HR
      const siteHrPath = `companies/${companyId}/sites/${siteId}/data/hr`
      const siteRes: any = await callCallableProxy("hrGetEmployee", { hrPath: siteHrPath, employeeId })
      if (siteRes?.data?.employee) {
        return {
          employee: siteRes.data.employee,
          basePath: siteHrPath,
          siteId
        }
      }

      // Try all subsites in this site
      const subsitesRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites`)
      const subsitesSnap = await get(subsitesRef)
      
      if (subsitesSnap.exists()) {
        const subsites = subsitesSnap.val() || {}
        const subsiteIds = Object.keys(subsites)
        
        // Try all subsites (parallel fetch)
        const subsitePromises = subsiteIds.map(async (subsiteId) => {
          const subsiteHrPath = `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/hr`
          const subsiteRes: any = await callCallableProxy("hrGetEmployee", { hrPath: subsiteHrPath, employeeId })
          if (subsiteRes?.data?.employee) {
            return {
              employee: subsiteRes.data.employee,
              basePath: subsiteHrPath,
              siteId,
              subsiteId
            }
          }
          return null
        })
        
        const subsiteResults = await Promise.all(subsitePromises)
        const found = subsiteResults.find(r => r !== null)
        if (found) return found
      }

      return null
    })

    const siteResults = await Promise.all(sitePromises)
    const found = siteResults.find(r => r !== null)
    
    return found || null
  } catch (error) {
    console.error("Error searching for employee across company:", error)
    return null
  }
}

// ========== COMPANY MANAGEMENT FUNCTIONS ==========

/**
 * Create a new company with initialized permissions and configuration
 * @param companyData Company data object
 * @returns Promise<string> Company ID
 */
export const createCompany = async (companyData: any): Promise<string> => {
  try {
    const companyId = await createCompanyInDb(companyData)
    
    // Initialize permissions for the new company
    await initializePermissionsInDb(companyId)
    
    // Initialize configuration for the new company
    await initializeConfigInDb(companyId)
    
    return companyId
  } catch (error) {
    throw new Error(`Error creating company: ${error}`)
  }
}

/**
 * Update company information
 * @param companyId Company ID
 * @param updates Partial company data to update
 * @returns Promise<void>
 */
export const updateCompany = async (companyId: string, updates: any): Promise<void> => {
  try {
    await updateCompanyInDb(companyId, updates)
  } catch (error) {
    throw new Error(`Error updating company: ${error}`)
  }
}

/**
 * Get company data by ID
 * @param companyId Company ID
 * @returns Promise<any | null> Company data or null if not found
 */
export const getCompany = async (companyId: string): Promise<any | null> => {
  try {
    return await getCompanyFromDb(companyId)
  } catch (error) {
    throw new Error(`Error getting company: ${error}`)
  }
}

/**
 * Delete company and all associated data
 * @param companyId Company ID
 * @returns Promise<void>
 */
export const deleteCompany = async (companyId: string): Promise<void> => {
  try {
    await deleteCompanyFromDb(companyId)
  } catch (error) {
    throw new Error(`Error deleting company: ${error}`)
  }
}

// ========== PERMISSION MANAGEMENT FUNCTIONS ==========

/**
 * Update permissions for a specific role
 * @param companyId Company ID
 * @param role Role name
 * @param permissions Boolean array of permissions
 * @returns Promise<void>
 */
export const updateRolePermissions = async (companyId: string, role: string, permissions: any): Promise<void> => {
  try {
    await updateRolePermissionsInDb(companyId, role, permissions)
  } catch (error) {
    throw new Error(`Error updating role permissions: ${error}`)
  }
}

/**
 * Update permissions for a specific department
 * @param companyId Company ID
 * @param department Department name
 * @param permissions Boolean array of permissions
 * @returns Promise<void>
 */
export const updateDepartmentPermissions = async (companyId: string, department: string, permissions: any): Promise<void> => {
  try {
    await updateDepartmentPermissionsInDb(companyId, department, permissions)
  } catch (error) {
    throw new Error(`Error updating department permissions: ${error}`)
  }
}

/**
 * Update permissions for a specific user
 * @param companyId Company ID
 * @param userId User ID
 * @param permissions UserPermissions object (new format) or boolean array (legacy format)
 * @returns Promise<void>
 */
export const updateUserPermissions = async (companyId: string, userId: string, permissions: any): Promise<void> => {
  try {
    await updateUserPermissionsInDb(companyId, userId, permissions)
  } catch (error) {
    throw new Error(`Error updating user permissions: ${error}`)
  }
}

export const updateEmployeePermissions = async (companyId: string, employeeId: string, permissions: any): Promise<void> => {
  try {
    await updateEmployeePermissionsInDb(companyId, employeeId, permissions)
  } catch (error) {
    throw new Error(`Error updating employee permissions: ${error}`)
  }
}

/**
 * Get all permissions for a company
 * @param companyId Company ID
 * @returns Promise<any> Permissions object
 */
export const getPermissions = async (companyId: string): Promise<any> => {
  try {
    return await getPermissionsFromDb(companyId)
  } catch (error) {
    throw new Error(`Error getting permissions: ${error}`)
  }
}

export const updateDefaultRole = async (companyId: string, defaultRole: string): Promise<void> => {
  try {
    await updateDefaultRoleInDb(companyId, defaultRole)
  } catch (error) {
    throw new Error(`Error updating default role: ${error}`)
  }
}

export const updateDefaultDepartment = async (companyId: string, defaultDepartment: string): Promise<void> => {
  try {
    await updateDefaultDepartmentInDb(companyId, defaultDepartment)
  } catch (error) {
    throw new Error(`Error updating default department: ${error}`)
  }
}

export const updateDefaultPermissions = async (companyId: string, defaultPermissions: any): Promise<void> => {
  try {
    await updateDefaultPermissionsInDb(companyId, defaultPermissions)
  } catch (error) {
    throw new Error(`Error updating default permissions: ${error}`)
  }
}

export const updateDepartmentPermissionsActive = async (companyId: string, departmentKey: string, active: boolean): Promise<void> => {
  try {
    await updateDepartmentPermissionsActiveInDb(companyId, departmentKey, active)
  } catch (error) {
    throw new Error(`Error updating department permissions active: ${error}`)
  }
}

export const updateRolePermissionsActive = async (companyId: string, roleKey: string, active: boolean): Promise<void> => {
  try {
    await updateRolePermissionsActiveInDb(companyId, roleKey, active)
  } catch (error) {
    throw new Error(`Error updating role permissions active: ${error}`)
  }
}

export const updateUserPermissionsActive = async (companyId: string, userId: string, active: boolean): Promise<void> => {
  try {
    await updateUserPermissionsActiveInDb(companyId, userId, active)
  } catch (error) {
    throw new Error(`Error updating user permissions active: ${error}`)
  }
}

export const updateEmployeePermissionsActive = async (companyId: string, employeeId: string, active: boolean): Promise<void> => {
  try {
    await updateEmployeePermissionsActiveInDb(companyId, employeeId, active)
  } catch (error) {
    throw new Error(`Error updating employee permissions active: ${error}`)
  }
}

/**
 * Get all users for a company
 * @param companyId Company ID
 * @returns Promise<any[]> Array of company users
 */
export const getCompanyUsers = async (companyId: string): Promise<any[]> => {
  try {
    return await getCompanyUsersFromDb(companyId)
  } catch (error) {
    throw new Error(`Error getting company users: ${error}`)
  }
}

// ========== CONFIGURATION MANAGEMENT FUNCTIONS ==========

/**
 * Update company configuration settings
 * @param companyId Company ID
 * @param config String array of configuration settings
 * @returns Promise<void>
 */
export const updateCompanyConfig = async (companyId: string, config: string[]): Promise<void> => {
  try {
    await updateCompanyConfigInDb(companyId, config)
  } catch (error) {
    throw new Error(`Error updating company config: ${error}`)
  }
}

/**
 * Update site configuration settings
 * @param companyId Company ID
 * @param siteId Site ID
 * @param config String array of configuration settings
 * @returns Promise<void>
 */
export const updateSiteConfig = async (companyId: string, siteId: string, config: string[]): Promise<void> => {
  try {
    await updateSiteConfigInDb(companyId, siteId, config)
  } catch (error) {
    throw new Error(`Error updating site config: ${error}`)
  }
}

/**
 * Update subsite configuration settings
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @param config String array of configuration settings
 * @returns Promise<void>
 */
export const updateSubsiteConfig = async (companyId: string, siteId: string, subsiteId: string, config: string[]): Promise<void> => {
  try {
    await updateSubsiteConfigInDb(companyId, siteId, subsiteId, config)
  } catch (error) {
    throw new Error(`Error updating subsite config: ${error}`)
  }
}

/**
 * Get configuration settings for a company
 * @param companyId Company ID
 * @returns Promise<any> Configuration object
 */
export const getConfig = async (companyId: string): Promise<any> => {
  try {
    return await getConfigFromDb(companyId)
  } catch (error) {
    throw new Error(`Error getting config: ${error}`)
  }
}

// ========== SITE MANAGEMENT FUNCTIONS ==========

/**
 * Create a new site for a company
 * @param companyId Company ID
 * @param siteData Site data without siteID and companyID
 * @returns Promise<string> Site ID
 */
export const createSite = async (companyId: string, siteData: Omit<Site, 'siteID' | 'companyID'>): Promise<string> => {
  try {
    return await createSiteInDb(companyId, siteData)
  } catch (error) {
    throw new Error(`Error creating site: ${error}`)
  }
}

/**
 * Update site information
 * @param companyId Company ID
 * @param siteId Site ID
 * @param updates Partial site data to update
 * @returns Promise<void>
 */
export const updateSite = async (companyId: string, siteId: string, updates: Partial<Site>): Promise<void> => {
  try {
    await updateSiteInDb(companyId, siteId, updates)
  } catch (error) {
    throw new Error(`Error updating site: ${error}`)
  }
}

/**
 * Delete a site and all associated data
 * @param companyId Company ID
 * @param siteId Site ID
 * @returns Promise<void>
 */
export const deleteSite = async (companyId: string, siteId: string): Promise<void> => {
  try {
    await deleteSiteFromDb(companyId, siteId)
  } catch (error) {
    throw new Error(`Error deleting site: ${error}`)
  }
}

/**
 * Get all sites for a company
 * @param companyId Company ID
 * @returns Promise<Site[]> Array of sites
 */
export const getSites = async (companyId: string, bypassCache: boolean = false): Promise<Site[]> => {
  try {
    return await getSitesFromDb(companyId, true, { bypassCache })
  } catch (error) {
    throw new Error(`Error getting sites: ${error}`)
  }
}

// ========== SUBSITE MANAGEMENT FUNCTIONS ==========

/**
 * Create a new subsite for a site
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteData Subsite data without subsiteID
 * @returns Promise<string> Subsite ID
 */
export const createSubsite = async (companyId: string, siteId: string, subsiteData: Omit<Subsite, 'subsiteID'>): Promise<string> => {
  try {
    return await createSubsiteInDb(companyId, siteId, subsiteData)
  } catch (error) {
    throw new Error(`Error creating subsite: ${error}`)
  }
}

/**
 * Update subsite information
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @param updates Partial subsite data to update
 * @returns Promise<void>
 */
export const updateSubsite = async (companyId: string, siteId: string, subsiteId: string, updates: Partial<Subsite>): Promise<void> => {
  try {
    await updateSubsiteInDb(companyId, siteId, subsiteId, updates)
  } catch (error) {
    throw new Error(`Error updating subsite: ${error}`)
  }
}

/**
 * Delete a subsite and all associated data
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @returns Promise<void>
 */
export const deleteSubsite = async (companyId: string, siteId: string, subsiteId: string): Promise<void> => {
  try {
    await deleteSubsiteFromDb(companyId, siteId, subsiteId)
  } catch (error) {
    throw new Error(`Error deleting subsite: ${error}`)
  }
}

export const getSubsite = async (companyId: string, siteId: string, subsiteId: string): Promise<Subsite | null> => {
  try {
    return await getSubsiteFromDb(companyId, siteId, subsiteId)
  } catch (error) {
    console.error("Error fetching subsite:", error)
    throw error
  }
}

// ========== CHECKLIST MANAGEMENT FUNCTIONS ==========

/**
 * Get base path for checklist operations based on company, site, and subsite
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @returns string Base path for checklist operations
 */
export const getChecklistBasePath = (companyId: string, siteId?: string, subsiteId?: string): string => {
  if (subsiteId && siteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`
  } else if (siteId) {
    return `companies/${companyId}/sites/${siteId}`
  } else {
    return `companies/${companyId}`
  }
}

/**
 * Fetch checklists for company, site, or subsite
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @returns Promise<CompanyChecklist[]> Array of checklists
 */
export const fetchChecklists = async (
  companyId: string,
  siteId?: string,
  subsiteId?: string,
): Promise<CompanyChecklist[]> => {
  try {
    const basePath = getChecklistBasePath(companyId, siteId, subsiteId)
    return await fetchChecklistsFromDb(basePath)
  } catch (error) {
    throw new Error(`Error fetching checklists: ${error}`)
  }
}

/**
 * Create a new checklist
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @param checklist Checklist data without id, createdAt, updatedAt
 * @returns Promise<CompanyChecklist> Created checklist
 */
export const createChecklist = async (
  companyId: string,
  siteId: string | undefined,
  subsiteId: string | undefined,
  checklist: Omit<CompanyChecklist, "id" | "createdAt" | "updatedAt">,
): Promise<CompanyChecklist> => {
  try {
    const basePath = getChecklistBasePath(companyId, siteId, subsiteId)
    return await createChecklistInDb(basePath, checklist)
  } catch (error) {
    throw new Error(`Error creating checklist: ${error}`)
  }
}

/**
 * Update an existing checklist
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @param checklistId Checklist ID
 * @param updates Partial checklist data to update
 * @returns Promise<void>
 */
export const updateChecklist = async (
  companyId: string,
  siteId: string | undefined,
  subsiteId: string | undefined,
  checklistId: string,
  updates: Partial<CompanyChecklist>,
): Promise<void> => {
  try {
    const basePath = getChecklistBasePath(companyId, siteId, subsiteId)
    await updateChecklistInDb(basePath, checklistId, updates)
  } catch (error) {
    throw new Error(`Error updating checklist: ${error}`)
  }
}

/**
 * Delete a checklist
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @param checklistId Checklist ID
 * @returns Promise<void>
 */
export const deleteChecklist = async (
  companyId: string,
  siteId: string | undefined,
  subsiteId: string | undefined,
  checklistId: string,
): Promise<void> => {
  try {
    const basePath = getChecklistBasePath(companyId, siteId, subsiteId)
    await deleteChecklistFromDb(basePath, checklistId)
  } catch (error) {
    throw new Error(`Error deleting checklist: ${error}`)
  }
}

// ========== COMPANY SETUP FUNCTIONS ==========

/**
 * Fetch company setup configuration
 * @param companyId Company ID
 * @returns Promise<CompanySetup | null> Company setup data or null
 */
export const fetchCompanySetup = async (companyId: string): Promise<CompanySetup | null> => {
  try {
    return await fetchCompanySetupFromDb(companyId)
  } catch (error) {
    throw new Error(`Error fetching company setup: ${error}`)
  }
}

/**
 * Save company setup configuration
 * @param companyId Company ID
 * @param setup Company setup data without id
 * @returns Promise<void>
 */
export const saveCompanySetup = async (
  companyId: string,
  setup: Omit<CompanySetup, "id">,
): Promise<void> => {
  try {
    await saveCompanySetupToDb(companyId, setup)
  } catch (error) {
    throw new Error(`Error saving company setup: ${error}`)
  }
}

// ========== USER PROFILE FUNCTIONS ==========

/**
 * Fetch user profile data
 * @param userId User ID
 * @returns Promise<UserProfile | null> User profile data or null
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    return await fetchUserProfileFromDb(userId)
  } catch (error) {
    throw new Error(`Error fetching user profile: ${error}`)
  }
}

/**
 * Update user profile data
 * @param userId User ID
 * @param updates Partial user profile data to update
 * @returns Promise<void>
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    await updateUserProfileInDb(userId, updates)
  } catch (error) {
    throw new Error(`Error updating user profile: ${error}`)
  }
}

// ========== COMPANY MESSAGES FUNCTIONS ==========

/**
 * Fetch all company messages
 * @param companyId Company ID
 * @returns Promise<CompanyMessage[]> Array of company messages
 */
export const fetchCompanyMessages = async (companyId: string): Promise<CompanyMessage[]> => {
  try {
    return await fetchCompanyMessagesFromDb(companyId)
  } catch (error) {
    throw new Error(`Error fetching company messages: ${error}`)
  }
}

/**
 * Create a new company message
 * @param companyId Company ID
 * @param message Message data without id, createdAt, updatedAt
 * @returns Promise<CompanyMessage> Created message
 */
export const createCompanyMessage = async (
  companyId: string,
  message: Omit<CompanyMessage, "id" | "createdAt" | "updatedAt">,
): Promise<CompanyMessage> => {
  try {
    return await createCompanyMessageInDb(companyId, message)
  } catch (error) {
    throw new Error(`Error creating company message: ${error}`)
  }
}

// ========== SITE INVITE FUNCTIONS ==========

/**
 * Create a new site invite
 * @param companyId Company ID
 * @param siteId Site ID
 * @param inviteData Invite data including email, role, department, and names
 * @returns Promise<string> Invite ID
 */
export const createSiteInvite = async (
  companyId: string,
  siteId: string,
  inviteData: {
    email: string
    role: string
    department: string
    invitedBy: string
    companyName: string
    siteName: string
    invitedByName: string
  },
): Promise<string> => {
  try {
    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const invite = {
      email: inviteData.email,
      companyID: companyId,
      companyName: inviteData.companyName,
      siteId,
      siteName: inviteData.siteName,
      role: inviteData.role,
      department: inviteData.department,
      invitedBy: inviteData.invitedBy,
      invitedByName: inviteData.invitedByName,
      invitedAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending' as const,
      code: inviteCode
    }
    
    return await createSiteInviteInDb(companyId, invite)
  } catch (error) {
    throw new Error(`Error creating site invite: ${error}`)
  }
}

/**
 * Get all site invites for a company
 * @param companyId Company ID
 * @returns Promise<any[]> Array of site invites
 */
export const getSiteInvites = async (companyId: string): Promise<any[]> => {
  try {
    return await getSiteInvitesFromDb(companyId)
  } catch (error) {
    throw new Error(`Error getting site invites: ${error}`)
  }
}

/**
 * Accept a site invite using invite code
 * @param inviteCode Unique invite code
 * @param userId User ID accepting the invite
 * @returns Promise<object> Result object with success status and details
 */
export const acceptSiteInvite = async (
  inviteCode: string,
  userId: string,
): Promise<{
  success: boolean
  message: string
  companyId?: string
  siteId?: string
}> => {
  try {
    // Get invite by code
    const invite = await getSiteInviteByCodeFromDb(inviteCode)
    
    if (!invite) {
      return { success: false, message: "Invalid invite code" }
    }
    
    if (invite.status !== 'pending') {
      return { success: false, message: "Invite has already been used" }
    }
    
    if (invite.expiresAt < Date.now()) {
      return { success: false, message: "Invite has expired" }
    }
    
    // Add user to company
    const companyData = {
      companyID: invite.companyID,
      companyName: invite.companyName,
      role: invite.role,
      department: invite.department,
      siteId: invite.siteId,
      siteName: invite.siteName,
      accessLevel: 'site' as const,
      joinedAt: Date.now(),
    }
    
    await linkUserAndCompanyAtomically(
      userId,
      invite.companyID,
      companyData,
      {
      role: invite.role,
      department: invite.department,
      joinedAt: Date.now(),
      },
    )
    
    // Set current company for the user so the app selects it immediately
    await setCurrentCompany(userId, invite.companyID)
    
    // Update invite status - only update allowed properties
    await updateSiteInviteInDb(invite.id, {
      status: 'accepted'
    })
    
    return {
      success: true,
      message: "Successfully joined company",
      companyId: invite.companyID,
      siteId: invite.siteId
    }
  } catch (error) {
    throw new Error(`Error accepting site invite: ${error}`)
  }
}

/**
 * Get site invite by invite code
 * @param code Invite code
 * @returns Promise<SiteInvite | null> Site invite data or null
 */
export const getSiteInviteByCode = async (code: string): Promise<SiteInvite | null> => {
  try {
    return await getSiteInviteByCodeFromDb(code)
  } catch (error) {
    throw new Error(`Error getting site invite by code: ${error}`)
  }
}

// ========== USER ↔ COMPANY FUNCTIONS ==========

export const addUserToCompany = async (userId: string, companyId: string, companyData: any): Promise<void> => {
  const companyUserData = {
    role: companyData?.role,
    department: companyData?.department,
    joinedAt: companyData?.joinedAt || Date.now(),
    email: companyData?.email || "",
    displayName: companyData?.displayName || "",
    employeeId: companyData?.employeeId,
    roleId: companyData?.roleId,
    siteId: companyData?.siteId || null,
    subsiteId: companyData?.subsiteId || null,
    employeePath: companyData?.employeePath,
  }
  await linkUserAndCompanyAtomically(userId, companyId, companyData, companyUserData)
}

export const getUserCompanies = async (
  uid: string,
): Promise<{ companyID: string; companyName: string; userPermission: string }[]> => {
  return await getUserCompaniesFromDb(uid)
}

// ========== EMPLOYEE INVITE (JOIN CODE) FUNCTIONS ==========

/**
 * Create a join code for an existing employee record.
 * The code is later accepted at /join?code=... by a signed-in user, which links
 * the user's UID to that employee and adds the company to the user's companies.
 */
export const createEmployeeJoinCode = async (
  companyId: string,
  siteId: string,
  employeeId: string,
  roleId?: string,
  expiresInDays: number = 7,
  subsiteId?: string,
): Promise<string> => {
  try {
    return await createEmployeeJoinCodeInDb({ companyId, siteId, subsiteId, employeeId, roleId, expiresInDays })
  } catch (error) {
    throw new Error(`Error creating employee join code: ${error}`)
  }
}

export const listEmployeeJoinCodes = async (
  companyId: string,
  employeeId?: string,
): Promise<Array<{ code: string; data: any }>> => {
  try {
    return await getEmployeeJoinCodesFromDb(companyId, employeeId)
  } catch (error) {
    throw new Error(`Error listing employee join codes: ${error}`)
  }
}

export const getEmployeeJoinCodeByCode = async (code: string): Promise<any | null> => {
  try {
    return await getEmployeeJoinCodeByCodeFromDb(code)
  } catch (error) {
    throw new Error(`Error getting employee join code: ${error}`)
  }
}

/**
 * Accept an employee invite using join code
 * Links the user to the employee record and adds them to the company
 */
export const acceptEmployeeInvite = async (
  inviteCode: string,
  userId: string,
): Promise<{
  success: boolean
  message: string
  companyId?: string
  siteId?: string
  subsiteId?: string
  employeeId?: string
}> => {
  try {
    // Get employee join code
    const joinCodeData = await getEmployeeJoinCodeByCodeFromDb(inviteCode)
    
    if (!joinCodeData) {
      return { success: false, message: "Invalid invite code" }
    }
    
    if (joinCodeData.used) {
      return { success: false, message: "Invite has already been used" }
    }
    
    if (joinCodeData.revoked) {
      return { success: false, message: "Invite has been revoked" }
    }
    
    if (joinCodeData.expiresAt && Date.now() > joinCodeData.expiresAt) {
      return { success: false, message: "Invite has expired" }
    }
    
    const { companyId, employeeId, roleId } = joinCodeData
    
    // Search for employee across ALL sites and subsites in the company
    const employeeSearch = await findEmployeeAcrossCompany(companyId, employeeId)
    
    if (!employeeSearch) {
      return { success: false, message: "Employee record not found in any site or subsite" }
    }

    const { employee, basePath, siteId: foundSiteId, subsiteId: foundSubsiteId } = employeeSearch
    
    // Use the found location (which may differ from invite data)
    const actualSiteId = foundSiteId || joinCodeData.siteId
    const actualSubsiteId = foundSubsiteId || joinCodeData.subsiteId
    const employeeFirstName = String(employee?.firstName || "").trim()
    const employeeLastName = String(employee?.lastName || "").trim()
    const employeeEmail = String(employee?.email || "").trim()
    const employeePhone = String(employee?.phone || "").trim()
    const employeeJobTitle = String(employee?.jobTitle || employee?.position || "").trim()
    const employeeDisplayName = `${employeeFirstName} ${employeeLastName}`.trim()
    
    // Check if user already has a role in this company (from /users/{userId}/companies/{companyId})
    // If the user's company role is "owner", it overrides HR. Otherwise use HR values.
    let existingCompanyRole: string | null = null
    try {
      const userCompanyRef = ref(db, `users/${userId}/companies/${companyId}`)
      const userCompanySnap = await get(userCompanyRef)
      if (userCompanySnap.exists()) {
        const userCompanyData = userCompanySnap.val()
        existingCompanyRole = userCompanyData.role || null
      }
    } catch {
      // ignore - user might not have existing company membership
    }
    
    // Get role name from HR data if roleId exists
    let hrRoleName: string | null = null
    if (roleId) {
      const roleRef = ref(db, `${basePath}/roles/${roleId}`)
      const roleSnapshot = await get(roleRef)
      if (roleSnapshot.exists()) {
        const roleData = roleSnapshot.val()
        hrRoleName = roleData.name || roleData.label || roleId
      }
    }
    // Also check if employee has role stored directly
    if (!hrRoleName) {
      hrRoleName = employee.role || employee.roleName || null
    }
    
    // Get department name from HR data
    let hrDepartmentName: string | null = null
    if (employee.departmentId) {
      const deptRef = ref(db, `${basePath}/departments/${employee.departmentId}`)
      const deptSnapshot = await get(deptRef)
      if (deptSnapshot.exists()) {
        const deptData = deptSnapshot.val()
        hrDepartmentName = deptData.name || deptData.label || employee.departmentId
      }
    }
    // Also check if employee has department stored directly
    if (!hrDepartmentName) {
      hrDepartmentName = employee.department || null
    }
    
    // Get company name
    const companyRef = ref(db, `companies/${companyId}`)
    const companySnapshot = await get(companyRef)
    const companyName = companySnapshot.exists() ? companySnapshot.val().companyName || "" : ""

    // Determine final role: if user's existing company role is "owner", override to "owner". Otherwise always use HR values.
    let finalRole: string
    const existingRoleLower = String(existingCompanyRole || "").trim().toLowerCase()
    if (existingRoleLower === "owner") {
      // Owner role from company overrides - always use "owner" if user already has owner role
      finalRole = "owner"
    } else {
      // Otherwise always use HR role value
      finalRole = hrRoleName || "staff"
    }
    
    // Always use HR department value (no override logic needed)
    const finalDepartment = hrDepartmentName || "front-of-house"
    
    // Get site name (using actual location)
    let siteName = ""
    if (actualSiteId) {
      try {
        const siteRef = ref(db, `companies/${companyId}/sites/${actualSiteId}`)
        const siteSnapshot = await get(siteRef)
        siteName = siteSnapshot.exists() ? siteSnapshot.val().name || "" : ""
      } catch {
        // ignore
      }
    }

    // Get subsite name (using actual location)
    let subsiteName = ""
    if (actualSubsiteId && actualSiteId) {
      try {
        const subsiteRef = ref(db, `companies/${companyId}/sites/${actualSiteId}/subsites/${actualSubsiteId}`)
        const subsiteSnapshot = await get(subsiteRef)
        subsiteName = subsiteSnapshot.exists() ? subsiteSnapshot.val().name || "" : ""
      } catch {
        // ignore
      }
    }
    
    // Update employee record to link userId (at resolved basePath)
    // IMPORTANT: never write undefined to RTDB.
    const employeeUpdate: Record<string, unknown> = {
      userId,
      updatedAt: Date.now(),
    }
    if (employeeEmail) employeeUpdate.email = employeeEmail
    // Employee records are encrypted server-side. Upsert via Cloud Functions.
    const latestEmployeeRes: any = await callCallableProxy("hrGetEmployee", { hrPath: basePath, employeeId })
    if (!latestEmployeeRes?.data?.employee) {
      return { success: false, message: "Employee record was removed before invite acceptance could complete" }
    }
    await callCallableProxy("hrUpsertEmployee", { hrPath: basePath, employeeId, employee: employeeUpdate })

    // Sync key employee data into the user's personal settings (so the app has a proper profile immediately)
    // This is non-destructive (partial update).
    await updatePersonalSettings(userId, {
      firstName: employeeFirstName,
      lastName: employeeLastName,
      email: employeeEmail,
      phone: employeePhone,
      jobTitle: employeeJobTitle,
    })
    
    // Add user to company with actual location where employee was found
    // IMPORTANT: never write undefined to RTDB.
    // Use HR role and department (owner overrides if role is owner)
    const companyData = {
      companyID: companyId,
      companyName: companyName,
      // Use HR role and department from employee record (this is what's displayed in settings)
      role: finalRole,
      department: finalDepartment,
      siteId: actualSiteId || null,
      siteName: siteName || null,
      subsiteId: actualSubsiteId || null,
      subsiteName: subsiteName || null,
      employeeId: employeeId,
      roleId: roleId || null,
      // Store the actual employee location path for easy loading
      employeePath: basePath,
      accessLevel: (actualSubsiteId ? 'subsite' : (actualSiteId ? 'site' : 'company')) as const,
      joinedAt: Date.now(),
    }
    
    // Mirror membership under company/users with actual location
    // Use HR role and department (owner overrides if role is owner)
    const companyUserData: {
      role?: string
      department?: string
      joinedAt?: number
      email?: string
      displayName?: string
      employeeId?: string
      roleId?: string
      siteId?: string
      subsiteId?: string
      employeePath?: string
    } = {
      role: finalRole,
      department: finalDepartment,
      joinedAt: Date.now(),
    }
    if (employeeEmail) companyUserData.email = employeeEmail
    if (employeeDisplayName) companyUserData.displayName = employeeDisplayName
    companyUserData.employeeId = employeeId
    companyUserData.siteId = actualSiteId || null
    if (actualSubsiteId) companyUserData.subsiteId = actualSubsiteId
    if (roleId) companyUserData.roleId = roleId
    companyUserData.employeePath = basePath
    await linkUserAndCompanyAtomically(userId, companyId, companyData, companyUserData)
    
    // Set current company for the user
    await setCurrentCompany(userId, companyId)
    
    // Update the join code with the actual location where employee was found and mark as used
    const joinCodeRef = ref(db, `joinCodes/${inviteCode}`)
    const joinCodeTxn = await runTransaction(joinCodeRef, (current: any) => {
      if (!current || current.used || current.revoked) return current
      if (current.expiresAt && Date.now() > current.expiresAt) return current
      return {
        ...current,
        actualSiteId: actualSiteId || null,
        actualSubsiteId: actualSubsiteId || null,
        actualEmployeePath: basePath,
        used: true,
        usedAt: Date.now(),
        usedBy: userId,
        updatedAt: Date.now(),
      }
    })
    if (!joinCodeTxn.committed || !joinCodeTxn.snapshot.exists() || !joinCodeTxn.snapshot.val()?.used) {
      return { success: false, message: "Invite became invalid while processing. Please retry with a new invite." }
    }
    
    return {
      success: true,
      message: "Successfully joined company as employee",
      companyId: companyId,
      siteId: actualSiteId || undefined,
      subsiteId: actualSubsiteId || undefined,
      employeeId: employeeId
    }
  } catch (error) {
    throw new Error(`Error accepting employee invite: ${error}`)
  }
}

export const revokeEmployeeJoinCode = async (code: string): Promise<void> => {
  try {
    await revokeEmployeeJoinCodeInDb(code)
  } catch (error) {
    throw new Error(`Error revoking employee join code: ${error}`)
  }
}

/**
 * Type utilities for fixing TypeScript errors in the company management components
 */

/**
 * Type-safe wrapper for setSiteDataConfig to avoid 'implicit any' errors
 * 
 * @param prevState Previous state object
 * @returns Updated state object
 */

export function updateSiteDataConfig(
  prevState: SiteDataConfigState, 
  moduleId: string, 
  sites: string[] | null, 
  subsites: string[] | null
): SiteDataConfigState {
  // Create a safe copy of the state
  const result = { ...prevState };
  
  // Safely update the module config using type assertion for the specific property
  const updatedConfig = {
    ...result,
    [moduleId]: {
      // Use type assertion to safely access dynamic properties
      sites: sites !== null ? sites : ((result as any)[moduleId]?.sites || []),
      subsites: subsites !== null ? subsites : ((result as any)[moduleId]?.subsites || []),
    }
  };
  
  return updatedConfig;
}

/**
 * Helper function to safely convert MUI Select's value to string array
 * 
 * @param value The value from MUI Select component
 * @returns String array representation
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return [];
}

// ========== CHECKLIST COMPLETION FUNCTIONS ==========

/**
 * Get the base path for checklist completions
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @returns Base path string
 */
const getChecklistCompletionsPath = (companyId: string, siteId?: string, subsiteId?: string): string => {
  if (subsiteId && siteId) {
    return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/checklistCompletions`
  }
  if (siteId) {
    return `companies/${companyId}/sites/${siteId}/checklistCompletions`
  }
  return `companies/${companyId}/checklistCompletions`
}

/**
 * Fetch checklist completions
 * @param companyId Company ID
 * @param siteId Optional site ID
 * @param subsiteId Optional subsite ID
 * @param checklistId Optional checklist ID to filter by
 * @returns Promise<ChecklistCompletion[]> Array of checklist completions
 */
export const fetchChecklistCompletions = async (
  companyId: string,
  siteId?: string,
  subsiteId?: string,
  checklistId?: string,
): Promise<ChecklistCompletion[]> => {
  try {
    const { db, ref, get } = await import("../services/Firebase")
    const MAX_SITES_SCAN = 100
    const MAX_SUBSITES_PER_SITE_SCAN = 200
    const MAX_COMPLETIONS_SCAN = 10000
    
    if (!siteId) {
      // If no siteID provided, fetch from all sites
      const sitesRef = ref(db, `companies/${companyId}/sites`)
      const sitesSnapshot = await get(sitesRef)

      if (!sitesSnapshot.exists()) {
        return []
      }

      const allCompletions: ChecklistCompletion[] = []
      const sitesData = sitesSnapshot.val()
      const siteKeys = Object.keys(sitesData || {})
      if (siteKeys.length > MAX_SITES_SCAN) {
        throw new Error(`Checklist completion query aborted: ${siteKeys.length} sites exceeds max scan of ${MAX_SITES_SCAN}`)
      }
      const assertNotTooMany = () => {
        if (allCompletions.length > MAX_COMPLETIONS_SCAN) {
          throw new Error(`Checklist completion query aborted: completion scan exceeded ${MAX_COMPLETIONS_SCAN} items`)
        }
      }

      // Iterate through all sites
      for (const currentSiteID of siteKeys) {
        // Fetch completions from site level
        const siteCompletionsRef = ref(db, `companies/${companyId}/sites/${currentSiteID}/checklistCompletions`)
        const siteCompletionsSnapshot = await get(siteCompletionsRef)

        if (siteCompletionsSnapshot.exists()) {
          const completionsData = siteCompletionsSnapshot.val()
          Object.keys(completionsData).forEach((cId) => {
            if (completionsData[cId]) {
              Object.keys(completionsData[cId]).forEach((completionId) => {
                allCompletions.push({
                  ...completionsData[cId][completionId],
                  id: completionId,
                  checklistId: cId,
                })
                assertNotTooMany()
              })
            }
          })
        }

        // Fetch completions from subsites
        const subsitesRef = ref(db, `companies/${companyId}/sites/${currentSiteID}/subsites`)
        const subsitesSnapshot = await get(subsitesRef)

        if (subsitesSnapshot.exists()) {
          const subsitesData = subsitesSnapshot.val()
          const subsiteKeys = Object.keys(subsitesData || {})
          if (subsiteKeys.length > MAX_SUBSITES_PER_SITE_SCAN) {
            throw new Error(
              `Checklist completion query aborted: site "${currentSiteID}" has ${subsiteKeys.length} subsites (max ${MAX_SUBSITES_PER_SITE_SCAN})`,
            )
          }

          for (const currentSubsiteID of subsiteKeys) {
            const subsiteCompletionsRef = ref(
              db,
              `companies/${companyId}/sites/${currentSiteID}/subsites/${currentSubsiteID}/checklistCompletions`,
            )
            const subsiteCompletionsSnapshot = await get(subsiteCompletionsRef)

            if (subsiteCompletionsSnapshot.exists()) {
              const completionsData = subsiteCompletionsSnapshot.val()
              Object.keys(completionsData).forEach((cId) => {
                if (completionsData[cId]) {
                  Object.keys(completionsData[cId]).forEach((completionId) => {
                    allCompletions.push({
                      ...completionsData[cId][completionId],
                      id: completionId,
                      checklistId: cId,
                    })
                    assertNotTooMany()
                  })
                }
              })
            }
          }
        }
      }

      return allCompletions
    }

    // Fetch from specific site/subsite
    const completionsPath = getChecklistCompletionsPath(companyId, siteId, subsiteId)
    const path = checklistId ? `${completionsPath}/${checklistId}` : completionsPath

    const completionsRef = ref(db, path)
    const snapshot = await get(completionsRef)

    if (snapshot.exists()) {
      const completionsData = snapshot.val()

      if (checklistId) {
        // Single checklist completions
        return Object.keys(completionsData).map((id) => ({
          ...completionsData[id],
          id,
          checklistId: checklistId,
        }))
      } else {
        // All completions
        // IMPORTANT: Support BOTH data shapes:
        // 1) Legacy (1Stop - App): checklistCompletions/{completionId} -> { checklistId, ... }
        // 2) Grouped-by-checklist: checklistCompletions/{checklistId}/{completionId} -> { ... }

        // Detect legacy flat shape by checking if values look like completion objects
        const firstKey = Object.keys(completionsData)[0]
        const firstVal = firstKey ? completionsData[firstKey] : null
        const looksLikeCompletion =
          firstVal &&
          typeof firstVal === "object" &&
          // completedAt is a strong signal for a completion record
          (typeof (firstVal as any).completedAt === "number" ||
            typeof (firstVal as any).checklistId === "string" ||
            typeof (firstVal as any).completedBy === "string")

        if (looksLikeCompletion) {
          // Legacy flat shape
          return Object.keys(completionsData).map((id) => ({
            id,
            ...(completionsData[id] as any),
          }))
        }

        // Grouped-by-checklist shape
        const allCompletions: ChecklistCompletion[] = []
        Object.keys(completionsData).forEach((cId) => {
          if (completionsData[cId]) {
            Object.keys(completionsData[cId]).forEach((completionId) => {
              allCompletions.push({
                ...completionsData[cId][completionId],
                id: completionId,
                checklistId: cId,
              })
            })
          }
        })
        return allCompletions
      }
    }

    return []
  } catch (error) {
    console.error("Error fetching checklist completions:", error)
    throw error
  }
}

// ========== CHECKLIST TYPES FUNCTIONS ==========

/**
 * Fetch checklist types/categories for a company
 * @param companyId Company ID
 * @returns Promise<string[]> Array of checklist category names
 */
export const fetchChecklistTypes = async (companyId: string): Promise<string[]> => {
  try {
    const { db, ref, get } = await import("../services/Firebase")
    const categoriesRef = ref(db, `companies/${companyId}/checklistCategories`)
    const snapshot = await get(categoriesRef)
    
    if (snapshot.exists()) {
      const categories = snapshot.val()
      return Array.isArray(categories) ? categories : Object.values(categories)
    }
    
    // Return default categories if none exist
    return ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]
  } catch (error) {
    console.error("Error fetching checklist categories:", error)
    return ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]
  }
}

/**
 * Save a custom checklist category for a company
 * @param companyId Company ID
 * @param category Checklist category name to add
 * @returns Promise<void>
 */
export const saveChecklistType = async (companyId: string, category: string): Promise<void> => {
  try {
    const { db, ref, get, set } = await import("../services/Firebase")
    const categoriesRef = ref(db, `companies/${companyId}/checklistCategories`)
    const snapshot = await get(categoriesRef)
    
    let categories: string[] = []
    if (snapshot.exists()) {
      const existingCategories = snapshot.val()
      categories = Array.isArray(existingCategories) ? existingCategories : Object.values(existingCategories)
    } else {
      // Initialize with default categories
      categories = ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]
    }
    
    // Add new category if it doesn't exist
    if (!categories.includes(category)) {
      categories.push(category)
      await set(categoriesRef, categories)
    }
  } catch (error) {
    console.error("Error saving checklist category:", error)
    throw error
  }
}

/**
 * Delete a custom checklist category for a company
 * @param companyId Company ID
 * @param category Checklist category name to delete
 * @returns Promise<void>
 */
export const deleteChecklistType = async (companyId: string, category: string): Promise<void> => {
  try {
    const { db, ref, get, set } = await import("../services/Firebase")
    const defaultCategories = ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]
    if (defaultCategories.includes(category)) {
      throw new Error("Cannot delete default checklist categories")
    }
    
    const categoriesRef = ref(db, `companies/${companyId}/checklistCategories`)
    const snapshot = await get(categoriesRef)
    
    if (snapshot.exists()) {
      const existingCategories = snapshot.val()
      const categories = Array.isArray(existingCategories) ? existingCategories : Object.values(existingCategories)
      const filteredCategories = categories.filter((c: string) => c !== category)
      await set(categoriesRef, filteredCategories)
    }
  } catch (error) {
    console.error("Error deleting checklist category:", error)
    throw error
  }
}
