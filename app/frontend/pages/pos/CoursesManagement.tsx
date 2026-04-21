"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  Save as SaveIcon,
} from "@mui/icons-material"

import { useCompany } from "../../../backend/context/CompanyContext"
import { useStock } from "../../../backend/context/StockContext"
import { usePOS } from "../../../backend/context/POSContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import CourseForm from "../../components/stock/forms/CourseForm"
import DataHeader from "../../components/reusable/DataHeader"
// Removed direct Firebase imports - using POSContext instead

// Course interface
interface Course {
  id?: string
  name: string
  description?: string
  displayOrder?: number
  active?: boolean
}

const CoursesManagement: React.FC = () => {
  const location = useLocation()
  const { state: companyState } = useCompany()
  const { state: stockState } = useStock()
  const { 
    state: posState, 
    refreshCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  } = usePOS()
  const { products } = stockState

  // State
  const [searchTerm, setSearchTerm] = useState("")
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  
  const { courses, loading } = posState
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse] = useState<Course | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)

  // Form state
  const [formData, setFormData] = useState<Course>({
    name: "",
    description: "",
    displayOrder: 0,
    active: true,
  })

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "success",
  })

  // CRUD Form states
  const [courseFormOpen, setCourseFormOpen] = useState(false)
  const [courseFormMode, setCourseFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedCourseForForm, setSelectedCourseForForm] = useState<Course | null>(null)

  // Load courses from POS context
  const loadCourses = useCallback(async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      await refreshCourses()
    } catch (error) {
      console.error("Error loading courses:", error)
      showNotification("Failed to load courses", "error")
    }
  }, [companyState.companyID, companyState.selectedSiteID, refreshCourses])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const showNotification = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setNotification({
      open: true,
      message,
      severity,
    })
  }

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    })
  }

  // Filtered courses
  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Handle form changes
  const handleFormChange = (field: keyof Course, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }


  // Handle save course
  const handleSaveCourse = async () => {
    if (!formData.name.trim()) {
      showNotification("Course name is required", "error")
      return
    }

    try {
      const courseData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        displayOrder: formData.displayOrder || 0,
        active: formData.active !== false,
      }

      // Update local state
      if (editingCourse) {
        await updateCourse(editingCourse.id!, courseData)
        showNotification("Course updated successfully", "success")
      } else {
        await createCourse(courseData)
        showNotification("Course added successfully", "success")
      }

      setDialogOpen(false)
      setFormData({
        name: "",
        description: "",
        displayOrder: 0,
        active: true,
      })
    } catch (error) {
      console.error("Error saving course:", error)
      showNotification("Failed to save course", "error")
    }
  }

  // Handle delete course
  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID || !courseToDelete?.id) return

    try {
      // Check if course is in use by any products
      const productsUsingCourse = products.filter((product: any) => product.course === courseToDelete.id)

      if (productsUsingCourse.length > 0) {
        showNotification(
          `Cannot delete course that is used by ${productsUsingCourse.length} products. Please reassign these products first.`,
          "error",
        )
        setDeleteDialogOpen(false)
        return
      }

      // Delete course using POSContext
      await deleteCourse(courseToDelete.id!)
      showNotification("Course deleted successfully", "success")
    } catch (error) {
      console.error("Error deleting course:", error)
      showNotification("Failed to delete course", "error")
    } finally {
      setDeleteDialogOpen(false)
      setCourseToDelete(null)
    }
  }

  // CRUD Form handlers
  const handleOpenCourseForm = (course: Course | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedCourseForForm(course)
    setCourseFormMode(mode)
    setCourseFormOpen(true)
  }

  const handleCloseCourseForm = () => {
    setCourseFormOpen(false)
    setSelectedCourseForForm(null)
    setCourseFormMode('create')
  }

  const handleSaveCourseForm = async (courseData: any) => {
    try {
      if (courseFormMode === 'create') {
        await createCourse(courseData)
        showNotification("Course created successfully", "success")
      } else if (courseFormMode === 'edit' && selectedCourseForForm?.id) {
        await updateCourse(selectedCourseForForm.id, courseData)
        showNotification("Course updated successfully", "success")
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "coursesManagementModal1",
        crudMode: courseFormMode,
        id: selectedCourseForForm?.id ?? courseData?.id,
        itemLabel: courseData?.name,
      })
      handleCloseCourseForm()
      await loadCourses()
    } catch (error) {
      console.error("Error saving course:", error)
      showNotification("Failed to save course", "error")
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading courses...
        </Typography>
      </Box>
    )
  }

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Export courses as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'displayOrder', label: 'Display Order' },
    { value: 'active', label: 'Status' },
    { value: 'description', label: 'Description' }
  ]

  return (
    <Box>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>

      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search courses..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCourseForm(null, 'create')}
        createButtonLabel="Create Course"
      />

      {/* Courses Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", width: "80px" }}>Order</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: "100px" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <TableRow key={course.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell>{course.displayOrder || 0}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <RestaurantIcon color="primary" fontSize="small" />
                        {course.name}
                      </Box>
                    </TableCell>
                    <TableCell>{course.description || "No description"}</TableCell>
                    <TableCell>
                      <Chip
                        label={course.active !== false ? "Active" : "Inactive"}
                        color={course.active !== false ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenCourseForm(course, 'edit')}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(course)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <RestaurantIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                      <Typography variant="h6" color="text.secondary">
                        No courses found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm
                          ? "Try adjusting your search criteria"
                          : "Add your first course to organize menu items"}
                      </Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCourseForm(null, 'create')} sx={{ mt: 1 }}>
                        Create Course
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Course Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Course Name"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              fullWidth
              required
              placeholder="e.g., Starter, Main Course, Dessert"
            />

            <TextField
              label="Description"
              value={formData.description || ""}
              onChange={(e) => handleFormChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Optional description for this course"
            />

            <TextField
              label="Display Order"
              type="number"
              value={formData.displayOrder || 0}
              onChange={(e) => handleFormChange("displayOrder", Number(e.target.value))}
              fullWidth
              helperText="Lower numbers appear first in menus"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.active !== false}
                  onChange={(e) => handleFormChange("active", e.target.checked)}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCourse} variant="contained" color="primary">
            {editingCourse ? "Update" : "Add"} Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the course "{courseToDelete?.name}"? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Note: You cannot delete a course that is currently assigned to products.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Course CRUD Modal */}
      <CRUDModal
        open={courseFormOpen}
        onClose={(reason) => {
          setCourseFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedCourseForForm(null)
            setCourseFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "coursesManagementModal1",
          crudMode: courseFormMode,
          id: selectedCourseForForm?.id,
          itemLabel: selectedCourseForForm?.name,
        }}
        title={
          courseFormMode === "create"
            ? "Create Course"
            : courseFormMode === "edit"
              ? "Edit Course"
              : "View Course"
        }
        icon={<SaveIcon />}
        mode={courseFormMode}
        onEdit={() => setCourseFormMode("edit")}
        onSave={courseFormMode !== "view" ? async () => {} : undefined}
        hideSaveButton={courseFormMode === "view"}
      >
        <CourseForm
          course={selectedCourseForForm}
          mode={courseFormMode}
          onSave={handleSaveCourseForm}
        />
      </CRUDModal>
    </Box>
  )
}

export default CoursesManagement
