"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Box,
  Alert,
  Snackbar,
  Typography,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
} from "@mui/material"
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Label as LabelIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, BookingStatus } from "../../../backend/context/BookingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import BookingStatusForm from "./forms/BookingStatusForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const StatusManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "status")
  const canRemove = canDelete("bookings", "status")
  const { 
    bookingStatuses,
    fetchBookingStatuses,
    addBookingStatus,
    updateBookingStatus,
    deleteBookingStatus
  } = useBookingsContext()

  const [open, setOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState<Omit<BookingStatus, "id" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    color: "#4CAF50",
    isDefault: false,
    allowsEditing: true,
    allowsSeating: true,
    countsAsAttended: false,
    active: true,
    order: 0,
  })
  const [editingStatus, setEditingStatus] = useState<BookingStatus | null>(null)

  // New CRUD form states
  const [statusFormOpen, setStatusFormOpen] = useState(false)
  const [statusFormMode, setStatusFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedStatusForForm, setSelectedStatusForForm] = useState<BookingStatus | null>(null)
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadStatuses()
    }
  }, [])

  // Sort options for statuses
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Created Date" },
  ]

  // Filter and sort statuses
  const sortedStatuses = useMemo(() => {
    return [...bookingStatuses].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "createdAt":
          aValue = new Date(a.createdAt || 0)
          bValue = new Date(b.createdAt || 0)
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      if (sortBy === "createdAt") {
        const comparison = aValue.getTime() - bValue.getTime()
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        const comparison = aValue.toString().localeCompare(bValue.toString())
        return sortDirection === "asc" ? comparison : -comparison
      }
    })
  }, [bookingStatuses, sortBy, sortDirection])

  const loadStatuses = async () => {
    try {
      await fetchBookingStatuses()
      setNotification(null)
      } catch (error) {
        debugWarn("Error fetching statuses:", error)
        setNotification({ message: "Failed to fetch booking statuses", type: "error" })
      }
  }


  const handleClose = () => {
    setOpen(false)
    setFormData({
      name: "",
      description: "",
      color: "#4CAF50",
      isDefault: false,
      allowsEditing: true,
      allowsSeating: true,
      countsAsAttended: false,
      active: true,
      order: 0,
    })
    setEditingStatus(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSave = async () => {
    if (!canMutate) return
    if (!formData.name) {
      setNotification({ message: "Status name is required", type: "error" })
      return
    }

    try {
      if (editingStatus && editingStatus.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...formData, id: editingStatus.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBookingStatus(editingStatus.id, updatePayload)
        setNotification({ message: "Booking status updated successfully!", type: "success" })
      } else {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(formData).filter(([_, value]) => value !== undefined)
        )
        await addBookingStatus(createPayload)
        setNotification({ message: "Booking status created successfully!", type: "success" })
      }
      
      handleClose()
    } catch (error) {
      debugWarn("Error saving status:", error)
      setNotification({ message: "Failed to save booking status", type: "error" })
    }
  }


  const handleDeleteConfirm = (id: string) => {
    if (!canRemove) return
    setStatusToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async (statusId: string) => {
    if (!canRemove) return
    try {
      await deleteBookingStatus(statusId)
      setNotification({ message: "Booking status deleted successfully!", type: "success" })
    } catch (error) {
      debugWarn("Error deleting status:", error)
      setNotification({ message: "Failed to delete booking status", type: "error" })
    } finally {
      setDeleteConfirmOpen(false)
      setStatusToDelete(null)
    }
  }

  // New CRUD form handlers
  const handleOpenStatusForm = (status: BookingStatus | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedStatusForForm(status)
    setStatusFormMode(mode)
    setStatusFormOpen(true)
  }

  const handleCloseStatusForm = () => {
    setStatusFormOpen(false)
    setSelectedStatusForForm(null)
    setStatusFormMode('create')
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

  const handleSaveStatus = async (statusData: any) => {
    if (!canMutate) return
    try {
      // Sanitize the data to remove any React internal properties
      const sanitizedData = sanitizeData(statusData)
      
      if (statusFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
        )
        await addBookingStatus(createPayload)
        setNotification({ message: "Status created successfully!", type: "success" })
      } else if (statusFormMode === 'edit' && selectedStatusForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...sanitizedData, id: selectedStatusForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBookingStatus(selectedStatusForForm.id, updatePayload)
        setNotification({ message: "Status updated successfully!", type: "success" })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "statusManagementModal1",
        crudMode: statusFormMode,
        id: selectedStatusForForm?.id ?? sanitizedData?.id,
        itemLabel: sanitizedData?.name ?? selectedStatusForForm?.name,
      })
      handleCloseStatusForm()
      await fetchBookingStatuses()
    } catch (error) {
      debugWarn('Error saving status:', error)
      setNotification({ message: "Failed to save status", type: "error" })
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <DataHeader
          showDateControls={false}
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search statuses..."
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
          onCreateNew={() => handleOpenStatusForm(null, 'create')}
          createButtonLabel="Add Status"
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit booking statuses."
          additionalButtons={[]}
        />
      </Box>

      {/* No loading indicators — UI renders and fills as data arrives (like HR section) */}
      {sortedStatuses
        .filter(
          (status) =>
            status.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            status.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={LabelIcon}
            title={searchQuery.length > 0 ? "No statuses match your filters" : "No statuses found"}
            description={
              searchQuery.length > 0 ? "Try adjusting your filters or search query" : "Create your first status to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {sortedStatuses
            .filter(
              (status) =>
                status.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                status.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((status) => (
              <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={status.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.2s ease",
                    minHeight: 90,
                    position: 'relative',
                    borderLeft: `4px solid ${status.color}`,
                    cursor: 'pointer',
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleOpenStatusForm(status, 'view')}
                >
                  <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: status.color,
                          borderRadius: "50%",
                          border: "1px solid rgba(0,0,0,0.1)",
                          mr: 0.5,
                        }}
                      />
                      <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word' }}>
                        {status.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25, mb: 0.25 }}>
                      {status.isDefault && (
                        <Chip
                          label="Default"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      )}
                      {status.allowsEditing && (
                        <Chip
                          label="Editable"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      )}
                    </Box>
                  </CardContent>

                  {/* Action Icons positioned on the right */}
                  {(
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 6, 
                      right: 6, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.02 
                    }}>
                      <Tooltip title="Edit Status" placement="left">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenStatusForm(status, 'edit')
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
                      <Tooltip title="Delete Status" placement="left">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteConfirm(status.id!)
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
                  )}
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Status Form Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 5,
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{editingStatus ? "Edit Status" : "Add New Status"}</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleChange}
              required
              error={!formData.name}
              helperText={!formData.name ? "Name is required" : ""}
            />

            <TextField
              margin="dense"
              id="description"
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
              id="color"
              name="color"
              label="Color"
              type="color"
              sx={{ width: "100px" }}
              variant="outlined"
              value={formData.color}
              onChange={handleChange}
            />

            {/* Remove display order from form as per request; handled via drag-drop */}

            <Divider sx={{ my: 1 }} />

            <FormControlLabel
              control={<Checkbox checked={formData.isDefault} onChange={handleChange} name="isDefault" />}
              label="Is Default Status"
            />

            <FormControlLabel
              control={<Checkbox checked={formData.allowsEditing} onChange={handleChange} name="allowsEditing" />}
              label="Allows Editing Booking"
            />

            <FormControlLabel
              control={<Checkbox checked={formData.allowsSeating} onChange={handleChange} name="allowsSeating" />}
              label="Allows Seating Guests"
            />

            <FormControlLabel
              control={<Checkbox checked={formData.countsAsAttended} onChange={handleChange} name="countsAsAttended" />}
              label="Counts As Attended"
            />

            {/* Remove active toggle from form as per request */}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!canMutate}>
            {editingStatus ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this status? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => statusToDelete && handleDelete(statusToDelete)}
            color="error"
            variant="contained"
            disabled={!canRemove}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification ? (
          <Alert onClose={() => setNotification(null)} severity={notification.type} sx={{ width: "100%" }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      {/* Status Form Modal */}
      <CRUDModal
        open={statusFormOpen}
        onClose={(reason) => {
          setStatusFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedStatusForForm(null)
            setStatusFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "statusManagementModal1",
          crudMode: statusFormMode,
          id: selectedStatusForForm?.id,
          itemLabel: selectedStatusForForm?.name,
        }}
        title={
          statusFormMode === "create"
            ? "Create Status"
            : statusFormMode === "edit"
              ? "Edit Status"
              : "View Status"
        }
        icon={<SaveIcon />}
        mode={statusFormMode}
        onEdit={() => setStatusFormMode("edit")}
        onSave={statusFormMode !== "view" ? async () => {} : undefined}
        hideSaveButton={statusFormMode === "view"}
      >
        <BookingStatusForm
          status={selectedStatusForForm}
          mode={statusFormMode}
          onSave={handleSaveStatus}
        />
      </CRUDModal>
    </Box>
  )
}

export default StatusManagement
