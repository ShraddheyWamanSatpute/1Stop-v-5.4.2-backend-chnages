"use client"

import type { Employee, Role, Department, Contract, ContractTemplate, HRAnalytics } from "../interfaces/HRs"
import * as rtdb from "../data/HRs"
import dayjs from "dayjs"

// Note: calculateHolidayAccrual function is implemented below at line ~195

// Employee Management Functions
export const fetchEmployees = async (basePath: string): Promise<Employee[]> => {
  try {
    return await rtdb.fetchEmployees(basePath)
  } catch (error) {
    console.error("Error fetching employees:", error)
    throw error
  }
}

export const createEmployee = async (
  basePath: string,
  employee: Omit<Employee, "id">
): Promise<Employee> => {
  try {
    const employeeId = await rtdb.createEmployee(basePath, employee)
    if (!employeeId) throw new Error("createEmployee: failed to generate ID from provider")
    return { ...employee, id: employeeId }
  } catch (error) {
    console.error("Error creating employee:", error)
    throw error
  }
}

export const updateEmployee = async (
  basePath: string,
  employeeId: string,
  employee: Partial<Employee>
): Promise<Employee> => {
  try {
    const saved = await rtdb.updateEmployee(basePath, employeeId, employee)
    if (!saved) throw new Error(`updateEmployee: no record returned for id ${employeeId}`)
    return saved
  } catch (error) {
    console.error("Error updating employee:", error)
    throw error
  }
}

export const deleteEmployee = async (basePath: string, employeeId: string): Promise<boolean> => {
  try {
    await rtdb.deleteEmployee(basePath, employeeId)
    return true
  } catch (error) {
    console.error("Error deleting employee:", error)
    throw error
  }
}

// Role Management Functions
export const fetchRoles = async (basePath: string): Promise<Role[]> => {
  try {
    return await rtdb.fetchRoles(basePath)
  } catch (error) {
    console.error("Error fetching roles:", error)
    throw error
  }
}

export const createRole = async (basePath: string, role: Omit<Role, "id">): Promise<Role> => {
  try {
    return await rtdb.createRole(basePath, role)
  } catch (error) {
    console.error("Error creating role:", error)
    throw error
  }
}

export const updateRole = async (
  basePath: string,
  roleId: string,
  role: Partial<Role>
): Promise<Role> => {
  try {
    await rtdb.updateRole(basePath, roleId, role)
    return { ...role, id: roleId } as Role
  } catch (error) {
    console.error("Error updating role:", error)
    throw error
  }
}

export const deleteRole = async (basePath: string, roleId: string): Promise<boolean> => {
  try {
    await rtdb.deleteRole(basePath, roleId)
    return true
  } catch (error) {
    console.error("Error deleting role:", error)
    throw error
  }
}

// Department Management Functions
export const fetchDepartments = async (basePath: string): Promise<Department[]> => {
  try {
    return await rtdb.fetchDepartments(basePath)
  } catch (error) {
    console.error("Error fetching departments:", error)
    throw error
  }
}

export const createDepartment = async (
  basePath: string,
  department: Omit<Department, "id">
): Promise<Department> => {
  try {
    return await rtdb.createDepartment(basePath, department)
  } catch (error) {
    console.error("Error creating department:", error)
    throw error
  }
}

export const updateDepartment = async (
  basePath: string,
  departmentId: string,
  department: Partial<Department>
): Promise<Department> => {
  try {
    await rtdb.updateDepartment(basePath, departmentId, department)
    return { ...department, id: departmentId } as Department
  } catch (error) {
    console.error("Error updating department:", error)
    throw error
  }
}

export const deleteDepartment = async (basePath: string, departmentId: string): Promise<boolean> => {
  try {
    await rtdb.deleteDepartment(basePath, departmentId)
    return true
  } catch (error) {
    console.error("Error deleting department:", error)
    throw error
  }
}

// Generic HR Action Handler

