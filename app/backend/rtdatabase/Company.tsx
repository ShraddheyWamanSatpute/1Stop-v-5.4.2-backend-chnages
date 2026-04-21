import { db, ref, push, set, get, remove, update } from "../services/Firebase";
import { debugVerbose } from "../utils/debugLog";
import type {
  CompanySetup,
  CompanyMessage,
  UserProfile,
  CompanyChecklist,
  ChecklistCompletion,
  Site,
  Subsite,
  SiteInvite,
  ExtendedCompany} from "../interfaces/Company";

const assertValidPermissionsPayload = (permissions: unknown, context: string): void => {
  const isObject = permissions !== null && typeof permissions === "object" && !Array.isArray(permissions)
  if (!isObject) {
    throw new Error(`${context} must be a plain object`)
  }
}

// ========== FIREBASE DATABASE OPERATIONS FOR COMPANY ==========

// ===== COMPANY MANAGEMENT DATABASE FUNCTIONS =====

/**
 * Create company in database
 * @param companyData Company data
 * @returns Company ID
 */
export const createCompanyInDb = async (companyData: Omit<ExtendedCompany, 'companyID'>): Promise<string> => {
  try {
    const companiesRef = ref(db, 'companies');
    const newCompanyRef = push(companiesRef);
    const companyId = newCompanyRef.key!;
    
    const companyWithId = {
      ...companyData,
      companyID: companyId,
    };
    
    await set(newCompanyRef, companyWithId);
    return companyId;
  } catch (error) {
    throw new Error(`Error creating company: ${error}`);
  }
};

/**
 * Update company in database
 * @param companyId Company ID
 * @param updates Company updates
 */
