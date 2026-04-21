"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Alert,
  type SelectChangeEvent,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  TableRestaurant as TableIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { Table } from "../../../backend/interfaces/POS"
import DataHeader from "../../../frontend/components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../../frontend/components/reusable/CRUDModal"

// Extended table interface for form data
interface TableFormData extends Partial<Table> {
  // Table interface uses x, y coordinates instead of location string
}

const TableManagement: React.FC = () => {
  const location = useLocation()
  const { state: companyState } = useCompany()
  const { state: posState, refreshTables, deleteTable } = usePOS()

  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  
  // Notification state
  const [error, setError] = useState<string | null>(null)

  // Load tables data
  useEffect(() => {
    const loadTables = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        await refreshTables()
        setTables(posState.tables || [])
      } catch (error) {
        console.error("Error loading tables:", error)
      }
    }

    loadTables()
  }, [companyState.companyID, companyState.selectedSiteID, refreshTables])

  // Update local state when POS context changes
  useEffect(() => {
    setTables(posState.tables || [])
  }, [posState.tables])
  const [formData, setFormData] = useState<TableFormData>({
    name: "",
    seats: 4,
    number: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    shape: "rectangle",
    status: "available",
    isActive: true,
  })
  const [locations, setLocations] = useState<any[]>([])

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Define sort options for DataHeader
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "seats", label: "Capacity" },
    { value: "number", label: "Number" },
    { value: "status", label: "Status" },
  ]

  // Handle sort change from DataHeader
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortBy(field)
    setSortDirection(direction)
  }

  // Handle export from DataHeader
  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting tables as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  // Add filtered and sorted tables calculation
  const filteredAndSortedTables = tables
    .filter(
      (table) =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.sectionName && table.sectionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (table.status && table.status.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => {
      if (!sortBy) return 0
      
      const aValue = a[sortBy as keyof Table]
      const bValue = b[sortBy as keyof Table]
      
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
    if (companyState.companyID && companyState.selectedSiteID) {
      loadTables()

      // Use POS context for locations
      setLocations(posState.locations || [])
    }
  }, [companyState.companyID, companyState.selectedSiteID])

  const loadTables = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    setIsLoading(true)
    try {
      // Use POS context for tables
      const fetchedTables = posState.tables || []
      setTables(fetchedTables)
    } catch (error) {
      console.error("Error fetching tables:", error)
      setError("Failed to load tables. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTable(null)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    // Validate form
    if (!formData.name) {
      setError("Table name is required")
      return
    }

    try {
      if (selectedTable && selectedTable.id) {
        // Update existing table
        await refreshTables() // This will refresh the tables from POS context
      } else {
        // Create new table
        await refreshTables() // This will refresh the tables from POS context
      }
      handleCloseDialog()
      loadTables()
    } catch (error) {
      console.error("Error saving table:", error)
      setError("Failed to save table. Please try again.")
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID || !tableId) return

    try {
      // Delete table using POS context
      await deleteTable(tableId)
      await refreshTables()
      loadTables()
    } catch (error) {
      console.error("Error deleting table:", error)
      setError("Failed to delete table. Please try again.")
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Available":
        return "success"
      case "Occupied":
        return "error"
      case "Reserved":
        return "warning"
      case "Maintenance":
        return "info"
      default:
        return "default"
    }
  }

  // CRUD Modal handlers
  const handleOpenCrudModal = (table: Table | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedTable(table)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedTable(null)
    setCrudMode('create')
  }


  return (
    <Box>
      <DataHeader
        title="Table Management"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tables..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCrudModal(null, 'create')}
        createButtonLabel="Create Table"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, mt: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {filteredAndSortedTables.map((table) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={table.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TableIcon sx={{ mr: 1, color: themeConfig.brandColors.navy }} />
                  <Typography variant="h6">{table.name}</Typography>
                </Box>
                <Chip
                  label={table.status || "Available"}
                  color={getStatusColor(table.status) as "success" | "error" | "warning" | "info" | "default"}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Capacity: {table.seats} guests
                </Typography>
                {table.sectionName && (
                  <Typography variant="body2" color="text.secondary">
                    Section: {table.sectionName}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenCrudModal(table, 'edit')}>
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => table.id && handleDeleteTable(table.id)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {filteredAndSortedTables.length === 0 && !isLoading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                No tables found. Click "Add Table" to create your first table.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Table Form Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedTable ? "Edit Table" : "Add New Table"}</Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Table Name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                fullWidth
                required
                error={!formData.name}
                helperText={!formData.name ? "Table name is required" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Minimum Covers"
                name="minCovers"
                type="number"
                value={formData.minCovers || 1}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Maximum Covers"
                name="maxCovers"
                type="number"
                value={formData.maxCovers || 4}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select name="status" value={formData.status || "available"} label="Status" onChange={handleSelectChange}>
                  <MenuItem value="Dining">Dining</MenuItem>
                  <MenuItem value="Bar">Bar</MenuItem>
                  <MenuItem value="Outdoor">Outdoor</MenuItem>
                  <MenuItem value="Private">Private</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Order"
                name="order"
                type="number"
                value={formData.order || 0}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Section</InputLabel>
                <Select name="sectionId" value={formData.sectionId || ""} label="Section" onChange={handleSelectChange}>
                  <MenuItem value="">None</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.name}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedTable ? "Update" : "Create"}
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
                crudEntity: "tableManagementModal1",
                crudMode: crudMode,
              }}
              title={crudMode === 'create' ? 'Add Table' : crudMode === 'edit' ? 'Edit Table' : 'View Table'}
              mode={crudMode}
            >
        {/* Simple table form - would create proper POS TableForm component */}
        <div>
          <p>Table form placeholder - {crudMode} mode</p>
          <button onClick={handleCloseCrudModal}>Close</button>
        </div>
      </CRUDModal>
    </Box>
  )
}

export default TableManagement
