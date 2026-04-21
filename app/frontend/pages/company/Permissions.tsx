"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import {
  Autocomplete,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import {
  Security as SecurityIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Person as PersonIcon,
} from "@mui/icons-material"
import { useCompany, CompanyPermissions, UserPermissions } from "../../../backend/context/CompanyContext"
import { useHR } from "../../../backend/context/HRContext"
import { DEFAULT_PERMISSIONS as BASE_DEFAULT_PERMISSIONS, COMPANY_PERMISSION_KEY_ALIASES, PERMISSION_MODULES } from "../../../backend/interfaces/Company"
import type { Role, Department } from "../../../backend/interfaces/HRs"
import DataHeader from "../../components/reusable/DataHeader"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
const DEFAULT_PERMISSIONS: CompanyPermissions = BASE_DEFAULT_PERMISSIONS

type PermissionAction = "view" | "edit" | "delete"

type ModuleGroupDefinition = {
  key: string
  sourceKey: string
  title: string
  tabs: string[]
}

type ModuleDefinition = {
  label: string
  groups: ModuleGroupDefinition[]
}

const getPagePermissions = (
  moduleKey: string,
  modulePermissions: Record<string, Record<PermissionAction, boolean>> | undefined,
  sourceKey: string,
): Record<PermissionAction, boolean> | undefined => {
  if (!modulePermissions) return undefined
  // First check direct sourceKey
  const direct = modulePermissions[sourceKey]
  if (direct) return direct
  // For company module, check legacy key aliases
  if (moduleKey === "company") {
    const legacyKey = COMPANY_PERMISSION_KEY_ALIASES[sourceKey]
    if (legacyKey) {
      return modulePermissions[legacyKey]
    }
  }
  return undefined
}

const setModulePagePermissions = (
  moduleKey: string,
  modulePermissions: Record<string, Record<PermissionAction, boolean>>,
  sourceKey: string,
  value: Record<PermissionAction, boolean>,
) => {
  modulePermissions[sourceKey] = { ...value }
  if (moduleKey === "company") {
    const legacyKey = COMPANY_PERMISSION_KEY_ALIASES[sourceKey]
    if (legacyKey) {
      modulePermissions[legacyKey] = { ...value }
    }
  }
}

const MODULE_GROUP_DEFINITIONS: Record<string, ModuleDefinition> = {
        company: {
    label: "Company",
    groups: [
      {
        key: "company-dashboard",
        sourceKey: "dashboard",
        title: "Dashboard",
        tabs: ["Dashboard"],
      },
      {
        key: "company-info",
        sourceKey: "info",
        title: "Company Info",
        tabs: ["Company Info"],
      },
      {
        key: "company-site-management",
        sourceKey: "siteManagement",
        title: "Site Management",
        tabs: ["Site Management"],
      },
      {
        key: "company-permissions",
        sourceKey: "permissions",
        title: "Permissions",
        tabs: ["Permissions"],
      },
      {
        key: "company-checklists",
        sourceKey: "checklists",
        title: "Checklists",
        tabs: ["Checklists"],
      },
      {
        key: "company-my-checklists",
        sourceKey: "myChecklists",
        title: "My Checklists",
        tabs: ["My Checklists"],
      },
      {
        key: "company-user-allocation",
        sourceKey: "userAllocation",
        title: "User Allocation",
        tabs: ["User Allocation"],
      },
      {
        key: "company-checklist-history",
        sourceKey: "checklistHistory",
        title: "Checklist History",
        tabs: ["Checklist History"],
      },
      {
        key: "company-checklist-types",
        sourceKey: "checklistTypes",
        title: "Checklist Types",
        tabs: ["Checklist Types"],
      },
    ],
        },
        hr: {
    label: "Human Resources",
    groups: [
      { key: "hr-dashboard", sourceKey: "dashboard", title: "Dashboard", tabs: ["Dashboard"] },
      { key: "hr-employees", sourceKey: "employees", title: "Employees", tabs: ["Employees"] },
      { key: "hr-scheduling", sourceKey: "scheduling", title: "Scheduling", tabs: ["Scheduling"] },
      { key: "hr-timeoff", sourceKey: "timeoff", title: "Time Off", tabs: ["Time Off"] },
      { key: "hr-payroll", sourceKey: "payroll", title: "Payroll", tabs: ["Payroll"] },
      { key: "hr-selfservice", sourceKey: "selfservice", title: "Self Service", tabs: ["Employee Self Service"] },
      { key: "hr-performance", sourceKey: "performance", title: "Performance", tabs: ["Performance"] },
      { key: "hr-warnings", sourceKey: "warnings", title: "Warnings", tabs: ["Warnings"] },
      { key: "hr-recruitment", sourceKey: "recruitment", title: "Recruitment", tabs: ["Recruitment"] },
      { key: "hr-roles", sourceKey: "roles", title: "Roles", tabs: ["Roles"] },
      { key: "hr-departments", sourceKey: "departments", title: "Departments", tabs: ["Departments"] },
      { key: "hr-announcements", sourceKey: "announcements", title: "Announcements", tabs: ["Announcements"] },
      { key: "hr-benefits", sourceKey: "benefits", title: "Benefits", tabs: ["Benefits"] },
      { key: "hr-expenses", sourceKey: "expenses", title: "Expenses", tabs: ["Expenses"] },
      { key: "hr-compliance", sourceKey: "compliance", title: "Risk & Compliance", tabs: ["Risk & Compliance"] },
      { key: "hr-events", sourceKey: "events", title: "Events", tabs: ["Events"] },
      { key: "hr-diversity", sourceKey: "diversity", title: "Diversity & Inclusion", tabs: ["Diversity & Inclusion"] },
      { key: "hr-training", sourceKey: "training", title: "Training", tabs: ["Training"] },
      { key: "hr-analytics", sourceKey: "analytics", title: "Analytics", tabs: ["Analytics"] },
      { key: "hr-reports", sourceKey: "reports", title: "Reports", tabs: ["Reports"] },
      { key: "hr-settings", sourceKey: "settings", title: "Settings", tabs: ["Settings"] },
    ],
  },
  pos: {
    label: "Point of Sale",
    groups: [
      { key: "pos-dashboard", sourceKey: "dashboard", title: "Dashboard", tabs: ["Dashboard"] },
      { key: "pos-sales", sourceKey: "sales", title: "Item Sales", tabs: ["Item Sales"] },
      { key: "pos-bills", sourceKey: "bills", title: "Bills", tabs: ["Bills"] },
      { key: "pos-floorplan", sourceKey: "floorplan", title: "Floor Plan", tabs: ["Floor Plan"] },
      { key: "pos-items", sourceKey: "items", title: "Items", tabs: ["Items"] },
      { key: "pos-tillscreens", sourceKey: "tillscreens", title: "Till Screens", tabs: ["Till Screens"] },
      { key: "pos-tickets", sourceKey: "tickets", title: "Tickets", tabs: ["Tickets"] },
      { key: "pos-bagcheck", sourceKey: "bagcheck", title: "Bag Check", tabs: ["Bag Check"] },
      { key: "pos-management", sourceKey: "management", title: "Management", tabs: ["Management"] },
      { key: "pos-devices", sourceKey: "devices", title: "Devices", tabs: ["Devices"] },
      { key: "pos-locations", sourceKey: "locations", title: "Locations", tabs: ["Locations"] },
      { key: "pos-payments", sourceKey: "payments", title: "Payments", tabs: ["Payments"] },
      { key: "pos-groups", sourceKey: "groups", title: "Groups", tabs: ["Groups"] },
      { key: "pos-categories", sourceKey: "categories", title: "Categories", tabs: ["Categories"] },
      { key: "pos-tables", sourceKey: "tables", title: "Tables", tabs: ["Tables"] },
      { key: "pos-courses", sourceKey: "courses", title: "Courses", tabs: ["Courses"] },
      { key: "pos-usage", sourceKey: "usage", title: "Till Usage", tabs: ["Till Usage"] },
      { key: "pos-corrections", sourceKey: "corrections", title: "Corrections", tabs: ["Corrections"] },
      { key: "pos-discounts", sourceKey: "discounts", title: "Discounts", tabs: ["Discounts"] },
      { key: "pos-promotions", sourceKey: "promotions", title: "Promotions", tabs: ["Promotions"] },
      { key: "pos-reports", sourceKey: "reports", title: "Reports", tabs: ["Reports"] },
      { key: "pos-settings", sourceKey: "settings", title: "Settings", tabs: ["Settings"] },
    ],
        },
        bookings: {
    label: "Bookings",
    groups: [
      { key: "bookings-dashboard", sourceKey: "dashboard", title: "Dashboard", tabs: ["Dashboard"] },
      { key: "bookings-list", sourceKey: "list", title: "Bookings List", tabs: ["Bookings List"] },
      { key: "bookings-calendar", sourceKey: "calendar", title: "Calendar", tabs: ["Calendar"] },
      { key: "bookings-diary", sourceKey: "diary", title: "Diary", tabs: ["Diary"] },
      { key: "bookings-floorplan", sourceKey: "floorplan", title: "Floor Plan", tabs: ["Floor Plan"] },
      { key: "bookings-waitlist", sourceKey: "waitlist", title: "Waitlist", tabs: ["Waitlist"] },
      { key: "bookings-tables", sourceKey: "tables", title: "Tables", tabs: ["Tables"] },
      { key: "bookings-locations", sourceKey: "locations", title: "Locations", tabs: ["Locations"] },
      { key: "bookings-types", sourceKey: "types", title: "Booking Types", tabs: ["Booking Types"] },
      { key: "bookings-preorders", sourceKey: "preorders", title: "Preorder Profiles", tabs: ["Preorder Profiles"] },
      { key: "bookings-status", sourceKey: "status", title: "Status", tabs: ["Status"] },
      { key: "bookings-tags", sourceKey: "tags", title: "Tags", tabs: ["Tags"] },
      { key: "bookings-reports", sourceKey: "reports", title: "Reports", tabs: ["Reports"] },
      { key: "bookings-settings", sourceKey: "settings", title: "Settings", tabs: ["Settings"] },
    ],
        },
        finance: {
    label: "Finance",
    groups: [
      { key: "finance-dashboard", sourceKey: "dashboard", title: "Dashboard", tabs: ["Dashboard"] },
      { key: "finance-sales", sourceKey: "sales", title: "Sales", tabs: ["Sales"] },
      { key: "finance-banking", sourceKey: "banking", title: "Banking", tabs: ["Banking"] },
      { key: "finance-purchases", sourceKey: "purchases", title: "Purchases", tabs: ["Purchases"] },
      { key: "finance-expenses", sourceKey: "expenses", title: "Expenses", tabs: ["Expenses"] },
      { key: "finance-contacts", sourceKey: "contacts", title: "Contacts", tabs: ["Contacts"] },
      { key: "finance-accounting", sourceKey: "accounting", title: "Accounting", tabs: ["Accounting"] },
      { key: "finance-currency", sourceKey: "currency", title: "Currency", tabs: ["Currency"] },
      { key: "finance-budgeting", sourceKey: "budgeting", title: "Budgeting", tabs: ["Budgeting"] },
      { key: "finance-forecasting", sourceKey: "forecasting", title: "Forecasting", tabs: ["Forecasting"] },
      { key: "finance-reports", sourceKey: "reports", title: "Reports", tabs: ["Reports"] },
      { key: "finance-settings", sourceKey: "settings", title: "Settings", tabs: ["Settings"] },
    ],
  },
  stock: {
    label: "Stock",
    groups: [
      {
        key: "stock-dashboard",
        sourceKey: "dashboard",
        title: "Stock Dashboard",
        tabs: ["Dashboard"],
      },
      {
        key: "stock-items",
        sourceKey: "items",
        title: "Items & Categories",
        tabs: ["Items"],
      },
      {
        key: "stock-purchase-orders",
        sourceKey: "orders",
        title: "Purchase Orders",
        tabs: ["Purchase Orders"],
      },
      {
        key: "stock-counts",
        sourceKey: "counts",
        title: "Stock Counts",
        tabs: ["Stock Counts"],
      },
      {
        key: "stock-par-levels",
        sourceKey: "parlevels",
        title: "Par Levels",
        tabs: ["Par Levels"],
      },
      {
        key: "stock-management",
        sourceKey: "management",
        title: "Management",
        tabs: ["Management"],
      },
      {
        key: "stock-reports",
        sourceKey: "reports",
        title: "Reports",
        tabs: ["Reports"],
      },
      {
        key: "stock-settings",
        sourceKey: "settings",
        title: "Settings",
        tabs: ["Settings"],
      },
    ],
  },
  messenger: {
    label: "Messenger",
    groups: [
      {
        key: "messenger-chat",
        sourceKey: "chat",
        title: "Chats",
        tabs: ["Chats"],
      },
      {
        key: "messenger-contacts",
        sourceKey: "contacts",
        title: "Contacts",
        tabs: ["Contacts"],
      },
      {
        key: "messenger-groups",
        sourceKey: "groups",
        title: "Groups",
        tabs: ["Groups"],
      },
    ],
  },
  mobile: {
    label: "Mobile",
    groups: [
      {
        key: "mobile-payslips",
        sourceKey: "payslips",
        title: "Home: Payslips",
        tabs: ["Payslips"],
      },
      {
        key: "mobile-timeoff",
        sourceKey: "timeOff",
        title: "Home: Time off & holidays",
        tabs: ["Time Off"],
      },
      {
        key: "mobile-team-schedule",
        sourceKey: "teamSchedule",
        title: "Home: Team schedule",
        tabs: ["Team Schedule"],
      },
      {
        key: "mobile-performance",
        sourceKey: "performance",
        title: "Home: Performance",
        tabs: ["Performance"],
      },
      {
        key: "mobile-checklists",
        sourceKey: "checklists",
        title: "Mobile: Company checklists",
        tabs: ["Checklists"],
      },
      {
        key: "mobile-my-checklists",
        sourceKey: "myChecklists",
        title: "Mobile: My checklists",
        tabs: ["My Checklists"],
      },
    ],
  },
}

