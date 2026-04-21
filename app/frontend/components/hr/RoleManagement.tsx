"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  TablePagination,
  Switch,
  FormControlLabel,
  useTheme,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Work as WorkIcon,
} from "@mui/icons-material"
import type { Role, Department } from "../../../backend/interfaces/HRs"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import DataHeader from "../reusable/DataHeader"
import RoleCRUDForm, { type RoleCRUDFormHandle } from "./forms/RoleCRUDForm"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"

interface RoleFormData {
  id?: string
  label: string
  name: string
  description: string
  permissions: string[]
  active: boolean
  createdAt: number
  departmentId?: string
  isActive: boolean
  minSalary?: number
  maxSalary?: number
  responsibilities?: string[]
  requirements?: string[]
}

const RoleManagement: React.FC = () => {
  const location = useLocation()
  const theme = useTheme()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "roles")
  const canRemove = canDelete("hr", "roles")

  // Context hooks
  const { 
    state: hrState, 
    refreshRoles, 
    refreshDepartments, 
    addRole, 
    updateRole, 
    deleteRole 
  } = useHR()

  // State for role management
  const [loading, setLoading] = useState(false)
  // Error state is handled through notifications
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // New CRUD Modal state
  const [roleCRUDModalOpen, setRoleCRUDModalOpen] = useState(false)
  const [selectedRoleForCRUD, setSelectedRoleForCRUD] = useState<Role | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const roleCRUDFormRef = useRef<RoleCRUDFormHandle | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterActive, setFilterActive] = useState<string[]>([])
  const [filterDepartment, setFilterDepartment] = useState<string[]>([])
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Form state
  const [formData, setFormData] = useState<RoleFormData>({
    label: "",
    name: "", // Keep this for internal use but don't show in the form
    description: "",
    permissions: [], // Keep this for internal use but don't show in the form
    active: true,
    createdAt: Date.now(),
    departmentId: "",
    isActive: true,
    minSalary: 0,
    maxSalary: 0,
    responsibilities: [],
    requirements: [],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Sorting
  const [sortBy, setSortBy] = useState<
    "label" | "department" | "active" | "createdAt"
  >("label")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "active", name: "Active", color: "#4caf50" },
        { id: "inactive", name: "Inactive", color: "#f44336" },
      ],
      selectedValues: filterActive,
      onSelectionChange: setFilterActive,
    },
    {
      label: "Department",
      options: (hrState.departments || []).map(dept => ({ 
        id: dept.id, 
        name: dept.name,
        color: "#2196f3"
      })),
      selectedValues: filterDepartment,
      onSelectionChange: setFilterDepartment,
    },
  ]

  const sortOptions = [
    { value: "label", label: "Name" },
    { value: "description", label: "Description" },
    { value: "department", label: "Department" },
    { value: "createdAt", label: "Created Date" },
  ]

  // Data is loaded centrally by HRContext on HR entry.
  // Avoid fetching-on-navigation here to keep tab switching snappy and prevent UI flashing.
  
  // Keep local state in sync with HR context
  useEffect(() => {
    // keep quiet
  }, [hrState.roles])

  // Handle dialog open/close

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedRole(null)
  }

  // Form input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value === "" ? undefined : Number(value) }))
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, active: e.target.checked }))
  }

  const handleArrayInputChange = (field: string, value: string) => {
    const items = value.split("\n").filter((item) => item.trim() !== "")
    setFormData((prev) => ({ ...prev, [field]: items }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.label) {
      errors.label = "Role name is required"
    }

    if (
      formData.minSalary !== undefined &&
      formData.maxSalary !== undefined &&
      formData.minSalary > formData.maxSalary
    ) {
      errors.minSalary = "Minimum salary cannot be greater than maximum salary"
      errors.maxSalary = "Maximum salary cannot be less than minimum salary"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle role save
  const handleRoleSave = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

      // Auto-generate name from label if not provided
      if (!formData.name) {
        formData.name = formData.label.toLowerCase().replace(/\s+/g, "_")
      }

      if (selectedRole) {
        // Update existing role
        await updateRole(selectedRole.id, formData)
        setNotification({ message: "Role updated successfully", type: "success" })
      } else {
        // Add new role
        await addRole({
          name: formData.name,
          label: formData.label,
          description: formData.description,
          departmentId: formData.departmentId || "",
          permissions: formData.permissions,
          isActive: formData.isActive,
          createdAt: formData.createdAt,
        })
        setNotification({ message: "Role added successfully", type: "success" })
      }

      handleCloseDialog()
      // Refresh the role list after adding/updating
      await refreshRoles(true)
    } catch (err) {
      console.error("Error saving role:", err)
      setNotification({ message: "Failed to save role", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Handle role delete confirmation
  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role)
    setDeleteConfirmOpen(true)
  }

  // Handle role delete
  const handleConfirmDelete = async () => {
    if (!roleToDelete) return

    try {
      await deleteRole(roleToDelete.id)
      setNotification({ message: "Role deleted successfully", type: "success" })

      // Refresh the role list after deleting
      await refreshRoles(true)
    } catch (err) {
      console.error("Error deleting role:", err)
      setNotification({ message: "Failed to delete role", type: "error" })
    } finally {
      setDeleteConfirmOpen(false)
      setRoleToDelete(null)
    }
  }

  // New CRUD Modal handlers
  const handleOpenRoleCRUD = (role: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedRoleForCRUD(role)
    setCrudMode(mode)
    setRoleCRUDModalOpen(true)
  }

  const handleCloseRoleCRUD = () => {
    setRoleCRUDModalOpen(false)
    setSelectedRoleForCRUD(null)
    setCrudMode('create')
  }

  const handleSaveRoleCRUD = async (roleData: any) => {
    try {
      if (crudMode === 'create') {
        await addRole(roleData)
        setNotification({ message: "Role created successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshRoles(true).catch(err => console.error("Background refresh error:", err))
      } else if (crudMode === 'edit' && selectedRoleForCRUD) {
        await updateRole(selectedRoleForCRUD.id, roleData)
        setNotification({ message: "Role updated successfully", type: "success" })
        // Refresh data in background without blocking UI
        refreshRoles(true).catch(err => console.error("Background refresh error:", err))
      }
      handleCloseRoleCRUD()
    } catch (error) {
      console.error("Error saving role:", error)
      setNotification({ message: `Failed to ${crudMode === 'create' ? 'create' : 'update'} role`, type: "error" })
    }
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value as "label" | "department" | "active" | "createdAt")
    setSortOrder(direction)
  }


  const handleExportCSV = () => {
    // Export functionality can be implemented here
  }

  // Filter roles based on search query and filters
  const filteredRoles = (hrState.roles || []).filter((role: Role) => {
    const roleDisplayName = (role.label || role.name || '').toString()
    const matchesSearch = roleDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive =
      filterActive.length === 0 ||
      (filterActive.includes("active") && role.active) ||
      (filterActive.includes("inactive") && !role.active)
    const matchesDepartment =
      filterDepartment.length === 0 || filterDepartment.includes(role.department || "")

    return matchesSearch && matchesActive && matchesDepartment
  })

  // Sorted roles
  const sortedRoles = useMemo(() => {
    const arr = [...filteredRoles]
    arr.sort((a, b) => {
      let aVal: string | number | boolean = ""
      let bVal: string | number | boolean = ""
      switch (sortBy) {
        case "label":
          aVal = a.label || ""
          bVal = b.label || ""
          break
        case "department":
          aVal = a.department || ""
          bVal = b.department || ""
          break
        case "active":
          aVal = a.active ? 1 : 0
          bVal = b.active ? 1 : 0
          break
        case "createdAt":
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        default:
          aVal = 0
          bVal = 0
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      const diff = (aVal as number) - (bVal as number)
      return sortOrder === "asc" ? diff : -diff
    })
    return arr
  }, [filteredRoles, sortBy, sortOrder])

  const handleHeaderSort = (key: typeof sortBy) => {
    setSortBy((prev) => (prev === key ? prev : key))
    setSortOrder((prev) => (sortBy === key ? (prev === "asc" ? "desc" : "asc") : "asc"))
    setPage(0)
  }

  // Pagination handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null)
  }

  // Export menu handlers


  // Paginated roles
  const paginatedRoles = sortedRoles.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  // Get unique departments from the departments collection
  const departmentOptions =
    hrState.departments && hrState.departments.length > 0
      ? hrState.departments.map((dept: Department) => ({
          id: dept.id,
          name: dept.name || "Unnamed Department",
        }))
      : []

  return (
    <Box sx={{ 
      fontFamily: theme.typography.fontFamily,
      color: theme.palette.text.primary 
    }}>
      <DataHeader
        onCreateNew={() => handleOpenRoleCRUD(null, 'create')}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit roles."
        onExportCSV={handleExportCSV}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search roles..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Role Table */}
      <Paper sx={{ 
          width: "100%", 
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 1,
          boxShadow: 1
        }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("label")}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Role Name</Typography>{sortBy === 'label' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("department")}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Department</Typography>{sortBy === 'department' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("active")}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Status</Typography>{sortBy === 'active' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', cursor: "pointer", userSelect: 'none', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }} onClick={() => handleHeaderSort("createdAt")}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Created</Typography>{sortBy === 'createdAt' && (<Box sx={{ display: 'flex', alignItems: 'center' }}>{sortOrder === 'asc' ? '↑' : '↓'}</Box>)}</Box>
                  </TableCell>
                  <TableCell align="center" sx={{ textAlign: 'center !important', padding: '16px 16px', userSelect: 'none' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRoles.length > 0 ? (
                  paginatedRoles.map((role) => (
                    <TableRow key={role.id} hover onClick={() => handleOpenRoleCRUD(role, 'view')} sx={{ cursor: "pointer", '& > td': { paddingTop: 1, paddingBottom: 1 } }}>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="body1" sx={{ fontFamily: theme.typography.fontFamily, fontWeight: 'medium' }}>
                          {role.label || role.name || ''}
                        </Typography>
                        {role.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: theme.typography.fontFamily }}>
                            {role.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        {role.department ? (
                          <Chip 
                            label={role.department} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ 
                              borderRadius: 1,
                              fontFamily: theme.typography.fontFamily
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: theme.typography.fontFamily }}>
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Chip
                          label={role.active ? "Active" : "Inactive"}
                          color={role.active ? "success" : "default"}
                          size="small"
                          sx={{ 
                            borderRadius: 1,
                            fontFamily: theme.typography.fontFamily
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: theme.typography.fontFamily }}>
                          {new Date(role.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Box display="flex" gap={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!canMutate}
                            onClick={(e) => { e.stopPropagation(); handleOpenRoleCRUD(role, 'edit'); }}
                            title={canMutate ? "Edit" : "No permission to edit"}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canRemove}
                            onClick={(e) => { e.stopPropagation(); if (!canRemove) return; handleDeleteClick(role); }}
                            title={canRemove ? "Delete" : "No permission to delete"}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <EmptyStateCard
                        icon={WorkIcon}
                        title={hrState.roles && hrState.roles.length > 0 ? "No roles match your current filters" : "No roles found"}
                        description={
                          hrState.roles && hrState.roles.length > 0
                            ? "Try adjusting your search or filters."
                            : "Create your first role to get started."
                        }
                        action={
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenRoleCRUD(null, 'create')}
                            disabled={!canMutate}
                            sx={{ borderRadius: 1, fontFamily: theme.typography.fontFamily }}
                          >
                            Add Role
                          </Button>
                        }
                        cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredRoles.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredRoles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ fontFamily: theme.typography.fontFamily }}
            />
          )}
      </Paper>

      {/* Add/Edit Role Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 1 }
        }}
      >
        <DialogTitle sx={{ fontFamily: theme.typography.fontFamily, fontWeight: 'medium' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {selectedRole ? "Edit Role" : "Add New Role"}
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role Name"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                error={!!formErrors.label}
                helperText={formErrors.label}
                required
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1
                }
              }}>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={formData.departmentId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
                  label="Department"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {departmentOptions.map((dept) => (
                    <MenuItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                multiline
                rows={3}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Salary"
                name="minSalary"
                type="number"
                value={formData.minSalary || ""}
                onChange={handleNumberInputChange}
                error={!!formErrors.minSalary}
                helperText={formErrors.minSalary}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Salary"
                name="maxSalary"
                type="number"
                value={formData.maxSalary || ""}
                onChange={handleNumberInputChange}
                error={!!formErrors.maxSalary}
                helperText={formErrors.maxSalary}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Responsibilities"
                name="responsibilities"
                multiline
                rows={4}
                value={(formData.responsibilities || []).join("\n")}
                onChange={(e) => handleArrayInputChange("responsibilities", e.target.value)}
                placeholder="Enter each responsibility on a new line"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Requirements"
                name="requirements"
                multiline
                rows={4}
                value={(formData.requirements || []).join("\n")}
                onChange={(e) => handleArrayInputChange("requirements", e.target.value)}
                placeholder="Enter each requirement on a new line"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  },
                  fontFamily: theme.typography.fontFamily
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={handleActiveChange}
                    color="primary"
                  />
                }
                label="Active"
                sx={{ fontFamily: theme.typography.fontFamily }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              borderRadius: 1,
              fontFamily: theme.typography.fontFamily
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleRoleSave}
            disabled={loading}
            sx={{ 
              borderRadius: 1,
              fontFamily: theme.typography.fontFamily,
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark }
            }}
          >
            {selectedRole ? "Update Role" : "Add Role"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: { borderRadius: 1 }
        }}
      >
        <DialogTitle sx={{ fontFamily: theme.typography.fontFamily, fontWeight: 'medium' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: theme.typography.fontFamily }}>
            Are you sure you want to delete the role <strong>{roleToDelete?.label || roleToDelete?.name || ''}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ 
              borderRadius: 1,
              fontFamily: theme.typography.fontFamily
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            sx={{ 
              borderRadius: 1,
              fontFamily: theme.typography.fontFamily
            }}
          >
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
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.type} 
            sx={{ 
              width: "100%",
              fontFamily: theme.typography.fontFamily,
              borderRadius: 1
            }}
          >
            {notification.message}
          </Alert>
        ) : (
          <div /> // Empty element as fallback
        )}
      </Snackbar>

      {/* New CRUD Modal */}
            <CRUDModal
        open={roleCRUDModalOpen}
        onClose={(reason) => {
          setRoleCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            const __workspaceOnClose = handleCloseRoleCRUD
            if (typeof __workspaceOnClose === "function") {
              __workspaceOnClose(reason)
            }
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "roleManagementModal1",
          crudMode,
          id: selectedRoleForCRUD?.id,
          itemLabel: selectedRoleForCRUD?.name,
        }}
      >
        <RoleCRUDForm
          ref={roleCRUDFormRef}
          role={selectedRoleForCRUD}
          mode={crudMode}
          onSave={handleSaveRoleCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default RoleManagement