export const updateCompanyInDb = async (companyId: string, updates: Partial<ExtendedCompany>): Promise<void> => {
  try {
    const companyRef = ref(db, `companies/${companyId}`);
    await update(companyRef, { ...updates, updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating company: ${error}`);
  }
};

/**
 * Get company from database
 * @param companyId Company ID
 * @returns Company data or null
 */
export const getCompanyFromDb = async (companyId: string): Promise<ExtendedCompany | null> => {
  try {
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as ExtendedCompany;
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching company: ${error}`);
  }
};

/**
 * Delete company from database
 * @param companyId Company ID
 */
export const deleteCompanyFromDb = async (companyId: string): Promise<void> => {
  try {
    const companyRef = ref(db, `companies/${companyId}`);
    await remove(companyRef);
  } catch (error) {
    throw new Error(`Error deleting company: ${error}`);
  }
};

// ===== PERMISSION MANAGEMENT DATABASE FUNCTIONS =====

/**
 * Initialize company permissions in database
 * @param companyId Company ID
 */
export const initializePermissionsInDb = async (companyId: string): Promise<void> => {
  try {
    const permissionsRef = ref(db, `companies/${companyId}/permissions`);
    const defaultPermissions = {
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
    };
    await set(permissionsRef, defaultPermissions);
  } catch (error) {
    throw new Error(`Error initializing permissions: ${error}`);
  }
};

/**
 * Update role permissions in database
 * @param companyId Company ID
 * @param role Role name
 * @param permissions Permission array
 */
export const updateRolePermissionsInDb = async (companyId: string, role: string, permissions: unknown): Promise<void> => {
  try {
    assertValidPermissionsPayload(permissions, "Role permissions")
    const roleRef = ref(db, `companies/${companyId}/permissions/roles/${role}`);
    await set(roleRef, permissions);
  } catch (error) {
    throw new Error(`Error updating role permissions: ${error}`);
  }
};

/**
 * Update department permissions in database
 * @param companyId Company ID
 * @param department Department name
 * @param permissions Permission array
 */
export const updateDepartmentPermissionsInDb = async (companyId: string, department: string, permissions: unknown): Promise<void> => {
  try {
    assertValidPermissionsPayload(permissions, "Department permissions")
    const deptRef = ref(db, `companies/${companyId}/permissions/departments/${department}`);
    await set(deptRef, permissions);
  } catch (error) {
    throw new Error(`Error updating department permissions: ${error}`);
  }
};

/**
 * Update user permissions in database
 * @param companyId Company ID
 * @param userId User ID
 * @param permissions Permission object (UserPermissions) or legacy boolean array
 */
export const updateUserPermissionsInDb = async (companyId: string, userId: string, permissions: unknown): Promise<void> => {
  try {
    assertValidPermissionsPayload(permissions, "User permissions")
    const userRef = ref(db, `companies/${companyId}/permissions/users/${userId}`);
    await set(userRef, permissions);
  } catch (error) {
    throw new Error(`Error updating user permissions: ${error}`);
  }
};

/**
 * Update employee permissions override in database (separate from users)
 */
export const updateEmployeePermissionsInDb = async (
  companyId: string,
  employeeId: string,
  permissions: unknown,
): Promise<void> => {
  try {
    assertValidPermissionsPayload(permissions, "Employee permissions")
    const empRef = ref(db, `companies/${companyId}/permissions/employees/${employeeId}`);
    await set(empRef, permissions);
  } catch (error) {
    throw new Error(`Error updating employee permissions: ${error}`);
  }
};

/**
 * Get permissions from database
 * @param companyId Company ID
 * @returns Permissions data
 */
export const getPermissionsFromDb = async (companyId: string): Promise<any> => {
  try {
    const permissionsRef = ref(db, `companies/${companyId}/permissions`);
    const snapshot = await get(permissionsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching permissions: ${error}`);
  }
};

/**
 * Update default role for a company permissions config
 */
export const updateDefaultRoleInDb = async (companyId: string, defaultRole: string): Promise<void> => {
  try {
    const defaultRoleRef = ref(db, `companies/${companyId}/permissions/defaultRole`);
    await set(defaultRoleRef, defaultRole);
  } catch (error) {
    throw new Error(`Error updating default role: ${error}`);
  }
};

/**
 * Update default department for a company permissions config
 */
export const updateDefaultDepartmentInDb = async (companyId: string, defaultDepartment: string): Promise<void> => {
  try {
    const defaultDeptRef = ref(db, `companies/${companyId}/permissions/defaultDepartment`);
    await set(defaultDeptRef, defaultDepartment);
  } catch (error) {
    throw new Error(`Error updating default department: ${error}`);
  }
};

/**
 * Update global default permissions (independent of role/department)
 */
export const updateDefaultPermissionsInDb = async (
  companyId: string,
  defaultPermissions: unknown,
): Promise<void> => {
  try {
    if (defaultPermissions !== undefined && defaultPermissions !== null) {
      assertValidPermissionsPayload(defaultPermissions, "Default permissions")
    }
    const pRef = ref(db, `companies/${companyId}/permissions/defaultPermissions`);
    await set(pRef, defaultPermissions || { modules: {} });
  } catch (error) {
    throw new Error(`Error updating default permissions: ${error}`);
  }
};

/**
 * Enable/disable a department permissions profile
 */
export const updateDepartmentPermissionsActiveInDb = async (
  companyId: string,
  departmentKey: string,
  active: boolean
): Promise<void> => {
  try {
    const activeRef = ref(db, `companies/${companyId}/permissions/departmentsMeta/${departmentKey}/active`);
    await set(activeRef, active);
  } catch (error) {
    throw new Error(`Error updating department permissions active: ${error}`);
  }
};

/**
 * Enable/disable a role permissions profile
 */
export const updateRolePermissionsActiveInDb = async (
  companyId: string,
  roleKey: string,
  active: boolean
): Promise<void> => {
  try {
    const activeRef = ref(db, `companies/${companyId}/permissions/rolesMeta/${roleKey}/active`);
    await set(activeRef, active);
  } catch (error) {
    throw new Error(`Error updating role permissions active: ${error}`);
  }
};

/**
 * Enable/disable a user override profile
 */
export const updateUserPermissionsActiveInDb = async (
  companyId: string,
  userId: string,
  active: boolean
): Promise<void> => {
  try {
    const activeRef = ref(db, `companies/${companyId}/permissions/usersMeta/${userId}/active`);
    await set(activeRef, active);
  } catch (error) {
    throw new Error(`Error updating user permissions active: ${error}`);
  }
};

/**
 * Enable/disable an employee override profile
 */
export const updateEmployeePermissionsActiveInDb = async (
  companyId: string,
  employeeId: string,
  active: boolean
): Promise<void> => {
  try {
    const activeRef = ref(db, `companies/${companyId}/permissions/employeesMeta/${employeeId}/active`);
    await set(activeRef, active);
  } catch (error) {
    throw new Error(`Error updating employee permissions active: ${error}`);
  }
};

// ===== CONFIGURATION MANAGEMENT DATABASE FUNCTIONS =====

/**
 * Initialize company configuration in database
 * @param companyId Company ID
 */
export const initializeConfigInDb = async (companyId: string): Promise<void> => {
  try {
    const configRef = ref(db, `companies/${companyId}/config`);
    const defaultConfig: string[] = [];
    await set(configRef, defaultConfig);
  } catch (error) {
    throw new Error(`Error initializing config: ${error}`);
  }
};

/**
 * Update company config in database
 * @param companyId Company ID
 * @param config Configuration array
 */
export const updateCompanyConfigInDb = async (companyId: string, config: string[]): Promise<void> => {
  try {
    const configRef = ref(db, `companies/${companyId}/config`);
    await set(configRef, config);
  } catch (error) {
    throw new Error(`Error updating company config: ${error}`);
  }
};

/**
 * Update site config in database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param config Configuration array
 */
export const updateSiteConfigInDb = async (companyId: string, siteId: string, config: string[]): Promise<void> => {
  try {
    const configRef = ref(db, `companies/${companyId}/sites/${siteId}/config`);
    await set(configRef, config);
  } catch (error) {
    throw new Error(`Error updating site config: ${error}`);
  }
};

/**
 * Update subsite config in database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @param config Configuration array
 */
export const updateSubsiteConfigInDb = async (companyId: string, siteId: string, subsiteId: string, config: string[]): Promise<void> => {
  try {
    const configRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/config`);
    await set(configRef, config);
  } catch (error) {
    throw new Error(`Error updating subsite config: ${error}`);
  }
};

/**
 * Get config from database
 * @param companyId Company ID
 * @returns Configuration data
 */
export const getConfigFromDb = async (companyId: string): Promise<any> => {
  try {
    const configRef = ref(db, `companies/${companyId}/config`);
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching config: ${error}`);
  }
};

// ===== SITE MANAGEMENT DATABASE FUNCTIONS =====

/**
 * Create site in database
 * @param companyId Company ID
 * @param siteData Site data
 * @returns Site ID
 */
export const createSiteInDb = async (companyId: string, siteData: Omit<Site, 'siteID' | 'companyID'>): Promise<string> => {
  try {
    const sitesRef = ref(db, `companies/${companyId}/sites`);
    const newSiteRef = push(sitesRef);
    const siteId = newSiteRef.key!;
    
    const siteWithId = {
      ...siteData,
      siteID: siteId,
      companyID: companyId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await set(newSiteRef, siteWithId);
    return siteId;
  } catch (error) {
    throw new Error(`Error creating site: ${error}`);
  }
};

/**
 * Update site in database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param updates Site updates
 */
export const updateSiteInDb = async (companyId: string, siteId: string, updates: Partial<Site>): Promise<void> => {
  try {
    const siteRef = ref(db, `companies/${companyId}/sites/${siteId}`);
    // If dataManagement is being updated, ensure it has the correct structure
    if (updates.dataManagement) {
      updates.dataManagement = {
        accessibleModules: updates.dataManagement.accessibleModules || {},
        accessibleSites: updates.dataManagement.accessibleSites || [],
        accessibleSubsites: updates.dataManagement.accessibleSubsites || []
      };
    }
    await update(siteRef, { ...updates, updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating site: ${error}`);
  }
};

/**
 * Delete site from database
 * @param companyId Company ID
 * @param siteId Site ID
 */
export const deleteSiteFromDb = async (companyId: string, siteId: string): Promise<void> => {
  try {
    const siteRef = ref(db, `companies/${companyId}/sites/${siteId}`);
    await remove(siteRef);

    // Verify deletion actually took effect (rules/network issues can otherwise look like "it worked")
    const after = await get(siteRef)
    if (after.exists()) {
      throw new Error("Delete did not persist (site still exists after remove)")
    }
    invalidateSitesCache(companyId)
  } catch (error) {
    throw new Error(`Error deleting site: ${error}`);
  }
};

/**
 * Get sites from database
 * @param companyId Company ID
 * @returns Array of sites
 */
// Cache for sites to avoid redundant Firebase calls
// Using Map (in-memory) instead of localStorage to avoid quota issues
const sitesCache = new Map<string, { data: Site[], timestamp: number }>();
const SITES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const filterValidSites = (sites: Site[]): Site[] =>
  (sites || []).filter((site: Site) => {
    const siteName = site.name || (site as any).siteName || ''
    return siteName.trim().length > 0
  })
const normalizeSiteShape = (site: Site): Site => {
  const normalizedName = (site as any).name || (site as any).siteName || ""
  const normalizedDescription = (site as any).description || (site as any).siteDescription || ""
  return {
    ...site,
    name: normalizedName,
    description: normalizedDescription,
  } as Site
}
const normalizeAndFilterSites = (sites: Site[]): Site[] => filterValidSites((sites || []).map(normalizeSiteShape))

