"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Typography,
  Alert,
  Snackbar,
  Chip,
  Tooltip,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { LocationFormContent } from "../pos/forms/LocationForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import type { Location } from "../../../backend/interfaces/POS"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const LocationManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "locations")
  const canRemove = canDelete("bookings", "locations")
  const { state: companyState } = useCompany()
  const { locations: posLocations, createLocation, updateLocation, deleteLocation, fetchLocations } = usePOS()
  
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // CRUD form states
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [locationFormMode, setLocationFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedLocationForForm, setSelectedLocationForForm] = useState<Location | null>(null)

  // Sort options for locations
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "address", label: "Address" },
    { value: "status", label: "Status" },
  ]

  // Filter and sort locations
  const filteredAndSortedLocations = useMemo(() => {
    const filtered = locations.filter(
      (location) =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "address":
          aValue = (a.address || '').toLowerCase()
          bValue = (b.address || '').toLowerCase()
          break
        case "status":
          aValue = a.isActive ? "isActive" : "inisActive"
          bValue = b.isActive ? "isActive" : "inisActive"
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [locations, searchTerm, sortBy, sortDirection])

  // Load locations from POS context - use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    const loadLocations = async () => {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true
      try {
        if (fetchLocations) {
          await fetchLocations()
        }
        // Update local state from POS context
        if (posLocations && Array.isArray(posLocations)) {
          setLocations(posLocations)
        }
      } catch (err) {
        debugWarn("Error loading locations:", err)
        setError("Failed to load locations")
        hasLoadedRef.current = false // Allow retry on error
      }
    }

    if (companyState.companyID && companyState.selectedSiteID) {
      loadLocations()
    }
    // Reset hasLoadedRef when key dependencies change
    hasLoadedRef.current = false
  }, [companyState.companyID, companyState.selectedSiteID, posLocations, fetchLocations])

  // CRUD handlers


  const handleDeleteLocation = async (locationId: string) => {
    if (!canRemove) return
    try {
      if (deleteLocation) {
        await deleteLocation(locationId)
        setNotification({ message: "Location deleted successfully", type: "success" })
        // Refresh locations
        if (fetchLocations) {
          await fetchLocations()
        }
      }
    } catch (err) {
      debugWarn("Error deleting location:", err)
      setNotification({ message: "Failed to delete location", type: "error" })
    }
  }

  const handleOpenLocationForm = (location: Location | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedLocationForForm(location)
    setLocationFormMode(mode)
    setLocationFormOpen(true)
  }

  const handleCloseLocationForm = () => {
    setLocationFormOpen(false)
    setSelectedLocationForForm(null)
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleRefresh = async () => {
    try {
      if (fetchLocations) {
        await fetchLocations()
      }
      if (posLocations && Array.isArray(posLocations)) {
        setLocations(posLocations)
      }
    } catch (err) {
      debugWarn("Error refreshing locations:", err)
      setError("Failed to refresh locations")
    }
  }

  const handleSaveLocation = async () => {
    if (!canMutate) return

    const locationData = (window as any).currentLocationFormData
    const modeSnapshot = locationFormMode
    const selectedSnapshot = selectedLocationForForm

    if (locationFormMode === "edit") {
      if (locationData && selectedLocationForForm?.id && updateLocation) {
        try {
          const updatePayload: any = {
            id: selectedLocationForForm.id,
            name: locationData.name,
            description: locationData.description,
            capacity: locationData.capacity,
            type: "other",
            isActive: locationData.active !== false,
          }
          Object.keys(updatePayload).forEach((key) => {
            if (updatePayload[key] === undefined) delete updatePayload[key]
          })

          await updateLocation(selectedLocationForForm.id, updatePayload)
          setNotification({ message: "Location updated successfully", type: "success" })
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "locationManagementModal1",
            crudMode: modeSnapshot,
            id: selectedSnapshot?.id,
            itemLabel: selectedSnapshot?.name || locationData?.name,
          })
          handleCloseLocationForm()
          await handleRefresh()
        } catch (err) {
          debugWarn("Error updating location:", err)
          setNotification({ message: "Failed to update location", type: "error" })
        }
      }
      return
    }

    if (locationFormMode === "create") {
      if (locationData && createLocation) {
        try {
          if (!locationData.name?.trim()) {
            setNotification({ message: "Location name is required", type: "error" })
            return
          }
          const createPayload: any = {
            name: locationData.name,
            description: locationData.description || "",
            capacity: locationData.capacity,
            type: "other",
            isActive: locationData.active !== false,
          }
          Object.keys(createPayload).forEach((key) => {
            if (createPayload[key] === undefined) delete createPayload[key]
          })
          await createLocation(createPayload)
          setNotification({ message: "Location created successfully", type: "success" })
          removeWorkspaceFormDraft(location.pathname, {
            crudEntity: "locationManagementModal1",
            crudMode: modeSnapshot,
            id: undefined,
            itemLabel: locationData.name?.trim(),
          })
          handleCloseLocationForm()
          await handleRefresh()
        } catch (err) {
          debugWarn("Error creating location:", err)
          setNotification({ message: "Failed to create location", type: "error" })
        }
      }
    }
  }

  return (
    <Box sx={{ p: 0 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataHeader
        onCreateNew={() => handleOpenLocationForm(null, 'create')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search locations..."
        showDateControls={false}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit locations."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      {filteredAndSortedLocations.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={LocationOnIcon}
            title={searchTerm.length > 0 ? "No locations match your filters" : "No locations found"}
            description={
              searchTerm.length > 0 ? "Try adjusting your filters or search query" : "Create your first location to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedLocations.map((location) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={location.id}>
              <Card 
                sx={{ 
                  minHeight: 90,
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleOpenLocationForm(location, 'view')}
              >
                <CardContent sx={{ p: 0.75, pr: 4.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontSize: '0.75rem',
                        lineHeight: 1.1,
                        wordBreak: 'break-word'
                      }}
                    >
                      {location.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`${location.capacity} people`}
                      size="small"
                      sx={{ 
                        fontSize: '0.6rem',
                        height: 16,
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  </Box>
                </CardContent>
                
                {/* Action Icons */}
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.02
                  }}
                >
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenLocationForm(location, 'edit')
                      }}
                      disabled={!canMutate}
                      sx={{ 
                        width: 28, 
                        height: 28,
                        fontSize: '0.8rem',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteLocation(location.id)
                      }}
                      disabled={!canRemove}
                      sx={{ 
                        width: 28, 
                        height: 28,
                        fontSize: '0.8rem',
                        color: 'error.main',
                        '&:hover': { backgroundColor: 'error.light', color: 'error.contrastText' }
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
        open={locationFormOpen}
        onClose={(reason) => {
          setLocationFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedLocationForForm(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "locationManagementModal1",
          crudMode: locationFormMode,
          id: selectedLocationForForm?.id,
          itemLabel: selectedLocationForForm?.name || undefined,
        }}
        title={
          locationFormMode === "create"
            ? "Create Location"
            : locationFormMode === "edit"
              ? "Edit Location"
              : "View Location"
        }
        mode={locationFormMode}
        onSave={locationFormMode === "view" ? undefined : handleSaveLocation}
        disabled={(locationFormMode === "create" || locationFormMode === "edit") && !canMutate}
        saveButtonText="Save"
      >
        <LocationFormContent
          location={selectedLocationForForm}
          mode={locationFormMode}
        />
      </CRUDModal>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.type} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default LocationManagement
