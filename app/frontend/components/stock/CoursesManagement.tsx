"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Tooltip,
  Button,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  School as SchoolIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import CourseForm from "./forms/CourseForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const CoursesManagement: React.FC = () => {
  const location = useLocation()
  const { state, saveCourse, updateCourse, deleteCourse, fetchCourses, basePath } = useStock()
  const { dataVersion, loading } = state
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "categories")
  const canRemove = canDelete("stock", "categories")
  
  // Local state for courses since they're not stored in context state
  const [courses, setCourses] = useState<any[]>([])

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("displayOrder")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")
  
  // Reordering state
  const [isOrderingMode, setIsOrderingMode] = useState(false)
  const [previewCourses, setPreviewCourses] = useState<any[]>([])
  const [draggedCourse, setDraggedCourse] = useState<any | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // CRUD Modal state
  const [courseFormOpen, setCourseFormOpen] = useState(false)
  const [selectedCourseForForm, setSelectedCourseForForm] = useState<any>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [currentFormData, setCurrentFormData] = useState<any>(null)

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "warning" | "info"
  }>({
    open: false,
    message: "",
    severity: "success"
  })

  // DataHeader configuration
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
    { value: "displayOrder", label: "Display Order" },
  ]

  // Helper function to get category color for a course

  // Filter and sort courses
  const filteredAndSortedCourses = useMemo(() => {
    const coursesToUse = isOrderingMode ? previewCourses : courses
    if (!coursesToUse || !Array.isArray(coursesToUse)) {
      return []
    }
    
    let filtered = coursesToUse.filter((course) =>
      course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a] || ""
      let bValue = b[sortBy as keyof typeof b] || ""
      
      // Handle numeric sorting for displayOrder
      if (sortBy === "displayOrder") {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })
  }, [courses, previewCourses, searchTerm, sortBy, sortDirection, isOrderingMode, dataVersion])

  // DataHeader handlers

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedCourseForForm(null)
    setCrudMode('create')
    setCourseFormOpen(true)
  }

  const handleRefresh = async () => {
    try {
      const fetchedCourses = await fetchCourses()
      setCourses(fetchedCourses || [])
    } catch (error) {
      debugWarn("Error refreshing courses:", error)
      setNotification({
        open: true,
        message: "Failed to refresh courses",
        severity: "error"
      })
    }
  }

  // CRUD handlers
  const handleOpenCourseForm = (course: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedCourseForForm(course)
    setCrudMode(mode)
    setCourseFormOpen(true)
  }

  const handleCloseCourseForm = () => {
    setCourseFormOpen(false)
    setSelectedCourseForForm(null)
    setCrudMode('create')
    setCurrentFormData(null)
  }

  const handleSaveCourseForm = async (courseData: any) => {
    try {
      const isEvent = courseData && typeof courseData === "object" && "nativeEvent" in courseData && "target" in courseData
      const payload = isEvent ? currentFormData : courseData
      if (!payload) {
        throw new Error("No course data to save")
      }

      if (crudMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(payload).filter(([_, value]) => value !== undefined)
        )
        await saveCourse?.(createPayload)
        setNotification({
          open: true,
          message: "Course created successfully",
          severity: "success"
        })
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "coursesManagementModal1",
          crudMode: "create",
        })
      } else if (crudMode === 'edit' && selectedCourseForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...payload, id: selectedCourseForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateCourse?.(selectedCourseForForm.id, updatePayload)
        setNotification({
          open: true,
          message: "Course updated successfully",
          severity: "success"
        })
        removeWorkspaceFormDraft(location.pathname, {
          crudEntity: "coursesManagementModal1",
          crudMode: "edit",
          id: selectedCourseForForm?.id,
          itemLabel: (payload as any)?.name,
        })
      }
      handleCloseCourseForm()
      // Refresh the local courses list
      await handleRefresh()
    } catch (error) {
      debugWarn("Error saving course:", error)
      setNotification({
        open: true,
        message: "Failed to save course",
        severity: "error"
      })
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this course?")) return

    try {
      await deleteCourse?.(courseId)
      setNotification({
        open: true,
        message: "Course deleted successfully",
        severity: "success"
      })
      // Refresh the local courses list
      await handleRefresh()
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to delete course",
        severity: "error"
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // Reordering handlers
  const handleStartOrdering = () => {
    setIsOrderingMode(true)
    // Ensure courses have displayOrder numbers and sort by displayOrder
    const coursesWithOrder = courses.map((course, index) => ({
      ...course,
      displayOrder: course.displayOrder !== undefined ? course.displayOrder : index
    })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    
    setPreviewCourses(coursesWithOrder)
  }

  const handleCancelOrdering = () => {
    setIsOrderingMode(false)
    setPreviewCourses([])
    setDraggedCourse(null)
    setDragOverIndex(null)
  }

  const handleSaveOrder = async () => {
    try {
      console.log("Saving course order...", previewCourses)
      console.log("Base path available:", !!basePath)
      
      // Update ALL courses with their new displayOrder (not just changed ones)
      // This ensures the database matches the visual order
      for (let i = 0; i < previewCourses.length; i++) {
        const course = previewCourses[i]
        const newDisplayOrder = i
        console.log(`Updating course ${course.name} (${course.id}) to displayOrder: ${newDisplayOrder}`)
        
        const updateData = { 
          displayOrder: newDisplayOrder,
          updatedAt: Date.now()
        }
        console.log("Update data:", updateData)
        
        try {
          await updateCourse(course.id, updateData)
          console.log(`Successfully updated course ${course.name}`)
        } catch (updateError) {
          console.error(`Failed to update course ${course.name}:`, updateError)
          throw updateError
        }
      }
      
      console.log(`Updated ${previewCourses.length} courses`)
      
      // Update local state with the new order
      const updatedCourses = previewCourses.map((course, index) => ({
        ...course,
        displayOrder: index,
        updatedAt: Date.now()
      }))
      setCourses(updatedCourses)
      
      setNotification({
        open: true,
        message: `Course order saved successfully`,
        severity: "success"
      })
      setIsOrderingMode(false)
      setPreviewCourses([])
    } catch (error) {
      console.error("Error saving course order:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setNotification({
        open: true,
        message: `Failed to save course order: ${errorMessage}`,
        severity: "error"
      })
    }
  }

  const handleDragStart = (e: React.DragEvent, course: any) => {
    setDraggedCourse(course)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedCourse) return

    const dragIndex = previewCourses.findIndex(course => course.id === draggedCourse.id)
    if (dragIndex === -1) return

    console.log(`Dragging ${draggedCourse.name} from index ${dragIndex} to ${dropIndex}`)

    const newCourses = [...previewCourses]
    const [draggedItem] = newCourses.splice(dragIndex, 1)
    newCourses.splice(dropIndex, 0, draggedItem)

    // Update displayOrder numbers to reflect new positions
    const updatedCourses = newCourses.map((course, index) => ({
      ...course,
      displayOrder: index
    }))

    console.log("Updated courses after drop:", updatedCourses.map(c => `${c.name}: ${c.displayOrder}`))

    setPreviewCourses(updatedCourses)
    setDraggedCourse(null)
    setDragOverIndex(null)
  }

  // Load courses on component mount
  // Use ref to prevent duplicate calls on dataVersion changes
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      handleRefresh()
    }
    // Reset hasLoadedRef when dataVersion changes (data was refreshed externally)
    if (dataVersion) {
      hasLoadedRef.current = false
    }
  }, [dataVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchTerm.length > 0

  return (
    <Box>
      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search courses..."
        filters={[]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={isOrderingMode ? [] : sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={(value, direction) => {
          setSortBy(value)
          setSortDirection(direction)
        }}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Course"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit courses."
        additionalButtons={!isOrderingMode ? [
          {
            label: "Reorder Courses",
            icon: <SaveIcon />,
            onClick: handleStartOrdering,
            variant: "outlined" as const,
            disabled: !canMutate,
            tooltip: "You don't have permission to edit courses.",
          }
        ] : [
          {
            label: "Save Order",
            icon: <SaveIcon />,
            onClick: handleSaveOrder,
            variant: "contained" as const,
            color: "success" as const,
            disabled: !canMutate,
            tooltip: "You don't have permission to edit courses.",
          },
          {
            label: "Cancel",
            icon: <CloseIcon />,
            onClick: handleCancelOrdering,
            variant: "outlined" as const
          }
        ]}
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {/* Courses Grid */}
      {filteredAndSortedCourses.length === 0 && !isOrderingMode ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={SchoolIcon}
            title={hasActiveFilters ? "No courses match your filters" : "No courses found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first course to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedCourses.map((course, index) => (
          <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={course.id}>
            <Card
              draggable={isOrderingMode}
              onDragStart={(e) => handleDragStart(e, course)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onClick={!isOrderingMode ? () => handleOpenCourseForm(course, 'view') : undefined}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                minHeight: 90,
                position: 'relative',
                cursor: isOrderingMode ? 'grab' : 'pointer',
                border: isOrderingMode && draggedCourse?.id === course.id ? "2px dashed #1976d2" : "none",
                backgroundColor: isOrderingMode && dragOverIndex === index ? "action.hover" : "background.paper",
                '&:hover': {
                  transform: isOrderingMode ? 'none' : 'translateY(-1px)',
                  boxShadow: isOrderingMode ? 1 : 2,
                },
                '&:active': {
                  cursor: isOrderingMode ? 'grabbing' : 'pointer',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word', mb: 0.25 }}>
                  {course.name}
                </Typography>
                
                <Chip
                  label={`#${(course.displayOrder || 0) + 1}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.6rem', 
                    height: 16,
                    minWidth: 24,
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
                
                
              </CardContent>

              {/* Action Icons positioned on the right */}
              <Box sx={{ 
                position: 'absolute', 
                top: 6, 
                right: 6, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.02 
              }}>
                <Tooltip title="Edit Course" placement="left">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenCourseForm(course, 'edit')
                    }}
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      fontSize: '0.8rem',
                      '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                    }}
                  >
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Course" placement="left">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCourse(course.id)
                    }}
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      fontSize: '0.8rem',
                      '&:hover': { backgroundColor: 'error.light', color: 'white' }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Card>
          </Grid>
          ))}
        </Grid>
      )}

      {/* CRUD Modal */}
      <CRUDModal
        open={courseFormOpen}
        onClose={(reason) => {
          setCourseFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedCourseForForm(null)
            setCrudMode("create")
            setCurrentFormData(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "coursesManagementModal1",
          crudMode: crudMode,
          id: selectedCourseForForm?.id,
          itemLabel: selectedCourseForForm?.name,
        }}
        title={
          crudMode === "create"
            ? "Add course"
            : crudMode === "edit"
              ? "Edit course"
              : "View course"
        }
        icon={<SchoolIcon />}
        mode={crudMode}
        onSave={crudMode !== "view" ? handleSaveCourseForm : undefined}
        hideSaveButton={crudMode === "view"}
      >
        <CourseForm
          course={selectedCourseForForm}
          mode={crudMode}
          onSave={handleSaveCourseForm}
          onFormDataChange={setCurrentFormData}
        />
      </CRUDModal>

      {/* Notification */}
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
    </Box>
  )
}

export default CoursesManagement