// Allow callers (e.g., after mutations) to invalidate in-memory sites cache so UI doesn't resurrect stale data
export const invalidateSitesCache = (companyId?: string): void => {
  if (!companyId) {
    sitesCache.clear()
    return
  }
  sitesCache.delete(companyId)
}

// Clear cache periodically to prevent memory issues
if (typeof window !== 'undefined') {
  const cleanupKey = "__companySitesCacheCleanupInterval__"
  const globalScope = globalThis as typeof globalThis & { [cleanupKey]?: ReturnType<typeof setInterval> }
  if (!globalScope[cleanupKey]) {
    globalScope[cleanupKey] = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sitesCache.entries()) {
      if (now - value.timestamp > SITES_CACHE_TTL * 2) {
        sitesCache.delete(key);
      }
    }
    }, 10 * 60 * 1000); // Clean every 10 minutes
  }
}

/**
 * OPTIMIZED: Fetch sites with minimal data first, then lazy-load full data
 * This prevents fetching massive nested objects (subsites, data, etc.) on initial load
 */
export const getSitesFromDb = async (
  companyId: string,
  _shallow: boolean = true,
  options?: { bypassCache?: boolean },
): Promise<Site[]> => {
  try {
    const bypassCache = options?.bypassCache === true

    // STEP 1: Check SessionPersistence cache first (fastest, persists across page reloads)
    // BUT only use it if sites have subsites (new cache format)
    if (!bypassCache && typeof window !== 'undefined') {
      try {
        const { SessionPersistence } = await import('../../frontend/utils/sessionPersistence');
        const sessionCached = SessionPersistence.getCachedSites(companyId);
        if (sessionCached && sessionCached.length > 0) {
          const validCachedSites = normalizeAndFilterSites(sessionCached);
          
          // Validate that cached sites have subsites (new cache format)
          // If they don't have subsites, they're from old cache and we should skip them
          const hasSubsites = validCachedSites.some(site => site.subsites && Object.keys(site.subsites || {}).length > 0);
          
          if (hasSubsites && validCachedSites.length > 0) {
            // Also update in-memory cache for faster subsequent calls
            sitesCache.set(companyId, { data: validCachedSites, timestamp: Date.now() });
            return validCachedSites;
          } else {
            // Old cache format without subsites or all sites were empty - skip it and fetch from Firebase
          }
        }
      } catch (e) {
        // SessionPersistence not available, continue to in-memory cache
      }
    }
    
    // STEP 2: Check in-memory cache (fast, but lost on page reload)
    const cached = sitesCache.get(companyId);
    if (!bypassCache && cached && Date.now() - cached.timestamp < SITES_CACHE_TTL) {
      const validCachedSites = normalizeAndFilterSites(cached.data);
      if (validCachedSites.length > 0) {
        if (validCachedSites.length !== cached.data.length) {
          sitesCache.set(companyId, { data: validCachedSites, timestamp: Date.now() });
        }
        return validCachedSites;
      }
      // If all cached sites were empty, continue to fetch from Firebase
    }
    
    // CRITICAL OPTIMIZATION: Firebase Realtime Database downloads ENTIRE nested objects
    // When fetching `companies/companyId/sites`, it downloads ALL subsites, teams, data, etc.
    // This can be MBs of data even for a few sites!
    
    // SOLUTION: Fetch only site-level fields, exclude nested children
    // We'll use a workaround: fetch each site individually with only top-level fields
    // OR restructure to fetch minimal data
    
    // Try to get site IDs first (if we had shallow query support)
    // For now, fetch all but only process minimal fields
    const sitesRef = ref(db, `companies/${companyId}/sites`);
    // const startTime = performance.now(); // Unused - commented out performance metric
    const snapshot = await get(sitesRef);
    // const fetchTime = performance.now() - startTime; // Unused performance metric
    
    if (snapshot.exists()) {
      const sitesData = snapshot.val();
      // const processStartTime = performance.now(); // Unused - commented out performance metric
      
      // CRITICAL OPTIMIZATION: Extract minimal data but keep subsites (needed for SubsiteDropdown)
      // Include subsites but only with minimal fields (ID, name) - exclude other nested data
      const rawSites = Object.entries(sitesData)
        .map(([siteId, data]: [string, any]) => {
          const minimalSite: any = {
            siteID: siteId,
            companyID: companyId,
            // Back-compat: older data may store siteName/siteDescription
            name: data.name || data.siteName || '',
            description: data.description || data.siteDescription || '',
            address: data.address || {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: ''
            },
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now(),
          };
          
          // Include subsites but only with minimal data (ID and name)
          // This is needed for SubsiteDropdown to work
          if (data.subsites && typeof data.subsites === 'object') {
            const minimalSubsites: Record<string, any> = {};
            Object.entries(data.subsites).forEach(([subsiteId, subsiteData]: [string, any]) => {
              if (subsiteData && typeof subsiteData === 'object') {
                // Only include essential subsite fields
                minimalSubsites[subsiteId] = {
                  subsiteID: subsiteId,
                  // Back-compat: older data may store subsiteName/subsiteDescription
                  name: subsiteData.name || subsiteData.subsiteName || '',
                  description: subsiteData.description || subsiteData.subsiteDescription || '',
                  location: subsiteData.location || '',
                  // Exclude address, data, teams, and other heavy nested objects
                };
              }
            });
            if (Object.keys(minimalSubsites).length > 0) {
              minimalSite.subsites = minimalSubsites;
            }
          }
          
          // Explicitly exclude: teams, data, and other heavy nested structures
          // They'll be loaded on-demand when needed
          
          return minimalSite as Site;
        })
      const sites = normalizeAndFilterSites(rawSites);
      
      // const processTime = performance.now() - processStartTime; // Unused performance metric
      
      // Cache the result
      sitesCache.set(companyId, { data: sites, timestamp: Date.now() });
      
      return sites;
    }
    
    // Cache empty result too to avoid repeated queries
    sitesCache.set(companyId, { data: [], timestamp: Date.now() });
    return [];
  } catch (error) {
    console.error(`❌ Error fetching sites for ${companyId}:`, error);
    // Return cached data even if expired on error - better UX than failing
    const cached = sitesCache.get(companyId);
    if (cached) {
      return normalizeAndFilterSites(cached.data);
    }
    // If no cache and error, return empty array instead of throwing
    return [];
  }
};

// ===== SUBSITE MANAGEMENT DATABASE FUNCTIONS =====

/**
 * Create subsite in database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteData Subsite data
 * @returns Subsite ID
 */
