"use client"
import { useLocation } from "react-router-dom"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Box, Typography, Grid, Button, Card, CardContent, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Chip } from "@mui/material"
// Company state is now handled through HRContext
// Functions now accessed through HRContext
import type { ExpenseReport } from "../../../backend/interfaces/HRs"
import { useHR } from "../../../backend/context/HRContext"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import ExpensesCRUDForm, { type ExpensesCRUDFormHandle } from "./forms/ExpensesCRUDForm"
import DataHeader from "../reusable/DataHeader"
import { usePermission } from "../../hooks/usePermission"
import { exportReportContainerToCsv } from "../../utils/reportExport"

const ExpensesManagement: React.FC = () => {
  const location = useLocation()
  // Company state is now handled through HRContext
  const { state: hrState, refreshExpenseReports, createExpenseReport, updateExpenseReport, deleteExpenseReport } = useHR()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("hr", "expenses")
  const canRemove = canDelete("hr", "expenses")
  // Use expense reports from HR context state instead of local state
  const reports = hrState.expenseReports || []
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<ExpenseReport>>({ title: "", currency: "GBP", totalAmount: 0, status: "draft", receipts: [], categories: [], businessPurpose: "" })

  // CRUD Modal state
  const [expensesCRUDModalOpen, setExpensesCRUDModalOpen] = useState(false)
  const [selectedExpenseForCRUD, setSelectedExpenseForCRUD] = useState<ExpenseReport | null>(null)
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | 'view'>('create')
  const expensesCRUDFormRef = useRef<ExpensesCRUDFormHandle | null>(null)

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const reportRef = React.useRef<HTMLDivElement | null>(null)

  // CRUD handlers
  const handleOpenExpensesCRUD = (expense: ExpenseReport | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedExpenseForCRUD(expense)
    setCrudMode(mode)
    setExpensesCRUDModalOpen(true)
  }

  const handleCloseExpensesCRUD = () => {
    setExpensesCRUDModalOpen(false)
    setSelectedExpenseForCRUD(null)
  }

  const handleSaveExpensesCRUD = async (expenseData: any) => {
    if (!canMutate) return
    try {
      if (crudMode === 'create') {
        await createExpenseReport(expenseData)
      } else if (crudMode === 'edit' && selectedExpenseForCRUD) {
        await updateExpenseReport(selectedExpenseForCRUD.id, expenseData)
      }
      handleCloseExpensesCRUD()
      await load()
    } catch (error) {
      console.error('Error saving expense report:', error)
    }
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: 'asc' | 'desc') => {
    setSortBy(value)
    setSortDirection(direction)
  }


  const handleExportCSV = () => {
    exportReportContainerToCsv(reportRef.current, "expense-reports.csv")
  }

  const load = useCallback(async () => {
    await refreshExpenseReports()
  }, [refreshExpenseReports]) // Company state handled internally

  useEffect(() => { load() }, [load])

  const handleDeleteExpense = async (reportId: string) => {
    if (!canRemove) return
    try {
      await deleteExpenseReport(reportId)
      await load()
    } catch (error) {
      console.error('Error deleting expense report:', error)
    }
  }

  // Filter and sort reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.businessPurpose.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(report.status)
    return matchesSearch && matchesStatus
  })

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue = ''
    let bValue = ''

    switch (sortBy) {
      case 'title':
        aValue = a.title
        bValue = b.title
        break
      case 'employeeName':
        aValue = a.employeeName
        bValue = b.employeeName
        break
      case 'totalAmount':
        aValue = a.totalAmount.toString()
        bValue = b.totalAmount.toString()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'createdAt':
        aValue = a.createdAt?.toString() || ''
        bValue = b.createdAt?.toString() || ''
        break
      default:
        aValue = a.createdAt?.toString() || ''
        bValue = b.createdAt?.toString() || ''
    }

    const comparison = aValue.localeCompare(bValue)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // DataHeader configuration
  const filters = [
    {
      label: "Status",
      options: [
        { id: "draft", name: "Draft", color: "#757575" },
        { id: "submitted", name: "Submitted", color: "#2196f3" },
        { id: "approved", name: "Approved", color: "#4caf50" },
        { id: "rejected", name: "Rejected", color: "#f44336" },
        { id: "reimbursed", name: "Reimbursed", color: "#4caf50" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
  ]

  const sortOptions = [
    { value: "title", label: "Title" },
    { value: "employeeName", label: "Employee" },
    { value: "totalAmount", label: "Amount" },
    { value: "status", label: "Status" },
    { value: "createdAt", label: "Created Date" },
  ]

  const save = async () => {
    if (!canMutate) return
    const fallbackEmployee = hrState.employees[0]
    if (!fallbackEmployee) return
    await createExpenseReport({
      ...form,
      employeeId: form.employeeId || fallbackEmployee.id,
      employeeName: form.employeeName || `${fallbackEmployee.firstName || ''} ${fallbackEmployee.lastName || ''}`.trim(),
      receipts: form.receipts || [],
      categories: form.categories || [],
      status: "submitted",
    })
    setOpen(false)
    await load()
  }

  return (
    <Box ref={reportRef}>
      <DataHeader
        onCreateNew={() => handleOpenExpensesCRUD(null, 'create')}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search expense reports..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit expenses."
      />

      <Grid container spacing={2}>
        {sortedReports.map((r) => (
          <Grid item xs={12} md={6} key={r.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>{r.title}</Typography>
                <Typography variant="body2" color="text.secondary">{r.employeeName} • {r.currency} {r.totalAmount.toFixed(2)}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip size="small" label={r.status} />
                </Box>
                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <Button size="small" variant="outlined" onClick={() => handleOpenExpensesCRUD(r, 'view')}>View</Button>
                  {canMutate && (
                    <Button size="small" variant="outlined" onClick={() => handleOpenExpensesCRUD(r, 'edit')}>Edit</Button>
                  )}
                  {canRemove && (
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteExpense(r.id)}>Delete</Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sortedReports.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {reports.length === 0 
              ? "No expense reports found. Click 'New Report' to create your first expense report."
              : "No expense reports match your current filters."
            }
          </Typography>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Expense Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" value={form.title || ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select value={form.currency as any || 'GBP'} label="Currency" onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as any }))}>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Business Purpose" value={form.businessPurpose || ''} onChange={(e) => setForm((p) => ({ ...p, businessPurpose: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="number" label="Total Amount" value={form.totalAmount || 0} onChange={(e) => setForm((p) => ({ ...p, totalAmount: Number(e.target.value) }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={save} disabled={!canMutate}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* CRUD Modal */}
                        <CRUDModal
              open={expensesCRUDModalOpen}
              onClose={(reason) => {
                setExpensesCRUDModalOpen(false)
                if (isCrudModalHardDismiss(reason)) {
                  const __workspaceOnClose = handleCloseExpensesCRUD
                  if (typeof __workspaceOnClose === "function") {
                    __workspaceOnClose(reason)
                  }
                }
              }}
              workspaceFormShortcut={{
                crudEntity: "expensesManagementModal1",
                crudMode: crudMode,
              }}
              title={crudMode === 'create' ? 'Create Expense Report' : crudMode === 'edit' ? 'Edit Expense Report' : 'View Expense Report'}
              mode={crudMode}
              onSave={async (...args) => {
                const __workspaceOnSave = crudMode !== "view" ? handleSaveExpensesCRUD : undefined
                if (typeof __workspaceOnSave !== "function") return undefined
                const result = await __workspaceOnSave(...args)
                removeWorkspaceFormDraft(location.pathname, {
                  crudEntity: "expensesManagementModal1",
                  crudMode: crudMode,
                })
                return result
              }}
              maxWidth="md"
              formRef={expensesCRUDFormRef}
              cancelButtonText={undefined}
              hideCloseButton={true}
              hideCloseAction={true}
              disabled={(crudMode === "create" || crudMode === "edit") && !canMutate}
            >
        <ExpensesCRUDForm
          ref={expensesCRUDFormRef}
          expenseReport={selectedExpenseForCRUD as any}
          mode={crudMode}
          onSave={handleSaveExpensesCRUD}
        />
      </CRUDModal>
    </Box>
  )
}

export default ExpensesManagement


