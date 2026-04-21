"use client"
import { useLocation } from "react-router-dom"

import { themeConfig } from "../../../theme/AppTheme";
import { alpha } from "@mui/material/styles";
import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material"
import {
  Edit,
  Delete,
  QrCode,
  Payment,
  Redeem,
  Print,
  Save as SaveIcon,
} from "@mui/icons-material"
import { QRCodeSVG } from "qrcode.react"
import { usePOS } from "../../../backend/context/POSContext"
import { useCompany } from "../../../backend/context/CompanyContext"
import type { Ticket } from "../../../backend/interfaces/POS"
import TicketForm from "./forms/TicketForm"
import DataHeader from "../reusable/DataHeader"
import StatsSection from "../reusable/StatsSection"
import CRUDModal, { isCrudModalHardDismiss, removeWorkspaceFormDraft } from "../reusable/CRUDModal"
import { usePermission } from "../../hooks/usePermission"
import EmptyStateCard from "../reusable/EmptyStateCard"
import { debugWarn, debugLog } from "../../../utils/debugLog"

interface TicketFormData {
  name: string
  description: string
  price: number
  isActive: boolean
}

interface TicketSaleFormData {
  ticketId: string
  quantity: number
  paymentMethod: string
  customerInfo?: {
    name?: string
    email?: string
    phone?: string
  }
}