export const createSubsiteInDb = async (companyId: string, siteId: string, subsiteData: Omit<Subsite, 'subsiteID'>): Promise<string> => {
  try {
    const subsitesRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites`);
    const newSubsiteRef = push(subsitesRef);
    const subsiteId = newSubsiteRef.key!;
    
    const subsiteWithId = {
      ...subsiteData,
      subsiteID: subsiteId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await set(newSubsiteRef, subsiteWithId);
    return subsiteId;
  } catch (error) {
    throw new Error(`Error creating subsite: ${error}`);
  }
};

/**
 * Update subsite in database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @param updates Subsite updates
 */
export const updateSubsiteInDb = async (companyId: string, siteId: string, subsiteId: string, updates: Partial<Subsite>): Promise<void> => {
  try {
    const subsiteRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`);
    // If dataManagement is being updated, ensure it has the correct structure
    if (updates.dataManagement) {
      updates.dataManagement = {
        accessibleModules: updates.dataManagement.accessibleModules || {},
        accessibleSites: updates.dataManagement.accessibleSites || [],
        accessibleSubsites: updates.dataManagement.accessibleSubsites || []
      };
    }
    await update(subsiteRef, { ...updates, updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating subsite: ${error}`);
  }
};

/**
 * Get subsite from database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 * @returns Subsite data or null
 */
export const getSubsiteFromDb = async (companyId: string, siteId: string, subsiteId: string): Promise<Subsite | null> => {
  try {
    const subsiteRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`);
    const snapshot = await get(subsiteRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Subsite;
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching subsite: ${error}`);
  }
};

/**
 * Delete subsite from database
 * @param companyId Company ID
 * @param siteId Site ID
 * @param subsiteId Subsite ID
 */
export const deleteSubsiteFromDb = async (companyId: string, siteId: string, subsiteId: string): Promise<void> => {
  try {
    const subsiteRef = ref(db, `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}`);
    await remove(subsiteRef);

    // Verify deletion actually took effect
    const after = await get(subsiteRef)
    if (after.exists()) {
      throw new Error("Delete did not persist (subsite still exists after remove)")
    }
    invalidateSitesCache(companyId)
  } catch (error) {
    throw new Error(`Error deleting subsite: ${error}`);
  }
};

// ===== CHECKLIST DATABASE FUNCTIONS =====

/**
 * Fetch checklists from database
 * @param basePath Base path for checklists
 * @returns Array of checklists
 */
export const fetchChecklistsFromDb = async (basePath: string): Promise<CompanyChecklist[]> => {
  try {
    const checklistsRef = ref(db, `${basePath}/checklists`);
    const snapshot = await get(checklistsRef);
    
    if (snapshot.exists()) {
      const checklistsData = snapshot.val();
      return Object.entries(checklistsData).map(([id, data]) => ({
        id,
        ...(data as Omit<CompanyChecklist, 'id'>)
      }));
    }
    return [];
  } catch (error) {
    throw new Error(`Error fetching checklists: ${error}`);
  }
};

/**
 * RTDB does not allow `undefined` anywhere in values passed to set()/update().
 * - For objects: omit keys with undefined values
 * - For arrays: convert undefined entries to null (keeps indices stable)
 */
const sanitizeForRtdb = (value: any): any => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map((v) => {
      const cleaned = sanitizeForRtdb(v)
      return cleaned === undefined ? null : cleaned
    })
  }
  if (typeof value === "object") {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      const cleaned = sanitizeForRtdb(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out
  }
  return value
}

/**
 * Create checklist in database
 * @param basePath Base path for checklist
 * @param checklist Checklist data
 * @returns Checklist with ID
 */
export const createChecklistInDb = async (basePath: string, checklist: Omit<CompanyChecklist, "id" | "createdAt" | "updatedAt">): Promise<CompanyChecklist> => {
  try {
    const checklistsRef = ref(db, `${basePath}/checklists`);
    const newChecklistRef = push(checklistsRef);
    const checklistId = newChecklistRef.key!;
    
    const checklistWithId = {
      ...checklist,
      id: checklistId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const sanitized = sanitizeForRtdb(checklistWithId)
    await set(newChecklistRef, sanitized);
    return sanitized as CompanyChecklist;
  } catch (error) {
    throw new Error(`Error creating checklist: ${error}`);
  }
};

/**
 * Update checklist in database
 * @param basePath Base path for checklist
 * @param checklistId Checklist ID
 * @param updates Checklist updates
 */
export const updateChecklistInDb = async (basePath: string, checklistId: string, updates: Partial<CompanyChecklist>): Promise<void> => {
  try {
    const checklistRef = ref(db, `${basePath}/checklists/${checklistId}`);
    const sanitized = sanitizeForRtdb({ ...updates, updatedAt: Date.now() })
    await update(checklistRef, sanitized);
  } catch (error) {
    throw new Error(`Error updating checklist: ${error}`);
  }
};

/**
 * Delete checklist from database
 * @param basePath Base path for checklist
 * @param checklistId Checklist ID
 */
export const deleteChecklistFromDb = async (basePath: string, checklistId: string): Promise<void> => {
  try {
    const checklistRef = ref(db, `${basePath}/checklists/${checklistId}`);
    await remove(checklistRef);
  } catch (error) {
    throw new Error(`Error deleting checklist: ${error}`);
  }
};

// ===== CHECKLIST COMPLETION DATABASE FUNCTIONS =====

/**
 * Fetch checklist completions from database
 * @param completionsPath Path for completions
 * @returns Array of completions
 */
export const fetchChecklistCompletionsFromDb = async (completionsPath: string): Promise<ChecklistCompletion[]> => {
  try {
    const completionsRef = ref(db, completionsPath);
    const snapshot = await get(completionsRef);
    
    if (snapshot.exists()) {
      const completionsData = snapshot.val();
      
      // IMPORTANT: Support BOTH data shapes:
      // 1) Legacy (1Stop - App): checklistCompletions/{completionId} -> { checklistId, responses, ... }
      // 2) Grouped-by-checklist: checklistCompletions/{checklistId}/{completionId} -> { responses, ... }

      // Detect legacy flat shape by checking if values look like completion objects
      const firstKey = Object.keys(completionsData)[0];
      const firstVal = firstKey ? completionsData[firstKey] : null;
      const looksLikeCompletion =
        firstVal &&
        typeof firstVal === "object" &&
        // completedAt is a strong signal for a completion record
        (typeof (firstVal as any).completedAt === "number" ||
          typeof (firstVal as any).checklistId === "string" ||
          typeof (firstVal as any).completedBy === "string");

      if (looksLikeCompletion) {
        // Legacy flat shape: checklistCompletions/{completionId} -> { checklistId, responses, ... }
        return Object.keys(completionsData).map((id) => {
          const completion = completionsData[id] as any;
          return {
            id,
            ...completion,
            // Ensure responses field is preserved (may be stored as 'responses', 'fields', or 'items')
            responses: completion.responses || completion.fields || completion.items || {},
          };
        });
      }

      // Grouped-by-checklist shape: checklistCompletions/{checklistId}/{completionId} -> { responses, ... }
      const allCompletions: ChecklistCompletion[] = [];
      Object.keys(completionsData).forEach((cId) => {
        const checklistCompletions = completionsData[cId];
        if (checklistCompletions && typeof checklistCompletions === "object") {
          Object.keys(checklistCompletions).forEach((completionId) => {
            // Skip if this looks like a field name rather than a completion ID
            // Completion IDs are typically Firebase push IDs (start with '-' and are long)
            // Field names like "responses", "status", etc. are short strings
            if (completionId === "responses" || completionId === "status" || completionId === "completedAt" || 
                completionId === "completedBy" || completionId === "overallNotes" || completionId === "signature" ||
                completionId.length < 10) {
              // This is likely a field name, not a completion ID - skip it
              return;
            }
            
            const completionData = checklistCompletions[completionId];
            // Validate that this is actually completion data (has completedAt or completedBy)
            if (completionData && typeof completionData === "object" && 
                (typeof completionData.completedAt === "number" || typeof completionData.completedBy === "string")) {
              allCompletions.push({
                ...completionData,
                id: completionId,
                checklistId: cId,
                // Ensure responses field is preserved (may be stored as 'responses', 'fields', or 'items')
                responses: completionData.responses || completionData.fields || completionData.items || {},
              });
            }
          });
        }
      });
      return allCompletions;
    }
    return [];
  } catch (error) {
    console.error("Error fetching checklist completions:", error);
    throw error;
  }
};

/**
 * Create checklist completion in database
 * @param completionsPath Path for completions (e.g., companies/{id}/sites/{id}/checklistCompletions)
 * @param completion Completion data (must include checklistId)
 * @returns Completion with ID
 */
export const createChecklistCompletionInDb = async (completionsPath: string, completion: Omit<ChecklistCompletion, "id">): Promise<ChecklistCompletion> => {
  try {
    // Save under checklistId path: completionsPath/{checklistId}/{completionId}
    // This matches the grouped structure that fetchChecklistCompletionsFromDb expects
    const checklistId = completion.checklistId;
    if (!checklistId) {
      throw new Error("checklistId is required in completion data");
    }
    
    const fullPath = `${completionsPath}/${checklistId}`;
    debugVerbose("createChecklistCompletionInDb: saving", {
      path: fullPath,
      checklistId: completion.checklistId,
      completedBy: completion.completedBy,
      status: completion.status,
      completedAt: completion.completedAt ? new Date(completion.completedAt).toLocaleString() : "N/A",
      scheduledFor: completion.scheduledFor ? new Date(completion.scheduledFor).toLocaleString() : "N/A",
    });

    const checklistCompletionsRef = ref(db, fullPath);
    const newCompletionRef = push(checklistCompletionsRef);
    const completionId = newCompletionRef.key!;

    // Save the completion data (including checklistId for backward compatibility and easier querying)
    // The checklistId is also in the path, but we keep it in the data for easier access
    const sanitizedCompletion = sanitizeForRtdb(completion)
    await set(newCompletionRef, sanitizedCompletion);

    debugVerbose("createChecklistCompletionInDb: saved", { completionId, path: `${fullPath}/${completionId}` });
    
    // Return the completion with id
    return {
      ...(sanitizedCompletion as Omit<ChecklistCompletion, "id">),
      id: completionId,
    };
  } catch (error) {
    console.error(`ERROR - createChecklistCompletionInDb: Error saving completion:`, error);
    throw new Error(`Error creating checklist completion: ${error}`);
  }
};

/**
 * Delete checklist completion from database.
 * Supports both:
 * - Legacy flat shape: checklistCompletions/{completionId}
 * - Grouped shape: checklistCompletions/{checklistId}/{completionId}
 */
export const deleteChecklistCompletionFromDb = async (
  completionsPath: string,
  checklistId: string,
  completionId: string,
): Promise<void> => {
  if (!completionsPath || !completionId) {
    throw new Error("completionsPath and completionId are required")
  }
  try {
    const groupedRef = ref(db, `${completionsPath}/${checklistId}/${completionId}`)
    await remove(groupedRef)
  } catch (error) {
    // If grouped delete fails, try legacy flat shape as a fallback.
    try {
      const legacyRef = ref(db, `${completionsPath}/${completionId}`)
      await remove(legacyRef)
    } catch (error2) {
      throw new Error(`Error deleting checklist completion: ${error2}`)
    }
  }
};

// ===== COMPANY SETUP DATABASE FUNCTIONS =====

/**
 * Fetch company setup from database
 * @param companyId Company ID
 * @returns Company setup data
 */
export const fetchCompanySetupFromDb = async (companyId: string): Promise<CompanySetup | null> => {
  try {
    const setupRef = ref(db, `companies/${companyId}/setup`);
    const snapshot = await get(setupRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as CompanySetup;
    }

    // Fallback: some flows create companies without a `setup` node.
    // Build a minimal CompanySetup object from the main company record so UI like
    // `/Company/Info` can still show the correct company type (e.g. supplier).
    const companyRef = ref(db, `companies/${companyId}`)
    const companySnap = await get(companyRef)
    if (!companySnap.exists()) return null

    const c: any = companySnap.val() || {}

    const safeParseIso = (iso: unknown): number | null => {
      if (typeof iso !== "string") return null
      const ms = Date.parse(iso)
      return Number.isFinite(ms) ? ms : null
    }

    const createdAt =
      (typeof c.createdAt === "number" ? c.createdAt : null) ??
      safeParseIso(c.companyCreated) ??
      Date.now()
    const updatedAt =
      (typeof c.updatedAt === "number" ? c.updatedAt : null) ??
      safeParseIso(c.companyUpdated) ??
      undefined

    const setup: CompanySetup = {
      id: companyId,
      name: String(c.companyName || c.name || ""),
      legalName: String(c.legalName || c.companyName || c.name || ""),
      companyType: (String(c.companyType || "hospitality").trim().toLowerCase() as any) || "hospitality",
      address: {
        street: String(c.companyAddress || ""),
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      contact: {
        email: String(c.companyEmail || ""),
        phone: String(c.companyPhone || ""),
        website: c.companyWebsite ? String(c.companyWebsite) : "",
      },
      business: {
        taxId: "",
        registrationNumber: "",
        industry: String(c.companyIndustry || ""),
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
        logo: String(c.companyLogo || ""),
        primaryColor: "",
        secondaryColor: "",
      },
      createdAt,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
    }

    return setup
  } catch (error) {
    throw new Error(`Error fetching company setup: ${error}`);
  }
};

/**
 * Save company setup to database
 * @param companyId Company ID
 * @param setup Setup data
 */
export const saveCompanySetupToDb = async (companyId: string, setup: Omit<CompanySetup, "id">): Promise<void> => {
  try {
    const setupRef = ref(db, `companies/${companyId}/setup`);
    const setupWithId = {
      ...setup,
      id: companyId,
      updatedAt: Date.now(),
    };
    await set(setupRef, setupWithId);
  } catch (error) {
    throw new Error(`Error saving company setup: ${error}`);
  }
};

// ===== USER PROFILE DATABASE FUNCTIONS =====

/**
 * Fetch user profile from database
 * @param userId User ID
 * @returns User profile data
 */
export const fetchUserProfileFromDb = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching user profile: ${error}`);
  }
};

