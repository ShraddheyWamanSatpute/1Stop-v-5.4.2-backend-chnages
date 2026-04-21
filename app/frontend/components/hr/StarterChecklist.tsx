"use client"

import React, { useState, useEffect } from "react"
import { Box, Paper, Typography, Button, Card, CardContent, Grid, TextField, MenuItem } from "@mui/material"
// Company state is now handled through HRContext
import { useHR } from "../../../backend/context/HRContext"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { Assignment as AssignmentIcon } from "@mui/icons-material"
import { exportReportContainerToCsv } from "../../utils/reportExport"
// Functions now accessed through HRContext
// import type { StarterChecklist } from "../../../backend/interfaces/HRs" // Unused

const StarterChecklistComp: React.FC = () => {
  // Company state is now handled through HRContext
  const { state: hrState, refreshStarterChecklists, createStarterChecklist } = useHR()
  // Use starter checklists from HR context state instead of local state
  const items = hrState.starterChecklists || []
  const [open, setOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState("")

  // DataHeader state
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const reportRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      await refreshStarterChecklists()
    }
    load()
  }, [refreshStarterChecklists]) // Company state handled internally

  const create = async () => {
    if (!employeeId) return
    const employee = hrState.employees.find((item) => item.id === employeeId)
    if (!employee) return
    await createStarterChecklist({
      employeeId,
      payrollNumber: employee.payrollNumber || employee.employeeNumber || employee.id,
      status: "pending",
      items: [],
      assignedTo: employeeId,
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
    await refreshStarterChecklists()
    setOpen(false)
    setEmployeeId("")
  }

  // DataHeader handlers
  const handleSortChange = (value: string, direction: 'asc' | 'desc') => {
    setSortBy(value)
    setSortDirection(direction)
  }

  const handleRefresh = () => {
    refreshStarterChecklists().catch(() => {})
  }

  const handleExportCSV = () => {
    exportReportContainerToCsv(reportRef.current, "starter-checklists.csv")
  }

  // Filter and sort items
  const filteredItems = items.filter(item => {
    const employee = hrState.employees.find(e => e.id === item.employeeId)
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : ''
    
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.payrollNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status)
    return matchesSearch && matchesStatus
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue = ''
    let bValue = ''

    switch (sortBy) {
      case 'employeeName':
        const aEmployee = hrState.employees.find(e => e.id === a.employeeId)
        const bEmployee = hrState.employees.find(e => e.id === b.employeeId)
        aValue = aEmployee ? `${aEmployee.firstName} ${aEmployee.lastName}` : ''
        bValue = bEmployee ? `${bEmployee.firstName} ${bEmployee.lastName}` : ''
        break
      case 'payrollNumber':
        aValue = a.payrollNumber
        bValue = b.payrollNumber
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
        { id: "pending", name: "Pending", color: "#ff9800" },
        { id: "in_progress", name: "In Progress", color: "#2196f3" },
        { id: "completed", name: "Completed", color: "#4caf50" },
      ],
      selectedValues: statusFilter,
      onSelectionChange: setStatusFilter,
    },
  ]

  const sortOptions = [
    { value: "employeeName", label: "Employee" },
    { value: "payrollNumber", label: "Payroll Number" },
    { value: "status", label: "Status" },
    { value: "createdAt", label: "Created Date" },
  ]

  return (
    <Box ref={reportRef}>
      <DataHeader
        onCreateNew={() => setOpen(true)}
        onExportCSV={handleExportCSV}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search starter checklists..."
        showDateControls={false}
        filters={filters}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={() => setFiltersExpanded(!filtersExpanded)}
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onRefresh={handleRefresh}
        createButtonLabel="Assign Checklist"
      />

      <Grid container spacing={2}>
        {sortedItems.map((c) => (
          <Grid item xs={12} md={6} key={c.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>Employee: {hrState.employees.find(e => e.id === c.employeeId)?.firstName} {hrState.employees.find(e => e.id === c.employeeId)?.lastName}</Typography>
                <Typography variant="body2" color="text.secondary">Payroll Number: {c.payrollNumber}</Typography>
                <Typography variant="caption">Status: {c.status}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sortedItems.length === 0 && (
        <EmptyStateCard
          icon={AssignmentIcon}
          title={items.length === 0 ? "No starter checklists found" : "No starter checklists match your current filters"}
          description={items.length === 0 ? "Click 'Assign Checklist' to create your first checklist." : "Try adjusting your search or filters."}
          cardSx={{ maxWidth: 560, mx: "auto", boxShadow: "none" }}
        />
      )}

      {open && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign to Employee</Typography>
          <TextField
            fullWidth
            select
            label="Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {hrState.employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button variant="contained" onClick={create}>Create</Button>
          </Box>
        </Paper>
      )}
    </Box>
  )
}

export default StarterChecklistComp
