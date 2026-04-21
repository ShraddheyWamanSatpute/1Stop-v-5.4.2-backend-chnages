"use client"

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react"
import { useCompany } from "./CompanyContext"
import { useSettings } from "./SettingsContext"
import { measurePerformance } from "../utils/PerformanceTimer"
import { performanceTimer } from "../utils/PerformanceTimer"
import { createCachedFetcher } from "../utils/CachedFetcher"
import { dataCache } from "../utils/DataCache"
import { 
  fetchHRCollection as fetchHRCollectionFn,
  fetchHRSettingsSection as fetchHRSettingsSectionFn,
  saveHRSettingsSection as saveHRSettingsSectionFn,
  fetchHRIntegrations as fetchHRIntegrationsFn,
  saveHRIntegration as saveHRIntegrationFn,
  fetchHREmployeeDefaults as fetchHREmployeeDefaultsFn,
  saveHREmployeeDefaults as saveHREmployeeDefaultsFn,
  fetchHRPayrollSettings as fetchHRPayrollSettingsFn,
  saveHRPayrollSettings as saveHRPayrollSettingsFn,
  findHRSchedulePath as findHRSchedulePathFn,
  findHRReadPath as findHRReadPathFn,
  updateEmployee as updateEmployeeFn,
} from "../providers/supabase/HRs"
import { buildAuditMetadata, getCurrentEmployeeId } from "../utils/notificationAudit"
import type { Employee, Role, Department, Training, TimeOff, TimeOffRequest, Warning, Attendance, ComplianceTask, Announcement, JobPosting, Payroll, Candidate, Interview, PerformanceReview, PerformanceReviewEntry, PerformanceReviewTemplate, Schedule, Benefit, EmployeeBenefit, Contract, ContractTemplate, ExpenseReport, CompanyEvent, EventRSVP, DiversityInitiative, DiversitySurvey, StarterChecklist, HRActionParams } from "../interfaces/HRs"
import { 
  createRole, 
  updateRole as updateRoleAPI, 
  deleteRole as deleteRoleAPI,
  createDepartment,
  updateDepartment as updateDepartmentAPI,
  deleteDepartment as deleteDepartmentAPI,
  handleHRAction,
} from "../functions/HRs"
import { createNotification } from "../functions/Notifications"
import * as rtdb from "../providers/supabase/HRs"
import { debugLog, debugWarn } from "../utils/debugLog"
import {
  fetchEmployees,
  createEmployee as createEmployeeRTDB,
  updateEmployee as updateEmployeeRTDB,
  deleteEmployee as deleteEmployeeRTDB,
  fetchRoles,
  fetchDepartments,
  fetchSchedules,
  createSchedule as createScheduleRTDB,
  updateSchedule as updateScheduleRTDB,
  deleteSchedule as deleteScheduleRTDB,
  fetchPayroll,
  fetchPerformanceReviews,
  fetchWarnings
} from "../providers/supabase/HRs"
import { createEmployeeJoinCode, listEmployeeJoinCodes, revokeEmployeeJoinCode } from "../functions/Company"
import {
  fetchTrainings,
  createTraining as createTrainingAPI,
  updateTraining as updateTrainingAPI,
  deleteTraining as deleteTrainingAPI,
  fetchTimeOffs,
  createTimeOff as createTimeOffAPI,
  updateTimeOff as updateTimeOffAPI,
  deleteTimeOff as deleteTimeOffAPI,
  createWarning as createWarningAPI,
  updateWarning as updateWarningAPI,
  deleteWarning as deleteWarningAPI,
  fetchAttendances,
  createAttendance as createAttendanceAPI,
  updateAttendance as updateAttendanceAPI,
  deleteAttendance as deleteAttendanceAPI,
  createJob as createJobAPI,
  updateJob as updateJobAPI,
  deleteJob as deleteJobAPI,
  createCandidate as createCandidateAPI,
  updateCandidate as updateCandidateAPI,
  deleteCandidate as deleteCandidateAPI,
  createInterview as createInterviewAPI,
  updateInterview as updateInterviewAPI,
  deleteInterview as deleteInterviewAPI,
  updateContract as updateContractRTDB,
  createContract as createContractRTDB,
  fetchContracts as fetchContractsRTDB,
  createContractTemplate as createContractTemplateRTDB,
  fetchContractTemplates as fetchContractTemplatesRTDB,
  fetchBenefits as fetchBenefitsRTDB,
} from "../providers/supabase/HRs"

// Define the state type
interface HRState {
  employees: Employee[]
  roles: Role[]
  departments: Department[]
  trainings: Training[]
  timeOffs: TimeOff[]
  warnings: Warning[]
  attendances: Attendance[]
  attendanceRecords: Attendance[]  // Alias for attendances for backward compatibility
  complianceTasks: ComplianceTask[]
  announcements: Announcement[]
  jobs: JobPosting[]
  jobPostings: JobPosting[]  // Alias for jobs for backward compatibility
  candidates: Candidate[]
  interviews: Interview[]
  payrollRecords: Payroll[]
  performanceReviews: PerformanceReviewEntry[]
  performanceReviewTemplates: PerformanceReviewTemplate[]
  trainingPrograms: Training[]
  schedules: Schedule[]
  contracts: any[]
  contractTemplates: ContractTemplate[]
  benefits: Benefit[]
  events: any[]
  employeeBenefits: EmployeeBenefit[]
  expenseReports: any[]
  starterChecklists: any[]
  incentives: any[]
  venueBattles: any[]
  diversityInitiatives: any[]
  diversitySurveys: any[]
  isLoading: boolean
  error: string | null
  initialized: boolean
  // Company information
  companyID?: string
  companyName?: string
  selectedSiteID?: string
  sites?: any[]
}

// Define action types
export type HRAction =
  | { type: "SET_EMPLOYEES"; payload: Employee[] }
  | { type: "SET_ROLES"; payload: Role[] }
  | { type: "SET_DEPARTMENTS"; payload: Department[] }
  | { type: "SET_TRAININGS"; payload: Training[] }
  | { type: "SET_TIME_OFFS"; payload: TimeOff[] }
  | { type: "SET_WARNINGS"; payload: Warning[] }
  | { type: "SET_ATTENDANCES"; payload: Attendance[] }
  | { type: "SET_COMPLIANCE_TASKS"; payload: ComplianceTask[] }
  | { type: "SET_ANNOUNCEMENTS"; payload: Announcement[] }
  | { type: "SET_JOBS"; payload: JobPosting[] }
  | { type: "SET_CANDIDATES"; payload: Candidate[] }
  | { type: "SET_INTERVIEWS"; payload: any[] }
  | { type: "SET_PAYROLL_RECORDS"; payload: Payroll[] }
  | { type: "SET_PERFORMANCE_REVIEWS"; payload: PerformanceReviewEntry[] }
  | { type: "SET_PERFORMANCE_REVIEW_TEMPLATES"; payload: PerformanceReviewTemplate[] }
  | { type: "SET_TRAINING_PROGRAMS"; payload: Training[] }
  | { type: "SET_SCHEDULES"; payload: Schedule[] }
  | { type: "SET_CONTRACTS"; payload: any[] }
  | { type: "ADD_CONTRACT"; payload: Contract }
  | { type: "UPDATE_CONTRACT"; payload: Contract }
  | { type: "SET_CONTRACT_TEMPLATES"; payload: ContractTemplate[] }
  | { type: "ADD_CONTRACT_TEMPLATE"; payload: ContractTemplate }
  | { type: "SET_BENEFITS"; payload: Benefit[] }
  | { type: "SET_EVENTS"; payload: any[] }
  | { type: "SET_EMPLOYEE_BENEFITS"; payload: EmployeeBenefit[] }
  | { type: "SET_EXPENSE_REPORTS"; payload: any[] }
  | { type: "SET_STARTER_CHECKLISTS"; payload: any[] }
  | { type: "SET_INCENTIVES"; payload: any[] }
  | { type: "SET_VENUE_BATTLES"; payload: any[] }
  | { type: "SET_DIVERSITY_INITIATIVES"; payload: any[] }
  | { type: "SET_DIVERSITY_SURVEYS"; payload: any[] }
  | { type: "ADD_DIVERSITY_INITIATIVE"; payload: DiversityInitiative }
  | { type: "UPDATE_DIVERSITY_INITIATIVE"; payload: DiversityInitiative }
  | { type: "DELETE_DIVERSITY_INITIATIVE"; payload: string }
  | { type: "ADD_DIVERSITY_SURVEY"; payload: DiversitySurvey }
  | { type: "UPDATE_DIVERSITY_SURVEY"; payload: DiversitySurvey }
  | { type: "DELETE_DIVERSITY_SURVEY"; payload: string }
  | { type: "ADD_EMPLOYEE"; payload: Employee }
  | { type: "UPDATE_EMPLOYEE"; payload: Employee }
  | { type: "DELETE_EMPLOYEE"; payload: string }
  | { type: "ADD_ROLE"; payload: Role }
  | { type: "UPDATE_ROLE"; payload: Role }
  | { type: "DELETE_ROLE"; payload: string }
  | { type: "ADD_DEPARTMENT"; payload: Department }
  | { type: "UPDATE_DEPARTMENT"; payload: Department }
  | { type: "DELETE_DEPARTMENT"; payload: string }
  | { type: "ADD_TRAINING"; payload: Training }
  | { type: "UPDATE_TRAINING"; payload: Training }
  | { type: "DELETE_TRAINING"; payload: string }
  | { type: "ADD_TIME_OFF"; payload: TimeOff }
  | { type: "UPDATE_TIME_OFF"; payload: TimeOff }
  | { type: "DELETE_TIME_OFF"; payload: string }
  | { type: "ADD_WARNING"; payload: Warning }
  | { type: "UPDATE_WARNING"; payload: Warning }
  | { type: "DELETE_WARNING"; payload: string }
  | { type: "ADD_ATTENDANCE"; payload: Attendance }
  | { type: "UPDATE_ATTENDANCE"; payload: Attendance }
  | { type: "DELETE_ATTENDANCE"; payload: string }
  | { type: "ADD_COMPLIANCE_TASK"; payload: ComplianceTask }
  | { type: "UPDATE_COMPLIANCE_TASK"; payload: ComplianceTask }
  | { type: "DELETE_COMPLIANCE_TASK"; payload: string }
  | { type: "ADD_ANNOUNCEMENT"; payload: Announcement }
  | { type: "UPDATE_ANNOUNCEMENT"; payload: Announcement }
  | { type: "DELETE_ANNOUNCEMENT"; payload: string }
  | { type: "ADD_JOB"; payload: JobPosting }
  | { type: "UPDATE_JOB"; payload: JobPosting }
  | { type: "DELETE_JOB"; payload: string }
  | { type: "ADD_CANDIDATE"; payload: Candidate }
  | { type: "UPDATE_CANDIDATE"; payload: Candidate }
  | { type: "DELETE_CANDIDATE"; payload: string }
  | { type: "ADD_INTERVIEW"; payload: any }
  | { type: "UPDATE_INTERVIEW"; payload: any }
  | { type: "DELETE_INTERVIEW"; payload: string }
  | { type: "ADD_PAYROLL"; payload: Payroll }
  | { type: "UPDATE_PAYROLL"; payload: Payroll }
  | { type: "DELETE_PAYROLL"; payload: string }
  | { type: "ADD_PERFORMANCE_REVIEW"; payload: PerformanceReviewEntry }
  | { type: "UPDATE_PERFORMANCE_REVIEW"; payload: PerformanceReviewEntry }
  | { type: "DELETE_PERFORMANCE_REVIEW"; payload: string }
  | { type: "ADD_PERFORMANCE_REVIEW_TEMPLATE"; payload: PerformanceReviewTemplate }
  | { type: "UPDATE_PERFORMANCE_REVIEW_TEMPLATE"; payload: PerformanceReviewTemplate }
  | { type: "DELETE_PERFORMANCE_REVIEW_TEMPLATE"; payload: string }
  | { type: "ADD_SCHEDULE"; payload: Schedule }
  | { type: "UPDATE_SCHEDULE"; payload: Schedule }
  | { type: "DELETE_SCHEDULE"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BASE_PATH"; payload: string }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { 
      type: "BATCH_UPDATE"; 
      payload: {
        employees?: Employee[]
        roles?: Role[]
        departments?: Department[]
        trainings?: Training[]
        timeOffs?: TimeOff[]
        warnings?: Warning[]
        attendances?: Attendance[]
        complianceTasks?: ComplianceTask[]
        announcements?: Announcement[]
        jobs?: JobPosting[]
        candidates?: Candidate[]
        interviews?: any[]
        payrollRecords?: Payroll[]
        performanceReviews?: PerformanceReviewEntry[]
        performanceReviewTemplates?: PerformanceReviewTemplate[]
        schedules?: Schedule[]
        contracts?: any[]
        contractTemplates?: ContractTemplate[]
        benefits?: Benefit[]
        events?: any[]
        employeeBenefits?: EmployeeBenefit[]
        expenseReports?: any[]
        starterChecklists?: any[]
        incentives?: any[]
        venueBattles?: any[]
        diversityInitiatives?: any[]
        diversitySurveys?: any[]
        initialized?: boolean
      }
    }

// Define the context type
interface HRContextType {
  state: HRState
  dispatch: React.Dispatch<HRAction>

  // =======================
  // Settings API (no direct Firebase in UI)
  // =======================
  getHRSettingsBasePath: () => string | null
  loadHRSettingsSection: (section: "general" | "compliance") => Promise<Record<string, any> | null>
  saveHRSettingsSection: (section: "general" | "compliance", data: Record<string, any>) => Promise<void>
  loadHRIntegrations: () => Promise<Record<string, any>>
  saveHRIntegration: (integration: { id: string } & Record<string, any>) => Promise<void>
  loadHREmployeeDefaults: () => Promise<Record<string, any> | null>
  saveHREmployeeDefaults: (data: Record<string, any>) => Promise<void>
  loadHRPayrollSettings: () => Promise<Record<string, any> | null>
  saveHRPayrollSettings: (data: Record<string, any>) => Promise<void>

  // Permission functions
  canViewHR: () => boolean
  canEditHR: () => boolean
  canDeleteHR: () => boolean
  isOwner: () => boolean
  refreshEmployees: () => Promise<void>
  refreshRoles: (forceRefresh?: boolean) => Promise<void>
  refreshDepartments: (forceRefresh?: boolean) => Promise<void>
  refreshTrainings: () => Promise<void>
  refreshTimeOffs: (forceRefresh?: boolean) => Promise<void>
  refreshWarnings: () => Promise<void>
  refreshAttendances: () => Promise<void>
  refreshComplianceTasks: () => Promise<void>
  refreshAnnouncements: () => Promise<void>
  refreshJobs: () => Promise<void>
  refreshCandidates: () => Promise<void>
  refreshInterviews: () => Promise<void>
  refreshPayrolls: () => Promise<void>
  refreshPerformanceReviews: () => Promise<void>
  refreshPerformanceReviewTemplates: () => Promise<void>
  refreshSchedules: () => Promise<void>
  refreshContracts: () => Promise<void>
  addEmployee: (employee: Omit<Employee, "id">) => Promise<Employee | null>
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<Employee | null>
  deleteEmployee: (id: string) => Promise<boolean>
  addRole: (role: Omit<Role, "id">) => Promise<Role | null>
  updateRole: (id: string, role: Partial<Role>) => Promise<Role | null>
  deleteRole: (id: string) => Promise<boolean>
  addDepartment: (department: Omit<Department, "id">) => Promise<Department | null>
  updateDepartment: (id: string, department: Partial<Department>) => Promise<Department | null>
  deleteDepartment: (id: string) => Promise<boolean>
  addTraining: (training: Omit<Training, "id">) => Promise<Training | null>
  updateTraining: (id: string, training: Partial<Training>) => Promise<Training | null>
  deleteTraining: (id: string) => Promise<boolean>
  addTimeOff: (timeOff: Omit<TimeOff, "id">) => Promise<TimeOff | null>
  updateTimeOff: (id: string, timeOff: Partial<TimeOff>) => Promise<TimeOff | null>
  deleteTimeOff: (id: string) => Promise<boolean>
  addWarning: (warning: Omit<Warning, "id">) => Promise<Warning | null>
  updateWarning: (id: string, warning: Partial<Warning>) => Promise<Warning | null>
  deleteWarning: (id: string) => Promise<boolean>
  addAttendance: (attendance: Omit<Attendance, "id">) => Promise<Attendance | null>
  updateAttendance: (id: string, attendance: Partial<Attendance>) => Promise<Attendance | null>
  deleteAttendance: (id: string) => Promise<boolean>
  addComplianceTask: (complianceTask: Omit<ComplianceTask, "id">) => Promise<ComplianceTask | null>
  updateComplianceTask: (id: string, complianceTask: Partial<ComplianceTask>) => Promise<ComplianceTask | null>
  deleteComplianceTask: (id: string) => Promise<boolean>
  addAnnouncement: (announcement: Omit<Announcement, "id">) => Promise<Announcement | null>
  updateAnnouncement: (id: string, announcement: Partial<Announcement>) => Promise<Announcement | null>
  deleteAnnouncement: (id: string) => Promise<boolean>
  addJob: (job: Omit<JobPosting, "id">) => Promise<JobPosting | null>
  updateJob: (id: string, job: Partial<JobPosting>) => Promise<JobPosting | null>
  deleteJob: (id: string) => Promise<boolean>
  addCandidate: (candidate: Omit<Candidate, "id">) => Promise<Candidate | null>
  updateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<Candidate | null>
  deleteCandidate: (id: string) => Promise<boolean>
  addInterview: (interview: Omit<Interview, "id">) => Promise<Interview | null>
  updateInterview: (id: string, interview: Partial<Interview>) => Promise<Interview | null>
  deleteInterview: (id: string) => Promise<boolean>
  addPayroll: (payroll: Omit<Payroll, "id">) => Promise<Payroll | null>
  updatePayroll: (id: string, payroll: Partial<Payroll>) => Promise<Payroll | null>
  deletePayroll: (id: string) => Promise<boolean>
  updatePayrollRecord: (id: string, payroll: Partial<Payroll>) => Promise<Payroll | null>
  deletePayrollRecord: (id: string) => Promise<boolean>
  addPerformanceReview: (review: Omit<PerformanceReviewEntry, "id">) => Promise<PerformanceReviewEntry | null>
  updatePerformanceReview: (id: string, review: Partial<PerformanceReviewEntry>) => Promise<PerformanceReviewEntry | null>
  deletePerformanceReview: (id: string) => Promise<boolean>
  createPerformanceReviewTemplate: (template: Omit<PerformanceReviewTemplate, "id">) => Promise<PerformanceReviewTemplate | null>
  updatePerformanceReviewTemplate: (id: string, template: Partial<PerformanceReviewTemplate>) => Promise<PerformanceReviewTemplate | null>
  deletePerformanceReviewTemplate: (id: string) => Promise<boolean>
  addSchedule: (schedule: Omit<Schedule, "id">) => Promise<Schedule | null>
  updateSchedule: (id: string, schedule: Partial<Schedule>) => Promise<Schedule | null>
  deleteSchedule: (id: string) => Promise<boolean>
  // Join code generation
  generateJoinCode: (roleId: string, employeeId?: string, expiresInDays?: number) => Promise<string>
  // Employee invites management
  getEmployeeInvites: (employeeId?: string) => Promise<any>
  revokeInvite: (code: string) => Promise<void>
  // Benefits management
  fetchBenefits: () => Promise<Benefit[]>
  createBenefit: (benefit: Omit<Benefit, "id">) => Promise<Benefit | null>
  updateBenefit: (id: string, benefit: Partial<Benefit>) => Promise<Benefit | null>
  deleteBenefit: (id: string) => Promise<boolean>
  fetchEmployeeBenefits: (employeeId: string) => Promise<EmployeeBenefit[]>
  assignBenefitToEmployee: (employeeId: string, benefitId: string, data: Partial<EmployeeBenefit>) => Promise<EmployeeBenefit | null>
  updateEmployeeBenefit: (id: string, data: Partial<EmployeeBenefit>) => Promise<EmployeeBenefit | null>
  removeEmployeeBenefit: (id: string) => Promise<boolean>
  getEmployeeTrainings: (employeeId: string) => Promise<Training[]>
  getEmployeeTimeOffs: (employeeId: string) => Promise<TimeOff[]>
  getEmployeeWarnings: (employeeId: string) => Promise<Warning[]>
  getEmployeeAttendances: (employeeId: string) => Promise<Attendance[]>
  // Contract management
  fetchContractTemplates: () => Promise<ContractTemplate[]>
  createContractTemplate: (template: Omit<ContractTemplate, "id">) => Promise<ContractTemplate | null>
  updateContractTemplate: (templateId: string, template: Partial<ContractTemplate>) => Promise<ContractTemplate | null>
  deleteContractTemplate: (templateId: string) => Promise<boolean>
  addContract: (contract: Omit<Contract, "id">) => Promise<Contract | null>
  createContract: (contract: Omit<Contract, "id">) => Promise<Contract | null>
  updateContract: (contractId: string, contractUpdates: Partial<Contract>) => Promise<Contract | null>
  deleteContract: (contractId: string) => Promise<boolean>
  initializeDefaultContractTemplates: () => Promise<void>
  // Permission functions
  hasPermission: (module: string, resource: string, action: "view" | "edit" | "delete") => boolean
  // Generic HR action handler for operations not yet implemented as specific functions
  handleHRAction: (params: HRActionParams) => Promise<any>
  
  // Event management functions
  refreshEvents: () => Promise<void>
  createEvent: (event: Omit<any, "id">) => Promise<any>
  updateEvent: (eventId: string, updates: Partial<any>) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  fetchEventRSVPs: (eventId: string) => Promise<any[]>
  createEventRSVP: (rsvp: Omit<any, "id">) => Promise<any>
  updateEventRSVP: (rsvpId: string, updates: Partial<any>) => Promise<void>
  
  // Expense management functions
  refreshExpenseReports: () => Promise<void>
  createExpenseReport: (report: Omit<any, "id">) => Promise<any>
  updateExpenseReport: (reportId: string, updates: Partial<any>) => Promise<void>
  deleteExpenseReport: (reportId: string) => Promise<void>
  
  // Diversity and inclusion functions
  refreshDiversityInitiatives: () => Promise<void>
  createDiversityInitiative: (initiative: Omit<any, "id">) => Promise<any>
  updateDiversityInitiative: (initiativeId: string, updates: Partial<any>) => Promise<void>
  deleteDiversityInitiative: (initiativeId: string) => Promise<void>
  refreshDiversitySurveys: () => Promise<void>
  createDiversitySurvey: (survey: Omit<any, "id">) => Promise<any>
  updateDiversitySurvey: (surveyId: string, updates: Partial<any>) => Promise<void>
  deleteDiversitySurvey: (surveyId: string) => Promise<void>
  
  // Starter checklist functions
  refreshStarterChecklists: () => Promise<void>
  createStarterChecklist: (checklist: Omit<any, "id">) => Promise<any>
  updateStarterChecklist: (checklistId: string, updates: Partial<any>) => Promise<void>
  deleteStarterChecklist: (checklistId: string) => Promise<void>

}

const HRContext = createContext<HRContextType | undefined>(undefined)

