"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useMemo, useEffect } from "react"
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
  Straighten as MeasureIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import MeasureForm from "./forms/MeasureForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const MeasuresManagement: React.FC = () => {
  const location = useLocation()
  const { state, saveMeasure, updateMeasure, deleteMeasure, refreshMeasures } = useStock()
  const { measures, dataVersion } = state
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "categories")
  const canRemove = canDelete("stock", "categories")

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // Refresh measures on mount
  useEffect(() => {
    if (refreshMeasures) {
      refreshMeasures()
    }
  }, [refreshMeasures])

  // CRUD Modal state
  const [measureFormOpen, setMeasureFormOpen] = useState(false)
  const [selectedMeasureForForm, setSelectedMeasureForForm] = useState<any>(null)
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
    { value: "quantity", label: "Quantity" },
    { value: "baseUnit", label: "Base Unit" },
  ]

  // Filter and sort measures
  const filteredAndSortedMeasures = useMemo(() => {
    if (!measures || !Array.isArray(measures)) {
      return []
    }
    
    let filtered = measures.filter((measure) =>
      measure.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      measure.quantity?.toString().includes(searchTerm.toLowerCase()) ||
      measure.baseUnit?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [measures, searchTerm, sortBy, sortDirection, dataVersion])

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedMeasureForForm(null)
    setCrudMode('create')
    setMeasureFormOpen(true)
  }

  const handleRefresh = async () => {
    if (refreshMeasures) {
      await refreshMeasures()
    }
  }

  // CRUD handlers
  const handleOpenMeasureForm = (measure: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedMeasureForForm(measure)
    setCrudMode(mode)
    setMeasureFormOpen(true)
  }

  const handleCloseMeasureForm = () => {
    setMeasureFormOpen(false)
    setSelectedMeasureForForm(null)
    setCrudMode('create')
    setCurrentFormData(null)
  }

  const handleSaveMeasureForm = async (measureData: any) => {
    try {
      // If called from a button click, use the latest captured form state
      const isEvent = measureData && typeof measureData === "object" && "nativeEvent" in measureData && "target" in measureData
      const payload = isEvent ? currentFormData : measureData
      if (!payload) {
        throw new Error("No measure data to save")
      }

      if (crudMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(payload).filter(([_, value]) => value !== undefined)
        )
        await saveMeasure?.(createPayload)
        setNotification({
          open: true,
          message: "Measure created successfully",
          severity: "success"
        })
      } else if (crudMode === 'edit' && selectedMeasureForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...payload, id: selectedMeasureForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateMeasure?.(selectedMeasureForForm.id, updatePayload)
        setNotification({
          open: true,
          message: "Measure updated successfully",
          severity: "success"
        })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "measuresManagementModal1",
        crudMode,
        id: selectedMeasureForForm?.id ?? payload?.id,
        itemLabel: payload?.name,
      })
      handleCloseMeasureForm()
    } catch (error) {
      debugWarn("Error saving measure:", error)
      setNotification({
        open: true,
        message: "Failed to save measure",
        severity: "error"
      })
    }
  }

  const handleDeleteMeasure = async (measureId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this measure?")) return

    try {
      await deleteMeasure?.(measureId)
      setNotification({
        open: true,
        message: "Measure deleted successfully",
        severity: "success"
      })
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to delete measure",
        severity: "error"
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // Check if there are active filters
  const hasActiveFilters = searchTerm.trim() !== ""

  return (
    <Box sx={{ position: 'relative' }}>
      {/* DataHeader */}
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search measures..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Measure"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit measures."
      />

      {/* Measures Table */}
      {filteredAndSortedMeasures.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={MeasureIcon}
            title={hasActiveFilters ? "No measures match your filters" : "No measures found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first measure to get started."
            }
          />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Quantity</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Base Unit</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedMeasures.map((measure) => (
                <TableRow 
                  key={measure.id} 
                  hover
                  onClick={() => handleOpenMeasureForm(measure, 'view')}
                  sx={{ 
                    cursor: "pointer",
                    '& > td': {
                      paddingTop: 1,
                      paddingBottom: 1,
                    }
                  }}
                >
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{measure.name}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{measure.quantity || measure.baseQuantity || "1"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{measure.baseUnit || measure.unit || "N/A"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Box display="flex" gap={1} justifyContent="center">
                      <IconButton 
                        size="small" 
                        disabled={!canMutate}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenMeasureForm(measure, 'edit')
                        }}
                        title={canMutate ? "Edit Measure" : "No permission to edit"}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        disabled={!canRemove}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canRemove) return
                          handleDeleteMeasure(measure.id)
                        }}
                        title={canRemove ? "Delete Measure" : "No permission to delete"}
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
        open={measureFormOpen}
        onClose={(reason) => {
          setMeasureFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedMeasureForForm(null)
            setCrudMode("create")
            setCurrentFormData(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "measuresManagementModal1",
          crudMode,
          id: selectedMeasureForForm?.id,
          itemLabel: selectedMeasureForForm?.name,
        }}
        title={
          crudMode === "create"
            ? "Create Measure"
            : crudMode === "edit"
              ? "Edit Measure"
              : "View Measure"
        }
        icon={<SaveIcon />}
        mode={crudMode}
        onEdit={() => setCrudMode("edit")}
        onSave={crudMode !== "view" ? async () => {} : undefined}
        hideSaveButton={crudMode === "view"}
      >
        <MeasureForm
          measure={selectedMeasureForForm}
          mode={crudMode}
          onSave={handleSaveMeasureForm}
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

export default MeasuresManagement
