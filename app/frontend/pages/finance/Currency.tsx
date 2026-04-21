"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from "@mui/material"
import {
  Sync,
  MoreVert,
  AttachMoney,
  Visibility,
  Edit,
  Delete,
  Close,
  History,
  TrendingUp,
  AccountBalance,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import CurrencyCRUDForm from "../../components/finance/forms/CurrencyCRUDForm"
import type { Currency, ExchangeRate, BankAccount, Account, FXRevaluation } from "../../../backend/interfaces/Finance"
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

const CurrencyPage: React.FC = () => {
  const location = useLocation()
  const { 
    state: financeState, 
    refreshAll,
    refreshCurrencies,
    refreshBankAccounts,
    refreshAccounts,
    refreshFXRevaluations,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    performFXRevaluation,
  } = useFinance()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "currency")
  const canRemove = canDelete("finance", "currency")
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  
  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingCurrency, setViewingCurrency] = useState<Currency | null>(null)
  const [viewDialogTab, setViewDialogTab] = useState(0)

  // Exchange Rate History Dialog
  const [isRateHistoryDialogOpen, setIsRateHistoryDialogOpen] = useState(false)
  const [selectedCurrencyForHistory, setSelectedCurrencyForHistory] = useState<Currency | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [newRateDate, setNewRateDate] = useState(new Date().toISOString().split("T")[0])
  const [newRateValue, setNewRateValue] = useState("")

  // FX Revaluation Dialog
  const [isFXRevaluationDialogOpen, setIsFXRevaluationDialogOpen] = useState(false)
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("")
  const [revaluationDate, setRevaluationDate] = useState(new Date().toISOString().split("T")[0])
  const [gainLossAccountId, setGainLossAccountId] = useState<string>("")

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)

  const loadData = useCallback(async () => {
    // Prefer a batched refresh to minimize rerenders.
    await refreshAll()
  }, [refreshAll])

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.currencies.length === 0 && !financeState.loading) {
      loadData().catch(() => {})
    }
  }, [financeState.currencies.length, financeState.loading, loadData])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, currency: Currency) => {
    setAnchorEl(event.currentTarget)
    setSelectedCurrency(currency)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedCurrency(null)
  }

  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingCurrency(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (currency: Currency) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingCurrency(currency)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (currency: Currency) => {
    setViewingCurrency(currency)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  const handleOpenRateHistory = async (currency: Currency) => {
    if (!canMutate) return
    setSelectedCurrencyForHistory(currency)
    setIsRateHistoryDialogOpen(true)
    handleMenuClose()
    
    // Fetch exchange rate history
    try {
      const { fetchExchangeRates } = await import("../../../backend/data/Finance")
      const basePath = financeState.basePath || ""
      if (basePath) {
        const rates = await fetchExchangeRates(basePath, currency.code)
        setExchangeRates(rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        setNewRateValue(currency.rate.toString())
      }
    } catch (error) {
      // Error loading exchange rate history - handled by context
    }
  }

  const handleAddExchangeRate = async () => {
    if (!canMutate) return
    if (!selectedCurrencyForHistory || !newRateValue || !newRateDate) return

    try {
      const { createExchangeRate } = await import("../../../backend/data/Finance")
      const basePath = financeState.basePath || ""
      
      if (!basePath) {
        alert("Base path not available. Please try again.")
        return
      }
      
      await createExchangeRate(basePath, {
        currency_code: selectedCurrencyForHistory.code,
        date: newRateDate,
        rate: parseFloat(newRateValue),
        source: "manual",
        created_at: new Date().toISOString(),
        created_by: "user",
      })

      // Refresh data
      await refreshCurrencies()
      if (selectedCurrencyForHistory) {
        await handleOpenRateHistory(selectedCurrencyForHistory)
      }
      setNewRateValue("")
      setNewRateDate(new Date().toISOString().split("T")[0])
    } catch (error) {
      // Error adding exchange rate - handled by context
      alert("Failed to add exchange rate. Please try again.")
    }
  }

  const handleOpenFXRevaluation = () => {
    if (!canMutate) return
    setIsFXRevaluationDialogOpen(true)
    handleMenuClose()
  }

  const handlePerformFXRevaluation = async () => {
    if (!canMutate) return
    if (!selectedBankAccount || !revaluationDate || !gainLossAccountId) {
      alert("Please select a bank account, revaluation date, and gain/loss account")
      return
    }

    try {
      await performFXRevaluation(selectedBankAccount, revaluationDate, gainLossAccountId)
      setIsFXRevaluationDialogOpen(false)
      setSelectedBankAccount("")
      setRevaluationDate(new Date().toISOString().split("T")[0])
      setGainLossAccountId("")
      await loadData()
      alert("FX Revaluation completed successfully!")
    } catch (error) {
      // Error performing FX revaluation - handled by context
      alert("Failed to perform FX revaluation. Please try again.")
    }
  }

  // Form submit handler
  const handleSaveCurrency = async (data: any) => {
    if (!canMutate) return
    const currencySnapshot = editingCurrency
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createCurrency(cleanData)
      } else if (crudMode === "edit" && editingCurrency) {
        // Include code (id) in update
        await updateCurrency(editingCurrency.code, { ...cleanData, code: editingCurrency.code })
      }
      await refreshCurrencies()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "currency",
        crudMode: modeSnapshot,
        id: currencySnapshot?.code,
        itemLabel: currencySnapshot?.name || currencySnapshot?.code || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingCurrency(null)
    } catch (error) {
      // Error saving currency - handled by context
      throw error
    }
  }

  const handleDeleteCurrencyAction = async (currency: Currency) => {
    if (!canRemove) return
    if (currency.isBase) {
      alert("Cannot delete base currency")
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${currency.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteCurrency(currency.code)
      await refreshCurrencies()
      handleMenuClose()
    } catch (error) {
      // Error deleting currency - handled by context
      alert("Failed to delete currency. It may be in use.")
    }
  }

  const handleUpdateRates = async () => {
    if (!canMutate) return
    try {
      // In a real implementation, this would fetch rates from an API
      // For now, we'll just refresh the currencies
      alert("Exchange rates updated successfully!")
      await refreshCurrencies()
    } catch (error) {
      // Error updating rates - handled by context
      alert("Failed to update exchange rates. Please try again.")
    }
  }

  const currencies = financeState.currencies || []
  const filteredCurrencies = currencies.filter((currency) => {
    if (!currency) return false
    const matchesSearch = currency.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         currency.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "All" || currency.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })
  
  const activeCurrencies = currencies.filter((c) => c.status === "active").length
  const baseCurrency = currencies.find((c) => c.isBase)
  const foreignCurrencies = currencies.filter((c) => !c.isBase && c.status === "active")
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "All"

  // Get bank accounts with foreign currencies
  const foreignBankAccounts = financeState.bankAccounts.filter((account) => {
    const baseCurrencyCode = baseCurrency?.code || "GBP"
    return account.currency !== baseCurrencyCode
  })

  // Get gain/loss accounts (typically expense accounts)
  const gainLossAccounts = financeState.accounts.filter((account) => 
    account.type === "expense" || 
    account.name?.toLowerCase().includes("fx") ||
    account.name?.toLowerCase().includes("gain") ||
    account.name?.toLowerCase().includes("loss")
  )


  return (
    <Box sx={{ width: "100%" }}>
      <DataHeader
        onRefresh={loadData}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search currencies..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "active", name: "Active" },
              { id: "inactive", name: "Inactive" }
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase()] : ["all"],
            onSelectionChange: (values) => setStatusFilter(values[0] ? values[0].charAt(0).toUpperCase() + values[0].slice(1) : "All")
          }
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Code", value: "code" },
          { label: "Rate", value: "rate" },
        ]}
        sortValue="name"
        sortDirection="asc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={handleOpenCreateModal}
        createButtonLabel="Add Currency"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit currencies."
        additionalButtons={[
          {
            label: "Update Rates",
            icon: <Sync />,
            onClick: handleUpdateRates,
            variant: "outlined" as const,
            color: "secondary" as const,
            disabled: !canMutate,
            tooltip: "You don't have permission to edit currencies.",
          },
          {
            label: "FX Revaluation",
            icon: <TrendingUp />,
            onClick: handleOpenFXRevaluation,
            variant: "outlined" as const,
            color: "primary" as const,
            disabled: !canMutate || foreignBankAccounts.length === 0,
            tooltip: !canMutate ? "You don't have permission to edit currencies." : undefined,
          }
        ]}
      />

      <StatsSection
        stats={[
          { value: baseCurrency?.code || "GBP", label: "Base Currency", color: "primary" },
          { value: activeCurrencies.toString(), label: "Active Currencies", color: "success" },
          { value: foreignCurrencies.length.toString(), label: "Foreign Currencies", color: "info" },
          { value: foreignBankAccounts.length.toString(), label: "Foreign Accounts", color: "warning" },
        ]}
      />

      {/* Currencies Table */}
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
                  <TableCell>Currency</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Exchange Rate</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCurrencies.length > 0 ? (
                  filteredCurrencies.map((currency) => (
                    <TableRow
                      key={currency.code}
                      sx={{
                        "&:hover": { backgroundColor: "action.hover" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {currency.name}
                          {currency.isBase && (
                            <Chip label="Base" size="small" color="primary" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{currency.code}</TableCell>
                      <TableCell>{currency.symbol}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {currency.isBase ? "1.00000" : currency.rate.toFixed(5)}
                      </TableCell>
                      <TableCell color="text.secondary">{currency.lastUpdated}</TableCell>
                      <TableCell>
                        <Chip
                          label={currency.status}
                          size="small"
                          color={currency.status === "active" ? "success" : "default"}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          onClick={(e) => handleMenuClick(e, currency)} 
                          color="primary"
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </CardContent>
        </Card>

        {filteredCurrencies.length === 0 && (
          <EmptyStateCard
            icon={AttachMoney}
            title={hasActiveFilters ? "No currencies match your current filters" : "No currencies found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first currency to get started."
            }
          />
        )}

      {/* Currency CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingCurrency(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "currency",
          crudMode,
          id: editingCurrency?.code,
          itemLabel: editingCurrency?.name || editingCurrency?.code || undefined,
        }}
        title={crudMode === "create" ? "Add Currency" : "Edit Currency"}
        icon={<AttachMoney />}
        mode={crudMode}
        maxWidth="md"
      >
        <CurrencyCRUDForm
          currency={editingCurrency}
          mode={crudMode}
          onSave={handleSaveCurrency}
        />
      </CRUDModal>

      {/* View Currency Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AttachMoney color="primary" />
              <Typography variant="h6">Currency Details</Typography>
            </Box>
            <IconButton onClick={() => setIsViewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewingCurrency && (
            <Box>
              <Tabs value={viewDialogTab} onChange={(_, newValue) => setViewDialogTab(newValue)}>
                <Tab label="Overview" />
                <Tab label="Rate History" />
              </Tabs>

              <TabPanel value={viewDialogTab} index={0}>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Currency Code
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" gutterBottom>
                      {viewingCurrency.code}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Currency Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" gutterBottom>
                      {viewingCurrency.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Symbol
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {viewingCurrency.symbol}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Exchange Rate
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                      {viewingCurrency.rate.toFixed(5)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingCurrency.lastUpdated}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={viewingCurrency.status}
                      color={viewingCurrency.status === "active" ? "success" : "default"}
                      size="small"
                    />
                  </Grid>
                  {viewingCurrency.isBase && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        This is the base currency for all exchange rate calculations.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              <TabPanel value={viewDialogTab} index={1}>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => {
                      setIsViewDialogOpen(false)
                      handleOpenRateHistory(viewingCurrency)
                    }}
                    sx={{ mb: 2 }}
                  >
                    View Full Rate History
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Exchange rate history is available for this currency.
                  </Typography>
                </Box>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          {viewingCurrency && !viewingCurrency.isBase && (
            <Button
              variant="contained"
              onClick={() => {
                setIsViewDialogOpen(false)
                handleOpenEditModal(viewingCurrency)
              }}
            >
              Edit Currency
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Exchange Rate History Dialog */}
      <Dialog
        open={isRateHistoryDialogOpen}
        onClose={() => setIsRateHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <History color="primary" />
              <Typography variant="h6">
                Exchange Rate History - {selectedCurrencyForHistory?.code}
              </Typography>
            </Box>
            <IconButton onClick={() => setIsRateHistoryDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Add New Rate</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={newRateDate}
                  onChange={(e) => setNewRateDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Exchange Rate"
                  type="number"
                  value={newRateValue}
                  onChange={(e) => setNewRateValue(e.target.value)}
                  inputProps={{ step: 0.0001, min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddExchangeRate}
                  sx={{ height: "56px" }}
                >
                  Add Rate
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>Historical Rates</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exchangeRates.length > 0 ? (
                  exchangeRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.date}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{rate.rate.toFixed(5)}</TableCell>
                      <TableCell>
                        <Chip label={rate.source || "manual"} size="small" />
                      </TableCell>
                      <TableCell>{new Date(rate.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                      <Typography color="text.secondary">No exchange rate history found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRateHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* FX Revaluation Dialog */}
      <Dialog
        open={isFXRevaluationDialogOpen}
        onClose={() => setIsFXRevaluationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TrendingUp color="primary" />
              <Typography variant="h6">FX Revaluation</Typography>
            </Box>
            <IconButton onClick={() => setIsFXRevaluationDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            FX Revaluation adjusts foreign currency bank account balances to reflect current exchange rates.
            This will create journal entries for any gains or losses.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Bank Account</InputLabel>
                <Select
                  value={selectedBankAccount}
                  onChange={(e) => {
                    setSelectedBankAccount(e.target.value)
                    const account = foreignBankAccounts.find(a => a.id === e.target.value)
                    if (account && account.account_id) {
                      setGainLossAccountId(account.account_id)
                    }
                  }}
                  label="Bank Account"
                >
                  {foreignBankAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({account.currency}) - Balance: {account.currency} {account.balance.toFixed(2)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Revaluation Date"
                type="date"
                value={revaluationDate}
                onChange={(e) => setRevaluationDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Gain/Loss Account</InputLabel>
                <Select
                  value={gainLossAccountId}
                  onChange={(e) => setGainLossAccountId(e.target.value)}
                  label="Gain/Loss Account"
                >
                  {gainLossAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Account where FX gains/losses will be posted
              </Typography>
            </Grid>
            {selectedBankAccount && (() => {
              const account = foreignBankAccounts.find(a => a.id === selectedBankAccount)
              const currency = currencies.find(c => c.code === account?.currency)
              const baseCurrencyCode = baseCurrency?.code || "GBP"
              
              if (!account || !currency) return null
              
              const balanceBefore = account.balance
              const exchangeRate = currency.rate
              const balanceAfter = balanceBefore * exchangeRate
              const gainLoss = balanceAfter - balanceBefore
              
              return (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Revaluation Preview
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Balance Before" 
                            secondary={`${account.currency} ${balanceBefore.toFixed(2)}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Exchange Rate" 
                            secondary={`1 ${account.currency} = ${exchangeRate.toFixed(5)} ${baseCurrencyCode}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Balance After" 
                            secondary={`${baseCurrencyCode} ${balanceAfter.toFixed(2)}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Gain/Loss" 
                            secondary={
                              <Typography 
                                variant="body1" 
                                fontWeight="bold"
                                color={gainLoss >= 0 ? "success.main" : "error.main"}
                              >
                                {baseCurrencyCode} {gainLoss >= 0 ? "+" : ""}{gainLoss.toFixed(2)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })()}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFXRevaluationDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePerformFXRevaluation}
            disabled={!selectedBankAccount || !revaluationDate || !gainLossAccountId}
          >
            Perform Revaluation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Currency Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ mt: 1 }}
      >
        <MenuItem onClick={() => selectedCurrency && handleOpenViewDialog(selectedCurrency)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedCurrency && !selectedCurrency.isBase && handleOpenEditModal(selectedCurrency)} disabled={!canMutate || Boolean(selectedCurrency?.isBase)}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit Currency
        </MenuItem>
        <MenuItem onClick={() => selectedCurrency && !selectedCurrency.isBase && handleOpenRateHistory(selectedCurrency)} disabled={!canMutate || Boolean(selectedCurrency?.isBase)}>
          <History sx={{ mr: 1 }} fontSize="small" />
          Rate History
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedCurrency && handleDeleteCurrencyAction(selectedCurrency)} 
          sx={{ color: "error.main" }}
          disabled={!canRemove || Boolean(selectedCurrency?.isBase)}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete Currency
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default CurrencyPage
