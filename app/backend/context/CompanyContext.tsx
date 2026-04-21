"use client"

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react"
import { auth, storage, storageRef, uploadBytes, getDownloadURL } from "../services/Firebase"
import { useSettings } from "./SettingsContext"
// import { createRole, createEmployee } from "../functions/HRs"
import { 
  createCompany as createCompanyFn,
  updateCompany as updateCompanyFn,
  addUserToCompany,
  getUserCompanies,
  getSites,
  getCompanyUsers as getCompanyUsersFromDb,
  fetchCompanySetup as fetchCompanySetupFn,
  saveCompanySetup as saveCompanySetupFn,
  fetchChecklists as fetchChecklistsFn,
  createChecklist as createChecklistFn,
  updateChecklist as updateChecklistFn,
  deleteChecklist as deleteChecklistFn,
  updateRolePermissions as updateRolePermissionsFn,
  updateDepartmentPermissions as updateDepartmentPermissionsFn,
  updateUserPermissions as updateUserPermissionsFn,
  getConfig as getConfigFn,
  updateCompanyConfig as updateCompanyConfigFn,
  // updateSiteConfig as updateSiteConfigFn,
  // updateSubsiteConfig as updateSubsiteConfigFn,
  createSiteInvite as createSiteInviteFn,
  getSiteInvites as getSiteInvitesFn,
  getSiteInviteByCode as getSiteInviteByCodeFn,
  acceptSiteInvite as acceptSiteInviteFn,
  getEmployeeJoinCodeByCode as getEmployeeJoinCodeByCodeFn,
  acceptEmployeeInvite as acceptEmployeeInviteFn,
  fetchUserProfile as fetchUserProfileFn,
  fetchChecklistTypes as fetchChecklistTypesFn,
  saveChecklistType as saveChecklistTypeFn,
  deleteChecklistType as deleteChecklistTypeFn,
  getSubsite,
  getPermissions as getPermissionsFn,
  updateDefaultRole as updateDefaultRoleFn,
  updateDefaultDepartment as updateDefaultDepartmentFn,
  updateRolePermissionsActive as updateRolePermissionsActiveFn,
  updateUserPermissionsActive as updateUserPermissionsActiveFn,
  updateEmployeePermissions as updateEmployeePermissionsFn,
  updateEmployeePermissionsActive as updateEmployeePermissionsActiveFn,
  updateDefaultPermissions as updateDefaultPermissionsFn,
  updateDepartmentPermissionsActive as updateDepartmentPermissionsActiveFn,
} from "../functions/Company"
import { 
  createSiteInDb,
  createSubsiteInDb,
  updateSubsiteInDb,
  deleteSubsiteFromDb,
  deleteSiteFromDb,
  updateSiteInDb,
  invalidateSitesCache,
  fetchChecklistCompletionsFromDb,
  createChecklistCompletionInDb,
  deleteChecklistCompletionFromDb,
  createCompanyInviteInDb,
  getCompanyInviteByCodeFromDb,
  updateCompanyInviteInDb,
  getCompanyFromDb,
  updateCompanyInDb,
  fetchCompanyReports as fetchCompanyReportsFn,
  fetchCompanyReport as fetchCompanyReportFn,
  saveCompanyReport as saveCompanyReportFn,
  deleteCompanyReport as deleteCompanyReportFn,
  fetchCompanySectionSettings as fetchCompanySectionSettingsFn,
  saveCompanySectionSettings as saveCompanySectionSettingsFn,
  fetchDataConfiguration as fetchDataConfigurationFn,
  saveDataConfiguration as saveDataConfigurationFn,
  saveSiteDataConfiguration as saveSiteDataConfigurationFn,
  getUserCompanyAssociation,
  getUserCompaniesRaw,
} from "../providers/supabase/Company"
import {
  CompanyPermissions,
  DEFAULT_PERMISSIONS,
  PERMISSION_MODULES,
  SiteDataConfig,
  Team,
  Site,
  Subsite,
  COMPANY_PERMISSION_KEY_ALIASES,
  ChecklistCompletion,
  CompanyChecklist,
} from "../interfaces/Company"
import { SessionPersistence } from "../../frontend/utils/sessionPersistence"
import { performanceTimer } from "../utils/PerformanceTimer"
import { createNotification } from "../functions/Notifications"
import { buildAuditMetadata, getCurrentEmployeeId } from "../utils/notificationAudit"
import { dataCache } from "../utils/DataCache"
import { debugLog, debugVerbose, debugWarn } from "../utils/debugLog"
import { filterChecklistsByStatus as filterCompanyChecklistsByStatus } from "../utils/checklistUtils"

// Note: Will import consolidated functions once they are properly exported
// For now, using direct Firebase operations until backend consolidation is complete

interface Company {
  companyID: string
  companyName: string
  companyLogo: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companyDescription: string
  companyIndustry: string
  companySize: string
  companyType: string
  companyStatus: string
  companyCreated: string | number
  companyUpdated: string | number
  permissions: CompanyPermissions
  joinCode?: string
  joinCodeExpiry?: number
  dataManagement?: DataManagementConfig
}

interface DataManagementConfig {
  stock: "company" | "site" | "subsite"
  hr: "company" | "site" | "subsite"
  finance: "company" | "site" | "subsite"
  bookings: "company" | "site" | "subsite"
  pos: "company" | "site" | "subsite"
  messenger: "company" | "site" | "subsite"
  supply: "company" | "site" | "subsite"
}

// Company type normalization:
// Requirement: if there is no company type, treat it as hospitality (current setup).
const normalizeCompanyType = (raw: unknown): string => {
  if (typeof raw !== "string") return "hospitality"
  const v = raw.trim()
  return v ? v : "hospitality"
}


// Use Site and Subsite from Company.tsx interfaces
// Site interface already includes companyID in the imported definition

interface User {
  uid: string
  email: string
  role: string
  department: string
  displayName?: string
  employeeId?: string
  roleId?: string
}

interface CompanyState {
  companyName: string
  companyID: string
  company: Company | null
  user: User | null
  permissions: CompanyPermissions
  loading: boolean
  error: string | null
  // Site management
  selectedSiteID: string | null
  selectedSiteName: string | null
  selectedSubsiteID: string | null
  selectedSubsiteName: string | null
  selectedTeamID: string | null
  selectedTeamName: string | null
  sites: Site[]
  subsites: Subsite[]
  teams: Team[]
  dataManagement: DataManagementConfig
  // Checklist data (pre-loaded for instant UI)
  checklists: CompanyChecklist[]
  checklistCompletions: ChecklistCompletion[]
  // Allow dynamic string indexing for compatibility
  [key: string]: any
}

export type CompanyAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_COMPANY_ID"; payload: string }
  | { type: "SET_COMPANY"; payload: any }
  | { type: "SET_USER"; payload: any }
  | { type: "SET_PERMISSIONS"; payload: CompanyPermissions }
  | { type: "SET_DATA_MANAGEMENT"; payload: DataManagementConfig }
  | { type: "SELECT_SITE"; payload: { siteID: string; siteName: string } }
  | { type: "SELECT_SUBSITE"; payload: { subsiteID: string; subsiteName: string; dataManagement?: DataManagementConfig } }
  | { type: "SELECT_TEAM"; payload: { teamID: string; teamName: string } }
  | { type: "SET_SITES"; payload: Site[] }
  | { type: "SET_SUBSITES"; payload: Subsite[] }
  | { type: "SET_TEAMS"; payload: Team[] }
  | { type: "SET_CHECKLISTS"; payload: CompanyChecklist[] }
  | { type: "SET_CHECKLIST_COMPLETIONS"; payload: ChecklistCompletion[] }
  | { type: "CLEAR_SITE_SELECTION" }
  | { type: "CLEAR_COMPANY" }
  | { type: "UPDATE_COMPANY_LOGO"; payload: string }

const DEFAULT_DATA_MANAGEMENT: DataManagementConfig = {
  stock: "site",
  hr: "site",
  finance: "company",
  bookings: "site",
  pos: "site",
  messenger: "company",
  supply: "site",
}

// Initialize state with values from session persistence (optimized for fast startup)
const getInitialState = (): CompanyState => {
  if (typeof window !== "undefined") {
    try {
      // Use new session persistence for better performance
      const sessionState = SessionPersistence.getSessionState()
      
      // Fallback to localStorage for backward compatibility
      const savedCompanyID = sessionState.companyID || localStorage.getItem("selectedCompanyID") || localStorage.getItem("companyID")
      const savedCompanyName = sessionState.companyName || localStorage.getItem("selectedCompanyName")
      const savedSiteID = sessionState.selectedSiteID || localStorage.getItem("selectedSiteID")
      const savedSiteName = sessionState.selectedSiteName || localStorage.getItem("selectedSiteName")
      const savedSubsiteID = sessionState.selectedSubsiteID || localStorage.getItem("selectedSubsiteID")
      const savedSubsiteName = sessionState.selectedSubsiteName || localStorage.getItem("selectedSubsiteName")

      return {
        companyID: savedCompanyID || "",
        companyName: savedCompanyName || "",
        company: null,
        user: null,
        permissions: DEFAULT_PERMISSIONS,
        loading: false, // Start with loading false for faster initial render
        error: null,
        selectedSiteID: savedSiteID || null,
        selectedSiteName: savedSiteName || null,
        selectedSubsiteID: savedSubsiteID || null,
        selectedSubsiteName: savedSubsiteName || null,
        selectedTeamID: null,
        selectedTeamName: null,
        sites: [],
        subsites: [],
        teams: [],
        dataManagement: DEFAULT_DATA_MANAGEMENT,
        checklists: [],
        checklistCompletions: [],
      }
    } catch (error) {
      // silent
    }
  }

  return {
    companyID: "",
    companyName: "",
    company: null,
    user: null,
    permissions: DEFAULT_PERMISSIONS,
    loading: false, // Start optimistic for better performance
    error: null,
    selectedSiteID: null,
    selectedSiteName: null,
    selectedSubsiteID: null,
    selectedSubsiteName: null,
    selectedTeamID: null,
    selectedTeamName: null,
    sites: [],
    subsites: [],
    teams: [],
    dataManagement: DEFAULT_DATA_MANAGEMENT,
    checklists: [],
    checklistCompletions: [],
  }
}

const initialState = getInitialState()

const companyReducer = (state: CompanyState, action: CompanyAction): CompanyState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }
    case "SET_COMPANY_ID": {
      const payload = action.payload
      const prevCompanyID = state.companyID
      if (typeof payload !== "string") {
        if (payload && typeof payload === "object") {
          const keys = Object.keys(payload)
          if (keys.length >= 1 && keys[0].includes("-")) {
            const nextCompanyID = keys[0]
            const companyChanged = nextCompanyID !== prevCompanyID
            return {
              ...state,
              companyID: nextCompanyID,
              error: null,
              ...(companyChanged
                ? {
                    // Clear site/subsite state to avoid mixing sites between companies
                    selectedSiteID: null,
                    selectedSiteName: null,
                    selectedSubsiteID: null,
                    selectedSubsiteName: null,
                    selectedTeamID: null,
                    selectedTeamName: null,
                    sites: [],
                    subsites: [],
                    teams: [],
                    dataManagement: DEFAULT_DATA_MANAGEMENT,
                    company: null,
                    companyName: "",
                  }
                : {}),
            }
          }
        }
        // If we can't fix it, just clear the company ID instead of erroring
        return { ...state, companyID: "", error: null }
      }
      const companyChanged = payload !== prevCompanyID
      return {
        ...state,
        companyID: payload,
        error: null,
        ...(companyChanged
          ? {
              // Clear site/subsite state to avoid mixing sites between companies
              selectedSiteID: null,
              selectedSiteName: null,
              selectedSubsiteID: null,
              selectedSubsiteName: null,
              selectedTeamID: null,
              selectedTeamName: null,
              sites: [],
              subsites: [],
              teams: [],
              dataManagement: DEFAULT_DATA_MANAGEMENT,
              company: null,
              companyName: "",
              checklists: [],
              checklistCompletions: [],
            }
          : {}),
      }
    }
    case "SET_COMPANY":
      // Map accessibleModules to dataManagement format if needed
      let dataManagement = DEFAULT_DATA_MANAGEMENT
      
      if (action.payload.dataManagement) {
        if (action.payload.dataManagement.accessibleModules) {
          // New format: dataManagement.accessibleModules
          dataManagement = {
            stock: action.payload.dataManagement.accessibleModules.stock || DEFAULT_DATA_MANAGEMENT.stock,
            hr: action.payload.dataManagement.accessibleModules.hr || DEFAULT_DATA_MANAGEMENT.hr,
            finance: action.payload.dataManagement.accessibleModules.finance || DEFAULT_DATA_MANAGEMENT.finance,
            bookings: action.payload.dataManagement.accessibleModules.bookings || DEFAULT_DATA_MANAGEMENT.bookings,
            pos: action.payload.dataManagement.accessibleModules.pos || DEFAULT_DATA_MANAGEMENT.pos,
            messenger: action.payload.dataManagement.accessibleModules.messenger || DEFAULT_DATA_MANAGEMENT.messenger,
            supply: action.payload.dataManagement.accessibleModules.supply || DEFAULT_DATA_MANAGEMENT.supply,
          }
        } else {
          // Direct format: dataManagement.hr, etc.
          dataManagement = { ...DEFAULT_DATA_MANAGEMENT, ...action.payload.dataManagement }
        }
      }
      
      return {
        ...state,
        company: action.payload,
        dataManagement,
        loading: false,
        error: null,
      }
    case "SET_USER":
      return { ...state, user: action.payload }
    case "SET_PERMISSIONS":
      return { ...state, permissions: action.payload }
    case "SET_DATA_MANAGEMENT":
      return { ...state, dataManagement: action.payload }
    case "SELECT_SITE": {
      // When a site is selected, automatically extract subsites from that site
      // This works the same way sites are loaded when a company is selected
      const selectedSite = state.sites.find(site => site.siteID === action.payload.siteID)
      let extractedSubsites: Subsite[] = []
      
      if (selectedSite?.subsites && typeof selectedSite.subsites === 'object') {
        // Extract subsites from the selected site
        // Subsites are stored as Record<string, Subsite> where key is subsiteID
        try {
          extractedSubsites = Object.entries(selectedSite.subsites)
            .filter(([subsiteId, subsite]: [string, any]) => {
              if (!subsite || typeof subsite !== 'object') return false
              // Must have at least a name to be valid
              return subsite.name || subsite.subsiteName || subsiteId
            })
            .map(([subsiteId, subsite]: [string, any]) => {
              // Use subsiteID from object, or fall back to the key
              const id = subsite.subsiteID || subsite.id || subsiteId
              return {
                subsiteID: id,
                name: subsite.name || subsite.subsiteName || '',
                description: subsite.description || '',
                location: subsite.location || '',
                address: subsite.address || {
                  street: '',
                  city: '',
                  state: '',
                  zipCode: '',
                  country: ''
                },
                teams: subsite.teams || {},
                createdAt: subsite.createdAt || Date.now(),
                updatedAt: subsite.updatedAt || Date.now(),
                dataManagement: subsite.dataManagement,
              } as Subsite
            })
          
          // (silent) debug logging removed
        } catch (error) {
          // silent
        }
      } else {
        // (silent) debug logging removed
      }
      
      return {
        ...state,
        selectedSiteID: action.payload.siteID,
        selectedSiteName: action.payload.siteName,
        selectedSubsiteID: null, // Clear subsite selection when site changes
        selectedSubsiteName: null,
        selectedTeamID: null,
        selectedTeamName: null,
        subsites: extractedSubsites, // Set subsites from selected site
      }
    }
    case "SELECT_SUBSITE":
      return {
        ...state,
        selectedSubsiteID: action.payload.subsiteID,
        selectedSubsiteName: action.payload.subsiteName,
        selectedTeamID: null,
        selectedTeamName: null,
        // Update dataManagement if provided (e.g., from subsite-specific config)
        dataManagement: action.payload.dataManagement || state.dataManagement,
      }
    case "SELECT_TEAM":
      return {
        ...state,
        selectedTeamID: action.payload.teamID,
        selectedTeamName: action.payload.teamName,
      }
    case "SET_SITES": {
      // When sites are loaded, automatically extract subsites from the selected site (if any)
      // This ensures subsites are available immediately when sites load
      const newSites = action.payload
      let extractedSubsites: Subsite[] = []
      
      if (state.selectedSiteID) {
        const selectedSite = newSites.find((site: Site) => site.siteID === state.selectedSiteID)
        if (selectedSite?.subsites && typeof selectedSite.subsites === 'object') {
          // Extract subsites from the selected site
          // Subsites are stored as Record<string, Subsite> where key is subsiteID
          try {
            extractedSubsites = Object.entries(selectedSite.subsites)
              .filter(([subsiteId, subsite]: [string, any]) => {
                if (!subsite || typeof subsite !== 'object') return false
                // Must have at least a name to be valid
                return subsite.name || subsite.subsiteName || subsiteId
              })
              .map(([subsiteId, subsite]: [string, any]) => {
                // Use subsiteID from object, or fall back to the key
                const id = subsite.subsiteID || subsite.id || subsiteId
                return {
                  subsiteID: id,
                  name: subsite.name || subsite.subsiteName || '',
                  description: subsite.description || '',
                  location: subsite.location || '',
                  address: subsite.address || {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: ''
                  },
                  teams: subsite.teams || {},
                  createdAt: subsite.createdAt || Date.now(),
                  updatedAt: subsite.updatedAt || Date.now(),
                  dataManagement: subsite.dataManagement,
                } as Subsite
              })
            
            // (silent) debug logging removed
          } catch (error) {
            // silent
          }
        } else {
          // (silent) debug logging removed
        }
      }
      
      return { 
        ...state, 
        sites: newSites,
        subsites: extractedSubsites, // Update subsites when sites are loaded
      }
    }
    case "SET_SUBSITES":
      return { ...state, subsites: action.payload }
    case "SET_TEAMS":
      return { ...state, teams: action.payload }
    case "SET_CHECKLISTS":
      return { ...state, checklists: action.payload }
    case "SET_CHECKLIST_COMPLETIONS":
      return { ...state, checklistCompletions: action.payload }
    case "CLEAR_SITE_SELECTION":
      return {
        ...state,
        selectedSiteID: null,
        selectedSiteName: null,
        selectedSubsiteID: null,
        selectedSubsiteName: null,
        selectedTeamID: null,
        selectedTeamName: null,
      }
    case "CLEAR_COMPANY":
      // Reset to empty state (don't use initialState as it may contain stale localStorage data)
      return {
        ...state,
        companyID: "",
        companyName: "",
        company: null,
        user: null,
        permissions: DEFAULT_PERMISSIONS,
        loading: false,
        error: null,
        selectedSiteID: null,
        selectedSiteName: null,
        selectedSubsiteID: null,
        selectedSubsiteName: null,
        selectedTeamID: null,
        selectedTeamName: null,
        sites: [],
        subsites: [],
        teams: [],
        dataManagement: DEFAULT_DATA_MANAGEMENT,
        checklists: [],
        checklistCompletions: [],
      }
      return {
        companyID: "",
        companyName: "",
        company: null,
        user: null,
        permissions: DEFAULT_PERMISSIONS,
        loading: false,
        error: null,
        selectedSiteID: null,
        selectedSiteName: null,
        selectedSubsiteID: null,
        selectedSubsiteName: null,
        selectedTeamID: null,
        selectedTeamName: null,
        sites: [],
        subsites: [],
        teams: [],
        dataManagement: DEFAULT_DATA_MANAGEMENT,
        checklists: [],
        checklistCompletions: [],
      }
    case "UPDATE_COMPANY_LOGO":
      return {
        ...state,
        company: state.company ? { ...state.company, companyLogo: action.payload } : null
      }
    default:
      return state
  }
}

