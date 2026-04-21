"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as CategoryMenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
} from "@mui/material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import type { Product } from "../../../backend/interfaces/Stock"
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import ProductForm from "../../components/stock/forms/ProductForm"

interface MenuItem {
  id: string
  name: string
  price: number
  categoryId?: string
  category?: string
  image?: string
  description: string
  available: boolean
  preparationTime: number
  allergens: string[]
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  description?: string
}

const MenuManagement: React.FC = () => {
  const location = useLocation()
  const { createPromotion, updatePromotion, refreshPromotions } = usePOS()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<Partial<MenuItem>>({})
  const [error, setError] = useState<string | null>(null)

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { hasPermission } = useCompany()

  // Check permissions
  const canView = hasPermission("pos", "menu", "view")
  const canEdit = hasPermission("pos", "menu", "edit")
  const canDelete = hasPermission("pos", "menu", "delete")

  // Convert Product to MenuItem
  const convertProductToMenuItem = (product: Product): MenuItem => {
    return {
      id: product.id,
      name: product.name || "",
      price: typeof product.price === "string" ? Number.parseFloat(product.price) || 0 : product.price || 0,
      categoryId: product.categoryId,
      category: product.categoryId,
      image: product.image,
      description: product.description || "",
      available: true,
      preparationTime: 15,
      allergens: [],
      createdAt: product.createdAt ? 
        (typeof product.createdAt === "string" ? product.createdAt : product.createdAt.toISOString()) : 
        new Date().toISOString(),
      updatedAt: product.updatedAt ? 
        (typeof product.updatedAt === "string" ? product.updatedAt : product.updatedAt.toISOString()) : 
        new Date().toISOString(),
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Mock data for now since StockContext doesn't exist
        const mockProducts: Product[] = [
          {
            id: "1",
            name: "Margherita Pizza",
            price: 12.99,
            categoryId: "1",
            subcategoryId: "", // Added required property
            salesDivisionId: "", // Added required property
            description: "Classic pizza with tomato sauce, mozzarella, and basil",
            image: "",
            type: "purchase-sell",
            predictedStock: 0,
            salesPrice: 12.99, // Added required property
            purchasePrice: 5.99, // Added required property
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2", 
            name: "Caesar Salad",
            price: 8.99,
            categoryId: "2",
            subcategoryId: "", // Added required property
            salesDivisionId: "", // Added required property
            description: "Fresh romaine lettuce with caesar dressing and croutons",
            image: "",
            type: "purchase-sell",
            predictedStock: 0,
            salesPrice: 8.99, // Added required property
            purchasePrice: 3.99, // Added required property
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]

        const items = mockProducts
          .filter((product: Product) => product.type === "purchase-sell")
          .map(convertProductToMenuItem)

        setMenuItems(items)

        // Mock categories
        const mockCategories: Category[] = [
          { id: "1", name: "Appetizers", description: "Starters and small plates" },
          { id: "2", name: "Main Courses", description: "Primary dishes" },
          { id: "3", name: "Desserts", description: "Sweet treats" },
          { id: "4", name: "Beverages", description: "Drinks and refreshments" },
        ]
        setCategories(mockCategories)
      } catch (error) {
        console.error("Error fetching menu data:", error)
        setError("Failed to load menu items")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])



  const handleDelete = async (item: MenuItem) => {
    if (!canDelete) return

    try {
      setMenuItems((prev) => prev.filter((menuItem) => menuItem.id !== item.id))
    } catch (error) {
      console.error("Error deleting menu item:", error)
      setError("Failed to delete menu item")
    }
  }

  const handleSave = async () => {
    try {
      const itemData: MenuItem = {
        id: editingItem?.id || Date.now().toString(),
        name: formData.name || "",
        price: formData.price || 0,
        categoryId: formData.categoryId,
        category: categories.find((c) => c.id === formData.categoryId)?.name,
        image: formData.image,
        description: formData.description || "",
        available: formData.available ?? true,
        preparationTime: formData.preparationTime || 15,
        allergens: formData.allergens || [],
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (editingItem) {
        setMenuItems((prev) => prev.map((item) => (item.id === editingItem.id ? itemData : item)))
      } else {
        setMenuItems((prev) => [...prev, itemData])
      }

      setDialogOpen(false)
      setFormData({})
      setEditingItem(null)
    } catch (error) {
      console.error("Error saving menu item:", error)
      setError("Failed to save menu item")
    }
  }

  const handleInputChange = (field: keyof MenuItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // DataHeader handlers
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'category', label: 'Category' },
    { value: 'available', label: 'Availability' },
    { value: 'preparationTime', label: 'Prep Time' },
    { value: 'createdAt', label: 'Created Date' }
  ]

  const filteredAndSortedMenuItems = menuItems
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy as keyof MenuItem]
      const bValue = b[sortBy as keyof MenuItem]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc' ? (aValue ? 1 : -1) - (bValue ? 1 : -1) : (bValue ? 1 : -1) - (aValue ? 1 : -1)
      }
      
      return 0
    })

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = () => {
    const data = filteredAndSortedMenuItems.map(item => ({
      'Name': item.name,
      'Price': `$${item.price.toFixed(2)}`,
      'Category': item.category || 'N/A',
      'Description': item.description,
      'Available': item.available ? 'Yes' : 'No',
      'Prep Time': `${item.preparationTime} min`,
      'Allergens': item.allergens.join(', ') || 'None',
      'Created': new Date(item.createdAt).toLocaleDateString(),
      'Updated': new Date(item.updatedAt).toLocaleDateString()
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `menu-items-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // CRUD Modal handlers
  const handleOpenCrudModal = (menuItem: MenuItem | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedMenuItem(menuItem)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedMenuItem(null)
    setCrudMode('create')
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        // Create new menu item
        await createPromotion(formData)
      } else if (crudMode === 'edit' && selectedMenuItem) {
        // Update existing menu item
        await updatePromotion(selectedMenuItem.id, formData)
      }
      handleCloseCrudModal()
      // Refresh menu items
      await refreshPromotions()
    } catch (error) {
      console.error('Failed to save menu item:', error)
    }
  }

  if (!canView) {
    return (
      <Box p={3}>
        <Alert severity="error">You don't have permission to view menu items.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataHeader
        title="Menu Management"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search menu items..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport()}
        onExportPDF={() => handleExport()}
        onCreateNew={canEdit ? () => handleOpenCrudModal(null, 'create') : undefined}
        createButtonLabel="Add Menu Item"
      />

      <Box sx={{ mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Alert severity="info">Loading menu items...</Alert>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {filteredAndSortedMenuItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {item.name}
                  </Box>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                    {item.category} • ${item.price.toFixed(2)} • {item.preparationTime} min
                  </Box>
                  <Box sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5 }}>
                    {item.description}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1, 
                    backgroundColor: item.available ? 'success.light' : 'error.light',
                    color: item.available ? 'success.dark' : 'error.dark',
                    fontSize: '0.8rem'
                  }}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </Box>
                  {canEdit && (
                    <Button size="small" onClick={() => handleOpenCrudModal(item, 'edit')}>
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="small" color="error" onClick={() => handleDelete(item)}>
                      Delete
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
            {filteredAndSortedMenuItems.length === 0 && (
              <Alert severity="info">No menu items found matching your search criteria.</Alert>
            )}
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Item Name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.categoryId || ""}
                  onChange={(e) => handleInputChange("categoryId", e.target.value)}
                  label="Category"
                >
                  {categories.map((category) => (
                    <CategoryMenuItem key={category.id} value={category.id}>
                      {category.name}
                    </CategoryMenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price ($)"
                type="number"
                value={formData.price || ""}
                onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Preparation Time (minutes)"
                type="number"
                value={formData.preparationTime || ""}
                onChange={(e) => handleInputChange("preparationTime", Number.parseInt(e.target.value) || 15)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.image || ""}
                onChange={(e) => handleInputChange("image", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.available ?? true}
                    onChange={(e) => handleInputChange("available", e.target.checked)}
                  />
                }
                label="Available"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingItem ? "Update" : "Create"}
          </Button>
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
                crudEntity: "menuManagementModal1",
                crudMode: crudMode,
              }}
              title={crudMode === 'create' ? 'Add Menu Item' : crudMode === 'edit' ? 'Edit Menu Item' : 'View Menu Item'}
              mode={crudMode}
            >
        <ProductForm
          open={crudModalOpen}
          onClose={handleCloseCrudModal}
          product={selectedMenuItem ? {
            id: selectedMenuItem.id,
            name: selectedMenuItem.name,
            description: selectedMenuItem.description,
            price: selectedMenuItem.price,
            type: 'product',
            categoryId: selectedMenuItem.categoryId || '',
            subcategoryId: selectedMenuItem.categoryId || '',
            salesDivisionId: '',
            salesPrice: selectedMenuItem.price,
            purchasePrice: 0,
            predictedStock: 0
          } : null}
          mode={crudMode}
          onSave={handleSaveCrudModal}
        />
      </CRUDModal>
    </Box>
  )
}

export default MenuManagement