/**
 * Update user profile in database
 * @param userId User ID
 * @param updates Profile updates
 */
export const updateUserProfileInDb = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, { ...updates, updatedAt: Date.now() });
  } catch (error) {
    throw new Error(`Error updating user profile: ${error}`);
  }
};

// ===== COMPANY MESSAGES DATABASE FUNCTIONS =====

/**
 * Fetch company messages from database
 * @param companyId Company ID
 * @returns Array of messages
 */
export const fetchCompanyMessagesFromDb = async (companyId: string): Promise<CompanyMessage[]> => {
  try {
    const messagesRef = ref(db, `companies/${companyId}/messages`);
    const snapshot = await get(messagesRef);
    
    if (snapshot.exists()) {
      const messagesData = snapshot.val();
      return Object.entries(messagesData).map(([id, data]) => ({
        id,
        ...(data as Omit<CompanyMessage, 'id'>)
      }));
    }
    return [];
  } catch (error) {
    throw new Error(`Error fetching company messages: ${error}`);
  }
};

/**
 * Create company message in database
 * @param companyId Company ID
 * @param message Message data
 * @returns Message with ID
 */
export const createCompanyMessageInDb = async (companyId: string, message: Omit<CompanyMessage, "id" | "createdAt" | "updatedAt">): Promise<CompanyMessage> => {
  try {
    const messagesRef = ref(db, `companies/${companyId}/messages`);
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key!;
    
    const messageWithId = {
      ...message,
      id: messageId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await set(newMessageRef, messageWithId);
    return messageWithId;
  } catch (error) {
    throw new Error(`Error creating company message: ${error}`);
  }
};

// ===== SITE INVITE DATABASE FUNCTIONS =====

/**
 * Create site invite in database
 * @param _companyId Company ID
 * @param inviteData Invite data
 * @returns Invite ID
 */
export const createSiteInviteInDb = async (_companyId: string, inviteData: Omit<SiteInvite, 'id' | 'inviteID'>): Promise<string> => {
  try {
    const invitesRef = ref(db, 'siteInvites');
    const newInviteRef = push(invitesRef);
    const inviteId = newInviteRef.key!;
    
    const inviteWithId = {
      ...inviteData,
      id: inviteId,
      inviteID: inviteId,
    };
    
    await set(newInviteRef, inviteWithId);
    return inviteId;
  } catch (error) {
    throw new Error(`Error creating site invite: ${error}`);
  }
};

/**
 * Get site invites from database
 * @param companyId Company ID
 * @returns Array of invites
 */
export const getSiteInvitesFromDb = async (companyId: string): Promise<SiteInvite[]> => {
  try {
    const invitesRef = ref(db, 'siteInvites');
    const snapshot = await get(invitesRef);
    
    if (snapshot.exists()) {
      const invitesData = snapshot.val();
      return Object.entries(invitesData)
        .filter(([_, data]: [string, any]) => data.companyID === companyId)
        .map(([id, data]) => ({
          id,
          ...(data as Omit<SiteInvite, 'id'>)
        }));
    }
    return [];
  } catch (error) {
    throw new Error(`Error fetching site invites: ${error}`);
  }
};

/**
 * Get site invite by code from database
 * @param inviteCode Invite code
 * @returns Site invite data
 */
export const getSiteInviteByCodeFromDb = async (inviteCode: string): Promise<SiteInvite | null> => {
  try {
    const invitesRef = ref(db, 'siteInvites');
    const snapshot = await get(invitesRef);
    
    if (snapshot.exists()) {
      const invitesData = snapshot.val();
      const inviteEntry = Object.entries(invitesData).find(([_, data]: [string, any]) => data.code === inviteCode);
      
      if (inviteEntry) {
        const [id, data] = inviteEntry;
        return {
          id,
          ...(data as Omit<SiteInvite, 'id'>)
        };
      }
    }
    return null;
  } catch (error) {
    throw new Error(`Error fetching site invite by code: ${error}`);
  }
};

/**
 * Update site invite in database
 * @param inviteId Invite ID
 * @param updates Invite updates
 */
export const updateSiteInviteInDb = async (inviteId: string, updates: Partial<SiteInvite>): Promise<void> => {
  try {
    const inviteRef = ref(db, `siteInvites/${inviteId}`);
    await update(inviteRef, updates);
  } catch (error) {
    throw new Error(`Error updating site invite: ${error}`);
  }
};

// ===== COMPANY INVITE DATABASE FUNCTIONS =====

export const createCompanyInviteInDb = async (inviteData: {
  email: string
  companyID: string
  companyName: string
  role: string
  department: string
  invitedBy: string
  invitedByName?: string
  expiresAt?: number
}): Promise<{ inviteId: string; code: string }> => {
  try {
    const invitesRef = ref(db, "invites")
    const newInviteRef = push(invitesRef)
    const inviteId = newInviteRef.key!

    const code =
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      Math.random().toString(36).substring(2, 8).toUpperCase()

    const now = Date.now()
    const record = {
      id: inviteId,
      inviteID: inviteId,
      code,
      email: inviteData.email,
      companyID: inviteData.companyID,
      companyName: inviteData.companyName,
      role: inviteData.role,
      department: inviteData.department,
      setAsOwner: String(inviteData.role || "").toLowerCase() === "owner",
      status: "pending" as const,
      invitedBy: inviteData.invitedBy,
      invitedByName: inviteData.invitedByName || "",
      invitedAt: now,
      expiresAt: inviteData.expiresAt || now + 7 * 24 * 60 * 60 * 1000,
    }

    await set(newInviteRef, record)
    return { inviteId, code }
  } catch (error) {
    throw new Error(`Error creating company invite: ${error}`)
  }
}

export const getCompanyInviteByCodeFromDb = async (inviteCode: string): Promise<any | null> => {
  try {
    const invitesRef = ref(db, "invites")
    const snapshot = await get(invitesRef)
    if (!snapshot.exists()) return null
    const invitesData = snapshot.val()
    const found = Object.entries(invitesData).find(([_, data]: [string, any]) => data?.code === inviteCode)
    if (!found) return null
    const [id, data] = found
    return { id, ...(data as any) }
  } catch (error) {
    throw new Error(`Error fetching company invite by code: ${error}`)
  }
}

export const updateCompanyInviteInDb = async (inviteId: string, updates: any): Promise<void> => {
  try {
    const inviteRef = ref(db, `invites/${inviteId}`)
    await update(inviteRef, updates)
  } catch (error) {
    throw new Error(`Error updating company invite: ${error}`)
  }
}

/**
 * Add user to company in database
 * @param userId User ID
 * @param companyId Company ID
 * @param companyData Company association data
 */
/**
 * Read a single company-user record from companies/{companyId}/users/{userId}
 */
export const getCompanyUserFromDb = async (companyId: string, userId: string): Promise<any | null> => {
  try {
    const snap = await get(ref(db, `companies/${companyId}/users/${userId}`))
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error("Error getting company user:", error)
    return null
  }
}

/**
 * Partially update a company-user record at companies/{companyId}/users/{userId}
 */
export const updateCompanyUserInDb = async (companyId: string, userId: string, updates: Record<string, any>): Promise<void> => {
  try {
    await update(ref(db, `companies/${companyId}/users/${userId}`), updates)
  } catch (error) {
    throw new Error(`Error updating company user: ${error}`)
  }
}

/**
 * Read user-company association from users/{userId}/companies/{companyId}
 */
export const getUserCompanyFromDb = async (userId: string, companyId: string): Promise<any | null> => {
  try {
    const snap = await get(ref(db, `users/${userId}/companies/${companyId}`))
    return snap.exists() ? snap.val() : null
  } catch (error) {
    console.error("Error getting user company:", error)
    return null
  }
}

/**
 * Partially update user-company association at users/{userId}/companies/{companyId}
 */
export const updateUserCompanyInDb = async (userId: string, companyId: string, updates: Record<string, any>): Promise<void> => {
  try {
    await update(ref(db, `users/${userId}/companies/${companyId}`), updates)
  } catch (error) {
    throw new Error(`Error updating user company: ${error}`)
  }
}

export const addUserToCompanyInDb = async (userId: string, companyId: string, companyData: any): Promise<void> => {
  try {
    const userCompanyRef = ref(db, `users/${userId}/companies/${companyId}`);
    await set(userCompanyRef, companyData);
  } catch (error) {
    throw new Error(`Error adding user to company: ${error}`);
  }
};

/**
 * Also reflect membership under company node for quick lookups
 */
export const setCompanyUserInDb = async (
  companyId: string,
  userId: string,
  data: {
    role?: string
    department?: string
    joinedAt?: number
    email?: string
    displayName?: string
    // Optional employee linkage (for employee invite onboarding)
    employeeId?: string
    roleId?: string
    siteId?: string
    subsiteId?: string
  }
): Promise<void> => {
  try {
    const companyUserRef = ref(db, `companies/${companyId}/users/${userId}`)
    await set(companyUserRef, data)
  } catch (error) {
    throw new Error(`Error setting company user: ${error}`)
  }
}

// ===== EMPLOYEE INVITE (JOIN CODE) DATABASE FUNCTIONS =====

/**
 * Create an employee-specific join code in the database.
 * This join code can be used at /join?code=... to link a signed-in user
 * to an existing employee record and add the company to the user's companies.
 *
 * Stored under: joinCodes/{code}
 */
export const createEmployeeJoinCodeInDb = async (params: {
  companyId: string
  siteId: string
  subsiteId?: string
  employeeId: string
  roleId?: string
  expiresInDays?: number
}): Promise<string> => {
  try {
    const { companyId, siteId, subsiteId, employeeId, roleId, expiresInDays = 7 } = params
    const code = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()
    const joinRef = ref(db, `joinCodes/${code}`)
    const record = {
      companyId,
      siteId,
      subsiteId: subsiteId || null,
      employeeId,
      roleId: roleId || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      used: false,
      type: "employee" as const,
    }
    await set(joinRef, record)
    return code
  } catch (error) {
    throw new Error(`Error creating employee join code: ${error}`)
  }
}

/**
 * Get employee join codes for a company, optionally filtered by employeeId
 */
export const getEmployeeJoinCodesFromDb = async (
  companyId: string,
  employeeId?: string,
): Promise<Array<{ code: string; data: any }>> => {
  try {
    const codesRef = ref(db, 'joinCodes')
    const snapshot = await get(codesRef)
    if (!snapshot.exists()) return []
    const all = snapshot.val() as Record<string, any>
    const results: Array<{ code: string; data: any }> = []
    Object.entries(all).forEach(([code, data]) => {
      const d = data as any
      if (d && d.type === 'employee' && d.companyId === companyId && (!employeeId || d.employeeId === employeeId)) {
        results.push({ code, data: d })
      }
    })
    // Sort by createdAt desc
    results.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0))
    return results
  } catch (error) {
    throw new Error(`Error fetching employee join codes: ${error}`)
  }
}

