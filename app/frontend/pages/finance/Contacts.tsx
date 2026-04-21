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
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import {
  MoreVert,
  Person,
  Edit,
  Delete,
  Visibility,
  Email,
  Phone,
  LocationOn,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Description,
  Archive,
  Unarchive,
  Print,
  Download,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import ContactForm from "../../components/finance/forms/ContactForm"
import type { Contact, Invoice, Bill, Payment, CreditNote } from "../../../backend/interfaces/Finance"
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

const Contacts: React.FC = () => {
  const {
    state: financeState,
    refreshAll,
    refreshContacts,
    refreshInvoices,
    refreshBills,
    refreshPayments,
    refreshCreditNotes,
    refreshAccounts,
    refreshTaxRates,
    refreshCurrencies,
    createContact,
    updateContact,
    deleteContact,
  } = useFinance()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "contacts")
  const canRemove = canDelete("finance", "contacts")
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All") // All, Active, Archived
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [viewDialogTab, setViewDialogTab] = useState(0)

  // Statement Dialog state
  const [isStatementDialogOpen, setIsStatementDialogOpen] = useState(false)
  const [statementContactId, setStatementContactId] = useState<string | null>(null)

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.contacts.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.contacts.length, financeState.loading, loadData])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create" || entity !== "contact") return

    handleOpenCreateModal()
    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, contactId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedContact(contactId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedContact(null)
  }

  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingContact(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (contact: Contact) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingContact(contact)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (contact: Contact) => {
    setViewingContact(contact)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  const handleSaveContact = async (data: any) => {
    if (!canMutate) return
    const contactSnapshot = editingContact
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createContact(cleanData)
      } else if (crudMode === "edit" && editingContact) {
        // Include id in update
        await updateContact(editingContact.id, { ...cleanData, id: editingContact.id })
      }
      await refreshContacts()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "contact",
        crudMode: modeSnapshot,
        id: contactSnapshot?.id,
        itemLabel: contactSnapshot?.name || contactSnapshot?.companyName || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingContact(null)
    } catch (error) {
      // Error saving contact - handled by context
      throw error
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!canRemove) return
    if (!window.confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
      return
    }

    try {
      await deleteContact(contactId)
      await refreshContacts()
      handleMenuClose()
    } catch (error) {
      // Error deleting contact - handled by context
      alert("Failed to delete contact. Please try again.")
    }
  }

  const handleArchiveContact = async (contact: Contact) => {
    if (!canMutate) return
    try {
      await updateContact(contact.id, {
        id: contact.id,
        isArchived: true,
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      await refreshContacts()
      handleMenuClose()
    } catch (error) {
      // Error archiving contact - handled by context
      alert("Failed to archive contact. Please try again.")
    }
  }

  const handleUnarchiveContact = async (contact: Contact) => {
    if (!canMutate) return
    try {
      await updateContact(contact.id, {
        id: contact.id,
        isArchived: false,
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      await refreshContacts()
      handleMenuClose()
    } catch (error) {
      // Error unarchiving contact - handled by context
      alert("Failed to unarchive contact. Please try again.")
    }
  }

  const handleOpenStatement = (contact: Contact) => {
    setStatementContactId(contact.id)
    setIsStatementDialogOpen(true)
    handleMenuClose()
  }

  // Calculate balances from ledger (invoices, bills, payments)
  const calculateContactBalance = (contact: Contact): number => {
    let balance = 0

    // Customer balance (AR)
    if (contact.type === "customer" || contact.type === "both") {
      const customerInvoices = financeState.invoices.filter(
        (inv) => inv.customerId === contact.id && inv.status !== "paid" && inv.status !== "void" && inv.status !== "cancelled"
      )
      const customerPayments = financeState.payments.filter(
        (pay) => pay.contactId === contact.id && pay.type === "customer_payment"
      )
      const customerCredits = financeState.creditNotes.filter(
        (cn) => cn.customerId === contact.id
      )

      const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.balance_due || inv.balanceDue || inv.totalAmount || 0), 0)
      const totalPaid = customerPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
      const totalCredits = customerCredits.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0)
      
      balance += totalInvoiced - totalPaid - totalCredits
    }

    // Supplier balance (AP)
    if (contact.type === "supplier" || contact.type === "both") {
      const supplierBills = financeState.bills.filter(
        (bill) => bill.supplierId === contact.id && bill.status !== "paid" && bill.status !== "cancelled"
      )
      const supplierPayments = financeState.payments.filter(
        (pay) => pay.contactId === contact.id && pay.type === "supplier_payment"
      )

      const totalBilled = supplierBills.reduce((sum, bill) => sum + (bill.balance_due || bill.balanceDue || bill.totalAmount || 0), 0)
      const totalPaid = supplierPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0)
      
      balance -= (totalBilled - totalPaid) // Negative for what we owe
    }

    return balance
  }

  const getContactTotalSales = (contactId: string): number => {
    return financeState.invoices
      .filter((inv) => inv.customerId === contactId)
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  }

  const getContactTotalPurchases = (contactId: string): number => {
    return financeState.bills
      .filter((bill) => bill.supplierId === contactId)
      .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0)
  }

  const filteredContacts = financeState.contacts.filter((contact) => {
    if (!contact) return false
    const matchesSearch =
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = 
      typeFilter === "All" ? true :
      typeFilter === "Customers" ? (contact.type === "customer" || contact.type === "both") :
      typeFilter === "Suppliers" ? (contact.type === "supplier" || contact.type === "both") :
      contact.type === typeFilter.toLowerCase()
    
    const matchesStatus =
      statusFilter === "All" ? true :
      statusFilter === "Active" ? (contact.isActive !== false && !contact.isArchived) :
      statusFilter === "Archived" ? contact.isArchived === true :
      true

    return matchesSearch && matchesType && matchesStatus
  })

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "All" || statusFilter !== "All"

  const activeContacts = financeState.contacts.filter(c => c.isActive !== false && !c.isArchived)
  const archivedContacts = financeState.contacts.filter(c => c.isArchived === true)
  const customers = financeState.contacts.filter(c => c.type === "customer" || c.type === "both")
  const suppliers = financeState.contacts.filter(c => c.type === "supplier" || c.type === "both")

  return (
    <Box sx={{ p: 0 }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}

      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search contacts..."
        filters={[
          {
            label: "Type",
            options: [
              { id: "all", name: "All" },
              { id: "customers", name: "Customers" },
              { id: "suppliers", name: "Suppliers" },
              { id: "employee", name: "Employee" },
              { id: "other", name: "Other" },
            ],
            selectedValues: typeFilter !== "All" ? [typeFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) =>
              setTypeFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All"),
          },
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "active", name: "Active" },
              { id: "archived", name: "Archived" },
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) =>
              setStatusFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All"),
          },
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "type", label: "Type" },
          { value: "createdAt", label: "Date Created" },
        ]}
        sortValue="name"
        sortDirection="asc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={handleOpenCreateModal}
        createButtonLabel="Add Contact"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit contacts."
      />

      <StatsSection
        stats={[
          { value: financeState.contacts.length.toString(), label: "Total Contacts", color: "primary" },
          { value: customers.length.toString(), label: "Customers", color: "success" },
          { value: suppliers.length.toString(), label: "Suppliers", color: "warning" },
          { value: activeContacts.length.toString(), label: "Active", color: "info" },
        ]}
      />

      <Box sx={{ px: 3 }}>
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const balance = calculateContactBalance(contact)
                    const isCustomer = contact.type === "customer" || contact.type === "both"
                    const isSupplier = contact.type === "supplier" || contact.type === "both"
                    
                    return (
                      <TableRow key={contact.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: themeConfig.brandColors.navy }}>
                              {contact.name?.charAt(0) || "?"}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {contact.name}
                              </Typography>
                              {contact.companyName && (
                                <Typography variant="caption" color="text.secondary">
                                  {contact.companyName}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {isCustomer && <Chip label="Customer" size="small" color="success" />}
                            {isSupplier && <Chip label="Supplier" size="small" color="warning" />}
                            {contact.type === "employee" && <Chip label="Employee" size="small" />}
                            {contact.type === "other" && <Chip label="Other" size="small" />}
                          </Box>
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone || contact.mobile || "-"}</TableCell>
                        <TableCell align="right" sx={{ 
                          fontWeight: balance !== 0 ? 600 : 400,
                          color: balance > 0 ? "success.main" : balance < 0 ? "error.main" : "inherit"
                        }}>
                          {contact.currency || "GBP"} {Math.abs(balance).toFixed(2)}
                          {balance > 0 && " (AR)"}
                          {balance < 0 && " (AP)"}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Chip
                              label={contact.isArchived ? "Archived" : contact.isActive !== false ? "Active" : "Inactive"}
                              size="small"
                              color={contact.isArchived ? "default" : contact.isActive !== false ? "success" : "default"}
                              variant="filled"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={(e) => handleMenuClick(e, contact.id)}>
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
      </Box>

      {filteredContacts.length === 0 && (
        <Box sx={{ px: 3, mt: 2 }}>
          <EmptyStateCard
            icon={Person}
            title={hasActiveFilters ? "No contacts match your current filters" : "No contacts found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first contact to get started."
            }
          />
        </Box>
      )}

      {/* Contact CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingContact(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "contact",
          crudMode,
          id: editingContact?.id,
          itemLabel: editingContact?.name || editingContact?.companyName || undefined,
        }}
        title={crudMode === "create" ? "Create Contact" : crudMode === "edit" ? "Edit Contact" : "View Contact"}
        icon={<Person />}
        mode={crudMode}
        maxWidth="lg"
      >
        <ContactForm
          contact={editingContact}
          mode={crudMode}
          onSave={handleSaveContact}
        />
      </CRUDModal>

      {/* View Contact Dialog */}
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
                {viewingContact?.name?.charAt(0) || "?"}
              </Avatar>
              <Box>
                <Typography variant="h6">{viewingContact?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingContact?.companyName}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {(viewingContact?.type === "customer" || viewingContact?.type === "both") && (
                <Button
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={() => viewingContact && handleOpenStatement(viewingContact)}
                >
                  Statement
                </Button>
              )}
              <Button
                variant="contained"
                onClick={() => viewingContact && handleOpenEditModal(viewingContact)}
                disabled={!canMutate}
              >
                Edit
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewingContact && (
            <Box>
              <Tabs value={viewDialogTab} onChange={(_, newValue) => setViewDialogTab(newValue)}>
                <Tab label="Overview" />
                <Tab label="Financial" />
                <Tab label="Transactions" />
              </Tabs>

              <TabPanel value={viewDialogTab} index={0}>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Contact Information</Typography>
                        <List dense>
                          <ListItem>
                            <Email sx={{ mr: 2, color: "text.secondary" }} />
                            <ListItemText primary="Email" secondary={viewingContact.email || "N/A"} />
                          </ListItem>
                          <ListItem>
                            <Phone sx={{ mr: 2, color: "text.secondary" }} />
                            <ListItemText primary="Phone" secondary={viewingContact.phone || viewingContact.mobile || "N/A"} />
                          </ListItem>
                          <ListItem>
                            <LocationOn sx={{ mr: 2, color: "text.secondary" }} />
                            <ListItemText
                              primary="Address"
                              secondary={
                                viewingContact.address
                                  ? `${viewingContact.address.street}, ${viewingContact.address.city}, ${viewingContact.address.state} ${viewingContact.address.postalCode}`
                                  : "N/A"
                              }
                            />
                          </ListItem>
                          {viewingContact.website && (
                            <ListItem>
                              <ListItemText primary="Website" secondary={viewingContact.website} />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Account Details</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="Type" secondary={
                              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                                {(viewingContact.type === "customer" || viewingContact.type === "both") && (
                                  <Chip label="Customer" size="small" color="success" />
                                )}
                                {(viewingContact.type === "supplier" || viewingContact.type === "both") && (
                                  <Chip label="Supplier" size="small" color="warning" />
                                )}
                              </Box>
                            } />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Payment Terms" secondary={`${viewingContact.paymentTerms || 0} days`} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Credit Limit" secondary={`${viewingContact.currency || "GBP"} ${(viewingContact.creditLimit || 0).toFixed(2)}`} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Currency" secondary={viewingContact.currency || "GBP"} />
                          </ListItem>
                          {viewingContact.taxNumber && (
                            <ListItem>
                              <ListItemText primary="Tax Number" secondary={viewingContact.taxNumber} />
                            </ListItem>
                          )}
                          {viewingContact.vatNumber && (
                            <ListItem>
                              <ListItemText primary="VAT Number" secondary={viewingContact.vatNumber} />
                            </ListItem>
                          )}
                          {viewingContact.defaultAccountId && (
                            <ListItem>
                              <ListItemText 
                                primary="Default Account" 
                                secondary={
                                  financeState.accounts.find(a => a.id === viewingContact.defaultAccountId)?.name || 
                                  viewingContact.defaultAccountId
                                } 
                              />
                            </ListItem>
                          )}
                          {viewingContact.defaultTaxRateId && (
                            <ListItem>
                              <ListItemText 
                                primary="Default Tax Rate" 
                                secondary={
                                  financeState.taxRates.find(t => t.id === viewingContact.defaultTaxRateId)?.name || 
                                  viewingContact.defaultTaxRateId
                                } 
                              />
                            </ListItem>
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  {viewingContact.bankDetails && (viewingContact.bankDetails.accountNumber || viewingContact.bankDetails.iban) && (
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Bank Details</Typography>
                          <List dense>
                            {viewingContact.bankDetails.bankName && (
                              <ListItem>
                                <ListItemText primary="Bank Name" secondary={viewingContact.bankDetails.bankName} />
                              </ListItem>
                            )}
                            {viewingContact.bankDetails.accountName && (
                              <ListItem>
                                <ListItemText primary="Account Name" secondary={viewingContact.bankDetails.accountName} />
                              </ListItem>
                            )}
                            {viewingContact.bankDetails.accountNumber && (
                              <ListItem>
                                <ListItemText primary="Account Number" secondary={viewingContact.bankDetails.accountNumber} />
                              </ListItem>
                            )}
                            {viewingContact.bankDetails.sortCode && (
                              <ListItem>
                                <ListItemText primary="Sort Code" secondary={viewingContact.bankDetails.sortCode} />
                              </ListItem>
                            )}
                            {viewingContact.bankDetails.iban && (
                              <ListItem>
                                <ListItemText primary="IBAN" secondary={viewingContact.bankDetails.iban} />
                              </ListItem>
                            )}
                            {viewingContact.bankDetails.swiftCode && (
                              <ListItem>
                                <ListItemText primary="SWIFT Code" secondary={viewingContact.bankDetails.swiftCode} />
                              </ListItem>
                            )}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {viewingContact.notes && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Notes</Typography>
                          <Typography variant="body2">{viewingContact.notes}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              <TabPanel value={viewDialogTab} index={1}>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {(viewingContact.type === "customer" || viewingContact.type === "both") && (
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <TrendingUp color="success" sx={{ mr: 1 }} />
                            <Typography variant="h6">Sales Summary</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                          <Typography variant="h5" fontWeight="bold">
                            {viewingContact.currency || "GBP"} {getContactTotalSales(viewingContact.id).toFixed(2)}
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" color="text.secondary">Outstanding (AR)</Typography>
                          <Typography variant="h6" fontWeight="bold" color="warning.main">
                            {viewingContact.currency || "GBP"} {Math.max(0, calculateContactBalance(viewingContact)).toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {(viewingContact.type === "supplier" || viewingContact.type === "both") && (
                    <Grid item xs={12} sm={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <TrendingDown color="error" sx={{ mr: 1 }} />
                            <Typography variant="h6">Purchase Summary</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
                          <Typography variant="h5" fontWeight="bold">
                            {viewingContact.currency || "GBP"} {getContactTotalPurchases(viewingContact.id).toFixed(2)}
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" color="text.secondary">Outstanding (AP)</Typography>
                          <Typography variant="h6" fontWeight="bold" color="error.main">
                            {viewingContact.currency || "GBP"} {Math.abs(Math.min(0, calculateContactBalance(viewingContact))).toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              <TabPanel value={viewDialogTab} index={2}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const transactions: Array<{
                            date: string
                            type: string
                            reference: string
                            amount: number
                            status: string
                          }> = []

                          // Add invoices
                          financeState.invoices
                            .filter((inv) => inv.customerId === viewingContact.id)
                            .forEach((inv) => {
                              transactions.push({
                                date: inv.issueDate,
                                type: "Invoice",
                                reference: inv.invoiceNumber,
                                amount: inv.totalAmount,
                                status: inv.status,
                              })
                            })

                          // Add bills
                          financeState.bills
                            .filter((bill) => bill.supplierId === viewingContact.id)
                            .forEach((bill) => {
                              transactions.push({
                                date: bill.receiveDate,
                                type: "Bill",
                                reference: bill.billNumber || bill.reference,
                                amount: bill.totalAmount,
                                status: bill.status,
                              })
                            })

                          // Add payments
                          financeState.payments
                            .filter((pay) => pay.contactId === viewingContact.id)
                            .forEach((pay) => {
                              transactions.push({
                                date: pay.paymentDate,
                                type: pay.type === "customer_payment" ? "Payment Received" : "Payment Made",
                                reference: pay.paymentNumber,
                                amount: pay.amount,
                                status: pay.status,
                              })
                            })

                          return transactions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 10)
                            .map((txn, index) => (
                              <TableRow key={index}>
                                <TableCell>{txn.date}</TableCell>
                                <TableCell>{txn.type}</TableCell>
                                <TableCell>{txn.reference}</TableCell>
                                <TableCell align="right">{viewingContact.currency || "GBP"} {txn.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Chip label={txn.status} size="small" />
                                </TableCell>
                              </TableRow>
                            ))
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Statement Dialog */}
      <Dialog open={isStatementDialogOpen} onClose={() => setIsStatementDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Contact Statement</DialogTitle>
        <DialogContent>
          {statementContactId && (() => {
            const contact = financeState.contacts.find((c) => c.id === statementContactId)
            if (!contact) return null

            const isCustomer = contact.type === "customer" || contact.type === "both"
            const invoices = isCustomer ? financeState.invoices.filter((inv) => inv.customerId === contact.id) : []
            const bills = (contact.type === "supplier" || contact.type === "both") 
              ? financeState.bills.filter((bill) => bill.supplierId === contact.id) 
              : []
            const payments = financeState.payments.filter((pay) => pay.contactId === contact.id)
            const credits = isCustomer ? financeState.creditNotes.filter((cn) => cn.customerId === contact.id) : []

            const allTransactions: Array<{
              date: string
              type: string
              reference: string
              description: string
              debit: number
              credit: number
              balance: number
            }> = []

            let runningBalance = contact.outstandingBalance || 0

            // Add invoices
            invoices.forEach((inv) => {
              runningBalance += inv.totalAmount
              allTransactions.push({
                date: inv.issueDate,
                type: "Invoice",
                reference: inv.invoiceNumber,
                description: inv.description || "",
                debit: inv.totalAmount,
                credit: 0,
                balance: runningBalance,
              })
            })

            // Add bills
            bills.forEach((bill) => {
              runningBalance -= bill.totalAmount
              allTransactions.push({
                date: bill.receiveDate,
                type: "Bill",
                reference: bill.billNumber || bill.reference,
                description: bill.description || "",
                debit: 0,
                credit: bill.totalAmount,
                balance: runningBalance,
              })
            })

            // Add payments
            payments.forEach((pay) => {
              if (pay.type === "customer_payment") {
                runningBalance -= pay.amount
                allTransactions.push({
                  date: pay.paymentDate,
                  type: "Payment",
                  reference: pay.paymentNumber,
                  description: "Payment received",
                  debit: 0,
                  credit: pay.amount,
                  balance: runningBalance,
                })
              } else {
                runningBalance += pay.amount
                allTransactions.push({
                  date: pay.paymentDate,
                  type: "Payment",
                  reference: pay.paymentNumber,
                  description: "Payment made",
                  debit: pay.amount,
                  credit: 0,
                  balance: runningBalance,
                })
              }
            })

            // Add credits
            credits.forEach((cn) => {
              runningBalance -= cn.totalAmount
              allTransactions.push({
                date: cn.issueDate,
                type: "Credit Note",
                reference: cn.creditNoteNumber,
                description: cn.reason,
                debit: 0,
                credit: cn.totalAmount,
                balance: runningBalance,
              })
            })

            const sortedTransactions = allTransactions.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )

            return (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Contact</Typography>
                    <Typography variant="h6">{contact.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Closing Balance</Typography>
                    <Typography variant="h6" fontWeight="bold" color={runningBalance >= 0 ? "success.main" : "error.main"}>
                      {contact.currency || "GBP"} {Math.abs(runningBalance).toFixed(2)}
                      {runningBalance >= 0 ? " (AR)" : " (AP)"}
                    </Typography>
                  </Grid>
                </Grid>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Reference</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell align="right">Credit</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedTransactions.map((txn, index) => (
                        <TableRow key={index}>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell>{txn.type}</TableCell>
                          <TableCell>{txn.reference}</TableCell>
                          <TableCell>{txn.description}</TableCell>
                          <TableCell align="right">{txn.debit > 0 ? `${contact.currency || "GBP"} ${txn.debit.toFixed(2)}` : "-"}</TableCell>
                          <TableCell align="right">{txn.credit > 0 ? `${contact.currency || "GBP"} ${txn.credit.toFixed(2)}` : "-"}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                            {contact.currency || "GBP"} {Math.abs(txn.balance).toFixed(2)}
                            {txn.balance >= 0 ? " (AR)" : " (AP)"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStatementDialogOpen(false)}>Close</Button>
          <Button startIcon={<Print />} onClick={() => {}}>Print</Button>
          <Button startIcon={<Download />} onClick={() => {}}>Download PDF</Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            const contact = financeState.contacts.find((c) => c.id === selectedContact)
            if (contact) handleOpenViewDialog(contact)
          }}
        >
          <Visibility sx={{ mr: 1 }} fontSize="small" /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const contact = financeState.contacts.find((c) => c.id === selectedContact)
            if (contact) handleOpenEditModal(contact)
          }}
          disabled={!canMutate}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            const contact = financeState.contacts.find((c) => c.id === selectedContact)
            if (contact && (contact.type === "customer" || contact.type === "both")) {
              handleOpenStatement(contact)
            }
          }}
          disabled={!financeState.contacts.find((c) => c.id === selectedContact) || 
            (financeState.contacts.find((c) => c.id === selectedContact)?.type !== "customer" && 
             financeState.contacts.find((c) => c.id === selectedContact)?.type !== "both")}
        >
          <Description sx={{ mr: 1 }} fontSize="small" /> View Statement
        </MenuItem>
        <Divider />
        {financeState.contacts.find((c) => c.id === selectedContact)?.isArchived ? (
          <MenuItem
            onClick={() => {
              const contact = financeState.contacts.find((c) => c.id === selectedContact)
              if (contact) handleUnarchiveContact(contact)
            }}
            disabled={!canMutate}
          >
            <Unarchive sx={{ mr: 1 }} fontSize="small" /> Unarchive
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              const contact = financeState.contacts.find((c) => c.id === selectedContact)
              if (contact) handleArchiveContact(contact)
            }}
            disabled={!canMutate}
          >
            <Archive sx={{ mr: 1 }} fontSize="small" /> Archive
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedContact) handleDeleteContact(selectedContact)
          }}
          sx={{ color: "error.main" }}
          disabled={!canRemove}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Contacts
