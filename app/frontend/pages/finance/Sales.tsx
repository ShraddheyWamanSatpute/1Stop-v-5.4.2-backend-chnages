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
  Send,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Email,
  Print,
  Download,
  Payment,
  CreditCard,
  Assessment,
  Description,
  Repeat,
  Block,
  ReceiptLong,
  Tabs,
  Tab,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import InvoiceForm from "../../components/finance/forms/InvoiceForm"
import CreditNoteForm from "../../components/finance/forms/CreditNoteForm"
import type { Invoice, CreditNote } from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"
const Sales: React.FC = () => {
  const {
    state: financeState,
    refreshAll,
    refreshInvoices,
    refreshContacts,
    refreshPayments,
    refreshCreditNotes,
    refreshAccounts,
    refreshTaxRates,
    refreshCurrencies,
    createInvoice: addInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    approveInvoice,
    voidInvoice,
    createPayment,
    createCreditNote,
    updateCreditNote,
  } = useFinance()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "sales")
  const canRemove = canDelete("finance", "sales")

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false)
  const [arAgingDialogOpen, setArAgingDialogOpen] = useState(false)
  const [statementDialogOpen, setStatementDialogOpen] = useState(false)
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentBankAccountId, setPaymentBankAccountId] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [writeOffDialogOpen, setWriteOffDialogOpen] = useState(false)
  const [applyCreditDialogOpen, setApplyCreditDialogOpen] = useState(false)
  const [selectedCreditNote, setSelectedCreditNote] = useState<string | null>(null)
  const [statementCustomerId, setStatementCustomerId] = useState("")
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split("T")[0])
  const [refundMethod, setRefundMethod] = useState("bank_transfer")
  const [refundBankAccountId, setRefundBankAccountId] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [writeOffAmount, setWriteOffAmount] = useState(0)
  const [writeOffDate, setWriteOffDate] = useState(new Date().toISOString().split("T")[0])
  const [writeOffReason, setWriteOffReason] = useState("")
  const [writeOffAccountId, setWriteOffAccountId] = useState("")

  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const clearCrudParams = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create") return

    if (entity === "invoice") {
      setCreateDialogOpen(true)
    } else if (entity === "quote") {
      setQuoteDialogOpen(true)
    }
  }, [searchParams])

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    customerId: "",
    customerName: "",
    description: "",
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    dueDate: "",
    issueDate: new Date().toISOString().split("T")[0],
    paymentTerms: 30,
    notes: "",
    status: "draft" as "draft" | "sent" | "paid" | "overdue" | "cancelled",
  })

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.invoices.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.invoices.length, financeState.loading, loadData])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, invoiceId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedInvoice(invoiceId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const resetForm = () => {
    setInvoiceForm({
      invoiceNumber: "",
      customerId: "",
      customerName: "",
      description: "",
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      dueDate: "",
      issueDate: new Date().toISOString().split("T")[0],
      paymentTerms: 30,
      notes: "",
      status: "draft",
    })
  }

  // CREATE
  const handleCreateInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(invoiceData).filter(([_, v]) => v !== undefined)
      )
      
      // Ensure balance_due is set if not provided
      const balance_due = cleanData.balance_due !== undefined 
        ? cleanData.balance_due 
        : (cleanData.balanceDue !== undefined 
            ? cleanData.balanceDue 
            : (cleanData.totalAmount || 0))

      await addInvoice({
        ...cleanData,
        invoiceNumber: cleanData.invoiceNumber || undefined, // Will be auto-generated by backend
        balance_due,
        balanceDue: balance_due,
        remindersSent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Invoice)

      removeWorkspaceFormDraft(location.pathname, { crudEntity: "invoice", crudMode: "create" })
      setCreateDialogOpen(false)
      clearCrudParams()
      await refreshInvoices()
    } catch (error) {
      // Error creating invoice - handled by context
      alert("Failed to create invoice. Please try again.")
    }
  }

  // EDIT
  const openEditDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice.id)
    setEditDialogOpen(true)
  }

  const handleEditInvoice = async (invoiceData: Partial<Invoice>) => {
    if (!selectedInvoice) return
    const invoiceIdSnapshot = selectedInvoice
    const invoiceRow = financeState.invoices.find((inv) => inv.id === selectedInvoice)

    try {
      // Filter out undefined values and include id
      const cleanData = Object.fromEntries(
        Object.entries(invoiceData).filter(([_, v]) => v !== undefined)
      )
      
      await updateInvoice(selectedInvoice, {
        ...cleanData,
        id: selectedInvoice,
        updatedAt: new Date().toISOString(),
      })

      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "invoice",
        crudMode: "edit",
        id: invoiceIdSnapshot,
        itemLabel: invoiceRow?.invoiceNumber || invoiceRow?.customerName || invoiceIdSnapshot,
      })
      setEditDialogOpen(false)
      setSelectedInvoice(null)
      await refreshInvoices()
      handleMenuClose()
    } catch (error) {
      // Error updating invoice - handled by context
    }
  }

  // DELETE
  const openDeleteDialog = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      await deleteInvoice(selectedInvoice)
      setDeleteDialogOpen(false)
      await refreshInvoices()
      handleMenuClose()
    } catch (error) {
      // Error deleting invoice - handled by context
    }
  }

  // VIEW
  const openViewDialog = (invoiceId: string) => {
    setSelectedInvoice(invoiceId)
    setViewDialogOpen(true)
  }

  // Other actions
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await sendInvoice(invoiceId)
      await refreshInvoices()
      handleMenuClose()
    } catch (error) {
      // Error sending invoice - handled by context
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await updateInvoice(invoiceId, {
        id: invoiceId,
        status: "paid",
        paidDate: new Date().toISOString().split("T")[0],
        balance_due: 0,
        balanceDue: 0,
      })
      await refreshInvoices()
      handleMenuClose()
    } catch (error) {
      // Error marking invoice as paid - handled by context
    }
  }

  // Payment Application
  const handleApplyPayment = async (paymentData: {
    invoiceId: string
    amount: number
    paymentDate: string
    paymentMethod: string
    bankAccountId: string
    reference?: string
  }) => {
    try {
      const invoice = financeState.invoices.find((inv) => inv.id === paymentData.invoiceId)
      if (!invoice) {
        alert("Invoice not found")
        return
      }

      if (paymentData.amount <= 0) {
        alert("Payment amount must be greater than zero")
        return
      }

      if (!paymentData.bankAccountId) {
        alert("Please select a bank account")
        return
      }

      const currentBalance = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
      const newBalance = Math.max(0, currentBalance - paymentData.amount)

      // Create payment record
      await createPayment({
        type: "customer_payment",
        amount: paymentData.amount,
        currency: invoice.currency,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod as any,
        bankAccountId: paymentData.bankAccountId,
        contactId: invoice.customerId,
        allocations: [
          {
            documentType: "invoice",
            documentId: paymentData.invoiceId,
            amount: paymentData.amount,
          },
        ],
        status: "completed",
        reference: paymentData.reference,
      } as any)

      // Update invoice
      await updateInvoice(paymentData.invoiceId, {
        balance_due: newBalance,
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : invoice.status,
        paidDate: newBalance === 0 ? paymentData.paymentDate : invoice.paidDate,
        updatedAt: new Date().toISOString(),
      })

      setPaymentDialogOpen(false)
      setPaymentReference("")
      await Promise.all([refreshInvoices(), refreshPayments()])
      handleMenuClose()
    } catch (error) {
      // Error applying payment - handled by context
      alert("Failed to apply payment. Please try again.")
    }
  }

  // Approve Invoice
  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      await approveInvoice(invoiceId)
      handleMenuClose()
    } catch (error) {
      // Error approving invoice - handled by context
      alert("Failed to approve invoice. Please try again.")
    }
  }

  // Void Invoice
  const handleVoidInvoice = async (invoiceId: string, reason: string) => {
    if (!reason || reason.trim() === "") {
      alert("Please provide a reason for voiding this invoice.")
      return
    }
    try {
      await voidInvoice(invoiceId, reason)
      handleMenuClose()
    } catch (error) {
      // Error voiding invoice - handled by context
      alert("Failed to void invoice. Please try again.")
    }
  }

  // Create Credit Note
  const handleCreateCreditNote = async (creditNoteData: Partial<CreditNote>) => {
    try {
      // Ensure balance_due is set if not provided
      const balance_due = creditNoteData.balance_due !== undefined 
        ? creditNoteData.balance_due 
        : (creditNoteData.balanceDue !== undefined 
            ? creditNoteData.balanceDue 
            : (creditNoteData.totalAmount || 0))

      await createCreditNote({
        ...creditNoteData,
        creditNoteNumber: creditNoteData.creditNoteNumber || undefined, // Will be auto-generated
        balance_due,
        balanceDue: balance_due,
        status: creditNoteData.status || "issued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CreditNote)
      
      setCreditNoteDialogOpen(false)
      setSelectedInvoice(null)
      await Promise.all([refreshCreditNotes(), refreshInvoices()])
    } catch (error) {
      // Error creating credit note - handled by context
      alert("Failed to create credit note. Please try again.")
    }
  }

  // Apply Credit Note to Invoice
  const handleApplyCreditNote = async (invoiceId: string, creditNoteId: string, amount: number) => {
    try {
      const creditNote = financeState.creditNotes.find((cn) => cn.id === creditNoteId)
      const invoice = financeState.invoices.find((inv) => inv.id === invoiceId)
      
      if (!creditNote || !invoice) return

      const currentCreditBalance = creditNote.balance_due || creditNote.balanceDue || creditNote.totalAmount
      const invoiceBalance = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
      
      const appliedAmount = Math.min(amount, currentCreditBalance, invoiceBalance)
      const newCreditBalance = currentCreditBalance - appliedAmount
      const newInvoiceBalance = invoiceBalance - appliedAmount

      // Update credit note
      const appliedInvoices = creditNote.appliedInvoices || []
      const existingApplication = appliedInvoices.find((app) => app.invoiceId === invoiceId)
      
      if (existingApplication) {
        existingApplication.appliedAmount += appliedAmount
      } else {
        appliedInvoices.push({ invoiceId, appliedAmount })
      }

      await updateCreditNote(creditNoteId, {
        balance_due: newCreditBalance,
        balanceDue: newCreditBalance,
        appliedInvoices,
        status: newCreditBalance === 0 ? "applied" : "partially_applied",
        updatedAt: new Date().toISOString(),
      })

      // Update invoice
      await updateInvoice(invoiceId, {
        balance_due: newInvoiceBalance,
        balanceDue: newInvoiceBalance,
        status: newInvoiceBalance === 0 ? "paid" : invoice.status,
        updatedAt: new Date().toISOString(),
      })

      setApplyCreditDialogOpen(false)
      await Promise.all([refreshCreditNotes(), refreshInvoices()])
    } catch (error) {
      // Error applying credit note - handled by context
    }
  }

  // Refund
  const handleRefund = async (invoiceId: string, refundData: {
    amount: number
    refundDate: string
    refundMethod: string
    bankAccountId: string
    reason: string
  }) => {
    try {
      const invoice = financeState.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice) return

      // Create credit note for refund
      await handleCreateCreditNote({
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        lineItems: invoice.lineItems.map((item) => ({
          ...item,
          quantity: -item.quantity, // Negative for refund
        })),
        subtotal: -refundData.amount,
        taxAmount: 0,
        totalAmount: -refundData.amount,
        currency: invoice.currency,
        issueDate: refundData.refundDate,
        reason: `Refund: ${refundData.reason}`,
        originalInvoiceId: invoiceId,
        status: "issued",
      })

      // Create payment record (negative amount for refund)
      await createPayment({
        type: "customer_payment",
        amount: -refundData.amount,
        currency: invoice.currency,
        paymentDate: refundData.refundDate,
        paymentMethod: refundData.refundMethod as any,
        bankAccountId: refundData.bankAccountId,
        contactId: invoice.customerId,
        allocations: [{
          documentType: "invoice",
          documentId: invoiceId,
          amount: refundData.amount,
        }],
        status: "completed",
        reference: `Refund for ${invoice.invoiceNumber}`,
      } as any)

      setRefundDialogOpen(false)
      await Promise.all([refreshPayments(), refreshCreditNotes(), refreshInvoices()])
    } catch (error) {
      // Error processing refund - handled by context
    }
  }

  // Write-off
  const handleWriteOff = async (invoiceId: string, writeOffData: {
    amount: number
    writeOffDate: string
    reason: string
    accountId: string
  }) => {
    try {
      const invoice = financeState.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice) return

      const currentBalance = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
      const writeOffAmount = Math.min(writeOffData.amount, currentBalance)
      const newBalance = currentBalance - writeOffAmount

      // Create credit note for write-off
      await handleCreateCreditNote({
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        lineItems: [{
          id: `writeoff_${Date.now()}`,
          description: `Write-off: ${writeOffData.reason}`,
          quantity: 1,
          unitPrice: -writeOffAmount,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: -writeOffAmount,
          accountId: writeOffData.accountId,
        }],
        subtotal: -writeOffAmount,
        taxAmount: 0,
        totalAmount: -writeOffAmount,
        currency: invoice.currency,
        issueDate: writeOffData.writeOffDate,
        reason: `Write-off: ${writeOffData.reason}`,
        originalInvoiceId: invoiceId,
        status: "applied",
      })

      // Update invoice
      await updateInvoice(invoiceId, {
        balance_due: newBalance,
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : invoice.status,
        updatedAt: new Date().toISOString(),
      })

      setWriteOffDialogOpen(false)
      await Promise.all([refreshCreditNotes(), refreshInvoices()])
    } catch (error) {
      // Error writing off invoice - handled by context
    }
  }

  // Date filtering helper (currently disabled - no date controls)
  const isDateInRange = (_date: string) => {
    return true // No date filtering when date controls are disabled
  }

  const filteredInvoices = financeState.invoices
    .filter((invoice) => {
      if (!invoice) return false
      if (statusFilter !== "All" && invoice.status !== statusFilter.toLowerCase()) {
        return false
      }
      if (
        searchTerm &&
        !invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(invoice.description || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(invoice.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }
      if (!isDateInRange(invoice.issueDate)) {
        return false
      }
      return true
    })
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())

  const overdueInvoices = filteredInvoices.filter((invoice) => invoice.status === "overdue").length
  const paidInvoices = filteredInvoices.filter((invoice) => invoice.status === "paid")
  const totalPaid = paidInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0)
  const outstandingAmount = filteredInvoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "void")
    .reduce((sum, inv) => sum + (inv.balance_due || inv.balanceDue || inv.totalAmount || 0), 0)
  
  // Calculate AR Aging
  const calculateAging = (invoice: Invoice) => {
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const balance = invoice.balance_due || invoice.balanceDue || invoice.totalAmount || 0
    
    if (daysOverdue < 0) return { current: balance, days30: 0, days60: 0, days90: 0, over90: 0 }
    if (daysOverdue <= 30) return { current: 0, days30: balance, days60: 0, days90: 0, over90: 0 }
    if (daysOverdue <= 60) return { current: 0, days30: 0, days60: balance, days90: 0, over90: 0 }
    if (daysOverdue <= 90) return { current: 0, days30: 0, days60: 0, days90: balance, over90: 0 }
    return { current: 0, days30: 0, days60: 0, days90: 0, over90: balance }
  }

  const viewInvoice = selectedInvoice ? financeState.invoices.find((inv) => inv.id === selectedInvoice) : null
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "All"

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
          onClick={() => setArAgingDialogOpen(true)}
        >
          AR Aging Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<Description />}
          onClick={() => setStatementDialogOpen(true)}
        >
          Customer Statements
        </Button>
        <Button
          variant="outlined"
          startIcon={<ReceiptLong />}
          onClick={() => setQuoteDialogOpen(true)}
          disabled={!canMutate}
        >
          Create Quote
        </Button>
        <Button
          variant="outlined"
          startIcon={<Repeat />}
          onClick={() => setRecurringDialogOpen(true)}
          disabled={!canMutate}
        >
          Recurring Invoices
        </Button>
      </Box>

      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search invoices..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "draft", name: "Draft" },
              { id: "sent", name: "Sent" },
              { id: "paid", name: "Paid" },
              { id: "overdue", name: "Overdue" },
              { id: "void", name: "Void" },
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) =>
              setStatusFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All"),
          },
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { value: "issueDate", label: "Issue Date" },
          { value: "dueDate", label: "Due Date" },
          { value: "amount", label: "Amount" },
          { value: "customer", label: "Customer" },
          { value: "status", label: "Status" },
        ]}
        sortValue="issueDate"
        sortDirection="desc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={() => setCreateDialogOpen(true)}
        createButtonLabel="Create Invoice"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit sales data."
      />

      <StatsSection
        stats={[
          { value: financeState.invoices.length.toString(), label: "Total Invoices", color: "primary" },
          { value: overdueInvoices.toString(), label: "Overdue", color: "error" },
          { value: `£${totalPaid.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Total Paid", color: "success" },
          { value: `£${outstandingAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Outstanding", color: "warning" },
        ]}
      />

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Balance Due</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{invoice.invoiceNumber || invoice.id.substring(0, 8)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: themeConfig.brandColors.navy }}>
                            {invoice.customerName?.charAt(0) || "?"}
                          </Avatar>
                          {invoice.customerName}
                        </Box>
                      </TableCell>
                      <TableCell>{invoice.description ?? "No description"}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>£{Number(invoice.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ fontWeight: invoice.balance_due || invoice.balanceDue ? 600 : 400, color: (invoice.balance_due || invoice.balanceDue) ? "warning.main" : "success.main" }}>
                        £{Number(invoice.balance_due || invoice.balanceDue || invoice.totalAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{invoice.issueDate}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          size="small"
                          color={
                            invoice.status === "paid"
                              ? "success"
                              : invoice.status === "sent"
                              ? "primary"
                              : invoice.status === "overdue"
                              ? "error"
                              : "warning"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleMenuClick(e, invoice.id)}>
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {filteredInvoices.length === 0 && (
        <EmptyStateCard
          icon={Receipt}
          title={hasActiveFilters ? "No invoices match your current filters" : "No invoices found"}
          description={
            hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first invoice to get started."
          }
        />
      )}

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) openViewDialog(selectedInvoice)
            handleMenuClose()
          }}
        >
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const invoice = financeState.invoices.find((inv) => inv.id === selectedInvoice)
            if (invoice) openEditDialog(invoice)
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) {
              const invoice = financeState.invoices.find((inv) => inv.id === selectedInvoice)
              if (invoice && invoice.status === "draft") {
                handleApproveInvoice(selectedInvoice)
              } else {
                handleSendInvoice(selectedInvoice)
              }
            }
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <Send sx={{ mr: 1 }} /> {financeState.invoices.find((inv) => inv.id === selectedInvoice)?.status === "draft" ? "Approve & Send" : "Send Invoice"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) {
              setPaymentDialogOpen(true)
            }
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <Payment sx={{ mr: 1 }} /> Apply Payment
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) {
              setCreditNoteDialogOpen(true)
            }
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <CreditCard sx={{ mr: 1 }} /> Create Credit Note
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) {
              setRefundDialogOpen(true)
            }
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <ReceiptLong sx={{ mr: 1 }} /> Issue Refund
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) {
              setWriteOffDialogOpen(true)
            }
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <Block sx={{ mr: 1 }} /> Write Off
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedInvoice) handleMarkAsPaid(selectedInvoice)
            handleMenuClose()
          }}
          disabled={!canMutate}
        >
          <CheckCircle sx={{ mr: 1 }} /> Mark as Paid
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
            searchParams.get("crudEntity") === "invoice" &&
            searchParams.get("crudMode") === "create"
          ) {
            clearCrudParams()
          }
        }}
        workspaceFormShortcut={{ crudEntity: "invoice", crudMode: "create" }}
        title="Create New Invoice"
        icon={<Receipt />}
        mode="create"
        onSave={() => {}} // Handled by InvoiceForm
        saveButtonText="Create Invoice"
        maxWidth="lg"
        hideSaveButton
      >
        <InvoiceForm
          mode="create"
          onSave={handleCreateInvoice}
          onCancel={() => {
            setCreateDialogOpen(false)
            if (searchParams.get("crudEntity") === "invoice" && searchParams.get("crudMode") === "create") {
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
            setSelectedInvoice(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "invoice",
          crudMode: "edit",
          id: selectedInvoice || undefined,
          itemLabel:
            (selectedInvoice &&
              financeState.invoices.find((inv) => inv.id === selectedInvoice)?.invoiceNumber) ||
            selectedInvoice ||
            undefined,
        }}
        title="Edit Invoice"
        icon={<Edit />}
        mode="edit"
        onSave={() => {}} // Handled by InvoiceForm
        saveButtonText="Save Changes"
        maxWidth="lg"
        hideSaveButton
      >
        {selectedInvoice && (
          <InvoiceForm
            invoice={financeState.invoices.find((inv) => inv.id === selectedInvoice) || null}
            mode="edit"
            onSave={handleEditInvoice}
            onCancel={() => {
              setEditDialogOpen(false)
              setSelectedInvoice(null)
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
                <Typography variant="h6">Invoice {viewInvoice?.invoiceNumber || viewInvoice?.id?.substring(0, 8)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewInvoice?.customerName}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={viewInvoice?.status}
              color={
                viewInvoice?.status === "paid"
                  ? "success"
                  : viewInvoice?.status === "sent"
                  ? "primary"
                  : viewInvoice?.status === "overdue"
                  ? "error"
                  : "warning"
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
                    Invoice Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Issue Date" secondary={viewInvoice?.issueDate} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Due Date" secondary={viewInvoice?.dueDate} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Payment Terms" secondary={`${viewInvoice?.paymentTerms || 0} days`} />
                    </ListItem>
                    {viewInvoice?.description && (
                      <ListItem>
                        <ListItemText primary="Description" secondary={viewInvoice.description} />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Customer
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {viewInvoice?.customerName}
                  </Typography>
                  {viewInvoice?.customerEmail && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">{viewInvoice.customerEmail}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Amount
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal: £{viewInvoice?.subtotal?.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tax: £{viewInvoice?.taxAmount?.toFixed(2)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                    Total: £{viewInvoice?.totalAmount?.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {viewInvoice?.notes && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">{viewInvoice.notes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={() => {
              if (selectedInvoice) handleSendInvoice(selectedInvoice)
              setViewDialogOpen(false)
            }}
          >
            Send
          </Button>
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
            variant="contained"
            startIcon={<Download />}
            onClick={() => {
              // Download PDF functionality
            }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this invoice? All associated data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteInvoice} color="error" variant="contained" disabled={!canRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Application Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Payment</DialogTitle>
        <DialogContent>
          {selectedInvoice && (() => {
            const invoice = financeState.invoices.find((inv) => inv.id === selectedInvoice)
            if (!invoice) return null
            
            const balanceDue = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
            
            // Initialize payment form when dialog opens
            if (paymentAmount === 0 || paymentAmount !== balanceDue) {
              setPaymentAmount(balanceDue)
            }
            if (!paymentBankAccountId && financeState.bankAccounts.length > 0) {
              setPaymentBankAccountId(financeState.bankAccounts[0].id)
            }
            
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Invoice: {invoice.invoiceNumber} - Balance Due: £{balanceDue.toFixed(2)}
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
                  <Alert severity={paymentAmount > balanceDue ? "warning" : "success"}>
                    {paymentAmount > balanceDue
                      ? "Overpayment detected. Excess will be stored as credit."
                      : `Remaining balance: £${(balanceDue - paymentAmount).toFixed(2)}`}
                  </Alert>
                </Grid>
              </Grid>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedInvoice) {
                handleApplyPayment({
                  invoiceId: selectedInvoice,
                  amount: paymentAmount,
                  paymentDate,
                  paymentMethod,
                  bankAccountId: paymentBankAccountId,
                  reference: paymentReference,
                })
              }
            }}
            disabled={!selectedInvoice || !paymentBankAccountId}
          >
            Apply Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* AR Aging Report Dialog */}
      <Dialog open={arAgingDialogOpen} onClose={() => setArAgingDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Aged Receivables Report</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
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
                  const customerAging: Record<string, { current: number; days30: number; days60: number; days90: number; over90: number }> = {}
                  
                  filteredInvoices.forEach((invoice) => {
                    if (invoice.status === "paid" || invoice.status === "void") return
                    const aging = calculateAging(invoice)
                    if (!customerAging[invoice.customerId]) {
                      customerAging[invoice.customerId] = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
                    }
                    customerAging[invoice.customerId].current += aging.current
                    customerAging[invoice.customerId].days30 += aging.days30
                    customerAging[invoice.customerId].days60 += aging.days60
                    customerAging[invoice.customerId].days90 += aging.days90
                    customerAging[invoice.customerId].over90 += aging.over90
                  })
                  
                  return Object.entries(customerAging).map(([customerId, aging]) => {
                    const customer = financeState.contacts.find((c) => c.id === customerId)
                    const total = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.over90
                    return (
                      <TableRow key={customerId}>
                        <TableCell>{customer?.name || customerId}</TableCell>
                        <TableCell align="right">£{aging.current.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days30.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days60.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.days90.toFixed(2)}</TableCell>
                        <TableCell align="right">£{aging.over90.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>£{total.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArAgingDialogOpen(false)}>Close</Button>
          <Button startIcon={<Download />} onClick={() => {}}>Export CSV</Button>
        </DialogActions>
      </Dialog>

      {/* Customer Statements Dialog */}
      <Dialog open={statementDialogOpen} onClose={() => {
        setStatementDialogOpen(false)
        setStatementCustomerId("")
      }} maxWidth="lg" fullWidth>
        <DialogTitle>Customer Statement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Customer</InputLabel>
                <Select
                  value={statementCustomerId}
                  onChange={(e) => setStatementCustomerId(e.target.value)}
                >
                  {financeState.contacts
                    .filter((c) => c.type === "customer")
                    .map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            {statementCustomerId && (() => {
              const customer = financeState.contacts.find((c) => c.id === statementCustomerId)
              const customerInvoices = financeState.invoices.filter((inv) => inv.customerId === statementCustomerId)
              const customerPayments = financeState.payments.filter((pay) => pay.contactId === statementCustomerId)
              const customerCredits = financeState.creditNotes.filter((cn) => cn.customerId === statementCustomerId)
              
              const openingBalance = customer?.outstandingBalance || 0
              const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
              const totalPaid = customerPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
              const totalCredits = customerCredits.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0)
              const closingBalance = openingBalance + totalInvoiced - totalPaid - totalCredits
              
              return (
                <>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>{customer?.name}</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2" color="text.secondary">Opening Balance</Typography>
                            <Typography variant="h6">£{openingBalance.toFixed(2)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2" color="text.secondary">Total Invoiced</Typography>
                            <Typography variant="h6" color="primary">£{totalInvoiced.toFixed(2)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                            <Typography variant="h6" color="success.main">£{totalPaid.toFixed(2)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography variant="body2" color="text.secondary">Closing Balance</Typography>
                            <Typography variant="h6" color={closingBalance > 0 ? "error.main" : "success.main"}>
                              £{closingBalance.toFixed(2)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Transaction History</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Reference</TableCell>
                            <TableCell align="right">Debit</TableCell>
                            <TableCell align="right">Credit</TableCell>
                            <TableCell align="right">Balance</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[
                            ...customerInvoices.map((inv) => ({
                              date: inv.issueDate,
                              type: "Invoice",
                              reference: inv.invoiceNumber,
                              debit: inv.totalAmount,
                              credit: 0,
                            })),
                            ...customerPayments.map((pay) => ({
                              date: pay.paymentDate,
                              type: "Payment",
                              reference: pay.paymentNumber || pay.id,
                              debit: 0,
                              credit: pay.amount,
                            })),
                            ...customerCredits.map((cn) => ({
                              date: cn.issueDate,
                              type: "Credit Note",
                              reference: cn.creditNoteNumber,
                              debit: 0,
                              credit: cn.totalAmount,
                            })),
                          ]
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map((txn, idx) => {
                              const runningBalance = openingBalance + 
                                [...customerInvoices, ...customerPayments, ...customerCredits]
                                  .slice(0, idx + 1)
                                  .reduce((sum, item) => {
                                    if ('totalAmount' in item) return sum + (item.totalAmount || 0)
                                    if ('amount' in item) return sum - (item.amount || 0)
                                    return sum
                                  }, 0)
                              
                              return (
                                <TableRow key={idx}>
                                  <TableCell>{txn.date}</TableCell>
                                  <TableCell>{txn.type}</TableCell>
                                  <TableCell>{txn.reference}</TableCell>
                                  <TableCell align="right">{txn.debit > 0 ? `£${txn.debit.toFixed(2)}` : "-"}</TableCell>
                                  <TableCell align="right">{txn.credit > 0 ? `£${txn.credit.toFixed(2)}` : "-"}</TableCell>
                                  <TableCell align="right">£{runningBalance.toFixed(2)}</TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </>
              )
            })()}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStatementDialogOpen(false)
            setStatementCustomerId("")
          }}>Close</Button>
          {statementCustomerId && (
            <>
              <Button startIcon={<Email />} onClick={() => {}}>Email Statement</Button>
              <Button startIcon={<Download />} onClick={() => {}}>Download PDF</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={creditNoteDialogOpen} onClose={() => {
        setCreditNoteDialogOpen(false)
        setSelectedInvoice(null)
      }} maxWidth="lg" fullWidth>
        <DialogTitle>Create Credit Note</DialogTitle>
        <DialogContent>
          <CreditNoteForm
            originalInvoice={selectedInvoice ? financeState.invoices.find((inv) => inv.id === selectedInvoice) || null : null}
            mode="create"
            onSave={handleCreateCreditNote}
            onCancel={() => {
              setCreditNoteDialogOpen(false)
              setSelectedInvoice(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => {
        setRefundDialogOpen(false)
        setRefundReason("")
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Issue Refund</DialogTitle>
        <DialogContent>
          {selectedInvoice && (() => {
            const invoice = financeState.invoices.find((inv) => inv.id === selectedInvoice)
            if (!invoice) return null
            
            const availableAmount = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
            
            // Initialize form when dialog opens
            if (refundAmount === 0 || refundAmount !== availableAmount) {
              setRefundAmount(availableAmount)
            }
            if (!refundBankAccountId && financeState.bankAccounts.length > 0) {
              setRefundBankAccountId(financeState.bankAccounts[0].id)
            }
            
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Invoice: {invoice.invoiceNumber} - Available for refund: £{availableAmount.toFixed(2)}
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Refund Amount"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01, max: availableAmount }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Refund Date"
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Refund Method</InputLabel>
                    <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="card">Card Refund</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Bank Account</InputLabel>
                    <Select value={refundBankAccountId} onChange={(e) => setRefundBankAccountId(e.target.value)}>
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
                    label="Reason for Refund"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="e.g., Customer returned goods, Service cancellation"
                  />
                </Grid>
              </Grid>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRefundDialogOpen(false)
            setRefundReason("")
          }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedInvoice) {
                handleRefund(selectedInvoice, {
                  amount: refundAmount,
                  refundDate,
                  refundMethod,
                  bankAccountId: refundBankAccountId,
                  reason: refundReason,
                })
              }
            }}
            disabled={!selectedInvoice || !refundReason || !refundBankAccountId || refundAmount <= 0}
          >
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* Write-off Dialog */}
      <Dialog open={writeOffDialogOpen} onClose={() => {
        setWriteOffDialogOpen(false)
        setWriteOffReason("")
        setWriteOffAccountId("")
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Write Off Invoice</DialogTitle>
        <DialogContent>
          {selectedInvoice && (() => {
            const invoice = financeState.invoices.find((inv) => inv.id === selectedInvoice)
            if (!invoice) return null
            
            const availableAmount = invoice.balance_due || invoice.balanceDue || invoice.totalAmount
            const expenseAccounts = financeState.accounts.filter((a) => a.type === "expense" || a.subType === "expense")
            
            // Initialize form when dialog opens
            if (writeOffAmount === 0 || writeOffAmount !== availableAmount) {
              setWriteOffAmount(availableAmount)
            }
            
            return (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Writing off will reduce the invoice balance and create an expense. This action cannot be easily reversed.
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Invoice: {invoice.invoiceNumber} - Balance: £{availableAmount.toFixed(2)}
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Write-off Amount"
                    type="number"
                    value={writeOffAmount}
                    onChange={(e) => setWriteOffAmount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01, max: availableAmount }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Write-off Date"
                    type="date"
                    value={writeOffDate}
                    onChange={(e) => setWriteOffDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Expense Account</InputLabel>
                    <Select value={writeOffAccountId} onChange={(e) => setWriteOffAccountId(e.target.value)}>
                      {expenseAccounts.map((acc) => (
                        <MenuItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason for Write-off"
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                    required
                    multiline
                    rows={2}
                    placeholder="e.g., Bad debt, Uncollectible, Customer dispute"
                  />
                </Grid>
              </Grid>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setWriteOffDialogOpen(false)
            setWriteOffReason("")
            setWriteOffAccountId("")
          }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedInvoice) {
                handleWriteOff(selectedInvoice, {
                  amount: writeOffAmount,
                  writeOffDate,
                  reason: writeOffReason,
                  accountId: writeOffAccountId,
                })
              }
            }}
            disabled={!selectedInvoice || !writeOffReason || !writeOffAccountId || writeOffAmount <= 0}
          >
            Write Off
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quote Dialog - Placeholder */}
      <Dialog
        open={quoteDialogOpen}
        onClose={() => {
          setQuoteDialogOpen(false)
          if (searchParams.get("crudEntity") === "quote" && searchParams.get("crudMode") === "create") {
            clearCrudParams()
          }
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Create Quote</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Quote functionality allows you to create estimates that can later be converted to invoices.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Quotes can be sent to customers and converted to invoices when accepted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setQuoteDialogOpen(false)
              if (searchParams.get("crudEntity") === "quote" && searchParams.get("crudMode") === "create") {
                clearCrudParams()
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recurring Invoice Dialog - Placeholder */}
      <Dialog open={recurringDialogOpen} onClose={() => setRecurringDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recurring Invoices</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Recurring invoices allow you to automatically generate invoices on a schedule.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Set up invoices to be automatically created weekly, monthly, quarterly, or yearly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecurringDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Sales