// Precompute expensive constants once (prevents lag on every render)
const MODULE_ENTRIES = Object.entries(MODULE_GROUP_DEFINITIONS)
const PERMISSION_KEYS = MODULE_ENTRIES.flatMap(([moduleKey, moduleDef]) =>
  moduleDef.groups.map((group) => ({ module: moduleKey, page: group.sourceKey })),
)

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
}

const formatLabel = (value: string): string =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
import RequireCompanyContext from "../../components/global/RequireCompanyContext"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permissions-tabpanel-${index}`}
      aria-labelledby={`permissions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const Permissions: React.FC = () => {
  const {
    state: companyState,
    hasPermission,
    updateRolePermissions,
    updateDepartmentPermissions,
    updateUserPermissions,
    updateDefaultRole,
    updateDefaultDepartment,
    updateDefaultPermissions,
    updateDepartmentPermissionsActive,
    updateRolePermissionsActive,
    updateUserPermissionsActive,
    updateEmployeePermissions,
    updateEmployeePermissionsActive,
    addRole: addCompanyRole,
    addDepartment: addCompanyDepartment,
    getCompanyUsers,
    refreshSites,
  } = useCompany()

  const hrContext = useHR()
  const { state: hrState, handleHRAction } = hrContext || {}
  
  // Check if HR provider is available (not just empty context)
  const hrProviderAvailable = hrContext && hrState && (hrState.initialized || hrState.roles?.length > 0 || hrState.departments?.length > 0)

  const [tabValue, setTabValue] = useState(0)
  const [permissions, setPermissions] = useState<CompanyPermissions>(DEFAULT_PERMISSIONS)
  const [users, setUsers] = useState<any[]>([])
  const employees = (hrState?.employees || [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Local state for roles and departments
  const [roles, setRoles] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  // Create stable string keys from HR data (only depend on length to prevent loops)
  const rolesKey = useMemo(() => {
    if (!hrState?.roles || hrState.roles.length === 0) return ""
    return hrState.roles.map(r => r.id || r.name || r.label || "").sort().join("|")
  }, [hrState?.roles?.length])
  
  const departmentsKey = useMemo(() => {
    if (!hrState?.departments || hrState.departments.length === 0) return ""
    return hrState.departments.map(d => d.id || d.name || "").sort().join("|")
  }, [hrState?.departments?.length])
  
  // UI visibility toggles removed per request


  // Helper to create a safe key for Firebase paths and permission maps
  const toKey = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")

  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  // Form states
  const [newRoleName, setNewRoleName] = useState("")
  const [newDepartmentName, setNewDepartmentName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userDepartment, setUserDepartment] = useState("")
  const [selectedDepartmentKey, setSelectedDepartmentKey] = useState<string>("")
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const isSelectedDepartmentActive = useMemo(() => {
    const key = selectedDepartmentKey
    if (!key) return true
    return permissions.departmentsMeta?.[key]?.active !== false
  }, [permissions.departmentsMeta, selectedDepartmentKey])

  const isSelectedRoleActive = useMemo(() => {
    const key = selectedRoleKey
    if (!key) return true
    return permissions.rolesMeta?.[key]?.active !== false
  }, [permissions.rolesMeta, selectedRoleKey])

  const isSelectedUserOverrideActive = useMemo(() => {
    const uid = selectedUserId
    if (!uid) return true
    return (permissions as any).usersMeta?.[uid]?.active !== false
  }, [permissions, selectedUserId])

  const isSelectedEmployeeOverrideActive = useMemo(() => {
    const id = selectedEmployeeId
    if (!id) return true
    return (permissions as any).employeesMeta?.[id]?.active !== false
  }, [permissions, selectedEmployeeId])


  // Check if user has permission to manage permissions using the permission system
  const canManagePermissions = hasPermission("company", "permissions", "edit")

  const convertArrayToPermissions = useCallback((permissionArray: boolean[] | undefined): UserPermissions => {
    const modules: any = {}
    let i = 0
    PERMISSION_MODULES.forEach((key) => {
      const [module, page] = String(key).split(".")
      if (!module || !page) return
      if (!modules[module]) modules[module] = {}
      const pageObj: Record<PermissionAction, boolean> = {
        view: Boolean(permissionArray?.[i++]),
        edit: Boolean(permissionArray?.[i++]),
        delete: Boolean(permissionArray?.[i++]),
      }
      setModulePagePermissions(module, modules[module], page, pageObj)
    })
    return { modules }
  }, [])

  const selectedUserPermissions = useMemo<UserPermissions>(() => {
    const uid = selectedUserId
    if (!uid) return { modules: {} }
    const userPerms = (permissions as any).users?.[uid]
    // Check if user permissions are stored as object format (new) or array format (legacy)
    let converted: UserPermissions
    if (Array.isArray(userPerms)) {
      // Legacy boolean array format
      converted = convertArrayToPermissions(userPerms)
    } else if (userPerms && typeof userPerms === 'object' && userPerms.modules) {
      // New object format
      converted = userPerms as UserPermissions
    } else {
      converted = { modules: {} }
    }
    // Ensure company module exists and initialize all company pages
    if (!converted.modules.company) {
      converted.modules.company = {}
    }
    const companyModule = converted.modules.company
    const companyDef = MODULE_GROUP_DEFINITIONS.company
    // Initialize all company module pages (not just those in PERMISSION_MODULES)
    if (companyDef) {
      companyDef.groups.forEach((group) => {
        // If page doesn't exist, initialize it with false values
        if (!companyModule[group.sourceKey]) {
          // Check if it exists under legacy key first
          const legacyKey = COMPANY_PERMISSION_KEY_ALIASES[group.sourceKey]
          if (legacyKey && companyModule[legacyKey]) {
            // Migrate from legacy key
            companyModule[group.sourceKey] = { ...companyModule[legacyKey] }
          } else {
            // Initialize with false values
            companyModule[group.sourceKey] = { view: false, edit: false, delete: false }
          }
        }
      })
    }
    // Migrate any remaining legacy keys to sourceKeys
    Object.entries(COMPANY_PERMISSION_KEY_ALIASES).forEach(([sourceKey, legacyKey]) => {
      if (companyModule[legacyKey] && !companyModule[sourceKey]) {
        companyModule[sourceKey] = { ...companyModule[legacyKey] }
      }
    })
    return converted
  }, [permissions, selectedUserId, convertArrayToPermissions])

  const setSelectedUserPermissions = useCallback((next: UserPermissions) => {
    const uid = selectedUserId
    if (!uid) return
    // Store in object format instead of array format
    setPermissions((prev) => ({
      ...prev,
      users: {
        ...((prev as any).users || {}),
        [uid]: next, // Store as UserPermissions object
      },
    }) as any)
  }, [selectedUserId])

  // Get the current data path based on hierarchy
  const getDataPath = () => {
    if (companyState.selectedSubsiteID && companyState.selectedSiteID) {
      return {
        companyId: companyState.companyID,
        siteId: companyState.selectedSiteID,
        subsiteId: companyState.selectedSubsiteID
      }
    }
    if (companyState.selectedSiteID) {
      return {
        companyId: companyState.companyID,
        siteId: companyState.selectedSiteID
      }
    }
    // If no site is selected, use the first available site or empty string
    const firstSiteId = companyState.sites && companyState.sites.length > 0 
      ? companyState.sites[0].siteID 
      : ""
    return {
      companyId: companyState.companyID,
      siteId: firstSiteId
    }
  }

  // Load company users when company changes
  useEffect(() => {
    if (!companyState.companyID) {
      setUsers([])
      return
    }

    const loadUsers = async () => {
      try {
        const companyUsers = await getCompanyUsers(companyState.companyID)
        setUsers(Array.isArray(companyUsers) ? companyUsers : [])
      } catch (err) {
        console.warn("Error loading company users:", err)
        setUsers([])
      }
    }

    loadUsers()
  }, [companyState.companyID, getCompanyUsers])
  
  // Sync HR data whenever it's available (use stable keys to prevent infinite loops)
  const lastRolesKeyRef = useRef<string>("")
  const lastDepartmentsKeyRef = useRef<string>("")
  
  useEffect(() => {
    if (rolesKey !== lastRolesKeyRef.current) {
      lastRolesKeyRef.current = rolesKey
      if (hrState?.roles && hrState.roles.length > 0) {
        const hrRoles = hrState.roles.map(r => toKey(r.name || r.label || ""))
        setRoles(hrRoles)
      } else if (companyState.permissions?.roles) {
        // Fallback: use company permissions roles so the tab doesn't block on HR
        setRoles(Object.keys(companyState.permissions.roles || {}).filter(Boolean))
      } else {
        setRoles([])
      }
    }
  }, [rolesKey, companyState.permissions])
  
  useEffect(() => {
    if (departmentsKey !== lastDepartmentsKeyRef.current) {
      lastDepartmentsKeyRef.current = departmentsKey
      if (hrState?.departments && hrState.departments.length > 0) {
        const hrDepartments = hrState.departments.map(d => toKey(d.name || ""))
        setDepartments(hrDepartments)
      } else if (companyState.permissions?.departments) {
        // Fallback: use company permissions departments so the tab doesn't block on HR
        setDepartments(Object.keys(companyState.permissions.departments || {}).filter(Boolean))
      } else {
        setDepartments([])
      }
    }
  }, [departmentsKey, companyState.permissions])

  // Keep a valid selected role for the Roles tab
  useEffect(() => {
    if (!roles || roles.length === 0) {
      setSelectedRoleKey("")
      return
    }
    if (!selectedRoleKey || !roles.includes(selectedRoleKey)) {
      setSelectedRoleKey(roles[0])
    }
  }, [roles, selectedRoleKey])

  // Keep a valid selected user for the Users tab
  useEffect(() => {
    const ids = (users || []).map((u: any) => String(u.uid || "")).filter(Boolean)
    if (ids.length === 0) {
      setSelectedUserId("")
      return
    }
    if (!selectedUserId || !ids.includes(selectedUserId)) {
      setSelectedUserId(ids[0])
    }
  }, [users, selectedUserId])

  // Keep a valid selected employee for the Employees tab
  useEffect(() => {
    const ids = (employees || []).map((e: any) => String(e.id || e.employeeID || e.uid || e.email || "")).filter(Boolean)
    if (ids.length === 0) {
      setSelectedEmployeeId("")
      return
    }
    if (!selectedEmployeeId || !ids.includes(selectedEmployeeId)) {
      setSelectedEmployeeId(ids[0])
    }
  }, [employees, selectedEmployeeId])

  // Keep a valid selected department for the Departments tab
  useEffect(() => {
    if (!departments || departments.length === 0) {
      setSelectedDepartmentKey("")
      return
    }
    if (!selectedDepartmentKey || !departments.includes(selectedDepartmentKey)) {
      setSelectedDepartmentKey(departments[0])
    }
  }, [departments, selectedDepartmentKey])

  // Set loading to false once we have data or context is ready - optimized
  useEffect(() => {
    if (companyState.companyID) {
      // If HR context has data or is initialized, we're ready
      if (hrState && (hrState.initialized || (hrState.roles && hrState.roles.length > 0) || (hrState.departments && hrState.departments.length > 0))) {
        setLoading(false)
        return
      }
      // Also stop loading after a shorter delay to prevent infinite loading
      const timer = setTimeout(() => setLoading(false), 1000)
      return () => clearTimeout(timer)
    } else {
      setLoading(false)
    }
  }, [companyState.companyID, hrState?.initialized, hrState?.roles?.length, hrState?.departments?.length])

  // Load permissions and migrate legacy keys to sourceKeys for company module
  useEffect(() => {
    if (companyState.permissions) {
      const perms = { ...companyState.permissions }
      // Migrate company module permissions from legacy keys to sourceKeys if needed
      if ((perms as any).defaultPermissions?.modules?.company) {
        const companyModule = (perms as any).defaultPermissions.modules.company
        // For each sourceKey that has a legacy alias, ensure it exists under sourceKey
        Object.entries(COMPANY_PERMISSION_KEY_ALIASES).forEach(([sourceKey, legacyKey]) => {
          if (companyModule[legacyKey] && !companyModule[sourceKey]) {
            companyModule[sourceKey] = { ...companyModule[legacyKey] }
          }
        })
      }
      setPermissions(perms)
    }
  }, [companyState.permissions])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      savePermissions()
    } else {
      // Enter edit mode
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset permissions to original state
    if (companyState.permissions) {
      setPermissions(companyState.permissions)
    }
  }

  const handlePermissionChange = (
    type: "roles" | "departments",
    name: string,
    module: string,
    page: string,
    action: "view" | "edit" | "delete",
    value: boolean,
  ) => {
    if (!canManagePermissions || !isEditing) return

    setPermissions((prev) => {
      const next = { ...prev }
      // Ensure container exists
      if (!next[type]) {
        (next as any)[type] = {}
      }
      // Seed default structure if missing
      const current = (next as any)[type][name] || DEFAULT_PERMISSIONS.roles.staff
      const currentModules = (current.modules || {}) as any
      const moduleObj: Record<string, Record<PermissionAction, boolean>> = {
        ...(currentModules[module] || {}),
      }
      const existingPagePermissions = getPagePermissions(module, moduleObj, page)
      const pageObj = { ...(existingPagePermissions || { view: false, edit: false, delete: false }) }
      pageObj[action] = value
      setModulePagePermissions(module, moduleObj, page, pageObj)
      const newUserPerms = { modules: { ...currentModules, [module]: moduleObj } }
      ;(next as any)[type][name] = newUserPerms
      return next
    })
  }

  const updateAllActions = (
    type: "roles" | "departments",
    name: string,
    module: string,
    page: string,
    value: boolean,
  ) => {
    if (!canManagePermissions || !isEditing) return

    setPermissions((prev) => {
      const next = { ...prev }
      const collection = { ...((next as any)[type] || {}) }
      const current = collection[name] || { modules: {} }
      const modules = { ...(current.modules || {}) }
    const modulePages: Record<string, Record<PermissionAction, boolean>> = {
      ...(modules[module] || {}),
    }
      const updatedPage: Record<PermissionAction, boolean> = {
        view: value,
        edit: value,
        delete: value,
      }
    setModulePagePermissions(module, modulePages, page, updatedPage)
      modules[module] = modulePages
      collection[name] = { modules }
      ;(next as any)[type] = collection
      return next
    })
  }

// Convert permission object to boolean array based on module/page definitions
  const convertPermissionsToArray = (userPermissions: UserPermissions): boolean[] => {
    const permissionArray: boolean[] = []

  PERMISSION_MODULES.forEach((key) => {
    const [module, page] = String(key).split(".")
    if (!module || !page) return
    const modulePerms = userPermissions.modules?.[module as keyof typeof userPermissions.modules] as
      | Record<string, Record<PermissionAction, boolean>>
      | undefined
    const pagePerms = getPagePermissions(module, modulePerms, page)

    ;(["view", "edit", "delete"] as PermissionAction[]).forEach((action) => {
      permissionArray.push(Boolean(pagePerms?.[action]))
    })
    })

    return permissionArray
  }

  // Convert boolean array back to permission object structure

  const savePermissions = async () => {
    if (!companyState.companyID || !canManagePermissions) return

    setLoading(true)
    try {
      // Persist defaults first (cheap + avoids UI inconsistency)
      if (companyState.permissions) {
        // Persist global default permissions (independent of role/department)
        const nextDefaultPerms = (permissions as any).defaultPermissions || { modules: {} }
        const prevDefaultPerms = (companyState.permissions as any).defaultPermissions || { modules: {} }
        if (JSON.stringify(nextDefaultPerms) !== JSON.stringify(prevDefaultPerms)) {
          await updateDefaultPermissions(nextDefaultPerms)
        }

        if (permissions.defaultRole && permissions.defaultRole !== companyState.permissions.defaultRole) {
          await updateDefaultRole(permissions.defaultRole)
        }
        if (permissions.defaultDepartment && permissions.defaultDepartment !== companyState.permissions.defaultDepartment) {
          await updateDefaultDepartment(permissions.defaultDepartment)
        }
        // Persist department active flags
        if (permissions.departmentsMeta) {
          const currentMeta = companyState.permissions.departmentsMeta || {}
          const keys = new Set([...Object.keys(currentMeta), ...Object.keys(permissions.departmentsMeta)])
          for (const key of keys) {
            const nextActive = permissions.departmentsMeta?.[key]?.active
            const prevActive = currentMeta?.[key]?.active
            if (typeof nextActive === "boolean" && nextActive !== prevActive) {
              await updateDepartmentPermissionsActive(key, nextActive)
            }
          }
        }

        // Persist role active flags
        if (permissions.rolesMeta) {
          const currentMeta = companyState.permissions.rolesMeta || {}
          const keys = new Set([...Object.keys(currentMeta), ...Object.keys(permissions.rolesMeta)])
          for (const key of keys) {
            const nextActive = permissions.rolesMeta?.[key]?.active
            const prevActive = currentMeta?.[key]?.active
            if (typeof nextActive === "boolean" && nextActive !== prevActive) {
              await updateRolePermissionsActive(key, nextActive)
            }
          }
        }

        // Persist user override active flags
        if ((permissions as any).usersMeta) {
          const currentMeta = (companyState.permissions as any).usersMeta || {}
          const nextMeta = (permissions as any).usersMeta || {}
          const keys = new Set([...Object.keys(currentMeta), ...Object.keys(nextMeta)])
          for (const key of keys) {
            const nextActive = nextMeta?.[key]?.active
            const prevActive = currentMeta?.[key]?.active
            if (typeof nextActive === "boolean" && nextActive !== prevActive) {
              await updateUserPermissionsActive(key, nextActive)
            }
          }
        }

        // Persist employee override active flags (separate from users)
        if ((permissions as any).employeesMeta) {
          const currentMeta = (companyState.permissions as any).employeesMeta || {}
          const nextMeta = (permissions as any).employeesMeta || {}
          const keys = new Set([...Object.keys(currentMeta), ...Object.keys(nextMeta)])
          for (const key of keys) {
            const nextActive = nextMeta?.[key]?.active
            const prevActive = currentMeta?.[key]?.active
            if (typeof nextActive === "boolean" && nextActive !== prevActive) {
              await updateEmployeePermissionsActive(key, nextActive)
            }
          }
        }
      }

      // Persist only roles/departments sourced from HR context
      for (const roleKey of roles) {
        const rolePermissions = permissions.roles[roleKey] || DEFAULT_PERMISSIONS.roles.staff
        await updateRolePermissions(roleKey, rolePermissions)
      }

      for (const deptKey of departments) {
        const deptPermissions = permissions.departments[deptKey] || DEFAULT_PERMISSIONS.roles.staff
        await updateDepartmentPermissions(deptKey, deptPermissions)
      }

      // Persist user overrides (if any)
      const usersOverrides = (permissions as any).users || {}
      const currentOverrides = (companyState.permissions as any).users || {}
      for (const [uid, userPerms] of Object.entries(usersOverrides)) {
        // Handle both object format (new) and array format (legacy)
        const nextPerms = userPerms as any
        const prevPerms = currentOverrides?.[uid] as any
        // Check if it's an array (legacy) or object (new format)
        const isArray = Array.isArray(nextPerms)
        const changed = isArray 
          ? JSON.stringify(nextPerms || []) !== JSON.stringify(prevPerms || [])
          : JSON.stringify(nextPerms || {}) !== JSON.stringify(prevPerms || {})
        if (changed) {
          // Store in object format (new format) - convert array if needed
          const permsToSave: any = isArray 
            ? convertArrayToPermissions(nextPerms as boolean[])
            : nextPerms as UserPermissions
          await updateUserPermissions(String(uid), permsToSave)
        }
      }

      // Persist employee overrides (if any) - separate from users
      const employeeOverrides = (permissions as any).employees || {}
      const currentEmployeeOverrides = (companyState.permissions as any).employees || {}
      for (const [employeeId, perms] of Object.entries(employeeOverrides)) {
        const nextObj = perms as any
        const prevObj = currentEmployeeOverrides?.[employeeId] as any
        const changed = JSON.stringify(nextObj || {}) !== JSON.stringify(prevObj || {})
        if (changed) {
          await updateEmployeePermissions(String(employeeId), nextObj || { modules: {} })
        }
      }
      
      // Refresh permissions from backend to ensure UI is in sync
      await refreshSites()
      
      setSuccess("Permissions updated successfully")
      setIsEditing(false) // Exit edit mode after successful save
    } catch (err) {
      console.error("Error saving permissions:", err)
      setError("Failed to save permissions")
    } finally {
      setLoading(false)
    }
  }

  const availableRoleOptions = useMemo(() => {
    const fromHR = roles && roles.length > 0 ? roles : []
    const fromPermissions = permissions?.roles ? Object.keys(permissions.roles) : []
    return Array.from(new Set([...fromHR, ...fromPermissions])).filter(Boolean).sort()
  }, [roles, permissions?.roles])

  const availableDepartmentOptions = useMemo(() => {
    const fromHR = departments && departments.length > 0 ? departments : []
    const fromPermissions = permissions?.departments ? Object.keys(permissions.departments) : []
    return Array.from(new Set([...fromHR, ...fromPermissions])).filter(Boolean).sort()
  }, [departments, permissions?.departments])

  // Test the end-to-end permissions save/load cycle with conversion logic

  const handleAddRole = async () => {
    if (!companyState.companyID || !newRoleName || !canManagePermissions) return

    setLoading(true)
    try {
      const { companyId, siteId } = getDataPath()

      // Create new role in HR system
      const roleData: Omit<Role, "id"> = {
        name: newRoleName.toLowerCase(),
        label: newRoleName,
        permissions: ["*"],
        description: `${newRoleName} role`,
        departmentId: "",
        isActive: true,
        createdAt: Date.now()
      }

      if (hrProviderAvailable && handleHRAction) {
        await handleHRAction({
          companyId,
          siteId,
          action: "create",
          entity: "roles",
          data: roleData
        })
      }

      // Create role in permissions system
      await addCompanyRole({
        name: newRoleName.toLowerCase(),
        label: newRoleName,
        description: `${newRoleName} role`,
        permissions: ["*"],
        active: true,
        createdAt: new Date().toISOString(),
      })

      // Add to local permissions state
      const defaultRolePermissions = permissions.roles.staff
      setPermissions((prev) => ({
        ...prev,
        roles: {
          ...prev.roles,
          [newRoleName.toLowerCase()]: defaultRolePermissions,
        },
      }))

      setRoles((prev) => [...prev, newRoleName.toLowerCase()])
      setNewRoleName("")
      setRoleDialogOpen(false)
      setSuccess("Role added successfully")
      // Data will sync automatically via useEffect hooks
    } catch (err) {
      console.error("Error adding role:", err)
      setError("Failed to add role")
    } finally {
      setLoading(false)
    }
  }

  const handleAddDepartment = async () => {
    if (!companyState.companyID || !newDepartmentName || !canManagePermissions) return

    setLoading(true)
    try {
      const { companyId, siteId } = getDataPath()

      // Create department in HR system
      const departmentData: Omit<Department, "id"> = {
        name: newDepartmentName,
        description: `${newDepartmentName} department`,
        managerId: "",
        employees: [],
        roles: [],
        isActive: true,
        createdAt: Date.now(),
      }

      if (hrProviderAvailable && handleHRAction) {
        await handleHRAction({
          companyId,
          siteId,
          action: "create",
          entity: "departments",
          data: departmentData
        })
      }

      // Create department in permissions system
      const departmentKey = newDepartmentName.toLowerCase().replace(/\s+/g, "-")
      await addCompanyDepartment({
        name: newDepartmentName,
        description: `${newDepartmentName} department`,
        managerId: "",
        employees: [],
        roles: [],
        createdAt: Date.now(),
      })

      setPermissions((prev) => ({
        ...prev,
        departments: {
          ...prev.departments,
          [departmentKey]: permissions.departments["front-of-house"],
        },
      }))

      setDepartments((prev) => [...prev, departmentKey])
      setNewDepartmentName("")
      setDepartmentDialogOpen(false)
      setSuccess("Department added successfully")
      // Data will sync automatically via useEffect hooks
    } catch (err) {
      console.error("Error adding department:", err)
      setError("Failed to add department")
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const handleUpdateUser = async () => {
    if (!currentUser || !userRole || !userDepartment || !canManagePermissions) return

    setLoading(true)
    try {
      await updateUserPermissions(currentUser.uid, [])
      await refreshSites()
      setUserDialogOpen(false)
      setCurrentUser(null)
      setUserRole("")
      setUserDepartment("")
      setSuccess("User permissions updated successfully")
    } catch (err) {
      console.error("Error updating user:", err)
      setError("Failed to update user permissions")
    } finally {
      setLoading(false)
    }
  }

  const openUserDialog = (user: any) => {
    setCurrentUser(user)
    setUserRole(user.companyRole || permissions.defaultRole)
    setUserDepartment(user.companyDepartment || permissions.defaultDepartment)
    setUserDialogOpen(true)
  }

  // Render permission matrix - memoized for performance
const ensurePermissionContainer = useCallback((
  collection: Record<string, UserPermissions> | undefined,
  name: string,
): UserPermissions => {
  if (collection && collection[name]) {
    return collection[name]
  }
  return { modules: {} }
}, [])

const renderPermissionMatrix = useCallback((
  type: "roles" | "departments",
  items: Record<string, UserPermissions>,
  roles: string[],
  departments: string[],
  isEditing: boolean,
  canManagePermissions: boolean,
  handlePermissionChange: (
    type: "roles" | "departments",
    name: string,
    module: string,
    page: string,
    action: PermissionAction,
    value: boolean,
  ) => void,
  updateAllActions: (
    type: "roles" | "departments",
    name: string,
    module: string,
    page: string,
    value: boolean,
  ) => void,
) => {
  const entities = type === "roles" ? roles : departments

  if (entities.length === 0) {
    return (
      <EmptyStateCard
        icon={type === "roles" ? GroupIcon : BusinessIcon}
        title={type === "roles" ? "No roles found" : "No departments found"}
        description="Create these in HR management to configure permissions."
      />
    )
  }

    return (
      <Box>
      {entities.map((entityName, index) => {
        const entityPermissions = ensurePermissionContainer(items, entityName)
        const label = formatLabel(entityName)

        return (
          <Accordion
            key={`${type}-${entityName}-${index}`}
            sx={{ mb: 1 }}
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem" }}>{label}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1, pb: 1 }}>
              <Grid container spacing={1}>
                {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                  const modulePermissions = entityPermissions.modules?.[moduleKey as keyof typeof entityPermissions.modules] as
                    | Record<string, Record<PermissionAction, boolean>>
                    | undefined

                  return (
                    <Grid item xs={12} md={6} key={`${entityName}-${moduleKey}`}>
                      <Card variant="outlined" sx={{ mb: 1 }}>
                        <CardHeader 
                          title={moduleDef.label} 
                          titleTypographyProps={{ variant: "caption", sx: { fontWeight: 600, fontSize: "0.75rem" } }} 
                          sx={{ py: 0.5, px: 1 }}
                        />
                        <CardContent sx={{ pt: 0.5, pb: 1, px: 1 }}>
                          {moduleDef.groups.map((group) => {
                            const pagePermissions =
                              getPagePermissions(moduleKey, modulePermissions, group.sourceKey) ?? {
                                view: false,
                                edit: false,
                                delete: false,
                              }
                            const isGroupEnabled = (["view", "edit", "delete"] as PermissionAction[]).some(
                              (action) => pagePermissions[action],
                            )

                            return (
                              <Box key={`${moduleKey}-${group.key}`} sx={{ mb: 1 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.7rem" }}>
                                      {group.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                      {group.tabs.join(" • ")}
                                    </Typography>
                                  </Box>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                        checked={isGroupEnabled}
                                        disabled={!isEditing || !canManagePermissions}
                                        onChange={(e) =>
                                          updateAllActions(type, entityName, moduleKey, group.sourceKey, e.target.checked)
                                        }
                                      />
                                    }
                                    label="All"
                                    sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                  />
                                </Box>
                                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                                  {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                    <FormControlLabel
                                      key={action}
                                      control={
                                        <Switch
                                          size="small"
                                          checked={Boolean(pagePermissions[action])}
                                          disabled={!isEditing || !canManagePermissions}
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              type,
                                              entityName,
                                              moduleKey,
                                              group.sourceKey,
                                              action,
                                              e.target.checked,
                                            )
                                          }
                                        />
                                      }
                                      label={ACTION_LABELS[action]}
                                      sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )
                          })}
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )
      })}
      </Box>
    )
  }, [])

  // Check permissions using the hasPermission function instead of hard-coded checks
  if (!hasPermission("company", "permissions", "view")) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to view permissions settings.</Alert>
      </Box>
    )
  }

  return (
    <RequireCompanyContext>
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        additionalControls={
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minHeight: 48,
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                gap: 1,
                color: "white",
                "&.Mui-selected": {
                  color: "white",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "white",
              },
            }}
          >
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Default" />
            <Tab icon={<BusinessIcon />} iconPosition="start" label="Departments" />
            <Tab icon={<GroupIcon />} iconPosition="start" label="Roles" />
            <Tab icon={<PersonIcon />} iconPosition="start" label="Employees" />
            <Tab icon={<SecurityIcon />} iconPosition="start" label="Users" />
          </Tabs>
        }
        additionalButtons={[
          ...(canManagePermissions ? [
            ...(isEditing ? [{
              label: "Cancel",
              icon: <EditIcon />,
              onClick: handleCancelEdit,
              variant: "outlined" as const,
              color: "secondary" as const
            }] : []),
            {
              label: isEditing ? "Save Changes" : "Edit",
              icon: isEditing ? <SaveIcon /> : <EditIcon />,
              onClick: handleEditToggle,
              variant: "contained" as const,
              color: "primary" as const
            }
          ] : [])
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ p: 2 }}>
        <>
            <TabPanel value={tabValue} index={0}>
              {(() => {
                const canEdit = isEditing && canManagePermissions
                const defaultPerms = (permissions as any).defaultPermissions || { modules: {} }

                const getEffectivePagePerms = (
                  moduleKey: string,
                  sourceKey: string,
                ): Record<PermissionAction, boolean> => {
                  const modulePerms = defaultPerms.modules?.[moduleKey as keyof typeof defaultPerms.modules] as any
                  return (
                    getPagePermissions(moduleKey, modulePerms, sourceKey) || { view: false, edit: false, delete: false }
                  )
                }

                const setDefaultPagePerm = (moduleKey: string, sourceKey: string, action: PermissionAction, value: boolean) => {
                  if (!canManagePermissions || !isEditing) return
                  setPermissions((prev) => {
                    const next = { ...prev } as any
                    const current = next.defaultPermissions || { modules: {} }
                    const currentModules = (current.modules || {}) as any
                    const moduleObj: Record<string, Record<PermissionAction, boolean>> = { ...(currentModules[moduleKey] || {}) }
                    const existingPagePermissions = getPagePermissions(moduleKey, moduleObj, sourceKey)
                    const pageObj = { ...(existingPagePermissions || { view: false, edit: false, delete: false }) }
                    pageObj[action] = value
                    setModulePagePermissions(moduleKey, moduleObj, sourceKey, pageObj)
                    next.defaultPermissions = { modules: { ...currentModules, [moduleKey]: moduleObj } }
                    return next
                  })
                }

                const setDefaultSectionAll = (moduleKey: string, value: boolean) => {
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return
                  if (!canManagePermissions || !isEditing) return
                  setPermissions((prev) => {
                    const next = { ...prev } as any
                    const current = next.defaultPermissions || { modules: {} }
                    const modules = { ...(current.modules || {}) }
                    const modulePages: Record<string, Record<PermissionAction, boolean>> = { ...(modules[moduleKey] || {}) }
                    moduleDef.groups.forEach((group) => {
                      setModulePagePermissions(moduleKey, modulePages, group.sourceKey, {
                        view: value,
                        edit: value,
                        delete: value,
                      })
                    })
                    modules[moduleKey] = modulePages
                    next.defaultPermissions = { modules }
                    return next
                  })
                }

                const isSectionEnabled = (moduleKey: string) => {
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return false
                  return moduleDef.groups.some((group) => {
                    const p = getEffectivePagePerms(moduleKey, group.sourceKey)
                    return Boolean(p.view || p.edit || p.delete)
                  })
                }

                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        Default permissions
                      </Typography>
                    </Paper>

                    {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                      const moduleEnabled = isSectionEnabled(moduleKey)
                      return (
                        <Accordion key={`default-${moduleKey}`} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                {moduleDef.label}
                              </Typography>
                              <FormControlLabel
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                control={
                                  <Switch
                                    size="small"
                                    checked={moduleEnabled}
                                    disabled={!canEdit}
                                    onChange={(e) => setDefaultSectionAll(moduleKey, e.target.checked)}
                                  />
                                }
                                label="Section"
                                sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {moduleDef.groups.map((group) => {
                                const pagePermissions = getEffectivePagePerms(moduleKey, group.sourceKey)
                                return (
                                  <Paper key={`${moduleKey}-${group.key}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                          {group.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                          {group.tabs.join(" • ")}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                          <FormControlLabel
                                            key={action}
                                            control={
                                              <Switch
                                                size="small"
                                                checked={Boolean(pagePermissions[action])}
                                                disabled={!canEdit}
                                                onChange={(e) => setDefaultPagePerm(moduleKey, group.sourceKey, action, e.target.checked)}
                                              />
                                            }
                                            label={ACTION_LABELS[action]}
                                            sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  </Paper>
                                )
                              })}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
                  </Box>
                )
              })()}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {departments.length === 0 ? (
                <EmptyStateCard
                  icon={BusinessIcon}
                  title="No departments found"
                  description="Create departments in HR management to configure department permissions."
                />
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={departments}
                          value={selectedDepartmentKey || null}
                          onChange={(_e, newValue) => setSelectedDepartmentKey(newValue || "")}
                          getOptionLabel={(opt) => formatLabel(opt)}
                          isOptionEqualToValue={(opt, val) => opt === val}
                          renderOption={(props, option) => {
                            const { key, ...optionProps } = props as any
                            const active = permissions.departmentsMeta?.[option]?.active !== false
                            // Use department name as key with prefix to ensure uniqueness
                            const uniqueKey = `department-${String(option)}`
                            return (
                              <Box
                                component="li"
                                key={uniqueKey}
                                {...optionProps}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 2,
                                  width: "100%",
                                }}
                              >
                                <Typography variant="body2">{formatLabel(option)}</Typography>
                                <Chip
                                  label={active ? "Active" : "Inactive"}
                                  size="small"
                                  color={active ? "success" : "default"}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: "0.65rem" }}
                                />
                              </Box>
                            )
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Department"
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={isSelectedDepartmentActive}
                                disabled={!isEditing || !canManagePermissions || !selectedDepartmentKey}
                                onChange={async (e) => {
                                  const active = e.target.checked
                                  setPermissions((prev) => ({
                                    ...prev,
                                    departmentsMeta: {
                                      ...(prev.departmentsMeta || {}),
                                      [selectedDepartmentKey]: { ...(prev.departmentsMeta?.[selectedDepartmentKey] || {}), active },
                                    },
                                  }))
                                  try {
                                    await updateDepartmentPermissionsActive(selectedDepartmentKey, active)
                                  } catch {
                                    // ignore
                                  }
                                }}
                              />
                            }
                            label="Department active"
                            sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {(() => {
                    const deptKey = selectedDepartmentKey
                    const deptPermissions = ensurePermissionContainer(permissions.departments, deptKey)
                    const canEdit = isEditing && canManagePermissions && isSelectedDepartmentActive

                    const updateModuleAll = (moduleKey: string, value: boolean) => {
                      const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                      if (!moduleDef) return
                      moduleDef.groups.forEach((group) => {
                        updateAllActions("departments", deptKey, moduleKey, group.sourceKey, value)
                      })
                    }

                    const getModuleEnabled = (moduleKey: string) => {
                      const modulePermissions = deptPermissions.modules?.[moduleKey as keyof typeof deptPermissions.modules] as
                        | Record<string, Record<PermissionAction, boolean>>
                        | undefined
                      const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                      if (!moduleDef) return false
                      return moduleDef.groups.some((group) => {
                        const pagePermissions = getPagePermissions(moduleKey, modulePermissions, group.sourceKey)
                        return Boolean(pagePermissions?.view || pagePermissions?.edit || pagePermissions?.delete)
                      })
                    }

                    return (
                      <Box>
                        {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                          const modulePermissions = deptPermissions.modules?.[moduleKey as keyof typeof deptPermissions.modules] as
                            | Record<string, Record<PermissionAction, boolean>>
                            | undefined

                          const moduleEnabled = getModuleEnabled(moduleKey)

                          return (
                            <Accordion
                              key={`dept-${deptKey}-${moduleKey}`}
                              TransitionProps={{ unmountOnExit: true }}
                              sx={{ mb: 1 }}
                            >
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ py: 0.5 }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                  <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                    {moduleDef.label}
                                  </Typography>
                                  <FormControlLabel
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    control={
                                      <Switch
                                        size="small"
                                        checked={moduleEnabled}
                                        disabled={!canEdit}
                                        onChange={(e) => updateModuleAll(moduleKey, e.target.checked)}
                                      />
                                    }
                                    label="Section"
                                    sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                                  />
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                  {moduleDef.groups.map((group) => {
                                    const pagePermissions =
                                      getPagePermissions(moduleKey, modulePermissions, group.sourceKey) ?? {
                                        view: false,
                                        edit: false,
                                        delete: false,
                                      }

                                    return (
                                      <Paper
                                        key={`${moduleKey}-${group.key}`}
                                        variant="outlined"
                                        sx={{ p: 1, borderRadius: 1 }}
                                      >
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                          <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                              {group.title}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{ fontSize: "0.65rem", display: "block" }}
                                            >
                                              {group.tabs.join(" • ")}
                                            </Typography>
                                          </Box>
                                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                              <FormControlLabel
                                                key={action}
                                                control={
                                                  <Switch
                                                    size="small"
                                                    checked={Boolean(pagePermissions[action])}
                                                    disabled={!canEdit}
                                                    onChange={(e) =>
                                                      handlePermissionChange(
                                                        "departments",
                                                        deptKey,
                                                        moduleKey,
                                                        group.sourceKey,
                                                        action,
                                                        e.target.checked,
                                                      )
                                                    }
                                                  />
                                                }
                                                label={ACTION_LABELS[action]}
                                                sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                              />
                                            ))}
                                          </Box>
                                        </Box>
                                      </Paper>
                                    )
                                  })}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          )
                        })}
                      </Box>
                    )
                  })()}
                </Box>
              )}
            </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {roles.length === 0 ? (
            <EmptyStateCard
              icon={GroupIcon}
              title="No roles found"
              description="Create roles in HR management to configure role permissions."
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={roles}
                      value={selectedRoleKey || null}
                      onChange={(_e, newValue) => setSelectedRoleKey(newValue || "")}
                      getOptionLabel={(opt) => formatLabel(opt)}
                      isOptionEqualToValue={(opt, val) => opt === val}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props as any
                        const active = permissions.rolesMeta?.[option]?.active !== false
                        // Use role name as key with prefix to ensure uniqueness
                        const uniqueKey = `role-${String(option)}`
                        return (
                          <Box
                            component="li"
                            key={uniqueKey}
                            {...optionProps}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                              width: "100%",
                            }}
                          >
                            <Typography variant="body2">{formatLabel(option)}</Typography>
                            <Chip
                              label={active ? "Active" : "Inactive"}
                              size="small"
                              color={active ? "success" : "default"}
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          </Box>
                        )
                      }}
                      renderInput={(params) => <TextField {...params} label="Role" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={isSelectedRoleActive}
                            disabled={!isEditing || !canManagePermissions || !selectedRoleKey}
                            onChange={async (e) => {
                              const active = e.target.checked
                              setPermissions((prev) => ({
                                ...prev,
                                rolesMeta: {
                                  ...(prev.rolesMeta || {}),
                                  [selectedRoleKey]: { ...(prev.rolesMeta?.[selectedRoleKey] || {}), active },
                                },
                              }))
                              try {
                                await updateRolePermissionsActive(selectedRoleKey, active)
                              } catch {
                                // ignore
                              }
                            }}
                          />
                        }
                        label="Role active"
                        sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {(() => {
                const roleKey = selectedRoleKey
                const rolePermissions = ensurePermissionContainer(permissions.roles, roleKey)
                const canEdit = isEditing && canManagePermissions && isSelectedRoleActive

                const updateModuleAll = (moduleKey: string, value: boolean) => {
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return
                  moduleDef.groups.forEach((group) => {
                    updateAllActions("roles", roleKey, moduleKey, group.sourceKey, value)
                  })
                }

                const getModuleEnabled = (moduleKey: string) => {
                  const modulePermissions = rolePermissions.modules?.[moduleKey as keyof typeof rolePermissions.modules] as
                    | Record<string, Record<PermissionAction, boolean>>
                    | undefined
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return false
                  return moduleDef.groups.some((group) => {
                    const pagePermissions = getPagePermissions(moduleKey, modulePermissions, group.sourceKey)
                    return Boolean(pagePermissions?.view || pagePermissions?.edit || pagePermissions?.delete)
                  })
                }

                return (
                  <Box>
                    {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                      const modulePermissions = rolePermissions.modules?.[moduleKey as keyof typeof rolePermissions.modules] as
                        | Record<string, Record<PermissionAction, boolean>>
                        | undefined

                      const moduleEnabled = getModuleEnabled(moduleKey)

                      return (
                        <Accordion key={`role-${roleKey}-${moduleKey}`} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                {moduleDef.label}
                              </Typography>
                              <FormControlLabel
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                control={
                                  <Switch
                                    size="small"
                                    checked={moduleEnabled}
                                    disabled={!canEdit}
                                    onChange={(e) => updateModuleAll(moduleKey, e.target.checked)}
                                  />
                                }
                                label="Section"
                                sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {moduleDef.groups.map((group) => {
                                const pagePermissions =
                                  getPagePermissions(moduleKey, modulePermissions, group.sourceKey) ?? {
                                    view: false,
                                    edit: false,
                                    delete: false,
                                  }
                                return (
                                  <Paper key={`${moduleKey}-${group.key}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                          {group.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                          {group.tabs.join(" • ")}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                          <FormControlLabel
                                            key={action}
                                            control={
                                              <Switch
                                                size="small"
                                                checked={Boolean(pagePermissions[action])}
                                                disabled={!canEdit}
                                                onChange={(e) =>
                                                  handlePermissionChange(
                                                    "roles",
                                                    roleKey,
                                                    moduleKey,
                                                    group.sourceKey,
                                                    action,
                                                    e.target.checked,
                                                  )
                                                }
                                              />
                                            }
                                            label={ACTION_LABELS[action]}
                                            sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  </Paper>
                                )
                              })}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
                  </Box>
                )
              })()}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {employees.length === 0 ? (
            <EmptyStateCard
              icon={PersonIcon}
              title="No employees available"
              description="Add employees in HR to configure employee permissions."
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={employees}
                      value={employees.find((e: any) => String(e.id || e.employeeID || "") === selectedEmployeeId) || null}
                      onChange={(_e, newValue: any) => {
                        const id = String(newValue?.id || newValue?.employeeID || "")
                        setSelectedEmployeeId(id)
                      }}
                      getOptionLabel={(opt: any) =>
                        formatLabel(
                          `${opt?.firstName || ""} ${opt?.lastName || ""}`.trim() ||
                            opt?.displayName ||
                            opt?.email ||
                            opt?.id ||
                            "Employee",
                        )
                      }
                      isOptionEqualToValue={(opt: any, val: any) =>
                        String(opt?.id || opt?.employeeID || "") === String(val?.id || val?.employeeID || "")
                      }
                      renderOption={(props, option: any) => {
                        const { key, ...optionProps } = props as any
                        const employeeId = String(option?.id || option?.employeeID || "")
                        const active = employeeId ? (permissions as any).employeesMeta?.[employeeId]?.active !== false : false
                        // Use unique employee ID as key to avoid duplicate key warnings
                        // Fallback to original key if no employeeId exists
                        const uniqueKey = employeeId ? `employee-${employeeId}` : `employee-${key || 'unknown'}`
                        return (
                          <Box
                            component="li"
                            key={uniqueKey}
                            {...optionProps}
                            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, width: "100%" }}
                          >
                            <Typography variant="body2">
                              {formatLabel(
                                `${option?.firstName || ""} ${option?.lastName || ""}`.trim() ||
                                  option?.displayName ||
                                  option?.email ||
                                  option?.id ||
                                  "Employee",
                              )}
                            </Typography>
                            <Chip
                              label={employeeId ? (active ? "Active" : "Inactive") : "No employee id"}
                              size="small"
                              color={employeeId ? (active ? "success" : "default") : "warning"}
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          </Box>
                        )
                      }}
                      renderInput={(params) => <TextField {...params} label="Employee" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={isSelectedEmployeeOverrideActive}
                            disabled={!isEditing || !canManagePermissions || !selectedEmployeeId}
                            onChange={async (e) => {
                              const active = e.target.checked
                              if (!selectedEmployeeId) return
                              setPermissions((prev) => ({
                                ...prev,
                                employeesMeta: {
                                  ...(((prev as any).employeesMeta) || {}),
                                  [selectedEmployeeId]: { ...(((prev as any).employeesMeta?.[selectedEmployeeId]) || {}), active },
                                },
                              }) as any)
                              try {
                                await updateEmployeePermissionsActive(selectedEmployeeId, active)
                              } catch {
                                // ignore
                              }
                            }}
                          />
                        }
                        label="Employee active"
                        sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {(() => {
                const emp = employees.find((e: any) => String(e.id || e.employeeID || "") === selectedEmployeeId) || employees[0]
                const employeeId = String(emp?.id || emp?.employeeID || selectedEmployeeId || "")
                const roleKey = toKey(String(emp?.roleId || emp?.role || permissions.defaultRole || "staff"))
                const deptKey = toKey(String(emp?.departmentId || emp?.department || permissions.defaultDepartment || "front-of-house"))
                const basePerms = (permissions as any).defaultPermissions || { modules: {} }
                const roleActive = permissions.rolesMeta?.[roleKey]?.active !== false
                const deptActive = permissions.departmentsMeta?.[deptKey]?.active !== false
                const rolePerms = roleActive ? ensurePermissionContainer(permissions.roles, roleKey) : { modules: {} }
                const deptPerms = deptActive ? ensurePermissionContainer(permissions.departments, deptKey) : { modules: {} }
                const employeeActive = employeeId ? (permissions as any).employeesMeta?.[employeeId]?.active !== false : false
                const employeePerms = employeeActive
                  ? ((permissions as any).employees?.[employeeId] || { modules: {} })
                  : { modules: {} }

                const merged: UserPermissions = { modules: {} as any }
                const mergeFrom = (src?: any) => {
                  if (!src?.modules) return
                  Object.keys(src.modules).forEach((moduleName) => {
                    if (!(merged.modules as any)[moduleName]) (merged.modules as any)[moduleName] = {}
                    Object.keys(src.modules[moduleName]).forEach((pageName) => {
                      if (!(merged.modules as any)[moduleName][pageName]) {
                        (merged.modules as any)[moduleName][pageName] = { view: false, edit: false, delete: false }
                      }
                      ;(["view", "edit", "delete"] as PermissionAction[]).forEach((a) => {
                        ;(merged.modules as any)[moduleName][pageName][a] =
                          (merged.modules as any)[moduleName][pageName][a] || Boolean(src.modules[moduleName][pageName][a])
                      })
                    })
                  })
                }
                mergeFrom(basePerms)
                mergeFrom(rolePerms)
                mergeFrom(deptPerms)
                mergeFrom(employeePerms)

                return (
                  <Box>
                    {/* Employee override editor (separate from user overrides) */}
                    {(() => {
                      const canEdit = isEditing && canManagePermissions && employeeActive
                      const selectedPerms: UserPermissions = (permissions as any).employees?.[employeeId] || { modules: {} }

                      const getPage = (moduleKey: string, sourceKey: string) => {
                        const mod = selectedPerms.modules?.[moduleKey as keyof typeof selectedPerms.modules] as any
                        return getPagePermissions(moduleKey, mod, sourceKey) || { view: false, edit: false, delete: false }
                      }

                      const setPage = (moduleKey: string, sourceKey: string, action: PermissionAction, value: boolean) => {
                        if (!canManagePermissions || !isEditing) return
                        setPermissions((prev) => {
                          const next = { ...prev } as any
                          const employees = { ...(next.employees || {}) }
                          const current = employees[employeeId] || { modules: {} }
                          const currentModules = { ...(current.modules || {}) }
                          const moduleObj: Record<string, Record<PermissionAction, boolean>> = { ...(currentModules[moduleKey] || {}) }
                          const existing = getPagePermissions(moduleKey, moduleObj, sourceKey) || { view: false, edit: false, delete: false }
                          const pageObj = { ...existing, [action]: value }
                          setModulePagePermissions(moduleKey, moduleObj, sourceKey, pageObj)
                          currentModules[moduleKey] = moduleObj
                          employees[employeeId] = { modules: currentModules }
                          next.employees = employees
                          return next
                        })
                      }

                      const setSectionAll = (moduleKey: string, value: boolean) => {
                        if (!canManagePermissions || !isEditing) return
                        const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                        if (!moduleDef) return
                        setPermissions((prev) => {
                          const next = { ...prev } as any
                          const employees = { ...(next.employees || {}) }
                          const current = employees[employeeId] || { modules: {} }
                          const modules = { ...(current.modules || {}) }
                          const modulePages: Record<string, Record<PermissionAction, boolean>> = { ...(modules[moduleKey] || {}) }
                          moduleDef.groups.forEach((group) => {
                            setModulePagePermissions(moduleKey, modulePages, group.sourceKey, {
                              view: value,
                              edit: value,
                              delete: value,
                            })
                          })
                          modules[moduleKey] = modulePages
                          employees[employeeId] = { modules }
                          next.employees = employees
                          return next
                        })
                      }

                      const isSectionEnabled = (moduleKey: string) => {
                        const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                        if (!moduleDef) return false
                        return moduleDef.groups.some((group) => {
                          const p = getPage(moduleKey, group.sourceKey)
                          return Boolean(p.view || p.edit || p.delete)
                        })
                      }

                      return (
                        <Box>
                          {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                            const enabled = isSectionEnabled(moduleKey)
                            return (
                              <Accordion key={`emp-override-${moduleKey}`} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                    <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                      {moduleDef.label}
                                    </Typography>
                                    <FormControlLabel
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.stopPropagation()}
                                      control={
                                        <Switch
                                          size="small"
                                          checked={enabled}
                                          disabled={!canEdit}
                                          onChange={(e) => setSectionAll(moduleKey, e.target.checked)}
                                        />
                                      }
                                      label="Section"
                                      sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                                    />
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    {moduleDef.groups.map((group) => {
                                      const pagePermissions = getPage(moduleKey, group.sourceKey)
                                      return (
                                        <Paper key={`${moduleKey}-${group.key}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                            <Box sx={{ minWidth: 0 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                                {group.title}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ fontSize: "0.65rem", display: "block" }}
                                              >
                                                {group.tabs.join(" • ")}
                                              </Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                              {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                                <FormControlLabel
                                                  key={action}
                                                  control={
                                                    <Switch
                                                      size="small"
                                                      checked={Boolean(pagePermissions[action])}
                                                      disabled={!canEdit}
                                                      onChange={(e) => setPage(moduleKey, group.sourceKey, action, e.target.checked)}
                                                    />
                                                  }
                                                  label={ACTION_LABELS[action]}
                                                  sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                                />
                                              ))}
                                            </Box>
                                          </Box>
                                        </Paper>
                                      )
                                    })}
                                  </Box>
                                </AccordionDetails>
                              </Accordion>
                            )
                          })}
                        </Box>
                      )
                    })()}

                    {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                      const modulePermissions = (merged.modules as any)?.[moduleKey] as
                        | Record<string, Record<PermissionAction, boolean>>
                        | undefined
                      const moduleEnabled = moduleDef.groups.some((group) => {
                        const pagePermissions = getPagePermissions(moduleKey, modulePermissions, group.sourceKey)
                        return Boolean(pagePermissions?.view || pagePermissions?.edit || pagePermissions?.delete)
                      })
                      return (
                        <Accordion key={`emp-${moduleKey}`} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                {moduleDef.label}
                              </Typography>
                              <FormControlLabel
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                control={<Switch size="small" checked={moduleEnabled} disabled />}
                                label="Section"
                                sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {moduleDef.groups.map((group) => {
                                const pagePermissions =
                                  getPagePermissions(moduleKey, modulePermissions, group.sourceKey) ?? {
                                    view: false,
                                    edit: false,
                                    delete: false,
                                  }
                                return (
                                  <Paper key={`${moduleKey}-${group.key}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                          {group.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                          {group.tabs.join(" • ")}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                          <FormControlLabel
                                            key={action}
                                            control={<Switch size="small" checked={Boolean(pagePermissions[action])} disabled />}
                                            label={ACTION_LABELS[action]}
                                            sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  </Paper>
                                )
                              })}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
                  </Box>
                )
              })()}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {users.length === 0 ? (
            <EmptyStateCard
              icon={PersonIcon}
              title="No users found"
              description="Invite users to your company to manage their permissions."
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={users}
                      value={users.find((u: any) => String(u.uid || "") === selectedUserId) || null}
                      onChange={(_e, newValue: any) => setSelectedUserId(String(newValue?.uid || ""))}
                      getOptionLabel={(opt: any) =>
                        String(opt?.displayName || `${opt?.firstName || ""} ${opt?.lastName || ""}`.trim() || opt?.email || opt?.uid || "")
                      }
                      isOptionEqualToValue={(opt: any, val: any) => String(opt?.uid || "") === String(val?.uid || "")}
                      renderOption={(props, option: any) => {
                        const { key, ...optionProps } = props as any
                        const uid = String(option?.uid || "")
                        const active = (permissions as any).usersMeta?.[uid]?.active !== false
                        // Use unique user UID as key to avoid duplicate key warnings
                        // Fallback to original key if no uid exists
                        const uniqueKey = uid ? `user-${uid}` : `user-${key || 'unknown'}`
                        return (
                          <Box
                            component="li"
                            key={uniqueKey}
                            {...optionProps}
                            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, width: "100%" }}
                          >
                            <Typography variant="body2">
                              {option?.displayName || `${option?.firstName || ""} ${option?.lastName || ""}`.trim() || option?.email || uid}
                            </Typography>
                            <Chip
                              label={active ? "Active" : "Inactive"}
                              size="small"
                              color={active ? "success" : "default"}
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          </Box>
                        )
                      }}
                      renderInput={(params) => <TextField {...params} label="User" size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={isSelectedUserOverrideActive}
                            disabled={!isEditing || !canManagePermissions || !selectedUserId}
                            onChange={async (e) => {
                              const active = e.target.checked
                              setPermissions((prev) => ({
                                ...prev,
                                usersMeta: {
                                  ...(((prev as any).usersMeta) || {}),
                                  [selectedUserId]: { ...(((prev as any).usersMeta?.[selectedUserId]) || {}), active },
                                },
                              }) as any)
                              try {
                                await updateUserPermissionsActive(selectedUserId, active)
                              } catch {
                                // ignore
                              }
                            }}
                          />
                        }
                        label="User override active"
                        sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {(() => {
                const canEdit = isEditing && canManagePermissions && isSelectedUserOverrideActive

                const updateUserModuleAll = (moduleKey: string, value: boolean) => {
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return
                  const next = { 
                    ...selectedUserPermissions, 
                    modules: { ...(selectedUserPermissions.modules || {}) } 
                  }
                  // Ensure module exists
                  if (!(next.modules as any)[moduleKey]) {
                    (next.modules as any)[moduleKey] = {}
                  }
                  const modulePages: any = { ...((next.modules as any)[moduleKey] || {}) }
                  moduleDef.groups.forEach((group) => {
                    const pageObj: Record<PermissionAction, boolean> = { view: value, edit: value, delete: value }
                    setModulePagePermissions(moduleKey, modulePages, group.sourceKey, pageObj)
                  })
                  ;(next.modules as any)[moduleKey] = { ...modulePages }
                  // Create a completely new object to ensure React detects the change
                  setSelectedUserPermissions({ 
                    ...next, 
                    modules: { 
                      ...next.modules,
                      [moduleKey]: { ...modulePages }
                    } 
                  })
                }

                const getModuleEnabled = (moduleKey: string) => {
                  const moduleDef = MODULE_GROUP_DEFINITIONS[moduleKey]
                  if (!moduleDef) return false
                  const modulePermissions = (selectedUserPermissions.modules as any)?.[moduleKey] as any
                  return moduleDef.groups.some((group) => {
                    const pagePermissions = getPagePermissions(moduleKey, modulePermissions, group.sourceKey)
                    return Boolean(pagePermissions?.view || pagePermissions?.edit || pagePermissions?.delete)
                  })
                }

                return (
                  <Box>
                    {MODULE_ENTRIES.map(([moduleKey, moduleDef]) => {
                      const modulePermissions = (selectedUserPermissions.modules as any)?.[moduleKey] as
                        | Record<string, Record<PermissionAction, boolean>>
                        | undefined
                      const moduleEnabled = getModuleEnabled(moduleKey)
                      return (
                        <Accordion key={`user-${selectedUserId}-${moduleKey}`} TransitionProps={{ unmountOnExit: true }} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem" }}>
                                {moduleDef.label}
                              </Typography>
                              <FormControlLabel
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                control={
                                  <Switch
                                    size="small"
                                    checked={moduleEnabled}
                                    disabled={!canEdit}
                                    onChange={(e) => updateUserModuleAll(moduleKey, e.target.checked)}
                                  />
                                }
                                label="Section"
                                sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: "0.7rem" } }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {moduleDef.groups.map((group) => {
                                const pagePermissions =
                                  getPagePermissions(moduleKey, modulePermissions as any, group.sourceKey) ?? {
                                    view: false,
                                    edit: false,
                                    delete: false,
                                  }
                                return (
                                  <Paper key={`${moduleKey}-${group.key}`} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                                          {group.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                          {group.tabs.join(" • ")}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        {(["view", "edit", "delete"] as PermissionAction[]).map((action) => (
                                          <FormControlLabel
                                            key={action}
                                            control={
                                              <Switch
                                                size="small"
                                                checked={Boolean(pagePermissions[action])}
                                                disabled={!canEdit}
                                                onChange={(e) => {
                                                  // Create a deep copy to ensure React detects the change
                                                  const next = { 
                                                    ...selectedUserPermissions, 
                                                    modules: { ...(selectedUserPermissions.modules || {}) } 
                                                  }
                                                  // Ensure module exists
                                                  if (!(next.modules as any)[moduleKey]) {
                                                    (next.modules as any)[moduleKey] = {}
                                                  }
                                                  // Create a new copy of the module pages
                                                  const modulePages: any = { ...((next.modules as any)[moduleKey] || {}) }
                                                  // Get current permissions with fallback to false
                                                  const currentPagePerms = getPagePermissions(moduleKey, modulePages, group.sourceKey) ?? {
                                                    view: false,
                                                    edit: false,
                                                    delete: false,
                                                  }
                                                  const pageObj: Record<PermissionAction, boolean> = {
                                                    view: Boolean(currentPagePerms.view),
                                                    edit: Boolean(currentPagePerms.edit),
                                                    delete: Boolean(currentPagePerms.delete),
                                                  }
                                                  pageObj[action] = e.target.checked
                                                  setModulePagePermissions(moduleKey, modulePages, group.sourceKey, pageObj)
                                                  // Create completely new nested structure to ensure React detects change
                                                  setSelectedUserPermissions({ 
                                                    ...next, 
                                                    modules: { 
                                                      ...next.modules,
                                                      [moduleKey]: { ...modulePages }
                                                    } 
                                                  })
                                                }}
                                              />
                                            }
                                            label={ACTION_LABELS[action]}
                                            sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.65rem" }, m: 0 }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  </Paper>
                                )
                              })}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )
                    })}
                  </Box>
                )
              })()}
            </Box>
          )}
        </TabPanel>
        </>

      </Box>

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Role Name"
            fullWidth
            variant="outlined"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRole} variant="contained" disabled={!newRoleName || loading}>
            Add Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={departmentDialogOpen} onClose={() => setDepartmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Department Name"
            fullWidth
            variant="outlined"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDepartment} variant="contained" disabled={!newDepartmentName || loading}>
            Add Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Permissions</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              User: {currentUser?.displayName || currentUser?.email}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select value={userRole} label="Role" onChange={(e) => setUserRole(e.target.value)}>
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select value={userDepartment} label="Department" onChange={(e) => setUserDepartment(e.target.value)}>
                {departments.map((department) => (
                  <MenuItem key={department} value={department}>
                    {department.replace(/-/g, " ").charAt(0).toUpperCase() + department.replace(/-/g, " ").slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained" disabled={loading}>
            Update User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </RequireCompanyContext>
  )
}

export default Permissions
