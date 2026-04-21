/**
 * Smart Employee Lookup for ESS
 * 
 * 1. Checks saved location in user company data first (fast path)
 * 2. Searches across sites/subsites if not found
 * 3. Saves location once found for faster future lookups
 */

import { getSitesFromDb, getCompanyUserFromDb, updateCompanyUserInDb, getUserCompanyFromDb, updateUserCompanyInDb } from "../../../app/backend/data/Company"
import { fetchEmployees } from "../../../app/backend/data/HRs"
import type { Employee } from "../../../app/backend/interfaces/HRs"

export interface EmployeeLocation {
  employee: Employee
  basePath: string
  siteId?: string
  subsiteId?: string
  companyId: string
}

const HR_SEGMENT = ["data", "hr"].join("/")

const buildHrBasePath = (companyId: string, siteId?: string, subsiteId?: string) => {
  const parts = ["companies", companyId]
  if (siteId) {
    parts.push("sites", siteId)
  }
  if (subsiteId) {
    parts.push("subsites", subsiteId)
  }
  parts.push(HR_SEGMENT)
  return parts.join("/")
}

const findMatchingEmployee = (employees: Employee[], userId: string, employeeId?: string) =>
  employees.find((emp: any) => {
    const empUserId = getEmployeeUserId(emp)
    const empId = getEmployeeRecordId(emp)
    return (
      (employeeId && String(empId) === String(employeeId)) ||
      String(empUserId) === String(userId) ||
      String(empId) === String(userId) ||
      String(emp?.id) === String(userId)
    )
  }) as Employee | undefined

function getEmployeeUserId(emp: any): string | null {
  if (!emp) return null
  return (
    emp.userId ||
    emp.userID ||
    emp.user_id ||
    emp.uid ||
    emp.userUID ||
    emp.firebaseUid ||
    null
  )
}

function getEmployeeRecordId(emp: any): string | null {
  if (!emp) return null
  return emp.id || emp.employeeId || emp.employeeID || null
}

/**
 * Find employee by userId across company, sites, and subsites
 * Uses saved location first, then checks HR context, then searches Firebase if needed
 */
export const findEmployeeForUser = async (
  userId: string,
  companyId: string,
  savedLocation?: {
    employeePath?: string
    employeeId?: string
    siteId?: string
    subsiteId?: string
  },
  hrEmployees?: Employee[] // Optional: already-loaded employees from HR context
): Promise<EmployeeLocation | null> => {
  try {
    // Step 0: Check HR context employees first (fastest - already loaded)
    if (hrEmployees && hrEmployees.length > 0) {
      const found = hrEmployees.find((emp: any) => {
        const empUserId = getEmployeeUserId(emp)
        const empId = getEmployeeRecordId(emp)
        return String(empUserId) === String(userId) || 
               String(empId) === String(userId) ||
               String(emp.id) === String(userId)
      }) as Employee | undefined
      
      if (found) {
        // Determine basePath from saved location or default to company level
        const basePath = savedLocation?.employeePath || buildHrBasePath(companyId)
        console.log("[ESS] Found employee in HR context:", found.id)
        return {
          employee: found,
          basePath,
          siteId: savedLocation?.siteId,
          subsiteId: savedLocation?.subsiteId,
          companyId,
        }
      }
    }

    // Step 1: Try saved location (fast path)
    if (savedLocation?.employeePath && savedLocation?.employeeId) {
      console.log("[ESS] Trying saved location:", savedLocation.employeePath)
      const savedEmployees = await fetchEmployees(savedLocation.employeePath)
      const employee = findMatchingEmployee(savedEmployees, userId, savedLocation.employeeId)

      if (employee) {
        console.log("[ESS] Found employee using saved location:", savedLocation.employeePath)
        return {
          employee,
          basePath: savedLocation.employeePath,
          siteId: savedLocation.siteId,
          subsiteId: savedLocation.subsiteId,
          companyId,
        }
      }

      console.warn("[ESS] Saved location employee doesn't match userId")
    }

    // Step 2: Search across company, sites, and subsites
    console.log("[ESS] Searching for employee across company...", { userId, companyId })
    const result = await searchEmployeeAcrossCompany(userId, companyId)
    
    if (result) {
      console.log("[ESS] Found employee via search:", result.basePath)
      // Step 3: Save location for future lookups
      await saveEmployeeLocation(userId, companyId, result)
      return result
    }

    console.warn("[ESS] Employee not found in any location")
    return null
  } catch (error) {
    console.error("[ESS] Error finding employee:", error)
    return null
  }
}

/**
 * Search for employee across company, sites, and subsites
 */