/**
 * Get an employee join code by code from database
 */
export const getEmployeeJoinCodeByCodeFromDb = async (code: string): Promise<any | null> => {
  try {
    const joinRef = ref(db, `joinCodes/${code}`)
    const snapshot = await get(joinRef)
    if (!snapshot.exists()) return null
    const data = snapshot.val()
    // Only return if it's an employee type join code
    if (data && data.type === 'employee') {
      return { code, ...data }
    }
    return null
  } catch (error) {
    throw new Error(`Error fetching employee join code: ${error}`)
  }
}

/**
 * Revoke an employee join code by marking it as used and adding revoked flag
 */
export const revokeEmployeeJoinCodeInDb = async (code: string): Promise<void> => {
  try {
    const joinRef = ref(db, `joinCodes/${code}`)
    const snapshot = await get(joinRef)
    if (!snapshot.exists()) return
    await update(joinRef, { used: true, revoked: true, revokedAt: Date.now() })
  } catch (error) {
    throw new Error(`Error revoking employee join code: ${error}`)
  }
}

// ===== ASSIGNMENT OPTIONS DATABASE FUNCTIONS =====

/**
 * Get company users from database
 * @param companyId Company ID
 * @returns Array of users
 */
export const getCompanyUsersFromDb = async (companyId: string): Promise<any[]> => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const companyUsers: any[] = [];
      
      Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
        if (userData.companies && userData.companies[companyId]) {
          companyUsers.push({
            uid: userId,
            ...userData,
            companyRole: userData.companies[companyId].role,
            companyDepartment: userData.companies[companyId].department,
          });
        }
      });
      
      return companyUsers;
    }
    return [];
  } catch (error) {
    throw new Error(`Error fetching company users: ${error}`);
  }
};

