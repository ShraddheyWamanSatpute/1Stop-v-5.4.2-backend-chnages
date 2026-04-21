"use client"

import type React from "react"
import { useState } from "react"
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
  IconButton,
  Button,
  Chip,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material"

interface Column {
  id: string
  label: string
  minWidth?: number
  align?: "right" | "left" | "center"
  format?: (value: any) => string | React.ReactElement
}

interface POSSettingsTableProps {
  title: string
  data: any[]
  columns: Column[]
  onAdd?: () => void
  onEdit?: (item: any) => void
  onDelete?: (item: any) => void
  onView?: (item: any) => void
  searchPlaceholder?: string
  filterOptions?: { label: string; value: string }[]
  addButtonText?: string
  canAdd?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canView?: boolean
  loading?: boolean
  error?: string | null
}

const POSSettingsTable: React.FC<POSSettingsTableProps> = ({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onView,
  filterOptions = [],
  addButtonText = "Add New",
  canAdd = true,
  canEdit = true,
  canDelete = true,
  canView = true,
  loading = false,
  error = null,
}) => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm] = useState("")
  const [filterValue] = useState("all")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Filter and search data
  const filteredData = data.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      Object.values(item).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter =
      filterValue === "all" || (filterOptions.length > 0 && item[filterOptions[0]?.value] === filterValue)

    return matchesSearch && matchesFilter
  })

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }


  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedItem(null)
  }

  const handleEdit = () => {
    if (!canEdit) return
    if (onEdit && selectedItem) {
      onEdit(selectedItem)
    }
    handleMenuClose()
  }

  const handleView = () => {
    if (!canView) return
    if (onView && selectedItem) {
      onView(selectedItem)
    }
    handleMenuClose()
  }

  const handleDeleteClick = () => {
    if (!canDelete) return
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const handleDeleteConfirm = () => {
    if (!canDelete) return
    if (onDelete && selectedItem) {
      onDelete(selectedItem)
    }
    setDeleteDialogOpen(false)
    setSelectedItem(null)
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setSelectedItem(null)
  }

  const renderCellValue = (column: Column, value: any) => {
    if (column.format) {
      return column.format(value)
    }

    // Handle common data types
    if (typeof value === "boolean") {
      return <Chip label={value ? "Yes" : "No"} size="small" color={value ? "success" : "default"} variant="outlined" />
    }

    if (column.id === "status") {
      return (
        <Chip
          label={value}
          size="small"
          color={
            value === "active" || value === "online"
              ? "success"
              : value === "inactive" || value === "offline"
                ? "error"
                : value === "pending" || value === "maintenance"
                  ? "warning"
                  : "default"
          }
        />
      )
    }

    if (column.id === "price" || column.id === "cost" || column.id === "amount") {
      return `$${Number(value).toFixed(2)}`
    }

    if (column.id === "date" || column.id === "createdAt" || column.id === "updatedAt") {
      return new Date(value).toLocaleDateString()
    }

    return String(value)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        {canAdd && onAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} disabled={!canAdd}>
            {addButtonText}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}


      {/* Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label={`${title} table`}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align="center"
                    style={{ minWidth: column.minWidth }}
                    sx={{ fontWeight: 600, textAlign: 'center !important' }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                    <Typography>Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm || filterValue !== "all" ? "No matching items found" : "No data available"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, index) => (
                  <TableRow 
                    hover 
                    role="checkbox" 
                    tabIndex={-1} 
                    key={item.id || index}
                    onClick={() => canView && onView && onView(item)}
                    sx={{ cursor: canView && onView ? "pointer" : "default" }}
                  >
                    {columns.map((column) => {
                      const value = item[column.id]
                      return (
                        <TableCell key={column.id} align="center">
                          {renderCellValue(column, value)}
                        </TableCell>
                      )
                    })}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {canEdit && onEdit && (
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(item)
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {canDelete && onDelete && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedItem(item)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {canView && onView && (
          <MenuItem onClick={handleView}>
            <ViewIcon sx={{ mr: 1 }} />
            View
          </MenuItem>
        )}
        {canEdit && onEdit && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {canDelete && onDelete && (
          <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this item? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={!canDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default POSSettingsTable
