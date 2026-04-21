"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import SaveIcon from "@mui/icons-material/Save"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { LocationFormContent } from "../../components/pos/forms/LocationForm"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import type { Location } from "../../../backend/interfaces/POS"
import DataHeader from "../../components/reusable/DataHeader"

const LocationManagement: React.FC = () => {
  const location = useLocation()
  const { state: companyState } = useCompany()
  const { 
    state: posState, 
    refreshLocations, 
    createLocation, 
    updateLocation, 
    deleteLocation 
  } = usePOS()
  
  const [] = useState<Location | null>(null)
  



  // Add search state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // CRUD form states
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [locationFormMode, setLocationFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedLocationForForm, setSelectedLocationForForm] = useState<Location | null>(null)

  // Get locations from POS context
  const locations = posState.locations || []
  
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
      let aValue: string = ""
      let bValue: string = ""

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "address":
          aValue = a.address || ""
          bValue = b.address || ""
          break
        case "status":
          aValue = a.isActive ? "Active" : "Inactive"
          bValue = b.isActive ? "Active" : "Inactive"
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [locations, searchTerm, sortBy, sortDirection])

  useEffect(() => {
    // Load locations from POS context
    if (companyState.companyID && companyState.selectedSiteID) {
      refreshLocations()
    }
  }, [companyState.companyID, companyState.selectedSiteID, refreshLocations])


  // Update the handleDelete function to delete from database
  const handleDelete = async (id: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    if (window.confirm("Are you sure you want to delete this location?")) {
      try {
        await deleteLocation(id)
      } catch (error: any) {
        console.error("Error deleting location:", error)
        alert(`Error: ${error.message}`)
      }
    }
  }


  // CRUD form handlers
  const handleOpenLocationForm = (location: Location | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedLocationForForm(location)
    setLocationFormMode(mode)
    setLocationFormOpen(true)
  }

  const handleCloseLocationForm = () => {
    setLocationFormOpen(false)
    setSelectedLocationForForm(null)
    setLocationFormMode('create')
  }

  const handleSaveLocation = async () => {
    try {
      // Get form data from the form component
      const locationData = (window as any).currentLocationFormData
      
      if (!locationData || !locationData.name.trim()) {
        alert("Location name is required")
        return
      }

      if (locationFormMode === 'create') {
        await createLocation({ 
          name: locationData.name,
          description: locationData.description,
          capacity: locationData.capacity,
          type: 'other',
          isActive: locationData.active 
        })
      } else if (locationFormMode === 'edit' && selectedLocationForForm?.id) {
        await updateLocation(selectedLocationForForm.id, { 
          name: locationData.name,
          description: locationData.description,
          capacity: locationData.capacity,
          type: 'other',
          isActive: locationData.active 
        })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "locationManagementModal1",
        crudMode: locationFormMode,
        id: selectedLocationForForm?.id,
        itemLabel: (window as any).currentLocationFormData?.name,
      })
      handleCloseLocationForm()
    } catch (error) {
      console.error('Error saving location:', error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }


  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
       
        <DataHeader
          showDateControls={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search locations..."
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
          onCreateNew={() => handleOpenLocationForm(null, 'create')}
          createButtonLabel="Create Location"
        />
      </Box>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="locations table">
            {/* Update the table header to include sort indicators */}
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Capacity</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            {/* Update the table body to use sorted and filtered locations */}
            <TableBody>
              {filteredAndSortedLocations.map((location) => (
                <TableRow 
                  key={location.id}
                  hover
                  onClick={() => handleOpenLocationForm(location, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{location.name}</TableCell>
                  <TableCell align="center">{location.description}</TableCell>
                  <TableCell align="center">{location.capacity}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLocationForm(location, 'edit')
                        }} 
                        title="Edit"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(location.id)
                        }} 
                        title="Delete"
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
      </Paper>

      {/* Old Dialog removed - using CRUDModal instead */}

      {/* Location Form */}
      <CRUDModal
        open={locationFormOpen}
        onClose={(reason) => {
          setLocationFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedLocationForForm(null)
            setLocationFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "locationManagementModal1",
          crudMode: locationFormMode,
          id: selectedLocationForForm?.id,
          itemLabel: selectedLocationForForm?.name,
        }}
        title={
          locationFormMode === "create"
            ? "Add location"
            : locationFormMode === "edit"
              ? "Edit location"
              : "View location"
        }
        icon={<LocationOnIcon />}
        mode={locationFormMode}
        onSave={locationFormMode !== "view" ? handleSaveLocation : undefined}
        hideSaveButton={locationFormMode === "view"}
      >
        <LocationFormContent
          location={selectedLocationForForm}
          mode={locationFormMode}
          onCancel={handleCloseLocationForm}
        />
      </CRUDModal>
    </Box>
  )
}

export default LocationManagement