// ===== USER ↔ COMPANY RELATION FUNCTIONS =====

/**
 * Fetch list of companies a user belongs to
 * @param uid User ID
 * @returns Array of company entries with permission info
 */
// ===== REMOVE USER ↔ COMPANY LINKS =====

export const removeUserCompanyFromDb = async (uid: string, companyId: string): Promise<void> => {
  try {
    await remove(ref(db, `users/${uid}/companies/${companyId}`))
  } catch (error) {
    console.error("Error removing user-company link:", error)
    throw error
  }
}

export const removeCompanyUserFromDb = async (companyId: string, uid: string): Promise<void> => {
  try {
    await remove(ref(db, `companies/${companyId}/users/${uid}`))
  } catch (error) {
    console.error("Error removing company-user link:", error)
    throw error
  }
}

// ===== CHECKLIST SETTINGS =====

export const fetchChecklistSettings = async (basePath: string): Promise<any> => {
  try {
    const snap = await get(ref(db, `${basePath}/checklistSettings`))
    return snap.exists() ? snap.val() : {}
  } catch (error) {
    console.error("Error fetching checklist settings:", error)
    return {}
  }
}

// ===== CONTRACT TEMPLATE & CONTRACT FUNCTIONS =====

export const fetchContractTemplates = async (companyId: string): Promise<Record<string, any>> => {
  try {
    const snap = await get(ref(db, `companies/${companyId}/contractTemplates`))
    if (!snap.exists()) return {}
    const raw = snap.val()
    const out: Record<string, any> = {}
    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach((k) => {
        out[k] = { ...raw[k], variables: Array.isArray(raw[k]?.variables) ? raw[k].variables : [] }
      })
    }
    return out
  } catch (error) {
    console.error("Error fetching contract templates:", error)
    return {}
  }
}

