"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
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
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
} from "@mui/icons-material"
import { useHRContext as useHR } from "../../../backend/context/HRContext"
import { themeConfig } from "../../../theme/AppTheme"
import type { Department } from "../../../backend/interfaces/HRs"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import DepartmentCRUDForm, { type DepartmentCRUDFormHandle } from "./forms/DepartmentCRUDForm"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"

const DepartmentManagement: React.FC = () => {
  const location = useLocation()
  const { state: hrState, refreshDepartments, addDepartment, updateDepartment, deleteDepartment } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "departments")
  const canRemove = canDelete("hr", "departments")

  // State for departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedDepartment] = useState<Department | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // New CRUD Modal state
  const [departmentCRUDModalOpen, setDepartmentCRUDModalOpen] = useState(false)
  const [selectedDepartmentForCRUD, setSelectedDepartmentForCRUD] = useState<Department | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const departmentCRUDFormRef = useRef<DepartmentCRUDFormHandle | null>(null)


  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [managerFilter, setManagerFilter] = useState<string[]>([])
  const [employeeCountFilter, setEmployeeCountFilter] = useState<string[]>([])

  // Sorting state
  const [sortBy, setSortBy] = useState<
    "name" | "description" | "manager" | "employees" | "createdAt"
  >("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // DataHeader configuration
  const filters = [
    {
      label: "Manager",
      options: [
        { id: "unassigned", name: "Unassigned", color: "#9e9e9e" },
        ...(hrState.employees || []).map(emp => ({ 
          id: emp.id, 
          name: `${emp.firstName} ${emp.lastName}`,
          color: "#2196f3"
        })),
      ],
      selectedValues: managerFilter,
      onSelectionChange: setManagerFilter,
    },
    {
      label: "Employee Count",
      options: [
        { id: "0", name: "0 employees", color: "#f44336" },
        { id: "1-5", name: "1-5 employees", color: "#ff9800" },
        { id: "6-10", name: "6-10 employees", color: "#4caf50" },
        { id: "11+", name: "11+ employees", color: "#2196f3" },
      ],
      selectedValues: employeeCountFilter,
      onSelectionChange: setEmployeeCountFilter,
    },
  ]

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
    { value: "manager", label: "Manager" },
    { value: "employees", label: "Employee Count" },
    { value: "createdAt", label: "Created Date" },
  ]

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value as any)
    setSortOrder(direction)
  }


  // Form state
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    managerId: "",
  })
  
  
  // Ref to track if data has been loaded during this component's lifecycle
  const dataLoadedRef = useRef(false)

  // Load data function
  const loadData = useCallback(async () => {
    // Skip if already loading or if data was already loaded
    // BasePath handled internally by HRContext
    if (loading || dataLoadedRef.current) {
      return
    }
    
    // Note: Data is now loaded automatically by HRContext with progressive loading and caching
    // No need to manually refresh - context handles all data loading efficiently
    // Only refresh if explicitly needed (e.g., after creating/updating data)
    setLoading(true)
    setEmployeesLoading(true)
    try {
      // Data is available from context automatically
      setDepartments(hrState.departments || [])
      // Mark data as loaded
      dataLoadedRef.current = true
      setEmployeesLoading(false)
      setLoading(false)
    } catch (error) {
      console.error("Error loading departments:", error)
      setNotification({ message: "Failed to load departments", type: "error" })
      // Reset the loaded flag on error so we can try again
      dataLoadedRef.current = false
      setEmployeesLoading(false)
      setLoading(false)
    }
  }, [hrState.departments, loading]) // BasePath handled internally

  // Load data only once when component mounts
  useEffect(() => {
    // BasePath handled internally by HRContext
    if (!dataLoadedRef.current) {
      loadData()
    }
  }, [loadData]) // BasePath handled internally
  
  // Update departments when hrState.departments changes
  useEffect(() => {
    if (hrState.departments && hrState.departments.length > 0) {
      setDepartments(hrState.departments);
    }
  }, [hrState.departments])


  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setDepartmentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleManagerChange = (e: any) => {
    setDepartmentForm((prev) => ({ ...prev, managerId: e.target.value as string }))
  }

  const handleSubmit = async () => {
    if (!departmentForm.name) {
      setNotification({ message: "Department name is required", type: "error" })
      return
    }

    try {
      if (selectedDepartment) {
        // Update existing department
        await updateDepartment(selectedDepartment.id, {
          name: departmentForm.name,
          description: departmentForm.description,
          managerId: departmentForm.managerId,
          isActive: true,
          updatedAt: new Date().getTime(),
        })
        setNotification({ message: "Department updated successfully", type: "success" })
      } else {
        // Create new department
        await addDepartment({
          name: departmentForm.name,
          description: departmentForm.description,
          managerId: departmentForm.managerId,
          employees: [],
          roles: [],
          isActive: true,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime()
        })
        setNotification({ message: "Department created successfully", type: "success" })
      }

      handleCloseDialog()
      // Refresh departments to update the UI
      await refreshDepartments(true)
    } catch (error) {
      console.error("Error saving department:", error)
      setNotification({ message: "Failed to save department", type: "error" })
    }
  }

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!departmentToDelete) return

    try {
      await deleteDepartment(departmentToDelete.id)
      setNotification({ message: "Department deleted successfully", type: "success" })
      setDeleteConfirmOpen(false)
      setDepartmentToDelete(null)
      // Refresh departments to update the UI
      await refreshDepartments(true)
    } catch (error) {
      console.error("Error deleting department:", error)
      setNotification({ message: "Failed to delete department", type: "error" })
    } finally {
      setDeleteConfirmOpen(false)
      setDepartmentToDelete(null)
    }
  }

  const handleCloseNotification = () => {
    setNotification(null)
  }

  const getManagerName = (managerId?: string) => {
    if (!managerId) return "Not assigned"
    const manager = hrState.employees.find((emp) => emp.id === managerId)
    return manager ? `${manager.firstName} ${manager.lastName}` : "Not assigned"
  }

  const getEmployeeCount = (departmentName: string) => {
    return hrState.employees.filter((emp) => emp.department === departmentName).length
  }

  // Export function
  const exportDepartmentsToCSV = () => {
    const headers = ["Department Name", "Description", "Manager", "Employee Count", "Created Date"]
    const csvContent = [
      headers.join(","),
      ...filteredDepartments.map((dept) =>
        [
          `"${dept.name}"`,
          `"${dept.description}"`,
          `"${getManagerName(dept.managerId)}"`,
          getEmployeeCount(dept.name),
          new Date(dept.createdAt).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `departments_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get unique managers for filter

  // Filter departments
  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      searchQuery === "" ||
      department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (department.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      getManagerName(department.managerId).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesManager =
      managerFilter.length === 0 ||
      (managerFilter.includes("unassigned") && !department.managerId) ||
      managerFilter.includes(department.managerId || "")

    const employeeCount = getEmployeeCount(department.name)
    const matchesEmployeeCount =
      employeeCountFilter.length === 0 ||
      (employeeCountFilter.includes("0") && employeeCount === 0) ||
      (employeeCountFilter.includes("1-5") && employeeCount >= 1 && employeeCount <= 5) ||
      (employeeCountFilter.includes("6-10") && employeeCount >= 6 && employeeCount <= 10) ||
      (employeeCountFilter.includes("11+") && employeeCount > 10)

    return matchesSearch && matchesManager && matchesEmployeeCount
  })

  // Sorted departments
  const sortedDepartments = useMemo(() => {
    const arr = [...filteredDepartments]
    arr.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""
      switch (sortBy) {
        case "name":
          aVal = a.name || ""
          bVal = b.name || ""
          break
        case "description":
          aVal = a.description || ""
          bVal = b.description || ""
          break
        case "manager": {
          const aName = getManagerName(a.managerId)
          const bName = getManagerName(b.managerId)
          aVal = aName
          bVal = bName
          break
        }
        case "employees":
          aVal = getEmployeeCount(a.name)
          bVal = getEmployeeCount(b.name)
          break
        case "createdAt":
          aVal = a.createdAt
          bVal = b.createdAt
          break
        default:
          aVal = 0
          bVal = 0
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const diff = (aVal as number) - (bVal as number)
      return sortOrder === "asc" ? diff : -diff
    })
    return arr
  }, [filteredDepartments, sortBy, sortOrder])

  const handleHeaderSort = (key: typeof sortBy) => {
    setSortBy((prev) => (prev === key ? prev : key))
    setSortOrder((prev) => (sortBy === key ? (prev === "asc" ? "desc" : "asc") : "asc"))
  }

  // New CRUD Modal handlers
  const handleOpenDepartmentCRUD = (department: Department | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedDepartmentForCRUD(department)
    setCrudMode(mode)
    setDepartmentCRUDModalOpen(true)
  }

  const handleCloseDepartmentCRUD = () => {
    setDepartmentCRUDModalOpen(false)
    setSelectedDepartmentForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveDepartmentCRUD = async (departmentData: any) => {
    try {
      if (crudMode === 'create') {
        await addDepartment(departmentData)
        setNotification({ message: "Department created successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshDepartments(true).catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedDepartmentForCRUD) {
        await updateDepartment(selectedDepartmentForCRUD.id, departmentData)
        setNotification({ message: "Department updated successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshDepartments(true).catch(err => console.error("Background refresh error:", err))
      }
      handleCloseDepartmentCRUD()
    } catch (error) {
      console.error("Error saving department:", error)
      setNotification({ message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} department`, type: "error" })
    }
  }

  const handleExport = () => {
    exportDepartmentsToCSV()
  }

  return (
    <Box sx={{ p: 0, fontFamily: themeConfig.typography.fontFamily }}>
      <DataHeader
        onCreateNew={() => handleOpenDepartmentCRUD(null, 'create')}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit departments."
        onExportCSV={handleExport}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search departments..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={handleSortChange}
      />

      <TableContainer component={Paper} sx={{ borderRadius: themeConfig.components.card.borderRadius, boxShadow: themeConfig.components.card.boxShadow }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("name")}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Department Name</Typography>{sortBy === 'name' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("description")}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Description</Typography>{sortBy === 'description' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("manager")}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Manager</Typography>{sortBy === 'manager' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("employees")}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Employees</Typography>{sortBy === 'employees' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("createdAt")}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Created Date</Typography>{sortBy === 'createdAt' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
              </TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDepartments.map((department) => (
              <TableRow key={department.id} hover onClick={() => handleOpenDepartmentCRUD(department, 'view')} sx={{ cursor: "pointer", '& > td': { paddingTop: 1, paddingBottom: 1 } }}>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body1" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }}>
                    {department.name}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }} color="text.secondary">
                    {department.description || "No description"}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }}>{getManagerName(department.managerId)}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Chip
                    label={`${getEmployeeCount(department.name)} employees`}
                    size="small"
                    color={getEmployeeCount(department.name) > 0 ? "primary" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Typography variant="body2" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }} color="text.secondary">
                    {new Date(department.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                  <Box display="flex" gap={1} justifyContent="center">
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={!canMutate}
                      onClick={(e) => { e.stopPropagation(); handleOpenDepartmentCRUD(department, 'edit'); }}
                      title={canMutate ? "Edit" : "No permission to edit"}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={!canRemove}
                      onClick={(e) => { e.stopPropagation(); if (!canRemove) return; handleDeleteClick(department); }}
                      title={canRemove ? "Delete" : "No permission to delete"}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredDepartments.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <EmptyStateCard
            icon={BusinessIcon}
            title={departments.length === 0 ? "No departments found" : "No departments match your current filters"}
            description={
              departments.length === 0
                ? "Create your first department to organize your workforce."
                : "Try adjusting your search or filters."
            }
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDepartmentCRUD(null, 'create')}
                disabled={!canMutate}
              >
                Add Department
              </Button>
            }
            cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
          />
        </Box>
      )}

      {/* Add/Edit Department Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }}>{selectedDepartment ? "Edit Department" : "Add New Department"}</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Department Name"
              name="name"
              value={departmentForm.name}
              onChange={handleFormChange}
              required
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={departmentForm.description}
              onChange={handleFormChange}
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Manager</InputLabel>
              <Select value={departmentForm.managerId} onChange={handleManagerChange} label="Manager">
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {hrState.employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }}>
            {selectedDepartment ? "Update Department" : "Add Department"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the {departmentToDelete?.name} department? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ fontFamily: themeConfig.typography.fontFamily, fontWeight: themeConfig.typography.fontWeightMedium }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
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
        open={departmentCRUDModalOpen}
        onClose={(reason) => {
          setDepartmentCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseDepartmentCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "departmentManagementModal1",
          crudMode,
          id: selectedDepartmentForCRUD?.id,
          itemLabel: selectedDepartmentForCRUD?.name,
        }}
      >
        <DepartmentCRUDForm
          ref={departmentCRUDFormRef}
          department={selectedDepartmentForCRUD}
          mode={crudMode}
          onSave={handleSaveDepartmentCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default DepartmentManagement
