"use client"

import React, { useCallback, useState, useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material"
import {
  MoreVert,
  AccountBalance,
  Visibility,
  Edit,
  Delete,
  Close,
  Calculate as CalculateIcon,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import { useSettings } from "../../../backend/context/SettingsContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import AccountCRUDForm from "../../components/finance/forms/AccountCRUDForm"
import ManualJournalForm from "../../components/finance/forms/ManualJournalForm"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"
import type { 
  Account, 
  Journal, 
  PeriodLock, 
  Dimension 
} from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"


const Accounting: React.FC = () => {
  const { 
    state: financeState, 
    refreshAll,
    refreshAccounts, 
    refreshTransactions,
    refreshJournals,
    refreshPeriodLocks,
    refreshDimensions,
    createAccount,
    updateAccount,
    deleteAccount,
    createJournal,
    updateJournal,
    deleteJournal,
    approveJournal,
    postJournal,
    reverseJournal,
    createPeriodLock,
    unlockPeriod,
    checkPeriodLocked,
    createDimension,
    updateDimension,
    deleteDimension,
  } = useFinance()
  
  const { state: settingsState } = useSettings()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "accounting")
  const canRemove = canDelete("finance", "accounting")
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  
  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [accountTypeFilter, setAccountTypeFilter] = useState("All")
  const [activeTab, setActiveTab] = useState(0)

  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  // Journal Modal states
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false)
  const [journalMode, setJournalMode] = useState<"create" | "edit" | "view">("create")
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null)

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null)

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.accounts.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.accounts.length, financeState.loading, loadData])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create") return

    if (entity === "account") {
      handleOpenCreateModal()
    } else if (entity === "journal") {
      handleOpenCreateJournalModal()
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, account: Account) => {
    setAnchorEl(event.currentTarget)
    setSelectedAccount(account)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedAccount(null)
  }

  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingAccount(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (account: Account) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingAccount(account)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (account: Account) => {
    setViewingAccount(account)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  // Form submit handler
  const handleSaveAccount = async (data: any) => {
    const accountSnapshot = editingAccount
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createAccount(cleanData)
      } else if (crudMode === "edit" && editingAccount) {
        // Include id in update
        await updateAccount(editingAccount.id, { ...cleanData, id: editingAccount.id })
      }
      await refreshAccounts()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "account",
        crudMode: modeSnapshot,
        id: accountSnapshot?.id,
        itemLabel: accountSnapshot?.name || accountSnapshot?.code || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingAccount(null)
    } catch (error) {
      // Error saving account - handled by context
      throw error
    }
  }

  const handleDeleteAccountAction = async (account: Account) => {
    if (!canRemove) return
    if (!window.confirm(`Are you sure you want to delete account ${account.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteAccount(account.id)
      await refreshAccounts()
      handleMenuClose()
    } catch (error) {
      // Error deleting account - handled by context
      alert("Failed to delete account. It may have associated transactions.")
    }
  }

  // Journal Handlers
  const handleOpenCreateJournalModal = () => {
    if (!canMutate) return
    setJournalMode("create")
    setEditingJournal(null)
    setIsJournalModalOpen(true)
  }

  const handleOpenEditJournalModal = (journal: Journal) => {
    if (!canMutate) return
    setJournalMode("edit")
    setEditingJournal(journal)
    setIsJournalModalOpen(true)
  }

  const handleSaveJournal = async (data: any) => {
    const journalSnapshot = editingJournal
    const journalModeSnapshot = journalMode
    try {
      if (journalMode === "create") {
        await createJournal(data)
      } else if (journalMode === "edit" && editingJournal) {
        await updateJournal(editingJournal.id, data)
      }
      await refreshJournals()
      await refreshAccounts() // Refresh to update balances
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "journal",
        crudMode: journalModeSnapshot,
        id: journalSnapshot?.id,
        itemLabel: journalSnapshot?.journal_number || journalSnapshot?.description || undefined,
      })
      setIsJournalModalOpen(false)
      setEditingJournal(null)
    } catch (error: any) {
      // Error saving journal - handled by context
      alert(error.message || "Failed to save journal")
      throw error
    }
  }

  const handleApproveJournal = async (journal: Journal) => {
    try {
      const userId = settingsState.auth?.uid || "system"
      await approveJournal(journal.id, userId)
      await refreshJournals()
    } catch (error) {
      // Error approving journal - handled by context
      alert("Failed to approve journal")
    }
  }

  const handlePostJournal = async (journal: Journal) => {
    if (!window.confirm(`Post journal ${journal.journal_number}? This will create transactions and update account balances.`)) {
      return
    }
    try {
      const userId = settingsState.auth?.uid || "system"
      await postJournal(journal.id, userId)
      await refreshJournals()
      await refreshAccounts()
      alert("Journal posted successfully")
    } catch (error) {
      // Error posting journal - handled by context
      alert("Failed to post journal")
    }
  }

  const handleReverseJournal = async (journal: Journal) => {
    if (!window.confirm(`Reverse journal ${journal.journal_number}? This will create a reversing journal entry.`)) {
      return
    }
    try {
      const userId = settingsState.auth?.uid || "system"
      const reversalDate = new Date().toISOString().split('T')[0]
      await reverseJournal(journal.id, userId, reversalDate)
      await refreshJournals()
      await refreshAccounts()
      alert("Journal reversed successfully")
    } catch (error) {
      // Error reversing journal - handled by context
      alert("Failed to reverse journal")
    }
  }

  // Date filtering helper (currently unused but kept for future date-based filtering)
  // const isDateInRange = (date: string) => {
  //   const accountDate = new Date(date)
  //   
  //   switch (dateType) {
  //     case "day":
  //       return accountDate.toDateString() === currentDate.toDateString()
  //     case "week":
  //       const weekStart = new Date(currentDate)
  //       weekStart.setDate(currentDate.getDate() - currentDate.getDay())
  //       const weekEnd = new Date(weekStart)
  //       weekEnd.setDate(weekStart.getDate() + 6)
  //       return accountDate >= weekStart && accountDate <= weekEnd
  //     case "month":
  //       return accountDate.getMonth() === currentDate.getMonth() && 
  //              accountDate.getFullYear() === currentDate.getFullYear()
  //     case "custom":
  //       return true
  //     default:
  //       return true
  //   }
  // }

  // Calculate summary metrics
  const accounts = financeState.accounts || []
  const transactions = financeState.transactions || []
  
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = acc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = accountTypeFilter === "All" || acc.type === accountTypeFilter.toLowerCase()
    return matchesSearch && matchesType
  })
  
  const totalAssets = accounts.filter((acc) => acc.type === "asset").reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const totalLiabilities = Math.abs(
    accounts.filter((acc) => acc.type === "liability").reduce((sum, acc) => sum + (acc.balance || 0), 0)
  )
  const totalEquity = accounts.filter((acc) => acc.type === "equity").reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const totalRevenue = accounts.filter((acc) => acc.type === "revenue").reduce((sum, acc) => sum + (acc.balance || 0), 0)

  const hasActiveFilters = searchTerm !== "" || accountTypeFilter !== "All"

  return (
    <Box sx={{ width: "100%" }}>
      {financeState.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {financeState.error}
        </Alert>
      )}

      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search accounts..."
        filters={[
          {
            label: "Account Type",
            options: [
              { id: "all", name: "All" },
              { id: "asset", name: "Asset" },
              { id: "liability", name: "Liability" },
              { id: "equity", name: "Equity" },
              { id: "revenue", name: "Revenue" },
              { id: "expense", name: "Expense" }
            ],
            selectedValues: accountTypeFilter !== "All" ? [accountTypeFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) => setAccountTypeFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All")
          }
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Code", value: "code" },
          { label: "Balance", value: "balance" },
          { label: "Type", value: "type" }
        ]}
        sortValue="name"
        sortDirection="asc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={activeTab === 0 ? handleOpenCreateModal : activeTab === 1 ? handleOpenCreateJournalModal : handleOpenCreateModal}
        createButtonLabel={activeTab === 0 ? "Add Account" : activeTab === 1 ? "New Journal" : "Add"}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit accounting data."
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
              Chart of Accounts
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
              Manual Journals
            </Button>
            <Button
              variant={activeTab === 2 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(2)}
              sx={
                activeTab === 2
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
              Opening Balances
            </Button>
            <Button
              variant={activeTab === 3 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(3)}
              sx={
                activeTab === 3
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
              Period Locks
            </Button>
            <Button
              variant={activeTab === 4 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(4)}
              sx={
                activeTab === 4
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
              Dimensions
            </Button>
          </Box>
        }
      />

      <StatsSection
        stats={[
          { value: totalAssets, label: "Total Assets", color: "success", prefix: "£" },
          { value: totalLiabilities, label: "Total Liabilities", color: "error", prefix: "£" },
          { value: totalEquity, label: "Total Equity", color: "info", prefix: "£" },
          { value: totalRevenue, label: "Total Revenue", color: "success", prefix: "£" },
        ]}
      />

      {activeTab === 0 && (
        <Box sx={{ pt: 3 }}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <TableContainer component={Paper} sx={{ 
                backgroundColor: "transparent",
                boxShadow: 1,
                borderRadius: 2,
                overflow: "hidden"
              }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account) => (
                        <TableRow
                          key={account.id}
                          sx={{
                            "&:hover": { backgroundColor: "action.hover" },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{account.code}</TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={account.type}
                              size="small"
                              color={
                                account.type === "asset" ? "success" :
                                account.type === "liability" ? "error" :
                                account.type === "equity" ? "primary" :
                                account.type === "revenue" ? "info" :
                                "warning"
                              }
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>{account.category}</TableCell>
                          <TableCell sx={{ fontWeight: 500, color: account.balance < 0 ? "error.main" : "inherit" }}>
                            £{Math.abs(account.balance).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <IconButton onClick={(e) => handleMenuClick(e, account)} color="primary">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">
                            {searchTerm ? "No accounts matching your search" : "No accounts found"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ pt: 3 }}>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Journal Entries</Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    setJournalMode("create")
                    setEditingJournal(null)
                    setIsJournalModalOpen(true)
                  }}
                >
                  Create Journal
                </Button>
              </Box>
              {financeState.journals.length > 0 ? (
                <TableContainer component={Paper} sx={{ 
                  backgroundColor: "transparent",
                  boxShadow: 1,
                  borderRadius: 2,
                  overflow: "hidden"
                }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Journal Number</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Debit</TableCell>
                        <TableCell align="right">Credit</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {financeState.journals.map((journal) => (
                        <TableRow key={journal.id}>
                          <TableCell>{journal.journal_number}</TableCell>
                          <TableCell>{new Date(journal.date).toLocaleDateString()}</TableCell>
                          <TableCell>{journal.description}</TableCell>
                          <TableCell>
                            <Chip label={journal.source} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={journal.status} 
                              size="small" 
                              color={
                                journal.status === "posted" ? "success" :
                                journal.status === "approved" ? "info" :
                                journal.status === "reversed" ? "warning" :
                                "default"
                              }
                            />
                          </TableCell>
                          <TableCell align="right">£{journal.total_debit.toFixed(2)}</TableCell>
                          <TableCell align="right">£{journal.total_credit.toFixed(2)}</TableCell>
                          <TableCell>
                            <IconButton onClick={(e) => handleMenuClick(e, journal as any)} color="primary">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ color: "text.secondary", mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1, textAlign: "center" }}>
                  No journal entries found. Create a new journal entry to get started.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Account CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingAccount(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "account",
          crudMode,
          id: editingAccount?.id,
          itemLabel: editingAccount?.name || editingAccount?.code || undefined,
        }}
        title={crudMode === "create" ? "Create New Account" : "Edit Account"}
        icon={<AccountBalance />}
        mode={crudMode}
        maxWidth="md"
      >
        <AccountCRUDForm
          account={editingAccount}
          mode={crudMode}
          onSave={handleSaveAccount}
        />
      </CRUDModal>

      {/* Journal CRUD Modal */}
      <CRUDModal
        open={isJournalModalOpen}
        onClose={(reason) => {
          setIsJournalModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingJournal(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "journal",
          crudMode: journalMode,
          id: editingJournal?.id,
          itemLabel: editingJournal?.journal_number || editingJournal?.description || undefined,
        }}
        title={journalMode === "create" ? "Create Manual Journal" : "Edit Journal"}
        icon={<CalculateIcon />}
        mode={journalMode}
        maxWidth="lg"
      >
        <ManualJournalForm
          journal={editingJournal}
          mode={journalMode}
          onSave={handleSaveJournal}
        />
      </CRUDModal>

      {/* View Account Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AccountBalance color="primary" />
              <Typography variant="h6">Account Details</Typography>
            </Box>
            <IconButton onClick={() => setIsViewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewingAccount && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Code
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.code}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Name
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Type
                </Typography>
                <Chip
                  label={viewingAccount.type}
                  color={
                    viewingAccount.type === "asset" ? "success" :
                    viewingAccount.type === "liability" ? "error" :
                    viewingAccount.type === "equity" ? "primary" :
                    viewingAccount.type === "revenue" ? "info" :
                    "warning"
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Category
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.category}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Balance
                </Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  color={viewingAccount.balance < 0 ? "error.main" : "success.main"}
                >
                  ${viewingAccount.balance.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={viewingAccount.isArchived ? "Archived" : "Active"}
                  color={viewingAccount.isArchived ? "default" : "success"}
                  size="small"
                />
              </Grid>
              {viewingAccount.description && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewingAccount.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (viewingAccount) {
                setIsViewDialogOpen(false)
                handleOpenEditModal(viewingAccount)
              }
            }}
            disabled={!canMutate}
          >
            Edit Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ mt: 1 }}
      >
        <MenuItem onClick={() => selectedAccount && handleOpenViewDialog(selectedAccount)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedAccount && handleOpenEditModal(selectedAccount)} disabled={!canMutate}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit Account
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedAccount && handleDeleteAccountAction(selectedAccount)} 
          sx={{ color: "error.main" }}
          disabled={!canRemove}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete Account
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Accounting