export const handleHRAction = async <T = any>(basePath: string, action: string, entity: string, id?: string, data?: Partial<T>): Promise<T | T[] | boolean> => {
  const fullBasePath = `${basePath}/${entity}`

  try {
    return await rtdb.handleHRActionDB(fullBasePath, action as "fetch" | "create" | "edit" | "delete", id, data)
  } catch (error) {
    console.error(`Error in handleHRAction (${action} ${entity}):`, error)
    throw error
  }
}

// Holiday and Benefits Calculation Functions
export const calculateHolidayEntitlement = (hoursPerWeek: number, isFullTime = true): number => {
  // Business logic for holiday entitlement calculation
  const statutoryMinimum = 28 // days for full-time
  if (isFullTime) {
    return statutoryMinimum
  }
  // Pro-rata for part-time based on hours
  return Math.round((hoursPerWeek / 37.5) * statutoryMinimum)
}

export const calculateHolidayAccrual = async (
  employee: Employee,
  startDate: Date
): Promise<{
  totalEntitlement: number
  accrued: number
  taken: number
  remaining: number
  carryOver: number
  accruedThisMonth: number
  accruedPerHour?: number
  accruedPerMonth?: number
}> => {
  try {
    // Business logic for holiday accrual calculation
    const totalEntitlement = calculateHolidayEntitlement(employee.hoursPerWeek || 37.5, employee.isFullTime)
    // Use dayjs for date calculations to avoid TypeScript errors
    const now = dayjs()
    const employeeStartDate = dayjs(startDate)
    const monthsWorked = Math.max(1, now.diff(employeeStartDate, 'month'))
    const accrued = Math.min(totalEntitlement, (totalEntitlement / 12) * monthsWorked)
    
    return {
      totalEntitlement,
      accrued,
      taken: 0, // Would fetch from database
      remaining: accrued,
      carryOver: 0,
      accruedThisMonth: totalEntitlement / 12,
      accruedPerMonth: totalEntitlement / 12
    }
  } catch (error) {
    console.error("Error calculating holiday accrual:", error)
    throw error
  }
}

// Tronc and Bonus Calculation Functions
export const calculateTroncDistribution = async (
  basePath: string
): Promise<{
  totalPool: number
  distributions: Array<{
    employeeId: string
    hoursWorked: number
    distribution: number
    percentage: number
  }>
}> => {
  try {
    // Business logic for tronc distribution
    const employees = await fetchEmployees(basePath)
    const totalPool = 1000 // Would calculate from actual tips/service charges
    const totalHours = employees.reduce((sum, emp) => sum + (emp.hoursPerWeek || 0), 0)
    
    const distributions = employees.map(emp => {
      const hoursWorked = emp.hoursPerWeek || 0
      const percentage = totalHours > 0 ? (hoursWorked / totalHours) * 100 : 0
      const distribution = (percentage / 100) * totalPool
      
      return {
        employeeId: emp.id,
        hoursWorked,
        distribution,
        percentage
      }
    })
    
    return { totalPool, distributions }
  } catch (error) {
    console.error("Error calculating tronc distribution:", error)
    throw error
  }
}

export const calculatePerformanceBonus = (
  performanceScore: number,
  bonusScheme: {
    threshold: number
    maxBonus: number
    formula: "percentage" | "fixed"
  }
): number => {
  // Business logic for performance bonus calculation
  if (performanceScore < bonusScheme.threshold) {
    return 0
  }
  
  if (bonusScheme.formula === "fixed") {
    return bonusScheme.maxBonus
  }
  
  // Percentage-based bonus
  const bonusPercentage = Math.min(100, performanceScore) / 100
  return bonusScheme.maxBonus * bonusPercentage
}

export const calculateSeasonalBonus = (season: "christmas" | "summer" | "easter", yearsOfService: number): number => {
  // Business logic for seasonal bonus calculation
  const baseBonuses = {
    christmas: 500,
    summer: 300,
    easter: 200
  }
  
  const baseBonus = baseBonuses[season]
  const loyaltyMultiplier = 1 + (yearsOfService * 0.1) // 10% increase per year
  
  return Math.round(baseBonus * loyaltyMultiplier)
}