const searchEmployeeAcrossCompany = async (
  userId: string,
  companyId: string
): Promise<EmployeeLocation | null> => {
  try {
    console.log("[ESS] Starting search across company...", { userId, companyId })
    
    // Step 0: Check company/users/{userId} for employeeId reference
    const userData = await getCompanyUserFromDb(companyId, userId)
    
    if (userData) {
      if (userData.employeeId || userData.employeePath) {
        console.log("[ESS] Found employee reference in company/users:", userData.employeeId)
        const employeePath = userData.employeePath || buildHrBasePath(companyId)
        const employeeId = userData.employeeId
        
        const employees = await fetchEmployees(employeePath)
        const employee = findMatchingEmployee(employees, userId, employeeId)
        if (employee) {
          console.log("[ESS] Found employee using company/users reference")
          return {
            employee,
            basePath: employeePath,
            siteId: userData.siteId,
            subsiteId: userData.subsiteId,
            companyId,
          }
        }
      }
    }
    
    // First try company-level HR
    const companyHrPath = buildHrBasePath(companyId)
    console.log("[ESS] Checking company level:", companyHrPath)
    const companyEmployees = await fetchEmployees(companyHrPath)
    
    if (companyEmployees.length > 0) {
      const employeeList = companyEmployees as Employee[]
      console.log("[ESS] Company level employees found:", employeeList.length)
      
      const found = findMatchingEmployee(employeeList, userId)
      
      if (found) {
        console.log("[ESS] Found at company level:", found.id)
        return {
          employee: found,
          basePath: companyHrPath,
          companyId,
        }
      } else {
        console.log("[ESS] Employee not found at company level, checking userIds:", 
          employeeList.slice(0, 3).map((e: any) => ({ id: e.id, userId: e.userId }))
        )
      }
    } else {
      console.log("[ESS] Company level HR path doesn't exist")
    }

    // Get all sites
    const sites = await getSitesFromDb(companyId, true)

    if (!sites.length) {
      console.log("[ESS] No sites found for company")
      return null
    }

    const siteIds = sites.map((site: any) => String(site?.siteID || site?.id || "")).filter(Boolean)

    console.log("[ESS] Searching", siteIds.length, "sites...")
    
    // Try all sites (parallel fetch for performance)
    const sitePromises = siteIds.map(async (siteId) => {
      // Try site-level HR
      const siteHrPath = buildHrBasePath(companyId, siteId)
      const employeeList = await fetchEmployees(siteHrPath)
      
      if (employeeList.length > 0) {
        console.log("[ESS] Site", siteId, "has", employeeList.length, "employees")
        
        const found = findMatchingEmployee(employeeList, userId)
        
        if (found) {
          console.log("[ESS] Found at site level:", siteId, found.id)
          return {
            employee: found,
            basePath: siteHrPath,
            siteId,
            companyId,
          } as EmployeeLocation
        }
      }

      // Try all subsites in this site
      const siteRecord = sites.find((site: any) => String(site?.siteID || site?.id || "") === siteId) as any
      const subsites = siteRecord?.subsites || {}
      const subsiteIds = Array.isArray(subsites)
        ? subsites.map((subsite: any) => String(subsite?.subsiteID || subsite?.id || "")).filter(Boolean)
        : Object.keys(subsites)
      
      if (subsiteIds.length > 0) {
        
        // Try all subsites (parallel fetch)
        const subsitePromises = subsiteIds.map(async (subsiteId) => {
          const subsiteHrPath = buildHrBasePath(companyId, siteId, subsiteId)
          const employeeList = await fetchEmployees(subsiteHrPath)
          
          if (employeeList.length > 0) {
            const found = findMatchingEmployee(employeeList, userId)
            
            if (found) {
              console.log("[ESS] Found at subsite level:", siteId, subsiteId, found.id)
              return {
                employee: found,
                basePath: subsiteHrPath,
                siteId,
                subsiteId,
                companyId,
              } as EmployeeLocation
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
    console.error("[ESS] Error searching for employee:", error)
    return null
  }
}

/**
 * Save employee location in user company data for faster future lookups
 */
const saveEmployeeLocation = async (
  userId: string,
  companyId: string,
  location: EmployeeLocation
): Promise<void> => {
  try {
    // Extract siteId and subsiteId from path
    const pathParts = location.basePath.split('/')
    const siteIndex = pathParts.indexOf('sites')
    const subsiteIndex = pathParts.indexOf('subsites')
    
    let siteId: string | undefined
    let subsiteId: string | undefined
    
    if (subsiteIndex !== -1 && subsiteIndex < pathParts.length - 1) {
      subsiteId = pathParts[subsiteIndex + 1]
    }
    if (siteIndex !== -1 && siteIndex < pathParts.length - 1) {
      siteId = pathParts[siteIndex + 1]
    }

    // Update user's company data with employee location
    const userCompanyData = await getUserCompanyFromDb(userId, companyId)
    
    if (userCompanyData) {
      const updates: any = {
        employeeId: location.employee.id,
        employeePath: location.basePath,
      }
      
      if (siteId) updates.siteId = siteId
      if (subsiteId) updates.subsiteId = subsiteId
      
      // Also update role and department from employee if available
      if (location.employee.role) updates.role = location.employee.role
      if (location.employee.department) updates.department = location.employee.department
      
      await updateUserCompanyInDb(userId, companyId, updates)
      console.log("[ESS] Saved employee location for faster lookup:", updates)
    }

    // Also update company/users/{userId} with same data
    const companyUserData = await getCompanyUserFromDb(companyId, userId)
    
    if (companyUserData) {
      const updates: any = {
        employeeId: location.employee.id,
        employeePath: location.basePath,
      }
      
      if (siteId) updates.siteId = siteId
      if (subsiteId) updates.subsiteId = subsiteId
      
      if (location.employee.role) updates.role = location.employee.role
      if (location.employee.department) updates.department = location.employee.department
      
      await updateCompanyUserInDb(companyId, userId, updates)
    }
  } catch (error) {
    console.error("[ESS] Error saving employee location:", error)
    // Don't throw - this is non-critical
  }
}
