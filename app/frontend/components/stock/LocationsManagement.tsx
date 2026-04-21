"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Alert,
  Button,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import LocationForm from "./forms/LocationForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const LocationsManagement: React.FC = () => {
  const location = useLocation()
  const { state, createStockLocation, updateStockLocation, deleteStockLocation, fetchLocations } = useStock()
  const { dataVersion, loading } = state
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "categories")
  const canRemove = canDelete("stock", "categories")
  
  // Local state for locations since they're not stored in context state
  const [locations, setLocations] = useState<any[]>([])

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // CRUD Modal state
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [selectedLocationForForm, setSelectedLocationForForm] = useState<any>(null)
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
  ]

  // Filter and sort locations
  const filteredAndSortedLocations = useMemo(() => {
    if (!locations || !Array.isArray(locations)) {
      return []
    }
    
    let filtered = locations.filter((location) =>
      location.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [locations, searchTerm, sortBy, sortDirection, dataVersion])

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedLocationForForm(null)
    setCrudMode('create')
    setLocationFormOpen(true)
  }

  const handleRefresh = async () => {
    try {
      const fetchedLocations = await fetchLocations()
      setLocations(fetchedLocations || [])
    } catch (error) {
      debugWarn("Error refreshing locations:", error)
      setNotification({
        open: true,
        message: "Failed to refresh locations",
        severity: "error"
      })
    }
  }

  // CRUD handlers
  const handleOpenLocationForm = (location: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedLocationForForm(location)
    setCrudMode(mode)
    setLocationFormOpen(true)
  }

  const handleCloseLocationForm = () => {
    setLocationFormOpen(false)
    setSelectedLocationForForm(null)
    setCrudMode('create')
    setCurrentFormData(null)
  }

  const handleSaveLocationForm = async (locationData: any) => {
    try {
      const isEvent = locationData && typeof locationData === "object" && "nativeEvent" in locationData && "target" in locationData
      const payload = isEvent ? currentFormData : locationData
      if (!payload) {
        throw new Error("No location data to save")
      }

      if (crudMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(payload).filter(([_, value]) => value !== undefined)
        )
        await createStockLocation?.(createPayload)
        setNotification({
          open: true,
          message: "Location created successfully",
          severity: "success"
        })
      } else if (crudMode === 'edit' && selectedLocationForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...payload, id: selectedLocationForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateStockLocation?.(selectedLocationForForm.id, updatePayload)
        setNotification({
          open: true,
          message: "Location updated successfully",
          severity: "success"
        })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "locationsManagementModal1",
        crudMode,
        id: selectedLocationForForm?.id ?? payload?.id,
        itemLabel: payload?.name,
      })
      handleCloseLocationForm()
      // Refresh the local locations list
      await handleRefresh()
    } catch (error) {
      debugWarn("Error saving location:", error)
      setNotification({
        open: true,
        message: "Failed to save location",
        severity: "error"
      })
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this location?")) return

    try {
      await deleteStockLocation?.(locationId)
      setNotification({
        open: true,
        message: "Location deleted successfully",
        severity: "success"
      })
      // Refresh the local locations list
      await handleRefresh()
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to delete location",
        severity: "error"
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // Load locations on component mount and when data changes
  // Use ref to prevent duplicate calls on dataVersion changes
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      handleRefresh()
    }
    // Reset hasLoadedRef when dataVersion changes (data was refreshed externally)
    if (dataVersion) {
      hasLoadedRef.current = false
    }
  }, [dataVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchTerm.length > 0

  return (
    <Box>
      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search locations..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Location"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit locations."
      />

      {/* Locations Table */}
      {filteredAndSortedLocations.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={LocationIcon}
            title={hasActiveFilters ? "No locations match your filters" : "No locations found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first location to get started."
            }
          />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Description</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedLocations.map((location) => (
                <TableRow 
                  key={location.id} 
                  hover
                  onClick={() => handleOpenLocationForm(location, 'view')}
                  sx={{ 
                    cursor: "pointer",
                    '& > td': {
                      paddingTop: 1,
                      paddingBottom: 1,
                    }
                  }}
                >
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{location.name}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{location.description || "No description"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Box display="flex" gap={1} justifyContent="center">
                      <IconButton 
                        size="small" 
                        disabled={!canMutate}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLocationForm(location, 'edit')
                        }}
                        title={canMutate ? "Edit Location" : "No permission to edit"}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        disabled={!canRemove}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canRemove) return
                          handleDeleteLocation(location.id)
                        }}
                        title={canRemove ? "Delete Location" : "No permission to delete"}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CRUD Modal */}
      <CRUDModal
        open={locationFormOpen}
        onClose={(reason) => {
          setLocationFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedLocationForForm(null)
            setCrudMode("create")
            setCurrentFormData(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "locationsManagementModal1",
          crudMode,
          id: selectedLocationForForm?.id,
          itemLabel: selectedLocationForForm?.name,
        }}
        title={
          crudMode === "create"
            ? "Create Location"
            : crudMode === "edit"
              ? "Edit Location"
              : "View Location"
        }
        icon={<SaveIcon />}
        mode={crudMode}
        onEdit={() => setCrudMode("edit")}
        onSave={crudMode !== "view" ? async () => {} : undefined}
        hideSaveButton={crudMode === "view"}
      >
        <LocationForm
          location={selectedLocationForForm}
          mode={crudMode}
          onSave={handleSaveLocationForm}
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

export default LocationsManagement