export const saveContractTemplate = async (companyId: string, template: any): Promise<string> => {
  try {
    if (template.id) {
      await set(ref(db, `companies/${companyId}/contractTemplates/${template.id}`), template)
      return template.id
    }
    const newRef = push(ref(db, `companies/${companyId}/contractTemplates`))
    const id = newRef.key!
    await set(newRef, { ...template, id })
    return id
  } catch (error) {
    throw new Error(`Error saving contract template: ${error}`)
  }
}

export const deleteContractTemplate = async (companyId: string, templateId: string): Promise<void> => {
  try {
    await remove(ref(db, `companies/${companyId}/contractTemplates/${templateId}`))
  } catch (error) {
    throw new Error(`Error deleting contract template: ${error}`)
  }
}

export const fetchContracts = async (companyId: string): Promise<Record<string, any>> => {
  try {
    const snap = await get(ref(db, `companies/${companyId}/contracts`))
    return snap.exists() ? snap.val() : {}
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return {}
  }
}

export const saveContract = async (companyId: string, contract: any): Promise<string> => {
  try {
    if (contract.id) {
      await set(ref(db, `companies/${companyId}/contracts/${contract.id}`), contract)
      return contract.id
    }
    const newRef = push(ref(db, `companies/${companyId}/contracts`))
    const id = newRef.key!
    await set(newRef, { ...contract, id })
    return id
  } catch (error) {
    throw new Error(`Error saving contract: ${error}`)
  }
}

export const updateContractField = async (companyId: string, contractId: string, field: string, value: any): Promise<void> => {
  try {
    await set(ref(db, `companies/${companyId}/contracts/${contractId}/${field}`), value)
  } catch (error) {
    throw new Error(`Error updating contract field: ${error}`)
  }
}

export const getUserCompaniesFromDb = async (
  uid: string,
): Promise<{ companyID: string; companyName: string; userPermission: string }[]> => {
  const userCompaniesRef = ref(db, `users/${uid}/companies`)
  const snapshot = await get(userCompaniesRef)
  if (!snapshot.exists()) return []

  const companiesData = snapshot.val()
  const companyIDs = Object.keys(companiesData)

  const results = await Promise.all(
    companyIDs.map(async (companyID) => {
      const companyRef = ref(db, `companies/${companyID}`)
      const companySnapshot = await get(companyRef)
      if (companySnapshot.exists()) {
        const companyData = companySnapshot.val()
        return {
          companyID,
          companyName: companyData.companyName || "Unknown Company",
          userPermission: companiesData[companyID]?.role || "N/A",
        }
      }
      return null
    }),
  )

  return results.filter(Boolean) as {
    companyID: string
    companyName: string
    userPermission: string
  }[]
}

// ===== COMPANY REPORTS =====

export async function fetchCompanyReports(companyId: string): Promise<any> {
  const snap = await get(ref(db, `companies/${companyId}/companyReports`))
  return snap.exists() ? snap.val() : {}
}

export async function fetchCompanyReport(companyId: string, reportId: string): Promise<any | null> {
  const snap = await get(ref(db, `companies/${companyId}/companyReports/${reportId}`))
  return snap.exists() ? snap.val() : null
}

export async function saveCompanyReport(companyId: string, reportId: string, data: any): Promise<void> {
  await set(ref(db, `companies/${companyId}/companyReports/${reportId}`), data)
}

export async function deleteCompanyReport(companyId: string, reportId: string): Promise<void> {
  await remove(ref(db, `companies/${companyId}/companyReports/${reportId}`))
}

// ===== COMPANY SECTION SETTINGS =====

export async function fetchCompanySectionSettings(companyId: string): Promise<any> {
  const snap = await get(ref(db, `companies/${companyId}/settings/companySection`))
  return snap.exists() ? snap.val() : {}
}

export async function saveCompanySectionSettings(companyId: string, data: any): Promise<void> {
  await set(ref(db, `companies/${companyId}/settings/companySection`), data)
}

// ===== DATA CONFIGURATION =====

export async function fetchDataConfiguration(companyId: string): Promise<Record<string, boolean>> {
  const snap = await get(ref(db, `companies/${companyId}/dataConfiguration`))
  return snap.exists() ? (snap.val() as Record<string, boolean>) : {}
}

export async function saveDataConfiguration(companyId: string, config: Record<string, boolean>): Promise<void> {
  await set(ref(db, `companies/${companyId}/dataConfiguration`), config)
}

export async function saveSiteDataConfiguration(companyId: string, siteId: string, config: Record<string, boolean>): Promise<void> {
  await set(ref(db, `companies/${companyId}/sites/${siteId}/dataConfiguration`), config)
}

// ===== USER COMPANY ASSOCIATION =====

export async function getUserCompanyAssociation(uid: string, companyId: string): Promise<any | null> {
  const snap = await get(ref(db, `users/${uid}/companies/${companyId}`))
  return snap.exists() ? snap.val() : null
}

export async function getUserCompaniesRaw(uid: string): Promise<any> {
  const snap = await get(ref(db, `users/${uid}/companies`))
  return snap.exists() ? snap.val() : null
}
