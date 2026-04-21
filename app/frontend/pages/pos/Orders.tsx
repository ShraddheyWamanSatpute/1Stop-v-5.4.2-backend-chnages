"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Tabs,
  Tab,
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
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material"
import {
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material"
import { useCompany } from "../../../backend/context/CompanyContext"
import { usePOS } from "../../../backend/context/POSContext"
import { Bill } from "../../../backend/interfaces/POS"
import DataHeader from "../../components/reusable/DataHeader"

// Define Order interface for the orders view
interface Order {
  id: string
  billId: string
  customerName: string
  total: string
  status: string
  terminalId: string
  salePrice: number
  time: number
  items: any[]
  paymentMethod: string
  tableNumber: string
}

const Orders = () => {
  const { state: companyState } = useCompany()
  const { state: posState, refreshBills } = usePOS()

  const [tabValue, setTabValue] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // DataHeader state
  const [sortBy, setSortBy] = useState<string>('time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter and sort orders
  const filteredAndSortedOrders = orders
    .filter((order) => {
      // Tab filter
      if (tabValue !== "all" && order.status !== tabValue) {
        return false
      }

      // Search filter
      if (searchQuery && !order.billId.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Order]
      const bValue = b[sortBy as keyof Order]

      if (aValue === undefined || bValue === undefined) return 0

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

  // Initial data loading
  useEffect(() => {
    const fetchData = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) return
      setLoading(true)
      try {
        await refreshBills()
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load orders")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [companyState.companyID, companyState.selectedSiteID])

  // Update orders when POS state changes
  useEffect(() => {
    const billsData = posState.bills || []
    
    // Convert bills to orders format
    const ordersData: Order[] = billsData.map((bill: Bill) => ({
      id: bill.id,
      billId: bill.id,
      customerName: bill.customerName || "Walk-in",
      total: `$${bill.total?.toFixed(2) || "0.00"}`,
      status: bill.status || "Completed",
      terminalId: "Staff", // Bill doesn't have terminalId, use default
      salePrice: bill.total || 0,
      time: bill.createdAt || Date.now(),
      items: bill.items || [],
      paymentMethod: bill.paymentMethod || "Cash",
      tableNumber: bill.tableNumber || "",
    }))

    setOrders(ordersData)
  }, [posState.bills])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "success"
      case "pending":
        return "warning"
      case "cancelled":
        return "error"
      default:
        return "default"
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await refreshBills()
    } catch (error) {
      console.error("Error refreshing data:", error)
      setError("Failed to refresh orders")
    } finally {
      setLoading(false)
    }
  }

  // DataHeader handlers
  const sortOptions = [
    { value: 'billId', label: 'Order ID' },
    { value: 'customerName', label: 'Customer' },
    { value: 'total', label: 'Total' },
    { value: 'status', label: 'Status' },
    { value: 'time', label: 'Time' },
    { value: 'tableNumber', label: 'Table' }
  ]

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDirection(direction)
  }

  const handleExport = () => {
    const data = filteredAndSortedOrders.map(order => ({
      'Order ID': order.billId,
      'Customer': order.customerName,
      'Total': order.total,
      'Status': order.status,
      'Table': order.tableNumber,
      'Payment Method': order.paymentMethod,
      'Time': new Date(order.time).toLocaleString()
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && orders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <DataHeader
        title="Orders"
        showDateControls={false}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search orders..."
        sortOptions={sortOptions}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport()}
        onExportPDF={() => handleExport()}
        additionalButtons={[
          {
            label: "Refresh",
            icon: <RefreshIcon />,
            onClick: handleRefresh,
            variant: 'outlined' as const
          }
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" value="all" />
            <Tab label="Completed" value="completed" />
            <Tab label="Pending" value="pending" />
            <Tab label="Cancelled" value="cancelled" />
          </Tabs>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    #{order.billId}
                  </Typography>
                </TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {order.total}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(order.time).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e)}
                    size="small"
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredAndSortedOrders.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No orders found
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <PrintIcon sx={{ mr: 1 }} />
          Print Receipt
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Order
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Cancel Order
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default Orders
