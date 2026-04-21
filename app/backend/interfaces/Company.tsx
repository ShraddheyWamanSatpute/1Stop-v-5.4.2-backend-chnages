// Re-export everything from Company.ts for backward compatibility
export * from "./Company"

// Keep the original interfaces here as well for any components that import from .tsx
export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface Contact {
  phone: string
  email: string
  website?: string
}

export interface Business {
  taxId: string
  registrationNumber: string
  industry: string
  businessType: string
}

export interface Branding {
  logo: string
  primaryColor: string
  secondaryColor: string
}

export interface Settings {
  currency: string
  timezone: string
  dateFormat: string
  fiscalYearStart: string
  enableNotifications: boolean
  enableMultiLocation: boolean
  workingDays: string[]
  workingHours: {
    start: string
    end: string
  }
}

export interface CompanySetup {
  id: string
  name: string
  legalName: string
  address: Address
  contact: Contact
  business: Business
  settings: Settings
  branding: Branding
  companyType: "hospitality" | "supplier" | "other"
  // Additional company details
  registrationDetails?: {
    registrationNumber?: string
    taxId?: string
    vatNumber?: string
    incorporationDate?: number
    registrationCountry?: string
  }
  financialDetails?: {
    currency: string
    paymentTerms?: string
    creditLimit?: number
    bankDetails?: {
      bankName?: string
      accountNumber?: string
      sortCode?: string
      iban?: string
      swift?: string
    }
  }
  contactPersons?: {
    primary?: {
      name: string
      email: string
      phone: string
      role: string
    }
    billing?: {
      name: string
      email: string
      phone: string
    }
    technical?: {
      name: string
      email: string
      phone: string
    }
  }
  contractSettings?: {
    defaultTemplateId?: string
    autoGenerateOnCreation?: boolean
  }
  createdAt: number
  updatedAt?: number
}

// Merged from Site.tsx
export interface DataSourceConfig {
  sites: string[]
  subsites: string[]
}

export interface SiteDataConfig {
  accessibleModules: {
    [key: string]: "company" | "site" | "subsite"
  }
  accessibleSites: string[]
  accessibleSubsites: string[]
}

export interface Site {
  siteID: string
  name: string
  description: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  isMainSite?: boolean
  subsites?: Record<string, Subsite>
  teams: Record<string, Team>
  createdAt: number
  updatedAt: number
  dataManagement?: SiteDataConfig
}

export interface Subsite {
  subsiteID: string
  name: string
  description: string
  location: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  teams: Record<string, Team>
  createdAt: number
  updatedAt: number
  dataManagement?: SiteDataConfig
}

export interface Team {
  teamID: string
  name: string
  description: string
  members: string[]
  createdAt: number
  updatedAt: number
}

// Merged from Permissions.tsx
export interface Permission {
  view: boolean
  edit: boolean
  delete: boolean
}

export interface PagePermissions {
  [pageName: string]: Permission
}

export interface ModulePermissions {
  [moduleName: string]: PagePermissions
}

export interface UserPermissions {
  modules: ModulePermissions
}

export interface RolePermissions {
  [roleName: string]: UserPermissions
}

export interface DepartmentPermissions {
  [departmentName: string]: UserPermissions
}

export interface CompanyPermissions {
  // Global default permissions applied to all users (independent of role/department)
  defaultPermissions?: UserPermissions
  roles: RolePermissions
  departments: DepartmentPermissions
  // Optional metadata for roles (e.g. whether role permissions apply)
  rolesMeta?: Record<string, { active?: boolean }>
  // Optional metadata for departments (e.g. whether department permissions apply)
  departmentsMeta?: Record<string, { active?: boolean }>
  // Optional user-specific overrides stored as boolean arrays (view/edit/delete per page)
  users?: Record<string, boolean[]>
  // Optional metadata for user overrides (e.g. whether user overrides apply)
  usersMeta?: Record<string, { active?: boolean }>
  // Optional employee-specific overrides stored as full permission objects (separate from users)
  employees?: Record<string, UserPermissions>
  // Optional metadata for employee overrides (e.g. whether employee overrides apply)
  employeesMeta?: Record<string, { active?: boolean }>
  defaultRole: string
  defaultDepartment: string
}

export interface CompanyChecklist {
  id: string
  title: string
  description: string
  items: ChecklistItem[]
  sections: ChecklistSection[]
  assignedTo: string[]
  assignedToTeams: string[]
  category: string
  isGlobalAccess: boolean
  // NEW FIELDS for site association
  siteId?: string
  subsiteId?: string
  schedule: {
    type: "once" | "daily" | "weekly" | "monthly" | "yearly" | "continuous" | "4week"
    repeatDays?: {
      monday: boolean
      tuesday: boolean
      wednesday: boolean
      thursday: boolean
      friday: boolean
      saturday: boolean
      sunday: boolean
    }
    openingDay?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    closingDay?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    openingDate?: number
    closingDate?: number
    openingTime?: string
    closingTime?: string
    timezone?: string
    // Used by 4-week schedules (epoch ms). Also supported by some legacy schedules.
    startDate?: number
    daysOfWeek?: number[]
    startTime?: string
    endTime?: string
    // Expiration window after closing time (hours).
    // UI + downstream logic treats this as hours; keep legacy numeric values compatible.
    expireTime?: number
    // Legacy field (epoch ms) used by some older logic paths.
    dueTime?: number
  }
  tracking: {
    requireNotes: boolean
    requireSignature: boolean
    requirePhotos: boolean
    requireLocation: boolean
  }
  status: "active" | "draft" | "archived"
  createdBy: string
  createdAt: number
  updatedAt: number
  assignments?: {
    roles: string[]
    departments: string[]
    employees: string[]
  }
}