interface CompanyContextType {
  state: CompanyState
  dispatch: React.Dispatch<CompanyAction>
  // Indicates CompanyContext has fully loaded (company + sites + company-section prefetch complete)
  isFullyLoaded: boolean
  setCompanyID: (companyID: string | object) => void
  selectSite: (siteID: string, siteName: string) => void
  selectSubsite: (subsiteID: string, subsiteName: string) => Promise<void>
  selectTeam: (teamID: string, teamName: string) => void
  clearSiteSelection: () => void
  createSite: (site: Omit<Site, "siteID" | "companyID">) => Promise<string>
  createSubsite: (subsite: Omit<Subsite, "subsiteID">) => Promise<string>
  createTeam: (team: Omit<Team, "teamID">, subsiteId?: string | null) => Promise<string>
  updateSite: (siteID: string, site: Partial<Site>) => Promise<void>
  updateSubsite: (siteID: string, subsiteID: string, subsite: Partial<Subsite>) => Promise<void>
  deleteSite: (siteID: string) => Promise<void>
  deleteSubsite: (siteID: string, subsiteID: string) => Promise<void>
  refreshSites: (force?: boolean) => Promise<void>
  fetchSites: () => Promise<void>
  initializeCompanyData: (companyID: string) => Promise<void>
  ensureSitesLoaded: () => Promise<void>
  
  // Site access control functions
  getUserAccessibleSites: () => Promise<Site[]>
  autoSelectSiteIfOnlyOne: () => Promise<void>
  getSiteHierarchy: () => Promise<{site: Site, subsites: Subsite[]}[]>
  
  // Permission functions
  isOwner: () => boolean
  hasPermission: (
    module: string,
    page: string,
    action: "view" | "edit" | "delete",
    role?: string,
    department?: string,
  ) => boolean
  getUserPermissions: () => CompanyPermissions["roles"][string] | null
  checkUserPermission: (permissionIndex: number) => boolean
  updateUserPermissions: (userId: string, permissions: boolean[]) => Promise<void>
  updateRolePermissions: (roleId: string, permissions: CompanyPermissions["roles"][string]) => Promise<void>
  updateDepartmentPermissions: (departmentId: string, permissions: CompanyPermissions["roles"][string]) => Promise<void>
  updateDefaultRole: (defaultRole: string) => Promise<void>
  updateDefaultDepartment: (defaultDepartment: string) => Promise<void>
  updateDefaultPermissions: (defaultPermissions: CompanyPermissions["roles"][string]) => Promise<void>
  updateDepartmentPermissionsActive: (departmentKey: string, active: boolean) => Promise<void>
  updateRolePermissionsActive: (roleKey: string, active: boolean) => Promise<void>
  updateUserPermissionsActive: (userId: string, active: boolean) => Promise<void>
  updateEmployeePermissions: (employeeId: string, permissions: CompanyPermissions["roles"][string]) => Promise<void>
  updateEmployeePermissionsActive: (employeeId: string, active: boolean) => Promise<void>
  
  // Configuration functions
  getConfig: (configType: string) => Promise<string[]>
  updateConfig: (configType: string, config: string[]) => Promise<void>
  
  // Checklist functions
  getChecklists: () => Promise<any[]>
  fetchChecklistCategories: (companyId?: string) => Promise<string[]>
  saveChecklistType: (companyId: string, category: string) => Promise<void>
  deleteChecklistType: (companyId: string, category: string) => Promise<void>
  createChecklistItem: (checklist: any) => Promise<any>
  updateChecklistItem: (checklistId: string, updates: any) => Promise<void>
  deleteChecklistItem: (checklistId: string) => Promise<void>
  fetchChecklists: () => Promise<any[]>
  fetchChecklistCompletionsByUser: (userId: string) => Promise<any[]>
  fetchUserProfile: (userId: string) => Promise<any>
  filterChecklistsByStatus: (
    checklists: any[],
    completions: any[],
    status: "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" | "all",
  ) => any[]
  prefetchCompanyTabData: (companyId: string, siteId?: string | null, subsiteId?: string | null) => Promise<void>
  
  // Checklist completion functions
  createChecklistCompletion: (completion: any) => Promise<any>
  getChecklistCompletions: (filters?: any, forceRefresh?: boolean) => Promise<any[]>
  updateChecklistCompletion: (completionId: string, updates: any) => Promise<void>
  deleteChecklistCompletion: (checklistId: string, completionId: string) => Promise<void>
  /** Upload a photo for a checklist item during completion; returns download URL. */
  uploadChecklistCompletionPhoto: (checklistId: string, itemId: string, file: File) => Promise<string>
  
  // Site invite functions
  createSiteInvite: (siteId: string, inviteData: any) => Promise<any>
  getSiteInvites: (siteId?: string) => Promise<any[]>
  getSiteInviteByCode: (inviteCode: string) => Promise<any>
  acceptSiteInvite: (inviteId: string, userId: string) => Promise<{ success: boolean; message: string }>
  
  // Employee invite functions
  getEmployeeJoinCodeByCode: (code: string) => Promise<any>
  acceptEmployeeInvite: (code: string, userId: string) => Promise<{ success: boolean; message: string; companyId?: string; siteId?: string; subsiteId?: string; employeeId?: string }>
  
  // Role and department management functions
  addRole: (roleData: any) => Promise<any>
  addDepartment: (departmentData: any) => Promise<any>
  deleteRole: (roleId: string) => Promise<void>
  deleteDepartment: (departmentId: string) => Promise<void>
  
  // Company setup functions
  fetchCompanySetup: () => Promise<any>
  saveCompanySetup: (setupData: any) => Promise<void>
  updateCompanyLogo: (logoUrl: string) => Promise<void>

  // Company section pages (Reports + Settings)
  getCompanyReports: () => Promise<any[]>
  saveCompanyReport: (reportId: string, report: any) => Promise<void>
  deleteCompanyReport: (reportId: string) => Promise<void>
  loadCompanySectionSettings: () => Promise<any>
  saveCompanySectionSettings: (settings: any) => Promise<void>
  
  // Dashboard functions
  getChecklistScores: () => Promise<Record<string, number>>
  getAvailableTabsForUser: () => string[]
  
  // Base path functions (consolidated from SiteContext)
  getBasePath: (module?: keyof DataManagementConfig) => string
  
  // Company data configuration
  fetchDataConfiguration: () => Promise<Record<string, boolean>>
  saveDataConfiguration: (config: Record<string, boolean>, cascadeToMainSite?: boolean) => Promise<void>
  
  // Legacy functions (maintained for backward compatibility)
  generateJoinCode: (roleId?: string) => Promise<string>
  joinCompanyByCode: (code: string) => Promise<boolean>
  createCompanyInvite: (inviteData: { email: string; role?: string; department?: string; expiresInDays?: number }) => Promise<{ inviteId: string; code: string }>
  getCompanyInviteByCode: (code: string) => Promise<any>
  acceptCompanyInvite: (code: string, userId: string) => Promise<{ success: boolean; message?: string }>
  updateDataManagementConfig: (config: DataManagementConfig) => Promise<void>
  updateSiteDataManagement: (siteID: string, config: SiteDataConfig) => Promise<void>
  updateSubsiteDataManagement: (siteID: string, subsiteID: string, config: SiteDataConfig) => Promise<void>

  // User management functions
  getCompanyUsers: (companyId: string) => Promise<any[]>

  // Exposed helpers for frontend components
  fetchUserCompanies: (userId: string) => Promise<{ companyID: string; companyName: string; userPermission: string }[]>
  createCompany: (setupData: any) => Promise<string>
}

export const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

// Deep-merge incoming permissions into defaults so new pages/tabs appear
// without overwriting existing custom role/department setups.
const mergeUserPermissions = (base: any, incoming: any): any => {
  if (incoming == null) return base
  // Preserve legacy boolean-array format if stored
  if (Array.isArray(incoming)) return incoming
  const baseModules = (base && typeof base === "object" ? base.modules : undefined) || {}
  const incomingModules = (incoming && typeof incoming === "object" ? incoming.modules : undefined) || {}
  const out: any = { ...(base || {}), ...(incoming || {}), modules: { ...baseModules } }
  Object.keys(incomingModules).forEach((moduleKey) => {
    out.modules[moduleKey] = { ...(baseModules[moduleKey] || {}), ...(incomingModules[moduleKey] || {}) }
  })
  return out
}

const mergeCompanyPermissionsWithDefaults = (defaults: CompanyPermissions, incoming: any): CompanyPermissions => {
  const inc = incoming && typeof incoming === "object" ? incoming : {}
  const out: any = { ...defaults, ...inc }

  out.defaultPermissions = mergeUserPermissions((defaults as any).defaultPermissions, (inc as any).defaultPermissions)

  out.roles = { ...(defaults.roles || {}) }
  Object.entries((inc as any).roles || {}).forEach(([roleKey, rolePerms]) => {
    out.roles[roleKey] = mergeUserPermissions((defaults.roles as any)?.[roleKey] || { modules: {} }, rolePerms)
  })

  out.departments = { ...(defaults.departments || {}) }
  Object.entries((inc as any).departments || {}).forEach(([deptKey, deptPerms]) => {
    out.departments[deptKey] = mergeUserPermissions((defaults.departments as any)?.[deptKey] || { modules: {} }, deptPerms)
  })

  // Metadata/overrides should be taken from incoming if present
  out.rolesMeta = { ...(defaults.rolesMeta || {}), ...((inc as any).rolesMeta || {}) }
  out.departmentsMeta = { ...(defaults.departmentsMeta || {}), ...((inc as any).departmentsMeta || {}) }
  out.users = (inc as any).users ?? defaults.users
  out.usersMeta = (inc as any).usersMeta ?? defaults.usersMeta
  out.employees = (inc as any).employees ?? defaults.employees
  out.employeesMeta = (inc as any).employeesMeta ?? defaults.employeesMeta
  out.defaultRole = (inc as any).defaultRole ?? defaults.defaultRole
  out.defaultDepartment = (inc as any).defaultDepartment ?? defaults.defaultDepartment

  return out as CompanyPermissions
}