// Initial state
const initialState: HRState = {
  employees: [],
  roles: [],
  departments: [],
  trainings: [],
  timeOffs: [],
  warnings: [],
  attendances: [],
  attendanceRecords: [],  // Alias for attendances
  complianceTasks: [],
  announcements: [],
  jobs: [],
  jobPostings: [],  // Alias for jobs
  candidates: [],
  interviews: [],
  payrollRecords: [],
  performanceReviews: [],
  performanceReviewTemplates: [],
  trainingPrograms: [],
  schedules: [],
  contracts: [],
  contractTemplates: [],
  benefits: [],
  events: [],
  employeeBenefits: [],
  expenseReports: [],
  starterChecklists: [],
  incentives: [],
  venueBattles: [],
  diversityInitiatives: [],
  diversitySurveys: [],
  isLoading: false,
  error: null,
  initialized: false,
  // Company information
  companyID: undefined,
  companyName: undefined,
  selectedSiteID: undefined,
  sites: undefined,
}

// Reducer function
const hrReducer = (state: HRState, action: HRAction): HRState => {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload }
    case "ADD_EMPLOYEE":
      return { ...state, employees: [...state.employees, action.payload] }
    case "UPDATE_EMPLOYEE":
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.payload.id ? action.payload : employee
        ),
      }
    case "DELETE_EMPLOYEE":
      return {
        ...state,
        employees: state.employees.filter((employee) => employee.id !== action.payload),
      }
    case "SET_ROLES":
      return { ...state, roles: action.payload }
    case "ADD_ROLE":
      return { ...state, roles: [...state.roles, action.payload] }
    case "UPDATE_ROLE":
      return {
        ...state,
        roles: state.roles.map((role) =>
          role.id === action.payload.id ? action.payload : role
        ),
      }
    case "DELETE_ROLE":
      return {
        ...state,
        roles: state.roles.filter((role) => role.id !== action.payload),
      }
    case "SET_DEPARTMENTS":
      return { ...state, departments: action.payload }
    case "ADD_DEPARTMENT":
      return { ...state, departments: [...state.departments, action.payload] }
    case "UPDATE_DEPARTMENT":
      return {
        ...state,
        departments: state.departments.map((department) =>
          department.id === action.payload.id ? action.payload : department
        ),
      }
    case "DELETE_DEPARTMENT":
      return {
        ...state,
        departments: state.departments.filter((department) => department.id !== action.payload),
      }
    case "SET_TRAININGS":
      return { ...state, trainings: action.payload }
    case "ADD_TRAINING":
      return { ...state, trainings: [...state.trainings, action.payload] }
    case "UPDATE_TRAINING":
      return {
        ...state,
        trainings: state.trainings.map((training) =>
          training.id === action.payload.id ? action.payload : training
        ),
      }
    case "DELETE_TRAINING":
      return {
        ...state,
        trainings: state.trainings.filter((training) => training.id !== action.payload),
      }
    case "SET_TIME_OFFS":
      return { ...state, timeOffs: action.payload }
    case "ADD_TIME_OFF":
      return { ...state, timeOffs: [...state.timeOffs, action.payload] }
    case "UPDATE_TIME_OFF":
      return {
        ...state,
        timeOffs: state.timeOffs.map((timeOff) =>
          timeOff.id === action.payload.id ? action.payload : timeOff
        ),
      }
    case "DELETE_TIME_OFF":
      return {
        ...state,
        timeOffs: state.timeOffs.filter((timeOff) => timeOff.id !== action.payload),
      }
    case "SET_WARNINGS":
      return { ...state, warnings: action.payload }
    case "ADD_WARNING":
      return { ...state, warnings: [...state.warnings, action.payload] }
    case "UPDATE_WARNING":
      return {
        ...state,
        warnings: state.warnings.map((warning) =>
          warning.id === action.payload.id ? action.payload : warning
        ),
      }
    case "DELETE_WARNING":
      return {
        ...state,
        warnings: state.warnings.filter((warning) => warning.id !== action.payload),
      }
    case "SET_ATTENDANCES":
      return { ...state, attendances: action.payload, attendanceRecords: action.payload }
    case "ADD_ATTENDANCE": {
      const next = [...state.attendances, action.payload]
      return { ...state, attendances: next, attendanceRecords: next }
    }
    case "UPDATE_ATTENDANCE": {
      const next = state.attendances.map((attendance) =>
        attendance.id === action.payload.id ? action.payload : attendance
      )
      return { ...state, attendances: next, attendanceRecords: next }
    }
    case "DELETE_ATTENDANCE": {
      const next = state.attendances.filter((attendance) => attendance.id !== action.payload)
      return { ...state, attendances: next, attendanceRecords: next }
    }
    case "SET_COMPLIANCE_TASKS":
      return { ...state, complianceTasks: action.payload }
    case "ADD_COMPLIANCE_TASK":
      return { ...state, complianceTasks: [...state.complianceTasks, action.payload] }
    case "UPDATE_COMPLIANCE_TASK":
      return {
        ...state,
        complianceTasks: state.complianceTasks.map((task) =>
          task.id === action.payload.id ? action.payload : task
        ),
      }
    case "DELETE_COMPLIANCE_TASK":
      return {
        ...state,
        complianceTasks: state.complianceTasks.filter((task) => task.id !== action.payload),
      }
    case "SET_ANNOUNCEMENTS":
      return { ...state, announcements: action.payload }
    case "ADD_ANNOUNCEMENT":
      return { ...state, announcements: [...state.announcements, action.payload] }
    case "UPDATE_ANNOUNCEMENT":
      return {
        ...state,
        announcements: state.announcements.map((announcement) =>
          announcement.id === action.payload.id ? action.payload : announcement
        ),
      }
    case "DELETE_ANNOUNCEMENT":
      return {
        ...state,
        announcements: state.announcements.filter((announcement) => announcement.id !== action.payload),
      }
    // Job actions
    case "SET_JOBS":
      return { ...state, jobs: action.payload, jobPostings: action.payload }
    case "ADD_JOB": {
      const next = [...state.jobs, action.payload]
      return { ...state, jobs: next, jobPostings: next }
    }
    case "UPDATE_JOB": {
      const next = state.jobs.map((job) =>
        job.id === action.payload.id ? action.payload : job
      )
      return { ...state, jobs: next, jobPostings: next }
    }
    case "DELETE_JOB": {
      const next = state.jobs.filter((job) => job.id !== action.payload)
      return { ...state, jobs: next, jobPostings: next }
    }
    case "SET_CANDIDATES":
      return { ...state, candidates: action.payload }
    case "ADD_CANDIDATE":
      return { ...state, candidates: [...state.candidates, action.payload] }
    case "UPDATE_CANDIDATE":
      return {
        ...state,
        candidates: state.candidates.map((candidate) => (candidate.id === action.payload.id ? action.payload : candidate)),
      }
    case "DELETE_CANDIDATE":
      return {
        ...state,
        candidates: state.candidates.filter((candidate) => candidate.id !== action.payload),
      }
    case "SET_INTERVIEWS":
      return { ...state, interviews: action.payload }
    case "ADD_INTERVIEW":
      return { ...state, interviews: [...state.interviews, action.payload] }
    case "UPDATE_INTERVIEW":
      return {
        ...state,
        interviews: state.interviews.map((interview) => (interview.id === action.payload.id ? action.payload : interview)),
      }
    case "DELETE_INTERVIEW":
      return {
        ...state,
        interviews: state.interviews.filter((interview) => interview.id !== action.payload),
      }
    case "SET_PAYROLL_RECORDS":
      return { ...state, payrollRecords: action.payload }
    case "ADD_PAYROLL":
      return { ...state, payrollRecords: [...state.payrollRecords, action.payload] }
    case "UPDATE_PAYROLL":
      return {
        ...state,
        payrollRecords: state.payrollRecords.map((record) =>
          record.id === action.payload.id ? action.payload : record
        ),
      }
    case "DELETE_PAYROLL":
      return {
        ...state,
        payrollRecords: state.payrollRecords.filter((record) => record.id !== action.payload),
      }
    case "SET_PERFORMANCE_REVIEWS":
      return { ...state, performanceReviews: action.payload }
    case "ADD_PERFORMANCE_REVIEW":
      return { ...state, performanceReviews: [...state.performanceReviews, action.payload] }
    case "UPDATE_PERFORMANCE_REVIEW":
      return {
        ...state,
        performanceReviews: state.performanceReviews.map((review) =>
          review.id === action.payload.id ? action.payload : review
        ),
      }
    case "DELETE_PERFORMANCE_REVIEW":
      return {
        ...state,
        performanceReviews: state.performanceReviews.filter((review) => review.id !== action.payload),
      }
    case "SET_PERFORMANCE_REVIEW_TEMPLATES":
      return { ...state, performanceReviewTemplates: action.payload }
    case "ADD_PERFORMANCE_REVIEW_TEMPLATE":
      return { ...state, performanceReviewTemplates: [...state.performanceReviewTemplates, action.payload] }
    case "UPDATE_PERFORMANCE_REVIEW_TEMPLATE":
      return {
        ...state,
        performanceReviewTemplates: state.performanceReviewTemplates.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      }
    case "DELETE_PERFORMANCE_REVIEW_TEMPLATE":
      return {
        ...state,
        performanceReviewTemplates: state.performanceReviewTemplates.filter((t) => t.id !== action.payload),
      }
    case "SET_TRAINING_PROGRAMS":
      return { ...state, trainingPrograms: action.payload }
    case "SET_SCHEDULES":
      return { ...state, schedules: action.payload }
    case "SET_CONTRACTS":
      return { ...state, contracts: action.payload }
    case "ADD_CONTRACT":
      return {
        ...state,
        contracts: [...state.contracts, action.payload]
      }
    case "UPDATE_CONTRACT":
      return {
        ...state,
        contracts: state.contracts.map(contract =>
          contract.id === action.payload.id ? action.payload : contract
        )
      }
    case "SET_CONTRACT_TEMPLATES":
      return { ...state, contractTemplates: action.payload }
    case "ADD_CONTRACT_TEMPLATE":
      return {
        ...state,
        contractTemplates: [...(state.contractTemplates || []), action.payload]
      }
    case "SET_BENEFITS":
      return { ...state, benefits: action.payload }
    case "SET_EVENTS":
      return { ...state, events: action.payload }
    case "SET_EMPLOYEE_BENEFITS":
      return { ...state, employeeBenefits: action.payload }
    case "SET_EXPENSE_REPORTS":
      return { ...state, expenseReports: action.payload }
    case "SET_STARTER_CHECKLISTS":
      return { ...state, starterChecklists: action.payload }
    case "SET_INCENTIVES":
      return { ...state, incentives: action.payload }
    case "SET_VENUE_BATTLES":
      return { ...state, venueBattles: action.payload }
    case "SET_DIVERSITY_INITIATIVES":
      return { ...state, diversityInitiatives: action.payload }
    case "SET_DIVERSITY_SURVEYS":
      return { ...state, diversitySurveys: action.payload }
    case "ADD_DIVERSITY_INITIATIVE":
      return {
        ...state,
        diversityInitiatives: [...(state.diversityInitiatives || []), action.payload],
      }
    case "UPDATE_DIVERSITY_INITIATIVE":
      return {
        ...state,
        diversityInitiatives: (state.diversityInitiatives || []).map((initiative) =>
          initiative.id === action.payload.id ? action.payload : initiative
        ),
      }
    case "DELETE_DIVERSITY_INITIATIVE":
      return {
        ...state,
        diversityInitiatives: (state.diversityInitiatives || []).filter(
          (initiative) => initiative.id !== action.payload
        ),
      }
    case "ADD_DIVERSITY_SURVEY":
      return {
        ...state,
        diversitySurveys: [...(state.diversitySurveys || []), action.payload],
      }
    case "UPDATE_DIVERSITY_SURVEY":
      return {
        ...state,
        diversitySurveys: (state.diversitySurveys || []).map((survey) =>
          survey.id === action.payload.id ? action.payload : survey
        ),
      }
    case "DELETE_DIVERSITY_SURVEY":
      return {
        ...state,
        diversitySurveys: (state.diversitySurveys || []).filter(
          (survey) => survey.id !== action.payload
        ),
      }
    case "ADD_SCHEDULE":
      return { ...state, schedules: [...state.schedules, action.payload] }
    case "UPDATE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.payload.id ? action.payload : schedule
        ),
      }
    case "DELETE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.filter((schedule) => schedule.id !== action.payload),
      }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_INITIALIZED":
      return { ...state, initialized: action.payload }
    case "BATCH_UPDATE":
      return {
        ...state,
        ...(action.payload.employees !== undefined && { employees: action.payload.employees }),
        ...(action.payload.roles !== undefined && { roles: action.payload.roles }),
        ...(action.payload.departments !== undefined && { departments: action.payload.departments }),
        ...(action.payload.trainings !== undefined && { trainings: action.payload.trainings }),
        ...(action.payload.timeOffs !== undefined && { timeOffs: action.payload.timeOffs }),
        ...(action.payload.warnings !== undefined && { warnings: action.payload.warnings }),
        ...(action.payload.attendances !== undefined && { 
          attendances: action.payload.attendances,
          attendanceRecords: action.payload.attendances // Alias
        }),
        ...(action.payload.complianceTasks !== undefined && { complianceTasks: action.payload.complianceTasks }),
        ...(action.payload.announcements !== undefined && { announcements: action.payload.announcements }),
        ...(action.payload.jobs !== undefined && { 
          jobs: action.payload.jobs,
          jobPostings: action.payload.jobs // Alias
        }),
        ...(action.payload.candidates !== undefined && { candidates: action.payload.candidates }),
        ...(action.payload.interviews !== undefined && { interviews: action.payload.interviews }),
        ...(action.payload.payrollRecords !== undefined && { payrollRecords: action.payload.payrollRecords }),
        ...(action.payload.performanceReviews !== undefined && { performanceReviews: action.payload.performanceReviews }),
        ...(action.payload.performanceReviewTemplates !== undefined && { performanceReviewTemplates: action.payload.performanceReviewTemplates }),
        ...(action.payload.schedules !== undefined && { schedules: action.payload.schedules }),
        ...(action.payload.contracts !== undefined && { contracts: action.payload.contracts }),
        ...(action.payload.contractTemplates !== undefined && { contractTemplates: action.payload.contractTemplates }),
        ...(action.payload.benefits !== undefined && { benefits: action.payload.benefits }),
        ...(action.payload.events !== undefined && { events: action.payload.events }),
        ...(action.payload.employeeBenefits !== undefined && { employeeBenefits: action.payload.employeeBenefits }),
        ...(action.payload.expenseReports !== undefined && { expenseReports: action.payload.expenseReports }),
        ...(action.payload.starterChecklists !== undefined && { starterChecklists: action.payload.starterChecklists }),
        ...(action.payload.incentives !== undefined && { incentives: action.payload.incentives }),
        ...(action.payload.venueBattles !== undefined && { venueBattles: action.payload.venueBattles }),
        ...(action.payload.diversityInitiatives !== undefined && { diversityInitiatives: action.payload.diversityInitiatives }),
        ...(action.payload.diversitySurveys !== undefined && { diversitySurveys: action.payload.diversitySurveys }),
        ...(action.payload.initialized !== undefined && { initialized: action.payload.initialized }),
      }
    default:
      return state
  }
}

// Provider component
interface HRProviderProps {
  children: ReactNode
}