const TicketManagement: React.FC = () => {
  const location = useLocation()
  const { canEdit, canDelete } = usePermission()
  const canMutate = canEdit("pos", "tickets")
  const canRemove = canDelete("pos", "tickets")
  const { 
    state: posState, 
    refreshAll,
    refreshTicketSales,
    createTicket,
    updateTicket,
    deleteTicket,
    createTicketSale,
    updateTicketSale,
  } = usePOS()
  const { state: companyState } = useCompany()
  const companyId = companyState.companyID

  // State variables
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // DataHeader state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc")

  // Dialog states
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)
  const [ticketFormOpen, setTicketFormOpen] = useState(false)
  const [ticketFormMode, setTicketFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedTicketForForm, setSelectedTicketForForm] = useState<Ticket | null>(null)
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0)

  // Date controls (used only for Ticket Sales tab)
  const [dateType, setDateType] = useState<'day' | 'week' | 'month' | 'custom'>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)

  // Form states
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [ticketForm, setTicketForm] = useState<TicketFormData>({
    name: "",
    description: "",
    price: 0,
    isActive: true,
  })
  const [saleForm, setSaleForm] = useState<TicketSaleFormData>({
    ticketId: "",
    quantity: 1,
    paymentMethod: "cash",
  })
  const [selectedQrCode, setSelectedQrCode] = useState<string>("")
  const [redeemQrCode, setRedeemQrCode] = useState<string>("")

  // Load data on component mount
  useEffect(() => {
    if (companyId) {
      loadData()
    }
  }, [companyId])

  const loadData = async () => {
    if (!companyId) return
    
    try {
      await refreshAll()
    } catch (err) {
      debugWarn("Error loading data:", err)
      setError("Failed to load data")
    }
  }

  // New form handlers
  const handleOpenTicketForm = (ticket: Ticket | null = null, mode: 'create' | 'edit' | 'view' = 'create') => {
    if ((mode === "create" || mode === "edit") && !canMutate) return
    setSelectedTicketForForm(ticket)
    setTicketFormMode(mode)
    setTicketFormOpen(true)
  }

  const handleCloseTicketForm = () => {
    setTicketFormOpen(false)
    setSelectedTicketForForm(null)
    setTicketFormMode('create')
  }

  // Get data from POS context
  const tickets = posState.tickets || []
  const ticketSales = posState.ticketSales || []
  

  const handleCreateTicket = async () => {
    if (!canMutate) return
    if (!companyId) return

    try {
      // Filter out undefined values before creating
      const createPayload: any = {
        name: ticketForm.name,
        description: ticketForm.description,
        price: ticketForm.price,
        isActive: ticketForm.isActive,
        qrCode: `ticket-${Date.now()}` // Generate unique QR code
      }
      // Filter out undefined values
      Object.keys(createPayload).forEach(key => {
        if (createPayload[key] === undefined) {
          delete createPayload[key]
        }
      })
      await createTicket(createPayload)
      setSuccess("Ticket created successfully")
      setTicketDialogOpen(false)
      resetTicketForm()
    } catch (err) {
      debugWarn("Error creating ticket:", err)
      setError("Failed to create ticket")
    }
  }

  const handleUpdateTicket = async () => {
    if (!canMutate) return
    if (!companyId || !editingTicket) return

    try {
      // Include id in update payload (required for proper updates)
      const updatePayload: any = {
        id: editingTicket.id,
        name: ticketForm.name,
        description: ticketForm.description,
        price: ticketForm.price,
        isActive: ticketForm.isActive
      }
      // Filter out undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key]
        }
      })
      await updateTicket(editingTicket.id, updatePayload)
      setSuccess("Ticket updated successfully")
      setTicketDialogOpen(false)
      resetTicketForm()
    } catch (err) {
      debugWarn("Error updating ticket:", err)
      setError("Failed to update ticket")
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!canRemove) return
    if (!companyId) return
    
    if (!window.confirm("Are you sure you want to delete this ticket?")) return

    try {
      await deleteTicket(ticketId)
      setSuccess("Ticket deleted successfully")
    } catch (err) {
      debugWarn("Error deleting ticket:", err)
      setError("Failed to delete ticket")
    }
  }

  const handleSellTicket = async () => {
    if (!canMutate) return
    if (!companyId) return

    const selectedTicket = tickets.find(t => t.id === saleForm.ticketId)
    if (!selectedTicket) return

    try {
      // Filter out undefined values before creating
      const saleData: any = {
        ticketId: saleForm.ticketId,
        ticketName: selectedTicket.name,
        price: selectedTicket.price,
        quantity: saleForm.quantity,
        total: selectedTicket.price * saleForm.quantity,
        paymentMethod: saleForm.paymentMethod,
        paymentStatus: "completed" as const,
        customerInfo: saleForm.customerInfo,
        isRedeemed: false,
      }
      // Filter out undefined values
      Object.keys(saleData).forEach(key => {
        if (saleData[key] === undefined) {
          delete saleData[key]
        }
      })
      
      await createTicketSale({
        ...saleData,
        qrCode: `sale-${Date.now()}`,
      })
      await updateTicket(selectedTicket.id, {
        id: selectedTicket.id,
        soldQuantity: (selectedTicket.soldQuantity || 0) + saleForm.quantity,
      })
      await refreshTicketSales()
      setSuccess(`Ticket sold successfully! Total: £${saleData.total.toFixed(2)}`)
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "ticketManagementModal1",
        crudMode: "create",
      })
      setSaleDialogOpen(false)
      resetSaleForm()
      loadData()
    } catch (err) {
      debugWarn("Error selling ticket:", err)
      setError("Failed to sell ticket")
    }
  }

  const handleRedeemTicket = async () => {
    if (!canMutate) return
    if (!companyId || !redeemQrCode) return

    try {
      const ticketSale = ticketSales.find((sale) => sale.qrCode === redeemQrCode)
      if (!ticketSale) {
        throw new Error("Ticket sale not found")
      }
      if (ticketSale.isRedeemed) {
        throw new Error("Ticket has already been redeemed")
      }

      await updateTicketSale(ticketSale.id, {
        id: ticketSale.id,
        isRedeemed: true,
        redeemedAt: Date.now(),
        redeemedBy: "Staff",
        redeemedByName: "Staff",
      })
      await refreshTicketSales()
      setSuccess("Ticket redeemed successfully")
      removeWorkspaceFormDraft(location.pathname, {
        crudEntity: "ticketManagementModal2",
        crudMode: "create",
      })
      setRedeemDialogOpen(false)
      setRedeemQrCode("")
      loadData()
    } catch (err) {
      debugWarn("Error redeeming ticket:", err)
      setError("Failed to redeem ticket")
    }
  }

  const resetTicketForm = () => {
    setTicketForm({
      name: "",
      description: "",
      price: 0,
      isActive: true,
    })
    setEditingTicket(null)
  }

  const resetSaleForm = () => {
    setSaleForm({
      ticketId: "",
      quantity: 1,
      paymentMethod: "cash",
    })
  }


  const showQrCode = (qrCode: string) => {
    setSelectedQrCode(qrCode)
    setQrDialogOpen(true)
  }

  // DataHeader sort options per tab
  const sortOptionsTickets = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'isActive', label: 'Status' },
    { value: 'createdAt', label: 'Created Date' },
  ]
  const sortOptionsSales = [
    { value: 'ticketName', label: 'Name' },
    { value: 'total', label: 'Total' },
    { value: 'paymentMethod', label: 'Payment' },
    { value: 'date', label: 'Date' },
  ]

  // DataHeader handlers
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    debugLog(`Exporting tickets as ${format}`);
    // Export functionality would be implemented here
    // For now, just log the action
  };

  // Helpers: date filtering for sales tab
  const isInSelectedPeriod = (d: Date) => {
    const date = new Date(d)
    if (dateType === 'custom' && customStartDate && customEndDate) {
      return date >= customStartDate && date <= customEndDate
    }
    if (dateType === 'day') {
      const start = new Date(selectedDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(selectedDate)
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    }
    if (dateType === 'week') {
      const day = new Date(selectedDate)
      const start = new Date(day)
      start.setDate(day.getDate() - day.getDay())
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    }
    // month
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return date >= start && date <= end
  }

  // Compute filtered/sorted data for each tab
  const normalizedSearch = searchTerm.trim().toLowerCase()

  const ticketsFilteredSorted = [...tickets]
    .filter(t =>
      !normalizedSearch ||
      t.name.toLowerCase().includes(normalizedSearch) ||
      (t.description || '').toLowerCase().includes(normalizedSearch)
    )
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      const field = sortBy
      if (field === 'price') return ((a.price || 0) - (b.price || 0)) * dir
      if (field === 'isActive') return ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)) * dir
      if (field === 'createdAt') {
        const da = new Date((a as any).createdAt || 0).getTime()
        const db = new Date((b as any).createdAt || 0).getTime()
        return (da - db) * dir
      }
      // default by name
      return a.name.localeCompare(b.name) * dir
    })

  const salesFilteredSorted = [...ticketSales]
    .filter(s => isInSelectedPeriod(new Date(s.createdAt || Date.now())))
    .filter(s =>
      !normalizedSearch ||
      (s.ticketName || '').toLowerCase().includes(normalizedSearch) ||
      (s.paymentMethod || '').toLowerCase().includes(normalizedSearch)
    )
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'ticketName':
          return (a.ticketName || '').localeCompare(b.ticketName || '') * dir
        case 'total':
          return ((a.total || 0) - (b.total || 0)) * dir
        case 'paymentMethod':
          return (a.paymentMethod || '').localeCompare(b.paymentMethod || '') * dir
        case 'date': {
          const da = new Date(a.createdAt || 0).getTime()
          const db = new Date(b.createdAt || 0).getTime()
          return (da - db) * dir
        }
        default: {
          const da = new Date(a.createdAt || 0).getTime()
          const db = new Date(b.createdAt || 0).getTime()
          return (da - db) * dir
        }
      }
    })


  return (
    <Box sx={{ p: 0 }}>
      <DataHeader
        showDateControls={activeTab === 1}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={activeTab === 1 ? "Search sales..." : "Search tickets..."}
        sortOptions={activeTab === 1 ? sortOptionsSales : sortOptionsTickets}
        sortValue={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onCreateNew={() => handleOpenTicketForm(null, 'create')}
        createButtonLabel="Create Ticket"
        createDisabled={!canMutate}
        createDisabledTooltip="You don't have permission to create or edit tickets."
        // Date props for Ticket Sales tab only
        currentDate={selectedDate}
        onDateChange={setSelectedDate}
        dateType={dateType}
        onDateTypeChange={setDateType}
        availableDateTypes={["day", "week", "month", "custom"]}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={(start, end) => { setCustomStartDate(start); setCustomEndDate(end); }}
        additionalButtons={[
          {
            label: "Sell Ticket",
            icon: <Payment />,
            onClick: () => setSaleDialogOpen(true),
            variant: "outlined",
            color: "primary",
            disabled: !canMutate,
            tooltip: "You don't have permission to create or edit tickets.",
          },
          {
            label: "Redeem Ticket",
            icon: <Redeem />,
            onClick: () => setRedeemDialogOpen(true),
            variant: "outlined",
            color: "secondary",
            disabled: !canMutate,
            tooltip: "You don't have permission to create or edit tickets.",
          },
        ]}
        additionalControls={
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'nowrap',
            minWidth: 0
          }}>
            <Button
              variant={activeTab === 0 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(0)}
              sx={
                activeTab === 0
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Available Tickets
            </Button>
            <Button
              variant={activeTab === 1 ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(1)}
              sx={
                activeTab === 1
                  ? { 
                      bgcolor: "white", 
                      color: themeConfig.brandColors.navy, 
                      "&:hover": { bgcolor: alpha(themeConfig.brandColors.navy, 0.04) },
                      whiteSpace: "nowrap"
                    }
                  : { 
                      color: "white", 
                      borderColor: alpha(themeConfig.brandColors.offWhite, 0.5), 
                      "&:hover": { borderColor: "white", bgcolor: alpha(themeConfig.brandColors.offWhite, 0.1) },
                      whiteSpace: "nowrap"
                    }
              }
            >
              Ticket Sales
            </Button>
          </Box>
        }
      />


      {/* Tab Content */}
      {activeTab === 0 && (
        <>
          {/* Stats Cards for Available Tickets */}
          <StatsSection
            stats={[
              {
                value: tickets.length,
                label: "Total Tickets",
                color: "primary"
              },
              {
                value: tickets.filter(ticket => ticket.isActive).length,
                label: "Active Tickets",
                color: "success"
              },
              {
                value: tickets.filter(ticket => !ticket.isActive).length,
                label: "Inactive Tickets",
                color: "secondary"
              },
              {
                value: tickets.reduce((sum, ticket) => sum + ticket.price, 0).toFixed(2),
                label: "Total Value",
                color: "info",
                prefix: "£"
              }
            ]}
          />

          {/* Available Tickets Table */}
          <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Name</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Description</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Price</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                <TableCell align="center" sx={{ textAlign: 'center !important' }}>QR Code</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticketsFilteredSorted.map((ticket) => (
                <TableRow 
                  key={ticket.id}
                  hover
                  onClick={() => handleOpenTicketForm(ticket, 'view')}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{ticket.name}</TableCell>
                  <TableCell align="center">{ticket.description}</TableCell>
                  <TableCell align="center">£{ticket.price.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={ticket.isActive ? "Active" : "Inactive"}
                      color={ticket.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      onClick={(e) => {
                        e.stopPropagation()
                        showQrCode(ticket.qrCode)
                      }}
                    >
                      <QrCode />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTicketForm(ticket, 'edit')
                        }} 
                        color="primary"
                        disabled={!canMutate}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTicket(ticket.id)
                        }} 
                        color="error"
                        disabled={!canRemove}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {ticketsFilteredSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <EmptyStateCard
                      icon={QrCode}
                      title={searchTerm ? "No tickets match your filters" : "No tickets found"}
                      description={
                        searchTerm ? "Try adjusting your filters or search query" : "Create your first ticket to get started"
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
        </>
      )}

      {/* Ticket Sales Tab */}
      {activeTab === 1 && (
        <>
          {/* Stats Cards for Ticket Sales */}
          <StatsSection
            stats={[
              {
                value: salesFilteredSorted.length,
                label: "Total Sales",
                color: "primary"
              },
              {
                value: salesFilteredSorted.filter(sale => !sale.isRedeemed).length,
                label: "Active Sales",
                color: "success"
              },
              {
                value: salesFilteredSorted.filter(sale => sale.isRedeemed).length,
                label: "Redeemed",
                color: "info"
              },
              {
                value: salesFilteredSorted.reduce((sum, sale) => sum + sale.total, 0).toFixed(2),
                label: "Total Revenue",
                color: "warning",
                prefix: "£"
              }
            ]}
          />

          {/* Ticket Sales Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Ticket</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Quantity</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Total</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Payment</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Status</TableCell>
                    <TableCell align="center" sx={{ textAlign: 'center !important' }}>Date</TableCell>
                    <TableCell align="center">QR Code</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesFilteredSorted.map((sale) => (
                    <TableRow 
                      key={sale.id}
                      hover
                      sx={{ cursor: "default" }}
                    >
                      <TableCell align="center">{sale.ticketName}</TableCell>
                      <TableCell align="center">{sale.quantity}</TableCell>
                      <TableCell align="center">£{sale.total.toFixed(2)}</TableCell>
                      <TableCell align="center">{sale.paymentMethod}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={sale.isRedeemed ? "Redeemed" : "Active"}
                          color={sale.isRedeemed ? "default" : "success"}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => showQrCode(sale.qrCode)}>
                          <QrCode />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesFilteredSorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <EmptyStateCard
                          icon={Payment}
                          title={searchTerm || dateType !== "day" ? "No ticket sales match your filters" : "No ticket sales found"}
                          description={
                            searchTerm || dateType !== "day" ? "Try adjusting your filters or search query" : "Start selling tickets to see sales data here"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Create/Edit Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onClose={() => setTicketDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTicket ? "Edit Ticket" : "Create New Ticket"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ticket Name"
                value={ticketForm.name}
                onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Price (£)"
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                value={ticketForm.price}
                onChange={(e) => setTicketForm({ ...ticketForm, price: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ticketForm.isActive}
                    onChange={(e) => setTicketForm({ ...ticketForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {editingTicket ? (
            <>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<Delete />}
                onClick={() => {
                  setTicketDialogOpen(false)
                  handleDeleteTicket(editingTicket.id)
                }}
                disabled={!canRemove}
              >
                Delete
              </Button>
              <Button
                onClick={handleUpdateTicket}
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!canMutate || !ticketForm.name || ticketForm.price <= 0}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCreateTicket}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!canMutate || !ticketForm.name || ticketForm.price <= 0}
            >
              Create Ticket
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Sell Ticket Dialog */}
      <CRUDModal
        open={saleDialogOpen}
        onClose={(reason) => {
          setSaleDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            resetSaleForm()
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "ticketManagementModal1",
          crudMode: "create",
        }}
        title="Sell Ticket"
        icon={<Payment />}
        mode="create"
        onSave={handleSellTicket}
        disabled={!canMutate || !saleForm.ticketId}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Ticket</InputLabel>
              <Select
                value={saleForm.ticketId}
                onChange={(e) => setSaleForm({ ...saleForm, ticketId: e.target.value })}
              >
                {tickets.filter(t => t.isActive).map((ticket) => (
                  <MenuItem key={ticket.id} value={ticket.id}>
                    {ticket.name} - £{ticket.price.toFixed(2)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              inputProps={{ min: "1" }}
              value={saleForm.quantity}
              onChange={(e) => setSaleForm({ ...saleForm, quantity: parseInt(e.target.value) || 1 })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={saleForm.paymentMethod}
                onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="contactless">Contactless</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {saleForm.ticketId && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    Total: £{((tickets.find(t => t.id === saleForm.ticketId)?.price || 0) * saleForm.quantity).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CRUDModal>

      {/* QR Code Display Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: "center", p: 3 }}>
          {selectedQrCode && (
            <QRCodeSVG value={selectedQrCode} size={200} />
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            {selectedQrCode}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button startIcon={<Print />}>Print</Button>
        </DialogActions>
      </Dialog>

      {/* Redeem Ticket Dialog */}
      <CRUDModal
        open={redeemDialogOpen}
        onClose={(reason) => {
          setRedeemDialogOpen(false)
          if (isCrudModalHardDismiss(reason)) {
            setRedeemQrCode("")
          }
        }}
        workspaceFormShortcut={{
          crudEntity: "ticketManagementModal2",
          crudMode: "create",
        }}
        title="Redeem Ticket"
        icon={<Redeem />}
        mode="create"
        onSave={handleRedeemTicket}
        disabled={!canMutate || !redeemQrCode}
      >
        <TextField
          fullWidth
          label="Scan or Enter QR Code"
          value={redeemQrCode}
          onChange={(e) => setRedeemQrCode(e.target.value)}
          sx={{ mt: 2 }}
          placeholder="SALE_XXXXXXXXX"
        />
      </CRUDModal>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* New Ticket Form */}
      <TicketForm
        open={ticketFormOpen}
        onClose={handleCloseTicketForm}
        ticket={selectedTicketForForm}
        mode={ticketFormMode}
        onModeChange={setTicketFormMode}
      />
    </Box>
  )
}

export default TicketManagement
