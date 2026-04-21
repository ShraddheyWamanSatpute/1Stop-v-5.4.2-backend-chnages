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
  LocalShipping as SupplierIcon,
  Save as SaveIcon,
} from "@mui/icons-material"
import { useStock } from "../../../backend/context/StockContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import SupplierForm from "./forms/SupplierForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn } from "../../../utils/debugLog"

const SuppliersManagement: React.FC = () => {
  const location = useLocation()
  const { state, createSupplier, updateSupplier, deleteSupplier, fetchSuppliers } = useStock()
  const { dataVersion, loading } = state
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("stock", "suppliers")
  const canRemove = canDelete("stock", "suppliers")
  
  // Local state for suppliers since they're not stored in context state
  const [suppliers, setSuppliers] = useState<any[]>([])

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // CRUD Modal state
  const [supplierFormOpen, setSupplierFormOpen] = useState(false)
  const [selectedSupplierForForm, setSelectedSupplierForForm] = useState<any>(null)
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
    { value: "ref", label: "Reference" },
    { value: "address", label: "Address" },
    { value: "contact", label: "Contact" },
    { value: "orderUrl", label: "Order URL" },
  ]

  // Filter and sort suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    if (!suppliers || !Array.isArray(suppliers)) {
      return []
    }
    
    let filtered = suppliers.filter((supplier) =>
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.orderUrl?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [suppliers, searchTerm, sortBy, sortDirection, dataVersion])

  // DataHeader handlers
  const handleSortChange = (value: string, direction: "asc" | "desc") => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleCreateNew = () => {
    if (!canMutate) return
    setSelectedSupplierForForm(null)
    setCrudMode('create')
    setSupplierFormOpen(true)
  }

  const handleRefresh = async () => {
    try {
      const fetchedSuppliers = await fetchSuppliers()
      setSuppliers(fetchedSuppliers || [])
    } catch (error) {
      debugWarn("Error refreshing suppliers:", error)
      setNotification({
        open: true,
        message: "Failed to refresh suppliers",
        severity: "error"
      })
    }
  }

  // CRUD handlers
  const handleOpenSupplierForm = (supplier: any = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedSupplierForForm(supplier)
    setCrudMode(mode)
    setSupplierFormOpen(true)
  }

  const handleCloseSupplierForm = () => {
    setSupplierFormOpen(false)
    setSelectedSupplierForForm(null)
    setCrudMode('create')
    setCurrentFormData(null)
  }

  const handleSaveSupplierForm = async (supplierData: any) => {
    try {
      const isEvent = supplierData && typeof supplierData === "object" && "nativeEvent" in supplierData && "target" in supplierData
      const payload = isEvent ? currentFormData : supplierData
      if (!payload) {
        throw new Error("No supplier data to save")
      }

      if (crudMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(payload).filter(([_, value]) => value !== undefined)
        )
        await createSupplier?.(createPayload)
        setNotification({
          open: true,
          message: "Supplier created successfully",
          severity: "success"
        })
      } else if (crudMode === 'edit' && selectedSupplierForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload = { ...payload, id: selectedSupplierForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateSupplier?.(selectedSupplierForForm.id, updatePayload)
        setNotification({
          open: true,
          message: "Supplier updated successfully",
          severity: "success"
        })
      }
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "suppliersManagementModal1",
        crudMode,
        id: selectedSupplierForForm?.id ?? payload?.id,
        itemLabel: payload?.name,
      })
      handleCloseSupplierForm()
      // Refresh the local suppliers list
      await handleRefresh()
    } catch (error) {
      debugWarn("Error saving supplier:", error)
      setNotification({
        open: true,
        message: "Failed to save supplier",
        severity: "error"
      })
    }
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this supplier?")) return

    try {
      await deleteSupplier?.(supplierId)
      setNotification({
        open: true,
        message: "Supplier deleted successfully",
        severity: "success"
      })
      // Refresh the local suppliers list
      await handleRefresh()
    } catch (error) {
      setNotification({
        open: true,
        message: "Failed to delete supplier",
        severity: "error"
      })
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  // Load suppliers on component mount and when data changes
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
        searchPlaceholder="Search suppliers..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onCreateNew={handleCreateNew}
        createButtonLabel="Create Supplier"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit suppliers."
      />

      {/* No loading indicators — UI renders and fills as data arrives */}
      
      {/* Suppliers Table */}
      {filteredAndSortedSuppliers.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <EmptyStateCard
            icon={SupplierIcon}
            title={hasActiveFilters ? "No suppliers match your filters" : "No suppliers found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first supplier to get started."
            }
          />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Reference</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Address</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Contact</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Order URL</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedSuppliers.map((supplier) => (
                <TableRow 
                  key={supplier.id} 
                  hover
                  onClick={() => handleOpenSupplierForm(supplier, 'view')}
                  sx={{ 
                    cursor: "pointer",
                    '& > td': {
                      paddingTop: 1,
                      paddingBottom: 1,
                    }
                  }}
                >
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{supplier.name || "No name"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{supplier.ref || "No reference"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{supplier.address || "No address"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>{supplier.contact || "No contact"}</TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    {supplier.orderUrl ? (
                      <a 
                        href={supplier.orderUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          color: 'inherit', 
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }}
                      >
                        {supplier.orderUrl.length > 30 ? `${supplier.orderUrl.substring(0, 30)}...` : supplier.orderUrl}
                      </a>
                    ) : (
                      "No URL"
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                    <Box display="flex" gap={1} justifyContent="center">
                      <IconButton 
                        size="small" 
                        disabled={!canMutate}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenSupplierForm(supplier, 'edit')
                        }}
                        title={canMutate ? "Edit Supplier" : "No permission to edit"}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        disabled={!canRemove}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canRemove) return
                          handleDeleteSupplier(supplier.id)
                        }}
                        title={canRemove ? "Delete Supplier" : "No permission to delete"}
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
        open={supplierFormOpen}
        onClose={(reason) => {
          setSupplierFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedSupplierForForm(null)
            setCrudMode("create")
            setCurrentFormData(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "suppliersManagementModal1",
          crudMode,
          id: selectedSupplierForForm?.id,
          itemLabel: selectedSupplierForForm?.name,
        }}
        title={
          crudMode === "create"
            ? "Create Supplier"
            : crudMode === "edit"
              ? "Edit Supplier"
              : "View Supplier"
        }
        icon={<SaveIcon />}
        mode={crudMode}
        onEdit={() => setCrudMode("edit")}
        onSave={crudMode !== "view" ? async () => {} : undefined}
        hideSaveButton={crudMode === "view"}
      >
        <SupplierForm
          supplier={selectedSupplierForForm}
          mode={crudMode}
          onSave={handleSaveSupplierForm}
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

export default SuppliersManagement