// Employee Dashboard Data
export const getEmployeeDashboardData = async (
  basePath: string,
  employeeId: string
): Promise<{
  personalInfo: any
  holidayBalance: any
  payslips: any[]
  training: any[]
  announcements: any[]
  tronc: any[]
  bonuses: any[]
}> => {
  try {
    // Fetch employee data and related information
    const employees = await rtdb.fetchEmployees(basePath)
    const employee = employees.find(emp => emp.id === employeeId)
    
    if (!employee) {
      throw new Error("Employee not found")
    }
    
    // Handle potential undefined startDate by providing a fallback
    const startDate = employee.startDate ? new Date(employee.startDate) : new Date()
    const holidayBalance = await calculateHolidayAccrual(employee, startDate)
    
    return {
      personalInfo: employee,
      holidayBalance,
      payslips: [], // Would fetch from payroll system
      training: [], // Would fetch from training records
      announcements: [], // Would fetch from announcements
      tronc: [], // Would fetch from tronc records
      bonuses: [] // Would fetch from bonus records
    }
  } catch (error) {
    console.error("Error fetching employee dashboard data:", error)
    throw error
  }
}

// Contract Template Management Functions
export const fetchContractTemplates = async (basePath: string): Promise<ContractTemplate[]> => {
  try {
    return await handleHRAction<ContractTemplate>(basePath, "fetch", "contractTemplates") as ContractTemplate[]
  } catch (error) {
    console.error("Error fetching contract templates:", error)
    throw error
  }
}

export const createContractTemplate = async (
  basePath: string,
  template: Omit<ContractTemplate, "id">
): Promise<ContractTemplate> => {
  try {
    return await handleHRAction<ContractTemplate>(basePath, "create", "contractTemplates", undefined, {
      ...template,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }) as ContractTemplate
  } catch (error) {
    console.error("Error creating contract template:", error)
    throw error
  }
}

export const updateContractTemplate = async (
  basePath: string,
  templateId: string,
  template: Partial<ContractTemplate>
): Promise<ContractTemplate> => {
  try {
    return await handleHRAction<ContractTemplate>(basePath, "edit", "contractTemplates", templateId, {
      ...template,
      updatedAt: Date.now()
    }) as ContractTemplate
  } catch (error) {
    console.error("Error updating contract template:", error)
    throw error
  }
}

export const deleteContractTemplate = async (basePath: string, templateId: string): Promise<boolean> => {
  try {
    return await handleHRAction<boolean>(basePath, "delete", "contractTemplates", templateId) as boolean
  } catch (error) {
    console.error("Error deleting contract template:", error)
    throw error
  }
}


// Contract Management Functions
export const fetchContracts = async (basePath: string): Promise<Contract[]> => {
  try {
    console.log("Fetching contracts from database for:", { basePath })
    const contracts = await rtdb.fetchContracts(basePath)
    console.log("Found contracts:", contracts.length)
    return contracts
  } catch (error) {
    console.error("Error fetching contracts:", error)
    throw error
  }
}

export const createContract = async (
  basePath: string,
  contract: Omit<Contract, "id">
): Promise<Contract> => {
  try {
    return await handleHRAction<Contract>(basePath, "create", "contracts", undefined, {
      ...contract,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }) as Contract
  } catch (error) {
    console.error("Error creating contract:", error)
    throw error
  }
}

export const updateContract = async (
  basePath: string,
  contractId: string,
  contract: Partial<Contract>
): Promise<Contract> => {
  try {
    return await handleHRAction<Contract>(basePath, "edit", "contracts", contractId, {
      ...contract,
      updatedAt: Date.now()
    }) as Contract
  } catch (error) {
    console.error("Error updating contract:", error)
    throw error
  }
}

export const deleteContract = async (basePath: string, contractId: string): Promise<boolean> => {
  try {
    return await handleHRAction<boolean>(basePath, "delete", "contracts", contractId) as boolean
  } catch (error) {
    console.error("Error deleting contract:", error)
    throw error
  }
}

