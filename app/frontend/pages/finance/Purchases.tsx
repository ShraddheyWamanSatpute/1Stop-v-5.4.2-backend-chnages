"use client"

import type React from "react"
import { useCallback, useState, useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material"
import {
  MoreVert,
  ShoppingCart,
  CheckCircle,
  Edit,
  Delete,
  Visibility,
  Receipt,
  Close,
  Add,
  Payment,
  CreditCard,
  Assessment,
  Repeat,
  AttachFile,
  Print,
  Download,
} from "@mui/icons-material"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from "@mui/material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import BillCRUDForm from "../../components/finance/forms/BillCRUDForm"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"
import type { Bill, Payment as PaymentType, CreditNote, Contact } from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const Purchases: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingBill, setEditingBill] = useState<Bill | null>(null)

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingBill, setViewingBill] = useState<Bill | null>(null)
  
  // Payment Dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("")
  const [paymentReference, setPaymentReference] = useState("")

  // Credit Note Dialog state
  const [isCreditNoteDialogOpen, setIsCreditNoteDialogOpen] = useState(false)
  const [creditNoteAmount, setCreditNoteAmount] = useState(0)
  const [creditNoteReason, setCreditNoteReason] = useState("")

  // AP Aging Dialog state
  const [isAPAgingDialogOpen, setIsAPAgingDialogOpen] = useState(false)

  // Recurring Bills Dialog state
  const [isRecurringBillsDialogOpen, setIsRecurringBillsDialogOpen] = useState(false)
  
  const { 
    state: financeState, 
    refreshAll,
    refreshBills,
    refreshContacts,
    refreshPayments,
    refreshCreditNotes,
    refreshBankAccounts,
    refreshAccounts,
    refreshTaxRates,
    deleteBill, 
    createBill, 
    updateBill,
    approveBill,
    markBillPaid,
    createPayment,
    createCreditNote,
  } = useFinance()

  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "purchases")
  const canRemove = canDelete("finance", "purchases")
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.bills.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.bills.length, financeState.loading, loadData])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create" || entity !== "bill") return

    handleOpenCreateModal()
    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const bills = financeState.bills || []

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, bill: Bill) => {
    setAnchorEl(event.currentTarget)
    setSelectedBill(bill)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedBill(null)
  }
  
  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingBill(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (bill: Bill) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingBill(bill)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (bill: Bill) => {
    setViewingBill(bill)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  // Form submit handler
  const handleSaveBill = async (data: any) => {
    const billSnapshot = editingBill
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createBill(cleanData)
      } else if (crudMode === "edit" && editingBill) {
        // Include id in update
        await updateBill(editingBill.id, { ...cleanData, id: editingBill.id })
      }
      await refreshBills()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bill",
        crudMode: modeSnapshot,
        id: billSnapshot?.id,
        itemLabel: billSnapshot?.reference || billSnapshot?.billNumber || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingBill(null)
    } catch (error) {
      // Error saving bill - handled by context
      throw error
    }
  }

  const handleDeleteBillAction = async (bill: Bill) => {
    if (!canRemove) return
    if (!window.confirm(`Are you sure you want to delete bill ${bill.reference}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteBill(bill.id)
      await refreshBills()
      handleMenuClose()
    } catch (error) {
      // Error deleting bill - handled by context
      alert("Failed to delete bill. Please try again.")
    }
  }

  const handleApproveBillAction = async (bill: Bill) => {
    try {
      await approveBill(bill.id)
      await refreshBills()
      handleMenuClose()
    } catch (error) {
      // Error approving bill - handled by context
      alert("Failed to approve bill. Please try again.")
    }
  }

  const handleOpenPaymentDialog = (bill: Bill) => {
    setSelectedBill(bill)
    const balanceDue = bill.balance_due || bill.balanceDue || bill.totalAmount
    setPaymentAmount(balanceDue)
    if (financeState.bankAccounts.length > 0) {
      setPaymentBankAccountId(financeState.bankAccounts[0].id)
    }
    setIsPaymentDialogOpen(true)
    handleMenuClose()
  }

  const handleApplyPayment = async () => {
    if (!selectedBill || !paymentBankAccountId) return

    try {
      const balanceDue = selectedBill.balance_due || selectedBill.balanceDue || selectedBill.totalAmount
      const paymentAmt = paymentAmount
      const newBalance = Math.max(0, balanceDue - paymentAmt)
      const isOverpayment = paymentAmt > balanceDue
      const overpaymentAmount = isOverpayment ? paymentAmt - balanceDue : 0

      // Create payment record
      await createPayment({
        type: "supplier_payment",
        amount: paymentAmt,
        currency: selectedBill.currency,
        paymentDate,
        paymentMethod: paymentMethod as any,
        bankAccountId: paymentBankAccountId,
        contactId: selectedBill.supplierId,
        allocations: [
          {
            documentType: "bill",
            documentId: selectedBill.id,
            amount: Math.min(paymentAmt, balanceDue),
          },
        ],
        status: "completed",
        reference: paymentReference,
      } as any)

      // Update bill
      await updateBill(selectedBill.id, {
        id: selectedBill.id,
        balance_due: newBalance,
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : selectedBill.status,
        paidDate: newBalance === 0 ? paymentDate : selectedBill.paidDate,
        overpaymentAmount: isOverpayment ? overpaymentAmount : undefined,
        updatedAt: new Date().toISOString(),
      })

      setIsPaymentDialogOpen(false)
      setSelectedBill(null)
      await Promise.all([refreshBills(), refreshPayments()])
    } catch (error) {
      // Error applying payment - handled by context
      alert("Failed to apply payment. Please try again.")
    }
  }

  const handleOpenCreditNoteDialog = (bill: Bill) => {
    setSelectedBill(bill)
    const balanceDue = bill.balance_due || bill.balanceDue || bill.totalAmount
    setCreditNoteAmount(balanceDue)
    setIsCreditNoteDialogOpen(true)
    handleMenuClose()
  }

  const handleApplyCreditNote = async () => {
    if (!selectedBill) return

    try {
      const balanceDue = selectedBill.balance_due || selectedBill.balanceDue || selectedBill.totalAmount
      const creditAmt = creditNoteAmount
      const newBalance = Math.max(0, balanceDue - creditAmt)
      const creditReason = creditNoteReason.trim() || `Supplier credit for bill ${selectedBill.billNumber || selectedBill.reference || selectedBill.id}`

      await createCreditNote({
        creditNoteNumber: undefined as any,
        customerId: selectedBill.supplierId,
        customerName: selectedBill.supplierName,
        lineItems: (selectedBill.lineItems || []).map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          accountId: item.accountId,
        })),
        subtotal: Math.max(0, creditAmt - (selectedBill.taxAmount || 0)),
        taxAmount: selectedBill.taxAmount || 0,
        totalAmount: creditAmt,
        balance_due: 0,
        balanceDue: 0,
        currency: selectedBill.currency,
        issueDate: new Date().toISOString().split("T")[0],
        reason: creditReason,
        status: "applied",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CreditNote)

      // Update bill balance (credit note reduces what we owe)
      await updateBill(selectedBill.id, {
        id: selectedBill.id,
        balance_due: newBalance,
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : selectedBill.status,
        updatedAt: new Date().toISOString(),
      })

      setIsCreditNoteDialogOpen(false)
      setSelectedBill(null)
      setCreditNoteReason("")
      setCreditNoteAmount(0)
      await Promise.all([refreshBills(), refreshCreditNotes()])
    } catch (error) {
      // Error applying credit note - handled by context
      alert("Failed to apply credit note. Please try again.")
    }
  }

  const handleMarkAsPaidAction = async (bill: Bill) => {
    try {
      const balanceDue = bill.balance_due || bill.balanceDue || bill.totalAmount || 0
      await markBillPaid(bill.id, balanceDue)
      await refreshBills()
      handleMenuClose()
    } catch (error) {
      // Error marking bill as paid - handled by context
      alert("Failed to mark bill as paid. Please try again.")
    }
  }

  // Calculate AP Aging
  const calculateAPAging = (bill: Bill) => {
    const dueDate = new Date(bill.dueDate)
    const today = new Date()
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const balance = bill.balance_due || bill.balanceDue || bill.totalAmount || 0
    
    if (bill.status === "paid" || balance === 0) {
      return { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
    }
    
    if (daysOverdue < 0) return { current: balance, days30: 0, days60: 0, days90: 0, over90: 0 }
    if (daysOverdue <= 30) return { current: 0, days30: balance, days60: 0, days90: 0, over90: 0 }
    if (daysOverdue <= 60) return { current: 0, days30: 0, days60: balance, days90: 0, over90: 0 }
    if (daysOverdue <= 90) return { current: 0, days30: 0, days60: 0, days90: balance, over90: 0 }
    return { current: 0, days30: 0, days60: 0, days90: 0, over90: balance }
  }

  // Date filtering helper
  const isDateInRange = (_date: string) => {
    return true // No date filtering when date controls are disabled
  }

  const filteredBills = bills.filter((bill) => {
    if (!bill) return false
    const matchesSearch =
      (bill.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (bill.description?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (bill.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    const matchesStatus = statusFilter === "All" || bill.status === statusFilter.toLowerCase()
    const matchesDate = isDateInRange(bill.receiveDate || bill.dueDate)
    return matchesSearch && matchesStatus && matchesDate
  })
  
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "All"

  const totalPending = bills
    .filter((bill) => bill.status === "pending" || bill.status === "approved")
    .reduce((sum, bill) => sum + (bill.balance_due || bill.balanceDue || bill.totalAmount || 0), 0)

  const overdueBills = bills.filter((bill) => {
    const today = new Date().toISOString().split("T")[0]
    return (bill.status !== "paid" && bill.dueDate < today) && (bill.balance_due || bill.balanceDue || bill.totalAmount || 0) > 0
  })

  const totalOutstanding = bills
    .filter((bill) => bill.status !== "paid" && bill.status !== "cancelled")
    .reduce((sum, bill) => sum + (bill.balance_due || bill.balanceDue || bill.totalAmount || 0), 0)

  const recurringBills = bills.filter((bill) => bill.recurringSchedule?.isActive)

  return (
    <Box sx={{ p: 0 }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}
      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<Assessment />}
          onClick={() => setIsAPAgingDialogOpen(true)}
        >
          AP Aging Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<Repeat />}
          onClick={() => setIsRecurringBillsDialogOpen(true)}
        >
          Recurring Bills ({recurringBills.length})
        </Button>
      </Box>

      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bills..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "pending", name: "Pending" },
              { id: "approved", name: "Approved" },
              { id: "paid", name: "Paid" },
              { id: "overdue", name: "Overdue" },
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) => setStatusFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All")
          }
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { value: "receiveDate", label: "Receive Date" },
          { value: "dueDate", label: "Due Date" },
          { value: "amount", label: "Amount" },
          { value: "supplier", label: "Supplier" },
          { value: "status", label: "Status" }
        ]}
        sortValue="receiveDate"
        sortDirection="desc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={handleOpenCreateModal}
        createButtonLabel="Add Bill"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit purchases data."
        additionalControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant={activeTab === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(0)}
              sx={
                activeTab === 0
                  ? { 
                      bgcolor: themeConfig.brandColors.offWhite,
                      color: themeConfig.brandColors.navy,
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: themeConfig.brandColors.offWhite,
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                      "&:hover": { borderColor: themeConfig.brandColors.offWhite, bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Bills
            </Button>
            <Button
              variant={activeTab === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(1)}
              sx={
                activeTab === 1
                  ? { 
                      bgcolor: themeConfig.brandColors.offWhite,
                      color: themeConfig.brandColors.navy,
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: themeConfig.brandColors.offWhite,
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5),
                      "&:hover": { borderColor: themeConfig.brandColors.offWhite, bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Purchase Orders
            </Button>
          </Box>
        }
      />

      <StatsSection
        stats={[
          { value: `£${totalOutstanding.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Total Outstanding", color: "warning" },
          { value: bills.length.toString(), label: "Total Bills", color: "primary" },
          { value: overdueBills.length.toString(), label: "Overdue", color: "error" },
          { value: `£${bills.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + (bill.totalAmount || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Paid This Month", color: "success" },
        ]}
      />

      <TabPanel value={activeTab} index={0}>
        <Box sx={{ px: 3 }}>
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bill #</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell align="right">Balance Due</TableCell>
                      <TableCell>Receive Date</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBills.map((bill) => {
                      const balanceDue = bill.balance_due || bill.balanceDue || bill.totalAmount || 0
                      const isOverdue = new Date(bill.dueDate) < new Date() && bill.status !== "paid" && balanceDue > 0
                      return (
                        <TableRow
                          key={bill.id}
                          hover
                          sx={isOverdue ? { bgcolor: 'error.light', opacity: 0.7 } : {}}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{bill.billNumber || bill.reference}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: themeConfig.brandColors.navy }}>
                                {bill.supplierName?.charAt(0) || "?"}
                              </Avatar>
                              {bill.supplierName}
                            </Box>
                          </TableCell>
                          <TableCell>{bill.description || "No description"}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                            {bill.currency} {(bill.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ 
                            fontWeight: balanceDue > 0 ? 600 : 400, 
                            color: balanceDue > 0 ? (isOverdue ? "error.main" : "warning.main") : "success.main" 
                          }}>
                            {bill.currency} {balanceDue.toFixed(2)}
                          </TableCell>
                          <TableCell>{bill.receiveDate}</TableCell>
                          <TableCell>
                            <Box>
                              {bill.dueDate}
                              {isOverdue && (
                                <Chip label="Overdue" size="small" color="error" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={bill.status}
                              size="small"
                              color={
                                bill.status === "paid"
                                  ? "success"
                                  : bill.status === "approved"
                                  ? "primary"
                                  : bill.status === "pending"
                                  ? "warning"
                                  : "error"
                              }
                            />
                            {bill.recurringSchedule?.isActive && (
                              <Chip label="Recurring" size="small" sx={{ ml: 0.5 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton onClick={(e) => handleMenuClick(e, bill)}>
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {filteredBills.length === 0 && (
            <EmptyStateCard
              icon={ShoppingCart}
              title={hasActiveFilters ? "No bills match your current filters" : "No bills found"}
              description={
                hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first bill to get started."
              }
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ px: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: "center", py: 8 }}>
                <ShoppingCart sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  No Purchase Orders Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create purchase orders to track inventory purchases
                </Typography>
                <Button variant="contained" startIcon={<Add />} color="primary">
                  Create Purchase Order
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* Bill CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingBill(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bill",
          crudMode,
          id: editingBill?.id,
          itemLabel: editingBill?.reference || editingBill?.billNumber || undefined,
        }}
        title={crudMode === "create" ? "Create Bill" : crudMode === "edit" ? "Edit Bill" : "View Bill"}
        icon={<Receipt />}
        mode={crudMode}
        maxWidth="lg"
      >
        <BillCRUDForm
          bill={editingBill}
          mode={crudMode}
          onSave={handleSaveBill}
        />
      </CRUDModal>

      {/* View Bill Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: themeConfig.brandColors.navy }}>
                <Receipt />
              </Avatar>
              <Box>
                <Typography variant="h6">Bill {viewingBill?.billNumber || viewingBill?.reference}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingBill?.supplierName}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                label={viewingBill?.status}
                color={
                  viewingBill?.status === "paid"
                    ? "success"
                    : viewingBill?.status === "approved"
                    ? "primary"
                    : viewingBill?.status === "pending"
                    ? "warning"
                    : "error"
                }
              />
              <IconButton onClick={() => setIsViewDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewingBill && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Bill Details</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Bill Number</Typography>
                <Typography variant="body1" fontWeight="medium">{viewingBill.billNumber || viewingBill.reference}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Supplier</Typography>
                <Typography variant="body1" fontWeight="medium">{viewingBill.supplierName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Receive Date</Typography>
                <Typography variant="body1">{viewingBill.receiveDate}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                <Typography variant="body1">{viewingBill.dueDate}</Typography>
              </Grid>
              {viewingBill.purchaseOrderNumber && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Purchase Order #</Typography>
                  <Typography variant="body1">{viewingBill.purchaseOrderNumber}</Typography>
                </Grid>
              )}
              {viewingBill.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{viewingBill.description}</Typography>
                </Grid>
              )}

              {viewingBill.lineItems && viewingBill.lineItems.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Line Items</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Unit Price</TableCell>
                            <TableCell align="right">Tax Rate</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {viewingBill.lineItems.map((item, index) => (
                            <TableRow key={item.id || index}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">{viewingBill.currency} {item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.taxRate}%</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 500 }}>
                                {viewingBill.currency} {item.lineTotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewingBill.currency} {viewingBill.subtotal.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Tax Amount</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewingBill.currency} {viewingBill.taxAmount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                  {viewingBill.currency} {viewingBill.totalAmount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Balance Due</Typography>
                <Typography variant="h6" fontWeight="bold" color={(viewingBill.balance_due || viewingBill.balanceDue || 0) > 0 ? "error.main" : "success.main"}>
                  {viewingBill.currency} {(viewingBill.balance_due || viewingBill.balanceDue || viewingBill.totalAmount || 0).toFixed(2)}
                </Typography>
              </Grid>
              {viewingBill.overpaymentAmount && viewingBill.overpaymentAmount > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Overpayment: {viewingBill.currency} {viewingBill.overpaymentAmount.toFixed(2)}
                  </Alert>
                </Grid>
              )}
              {viewingBill.recurringSchedule?.isActive && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Recurring Bill - {viewingBill.recurringSchedule.frequency} (Next: {viewingBill.recurringSchedule.nextDate})
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => {
              // Print functionality
            }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {
              // Download PDF functionality
            }}
          >
            Download PDF
          </Button>
          {viewingBill && viewingBill.status !== "paid" && (
            <Button
              variant="contained"
              onClick={() => {
                setIsViewDialogOpen(false)
                handleOpenEditModal(viewingBill)
              }}
            >
              Edit Bill
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pay Bill</DialogTitle>
        <DialogContent>
          {selectedBill && (() => {
            const balanceDue = selectedBill.balance_due || selectedBill.balanceDue || selectedBill.totalAmount
            const isOverpayment = paymentAmount > balanceDue
            
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Bill: {selectedBill.billNumber || selectedBill.reference} - Balance Due: {selectedBill.currency} {balanceDue.toFixed(2)}
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Payment Amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">{selectedBill.currency}</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="online">Online</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Bank Account</InputLabel>
                    <Select value={paymentBankAccountId} onChange={(e) => setPaymentBankAccountId(e.target.value)}>
                      {financeState.bankAccounts.map((bank) => (
                        <MenuItem key={bank.id} value={bank.id}>
                          {bank.name} - {bank.accountNumber}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Payment reference number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity={isOverpayment ? "warning" : paymentAmount < balanceDue ? "info" : "success"}>
                    {isOverpayment
                      ? `Overpayment detected. Excess: ${selectedBill.currency} ${(paymentAmount - balanceDue).toFixed(2)} will be stored as prepayment.`
                      : paymentAmount < balanceDue
                      ? `Partial payment. Remaining balance: ${selectedBill.currency} ${(balanceDue - paymentAmount).toFixed(2)}`
                      : "Full payment. Bill will be marked as paid."}
                  </Alert>
                </Grid>
              </Grid>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyPayment}
            disabled={!selectedBill || !paymentBankAccountId || paymentAmount <= 0}
          >
            Apply Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={isCreditNoteDialogOpen} onClose={() => setIsCreditNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Supplier Credit Note</DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Alert severity="info">
                  Bill: {selectedBill.billNumber || selectedBill.reference} - Balance Due: {selectedBill.currency} {(selectedBill.balance_due || selectedBill.balanceDue || selectedBill.totalAmount || 0).toFixed(2)}
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Credit Amount"
                  type="number"
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01, max: selectedBill.balance_due || selectedBill.balanceDue || selectedBill.totalAmount }}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{selectedBill.currency}</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Credit"
                  multiline
                  rows={3}
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  placeholder="e.g., Returned goods, Discount, Error correction"
                  required
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreditNoteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyCreditNote}
            disabled={!selectedBill || creditNoteAmount <= 0 || !creditNoteReason}
          >
            Apply Credit
          </Button>
        </DialogActions>
      </Dialog>

      {/* AP Aging Report Dialog */}
      <Dialog open={isAPAgingDialogOpen} onClose={() => setIsAPAgingDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Aged Payables Report</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">1-30 Days</TableCell>
                  <TableCell align="right">31-60 Days</TableCell>
                  <TableCell align="right">61-90 Days</TableCell>
                  <TableCell align="right">Over 90 Days</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const supplierAging: Record<string, { current: number; days30: number; days60: number; days90: number; over90: number }> = {}
                  
                  filteredBills.forEach((bill) => {
                    if (bill.status === "paid") return
                    const aging = calculateAPAging(bill)
                    if (!supplierAging[bill.supplierId]) {
                      supplierAging[bill.supplierId] = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
                    }
                    supplierAging[bill.supplierId].current += aging.current
                    supplierAging[bill.supplierId].days30 += aging.days30
                    supplierAging[bill.supplierId].days60 += aging.days60
                    supplierAging[bill.supplierId].days90 += aging.days90
                    supplierAging[bill.supplierId].over90 += aging.over90
                  })
                  
                  return Object.entries(supplierAging).map(([supplierId, aging]) => {
                    const supplier = financeState.contacts.find((c) => c.id === supplierId)
                    const total = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.over90
                    if (total === 0) return null
                    return (
                      <TableRow key={supplierId}>
                        <TableCell>{supplier?.name || supplierId}</TableCell>
                        <TableCell align="right">£{aging.current.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days30.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days60.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days90.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.over90.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>£{total.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  }).filter(Boolean)
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAPAgingDialogOpen(false)}>Close</Button>
          <Button startIcon={<Download />} onClick={() => {}}>Export CSV</Button>
        </DialogActions>
      </Dialog>

      {/* Recurring Bills Dialog */}
      <Dialog open={isRecurringBillsDialogOpen} onClose={() => setIsRecurringBillsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recurring Bills</DialogTitle>
        <DialogContent>
          {recurringBills.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No recurring bills configured</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bill</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Next Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recurringBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.billNumber || bill.reference}</TableCell>
                      <TableCell>{bill.supplierName}</TableCell>
                      <TableCell>{bill.recurringSchedule?.frequency}</TableCell>
                      <TableCell>{bill.recurringSchedule?.nextDate}</TableCell>
                      <TableCell>{bill.currency} {bill.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip label={bill.recurringSchedule?.isActive ? "Active" : "Inactive"} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRecurringBillsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bill Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedBill && handleOpenViewDialog(selectedBill)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" /> View Details
        </MenuItem>
        <MenuItem onClick={() => selectedBill && handleOpenEditModal(selectedBill)} disabled={!canMutate}>
          <Edit sx={{ mr: 1 }} fontSize="small" /> Edit
        </MenuItem>
        {selectedBill?.status === "pending" && (
          <MenuItem onClick={() => selectedBill && handleApproveBillAction(selectedBill)} disabled={!canMutate}>
            <CheckCircle sx={{ mr: 1 }} fontSize="small" /> Approve
          </MenuItem>
        )}
        {(selectedBill?.status === "pending" || selectedBill?.status === "approved") && (
          <>
            <MenuItem onClick={() => selectedBill && handleOpenPaymentDialog(selectedBill)} disabled={!canMutate}>
              <Payment sx={{ mr: 1 }} fontSize="small" /> Pay Bill
            </MenuItem>
            <MenuItem onClick={() => selectedBill && handleOpenCreditNoteDialog(selectedBill)} disabled={!canMutate}>
              <CreditCard sx={{ mr: 1 }} fontSize="small" /> Apply Credit
            </MenuItem>
            <MenuItem onClick={() => selectedBill && handleMarkAsPaidAction(selectedBill)} disabled={!canMutate}>
              <CheckCircle sx={{ mr: 1 }} fontSize="small" /> Mark as Paid
            </MenuItem>
          </>
        )}
        <Divider />
        <MenuItem onClick={() => selectedBill && handleDeleteBillAction(selectedBill)} sx={{ color: "error.main" }} disabled={!canRemove}>
          <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Purchases
