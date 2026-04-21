"use client"
import { useLocation } from "react-router-dom"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Grid, CircularProgress, Alert, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, List, ListItem, ListItemText, Card, CardContent } from "@mui/material"
import {
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { usePOS, Bill } from "../../../backend/context/POSContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import BillForm from "../../components/pos/forms/BillForm"
import DataHeader from "../../components/reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"

const BillsManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "bills")
  const canRemove = canDelete("pos", "bills")
  const { state: posState, refreshBills, deleteBill, updateBill, createBill } = usePOS()
  const { state: companyState } = useCompany()

  // State variables
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // DataHeader state
  const [sortBy, setSortBy] = useState<string>("id")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc")
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [serverFilter, setServerFilter] = useState<string>("all")
  
  // Date controls state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("day")
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(), // today
  })
  const [selectedBill] = useState<Bill | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null)
  
  // Form states
  const [billFormOpen, setBillFormOpen] = useState(false)
  const [billFormMode, setBillFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBillForForm, setSelectedBillForForm] = useState<Bill | null>(null)
  // const [localError, setLocalError] = useState<string | null>(null) // Would use when implementing error handling
  // const [loading, setLoading] = useState(false) // Would use when implementing loading states
  // const [error, setError] = useState<string | null>(null) // Would use when implementing error handling

  // Get bills from POS context
  const allBills = (posState as any).bills || []

  // Refresh data when component mounts or company/site changes
  useEffect(() => {
    if (companyState.companyID && companyState.selectedSiteID) {
      refreshBills()
    }
  }, [companyState.companyID, companyState.selectedSiteID])

  // Get all bills (no longer tab-based)
  const getAllBills = () => {
    return allBills
  }

  // Helper functions for filters
  const getAvailablePaymentMethods = () => {
    const methods = new Set<string>()
    allBills.forEach((bill: any) => {
      if (bill.paymentMethod) methods.add(bill.paymentMethod)
    })
    return Array.from(methods).sort()
  }

  const getAvailableServers = () => {
    const servers = new Set<string>()
    allBills.forEach((bill: any) => {
      if (bill.server) servers.add(bill.server)
    })
    return Array.from(servers).sort()
  }

  // Create filters for DataHeader
  const filters = useMemo(() => [
    {
      label: "Status",
      options: [
        { id: "all", name: "All Bills" },
        { id: "open", name: "Open Bills" },
        { id: "closed", name: "Closed Bills" }
      ],
      selectedValues: statusFilter !== "all" ? [statusFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setStatusFilter(value)
      }
    },
    {
      label: "Payment Method",
      options: [
        { id: "all", name: "All Methods" },
        ...getAvailablePaymentMethods().map(method => ({ id: method, name: method }))
      ],
      selectedValues: paymentMethodFilter !== "all" ? [paymentMethodFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setPaymentMethodFilter(value)
      }
    },
    {
      label: "Server",
      options: [
        { id: "all", name: "All Servers" },
        ...getAvailableServers().map(server => ({ id: server, name: server }))
      ],
      selectedValues: serverFilter !== "all" ? [serverFilter] : [],
      onSelectionChange: (values: string[]) => {
        const value = values.length > 0 ? values[0] : "all"
        setServerFilter(value)
      }
    }
  ], [allBills, statusFilter, paymentMethodFilter, serverFilter])

  // Filter bills based on search and all filters
  const filteredBills = getAllBills().filter((bill: any) => {
    // Date filtering using DataHeader controls
    if (dateType === "custom") {
      const billDate = new Date(bill.createdAt || bill.updatedAt || Date.now())
      if (billDate < customDateRange.start || billDate > customDateRange.end) {
        return false
      }
    } else {
      const billDate = new Date(bill.createdAt || bill.updatedAt || Date.now())
      
      switch (dateType) {
        case "day":
          const selectedDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
          const nextDay = new Date(selectedDay.getTime() + 24 * 60 * 60 * 1000)
          if (billDate < selectedDay || billDate >= nextDay) {
            return false
          }
          break
        case "week":
          const startOfWeek = new Date(currentDate)
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (billDate < startOfWeek || billDate >= endOfWeek) {
            return false
          }
          break
        case "month":
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          if (billDate < startOfMonth || billDate >= endOfMonth) {
            return false
          }
          break
      }
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        bill.id.toLowerCase().includes(searchLower) ||
        bill.tableNumber.toLowerCase().includes(searchLower) ||
        bill.server.toLowerCase().includes(searchLower) ||
        bill.status.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter === "open" && bill.status.toLowerCase() !== "open") {
      return false
    }
    if (statusFilter === "closed" && bill.status.toLowerCase() !== "closed") {
      return false
    }

    // Payment method filter
    if (paymentMethodFilter !== "all" && bill.paymentMethod !== paymentMethodFilter) {
      return false
    }

    // Server filter
    if (serverFilter !== "all" && bill.server !== serverFilter) {
      return false
    }

    return true
  })

  // Sort options
  const sortOptions = [
    { value: 'id', label: 'Bill ID' },
    { value: 'tableNumber', label: 'Table Number' },
    { value: 'server', label: 'Server' },
    { value: 'status', label: 'Status' },
    { value: 'total', label: 'Total' },
    { value: 'createdAt', label: 'Created Date' }
  ]

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting bills as ${format}`)
    // Export functionality would be implemented here
    // For now, just log the action
  }



  const handleDeleteBill = (bill: Bill) => {
    if (!canRemove) return
    setBillToDelete(bill)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteBill = async () => {
    if (!canRemove) return
    if (!billToDelete || !companyState.companyID || !companyState.selectedSiteID) return

    try {
      await deleteBill(billToDelete.id)
      setDeleteDialogOpen(false)
      setBillToDelete(null)
    } catch (err) {
      console.error("Error deleting bill:", err)
      console.error("Failed to delete bill. Please try again.")
    }
  }

  const handleCloseBill = async (bill: Bill) => {
    if (!canMutate) return
    if (!companyState.companyID || !companyState.selectedSiteID) return

    try {
      const updatedBill = {
        ...bill,
        status: "closed" as const,
        closedAt: Date.now(),
      }
      await updateBill(bill.id, updatedBill)
    } catch (err) {
      console.error("Error closing bill:", err)
      console.error("Failed to close bill. Please try again.")
    }
  }

  // Form handlers
  const handleOpenBillForm = (bill: Bill | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedBillForForm(bill)
    setBillFormMode(mode)
    setBillFormOpen(true)
  }

  const handleCloseBillForm = () => {
    setBillFormOpen(false)
    setSelectedBillForForm(null)
    setBillFormMode('create')
  }

  const handleSaveBill = async (billData: any) => {
    if (!canMutate) return
    try {
      if (billFormMode === 'create') {
        await createBill(billData)
      } else if (billFormMode === 'edit') {
        await updateBill(selectedBillForForm!.id, billData)
      }

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "billsManagementModal1",
        crudMode: billFormMode,
        id: selectedBillForForm?.id,
        itemLabel: billData?.id ?? selectedBillForForm?.id,
      })
      
      handleCloseBillForm()
    } catch (error) {
      console.error('Error saving bill:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "warning"
      case "closed":
        return "success"
      case "cancelled":
        return "error"
      default:
        return "default"
    }
  }

  // Summary metrics for current filtered view
  const summary = (() => {
    const bills = filteredBills
    const count = bills.length
    const subtotal = bills.reduce((sum: any, b: any) => sum + (b.subtotal || 0), 0)
    const tax = bills.reduce((sum: any, b: any) => sum + (b.tax || 0), 0)
    const total = bills.reduce((sum: any, b: any) => sum + (b.total || 0), 0)
    return { count, subtotal, tax, total }
  })()

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (false) { // Would use loading state when implementing
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>


      {/* Error Alert */}
      {false && ( // Would use error state when implementing
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => console.log("Dismiss error")}>
          Error occurred
        </Alert>
      )}


      <DataHeader
        showDateControls={true}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        customStartDate={customDateRange.start}
        customEndDate={customDateRange.end}
        onCustomDateRangeChange={(start, end) => setCustomDateRange({ start, end })}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bills..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenBillForm(null, 'create')}
        createButtonLabel="New Bill"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit bills."
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '80px' }}>
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ fontWeight: 'bold' }}>{summary.count}</span>
                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>Bills</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '80px' }}>
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(summary.subtotal)}</span>
                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>Subtotal</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '80px' }}>
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(summary.tax)}</span>
                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>Tax</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '80px' }}>
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(summary.total)}</span>
                <span style={{ fontSize: '0.7em', color: 'text.secondary' }}>Total</span>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bills Table */}
      <TableContainer component={Paper} sx={{ overflow: 'hidden', borderRadius: 1, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Bill ID</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Table</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Server</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Items</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Subtotal</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Tax</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Total</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Created</TableCell>
              <TableCell align="center" sx={{ textAlign: 'center !important' }}>Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBills.map((bill: any) => (
              <TableRow 
                key={bill.id} 
                hover
                onClick={() => handleOpenBillForm(bill, 'view')}
                sx={{ cursor: "pointer" }}
              >
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {bill.id}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{bill.tableNumber}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{bill.server}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={bill.status} size="small" color={getStatusColor(bill.status) as any} />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{bill.items?.length || 0}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatCurrency(bill.subtotal)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatCurrency(bill.tax)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(bill.total)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatDate(bill.createdAt)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(bill.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{formatDate(bill.updatedAt)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(bill.updatedAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                    <Tooltip title="Edit Bill">
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenBillForm(bill, 'edit')
                        }}
                        disabled={!canMutate}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {bill.status === "Open" && (
                      <Tooltip title="Close Bill">
                        <IconButton 
                          size="small" 
                          color="success" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCloseBill(bill)
                          }}
                          disabled={!canMutate}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBill(bill)
                        }}
                        disabled={!canRemove}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredBills.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm || statusFilter !== "all" || paymentMethodFilter !== "all" || serverFilter !== "all"
                      ? "No bills match your filter criteria."
                      : "No bills available."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Bill Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptIcon />
            Bill Details - {selectedBill?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Table Number
                  </Typography>
                  <Typography variant="body1">{selectedBill.tableNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Server
                  </Typography>
                  <Typography variant="body1">{selectedBill.server}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip label={selectedBill.status} size="small" color={getStatusColor(selectedBill.status) as any} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">{selectedBill.paymentMethod || "N/A"}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <List dense>
                {selectedBill.items?.map((item, index) => (
                  <ListItem key={index} divider>
                    <ListItemText primary={item.name} secondary={`Quantity: ${item.quantity}`} />
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency((item.price || 0) * item.quantity)}
                    </Typography>
                  </ListItem>
                )) || (
                  <Typography variant="body2" color="text.secondary">
                    No items in this bill
                  </Typography>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">{formatCurrency(selectedBill.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body1">Tax:</Typography>
                <Typography variant="body1">{formatCurrency(selectedBill.tax)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body1">Service Charge:</Typography>
                <Typography variant="body1">{formatCurrency(selectedBill.serviceCharge || 0)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body1">Discount:</Typography>
                <Typography variant="body1">-{formatCurrency(selectedBill.discount || 0)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(selectedBill.total)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            startIcon={<EditIcon />}
            onClick={() => {
              setViewDialogOpen(false)
              setSelectedBillForForm(selectedBill)
              setBillFormMode('edit')
              setBillFormOpen(true)
            }}
          >
            Edit
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this bill? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteBill} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill Form Modal */}
      <CRUDModal
        open={billFormOpen}
        onClose={(reason) => {
          setBillFormOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedBillForForm(null)
            setBillFormMode("create")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "billsManagementModal1",
          crudMode: billFormMode,
          id: selectedBillForForm?.id,
          itemLabel: selectedBillForForm?.id,
        }}
        title={
          billFormMode === "create"
            ? "Create bill"
            : billFormMode === "edit"
              ? "Edit bill"
              : "View bill"
        }
        icon={<ReceiptIcon />}
        mode={billFormMode}
        onSave={billFormMode !== "view" ? () => Promise.resolve() : undefined}
        hideSaveButton={billFormMode === "view"}
        maxWidth="md"
      >
        <BillForm
          bill={selectedBillForForm}
          mode={billFormMode}
          onSave={handleSaveBill}
          onCancel={handleCloseBillForm}
        />
      </CRUDModal>
    </Box>
  )
}

export default BillsManagement