// Initialize default contract templates
export const initializeDefaultContractTemplates = async (basePath: string): Promise<void> => {
  try {
    // Check if any templates already exist
    const existingTemplates = await fetchContractTemplates(basePath)
    
    // Check if default templates already exist by name
    const hasDefaultTemplates = existingTemplates.some(template => 
      template.name === "Standard Employment Contract" || template.name === "Temporary Contract"
    )
    
    if (existingTemplates.length === 0 || !hasDefaultTemplates) {
      const defaultTemplates: Omit<ContractTemplate, "id">[] = [
        {
          name: "Standard Employment Contract",
          description: "Standard full-time employment contract template",
          defaultType: "permanent",
          defaultProbationMonths: 6,
          defaultBenefits: ["Health Insurance", "Pension Scheme", "Annual Leave"],
          baseSalaryFromRole: true,
          terms: [
            "Employee agrees to work exclusively for the company during employment",
            "Confidentiality and non-disclosure agreements apply",
            "Standard notice period of 4 weeks applies"
          ],
          bodyHtml: `<h2>Employment Contract</h2>

<p>Dear {{employeeName}},</p>

<p>We are pleased to offer you the role of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>.</p>

<h3>Employment Details:</h3>
<ul>
  <li><strong>Start Date:</strong> {{startDate}}</li>
  <li><strong>Salary:</strong> {{salary}}</li>
  <li><strong>Contract Duration:</strong> {{contractDuration}}</li>
  <li><strong>Probation Period:</strong> 6 months</li>
</ul>

<h3>Benefits:</h3>
<ul>
  <li>Health Insurance</li>
  <li>Pension Scheme</li>
  <li>Annual Leave Entitlement</li>
</ul>

<p>Please review and sign this contract to confirm your acceptance.</p>

<p>Best regards,<br>
HR Department</p>`,
          active: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: "Temporary Contract",
          description: "Fixed-term temporary employment contract template",
          defaultType: "fixed_term",
          defaultProbationMonths: 1,
          defaultBenefits: ["Statutory Benefits"],
          baseSalaryFromRole: false,
          terms: [
            "Fixed-term employment with specific end date",
            "No notice period required for contract expiry",
            "Statutory minimum benefits apply"
          ],
          bodyHtml: `<h2>Temporary Employment Contract</h2>

<p>Dear {{employeeName}},</p>

<p>This is a temporary employment contract for the role of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>.</p>

<h3>Contract Details:</h3>
<ul>
  <li><strong>Start Date:</strong> {{startDate}}</li>
  <li><strong>End Date:</strong> {{endDate}}</li>
  <li><strong>Hourly Rate:</strong> {{hourlyRate}}</li>
  <li><strong>Expected Hours:</strong> {{hoursPerWeek}} hours per week</li>
</ul>

<p>This is a fixed-term contract that will automatically expire on the end date unless renewed by mutual agreement.</p>

<p>Terms and conditions apply as per company policy.</p>

<p>Best regards,<br>
HR Department</p>`,
          active: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]

      // Create each default template
      for (const template of defaultTemplates) {
        await createContractTemplate(basePath, template)
      }
    }
  } catch (error) {
    console.error("Error initializing default contract templates:", error)
    throw error
  }
}

// HR Analytics Calculation Function
export const calculateHRAnalytics = (
  employees: Employee[],
  timeOffRequests: any[],
  performanceReviews: any[],
  trainingRecords: any[],
): HRAnalytics => {
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((emp) => emp.status === "active").length
  const pendingTimeOffRequests = timeOffRequests.filter((req) => req.status === "pending").length
  const completedTrainings = trainingRecords.filter((training) => training.status === "completed").length
  const averagePerformanceScore =
    performanceReviews.reduce((sum, review) => sum + (review.overallScore || 0), 0) / performanceReviews.length || 0

  const departmentDistribution = employees.reduce(
    (acc, emp) => {
      const dept = emp.department || "Unknown"
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const turnoverRate = 0 // This would need historical data to calculate properly

  return {
    totalEmployees,
    activeEmployees,
    pendingTimeOffRequests,
    completedTrainings,
    averagePerformanceScore,
    departmentDistribution,
    turnoverRate,
    lastUpdated: Date.now(),
  }
}
