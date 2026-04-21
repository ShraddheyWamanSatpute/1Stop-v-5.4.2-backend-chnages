"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Tabs,
  Tab,
} from "@mui/material"
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Edit as EditIcon,
} from "@mui/icons-material"
import { Bill, usePOS } from "../../../backend/context/POSContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import BillForm from "./forms/BillForm"
import DataHeader from "../reusable/DataHeader"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"

const BillsManagement: React.FC = () => {
  const { 
    state: posState, 
    refreshBills, 
    createBill,
    updateBill, 
    deleteBill
  } = usePOS()
  const { state: companyState } = useCompany()

  // State variables
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  
  // Form states
  const [billFormMode, setBillFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedBillForForm, setSelectedBillForForm] = useState<Bill | null>(null)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // DataHeader state
  const [dataHeaderSortBy, setDataHeaderSortBy] = useState<string>("createdAt")
  const [dataHeaderSortDirection, setDataHeaderSortDirection] = useState<'asc' | 'desc'>("desc")
  const [serverFilter, setServerFilter] = useState<string>("all")
  const [tableFilter, setTableFilter] = useState<string>("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [dateFromFilter, setDateFromFilter] = useState<string>("")
  const [dateToFilter, setDateToFilter] = useState<string>("")
  const [timeFromFilter, setTimeFromFilter] = useState<string>("")
  const [timeToFilter, setTimeToFilter] = useState<string>("")
  const [minAmountFilter, setMinAmountFilter] = useState<string>("")
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  } | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID])

  const fetchData = async () => {
    if (!companyState.companyID || !companyState.selectedSiteID) return

    setError(null)

    try {
      await refreshBills()
    } catch (err) {
      debugWarn("Error fetching bills:", err)
      setError("Failed to load bills data. Please try again.")
    }
  }

  // Get current bills based on active tab
  const getCurrentBills = () => {
    const allBills = posState.bills || []
    
    const filteredBills = activeTab === 0 
      ? allBills.filter(bill => bill.status?.toLowerCase() === "open")
      : allBills.filter(bill => 
          bill.status?.toLowerCase() === "closed" || 
          bill.status?.toLowerCase() === "paid" ||
          bill.status?.toLowerCase() === "completed"
        )
    
    return filteredBills
  }

  // Get unique values for filters
  const getUniqueServers = () => {
    const allBills = posState.bills || []
    const servers = [...new Set(allBills.map((bill) => bill.staffName).filter(Boolean))]
    return servers.filter((server) => server && server.trim() !== "")
  }

  const getUniqueTables = () => {
    const allBills = posState.bills || []
    const tables = [...new Set(allBills.map((bill) => bill.tableName).filter(Boolean))]
    return tables.filter((table) => table && table.trim() !== "")
  }

  const getUniquePaymentMethods = () => {
    const allBills = posState.bills || []
    const methods = [...new Set(allBills.map((bill) => bill.paymentMethod).filter(Boolean))]
    return methods.filter((method) => method && method.trim() !== "")
  }

  // Filter bills based on all criteria
  const filteredBills = getCurrentBills().filter((bill) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        bill.id.toLowerCase().includes(searchLower) ||
        (bill.tableName && bill.tableName.toLowerCase().includes(searchLower)) ||
        (bill.staffName && bill.staffName.toLowerCase().includes(searchLower)) ||
        bill.status.toLowerCase().includes(searchLower) ||
        (bill.paymentMethod && bill.paymentMethod.toLowerCase().includes(searchLower))

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== "all" && bill.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false
    }

    // Server filter
    if (serverFilter !== "all" && bill.staffName !== serverFilter) {
      return false
    }

    // Table filter
    if (tableFilter !== "all" && bill.tableName !== tableFilter) {
      return false
    }

    // Payment method filter
    if (paymentMethodFilter !== "all" && bill.paymentMethod !== paymentMethodFilter) {
      return false
    }

    // Date filters
    if (dateFromFilter) {
      const billDate = new Date(bill.createdAt).toISOString().split("T")[0]
      if (billDate < dateFromFilter) return false
    }
    if (dateToFilter) {
      const billDate = new Date(bill.createdAt).toISOString().split("T")[0]
      if (billDate > dateToFilter) return false
    }

    // Time filters
    if (timeFromFilter) {
      const billTime = new Date(bill.createdAt).toTimeString().slice(0, 5)
      if (billTime < timeFromFilter) return false
    }
    if (timeToFilter) {
      const billTime = new Date(bill.createdAt).toTimeString().slice(0, 5)
      if (billTime > timeToFilter) return false
    }

    // Amount filters
    if (minAmountFilter && bill.total < Number(minAmountFilter)) {
      return false
    }
    if (maxAmountFilter && bill.total > Number(maxAmountFilter)) {
      return false
    }

    return true
  })

  // Sorting function
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  const getSortedBills = () => {
    if (!sortConfig) return filteredBills

    return [...filteredBills].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Bill]
      let bValue: any = b[sortConfig.key as keyof Bill]

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }


  const handleCloseBill = async (bill: Bill) => {
    try {
      // Include id in update payload (required for proper updates)
      const updatePayload: any = { id: bill.id, status: "closed" }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateBill(bill.id, updatePayload);
      // Success - no need to show message as data will refresh
    } catch (error) {
      debugWarn("Error closing bill:", error);
      setError("Failed to close bill. Please try again.");
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    if (window.confirm(`Are you sure you want to delete bill ${bill.id}?`)) {
      try {
        await deleteBill(bill.id);
        // Success - no need to show message as data will refresh
      } catch (error) {
        debugWarn("Error deleting bill:", error);
        setError("Failed to delete bill. Please try again.");
      }
    }
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete || !companyState.companyID || !companyState.selectedSiteID) return

    try {
      // const basePath = `${getBasePath('pos')}/data` // Would use when implementing functions
      // Delete bill using POS context
      await deleteBill(billToDelete.id)
      await fetchData() // Refresh data
      setDeleteDialogOpen(false)
      setBillToDelete(null)
    } catch (err) {
      debugWarn("Error deleting bill:", err)
      setError("Failed to delete bill. Please try again.")
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setServerFilter("all")
    setTableFilter("all")
    setPaymentMethodFilter("all")
    setDateFromFilter("")
    setDateToFilter("")
    setTimeFromFilter("")
    setTimeToFilter("")
    setMinAmountFilter("")
    setMaxAmountFilter("")
    setSortConfig(null)
  }

  // Form handlers
  const handleOpenBillForm = (bill: Bill | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    setSelectedBillForForm(bill)
    setBillFormMode(mode)
  }

  const handleCloseBillForm = () => {
    setSelectedBillForForm(null)
    setBillFormMode('create')
  }

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill)
    setViewDialogOpen(true)
  }

  const handleSaveBill = async (billData: any) => {
    try {
      if (billFormMode === 'create') {
        // Filter out undefined values before creating
        const createPayload = Object.fromEntries(
          Object.entries(billData).filter(([_, value]) => value !== undefined)
        )
        await createBill(createPayload)
      } else if (billFormMode === 'edit' && selectedBillForForm?.id) {
        // Include id in update payload (required for proper updates)
        const updatePayload: any = { ...billData, id: selectedBillForForm.id }
        // Filter out undefined values
        Object.keys(updatePayload).forEach(key => {
          if (updatePayload[key] === undefined) {
            delete updatePayload[key]
          }
        })
        await updateBill(selectedBillForForm.id, updatePayload)
      }
      handleCloseBillForm()
    } catch (error) {
      debugWarn('Error saving bill:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "warning"
      case "closed":
        return "success"
      case "cancelled":
        return "error"
      default:
        return "default"
    }
  }

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  // DataHeader sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'id', label: 'Bill ID' },
    { value: 'tableName', label: 'Table' },
    { value: 'staffName', label: 'Server' },
    { value: 'status', label: 'Status' },
    { value: 'total', label: 'Total' }
  ];

  // DataHeader handlers
  const handleDataHeaderSortChange = (field: string, direction: 'asc' | 'desc') => {
    setDataHeaderSortBy(field);
    setDataHeaderSortDirection(direction);
    // Update legacy sort state for compatibility
    setSortConfig({ key: field, direction: direction === 'asc' ? 'ascending' : 'descending' });
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const tabNames = ['Open Bills', 'Closed Bills'];
    const currentTabName = tabNames[activeTab];
    debugLog(`Exporting ${currentTabName} as ${format}`);
    // Export functionality would be implemented here
  };

  // No loading indicators — UI renders and fills as data arrives (like HR section)

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        showDateControls={false}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search bills..."
        sortOptions={sortOptions}
        sortValue={dataHeaderSortBy}
        sortDirection={dataHeaderSortDirection}
        onSortChange={handleDataHeaderSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenBillForm(null, 'create')}
        createButtonLabel="New Bill"
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}


      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {getCurrentBills().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 0 ? 'Open Bills' : 'Closed Bills'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                ${getCurrentBills().reduce((sum, bill) => sum + bill.total, 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {getUniqueServers().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Servers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {getUniqueTables().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tables
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Server</InputLabel>
                <Select value={serverFilter} label="Server" onChange={(e) => setServerFilter(e.target.value)}>
                  <MenuItem value="all">All Servers</MenuItem>
                  {getUniqueServers().map((server) => (
                    <MenuItem key={server} value={server}>
                      {server}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Table</InputLabel>
                <Select value={tableFilter} label="Table" onChange={(e) => setTableFilter(e.target.value)}>
                  <MenuItem value="all">All Tables</MenuItem>
                  {getUniqueTables().map((table) => (
                    <MenuItem key={table} value={table}>
                      {table}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethodFilter}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  {getUniquePaymentMethods().map((method) => (
                    <MenuItem key={method} value={method}>
                      {method}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                {filteredBills.length} bills
              </Typography>
            </Grid>
               <Grid item xs={12} sm={6} md={1}>
            <Button variant="outlined" onClick={clearFilters} size="small">
              Clear Filters
            </Button>
            </Grid>

            {/* Date and Time Filters */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Date From"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Date To"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Time From"
                type="time"
                value={timeFromFilter}
                onChange={(e) => setTimeFromFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Time To"
                type="time"
                value={timeToFilter}
                onChange={(e) => setTimeToFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Min Amount (£)"
                type="number"
                value={minAmountFilter}
                onChange={(e) => setMinAmountFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Max Amount (£)"
                type="number"
                value={maxAmountFilter}
                onChange={(e) => setMaxAmountFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={clearFilters}
                  size="small"
                >
                  Clear Filters
                </Button>
                <Button 
                  variant="contained" 
                  onClick={fetchData}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs for Open/Closed Bills */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`Open Bills (${posState.bills?.filter(bill => bill.status?.toLowerCase() === "open").length || 0})`} 
            icon={<ReceiptIcon />}
          />
          <Tab 
            label={`Closed Bills (${posState.bills?.filter(bill => 
              bill.status?.toLowerCase() === "closed" || 
              bill.status?.toLowerCase() === "paid" ||
              bill.status?.toLowerCase() === "completed"
            ).length || 0})`} 
            icon={<CheckCircleIcon />}
          />
        </Tabs>
      </Box>

      {/* Bills Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => requestSort("id")} sx={{ cursor: "pointer" }}>
                Bill ID {sortConfig?.key === "id" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell onClick={() => requestSort("tableNumber")} sx={{ cursor: "pointer" }}>
                Table {sortConfig?.key === "tableNumber" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell onClick={() => requestSort("server")} sx={{ cursor: "pointer" }}>
                Server {sortConfig?.key === "server" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right" onClick={() => requestSort("subtotal")} sx={{ cursor: "pointer" }}>
                Subtotal {sortConfig?.key === "subtotal" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="right" onClick={() => requestSort("tax")} sx={{ cursor: "pointer" }}>
                Tax {sortConfig?.key === "tax" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="right" onClick={() => requestSort("total")} sx={{ cursor: "pointer" }}>
                Total {sortConfig?.key === "total" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell onClick={() => requestSort("createdAt")} sx={{ cursor: "pointer" }}>
                Created {sortConfig?.key === "createdAt" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell onClick={() => requestSort("updatedAt")} sx={{ cursor: "pointer" }}>
                Updated {sortConfig?.key === "updatedAt" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedBills().map((bill) => (
              <TableRow key={bill.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {bill.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{bill.tableName || "N/A"}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{bill.staffName || "N/A"}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={bill.status} size="small" color={getStatusColor(bill.status) as any} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{bill.items?.length || 0}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(bill.subtotal)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(bill.tax)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(bill.total)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(bill.createdAt)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(bill.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(bill.updatedAt)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(bill.updatedAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info" onClick={() => handleViewBill(bill)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Bill">
                      <IconButton size="small" color="primary" onClick={() => handleOpenBillForm(bill, 'edit')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton size="small" color="secondary">
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {bill.status === "open" && (
                      <Tooltip title="Close Bill">
                        <IconButton size="small" color="success" onClick={() => handleCloseBill(bill)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteBill(bill)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {getSortedBills().length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <EmptyStateCard
                    icon={ReceiptIcon}
                    title={
                      searchTerm || 
                      statusFilter !== "all" || 
                      serverFilter !== "all" || 
                      tableFilter !== "all" || 
                      paymentMethodFilter !== "all" ||
                      dateFromFilter ||
                      dateToFilter ||
                      timeFromFilter ||
                      timeToFilter ||
                      minAmountFilter ||
                      maxAmountFilter
                        ? "No bills match your filters"
                        : `No ${activeTab === 0 ? "open" : "closed"} bills available`
                    }
                    description={
                      searchTerm || 
                      statusFilter !== "all" || 
                      serverFilter !== "all" || 
                      tableFilter !== "all" || 
                      paymentMethodFilter !== "all" ||
                      dateFromFilter ||
                      dateToFilter ||
                      timeFromFilter ||
                      timeToFilter ||
                      minAmountFilter ||
                      maxAmountFilter
                        ? "Try adjusting your filters or search query"
                        : activeTab === 0 ? "Open bills will appear here" : "Closed bills will appear here"
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Bill Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptIcon />
            Bill Details - {selectedBill?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Table Name
                  </Typography>
                  <Typography variant="body1">{selectedBill.tableName || "N/A"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Staff
                  </Typography>
                  <Typography variant="body1">{selectedBill.staffName || "N/A"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip label={selectedBill.status} size="small" color={getStatusColor(selectedBill.status) as any} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">{selectedBill.paymentMethod || "N/A"}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <List dense>
                {selectedBill.items?.map((item: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemText primary={item.productName} secondary={`Quantity: ${item.quantity}`} />
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(item.totalPrice)}
                    </Typography>
                  </ListItem>
                )) || (
                  <Typography variant="body2" color="text.secondary">
                    No items in this bill
                  </Typography>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">{formatCurrency(selectedBill.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">{formatCurrency(selectedBill.tax)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatCurrency(selectedBill.total)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            startIcon={<EditIcon />}
            onClick={() => {
              setViewDialogOpen(false)
              // Open edit mode - you might need to implement this handler
              // handleEditBill(selectedBill)
            }}
          >
            Edit
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete bill {billToDelete?.id}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteBill} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill Form */}
      <BillForm
        bill={selectedBillForForm}
        mode={billFormMode}
        onSave={handleSaveBill}
        onCancel={handleCloseBillForm}
      />
    </Box>
  )
}

export default BillsManagement
