"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"

// Add imports for database functions
import DataHeader from "../../components/reusable/DataHeader"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import CorrectionForm from "../../components/pos/forms/CorrectionForm"

interface CorrectionType {
  id: string
  name: string
  description: string
  requiresApproval: boolean
  requiresReason: boolean
  maxAmount: number | null
  applicableFor: string[] // 'item', 'order', 'payment'
}

// Helper function to get description from type
const getDescriptionFromType = (type: string) => {
  switch (type) {
    case "void":
      return "Remove an item from the order"
    case "waste":
      return "Record waste without refunding"
    case "edit":
      return "Modify an existing item"
    default:
      return "Correction type"
  }
}

// Helper function to get applicable for from type
const getApplicableForFromType = (type: string) => {
  switch (type) {
    case "void":
      return ["item"]
    case "waste":
      return ["item"]
    case "edit":
      return ["item", "order"]
    default:
      return ["item"]
  }
}

// Helper function to get type from applicable for
const getTypeFromApplicableFor = (applicableFor: string[], requiresApproval: boolean) => {
  if (requiresApproval) return "void"
  if (applicableFor.includes("order")) return "edit"
  return "waste"
}

const CorrectionManagement: React.FC = () => {
  const location = useLocation()
  const [correctionTypes, setCorrectionTypes] = useState<CorrectionType[]>([])
  const { state: companyState } = useCompany()
  const { state: posState, refreshCorrections, createCorrection, updateCorrection, deleteCorrection } = usePOS()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requiresApproval: false,
    requiresReason: true,
    maxAmount: null as number | null,
    applicableFor: [] as string[],
  })

  // Add sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)

  // Add sorting function
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Add sorted corrections calculation
  const getSortedCorrections = () => {
    const sortableCorrections = [...filteredCorrections]

    if (sortConfig === null || !sortConfig.key) {
      return sortableCorrections
    }

    // Store the key and direction in local variables to avoid null reference issues
    const key = sortConfig.key
    const direction = sortConfig.direction

    return sortableCorrections.sort((a, b) => {
      // Get the values and provide default values for null/undefined
      const aValue = a[key as keyof CorrectionType] ?? ""
      const bValue = b[key as keyof CorrectionType] ?? ""

      // Safe comparison that handles all types
      if (String(aValue) < String(bValue)) {
        return direction === "ascending" ? -1 : 1
      }
      if (String(aValue) > String(bValue)) {
        return direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }

  // Add search state
  const [searchTerm, setSearchTerm] = useState("")
  
  // DataHeader state
  const [dataHeaderSortBy, setDataHeaderSortBy] = useState<string>("name")
  const [dataHeaderSortDirection, setDataHeaderSortDirection] = useState<'asc' | 'desc'>("asc")

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedCorrectionType, setSelectedCorrectionType] = useState<CorrectionType | null>(null)

  // Add filtered corrections calculation
  const filteredCorrections = correctionTypes.filter(
    (correction) =>
      correction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correction.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  useEffect(() => {
    const fetchCorrectionTypesData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
        // Fetch corrections from POS context
        await refreshCorrections()
        const correctionsData: any[] = []

        // Transform corrections to correction types
        const correctionTypesData = correctionsData.map((correction: any) => ({
          id: correction.id,
          name: correction.name,
          description: getDescriptionFromType(correction.type),
          requiresApproval: correction.type === "void",
          requiresReason: true,
          maxAmount: null,
          applicableFor: getApplicableForFromType(correction.type),
        }))

        setCorrectionTypes(correctionTypesData)
      } catch (error) {
        console.error("Error fetching correction types:", error)
      }
    }

    if (companyState.companyID && companyState.selectedSiteID) {
      fetchCorrectionTypesData()
    }
  }, [companyState.companyID, companyState.selectedSiteID])


  const handleClose = () => {
    setOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? checked : name === "maxAmount" ? (value === "" ? null : Number.parseFloat(value)) : value,
    })
  }

  const handleSelectChange = (e: SelectChangeEvent<string[]>) => {
    setFormData({
      ...formData,
      applicableFor: e.target.value as string[],
    })
  }

  const handleSubmit = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      // Convert form data to correction data
      const correctionData = {
        name: formData.name,
        type: getTypeFromApplicableFor(formData.applicableFor, formData.requiresApproval) as "edit" | "void" | "waste" | "refund" | "comp",
        isActive: true,
        requiresAuth: formData.requiresApproval,
        description: formData.description,
        maxAmount: formData.maxAmount,
        applicableFor: formData.applicableFor,
      }

      // const basePath = getBasePath('pos') // Would use when implementing functions
      if (selectedCorrectionType !== null) {
        // Update correction using POS context
        await updateCorrection(selectedCorrectionType.id, correctionData)
      } else {
        // Add correction using POS context
        await createCorrection(correctionData)
      }

      // Refresh corrections from POS context
      await refreshCorrections()
      const correctionsData: any[] = posState.corrections || []

      // Transform corrections to correction types
      const correctionTypesData = correctionsData.map((correction: any) => ({
        id: correction.id,
        name: correction.name,
        description: getDescriptionFromType(correction.type),
        requiresApproval: correction.type === "void",
        requiresReason: true,
        maxAmount: null,
        applicableFor: getApplicableForFromType(correction.type),
      }))

      setCorrectionTypes(correctionTypesData)
      handleClose()
    } catch (error) {
      console.error("Error saving correction:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    if (window.confirm("Are you sure you want to delete this correction type?")) {
      try {
        // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
        // Delete correction using POS context
        await deleteCorrection(id)

        // Refresh corrections from POS context
        await refreshCorrections()
        const correctionsData: any[] = posState.corrections || []

        // Transform corrections to correction types
        const correctionTypesData = correctionsData.map((correction: any) => ({
          id: correction.id,
          name: correction.name,
          description: getDescriptionFromType(correction.type),
          requiresApproval: correction.type === "void",
          requiresReason: true,
          maxAmount: null,
          applicableFor: getApplicableForFromType(correction.type),
        }))

        setCorrectionTypes(correctionTypesData)
      } catch (error) {
        console.error("Error deleting correction:", error)
        alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // DataHeader handlers
  const handleDataHeaderSortChange = (field: string, direction: 'asc' | 'desc') => {
    setDataHeaderSortBy(field)
    setDataHeaderSortDirection(direction)
    // Also update legacy sorting
    requestSort(field as any)
  }

  const handleDataHeaderExport = (format: 'csv' | 'pdf') => {
    console.log(`Export corrections as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'description', label: 'Description' },
    { value: 'requiresApproval', label: 'Requires Approval' },
    { value: 'requiresReason', label: 'Requires Reason' },
    { value: 'maxAmount', label: 'Max Amount' }
  ]

  // CRUD Modal handlers
  const handleOpenCrudModal = (correctionType: CorrectionType | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedCorrectionType(correctionType)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedCorrectionType(null)
    setCrudMode('create')
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        // Create new correction type
        console.log('Creating correction type:', formData)
      } else if (crudMode === 'edit' && selectedCorrectionType) {
        // Update existing correction type
        console.log('Updating correction type:', formData)
      }
      handleCloseCrudModal()
      // Refresh correction types
      // await refreshCorrectionTypes()
    } catch (error) {
      console.error('Failed to save correction type:', error)
    }
  }

  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search correction types..."
        sortOptions={sortOptions}
        sortValue={dataHeaderSortBy}
        sortDirection={dataHeaderSortDirection}
        onSortChange={handleDataHeaderSortChange}
        onExportCSV={() => handleDataHeaderExport('csv')}
        onExportPDF={() => handleDataHeaderExport('pdf')}
        onCreateNew={() => handleOpenCrudModal(null, 'create')}
        createButtonLabel="Create Correction Type"
      />

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="correction types table">
            {/* Update the table header to include sort indicators */}
            <TableHead>
              <TableRow>
                <TableCell onClick={() => requestSort("name")} style={{ cursor: "pointer" }}>
                  Name {sortConfig?.key === "name" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => requestSort("description")} style={{ cursor: "pointer" }}>
                  Description {sortConfig?.key === "description" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => requestSort("requiresApproval")} style={{ cursor: "pointer" }}>
                  Requires Approval{" "}
                  {sortConfig?.key === "requiresApproval" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => requestSort("requiresReason")} style={{ cursor: "pointer" }}>
                  Requires Reason{" "}
                  {sortConfig?.key === "requiresReason" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => requestSort("maxAmount")} style={{ cursor: "pointer" }}>
                  Max Amount {sortConfig?.key === "maxAmount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </TableCell>
                <TableCell>Applicable For</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            {/* Update the table body to use sorted and filtered corrections */}
            <TableBody>
              {getSortedCorrections().map((correction) => (
                <TableRow key={correction.id}>
                  <TableCell>{correction.name}</TableCell>
                  <TableCell>{correction.description}</TableCell>
                  <TableCell>{correction.requiresApproval ? "Yes" : "No"}</TableCell>
                  <TableCell>{correction.requiresReason ? "Yes" : "No"}</TableCell>
                  <TableCell>{correction.maxAmount !== null ? `${correction.maxAmount}%` : "No limit"}</TableCell>
                  <TableCell>{correction.applicableFor.join(", ")}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenCrudModal(correction, 'edit')}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(correction.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedCorrectionType ? "Edit Correction Type" : "Add New Correction Type"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedCorrectionType
              ? "Update the details for this correction type."
              : "Enter the details for the new correction type."}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Correction Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="applicable-for-label">Applicable For</InputLabel>
            <Select
              labelId="applicable-for-label"
              multiple
              value={formData.applicableFor}
              onChange={handleSelectChange}
              label="Applicable For"
            >
              <MenuItem value="item">Item</MenuItem>
              <MenuItem value="order">Order</MenuItem>
              <MenuItem value="payment">Payment</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="maxAmount"
            label="Max Amount (%)"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.maxAmount === null ? "" : formData.maxAmount}
            onChange={handleChange}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText="Leave empty for no limit"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Requires Approval</InputLabel>
            <Select
              value={formData.requiresApproval ? "yes" : "no"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiresApproval: e.target.value === "yes",
                })
              }
              label="Requires Approval"
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Requires Reason</InputLabel>
            <Select
              value={formData.requiresReason ? "yes" : "no"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiresReason: e.target.value === "yes",
                })
              }
              label="Requires Reason"
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{selectedCorrectionType ? "Update" : "Add"}</Button>
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
                crudEntity: "correctionManagementModal1",
                crudMode: crudMode,
              }}
              title={crudMode === 'create' ? 'Add Correction Type' : crudMode === 'edit' ? 'Edit Correction Type' : 'View Correction Type'}
              mode={crudMode}
            >
        <CorrectionForm
          open={crudModalOpen}
          onClose={handleCloseCrudModal}
          correction={selectedCorrectionType}
          mode={crudMode}
          onSave={handleSaveCrudModal}
        />
      </CRUDModal>
    </Box>
  )
}

export default CorrectionManagement
