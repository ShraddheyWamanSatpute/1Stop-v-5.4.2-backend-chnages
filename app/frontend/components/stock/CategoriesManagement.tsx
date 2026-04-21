"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  Button,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Category as CategoryIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import CategoryForm from "./forms/CategoryForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"

const CategoriesManagement: React.FC = () => {
  const location = useLocation()
  const { state, createCategory, updateCategory, deleteCategory } = useStock()
  const { categories, subcategories, salesDivisions, dataVersion, loading } = state
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "categories")
  const canRemove = canDelete("stock", "categories")

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // CRUD Modal state
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [selectedCategoryForForm, setSelectedCategoryForForm] = useState<any>(null)
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
    { value: "kind", label: "Type" },
  ]

  // Normalize hex color values and provide a sensible default
  const getDisplayColor = (raw?: string, isActive: boolean = true): string => {
    if (typeof raw === "string" && raw.trim().length > 0) {
      const value = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value
    }
    return isActive !== false ? "#4caf50" : "#9e9e9e"
  }

  // Combine all category types (sales divisions, categories, subcategories)
  const allCategoryTypes = useMemo(() => {
    const combined = [
      ...(salesDivisions || []).map(item => ({ ...item, kind: 'SaleDivision' as const })),
      ...(categories || []).map(item => ({ ...item, kind: 'Category' as const })),
      ...(subcategories || []).map(item => ({ ...item, kind: 'Subcategory' as const }))
    ]
    return combined
  }, [salesDivisions, categories, subcategories, dataVersion])

  // Filter and sort all category types
  const filteredAndSortedCategories = useMemo(() => {
    if (!allCategoryTypes || !Array.isArray(allCategoryTypes)) {
      return []
    }
    
    let filtered = allCategoryTypes.filter((category) =>
      category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.kind?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a] || ""
      const bValue = b[sortBy as keyof typeof b] || ""
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })
  }, [allCategoryTypes, searchTerm, sortBy, sortDirection, dataVersion])

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedCategoryForForm(null)
    setCrudMode('create')
    setCategoryFormOpen(true)
  }

  const handleRefresh = async () => {
    // Categories are automatically refreshed through context
  }

  // CRUD handlers
  const handleOpenCategoryForm = (category: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedCategoryForForm(category)
    setCrudMode(mode)
    setCategoryFormOpen(true)
  }

  const handleCloseCategoryForm = () => {
    setCategoryFormOpen(false)
    setSelectedCategoryForForm(null)
    setCrudMode('create')
  }

  const handleSaveCategoryForm = async () => {
    try {
      if (crudMode === 'create') {
        await createCategory?.(currentFormData)
        setNotification({
          open: true,
          message: "Category created successfully",
          severity: "success"
        })
      } else if (crudMode === 'edit' && selectedCategoryForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...currentFormData, id: selectedCategoryForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateCategory?.(selectedCategoryForForm.id, updatePayload)
        setNotification({
          open: true,
          message: "Category updated successfully",
          severity: "success"
        })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "categoriesManagementModal1",
        crudMode: crudMode,
        id: selectedCategoryForForm?.id,
        itemLabel: selectedCategoryForForm?.name,
      })
      handleCloseCategoryForm()
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to save category",
        severity: "error"
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this category?")) return

    try {
      await deleteCategory?.(categoryId)
      setNotification({
        open: true,
        message: "Category deleted successfully",
        severity: "success"
      })
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to delete category",
        severity: "error"
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchTerm.length > 0

  return (
    <Box>
      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search categories..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Category"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit categories."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {/* Categories Grid */}
      {filteredAndSortedCategories.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={CategoryIcon}
            title={hasActiveFilters ? "No categories match your filters" : "No categories found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first category to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedCategories.map((category) => {
            return (
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
              lg={2}
              xl={1.5}
              // Avoid React key collisions between different entity types sharing an id
              key={`${category.kind || "Category"}-${category.id || category.name || "item"}`}
            >
              <Card
                onClick={() => handleOpenCategoryForm(category, 'view')}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  minHeight: 90,
                  position: 'relative',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${getDisplayColor(category.color, category.active)}`,
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                  <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word', mb: 0.25 }}>
                    {category.name}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: themeConfig.brandColors.navy, mb: 0.25, display: 'block' }}>
                    {category.kind || 'Category'}
                  </Typography>
                  
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
                  <Tooltip title="Edit Category" placement="left">
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={!canMutate}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenCategoryForm(category, 'edit')
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
                  <Tooltip title="Delete Category" placement="left">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={!canRemove}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!canRemove) return
                        handleDeleteCategory(category.id)
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
            )
          })}
        </Grid>
      )}

      {/* CRUD Modal */}
      <CRUDModal
        open={categoryFormOpen}
        onClose={(reason) => {
          setCategoryFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedCategoryForForm(null)
            setCrudMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "categoriesManagementModal1",
          crudMode: crudMode,
          id: selectedCategoryForForm?.id,
          itemLabel: selectedCategoryForForm?.name,
        }}
        title={
          crudMode === "create"
            ? "Add category"
            : crudMode === "edit"
              ? "Edit category"
              : "View category"
        }
        icon={<CategoryIcon />}
        mode={crudMode}
        onSave={crudMode !== "view" ? handleSaveCategoryForm : undefined}
        hideSaveButton={crudMode === "view"}
      >
        <CategoryForm
          category={selectedCategoryForForm}
          mode={crudMode}
          onSave={handleSaveCategoryForm}
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

export default CategoriesManagement