export const HRProvider: React.FC<HRProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(hrReducer, initialState)
  // Latest state ref for change detection inside async helpers
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  const { getBasePath, state: companyState, hasPermission } = useCompany()
  const { state: settingsState } = useSettings()
  // Track active loading operations to prevent race conditions
  const activeLoadingOps = useRef<Set<string>>(new Set())

  // Avoid UI flashing: don't dispatch if data hasn't actually changed.
  const hashArray = (arr: any[] | undefined | null): number => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return 0

    // Fast heuristic to avoid CPU-heavy full-array string hashing on large collections.
    let hash = arr.length
    const mid = Math.floor(arr.length / 2)
    const samples = [arr[0], arr[mid], arr[arr.length - 1]]

    for (const it of samples) {
      if (!it) continue
      const ver = it.updatedAt ?? it.updated ?? it.modifiedAt ?? it.createdAt ?? 0
      const verNum = typeof ver === "number" ? ver : String(ver).length
      hash = (hash + (Number.isFinite(verNum) ? verNum : 0)) % 2147483647
    }

    return hash
  }

  const getStateArrayForEntity = (entityName: string): any[] => {
    const s = stateRef.current as any
    switch (entityName) {
      case "employees": return s.employees || []
      case "roles": return s.roles || []
      case "departments": return s.departments || []
      case "trainings": return s.trainings || []
      case "timeOffs": return s.timeOffs || []
      case "warnings": return s.warnings || []
      case "attendances": return s.attendances || []
      case "payroll": return s.payrollRecords || []
      case "performanceReviews": return s.performanceReviews || []
      case "performanceReviewTemplates": return s.performanceReviewTemplates || []
      case "schedules": return s.schedules || []
      case "jobs": return s.jobs || []
      case "candidates": return s.candidates || []
      case "interviews": return s.interviews || []
      case "announcements": return s.announcements || []
      case "contracts": return s.contracts || []
      case "contractTemplates": return s.contractTemplates || []
      case "benefits": return s.benefits || []
      case "complianceTasks": return s.complianceTasks || []
      case "events": return s.events || []
      case "expenseReports": return s.expenseReports || []
      case "diversityInitiatives": return s.diversityInitiatives || []
      case "diversitySurveys": return s.diversitySurveys || []
      default: return []
    }
  }

  // Generic RTDB list fetcher for HR entities - now uses facade
  const fetchList = useCallback(async <T extends { id: string }>(
    basePath: string,
    collection: string,
  ): Promise<T[]> => {
    return await fetchHRCollectionFn(basePath, collection) as T[]
  }, [fetchHRCollectionFn])

  // =======================
  // Settings helpers (companies/<id>/settings/hr[/sites...][/subsites...])
  // =======================
  const getHRSettingsBasePath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/hr`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadHRSettingsSection = useCallback(async (section: "general" | "compliance"): Promise<any | null> => {
    const base = getHRSettingsBasePath()
    if (!base) return null
    try {
      return await fetchHRSettingsSectionFn(base, section)
    } catch (err: any) {
      debugWarn("HRContext: loadHRSettingsSection failed", err)
      return null
    }
  }, [getHRSettingsBasePath, fetchHRSettingsSectionFn])

  const saveHRSettingsSection = useCallback(async (section: "general" | "compliance", data: Record<string, any>): Promise<void> => {
    const base = getHRSettingsBasePath()
    if (!base) return
    await saveHRSettingsSectionFn(base, section, data)
  }, [getHRSettingsBasePath, saveHRSettingsSectionFn])

  const getHRIntegrationsPath = useCallback(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/hr/integrations`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  const loadHRIntegrations = useCallback(async (): Promise<any> => {
    const path = getHRIntegrationsPath()
    if (!path) return {}
    try {
      return await fetchHRIntegrationsFn(path)
    } catch (err: any) {
      debugWarn("HRContext: loadHRIntegrations failed", err)
      return {}
    }
  }, [getHRIntegrationsPath, fetchHRIntegrationsFn])

  const saveHRIntegration = useCallback(async (integration: { id: string } & Record<string, any>): Promise<void> => {
    const path = getHRIntegrationsPath()
    if (!path || !integration?.id) return
    await saveHRIntegrationFn(path, integration)
  }, [getHRIntegrationsPath, saveHRIntegrationFn])

  // Legacy site-scoped HR company settings used by some HR settings pages
  const getHRSiteCompanyPath = useCallback(() => {
    if (!companyState.companyID) return null
    if (companyState.selectedSiteID) {
      return `companies/${companyState.companyID}/sites/${companyState.selectedSiteID}/data/company`
    }
    // If only company is selected, allow company-level HR company settings
    return `companies/${companyState.companyID}/data/company`
  }, [companyState.companyID, companyState.selectedSiteID])

  const loadHREmployeeDefaults = useCallback(async (): Promise<any | null> => {
    const base = getHRSiteCompanyPath()
    if (!base) return null
    try {
      return await fetchHREmployeeDefaultsFn(base)
    } catch (err: any) {
      debugWarn("HRContext: loadHREmployeeDefaults failed", err)
      return null
    }
  }, [getHRSiteCompanyPath, fetchHREmployeeDefaultsFn])

  const saveHREmployeeDefaults = useCallback(async (data: Record<string, any>): Promise<void> => {
    const base = getHRSiteCompanyPath()
    if (!base) return
    await saveHREmployeeDefaultsFn(base, data)
  }, [getHRSiteCompanyPath, saveHREmployeeDefaultsFn])

  const loadHRPayrollSettings = useCallback(async (): Promise<any | null> => {
    const base = getHRSiteCompanyPath()
    if (!base) return null
    try {
      return await fetchHRPayrollSettingsFn(base)
    } catch (err: any) {
      debugWarn("HRContext: loadHRPayrollSettings failed", err)
      return null
    }
  }, [getHRSiteCompanyPath, fetchHRPayrollSettingsFn])

  const saveHRPayrollSettings = useCallback(async (data: Record<string, any>): Promise<void> => {
    const base = getHRSiteCompanyPath()
    if (!base) return
    await saveHRPayrollSettingsFn(base, data)
  }, [getHRSiteCompanyPath, saveHRPayrollSettingsFn])

  // Helper function for creating notifications
  const createHRNotification = useCallback(async (
    action: 'created' | 'updated' | 'deleted',
    entityType: string,
    entityName: string,
    entityId: string,
    oldValue?: any,
    newValue?: any
  ) => {
    try {
      const titles = {
        created: `${entityType} Added`,
        updated: `${entityType} Updated`, 
        deleted: `${entityType} Removed`
      }
      
      const messages = {
        created: `${entityName} was added`,
        updated: `${entityName} was updated`,
        deleted: `${entityName} was removed`
      }
      
      const categories = {
        created: 'success' as const,
        updated: 'info' as const,
        deleted: 'warning' as const
      }

      await createNotification(
        companyState.companyID,
        settingsState.auth?.uid || 'system',
        'hr',
        action,
        titles[action],
        messages[action],
        {
          siteId: companyState.selectedSiteID || undefined,
          priority: 'medium',
          category: categories[action],
          details: {
            entityId,
            entityName,
            oldValue: action === "created" ? null : (oldValue ?? null),
            newValue: action === "deleted" ? null : (newValue ?? null),
            changes: {
              [entityType.toLowerCase()]: { 
                from: action === 'created' ? {} : oldValue, 
                to: action === 'deleted' ? null : newValue 
              }
            }
          },
          metadata: buildAuditMetadata({
            type: "hr",
            action,
            section: `HR/${entityType}`,
            companyId: companyState.companyID,
            siteId: companyState.selectedSiteID || undefined,
            subsiteId: (companyState as any).selectedSubsiteID || undefined,
            uid: settingsState.auth?.uid || "system",
            employeeId: getCurrentEmployeeId(companyState, settingsState),
            entityId,
            entityName,
          }),
        }
      )
    } catch (error) {
      // silent
    }
  }, [companyState.companyID, companyState.selectedSiteID, settingsState.auth?.uid, settingsState, companyState])

  const hrTimersRef = useRef<{
    basePath: string | null
    coreTimerId: string | null
    allTimerId: string | null
    coreLogged: boolean
    allLogged: boolean
  }>({ basePath: null, coreTimerId: null, allTimerId: null, coreLogged: false, allLogged: false })
  const didLogCacheHydrateRef = useRef(false)

  
  // Generic safe refresh function to handle loading state and prevent race conditions
  const safeRefresh = async <T,>(entityName: string, fetchFn: () => Promise<T[]>, actionType: string): Promise<void> => {
    try {
      // Only set loading to true if no other refresh operations are active
      if (activeLoadingOps.current.size === 0) {
        dispatch({ type: "SET_LOADING", payload: true })
      }
      
      // Mark this entity as being refreshed
      activeLoadingOps.current.add(entityName)
      
      // Fetch data
      const data = await fetchFn()
      
      // Only update state if we got valid data (non-empty array or if it's a legitimate empty result)
      // This prevents overwriting existing data with empty arrays from failed/cached fetches
      if (Array.isArray(data)) {
        // Skip dispatch if no actual change (prevents full page flashing)
        const prevArr = getStateArrayForEntity(entityName)
        if (hashArray(prevArr) !== hashArray(data as any[])) {
          dispatch({ type: actionType as any, payload: data })
        }
      } else {
        // Don't update state if data is invalid - preserve existing data
      }
      
      // Set initialized to true after successfully fetching data
      if (!state.initialized) {
        dispatch({ type: "SET_INITIALIZED", payload: true })
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: `Failed to refresh ${entityName}` })
      // Don't clear data on error - preserve existing state
    } finally {
      // Remove this entity from active operations
      activeLoadingOps.current.delete(entityName)
      
      // Only set loading to false if no other refresh operations are active
      if (activeLoadingOps.current.size === 0) {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }
  }

  // Multi-path loader for HR data
  const getHRPaths = useCallback(() => {
    if (!companyState.companyID) {
      return []
    }
    
    const paths: string[] = []
    const companyRoot = `companies/${companyState.companyID}`
    const cfgLevel = (companyState as any)?.dataManagement?.hr || "site"

    const companyPath = `${companyRoot}/data/hr`

    if (cfgLevel === "subsite") {
      if (companyState.selectedSiteID && companyState.selectedSubsiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/subsites/${companyState.selectedSubsiteID}/data/hr`)
      }
      if (companyState.selectedSiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/hr`)
      }
      paths.push(companyPath)
      return paths
    }

    if (cfgLevel === "site") {
      if (companyState.selectedSiteID) {
        paths.push(`${companyRoot}/sites/${companyState.selectedSiteID}/data/hr`)
      }
      paths.push(companyPath)
      return paths
    }

    // Default: company-level HR
    paths.push(companyPath)
    return paths
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID, (companyState as any)?.dataManagement?.hr])

  // Get the primary write path for HR data (uses highest priority path for write operations)
  const getHRWritePath = useCallback(() => {
    const paths = getHRPaths()
    const writePath = paths.length > 0 ? paths[0] : ""
    return writePath
  }, [getHRPaths])

  // Create cached fetchers for all data types (with request deduplication)
  // Must be defined before functions that use them
  const fetchEmployeesCached = useMemo(() => createCachedFetcher(fetchEmployees, 'employees'), [])
  const fetchRolesCached = useMemo(() => createCachedFetcher(fetchRoles, 'roles'), [])
  const fetchDepartmentsCached = useMemo(() => createCachedFetcher(fetchDepartments, 'departments'), [])
  const fetchTimeOffsCached = useMemo(() => createCachedFetcher(fetchTimeOffs, 'timeOffs'), [])
  const fetchWarningsCached = useMemo(() => createCachedFetcher(fetchWarnings, 'warnings'), [])
  const fetchTrainingsCached = useMemo(() => createCachedFetcher(fetchTrainings, 'trainings'), [])
  const fetchAttendancesCached = useMemo(() => createCachedFetcher(fetchAttendances, 'attendances'), [])
  const fetchPayrollCached = useMemo(() => createCachedFetcher(fetchPayroll, 'payroll'), [])
  const fetchPerformanceReviewsCached = useMemo(() => createCachedFetcher(fetchPerformanceReviews, 'performanceReviews'), [])
  const fetchSchedulesCached = useMemo(() => createCachedFetcher(fetchSchedules, 'schedules'), [])
  const fetchJobsCached = useMemo(() => createCachedFetcher(rtdb.fetchJobs, 'jobs'), [])
  const fetchCandidatesCached = useMemo(() => createCachedFetcher(rtdb.fetchCandidates, 'candidates'), [])
  const fetchInterviewsCached = useMemo(() => createCachedFetcher(rtdb.fetchInterviews, 'interviews'), [])
  const fetchAnnouncementsCached = useMemo(() => createCachedFetcher(rtdb.fetchAnnouncements, 'announcements'), [])
  const fetchContractsCached = useMemo(() => createCachedFetcher(fetchContractsRTDB, 'contracts'), [])
  const fetchContractTemplatesCached = useMemo(() => createCachedFetcher(fetchContractTemplatesRTDB, 'contractTemplates'), [])
  const fetchBenefitsCached = useMemo(() => createCachedFetcher(fetchBenefitsRTDB, 'benefits'), [])
  const fetchComplianceTasksCached = useMemo(() => createCachedFetcher((p) => fetchList<ComplianceTask>(p, 'complianceTasks'), 'complianceTasks'), [fetchList])
  const fetchEventsCached = useMemo(() => createCachedFetcher((p) => fetchList<CompanyEvent>(p, 'events'), 'events'), [fetchList])
  const fetchExpenseReportsCached = useMemo(() => createCachedFetcher((p) => fetchList<ExpenseReport>(p, 'expenseReports'), 'expenseReports'), [fetchList])
  const fetchDiversityInitiativesCached = useMemo(() => createCachedFetcher((p) => fetchList<DiversityInitiative>(p, 'diversityInitiatives'), 'diversityInitiatives'), [fetchList])
  const fetchDiversitySurveysCached = useMemo(() => createCachedFetcher((p) => fetchList<DiversitySurvey>(p, 'diversitySurveys'), 'diversitySurveys'), [fetchList])

  const refreshEmployees = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    const paths = getHRPaths()
    const baseRootPath = getBasePath("hr")
    const basePath = baseRootPath ? `${baseRootPath}/data/hr` : ""
    
    if (!basePath || paths.length === 0) return
    
    await safeRefresh('employees', 
      async () => {
        const allEmployees: any[] = []
        const employeeIds = new Set<string>()
        
        // Helper to add employees with deduplication
        const addEmployees = (employees: any[]) => {
          if (!employees || !Array.isArray(employees)) return
          employees.forEach(emp => {
            // Generate a unique ID for deduplication - use id, employeeID, or generate one
            const empId = emp.id || emp.employeeID || `temp_${Math.random().toString(36).substr(2, 9)}`
            
            // Only skip if we've already seen this exact ID
            if (!employeeIds.has(empId)) {
              employeeIds.add(empId)
              // Ensure employee has an id field for consistency
              if (!emp.id && emp.employeeID) {
                emp.id = emp.employeeID
              } else if (!emp.id && !emp.employeeID) {
                // Generate a temporary ID if neither exists (shouldn't happen, but be safe)
                emp.id = empId
              }
              allEmployees.push(emp)
            }
          })
        }
        
        // Try cached fetch from basePath first (for performance)
        // NOTE: when forceRefresh=true we bypass cache to ensure UI reflects recent mutations.
        try {
          const cachedData = await fetchEmployeesCached(basePath, forceRefresh)
          if (cachedData && cachedData.length > 0) {
            addEmployees(cachedData)
          }
        } catch (error) {
          // Silent fail - will try all paths
        }
        
        // Always check ALL paths to ensure we get all employees
        // This is important because employees might exist at different levels (subsite, site, company)
        for (const path of paths) {
          // Skip if we already loaded from this path via cache
          // IMPORTANT: if forceRefresh=true, do NOT skip basePath; we need a fresh network read.
          if (!forceRefresh && path === basePath && allEmployees.length > 0) {
            continue
          }
          
          try {
            // When forceRefresh=true, bypass any cached fetchers by calling the raw fetch.
            const data = await fetchEmployees(path)
            if (data && data.length > 0) {
              addEmployees(data)
              // (silent)
            }
          } catch (error) {
            continue
          }
        }
        return allEmployees
      },
      "SET_EMPLOYEES"
    )
  }, [getHRPaths, getBasePath, fetchEmployeesCached, safeRefresh])

  const refreshRoles = useCallback(async (forceRefresh = false): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "roles",
      async () => {
        const allRoles: Role[] = []
        const roleIds = new Set<string>()

        const addRoles = (roles: Role[]) => {
          if (!roles || !Array.isArray(roles)) return
          roles.forEach((r: any) => {
            const roleId = r.id || r.roleID || `temp_${Math.random().toString(36).substr(2, 9)}`
            if (!roleIds.has(roleId)) {
              roleIds.add(roleId)
              if (!r.id) r.id = r.roleID || roleId
              allRoles.push(r as Role)
            }
          })
        }

        for (const path of paths) {
          try {
            // When forceRefresh=true, bypass cache to ensure UI reflects recent mutations.
            const data = forceRefresh ? await fetchRoles(path) : await fetchRolesCached(path, false)
            if (data && data.length > 0) addRoles(data)
          } catch {
            continue
          }
        }

        return allRoles
      },
      "SET_ROLES",
    )
  }, [getHRPaths, fetchRolesCached, safeRefresh])

  const refreshDepartments = useCallback(async (forceRefresh = false): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "departments",
      async () => {
        const allDepartments: Department[] = []
        const deptIds = new Set<string>()

        const addDepts = (depts: Department[]) => {
          if (!depts || !Array.isArray(depts)) return
          depts.forEach((d: any) => {
            const deptId = d.id || d.departmentID || `temp_${Math.random().toString(36).substr(2, 9)}`
            if (!deptIds.has(deptId)) {
              deptIds.add(deptId)
              if (!d.id) d.id = d.departmentID || deptId
              allDepartments.push(d as Department)
            }
          })
        }

        for (const path of paths) {
          try {
            // When forceRefresh=true, bypass cache to ensure UI reflects recent mutations.
            const data = forceRefresh ? await fetchDepartments(path) : await fetchDepartmentsCached(path, false)
            if (data && data.length > 0) addDepts(data)
          } catch {
            continue
          }
        }

        return allDepartments
      },
      "SET_DEPARTMENTS",
    )
  }, [getHRPaths, fetchDepartmentsCached, safeRefresh])

  // Resolve the nearest path that actually contains the entity ID (subsite -> site -> company).
  const resolveHRPathForEntityId = useCallback(async (
    entity: 'roles' | 'departments',
    id: string,
  ): Promise<string | null> => {
    const paths = getHRPaths()
    const path = await findHRReadPathFn(paths, entity, id)
    return path ?? null
  }, [getHRPaths])

  // Resolve the nearest HR path that actually contains the schedule ID.
  // IMPORTANT: We do NOT want to "update" a schedule by accidentally creating it in the
  // current write-path if it originally lives elsewhere (that causes duplicates).
  const resolveHRPathForScheduleId = useCallback(async (scheduleId: string): Promise<string | null> => {
    const writePath = getHRWritePath()
    if (writePath) {
      const found = await findHRSchedulePathFn([writePath], scheduleId)
      if (found) return found
    }
    const otherPaths = getHRPaths().filter(p => p !== writePath)
    const path = await findHRSchedulePathFn(otherPaths, scheduleId)
    return path ?? null
  }, [getHRPaths, getHRWritePath])
  
  // Legacy refreshDepartments with path parsing (kept for backward compatibility)

  const refreshJobs = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    await safeRefresh('jobs', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const jobs = await rtdb.fetchJobs(fullPath)
        return jobs
      },
      "SET_JOBS"
    )
  }

  const refreshCandidates = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    await safeRefresh('candidates', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const candidates = await rtdb.fetchCandidates(fullPath)
        return candidates
      },
      "SET_CANDIDATES"
    )
  }

  const refreshContracts = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    await safeRefresh('contracts', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const contracts = await fetchContractsRTDB(fullPath)
        return contracts
      },
      "SET_CONTRACTS"
    )
  }

  const refreshInterviews = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    await safeRefresh('interviews', 
      async () => {
        const interviews = await rtdb.fetchInterviews(basePath)
        return interviews
      },
      "SET_INTERVIEWS"
    )
  }

  const refreshAnnouncements = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    await safeRefresh('announcements', 
      async () => await rtdb.fetchAnnouncements(`${basePath}/data/hr`),
      "SET_ANNOUNCEMENTS"
    )
  }

  const addAnnouncement = async (announcement: Omit<Announcement, 'id'>): Promise<Announcement | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) return null

    try {
      const newAnnouncement = await rtdb.createAnnouncement(`${basePath}/data/hr`, announcement)
      dispatch({ type: "ADD_ANNOUNCEMENT", payload: newAnnouncement })
      
      // Add notification
      try {
        await createHRNotification(
          'created',
          'Announcement',
          announcement.title || 'New Announcement',
          newAnnouncement.id,
          undefined,
          newAnnouncement
        )
      } catch (notificationError) {
        debugWarn('Failed to create notification:', notificationError)
      }
      
      return newAnnouncement
    } catch (error) {
      console.error("Error creating announcement:", error)
      throw error
    }
  }

  const updateAnnouncement = useCallback(async (announcementId: string, updates: Partial<Announcement>): Promise<Announcement | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) return null

    try {
      const originalAnnouncement = stateRef.current.announcements.find(a => a.id === announcementId)
      await rtdb.updateAnnouncement(`${basePath}/data/hr`, announcementId, updates)
      const updatedAnnouncement = { ...updates, id: announcementId } as Announcement
      dispatch({ type: "UPDATE_ANNOUNCEMENT", payload: updatedAnnouncement })
      
      // Add notification
      try {
        await createHRNotification(
          'updated',
          'Announcement',
          updates.title || originalAnnouncement?.title || 'Announcement',
          announcementId,
          originalAnnouncement,
          updatedAnnouncement
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedAnnouncement
    } catch (error) {
      console.error("Error updating announcement:", error)
      throw error
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deleteAnnouncement = useCallback(async (announcementId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false

    try {
      const announcementToDelete = stateRef.current.announcements.find(a => a.id === announcementId)
      await rtdb.deleteAnnouncement(`${basePath}/data/hr`, announcementId)
      dispatch({ type: "DELETE_ANNOUNCEMENT", payload: announcementId })
      
      // Add notification
      if (announcementToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Announcement',
            announcementToDelete.title || 'Announcement',
            announcementId,
            announcementToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting announcement:", error)
      throw error
    }
  }, [dispatch, getBasePath, createHRNotification])

  const refreshPayrolls = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return

    await safeRefresh('payrolls', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const result = await fetchPayroll(fullPath)
        return result
      },
      "SET_PAYROLL_RECORDS"
    )
  }

  const refreshPerformanceReviews = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return

    await safeRefresh('performanceReviews', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const reviews = await fetchList<PerformanceReviewEntry>(fullPath, "performanceReviews")
        return reviews
      },
      "SET_PERFORMANCE_REVIEWS"
    )
  }

  const refreshPerformanceReviewTemplates = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return

    await safeRefresh(
      "performanceReviewTemplates",
      async () => {
        const fullPath = `${basePath}/data/hr`
        const templates = await fetchList<PerformanceReviewTemplate>(fullPath, "reviewTemplates")
        return templates
      },
      "SET_PERFORMANCE_REVIEW_TEMPLATES",
    )
  }

  const refreshSchedules = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh('schedules', 
      async () => {
        const allSchedules: any[] = []
        const scheduleIds = new Set<string>()
        
        // Load schedules from all paths, aggregating them
        for (const path of paths) {
          try {
            const schedules = await fetchSchedules(path)
            
            if (schedules && schedules.length > 0) {
              // Add schedules from this path, avoiding duplicates
              schedules.forEach(schedule => {
                const scheduleId = schedule.id || (schedule as any).scheduleID
                if (scheduleId && !scheduleIds.has(scheduleId)) {
                  scheduleIds.add(scheduleId)
                  allSchedules.push(schedule)
                }
              })
            }
          } catch (error) {
            continue
          }
        }

        return allSchedules
      },
      "SET_SCHEDULES"
    )
  }









  // Refresh trainings data
  const refreshTrainings = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    // Extract companyId and siteId from basePath
    const pathParts = basePath.split("/")
    
    if (pathParts.length >= 2 && pathParts[0] === "companies") {
      // Check if this is site-level data management
      if (pathParts.length >= 4 && pathParts[2] === "sites") {
        
        await safeRefresh('trainings', 
          () => fetchTrainings(`${basePath}/data/hr`),
          "SET_TRAININGS"
        )
      } else {
        // Company-level data management - use companyId as siteId
        await safeRefresh('trainings', 
          () => fetchTrainings(`${basePath}/data/hr`),
          "SET_TRAININGS"
        )
      }
    } else {
      console.error("Invalid basePath format for HR context:", basePath)
      dispatch({ type: "SET_ERROR", payload: "Invalid path format for HR data" })
    }
  }

  // Refresh time offs data (using cached fetcher for performance)
  const refreshTimeOffs = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    const fullPath = `${basePath}/data/hr`
    
    // Invalidate cache if force refresh is requested
    if (forceRefresh) {
      const cacheKey = `${fullPath}/timeOffs`
      dataCache.invalidate(cacheKey)
    }
    
    await safeRefresh('timeOffs', 
      async () => {
        // Use cached fetcher - pass forceRefresh to bypass cache if needed
        return await fetchTimeOffsCached(fullPath, forceRefresh)
      },
      "SET_TIME_OFFS"
    )
  }, [getBasePath, fetchTimeOffsCached, safeRefresh])

  // Refresh warnings data
  const refreshWarnings = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return

    await safeRefresh('warnings', 
      async () => {
        const fullPath = `${basePath}/data/hr`
        const warnings = await fetchWarnings(fullPath)
        return warnings
      },
      "SET_WARNINGS"
    )
  }

  // Refresh attendances data
  const refreshAttendances = async (): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) return
    
    const pathParts = basePath.split("/")
    
    if (pathParts.length >= 2 && pathParts[0] === "companies") {
      // Check if this is site-level data management
      if (pathParts.length >= 4 && pathParts[2] === "sites") {
        
        await safeRefresh('attendances', 
          () => fetchAttendances(`${basePath}/data/hr`),
          "SET_ATTENDANCES"
        )
      } else {
        // Company-level data management
        await safeRefresh('attendances', 
          () => fetchAttendances(`${basePath}/data/hr`),
          "SET_ATTENDANCES"
        )
      }
    } else {
      console.error("Invalid basePath format for HR context:", basePath)
      dispatch({ type: "SET_ERROR", payload: "Invalid path format for HR data" })
    }
  }

  // Track loaded base paths to prevent duplicate loading
  const loadedPaths = React.useRef<Set<string>>(new Set())
  const loadingTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({})

  // Track previous basePath to detect changes
  const previousBasePathRef = useRef<string | null>(null)

  // Auto-refresh data when base path changes (with progressive loading + caching)
  useEffect(() => {
    // Wait for dependencies: Settings and Company must be ready first
    if (!settingsState.auth || settingsState.loading) {
      return // Settings not ready yet
    }
    
    // If no company selected but user is logged in, mark as initialized with empty state
    if (!companyState.companyID && settingsState.auth.isLoggedIn) {
      if (!state.initialized) {
        dispatch({ type: "SET_INITIALIZED", payload: true })
      }
      previousBasePathRef.current = null
      loadedPaths.current.clear() // Clear loaded paths when company is deselected
      return // Company not selected yet (but user is logged in)
    }
    
    // Scope path (company/site/subsite) used for load de-duping.
    // NOTE: This is NOT the RTDB HR data path (which includes `/data/hr`).
    const scopePath = getBasePath("hr")
    
    // If scope changed (site/subsite changed), clear old paths and reload
    if (previousBasePathRef.current && previousBasePathRef.current !== scopePath) {
      debugLog(`🔄 HR Context: Scope path changed from ${previousBasePathRef.current} to ${scopePath} - clearing and reloading`)
      loadedPaths.current.clear() // Clear all loaded paths when path changes
      // Reset initialized state so we reload
      dispatch({ type: "SET_INITIALIZED", payload: false })
      // Clear previous path so we don't skip loading the new path
      previousBasePathRef.current = scopePath
    } else if (!previousBasePathRef.current) {
      // First time setting the path
      previousBasePathRef.current = scopePath
    }
    
    if (!scopePath) {
      // If no basePath but we have a company, mark as initialized with empty state
      if (companyState.companyID && !state.initialized) {
        dispatch({ type: "SET_INITIALIZED", payload: true })
      }
      return // No base path available
    }
    
    // Skip if this exact path is already loaded (only if path hasn't changed)
    if (previousBasePathRef.current === scopePath && loadedPaths.current.has(scopePath)) {
      return // Skip if already loaded and path hasn't changed
    }

    // Clear any existing timeout for this path
    if (loadingTimeouts.current[scopePath]) {
      clearTimeout(loadingTimeouts.current[scopePath])
    }

    // Debounce loading to prevent rapid fire requests
    loadingTimeouts.current[scopePath] = setTimeout(async () => {
      if (loadedPaths.current.has(scopePath)) return // Double check

      loadedPaths.current.add(scopePath)
      const hrPaths = getHRPaths()
      if (!hrPaths || hrPaths.length === 0) {
        loadedPaths.current.delete(scopePath)
        return
      }
      // RTDB HR data path (includes `/data/hr`)
      const basePath = hrPaths[0]

      // Start HR timers for this basePath (core + all)
      hrTimersRef.current = {
        basePath,
        coreTimerId: performanceTimer.start("HRContext", "coreLoad"),
        allTimerId: performanceTimer.start("HRContext", "allLoad"),
        coreLogged: false,
        allLogged: false,
      }
      didLogCacheHydrateRef.current = false
      debugLog("⏳ HRContext: Starting load", { basePath })
      
      // Clear any existing loading operations
      activeLoadingOps.current.clear()
      
      // Set loading state once at the beginning
      dispatch({ type: "SET_LOADING", payload: true })
      
      await measurePerformance('HRContext', 'loadAllData', async () => {
        try {
          // FAST UI: hydrate from cache immediately if available (does NOT affect timers)
          try {
            const peekFirst = async <T,>(relative: string): Promise<T[] | null> => {
              for (const p of hrPaths) {
                try {
                  const cached = await dataCache.peek<T[]>(`${p}/${relative}`)
                  if (cached !== null) return cached
                } catch {
                  // try next
                }
              }
              return null
            }

            const [
              employeesCached,
              rolesCached,
              departmentsCached,
              schedulesCached,
              complianceTasksCached,
              timeOffsCached,
              warningsCached,
              trainingsCached,
              attendancesCached,
              payrollCached,
              performanceReviewsCached,
              jobsCached,
              candidatesCached,
              interviewsCached,
              announcementsCached,
              contractsCached,
              contractTemplatesCached,
              benefitsCached,
              expenseReportsCached,
              eventsCached,
              diversityInitiativesCached,
              diversitySurveysCached,
            ] = await Promise.all([
              peekFirst<Employee>('employees'),
              peekFirst<Role>('roles'),
              peekFirst<Department>('departments'),
              peekFirst<Schedule>('schedules'),
              peekFirst<ComplianceTask>('complianceTasks'),
              peekFirst<TimeOff>('timeOffs'),
              peekFirst<Warning>('warnings'),
              peekFirst<Training>('trainings'),
              peekFirst<Attendance>('attendances'),
              peekFirst<Payroll>('payroll'),
              peekFirst<PerformanceReview>('performanceReviews'),
              peekFirst<JobPosting>('jobs'),
              peekFirst<Candidate>('candidates'),
              peekFirst<Interview>('interviews'),
              peekFirst<Announcement>('announcements'),
              peekFirst<Contract>('contracts'),
              peekFirst<ContractTemplate>('contractTemplates'),
              peekFirst<Benefit>('benefits'),
              peekFirst<ExpenseReport>('expenseReports'),
              peekFirst<CompanyEvent>('events'),
              peekFirst<DiversityInitiative>('diversityInitiatives'),
              peekFirst<DiversitySurvey>('diversitySurveys'),
            ])

            if (
              employeesCached ||
              rolesCached ||
              departmentsCached ||
              schedulesCached ||
              complianceTasksCached ||
              timeOffsCached ||
              warningsCached ||
              trainingsCached ||
              attendancesCached ||
              payrollCached ||
              performanceReviewsCached ||
              jobsCached ||
              candidatesCached ||
              interviewsCached ||
              announcementsCached ||
              contractsCached ||
              contractTemplatesCached ||
              benefitsCached ||
              expenseReportsCached ||
              eventsCached ||
              diversityInitiativesCached ||
              diversitySurveysCached
            ) {
              // Only update slices that actually changed to reduce flashing/re-renders.
              const payload: any = { initialized: true }
              if (employeesCached !== null && hashArray(getStateArrayForEntity("employees")) !== hashArray(employeesCached || [])) payload.employees = employeesCached || []
              if (rolesCached !== null && hashArray(getStateArrayForEntity("roles")) !== hashArray(rolesCached || [])) payload.roles = rolesCached || []
              if (departmentsCached !== null && hashArray(getStateArrayForEntity("departments")) !== hashArray(departmentsCached || [])) payload.departments = departmentsCached || []
              if (schedulesCached !== null && hashArray(getStateArrayForEntity("schedules")) !== hashArray(schedulesCached || [])) payload.schedules = schedulesCached || []
              if (complianceTasksCached !== null && hashArray(getStateArrayForEntity("complianceTasks")) !== hashArray(complianceTasksCached || [])) payload.complianceTasks = complianceTasksCached || []
              if (timeOffsCached !== null && hashArray(getStateArrayForEntity("timeOffs")) !== hashArray(timeOffsCached || [])) payload.timeOffs = timeOffsCached || []
              if (warningsCached !== null && hashArray(getStateArrayForEntity("warnings")) !== hashArray(warningsCached || [])) payload.warnings = warningsCached || []
              if (trainingsCached !== null && hashArray(getStateArrayForEntity("trainings")) !== hashArray(trainingsCached || [])) payload.trainings = trainingsCached || []
              if (attendancesCached !== null && hashArray(getStateArrayForEntity("attendances")) !== hashArray(attendancesCached || [])) payload.attendances = attendancesCached || []
              if (payrollCached !== null && hashArray(getStateArrayForEntity("payroll")) !== hashArray(payrollCached || [])) payload.payrollRecords = payrollCached || []
              if (performanceReviewsCached !== null && hashArray(getStateArrayForEntity("performanceReviews")) !== hashArray(performanceReviewsCached || [])) payload.performanceReviews = performanceReviewsCached || []
              if (jobsCached !== null && hashArray(getStateArrayForEntity("jobs")) !== hashArray(jobsCached || [])) payload.jobs = jobsCached || []
              if (candidatesCached !== null && hashArray(getStateArrayForEntity("candidates")) !== hashArray(candidatesCached || [])) payload.candidates = candidatesCached || []
              if (interviewsCached !== null && hashArray(getStateArrayForEntity("interviews")) !== hashArray(interviewsCached || [])) payload.interviews = interviewsCached || []
              if (announcementsCached !== null && hashArray(getStateArrayForEntity("announcements")) !== hashArray(announcementsCached || [])) payload.announcements = announcementsCached || []
              if (contractsCached !== null && hashArray(getStateArrayForEntity("contracts")) !== hashArray(contractsCached || [])) payload.contracts = contractsCached || []
              if (contractTemplatesCached !== null && hashArray(getStateArrayForEntity("contractTemplates")) !== hashArray(contractTemplatesCached || [])) payload.contractTemplates = contractTemplatesCached || []
              if (benefitsCached !== null && hashArray(getStateArrayForEntity("benefits")) !== hashArray(benefitsCached || [])) payload.benefits = benefitsCached || []
              if (expenseReportsCached !== null && hashArray(getStateArrayForEntity("expenseReports")) !== hashArray(expenseReportsCached || [])) payload.expenseReports = expenseReportsCached || []
              if (eventsCached !== null && hashArray(getStateArrayForEntity("events")) !== hashArray(eventsCached || [])) payload.events = eventsCached || []
              if (diversityInitiativesCached !== null && hashArray(getStateArrayForEntity("diversityInitiatives")) !== hashArray(diversityInitiativesCached || [])) payload.diversityInitiatives = diversityInitiativesCached || []
              if (diversitySurveysCached !== null && hashArray(getStateArrayForEntity("diversitySurveys")) !== hashArray(diversitySurveysCached || [])) payload.diversitySurveys = diversitySurveysCached || []

              if (Object.keys(payload).length > 1) {
                dispatch({ type: "BATCH_UPDATE", payload })
              }
              if (!didLogCacheHydrateRef.current) {
                didLogCacheHydrateRef.current = true
                debugLog("✅ HRContext: Cache hydrated")
              }
            }
          } catch {
            // ignore
          }
          
          // PROGRESSIVE LOADING: Critical data first (for immediate UI)
          // Load from all paths to ensure we get all data
          const loadFromAllPaths = async <T,>(fetchFn: (path: string) => Promise<T[]>): Promise<T[]> => {
            const allData: T[] = []
            const dataIds = new Set<string>()
            
            // Helper to add data with deduplication
            const addData = (items: T[]) => {
              if (!items || !Array.isArray(items)) return
              items.forEach((item: any) => {
                // Generate a unique ID for deduplication - don't filter out items without IDs
                const itemId = item.id || item.employeeID || item.roleID || item.departmentID || `temp_${Math.random().toString(36).substr(2, 9)}`
                
                // Only skip if we've already seen this exact ID (and it's not a temp ID)
                if (itemId.startsWith('temp_') || !dataIds.has(itemId)) {
                  if (!itemId.startsWith('temp_')) {
                    dataIds.add(itemId)
                  }
                  // Ensure item has an id field for consistency
                  if (!item.id) {
                    if (item.employeeID) item.id = item.employeeID
                    else if (item.roleID) item.id = item.roleID
                    else if (item.departmentID) item.id = item.departmentID
                    else item.id = itemId
                  }
                  allData.push(item)
                }
              })
            }
            
            // Try cached fetch from primary path first
            try {
              const cachedData = await fetchFn(basePath)
              if (cachedData && cachedData.length > 0) {
                addData(cachedData)
              }
            } catch (error) {
              // Silent fail - will try all paths
            }
            
            // Check all paths to ensure we get all data
            for (const path of hrPaths) {
              if (path === basePath && allData.length > 0) {
                continue // Already loaded from cache
              }
              
              try {
                const data = await fetchFn(path)
                if (data && data.length > 0) {
                  addData(data)
                  // (silent)
                }
              } catch (error) {
                continue
              }
            }
            
            return allData
          }
          
          // If we already hydrated from cache, do a cache-first pass to keep initial load fast.
          // We'll still refresh from the network later (contexts do many background fetches),
          // but this avoids blocking first paint on large employee datasets.
          const forceRefreshCoreNow = !didLogCacheHydrateRef.current

          const [employees, roles, departments] = await Promise.all([
            loadFromAllPaths(async (p) => fetchEmployeesCached(p, forceRefreshCoreNow)),
            loadFromAllPaths(async (p) => fetchRolesCached(p, forceRefreshCoreNow)),
            loadFromAllPaths(async (p) => fetchDepartmentsCached(p, forceRefreshCoreNow)),
          ])
          
          // Update critical data immediately (only if changed)
          const corePayload: any = { initialized: true }
          if (hashArray(getStateArrayForEntity("employees")) !== hashArray(employees || [])) corePayload.employees = employees || []
          if (hashArray(getStateArrayForEntity("roles")) !== hashArray(roles || [])) corePayload.roles = roles || []
          if (hashArray(getStateArrayForEntity("departments")) !== hashArray(departments || [])) corePayload.departments = departments || []
          if (Object.keys(corePayload).length > 1) {
            dispatch({ type: "BATCH_UPDATE", payload: corePayload })
          }

          // Core loaded timing (employees/roles/departments)
          // Only log when all three critical entities are loaded
          if (!hrTimersRef.current.coreLogged && hrTimersRef.current.coreTimerId) {
            const employeesLoaded = (employees || []).length > 0 || state.employees.length > 0
            const rolesLoaded = (roles || []).length > 0 || state.roles.length > 0
            const departmentsLoaded = (departments || []).length > 0 || state.departments.length > 0
            
            if (employeesLoaded && rolesLoaded && departmentsLoaded) {
              hrTimersRef.current.coreLogged = true
              const duration = performanceTimer.end(hrTimersRef.current.coreTimerId, {
                employees: (employees || []).length || state.employees.length,
                roles: (roles || []).length || state.roles.length,
                departments: (departments || []).length || state.departments.length,
              })
              debugLog(`✅ HRContext: Core loaded (${duration.toFixed(2)}ms)`)
            }
          }
          
          // All data loaded timing - fires when core (employees/roles/departments) is complete
          // This ensures "All data loaded" only fires when critical data is ready
          if (!hrTimersRef.current.allLogged && hrTimersRef.current.allTimerId && hrTimersRef.current.coreLogged) {
            hrTimersRef.current.allLogged = true
            const duration = performanceTimer.end(hrTimersRef.current.allTimerId, {
              employees: (employees || []).length || state.employees.length,
              roles: (roles || []).length || state.roles.length,
              departments: (departments || []).length || state.departments.length,
            })
            debugLog(`✅ HRContext: All data loaded (${duration.toFixed(2)}ms)`)
          }
          
          // BACKGROUND: Load non-critical data after (non-blocking)
          const loadBackgroundData = () => {
            const loadBenefitsFromAllPaths = async (): Promise<Benefit[]> => {
              const names = new Set<string>()
              const out: Benefit[] = []
              for (const p of hrPaths) {
                try {
                  const arr = await fetchBenefitsCached(p, true)
                  for (const b of arr || []) {
                    const key = (b as any)?.name || (b as any)?.id
                    if (!key) continue
                    if (names.has(key)) continue
                    names.add(key)
                    out.push(b as any)
                  }
                } catch {
                  // try next
                }
              }
              return out
            }

            Promise.all([
              loadFromAllPaths((p) => fetchTimeOffsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchWarningsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchTrainingsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchAttendancesCached(p, true)).catch(() => []),
              // Payroll is permission-gated and expensive to fan out across multiple HR paths.
              // Only attempt the primary path to avoid repeated 401 spam in dev.
              (async () => {
                try {
                  return await fetchPayrollCached(basePath, true)
                } catch {
                  return []
                }
              })(),
              loadFromAllPaths((p) => fetchPerformanceReviewsCached(p, true)).catch(() => []),
              (async () => {
                // Fetch schedules from multi-path (needs special handling)
                let schedules: Schedule[] = []
                for (const path of hrPaths) {
                  try {
                    const pathSchedules = await fetchSchedulesCached(path, true)
                    if (pathSchedules.length > 0) {
                      schedules = pathSchedules
                      break
                    }
                  } catch (error) {
                    // Silent fail - try next path
                  }
                }
                return schedules
              })(),
              loadFromAllPaths((p) => fetchJobsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchCandidatesCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchInterviewsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchAnnouncementsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchContractsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchContractTemplatesCached(p, true)).catch(() => []),
              loadBenefitsFromAllPaths().catch(() => []),
              loadFromAllPaths((p) => fetchComplianceTasksCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchExpenseReportsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchEventsCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchDiversityInitiativesCached(p, true)).catch(() => []),
              loadFromAllPaths((p) => fetchDiversitySurveysCached(p, true)).catch(() => []),
            ]).then(([
              timeOffs, warnings, trainings, attendances, payroll, 
              performanceReviews, schedules, jobPostings, candidates, 
              interviews, announcements, contracts, contractTemplates, benefits,
              complianceTasks, expenseReports, events, diversityInitiatives, diversitySurveys
            ]) => {
              const bgPayload: any = {}
              if (hashArray(getStateArrayForEntity("timeOffs")) !== hashArray((timeOffs || []) as any[])) bgPayload.timeOffs = (timeOffs || []) as any
              if (hashArray(getStateArrayForEntity("warnings")) !== hashArray(warnings || [])) bgPayload.warnings = warnings || []
              if (hashArray(getStateArrayForEntity("trainings")) !== hashArray(trainings || [])) bgPayload.trainings = trainings || []
              if (hashArray(getStateArrayForEntity("attendances")) !== hashArray(attendances || [])) bgPayload.attendances = attendances || []
              if (hashArray(getStateArrayForEntity("payroll")) !== hashArray((payroll || []) as any[])) bgPayload.payrollRecords = (payroll || []) as any
              if (hashArray(getStateArrayForEntity("performanceReviews")) !== hashArray((performanceReviews || []) as any[])) bgPayload.performanceReviews = (performanceReviews || []) as any
              if (hashArray(getStateArrayForEntity("schedules")) !== hashArray(schedules || [])) bgPayload.schedules = schedules || []
              if (hashArray(getStateArrayForEntity("contracts")) !== hashArray(contracts || [])) bgPayload.contracts = contracts || []
              if (hashArray(getStateArrayForEntity("contractTemplates")) !== hashArray(contractTemplates || [])) bgPayload.contractTemplates = contractTemplates || []
              if (hashArray(getStateArrayForEntity("jobs")) !== hashArray(jobPostings || [])) bgPayload.jobs = jobPostings || []
              if (hashArray(getStateArrayForEntity("candidates")) !== hashArray(candidates || [])) bgPayload.candidates = candidates || []
              if (hashArray(getStateArrayForEntity("interviews")) !== hashArray(interviews || [])) bgPayload.interviews = interviews || []
              if (hashArray(getStateArrayForEntity("announcements")) !== hashArray(announcements || [])) bgPayload.announcements = announcements || []
              if (hashArray(getStateArrayForEntity("benefits")) !== hashArray(benefits || [])) bgPayload.benefits = benefits || []
              if (hashArray(getStateArrayForEntity("complianceTasks")) !== hashArray(complianceTasks || [])) bgPayload.complianceTasks = complianceTasks || []
              if (hashArray(getStateArrayForEntity("expenseReports")) !== hashArray(expenseReports || [])) bgPayload.expenseReports = expenseReports || []
              if (hashArray(getStateArrayForEntity("events")) !== hashArray(events || [])) bgPayload.events = events || []
              if (hashArray(getStateArrayForEntity("diversityInitiatives")) !== hashArray(diversityInitiatives || [])) bgPayload.diversityInitiatives = diversityInitiatives || []
              if (hashArray(getStateArrayForEntity("diversitySurveys")) !== hashArray(diversitySurveys || [])) bgPayload.diversitySurveys = diversitySurveys || []

              if (Object.keys(bgPayload).length > 0) {
                dispatch({ type: "BATCH_UPDATE", payload: bgPayload })
              }
            }).catch(() => {
              // silent
            })
          }
          
          // Use requestIdleCallback if available, otherwise setTimeout
          if ('requestIdleCallback' in window) {
            // Start background loads quickly so tab navigation doesn't "wait for idle".
            requestIdleCallback(loadBackgroundData, { timeout: 300 })
          } else {
            setTimeout(loadBackgroundData, 100)
          }
          
        } catch (error) {
          // Remove from loaded paths on error so it can retry
          loadedPaths.current.delete(scopePath)
        } finally {
          // Ensure loading is set to false when all operations complete
          dispatch({ type: "SET_LOADING", payload: false })
          // Clean up timeout reference
          delete loadingTimeouts.current[scopePath]
        }
      }, () => ({
        employees: state.employees.length,
        roles: state.roles.length,
        departments: state.departments.length,
      }))
    }, 50) // Reduced debounce for faster initial core load

    // Cleanup function
    return () => {
      if (loadingTimeouts.current[scopePath]) {
        clearTimeout(loadingTimeouts.current[scopePath])
        delete loadingTimeouts.current[scopePath]
      }
    }
  }, [
    getBasePath, 
    companyState.companyID, 
    companyState.selectedSiteID, 
    companyState.selectedSubsiteID,
    settingsState.auth, 
    settingsState.loading,
    fetchEmployeesCached, 
    fetchRolesCached, 
    fetchDepartmentsCached, 
    fetchTimeOffsCached, 
    fetchWarningsCached, 
    fetchTrainingsCached, 
    fetchAttendancesCached, 
    fetchPayrollCached, 
    fetchPerformanceReviewsCached
  ])

  // Add role function
  const addRole = async (role: Omit<Role, "id">): Promise<Role | null> => {
    const hrWritePath = getHRWritePath()
    if (!hrWritePath) return null
    
    try {
      const newRole = await createRole(hrWritePath, role)
      if (newRole) {
        dispatch({ type: "ADD_ROLE", payload: newRole })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Role',
            newRole.name || role.name || 'New Role',
            newRole.id,
            undefined,
            newRole
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newRole
      }
      return null
    } catch (error) {
      console.error("Error adding role:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add role" })
      return null
    }
  }
  
  // Update role function
  const updateRole = useCallback(async (roleId: string, roleUpdates: Partial<Role>): Promise<Role | null> => {
    const basePath = await resolveHRPathForEntityId('roles', roleId)
    if (!basePath) return null
    
    try {
      const originalRole = stateRef.current.roles.find(r => r.id === roleId)
      const updatedRole = await updateRoleAPI(basePath, roleId, roleUpdates)
      if (updatedRole) {
        dispatch({ type: "UPDATE_ROLE", payload: updatedRole })
        
        // Add notification
        try {
          await createHRNotification(
            'updated',
            'Role',
            updatedRole.name || originalRole?.name || 'Role',
            roleId,
            originalRole,
            updatedRole
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return updatedRole
      }
      return null
    } catch (error) {
      console.error("Error updating role:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update role" })
      return null
    }
  }, [resolveHRPathForEntityId, dispatch, createHRNotification])
  
  // Delete role function
  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    const basePath = await resolveHRPathForEntityId('roles', id)
    if (!basePath) return false
    
    try {
      const roleToDelete = stateRef.current.roles.find(r => r.id === id)
      const success = await deleteRoleAPI(basePath, id)
      if (success) {
        dispatch({ type: "DELETE_ROLE", payload: id })
        
        // Add notification
        if (roleToDelete) {
          try {
            await createHRNotification(
              'deleted',
              'Role',
              roleToDelete.name || 'Role',
              id,
              roleToDelete,
              undefined
            )
          } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError)
          }
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error("Error removing role:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to remove role" })
      return false
    }
  }, [resolveHRPathForEntityId, dispatch, createHRNotification])

  // Add employee function
  const addEmployee = async (employee: Omit<Employee, "id">): Promise<Employee | null> => {
    const hrWritePath = getHRWritePath()
    if (!hrWritePath) throw new Error("HR write path not available")
    
    try {
      console.log("HR Context - addEmployee with writePath:", hrWritePath)
      
      const employeeId = await createEmployeeRTDB(hrWritePath, employee)
      if (employeeId) {
        // Create the full employee object with the new ID
        const newEmployee: Employee = {
          ...employee,
          id: employeeId
        }
        dispatch({ type: "ADD_EMPLOYEE", payload: newEmployee })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'created',
            'Employee Added',
            `${employee.firstName} ${employee.lastName} joined the team`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'success',
              details: {
                entityId: employeeId,
                entityName: `${employee.firstName} ${employee.lastName}`,
                newValue: employee,
                changes: {
                  employee: { from: null, to: employee }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        // Don't block the UI on a heavy full refresh; update state is already applied above.
        refreshEmployees(true).catch((e) => console.warn("HR Context - refreshEmployees after add failed:", e))
        return newEmployee
      }
      throw new Error("Failed to create employee")
    } catch (error) {
      console.error("Error adding employee:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add employee" })
      throw new Error("Failed to add employee")
    }
  }
  
  // Update employee function
  const updateEmployee = useCallback(async (employeeId: string, employeeUpdates: Partial<Employee>): Promise<Employee | null> => {
    const hrWritePath = getHRWritePath()
    if (!hrWritePath) throw new Error("HR write path not available")
    
    try {
      console.log("HR Context - updateEmployee with writePath:", hrWritePath)
      
      // Get original employee for comparison
      const originalEmployee = stateRef.current.employees.find(emp => emp.id === employeeId)
      
      // Fast-path: avoid an extra read-after-write when we already have the full employee in memory.
      // RTDB update() is enough; we can merge locally for immediate UI updates.
      const stripUndefinedDeep = (value: any): any => {
        if (Array.isArray(value)) {
          return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
        }
        if (value && typeof value === "object") {
          const out: any = {}
          Object.entries(value).forEach(([k, v]) => {
            if (v === undefined) return
            const cleaned = stripUndefinedDeep(v)
            if (cleaned === undefined) return
            out[k] = cleaned
          })
          return out
        }
        return value
      }

      const now = Date.now()
      const sanitizedUpdates = stripUndefinedDeep(employeeUpdates)

      let updatedEmployee: Employee | null = null
      if (originalEmployee) {
        await updateEmployeeFn(hrWritePath, employeeId, { ...sanitizedUpdates, updatedAt: now })
        updatedEmployee = { ...(originalEmployee as any), ...(sanitizedUpdates as any), id: employeeId, updatedAt: now } as Employee
      } else {
        // Fallback: read-after-write to return a full employee when we don't have it locally.
        updatedEmployee = await updateEmployeeRTDB(hrWritePath, employeeId, sanitizedUpdates) as unknown as Employee | null
      }

      if (updatedEmployee !== null) {
        dispatch({ type: "UPDATE_EMPLOYEE", payload: updatedEmployee })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'updated',
            'Employee Updated',
            `${updatedEmployee.firstName} ${updatedEmployee.lastName}'s information was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: employeeId,
                entityName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
                oldValue: originalEmployee,
                newValue: updatedEmployee,
                changes: {
                  employee: { from: originalEmployee, to: updatedEmployee }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        // Don't block the UI on a heavy full refresh; the UI is already updated via dispatch above.
        refreshEmployees(true).catch((e) => console.warn("HR Context - refreshEmployees after update failed:", e))
        return updatedEmployee
      }
      throw new Error("Failed to update employee")
    } catch (error) {
      console.error("Error updating employee:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update employee" })
      throw new Error("Error updating employee")
    }
  }, [
    getHRWritePath,
    dispatch,
    refreshEmployees,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])
  
  // Delete employee function
  const deleteEmployee = useCallback(async (employeeId: string): Promise<boolean> => {
    const hrWritePath = getHRWritePath()
    if (!hrWritePath) return false
    
    try {
      console.log("HR Context - deleteEmployee with writePath:", hrWritePath)
      
      // Get employee info before deletion for notification
      const employeeToDelete = stateRef.current.employees.find(emp => emp.id === employeeId)
      
      const success = await deleteEmployeeRTDB(hrWritePath, employeeId) as unknown as boolean
      if (success === true) {
        dispatch({ type: "DELETE_EMPLOYEE", payload: employeeId })
        
        // Add notification
        if (employeeToDelete) {
          try {
            await createNotification(
              companyState.companyID,
              settingsState.auth?.uid || 'system',
              'hr',
              'deleted',
              'Employee Removed',
              `${employeeToDelete.firstName} ${employeeToDelete.lastName} was removed from the team`,
              {
                siteId: companyState.selectedSiteID || undefined,
                priority: 'medium',
                category: 'warning',
                details: {
                  entityId: employeeId,
                  entityName: `${employeeToDelete.firstName} ${employeeToDelete.lastName}`,
                  oldValue: employeeToDelete,
                  changes: {
                    employee: { from: employeeToDelete, to: null }
                  }
                }
              }
            )
          } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError)
          }
        }
        
        // Don't block the UI on a heavy full refresh; state is already updated via dispatch above.
        refreshEmployees(true).catch((e) => console.warn("HR Context - refreshEmployees after delete failed:", e))
        return true
      }
      return false
    } catch (error) {
      console.error("Error deleting employee:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete employee" })
      return false
    }
  }, [
    getHRWritePath,
    dispatch,
    refreshEmployees,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])

  // Add department function
  const addDepartment = async (department: Omit<Department, "id">): Promise<Department | null> => {
    const hrWritePath = getHRWritePath()
    if (!hrWritePath) return null
    
    try {
      const newDepartment = await createDepartment(hrWritePath, department)
      if (newDepartment) {
        dispatch({ type: "ADD_DEPARTMENT", payload: newDepartment })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'created',
            'Department Added',
            `Department "${department.name}" was created`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'success',
              details: {
                entityId: newDepartment.id,
                entityName: department.name,
                newValue: newDepartment,
                changes: {
                  department: { from: {}, to: newDepartment }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newDepartment
      }
      return null
    } catch (error) {
      console.error("Error adding department:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add department" })
      return null
    }
  }
  
  // Update department function
  const updateDepartment = useCallback(async (departmentId: string, departmentUpdates: Partial<Department>): Promise<Department | null> => {
    const basePath = await resolveHRPathForEntityId('departments', departmentId)
    if (!basePath) return null
    
    try {
      // Get original department for comparison
      const originalDepartment = stateRef.current.departments.find(dept => dept.id === departmentId)
      
      const updatedDepartment = await updateDepartmentAPI(basePath, departmentId, departmentUpdates)
      if (updatedDepartment) {
        dispatch({ type: "UPDATE_DEPARTMENT", payload: updatedDepartment })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'updated',
            'Department Updated',
            `Department "${updatedDepartment.name}" was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: departmentId,
                entityName: updatedDepartment.name,
                oldValue: originalDepartment,
                newValue: updatedDepartment,
                changes: {
                  department: { from: originalDepartment, to: updatedDepartment }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return updatedDepartment
      }
      return null
    } catch (error) {
      console.error("Error updating department:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update department" })
      return null
    }
  }, [
    resolveHRPathForEntityId,
    dispatch,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])
  
  // Delete department function
  const deleteDepartment = useCallback(async (departmentId: string): Promise<boolean> => {
    const basePath = await resolveHRPathForEntityId('departments', departmentId)
    if (!basePath) return false
    
    try {
      // Get department info before deletion for notification
      const departmentToDelete = stateRef.current.departments.find(dept => dept.id === departmentId)
      
      const success = await deleteDepartmentAPI(basePath, departmentId)
      if (success) {
        dispatch({ type: "DELETE_DEPARTMENT", payload: departmentId })
        
        // Add notification
        if (departmentToDelete) {
          try {
            await createNotification(
              companyState.companyID,
              settingsState.auth?.uid || 'system',
              'hr',
              'deleted',
              'Department Removed',
              `Department "${departmentToDelete.name}" was removed`,
              {
                siteId: companyState.selectedSiteID || undefined,
                priority: 'medium',
                category: 'warning',
                details: {
                  entityId: departmentId,
                  entityName: departmentToDelete.name,
                  oldValue: departmentToDelete,
                  changes: {
                    department: { from: departmentToDelete, to: null }
                  }
                }
              }
            )
          } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError)
          }
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error("Error deleting department:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete department" })
      return false
    }
  }, [
    resolveHRPathForEntityId,
    dispatch,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])

  // Add schedule function
  const addSchedule = async (schedule: Omit<Schedule, "id">): Promise<Schedule | null> => {
    const hrWritePath = getHRWritePath()
    console.log("🔍 HR Context - addSchedule called with:", {
      hrWritePath,
      scheduleData: {
        employeeId: schedule.employeeId,
        employeeName: schedule.employeeName,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }
    })
    
    if (!hrWritePath) {
      console.log("❌ HR Context - No write path available for schedule creation")
      return null
    }
    
    try {
      console.log("🔍 HR Context - addSchedule calling createScheduleRTDB with path:", hrWritePath)
      
      const scheduleId = await createScheduleRTDB(hrWritePath, schedule)
      console.log("🔍 HR Context - addSchedule - createScheduleRTDB result:", scheduleId)
      
      if (scheduleId) {
        const newSchedule: Schedule = {
          ...schedule,
          id: scheduleId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        console.log("🔍 HR Context - addSchedule - Dispatching ADD_SCHEDULE with:", newSchedule)
        dispatch({ type: "ADD_SCHEDULE", payload: newSchedule })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'created',
            'Schedule Created',
            `Schedule for ${schedule.employeeName} on ${schedule.date} was created`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'success',
              details: {
                entityId: scheduleId,
                entityName: `${schedule.employeeName} - ${schedule.date}`,
                newValue: newSchedule,
                changes: {
                  schedule: { from: {}, to: newSchedule }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        console.log("🔍 HR Context - addSchedule - Calling refreshSchedules")
        await refreshSchedules() // Refresh data after creation
        console.log("🔍 HR Context - addSchedule - refreshSchedules completed")
        
        return newSchedule
      }
      console.log("❌ HR Context - addSchedule - No scheduleId returned from createScheduleRTDB")
      return null
    } catch (error) {
      console.error("Error adding schedule:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add schedule" })
      return null
    }
  }
  
  // Update schedule function
  const updateSchedule = useCallback(async (scheduleId: string, scheduleUpdates: Partial<Schedule>): Promise<Schedule | null> => {
    const schedulePath = await resolveHRPathForScheduleId(scheduleId)
    if (!schedulePath) {
      dispatch({ type: "SET_ERROR", payload: "Schedule not found (cannot update)" })
      return null
    }
    
    try {
      console.log("HR Context - updateSchedule with path:", schedulePath)
      
      // Get original schedule for comparison
      const originalSchedule = stateRef.current.schedules.find(sched => sched.id === scheduleId)

      // Avoid persisting the local ID fields into the schedule record.
      const { id: _id, ...updatesWithoutId } = (scheduleUpdates as any) || {}

      const updatedSchedule = await updateScheduleRTDB(schedulePath, scheduleId, updatesWithoutId)
      if (updatedSchedule) {
        dispatch({ type: "UPDATE_SCHEDULE", payload: updatedSchedule })
        
        // Add notification
        try {
          await createNotification(
            companyState.companyID,
            settingsState.auth?.uid || 'system',
            'hr',
            'updated',
            'Schedule Updated',
            `Schedule for ${updatedSchedule.employeeName} on ${updatedSchedule.date} was updated`,
            {
              siteId: companyState.selectedSiteID || undefined,
              priority: 'medium',
              category: 'info',
              details: {
                entityId: scheduleId,
                entityName: `${updatedSchedule.employeeName} - ${updatedSchedule.date}`,
                oldValue: originalSchedule,
                newValue: updatedSchedule,
                changes: {
                  schedule: { from: originalSchedule, to: updatedSchedule }
                }
              }
            }
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        await refreshSchedules() // Refresh data after update
        return updatedSchedule
      }
      return null
    } catch (error) {
      console.error("Error updating schedule:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update schedule" })
      return null
    }
  }, [
    resolveHRPathForScheduleId,
    dispatch,
    refreshSchedules,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])
  
  // Delete schedule function
  const deleteSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    const schedulePath = await resolveHRPathForScheduleId(scheduleId)
    if (!schedulePath) {
      dispatch({ type: "SET_ERROR", payload: "Schedule not found (cannot delete)" })
      return false
    }
    
    try {
      console.log("HR Context - deleteSchedule with path:", schedulePath)
      
      // Get schedule info before deletion for notification
      const scheduleToDelete = stateRef.current.schedules.find(sched => sched.id === scheduleId)
      
      const success = await deleteScheduleRTDB(schedulePath, scheduleId)
      if (success) {
        dispatch({ type: "DELETE_SCHEDULE", payload: scheduleId })
        
        // Add notification
        if (scheduleToDelete) {
          try {
            await createNotification(
              companyState.companyID,
              settingsState.auth?.uid || 'system',
              'hr',
              'deleted',
              'Schedule Removed',
              `Schedule for ${scheduleToDelete.employeeName} on ${scheduleToDelete.date} was removed`,
              {
                siteId: companyState.selectedSiteID || undefined,
                priority: 'medium',
                category: 'warning',
                details: {
                  entityId: scheduleId,
                  entityName: `${scheduleToDelete.employeeName} - ${scheduleToDelete.date}`,
                  oldValue: scheduleToDelete,
                  changes: {
                    schedule: { from: scheduleToDelete, to: null }
                  }
                }
              }
            )
          } catch (notificationError) {
            console.warn('Failed to create notification:', notificationError)
          }
        }
        
        await refreshSchedules() // Refresh data after deletion
        return true
      }
      return false
    } catch (error) {
      console.error("Error deleting schedule:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete schedule" })
      return false
    }
  }, [
    resolveHRPathForScheduleId,
    dispatch,
    refreshSchedules,
    companyState.companyID,
    companyState.selectedSiteID,
    settingsState.auth?.uid,
  ])

  // Training methods
  const addTraining = async (training: Omit<Training, "id">): Promise<Training | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addTraining with basePath:", hrBasePath)
      
      const trainingId = await createTrainingAPI(hrBasePath, training)
      if (trainingId) {
        const newTraining: Training = {
          ...training,
          id: trainingId
        }
        dispatch({ type: "ADD_TRAINING", payload: newTraining })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Training',
            training.title || 'New Training',
            trainingId,
            undefined,
            newTraining
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newTraining
      }
      throw new Error("Failed to create training")
    } catch (error) {
      console.error("Error adding training:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add training" })
      throw new Error("Failed to add training")
    }
  }
  
  const updateTraining = useCallback(async (trainingId: string, trainingUpdates: Partial<Training>): Promise<Training | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateTraining with basePath:", hrBasePath)
      
      const originalTraining = stateRef.current.trainings.find(t => t.id === trainingId)
      // Avoid passing undefined fields to Firebase
      const stripUndefinedDeep = (value: any): any => {
        if (Array.isArray(value)) return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
        if (value && typeof value === "object") {
          const out: any = {}
          Object.entries(value).forEach(([k, v]) => {
            if (v === undefined) return
            const cleaned = stripUndefinedDeep(v)
            if (cleaned === undefined) return
            out[k] = cleaned
          })
          return out
        }
        return value
      }

      const now = Date.now()
      const sanitizedUpdates = stripUndefinedDeep({ ...trainingUpdates, updatedAt: now })

      await updateTrainingAPI(hrBasePath, trainingId, sanitizedUpdates)
      const updatedTraining = {
        ...(originalTraining || {}),
        ...sanitizedUpdates,
        id: trainingId,
      } as Training
      dispatch({ type: "UPDATE_TRAINING", payload: updatedTraining })
      
      // Add notification
      try {
        await createHRNotification(
          'updated',
          'Training',
          trainingUpdates.title || originalTraining?.title || 'Training',
          trainingId,
          originalTraining,
          updatedTraining
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedTraining
    } catch (error) {
      console.error("Error updating training:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update training" })
      throw new Error("Failed to update training")
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const deleteTraining = useCallback(async (trainingId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteTraining with basePath:", hrBasePath)
      
      // Get training info before deletion for notification
      const trainingToDelete = stateRef.current.trainings.find(training => training.id === trainingId)
      
      await deleteTrainingAPI(hrBasePath, trainingId)
      dispatch({ type: "DELETE_TRAINING", payload: trainingId })
      
      // Add notification
      if (trainingToDelete) {
        await createHRNotification('deleted', 'Training', trainingToDelete.title, trainingId, trainingToDelete, undefined)
      }
      
      return true
    } catch (error) {
      console.error("Error deleting training:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete training" })
      return false
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const getEmployeeTrainings = async (employeeId: string): Promise<Training[]> => {
    // Filter trainings by employee ID
    return state.trainings.filter(training => training.employeeId === employeeId)
  }
  
  // Helper function to convert TimeOff to TimeOffRequest
  const mapTimeOffToRequest = (timeOff: Omit<TimeOff, "id">, employeeName: string): Omit<TimeOffRequest, "id"> => {
    try {
      // Ensure dates are valid before converting
      const startDate = timeOff.startDate 
        ? (typeof timeOff.startDate === 'number' 
            ? new Date(timeOff.startDate) 
            : new Date(timeOff.startDate))
        : new Date()
      
      const endDate = timeOff.endDate 
        ? (typeof timeOff.endDate === 'number' 
            ? new Date(timeOff.endDate) 
            : new Date(timeOff.endDate))
        : new Date()
      
      const createdAt = timeOff.createdAt 
        ? (typeof timeOff.createdAt === 'number' 
            ? new Date(timeOff.createdAt) 
            : new Date(timeOff.createdAt))
        : new Date()
      
      const updatedAt = timeOff.updatedAt 
        ? (typeof timeOff.updatedAt === 'number' 
            ? new Date(timeOff.updatedAt) 
            : new Date(timeOff.updatedAt))
        : undefined
      
      const approvedDate = timeOff.approvedAt 
        ? (typeof timeOff.approvedAt === 'number' 
            ? new Date(timeOff.approvedAt) 
            : new Date(timeOff.approvedAt))
        : undefined
      
      // Build the request object, only including defined values
      const request: any = {
        employeeId: timeOff.employeeId,
        employeeName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type: timeOff.type,
        reason: timeOff.reason || "",
        status: timeOff.status || 'pending',
        createdAt: createdAt.toISOString(),
        totalDays: timeOff.totalDays || 1
      }
      
      // Only include optional fields if they have values (not undefined or null)
      if (timeOff.notes !== undefined && timeOff.notes !== null && timeOff.notes !== '') {
        request.notes = timeOff.notes
      }
      if (timeOff.updatedAt !== undefined && timeOff.updatedAt !== null && updatedAt) {
        request.updatedAt = updatedAt.toISOString()
      }
      if (timeOff.approvedBy !== undefined && timeOff.approvedBy !== null && timeOff.approvedBy !== '') {
        request.approvedBy = timeOff.approvedBy
      }
      if (timeOff.approvedAt !== undefined && timeOff.approvedAt !== null && approvedDate) {
        request.approvedDate = approvedDate.toISOString()
      }
      
      return request
    } catch (error) {
      console.error("Error mapping time off to request:", error, timeOff)
      throw new Error(`Failed to map time off to request: ${error}`)
    }
  }

  // Time Off methods
  const addTimeOff = async (timeOff: Omit<TimeOff, "id">): Promise<TimeOff | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addTimeOff with basePath:", hrBasePath)
      
      // Get employee name for the request
      const employee = state.employees.find(emp => emp.id === timeOff.employeeId)
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
      
      // Convert TimeOff to TimeOffRequest format
      console.log("addTimeOff - Input timeOff:", timeOff)
      const timeOffRequest = mapTimeOffToRequest(timeOff, employeeName)
      console.log("addTimeOff - Mapped timeOffRequest:", timeOffRequest)
      
      const timeOffId = await createTimeOffAPI(hrBasePath, timeOffRequest)
      console.log("addTimeOff - Created timeOffId:", timeOffId)
      if (timeOffId) {
        // Build the complete time off object with all fields
        const newTimeOff: TimeOff = {
          ...timeOff,
          id: timeOffId,
          // Ensure dates are in the correct format (timestamps)
          startDate: typeof timeOff.startDate === 'number' 
            ? timeOff.startDate 
            : new Date(timeOff.startDate).getTime(),
          endDate: typeof timeOff.endDate === 'number'
            ? timeOff.endDate
            : new Date(timeOff.endDate).getTime(),
          // Ensure employeeId is set
          employeeId: timeOff.employeeId,
          // Ensure totalDays is included
          totalDays: timeOff.totalDays || 1,
          // Ensure status is set
          status: timeOff.status || 'pending',
          // Ensure timestamps are set
          createdAt: timeOff.createdAt || Date.now(),
          updatedAt: Date.now(),
        }
        
        console.log("addTimeOff - New time off object:", newTimeOff)
        
        // Invalidate cache to ensure fresh data on next fetch
        const cacheKey = `${hrBasePath}/timeOffs`
        dataCache.invalidate(cacheKey)
        
        dispatch({ type: "ADD_TIME_OFF", payload: newTimeOff })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Time Off',
            `${employeeName} - ${timeOff.type || 'Time Off Request'}`,
            timeOffId,
            undefined,
            newTimeOff
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newTimeOff
      }
      console.error("addTimeOff - createTimeOffAPI returned empty timeOffId")
      throw new Error("Failed to create time off: No ID returned")
    } catch (error) {
      console.error("Error adding time off:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timeOff: timeOff
      })
      dispatch({ type: "SET_ERROR", payload: `Failed to add time off: ${error instanceof Error ? error.message : String(error)}` })
      throw error instanceof Error ? error : new Error("Failed to add time off")
    }
  }
  
  const updateTimeOff = useCallback(async (timeOffId: string, timeOffUpdates: Partial<TimeOff>): Promise<TimeOff | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateTimeOff with basePath:", hrBasePath)
      
      const originalTimeOff = stateRef.current.timeOffs.find(t => t.id === timeOffId)
      // Use updated employeeId if provided, otherwise use original
      const employeeIdToUse = timeOffUpdates.employeeId !== undefined ? timeOffUpdates.employeeId : originalTimeOff?.employeeId
      const employee = employeeIdToUse ? stateRef.current.employees.find(emp => emp.id === employeeIdToUse) : null
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
      
      // Convert TimeOff updates to TimeOffRequest format
      const timeOffRequestUpdates: Partial<TimeOffRequest> = {}
      
      // Handle all possible fields from the form
      if (timeOffUpdates.employeeId !== undefined) {
        timeOffRequestUpdates.employeeId = timeOffUpdates.employeeId
      }
      if (timeOffUpdates.startDate !== undefined) {
        // Handle both Date objects and timestamps
        const startDate = (timeOffUpdates.startDate as any) instanceof Date 
          ? timeOffUpdates.startDate 
          : new Date(timeOffUpdates.startDate)
        timeOffRequestUpdates.startDate = (startDate as Date).toISOString()
      }
      if (timeOffUpdates.endDate !== undefined) {
        // Handle both Date objects and timestamps
        const endDate = (timeOffUpdates.endDate as any) instanceof Date 
          ? timeOffUpdates.endDate 
          : new Date(timeOffUpdates.endDate)
        timeOffRequestUpdates.endDate = (endDate as Date).toISOString()
      }
      if (timeOffUpdates.type !== undefined) {
        timeOffRequestUpdates.type = timeOffUpdates.type
      }
      if (timeOffUpdates.reason !== undefined) {
        timeOffRequestUpdates.reason = timeOffUpdates.reason
      }
      if (timeOffUpdates.status !== undefined) {
        timeOffRequestUpdates.status = timeOffUpdates.status
      }
      if (timeOffUpdates.notes !== undefined) {
        timeOffRequestUpdates.notes = timeOffUpdates.notes
      }
      if (timeOffUpdates.totalDays !== undefined) {
        timeOffRequestUpdates.totalDays = timeOffUpdates.totalDays
      }
      if (timeOffUpdates.approvedBy !== undefined) {
        timeOffRequestUpdates.approvedBy = timeOffUpdates.approvedBy
      }
      if (timeOffUpdates.approvedAt !== undefined) {
        const approvedDate = (timeOffUpdates.approvedAt as any) instanceof Date 
          ? timeOffUpdates.approvedAt 
          : new Date(timeOffUpdates.approvedAt)
        timeOffRequestUpdates.approvedDate = (approvedDate as Date).toISOString()
      }
      if (timeOffUpdates.updatedAt !== undefined) {
        const updatedDate = (timeOffUpdates.updatedAt as any) instanceof Date 
          ? timeOffUpdates.updatedAt 
          : new Date(timeOffUpdates.updatedAt)
        timeOffRequestUpdates.updatedAt = (updatedDate as Date).toISOString()
      }
      
      console.log("updateTimeOff - Converted updates:", timeOffRequestUpdates)
      
      await updateTimeOffAPI(hrBasePath, timeOffId, timeOffRequestUpdates)
      
      // Invalidate cache to ensure fresh data on next fetch
      const cacheKey = `${hrBasePath}/timeOffs`
      dataCache.invalidate(cacheKey)
      
      // Build the complete updated time off object with all fields
      // Merge original with updates to ensure all fields are preserved
      const updatedTimeOff: TimeOff = {
        ...originalTimeOff,
        ...timeOffUpdates,
        id: timeOffId,
        // Ensure dates are in the correct format (timestamps for TimeOff interface)
        startDate: timeOffUpdates.startDate !== undefined 
          ? (typeof timeOffUpdates.startDate === 'number' 
              ? timeOffUpdates.startDate 
              : new Date(timeOffUpdates.startDate).getTime())
          : (originalTimeOff?.startDate || Date.now()),
        endDate: timeOffUpdates.endDate !== undefined
          ? (typeof timeOffUpdates.endDate === 'number'
              ? timeOffUpdates.endDate
              : new Date(timeOffUpdates.endDate).getTime())
          : (originalTimeOff?.endDate || Date.now()),
        // Ensure employeeId is preserved
        employeeId: timeOffUpdates.employeeId || originalTimeOff?.employeeId,
        // Ensure totalDays is included if provided
        totalDays: timeOffUpdates.totalDays !== undefined 
          ? timeOffUpdates.totalDays 
          : (originalTimeOff?.totalDays || 1),
      } as TimeOff
      
      console.log("updateTimeOff - Final updated time off object:", updatedTimeOff)
      dispatch({ type: "UPDATE_TIME_OFF", payload: updatedTimeOff })
      
      // Add notification
      try {
        await createHRNotification(
          'updated',
          'Time Off',
          `${employeeName} - ${updatedTimeOff.type || originalTimeOff?.type || 'Time Off Request'}`,
          timeOffId,
          originalTimeOff,
          updatedTimeOff
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedTimeOff
    } catch (error) {
      console.error("Error updating time off:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update time off" })
      throw new Error("Failed to update time off")
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const deleteTimeOff = useCallback(async (timeOffId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteTimeOff with basePath:", hrBasePath)
      
      const timeOffToDelete = stateRef.current.timeOffs.find(t => t.id === timeOffId)
      const employee = timeOffToDelete ? stateRef.current.employees.find(emp => emp.id === timeOffToDelete.employeeId) : null
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
      
      await deleteTimeOffAPI(hrBasePath, timeOffId)
      
      // Invalidate cache to ensure fresh data on next fetch
      const cacheKey = `${hrBasePath}/timeOffs`
      dataCache.invalidate(cacheKey)
      
      dispatch({ type: "DELETE_TIME_OFF", payload: timeOffId })
      
      // Add notification
      if (timeOffToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Time Off',
            `${employeeName} - ${timeOffToDelete.type || 'Time Off Request'}`,
            timeOffId,
            timeOffToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting time off:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete time off" })
      return false
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const getEmployeeTimeOffs = async (employeeId: string): Promise<TimeOff[]> => {
    // Filter time offs by employee ID
    return state.timeOffs.filter(timeOff => timeOff.employeeId === employeeId)
  }
  
  // Warning methods
  const addWarning = async (warning: Omit<Warning, "id">): Promise<Warning | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addWarning with basePath:", hrBasePath)
      
      const warningId = await createWarningAPI(hrBasePath, warning)
      if (warningId) {
        const newWarning: Warning = {
          ...warning,
          id: warningId
        }
        dispatch({ type: "ADD_WARNING", payload: newWarning })
        
        // Add notification
        try {
          const employee = state.employees.find(emp => emp.id === warning.employeeId)
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
          await createHRNotification(
            'created',
            'Warning',
            `Warning for ${employeeName}`,
            warningId,
            undefined,
            newWarning
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newWarning
      }
      throw new Error("Failed to create warning")
    } catch (error) {
      console.error("Error adding warning:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add warning" })
      throw new Error("Failed to add warning")
    }
  }
  
  const updateWarning = useCallback(async (warningId: string, warningUpdates: Partial<Warning>): Promise<Warning | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateWarning with basePath:", hrBasePath)
      
      const originalWarning = stateRef.current.warnings.find(w => w.id === warningId)
      // Avoid passing undefined fields to Firebase
      const stripUndefinedDeep = (value: any): any => {
        if (Array.isArray(value)) return value.map(stripUndefinedDeep).filter((v) => v !== undefined)
        if (value && typeof value === "object") {
          const out: any = {}
          Object.entries(value).forEach(([k, v]) => {
            if (v === undefined) return
            const cleaned = stripUndefinedDeep(v)
            if (cleaned === undefined) return
            out[k] = cleaned
          })
          return out
        }
        return value
      }

      const now = Date.now()
      const sanitizedUpdates = stripUndefinedDeep({ ...warningUpdates, updatedAt: now })

      await updateWarningAPI(hrBasePath, warningId, sanitizedUpdates)
      const updatedWarning = {
        ...(originalWarning || {}),
        ...sanitizedUpdates,
        id: warningId,
      } as Warning
      dispatch({ type: "UPDATE_WARNING", payload: updatedWarning })
      
      // Add notification
      try {
        const employee = originalWarning ? stateRef.current.employees.find(emp => emp.id === originalWarning.employeeId) : null
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
        await createHRNotification(
          'updated',
          'Warning',
          `Warning for ${employeeName}`,
          warningId,
          originalWarning,
          updatedWarning
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedWarning
    } catch (error) {
      console.error("Error updating warning:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update warning" })
      throw new Error("Failed to update warning")
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const deleteWarning = useCallback(async (warningId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteWarning with basePath:", hrBasePath)
      
      const warningToDelete = stateRef.current.warnings.find(w => w.id === warningId)
      await deleteWarningAPI(hrBasePath, warningId)
      dispatch({ type: "DELETE_WARNING", payload: warningId })
      
      // Add notification
      if (warningToDelete) {
        try {
          const employee = stateRef.current.employees.find(emp => emp.id === warningToDelete.employeeId)
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
          await createHRNotification(
            'deleted',
            'Warning',
            `Warning for ${employeeName}`,
            warningId,
            warningToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting warning:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete warning" })
      return false
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const getEmployeeWarnings = async (employeeId: string): Promise<Warning[]> => {
    // Filter warnings by employee ID
    return state.warnings.filter(warning => warning.employeeId === employeeId)
  }
  
  // Attendance methods
  const addAttendance = async (attendance: Omit<Attendance, "id">): Promise<Attendance | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addAttendance with basePath:", hrBasePath)
      
      const attendanceId = await createAttendanceAPI(hrBasePath, attendance)
      if (attendanceId) {
        const newAttendance: Attendance = {
          ...attendance,
          id: attendanceId
        }
        dispatch({ type: "ADD_ATTENDANCE", payload: newAttendance })
        
        // Add notification
        try {
          const employee = state.employees.find(emp => emp.id === attendance.employeeId)
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
          await createHRNotification(
            'created',
            'Attendance',
            `Attendance for ${employeeName} on ${attendance.date || new Date().toISOString().split('T')[0]}`,
            attendanceId,
            undefined,
            newAttendance
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newAttendance
      }
      throw new Error("Failed to create attendance")
    } catch (error) {
      console.error("Error adding attendance:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add attendance" })
      throw new Error("Failed to add attendance")
    }
  }
  
  const updateAttendance = useCallback(async (attendanceId: string, attendanceUpdates: Partial<Attendance>): Promise<Attendance | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateAttendance with basePath:", hrBasePath)
      
      const originalAttendance = stateRef.current.attendances.find(a => a.id === attendanceId)
      await updateAttendanceAPI(hrBasePath, attendanceId, attendanceUpdates)
      const updatedAttendance = { ...attendanceUpdates, id: attendanceId } as Attendance
      dispatch({ type: "UPDATE_ATTENDANCE", payload: updatedAttendance })
      
      // Add notification
      try {
        const employee = originalAttendance ? stateRef.current.employees.find(emp => emp.id === originalAttendance.employeeId) : null
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
        const date = attendanceUpdates.date || originalAttendance?.date || new Date().toISOString().split('T')[0]
        await createHRNotification(
          'updated',
          'Attendance',
          `Attendance for ${employeeName} on ${date}`,
          attendanceId,
          originalAttendance,
          updatedAttendance
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedAttendance
    } catch (error) {
      console.error("Error updating attendance:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update attendance" })
      throw new Error("Failed to update attendance")
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const deleteAttendance = useCallback(async (attendanceId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteAttendance with basePath:", hrBasePath)
      
      const attendanceToDelete = stateRef.current.attendances.find(a => a.id === attendanceId)
      await deleteAttendanceAPI(hrBasePath, attendanceId)
      dispatch({ type: "DELETE_ATTENDANCE", payload: attendanceId })
      
      // Add notification
      if (attendanceToDelete) {
        try {
          const employee = stateRef.current.employees.find(emp => emp.id === attendanceToDelete.employeeId)
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"
          await createHRNotification(
            'deleted',
            'Attendance',
            `Attendance for ${employeeName} on ${attendanceToDelete.date || 'unknown date'}`,
            attendanceId,
            attendanceToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting attendance:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete attendance" })
      return false
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const getEmployeeAttendances = async (employeeId: string): Promise<Attendance[]> => {
    // Filter attendances by employee ID
    return state.attendances.filter(attendance => attendance.employeeId === employeeId)
  }
  
  // Compliance task methods
  const refreshComplianceTasks = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "complianceTasks",
      async () => {
        const all: ComplianceTask[] = []
        const ids = new Set<string>()
        for (const p of paths) {
          try {
            const tasks = await fetchComplianceTasksCached(p, true)
            for (const t of tasks || []) {
              const id = (t as any)?.id
              if (!id || ids.has(id)) continue
              ids.add(id)
              all.push(t as any)
            }
          } catch {
            // try next
          }
        }
        return all
      },
      "SET_COMPLIANCE_TASKS",
    )
  }
  
  const addComplianceTask = async (complianceTask: Omit<ComplianceTask, "id">): Promise<ComplianceTask> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`

      const now = Date.now()
      const payload: Omit<ComplianceTask, "id"> = {
        ...complianceTask,
        createdAt: complianceTask.createdAt || now,
        status: (complianceTask.status as any) || "pending",
      }

      const created = (await handleHRAction<ComplianceTask>(
        hrBasePath,
        "create",
        "complianceTasks",
        undefined,
        payload as any,
      )) as ComplianceTask

      // Update the state (so it appears immediately in the UI)
      dispatch({ type: "ADD_COMPLIANCE_TASK", payload: created })
      
      // Add notification
      try {
        await createHRNotification(
          'created',
          'Compliance Task',
          complianceTask.title || complianceTask.description || 'New Compliance Task',
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return created
    } catch (error) {
      console.error("Error adding compliance task:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add compliance task" })
      throw error
    }
  }
  
  const updateComplianceTask = useCallback(async (id: string, complianceTask: Partial<ComplianceTask>): Promise<ComplianceTask> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`

      // Find the existing task
      const existingTask = stateRef.current.complianceTasks.find(t => t.id === id)
      
      if (!existingTask) {
        throw new Error(`Task with ID ${id} not found`)
      }
      
      const now = Date.now()
      const updates = { ...complianceTask, updatedAt: now } as any
      const saved = (await handleHRAction<ComplianceTask>(
        hrBasePath,
        "edit",
        "complianceTasks",
        id,
        updates,
      )) as ComplianceTask

      const updatedTask: ComplianceTask = {
        ...existingTask,
        ...saved,
        id,
      }

      // Update the state
      dispatch({ type: "UPDATE_COMPLIANCE_TASK", payload: updatedTask })
      
      // Add notification
      try {
        await createHRNotification(
          'updated',
          'Compliance Task',
          complianceTask.title || existingTask.title || complianceTask.description || existingTask.description || 'Compliance Task',
          id,
          existingTask,
          updatedTask
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedTask
    } catch (error) {
      console.error("Error updating compliance task:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update compliance task" })
      throw error
    }
  }, [dispatch, getBasePath, createHRNotification])
  
  const deleteComplianceTask = useCallback(async (id: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) return false
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      const taskToDelete = stateRef.current.complianceTasks.find(t => t.id === id)

      await handleHRAction(
        hrBasePath,
        "delete",
        "complianceTasks",
        id,
        undefined,
      )
      
      // Update the state
      dispatch({ type: "DELETE_COMPLIANCE_TASK", payload: id })
      
      // Add notification
      if (taskToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Compliance Task',
            taskToDelete.title || taskToDelete.description || 'Compliance Task',
            id,
            taskToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting compliance task:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete compliance task" })
      return false
    }
  }, [dispatch, getBasePath, createHRNotification])


  // Employee invitation methods
  // Benefits management functions
  const fetchBenefits = async (): Promise<Benefit[]> => {
    try {
      const basePath = getBasePath("hr")
      const result = await handleHRAction(basePath, "fetch", "benefits")
      const benefits = (result as any) || []
      const arr: Benefit[] = Array.isArray(benefits) ? (benefits as Benefit[]) : []
      dispatch({ type: "SET_BENEFITS", payload: arr })
      return arr
    } catch (error) {
      console.error("Error fetching benefits:", error)
      return []
    }
  }

  const createBenefit = async (benefit: Omit<Benefit, "id">): Promise<Benefit | null> => {
    try {
      const basePath = getBasePath("hr")
      const result = await handleHRAction(basePath, "create", "benefits", undefined, benefit)
      const newBenefit = result as any as Benefit
      
      // Add notification
      if (newBenefit) {
        try {
          await createHRNotification(
            'created',
            'Benefit',
            benefit.name || 'New Benefit',
            newBenefit.id,
            undefined,
            newBenefit
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return newBenefit
    } catch (error) {
      console.error("Error creating benefit:", error)
      throw error
    }
  }

  const updateBenefit = useCallback(async (id: string, benefit: Partial<Benefit>): Promise<Benefit> => {
    try {
      const basePath = getBasePath("hr")
      const originalBenefit = stateRef.current.benefits.find(b => b.id === id)
      const result = await handleHRAction(basePath, "edit", "benefits", id, benefit)
      const updatedBenefit = result as any
      
      // Add notification
      if (updatedBenefit) {
        try {
          await createHRNotification(
            'updated',
            'Benefit',
            benefit.name || originalBenefit?.name || 'Benefit',
            id,
            originalBenefit,
            updatedBenefit
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return updatedBenefit
    } catch (error) {
      console.error("Error updating benefit:", error)
      throw error
    }
  }, [getBasePath, createHRNotification])

  const deleteBenefit = useCallback(async (id: string): Promise<boolean> => {
    try {
      const basePath = getBasePath("hr")
      const benefitToDelete = stateRef.current.benefits.find(b => b.id === id)
      await handleHRAction(basePath, "delete", "benefits", id)
      
      // Add notification
      if (benefitToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Benefit',
            benefitToDelete.name || 'Benefit',
            id,
            benefitToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting benefit:", error)
      return false
    }
  }, [getBasePath, createHRNotification])

  const fetchEmployeeBenefits = async (_employeeId: string): Promise<EmployeeBenefit[]> => {
    try {
      const basePath = getBasePath("hr")
      const result = await handleHRAction(basePath, "fetch", "employeeBenefits")
      return result as any || []
    } catch (error) {
      console.error("Error fetching employee benefits:", error)
      return []
    }
  }

  const assignBenefitToEmployee = async (_employeeId: string, _benefitId: string, data: Partial<EmployeeBenefit>): Promise<EmployeeBenefit | null> => {
    try {
      const basePath = getBasePath("hr")
      const result = await handleHRAction(basePath, "create", "employeeBenefits", undefined, data)
      const newEmployeeBenefit = result as any as EmployeeBenefit
      
      // Add notification
      if (newEmployeeBenefit) {
        try {
          await createHRNotification(
            'created',
            'Employee Benefit',
            `Benefit assigned to employee`,
            newEmployeeBenefit.id || 'new',
            undefined,
            newEmployeeBenefit
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return newEmployeeBenefit
    } catch (error) {
      console.error("Error assigning benefit to employee:", error)
      throw error
    }
  }

  const updateEmployeeBenefit = useCallback(async (id: string, data: Partial<EmployeeBenefit>): Promise<EmployeeBenefit> => {
    try {
      const basePath = getBasePath("hr")
      const originalEmployeeBenefit = stateRef.current.employeeBenefits.find(eb => eb.id === id)
      const result = await handleHRAction(basePath, "edit", "employeeBenefits", id, data)
      const updatedEmployeeBenefit = result as any
      
      // Add notification
      if (updatedEmployeeBenefit) {
        try {
          await createHRNotification(
            'updated',
            'Employee Benefit',
            `Employee benefit updated`,
            id,
            originalEmployeeBenefit,
            updatedEmployeeBenefit
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return updatedEmployeeBenefit
    } catch (error) {
      console.error("Error updating employee benefit:", error)
      throw error
    }
  }, [getBasePath, createHRNotification])

  const removeEmployeeBenefit = async (id: string): Promise<boolean> => {
    try {
      const basePath = getBasePath("hr")
      const employeeBenefitToDelete = state.employeeBenefits.find(eb => eb.id === id)
      await handleHRAction(basePath, "delete", "employeeBenefits", id)
      
      // Add notification
      if (employeeBenefitToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Employee Benefit',
            `Employee benefit removed`,
            id,
            employeeBenefitToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error removing employee benefit:", error)
      return false
    }
  }

  const generateJoinCode = async (roleId: string, employeeId?: string, expiresInDays: number = 7): Promise<string> => {
    try {
      const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
      const siteId = companyState.selectedSiteID || localStorage.getItem("siteId") || ""
      const subsiteId = companyState.selectedSubsiteID || localStorage.getItem("subsiteId") || undefined
      if (!companyId || !siteId) throw new Error("Missing company or site ID")

      if (employeeId) {
        // Employee-targeted join code: links a signed-in user to this employee on accept
        return await createEmployeeJoinCode(companyId, siteId, employeeId, roleId, expiresInDays, subsiteId)
      }

      // Fallback: create a site-level invite code using Company functions (legacy path)
      // For simple employee onboarding without pre-created employee, we keep existing site invite flow via CompanyContext join
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      console.log(`Generated temporary site invite code ${code} (legacy) for role ${roleId}`)
      return code
    } catch (error) {
      console.error("Error generating join code:", error)
      throw error
    }
  }

  const getEmployeeInvites = async (employeeId?: string) => {
    const companyId = companyState.companyID || localStorage.getItem("companyId") || ""
    if (!companyId) throw new Error("Missing company ID")
    return await listEmployeeJoinCodes(companyId, employeeId)
  }

  const revokeInvite = async (code: string) => {
    await revokeEmployeeJoinCode(code)
  }



  // Job management functions
  const addJob = async (job: Omit<JobPosting, "id">): Promise<JobPosting | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addJob with basePath:", hrBasePath)
      
      const jobId = await createJobAPI(hrBasePath, job)
      if (jobId) {
        const newJob: JobPosting = {
          ...job,
          id: jobId
        }
        dispatch({ type: "ADD_JOB", payload: newJob })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Job Posting',
            job.title || 'New Job Posting',
            jobId,
            undefined,
            newJob
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newJob
      }
      throw new Error("Failed to create job")
    } catch (error) {
      console.error("Error adding job:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add job" })
      throw new Error("Failed to add job")
    }
  }

  const updateJob = useCallback(async (id: string, job: Partial<JobPosting>): Promise<JobPosting | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateJob with basePath:", hrBasePath)
      
      const originalJob = stateRef.current.jobs.find(j => j.id === id)
      await updateJobAPI(hrBasePath, id, job)
      const updatedJob: JobPosting = { id, ...job } as JobPosting
      dispatch({ type: "UPDATE_JOB", payload: updatedJob })
      
      // Add notification
      try {
        await createHRNotification(
          'updated',
          'Job Posting',
          job.title || originalJob?.title || 'Job Posting',
          id,
          originalJob,
          updatedJob
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedJob
    } catch (error) {
      console.error("Error updating job:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update job" })
      throw new Error("Failed to update job")
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deleteJob = useCallback(async (id: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteJob with basePath:", hrBasePath)
      
      const jobToDelete = stateRef.current.jobs.find(j => j.id === id)
      await deleteJobAPI(hrBasePath, id)
      dispatch({ type: "DELETE_JOB", payload: id })
      
      // Add notification
      if (jobToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Job Posting',
            jobToDelete.title || 'Job Posting',
            id,
            jobToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting job:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete job" })
      throw new Error("Failed to delete job")
    }
  }, [dispatch, getBasePath, createHRNotification])

  // Candidate management functions
  const addCandidate = async (candidate: Omit<Candidate, "id">): Promise<Candidate | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addCandidate with basePath:", hrBasePath)
      
      const candidateId = await createCandidateAPI(hrBasePath, candidate)
      if (candidateId) {
        const newCandidate: Candidate = {
          ...candidate,
          id: candidateId
        }
        dispatch({ type: "ADD_CANDIDATE", payload: newCandidate })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Candidate',
            `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'New Candidate',
            candidateId,
            undefined,
            newCandidate
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newCandidate
      }
      throw new Error("Failed to create candidate")
    } catch (error) {
      console.error("Error adding candidate:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add candidate" })
      throw new Error("Failed to add candidate")
    }
  }

  const updateCandidate = useCallback(async (id: string, candidate: Partial<Candidate>): Promise<Candidate | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateCandidate with basePath:", hrBasePath)
      
      const originalCandidate = stateRef.current.candidates.find(c => c.id === id)
      await updateCandidateAPI(hrBasePath, id, candidate)
      const updatedCandidate: Candidate = { id, ...candidate } as Candidate
      dispatch({ type: "UPDATE_CANDIDATE", payload: updatedCandidate })
      
      // Add notification
      try {
        const name = candidate.firstName || originalCandidate?.firstName || ''
        const lastName = candidate.lastName || originalCandidate?.lastName || ''
        await createHRNotification(
          'updated',
          'Candidate',
          `${name} ${lastName}`.trim() || 'Candidate',
          id,
          originalCandidate,
          updatedCandidate
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedCandidate
    } catch (error) {
      console.error("Error updating candidate:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update candidate" })
      throw new Error("Failed to update candidate")
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deleteCandidate = useCallback(async (id: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteCandidate with basePath:", hrBasePath)
      
      const candidateToDelete = stateRef.current.candidates.find(c => c.id === id)
      await deleteCandidateAPI(hrBasePath, id)
      dispatch({ type: "DELETE_CANDIDATE", payload: id })
      
      // Add notification
      if (candidateToDelete) {
        try {
          const name = `${candidateToDelete.firstName || ''} ${candidateToDelete.lastName || ''}`.trim()
          await createHRNotification(
            'deleted',
            'Candidate',
            name || 'Candidate',
            id,
            candidateToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting candidate:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete candidate" })
      throw new Error("Failed to delete candidate")
    }
  }, [dispatch, getBasePath, createHRNotification])

  // Interview management functions
  const addInterview = async (interview: Omit<Interview, "id">): Promise<Interview | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - addInterview with basePath:", hrBasePath)
      
      const interviewId = await createInterviewAPI(hrBasePath, interview)
      if (interviewId) {
        const newInterview: Interview = {
          ...interview,
          id: interviewId
        }
        dispatch({ type: "ADD_INTERVIEW", payload: newInterview })
        
        // Add notification
        try {
          const candidate = state.candidates.find(c => c.id === interview.candidateId)
          const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate'
          await createHRNotification(
            'created',
            'Interview',
            `Interview with ${candidateName}`,
            interviewId,
            undefined,
            newInterview
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newInterview
      }
      throw new Error("Failed to create interview")
    } catch (error) {
      console.error("Error adding interview:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add interview" })
      throw new Error("Failed to add interview")
    }
  }

  const updateInterview = useCallback(async (id: string, interview: Partial<Interview>): Promise<Interview | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - updateInterview with basePath:", hrBasePath)
      
      const originalInterview = stateRef.current.interviews.find(i => i.id === id)
      await updateInterviewAPI(hrBasePath, id, interview)
      const updatedInterview: Interview = { id, ...interview } as Interview
      dispatch({ type: "UPDATE_INTERVIEW", payload: updatedInterview })
      
      // Add notification
      try {
        const candidateId = interview.candidateId || originalInterview?.candidateId
        const candidate = candidateId ? stateRef.current.candidates.find(c => c.id === candidateId) : null
        const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate'
        await createHRNotification(
          'updated',
          'Interview',
          `Interview with ${candidateName}`,
          id,
          originalInterview,
          updatedInterview
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return updatedInterview
    } catch (error) {
      console.error("Error updating interview:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update interview" })
      throw new Error("Failed to update interview")
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deleteInterview = useCallback(async (id: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const hrBasePath = `${basePath}/data/hr`
      console.log("HR Context - deleteInterview with basePath:", hrBasePath)
      
      const interviewToDelete = stateRef.current.interviews.find(i => i.id === id)
      await deleteInterviewAPI(hrBasePath, id)
      dispatch({ type: "DELETE_INTERVIEW", payload: id })
      
      // Add notification
      if (interviewToDelete) {
        try {
          const candidate = interviewToDelete.candidateId ? stateRef.current.candidates.find(c => c.id === interviewToDelete.candidateId) : null
          const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate'
          await createHRNotification(
            'deleted',
            'Interview',
            `Interview with ${candidateName}`,
            id,
            interviewToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting interview:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete interview" })
      throw new Error("Failed to delete interview")
    }
  }, [dispatch, getBasePath, createHRNotification])

  // Payroll operations
  const addPayroll = async (payroll: Omit<Payroll, "id">): Promise<Payroll | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) {
        console.error("Base path not set")
        throw new Error("Base path not set")
      }
      const result = await handleHRAction(basePath, "create", "payrolls", undefined, payroll) as Payroll
      
      dispatch({ type: "ADD_PAYROLL", payload: result })
      
      // Add notification
      try {
        const employee = state.employees.find(emp => emp.id === payroll.employeeId)
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
        await createHRNotification(
          'created',
          'Payroll',
          `Payroll record for ${employeeName}`,
          result.id || '',
          undefined,
          result
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return result as any
    } catch (error) {
      console.error("Error adding payroll:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add payroll" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const updatePayroll = useCallback(async (id: string, payroll: Partial<Payroll>): Promise<Payroll | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) {
        console.error("Base path not set")
        throw new Error("Base path not set")
      }
      const originalPayroll = stateRef.current.payrollRecords.find(p => p.id === id)
      const result = await handleHRAction(basePath, "edit", "payrolls", id, payroll) as Payroll
      
      dispatch({ type: "UPDATE_PAYROLL", payload: result })
      
      // Add notification
      try {
        const employeeId = payroll.employeeId || originalPayroll?.employeeId
        const employee = employeeId ? stateRef.current.employees.find(emp => emp.id === employeeId) : null
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
        await createHRNotification(
          'updated',
          'Payroll',
          `Payroll record for ${employeeName}`,
          id,
          originalPayroll,
          result
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
      
      return result as any
    } catch (error) {
      console.error("Error updating payroll:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update payroll" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deletePayroll = useCallback(async (id: string): Promise<boolean> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) {
        console.error("Base path not set")
        throw new Error("Base path not set")
      }
      const payrollToDelete = stateRef.current.payrollRecords.find(p => p.id === id)
      await handleHRAction(basePath, "delete", "payrolls", id)
      
      dispatch({ type: "DELETE_PAYROLL", payload: id })
      
      // Add notification
      if (payrollToDelete) {
        try {
          const employee = payrollToDelete.employeeId ? stateRef.current.employees.find(emp => emp.id === payrollToDelete.employeeId) : null
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
          await createHRNotification(
            'deleted',
            'Payroll',
            `Payroll record for ${employeeName}`,
            id,
            payrollToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting payroll:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete payroll" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath, createHRNotification])

  const updatePayrollRecord = useCallback(async (id: string, payroll: Partial<Payroll>): Promise<Payroll | null> => {
    return updatePayroll(id, payroll)
  }, [updatePayroll])

  const deletePayrollRecord = useCallback(async (id: string): Promise<boolean> => {
    return deletePayroll(id)
  }, [deletePayroll])

  // Performance Review (template-based) operations
  const addPerformanceReview = async (review: Omit<PerformanceReviewEntry, "id">): Promise<PerformanceReviewEntry | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload: Omit<PerformanceReviewEntry, "id"> = {
        ...review,
        status: review.status || "draft",
        answers: Array.isArray(review.answers) ? review.answers : [],
        createdAt: review.createdAt || now,
        updatedAt: now,
      }

      const result = (await handleHRAction<PerformanceReviewEntry>(
        hrBasePath,
        "create",
        "performanceReviews",
        undefined,
        payload,
      )) as PerformanceReviewEntry

      dispatch({ type: "ADD_PERFORMANCE_REVIEW", payload: result })

      try {
        const employee = state.employees.find((emp) => emp.id === review.employeeId)
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Employee"
        await createHRNotification(
          "created",
          "Performance Review",
          `Performance review for ${employeeName}`,
          result.id,
          undefined,
          result,
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return result
    } catch (error) {
      console.error("Error adding performance review:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to add performance review" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const updatePerformanceReview = useCallback(async (id: string, review: Partial<PerformanceReviewEntry>): Promise<PerformanceReviewEntry | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const original = stateRef.current.performanceReviews.find((r) => r.id === id)

      await handleHRAction<PerformanceReviewEntry>(
        hrBasePath,
        "edit",
        "performanceReviews",
        id,
        { ...review, updatedAt: now } as any,
      )

      const merged: PerformanceReviewEntry = {
        ...(original as any),
        ...(review as any),
        id,
        updatedAt: now,
      }

      dispatch({ type: "UPDATE_PERFORMANCE_REVIEW", payload: merged })

      try {
        const employeeId = merged.employeeId || original?.employeeId
        const employee = employeeId ? stateRef.current.employees.find((emp) => emp.id === employeeId) : null
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Employee"
        await createHRNotification(
          "updated",
          "Performance Review",
          `Performance review for ${employeeName}`,
          id,
          original,
          merged,
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return merged
    } catch (error) {
      console.error("Error updating performance review:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update performance review" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath, createHRNotification])

  const deletePerformanceReview = useCallback(async (id: string): Promise<boolean> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      const reviewToDelete = stateRef.current.performanceReviews.find((r) => r.id === id)

      await handleHRAction(hrBasePath, "delete", "performanceReviews", id)
      dispatch({ type: "DELETE_PERFORMANCE_REVIEW", payload: id })

      if (reviewToDelete) {
        try {
          const employee = reviewToDelete.employeeId ? stateRef.current.employees.find((emp) => emp.id === reviewToDelete.employeeId) : null
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Employee"
          await createHRNotification(
            "deleted",
            "Performance Review",
            `Performance review for ${employeeName}`,
            id,
            reviewToDelete,
            undefined,
          )
        } catch (notificationError) {
          console.warn("Failed to create notification:", notificationError)
        }
      }

      return true
    } catch (error) {
      console.error("Error deleting performance review:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete performance review" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath, createHRNotification])

  // Performance Review Template operations (stored under `reviewTemplates`)
  const createPerformanceReviewTemplate = async (
    template: Omit<PerformanceReviewTemplate, "id">,
  ): Promise<PerformanceReviewTemplate | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload: Omit<PerformanceReviewTemplate, "id"> = {
        ...template,
        isActive: template.isActive ?? true,
        sections: Array.isArray(template.sections) ? template.sections : [],
        createdAt: template.createdAt || now,
        updatedAt: now,
      }

      const created = (await handleHRAction<PerformanceReviewTemplate>(
        hrBasePath,
        "create",
        "reviewTemplates",
        undefined,
        payload,
      )) as PerformanceReviewTemplate

      dispatch({ type: "ADD_PERFORMANCE_REVIEW_TEMPLATE", payload: created })
      return created
    } catch (error) {
      console.error("Error creating performance review template:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create performance review template" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const updatePerformanceReviewTemplate = useCallback(async (
    id: string,
    template: Partial<PerformanceReviewTemplate>,
  ): Promise<PerformanceReviewTemplate | null> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const original = stateRef.current.performanceReviewTemplates.find((t) => t.id === id)

      await handleHRAction<PerformanceReviewTemplate>(
        hrBasePath,
        "edit",
        "reviewTemplates",
        id,
        { ...template, updatedAt: now } as any,
      )

      const merged: PerformanceReviewTemplate = {
        ...(original as any),
        ...(template as any),
        id,
        updatedAt: now,
      }

      dispatch({ type: "UPDATE_PERFORMANCE_REVIEW_TEMPLATE", payload: merged })
      return merged
    } catch (error) {
      console.error("Error updating performance review template:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update performance review template" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath])

  const deletePerformanceReviewTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })
      const basePath = getBasePath("hr")
      if (!basePath) throw new Error("Base path not set")

      const hrBasePath = `${basePath}/data/hr`
      await handleHRAction(hrBasePath, "delete", "reviewTemplates", id)
      dispatch({ type: "DELETE_PERFORMANCE_REVIEW_TEMPLATE", payload: id })
      return true
    } catch (error) {
      console.error("Error deleting performance review template:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete performance review template" })
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, getBasePath])

  // Schedule operations - using proper RTDatabase functions (duplicates removed)

  // Contract management functions
  const fetchContractTemplates = async (): Promise<ContractTemplate[]> => {
    const basePath = getHRWritePath()
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const templates = await fetchContractTemplatesRTDB(basePath)
      dispatch({ type: "SET_CONTRACT_TEMPLATES", payload: templates })
      return templates
    } catch (error) {
      console.error("Error fetching contract templates:", error)
      throw error
    }
  }

  const createContractTemplate = async (template: Omit<ContractTemplate, "id">): Promise<ContractTemplate | null> => {
    const basePath = getHRWritePath()
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const newTemplate = await createContractTemplateRTDB(basePath, template)
      if (newTemplate) {
        dispatch({ type: "ADD_CONTRACT_TEMPLATE", payload: newTemplate })
        
        // Add notification
        try {
          await createHRNotification(
            'created',
            'Contract Template',
            template.name || 'New Contract Template',
            newTemplate.id,
            undefined,
            newTemplate
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newTemplate
      }
      return null
    } catch (error) {
      console.error("Error creating contract template:", error)
      throw error
    }
  }

  const updateContractTemplate = useCallback(async (templateId: string, template: Partial<ContractTemplate>): Promise<ContractTemplate | null> => {
    const basePath = getHRWritePath()
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const originalTemplate = stateRef.current.contractTemplates.find(t => t.id === templateId)
      await rtdb.updateContractTemplate(basePath, templateId, template)
      const updatedTemplates = await fetchContractTemplatesRTDB(basePath)
      dispatch({ type: "SET_CONTRACT_TEMPLATES", payload: updatedTemplates })
      const updatedTemplate = updatedTemplates.find(t => t.id === templateId) || null
        
        // Add notification
        try {
          await createHRNotification(
            'updated',
            'Contract Template',
            template.name || originalTemplate?.name || 'Contract Template',
            templateId,
            originalTemplate,
            updatedTemplate
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      return updatedTemplate
    } catch (error) {
      console.error("Error updating contract template:", error)
      throw error
    }
  }, [getHRWritePath, createHRNotification])

  const deleteContractTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    const basePath = getHRWritePath()
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const templateToDelete = stateRef.current.contractTemplates.find(t => t.id === templateId)
      await rtdb.deleteContractTemplate(basePath, templateId)
      const currentTemplates = stateRef.current.contractTemplates || []
      const updatedTemplates = currentTemplates.filter(t => t.id !== templateId)
      dispatch({ type: "SET_CONTRACT_TEMPLATES", payload: updatedTemplates })
      
      // Add notification
      if (templateToDelete) {
        try {
          await createHRNotification(
            'deleted',
            'Contract Template',
            templateToDelete.name || 'Contract Template',
            templateId,
            templateToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting contract template:", error)
      throw error
    }
  }, [getHRWritePath, dispatch, createHRNotification])

  const createContract = async (contract: Omit<Contract, "id">): Promise<Contract | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) {
      console.error("createContract - Base path not set")
      throw new Error("Base path not set")
    }
    
    console.log("createContract - Base path:", basePath)
    console.log("createContract - Contract data:", { employeeId: contract.employeeId, type: contract.type, contractTitle: contract.contractTitle })
    
    try {
      const newContract = await createContractRTDB(basePath, contract)
      if (newContract) {
        console.log("createContract - Contract created successfully, ID:", newContract.id)
        dispatch({ type: "ADD_CONTRACT", payload: newContract })
        
        // Delay refresh to ensure database write has completed
        // The ADD_CONTRACT action already updates the state, so we don't need immediate refresh
        // Refresh in background after a short delay to sync with database
        setTimeout(async () => {
          try {
            await refreshContracts()
          } catch (error) {
            console.warn("Background contract refresh failed, but contract is already in state:", error)
          }
        }, 500)
        
        // Add notification
        try {
          const employee = state.employees.find(emp => emp.id === contract.employeeId)
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
          await createHRNotification(
            'created',
            'Contract',
            `Contract for ${employeeName}`,
            newContract.id,
            undefined,
            newContract
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        return newContract
      }
      console.error("createContract - Failed to create contract, returned null")
      return null
    } catch (error) {
      console.error("Error creating contract:", error)
      throw error
    }
  }

  const updateContract = useCallback(async (contractId: string, contractUpdates: Partial<Contract>): Promise<Contract | null> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const originalContract = stateRef.current.contracts.find(c => c.id === contractId)
      if (!originalContract) {
        console.error("updateContract - Contract not found in state:", contractId)
        throw new Error("Contract not found")
      }
      
      // Log the updates being sent
      console.log("updateContract - Contract updates received:", contractUpdates)
      console.log("updateContract - Original contract employeeId:", originalContract.employeeId)
      console.log("updateContract - New employeeId in updates:", contractUpdates.employeeId)
      
      // Ensure employeeId is included in updates - prioritize new value, but never lose it
      const updatesWithEmployeeId = {
        ...contractUpdates,
        // Always include employeeId - use new value if provided and not empty, otherwise keep original
        employeeId: (contractUpdates.employeeId && contractUpdates.employeeId !== '') 
          ? contractUpdates.employeeId 
          : (originalContract.employeeId || contractUpdates.employeeId)
      }
      
      console.log("updateContract - Updates with employeeId:", updatesWithEmployeeId)
      console.log("updateContract - Final employeeId being sent:", updatesWithEmployeeId.employeeId)
      
      const updatedContract = await updateContractRTDB(basePath, contractId, updatesWithEmployeeId)
      if (updatedContract) {
        // Ensure the id and employeeId are set on the updated contract
        // Always preserve employeeId - never allow it to be undefined or empty
        const finalEmployeeId = updatedContract.employeeId || updatesWithEmployeeId.employeeId || originalContract.employeeId
        
        const contractWithId = { 
          ...updatedContract, 
          id: contractId,
          // Explicitly ensure employeeId is always set
          employeeId: finalEmployeeId
        }
        
        console.log("updateContract - Updating contract in state:", contractId)
        console.log("updateContract - Final employeeId in state update:", contractWithId.employeeId)
        console.log("updateContract - Full contract being dispatched:", contractWithId)
        
        dispatch({ type: "UPDATE_CONTRACT", payload: contractWithId })
        
        // Invalidate cache to ensure fresh data on next fetch
        const cacheKey = `${basePath}/data/hr/contracts`
        dataCache.invalidate(cacheKey)
        
        // Delay refresh to ensure database write has completed
        // The UPDATE_CONTRACT action already updates the state, so we don't need immediate refresh
        setTimeout(async () => {
          try {
            await refreshContracts()
          } catch (error) {
            console.warn("Background contract refresh failed, but contract is already updated in state:", error)
          }
        }, 500)
        
        // Add notification
        try {
          const employeeId = contractUpdates.employeeId || originalContract?.employeeId
          const employee = employeeId ? stateRef.current.employees.find(emp => emp.id === employeeId) : null
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
          await createHRNotification(
            'updated',
            'Contract',
            `Contract for ${employeeName}`,
            contractId,
            originalContract,
            updatedContract
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
        
        // Return the contract with id and all fields
        return contractWithId
      }
      return null
    } catch (error) {
      console.error("Error updating contract:", error)
      throw error
    }
  }, [getBasePath, dispatch, refreshContracts, createHRNotification])

  const deleteContract = useCallback(async (contractId: string): Promise<boolean> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")
    
    try {
      const contractToDelete = stateRef.current.contracts.find(c => c.id === contractId)
      await rtdb.deleteContract(basePath, contractId)
      // Remove from state
      const currentContracts = stateRef.current.contracts || []
      const updatedContracts = currentContracts.filter(c => c.id !== contractId)
      dispatch({ type: "SET_CONTRACTS", payload: updatedContracts })
      
      // Add notification
      if (contractToDelete) {
        try {
          const employee = contractToDelete.employeeId ? stateRef.current.employees.find(emp => emp.id === contractToDelete.employeeId) : null
          const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'
          await createHRNotification(
            'deleted',
            'Contract',
            `Contract for ${employeeName}`,
            contractId,
            contractToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError)
        }
      }
      
      return true
    } catch (error) {
      console.error("Error deleting contract:", error)
      throw error
    }
  }, [getBasePath, dispatch, createHRNotification])

  const initializeDefaultContractTemplates = async (): Promise<void> => {
    const basePath = getHRWritePath()
    if (!basePath) throw new Error("Base path not set")
    
    try {
      // Check if templates already exist
      const existingTemplates = await fetchContractTemplatesRTDB(basePath)
      if (existingTemplates.length > 0) {
        return // Templates already exist
      }
      
      // Create default templates
      const defaultTemplates: Omit<ContractTemplate, "id">[] = [
        {
          name: "Full-Time Employment Contract",
          bodyHtml: "<h2>Full-Time Employment Contract</h2><p>This contract outlines the terms of full-time employment...</p>",
          defaultType: "permanent",
          terms: ["40 hours per week", "Health insurance", "Paid time off"],
          active: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: "Part-Time Employment Contract",
          bodyHtml: "<h2>Part-Time Employment Contract</h2><p>This contract outlines the terms of part-time employment...</p>",
          defaultType: "casual",
          terms: ["20 hours per week", "Pro-rated benefits"],
          active: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: "Fixed-Term Contract",
          bodyHtml: "<h2>Fixed-Term Contract</h2><p>This contract outlines the terms for fixed-term employment...</p>",
          defaultType: "fixed_term",
          terms: ["Project-based work", "End date specified", "Renewal possible"],
          active: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
      
      // Create each template
      for (const template of defaultTemplates) {
        await createContractTemplateRTDB(basePath, template)
      }
      
      // Refresh templates in state
      const templates = await fetchContractTemplatesRTDB(basePath)
      dispatch({ type: "SET_CONTRACT_TEMPLATES", payload: templates })
    } catch (error) {
      console.error("Error initializing default contract templates:", error)
      throw error
    }
  }

  // Event management functions
  const refreshEvents = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "events",
      async () => {
        const all: CompanyEvent[] = []
        const ids = new Set<string>()
        for (const p of paths) {
          try {
            const events = await fetchEventsCached(p, true)
            for (const e of events || []) {
              const id = (e as any)?.id
              if (!id || ids.has(id)) continue
              ids.add(id)
              all.push(e as any)
            }
          } catch {
            // try next
          }
        }
        return all
      },
      "SET_EVENTS",
    )
  }

  const createEvent = async (event: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    const hrBasePath = `${basePath}/data/hr`
    const now = Date.now()

    const payload = {
      ...event,
      attendees: Array.isArray(event?.attendees) ? event.attendees : [],
      tags: Array.isArray(event?.tags) ? event.tags : [],
      createdAt: event?.createdAt || now,
      updatedAt: now,
    }

    const created = (await handleHRAction(hrBasePath, "create", "events", undefined, payload)) as any

    dispatch({ type: "SET_EVENTS", payload: [...(state.events || []), created] })
    
    // Add notification
    try {
      await createHRNotification(
        'created',
        'Event',
        created.title || created.name || 'New Event',
        created.id,
        undefined,
        created
      )
    } catch (notificationError) {
      console.warn('Failed to create notification:', notificationError)
    }
    
    return created
  }

  const updateEvent = async (eventId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    const hrBasePath = `${basePath}/data/hr`
    const now = Date.now()
    const originalEvent = (state.events || []).find((e: any) => e.id === eventId)

    const saved = (await handleHRAction(hrBasePath, "edit", "events", eventId, { ...updates, updatedAt: now })) as any
    const updated = { ...(originalEvent || {}), ...(saved || {}), id: eventId }

    dispatch({
      type: "SET_EVENTS",
      payload: (state.events || []).map((e: any) => (e.id === eventId ? updated : e)),
    })
    
    // Add notification
    if (originalEvent) {
      try {
        await createHRNotification(
          'updated',
          'Event',
          updates.title || updates.name || originalEvent.title || originalEvent.name || 'Event',
          eventId,
          originalEvent,
          updated
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    }
  }

  const deleteEvent = async (eventId: string): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    const hrBasePath = `${basePath}/data/hr`
    const eventToDelete = (state.events || []).find((e: any) => e.id === eventId)

    await handleHRAction(hrBasePath, "delete", "events", eventId, undefined)

    dispatch({ type: "SET_EVENTS", payload: (state.events || []).filter((e: any) => e.id !== eventId) })
    
    // Add notification
    if (eventToDelete) {
      try {
        await createHRNotification(
          'deleted',
          'Event',
          eventToDelete.title || eventToDelete.name || 'Event',
          eventId,
          eventToDelete,
          undefined
        )
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }
    }
  }

  const fetchEventRSVPs = async (eventId: string): Promise<any[]> => {
    const paths = getHRPaths()
    if (paths.length === 0) return []

    const all: EventRSVP[] = []
    const ids = new Set<string>()

    for (const p of paths) {
      try {
        const rsvps = await fetchList<EventRSVP>(p, "eventRSVPs")
        for (const rsvp of rsvps || []) {
          if (rsvp.eventId !== eventId || ids.has(rsvp.id)) continue
          ids.add(rsvp.id)
          all.push(rsvp)
        }
      } catch {
        // try next
      }
    }

    return all
  }

  const createEventRSVP = async (rsvp: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload = {
        ...rsvp,
        createdAt: rsvp.createdAt || now,
        updatedAt: now,
      } as EventRSVP

      const created = (await handleHRAction<EventRSVP>(
        hrBasePath,
        "create",
        "eventRSVPs",
        undefined,
        payload as any,
      )) as EventRSVP

      try {
        await createHRNotification(
          "created",
          "Event RSVP",
          `RSVP for ${created.employeeName || "event"}`,
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return created
    } catch (error) {
      console.error("Error creating event RSVP:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create event RSVP" })
      throw error
    }
  }

  const updateEventRSVP = async (rsvpId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const allEventIds = (state.events || []).map((event: any) => event.id)
      const existingRsvpLists = await Promise.all(allEventIds.map((eventId) => fetchEventRSVPs(eventId)))
      const originalRsvp = existingRsvpLists.flat().find((rsvp) => rsvp.id === rsvpId)

      await handleHRAction<EventRSVP>(
        hrBasePath,
        "edit",
        "eventRSVPs",
        rsvpId,
        { ...updates, updatedAt: Date.now() } as any,
      )

      try {
        await createHRNotification(
          "updated",
          "Event RSVP",
          `RSVP updated`,
          rsvpId,
          originalRsvp,
          { ...(originalRsvp || {}), ...updates }
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }
    } catch (error) {
      console.error("Error updating event RSVP:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update event RSVP" })
      throw error
    }
  }

  // Expense management functions
  const refreshExpenseReports = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "expenseReports",
      async () => {
        const all: ExpenseReport[] = []
        const ids = new Set<string>()
        for (const p of paths) {
          try {
            const reports = await fetchExpenseReportsCached(p, true)
            for (const r of reports || []) {
              const id = (r as any)?.id
              if (!id || ids.has(id)) continue
              ids.add(id)
              all.push(r as any)
            }
          } catch {
            // try next
          }
        }
        return all
      },
      "SET_EXPENSE_REPORTS",
    )
  }

  const createExpenseReport = async (report: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload = {
        ...report,
        receipts: Array.isArray(report.receipts) ? report.receipts : [],
        categories: Array.isArray(report.categories) ? report.categories : [],
        createdAt: report.createdAt || now,
        updatedAt: now,
      } as ExpenseReport

      const created = (await handleHRAction<ExpenseReport>(
        hrBasePath,
        "create",
        "expenseReports",
        undefined,
        payload as any,
      )) as ExpenseReport

      dispatch({
        type: "SET_EXPENSE_REPORTS",
        payload: [...(state.expenseReports || []), created],
      })

      try {
        await createHRNotification(
          "created",
          "Expense Report",
          created.title || created.description || "New Expense Report",
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return created
    } catch (error) {
      console.error("Error creating expense report:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create expense report" })
      throw error
    }
  }

  const updateExpenseReport = async (reportId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const originalReport = state.expenseReports.find(r => r.id === reportId)
      if (!originalReport) {
        throw new Error(`Expense report with ID ${reportId} not found`)
      }

      const now = Date.now()
      const saved = (await handleHRAction<ExpenseReport>(
        hrBasePath,
        "edit",
        "expenseReports",
        reportId,
        {
          ...updates,
          receipts: Array.isArray(updates.receipts) ? updates.receipts : originalReport.receipts || [],
          categories: Array.isArray(updates.categories) ? updates.categories : originalReport.categories || [],
          updatedAt: now,
        } as any,
      )) as ExpenseReport

      const updatedReport: ExpenseReport = {
        ...originalReport,
        ...saved,
        id: reportId,
        updatedAt: now,
      }

      dispatch({
        type: "SET_EXPENSE_REPORTS",
        payload: (state.expenseReports || []).map((report) =>
          report.id === reportId ? updatedReport : report
        ),
      })

      try {
        await createHRNotification(
          "updated",
          "Expense Report",
          updatedReport.title || updatedReport.description || "Expense Report",
          reportId,
          originalReport,
          updatedReport
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }
    } catch (error) {
      console.error("Error updating expense report:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update expense report" })
      throw error
    }
  }

  const deleteExpenseReport = async (reportId: string): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const reportToDelete = state.expenseReports.find(r => r.id === reportId)

      await handleHRAction(
        hrBasePath,
        "delete",
        "expenseReports",
        reportId,
        undefined,
      )

      dispatch({
        type: "SET_EXPENSE_REPORTS",
        payload: (state.expenseReports || []).filter((report) => report.id !== reportId),
      })

      if (reportToDelete) {
        try {
          await createHRNotification(
            "deleted",
            "Expense Report",
            reportToDelete.title || reportToDelete.description || "Expense Report",
            reportId,
            reportToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn("Failed to create notification:", notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting expense report:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete expense report" })
      throw error
    }
  }

  // Diversity and inclusion functions
  const refreshDiversityInitiatives = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "diversityInitiatives",
      async () => {
        const all: DiversityInitiative[] = []
        const ids = new Set<string>()
        for (const p of paths) {
          try {
            const initiatives = await fetchDiversityInitiativesCached(p, true)
            for (const i of initiatives || []) {
              const id = (i as any)?.id
              if (!id || ids.has(id)) continue
              ids.add(id)
              all.push(i as any)
            }
          } catch {
            // try next
          }
        }
        return all
      },
      "SET_DIVERSITY_INITIATIVES",
    )
  }

  const createDiversityInitiative = async (initiative: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) return null

    try {
      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload = {
        ...initiative,
        improvementAreas: Array.isArray(initiative.improvementAreas)
          ? initiative.improvementAreas
          : [],
        createdAt: initiative.createdAt || now,
        updatedAt: now,
      } as DiversityInitiative

      const created = (await handleHRAction<DiversityInitiative>(
        hrBasePath,
        "create",
        "diversityInitiatives",
        undefined,
        payload as any,
      )) as DiversityInitiative

      dispatch({ type: "ADD_DIVERSITY_INITIATIVE", payload: created })

      try {
        await createHRNotification(
          "created",
          "Diversity Initiative",
          created.title || "New Diversity Initiative",
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return created
    } catch (error) {
      console.error("Error creating diversity initiative:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create diversity initiative" })
      throw error
    }
  }

  const updateDiversityInitiative = async (initiativeId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const originalInitiative = state.diversityInitiatives.find(i => i.id === initiativeId)
      if (!originalInitiative) {
        throw new Error(`Diversity initiative with ID ${initiativeId} not found`)
      }

      const now = Date.now()
      const saved = (await handleHRAction<DiversityInitiative>(
        hrBasePath,
        "edit",
        "diversityInitiatives",
        initiativeId,
        {
          ...updates,
          improvementAreas: Array.isArray(updates.improvementAreas)
            ? updates.improvementAreas
            : originalInitiative.improvementAreas || [],
          updatedAt: now,
        } as any,
      )) as DiversityInitiative

      const updatedInitiative: DiversityInitiative = {
        ...originalInitiative,
        ...saved,
        id: initiativeId,
        updatedAt: now,
      }

      dispatch({ type: "UPDATE_DIVERSITY_INITIATIVE", payload: updatedInitiative })

      try {
        await createHRNotification(
          "updated",
          "Diversity Initiative",
          updatedInitiative.title || "Diversity Initiative",
          initiativeId,
          originalInitiative,
          updatedInitiative
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }
    } catch (error) {
      console.error("Error updating diversity initiative:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update diversity initiative" })
      throw error
    }
  }

  const deleteDiversityInitiative = async (initiativeId: string): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const initiativeToDelete = state.diversityInitiatives.find(i => i.id === initiativeId)

      await handleHRAction(
        hrBasePath,
        "delete",
        "diversityInitiatives",
        initiativeId,
        undefined,
      )

      dispatch({ type: "DELETE_DIVERSITY_INITIATIVE", payload: initiativeId })

      if (initiativeToDelete) {
        try {
          await createHRNotification(
            "deleted",
            "Diversity Initiative",
            initiativeToDelete.title || "Diversity Initiative",
            initiativeId,
            initiativeToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn("Failed to create notification:", notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting diversity initiative:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete diversity initiative" })
      throw error
    }
  }

  const refreshDiversitySurveys = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh(
      "diversitySurveys",
      async () => {
        const all: DiversitySurvey[] = []
        const ids = new Set<string>()
        for (const p of paths) {
          try {
            const surveys = await fetchDiversitySurveysCached(p, true)
            for (const s of surveys || []) {
              const id = (s as any)?.id
              if (!id || ids.has(id)) continue
              ids.add(id)
              all.push(s as any)
            }
          } catch {
            // try next
          }
        }
        return all
      },
      "SET_DIVERSITY_SURVEYS",
    )
  }

  const createDiversitySurvey = async (survey: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) return null

    try {
      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload = {
        ...survey,
        keyFindings: Array.isArray(survey.keyFindings) ? survey.keyFindings : [],
        createdAt: survey.createdAt || now,
        updatedAt: now,
      } as DiversitySurvey

      const created = (await handleHRAction<DiversitySurvey>(
        hrBasePath,
        "create",
        "diversitySurveys",
        undefined,
        payload as any,
      )) as DiversitySurvey

      dispatch({ type: "ADD_DIVERSITY_SURVEY", payload: created })

      try {
        await createHRNotification(
          "created",
          "Diversity Survey",
          created.title || "New Diversity Survey",
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return created
    } catch (error) {
      console.error("Error creating diversity survey:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create diversity survey" })
      throw error
    }
  }

  const updateDiversitySurvey = async (surveyId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const originalSurvey = state.diversitySurveys.find(s => s.id === surveyId)
      if (!originalSurvey) {
        throw new Error(`Diversity survey with ID ${surveyId} not found`)
      }

      const now = Date.now()
      const saved = (await handleHRAction<DiversitySurvey>(
        hrBasePath,
        "edit",
        "diversitySurveys",
        surveyId,
        {
          ...updates,
          keyFindings: Array.isArray(updates.keyFindings)
            ? updates.keyFindings
            : originalSurvey.keyFindings || [],
          updatedAt: now,
        } as any,
      )) as DiversitySurvey

      const updatedSurvey: DiversitySurvey = {
        ...originalSurvey,
        ...saved,
        id: surveyId,
        updatedAt: now,
      }

      dispatch({ type: "UPDATE_DIVERSITY_SURVEY", payload: updatedSurvey })

      try {
        await createHRNotification(
          "updated",
          "Diversity Survey",
          updatedSurvey.title || "Diversity Survey",
          surveyId,
          originalSurvey,
          updatedSurvey
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }
    } catch (error) {
      console.error("Error updating diversity survey:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update diversity survey" })
      throw error
    }
  }

  const deleteDiversitySurvey = async (surveyId: string): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const surveyToDelete = state.diversitySurveys.find(s => s.id === surveyId)

      await handleHRAction(
        hrBasePath,
        "delete",
        "diversitySurveys",
        surveyId,
        undefined,
      )

      dispatch({ type: "DELETE_DIVERSITY_SURVEY", payload: surveyId })

      if (surveyToDelete) {
        try {
          await createHRNotification(
            "deleted",
            "Diversity Survey",
            surveyToDelete.title || "Diversity Survey",
            surveyId,
            surveyToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn("Failed to create notification:", notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting diversity survey:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete diversity survey" })
      throw error
    }
  }

  // Starter checklist functions
  const refreshStarterChecklists = async (): Promise<void> => {
    const paths = getHRPaths()
    if (paths.length === 0) return

    await safeRefresh("starterChecklists", async () => {
      const all: StarterChecklist[] = []
      const ids = new Set<string>()
      for (const p of paths) {
        try {
          const checklists = await fetchList<StarterChecklist>(p, "starterChecklists")
          for (const checklist of checklists || []) {
            if (!checklist.id || ids.has(checklist.id)) continue
            ids.add(checklist.id)
            all.push(checklist)
          }
        } catch {
          // try next
        }
      }
      return all
    }, "SET_STARTER_CHECKLISTS")
  }

  const createStarterChecklist = async (checklist: Omit<any, "id">): Promise<any> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const now = Date.now()
      const payload = {
        ...checklist,
        items: Array.isArray(checklist.items) ? checklist.items : [],
        createdAt: checklist.createdAt || now,
        updatedAt: now,
      } as StarterChecklist

      const created = (await handleHRAction<StarterChecklist>(
        hrBasePath,
        "create",
        "starterChecklists",
        undefined,
        payload as any,
      )) as StarterChecklist

      dispatch({
        type: "SET_STARTER_CHECKLISTS",
        payload: [...(state.starterChecklists || []), created],
      })

      try {
        await createHRNotification(
          "created",
          "Starter Checklist",
          created.payrollNumber || "New Starter Checklist",
          created.id,
          undefined,
          created
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      return created
    } catch (error) {
      console.error("Error creating starter checklist:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to create starter checklist" })
      throw error
    }
  }

  const updateStarterChecklist = async (checklistId: string, updates: Partial<any>): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const originalChecklist = state.starterChecklists.find(c => c.id === checklistId)
      if (!originalChecklist) {
        throw new Error(`Starter checklist with ID ${checklistId} not found`)
      }

      const now = Date.now()
      const saved = (await handleHRAction<StarterChecklist>(
        hrBasePath,
        "edit",
        "starterChecklists",
        checklistId,
        {
          ...updates,
          items: Array.isArray(updates.items) ? updates.items : originalChecklist.items || [],
          updatedAt: now,
        } as any,
      )) as StarterChecklist

      const updatedChecklist: StarterChecklist = {
        ...originalChecklist,
        ...saved,
        id: checklistId,
        updatedAt: now,
      }

      dispatch({
        type: "SET_STARTER_CHECKLISTS",
        payload: (state.starterChecklists || []).map((checklist) =>
          checklist.id === checklistId ? updatedChecklist : checklist
        ),
      })

      try {
        await createHRNotification(
          "updated",
          "Starter Checklist",
          updatedChecklist.payrollNumber || "Starter Checklist",
          checklistId,
          originalChecklist,
          updatedChecklist
        )
      } catch (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }
    } catch (error) {
      console.error("Error updating starter checklist:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to update starter checklist" })
      throw error
    }
  }

  const deleteStarterChecklist = async (checklistId: string): Promise<void> => {
    const basePath = getBasePath("hr")
    if (!basePath) throw new Error("Base path not set")

    try {
      const hrBasePath = `${basePath}/data/hr`
      const checklistToDelete = state.starterChecklists.find(c => c.id === checklistId)

      await handleHRAction(
        hrBasePath,
        "delete",
        "starterChecklists",
        checklistId,
        undefined,
      )

      dispatch({
        type: "SET_STARTER_CHECKLISTS",
        payload: (state.starterChecklists || []).filter((checklist) => checklist.id !== checklistId),
      })

      if (checklistToDelete) {
        try {
          await createHRNotification(
            "deleted",
            "Starter Checklist",
            checklistToDelete.payrollNumber || "Starter Checklist",
            checklistId,
            checklistToDelete,
            undefined
          )
        } catch (notificationError) {
          console.warn("Failed to create notification:", notificationError)
        }
      }
    } catch (error) {
      console.error("Error deleting starter checklist:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to delete starter checklist" })
      throw error
    }
  }

  // Permission function
  const checkPermission = (module: string, resource: string, action: "view" | "edit" | "delete"): boolean => {
    // Use the permission system from CompanyContext
    return hasPermission(module, resource, action)
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: HRContextType = useMemo(() => ({
    state,
    dispatch,
    getHRSettingsBasePath,
    loadHRSettingsSection,
    saveHRSettingsSection,
    loadHRIntegrations,
    saveHRIntegration,
    loadHREmployeeDefaults,
    saveHREmployeeDefaults,
    loadHRPayrollSettings,
    saveHRPayrollSettings,
    refreshEmployees,
    refreshRoles,
    refreshDepartments,
    refreshTrainings,
    refreshTimeOffs,
    refreshWarnings,
    refreshAttendances,
    refreshComplianceTasks,
    refreshAnnouncements,
    refreshJobs,
    refreshCandidates,
    refreshInterviews,
    refreshPayrolls,
    refreshPerformanceReviews,
    refreshPerformanceReviewTemplates,
    refreshSchedules,
    refreshContracts,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addRole,
    updateRole,
    deleteRole,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addTraining,
    updateTraining,
    deleteTraining,
    addTimeOff,
    updateTimeOff,
    deleteTimeOff,
    addWarning,
    updateWarning,
    deleteWarning,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    addComplianceTask,
    updateComplianceTask,
    deleteComplianceTask,
    addJob,
    updateJob,
    deleteJob,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addInterview,
    updateInterview,
    deleteInterview,
    getEmployeeTrainings,
    getEmployeeTimeOffs,
    getEmployeeWarnings,
    getEmployeeAttendances,
    // Employee invitation
    generateJoinCode,
    getEmployeeInvites,
    revokeInvite,
    // Benefits management
    fetchBenefits,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    fetchEmployeeBenefits,
    assignBenefitToEmployee,
    updateEmployeeBenefit,
    removeEmployeeBenefit,
    addPayroll,
    updatePayroll,
    deletePayroll,
    updatePayrollRecord,
    deletePayrollRecord,
    addPerformanceReview,
    updatePerformanceReview,
    deletePerformanceReview,
    createPerformanceReviewTemplate,
    updatePerformanceReviewTemplate,
    deletePerformanceReviewTemplate,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    // Contract management
    fetchContractTemplates,
    createContractTemplate,
    updateContractTemplate,
    deleteContractTemplate,
    addContract: createContract,
    createContract,
    updateContract,
    deleteContract,
    initializeDefaultContractTemplates,
    // Permission functions
    hasPermission: checkPermission,
    // Generic HR action handler for operations not yet implemented as specific functions
    handleHRAction: async (params: HRActionParams) => {
      const { companyId, siteId, action, entity, id, data } = params;
      const basePath = `companies/${companyId}/sites/${siteId}`;
      return await handleHRAction(basePath, action, entity, id, data);
    },
    // Permission functions - Owner has full access
    canViewHR: () => checkPermission("hr", "employees", "view"),
    canEditHR: () => checkPermission("hr", "employees", "edit"),
    canDeleteHR: () => checkPermission("hr", "employees", "delete"),
    isOwner: () => checkPermission("hr", "employees", "delete"), // Simplified for now
    // Event management functions
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEventRSVPs,
    createEventRSVP,
    updateEventRSVP,
    // Expense management functions
    refreshExpenseReports,
    createExpenseReport,
    updateExpenseReport,
    deleteExpenseReport,
    // Diversity and inclusion functions
    refreshDiversityInitiatives,
    createDiversityInitiative,
    updateDiversityInitiative,
    deleteDiversityInitiative,
    refreshDiversitySurveys,
    createDiversitySurvey,
    updateDiversitySurvey,
    deleteDiversitySurvey,
    // Starter checklist functions
    refreshStarterChecklists,
    createStarterChecklist,
    updateStarterChecklist,
    deleteStarterChecklist,
    // Announcement functions
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
  }), [
    state,
    dispatch,
    getHRSettingsBasePath,
    loadHRSettingsSection,
    saveHRSettingsSection,
    loadHRIntegrations,
    saveHRIntegration,
    loadHREmployeeDefaults,
    saveHREmployeeDefaults,
    loadHRPayrollSettings,
    saveHRPayrollSettings,
    refreshEmployees,
    refreshRoles,
    refreshDepartments,
    refreshTrainings,
    refreshTimeOffs,
    refreshWarnings,
    refreshAttendances,
    refreshComplianceTasks,
    refreshAnnouncements,
    refreshJobs,
    refreshCandidates,
    refreshInterviews,
    refreshPayrolls,
    refreshPerformanceReviews,
    refreshPerformanceReviewTemplates,
    refreshSchedules,
    refreshContracts,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addRole,
    updateRole,
    deleteRole,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addTraining,
    updateTraining,
    deleteTraining,
    addTimeOff,
    updateTimeOff,
    deleteTimeOff,
    addWarning,
    updateWarning,
    deleteWarning,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    addComplianceTask,
    updateComplianceTask,
    deleteComplianceTask,
    addJob,
    updateJob,
    deleteJob,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addInterview,
    updateInterview,
    deleteInterview,
    getEmployeeTrainings,
    getEmployeeTimeOffs,
    getEmployeeWarnings,
    getEmployeeAttendances,
    generateJoinCode,
    getEmployeeInvites,
    revokeInvite,
    fetchBenefits,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    fetchEmployeeBenefits,
    assignBenefitToEmployee,
    updateEmployeeBenefit,
    removeEmployeeBenefit,
    addPayroll,
    updatePayroll,
    deletePayroll,
    updatePayrollRecord,
    deletePayrollRecord,
    addPerformanceReview,
    updatePerformanceReview,
    deletePerformanceReview,
    createPerformanceReviewTemplate,
    updatePerformanceReviewTemplate,
    deletePerformanceReviewTemplate,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    fetchContractTemplates,
    createContractTemplate,
    createContract,
    updateContract,
    initializeDefaultContractTemplates,
    checkPermission,
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEventRSVPs,
    createEventRSVP,
    updateEventRSVP,
    refreshExpenseReports,
    createExpenseReport,
    updateExpenseReport,
    deleteExpenseReport,
    refreshDiversityInitiatives,
    createDiversityInitiative,
    updateDiversityInitiative,
    deleteDiversityInitiative,
    refreshDiversitySurveys,
    createDiversitySurvey,
    updateDiversitySurvey,
    deleteDiversitySurvey,
    refreshStarterChecklists,
    createStarterChecklist,
    updateStarterChecklist,
    deleteStarterChecklist,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
  ])

  // Reset warning flag when provider mounts (so real issues can be detected)
  React.useEffect(() => {
    // Reset any warning tracking
  }, [])

  return (
    <HRContext.Provider value={contextValue}>
      {children}
    </HRContext.Provider>
  )
}

// Custom hook to use the HR context - graceful handling when not loaded

export const useHR = (): HRContextType => {
  const context = useContext(HRContext)
  if (context === undefined) {
    // Return a safe default context instead of throwing error
    // This allows components to render even when HR module isn't loaded yet
    // Keep console quiet during initial render.
    
    // Return a safe default context with proper structure
    const emptyState: HRState = {
      employees: [],
      roles: [],
      departments: [],
      trainings: [],
      timeOffs: [],
      warnings: [],
      attendances: [],
      attendanceRecords: [],
      complianceTasks: [],
      announcements: [],
      jobs: [],
      jobPostings: [],
      candidates: [],
      interviews: [],
      payrollRecords: [],
      performanceReviews: [],
      performanceReviewTemplates: [],
      trainingPrograms: [],
      schedules: [],
      contracts: [],
      contractTemplates: [],
      benefits: [],
      events: [],
      employeeBenefits: [],
      expenseReports: [],
      starterChecklists: [],
      incentives: [],
      venueBattles: [],
      diversityInitiatives: [],
      diversitySurveys: [],
      isLoading: false,
      error: null,
      initialized: false,
    }
    
    const emptyContext: HRContextType = {
      state: emptyState,
      dispatch: () => {},
      getHRSettingsBasePath: () => null,
      loadHRSettingsSection: async () => null,
      saveHRSettingsSection: async () => {},
      loadHRIntegrations: async () => ({}),
      saveHRIntegration: async () => {},
      loadHREmployeeDefaults: async () => null,
      saveHREmployeeDefaults: async () => {},
      loadHRPayrollSettings: async () => null,
      saveHRPayrollSettings: async () => {},
      canViewHR: () => false,
      canEditHR: () => false,
      canDeleteHR: () => false,
      isOwner: () => false,
      refreshEmployees: async () => {},
      refreshRoles: async () => {},
      refreshDepartments: async () => {},
      refreshTrainings: async () => {},
      refreshTimeOffs: async () => {},
      refreshWarnings: async () => {},
      refreshAttendances: async () => {},
      refreshComplianceTasks: async () => {},
      refreshAnnouncements: async () => {},
      refreshJobs: async () => {},
      refreshCandidates: async () => {},
      refreshInterviews: async () => {},
      refreshPayrolls: async () => {},
      refreshPerformanceReviews: async () => {},
      refreshPerformanceReviewTemplates: async () => {},
      refreshSchedules: async () => {},
      refreshContracts: async () => {},
      addEmployee: async () => null,
      updateEmployee: async () => null,
      deleteEmployee: async () => false,
      addRole: async () => null,
      updateRole: async () => null,
      deleteRole: async () => false,
      addDepartment: async () => null,
      updateDepartment: async () => null,
      deleteDepartment: async () => false,
      addTraining: async () => null,
      updateTraining: async () => null,
      deleteTraining: async () => false,
      addTimeOff: async () => null,
      updateTimeOff: async () => null,
      deleteTimeOff: async () => false,
      addWarning: async () => null,
      updateWarning: async () => null,
      deleteWarning: async () => false,
      addAttendance: async () => null,
      updateAttendance: async () => null,
      deleteAttendance: async () => false,
      addComplianceTask: async () => null,
      updateComplianceTask: async () => null,
      deleteComplianceTask: async () => false,
      addAnnouncement: async () => null,
      updateAnnouncement: async () => null,
      deleteAnnouncement: async () => false,
      addJob: async () => null,
      updateJob: async () => null,
      deleteJob: async () => false,
      addCandidate: async () => null,
      updateCandidate: async () => null,
      deleteCandidate: async () => false,
      addInterview: async () => null,
      updateInterview: async () => null,
      deleteInterview: async () => false,
      addPayroll: async () => null,
      updatePayroll: async () => null,
      deletePayroll: async () => false,
      updatePayrollRecord: async () => null,
      deletePayrollRecord: async () => false,
      addPerformanceReview: async () => null,
      updatePerformanceReview: async () => null,
      deletePerformanceReview: async () => false,
      createPerformanceReviewTemplate: async () => null,
      updatePerformanceReviewTemplate: async () => null,
      deletePerformanceReviewTemplate: async () => false,
      addSchedule: async () => null,
      updateSchedule: async () => null,
      deleteSchedule: async () => false,
      addContract: async () => null,
      createContract: async () => null,
      updateContract: async () => null,
      deleteContract: async () => false,
      updateContractTemplate: async () => null,
      deleteContractTemplate: async () => false,
      createContractTemplate: async () => null,
      fetchContractTemplates: async () => [],
      initializeDefaultContractTemplates: async () => {},
      createBenefit: async () => null,
      updateBenefit: async () => null,
      deleteBenefit: async () => false,
      fetchBenefits: async () => [],
      fetchEmployeeBenefits: async () => [],
      getEmployeeTrainings: async () => [],
      getEmployeeTimeOffs: async () => [],
      getEmployeeWarnings: async () => [],
      getEmployeeAttendances: async () => [],
      generateJoinCode: async () => "",
      getEmployeeInvites: async () => null,
      revokeInvite: async () => {},
      hasPermission: () => false,
      handleHRAction: async () => null,
      refreshEvents: async () => {},
      fetchEventRSVPs: async () => [],
      createEventRSVP: async () => null,
      updateEventRSVP: async () => {},
      refreshExpenseReports: async () => {},
      refreshDiversityInitiatives: async () => {},
      createDiversityInitiative: async () => null,
      updateDiversityInitiative: async () => {},
      deleteDiversityInitiative: async () => {},
      refreshDiversitySurveys: async () => {},
      createDiversitySurvey: async () => null,
      updateDiversitySurvey: async () => {},
      deleteDiversitySurvey: async () => {},
      refreshStarterChecklists: async () => {},
      createEvent: async () => null,
      updateEvent: async () => { return; },
      deleteEvent: async () => { return; },
      assignBenefitToEmployee: async () => null,
      updateEmployeeBenefit: async () => null,
      removeEmployeeBenefit: async () => false,
      createExpenseReport: async () => null,
      updateExpenseReport: async () => {},
      deleteExpenseReport: async () => {},
      createStarterChecklist: async () => null,
      updateStarterChecklist: async () => {},
      deleteStarterChecklist: async () => {},
    }
    
    return emptyContext
  }
  return context
}

// Export alias for frontend compatibility
export const useHRContext = useHR