const applyCompanyAliasMappings = (modules?: Record<string, any>) => {
  if (!modules?.company) return
  const companyModule = modules.company as Record<string, any>

  Object.entries(COMPANY_PERMISSION_KEY_ALIASES).forEach(([aliasKey, legacyKey]) => {
    if (!companyModule[aliasKey] && companyModule[legacyKey]) {
      companyModule[aliasKey] = { ...companyModule[legacyKey] }
    }
  })
}

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(companyReducer, initialState)
  
  // Get user data from SettingsContext
  const { state: settingsState } = useSettings()

  // Track initialization state
  const [hasInitializedUser, setHasInitializedUser] = React.useState(false)
  const [isFullyLoaded, setIsFullyLoaded] = React.useState(false)
  const [loadedCompanyID, setLoadedCompanyID] = React.useState<string | null>(null)
  const coreTimerRef = React.useRef<string | null>(null)
  const allTimerRef = React.useRef<string | null>(null)
  const didLogAllRef = React.useRef(false)
  const didLogCacheHydrateRef = React.useRef(false)
  
  // Track previous user UID to detect user changes
  const prevUserUIDRef = React.useRef<string | null>(null)
  
  // Handle user changes - clear state immediately when user changes
  useEffect(() => {
    const currentUID = settingsState.user?.uid || null
    
    // Detect user change (different user logged in)
    const userChanged = prevUserUIDRef.current !== null && 
                        prevUserUIDRef.current !== currentUID &&
                        currentUID !== null
    
    if (userChanged) {
      // User changed - clear all company state IMMEDIATELY to prevent showing previous user's data
      dispatch({ type: "CLEAR_COMPANY" })
      setHasInitializedUser(false)
      setIsInitialized(false)
      setIsFullyLoaded(false)
      setLoadedCompanyID(null) // Reset loadedCompanyID so initialization triggers
      sitesCompanyIDRef.current = null // Clear sites ref
      // Clear sites cache for the previous user
      try {
        SessionPersistence.clearSitesCache()
        SessionPersistence.clearLocationSelection()
        // Also clear individual localStorage keys that might be cached
        localStorage.removeItem('selectedCompanyID')
        localStorage.removeItem('selectedCompanyName')
        localStorage.removeItem('companyID')
      } catch {}
      
      // Update the ref immediately so we don't process this user change again
      prevUserUIDRef.current = currentUID
    } else if (currentUID === null && prevUserUIDRef.current !== null) {
      // User logged out
      dispatch({ type: "CLEAR_COMPANY" })
      setHasInitializedUser(false)
      setIsInitialized(false)
      setIsFullyLoaded(false)
      setLoadedCompanyID(null)
      prevUserUIDRef.current = null
    } else if (currentUID && prevUserUIDRef.current === null) {
      // User logged in (first time)
      prevUserUIDRef.current = currentUID
    }
  }, [settingsState.user?.uid, settingsState.auth.isLoggedIn])
  
  // Start CompanyContext initialization ASAP - only need user and companies, don't wait for SettingsContext to finish loading
  useEffect(() => {
    const currentUID = settingsState.user?.uid || null
    
    // Start CompanyContext initialization as soon as we have user and companies data
    // Don't wait for SettingsContext to finish loading - start immediately when we have the essentials
    // SettingsContext is ready when: user exists, auth is logged in, and companies array exists
    const settingsReady = settingsState.user && 
                         settingsState.auth.isLoggedIn && 
                         Array.isArray(settingsState.user.companies) && // Ensure companies array exists
                         !hasInitializedUser
    
    if (settingsReady && currentUID) {
      // Find the current company's role and department from user's companies
      if (!settingsState.user) {
        return // User not loaded yet
      }
      
      const currentCompany = settingsState.user.companies.find(
        company => company.companyID === settingsState.user?.currentCompanyID || company.isDefault
      )
      
      // In support view mode (admin viewing a company), force owner role so the
      // embedded app grants full owner-level access to settings and data.
      const isSupportView = typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"

      // Convert SettingsContext user to CompanyContext user format
      const companyUser: User = {
        uid: settingsState.user.uid,
        email: settingsState.user.email,
        role: isSupportView ? 'owner' : (currentCompany?.role || 'user'), // Get role from current company
        department: currentCompany?.department || '',
        // Critical for employee permission overrides (companies/{companyId}/permissions/employees/{employeeId})
        employeeId:
          (currentCompany as any)?.employeeId ||
          (currentCompany as any)?.employeeID ||
          (currentCompany as any)?.employee ||
          undefined,
        roleId:
          (currentCompany as any)?.roleId ||
          (currentCompany as any)?.roleID ||
          undefined,
        displayName: settingsState.user.displayName || settingsState.auth.displayName || '',
      }
      
      dispatch({ type: "SET_USER", payload: companyUser })
      
      // Auto-select the current company if available
      // CRITICAL: Prioritize localStorage (user's last selection) over currentCompanyID from user data
      // This ensures that when user switches companies, the selection persists on page refresh
      // Priority: 1) localStorage (last user selection), 2) currentCompanyID from user data, 3) default company, 4) first company in list
      let companyToSelect: string | undefined = undefined
      
      // FIRST: Check localStorage for the last selected company (highest priority)
      // This is what the user actually selected, so it should take precedence
      if (typeof window !== "undefined") {
        try {
          const savedCompanyID = localStorage.getItem("selectedCompanyID") || localStorage.getItem("companyID")
          if (savedCompanyID && settingsState.user) {
            // In support view mode (admin viewing a company), trust the admin-selected
            // company ID without validating against the user's own companies list.
            const isSupportView = localStorage.getItem("supportViewMode") === "true"
            if (isSupportView) {
              companyToSelect = savedCompanyID
            } else {
              // Validate that the saved company ID exists in user's companies
              const isValidCompany = settingsState.user.companies.some(
                c => c.companyID === savedCompanyID
              )
              if (isValidCompany) {
                companyToSelect = savedCompanyID
              }
            }
          }
        } catch (error) {
          // Silent fail - fall back to other methods
        }
      }
      
      // SECOND: If no valid company in localStorage, check currentCompanyID from user data
      if (!companyToSelect && settingsState.user?.currentCompanyID) {
        // Use the stored currentCompanyID if it exists and is valid
        const isValidCompany = settingsState.user?.companies.some(
          c => c.companyID === settingsState.user?.currentCompanyID
        )
        if (isValidCompany) {
          companyToSelect = settingsState.user.currentCompanyID
        }
      }
      
      // THIRD: If still no company, try to find a default or first company
      if (!companyToSelect && settingsState.user?.companies && settingsState.user.companies.length > 0) {
        // Try default company first, then first company
        const defaultCompany = settingsState.user.companies.find(c => c.isDefault)
        companyToSelect = defaultCompany?.companyID || settingsState.user.companies[0]?.companyID
      }
      
      // Set company ID if we found one
      // CRITICAL: Respect the company ID that was already loaded from localStorage in getInitialState
      // Only override if:
      // 1. No company is currently set, OR
      // 2. The current company ID is invalid (not in user's companies list)
      if (companyToSelect && settingsState.user) {
        const isSupportView = typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
        const currentCompanyIsValid = state.companyID && (
          isSupportView || settingsState.user.companies.some(c => c.companyID === state.companyID)
        )
        
        // Only update if no company is set, or if current company is invalid
        if (!state.companyID || !currentCompanyIsValid) {
          // Setting companyID will trigger the initialization useEffect
          // which calls initializeCompanyData -> refreshCoreFromFirebase -> getSites()
          // This ensures sites and subsites are loaded automatically
          dispatch({ type: "SET_COMPANY_ID", payload: companyToSelect })
        }
        // If state.companyID is already set and valid, don't override it
        // This preserves the company selection from localStorage
      }
      
      setHasInitializedUser(true)
    }
  }, [settingsState.user?.uid, settingsState.auth.isLoggedIn, hasInitializedUser, settingsState.user?.companies, settingsState.user?.currentCompanyID, state.companyID, loadedCompanyID])

  // Set company ID

  // Site management functions




  // Lazy loading state management
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [loadingSites, setLoadingSites] = React.useState(false)

  // Track which company the sites belong to
  const sitesCompanyIDRef = React.useRef<string | null>(null)

  // Prefetch cache for Company section tabs (checklists, completions, users, categories)
  const companyTabPrefetchRef = React.useRef<{
    key: string
    checklists?: any[]
    completions?: any[]
    companyUsers?: any[]
    checklistCategories?: string[]
  }>({ key: "" })

  /** Dedupe parallel getChecklistCompletions calls (e.g. React Strict Mode double effect). */
  const checklistCompletionsInflightRef = React.useRef<Map<string, Promise<any[]>>>(new Map())
  const latestSelectionRef = React.useRef<{ companyId?: string; siteId?: string; subsiteId?: string }>({})

  useEffect(() => {
    latestSelectionRef.current = {
      companyId: state.companyID || undefined,
      siteId: state.selectedSiteID || undefined,
      subsiteId: state.selectedSubsiteID || undefined,
    }
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID])

  const makeCompanyTabPrefetchKey = useCallback((companyId: string, siteId?: string | null, subsiteId?: string | null) => {
    return `${companyId || ""}|${siteId || ""}|${subsiteId || ""}`
  }, [])

  const fetchChecklistsForSelection = useCallback(async (companyId: string, siteId?: string | null, subsiteId?: string | null) => {
    const attempts: Array<{ siteId?: string; subsiteId?: string }> = []
    if (siteId && subsiteId) attempts.push({ siteId, subsiteId })
    if (siteId) attempts.push({ siteId })
    attempts.push({})

    for (const attempt of attempts) {
      try {
        const result = await fetchChecklistsFn(companyId, attempt.siteId, attempt.subsiteId)
        if (result && result.length > 0) return result
      } catch {
        // silent
      }
    }
    return []
  }, [])

  const fetchChecklistCompletionsForSelection = useCallback(async (companyId: string, siteId?: string | null, subsiteId?: string | null) => {
    // Match legacy behavior: only check site/subsite level, NOT company level
    // Require siteId (like legacy app does)
    if (!companyId || !siteId) {
      console.warn("fetchChecklistCompletionsForSelection: companyId and siteId are required", { companyId, siteId })
      return []
    }

    try {
      // Use same path structure as legacy app
      const completionsPath = subsiteId
        ? `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/checklistCompletions`
        : `companies/${companyId}/sites/${siteId}/checklistCompletions`
      
      const completions = await fetchChecklistCompletionsFromDb(completionsPath)
      return completions || []
    } catch (error) {
      console.error("Error fetching checklist completions:", error)
      // Return empty array instead of throwing (match legacy behavior for graceful handling)
      return []
    }
  }, [])

  const prefetchCompanyTabData = useCallback(async (companyId: string, siteId?: string | null, subsiteId?: string | null) => {
    // Don't prefetch if companyId or siteId is missing (required for completions)
    if (!companyId || !siteId) {
      // Dispatch empty arrays if site is not selected
      dispatch({ type: "SET_CHECKLISTS", payload: [] })
      dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: [] })
      return
    }
    const key = makeCompanyTabPrefetchKey(companyId, siteId, subsiteId)
    // Always load data, even if key matches (data might have changed)
    // Only skip if we're currently loading the same key

    // Fast path: reuse persisted cache (IndexedDB) for instant UI,
    // but still continue to refresh from database so timings reflect DB load.
    const cachePrefix = `companyPrefetch/${key}`
    try {
      const [checklistsCached, completionsCached, usersCached, categoriesCached] = await Promise.all([
        dataCache.peek<any[]>(`${cachePrefix}/checklists`),
        dataCache.peek<any[]>(`${cachePrefix}/completions`),
        dataCache.peek<any[]>(`${cachePrefix}/companyUsers`),
        dataCache.peek<string[]>(`${cachePrefix}/checklistCategories`),
      ])

      if (checklistsCached && completionsCached && usersCached && categoriesCached) {
        companyTabPrefetchRef.current = {
          key,
          checklists: checklistsCached,
          completions: completionsCached,
          companyUsers: usersCached,
          checklistCategories: categoriesCached,
        }
        // Dispatch cached data immediately for instant UI
        dispatch({ type: "SET_CHECKLISTS", payload: checklistsCached || [] })
        dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: completionsCached || [] })
      } else {
        // Dispatch empty arrays immediately if no cache, so UI renders instantly
        dispatch({ type: "SET_CHECKLISTS", payload: [] })
        dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: [] })
      }
    } catch {
      // Dispatch empty arrays on cache error
      dispatch({ type: "SET_CHECKLISTS", payload: [] })
      dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: [] })
    }

    // Always fetch fresh data (even if cached data exists)
    const [checklistsRes, completionsRes, usersRes, categoriesRes] = await Promise.allSettled([
      fetchChecklistsForSelection(companyId, siteId, subsiteId),
      fetchChecklistCompletionsForSelection(companyId, siteId, subsiteId),
      getCompanyUsersFromDb(companyId),
      fetchChecklistTypesFn(companyId),
    ])

    const checklists = checklistsRes.status === "fulfilled" ? (checklistsRes.value || []) : []
    const completions = completionsRes.status === "fulfilled" ? (completionsRes.value || []) : []

    companyTabPrefetchRef.current = {
      key,
      checklists,
      completions,
      companyUsers: usersRes.status === "fulfilled" ? usersRes.value : [],
      checklistCategories: categoriesRes.status === "fulfilled" ? categoriesRes.value : ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"],
    }

    // Always dispatch fresh data to state (updates UI with latest data)
    dispatch({ type: "SET_CHECKLISTS", payload: checklists })
    dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: completions })

    // Persist for next refresh (don't block)
    try {
      dataCache.set(`${cachePrefix}/checklists`, companyTabPrefetchRef.current.checklists || [])
      dataCache.set(`${cachePrefix}/completions`, companyTabPrefetchRef.current.completions || [])
      dataCache.set(`${cachePrefix}/companyUsers`, companyTabPrefetchRef.current.companyUsers || [])
      dataCache.set(`${cachePrefix}/checklistCategories`, companyTabPrefetchRef.current.checklistCategories || [])
    } catch {
      // ignore
    }
  }, [fetchChecklistsForSelection, fetchChecklistCompletionsForSelection, makeCompanyTabPrefetchKey])
  
  // Refresh sites data with caching and deduplication - OPTIMIZED FOR INSTANT LOADING
  const refreshSites = useCallback(async (force: boolean = false) => {
    if (!state.companyID) {
      return
    }
    
    // Prevent duplicate requests unless forcing
    if (loadingSites && !force) {
      return
    }
    
    // Check if sites belong to current company
    const sitesBelongToCurrentCompany = sitesCompanyIDRef.current === state.companyID
    
    // Skip if sites already loaded for this company and not forcing
    if (!force && state.sites && state.sites.length > 0 && sitesBelongToCurrentCompany) {
      return
    }
    
    // If company changed, we need to reload sites
    if (sitesCompanyIDRef.current && sitesCompanyIDRef.current !== state.companyID) {
    }
    
    try {
      setLoadingSites(true)
      const timer = performanceTimer?.start('CompanyContext', 'refreshSites') || { stop: () => {}, fail: () => {} }
      const sitesArray = await getSites(state.companyID, force)
      
      // Update the company ID that sites belong to
      sitesCompanyIDRef.current = state.companyID
      
      // Only update if data actually changed (prevents unnecessary re-renders)
      const currentSitesJson = JSON.stringify(state.sites)
      const newSitesJson = JSON.stringify(sitesArray)
      
      if (currentSitesJson !== newSitesJson) {
        dispatch({ type: "SET_SITES", payload: sitesArray })
        
        // Cache sites for instant loading next time
        SessionPersistence.cacheSites(state.companyID, sitesArray)
        
        if (typeof timer !== 'string' && timer.stop) {
          timer.stop()
        }
      } else {
        if (typeof timer !== 'string' && timer.stop) {
          timer.stop()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const timer = performanceTimer?.start('CompanyContext', 'refreshSites') || { stop: () => {}, fail: () => {} }
      if (typeof timer !== 'string' && timer.fail) {
        timer.fail()
      }
      dispatch({ type: "SET_ERROR", payload: `Failed to load sites: ${errorMessage}` })
      // Clear the ref on error so it can retry
      sitesCompanyIDRef.current = null
    } finally {
      setLoadingSites(false)
    }
  }, [state.companyID, state.sites, dispatch, loadingSites])

  // Ensure sites are loaded (on-demand loading)
  const ensureSitesLoaded = useCallback(async () => {
    if (!state.companyID) return
    if (state.sites && state.sites.length > 0) return // Already loaded
    if (loadingSites) return // Already loading
    
    await refreshSites(true)
  }, [state.companyID, state.sites, loadingSites, refreshSites])

  // Initialize company data - OPTIMIZED: Load from cache instantly, then refresh from Firebase
  const initializeCompanyData = useCallback(async (companyID: string) => {
    if (isInitialized || !companyID) return
    
    try {
      setIsInitialized(true)

      // STEP 0: Restore company info instantly (needed for Company dashboard header/etc.)
      // Prefer SettingsContext companies list, fall back to localStorage.
      try {
        const companyFromSettings = settingsState.user?.companies?.find(
          (c: any) => c.companyID === companyID
        )
        const cachedCompanyName =
          companyFromSettings?.companyName ||
          localStorage.getItem("selectedCompanyName") ||
          ""

        if (cachedCompanyName) {
          dispatch({
            type: "SET_COMPANY",
            payload: {
              companyID,
              companyName: cachedCompanyName,
              permissions: DEFAULT_PERMISSIONS,
            },
          })
          try {
            localStorage.setItem("selectedCompanyID", companyID)
            localStorage.setItem("selectedCompanyName", cachedCompanyName)
            SessionPersistence.saveSessionState({ companyID, companyName: cachedCompanyName })
          } catch {}
        }
      } catch {}

      // STEP 1: Load from SessionPersistence cache INSTANTLY (fastest path)
      // This allows dropdowns to appear immediately while Firebase loads in background
      let cachedSites = SessionPersistence.getCachedSites(companyID)
      let cachedHasSubsites = Boolean(
        cachedSites && cachedSites.length > 0 && cachedSites.some(site => site.subsites && Object.keys(site.subsites || {}).length > 0),
      )

      // If SessionPersistence doesn't have a good sites cache, try IndexedDB-backed cache.
      if (!cachedHasSubsites) {
        try {
          const sitesFromCache = await dataCache.peek<any[]>(`companies/${companyID}/sites`)
          const hasSubsitesFromCache = Boolean(
            sitesFromCache && sitesFromCache.length > 0 && sitesFromCache.some(site => site.subsites && Object.keys(site.subsites || {}).length > 0),
          )
          if (hasSubsitesFromCache) {
            cachedSites = sitesFromCache as any
            cachedHasSubsites = true
          }
        } catch {
          // ignore
        }
      }
      if (cachedSites && cachedSites.length > 0) {
        // Check if cached sites have subsites - if not, they're from old cache format
        if (cachedHasSubsites) {
          // Set sites immediately from cache - dropdowns will work instantly
          dispatch({ type: "SET_SITES", payload: cachedSites })
          sitesCompanyIDRef.current = companyID
        }
      }

      // STEP 2: Mark CompanyContext "ready" as soon as core company + sites are available.
      // Heavy tab data is prefetched AFTER this in the background to keep initial load fast
      // and trigger HR immediately.
      const markCoreLoadedOnce = (sitesCount?: number) => {
        if (!isFullyLoaded) setIsFullyLoaded(true)
        if (didLogCoreRef.current) return
        didLogCoreRef.current = true
        if (coreTimerRef.current) {
          const duration = performanceTimer.end(coreTimerRef.current, sitesCount !== undefined ? { sites: sitesCount } : undefined)
          debugLog(`✅ CompanyContext: Core loaded (${duration.toFixed(2)}ms)`)
        }
      }

      const markAllLoadedOnce = () => {
        if (didLogAllRef.current) return
        didLogAllRef.current = true
        if (allTimerRef.current) {
          const duration = performanceTimer.end(allTimerRef.current)
          debugLog(`✅ CompanyContext: All data loaded (${duration.toFixed(2)}ms)`)
        }
      }

      const restoreSelectionsFromSites = (sitesArray: any[]) => {
        // Prefer SessionPersistence state (single source of truth), but support legacy localStorage keys.
        const sessionState = SessionPersistence.getSessionState()
        const storedSiteId = sessionState.selectedSiteID || localStorage.getItem("selectedSiteID")
        const storedSiteName = sessionState.selectedSiteName || localStorage.getItem("selectedSiteName")
        const storedSubsiteId = sessionState.selectedSubsiteID || localStorage.getItem("selectedSubsiteID")
        const storedSubsiteName = sessionState.selectedSubsiteName || localStorage.getItem("selectedSubsiteName")

        let restoredSiteId: string | null = null
        let restoredSubsiteId: string | null = null

        // If a stored selection is invalid for this company, clear it so we don't get "stuck".
        if (storedSiteId && !sitesArray.some((s: any) => s.siteID === storedSiteId)) {
          try {
            SessionPersistence.clearLocationSelection()
          } catch {}
          dispatch({ type: "CLEAR_SITE_SELECTION" })
          return { restoredSiteId: null, restoredSubsiteId: null }
        }

        if (storedSiteId && sitesArray.some((s: any) => s.siteID === storedSiteId)) {
          restoredSiteId = storedSiteId
          dispatch({
            type: "SELECT_SITE",
            payload: { siteID: storedSiteId, siteName: storedSiteName || "" },
          })

          if (storedSubsiteId) {
            const site = sitesArray.find((s: any) => s.siteID === storedSiteId)
            if (site?.subsites) {
              const subsites = Object.values(site.subsites) as any[]
              const subsiteObj = subsites.find(
                (ss: any) => ss && (ss.subsiteID === storedSubsiteId || (ss as any).id === storedSubsiteId),
              )
              if (subsiteObj && typeof subsiteObj === 'object' && 'subsiteID' in subsiteObj) {
                restoredSubsiteId = subsiteObj.subsiteID || (subsiteObj as any).id || storedSubsiteId
                const actualSubsiteName = (subsiteObj as any).name || storedSubsiteName || ""
                if (restoredSubsiteId) {
                  dispatch({
                    type: "SELECT_SUBSITE",
                    payload: { subsiteID: restoredSubsiteId, subsiteName: actualSubsiteName },
                  })
                }
              } else {
                // Stored subsite no longer exists under this site; clear subsite selection persistence.
                try {
                  SessionPersistence.saveSessionState({
                    selectedSubsiteID: null,
                    selectedSubsiteName: null,
                  } as any)
                } catch {}
              }
            }
          }
        }
        return { restoredSiteId, restoredSubsiteId }
      }

      // If we have a good sites cache, use it to become "ready" immediately.
      if (cachedHasSubsites) {
        try {
          restoreSelectionsFromSites(cachedSites || [])
        } catch {}
        // Also hydrate company + permissions from IndexedDB-backed cache if available.
        try {
          const [companyCached, permissionsCached] = await Promise.all([
            dataCache.peek<any>(`companies/${companyID}`),
            dataCache.peek<any>(`companies/${companyID}/permissions`),
          ])
          if (companyCached) {
            dispatch({
              type: "SET_COMPANY",
              payload: {
                companyID,
                companyName:
                  companyCached.companyName ||
                  localStorage.getItem("selectedCompanyName") ||
                  "",
                ...companyCached,
                companyType: normalizeCompanyType((companyCached as any).companyType),
                permissions: companyCached.permissions || DEFAULT_PERMISSIONS,
              },
            })
          }
          if (permissionsCached) {
            dispatch({ type: "SET_PERMISSIONS", payload: mergeCompanyPermissionsWithDefaults(DEFAULT_PERMISSIONS, permissionsCached as any) })
          }
        } catch {
          // ignore
        }
        // Allow HR to start ASAP, but DO NOT log "Core loaded" from cache.
        // Core timer should reflect DATABASE load times.
        if (!isFullyLoaded) setIsFullyLoaded(true)
        if (!didLogCacheHydrateRef.current) {
          didLogCacheHydrateRef.current = true
          debugLog("✅ CompanyContext: Cache hydrated")
        }
      }

      // Refresh core company + sites from Firebase.
      // If cache was used, do it in the background; otherwise, await it (first load).
      const refreshCoreFromFirebase = async () => {
        setLoadingSites(true)
        try {
          const [companyData, sitesArray, permissionsSnap] = await Promise.all([
            getCompanyFromDb(companyID),
            getSites(companyID, true),
            getPermissionsFn(companyID).catch(() => null),
          ])

          sitesCompanyIDRef.current = companyID
          dispatch({ type: "SET_SITES", payload: sitesArray })
          SessionPersistence.cacheSites(companyID, sitesArray)
          // Persist a full snapshot to IndexedDB-backed cache for fast/backup hydration.
          try {
            dataCache.set(`companies/${companyID}/sites`, sitesArray || [])
          } catch {
            // ignore
          }

          const { restoredSiteId, restoredSubsiteId } = restoreSelectionsFromSites(sitesArray)

          if (companyData) {
            const data = companyData || {}
            dispatch({
              type: "SET_COMPANY",
              payload: {
                ...data,
                companyID,
                companyName: data.companyName || localStorage.getItem("selectedCompanyName") || "",
                companyType: normalizeCompanyType((data as any).companyType),
                permissions: data.permissions || DEFAULT_PERMISSIONS,
              },
            })
            try {
              dataCache.set(`companies/${companyID}`, data)
            } catch {
              // ignore
            }
            try {
              // Always update localStorage with the company ID to ensure consistency
              localStorage.setItem("selectedCompanyID", companyID)
              localStorage.setItem("companyID", companyID)
              if (data.companyName) {
                localStorage.setItem("selectedCompanyName", data.companyName)
                SessionPersistence.saveSessionState({ companyID, companyName: data.companyName })
              }
            } catch {}
          }

          // Permissions are stored in `companies/{companyId}/permissions` (roles/departments/users).
          // Load once here so the Permissions tab doesn't cause extra fetching/lag.
          if (permissionsSnap) {
            // Merge with defaults to avoid missing keys
            dispatch({ type: "SET_PERMISSIONS", payload: mergeCompanyPermissionsWithDefaults(DEFAULT_PERMISSIONS, permissionsSnap as any) })
            try {
              dataCache.set(`companies/${companyID}/permissions`, permissionsSnap as any)
            } catch {
              // ignore
            }
          } else if (companyData) {
            if ((companyData as any).permissions) {
              dispatch({ type: "SET_PERMISSIONS", payload: mergeCompanyPermissionsWithDefaults(DEFAULT_PERMISSIONS, (companyData as any).permissions as any) })
              try {
                dataCache.set(`companies/${companyID}/permissions`, (companyData as any).permissions as any)
              } catch {
                // ignore
              }
            }
          }

          // Always log core data load when Firebase completes (even if cache hydrated UI).
          markCoreLoadedOnce(sitesArray.length)

          // Prefetch Company tab data (including checklist history) as part of "all data load"
          // CRITICAL: Load in background immediately when site is selected - don't wait for navigation
          markAllLoadedOnce() // Mark as loaded immediately so UI doesn't block
          if (restoredSiteId) {
            // Site is selected - load checklist data immediately in background (non-blocking)
            // This ensures data is ready BEFORE user navigates to ChecklistHistory tab
            // Defer to next tick to ensure UI renders first
            const prefetchCompanyId = companyID
            const prefetchSiteId = restoredSiteId || undefined
            const prefetchSubsiteId = restoredSubsiteId || undefined
            setTimeout(() => {
              const latest = latestSelectionRef.current
              if (latest.companyId !== prefetchCompanyId || latest.siteId !== prefetchSiteId || latest.subsiteId !== prefetchSubsiteId) {
                return
              }
              prefetchCompanyTabData(prefetchCompanyId, prefetchSiteId, prefetchSubsiteId)
                .catch(() => {}) // Silent fail - data will load when available
            }, 0)
          }
        } finally {
          setLoadingSites(false)
        }
      }

      if (cachedHasSubsites) {
        Promise.resolve().then(refreshCoreFromFirebase)
      } else {
        await refreshCoreFromFirebase()
      }
      
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: `Failed to initialize company: ${error}` })
      setLoadingSites(false)
      if (!isFullyLoaded) {
        setIsFullyLoaded(true)
      }
    }
  }, [isInitialized, loadingSites, isFullyLoaded, prefetchCompanyTabData, settingsState.user])

  // Helper function to clear all company-specific cached data except settings
  const clearCompanySpecificCaches = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        // Clear legacy active-scope keys while preserving per-company remembered selections/caches.
        // Keep: settingsState, user preferences, theme, language, etc.
        // Clear: company-specific data, site data, cached company data
        const keysToRemove: string[] = [
          'selectedSiteID',
          'selectedSiteName',
          'selectedSubsiteID',
          'selectedSubsiteName',
          'companyId', // lowercase variant
          'siteId',
          'subsiteId',
        ]
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key)
          } catch {}
        })
        
        // Clear session state but preserve settings-related data
        const sessionState = SessionPersistence.getSessionState()
        const preservedData = {
          userPreferences: sessionState.userPreferences,
          lastAccessedRoute: sessionState.lastAccessedRoute,
        }
        
        // Preserve only non-company session metadata; the active company is set by the caller.
        SessionPersistence.saveSessionState({
          ...preservedData,
          companyID: sessionState.companyID,
        })
      }
    } catch (error) {
      console.warn('Failed to clear company-specific caches:', error)
    }
  }, [])

  // Set company ID function with session persistence
  const setCompanyID = useCallback((companyID: string | object) => {
    const id =
      typeof companyID === "string"
        ? companyID
        : (companyID && typeof companyID === "object" && "companyID" in (companyID as any))
          ? String((companyID as any).companyID || "")
          : ""
    
    const companyChanged = state.companyID && id && state.companyID !== id
    
    try {
      if (typeof window !== "undefined") {
        if (companyChanged) {
          // IMPORTANT: Save new company ID to localStorage FIRST before clearing old data
          // This ensures on page refresh, the correct company is loaded
          localStorage.setItem("selectedCompanyID", id)
          localStorage.setItem("companyID", id)
          
          // Clear all company-specific cached data (except settings)
          clearCompanySpecificCaches()
          SessionPersistence.setActiveCompany(id)
        } else if (id) {
          // Even if company hasn't changed, ensure localStorage is up to date
          localStorage.setItem("selectedCompanyID", id)
          localStorage.setItem("companyID", id)
          SessionPersistence.setActiveCompany(id)
        } else {
          SessionPersistence.setActiveCompany(undefined)
        }
        
      }
    } catch (error) {
      console.warn('Failed to update company ID in localStorage:', error)
    }
    
    dispatch({ type: "SET_COMPANY_ID", payload: id })
  }, [dispatch, state.companyID, clearCompanySpecificCaches])

  // Site selection functions with session persistence
  const selectSite = useCallback((siteID: string, siteName: string) => {
    try {
      if (typeof window !== "undefined") {
        SessionPersistence.saveSessionState({
          selectedSiteID: siteID,
          selectedSiteName: siteName,
          // Selecting a site implicitly clears any subsite selection
          selectedSubsiteID: undefined,
          selectedSubsiteName: undefined,
        })
      }
    } catch {}
    dispatch({ type: "SELECT_SITE", payload: { siteID, siteName } })
  }, [dispatch])

  const selectSubsite = useCallback(async (subsiteID: string, subsiteName: string) => {
    try {
      if (typeof window !== "undefined") {
        SessionPersistence.saveSessionState({
          selectedSubsiteID: subsiteID,
          selectedSubsiteName: subsiteName,
        })
      }
      
      // Load subsite-specific dataManagement configuration
      let subsiteDataManagement: DataManagementConfig | undefined = undefined
      if (!state.selectedSiteID) {
        dispatch({ type: "SELECT_SUBSITE", payload: { subsiteID, subsiteName } })
        return
      }
      if (state.companyID) {
        try {
          const subsiteData = await getSubsite(state.companyID, state.selectedSiteID, subsiteID)
          if (subsiteData?.dataManagement) {
            // Map accessibleModules to dataManagement format if needed
            if (subsiteData.dataManagement.accessibleModules) {
              subsiteDataManagement = {
                stock: subsiteData.dataManagement.accessibleModules.stock || DEFAULT_DATA_MANAGEMENT.stock,
                hr: subsiteData.dataManagement.accessibleModules.hr || DEFAULT_DATA_MANAGEMENT.hr,
                finance: subsiteData.dataManagement.accessibleModules.finance || DEFAULT_DATA_MANAGEMENT.finance,
                bookings: subsiteData.dataManagement.accessibleModules.bookings || DEFAULT_DATA_MANAGEMENT.bookings,
                pos: subsiteData.dataManagement.accessibleModules.pos || DEFAULT_DATA_MANAGEMENT.pos,
                messenger: subsiteData.dataManagement.accessibleModules.messenger || DEFAULT_DATA_MANAGEMENT.messenger,
                supply: subsiteData.dataManagement.accessibleModules.supply || DEFAULT_DATA_MANAGEMENT.supply,
              }
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to load subsite settings"
          dispatch({ type: "SET_ERROR", payload: message })
        }
      }
      
      dispatch({ type: "SELECT_SUBSITE", payload: { subsiteID, subsiteName, dataManagement: subsiteDataManagement } })
    } catch (error) {
      // Fallback to basic selection without dataManagement
      dispatch({ type: "SELECT_SUBSITE", payload: { subsiteID, subsiteName } })
    }
  }, [dispatch, state.companyID, state.selectedSiteID])

  const selectTeam = useCallback((teamID: string, teamName: string) => {
    dispatch({ type: "SELECT_TEAM", payload: { teamID, teamName } })
  }, [dispatch])

  const clearSiteSelection = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        SessionPersistence.clearLocationSelection()
      }
    } catch {}
    dispatch({ type: "CLEAR_SITE_SELECTION" })
  }, [dispatch])


  // Site management helpers from functions module are imported above (createSite, etc.)

  const updateSite = useCallback(async (siteID: string, site: Partial<Site>): Promise<void> => {
    if (!state.companyID) {
      throw new Error("Company ID is required to update a site")
    }
    try {
      const originalSite = state.sites.find(s => s.siteID === siteID)
      await updateSiteInDb(state.companyID, siteID, site)
      
      // Add notification
      if (originalSite) {
        try {
          await createNotification(
            state.companyID,
            settingsState.auth?.uid || 'system',
            'site',
            'updated',
            'Site Updated',
            `Site "${site.name || originalSite.name || 'Site'}" was updated`,
            {
              siteId: siteID,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: siteID,
                entityName: site.name || originalSite.name || 'Site',
                oldValue: originalSite,
                newValue: { ...originalSite, ...site },
                changes: {
                  site: { from: originalSite, to: { ...originalSite, ...site } }
                }
              },
              metadata: buildAuditMetadata({
                type: "site",
                action: "updated",
                section: "Company/Sites",
                companyId: state.companyID,
                siteId: siteID,
                uid: settingsState.auth?.uid || "system",
                employeeId: getCurrentEmployeeId(state, settingsState),
                entityId: siteID,
                entityName: site.name || originalSite.name || "Site",
              }),
            }
          )
        } catch (notificationError) {
          // silent
        }
      }
      
      // Force refresh so UI reflects mutations even when sites are already loaded
      await refreshSites(true)
    } catch (error) {
      console.error("Error updating site:", error)
      throw error
    }
  }, [state.companyID, state.sites, refreshSites, settingsState.auth?.uid])

  const updateSubsite = useCallback(async (siteID: string, subsiteID: string, subsite: Partial<Subsite>): Promise<void> => {
    if (!state.companyID) {
      throw new Error("Company ID is required to update a subsite")
    }
    try {
      const originalSubsite = state.subsites.find(s => s.subsiteID === subsiteID)
      await updateSubsiteInDb(state.companyID, siteID, subsiteID, subsite)
      
      // Add notification
      if (originalSubsite) {
        try {
          await createNotification(
            state.companyID,
            settingsState.auth?.uid || 'system',
            'subsite',
            'updated',
            'Subsite Updated',
            `Subsite "${subsite.name || originalSubsite.name || 'Subsite'}" was updated`,
            {
              siteId: siteID,
              subsiteId: subsiteID,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: subsiteID,
                entityName: subsite.name || originalSubsite.name || 'Subsite',
                oldValue: originalSubsite,
                newValue: { ...originalSubsite, ...subsite },
                changes: {
                  subsite: { from: originalSubsite, to: { ...originalSubsite, ...subsite } }
                }
              },
              metadata: buildAuditMetadata({
                type: "subsite",
                action: "updated",
                section: "Company/Subsites",
                companyId: state.companyID,
                siteId: siteID,
                subsiteId: subsiteID,
                uid: settingsState.auth?.uid || "system",
                employeeId: getCurrentEmployeeId(state, settingsState),
                entityId: subsiteID,
                entityName: subsite.name || originalSubsite.name || "Subsite",
              }),
            }
          )
        } catch (notificationError) {
          // silent
        }
      }
      
      // Force refresh so UI reflects mutations even when sites are already loaded
      await refreshSites(true)
    } catch (error) {
      console.error("Error updating subsite:", error)
      throw error
    }
  }, [state.companyID, state.subsites, refreshSites, settingsState.auth?.uid])

  const deleteSite = useCallback(async (siteID: string): Promise<void> => {
    if (!state.companyID) {
      throw new Error("Company ID is required to delete a site")
    }
    try {
      const siteToDelete = state.sites.find(s => s.siteID === siteID)
      await deleteSiteFromDb(state.companyID, siteID)

      // Clear all caches BEFORE updating state to prevent stale data
      try {
        invalidateSitesCache(state.companyID)
      } catch {}
      try {
        dataCache.invalidate(`companies/${state.companyID}/sites`)
      } catch {}
      try {
        // Clear SessionPersistence cache for this company
        SessionPersistence.cacheSites(state.companyID, [])
      } catch {}

      // Optimistic UI: remove site locally immediately (avoids slow full refresh)
      const nextSites = (state.sites || []).filter(s => s.siteID !== siteID)
      if (state.selectedSiteID === siteID) {
        dispatch({ type: "CLEAR_SITE_SELECTION" })
        try {
          SessionPersistence.saveSessionState({ selectedSiteID: null, selectedSiteName: null, selectedSubsiteID: null, selectedSubsiteName: null } as any)
        } catch {}
      }
      dispatch({ type: "SET_SITES", payload: nextSites })
      
      // Update cache with filtered sites AFTER state update
      try {
        SessionPersistence.cacheSites(state.companyID, nextSites)
      } catch {}
      try {
        dataCache.set(`companies/${state.companyID}/sites`, nextSites)
      } catch {}
      
      // Force refresh from Firebase to ensure consistency (bypass cache)
      // This ensures the deleted site doesn't come back on refresh
      await refreshSites(true)
      
      // Add notification
      if (siteToDelete) {
        // Don't block UI on notifications
        createNotification(
          state.companyID,
          settingsState.auth?.uid || 'system',
          'site',
          'deleted',
          'Site Deleted',
          `Site "${siteToDelete.name || 'Site'}" was deleted`,
          {
            siteId: siteID,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: siteID,
              entityName: siteToDelete.name || 'Site',
              oldValue: siteToDelete,
              newValue: null,
              changes: {
                site: { from: siteToDelete, to: null }
              }
            },
            metadata: buildAuditMetadata({
              type: "site",
              action: "deleted",
              section: "Company/Sites",
              companyId: state.companyID,
              siteId: siteID,
              uid: settingsState.auth?.uid || "system",
              employeeId: getCurrentEmployeeId(state, settingsState),
              entityId: siteID,
              entityName: siteToDelete.name || "Site",
            }),
          }
        ).catch(() => {
          // silent
        })
      }
    } catch (error) {
      console.error("Error deleting site:", error)
      throw error
    }
  }, [state.companyID, state.sites, state.selectedSiteID, dispatch, settingsState.auth?.uid, refreshSites])

  const deleteSubsite = useCallback(async (siteID: string, subsiteID: string): Promise<void> => {
    if (!state.companyID) {
      throw new Error("Company ID is required to delete a subsite")
    }
    try {
      const subsiteToDelete = state.subsites.find(s => s.subsiteID === subsiteID)
      await deleteSubsiteFromDb(state.companyID, siteID, subsiteID)

      // Optimistic UI: remove subsite locally without re-fetching all sites
      const nextSites = (state.sites || []).map((s: any) => {
        if (s.siteID !== siteID) return s
        if (!s.subsites || typeof s.subsites !== "object") return s
        const nextSubsites = { ...(s.subsites as any) }
        delete nextSubsites[subsiteID]
        return { ...s, subsites: nextSubsites }
      })
      if (state.selectedSubsiteID === subsiteID) {
        dispatch({ type: "SELECT_SITE", payload: { siteID, siteName: state.selectedSiteName || "" } })
      }
      dispatch({ type: "SET_SITES", payload: nextSites })
      try {
        SessionPersistence.cacheSites(state.companyID, nextSites)
      } catch {}
      try {
        dataCache.invalidate(`companies/${state.companyID}/sites`)
      } catch {}
      try {
        invalidateSitesCache(state.companyID)
      } catch {}
      
      // Add notification
      if (subsiteToDelete) {
        // Don't block UI on notifications
        createNotification(
          state.companyID,
          settingsState.auth?.uid || 'system',
          'subsite',
          'deleted',
          'Subsite Deleted',
          `Subsite "${subsiteToDelete.name || 'Subsite'}" was deleted`,
          {
            siteId: siteID,
            subsiteId: subsiteID,
            priority: 'medium',
            category: 'warning',
            details: {
              entityId: subsiteID,
              entityName: subsiteToDelete.name || 'Subsite',
              oldValue: subsiteToDelete,
              newValue: null,
              changes: {
                subsite: { from: subsiteToDelete, to: null }
              }
            },
            metadata: buildAuditMetadata({
              type: "subsite",
              action: "deleted",
              section: "Company/Subsites",
              companyId: state.companyID,
              siteId: siteID,
              subsiteId: subsiteID,
              uid: settingsState.auth?.uid || "system",
              employeeId: getCurrentEmployeeId(state, settingsState),
              entityId: subsiteID,
              entityName: subsiteToDelete.name || "Subsite",
            }),
          }
        ).catch(() => {
          // silent
        })
      }
    } catch (error) {
      console.error("Error deleting subsite:", error)
      throw error
    }
  }, [state.companyID, state.subsites, state.sites, state.selectedSubsiteID, state.selectedSiteName, dispatch, settingsState.auth?.uid])

  const fetchSites = useCallback(async (): Promise<void> => {
    // Explicit fetch should always revalidate
    await refreshSites(true)
  }, [refreshSites])

  // Lazy load company data when companyID changes (only when needed)
  const didLogCoreRef = React.useRef(false)
  
  useEffect(() => {
    // Start CompanyContext initialization ASAP - only need user and auth, don't wait for SettingsContext to finish loading
    const settingsReady = settingsState.user && settingsState.auth.isLoggedIn
    
    if (!settingsReady) return // Don't initialize until we have user and auth
    
    if (state.companyID && state.companyID !== loadedCompanyID) {
      
      // Reset initialization state when company changes
      setIsInitialized(false)
      setIsFullyLoaded(false)
      setLoadedCompanyID(state.companyID)
      didLogCoreRef.current = false
      didLogCacheHydrateRef.current = false
      
      // Clear sites company ID ref so sites will reload for new company
      sitesCompanyIDRef.current = null
      
      // Start performance timer
      didLogAllRef.current = false
      coreTimerRef.current = performanceTimer.start('CompanyContext', 'coreLoad');
      allTimerRef.current = performanceTimer.start('CompanyContext', 'allLoad');
      debugLog("⏳ CompanyContext: Starting load (including sites/subsites)", { companyID: state.companyID })
      
      // Initialize IMMEDIATELY - no delays, instant loading
      // initializeCompanyData will:
      // 1. Load company info from cache/Firebase
      // 2. Call refreshCoreFromFirebase which loads sites via getSites()
      // 3. Extract subsites automatically when SET_SITES is dispatched (see reducer line 413)
      // This ensures sites and subsites are available when company is selected after user change
      Promise.resolve().then(() => {
        initializeCompanyData(state.companyID).catch(error => {
          console.error("Failed to initialize company data (sites/subsites may not be loaded):", error)
          if (!isFullyLoaded) setIsFullyLoaded(true)
        })
      })
    } else if (state.companyID && state.companyID === loadedCompanyID && !isInitialized) {
      // If companyID matches but not initialized, initialize it
      if (!coreTimerRef.current) {
        didLogAllRef.current = false
        coreTimerRef.current = performanceTimer.start('CompanyContext', 'coreLoad');
        allTimerRef.current = performanceTimer.start('CompanyContext', 'allLoad');
      }
      if (!didLogCoreRef.current) {
        debugLog("⏳ CompanyContext: Starting load", { companyID: state.companyID })
      }
      initializeCompanyData(state.companyID).catch(() => {
        if (!isFullyLoaded) setIsFullyLoaded(true)
      })
    }
  }, [state.companyID, isInitialized, initializeCompanyData, loadedCompanyID, settingsState.user, settingsState.auth.isLoggedIn, isFullyLoaded])

  // Load checklist history data immediately when site/subsite is selected (part of "all data load")
  // Run proactively to ensure data is ready before tab navigation - CRITICAL: Load in background
  const lastPrefetchKeyRef = React.useRef<string>("")
  const prefetchInProgressRef = React.useRef<boolean>(false)
  useEffect(() => {
    if (state.companyID && state.selectedSiteID) {
      const key = `${state.companyID}|${state.selectedSiteID}|${state.selectedSubsiteID || ""}`
      // Always prefetch when key changes (don't wait for isFullyLoaded)
      // This ensures data is ready immediately for instant tab navigation
      if (key !== lastPrefetchKeyRef.current && !prefetchInProgressRef.current) {
        lastPrefetchKeyRef.current = key
        prefetchInProgressRef.current = true
        // Load checklist data immediately in background - non-blocking
        // Defer to next tick to ensure UI renders first
        const prefetchCompanyId = state.companyID
        const prefetchSiteId = state.selectedSiteID
        const prefetchSubsiteId = state.selectedSubsiteID || undefined
        setTimeout(() => {
          const latest = latestSelectionRef.current
          if (latest.companyId !== prefetchCompanyId || latest.siteId !== prefetchSiteId || latest.subsiteId !== prefetchSubsiteId) {
            prefetchInProgressRef.current = false
            return
          }
          prefetchCompanyTabData(prefetchCompanyId, prefetchSiteId, prefetchSubsiteId)
            .catch(() => {}) // Silent fail - data will load when available
            .finally(() => {
              prefetchInProgressRef.current = false
            })
        }, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID])

  // REMOVED: Auto-restore site/subsite selection useEffect hooks
  // Site and subsite restoration now happens in initializeCompanyData after sites load
  // This prevents multiple reloads and ensures everything loads in one batch

  // Helper function to check if user is owner
  const isOwner = useCallback((): boolean => {
    // Super-admins always act as owner.
    if (Boolean((settingsState.user as any)?.isAdmin)) return true

    // Support/admin staff: only impersonate owner when support view mode is enabled.
    try {
      const isAdminStaff = Boolean((settingsState.user as any)?.adminStaff?.active)
      const supportViewMode = typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
      if (isAdminStaff && supportViewMode) return true
    } catch {
      // ignore
    }

    if (state.user?.role?.toLowerCase() === "owner") return true

    // Fallback: check SettingsContext company role (source of truth at login)
    const companyID = state.companyID || settingsState.user?.currentCompanyID
    const companyRole = settingsState.user?.companies?.find((c: any) => c.companyID === companyID)?.role
    if (typeof companyRole === "string" && companyRole.toLowerCase() === "owner") return true

    return false
  }, [state.user?.role, state.companyID, settingsState.user?.currentCompanyID, settingsState.user?.companies, settingsState.user])

  // Permission functions
  const buildOwnerPermissions = useCallback((): CompanyPermissions["roles"][string] => {
    const out: any = { modules: {} }

    // Define restricted tabs for owner in HR, Bookings, and Finance
    // Owner has access to all pages but only specific tabs in these modules
    // Excluding settings and some administrative tabs
    const ownerRestrictedTabs: Record<string, string[]> = {
      hr: [
        "dashboard", "employees", "scheduling", "timeoff", "payroll", 
        "selfservice", "performance", "warnings", "recruitment", "roles", 
        "departments", "announcements", "benefits", "expenses", "compliance", 
        "events", "diversity", "training", "analytics", "reports", "settings"
      ],
      bookings: [
        "dashboard", "list", "calendar", "diary", "floorplan", "waitlist", 
        "tables", "locations", "types", "preorders", "status", "tags", 
        "reports", "tools", "settings"
        // All Bookings tabs from Bookings.tsx are included
      ],
      finance: [
        "dashboard", "sales", "banking", "purchases", "expenses", "contacts", 
        "accounting", "currency", "budgeting", "forecasting", "reports", "settings"
        // All Finance tabs from Finance.tsx are included
      ],
    }

    const setAllFromModules = (modules: any) => {
      if (!modules || typeof modules !== "object") return
      for (const [moduleKey, pages] of Object.entries(modules as Record<string, any>)) {
        if (!out.modules[moduleKey]) out.modules[moduleKey] = {}
        if (!pages || typeof pages !== "object") continue
        
        // Check if this is a restricted module for owner
        if (ownerRestrictedTabs[moduleKey]) {
          // Only allow specific tabs for restricted modules
          const allowedTabs = ownerRestrictedTabs[moduleKey]
          for (const pageKey of Object.keys(pages)) {
            // Only grant permissions for allowed tabs
            if (allowedTabs.includes(pageKey)) {
              out.modules[moduleKey][pageKey] = { view: true, edit: true, delete: true }
            }
          }
        } else {
          // For non-restricted modules, grant all permissions
          for (const pageKey of Object.keys(pages)) {
            out.modules[moduleKey][pageKey] = { view: true, edit: true, delete: true }
          }
        }
      }
    }

    // 1) Known baseline from admin defaults (covers company/mobile etc)
    setAllFromModules((DEFAULT_PERMISSIONS as any)?.roles?.admin?.modules)

    // 2) Anything already present in the loaded company permissions
    const perms: any = state.permissions
    setAllFromModules(perms?.defaultPermissions?.modules)
    Object.values(perms?.roles || {}).forEach((r: any) => setAllFromModules(r?.modules))
    Object.values(perms?.departments || {}).forEach((d: any) => setAllFromModules(d?.modules))

    // 3) Ensure boolean-array mapped modules/pages are included too
    // But respect restrictions for HR, Bookings, and Finance
    PERMISSION_MODULES.forEach((key) => {
      const [m, p] = String(key).split(".")
      if (!m || !p) return
      if (!out.modules[m]) out.modules[m] = {}
      
      // Check if this module has restrictions
      if (ownerRestrictedTabs[m]) {
        // Only grant if this tab is in the allowed list
        if (ownerRestrictedTabs[m].includes(p)) {
          out.modules[m][p] = { view: true, edit: true, delete: true }
        }
      } else {
        // No restrictions, grant full access
        if (!out.modules[m][p]) out.modules[m][p] = { view: true, edit: true, delete: true }
      }
    })

    // 4) Explicitly ensure all allowed tabs for restricted modules are present
    // This ensures tabs are available even if they weren't in DEFAULT_PERMISSIONS or loaded permissions
    // Always set full permissions for all allowed tabs to guarantee they're accessible
    Object.keys(ownerRestrictedTabs).forEach((moduleKey) => {
      if (!out.modules[moduleKey]) out.modules[moduleKey] = {}
      const allowedTabs = ownerRestrictedTabs[moduleKey]
      allowedTabs.forEach((tabKey) => {
        // Always set full permissions for allowed tabs (don't just check if missing)
        out.modules[moduleKey][tabKey] = { view: true, edit: true, delete: true }
      })
    })

    // 4b) Explicitly ensure POS module has all its tabs (including "sales" which might not be in PERMISSION_MODULES)
    // POS is not restricted, but we need to ensure all tabs are present
    if (!out.modules.pos) out.modules.pos = {}
    const posTabs = ["dashboard", "sales", "bills", "floorplan", "items", "tillscreens", "tickets", 
                     "bagcheck", "management", "devices", "locations", "payments", "groups", 
                     "categories", "tables", "courses", "usage", "corrections", "discounts", 
                     "promotions", "reports", "settings"]
    posTabs.forEach((tabKey) => {
      out.modules.pos[tabKey] = { view: true, edit: true, delete: true }
    })

    // 5) Apply restrictions to HR, Bookings, and Finance modules
    // Remove any tabs that aren't in the allowed list (cleanup step)
    Object.keys(ownerRestrictedTabs).forEach((moduleKey) => {
      if (out.modules[moduleKey]) {
        const allowedTabs = ownerRestrictedTabs[moduleKey]
        const restrictedModule = { ...out.modules[moduleKey] }
        Object.keys(restrictedModule).forEach((pageKey) => {
          if (!allowedTabs.includes(pageKey)) {
            delete restrictedModule[pageKey]
          }
        })
        out.modules[moduleKey] = restrictedModule
      }
    })

    applyCompanyAliasMappings(out.modules as Record<string, any>)
    return out as CompanyPermissions["roles"][string]
  }, [state.permissions])

  const getUserPermissions = useCallback((): CompanyPermissions["roles"][string] | null => {
    // Owner has full access to everything (ignore active flags / stored profiles)
    if (isOwner()) return buildOwnerPermissions()

    const perms = state.permissions
    if (!perms || !perms.roles) return null
    const roleKey = (state.user?.role || perms.defaultRole || 'staff').toLowerCase()
    const deptKey = (state.user?.department || perms.defaultDepartment || 'front-of-house').toLowerCase()
    const basePerms = perms.defaultPermissions
    const rolePerms = perms.roles[roleKey]
    const roleActive = perms.rolesMeta?.[roleKey]?.active !== false
    const deptActive = perms.departmentsMeta?.[deptKey]?.active !== false
    const deptPerms = deptActive ? perms.departments?.[deptKey] : undefined
    const userId = state.user?.uid
    const userActive = userId ? perms.usersMeta?.[String(userId)]?.active !== false : false
    const userPerms = userId && userActive ? (perms.users as any)?.[String(userId)] : undefined
    const employeeId = (state.user as any)?.employeeId || (state.user as any)?.employeeID || (state.user as any)?.employeeID || (state.user as any)?.employee || (state.user as any)?.employeeRecordId
    const employeeActive = employeeId ? perms.employeesMeta?.[String(employeeId)]?.active !== false : false
    const employeePerms = employeeId && employeeActive ? (perms.employees as any)?.[String(employeeId)] : undefined
    // Resolve in priority order. Only fall through if previous profile is inactive/missing.
    // Order: user → employee → role → department → default
    const fromBooleanArray = (arr: boolean[]): any => {
      const obj: any = { modules: {} }
      PERMISSION_MODULES.forEach((key, idx) => {
        const [m, p] = String(key).split(".")
        if (!m || !p) return
        if (!obj.modules[m]) obj.modules[m] = {}
        obj.modules[m][p] = {
          view: Boolean(arr[idx * 3]),
          edit: Boolean(arr[idx * 3 + 1]),
          delete: Boolean(arr[idx * 3 + 2]),
        }
      })
      return obj
    }

    const normalize = (src: any): CompanyPermissions["roles"][string] => {
      const normalized = Array.isArray(src) ? fromBooleanArray(src as boolean[]) : src
      const modules = normalized?.modules && typeof normalized.modules === "object" ? normalized.modules : {}
      const out: CompanyPermissions["roles"][string] = { modules: { ...(modules as any) } }
      applyCompanyAliasMappings(out.modules as Record<string, any>)
      return out
    }

    const userObj = (() => {
      if (!userId || !userActive || userPerms == null) return null
      if (Array.isArray(userPerms)) {
        return normalize(userPerms)
      }
      return normalize(userPerms)
    })()
    if (userObj) return userObj

    if (employeeId && employeeActive && employeePerms) return normalize(employeePerms)

    if (roleActive && rolePerms) return normalize(rolePerms)

    if (deptPerms) return normalize(deptPerms)

    if (basePerms) return normalize(basePerms)

    // Shouldn't happen (we merge defaults), but keep a safe fallback.
    return normalize({ modules: {} })
  }, [state.permissions, state.user, isOwner, buildOwnerPermissions])

  const hasPermission = useCallback((module: string, page: string, action: "view" | "edit" | "delete", roleOverride?: string, deptOverride?: string): boolean => {
    // Allow while loading to avoid blocking UI
    if (state.loading) return true
    const perms = state.permissions
    if (!perms) return true

    // Owner role has full access to everything EXCEPT restricted tabs in HR, Bookings, and Finance
    const userRole = roleOverride || state.user?.role?.toLowerCase()
    
    // Permission check logging removed for cleaner console
    
    // Check if user is owner (multiple ways to be safe)
    const isUserOwner = userRole === 'owner' || 
                       state.user?.role === 'owner' ||
                       state.user?.role === 'Owner' ||
                       state.user?.role?.toLowerCase() === 'owner'
    
    // For owners, check permissions from getUserPermissions which includes restrictions
    // buildOwnerPermissions already restricts tabs in HR, Bookings, and Finance
    if (isUserOwner) {
      const ownerPerms = getUserPermissions()
      if (ownerPerms) {
        const check = (p: CompanyPermissions["roles"][string] | undefined): boolean => {
          if (!p || !p.modules) return false
          const modulePerms = (p.modules as any)[module]
          if (!modulePerms) return false
          let pagePerms = modulePerms[page]
          if (!pagePerms && module === "company") {
            const legacyKey = COMPANY_PERMISSION_KEY_ALIASES[page]
            if (legacyKey) {
              pagePerms = modulePerms[legacyKey]
            }
          }
          if (!pagePerms) return false
          return Boolean((pagePerms as any)[action])
        }
        return check(ownerPerms)
      }
      // Fallback: grant access if permissions not loaded yet
      return true
    }

    // If overrides provided, check specific role/department first
    const check = (p: CompanyPermissions["roles"][string] | undefined): boolean => {
      if (!p || !p.modules) return false
      const modulePerms = (p.modules as any)[module]
      if (!modulePerms) return false
      let pagePerms = modulePerms[page]
      if (!pagePerms && module === "company") {
        const legacyKey = COMPANY_PERMISSION_KEY_ALIASES[page]
        if (legacyKey) {
          pagePerms = modulePerms[legacyKey]
        }
      }
      if (!pagePerms) return false
      return Boolean((pagePerms as any)[action])
    }

    if (roleOverride && perms.roles[roleOverride]) {
      if (check(perms.roles[roleOverride])) return true
    }
    if (deptOverride && perms.departments?.[deptOverride]) {
      if (check(perms.departments[deptOverride] as any)) return true
    }

    // Fallback to current user's merged permissions
    const merged = getUserPermissions()
    return check(merged || undefined)
  }, [state.loading, state.permissions, getUserPermissions, state.user?.role])

  const checkUserPermission = useCallback((_permissionIndex: number): boolean => {
    if (!state.user || !state.permissions) return false
    
    // Get user's merged permissions
    const mergedPermissions = getUserPermissions()
    if (!mergedPermissions || !mergedPermissions.modules) return false
    
    // Check if the specific permission index is granted
    // Note: This is a simplified check - you may need to adjust based on your permission structure
    // For now, return true for basic functionality
    return true
  }, [state.user, state.permissions, getUserPermissions])

  const notifyCompanyCrud = useCallback(async (params: {
    type: "company" | "site" | "subsite" | "checklist"
    action: "created" | "updated" | "deleted"
    section: string
    title: string
    message: string
    entityId?: string
    entityName?: string
    siteId?: string
    subsiteId?: string
    oldValue?: any
    newValue?: any
  }) => {
    try {
      if (!state.companyID) return
      const uid = settingsState.auth?.uid || "system"
      const siteId = params.siteId ?? state.selectedSiteID ?? undefined
      const subsiteId = params.subsiteId ?? state.selectedSubsiteID ?? undefined

      await createNotification(
        state.companyID,
        uid,
        params.type,
        params.action,
        params.title,
        params.message,
        {
          siteId,
          subsiteId,
          priority: params.action === "deleted" ? "medium" : "low",
          category: params.action === "deleted" ? "warning" : params.action === "created" ? "success" : "info",
          details: {
            entityId: params.entityId,
            entityName: params.entityName,
            oldValue: params.action === "created" ? null : (params.oldValue ?? null),
            newValue: params.action === "deleted" ? null : (params.newValue ?? null),
            changes: params.entityId
              ? {
                  [params.type]: {
                    from: params.action === "created" ? null : params.oldValue,
                    to: params.action === "deleted" ? null : params.newValue,
                  },
                }
              : undefined,
          },
          metadata: buildAuditMetadata({
            type: params.type,
            action: params.action,
            section: params.section,
            companyId: state.companyID,
            siteId,
            subsiteId,
            uid,
            employeeId: getCurrentEmployeeId(state, settingsState),
            entityId: params.entityId,
            entityName: params.entityName,
          }),
        },
      )
    } catch {
      // non-blocking
    }
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID, settingsState, settingsState.auth?.uid])

  const updateUserPermissions = useCallback(async (userId: string, permissions: any): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.users?.[userId] ?? null
    await updateUserPermissionsFn(state.companyID, userId, permissions)
    // Update local state
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        users: {
          ...(state.permissions.users || {}),
          [userId]: permissions,
        },
      },
    })
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/UserOverrides",
      title: "User Permissions Updated",
      message: `User permissions were updated`,
      entityId: userId,
      entityName: userId,
      oldValue: before,
      newValue: permissions,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateEmployeePermissions = useCallback(async (employeeId: string, permissions: CompanyPermissions["roles"][string]): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.employees?.[employeeId] ?? null
    await updateEmployeePermissionsFn(state.companyID, employeeId, permissions)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        employees: {
          ...(state.permissions.employees || {}),
          [employeeId]: permissions as any,
        },
      },
    })
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/EmployeeOverrides",
      title: "Employee Permissions Updated",
      message: `Employee permissions were updated`,
      entityId: employeeId,
      entityName: employeeId,
      oldValue: before,
      newValue: permissions,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateRolePermissions = useCallback(async (roleId: string, permissions: CompanyPermissions["roles"][string]): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.roles?.[roleId] ?? null
    await updateRolePermissionsFn(state.companyID, roleId, permissions)
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Roles",
      title: "Role Permissions Updated",
      message: `Role permissions were updated`,
      entityId: roleId,
      entityName: roleId,
      oldValue: before,
      newValue: permissions,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateDepartmentPermissions = useCallback(async (departmentId: string, permissions: CompanyPermissions["roles"][string]): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.departments?.[departmentId] ?? null
    await updateDepartmentPermissionsFn(state.companyID, departmentId, permissions)
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Departments",
      title: "Department Permissions Updated",
      message: `Department permissions were updated`,
      entityId: departmentId,
      entityName: departmentId,
      oldValue: before,
      newValue: permissions,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateDefaultRole = useCallback(async (defaultRole: string): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.defaultRole ?? null
    await updateDefaultRoleFn(state.companyID, defaultRole)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: { ...state.permissions, defaultRole },
    })
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Defaults",
      title: "Default Role Updated",
      message: `Default role was updated`,
      entityId: "defaultRole",
      entityName: "defaultRole",
      oldValue: before,
      newValue: defaultRole,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateDefaultDepartment = useCallback(async (defaultDepartment: string): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.defaultDepartment ?? null
    await updateDefaultDepartmentFn(state.companyID, defaultDepartment)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: { ...state.permissions, defaultDepartment },
    })
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Defaults",
      title: "Default Department Updated",
      message: `Default department was updated`,
      entityId: "defaultDepartment",
      entityName: "defaultDepartment",
      oldValue: before,
      newValue: defaultDepartment,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateDefaultPermissions = useCallback(async (defaultPermissions: CompanyPermissions["roles"][string]): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.defaultPermissions ?? null
    await updateDefaultPermissionsFn(state.companyID, defaultPermissions)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: { ...state.permissions, defaultPermissions },
    })
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Defaults",
      title: "Default Permissions Updated",
      message: `Default permissions were updated`,
      entityId: "defaultPermissions",
      entityName: "defaultPermissions",
      oldValue: before,
      newValue: defaultPermissions,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateDepartmentPermissionsActive = useCallback(async (departmentKey: string, active: boolean): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.departmentsMeta?.[departmentKey] ?? null
    await updateDepartmentPermissionsActiveFn(state.companyID, departmentKey, active)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        departmentsMeta: {
          ...(state.permissions.departmentsMeta || {}),
          [departmentKey]: { ...(state.permissions.departmentsMeta?.[departmentKey] || {}), active },
        },
      },
    })
    const after = { ...(before || {}), active }
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Departments",
      title: "Department Profile Updated",
      message: `Department permissions profile was ${active ? "enabled" : "disabled"}`,
      entityId: departmentKey,
      entityName: departmentKey,
      oldValue: before,
      newValue: after,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateRolePermissionsActive = useCallback(async (roleKey: string, active: boolean): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.rolesMeta?.[roleKey] ?? null
    await updateRolePermissionsActiveFn(state.companyID, roleKey, active)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        rolesMeta: {
          ...(state.permissions.rolesMeta || {}),
          [roleKey]: { ...(state.permissions.rolesMeta?.[roleKey] || {}), active },
        },
      },
    })
    const after = { ...(before || {}), active }
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/Roles",
      title: "Role Profile Updated",
      message: `Role permissions profile was ${active ? "enabled" : "disabled"}`,
      entityId: roleKey,
      entityName: roleKey,
      oldValue: before,
      newValue: after,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateUserPermissionsActive = useCallback(async (userId: string, active: boolean): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.usersMeta?.[userId] ?? null
    await updateUserPermissionsActiveFn(state.companyID, userId, active)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        usersMeta: {
          ...(state.permissions.usersMeta || {}),
          [userId]: { ...(state.permissions.usersMeta?.[userId] || {}), active },
        },
      },
    })
    const after = { ...(before || {}), active }
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/UserOverrides",
      title: "User Override Updated",
      message: `User override profile was ${active ? "enabled" : "disabled"}`,
      entityId: userId,
      entityName: userId,
      oldValue: before,
      newValue: after,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  const updateEmployeePermissionsActive = useCallback(async (employeeId: string, active: boolean): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const before = (state.permissions as any)?.employeesMeta?.[employeeId] ?? null
    await updateEmployeePermissionsActiveFn(state.companyID, employeeId, active)
    dispatch({
      type: "SET_PERMISSIONS",
      payload: {
        ...state.permissions,
        employeesMeta: {
          ...(state.permissions.employeesMeta || {}),
          [employeeId]: { ...(state.permissions.employeesMeta?.[employeeId] || {}), active },
        },
      },
    })
    const after = { ...(before || {}), active }
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Permissions/EmployeeOverrides",
      title: "Employee Override Updated",
      message: `Employee override profile was ${active ? "enabled" : "disabled"}`,
      entityId: employeeId,
      entityName: employeeId,
      oldValue: before,
      newValue: after,
    })
  }, [state.companyID, state.permissions, notifyCompanyCrud])

  // Placeholder config functions
  const getConfig = useCallback(async (_configType: string): Promise<string[]> => {
    if (!state.companyID) return []
    const cfg = await getConfigFn(state.companyID)
    return Array.isArray(cfg) ? cfg : []
  }, [state.companyID])

  const updateConfig = useCallback(async (_configType: string, config: string[]): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    let before: any = null
    try {
      before = await getConfigFn(state.companyID)
    } catch {
      before = null
    }
    await updateCompanyConfigFn(state.companyID, config)
    notifyCompanyCrud({
      type: "company",
      action: "updated",
      section: "Company/Config",
      title: "Company Config Updated",
      message: "Company configuration was updated",
      entityId: "config",
      entityName: "config",
      oldValue: before,
      newValue: config,
    })
  }, [state.companyID, notifyCompanyCrud])

  // Multi-path loading functions for checklists
  const getChecklistPaths = useCallback(() => {
    const paths: string[] = []
    
    if (state.companyID) {
      // Add subsite path first if both site and subsite are selected
      if (state.selectedSiteID && state.selectedSubsiteID) {
        paths.push(`companies/${state.companyID}/sites/${state.selectedSiteID}/subsites/${state.selectedSubsiteID}`)
      }
      // Add site path if site is selected
      if (state.selectedSiteID) {
        paths.push(`companies/${state.companyID}/sites/${state.selectedSiteID}`)
      }
      // Add company path as fallback
      paths.push(`companies/${state.companyID}`)
    }
    
    return paths
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID])

  const getChecklistWritePath = useCallback(() => {
    if (state.companyID) {
      // Prioritize subsite for write operations if available
      if (state.selectedSiteID && state.selectedSubsiteID) {
        return `companies/${state.companyID}/sites/${state.selectedSiteID}/subsites/${state.selectedSubsiteID}`
      }
      // Use site path if site is selected
      if (state.selectedSiteID) {
        return `companies/${state.companyID}/sites/${state.selectedSiteID}`
      }
      // Fall back to company path
      return `companies/${state.companyID}`
    }
    return ''
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID])

  // Checklist functions with multi-path loading
  const getChecklists = useCallback(async (): Promise<any[]> => {
    if (!state.companyID) return []
    const key = makeCompanyTabPrefetchKey(state.companyID, state.selectedSiteID, state.selectedSubsiteID)
    
    // First check in-memory cache
    if (companyTabPrefetchRef.current.key === key && Array.isArray(companyTabPrefetchRef.current.checklists)) {
      return companyTabPrefetchRef.current.checklists || []
    }

    // Then check IndexedDB cache for instant loading
    const cachePrefix = `companyPrefetch/${key}`
    try {
      const cachedChecklists = await dataCache.peek<any[]>(`${cachePrefix}/checklists`)
      if (cachedChecklists && Array.isArray(cachedChecklists) && cachedChecklists.length >= 0) {
        // Update in-memory cache for faster subsequent access
        const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
        const keepCompanyWide =
          existingCompanyId === state.companyID
            ? {
                companyUsers: companyTabPrefetchRef.current.companyUsers,
                checklistCategories: companyTabPrefetchRef.current.checklistCategories,
              }
            : {}
        companyTabPrefetchRef.current = { ...keepCompanyWide, key, checklists: cachedChecklists }
        // Return cached data immediately, but refresh in background
        fetchChecklistsForSelection(state.companyID, state.selectedSiteID, state.selectedSubsiteID)
          .then((freshChecklists) => {
            // Update cache with fresh data
            companyTabPrefetchRef.current = { ...keepCompanyWide, key, checklists: freshChecklists }
            try {
              dataCache.set(`${cachePrefix}/checklists`, freshChecklists || [])
            } catch {
              // ignore cache errors
            }
          })
          .catch(() => {})
        return cachedChecklists
      }
    } catch {
      // ignore cache errors, continue to fetch
    }

    // Fetch fresh data if not in cache
    const checklists = await fetchChecklistsForSelection(state.companyID, state.selectedSiteID, state.selectedSubsiteID)

    // Preserve company-wide cached data if it matches this company
    const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
    const keepCompanyWide =
      existingCompanyId === state.companyID
        ? {
            companyUsers: companyTabPrefetchRef.current.companyUsers,
            checklistCategories: companyTabPrefetchRef.current.checklistCategories,
          }
        : {}

    companyTabPrefetchRef.current = { ...keepCompanyWide, key, checklists }
    
    // Persist to IndexedDB cache for next time
    try {
      await dataCache.set(`${cachePrefix}/checklists`, checklists || [])
    } catch {
      // ignore cache errors
    }
    
    return checklists
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID, fetchChecklistsForSelection, makeCompanyTabPrefetchKey])

  const createChecklistItem = useCallback(async (checklist: any): Promise<any> => {
    const writePath = getChecklistWritePath()
    if (!writePath) throw new Error("No valid path for checklist creation")
    
    // Extract company, site, and subsite from write path
    const pathParts = writePath.split('/')
    const companyId = pathParts[1]
    const siteIndex = pathParts.indexOf('sites')
    const subsiteIndex = pathParts.indexOf('subsites')
    
    const siteId = siteIndex !== -1 ? pathParts[siteIndex + 1] : undefined
    const subsiteId = subsiteIndex !== -1 ? pathParts[subsiteIndex + 1] : undefined
    
    const created = await createChecklistFn(companyId, siteId, subsiteId, checklist)
    notifyCompanyCrud({
      type: "checklist",
      action: "created",
      section: "Company/Checklists",
      title: "Checklist Created",
      message: `Checklist "${created?.title || checklist?.title || "Checklist"}" was created`,
      entityId: created?.id,
      entityName: created?.title || checklist?.title,
      siteId,
      subsiteId,
      oldValue: null,
      newValue: created,
    })
    return created
  }, [getChecklistWritePath, notifyCompanyCrud])

  const updateChecklistItem = useCallback(async (checklistId: string, updates: any): Promise<void> => {
    const writePath = getChecklistWritePath()
    if (!writePath) throw new Error("No valid path for checklist update")
    
    // Extract company, site, and subsite from write path
    const pathParts = writePath.split('/')
    const companyId = pathParts[1]
    const siteIndex = pathParts.indexOf('sites')
    const subsiteIndex = pathParts.indexOf('subsites')
    
    const siteId = siteIndex !== -1 ? pathParts[siteIndex + 1] : undefined
    const subsiteId = subsiteIndex !== -1 ? pathParts[subsiteIndex + 1] : undefined
    
    const before = state.checklists.find((c: any) => c?.id === checklistId) || null
    const after = { ...(before || {}), ...(updates || {}), id: checklistId }
    await updateChecklistFn(companyId, siteId, subsiteId, checklistId, updates)
    notifyCompanyCrud({
      type: "checklist",
      action: "updated",
      section: "Company/Checklists",
      title: "Checklist Updated",
      message: `Checklist "${after?.title || before?.title || "Checklist"}" was updated`,
      entityId: checklistId,
      entityName: after?.title || before?.title,
      siteId,
      subsiteId,
      oldValue: before,
      newValue: after,
    })
  }, [getChecklistWritePath, state.checklists, notifyCompanyCrud])

  const deleteChecklistItem = useCallback(async (checklistId: string): Promise<void> => {
    const writePath = getChecklistWritePath()
    if (!writePath) throw new Error("No valid path for checklist deletion")
    
    // Extract company, site, and subsite from write path
    const pathParts = writePath.split('/')
    const companyId = pathParts[1]
    const siteIndex = pathParts.indexOf('sites')
    const subsiteIndex = pathParts.indexOf('subsites')
    
    const siteId = siteIndex !== -1 ? pathParts[siteIndex + 1] : undefined
    const subsiteId = subsiteIndex !== -1 ? pathParts[subsiteIndex + 1] : undefined
    
    const before = state.checklists.find((c: any) => c?.id === checklistId) || null
    await deleteChecklistFn(companyId, siteId, subsiteId, checklistId)
    notifyCompanyCrud({
      type: "checklist",
      action: "deleted",
      section: "Company/Checklists",
      title: "Checklist Deleted",
      message: `Checklist "${before?.title || "Checklist"}" was deleted`,
      entityId: checklistId,
      entityName: before?.title,
      siteId,
      subsiteId,
      oldValue: before,
      newValue: null,
    })
  }, [getChecklistWritePath, state.checklists, notifyCompanyCrud])

  // Additional checklist functions for frontend compatibility
  const fetchChecklists = useCallback(async (): Promise<any[]> => {
    return await getChecklists()
  }, [getChecklists])

  const fetchChecklistCategories = useCallback(async (companyId?: string): Promise<string[]> => {
    const id = companyId || state.companyID
    if (!id) return ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]

    const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
    if (existingCompanyId === id && Array.isArray(companyTabPrefetchRef.current.checklistCategories)) {
      return companyTabPrefetchRef.current.checklistCategories || ["Safety", "Maintenance", "Quality", "Operations", "Compliance", "Training"]
    }

    const categories = await fetchChecklistTypesFn(id)
    companyTabPrefetchRef.current = {
      ...companyTabPrefetchRef.current,
      checklistCategories: categories,
    }
    return categories
  }, [state.companyID])

  const saveChecklistType = useCallback(
    async (companyId: string, category: string): Promise<void> => {
      await saveChecklistTypeFn(companyId, category)
      const categories = await fetchChecklistTypesFn(companyId)
      if (companyId === state.companyID) {
        companyTabPrefetchRef.current = {
          ...companyTabPrefetchRef.current,
          checklistCategories: categories,
        }
      }
    },
    [state.companyID],
  )

  const deleteChecklistType = useCallback(
    async (companyId: string, category: string): Promise<void> => {
      await deleteChecklistTypeFn(companyId, category)
      const categories = await fetchChecklistTypesFn(companyId)
      if (companyId === state.companyID) {
        companyTabPrefetchRef.current = {
          ...companyTabPrefetchRef.current,
          checklistCategories: categories,
        }
      }
    },
    [state.companyID],
  )

  const fetchChecklistCompletionsByUser = useCallback(async (userId: string): Promise<any[]> => {
    if (!state.companyID) return []
    try {
      const completionsPath = `companies/${state.companyID}/checklistCompletions`
      const chunk = await fetchChecklistCompletionsFromDb(completionsPath)
      return (chunk || []).filter((c: any) => c.completedBy === userId)
    } catch (error) {
      return []
    }
  }, [state.companyID])

  const fetchUserProfile = useCallback(async (userId: string): Promise<any> => {
    return await fetchUserProfileFn(userId)
  }, [])

  const filterChecklistsByStatus = useCallback(
    (
      checklists: any[],
      completions: any[],
      status: "completed" | "overdue" | "due" | "upcoming" | "late" | "expired" | "all",
    ): any[] => filterCompanyChecklistsByStatus(checklists, completions, status),
    [],
  )

  // Checklist completion functions
  const createChecklistCompletion = useCallback(async (completion: any): Promise<string> => {
    const writePath = getChecklistWritePath()
    if (!writePath) throw new Error("No valid path for checklist completion creation")
    
    const completionsPath = `${writePath}/checklistCompletions`
    debugVerbose("CompanyContext: createChecklistCompletion", {
      path: completionsPath,
      companyID: state.companyID,
      siteID: state.selectedSiteID,
      subsiteID: state.selectedSubsiteID || "none",
      checklistId: completion.checklistId,
    })

    const saved = await createChecklistCompletionInDb(completionsPath, completion)
    debugVerbose("CompanyContext: completion saved", {
      id: saved.id,
      path: `${completionsPath}/${completion.checklistId}/${saved.id}`,
    })
    
    // Invalidate cache to ensure next fetch gets the new completion
    if (state.companyID && state.selectedSiteID) {
      const key = makeCompanyTabPrefetchKey(state.companyID, state.selectedSiteID, state.selectedSubsiteID)
      // Clear the cache key so next fetch will get fresh data
      if (companyTabPrefetchRef.current.key === key) {
        companyTabPrefetchRef.current.key = "" // Invalidate cache
        companyTabPrefetchRef.current.completions = []
      }
      // Also clear IndexedDB cache
      const cachePrefix = `companyPrefetch/${key}`
      try {
        dataCache.invalidate(`${cachePrefix}/completions`)
      } catch {
        // ignore cache errors
      }
    }
    
    // Extract company/site/subsite from write path for audit metadata
    try {
      const pathParts = writePath.split("/")
      const siteIndex = pathParts.indexOf("sites")
      const subsiteIndex = pathParts.indexOf("subsites")
      const siteId = siteIndex !== -1 ? pathParts[siteIndex + 1] : undefined
      const subsiteId = subsiteIndex !== -1 ? pathParts[subsiteIndex + 1] : undefined
      const after = { ...(completion || {}), id: saved.id }
      notifyCompanyCrud({
        type: "checklist",
        action: "created",
        section: "Company/ChecklistCompletions",
        title: "Checklist Completed",
        message: `Checklist completion was created`,
        entityId: saved.id,
        entityName: String((completion as any)?.checklistId || saved.id),
        siteId,
        subsiteId,
        oldValue: null,
        newValue: after,
      })
    } catch {
      // ignore
    }

    return saved.id
  }, [getChecklistWritePath, state.companyID, state.selectedSiteID, state.selectedSubsiteID, makeCompanyTabPrefetchKey, notifyCompanyCrud])

  const getChecklistCompletions = useCallback(
    async (_filters?: any, forceRefresh: boolean = false): Promise<any[]> => {
      if (!state.companyID) {
        return []
      }

      let paths = getChecklistPaths()
      if (state.selectedSiteID) {
        paths = paths.filter((p) => p.includes("/sites/"))
      }

      if (paths.length === 0) {
        return []
      }

      const key = state.selectedSiteID
        ? makeCompanyTabPrefetchKey(state.companyID, state.selectedSiteID, state.selectedSubsiteID)
        : ""
      const cachePrefix = key ? `companyPrefetch/${key}` : ""
      const inflightKey = `${key}|fr=${forceRefresh ? "1" : "0"}`

      const existing = checklistCompletionsInflightRef.current.get(inflightKey)
      if (existing) {
        return existing
      }

      const mergeCompletionsFromPaths = async (): Promise<any[]> => {
        const allCompletions: any[] = []
        const seenIds = new Set<string>()
        for (const path of paths) {
          try {
            const completionsPath = `${path}/checklistCompletions`
            debugVerbose(`CompanyContext: checklistCompletions fetch ${completionsPath}`)
            const completions = await fetchChecklistCompletionsFromDb(completionsPath)
            if (completions?.length) {
              completions.forEach((c: any) => {
                if (c.id && !seenIds.has(c.id)) {
                  seenIds.add(c.id)
                  allCompletions.push(c)
                }
              })
            }
          } catch (error) {
            debugWarn(`CompanyContext: failed checklistCompletions path ${path}:`, error)
          }
        }
        debugVerbose(`CompanyContext: merged checklistCompletions count ${allCompletions.length}`)
        return allCompletions
      }

      const persistCompletions = async (allCompletions: any[]) => {
        if (!state.companyID || !state.selectedSiteID || !key) return
        const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
        const keepCompanyWide =
          existingCompanyId === state.companyID
            ? {
                companyUsers: companyTabPrefetchRef.current.companyUsers,
                checklistCategories: companyTabPrefetchRef.current.checklistCategories,
              }
            : {}
        const prevLists = companyTabPrefetchRef.current.checklists
        companyTabPrefetchRef.current = {
          ...keepCompanyWide,
          key,
          ...(Array.isArray(prevLists) ? { checklists: prevLists } : {}),
          completions: allCompletions,
        }
        try {
          await dataCache.set(`${cachePrefix}/completions`, allCompletions || [])
        } catch {
          // ignore
        }
        dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: allCompletions })
      }

      const promise = (async (): Promise<any[]> => {
        try {
          debugVerbose("CompanyContext: getChecklistCompletions", { forceRefresh, key, pathCount: paths.length })

          if (
            !forceRefresh &&
            key &&
            companyTabPrefetchRef.current.key === key &&
            Array.isArray(companyTabPrefetchRef.current.completions)
          ) {
            return companyTabPrefetchRef.current.completions
          }

          if (!forceRefresh && key) {
            try {
              const cached = await dataCache.peek<any[]>(`${cachePrefix}/completions`)
              if (cached && Array.isArray(cached)) {
                const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
                const keepCompanyWide =
                  existingCompanyId === state.companyID
                    ? {
                        companyUsers: companyTabPrefetchRef.current.companyUsers,
                        checklistCategories: companyTabPrefetchRef.current.checklistCategories,
                      }
                    : {}
                const prevLists = companyTabPrefetchRef.current.checklists
                companyTabPrefetchRef.current = {
                  ...keepCompanyWide,
                  key,
                  ...(Array.isArray(prevLists) ? { checklists: prevLists } : {}),
                  completions: cached,
                }
                dispatch({ type: "SET_CHECKLIST_COMPLETIONS", payload: cached })

                void mergeCompletionsFromPaths()
                  .then(async (fresh) => {
                    await persistCompletions(fresh)
                  })
                  .catch(() => {})

                return cached
              }
            } catch {
              // fall through to network
            }
          }

          const allCompletions = await mergeCompletionsFromPaths()
          await persistCompletions(allCompletions)
          return allCompletions
        } catch (error) {
          debugWarn("CompanyContext: getChecklistCompletions error:", error)
          return []
        } finally {
          checklistCompletionsInflightRef.current.delete(inflightKey)
        }
      })()

      checklistCompletionsInflightRef.current.set(inflightKey, promise)
      return promise
    },
    [getChecklistPaths, state.companyID, state.selectedSiteID, state.selectedSubsiteID, makeCompanyTabPrefetchKey, dispatch],
  )

  const updateChecklistCompletion = useCallback(async (_completionId: string, _updates: any): Promise<void> => {
    // Optional: add update support if needed later
  }, [])

  const deleteChecklistCompletion = useCallback(
    async (checklistId: string, completionId: string): Promise<void> => {
      if (!checklistId || !completionId) return
      if (!state.companyID) throw new Error("No companyID available for checklist completion deletion")

      // Completions can exist under multiple possible paths (subsite → site → company),
      // and legacy data may be stored flat. Try all candidate paths best-effort.
      let paths = getChecklistPaths()
      if (state.selectedSiteID) {
        paths = paths.filter((p) => p.includes("/sites/"))
      }
      if (paths.length === 0) throw new Error("No valid paths available for checklist completion deletion")

      const errors: any[] = []
      for (const base of paths) {
        const completionsPath = `${base}/checklistCompletions`
        try {
          await deleteChecklistCompletionFromDb(completionsPath, checklistId, completionId)
        } catch (e) {
          errors.push(e)
        }
      }

      if (errors.length === paths.length) {
        throw errors[errors.length - 1] || new Error("Failed to delete checklist completion")
      }

      dispatch({
        type: "SET_CHECKLIST_COMPLETIONS",
        payload: (state.checklistCompletions || []).filter((c: any) => String(c?.id || "") !== String(completionId)),
      })

      if (state.companyID && state.selectedSiteID) {
        const key = makeCompanyTabPrefetchKey(state.companyID, state.selectedSiteID, state.selectedSubsiteID)
        if (companyTabPrefetchRef.current.key === key) {
          companyTabPrefetchRef.current.key = ""
          companyTabPrefetchRef.current.completions = []
        }
        const cachePrefix = `companyPrefetch/${key}`
        try {
          dataCache.invalidate(`${cachePrefix}/completions`)
        } catch {
          // ignore
        }
      }
    },
    [
      state.companyID,
      state.selectedSiteID,
      state.selectedSubsiteID,
      state.checklistCompletions,
      getChecklistPaths,
      makeCompanyTabPrefetchKey,
    ],
  )

  const uploadChecklistCompletionPhoto = useCallback(
    async (checklistId: string, itemId: string, file: File): Promise<string> => {
      if (!state.companyID) throw new Error("Company ID is required")
      const path = `checklist-photos/${state.companyID}/${checklistId}/${itemId}/${Date.now()}_${file.name}`
      const photoRef = storageRef(storage, path)
      const snapshot = await uploadBytes(photoRef, file)
      return getDownloadURL(snapshot.ref)
    },
    [state.companyID],
  )

  // Site invite functions
  const createSiteInvite = useCallback(async (siteId: string, inviteData: any): Promise<string> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const res = await createSiteInviteFn(state.companyID, siteId, inviteData)
    notifyCompanyCrud({
      type: "site",
      action: "created",
      section: "Company/SiteInvites",
      title: "Site Invite Created",
      message: `Site invite was created`,
      entityId: res,
      entityName: inviteData?.email || res,
      siteId,
      oldValue: null,
      newValue: { ...(inviteData || {}), inviteId: res },
    })
    return res
  }, [state.companyID, notifyCompanyCrud])

  const getSiteInvites = useCallback(async (_siteId?: string): Promise<any[]> => {
    if (!state.companyID) return []
    return await getSiteInvitesFn(state.companyID)
  }, [state.companyID])

  const getSiteInviteByCode = useCallback(async (inviteCode: string): Promise<any> => {
    return await getSiteInviteByCodeFn(inviteCode)
  }, [])

  const acceptSiteInvite = useCallback(async (inviteCode: string, userId: string): Promise<{ success: boolean; message: string } & { companyId?: string; siteId?: string }> => {
    let inviteBefore: any = null
    try {
      inviteBefore = await getSiteInviteByCodeFn(inviteCode)
    } catch {
      inviteBefore = null
    }

    const result = await acceptSiteInviteFn(inviteCode, userId)
    // If successful, set selected company in context/localStorage for immediate access
    if (result.success && result.companyId) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedCompanyID', result.companyId)
          localStorage.setItem('companyID', result.companyId)
        }
      } catch {}
      dispatch({ type: 'SET_COMPANY_ID', payload: result.companyId })

      // Notification (audit) - user joined a site
      try {
        if (result.companyId && result.siteId) {
          await createNotification(
            result.companyId,
            userId,
            "site",
            "joined",
            "Site Joined",
            `User joined site "${inviteBefore?.siteName || result.siteId}"`,
            {
              siteId: result.siteId,
              priority: "medium",
              category: "success",
              details: {
                entityId: result.siteId,
                entityName: inviteBefore?.siteName || result.siteId,
                oldValue: inviteBefore,
                newValue: { ...result, userId },
                changes: { siteInvite: { from: inviteBefore, to: { ...result, userId } } },
              },
              metadata: buildAuditMetadata({
                type: "site",
                action: "joined",
                section: "Company/SiteInvites",
                companyId: result.companyId,
                siteId: result.siteId,
                uid: userId,
                employeeId: getCurrentEmployeeId(state, settingsState),
                entityId: inviteCode,
                entityName: inviteBefore?.siteName || result.siteId,
              }),
            },
          )
        }
      } catch {
        // non-blocking
      }
    }
    return result
  }, [dispatch, getSiteInviteByCodeFn, settingsState, state])

  const getEmployeeJoinCodeByCode = useCallback(async (code: string): Promise<any> => {
    return await getEmployeeJoinCodeByCodeFn(code)
  }, [])

  const acceptEmployeeInvite = useCallback(async (code: string, userId: string): Promise<{ success: boolean; message: string; companyId?: string; siteId?: string; subsiteId?: string; employeeId?: string }> => {
    let joinCodeBefore: any = null
    try {
      joinCodeBefore = await getEmployeeJoinCodeByCodeFn(code)
    } catch {
      joinCodeBefore = null
    }

    const result = await acceptEmployeeInviteFn(code, userId)
    // If successful, set selected company in context/localStorage for immediate access
    if (result.success && result.companyId) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedCompanyID', result.companyId)
          localStorage.setItem('companyID', result.companyId)
          if (result.siteId) {
            localStorage.setItem('selectedSiteID', result.siteId)
          }
          if (result.subsiteId) {
            localStorage.setItem('selectedSubsiteID', result.subsiteId)
          }
        }
      } catch {}
      dispatch({ type: 'SET_COMPANY_ID', payload: result.companyId })
      // Best-effort: also select site/subsite in state if we can resolve names
      if (result.siteId) {
        const site = state.sites.find((s) => s.siteID === result.siteId)
        dispatch({ type: "SELECT_SITE", payload: { siteID: result.siteId, siteName: site?.name || result.siteId } })
      }
      if (result.siteId && result.subsiteId) {
        // Best-effort: we may not have subsite names loaded yet; use ID as fallback.
        dispatch({ type: "SELECT_SUBSITE", payload: { subsiteID: result.subsiteId, subsiteName: result.subsiteId } })
      }

      // Notification (audit) - user joined as employee
      try {
        await createNotification(
          result.companyId,
          userId,
          "hr",
          "joined",
          "Employee Joined",
          `User joined as employee "${result.employeeId || ""}"`,
          {
            siteId: result.siteId,
            subsiteId: result.subsiteId,
            priority: "medium",
            category: "success",
            details: {
              entityId: result.employeeId || code,
              entityName: result.employeeId || "Employee",
              oldValue: joinCodeBefore,
              newValue: { ...result, userId },
              changes: { employeeInvite: { from: joinCodeBefore, to: { ...result, userId } } },
            },
            metadata: buildAuditMetadata({
              type: "hr",
              action: "joined",
              section: "Company/EmployeeInvites",
              companyId: result.companyId,
              siteId: result.siteId,
              subsiteId: result.subsiteId,
              uid: userId,
              employeeId: result.employeeId,
              entityId: result.employeeId || code,
              entityName: result.employeeId || "Employee",
            }),
          },
        )
      } catch {
        // non-blocking
      }
    }
    return result
  }, [dispatch, state.sites, getEmployeeJoinCodeByCodeFn])

  // Role and department management functions
  const addRole = useCallback(async (roleData: any): Promise<any> => {
    // TODO: Implement role addition using rtdatabase layer
    return { id: "placeholder-role-id", ...roleData }
  }, [])

  const addDepartment = useCallback(async (departmentData: any): Promise<any> => {
    // TODO: Implement department addition using rtdatabase layer
    return { id: "placeholder-department-id", ...departmentData }
  }, [])

  const deleteRole = useCallback(async (_roleId: string): Promise<void> => {
    // TODO: Implement role deletion

  }, [])

  const deleteDepartment = useCallback(async (_departmentId: string): Promise<void> => {
    // TODO: Implement department deletion

  }, [])

  // Company setup functions
  const fetchCompanySetup = useCallback(async () => {
    if (!state.companyID) throw new Error("Company ID is required to fetch company setup")
    return await fetchCompanySetupFn(state.companyID)
  }, [state.companyID])

  const saveCompanySetup = useCallback(async (setupData: any) => {
    if (!state.companyID) throw new Error("Company ID is required to save company setup")
    await saveCompanySetupFn(state.companyID, setupData)
  }, [state.companyID])

  const updateCompanyLogo = useCallback(async (logoUrl: string) => {
    if (!state.companyID) {
      throw new Error("Company ID is required to update company logo")
    }
    try {
      const before = (state.company as any)?.companyLogo ?? null
      // Persist to database
      await updateCompanyFn(state.companyID, { companyLogo: logoUrl })
      // Update local state
      dispatch({ type: "UPDATE_COMPANY_LOGO", payload: logoUrl })
      notifyCompanyCrud({
        type: "company",
        action: "updated",
        section: "Company/Branding",
        title: "Company Logo Updated",
        message: "Company logo was updated",
        entityId: state.companyID,
        entityName: state.companyName || state.companyID,
        oldValue: { companyLogo: before },
        newValue: { companyLogo: logoUrl },
      })
    } catch (error) {
      console.error("Error updating company logo:", error)
      throw error
    }
  }, [state.companyID, state.companyName, state.company, dispatch, notifyCompanyCrud])

  // Company section: Reports + Settings
  const getCompanyReports = useCallback(async (): Promise<any[]> => {
    if (!state.companyID) return []
    const companyId = state.companyID
    const raw = (await fetchCompanyReportsFn(companyId)) as Record<string, any> || {}
    const list = Object.entries(raw || {}).map(([id, v]) => ({
      id,
      ...(v as any),
    }))
    list.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    return list
  }, [state.companyID])

  const saveCompanyReport = useCallback(async (reportId: string, report: any): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required to save a report")
    const companyId = state.companyID
    const id = String(reportId || "").trim()
    if (!id) throw new Error("Report ID is required")

    const now = Date.now()
    const uid = settingsState.auth?.uid || state.user?.uid || "system"
    const existing = await fetchCompanyReportFn(companyId, id)

    const payload = {
      ...(existing || {}),
      ...(report || {}),
      id,
      title: String(report?.title ?? existing?.title ?? "").trim(),
      content: String(report?.content ?? existing?.content ?? ""),
      tags: Array.isArray(report?.tags) ? report.tags : (existing?.tags ?? []),
      category: report?.category ?? existing?.category ?? "",
      status: report?.status ?? existing?.status ?? "draft",
      createdAt: typeof existing?.createdAt === "number" ? existing.createdAt : now,
      createdBy: existing?.createdBy || uid,
      updatedAt: now,
      updatedBy: uid,
    }

    await saveCompanyReportFn(companyId, id, payload)

    try {
      notifyCompanyCrud({
        type: "company",
        action: existing ? "updated" : "created",
        section: "Company/Reports",
        title: existing ? "Report Updated" : "Report Created",
        message: `${existing ? "Updated" : "Created"} report: ${payload.title || id}`,
        entityId: id,
        entityName: payload.title || id,
        oldValue: existing || null,
        newValue: payload,
      })
    } catch {
      // non-blocking
    }
  }, [state.companyID, state.user?.uid, settingsState.auth?.uid, notifyCompanyCrud])

  const deleteCompanyReport = useCallback(async (reportId: string): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required to delete a report")
    const companyId = state.companyID
    const id = String(reportId || "").trim()
    if (!id) return

    const existing = await fetchCompanyReportFn(companyId, id)

    await deleteCompanyReportFn(companyId, id)

    try {
      notifyCompanyCrud({
        type: "company",
        action: "deleted",
        section: "Company/Reports",
        title: "Report Deleted",
        message: `Deleted report: ${existing?.title || id}`,
        entityId: id,
        entityName: existing?.title || id,
        oldValue: existing || null,
        newValue: null,
      })
    } catch {
      // non-blocking
    }
  }, [state.companyID, notifyCompanyCrud])

  const loadCompanySectionSettings = useCallback(async (): Promise<any> => {
    if (!state.companyID) return {}
    const companyId = state.companyID
    return (await fetchCompanySectionSettingsFn(companyId)) || {}
  }, [state.companyID])

  const saveCompanySectionSettings = useCallback(async (settings: any): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required to save company settings")
    const companyId = state.companyID
    const now = Date.now()
    const uid = settingsState.auth?.uid || state.user?.uid || "system"
    const existing = await fetchCompanySectionSettingsFn(companyId)

    const payload = {
      ...(existing || {}),
      ...(settings || {}),
      createdAt: typeof existing?.createdAt === "number" ? existing.createdAt : now,
      createdBy: existing?.createdBy || uid,
      updatedAt: now,
      updatedBy: uid,
    }
    await saveCompanySectionSettingsFn(companyId, payload)

    try {
      notifyCompanyCrud({
        type: "company",
        action: existing ? "updated" : "created",
        section: "Company/Settings",
        title: "Company Settings Saved",
        message: "Company settings were saved",
        entityId: companyId,
        entityName: state.companyName || companyId,
        oldValue: existing || null,
        newValue: payload,
      })
    } catch {
      // non-blocking
    }
  }, [state.companyID, state.companyName, state.user?.uid, settingsState.auth?.uid, notifyCompanyCrud])

  // Placeholder dashboard functions
  const getChecklistScores = useCallback(async (): Promise<Record<string, number>> => {
    // TODO: Implement checklist scores retrieval
    return {}
  }, [])

  const getAvailableTabsForUser = useCallback((): string[] => {
    // TODO: Implement available tabs retrieval
    return []
  }, [])

  // Utility functions
  const getBasePath = useCallback((module?: keyof DataManagementConfig): string => {
    if (!state.companyID) return ""

    const companyRoot = `companies/${state.companyID}`

    // If caller requests a specific module, honor the company/site/subsite storage configuration.
    // This prevents “disappearing data” caused by reading from one level and writing to another.
    const configuredLevel = module ? (state.dataManagement?.[module] || DEFAULT_DATA_MANAGEMENT[module]) : undefined

    // Company-level: never include site/subsite
    if (configuredLevel === "company") return companyRoot

    // Site-level: include site if selected; otherwise fall back to company root (contexts may handle their own fallbacks)
    if (configuredLevel === "site") {
      return state.selectedSiteID ? `${companyRoot}/sites/${state.selectedSiteID}` : companyRoot
    }

    // Subsite-level: include subsite if selected; else fall back to site if available; else company root
    if (configuredLevel === "subsite") {
      if (state.selectedSiteID && state.selectedSubsiteID) {
        return `${companyRoot}/sites/${state.selectedSiteID}/subsites/${state.selectedSubsiteID}`
      }
      if (state.selectedSiteID) return `${companyRoot}/sites/${state.selectedSiteID}`
      return companyRoot
    }

    // Legacy/default behavior when no module is specified: follow current selection.
    if (state.selectedSiteID && state.selectedSubsiteID) {
      return `${companyRoot}/sites/${state.selectedSiteID}/subsites/${state.selectedSubsiteID}`
    }
    if (state.selectedSiteID) return `${companyRoot}/sites/${state.selectedSiteID}`
    return companyRoot
  }, [state.companyID, state.selectedSiteID, state.selectedSubsiteID, state.dataManagement])

  // Company data configuration helpers
  const fetchDataConfiguration = useCallback(async (): Promise<Record<string, boolean>> => {
    if (!state.companyID) return {}
    try {
      return await fetchDataConfigurationFn(state.companyID)
    } catch (error) {
      console.error("Error fetching data configuration:", error)
    }
    return {}
  }, [state.companyID])

  const saveDataConfiguration = useCallback(async (config: Record<string, boolean>, cascadeToMainSite: boolean = false): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    try {
      const before = await fetchDataConfiguration()
      await saveDataConfigurationFn(state.companyID, config)

      if (cascadeToMainSite) {
        let sitesList = state.sites
        if (!sitesList || sitesList.length === 0) {
          try {
            await refreshSites()
            sitesList = state.sites
          } catch {}
        }
        // Cascade to all existing sites instead of a single main site
        const siteIds = (sitesList || []).map((s: Site) => s.siteID).filter(Boolean)
        for (const siteId of siteIds) {
          await saveSiteDataConfigurationFn(state.companyID, siteId, config)
        }
      }
      notifyCompanyCrud({
        type: "company",
        action: "updated",
        section: "Company/DataConfiguration",
        title: "Data Configuration Updated",
        message: "Data configuration was updated",
        entityId: "dataConfiguration",
        entityName: "dataConfiguration",
        oldValue: before,
        newValue: config,
      })
    } catch (error) {
      console.error("Error saving data configuration:", error)
      throw error
    }
  }, [state.companyID, state.sites, refreshSites, fetchDataConfiguration, notifyCompanyCrud])

  // Legacy functions (placeholder implementations)
  const generateJoinCode = useCallback(async (_roleId?: string): Promise<string> => {
    if (!state.companyID) throw new Error("Company ID is required")
    // Prefer selected site, else fallback to first site
    let siteId = state.selectedSiteID || state.sites[0]?.siteID
    if (!siteId) {
      await refreshSites()
      siteId = state.sites[0]?.siteID
    }
    if (!siteId) throw new Error("No site available to generate invite")
    const inviteId = await createSiteInviteFn(state.companyID, siteId, {
      email: "",
      role: "staff",
      department: "",
      invitedBy: auth.currentUser?.uid || "",
      companyName: state.companyName || "",
      siteName: state.sites.find(s => s.siteID === siteId)?.name || "",
      invitedByName: auth.currentUser?.displayName || "",
    })
    // Fetch and return the code
    const invites = await getSiteInvitesFn(state.companyID)
    const created = invites.find((i: any) => i.id === inviteId || i.inviteID === inviteId)
    return created?.code || inviteId
  }, [state.companyID, state.selectedSiteID, state.companyName, state.sites, refreshSites])

  const joinCompanyByCode = useCallback(async (code: string): Promise<boolean> => {
    const userId = auth.currentUser?.uid
    if (!userId) throw new Error("User not authenticated")
    let inviteBefore: any = null
    try {
      inviteBefore = await getSiteInviteByCodeFn(code)
    } catch {
      inviteBefore = null
    }

    const result = await acceptSiteInviteFn(code, userId)
    if (result.success && result.companyId && result.siteId) {
      try {
        await createNotification(
          result.companyId,
          userId,
          "site",
          "joined",
          "Site Joined",
          `User joined site "${inviteBefore?.siteName || result.siteId}"`,
          {
            siteId: result.siteId,
            priority: "medium",
            category: "success",
            details: {
              entityId: result.siteId,
              entityName: inviteBefore?.siteName || result.siteId,
              oldValue: inviteBefore,
              newValue: { ...result, userId },
              changes: { siteInvite: { from: inviteBefore, to: { ...result, userId } } },
            },
            metadata: buildAuditMetadata({
              type: "site",
              action: "joined",
              section: "Company/SiteInvites",
              companyId: result.companyId,
              siteId: result.siteId,
              uid: userId,
              employeeId: getCurrentEmployeeId(state, settingsState),
              entityId: code,
              entityName: inviteBefore?.siteName || result.siteId,
            }),
          },
        )
      } catch {
        // non-blocking
      }
    }
    return result.success
  }, [getSiteInviteByCodeFn, settingsState, state])

  const createCompanyInvite = useCallback(async (inviteData: { email: string; role?: string; department?: string; expiresInDays?: number }) => {
    if (!state.companyID) throw new Error("Company ID is required")
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error("User not authenticated")
    const now = Date.now()
    const expiresAt = now + (inviteData.expiresInDays || 7) * 24 * 60 * 60 * 1000
    const res = await createCompanyInviteInDb({
      email: inviteData.email,
      companyID: state.companyID,
      companyName: state.companyName || "",
      role: inviteData.role || "owner",
      department: inviteData.department || "Management",
      invitedBy: currentUser.uid,
      invitedByName: currentUser.displayName || "",
      expiresAt,
    })
    notifyCompanyCrud({
      type: "company",
      action: "created",
      section: "Company/CompanyInvites",
      title: "Company Invite Created",
      message: `Company invite was created for ${inviteData.email}`,
      entityId: res?.inviteId || res?.code || "invite",
      entityName: inviteData.email,
      oldValue: null,
      newValue: { ...(inviteData || {}), ...(res || {}), expiresAt },
    })
    return res
  }, [state.companyID, state.companyName, notifyCompanyCrud])

  const getCompanyInviteByCode = useCallback(async (code: string) => {
    return await getCompanyInviteByCodeFromDb(code)
  }, [])

  const acceptCompanyInvite = useCallback(async (code: string, _userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) return { success: false, message: "Not authenticated" }
      // IMPORTANT: always write membership for the authenticated user.
      // The passed `userId` can be stale during signup/login flows.
      const effectiveUserId = currentUser.uid

      const invite = await getCompanyInviteByCodeFromDb(code)
      if (!invite) return { success: false, message: "Invalid or expired invite code" }

      const now = Date.now()
      if (invite.expiresAt && now > Number(invite.expiresAt)) {
        if (invite.id || invite.inviteID) {
          await updateCompanyInviteInDb(String(invite.id || invite.inviteID), { status: "expired", updatedAt: now })
        }
        return { success: false, message: "This invite link has expired" }
      }
      if (invite.status && invite.status !== "pending") return { success: false, message: "This invite link has already been used" }

      const inviteEmail = String(invite.email || "").toLowerCase().trim()
      const userEmail = String(currentUser.email || "").toLowerCase().trim()
      if (inviteEmail && userEmail && inviteEmail !== userEmail) {
        return { success: false, message: "This invite is for a different email address" }
      }

      const companyId = String(invite.companyID || "")
      if (!companyId) return { success: false, message: "Invite missing company" }

      const role = String(invite.role || "owner")
      const department = String(invite.department || "Management")

      // Ensure the user-company mapping includes companyID + companyName.
      // The Company dropdown reads `users/{uid}/companies/*` and expects `companyID` and `companyName`.
      let companyName = String((invite as any)?.companyName || "").trim()
      if (!companyName) {
        try {
          const c = await getCompanyFromDb(companyId)
          if (c) {
            companyName = String(c?.companyName || "").trim()
          }
        } catch {
          // ignore
        }
      }
      if (!companyName) companyName = companyId

      await addUserToCompany(effectiveUserId, companyId, {
        companyID: companyId,
        companyName,
        role,
        department,
        joinedAt: now,
        isDefault: true,
        accessLevel: "company",
        email: currentUser.email || "",
        displayName: currentUser.displayName || "",
      })

      // "Owner logic": owner invites can set the company owner fields for quick lookup.
      // Default behavior: if role is owner, set owner unless invite explicitly opts out (setAsOwner === false).
      const shouldSetOwner = role.toLowerCase() === "owner" && (invite as any)?.setAsOwner !== false
      if (shouldSetOwner) {
        await updateCompanyInDb(companyId, {
          ownerId: effectiveUserId,
          ownerEmail: currentUser.email || "",
          ownerName: currentUser.displayName || "",
          ownerSetAt: now,
          companyUpdated: new Date().toISOString(),
        } as any)
      }

      if (invite.id || invite.inviteID) {
        await updateCompanyInviteInDb(String(invite.id || invite.inviteID), {
          status: "accepted",
          acceptedAt: now,
          acceptedBy: effectiveUserId,
          updatedAt: now,
        })
      }

      // Notification (audit) - user joined company
      try {
        await createNotification(
          companyId,
          effectiveUserId,
          "company",
          "joined",
          "Company Joined",
          `User joined company "${companyName}" as ${role}`,
          {
            priority: "high",
            category: "success",
            details: {
              entityId: companyId,
              entityName: companyName,
              oldValue: invite,
              newValue: {
                companyID: companyId,
                companyName,
                role,
                department,
                joinedAt: now,
                accessLevel: "company",
                userId: effectiveUserId,
              },
              changes: {
                companyInvite: { from: invite, to: { status: "accepted", acceptedAt: now, acceptedBy: effectiveUserId } },
              },
            },
            metadata: buildAuditMetadata({
              type: "company",
              action: "joined",
              section: "Company/CompanyInvites",
              companyId,
              uid: effectiveUserId,
              employeeId: undefined,
              entityId: String(invite.id || invite.inviteID || code),
              entityName: companyName,
            }),
          },
        )
      } catch {
        // non-blocking
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, message: e?.message || "Failed to accept invite" }
    }
  }, [])

  const updateDataManagementConfig = useCallback(async (_config: DataManagementConfig): Promise<void> => {
    // TODO: Implement data management config update

  }, [])

  const updateSiteDataManagement = useCallback(async (siteID: string, config: SiteDataConfig): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const beforeSite = state.sites.find((s: any) => s?.siteID === siteID) as any
    await updateSiteInDb(state.companyID, siteID, { dataManagement: config } as any)
    notifyCompanyCrud({
      type: "site",
      action: "updated",
      section: "Company/DataManagement/Sites",
      title: "Site Data Management Updated",
      message: "Site data management settings were updated",
      entityId: siteID,
      entityName: beforeSite?.name || siteID,
      siteId: siteID,
      oldValue: beforeSite?.dataManagement ?? null,
      newValue: config,
    })
  }, [state.companyID, state.sites, notifyCompanyCrud])

  const updateSubsiteDataManagement = useCallback(async (siteID: string, subsiteID: string, config: SiteDataConfig): Promise<void> => {
    if (!state.companyID) throw new Error("Company ID is required")
    const beforeSite = state.sites.find((s: any) => s?.siteID === siteID) as any
    const beforeSubsite = beforeSite?.subsites?.[subsiteID] || state.subsites?.find((s: any) => s?.subsiteID === subsiteID)
    await updateSubsiteInDb(state.companyID, siteID, subsiteID, { dataManagement: config } as any)
    notifyCompanyCrud({
      type: "subsite",
      action: "updated",
      section: "Company/DataManagement/Subsites",
      title: "Subsite Data Management Updated",
      message: "Subsite data management settings were updated",
      entityId: subsiteID,
      entityName: beforeSubsite?.name || subsiteID,
      siteId: siteID,
      subsiteId: subsiteID,
      oldValue: beforeSubsite?.dataManagement ?? null,
      newValue: config,
    })
  }, [state.companyID, state.sites, (state as any).subsites, notifyCompanyCrud])

  // =========== NEW HELPERS ===========

  const fetchUserCompanies = useCallback(async (uid: string) => {
    return await getUserCompanies(uid)
  }, [])

  /**
   * createCompany – Creates a new company. No default site is created.
   * Returns the newly created company ID
   */
  const createCompany = useCallback(async (setupData: any): Promise<string> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error("User not authenticated")

      // Step 1: create base company - map to ExtendedCompany format
      const companyID = await createCompanyFn({
        companyName: setupData.name,
        legalName: setupData.legalName || setupData.name,
        companyLogo: "",
        companyAddress: setupData.address?.street || "",
        companyPhone: setupData.contact?.phone || "",
        companyEmail: setupData.contact?.email || "",
        companyWebsite: setupData.contact?.website || "",
        companyDescription: setupData.description || "",
        companyIndustry: setupData.business?.industry || "",
        companySize: "",
        companyType: setupData.companyType || "hospitality",
        companyStatus: "active",
        companyCreated: new Date().toISOString(),
        companyUpdated: new Date().toISOString(),
        permissions: DEFAULT_PERMISSIONS,
        dataManagement: {
          stock: "company",
          hr: "company",
          finance: "company",
          bookings: "company",
          pos: "company",
          messenger: "company",
        },
      })

      // Optional default site creation (legacy flow)
      if (setupData?.createDefaultSite) {
        try {
          await createSiteInDb(companyID, {
            name: "Main Site",
            description: "Default site",
            address: {
              street: setupData?.address?.street || "",
              city: setupData?.address?.city || "",
              state: setupData?.address?.state || "",
              zipCode: setupData?.address?.zipCode || "",
              country: setupData?.address?.country || "",
            },
            isMainSite: true,
            subsites: {},
            teams: {},
            dataManagement: {
              accessibleModules: {},
              accessibleSites: [],
              accessibleSubsites: [],
            },
          } as any)
        } catch {
          // ignore default-site failures (company is still created)
        }
      }

      // Attach current user to company as owner
      await addUserToCompany(currentUser.uid, companyID, {
        role: "owner",
        department: "Management",
        joinedAt: Date.now(),
        isDefault: true,
      })

      // Update context state
      dispatch({ type: "SET_COMPANY_ID", payload: companyID })
      dispatch({
        type: "SET_COMPANY",
        payload: {
          companyID,
          companyName: setupData.name,
          companyLogo: "",
          companyAddress: setupData.address?.street || "",
          companyPhone: setupData.contact?.phone || "",
          companyEmail: setupData.contact?.email || "",
          companyWebsite: setupData.contact?.website || "",
          companyDescription: setupData.description || "",
          companyIndustry: setupData.business?.industry || "",
          companySize: "",
          companyType: setupData.companyType || "hospitality",
          companyStatus: "active",
          companyCreated: new Date().toISOString(),
          companyUpdated: new Date().toISOString(),
          permissions: DEFAULT_PERMISSIONS,
        },
      })

      // Add notification
      try {
        await createNotification(
          companyID,
          currentUser.uid,
          'company',
          'created',
          'Company Created',
          `Company "${setupData.name}" was created`,
          {
            priority: 'high',
            category: 'success',
            details: {
              entityId: companyID,
              entityName: setupData.name,
              oldValue: null,
              newValue: {
                companyID,
                companyName: setupData.name,
                companyType: setupData.companyType || "hospitality",
              },
              changes: {
                company: { from: {}, to: { companyID, companyName: setupData.name } }
              }
            },
            metadata: buildAuditMetadata({
              type: "company",
              action: "created",
              section: "Company/Company",
              companyId: companyID,
              uid: currentUser.uid,
              entityId: companyID,
              entityName: setupData.name,
            }),
          }
        )
      } catch (notificationError) {
        // silent
      }

      return companyID
    } catch (error) {
      console.error("Error creating company:", error)
      throw error
    }
  }, [])

  // Site management functions
  const createSite = useCallback(async (site: Omit<Site, "siteID" | "companyID">) => {
    if (!state.companyID) {
      throw new Error("Company ID is required to create a site")
    }
    try {
      const siteId = await createSiteInDb(state.companyID, site)
      
      // Add notification
      try {
        await createNotification(
          state.companyID,
          settingsState.auth?.uid || 'system',
          'site',
          'created',
          'Site Created',
          `Site "${site.name || 'New Site'}" was created`,
          {
            siteId: siteId,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: siteId,
              entityName: site.name || 'Site',
              oldValue: null,
              newValue: { ...site, siteID: siteId, companyID: state.companyID },
              changes: {
                site: { from: {}, to: { ...site, siteID: siteId, companyID: state.companyID } }
              }
            },
            metadata: buildAuditMetadata({
              type: "site",
              action: "created",
              section: "Company/Sites",
              companyId: state.companyID,
              siteId: siteId,
              uid: settingsState.auth?.uid || "system",
              employeeId: getCurrentEmployeeId(state, settingsState),
              entityId: siteId,
              entityName: site.name || "Site",
            }),
          }
        )
      } catch (notificationError) {
        // silent
      }
      
      await refreshSites(true)
      return siteId
    } catch (error) {
      console.error("Error creating site:", error)
      throw error
    }
  }, [state.companyID, refreshSites, settingsState.auth?.uid])

  // Subsite management functions
  const createSubsite = useCallback(async (subsite: Omit<Subsite, "subsiteID">) => {
    if (!state.companyID) {
      throw new Error("Company ID is required to create a subsite")
    }
    if (!state.selectedSiteID) {
      throw new Error("Site ID is required to create a subsite")
    }
    // We've already checked that selectedSiteID is not null above
    const siteID = state.selectedSiteID as string;
    try {
      const subsiteId = await createSubsiteInDb(state.companyID, siteID, subsite)
      
      // Add notification
      try {
        await createNotification(
          state.companyID,
          settingsState.auth?.uid || 'system',
          'subsite',
          'created',
          'Subsite Created',
          `Subsite "${subsite.name || 'New Subsite'}" was created`,
          {
            siteId: siteID,
            subsiteId: subsiteId,
            priority: 'medium',
            category: 'success',
            details: {
              entityId: subsiteId,
              entityName: subsite.name || 'Subsite',
              oldValue: null,
              newValue: { ...subsite, subsiteID: subsiteId },
              changes: {
                subsite: { from: {}, to: { ...subsite, subsiteID: subsiteId } }
              }
            },
            metadata: buildAuditMetadata({
              type: "subsite",
              action: "created",
              section: "Company/Subsites",
              companyId: state.companyID,
              siteId: siteID,
              subsiteId: subsiteId,
              uid: settingsState.auth?.uid || "system",
              employeeId: getCurrentEmployeeId(state, settingsState),
              entityId: subsiteId,
              entityName: subsite.name || "Subsite",
            }),
          }
        )
      } catch (notificationError) {
        // silent
      }
      
      await refreshSites(true)
      return subsiteId
    } catch (error) {
      console.error("Error creating subsite:", error)
      throw error
    }
  }, [state.companyID, state.selectedSiteID, refreshSites, settingsState.auth?.uid])

  // Team management functions
  const createTeam = useCallback(async (_team: Omit<Team, "teamID">, _subsiteId?: string | null) => {
    if (!state.companyID) {
      throw new Error("Company ID is required to create a team")
    }
    try {
      // Implementation would call the appropriate rtdatabase function
      return "placeholder-team-id"
    } catch (error) {
      throw error
    }
  }, [state.companyID])

  // User management functions
  const getCompanyUsers = useCallback(async (companyId: string) => {
    if (!companyId) {
      throw new Error("Company ID is required to get company users")
    }
    try {
      const existingCompanyId = (companyTabPrefetchRef.current.key || "").split("|")[0]
      if (existingCompanyId === companyId && Array.isArray(companyTabPrefetchRef.current.companyUsers)) {
        return companyTabPrefetchRef.current.companyUsers || []
      }

      const users = await getCompanyUsersFromDb(companyId)
      const currentKey = companyTabPrefetchRef.current.key
      companyTabPrefetchRef.current = {
        ...companyTabPrefetchRef.current,
        key: currentKey,
        companyUsers: users,
      }
      return users
    } catch (error) {
      console.error("Error getting company users:", error)
      throw error
    }
  }, [])

  // Site access control functions
  const getUserAccessibleSites = useCallback(async () => {
    if (!state.companyID || !auth.currentUser) {
      return []
    }

    try {
      // Ensure we have a sites list to filter
      let availableSites = state.sites
      if (!availableSites || availableSites.length === 0) {
        // Try cache first
        const cachedSites = SessionPersistence.getCachedSites(state.companyID)
        if (cachedSites && cachedSites.length > 0) {
          availableSites = cachedSites
          dispatch({ type: "SET_SITES", payload: cachedSites })
        } else {
          const sitesArray = await getSites(state.companyID, true)
          dispatch({ type: "SET_SITES", payload: sitesArray })
          availableSites = sitesArray
        }
      }

      // OPTIMIZED: Try to get user company association from SettingsContext first (cached)
      let association: any = null
      if (settingsState?.user?.companies) {
        const userCompany = settingsState.user.companies.find(
          (c: any) => c.companyID === state.companyID
        )
        if (userCompany) {
          // Use cached association data from SettingsContext
          association = {
            role: userCompany.role,
            accessLevel: userCompany.accessLevel || (userCompany.role === 'owner' ? 'company' : 'site'),
            siteId: userCompany.siteId,
            sites: (userCompany as any).sites
          }
        }
      }
      
      // Only fetch from Firebase if we don't have cached data
      // OPTIMIZED: Use get() for one-time reads - more efficient than onValue for single reads
      if (!association) {
        const directAssoc = await getUserCompanyAssociation(auth.currentUser.uid, state.companyID)

        if (directAssoc) {
          association = directAssoc as any
        } else {
          // Back-compat: some users have `users/{uid}/companies` stored as an array.
          // In that case `companies/{companyId}` won't exist, so fall back to scanning the parent.
          const raw = await getUserCompaniesRaw(auth.currentUser.uid)
          if (raw) {
            const values: any[] = Array.isArray(raw)
              ? raw
              : raw && typeof raw === "object"
                ? Object.values(raw)
                : []
            association =
              values.find((c) => String(c?.companyID || c?.companyId || "").trim() === state.companyID) || null
          }
        }
      }
      
      if (!association) {
        // In support view mode (admin viewing a company), grant full access even without association
        const isSupportView = typeof window !== "undefined" && localStorage.getItem("supportViewMode") === "true"
        if (isSupportView) return availableSites
        return []
      }
      const accessLevel: string | undefined = association?.accessLevel
      const roleRaw: any = association?.role
      const roleString =
        typeof roleRaw === "string"
          ? roleRaw
          : Array.isArray(roleRaw)
            ? roleRaw.find((r) => typeof r === "string") || ""
            : roleRaw && typeof roleRaw === "object"
              ? String(roleRaw.name || roleRaw.label || roleRaw.role || "")
              : String(roleRaw ?? "")
      const userRole = roleString.toLowerCase()
      const ownerLike = userRole === 'owner' || accessLevel === 'company'

      // Owner role has full access to all sites and subsites
      if (ownerLike || isOwner()) {
        return availableSites
      }

      // Determine allowed site IDs
      const allowedSiteIds = new Set<string>()
      if (typeof association?.siteId === 'string' && association.siteId) {
        allowedSiteIds.add(String(association.siteId))
      }
      const assocSites = association?.sites
      if (Array.isArray(assocSites)) {
        assocSites.forEach((s: any) => {
          if (s) allowedSiteIds.add(String(s))
        })
      } else if (assocSites && typeof assocSites === 'object') {
        Object.keys(assocSites).forEach((key) => allowedSiteIds.add(String(key)))
      }

      // If nothing specified, deny access (empty list)
      if (allowedSiteIds.size === 0) {
        return []
      }

      // Filter available sites to only allowed ones
      return (availableSites || []).filter((s) => allowedSiteIds.has(s.siteID))
    } catch (error) {
      console.error("Error getting user accessible sites:", error)
      // Return all sites on error (fail open) - better UX than blocking
      return state.sites || []
    }
  }, [state.companyID, state.sites, dispatch, settingsState?.user?.companies])

  // Persist selected company name/ID to localStorage when they change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (state.companyID) {
          localStorage.setItem("selectedCompanyID", state.companyID)
          localStorage.setItem("companyID", state.companyID)
          localStorage.setItem("companyId", state.companyID)
        } else {
          localStorage.removeItem("selectedCompanyID")
          localStorage.removeItem("companyID")
          localStorage.removeItem("companyId")
        }
        if (state.company && state.company.companyName) {
          localStorage.setItem("selectedCompanyName", state.company.companyName)
          SessionPersistence.saveSessionState({
            companyID: state.companyID || undefined,
            companyName: state.company.companyName,
          })
        } else if (!state.companyID) {
          localStorage.removeItem("selectedCompanyName")
        }

        if (state.selectedSiteID) {
          localStorage.setItem("selectedSiteID", state.selectedSiteID)
          localStorage.setItem("siteId", state.selectedSiteID)
        } else {
          localStorage.removeItem("selectedSiteID")
          localStorage.removeItem("selectedSiteName")
          localStorage.removeItem("siteId")
        }

        if (state.selectedSiteName) {
          localStorage.setItem("selectedSiteName", state.selectedSiteName)
        }

        if (state.selectedSubsiteID) {
          localStorage.setItem("selectedSubsiteID", state.selectedSubsiteID)
          localStorage.setItem("subsiteId", state.selectedSubsiteID)
        } else {
          localStorage.removeItem("selectedSubsiteID")
          localStorage.removeItem("selectedSubsiteName")
          localStorage.removeItem("subsiteId")
        }

        if (state.selectedSubsiteName) {
          localStorage.setItem("selectedSubsiteName", state.selectedSubsiteName)
        }

        SessionPersistence.saveSessionState({
          companyID: state.companyID || undefined,
          companyName: state.company?.companyName || state.companyName || undefined,
          selectedSiteID: state.selectedSiteID || undefined,
          selectedSiteName: state.selectedSiteName || undefined,
          selectedSubsiteID: state.selectedSubsiteID || undefined,
          selectedSubsiteName: state.selectedSubsiteName || undefined,
        })
      }
    } catch {}
  }, [
    state.companyID,
    state.company?.companyName,
    state.companyName,
    state.selectedSiteID,
    state.selectedSiteName,
    state.selectedSubsiteID,
    state.selectedSubsiteName,
  ])

  const autoSelectSiteIfOnlyOne = useCallback(async () => {
    try {
      const accessibleSites = await getUserAccessibleSites()
      
      // If there's exactly one site, select it automatically
      if (accessibleSites.length === 1) {
        const site = accessibleSites[0]
        selectSite(site.siteID, site.name || "")
        return
      }
      
      // If there are no sites or multiple sites, don't auto-select
      if (accessibleSites.length === 0) {
      } else {
      }
    } catch (error) {
      console.error("Error auto-selecting site:", error)
    }
  }, [getUserAccessibleSites, selectSite])

  const getSiteHierarchy = useCallback(async () => {
    if (!state.companyID) {
      return []
    }

    try {
      // Get all sites and subsites
      const allSites = [...state.sites]
      const allSubsites = [...state.subsites]
      
      if (!allSites || allSites.length === 0) {
        await refreshSites()
        return state.sites.map(site => ({
          site,
          subsites: state.subsites.filter(subsite => subsite.location === site.siteID)
        }))
      }

      // Group subsites by site
      return allSites.map(site => ({
        site,
        subsites: allSubsites.filter(subsite => subsite.location === site.siteID)
      }))
    } catch (error) {
      console.error("Error getting site hierarchy:", error)
      return []
    }
  }, [state.companyID, state.sites, state.subsites, refreshSites])

  // Return the provider component with all context values
  return (
    <CompanyContext.Provider
      value={{
        state,
        dispatch,
        isFullyLoaded,
        setCompanyID,
        selectSite,
        selectSubsite,
        selectTeam,
        clearSiteSelection,
        createSite,
        updateSite,
        deleteSite,
        createSubsite,
        updateSubsite,
        deleteSubsite,
        createTeam,
        refreshSites,
        fetchSites,
        initializeCompanyData,
        ensureSitesLoaded,
        
        // Site access control functions
        getUserAccessibleSites,
        autoSelectSiteIfOnlyOne,
        getSiteHierarchy,
        
        // Permission functions
        isOwner,
        hasPermission,
        getUserPermissions,
        checkUserPermission,
        updateUserPermissions,
        updateEmployeePermissions,
        updateRolePermissions,
        updateDepartmentPermissions,
        updateDefaultRole,
        updateDefaultDepartment,
        updateDefaultPermissions,
        updateDepartmentPermissionsActive,
        updateRolePermissionsActive,
        updateUserPermissionsActive,
        updateEmployeePermissionsActive,
        
        // Configuration functions
        getConfig,
        updateConfig,
        
        // Checklist functions
        getChecklists,
        fetchChecklistCategories,
        saveChecklistType,
        deleteChecklistType,
        createChecklistItem,
        updateChecklistItem,
        deleteChecklistItem,
        fetchChecklists,
        fetchChecklistCompletionsByUser,
        fetchUserProfile,
        filterChecklistsByStatus,
        prefetchCompanyTabData,
        
        // Checklist completion functions
        createChecklistCompletion,
        getChecklistCompletions,
        updateChecklistCompletion,
        deleteChecklistCompletion,
        uploadChecklistCompletionPhoto,
        
        // Site invite functions
        createSiteInvite,
        getSiteInvites,
        getSiteInviteByCode,
        acceptSiteInvite,
        
        // Employee invite functions
        getEmployeeJoinCodeByCode,
        acceptEmployeeInvite,
        
        // Role and department management functions
        addRole,
        addDepartment,
        deleteRole,
        deleteDepartment,
        
        // Company setup functions
        fetchCompanySetup,
        saveCompanySetup,
        updateCompanyLogo,

        // Company section pages
        getCompanyReports,
        saveCompanyReport,
        deleteCompanyReport,
        loadCompanySectionSettings,
        saveCompanySectionSettings,
        
        // Dashboard functions
        getChecklistScores,
        getAvailableTabsForUser,
        
        // Base path functions
        getBasePath,
        
        // Company data configuration
        fetchDataConfiguration,
        saveDataConfiguration,
        
        // Legacy functions
        generateJoinCode,
        joinCompanyByCode,
        createCompanyInvite,
        getCompanyInviteByCode,
        acceptCompanyInvite,
        updateDataManagementConfig,
        updateSiteDataManagement,
        updateSubsiteDataManagement,
        
        // User management functions
        getCompanyUsers,
        
        // Exposed helpers
        fetchUserCompanies,
        createCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}

// Export types for frontend consumption
export type { 
  CompanyPermissions, 
  UserPermissions, 
  SiteDataConfig, 
  Team, 
  Site, 
  Subsite,
  CompanySetup,
  CompanyChecklist,
  ChecklistCompletion,
  SiteInvite
} from "../interfaces/Company"
