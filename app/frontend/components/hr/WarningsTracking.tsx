"use client"
import { useLocation } from "react-router-dom"

import React from "react"
import { useState, useEffect, useRef } from "react"
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
  Grid,
  Avatar,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from "@mui/icons-material"
import { useHRContext as useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import WarningCRUDForm, { type WarningCRUDFormHandle } from "./forms/WarningCRUDForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { THEME_COLORS } from "../../styles/themeColors"
// Company state is now handled through HRContext
// Functions now accessed through HRContext
// import type { Warning } from "../../../backend/interfaces/HRs" // Unused

interface WarningRecord {
  id: string
  employeeId: string
  employeeName: string
  type: "Verbal" | "Written" | "Final" | "Suspension" | "Termination"
  severity: "Low" | "Medium" | "High" | "Critical"
  category: "Attendance" | "Performance" | "Conduct" | "Safety" | "Policy Violation" | "Other"
  title: string
  description: string
  dateIssued: string
  issuedBy: string
  status: "Active" | "Resolved" | "Appealed" | "Expired"
  expiryDate?: string
  resolutionDate?: string
  resolutionNotes?: string
  followUpRequired: boolean
  followUpDate?: string
  attachments?: string[]
  createdAt: string
  updatedAt: string
}

const WarningsTracking: React.FC = () => {
  const location = useLocation()
  const { state: hrState, refreshWarnings, refreshEmployees, addWarning, updateWarning, deleteWarning } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "warnings")
  const canRemove = canDelete("hr", "warnings")
  // Company state is now handled through HRContext

  // Transform backend Warning objects to WarningRecord objects for the UI
  const warnings: WarningRecord[] = (hrState.warnings || []).map((warning): WarningRecord => {
    const employee = hrState.employees?.find(emp => emp.id === warning.employeeId)
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
    
    // Safe date creation with fallbacks
    const safeCreateDate = (dateValue: any) => {
      if (!dateValue) return new Date().toISOString()
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
    }
    
    const safeDateString = (dateValue: any) => {
      if (!dateValue) return new Date().toISOString().split('T')[0]
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0]
    }
    
    return {
      id: warning.id,
      employeeId: warning.employeeId,
      employeeName,
      type: warning.type === 'verbal' ? 'Verbal' : 
            warning.type === 'written' ? 'Written' : 
            warning.type === 'final' ? 'Final' : 
            warning.type === 'suspension' ? 'Suspension' : 'Verbal',
      severity: "Medium", // Default since Warning interface doesn't have severity
      category: "Other", // Default since Warning interface doesn't have category
      title: warning.reason || warning.description?.substring(0, 50) || 'Warning',
      description: warning.description,
      dateIssued: safeDateString(warning.issuedDate),
      issuedBy: warning.issuedBy,
      status: warning.status === 'active' ? 'Active' : 
              warning.status === 'resolved' ? 'Resolved' : 
              warning.status === 'expired' ? 'Expired' : 'Active',
      expiryDate: warning.expiryDate ? safeDateString(warning.expiryDate) : undefined,
      resolutionDate: undefined, // Backend doesn't have this
      resolutionNotes: warning.notes,
      followUpRequired: false, // Default since Warning interface doesn't have this
      followUpDate: undefined,
      attachments: [], // Backend doesn't have this
      createdAt: safeCreateDate(warning.createdAt),
      updatedAt: safeCreateDate(warning.updatedAt || warning.createdAt)
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedWarning] = useState<WarningRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [warningToDelete, setWarningToDelete] = useState<WarningRecord | null>(null)

  // New CRUD Modal state
  const [warningCRUDModalOpen, setWarningCRUDModalOpen] = useState(false)
  const [selectedWarningForCRUD, setSelectedWarningForCRUD] = useState<WarningRecord | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("dateIssued")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // DataHeader configuration
  const filters = [
    {
      label: "Severity",
      options: [
        { id: "Low", name: "Low", color: THEME_COLORS.success },
        { id: "Medium", name: "Medium", color: THEME_COLORS.warning },
        { id: "High", name: "High", color: THEME_COLORS.error },
        { id: "Critical", name: "Critical", color: THEME_COLORS.error },
      ],
      selectedValues: severityFilter,
      onSelectionChange: setSeverityFilter,
    },
    {
      label: "Status",
      options: [
        { id: "Active", name: "Active", color: THEME_COLORS.error },
        { id: "Resolved", name: "Resolved", color: THEME_COLORS.success },
        { id: "Appealed", name: "Appealed", color: THEME_COLORS.warning },
        { id: "Expired", name: "Expired", color: THEME_COLORS.divider },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
    {
      label: "Type",
      options: [
        { id: "Verbal", name: "Verbal", color: THEME_COLORS.lightBlue },
        { id: "Written", name: "Written", color: THEME_COLORS.warning },
        { id: "Final", name: "Final", color: THEME_COLORS.error },
        { id: "Suspension", name: "Suspension", color: THEME_COLORS.navy },
        { id: "Termination", name: "Termination", color: THEME_COLORS.error },
      ],
      selectedValues: typeFilter,
      onSelectionChange: setTypeFilter,
    },
  ]

  const sortOptions = [
    { value: "dateIssued", label: "Date Issued" },
    { value: "employeeName", label: "Employee" },
    { value: "severity", label: "Severity" },
    { value: "status", label: "Status" },
    { value: "type", label: "Type" },
    { value: "title", label: "Title" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortOrder(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedWarningForCRUD(null)
    setCrudMode('create')
    setWarningCRUDModalOpen(true)
  }


  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Type",
      "Severity",
      "Category",
      "Title",
      "Description",
      "Date Issued",
      "Issued By",
      "Status",
      "Expiry Date",
      "Follow Up Required",
      "Follow Up Date",
      "Resolution Date",
      "Resolution Notes",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredWarnings.map((warning) =>
        [
          `"${warning.employeeName}"`,
          warning.type,
          warning.severity,
          warning.category,
          `"${warning.title}"`,
          `"${warning.description.replace(/"/g, '""')}"`,
          warning.dateIssued,
          `"${warning.issuedBy}"`,
          warning.status,
          warning.expiryDate || "",
          warning.followUpRequired ? "Yes" : "No",
          warning.followUpDate || "",
          warning.resolutionDate || "",
          `"${warning.resolutionNotes || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `warnings_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Form state
  const [warningForm, setWarningForm] = useState({
    employeeId: "",
    type: "Verbal" as WarningRecord["type"],
    severity: "Medium" as WarningRecord["severity"],
    category: "Performance" as WarningRecord["category"],
    title: "",
    description: "",
    dateIssued: new Date().toISOString().split("T")[0],
    issuedBy: "",
    status: "Active" as WarningRecord["status"],
    expiryDate: "",
    followUpRequired: "false",
    followUpDate: "",
  })

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here; use explicit refresh actions instead.

  const loadWarnings = async () => {
    setLoading(true)
    try {
      // Note: Data is now loaded automatically by HRContext
      // Only refresh if explicitly needed (e.g., after creating/updating)
      // For now, just check if data is available from context
      if (hrState.employees.length === 0 || hrState.warnings.length === 0) {
        // Only refresh if data is missing
        await refreshEmployees()
        await refreshWarnings()
      }
      setError(null)
    } catch (err: any) {
      console.error("Error loading warnings:", err)
      setError(err.message || "Failed to load warnings")
    } finally {
      setLoading(false)
    }
  }

  // (removed placeholder)

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleFormChange = (field: string, value: any) => {
    if (field === "followUpRequired") {
      setWarningForm((prev) => ({ ...prev, [field]: value }))
    } else {
      setWarningForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async () => {
    if (!warningForm.employeeId || !warningForm.title || !warningForm.description) {
      setNotification({ message: "Please fill in all required fields", type: "error" })
      return
    }

    try {
      setLoading(true)
      // const employee = hrState.employees.find((emp) => emp.id === warningForm.employeeId) // Unused
      // const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown" // Unused

      const warningData = {
        employeeId: warningForm.employeeId,
        issuedBy: warningForm.issuedBy,
        issuedDate: new Date(warningForm.dateIssued).getTime(),
        type: warningForm.type.toLowerCase() as "verbal" | "written" | "final" | "suspension",
        reason: warningForm.title, // Use title as reason
        description: warningForm.description,
        consequences: "", // Not available in form
        improvementPlan: "", // Not available in form
        acknowledgement: {
          acknowledged: false,
          date: undefined,
          comments: undefined
        },
        expiryDate: warningForm.followUpDate ? new Date(warningForm.followUpDate).getTime() : undefined,
        status: "active" as const,
        witnesses: undefined, // Not available in form
        notes: "", // Not available in form
        createdAt: selectedWarning ? (typeof selectedWarning.createdAt === 'number' ? selectedWarning.createdAt : Date.now()) : Date.now(),
        updatedAt: Date.now()
      }

      if (selectedWarning) {
        await updateWarning(selectedWarning.id, warningData)
        setNotification({ message: "Warning updated successfully", type: "success" })
      } else {
        await addWarning(warningData)
        setNotification({ message: "Warning created successfully", type: "success" })
      }

      handleCloseDialog()
      await loadWarnings()
      setError(null)
    } catch (err: any) {
      console.error("Error saving warning:", err)
      setError(err.message || "Failed to save warning")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (warning: WarningRecord) => {
    if (!canRemove) return
    setWarningToDelete(warning)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canRemove) return
    if (!warningToDelete) return

    try {
      setLoading(true)
      await deleteWarning(warningToDelete.id)
      setNotification({ message: "Warning deleted successfully", type: "success" })
      await loadWarnings()
      setError(null)
    } catch (err: any) {
      console.error("Error deleting warning:", err)
      setError(err.message || "Failed to delete warning")
    } finally {
      setLoading(false)
      setDeleteConfirmOpen(false)
      setWarningToDelete(null)
    }
  }

  // New CRUD Modal handlers
  const warningCRUDFormRef = useRef<WarningCRUDFormHandle | null>(null)
  const handleOpenWarningCRUD = (warning: WarningRecord | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedWarningForCRUD(warning)
    setCrudMode(mode)
    setWarningCRUDModalOpen(true)
  }

  const handleCloseWarningCRUD = () => {
    setWarningCRUDModalOpen(false)
    setSelectedWarningForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveWarningCRUD = async (warningData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await addWarning(warningData)
        setNotification({ message: "Warning created successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshWarnings().catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedWarningForCRUD) {
        await updateWarning(selectedWarningForCRUD.id, warningData)
        setNotification({ message: "Warning updated successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshWarnings().catch(err => console.error("Background refresh error:", err))
      }
      handleCloseWarningCRUD()
    } catch (error) {
      console.error("Error saving warning:", error)
      setNotification({ message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} warning`, type: "error" })
    }
  }

  const handleCloseNotification = () => {
    setNotification(null)
  }

  // (moved) exportWarningsToCSV is declared after filteredWarnings

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low":
        return "success"
      case "Medium":
        return "warning"
      case "High":
        return "error"
      case "Critical":
        return "error"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "error"
      case "Resolved":
        return "success"
      case "Appealed":
        return "warning"
      case "Expired":
        return "default"
      default:
        return "default"
    }
  }

  // Get unique values for filters
  const uniqueEmployees = hrState.employees.map((emp) => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
  }))

  // Filter warnings
  const filteredWarnings = warnings.filter((warning) => {
    const matchesSearch =
      searchTerm === "" ||
      warning.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.issuedBy.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter.length === 0 || typeFilter.includes(warning.type)
    const matchesSeverity = severityFilter.length === 0 || severityFilter.includes(warning.severity)
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(warning.status)

    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  // Sorted warnings (after filteredWarnings)
  const sortedWarnings = React.useMemo(() => {
    const source: WarningRecord[] = filteredWarnings || []

    const getValue = (w: WarningRecord, key: string) => {
      switch (key) {
        case "employeeName":
          return (w.employeeName || "").toLowerCase()
        case "type":
          return (w.type || "").toString().toLowerCase()
        case "severity":
          return (w.severity || "").toString().toLowerCase()
        case "category":
          return (w.category || "").toString().toLowerCase()
        case "title":
          return (w.title || "").toLowerCase()
        case "dateIssued":
          return w.dateIssued || ""
        case "status":
          return (w.status || "").toString().toLowerCase()
        case "followUpDate":
          return w.followUpDate || ""
        default:
          return (w as any)[key]
      }
    }

    const copy = [...source]
    copy.sort((a, b) => {
      const av = getValue(a, sortBy)
      const bv = getValue(b, sortBy)
      let cmp = 0
      const isDate = sortBy === "dateIssued" || sortBy === "followUpDate"
      if (isDate) {
        const ad = av ? Date.parse(av as string) : 0
        const bd = bv ? Date.parse(bv as string) : 0
        cmp = ad - bd
      } else {
        const as = (av ?? "").toString()
        const bs = (bv ?? "").toString()
        cmp = as.localeCompare(bs)
      }
      return sortOrder === "asc" ? cmp : -cmp
    })
    return copy
  }, [filteredWarnings, sortBy, sortOrder])

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search warnings..."
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Add Warning"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit warnings."
        onExportCSV={handleExportCSV}
      />

      {/* Warnings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "employeeName") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("employeeName"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Employee</Typography>{sortBy === "employeeName" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "type") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("type"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Type</Typography>{sortBy === "type" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "severity") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("severity"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Severity</Typography>{sortBy === "severity" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "category") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("category"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Category</Typography>{sortBy === "category" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "title") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("title"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Title</Typography>{sortBy === "title" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "dateIssued") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("dateIssued"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Date Issued</Typography>{sortBy === "dateIssued" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "status") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("status"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Status</Typography>{sortBy === "status" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => { if (sortBy === "followUpDate") setSortOrder(sortOrder === "asc" ? "desc" : "asc"); else { setSortBy("followUpDate"); setSortOrder("asc") } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Follow Up</Typography>{sortBy === "followUpDate" && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedWarnings.map((warning: WarningRecord) => {
              // Helper function to get employee name
              const getEmployeeName = (warning: WarningRecord) => {
                if (warning.employeeName) return warning.employeeName;
                const employee = hrState.employees?.find(emp => emp.id === warning.employeeId);
                if (employee) return `${employee.firstName} ${employee.lastName}`;
                return "Unknown Employee";
              };
              
              const employeeName = getEmployeeName(warning);
              
              return (
                <TableRow key={warning.id} hover onClick={() => handleOpenWarningCRUD(warning, 'view')} sx={{ cursor: "pointer", '& > td': { paddingTop: 1, paddingBottom: 1 } }}>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        {employeeName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </Avatar>
                      <Typography variant="body2">{employeeName}</Typography>
                    </Box>
                  </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip label={warning.type} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip label={warning.severity} size="small" color={getSeverityColor(warning.severity) as any} />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{warning.category}</TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                    {warning.title}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{new Date(warning.dateIssued).toLocaleDateString()}</TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip label={warning.status} size="small" color={getStatusColor(warning.status) as any} />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  {warning.followUpRequired ? (
                    <Chip label="Required" size="small" color="warning" />
                  ) : (
                    <Chip label="Not Required" size="small" color="default" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Box display="flex" gap={1} justifyContent="center">
                    <IconButton size="small" color="primary" disabled={!canMutate} onClick={(e) => { e.stopPropagation(); handleOpenWarningCRUD(warning, 'edit'); }} title={canMutate ? "Edit" : "No permission to edit"}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" disabled={!canRemove} onClick={(e) => { e.stopPropagation(); handleDeleteClick(warning); }} title={canRemove ? "Delete" : "No permission to delete"}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredWarnings.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <EmptyStateCard
            icon={WarningIcon}
            title={warnings.length === 0 ? "No warnings found" : "No warnings match your current filters"}
            description={warnings.length === 0 ? "No warnings have been issued yet." : "Try adjusting your search or filters."}
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWarningCRUD(null, 'create')} disabled={!canMutate}>
                {warnings.length === 0 ? "Issue First Warning" : "Issue Warning"}
              </Button>
            }
            cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
          />
        </Box>
      )}

      {/* Add/Edit Warning Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedWarning ? "Edit Warning" : "Issue New Warning"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Employee</InputLabel>
                <Select
                  label="Employee"
                  value={warningForm.employeeId}
                  onChange={(e) => handleFormChange("employeeId", e.target.value)}
                >
                  {uniqueEmployees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={warningForm.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                >
                  <MenuItem value="Verbal">Verbal</MenuItem>
                  <MenuItem value="Written">Written</MenuItem>
                  <MenuItem value="Final">Final</MenuItem>
                  <MenuItem value="Suspension">Suspension</MenuItem>
                  <MenuItem value="Termination">Termination</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Severity</InputLabel>
                <Select
                  label="Severity"
                  value={warningForm.severity}
                  onChange={(e) => handleFormChange("severity", e.target.value)}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={warningForm.category}
                  onChange={(e) => handleFormChange("category", e.target.value)}
                >
                  <MenuItem value="Attendance">Attendance</MenuItem>
                  <MenuItem value="Performance">Performance</MenuItem>
                  <MenuItem value="Conduct">Conduct</MenuItem>
                  <MenuItem value="Safety">Safety</MenuItem>
                  <MenuItem value="Policy Violation">Policy Violation</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={warningForm.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={warningForm.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date Issued"
                type="date"
                value={warningForm.dateIssued}
                onChange={(e) => handleFormChange("dateIssued", e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Issued By"
                value={warningForm.issuedBy}
                onChange={(e) => handleFormChange("issuedBy", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={warningForm.status}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Appealed">Appealed</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expiry Date"
                type="date"
                value={warningForm.expiryDate}
                onChange={(e) => handleFormChange("expiryDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Follow Up Required</InputLabel>
                <Select
                  label="Follow Up Required"
                  value={warningForm.followUpRequired}
                  onChange={(e) => handleFormChange("followUpRequired", e.target.value)}
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {warningForm.followUpRequired === "true" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Follow Up Date"
                  type="date"
                  value={warningForm.followUpDate}
                  onChange={(e) => handleFormChange("followUpDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            {selectedWarning ? "Update Warning" : "Issue Warning"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this warning for {warningToDelete?.employeeName}? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification ? (
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: "100%" }}>
            {notification.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>

      {/* New CRUD Modal */}
            <CRUDModal
        open={warningCRUDModalOpen}
        onClose={(reason) => {
          setWarningCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseWarningCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "warningsTrackingModal1",
          crudMode,
          id: selectedWarningForCRUD?.id,
          itemLabel: selectedWarningForCRUD?.employeeName,
        }}
      >
        <WarningCRUDForm
          ref={warningCRUDFormRef}
          warningRecord={selectedWarningForCRUD as any}
          mode={crudMode}
          onSave={handleSaveWarningCRUD}
          employees={hrState.employees}
        />
      </CRUDModal>
    </Box>
  )
}

export default WarningsTracking
