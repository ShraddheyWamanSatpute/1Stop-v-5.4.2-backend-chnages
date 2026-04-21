"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useCallback, useState, useEffect } from "react"
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
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from "@mui/material"
import {
  MoreVert,
  Receipt,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  Visibility,
  CloudUpload,
  AccountBalance,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import ExpenseForm from "../../components/finance/forms/ExpenseForm"
import type { Expense } from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

const Expenses: React.FC = () => {
  const {
    state: financeState,
    refreshAll,
    refreshExpenses,
    refreshAccounts,
    refreshTaxRates,
    refreshContacts,
    refreshPayments,
    refreshTransactions,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    reimburseExpense,
  } = useFinance()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "expenses")
  const canRemove = canDelete("finance", "expenses")

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reimburseDialogOpen, setReimburseDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [reimbursementAmount, setReimbursementAmount] = useState(0)
  const [reimbursementDate, setReimbursementDate] = useState(new Date().toISOString().split("T")[0])
  const [reimbursementMethod, setReimbursementMethod] = useState<"bank_transfer" | "cash" | "cheque">("bank_transfer")
  const [reimbursementBankAccountId, setReimbursementBankAccountId] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const clearCrudParams = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // Date management
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateType, setDateType] = useState<"day" | "week" | "month" | "custom">("month")

  const [expenseForm, setExpenseForm] = useState({
    employee: "",
    description: "",
    amount: 0,
    category: "",
    department: "",
    submitDate: new Date().toISOString().split("T")[0],
    receiptAttached: false,
    status: "pending" as "pending" | "approved" | "reimbursed" | "rejected",
  })

  // Expense categories
  const categories = [
    "Food & Beverage Supplies",
    "Utilities",
    "Fuel",
    "Maintenance",
    "Marketing",
    "Travel",
    "Office Supplies",
    "Equipment",
    "Professional Services",
    "Other",
  ]

  const departments = ["Rooms", "Restaurant", "Bar", "Kitchen", "Housekeeping", "Front Desk", "Management", "Other"]

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.expenses.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.expenses.length, financeState.loading, loadData])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create") return
    if (entity === "expense") {
      setCreateDialogOpen(true)
    }
  }, [searchParams])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, expenseId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedExpense(expenseId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const resetForm = () => {
    setExpenseForm({
      employee: "",
      description: "",
      amount: 0,
      category: "",
      department: "",
      submitDate: new Date().toISOString().split("T")[0],
      receiptAttached: false,
      status: "pending",
    })
  }

  // CREATE
  const handleCreateExpense = async (expenseData: Partial<Expense>) => {
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(expenseData).filter(([_, v]) => v !== undefined)
      )
      
      await createExpense({
        ...cleanData,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Expense)
      removeWorkspaceFormDraft(location.pathname, { crudEntity: "expense", crudMode: "create" })
      setCreateDialogOpen(false)
      clearCrudParams()
      await refreshExpenses()
    } catch (error) {
      // Error creating expense - handled by context
      alert("Failed to create expense. Please try again.")
    }
  }

  // EDIT
  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense.id)
    setEditDialogOpen(true)
  }

  const handleEditExpense = async (expenseData: Partial<Expense>) => {
    if (!selectedExpense) return
    const expenseIdSnapshot = selectedExpense
    const expenseRow = financeState.expenses.find((e) => e.id === selectedExpense)

    try {
      // Filter out undefined values and include id
      const cleanData = Object.fromEntries(
        Object.entries(expenseData).filter(([_, v]) => v !== undefined)
      )
      
      await updateExpense(selectedExpense, {
        ...cleanData,
        id: selectedExpense,
        updatedAt: new Date().toISOString(),
      })
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "expense",
        crudMode: "edit",
        id: expenseIdSnapshot,
        itemLabel: expenseRow?.description || expenseIdSnapshot,
      })
      setEditDialogOpen(false)
      setSelectedExpense(null)
      await refreshExpenses()
      handleMenuClose()
    } catch (error) {
      // Error updating expense - handled by context
      alert("Failed to update expense. Please try again.")
    }
  }

  // DELETE
  const openDeleteDialog = () => {
    if (!canRemove) return
    setDeleteDialogOpen(true)
  }

  const handleDeleteExpense = async () => {
    if (!canRemove) return
    if (!selectedExpense) return

    try {
      await deleteExpense(selectedExpense)
      setDeleteDialogOpen(false)
      await refreshExpenses()
      handleMenuClose()
    } catch (error) {
      // Error deleting expense - handled by context
    }
  }

  // VIEW
  const openViewDialog = (expenseId: string) => {
    setSelectedExpense(expenseId)
    setViewDialogOpen(true)
  }

  // Approval actions
  const handleApproveExpense = async (expenseId: string) => {
    try {
      await approveExpense(expenseId)
      await Promise.all([refreshExpenses(), refreshTransactions()])
      handleMenuClose()
    } catch (error) {
      // Error approving expense - handled by context
      alert("Failed to approve expense. Please try again.")
    }
  }

  const handleRejectExpense = async (expenseId: string, reason: string) => {
    if (!reason || reason.trim() === "") {
      alert("Please provide a reason for rejection")
      return
    }
    try {
      await rejectExpense(expenseId, reason)
      await refreshExpenses()
      setRejectDialogOpen(false)
      setRejectionReason("")
      handleMenuClose()
    } catch (error) {
      // Error rejecting expense - handled by context
      alert("Failed to reject expense. Please try again.")
    }
  }

  const handleReimburseExpense = async (expenseId: string) => {
    try {
      const expense = financeState.expenses.find((e) => e.id === expenseId)
      if (!expense) {
        alert("Expense not found")
        return
      }

      if (!reimbursementBankAccountId && reimbursementMethod === "bank_transfer") {
        alert("Please select a bank account for reimbursement")
        return
      }

      await reimburseExpense(expenseId, {
        amount: reimbursementAmount || expense.amount,
        date: reimbursementDate,
        method: reimbursementMethod,
        bankAccountId: reimbursementBankAccountId,
      })
      
      setReimburseDialogOpen(false)
      setReimbursementAmount(0)
      setReimbursementBankAccountId("")
      await Promise.all([refreshExpenses(), refreshPayments(), refreshTransactions()])
      handleMenuClose()
    } catch (error) {
      // Error reimbursing expense - handled by context
      alert("Failed to reimburse expense. Please try again.")
    }
  }

  // Date filtering helper
  const isDateInRange = (date: string) => {
    const expenseDate = new Date(date)

    switch (dateType) {
      case "day":
        return expenseDate.toDateString() === currentDate.toDateString()
      case "week":
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return expenseDate >= weekStart && expenseDate <= weekEnd
      case "month":
        return (
          expenseDate.getMonth() === currentDate.getMonth() && expenseDate.getFullYear() === currentDate.getFullYear()
        )
      case "custom":
        return true
      default:
        return true
    }
  }

  const filteredExpenses = financeState.expenses.filter((expense) => {
    const matchesSearch =
      expense.employee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "All" || expense.status === statusFilter.toLowerCase()
    const matchesCategory = categoryFilter === "All" || expense.category === categoryFilter
    const matchesDate = isDateInRange(expense.submitDate)
    return matchesSearch && matchesStatus && matchesCategory && matchesDate
  })

  const pendingExpenses = filteredExpenses.filter((e) => e.status === "pending")
  const approvedExpenses = filteredExpenses.filter((e) => e.status === "approved")
  const reimbursedExpenses = filteredExpenses.filter((e) => e.status === "reimbursed")
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "All" || categoryFilter !== "All"

  const viewExpense = selectedExpense ? financeState.expenses.find((e) => e.id === selectedExpense) : null

  return (
    <Box sx={{ p: 0 }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}

      <DataHeader
        onRefresh={loadData}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        showDateControls={true}
        showDateTypeSelector={true}
        availableDateTypes={["day", "week", "month", "custom"]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search expenses..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "pending", name: "Pending" },
              { id: "approved", name: "Approved" },
              { id: "reimbursed", name: "Reimbursed" },
              { id: "rejected", name: "Rejected" },
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) =>
              setStatusFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All"),
          },
          {
            label: "Category",
            options: [{ id: "all", name: "All" }, ...categories.map((c) => ({ id: c, name: c }))],
            selectedValues: categoryFilter !== "All" ? [categoryFilter] : ["all"],
            onSelectionChange: (values) => setCategoryFilter(values[0] || "All"),
          },
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { value: "submitDate", label: "Submit Date" },
          { value: "amount", label: "Amount" },
          { value: "employee", label: "Employee" },
          { value: "category", label: "Category" },
        ]}
        sortValue="submitDate"
        sortDirection="desc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={() => setCreateDialogOpen(true)}
        createButtonLabel="Submit Expense"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit expenses."
      />

      <StatsSection
        stats={[
          { value: `£${totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Total Expenses", color: "primary" },
          { value: `${pendingExpenses.length} (£${pendingAmount.toLocaleString('en-GB')})`, label: "Pending Approval", color: "warning" },
          { value: approvedExpenses.length.toString(), label: "Approved", color: "success" },
          { value: reimbursedExpenses.length.toString(), label: "Reimbursed", color: "info" },
        ]}
      />

        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Tax</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Submit Date</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: themeConfig.brandColors.navy }}>
                            {expense.employee?.charAt(0) || "?"}
                          </Avatar>
                          {expense.employee}
                        </Box>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Chip label={expense.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>£{expense.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {expense.is_taxable !== false && expense.tax_amount ? (
                          <Typography variant="body2">£{expense.tax_amount.toFixed(2)}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.payment_method === "company_card" ? "Company Card" : expense.payment_method || "Card"}
                          size="small"
                          variant="outlined"
                          color={expense.payment_method === "company_card" ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>{expense.submitDate}</TableCell>
                      <TableCell>
                        {expense.receiptAttached || (expense.receipt_urls && expense.receipt_urls.length > 0) ? (
                          <Chip label={`${expense.receipt_urls?.length || 1} receipt(s)`} size="small" color="success" />
                        ) : (
                          <Chip label="No" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status}
                          size="small"
                          color={
                            expense.status === "approved"
                              ? "success"
                              : expense.status === "pending"
                              ? "warning"
                              : expense.status === "reimbursed"
                              ? "info"
                              : "error"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleMenuClick(e, expense.id)}>
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {filteredExpenses.length === 0 && (
          <EmptyStateCard
            icon={Receipt}
            title={hasActiveFilters ? "No expenses match your current filters" : "No expenses found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first expense to get started."
            }
          />
        )}

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedExpense) openViewDialog(selectedExpense)
            handleMenuClose()
          }}
        >
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const expense = financeState.expenses.find((e) => e.id === selectedExpense)
            if (expense) openEditDialog(expense)
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedExpense) handleApproveExpense(selectedExpense)
          }}
          disabled={!canMutate}
        >
          <CheckCircle sx={{ mr: 1 }} color="success" /> Approve
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedExpense) {
              const expense = financeState.expenses.find((e) => e.id === selectedExpense)
              if (expense) {
                setReimbursementAmount(expense.amount)
                if (financeState.bankAccounts.length > 0) {
                  setReimbursementBankAccountId(financeState.bankAccounts[0].id)
                }
              }
              setReimburseDialogOpen(true)
            }
            handleMenuClose()
          }}
          disabled={!canMutate || financeState.expenses.find((e) => e.id === selectedExpense)?.status !== "approved"}
        >
          <AccountBalance sx={{ mr: 1 }} color="info" /> Reimburse
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedExpense) {
              setRejectDialogOpen(true)
            }
            handleMenuClose()
          }}
          sx={{ color: "error.main" }}
          disabled={!canMutate}
        >
          <Cancel sx={{ mr: 1 }} /> Reject
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (!canRemove) return
            openDeleteDialog()
          }}
          sx={{ color: "error.main" }}
          disabled={!canRemove}
        >
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* CREATE Modal */}
      <CRUDModal
        open={createDialogOpen}
        onClose={(reason) => {
          setCreateDialogOpen(false)
          if (
            isCrudModalHardDismiss(reason) &&
            searchParams.get("crudEntity") === "expense" &&
            searchParams.get("crudMode") === "create"
          ) {
            clearCrudParams()
          }
        }}
        workspaceFormShortcut={{ crudEntity: "expense", crudMode: "create" }}
        title="Submit New Expense"
        icon={<Receipt />}
        mode="create"
        onSave={() => {}} // Handled by ExpenseForm
        saveButtonText="Submit Expense"
        maxWidth="lg"
        hideSaveButton
      >
        <ExpenseForm
          mode="create"
          onSave={handleCreateExpense}
          onCancel={() => {
            setCreateDialogOpen(false)
            if (searchParams.get("crudEntity") === "expense" && searchParams.get("crudMode") === "create") {
              clearCrudParams()
            }
          }}
        />
      </CRUDModal>

      {/* EDIT Modal */}
      <CRUDModal
        open={editDialogOpen}
        onClose={(reason) => {
          setEditDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setSelectedExpense(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "expense",
          crudMode: "edit",
          id: selectedExpense || undefined,
          itemLabel:
            (selectedExpense &&
              financeState.expenses.find((e) => e.id === selectedExpense)?.description) ||
            selectedExpense ||
            undefined,
        }}
        title="Edit Expense"
        icon={<Edit />}
        mode="edit"
        onSave={() => {}} // Handled by ExpenseForm
        saveButtonText="Save Changes"
        maxWidth="lg"
        hideSaveButton
      >
        {selectedExpense && (
          <ExpenseForm
            expense={financeState.expenses.find((e) => e.id === selectedExpense) || null}
            mode="edit"
            onSave={handleEditExpense}
            onCancel={() => {
              setEditDialogOpen(false)
              setSelectedExpense(null)
            }}
          />
        )}
      </CRUDModal>

      {/* VIEW Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: themeConfig.brandColors.navy }}>
                <Receipt />
              </Avatar>
              <Box>
                <Typography variant="h6">Expense Details</Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewExpense?.employee}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={viewExpense?.status}
              color={
                viewExpense?.status === "approved"
                  ? "success"
                  : viewExpense?.status === "pending"
                  ? "warning"
                  : viewExpense?.status === "reimbursed"
                  ? "info"
                  : "error"
              }
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Expense Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Employee" secondary={viewExpense?.employee} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Description" secondary={viewExpense?.description} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Category" secondary={viewExpense?.category} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Department" secondary={viewExpense?.department} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Submit Date" secondary={viewExpense?.submitDate} />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Receipt Attached"
                        secondary={viewExpense?.receiptAttached ? "Yes" : "No"}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Amount
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                    £{viewExpense?.amount?.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {viewExpense?.status === "pending" && (
            <>
              <Button
                variant="outlined"
                color="success"
                onClick={() => {
                  if (selectedExpense) handleApproveExpense(selectedExpense)
                  setViewDialogOpen(false)
                }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setRejectDialogOpen(true)
                  setViewDialogOpen(false)
                }}
              >
                Reject
              </Button>
            </>
          )}
          {viewExpense?.status === "approved" && (
              <Button
                variant="contained"
                onClick={() => {
                  if (selectedExpense) {
                    const expense = financeState.expenses.find((e) => e.id === selectedExpense)
                    if (expense) {
                      setReimbursementAmount(expense.amount)
                      if (financeState.bankAccounts.length > 0) {
                        setReimbursementBankAccountId(financeState.bankAccounts[0].id)
                      }
                    }
                    setReimburseDialogOpen(true)
                  }
                  setViewDialogOpen(false)
                }}
              >
                Reimburse
              </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DELETE Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Expense?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>Are you sure you want to delete this expense claim?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteExpense} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reimbursement Dialog */}
      <Dialog open={reimburseDialogOpen} onClose={() => {
        setReimburseDialogOpen(false)
        setReimbursementAmount(0)
        setReimbursementBankAccountId("")
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Reimburse Expense</DialogTitle>
        <DialogContent>
          {selectedExpense && (() => {
            const expense = financeState.expenses.find((e) => e.id === selectedExpense)
            if (!expense) return null

            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Expense: {expense.description} - Amount: £{expense.amount.toFixed(2)}
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reimbursement Amount"
                    type="number"
                    value={reimbursementAmount}
                    onChange={(e) => setReimbursementAmount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01, max: expense.amount }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reimbursement Date"
                    type="date"
                    value={reimbursementDate}
                    onChange={(e) => setReimbursementDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={reimbursementMethod}
                      onChange={(e) => {
                        setReimbursementMethod(e.target.value as "bank_transfer" | "cash" | "cheque")
                        if (e.target.value !== "bank_transfer") {
                          setReimbursementBankAccountId("")
                        }
                      }}
                    >
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {reimbursementMethod === "bank_transfer" && (
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel>Bank Account</InputLabel>
                      <Select
                        value={reimbursementBankAccountId}
                        onChange={(e) => setReimbursementBankAccountId(e.target.value)}
                      >
                        {financeState.bankAccounts.map((bank) => (
                          <MenuItem key={bank.id} value={bank.id}>
                            {bank.name} - {bank.accountNumber}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setReimburseDialogOpen(false)
            setReimbursementAmount(0)
            setReimbursementBankAccountId("")
          }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedExpense) {
                handleReimburseExpense(selectedExpense)
              }
            }}
            disabled={!selectedExpense || (reimbursementMethod === "bank_transfer" && !reimbursementBankAccountId)}
          >
            Process Reimbursement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => {
        setRejectDialogOpen(false)
        setRejectionReason("")
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Alert severity="warning">
                Please provide a reason for rejecting this expense claim.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rejection Reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                multiline
                rows={4}
                placeholder="e.g., Receipt missing, Amount incorrect, Not business-related..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRejectDialogOpen(false)
            setRejectionReason("")
          }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedExpense) {
                handleRejectExpense(selectedExpense, rejectionReason)
              }
            }}
            disabled={!selectedExpense || !rejectionReason || rejectionReason.trim() === ""}
          >
            Reject Expense
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Expenses