export interface ChecklistSection {
  sectionType: string
  id: string
  title: string
  description?: string
  items: ChecklistItem[]
  order: number
}

export interface ChecklistItem {
  validation?: any
  id: string
  title: string
  description?: string
  type: "checkbox" | "text" | "number" | "date" | "file" | "signature" | "multiple_entry" | "yesno" | "photo"
  required: boolean
  options?: any
}

export interface EntryField {
  id: string
  label: string
  type: "text" | "number" | "date" | "checkbox" | "select"
  required: boolean
  options?: string[]
}

export interface ItemResponse {
  itemId: string
  type: "yesno" | "number" | "text" | "photo" | "checkbox" | "file" | "multiple_entry"
  value: any
  completed: boolean
  photos?: string[]
  isOutOfRange?: boolean
  warningLevel?: "normal" | "warning" | "critical"
  explanation?: string
}

export interface MultipleEntryResponse {
  id: string
  [key: string]: any
}

export interface ChecklistCompletion {
  id: string
  checklistId: string
  completedBy: string
  completedAt: number
  startedAt?: number
  status: "completed" | "in_progress" | "overdue" | "late" | "expired"
  responses: Record<string, ItemResponse>
  scheduledFor?: number
  notes?: string
  overallNotes?: string
  signature?: string
  completionScore?: number
  isLate?: boolean
}

export interface CompanyMessage {
  id: string
  title: string
  content: string
  type: "announcement" | "alert" | "reminder"
  priority: "low" | "medium" | "high"
  targetAudience: {
    roles?: string[]
    departments?: string[]
    employees?: string[]
  }
  createdBy: string
  createdAt: number
  updatedAt: number
  expiresAt?: number
  isActive: boolean
}

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  firstName?: string
  lastName?: string
  phone?: string
  department?: string
  role?: string
  joinedAt?: number
  lastLogin?: number
  settings?: {
    theme: "light" | "dark" | "system"
    notifications: boolean
    language: string
  }
  updatedAt?: number
}

// Additional interfaces from functions/Company.tsx
export interface ChecklistSchedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'continuous' | '4week'
  repeatDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }
  openingDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  closingDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  openingDate?: number
  closingDate?: number
  openingTime: string
  closingTime: string
  timezone?: string
}

export interface SiteInvite {
  id: string
  email: string
  companyID: string
  companyName: string
  siteId: string
  siteName: string
  subsiteId?: string
  subsiteName?: string
  role: string
  department: string
  invitedBy: string
  invitedByName: string
  invitedAt: number
  expiresAt: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  code: string
  inviteID?: string
}

export interface CompanyInvite {
  id: string
  inviteID: string
  code: string
  email: string
  companyID: string
  companyName: string
  role: string
  department: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedBy: string
  invitedByName?: string
  invitedAt: number
  expiresAt: number
  acceptedAt?: number
  acceptedBy?: string
}

export interface DataManagementConfig {
  stock: "company" | "site" | "subsite"
  hr: "company" | "site" | "subsite"
  finance: "company" | "site" | "subsite"
  bookings: "company" | "site" | "subsite"
  pos: "company" | "site" | "subsite"
  messenger: "company" | "site" | "subsite"
  supply: "company" | "site" | "subsite"
}

export interface ExtendedCompany {
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
  companyType: "hospitality" | "supplier" | "other"
  companyStatus: string
  companyCreated: string | number
  companyUpdated: string | number
  permissions: CompanyPermissions
  dataManagement: DataManagementConfig
  joinCode?: string
  joinCodeExpiry?: number
  // Contract management
  contractTemplates?: Record<string, ContractTemplate>
  activeContractId?: string
}

export interface ContractTemplate {
  id: string
  name: string
  description?: string
  templateContent: string // HTML or markdown content
  variables: ContractVariable[] // Placeholder variables like {{companyName}}, {{date}}, etc.
  isDefault: boolean
  createdAt: number
  updatedAt?: number
  createdBy: string
}

export interface ContractVariable {
  key: string
  label: string
  type: "text" | "date" | "number" | "currency" | "boolean"
  defaultValue?: string
  required: boolean
}

export interface CompanyContract {
  id: string
  companyId: string
  templateId: string
  contractNumber: string
  status: "draft" | "active" | "expired" | "terminated"
  signedDate?: number
  startDate: number
  endDate?: number
  terms: Record<string, any> // Variable values filled in
  pdfUrl?: string
  createdAt: number
  updatedAt?: number
  createdBy: string
  signedBy?: string
}

export interface ChecklistMetrics {
  totalChecklists: number
  completedOnTime: number
  completedLate: number
  overdue: number
  completionRate: number
  averageScore: number
  streakCount: number
}

