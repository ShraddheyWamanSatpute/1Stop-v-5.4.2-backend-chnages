"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useEffect, useState, useMemo, useRef } from "react"
import {
  Box,
  Paper,
  Grid,
  Chip,
  Alert,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  Label as LabelIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, BookingTag } from "../../../backend/context/BookingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TagForm from "./forms/TagForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const TagsManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "tags")
  const canRemove = canDelete("bookings", "tags")
  const { 
    bookingTags, 
    fetchBookingTags, 
    addBookingTag, 
    updateBookingTag,
    deleteBookingTag 
  } = useBookingsContext()

  const [error, setError] = useState<string | null>(null)

  // CRUD form states
  const [tagFormOpen, setTagFormOpen] = useState(false)
  const [tagFormMode, setTagFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTagForForm, setSelectedTagForForm] = useState<BookingTag | null>(null)
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  // New UI states
  const [searchTerm, setSearchTerm] = useState("")
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedTagForMenu, setSelectedTagForMenu] = useState<BookingTag | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<BookingTag | null>(null)

  const loadTags = async () => {
    try {
      await fetchBookingTags()
      setError(null)
    } catch (e) {
      debugWarn("Error loading tags:", e)
      setError("Failed to load tags")
    }
  }

  // Use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadTags()
    }
  }, [])

  // Sort options for tags
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Created Date" },
  ]


  // Filter and sort tags
  const filteredAndSortedTags = useMemo(() => {
    let filtered = bookingTags.filter(tag => {
      // Search filter
      const searchMatch = !searchTerm || 
        tag.name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return searchMatch
    })

    // Sort
    return filtered.sort((a, b) => {
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
  }, [bookingTags, searchTerm, sortBy, sortDirection])



  const handleDeleteTag = async (tag: BookingTag) => {
    if (!canRemove) return
    if (!tag.id || tag.isDefault) return
    try {
      await deleteBookingTag(tag.id)
      setError(null)
      await loadTags()
    } catch (e) {
      debugWarn("Error deleting tag:", e)
      setError("Failed to delete tag")
    }
  }

  // CRUD form handlers
  const handleOpenTagForm = (tag: BookingTag | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTagForForm(tag)
    setTagFormMode(mode)
    setTagFormOpen(true)
  }

  const handleCloseTagForm = () => {
    setTagFormOpen(false)
    setSelectedTagForForm(null)
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

  const handleSaveTag = async (tagData: any) => {
    if (!canMutate) return
    try {
      // Sanitize the data to remove any React internal properties
      const sanitizedData = sanitizeData(tagData)
      
      if (tagFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
        )
        await addBookingTag(createPayload)
      } else if (tagFormMode === 'edit' && selectedTagForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...sanitizedData, id: selectedTagForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBookingTag(selectedTagForForm.id, updatePayload)
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "tagsManagementModal1",
        crudMode: tagFormMode,
        id: selectedTagForForm?.id ?? sanitizedData?.id,
        itemLabel: sanitizedData?.name ?? selectedTagForForm?.name,
      })
      handleCloseTagForm()
      await loadTags()
    } catch (error) {
      debugWarn('Error saving tag:', error)
      setError('Failed to save tag')
    }
  }


  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setSelectedTagForMenu(null)
  }

  const handleMenuAction = (action: 'view' | 'edit' | 'delete') => {
    if (!selectedTagForMenu) return
    
    switch (action) {
      case 'view':
        handleOpenTagForm(selectedTagForMenu, 'view')
        break
      case 'edit':
        handleOpenTagForm(selectedTagForMenu, 'edit')
        break
      case 'delete':
        setTagToDelete(selectedTagForMenu)
        setDeleteDialogOpen(true)
        break
    }
    
    handleMenuClose()
  }

  const handleConfirmDelete = async () => {
    if (tagToDelete) {
      await handleDeleteTag(tagToDelete)
      setDeleteDialogOpen(false)
      setTagToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setTagToDelete(null)
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
      {/* Header */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tags by name..."
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
        onCreateNew={() => handleOpenTagForm(null, 'create')}
        createButtonLabel="Create Tag"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit booking tags."
        additionalButtons={[]}
      />


      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* No loading indicators — UI renders and fills as data arrives (like HR section) */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        {filteredAndSortedTags.length === 0 ? (
          <Box sx={{ py: 4 }}>
            <EmptyStateCard
              icon={LabelIcon}
              title={searchTerm.length > 0 ? "No tags match your filters" : "No tags found"}
              description={
                searchTerm.length > 0 ? "Try adjusting your filters or search query" : "Create your first tag to get started."
              }
            />
          </Box>
        ) : (
          <Grid container spacing={1}>
            {filteredAndSortedTags.map((tag: BookingTag) => (
                <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={tag.id || tag.name}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      minHeight: 90,
                      position: 'relative',
                      borderLeft: `4px solid ${tag.color || '#4caf50'}`,
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 2,
                      },
                    }}
                    onClick={() => handleOpenTagForm(tag, 'view')}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                        <LabelIcon color="primary" sx={{ mr: 0.5, fontSize: 14 }} />
                        <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word' }}>
                          {tag.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mb: 0.25 }}>
                        {tag.isDefault && (
                          <Chip
                            label="Priority"
                            size="small"
                            color="primary"
                            variant="filled"
                            sx={{ fontSize: '0.6rem', height: 16 }}
                          />
                        )}
                      </Box>
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
                      <Tooltip title="Edit Tag" placement="left">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenTagForm(tag, 'edit')
                            }}
                            disabled={tag.isDefault}
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              fontSize: '0.8rem',
                              '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete Tag" placement="left">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation()
                              setTagToDelete(tag)
                              setDeleteDialogOpen(true)
                            }}
                            disabled={tag.isDefault}
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              fontSize: '0.8rem',
                              '&:hover': { backgroundColor: 'error.light', color: 'white' }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Card>
                </Grid>
              ))}
          </Grid>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')} disabled={selectedTagForMenu?.isDefault || !canMutate}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Tag</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => handleMenuAction('delete')} 
          disabled={selectedTagForMenu?.isDefault || !canRemove}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Tag</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Tag</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the tag "{tagToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* CRUD Modal */}
      <CRUDModal
        open={tagFormOpen}
        onClose={(reason) => {
          setTagFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedTagForForm(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "tagsManagementModal1",
          crudMode: tagFormMode,
          id: selectedTagForForm?.id,
          itemLabel: selectedTagForForm?.name,
        }}
        title={tagFormMode === "create" ? "Create Tag" : tagFormMode === "edit" ? "Edit Tag" : "View Tag"}
        icon={<SaveIcon />}
        mode={tagFormMode}
        onEdit={() => setTagFormMode("edit")}
        onSave={tagFormMode !== "view" ? async () => {} : undefined}
        hideSaveButton={tagFormMode === "view"}
      >
        <TagForm tag={selectedTagForForm} mode={tagFormMode} onSave={handleSaveTag} />
      </CRUDModal>
    </Box>
  )
}

export default TagsManagement


