"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Button,
} from "@mui/material"
import {
  TableRestaurant as TableIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import { useBookings as useBookingsContext, Table } from "../../../backend/context/BookingsContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import TableForm from "./forms/TableForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const TableManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("bookings", "tables")
  const canRemove = canDelete("bookings", "tables")
  const {
    tables: contextTables,
    loading,
    error,
    addTable,
    updateTable,
    deleteTable,
    fetchTables,
  } = useBookingsContext()

  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [sortBy, setSortBy] = useState("order")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  // Reordering state
  const [isOrderingMode, setIsOrderingMode] = useState(false)
  const [previewTables, setPreviewTables] = useState<Table[]>([])
  const [draggedTable, setDraggedTable] = useState<Table | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // CRUD form states
  const [tableFormOpen, setTableFormOpen] = useState(false)
  const [tableFormMode, setTableFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTableForForm, setSelectedTableForForm] = useState<Table | null>(null)

  // Load tables on mount
  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  // Filter tables based on search
  // Filter and sort tables based on search term and sort options
  const filteredAndSortedTables = useMemo(() => {
    const tablesToUse = isOrderingMode ? previewTables : contextTables
    const filtered = tablesToUse.filter((table) =>
      table.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.section?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let aValue: string | number = ""
      let bValue: string | number = ""

      switch (sortBy) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "capacity":
          aValue = a.capacity || 0
          bValue = b.capacity || 0
          break
        case "section":
          aValue = a.section || ""
          bValue = b.section || ""
          break
        case "status":
          aValue = a.active ? "Active" : "Inactive"
          bValue = b.active ? "Active" : "Inactive"
          break
        case "order":
          aValue = a.order || 0
          bValue = b.order || 0
          break
        default:
          aValue = a.name || ""
          bValue = b.name || ""
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        const comparison = (aValue as number) - (bValue as number)
        return sortDirection === "asc" ? comparison : -comparison
      }
    })
  }, [contextTables, previewTables, searchTerm, sortBy, sortDirection, isOrderingMode])

  // Sort options for tables
  const sortOptions = [
    { value: "order", label: "Order" },
    { value: "name", label: "Name" },
    { value: "capacity", label: "Capacity" },
    { value: "section", label: "Section" },
    { value: "status", label: "Status" },
  ]

  // CRUD form handlers
  const handleOpenTableForm = (table: Table | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTableForForm(table)
    setTableFormMode(mode)
    setTableFormOpen(true)
  }

  const handleCloseTableForm = () => {
    setTableFormOpen(false)
    setSelectedTableForForm(null)
    setTableFormMode('create')
  }

  const handleSaveTable = async (tableData: any) => {
    try {
      const now = new Date().toISOString()
      
      if (tableFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(tableData).filter(([_, value]) => value !== undefined)
        )
        const newTable = {
          ...createPayload,
          id: `table-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        }
        await addTable(newTable)
        setSuccess("Table created successfully")
      } else if (tableFormMode === 'edit' && selectedTableForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...tableData, id: selectedTableForForm.id, updatedAt: now }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateTable(selectedTableForForm.id, updatePayload)
        setSuccess("Table updated successfully")
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "tableManagementModal1",
        crudMode: tableFormMode,
        id: selectedTableForForm?.id,
        itemLabel: tableData?.name,
      })
      
      handleCloseTableForm()
    } catch (error) {
      debugWarn("Error saving table:", error)
      setNotification({ message: "Failed to save table", type: "error" })
    }
  }

  const handleDeleteTable = async (tableId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this table?")) return
    
    try {
      await deleteTable(tableId)
      setSuccess("Table deleted successfully")
    } catch (error) {
      debugWarn("Error deleting table:", error)
      setNotification({ message: "Failed to delete table", type: "error" })
    }
  }

  // Reordering handlers
  const handleStartOrdering = () => {
    setIsOrderingMode(true)
    // Ensure tables have order numbers and sort by order
    const tablesWithOrder = contextTables.map((table, index) => ({
      ...table,
      order: table.order !== undefined ? table.order : index
    })).sort((a, b) => (a.order || 0) - (b.order || 0))
    
    setPreviewTables(tablesWithOrder)
  }

  const handleCancelOrdering = () => {
    setIsOrderingMode(false)
    setPreviewTables([])
    setDraggedTable(null)
    setDragOverIndex(null)
  }

  const handleSaveOrder = async () => {
    try {
      // Update each table with its new order - update ALL tables to ensure consistency
      for (let i = 0; i < previewTables.length; i++) {
        const table = previewTables[i]
        // Include id in update payload (required for proper updates)
        const updatePayload = { order: i, id: table.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateTable(table.id, updatePayload)
      }
      
      setNotification({ message: "Table order saved successfully", type: "success" })
      setIsOrderingMode(false)
      setPreviewTables([])
      await fetchTables() // Refresh to get updated data
    } catch (error) {
      debugWarn("Error saving table order:", error)
      setNotification({ message: "Failed to save table order", type: "error" })
    }
  }

  const handleDragStart = (e: React.DragEvent, table: Table) => {
    setDraggedTable(table)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedTable) return

    const dragIndex = previewTables.findIndex(table => table.id === draggedTable.id)
    if (dragIndex === -1) return

    const newTables = [...previewTables]
    const [draggedItem] = newTables.splice(dragIndex, 1)
    newTables.splice(dropIndex, 0, draggedItem)

    // Update order numbers to reflect new positions
    const updatedTables = newTables.map((table, index) => ({
      ...table,
      order: index
    }))

    setPreviewTables(updatedTables)
    setDraggedTable(null)
    setDragOverIndex(null)
  }

  // No loading indicators — UI renders and fills as data arrives (like HR section)
  const hasActiveFilters = searchTerm.length > 0

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <DataHeader
          showDateControls={false}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search tables..."
          filters={[]}
          filtersExpanded={false}
          onFiltersToggle={() => {}}
          sortOptions={isOrderingMode ? [] : sortOptions}
          sortValue={sortBy}
          sortDirection={sortDirection}
          onSortChange={(value, direction) => {
            setSortBy(value)
            setSortDirection(direction)
          }}
          onCreateNew={() => handleOpenTableForm(null, 'create')}
          createButtonLabel="Create Table"
          createDisabled={!canMutate}
          createDisabledTooltip="You don't have permission to create or edit tables."
          additionalButtons={!isOrderingMode ? [
            {
              label: "Reorder Tables",
              icon: <SaveIcon />,
              onClick: handleStartOrdering,
              variant: "outlined" as const,
              disabled: !canMutate,
              tooltip: "You don't have permission to create or edit tables."
            }
          ] : [
            {
              label: "Save Order",
              icon: <SaveIcon />,
              onClick: handleSaveOrder,
              variant: "contained" as const,
              color: "success" as const,
              disabled: !canMutate,
              tooltip: "You don't have permission to create or edit tables.",
            },
            {
              label: "Cancel",
              icon: <CloseIcon />,
              onClick: handleCancelOrdering,
              variant: "outlined" as const,
              disabled: !canMutate,
            }
          ]}
        />
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {/* No loading indicators — UI renders and fills as data arrives */}
      {filteredAndSortedTables.length === 0 && !isOrderingMode ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={TableIcon}
            title={hasActiveFilters ? "No tables match your filters" : "No tables found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first table to get started."
            }
          />
        </Box>
      ) : (
        <Grid container spacing={1}>
          {filteredAndSortedTables.map((table, index) => (
            <Grid item xs={12} sm={6} md={3} lg={2} xl={1.5} key={table.id}>
              <Card
                draggable={isOrderingMode}
                onDragStart={(e) => handleDragStart(e, table)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={!isOrderingMode ? () => handleOpenTableForm(table, 'view') : undefined}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                  minHeight: 90,
                  position: "relative",
                  cursor: isOrderingMode ? "grab" : "pointer",
                  border: isOrderingMode && draggedTable?.id === table.id ? "2px dashed #1976d2" : "none",
                  backgroundColor: isOrderingMode && dragOverIndex === index ? "action.hover" : "background.paper",
                  "&:hover": {
                    transform: isOrderingMode ? "none" : "translateY(-1px)",
                    boxShadow: isOrderingMode ? 1 : 2,
                  },
                  "&:active": {
                    cursor: isOrderingMode ? "grabbing" : "default",
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 0.75, pr: 4.5, '&:last-child': { pb: 0.75 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
                    <TableIcon color="primary" sx={{ mr: 0.5, fontSize: 14 }} />
                    <Typography variant="subtitle2" component="h3" sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.1, wordBreak: 'break-word' }}>
                      {table.name}
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label={`#${(table.order || 0) + 1}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.6rem', 
                          height: 16,
                          minWidth: 24,
                          '& .MuiChip-label': { px: 0.5 }
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: themeConfig.brandColors.navy, mb: 0.25, display: 'block' }}>
                    {table.capacity || 0} max
                  </Typography>
                  
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25, mb: 0.25 }}>
                    {table.section && (
                      <Chip
                        label={table.section}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 16 }}
                      />
                    )}
                    {table.isVip && (
                      <Chip
                        label="VIP"
                        size="small"
                        color="warning"
                        variant="filled"
                        sx={{ fontSize: '0.6rem', height: 16 }}
                      />
                    )}
                  </Box>

                  {table.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1.1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {table.notes.length > 30 ? `${table.notes.substring(0, 30)}...` : table.notes}
                    </Typography>
                  )}
                </CardContent>

                {/* Action Icons positioned on the right */}
                <Box sx={{ 
                  position: "absolute", 
                  top: 6, 
                  right: 6, 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 0.02 
                }}>
                  <Tooltip title="Edit Table" placement="left">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTableForm(table, 'edit')
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
                  <Tooltip title="Delete Table" placement="left">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTable(table.id)
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

      {/* CRUD Modal */}
      <CRUDModal
        open={tableFormOpen}
        onClose={(reason) => {
          setTableFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedTableForForm(null)
            setTableFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "tableManagementModal1",
          crudMode: tableFormMode,
          id: selectedTableForForm?.id,
          itemLabel: selectedTableForForm?.name,
        }}
        title={
          tableFormMode === "create"
            ? "Add table"
            : tableFormMode === "edit"
              ? "Edit table"
              : "View table"
        }
        icon={<TableIcon />}
        mode={tableFormMode}
        onSave={tableFormMode !== "view" ? handleSaveTable : undefined}
        hideSaveButton={tableFormMode === "view"}
      >
        <TableForm
          table={selectedTableForForm}
          mode={tableFormMode}
          onSave={handleSaveTable}
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

export default TableManagement