// Permission array mapping for boolean arrays
export const PERMISSION_MODULES = [
  'stock.dashboard', 'stock.items', 'stock.categories', 'stock.suppliers', 'stock.orders', 'stock.counts', 'stock.reports',
  'pos.dashboard', 'pos.orders', 'pos.menu', 'pos.devices', 'pos.payments', 'pos.discounts', 'pos.categories', 'pos.locations', 'pos.settings',
  'hr.dashboard', 'hr.employees', 'hr.departments', 'hr.roles', 'hr.payroll', 'hr.attendance', 'hr.performance', 'hr.recruitment', 'hr.training',
  'finance.dashboard', 'finance.accounts', 'finance.transactions', 'finance.invoices', 'finance.expenses', 'finance.budgets', 'finance.reports', 'finance.taxes',
  'bookings.dashboard', 'bookings.calendar', 'bookings.reservations', 'bookings.customers', 'bookings.tables', 'bookings.settings',
  'messenger.dashboard', 'messenger.chats', 'messenger.contacts', 'messenger.groups', 'messenger.settings',
  'checklists.dashboard', 'checklists.view', 'checklists.create', 'checklists.edit', 'checklists.complete', 'checklists.reports',
  // Append-only to preserve legacy boolean-array indexing
  'dashboard.dashboard',
  'finance.forecasting',
  'supply.dashboard', 'supply.clients', 'supply.orders', 'supply.deliveries', 'supply.reports', 'supply.settings'
];

export const COMPANY_PERMISSION_KEY_ALIASES: Record<string, string> = {
  dashboard: "setup",
  info: "setup",
  siteManagement: "setup",
  checklists: "checklist",
  myChecklists: "checklist",
};

