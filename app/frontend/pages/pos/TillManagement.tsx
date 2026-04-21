"use client"
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material"
import { usePOS } from "../../../backend/context/POSContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import DataHeader from "../../../frontend/components/reusable/DataHeader"
import TillScreenForm from "../../../frontend/components/pos/forms/TillScreenForm"

interface TillScreen {
  id: string
  name: string
  description?: string
}

const TillManagement = () => {
  const navigate = useNavigate()
  const { state: posState, refreshTillScreens, createTillScreen, updateTillScreen } = usePOS()
  const { state: companyState } = useCompany()

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // CRUD Modal states
  const [crudModalOpen, setCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTillScreen, setSelectedTillScreen] = useState<TillScreen | null>(null)

  // Define sort options for DataHeader
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "description", label: "Description" },
  ]

  // Handle sort change from DataHeader
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    setSortBy(field)
    setSortDirection(direction)
  }

  // Handle export from DataHeader
  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting till screens as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }

  // Add filtered and sorted till screens calculation
  const filteredAndSortedTillScreens = (posState.tillScreens || [])
    .filter(
      (screen) =>
        screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortBy) return 0
      
      const aValue = a[sortBy as keyof TillScreen]
      const bValue = b[sortBy as keyof TillScreen]
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })

  // Load till screens data
  React.useEffect(() => {
    const loadTillScreens = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return

      try {
        await refreshTillScreens()
      } catch (error) {
        console.error("Error loading till screens:", error)
      }
    }

    loadTillScreens()
  }, [companyState.companyID, companyState.selectedSiteID, refreshTillScreens])

  const handleOpenTillScreen = (screenId?: string) => {
    if (screenId) {
      navigate(`/POS/Till/${screenId}`)
    } else {
      navigate("/POS/Till")
    }
  }

  // CRUD Modal handlers
  const handleOpenCrudModal = (tillScreen: TillScreen | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedTillScreen(tillScreen)
    setCrudMode(mode)
    setCrudModalOpen(true)
  }

  const handleCloseCrudModal = () => {
    setCrudModalOpen(false)
    setSelectedTillScreen(null)
    setCrudMode('create')
  }

  const handleSaveCrudModal = async (formData: any) => {
    try {
      if (crudMode === 'create') {
        // Create new till screen
        await createTillScreen(formData)
      } else if (crudMode === 'edit' && selectedTillScreen) {
        // Update existing till screen
        await updateTillScreen(selectedTillScreen.id, formData)
      }
      handleCloseCrudModal()
      // Refresh till screens
      await refreshTillScreens()
    } catch (error) {
      console.error('Failed to save till screen:', error)
    }
  }

  return (
    <Box>
      <DataHeader
        title="Till Management"
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search till screens..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenCrudModal(null, 'create')}
        createButtonLabel="Create Till Screen"
      />
      
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedTillScreens.map((screen) => (
              <TableRow 
                key={screen.id} 
                hover
                onClick={() => handleOpenCrudModal(screen, 'view')}
                sx={{ 
                  "&:last-child td, &:last-child th": { border: 0 },
                  cursor: "pointer"
                }}
              >
                <TableCell align="center" component="th" scope="row">
                  {screen.name}
                </TableCell>
                <TableCell align="center">{screen.description}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTillScreen(screen.id)
                      }}
                    >
                      Open Till
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenCrudModal(screen, 'edit')
                      }}
                    >
                      Edit
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TillScreenForm
        open={crudModalOpen}
        onClose={handleCloseCrudModal}
        tillScreen={selectedTillScreen}
        mode={crudMode}
        onSave={handleSaveCrudModal}
        onModeChange={setCrudMode}
      />
    </Box>
  )
}

export default TillManagement
