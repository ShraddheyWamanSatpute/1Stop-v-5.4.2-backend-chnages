"use client"

import React, { useCallback, useState, useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  Checkbox,
  FormControlLabel,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import {
  MoreVert,
  Visibility,
  VisibilityOff,
  Sync,
  Edit,
  Delete,
  AccountBalance,
  Close,
  CheckCircle,
  Download,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import BankAccountCRUDForm from "../../components/finance/forms/BankAccountCRUDForm"
import BankRuleCRUDForm from "../../components/finance/forms/BankRuleCRUDForm"
import BankTransferForm from "../../components/finance/forms/BankTransferForm"
import ClearingAccountCRUDForm from "../../components/finance/forms/ClearingAccountCRUDForm"
import StatementImportForm from "../../components/finance/forms/StatementImportForm"
import type { 
  BankAccount, 
  BankStatement, 
  BankRule, 
  BankTransfer, 
  ClearingAccount, 
  FXRevaluation 
} from "../../../backend/interfaces/Finance"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"
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

const Banking = () => {
  const [showBalances, setShowBalances] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState(0)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  
  const { 
    state: financeState, 
    refreshAll,
    refreshBankAccounts, 
    refreshTransactions,
    refreshBankReconciliations,
    refreshBankStatements,
    refreshBankRules,
    refreshBankTransfers,
    refreshClearingAccounts,
    refreshFXRevaluations,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    createBankStatement,
    importBankStatements,
    autoMatchStatements,
    manualMatchStatement,
    codeUncategorizedTransaction,
    createBankRule,
    updateBankRule,
    deleteBankRule,
    createBankTransfer,
    updateBankTransfer,
    deleteBankTransfer,
    createClearingAccount,
    updateClearingAccount,
    deleteClearingAccount,
    performFXRevaluation,
    startReconciliation,
    reconcileTransaction,
  } = useFinance()

  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "banking")
  const canRemove = canDelete("finance", "banking")
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)

  // Bank Rule CRUD Modal states
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [ruleMode, setRuleMode] = useState<"create" | "edit">("create")
  const [editingRule, setEditingRule] = useState<BankRule | null>(null)

  // Bank Transfer CRUD Modal states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferMode, setTransferMode] = useState<"create" | "edit">("create")
  const [editingTransfer, setEditingTransfer] = useState<BankTransfer | null>(null)

  // Clearing Account CRUD Modal states
  const [isClearingModalOpen, setIsClearingModalOpen] = useState(false)
  const [clearingMode, setClearingMode] = useState<"create" | "edit">("create")
  const [editingClearing, setEditingClearing] = useState<ClearingAccount | null>(null)

  // Statement Import Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importAccountId, setImportAccountId] = useState("")

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingAccount, setViewingAccount] = useState<BankAccount | null>(null)

  // Reconciliation Dialog state
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false)
  const [reconcilingAccount, setReconcilingAccount] = useState<BankAccount | null>(null)
  const [statementBalance, setStatementBalance] = useState("")
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.bankAccounts.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.bankAccounts.length, financeState.loading, loadData])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create") return

    if (entity === "bankAccount") {
      handleOpenCreateModal()
    } else if (entity === "bankRule") {
      handleOpenCreateRuleModal()
    } else if (entity === "bankTransfer") {
      handleOpenCreateTransferModal()
    } else if (entity === "clearingAccount") {
      handleOpenCreateClearingModal()
    } else if (entity === "statementImport") {
      handleOpenImportModal()
    } else {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, account: BankAccount) => {
    setAnchorEl(event.currentTarget)
    setSelectedAccount(account)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedAccount(null)
  }

  // Date filtering helper for transactions (currently disabled - no date controls)
  const isDateInRange = (_date: string) => {
    return true // No date filtering when date controls are disabled
  }

  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingAccount(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (account: BankAccount) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingAccount(account)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (account: BankAccount) => {
    setViewingAccount(account)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  // Form submit handler
  const handleSaveBankAccount = async (data: any) => {
    const accountSnapshot = editingAccount
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createBankAccount(cleanData)
      } else if (crudMode === "edit" && editingAccount) {
        // Include id in update
        await updateBankAccount(editingAccount.id, { ...cleanData, id: editingAccount.id })
      }
      await refreshBankAccounts()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bankAccount",
        crudMode: modeSnapshot,
        id: accountSnapshot?.id,
        itemLabel: accountSnapshot?.name || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingAccount(null)
    } catch (error) {
      // Error saving bank account - handled by context
      throw error
    }
  }

  const handleDeleteAccount = async (account: BankAccount) => {
    if (!canRemove) return
    if (!window.confirm(`Are you sure you want to delete ${account.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteBankAccount(account.id)
      await refreshBankAccounts()
      handleMenuClose()
    } catch (error) {
      // Error deleting bank account - handled by context
      alert("Failed to delete account. It may have associated transactions.")
    }
  }

  // Bank Rule Handlers
  const handleOpenCreateRuleModal = () => {
    setRuleMode("create")
    setEditingRule(null)
    setIsRuleModalOpen(true)
  }

  const handleOpenEditRuleModal = (rule: BankRule) => {
    setRuleMode("edit")
    setEditingRule(rule)
    setIsRuleModalOpen(true)
  }

  const handleSaveBankRule = async (data: any) => {
    const ruleSnapshot = editingRule
    const ruleModeSnapshot = ruleMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (ruleMode === "create") {
        await createBankRule(cleanData)
      } else if (ruleMode === "edit" && editingRule) {
        // Include id in update
        await updateBankRule(editingRule.id, { ...cleanData, id: editingRule.id })
      }
      await refreshBankRules()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bankRule",
        crudMode: ruleModeSnapshot,
        id: ruleSnapshot?.id,
        itemLabel: ruleSnapshot?.name || undefined,
      })
      setIsRuleModalOpen(false)
      setEditingRule(null)
    } catch (error) {
      // Error saving bank rule - handled by context
      throw error
    }
  }

  const handleDeleteRule = async (rule: BankRule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.name}"?`)) {
      return
    }
    try {
      await deleteBankRule(rule.id)
      await refreshBankRules()
    } catch (error) {
      // Error deleting bank rule - handled by context
      alert("Failed to delete rule.")
    }
  }

  // Bank Transfer Handlers
  const handleOpenCreateTransferModal = () => {
    setTransferMode("create")
    setEditingTransfer(null)
    setIsTransferModalOpen(true)
  }

  const handleOpenEditTransferModal = (transfer: BankTransfer) => {
    setTransferMode("edit")
    setEditingTransfer(transfer)
    setIsTransferModalOpen(true)
  }

  const handleSaveBankTransfer = async (data: any) => {
    const transferSnapshot = editingTransfer
    const transferModeSnapshot = transferMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (transferMode === "create") {
        await createBankTransfer(cleanData)
      } else if (transferMode === "edit" && editingTransfer) {
        // Include id in update
        await updateBankTransfer(editingTransfer.id, { ...cleanData, id: editingTransfer.id })
      }
      await refreshBankTransfers()
      await refreshBankAccounts()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "bankTransfer",
        crudMode: transferModeSnapshot,
        id: transferSnapshot?.id,
        itemLabel: transferSnapshot?.reference || transferSnapshot?.description || transferSnapshot?.id || undefined,
      })
      setIsTransferModalOpen(false)
      setEditingTransfer(null)
    } catch (error) {
      // Error saving bank transfer - handled by context
      throw error
    }
  }

  // Clearing Account Handlers
  const handleOpenCreateClearingModal = () => {
    setClearingMode("create")
    setEditingClearing(null)
    setIsClearingModalOpen(true)
  }

  const handleOpenEditClearingModal = (clearing: ClearingAccount) => {
    setClearingMode("edit")
    setEditingClearing(clearing)
    setIsClearingModalOpen(true)
  }

  const handleSaveClearingAccount = async (data: any) => {
    const clearingSnapshot = editingClearing
    const clearingModeSnapshot = clearingMode
    try {
      if (clearingMode === "create") {
        await createClearingAccount(data)
      } else if (clearingMode === "edit" && editingClearing) {
        await updateClearingAccount(editingClearing.id, data)
      }
      await refreshClearingAccounts()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "clearingAccount",
        crudMode: clearingModeSnapshot,
        id: clearingSnapshot?.id,
        itemLabel: clearingSnapshot?.name || undefined,
      })
      setIsClearingModalOpen(false)
      setEditingClearing(null)
    } catch (error) {
      // Error saving clearing account - handled by context
      throw error
    }
  }

  // Statement Import Handlers
  const handleOpenImportModal = (accountId?: string) => {
    setImportAccountId(accountId || financeState.bankAccounts[0]?.id || "")
    setIsImportModalOpen(true)
  }

  const handleImportStatements = async (statements: Omit<BankStatement, "id" | "bank_account_id">[]) => {
    await importBankStatements(importAccountId, statements)
    await refreshBankStatements()
  }

  // Reconciliation Handlers
  const handleOpenReconciliation = (account: BankAccount) => {
    setReconcilingAccount(account)
    setStatementBalance("")
    setStatementDate(new Date().toISOString().split('T')[0])
    setSelectedTransactions(new Set())
    setIsReconcileDialogOpen(true)
    handleMenuClose()
  }

  const handleToggleTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleStartReconciliation = async () => {
    if (!reconcilingAccount) return

    try {
      await startReconciliation(
        reconcilingAccount.id,
        new Date(statementDate),
        parseFloat(statementBalance),
        "Current User" // In production, use actual user name
      )
      
      // Mark selected transactions as reconciled
      for (const transactionId of selectedTransactions) {
        await reconcileTransaction(transactionId, `STMT-${Date.now()}`)
      }
      
      await Promise.all([
        refreshBankAccounts(),
        refreshTransactions(),
        refreshBankReconciliations(),
      ])
      
      setIsReconcileDialogOpen(false)
      alert("Reconciliation completed successfully!")
    } catch (error) {
      // Error during reconciliation - handled by context
      alert("Failed to complete reconciliation. Please try again.")
    }
  }

  const filteredAccounts = financeState.bankAccounts.filter(
    (account) => {
      if (!account) return false
      return account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             account.bank?.toLowerCase().includes(searchTerm.toLowerCase())
    }
  )

  const filteredTransactions = financeState.transactions.filter(
    (transaction) => transaction && isDateInRange(transaction.date)
  )

  const totalBalance = financeState.bankAccounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  const hasActiveFilters = searchTerm !== ""

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
        onCreateNew={handleOpenCreateModal}
        createButtonLabel="Add Account"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit banking data."
        additionalButtons={[
          {
            label: showBalances ? "Hide Balances" : "Show Balances",
            icon: showBalances ? <VisibilityOff /> : <Visibility />,
            onClick: () => setShowBalances(!showBalances),
            variant: "outlined" as const,
            color: "secondary" as const
          }
        ]}
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
              Accounts
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
              Transactions
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
              Statements
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
              Rules
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
              Transfers
            </Button>
            <Button
              variant={activeTab === 5 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(5)}
              sx={
                activeTab === 5
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
              Reconciliation
            </Button>
          </Box>
        }
      />
        {/* All summary cards and TabPanels below are inside this parent Box */}


      <StatsSection
        stats={[
          { value: financeState.bankAccounts.length.toString(), label: "Total Accounts", color: "primary" },
          { value: showBalances ? `£${totalBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••", label: "Total Balance", color: "success" },
          { value: financeState.bankAccounts.filter(acc => acc.status === "active").length.toString(), label: "Active Accounts", color: "success" },
          { value: new Set(financeState.bankAccounts.map(acc => acc.bank)).size.toString(), label: "Banks", color: "info" },
        ]}
      />

      <TabPanel value={activeTab} index={0}>
        <Box>
          <Card>
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
                      <TableCell>Bank</TableCell>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Account Number</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Status</TableCell>
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
                          <TableCell sx={{ fontWeight: 500 }}>{account.bank}</TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>
                            {showBalances ? account.accountNumber : "••••" + account.accountNumber.slice(-4)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={account.type}
                              size="small"
                              color={
                                account.type === "checking" ? "primary" :
                                account.type === "savings" ? "success" :
                                account.type === "credit" ? "error" :
                                "secondary"
                              }
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: account.balance < 0 ? "error.main" : "inherit" }}>
                            {showBalances ? `£${account.balance.toLocaleString()}` : "••••••"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={account.status}
                              size="small"
                              variant="outlined"
                              color={
                                account.status === "active" ? "success" :
                                account.status === "inactive" ? "default" :
                                "warning"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton onClick={(e) => handleMenuClick(e, account)} color="primary">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {filteredAccounts.length === 0 && (
            <EmptyStateCard
              icon={AccountBalance}
              title={hasActiveFilters ? "No accounts match your current filters" : "No bank accounts found"}
              description={
                hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first bank account to get started."
              }
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box>
          <Card sx={{ 
            boxShadow: 3,
            borderRadius: 2
          }}>
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
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          sx={{
                            "&:hover": { backgroundColor: "action.hover" },
                          }}
                        >
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{transaction.description}</TableCell>
                          <TableCell>-</TableCell>
                          
                          <TableCell>
                            <Chip
                              label={transaction.type === "sale" ? "Income" : transaction.type === "purchase" ? "Expense" : transaction.type}
                              size="small"
                              variant="outlined"
                              color={transaction.type === "sale" ? "success" : transaction.type === "purchase" ? "error" : "default"}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: transaction.type === "sale" ? "success.main" : "error.main" }}>
                            ${Math.abs(transaction.totalAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={transaction.status === "completed" ? "success" : "warning"}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton color="primary">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {filteredTransactions.length === 0 && (
            <EmptyStateCard
              icon={Sync}
              title="No transactions found"
              description="Transactions will appear here once you start recording banking activity."
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6">Bank Statements</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Sync />}
                    onClick={() => {
                      const accountId = financeState.bankAccounts[0]?.id
                      if (accountId) autoMatchStatements(accountId)
                    }}
                  >
                    Auto-Match
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small" 
                    startIcon={<Download />}
                    onClick={() => handleOpenImportModal()}
                  >
                    Import Statements
                  </Button>
                </Box>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financeState.bankStatements.length > 0 ? (
                      financeState.bankStatements.map((statement) => (
                        <TableRow key={statement.id}>
                          <TableCell>{statement.date}</TableCell>
                          <TableCell>{statement.description}</TableCell>
                          <TableCell sx={{ color: statement.type === "debit" ? "error.main" : "success.main" }}>
                            {statement.currency} {Math.abs(statement.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip label={statement.type} size="small" color={statement.type === "debit" ? "error" : "success"} />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={statement.reconciled ? "Reconciled" : "Unmatched"} 
                              size="small" 
                              color={statement.reconciled ? "success" : "warning"} 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {financeState.bankStatements.length === 0 && (
            <EmptyStateCard
              icon={Download}
              title="No bank statements found"
              description="Import bank statements to start reconciling your accounts."
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Box>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6">Bank Rules</Typography>
                <Button variant="contained" size="small" onClick={handleOpenCreateRuleModal}>
                  Create Rule
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Conditions</TableCell>
                      <TableCell>Target Account</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financeState.bankRules.length > 0 ? (
                      financeState.bankRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>{rule.name}</TableCell>
                          <TableCell>
                            {rule.conditions.description_contains?.join(", ") || "Custom"}
                          </TableCell>
                          <TableCell>{rule.target_account}</TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            <Chip 
                              label={rule.is_active ? "Active" : "Inactive"} 
                              size="small" 
                              color={rule.is_active ? "success" : "default"} 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                const menuEl = e.currentTarget
                                // Simple menu for edit/delete
                                const action = window.confirm(`Edit rule "${rule.name}"?`) ? 'edit' : 
                                              window.confirm(`Delete rule "${rule.name}"?`) ? 'delete' : null
                                if (action === 'edit') handleOpenEditRuleModal(rule)
                                if (action === 'delete') handleDeleteRule(rule)
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {financeState.bankRules.length === 0 && (
            <EmptyStateCard
              icon={CheckCircle}
              title="No bank rules found"
              description="Create bank rules to automatically categorize transactions."
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Box>
          <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6">Bank Transfers</Typography>
                <Button variant="contained" size="small" onClick={handleOpenCreateTransferModal}>
                  New Transfer
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>From Account</TableCell>
                      <TableCell>To Account</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financeState.bankTransfers.length > 0 ? (
                      financeState.bankTransfers.map((transfer) => {
                        const fromAccount = financeState.bankAccounts.find(a => a.id === transfer.from_account_id)
                        const toAccount = financeState.bankAccounts.find(a => a.id === transfer.to_account_id)
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell>{transfer.date}</TableCell>
                            <TableCell>{fromAccount?.name || transfer.from_account_id}</TableCell>
                            <TableCell>{toAccount?.name || transfer.to_account_id}</TableCell>
                            <TableCell>{transfer.currency} {transfer.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip 
                                label={transfer.status} 
                                size="small" 
                                color={transfer.status === "completed" ? "success" : "warning"} 
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small">
                                <MoreVert />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {financeState.bankTransfers.length === 0 && (
            <EmptyStateCard
              icon={Sync}
              title="No bank transfers found"
              description="Create your first bank transfer to get started."
            />
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <Box>
          <Card sx={{ 
            boxShadow: 3,
            borderRadius: 2
          }}>
            <CardContent>
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Sync sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Start Reconciliation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Compare your records with bank statements to ensure accuracy
                </Typography>
                <Button variant="contained" startIcon={<Sync />} color="primary">
                  Begin Reconciliation
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>
      
      {/* Bank Account CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingAccount(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bankAccount",
          crudMode,
          id: editingAccount?.id,
          itemLabel: editingAccount?.name || undefined,
        }}
        title={crudMode === "create" ? "Add Bank Account" : "Edit Bank Account"}
        icon={<AccountBalance />}
        mode={crudMode}
        maxWidth="md"
      >
        <BankAccountCRUDForm
          bankAccount={editingAccount}
          mode={crudMode}
          onSave={handleSaveBankAccount}
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
                  Bank Name
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.bank}
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
                  Account Number
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.accountNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Type
                </Typography>
                <Chip
                  label={viewingAccount.type}
                  color={
                    viewingAccount.type === "checking" ? "primary" :
                    viewingAccount.type === "savings" ? "success" :
                    viewingAccount.type === "credit" ? "error" :
                    "secondary"
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Currency
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingAccount.currency}
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
                  label={viewingAccount.status}
                  color={
                    viewingAccount.status === "active" ? "success" :
                    viewingAccount.status === "inactive" ? "default" :
                    "warning"
                  }
                  size="small"
                />
              </Grid>
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
          >
            Edit Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog
        open={isReconcileDialogOpen}
        onClose={() => setIsReconcileDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Sync color="primary" />
              <Typography variant="h6">Bank Reconciliation</Typography>
            </Box>
            <IconButton onClick={() => setIsReconcileDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {reconcilingAccount && (
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Account: {reconcilingAccount.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Current Balance: ${reconcilingAccount.balance.toLocaleString()}
              </Typography>

              <Stack spacing={3}>
                <TextField
                  label="Statement Date"
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Statement Balance"
                  type="number"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  fullWidth
                  helperText="Enter the closing balance from your bank statement"
                />

                <Divider />

                <Typography variant="subtitle2" fontWeight="medium">
                  Select Transactions to Reconcile
                </Typography>

                <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                  {filteredTransactions
                    .filter(t => !t.reconciledAt)
                    .map((transaction) => (
                      <FormControlLabel
                        key={transaction.id}
                        control={
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onChange={() => handleToggleTransaction(transaction.id)}
                          />
                        }
                        label={
                          <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                            <Box>
                              <Typography variant="body2">{transaction.description}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {transaction.date}
                              </Typography>
                            </Box>
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              color={transaction.type === "sale" ? "success.main" : "error.main"}
                            >
                              ${Math.abs(transaction.totalAmount || 0).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: "100%", mb: 1 }}
                      />
                    ))}
                </Box>

                <Box sx={{ bgcolor: "background.default", p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Selected Transactions: {selectedTransactions.size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Statement Balance: ${parseFloat(statementBalance || "0").toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsReconcileDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartReconciliation}
            disabled={!statementBalance || selectedTransactions.size === 0}
            startIcon={<CheckCircle />}
          >
            Complete Reconciliation
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Bank Rule CRUD Modal */}
      <CRUDModal
        open={isRuleModalOpen}
        onClose={(reason) => {
          setIsRuleModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingRule(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bankRule",
          crudMode: ruleMode,
          id: editingRule?.id,
          itemLabel: editingRule?.name || undefined,
        }}
        title={ruleMode === "create" ? "Create Bank Rule" : "Edit Bank Rule"}
        icon={<Sync />}
        mode={ruleMode}
        maxWidth="md"
      >
        <BankRuleCRUDForm
          bankRule={editingRule}
          mode={ruleMode}
          onSave={handleSaveBankRule}
        />
      </CRUDModal>

      {/* Bank Transfer Modal */}
      <CRUDModal
        open={isTransferModalOpen}
        onClose={(reason) => {
          setIsTransferModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingTransfer(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "bankTransfer",
          crudMode: transferMode,
          id: editingTransfer?.id,
          itemLabel: editingTransfer?.reference || editingTransfer?.description || editingTransfer?.id || undefined,
        }}
        title={transferMode === "create" ? "Create Bank Transfer" : "Edit Bank Transfer"}
        icon={<Sync />}
        mode={transferMode}
        maxWidth="md"
      >
        <BankTransferForm
          bankTransfer={editingTransfer}
          mode={transferMode}
          onSave={handleSaveBankTransfer}
        />
      </CRUDModal>

      {/* Clearing Account Modal */}
      <CRUDModal
        open={isClearingModalOpen}
        onClose={(reason) => {
          setIsClearingModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingClearing(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "clearingAccount",
          crudMode: clearingMode,
          id: editingClearing?.id,
          itemLabel: editingClearing?.name || undefined,
        }}
        title={clearingMode === "create" ? "Create Clearing Account" : "Edit Clearing Account"}
        icon={<AccountBalance />}
        mode={clearingMode}
        maxWidth="md"
      >
        <ClearingAccountCRUDForm
          clearingAccount={editingClearing}
          mode={clearingMode}
          onSave={handleSaveClearingAccount}
        />
      </CRUDModal>

      {/* Statement Import Modal */}
      <Dialog
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Download color="primary" />
              <Typography variant="h6">Import Bank Statements</Typography>
            </Box>
            <IconButton onClick={() => setIsImportModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {importAccountId && (
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Bank Account</InputLabel>
                <Select
                  value={importAccountId}
                  onChange={(e) => setImportAccountId(e.target.value)}
                  label="Bank Account"
                >
                  {financeState.bankAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.bank})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          <StatementImportForm
            bankAccountId={importAccountId}
            onImport={handleImportStatements}
            onClose={() => setIsImportModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Account actions menu */}
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
        <MenuItem onClick={() => selectedAccount && handleOpenReconciliation(selectedAccount)}>
          <Sync sx={{ mr: 1 }} fontSize="small" />
          Reconcile
        </MenuItem>
        <MenuItem onClick={() => selectedAccount && handleOpenImportModal(selectedAccount.id)}>
          <Download sx={{ mr: 1 }} fontSize="small" />
          Import Statements
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedAccount && handleDeleteAccount(selectedAccount)} 
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
export default Banking
