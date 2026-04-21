"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Menu,
  ListItemText,
  Checkbox,
  TablePagination,
  Avatar,
  OutlinedInput,
  CircularProgress,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Description as ContractIcon,
  PersonOff as PersonOffIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material"
import { useHR } from "../../../backend/context/HRContext"
import type { Employee } from "../../../backend/interfaces/HRs"
import type { ContractTemplate, Contract } from "../../../backend/interfaces/HRs"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import EmployeeCRUDForm, { type EmployeeCRUDFormHandle } from "./forms/EmployeeCRUDForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import { db, ref, remove, update as rtdbUpdate } from "../../../backend/services/Firebase"

interface ColumnConfig {
  id: string
  label: string
  minWidth?: number
  align?: "left" | "right" | "center"
  format?: (value: any, employee: Employee) => string | React.ReactNode
}

const EMPLOYEE_COLUMNS: ColumnConfig[] = [
  { id: "photo", label: "Photo", minWidth: 80, align: "center" },
  { id: "name", label: "Name", minWidth: 200 },
  { id: "email", label: "Email", minWidth: 200 },
  { id: "phone", label: "Phone", minWidth: 150 },
  { id: "role", label: "Role", minWidth: 150 },
  { id: "department", label: "Department", minWidth: 150 },
  { id: "status", label: "Status", minWidth: 120, align: "center" },
  { id: "employmentType", label: "Employment Type", minWidth: 150 },
  { id: "hireDate", label: "Hire Date", minWidth: 120 },
  { id: "salary", label: "Salary", minWidth: 120, align: "right" },
  { id: "hourlyRate", label: "Hourly Rate", minWidth: 120, align: "right" },
  { id: "payType", label: "Pay Type", minWidth: 120 },
  { id: "manager", label: "Manager", minWidth: 150 },
  { id: "address", label: "Address", minWidth: 200 },
  { id: "city", label: "City", minWidth: 120 },
  { id: "state", label: "State", minWidth: 100 },
  { id: "country", label: "Country", minWidth: 120 },
  { id: "dateOfBirth", label: "Date of Birth", minWidth: 120 },
  { id: "nationalInsuranceNumber", label: "NI Number", minWidth: 150 },
  { id: "emergencyContact", label: "Emergency Contact", minWidth: 200 },
  { id: "holidaysPerYear", label: "Holidays/Year", minWidth: 120, align: "right" },
  { id: "hoursPerWeek", label: "Hours/Week", minWidth: 120, align: "right" },
  { id: "actions", label: "Actions", minWidth: 120, align: "center" }
]

const DEFAULT_VISIBLE_COLUMNS = [
  "photo", "name", "email", "phone", "role", "department", "status", "hireDate", "actions"
]