// Default permission structure
export const DEFAULT_PERMISSIONS: CompanyPermissions = {
  defaultPermissions: { modules: {} },
  roles: {
    admin: {
      modules: {
        dashboard: {
          dashboard: { view: true, edit: true, delete: true },
        },
        stock: {
          dashboard: { view: true, edit: true, delete: true },
          items: { view: true, edit: true, delete: true },
          categories: { view: true, edit: true, delete: true },
          suppliers: { view: true, edit: true, delete: true },
          orders: { view: true, edit: true, delete: true },
          counts: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
        },
        pos: {
          dashboard: { view: true, edit: true, delete: true },
          orders: { view: true, edit: true, delete: true },
          menu: { view: true, edit: true, delete: true },
          items: { view: true, edit: true, delete: true },
          tillscreens: { view: true, edit: true, delete: true },
          bills: { view: true, edit: true, delete: true },
          floorplan: { view: true, edit: true, delete: true },
          devices: { view: true, edit: true, delete: true },
          payments: { view: true, edit: true, delete: true },
          discounts: { view: true, edit: true, delete: true },
          promotions: { view: true, edit: true, delete: true },
          groups: { view: true, edit: true, delete: true },
          categories: { view: true, edit: true, delete: true },
          locations: { view: true, edit: true, delete: true },
          tables: { view: true, edit: true, delete: true },
          courses: { view: true, edit: true, delete: true },
          usage: { view: true, edit: true, delete: true },
          corrections: { view: true, edit: true, delete: true },
          tickets: { view: true, edit: true, delete: true },
          bagcheck: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          management: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
        },
        hr: {
          dashboard: { view: true, edit: true, delete: true },
          employees: { view: true, edit: true, delete: true },
          payroll: { view: true, edit: true, delete: true },
          timeoff: { view: true, edit: true, delete: true },
          performance: { view: true, edit: true, delete: true },
          recruitment: { view: true, edit: true, delete: true },
          training: { view: true, edit: true, delete: true },
          expenses: { view: true, edit: true, delete: true },
          incentives: { view: true, edit: true, delete: true },
          risk: { view: true, edit: true, delete: true },
          analytics: { view: true, edit: true, delete: true },
        },
        supply: {
          dashboard: { view: true, edit: true, delete: true },
          clients: { view: true, edit: true, delete: true },
          orders: { view: true, edit: true, delete: true },
          deliveries: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
        },
        bookings: {
          dashboard: { view: true, edit: true, delete: true },
          calendar: { view: true, edit: true, delete: true },
          list: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
          tables: { view: true, edit: true, delete: true },
        },
        finance: {
          dashboard: { view: true, edit: true, delete: true },
          accounting: { view: true, edit: true, delete: true },
          banking: { view: true, edit: true, delete: true },
          expenses: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          budgeting: { view: true, edit: true, delete: true },
          forecasting: { view: true, edit: true, delete: true },
        },
        messenger: {
          chat: { view: true, edit: true, delete: true },
          contacts: { view: true, edit: true, delete: true },
          groups: { view: true, edit: true, delete: true },
        },
        company: {
          setup: { view: true, edit: true, delete: true },
          permissions: { view: true, edit: true, delete: true },
          checklist: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: true },
          timeOff: { view: true, edit: true, delete: true },
          teamSchedule: { view: true, edit: true, delete: true },
          performance: { view: true, edit: true, delete: true },
          checklists: { view: true, edit: true, delete: true },
          myChecklists: { view: true, edit: true, delete: true },
        },
      },
    },
    manager: {
      modules: {
        dashboard: {
          dashboard: { view: true, edit: false, delete: false },
        },
        stock: {
          dashboard: { view: true, edit: true, delete: false },
          items: { view: true, edit: true, delete: false },
          categories: { view: true, edit: true, delete: false },
          suppliers: { view: true, edit: true, delete: false },
          orders: { view: true, edit: true, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: true, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: true, delete: false },
          items: { view: true, edit: true, delete: false },
          tillscreens: { view: true, edit: true, delete: false },
          bills: { view: true, edit: true, delete: false },
          floorplan: { view: true, edit: true, delete: false },
          devices: { view: true, edit: false, delete: false },
          payments: { view: true, edit: false, delete: false },
          discounts: { view: true, edit: true, delete: false },
          promotions: { view: true, edit: true, delete: false },
          groups: { view: true, edit: true, delete: false },
          categories: { view: true, edit: true, delete: false },
          locations: { view: true, edit: true, delete: false },
          tables: { view: true, edit: true, delete: false },
          courses: { view: true, edit: true, delete: false },
          usage: { view: true, edit: false, delete: false },
          corrections: { view: true, edit: true, delete: false },
          tickets: { view: true, edit: true, delete: false },
          bagcheck: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
          management: { view: true, edit: true, delete: false },
          settings: { view: true, edit: false, delete: false },
        },
        hr: {
          dashboard: { view: true, edit: true, delete: false },
          employees: { view: true, edit: true, delete: false },
          payroll: { view: true, edit: true, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: true, delete: false },
          recruitment: { view: true, edit: true, delete: false },
          training: { view: true, edit: true, delete: false },
          expenses: { view: true, edit: true, delete: false },
          incentives: { view: true, edit: true, delete: false },
          risk: { view: true, edit: true, delete: false },
          analytics: { view: true, edit: false, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: true, delete: false },
          calendar: { view: true, edit: true, delete: false },
          list: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
          settings: { view: true, edit: true, delete: false },
          tables: { view: true, edit: true, delete: false },
        },
        finance: {
          dashboard: { view: true, edit: true, delete: false },
          accounting: { view: true, edit: true, delete: false },
          banking: { view: true, edit: false, delete: false },
          expenses: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
          budgeting: { view: true, edit: true, delete: false },
          forecasting: { view: true, edit: true, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: true, delete: false },
          groups: { view: true, edit: true, delete: false },
        },
        company: {
          setup: { view: true, edit: false, delete: false },
          permissions: { view: false, edit: false, delete: false },
          checklist: { view: true, edit: true, delete: false },
          reports: { view: true, edit: true, delete: false },
          settings: { view: true, edit: false, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: true, edit: true, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
    supervisor: {
      modules: {
        dashboard: {
          dashboard: { view: true, edit: false, delete: false },
        },
        stock: {
          dashboard: { view: true, edit: false, delete: false },
          items: { view: true, edit: true, delete: false },
          categories: { view: true, edit: false, delete: false },
          suppliers: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: false, delete: false },
          items: { view: true, edit: false, delete: false },
          tillscreens: { view: true, edit: false, delete: false },
          bills: { view: true, edit: false, delete: false },
          floorplan: { view: true, edit: false, delete: false },
          devices: { view: true, edit: false, delete: false },
          payments: { view: true, edit: false, delete: false },
          discounts: { view: true, edit: false, delete: false },
          promotions: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
          categories: { view: true, edit: false, delete: false },
          locations: { view: true, edit: false, delete: false },
          tables: { view: true, edit: false, delete: false },
          courses: { view: true, edit: false, delete: false },
          usage: { view: true, edit: false, delete: false },
          corrections: { view: true, edit: false, delete: false },
          tickets: { view: true, edit: false, delete: false },
          bagcheck: { view: true, edit: false, delete: false },
          reports: { view: true, edit: false, delete: false },
          management: { view: true, edit: false, delete: false },
          settings: { view: true, edit: false, delete: false },
        },
        hr: {
          dashboard: { view: true, edit: false, delete: false },
          employees: { view: true, edit: false, delete: false },
          payroll: { view: false, edit: false, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: true, delete: false },
          recruitment: { view: false, edit: false, delete: false },
          training: { view: true, edit: true, delete: false },
          expenses: { view: true, edit: false, delete: false },
          incentives: { view: false, edit: false, delete: false },
          risk: { view: true, edit: false, delete: false },
          analytics: { view: true, edit: false, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: false, delete: false },
          calendar: { view: true, edit: true, delete: false },
          list: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
          settings: { view: true, edit: false, delete: false },
          tables: { view: true, edit: false, delete: false },
        },
        finance: {
          dashboard: { view: true, edit: false, delete: false },
          accounting: { view: false, edit: false, delete: false },
          banking: { view: false, edit: false, delete: false },
          expenses: { view: true, edit: false, delete: false },
          reports: { view: true, edit: false, delete: false },
          budgeting: { view: false, edit: false, delete: false },
          forecasting: { view: false, edit: false, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
        },
        company: {
          setup: { view: false, edit: false, delete: false },
          permissions: { view: false, edit: false, delete: false },
          checklist: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: false, edit: false, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
    staff: {
      modules: {
        dashboard: {
          dashboard: { view: true, edit: false, delete: false },
        },
        stock: {
          dashboard: { view: true, edit: false, delete: false },
          items: { view: true, edit: false, delete: false },
          categories: { view: true, edit: false, delete: false },
          suppliers: { view: false, edit: false, delete: false },
          orders: { view: true, edit: false, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: false, edit: false, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: false, delete: false },
          items: { view: true, edit: false, delete: false },
          tillscreens: { view: true, edit: false, delete: false },
          bills: { view: true, edit: false, delete: false },
          floorplan: { view: true, edit: false, delete: false },
          devices: { view: false, edit: false, delete: false },
          payments: { view: false, edit: false, delete: false },
          discounts: { view: true, edit: false, delete: false },
          promotions: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
          categories: { view: true, edit: false, delete: false },
          locations: { view: true, edit: false, delete: false },
          tables: { view: true, edit: false, delete: false },
          courses: { view: true, edit: false, delete: false },
          usage: { view: true, edit: false, delete: false },
          corrections: { view: true, edit: false, delete: false },
          tickets: { view: true, edit: false, delete: false },
          bagcheck: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          management: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        hr: {
          dashboard: { view: false, edit: false, delete: false },
          employees: { view: false, edit: false, delete: false },
          payroll: { view: false, edit: false, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: false, delete: false },
          recruitment: { view: false, edit: false, delete: false },
          training: { view: true, edit: false, delete: false },
          expenses: { view: false, edit: false, delete: false },
          incentives: { view: false, edit: false, delete: false },
          risk: { view: false, edit: false, delete: false },
          analytics: { view: false, edit: false, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: false, delete: false },
          calendar: { view: true, edit: true, delete: false },
          list: { view: true, edit: true, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
          tables: { view: true, edit: false, delete: false },
        },
        finance: {
          dashboard: { view: false, edit: false, delete: false },
          accounting: { view: false, edit: false, delete: false },
          banking: { view: false, edit: false, delete: false },
          expenses: { view: false, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          budgeting: { view: false, edit: false, delete: false },
          forecasting: { view: false, edit: false, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
        },
        company: {
          setup: { view: false, edit: false, delete: false },
          permissions: { view: false, edit: false, delete: false },
          checklist: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: false, edit: false, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
  },
  departments: {
    management: {
      modules: {
        stock: {
          dashboard: { view: true, edit: true, delete: true },
          items: { view: true, edit: true, delete: true },
          categories: { view: true, edit: true, delete: true },
          suppliers: { view: true, edit: true, delete: true },
          orders: { view: true, edit: true, delete: true },
          counts: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
        },
        pos: {
          dashboard: { view: true, edit: true, delete: true },
          orders: { view: true, edit: true, delete: true },
          menu: { view: true, edit: true, delete: true },
          devices: { view: true, edit: true, delete: true },
          payments: { view: true, edit: true, delete: true },
          discounts: { view: true, edit: true, delete: true },
          categories: { view: true, edit: true, delete: true },
          locations: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
        },
        hr: {
          dashboard: { view: true, edit: true, delete: true },
          employees: { view: true, edit: true, delete: true },
          payroll: { view: true, edit: true, delete: true },
          timeoff: { view: true, edit: true, delete: true },
          performance: { view: true, edit: true, delete: true },
          recruitment: { view: true, edit: true, delete: true },
          training: { view: true, edit: true, delete: true },
          analytics: { view: true, edit: true, delete: true },
        },
        bookings: {
          dashboard: { view: true, edit: true, delete: true },
          calendar: { view: true, edit: true, delete: true },
          list: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
          tables: { view: true, edit: true, delete: true },
        },
        finance: {
          dashboard: { view: true, edit: true, delete: true },
          accounting: { view: true, edit: true, delete: true },
          banking: { view: true, edit: true, delete: true },
          expenses: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          budgeting: { view: true, edit: true, delete: true },
          forecasting: { view: true, edit: true, delete: true },
        },
        messenger: {
          chat: { view: true, edit: true, delete: true },
          contacts: { view: true, edit: true, delete: true },
          groups: { view: true, edit: true, delete: true },
        },
        company: {
          setup: { view: true, edit: true, delete: true },
          permissions: { view: true, edit: true, delete: true },
          checklist: { view: true, edit: true, delete: true },
          reports: { view: true, edit: true, delete: true },
          settings: { view: true, edit: true, delete: true },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: true },
          timeOff: { view: true, edit: true, delete: true },
          teamSchedule: { view: true, edit: true, delete: true },
          performance: { view: true, edit: true, delete: true },
          checklists: { view: true, edit: true, delete: true },
          myChecklists: { view: true, edit: true, delete: true },
        },
      },
    },
    kitchen: {
      modules: {
        stock: {
          dashboard: { view: true, edit: false, delete: false },
          items: { view: true, edit: true, delete: false },
          categories: { view: true, edit: false, delete: false },
          suppliers: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: true, edit: false, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: true, delete: false },
          devices: { view: true, edit: false, delete: false },
          payments: { view: false, edit: false, delete: false },
          discounts: { view: false, edit: false, delete: false },
          categories: { view: true, edit: true, delete: false },
          locations: { view: true, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        hr: {
          dashboard: { view: false, edit: false, delete: false },
          employees: { view: false, edit: false, delete: false },
          payroll: { view: false, edit: false, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: false, delete: false },
          recruitment: { view: false, edit: false, delete: false },
          training: { view: true, edit: false, delete: false },
          analytics: { view: false, edit: false, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: false, delete: false },
          calendar: { view: true, edit: false, delete: false },
          list: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
          tables: { view: true, edit: false, delete: false },
        },
        finance: {
          dashboard: { view: false, edit: false, delete: false },
          accounting: { view: false, edit: false, delete: false },
          banking: { view: false, edit: false, delete: false },
          expenses: { view: false, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          budgeting: { view: false, edit: false, delete: false },
          forecasting: { view: false, edit: false, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
        },
        company: {
          setup: { view: false, edit: false, delete: false },
          permissions: { view: false, edit: false, delete: false },
          checklist: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: false, edit: false, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
    "front-of-house": {
      modules: {
        stock: {
          dashboard: { view: true, edit: false, delete: false },
          items: { view: true, edit: false, delete: false },
          categories: { view: true, edit: false, delete: false },
          suppliers: { view: false, edit: false, delete: false },
          orders: { view: true, edit: false, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: false, edit: false, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: false, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: false, delete: false },
          devices: { view: true, edit: false, delete: false },
          payments: { view: true, edit: false, delete: false },
          discounts: { view: true, edit: true, delete: false },
          categories: { view: true, edit: false, delete: false },
          locations: { view: true, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        hr: {
          dashboard: { view: false, edit: false, delete: false },
          employees: { view: false, edit: false, delete: false },
          payroll: { view: false, edit: false, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: false, delete: false },
          recruitment: { view: false, edit: false, delete: false },
          training: { view: true, edit: false, delete: false },
          analytics: { view: false, edit: false, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: false, delete: false },
          calendar: { view: true, edit: true, delete: false },
          list: { view: true, edit: true, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
          tables: { view: true, edit: true, delete: false },
        },
        finance: {
          dashboard: { view: false, edit: false, delete: false },
          accounting: { view: false, edit: false, delete: false },
          banking: { view: false, edit: false, delete: false },
          expenses: { view: false, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          budgeting: { view: false, edit: false, delete: false },
          forecasting: { view: false, edit: false, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: false, delete: false },
          groups: { view: true, edit: false, delete: false },
        },
        company: {
          setup: { view: false, edit: false, delete: false },
          permissions: { view: false, edit: false, delete: false },
          checklist: { view: true, edit: false, delete: false },
          reports: { view: false, edit: false, delete: false },
          settings: { view: false, edit: false, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: false, edit: false, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
    administration: {
      modules: {
        stock: {
          dashboard: { view: true, edit: true, delete: false },
          items: { view: true, edit: true, delete: false },
          categories: { view: true, edit: true, delete: false },
          suppliers: { view: true, edit: true, delete: false },
          orders: { view: true, edit: true, delete: false },
          counts: { view: true, edit: true, delete: false },
          reports: { view: true, edit: true, delete: false },
        },
        pos: {
          dashboard: { view: true, edit: true, delete: false },
          orders: { view: true, edit: true, delete: false },
          menu: { view: true, edit: true, delete: false },
          devices: { view: true, edit: true, delete: false },
          payments: { view: true, edit: true, delete: false },
          discounts: { view: true, edit: true, delete: false },
          categories: { view: true, edit: true, delete: false },
          locations: { view: true, edit: true, delete: false },
          settings: { view: true, edit: true, delete: false },
        },
        hr: {
          dashboard: { view: true, edit: true, delete: false },
          employees: { view: true, edit: true, delete: false },
          payroll: { view: true, edit: true, delete: false },
          timeoff: { view: true, edit: true, delete: false },
          performance: { view: true, edit: true, delete: false },
          recruitment: { view: true, edit: true, delete: false },
          training: { view: true, edit: true, delete: false },
          analytics: { view: true, edit: true, delete: false },
        },
        bookings: {
          dashboard: { view: true, edit: true, delete: false },
          calendar: { view: true, edit: true, delete: false },
          list: { view: true, edit: true, delete: false },
          reports: { view: true, edit: true, delete: false },
          settings: { view: true, edit: true, delete: false },
          tables: { view: true, edit: true, delete: false },
        },
        finance: {
          dashboard: { view: true, edit: true, delete: false },
          accounting: { view: true, edit: true, delete: false },
          banking: { view: true, edit: true, delete: false },
          expenses: { view: true, edit: true, delete: false },
          reports: { view: true, edit: true, delete: false },
          budgeting: { view: true, edit: true, delete: false },
          forecasting: { view: true, edit: true, delete: false },
        },
        messenger: {
          chat: { view: true, edit: true, delete: false },
          contacts: { view: true, edit: true, delete: false },
          groups: { view: true, edit: true, delete: false },
        },
        company: {
          setup: { view: true, edit: true, delete: false },
          permissions: { view: true, edit: true, delete: false },
          checklist: { view: true, edit: true, delete: false },
          reports: { view: true, edit: true, delete: false },
          settings: { view: true, edit: true, delete: false },
        },
        mobile: {
          payslips: { view: true, edit: true, delete: false },
          timeOff: { view: true, edit: true, delete: false },
          teamSchedule: { view: false, edit: false, delete: false },
          performance: { view: true, edit: true, delete: false },
          checklists: { view: true, edit: true, delete: false },
          myChecklists: { view: true, edit: true, delete: false },
        },
      },
    },
  },
  rolesMeta: {},
  departmentsMeta: {},
  users: {},
  usersMeta: {},
  employees: {},
  employeesMeta: {},
  defaultRole: "staff",
  defaultDepartment: "front-of-house",
}

// Duplicate interface definitions removed - all interfaces are already defined above

export type SiteDataConfigState = SiteDataConfig;

// Define the structure for invite form data
export interface SiteInviteForm {
  email: string;
  siteId: string;
  subsiteId?: string | null;
}

// Define the structure for site invite data
export interface SiteInviteData {
  email: string;
  role: string;
  department: string;
  invitedBy: string;
  companyName: string;
  siteName: string;
  invitedByName: string;
}

// Define the structure for login state
export interface LoginState {
  uid: string;
  // Add other properties as needed
}

// Define the structure for select event in MUI
export interface SelectChangeEvent {
  target: {
    value: unknown;
  };
}


export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

export interface ChecklistFormData {
  title: string
  description: string
  sections: ChecklistSection[]
  isGlobalAccess: boolean
  siteId: string
  subsiteId?: string
  assignedTo: string[]
  assignedToTeams: string[]
  // Legacy properties stored with underscores for UI compatibility
  _assignedSites: string[]
  _assignedSubsites: string[]
  schedule: {
    type: "once" | "daily" | "weekly" | "monthly" | "yearly"
    repeatDays?: {
      monday: boolean
      tuesday: boolean
      wednesday: boolean
      thursday: boolean
      friday: boolean
      saturday: boolean
      sunday: boolean
    }
    openingDay?: DayOfWeek
    closingDay?: DayOfWeek
    openingDate?: number
    closingDate?: number
    openingTime: string
    closingTime: string
    timezone: string
    startDate?: number
    expireTime?: number // Time in hours after due date when checklist expires
    dueTime?: number
  }
  status: "active" | "archived" | "draft"
  category: string
  tracking: {
    requireSignature: boolean
    requirePhotos: boolean
    requireNotes: boolean
    requireLocation: boolean
  }
}

export interface FilterState {
  search: string
  category: string
  status: string
  sortBy: "title" | "created" | "updated" | "category" | "section"
  sortOrder: "asc" | "desc"
}

// ========== HMRC PAYROLL SETTINGS (UK SPECIFIC) ==========

export interface HMRCSettings {
  // Configuration Level
  level?: "company" | "site" | "subsite" // Where these settings are configured
  configuredAt?: "company" | "site" | "subsite" // Actual location of settings
  
  // Employer Identification
  employerPAYEReference: string  // Format: ###/AB###### e.g., "123/AB45678"
  accountsOfficeReference: string // Format: ###PA######## e.g., "123PA00012345"  
  hmrcOfficeNumber: string // First 3 digits of PAYE ref e.g., "123"
  corporationTaxReference?: string // CT UTR
  vatRegistrationNumber?: string // VAT number if registered
  
  // HMRC Gateway Authentication (for RTI submissions)
  hmrcEnvironment: "sandbox" | "production" // Sandbox for testing, production for live
  hmrcClientId?: string // OAuth 2.0 client ID (encrypted)
  hmrcClientSecret?: string // OAuth 2.0 client secret (encrypted)
  lastHMRCAuthDate?: number // Last successful authentication
  hmrcAccessToken?: string // Current access token (encrypted, short-lived)
  hmrcRefreshToken?: string // Refresh token (encrypted)
  hmrcTokenExpiry?: number // When current token expires
  
  // Apprenticeship Levy
  isApprenticeshipLevyPayer: boolean // True if payroll > £3m annually
  apprenticeshipLevyAllowance: number // £15,000 for 2024/25
  apprenticeshipLevyRate: number // 0.5% (0.005)
  
  // Employment Allowance
  claimsEmploymentAllowance: boolean // Can claim up to £5,000/year
  employmentAllowanceAmount: number // £5,000 for 2024/25
  employmentAllowanceUsed: number // Amount used in current tax year
  connectedCompanies: string[] // List of connected company IDs (affects eligibility)
  
  // Payment Information
  hmrcPaymentDay: number // Day of month HMRC payment is made (usually 19th or 22nd)
  hmrcPaymentMethod: "bank_transfer" | "direct_debit" | "faster_payment"
  hmrcBankSortCode?: string // For HMRC payments
  hmrcBankAccountNumber?: string // For HMRC payments
  
  // Tronc Scheme (Hospitality)
  isRegisteredTroncOperator: boolean // Registered as independent tronc operator
  troncSchemeNumber?: string // HMRC tronc scheme reference
  troncOperatorName?: string // Name of troncmaster
  troncStartDate?: number // When tronc scheme started
  
  // Compliance & Audit
  lastFPSSubmissionDate?: number // Last Full Payment Submission
  lastEPSSubmissionDate?: number // Last Employer Payment Summary
  lastP11DSubmissionDate?: number // Last P11D submission (6 July deadline)
  currentTaxYear: string // e.g., "2024-25"
  fiscalYearEnd: string // Usually "05-04" (5th April)
  
  // RTI Submission Settings
  autoSubmitFPS: boolean // Automatically submit FPS after payroll approval
  requireFPSApproval: boolean // Require manual approval before FPS submission
  fpsSubmissionLeadTime: number // Days before payment date to submit FPS
  
  // Validation & Testing
  useSandboxForTesting: boolean // Use HMRC sandbox for testing
  lastSuccessfulFPSTest?: number // Last successful test submission
  lastSuccessfulEPSTest?: number // Last successful test submission
  
  // Pension Settings
  defaultPensionScheme?: string // Default pension provider
  defaultPensionSchemeReference?: string // PSTR
  autoEnrolmentPostponement: number // Months to postpone (0-3)
  postponementLetterSent: boolean // Track compliance
  
  // Year-End Settings
  yearEndRemindersSent: boolean // Track P60/P11D reminders
  p60GenerationDate?: number // When P60s were generated
  p11dGenerationDate?: number // When P11Ds were generated
  
  // Notifications
  notifyBeforeFPSDeadline: boolean // Send reminders before FPS due
  notifyBeforePaymentDeadline: boolean // Send reminders before HMRC payment due
  notificationLeadDays: number // Days in advance to notify
  notificationEmail?: string // Email for payroll notifications
  
  // Data Retention
  payrollRetentionYears: number // 6 years minimum for HMRC
  autoArchiveOldRecords: boolean // Automatically archive records after retention period
  
  // Settings timestamps
  createdAt: number
  updatedAt?: number
  lastReviewedDate?: number // When settings were last reviewed
  nextReviewDate?: number // When settings should be reviewed again
}

// ========== POS INTEGRATION SETTINGS ==========

/**
 * Lightspeed Retail Integration Settings
 * Note: This mirrors LightspeedSettings from pos-integration/types.ts for convenience
 */
export interface LightspeedIntegrationSettings {
  // Provider Identification
  provider: 'lightspeed'
  isEnabled: boolean
  isConnected: boolean
  connectedAt?: number
  lastSyncAt?: number
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  syncError?: string
  
  // OAuth 2.0 Credentials
  clientId?: string
  clientSecret?: string // Should be encrypted in production
  redirectUri: string
  
  // Token Storage
  accessToken?: string // Should be encrypted, short-lived
  refreshToken?: string // Should be encrypted
  tokenExpiry?: number // Unix timestamp (seconds)
  tokenType?: 'Bearer'
  
  // Store Information
  domainPrefix?: string // e.g., "example" from example.retail.lightspeed.app
  storeName?: string
  storeId?: string
  
  // Scope permissions granted
  scope?: string
  
  // OAuth State (for CSRF protection)
  oauthState?: string
  oauthStateExpiry?: number
  
  // Sync Configuration
  autoSyncEnabled: boolean
  autoSyncInterval: number // minutes
  syncProducts: boolean
  syncSales: boolean
  syncCustomers: boolean
  syncInventory: boolean
  
  // Field Mapping (for custom field mapping between systems)
  productMapping?: {
    name: string
    sku: string
    price: string
    cost: string
    category: string
    quantity: string
  }
  
  // Settings timestamps
  createdAt: number
  updatedAt?: number
}

/**
 * Base POS Integration Settings Interface
 * Use this for future POS integrations (Square, Toast, etc.)
 */
export interface POSIntegrationSettings {
  provider: 'lightspeed' | 'square' | 'toast' | 'revel' | 'custom'
  isEnabled: boolean
  isConnected: boolean
  connectedAt?: number
  lastSyncAt?: number
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  syncError?: string
  autoSyncEnabled: boolean
  autoSyncInterval: number
  createdAt: number
  updatedAt?: number
}

// Tax Year Configuration (updatable annually)
export interface TaxYearConfiguration {
  taxYear: string // "2024-25"
  effectiveFrom: number // Start of tax year (6 April)
  effectiveTo: number // End of tax year (5 April next year)
  
  // England & NI Tax Rates
  personalAllowance: number // £12,570 for 2024/25
  personalAllowanceMonthly: number // £1,047.50
  basicRateLimit: number // £50,270
  higherRateLimit: number // £125,140
  basicRate: number // 0.20 (20%)
  higherRate: number // 0.40 (40%)
  additionalRate: number // 0.45 (45%)
  
  // Scottish Tax Rates (S prefix tax codes)
  scottishStarterRate: number // 0.19 (19%)
  scottishBasicRate: number // 0.20 (20%)
  scottishIntermediateRate: number // 0.21 (21%)
  scottishHigherRate: number // 0.42 (42%)
  scottishTopRate: number // 0.47 (47%)
  scottishBands: {
    starterLimit: number
    basicLimit: number
    intermediateLimit: number
    higherLimit: number
  }
  
  // Welsh Tax Rates (C prefix tax codes)
  welshBasicRate: number // 0.20
  welshHigherRate: number // 0.40
  welshAdditionalRate: number // 0.45
  
  // National Insurance Thresholds & Rates
  niPrimaryThresholdAnnual: number // £12,570
  niPrimaryThresholdMonthly: number // £1,048
  niPrimaryThresholdWeekly: number // £242
  niUpperEarningsLimitAnnual: number // £50,270
  niUpperEarningsLimitMonthly: number // £4,189
  niUpperEarningsLimitWeekly: number // £967
  niPrimaryRate: number // 0.12 (12%) - between PT and UEL
  niPrimaryRateAboveUEL: number // 0.02 (2%) - above UEL
  
  // Employer NI
  niSecondaryThresholdAnnual: number // £9,100
  niSecondaryThresholdMonthly: number // £758
  niSecondaryThresholdWeekly: number // £175
  niEmployerRate: number // 0.138 (13.8%)
  
  // Apprentice NI (under 25)
  niApprenticeUpperSecondaryThresholdAnnual: number // £50,270
  niApprenticeRate: number // 0% below threshold
  
  // Student Loan Thresholds
  studentLoanPlan1ThresholdAnnual: number // £22,015
  studentLoanPlan2ThresholdAnnual: number // £27,295
  studentLoanPlan4ThresholdAnnual: number // £27,660 (Scotland)
  postgraduateLoanThresholdAnnual: number // £21,000
  studentLoanRate: number // 0.09 (9%)
  postgraduateLoanRate: number // 0.06 (6%)
  
  // Pension Auto-Enrolment
  autoEnrolmentLowerLimitAnnual: number // £6,240
  autoEnrolmentUpperLimitAnnual: number // £50,270
  autoEnrolmentEarningsThresholdAnnual: number // £10,000 (trigger threshold)
  minimumEmployeeContribution: number // 0.05 (5%)
  minimumEmployerContribution: number // 0.03 (3%)
  totalMinimumContribution: number // 0.08 (8%)
  
  // Statutory Payments (weekly rates)
  statutorySickPayWeekly: number // £116.75
  statutoryMaternityPayWeekly: number // £184.03 (standard rate)
  statutoryPaternityPayWeekly: number // £184.03
  statutoryAdoptionPayWeekly: number // £184.03
  statutorySharedParentalPayWeekly: number // £184.03
  statutoryParentalBereavementPayWeekly: number // £184.03
  smpHigherRate: number // 0.90 (90% of average earnings for first 6 weeks)
  
  // Other
  apprenticeshipLevyRate: number // 0.005 (0.5%)
  apprenticeshipLevyAllowance: number // £15,000
  apprenticeshipLevyThreshold: number // £3,000,000 annual payroll
  
  // Metadata
  isActive: boolean // Is this the current tax year
  createdAt: number
  updatedAt?: number
}