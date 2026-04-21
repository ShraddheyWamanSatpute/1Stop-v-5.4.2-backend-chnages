"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from "@mui/material"
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  RestaurantMenu as RestaurantMenuIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { useCompany } from "../../../backend/context/CompanyContext"
import { useStock } from "../../../backend/context/StockContext"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"

// Define the MenuItem interface
interface MenuItemType {
  id: string
  name: string
  description?: string
  image?: string
  salesPrice: number // This is mapped from product.price
  category?: string
  subcategory?: string
  course?: string
  type?: string
  active?: boolean
}

// Define sort direction type
type Order = "asc" | "desc"

const MenuItemsTable = () => {
  const navigate = useNavigate()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "items")
  const canRemove = canDelete("pos", "items")
  const { state: companyState } = useCompany()
  const { state: stockState, refreshProducts } = useStock()

  // State variables
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [orderBy, setOrderBy] = useState<keyof MenuItemType>("name")
  const [order, setOrder] = useState<Order>("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter] = useState<string>("all")
  
  // DataHeader state
  const [dataHeaderSortBy, setDataHeaderSortBy] = useState<string>("name")
  const [dataHeaderSortDirection, setDataHeaderSortDirection] = useState<'asc' | 'desc'>("asc")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Course filter state
  const [courseFilter] = useState<string>("all")

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems()
  }, [companyState.companyID, companyState.selectedSiteID])

  // Enhance the fetchMenuItems function to properly use courses from products
  const fetchMenuItems = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) {
      return
    }

    try {
      // Fetch products from POS context
      await refreshProducts()
      const products: any[] = stockState.products || []

      // Map products to menu items with proper course information
      const menuItems = products
        .filter((product: any) => product.price && product.price > 0)
        .map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || "",
          image: product.image || "",
          salesPrice: product.price || 0,
          category: product.categoryId || "Uncategorized",
          subcategory: product.subcategoryId || "",
          course: product.course || "Main", // Use course from product or default to "Main"
          type: product.type || "food",
          active: true, // Default to active if not specified
        }))

      setMenuItems(menuItems)

      // Categories and courses extraction removed as they're not being used
    } catch (error) {
      debugWarn("Error fetching menu items:", error)
      setMenuItems([])
    }
  }

  // Add a function to get course label for display
  const getCourseLabel = (course: string | undefined) => {
    if (!course) return "N/A"

    switch (course.toLowerCase()) {
      case "starter":
      case "appetizer":
        return "Starter"
      case "main":
      case "entree":
        return "Main Course"
      case "dessert":
        return "Dessert"
      case "side":
      case "side dish":
        return "Side Dish"
      case "drink":
      case "beverage":
        return "Drink"
      default:
        return course
    }
  }

  // Handle sort request
  const handleRequestSort = (property: keyof MenuItemType) => {
    const isAsc = orderBy === property && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(property)
  }

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10))
    setPage(0)
  }

  // Filter functions removed as they're not being used

  // Handle view menu item
  const handleViewItem = (id: string) => {
    navigate(`/POS/Menu/${id}`)
  }

  // Handle edit menu item
  const handleEditItem = (id: string) => {
    navigate(`/POS/MenuEdit/${id}`)
  }

  // Handle delete menu item
  const handleDeleteClick = (id: string) => {
    if (!canRemove) return
    setSelectedItemId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!canRemove) return
    if (!selectedItemId || !companyState.companyID || !companyState.selectedSiteID) {
      setDeleteDialogOpen(false)
      return
    }

    try {
      // Delete product using POS context
      // Note: This would need a deleteProduct function in POSContext
      debugLog("Delete product:", selectedItemId)
      setMenuItems(menuItems.filter((item) => item.id !== selectedItemId))
    } catch (error) {
      debugWarn("Error deleting menu item:", error)
    } finally {
      setDeleteDialogOpen(false)
      setSelectedItemId(null)
    }
  }

  // Handle add new menu item
  const handleAddMenuItem = () => {
    if (!canMutate) return
    navigate("/POS/MenuAdd")
  }

  // Filter and sort menu items
  const filteredItems = menuItems
    .filter((item) => {
      // Apply category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false
      }

      // Apply course filter
      if (courseFilter !== "all" && item.course !== courseFilter) {
        return false
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          (item.category && item.category.toLowerCase().includes(searchLower)) ||
          (item.course && item.course.toLowerCase().includes(searchLower))
        )
      }

      return true
    })
    .sort((a, b) => {
      // Sort by selected column
      const aValue = a[orderBy]
      const bValue = b[orderBy]

      if (!aValue || !bValue) return 0

      // Handle different types of values
      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return 0
    })

  // Calculate pagination
  const paginatedItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  // DataHeader sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'salesPrice', label: 'Price' },
    { value: 'category', label: 'Category' },
    { value: 'course', label: 'Course' },
    { value: 'active', label: 'Status' }
  ];

  // DataHeader handlers
  const handleDataHeaderSortChange = (field: string, direction: 'asc' | 'desc') => {
    setDataHeaderSortBy(field);
    setDataHeaderSortDirection(direction);
    // Update legacy sort state for compatibility
    setOrderBy(field as keyof MenuItemType);
    setOrder(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting menu items as ${format}`);
    // Export functionality would be implemented here
  };

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box sx={{ width: "100%" }}>
      <DataHeader
        title="Menu Items"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search menu items..."
        sortOptions={sortOptions}
        sortValue={dataHeaderSortBy}
        sortDirection={dataHeaderSortDirection}
        onSortChange={handleDataHeaderSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => navigate("/POS/MenuManagement")}
        createButtonLabel="Add Menu Item"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit menu items."
      />

      <Paper sx={{ width: "100%", mb: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "name"}
                    direction={orderBy === "name" ? order : "asc"}
                    onClick={() => handleRequestSort("name")}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Image</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "category"}
                    direction={orderBy === "category" ? order : "asc"}
                    onClick={() => handleRequestSort("category")}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "course"}
                    direction={orderBy === "course" ? order : "asc"}
                    onClick={() => handleRequestSort("course")}
                  >
                    Course
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "salesPrice"}
                    direction={orderBy === "salesPrice" ? order : "asc"}
                    onClick={() => handleRequestSort("salesPrice")}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <TableRow hover key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.image ? (
                        <Avatar src={item.image} alt={item.name} variant="rounded" sx={{ width: 40, height: 40 }} />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: "primary.light" }}>
                          {item.name.charAt(0)}
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>{item.category || "Uncategorized"}</TableCell>
                    <TableCell>{getCourseLabel(item.course)}</TableCell>
                    <TableCell>${item.salesPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.active !== false ? "Active" : "Inactive"}
                        color={item.active !== false ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => handleViewItem(item.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditItem(item.id)} disabled={!canMutate}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(item.id)} disabled={!canRemove}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 4 }}>
                      <EmptyStateCard
                        icon={RestaurantMenuIcon}
                        title={searchTerm || categoryFilter !== "all" || courseFilter !== "all" ? "No menu items match your filters" : "No menu items found"}
                        description={
                          searchTerm || categoryFilter !== "all" || courseFilter !== "all" ? "Try adjusting your filters or search query" : "Add your first menu item to get started"
                        }
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Menu Item</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this menu item? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MenuItemsTable