const EmployeeList: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "employees")
  const canRemove = canDelete("hr", "employees")
  const { state: companyState } = useCompany()
  const { state: settingsState } = useSettings()
  const {
    state: hrState,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    generateJoinCode,
    fetchContractTemplates,
    createContract,
    initializeDefaultContractTemplates,
  } = useHR()

  // State hooks
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterDepartment, setFilterDepartment] = useState<string[]>([])
  const [filterEmploymentType, setFilterEmploymentType] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "warning" | "info"
  }>({
    open: false,
    message: "",
    severity: "info"
  })
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null)
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)

  // Filter states for DataHeader
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Employee form top actions
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [formLink, setFormLink] = useState("")
  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [contractTitle, setContractTitle] = useState("")
  const [contractBody, setContractBody] = useState("")
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [terminateConfirmText, setTerminateConfirmText] = useState("")
  const [terminating, setTerminating] = useState(false)

  // Column configuration for DataHeader
  const columns = EMPLOYEE_COLUMNS
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(EMPLOYEE_COLUMNS.map(col => [col.id, DEFAULT_VISIBLE_COLUMNS.includes(col.id)]))
  )

  // Sync columnVisibility with visibleColumns
  useEffect(() => {
    const newVisibility: Record<string, boolean> = {}
    EMPLOYEE_COLUMNS.forEach(col => {
      newVisibility[col.id] = visibleColumns.includes(col.id)
    })
    setColumnVisibility(newVisibility)
  }, [visibleColumns])

  // Sync visibleColumns with columnVisibility changes from DataHeader
  const handleColumnVisibilityChange = useCallback((visibility: Record<string, boolean>) => {
    setColumnVisibility(visibility)
    const newVisibleColumns = Object.entries(visibility)
      .filter(([_, isVisible]) => isVisible)
      .map(([key, _]) => key)
    setVisibleColumns(newVisibleColumns)
  }, [])

  // Sync filter states with DataHeader filters
  useEffect(() => {
    setFilterDepartment(selectedDepartments)
  }, [selectedDepartments])

  useEffect(() => {
    setFilterRole(selectedRoles)
  }, [selectedRoles])

  useEffect(() => {
    setFilterStatus(selectedStatuses)
  }, [selectedStatuses])

  // New CRUD Modal state
  const [employeeCRUDModalOpen, setEmployeeCRUDModalOpen] = useState(false)
  const [selectedEmployeeForCRUD, setSelectedEmployeeForCRUD] = useState<Employee | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const employeeCRUDFormRef = useRef<EmployeeCRUDFormHandle | null>(null)


  // Load data on component mount
  // Note: Data is now loaded automatically by HRContext with progressive loading and caching
  // No need to manually refresh - context handles all data loading efficiently
  // Only refresh if explicitly needed (e.g., after creating/updating data)
  useEffect(() => {
    // Data is available from context automatically
    // Safely handle undefined values
    // keep quiet
  }, [hrState?.employees?.length, hrState?.roles?.length, hrState?.departments?.length])

  // Note: Roles are loaded automatically by HRContext with progressive loading
  // No need to manually refresh - context handles all data loading efficiently

  // Filtered and sorted employees
  const filteredEmployees = useMemo(() => {
    // Safely handle undefined hrState or employees
    if (!hrState || !hrState.employees || !Array.isArray(hrState.employees)) {
      return []
    }
    
    const filtered = hrState.employees.filter((employee) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        employee.firstName?.toLowerCase().includes(searchLower) ||
        employee.lastName?.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.phone?.includes(searchQuery) ||
        employee.position?.toLowerCase().includes(searchLower)
      
      // Role filter - check multiple possible field names (roleID, roleId, role)
      const employeeRoleId = (employee as any).roleID || employee.roleId || employee.role
      const matchesRole = filterRole.length === 0 || 
        (employeeRoleId && filterRole.includes(employeeRoleId))
      
      // Status filter - be more lenient, include employees without status if no filter applied
      // Default to "active" if status is missing and isActive is true
      const employeeStatus = employee.status || ((employee as any).isActive === true ? "active" : undefined)
      const matchesStatus = filterStatus.length === 0 || 
        (employeeStatus && filterStatus.includes(employeeStatus))
      
      // Department filter - use departmentId (the ID field) for matching
      // The filter values are department IDs from the dropdown
      const employeeDepartmentId = employee.departmentId || (employee as any).departmentID || (employee as any).departmentId
      const matchesDepartment = filterDepartment.length === 0 || 
        (employeeDepartmentId && filterDepartment.includes(employeeDepartmentId))
      
      // Employment type filter
      const matchesEmploymentType = filterEmploymentType.length === 0 || 
        (employee.employmentType && filterEmploymentType.includes(employee.employmentType))
      
      const matches = matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesEmploymentType
      
      return matches
    })
    
    return filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case "name":
          aValue = `${a.firstName || ""} ${a.lastName || ""}`
          bValue = `${b.firstName || ""} ${b.lastName || ""}`
          break
        case "hireDate":
          aValue = new Date(a.hireDate || 0)
          bValue = new Date(b.hireDate || 0)
          break
        case "salary":
          aValue = a.salary || 0
          bValue = b.salary || 0
          break
        case "hourlyRate":
          aValue = a.hourlyRate || 0
          bValue = b.hourlyRate || 0
          break
        default:
          aValue = a[sortBy as keyof Employee] || ""
          bValue = b[sortBy as keyof Employee] || ""
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [hrState.employees, searchQuery, filterRole, filterStatus, filterDepartment, filterEmploymentType, sortBy, sortOrder])

  // Paginated employees
  const paginatedEmployees = useMemo(() => {
    const startIndex = page * rowsPerPage
    return filteredEmployees.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredEmployees, page, rowsPerPage])

  // Get role name by ID (for filters)
  const getRoleNameById = useCallback((roleId?: string) => {
    if (!roleId || !hrState || !hrState.roles || !Array.isArray(hrState.roles)) return "N/A"
    const role = hrState.roles.find(r => r.id === roleId)
    return role?.label || role?.name || roleId
  }, [hrState.roles])

  // Get role name from employee object
  const getRoleName = useCallback((employee?: Employee) => {
    if (!hrState || !hrState.roles || !Array.isArray(hrState.roles)) {
      return "N/A"
    }
    
    if (!employee) {
      return "N/A"
    }
    
    // Get roleID from employee (note: backend uses roleID with capital ID)
    const roleId = (employee as any).roleID || employee.roleId
    
    if (!roleId) {
      return "N/A"
    }
    
    // Try to find role by ID
    const role = hrState.roles.find(r => r.id === roleId)
    if (role) {
      const roleName = role.label || role.name || roleId
      return roleName
    }
    
    // If not found by ID, try to find by name (in case roleId is actually a name)
    const roleByName = hrState.roles.find(r => 
      r.name === roleId || r.label === roleId
    )
    if (roleByName) {
      const roleName = roleByName.label || roleByName.name || roleId
      return roleName
    }
    
    return roleId || "Unknown Role"
  }, [hrState.roles])

  // Get department name (handles both ID and name)
  const getDepartmentName = useCallback((departmentValue?: string) => {
    if (!departmentValue || !hrState || !hrState.departments || !Array.isArray(hrState.departments)) return "N/A"
    
    // If departments are loaded, try to find by ID first
    if (hrState.departments.length > 0) {
      const departmentById = hrState.departments.find(d => d.id === departmentValue)
      if (departmentById) {
        return departmentById.name
      }
      
      // If not found by ID, check if it's already a department name
      const departmentByName = hrState.departments.find(d => d.name === departmentValue)
      if (departmentByName) {
        return departmentValue // Return the name as-is
      }
    }
    
    // If no departments loaded or not found, assume it's already a name
    return departmentValue
  }, [hrState.departments])

  // Format date
  const formatDate = useCallback((timestamp?: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleDateString()
  }, [])

  // Format currency
  const formatCurrency = useCallback((amount?: number) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }, [])

  // Convert text to title case (First Letter Capital, rest lowercase)
  const toTitleCase = useCallback((text: string) => {
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }, [])

  // New CRUD Modal handlers
  const handleOpenEmployeeCRUD = useCallback((employee: Employee | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedEmployeeForCRUD(employee)
    setCrudMode(mode)
    setEmployeeCRUDModalOpen(true)
  }, [canMutate])

  const handleCloseEmployeeCRUD = useCallback(() => {
    setEmployeeCRUDModalOpen(false)
    setSelectedEmployeeForCRUD(null)
    setCrudMode('create')
  }, [])

  const handleViewEmployee = useCallback((employee: Employee) => {
    handleOpenEmployeeCRUD(employee, 'view')
  }, [handleOpenEmployeeCRUD])

  const handleEditEmployee = useCallback((employee: Employee) => {
    handleOpenEmployeeCRUD(employee, 'edit')
  }, [handleOpenEmployeeCRUD])

  const handleDeleteClick = useCallback((employee: Employee) => {
    if (!canRemove) return
    setEmployeeToDelete(employee)
    setDeleteConfirmOpen(true)
  }, [canRemove])

  const handleSaveEmployeeCRUD = useCallback(async (employeeData: any) => {
    try {
      if (crudMode === 'create') {
        await addEmployee(employeeData)
        setNotification({
          open: true,
          message: "Employee created successfully!",
          severity: "success"
        })
      } else if (crudMode === 'edit' && selectedEmployeeForCRUD) {
        await updateEmployee(selectedEmployeeForCRUD.id, employeeData)
        setNotification({
          open: true,
          message: "Employee updated successfully!",
          severity: "success"
        })
      }
      handleCloseEmployeeCRUD()
      // Data will update automatically via HRContext listeners - no manual refresh needed
    } catch (error) {
      console.error("Error saving employee:", error)
      setNotification({
        open: true,
        message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} employee. Please try again.`,
        severity: "error"
      })
    }
  }, [crudMode, selectedEmployeeForCRUD, addEmployee, updateEmployee, handleCloseEmployeeCRUD])

  const handleInviteEmployee = useCallback(async () => {
    if (!selectedEmployeeForCRUD?.id) return
    try {
      const code = await generateJoinCode(selectedEmployeeForCRUD.roleId || "employee", selectedEmployeeForCRUD.id)
      const origin = window.location.origin
      const basePath = '/app' // Match the basename in main.tsx
      const link = `${origin}${basePath}/JoinCompany?code=${encodeURIComponent(code)}`
      const formLinkWithCode = `${origin}${basePath}/EmployeeOnboarding?code=${encodeURIComponent(code)}`
      setInviteLink(link)
      setFormLink(formLinkWithCode)
      setInviteDialogOpen(true)
      setNotification({
        open: true,
        message: "Invite link generated",
        severity: "success",
      })
    } catch (error) {
      console.error("Failed to generate/copy invite link:", error)
      setNotification({
        open: true,
        message: "Failed to generate invite link",
        severity: "error",
      })
    }
  }, [generateJoinCode, selectedEmployeeForCRUD?.id, selectedEmployeeForCRUD?.roleId])

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setNotification({ open: true, message: "Invite link copied to clipboard", severity: "success" })
    } catch {
      setNotification({ open: true, message: "Failed to copy invite link", severity: "error" })
    }
  }, [inviteLink])

  const openGenerateContract = useCallback(async () => {
    if (!selectedEmployeeForCRUD?.id) return
    try {
      setLoadingTemplates(true)
      
      // First, check if templates are already in state (cached)
      let templates = hrState.contractTemplates || []
      
      // Only fetch from database if templates are not in state
      if (templates.length === 0) {
        // Initialize default templates if none exist
        await initializeDefaultContractTemplates()
        // Fetch templates from database
        templates = await fetchContractTemplates()
      }
      
      const activeTemplates = templates.filter(t => t.active)
      setContractTemplates(activeTemplates)
      const first = activeTemplates[0]
      if (first) {
        setSelectedTemplateId(first.id)
        setContractTitle(`${first.name} - ${selectedEmployeeForCRUD.firstName} ${selectedEmployeeForCRUD.lastName}`)
        setContractBody(first.bodyHtml)
      } else {
        setSelectedTemplateId("")
        setContractTitle(`Employment Contract - ${selectedEmployeeForCRUD.firstName} ${selectedEmployeeForCRUD.lastName}`)
        setContractBody("<h2>Employment Contract</h2>")
      }
      setContractDialogOpen(true)
    } catch (error) {
      console.error("Failed to load contract templates:", error)
      setNotification({ open: true, message: "Failed to load contract templates", severity: "error" })
    } finally {
      setLoadingTemplates(false)
    }
  }, [fetchContractTemplates, initializeDefaultContractTemplates, selectedEmployeeForCRUD, hrState.contractTemplates])

  const handleCreateEmployeeContract = useCallback(async () => {
    if (!selectedEmployeeForCRUD?.id) return
    const employee = selectedEmployeeForCRUD
    try {
      const now = Date.now()
      const template = contractTemplates.find(t => t.id === selectedTemplateId)
      const createdBy =
        (settingsState.user as unknown as { uid?: string; userID?: string } | null | undefined)?.uid ||
        (settingsState.user as unknown as { uid?: string; userID?: string } | null | undefined)?.userID ||
        "system"

      // Build contract data and filter out undefined values (Firebase doesn't accept undefined)
      const contractDataRaw: any = {
        employeeId: employee.id,
        type: template?.defaultType || "permanent",
        startDate: now,
        probationPeriod: template?.defaultProbationMonths,
        salary: employee.salary || 0,
        benefits: template?.defaultBenefits || [],
        terms: template?.terms || [],
        workingHours: employee.hoursPerWeek ? `${employee.hoursPerWeek} hours/week` : undefined,
        holidayEntitlement: employee.holidaysPerYear ? `${employee.holidaysPerYear} days/year` : undefined,
        status: "draft",
        createdBy,
        createdAt: now,
        updatedAt: now,
        templateId: template?.id,
        roleId: employee.roleId,
        roleName: employee.roleId ? (hrState.roles?.find(r => r.id === employee.roleId)?.label || hrState.roles?.find(r => r.id === employee.roleId)?.name) : undefined,
        contractTitle,
        bodyHtml: contractBody,
      }
      
      // Only include endDate if it's defined (for fixed_term contracts)
      if (contractDataRaw.type === 'fixed_term') {
        // You can set endDate here if needed, otherwise omit it
      }

      // Remove undefined values before sending to Firebase
      const contractData: Omit<Contract, "id"> = Object.fromEntries(
        Object.entries(contractDataRaw).filter(([_, value]) => value !== undefined)
      ) as Omit<Contract, "id">

      await createContract(contractData)
      // Data will update automatically via HRContext listeners - no manual refresh needed
      setNotification({ open: true, message: "Contract created", severity: "success" })
      setContractDialogOpen(false)
    } catch (error) {
      console.error("Failed to create contract:", error)
      setNotification({ open: true, message: "Failed to create contract", severity: "error" })
    }
  }, [contractBody, contractTemplates, contractTitle, createContract, hrState.roles, selectedEmployeeForCRUD, selectedTemplateId, settingsState.user])

  const openTerminateEmployee = useCallback(() => {
    if (!selectedEmployeeForCRUD?.id) return
    setTerminateConfirmText("")
    setTerminateDialogOpen(true)
  }, [selectedEmployeeForCRUD?.id])

  const handleConfirmTerminate = useCallback(async () => {
    if (!selectedEmployeeForCRUD?.id) return
    if (terminateConfirmText.trim().toUpperCase() !== "TERMINATE") return

    const employee = selectedEmployeeForCRUD
    const now = Date.now()
    const companyId = companyState.companyID || employee.companyId || ""
    const userId = employee.userId

    try {
      setTerminating(true)
      const employeeUpdate: Partial<Employee> = {
        status: "terminated",
        terminationDate: now,
        leavingDate: now,
        updatedAt: now,
      }
      await updateEmployee(employee.id, employeeUpdate)

      // If employee is linked to a user, revoke membership and mark account terminated (best-effort)
      if (companyId && userId) {
        await Promise.allSettled([
          remove(ref(db, `users/${userId}/companies/${companyId}`)),
          remove(ref(db, `companies/${companyId}/users/${userId}`)),
          rtdbUpdate(ref(db, `users/${userId}`), {
            accountStatus: "terminated",
            terminatedAt: now,
            currentCompanyID: "",
          }),
        ])
      }

      setNotification({
        open: true,
        message: `${employee.firstName} ${employee.lastName} has been terminated.`,
        severity: "success",
      })
      setTerminateDialogOpen(false)
      setTerminateConfirmText("")
      // Data will update automatically via HRContext listeners - no manual refresh needed
    } catch (error) {
      console.error("Failed to terminate employee:", error)
      setNotification({ open: true, message: "Failed to terminate employee", severity: "error" })
    } finally {
      setTerminating(false)
    }
  }, [companyState.companyID, selectedEmployeeForCRUD, terminateConfirmText, updateEmployee])

  const employeeTopBarActions = useMemo(() => {
    // Only show these actions for an existing employee (not create mode).
    const employeeId = selectedEmployeeForCRUD?.id || (selectedEmployeeForCRUD as any)?.employeeID
    if (!employeeId || crudMode === "create") return undefined
    
    // Check if employee has a contract
    const hasContract = hrState.contracts?.some(
      (contract: any) => contract.employeeId === employeeId
    ) || false
    
    // Check if employee has linked their account (has userId)
    const hasLinkedAccount = !!(selectedEmployeeForCRUD?.userId || (selectedEmployeeForCRUD as any)?.userID)
    
    return (
      <Box sx={{ display: "flex", gap: 1 }} onClick={(e) => e.stopPropagation()}>
        {!hasLinkedAccount && (
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={(e) => {
              e.stopPropagation()
              void handleInviteEmployee()
            }}
            size="small"
            sx={{
              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
              color: 'inherit',
              borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
              '&:hover': {
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
              },
            }}
          >
            Invite Employee
          </Button>
        )}
        {!hasContract && (
          <Button
            variant="outlined"
            startIcon={loadingTemplates ? <CircularProgress size={16} /> : <ContractIcon />}
            onClick={(e) => {
              e.stopPropagation()
              void openGenerateContract()
            }}
            size="small"
            disabled={loadingTemplates}
            sx={{
              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1),
              color: 'inherit',
              borderColor: alpha(themeConfig.brandColors.offWhite, 0.3),
              '&:hover': {
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
                borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
              },
              '&:disabled': {
                bgcolor: alpha(themeConfig.brandColors.offWhite, 0.05),
                color: alpha(themeConfig.brandColors.offWhite, 0.5),
                borderColor: alpha(themeConfig.brandColors.offWhite, 0.1),
              },
            }}
          >
            Generate Contract
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<PersonOffIcon />}
          onClick={(e) => {
            e.stopPropagation()
            openTerminateEmployee()
          }}
          size="small"
          disabled={selectedEmployeeForCRUD?.status === "terminated"}
          sx={{
            bgcolor: alpha(themeConfig.brandColors.offWhite, 0.2),
            color: 'inherit',
            '&:hover': {
              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.3),
            },
            '&:disabled': {
              bgcolor: alpha(themeConfig.brandColors.offWhite, 0.05),
              color: alpha(themeConfig.brandColors.offWhite, 0.5),
            },
          }}
        >
          Terminate
        </Button>
      </Box>
    )
  }, [crudMode, handleInviteEmployee, loadingTemplates, openGenerateContract, openTerminateEmployee, selectedEmployeeForCRUD, hrState.contracts])

  // Filter roles based on selected departments - MUST be before early returns
  const filteredRoles = useMemo(() => {
    if (!hrState.roles || hrState.roles.length === 0) return []
    
    // If no departments are selected, show all roles
    if (selectedDepartments.length === 0) {
      return hrState.roles
    }
    
    // Otherwise, only show roles that belong to selected departments
    const filtered = hrState.roles.filter(role => {
      // Check both departmentId (primary) and department (fallback) fields
      const roleDeptId = role.departmentId || (role as any).departmentID || (role as any).department
      return roleDeptId && selectedDepartments.includes(roleDeptId)
    })

    return filtered
  }, [hrState.roles, selectedDepartments])

  // Clear selected roles that are no longer valid when departments change - MUST be before early returns
  useEffect(() => {
    if (selectedDepartments.length > 0 && selectedRoles.length > 0 && hrState.roles) {
      const validRoles = selectedRoles.filter(roleId => {
        const role = hrState.roles?.find(r => r.id === roleId)
        if (!role) return false
        // Check both departmentId (primary) and department (fallback) fields
        const roleDeptId = role.departmentId || (role as any).departmentID || (role as any).department
        return roleDeptId && selectedDepartments.includes(roleDeptId)
      })
      
      if (validRoles.length !== selectedRoles.length) {
        setSelectedRoles(validRoles)
      }
    } else if (selectedDepartments.length === 0 && selectedRoles.length > 0) {
      // If no departments selected, keep all selected roles
      // (no need to clear them)
    }
  }, [selectedDepartments, hrState.roles, selectedRoles])

  const visibleColumnConfigs = EMPLOYEE_COLUMNS.filter(col => visibleColumns.includes(col.id))

  if (hrState.error && hrState.error.includes("employee")) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error loading employee data: {hrState.error}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Reusable Data Header */}
      <DataHeader
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search employees..."
        showDateControls={false}
        filters={[
          {
            label: "Department",
            options: (hrState.departments || []).map(dept => ({ id: dept.id, name: dept.name })),
            selectedValues: selectedDepartments.map(id => {
              const dept = hrState.departments?.find(d => d.id === id)
              return dept?.name || "Unknown"
            }),
            onSelectionChange: (names) => {
              const ids = names.map(name => {
                const dept = hrState.departments?.find(d => d.name === name)
                return dept?.id || name
              })
              setSelectedDepartments(ids)
            }
          },
          {
            label: "Role", 
            options: filteredRoles.map(role => ({ id: role.id, name: role.label || role.name })),
            selectedValues: selectedRoles
              .map(id => {
                // Only include roles that are in the filtered list
                const role = filteredRoles.find(r => r.id === id)
                return role ? (role.label || role.name) : null
              })
              .filter((name): name is string => name !== null),
            onSelectionChange: (names) => {
              // Only allow selection of roles that are in filteredRoles
              const ids = names
                .map(name => {
                  const role = filteredRoles.find(r => (r.label || r.name) === name)
                  return role?.id || null
                })
                .filter((id): id is string => id !== null)
              setSelectedRoles(ids)
            }
          },
          {
            label: "Status",
            options: [
              { id: "active", name: "Active" },
              { id: "inactive", name: "Inactive" },
              { id: "terminated", name: "Terminated" },
              { id: "on_leave", name: "On Leave" }
            ],
            selectedValues: selectedStatuses.map(id => {
              const statusMap: Record<string, string> = {
                "active": "Active",
                "inactive": "Inactive",
                "terminated": "Terminated",
                "on_leave": "On Leave"
              }
              return statusMap[id] || "Unknown"
            }),
            onSelectionChange: (names) => {
              const statusMap: Record<string, string> = {
                "Active": "active",
                "Inactive": "inactive",
                "Terminated": "terminated",
                "On Leave": "on_leave"
              }
              const ids = names.map(name => statusMap[name] || name.toLowerCase())
              setSelectedStatuses(ids)
            }
          }
        ]}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        columns={columns.map(col => ({ key: col.id, label: col.label }))}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "department", label: "Department" },
          { value: "role", label: "Role" },
          { value: "hireDate", label: "Hire Date" },
          { value: "status", label: "Status" }
        ]}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={(value, direction) => {
          setSortBy(value)
          setSortOrder(direction)
        }}
        onExportCSV={() => {
          try {
            // Create CSV content
            const headers = visibleColumnConfigs.map(col => col.label)
            const rows = filteredEmployees.map(employee => {
              return visibleColumnConfigs.map(col => {
                let value: any
                switch (col.id) {
                  case "photo":
                    return ""
                  case "name":
                    return `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
                  case "role":
                    return getRoleName(employee)
                  case "department":
                    return getDepartmentName(
                      employee.departmentId ||
                        (employee as any).departmentID ||
                        (employee as any).department
                    )
                  case "status":
                    return toTitleCase(employee.status || "")
                  case "hireDate":
                  case "dateOfBirth":
                    return formatDate(employee[col.id as keyof Employee] as number)
                  case "salary":
                  case "hourlyRate":
                    return formatCurrency(employee[col.id as keyof Employee] as number).replace(/[£,]/g, "")
                  case "emergencyContact":
                    return employee.emergencyContact ? 
                      `${employee.emergencyContact.name} (${employee.emergencyContact.relationship})` : ""
                  case "address":
                    const addr = employee.address as any
                    return addr?.street ? `${addr.street}, ${addr.city || ''}`.trim() : ""
                  case "actions":
                    return ""
                  default:
                    value = employee[col.id as keyof Employee]
                    if (typeof value === "string" || typeof value === "number") {
                      return String(value || "")
                    }
                    return ""
                }
              })
            })

            // Convert to CSV string
            const csvContent = [
              headers.join(","),
              ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            ].join("\n")

            // Create blob and download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const link = document.createElement("a")
            const url = URL.createObjectURL(blob)
            link.setAttribute("href", url)
            link.setAttribute("download", `employees_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = "hidden"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setNotification({ 
              open: true, 
              message: `Exported ${filteredEmployees.length} employees to CSV`, 
              severity: "success" 
            })
          } catch (error) {
            console.error("Export error:", error)
            setNotification({ 
              open: true, 
              message: "Failed to export CSV. Please try again.", 
              severity: "error" 
            })
          }
        }}
        onCreateNew={() => handleOpenEmployeeCRUD(null, 'create')}
        createButtonLabel="Add Employee"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit employees."
      />

      {/* Employee Table */}
      <Paper sx={{ width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 400 }}>
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {visibleColumnConfigs.map((column) => (
                  <TableCell
                    key={column.id}
                    align="center"
                    style={{ minWidth: column.minWidth }}
                    sx={{ 
                      textAlign: 'center !important',
                      padding: '16px 16px',
                      cursor: column.id !== "actions" && column.id !== "photo" ? "pointer" : "default",
                      userSelect: 'none',
                      '&:hover': {
                        backgroundColor: column.id !== "actions" && column.id !== "photo" ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                      }
                    }}
                    onClick={() => {
                      if (column.id !== "actions" && column.id !== "photo") {
                        if (sortBy === column.id) {
                          setSortOrder(prev => prev === "asc" ? "desc" : "asc")
                        } else {
                          setSortBy(column.id)
                          setSortOrder("asc")
                        }
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 0.5
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {column.label}
                      </Typography>
                      {sortBy === column.id && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedEmployees.map((employee) => (
                <TableRow 
                  hover 
                  key={employee.id}
                  onClick={() => handleViewEmployee(employee)}
                  sx={{ 
                    cursor: "pointer",
                    '& > td': {
                      paddingTop: 1,
                      paddingBottom: 1,
                    }
                  }}
                >
                  {visibleColumnConfigs.map((column) => (
                    <TableCell key={column.id} align="center" sx={{ verticalAlign: 'middle' }}>
                      {(() => {
                        switch (column.id) {
                          case "photo":
                            return (
                              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Avatar
                                  src={employee.photo}
                                  sx={{ width: 40, height: 40 }}
                                >
                                  <PersonIcon />
                                </Avatar>
                              </Box>
                            )
                          case "name":
                            return `${employee.firstName || ""} ${employee.lastName || ""}`
                          case "role":
                            return getRoleName(employee)
                          case "department":
                            return getDepartmentName(
                              employee.departmentId ||
                                (employee as any).departmentID ||
                                (employee as any).department
                            )
                          case "status":
                            const statusColors = {
                              active: "success",
                              inactive: "default",
                              on_leave: "warning",
                              terminated: "error"
                            } as const
                            return (
                              <Chip
                                label={toTitleCase(employee.status || "")}
                                color={statusColors[employee.status as keyof typeof statusColors] || "default"}
                                size="small"
                              />
                            )
                          case "hireDate":
                          case "dateOfBirth":
                            return formatDate(employee[column.id as keyof Employee] as number)
                          case "salary":
                          case "hourlyRate":
                            return formatCurrency(employee[column.id as keyof Employee] as number)
                          case "emergencyContact":
                            return employee.emergencyContact ? 
                              `${employee.emergencyContact.name} (${employee.emergencyContact.relationship})` : "N/A"
                          case "actions":
                            return (
                              <Box display="flex" gap={1} justifyContent="center">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled={!canMutate}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditEmployee(employee)
                                  }}
                                  title={canMutate ? "Edit" : "No permission to edit"}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={!canRemove}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!canRemove) return
                                    handleDeleteClick(employee)
                                  }}
                                  title={canRemove ? "Delete" : "No permission to delete"}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            )
                          default:
                            const value = employee[column.id as keyof Employee]
                            // Handle address object
                            if (column.id === "address" && value && typeof value === "object") {
                              const addr = value as any
                              return addr.street ? `${addr.street}, ${addr.city || ''}`.trim() : "N/A"
                            }
                            if (typeof value === "string" || typeof value === "number") {
                              return value || "N/A"
                            }
                            return "N/A"
                        }
                      })()}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {paginatedEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumnConfigs.length} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={PersonIcon}
                      title="No employees found"
                      description="Try adjusting your search or filters."
                      cardSx={{ maxWidth: 560, mx: "auto" }}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination - Fixed at bottom */}
        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredEmployees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
          />
        </Box>
      </Paper>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ open: false, message: "", severity: "info" })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ open: false, message: "", severity: "info" })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{ sx: { width: 300, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
            Filter Options
          </Typography>
          
          {/* Role Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              value={filterRole}
              onChange={(e) => setFilterRole(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={getRoleNameById(value)} size="small" />
                  ))}
                </Box>
              )}
            >
              {hrState.roles?.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Checkbox checked={filterRole.indexOf(role.id) > -1} />
                  <ListItemText primary={role.label || role.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filterStatus}
              onChange={(e) => setFilterStatus(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Status" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={toTitleCase(value)} size="small" />
                  ))}
                </Box>
              )}
            >
              {["active", "inactive", "on_leave", "terminated"].map((status) => (
                <MenuItem key={status} value={status}>
                  <Checkbox checked={filterStatus.indexOf(status) > -1} />
                  <ListItemText primary={toTitleCase(status)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Department Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Departments</InputLabel>
            <Select
              multiple
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Departments" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={getDepartmentName(value)} size="small" />
                  ))}
                </Box>
              )}
            >
              {hrState.departments?.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  <Checkbox checked={filterDepartment.indexOf(department.id) > -1} />
                  <ListItemText primary={department.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Employment Type Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Employment Type</InputLabel>
            <Select
              multiple
              value={filterEmploymentType}
              onChange={(e) => setFilterEmploymentType(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Employment Type" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={toTitleCase(value)} size="small" />
                  ))}
                </Box>
              )}
            >
              {["full_time", "part_time", "contract", "temporary"].map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={filterEmploymentType.indexOf(type) > -1} />
                  <ListItemText primary={toTitleCase(type)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              size="small"
              onClick={() => {
                setFilterRole([])
                setFilterStatus([])
                setFilterDepartment([])
                setFilterEmploymentType([])
              }}
            >
              Clear All
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setFilterMenuAnchor(null)}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{ sx: { width: 250, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
            Column Visibility
          </Typography>
          
          {EMPLOYEE_COLUMNS.map((column) => (
            <MenuItem
              key={column.id}
              onClick={() => {
                if (visibleColumns.includes(column.id)) {
                  setVisibleColumns(prev => prev.filter(id => id !== column.id))
                } else {
                  setVisibleColumns(prev => [...prev, column.id])
                }
              }}
            >
              <Checkbox checked={visibleColumns.includes(column.id)} />
              <ListItemText primary={column.label} />
            </MenuItem>
          ))}
          
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
            <Button
              size="small"
              onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
            >
              Reset Default
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setColumnMenuAnchor(null)}
            >
              Done
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete employee{" "}
            <strong>
              {employeeToDelete?.firstName} {employeeToDelete?.lastName}
            </strong>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={async () => {
              if (employeeToDelete) {
                try {
                  await deleteEmployee(employeeToDelete.id)
                  setNotification({ open: true, message: "Employee deleted successfully", severity: "success" })
                  setDeleteConfirmOpen(false)
                  setEmployeeToDelete(null)
                } catch (error) {
                  setNotification({ open: true, message: "Failed to delete employee", severity: "error" })
                }
              }
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* New CRUD Modal */}
            <CRUDModal
        open={employeeCRUDModalOpen}
        onClose={(reason) => {
          setEmployeeCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseEmployeeCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "employeeListModal1",
          crudMode,
          id: selectedEmployeeForCRUD?.id,
          itemLabel: selectedEmployeeForCRUD ? `${selectedEmployeeForCRUD.firstName || ""} ${selectedEmployeeForCRUD.lastName || ""}`.trim() : undefined,
        }}
      >
        <EmployeeCRUDForm
          ref={employeeCRUDFormRef}
          employee={selectedEmployeeForCRUD}
          mode={crudMode}
          onSave={handleSaveEmployeeCRUD}
        />
      </CRUDModal>

      {/* Invite Employee Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Invite Type</InputLabel>
              <Select
                value="direct"
                label="Invite Type"
                onChange={(e) => {
                  // Handle form vs direct link
                }}
              >
                <MenuItem value="direct">Direct Join Link</MenuItem>
                <MenuItem value="form">Onboarding Form (with document upload)</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Invite Link"
              value={inviteLink}
              InputProps={{ readOnly: true }}
            />
            
            <TextField
              fullWidth
              label="Onboarding Form Link"
              value={formLink}
              InputProps={{ readOnly: true }}
              helperText="This link includes a form for the employee to fill out their details and upload right-to-work documents"
            />
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Share via:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={() => {
                    if (!selectedEmployeeForCRUD?.email) {
                      setNotification({
                        open: true,
                        message: "Employee email is required",
                        severity: "warning",
                      })
                      return
                    }
                    const subject = encodeURIComponent(`Join ${companyState.companyName || "our company"} as an employee`)
                    const body = encodeURIComponent(
                      `Hello ${selectedEmployeeForCRUD.firstName},\n\n` +
                      `You've been invited to join ${companyState.companyName || "our company"} as an employee.\n\n` +
                      `Please click the link below to get started:\n${inviteLink}\n\n` +
                      `Or use the onboarding form to fill out your details:\n${formLink}\n\n` +
                      `Thank you!`
                    )
                    window.open(`mailto:${selectedEmployeeForCRUD.email}?subject=${subject}&body=${body}`, "_blank")
                  }}
                  disabled={!selectedEmployeeForCRUD?.email}
                >
                  Email
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => {
                    if (!selectedEmployeeForCRUD?.phone) {
                      setNotification({
                        open: true,
                        message: "Employee phone number is required",
                        severity: "warning",
                      })
                      return
                    }
                    const phoneNumber = selectedEmployeeForCRUD.phone.replace(/\D/g, '')
                    const text = encodeURIComponent(
                      `Hello ${selectedEmployeeForCRUD.firstName}, you've been invited to join ${companyState.companyName || "our company"}. ` +
                      `Click here to get started: ${inviteLink} Or use the onboarding form: ${formLink}`
                    )
                    window.open(`https://wa.me/${phoneNumber}?text=${text}`, "_blank")
                  }}
                  disabled={!selectedEmployeeForCRUD?.phone}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={() => void handleCopyInviteLink()}
                  disabled={!inviteLink}
                >
                  Copy Link
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Generate Contract Dialog */}
      <Dialog
        open={contractDialogOpen}
        onClose={() => setContractDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Generate Contract</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Template</InputLabel>
            <Select
              value={selectedTemplateId}
              label="Template"
              onChange={(e) => {
                const id = String(e.target.value)
                setSelectedTemplateId(id)
                const tpl = contractTemplates.find(t => t.id === id)
                if (tpl && selectedEmployeeForCRUD) {
                  setContractTitle(`${tpl.name} - ${selectedEmployeeForCRUD.firstName} ${selectedEmployeeForCRUD.lastName}`)
                  setContractBody(tpl.bodyHtml)
                }
              }}
            >
              {contractTemplates.map((tpl) => (
                <MenuItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Contract Title"
            value={contractTitle}
            onChange={(e) => setContractTitle(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Body (HTML)"
            value={contractBody}
            onChange={(e) => setContractBody(e.target.value)}
            multiline
            minRows={6}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => void handleCreateEmployeeContract()} disabled={!contractTitle || !selectedEmployeeForCRUD?.id}>
            Create Contract
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminate Employee Dialog */}
      <Dialog
        open={terminateDialogOpen}
        onClose={() => setTerminateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Terminate Employee</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This will mark the employee as terminated{selectedEmployeeForCRUD?.userId ? " and attempt to revoke their access" : ""}.
            Type <strong>TERMINATE</strong> to confirm.
          </Alert>
          <TextField
            fullWidth
            label='Type "TERMINATE" to confirm'
            value={terminateConfirmText}
            onChange={(e) => setTerminateConfirmText(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialogOpen(false)} disabled={terminating}>Close</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmTerminate()}
            disabled={terminating || terminateConfirmText.trim().toUpperCase() !== "TERMINATE"}
          >
            {terminating ? "Terminating..." : "Terminate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EmployeeList
