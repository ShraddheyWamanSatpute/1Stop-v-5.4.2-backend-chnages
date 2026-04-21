"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  useTheme,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useStock } from "../../../backend/context/StockContext"
import DataHeader from "../../../frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../frontend/components/reusable/CRUDModal"
import CategoryForm from "../../../frontend/components/stock/forms/CategoryForm"
import { themeConfig } from "../../../theme/AppTheme"
// Removed commented Firebase code - using Stock context instead

interface SalesCategory {
  id: string
  name: string
  description: string
  color: string
  taxRate: number
}

const SalesCategoryManagement: React.FC = () => {
  const location = useLocation()
  const theme = useTheme()
  const { state: companyState } = useCompany()
  const { state: stockState, createCategory, updateCategory, deleteCategory, refreshAll } = useStock()

  const normalizeColor = (input?: string) => {
    const c = String(input || "").trim().toLowerCase()
    if (!c) return themeConfig.brandColors.navy

    // blue/black/grey -> navy
    if (["#1976d2", "#2196f3", "#3f51b5", "#000", "#000000", "#111", "#111111", "#333", "#333333", "#9e9e9e", "#e0e0e0", "#f5f5f5"].includes(c)) {
      return themeConfig.brandColors.navy
    }
    // pink/white -> off-white
    if (["#d81b60", "#e91e63", "#fff", "#ffffff", "white"].includes(c)) {
      return themeConfig.brandColors.offWhite
    }

    return input as string
  }

  const [categories, setCategories] = useState<SalesCategory[]>([])
  const [open, setOpen] = useState(false)

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedCategory, setSelectedCategory] = useState<SalesCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: themeConfig.brandColors.navy,
    taxRate: 0,
  })

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Define sort options for DataHeader
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
    { value: "taxRate", label: "Tax Rate" },
  ]

  // Handle sort change from DataHeader
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortBy(field)
    setSortDirection(direction)
  }

  // Handle export from DataHeader
  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting sales categories as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  // Add filtered and sorted categories calculation
  const filteredAndSortedCategories = categories
    .filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortBy) return 0
      
      const aValue = a[sortBy as keyof SalesCategory]
      const bValue = b[sortBy as keyof SalesCategory]
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  useEffect(() => {
    // Update the useEffect to fetch real data
    const fetchCategoriesData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        // Use Stock context for categories
        const categoriesData = stockState.categories || []

        // Filter only categories (not subcategories)
        const salesCategories = categoriesData
          .filter((cat: any) => cat.type === "category")
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || `${cat.name} category`,
            color: normalizeColor(cat.color || themeConfig.brandColors.navy),
            taxRate: 10, // Default value
          }))

        setCategories(salesCategories)
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    if (companyState.companyID && companyState.selectedSiteID) {
      fetchCategoriesData()
    }
  }, [companyState.companyID, companyState.selectedSiteID])


  const handleClose = () => {
    setOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "taxRate" ? Number.parseFloat(value) : value,
    })
  }

  const handleSubmit = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      // Create category data
      const categoryData = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        type: "category",
        companyID: companyState.companyID,
        siteID: companyState.selectedSiteID,
      }

      // Use Stock context instead of direct RTDatabase calls
      if (selectedCategory) {
        // Update existing category
        await updateCategory?.(selectedCategory.id, categoryData);
      } else {
        // Add new category
        await createCategory?.(categoryData);
      }

      // Refresh categories from context
      await refreshAll();
      const categoriesData = stockState.categories || []

      // Filter only categories (not subcategories)
      const salesCategories = categoriesData
        .filter((cat: any) => cat.type === "category")
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || `${cat.name} category`,
          color: normalizeColor(cat.color || themeConfig.brandColors.navy),
          taxRate: 10, // Default value
        }))

      setCategories(salesCategories)
      handleClose()
    } catch (error) {
      console.error("Error saving category:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        // Use Stock context for deletion
        await deleteCategory?.(id);

        // Refresh categories from context
        await refreshAll();
        const categoriesData = stockState.categories || []

        // Filter only categories (not subcategories)
        const salesCategories = categoriesData
          .filter((cat: any) => cat.type === "category")
          .map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || `${cat.name} category`,
            color: normalizeColor(cat.color || themeConfig.brandColors.navy),
            taxRate: 10, // Default value
          }))

        setCategories(salesCategories)
      } catch (error) {
        console.error("Error deleting category:", error)
        alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // CRUD Modal handlers
  const handleOpenCrudModal = (category: SalesCategory | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedCategory(category)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedCategory(null)
    setCrudMode('create')
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        // Create new category
        await createCategory?.(formData);
        console.log('Category created successfully')
      } else if (crudMode === 'edit' && selectedCategory) {
        // Update existing category
        await updateCategory?.(selectedCategory.id, formData);
        console.log('Category updated successfully')
      }
      handleCloseCrudModal()
      // Refresh categories
      await refreshAll()
    } catch (error) {
      console.error('Failed to save category:', error)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        title="Sales Category Management"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search categories..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCrudModal(null, 'create')}
        createButtonLabel="Add Category"
      />

      <Paper sx={{ width: "100%", overflow: "hidden", mt: 3 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="sales categories table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Tax Rate (%)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        backgroundColor: category.color,
                        borderRadius: "4px",
                      }}
                    />
                  </TableCell>
                  <TableCell>{category.taxRate}%</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenCrudModal(category, 'edit')}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(category.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedCategory ? "Update the details for this sales category." : "Enter the details for the new sales category."}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="color"
            label="Color"
            type="color"
            fullWidth
            variant="outlined"
            value={formData.color}
            onChange={handleChange}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            name="taxRate"
            label="Tax Rate (%)"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.taxRate}
            onChange={handleChange}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{selectedCategory ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      {/* CRUD Modal */}
                        <CRUDModal
              open={crudModalOpen}
              onClose={(reason) => {
                setCrudModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = handleCloseCrudModal
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "salesCategoryManagementModal1",
                crudMode: crudMode,
              }}
              title={crudMode === 'create' ? 'Add Category' : crudMode === 'edit' ? 'Edit Category' : 'View Category'}
              mode={crudMode}
            >
        <CategoryForm
          category={selectedCategory}
          mode={crudMode}
          onSave={handleSaveCrudModal}
        />
      </CRUDModal>
    </Box>
  )
}

export default SalesCategoryManagement
