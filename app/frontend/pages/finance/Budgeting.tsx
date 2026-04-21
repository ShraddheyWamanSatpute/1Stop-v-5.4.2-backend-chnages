"use client"

import { themeConfig } from "../../../theme/AppTheme";
import React, { useState, useEffect, useRef } from "react"
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
  LinearProgress,
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
  Visibility,
  Edit,
  Delete,
  Close,
  AccountBalanceWallet,
} from "@mui/icons-material"

import { useFinance } from "../../../backend/context/FinanceContext"
import DataHeader from "../../components/reusable/DataHeader"
import StatsSection from "../../components/reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../../components/reusable/CRUDModal"
import BudgetCRUDForm, { type BudgetCRUDFormRef } from "../../components/finance/forms/BudgetCRUDForm"
import type { Budget } from "../../../backend/interfaces/Finance"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../../components/reusable/EmptyStateCard"

const Budgeting: React.FC = () => {
  const { 
    state: financeState, 
    refreshBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
  } = useFinance()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("finance", "budgeting")
  const canRemove = canDelete("finance", "budgeting")
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  
  // CRUD Modal states
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState<"create" | "edit" | "view">("create")
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  // View Dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null)

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)

  // Form ref for CRUDModal integration
  const budgetFormRef = useRef<BudgetCRUDFormRef>(null)

  useEffect(() => {
    // Attempt to reload if no data and not loading
    if (financeState.budgets.length === 0 && !financeState.loading) {
      refreshBudgets().catch(() => {})
    }
  }, [financeState.budgets.length, financeState.loading, refreshBudgets])

  useEffect(() => {
    const entity = String(searchParams.get("crudEntity") || "")
    const mode = String(searchParams.get("crudMode") || "")
    if (mode !== "create" || entity !== "budget") return

    handleOpenCreateModal()
    const next = new URLSearchParams(searchParams)
    next.delete("crudEntity")
    next.delete("crudMode")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, budget: Budget) => {
    setAnchorEl(event.currentTarget)
    setSelectedBudget(budget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedBudget(null)
  }

  // CRUD Handlers
  const handleOpenCreateModal = () => {
    if (!canMutate) return
    setCrudMode("create")
    setEditingBudget(null)
    setIsCRUDModalOpen(true)
  }

  const handleOpenEditModal = (budget: Budget) => {
    if (!canMutate) return
    setCrudMode("edit")
    setEditingBudget(budget)
    setIsCRUDModalOpen(true)
    handleMenuClose()
  }

  const handleOpenViewDialog = (budget: Budget) => {
    setViewingBudget(budget)
    setIsViewDialogOpen(true)
    handleMenuClose()
  }

  // Form submit handler
  const handleSaveBudget = async (data: any) => {
    const budgetSnapshot = editingBudget
    const modeSnapshot = crudMode
    try {
      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
      
      if (crudMode === "create") {
        await createBudget(cleanData)
      } else if (crudMode === "edit" && editingBudget) {
        // Include id in update
        await updateBudget(editingBudget.id, { ...cleanData, id: editingBudget.id })
      }
      await refreshBudgets()
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "budget",
        crudMode: modeSnapshot,
        id: budgetSnapshot?.id,
        itemLabel: budgetSnapshot?.name || undefined,
      })
      setIsCRUDModalOpen(false)
      setEditingBudget(null)
    } catch (error) {
      // Error saving budget - handled by context
      throw error
    }
  }

  const handleDeleteBudgetAction = async (budget: Budget) => {
    if (!canRemove) return
    if (!window.confirm(`Are you sure you want to delete budget "${budget.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      handleMenuClose() // Close menu first
      // deleteBudget already calls refreshBudgets() internally, but we'll call it again to ensure state updates
      await deleteBudget(budget.id)
      // Additional refresh to ensure UI updates (deleteBudget already refreshes, but this ensures it)
      await refreshBudgets()
    } catch (error) {
      // Error deleting budget - handled by context
      console.error("Error deleting budget:", error)
      alert("Failed to delete budget. Please try again.")
      // Refresh anyway to ensure UI is in sync
      await refreshBudgets().catch(() => {})
    }
  }

  const budgets = financeState.budgets || []
  const filteredBudgets = budgets.filter((budget) => {
    if (!budget) return false
    const matchesSearch = budget.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         budget.budgetType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         budget.period?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "All" || budget.status === statusFilter.toLowerCase().replace(" ", "-")
    return matchesSearch && matchesStatus
  })
  
  const error = financeState.error
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "All"

  const totalBudgeted = filteredBudgets.reduce((sum, budget) => sum + (budget.budgeted || 0), 0)
  const totalActual = filteredBudgets.reduce((sum, budget) => sum + (budget.actual || 0), 0)
  const totalVariance = totalBudgeted - totalActual
  const overBudgetCount = filteredBudgets.filter((b) => b.status === "over-budget").length

  return (
    <Box sx={{ width: "100%" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      <DataHeader
        onRefresh={() => refreshBudgets().catch(() => {})}
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search budgets..."
        filters={[
          {
            label: "Status",
            options: [
              { id: "all", name: "All" },
              { id: "on-track", name: "On Track" },
              { id: "over-budget", name: "Over Budget" },
              { id: "under-budget", name: "Under Budget" }
            ],
            selectedValues: statusFilter !== "All" ? [statusFilter.toLowerCase().replace(" ", "-")] : ["all"],
            onSelectionChange: (values) => setStatusFilter(values[0] ? values[0].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "All")
          }
        ]}
        filtersExpanded={false}
        onFiltersToggle={() => {}}
        sortOptions={[
          { label: "Name", value: "name" },
          { label: "Budget Type", value: "budgetType" },
          { label: "Budgeted Amount", value: "budgeted" },
          { label: "Actual Amount", value: "actual" },
          { label: "Variance", value: "remaining" },
        ]}
        sortValue="name"
        sortDirection="asc"
        onSortChange={() => {}}
        onExportCSV={() => {}}
        onCreateNew={handleOpenCreateModal}
        createButtonLabel="Create Budget"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit budgets."
      />

      <StatsSection
        stats={[
          { value: `£${totalBudgeted.toLocaleString('en-GB')}`, label: "Total Budgeted", color: "primary" },
          { value: `£${totalActual.toLocaleString('en-GB')}`, label: "Total Actual", color: totalActual > totalBudgeted ? "error" : "success" },
          { value: `£${Math.abs(totalVariance).toLocaleString('en-GB')}`, label: totalVariance >= 0 ? "Under Budget" : "Over Budget", color: totalVariance < 0 ? "error" : "success" },
          { value: overBudgetCount.toString(), label: "Over Budget", color: "error" },
        ]}
      />

      {/* Budget Table */}
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
          <TableContainer component={Paper} sx={{
                backgroundColor: "transparent",
                boxShadow: 1,
                borderRadius: 2,
                overflow: "hidden",
          }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Budget Type</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Budgeted</TableCell>
                    <TableCell>Actual</TableCell>
                  <TableCell>Variance</TableCell>
                  <TableCell>% Used</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => (
                      <TableRow
                        key={budget.id}
                        sx={{
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{budget.name || 'Unnamed Budget'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={budget.budgetType ? budget.budgetType.charAt(0).toUpperCase() + budget.budgetType.slice(1) : 'Custom'} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{budget.period_type ? budget.period_type.charAt(0).toUpperCase() + budget.period_type.slice(1) : budget.period}</TableCell>
                        <TableCell>{budget.period_start ? new Date(budget.period_start).toLocaleDateString() : '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>£{budget.budgeted.toLocaleString()}</TableCell>
                        <TableCell>£{budget.actual.toLocaleString()}</TableCell>
                        <TableCell
                        sx={{ 
                          color: budget.remaining < 0 ? "error.main" : "success.main", 
                          fontWeight: 500 
                        }}
                      >
                        {budget.remaining >= 0 ? "+" : ""}£{budget.remaining.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={budget.percentage > 100 ? "error.main" : "text.primary"}
                        >
                          {budget.percentage.toFixed(1)}%
                        </Typography>
                        </TableCell>
                        <TableCell>
                        <Box sx={{ width: 100, position: "relative" }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(budget.percentage, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 2,
                              backgroundColor: "action.hover",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: budget.percentage > 100 ? "error.main" : 
                                              budget.percentage >= 80 ? "warning.main" : 
                                              themeConfig.brandColors.navy,
                              }
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                          label={budget.status.replace("-", " ")}
                            size="small"
                            color={
                            budget.status === "over-budget" ? "error" :
                            budget.status === "on-track" ? "warning" :
                            "success"
                          }
                          variant="filled"
                          />
                        </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleMenuClick(e, budget)} color="primary">
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

        {filteredBudgets.length === 0 && (
          <EmptyStateCard
            icon={AccountBalanceWallet}
            title={hasActiveFilters ? "No budgets match your current filters" : "No budgets found"}
            description={
              hasActiveFilters ? "Try adjusting your filters or search query" : "Create your first budget to start tracking."
            }
          />
        )}

      {/* Budget CRUD Modal */}
      <CRUDModal
        open={isCRUDModalOpen}
        onClose={(reason) => {
          setIsCRUDModalOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setEditingBudget(null)
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "budget",
          crudMode,
          id: editingBudget?.id,
          itemLabel: editingBudget?.name || undefined,
        }}
        title={crudMode === "create" ? "Create Budget" : "Edit Budget"}
        icon={<AccountBalanceWallet />}
        mode={crudMode}
        maxWidth="md"
        onSave={handleSaveBudget}
        formRef={budgetFormRef}
        saveButtonText={crudMode === "create" ? "Create Budget" : "Update Budget"}
      >
        <BudgetCRUDForm
          ref={budgetFormRef}
          budget={editingBudget}
          mode={crudMode}
          onSave={handleSaveBudget}
        />
      </CRUDModal>

      {/* View Budget Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AccountBalanceWallet color="primary" />
              <Typography variant="h6">Budget Details</Typography>
            </Box>
            <IconButton onClick={() => setIsViewDialogOpen(false)}>
              <Close />
            </IconButton>
      </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewingBudget && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Budget Name
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingBudget.name || 'Unnamed Budget'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Budget Type
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingBudget.budgetType ? viewingBudget.budgetType.charAt(0).toUpperCase() + viewingBudget.budgetType.slice(1) : 'Custom'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Period Type
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingBudget.period_type ? viewingBudget.period_type.charAt(0).toUpperCase() + viewingBudget.period_type.slice(1) : viewingBudget.period}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Start Date
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingBudget.period_start ? new Date(viewingBudget.period_start).toLocaleDateString() : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  End Date
                </Typography>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {viewingBudget.period_end ? new Date(viewingBudget.period_end).toLocaleDateString() : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Budgeted Amount
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: themeConfig.brandColors.navy }}>
                  £{viewingBudget.budgeted.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Actual Spend
                </Typography>
                <Typography variant="h6" fontWeight="bold" color={viewingBudget.actual > viewingBudget.budgeted ? "error.main" : "success.main"}>
                  £{viewingBudget.actual.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Variance
                </Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  color={viewingBudget.remaining < 0 ? "error.main" : "success.main"}
                >
                  {viewingBudget.remaining >= 0 ? "+" : ""}£{viewingBudget.remaining.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Percentage Used
                </Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  color={viewingBudget.percentage > 100 ? "error.main" : "text.primary"}
                >
                  {viewingBudget.percentage.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={viewingBudget.status.replace("-", " ")}
                  color={
                    viewingBudget.status === "over-budget" ? "error" :
                    viewingBudget.status === "near-limit" ? "warning" :
                    "success"
                  }
                  size="medium"
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
              if (viewingBudget) {
                setIsViewDialogOpen(false)
                handleOpenEditModal(viewingBudget)
              }
            }}
            disabled={!canMutate}
          >
            Edit Budget
          </Button>
        </DialogActions>
      </Dialog>

      {/* Budget Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ mt: 1 }}
      >
        <MenuItem onClick={() => selectedBudget && handleOpenViewDialog(selectedBudget)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedBudget && handleOpenEditModal(selectedBudget)} disabled={!canMutate}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit Budget
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedBudget && handleDeleteBudgetAction(selectedBudget)} 
          sx={{ color: "error.main" }}
          disabled={!canRemove}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete Budget
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Budgeting
