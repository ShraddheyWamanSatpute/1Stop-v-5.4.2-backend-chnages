"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Tooltip
} from "@mui/material"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import BookingTypeForm from "./forms/BookingTypeForm"
import { SelectChangeEvent } from "@mui/material/Select"
import { Edit as EditIcon, Delete as DeleteIcon, ColorLens as ColorLensIcon, Event as EventIcon, Save as SaveIcon } from "@mui/icons-material"
import { useBookings as useBookingsContext, BookingType } from "../../../backend/context/BookingsContext"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

/**
 * BookingTypesManagement Component
 * 
 * This component displays and manages booking types for the application.
 * It has been simplified to fix TypeScript errors.
 */

// Color options for booking types
const COLOR_OPTIONS = [
  '#4caf50', // Green
  '#2196f3', // Blue
  '#f44336', // Red
  '#ff9800', // Orange
  themeConfig.colors.primary.light, // Navy light (replaces purple)
  '#00bcd4', // Cyan
  '#795548', // Brown
  '#607d8b', // Blue Grey
  '#e91e63', // Pink
  themeConfig.brandColors.navy  // Navy (replaces deep purple)
]

const BookingTypesManagement = (): React.ReactNode => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "types")
  const canRemove = canDelete("bookings", "types")
  const { 
    bookingTypes: contextBookingTypes,
    loading,
    fetchBookingTypes,
    addBookingType,
    updateBookingType,
    deleteBookingType
  } = useBookingsContext()

  // State
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBookingType, setSelectedBookingType] = useState<BookingType | null>(null)
  const [formData, setFormData] = useState<Partial<BookingType>>({
    name: "",
    description: "",
    color: "#4caf50",
    defaultDuration: 60,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [searchTerm, setSearchTerm] = useState("")

  // Booking type form states
  const [typeFormOpen, setTypeFormOpen] = useState(false)
  const [typeFormMode, setTypeFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTypeForForm, setSelectedTypeForForm] = useState<BookingType | null>(null)
  
  // Load booking types on component mount
  useEffect(() => {
    const loadBookingTypes = async () => {
      try {
        await fetchBookingTypes()
      } catch (error) {
        debugWarn("Error loading booking types:", error)
        setError("Failed to load booking types")
      }
    }
    
    loadBookingTypes()
  }, [fetchBookingTypes])
  
  // Sort options for booking types
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Created Date" },
  ]

  // Filter and sort booking types
  const filteredAndSortedBookingTypes = useMemo(() => {
    return [...(contextBookingTypes || [])]
      .filter((type) => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return true
        return (
          (type.name || "").toLowerCase().includes(query) ||
          (type.description || "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
      let aValue: string | number | Date = ""
      let bValue: string | number | Date = ""

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt) : new Date(0)
          bValue = b.createdAt ? new Date(b.createdAt) : new Date(0)
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      if (sortBy === "createdAt" && aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime()
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        const comparison = aValue.toString().localeCompare(bValue.toString())
        return sortDirection === "asc" ? comparison : -comparison
      }
      })
  }, [contextBookingTypes, searchTerm, sortBy, sortDirection])
  
  // Reset form when selected booking type changes
  useEffect(() => {
    if (selectedBookingType) {
      setFormData({
        ...selectedBookingType,
        updatedAt: new Date().toISOString()
      })
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#4caf50",
        defaultDuration: 60,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }, [selectedBookingType])
  
  
  // Handle dialog close
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedBookingType(null)
    setError(null)
  }
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle select change
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle switch change
  const handleSwitchChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [name]: e.target.checked
    }))
  }
  
  
  // Handle delete confirmation dialog
  const handleDelete = (id: string) => {
    if (!canRemove) return
    setTypeToDelete(id)
    setDeleteConfirmOpen(true)
  }
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!canRemove) return
    if (!typeToDelete) return
    
    try {
      await deleteBookingType(typeToDelete)
      setSuccess("Booking type deleted successfully")
      setDeleteConfirmOpen(false)
      setTypeToDelete(null)
      // Refresh booking types
      await fetchBookingTypes()
    } catch (error) {
      debugWarn("Error deleting booking type:", error)
      setError("Failed to delete booking type")
    }
  }
  
  // Handle save
  const handleSave = async () => {
    try {
      setError(null)
      
      if (selectedBookingType?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...formData, id: selectedBookingType.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBookingType(selectedBookingType.id, updatePayload)
        setSuccess("Booking type updated successfully")
      } else {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(formData).filter(([_, value]) => value !== undefined)
        )
        // Ensure all required fields are present for BookingType
        const newBookingType: Omit<BookingType, "id"> = {
          name: createPayload.name || "",
          description: createPayload.description || "",
          color: createPayload.color || "#4caf50",
          defaultDuration: createPayload.defaultDuration || 60,
          active: createPayload.active !== false,
          createdAt: createPayload.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Add required properties from BookingType interface
          minAdvanceHours: createPayload.minAdvanceHours || 1,
          maxAdvanceDays: createPayload.maxAdvanceDays || 30,
          depositType: createPayload.depositType || "none",
          availableDays: createPayload.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          availableTimeSlots: createPayload.availableTimeSlots || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"]
        }
        await addBookingType(newBookingType)
        setSuccess("Booking type created successfully")
      }
      
      setIsDialogOpen(false)
      setSelectedBookingType(null)
      // Refresh booking types
      await fetchBookingTypes()
    } catch (error) {
      debugWarn("Error saving booking type:", error)
      setError("Failed to save booking type")
    }
  }

  // New CRUD form handlers
  const handleOpenTypeForm = (bookingType: BookingType | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTypeForForm(bookingType)
    setTypeFormMode(mode)
    setTypeFormOpen(true)
  }

  const handleCloseTypeForm = () => {
    setTypeFormOpen(false)
    setSelectedTypeForForm(null)
    setTypeFormMode('create')
  }

  // Helper function to sanitize data by removing React internal properties
  const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return data
    if (typeof data !== 'object') return data
    if (data instanceof Date) return data
    if (Array.isArray(data)) return data.map(sanitizeData)
    
    const sanitized: any = {}
    for (const key in data) {
      // Skip React internal properties and event properties
      if (key.startsWith('__react') || key === 'target' || key === 'currentTarget' || key === 'nativeEvent') {
        continue
      }
      const value = data[key]
      // Skip functions and React elements
      if (typeof value === 'function' || (value && typeof value === 'object' && value.$$typeof)) {
        continue
      }
      sanitized[key] = sanitizeData(value)
    }
    return sanitized
  }

  const handleSaveType = async (typeData: any) => {
    if (!canMutate) return
    try {
      // Sanitize the data to remove any React internal properties
      const sanitizedData = sanitizeData(typeData)
      
      if (typeFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
        )
        await addBookingType(createPayload)
        setSuccess("Booking type created successfully")
      } else if (typeFormMode === 'edit' && selectedTypeForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...sanitizedData, id: selectedTypeForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBookingType(selectedTypeForForm.id, updatePayload)
        setSuccess("Booking type updated successfully")
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bookingTypesManagementModal1",
        crudMode: typeFormMode,
        id: selectedTypeForForm?.id,
        itemLabel: sanitizedData?.name,
      })
      
      handleCloseTypeForm()
      await fetchBookingTypes()
    } catch (error) {
      debugWarn('Error saving booking type:', error)
      setError("Failed to save booking type")
    }
  }
  
  return (
    <Box >
      <Box sx={{ mb: 2 }}>
        <DataHeader
          showDateControls={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search booking types..."
          filters={[]}
          filtersExpanded={false}
          onFiltersToggle={() => {}}
          sortOptions={sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={(value, direction) => {
            setSortBy(value)
            setSortDirection(direction)
          }}
          onCreateNew={() => handleOpenTypeForm(null, 'create')}
          createButtonLabel="Create Booking Type"
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit booking types."
        />
      </Box>
      
      {/* No loading indicators — UI renders and fills as data arrives (like HR section) */}
      {filteredAndSortedBookingTypes.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={EventIcon}
            title={searchTerm.trim() ? "No booking types match your filters" : "No booking types found"}
            description={
              searchTerm.trim()
                ? "Try adjusting your search query."
                : "Create your first booking type to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedBookingTypes.map((type) => (
            <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={type.id || type.name}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  minHeight: 90,
                  position: 'relative',
                  borderLeft: `4px solid ${type.color || '#4caf50'}`,
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleOpenTypeForm(type, 'view')}
              >
                <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                    <EventIcon color="primary" sx={{ mr: 0.5, fontSize: 14 }} />
                    <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word' }}>
                      {type.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: themeConfig.brandColors.navy, mb: 0.25, display: 'block' }}>
                    {type.defaultDuration || 60} min
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
                  <Tooltip title="Edit Type" placement="left">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTypeForm(type, 'edit')
                      }}
                      disabled={!canMutate}
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
                  <Tooltip title="Delete Type" placement="left">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(type.id || '')
                      }}
                      disabled={!canRemove}
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
      
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Add/Edit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedBookingType ? 'Edit Booking Type' : 'Add Booking Type'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                multiline
                rows={2}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="color-label">Color</InputLabel>
                <Select
                  labelId="color-label"
                  name="color"
                  value={formData.color || '#4caf50'}
                  onChange={handleSelectChange}
                  label="Color"
                  startAdornment={
                    <InputAdornment position="start">
                      <ColorLensIcon sx={{ color: formData.color || '#4caf50' }} />
                    </InputAdornment>
                  }
                >
                  {COLOR_OPTIONS.map(color => (
                    <MenuItem key={color} value={color}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            backgroundColor: color,
                            mr: 1
                          }} 
                        />
                        {color}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Duration (minutes)"
                name="defaultDuration"
                type="number"
                value={formData.defaultDuration || 60}
                onChange={handleInputChange}
                size="small"
                InputProps={{
                  inputProps: { min: 15, step: 15 }
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active !== false}
                    onChange={handleSwitchChange('active')}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={!formData.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this booking type? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Booking Type Form Modal */}
      <CRUDModal
        open={typeFormOpen}
        onClose={(reason) => {
          setTypeFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedTypeForForm(null)
            setTypeFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bookingTypesManagementModal1",
          crudMode: typeFormMode,
          id: selectedTypeForForm?.id,
          itemLabel: selectedTypeForForm?.name,
        }}
        title={
          typeFormMode === "create"
            ? "Add booking type"
            : typeFormMode === "edit"
              ? "Edit booking type"
              : "View booking type"
        }
        icon={<EventIcon />}
        mode={typeFormMode}
        onSave={typeFormMode !== "view" ? () => Promise.resolve() : undefined}
        hideSaveButton={typeFormMode === "view"}
        maxWidth="md"
      >
        <BookingTypeForm
          bookingType={selectedTypeForForm}
          mode={typeFormMode}
          onSave={handleSaveType}
        />
      </CRUDModal>
    </Box>
  )
}

export default BookingTypesManagement
